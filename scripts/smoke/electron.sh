#!/usr/bin/env bash
# 冒烟：在 xvfb 里起整个 Electron 应用，打开一个工作区，用假 opencode 验证主进程 → opencode / MCP / 插件
# 这一路的工作区身份都接上了，MCP 和插件回连 gateway 的写请求能过。
#
#   bash scripts/smoke/electron.sh
#
# 需要：xvfb-run、已下载的 Electron、构建好的 gateway / mcp-tools / opencode-plugin-hilo。
# agent 配置：有 OV_AGENT_PROFILE_DIR 就用它，否则从 wip/m8-agent-profiles 分支导出一份（M8 合入前主线上没有）。
set -euo pipefail

repo="$(cd "$(dirname "$0")/../.." && pwd)"
tmp="$(mktemp -d -t ov-electron-smoke-XXXX)"
mkdir -p "$tmp/ud" "$tmp/data" "$tmp/ws" "$tmp/dump"

# 主进程会拒绝不到 1MB 的 opencode（防下载不完整），给假的补点体积。
cp "$repo/scripts/smoke/fake-opencode.mjs" "$tmp/opencode"
python3 -c "open('$tmp/opencode','a').write('\n//' + 'x' * 1100000 + '\n')"
chmod +x "$tmp/opencode"

profile="${OV_AGENT_PROFILE_DIR:-}"
if [[ -z "$profile" ]]; then
  git -C "$repo" fetch -q origin wip/m8-agent-profiles
  mkdir -p "$tmp/profile-src" "$tmp/profile"
  git -C "$repo" archive origin/wip/m8-agent-profiles .opencode-v2 config/opencode-v2 | tar -x -C "$tmp/profile-src"
  cp -r "$tmp/profile-src/.opencode-v2/." "$tmp/profile/"
  cp "$tmp/profile-src/config/opencode-v2/"*.json "$tmp/profile/"
  profile="$tmp/profile"
fi

cd "$repo/app/desktop"
OPENCODE_BIN="$tmp/opencode" FAKE_OC_DUMP_DIR="$tmp/dump" OV_AGENT_PROFILE_DIR="$profile" \
OV_USER_DATA_DIR="$tmp/ud" HILO_DATA_DIR="$tmp/data" OV_SKIP_LEGACY_MIGRATION=1 \
OV_DEV_OPEN_WORKSPACES="$tmp/ws" OV_CONFIG_PATH="$tmp/config.json" \
  timeout 60 xvfb-run -a npx electron-vite dev --noSandbox -- --no-sandbox >"$tmp/electron.log" 2>&1 || true

dump="$(ls "$tmp"/dump/*.json 2>/dev/null | head -1 || true)"
if [[ -z "$dump" ]]; then
  echo "失败：假 opencode 没有被拉起来，日志在 $tmp/electron.log"
  exit 1
fi
cat "$dump"
python3 - "$dump" "$tmp" <<'EOF'
import json, os, sys
d = json.load(open(sys.argv[1]))
tmp = sys.argv[2]
checks = [
    ("opencode 拿到工作区身份", all(d["env"].get(k) for k in ["HILO_WORKSPACE_CLAIM", "HILO_WORKSPACE_INSTANCE_ID", "HILO_WORKSPACE_GENERATION"])),
    ("MCP 环境里的身份和 opencode 的一致", all(d["mcpEnvironment"].get(k) == d["env"][k] for k in d["env"])),
    ("MCP 写画布成功", '"ok":true' in (d["mcp"] or "")),
    ("插件回连 gateway 成功", d["plugin"] == "tool allowed"),
    ("文件落进工作区", os.path.exists(os.path.join(tmp, "ws", "电子冒烟.md"))),
]
log = open(os.path.join(tmp, "electron.log"), encoding="utf8", errors="replace").read()
checks.append(("主进程推 opencode 地址没被拒", "推送 opencode 地址失败" not in log))
for name, ok in checks:
    print(("PASS  " if ok else "FAIL  ") + name)
sys.exit(0 if all(ok for _, ok in checks) else 1)
EOF
