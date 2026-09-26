// 阶段 1：把主 bundle 的顶层语句分成两份——vendor（第三方库，原样）和 main（参照自己的代码）。
//
// 归类（.probe/decompile/classified.json，01/02/02b/02c 脚本产出，和 bundle 的顶层语句一一对应）只是起点，
// 这里按两条硬约束收敛到自洽，否则拆成两个模块后跑不起来：
//   1. vendor 不能引用 main 的顶层名字——main import vendor，vendor 先整体执行完，也不能反向 import；
//   2. main 不能给 vendor 的顶层变量赋值——import 进来的绑定是只读的。
// 另外还要顾执行顺序：vendor 整体先于 main 执行，所以模块初始化时给库对象挂属性的语句（X.none = …）必须和 X
// 在同一边。
// 冲突时的取舍：有锚点（逐字比对确认过）的语句说了算，没锚点的一律往 main 放——main 就是它原来所在的
// 模块，放回去总是对的，代价只是 vendor 小一点、之后换 npm 包时再细分。
import _traverse from "@babel/traverse";
import * as t from "@babel/types";

const traverse = _traverse.default;

export function splitProgram(ast, cls, { debug = false } = {}) {
  const body = ast.program.body;
  if (body.length !== cls.length) throw new Error(`语句数对不上：bundle ${body.length}，归类 ${cls.length}`);

  const index = new Map(body.map((n, i) => [n, i]));
  const topOf = (p) => {
    let cur = p;
    while (cur.parentPath && !cur.parentPath.isProgram()) cur = cur.parentPath;
    return index.get(cur.node);
  };
  const refs = body.map(() => new Set()); // i 引用了哪些顶层语句
  const assigns = body.map(() => new Set()); // i 给哪些顶层语句的变量赋了值
  const mutates = body.map(() => new Set()); // i 在模块初始化时给哪些顶层对象挂了属性
  const declOf = new Map(); // 顶层名字 → 定义它的语句
  const topBinding = (p, name) => {
    const b = p.scope.getBinding(name);
    return b && b.scope.path.isProgram() ? b : null;
  };
  traverse.cache.clear();
  traverse(ast, {
    Program(p) {
      for (const [name, b] of Object.entries(p.scope.bindings)) declOf.set(name, topOf(b.path));
    },
    ReferencedIdentifier(p) {
      const b = topBinding(p, p.node.name);
      if (!b) return;
      const d = declOf.get(p.node.name);
      const u = topOf(p);
      if (d !== u) refs[u].add(d);
    },
    "AssignmentExpression|UpdateExpression"(p) {
      const target = p.isAssignmentExpression() ? p.node.left : p.node.argument;
      // 模块初始化时就执行的 X.y = …（不在函数里）：给 X 挂东西，后面用 X 的语句可能依赖它
      if (t.isMemberExpression(target) && !p.getFunctionParent()) {
        let root = target;
        while (t.isMemberExpression(root)) root = root.object;
        if (t.isIdentifier(root) && topBinding(p, root.name)) {
          const d = declOf.get(root.name);
          const u = topOf(p);
          if (d !== u) mutates[u].add(d);
        }
      }
      const names = t.isIdentifier(target) ? [target.name] : t.isPattern(target) ? Object.keys(t.getBindingIdentifiers(target)) : [];
      const u = topOf(p);
      for (const name of names) {
        if (!topBinding(p, name)) continue;
        const d = declOf.get(name);
        if (d !== u) assigns[u].add(d);
      }
    },
  });

  const kind = cls.map((s) => (s.kind === "lib" ? "lib" : "app"));
  // 钉住的语句：有锚点（逐字比对确认过）的，或者被钉住的语句逼出来的。没钉住的都可以挪。
  const pin = cls.map((s) => (s.anchor === "app" || s.anchor === "lib" ? s.anchor : null));
  // 导出语句留在 main：懒加载 chunk 从 main 取东西，导出表原样保留
  body.forEach((n, i) => {
    if (t.isExportDeclaration(n)) kind[i] = pin[i] = "app";
  });
  const set = (i, k, pinIt, because) => {
    if (kind[i] === k && (!pinIt || pin[i] === k)) return false;
    if (pin[i] === "lib" && k === "app" && pinIt) conflicts.push([i, because]);
    kind[i] = k;
    if (pinIt) pin[i] = k;
    why.set(i, because);
    return true;
  };
  const conflicts = [];
  const why = new Map(); // 调试用：语句 → 让它挪位置的那条语句

  // 状态只会朝一个方向走（没钉 → 钉 vendor → 钉 main），所以一定收敛。
  let rounds = 0;
  for (let changed = true; changed && rounds < 1000; rounds++) {
    changed = false;
    for (let i = 0; i < body.length; i++) {
      // 规则 1：vendor 语句引用了 main 语句
      if (kind[i] !== "lib") continue;
      for (const d of refs[i]) {
        if (kind[d] !== "app") continue;
        if (pin[d] === "app") changed = set(i, "app", true, d) || changed; // 依赖一定在 main 的东西，自己也一定在 main
        else if (pin[i] === "lib") changed = set(d, "lib", true, i) || changed; // 确定是库的依赖它，它也是库
        else changed = set(i, "app", false, d) || changed; // 两边都没把握：留在 main 总是安全的
        if (kind[i] !== "lib") break;
      }
    }
    for (let i = 0; i < body.length; i++) {
      // 规则 2：main 语句给 vendor 的变量赋值；规则 3：main 语句在模块初始化时给 vendor 对象挂属性
      // （X.none = …）——它得和 X 待在同一边，否则 vendor 里后面用到这个属性时它还没执行
      if (kind[i] !== "app") continue;
      for (const d of [...assigns[i], ...mutates[i]]) {
        if (kind[d] !== "lib") continue;
        if (pin[i] === "app") changed = set(d, "app", true, i) || changed;
        else if (pin[d] === "lib") changed = set(i, "lib", true, d) || changed;
        else changed = set(d, "app", false, i) || changed;
        if (kind[i] !== "app") break;
      }
    }
  }
  // 钉在 main 的语句仍在给 vendor 对象挂属性：初始化顺序可能不对，报出来人工看
  const orderRisks = [];
  body.forEach((_, i) => {
    if (kind[i] === "app") for (const d of mutates[i]) if (kind[d] === "lib") orderRisks.push([i, d]);
  });

  // vendor 要导出的：main 用到的 vendor 名字
  const exportNames = new Set();
  const libNamesOf = new Map();
  for (const [name, d] of declOf) if (kind[d] === "lib") libNamesOf.set(d, [...(libNamesOf.get(d) ?? []), name]);
  const usedByApp = new Set();
  body.forEach((_, u) => {
    if (kind[u] === "app") for (const d of refs[u]) if (kind[d] === "lib") usedByApp.add(d);
  });
  // refs 只到语句粒度：一条语句定义了好几个名字时全部导出，宁多勿少
  for (const d of usedByApp) for (const n of libNamesOf.get(d)) exportNames.add(n);

  const lib = kind.filter((k) => k === "lib").length;
  const vendor = t.file(t.program(body.filter((_, i) => kind[i] === "lib"), [], "module"));
  ast.program.body = body.filter((_, i) => kind[i] === "app");
  return {
    vendor,
    main: ast,
    exportNames: [...exportNames].sort(),
    stats: { rounds, lib, app: body.length - lib, exports: exportNames.size, conflicts: conflicts.length, orderRisks: orderRisks.length },
    debug: debug ? { refs, assigns, mutates, kind, pin, why, conflicts, orderRisks } : undefined,
  };
}
