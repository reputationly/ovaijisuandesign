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
/**
 * 名单**读仓里固化的那份**,不读 `reference/`。
 *
 * `reference/` 是 gitignore 的（那是从官方应用里解出来的材料）——
 * 直接读它的话**本地绿、CI 红**,而且是在测试文件顶层读，模块一加载就
 * ENOENT，整个文件 0 pass。实测 CI 从 9/11 起一直是这么红的。
 *
 * 工具名是规格事实（`docs/mcp-tools.md` 里本来就列着），固化进仓没问题。
 */
const WHITELIST: Set<string> = new Set(
  (
    JSON.parse(
      readFileSync(
        fileURLToPath(new URL("../../docs/opencode-agent-tools.json", import.meta.url)),
        "utf8",
      ),
    ) as { tools: string[] }
  ).tools,
)

/**
 * 本地有官方那份时读出来，用于交叉校验。CI 上没有 —— 返回 null。
 *
 * 读 `agent-profiles`，**不是** `opencode-config`：后者是 3.0.11 里那第二套
 * 配置，3.0.12 就删了，官方主进程设给 `OPENCODE_CONFIG_DIR` 的一直是前者。
 * 之前读错了那份，结果照着一批早已没人引用的名字（`memory_write`、
 * `music_generation_song` …）注册了 12 个别名。
 */
function liveWhitelist(): Set<string> | null {
  try {
    const raw = readFileSync(
      fileURLToPath(new URL("../../reference/agent-profiles/base.json", import.meta.url)),
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
  } catch {
    return null
  }
}

describe("和官方工具面对齐", () => {
  it("规格文档能解析出全部 54 个工具", () => {
    // 解析挂了的话下面每一条都会假通过。
    //
    // 54 是 3.0.16 的数字（3.0.11 是 103，3.0.12～3.0.14 是 58）。改这个数字
    // 之前先确认是重跑了提取脚本，而不是解析坏了。
    expect(SPEC.size).toBe(54)
  })

  it("我们注册的每个工具名都在官方清单里", () => {
    // 名字错一个字母，官方 agent 配置里对它的调用就全部落空 ——
    // 而 LLM 不会报错，它会自己编一个看起来合理的做法。
    for (const t of TOOLS) {
      expect(SPEC.has(t.name), `${t.name} 不在官方工具清单里`).toBe(true)
    }
  })

  it("子 agent 准入名单里的名字都在官方注册表里", () => {
    // 两份都是从官方提取的，互相印证：准入名单里出现注册表没有的名字，
    // 说明其中一份是旧的（之前就是读错成了 3.0.11 的配置）。
    for (const n of WHITELIST) {
      expect(SPEC.has(n), `${n} 在准入名单里，但官方注册表没有`).toBe(true)
    }
  })

  it("入参名是官方那一组的子集", () => {
    // 允许少实现（还没做的功能），但**不允许自创字段** ——
    // 自创的字段 agent 永远不会填，而它顶掉的那个官方字段就再也传不进来。
    for (const t of TOOLS) {
      const official = SPEC.get(t.name)!
      for (const key of Object.keys(t.inputSchema)) {
        expect(official.has(key), `${t.name}.${key} 不是官方入参`).toBe(true)
      }
    }
  })

  it("已实现的工具就是这 24 个", () => {
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

  it("写节点只有合并版", () => {
    // 3.0.12 起注册表和 agent 配置用的都是 canvas_write_node（用 kind 区分）。
    // 拆开的 canvas_write_{media,text,table,file}_node 只存在于 3.0.11 的旧配置里，
    // 注册它们等于实现 agent 永远不会调的东西。
    const names = new Set(TOOLS.map((t) => t.name))
    expect(names.has("canvas_write_node")).toBe(true)
    for (const gone of ["canvas_write_media_node", "canvas_write_text_node", "canvas_write_table_node", "canvas_write_file_node"]) {
      expect(names.has(gone), `${gone}：官方早已合并进 canvas_write_node`).toBe(false)
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

describe("固化的白名单没有漂移", () => {
  /**
   * **只在本地跑**（CI 上没有 `reference/`）。
   *
   * 固化一份的代价是它会和官方漂移 —— 官方升版改了子 agent 的工具表，
   * 我们这份还是旧的，而漂移的表现是"某个子 agent 看不到某个工具",
   * 不报错。谁手上有官方应用，跑一次测试就能发现。
   */
  it("和官方 base.json 逐字一致", () => {
    const live = liveWhitelist()
    if (!live) {
      // 没有 reference/ 就跳过。**不能当成通过** —— 但也不该让 CI 红。
      expect(WHITELIST.size).toBeGreaterThan(0)
      return
    }
    expect([...live].sort()).toEqual([...WHITELIST].sort())
  })
})
