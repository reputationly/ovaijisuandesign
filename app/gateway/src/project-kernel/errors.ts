export class ProjectKernelError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "ProjectKernelError";
  }
}

export class ProjectQueryError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ProjectQueryError";
  }
}

export const COMPOSITION_HTTP_STATUS: Record<string, number> = {
  PROJECT_V3_DISABLED: 403,
  PROJECT_WORKSPACE_SCOPE_MISMATCH: 409,
  PROJECT_COMMAND_ID_REUSED: 409,
  PROJECT_INVALID_COMMAND: 400,
  PROJECT_INVALID_QUERY: 400,
  PROJECT_INVALID_PATH: 400,
  PROJECT_INVALID_VERSION: 409,
  PROJECT_INVALID_DEPENDENCY: 409,
  PROJECT_VERSION_ALREADY_EXISTS: 409,
  PROJECT_CONTENT_UNAVAILABLE: 409,
  PROJECT_CURRENT_VERSION_UNAVAILABLE: 409,
  PROJECT_INVALID_LIFECYCLE: 409,
  PROJECT_COMPOSITION_NOT_FOUND: 404,
  PROJECT_COMPOSITION_ALREADY_EXISTS: 409,
  PROJECT_RESOURCE_ALREADY_EXISTS: 409,
  PROJECT_RESOURCE_NOT_FOUND: 404,
  PROJECT_VERSION_NOT_FOUND: 404,
  PROJECT_VERSION_RESOURCE_MISMATCH: 400,
  PROJECT_CURRENT_VERSION_DELETE_FORBIDDEN: 409,
  PROJECT_COMPOSITION_TYPE_NOT_FOUND: 404,
  PROJECT_COMPOSITION_TYPE_ALREADY_EXISTS: 409,
  PROJECT_COMPOSITION_MEMBER_NOT_FOUND: 404,
  PROJECT_COMPOSITION_MEMBER_ALREADY_EXISTS: 409,
  COMPOSITION_NAME_CONFLICT: 409,
  COMPOSITION_POSITION_CONFLICT: 409,
  COMPOSITION_PLACEMENT_INVALID: 409,
  COMPOSITION_POSITION_EXHAUSTED: 409,
  COMPOSITION_DUPLICATE_SOURCE_CHANGED: 409,
  PROJECT_STORE_CLOSED: 503,
  PROJECT_STORE_SCHEMA_UNSUPPORTED: 503,
  PROJECT_ARCHITECTURE_UNSUPPORTED: 503,
};

export const COMPOSITION_HTTP_MESSAGE: Record<string, string> = {
  PROJECT_V3_DISABLED: "Project V3 is not enabled for this workspace",
  PROJECT_ARCHITECTURE_UNSUPPORTED: "Workspace project architecture does not support composition operations",
  PROJECT_WORKSPACE_SCOPE_MISMATCH: "Request does not belong to the bound workspace",
  PROJECT_COMMAND_ID_REUSED: "Command ID was already used with a different request",
  PROJECT_INVALID_COMMAND: "Command payload is invalid",
  PROJECT_INVALID_QUERY: "Query parameters are invalid",
  PROJECT_INVALID_PATH: "File path is malformed or outside the workspace",
  PROJECT_INVALID_VERSION: "Resource version is not valid",
  PROJECT_INVALID_DEPENDENCY: "Resource dependency is not valid",
  PROJECT_VERSION_ALREADY_EXISTS: "Resource version already exists",
  PROJECT_CONTENT_UNAVAILABLE: "Resource content is unavailable",
  PROJECT_CURRENT_VERSION_UNAVAILABLE: "Resource has no current version",
  PROJECT_INVALID_LIFECYCLE: "Composition lifecycle does not allow this operation",
  PROJECT_COMPOSITION_NOT_FOUND: "Composition not found",
  PROJECT_COMPOSITION_ALREADY_EXISTS: "Composition ID already exists",
  PROJECT_COMPOSITION_TYPE_NOT_FOUND: "Composition type is not registered",
  PROJECT_COMPOSITION_TYPE_ALREADY_EXISTS: "Composition type already exists",
  PROJECT_COMPOSITION_MEMBER_NOT_FOUND: "Composition member not found",
  PROJECT_COMPOSITION_MEMBER_ALREADY_EXISTS: "Composition member already exists",
  COMPOSITION_NAME_CONFLICT: "An active Composition already has this type and name",
  COMPOSITION_POSITION_CONFLICT: "Position is already used by another Composition of this type",
  COMPOSITION_PLACEMENT_INVALID: "Placement anchor is not another active Composition of the same type",
  COMPOSITION_POSITION_EXHAUSTED: "No positions left in this type",
  COMPOSITION_DUPLICATE_SOURCE_CHANGED: "The source Composition changed while it was being copied. Read it again and retry.",
  PROJECT_STORE_CLOSED: "Project store is closed; retry once the workspace is ready",
  PROJECT_STORE_SCHEMA_UNSUPPORTED: "Project store schema is unsupported by this build",
};
