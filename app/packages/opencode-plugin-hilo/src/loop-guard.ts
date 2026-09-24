import { createHash } from "node:crypto";

/**
 * 防打转：同一个工具、语义相同的参数，在最近 5 次调用里已经出现 2 次，第 3 次就拦。
 * 模型卡住时最常见的样子就是换个说法反复调同一个生成工具 —— 每次都在花钱，
 * 结果不会变。
 */
export const WINDOW = 5;
export const MAX_HITS = 2;

const sha = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 16);

function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v as object)
      .filter((k) => !k.startsWith("_"))
      .sort()
      .map((k) => `${k}:${stable((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 32);
const setHash = (xs: unknown) => sha(stable([...(Array.isArray(xs) ? xs : [])].map(String).sort()));

/** 指纹：只取决定"是不是同一件事"的字段。去掉 `hub_` 前缀后按工具分类。 */
export function fingerprint(tool: string, args: Record<string, any> = {}): string {
  const t = tool.replace(/^hub_/, "");
  const vp = (args.vendor_params ?? {}) as Record<string, unknown>;
  switch (t) {
    case "generate_video":
      return `${t}|${args.model_id ?? ""}|${Math.round(Number(args.duration ?? 0) / 3)}|${vp.aspect_ratio ?? ""}|${vp.resolution ?? ""}|${args.first_frame_image ?? ""}|${args.last_frame_image ?? ""}|${setHash(args.reference_image_paths)}|${norm(args.prompt)}`;
    case "generate_image":
      return `${t}|${args.model_id ?? ""}|${vp.aspect_ratio ?? ""}|${setHash(args.image_paths)}|${norm(args.prompt)}`;
    case "generate_audio_speech":
      return `${t}|${args.model_name ?? ""}|${args.voice_id ?? ""}|${sha(stable(args.texts))}`;
    case "generate_audio_music":
      return `${t}|${args.model_id ?? ""}|${norm(args.prompt)}|${sha(String(args.lyrics ?? ""))}`;
    case "read":
      return `${t}|${args.file_path ?? args.path ?? ""}`;
    case "task":
      return `${t}|${args.subagent_type ?? ""}|${sha(String(args.description ?? "") + String(args.prompt ?? ""))}`;
    default:
      return `${t}|${sha(stable(args))}`;
  }
}

export class LoopGuard {
  private readonly recent = new Map<string, string[]>();
  private readonly allowed = new Map<string, Set<string>>();

  /** 这次调用算不算打转。返回命中次数（不算这次），没打转回 0。 */
  check(sessionId: string, fp: string): number {
    if (this.allowed.get(sessionId)?.has(fp)) return 0;
    const hits = (this.recent.get(sessionId) ?? []).filter((x) => x === fp).length;
    return hits >= MAX_HITS ? hits : 0;
  }

  record(sessionId: string, fp: string): void {
    const r = this.recent.get(sessionId) ?? [];
    r.push(fp);
    if (r.length > WINDOW) r.splice(0, r.length - WINDOW);
    this.recent.set(sessionId, r);
  }

  allowForSession(sessionId: string, fp: string): void {
    const s = this.allowed.get(sessionId) ?? new Set<string>();
    s.add(fp);
    this.allowed.set(sessionId, s);
  }

  /** 新的一轮用户消息：窗口清空。 */
  reset(sessionId: string): void {
    this.recent.delete(sessionId);
  }

  recentTools(sessionId: string): string[] {
    return (this.recent.get(sessionId) ?? []).map((f) => f.split("|")[0]!);
  }
}

export function blockedMessage(tool: string, hits: number): string {
  return [
    `LoopGuard blocked: tool ${tool} was called with semantically-identical arguments ${hits + 1} times within the last ${WINDOW} tool calls.`,
    "Repeating it will not produce a different result. Do one of:",
    "1. switch to a different tool or model;",
    "2. substantially rewrite the prompt / arguments (not just rephrase);",
    "3. ask the user how to proceed with the question tool.",
  ].join("\n");
}
