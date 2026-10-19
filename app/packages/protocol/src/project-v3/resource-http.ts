/** 由 v3 preload 产物还原：../packages/protocol/dist/project-v3/resource-http.js */
import { PROJECT_HTTP_SHARED_ERROR_MESSAGES } from "./http-error.js";

export const PROJECT_RESOURCE_HTTP_ERROR_MESSAGES = {
  PROJECT_V3_DISABLED: "Project V3 is not enabled for this workspace",
  PROJECT_ARCHITECTURE_UNSUPPORTED: "Workspace project architecture does not support resource operations",
  PROJECT_WORKSPACE_SCOPE_MISMATCH: "Request does not belong to the bound workspace",
  PROJECT_COMMAND_ID_REUSED: "Command ID was already used with a different request",
  PROJECT_INVALID_COMMAND: "Command payload is invalid",
  PROJECT_INVALID_QUERY: "Query parameters are invalid",
  PROJECT_RESOURCE_ALREADY_EXISTS: "Resource ID already exists",
  PROJECT_VERSION_ALREADY_EXISTS: "Version ID already exists",
  PROJECT_VERSION_RESOURCE_MISMATCH: "Version does not belong to this resource",
  PROJECT_INVALID_VERSION: "Version payload is invalid",
  PROJECT_CURRENT_VERSION_DELETE_FORBIDDEN: "Current version cannot be deleted while it is in use",
  PROJECT_INVALID_DEPENDENCY: "Version dependencies are invalid",
  PROJECT_INVALID_PATH: "File path is malformed or outside the workspace",
  PROJECT_CONTENT_UNAVAILABLE: "Resource content is not available in the workspace",
  PROJECT_INVALID_LIFECYCLE: "Resource lifecycle does not allow this operation",
  PROJECT_RESOURCE_NOT_FOUND: "Resource not found",
  PROJECT_VERSION_NOT_FOUND: "Version not found",
  PROJECT_CURRENT_VERSION_UNAVAILABLE: "Resource has no readable current version",
  PROJECT_STORE_CLOSED: "Project store is closed; retry once the workspace is ready",
  PROJECT_COPY_ACTIVITY_UNAVAILABLE: "Copy cannot start while the workspace is busy; retry later",
  PROJECT_STORE_SCHEMA_UNSUPPORTED: "Project store schema is unsupported by this build",
  ...PROJECT_HTTP_SHARED_ERROR_MESSAGES
};

