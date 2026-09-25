---
utility: asset-pipeline
applies_to: [ad-tvc, mv]
---

# Asset Pipeline — anchors that later outputs reuse

> **何时 Read**：项目里有多个产物，需要让同一个人物、嗓音、地点或品牌产品在这些产物之间保持一致时。

## Principle

An anchor exists to feed later generations; it is not a deliverable for its own sake. Build one only if all of these hold: it will be reused, consistency across outputs matters, the user or a dependency calls for it, and no existing ref or capsule already does the job.

There are exactly four anchor kinds: character / subject, voice, recurring scene, and brand / product source. Style, props, lighting, camera language, composition, motion, mood and layout are not anchors on their own; they travel as ref capsules or brief notes, or ride along inside one of the four kinds.

## Asset Decisions

| Anchor | Build it when | Skip it when |
|---|---|---|
| Character / subject sheet | the same subject shows up in several shots, states, variants or final assets and nothing usable exists yet | the subject appears once, or an existing ref already covers it |
| Voice anchor | a speaking role has to sound the same across clips or narration | background sound, a single throwaway line, or the user is fine with whatever voice the clip produces |
| Scene base | one place has to stay recognisable across outputs, the user asked for that, or the place itself is a project asset | a one-off backdrop, a generic location, or only a loose mood |
| Brand / product source | a brand system, logo, packaging or product must be reproduced exactly in later assets and no adequate ref exists | a single poster, logo or mockup that can be generated in one go |

## Character / Subject

- Unless the selected workflow prescribes another form, a reusable character or subject anchor is one 16:9 landscape sheet with six views in a 3×2 grid. Upper row: full body from the front, the side and the back. Lower row: close-ups of the face — frontal, profile, and three-quarter.
- The full-body row fixes build, costume and silhouette; the close-up row fixes the face, which later talking, close-up and identity-sensitive shots depend on.
- Do not label this sheet "三视图". When a user asks for 三视图 in a direct request they mean front / side / back only; the six-view sheet is a pipeline requirement.
- If the user insists on a front / side / back sheet only, record that as a constraint and point out the face-consistency risk whenever talking or close-up shots are planned.
- Without a ratio from the user the sheet is 16:9, which leaves room for body, outfit and facial detail.
- Leave visible gaps and clean background between the six cells so any single view can be cropped or read without its neighbours leaking in.
- The anchor entry in the plan must say, in so many words: six-view character sheet, 3×2 grid, full-body front / side / back, face close-ups front / profile / three-quarter, clearly separated cells, one consistent identity. A generic "character anchor" line is not enough.
- One sheet per persistent subject. A group or relationship image can guide blocking but never stands in for per-subject sheets when identity matters.
- All sheets in one batch use the same image model: add `vendor_model_policy: same_vendor_model` to the stage `execution_locks`; media-agent turns it into a concrete lock. On this platform images are `hub_generate_image` with vendor `banana` and no `model_id`, with an explicit `aspect_ratio`.
- A changed state (new outfit, injury, age) is a dependency chain: build the base identity first, then generate the changed state with the base sheet as its ref.

## Voice

- If the selected workflow forbids voice prep for its dialogue, that rule wins over this section.
- Speaking roles get executable voice-prep items, not just a named output: role, language, voice profile, `sample_text`, `operation: prepare_voice`, `output_role: voice_reference`, `trim_to_s: 3` when the voice feeds video, and the output id.
- The executor calls `hub_voice_prepare` once with every ready role, picks a matching voice id from the returned catalog, and renders a short representative line with `hub_generate_audio_speech`.
- Voices on this platform are the reference clips the user has mapped to voice ids in Settings. If the catalog comes back empty or has nothing suitable, block the stage and ask the user to add a reference voice; do not invent ids and do not offer cloning or voice design.
- Choosing among available voices is the executor's call, not a questionnaire. Ask the user only if they asked to audition voices, several options would change who the character is, or the stage marks the choice as open.
- A voice that feeds video must be a short sample. Read the `duration` that `hub_generate_audio_speech` returns; if it is over 3 s, cut it to 3 s or less with `hub_ffmpeg` and pass only the cut file into the video's reference audio. The runtime ref for the voice points at the cut file.
- A voice anchor is a reference, not a finished dialogue or narration track. Standalone dialogue, narration, music or a replacement mix is produced only when the workflow or the user asks.
- A voice belongs to one role. Two different speaking roles never share a voice unless the user wants that.

## Scene / Brand

- A scene anchor captures what makes a recurring place recognisable, not every angle of it and not generic locations.
- A brand / product anchor keeps the reusable identity: logo and text ownership plus the details that matter in use. With no downstream reuse and no brand system requested, generate the target asset directly. For brand risks see `<knowledgeDir>/failures/brand-injection.md`.
- Match the project ratio unless a sheet layout needs something else; do not fall back to square without a reason.

## Canvas

Every required anchor has to be on the canvas before any generation that depends on it starts. Generation tools return a canvas node id on success. `hub_ffmpeg` results register on the canvas by themselves; only a path-only result (for example from `hub_merge_videos`) needs `hub_canvas_write_node(kind:"media")`.

## Anti-patterns

- An anchor for every noun, prop, camera idea, lighting setup or style word in the brief.
- Relying on text descriptions alone to keep identity across outputs.
- A single portrait, half-body or beauty shot used as the reusable character anchor, unless the workflow explicitly asks for a single-image anchor.
- A front / side / back-only sheet for a character who speaks or appears in close-up.
- Different image models inside one batch of identity sheets.
- Raw, unchecked or overlong voice samples passed into video generation.
- Downstream video that lists voice refs while no upstream voice-prep item exists.
