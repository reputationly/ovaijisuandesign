#!/usr/bin/env bash
# 冒烟：起整个 Electron 应用，打开一个工作区，用假 opencode 验证：
# 主进程 → opencode / MCP / 插件这一路的工作区身份都接上了、MCP 和插件回连 gateway 的写请求能过、
# 渲染层打开工作区页后发的写请求和 WS 带着身份、仓库自带的 agent 配置能加载、自带技能铺好了。
#
#   bash scripts/smoke/electron.sh
#
# 需要：构建好的 gateway / mcp-tools / opencode-plugin-hilo（`pnpm turbo run build`）、已下载的 Electron。
# Linux 无显示时要 xvfb-run；macOS 直接起窗口。agent 配置默认用仓库的 assets/agent-profiles，
# 设了 OV_AGENT_PROFILE_DIR 就用它。
set -euo pipefail

repo="$(cd "$(dirname "$0")/../.." && pwd)"
tmp="$(mktemp -d "${TMPDIR:-/tmp}/ov-electron-smoke-XXXXXX")"
mkdir -p "$tmp/ud" "$tmp/data" "$tmp/ws" "$tmp/dump"
LIMIT_SECONDS="${SMOKE_LIMIT_SECONDS:-90}"
DEBUG_PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')"

# 主进程会拒绝不到 1MB 的 opencode（防下载不完整），给假的补点体积。
cp "$repo/scripts/smoke/fake-opencode.mjs" "$tmp/opencode"
python3 -c "open('$tmp/opencode','a').write('\n//' + 'x' * 1100000 + '\n')"
chmod +x "$tmp/opencode"

launcher=()
if [[ "$(uname)" != "Darwin" && -z "${DISPLAY:-}" ]] && command -v xvfb-run >/dev/null; then launcher=(xvfb-run -a); fi

# 放进单独的进程组：结束时整组杀掉，Electron 拉起的 gateway / opencode / vite 一个都不留。
set -m
(
  cd "$repo/app/desktop"
  export OPENCODE_BIN="$tmp/opencode" FAKE_OC_DUMP_DIR="$tmp/dump" \
    OV_USER_DATA_DIR="$tmp/ud" HILO_DATA_DIR="$tmp/data" OV_SKIP_LEGACY_MIGRATION=1 \
    OV_DEV_OPEN_WORKSPACES="$tmp/ws" OV_CONFIG_PATH="$tmp/config.json"
  [[ -n "${OV_AGENT_PROFILE_DIR:-}" ]] && export OV_AGENT_PROFILE_DIR
  exec ${launcher[@]+"${launcher[@]}"} npx electron-vite dev --noSandbox -- --no-sandbox --remote-debugging-port="$DEBUG_PORT"
) >"$tmp/electron.log" 2>&1 &
pgid=$!
set +m

stop() {
  kill -TERM -- "-$pgid" 2>/dev/null || true
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    pgrep -g "$pgid" >/dev/null 2>&1 || return 0
    sleep 0.5
  done
  kill -KILL -- "-$pgid" 2>/dev/null || true
  sleep 0.5
}
trap stop EXIT

# 等假 opencode 写出结果（它起来后 0.5 秒就开始调 MCP 和插件），最多 LIMIT_SECONDS 秒。
dump=""
for ((i = 0; i < LIMIT_SECONDS * 2; i++)); do
  dump="$(ls "$tmp"/dump/*.json 2>/dev/null | head -1 || true)"
  [[ -n "$dump" ]] && break
  kill -0 "$pgid" 2>/dev/null || break
  sleep 0.5
done
renderer="{}"
if [[ -n "$dump" ]]; then
  renderer="$(node "$repo/scripts/smoke/renderer-check.mjs" "$DEBUG_PORT" "$tmp/ws" 2>>"$tmp/electron.log" || echo '{}')"
fi
stop
trap - EXIT
leftover="$(pgrep -g "$pgid" 2>/dev/null || true)"

if [[ -z "$dump" ]]; then
  echo "失败：假 opencode 没有写出结果，日志在 $tmp/electron.log"
  exit 1
fi
cat "$dump"; echo
LEFTOVER="$leftover" RENDERER="$renderer" python3 - "$dump" "$tmp" <<'EOF'
import json, os, sys
d = json.load(open(sys.argv[1]))
tmp = sys.argv[2]
log = open(os.path.join(tmp, "electron.log"), encoding="utf8", errors="replace").read()
checks = [
    ("opencode 拿到工作区身份", all(d["env"].get(k) for k in ["HILO_WORKSPACE_CLAIM", "HILO_WORKSPACE_INSTANCE_ID", "HILO_WORKSPACE_GENERATION"])),
    ("MCP 环境里的身份和 opencode 的一致", all(d["mcpEnvironment"].get(k) == d["env"][k] for k in d["env"])),
    ("MCP 写画布成功", '"ok":true' in (d["mcp"] or "")),
    ("插件回连 gateway 成功", d["plugin"] == "tool allowed"),
    ("文件落进工作区", os.path.exists(os.path.join(tmp, "ws", "电子冒烟.md"))),
    ("主进程推 opencode 地址没被拒", "推送 opencode 地址失败" not in log),
    ("自带技能铺到了数据目录", os.path.exists(os.path.join(tmp, "data", "skills", "brand-ad", "SKILL.md"))),
    ("结束后没有残留进程", not os.environ.get("LEFTOVER")),
]
r = json.loads(os.environ.get("RENDERER") or "{}")
checks += [
    ("渲染层绑定到工作区并拿到身份", r.get("bound") is True),
    ("渲染层画布保存（api.ts）没被拒", r.get("canvasWrite") is True),
    ("渲染层 gatewayFetch 写入没被拒", r.get("gatewayFetchWrite") is True),
    ("不带身份的写请求被拒（428）", r.get("noIdentityRejected") is True),
    ("渲染层 WS 带身份保持连接", r.get("wsStaysOpen") is True),
    ("过期身份的 WS 被关掉（1008）", r.get("wrongWsClosed") is True),
]
if not os.environ.get("OV_AGENT_PROFILE_DIR"):
    checks.append(("用的是仓库自带的 agent 配置", "找不到 agent 配置" not in log and "agent 配置不完整" not in log))
for name, ok in checks:
    print(("PASS  " if ok else "FAIL  ") + name)
sys.exit(0 if all(ok for _, ok in checks) else 1)
EOF
