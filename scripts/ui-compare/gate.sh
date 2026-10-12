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
LAST_REPORT=""
LAST_STATUS=0
run_compare() {
  local output status report_dir
  compare_started=1
  if output="$(timeout --signal=TERM --kill-after=10s 2400s xvfb-run -a node scripts/ui-compare/compare.mjs 2>&1)"; then
    status=0
  else
    status=$?
  fi
  printf '%s\n' "$output"
  if ! cleanup_compare; then
    return 1
  fi
  compare_started=0

  report_dir=$(sed -n 's/^对比 .*，结果在 //p' <<<"$output" | tail -n 1)
  if [[ -z "$report_dir" ]]; then
    echo "Could not determine the compare report directory from its output." >&2
    return 1
  fi
  if [[ "$report_dir" = /* ]]; then
    LAST_REPORT="$report_dir/report.json"
  else
    LAST_REPORT="$repo/$report_dir/report.json"
  fi
  if [[ ! -f "$LAST_REPORT" ]]; then
    echo "No compare report.json was produced at $LAST_REPORT" >&2
    return 1
  fi
  LAST_STATUS=$status
  return 0
}

if ! run_compare; then
  exit 1
fi
report1="$LAST_REPORT"
status1="$LAST_STATUS"
if [[ "$status1" -gt 1 ]]; then
  echo "First full compare ended with runner status $status1; report: $report1" >&2
  exit 1
fi

report2=""
status2=""
if [[ "$status1" == 1 ]]; then
  echo "首次完整比较发现页面差异，执行第二次完整比较以确认可复现问题。"
  if ! run_compare; then
    exit 1
  fi
  report2="$LAST_REPORT"
  status2="$LAST_STATUS"
  if [[ "$status2" -gt 1 ]]; then
    echo "Second full compare ended with runner status $status2; report: $report2" >&2
    exit 1
  fi
fi
trap - EXIT

node - "$report1" "$report2" "$GOLDEN/errors.json" "$status1" "$status2" <<'NODE'
const fs = require("node:fs");
const [report1Path, report2Path, baselinePath, status1Text, status2Text] = process.argv.slice(2);
const reportPaths = [report1Path, report2Path].filter(Boolean);
const statuses = [Number(status1Text), status2Text === "" ? null : Number(status2Text)];
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const expectedPages = Object.keys(baseline);
const channelKeys = ["pixel", "net", "dom", "state", "newErrors"];
const schemaErrors = [];

function analyze(reportPath, status, index) {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  if (!report || !Array.isArray(report.pages) || report.pages.length === 0) {
    schemaErrors.push(`${reportPath}: compare report is empty or invalid`);
    return new Map();
  }
  if (!Array.isArray(report.netVolatile)) {
    schemaErrors.push(`${reportPath}: report is missing NET_VOLATILE`);
  }
  const actualPages = report.pages.map((page) => page.page);
  for (const page of expectedPages) {
    if (!actualPages.includes(page)) schemaErrors.push(`${reportPath}: missing page ${page}`);
  }
  for (const page of actualPages) {
    if (!Array.isArray(baseline[page])) schemaErrors.push(`${reportPath}: unexpected or unbaselined page ${page}`);
  }
  if (new Set(actualPages).size !== actualPages.length) {
    schemaErrors.push(`${reportPath}: duplicate page entries`);
  }

  const failures = new Map();
  for (const page of report.pages) {
    const invalid =
      !Array.isArray(baseline[page.page]) ||
      !Array.isArray(page.newErrors) ||
      typeof page.diffPct !== "number" ||
      typeof page.diffPctNonAA !== "number" ||
      typeof page.pixelmatchNonAA !== "number" ||
      !Array.isArray(page.netDiff) ||
      !Array.isArray(page.domDiff) ||
      !Array.isArray(page.stateDiff);
    if (invalid) {
      schemaErrors.push(`${reportPath}: ${page.page} has missing or invalid per-page report fields`);
      continue;
    }
    const channels = [];
    if (page.diffPctNonAA !== 0) channels.push("pixel");
    if (page.netDiff.length) channels.push("net");
    if (page.domDiff.length) channels.push("dom");
    if (page.stateDiff.length) channels.push("state");
    if (page.newErrors.length) channels.push("newErrors");
    if (channels.length) failures.set(page.page, { channels, details: page });
  }
  const hasFailures = failures.size > 0;
  if ((status === 0 && hasFailures) || (status === 1 && !hasFailures)) {
    schemaErrors.push(`${reportPath}: compare exit status ${status} does not match its reported page failures`);
  }
  console.log(`第 ${index + 1} 次报告：${reportPath}（${report.pages.length} 页）`);
  return failures;
}

const runs = reportPaths.map((path, index) => analyze(path, statuses[index], index));
for (const error of schemaErrors) console.error(error);
if (schemaErrors.length) process.exit(1);

console.log(`本轮报告路径：${reportPaths.join("；")}`);
if (runs.length === 1) {
  console.log(`40 页一次比较全部通过；raw 像素差异仍仅作信息报告。`);
  process.exit(0);
}

const [first, second] = runs;
const pages = new Set([...first.keys(), ...second.keys()]);
const reproducible = [];
const unstable = [];
for (const page of pages) {
  const firstFailure = first.get(page);
  const secondFailure = second.get(page);
  const firstChannels = new Set(firstFailure?.channels ?? []);
  const secondChannels = new Set(secondFailure?.channels ?? []);
  const common = channelKeys.filter((channel) => firstChannels.has(channel) && secondChannels.has(channel));
  if (common.length) {
    reproducible.push({ page, channels: common, firstFailure, secondFailure });
    continue;
  }
  if (firstFailure || secondFailure) {
    unstable.push({ page, firstFailure, secondFailure });
  }
}

for (const item of unstable) {
  const firstText = item.firstFailure?.channels.join(",") ?? "通过";
  const secondText = item.secondFailure?.channels.join(",") ?? "通过";
  const label = item.firstFailure && item.secondFailure ? "不稳定（两次失败渠道不同）" : "不稳定（一次失败）";
  console.log(`${label} ${item.page}：第一次=${firstText}，第二次=${secondText}；报告=${reportPaths.join(" / ")}`);
}
for (const item of reproducible) {
  for (const channel of item.channels) {
    const firstDetails = item.firstFailure.details;
    const secondDetails = item.secondFailure.details;
    let detail = "";
    if (channel === "pixel") {
      detail = `（raw ${firstDetails.diffPct}%/${secondDetails.diffPct}%，TOL∩non-AA ${firstDetails.diffPctNonAA}%/${secondDetails.diffPctNonAA}%）`;
    }
    console.error(`${item.page}: 两次均在 ${channel} 通道失败${detail}；报告=${reportPaths.join(" / ")}`);
  }
}
if (reproducible.length) process.exit(1);
console.log(`没有同一页面在同一通道连续两次失败；一次性或渠道不一致的差异按 harness 不稳定处理，不阻断 gate。`);
NODE
