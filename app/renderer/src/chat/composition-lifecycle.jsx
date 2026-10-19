export var CompositionLifecycle = ((CompositionLifecycle2) => {
  CompositionLifecycle2["ACTIVE"] = "active";
  CompositionLifecycle2["DELETED"] = "deleted";
  return CompositionLifecycle2;
})(CompositionLifecycle || {});

export var ProjectResourceKind = ((ProjectResourceKind2) => {
  ProjectResourceKind2[(ProjectResourceKind2["TEXT_DOCUMENT"] = 1)] = "TEXT_DOCUMENT";
  ProjectResourceKind2[(ProjectResourceKind2["IMAGE"] = 2)] = "IMAGE";
  ProjectResourceKind2[(ProjectResourceKind2["VIDEO"] = 3)] = "VIDEO";
  ProjectResourceKind2[(ProjectResourceKind2["AUDIO"] = 4)] = "AUDIO";
  ProjectResourceKind2[(ProjectResourceKind2["FILE"] = 5)] = "FILE";
  return ProjectResourceKind2;
})(ProjectResourceKind || {});

export var ProjectResourceLifecycle = ((ProjectResourceLifecycle2) => {
  ProjectResourceLifecycle2["ACTIVE"] = "active";
  ProjectResourceLifecycle2["MISSING"] = "missing";
  ProjectResourceLifecycle2["DELETED"] = "deleted";
  return ProjectResourceLifecycle2;
})(ProjectResourceLifecycle || {});

export var ProjectResourceVersionStatus = ((ProjectResourceVersionStatus2) => {
  ProjectResourceVersionStatus2["READY"] = "ready";
  ProjectResourceVersionStatus2["DELETED"] = "deleted";
  return ProjectResourceVersionStatus2;
})(ProjectResourceVersionStatus || {});

export var ProjectResourceReadErrorCode = ((ProjectResourceReadErrorCode2) => {
  ProjectResourceReadErrorCode2["RESOURCE_NOT_FOUND"] = "PROJECT_RESOURCE_NOT_FOUND";
  ProjectResourceReadErrorCode2["VERSION_NOT_FOUND"] = "PROJECT_VERSION_NOT_FOUND";
  ProjectResourceReadErrorCode2["VERSION_RESOURCE_MISMATCH"] = "PROJECT_VERSION_RESOURCE_MISMATCH";
  ProjectResourceReadErrorCode2["CURRENT_VERSION_UNAVAILABLE"] = "PROJECT_CURRENT_VERSION_UNAVAILABLE";
  return ProjectResourceReadErrorCode2;
})(ProjectResourceReadErrorCode || {});

export const PROJECT_RESOURCE_READ_BATCH_LIMIT = 100;
