// use-reference-attachment-navigation.js
import { reactExports } from "../vendor.js";
import { ReferenceNavigationContext } from "./get-reference-navigation-defaults.jsx";
import { CanvasActionsContext } from "./use-canvas-actions.js";
import { extractCanvasEditorText } from "../assets/parse-prompt-to-tiptap.js";

function resolveReferenceTarget(actions, nodeId, path2) {
  let target = actions.getIncomingSourceNodeIdByPath(nodeId, path2);
  const visited = new Set();
  while (target && !visited.has(target)) {
    visited.add(target);
    const node2 = actions.getNodeById(target);
    if (!node2 || target === nodeId) return null;
    if (node2.meta?.hidden !== true) return target;
    target = node2.groupId ?? null;
  }
  return null;
}

function restoreReferenceEditor(editor, snapshot2) {
  if (!snapshot2 || editor.isDestroyed) return;
  if (snapshot2.selection) {
    const max2 = editor.state.doc.content.size;
    editor.commands.setTextSelection({
      from: Math.min(snapshot2.selection.from, max2),
      to: Math.min(snapshot2.selection.to, max2),
    });
  }
  if (snapshot2.focused)
    editor.commands.focus(void 0, {
      scrollIntoView: false,
    });
  const viewport = editor.view.dom.closest(
    '[data-action-ui-id="popover.prompt-input"]',
  );
  if (snapshot2.scrollTop !== void 0 && viewport)
    viewport.scrollTop = snapshot2.scrollTop;
}

export function useReferenceAttachmentNavigation({
  nodeId,
  mode: mode2,
  editorRef,
  expanded,
  count: count2,
  getDraft,
  onSaveDraft,
  snapshot: snapshot2,
  defaults: defaults2,
}) {
  const actions = reactExports.useContext(CanvasActionsContext);
  const navigation2 = reactExports.useContext(ReferenceNavigationContext);
  const navigationSavedRef = reactExports.useRef(false);
  const restoredRef = reactExports.useRef(false);
  const onEditorReady = reactExports.useCallback(
    (editor) => {
      if (restoredRef.current) return;
      restoredRef.current = true;
      restoreReferenceEditor(editor, snapshot2 ?? null);
    },
    [snapshot2],
  );
  reactExports.useEffect(() => {
    if (
      navigation2?.record?.returning &&
      navigation2.record.nodeId === nodeId
    ) {
      navigationSavedRef.current = false;
      const editor = editorRef.current;
      if (editor) onEditorReady(editor);
      navigation2.acknowledgeReturn(nodeId);
    }
    if (!navigation2?.record) navigationSavedRef.current = false;
  }, [navigation2, nodeId, editorRef, onEditorReady]);
  const getLocateAction = (item) => {
    if (
      !nodeId ||
      !actions ||
      !navigation2 ||
      (item.kind !== "image" && item.kind !== "video")
    )
      return void 0;
    if (!resolveReferenceTarget(actions, nodeId, item.path)) return void 0;
    return () => {
      const target = resolveReferenceTarget(actions, nodeId, item.path);
      if (!target) return;
      const editor = editorRef.current;
      const draft = getDraft();
      if (editor && !editor.isDestroyed) {
        draft.prompt = extractCanvasEditorText(editor);
        draft.promptJson = JSON.stringify(editor.getJSON());
      }
      if (draft.modelId) {
        onSaveDraft?.(draft);
        navigationSavedRef.current = true;
      }
      navigation2.locate(nodeId, target, {
        mode: mode2,
        draft,
        expanded,
        count: count2,
        selection:
          editor && !editor.isDestroyed
            ? {
                from: editor.state.selection.from,
                to: editor.state.selection.to,
              }
            : void 0,
        scrollTop:
          editor && !editor.isDestroyed
            ? editor.view.dom.closest(
                '[data-action-ui-id="popover.prompt-input"]',
              )?.scrollTop
            : void 0,
        focused: editor?.isFocused,
        defaults: defaults2,
      });
    };
  };
  return {
    getLocateAction,
    onEditorReady,
    navigationSavedRef,
  };
}
