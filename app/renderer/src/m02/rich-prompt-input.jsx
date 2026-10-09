// rich-prompt-input.jsx
import {
  reactExports,
  useAssetMetadataApi,
  Extension,
  usePromptFontSizeStore,
  useEditor,
  src_default$1,
  EditorContent,
} from "../vendor.js";
import { PromptInputMetaRow } from "../m01/params-popup.jsx";
import { SEEDANCE_REFERENCE_AUDIO_EXTS } from "../m01/myers-line-hunks.js";
import {
  parseCanvasReference,
  isCanvasReferenceUri,
  findAllMentions,
} from "../m01/table-document-to-llm-content.js";
import {
  extractCanvasEditorCountedText,
  extractCanvasEditorText,
  countPromptCharacters,
} from "../m01/use-assets-ref-validate.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { CanvasFileRefNode } from "./reference-switch-popover.jsx";
import { src_default } from "./use-direct-reference-picker.jsx";
function isPromptViewportClick(viewport, target) {
  return target instanceof Node && viewport.contains(target);
}
const EMPTY_EXTENSIONS = [];
function hasFileRef(editor) {
  let found2 = false;
  editor.state.doc.descendants((node2) => {
    if (node2.type.name === "canvasFileRef") {
      found2 = true;
      return false;
    }
  });
  return found2;
}
function collectFileRefs(editor) {
  const refs = [];
  editor.state.doc.descendants((node2) => {
    if (node2.type.name === "canvasFileRef") {
      const attrs = node2.attrs;
      if (attrs.path) refs.push(attrs);
    }
  });
  return refs;
}
function buildAtTriggerExtension(browseStateRef, onAtTrigger, onAtDismiss) {
  let active2 = false;
  let currentEditor = null;
  let currentFrom = null;
  const getRect2 = () => {
    if (!currentEditor || currentEditor.isDestroyed || currentFrom == null) return null;
    try {
      const coords = currentEditor.view.coordsAtPos(currentFrom);
      return new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top);
    } catch {
      return null;
    }
  };
  return Extension.create({
    name: "canvasAtTrigger",
    onTransaction({ editor }) {
      if (!onAtTrigger) return;
      const { state: state2 } = editor;
      const browseState = browseStateRef.current;
      if (browseState) {
        if (state2.doc.eq(browseState.doc) && state2.selection.eq(browseState.selection)) return;
        browseStateRef.current = null;
        active2 = true;
      }
      const { $from } = state2.selection;
      if (!state2.selection.empty) {
        if (active2) {
          active2 = false;
          currentEditor = null;
          currentFrom = null;
          onAtDismiss?.();
        }
        return;
      }
      const before = $from.nodeBefore;
      if (!before?.isText || !before.text) {
        if (active2) {
          active2 = false;
          currentEditor = null;
          currentFrom = null;
          onAtDismiss?.();
        }
        return;
      }
      const match2 = before.text.match(/@([^\s@]*)$/);
      if (match2) {
        const view2 = editor.view;
        const from2 = $from.pos - match2[1].length - 1;
        const to = $from.pos;
        currentEditor = editor;
        currentFrom = from2;
        const coords = view2.coordsAtPos(from2);
        const rect = new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top);
        active2 = true;
        onAtTrigger(match2[1], rect, getRect2, {
          from: from2,
          to,
        });
      } else if (active2) {
        active2 = false;
        currentEditor = null;
        currentFrom = null;
        onAtDismiss?.();
      }
    },
  });
}
export function RichPromptInput({
  initialContent,
  placeholder: placeholderText,
  disabled: disabled2,
  onClose,
  blockKeyHandlers,
  editorRef,
  onEditorReady,
  onAtTrigger,
  onAtDismiss,
  onUpdate,
  resolveCharacterCount,
  resolveFileUrl,
  fileRefSwitchConfig,
  onFileRefsAdded,
  onDirectReferencesRemoved,
  maxLength,
  emptyStateAction,
  counterLeadingAction,
  showUtilityControls,
  extraExtensions = EMPTY_EXTENSIONS,
}) {
  const assetMetadataStore = useAssetMetadataApi();
  const fontSize = usePromptFontSizeStore((state2) => state2.fontSize);
  const onFileRefsAddedRef = reactExports.useRef(onFileRefsAdded);
  onFileRefsAddedRef.current = onFileRefsAdded;
  const onDirectReferencesRemovedRef = reactExports.useRef(onDirectReferencesRemoved);
  onDirectReferencesRemovedRef.current = onDirectReferencesRemoved;
  const resolveFileUrlRef = reactExports.useRef(resolveFileUrl);
  resolveFileUrlRef.current = resolveFileUrl;
  const stableResolveFileUrl = reactExports.useRef(
    (path2) => resolveFileUrlRef.current?.(path2) ?? "",
  );
  const fileRefSwitchConfigRef = reactExports.useRef(fileRefSwitchConfig);
  fileRefSwitchConfigRef.current = fileRefSwitchConfig;
  const stableGetFileRefSwitchConfig = reactExports.useRef(() => fileRefSwitchConfigRef.current);
  const knownPathsRef = reactExports.useRef(new Set());
  const [textLength2, setTextLength] = reactExports.useState(0);
  const onUpdateRef = reactExports.useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const resolveCharacterCountRef = reactExports.useRef(resolveCharacterCount);
  resolveCharacterCountRef.current = resolveCharacterCount;
  const browseStateRef = reactExports.useRef(null);
  const editor = useEditor(
    {
      extensions: [
        src_default.configure({
          heading: false,
          bold: false,
          italic: false,
          strike: false,
          code: false,
          codeBlock: false,
          blockquote: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          horizontalRule: false,
        }),
        src_default$1.configure({
          placeholder: placeholderText ?? "",
        }),
        CanvasFileRefNode.configure({
          assetMetadataStore,
          resolveFileUrl: stableResolveFileUrl.current,
          getFileRefSwitchConfig: stableGetFileRefSwitchConfig.current,
        }),
        ...extraExtensions,
        buildAtTriggerExtension(browseStateRef, onAtTrigger, onAtDismiss),
      ],
      content: typeof initialContent === "string" ? initialContent : (initialContent ?? ""),
      editable: !disabled2,
      onUpdate({ editor: e2 }) {
        const countedText = extractCanvasEditorCountedText(e2);
        const serializedPrompt = extractCanvasEditorText(e2);
        const len =
          resolveCharacterCountRef.current?.(serializedPrompt, countedText) ??
          countPromptCharacters(countedText);
        onUpdateRef.current?.(countedText.trim().length > 0 || hasFileRef(e2), len);
        setTextLength(len);
        const cb = onFileRefsAddedRef.current;
        if (!cb && !onDirectReferencesRemovedRef.current) {
          knownPathsRef.current = new Set(collectFileRefs(e2).map((r2) => r2.path));
          return;
        }
        const refs = collectFileRefs(e2);
        const known = knownPathsRef.current;
        const next2 = new Set();
        const added = [];
        for (const ref of refs) {
          next2.add(ref.path);
          if (!known.has(ref.path)) added.push(ref);
        }
        knownPathsRef.current = next2;
        const removed = [...known].filter(
          (path2) => isCanvasReferenceUri(path2) && !next2.has(path2),
        );
        if (removed.length > 0) {
          queueMicrotask(() => onDirectReferencesRemovedRef.current?.(removed));
        }
        if (added.length > 0 && cb) {
          queueMicrotask(() => cb(added));
        }
      },
      editorProps: {
        handleKeyDown(_view, event) {
          event.stopPropagation();
          if (event.isComposing || event.keyCode === 229) {
            return false;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            if (!blockKeyHandlers) onClose();
            return true;
          }
          return false;
        },
        handlePaste: (view2, event) => {
          const text2 = event.clipboardData?.getData("text/plain") ?? "";
          if (!text2?.includes("@")) return false;
          const mentions = findAllMentions(text2);
          if (mentions.length === 0) return false;
          const assets = assetMetadataStore.getState().assets;
          const metaByPath = new Map();
          assets.forEach((meta2) => {
            if (meta2.path && !metaByPath.has(meta2.path)) {
              metaByPath.set(meta2.path, {
                path: meta2.path,
                name: meta2.name,
                type: meta2.type,
              });
            }
          });
          const inlineJSON = [];
          let cursor = 0;
          for (const m3 of mentions) {
            if (m3.start > cursor) {
              inlineJSON.push({
                type: "text",
                text: text2.slice(cursor, m3.start),
              });
            }
            const direct = parseCanvasReference(m3.path);
            const meta2 = direct
              ? {
                  path: m3.path,
                  name: direct.subjectName ? `${direct.subjectName} · ${direct.name}` : direct.name,
                  type: direct.kind,
                }
              : metaByPath.get(m3.path);
            if (meta2) {
              const kind =
                meta2.type === "video" || meta2.type === "audio" || meta2.type === "text"
                  ? meta2.type
                  : "image";
              inlineJSON.push({
                type: "canvasFileRef",
                attrs: {
                  path: meta2.path,
                  filename: meta2.name,
                  kind,
                },
              });
            } else {
              inlineJSON.push({
                type: "text",
                text: text2.slice(m3.start, m3.end),
              });
            }
            cursor = m3.end;
          }
          if (cursor < text2.length) {
            inlineJSON.push({
              type: "text",
              text: text2.slice(cursor),
            });
          }
          if (inlineJSON.length === 0) return false;
          try {
            const nodes = inlineJSON
              .map((j2) => view2.state.schema.nodeFromJSON(j2))
              .filter((n2) => !!n2);
            if (nodes.length === 0) return false;
            event.preventDefault();
            const tr2 = view2.state.tr.replaceSelectionWith(nodes[0], false);
            for (let i2 = 1; i2 < nodes.length; i2++) {
              tr2.insert(tr2.selection.to, nodes[i2]);
            }
            view2.dispatch(tr2);
            return true;
          } catch {
            return false;
          }
        },
        attributes: {
          class:
            "nowheel nopan w-full h-full bg-transparent outline-none tracking-tight text-[var(--canvas-controls-text)] [&_p.is-editor-empty:first-child::before]:text-muted-foreground/50 [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p]:m-0 [&_p]:leading-[inherit]",
        },
      },
    },
    [extraExtensions],
  );
  reactExports.useEffect(() => {
    if (editorRef) editorRef.current = editor;
    if (editor) onEditorReady?.(editor);
  }, [editor, editorRef, onEditorReady]);
  reactExports.useEffect(() => {
    if (!editor) return;
    const countedText = extractCanvasEditorCountedText(editor);
    const serializedPrompt = extractCanvasEditorText(editor);
    const len =
      resolveCharacterCount?.(serializedPrompt, countedText) ?? countPromptCharacters(countedText);
    setTextLength(len);
    onUpdateRef.current?.(countedText.trim().length > 0 || hasFileRef(editor), len);
  }, [editor, resolveCharacterCount]);
  reactExports.useEffect(() => {
    if (!editor) return;
    knownPathsRef.current = new Set(collectFileRefs(editor).map((r2) => r2.path));
  }, [editor]);
  reactExports.useEffect(() => {
    if (editor) editor.setEditable(!disabled2);
  }, [editor, disabled2]);
  const handleClick2 = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      if (!isPromptViewportClick(e2.currentTarget, e2.target)) return;
      if (editor && !editor.isFocused) {
        editor.commands.focus("end");
      }
    },
    [editor],
  );
  const openAtPicker = reactExports.useCallback(() => {
    if (!editor || disabled2 || editor.isDestroyed) return;
    if (!onAtTrigger) return;
    editor.commands.focus();
    const { from: from2 } = editor.state.selection;
    const getRect2 = () => {
      if (editor.isDestroyed) return null;
      try {
        const coords = editor.view.coordsAtPos(from2);
        return new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top);
      } catch {
        return null;
      }
    };
    const rect = getRect2();
    if (rect) {
      browseStateRef.current = editor.state;
      onAtTrigger("", rect, getRect2, {
        from: from2,
        to: from2,
      });
    }
  }, [disabled2, editor, onAtTrigger]);
  if (!editor) return null;
  const showEmptyState = !!emptyStateAction && editor.isEmpty;
  return (
    // `overflow-y-auto` 让长 prompt 在弹窗内部滚动，避免撑破 PopoverShell 固定高度。
    // `nowheel` + `nopan` 阻止滚动事件冒泡到 d3-zoom 触发画布缩放/平移。
    // `cursor-text` + 点击聚焦让整个 flex-1 区域都像一个 textarea。
    // EditorContent 用 h-full,内层 .ProseMirror 才能撑满父级 100% 高度
    // (默认 EditorContent height: auto = 内容高度,只占一行)。
    // PromptLengthHint 渲染在编辑器外的独立底部行，避免覆盖输入内容。
    <div
      className="canvas-prompt-font-size-editor flex w-full h-full min-h-0 flex-col"
      style={{
        "--canvas-prompt-font-size": fontSize,
        "--canvas-prompt-font-scale": fontSize / 16,
      }}
    >
      <div
        className="relative w-full min-h-0 flex-1 overflow-y-auto scrollbar-none nowheel nopan cursor-text"
        data-action-ui-id="popover.prompt-input"
        role="textbox"
        tabIndex={0}
        onClick={handleClick2}
      >
        <EditorContent
          editor={editor}
          className={`w-full h-full ${showEmptyState ? "[&_p.is-editor-empty:first-child::before]:hidden" : ""}`}
        />
        {showEmptyState ? (
          <div className="canvas-prompt-empty-state absolute inset-0 pointer-events-none flex items-start">
            <div className="pointer-events-none">
              {typeof emptyStateAction === "function"
                ? emptyStateAction({
                    openAtPicker,
                  })
                : emptyStateAction}
            </div>
          </div>
        ) : null}
      </div>
      <PromptInputMetaRow
        getPromptText={() => extractCanvasEditorText(editor)}
        copyDisabled={editor.isEmpty}
        currentLength={textLength2}
        maxLength={maxLength}
        leadingAction={counterLeadingAction}
        showUtilityControls={showUtilityControls}
      />
    </div>
  );
}
export function hasUnsupportedReferenceAudioFormat(path2) {
  const reference = parseCanvasReference(path2);
  if (reference?.target === "entity") return false;
  const filename = reference?.name ?? path2.split("?")[0]?.split("#")[0] ?? "";
  const dot2 = filename.lastIndexOf(".");
  if (dot2 < 0 || dot2 < Math.max(filename.lastIndexOf("/"), filename.lastIndexOf("\\")))
    return false;
  return !SEEDANCE_REFERENCE_AUDIO_EXTS.includes(filename.slice(dot2).toLowerCase());
}
export function getReferenceVideoDurationsMs(paths, assets, resolutions) {
  return paths.flatMap((path2) => {
    if (parseCanvasReference(path2)?.target === "entity") {
      const row = resolutions.get(path2);
      if (row?.status !== "available") return [];
      return (row.metadata?.attachments ?? [])
        .filter((item) => item.kind === "video")
        .map((item) => Math.round((item.metadata?.duration_sec ?? 0) * 1e3));
    }
    for (const meta2 of assets.values()) {
      if (
        meta2.path === path2 &&
        meta2.type === "video" &&
        meta2.durationSec != null &&
        meta2.durationSec > 0
      )
        return [Math.round(meta2.durationSec * 1e3)];
    }
    return [];
  });
}
export function mergeDirectReferenceMetadata(assets, resolutions) {
  const merged = new Map(assets);
  for (const [path2, row] of resolutions) {
    if (row.status !== "available" || !row.metadata) continue;
    const { reference, metadata } = row;
    const groups =
      reference.target === "entity"
        ? [...new Set(metadata.attachments.map((item) => item.kind))].map((kind) => ({
            kind,
            media: metadata.attachments
              .filter((item) => item.kind === kind)
              .map((item) => item.metadata),
          }))
        : [
            {
              kind: reference.kind,
              media: [metadata.media],
            },
          ];
    for (const { kind, media } of groups) {
      if (kind !== "image" && kind !== "video" && kind !== "audio" && kind !== "text") continue;
      const only = media.length === 1 ? media[0] : void 0;
      const durationSec =
        media.length && media.every((item) => item?.duration_sec != null)
          ? media.reduce((total, item) => total + (item?.duration_sec ?? 0), 0)
          : void 0;
      merged.set(`${path2}:${kind}`, {
        path: path2,
        name: row.name ?? reference.name,
        type: kind,
        url: "",
        durationSec,
        width: only?.width,
        height: only?.height,
        fileSize: only?.file_size,
      });
    }
  }
  return merged;
}
