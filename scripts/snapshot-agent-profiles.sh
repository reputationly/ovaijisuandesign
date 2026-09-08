#!/usr/bin/env bash
# 把官方的 agent 配置快照到 reference/（已 gitignore），当作稳定基线。
#
#   ./scripts/snapshot-agent-profiles.sh
#
# 为什么要快照而不是直接指向原处：
#   ~/.hub/.config-v2/ 会被应用按版本重刷，Resources/ 下那份会被应用升级
#   整包替换。基线要是会动的，`diff agent reference/...` 就没有意义了。
#
# reference/ 不进版本库 —— 那是 MiniMax 的专有文件，我们只读它当规格。
set -euo pipefail

APP="${MINIMAX_DESIGN_APP:-/Applications/MiniMax Design.app}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/reference"

FACTORY="$APP/Contents/Resources/agent-profiles/v2/config"   # 出厂模板
LIVE="$HOME/.hub/.config-v2"                                 # 运行时实际读的那份
OPENCODE_CFG="$APP/Contents/Resources/opencode/config"       # 另一套（contracts 更全）

[[ -d "$FACTORY" ]] || { echo "找不到 agent-profiles: $FACTORY" >&2; exit 1; }

snapshot() {
  local src="$1" name="$2"
  [[ -d "$src" ]] || { echo "  跳过 $name（不存在）"; return; }
  rm -rf "${DEST:?}/$name"
  mkdir -p "$DEST/$name"
  cp -R "$src/." "$DEST/$name/"
  printf "  %-18s %4d 个文件  %s\n" "$name" \
    "$(find "$DEST/$name" -type f | wc -l | tr -d ' ')" \
    "$(du -sh "$DEST/$name" | cut -f1)"
}

version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' \
  "$APP/Contents/Info.plist" 2>/dev/null || echo unknown)"

echo "MiniMax Design $version → $DEST"
snapshot "$FACTORY" "agent-profiles"
snapshot "$LIVE" "config-v2"
snapshot "$OPENCODE_CFG" "opencode-config"

cat > "$DEST/README.md" <<EOF
# reference

MiniMax Design **$version** 的官方配置快照，由
\`scripts/snapshot-agent-profiles.sh\` 生成。

**不进版本库。** 这是 MiniMax 的专有文件，我们只读它当规格：
接口事实提取到 \`docs/\`，行为差异用 \`diff\` 对照。

| 目录 | 来源 |
|---|---|
| \`agent-profiles/\` | \`<App>/Contents/Resources/agent-profiles/v2/config\`（出厂模板） |
| \`config-v2/\` | \`~/.hub/.config-v2\`（运行时实际读的，会被应用按版本重刷） |
| \`opencode-config/\` | \`<App>/Contents/Resources/opencode/config\`（另一套，contracts 更全） |

应用升级后重跑一次，\`git diff\` 看不出来变化 —— 得靠这个脚本重新快照再比。
EOF

echo
echo "应用升级后重跑一次。reference/ 不进版本库。"
