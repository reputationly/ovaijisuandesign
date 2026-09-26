import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { type FakeGateway, startFakeGateway, status } from "./__fixtures__/fake-gateway.js";
import { observeAttachmentInputs, toolAttachmentPaths, userAttachmentPaths } from "./attachment-inputs.js";
import {
  _resetAttachmentRefsForTests,
  attachmentRefsBySession,
  mergeAttachmentRefs,
  observeQuestionReplyAttachments,
  parseToolAttachmentRefs,
  questionReplyAttachmentPaths,
  rememberAttachmentRefs,
  rememberToolAttachmentRefs,
  toolAttachmentRefsForTurn,
} from "./attachment-refs.js";

const TURN = "0123456789ABCDEF0123456789abcdef";

let gw: FakeGateway;
beforeAll(async () => {
  gw = await startFakeGateway();
});
afterAll(() => gw.close());
beforeEach(() => {
  gw.reset();
  _resetAttachmentRefsForTests();
});

describe("附件路径", () => {
  it("用户消息：file part 的 file: URL + 正文开头的附件清单；远程 URL 跳过，Windows 盘符保留", () => {
    // file: URL 按本机规则转路径：Windows 上要带盘符，否则不是本地文件、会被跳过。
    const win = process.platform === "win32";
    const parts = [
      { type: "file", url: win ? "file:///C:/tmp/a%20b.png" : "file:///tmp/a%20b.png" },
      { type: "file", url: "https://x/y.png" },
      { type: "text", text: "[User attached files:\n- [1] image: /w/cat.png\n- video: C:\\v\\clip.mp4\n- https://cdn/x.png\n\n- /ignored.png\n]\n\n帮我做个视频" },
      { type: "text", text: "正文里 [User attached files:\n- /not-at-start.png\n]\n\n" },
    ];
    expect(userAttachmentPaths(parts)).toEqual([win ? "C:\\tmp\\a b.png" : "/tmp/a b.png", "/w/cat.png", "C:\\v\\clip.mp4"]);
  });

  it("工具参数：按命名约定取输入路径，最多 32 个、去重", () => {
    expect(toolAttachmentPaths({ image_paths: ["/a", "/a", "https://x"], reference_path: "/r", prompt: "/p", source_paths: 3 })).toEqual(["/a", "/r"]);
    expect(toolAttachmentPaths({ image_paths: Array.from({ length: 40 }, (_, i) => `/f${i}`) })).toHaveLength(32);
    expect(toolAttachmentPaths(null)).toEqual([]);
  });
});

describe("附件登记", () => {
  it("用户消息的附件用 scope=message，只认资产库引用；出错回空", async () => {
    gw.routes.set("/attachment-observations", {
      attachment_refs: [{ attachment_source: "asset_vault", attachment_id: "as_1" }, { attachment_source: "cloud", attachment_id: "c" }, { attachment_source: "asset_vault", attachment_id: " " }],
    });
    expect(await observeAttachmentInputs(gw.url, "ses", ["/a"])).toEqual([{ attachment_source: "asset_vault", attachment_id: "as_1" }]);
    expect(gw.calls[0]!.body).toEqual({ paths: ["/a"], direction: "input", scope: "message" });
    await observeAttachmentInputs(gw.url, "ses", ["/a"], { callId: "call_1", chatTurnId: TURN });
    expect(gw.calls[1]!.body).toEqual({ paths: ["/a"], direction: "input", tool_call_id: "call_1", chat_turn_id: TURN });
    expect(await observeAttachmentInputs(gw.url, "ses", [])).toEqual([]);
    gw.routes.set("/attachment-observations", status(500));
    expect(await observeAttachmentInputs(gw.url, "ses", ["/a"])).toEqual([]);
  });

  it("用户消息 metadata 里的引用：每条消息整体替换，没有就清掉", () => {
    rememberAttachmentRefs("ses", [{ metadata: { attachments: [{ attachment_source: "asset_vault", attachment_id: "a" }, { attachment_source: "asset_vault", attachment_id: "a" }, { attachment_source: "bogus", attachment_id: "b" }] } }]);
    expect(attachmentRefsBySession.get("ses")).toEqual([{ attachment_source: "asset_vault", attachment_id: "a", direction: "input" }]);
    rememberAttachmentRefs("ses", [{ metadata: {} }]);
    expect(attachmentRefsBySession.has("ses")).toBe(false);
  });

  it("工具级引用要带调用 id 和方向；按会话 + turn 记，turn id 大小写不敏感", () => {
    const refs = parseToolAttachmentRefs([
      { attachment_source: "asset_vault", attachment_id: "a", tool_call_id: "c1", direction: "output" },
      { attachment_source: "asset_vault", attachment_id: "a", tool_call_id: "c1", direction: "output" },
      { attachment_source: "asset_vault", attachment_id: "b", direction: "input" },
    ]);
    expect(refs).toHaveLength(1);
    rememberToolAttachmentRefs("ses", { _meta: { chat_turn_id: TURN, attachment_refs: refs } });
    rememberToolAttachmentRefs("ses", { _meta: { chat_turn_id: "bad", attachment_refs: refs } });
    expect(toolAttachmentRefsForTurn("ses", TURN.toLowerCase())).toEqual(refs);
    expect(mergeAttachmentRefs(refs, [{ attachment_source: "asset_vault", attachment_id: "a", direction: "output" }], refs)).toHaveLength(2);
  });

  it("question 回答里的附件清单：取路径登记到这次调用上", async () => {
    const result = { metadata: { answers: [["选 A"], ["[User attached files:\n- [1] image: /w/ref.png\n- /w/ref.png\n]"]] } };
    expect(questionReplyAttachmentPaths(result)).toEqual(["/w/ref.png"]);
    gw.routes.set("/attachment-observations", { attachment_refs: [{ attachment_source: "asset_vault", attachment_id: "as_9" }] });
    expect(await observeQuestionReplyAttachments(gw.url, "ses", "call_q", result)).toEqual([
      { attachment_source: "asset_vault", attachment_id: "as_9", tool_call_id: "call_q", direction: "input" },
    ]);
    expect(gw.calls[0]!.body).toEqual({ paths: ["/w/ref.png"], tool_call_id: "call_q", direction: "input" });
    expect(await observeQuestionReplyAttachments(gw.url, "ses", "", result)).toEqual([]);
  });
});
