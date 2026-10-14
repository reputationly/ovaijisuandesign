import fs from 'node:fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

export const strip = (n) => n.replace(/(.)\$[0-9a-zA-Z]+$/, "$1");
const normSrc = (s) => s.replace(/\.js$/, '');

// 解析一个模块，返回顶层单元（按声明符拆分）与导入表
export function loadModule(file, label) {
  const code = fs.readFileSync(file, 'utf8');
  const ast = parse(code, { sourceType: 'module', plugins: ['jsx'], errorRecovery: false });
  const imports = new Map(); // local -> {src, imported}
  const exportsMap = new Map(); // exported -> local
  const units = [];
  let progScope;
  traverse(ast, {
    Program(p) { progScope = p.scope; p.stop(); },
  });
  // 先给标识符打引用标注
  traverse(ast, {
    Identifier(p) { annotate(p); },
    JSXIdentifier(p) { annotate(p); },
  });
  function annotate(p) {
    const node = p.node;
    const isRef = p.isReferencedIdentifier();
    const isBind = p.isBindingIdentifier();
    if (!isRef && !isBind) {
      // 赋值左侧 / 解构里的标识符
      const par = p.parent;
      const ok = (p.parentPath.isAssignmentExpression() && par.left === node) || p.parentPath.isUpdateExpression() ||
        p.parentPath.isAssignmentPattern() && par.left === node || p.parentPath.isRestElement() || p.parentPath.isArrayPattern() ||
        (p.parentPath.isObjectProperty() && par.value === node && p.parentPath.parentPath.isObjectPattern()) ||
        p.parentPath.isForXStatement() && par.left === node;
      if (!ok) return;
    }
    const b = p.scope.getBinding(node.name);
    if (!b) { node._r = { k: 'free', name: node.name }; return; }
    if (b.kind === 'module') {
      const spec = b.path.node; const decl = b.path.parent;
      const imported = spec.type === 'ImportDefaultSpecifier' ? 'default' : spec.type === 'ImportNamespaceSpecifier' ? '*' : (spec.imported.name ?? spec.imported.value);
      node._r = { k: 'imp', src: normSrc(decl.source.value), imported };
      return;
    }
    if (b.scope === progScope) { node._r = { k: 'top', name: node.name }; return; }
    node._r = { k: 'loc', b };
  }
  const lines = (n) => n.loc.start.line;
  for (const st of ast.program.body) {
    if (st.type === 'ImportDeclaration') {
      for (const s of st.specifiers) imports.set(s.local.name, { src: normSrc(st.source.value), imported: s.type === 'ImportDefaultSpecifier' ? 'default' : s.type === 'ImportNamespaceSpecifier' ? '*' : (s.imported.name ?? s.imported.value) });
      continue;
    }
    let s = st;
    if (st.type === 'ExportNamedDeclaration' || st.type === 'ExportDefaultDeclaration') {
      if (st.type === 'ExportNamedDeclaration' && !st.declaration) {
        for (const sp of st.specifiers) exportsMap.set(sp.exported.name ?? sp.exported.value, sp.local.name);
        if (st.source) continue;
        continue;
      }
      s = st.declaration;
      if (st.type === 'ExportDefaultDeclaration') exportsMap.set('default', s.id?.name);
    }
    if (s.type === 'VariableDeclaration') {
      for (const d of s.declarations) {
        const names = patNames(d.id);
        units.push({ label, names, kind: s.kind, node: { type: 'VariableDeclaration', kind: s.kind, declarations: [d] }, start: d.start ?? s.start, end: d.end ?? s.end, line: lines(d), stmtStart: s.start, stmtEnd: s.end, multi: s.declarations.length > 1 });
      }
    } else if (s.type === 'FunctionDeclaration' || s.type === 'ClassDeclaration') {
      units.push({ label, names: [s.id.name], kind: s.type, node: s, start: s.start, end: s.end, line: lines(s), stmtStart: st.start, stmtEnd: st.end });
    } else {
      units.push({ label, names: [], kind: s.type, node: s, start: s.start, end: s.end, line: lines(s), stmtStart: st.start, stmtEnd: st.end });
    }
  }
  for (const u of units) u.src = code.slice(u.start, u.end), u.refs = collectRefs(u.node);
  return { file, label, code, ast, units, imports, exportsMap, byName: indexByName(units) };
}
function indexByName(units) { const m = new Map(); for (const u of units) for (const n of u.names) m.set(n, u); return m; }
export function patNames(p) {
  const out = [];
  (function w(n) {
    if (!n) return;
    if (n.type === 'Identifier') out.push(n.name);
    else if (n.type === 'ObjectPattern') n.properties.forEach((x) => w(x.type === 'RestElement' ? x.argument : x.value));
    else if (n.type === 'ArrayPattern') n.elements.forEach(w);
    else if (n.type === 'AssignmentPattern') w(n.left);
    else if (n.type === 'RestElement') w(n.argument);
  })(p);
  return out;
}
function collectRefs(node) {
  const tops = new Set(), imps = new Set();
  (function w(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(w);
    if (n._r) { if (n._r.k === 'top') tops.add(n._r.name); else if (n._r.k === 'imp') imps.add(n._r.src + ':' + n._r.imported); }
    for (const k in n) if (!SKIP.has(k)) w(n[k]);
  })(node);
  return { tops: [...tops], imps: [...imps] };
}
const SKIP = new Set(['loc', 'start', 'end', 'extra', 'comments', 'leadingComments', 'trailingComments', 'innerComments', 'range', '_r', 'shorthand', 'tokens']);

// 转成可比较的纯 JSON；refKey(ref) 把顶层/导入引用换成规范键
export function clean(node, refKey) {
  const locIds = new Map();
  function w(n) {
    if (Array.isArray(n)) return n.map(w);
    if (!n || typeof n !== 'object') return n;
    if ((n.type === 'Identifier' || n.type === 'JSXIdentifier') && n._r) {
      const r = n._r;
      if (r.k === 'loc') { if (!locIds.has(r.b)) locIds.set(r.b, 'L' + locIds.size); return { type: 'Id', name: locIds.get(r.b) }; }
      return { type: 'Ref', key: refKey(r) };
    }
    // 互操作：xxxExports.member（默认导入的 CJS 命名空间）== 具名导入
    if (n.type === 'MemberExpression' && !n.computed && n.object._r && n.object._r.k !== 'loc' && n.property.type === 'Identifier') {
      const k = refKey(n.object._r);
      if (typeof k === 'string' && /^ext:(react|react\/jsx-runtime|react-dom):default$/.test(k)) return { type: 'Ref', key: k.replace(/:default$/, ':' + n.property.name) };
    }
    const o = {};
    for (const k of Object.keys(n).sort()) {
      if (SKIP.has(k)) continue;
      o[k] = w(n[k]);
    }
    if (n.type === 'StringLiteral' || n.type === 'NumericLiteral') o.value = n.value;
    if (n.extra?.parenthesized) {/* 括号：格式 */}
    return o;
  }
  return w(node);
}

// 重新按首次出现编号本地名（化简后用）
export function renumber(t) {
  const m = new Map();
  (function w(n) {
    if (Array.isArray(n)) return n.forEach(w);
    if (!n || typeof n !== 'object') return;
    if (n.type === 'Id') { if (!m.has(n.name)) m.set(n.name, 'L' + m.size); n.name = m.get(n.name); return; }
    for (const k in n) w(n[k]);
  })(t);
  return t;
}

export function firstDiff(a, b, path = '') {
  if (a === b) return null;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return { path, a, b };
  if (Array.isArray(a) !== Array.isArray(b)) return { path, a, b };
  if (Array.isArray(a)) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = firstDiff(a[i], b[i], path + '[' + i + ']'); if (d) return d; }
    return null;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) { const d = firstDiff(a[k], b[k], path + '.' + k); if (d) return d; }
  return null;
}
export const eq = (a, b) => firstDiff(a, b) === null;
