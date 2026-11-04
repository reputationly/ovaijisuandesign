#!/usr/bin/env python3
"""对比两个 App（MiniMax Design 参照 / 蒜狸小助手）里同一类会话的每一步。

数据源都是 opencode 的 sqlite：`session` / `part` 两张表，`part.data` 是 JSON，
里面 `type=tool` 的条目带 `tool` 名、`state.input`（工具入参）和 `state.output`（工具结果），
`type=text` / `type=reasoning` 则是模型输出与思考。

用法：
  ./scripts/compare-agent-steps.py --list                  # 列出两边最近的会话
  ./scripts/compare-agent-steps.py --match y2k             # 两边各挑标题含 y2k 的最新会话，逐步对比
  ./scripts/compare-agent-steps.py --match y2k --full      # 输出完整入参/结果（默认截断）
  ./scripts/compare-agent-steps.py --side both --limit 20  # 只看前 20 步

只用只读连接，不会改动任何数据库。
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import shutil
import sqlite3
import sys
import tempfile

APPS = {
    "ref": os.path.expanduser(
        "~/Library/Application Support/@hilo/desktop/ai-runtime/data-home/opencode/opencode.db"
    ),
    "ours": os.path.expanduser(
        "~/Library/Application Support/蒜狸小助手/ai-runtime/data-home/opencode/opencode.db"
    ),
}
# 日志目录：需要看渲染层/网关细节时用
LOG_DIRS = {
    "ref": os.path.expanduser("~/Library/Logs/MiniMax Design"),
    "ours": os.path.expanduser("~/Library/Application Support/蒜狸小助手/logs"),
}


def connect(app: str) -> sqlite3.Connection | None:
    src = APPS[app]
    if not os.path.exists(src):
        print(f"[{app}] 找不到数据库：{src}", file=sys.stderr)
        return None
    # 复制一份再读，避免占用 App 的 WAL
    tmp = os.path.join(tempfile.gettempdir(), f"cmp-{app}.db")
    shutil.copyfile(src, tmp)
    return sqlite3.connect(f"file:{tmp}?mode=ro", uri=True)


def sessions(db: sqlite3.Connection, limit: int = 12):
    return list(
        db.execute(
            "select id, title, time_created from session order by time_created desc limit ?",
            (limit,),
        )
    )


def pick(db: sqlite3.Connection, match: str | None):
    rows = sessions(db, 200)
    if not rows:
        return None
    if not match:
        return rows[0]
    low = match.lower()
    for row in rows:
        if low in (row[1] or "").lower():
            return row
    return None


def part_rows(db: sqlite3.Connection, sid: str):
    return list(
        db.execute(
            "select data, time_created from part where session_id=? order by time_created, rowid",
            (sid,),
        )
    )


def clip(text: str, full: bool, width: int = 220) -> str:
    text = " ".join(str(text).split())
    if full or len(text) <= width:
        return text
    return text[:width] + " …"


def dump(app: str, match: str | None, full: bool, limit: int | None):
    db = connect(app)
    if db is None:
        return
    row = pick(db, match)
    if row is None:
        print(f"[{app}] 没有匹配 {match!r} 的会话")
        return
    sid, title, ts = row
    rows = part_rows(db, sid)
    tools = [json.loads(d) for (d, _) in rows if json.loads(d).get("type") == "tool"]
    print(f"\n########## {app.upper()} — {(title or '')[:60]}")
    print(f"session={sid}  time={dt.datetime.fromtimestamp(ts / 1000):%Y-%m-%d %H:%M}  parts={len(rows)}  tools={len(tools)}")
    step = 0
    for (data, when) in rows:
        p = json.loads(data)
        kind = p.get("type")
        if kind == "tool":
            step += 1
            if limit and step > limit:
                break
            st = p.get("state") or {}
            status = st.get("status")
            print(f"\n[{step:02d}] 🔧 {p.get('tool')}  ({status})")
            if st.get("input") is not None:
                print(f"     in : {clip(json.dumps(st['input'], ensure_ascii=False), full)}")
            out = st.get("output") if st.get("output") is not None else st.get("error")
            if out is not None:
                print(f"     out: {clip(out, full)}")
        elif kind in ("text", "reasoning"):
            body = p.get("text") or ""
            if not body.strip():
                continue
            tag = "💬 模型输出" if kind == "text" else "🤔 思考"
            print(f"     {tag}: {clip(body, full, 160)}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--match", help="按标题子串挑会话（两边各取最新一条匹配）")
    ap.add_argument("--list", action="store_true", help="只列最近的会话")
    ap.add_argument("--full", action="store_true", help="不截断入参/结果")
    ap.add_argument("--limit", type=int, default=None, help="每边最多显示多少步工具调用")
    ap.add_argument("--side", choices=["ref", "ours", "both"], default="both")
    ap.add_argument("--logs", action="store_true", help="顺带列出两边当天的日志文件")
    args = ap.parse_args()

    sides = ["ref", "ours"] if args.side == "both" else [args.side]
    for app in sides:
        if args.list:
            db = connect(app)
            if db is None:
                continue
            print(f"\n== {app.upper()} 最近会话")
            for sid, title, ts in sessions(db):
                print(f"  {dt.datetime.fromtimestamp(ts / 1000):%m-%d %H:%M}  {(title or '')[:56]}")
            continue
        dump(app, args.match, args.full, args.limit)

    if args.logs:
        today = dt.date.today().strftime("%m-%d")
        for app in sides:
            d = LOG_DIRS[app]
            print(f"\n== {app.upper()} 日志目录 {d}")
            if not os.path.isdir(d):
                print("  (不存在)")
                continue
            for name in sorted(os.listdir(d)):
                if today in name or name.endswith(".log"):
                    path = os.path.join(d, name)
                    print(f"  {name:46} {os.path.getsize(path):>10} B")


if __name__ == "__main__":
    main()
