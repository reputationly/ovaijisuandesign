#!/bin/bash
cd "$(dirname "$0")/../.." || exit 1
# 等当前 E2E 跑完（日志出现"结束："）
for _ in $(seq 1 200); do grep -q "结束：" /tmp/e2e-ds.log 2>/dev/null && break; sleep 20; done
OUT=/tmp/sweep-qwen-glm.tsv MODELS=qwen3.8-flash-fp8,glm-5.3-flash-w4a8 \
  EFFORTS=none,minimal,low,medium,high,xhigh,max \
  bash scripts/pw/model-matrix.sh
