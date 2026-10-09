import { hasPlatformToken } from "../platform-config.js";
import { readSettings, writeSettings } from "../settings.js";

/**
 * 令牌页的纯逻辑：校验、保存、列出「正在使用的模型」。不依赖 Electron，好测。
 * 窗口和 IPC 的接线在 `token-gate.ts`。
 */

export type ValidateResult = { ok: true; token: string } | { ok: false; error: string };

/** 令牌只做格式上的挡：非空、没有空白字符、不过长。是否真能用要等它去调平台才知道。 */
export function validateToken(input: unknown): ValidateResult {
  if (typeof input !== "string") return { ok: false, error: "令牌格式不对，请重新粘贴。" };
  const token = input.trim();
  if (token === "") return { ok: false, error: "请先填写令牌。" };
  if (/\s/.test(token)) return { ok: false, error: "令牌里不能有空格或换行，请重新粘贴。" };
  if (token.length > 512) return { ok: false, error: "令牌长度不对，请检查是否粘贴错了。" };
  return { ok: true, token };
}

export type SaveResult = { ok: true } | { ok: false; error: string };

/**
 * 校验并写进配置文件。写完回读一遍：确认真的有令牌了，才算保存成功。
 * `onError` 只拿来记日志，文件路径和异常细节不回给界面。
 */
export function saveToken(configPath: string, input: unknown, onError?: (err: unknown) => void): SaveResult {
  const v = validateToken(input);
  if (!v.ok) return v;
  try {
    writeSettings(configPath, { apiKey: v.token });
  } catch (err) {
    onError?.(err);
    return { ok: false, error: "保存失败，请检查磁盘空间或文件权限后重试。" };
  }
  if (!hasPlatformToken(configPath)) return { ok: false, error: "保存后没有读到令牌，请重试。" };
  return { ok: true };
}

export interface UsedModelRow {
  label: string;
  /** 模型 id；null = 未启用。 */
  model: string | null;
}

/**
 * 「正在使用的模型」：按生效的配置列出，界面只展示。顺序和设置页一致。
 * 没有配置文件时也能列出（就是产品预设）。
 */
export function usedModelRows(configPath: string): UsedModelRow[] {
  const info = readSettings(configPath, "", 0);
  const m = info.models as Record<string, string | null | undefined>;
  const pick = (v: string | null | undefined) => (typeof v === "string" && v !== "" ? v : null);
  return [
    { label: "对话", model: pick(info.platform.chatModel) },
    { label: "文生图", model: pick(m.image) },
    { label: "图生图", model: pick(m.image_edit) },
    { label: "视频", model: pick(m.video) },
    { label: "参考生视频", model: pick(m.video_ref) },
    { label: "视频超分", model: pick(m.video_upscale) },
    { label: "图片超分", model: pick(m.image_upscale) },
    { label: "文生音乐", model: pick(m.music) },
    { label: "翻唱 / 重绘", model: pick(m.music_edit) },
    { label: "语音合成", model: pick(m.speech) },
  ];
}
