export function readCompositionContext(value) {
  if (!Array.isArray(value)) return [];
  const result = new Map();
  for (const item of value) {
    if (
      item &&
      typeof item === "object" &&
      typeof item.compositionId === "string" &&
      /^[\w-]+$/.test(item.compositionId) &&
      typeof item.name === "string"
    ) {
      result.set(item.compositionId, {
        compositionId: item.compositionId,
        name: item.name,
      });
    }
  }
  return [...result.values()];
}

export function hasCompositionContext(doc2) {
  return readCompositionContext(doc2?.attrs?.compositionContext).length > 0;
}
