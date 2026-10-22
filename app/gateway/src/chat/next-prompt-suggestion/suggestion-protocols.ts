/**
 * 「下一步提示建议」的三种协议族适配。
 *
 * 移植自 4.0.3 的 `gateway/dist/next-prompt-suggestion/suggestion-protocols.js`
 * （抽取在 `.probe/extracted/nps-4.0.3/suggestion-protocols.js`）。
 *
 * 为什么要分协议：不同 provider 的包走不同端点与不同请求/响应形状 ——
 *   messages  → Anthropic 风格（/messages，system 数组 + cache_control）
 *   responses → OpenAI Responses（/responses，instructions + input，store:false）
 *   chat      → OpenAI Chat Completions（/chat/completions，system 作为一条 message）
 * 解析时也各自校验「这一轮是不是正常结束」（stop_reason / status / finish_reason），
 * 不完整就判为无建议。
 */

import {
  SUGGESTION_INSTRUCTIONS,
  SUGGESTION_MAX_OUTPUT_TOKENS,
  SUGGESTION_TASK,
  buildSuggestionRequestBody,
  parseSuggestionAnswer,
  type PromptTranscriptMessage,
} from "./suggestion-prompt.js";

export const SUGGESTION_PROTOCOL_PATHS = {
  messages: "/messages",
  responses: "/responses",
  chat: "/chat/completions",
} as const;

export type SuggestionProtocol = keyof typeof SUGGESTION_PROTOCOL_PATHS;

/** 按 provider 的 npm 包名判断用哪种协议；不认识的返回 null（调用方应跳过）。 */
export function protocolForProviderPackage(npm: string | undefined): SuggestionProtocol | null {
  switch (npm) {
    case "@ai-sdk/anthropic":
      return "messages";
    case "@ai-sdk/openai":
      return "responses";
    case "@ai-sdk/openai-compatible":
      return "chat";
    default:
      return null;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function extractMessagesText(payload: unknown): string {
  if (!isRecord(payload)) return "";
  const parts = payload.content;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) => {
      if (!isRecord(part)) return "";
      return part.type === "text" && typeof part.text === "string" ? part.text : "";
    })
    .join("")
    .trim();
}

function extractResponsesText(payload: unknown): string {
  if (!isRecord(payload) || payload.status !== "completed" || !Array.isArray(payload.output)) {
    return "";
  }
  return payload.output
    .flatMap((item) =>
      isRecord(item) && item.type === "message" && Array.isArray(item.content)
        ? item.content.map((part) =>
            isRecord(part) && part.type === "output_text" && typeof part.text === "string"
              ? part.text
              : "",
          )
        : [],
    )
    .join("")
    .trim();
}

function extractChatText(payload: unknown): string {
  const choice =
    isRecord(payload) && Array.isArray(payload.choices) ? payload.choices[0] : undefined;
  if (!isRecord(choice) || choice.finish_reason !== "stop" || !isRecord(choice.message)) {
    return "";
  }
  const content = choice.message.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) =>
      isRecord(part) && part.type === "text" && typeof part.text === "string" ? part.text : "",
    )
    .join("");
}

function parseSuggestionMessage(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  if (payload.stop_reason !== "end_turn") return null;
  return parseSuggestionAnswer(extractMessagesText(payload));
}

/** 组请求体（三种协议各自的形状，照搬参照）。 */
export function buildSuggestionBody(
  call: { model: string; protocol: SuggestionProtocol },
  transcript: PromptTranscriptMessage[],
): Record<string, unknown> {
  const messages = [
    ...transcript.map(({ role, content }) => ({ role, content })),
    { role: "user" as const, content: SUGGESTION_TASK },
  ];
  const base = { model: call.model, stream: false };
  switch (call.protocol) {
    case "messages":
      return buildSuggestionRequestBody({ model: call.model, transcript }) as unknown as Record<
        string,
        unknown
      >;
    case "responses":
      return {
        ...base,
        instructions: SUGGESTION_INSTRUCTIONS,
        input: messages,
        max_output_tokens: SUGGESTION_MAX_OUTPUT_TOKENS,
        store: false,
      };
    case "chat":
      return {
        ...base,
        messages: [{ role: "system", content: SUGGESTION_INSTRUCTIONS }, ...messages],
        max_tokens: SUGGESTION_MAX_OUTPUT_TOKENS,
      };
  }
}

/** 按协议解析响应；任何一步不完整就返回 null。 */
export function parseSuggestionResponse(
  protocol: SuggestionProtocol,
  payload: unknown,
): string | null {
  switch (protocol) {
    case "messages":
      return parseSuggestionMessage(payload);
    case "responses":
      return parseSuggestionAnswer(extractResponsesText(payload));
    case "chat":
      return parseSuggestionAnswer(extractChatText(payload));
  }
}
