# 工具说明

依赖：`npm i` 安装 `@babel/parser @babel/traverse @babel/generator @babel/types diff`（与 `analysis/baseui-hls/tools` 相同）。路径常量指向分析机：

- `/home/ubuntu/wt-desource`：被分析分支的只读 worktree，已执行 `pnpm install`
- `/home/ubuntu/ana/pkgs/<pkg>@<ver>/package`：npm 包解压目录
- `/home/ubuntu/ana/sddeps`：`npm i streamdown@2.5.0 remend@1.3.0` 的依赖树

| 脚本 | 作用 | 产物 |
|---|---|---|
| `xcanon.mjs` | 模块图 + 声明形状（α 归一化，模块级引用记为 `$F<i>` + 目标 key，解析 import/re-export/namespace） | — |
| `xmatch.mjs` | 从种子出发按引用位置一一配对 helper，配对后再比较形状；记录冲突 | — |
| `t1-s2.mjs` | s2.js 对 remend / streamdown 各版本 | `s2/*.json` |
| `t2-streamdown.mjs` | chat/streamdown.jsx 闭包对 streamdown 各版本 | `streamdown/*.json` |
| `users.mjs` | 闭包内声明被闭包外的哪些声明/语句引用 | `*/…-closure-users.json` |
| `showdiff.mjs` | 打印 diff 配对的差异片段（引用已按配对替换） | stdout |
| `t3-index.mjs` | src/npm 两侧的顶层函数/类形状哈希索引（worker 并行） | `scan/*-index.jsonl.gz` |
| `t3-match.mjs` | 哈希匹配 + 短/通用声明的相邻上下文规则 | `scan/matches-*.json`、`summary-by-package.json` |
| `gen-tables.mjs` | 生成 `s2/DECLARATIONS.md`、`streamdown/DECLARATIONS.md`、`scan/TABLE.md` | md |
