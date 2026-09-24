// 平台的对话接口。caption 增强和歌词生成共用。
//
// 抽出来是因为这两处踩的是同一个坑：**推理模型的思考过程和正文共用
// `max_tokens` 预算**。给小了，模型会把额度全花在 reasoning 上，
// `content` 直接回 null 而 `finish_reason` 是 `length` —— 看起来像
// 「模型不听话」，实际是预算不够。

import { type Client, request } from "./client.js";
import { type MediaConfig, platformBase } from "./config.js";
import { PlatformError } from "./error.js";
import { asStr, isObject } from "./text.js";

/** Rust `Value::pointer("/choices/0/…")` 的最小实现：只走对象键和数组下标。 */
function pointer(v: unknown, ...path: (string | number)[]): unknown {
  let cur: unknown = v;
  for (const seg of path) {
    if (typeof seg === "number") {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[seg];
    } else {
      if (!isObject(cur)) return undefined;
      cur = cur[seg];
    }
  }
  return cur;
}

/**
 * 发一次对话请求，返回 `choices[0].message.content`。
 *
 * 内容为空时**报错而不是返回空串**：调用方拿到空串往往会继续往下走，
 * 于是一个空 caption / 空歌词被发给引擎，产出一段能播但完全不对的音频。
 *
 * `timeoutMs` 是毫秒（Rust 那边是 `Duration`）。
 */
export async function complete(
  client: Client,
  cfg: MediaConfig,
  system: string,
  user: string,
  temperature: number,
  maxTokens: number,
  timeoutMs: number,
): Promise<string> {
  const body = {
    model: cfg.platform.chat_model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };

  const { status, ok, raw } = await request(client, {
    method: "POST",
    url: `${platformBase(cfg.platform)}/chat/completions`,
    apiKey: cfg.platform.api_key,
    timeoutMs,
    json: body,
  });
  if (!ok) {
    throw PlatformError.fromBody(status, raw);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw PlatformError.protocol(`对话响应不是 JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  const text = (asStr(pointer(parsed, "choices", 0, "message", "content")) ?? "").trim();

  if (text === "") {
    // 单独点出截断，否则只看到「未返回内容」会以为是模型不听话，
    // 而不是 max_tokens 不够。
    const truncated = asStr(pointer(parsed, "choices", 0, "finish_reason")) === "length";
    const hint = truncated ? "（输出被 max_tokens 截断，推理过程占满了预算）" : "";
    throw PlatformError.protocol(`对话未返回内容${hint}: ${raw}`);
  }
  return text;
}

/**
 * 去掉模型可能套上的 Markdown 围栏。
 *
 * 模型经常在正文外面套一层 ```，或者在前面加一句「好的，这是为你写的：」。
 * 这些混进去不会报错 —— 歌词场景下会被当成词唱出来。
 *
 * 是**找**围栏而不是剥前缀：真实顺序常是「开场白 → 围栏 → 正文」，
 * 按前缀剥会整个落空，把收尾的 ``` 留在正文里。
 */
export function stripFences(text: string): string {
  const body = text.trim();
  const open = body.indexOf("```");
  if (open < 0) {
    return body;
  }
  let after = body.slice(open + 3);
  // ```lyrics / ```text 这种语言标注要连同那一行一起去掉。
  const nl = after.indexOf("\n");
  after = nl < 0 ? "" : after.slice(nl + 1);
  // 取到**第一个**收尾围栏为止：多一对围栏时，后面只可能是模型又补的说明。
  const close = after.indexOf("```");
  return (close < 0 ? after : after.slice(0, close)).trim();
}

// ---------------------------------------------------------------------------
// 带工具的多轮对话
//
// **和 {@link complete} 是两个函数，不是一个加参数。** 那个的语义是"必须回一段
// 文本，空的就是错"——歌词、caption 都靠它守住。而 agent 的一轮里，
// `content` 为空而 `tool_calls` 非空是最正常的情况（模型决定先调工具）。
// 合成一个的话，那条"空内容 = 错误"的保护要么失效、要么误伤。
// ---------------------------------------------------------------------------

/** 模型这一轮的产出。 */
export interface Turn {
  /** 给用户看的文本。可能是空的（这一轮只调工具）。 */
  content: string;
  /** 要执行的工具调用。 */
  toolCalls: ToolCall[];
  /** 原样保留的 `finish_reason`，排查截断用。 */
  finishReason: string;
}

export interface ToolCall {
  /**
   * 平台给的 id。**回传时必须原样带上** —— 它是 `tool` 消息和这次调用
   * 的唯一关联，改一个字符模型就对不上，会重复调同一个工具。
   */
  id: string;
  name: string;
  /**
   * 原始参数字符串（JSON）。**不在这里解析** —— 解析失败要作为工具结果
   * 回给模型让它改，而不是让整轮失败。
   */
  arguments: string;
}

/**
 * 发一轮带工具的对话。
 *
 * `messages` 是完整历史（含 system），调用方负责累积。这里不持有状态：
 * 会话怎么存、截断到多长，是上层的事。
 *
 * `modelOverride`：这一轮临时换的模型。**空就用配置里的** —— 换配置要重启才
 * 生效（`MediaConfig` 是启动时建的），而"想换个模型试试"是个当场的念头。
 */
export async function completeWithTools(
  client: Client,
  cfg: MediaConfig,
  messages: readonly unknown[],
  tools: readonly unknown[],
  maxTokens: number,
  timeoutMs: number,
  modelOverride?: string | null,
): Promise<Turn> {
  const o = modelOverride?.trim() ?? "";
  const model = o !== "" ? o : cfg.platform.chat_model;
  const body: Record<string, unknown> = {
    model,
    messages: [...messages],
    max_tokens: maxTokens,
    stream: false,
  };
  // 工具为空时**不发这两个字段**。发一个空数组，部分网关会当成"限定在
  // 这零个工具里选"，于是模型什么都调不了却也不说话。
  if (tools.length > 0) {
    body.tools = [...tools];
    body.tool_choice = "auto";
  }

  const { status, ok, raw } = await request(client, {
    method: "POST",
    url: `${platformBase(cfg.platform)}/chat/completions`,
    apiKey: cfg.platform.api_key,
    timeoutMs,
    json: body,
  });
  if (!ok) {
    throw PlatformError.fromBody(status, raw);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw PlatformError.protocol(`对话响应不是 JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  return parseTurn(parsed);
}

/**
 * 拆一轮响应。抽出来是为了能直接断言形状 —— 这里每个字段错位都不会报错，
 * 只会让 agent 安静地少做一件事。
 */
export function parseTurn(parsed: unknown): Turn {
  const msg = pointer(parsed, "choices", 0, "message");
  const content = (asStr(pointer(msg, "content")) ?? "").trim();
  const rawCalls = pointer(msg, "tool_calls");
  const toolCalls: ToolCall[] = [];
  if (Array.isArray(rawCalls)) {
    for (const c of rawCalls) {
      const name = asStr(pointer(c, "function", "name"));
      if (name === undefined) continue;
      toolCalls.push({
        id: asStr(pointer(c, "id")) ?? "",
        name,
        // 有的实现在没有参数时给 `null` 而不是 `"{}"`。
        // 原样当空对象，而不是让这次调用整个丢掉。
        arguments: asStr(pointer(c, "function", "arguments")) ?? "{}",
      });
    }
  }
  return {
    content,
    toolCalls,
    finishReason: asStr(pointer(parsed, "choices", 0, "finish_reason")) ?? "",
  };
}
