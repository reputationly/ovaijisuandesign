/**
 * 工具定义。**名字和入参按官方那 103 个对齐**，见 `docs/mcp-tools.md`。
 *
 * opencode 会按 MCP server 名加前缀，所以 server 名必须是 `hub`，
 * agent 侧看到的才是 `hub_canvas_write_media_node` 这种 —— 官方的 agent
 * 配置就是照那些名字写的。
 *
 * 当前实现 8 个：画布 4 + 生成 4。**没实现的工具不注册空壳** ——
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

const canvasWriteMediaNode: ToolDef = {
  name: "canvas_write_media_node",
  description:
    "Place an existing workspace media file on the canvas as a node. " +
    "`assetPath` is workspace-relative, exactly as returned by a generation tool.",
  inputSchema: {
    assetPath: z.string().describe("Workspace-relative path, e.g. images/foo.png."),
    sourceNodeIds: z.array(z.string()).optional().describe("Nodes this one derives from."),
    allowDuplicate: z.boolean().optional(),
    position: z.object({ x: z.number(), y: z.number() }).optional(),
  },
  async handler(args) {
    return reply(await gw.post("/api/canvas/media-node", args))
  },
}

const canvasWriteTextNode: ToolDef = {
  name: "canvas_write_text_node",
  description:
    "Create or update a text node. Content is Markdown source. " +
    "When updating, pass `expectedContentHash` from a prior read.",
  inputSchema: {
    content: z.string(),
    name: z.string().optional().describe("File name for a new node, e.g. outline.md."),
    nodeId: z.string().optional().describe("Omit to create a new node."),
    mode: z.enum(["replace", "append", "prepend"]).optional(),
    // 不传的话，另一个写入方（用户在界面上编辑、或另一个 agent）的修改会被
    // 静默覆盖。文本节点恰恰是最可能被同时写的东西。
    expectedContentHash: z.string().optional(),
    sourceNodeIds: z.array(z.string()).optional(),
    position: z.object({ x: z.number(), y: z.number() }).optional(),
  },
  async handler(args) {
    return reply(await gw.post("/api/canvas/text-node", args))
  },
}

// ---------------------------------------------------------------------------
// 生成
//
// 四个工具的形状一致：提交 → 轮询 → 拿到工作区路径 → 放到画布上。
// 最后一步在这里做而不是让 agent 再调一次 canvas_write_media_node ——
// 官方也是这么做的，少一次往返，也少一个"生成了但没出现在画布上"的失败面。
// ---------------------------------------------------------------------------

/** 生成完直接落到画布上，返回给 agent 的结构里带上节点 id。 */
async function placeOnCanvas(product: Product) {
  const node = await gw.post<{ nodeId?: string }>("/api/canvas/media-node", {
    assetPath: product.path,
  })
  return {
    ok: true,
    path: product.path,
    ...(product.width ? { width: product.width } : {}),
    ...(product.height ? { height: product.height } : {}),
    ...(node.nodeId ? { nodeId: node.nodeId } : {}),
  }
}

/**
 * 选型字段收下但**不参与决策** —— 用哪个模型由我们的配置决定。
 *
 * 保留它们是因为官方的 agent 配置一定会填（`vendor` 在官方 schema 里是必填
 * 枚举）。收下比让 agent 撞上"未知字段"要好。
 *
 * 注意**语音那个叫 `model_name` 不是 `model_id`**，官方就是这么不一致的。
 * 跟着它 —— 我们统一成一个名字的话，agent 按契约填的那个就再也传不进来了。
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

export const TOOLS: ToolDef[] = [
  canvasListNodes,
  canvasGetNode,
  canvasWriteMediaNode,
  canvasWriteTextNode,
  generateImage,
  generateVideo,
  generateAudioSpeech,
  generateAudioMusic,
]
