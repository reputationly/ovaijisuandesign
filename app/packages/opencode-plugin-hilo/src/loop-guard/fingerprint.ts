import { createHash } from "node:crypto";

/**
 * 工具调用指纹：只取决定"是不是同一件事"的字段，忽略小改动（时长 ±1s 落在同一个 3 秒桶里、
 * 提示词只比较规范化后的前 32 个字符、读文件不看 offset）。模型卡住时最常见的样子就是
 * 微调一下参数反复调同一个生成工具 —— 每次都在花钱，结果不会变。
 */
const sha8 = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 16);

const VIDEO_GEN_TOOLS = new Set(["generate_video"]);
const AUDIO_GEN_TOOLS = new Set(["generate_audio_speech", "generate_audio_music", "voice_prepare", "lyrics_generation"]);
const READ_TOOLS = new Set(["read", "Read", "view", "hub_read"]);
const TASK_TOOLS = new Set(["task"]);

type Args = Record<string, unknown>;

function normalizeTool(t: string): string {
  return t.replace(/^hub_/, "");
}

function normPrompt(p: unknown): string {
  if (typeof p !== "string") return "";
  return p
    .toLowerCase()
    .replace(/[^a-z0-9一-龥\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32);
}

function bucketDuration(d: unknown): string {
  if (typeof d !== "number" || !Number.isFinite(d)) return "na";
  return String(Math.round(d / 3) * 3);
}

function setHash(arr: unknown): string {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  return sha8([...arr].map(String).sort().join("|"));
}

function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function fpVideoGen(tool: string, a: Args): string {
  const parts = [
    tool,
    asString(a.model_name ?? a.model),
    bucketDuration(a.duration),
    asString(a.ratio ?? a.aspect_ratio),
    asString(a.resolution),
    asString(a.first_frame_image_path ?? a.first_frame_image),
    asString(a.last_frame_image_path ?? a.last_frame_image),
    setHash(a.reference_image_paths ?? a.first_frame_images),
    setHash(a.reference_video_urls),
    setHash(a.reference_audio_urls),
    setHash(a.avatar_asset_ids),
    normPrompt(a.prompt),
  ];
  return `vgen|${sha8(parts.join("||"))}`;
}

function fpAudioGen(tool: string, a: Args): string {
  const textsFp = Array.isArray(a.texts)
    ? sha8(
        a.texts
          .map((t) => normPrompt(t))
          .sort()
          .join("|"),
      )
    : // 语音和音乐的提示词字段名不一样。
      normPrompt(a.texts ?? a.text ?? a.text_prompt ?? a.prompt ?? a.lyrics);
  const parts = [
    tool,
    asString(a.model_id ?? a.model ?? a.model_name),
    asString(a.voice_id),
    setHash(a.voice_ids),
    // 参考音频 / 参考图不同，其余一样的调用也算不同的事。
    setHash(a.reference_audio_paths),
    asString(a.reference_image_path),
    asString(a.emotion),
    asString(a.language),
    textsFp,
  ];
  return `agen|${sha8(parts.join("||"))}`;
}

function fpRead(_tool: string, a: Args): string {
  return `read|${asString(a.filePath ?? a.path ?? a.file_path)}`;
}

function fpTask(_tool: string, a: Args): string {
  const sub = asString(a.subagent_type);
  const desc = normPrompt(a.description ?? a.prompt);
  return `task|${sub}|${sha8(desc)}`;
}

function fpDefault(tool: string, args: unknown): string {
  let json = "";
  try {
    json = JSON.stringify(args ?? null);
  } catch {
    json = String(args);
  }
  return `default|${tool}|${sha8(json)}`;
}

export function fingerprint(tool: string, args: unknown): string {
  if (args == null || typeof args !== "object") return fpDefault(tool, args);
  const norm = normalizeTool(tool);
  const a = args as Args;
  if (VIDEO_GEN_TOOLS.has(norm)) return fpVideoGen(norm, a);
  if (AUDIO_GEN_TOOLS.has(norm)) return fpAudioGen(norm, a);
  if (READ_TOOLS.has(norm)) return fpRead(norm, a);
  if (TASK_TOOLS.has(norm)) return fpTask(norm, a);
  return fpDefault(tool, args);
}
