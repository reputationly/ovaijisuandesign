// markdown-link.jsx
import {
  API_PATHS,
  ArrowUpRight,
  classifyFileType,
  Copy,
  Crosshair,
  dedupedToast,
  defaultSchema,
  ExternalLink,
  G$1 as G,
  Globe,
  jsxRuntimeExports,
  reactExports,
  useCurrentWorkspace,
  usePlatform,
  useTranslation,
  Video,
  VideoOff,
} from "../vendor.js";
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
import { rehypeSanitize } from "../settings/request-prompt-prefill.jsx";
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
import { Ae, ot, rt } from "../chat/ae.jsx";
import { st } from "../chat/st.jsx";
import { useAssets } from "../settings/use-assets.js";
import { resolveChatFileReference } from "./resolve-chat-file-reference.js";
import { cleanPath, tt } from "../media-editing/wt.js";
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
import { Qs } from "../chat/qs.jsx";
function resolveMediaUrl(relativeUrl) {
  if (!relativeUrl) return void 0;
  if (/^https?:\/\//.test(relativeUrl)) return relativeUrl;
  return gatewayUrl(relativeUrl);
}
function joinMetadata(parts) {
  return parts.filter(Boolean).join(" · ");
}
function basename(src) {
  const path2 = cleanPath(src);
  return path2.split(/[\\/]/).pop() || "";
}
function getMediaExtension(src) {
  const name2 = basename(src);
  const dot2 = name2.lastIndexOf(".");
  return dot2 > 0 ? name2.slice(dot2 + 1).toUpperCase() : "";
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
      const base2 = workspaceDir.endsWith("/")
        ? workspaceDir
        : `${workspaceDir}/`;
      if (filePath.startsWith(base2)) {
        return resolveUrl(`/files/${filePath.slice(base2.length)}`);
      }
    }
    const name2 = filePath.split("/").pop();
    return name2 ? resolveUrl(`/files/${name2}`) : src;
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
    children: children2,
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
    return <InlineColorValue value={colorValue}>{children2}</InlineColorValue>;
  }
  return <span {...domProps}>{children2}</span>;
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
function codeBlockContent(children2) {
  if (typeof children2 === "string") return children2;
  if (typeof children2 === "number") return String(children2);
  if (hasStringChildren(children2)) return children2.props.children;
  return "";
}
const stablePlugins = {
  code: G,
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
  const content2 = withoutLineEnding(line);
  const indentLength = content2.match(/^[\t ]{0,3}/)?.[0].length ?? 0;
  const marker = content2.slice(indentLength).trimEnd();
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
  const displayName2 = candidate?.trim();
  if (!displayName2) return void 0;
  const plainDisplayName = displayName2.replace(/^\*\*|\*\*$/g, "").trim();
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
function isStandaloneMatch(source, offset2, matchLength) {
  const lineStart = source.lastIndexOf("\n", offset2 - 1) + 1;
  const nextLineBreak = source.indexOf("\n", offset2 + matchLength);
  const lineEnd2 = nextLineBreak === -1 ? source.length : nextLineBreak;
  return (
    source.slice(lineStart, offset2).trim().length === 0 &&
    source.slice(offset2 + matchLength, lineEnd2).trim().length === 0
  );
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function internalTokenPrefix(content2) {
  let prefix = INTERNAL_TOKEN_PREFIX;
  while (content2.includes(prefix)) prefix += ":";
  return prefix;
}
function registerCanvasNodeReference(references, nodeId, candidateDisplayName) {
  const fallbackDisplayName = canvasNodeDisplayName(candidateDisplayName);
  const current2 = references.get(nodeId);
  if (current2?.fallbackDisplayName || (current2 && !fallbackDisplayName))
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
function transformOutsideCodeBlocks(content2, transform2) {
  const lines = content2.match(MARKDOWN_LINE_PATTERN) ?? [];
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
      output += transform2(textSegment);
      textSegment = "";
      output += line;
      inIndentedCode = true;
      continue;
    }
    const nextFence = openingFence(line);
    if (nextFence) {
      output += transform2(textSegment);
      textSegment = "";
      output += line;
      fence = nextFence;
      continue;
    }
    textSegment += line;
  }
  return output + transform2(textSegment);
}
function prepareCanvasNodeReferences(content2) {
  const references = new Map();
  const tokens2 = [];
  const renderedStandaloneNodeIds = new Set();
  const tokenPrefix = internalTokenPrefix(content2);
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
      tokens2.push({
        nodeId,
        replacement,
        fallbackDisplayName,
        deduplicateStandalone,
      }) - 1;
    return `${tokenPrefix}${tokenIndex}${INTERNAL_TOKEN_SUFFIX}`;
  };
  const preparedContent = transformOutsideCodeBlocks(content2, (segment) => {
    const titledSegment = segment.replace(
      TITLED_CANVAS_NODE_REFERENCE_PATTERN,
      (_match, documentName, nodeId) => {
        return createToken(nodeId, `\`${nodeId}\``, documentName, true);
      },
    );
    const listSegment = titledSegment.replace(
      LIST_CANVAS_NODE_REFERENCE_PATTERN,
      (match2, listMarker, nodeName, nodeId) => {
        const fallbackDisplayName = canvasNodeDisplayName(nodeName);
        if (!fallbackDisplayName) return match2;
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
      (match2, nodeName, nodeId, offset2, source) => {
        const standalone = isStandaloneMatch(source, offset2, match2.length);
        return createToken(
          nodeId,
          standalone ? `\`${nodeId}\`` : match2,
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
      (match2, nodeId, offset2, source) =>
        createToken(
          nodeId,
          `\`${nodeId}\``,
          void 0,
          isStandaloneMatch(source, offset2, match2.length),
        ),
    );
    return tokenizedSegment.replace(tokenPattern, (_match, rawIndex) => {
      const token2 = tokens2[Number(rawIndex)];
      if (!token2) return "";
      registerCanvasNodeReference(
        references,
        token2.nodeId,
        token2.fallbackDisplayName,
      );
      if (!token2.deduplicateStandalone) return token2.replacement;
      if (renderedStandaloneNodeIds.has(token2.nodeId)) return "";
      renderedStandaloneNodeIds.add(token2.nodeId);
      return token2.replacement;
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
function isStandaloneChatFileReferenceText(raw2) {
  const value = cleanRaw(raw2);
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
  children: children2,
  onPreview,
  unavailable = false,
}) {
  const { t: t2 } = useTranslation();
  const workspaceId2 = useCurrentWorkspace();
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
  const hasCanvasNode = useHasAssetOnCanvas(asset?.id, workspaceId2);
  const fileName = getDisplayName(originalSrc, resolvedSrc, alt, asset);
  const dragSource = reactExports.useMemo(
    () => ({
      relativePath,
      workspacePath: workspaceId2,
      name: fileName,
      assetId: asset?.id,
    }),
    [asset?.id, fileName, relativePath, workspaceId2],
  );
  const canDrag = canWriteResourceDragData(dragSource);
  const locateTitle = t2("assetPreview.locateOnCanvas", {
    defaultValue: "Locate on canvas",
  });
  const previewTitle = t2("common.expand");
  const copyTitle = t2("common.copy");
  const { copyFile, copyImage, copyPath, isLocalPath } = useMediaActions();
  const copySource = reactExports.useMemo(() => {
    const src = resolvedSrc ?? originalSrc;
    if (kind === "video" && relativePath && workspaceId2) {
      return joinFilePath(workspaceId2, relativePath);
    }
    return src;
  }, [kind, originalSrc, relativePath, resolvedSrc, workspaceId2]);
  const handleLocate = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      if (!asset?.id) return;
      const nodeIds = getNodeIdsForAsset(asset.id, workspaceId2);
      if (nodeIds.length === 0) return;
      workspaceEvents.fireCanvasFocus(workspaceId2, nodeIds);
    },
    [asset?.id, workspaceId2],
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
        {children2}
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
  const { t: t2 } = useTranslation();
  const label =
    kind === "image"
      ? t2("chat.failedToLoadImage", {
          defaultValue: "Failed to load image",
        })
      : t2("chat.failedToLoadVideo", {
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
  const h2 = Math.floor(total / 3600);
  const m3 = Math.floor((total % 3600) / 60);
  const s2 = total % 60;
  if (h2 > 0)
    return `${h2}:${m3.toString().padStart(2, "0")}:${s2.toString().padStart(2, "0")}`;
  return `${m3}:${s2.toString().padStart(2, "0")}`;
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
function urlTransform(url2) {
  if (/^javascript:/i.test(url2.trim())) return "";
  return url2;
}
function encodeMarkdownUrlSpaces(markdown2) {
  return markdown2.replace(
    /(!?\[[^\]]*\]\()([^)]*\s[^)]*)\)/g,
    (_match, prefix, url2) => `${prefix}${url2.replace(/ /g, "%20")})`,
  );
}
function MarkdownImage({ src, alt, ...rest }) {
  const workspace = useCurrentWorkspace();
  const resolveMediaUrl2 = useResolveMediaUrl();
  const [fullSize, setFullSize] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(false);
  const [dimensions2, setDimensions] = reactExports.useState("");
  const resolvedSrc = rewriteImgSrc(src, workspace, resolveMediaUrl2);
  const thumbSrc = withThumbnail(resolvedSrc, 260);
  const extension2 = getMediaExtension(src ?? resolvedSrc);
  const metadata = joinMetadata([extension2, dimensions2]);
  const handleClick2 = reactExports.useCallback(() => {
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
        metadata={metadata || extension2 || "IMAGE"}
        onPreview={handleClick2}
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
  const resolveMediaUrl2 = useResolveMediaUrl();
  const type2 = detectFileType(filename);
  const safePath =
    workspacePath &&
    !/^(?:[\\/]|[a-z][a-z0-9+.-]*:)/i.test(workspacePath) &&
    !workspacePath.split(/[\\/]/).includes("..")
      ? workspacePath
      : void 0;
  const previewUrl =
    safePath && (type2 === "image" || type2 === "video")
      ? withThumbnail(
          resolveMediaUrl2(
            type2 === "video"
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
  if (type2 !== "image" && type2 !== "video" && type2 !== "audio") {
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
    type2 === "image"
      ? ImageOutlineIcon
      : type2 === "video"
        ? Video
        : FileAudio;
  const showThumbnail = previewUrl && failedUrl !== previewUrl;
  return (
    <span
      className="relative inline-flex size-3.5 shrink-0 items-center justify-center text-muted-foreground"
      data-media-kind={type2}
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
function tryParseSkillCard(raw2) {
  try {
    const data2 = JSON.parse(raw2);
    if (typeof data2.name !== "string") return null;
    return {
      name: data2.name,
      guidePrompt:
        typeof data2.guidePrompt === "string" ? data2.guidePrompt : void 0,
    };
  } catch {
    return null;
  }
}
function InlineSkillCard({ content: content2 }) {
  const { t: t2 } = useTranslation();
  const data2 = reactExports.useMemo(
    () => tryParseSkillCard(content2),
    [content2],
  );
  const handleTry = reactExports.useCallback(() => {
    if (!data2) return;
    const skill = {
      name: data2.name,
      guidePrompt: data2.guidePrompt ?? "",
    };
    workspaceEvents.fireAddSkillToChat(skill);
  }, [data2]);
  if (!data2) return null;
  return (
    <div className="not-prose my-2 flex items-center gap-3 rounded-lg border border-border bg-muted px-3 py-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <SkillIcon
          size={16}
          strokeWidth={1.5}
          className="text-muted-foreground shrink-0"
        />
        <span className="text-sm font-medium truncate">{data2.name}</span>
        <span className="text-xs text-muted-foreground">
          {t2("skills.skillLabel", "Skill")}
        </span>
      </div>
      <Button
        size="sm"
        data-action-ui-id="inline-skill-card-try"
        className="shrink-0 text-xs h-7"
        onClick={handleTry}
      >
        {t2("skills.trySkill", "开始使用")}
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
function redactInternalKnowledgeReferences(content2, labels) {
  const internalDefinitions = new Map();
  const withoutDefinitions = content2.replace(
    REFERENCE_DEFINITION_RE,
    (match2, id2, target) => {
      if (!isInternalKnowledgeReference(target)) return match2;
      internalDefinitions.set(id2.trim().toLowerCase(), target);
      return "";
    },
  );
  let withoutInternalLinks = withoutDefinitions;
  for (const [id2, target] of internalDefinitions) {
    const escapedId = id2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    withoutInternalLinks = withoutInternalLinks.replace(
      new RegExp(`\\[([^\\]\\n]*)\\]\\[${escapedId}\\]`, "gi"),
      neutralLabel(target, labels),
    );
  }
  withoutInternalLinks = withoutInternalLinks.replace(
    MARKDOWN_LINK_RE,
    (match2, _label, target) =>
      isInternalKnowledgeReference(target)
        ? neutralLabel(target, labels)
        : match2,
  );
  withoutInternalLinks = withoutInternalLinks.replace(
    AUTOLINK_RE,
    (match2, target) =>
      isInternalKnowledgeReference(target)
        ? neutralLabel(target, labels)
        : match2,
  );
  withoutInternalLinks = withoutInternalLinks.replace(
    INLINE_CODE_RE,
    (match2, target) =>
      isInternalKnowledgeReference(target)
        ? neutralLabel(target, labels)
        : match2,
  );
  return withoutInternalLinks.replace(PATH_TOKEN_RE, (token2) =>
    isInternalKnowledgeReference(token2)
      ? neutralLabel(token2, labels)
      : token2,
  );
}
function isWebLink(href) {
  if (!href) return false;
  try {
    const url2 = new URL(href);
    return url2.protocol === "http:" || url2.protocol === "https:";
  } catch {
    return false;
  }
}
function trackChatLinkAction(properties2) {
  trackEvent(TRACK_EVENTS.CHAT_LINK_ACTION, {
    ...properties2,
  });
}
function MarkdownLink({
  href,
  children: children2,
  className,
  node: _node,
  ...rest
}) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
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
  const handleClick2 = reactExports.useCallback(
    (event) => {
      if (!href) return;
      if (isBrowserLink) {
        event.preventDefault();
        void openUrlInBuiltinBrowser(platform2, href, {
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
      void openUrlInBuiltinBrowser(platform2, href, {
        source: "chat.markdown-link",
      });
    },
    [
      fileReferenceAction.clickable,
      fileReferenceAction.handleClick,
      href,
      isBrowserLink,
      platform2,
      targetDomain,
    ],
  );
  const handleOpenBuiltin = reactExports.useCallback(() => {
    if (!href) return;
    void openUrlInBuiltinBrowser(platform2, href, {
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
  }, [href, platform2, targetDomain]);
  const handleOpenExternal = reactExports.useCallback(async () => {
    if (!href) return;
    const opened = await openExternalUrl(platform2, href, {
      source: "chat.markdown-link.context-menu.external",
    });
    trackChatLinkAction({
      action: "open_external",
      trigger: "context_menu",
      target_domain: targetDomain,
      result: opened ? "accepted" : "failed",
    });
    if (!opened) dedupedToast.error(t2("workspace.browser.openExternalError"));
  }, [href, platform2, t2, targetDomain]);
  const handleCopyLink = reactExports.useCallback(async () => {
    if (!href) return;
    try {
      await platform2.clipboard.writeText(href);
      trackChatLinkAction({
        action: "copy",
        trigger: "context_menu",
        target_domain: targetDomain,
        result: "accepted",
      });
      dedupedToast.success(t2("chat.copied"));
    } catch {
      trackChatLinkAction({
        action: "copy",
        trigger: "context_menu",
        target_domain: targetDomain,
        result: "failed",
      });
      dedupedToast.error(t2("common.copyFailed"));
    }
  }, [href, platform2.clipboard, t2, targetDomain]);
  if (isNonClickableFileReference) {
    return <span>{children2}</span>;
  }
  const link2 = (
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
      onClick={handleClick2}
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
        children2
      )}
    </a>
  );
  return (
    <>
      {isBrowserLink ? (
        <ContextMenu>
          <ContextMenuTrigger render={link2} className="select-text" />
          <ContextMenuContent data-action-ui-id="chat-markdown-link-context-menu">
            <ContextMenuItem
              data-action-ui-id="chat-markdown-link-open-builtin"
              onClick={handleOpenBuiltin}
            >
              <Globe />
              {t2("chat.link.openBuiltin")}
            </ContextMenuItem>
            <ContextMenuItem
              data-action-ui-id="chat-markdown-link-open-external"
              onClick={() => void handleOpenExternal()}
            >
              <ExternalLink />
              {t2("workspace.browser.openExternal")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              data-action-ui-id="chat-markdown-link-copy"
              onClick={() => void handleCopyLink()}
            >
              <Copy />
              {t2("chat.copyUrl")}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ) : (
        link2
      )}
      {fileReferenceAction.permissionDialog}
    </>
  );
}
function MarkdownVideo({ src, originalSrc, alt }) {
  const resolveMediaUrl2 = useResolveMediaUrl();
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
      thumbError ? void 0 : videoThumbnailUrl(relativePath, resolveMediaUrl2),
    [relativePath, resolveMediaUrl2, thumbError],
  );
  const extension2 = getMediaExtension(originalSrc ?? src);
  const metadata = joinMetadata([extension2, formatDuration(duration)]);
  const handleError = reactExports.useCallback(() => setError(true), []);
  const handleLoadedMetadata = reactExports.useCallback((event) => {
    const next2 = event.currentTarget.duration;
    if (Number.isFinite(next2)) setDuration(next2);
  }, []);
  if (error) {
    return (
      <MarkdownMediaCard
        kind="video"
        originalSrc={originalSrc}
        resolvedSrc={src}
        alt={alt}
        metadata={metadata || extension2 || "VIDEO"}
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
        metadata={metadata || extension2 || "VIDEO"}
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
  const resolveMediaUrl2 = useResolveMediaUrl();
  const resolvedSrc = rewriteImgSrc(props.src, workspace, resolveMediaUrl2);
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
function colorTokenNode(value, raw2) {
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
        value: raw2,
      },
    ],
  };
}
function splitTextNode(text2, allowEnd) {
  const tokens2 = findInlineVisualTokens(text2, {
    allowEnd,
  });
  if (tokens2.length === 0)
    return [
      {
        type: "text",
        value: text2,
      },
    ];
  const nodes = [];
  let cursor = 0;
  for (const token2 of tokens2) {
    if (token2.start > cursor) {
      nodes.push({
        type: "text",
        value: text2.slice(cursor, token2.start),
      });
    }
    nodes.push(colorTokenNode(token2.value, token2.raw));
    cursor = token2.end;
  }
  if (cursor < text2.length)
    nodes.push({
      type: "text",
      value: text2.slice(cursor),
    });
  return nodes;
}
function transformNode(node2, allowEnd, excluded = false) {
  if (!node2.children) return;
  const childExcluded =
    excluded || (node2.tagName ? EXCLUDED_TAGS.has(node2.tagName) : false);
  const nextChildren = [];
  for (const child of node2.children) {
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
  node2.children = nextChildren;
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
  const dot2 = filename.lastIndexOf(".");
  if (dot2 <= 0 || dot2 === filename.length - 1) return void 0;
  const extension2 = filename.slice(dot2 + 1);
  return /^[a-z0-9]{1,10}$/i.test(extension2)
    ? extension2.toLowerCase()
    : void 0;
}
function CanvasNodeReference({
  nodeId,
  displayName: displayName2,
  variantClass,
  className,
  ...props
}) {
  const { t: t2 } = useTranslation();
  const currentWorkspace = useCurrentWorkspace();
  const assetMeta = useAssetMeta(nodeId);
  const assetPath = assetMeta?.path || assetMeta?.name;
  const resolvedDisplayName =
    assetMeta?.name || displayName2 || t2("chat.canvasArtifact");
  const extension2 =
    fileExtension(assetPath) ?? fileExtension(resolvedDisplayName);
  const label =
    extension2 && !fileExtension(resolvedDisplayName)
      ? `${resolvedDisplayName}.${extension2}`
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
  children: children2,
  className,
  node: _node,
  ...props
}) {
  const text2 =
    typeof children2 === "string" ? children2 : String(children2 ?? "");
  const isLong = text2.length > INLINE_CODE_CHIP_MAX;
  const variantClass = isLong ? "chat-inline-code-plain" : "chat-inline-code";
  const canvasNodeReferences = reactExports.useContext(
    CanvasNodeReferencesContext,
  );
  const canvasNodeReference = canvasNodeReferences.get(text2);
  const fileType = detectFileType(text2);
  const {
    ref,
    clickable,
    handleClick: handleClick2,
    permissionDialog,
  } = useChatFileReferenceAction(text2);
  const isLocalFile =
    clickable &&
    (ref.kind === "external-local" || ref.kind === "workspace-internal");
  if (canvasNodeReference) {
    return (
      <CanvasNodeReference
        {...props}
        nodeId={text2}
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
          <FileReferenceVisual filename={text2} />
          <span>{children2}</span>
        </code>
      );
    }
    return (
      <code {...props} className={cn(variantClass, className)}>
        {children2}
      </code>
    );
  }
  return (
    <>
      <button
        type="button"
        aria-label={text2}
        data-action-ui-id="chat-file-reference-inline-code"
        className={cn(
          "chat-inline-code-button",
          isLocalFile && "chat-local-file-reference",
        )}
        onClick={handleClick2}
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
          <span>{isLocalFile ? ref.displayName : children2}</span>
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
function trimTrailingCodeBlockNewlines(codeText2) {
  return codeText2.replace(/\r?\n+$/, "");
}
function fileReferenceCodeBlockLines(codeText2) {
  const lines = trimTrailingCodeBlockNewlines(codeText2)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0 || lines.length > FILE_REFERENCE_CODE_BLOCK_MAX_LINES)
    return null;
  const seenLineCounts = new Map();
  return lines.map((line) => {
    const count2 = seenLineCounts.get(line) ?? 0;
    seenLineCounts.set(line, count2 + 1);
    return {
      key: count2 === 0 ? line : `${line}\0${count2}`,
      line,
    };
  });
}
function DefaultCodeBlock({
  className,
  code: codeText2,
  isIncomplete,
  language: language2,
}) {
  return jsxRuntimeExports.jsx(st, {
    className,
    code: codeText2,
    isIncomplete,
    language: language2,
    lineNumbers: false,
    children: <Ae />,
  });
}
function FileReferenceCodeBlockLine({ line }) {
  const {
    ref,
    clickable,
    handleClick: handleClick2,
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
        onClick={handleClick2}
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
  code: codeText2,
  isIncomplete,
  language: language2,
}) {
  const currentWorkspace = useCurrentWorkspace();
  const { assets } = useAssets({
    enabled: true,
  });
  const pathLines = reactExports.useMemo(() => {
    const lines = fileReferenceCodeBlockLines(codeText2);
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
  }, [assets, codeText2, currentWorkspace]);
  if (!pathLines) {
    return (
      <DefaultCodeBlock
        className={className}
        code={codeText2}
        isIncomplete={isIncomplete}
        language={language2}
      />
    );
  }
  return jsxRuntimeExports.jsxs(ot, {
    className,
    isIncomplete,
    language: language2,
    children: [
      jsxRuntimeExports.jsx(rt, {
        language: language2,
      }),
      <div className="pointer-events-none sticky top-2 z-10 -mt-10 flex h-8 items-center justify-end">
        <div
          className="pointer-events-auto flex shrink-0 items-center gap-2 rounded-md border border-sidebar bg-sidebar/80 px-1.5 py-1 supports-[backdrop-filter]:bg-sidebar/70 supports-[backdrop-filter]:backdrop-blur"
          data-streamdown="code-block-actions"
        >
          <Ae code={codeText2} />
        </div>
      </div>,
      <div
        className="chat-file-reference-code-block-body"
        data-language={language2}
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
  children: children2,
  className,
  node: _node,
  ...props
}) {
  const language2 = codeBlockLanguage(className);
  const codeText2 = codeBlockContent(children2);
  const isIncomplete = tt();
  if (!("data-block" in props)) {
    return (
      <code className={className} {...props}>
        {children2}
      </code>
    );
  }
  if (language2 === "skill-card") {
    return <InlineSkillCard content={codeText2} />;
  }
  if (FILE_REFERENCE_CODE_BLOCK_LANGUAGES.has(language2)) {
    return (
      <FileReferenceCodeBlock
        className={className}
        code={codeText2}
        isIncomplete={isIncomplete}
        language={language2}
      />
    );
  }
  return (
    <DefaultCodeBlock
      className={className}
      code={codeText2}
      isIncomplete={isIncomplete}
      language={language2}
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
  content: content2,
  className,
  isStreaming = false,
}) {
  const { t: t2 } = useTranslation();
  const displayContent = reactExports.useMemo(
    () =>
      encodeMarkdownUrlSpaces(
        redactInternalKnowledgeReferences(redactForCurrentRegion(content2), {
          workflow: t2("chat.internalReference.workflow", "Project workflow"),
          material: t2("chat.internalReference.material", "Internal material"),
        }),
      ),
    [content2, t2],
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
        <Qs
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
        </Qs>
      </div>
    </CanvasNodeReferencesContext.Provider>
  );
}
