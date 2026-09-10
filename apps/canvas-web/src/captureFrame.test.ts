import { describe, expect, it } from "bun:test"

import { frameFileName } from "./captureFrame"

describe("截帧", () => {
  it("文件名带上秒数", () => {
    // 同一个视频截好几帧时要分得清。都叫 frame.png 的话，落盘的同名避让
    // 会改成 frame-2.png —— 用户看不出那是第几秒。
    expect(frameFileName("clip.mp4", 3)).toBe("clip-3s.png")
    expect(frameFileName("a95e4.mp4", 12.5)).toBe("a95e4-12.5s.png")
  })

  it("秒数取整到 0.1，不让浮点尾巴进文件名", () => {
    // currentTime 常常是 3.7000000000000002 这种。
    expect(frameFileName("v.mp4", 3.7000000000000002)).toBe("v-3.7s.png")
    expect(frameFileName("v.mp4", 0)).toBe("v-0s.png")
  })

  it("没有原名也能出一个能用的名字", () => {
    expect(frameFileName(undefined, 1)).toBe("video-1s.png")
  })

  it("去掉原扩展名而不是叠加", () => {
    // 不去的话会得到 clip.mp4-3s.png，看起来像个损坏的文件。
    expect(frameFileName("clip.mp4", 3)).not.toContain(".mp4")
  })
})
