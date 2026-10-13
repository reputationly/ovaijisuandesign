// is-mention-candidate.js

export function isMentionCandidate(id, kind, allowedKinds, excludeAssetIds) {
  if (excludeAssetIds?.has(id)) return false;
  if (!kind || !allowedKinds.has(kind)) return false;
  return true;
}
