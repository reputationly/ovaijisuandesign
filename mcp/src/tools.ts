/**
 * 工具定义。**名字和入参按官方那 103 个对齐**，见 `docs/mcp-tools.md`。
 *
 * opencode 会按 MCP server 名加前缀，所以 server 名必须是 `hub`，
 * agent 侧看到的才是 `hub_canvas_write_media_node` 这种 —— 官方的 agent
 * 配置就是照那些名字写的。
 *
 * 当前实现 26 个：画布 3 + 生成 4 + 音乐 2 + 计划 7 + 文本 3 + 分组 3 + 周边 4。**没实现的工具不注册空壳** ——
 * 注册了但返回"未实现"的话，agent 会把它当成一次失败的调用去重试；
 * 不注册，agent 至少能看到工具不存在而换条路。
 */

import { z } from "zod"

import { gw, submitAndPoll, type Product } from "./gateway"

/** MCP 工具的返回。文本内容 + 结构化内容，和官方一致。 */
export function reply(structured: unknown, text?: string) {
  return {
    structuredContent: structured as Record<string, unknown>,
    content: [{ type: "text" as const, text: text ?? JSON.stringify(structured) }],
  }
}

export interface ToolDef {
  name: string
  description: string
  inputSchema: z.ZodRawShape
  handler: (args: any) => Promise<ReturnType<typeof reply>>
}

// ---------------------------------------------------------------------------
// 画布
// ---------------------------------------------------------------------------

const canvasListNodes: ToolDef = {
  name: "canvas_list_nodes",
  description:
    "List nodes currently on the canvas. Use it before referencing a node id, " +
    "and to check what the user can already see.",
  inputSchema: {
    type: z.string().optional().describe("Filter by node type, e.g. image / video / audio / text."),
    limit: z.number().int().positive().optional(),
    offset: z.number().int().nonnegative().optional(),
  },
  async handler({ type, limit, offset }) {
    const q = new URLSearchParams()
    if (type) q.set("type", type)
    if (limit) q.set("limit", String(limit))
    if (offset) q.set("offset", String(offset))
    const qs = q.toString()
    return reply(await gw.get(`/api/canvas/nodes${qs ? `?${qs}` : ""}`))
  },
}

const canvasGetNode: ToolDef = {
  name: "canvas_get_node",
  description:
    "Read one or more canvas nodes in full, including text content for text nodes.",
  inputSchema: {
    nodeId: z.string().optional(),
    nodeIds: z.array(z.string()).optional(),
  },
  async handler({ nodeId, nodeIds }) {
    const ids = nodeIds ?? (nodeId ? [nodeId] : [])
    if (ids.length === 0) throw new Error("需要 nodeId 或 nodeIds")
    return reply(await gw.post("/api/canvas/nodes/detail", { nodeIds: ids }))
  },
}

/**
 * 统一的写节点工具。
 *
 * **3.0.11 → 3.0.12 的一处真实变化**：官方把 `canvas_write_media_node` /
 * `canvas_write_text_node` / `canvas_write_table_node` / `canvas_write_file_node`
 * 合并成了这一个，用 `kind` 区分（工具面从 103 个缩到 58 个）。
 *
 * 值得注意的是**两个版本的 agent 提示词引用的都是 `hub_canvas_write_node`** ——
 * 那四个分开的从来没被 agent 用过。我们一开始实现了其中两个，等于实现了
 * agent 永远不会调的东西。这是「提取规格 + 升级后重跑」抓出来的。
 */
const canvasWriteNode: ToolDef = {
  name: "canvas_write_node",
  description:
    "Write a node onto the canvas. `kind=text` writes Markdown content; " +
    "`kind=media` places an existing workspace file. " +
    "Omit `nodeId` to create, pass it to patch an existing text node.",
  inputSchema: {
    kind: z.enum(["text", "media"]).optional().describe("Single-write node kind."),
    // -- text --
    content: z.string().optional().describe("[text] Markdown content."),
    name: z.string().optional().describe("[text create] File name without extension."),
    nodeId: z.string().optional().describe("[text] Existing node to patch. Omit to create."),
    mode: z.enum(["replace", "append", "prepend"]).optional().describe("[text patch only]"),
    expectedContentHash: z
      .string()
      .optional()
      .describe(
        "[text patch only] CAS token from a prior read. Rejected (409) when the " +
          "document changed since then.",
      ),
    // -- media --
    assetPath: z.string().optional().describe("[media] Workspace-relative path."),
    allowDuplicate: z.boolean().optional().describe("[media] Force a second card."),
    // -- 通用 --
    sourceNodeId: z.string().optional().describe("[create/media] One derivation edge."),
    sourceNodeIds: z.array(z.string()).optional().describe("[create] Source node ids."),
  },
  async handler(a) {
    // `kind` 是可选的：不给就按字段推断。给了 assetPath 就是媒体，
    // 给了 content 就是文本 —— 猜错的后果是调错 gateway 路由、报一个
    // 和真实原因无关的错。
    const kind = a.kind ?? (a.assetPath ? "media" : a.content !== undefined ? "text" : undefined)
    const sources = a.sourceNodeIds ?? (a.sourceNodeId ? [a.sourceNodeId] : undefined)

    if (kind === "media") {
      if (!a.assetPath) throw new Error("kind=media 需要 assetPath")
      return reply(
        await gw.post("/api/canvas/media-node", {
          assetPath: a.assetPath,
          ...(sources ? { sourceNodeIds: sources } : {}),
          ...(a.allowDuplicate !== undefined ? { allowDuplicate: a.allowDuplicate } : {}),
        }),
      )
    }
    if (kind === "text") {
      if (a.content === undefined) throw new Error("kind=text 需要 content")
      return reply(
        await gw.post("/api/canvas/text-node", {
          content: a.content,
          ...(a.name ? { name: a.name } : {}),
          ...(a.nodeId ? { nodeId: a.nodeId } : {}),
          ...(a.mode ? { mode: a.mode } : {}),
          ...(a.expectedContentHash ? { expectedContentHash: a.expectedContentHash } : {}),
          ...(sources ? { sourceNodeIds: sources } : {}),
        }),
      )
    }
    // table / file 还没实现。**明确报出来**，而不是当成 text 或静默成功 ——
    // 后者会让 agent 以为表格写上去了。
    throw new Error(
      `kind=${a.kind ?? "(推断不出)"} 还没实现。当前支持 text 和 media；` +
        `table / file 要先在 gateway 侧补对应路由`,
    )
  },
}

// ---------------------------------------------------------------------------
// 生成
//
// 四个工具的形状一致：提交 → 轮询 → 拿到工作区路径 → 放到画布上。
// 最后一步在这里做而不是让 agent 再调一次 canvas_write_media_node ——
// 官方也是这么做的，少一次往返，也少一个"生成了但没出现在画布上"的失败面。
// ---------------------------------------------------------------------------

/**
 * 生成完直接落到画布上，返回给 agent 的结构里带上节点 id。
 *
 * `paths` 非空时**每一份都建节点**。只建第一个的话，多段语音里后面几段
 * 就是生成了、落了盘、但画布上看不见 —— 而 agent 拿到的是一次成功。
 */
async function placeOnCanvas(product: Product) {
  const all = product.paths?.length ? product.paths : [product.path]
  const nodeIds: string[] = []
  for (const assetPath of all) {
    const node = await gw.post<{ nodeId?: string }>("/api/canvas/media-node", { assetPath })
    if (node.nodeId) nodeIds.push(node.nodeId)
  }
  return {
    ok: true,
    path: product.path,
    ...(all.length > 1 ? { paths: all } : {}),
    ...(product.width ? { width: product.width } : {}),
    ...(product.height ? { height: product.height } : {}),
    ...(nodeIds[0] ? { nodeId: nodeIds[0] } : {}),
    ...(nodeIds.length > 1 ? { nodeIds } : {}),
  }
}

/**
 * 选型字段。**名字用官方那套，真正发请求前路由到本机配置的模型**
 * （见 `maas_media::route`）。
 *
 * 这样两边的接口面不分叉：官方升级后重跑提取脚本，差异一眼能看出来；
 * 而我们换后端模型只动 `config.json`，不碰工具定义。
 *
 * 之前这两个字段是"收下但丢掉"的 —— agent 以为自己指定了 `nano-banana`，
 * 实际一直在用默认模型，而且**不报错**。现在真的透传下去。
 *
 * `vendor` 仍然不参与路由：同一个 vendor 下有多个模态（`seedream` 既出图
 * 也做图层分解），而模型名本身是唯一的，按名字判更准。
 *
 * 注意**语音那个叫 `model_name` 不是 `model_id`**，官方就是这么不一致的。
 * 跟着它 —— 统一成一个名字的话，agent 按契约填的那个就再也传不进来了。
 */
const vendorField = {
  vendor: z.string().optional().describe("Accepted for compatibility; the server decides the model."),
}
const vendorFields = { ...vendorField, model_id: z.string().optional() }

/** 厂商专属旋钮的扁平映射。`aspect_ratio` / `resolution` 都在这里面。 */
const vendorParams = z
  .record(z.string(), z.unknown())
  .optional()
  .describe("Flat key-value knobs, e.g. { aspect_ratio: '16:9', resolution: '1K' }.")

const generateImage: ToolDef = {
  name: "generate_image",
  description:
    "Generate one or more images and place them on the canvas. " +
    "Pass `image_paths` to edit / restyle / repaint an existing image instead of " +
    "generating from scratch. Vendor knobs such as aspect_ratio and resolution go " +
    "in `vendor_params`.",
  inputSchema: {
    ...vendorFields,
    prompt: z.string().describe("Brief for one final image."),
    image_paths: z
      .array(z.string())
      .optional()
      .describe("Reference images. Non-empty switches to image-to-image."),
    filename: z.string().optional().describe("Output filename without extension."),
    vendor_params: vendorParams,
  },
  async handler(a) {
    const product = await submitAndPoll("image", {
      backend: a.vendor,
      model_id: a.model_id,
      prompt: a.prompt,
      image_paths: a.image_paths ?? [],
      filename: a.filename,
      params: a.vendor_params ?? {},
      source_tool: "hub_generate_image",
    })
    return reply(await placeOnCanvas(product))
  },
}

const generateVideo: ToolDef = {
  name: "generate_video",
  description:
    "Generate a video and place it on the canvas. Use `first_frame_image` and/or " +
    "`last_frame_image` for keyframe-guided generation; generic character / style " +
    "refs belong in `reference_image_paths`.",
  inputSchema: {
    ...vendorFields,
    mode: z.string().optional().describe("Generation mode, e.g. first-last-frame / reference."),
    prompt: z.string(),
    filename: z.string().optional(),
    duration: z.number().int().optional().describe("Seconds."),
    first_frame_image: z.string().optional(),
    last_frame_image: z.string().optional(),
    reference_image_paths: z.array(z.string()).optional(),
    reference_video_urls: z.array(z.string()).optional(),
    reference_audio_urls: z.array(z.string()).optional(),
    vendor_params: vendorParams,
  },
  async handler(a) {
    const product = await submitAndPoll("video", { ...a, params: a.vendor_params ?? {} })
    return reply(await placeOnCanvas(product))
  },
}

const generateAudioSpeech: ToolDef = {
  name: "generate_audio_speech",
  description: "Synthesize speech from text and place the audio on the canvas.",
  inputSchema: {
    ...vendorField,
    model_name: z.string().optional(),
    texts: z.array(z.string()).describe("One entry per clip."),
    voice_id: z.string().optional(),
    filename: z.string().optional(),
  },
  async handler(a) {
    const product = await submitAndPoll("speech", a)
    return reply(await placeOnCanvas(product))
  },
}

const generateAudioMusic: ToolDef = {
  name: "generate_audio_music",
  description:
    "Generate music and place it on the canvas. `prompt` is the style brief " +
    "(genre, tempo, instrumentation, mood); `lyrics` is the sung text. " +
    "Keep them in separate fields \u2014 merging them makes the engine sing the style " +
    "description, which succeeds without erroring.",
  inputSchema: {
    ...vendorFields,
    prompt: z.string().describe("Style brief. Not the lyrics."),
    lyrics: z.string().optional().describe("Omit for an instrumental."),
    mode: z.string().optional().describe("e.g. song / instrumental."),
    filename: z.string().optional(),
  },
  async handler(a) {
    const product = await submitAndPoll("music", a)
    return reply(await placeOnCanvas(product))
  },
}

/**
 * 歌词起草。**不落画布，也不建节点** —— 它产出的是一段待用户确认的文本。
 *
 * 官方的工作流是「起草 → 原样念给用户 → 确认后再生成」，所以这一步的产物
 * 是给 agent 看的，不是给画布看的。直接建成文本节点的话，用户每次改词都会
 * 在画布上留下一堆废稿。
 */
const lyricsGeneration: ToolDef = {
  name: "lyrics_generation",
  description:
    "Draft or polish song lyrics. Returns song_title, style_tags and lyrics as text — " +
    "nothing is written to the canvas. Present the result to the user for confirmation " +
    "before calling generate_audio_music. Use mode=write_full_song when there are no " +
    "lyrics yet, mode=edit to expand / polish lyrics the user already gave you.",
  inputSchema: {
    mode: z.enum(["write_full_song", "edit"]).optional().describe("Defaults to write_full_song."),
    prompt: z.string().optional().describe("Theme and style. Required for write_full_song."),
    lyrics: z.string().optional().describe("The draft to polish. Required for mode=edit."),
    title: z.string().optional().describe("Pins the song title instead of letting the model pick."),
  },
  async handler(a) {
    return reply(
      await gw.post("/api/music/lyrics/generate", {
        mode: a.mode,
        prompt: a.prompt ?? "",
        lyrics: a.lyrics ?? "",
        title: a.title,
      }),
    )
  },
}

/**
 * 翻唱。`action` 分派，官方就是一个工具带动作而不是三个工具。
 *
 * `generate` 走 `/api/generate/music/submit` 并带上 `audio` —— 官方的路由表里
 * 翻唱的生成也没有独立路径，就是靠请求体里有没有参考音频分叉的。
 *
 * `prepare_lyrics` 本机做不了（要语音识别），gateway 会明说缺什么、
 * 以及改走哪条路。**不回一份空歌词** —— 那份空歌词会被原样带进下一步，
 * 翻唱出来是一首没有词的曲子，全程不报错。
 */
const musicCover: ToolDef = {
  name: "music_cover",
  description:
    "Re-perform an existing track in a new style. action=generate does it in one shot; " +
    "pass `lyrics` to sing new words, omit it to keep the words of the reference audio. " +
    "action=prepare_lyrics (transcribe-then-edit) needs a speech-recognition model that " +
    "this machine does not have — it will tell you so rather than returning empty lyrics.",
  inputSchema: {
    action: z.enum(["generate", "prepare_lyrics"]).describe("generate | prepare_lyrics"),
    audio: z.string().optional().describe("Reference track: workspace path or URL."),
    prompt: z.string().optional().describe("Target style. Not the lyrics."),
    lyrics: z.string().optional().describe("New words. Omit to keep the original ones."),
    cover_feature_id: z.string().optional().describe("Handle from prepare_lyrics."),
    source_node_id: z.string().optional(),
    filename: z.string().optional(),
  },
  async handler(a) {
    if (a.action === "prepare_lyrics") {
      return reply(await gw.post("/api/music/cover/preprocess", { audio: a.audio ?? "" }))
    }
    if (!a.audio) throw new Error("action=generate 需要 audio：翻唱总得有个参考音频")
    const product = await submitAndPoll("music", {
      audio: a.audio,
      prompt: a.prompt ?? "",
      lyrics: a.lyrics ?? "",
      cover_feature_id: a.cover_feature_id,
      filename: a.filename,
    })
    return reply(await placeOnCanvas(product))
  },
}

// ---------------------------------------------------------------------------
// 制作计划
//
// **入参名逐字照官方**（见 docs/mcp-tools.md）：`plan_id` / `stage_id` /
// `expected_revision` / `work_item_ids` / `after_order` / `preserve_through_stage_id`。
// agent 的提示词里写死了这些名字，改一个字它就传不进来 —— 而 MCP 对多余的
// 参数是静默丢弃，不会报错。
//
// `projectRoot` 官方每个 plan 工具都有，我们**接受但忽略**：他们支持多项目、
// 计划按项目分开存；我们的计划跟着工作区走，只有一份。声明它是为了让
// agent 照着提示词传过来时不报错。
// ---------------------------------------------------------------------------

/** 所有 plan 工具都有的两个。 */
const planBase = {
  plan_id: z.string().describe("Plan identifier"),
  projectRoot: z.string().optional().describe("Accepted for compatibility; ignored"),
}

const stageSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    order: z.number().optional(),
    state: z
      .enum(["pending", "in_progress", "completed", "blocked", "skipped", "failed"])
      .optional(),
    work_items: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough()

const planWrite: ToolDef = {
  name: "plan_write",
  description:
    "Write the whole production plan. Pass expected_revision=0 to create it. " +
    "Use plan_replan for later changes so finished Stages are preserved.",
  inputSchema: {
    ...planBase,
    plan: z.record(z.string(), z.unknown()).describe("The plan document"),
    expected_revision: z
      .number()
      .describe("Revision you last read. 0 when creating. Mismatch is rejected."),
  },
  handler: async (a) =>
    reply(
      await gw.post("/api/plan/write", {
        plan_id: a.plan_id,
        plan: a.plan,
        expected_revision: a.expected_revision,
      }),
    ),
}

const planReplan: ToolDef = {
  name: "plan_replan",
  description:
    "Replace the tail of the plan while keeping everything already finished. " +
    "Prefer this over plan_write when work has started.",
  inputSchema: {
    ...planBase,
    expected_revision: z.number(),
    reason: z.string().optional(),
    preserve_through_stage_id: z
      .string()
      .optional()
      .describe("Keep up to and including this Stage. Defaults to the last finished one."),
    operations: z.array(stageSchema).describe("Stages that replace the tail"),
    request_id: z.string().optional(),
    resume_stage_id: z.string().optional(),
    workflow_path: z.string().optional(),
    workflow_variant: z.string().optional(),
  },
  handler: async (a) =>
    reply(
      await gw.post("/api/plan/replan", {
        plan_id: a.plan_id,
        expected_revision: a.expected_revision,
        reason: a.reason ?? "",
        preserve_through_stage_id: a.preserve_through_stage_id,
        operations: a.operations ?? [],
      }),
    ),
}

const planPatchStage: ToolDef = {
  name: "plan_patch_stage",
  description: "Add, replace or remove a single Stage.",
  inputSchema: {
    ...planBase,
    expected_revision: z.number(),
    stage_id: z.string().optional(),
    stage: stageSchema.optional(),
    after_order: z.number().optional().describe("Insert after this order; rest shifts down"),
    remove: z.boolean().optional(),
    omit: z.array(z.string()).optional(),
  },
  handler: async (a) =>
    reply(
      await gw.post("/api/plan/patch-stage", {
        plan_id: a.plan_id,
        expected_revision: a.expected_revision,
        stage_id: a.stage_id,
        stage: a.stage,
        after_order: a.after_order,
        remove: a.remove,
      }),
    ),
}

const planUpdateStageState: ToolDef = {
  name: "plan_update_stage_state",
  description: "Advance one or more Stages. All-or-nothing: an unknown stage_id rejects the batch.",
  inputSchema: {
    ...planBase,
    expected_revision: z.number(),
    updates: z
      .array(
        z.object({
          stage_id: z.string(),
          state: z.enum(["pending", "in_progress", "completed", "blocked", "skipped", "failed"]),
        }),
      )
      .describe("Stage state transitions"),
  },
  handler: async (a) =>
    reply(
      await gw.post("/api/plan/update-stage-state", {
        plan_id: a.plan_id,
        expected_revision: a.expected_revision,
        updates: a.updates,
      }),
    ),
}

/** `stage_id` 和 `order` 都不给时返回**下一个该做的** Stage。 */
const planGetStageStatus: ToolDef = {
  name: "plan_get_stage_status",
  description:
    "Stage state and progress. Omit stage_id and order to get the next Stage to work on.",
  inputSchema: { ...planBase, stage_id: z.string().optional(), order: z.number().optional() },
  handler: async (a) =>
    reply(
      await gw.post("/api/plan/stage-status", {
        plan_id: a.plan_id,
        stage_id: a.stage_id,
        order: a.order,
      }),
    ),
}

const planGetStageDetail: ToolDef = {
  name: "plan_get_stage_detail",
  description: "Full Stage content including its work items.",
  inputSchema: { ...planBase, stage_id: z.string().optional(), order: z.number().optional() },
  handler: async (a) =>
    reply(
      await gw.post("/api/plan/stage-detail", {
        plan_id: a.plan_id,
        stage_id: a.stage_id,
        order: a.order,
      }),
    ),
}

const planGetWorkItems: ToolDef = {
  name: "plan_get_work_items",
  description: "Work items of a Stage, or of the whole plan when stage_id is omitted.",
  inputSchema: {
    ...planBase,
    stage_id: z.string().optional(),
    work_item_ids: z.array(z.string()).optional(),
  },
  handler: async (a) =>
    reply(
      await gw.post("/api/plan/work-items", {
        plan_id: a.plan_id,
        stage_id: a.stage_id,
        work_item_ids: a.work_item_ids,
      }),
    ),
}


// ---------------------------------------------------------------------------
// 文本节点：读 / 搜 / 按片段改
//
// `canvas_write_node` 是整份覆盖；这三个是给"改一篇长文里的一句话"用的。
// 整份覆盖意味着 agent 要把全文重新吐一遍 —— 慢，而且 LLM 复述长文本
// 不是无损的，改一个错别字常常连带动了别处。
// ---------------------------------------------------------------------------

const canvasReadText: ToolDef = {
  name: "canvas_read_text",
  description:
    "Read a text node's content. Use offsetLine/limitLines for long documents. " +
    "Returns expectedContentHash — pass it back when editing.",
  inputSchema: {
    nodeId: z.string(),
    offsetLine: z.number().optional().describe("0-based first line"),
    limitLines: z.number().optional(),
  },
  handler: async (a) =>
    reply(
      await gw.post("/api/canvas/read-text", {
        nodeId: a.nodeId,
        offsetLine: a.offsetLine,
        limitLines: a.limitLines,
      }),
    ),
}

const canvasGrepText: ToolDef = {
  name: "canvas_grep_text",
  description:
    "Search text nodes. Omit nodeId to search all of them. " +
    "Check `truncated` in the result before concluding you have every match.",
  inputSchema: {
    query: z.string(),
    nodeId: z.string().optional(),
    regex: z.boolean().optional(),
    maxMatches: z.number().optional(),
    contextBefore: z.number().optional(),
    contextAfter: z.number().optional(),
  },
  handler: async (a) => reply(await gw.post("/api/canvas/grep-text", a)),
}

const canvasApplyTextEdits: ToolDef = {
  name: "canvas_apply_text_edits",
  description:
    "Replace exact snippets in a text node. Each oldText must appear exactly once — " +
    "include surrounding context to disambiguate. All edits apply or none do.",
  inputSchema: {
    nodeId: z.string(),
    edits: z
      .array(z.object({ oldText: z.string(), newText: z.string() }))
      .describe("Each oldText must be unique in the document"),
    expectedContentHash: z.string().optional().describe("From canvas_read_text"),
    editSessionId: z.string().optional(),
    requestId: z.string().optional(),
  },
  handler: async (a) => reply(await gw.post("/api/canvas/apply-text-edits", a)),
}

// ---------------------------------------------------------------------------
// 分组
// ---------------------------------------------------------------------------

const canvasGroupNodes: ToolDef = {
  name: "canvas_group_nodes",
  description: "Wrap nodes in a labelled group. At least two nodes, none already grouped.",
  inputSchema: { nodeIds: z.array(z.string()), label: z.string().optional() },
  handler: async (a) => reply(await gw.post("/api/canvas/group", a)),
}

const canvasGroupRecentOutputs: ToolDef = {
  name: "canvas_group_recent_outputs",
  description:
    "Group the most recent run of generated nodes. Use it right after producing a batch.",
  inputSchema: { label: z.string().optional() },
  handler: async (a) => reply(await gw.post("/api/canvas/group-recent", a ?? {})),
}

const canvasUngroupNode: ToolDef = {
  name: "canvas_ungroup_node",
  description: "Dissolve a group; its members stay on the canvas where they visually are.",
  inputSchema: { groupId: z.string() },
  handler: async (a) => reply(await gw.post("/api/canvas/ungroup", a)),
}


// ---------------------------------------------------------------------------
// agent 的周边
// ---------------------------------------------------------------------------

const listCapabilities: ToolDef = {
  name: "list_capabilities",
  description:
    "What this machine can actually do. Call it before planning: model names from the " +
    "official catalogue are accepted but routed to whatever is configured here, and some " +
    "modalities may not be configured at all.",
  inputSchema: {
    modality: z.string().optional().describe("image | video | audio | speech; omit for all"),
  },
  handler: async (a) => reply(await gw.post("/api/capabilities", a ?? {})),
}

/**
 * 一个工具带 `action` 分派，**不是拆成五个** —— 官方就是这么设计的，
 * agent 提示词里写的是 `hub_memory` 加 action。拆开它一个都调不到。
 */
const memoryTool: ToolDef = {
  name: "memory",
  description:
    "Durable notes across turns. action: write | read | list | search | delete. " +
    "scope: project (default, follows the workspace) or global.",
  inputSchema: {
    action: z.enum(["write", "read", "list", "search", "delete"]),
    name: z.string().optional(),
    body: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional().describe("note | preference | asset ..."),
    scope: z.enum(["project", "global"]).optional(),
    query: z.string().optional().describe("For action=search"),
    asset_uri: z.string().optional(),
    asset_modality: z.string().optional(),
    projectRoot: z.string().optional().describe("Accepted for compatibility; ignored"),
  },
  handler: async (a) =>
    reply(
      await gw.post("/api/memory", {
        action: a.action,
        name: a.name,
        body: a.body,
        description: a.description,
        type: a.type,
        scope: a.scope,
        query: a.query,
        assetUri: a.asset_uri,
        assetModality: a.asset_modality,
      }),
    ),
}

const reportOutcome: ToolDef = {
  name: "report_outcome",
  description:
    "Record what a Stage produced. Appends — call it as often as needed; the planner reads " +
    "the whole trail when deciding whether to replan.",
  inputSchema: {
    outcomes: z.array(z.record(z.string(), z.unknown())).describe("One entry per result"),
  },
  handler: async (a) => reply(await gw.post("/api/report-outcome", { outcomes: a.outcomes })),
}

const readTool: ToolDef = {
  name: "read",
  description:
    "Read a text file from the workspace. Binary files are refused — use canvas nodes for media.",
  inputSchema: {
    file_path: z.string().describe("Workspace-relative path"),
    offset: z.number().optional().describe("0-based first line"),
    limit: z.number().optional(),
  },
  handler: async (a) => reply(await gw.post("/api/read-file", a)),
}

export const TOOLS: ToolDef[] = [
  canvasListNodes,
  canvasGetNode,
  canvasWriteNode,
  generateImage,
  generateVideo,
  generateAudioSpeech,
  generateAudioMusic,
  lyricsGeneration,
  musicCover,
  planWrite,
  planReplan,
  planPatchStage,
  planUpdateStageState,
  planGetStageStatus,
  planGetStageDetail,
  planGetWorkItems,
  canvasReadText,
  canvasGrepText,
  canvasApplyTextEdits,
  canvasGroupNodes,
  canvasGroupRecentOutputs,
  canvasUngroupNode,
  listCapabilities,
  memoryTool,
  reportOutcome,
  readTool,
]
