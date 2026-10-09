// mention-ref-chip.jsx
import {
  reactExports,
  X$7,
  Video,
  ImageOutlineIcon,
  FileText,
  instance,
  CompositedSvg,
  FileTypeIcon,
  classifyFileType,
  PluginKey,
  Decoration$1,
  DecorationSet,
  Extension,
  Plugin,
  FileVideo,
  File$1,
  Music,
  Workflow,
  Folder,
  NodeViewWrapper,
  Node$3,
  mergeAttributes,
  ReactNodeViewRenderer,
} from "../vendor.js";
import { splitMentionFilename } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import {
  PreviewCard$1,
  PreviewCardTrigger,
  PreviewCardContent,
} from "../m11/use-canvas-image-annotation-host.jsx";
import { EntityHoverCardBody } from "../m10/asset-center-relocation-coach-mark.jsx";
import { ConnectorIcon } from "../m10/proxy-detected-toast.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { languageDetectionLeafText, mentionRefLeafText } from "./attachment-preview.jsx";
export function getDocLanguageDetectionText(doc2) {
  return doc2.textBetween(0, doc2.content.size, "\n", languageDetectionLeafText);
}
export function pmPosToTextOffset(doc2, pmPos) {
  if (pmPos <= 0) return 0;
  return doc2.textBetween(0, pmPos, "\n", mentionRefLeafText).length;
}
function textOffsetToPmPos(doc2, textOffset) {
  if (textOffset <= 0) return 1;
  let lo = 1;
  let hi = doc2.content.size;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const len = doc2.textBetween(0, mid, "\n", mentionRefLeafText).length;
    if (len < textOffset) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}
export function scheduleEditorFocus(editor, position2) {
  requestAnimationFrame(() => {
    if (editor && !editor.isDestroyed) editor.commands.focus(position2);
  });
}
const HIGHLIGHT_CLASS = {
  skill: "hl-skill",
};
export const highlightPluginKey = new PluginKey("chatHighlight");
function buildDecorations(doc2, ranges) {
  if (ranges.length === 0) return DecorationSet.empty;
  const decorations2 = [];
  for (const { start: start2, end: end2, kind, attrs } of ranges) {
    const from2 = textOffsetToPmPos(doc2, start2);
    const to = textOffsetToPmPos(doc2, end2);
    if (from2 >= to || to > doc2.content.size + 1) continue;
    decorations2.push(
      Decoration$1.inline(
        from2,
        to,
        {
          ...attrs,
          class: [HIGHLIGHT_CLASS[kind], attrs?.class].filter(Boolean).join(" "),
        },
        {
          kind,
        },
      ),
    );
  }
  return DecorationSet.create(doc2, decorations2);
}
export const HighlightDecoration = Extension.create({
  name: "chatHighlight",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: highlightPluginKey,
        state: {
          init() {
            return {
              decorations: DecorationSet.empty,
              ranges: [],
            };
          },
          apply(tr2, prev) {
            const meta2 = tr2.getMeta(highlightPluginKey);
            if (meta2) {
              return {
                decorations: buildDecorations(tr2.doc, meta2),
                ranges: meta2,
              };
            }
            if (tr2.docChanged) {
              return {
                decorations: buildDecorations(tr2.doc, prev.ranges),
                ranges: prev.ranges,
              };
            }
            return prev;
          },
        },
        props: {
          decorations(state2) {
            return highlightPluginKey.getState(state2)?.decorations ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
function AudioWaveIcon({ className }) {
  return (
    <CompositedSvg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 2v12" />
      <path d="M4 5v6" />
      <path d="M12 5v6" />
      <path d="M2 7v2" />
      <path d="M6 4v8" />
      <path d="M10 4v8" />
      <path d="M14 7v2" />
    </CompositedSvg>
  );
}
export function FileKindIcon({ kind, className }) {
  const cls = className ?? "w-3.5 h-3.5 text-muted-foreground";
  if (kind === "image") return <ImageOutlineIcon className={cls} />;
  if (kind === "video") return <FileVideo className={cls} />;
  if (kind === "audio") return <AudioWaveIcon className={cls} />;
  if (kind === "text") return <FileText className={cls} />;
  return <File$1 className={cls} />;
}
export function ModelTypeIcon({ mediaType, className }) {
  const cls = className ?? "w-3.5 h-3.5 text-muted-foreground";
  if (mediaType === "video") return <Video className={cls} />;
  if (mediaType === "audio") return <Music className={cls} />;
  return <ImageOutlineIcon className={cls} />;
}
function MentionRefChip({ node: node2, deleteNode: deleteNode2 }) {
  const attrs = node2.attrs;
  const className =
    attrs.kind === "model"
      ? "hl-mention-model"
      : attrs.kind === "connector"
        ? "hl-mention-file hl-mention-connector"
        : "hl-mention-file";
  const style2 =
    attrs.thumbUrl && attrs.kind !== "connector"
      ? {
          ["--mention-thumb"]: `url("${attrs.thumbUrl}")`,
        }
      : void 0;
  const isFileReference =
    !attrs.isFolder && ["image", "video", "audio", "text", "other"].includes(attrs.kind);
  const [failedThumb, setFailedThumb] = reactExports.useState(null);
  const fileThumb = attrs.thumbUrl && attrs.thumbUrl !== failedThumb ? attrs.thumbUrl : void 0;
  const isAsset = attrs.kind === "asset";
  const assetTypeLabel =
    isAsset && attrs.entityType
      ? instance.t(`assetCenter.types.${attrs.entityType}`, {
          defaultValue: attrs.entityType,
        })
      : null;
  const assetEntityId =
    isAsset && attrs.path.startsWith("asset:") ? attrs.path.slice("asset:".length) : null;
  const marker = attrs.markerStyle ?? "at";
  const folderResolved = attrs.isFolder ? attrs.folderResolvedPath : null;
  const prefix = folderResolved ? "" : marker === "bracket" ? "[" : "";
  const suffix = folderResolved ? null : marker === "bracket" ? "]" : null;
  const isFileLabel =
    attrs.kind !== "model" &&
    attrs.kind !== "asset" &&
    attrs.kind !== "connector" &&
    !attrs.isFolder;
  const { stem: displayStem, ext: displayExt } = isFileLabel
    ? splitMentionFilename(attrs.name)
    : {
        stem: attrs.name,
        ext: "",
      };
  const chipBody = reactExports.createElement(
    "span",
    {
      className,
      "data-mention-kind": attrs.kind,
      "data-file-type-artwork": isFileReference ? "1" : void 0,
      "data-mention-name": attrs.name,
      "data-mention-marker": marker,
      "data-mention-has-thumb": attrs.thumbUrl ? "1" : "0",
      ...(attrs.isFolder
        ? {
            "data-mention-folder": "1",
          }
        : {}),
      ...(attrs.isFolder && attrs.folderId
        ? {
            "data-folder-id": attrs.folderId,
          }
        : {}),
      ...(folderResolved
        ? {
            title: folderResolved,
          }
        : {
            title: attrs.name,
          }),
      // Asset chips use a PreviewCard hover-card; suppress the browser's
      // native text tooltip (which appears alongside on Win/Linux when an
      // element's textContent overflows or when title-like attrs leak in).
      ...(isAsset
        ? {
            title: "",
          }
        : {}),
      ...(attrs.previewUrl
        ? {
            "data-mention-preview-url": attrs.previewUrl,
          }
        : {}),
      ...(attrs.mediaUrl
        ? {
            "data-mention-media-url": attrs.mediaUrl,
          }
        : {}),
      contentEditable: false,
      style: style2,
    },
    isFileReference
      ? reactExports.createElement(
          "span",
          {
            className: "hl-mention-text-icon",
            "aria-hidden": true,
          },
          fileThumb
            ? reactExports.createElement("img", {
                src: fileThumb,
                alt: "",
                className: "h-full w-full rounded-sm object-cover",
                draggable: false,
                onError: () => setFailedThumb(fileThumb),
              })
            : (attrs.kind === "image" || attrs.kind === "video" || attrs.kind === "audio") &&
                classifyFileType({
                  filename: attrs.name || attrs.path,
                }).category !== "photoshop"
              ? reactExports.createElement(FileKindIcon, {
                  kind: attrs.kind,
                })
              : reactExports.createElement(FileTypeIcon, {
                  ...classifyFileType({
                    filename: attrs.name || attrs.path,
                  }),
                  size: 14,
                  decorative: true,
                }),
        )
      : attrs.kind === "connector"
        ? reactExports.createElement(ConnectorIcon, {
            iconUrl: attrs.thumbUrl,
            size: "inline",
            className: "hl-mention-connector-icon",
          })
        : attrs.kind === "model" && !attrs.thumbUrl
          ? reactExports.createElement(
              "span",
              {
                className: "hl-mention-model-icon",
                "aria-hidden": true,
              },
              reactExports.createElement(ModelTypeIcon, {
                mediaType: attrs.mediaType,
                className: "w-[13px] h-[13px] text-muted-foreground",
              }),
            )
          : attrs.kind === "workflow"
            ? reactExports.createElement(
                "span",
                {
                  className: "hl-mention-text-icon",
                  "aria-hidden": true,
                },
                reactExports.createElement(Workflow, {
                  className: "w-[13px] h-[13px] text-muted-foreground",
                }),
              )
            : attrs.isFolder
              ? reactExports.createElement(
                  "span",
                  {
                    className: "hl-mention-folder-icon",
                    "aria-hidden": true,
                  },
                  reactExports.createElement(Folder, {
                    className: "w-[13px] h-[13px] text-muted-foreground",
                  }),
                )
              : null,
    prefix,
    assetTypeLabel
      ? reactExports.createElement(
          "span",
          {
            className: "hl-mention-asset-type",
            "aria-hidden": true,
          },
          assetTypeLabel,
        )
      : null,
    // Model chips keep a bare text child so their 4px flex gap rhythm stays
    // intact; every `.hl-mention-file` chip wraps the name for span-level
    // ellipsis (the chip itself is a flex row since the ext span is pinned).
    attrs.kind === "model"
      ? displayStem
      : reactExports.createElement(
          "span",
          {
            className: "hl-mention-name",
          },
          displayStem,
        ),
    displayExt
      ? reactExports.createElement(
          "span",
          {
            className: "hl-mention-file-ext",
          },
          displayExt,
        )
      : null,
    suffix,
    reactExports.createElement(
      "button",
      {
        type: "button",
        contentEditable: false,
        "aria-label": instance.t("mention.popover.removeReference", {
          defaultValue: "Remove",
        }),
        "data-action-ui-id": "popover.agent-reference-remove",
        className: "hl-mention-remove",
        onMouseDown: (event) => {
          event.preventDefault();
          event.stopPropagation();
        },
        onClick: (event) => {
          event.preventDefault();
          event.stopPropagation();
          deleteNode2();
        },
      },
      reactExports.createElement(X$7, {
        size: 9,
        strokeWidth: 2.2,
        "aria-hidden": true,
      }),
    ),
  );
  const body2 =
    isAsset && assetEntityId
      ? reactExports.createElement(
          PreviewCard$1,
          null,
          reactExports.createElement(PreviewCardTrigger, {
            render: chipBody,
          }),
          reactExports.createElement(
            PreviewCardContent,
            {
              side: "top",
              sideOffset: 8,
            },
            reactExports.createElement(EntityHoverCardBody, {
              entityId: assetEntityId,
            }),
          ),
        )
      : chipBody;
  return reactExports.createElement(
    NodeViewWrapper,
    {
      as: "span",
      className:
        attrs.kind === "connector"
          ? "inline-flex align-middle leading-none"
          : "inline-flex align-baseline leading-[var(--text-body-14--line-height)]",
    },
    body2,
  );
}
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
export function folderBaseName(absPath) {
  const normalized = absPath.replace(/[/\\]+$/, "");
  const segment = normalized.split(/[/\\]/).pop();
  return segment && segment.length > 0 ? segment : normalized;
}
export function useComposerPlaceholderActions({
  sendInFlightRef,
  interactionLocked,
  enableSlashCommands,
  slashOpen,
  mentionOpen,
  editor,
  openSlash,
  closeSlash,
  closeMention,
  openMention,
}) {
  const slashOpenRef = reactExports.useRef(slashOpen);
  slashOpenRef.current = slashOpen;
  const mentionOpenRef = reactExports.useRef(mentionOpen);
  mentionOpenRef.current = mentionOpen;
  const triggerSlash = reactExports.useCallback(() => {
    if (!enableSlashCommands || sendInFlightRef.current || interactionLocked) return;
    if (mentionOpenRef.current) closeMention();
    if (slashOpenRef.current) {
      closeSlash();
      editor?.commands.focus();
      return;
    }
    openSlash();
    editor?.commands.focus();
  }, [
    closeMention,
    closeSlash,
    editor,
    enableSlashCommands,
    interactionLocked,
    openSlash,
    sendInFlightRef,
  ]);
  const triggerMention = reactExports.useCallback(() => {
    if (sendInFlightRef.current || interactionLocked) return;
    if (mentionOpenRef.current) {
      closeMention();
      editor?.commands.focus();
      return;
    }
    if (slashOpenRef.current) closeSlash();
    editor?.commands.focus();
    openMention();
  }, [closeMention, closeSlash, editor, interactionLocked, openMention, sendInFlightRef]);
  return {
    triggerMention,
    triggerSlash,
  };
}
