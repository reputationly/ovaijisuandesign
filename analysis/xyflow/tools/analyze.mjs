// 用法：node analyze.mjs <vendor.js> <npm根目录> <输出目录>
import fs from 'node:fs';
import path from 'node:path';
import { loadModule, clean, strip, firstDiff, eq, renumber } from './lib.mjs';
import { simplify, RULE_NAMES } from './rules.mjs';
import _gen from '@babel/generator';
const generate = _gen.default || _gen;

const [vendorFile, npmRoot, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const P = (rel) => path.join(npmRoot, rel);
// 浏览器 + ESM（vite：conditions import/module/browser/default）实际选中的入口
const MODS = [
  { label: 'system', pkg: '@xyflow/system@0.0.76', file: (process.env.SYS || 'xyflow-system-0.0.76') + '/package/dist/esm/index.js', spec: '@xyflow/system' },
  { label: 'react', pkg: '@xyflow/react@12.10.2', file: (process.env.RF || 'xyflow-react-12.10.2') + '/package/dist/esm/index.js', spec: '@xyflow/react' },
  { label: 'z-vanilla', pkg: 'zustand@4.5.7', file: 'zustand-4.5.7/package/esm/vanilla.mjs', spec: 'zustand/vanilla' },
  { label: 'z-traditional', pkg: 'zustand@4.5.7', file: 'zustand-4.5.7/package/esm/traditional.mjs', spec: 'zustand/traditional' },
  { label: 'z-shallow', pkg: 'zustand@4.5.7', file: 'zustand-4.5.7/package/esm/shallow.mjs', spec: 'zustand/shallow' },
  { label: 'classcat', pkg: 'classcat@5.0.5', file: 'classcat-5.0.5/package/index.js', spec: 'classcat' },
];
const mods = MODS.map((m) => ({ ...m, mod: loadModule(P(m.file), m.label) }));
const bySpec = new Map(mods.map((m) => [m.spec, m]));
const V = loadModule(vendorFile, 'vendor');

// npm 侧规范键
function npmKey(label, r) {
  if (r.k === 'top') return `${label}#${r.name}`;
  if (r.k === 'imp') {
    const m = bySpec.get(r.src);
    if (m) { const local = m.mod.exportsMap.get(r.imported); return `${m.label}#${local ?? '??' + r.imported}`; }
    return `ext:${r.src}:${r.imported}`;
  }
  if (r.k === 'free') return `free:${r.name}`;
}
// TS 枚举：npm 为 `var X; (function (X) {...})(X || (X = {}));` 两条语句，合成一条便于和打包后的 `const X = (X => {...; return X})(X || {})` 比较
for (const m of mods) {
  const us = m.mod.units;
  for (let i = 0; i + 1 < us.length; i++) {
    const a = us[i], b = us[i + 1], d = a.node.declarations?.[0];
    const call = b.node.type === 'ExpressionStatement' && b.node.expression.type === 'CallExpression' ? b.node.expression : null;
    const fn = call?.callee;
    if (!d || d.init || a.names.length !== 1 || !fn || fn.type !== 'FunctionExpression' || fn.params[0]?.name !== a.names[0] || call.arguments[0]?.type !== 'LogicalExpression') continue;
    const ret = { type: 'ReturnStatement', argument: { ...fn.params[0] } };
    a.node = { type: 'VariableDeclaration', kind: a.node.kind, declarations: [{ type: 'VariableDeclarator', id: d.id, init: { type: 'CallExpression', callee: { type: 'ArrowFunctionExpression', id: null, generator: false, async: false, params: fn.params, body: { type: 'BlockStatement', directives: [], body: [...fn.body.body, ret] } }, arguments: [{ type: 'LogicalExpression', operator: '||', left: call.arguments[0].left, right: { type: 'ObjectExpression', properties: [] } }] } }] };
    a.enumSynth = true; b.enumPart = a; a.end = b.end;
  }
}
const npmUnits = [];
for (const m of mods) for (const u of m.mod.units) { u.pkg = m.pkg; u.file = m.file; u.key = u.names.length ? `${m.label}#${u.names[0]}` : `${m.label}@${u.line}`; npmUnits.push(u); }
const npmByKey = new Map(); for (const u of npmUnits) for (const n of u.names) npmByKey.set(`${u.label}#${n}`, u);
const keyLocal = (k) => k.includes('#') ? k.split('#')[1] : k;

// vendor 侧：打包器互操作产物
const INTEROP = {
  React: 'ext:react:default',
  useSyncExternalStoreExports: 'ext:use-sync-external-store/shim/with-selector:default',
  __vite_import_meta_env__: 'VITE_ENV',
};
const HELP = process.env.HELPERS ? JSON.parse(fs.readFileSync(process.env.HELPERS, 'utf8')).helpers.filter((h) => h.origin === 'from-vendor' && !h.reused) : [];
const helpNpm = new Map(HELP.map((h) => [`${h.label}#${h.name}`, 'helper:' + h.src]));
const helpOf = (k) => helpNpm.get(k) ?? k;
const map = new Map(); // vendor 名 -> npm 键
const rmap = new Map(); // npm 键 -> vendor unit
function vKey(r) {
  if (r.k === 'top') { if (map.has(r.name)) return map.get(r.name); if (INTEROP[r.name]) return INTEROP[r.name]; return '?' + strip(r.name); }
  if (r.k === 'imp') { if (HELP.length && r.src.includes('infra/from-vendor')) return 'helper:' + r.imported; const m = bySpec.get(r.src); if (m) { const local = m.mod.exportsMap.get(r.imported); return `${m.label}#${local ?? '??' + r.imported}`; } return `ext:${r.src}:${r.imported}`; }
  if (r.k === 'free') return `free:${r.name}`;
}
// 未定映射时按"去掉 $N 后同名"暂定相等
function looseEq(a, b) {
  const d = firstDiff(a, b);
  if (!d) return true;
  return false;
}
function cleanPair(vu, nu, tentative) {
  const vt = clean(vu.node, (r) => { const k = vKey(r); if (tentative && k.startsWith('?')) return 'T:' + k.slice(1); return k; });
  const nt = clean(nu.node, (r) => { const k = helpOf(npmKey(nu.label, r)); if (tentative && !k.startsWith('ext:') && !k.startsWith('free:') && k.includes('#') && !rmap.has(k)) return 'T:' + strip(keyLocal(k)); return k; });
  return [vt, nt];
}
const ALL = new Set(RULE_NAMES);
function compare(vu, nu, tentative = false) {
  const r0 = compare0(vu, nu, tentative);
  if (nu.enumSynth && r0.status !== 'diff') return { status: 'equiv', rules: ['ENUM', ...r0.rules] };
  return r0;
}
function compare0(vu, nu, tentative) {
  const [vt, nt] = cleanPair(vu, nu, tentative);
  if (eq(vt, nt)) return { status: 'same', rules: [] };
  const a = simplify(vt, ALL), b = simplify(nt, ALL);
  if (eq(a.tree, b.tree)) {
    // 求最小必要规则集
    const need = [];
    for (const r of new Set([...a.hits, ...b.hits])) {
      const en = new Set([...a.hits, ...b.hits]); en.delete(r);
      if (!eq(simplify(vt, en).tree, simplify(nt, en).tree)) need.push(r);
    }
    return { status: 'equiv', rules: need.length ? need : [...new Set([...a.hits, ...b.hits])] };
  }
  return { status: 'diff', diff: firstDiff(a.tree, b.tree), rules: [...new Set([...a.hits, ...b.hits])] };
}

// 1. 按语句顺序做加权对齐（rollup 保持每个模块内语句顺序）：同名（去 $N）才能配对，结构等价加分
const [RLO, RHI] = (process.env.REGION || '0-99999999').split('-').map(Number);
const inR = (u) => u.line >= RLO && u.line <= RHI;
const ambiguous = [];
const missing = [];
const vSeq = V.units.filter((u) => inR(u) && u.names.length && !INTEROP[u.names[0]]);
for (const m of mods) {
  const nSeq = m.mod.units.filter((u) => u.names.length);
  const free = vSeq.filter((u) => !u.npm);
  const N = nSeq.length, M = free.length;
  const score = (i, j) => {
    const nu = nSeq[i], vu = free[j];
    if (strip(nu.names[0]) !== strip(vu.names[0])) return 0;
    if (nu.node.type !== vu.node.type) return 0;
    return compare(vu, nu, true).status !== 'diff' ? 3 : 2;
  };
  // 稀疏 DP：只在同名对上取分
  const byName = new Map();
  free.forEach((u, j) => { const k = strip(u.names[0]); if (!byName.has(k)) byName.set(k, []); byName.get(k).push(j); });
  const pairs = [];
  nSeq.forEach((nu, i) => { for (const j of byName.get(strip(nu.names[0])) || []) { const sc = score(i, j); if (sc) pairs.push([i, j, sc]); } });
  if (process.env.DBGCHAIN === m.label) console.log('pairs for selector$m', pairs.filter((x) => nSeq[x[0]].names[0] === 'selector$m').map((x) => free[x[1]].names[0] + '@' + free[x[1]].line + ':' + x[2]).join(' '), 'nseq has', nSeq.filter((u) => u.names[0] === 'selector$m').length);
  // 最长加权递增链（i、j 都严格递增）
  pairs.sort((x, y) => x[0] - y[0] || y[1] - x[1]);
  const best = new Array(pairs.length).fill(0), prev = new Array(pairs.length).fill(-1);
  for (let p = 0; p < pairs.length; p++) {
    best[p] = pairs[p][2];
    for (let q = 0; q < p; q++) if (pairs[q][0] < pairs[p][0] && pairs[q][1] < pairs[p][1] && best[q] + pairs[p][2] > best[p]) { best[p] = best[q] + pairs[p][2]; prev[p] = q; }
  }
  let end = -1; for (let p = 0; p < pairs.length; p++) if (end < 0 || best[p] > best[end]) end = p;
  const chain = []; for (let p = end; p >= 0; p = prev[p]) chain.push(pairs[p]);
  if (process.env.DBGCHAIN === m.label) for (const [i, j, sc] of chain.slice().reverse()) console.log('chain', nSeq[i].names[0] + '@' + nSeq[i].line, free[j].names[0] + '@' + free[j].line, sc);
  for (const [i, j] of chain) {
    const nu = nSeq[i], vu = free[j];
    const nC = (byName.get(strip(nu.names[0])) || []).length;
    if (nC > 1) ambiguous.push({ npm: nu.key, vendor: `${vu.names[0]}@${vu.line}`, candidates: nC });
    vu.npm = nu; rmap.set(nu.key, vu);
    vu.names.forEach((vn, k) => { if (nu.names[k]) map.set(vn, `${nu.label}#${nu.names[k]}`); });
  }
}
const vMatched0 = [...rmap.values()];
// 无名语句（如 X.displayName = ...）：在已匹配区间内按结构配对
const vMatched = new Set(rmap.values());
const lines = [...vMatched].map((u) => u.line).sort((a, b) => a - b);
const lo = lines[0], hi = lines[lines.length - 1];
const anonV = V.units.filter((u) => !u.names.length && u.line >= lo && u.line <= hi);
for (const nu of npmUnits.filter((u) => !u.names.length)) {
  for (const vu of anonV) { if (vu.npm) continue; const r = compare(vu, nu); if (r.status !== 'diff') { vu.npm = nu; rmap.set(nu.key, vu); break; } }
}
// 顺序对齐没覆盖到的（模块内被重排的）：先同名同类型，再按引用重合度
const fallback = [];
for (const vu of V.units.filter((u) => inR(u) && !u.npm && u.names.length && !INTEROP[u.names[0]])) {
  const free = npmUnits.filter((nu) => !rmap.has(nu.key) && nu.names.length && nu.node.type === vu.node.type);
  const same = free.filter((nu) => strip(nu.names[0]) === strip(vu.names[0]));
  let best = null, how = '';
  const eqs = same.filter((nu) => compare(vu, nu, true).status !== 'diff');
  if (eqs.length >= 1) { best = eqs[0]; how = 'same-name+equiv'; }
  else if (same.length === 1) { best = same[0]; how = 'same-name'; }
  else {
    let bs = 0.6;
    for (const nu of (same.length ? same : free)) {
      const A = new Set(vu.refs.imps.concat(vu.refs.tops.map(strip))), Bs = new Set(nu.refs.imps.concat(nu.refs.tops.map(strip)));
      const inter = [...A].filter((x) => Bs.has(x)).length; const sc = inter / Math.max(1, Math.max(A.size, Bs.size));
      if (sc > bs) { bs = sc; best = nu; how = 'ref-overlap ' + sc.toFixed(2); }
    }
  }
  if (best) { vu.npm = best; rmap.set(best.key, vu); vu.names.forEach((vn, i) => best.names[i] && map.set(vn, `${best.label}#${best.names[i]}`)); fallback.push({ vendor: vu.names[0], line: vu.line, npm: best.key, how }); }
}
for (const nu of npmUnits) if (nu.enumPart && rmap.has(nu.enumPart.key)) rmap.set(nu.key, rmap.get(nu.enumPart.key));
for (const nu of npmUnits) if (!rmap.has(nu.key)) missing.push(nu);

// 2. 闭包：从已匹配 vendor 声明出发，沿顶层引用走
const vByName = V.byName;
const matchedV = V.units.filter((u) => u.npm);
const closure = new Set(matchedV);
const outside = new Map();
const queue = [...matchedV];
while (queue.length) {
  const u = queue.shift();
  for (const t of u.refs.tops) {
    const d = vByName.get(t);
    if (!d || closure.has(d)) continue;
    if (!d.npm) { if (!outside.has(t)) outside.set(t, { unit: d, from: [] }); outside.get(t).from.push(u.names[0] || `@${u.line}`); continue; }
  }
}
// 区间内未匹配的 vendor 语句
const inRegionUnmatched = V.units.filter((u) => !u.npm && u.line >= lo && u.line <= hi);
// 反向：引用了已匹配声明但自身未匹配的 vendor 语句（使用方）
const users = new Map();
for (const u of V.units) if (!u.npm) for (const t of u.refs.tops) { const d = vByName.get(t); if (d?.npm) { if (!users.has(t)) users.set(t, 0); users.set(t, users.get(t) + 1); } }

// 3. 逐个比较
const results = [];
for (const vu of matchedV) {
  const nu = vu.npm;
  const r = compare(vu, nu);
  results.push({ vendor: vu.names[0] || `@${vu.line}`, vendorLine: vu.line, npmKey: nu.key, pkg: nu.pkg, file: nu.file, npmLine: nu.line, npmEndLine: (() => { const c = mods.find((m) => m.label === nu.label).mod.code; return c.slice(0, nu.end).split('\n').length; })(), vendorEndLine: V.code.slice(0, vu.end).split('\n').length, ...r });
}
function toBabel(t) {
  if (Array.isArray(t)) return t.map(toBabel);
  if (!t || typeof t !== 'object') return t;
  if (t.type === 'Id') return { type: 'Identifier', name: t.name };
  if (t.type === 'Ref') return { type: 'Identifier', name: '«' + t.key + '»' };
  if (t.type === 'Truthy') return { type: 'Identifier', name: '«truthy»' };
  const o = {}; for (const k in t) o[k] = toBabel(t[k]); return o;
}
const fmtN = (t) => { try { return generate(toBabel(t), { comments: false }).code; } catch (e) { return 'GEN-ERR ' + e.message; } };
const fmt = (n) => generate(n, { comments: false, retainLines: false, jsescOption: { minimal: true } }).code;
fs.mkdirSync(path.join(outDir, 'diffs'), { recursive: true });
for (const r of results) {
  if (r.status === 'same') continue;
  const vu = V.units.find((u) => (u.names[0] || `@${u.line}`) === r.vendor && u.line === r.vendorLine);
  const safe = r.npmKey.replace(/[^\w.@#-]/g, '_');
  fs.writeFileSync(path.join(outDir, 'diffs', safe + '.npm.js'), fmt(vu.npm.node) + '\n');
  fs.writeFileSync(path.join(outDir, 'diffs', safe + '.vendor.js'), fmt(vu.node) + '\n');
  const [vt, nt] = cleanPair(vu, vu.npm, false);
  fs.writeFileSync(path.join(outDir, 'diffs', safe + '.npm.norm.js'), fmtN(simplify(nt, ALL).tree) + '\n');
  fs.writeFileSync(path.join(outDir, 'diffs', safe + '.vendor.norm.js'), fmtN(simplify(vt, ALL).tree) + '\n');
  r.diffFile = safe;
  r.firstDiffPath = r.diff?.path; delete r.diff;
}
const helperCheck = [];
if (HELP.length) {
  const FV = loadModule(process.env.FV, 'fv');
  const fvKey = (r) => r.k === 'top' ? 'helper:' + r.name : r.k === 'imp' ? (bySpec.get(r.src) ? `${bySpec.get(r.src).label}#${bySpec.get(r.src).mod.exportsMap.get(r.imported)}` : `ext:${r.src}:${r.imported}`) : `free:${r.name}`;
  for (const h of HELP) {
    const fu = FV.byName.get(h.src); const nu = npmByKey.get(`${h.label}#${h.name}`);
    if (!fu || !nu) { helperCheck.push({ ...h, status: 'missing' }); continue; }
    const a = clean(fu.node, fvKey), b = clean(nu.node, (r) => helpOf(npmKey(nu.label, r)));
    const ok = eq(simplify(a, ALL).tree, simplify(b, ALL).tree);
    helperCheck.push({ label: h.label, helper: h.src, npm: h.name, npmLine: nu.line, status: eq(a, b) ? 'same' : ok ? 'equiv' : 'diff', fd: ok ? undefined : firstDiff(simplify(a, ALL).tree, simplify(b, ALL).tree) });
  }
}
const summary = { helperCheck,
  npmUnits: npmUnits.length, matched: matchedV.length, missingInVendor: missing.map((u) => ({ key: u.key, line: u.line })),
  ambiguous, fallback, region: [lo, hi],
  closureOutside: [...outside].map(([n, o]) => ({ name: n, line: o.unit.line, interop: !!INTEROP[n], from: [...new Set(o.from)].slice(0, 8) })),
  inRegionUnmatched: inRegionUnmatched.map((u) => ({ names: u.names, line: u.line, kind: u.kind, refsMatched: u.refs.tops.filter((t) => vByName.get(t)?.npm).length })),
  counts: { same: results.filter((r) => r.status === 'same').length, equiv: results.filter((r) => r.status === 'equiv').length, diff: results.filter((r) => r.status === 'diff').length },
};
fs.writeFileSync(path.join(outDir, 'mapping.json'), JSON.stringify(results.map(({ vendor, vendorLine, vendorEndLine, npmKey, pkg, file, npmLine, npmEndLine, status, rules, diffFile, firstDiffPath }) => ({ vendor, vendorLine, vendorEndLine, npmKey, pkg, file, npmLine, npmEndLine, status, rules, diffFile, firstDiffPath })), null, 1));
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary.counts), 'npm', summary.npmUnits, 'matched', summary.matched, 'missing', summary.missingInVendor.length, 'ambig', ambiguous.length, 'outside', summary.closureOutside.length, 'regionUnmatched', summary.inRegionUnmatched.length, 'region', lo, hi);
if (process.env.DBG) {
  for (const k of process.env.DBG.split(',')) {
    const nu = npmByKey.get(k) || npmUnits.find((u) => u.key === k); const vu = rmap.get(nu.key);
    const [vt, nt] = cleanPair(vu, nu, false);
    const a = simplify(vt, ALL), b = simplify(nt, ALL);
    const d = firstDiff(a.tree, b.tree);
    console.log('==', k, d && d.path, '\n V:', JSON.stringify(d?.a)?.slice(0, 400), '\n N:', JSON.stringify(d?.b)?.slice(0, 400));
  }
}
