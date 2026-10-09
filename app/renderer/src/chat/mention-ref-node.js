// mention-ref-node.js
import { mergeAttributes, Node$3, ReactNodeViewRenderer } from "../vendor.js";
import { MentionRefChip } from "./mention-ref-chip.js";

export const MentionRefNode = Node$3.create({
  name: "mentionRef",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      path: {
        default: "",
      },
      name: {
        default: "",
      },
      modelName: {
        default: null,
      },
      mentionName: {
        default: null,
      },
      kind: {
        default: "other",
      },
      markerStyle: {
        default: "at",
      },
      mediaType: {
        default: null,
      },
      thumbUrl: {
        default: null,
      },
      previewUrl: {
        default: null,
      },
      mediaUrl: {
        default: null,
      },
      entityType: {
        default: null,
      },
      isFolder: {
        default: false,
      },
      folderId: {
        default: null,
      },
      folderResolvedPath: {
        default: null,
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "mention-ref",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["mention-ref", mergeAttributes(HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MentionRefChip);
  },
  addCommands() {
    return {
      replaceTriggerWithMentionRef:
        (attrs, triggerStart, triggerEnd) =>
        ({ chain }) => {
          return chain()
            .deleteRange({
              from: triggerStart,
              to: triggerEnd,
            })
            .insertContentAt(triggerStart, {
              type: this.name,
              attrs,
            })
            .run();
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
          if (!before) return false;
          if (before.type.name === this.name) {
            tr2.delete($from.pos - before.nodeSize, $from.pos);
            return true;
          }
          if (before.isText && before.nodeSize === 1 && before.text === " ") {
            tr2.delete($from.pos - 1, $from.pos);
            return true;
          }
          return false;
        }),
    };
  },
});
