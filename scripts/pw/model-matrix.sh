#!/bin/bash
# 模型 × 思考档位 矩阵测试：每格重启 App（改 OV_REASONING_EFFORT）→ 跑同一条规划型提示词 → 记指标
set -u
cd "$(dirname "$0")/../.." || exit 1
OUT=${OUT:-/tmp/matrix.tsv}
: > "$OUT"
MODELS=${MODELS:-deepseek-v4-1-flash,glm-5.3-flash-w4a8,minimax-m3.1-flash,qwen3.8-flash-fp8}
EFFORTS=${EFFORTS:-none,high}
PROMPT=${PROMPT:-"给我一条 15 秒竖屏 9:16 小红书 KOC 视频的执行方案（产品：浅蓝色 RTIC 30oz 随行杯，翻盖饮口、侧把手、陶瓷内衬）：分几段、每段几秒、每段逐字口播，以及你打算用哪些工具。只输出方案，不要生成任何素材。"}

restart_app() {
  local effort="$1"
  pkill -f "tmp-run-auto" 2>/dev/null
  local pid; pid=$(pgrep -f "remote-debugging-port=9435" | head -1)
  [ -n "$pid" ] && kill -TERM "$pid"
  sleep 6
  env -u ELECTRON_RUN_AS_NODE -u OV_USER_DATA_DIR -u HILO_DATA_DIR -u OV_CONFIG_PATH \
      -u OV_DEV_OPEN_WORKSPACES -u HILO_PROJECT_ARCHITECTURE -u XDG_DATA_HOME \
      OV_REASONING_EFFORT="$effort" \
      nohup app/desktop/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron app/desktop \
      --remote-debugging-port=9435 > "/tmp/dev-matrix-$effort.log" 2>&1 &
  disown
  for _ in $(seq 1 40); do sleep 2; curl -s --max-time 2 http://127.0.0.1:9435/json/list >/dev/null && break; done
  sleep 6
}

for effort in ${EFFORTS//,/ }; do
  for model in ${MODELS//,/ }; do
    echo "=== effort=$effort model=$model ===" | tee -a "$OUT"
    restart_app "$effort"
    MODEL="$model" PROMPT="$PROMPT" TIMEOUT_MS=420000 timeout 500 node scripts/pw/tmp-run-auto.mjs > "/tmp/matrix-run.log" 2>&1
    local_ok=$(grep -c "✓" /tmp/matrix-run.log || true)
    local_err=$(grep -c "✖" /tmp/matrix-run.log || true)
    local_code=$(grep -cE "✓ task|code-agent" /tmp/matrix-run.log || true)
    local_bash=$(grep -cE "✓ bash|✖ bash" /tmp/matrix-run.log || true)
    local_q=$(grep -c "？" /tmp/matrix-run.log || true)
    local_secs=$(grep -oE "结束：用 [0-9]+s" /tmp/matrix-run.log | grep -oE "[0-9]+" | head -1)
    printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" "$effort" "$model" "${local_secs:-NA}" "$local_ok" "$local_err" "$local_bash" "$local_code" "$local_q" >> "$OUT"
    echo "effort=$effort model=$model 用时=${local_secs:-NA}s 成功=$local_ok 失败=$local_err bash=$local_bash code=$local_code 反问=$local_q" | tee -a "$OUT"
  done
done
echo "DONE" >> "$OUT"
