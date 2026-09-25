import { Module } from "@nestjs/common";

import { EditController, GenerateTextController } from "./edit.controller.js";
import { EditService } from "./edit.service.js";
import { FfmpegService } from "./ffmpeg.service.js";
import { TextGenerationService } from "./text-generation.service.js";

@Module({ controllers: [EditController, GenerateTextController], providers: [FfmpegService, EditService, TextGenerationService], exports: [FfmpegService, EditService] })
export class EditModule {}
