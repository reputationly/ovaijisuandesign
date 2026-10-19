/** 由 v3 preload 产物还原：../packages/protocol/dist/project-v3/command.js */
export enum ProjectActor {
  HUMAN = "human",
  AGENT = "agent",
}
export enum ProjectResourceCommandType {
  CREATE = "resource.create",
  UPDATE = "resource.update",
  DELETE = "resource.delete",
  COPY = "resource.copy",
}
export enum ProjectResourceDeleteTarget {
  RESOURCE = "resource",
  VERSION = "version",
}
export enum ProjectResourceUpdateKind {
  METADATA = "metadata",
  LIFECYCLE = "lifecycle",
  NEW_VERSION = "new_version",
  CURRENT_VERSION = "current_version",
}
export enum ProjectVersionDisposition {
  ADOPTED = "adopted",
  CANDIDATE = "candidate",
}
export enum ProjectResourceConflictKind {
  VERSION = "resource_version",
  METADATA_REVISION = "resource_metadata_revision",
}

