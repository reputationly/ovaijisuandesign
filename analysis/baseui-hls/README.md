# vendor.js 内联 Base UI / hls.js 版本分析产物

结论和分数见 REPORT.md、SCORES.md。下面说明各文件的内容。全部是只读分析的产物，不参与构建。

## 逐声明 mapping（换包时主要看这里）

- **`mapping-baseui-top1.json`**：Base UI 闭包 763 条声明 → 最接近版本 `@base-ui/react@1.3.0` + `@base-ui/utils@0.2.6` 中的对应声明（exact 713 / norm 35 / diff 15）
- `mapping-baseui-buildeq.json`：同一个闭包对“打了构建等价补丁”的版本（patch/），diff 只剩 4 条（3 条应用重名 + Store）
- `mapping-hls-top1.json`：hls 的 5 条通用名撞名，对 hls.js@1.7.0（hls.js 实际没有内联）

每个元素的字段：

| 字段 | 含义 |
|---|---|
| `i` | 闭包序号，等于 closure-*.json 的下标，也是 perstmt-*.json 里 `[i, 判定]` 的 i |
| `srcFile` / `srcLine` | 声明在还原树里的位置：相对 `app/renderer/src/` 的路径，加上起始行号（以分支 devin/1791701596-renderer-desource @ 478cc70 为准） |
| `names` | 声明的名字，已去掉打包器后缀（`$1`/`$a`）；是空数组时表示无名语句（比如顶层表达式），这时按 AST 形状匹配 |
| `rawNames` | 还原树里的原始绑定名，带后缀，例如 `Store$1`、`stopEvent$2` |
| `type` | Babel 顶层节点类型 |
| `how` | 这条声明进入闭包的依据：`A`/`N`/`B` = 与某候选版本同名声明的 A/N/B 形状一致；`shape` = B 形状一致的无名或改名声明；`sim+ref` = 同名、token 相似度 ≥0.6，且和闭包有引用关系；`ref-dep` = 被 vendor.js 里的闭包声明按名引用 |
| `bestSim` | 与候选同名声明的最高 token 相似度（形状命中时为 1） |
| `owners` | 在任一下载版本里有这个名字的 npm 包（决定这条声明计入哪些包的 total） |
| `verdict` | 在选定版本中的最好判定：`exact` = A 形状一致；`norm` = 只有 N 形状一致（规则 R2–R14，见 REPORT §3.1）；`diff` = 有同名声明但都不一致（逐条判定见 REPORT §3.2）；`missing` = 这个版本没有这个名字 |
| `npmPkg` / `npmVersion` | 给出最好判定的那个包和版本 |
| `npmFile` / `npmLine` | 对应声明在 npm 包里的位置：相对包根的文件路径（按 exports 的 browser/import 条件选出，Base UI 是 `esm/**`），加上起始行号 |
| `perPackage[]` | 每个选定包各自的结果：`{pkg, version, verdict, npmFile, npmLine, otherCandidates}`，其中 `otherCandidates` 是同名但没选中的其它声明数 |

A/N/B 形状的定义见 tools/canon.mjs。A = Babel AST 打印，已去掉注释和格式，按生产构建折叠 `process.env.NODE_ENV`，统一 React namespace 和具名导入，JSX 脱糖，局部变量 α 重命名；N = A 再加上构建器改写的归一化；B = N 再把标识符和字面量都抹成 `_`，只用来选闭包。

## 其它文件

| 文件 | 内容 |
|---|---|
| `closure-baseui.json` / `closure-hls.json` | 闭包声明全量：mapping 的字段之外，还有 `A`/`N`/`B` 形状、`refs`（引用到的名字）、`len`、`srcIndex` |
| `perstmt-baseui.json` / `perstmt-hls.json` | `{ "包@版本": [[闭包序号 i, "exact"\|"norm"\|"diff"\|"missing"], …] }`，覆盖所有下载的版本 |
| `scores-baseui.json` / `scores-hls.json` | 每个包和版本的 `{pkg, v, total, exact, norm, diff, missing}` |
| `scores-baseui-combo.json` | react × utils 组合分数（每条声明在两个包中取较好的判定），已排序 |
| `excluded-baseui.json` / `excluded-hls.json` | 同名但没收进闭包的声明 `{file, line, names, bestSim}` |
| `vendor-top.json` | vendor.js 顶层语句表 |
| `patch/*.buildeq.patch` | 针对 npm 包根的 unified diff（`patch -p1`），只用于验证“剩下的差异都是构建等价”，不需要打进项目（见 REPORT §4） |
| `index/*.json` | 选定版本的 npm 声明索引 `{pkg, v, files, decls:[{file,line,names,A,N,B,…}]}`；其余 214 个版本的索引共 216MB，没有放进来，可以用 tools/index.mjs 重新生成 |
| `logs/` | 打分、比对、语义 diff 的输出（`sem-*.txt` 是逐 token 上下文，`shared-*.txt` 是共享对象分析）。原来的 `.log` 改名为 `.log.txt`，因为仓库会忽略 *.log |
| `tools/` | 脚本：fetch*.sh 下载 → pkgfiles.mjs 选入口 → index.mjs 建索引 → score.mjs 建闭包和打分 → combo.mjs、cmp.mjs、sem.mjs、storecheck.mjs、mapping.mjs → mkpatch.py 生成补丁 |

## 没放进来的文件
- `src-decls.json`（47MB，还原树全部顶层声明的 A/N/B 形状，超过 20MB）：可以用 score.mjs 重新生成
- `ref-index-3.0.16.js`（21MB，超过 20MB）：参照 bundle，就是 git `3fac8ea^` 的 reference/3.0.16 index-C4qF1HE0.js
- npm tarball、解压出来的包（`pkgs/`，1.9GB）、`tools/node_modules`、其余 214 个版本的索引

脚本里写死了路径 `/home/ubuntu/baseui-hls-analysis/`。要重跑的话，先把本目录复制到那里，然后在 tools/ 下执行 `npm ci`，再运行 fetch*.sh 下载 npm 包。
