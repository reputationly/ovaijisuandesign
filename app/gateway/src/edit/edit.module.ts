import { Module } from "@nestjs/common";

import { EditController, GenerateTextController } from "./edit.controller.js";
import { EditService } from "./edit.service.js";
import { FfmpegService } from "./ffmpeg.service.js";
import { ImageEditController } from "./image-edit.controller.js";
import { ImageEditService } from "./image-edit.service.js";
import { TextGenerationService } from "./text-generation.service.js";

@Module({
  controllers: [EditController, GenerateTextController, ImageEditController],
  providers: [FfmpegService, EditService, TextGenerationService, ImageEditService],
  exports: [FfmpegService, EditService],
})
export class EditModule {}
