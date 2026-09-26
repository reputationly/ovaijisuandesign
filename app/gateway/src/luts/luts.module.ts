import { BadRequestException, Controller, Delete, Get, Module, Param, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { LutsService, type UploadedLut } from "./luts.service.js";

/** `.cube` 是纯文本，64³ 的也不到 10MB。 */
const LUT_UPLOAD = {
  storage: memoryStorage(),
  limits: { fileSize: 32 * 1024 * 1024, fieldNestingDepth: 8, fields: 64, files: 1, parts: 65, fieldNameSize: 256 },
};

@Controller()
export class LutsController {
  constructor(private readonly luts: LutsService) {}

  @Get("api/luts")
  list() {
    return this.luts.list();
  }

  @Post("api/luts/import")
  @UseInterceptors(FileInterceptor("file", LUT_UPLOAD))
  importLut(@UploadedFile() file: UploadedLut | undefined) {
    return this.luts.import(file);
  }

  @Get("api/luts/content")
  async content(@Query("name") name?: string) {
    if (!name) throw new BadRequestException("name query parameter is required");
    return { content: await this.luts.readContent(name) };
  }

  @Delete("api/luts/:name")
  delete(@Param("name") name: string) {
    return this.luts.delete(name);
  }
}

@Module({ controllers: [LutsController], providers: [LutsService], exports: [LutsService] })
export class LutsModule {}
