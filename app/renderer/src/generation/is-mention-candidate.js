// is-mention-candidate.js

export function isMentionCandidate(id2, kind, allowedKinds, excludeAssetIds) {
  if (excludeAssetIds?.has(id2)) return false;
  if (!kind || !allowedKinds.has(kind)) return false;
  return true;
}
