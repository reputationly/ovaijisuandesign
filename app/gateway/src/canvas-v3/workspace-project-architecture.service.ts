import { Injectable } from "@nestjs/common";

import { ProjectKernelError } from "../project-kernel/errors.js";

export const HILO_PROJECT_ARCHITECTURE_ENV = "HILO_PROJECT_ARCHITECTURE";

export type ProjectArchitecture = "legacy" | "resource_v3";

@Injectable()
export class WorkspaceProjectArchitectureService {
  current(): ProjectArchitecture {
    const raw = process.env[HILO_PROJECT_ARCHITECTURE_ENV];
    if (raw === undefined) return "legacy";
    if (raw === "legacy" || raw === "resource_v3") return raw;
    throw new Error(`PROJECT_ARCHITECTURE_UNSUPPORTED: ${raw}`);
  }

  assertV3(): void {
    if (this.current() !== "resource_v3" || process.env.HILO_GATEWAY_ROLE !== "workspace" || !process.env.WORKSPACE_DIR) {
      throw new ProjectKernelError("PROJECT_V3_DISABLED");
    }
  }
}
