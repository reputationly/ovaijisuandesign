import { describe, expect, it } from "bun:test"

import type { ToolActivity } from "./api"
import { THINKING_TOOLS, labelFor, mergeCalls } from "./toolLabels"

const at = (tool: string, phase: ToolActivity["phase"], id: string, error?: string) =>
  ({ tool, phase, id, error, at: 0 }) as ToolActivity

describe("工具标签", () => {
  it("同一类的工具显示同一句话", () => {
    // 用户不需要知道调的是 group 还是 ungroup —— 都是"处理画布内容"。
    // 自己分类的话，同一个操作在两边看起来是两回事。
    for (const t of [
      "hub_canvas_write_node",
      "hub_canvas_group_nodes",
      "hub_canvas_ungroup_node",
      "hub_canvas_apply_text_edits",
    ]) {
      expect(labelFor(t).text).toBe("处理画布内容")
    }
    for (const t of ["hub_generate_image", "hub_generate_audio_music", "hub_lyrics_generation"]) {
      expect(labelFor(t).text).toBe("生成媒体")
    }
  })

  it("transient 里那批有各自更具体的文案", () => {
    // 没有这张表的话它们全是"处理中" —— 一连串"处理中"等于什么都没说。
    expect(labelFor("hub_canvas_read_text").text).toBe("阅读文档片段")
    expect(labelFor("hub_memory").text).toBe("管理记忆")
    expect(labelFor("hub_list_capabilities").text).toBe("查询可用能力")
  })

  it("认不出的工具回名字本身而不是「处理中」", () => {
    // 我们只实现了 58 个里的一部分，opencode 还会带自己的内置工具进来。
    // 回"处理中"的话，界面上一串一模一样的条目，看不出是哪个在动。
    expect(labelFor("hub_brand_new_tool").text).toBe("brand_new_tool")
  })

  it("silent 的那几个不显示", () => {
    expect(labelFor("task").silent).toBe(true)
    expect(labelFor("hub_edit_comfyui_workflow").silent).toBe(true)
    expect(labelFor("hub_generate_image").silent).toBe(false)
  })

  it("思考类工具就是官方那三个", () => {
    expect([...THINKING_TOOLS].sort()).toEqual([
      "hub_search_knowledge",
      "hub_select_image_recipe",
      "todowrite",
    ])
  })
})

describe("合并成一条", () => {
  it("start + ok 合成一条而不是两行", () => {
    // 分两行的话一次成功的调用占两行，用户看到的"做了几件事"就翻倍了。
    const calls = mergeCalls([at("hub_generate_image", "start", "c1"), at("hub_generate_image", "ok", "c1")])
    expect(calls).toHaveLength(1)
    expect(calls[0].phase).toBe("ok")
  })

  it("迟到的 start 不会把已经失败的调用打回转圈", () => {
    // 乱序到达时它会永远转下去，而那次调用其实早就结束了。
    const calls = mergeCalls([
      at("hub_generate_image", "start", "c1"),
      at("hub_generate_image", "error", "c1", "没配模型"),
      at("hub_generate_image", "start", "c1"),
    ])
    expect(calls[0].phase).toBe("error")
    expect(calls[0].error).toBe("没配模型")
  })

  it("没有 id 的各算一条", () => {
    // 都挤进同一个 key 的话，几次不同的调用会合成一条。
    const calls = mergeCalls([
      { tool: "hub_read", phase: "ok", id: "", at: 1 } as ToolActivity,
      { tool: "hub_read", phase: "ok", id: "", at: 2 } as ToolActivity,
    ])
    expect(calls).toHaveLength(2)
  })

  it("silent 的工具不进活动流", () => {
    const calls = mergeCalls([at("task", "start", "c1"), at("hub_read", "start", "c2")])
    expect(calls.map((c) => c.tool)).toEqual(["hub_read"])
  })

  it("保持发生顺序", () => {
    const calls = mergeCalls([
      at("hub_canvas_list_nodes", "start", "c1"),
      at("hub_generate_image", "start", "c2"),
      at("hub_canvas_list_nodes", "ok", "c1"),
    ])
    expect(calls.map((c) => c.tool)).toEqual(["hub_canvas_list_nodes", "hub_generate_image"])
  })
})
