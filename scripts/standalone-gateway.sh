#!/usr/bin/env bash
# 独立启动 MiniMax Design 的本地 gateway，不经过 Electron 主进程。
#
#   ./scripts/standalone-gateway.sh <工作区目录> [端口]
#
# 详见 docs/standalone-gateway.md。
set -euo pipefail

APP="${MINIMAX_DESIGN_APP:-/Applications/MiniMax Design.app}"
WS="${1:-}"
PORT="${2:-8099}"

if [[ -z "$WS" ]]; then
  echo "用法: $0 <工作区目录> [端口]" >&2
  echo "工作区就是 MiniMax Design 的项目目录（里面有 .hilo/）" >&2
  exit 1
fi

ELECTRON="$APP/Contents/MacOS/MiniMax Design"
# 装了 media 挂钩的话入口被换成包装脚本，原始入口在备份里。
ENTRY="$APP/Contents/Resources/gateway/dist/main.js"
ORIGINAL="$APP/Contents/Resources/gateway/dist/main.dpp-original.js"
[[ -f "$ORIGINAL" ]] && ENTRY="$ORIGINAL"

[[ -x "$ELECTRON" ]] || { echo "找不到应用: $APP" >&2; exit 1; }
[[ -f "$ENTRY" ]]    || { echo "找不到 gateway 入口: $ENTRY" >&2; exit 1; }

mkdir -p "$WS"
WS="$(cd "$WS" && pwd)"

cat >&2 <<EOF
gateway   $ENTRY
工作区    $WS
监听      http://127.0.0.1:$PORT

注意：gateway 会带着你的登录态同步 skill 市场，并按远端版本覆写
      ~/.hub/skills/（可能是降级）。删除退化为永久删除，不进废纸篓。
EOF

# NODE_ENV 不能是 production：那样没有主进程桥时 TrashService 会拒绝所有删除。
# 用 exec 让 Ctrl-C 直接送到 gateway。
exec env \
  ELECTRON_RUN_AS_NODE=1 \
  WORKSPACE_DIR="$WS" \
  OUTPUT_DIR="$WS" \
  HILO_GATEWAY_ROLE=workspace \
  HILO_GATEWAY_HOST=127.0.0.1 \
  PORT="$PORT" \
  NODE_ENV=development \
  HILO_RELEASE_REGION="${HILO_RELEASE_REGION:-domestic}" \
  HILO_RELEASE_CHANNEL="${HILO_RELEASE_CHANNEL:-prod}" \
  LOG_PRETTY=1 \
  "$ELECTRON" "$ENTRY"
