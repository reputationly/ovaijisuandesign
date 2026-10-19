/** 由 v3 preload 产物还原：../packages/protocol/dist/project-v3/composition-http.js */
import { PROJECT_HTTP_SHARED_ERROR_MESSAGES } from "./http-error.js";

export const PROJECT_COMPOSITION_HTTP_ERROR_MESSAGES = {
  PROJECT_V3_DISABLED: "Project V3 is not enabled for this workspace",
  PROJECT_ARCHITECTURE_UNSUPPORTED: "Workspace project architecture does not support composition operations",
  PROJECT_WORKSPACE_SCOPE_MISMATCH: "Request does not belong to the bound workspace",
  PROJECT_COMMAND_ID_REUSED: "Command ID was already used with a different request",
  PROJECT_INVALID_COMMAND: "Command payload is invalid",
  PROJECT_INVALID_QUERY: "Query parameters are invalid",
  PROJECT_INVALID_PATH: "File path is malformed or outside the workspace",
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
  PROJECT_STORE_CLOSED: "Project store is closed; retry once the workspace is ready",
  PROJECT_STORE_SCHEMA_UNSUPPORTED: "Project store schema is unsupported by this build",
  ...PROJECT_HTTP_SHARED_ERROR_MESSAGES
};

