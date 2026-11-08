#!/bin/bash
# 等第一轮矩阵跑完，再对深挖模型做思考档位扫描（none..max）
cd "$(dirname "$0")/../.." || exit 1
for _ in $(seq 1 120); do grep -q "^DONE$" /tmp/matrix.tsv 2>/dev/null && break; sleep 30; done
OUT=/tmp/effort.tsv MODELS=${SWEEP_MODELS:-deepseek-v4-1-flash,minimax-m3.1-flash} \
  EFFORTS=${SWEEP_EFFORTS:-minimal,low,medium,xhigh,max} \
  bash scripts/pw/model-matrix.sh
