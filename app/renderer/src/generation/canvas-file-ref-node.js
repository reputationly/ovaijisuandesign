// canvas-file-ref-node.js
import {
  mergeAttributes,
  Node$3 as Node,
  ReactNodeViewRenderer,
} from "../vendor.js";
import { MentionChipNodeView } from "./mention-chip-node-view.jsx";
import { parseCanvasReference } from "../text-editor/table-document-to-llm-content.js";
import { serializeMentionToken } from "../assets/parse-prompt-to-tiptap.js";
function isPathInCurrentWorkspace(path2, assetMetadataStore) {
  if (!assetMetadataStore) return false;
  const assets = assetMetadataStore.getState().assets;
  for (const meta2 of assets.values()) {
    if (meta2.path === path2) return true;
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
        getAttrs: (node2) => {
          if (!(node2 instanceof HTMLElement)) return false;
          const path2 =
            node2.getAttribute("data-path") ?? node2.getAttribute("path") ?? "";
          if (!path2) return false;
          if (
            !parseCanvasReference(path2) &&
            !isPathInCurrentWorkspace(path2, assetMetadataStore)
          )
            return false;
          const kindAttr =
            node2.getAttribute("data-kind") ??
            node2.getAttribute("kind") ??
            "image";
          const kind =
            kindAttr === "video" || kindAttr === "audio" || kindAttr === "text"
              ? kindAttr
              : "image";
          return {
            path: path2,
            filename:
              node2.getAttribute("data-filename") ??
              node2.getAttribute("filename") ??
              "",
            kind,
          };
        },
      },
    ];
  },
  renderHTML({ node: node2, HTMLAttributes }) {
    return [
      "canvas-file-ref",
      mergeAttributes(HTMLAttributes, {
        "data-path": node2.attrs.path,
        "data-filename": node2.attrs.filename,
        "data-kind": node2.attrs.kind,
      }),
    ];
  },
  // Plain-text serialization (used by Tiptap's clipboardTextSerializer +
  // any caller of `editor.getText()`) — emits the canonical `@[<path>]` form
  // so a chip copied to plaintext (and into chat / external editor) is
  // self-describing and can be parsed back by `parsePromptToTiptap`.
  renderText({ node: node2 }) {
    const path2 = String(node2.attrs.path ?? "");
    return serializeMentionToken(path2);
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
        ({ chain, state: state2 }) => {
          if (
            triggerRange &&
            Number.isInteger(triggerRange.from) &&
            Number.isInteger(triggerRange.to) &&
            triggerRange.from >= 0 &&
            triggerRange.to > triggerRange.from &&
            triggerRange.to <= state2.doc.content.size
          ) {
            const triggerText = state2.doc.textBetween(
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
          const { $from } = state2.selection;
          const before = $from.nodeBefore;
          const match2 = before?.isText
            ? before.text?.match(/@([^\s@]*)$/)
            : null;
          if (match2) {
            const start2 = $from.pos - match2[0].length;
            return chain()
              .deleteRange({
                from: start2,
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
        (path2, attrs) =>
        ({ tr: tr2, state: state2 }) => {
          const positions = [];
          state2.doc.descendants((node2, pos) => {
            if (node2.type.name === this.name && node2.attrs.path === path2) {
              positions.push(pos);
            }
          });
          for (const pos of positions) {
            tr2.setNodeMarkup(pos, void 0, attrs);
          }
          return positions.length > 0;
        },
      removeCanvasFileRefsByPath:
        (path2) =>
        ({ tr: tr2, state: state2 }) => {
          const nodesToRemove = [];
          state2.doc.descendants((node2, pos) => {
            if (node2.type.name === this.name && node2.attrs.path === path2) {
              nodesToRemove.push({
                pos,
                size: node2.nodeSize,
              });
            }
          });
          for (let i2 = nodesToRemove.length - 1; i2 >= 0; i2--) {
            const { pos, size: size2 } = nodesToRemove[i2];
            tr2.delete(pos, pos + size2);
          }
          return nodesToRemove.length > 0;
        },
    };
  },
  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr: tr2, state: state2 }) => {
          const { selection: selection2 } = state2;
          const { $from } = selection2;
          if (!selection2.empty) return false;
          const before = $from.nodeBefore;
          if (before?.type.name === this.name) {
            tr2.delete($from.pos - before.nodeSize, $from.pos);
            return true;
          }
          return false;
        }),
    };
  },
});
