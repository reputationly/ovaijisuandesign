---
topic: on-image-text
activation_hints: ["文字", "文案", "标语", "标题", "片名", "字幕", "中文", "text", "headline", "tagline"]
modality: image
---

# on-image-text -- lettering inside the picture

## Activate When
Words must be visible in the image: the user gave exact copy, asked for a typographic layout, or supplied a text-bearing asset that must stay readable.

## Decision Test
If readable text is part of success, treat it as a layout element and prompt for it deliberately. If nobody asked for text, leave it unmentioned; not mentioning text is not the same as forbidding it.

## Action
- Quote the exact copy and give its position, size rank, alignment, surrounding space and the character of the typeface.
- Keep in-image copy short; long paragraphs, dense tables or many small labels are unreliable on the platform image model. Split them, shorten them with the user, or add them later as an overlay with `hub_ffmpeg`.
- Use `resolution` `2K` when small text must stay legible.
- Mixed Chinese and Latin copy: give each string separately in quotes.
- Text in video belongs in postprocess overlay or burned subtitles, not in the generation prompt, unless it is part of the scene (a shop sign).
