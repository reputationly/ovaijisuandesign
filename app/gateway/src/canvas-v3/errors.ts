import { HttpException } from "@nestjs/common";

export function canvasV3Error(status: number, code: string, message: string): HttpException {
  return new HttpException({ code, message }, status);
}

export function invalidCanvasV3Command(): HttpException {
  return canvasV3Error(400, "CANVAS_V3_INVALID_COMMAND", "Invalid canvas command.");
}

export function canvasV3StorageError(): HttpException {
  return canvasV3Error(500, "CANVAS_V3_STORAGE_UNAVAILABLE", "Canvas storage is unavailable.");
}
