import { Controller, HttpCode, Post } from "@nestjs/common";

import { TrashBufferService } from "./trash-buffer.service.js";

@Controller("api/operations")
export class UndoController {
  constructor(private readonly trash: TrashBufferService) {}

  /** 撤销结果都回 200，成败在 body 的 `ok` / `errorType` 里。 */
  @Post("undo")
  @HttpCode(200)
  undo() {
    return this.trash.undo().catch((err: unknown) => ({ ok: false, errorType: "unknown", errorMessage: String(err) }));
  }
}
