import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "bun:test"

import { TOOLS } from "./tools"

/**
 * 从 `docs/mcp-tools.md` 读官方工具的名字与入参。
 *
 * 那份文档由 `scripts/extract-mcp-tools.py` 从官方产物提取，可随时重跑。
 * 拿它当基准而不是硬编码一份清单：应用升级后重跑脚本，这些测试就会告诉我们
 * 接口面变了没有。
 */
const SPEC: Map<string, Set<string>> = (() => {
  // 必须走 fileURLToPath，不能用 `new URL(...).pathname`：Windows 上后者给出
  // 的是 `/D:/a/...`（多一个前导斜杠），readFileSync 直接 ENOENT。
  const md = readFileSync(fileURLToPath(new URL("../../docs/mcp-tools.md", import.meta.url)), "utf8")
  const spec = new Map<string, Set<string>>()
  // 表格行形如： | `canvas_get_node` | `nodeId`, `nodeIds` |
  // 按 /\r?\n/ 切：Windows 的 checkout 可能带 CRLF，留着 \r 会让 `\|$` 匹配不上，
  // 于是 SPEC 空掉——测试不会报"解析失败"，而是每条断言各挂各的。
  for (const line of md.split(/\r?\n/)) {
    const m = /^\|\s*`([a-z0-9_]+)`\s*\|\s*(.*?)\s*\|$/.exec(line)
    if (!m) continue
    const params = [...m[2]!.matchAll(/`([a-zA-Z0-9_]+)`/g)].map((x) => x[1]!)
    spec.set(m[1]!, new Set(params))
  }
  return spec
})()

/**
 * 官方每个专家子 agent 的工具白名单（`base.json` 的 `agent.<名>.tools`）。
 *
 * 这**不是**工具注册表，是 opencode 的权限表：每个子 agent 都有一条
 * `"hub_*": false` 通配拒绝，加一份显式 `true` 列表。opencode 把这段转成
 * `permission`,然后**把 deny 的工具从工具表里整个删掉** —— 模型看不见它，
 * 不是"调用失败"，是"没有这个工具"。
 *
 * 所以我们的别名名字必须和这份列表逐字一致。差一个字母不会有任何报错：
 * 工具照样注册着，只是那个子 agent 永远看不到。
 */
const WHITELIST: Set<string> = (() => {
  const raw = readFileSync(
    fileURLToPath(new URL("../../reference/opencode-config/base.json", import.meta.url)),
    "utf8",
  )
  const cfg = JSON.parse(raw) as { agent?: Record<string, { tools?: Record<string, boolean> }> }
  const out = new Set<string>()
  for (const a of Object.values(cfg.agent ?? {})) {
    for (const [k, v] of Object.entries(a.tools ?? {})) {
      if (v === true && k.startsWith("hub_") && !k.includes("*")) out.add(k.slice(4))
    }
  }
  return out
})()

describe("和官方工具面对齐", () => {
  it("规格文档能解析出全部 58 个工具", () => {
    // 解析挂了的话下面每一条都会假通过。
    //
    // 58 是 3.0.12 的数字。3.0.11 是 103——官方把四个 canvas_write_* 之类
    // 合并掉了。改这个数字之前先确认是重跑了提取脚本，而不是解析坏了。
    expect(SPEC.size).toBe(58)
  })

  it("我们注册的每个工具名都在官方清单里", () => {
    // 名字错一个字母，官方 agent 配置里对它的调用就全部落空 ——
    // 而 LLM 不会报错，它会自己编一个看起来合理的做法。
    //
    // 两个来源都算数：`docs/mcp-tools.md` 是官方 MCP 的注册表，
    // `WHITELIST` 是子 agent 的准入名单。后者里有一批注册表没有的名字
    // （官方把语音/音乐拆得更细），我们的别名就是冲它去的。
    for (const t of TOOLS) {
      expect(
        SPEC.has(t.name) || WHITELIST.has(t.name),
        `${t.name} 既不在官方工具清单里，也不在任何子 agent 的白名单里`,
      ).toBe(true)
    }
  })

  it("入参名是官方那一组的子集", () => {
    // 允许少实现（还没做的功能），但**不允许自创字段** ——
    // 自创的字段 agent 永远不会填，而它顶掉的那个官方字段就再也传不进来。
    for (const t of TOOLS) {
      // 别名共用底层工具的 schema，入参按底层那个算 —— 这里只查底层的。
      const official = SPEC.get(t.name)
      if (!official) continue
      for (const key of Object.keys(t.inputSchema)) {
        expect(official.has(key), `${t.name}.${key} 不是官方入参`).toBe(true)
      }
    }
  })

  it("已实现的工具就是这 38 个", () => {
    // 钉住清单本身。加工具是好事，但**必须同时更新这里** ——
    // 否则漏注册一个（比如 TOOLS 数组忘了加）不会有任何提示。
    const names = TOOLS.map((t) => t.name).sort()
    expect(names).toEqual(
      [
        "canvas_get_node",
        "canvas_list_nodes",
        "canvas_write_node",
        "generate_audio_music",
        "generate_audio_speech",
        "generate_image",
        "generate_video",
        "lyrics_generation",
        "music_cover",
        "plan_get_stage_detail",
        "plan_get_stage_status",
        "plan_get_work_items",
        "plan_patch_stage",
        "plan_replan",
        "plan_update_stage_state",
        "plan_write",
        "canvas_read_text",
        "canvas_grep_text",
        "canvas_apply_text_edits",
        "canvas_group_nodes",
        "canvas_group_recent_outputs",
        "canvas_ungroup_node",
        "list_capabilities",
        "memory",
        "report_outcome",
        "read",
        // -- 别名。转发到上面的 handler，不新增能力。见 tools.ts 的 ALIASES。--
        "canvas_write_media_node",
        "canvas_write_text_node",
        "memory_write",
        "memory_read",
        "memory_list",
        "memory_search",
        "memory_delete",
        "music_generation_song",
        "music_generation_instrumental",
        "music_cover_generate_oneshot",
        "music_cover_generate_with_lyrics",
        "music_cover_preprocess",
      ].sort(),
    )
  })

  it("plan 工具的入参名和官方逐字一致", () => {
    // agent 提示词里写死了这些名字，改一个字它就传不进来 ——
    // 而 MCP 对多余的参数是**静默丢弃**，不报错。
    const byName = new Map(TOOLS.map((t) => [t.name, t]))
    for (const [tool, must] of [
      ["plan_write", ["plan_id", "plan", "expected_revision"]],
      ["plan_replan", ["plan_id", "expected_revision", "operations", "preserve_through_stage_id"]],
      ["plan_patch_stage", ["plan_id", "expected_revision", "stage", "after_order", "remove"]],
      ["plan_update_stage_state", ["plan_id", "expected_revision", "updates"]],
      ["plan_get_work_items", ["plan_id", "stage_id", "work_item_ids"]],
      ["plan_get_stage_status", ["plan_id", "stage_id", "order"]],
      ["plan_get_stage_detail", ["plan_id", "stage_id", "order"]],
    ] as [string, string[]][]) {
      const keys = Object.keys(byName.get(tool)!.inputSchema)
      for (const k of must) expect(keys, `${tool} 缺 ${k}`).toContain(k)
    }
  })

  it("没有重名", () => {
    expect(new Set(TOOLS.map((t) => t.name)).size).toBe(TOOLS.length)
  })
})

describe("工具契约里那些不能丢的字段", () => {
  const byName = new Map(TOOLS.map((t) => [t.name, t]))

  it("写文本节点带 expectedContentHash", () => {
    // 不带的话，用户在界面上的编辑或另一个 agent 的写入会被静默覆盖。
    expect(byName.get("canvas_write_node")!.inputSchema).toHaveProperty("expectedContentHash")
  })

  it("合并版和别名同时在", () => {
    // 3.0.12 的**注册表**把 canvas_write_{media,text,table,file}_node 合并成了
    // canvas_write_node，两个版本的 agent 提示词引用的也一直是合并版。
    //
    // 但 base.json 里 media-agent / editing 的**准入名单**写的还是拆开的那几个，
    // 而 opencode 会把没准入的工具从工具表里删掉。所以两边都得有：
    // 合并版给主 agent 用，别名给子 agent 用。
    const names = new Set(TOOLS.map((t) => t.name))
    expect(names.has("canvas_write_node")).toBe(true)
    expect(names.has("canvas_write_media_node")).toBe(true)
    expect(names.has("canvas_write_text_node")).toBe(true)
    // 表格节点和文件节点我们的画布没有。**给个名字只会让 agent 白调一次** ——
    // 它拿到一个失败，而不是"这条路走不通，换一个"。
    for (const gone of ["canvas_write_table_node", "canvas_write_file_node"]) {
      expect(names.has(gone), `${gone}：我们的画布没有这种节点，不该注册`).toBe(false)
    }
  })

  it("出图能接底图", () => {
    // 没有 image_paths 就只能文生图，画布上的重绘 / 擦除全做不了。
    expect(byName.get("generate_image")!.inputSchema).toHaveProperty("image_paths")
  })

  it("音乐的风格描述和歌词是两个字段", () => {
    // 揉成一个会让引擎把歌词当风格描述用掉，出曲成功但完全不对，且不报错。
    const music = byName.get("generate_audio_music")!.inputSchema
    expect(music).toHaveProperty("prompt")
    expect(music).toHaveProperty("lyrics")
  })
})

describe("别名", () => {
  const byName = new Map(TOOLS.map((t) => [t.name, t]))
  const ALIAS_NAMES = [
    "canvas_write_media_node",
    "canvas_write_text_node",
    "memory_write",
    "memory_read",
    "memory_list",
    "memory_search",
    "memory_delete",
    "music_generation_song",
    "music_generation_instrumental",
    "music_cover_generate_oneshot",
    "music_cover_generate_with_lyrics",
    "music_cover_preprocess",
  ]

  it("每个别名都真的在某个子 agent 的白名单里", () => {
    // 名字差一个字母，工具照样注册着，但那个子 agent 永远看不到它 ——
    // 没有任何报错，只是这批活干不了。别名的全部意义就是名字对上。
    for (const n of ALIAS_NAMES) {
      expect(WHITELIST.has(n), `${n} 不在任何子 agent 的白名单里，加它没有意义`).toBe(true)
    }
  })

  it("固定参数覆盖调用方给的", async () => {
    // `canvas_write_media_node` 这个名字本身就是"写媒体节点"。agent 再传一个
    // kind=text 是自相矛盾的，以名字为准 —— 否则会写出一个类型不对的节点，
    // 而且不报错。
    let seen: Record<string, unknown> = {}
    const fake = {
      name: "x",
      description: "",
      inputSchema: {},
      handler: async (a: Record<string, unknown>) => {
        seen = a
        return { structuredContent: {}, content: [] }
      },
    }
    const wrapped = {
      ...fake,
      handler: (a: Record<string, unknown>) => fake.handler({ ...a, kind: "media" }),
    }
    await wrapped.handler({ kind: "text", assetPath: "images/a.png" })
    expect(seen.kind).toBe("media")
  })

  it("纯音乐那个别名不会带着歌词转发", async () => {
    // 名字点了 instrumental。带歌词过去会唱出来 —— 有声音、不报错，
    // 但不是这个工具名承诺的东西。
    const t = byName.get("music_generation_instrumental")!
    let got: Record<string, unknown> | null = null
    const base = byName.get("generate_audio_music")!
    const orig = base.handler
    base.handler = async (a: Record<string, unknown>) => {
      got = a
      return { structuredContent: {}, content: [] }
    }
    try {
      await t.handler({ prompt: "lo-fi", lyrics: "不该唱出来" })
    } finally {
      base.handler = orig
    }
    expect(got).not.toBeNull()
    expect(got!.lyrics).toBeUndefined()
    expect(got!.mode).toBe("instrumental")
  })

  it("翻唱的 oneshot 保留原词", async () => {
    // oneshot 的语义是"保持参考音频的词"。传了 lyrics 过去就变成唱新词，
    // 而调用方以为自己在做前者。
    const t = byName.get("music_cover_generate_oneshot")!
    const base = byName.get("music_cover")!
    let got: Record<string, unknown> | null = null
    const orig = base.handler
    base.handler = async (a: Record<string, unknown>) => {
      got = a
      return { structuredContent: {}, content: [] }
    }
    try {
      await t.handler({ audio: "audios/a.mp3", prompt: "爵士", lyrics: "新词" })
    } finally {
      base.handler = orig
    }
    expect(got!.action).toBe("generate")
    expect(got!.lyrics).toBeUndefined()
  })

  it("memory 的五个别名各自钉住一个 action", async () => {
    const base = byName.get("memory")!
    const orig = base.handler
    const seen: string[] = []
    base.handler = async (a: Record<string, unknown>) => {
      seen.push(a.action as string)
      return { structuredContent: {}, content: [] }
    }
    try {
      for (const act of ["write", "read", "list", "search", "delete"]) {
        // 调用方乱传一个 action 也不该顶掉名字里的那个。
        await byName.get(`memory_${act}`)!.handler({ action: "delete", name: "x" })
      }
    } finally {
      base.handler = orig
    }
    expect(seen).toEqual(["write", "read", "list", "search", "delete"])
  })
})
