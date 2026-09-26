import { createHash } from "node:crypto";
import { stat } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, Body, Controller, Get, Module, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";

import { WorkspacePathService } from "../common/workspace-path.service.js";
import { EditModule } from "../edit/edit.module.js";
import { MediaThumbnailer } from "../static/media-thumbnailer.js";
import { mapCanvasDirectReference, parseCanvasReference } from "./canvas-reference.js";
import { CanvasReferencesService } from "./canvas-references.service.js";

@Controller()
export class CanvasReferencesController {
  constructor(
    private readonly references: CanvasReferencesService,
    private readonly workspace: WorkspacePathService,
    private readonly thumbs: MediaThumbnailer,
  ) {}

  @Get("api/canvas-references/search")
  search(@Query("q") query = "") {
    return this.references.searchSubjects(String(query).slice(0, 256));
  }

  /** body 是引用数组（最多 100 个）；任何一个不合法整批 400。 */
  @Post("api/canvas-references/resolve")
  resolve(@Body() body: unknown, @Query("include_metadata") includeMetadata?: string) {
    if (!Array.isArray(body) || body.length > 100) throw new BadRequestException("Invalid references");
    const refs = body.map(mapCanvasDirectReference);
    if (refs.some((r) => !r)) throw new BadRequestException("Invalid reference identity");
    return this.references.checkAvailability(refs as NonNullable<(typeof refs)[number]>[], { include_metadata: includeMetadata === "true" });
  }

  /**
   * 引用的内容。带 `w` 时回缩略图（宽 32–512）：视频抽帧、音频画波形、图片按宽缩。
   * 不缓存：源随时可能被删，每次都要重新确认。
   */
  @Get("api/canvas-references/content")
  async content(@Query("ref") raw: string | undefined, @Query("w") width: string | undefined, @Res() res: Response) {
    const ref = parseCanvasReference(raw);
    if (!ref) throw new BadRequestException("Invalid reference identity");
    const rel = await this.references.prepare(ref);
    const abs = path.join(this.workspace.root, rel);
    res.setHeader("Cache-Control", "no-store");
    if (width && (ref.kind === "image" || ref.kind === "video" || ref.kind === "audio")) {
      const w = Math.min(512, Math.max(32, Number(width) || 64));
      const st = await stat(abs);
      const key = createHash("md5").update(`${rel}:w${w}:${st.mtimeMs}`).digest("hex").slice(0, 12);
      const dir = this.workspace.hilo(".thumbnails");
      let file: string;
      if (ref.kind === "image") {
        // 带透明的格式保留透明，其余出 JPEG
        const ext = /\.(png|webp|gif)$/i.test(abs) ? ".png" : ".jpg";
        file = await this.thumbs.image(abs, path.join(dir, `ref-${key}${ext}`), w);
      } else {
        file = await this.thumbs.media(abs, path.join(dir, `ref-${key}.jpg`), ref.kind, w).catch(() => this.thumbs.placeholder(dir));
      }
      res.sendFile(file, { dotfiles: "allow" });
      return;
    }
    res.sendFile(abs, { dotfiles: "allow" });
  }
}

@Module({
  imports: [EditModule],
  controllers: [CanvasReferencesController],
  providers: [CanvasReferencesService, MediaThumbnailer],
  exports: [CanvasReferencesService],
})
export class CanvasReferencesModule {}
