import { Module } from "@nestjs/common";

import { EditController } from "./edit.controller.js";
import { EditService } from "./edit.service.js";
import { FfmpegService } from "./ffmpeg.service.js";

@Module({ controllers: [EditController], providers: [FfmpegService, EditService], exports: [FfmpegService, EditService] })
export class EditModule {}
