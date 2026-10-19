export function isReadOnlyDerivedEdge(edge) {
  return isDerivedEdge(edge) && edge.data.derivedCuttable !== true;
}

export function isDerivedEdge(edge) {
  return typeof edge.data === "object" && edge.data !== null && edge.data.derived === true;
}
