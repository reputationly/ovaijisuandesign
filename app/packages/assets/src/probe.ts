import { imageSizeFromFile } from "image-size/fromFile";

import { detectFileType } from "@ov/protocol";

import { probeMp4File } from "./mp4.js";

export interface MediaProbe {
  width?: number;
  height?: number;
  /** 毫秒。 */
  durationMs?: number;
}

/**
 * 画面尺寸 / 时长。图片读文件头，视频解 MP4 盒子。读不到就是空对象 ——
 * 非图片、格式不认识都是正常情况，不该让登记失败。
 */
export async function probeMedia(absPath: string): Promise<MediaProbe> {
  const kind = detectFileType(absPath);
  if (kind === "image") {
    try {
      const { width, height } = await imageSizeFromFile(absPath);
      if (width && height) return { width, height };
    } catch {
      // 认不出的图片格式（比如某些 heic）：退回无尺寸，画布会自己从文件里量。
    }
    return {};
  }
  if (kind === "video") {
    const v = await probeMp4File(absPath);
    if (!v) return {};
    return { width: v.width, height: v.height, ...(v.duration != null ? { durationMs: Math.round(v.duration * 1000) } : {}) };
  }
  return {};
}
