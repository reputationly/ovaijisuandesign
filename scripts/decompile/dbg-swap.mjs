// 调试单个包为什么没认全：对报冲突的名字，把 vendor 里的语句形状和该包 npm dist 的文本对一遍。
//   node scripts/decompile/dbg-swap.mjs <包名> <版本> <名字>...
// 名字用 swapEsm 报冲突时打印的原名（如 cmpRange、mac$1）。输出：该名字的语句头、形状是否命中、
// dist 里能不能找到、以及 dist 里同名定义的原文（截断）。
import { parse } from "@babel/parser";
import { readFileSync } from "node:fs";
import path from "node:path";

import { fetchPackage, norm } from "./npm-swap.mjs";
import { moduleGraph } from "./npm-swap.mjs" with { "module-graph": "private" };
