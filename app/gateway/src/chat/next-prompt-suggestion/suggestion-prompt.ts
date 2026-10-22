/**
 * 「下一步提示建议」的提示词与请求体 / 响应解析。
 *
 * 移植自 4.0.3 的 `gateway/dist/next-prompt-suggestion/suggestion-prompt.js`
 * （抽取在 `.probe/extracted/nps-4.0.3/suggestion-prompt.js`）。
 *
 * **提示词正文逐字照搬**（下面的 SUGGESTION_INSTRUCTIONS 是程序化提取的原字符串，
 * 没有手工转录）—— 提示词一改，生成质量就变，所以这里不做任何改写。
 */

export const SUGGESTION_MAX_CHARS = 60;
export const SUGGESTION_MAX_OUTPUT_TOKENS = 2048;
export const SUGGESTION_INSTRUCTIONS = [
  "You draft the next message FROM the user TO their creative assistant. The draft appears in the user\u2019s composer for them to review, edit, and send.",
  "",
  "The conversation is reference material. The final task names the drafting role. Read the history for established requirements, and use the latest exchange to identify the current material and next useful step.",
  "",
  "Entries such as [tool: tool_name status] in the history are internal tool-call records, provided only as context. Write the suggestion in natural language and do not include internal tool execution statuses.",
  "",
  "Choose a continuation, refinement, comparison, or question about that material. Distinguish delivered content from unfinished work: an existing set of alternatives calls for choosing, comparing, or refining them. Carry forward the latest user direction, including whether they are discussing or executing. A request to keep discussing remains active until the user asks to proceed.",
  "",
  "Every named topic, audience, platform, language change, duration, and production requirement comes from the actual conversation. When an essential detail is open, ask the assistant to help resolve it. Preserve the user\u2019s language and tone. Write as the person requesting help from the assistant.",
  "",
  "Examples of the drafting task (the actual conversation supplies its own subjects and requirements):",
  "User: \u201C\u5148\u804A\u65B9\u6848\uFF0C\u6682\u65F6\u4E0D\u751F\u6210\u3002\u6D77\u62A5\u60F3\u7A81\u51FA\u5B89\u9759\u7684\u611F\u89C9\u3002\u201D Assistant: \u201C\u53EF\u4EE5\u7528\u7559\u767D\u548C\u4F4E\u9971\u548C\u914D\u8272\u6765\u8868\u73B0\u3002\u201D Draft: \u201C\u7559\u767D\u548C\u4F4E\u9971\u548C\u914D\u8272\u5206\u522B\u4F1A\u662F\u4EC0\u4E48\u6548\u679C\uFF1F\u5E2E\u6211\u6BD4\u8F83\u4E00\u4E0B\uFF0C\u5148\u628A\u6D77\u62A5\u65B9\u6848\u8BA8\u8BBA\u6E05\u695A\u3002\u201D",
  "User: \u201C\u8FD9\u51E0\u4E2A\u6807\u9898\u53EF\u4EE5\u3002\u201D Assistant: \u201C\u8FD9\u91CC\u6709\u76F4\u767D\u3001\u5E7D\u9ED8\u3001\u6E29\u6696\u4E09\u4E2A\u7248\u672C\u3002\u201D Draft: \u201C\u8FD9\u4E09\u4E2A\u6807\u9898\u4F60\u66F4\u63A8\u8350\u54EA\u4E2A\uFF1F\u5E2E\u6211\u9009\u4E00\u4E2A\uFF0C\u518D\u628A\u63AA\u8F9E\u6539\u5F97\u66F4\u81EA\u7136\u3002\u201D",
  "User: \u201CThe outline works.\u201D Assistant: \u201CNext I can expand the opening section using this outline.\u201D Draft: \u201CExpand the opening section using this outline, keeping the same focus and tone.\u201D",
  "",
  `Return only the draft: one complete, natural user message as a single line of plain text, at most ${SUGGESTION_MAX_CHARS} characters. Name the relevant material and express a specific action or question with enough context to send as-is.`
].join("\n");

export const SUGGESTION_TASK = JSON.stringify({
  task: "Draft the next message from this user to their assistant.",
  drafting_role: "user"
});

export interface PromptTranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

/** 组模型请求体。cache_control 的两处是参照原样：系统提示 + 历史最后一条。 */
export function buildSuggestionRequestBody(options: {
  model: string;
  transcript: PromptTranscriptMessage[];
}) {
  const messages = options.transcript.map((message, index) => ({
    role: message.role,
    content: [
      {
        type: "text" as const,
        text: message.content,
        ...(index === options.transcript.length - 1
          ? { cache_control: { type: "ephemeral" as const } }
          : {}),
      },
    ],
  }));
  messages.push({
    role: "user",
    content: [{ type: "text" as const, text: SUGGESTION_TASK }],
  });
  return {
    model: options.model,
    // 在稳定的系统提示与历史前缀上请求缓存点；上游是否支持取决于端点。
    system: [
      {
        type: "text" as const,
        text: SUGGESTION_INSTRUCTIONS,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages,
    max_tokens: SUGGESTION_MAX_OUTPUT_TOKENS,
    stream: false,
  };
}

/** 把模型输出清洗成一句草稿；纯工具记录（没有文字）时判为无建议。 */
export function parseSuggestionAnswer(text: string): string | null {
  const suggestion = text
    // 尖括号用 \u003c 写：直接写会被上层工具当成 HTML 标签过滤掉（第 27 轮踩过）
    .replace(/\u003cthink\u003e[\s\S]*?\u003c\/think\u003e/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const withoutToolRecords = suggestion.replace(
    /\[\s*tool\s*:\s*[^\s[\]]+(?:\s+[a-z_]+)?\s*(?:\]|$)/gi,
    "",
  );
  if (withoutToolRecords !== suggestion && !/[\p{L}\p{N}]/u.test(withoutToolRecords)) return null;
  return suggestion || null;
}
