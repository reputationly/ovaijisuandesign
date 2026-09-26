import { Module } from "@nestjs/common";

import { EditModule } from "../edit/edit.module.js";
import { MediaThumbnailer } from "../static/media-thumbnailer.js";
import { StaticController } from "../static/static.controller.js";
import { ThumbnailController } from "../static/thumbnail.controller.js";
import { DirWatcherService } from "./dir-watcher.service.js";
import { FileOpsService } from "./file-ops.service.js";
import { FilesController } from "./files.controller.js";
import { FilesService } from "./files.service.js";
import { LocalMediaController } from "./local-media.controller.js";
import { MediaPlaybackController } from "./media-playback.controller.js";
import { MediaPlaybackService } from "./media-playback.service.js";
import { MentionSearchService } from "./mention-search.service.js";
import { ProjectAssetAnchors } from "./project-asset-anchors.service.js";
import { UploadCommitService } from "./upload-commit.service.js";

@Module({
  imports: [EditModule],
  controllers: [FilesController, LocalMediaController, StaticController, ThumbnailController, MediaPlaybackController],
  providers: [
    FilesService,
    MediaThumbnailer,
    FileOpsService,
    UploadCommitService,
    MentionSearchService,
    ProjectAssetAnchors,
    MediaPlaybackService,
    DirWatcherService,
  ],
  exports: [FilesService],
})
export class FilesModule {}
