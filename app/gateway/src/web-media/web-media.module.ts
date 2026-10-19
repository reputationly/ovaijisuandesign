import { Module } from "@nestjs/common";

import { EditModule } from "../edit/edit.module.js";
import { WebMediaController, WebMediaService } from "./web-media.service.js";

@Module({ imports: [EditModule], controllers: [WebMediaController], providers: [WebMediaService] })
export class WebMediaModule {}
