// canvas-file-ref-node.js
import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MentionChipNodeView } from "./mention-chip-node-view.jsx";
import { parseCanvasReference } from "../text-editor/table-document-to-llm-content.js";
import { serializeMentionToken } from "../assets/parse-prompt-to-tiptap.js";
function isPathInCurrentWorkspace(path, assetMetadataStore) {
  if (!assetMetadataStore) return false;
  const assets = assetMetadataStore.getState().assets;
  for (const meta of assets.values()) {
    if (meta.path === path) return true;
  }
  return false;
}
export const CanvasFileRefNode = Node.create({
  name: "canvasFileRef",
  group: "inline",
  inline: true,
  atom: true,
  addOptions() {
    return {
      assetMetadataStore: void 0,
      // Render-time URL resolver, injected by RichPromptInput. The chip's
      // thumbnail is DERIVED from `path` on every render — never stored — so
      // a gateway port/token change can't leave it pointing at a dead URL.
      resolveFileUrl: void 0,
      // Optional live host bridge for switching exactly one inline reference.
      // RichPromptInput supplies a stable getter because Tiptap extensions are
      // configured once while model limits and attachment paths keep changing.
      getFileRefSwitchConfig: void 0,
    };
  },
  addAttributes() {
    return {
      path: {
        default: "",
      },
      filename: {
        default: "",
      },
      kind: {
        default: "image",
      },
    };
  },
  parseHTML() {
    const assetMetadataStore = this.options.assetMetadataStore;
    return [
      {
        tag: "canvas-file-ref",
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          const path =
            node.getAttribute("data-path") ?? node.getAttribute("path") ?? "";
          if (!path) return false;
          if (
            !parseCanvasReference(path) &&
            !isPathInCurrentWorkspace(path, assetMetadataStore)
          )
            return false;
          const kindAttr =
            node.getAttribute("data-kind") ??
            node.getAttribute("kind") ??
            "image";
          const kind =
            kindAttr === "video" || kindAttr === "audio" || kindAttr === "text"
              ? kindAttr
              : "image";
          return {
            path,
            filename:
              node.getAttribute("data-filename") ??
              node.getAttribute("filename") ??
              "",
            kind,
          };
        },
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "canvas-file-ref",
      mergeAttributes(HTMLAttributes, {
        "data-path": node.attrs.path,
        "data-filename": node.attrs.filename,
        "data-kind": node.attrs.kind,
      }),
    ];
  },
  // Plain-text serialization (used by Tiptap's clipboardTextSerializer +
  // any caller of `editor.getText()`) — emits the canonical `@[<path>]` form
  // so a chip copied to plaintext (and into chat / external editor) is
  // self-describing and can be parsed back by `parsePromptToTiptap`.
  renderText({ node }) {
    const path = String(node.attrs.path ?? "");
    return serializeMentionToken(path);
  },
  addNodeView() {
    return ReactNodeViewRenderer(MentionChipNodeView);
  },
  addCommands() {
    return {
      insertCanvasFileRef:
        (attrs) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs,
            })
            .focus(void 0, {
              scrollIntoView: false,
            })
            .run();
        },
      replaceAtTriggerWithFileRef:
        (attrs, triggerRange) =>
        ({ chain, state }) => {
          if (
            triggerRange &&
            Number.isInteger(triggerRange.from) &&
            Number.isInteger(triggerRange.to) &&
            triggerRange.from >= 0 &&
            triggerRange.to > triggerRange.from &&
            triggerRange.to <= state.doc.content.size
          ) {
            const triggerText = state.doc.textBetween(
              triggerRange.from,
              triggerRange.to,
              void 0,
              "￼",
            );
            if (triggerText.startsWith("@")) {
              return chain()
                .deleteRange(triggerRange)
                .insertContentAt(triggerRange.from, {
                  type: this.name,
                  attrs,
                })
                .focus(triggerRange.from + 1, {
                  scrollIntoView: false,
                })
                .run();
            }
          }
          const { $from } = state.selection;
          const before = $from.nodeBefore;
          const match = before?.isText
            ? before.text?.match(/@([^\s@]*)$/)
            : null;
          if (match) {
            const start = $from.pos - match[0].length;
            return chain()
              .deleteRange({
                from: start,
                to: $from.pos,
              })
              .insertContent({
                type: this.name,
                attrs,
              })
              .focus(void 0, {
                scrollIntoView: false,
              })
              .run();
          }
          return chain()
            .insertContent({
              type: this.name,
              attrs,
            })
            .focus(void 0, {
              scrollIntoView: false,
            })
            .run();
        },
      replaceCanvasFileRefsByPath:
        (path, attrs) =>
        ({ tr: transaction, state }) => {
          const positions = [];
          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.path === path) {
              positions.push(pos);
            }
          });
          for (const pos of positions) {
            transaction.setNodeMarkup(pos, void 0, attrs);
          }
          return positions.length > 0;
        },
      removeCanvasFileRefsByPath:
        (path) =>
        ({ tr: transaction, state }) => {
          const nodesToRemove = [];
          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.path === path) {
              nodesToRemove.push({
                pos,
                size: node.nodeSize,
              });
            }
          });
          for (let index = nodesToRemove.length - 1; index >= 0; index--) {
            const { pos, size } = nodesToRemove[index];
            transaction.delete(pos, pos + size);
          }
          return nodesToRemove.length > 0;
        },
    };
  },
  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr: transaction, state }) => {
          const { selection } = state;
          const { $from } = selection;
          if (!selection.empty) return false;
          const before = $from.nodeBefore;
          if (before?.type.name === this.name) {
            transaction.delete($from.pos - before.nodeSize, $from.pos);
            return true;
          }
          return false;
        }),
    };
  },
});
