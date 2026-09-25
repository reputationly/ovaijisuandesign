import { Global, Module } from "@nestjs/common";

import { SpeechController } from "./speech.controller.js";
import { SpeechService } from "./speech.service.js";
import { VoiceLibraryService } from "./voice-library.service.js";

/** 全局：生成模块合成语音时也要查本机音色表。 */
@Global()
@Module({ controllers: [SpeechController], providers: [SpeechService, VoiceLibraryService], exports: [VoiceLibraryService] })
export class SpeechModule {}
