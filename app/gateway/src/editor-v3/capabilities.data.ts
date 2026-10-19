/** 代理先读能力目录，再按方法名翻一页契约。说明文字是调用契约的一部分。 */
export const editorCapabilityData = {
  "directorMethods": [
    {
      "method": "document.create",
      "group": "lifecycle",
      "write": true,
      "renderer": false,
      "undoable": false,
      "description": "Start an independent Director work here, even when another Director exists. Creates a new Composition, source and bound node; scene.create only adds objects inside a source. target is exactly { canvasId: \"workspace\" }; args.name is required (suffixed when taken). Use returned sourceResourceId, compositionId, versionId and nodeId for this work. Reuse an old source only for a user-requested continuation or replacement. Does not open a chat or the editor."
    },
    {
      "method": "editor.prepare",
      "group": "lifecycle",
      "write": false,
      "renderer": true,
      "undoable": false,
      "description": "Prepare the explicit source in the native editor. A different dirty owner returns BUSY."
    },
    {
      "method": "editor.reveal",
      "group": "lifecycle",
      "write": false,
      "renderer": true,
      "undoable": false,
      "description": "Show the explicit source without changing the current chat."
    },
    {
      "method": "command.recover",
      "group": "lifecycle",
      "write": true,
      "renderer": false,
      "undoable": false,
      "description": "Explicitly recover an interrupted document.create or pending placement by its original commandId. Reuses its recorded target/resource; completed placements are never recreated. Only provisioning is recoverable here; scene writes use command.get and the native pending-save recovery."
    },
    {
      "method": "command.get",
      "group": "lifecycle",
      "write": false,
      "renderer": false,
      "undoable": false,
      "description": "Recover an accepted command by its original ID; never resubmit an unknown write."
    },
    {
      "method": "scene.get",
      "group": "inspect",
      "write": false,
      "renderer": false,
      "undoable": false,
      "description": "Read saved source tokens and a bounded page of cameras, characters, props, paths, custom motions or timeline tracks. scene edits use these exact revision/baseVersionId tokens. animationSummary reports full-timeline structural bindings, independent of pagination. Inspect custom motion source and actual position paths to substantiate action claims; labels are not evidence."
    },
    {
      "method": "scene.create",
      "group": "edit",
      "write": true,
      "renderer": true,
      "undoable": true,
      "description": "Atomically create 1–30 characters, built-in props or cameras (shots) in one undo group. Each object requires a new scene-wide unique id and label; use these ids for later edits and snapshots. Characters default to mannequin/standing, props require a built-in assetId. Position/scale use world units; rotation/fov use degrees; lookAt is a world point. Omitted transforms use default scene values. Requires expectedDraftRevision and baseVersionId from scene.get. Returns affectedObjects and saved version tokens. No arbitrary code or model URLs."
    },
    {
      "method": "scene.edit",
      "group": "edit",
      "write": true,
      "renderer": true,
      "undoable": true,
      "description": "Atomically update existing objects, one undo group. Position/scale use scene world units, rotation uses degrees, camera fov uses degrees. Camera lookAt is a world point. Requires expectedDraftRevision and baseVersionId. Locked objects are refused. No arbitrary code, paths or new model URLs."
    },
    {
      "method": "scene.animate",
      "group": "animation",
      "write": true,
      "renderer": true,
      "undoable": true,
      "description": "Atomically upsert camera/object paths and custom motions; tracks, when supplied, replace the entire timeline. One undo group. All times are milliseconds; total timeline <=60000ms. Paths use world-space Bezier position points with relative in/out handles (omitted = zero). Camera paths: lookAtTarget=\"__none__\" plus lookAt for a fixed aim, or an existing character/prop ID to follow it. Tracks without targetId drive the camera; with targetId move that character/prop; kind=\"anim\" drives the target character pose. clip.pathId references a path or motion ID. Built-in motions: idle, walk, run, jump, talk, wave, bow, cheer, dance, sit_talk, punch, death. start=0 synchronizes camera and actor tracks. Empty tracks clears the timeline. Requires current expectedDraftRevision/baseVersionId. Inspect kind path/motion/track with scene.get. Custom motion DSL is compiled before any scene change; invalid references, locked targets and code are rejected."
    },
    {
      "method": "video.export",
      "group": "export",
      "write": false,
      "renderer": true,
      "undoable": false,
      "description": "Render the saved camera timeline with actor movement/animation into a finished video Resource in the source Composition (role director-video). Requires exact expectedDraftRevision/baseVersionId, a nonempty camera track and total duration <=60000ms. Real-time native recording: keep the director window visible. Returns asset resourceId/versionId and source tokens only after video archival succeeds; MP4 preferred, otherwise WebM. No audio. On unknown/TIMEOUT use command.get with the original commandId; never rerender just to query completion. Export restores the user viewpoint and static object poses."
    },
    {
      "method": "scene.undo",
      "group": "edit",
      "write": true,
      "renderer": true,
      "undoable": false,
      "description": "Undo one native scene history group and save a new immutable source version. Requires current revision/baseVersionId; history is in-memory and may be unavailable after reopen."
    },
    {
      "method": "scene.snapshot",
      "group": "preview",
      "write": false,
      "renderer": true,
      "undoable": false,
      "description": "Capture an existing camera after scene readiness. Restores the user viewpoint; returns image evidence bound to source version/revision. Every capture is saved as an image Resource and added to the source Composition (role director-snapshot); command.asset identifies it, so reference it by resourceId/versionId and do not snapshot again just to keep it. Inspect the returned image before claiming visual verification."
    }
  ],
  "clipMethods": [
    {
      "method": "document.list",
      "group": "lifecycle",
      "write": false,
      "renderer": false,
      "undoable": false,
      "description": "List clip projects (clip-studio nodes) on canvasId=\"workspace\" without opening an editor. target is { canvasId: \"workspace\" }. args: { nodeIds?: string[] (<=20), offset?, limit? (1-20, default 20) }. result.items[]: { nodeId, title, sourceResourceId?, compositionId?, versionId? (current .clip version, the write precondition), draftRevision?, empty (no saved timeline yet), sources[] (incoming Canvas nodes: nodeId, kind, compositionId?) }, plus total and nextOffset when more remain. Nodes without sourceResourceId have not been opened yet. Timeline content needs project.get."
    },
    {
      "method": "document.create",
      "group": "lifecycle",
      "write": true,
      "renderer": false,
      "undoable": false,
      "description": "Start independent video work here even if a project already uses the same media. target is exactly { canvasId: \"workspace\" }; creates an unnamed internal Composition, .clip source and bound node. The source and node use args.name without reserving a public material-set name. args.name is required; args.sourceNodeIds (<=20 Canvas node ids, usually media Compositions) connect incoming media imported when the editor opens. Use returned sourceResourceId, compositionId, nodeId and empty-project versionId for this work. Reuse an old project only for a user-requested continuation/replacement. Does not open the editor or add a public material set."
    },
    {
      "method": "editor.prepare",
      "group": "lifecycle",
      "write": false,
      "renderer": true,
      "undoable": false,
      "description": "Open the clip project in the fullscreen clip editor and wait until it is loaded. Returns the saved versionId. Other renderer methods prepare automatically."
    },
    {
      "method": "editor.reveal",
      "group": "lifecycle",
      "write": false,
      "renderer": true,
      "undoable": false,
      "description": "Show the clip project in the fullscreen clip editor without changing the chat."
    },
    {
      "method": "command.get",
      "group": "lifecycle",
      "write": false,
      "renderer": false,
      "undoable": false,
      "description": "Recover an accepted command by its original commandId (running/unknown/completed/committed/rejected). For document.create, resumes unfinished source/Canvas placement with the same identities. For a retained uncertain project.export delivery, resumes only the original bytes/import/placement or returns its completed asset; never renders a new snapshot. Missing recovery evidence stays unknown. Never resubmit an unknown write or export to learn its outcome."
    },
    {
      "method": "project.get",
      "group": "inspect",
      "write": false,
      "renderer": true,
      "undoable": false,
      "description": "Read the live project after saving pending user edits. args: { view?: \"summary\"|\"tracks\"|\"clips\"|\"full\" (default \"clips\"), trackId?, clipId?, fromSec?, toSec? }. result: settings (name/width/height/frameRate), durationSec, playheadSec, selectedClipIds, selectedTrackIds, counts, tracks[] (id, type, name, clipCount, locked/hidden/muted/solo, gaps[]), clips[] (id, trackId, trackName, trackType, name, mediaId, startSec, endSec, durationSec, sourceInSec, sourceOutSec, speed?, volume, effectCount?), textClips[] (id, trackId, text, startSec, endSec, fontSizePx?), transform on both clips[]/textClips[] uses normalized absolute canvas position plus positionPx (not native media offsets); scale/rotation/opacity/fitMode/crop are included; clips[] includes fade {fadeInSec,fadeOutSec}; textClips[] includes style. With view=\"full\" clips also includes effects[], audioEffects[], keyframes[], plus media[] ({id, name, type, durationSec?, resourceId?, versionId?}) and markers[]. The receipt versionId is the write precondition. Use trackId/clipId/fromSec/toSec on long projects."
    },
    {
      "method": "project.diagnostics",
      "group": "inspect",
      "write": false,
      "renderer": true,
      "undoable": false,
      "description": "Read-only mechanical checks. result: { ok, clean, issues[] ({kind, severity, detail, fromSec?, toSec?, clipIds?, trackId?}), summary }. Kinds: timeline_gap/clip_overlap/media_missing (error); caption_overlap/caption_out_of_video/tiny_clip/empty_track (warning)."
    },
    {
      "method": "project.edit",
      "group": "edit",
      "write": true,
      "renderer": true,
      "undoable": true,
      "description": ""
    },
    {
      "method": "project.history",
      "group": "edit",
      "write": true,
      "renderer": true,
      "undoable": false,
      "description": "Step the editor undo history. args: { action: \"undo\"|\"redo\", steps?: 1-20 }. One project.edit batch is one step; nonUndoable operations cannot be reverted here. History is in-memory and may be empty after the editor reopens. Requires baseVersionId."
    },
    {
      "method": "project.view",
      "group": "preview",
      "write": false,
      "renderer": true,
      "undoable": false,
      "description": "Playback and navigation; changes nothing. args: { action: \"seek\"|\"play\"|\"pause\", toSec?, fromSec? }. seek requires toSec; play accepts fromSec and optional toSec to loop that range."
    },
    {
      "method": "project.snapshot",
      "group": "preview",
      "write": false,
      "renderer": true,
      "undoable": false,
      "description": "Render composited preview frames (effects, transitions, grading, captions). args: { times?: number[] (1-4 timeline seconds) | fromSec+toSec+count? (default 4, max 4), maxDim? (default 640, max 1024) }. Frames are returned as image blocks in order with result.frames[] (atSec, width, height); they are transient evidence, not saved assets. Restores the user view. Errors: PREVIEW_NOT_READY, busy, CAPTURE_FAILED (nothing rendered, possibly a gap)."
    },
    {
      "method": "project.export",
      "group": "export",
      "write": false,
      "renderer": true,
      "undoable": false,
      "description": "Save and capture the current source Version, render that fixed snapshot with the editor export pipeline and deliver one independent output Composition to the Canvas next to the clip node. args: { format?: \"mp4\"|\"wav\", name? }. MP4 uses snapshot dimensions/frame rate; WAV is audio only. Returns asset {resourceId, versionId, mediaKind} only after delivery; the output retains its exact source Version dependency. Does not modify the project. Keep the app open while rendering; on unknown/TIMEOUT use command.get with the original commandId to recover the same delivery, never start a new export to check it."
    }
  ],
  "clipInstructions": [
    "Domain: a Clip Studio project is a .clip source Resource in an internal Composition, shown by one clip-studio Canvas node. Internal project files are not ordinary material sets. It has video/audio/text tracks with clips. Each clip has an id, mediaId, timeline placement (startSec/endSec) and source window (sourceInSec/sourceOutSec). Captions/text overlays are textClips[].",
    "- Choose new work vs continuation first. For an independent video or separately maintained deliverable, call document.create (target={canvasId:\"workspace\"}) and use its returned sourceResourceId. Reuse an old project only for a user-requested continuation/replacement. Shared media, similar titles, project listings, editor focus or consent to a simplification alone do not authorize overwriting it. Work identity, not chat/session identity, decides; create clear new work directly.",
    "- For continuation, resolve target.sourceResourceId (plus canvasId=\"workspace\"; nodeId optional) from the user reference/context; editor focus helps locate it but explicit references take precedence. If needed, use document.list; a node without sourceResourceId can use target.nodeId and gets its source on the first command. Ask only if the continuation target remains ambiguous. Once the source is chosen, follow READ/EDIT below.",
    "- Times are seconds (decimals allowed), never frames or timecode. Operation times are project time unless documented as source time.",
    "- Clip/track/media ids come from project.get; prefixes of >=4 chars are accepted. Never invent ids. Track name is the visible header label; resolve names case-insensitively and ask when several match.",
    "- Every renderer method opens the clip editor fullscreen automatically when needed; do not ask the user to open it. Only one clip editor is live at a time: another open editor returns BUSY or EDITOR_NOT_READY.",
    "- Writes (project.edit, project.history) require baseVersionId = the versionId returned by the latest project.get or write receipt (a .clip source version). REVISION_CONFLICT means the user changed the project: re-read and rebuild the batch. A write that changes nothing returns status unchanged and keeps the version.",
    "Workflow:",
    "- READ: project.get (view=\"full\" for media resource ids and markers). Inspect project.snapshot frames before content decisions; do not infer content from names.",
    "- EDIT: preserve unrelated content. Group related changes into one project.edit batch (description in the user language). Validate large or risky batches with validateOnly:true. On failure, read results[], fix the named operation and resend the corrected batch.",
    "- VERIFY: run project.diagnostics after moving/removing/retiming clips and before declaring work finished. After visual edits, inspect project.snapshot images of affected moments; never claim visual verification without inspecting them.",
    "- SHOW: project.view seeks/plays the affected range. Summarize changes and durationSec in plain language. If nonUndoable[] is non-empty, tell the user which changes cannot be undone.",
    "- SUBTITLES: transcribe source media through the media execute capability edit_media:transcribe (subtitle mode) with the media resourceId/versionId from project.get view=\"full\", then add one import_srt operation per matching clip with srtResourceId/srtVersionId and clipId. Do not paste SRT text you have not read.",
    "- EXPORT: project.export captures a fixed saved source Version, renders that snapshot and delivers one independent output Composition/Canvas card with a dependency on that source Version. Do not change content for export-only requests. On unknown/TIMEOUT use command.get with the original commandId; it can resume a retained delivery without rendering again. Never start another export just to check. If the original bytes or recovery record are unavailable, the outcome stays unknown.",
    "- On unknown outcomes of any write use command.get; never blindly repeat writes. On busy wait for the previous operation."
  ],
  "clipCraft": [
    "# Clip Editing Craft",
    "Editing judgement for Clip Studio projects, whether discussed from the canvas or in the editor. Apply it to the requested creative goal; do not recite it to the user.",
    "",
    "## Rhythm and pacing",
    "- Hook first: the first 1–3 seconds decide whether viewers keep watching. Open on motion, a face or the strongest image, not a slow establishing shot unless requested.",
    "- Vary shot length: alternate quick cuts with held moments. In narrated/talking-head footage, avoid shots longer than ~7s without a cutaway, punch-in or caption beat.",
    "- Cut on action or breath: prefer after a gesture lands or a sentence ends; use transcript sentence boundaries. Avoid mid-word cuts unless removing filler.",
    "- Silence is material: tighten talking footage while retaining natural pauses carrying weight; pauses around 0.3s can suit fast-paced content.",
    "- End deliberately with a held image, caption beat or hard cut at a strong moment. Avoid leftover frames after the intended ending.",
    "",
    "## Transitions: restraint wins",
    "- Hard cut is the default seam. Pick ONE accent transition family and use it only at meaningful scene/topic boundaries, not between every clip.",
    "- Crossfade suggests time passing or softer mood; dipToBlack marks a chapter; wipe/slide/push need a matching energetic look. A 1s default is long for fast content; 0.3–0.5s often works better.",
    "- Do not stack transitions onto whip pans or action peaks: the cut alone is stronger.",
    "",
    "## Captions and text",
    "- Scale to the canvas: ~56px for captions on 1080p, ~112px on 4K.",
    "- Bottom-centre is the safe default. Never cover faces, mouths in lip-sync content, on-screen UI or important action. Move captions to the top if the bottom is busy.",
    "- One thought per caption clip. If imported SRT creates three-line walls, shorten the caption units rather than just shrinking the text.",
    "- Keep caption styling consistent as a set, not ad-hoc clip-by-clip; legibility must hold over the busiest background.",
    "- Text overlays should say something footage does not. Match duration to reading time (~0.06s per character, minimum 1.5s); 3s is only a starting point.",
    "",
    "## Color and effects",
    "- Consistency first, style second: match temperature between sources before creative grading.",
    "- Effects need a purpose: vignette for focus, grain for texture, blur for background treatment. Remove effects with no purpose.",
    "- Keep values small. Temperature/tint beyond ±30 is a look, not a correction; use only when requested. Judge corrections against the same original moment, not different lighting or content.",
    "",
    "## Speed",
    "- Speed serves rhythm: 0.5× emphasizes an action peak; 2–5× compresses a walk or process. Do not retime dialogue unless asked."
  ],
  "directorInstructions": "你正在使用原生导演台。以当前 capability_get 返回的方法和字段为准，通过 execute 调用 plugin:director-stage；connector_call 只用于 connector:*。\n\n按需知识：guides=[\"staging\"] 获取对象、坐标与三类轨道的完整示例；写自定义动作前获取 guides=[\"motion-dsl\"]，已有有效指南可复用；guides=[\"delivery\"] 解释失败修复和交付核对。指南不能代替方法的 inputSchema。专业创作 Skill director-stage 仅在实际 runtime catalog 可用时加载；不可用时说明安装/启用条件，已授权的直接编辑仍可依据本契约继续，不编造已加载的知识。\n\n先辨新作/续改：独立剧情或预演先 document.create（target={canvasId:\"workspace\"}），用返回的 sourceResourceId；scene.create 仅添加工程内对象。用户明确续改/替换才复用旧源；项目概览、编辑器焦点、接受占位/简化均不单独授权覆盖。按作品延续关系而非会话新旧判断；明确新作直接创建，仅续改目标不明时询问。\n\n选定源后读 scene.get 获取对象和 expectedDraftRevision/baseVersionId。修改沿用真实 id；新对象用场景内唯一 id。写入返回的新版本取代旧 token。paths/motions 按 id 更新，tracks 一旦传入会替换整个时间线，须保留不受影响的轨道；tracks:[] 是清空，不是无操作。失败先按字段和引用修复；状态 unknown/TIMEOUT 用原 commandId 查询 command.get，不重复提交未知结果的写入。\n\n三种轨道：镜头轨道省略 kind/targetId/orient，clip.pathId 指向 paths.id；物体位移轨道省略 kind，targetId 为角色或道具 id，orient 仅 follow/keep，clip.pathId 指向 paths.id；骨骼轨道 kind=\"anim\" 且 targetId 必须为角色 id，省略 orient，clip.pathId 指向内置动作或 motions.id。路径不是动作。骨骼 walk/jump 不会产生沿地面的移动，靠近/后退需独立位移轨道。时间线用毫秒、DSL step 用带 s 的秒，位置用米、Y 轴向上、地面 y=0、对象旋转用度、路径点 tilt 用弧度。\n\ncharacter 只有人形 mannequin/female/child；缩小儿童或改名“小猫”仍是人形。prop 仅能选当前 schema 的内置 assetId。当前未开放任意程序建模、模型导入或动物骨骼绑定；不要承诺这些能力。若用户接受占位预演，明确占位对象及不能表达的效果；降低明确的角色身份、动作或镜头要求前先确认，继续不依赖该选择的已授权工作。\n\n执行时保留用户目标清单，将每项目标对应到实际对象、路径、关节变化与时间段。回执/scene.get 的 animationSummary 仅为 structure_only：movementTargetIds 为空不得声称靠近/绕行/后退；poseTargetIds 不证明具体动作语义。动作和 step 的名称/cue 只是标签；叫“抓空”不代表手臂伸出，叫“跳跃”不代表根部离地。编译/保存成功仅证明接口执行成功。不要删除移动、接触或镜头要求来消除错误，然后仍按原目标宣称完成；被删、被替换、失败和无法确认的部分一直留在未完成清单，修复或获用户同意后才可关闭。\n\n交付按实际已保存的版本说明已实现、用户同意的简化、未完成与待审阅内容。可依据已提交参数说明结构与动作安排，不能凭名称、编译成功或返回图片地址宣称画面效果已验证。遵循主 Agent 的协作与验收规则，默认交用户审阅；只有获授权核查时才按范围检查真实画面，不额外发起验收、修复或重生成。宣称已视觉验证必须实际查看相应版本、镜头与时间点的证据。"
} as const;
