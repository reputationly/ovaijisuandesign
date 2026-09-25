import { Module } from "@nestjs/common";

import { EditModule } from "../edit/edit.module.js";
import { StaticController } from "../static/static.controller.js";
import { ThumbnailController } from "../static/thumbnail.controller.js";
import { FilesController } from "./files.controller.js";
import { FilesService } from "./files.service.js";

@Module({ imports: [EditModule], controllers: [FilesController, StaticController, ThumbnailController], providers: [FilesService], exports: [FilesService] })
export class FilesModule {}
