import { Module } from "@nestjs/common";

import { EditController, GenerateTextController } from "./edit.controller.js";
import { EditService } from "./edit.service.js";
import { FfmpegService } from "./ffmpeg.service.js";

@Module({ controllers: [EditController, GenerateTextController], providers: [FfmpegService, EditService], exports: [FfmpegService, EditService] })
export class EditModule {}
