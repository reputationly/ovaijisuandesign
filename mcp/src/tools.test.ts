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
    for (const t of TOOLS) {
      expect(SPEC.has(t.name), `${t.name} 不在官方工具清单里`).toBe(true)
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

  it("画布 3 个 + 生成 4 个都在", () => {
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
    expect(byName.get("canvas_write_node")!.inputSchema).toHaveProperty("expectedContentHash")
  })

  it("统一的写节点工具，不是拆开的那几个", () => {
    // 3.0.12 把 canvas_write_{media,text,table,file}_node 合并掉了，而两个
    // 版本的 agent 提示词引用的一直都是 canvas_write_node——拆开的那几个
    // agent 从来没调过。实现错了的话，写节点这条路永远走不通。
    const names = new Set(TOOLS.map((t) => t.name))
    expect(names.has("canvas_write_node")).toBe(true)
    for (const gone of [
      "canvas_write_media_node",
      "canvas_write_text_node",
      "canvas_write_table_node",
      "canvas_write_file_node",
    ]) {
      expect(names.has(gone), `${gone} 在 3.0.12 里已经不存在`).toBe(false)
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
