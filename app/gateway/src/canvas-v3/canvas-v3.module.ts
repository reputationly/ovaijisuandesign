import { forwardRef, Module } from "@nestjs/common";

import { EditModule } from "../edit/edit.module.js";
import { FilesModule } from "../files/files.module.js";
import { ProjectKernelModule } from "../project-kernel/composition.module.js";
import { CanvasV3AudioController, CanvasV3AudioService } from "./audios.js";
import { CanvasV3Controller, CanvasV3Service } from "./canvas-v3.controller.js";
import { CanvasV3ImagesController, CanvasV3ImagesService } from "./images.js";
import { CanvasV3VideosController } from "./videos.js";
import { CanvasV3VideoThumbnailsController } from "./video-thumbnails.js";
import { CanvasV3VideoAudioSplitsController, CanvasV3VideoAudioSplitsService } from "./video-audio-splits.js";
import { CanvasV3PluginStateController, CanvasV3PluginStateService } from "./plugin-state.js";
import { CanvasV3ContentService } from "./content.service.js";
import { DocumentCheckpointsController } from "./document-checkpoints.js";
import { CanvasV3LocalFilesController, CanvasV3LocalFilesService } from "./local-files.js";
import { CanvasV3MediaController, CanvasV3MediaService } from "./media.js";
import { CanvasV3DirectorAssetsController, CanvasV3DirectorAssetsService } from "./director-assets.js";
import { CanvasV3TextGenerationController, CanvasV3TextGenerationService } from "./text-generation.js";
import { CanvasV3PreviewsController } from "./previews.js";
import { CanvasV3Store } from "./store.js";
import { EditorSourceFiles } from "../editor-v3/source-files.js";
import { WorkspaceProjectArchitectureService } from "./workspace-project-architecture.service.js";

@Module({
  imports: [forwardRef(() => ProjectKernelModule), EditModule, FilesModule],
  controllers: [CanvasV3Controller, CanvasV3PluginStateController, CanvasV3ImagesController, CanvasV3VideosController, CanvasV3VideoThumbnailsController, CanvasV3VideoAudioSplitsController, CanvasV3AudioController, CanvasV3LocalFilesController, CanvasV3MediaController, CanvasV3DirectorAssetsController, CanvasV3TextGenerationController, DocumentCheckpointsController, CanvasV3PreviewsController],
  providers: [WorkspaceProjectArchitectureService, CanvasV3Store, CanvasV3ContentService, EditorSourceFiles, CanvasV3Service, CanvasV3PluginStateService, CanvasV3ImagesService, CanvasV3AudioService, CanvasV3LocalFilesService, CanvasV3VideoAudioSplitsService, CanvasV3MediaService, CanvasV3DirectorAssetsService, CanvasV3TextGenerationService],
  exports: [WorkspaceProjectArchitectureService, CanvasV3Service, CanvasV3Store, CanvasV3ContentService],
})
export class CanvasV3Module {}
