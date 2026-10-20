import { ForbiddenException, Injectable } from "@nestjs/common";
import type { CanActivate } from "@nestjs/common";

import { WorkspaceProjectArchitectureService } from "../canvas-v3/workspace-project-architecture.service.js";

/**
 * v2 画布的架构守卫（第 251 轮，按参照的 `LegacyCanvasGuard` 实现）。
 *
 * 参照在 `dist/main.js` 里：
 *
 *   function isLegacyCanvasEnabled() {
 *     try { return new WorkspaceProjectArchitectureService().current() === "legacy"; }
 *     catch { throw new ForbiddenException({ code: "PROJECT_ARCHITECTURE_UNSUPPORTED", ... }); }
 *   }
 *   class LegacyCanvasGuard { canActivate() { assertLegacyCanvas(); return true; } }
 *
 * 并挂在**整个** `@Controller("api/canvas")` 上。
 * 所以在 `resource_v3` 架构下，全部 `/api/canvas*` 都返回 403 —— 我们原来一律 200。
 */
@Injectable()
export class LegacyCanvasGuard implements CanActivate {
  constructor(private readonly architecture: WorkspaceProjectArchitectureService) {}

  canActivate(): boolean {
    let legacy: boolean;
    try {
      legacy = this.architecture.current() === "legacy";
    } catch {
      throw new ForbiddenException({
        code: "PROJECT_ARCHITECTURE_UNSUPPORTED",
        message: "Project architecture is not supported.",
      });
    }
    if (!legacy) {
      throw new ForbiddenException({
        code: "PROJECT_ARCHITECTURE_UNSUPPORTED",
        message: "Project architecture is not supported.",
      });
    }
    return true;
  }
}
