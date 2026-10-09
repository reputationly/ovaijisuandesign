// mention-ref-chip.js
import {
  classifyFileType,
  instance,
  NodeViewWrapper,
  reactExports,
  Workflow,
  X$7,
} from "../vendor.js";
import {
  FileKindIcon,
  ModelTypeIcon,
} from "./use-composer-placeholder-actions.jsx";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import { Folder } from "../media-editing/package.jsx";
import { splitMentionFilename } from "../infra/dialog-content.jsx";
import {
  PreviewCard$1,
  PreviewCardContent,
  PreviewCardTrigger,
} from "../text-editor/use-placeholder-asset-source.jsx";
import { EntityHoverCardBody } from "../assets/attachment-row.jsx";
import { ConnectorIcon } from "../settings/connector-relationship-graphic.jsx";

export function MentionRefChip({ node: node2, deleteNode: deleteNode2 }) {
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
    !attrs.isFolder &&
    ["image", "video", "audio", "text", "other"].includes(attrs.kind);
  const [failedThumb, setFailedThumb] = reactExports.useState(null);
  const fileThumb =
    attrs.thumbUrl && attrs.thumbUrl !== failedThumb ? attrs.thumbUrl : void 0;
  const isAsset = attrs.kind === "asset";
  const assetTypeLabel =
    isAsset && attrs.entityType
      ? instance.t(`assetCenter.types.${attrs.entityType}`, {
          defaultValue: attrs.entityType,
        })
      : null;
  const assetEntityId =
    isAsset && attrs.path.startsWith("asset:")
      ? attrs.path.slice("asset:".length)
      : null;
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
            : (attrs.kind === "image" ||
                  attrs.kind === "video" ||
                  attrs.kind === "audio") &&
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
