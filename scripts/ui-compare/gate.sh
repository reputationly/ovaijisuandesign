#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if (( $# > 1 )); then
  echo "Usage: $0 [golden-directory]" >&2
  exit 2
fi
source "$HOME/.nvm/nvm.sh"
cd "$repo"
golden="${1:-${GOLDEN:-$repo/.probe/ui-golden}}"
[[ "$golden" = /* ]] || golden="$repo/$golden"
export GOLDEN="$golden"
export ELECTRON_DISABLE_SANDBOX=1
export ELECTRON_OVERRIDE_DIST_PATH="$HOME/ov-electron-dist"
export OPENCODE_BIN="${OPENCODE_BIN:-$HOME/.cache/opencode-v1.18.18/opencode}"
unset ONLY

if [[ ! -f "$GOLDEN/errors.json" ]]; then
  echo "Missing per-page console-error baseline: $GOLDEN/errors.json" >&2
  exit 1
fi
if [[ ! -x "$OPENCODE_BIN" ]]; then
  echo "OpenCode executable not found: $OPENCODE_BIN" >&2
  exit 1
fi

if [[ ! -f scripts/ui-compare/fixture/config.json ]]; then
  node -e 'require("node:fs").writeFileSync("scripts/ui-compare/fixture/config.json", JSON.stringify({ platform: { api_key: "ui-compare-placeholder" } }, null, 2) + "\n")'
fi

listener_pids() {
  ss -ltnp 'sport = :9360' |
    rg -o 'pid=[0-9]+' |
    cut -d= -f2 |
    sort -u
}

compare_started=0
cleanup_compare() {
  [[ "$compare_started" == 1 ]] || return 0
  local pid pgid
  local -a pids pgids remaining
  mapfile -t pids < <(listener_pids)
  pgids=()
  for pid in "${pids[@]}"; do
    pgid=$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ')
    if [[ "$pgid" =~ ^[0-9]+$ && "$pgid" != "$$" ]] &&
      [[ ! " ${pgids[*]} " =~ " $pgid " ]]; then
      pgids+=("$pgid")
      kill -TERM -- "-$pgid" 2>/dev/null || true
    fi
    kill -TERM "$pid" 2>/dev/null || true
  done
  for attempt in {1..30}; do
    mapfile -t remaining < <(listener_pids)
    ((${#remaining[@]} == 0)) && break
    sleep 0.2
  done
  if ((${#remaining[@]})); then
    for pid in "${remaining[@]}"; do
      kill -KILL "$pid" 2>/dev/null || true
    done
    for pgid in "${pgids[@]}"; do
      kill -KILL -- "-$pgid" 2>/dev/null || true
    done
    for attempt in {1..10}; do
      mapfile -t remaining < <(listener_pids)
      ((${#remaining[@]} == 0)) && break
      sleep 0.2
    done
  fi
  if ((${#remaining[@]})) || ss -ltn 'sport = :9360' | rg -q LISTEN; then
    echo "Could not stop compare services on port 9360: ${remaining[*]:-unknown listener}" >&2
    return 1
  fi
}
if ss -ltn 'sport = :9360' | rg -q LISTEN; then
  echo "Debug port 9360 is already occupied; stop the existing compare before running the gate." >&2
  exit 1
fi
trap cleanup_compare EXIT

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  pnpm turbo run build
fi
if [[ "${SKIP_CHECK_UNDEF:-0}" != "1" ]]; then
  node scripts/desource/check-undef.mjs
fi
compare_started=1
if ! output="$(timeout --signal=TERM --kill-after=10s 900s xvfb-run -a node scripts/ui-compare/compare.mjs 2>&1)"; then
  printf '%s\n' "$output" >&2
  exit 1
fi
printf '%s\n' "$output"
if ! cleanup_compare; then
  exit 1
fi
compare_started=0
trap - EXIT

report_dir=$(sed -n 's/^对比 .*，结果在 //p' <<<"$output" | tail -n 1)
if [[ -z "$report_dir" ]]; then
  echo "Could not determine the compare report directory from its output." >&2
  exit 1
fi
report="$repo/$report_dir/report.json"
if [[ ! -f "$report" ]]; then
  echo "No compare report.json was produced at $report" >&2
  exit 1
fi

node - "$report" "$GOLDEN/errors.json" <<'NODE'
const fs = require("node:fs");
const report = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const baseline = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
if (!report || !Array.isArray(report.pages) || report.pages.length === 0) {
  console.error("Compare report is empty or invalid.");
  process.exit(1);
}
if (!Array.isArray(report.netVolatile)) {
  console.error("Compare report is missing the NET_VOLATILE exclusion list.");
  process.exit(1);
}
const pages = report.pages;
const expectedPages = Object.keys(baseline);
const actualPages = pages.map((page) => page.page);
const missingPages = expectedPages.filter((page) => !actualPages.includes(page));
const duplicatePages = actualPages.filter((page, index) => actualPages.indexOf(page) !== index);
for (const page of missingPages) console.error(`${page}: missing from compare report`);
for (const page of duplicatePages) console.error(`${page}: duplicated in compare report`);
const invalid = pages.filter((page) =>
  !Array.isArray(baseline[page.page]) ||
  !Array.isArray(page.newErrors) ||
  typeof page.diffPct !== "number" ||
  !Array.isArray(page.netDiff) ||
  !Array.isArray(page.domDiff) ||
  !Array.isArray(page.stateDiff)
);
for (const page of invalid) {
  console.error(`${page.page}: missing or invalid per-page console-error baseline/report`);
}
const pixelFailures = pages.filter((page) => page.diffPct !== 0);
for (const page of pixelFailures) {
  console.error(`${page.page}: ${page.diffPct}% (expected 0.000%)`);
}
const errorFailures = pages.filter((page) => Array.isArray(page.newErrors) && page.newErrors.length > 0);
for (const page of errorFailures) {
  for (const error of page.newErrors) console.error(`${page.page}: new console error: ${error}`);
}
const channelFailures = pages.filter((page) =>
  ["netDiff", "domDiff", "stateDiff"].some((key) => page[key]?.length > 0)
);
for (const page of channelFailures) {
  console.error(`${page.page}: network/DOM/state diff present`);
}
if (missingPages.length || duplicatePages.length || invalid.length || pixelFailures.length || errorFailures.length || channelFailures.length) process.exit(1);
console.log(`All ${pages.length} pages match (0.000%) with empty network, DOM and state diffs and no console errors beyond the baseline. Report: ${process.argv[2]}`);
NODE
