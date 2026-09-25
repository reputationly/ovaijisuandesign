import { Module } from "@nestjs/common";

import { EditModule } from "../edit/edit.module.js";
import { MediaThumbnailer } from "../static/media-thumbnailer.js";
import { StaticController } from "../static/static.controller.js";
import { ThumbnailController } from "../static/thumbnail.controller.js";
import { FilesController } from "./files.controller.js";
import { FilesService } from "./files.service.js";
import { LocalMediaController } from "./local-media.controller.js";

@Module({
  imports: [EditModule],
  controllers: [FilesController, LocalMediaController, StaticController, ThumbnailController],
  providers: [FilesService, MediaThumbnailer],
  exports: [FilesService],
})
export class FilesModule {}
