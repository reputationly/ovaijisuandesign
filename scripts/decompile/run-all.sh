#!/usr/bin/env bash
# 从官方渲染层主 bundle 抽出官方代码：解析 → 名字归类 → 内容核对 → 按"只能用库导出名"收敛 → 抽取 + JSX 还原。
#   bash run-all.sh [bundle.js]
set -euo pipefail
cd "$(dirname "$0")"
B="${1:-../../reference/3.0.16/app/out/renderer/assets/index-C4qF1HE0.js}"
N="node --max-old-space-size=12288"
$N 01-toplevel.mjs "$B" toplevel.json
$N 02-classify.mjs
$N 02b-verify.mjs "$B"
# 两条收敛规则交替跑到不再变化：
#   05：官方语句用了库的内部（未导出）名字 → 它是库代码
#   06：被库代码引用的官方语句 → 它是库代码
for round in $(seq 1 20); do
  $N 04-extract.mjs "$B" out >/dev/null
  r1=$(node 05-refine.mjs)
  $N 04-extract.mjs "$B" out >/dev/null
  r2=$(FIX=1 $N 06-check.mjs "$B" | tail -1)
  echo "round $round: $r1 / $r2"
  [[ "$r1" == *": 0" && "$r2" == *": 0" ]] && break
done
$N 04-extract.mjs "$B" out
npx prettier --parser babel --print-width 120 out/app.jsx > out/app.pretty.jsx 2>/dev/null
wc -l out/app.pretty.jsx
