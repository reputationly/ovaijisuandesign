import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { localEquivalenceFailures, renameIdentifiers } from "../lib/rename-identifiers.mjs";
import { checkEquivalence } from "../lib/equivalence.mjs";
import { fixture, keyFor, put } from "./helpers.mjs";
import { bindingKey, collectBindings } from "../lib/bindings.mjs";
import { parse } from "../lib/parse.mjs";

const local = (root, source, names, relative = "app/renderer/src/sample.jsx") => {
  put(root, relative, source);
  const mapping = Object.fromEntries(
    Object.entries(names).map(([oldName, newName]) => [
      oldName.includes("@") ? oldName : keyFor(source, oldName),
      newName,
    ]),
  );
  return renameIdentifiers({ root, map: { [relative]: mapping }, report: "report.json" });
};

describe("局部绑定重命名", () => {
  it("保留 shorthand 属性键并处理解构、默认值和赋值", () => {
    const root = fixture();
    const source = `function render(a, data) {
  const object = { a };
  const { a: alias } = data;
  {
    const { a = 1 } = data;
    console.log(a);
  }
  ({ a } = data);
  return object.a + alias + a;
}
`;
    const result = local(root, source, {
      [keyFor(source, "a")]: "answer",
      [keyFor(source, "a", 1)]: "initialValue",
    });
    expect(result.files[0].equivalence.status).toBe("pass");
    const changed = readFileSync(`${root}/app/renderer/src/sample.jsx`, "utf8");
    expect(changed).toContain("const object = { a: answer };");
    expect(changed).toContain("const { a: initialValue = 1 } = data;");
    expect(changed).toContain("console.log(initialValue);");
    expect(changed).toContain("({ a: answer } = data);");
    expect(changed).toContain("return object.a + alias + answer;");
    expect(result.files[0].renames[0].positions.length).toBeGreaterThan(1);
  });

  it("拒绝同作用域冲突、后代遮蔽和已引用的外层名字", () => {
    const cases = [
      ["function f(){ const a=1; const b=2; return a+b; }", "a", "b"],
      ["function f(){ const a=1; function g(){ const b=2; return a+b; } }", "a", "b"],
      ["const y=1; function f(x=y){ const z=2; return z; }", "z", "y"],
    ];
    for (const [source, oldName, newName] of cases) {
      const root = fixture();
      expect(() => local(root, source, { [oldName]: newName })).toThrow();
    }
  });

  it("允许改为未在内层使用的外层绑定名", () => {
    const root = fixture();
    const source = "function outer(){ const target=1; function inner(){ const value=2; return value; } return target; }\n";
    const result = local(root, source, { value: "target" });
    expect(result.files[0].rejected).toEqual([]);
  });

  it("重命名默认参数和赋值解构时不改对象键", () => {
    const root = fixture();
    const source = `const fallback = 1;
function render(a, next = a) {
  ({ a: a } = input);
  return next;
}
`;
    const result = local(root, source, { a: "item" });
    expect(result.files[0].equivalence.status).toBe("pass");
    const changed = readFileSync(`${root}/app/renderer/src/sample.jsx`, "utf8");
    expect(changed).toContain("function render(item, next = item)");
    expect(changed).toContain("({ a: item } = input);");
  });

  it("对象属性值改为属性键时收成简写", () => {
    const root = fixture();
    const source = "const value = 1; const object = { result: value };\n";
    const result = local(root, source, { value: "result" });
    expect(result.files[0].equivalence.status).toBe("pass");
    expect(readFileSync(`${root}/app/renderer/src/sample.jsx`, "utf8")).toContain(
      "const object = { result };",
    );
  });

  it("解构别名改为属性键时收成简写", () => {
    const root = fixture();
    const source = "const { result: value } = input; console.log(value);\n";
    const result = local(root, source, { value: "result" });
    expect(result.files[0].equivalence.status).toBe("pass");
    expect(readFileSync(`${root}/app/renderer/src/sample.jsx`, "utf8")).toContain(
      "const { result } = input;",
    );
  });

  it("解构默认值别名改为属性键时保留默认值并收成简写", () => {
    const root = fixture();
    const source = "const { result: value = fallback } = input; console.log(value);\n";
    const result = local(root, source, { value: "result" });
    expect(result.files[0].equivalence.status).toBe("pass");
    expect(readFileSync(`${root}/app/renderer/src/sample.jsx`, "utf8")).toContain(
      "const { result = fallback } = input;",
    );
  });

  it.each(["window", "externalName", "class", "await", "let"])(
    "拒绝全局名、自由名或严格模式保留字 %s",
    (newName) => {
      const root = fixture();
      const source = "const value=1; externalName;\n";
      expect(() => local(root, source, { value: newName })).toThrow();
    },
  );

  it("拒绝含自由 eval 调用的文件", () => {
    const root = fixture();
    const source = "const value=1; eval('value');\n";
    expect(() => local(root, source, { value: "renamed" })).toThrow();
  });

  it("拒绝含 with 的文件", () => {
    const root = fixture();
    const source = "const value=1; with (scope) console.log(value);\n";
    put(root, "app/renderer/src/sample.jsx", source);
    expect(() => renameIdentifiers({
      root,
      map: { "app/renderer/src/sample.jsx": { "value@1:7": "renamed" } },
      report: "report.json",
    })).toThrow();
  });

  it("支持 JSX 组件名但不动小写标签、属性和类成员", () => {
    const root = fixture();
    const source = `const Ab = () => <div/>;
const view = <Ab x={1}><Ab/><Ab.Item/><ab Ab="x"/></Ab>;
let a = 1;
class C { a = 1; a() {} static a; #a; get a() {} }
obj.a;
const object = { a: 1, a() {} };
console.log(view, a);
`;
    const info = collectBindings(source, "fixture.jsx");
    const ab = info.bindings.find((item) => item.name === "Ab");
    const a = info.bindings.find((item) => item.name === "a");
    put(root, "app/renderer/src/sample.jsx", source);
    const result = renameIdentifiers({
      root,
      map: {
        "app/renderer/src/sample.jsx": {
          [bindingKey(ab)]: "Panel",
          [bindingKey(a)]: "count",
        },
      },
      report: "report.json",
    });
    expect(result.files[0].equivalence.status).toBe("pass");
    expect(result.files[0].rejected).toEqual([]);
    const changed = readFileSync(`${root}/app/renderer/src/sample.jsx`, "utf8");
    expect(changed).toContain("<Panel x={1}><Panel/><Panel.Item/>");
    expect(changed).toContain("class C { a = 1; a() {} static a; #a; get a() {} }");
    expect(changed).toContain("obj.a;");
  });

  it("拒绝直接导出声明改名并允许 default 函数名改名", () => {
    const root = fixture();
    const relative = "app/renderer/src/sample.jsx";
    const source = "export default function render(){ return render; }\n";
    put(root, relative, source);
    const result = renameIdentifiers({
      root,
      map: { [relative]: { [keyFor(source, "render")]: "draw" } },
      dryRun: true,
      report: "report.json",
    });
    expect(result.files[0].rejected).toEqual([]);
    const direct = fixture();
    const directSource = "export const value=1;\n";
    put(direct, relative, directSource);
    expect(() => renameIdentifiers({
      root: direct,
      map: { [relative]: { [keyFor(directSource, "value")]: "nextValue" } },
      dryRun: true,
      report: "report.json",
    })).toThrow(/export 模式/);

    const nested = fixture();
    const nestedSource = "export function render(props) { const value = props.input; return value; }\n";
    put(nested, relative, nestedSource);
    const nestedResult = renameIdentifiers({
      root: nested,
      map: {
        [relative]: {
          [keyFor(nestedSource, "props")]: "renderProps",
          [keyFor(nestedSource, "value")]: "renderedValue",
        },
      },
      dryRun: true,
      report: "report.json",
    });
    expect(nestedResult.files[0].rejected).toEqual([]);
  });

  it("改名导出别名时保留原有外部名称", () => {
    const root = fixture();
    const relative = "app/renderer/src/sample.jsx";
    const source = "const a = 1; export { a }; export { a as b };\n";
    const result = local(root, source, { a: "value" }, relative);
    expect(result.files[0].equivalence.status).toBe("pass");
    expect(readFileSync(`${root}/${relative}`, "utf8")).toContain(
      "const value = 1; export { value as a }; export { value as b };",
    );
  });

  it("将局部绑定、解构绑定和重复 var 声明按词法绑定处理", () => {
    const root = fixture();
    const source = `function f(input) {
  let count = 0;
  count++;
  count = 1;
  var item;
  var item;
  const { a: [first, ...rest] } = input;
  for (const [key, value] of input) console.log(key, value);
  return count + first + rest.length;
}
`;
    const result = local(root, source, { count: "total" });
    expect(result.files[0].rejected).toEqual([]);
    expect(result.files[0].equivalence.status).toBe("pass");
  });

  it("按顺序应用映射，并支持行列 key 消歧与递增/赋值绑定", () => {
    const root = fixture();
    const relative = "app/renderer/src/sample.jsx";
    const source = `function f() {
  let count = 0;
  var item;
  var item;
  count++;
  count = 1;
  { let count = item; console.log(count); }
  return count;
}
`;
    const info = collectBindings(source, "fixture.jsx");
    const bindings = info.bindings.filter((item) => item.name === "count");
    expect(bindings).toHaveLength(2);
    put(root, relative, source);
    const ambiguousRoot = fixture();
    const ambiguousRelative = "app/renderer/src/sample.jsx";
    put(ambiguousRoot, ambiguousRelative, "function f(){ let count=0; { let count=1; } }\n");
    expect(() => renameIdentifiers({
      root: ambiguousRoot,
      map: { [ambiguousRelative]: { "count@1": "total" } },
      dryRun: true,
      report: "ambiguous.json",
    })).toThrow(/候选/);
    const result = renameIdentifiers({
      root,
      map: {
        [relative]: {
          [bindingKey(bindings[0])]: "total",
          [bindingKey(bindings[1])]: "localTotal",
        },
      },
      dryRun: true,
      report: "ordered.json",
    });
    expect(result.files[0].rejected).toEqual([]);
    expect(result.files[0].renames).toHaveLength(2);
  });

  it("alpha 归一化发现漏改引用、属性误改和全局引用误改", () => {
    const before = "const value = externalName; const object = { key: value }; console.log(value);\n";
    expect(checkEquivalence(before, "const renamed = externalName; const object = { key: renamed }; console.log(value);\n").status).toBe("fail");
    expect(checkEquivalence(before, "const renamed = externalName; const object = { other: renamed }; console.log(renamed);\n").status).toBe("fail");
    expect(checkEquivalence(before, "const renamed = changedGlobal; const object = { key: renamed }; console.log(renamed);\n").status).toBe("fail");
  });

  it("alpha 归一化忽略尾随逗号的源码偏移", () => {
    const before = "const Component = (value) => render(value,); console.log(Component);\n";
    const after = "const Renderer = (value) => render(value,); console.log(Renderer);\n";
    expect(checkEquivalence(before, after).status).toBe("pass");
  });

  it("局部模式要求 externalNamesDiff 为空", () => {
    const before = 'import { value } from "./module.js"; console.log(value);\n';
    const after = 'import { renamed } from "./module.js"; console.log(renamed);\n';
    const ast = parse(before);
    const importedStart = ast.program.body[0].specifiers[0].imported.start;
    const equivalence = checkEquivalence(before, after, {
      externalRenames: new Map([[importedStart, "renamed"]]),
    });
    expect(equivalence.status).toBe("pass");
    expect(Object.keys(equivalence.externalNamesDiff)).toEqual(["imports"]);
    expect(localEquivalenceFailures(equivalence)).toContainEqual({
      key: "*",
      reason: "局部改名改变了外部可见名称",
    });
  });
});
