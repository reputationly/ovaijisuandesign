import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * 翻唱两步走的第一步留下的"特征 id"。
 *
 * 平台上的翻唱（ACE-Step 的 `cover`）是一步完成的：参考音频直接跟着生成请求走，没有单独的
 * 特征提取接口。为了让"先预处理、再拿 `cover_feature_id` 生成"这条调用顺序照样走得通，
 * 预处理时把参考音频记在 `.hilo/music-cover/<id>.json`，生成时凭 id 取回同一段音频。
 */
const DIR = path.join(".hilo", "music-cover");
const ID_RE = /^cover-[0-9a-f-]{36}$/;

export async function saveCoverFeature(root: string, audio: string, durationSec: number): Promise<string> {
  const id = `cover-${randomUUID()}`;
  await mkdir(path.join(root, DIR), { recursive: true });
  await writeFile(path.join(root, DIR, `${id}.json`), JSON.stringify({ audio, audio_duration: durationSec, created_at: Date.now() }));
  return id;
}

/** 取回预处理时记下的参考音频（工作区相对路径或 URL）；id 不认识回 undefined。 */
export async function loadCoverFeature(root: string, id: string): Promise<string | undefined> {
  if (!ID_RE.test(id)) return undefined;
  try {
    const raw = JSON.parse(await readFile(path.join(root, DIR, `${id}.json`), "utf8")) as { audio?: unknown };
    return typeof raw.audio === "string" && raw.audio ? raw.audio : undefined;
  } catch {
    return undefined;
  }
}
