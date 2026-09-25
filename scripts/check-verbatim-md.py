#!/usr/bin/env python3
"""agent 配置（提示词 / 合同 / 知识卡 / 工作流）的对照重写自查。

拿我们的 `config/opencode-v2` + `.opencode-v2` 和本机的参考配置
`reference/config-v2`（不进仓库）比两种重合：

- **8 词 shingle**：连续 8 个词在参考里出现过的比例。中日韩文字按单字算一个词。
- **整句**：归一化后（去标点、小写）完全相同、且不短于 6 个词的句子。

接口标识本来就该一样，不算重合：行内代码（反引号里的内容）、JSON 的键、
带 `_` `-` `/` `.` `:` `@` `<>` `{}` 之类符号的词（工具名、字段名、路径、模型 id）
和纯数字都在比较前剔掉。

用法：
  python3 scripts/check-verbatim-md.py [--threshold 0.03] [--file-threshold 0.10] [--show 5]
总重合超过 --threshold 或任一文件超过 --file-threshold 时退出码为 1。
参考目录不存在时跳过（CI 上就是这样）。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OURS = [os.path.join(ROOT, "config/opencode-v2"), os.path.join(ROOT, ".opencode-v2")]
REF = os.path.join(ROOT, "reference/config-v2")
EXTS = (".md", ".json", ".ts")
SHINGLE = 8
MIN_SENTENCE = 6

CJK = r"㐀-鿿豈-﫿"
TOKEN = re.compile(rf"[{CJK}]|[A-Za-z0-9_\-/.:@<>{{}}\[\]$#*=+|~^%&'’]+")
IDENT = re.compile(r"[_\-/.:@<>{}\[\]$#=+|~^%&*]|^\d+$|[a-z][A-Z]")


def strip_json(text: str) -> str:
    """JSON 只比字符串值（键是接口）。"""
    try:
        data = json.loads(text)
    except ValueError:
        return text
    out: list[str] = []

    def walk(v: object) -> None:
        if isinstance(v, dict):
            for x in v.values():
                walk(x)
        elif isinstance(v, list):
            for x in v:
                walk(x)
        elif isinstance(v, str):
            out.append(v)

    walk(data)
    return "\n".join(out)


def clean(path: str, text: str) -> str:
    if path.endswith(".json"):
        text = strip_json(text)
    text = re.sub(r"`[^`\n]*`", " ", text)
    return text


def tokens(text: str) -> list[str]:
    out = []
    for t in TOKEN.findall(text):
        if len(t) > 1 and IDENT.search(t):
            continue
        out.append(t.lower().strip("'’"))
    return [t for t in out if t]


def sentences(text: str) -> list[list[str]]:
    parts = re.split(r"[.!?;。！？；\n]+", text)
    return [tokens(p) for p in parts]


def shingles(toks: list[str]) -> set[tuple[str, ...]]:
    return {tuple(toks[i : i + SHINGLE]) for i in range(len(toks) - SHINGLE + 1)}


def files_under(roots: list[str]) -> list[str]:
    out = []
    for r in roots:
        for d, _, fs in os.walk(r):
            if "/_disabled" in d or "node_modules" in d:
                continue
            out += [os.path.join(d, f) for f in fs if f.endswith(EXTS)]
    return sorted(out)


def read(p: str) -> str:
    with open(p, encoding="utf-8", errors="ignore") as fh:
        return clean(p, fh.read())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--threshold", type=float, default=0.03)
    ap.add_argument("--file-threshold", type=float, default=0.10)
    ap.add_argument("--show", type=int, default=5)
    args = ap.parse_args()

    if not os.path.isdir(REF):
        print("找不到 reference/config-v2，跳过", file=sys.stderr)
        return 0

    ref_sh: set[tuple[str, ...]] = set()
    ref_sent: set[str] = set()
    for f in files_under([REF]):
        t = read(f)
        ref_sh |= shingles(tokens(t))
        for s in sentences(t):
            if len(s) >= MIN_SENTENCE:
                ref_sent.add(" ".join(s))

    total = hit = sent_total = sent_hit = 0
    rows = []
    for f in files_under(OURS):
        t = read(f)
        toks = tokens(t)
        sh = [tuple(toks[i : i + SHINGLE]) for i in range(len(toks) - SHINGLE + 1)]
        same = [s for s in sh if s in ref_sh]
        sents = [" ".join(s) for s in sentences(t) if len(s) >= MIN_SENTENCE]
        same_sent = [s for s in sents if s in ref_sent]
        total += len(sh)
        hit += len(same)
        sent_total += len(sents)
        sent_hit += len(same_sent)
        ratio = len(same) / len(sh) if sh else 0.0
        rows.append((ratio, os.path.relpath(f, ROOT), len(same), len(sh), same_sent, same))

    overall = hit / max(total, 1)
    print(f"{len(rows)} 个文件；8 词 shingle 重合 {hit}/{total}（{overall:.2%}）；整句重合 {sent_hit}/{sent_total}（{sent_hit / max(sent_total, 1):.2%}）")
    bad = overall > args.threshold
    for ratio, f, n, c, same_sent, same in sorted(rows, reverse=True):
        flagged = ratio > args.file_threshold
        bad = bad or flagged
        if n == 0 and not same_sent:
            continue
        if ratio > 0.01 or same_sent or flagged:
            print(f"{'!!' if flagged else '  '} {ratio:6.2%}  {n}/{c}  {f}")
            for s in same_sent[: args.show]:
                print(f"      句: {s[:140]}")
            if not same_sent:
                for s in same[: min(args.show, 2)]:
                    print(f"      片: {' '.join(s)}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
