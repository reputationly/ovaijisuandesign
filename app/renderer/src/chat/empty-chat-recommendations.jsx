// empty-chat-recommendations.jsx
import { jsxRuntimeExports, reactExports, useTranslation, useCurrentWorkspace, useQuery, X$7, ArrowUpRight, PlaybackPlayIcon$1, Pencil, CircleAlert } from "../vendor.js";
import { gatewayFetch } from "../infra/agent-ws-client.jsx";
import { useAuth, Popover, PopoverTrigger } from "../assets/apply-asset-change.jsx";
import { useResolveMediaUrl } from "../workspace/deferred-thumbnail-image-generation.jsx";
import { Tooltip, TooltipTrigger, Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { rehypeSanitize } from "../settings/interest-selection-provider.jsx";
import { resolveHomeFeaturedSkillPrompt } from "../workspace/build-inspiration-media-showcase-collections.js";
import { ImageOutlineIcon, useAssetMeta } from "../media-editing/parse-item.jsx";
import { buildMediaShowcaseCollections } from "../workspace/parse-prompt-item.js";
import { tt, rewriteImgSrc, getMediaExtension, joinMetadata, codeBlockLanguage, codeBlockContent, FILE_REFERENCE_CODE_BLOCK_LANGUAGES, MarkdownSpan, stablePlugins, useSessionCostVisible } from "../media-editing/tool-name-to-label-id.jsx";
import { useWSConnection } from "../workspace/record-recent-workspace-opened.jsx";
import { detectFileType } from "../canvas/relayout-group-children.js";
import { useLoginGuard } from "../infra/thumbnail-load-scheduler.jsx";
import { workspaceEvents, ContextMenu } from "../workspace/use-hub-logo-hover-animation.jsx";
import { toDisplayName$1, SkillCoverMedia, resolveSkillCoverUrl } from "../generation/use-mention-models.jsx";
import { findInlineVisualTokens } from "../text-editor/attachment-preview.jsx";
import { getAgentSkillBrowseSkills } from "../workspace/slash-command-popover-content.jsx";
import {
  TooltipContent,
  cn$2,
  Button$1,
} from "../infra/use-browser-overlay-dialog-props.jsx";
import { RetryIcon, QuestionPromptIcon } from "../workspace/browser-inspiration-urls.jsx";
import { HubLogo, InlineRenameInput } from "../infra/hub-logo.jsx";
import { PopoverContent } from "../team/use-credit-details.jsx";
import { useAssets } from "../settings/use-media-actions.jsx";
import {
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "../workspace/new-workspace-dialog.jsx";
import { MediaLightbox } from "../assets/image-lightbox.jsx";
import { useMarketSkills } from "../workspace/use-market-skills.jsx";
import { VideoLightbox } from "../media-editing/image-lightbox.jsx";
import { Spinner } from "../team/use-team-transactions-feed-query.jsx";
import { usePendingFirstMessage, useWorkspaceChatSelector } from "../assets/use-asset-picker-host.jsx";
import { DEFAULT_SESSION_NAME, MAX_SESSION_NAME_LENGTH } from "../canvas/generating-media-area.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  MarkdownAudio,
  MarkdownImage,
  MarkdownMediaCard,
  MediaUnavailable,
  encodeMarkdownUrlSpaces,
  formatDuration,
  sanitizeSchema,
  toWorkspaceRelativePath$1,
  urlTransform,
  videoThumbnailUrl,
} from "../media-editing/markdown-audio.jsx";
import { DEFAULT_HOME_QUICK_START_CONFIG, useChatReadiness } from "./mode-selector.jsx";
import {
  EMPTY_CANVAS_NODE_REFERENCES,
  isStandaloneChatFileReferenceText,
  prepareCanvasNodeReferences,
  redactForCurrentRegion,
  resolveChatFileReference,
} from "../generation/resolve-chat-file-reference.js";
import {
  FileReferenceVisual,
  InlineSkillCard,
  MarkdownLink,
  redactInternalKnowledgeReferences,
  useChatFileReferenceAction,
} from "../generation/use-chat-file-reference-action.jsx";
import {
  pickRecommendationBatch,
  useEnsureSkillReady,
  useHomeQuickStartConfig,
} from "../workspace/use-ensure-skill-ready.js";
import { Ae, CHAT_CONTENT_MAX_WIDTH_PX, Qs, ot, rt, st } from "./yt.jsx";
function MarkdownVideo({ src, originalSrc, alt }) {
  const resolveMediaUrl2 = useResolveMediaUrl();
  const [error, setError] = reactExports.useState(false);
  const [previewOpen, setPreviewOpen] = reactExports.useState(false);
  const [thumbError, setThumbError] = reactExports.useState(false);
  const [duration, setDuration] = reactExports.useState();
  const relativePath = reactExports.useMemo(
    () => toWorkspaceRelativePath$1(originalSrc, src),
    [originalSrc, src],
  );
  const thumbSrc = reactExports.useMemo(
    () => (thumbError ? void 0 : videoThumbnailUrl(relativePath, resolveMediaUrl2)),
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
    return <MarkdownVideo src={resolvedSrc ?? ""} originalSrc={props.src} alt={props.alt} />;
  }
  if (fileType === "audio") {
    return <MarkdownAudio src={resolvedSrc ?? ""} originalSrc={props.src} alt={props.alt} />;
  }
  return <MarkdownImage {...props} />;
}
const EXCLUDED_TAGS = new Set(["a", "code", "kbd", "pre", "samp", "script", "style"]);
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
  const childExcluded = excluded || (node2.tagName ? EXCLUDED_TAGS.has(node2.tagName) : false);
  const nextChildren = [];
  for (const child of node2.children) {
    if (!childExcluded && child.type === "text" && typeof child.value === "string") {
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
const CanvasNodeReferencesContext = reactExports.createContext(EMPTY_CANVAS_NODE_REFERENCES);
function fileExtension(nameOrPath) {
  if (!nameOrPath) return void 0;
  const clean = nameOrPath.split(/[?#]/)[0]?.replace(/\\/g, "/") ?? nameOrPath;
  const filename = clean.split("/").pop() ?? clean;
  const dot2 = filename.lastIndexOf(".");
  if (dot2 <= 0 || dot2 === filename.length - 1) return void 0;
  const extension2 = filename.slice(dot2 + 1);
  return /^[a-z0-9]{1,10}$/i.test(extension2) ? extension2.toLowerCase() : void 0;
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
  const resolvedDisplayName = assetMeta?.name || displayName2 || t2("chat.canvasArtifact");
  const extension2 = fileExtension(assetPath) ?? fileExtension(resolvedDisplayName);
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
        className={cn$2(
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
function MarkdownInlineCode({ children: children2, className, node: _node, ...props }) {
  const text2 = typeof children2 === "string" ? children2 : String(children2 ?? "");
  const isLong = text2.length > INLINE_CODE_CHIP_MAX;
  const variantClass = isLong ? "chat-inline-code-plain" : "chat-inline-code";
  const canvasNodeReferences = reactExports.useContext(CanvasNodeReferencesContext);
  const canvasNodeReference = canvasNodeReferences.get(text2);
  const fileType = detectFileType(text2);
  const {
    ref,
    clickable,
    handleClick: handleClick2,
    permissionDialog,
  } = useChatFileReferenceAction(text2);
  const isLocalFile =
    clickable && (ref.kind === "external-local" || ref.kind === "workspace-internal");
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
          className={cn$2(variantClass, "inline-flex items-center gap-1 align-baseline", className)}
        >
          <FileReferenceVisual filename={text2} />
          <span>{children2}</span>
        </code>
      );
    }
    return (
      <code {...props} className={cn$2(variantClass, className)}>
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
        className={cn$2("chat-inline-code-button", isLocalFile && "chat-local-file-reference")}
        onClick={handleClick2}
      >
        <code
          {...props}
          className={cn$2(
            isLocalFile ? "chat-inline-code" : variantClass,
            "chat-inline-code-file-ref inline-flex items-center gap-1 align-baseline",
            className,
          )}
        >
          <FileReferenceVisual
            filename={ref.displayName}
            workspacePath={ref.kind === "workspace-file" ? ref.workspaceRelativePath : void 0}
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
  if (lines.length === 0 || lines.length > FILE_REFERENCE_CODE_BLOCK_MAX_LINES) return null;
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
function DefaultCodeBlock({ className, code: codeText2, isIncomplete, language: language2 }) {
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
    clickable && (ref.kind === "external-local" || ref.kind === "workspace-internal");
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
function FileReferenceCodeBlock({ className, code: codeText2, isIncomplete, language: language2 }) {
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
function MarkdownCodeBlock({ children: children2, className, node: _node, ...props }) {
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
const staticRehypePlugins = [rehypeInlineVisuals, [rehypeSanitize, sanitizeSchema]];
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
export function MarkdownContent({ content: content2, className, isStreaming = false }) {
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
  const markdownClassName = className ? `chat-markdown ${className}` : "chat-markdown";
  if (isStreaming && displayContent.length > STREAMING_PLAINTEXT_THRESHOLD) {
    return (
      <div className={`${markdownClassName} chat-markdown-streaming-text`}>{displayContent}</div>
    );
  }
  return (
    <CanvasNodeReferencesContext.Provider value={preparedCanvasNodeReferences.references}>
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
          rehypePlugins={isStreaming ? streamingRehypePlugins : staticRehypePlugins}
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
const HOME_FEATURED_SKILL_SOURCE = "official-featured";
const NODE_AGENT_SKILL_PAGE_SIZE = 100;
const EMPTY_RECOMMENDATIONS_SUBTITLE_KEYS = {
  "clip-editor": "chat.emptyRecommendations.subtitle.clipAgent",
  "director-stage": "chat.emptyRecommendations.subtitle.directorAgent",
  "text-editor": "chat.emptyRecommendations.subtitle.textAgent",
};
const NODE_AGENT_SKILL_TAB_KEYS = {
  "clip-editor": "chat.emptyRecommendations.skillTab.clipAgent",
  "director-stage": "chat.emptyRecommendations.skillTab.directorAgent",
  "text-editor": "chat.emptyRecommendations.skillTab.textAgent",
};
const NODE_AGENT_INTRO_KEYS = {
  "clip-editor": "chat.clipEditAgent.intro",
  "director-stage": "chat.directorStageAgent.intro",
  "text-editor": "chat.textEditAgent.intro",
};
function getFeaturedCategory(categories) {
  return categories.find((category) => category.kind === "featured-skills");
}
function EmptyChatRecommendations({ onSelectShowcase, onSelectSkill, skillMode }) {
  const { t: t2, i18n } = useTranslation();
  const { user } = useAuth();
  const { guard: loginGuard } = useLoginGuard();
  const { ensureSkillReady } = useEnsureSkillReady();
  const { config: config2, source: configSource } = useHomeQuickStartConfig();
  const [tab2, setTab] = reactExports.useState(skillMode ? "skill" : "showcase");
  const [showcaseBatch, setShowcaseBatch] = reactExports.useState([]);
  const [skillBatch, setSkillBatch] = reactExports.useState([]);
  const [installingSkillName, setInstallingSkillName] = reactExports.useState(null);
  const [installingSkillProgress, setInstallingSkillProgress] = reactExports.useState(null);
  const [previewSession, setPreviewSession] = reactExports.useState(null);
  const installingSkillRef = reactExports.useRef(null);
  const isZh = i18n.language?.startsWith("zh") ?? false;
  const recommendationCategories =
    configSource === "loading" ? DEFAULT_HOME_QUICK_START_CONFIG.categories : config2.categories;
  const featuredCategory = reactExports.useMemo(
    () => getFeaturedCategory(recommendationCategories),
    [recommendationCategories],
  );
  const market = useMarketSkills(
    void 0,
    skillMode ? void 0 : HOME_FEATURED_SKILL_SOURCE,
    skillMode ? NODE_AGENT_SKILL_PAGE_SIZE : void 0,
  );
  const showcaseItems = reactExports.useMemo(
    () =>
      buildMediaShowcaseCollections({
        categories: recommendationCategories,
        featuredLabel: t2("home.mediaShowcase.featured", {
          defaultValue: "精选",
        }),
      })
        .flatMap((collection) => collection.items)
        .filter((item) => item.action.kind === "query"),
    [recommendationCategories, t2],
  );
  const featuredSkills = reactExports.useMemo(() => {
    if (!skillMode) return market.skills;
    return getAgentSkillBrowseSkills(market.skills, [], skillMode, null).filter(
      (skill) => !("enabled" in skill),
    );
  }, [market.skills, skillMode]);
  reactExports.useEffect(() => {
    void market.fetchList();
  }, [market.fetchList]);
  reactExports.useEffect(() => {
    setShowcaseBatch((current2) =>
      current2.length ? current2 : pickRecommendationBatch(showcaseItems),
    );
  }, [showcaseItems]);
  reactExports.useEffect(() => {
    setSkillBatch((current2) =>
      current2.length
        ? current2
        : pickRecommendationBatch(
            featuredSkills.map((skill) => ({
              ...skill,
              id: skill.name,
            })),
          ),
    );
  }, [featuredSkills]);
  const handleRefresh = () => {
    if (tab2 === "showcase") {
      setShowcaseBatch((current2) =>
        pickRecommendationBatch(
          showcaseItems,
          current2.map((item) => item.id),
        ),
      );
      return;
    }
    setSkillBatch((current2) =>
      pickRecommendationBatch(
        featuredSkills.map((skill) => ({
          ...skill,
          id: skill.name,
        })),
        current2.map((skill) => skill.name),
      ),
    );
  };
  const handleSkillSelect = reactExports.useCallback(
    async (skill, prompt) => {
      if (!loginGuard() || installingSkillRef.current) return;
      installingSkillRef.current = skill.name;
      setInstallingSkillName(skill.name);
      setInstallingSkillProgress(0.08);
      try {
        const ready = await ensureSkillReady(skill.name, setInstallingSkillProgress);
        if (!ready) return;
        market.markInstalled(skill.name);
        setSkillBatch((current2) =>
          current2.map((item) =>
            item.name === skill.name
              ? {
                  ...item,
                  installed: true,
                }
              : item,
          ),
        );
        onSelectSkill(skill, prompt);
      } finally {
        if (installingSkillRef.current === skill.name) {
          installingSkillRef.current = null;
          setInstallingSkillName(null);
          setInstallingSkillProgress(null);
        }
      }
    },
    [ensureSkillReady, loginGuard, market, onSelectSkill],
  );
  const hasCards = tab2 === "showcase" ? showcaseBatch.length > 0 : skillBatch.length > 0;
  const greetingName = user?.username?.trim() || t2("chat.emptyRecommendations.creator");
  const subtitleKey = skillMode
    ? EMPTY_RECOMMENDATIONS_SUBTITLE_KEYS[skillMode]
    : "chat.emptyRecommendations.subtitle";
  const recommendationTabs = skillMode ? ["skill"] : ["showcase", "skill"];
  const skillTabLabel = skillMode
    ? t2(NODE_AGENT_SKILL_TAB_KEYS[skillMode])
    : t2("chat.emptyRecommendations.skillTab");
  const nodeIntro = skillMode ? t2(NODE_AGENT_INTRO_KEYS[skillMode]) : void 0;
  return (
    <section
      className={`w-full px-4 ${nodeIntro ? "pt-[100px] pb-4" : "py-4"}`}
      data-action-ui-id="chat-empty-recommendations"
    >
      <div
        className="@container/empty-recommendations mx-auto flex w-full flex-col gap-4"
        style={{
          maxWidth: `${CHAT_CONTENT_MAX_WIDTH_PX}px`,
        }}
      >
        <div className="flex items-center gap-3">
          <HubLogo size={36} winkOnHover={true} className="shrink-0 text-brand-accent" />
          <div>
            <h2 className="text-title-20 font-heading font-medium text-foreground">
              {t2("chat.emptyRecommendations.greeting", {
                name: greetingName,
              })}
            </h2>
            <p className="text-body-13 text-muted-foreground">{t2(subtitleKey)}</p>
          </div>
        </div>
        {nodeIntro && (
          <div className="mt-2 text-body-15 text-foreground/80">
            <MarkdownContent content={nodeIntro} />
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div
            className={`inline-flex shrink-0 items-center gap-1 rounded-sm ${skillMode ? "" : "bg-tab-list-bg p-1"}`}
            role="tablist"
          >
            {recommendationTabs.map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab2 === value}
                onClick={() => setTab(value)}
                className={`inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-sm px-3 text-xs font-medium transition-colors ${skillMode ? "bg-tab-list-bg text-foreground" : "text-muted-foreground hover:text-foreground aria-selected:bg-tab-active-bg aria-selected:text-foreground aria-selected:shadow-tab-active"}`}
              >
                {value === "showcase" ? t2("chat.emptyRecommendations.showcaseTab") : skillTabLabel}
              </button>
            ))}
          </div>
          <Button$1
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={!hasCards}
            aria-label={t2("chat.emptyRecommendations.refresh")}
            data-action-ui-id="chat-empty-recommendations-refresh"
            className="h-7 shrink-0 gap-1.5 whitespace-nowrap px-2 text-xs text-muted-foreground"
          >
            <RetryIcon size={14} aria-hidden="true" />
            <span className="hidden @min-[400px]/empty-recommendations:inline">
              {t2("chat.emptyRecommendations.refresh")}
            </span>
          </Button$1>
        </div>
        <div className="@container/recommendations min-h-[128px]" role="tabpanel">
          <div
            className={`${skillMode ? "grid grid-cols-2" : "grid grid-cols-1 @min-[480px]/recommendations:grid-cols-2"} auto-rows-[60px] gap-2`}
            data-action-ui-id="chat-empty-recommendations-grid"
          >
            {tab2 === "showcase"
              ? showcaseBatch.map((item) => (
                  <ShowcaseCard
                    key={item.id}
                    item={item}
                    isZh={isZh}
                    useLabel={t2("home.mediaShowcase.use")}
                    fullscreenLabel={t2("canvas.fullscreenPreview")}
                    onClick={() => onSelectShowcase(item)}
                    onFullscreen={(initialPlaybackTime, onPlaybackTimeCommit) =>
                      setPreviewSession({
                        item,
                        initialPlaybackTime,
                        onPlaybackTimeCommit,
                      })
                    }
                  />
                ))
              : skillBatch.map((skill) => {
                  const preset2 = featuredCategory?.skills.find((item) => item.name === skill.name);
                  return (
                    <SkillCard
                      key={skill.name}
                      skill={skill}
                      isZh={isZh}
                      useLabel={t2("home.mediaShowcase.useSkill")}
                      installingLabel={t2("skills.market.installing")}
                      installing={installingSkillName === skill.name}
                      installProgress={
                        installingSkillName === skill.name ? installingSkillProgress : null
                      }
                      disabled={installingSkillName !== null}
                      textOnly={Boolean(skillMode)}
                      onClick={() =>
                        void handleSkillSelect(
                          skill,
                          resolveHomeFeaturedSkillPrompt(skill, preset2, isZh),
                        )
                      }
                    />
                  );
                })}
          </div>
        </div>
      </div>
      {previewSession ? (
        <VideoLightbox
          src={previewSession.item.videoUrl}
          ariaLabel={isZh ? previewSession.item.title : previewSession.item.titleEn}
          showShadow={false}
          initialPlaybackTime={previewSession.initialPlaybackTime}
          onPlaybackTimeCommit={previewSession.onPlaybackTimeCommit}
          onClose={() => setPreviewSession(null)}
        />
      ) : null}
    </section>
  );
}
function ShowcaseCard({ item, isZh, useLabel, fullscreenLabel, onClick, onFullscreen }) {
  const videoRef = reactExports.useRef(null);
  const title = isZh ? item.title : item.titleEn;
  const previewStart = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => void 0);
  };
  const previewStop = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  };
  const handlePreview = (event) => {
    event.stopPropagation();
    const video = videoRef.current;
    const initialPlaybackTime = video?.currentTime ?? 0;
    video?.pause();
    onFullscreen(initialPlaybackTime, (currentTime) => {
      const inlineVideo = videoRef.current;
      if (!inlineVideo) return;
      inlineVideo.currentTime = currentTime;
    });
  };
  return (
    <article
      className="home-media-showcase-card group relative flex h-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-border bg-card p-2 text-left transition-colors hover:bg-muted"
      data-action-ui-id="chat-showcase-card"
      onMouseEnter={previewStart}
      onMouseLeave={previewStop}
    >
      <button
        type="button"
        className="absolute inset-0 z-[1] cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        aria-label={`${useLabel}: ${title}`}
        onClick={onClick}
        data-action-ui-id="chat-showcase-card-use"
      />
      <div className="home-media-showcase-media-frame pointer-events-none relative z-[2] h-full w-16 shrink-0 overflow-hidden rounded-md bg-muted">
        {item.videoUrl ? (
          <video
            ref={videoRef}
            src={item.videoUrl}
            poster={item.coverUrl}
            muted={true}
            loop={true}
            playsInline={true}
            preload="metadata"
            aria-label={title}
            data-home-media-loaded="true"
            className="home-media-showcase-media h-full w-full object-cover"
          />
        ) : item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt=""
            loading="lazy"
            data-home-media-loaded="true"
            className="home-media-showcase-media h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOutlineIcon size={24} strokeWidth={1.5} />
          </span>
        )}
        {item.videoUrl ? (
          <Button$1
            type="button"
            variant="ghost"
            size="icon-sm"
            className="bg-transparent! p-0 hover:opacity-90 pointer-events-none absolute inset-0 z-[3] m-auto size-7 rounded-full border-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
            aria-label={`${fullscreenLabel}: ${title}`}
            onClick={handlePreview}
            data-action-ui-id="chat-showcase-card-preview"
          >
            <PlaybackPlayIcon$1
              size={16}
              className="text-[var(--media-overlay-foreground)] drop-shadow-sm"
            />
          </Button$1>
        ) : null}
      </div>
      <h3 className="line-clamp-2 min-w-0 flex-1 whitespace-normal px-1 text-xs font-medium leading-4 text-foreground [overflow-wrap:anywhere]">
        {title}
      </h3>
    </article>
  );
}
function SkillCard({
  skill,
  isZh,
  useLabel,
  installingLabel,
  installing,
  installProgress,
  disabled: disabled2,
  textOnly,
  onClick,
}) {
  const title = isZh
    ? skill.displayNameZh || toDisplayName$1(skill.name)
    : toDisplayName$1(skill.name);
  const normalizedProgress = Math.min(1, Math.max(0, installProgress ?? 0.08));
  return (
    <article
      className={`home-media-showcase-card group relative flex h-full min-w-0 items-center gap-2 overflow-hidden p-2 text-left transition-colors ${textOnly ? "rounded-none border-0 bg-transparent hover:bg-transparent" : "rounded-lg border border-border bg-card hover:bg-muted"}`}
      data-action-ui-id="chat-skill-card"
      data-installing={installing ? "true" : void 0}
      aria-disabled={disabled2 || void 0}
      aria-busy={installing || void 0}
    >
      <button
        type="button"
        className="absolute inset-0 z-[1] cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-default"
        aria-label={`${installing ? installingLabel : useLabel}: ${title}`}
        onClick={onClick}
        disabled={disabled2}
        data-action-ui-id="chat-skill-card-use"
      />
      {textOnly ? null : (
        <div className="home-media-showcase-media-frame relative h-full w-16 shrink-0 overflow-hidden rounded-md bg-muted">
          <div className="home-media-showcase-media h-full w-full" data-home-media-loaded="true">
            <SkillCoverMedia
              url={resolveSkillCoverUrl(skill)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          {installing ? (
            <span
              className="home-skill-install-indicator pointer-events-none absolute inset-0 z-[4] m-auto size-7"
              style={{
                "--home-skill-install-angle": `${Math.round(normalizedProgress * 360)}deg`,
              }}
              role="progressbar"
              aria-label={`${installingLabel}: ${title}`}
              aria-valuemin={0}
              aria-valuemax={1}
              aria-valuenow={normalizedProgress}
            />
          ) : null}
        </div>
      )}
      <h3
        className={`line-clamp-2 min-w-0 flex-1 whitespace-normal px-1 text-xs font-medium leading-4 text-foreground [overflow-wrap:anywhere] ${textOnly ? "text-center" : ""}`}
      >
        {textOnly && installing ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Spinner
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-label={`${installingLabel}: ${title}`}
              data-action-ui-id="chat-skill-card-loading"
            />
            <span>{title}</span>
          </span>
        ) : (
          title
        )}
      </h3>
    </article>
  );
}
const BRAILLE_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const WAVE_FRAMES = ["⠁⠂⠄⡀", "⠂⠄⡀⢀", "⠄⡀⢀⠠", "⡀⢀⠠⠐", "⢀⠠⠐⠈", "⠠⠐⠈⠁", "⠐⠈⠁⠂", "⠈⠁⠂⠄"];
const DNA_FRAMES = [
  "⠋⠉⠙⠚",
  "⠉⠙⠚⠒",
  "⠙⠚⠒⠂",
  "⠚⠒⠂⠂",
  "⠒⠂⠂⠒",
  "⠂⠂⠒⠲",
  "⠂⠒⠲⠴",
  "⠒⠲⠴⠤",
  "⠲⠴⠤⠄",
  "⠴⠤⠄⠋",
  "⠤⠄⠋⠉",
  "⠄⠋⠉⠙",
];
const SPINNERS = {
  braille: {
    frames: BRAILLE_FRAMES,
    interval: 80,
  },
  wave: {
    frames: WAVE_FRAMES,
    interval: 100,
  },
  dna: {
    frames: DNA_FRAMES,
    interval: 80,
  },
};
export function BrailleSpinner({ type: type2 = "braille", className = "" }) {
  const [frame2, setFrame2] = reactExports.useState(0);
  const spinner = SPINNERS[type2];
  reactExports.useEffect(() => {
    const timer2 = setInterval(() => {
      setFrame2((f2) => (f2 + 1) % spinner.frames.length);
    }, spinner.interval);
    return () => clearInterval(timer2);
  }, [spinner]);
  return <span className={`font-mono inline-block ${className}`}>{spinner.frames[frame2]}</span>;
}
export function ChatEmptyState(props) {
  const { t: t2 } = useTranslation();
  const pendingFirstMessage = usePendingFirstMessage();
  const starting = useChatReadiness() === "starting";
  const composerHasText = useWorkspaceChatSelector((chat) => chat.input.trim().length > 0);
  if (!pendingFirstMessage || composerHasText) {
    return <EmptyChatRecommendations {...props} />;
  }
  return (
    <div className="flex w-full min-w-0 flex-col gap-3 py-4">
      <div
        data-action-ui-id="chat-message-user-pending"
        className="group/user px-4 flex flex-col items-end"
      >
        <div className="relative inline-flex max-w-3/4">
          <div className="max-h-[40vh] overflow-y-auto bg-foreground/5 px-3.5 py-2.5 rounded-xl text-body-15 font-normal text-foreground whitespace-pre-wrap break-words">
            {pendingFirstMessage}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 px-4 text-body-14 text-muted-foreground">
        <BrailleSpinner type="braille" className="text-xs text-tertiary" />
        <span className="text-shimmer text-muted-foreground">
          {starting
            ? t2("chat.pendingFirstMessage.preparingRuntime", "Preparing your workspace...")
            : t2("chat.pendingFirstMessage.sending", "Sending your message...")}
        </span>
      </div>
    </div>
  );
}
export function sessionDisplayName(session, t2) {
  if (session.name === DEFAULT_SESSION_NAME)
    return t2("chat.newChat", {
      defaultValue: "New Chat",
    });
  if (session.name) return redactForCurrentRegion(session.name);
  return t2("chat.sessionFallback", {
    id: session.id.slice(0, 6),
  });
}
export function FourCornerLoading({ variant, size: size2 = "md", label, className }) {
  const classes = cn$2("four-corner-loading", `is-${variant}`, `is-${size2}`, className);
  const dots = (
    <>
      <span className="four-corner-loading-dot" />
      <span className="four-corner-loading-dot" />
      <span className="four-corner-loading-dot" />
      <span className="four-corner-loading-dot" />
    </>
  );
  if (label) {
    return (
      <span className={classes} role="status" aria-label={label}>
        {dots}
      </span>
    );
  }
  return (
    <span className={classes} aria-hidden={true}>
      {dots}
    </span>
  );
}
function ChatTabLoadingIndicator() {
  const { t: t2 } = useTranslation();
  return (
    <FourCornerLoading
      variant="tab"
      size="sm"
      label={t2("session.tabs.status.generating", "Generating")}
      className="ml-1"
    />
  );
}
const IMAGE_TYPES = new Set(["image"]);
const VIDEO_TYPES = new Set(["video"]);
const AUDIO_TYPES = new Set(["audio", "music"]);
const AGENT_TYPES = new Set(["agent"]);
function bucketSessionCost(cost) {
  let image2 = 0;
  let video = 0;
  let audio = 0;
  let agent2 = 0;
  for (const item of cost.items) {
    if (IMAGE_TYPES.has(item.mediaType)) image2 += item.amount;
    else if (VIDEO_TYPES.has(item.mediaType)) video += item.amount;
    else if (AUDIO_TYPES.has(item.mediaType)) audio += item.amount;
    else if (AGENT_TYPES.has(item.mediaType)) agent2 += item.amount;
  }
  const other = cost.totalAmount - image2 - video - audio - agent2;
  return {
    image: image2,
    video,
    audio,
    agent: agent2,
    other: Math.max(0, other),
    total: cost.totalAmount,
  };
}
const ALWAYS_VISIBLE = ["image", "video", "audio"];
const CONDITIONAL = ["agent", "other"];
function visibleCostCategories(buckets2) {
  const rows = ALWAYS_VISIBLE.map((key2) => ({
    key: key2,
    amount: buckets2[key2],
  }));
  for (const key2 of CONDITIONAL) {
    if (buckets2[key2] > 0)
      rows.push({
        key: key2,
        amount: buckets2[key2],
      });
  }
  return rows;
}
function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
function mapResult(raw2) {
  if (typeof raw2 !== "object" || raw2 === null)
    return {
      totalAmount: 0,
      items: [],
    };
  const record2 = raw2;
  const rawItems = Array.isArray(record2.items) ? record2.items : [];
  return {
    totalAmount: toNumber(record2.total_amount),
    items: rawItems.flatMap((entry) => {
      if (typeof entry !== "object" || entry === null) return [];
      const item = entry;
      const mediaType = typeof item.media_type === "string" ? item.media_type : "";
      if (!mediaType) return [];
      return [
        {
          mediaType,
          amount: toNumber(item.amount),
        },
      ];
    }),
  };
}
const SESSION_COST_CHUNK_SIZE = 500;
function chunk(items, size2) {
  const out = [];
  for (let i2 = 0; i2 < items.length; i2 += size2) out.push(items.slice(i2, i2 + size2));
  return out;
}
function mergeSessionCosts(parts) {
  const amountByMedia = new Map();
  let totalAmount = 0;
  for (const part of parts) {
    totalAmount += part.totalAmount;
    for (const item of part.items) {
      amountByMedia.set(item.mediaType, (amountByMedia.get(item.mediaType) ?? 0) + item.amount);
    }
  }
  return {
    totalAmount,
    items: [...amountByMedia].map(([mediaType, amount]) => ({
      mediaType,
      amount,
    })),
  };
}
async function fetchSessionCostChunk(sessionIds, signal) {
  const res = await gatewayFetch("/api/v1/billing/session-cost", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_ids: sessionIds,
    }),
    signal,
  });
  const raw2 = await res.json();
  signal?.throwIfAborted();
  return mapResult(raw2);
}
async function fetchSessionCost(sessionIds, options) {
  if (sessionIds.length === 0)
    return {
      totalAmount: 0,
      items: [],
    };
  const batches = chunk(sessionIds, SESSION_COST_CHUNK_SIZE);
  const parts = await Promise.all(
    batches.map((batch2) => fetchSessionCostChunk(batch2, options?.signal)),
  );
  return mergeSessionCosts(parts);
}
const SESSION_TREE_TIMEOUT_MS = 3e3;
let requestSeq = 0;
function requestSessionTree(ws2, sessionId, signal) {
  return new Promise((resolve, reject) => {
    if (!sessionId) {
      resolve([]);
      return;
    }
    signal?.throwIfAborted();
    requestSeq += 1;
    const requestId = `session-tree-${requestSeq}`;
    let settled = false;
    const finish = (fn2) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer2);
      unsubscribe();
      signal?.removeEventListener("abort", onAbort);
      fn2();
    };
    const onAbort = () => finish(() => reject(signal?.reason ?? new Error("aborted")));
    const unsubscribe = ws2.subscribe((msg) => {
      if (msg.type !== "session_tree" || msg.request_id !== requestId) return;
      if (msg.incomplete) {
        finish(() => reject(new Error(`session tree is incomplete for ${sessionId}`)));
      } else {
        finish(() => resolve(msg.session_ids));
      }
    });
    const timer2 = setTimeout(() => {
      finish(() => reject(new Error(`session tree request timed out for ${sessionId}`)));
    }, SESSION_TREE_TIMEOUT_MS);
    signal?.addEventListener("abort", onAbort);
    const sent = ws2.send({
      type: "get_session_tree",
      request_id: requestId,
      session_id: sessionId,
    });
    if (!sent) {
      finish(() => reject(new Error("gateway not connected")));
    }
  });
}
const STALE_TIME_MS = 1e3;
export function useSessionCost(session, enabled) {
  const ws2 = useWSConnection();
  const runtimeSessionId = session.runtime_session_id ?? session.id;
  const query = useQuery({
    queryKey: ["credit", "session-cost", runtimeSessionId],
    enabled: enabled && !!runtimeSessionId,
    staleTime: STALE_TIME_MS,
    retry: false,
    queryFn: async ({ signal }) => {
      const sessionIds = await requestSessionTree(ws2, runtimeSessionId, signal);
      const cost = await fetchSessionCost(sessionIds, {
        signal,
      });
      return cost;
    },
  });
  if (query.data)
    return {
      status: "ready",
      buckets: bucketSessionCost(query.data),
    };
  if (query.isError)
    return {
      status: "error",
    };
  return {
    status: "loading",
  };
}
const OPEN_DELAY_MS = 400;
const CLOSE_DELAY_MS = 120;
export function SessionCostPopover({ session, children: children2 }) {
  const { t: t2 } = useTranslation();
  const [hovering, setHovering] = reactExports.useState(false);
  const timerRef = reactExports.useRef(null);
  const visible = useSessionCostVisible(session);
  const state2 = useSessionCost(session, hovering && visible);
  const clearTimer2 = reactExports.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  const schedule2 = reactExports.useCallback(
    (next2, delay) => {
      clearTimer2();
      timerRef.current = setTimeout(() => setHovering(next2), delay);
    },
    [clearTimer2],
  );
  reactExports.useEffect(() => clearTimer2, [clearTimer2]);
  if (!visible) return <>{children2}</>;
  const hasContent2 =
    state2.status === "error" || (state2.status === "ready" && state2.buckets.total > 0);
  return (
    <Popover
      open={hovering && hasContent2}
      onOpenChange={() => {
        clearTimer2();
        setHovering(false);
      }}
    >
      <PopoverTrigger
        render={children2}
        nativeButton={false}
        aria-haspopup="dialog"
        onMouseEnter={() => schedule2(true, OPEN_DELAY_MS)}
        onMouseLeave={() => schedule2(false, CLOSE_DELAY_MS)}
      />
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-[200px] p-3"
        onMouseEnter={clearTimer2}
        onMouseLeave={() => schedule2(false, CLOSE_DELAY_MS)}
      >
        <div className="mb-2 border-b border-border pb-2">
          <div className="text-sm font-medium text-foreground">
            {t2("session.cost.title", "Credits used")}
          </div>
          <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {t2("session.cost.scopeNote", "Only includes usage generated within this chat")}
          </div>
        </div>
        {state2.status === "ready" ? (
          <CostBreakdown buckets={state2.buckets} />
        ) : (
          <div className="text-[13px] text-muted-foreground">
            {t2("session.cost.unavailable", "Temporarily unavailable")}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
function CostBreakdown({ buckets: buckets2 }) {
  const { t: t2 } = useTranslation();
  const labels = {
    image: t2("session.cost.image", "Image"),
    video: t2("session.cost.video", "Video"),
    audio: t2("session.cost.audio", "Audio"),
    agent: t2("session.cost.agent", "Agent"),
    other: t2("session.cost.other", "Other"),
  };
  const rows = visibleCostCategories(buckets2);
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center justify-between text-[13px]">
          <span className="text-muted-foreground">{labels[row.key]}</span>
          <span className="tabular-nums text-foreground/70">{row.amount}</span>
        </div>
      ))}
      <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5 text-[13px]">
        <span className="text-foreground/70">{t2("session.cost.total", "Total")}</span>
        <span className="tabular-nums font-medium text-foreground">{buckets2.total}</span>
      </div>
    </div>
  );
}
export const SessionTab = reactExports.memo(function SessionTab2({
  session,
  active: active2,
  status,
  hideClose = false,
  onActivate,
  onClose,
  onRename,
}) {
  const { t: t2 } = useTranslation();
  const title = sessionDisplayName(session, t2);
  const [renaming, setRenaming] = reactExports.useState(false);
  const handleClose = (e2) => {
    e2.stopPropagation();
    onClose(session.id);
  };
  const handleActivate = () => {
    if (!active2) onActivate(session.id);
  };
  const handleRenameConfirm = reactExports.useCallback(
    (name2) => {
      const trimmed = name2.trim();
      if (trimmed && trimmed !== title) onRename(session.id, trimmed);
      setRenaming(false);
    },
    [onRename, session.id, title],
  );
  const handleMouseDown2 = (e2) => {
    if (e2.button === 1 && !hideClose) {
      e2.preventDefault();
      onClose(session.id);
    }
  };
  return (
    <ContextMenu>
      <SessionCostPopover session={session}>
        <ContextMenuTrigger
          data-action-ui-id={`session-tab-${session.id}`}
          data-window-drag-region="no-drag"
          className={cn$2(
            "no-drag group/tab relative flex h-7 w-full cursor-pointer select-none items-center rounded-md px-2 transition-colors duration-150 ease-out",
            active2
              ? "bg-foreground/[0.08] text-foreground"
              : "bg-transparent text-foreground/55 hover:bg-foreground/[0.05] hover:text-foreground",
          )}
        >
          {renaming ? (
            <div className="relative z-10 flex h-full min-w-0 flex-1 items-center pr-1.5">
              <InlineRenameInput
                initialName={title}
                maxLength={MAX_SESSION_NAME_LENGTH}
                className="text-[13px] font-normal leading-none"
                onConfirm={handleRenameConfirm}
                onCancel={() => setRenaming(false)}
              />
            </div>
          ) : (
            <button
              type="button"
              role="tab"
              aria-selected={active2}
              tabIndex={active2 ? 0 : -1}
              onClick={handleActivate}
              onMouseDown={handleMouseDown2}
              onDoubleClick={(event) => {
                event.stopPropagation();
                setRenaming(true);
              }}
              className={cn$2(
                "flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left transition-colors",
                hideClose ? "pr-0" : active2 ? "pr-5" : "pr-0 group-hover/tab:pr-5",
              )}
            >
              <span
                data-action-ui-id={`session-tab-title-${session.id}`}
                title={title}
                className="min-w-0 flex-1 truncate text-[13px] font-normal leading-normal"
              >
                {title}
              </span>
              {!active2 && status.kind !== "idle" && (
                <span className={cn$2("flex shrink-0 items-center", "group-hover/tab:hidden")}>
                  <TabStatusBadge status={status} active={active2} />
                </span>
              )}
            </button>
          )}
          {!renaming && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={handleClose}
                    onDoubleClick={(event) => event.stopPropagation()}
                    aria-label={t2("session.tabs.close.tooltip", "Close tab")}
                    data-action-ui-id={`session-tab-close-${session.id}`}
                    className={cn$2(
                      "absolute right-1 top-1/2 z-20 size-5 -translate-y-1/2 items-center justify-center rounded-sm transition-opacity",
                      "text-foreground/40 hover:bg-foreground/10 hover:text-foreground",
                      hideClose && "hidden",
                      !hideClose &&
                        (active2
                          ? "flex opacity-100"
                          : "hidden opacity-0 group-hover/tab:flex group-hover/tab:opacity-100 focus-visible:flex focus-visible:opacity-100"),
                    )}
                  />
                }
              >
                <Icon icon={X$7} size="xs" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t2("session.tabs.close.tooltip", "Close tab")}
              </TooltipContent>
            </Tooltip>
          )}
        </ContextMenuTrigger>
      </SessionCostPopover>
      <ContextMenuContent>
        <ContextMenuItem
          data-action-ui-id={`session-tab-rename-${session.id}`}
          onClick={() => setRenaming(true)}
        >
          <Pencil />
          {t2("common.rename")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});
function TabStatusBadge({ status, active: active2 }) {
  const { t: t2 } = useTranslation();
  if (active2) return null;
  switch (status.kind) {
    case "needs-user-action": {
      const needsAnswer = status.action === "answer";
      const label = needsAnswer
        ? t2("session.tabs.status.awaitingAnswer", "Waiting for your answer")
        : t2("session.tabs.status.awaitingConfirmation", "Waiting for your confirmation");
      return (
        <span
          role="status"
          aria-label={label}
          title={label}
          className="inline-flex size-4 shrink-0 items-center justify-center text-foreground/70"
        >
          {needsAnswer ? (
            <QuestionPromptIcon className="size-3.5 text-foreground/70" />
          ) : (
            <Icon icon={CircleAlert} size="sm" />
          )}
        </span>
      );
    }
    case "failed":
      return (
        <span className="inline-flex items-center h-4 px-1.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive shrink-0">
          {t2("session.tabs.badge.failed", "Failed")}
        </span>
      );
    case "blocked":
      return (
        <span className="inline-flex items-center h-4 px-1.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive shrink-0">
          {t2("session.tabs.badge.paused", "Paused")}
        </span>
      );
    case "running":
      return <ChatTabLoadingIndicator />;
    case "unread":
      return (
        <span
          role="status"
          aria-label={t2("session.tabs.status.completedUnread", "Completed, unread")}
          className="size-[5px] shrink-0 rounded-full bg-brand-accent"
        />
      );
    default:
      return null;
  }
}
