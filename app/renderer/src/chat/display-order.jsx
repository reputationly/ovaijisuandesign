import { ProjectResourceKind } from "./composition-lifecycle.jsx";
export const displayOrder = {
  [ProjectResourceKind.VIDEO]: 0,
  [ProjectResourceKind.IMAGE]: 1,
  [ProjectResourceKind.AUDIO]: 2,
  [ProjectResourceKind.TEXT_DOCUMENT]: 3,
};

export function sortCompositionMediaForDisplay(items, kindOf) {
  const rank = (item) => {
    const kind2 = kindOf(item);
    return kind2 === void 0 ? 4 : (displayOrder[kind2] ?? 4);
  };
  return [...items].sort((a2, b3) => rank(a2) - rank(b3));
}

export const COMPOSITION_RESOURCE_KINDS = [
  ProjectResourceKind.IMAGE,
  ProjectResourceKind.VIDEO,
  ProjectResourceKind.AUDIO,
  ProjectResourceKind.TEXT_DOCUMENT,
];

export class StructureValidationError extends Error {
  constructor(message2) {
    super(message2);
    this.name = "StructureValidationError";
  }
}

export function assertStructureId(value, label) {
  if (typeof value !== "string" || !value.trim() || value.includes("\0")) {
    throw new StructureValidationError(`${label} must be a non-empty ID`);
  }
}

export function assertResourceLocation(scopeKey, location2) {
  assertStructureId(scopeKey, "scopeKey");
  if (location2.scopeKey !== scopeKey) throw new StructureValidationError("Scope mismatch");
  assertStructureId(location2.compositionId, "compositionId");
  assertStructureId(location2.memberId, "memberId");
  assertStructureId(location2.resourceId, "resourceId");
}

export function assertActionTarget(scopeKey, target, options2 = {}) {
  assertStructureId(scopeKey, "scopeKey");
  if (target.scopeKey !== scopeKey) throw new StructureValidationError("Scope mismatch");
  switch (target.kind) {
    case "type":
      assertStructureId(target.typeId, "typeId");
      break;
    case "composition":
      assertStructureId(target.compositionId, "compositionId");
      break;
    case "member":
      assertStructureId(target.compositionId, "compositionId");
      assertStructureId(target.memberId, "memberId");
      break;
    case "resource":
    case "version":
      assertStructureId(target.resourceId, "resourceId");
      if (target.kind === "version") assertStructureId(target.versionId, "versionId");
      if (options2.requireLocation && !target.location) {
        throw new StructureValidationError("Resource reference location is required");
      }
      if (target.location) {
        assertResourceLocation(scopeKey, target.location);
        if (target.location.resourceId !== target.resourceId) {
          throw new StructureValidationError("Resource location does not match the target");
        }
      }
      break;
    default:
      throw new StructureValidationError("Unknown action target");
  }
}

export function toResourceSelector(scopeKey, target, selection2) {
  assertActionTarget(scopeKey, target);
  const selected2 = selection2 ?? {
    kind: "current",
  };
  if (selected2.kind === "version") {
    assertStructureId(selected2.versionId, "versionId");
    return {
      resourceId: target.resourceId,
      versionId: selected2.versionId,
    };
  }
  if (selected2.kind !== "current") throw new StructureValidationError("Unknown version selection");
  return {
    resourceId: target.resourceId,
  };
}

export function immutableSnapshot(value) {
  const snapshot2 = structuredClone(value);
  function freeze2(item) {
    if (!item || typeof item !== "object" || Object.isFrozen(item)) return;
    for (const child of Object.values(item)) freeze2(child);
    Object.freeze(item);
  }
  freeze2(snapshot2);
  return snapshot2;
}
