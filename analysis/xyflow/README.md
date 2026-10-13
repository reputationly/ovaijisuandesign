# vendor.js 内联 xyflow 改动分析产物

只是分析产物，不参与构建。基线：`devin/1791701596-renderer-desource` @ `478cc70`；在 `12e8ef4` 上复跑，结果相同（`vendor.js` 第 1–7620 行和 `infra/from-vendor.js` 都没变）。

| 文件 | 内容 |
|---|---|
| `xyflow-vendor-analysis.md` | 分析报告：结论、规则、17 处行为改动、UI 门禁场景、无法确定的点 |
| `mapping.tsv` | 220 个 vendor 声明 → npm 包/文件/声明/行号/结论/规则 |
| `patches/@xyflow__system@0.0.76.patch`、`patches/@xyflow__react@12.10.2.patch` | 针对 npm dist（`dist/esm/index.js` 与 `index.mjs`）的补丁，在包根目录 `patch -p1` |
| `results/base/` | 补丁前逐声明比对结果：mapping.json（每个声明的状态、规则、首个差异路径）、summary.json |
| `results/patched/` | 打补丁后的比对结果：192 一致 + 29 无行为影响 + 0 行为差异 |
| `results/helper-check.json` | 内联进 dist 的 15 个 `infra/from-vendor.js` helper 与应用源码的 AST 对照（全部 same） |
| `results/port-report.json` | 补丁生成器的输出：内联了哪些 helper、新增了哪些 import |
| `tools/` | Babel AST 比对（`analyze.mjs`、`lib.mjs`、`rules.mjs`）与补丁生成（`port.mjs`）脚本；依赖见 `tools/package.json` |

## 复现
在仓库外一个工作目录里执行（`npm/` 下放解压好的 tarball，命名形如 `xyflow-system-0.0.76/package/...`）：

```bash
mkdir -p ~/xyflow-repro && cd ~/xyflow-repro && cp -r <仓库>/analysis/xyflow/tools . && cp tools/package.json . && npm install
mkdir -p npm && cd npm && for p in @xyflow/system@0.0.76 @xyflow/react@12.10.2 zustand@4.5.7 classcat@5.0.5; do d=$(echo $p | sed 's#^@##; s#/#-#; s#@#-#'); mkdir -p $d && npm pack $p --silent | xargs -I{} tar xzf {} -C $d; done; cd ..
REGION=800-7620 node tools/analyze.mjs <仓库>/app/renderer/src/vendor.js npm out-base
cp -r npm verify && (cd verify/xyflow-system-0.0.76/package && patch -p1 < <仓库>/analysis/xyflow/patches/@xyflow__system@0.0.76.patch) && (cd verify/xyflow-react-12.10.2/package && patch -p1 < <仓库>/analysis/xyflow/patches/@xyflow__react@12.10.2.patch)
cp <仓库>/analysis/xyflow/results/port-report.json verify/
HELPERS=verify/port-report.json FV=<仓库>/app/renderer/src/infra/from-vendor.js REGION=800-7620 node tools/analyze.mjs <仓库>/app/renderer/src/vendor.js verify out-verify
```
