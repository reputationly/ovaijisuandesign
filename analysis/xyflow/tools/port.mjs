// 把 vendor 里的行为改动移植到 npm dist：语句/列表级对齐，相同部分保留 dist 原文，只替换/插入/删除不同部分
import fs from 'node:fs';
import path from 'node:path';
import { loadModule, clean, renumber, eq, strip } from './lib.mjs';
import _gen from '@babel/generator';
import _trav from '@babel/traverse';
import * as t from '@babel/types';
const generate = _gen.default || _gen;
const traverse = _trav.default || _trav;

const [vendorFile, fvFile, npmRoot, mappingFile, outRoot, onlyLabels] = process.argv.slice(2);
const PK = {
  system: { dir: 'xyflow-system-0.0.76', spec: '@xyflow/system', file: 'package/dist/esm/index.js' },
  react: { dir: 'xyflow-react-12.10.2', spec: '@xyflow/react', file: 'package/dist/esm/index.js' },
  'z-vanilla': { dir: 'zustand-4.5.7', spec: 'zustand/vanilla', file: 'package/esm/vanilla.mjs' },
  'z-traditional': { dir: 'zustand-4.5.7', spec: 'zustand/traditional', file: 'package/esm/traditional.mjs' },
  'z-shallow': { dir: 'zustand-4.5.7', spec: 'zustand/shallow', file: 'package/esm/shallow.mjs' },
  classcat: { dir: 'classcat-5.0.5', spec: 'classcat', file: 'package/index.js' },
};
const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
const vName2key = new Map(mapping.map((x) => [x.vendor, x.npmKey]));
const loadNpm = (l) => loadModule(path.join(npmRoot, PK[l].dir, PK[l].file), l);
const NPM = Object.fromEntries(Object.keys(PK).map((l) => [l, loadNpm(l)]));
const INTEROP_DEFAULT = /^(react|react-dom|react\/jsx-runtime)$/;

function stripExtra(n) { (function w(x) { if (Array.isArray(x)) return x.forEach(w); if (!x || typeof x !== 'object') return; if (x.extra) delete x.extra; for (const k in x) if (k !== '_r' && k !== 'loc') w(x[k]); })(n); }
const GOPT = { comments: false, jsescOption: { quotes: 'single', minimal: true } };
const C = (n) => n == null ? '∅' : generate(n, { ...GOPT, compact: true }).code.replace(/\bundefined\b/g, 'void 0');
const lineIndent = (code, pos) => { const ls = code.lastIndexOf('\n', pos - 1) + 1; return /^[ \t]*/.exec(code.slice(ls))[0]; };
function reindent(text, base) {
  return text.split('\n').map((l, i) => { if (i === 0) return l; const m = /^( *)/.exec(l)[1].length; return base + ' '.repeat(m * 2) + l.slice(m); }).join('\n');
}

const report = { warnings: [], units: [], helpers: [], imports: [], exportsAdded: [] };

function processLabel(L, extraExports) {
  const T = NPM[L];
  const code = T.code;
  const V = loadModule(vendorFile, 'vendor');
  const FV = loadModule(fvFile, 'fv');
  const Tnames = new Set([...T.units.flatMap((u) => u.names), ...T.imports.keys()]);
  const needImports = new Map(); // spec -> Set(imported)
  const helpers = new Map(); // name -> text
  const helperOrder = [];
  const edits = [];
  let seq = 0;
  const reqSysExports = new Set();

  function importName(spec, imported) {
    for (const [loc, im] of T.imports) if (im.src === spec && im.imported === imported) return loc;
    if (spec === PK[L].spec) return imported; // 自引用
    const name = imported === 'default' ? spec.replace(/\W/g, '_') : imported;
    if (Tnames.has(name) && !(needImports.get(spec)?.has(imported))) report.warnings.push(`${L}: 新增导入 ${spec}:${imported} 与已有名字冲突`);
    if (!needImports.has(spec)) needImports.set(spec, new Set());
    needImports.get(spec).add(imported);
    return name;
  }
  function keyToName(key) {
    const [lab, nm] = key.split('#');
    if (lab === L) return nm;
    let exp = null;
    for (const [e, loc] of NPM[lab].exportsMap) if (loc === nm) { exp = e; break; }
    if (!exp) {
      if (lab === 'system' && L === 'react') { reqSysExports.add(nm); exp = nm; }
      else { report.warnings.push(`${L}: ${key} 未导出`); exp = nm; }
    }
    return importName(PK[lab].spec, exp);
  }
  const refKeyRaw = (r) => r.k === 'free' ? 'free:' + r.name : r.k === 'imp' ? `imp:${r.src}:${r.imported}` : 'top:' + r.name;
  function equivUnit(a, b) { return eq(renumber(clean(a.node, refKeyRaw)), renumber(clean(b.node, refKeyRaw))); }
  function helperName(name) {
    const s = strip(name);
    if (!Tnames.has(s)) return s;
    if (!Tnames.has(name)) return name;
    return name + '_app';
  }
  function inline(mod, name, resolver, origin) {
    if (helpers.has(name)) return helpers.get(name).name;
    const u = mod.byName.get(name);
    if (!u) { report.warnings.push(`${L}: 找不到 ${origin} 声明 ${name}`); return name; }
    // 已有等价声明：本包或 system 导出
    const s = strip(name);
    const own = T.units.find((x) => x.names[0] === s);
    if (own && equivUnit(u, own)) { helpers.set(name, { name: s, reused: `${L}#${s}` }); return s; }
    if (L === 'react') {
      const su = NPM.system.units.find((x) => x.names[0] === s);
      if (su && equivUnit(u, su) && [...NPM.system.exportsMap.values()].includes(s)) { const n = importName('@xyflow/system', s); helpers.set(name, { name: n, reused: `system#${s}` }); return n; }
    }
    const hn = helperName(name);
    Tnames.add(hn);
    const rec = { name: hn, origin, src: name };
    helpers.set(name, rec);
    const [ported] = portUnits(mod, [u], resolver, { [name]: hn });
    rec.text = ported.text;
    helperOrder.push(name);
    return hn;
  }
  const vResolver = (r) => {
    if (r.k === 'free') return r.name;
    if (r.k === 'top') { const key = vName2key.get(r.name); if (key) return keyToName(key); return inline(V, r.name, vResolver, 'vendor'); }
    if (r.k === 'imp') {
      if (r.src.includes('infra/from-vendor')) return inline(FV, r.imported, fvResolver, 'from-vendor');
      if (r.src === '@xyflow/system' && L === 'system') return r.imported;
      return importName(r.src, r.imported);
    }
  };
  const fvResolver = (r) => {
    if (r.k === 'free') return r.name;
    if (r.k === 'top') return inline(FV, r.name, fvResolver, 'from-vendor');
    if (r.k === 'imp') return importName(r.src, r.imported);
  };

  // 对 mod 里若干顶层 unit：重命名引用与本地绑定，返回生成文本 + 节点
  function portUnits(mod, units, resolver, selfNames = {}) {
    const lo = Math.min(...units.map((u) => u.start)), hi = Math.max(...units.map((u) => u.end));
    const refs = []; const scopes = new Set();
    traverse(mod.ast, {
      enter(p) {
        const n = p.node;
        if (n.type !== 'Program' && (n.end < lo || n.start > hi)) { p.skip(); return; }
        if (p.scope && p.scope.path.type !== 'Program' && n.start >= lo && n.end <= hi && units.some((u) => n.start >= u.start && n.end <= u.end)) scopes.add(p.scope);
        if ((n.type === 'Identifier' || n.type === 'JSXIdentifier') && n._r && n._r.k !== 'loc' && units.some((u) => n.start >= u.start && n.end <= u.end)) refs.push(p);
      },
    });
    // 互操作 default 成员：reactExports.useRef -> useRef
    const targets = [];
    for (const p of refs) {
      const n = p.node, r = n._r;
      if (r.k === 'top' && selfNames[r.name]) { targets.push([p, selfNames[r.name]]); continue; }
      const par = p.parent;
      const interop = (r.k === 'imp' && r.imported === 'default' && INTEROP_DEFAULT.test(r.src)) || (r.k === 'top' && r.name === 'React');
      if (interop && p.parentPath.isMemberExpression() && par.object === n && !par.computed) {
        const src = r.k === 'top' ? 'react' : r.src;
        targets.push([p.parentPath, importName(src, par.property.name), true]);
        continue;
      }
      if (r.k === 'top' && /Exports$/.test(r.name)) report.warnings.push(`${L}: 未处理互操作 ${r.name}`);
      targets.push([p, resolver(r)]);
    }
    const targetNames = new Set(targets.map((x) => x[1]));
    // 本地名：去掉打包器加的数字后缀；避免与目标名、外层/内层绑定冲突
    for (const sc of scopes) {
      for (const name of Object.keys(sc.bindings)) {
        const b = sc.bindings[name];
        if (b.identifier.start < lo || b.identifier.end > hi) continue;
        if (targetNames.has(name)) { sc.rename(name, name + '_'); continue; }
        const c = name.replace(/\d+$/, '');
        if (c === name || !c || !t.isValidIdentifier(c) || targetNames.has(c)) continue;
        let bad = false;
        for (let s = sc; s && s.path.type !== 'Program'; s = s.parent) if (s.hasOwnBinding(c)) bad = true;
        for (const rp of b.referencePaths.concat(b.constantViolations)) for (let s = rp.scope; s && s !== sc; s = s.parent) if (s.hasOwnBinding(c)) bad = true;
        if (sc.hasGlobal?.(c) || sc.getProgramParent().hasBinding(c) && [...b.referencePaths].some((rp) => false)) bad = bad || false;
        if (!bad) sc.rename(name, c);
      }
    }
    for (const [p, nm, isMember] of targets) {
      if (isMember) { p.replaceWith(t.identifier(nm)); continue; }
      p.node.name = nm;
    }
    return units.map((u) => {
      const nodes = u.node.type === 'VariableDeclaration' && u.node.declarations.length === 1 ? u.node.declarations[0] : u.node;
      stripExtra(u.node);
      let txt;
      if (u.node.type === 'VariableDeclaration') txt = `const ${generate(nodes, GOPT).code};`;
      else txt = generate(u.node, GOPT).code;
      return { unit: u, node: nodes, text: reindent(txt, '') };
    });
  }

  // ---- 编辑合成 ----
  const gen = (v, base) => reindent(generate(v, GOPT).code, base);
  const SIMPLE = new Set(['Identifier', 'StringLiteral', 'NumericLiteral', 'BooleanLiteral', 'NullLiteral', 'MemberExpression', 'OptionalMemberExpression', 'CallExpression', 'OptionalCallExpression', 'ThisExpression', 'TemplateLiteral', 'ObjectExpression', 'ArrayExpression']);
  const rep = (n, v, sub) => {
    for (let k = edits.length - 1; k >= 0; k--) { const e = edits[k]; if (e.start >= n.start && e.end <= n.end && !(e.start === e.end && (e.start === n.end || e.start === n.start))) edits.splice(k, 1); }
    const txt = gen(v, lineIndent(code, n.start));
    edits.push({ start: n.start, end: n.end, text: sub && !SIMPLE.has(v.type) ? '(' + txt + ')' : txt, seq: seq++ });
  };
  const ins = (pos, text) => edits.push({ start: pos, end: pos, text, seq: seq++ });
  const del = (s, e) => edits.push({ start: s, end: e, text: '', seq: seq++ });
  function lcs(a, b, f) {
    const A = a.map(f), B = b.map(f); const n = A.length, m = B.length;
    const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const pairs = []; let i = 0, j = 0;
    while (i < n && j < m) { if (A[i] === B[j]) { pairs.push([i, j]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
    return pairs;
  }
  // 列表对齐：stmt=true 为语句列表，否则逗号列表
  function list(nl, vl, parent, stmt) {
    if (!nl.length || !vl.length || nl.includes(null) || vl.includes(null)) return rep(parent, parentV.get(parent));
    const eqPairs = lcs(nl, vl, C);
    // 间隙内按类型再对齐，配对的递归
    const pairs = []; let pi = 0, pj = 0;
    for (const [i, j] of [...eqPairs, [nl.length, vl.length]]) {
      const ng = nl.slice(pi, i), vg = vl.slice(pj, j);
      const tp = ng.length === vg.length ? ng.map((_, k) => [k, k]) : lcs(ng, vg, (x) => x.type + (x.type === 'ObjectProperty' ? ':' + C(x.key) : x.type === 'VariableDeclaration' ? ':' + C(x.declarations[0].id) : ''));
      for (const [a, b] of tp) pairs.push([pi + a, pj + b, false]);
      if (i < nl.length) pairs.push([i, j, true]);
      pi = i + 1; pj = j + 1;
    }
    pairs.sort((a, b) => a[0] - b[0]);
    const keptN = new Set(pairs.map((p) => p[0]));
    const vToN = new Map(pairs.map((p) => [p[1], p[0]]));
    // 删除
    const keptIdx = [...keptN].sort((a, b) => a - b);
    if (!keptIdx.length) return rep(parent, parentV.get(parent));
    const multiline = nl.length > 1 ? code.slice(nl[0].end, nl[1].start).includes('\n') : code.slice(parent.start, parent.end).includes('\n');
    for (let i = 0; i < nl.length; i++) {
      if (keptN.has(i)) continue;
      let b = i; while (b + 1 < nl.length && !keptN.has(b + 1)) b++;
      const prev = keptIdx.filter((k) => k < i).pop();
      if (prev !== undefined) del(nl[prev].end, nl[b].end);
      else { const next = keptIdx.find((k) => k > b); del(nl[i].start, nl[next].start); }
      i = b;
    }
    for (const [i, j, same] of pairs) if (!same) E(nl[i], vl[j]);
    // 插入：每个未配对的 vendor 元素放在前一个已配对元素之后
    for (let j = 0; j < vl.length; j++) {
      if (vToN.has(j)) continue;
      let pj2 = j - 1; while (pj2 >= 0 && !vToN.has(pj2)) pj2--;
      if (pj2 >= 0) {
        const anchor = nl[vToN.get(pj2)]; const base = lineIndent(code, anchor.start);
        const sep = stmt || multiline ? '\n' + base : ' ';
        ins(anchor.end, (stmt ? '' : ',') + sep + gen(vl[j], base));
      } else {
        const first = nl[keptIdx[0]]; const base = lineIndent(code, first.start);
        const sep = stmt || multiline ? '\n' + base : ' ';
        edits.push({ start: first.start, end: first.start, text: gen(vl[j], base) + (stmt ? '' : ',') + sep, seq: -1e6 + j });
      }
    }
  }
  const parentV = new Map();
  function E(n, v, sub) {
    if (C(n) === C(v)) return;
    if (!n || !v || n.type !== v.type) return rep(n, v, sub);
    parentV.set(n, v);
    switch (n.type) {
      case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression':
        if (n.async !== v.async || n.generator !== v.generator || C(n.id) !== C(v.id)) return rep(n, v);
        if (n.params.map(C).join() !== v.params.map(C).join()) { if (!n.params.length || !v.params.length) return rep(n, v); list(n.params, v.params, n, false); }
        if ((n.body.type === 'BlockStatement') !== (v.body.type === 'BlockStatement')) return rep(n.body, v.body);
        return E(n.body, v.body);
      case 'BlockStatement': return list(n.body, v.body, n, true);
      case 'VariableDeclaration':
        if (n.kind !== v.kind || n.declarations.length !== v.declarations.length) return rep(n, v);
        return n.declarations.forEach((d, i) => E(d, v.declarations[i]));
      case 'VariableDeclarator':
        if (!n.init !== !v.init) return rep(n, v);
        if (C(n.id) !== C(v.id)) E(n.id, v.id);
        if (n.init) E(n.init, v.init);
        return;
      case 'ObjectExpression': case 'ObjectPattern': return list(n.properties, v.properties, n, false);
      case 'ArrayExpression': case 'ArrayPattern': return list(n.elements, v.elements, n, false);
      case 'ObjectProperty':
        if (n.computed !== v.computed || n.shorthand || v.shorthand || C(n.key) !== C(v.key)) return rep(n, v);
        return E(n.value, v.value);
      case 'AssignmentPattern': E(n.left, v.left); return E(n.right, v.right);
      case 'CallExpression': case 'OptionalCallExpression': case 'NewExpression':
        if (n.optional !== v.optional || !n.arguments.length || !v.arguments.length) return rep(n, v);
        E(n.callee, v.callee, true); return list(n.arguments, v.arguments, n, false);
      case 'MemberExpression': case 'OptionalMemberExpression':
        if (n.computed !== v.computed || n.optional !== v.optional || (!n.computed && C(n.property) !== C(v.property))) return rep(n, v);
        E(n.object, v.object, true); if (n.computed) E(n.property, v.property); return;
      case 'ExpressionStatement': return E(n.expression, v.expression);
      case 'ReturnStatement': if (!n.argument || !v.argument) return rep(n, v); return E(n.argument, v.argument);
      case 'IfStatement':
        E(n.test, v.test); E(n.consequent, v.consequent);
        if (n.alternate && v.alternate) return E(n.alternate, v.alternate);
        if (!n.alternate && v.alternate) return ins(n.consequent.end, ' else ' + gen(v.alternate, lineIndent(code, n.start)));
        if (n.alternate && !v.alternate) return del(n.consequent.end, n.alternate.end);
        return;
      case 'ForOfStatement': case 'ForInStatement':
        if (n.await !== v.await) return rep(n, v);
        E(n.left, v.left); E(n.right, v.right); return E(n.body, v.body);
      case 'ConditionalExpression': if (sub) return rep(n, v, sub); E(n.test, v.test, true); E(n.consequent, v.consequent, true); return E(n.alternate, v.alternate, true);
      case 'LogicalExpression': case 'BinaryExpression':
        if (n.operator !== v.operator || sub) return rep(n, v, sub);
        E(n.left, v.left, true); return E(n.right, v.right, true);
      case 'AssignmentExpression':
        if (n.operator !== v.operator || sub) return rep(n, v, sub);
        E(n.left, v.left); return E(n.right, v.right);
      case 'TemplateLiteral':
        if (n.quasis.map(C).join() !== v.quasis.map(C).join() || n.expressions.length !== v.expressions.length) return rep(n, v);
        return n.expressions.forEach((x, i) => E(x, v.expressions[i]));
      default: return rep(n, v, sub);
    }
  }

  const targetsMap = mapping.filter((x) => x.status === 'diff' && x.npmKey.startsWith(L + '#'));
  for (const x of targetsMap) {
    const vu = V.units.find((u) => u.names[0] === x.vendor && u.line === x.vendorLine);
    const nm = x.npmKey.split('#')[1];
    const nu = T.units.find((u) => u.names.includes(nm));
    if (!vu || !nu) { report.warnings.push(`${L}: 找不到 ${x.vendor}/${x.npmKey}`); continue; }
    const [pv] = portUnits(V, [vu], vResolver, { [x.vendor]: nm });
    stripExtra(nu.node);
    const nn = nu.node.type === 'VariableDeclaration' && nu.node.declarations.length === 1 ? nu.node.declarations[0] : nu.node;
    const before = edits.length;
    E(nn, pv.node);
    report.units.push({ label: L, vendor: x.vendor, npm: nm, edits: edits.length - before });
  }
  // system 需要导出给 react 用的内部声明
  for (const nm of extraExports || []) {
    const ex = T.ast.program.body.filter((s) => s.type === 'ExportNamedDeclaration' && !s.declaration && !s.source).pop();
    const last = ex.specifiers[ex.specifiers.length - 1];
    ins(last.end, ', ' + nm); report.exportsAdded.push(`${L}:${nm}`);
  }
  // 导入
  const importDecls = T.ast.program.body.filter((s) => s.type === 'ImportDeclaration');
  for (const [spec, set] of needImports) {
    const d = importDecls.find((s) => s.source.value === spec && s.specifiers.some((x) => x.type === 'ImportSpecifier'));
    const names = [...set].filter((n) => n !== 'default');
    if (d) { const last = d.specifiers[d.specifiers.length - 1]; ins(last.end, names.map((n) => ', ' + n).join('')); }
    else { const lastImp = importDecls[importDecls.length - 1]; ins(lastImp.end, `\nimport { ${names.join(', ')} } from '${spec}';`); }
    report.imports.push(`${L}: ${spec} { ${names.join(', ')} }`);
  }
  // 内联 helper：放在 import 之后
  const hs = helperOrder.map((n) => helpers.get(n)).filter((h) => h.text);
  if (hs.length) {
    const lastImp = importDecls[importDecls.length - 1];
    const txt = '\n' + hs.map((h) => reindent(h.text.replace(/^export /, ''), '').replace(/^ +/gm, (m) => m)).join('\n');
    ins(lastImp.end, txt);
  }
  for (const h of helpers.values()) report.helpers.push({ label: L, ...h, text: undefined, lines: h.text ? h.text.split('\n').length : 0 });
  // 应用编辑
  edits.sort((a, b) => b.start - a.start || b.end - a.end || b.seq - a.seq);
  let out = code; let lastStart = Infinity;
  for (const e of edits) {
    if (e.end > lastStart) report.warnings.push(`${L}: 编辑重叠 @${e.start}-${e.end}`);
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
    lastStart = Math.min(lastStart, e.start);
  }
  return { out, reqSysExports };
}

const labels = (onlyLabels || 'react,system').split(',');
let sysExtra = [];
for (const L of labels) {
  const { out, reqSysExports } = processLabel(L, L === 'system' ? sysExtra : []);
  if (L === 'react') sysExtra = [...reqSysExports];
  const dst = path.join(outRoot, PK[L].dir, 'package/dist/esm');
  fs.writeFileSync(path.join(dst, 'index.js'), out);
  fs.writeFileSync(path.join(dst, 'index.mjs'), out);
}
fs.writeFileSync(path.join(outRoot, 'port-report.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ warnings: report.warnings, units: report.units.length, helpers: report.helpers.map((h) => `${h.label}:${h.src}->${h.name}${h.reused ? ' (复用 ' + h.reused + ')' : ''}`), imports: report.imports, exportsAdded: report.exportsAdded }, null, 1));
