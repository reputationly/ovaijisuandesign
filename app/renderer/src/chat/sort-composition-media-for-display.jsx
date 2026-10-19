import { displayOrder } from "../text-editor/display-order.jsx";
import { ProjectResourceKind } from "../text-editor/project-resource-kind.jsx";
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
