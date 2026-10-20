#!/usr/bin/env bash
# 清理门禁跑完后残留的进程（第 207 轮）。
#
# 为什么需要：每跑一次 ui-compare 会起 Electron × 若干、每个工作区一个 gateway、
# 外加 opencode serve。跑 40 屏会起几十个进程。之前用「只匹配第一个」的写法清理，
# 累积到 73 个残留，会持续吃内存和 CPU。
#
# 用法：bash scripts/ui-compare/cleanup.sh
set -u
PATTERNS=(
  "node_modules/\.pnpm/electron"
  "app/gateway/dist/main\.js"
  "opencode-v[0-9.]*/opencode"
  "/MacOS/Electron"
)
for pat in "${PATTERNS[@]}"; do
  pids=$(ps -Ao pid,args | grep -E "$pat" | grep -v grep | awk '{print $1}')
  [ -n "$pids" ] && echo "$pids" | xargs -r kill -9 2>/dev/null
done
sleep 2
left=$(ps -Ao args | grep -cE "node_modules/\.pnpm/electron|app/gateway/dist/main\.js|opencode-v[0-9.]*/opencode")
echo "残留: $left"
exit 0
