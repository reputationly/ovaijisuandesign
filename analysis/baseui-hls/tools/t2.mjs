import { parseFile } from "./canon.mjs";
import _traverse from "@babel/traverse";
const traverse = _traverse.default;
const ast = parseFile("function f(c){ if (c === undefined) return 1; }");
traverse(ast, { Identifier(p) { console.log(p.node.name, p.isReferencedIdentifier(), p.scope.hasBinding("undefined")); } });
