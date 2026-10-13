// markdown-link.jsx
import { API_PATHS, ArrowUpRight, classifyFileType, Copy, Crosshair, ExternalLink, G$1 as codeHighlighterPlugin, Globe, jsxRuntimeExports, reactExports, useCurrentWorkspace, usePlatform, useTranslation, Video, VideoOff } from "../vendor.js";
import { defaultSchema } from "hast-util-sanitize";
import { dedupedToast } from "../infra/agent-http-client.js";
import {
  cleanRaw,
  hasLocalFileLinkProtocol,
  isAbsoluteLocalPath,
  isFileUrl,
  isHttpUrl,
  LOCAL_FILE_LINK_PROTOCOLS,
  looksLikeFileReference,
  redactForCurrentRegion,
} from "./replace-configured-model-names-for-current-region.js";
import { findInlineVisualTokens } from "../text-editor/get-wire-content-text.jsx";
import rehypeSanitize from "rehype-sanitize";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { Icon, openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useChatFileReferenceAction } from "./use-chat-file-reference-action.jsx";
import {
  File$1 as File,
  FileAudio,
  ImageOffOutlineIcon,
  ImageOutlineIcon,
  useAssetMeta,
} from "../media-editing/package.jsx";
import {
  ContextMenu,
  workspaceEvents,
} from "../workspace/topbar-state-context.jsx";
import { Button, cn$2 as cn } from "../infra/dialog-content.jsx";
import { openUrlInBuiltinBrowser } from "../workspace/resolve-retry-message-payload.jsx";
import { resolveTrackingDomain } from "../i18n/canvas-node-tools.jsx";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../workspace/context-menu-content.jsx";
import { InlineColorValue } from "./use-mention-models.jsx";
import { SkillIcon } from "../workspace/use-prompt-icon.jsx";
import { useAssets } from "../settings/use-assets.js";
import { resolveChatFileReference } from "./resolve-chat-file-reference.js";
import { cleanPath } from "../media-editing/wt.js";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import {
  useResolveMediaUrl,
  withThumbnail,
} from "../workspace/tool-label-definitions.js";
import { DeferredThumbnailImage } from "../workspace/deferred-thumbnail-image-generation.jsx";
import { detectFileType } from "../canvas/diagnostic-history-tools.js";
import { gatewayUrl } from "../infra/gateway-http-error.jsx";
import { MediaLightbox } from "../assets/text-preview.jsx";
import {
  findAssetForPath,
  toWorkspaceRelativePath,
} from "../media-editing/parse-workspace-path.js";
import {
  getNodeIdsForAsset,
  useHasAssetOnCanvas,
} from "../infra/use-canvas-node-assets-store.js";
import { PlaybackPlayIcon } from "../workspace/home-service.jsx";
import { useMediaActions } from "../settings/use-media-actions.js";
import {
  canWriteResourceDragData,
  writeResourceDragData,
} from "./use-astra-send-gate.js";
import { joinFilePath } from "../assets/use-file-explorer-canvas-integration.js";
import { MarkdownAudio } from "../media-editing/markdown-audio.jsx";
import {
  CodeBlock as HighlightedCodeBlock,
  CodeBlockContainer,
  CodeBlockCopyButton,
  CodeBlockHeader,
  Streamdown,
  useIsCodeFenceIncomplete as useIsIncompleteCode,
} from "streamdown";
function resolveMediaUrl(relativeUrl) {
  if (!relativeUrl) return void 0;
  if (/^https?:\/\//.test(relativeUrl)) return relativeUrl;
  return gatewayUrl(relativeUrl);
}
function joinMetadata(parts) {
  return parts.filter(Boolean).join(" · ");
}
function basename(src) {
  const path = cleanPath(src);
  return path.split(/[\\/]/).pop() || "";
}
function getMediaExtension(src) {
  const fileName = basename(src);
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot + 1).toUpperCase() : "";
}
function getDisplayName(originalSrc, resolvedSrc, alt, asset) {
  if (asset?.name) return asset.name;
  return basename(originalSrc) || basename(resolvedSrc) || alt || "media";
}
function extractFilePath(src) {
  let filePath = src;
  if (/^file:\/\//i.test(filePath)) {
    return filePath.replace(/^file:\/\//i, "");
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(filePath)) {
    filePath = filePath.replace(/^[a-z][a-z0-9+.-]*:/, "");
    filePath = filePath.replace(/^file:\/\//, "");
  }
  return filePath;
}
function rewriteImgSrc(src, workspaceDir, resolveUrl = resolveMediaUrl) {
  if (!src) return src;
  if (/^https?:\/\//.test(src)) return src;
  const filePath = extractFilePath(src);
  const ofMatch = filePath.match(/output_files\/(.+)$/);
  if (ofMatch) return resolveUrl(`/files/${ofMatch[1]}`);
  if (filePath.startsWith("/files/")) return resolveUrl(filePath);
  if (filePath.startsWith("/")) {
    if (workspaceDir) {
      const base = workspaceDir.endsWith("/")
        ? workspaceDir
        : `${workspaceDir}/`;
      if (filePath.startsWith(base)) {
        return resolveUrl(`/files/${filePath.slice(base.length)}`);
      }
    }
    const fileName = filePath.split("/").pop();
    return fileName ? resolveUrl(`/files/${fileName}`) : src;
  }
  const cleaned = filePath.replace(/^\.\//, "");
  return resolveUrl(`/files/${cleaned}`);
}
const FILE_REFERENCE_CODE_BLOCK_LANGUAGES = new Set([
  "",
  "text",
  "plaintext",
  "txt",
]);
const CODE_BLOCK_LANGUAGE_PATTERN = /language-([^\s]+)/;
function MarkdownSpan(props) {
  const {
    children,
    node: _node,
    dataInlineVisual,
    dataColorValue,
    "data-inline-visual": dataInlineVisualAttribute,
    "data-color-value": dataColorValueAttribute,
    ...domProps
  } = props;
  const visualType = dataInlineVisual ?? dataInlineVisualAttribute;
  const colorValue = dataColorValue ?? dataColorValueAttribute;
  if (visualType === "color" && colorValue) {
    return <InlineColorValue value={colorValue}>{children}</InlineColorValue>;
  }
  return <span {...domProps}>{children}</span>;
}
function codeBlockLanguage(className) {
  return (
    className?.match(CODE_BLOCK_LANGUAGE_PATTERN)?.[1]?.toLowerCase() ?? ""
  );
}
function hasStringChildren(value) {
  if (!reactExports.isValidElement(value)) return false;
  const props = value.props;
  return typeof props.children === "string";
}
function codeBlockContent(children) {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (hasStringChildren(children)) return children.props.children;
  return "";
}
const stablePlugins = {
  code: codeHighlighterPlugin,
};
const CANVAS_NODE_ID_PATTERN = "[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}";
const CANVAS_NODE_REFERENCE_PATTERN =
  /(?:画布节点|canvas\s+node)\s*ID\s*[：:]\s*`([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})`/gi;
const TITLED_CANVAS_NODE_REFERENCE_PATTERN = new RegExp(
  `(?:\\*\\*)?(《[^\\r\\n\`]+》)(?:\\*\\*)?[\\t ]*(?:\\r?\\n|<br\\s*\\/?>)+[\\t ]*(?:画布节点|canvas\\s+node)\\s*ID\\s*[：:]\\s*\`(${CANVAS_NODE_ID_PATTERN})\``,
  "gi",
);
const LIST_CANVAS_NODE_REFERENCE_PATTERN = new RegExp(
  `^([\\t ]*(?:[-+*]|\\d+[.)])[\\t ]+)(?:\\*\\*)?([^\\r\\n\`]+?)[：:](?:\\*\\*)?[\\t ]*(?:\\r?\\n[\\t ]+)?\`(${CANVAS_NODE_ID_PATTERN})\`[\\t ]*$`,
  "gim",
);
const LIST_NAMED_CANVAS_NODE_REFERENCE_PATTERN = new RegExp(
  `^([\\t ]*(?:[-+*]|\\d+[.)])[\\t ]+)((?:\\*\\*)?[^\\r\\n\`]{0,40}?(?:节点|node)(?:\\*\\*)?[\\t ]*[：:][\\t ]*)\`([^\\r\\n\`]+)\`[\\t ]*[（(][\\t ]*node[\\t ]*id[\\t ]*[：:][\\t ]*\`(${CANVAS_NODE_ID_PATTERN})\`[\\t ]*[）)][\\t ]*$`,
  "gimu",
);
const NAMED_INLINE_CANVAS_NODE_REFERENCE_PATTERN = new RegExp(
  `(?:\\*\\*)?([^，。；;：:\\r\\n\`]{1,40}?(?:节点|node))(?:\\*\\*)?[\\t ]*[：:][\\t ]*\`(${CANVAS_NODE_ID_PATTERN})\``,
  "giu",
);
const MARKDOWN_LINE_PATTERN = /.*(?:\r\n|\n|\r|$)/g;
const FENCE_OPEN_PATTERN = /^[\t ]{0,3}(`{3,}|~{3,})/;
const INDENTED_CODE_LINE_PATTERN = /^(?: {4}|\t)/;
const NON_ARTIFACT_IDENTIFIER_LABEL_PATTERN =
  /(?:(?:^|[\s_：:-])(?:id|uuid|identifier)|(?:ID|UUID|Id)|(?:标识|标识符))$/u;
const INTERNAL_TOKEN_PREFIX = "canvas-node-reference:";
const INTERNAL_TOKEN_SUFFIX = "";
const TECHNICAL_CANVAS_NODE_LABELS = new Set([
  "canvasnode",
  "canvasnodeid",
  "node",
  "nodeid",
  "画布节点",
  "画布节点id",
  "节点",
  "节点id",
]);
const EMPTY_CANVAS_NODE_REFERENCES = new Map();
function withoutLineEnding(line) {
  return line.replace(/(?:\r\n|\n|\r)$/, "");
}
function openingFence(line) {
  const marker = withoutLineEnding(line).match(FENCE_OPEN_PATTERN)?.[1];
  if (!marker) return void 0;
  const character = marker[0];
  if (character !== "`" && character !== "~") return void 0;
  return {
    character,
    length: marker.length,
  };
}
function closesFence(line, fence) {
  const content = withoutLineEnding(line);
  const indentLength = content.match(/^[\t ]{0,3}/)?.[0].length ?? 0;
  const marker = content.slice(indentLength).trimEnd();
  return (
    marker.length >= fence.length &&
    [...marker].every((character) => character === fence.character)
  );
}
function isIndentedCodeLine(line) {
  return INDENTED_CODE_LINE_PATTERN.test(withoutLineEnding(line));
}
function isBlankLine(line) {
  return withoutLineEnding(line).trim().length === 0;
}
function canvasNodeDisplayName(candidate) {
  const displayName = candidate?.trim();
  if (!displayName) return void 0;
  const plainDisplayName = displayName.replace(/^\*\*|\*\*$/g, "").trim();
  const normalized = plainDisplayName
    .replace(/[\s_：:-]+/g, "")
    .toLocaleLowerCase();
  if (TECHNICAL_CANVAS_NODE_LABELS.has(normalized)) return void 0;
  if (NON_ARTIFACT_IDENTIFIER_LABEL_PATTERN.test(plainDisplayName))
    return void 0;
  if (new RegExp(`^${CANVAS_NODE_ID_PATTERN}$`, "i").test(plainDisplayName))
    return void 0;
  return plainDisplayName;
}
function isStandaloneMatch(source, offset, matchLength) {
  const lineStart = source.lastIndexOf("\n", offset - 1) + 1;
  const nextLineBreak = source.indexOf("\n", offset + matchLength);
  const lineEnd = nextLineBreak === -1 ? source.length : nextLineBreak;
  return (
    source.slice(lineStart, offset).trim().length === 0 &&
    source.slice(offset + matchLength, lineEnd).trim().length === 0
  );
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function internalTokenPrefix(content) {
  let prefix = INTERNAL_TOKEN_PREFIX;
  while (content.includes(prefix)) prefix += ":";
  return prefix;
}
function registerCanvasNodeReference(references, nodeId, candidateDisplayName) {
  const fallbackDisplayName = canvasNodeDisplayName(candidateDisplayName);
  const current = references.get(nodeId);
  if (current?.fallbackDisplayName || (current && !fallbackDisplayName))
    return;
  references.set(
    nodeId,
    fallbackDisplayName
      ? {
          fallbackDisplayName,
        }
      : {},
  );
}
function transformOutsideCodeBlocks(content, transform) {
  const lines = content.match(MARKDOWN_LINE_PATTERN) ?? [];
  if (lines.at(-1) === "") lines.pop();
  let output = "";
  let textSegment = "";
  let fence;
  let inIndentedCode = false;
  for (const line of lines) {
    if (fence) {
      output += line;
      if (closesFence(line, fence)) fence = void 0;
      continue;
    }
    if (inIndentedCode) {
      if (isIndentedCodeLine(line) || isBlankLine(line)) {
        output += line;
        continue;
      }
      inIndentedCode = false;
    }
    if (isIndentedCodeLine(line)) {
      output += transform(textSegment);
      textSegment = "";
      output += line;
      inIndentedCode = true;
      continue;
    }
    const nextFence = openingFence(line);
    if (nextFence) {
      output += transform(textSegment);
      textSegment = "";
      output += line;
      fence = nextFence;
      continue;
    }
    textSegment += line;
  }
  return output + transform(textSegment);
}
function prepareCanvasNodeReferences(content) {
  const references = new Map();
  const tokens = [];
  const renderedStandaloneNodeIds = new Set();
  const tokenPrefix = internalTokenPrefix(content);
  const tokenPattern = new RegExp(
    `${escapeRegExp(tokenPrefix)}(\\d+)${escapeRegExp(INTERNAL_TOKEN_SUFFIX)}`,
    "gu",
  );
  const createToken = (
    nodeId,
    replacement,
    fallbackDisplayName,
    deduplicateStandalone = false,
  ) => {
    const tokenIndex =
      tokens.push({
        nodeId,
        replacement,
        fallbackDisplayName,
        deduplicateStandalone,
      }) - 1;
    return `${tokenPrefix}${tokenIndex}${INTERNAL_TOKEN_SUFFIX}`;
  };
  const preparedContent = transformOutsideCodeBlocks(content, (segment) => {
    const titledSegment = segment.replace(
      TITLED_CANVAS_NODE_REFERENCE_PATTERN,
      (_match, documentName, nodeId) => {
        return createToken(nodeId, `\`${nodeId}\``, documentName, true);
      },
    );
    const listSegment = titledSegment.replace(
      LIST_CANVAS_NODE_REFERENCE_PATTERN,
      (match, listMarker, nodeName, nodeId) => {
        const fallbackDisplayName = canvasNodeDisplayName(nodeName);
        if (!fallbackDisplayName) return match;
        return createToken(
          nodeId,
          `${listMarker}\`${nodeId}\``,
          fallbackDisplayName,
          true,
        );
      },
    );
    const inlineSegment = listSegment.replace(
      NAMED_INLINE_CANVAS_NODE_REFERENCE_PATTERN,
      (match, nodeName, nodeId, offset, source) => {
        const standalone = isStandaloneMatch(source, offset, match.length);
        return createToken(
          nodeId,
          standalone ? `\`${nodeId}\`` : match,
          nodeName,
          standalone,
        );
      },
    );
    const transformedSegment = inlineSegment.replace(
      LIST_NAMED_CANVAS_NODE_REFERENCE_PATTERN,
      (_match, listMarker, nodeLabel, nodeName, nodeId) => {
        return createToken(
          nodeId,
          `${listMarker}${nodeLabel}\`${nodeId}\``,
          nodeName,
          true,
        );
      },
    );
    const tokenizedSegment = transformedSegment.replace(
      CANVAS_NODE_REFERENCE_PATTERN,
      (match, nodeId, offset, source) =>
        createToken(
          nodeId,
          `\`${nodeId}\``,
          void 0,
          isStandaloneMatch(source, offset, match.length),
        ),
    );
    return tokenizedSegment.replace(tokenPattern, (_match, rawIndex) => {
      const token = tokens[Number(rawIndex)];
      if (!token) return "";
      registerCanvasNodeReference(
        references,
        token.nodeId,
        token.fallbackDisplayName,
      );
      if (!token.deduplicateStandalone) return token.replacement;
      if (renderedStandaloneNodeIds.has(token.nodeId)) return "";
      renderedStandaloneNodeIds.add(token.nodeId);
      return token.replacement;
    });
  });
  return {
    content: preparedContent,
    references: references.size > 0 ? references : EMPTY_CANVAS_NODE_REFERENCES,
  };
}
const CODE_FRAGMENT_PATTERN = /[`"={}<>;|]/;
const CODE_KEYWORD_PATTERN =
  /^(?:const|let|var|import|export|return|if|for|while|function|class|type|interface|enum|await|async)\b/;
function isStandaloneChatFileReferenceText(raw) {
  const value = cleanRaw(raw);
  if (!looksLikeFileReference(value)) return false;
  if (isHttpUrl(value) || isFileUrl(value) || isAbsoluteLocalPath(value))
    return true;
  if (value.startsWith("/files/") || value.includes("output_files/"))
    return true;
  if (CODE_KEYWORD_PATTERN.test(value)) return false;
  if (CODE_FRAGMENT_PATTERN.test(value)) return false;
  return true;
}
function MarkdownMediaCard({
  kind,
  originalSrc,
  resolvedSrc,
  alt,
  metadata,
  children,
  onPreview,
  unavailable = false,
}) {
  const { t: translate } = useTranslation();
  const workspaceId = useCurrentWorkspace();
  const relativePath = reactExports.useMemo(
    () => toWorkspaceRelativePath(originalSrc, resolvedSrc),
    [originalSrc, resolvedSrc],
  );
  const { assets } = useAssets({
    enabled: Boolean(relativePath),
  });
  const asset = reactExports.useMemo(
    () => findAssetForPath(assets, relativePath),
    [assets, relativePath],
  );
  const hasCanvasNode = useHasAssetOnCanvas(asset?.id, workspaceId);
  const fileName = getDisplayName(originalSrc, resolvedSrc, alt, asset);
  const dragSource = reactExports.useMemo(
    () => ({
      relativePath,
      workspacePath: workspaceId,
      name: fileName,
      assetId: asset?.id,
    }),
    [asset?.id, fileName, relativePath, workspaceId],
  );
  const canDrag = canWriteResourceDragData(dragSource);
  const locateTitle = translate("assetPreview.locateOnCanvas", {
    defaultValue: "Locate on canvas",
  });
  const previewTitle = translate("common.expand");
  const copyTitle = translate("common.copy");
  const { copyFile, copyImage, copyPath, isLocalPath } = useMediaActions();
  const copySource = reactExports.useMemo(() => {
    const src = resolvedSrc ?? originalSrc;
    if (kind === "video" && relativePath && workspaceId) {
      return joinFilePath(workspaceId, relativePath);
    }
    return src;
  }, [kind, originalSrc, relativePath, resolvedSrc, workspaceId]);
  const handleLocate = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      if (!asset?.id) return;
      const nodeIds = getNodeIdsForAsset(asset.id, workspaceId);
      if (nodeIds.length === 0) return;
      workspaceEvents.fireCanvasFocus(workspaceId, nodeIds);
    },
    [asset?.id, workspaceId],
  );
  const handlePreview = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      if (!unavailable) onPreview();
    },
    [onPreview, unavailable],
  );
  const handleCopy = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      if (!copySource) return;
      if (kind === "image") {
        copyImage(copySource);
      } else if (isLocalPath(copySource)) {
        copyFile(copySource);
      } else {
        copyPath(copySource);
      }
    },
    [copyFile, copyImage, copyPath, copySource, isLocalPath, kind],
  );
  const handleDragStart = reactExports.useCallback(
    (event) => {
      if (!writeResourceDragData(event, dragSource)) event.preventDefault();
    },
    [dragSource],
  );
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: native drag source keeps existing preview controls intact
    <span
      data-slot="markdown-media-card"
      data-media-kind={kind}
      className={cn(
        "group/markdown-media relative my-2 grid min-h-[88px] grid-cols-[96px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-border bg-card p-2.5 align-middle",
        canDrag && "cursor-grab active:cursor-grabbing",
      )}
      style={{
        width: "min(100%, clamp(360px, 72%, 420px))",
      }}
      draggable={canDrag}
      onDragStart={handleDragStart}
    >
      <button
        type="button"
        className="relative flex h-16 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-border bg-muted p-0 text-muted-foreground"
        onClick={handlePreview}
        aria-label={previewTitle}
        disabled={unavailable}
      >
        {children}
        {kind === "video" && !unavailable && (
          <span className="absolute inset-0 grid place-items-center bg-[var(--media-overlay-surface)] text-[var(--media-overlay-foreground)]">
            <span className="grid size-7 place-items-center">
              <PlaybackPlayIcon size={16} className="drop-shadow-sm" />
            </span>
          </span>
        )}
      </button>
      <span className="flex min-w-0 flex-col gap-3">
        <span
          className="truncate text-sm font-medium leading-tight text-foreground"
          title={fileName}
        >
          {fileName}
        </span>
        <span
          className="truncate text-xs leading-none text-muted-foreground"
          title={metadata}
        >
          {metadata}
        </span>
      </span>
      <span className="pointer-events-none absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover/markdown-media:opacity-100 group-focus-within/markdown-media:opacity-100">
        {hasCanvasNode && (
          <button
            type="button"
            className="pointer-events-auto inline-flex size-7 cursor-pointer items-center justify-center rounded-sm border border-border bg-background/90 text-muted-foreground shadow-sm hover:text-foreground"
            title={locateTitle}
            aria-label={locateTitle}
            onClick={handleLocate}
          >
            <Crosshair size={14} strokeWidth={1.5} />
          </button>
        )}
        <button
          type="button"
          className="pointer-events-auto inline-flex size-7 cursor-pointer items-center justify-center rounded-sm border border-border bg-background/90 text-muted-foreground shadow-sm hover:text-foreground disabled:cursor-default disabled:opacity-50"
          title={copyTitle}
          aria-label={copyTitle}
          onClick={handleCopy}
          disabled={!copySource}
        >
          <Copy size={14} strokeWidth={1.5} />
        </button>
      </span>
    </span>
  );
}
function MediaUnavailable({ kind }) {
  const { t: translate } = useTranslation();
  const label =
    kind === "image"
      ? translate("chat.failedToLoadImage", {
          defaultValue: "Failed to load image",
        })
      : translate("chat.failedToLoadVideo", {
          defaultValue: "Failed to load video",
        });
  const FailIcon = kind === "image" ? ImageOffOutlineIcon : VideoOff;
  return (
    <span className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      <FailIcon size={20} strokeWidth={1.5} className="opacity-60" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds == null || seconds < 0) return "";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;
  if (hours > 0)
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
function videoThumbnailUrl(relativePath, resolveUrl) {
  if (!relativePath) return void 0;
  return withThumbnail(resolveUrl(API_PATHS.thumbnail(relativePath)), 112);
}
function ImageLightbox({ src, alt, onClose }) {
  return <MediaLightbox kind="image" src={src} alt={alt} onClose={onClose} />;
}
const { src: _srcProto, ...restProtocols } = defaultSchema.protocols ?? {};
const sanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...restProtocols,
    href: [...(restProtocols.href ?? []), ...LOCAL_FILE_LINK_PROTOCOLS],
  },
  attributes: {
    ...defaultSchema.attributes,
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      "dataInlineVisual",
      "dataColorValue",
      "data-inline-visual",
      "data-color-value",
    ],
  },
};
function urlTransform(url) {
  if (/^javascript:/i.test(url.trim())) return "";
  return url;
}
function encodeMarkdownUrlSpaces(markdown) {
  return markdown.replace(
    /(!?\[[^\]]*\]\()([^)]*\s[^)]*)\)/g,
    (_match, prefix, url) => `${prefix}${url.replace(/ /g, "%20")})`,
  );
}
function MarkdownImage({ src, alt, ...rest }) {
  const workspace = useCurrentWorkspace();
  const resolveMediaUrl = useResolveMediaUrl();
  const [fullSize, setFullSize] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(false);
  const [dimensions, setDimensions] = reactExports.useState("");
  const resolvedSrc = rewriteImgSrc(src, workspace, resolveMediaUrl);
  const thumbSrc = withThumbnail(resolvedSrc, 260);
  const extension = getMediaExtension(src ?? resolvedSrc);
  const metadata = joinMetadata([extension, dimensions]);
  const handleClick = reactExports.useCallback(() => {
    if (resolvedSrc && !error) setFullSize(true);
  }, [resolvedSrc, error]);
  const handleLoad = reactExports.useCallback((event) => {
    const img = event.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setDimensions(`${img.naturalWidth} x ${img.naturalHeight}`);
    }
  }, []);
  const handleError = reactExports.useCallback(() => {
    setError(true);
  }, []);
  return (
    <>
      <MarkdownMediaCard
        kind="image"
        originalSrc={src}
        resolvedSrc={resolvedSrc}
        alt={alt}
        metadata={metadata || extension || "IMAGE"}
        onPreview={handleClick}
        unavailable={error || !resolvedSrc}
      >
        {error || !resolvedSrc ? (
          <MediaUnavailable kind="image" />
        ) : (
          <img
            {...rest}
            src={thumbSrc}
            alt={alt}
            className="h-full w-full object-cover transition-opacity group-hover/markdown-media:opacity-90"
            onLoad={handleLoad}
            onError={handleError}
          />
        )}
      </MarkdownMediaCard>
      {fullSize && resolvedSrc && (
        <ImageLightbox
          src={resolvedSrc}
          alt={alt ?? ""}
          onClose={() => setFullSize(false)}
        />
      )}
    </>
  );
}
function FileReferenceVisual({ filename, workspacePath }) {
  const resolveMediaUrl = useResolveMediaUrl();
  const type = detectFileType(filename);
  const safePath =
    workspacePath &&
    !/^(?:[\\/]|[a-z][a-z0-9+.-]*:)/i.test(workspacePath) &&
    !workspacePath.split(/[\\/]/).includes("..")
      ? workspacePath
      : void 0;
  const previewUrl =
    safePath && (type === "image" || type === "video")
      ? withThumbnail(
          resolveMediaUrl(
            type === "video"
              ? API_PATHS.thumbnail(safePath)
              : API_PATHS.serveFile(safePath),
          ),
          14,
          {
            format: "webp",
            fallback: "error",
          },
        )
      : void 0;
  const [failedUrl, setFailedUrl] = reactExports.useState();
  const [loadedUrl, setLoadedUrl] = reactExports.useState();
  if (type !== "image" && type !== "video" && type !== "audio") {
    return (
      <FileTypeIcon
        {...classifyFileType({
          filename,
        })}
        size={14}
        decorative={true}
      />
    );
  }
  const MediaIcon =
    type === "image"
      ? ImageOutlineIcon
      : type === "video"
        ? Video
        : FileAudio;
  const showThumbnail = previewUrl && failedUrl !== previewUrl;
  return (
    <span
      className="relative inline-flex size-3.5 shrink-0 items-center justify-center text-muted-foreground"
      data-media-kind={type}
      aria-hidden="true"
    >
      {(!showThumbnail || loadedUrl !== previewUrl) && (
        <MediaIcon className="size-3.5" strokeWidth={1.5} />
      )}
      {showThumbnail && (
        <DeferredThumbnailImage
          src={previewUrl}
          alt=""
          draggable={false}
          maxRetries={2}
          className={`absolute inset-0 size-full rounded-[2px] object-cover ${loadedUrl === previewUrl ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoadedUrl(previewUrl)}
          onFailure={() => setFailedUrl(previewUrl)}
        />
      )}
    </span>
  );
}
function tryParseSkillCard(raw) {
  try {
    const data = JSON.parse(raw);
    if (typeof data.name !== "string") return null;
    return {
      name: data.name,
      guidePrompt:
        typeof data.guidePrompt === "string" ? data.guidePrompt : void 0,
    };
  } catch {
    return null;
  }
}
function InlineSkillCard({ content }) {
  const { t: translate } = useTranslation();
  const data = reactExports.useMemo(
    () => tryParseSkillCard(content),
    [content],
  );
  const handleTry = reactExports.useCallback(() => {
    if (!data) return;
    const skill = {
      name: data.name,
      guidePrompt: data.guidePrompt ?? "",
    };
    workspaceEvents.fireAddSkillToChat(skill);
  }, [data]);
  if (!data) return null;
  return (
    <div className="not-prose my-2 flex items-center gap-3 rounded-lg border border-border bg-muted px-3 py-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <SkillIcon
          size={16}
          strokeWidth={1.5}
          className="text-muted-foreground shrink-0"
        />
        <span className="text-sm font-medium truncate">{data.name}</span>
        <span className="text-xs text-muted-foreground">
          {translate("skills.skillLabel", "Skill")}
        </span>
      </div>
      <Button
        size="sm"
        data-action-ui-id="inline-skill-card-try"
        className="shrink-0 text-xs h-7"
        onClick={handleTry}
      >
        {translate("skills.trySkill", "开始使用")}
      </Button>
    </div>
  );
}
const MARKDOWN_LINK_RE = /\[([^\]\n]*)\]\(([^)\n]+)\)/g;
const INLINE_CODE_RE = /`([^`\n]+)`/g;
const AUTOLINK_RE = /<([^>\n]+)>/g;
const REFERENCE_DEFINITION_RE = /^\s*\[([^\]\n]+)\]:\s*(\S+).*$/gim;
const PATH_TOKEN_RE = /[^\s`<>(){}"']+/g;
const INTERNAL_ROOT_RE =
  /(?:^|\/)\.(?:opencode-v2|config-v2)\/(?:knowledge|contracts|workflows)\//i;
const INTERNAL_DIR_PLACEHOLDER_RE =
  /^<(?:knowledge|contracts|workflows)Dir>\//i;
const INTERNAL_RELATIVE_ROOT_RE = /^(?:knowledge|contracts|workflows)\//i;
const INTERNAL_VENDOR_CARD_RE =
  /^vendors\/[a-z0-9][a-z0-9._-]*\.md(?:[?#][^\s]*)?(?:[.,;:!?，。；：！？])?$/i;
const WORKFLOW_ENTRY_RE = /^[^/]+\/workflow\.md(?:[?#].*)?$/i;
function normalizeReference(value) {
  const trimmed = value.trim().replace(/^['"]+|['"]+$/g, "");
  try {
    return decodeURIComponent(trimmed).replace(/\\/g, "/");
  } catch {
    return trimmed.replace(/\\/g, "/");
  }
}
function isInternalKnowledgeReference(value) {
  const normalized = normalizeReference(value);
  return (
    INTERNAL_ROOT_RE.test(normalized) ||
    INTERNAL_DIR_PLACEHOLDER_RE.test(normalized) ||
    INTERNAL_RELATIVE_ROOT_RE.test(normalized) ||
    INTERNAL_VENDOR_CARD_RE.test(normalized) ||
    WORKFLOW_ENTRY_RE.test(normalized)
  );
}
function neutralLabel(value, labels) {
  return /(?:^|\/)workflow\.md(?:[?#].*)?$/i.test(normalizeReference(value))
    ? labels.workflow
    : labels.material;
}
function redactInternalKnowledgeReferences(content, labels) {
  const internalDefinitions = new Map();
  const withoutDefinitions = content.replace(
    REFERENCE_DEFINITION_RE,
    (match, internalReferenceId, target) => {
      if (!isInternalKnowledgeReference(target)) return match;
      internalDefinitions.set(internalReferenceId.trim().toLowerCase(), target);
      return "";
    },
  );
  let withoutInternalLinks = withoutDefinitions;
  for (const [referenceId, target] of internalDefinitions) {
    const escapedId = referenceId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    withoutInternalLinks = withoutInternalLinks.replace(
      new RegExp(`\\[([^\\]\\n]*)\\]\\[${escapedId}\\]`, "gi"),
      neutralLabel(target, labels),
    );
  }
  withoutInternalLinks = withoutInternalLinks.replace(
    MARKDOWN_LINK_RE,
    (match, _label, target) =>
      isInternalKnowledgeReference(target)
        ? neutralLabel(target, labels)
        : match,
  );
  withoutInternalLinks = withoutInternalLinks.replace(
    AUTOLINK_RE,
    (match, target) =>
      isInternalKnowledgeReference(target)
        ? neutralLabel(target, labels)
        : match,
  );
  withoutInternalLinks = withoutInternalLinks.replace(
    INLINE_CODE_RE,
    (match, target) =>
      isInternalKnowledgeReference(target)
        ? neutralLabel(target, labels)
        : match,
  );
  return withoutInternalLinks.replace(PATH_TOKEN_RE, (token) =>
    isInternalKnowledgeReference(token)
      ? neutralLabel(token, labels)
      : token,
  );
}
function isWebLink(href) {
  if (!href) return false;
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
function trackChatLinkAction(properties) {
  trackEvent(TRACK_EVENTS.CHAT_LINK_ACTION, {
    ...properties,
  });
}
function MarkdownLink({
  href,
  children,
  className,
  node: _node,
  ...rest
}) {
  const { t: translate } = useTranslation();
  const platform = usePlatform();
  const fileReferenceAction = useChatFileReferenceAction(href ?? "");
  const isNonClickableFileReference =
    (fileReferenceAction.ref.kind !== "none" ||
      hasLocalFileLinkProtocol(href ?? "")) &&
    !fileReferenceAction.clickable;
  const isLocalFile =
    fileReferenceAction.clickable &&
    (fileReferenceAction.ref.kind === "external-local" ||
      fileReferenceAction.ref.kind === "workspace-internal");
  const isBrowserLink = isWebLink(href);
  const targetDomain = resolveTrackingDomain(href ?? "") ?? "unknown";
  const handleClick = reactExports.useCallback(
    (event) => {
      if (!href) return;
      if (isBrowserLink) {
        event.preventDefault();
        void openUrlInBuiltinBrowser(platform, href, {
          source: "chat.markdown-link",
        })
          .then((opened) => {
            trackChatLinkAction({
              action: "open_builtin",
              trigger: "direct_click",
              target_domain: targetDomain,
              result: opened ? "accepted" : "failed",
            });
          })
          .catch(() => {
            trackChatLinkAction({
              action: "open_builtin",
              trigger: "direct_click",
              target_domain: targetDomain,
              result: "failed",
            });
          });
        return;
      }
      if (fileReferenceAction.clickable) {
        fileReferenceAction.handleClick(event);
        return;
      }
      event.preventDefault();
      void openUrlInBuiltinBrowser(platform, href, {
        source: "chat.markdown-link",
      });
    },
    [
      fileReferenceAction.clickable,
      fileReferenceAction.handleClick,
      href,
      isBrowserLink,
      platform,
      targetDomain,
    ],
  );
  const handleOpenBuiltin = reactExports.useCallback(() => {
    if (!href) return;
    void openUrlInBuiltinBrowser(platform, href, {
      source: "chat.markdown-link.context-menu.builtin",
    })
      .then((opened) => {
        trackChatLinkAction({
          action: "open_builtin",
          trigger: "context_menu",
          target_domain: targetDomain,
          result: opened ? "accepted" : "failed",
        });
      })
      .catch(() => {
        trackChatLinkAction({
          action: "open_builtin",
          trigger: "context_menu",
          target_domain: targetDomain,
          result: "failed",
        });
      });
  }, [href, platform, targetDomain]);
  const handleOpenExternal = reactExports.useCallback(async () => {
    if (!href) return;
    const opened = await openExternalUrl(platform, href, {
      source: "chat.markdown-link.context-menu.external",
    });
    trackChatLinkAction({
      action: "open_external",
      trigger: "context_menu",
      target_domain: targetDomain,
      result: opened ? "accepted" : "failed",
    });
    if (!opened) dedupedToast.error(translate("workspace.browser.openExternalError"));
  }, [href, platform, translate, targetDomain]);
  const handleCopyLink = reactExports.useCallback(async () => {
    if (!href) return;
    try {
      await platform.clipboard.writeText(href);
      trackChatLinkAction({
        action: "copy",
        trigger: "context_menu",
        target_domain: targetDomain,
        result: "accepted",
      });
      dedupedToast.success(translate("chat.copied"));
    } catch {
      trackChatLinkAction({
        action: "copy",
        trigger: "context_menu",
        target_domain: targetDomain,
        result: "failed",
      });
      dedupedToast.error(translate("common.copyFailed"));
    }
  }, [href, platform.clipboard, translate, targetDomain]);
  if (isNonClickableFileReference) {
    return <span>{children}</span>;
  }
  const link = (
    <a
      {...rest}
      href={href}
      className={cn(
        className,
        isBrowserLink && "chat-browser-link",
        isLocalFile && "chat-local-file-reference",
      )}
      aria-label={
        isLocalFile ? fileReferenceAction.ref.rawPath : rest["aria-label"]
      }
      data-action-ui-id={
        isBrowserLink
          ? "chat-markdown-browser-link"
          : fileReferenceAction.clickable
            ? "chat-file-reference-link"
            : void 0
      }
      onClick={handleClick}
    >
      {isLocalFile ? (
        <code className="chat-inline-code chat-inline-code-file-ref inline-flex items-center gap-1 align-baseline">
          <File
            className="size-3.5 shrink-0 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden={true}
          />
          <span>{fileReferenceAction.ref.displayName}</span>
          <ArrowUpRight
            className="size-3.5 shrink-0 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden={true}
          />
        </code>
      ) : (
        children
      )}
    </a>
  );
  return (
    <>
      {isBrowserLink ? (
        <ContextMenu>
          <ContextMenuTrigger render={link} className="select-text" />
          <ContextMenuContent data-action-ui-id="chat-markdown-link-context-menu">
            <ContextMenuItem
              data-action-ui-id="chat-markdown-link-open-builtin"
              onClick={handleOpenBuiltin}
            >
              <Globe />
              {translate("chat.link.openBuiltin")}
            </ContextMenuItem>
            <ContextMenuItem
              data-action-ui-id="chat-markdown-link-open-external"
              onClick={() => void handleOpenExternal()}
            >
              <ExternalLink />
              {translate("workspace.browser.openExternal")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              data-action-ui-id="chat-markdown-link-copy"
              onClick={() => void handleCopyLink()}
            >
              <Copy />
              {translate("chat.copyUrl")}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ) : (
        link
      )}
      {fileReferenceAction.permissionDialog}
    </>
  );
}
function MarkdownVideo({ src, originalSrc, alt }) {
  const resolveMediaUrl = useResolveMediaUrl();
  const [error, setError] = reactExports.useState(false);
  const [previewOpen, setPreviewOpen] = reactExports.useState(false);
  const [thumbError, setThumbError] = reactExports.useState(false);
  const [duration, setDuration] = reactExports.useState();
  const relativePath = reactExports.useMemo(
    () => toWorkspaceRelativePath(originalSrc, src),
    [originalSrc, src],
  );
  const thumbSrc = reactExports.useMemo(
    () =>
      thumbError ? void 0 : videoThumbnailUrl(relativePath, resolveMediaUrl),
    [relativePath, resolveMediaUrl, thumbError],
  );
  const extension = getMediaExtension(originalSrc ?? src);
  const metadata = joinMetadata([extension, formatDuration(duration)]);
  const handleError = reactExports.useCallback(() => setError(true), []);
  const handleLoadedMetadata = reactExports.useCallback((event) => {
    const next = event.currentTarget.duration;
    if (Number.isFinite(next)) setDuration(next);
  }, []);
  if (error) {
    return (
      <MarkdownMediaCard
        kind="video"
        originalSrc={originalSrc}
        resolvedSrc={src}
        alt={alt}
        metadata={metadata || extension || "VIDEO"}
        onPreview={() => setPreviewOpen(true)}
        unavailable={true}
      >
        <MediaUnavailable kind="video" />
      </MarkdownMediaCard>
    );
  }
  return (
    <>
      <MarkdownMediaCard
        kind="video"
        originalSrc={originalSrc}
        resolvedSrc={src}
        alt={alt}
        metadata={metadata || extension || "VIDEO"}
        onPreview={() => setPreviewOpen(true)}
        unavailable={!src}
      >
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={alt ?? ""}
            className="h-full w-full object-cover"
            onError={() => setThumbError(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-black text-white/70">
            <span className="sr-only">{alt ?? "Video"}</span>
          </span>
        )}
      </MarkdownMediaCard>
      <video
        src={src}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleError}
      />
      {previewOpen && src && (
        <MediaLightbox
          kind="video"
          src={src}
          alt={alt ?? ""}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  );
}
function MarkdownMedia(props) {
  const workspace = useCurrentWorkspace();
  const resolveMediaUrl = useResolveMediaUrl();
  const resolvedSrc = rewriteImgSrc(props.src, workspace, resolveMediaUrl);
  const fileType = props.src ? detectFileType(props.src) : void 0;
  if (fileType === "video") {
    return (
      <MarkdownVideo
        src={resolvedSrc ?? ""}
        originalSrc={props.src}
        alt={props.alt}
      />
    );
  }
  if (fileType === "audio") {
    return (
      <MarkdownAudio
        src={resolvedSrc ?? ""}
        originalSrc={props.src}
        alt={props.alt}
      />
    );
  }
  return <MarkdownImage {...props} />;
}
const EXCLUDED_TAGS = new Set([
  "a",
  "code",
  "kbd",
  "pre",
  "samp",
  "script",
  "style",
]);
function colorTokenNode(value, raw) {
  return {
    type: "element",
    tagName: "span",
    properties: {
      dataInlineVisual: "color",
      dataColorValue: value,
    },
    children: [
      {
        type: "text",
        value: raw,
      },
    ],
  };
}
function splitTextNode(text, allowEnd) {
  const tokens = findInlineVisualTokens(text, {
    allowEnd,
  });
  if (tokens.length === 0)
    return [
      {
        type: "text",
        value: text,
      },
    ];
  const nodes = [];
  let cursor = 0;
  for (const token of tokens) {
    if (token.start > cursor) {
      nodes.push({
        type: "text",
        value: text.slice(cursor, token.start),
      });
    }
    nodes.push(colorTokenNode(token.value, token.raw));
    cursor = token.end;
  }
  if (cursor < text.length)
    nodes.push({
      type: "text",
      value: text.slice(cursor),
    });
  return nodes;
}
function transformNode(node, allowEnd, excluded = false) {
  if (!node.children) return;
  const childExcluded =
    excluded || (node.tagName ? EXCLUDED_TAGS.has(node.tagName) : false);
  const nextChildren = [];
  for (const child of node.children) {
    if (
      !childExcluded &&
      child.type === "text" &&
      typeof child.value === "string"
    ) {
      nextChildren.push(...splitTextNode(child.value, allowEnd));
      continue;
    }
    transformNode(child, allowEnd, childExcluded);
    nextChildren.push(child);
  }
  node.children = nextChildren;
}
function rehypeInlineVisuals({ allowEnd = true } = {}) {
  return (tree) => transformNode(tree, allowEnd);
}
const INLINE_CODE_CHIP_MAX = 40;
const FILE_REFERENCE_CODE_BLOCK_MAX_LINES = 80;
const CanvasNodeReferencesContext = reactExports.createContext(
  EMPTY_CANVAS_NODE_REFERENCES,
);
function fileExtension(nameOrPath) {
  if (!nameOrPath) return void 0;
  const clean = nameOrPath.split(/[?#]/)[0]?.replace(/\\/g, "/") ?? nameOrPath;
  const filename = clean.split("/").pop() ?? clean;
  const dot = filename.lastIndexOf(".");
  if (dot <= 0 || dot === filename.length - 1) return void 0;
  const extension = filename.slice(dot + 1);
  return /^[a-z0-9]{1,10}$/i.test(extension)
    ? extension.toLowerCase()
    : void 0;
}
function CanvasNodeReference({
  nodeId,
  displayName,
  variantClass,
  className,
  ...props
}) {
  const { t: translate } = useTranslation();
  const currentWorkspace = useCurrentWorkspace();
  const assetMeta = useAssetMeta(nodeId);
  const assetPath = assetMeta?.path || assetMeta?.name;
  const resolvedDisplayName =
    assetMeta?.name || displayName || translate("chat.canvasArtifact");
  const extension =
    fileExtension(assetPath) ?? fileExtension(resolvedDisplayName);
  const label =
    extension && !fileExtension(resolvedDisplayName)
      ? `${resolvedDisplayName}.${extension}`
      : resolvedDisplayName;
  return (
    <button
      type="button"
      aria-label={label}
      data-action-ui-id="chat-canvas-node-reference"
      className="chat-inline-code-button"
      onClick={() =>
        workspaceEvents.fireCanvasFocus(currentWorkspace, [nodeId], {
          select: true,
        })
      }
    >
      <code
        {...props}
        className={cn(
          variantClass,
          "chat-inline-code-file-ref inline-flex items-center gap-1 align-baseline",
          className,
        )}
      >
        <FileReferenceVisual filename={label} workspacePath={assetMeta?.path} />
        <span>{label}</span>
      </code>
    </button>
  );
}
function MarkdownInlineCode({
  children,
  className,
  node: _node,
  ...props
}) {
  const text =
    typeof children === "string" ? children : String(children ?? "");
  const isLong = text.length > INLINE_CODE_CHIP_MAX;
  const variantClass = isLong ? "chat-inline-code-plain" : "chat-inline-code";
  const canvasNodeReferences = reactExports.useContext(
    CanvasNodeReferencesContext,
  );
  const canvasNodeReference = canvasNodeReferences.get(text);
  const fileType = detectFileType(text);
  const {
    ref,
    clickable,
    handleClick,
    permissionDialog,
  } = useChatFileReferenceAction(text);
  const isLocalFile =
    clickable &&
    (ref.kind === "external-local" || ref.kind === "workspace-internal");
  if (canvasNodeReference) {
    return (
      <CanvasNodeReference
        {...props}
        nodeId={text}
        displayName={canvasNodeReference.fallbackDisplayName}
        variantClass={variantClass}
        className={className}
      />
    );
  }
  if (!clickable) {
    if (fileType !== "file") {
      return (
        <code
          {...props}
          className={cn(
            variantClass,
            "inline-flex items-center gap-1 align-baseline",
            className,
          )}
        >
          <FileReferenceVisual filename={text} />
          <span>{children}</span>
        </code>
      );
    }
    return (
      <code {...props} className={cn(variantClass, className)}>
        {children}
      </code>
    );
  }
  return (
    <>
      <button
        type="button"
        aria-label={text}
        data-action-ui-id="chat-file-reference-inline-code"
        className={cn(
          "chat-inline-code-button",
          isLocalFile && "chat-local-file-reference",
        )}
        onClick={handleClick}
      >
        <code
          {...props}
          className={cn(
            isLocalFile ? "chat-inline-code" : variantClass,
            "chat-inline-code-file-ref inline-flex items-center gap-1 align-baseline",
            className,
          )}
        >
          <FileReferenceVisual
            filename={ref.displayName}
            workspacePath={
              ref.kind === "workspace-file" ? ref.workspaceRelativePath : void 0
            }
          />
          <span>{isLocalFile ? ref.displayName : children}</span>
          {isLocalFile && (
            <ArrowUpRight
              className="size-3.5 shrink-0 text-muted-foreground"
              strokeWidth={1.5}
              aria-hidden={true}
            />
          )}
        </code>
      </button>
      {permissionDialog}
    </>
  );
}
function trimTrailingCodeBlockNewlines(codeText) {
  return codeText.replace(/\r?\n+$/, "");
}
function fileReferenceCodeBlockLines(codeText) {
  const lines = trimTrailingCodeBlockNewlines(codeText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0 || lines.length > FILE_REFERENCE_CODE_BLOCK_MAX_LINES)
    return null;
  const seenLineCounts = new Map();
  return lines.map((line) => {
    const count = seenLineCounts.get(line) ?? 0;
    seenLineCounts.set(line, count + 1);
    return {
      key: count === 0 ? line : `${line}\0${count}`,
      line,
    };
  });
}
function DefaultCodeBlock({
  className,
  code: codeText,
  isIncomplete,
  language,
}) {
  return jsxRuntimeExports.jsx(HighlightedCodeBlock, {
    className,
    code: codeText,
    isIncomplete,
    language,
    lineNumbers: false,
    children: <CodeBlockCopyButton />,
  });
}
function FileReferenceCodeBlockLine({ line }) {
  const {
    ref,
    clickable,
    handleClick,
    permissionDialog,
  } = useChatFileReferenceAction(line);
  const isLocalFile =
    clickable &&
    (ref.kind === "external-local" || ref.kind === "workspace-internal");
  if (!clickable) {
    return <span className="chat-code-block-file-reference">{line}</span>;
  }
  return (
    <>
      <button
        type="button"
        data-action-ui-id="chat-file-reference-code-block-line"
        aria-label={isLocalFile ? line : void 0}
        className="chat-code-block-file-reference"
        onClick={handleClick}
      >
        <span className="chat-code-block-file-reference-label">
          {isLocalFile ? ref.displayName : line}
        </span>
        <Icon
          icon={ArrowUpRight}
          size="sm"
          strokeWidth={1.5}
          className="chat-code-block-file-reference-open-icon shrink-0"
          aria-hidden={true}
        />
      </button>
      {permissionDialog}
    </>
  );
}
function FileReferenceCodeBlock({
  className,
  code: codeText,
  isIncomplete,
  language,
}) {
  const currentWorkspace = useCurrentWorkspace();
  const { assets } = useAssets({
    enabled: true,
  });
  const pathLines = reactExports.useMemo(() => {
    const lines = fileReferenceCodeBlockLines(codeText);
    if (!lines) return null;
    const allLinesAreReferences = lines.every((item) => {
      if (!isStandaloneChatFileReferenceText(item.line)) return false;
      return (
        resolveChatFileReference(item.line, {
          currentWorkspace,
          assets,
        }).kind !== "none"
      );
    });
    return allLinesAreReferences ? lines : null;
  }, [assets, codeText, currentWorkspace]);
  if (!pathLines) {
    return (
      <DefaultCodeBlock
        className={className}
        code={codeText}
        isIncomplete={isIncomplete}
        language={language}
      />
    );
  }
  return jsxRuntimeExports.jsxs(CodeBlockContainer, {
    className,
    isIncomplete,
    language,
    children: [
      jsxRuntimeExports.jsx(CodeBlockHeader, {
        language,
      }),
      <div className="pointer-events-none sticky top-2 z-10 -mt-10 flex h-8 items-center justify-end">
        <div
          className="pointer-events-auto flex shrink-0 items-center gap-2 rounded-md border border-sidebar bg-sidebar/80 px-1.5 py-1 supports-[backdrop-filter]:bg-sidebar/70 supports-[backdrop-filter]:backdrop-blur"
          data-streamdown="code-block-actions"
        >
          <CodeBlockCopyButton code={codeText} />
        </div>
      </div>,
      <div
        className="chat-file-reference-code-block-body"
        data-language={language}
        data-streamdown="code-block-body"
      >
        <pre>
          <code>
            {pathLines.map((item) => (
              <FileReferenceCodeBlockLine key={item.key} line={item.line} />
            ))}
          </code>
        </pre>
      </div>,
    ],
  });
}
function MarkdownCodeBlock({
  children,
  className,
  node: _node,
  ...props
}) {
  const language = codeBlockLanguage(className);
  const codeText = codeBlockContent(children);
  const isIncomplete = useIsIncompleteCode();
  if (!("data-block" in props)) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }
  if (language === "skill-card") {
    return <InlineSkillCard content={codeText} />;
  }
  if (FILE_REFERENCE_CODE_BLOCK_LANGUAGES.has(language)) {
    return (
      <FileReferenceCodeBlock
        className={className}
        code={codeText}
        isIncomplete={isIncomplete}
        language={language}
      />
    );
  }
  return (
    <DefaultCodeBlock
      className={className}
      code={codeText}
      isIncomplete={isIncomplete}
      language={language}
    />
  );
}
const markdownComponents = {
  code: MarkdownCodeBlock,
  inlineCode: MarkdownInlineCode,
  img: (props) => <MarkdownMedia {...props} />,
  a: (props) => <MarkdownLink {...props} />,
  span: MarkdownSpan,
};
const staticRehypePlugins = [
  rehypeInlineVisuals,
  [rehypeSanitize, sanitizeSchema],
];
const streamingRehypePlugins = [
  [
    rehypeInlineVisuals,
    {
      allowEnd: false,
    },
  ],
  [rehypeSanitize, sanitizeSchema],
];
const STREAMING_PLAINTEXT_THRESHOLD = 6e3;
export function MarkdownContent({
  content,
  className,
  isStreaming = false,
}) {
  const { t: translate } = useTranslation();
  const displayContent = reactExports.useMemo(
    () =>
      encodeMarkdownUrlSpaces(
        redactInternalKnowledgeReferences(redactForCurrentRegion(content), {
          workflow: translate("chat.internalReference.workflow", "Project workflow"),
          material: translate("chat.internalReference.material", "Internal material"),
        }),
      ),
    [content, translate],
  );
  const preparedCanvasNodeReferences = reactExports.useMemo(
    () => prepareCanvasNodeReferences(displayContent),
    [displayContent],
  );
  const markdownClassName = className
    ? `chat-markdown ${className}`
    : "chat-markdown";
  if (isStreaming && displayContent.length > STREAMING_PLAINTEXT_THRESHOLD) {
    return (
      <div className={`${markdownClassName} chat-markdown-streaming-text`}>
        {displayContent}
      </div>
    );
  }
  return (
    <CanvasNodeReferencesContext.Provider
      value={preparedCanvasNodeReferences.references}
    >
      <div className={markdownClassName}>
        <Streamdown
          mode={isStreaming ? "streaming" : "static"}
          isAnimating={isStreaming}
          parseIncompleteMarkdown={isStreaming}
          controls={{
            code: {
              copy: true,
              download: false,
            },
            table: false,
            mermaid: false,
          }}
          lineNumbers={false}
          rehypePlugins={
            isStreaming ? streamingRehypePlugins : staticRehypePlugins
          }
          urlTransform={urlTransform}
          components={markdownComponents}
          plugins={stablePlugins}
        >
          {preparedCanvasNodeReferences.content}
        </Streamdown>
      </div>
    </CanvasNodeReferencesContext.Provider>
  );
}
