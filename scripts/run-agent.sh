#!/usr/bin/env bash
# 用官方的 agent 配置 + 我们的 MCP 工具跑 opencode。
#
#   ./scripts/run-agent.sh [工作区目录] [-- opencode 的参数…]
#
# 这是路线第 5 步的验收方式：**用他们的提示词，跑我们的工具**。
#
# 配置在临时目录里现拼，不落进版本库 —— 里面有 api_key，而 agent/ 下只放
# 我们自己写的覆盖文件。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="${MINIMAX_DESIGN_APP:-/Applications/MiniMax Design.app}"
WS="${1:-$PWD}"
[[ $# -gt 0 ]] && shift
[[ "${1:-}" == "--" ]] && shift

CFG="${OVGW_CONFIG:-$HOME/Library/Application Support/ovaijisuandesign/config.json}"
REF="$ROOT/reference/agent-profiles"
# 官方的 opencode 二进制。自己 build 的也行，路径用 OPENCODE_BIN 覆盖。
OPENCODE="${OPENCODE_BIN:-$APP/Contents/Resources/opencode/opencode}"

[[ -f "$CFG" ]]      || { echo "找不到 gateway 配置: $CFG" >&2; exit 1; }
[[ -d "$REF" ]]      || { echo "还没快照官方配置，先跑 ./scripts/snapshot-agent-profiles.sh" >&2; exit 1; }
[[ -x "$OPENCODE" ]] || { echo "找不到 opencode: $OPENCODE" >&2; exit 1; }

command -v jq >/dev/null || { echo "需要 jq" >&2; exit 1; }

BASE_URL="$(jq -r '.platform.base_url' "$CFG")"
API_KEY="$(jq -r '.platform.api_key' "$CFG")"
MODEL="$(jq -r '.platform.chat_model' "$CFG")"
PORT="$(jq -r '.port // 8100' "$CFG")"

STAGE="$(mktemp -d "${TMPDIR:-/tmp}/ovaijisuandesign-agent.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT

# 官方那套 agent 配置当底，我们自己写的覆盖同名文件。
cp -R "$REF/." "$STAGE/"
for d in agents contracts skills; do
  [[ -d "$ROOT/agent/$d" ]] && cp -R "$ROOT/agent/$d/." "$STAGE/$d/" 2>/dev/null || true
done

# 官方 base.json 的 agent / default_agent / tools 原样合过来 ——
# 这一步是整件事的重点：**用他们的提示词，跑我们的工具**。
#
# 唯独不带 `plugin`：那是他们的 session-header.ts，依赖他们的运行时注入。
#
# provider 的形状取自 DesignPlusPlus 里那份实测跑通的：
#   limit.input 用 context - output，OpenCode 拿它做上下文裁剪的水位线；
#   报大了会在长会话里直接撞上游限制。
jq -n --slurpfile official "$REF/base.json" \
  --arg base "$BASE_URL" --arg key "$API_KEY" --arg model "$MODEL" \
  --arg gw "http://127.0.0.1:$PORT" --arg mcp "$ROOT/mcp/src/main.ts" \
  '($official[0] | { agent, default_agent, tools }) + {
    "$schema": "https://opencode.ai/schema.json",
    provider: {
      maas: {
        name: "maas",
        npm: "@ai-sdk/openai",
        options: { baseURL: $base, apiKey: $key },
        models: {
          ($model): {
            name: $model,
            attachment: true, reasoning: true, tool_call: true, temperature: true,
            modalities: { input: ["text","image"], output: ["text"] },
            limit: { context: 128000, input: 96000, output: 32000 }
          }
        }
      }
    },
    model: ("maas/" + $model),
    # server 名必须是 hub —— opencode 按它给工具加前缀，官方 agent 配置
    # 里那 120 处调用写的都是 hub_*。
    mcp: { hub: { type: "local", command: ["bun", $mcp], environment: { GATEWAY_URL: $gw } } },
    experimental: { mcp_timeout: 3600000 }
  }' > "$STAGE/opencode.json"

cat >&2 <<EOF
opencode    $OPENCODE
模型        maas/$MODEL
gateway     http://127.0.0.1:$PORT
工作区      $WS
配置        $STAGE/opencode.json（临时，退出即删）
agent         $(jq -r .default_agent "$REF/base.json")（官方提示词 + $ROOT/agent 的覆盖）
EOF

cd "$WS"
# CONFIG_DIR 决定 opencode 从哪扫 `{agent,agents}/**/*.md`（见
# packages/opencode/src/config/agent.ts）—— 官方那批 agent 提示词就在里面。
exec env \
  OPENCODE_CONFIG="$STAGE/opencode.json" \
  OPENCODE_CONFIG_DIR="$STAGE" \
  "$OPENCODE" "$@"
