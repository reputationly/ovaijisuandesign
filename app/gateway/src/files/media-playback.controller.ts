import { BadRequestException, Controller, Get, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";

import { MAX_PEAKS_BUCKETS, MediaPlaybackService, MIN_PEAKS_BUCKETS } from "./media-playback.service.js";

function clampHeight(raw: string | undefined, fallback: number): number {
  const n = raw ? Number.parseInt(raw, 10) : fallback;
  return Number.isFinite(n) ? Math.min(Math.max(n, 144), 1080) : fallback;
}

/**
 * 视频播放源和音频波形。回的都是缓存文件（或原文件），Range 请求交给 `sendFile` 处理 —— 拖进度条靠它。
 */
@Controller("api/asset")
export class MediaPlaybackController {
  constructor(private readonly media: MediaPlaybackService) {}

  /** 画布上播放视频：`source` 是节点上的文件 URL。请求方断开就不等了（转码照跑，下次命中缓存）。 */
  @Get("video-playback")
  async videoPlayback(@Req() req: Request, @Res() res: Response, @Query("source") source?: string, @Query("maxHeight") maxHeight?: string) {
    if (!source) throw new BadRequestException("source query parameter is required");
    const ac = new AbortController();
    const onAborted = () => ac.abort();
    const onClose = () => {
      if (!res.writableEnded) ac.abort();
    };
    req.on("aborted", onAborted);
    res.on("close", onClose);
    try {
      const file = await this.media.playbackForSource(source, clampHeight(maxHeight, 1080), ac.signal);
      if (ac.signal.aborted || res.destroyed) return;
      res.type("video/mp4").sendFile(file, { dotfiles: "allow" });
    } catch (err) {
      if (ac.signal.aborted) return;
      throw err;
    } finally {
      req.off("aborted", onAborted);
      res.off("close", onClose);
    }
  }

  /** 资产面板悬停预览（默认 480p）。 */
  @Get("video-stream")
  async videoStream(@Res() res: Response, @Query("path") p?: string, @Query("maxHeight") maxHeight?: string) {
    if (!p) throw new BadRequestException("path query parameter is required");
    const file = await this.media.streamForPath(p, clampHeight(maxHeight, 480));
    res.type("video/mp4").sendFile(file, { dotfiles: "allow" });
  }

  /** 预先算好的波形峰值。桶数夹在 50–4096。 */
  @Get("peaks")
  peaks(@Query("path") p?: string, @Query("buckets") bucketsRaw?: string) {
    if (!p) throw new BadRequestException("path query parameter is required");
    const requested = bucketsRaw ? Number.parseInt(bucketsRaw, 10) : 200;
    const buckets = Math.min(Math.max(Number.isNaN(requested) ? 200 : requested, MIN_PEAKS_BUCKETS), MAX_PEAKS_BUCKETS);
    return this.media.peaks(p, buckets);
  }
}
