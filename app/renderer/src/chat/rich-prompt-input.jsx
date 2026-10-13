// rich-prompt-input.jsx
import { EditorContent, Extension, reactExports, src_default$1 as Placeholder, useEditor, usePromptFontSizeStore } from "../vendor.js";
import { useAssetMetadataApi } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { PromptInputMetaRow } from "../generation/prompt-font-size-control.jsx";
import {
  findAllMentions,
  isCanvasReferenceUri,
  parseCanvasReference,
} from "../text-editor/table-document-to-llm-content.js";
import {
  countPromptCharacters,
  extractCanvasEditorCountedText,
  extractCanvasEditorText,
} from "../assets/parse-prompt-to-tiptap.js";
import { CanvasFileRefNode } from "../generation/canvas-file-ref-node.js";
import { src_default } from "../generation/attachment-bar.jsx";

function isPromptViewportClick(viewport, target) {
  return target instanceof Node && viewport.contains(target);
}

const EMPTY_EXTENSIONS = [];

function hasFileRef(editor) {
  let found = false;
  editor.state.doc.descendants((node) => {
    if (node.type.name === "canvasFileRef") {
      found = true;
      return false;
    }
  });
  return found;
}

function collectFileRefs(editor) {
  const refs = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "canvasFileRef") {
      const attrs = node.attrs;
      if (attrs.path) refs.push(attrs);
    }
  });
  return refs;
}

function buildAtTriggerExtension(browseStateRef, onAtTrigger, onAtDismiss) {
  let active = false;
  let currentEditor = null;
  let currentFrom = null;
  const getRect = () => {
    if (!currentEditor || currentEditor.isDestroyed || currentFrom == null)
      return null;
    try {
      const coords = currentEditor.view.coordsAtPos(currentFrom);
      return new DOMRect(
        coords.left,
        coords.top,
        0,
        coords.bottom - coords.top,
      );
    } catch {
      return null;
    }
  };
  return Extension.create({
    name: "canvasAtTrigger",
    onTransaction({ editor }) {
      if (!onAtTrigger) return;
      const { state } = editor;
      const browseState = browseStateRef.current;
      if (browseState) {
        if (
          state.doc.eq(browseState.doc) &&
          state.selection.eq(browseState.selection)
        )
          return;
        browseStateRef.current = null;
        active = true;
      }
      const { $from } = state.selection;
      if (!state.selection.empty) {
        if (active) {
          active = false;
          currentEditor = null;
          currentFrom = null;
          onAtDismiss?.();
        }
        return;
      }
      const before = $from.nodeBefore;
      if (!before?.isText || !before.text) {
        if (active) {
          active = false;
          currentEditor = null;
          currentFrom = null;
          onAtDismiss?.();
        }
        return;
      }
      const match = before.text.match(/@([^\s@]*)$/);
      if (match) {
        const view = editor.view;
        const from = $from.pos - match[1].length - 1;
        const triggerEndPosition = $from.pos;
        currentEditor = editor;
        currentFrom = from;
        const coords = view.coordsAtPos(from);
        const rect = new DOMRect(
          coords.left,
          coords.top,
          0,
          coords.bottom - coords.top,
        );
        active = true;
        onAtTrigger(match[1], rect, getRect, {
          from,
          to: triggerEndPosition,
        });
      } else if (active) {
        active = false;
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
  disabled,
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
  const fontSize = usePromptFontSizeStore((state) => state.fontSize);
  const onFileRefsAddedRef = reactExports.useRef(onFileRefsAdded);
  onFileRefsAddedRef.current = onFileRefsAdded;
  const onDirectReferencesRemovedRef = reactExports.useRef(
    onDirectReferencesRemoved,
  );
  onDirectReferencesRemovedRef.current = onDirectReferencesRemoved;
  const resolveFileUrlRef = reactExports.useRef(resolveFileUrl);
  resolveFileUrlRef.current = resolveFileUrl;
  const stableResolveFileUrl = reactExports.useRef(
    (path) => resolveFileUrlRef.current?.(path) ?? "",
  );
  const fileRefSwitchConfigRef = reactExports.useRef(fileRefSwitchConfig);
  fileRefSwitchConfigRef.current = fileRefSwitchConfig;
  const stableGetFileRefSwitchConfig = reactExports.useRef(
    () => fileRefSwitchConfigRef.current,
  );
  const knownPathsRef = reactExports.useRef(new Set());
  const [textLength, setTextLength] = reactExports.useState(0);
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
        Placeholder.configure({
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
      content:
        typeof initialContent === "string"
          ? initialContent
          : (initialContent ?? ""),
      editable: !disabled,
      onUpdate({ editor }) {
        const countedText = extractCanvasEditorCountedText(editor);
        const serializedPrompt = extractCanvasEditorText(editor);
        const characterCount =
          resolveCharacterCountRef.current?.(serializedPrompt, countedText) ??
          countPromptCharacters(countedText);
        onUpdateRef.current?.(
          countedText.trim().length > 0 || hasFileRef(editor),
          characterCount,
        );
        setTextLength(characterCount);
        const fileRefsAddedCallback = onFileRefsAddedRef.current;
        if (!fileRefsAddedCallback && !onDirectReferencesRemovedRef.current) {
          knownPathsRef.current = new Set(
            collectFileRefs(editor).map((fileRef) => fileRef.path),
          );
          return;
        }
        const refs = collectFileRefs(editor);
        const known = knownPathsRef.current;
        const next = new Set();
        const added = [];
        for (const fileRef of refs) {
          next.add(fileRef.path);
          if (!known.has(fileRef.path)) added.push(fileRef);
        }
        knownPathsRef.current = next;
        const removed = [...known].filter(
          (path) => isCanvasReferenceUri(path) && !next.has(path),
        );
        if (removed.length > 0) {
          queueMicrotask(() => onDirectReferencesRemovedRef.current?.(removed));
        }
        if (added.length > 0 && fileRefsAddedCallback) {
          queueMicrotask(() => fileRefsAddedCallback(added));
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
        handlePaste: (view, event) => {
          const text = event.clipboardData?.getData("text/plain") ?? "";
          if (!text?.includes("@")) return false;
          const mentions = findAllMentions(text);
          if (mentions.length === 0) return false;
          const assets = assetMetadataStore.getState().assets;
          const metaByPath = new Map();
          assets.forEach((meta) => {
            if (meta.path && !metaByPath.has(meta.path)) {
              metaByPath.set(meta.path, {
                path: meta.path,
                name: meta.name,
                type: meta.type,
              });
            }
          });
          const inlineJSON = [];
          let cursor = 0;
          for (const mention of mentions) {
            if (mention.start > cursor) {
              inlineJSON.push({
                type: "text",
                text: text.slice(cursor, mention.start),
              });
            }
            const direct = parseCanvasReference(mention.path);
            const meta = direct
              ? {
                  path: mention.path,
                  name: direct.subjectName
                    ? `${direct.subjectName} · ${direct.name}`
                    : direct.name,
                  type: direct.kind,
                }
              : metaByPath.get(mention.path);
            if (meta) {
              const kind =
                meta.type === "video" ||
                meta.type === "audio" ||
                meta.type === "text"
                  ? meta.type
                  : "image";
              inlineJSON.push({
                type: "canvasFileRef",
                attrs: {
                  path: meta.path,
                  filename: meta.name,
                  kind,
                },
              });
            } else {
              inlineJSON.push({
                type: "text",
                text: text.slice(mention.start, mention.end),
              });
            }
            cursor = mention.end;
          }
          if (cursor < text.length) {
            inlineJSON.push({
              type: "text",
              text: text.slice(cursor),
            });
          }
          if (inlineJSON.length === 0) return false;
          try {
            const nodes = inlineJSON
              .map((nodeJSON) => view.state.schema.nodeFromJSON(nodeJSON))
              .filter((node) => !!node);
            if (nodes.length === 0) return false;
            event.preventDefault();
            const transaction = view.state.tr.replaceSelectionWith(nodes[0], false);
            for (let index = 1; index < nodes.length; index++) {
              transaction.insert(transaction.selection.to, nodes[index]);
            }
            view.dispatch(transaction);
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
    const characterCount =
      resolveCharacterCount?.(serializedPrompt, countedText) ??
      countPromptCharacters(countedText);
    setTextLength(characterCount);
    onUpdateRef.current?.(
      countedText.trim().length > 0 || hasFileRef(editor),
      characterCount,
    );
  }, [editor, resolveCharacterCount]);
  reactExports.useEffect(() => {
    if (!editor) return;
    knownPathsRef.current = new Set(
      collectFileRefs(editor).map((fileRef) => fileRef.path),
    );
  }, [editor]);
  reactExports.useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [editor, disabled]);
  const handleClick = reactExports.useCallback(
    (clickEvent) => {
      clickEvent.stopPropagation();
      if (!isPromptViewportClick(clickEvent.currentTarget, clickEvent.target)) return;
      if (editor && !editor.isFocused) {
        editor.commands.focus("end");
      }
    },
    [editor],
  );
  const openAtPicker = reactExports.useCallback(() => {
    if (!editor || disabled || editor.isDestroyed) return;
    if (!onAtTrigger) return;
    editor.commands.focus();
    const { from } = editor.state.selection;
    const getRect = () => {
      if (editor.isDestroyed) return null;
      try {
        const coords = editor.view.coordsAtPos(from);
        return new DOMRect(
          coords.left,
          coords.top,
          0,
          coords.bottom - coords.top,
        );
      } catch {
        return null;
      }
    };
    const rect = getRect();
    if (rect) {
      browseStateRef.current = editor.state;
      onAtTrigger("", rect, getRect, {
        from,
        to: from,
      });
    }
  }, [disabled, editor, onAtTrigger]);
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
        onClick={handleClick}
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
        currentLength={textLength}
        maxLength={maxLength}
        leadingAction={counterLeadingAction}
        showUtilityControls={showUtilityControls}
      />
    </div>
  );
}
