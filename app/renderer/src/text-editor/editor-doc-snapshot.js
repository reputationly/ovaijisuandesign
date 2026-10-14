// 编辑器 doc 的快照。


function cloneDraftEditorDoc(value) {
  if (!value || typeof value !== "object" || !("type" in value) || value.type !== "doc") return void 0;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return void 0;
  }
}
export function editorDocSnapshot(value) {
  const editorDoc = cloneDraftEditorDoc(value);
  return editorDoc ? {
    editorDoc
  } : {};
}
