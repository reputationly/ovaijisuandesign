#!/usr/bin/env python3
"""从官方 mcp-tools 里提取工具清单，生成 docs/mcp-tools.md。

只提取**接口事实**（工具名、入参键名），不复制任何描述文本或实现。
应用升级后重跑一次，看接口面有没有变。

    python3 scripts/extract-mcp-tools.py [--app /Applications/MiniMax\\ Design.app]
"""

import argparse
import json
import re
import sys
from collections import OrderedDict
from pathlib import Path

DEFAULT_APP = Path("/Applications/MiniMax Design.app")

# 分组只影响文档可读性，不影响提取结果。新工具落到「未归类」，
# 那正好是升级后该看的地方。
GROUPS = OrderedDict([
    ("画布", r"^canvas_"),
    ("计划编排", r"^plan_"),
    ("生成 · 图片", r"^(generate_image|prompt_write|select_image_recipe|image_remove_background|image_search)$"),
    ("生成 · 视频", r"^(generate_video|batch_lip_sync|merge_videos|mv_final_assembly|validate_mv_storyboard)$"),
    ("生成 · 语音", r"^(generate_audio_speech|audio_generation|audios_batch_generation|seedaudio_generation|voice_clone|design_voice|get_voice_id|voice_prepare|voice_isolation)$"),
    ("生成 · 音乐", r"^(generate_audio_music|music_|lyrics_generation)"),
    ("后期处理", r"^(ffmpeg|super_resolution|embed_audio|subtitle_format|media_generate_subtitle|audio_subclip_batch|audio_separate|audio_analyze_music|audio_transcribe_lyrics|media_transcribe|probe_media|audio_meta)$"),
    ("资产与文件", r"^(asset_center_|get_asset_relations|read$|read_media|write$|edit$|save_file_to_session|upload_to_cdn|web_media|analyse_media)"),
    ("记忆与知识", r"^(memory|search_knowledge|report_outcome|reload_skills)"),
    ("ComfyUI", r"comfyui"),
    ("插件", r"^(plugin_agent_|recommend_plugin|open_remote_tool_gui|preview_and_collect_feedback)"),
    ("DAG / 其他", r"^(run_dag|submit_dag|query_dag_result|submit_test_async_task|list_capabilities|get_model_concurrency)$"),
])


def balanced(src: str, start: int) -> str:
    """从 `start` 处的 `{` 取到配对的 `}`，跳过字符串字面量。"""
    depth = 0
    i = start
    quote = None
    while i < len(src):
        c = src[i]
        if quote:
            if c == "\\":
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in "\"'`":
            quote = c
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return src[start : i + 1]
        i += 1
    return src[start : start + 4000]


def extract(bundle: Path) -> list[dict]:
    src = bundle.read_text(encoding="utf8", errors="replace")
    tools = []
    for m in re.finditer(r'registerTool\(\s*"([a-z0-9_]+)"\s*,\s*\{', src):
        block = balanced(src, m.end() - 1)
        keys: list[str] = []
        schema = re.search(r"inputSchema:\s*\{", block)
        if schema:
            inner = balanced(block, schema.end() - 1)
            # zod 被打包成 external_exports.<type>()，键名就在它前面
            keys = re.findall(
                r"(?:^|[{,\s])([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*external_exports\.", inner
            )
        tools.append({"name": m.group(1), "input": sorted(set(keys))})
    return tools


def render(tools: list[dict]) -> str:
    grouped: OrderedDict[str, list[dict]] = OrderedDict((g, []) for g in GROUPS)
    grouped["未归类"] = []
    for t in tools:
        for title, pat in GROUPS.items():
            if re.search(pat, t["name"]):
                grouped[title].append(t)
                break
        else:
            grouped["未归类"].append(t)

    out = [
        "# MCP 工具面",
        "",
        f"官方 `mcp-tools` 注册的**全部 {len(tools)} 个工具**。opencode 按 MCP server 名加前缀，",
        "所以 agent 侧看到的是 `hub_<name>`。",
        "",
        "这是**要对齐的接口规格** —— 名字和入参保持一致，官方那套 agent 配置就能直接",
        "驱动我们的实现。入参名从 zod `inputSchema` 提取，类型和可选性没有提取，",
        "实现时去源文件核对。",
        "",
        "> 只记接口事实，不含任何官方文件的原文。",
        "> 由 `scripts/extract-mcp-tools.py` 生成，应用升级后重跑。",
        "",
    ]
    for title, rows in grouped.items():
        if not rows:
            continue
        out += [f"## {title}（{len(rows)}）", "", "| 工具 | 入参 |", "|---|---|"]
        for t in rows:
            params = ", ".join(f"`{k}`" for k in t["input"]) or "—"
            out.append(f"| `{t['name']}` | {params} |")
        out.append("")
    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--app", type=Path, default=DEFAULT_APP)
    ap.add_argument("--out", type=Path, default=Path("docs/mcp-tools.md"))
    ap.add_argument("--json", type=Path, help="同时导出结构化结果")
    args = ap.parse_args()

    bundle = args.app / "Contents/Resources/mcp-tools/dist/main.js"
    if not bundle.is_file():
        print(f"找不到 mcp-tools: {bundle}", file=sys.stderr)
        return 1

    tools = extract(bundle)
    if not tools:
        # 打包方式变了就会是这个结果。静默生成一份空文档比报错更糟 ——
        # 那会让人以为官方把工具删光了。
        print("没有提取到任何工具：registerTool 的调用形状可能变了", file=sys.stderr)
        return 1

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(render(tools), encoding="utf8")
    if args.json:
        args.json.write_text(json.dumps(tools, ensure_ascii=False, indent=1), encoding="utf8")
    print(f"{len(tools)} 个工具 → {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
