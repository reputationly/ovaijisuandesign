// token 级的比对与三方合并。比对用归一化后的「原子」序列，拼接用原文，
// 这样既能忽略 rollup 的改名，又能在没被改到的地方保留我们自己的命名与排版。
//
// 为什么需要「原子」这一层：bundle 会把简写展开成 `{ t: t2 }`（rollup 给 t 加了冲突后缀），
// 而我们的源码里是简写 `{ t }`。直接按 token 对齐会差两个 token，把整段判成改动。
// 所以把「简写及其展开」归成同一个原子：归一化后都是 `{ ID }`，拼接时各自用各自的原文。
import { parse } from "@babel/parser";

const IDENT = /^[A-Za-z_$][\w$]*$/;

/** 带偏移的 token 序列（丢掉注释）。 */
export function tokensOf(code) {
  const ast = parse(code, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true, tokens: true });
  return (ast.tokens ?? [])
    .filter((tk) => {
      const label = typeof tk.type === "string" ? tk.type : (tk.type?.label ?? "");
      return !label.startsWith("Comment");
    })
    .map((tk) => {
      const label = typeof tk.type === "string" ? tk.type : (tk.type?.label ?? "");
      // babel 的标点 token **没有 value**，字符在 type 里：`{` 的 value 是空串、type 是 "{"。
      // 早先只用 value，于是所有标点都变成空串原子：既让 `{ t: t2 }` 的简写归并永远匹配不上，
      // 又让这些空原子被 LCS 随便对齐，凭空造出大量「旧版有、我们没有」的假改动区。
      // 冲突数因此虚高，而且没人看得出原因。
      return { value: tk.value || label, type: label, start: tk.start, end: tk.end };
    });
}

/**
 * 比对用的 token 值。
 *
 * 标识符抹成同一个占位符、数字抹平；字符串/模板内容**折叠空白后再比**。
 * 折叠这一步是必须的：babel 会把模板字符串按段发 token，段里带着源码的换行和缩进，
 * 而两个版本里同一段模板的缩进往往不同 —— 直接比原文会把「只是缩进变了」判成改动区，
 * 冲突数量因此虚高。
 */
export function normValue(value, type = "") {
  if (IDENT.test(value)) return "ID";
  if (/^\d/.test(value)) return "NUM";
  if (type === "template" || type === "string") return `STR:${value.replace(/\s+/g, " ").trim()}`;
  return value;
}

/**
 * 把 token 流归成原子序列。原子 = { norm, start, end }。
 * 只做一件事：把 `{ X }` 和 `{ X : X2 }`（X2 去掉尾数字后等于 X）认成同一个原子。
 */
export function atomsOf(code) {
  // 丢掉空值 token。babel 会给模板字符串的每段、JSX 文本各发一个 token，
  // 空段的值是空字符串；它们归一化之后也是空串，能被 LCS 随便对齐，
  // 于是凭空造出一堆「旧版没有、我们多出来」的假改动区 —— 冲突是被这么虚增出来的。
  // 有些 token 没有 value（EOF 一类），一律按空处理
  const toks = tokensOf(code).filter((tk) => tk.type !== "eof");
  const atoms = [];
  for (let i = 0; i < toks.length; i += 1) {
    const t = toks[i];
    const a = toks[i + 1];
    const c = toks[i + 2];
    const d = toks[i + 3];
    const e = toks[i + 4];
    // 两种写法都收成同一个原子：`{ t }`（简写）和 `{ t: t2 }` / `{ t: translate }`（展开）。
    // 早先只收「去掉尾数字后同名」的展开，结果简写和展开的原子数对不上，
    // 后面按原子下标切片就会切在解构声明中间，合并出语法错误的文件。
    // 外层不能要求 `toks[i+4] === "}"`：那样只有 5 个 token 的展开形式能进来，
    // 3 个 token 的简写 `{ t }` 会被漏掉 —— 两种形式必须归成同一个原子，
    // 否则它们在两边对不上，又会变成假改动区。
    if (t.value === "{" && a && IDENT.test(a.value)) {
      if (c && c.value === "}") {
        atoms.push({ norm: "{ ID }", start: t.start, end: c.end });
        i += 2;
        continue;
      }
      if (c && c.value === ":" && d && IDENT.test(d.value) && e && e.value === "}") {
        atoms.push({ norm: "{ ID }", start: t.start, end: e.end });
        i += 4;
        continue;
      }
    }
    atoms.push({ norm: normValue(t.value, t.type), start: t.start, end: t.end });
  }
  return atoms;
}

/** 最长公共子序列：返回 [aIndex, bIndex] 配对。 */
export function lcsPairs(a, b) {
  const n = a.length;
  const m = b.length;
  let head = 0;
  while (head < n && head < m && a[head] === b[head]) head += 1;
  let tail = 0;
  while (tail < n - head && tail < m - head && a[n - 1 - tail] === b[m - 1 - tail]) tail += 1;
  const pairs = [];
  for (let i = 0; i < head; i += 1) pairs.push([i, i]);
  const ca = a.slice(head, n - tail);
  const cb = b.slice(head, m - tail);
  if (ca.length && cb.length && ca.length * cb.length <= 25_000_000) {
    const dp = Array.from({ length: ca.length + 1 }, () => new Uint32Array(cb.length + 1));
    for (let i = ca.length - 1; i >= 0; i -= 1)
      for (let j = cb.length - 1; j >= 0; j -= 1)
        dp[i][j] = ca[i] === cb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    let i = 0;
    let j = 0;
    while (i < ca.length && j < cb.length) {
      if (ca[i] === cb[j]) {
        pairs.push([head + i, head + j]);
        i += 1;
        j += 1;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) i += 1;
      else j += 1;
    }
  }
  for (let k = 0; k < tail; k += 1) pairs.push([n - tail + k, m - tail + k]);
  return pairs;
}

/** 从「旧 → 某一边」的对齐里取出改动区。纯插入的区 oldFrom === oldTo。 */
export function changeRegions(nO, mapOther, otherLength) {
  const regions = [];
  let prevOld = -1;
  let prevOther = -1;
  const flush = (oldTo, otherTo) => {
    if (oldTo > prevOld + 1 || otherTo > prevOther + 1) {
      regions.push({ oldFrom: prevOld + 1, oldTo, otherFrom: prevOther + 1, otherTo });
    }
  };
  for (let i = 0; i < nO.length; i += 1) {
    if (!mapOther.has(i)) continue;
    flush(i, mapOther.get(i));
    prevOld = i;
    prevOther = mapOther.get(i);
  }
  // 收尾必须拿「另一边的真实长度」，不能拿 map 里最大的下标推 ——
  // 末尾有纯插入时会少算，后面按区间取原子就取到 undefined。
  flush(nO.length, otherLength);
  return regions;
}

/**
 * 两个改动区是否冲突。
 *
 * 纯插入落在别人改动区的**边界上**也算冲突 —— 这一条是踩出来的：
 * 解构参数表 `{ a, b, c, d }` 里，我们删了一个名字、上游在同一个位置加了几个名字，
 * 边界插入看着「互不重叠」，拼出来却是 `const { a, b, c d, e }` 这种语法错误。
 * 列表内部的边界插入本身就带有歧义（插在谁前面），交给人工更稳。
 */
export function regionsConflict(a, b) {
  if (a.oldFrom === a.oldTo && b.oldFrom === b.oldTo) return a.oldFrom === b.oldFrom;
  if (a.oldFrom === a.oldTo) return a.oldFrom >= b.oldFrom && a.oldFrom <= b.oldTo;
  if (b.oldFrom === b.oldTo) return b.oldFrom >= a.oldFrom && b.oldFrom <= a.oldTo;
  return a.oldFrom < b.oldTo && b.oldFrom < a.oldTo;
}

/** 把一个 [from, to) 的片段替换进 segments。 */
function splice(segments, from, to, replacement) {
  const out = [];
  for (const s of segments) {
    if (s.end <= from || s.start >= to) {
      out.push(s);
      continue;
    }
    if (s.start < from) out.push({ ...s, end: from });
    if (s.end > to) out.push({ ...s, start: to });
  }
  const at = out.findIndex((s) => s.start >= to);
  const insertAt = at === -1 ? out.length : at;
  out.splice(insertAt, 0, replacement);
  return out;
}

/**
 * 三方合并：以「我们的语句」为底，把**上游的改动区**贴进去。
 *
 * 为什么不用「同步点之间整段比对」的写法：两处改动常常是**相邻但不相交**的
 * （我们的改了第 25 个原子，上游在第 26 个原子加了点东西）。按整段比会把它们
 * 看成一段、判成冲突；按改动区逐个贴就不会。实测这一步把假冲突从 256 条降到很少。
 *
 * 返回 { segments, conflict }。conflict 非空表示有改动区真重叠，交人工。
 */
export function mergeStreams(oldCode, oursCode, newCode) {
  const O = atomsOf(oldCode);
  const A = atomsOf(oursCode);
  const B = atomsOf(newCode);
  const nO = O.map((x) => x.norm);
  const nA = A.map((x) => x.norm);
  const nB = B.map((x) => x.norm);

  const mapA = new Map(lcsPairs(nO, nA));
  const mapB = new Map(lcsPairs(nO, nB));
  const ourRegions = changeRegions(nO, mapA, nA.length);
  const theirRegions = changeRegions(nO, mapB, nB.length);

  for (const x of ourRegions) {
    for (const y of theirRegions) {
      if (!regionsConflict(x, y)) continue;
      const show = (arr, r) => arr.slice(r.from ?? r.oldFrom, (r.to ?? r.oldTo) ?? r.oldTo).join(" ");
      void show;
      return {
        segments: null,
        conflict: {
          old: nO.slice(x.oldFrom, x.oldTo).join(" ") || "(插入点)",
          ours: nA.slice(x.otherFrom, x.otherTo).join(" "),
          theirs: nB.slice(y.otherFrom, y.otherTo).join(" "),
        },
      };
    }
  }

  // 以我们的原文为底，逐个贴上游的改动区
  let segments = [{ from: "ours", start: 0, end: oursCode.length }];
  for (const y of theirRegions) {
    let aFrom;
    let aTo;
    if (y.oldFrom === y.oldTo) {
      // 纯插入：挂到旧坐标 oldFrom 对应的我们的原子之前
      const anchor = y.oldFrom < nO.length ? mapA.get(y.oldFrom) : A.length;
      const at = anchor === undefined ? (y.oldFrom > 0 ? (mapA.get(y.oldFrom - 1) ?? -1) + 1 : 0) : anchor;
      aFrom = at < A.length ? A[at].start : oursCode.length;
      aTo = aFrom;
    } else {
      const first = mapA.get(y.oldFrom);
      const last = mapA.get(y.oldTo - 1);
      if (first === undefined || last === undefined) {
        return { segments: null, conflict: { old: "(上游改动的区域我们这边对不上)", ours: "", theirs: nB.slice(y.otherFrom, y.otherTo).join(" ") } };
      }
      aFrom = A[first].start;
      aTo = A[last].end;
    }
    if (y.otherFrom >= B.length) continue; // 上游在末尾没有任何插入，跳过
    const replacement = { from: "new", start: B[y.otherFrom].start, end: B[y.otherTo - 1].end };
    segments = splice(segments, aFrom, aTo, replacement);
  }
  return { segments, conflict: null };
}

/** 把 segments 拼回文本。 */
export function assemble(segments, oursCode, newCode) {
  return segments.map((s) => (s.from === "ours" ? oursCode : newCode).slice(s.start, s.end)).join("");
}
