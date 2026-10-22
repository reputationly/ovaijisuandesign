/**
 * 「下一步提示建议」服务。
 *
 * 移植自 4.0.3 的 `gateway/dist/next-prompt-suggestion/next-prompt-suggestion.service.js`
 * （抽取在 `.probe/extracted/nps-4.0.3/`）。流程与判定口径照搬，**传输层换成我们自己的平台**：
 *
 *   参照：runtimeClient.getRawMessages -> 选模型 -> resolveSuggestionTarget -> HTTP POST 到 provider
 *   我们：chatService.history       -> 用平台唯一的对话模型 -> chat.completeWithTools(messages, tools: [])
 *
 * 为什么换传输：我们是自托管，只有一个平台模型（`maas/<model>`）；参照那套
 * 「优先用上一轮回复模型、否则云端模型、再按 provider 包名分三种协议」在这里没有对应物。
 * 提示词、transcript 预算、结束判定、清洗规则都不变 —— 那才是决定生成质量的部分。
 *
 * 行为约定（与参照一致）：
 *   · 同一会话的并发请求：新的会 abort 旧的
 *   · 任何一步不满足（没有运行时、最后一条不是已完成的助手回复、编辑回合、模型报错）
 *     都返回 { suggestion: null }，不抛错 —— 这是「给不给建议」不是「接口成败」
 */

import { Inject, Injectable, Logger } from "@nestjs/common";

import { chat } from "@ov/maas-media";

import { MediaConfigService } from "../../generate/media-config.service.js";
import { ChatService } from "../chat.service.js";
import { buildSuggestionTranscript, findReplyModel } from "./suggestion-transcript.js";
import {
  SUGGESTION_INSTRUCTIONS,
  SUGGESTION_MAX_OUTPUT_TOKENS,
  SUGGESTION_TASK,
  parseSuggestionAnswer,
} from "./suggestion-prompt.js";

export interface SuggestionResult {
  suggestion: string | null;
  source: "platform" | null;
}

const EMPTY: SuggestionResult = { suggestion: null, source: null };
const TIMEOUT_MS = 20_000;

@Injectable()
export class NextPromptSuggestionService {
  private readonly log = new Logger(NextPromptSuggestionService.name);
  /** 同一会话只保留一个在飞的生成；新请求会 abort 上一个。 */
  private readonly inFlight = new Map<string, AbortController>();

  constructor(
    @Inject(ChatService) private readonly chatService: ChatService,
    @Inject(MediaConfigService) private readonly media: MediaConfigService,
  ) {}

  async suggest(sessionId: string): Promise<SuggestionResult> {
    this.inFlight.get(sessionId)?.abort();
    const controller = new AbortController();
    this.inFlight.set(sessionId, controller);
    try {
      return await this.sample(sessionId, controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) {
        this.log.warn(
          `next prompt suggestion failed: session=${sessionId} error=${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      return EMPTY;
    } finally {
      if (this.inFlight.get(sessionId) === controller) this.inFlight.delete(sessionId);
    }
  }

  private async sample(sessionId: string, signal: AbortSignal): Promise<SuggestionResult> {
    const runtimeId = this.chatService.runtimeIdForSession(sessionId);
    if (!runtimeId) return EMPTY;

    const raw = await this.chatService.history(runtimeId);
    const transcript = buildSuggestionTranscript(raw);
    if (!transcript || signal.aborted) return EMPTY;

    // 参照这里会用 findReplyModel 判断「上一轮是不是自定义 provider」；
    // 我们只有平台模型，所以只保留调用（形状一致，便于以后接自配 provider）。
    findReplyModel(raw);

    const messages = [
      ...transcript.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: SUGGESTION_TASK },
    ];
    const system = SUGGESTION_INSTRUCTIONS;
    // 与 compaction.service 同样的取法：load() 抛错/未配模型都当「不给建议」。
    let modelConfig;
    try {
      modelConfig = this.media.load();
    } catch {
      return EMPTY;
    }
    if (!modelConfig.platform.chat_model.trim() || !modelConfig.platform.base_url.trim()) return EMPTY;
    const client = this.media.client();

    const turn = await chat.completeWithTools(
      client,
      modelConfig,
      [{ role: "system", content: system }, ...messages],
      [],
      SUGGESTION_MAX_OUTPUT_TOKENS,
      TIMEOUT_MS,
    );
    if (signal.aborted) return EMPTY;

    const suggestion = parseSuggestionAnswer(turn.content ?? "");
    return suggestion ? { suggestion, source: "platform" } : EMPTY;
  }
}
