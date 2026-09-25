---
utility: stage-execution-plan
applies_to: [ad-tvc, drama-series, mv]
---

# Stage Execution Plan — the structured contract behind every workflow

> **何时 Read**：planner 选中一个 workflow 后，写计划或改计划前必读；media-agent 与 executor 推进某个 stage 时，以这里描述的字段为准。

## Principle

The planner turns the current stage into a contract that can run without further interpretation. The executor sees one stage through `hub_plan_get_stage_detail` and nothing else: no chat history, no canvas documents, no workflow references. Anything the executor needs must therefore be inside that stage.

## Core Contract

All plan writes go through the plan tools with structured objects: `hub_plan_write` (whole plan), `hub_plan_patch_stage` (one stage), `hub_plan_replan` (frontier and later). Plan Markdown is never written by hand, and the plan is never written with `hub_canvas_write_node`.

The plan is bound once to a workflow through `workflow.path` and, when that workflow has variants, `workflow.variant`. The binding does not change afterwards; a different path or variant means a new plan.

Where things live:

| Content | Field |
|---|---|
| Uploaded scripts, briefs, user refs, external files | top-level `sources[]` |
| Stage skeleton shown on the Production Board | top-level `stage_outline[]` |
| Upstream stages whose outputs this stage reads | `depends_on[]` |
| Refs the stage introduces itself (uploads, style plates, grounding assets) | `ref_capsules[]` |
| One entry per logical output | `work_items[]` |
| Stage-wide model, geometry and mode locks | `execution_locks[]` |
| Binding rules that apply to every item | `constraints[]` |
| Planner-owned scalar settings (`execution_policy`, `max_generated_clip_duration_s`, …) | `stage_fields` |
| Compact source excerpt the executor may need | `execution_excerpt` |
| User checks | `review.before_execution[]`, `review.after_execution[]` |
| Produced outputs | runtime `runtime_refs` (written only through `hub_plan_update_stage_state`) |

`review` decides whether the framework pauses. Put scope, inputs, final prompts, refs, locks or dependencies the user must approve before work starts in `before_execution`; put document or media qualities the user must look at afterwards in `after_execution`. A side with nothing to check is omitted or `[]`. Checks are short, concrete and user-verifiable; never write framework states or "confirm and continue". Stages whose documents the planner already materialized carry no `before_execution`.

## Plan object (`hub_plan_write` → `plan`)

| Field | Required | Rules |
|---|---|---|
| `title` | no | single line; defaults to "Stage Execution Plan" |
| `header_fields` | no | map of single-line scalars; `project_type` here selects workflow-specific validation |
| `workflow` | yes on first write | `{ path, variant? }`, both single-line, no other keys |
| `sources` | no | items (see Item values); each `id` is a logical id |
| `stage_outline` | yes, ≥1 | `{ id, order, name, omitted? }`; `order` must equal the entry's 1-based position; ids and orders unique; `name` ≤ 40 characters, single line |
| `stages` | yes, ≥1 | every stage needs an outline entry with the same `id` and `order` that is not `omitted` |

## Stage object (`plan.stages[]`, `hub_plan_patch_stage` → `stage`)

Unknown keys are rejected. Allowed keys:

| Field | Required | Rules |
|---|---|---|
| `stage_id` | yes | single line; matches its outline `id` |
| `order` | yes | integer ≥ 1; matches its outline `order` |
| `goal` | yes | one line |
| `depends_on` | no | stage ids; members may not contain `,`, `]` or line breaks |
| `review` | no | `before_execution` / `after_execution`: arrays of non-empty single-line strings |
| `stage_fields` | no | map of single-line scalars; these keys are refused because the runtime owns them: `status`, `waiting_reason`, `approval`, `blocked_reason`, `failed_item_ids`, `runtime_refs`, `superseded_runtime_refs`, `failures`, `retry_count`, `overrides`, `note` |
| `work_items` | no in schema, required by validation | items |
| `constraints` | no | items; each constraint is a key-value object such as `{ rule: "…" }`, never a bare string |
| `execution_locks` | no | items |
| `ref_capsules` | no | items; each `id` is a logical id |
| `execution_excerpt` | no | free text, may span lines |

### Item values

Every entry of `sources`, `work_items`, `constraints`, `execution_locks` and `ref_capsules` is a flat map whose values are one of:

- a scalar (string, number, boolean);
- a list of scalars — list members may not contain `,`, `]` or line breaks;
- a one-level group object whose values are scalars or such lists.

Group objects (`source`, `render`, `timeline`, `blocking`, …) are only for readability. Validation and the executor read the keys inside them by name as if they sat on the item itself, so a key name must not repeat across groups of the same item. Long or multi-line text belongs in a plain string such as `prompt` or `execution_excerpt`.

## Validation performed on every write

`hub_plan_write`, `hub_plan_patch_stage` and `hub_plan_replan` validate the complete resulting plan and refuse the write on any error.

Plan-wide:
- Logical ids are unique across the whole plan: every `sources[].id`, `work_items[].id` and `ref_capsules[].id`.
- Stage ids and orders are unique.

Per stage:
- A stage needs at least one work item.
- Every work item that is classified (has `modality`, `kind`, `asset_class` or `operation`) needs a non-empty `id`.
- Generated media — `modality` `image`, `video` or `audio.music` — needs a `prompt`, unless its `kind`/`operation` marks analysis, inspection, search, verification, registration or preparation.
- A document item (`modality: document`) needs a real `document_node_id` (on the item or inside `source`).
- A postprocess item (`modality: postprocess`, or an `operation` mentioning concat, transcode, timeline or post) needs `operation` or `action`, plus one of `ordered_input_refs`, `input_refs`, `clip_refs`, `timeline_order`.
- Every video item needs an aspect ratio: once in `execution_locks` (`aspect_ratio`) or on the item.
- A video item's duration upper bound (`duration_target_s`, `target_duration_s` or `duration_s`; for "8-12s" the bound is 12) may not exceed `stage_fields.max_generated_clip_duration_s`; 15 applies when unset.

Video item fields by workflow (the kind comes from `header_fields.project_type` and `workflow.path`):

| Workflow | Required on every video item (any one name of a group) |
|---|---|
| `drama-series` | `clip_group_id`; `sequence_index`; `duration_target_s`; `scene_id` / `source_scene_beat_range` / `source_scene_range`; `refs`; `audio_approach` / `generated_speech_audio_approach`; `prompt` |
| `mv` | `segment_id` / `clip_group_id`; `timing_target` / `source_song_section` / `beat_section_range` / `source_segment_range`; `refs`; `audio_approach`; `duration_target_s` / `target_duration_s` / `timing_target` |
| others (`ad-tvc`, …) | `clip_group_id` / `segment_id` / `shot_id`; `source_scene_beat_range` / `source_scene_range` / `source_segment_range` / `timing_target`; `duration_target_s` / `target_duration_s` / `duration_s` / `timing_target`; `refs`; `audio_approach` / `generated_speech_audio_approach` |

Extra drama-series checks:
- `refs` members are stable ids (letter first, then letters, digits, `_`, `.`, `-`), or start with `one_off_` / `prompt_` / `inline_`, or are `none`. Role names go into the prompt or `blocking`, not `refs`.
- `refs` holds at least as many ids as `roles_present` plus `persistent_background_roles` name roles; the two role lists may not overlap.
- A video prompt spells out the spatial snapshot. Shorthand such as "沿用上一组" or "继承 sg_03" is rejected because the model cannot see other groups.
- Scene keyframe grids (stage id containing `scene-keyframes`, or `asset_class` containing `keyframe_grid`) need a scene id, `refs`, and one self-contained `prompt` that marks every panel inline as `cell_1` … `cell_9` or `第1格` … `第9格`; with `stage_fields.storyboard_style: bw_blockout` there are exactly eight panels. Separate `cells` or `cell_N` fields are rejected.

Ref resolution — each id in an item's `refs` must be one of:
1. a top-level `sources[].id`;
2. an `id` in this stage's `ref_capsules`;
3. a `work_items[].id` or `ref_capsules[].id` of a stage listed directly in `depends_on` (transitive dependencies do not count);
4. the output of an **earlier** item in the same stage, only when `stage_fields.execution_policy` contains `serial`, `sequential`, `chain`, `topolog` or `continuity` (or that output is already in this stage's runtime refs).

An item may never reference its own output or a later item's output.

Before execution (`hub_plan_get_stage_detail`) the stage additionally needs every `depends_on` stage to be `done`, every document item materialized, and every video `refs` id available from sources, capsules, or current runtime refs of this stage or its direct dependencies. `prompt_only` and `none` are accepted as "no media ref".

## Runtime

Runtime state belongs to the framework. Stage status is one of `waiting_user` (with `waiting_reason` `plan_review` or `result_review`), `doing`, `done`, `blocked` (with `blocked_reason`).

A newly authored stage starts as:
- planner-materialized document stage → `waiting_user`/`result_review` when `after_execution` has checks, else `done`;
- any other stage with `before_execution` checks → `waiting_user`/`plan_review`;
- otherwise → `doing`.

Outputs are recorded with `hub_plan_update_stage_state` (`updates[]`, each with `stage_id` or `order`, `status`, optional `expected_status`, `blocked_reason`, `failed_item_ids`, `note`, `outputs`). Each `outputs[]` entry is `{ id, path?, node_id?, url? }`, where `id` must be a work item id of that stage and `url` must be http(s). Recording an id that already exists moves the old entry to `superseded_runtime_refs`; downstream stages read only current `runtime_refs`. Placeholder runtime refs are never written.

## Authoring rules

Stage by stage:
- First write: the workflow binding, header, the complete `stage_outline` (`id`, `order`, short user-facing `name`), and only the first required stage. Unauthored stages exist only in the outline; `stages` never holds placeholders.
- After the current stage's output is accepted, the same planner session appends exactly the next stage with `hub_plan_patch_stage`. Later stages are not authored, researched or materialized early.
- Conditional stages that the workflow marks as ask-first stay as outline entries until the `question` answer arrives; no documents, items or locks are produced for them before that.
- A user correction to a planner-owned document resumes the same planner session (its earlier `task_id`), which patches both the stage contract and the document node. Only a verbatim acceptance skips the planner.

Language:
- Instructions, document bodies, item names, prompt text and scene descriptions follow `working_language`. Audience-facing words (dialogue, narration, lyrics, captions, CTA, on-screen text) follow the language the workflow confirmed. User-supplied text is kept verbatim. Schema keys, model ids, parameters, paths, tool names and signal codes stay literal.

Sources and documents:
- Full uploaded scripts, briefs, lyrics or storyboards live in `sources` or in planner-owned document nodes. The plan keeps pointers and short excerpts only; a script is never modelled as a stage named `source`.
- Before authoring a stage, read the references the workflow names for it and fold every binding rule (layout, template, slot order, crop, model, size, continuity, dialogue, sound) into the document or the final `prompt`. Reference paths are never passed to the executor.
- Documents are written by the planner. Write the canvas node first, then record a `modality: document` item carrying the returned `document_node_id`. Only materialize a document whose full content is known now (this stage's own document, or a planning note built purely from material already on hand). No "to be filled later" nodes, no placeholder ids, no document items for the executor.

Work items:
- `work_items` is the stable list of deliverables, not a to-do queue. Keep every retained item with its existing `id` in every revision, whether it succeeded, failed or was excluded from a retry; re-emit the full stage and change only what is affected. Retrying a subset is the dispatcher's business, not a reason to shrink the list.
- `id` is the logical output slot used by refs, retries and runtime bindings. `name` is the user-visible label and filename seed, in `working_language`, and is required for user-facing outputs.
- A stage with only a broad goal ("generate the clips", "assemble the film") is incomplete: it needs items detailed enough for the executor to pick tools without reading any document.
- Image, video and music items carry a finished, content-level `prompt` that is dispatched unchanged. Keep it positive, specific to the item, and free of vendor names, model ids, item ids, stage ids and file names. Speech items carry `text`, `language` and speaker fields instead.
- When an item passes reference media, the prompt refers to each input by its slot number (image 1, image 2 and so on; audio 1; video 1; or 图1、图2) — and says what it pins down (face and wardrobe, a room's layout, a voice's timbre). `refs` lists the same ids in the same order; the executor fills the tool's reference arrays in exactly that order without reordering, de-duplicating or dropping.
- Grounding stages list executable items (register the user's ref, generate an approved stand-in) with stable output ids per role. A policy sentence such as "use the real product" is not a work item.
- Every stage that owns a ref an item needs is listed directly in `depends_on`.

Video stages:
- One item per continuity-first clip group, not per line of dialogue or camera note. Each item carries its source range, target duration, refs, audio approach, `id` and `prompt`. Output geometry sits once in `execution_locks` together with the model lock.
- Set `max_generated_clip_duration_s: 10` for `MiniMax-H3`, which renders 5 s or 10 s clips; no item's duration may go above it. A beat that runs longer becomes adjacent continuation items (`sg_04a`, `sg_04b`) with short continuity notes and the reason for the split.
- Prefer the longest single generation that fits duration, dialogue density and continuity. Split only on a hard change of place or time, a changed character state or wardrobe dependency, an intentional montage or cut, incompatible refs, or overflow. One clip never lists two scene refs for different locations.
- Several independent video items run with `execution_policy: parallel_independent_work_items`. The executor sizes its window from `hub_get_model_concurrency`; a stage `concurrency_limit` may only narrow it. Independent means all refs already exist and no item consumes another item of the same stage; otherwise use a serial policy and state why.
- Native clip audio and a separate audio stage are different layers. Every video item states its audible result positively in `audio_approach` and in its prompt. Without user direction the default is native sound effects and ambience matched to the action, with no added music. `silent` is written only when the user or a confirmed source asked for silence, and never alongside any audible element.

Voice and audio:
- If downstream video items reference a voice, an upstream stage holds executable voice-prep items: role, language, profile, `sample_text`, `operation: prepare_voice`, `output_role: voice_reference`, `trim_to_s: 3`. The executor finds voice ids with `hub_voice_prepare`, renders the sample with `hub_generate_audio_speech`, checks the returned duration, trims anything longer with `hub_ffmpeg`, and records only the trimmed path.
- Speech voices are the reference clips the user has mapped to voice ids in Settings. When `hub_voice_prepare` returns no usable voice, the stage blocks and the user is asked to add one; the plan never invents voice ids.
- Add a standalone audio stage only for narration, dubbing, music, replacement dialogue or another independent track the workflow or user requires. Approved background music also implies a Post mix. One item per role, song or mix target, each with text or lyrics excerpt, language, role, refs, target duration or timing evidence, operation and `id`. Stop before generation while lyrics or voice still await the user.

Post stages:
- One item for the deterministic edit: ordered logical input refs, the operation (trim, concat, transcode, mix, overlay), whether clip audio is kept or replaced, and subtitle instructions only if subtitles were requested. The executor resolves absolute paths from current `runtime_refs` and upstream runtime refs, never from display names.
- Ordered joins use `hub_merge_videos`; `hub_ffmpeg` handles trims, filters, muxing and overlays.
- Requested subtitles are a three-step chain: a timed-text source (user SRT, or an SRT written from known line timings), `hub_subtitle_format` with the final `output_size` and `style_preset: social_safe` by default, then an `hub_ffmpeg` burn that uses the formatter's `absolute_path`. Subtitle intermediates are not canvas nodes unless the file itself is the deliverable. Without a subtitle request, the Post item states that nothing is burned in.

## Mid-plan Replan

Use `hub_plan_replan` when the user asks for a change that reshapes the current or later stages while the workflow binding stays the same; use `hub_plan_patch_stage` for a local fix to the current stage.

- The tool derives the preserved prefix (everything before the execution frontier) and refuses operations on it. Leave `preserve_through_stage_id` out, or pass exactly the stage just before the frontier.
- One call carries the whole batch in `operations[]`: `revise_stage` (authored stage, same deliverable), `insert_stage` (author a new stage right after `after_stage_id`, with a `name`), `insert_stage_outline` (future entry only: `after_stage_id`, `stage: { stage_id, name }`), `omit_stage` (unauthored entry), `remove_unexecuted_stage` (authored, never started). `revise_stage` and `insert_stage` take the same flat stage fields as `hub_plan_patch_stage`.
- Also send `request_id`, `expected_revision` from the latest read, and a short `reason`. Repeating a `request_id` is safe; on a revision conflict, re-read and rebuild.
- Do not author future stages, items, refs, prompts or documents inside the batch. Affected authored stages get their runtime reset by the tool.
- `resume_stage_id` only points attention; execution continues from the earliest unresolved outline entry, and normal review still applies.

## Example

```yaml
plan:
  workflow: { path: ad-tvc/workflow.md }
  header_fields: { project_type: ad-tvc, working_language: zh }
  sources:
    - { id: src_brief, kind: uploaded_brief, node_id: <canvas node id>, execution_excerpt: <short summary> }
  stage_outline:
    - { id: script, order: 1, name: 脚本 }
    - { id: anchors, order: 2, name: 角色与产品锚点 }
    - { id: clips, order: 3, name: 分镜视频 }
    - { id: post, order: 4, name: 成片 }
  stages:
    - stage_id: script
      order: 1
      goal: 写出 30 秒广告脚本
      review: { after_execution: [旁白与镜头顺序符合 brief] }
      work_items:
        - { id: doc_script, name: 广告脚本, modality: document, document_node_id: <returned node id> }
# later, stage 3 appended with hub_plan_patch_stage:
stage:
  stage_id: clips
  order: 3
  goal: 生成四段分镜视频
  depends_on: [anchors]
  review: { before_execution: [四段视频的最终 prompt 与参考图对应关系] }
  stage_fields: { max_generated_clip_duration_s: 10, execution_policy: parallel_independent_work_items }
  execution_locks:
    - { vendor: MiniMax, model_id: MiniMax-H3, aspect_ratio: "9:16", resolution: 768P }
  constraints:
    - { rule: 产品包装文字保持与参考图一致 }
  work_items:
    - id: sg_01
      name: 开场特写
      modality: video
      refs: [char_host, prod_bottle]
      source: { clip_group_id: sg_01, source_scene_range: 场景1 }
      render: { duration_target_s: 5, audio_approach: 现场环境声与开瓶音效 }
      prompt: <finished prompt naming image 1 and image 2 and what each fixes>
```
