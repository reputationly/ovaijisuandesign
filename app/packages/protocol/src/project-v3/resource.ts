/** 由 v3 preload 产物还原：../packages/protocol/dist/project-v3/resource.js */
export enum ProjectResourceKind {
  TEXT_DOCUMENT = 1,
  IMAGE = 2,
  VIDEO = 3,
  AUDIO = 4,
  FILE = 5,
}
export enum ProjectResourceLifecycle {
  ACTIVE = "active",
  MISSING = "missing",
  DELETED = "deleted",
}
export enum ProjectResourceSource {
  IMPORT = "import",
  GENERATE = "generate",
  COPY = "copy",
}
export enum ProjectResourceVersionStatus {
  READY = "ready",
  DELETED = "deleted",
}
export enum ProjectResourceReadErrorCode {
  RESOURCE_NOT_FOUND = "PROJECT_RESOURCE_NOT_FOUND",
  VERSION_NOT_FOUND = "PROJECT_VERSION_NOT_FOUND",
  VERSION_RESOURCE_MISMATCH = "PROJECT_VERSION_RESOURCE_MISMATCH",
  CURRENT_VERSION_UNAVAILABLE = "PROJECT_CURRENT_VERSION_UNAVAILABLE",
}

