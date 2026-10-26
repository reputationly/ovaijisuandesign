import { describe, expect, it } from "vitest";

import {
  findEmbeddedAttachmentManifests,
  parseAttachmentManifest,
  parseHiddenContextEnvelope,
} from "./hidden-context.js";

describe("隐藏上下文信封", () => {
  const body = "<design_context>\n<user_attached_files>\n- [1] image: /w/a.png\n- video: /w/b.mp4\n</user_attached_files>\n\n项目：夏日\n</design_context>";

  it("4.0.4 的 <design_context> 信封：拿到清单与用户正文", () => {
    const parsed = parseHiddenContextEnvelope(`${body}\n\n帮我做个视频`);
    expect(parsed).not.toBeNull();
    expect(parsed!.content).toBe("帮我做个视频");
    expect(parsed!.manifest).toContain("/w/a.png");
    expect(parsed!.envelope.startsWith("<design_context>")).toBe(true);
    expect(parseAttachmentManifest(parsed!.manifest)).toEqual(["/w/a.png", "/w/b.mp4"]);
  });

  it("老的 [User attached files: …] 格式仍然认", () => {
    const parsed = parseHiddenContextEnvelope("[User attached files:\n- [1] image: /w/cat.png\n]\n\n做张图");
    expect(parsed).toMatchObject({ content: "做张图", manifest: "- [1] image: /w/cat.png\n" });
  });

  it("两种都不是就返回 null（不能把普通文本当清单）", () => {
    expect(parseHiddenContextEnvelope("直接说事")).toBeNull();
    expect(parseHiddenContextEnvelope("[User attached files:\n- /x.png\n] 中间没有空行")).toBeNull();
  });

  it("正文中间嵌着的清单也要能找到（多段拼接）", () => {
    const text = `第一段\n<design_context>\n<user_attached_files>\n- /w/d.png\n</user_attached_files>\n</design_context>\n第二段 [User attached files:\n- /w/e.png\n]`;
    expect(findEmbeddedAttachmentManifests(text)).toEqual(["- /w/d.png", "- /w/e.png"]);
  });

  it("空清单不返回（避免把空数组当成'有附件'）", () => {
    expect(findEmbeddedAttachmentManifests("<design_context>\n没清单\n</design_context>")).toEqual([]);
  });

  it("清单解析：去掉序号与类型前缀，空行截断", () => {
    expect(parseAttachmentManifest("- [2] image: /w/f.png\n- /w/g.png\n\n- /ignored.png")).toEqual(["/w/f.png", "/w/g.png"]);
  });
});
