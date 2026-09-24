import { Module } from "@nestjs/common";

import { StaticController } from "../static/static.controller.js";
import { FilesController } from "./files.controller.js";
import { FilesService } from "./files.service.js";

@Module({ controllers: [FilesController, StaticController], providers: [FilesService], exports: [FilesService] })
export class FilesModule {}
