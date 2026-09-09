import { describe, expect, it } from "bun:test"

import { TOOLS } from "./tools"

/**
 * 从 `docs/mcp-tools.md` 读官方那 103 个工具的名字与入参。
 *
 * 那份文档由 `scripts/extract-mcp-tools.py` 从官方产物提取，可随时重跑。
 * 拿它当基准而不是硬编码一份清单：应用升级后重跑脚本，这些测试就会告诉我们
 * 接口面变了没有。
 */
function officialSpec(): Map<string, Set<string>> {
  const md = Bun.file(new URL("../../docs/mcp-tools.md", import.meta.url)).text()
  return md.then as never // 占位，见下面同步版本
}

const SPEC: Map<string, Set<string>> = (() => {
  const path = new URL("../../docs/mcp-tools.md", import.meta.url).pathname
  const md = require("node:fs").readFileSync(path, "utf8") as string
  const spec = new Map<string, Set<string>>()
  // 表格行形如： | `canvas_get_node` | `nodeId`, `nodeIds` |
  for (const line of md.split("\n")) {
    const m = /^\|\s*`([a-z0-9_]+)`\s*\|\s*(.*?)\s*\|$/.exec(line)
    if (!m) continue
    const params = [...m[2]!.matchAll(/`([a-zA-Z0-9_]+)`/g)].map((x) => x[1]!)
    spec.set(m[1]!, new Set(params))
  }
  return spec
})()

void officialSpec // 只是为了让上面那段文档注释有个落点

describe("和官方工具面对齐", () => {
  it("规格文档能解析出全部 103 个工具", () => {
    // 解析挂了的话下面每一条都会假通过。
    expect(SPEC.size).toBe(103)
  })

  it("我们注册的每个工具名都在官方清单里", () => {
    // 名字错一个字母，官方 agent 配置里对它的调用就全部落空 ——
    // 而 LLM 不会报错，它会自己编一个看起来合理的做法。
    for (const t of TOOLS) {
      expect(SPEC.has(t.name), `${t.name} 不在官方 103 个工具里`).toBe(true)
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

  it("画布 4 个 + 生成 4 个都在", () => {
    const names = TOOLS.map((t) => t.name).sort()
    expect(names).toEqual(
      [
        "canvas_get_node",
        "canvas_list_nodes",
        "canvas_write_media_node",
        "canvas_write_text_node",
        "generate_audio_music",
        "generate_audio_speech",
        "generate_image",
        "generate_video",
      ].sort(),
    )
  })

  it("没有重名", () => {
    expect(new Set(TOOLS.map((t) => t.name)).size).toBe(TOOLS.length)
  })
})

describe("工具契约里那些不能丢的字段", () => {
  const byName = new Map(TOOLS.map((t) => [t.name, t]))

  it("写文本节点带 expectedContentHash", () => {
    // 不带的话，用户在界面上的编辑或另一个 agent 的写入会被静默覆盖。
    expect(byName.get("canvas_write_text_node")!.inputSchema).toHaveProperty(
      "expectedContentHash",
    )
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
