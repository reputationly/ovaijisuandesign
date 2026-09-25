---
topic: spoken-video
activation_hints: ["对话", "台词", "说话", "旁白", "演唱", "rap", "dialogue", "voice", "audio", "音效"]
modality: video
---

# spoken-video -- sound generated with the clip

## Activate When
The clip itself must contain speech, singing, narration, sound effects or music produced together with the picture.

## Decision Test
If the user wants a video in which someone audibly performs, generate the sound natively with the video. If they want dubbing afterwards, subtitles, a replaced soundtrack or a final mix, generate picture first and handle audio in postprocess.

## Action
- Native audio is on by default for `hub_generate_video` with vendor `MiniMax` (see `<knowledgeDir>/vendors/minimax.md`); leave `generate_audio` on for spoken clips.
- Describe the performance naturally: who speaks or sings, the exact quoted line when it matters, tone, surrounding ambience and roughly when in the clip it happens.
- Leave out technical sync instructions (lip-sync markers, frame timings); they do not control the model and hurt quality.
- Use `hub_generate_audio_speech` + `hub_ffmpeg` only for external voice-over, replacing or mixing audio, or final assembly. Speech needs a voice mapped by the user (`<knowledgeDir>/vendors/moss.md`).
- Keep quoted lines in the user's language unless translation is requested.
