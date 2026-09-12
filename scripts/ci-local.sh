#!/usr/bin/env bash
# 在本地跑一遍**和 CI 完全一样**的检查。
#
# ## 为什么需要它
#
# CI 从 9/10 之后连红七次我都没发现 —— 因为我本地跑的是
# `cargo test` + `bun test`,而 CI 还跑 `cargo fmt --check` 和
# `cargo clippy -D warnings`,那两个我从来没跑。
#
# 还踩过一个顺序坑：`clippy --fix` 改完的代码**不一定符合 fmt**,
# 所以必须 fmt → clippy → fmt 再验一遍。这个脚本按 CI 的顺序来。
#
# 另外 `mcp/src/tools.test.ts` 曾经读 `reference/`（gitignore 的目录）——
# 本地有、CI 没有，于是本地绿 CI 红。跑这个脚本时会提示怎么模拟。
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf "\n\033[1m▶ %s\033[0m\n" "$1"; }

step "cargo fmt --check"
cargo fmt --all -- --check

step "cargo clippy -D warnings"
cargo clippy -p gateway -p maas-media --all-targets -- -D warnings

step "cargo test"
cargo test -p gateway -p maas-media

step "mcp"
(cd mcp && bun run typecheck && bun test)

step "canvas-web"
(cd apps/canvas-web && bun run typecheck && bun test && bun run build)

step "spec（规格文档没被手改坏）"
python3 -c "import ast,pathlib; ast.parse(pathlib.Path('scripts/extract-mcp-tools.py').read_text())"
n=$(grep -cE '^\| `[a-z0-9_]+` \|' docs/mcp-tools.md)
[ "$n" = 58 ] || { echo "docs/mcp-tools.md 解析出 $n 个工具，应该是 58"; exit 1; }

printf "\n\033[32m全部通过。\033[0m\n"
printf "提示：CI 上没有 \033[1mreference/\033[0m（gitignore）。\n"
printf "      要模拟的话：mv reference /tmp/ && ./scripts/ci-local.sh; mv /tmp/reference .\n"
