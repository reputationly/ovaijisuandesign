---
utility: audio-pipeline
applies_to: [ad-tvc, mv]
---

# Audio Pipeline — speech, music and mix decisions

> **何时 Read**：某个 stage 要单独出配音、歌曲或背景乐、重配对白、做终混，或者视频 workflow 点名要用本卡时。

## Boundary

Use this card to settle the form of each audio asset. Dialogue, lyrics and video prompts are someone else's job: they arrive from the user, from the approved script or lyrics, or as excerpts already in the Stage Execution Plan.

## Decision Tests

| Need | Use | Evidence required first |
|---|---|---|
| Dialogue or ambience inside a generated clip | native audio of the video item | the approved dialogue excerpt; a caption excerpt only if subtitles were requested |
| Narration or dubbing laid over picture | `audio.tts` item | text, language, speaking role, a voice id from `hub_voice_prepare` |
| A voice that video clips should imitate | voice anchor cut to 3 s or less | role, sample line, the cut file's path and node |
| Background music or score | `audio.music` item, `mode: instrumental` | mood or use, how widely it is reused, the mix policy |
| A song with vocals | lyrics confirmation, then `audio.music` item with `mode: song` | lyrics the user has confirmed, plus a style prompt |
| Final mix | postprocess item | ordered inputs, whether clip audio is kept or replaced, fixed music gain, output target |

Cover versions, remixes and stem separation are not available through the tools; tell the user rather than planning them.

## Rules

- When speech must match generated faces, keep it in the clip's native audio. `MiniMax-H3` renders native audio by default.
- If the workflow wants dialogue inside the clips, add standalone speech or voice prep only if the workflow's audio section or the user demands it.
- Use standalone speech for off-screen narration, replacement dubbing, or narration whose pacing must be exact. Asking for subtitles does not by itself create a speech item; it adds a subtitle step in Post.
- Speech is `hub_generate_audio_speech` with `model_name` `speech-2.8-hd` and no vendor. It speaks with the reference clip the user mapped to the chosen voice id; there are no preset voices, and cloning or voice design is not offered through the tools. Get voice ids from `hub_voice_prepare`; if none fit, ask the user to add a reference voice in Settings.
- A voice anchor is only a short reusable reference. Final lines stay in video items or standalone speech items.
- If a generated clip already carries intentional music, do not lay more music on top unless the user asks for a replacement or remix.
- Make one music bed per project or segment and fit it to picture in Post; never one track per shot.
- All music — background, score, instrumental, songs — is `hub_generate_audio_music` with `model_id` `music-3.0` and no vendor. The tool has no duration parameter: when `render.duration_target_s` is set, generate first, then trim to the target and fade out the ending with `hub_ffmpeg`. Runtime refs and the mix use only the trimmed file.
- Lyrics are never made up silently. Polished lyrics supplied by the user may go straight to generation; lyrics the agent drafted or changed wait for the user's confirmation.
- Treat the duration a tool returns as measured evidence, not a promise; Post reconciles timing against it. `hub_audio_meta` reads duration for files that did not come with one.
- A mix of narration and music uses the fixed music gain from the plan. No ducking, volume automation, per-segment gain or music swells unless the user asks.
- Each audio item names its role explicitly: main song, background music, narration, dialogue, voice reference, sound effect, or check-only.
- Audio items put input and voice refs in `refs`, source ranges or timing evidence in `source`, target duration, format and mix policy in `render`, and the action in `operation`. Speech items carry `text`, `language` and the speaking role. Music items carry a finished `prompt` (and `lyrics` for songs); the model lock sits in the stage `execution_locks`.

## Anti-patterns

- Lumping every sound into one vague "soundtrack".
- Replacing a music bed the user supplied just because the workflow mentions background music.
- Feeding a full dialogue track to video as a voice reference.
- Dropping a subtitle deliverable the user asked for when narration is produced separately.
