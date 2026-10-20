#!/usr/bin/env bash
# 清理门禁跑完后残留的进程（第 207 轮，第 210 轮收窄）。
#
# **必须限定在本仓库路径内**：宽模式（如 `node_modules/\.pnpm/electron`）会误杀
# 宿主自己的 Electron（DeepSeek Harness 也是 Electron），导致正在跑的 shell 被 SIGKILL。
# 所以每条匹配都带上仓库绝对路径前缀。
#
# 用法：bash scripts/ui-compare/cleanup.sh
set -u
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PATTERNS=(
  "${REPO}/app/gateway/dist/main.js"
  "${REPO}/node_modules/.pnpm/electron"
  "${REPO}/app/renderer/node_modules/.pnpm/electron"
  "${REPO}/app/desktop/node_modules/.pnpm/electron"
  "${REPO}/ud"
)
for pat in "${PATTERNS[@]}"; do
  pids=$(ps -Ao pid,args | grep -F "$pat" | grep -v grep | awk '{print $1}')
  [ -n "$pids" ] && echo "$pids" | xargs -r kill -9 2>/dev/null
done
# opencode serve 是门禁起的（官方 app 的不会被匹配，因为路径在 ~/.cache/opencode-v*/）
pids=$(ps -Ao pid,args | grep -F "$HOME/.cache/opencode-v" | grep -v grep | awk '{print $1}')
[ -n "$pids" ] && echo "$pids" | xargs -r kill -9 2>/dev/null
sleep 2
left=$(ps -Ao args | grep -F -e "${REPO}/app/gateway/dist/main.js" -e "${REPO}/node_modules/.pnpm/electron" | grep -vc grep)
echo "残留: $left"
