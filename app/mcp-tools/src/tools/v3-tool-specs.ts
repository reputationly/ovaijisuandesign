/**
 * v3 工具的描述与 schema —— **逐字来自参照**，不要手改。
 *
 * 生成器：`node scripts/mcp-compare/gen-v3-schemas.mjs`
 * 数据源：`scripts/mcp-compare/reference-tools.json`（真跑参照 mcp-tools-v3 的 tools/list）
 *
 * 为什么必须是原文：v3 的 agent 配置是照参照复制的，它会按参照的参数名调用工具。
 * 参数名或描述不同，agent 的工具调用就会失败（验收第 M6 项曾因此不通过）。
 *
 * 注意：本文件只由生成器产出。要改 schema，先改参照抓包再重新生成，
 * 手改会在下次生成时被覆盖。
 */
import { z } from "zod";

export interface V3ToolSpec {
  description: string;
  /** 顶层是 raw shape（ZodRawShape）；registrar 会包成 z.object(shape).passthrough()。 */
  shape: Record<string, z.ZodTypeAny>;
}

export const V3_TOOL_SPECS = {
  "project_rules": {
    description: "Read or save the current project’s persistent working rules. Use save only when the user explicitly asks to remember, change, or remove a lasting project rule. First read, then merge into the complete Markdown document and save with the returned revision. Preserve unrelated rules. Confirm the change to the user only after save succeeds. Rules are loaded automatically for every model request. Temporary instructions and ordinary feedback do not change this document.",
    shape: {
      "action": z.enum(["read", "save"]),
      "content": z.string().describe("Required for save: complete Markdown rules (max 16 KiB UTF-8). Empty text clears all rules.").optional(),
      "expectedRevision": z.union([z.string(), z.null()]).describe("Required for save: exact revision returned by read, including null for a missing document. On conflict, read again and merge; never blindly retry.").optional(),
    },
  },
  "execute": {
    description: "Execute a media capability or native editor operation after reading capability_get. Editors: pass only capabilityId and plugin (method, contractVersion, explicit target, args, write preconditions); the first renderer operation prepares the editor and executes without another model turn. Recover unknown outcomes with command.get, never repeat writes blindly. Media: declared params and ordered references only; output is required before submission. Durable generation returns {task}; create targets get compositionId on submission. Synchronous edit_media returns {delivery}; transcription uses billable cloud ASR, file transforms are local. Results are in envelope.outputs. Adoption/placement problems reuse delivered content for recovery. Completed results are final. Cost confirmation belongs to the user in the app; execute waits, and cancelled means declined or unconfirmed. The host assigns task.id; no caller requestId. After interrupted waits use design_task_wait with that taskId; resubmission starts new work.",
    shape: {
      "capabilityId": z.string().min(1).max(512),
      "prompt": z.string().max(64000).describe("Required non-empty text for model generation: image/video prompt, speech script or music brief. Describe ONE finished result; use count for variations. For images, \"two images\" or \"the first ... the second ...\" can pack scenes into one image, repeated for each paid variation. Fixed tools without authored text may omit it.").optional(),
      "params": z.record(z.string(), z.unknown()).describe("Flat parameters for the selected capability, exactly as design_capability_get declares them in paramSchema. Never nest them or pass media paths; references carry media.").optional(),
      "references": z.array(z.union([z.union([z.object({
      "versionId": z.string().min(1).max(512),
    }), z.object({
      "resourceId": z.string().min(1).max(512),
    }), z.object({
      "compositionId": z.string().min(1).max(512),
      "resourceId": z.string().min(1).max(512),
    }), z.object({
      "compositionId": z.string().min(1).max(512),
      "memberId": z.string().min(1).max(512),
    })]), z.null()])).min(0).max(100).describe("Ordered input content for the selected capability. Each entry is exactly one of: {resourceId} to follow that Resource's current ready version (default choice); {versionId} to pin an intentionally selected exact version whose identity is established by context, a tool result, a user attachment or a plan file. An earlier versionId does not establish the current selection; {compositionId, resourceId} to freeze that member resource's current ready version; {compositionId, memberId} to expand every resource of that member in stored order. How many entries a capability takes, and of which media kind, is in design_capability_get. Resolving these inputs does not write Composition memberships. In a frame mode whose references declare lastFrameOnly, pass [null, <last frame>] to give only the closing frame; null is accepted nowhere else.").optional(),
      "count": z.number().int().min(1).max(9).describe("Variations of this same request, 1-9 (default 1). Same prompt and params, billed separately; different content needs separate calls. \"Two candidate images of the same dancing cat\": count=2; \"one street image and one stage image\": two calls; \"one image with two cats\": count=1. Declare one Resource target without a key: outputs primary, primary_2, ... are versions of ONE Resource. After all settle, the lowest preallocated-ordinal successful version becomes current for a new Resource; for new_version, adopted also requires current=baseVersionId. Conflicts and other variations remain candidates; candidate preserves current. Failed variations are absent from task.outputs and not retried; one success suffices for completion. edit_media ignores count and produces one result.").optional(),
      "plugin": z.object({
      "method": z.string().min(1).max(512),
      "contractVersion": z.string().min(1).max(512),
      "target": z.object({
      "sourceResourceId": z.string().min(1).max(512).optional(),
      "compositionId": z.string().min(1).max(512).optional(),
      "nodeId": z.string().min(1).max(512).optional(),
      "canvasId": z.string().min(1).max(512).optional(),
    }),
      "args": z.record(z.string(), z.unknown()),
      "expectedDraftRevision": z.number().int().min(0).optional(),
      "baseVersionId": z.string().min(1).max(512).optional(),
    }).optional(),
      "output": z.object({
      "resources": z.array(z.union([z.object({
      "key": z.string().min(1).max(512).describe("Output this entry is for. Omit it when the call has one output (primary); name it only to address one of several outputs.").optional(),
      "mode": z.literal("create").describe("Create an independently maintained Resource."),
      "name": z.string().min(1).max(512).describe("User-visible Resource name in working_language describing its content (e.g. \"红龙苏醒片段\", \"宣传片成片\"); shown in the asset library and used as the exported file name. Not a file name or slug: no extension, hyphenated sequence numbers, durations or code identifiers."),
      "description": z.string().max(2000).optional(),
    }), z.object({
      "key": z.string().min(1).max(512).describe("Output this entry is for. Omit it when the call has one output (primary); name it only to address one of several outputs.").optional(),
      "mode": z.literal("new_version").describe("Revise or replace the content of an existing Resource from any source, preserving its identity and history."),
      "resourceId": z.string().min(1).max(512),
      "baseVersionId": z.string().min(1).max(512).describe("Exact parent version belonging to resourceId. Required with disposition=adopted, where it is also the expected current version.").optional(),
      "disposition": z.enum(["adopted", "candidate"]).describe("adopted selects the result as current only if the current version still equals baseVersionId; a conflict retains a candidate for resolution. candidate (the default) saves the result without changing current and cannot be placed in a Composition.").optional(),
    })])).min(1).max(100).describe("Where the result is saved: mode=create with a name, or mode=new_version with resourceId. Subtitle, lyric and layer outputs receive their own Resources automatically."),
      "composition": z.object({
      "compositionId": z.string().min(1).max(512).describe("Existing Composition ID from a query or creation result. Exclusive with type/name.").optional(),
      "type": z.union([z.object({
      "id": z.string().min(1).max(512).describe("Registered type ID from context or design_composition_type_list."),
      "label": z.string().min(1).max(256).optional(),
      "description": z.string().max(2000).optional(),
    }), z.object({
      "label": z.string().min(1).max(256).describe("Find a registered type by label, or create it with a gateway-generated ID."),
      "description": z.string().max(2000).optional(),
    })]).describe("With name: finds the active Composition with this resolved type and trimmed name, or creates it. Exclusive with compositionId.").optional(),
      "name": z.string().min(1).max(512).describe("Name of the new Composition.").optional(),
      "attributes": z.record(z.string(), z.string().max(2000)).describe("New Composition only. Initial object attributes in working_language; existing attributes are preserved. Later edits use composition_edit action=set_attributes.").optional(),
      "position": z.number().int().min(0).max(1000000000).describe("New Composition only. Set only for ordered content (episodes, shots, chapters); omitted items sort last. Unique integer within the type, ascending; leave gaps for inserts. Keep series in non-overlapping ordered ranges, or use placement to preserve group order. Taken values fail: reread or use placement. Exclusive with placement. Creation only; existing matches keep position. Parallel same-position calls use the next free value in call order (original in requestedPosition).").optional(),
      "placement": z.union([z.object({
      "after": z.string().min(1).max(512),
    }), z.object({
      "before": z.string().min(1).max(512),
    })]).describe("New Composition only. Place before/after a same-type Composition. The gateway assigns position; never compute one yourself. Neighbours may change position, reported as renumbered. Exclusive with position.").optional(),
      "placements": z.array(z.object({
      "key": z.string().min(1).max(512).describe("Output this entry is for. Omit it when the call has one output (primary); name it only to address one of several outputs.").optional(),
      "role": z.string().min(1).max(512).describe("Adds the output as a new member with this role: a user-visible label for its purpose within the Composition, in working_language (e.g. \"正面全身\"). Reuse existing wording for the same purpose; roles may repeat; no code identifiers. Every further independent Resource the call creates under that output (key_2, key_3, ...; e.g. the layers of a layer decomposition) gets a member with the same role. Give role or memberId, not both.").optional(),
      "memberId": z.string().min(1).max(512).describe("Fills this existing empty member instead of adding one; a member already holding a Resource is reported unavailable. To change what a held member shows, use new_version on its Resource.").optional(),
    })).min(1).max(50).describe("Required, one entry per output: role adds a member, memberId fills an existing one. key may be omitted for the primary output."),
    }).describe("Canvas-visible placement required for every create target; omit only when every target is a new_version already in a Composition. compositionId targets an existing object; type + name finds/creates an active one by exact type ID + trimmed name. Both require placements. Parallel outputs for one new object use the same type ID/name; call in the same step without waiting for its compositionId.").optional(),
    }).describe("Required for media: declare resources and their Composition placements. Media edits declare exactly one primary Resource. Example: {\"resources\":[{\"mode\":\"create\",\"name\":\"视频\"}],\"composition\":{\"type\":{\"label\":\"视频\"},\"name\":\"作品\",\"placements\":[{\"role\":\"主视频\"}]}}").optional(),
    },
  },
  "deliver": {
    description: "Synchronously deliver existing versions, archived task artifacts or workspace files into Resources and Compositions; no generation, billing or Task. Imported files have no lineage. Files that are not image/video/audio/text (Word/PDF, HTML, code, archives) become FILE Resources; read Word/PDF and text-based FILEs with design_read(versionId), not execute media references. reuse places an existing Resource without copying and requires a versionId source. To swap what a member shows, even with another Resource version, use new_version on the Resource it holds. Returns {delivery}: completed is final; unknown requires the same requestId and exact input, never regeneration; blocked requires corrected input with a new requestId, reusing delivered versionIds. No background delivery or wait tool. Targets and placements live inside output, never beside sources. Example: {\"requestId\":\"deliver-promo-1\",\"sources\":[{\"key\":\"video\",\"path\":\"out/promo_cut.mp4\"},{\"key\":\"cover\",\"path\":\"out/promo_cover.png\"}],\"output\":{\"resources\":[{\"key\":\"video\",\"mode\":\"create\",\"name\":\"宣传片成片\"},{\"key\":\"cover\",\"mode\":\"create\",\"name\":\"宣传片封面\"}],\"composition\":{\"type\":{\"id\":\"video\",\"label\":\"视频\"},\"name\":\"新品宣传片\",\"placements\":[{\"key\":\"video\",\"role\":\"主视频\"},{\"key\":\"cover\",\"role\":\"封面\"}]}}}",
    shape: {
      "requestId": z.string().min(1).max(512).describe("Stable caller-generated idempotency identity; retain before dispatch and reuse unchanged on retry."),
      "sources": z.array(z.union([z.object({
      "key": z.string().min(1).max(512).describe("Omit for a sole source; with several, a distinct key per source.").optional(),
      "versionId": z.string().min(1).max(512),
    }), z.object({
      "key": z.string().min(1).max(512).describe("Omit for a sole source; with several, a distinct key per source.").optional(),
      "artifactId": z.string().min(1).max(512),
    }), z.object({
      "key": z.string().min(1).max(512).describe("Omit for a sole source; with several, a distinct key per source.").optional(),
      "path": z.string().min(1).max(4096).describe("Workspace file path for content that is not a Resource yet. Must be a non-empty regular file of at most 50 MiB inside the workspace, outside `.hilo/`, and not a symlink; any file type is accepted (e.g. index.html becomes a FILE the canvas previews). Never a URL or a path outside the workspace."),
    })])).min(1).max(100).describe("Supply exactly one source per item: versionId for an existing version, artifactId for an archived task artifact, or path for an unregistered workspace file. A sole source needs no key; several sources each take a distinct key that output.resources and placements use."),
      "output": z.object({
      "resources": z.array(z.union([z.union([z.object({
      "key": z.string().min(1).max(512).describe("Output this entry is for. Omit it when the call has one output (primary); name it only to address one of several outputs.").optional(),
      "mode": z.literal("create").describe("Create an independently maintained Resource."),
      "name": z.string().min(1).max(512).describe("User-visible Resource name in working_language describing its content (e.g. \"红龙苏醒片段\", \"宣传片成片\"); shown in the asset library and used as the exported file name. Not a file name or slug: no extension, hyphenated sequence numbers, durations or code identifiers."),
      "description": z.string().max(2000).optional(),
    }), z.object({
      "key": z.string().min(1).max(512).describe("Output this entry is for. Omit it when the call has one output (primary); name it only to address one of several outputs.").optional(),
      "mode": z.literal("new_version").describe("Revise or replace the content of an existing Resource from any source, preserving its identity and history."),
      "resourceId": z.string().min(1).max(512),
      "baseVersionId": z.string().min(1).max(512).describe("Exact parent version belonging to resourceId. Required with disposition=adopted, where it is also the expected current version.").optional(),
      "disposition": z.enum(["adopted", "candidate"]).describe("adopted selects the result as current only if the current version still equals baseVersionId; a conflict retains a candidate for resolution. candidate (the default) saves the result without changing current and cannot be placed in a Composition.").optional(),
    })]), z.object({
      "key": z.string().min(1).max(512).describe("Output this entry is for. Omit it when the call has one output (primary); name it only to address one of several outputs.").optional(),
      "mode": z.literal("reuse"),
    })])).min(1).max(100).describe("One target per source: create a named Resource, write a new version of an existing Resource, or reuse (place a versionId source as is). With several sources, each target names its source key."),
      "composition": z.object({
      "compositionId": z.string().min(1).max(512).describe("Existing Composition ID from a query or creation result. Exclusive with type/name.").optional(),
      "type": z.union([z.object({
      "id": z.string().min(1).max(512).describe("Registered type ID from context or design_composition_type_list."),
      "label": z.string().min(1).max(256).optional(),
      "description": z.string().max(2000).optional(),
    }), z.object({
      "label": z.string().min(1).max(256).describe("Find a registered type by label, or create it with a gateway-generated ID."),
      "description": z.string().max(2000).optional(),
    })]).describe("With name: finds the active Composition with this resolved type and trimmed name, or creates it. Exclusive with compositionId.").optional(),
      "name": z.string().min(1).max(512).describe("Name of the new Composition.").optional(),
      "attributes": z.record(z.string(), z.string().max(2000)).describe("New Composition only. Initial object attributes in working_language; existing attributes are preserved. Later edits use composition_edit action=set_attributes.").optional(),
      "position": z.number().int().min(0).max(1000000000).describe("New Composition only. Set only for ordered content (episodes, shots, chapters); omitted items sort last. Unique integer within the type, ascending; leave gaps for inserts. Keep series in non-overlapping ordered ranges, or use placement to preserve group order. Taken values fail: reread or use placement. Exclusive with placement. Creation only; existing matches keep position. Parallel same-position calls use the next free value in call order (original in requestedPosition).").optional(),
      "placement": z.union([z.object({
      "after": z.string().min(1).max(512),
    }), z.object({
      "before": z.string().min(1).max(512),
    })]).describe("New Composition only. Place before/after a same-type Composition. The gateway assigns position; never compute one yourself. Neighbours may change position, reported as renumbered. Exclusive with position.").optional(),
      "placements": z.array(z.object({
      "key": z.string().min(1).max(512).describe("Output this entry is for. Omit it when the call has one output (primary); name it only to address one of several outputs.").optional(),
      "role": z.string().min(1).max(512).describe("Adds the output as a new member with this role: a user-visible label for its purpose within the Composition, in working_language (e.g. \"正面全身\"). Reuse existing wording for the same purpose; roles may repeat; no code identifiers. Every further independent Resource the call creates under that output (key_2, key_3, ...; e.g. the layers of a layer decomposition) gets a member with the same role. Give role or memberId, not both.").optional(),
      "memberId": z.string().min(1).max(512).describe("Fills this existing empty member instead of adding one; a member already holding a Resource is reported unavailable. To change what a held member shows, use new_version on its Resource.").optional(),
    })).min(1).max(50).describe("Required, one entry per output: role adds a member, memberId fills an existing one. key may be omitted for the primary output."),
    }).describe("Canvas-visible placement required for every create/reuse target; omit only when every target is a new_version already in a Composition. compositionId targets an existing object; type + name finds/creates an active one by exact type ID + trimmed name. Both require placements. Parallel outputs for one new object use the same type ID/name; call in the same step without waiting for its compositionId.").optional(),
    }),
    },
  },
  "task_query": {
    description: "Read authorized project tasks: get requires taskId and returns {task,input}, the task in the same form execute returns and input the frozen request; list accepts query filters and returns {items,nextCursor}, each item carrying id, capabilityId, status, createdAt, a prompt excerpt, outputs and compositionId so this conversation's results (query.sessionId) can be matched to what the user means. task.problem.source identifies input, provider, billing, delivery or system problems; problem.upstream carries provider diagnostics, and task.actions advertises available recovery decisions. Never resubmit a failed task on your own; when the user asks to retry it, use design_task_resolve action=retry. When the user asks for a new generation, use design_execute. This tool never generates or retries work.",
    shape: {
      "mode": z.enum(["get", "list"]),
      "taskId": z.string().min(1).max(512).optional(),
      "query": z.object({
      "status": z.array(z.enum(["accepted", "running", "waiting_user", "unknown", "completed", "failed", "cancelled"])).min(1).max(7).optional(),
      "operation": z.array(z.enum(["generate_image", "generate_video", "generate_speech", "generate_music"])).min(1).max(5).optional(),
      "source": z.enum(["agent", "frontend"]).optional(),
      "sessionId": z.string().min(1).max(512).optional(),
      "userMessageId": z.string().min(1).max(512).optional(),
      "toolUseId": z.string().min(1).max(512).optional(),
      "resourceId": z.string().min(1).max(512).optional(),
      "versionId": z.string().min(1).max(512).optional(),
      "compositionId": z.string().min(1).max(512).optional(),
      "createdFrom": z.number().int().min(0).optional(),
      "createdTo": z.number().int().min(0).optional(),
      "limit": z.number().int().min(1).max(50).optional(),
      "cursor": z.string().min(1).max(4096).optional(),
    }).optional(),
    },
  },
  "task_wait": {
    description: "Continue an interrupted wait or wait after resuming the SAME taskId until completed, failed, cancelled, waiting_user or unknown; the user decides a cost confirmation in the app, so the wait continues through it. Returns {task} in the same compact form as execute, including any problem and available actions. Not needed after execute completes. Wait errors do not mean generation failed; do not resubmit on your own. Disconnecting does not cancel the task. cancelled means the user stopped it, or never confirmed its cost, before anything was submitted; do not resubmit unless the user asks again.",
    shape: {
      "taskId": z.string().min(1).max(512),
    },
  },
  "task_resolve": {
    description: "Apply task.actions with the latest task.revision as expectedRevision; returns {task}. On revision conflict, reread before deciding. Never confirm cost for the user. stop abandons only unsubmitted subtasks; submitted work still finishes and delivers. Delivery recovery reuses generated content. retry requires a user request and an offered action (up to 3 retries): resumes the same Task, keeps completed results, fetches lost results without new charges, and resubmits/bills only failed generations. Tell the user any cost shown in task.billing first. Waits like execute. For new generation, read input with design_task_query and use design_execute.",
    shape: {
      "taskId": z.string().min(1).max(512),
      "expectedRevision": z.number().int().min(1),
      "action": z.enum(["pause", "resume", "stop", "adopt_version", "finish_as_candidate", "update_placement", "finish_without_placement", "retry"]),
      "expectedCurrentVersionId": z.string().min(1).max(512).optional(),
      "key": z.string().min(1).max(512).describe("Output the decision is for (adopt_version, finish_as_candidate, finish_without_placement). Omit for a single-output Task.").optional(),
      "composition": z.object({
      "compositionId": z.string().min(1).max(512).describe("Existing Composition ID from a query or creation result. Exclusive with type/name.").optional(),
      "type": z.union([z.object({
      "id": z.string().min(1).max(512).describe("Registered type ID from context or design_composition_type_list."),
      "label": z.string().min(1).max(256).optional(),
      "description": z.string().max(2000).optional(),
    }), z.object({
      "label": z.string().min(1).max(256).describe("Find a registered type by label, or create it with a gateway-generated ID."),
      "description": z.string().max(2000).optional(),
    })]).describe("With name: finds the active Composition with this resolved type and trimmed name, or creates it. Exclusive with compositionId.").optional(),
      "name": z.string().min(1).max(512).describe("Name of the new Composition.").optional(),
      "attributes": z.record(z.string(), z.string().max(2000)).describe("New Composition only. Initial object attributes in working_language; existing attributes are preserved. Later edits use composition_edit action=set_attributes.").optional(),
      "position": z.number().int().min(0).max(1000000000).describe("New Composition only. Set only for ordered content (episodes, shots, chapters); omitted items sort last. Unique integer within the type, ascending; leave gaps for inserts. Keep series in non-overlapping ordered ranges, or use placement to preserve group order. Taken values fail: reread or use placement. Exclusive with placement. Creation only; existing matches keep position. Parallel same-position calls use the next free value in call order (original in requestedPosition).").optional(),
      "placement": z.union([z.object({
      "after": z.string().min(1).max(512),
    }), z.object({
      "before": z.string().min(1).max(512),
    })]).describe("New Composition only. Place before/after a same-type Composition. The gateway assigns position; never compute one yourself. Neighbours may change position, reported as renumbered. Exclusive with position.").optional(),
      "placements": z.array(z.object({
      "key": z.string().min(1).max(512).describe("Output this entry is for. Omit it when the call has one output (primary); name it only to address one of several outputs.").optional(),
      "role": z.string().min(1).max(512).describe("Adds the output as a new member with this role: a user-visible label for its purpose within the Composition, in working_language (e.g. \"正面全身\"). Reuse existing wording for the same purpose; roles may repeat; no code identifiers. Every further independent Resource the call creates under that output (key_2, key_3, ...; e.g. the layers of a layer decomposition) gets a member with the same role. Give role or memberId, not both.").optional(),
      "memberId": z.string().min(1).max(512).describe("Fills this existing empty member instead of adding one; a member already holding a Resource is reported unavailable. To change what a held member shows, use new_version on its Resource.").optional(),
    })).min(1).max(50).describe("Required, one entry per output: role adds a member, memberId fills an existing one. key may be omitted for the primary output."),
    }).describe("update_placement only: the existing Composition (compositionId) plus placements, one per output still awaiting placement, each with role or memberId.").optional(),
    },
  },
  "resource_search": {
    description: "Find project resources by name, description, type or creation time. Returns summaries, not file content. Omit text to browse. resource_get provides an individual Resource snapshot or its version history.",
    shape: {
      "text": z.string().max(2000).optional(),
      "kinds": z.array(z.enum(["text", "image", "video", "audio"])).min(1).max(4).optional(),
      "lifecycle": z.array(z.enum(["active", "missing", "archived", "deleted"])).min(1).max(4).optional(),
      "createdFrom": z.number().int().min(0).optional(),
      "createdTo": z.number().int().min(0).optional(),
      "order": z.object({
      "by": z.enum(["createdAt", "updatedAt"]),
      "direction": z.enum(["asc", "desc"]),
    }).optional(),
      "limit": z.number().int().min(1).max(50).optional(),
      "cursor": z.string().min(1).max(4096).optional(),
    },
  },
  "resource_get": {
    description: "Read a known Resource or Version independently of Composition membership. view=current (default) returns Resource metadata and one content version: resourceId selects current, versionId selects that exact version. Resource metadata includes currentVersionId and metadataRevision for version selection and metadata edits. Missing historical content stays unavailable. view=current also reads up to 20 at once through resourceIds or versionIds (one of them, never mixed, never with resourceId/versionId): items answer in request order, and an unreadable id is an item-level error carrying that id instead of failing the batch. view=versions lists paginated versions of resourceId, newest first, with isCurrent. view=relations returns one-hop inputs or derivatives of versionId, or Composition memberships of resourceId, chosen by relation.",
    shape: {
      "view": z.enum(["current", "versions", "relations"]).optional(),
      "resourceId": z.string().min(1).max(512).optional(),
      "versionId": z.string().min(1).max(512).optional(),
      "resourceIds": z.array(z.string().min(1).max(512)).min(1).max(20).describe("view=current batch: current versions of these Resources.").optional(),
      "versionIds": z.array(z.string().min(1).max(512)).min(1).max(20).describe("view=current batch: these exact versions.").optional(),
      "relation": z.enum(["inputs", "derivatives", "compositions"]).optional(),
      "limit": z.number().int().min(1).max(50).optional(),
      "cursor": z.string().min(1).max(4096).optional(),
    },
  },
  "resource_preview": {
    description: "Inspect a fixed version as metadata or bounded model-readable content. Image edge 256–2048; video/audio at most 60 seconds; video at most 8 frames; text at most 200 lines / 16000 characters. Preview is not the complete source.",
    shape: {
      "versionId": z.string().min(1).max(512),
      "mode": z.enum(["metadata", "content"]).optional(),
      "maxEdge": z.number().int().min(256).max(2048).optional(),
      "frames": z.number().int().min(1).max(8).optional(),
      "range": z.object({
      "startSeconds": z.number().min(0).optional(),
      "endSeconds": z.number().min(0).optional(),
      "startLine": z.number().int().min(1).optional(),
      "lineCount": z.number().int().min(1).max(200).optional(),
    }).optional(),
    },
  },
  "composition_search": {
    description: "Find anything already in the project: uploaded, generated or previously searched images, videos, audio and documents, and the characters, products, scenes or other objects they belong to. Search here first whenever the user refers to existing material or names something, before any web search. text matches the Composition name, its attribute values and the names and descriptions of its member Resources; type narrows to a registered type ID; attributes are exact key/value conditions combined with AND. Omit every filter to browse. Each hit carries its attributes and revision, which can serve as the basis for an edit without another read, and position when its type is ordered. Hits default to updatedAt descending; use order to sort by creation time, update time or ascending position. Member details are available through composition_get when needed. Returns paginated hits; lifecycle appears only on a hit that is not active.",
    shape: {
      "text": z.string().max(2000).describe("Substring of a Composition name, attribute value, or member Resource name or description, such as a character name or an earlier output title.").optional(),
      "type": z.string().min(1).max(512).describe("Registered type ID; composition_type_list lists available IDs.").optional(),
      "attributes": z.record(z.string(), z.string().max(2000)).optional(),
      "lifecycle": z.array(z.enum(["active", "archived", "deleted"])).min(1).max(3).optional(),
      "order": z.union([z.object({
      "by": z.enum(["createdAt", "updatedAt"]),
      "direction": z.enum(["asc", "desc"]),
    }), z.object({
      "by": z.literal("position"),
      "direction": z.literal("asc"),
    })]).describe("Defaults to updatedAt desc. position supports asc only: ordered hits first by position, then unordered hits oldest first. Keep order unchanged when following nextCursor.").optional(),
      "limit": z.number().int().min(1).max(50).describe("Maximum number of Composition hits to return: 1–50. Use nextCursor for additional pages.").optional(),
      "cursor": z.string().min(1).max(4096).describe("Opaque nextCursor returned by the previous page; pass it unchanged.").optional(),
    },
  },
  "composition_type_list": {
    description: "List registered Composition types, including types with no Compositions. Use when choosing a type for a Composition if the current context does not already establish a suitable registered type. text matches type labels or descriptions; omit it to list all types. Returns type definitions with id, label and optional description. Reuse an existing type with matching meaning; create a new type only when no existing type fits, not merely because its name or wording differs.",
    shape: {
      "text": z.string().max(2000).optional(),
    },
  },
  "composition_get": {
    description: "Read one Composition (compositionId) or up to 20 at once (compositionIds), each with attributes, revision and members; every member holds at most one Resource and embeds its snapshot under resource, which is absent for an empty slot. A single read paginates members (limit 1–50, then nextCursor) and accepts memberId/role filters. A batch answers every id in request order under items and reports a missing id as an item-level error. It returns whole member lists while they fit within 100 Resources total and 100 members per Composition. At the first list that cannot fit, that Composition and all later ones retain their other information but omit members entirely, with membersOmitted=true and a result notice. Omitted members are unknown, not empty; if needed, read those Composition IDs again in a smaller batch or use a single paginated read. Members follow each Resource's current version; revision is not a historical content snapshot. CURSOR_STALE requires restarting pagination.",
    shape: {
      "compositionId": z.string().min(1).max(512).optional(),
      "compositionIds": z.array(z.string().min(1).max(512)).min(1).max(20).describe("Batch read; mutually exclusive with compositionId and member filters.").optional(),
      "memberId": z.string().min(1).max(512).optional(),
      "role": z.string().min(1).max(512).describe("Exact member role label as stored on the Composition.").optional(),
      "limit": z.number().int().min(1).max(50).describe("Single read: maximum number of members to return: 1–50. Use nextCursor for additional pages.").optional(),
      "cursor": z.string().min(1).max(4096).describe("Opaque nextCursor returned by the previous page; pass it unchanged.").optional(),
    },
  },
  "resource_edit": {
    description: "Select a Resource's current version (adopt), or update its version-independent name and purpose description (describe), independently of Composition membership. Adoption changes the content shown by its Composition members, without changing Composition attributes. Send only changed fields. Use a valid Resource snapshot to establish expectedCurrentVersionId for adopt or expectedMetadataRevision for describe. On mismatch, refresh the snapshot and reassess the edit rather than blindly retrying. Success returns currentVersionId and metadataRevision for subsequent edits. Creates no content and never deletes or uploads. action=batch accepts 1-20 adopt/describe commands executed in order within one transaction and returns results in the same order, each with its resourceId; a mismatch in any command rolls back the entire batch and reports that command's index and conflict. Batch takes only action and commands; nested batches are unsupported. Successive edits to the same Resource must account for earlier changes in the batch: adopting a Resource that had no content also increments its metadataRevision.",
    shape: {
      "action": z.enum(["adopt", "describe", "batch"]),
      "resourceId": z.string().min(1).max(512).describe("Required unless action=batch.").optional(),
      "versionId": z.string().min(1).max(512).describe("action=adopt: the version to make current.").optional(),
      "expectedCurrentVersionId": z.string().min(1).max(512).describe("action=adopt: current version from the Resource snapshot this edit is based on.").optional(),
      "name": z.string().min(1).max(512).describe("action=describe: the new user-facing name.").optional(),
      "description": z.string().max(2000).describe("action=describe: the new description.").optional(),
      "expectedMetadataRevision": z.number().int().min(0).describe("action=describe: revision of the Resource metadata snapshot being edited.").optional(),
      "commands": z.array(z.object({
      "action": z.enum(["adopt", "describe"]),
      "resourceId": z.string().min(1).max(512),
      "versionId": z.string().min(1).max(512).describe("action=adopt: the version to make current.").optional(),
      "expectedCurrentVersionId": z.string().min(1).max(512).describe("action=adopt: current version from the Resource snapshot this edit is based on.").optional(),
      "name": z.string().min(1).max(512).describe("action=describe: the new user-facing name.").optional(),
      "description": z.string().max(2000).describe("action=describe: the new description.").optional(),
      "expectedMetadataRevision": z.number().int().min(0).describe("action=describe: revision of the Resource metadata snapshot being edited.").optional(),
    })).min(1).max(20).describe("batch only: adopt/describe commands executed atomically in order.").optional(),
    },
  },
  "composition_edit": {
    description: "Edit Composition metadata, members or order without generation. ensure resolves a registered typeId or finds/creates a type by label, then finds/creates an active object by type + name, returning typeId, compositionId, revision, created; existing metadata stays unchanged. Optional operations apply atomically. For a new Composition receiving execute/deliver outputs, use output.composition with type and name: creation waits until submission, avoiding empty objects on cancellation. Use ensure with operations for document_write results or directly requested structure. update atomically edits members; rename preserves identity; set_attributes patches attributes. These require compositionId and expectedRevision from a valid snapshot; on conflict reread and reassess. Added members need unique clientMemberKey, mapped to memberId in results. update_member only renames a role; to change what a member shows, deliver new_version to the Resource it holds. Removing a member keeps its Resource but hides it and its history from the canvas. move reorders an existing one using compositionId and position/placement; needs no expectedRevision and leaves revision unchanged. Never reorder by deleting, recreating or renaming. Taken positions return COMPOSITION_POSITION_CONFLICT with the holder; missing/wrong-type anchors return COMPOSITION_PLACEMENT_INVALID. Results include position and renumbered; reread positions after change notices. duplicate copies an active object on user request; do not rebuild via ensure/update. compositionId is the source; results return the new compositionId and source-to-copy memberIds. Copies type, attributes and ordered roles; each current member version becomes an independent Resource, unresolved Resources become empty slots. Names append the first free _N to the source name; ordered copies follow the source unless position/placement is set. Optional expectedRevision checks the source (COMPOSITION_REVISION_CONFLICT); duplicate is not accepted inside batch. batch takes only action and commands: 1-20 commands in order in one transaction; any failure rolls back the entire batch. No nested batches or references to earlier results. Account for revision increments when editing the same object repeatedly.",
    shape: {
      "action": z.enum(["ensure", "update", "rename", "set_attributes", "move", "duplicate", "batch"]),
      "typeId": z.string().min(1).max(512).describe("action=ensure: registered type ID; omit to find/create by label. Never invent an ID.").optional(),
      "label": z.string().min(1).max(512).describe("action=ensure: required without typeId; find by label or create with a gateway-generated ID.").optional(),
      "name": z.string().min(1).max(512).describe("ensure: initial object name; rename: new name of the SAME object.").optional(),
      "description": z.string().max(2000).describe("ensure only: description of the registered type.").optional(),
      "attributes": z.record(z.string(), z.string().max(2000)).describe("Object attributes. ensure initializes new objects only; set_attributes merges supplied keys and preserves omitted keys.").optional(),
      "unset": z.array(z.string().min(1).max(512)).max(50).describe("set_attributes only: attribute keys to remove; must not overlap attributes.").optional(),
      "compositionId": z.string().min(1).max(512).describe("The object to edit; for duplicate, the source to copy.").optional(),
      "expectedRevision": z.number().int().min(0).optional(),
      "operations": z.array(z.union([z.object({
      "action": z.literal("add_member"),
      "clientMemberKey": z.string().min(1).max(512),
      "role": z.string().min(1).max(512).describe("Member purpose in working_language, e.g. \"正面全身\"."),
      "resourceId": z.string().min(1).max(512).describe("The one Resource this member holds; omit for an empty slot.").optional(),
    }), z.object({
      "action": z.literal("remove_member"),
      "memberId": z.string().min(1).max(512),
    }), z.object({
      "action": z.literal("update_member"),
      "memberId": z.string().min(1).max(512),
      "role": z.string().min(1).max(512).describe("Member purpose in working_language, e.g. \"正面全身\"."),
    })])).min(1).max(50).describe("update: the member edits; ensure: member edits applied right after find-or-create.").optional(),
      "position": z.number().int().min(0).max(1000000000).describe("ensure (creation only; an existing match keeps its position), duplicate or move. Set only for ordered content (episodes, shots, chapters); omitted items sort last. Unique integer within the type, ascending; leave gaps for inserts. Keep series in non-overlapping ordered ranges, or use placement to preserve group order. Taken values fail: reread or use placement. Exclusive with placement.").optional(),
      "placement": z.union([z.object({
      "after": z.string().min(1).max(512),
    }), z.object({
      "before": z.string().min(1).max(512),
    })]).describe("ensure (creation only), duplicate or move. Place before/after a same-type Composition. The gateway assigns position; never compute one yourself. Neighbours may change position, reported as renumbered. Exclusive with position.").optional(),
      "commands": z.array(z.object({
      "action": z.enum(["ensure", "update", "rename", "set_attributes", "move"]),
      "typeId": z.string().min(1).max(512).describe("action=ensure: registered type ID; omit to find/create by label. Never invent an ID.").optional(),
      "label": z.string().min(1).max(512).describe("action=ensure: required without typeId; find by label or create with a gateway-generated ID.").optional(),
      "name": z.string().min(1).max(512).describe("ensure: initial object name; rename: new name of the SAME object.").optional(),
      "description": z.string().max(2000).describe("ensure only: description of the registered type.").optional(),
      "attributes": z.record(z.string(), z.string().max(2000)).describe("Object attributes. ensure initializes new objects only; set_attributes merges supplied keys and preserves omitted keys.").optional(),
      "unset": z.array(z.string().min(1).max(512)).max(50).describe("set_attributes only: attribute keys to remove; must not overlap attributes.").optional(),
      "compositionId": z.string().min(1).max(512).describe("The object to edit; for duplicate, the source to copy.").optional(),
      "expectedRevision": z.number().int().min(0).optional(),
      "operations": z.array(z.union([z.object({
      "action": z.literal("add_member"),
      "clientMemberKey": z.string().min(1).max(512),
      "role": z.string().min(1).max(512).describe("Member purpose in working_language, e.g. \"正面全身\"."),
      "resourceId": z.string().min(1).max(512).describe("The one Resource this member holds; omit for an empty slot.").optional(),
    }), z.object({
      "action": z.literal("remove_member"),
      "memberId": z.string().min(1).max(512),
    }), z.object({
      "action": z.literal("update_member"),
      "memberId": z.string().min(1).max(512),
      "role": z.string().min(1).max(512).describe("Member purpose in working_language, e.g. \"正面全身\"."),
    })])).min(1).max(50).describe("update: the member edits; ensure: member edits applied right after find-or-create.").optional(),
      "position": z.number().int().min(0).max(1000000000).describe("ensure (creation only; an existing match keeps its position), duplicate or move. Set only for ordered content (episodes, shots, chapters); omitted items sort last. Unique integer within the type, ascending; leave gaps for inserts. Keep series in non-overlapping ordered ranges, or use placement to preserve group order. Taken values fail: reread or use placement. Exclusive with placement.").optional(),
      "placement": z.union([z.object({
      "after": z.string().min(1).max(512),
    }), z.object({
      "before": z.string().min(1).max(512),
    })]).describe("ensure (creation only), duplicate or move. Place before/after a same-type Composition. The gateway assigns position; never compute one yourself. Neighbours may change position, reported as renumbered. Exclusive with position.").optional(),
    })).min(1).max(20).describe("batch only: commands executed atomically in order; no nested batch.").optional(),
    },
  },
  "document_write": {
    description: "Create, rewrite or patch a durable text Resource: a script, brief or shot list (md/txt TEXT_DOCUMENT), or any other text file such as an HTML page, CSS/JS/JSON or code (stored as a FILE Resource that the canvas previews, e.g. HTML renders as a web page). Existing text FILE Resources (subtitles, HTML, code) can also be edited while preserving their identity and kind. For localized changes prefer mode=patch: send anchored edits only, and the gateway applies them to the complete source of baseVersionId itself — no prior read of the document is needed when the anchors are already known (for example from a document-edit task or an earlier read), and unchanged text is never resent. create and replace write the complete content, never appending; replacing requires the complete source of the exact baseVersionId, including all pages, which may be reused from context or obtained through design_read when missing. On DOCUMENT_PATCH_CONFLICT nothing is written; the error lists each failed edit with nearest candidate locations — fix those edits and send the patch again. On a version conflict, refresh the document version, re-anchor if needed, then write again with the new baseVersionId. During one active chat turn, consecutive document edits (including Canvas user edits) can update the same versionId. Always pass the last read/write contentRevision as baseRevision. On DOCUMENT_REVISION_CONFLICT or DOCUMENT_REVISION_REQUIRED, read the latest document, preserve user changes and re-anchor; never just retry old content with a newer revision. Runs synchronously without a Task or billing. Replaying the same requestId with identical arguments returns the original receipt; never change arguments under an ID that already succeeded. On PROJECT_COMMAND_ID_REUSED, use a new requestId for the intended new write instead of repeating the conflicting request. This tool leaves Composition membership unchanged; design_composition_edit manages membership separately.",
    shape: {
      "requestId": z.string().min(1).max(512).describe("Unique caller-generated ID for each distinct write in this workspace (prefer a UUID). Keep it for identical retries only; new edits or changed arguments need a new ID, including across conversations."),
      "mode": z.enum(["create", "replace", "patch"]).describe("create: a new document. replace: complete content. patch: anchored edits to baseVersionId. The server reuses the current editable version within an active turn and creates a new version across turns or for fixed inputs."),
      "content": z.string().min(1).max(2097152).describe("create/replace only, required there: complete document source, at most 2097152 UTF-8 bytes. Write real content; placeholders and \"to be filled later\" are not documents.").optional(),
      "edits": z.array(z.object({
      "exact": z.string().min(1).max(100000).describe("Exact source substring to replace, copied VERBATIM from the base version source (e.g. a resolved annotation sourceExact or a design_read window). Rendered-editor text may drop markdown markers and will not match."),
      "occurrence": z.number().int().min(0).describe("Zero-based occurrence of exact in the source; required when it appears more than once.").optional(),
      "replacement": z.string().describe("Replacement source text; an empty string deletes the anchored text."),
    })).min(1).max(100).describe("mode=patch only, required there: anchored edits applied atomically (all or nothing) in source order. Edits must not overlap.").optional(),
      "format": z.string().regex(new RegExp("^\\.?[A-Za-z0-9]{1,10}$")).describe("create/replace only: file extension of the stored content, any text format (e.g. md, txt, html, css, js, json, csv, svg, srt, ass). Defaults to md. md/txt/srt/ass create a TEXT_DOCUMENT; any other format creates a FILE Resource. Binary formats (images, video, audio, Word/PDF) cannot be written as text. replace without format keeps a FILE base format; replace cannot switch between TEXT_DOCUMENT and FILE formats. Subtitles and patched versions keep the format of their base.").optional(),
      "name": z.string().min(1).max(512).describe("Required for create; optional for replace/patch to rename the document atomically with its content. Omit to preserve the name. The name belongs to the Resource, so it also changes when disposition=candidate.").optional(),
      "description": z.string().max(2000).describe("mode=create only: short description of what this document is.").optional(),
      "resourceId": z.string().min(1).max(512).describe("mode=replace/patch only: required ID of the document being rewritten.").optional(),
      "baseVersionId": z.string().min(1).max(512).describe("mode=replace/patch only, required: the exact version this write is based on. replace: its complete source is the rewrite basis. patch: edits anchor into its source.").optional(),
      "baseRevision": z.number().int().min(1).describe("replace/patch: contentRevision of the document source you read or last wrote. Required when the read/write returned it; protects concurrent Canvas edits even when versionId is unchanged.").optional(),
      "disposition": z.enum(["adopted", "candidate"]).describe("mode=replace/patch only, required: adopted makes this the current version; candidate stores it unadopted and cannot be placed in a Composition.").optional(),
    },
  },
  "image_search": {
    description: "Search the open web and download new images into the project. Use it only for outside material: the user asks for web or online references, or the task needs images the project does not have. Each kept image becomes a durable project Resource. The batch is organized into one Composition of the auto-registered `search` type, named by composition_name; each kept image becomes its own member with role `search_result`, and the per-image memberId identifies it. Reference results by resourceId/versionId or {compositionId, memberId}. Reusing composition_name appends to the existing Composition. Once a web search is warranted, queries and volume must follow the rules in `<knowledgeDir>/vendors/image-search.md`; reuse complete, applicable rules already in context, or retrieve missing guidance with design_read.",
    shape: {
      "queries": z.array(z.object({
      "query": z.string().describe("Descriptive English search keywords (2-6 words). Multi-word descriptive phrases work better than terse keyword strings. Use multiple queries for multi-angle coverage."),
      "num": z.number().describe("Number of search results to fetch (default 10)").default(10).optional(),
    })).min(1).max(4).describe("Search queries (1-4). Cover the requested subjects or meaningful angles while retaining every required trait."),
      "max_images_per_query": z.number().describe("Maximum images to download per query (default 5).").default(5).optional(),
      "max_total_images": z.number().int().min(1).describe("Global maximum across all queries. Use this for the user-requested total count.").optional(),
      "min_dimension": z.number().describe("Minimum short-side pixel dimension to keep (default 500)").default(500).optional(),
      "composition_name": z.string().min(1).max(512).describe("Name of the delivered `search` Composition. Name it after the search task, e.g. \"Cyberpunk street reference\". Reusing an existing name appends to that Composition."),
      "composition_description": z.string().max(2000).describe("Optional description stored on the Composition.").optional(),
    },
  },
  "analyse_media": {
    description: "Inspect image, video or audio Resources. metadata reads measured file facts without AI inference; semantic answers a concrete question about visible or audible content; both returns both.",
    shape: {
      "references": z.array(z.union([z.object({
      "resourceId": z.string().min(1).max(512),
      "question": z.string().min(1).max(8000).describe("Question for this media item. Required for semantic or both.").optional(),
    }), z.object({
      "versionId": z.string().min(1).max(512),
      "question": z.string().min(1).max(8000).describe("Question for this media item. Required for semantic or both.").describe("Question for this media item. Required for semantic or both.").optional(),
    })])).min(1).max(20).describe("Media to inspect, in order, each with its own question. Use resourceId for its current version or versionId for an exact version from context or a tool result. Composition members must be addressed by their Resource IDs; design_composition_get can supply missing member details. File paths are not accepted."),
      "type": z.enum(["metadata", "semantic", "both"]).describe("metadata: measured file facts only; semantic: question-focused observations; both: both kinds of evidence."),
    },
  },
  "capability_list": {
    description: "List media production and native editor plugin capabilities. kind=plugin reads the fixed editor catalog independently of cloud models; kind=media retains production discovery. kind=plugin cannot combine with operation. When editor context already names a capability, go directly to capability_get. List production capabilities available to this account and session: models, fixed tools and media edits. Filter by one or several operations, or omit the filter for all. Returns selection facts and capability IDs in <operation>:<name> form. description explains what each model or tool can do, when to choose it and video output duration ranges or choices; read capability_get for accepted params and conditional limits. Model entries without displayName are internal/Auto-only. Full parameter contracts are omitted; inapplicable fields are absent. kind=connector lists the tools of connected external connectors (connectorId narrows to one connector).",
    shape: {
      "operation": z.union([z.enum(["generate_image", "generate_video", "generate_speech", "generate_music", "edit_media"]), z.array(z.enum(["generate_image", "generate_video", "generate_speech", "generate_music", "edit_media"])).min(1).max(5)]).describe("One operation or an array of them; entries of any listed operation are returned. Omit to list everything.").optional(),
      "kind": z.enum(["media", "plugin", "connector"]).optional(),
      "connectorId": z.string().min(1).max(100).describe("List only the tools of this connector; implies kind=connector.").optional(),
    },
  },
  "capability_get": {
    description: "Read media, native editor or connector contracts in one batch. plugin:* IDs are independent of cloud models and model selection. Plugin default details contain instructions and group summaries; use plugin.methodGroups OR plugin.methods for exact schemas, or plugin.guides for one on-demand Director guide (motion-dsl, staging, delivery). Reuse contractVersion while valid; CONTRACT_CHANGED requires rereading. Get does not open an editor. connector:<connectorId>/<tool> IDs return the connector tool MCP inputSchema and annotations unchanged. Media contracts: paramSchema defines the flat params keys, allowed values and defaults; undeclared keys are rejected. Pass mode only when declared, using its enum. paramRules defines conditional parameter restrictions: when a parameter matches one of when.values, disable.param rejects disable.values, or the whole parameter when values is absent. prompt carries only the model-specific maxLength when present. references groups totalCount, byKind count (minCount/maxCount), duration limits and, for images, imageSize (width/height/ratio bounds), combinedCountLimits, imagesWithVideoMax, exclusiveKinds (kinds that cannot appear together), audioRequiresImageOrVideo and lastFrameOnly (references[0] may be null to give only the closing frame). Apply the selected mode entry in references.modeOverrides over the base: each listed top-level section replaces that whole section; null removes an inherited section. knowledgeCard locates the vendor card: how this model reads prompts and references, and its known behavior. Before composing or changing a prompt for this model, design_read the card unless its current content is already in context. Available contracts are returned in capabilities; unavailable IDs carry reasons. Inapplicable fields are absent.",
    shape: {
      "plugin": z.object({
      "methodGroups": z.array(z.string()).min(1).max(10).optional(),
      "methods": z.array(z.string()).min(1).max(10).optional(),
      "knownContractVersion": z.string().optional(),
      "cursor": z.string().optional(),
      "guides": z.array(z.enum(["motion-dsl", "staging", "delivery"])).min(1).max(1).describe("Read one native Director guide, exclusive with methods/methodGroups/cursor. Read motion-dsl before custom actions, staging for coordinates/track examples, delivery before claiming task completion.").optional(),
    }).optional(),
      "ids": z.array(z.string().min(1).max(512)).min(1).max(20).describe("Capability IDs from the current context or capability discovery, each carrying its own operation."),
    },
  },
  "capability_search": {
    description: "Find an external connector (a desktop app or service such as Blender, Figma or Photoshop) when the user names one, asks what can be connected, or the task needs tools not currently available. Searches market connectors and configured MCP servers, including failed or disabled ones. Search never installs, connects or executes; the returned card lets the user set up and connect the connector.",
    shape: {
      "queries": z.array(z.string().min(1).max(64)).min(1).max(5).describe("1–5 concise names, aliases or task terms. Chinese and English are supported."),
      "targetConnectorId": z.string().min(1).max(100).describe("For an explicit @connector reference, use its catalog ID or configured runtime name. Otherwise omit; do not invent an ID from the query.").optional(),
    },
  },
  "connector_call": {
    description: "Run one tool of a connected external connector. capabilityId is a connector:<connectorId>/<tool> ID from design_capability_list kind=connector connectorId=<id>; arguments must match the inputSchema returned by design_capability_get (read it before the first call of each tool). The local Gateway re-checks the connection and the schema, asks the user first when the connector marks the tool destructive, and returns the connector result unchanged (text, JSON, images). Connectors that are not connected are refused: use design_capability_search. Not for models or media edits (use design_execute). Results do not become project Resources by themselves; import files with design_deliver.",
    shape: {
      "capabilityId": z.string().min(1).max(300).describe("connector:<connectorId>/<tool> ID of a connected connector tool."),
      "arguments": z.record(z.string(), z.unknown()).describe("Tool arguments object matching the inputSchema from design_capability_get.").default({}).optional(),
    },
  },
  "search_knowledge": {
    description: "Search model guidance and historical production references by recall terms + category.\n\nUse this when:\n  - find a card for a known vendor (pass `category: \"vendors\", topic: \"<vendor>\"`)\n  - consult historical production references for creative methods (explicitly pass `category: \"workflows\", query: \"narrative video\"`)\n\nReturns ranked logical file paths + short excerpts. Paths start with `<knowledgeDir>` or `<workflowsDir>` and can be passed directly to `design_read`; that tool resolves the active profile root.\nOmitting category or using \"all\" searches current knowledge. Historical workflow results carry their reference-only context; media-agent owns current execution through the available tools.",
    shape: {
      "query": z.string().describe("Space-separated recall terms. Case-insensitive substring match against file bodies. Ignored when `topic` is supplied.").optional(),
      "topic": z.string().describe("Exact category-relative card path, with optional `.md` (e.g. \"seedance\", \"character-refs\"). For workflows, accepts a project type such as \"mv\" or a reference path such as \"mv/reference/music\".").optional(),
      "category": z.enum(["vendors", "workflows", "all"]).describe("Current knowledge: vendors. Omit or \"all\" to search model guidance. Explicit \"workflows\" searches historical production references.").optional(),
      "limit": z.number().int().min(1).max(20).describe("Cap on returned hits. Default 5.").optional(),
    },
  },
  "report_outcome": {
    description: "Emit structured outcome records for one or more pipeline phase results.\n\nPass outcomes[]; use a single-element array for one outcome. Output is logged to stderr as one `[hub-outcome] {json}` line per item so opencode-trace and downstream log harvesters can aggregate per-session success classes. Returns \"logged\" only — does not affect generation.",
    shape: {
      "outcomes": z.array(z.object({
      "phase": z.enum(["triage", "plan", "execute", "deliver"]).describe("Phase being reported. `execute` is per-asset; `deliver` is per-batch."),
      "outcome": z.enum(["success", "failed", "partial"]).describe("Coarse verdict. `partial` only for batches where some assets passed and others failed."),
      "asset_id": z.string().describe("Identifier of the output being reported. Required for `execute` phase.").optional(),
      "modality": z.enum(["image", "video", "audio.tts", "audio.music", "postprocess"]).describe("Modality of the asset, if applicable.").optional(),
      "vendor": z.string().describe("Picked vendor (e.g. `seedance`). Required for `execute` phase outcomes.").optional(),
      "error_class": z.enum(["tool_unavailable", "model_unavailable", "refs_missing", "constraint_conflict", "vendor_error", "medium_drift_detected", "user_blocked", "unknown"]).describe("Failure category. Required when outcome=failed.").optional(),
      "details": z.string().max(500).describe("One-line specifics, e.g. \"veo3 returned 429 rate-limit\".").optional(),
      "retries": z.number().int().min(0).max(10).describe("Retry index for this asset.").optional(),
    })).min(1).max(100).describe("Batch of outcome records. Single outcome calls must still use outcomes[]."),
    },
  },
  "voice_search": {
    description: "Search the preset voice catalog for speech generation by spoken language and optional gender. Each query returns every matching voice, so send one query per distinct language and gender, never repeats. When recommending voices to the user, embed each non-empty sample_audio as Markdown media using the exact syntax `![voice name](sample_audio URL)` so Chat renders an inline audio player; do not use a normal Markdown link `[label](URL)`. Pass a chosen voice_id with voice_id_source=\"catalog\". To create a custom voice, run the generate_speech:voice_clone or generate_speech:voice_design capability instead. Returns results in input order; a failed query carries error.",
    shape: {
      "items": z.array(z.object({
      "id": z.string().describe("Optional caller id, e.g. role id.").optional(),
      "language": z.enum(["中文", "英语", "葡萄牙语", "日语", "韩语", "法语", "德语", "西班牙语", "意大利语", "俄语", "阿拉伯语", "印尼语", "荷兰语", "泰语", "越南语", "印地语", "波兰语", "罗马尼亚语", "捷克语", "芬兰语", "马来语", "土耳其语", "乌克兰语", "保加利亚语", "丹麦语", "希伯来语", "波斯语", "斯洛伐克语", "瑞典语", "克罗地亚语", "菲律宾语", "匈牙利语", "挪威语", "斯洛文尼亚语", "加泰罗尼亚语", "希腊语", "泰米尔", "阿非利卡语", "尼诺斯克"]).describe("Spoken language required by the intended speech."),
      "gender": z.enum(["女", "男"]).describe("Pass only when the user explicitly mentioned gender.").optional(),
    })).min(1).max(30).describe("Catalog queries, one per distinct language and gender."),
    },
  },
  "read": {
    description: "Read text as numbered lines with pagination. Pass exactly one of versionId or file_path. versionId reads text (including text-based FILE Resources such as HTML or code) or extracts the body of a Word (.doc/.docx) or PDF Resource version and returns its identity. Only a complete text Resource source and its versionId can serve as the mode=\"replace\" rewrite baseline for design_document_write; a bounded window is enough to anchor mode=\"patch\" edits. Extracted Word/PDF text and partial reads cannot be a replace baseline. When contentRevision is returned, pass it on subsequent pages and as baseRevision when editing. A revision conflict means restart the read to avoid mixing old and new content. file_path reads a model knowledge card, a workflow file or any project file on disk, and also lists a directory; it accepts the <knowledgeDir> and <workflowsDir> logical roots. Paging is the same on both: offset is the 1-indexed first line and limit the maximum number of lines, at most 2000 per call (a Resource version defaults to 500 lines). When more is available, the tail gives the offset for the next page. Lines longer than 2000 characters are cut and end with \"... (line truncated to 2000 chars)\"; that suffix is not source text, so a patch anchor must come from the shown part of such a line, never include the suffix. Set pdf_page on a PDF (by versionId or file_path) to also return the embedded PNG images of that 1-based page as image content, alongside the text window; at most 2 MiB per image and 4 MiB in total, so large or decorative images may be omitted. Text is extracted without page layout or OCR; image, video or audio Resource inspection is available through design_analyse_media.",
    shape: {
      "contentRevision": z.number().int().gt(0).describe("versionId only: revision returned by the first page; pins further pages to that content.").optional(),
      "versionId": z.string().min(1).max(512).describe("Exact text, Word or PDF Resource versionId from project context or a tool result. Mutually exclusive with file_path.").optional(),
      "file_path": z.string().min(1).describe("Absolute path, or a path under the <knowledgeDir> / <workflowsDir> logical roots. Mutually exclusive with versionId.").optional(),
      "offset": z.number().int().min(1).describe("1-indexed line to start from (default 1).").optional(),
      "limit": z.number().int().min(1).max(2000).describe("Maximum lines to return in this call.").optional(),
      "pdf_page": z.number().int().min(1).describe("PDF only: 1-based page whose embedded images are returned with the text window. Text paging still follows offset/limit.").optional(),
    },
  },
} satisfies Record<string, V3ToolSpec>;

export type V3ToolName = keyof typeof V3_TOOL_SPECS;

/** 从生成出来的 raw shape 反推 handler 的 args 类型（字段名与可选性都保真）。 */
export type V3Args<K extends V3ToolName> = z.infer<
  z.ZodObject<(typeof V3_TOOL_SPECS)[K]["shape"]>
>;

export const V3_TOOL_NAMES = Object.keys(V3_TOOL_SPECS) as V3ToolName[];
