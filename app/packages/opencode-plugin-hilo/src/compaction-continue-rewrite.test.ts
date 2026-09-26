import { afterEach, describe, expect, it } from "vitest";

import { hasPendingCompactionContinuePrompt, languageInstruction, rewriteCompactionContinueLanguage } from "./compaction-continue-rewrite.js";

const continueMsg = (text = "Continue if you have next steps, or stop and ask for clarification.", extra: Record<string, unknown> = {}) => ({
  info: { role: "user" },
  parts: [{ type: "text", synthetic: true, text, ...extra }],
});

describe("压缩后续写消息的语言提示", () => {
  afterEach(() => {
    delete process.env.HILO_USER_LANG;
  });

  it("按工作语言选句子：中 / 英 / 日 / 韩 / 其他 locale", () => {
    expect(languageInstruction("zh-CN")).toBe("[language] 请用中文回复。");
    expect(languageInstruction("en-US")).toBe("[language] Respond in English.");
    expect(languageInstruction("ja")).toBe("[language] 日本語で返答してください。");
    expect(languageInstruction("ko-KR")).toBe("[language] 한국어로 답변하세요.");
    expect(languageInstruction("fr")).toBe("[language] Respond using the fr locale.");
  });

  it("没有工作语言：退回界面语言，再不行跟着对话走", () => {
    process.env.HILO_USER_LANG = "zh-CN";
    expect(languageInstruction()).toBe("[language] 请用中文回复。");
    process.env.HILO_USER_LANG = "de";
    expect(languageInstruction()).toBe("[language] Respond in the same language the user has been using in this conversation.");
  });

  it("只改用户角色的合成续写消息，改一次就不再改", () => {
    const messages = [
      continueMsg(),
      continueMsg("The previous request exceeded the provider's size limit due to large media."),
      { info: { role: "assistant" }, parts: [{ type: "text", synthetic: true, text: "Continue if you have next steps" }] },
      { info: { role: "user" }, parts: [{ type: "text", text: "Continue if you have next steps" }] },
    ];
    expect(hasPendingCompactionContinuePrompt(messages)).toBe(true);
    expect(rewriteCompactionContinueLanguage(messages, "en")).toBe(2);
    expect((messages[0]!.parts[0] as { text: string }).text).toMatch(/clarification\.\n\n\[language\] Respond in English\.$/);
    expect((messages[2]!.parts[0] as { text: string }).text).toBe("Continue if you have next steps");
    expect((messages[3]!.parts[0] as { text: string }).text).toBe("Continue if you have next steps");
    expect(hasPendingCompactionContinuePrompt(messages)).toBe(false);
    expect(rewriteCompactionContinueLanguage(messages, "en")).toBe(0);
  });
});
