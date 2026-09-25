---
utility: subtitle-pipeline
applies_to: [drama-series, ad-tvc, mv]
---

# Subtitle Pipeline — timed text to burned-in ASS

> **何时 Read**：用户、已确认的计划或 workflow 在开场时定下的默认策略要求把字幕 / 歌词 / 需要看清的文字烧进成片，或者用户要导出字幕文件时。

## Boundary

字幕是后期里一道确定性的工序，产物是一份带时间轴的文字文件。它不是资产锚点，也不写进视频 prompt 让模型去画。对白、歌词、口号、屏幕文字，只有在“观众必须看清”时才走这条链路；否则留在画面里由模型自然呈现或干脆不出现。

## Source

- Subtitles are opt-in. A workflow's default only applies once the user has agreed to it at intake or in the plan.
- There is no speech recognition in this profile. Timed text comes from one of these, in this order of preference:
  1. an `.srt` file the user supplied (use its path as is);
  2. an SRT written from timings that are already known — the approved line order of the script, together with the duration of each speech clip (`duration` returned by `hub_generate_audio_speech`, or `hub_audio_meta`) and the clip boundaries of the edit;
  3. per-clip dialogue excerpts timed at clip level from clip durations.
- To turn option 2 or 3 into a file, write the cues as plain SRT text (numbered cues, `HH:MM:SS,mmm --> HH:MM:SS,mmm`, text, blank line; no headings or code fences) with `hub_canvas_write_node(kind:"text")` and use the returned `path` as the source.
- Clip-level timing is as fine as it gets. Word-level or karaoke timing is out of reach unless the user's file already has it.
- If none of these sources exists and the dialogue lives only inside generated clip audio, tell the user that subtitles need either their SRT or a script with known timing; do not guess cue times.

## ASS Format

- Burned subtitles are ASS. Raw SRT is not burned when styled subtitles are wanted.
- Call `hub_subtitle_format` with `source_srt_path`, `format: "ass"` (the default), and `output_size` as `"WxH"` of the final render, taken from the Post stage `execution_locks`. Another `format` only when the user wants an `.srt` or `.vtt` file to take away.
- No style direction from the user means `style_preset: "social_safe"`. When they do specify a look, pass only what they asked for (`position`, `font_size` or `font_scale`, `margin_v`, …) and keep safe area, outline and readability as they are unless the user explicitly wants otherwise.
- A subtitle file is a deliverable only when the user asked to export one; otherwise the SRT / ASS files are working files.

## ASS Style Rules

The formatter applies these for `social_safe`; do not re-implement them in prompts or ffmpeg filters.

| 画幅（由 `output_size` 判断） | 每行中文字数上限 | 每行英文词数上限 |
| --- | --- | --- |
| 竖屏 | 10 | 7 |
| 横屏 | 12 | 14 |
| 方屏 | 13 | 8 |

- Font size is derived from frame height H: H/24 for portrait, H/19 for landscape, H/26 for square, rounded. Regular weight, 2 px black outline, light shadow.
- Long cues are broken explicitly at meaning boundaries; beyond two lines the remainder moves into a following cue whose time continues from the original. Words and CJK words are never split.
- Keep subtitles, key text and the main subject clear of the top eighth, the bottom quarter, and 7 % at either side, unless the user deliberately wants text there.
- Vertical margin: bottom subtitles sit 10 % of H above the lower edge in every frame shape; top subtitles sit 12.5 % of H below the upper edge.
- Events are anchored at a fixed block centre, so a two-line cue does not jump relative to a one-line cue.

## Burn / Render

- Burn after trimming and joining are final, as the last picture step.
- In `hub_ffmpeg`, use the formatter's `absolute_path` inside the `subtitles=` / `ass=` filter, or pass its `burn_hint` string directly. The relative `path` is only for runtime refs and provenance.
- `hub_ffmpeg` output lands on the canvas by itself; that new node is the finished subtitled video. Record its path and node id as the Post item's runtime ref.
- Do not put SRT / ASS / VTT working files on the canvas unless the file itself is what the user asked for.

## Anti-patterns

- Adding subtitles just because the video contains speech.
- Writing subtitle style, safe area or font choices into a video prompt.
- Relative subtitle paths inside ffmpeg filters.
- Burning an unformatted SRT.
- Inventing cue timings, or promising word-level timing from clip-level excerpts.
