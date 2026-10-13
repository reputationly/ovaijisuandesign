// use-reference-attachment-navigation.js
import { reactExports } from "../vendor.js";
import { ReferenceNavigationContext } from "./get-reference-navigation-defaults.jsx";
import { CanvasActionsContext } from "./use-canvas-actions.js";
import { extractCanvasEditorText } from "../assets/parse-prompt-to-tiptap.js";

function resolveReferenceTarget(actions, nodeId, path) {
  let target = actions.getIncomingSourceNodeIdByPath(nodeId, path);
  const visited = new Set();
  while (target && !visited.has(target)) {
    visited.add(target);
    const node = actions.getNodeById(target);
    if (!node || target === nodeId) return null;
    if (node.meta?.hidden !== true) return target;
    target = node.groupId ?? null;
  }
  return null;
}

function restoreReferenceEditor(editor, snapshot) {
  if (!snapshot || editor.isDestroyed) return;
  if (snapshot.selection) {
    const max = editor.state.doc.content.size;
    editor.commands.setTextSelection({
      from: Math.min(snapshot.selection.from, max),
      to: Math.min(snapshot.selection.to, max),
    });
  }
  if (snapshot.focused)
    editor.commands.focus(void 0, {
      scrollIntoView: false,
    });
  const viewport = editor.view.dom.closest(
    '[data-action-ui-id="popover.prompt-input"]',
  );
  if (snapshot.scrollTop !== void 0 && viewport)
    viewport.scrollTop = snapshot.scrollTop;
}

export function useReferenceAttachmentNavigation({
  nodeId,
  mode,
  editorRef,
  expanded,
  count,
  getDraft,
  onSaveDraft,
  snapshot,
  defaults,
}) {
  const actions = reactExports.useContext(CanvasActionsContext);
  const referenceNavigation = reactExports.useContext(ReferenceNavigationContext);
  const navigationSavedRef = reactExports.useRef(false);
  const restoredRef = reactExports.useRef(false);
  const onEditorReady = reactExports.useCallback(
    (editor) => {
      if (restoredRef.current) return;
      restoredRef.current = true;
      restoreReferenceEditor(editor, snapshot ?? null);
    },
    [snapshot],
  );
  reactExports.useEffect(() => {
    if (
      referenceNavigation?.record?.returning &&
      referenceNavigation.record.nodeId === nodeId
    ) {
      navigationSavedRef.current = false;
      const editor = editorRef.current;
      if (editor) onEditorReady(editor);
      referenceNavigation.acknowledgeReturn(nodeId);
    }
    if (!referenceNavigation?.record) navigationSavedRef.current = false;
  }, [referenceNavigation, nodeId, editorRef, onEditorReady]);
  const getLocateAction = (item) => {
    if (
      !nodeId ||
      !actions ||
      !referenceNavigation ||
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
      referenceNavigation.locate(nodeId, target, {
        mode,
        draft,
        expanded,
        count,
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
        defaults,
      });
    };
  };
  return {
    getLocateAction,
    onEditorReady,
    navigationSavedRef,
  };
}
