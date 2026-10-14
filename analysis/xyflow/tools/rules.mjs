// 无行为影响的等价改写规则；两边都做，按规则记录命中
import { renumber } from './lib.mjs';
const clone = (x) => JSON.parse(JSON.stringify(x));
const isLit = (n) => n && ['StringLiteral', 'NumericLiteral', 'BooleanLiteral', 'NullLiteral'].includes(n.type);
const litVal = (n) => n.type === 'NullLiteral' ? null : n.value;
const isUndef = (n) => n && n.type === 'UnaryExpression' && n.operator === 'void' && isLit(n.argument);
const truthy = (n) => {
  if (n.type === 'Truthy') return true;
  if (isLit(n)) return !!litVal(n);
  if (isUndef(n)) return false;
  if (['ObjectExpression', 'ArrayExpression', 'ArrowFunctionExpression', 'FunctionExpression'].includes(n.type)) return true;
  return undefined;
};
const B = (v) => ({ type: 'BooleanLiteral', value: v });
function isPure(n) {
  if (!n) return true;
  if (isLit(n) || n.type === 'Id' || n.type === 'Ref' || n.type === 'Truthy' || isUndef(n)) return true;
  if (['ArrowFunctionExpression', 'FunctionExpression'].includes(n.type)) return true;
  if (n.type === 'TemplateLiteral') return n.expressions.every(isPure);
  if (n.type === 'ObjectExpression') return n.properties.every((p) => p.type === 'ObjectProperty' && !p.computed && isPure(p.value) || p.type === 'ObjectMethod');
  if (n.type === 'ArrayExpression') return n.elements.every(isPure);
  return false;
}
function mapTree(t, f) {
  // 后序改写
  function w(n) {
    if (Array.isArray(n)) return n.map(w);
    if (!n || typeof n !== 'object') return n;
    for (const k in n) n[k] = w(n[k]);
    return f(n);
  }
  return w(t);
}
const isMeta = (n) => n?.type === 'MetaProperty' && n.meta?.name === 'import' && n.property?.name === 'meta';
const mem = (n, prop) => n?.type === 'MemberExpression' && !n.computed && n.property?.type === 'Identifier' && n.property.name === prop;

export const RULES = {
  // 生产构建常量替换：vite 把 import.meta.env 换成对象、MODE 换成 "production"；process.env.NODE_ENV 同理
  ENV: (n, hit) => {
    if (mem(n, 'MODE') && (n.object.type === 'Truthy' || mem(n.object, 'env') && isMeta(n.object.object))) return hit(), { type: 'StringLiteral', value: 'production' };
    if (mem(n, 'env') && isMeta(n.object)) return hit(), { type: 'Truthy' };
    if (n.type === 'Ref' && n.key === 'VITE_ENV') return hit(), { type: 'Truthy' };
    if (mem(n, 'NODE_ENV') && mem(n.object, 'env') && n.object.object?.type === 'Ref' && n.object.object.key === 'free:process') return hit(), { type: 'StringLiteral', value: 'production' };
    return n;
  },
  // 顶层 var/const：打包器把模块级 var 改成 const（声明只赋值一次，无行为差异）
  VARCONST: (n, hit) => { if (n.type === 'VariableDeclaration' && n.kind === 'var' && n._top) { hit(); n.kind = 'const'; } return n; },
  // undefined 与 void 0（压缩器改写）
  UNDEF: (n, hit) => { if (n.type === 'Ref' && n.key === 'free:undefined') { hit(); return { type: 'UnaryExpression', operator: 'void', prefix: true, argument: { type: 'NumericLiteral', value: 0 } }; } return n; },
  // 常量折叠
  FOLD: (n, hit) => {
    if (n.type === 'ConditionalExpression') { const t = truthy(n.test); if (t !== undefined) return hit(), t ? n.consequent : n.alternate; }
    if (n.type === 'BinaryExpression' && isLit(n.left) && isLit(n.right)) {
      const a = litVal(n.left), b = litVal(n.right);
      const ops = { '===': a === b, '!==': a !== b, '==': a == b, '!=': a != b };
      if (n.operator in ops) return hit(), B(ops[n.operator]);
    }
    if (n.type === 'UnaryExpression' && n.operator === '!' && truthy(n.argument) !== undefined ) return hit(), B(!truthy(n.argument));
    if (n.type === 'LogicalExpression') { const t = truthy(n.left); if (t !== undefined && isLit(n.left)) { hit(); if (n.operator === '&&') return t ? n.right : n.left; if (n.operator === '||') return t ? n.left : n.right; } }
    return n;
  },
  // 永假/永真分支（生产构建里不会执行的分支）
  DEADIF: (n, hit) => {
    if (n.type === 'IfStatement' && n.test.type === 'BooleanLiteral') { hit(); return n.test.value ? n.consequent : (n.alternate || { type: 'EmptyStatement' }); }
    return n;
  },
  // 空语句 / 空分支 / 多余块
  EMPTY: (n, hit) => {
    const fix = (list) => {
      const out = [];
      for (const s of list) {
        if (s.type === 'EmptyStatement') { hit(); continue; }
        if (s.type === 'BlockStatement' && !s.body.some((x) => x.type === 'VariableDeclaration' && x.kind !== 'var' || x.type === 'ClassDeclaration' || x.type === 'FunctionDeclaration')) { hit(); out.push(...s.body); continue; }
        if (s.type === 'IfStatement' && !s.alternate && s.consequent.type === 'BlockStatement' && s.consequent.body.length === 0) { hit(); if (!isPure(s.test)) out.push({ type: 'ExpressionStatement', expression: s.test }); continue; }
        out.push(s);
      }
      return out;
    };
    if (n.type === 'BlockStatement') n.body = fix(n.body);
    if (n.type === 'SwitchCase') n.consequent = fix(n.consequent);
    if (n.type === 'IfStatement' && n.alternate && n.alternate.type === 'BlockStatement' && n.alternate.body.length === 0) { hit(); n.alternate = null; }
    return n;
  },
  // useRef(undefined) 与 useRef()：React 两者等价
  REFARG: (n, hit) => {
    if (n.type === 'CallExpression' && n.callee.type === 'Ref' && n.callee.key === 'ext:react:useRef' && n.arguments.length === 1 && isUndef(n.arguments[0])) { hit(); n.arguments = []; }
    return n;
  },
  // 箭头函数 { return x } 与表达式体
  ARROWRET: (n, hit) => {
    if (n.type === 'ArrowFunctionExpression' && n.body.type === 'BlockStatement' && n.body.body.length === 1 && n.body.body[0].type === 'ReturnStatement' && n.body.body[0].argument) { hit(); n.body = n.body.body[0].argument; n.expression = true; }
    return n;
  },
};
// 未使用的局部变量（初始化无副作用）
function unused(t, hit, keepCall) {
  const count = new Map();
  (function w(n) { if (Array.isArray(n)) return n.forEach(w); if (!n || typeof n !== 'object') return; if (n.type === 'Id') count.set(n.name, (count.get(n.name) || 0) + 1); for (const k in n) w(n[k]); })(t);
  return mapTree(t, (n) => {
    const fix = (list) => keepCall ? list.map((s) => {
      if (s.type === 'VariableDeclaration' && s.declarations.length === 1 && s.declarations[0].id.type === 'Id' && count.get(s.declarations[0].id.name) === 1 && s.declarations[0].init && !isPure(s.declarations[0].init)) { hit(); return { type: 'ExpressionStatement', expression: s.declarations[0].init }; }
      return s;
    }) : list.filter((s) => {
      if (s.type !== 'VariableDeclaration') return true;
      s.declarations = s.declarations.filter((d) => !(d.id.type === 'Id' && count.get(d.id.name) === 1 && isPure(d.init) && (hit(), true)));
      return s.declarations.length > 0;
    });
    if (n.type === 'BlockStatement') n.body = fix(n.body);
    return n;
  });
}
export const RULE_NAMES = ['UNDEF', 'VARCONST', 'ENV', 'FOLD', 'DEADIF', 'EMPTY', 'ARROWRET', 'REFARG', 'UNUSED', 'UNUSEDCALL'];
export function simplify(tree, enabled) {
  let t = clone(tree);
  if (t.type === 'VariableDeclaration') t._top = true;
  const hits = new Set();
  for (let i = 0; i < 20; i++) {
    let changed = false;
    for (const r of RULE_NAMES) {
      if (!enabled.has(r)) continue;
      const hit = () => { hits.add(r); changed = true; };
      if (r === 'UNUSED') t = unused(t, hit); else if (r === 'UNUSEDCALL') t = unused(t, hit, true); else t = mapTree(t, (n) => RULES[r](n, hit));
    }
    if (!changed) break;
  }
  delete t._top;
  return { tree: renumber(t), hits };
}
