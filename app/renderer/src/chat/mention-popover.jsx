// mention-popover.jsx
import {
  classifyFileType,
  reactDomExports,
  reactExports,
  useTranslation,
  Workflow,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ConnectorIcon } from "../settings/connector-relationship-graphic.jsx";
import {
  FileKindIcon,
  ModelTypeIcon,
} from "./use-composer-placeholder-actions.jsx";
import { withThumbnail } from "../workspace/tool-label-definitions.js";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import { useGatewayUrl } from "../generation/use-model-catalog-scope-key.js";
import { PageStateBoundary } from "../assets/page-state-boundary.jsx";
import { Button, cn$2 as cn } from "../infra/dialog-content.jsx";
import { AssetMentionList } from "../assets/asset-mention-list.jsx";
import { Tabs, TabsList, TabsTrigger } from "../workspace/shortcut-hint.jsx";
import { MESSAGE_INPUT_POPOVER_Z_INDEX } from "../assets/classify-upload-error.js";
const POPOVER_FALLBACK_WIDTH = 380;
const HOME_POPOVER_GAP = 4;
const THUMB_PX = 24;
const BODY_MAX_H = 336;
const BODY_MIN_H = 160;
const VIEWPORT_GAP = 12;
const POPOVER_CHROME_H = 70;
const ASSET_LIST_MAX_H = 280;
const TABS = [
  {
    key: "references",
    labelKey: "mention.popover.tabReferences",
    fallback: "References",
  },
  {
    key: "connectors",
    labelKey: "mention.popover.connectors",
    fallback: "Plugins",
  },
  {
    key: "files",
    labelKey: "mention.popover.files",
    fallback: "Files",
  },
  {
    key: "project-assets",
    labelKey: "mention.popover.tabProjectAssets",
    fallback: "Project Assets",
  },
  {
    key: "assets",
    labelKey: "mention.popover.tabAssets",
    fallback: "Subject Library",
  },
  {
    key: "workflows",
    labelKey: "mention.popover.workflows",
    fallback: "Workflows",
  },
];
const FILE_KIND_FILTERS = [
  {
    kind: "image",
    labelKey: "assetFilter.typeImage",
    fallback: "Image",
  },
  {
    kind: "video",
    labelKey: "assetFilter.typeVideo",
    fallback: "Video",
  },
  {
    kind: "audio",
    labelKey: "assetFilter.typeAudio",
    fallback: "Audio",
  },
  {
    kind: "text",
    labelKey: "assetFilter.typeText",
    fallback: "Text",
  },
  {
    kind: "other",
    labelKey: "assetFilter.typeOther",
    fallback: "Other",
  },
];
function buildMentionThumbUrl(
  gatewayUrl2,
  kind,
  workspaceRelativePath,
  displayWidth,
) {
  if (kind === "audio" || kind === "text" || kind === "other") return void 0;
  const encoded = workspaceRelativePath
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  const prefix = kind === "image" ? "/files/" : "/api/thumbnail/";
  const base2 = gatewayUrl2(`${prefix}${encoded}`);
  return withThumbnail(base2, displayWidth);
}
const MentionThumb = reactExports.memo(function MentionThumb2({ item }) {
  const gatewayUrl2 = useGatewayUrl();
  const url2 = buildMentionThumbUrl(
    gatewayUrl2,
    item.kind,
    item.path,
    THUMB_PX,
  );
  const [errored, setErrored] = reactExports.useState(false);
  const wrapperCls =
    "flex-shrink-0 flex items-center justify-center rounded-sm bg-muted/40 overflow-hidden";
  const wrapperStyle2 = {
    width: THUMB_PX,
    height: THUMB_PX,
  };
  if (!url2 || errored) {
    return (
      <span className={wrapperCls} style={wrapperStyle2}>
        {(item.kind === "image" ||
          item.kind === "video" ||
          item.kind === "audio") &&
        classifyFileType({
          filename: item.name,
        }).category !== "photoshop" ? (
          <FileKindIcon
            kind={item.kind}
            className="size-4 text-muted-foreground"
          />
        ) : (
          <FileTypeIcon
            {...classifyFileType({
              filename: item.name,
            })}
            size={16}
            decorative={true}
          />
        )}
      </span>
    );
  }
  return (
    <span className={wrapperCls} style={wrapperStyle2}>
      <img
        src={url2}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="w-full h-full object-cover"
        onError={() => setErrored(true)}
      />
    </span>
  );
});
MentionThumb.displayName = "MentionThumb";
const ModelIcon = reactExports.memo(function ModelIcon2({ model }) {
  const [errored, setErrored] = reactExports.useState(false);
  const wrapperCls =
    "flex-shrink-0 flex items-center justify-center rounded-sm bg-muted/40 overflow-hidden";
  const wrapperStyle2 = {
    width: THUMB_PX,
    height: THUMB_PX,
  };
  if (!model.iconUrl || errored) {
    return (
      <span className={wrapperCls} style={wrapperStyle2}>
        <ModelTypeIcon mediaType={model.mediaType} />
      </span>
    );
  }
  return (
    <span className={wrapperCls} style={wrapperStyle2}>
      <img
        src={model.iconUrl}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="w-full h-full object-cover"
        onError={() => setErrored(true)}
      />
    </span>
  );
});
ModelIcon.displayName = "ModelIcon";
function EmptyState({ text: text2 }) {
  return (
    <PageStateBoundary
      empty={true}
      density="compact"
      emptyOptions={{
        text: text2,
      }}
    />
  );
}
const MentionFileRow = reactExports.memo(function MentionFileRow2({
  item,
  gi,
  isActive: isActive2,
  onSelect,
  onHover,
}) {
  const handleClick2 = reactExports.useCallback(
    () => onSelect(item),
    [onSelect, item],
  );
  const handleHover = reactExports.useCallback(
    () => onHover(gi),
    [onHover, gi],
  );
  return (
    <button
      id={`mention-opt-${gi}`}
      type="button"
      role="option"
      aria-selected={isActive2}
      data-action-ui-id={`mention-opt-${gi}`}
      className={`w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer transition-colors ${isActive2 ? "bg-popup-item-active text-foreground" : "hover:bg-popup-item-hover"}`}
      onClick={handleClick2}
      onMouseEnter={handleHover}
    >
      <MentionThumb item={item.file} />
      <span className="text-sm text-foreground font-medium truncate min-w-0 flex-1">
        {item.file.name}
      </span>
    </button>
  );
});
MentionFileRow.displayName = "MentionFileRow";
const MentionModelRow = reactExports.memo(function MentionModelRow2({
  item,
  gi,
  isActive: isActive2,
  isSearching,
  onSelect,
  onHover,
}) {
  const handleClick2 = reactExports.useCallback(
    () => onSelect(item),
    [onSelect, item],
  );
  const handleHover = reactExports.useCallback(
    () => onHover(gi),
    [onHover, gi],
  );
  return (
    <button
      id={`mention-opt-${gi}`}
      type="button"
      role="option"
      aria-selected={isActive2}
      data-action-ui-id={`mention-opt-${gi}`}
      className={`w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer transition-colors ${isActive2 ? "bg-popup-item-active text-foreground" : "hover:bg-popup-item-hover"}`}
      onClick={handleClick2}
      onMouseEnter={handleHover}
    >
      <ModelIcon model={item.model} />
      <span className="text-sm text-foreground font-medium truncate min-w-0 flex-1">
        {item.model.displayName}
      </span>
      {isSearching && (
        <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider shrink-0">
          {item.model.mediaType}
        </span>
      )}
    </button>
  );
});
MentionModelRow.displayName = "MentionModelRow";
const MentionConnectorRow = reactExports.memo(function MentionConnectorRow2({
  item,
  gi,
  isActive: isActive2,
  onSelect,
  onHover,
}) {
  const handleClick2 = reactExports.useCallback(
    () => onSelect(item),
    [onSelect, item],
  );
  const handleHover = reactExports.useCallback(
    () => onHover(gi),
    [onHover, gi],
  );
  return (
    <button
      id={`mention-opt-${gi}`}
      type="button"
      role="option"
      aria-selected={isActive2}
      data-action-ui-id={`mention-connector-${item.connector.serverName}`}
      className={`w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer transition-colors ${isActive2 ? "bg-popup-item-active text-foreground" : "hover:bg-popup-item-hover"}`}
      onClick={handleClick2}
      onMouseEnter={handleHover}
    >
      <ConnectorIcon iconUrl={item.connector.iconUrl} size="list" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {item.connector.displayName}
      </span>
    </button>
  );
});
MentionConnectorRow.displayName = "MentionConnectorRow";
const MentionWorkflowRow = reactExports.memo(function MentionWorkflowRow2({
  item,
  gi,
  isActive: isActive2,
  onSelect,
  onHover,
}) {
  const { t: t2 } = useTranslation();
  const handleClick2 = reactExports.useCallback(
    () => onSelect(item),
    [onSelect, item],
  );
  const handleHover = reactExports.useCallback(
    () => onHover(gi),
    [onHover, gi],
  );
  const title =
    item.context === "current-canvas" && item.workflow.copyOrdinal
      ? `${item.workflow.title} · ${t2(
          "canvas.comfyui.copySuffix",
          "Copy {{index}}",
          {
            index: item.workflow.copyOrdinal,
          },
        )}`
      : item.workflow.title;
  return (
    <button
      id={`mention-opt-${gi}`}
      type="button"
      role="option"
      aria-selected={isActive2}
      data-action-ui-id={`mention-workflow-${item.canvasNodeId ?? item.workflow.id}`}
      className={`w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer transition-colors ${isActive2 ? "bg-popup-item-active text-foreground" : "hover:bg-popup-item-hover"}`}
      onClick={handleClick2}
      onMouseEnter={handleHover}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-muted/40">
        <Workflow
          size={14}
          strokeWidth={1.5}
          className="text-muted-foreground"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">
          {title}
        </span>
        {item.context === "current-canvas" && item.workflow.short_desc && (
          <span className="block truncate text-xs text-muted-foreground">
            {item.workflow.short_desc}
          </span>
        )}
      </span>
      <span className="shrink-0 text-[10px] text-muted-foreground/60">
        {item.context === "current-canvas"
          ? t2("mention.popover.currentCanvasWorkflow", "Current Canvas")
          : t2("mention.popover.localWorkflow", "Local")}
      </span>
    </button>
  );
});
MentionWorkflowRow.displayName = "MentionWorkflowRow";
export function MentionPopover({
  id: id2,
  items,
  activeIndex,
  loading,
  workflowLoading = false,
  truncated,
  query,
  fileKindFilter,
  onFileKindFilterChange,
  onSelect,
  onHover,
  onAssetSelect,
  onInlineAssetTopChange,
  hideAssetMention = false,
  showCurrentCanvasWorkflowTab = true,
  onClose,
  position: position2 = "up",
  anchorRef,
}) {
  const { t: t2 } = useTranslation();
  const listRef = reactExports.useRef(null);
  const bodyRef = reactExports.useRef(null);
  const bodyScrollEndRef = reactExports.useRef(null);
  const {
    referenceItems,
    connectorItems,
    modelItems,
    fileItems,
    projectAssetItems,
    workflowItems,
    availableTabs,
  } = reactExports.useMemo(() => {
    const references = [];
    const connectors = [];
    const models = [];
    const files = [];
    const projectAssets = [];
    const workflows = [];
    for (const item of items) {
      if (item.category === "reference") references.push(item);
      else if (item.category === "connector") connectors.push(item);
      else if (item.category === "model") models.push(item);
      else if (item.category === "project-asset") projectAssets.push(item);
      else if (item.category === "workflow") workflows.push(item);
      else files.push(item);
    }
    const tabs = new Set();
    for (const m3 of models) {
      const mt2 = m3.model.mediaType;
      if (mt2 === "image" || mt2 === "video" || mt2 === "audio") tabs.add(mt2);
    }
    const order2 = ["image", "video", "audio"];
    return {
      referenceItems: references,
      connectorItems: connectors,
      modelItems: models,
      fileItems: files,
      projectAssetItems: projectAssets,
      workflowItems: workflows,
      availableTabs: order2.filter((t22) => tabs.has(t22)),
    };
  }, [items]);
  const isSearching = query.length > 0;
  const [modelTab, setModelTab] = reactExports.useState("image");
  const [workflowScopeTab, setWorkflowScopeTab] = reactExports.useState(() =>
    showCurrentCanvasWorkflowTab &&
    workflowItems.some((item) => item.context === "current-canvas")
      ? "current-canvas"
      : "local",
  );
  const [activeTab, setActiveTab] = reactExports.useState(() =>
    referenceItems.length > 0
      ? "references"
      : fileItems.length > 0
        ? "files"
        : projectAssetItems.length > 0 && !hideAssetMention
          ? "project-assets"
          : connectorItems.length > 0
            ? "connectors"
            : "files",
  );
  const tabSyncMountedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(modelTab)) {
      setModelTab(availableTabs[0]);
    }
  }, [availableTabs]);
  reactExports.useEffect(() => {
    if (!tabSyncMountedRef.current) {
      tabSyncMountedRef.current = true;
      return;
    }
    const current2 = items[activeIndex];
    if (!current2) return;
    if (current2.category === "reference") setActiveTab("references");
    else if (current2.category === "connector") setActiveTab("connectors");
    else if (current2.category === "file") setActiveTab("files");
    else if (current2.category === "project-asset")
      setActiveTab("project-assets");
    else if (current2.category === "workflow") setActiveTab("workflows");
    else if (current2.category === "model") setActiveTab("models");
  }, [activeIndex]);
  reactExports.useEffect(() => {
    if (!isSearching) return;
    const current2 = items[activeIndex] ?? items[0];
    if (!current2) return;
    if (current2.category === "reference") setActiveTab("references");
    else if (current2.category === "connector") setActiveTab("connectors");
    else if (current2.category === "file") setActiveTab("files");
    else if (current2.category === "project-asset")
      setActiveTab("project-assets");
    else if (current2.category === "workflow") setActiveTab("workflows");
    else if (current2.category === "model") setActiveTab("models");
  }, [activeIndex, isSearching, items]);
  reactExports.useEffect(() => {
    if (isSearching) return;
    const active2 = items[activeIndex];
    if (active2?.category !== "model") return;
    const mt2 = active2.model.mediaType;
    if (mt2 === "image" || mt2 === "video" || mt2 === "audio") {
      if (mt2 !== modelTab) setModelTab(mt2);
    }
  }, [activeIndex]);
  const handleTabClick = reactExports.useCallback(
    (tab2) => {
      setActiveTab(tab2);
      if (tab2 === "assets") return;
      const target =
        tab2 === "references"
          ? "reference"
          : tab2 === "connectors"
            ? "connector"
            : tab2 === "files"
              ? "file"
              : tab2 === "project-assets"
                ? "project-asset"
                : tab2 === "workflows"
                  ? "workflow"
                  : "model";
      const idx = items.findIndex((it2) => it2.category === target);
      if (idx >= 0) onHover(idx);
    },
    [items, onHover],
  );
  const visibleModelItems = reactExports.useMemo(
    () =>
      isSearching
        ? modelItems
        : modelItems.filter((m3) => m3.model.mediaType === modelTab),
    [modelItems, modelTab, isSearching],
  );
  const currentCanvasWorkflowItems = reactExports.useMemo(
    () => workflowItems.filter((item) => item.context === "current-canvas"),
    [workflowItems],
  );
  const localWorkflowItems = reactExports.useMemo(
    () => workflowItems.filter((item) => item.context !== "current-canvas"),
    [workflowItems],
  );
  const visibleWorkflowItems =
    showCurrentCanvasWorkflowTab && workflowScopeTab === "current-canvas"
      ? currentCanvasWorkflowItems
      : localWorkflowItems;
  reactExports.useEffect(() => {
    if (
      showCurrentCanvasWorkflowTab &&
      workflowScopeTab === "current-canvas" &&
      currentCanvasWorkflowItems.length === 0
    ) {
      setWorkflowScopeTab("local");
    }
  }, [
    currentCanvasWorkflowItems.length,
    showCurrentCanvasWorkflowTab,
    workflowScopeTab,
  ]);
  const globalIndexMap = reactExports.useMemo(() => {
    const map3 = new Map();
    for (let i2 = 0; i2 < items.length; i2++) {
      map3.set(items[i2], i2);
    }
    return map3;
  }, [items]);
  const handleWorkflowScopeTabChange = reactExports.useCallback(
    (value) => {
      if (value !== "current-canvas" && value !== "local") return;
      setWorkflowScopeTab(value);
      const firstItem =
        value === "current-canvas"
          ? currentCanvasWorkflowItems[0]
          : localWorkflowItems[0];
      if (!firstItem) return;
      const index2 = items.indexOf(firstItem);
      if (index2 >= 0) onHover(index2);
    },
    [currentCanvasWorkflowItems, items, localWorkflowItems, onHover],
  );
  reactExports.useEffect(() => {
    return () => {
      if (bodyScrollEndRef.current) {
        clearTimeout(bodyScrollEndRef.current);
      }
    };
  }, []);
  const handleBodyScroll = reactExports.useCallback(() => {
    const el = bodyRef.current;
    if (el) el.dataset.scrolling = "true";
    if (bodyScrollEndRef.current) {
      clearTimeout(bodyScrollEndRef.current);
    }
    bodyScrollEndRef.current = setTimeout(() => {
      if (bodyRef.current) bodyRef.current.dataset.scrolling = "false";
    }, 700);
  }, []);
  reactExports.useEffect(() => {
    if (!onClose) return;
    const handler = (e2) => {
      if (listRef.current && !listRef.current.contains(e2.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  reactExports.useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const popover = listRef.current;
    if (!anchor || !popover) return;
    const update2 = () => {
      const anchorRect = anchor.getBoundingClientRect();
      const inputRoot = anchor.closest("[data-message-input-root]");
      const inputRect = inputRoot?.getBoundingClientRect() ?? anchorRect;
      const width = Math.min(
        inputRoot ? inputRect.width : POPOVER_FALLBACK_WIDTH,
        window.innerWidth - VIEWPORT_GAP * 2,
      );
      let left = inputRect.left;
      if (left + width > window.innerWidth - VIEWPORT_GAP) {
        left = inputRect.right - width;
      }
      left = Math.max(VIEWPORT_GAP, left);
      popover.style.position = "fixed";
      popover.style.width = `${width}px`;
      popover.style.zIndex = String(MESSAGE_INPUT_POPOVER_Z_INDEX);
      popover.style.left = `${left}px`;
      let availableHeight;
      if (position2 === "down") {
        const top2 = inputRect.bottom + HOME_POPOVER_GAP;
        popover.style.top = `${top2}px`;
        popover.style.bottom = "";
        availableHeight = window.innerHeight - top2 - VIEWPORT_GAP;
      } else {
        const bottom = window.innerHeight - anchorRect.top + 4;
        popover.style.bottom = `${bottom}px`;
        popover.style.top = "";
        availableHeight = anchorRect.top - VIEWPORT_GAP;
      }
      if (bodyRef.current) {
        const bodyHeight = Math.max(
          BODY_MIN_H,
          Math.min(BODY_MAX_H, availableHeight - POPOVER_CHROME_H),
        );
        bodyRef.current.style.height = `${bodyHeight}px`;
      }
      popover.style.visibility = "visible";
    };
    update2();
    window.addEventListener("scroll", update2, true);
    window.addEventListener("resize", update2);
    return () => {
      window.removeEventListener("scroll", update2, true);
      window.removeEventListener("resize", update2);
    };
  }, [anchorRef, position2]);
  const renderFileButton = (item) => {
    const gi = globalIndexMap.get(item) ?? 0;
    return (
      <MentionFileRow
        key={`${item.category}:${item.file.path}`}
        item={item}
        gi={gi}
        isActive={gi === activeIndex}
        onSelect={onSelect}
        onHover={onHover}
      />
    );
  };
  return reactDomExports.createPortal(
    <div
      ref={listRef}
      id={id2}
      role="listbox"
      style={{
        visibility: "hidden",
      }}
      className="elevated-surface-border rounded-lg bg-popover p-0 text-popover-foreground shadow-lg"
      onMouseDown={(e2) => e2.preventDefault()}
      onWheel={(e2) => e2.stopPropagation()}
      onTouchMove={(e2) => e2.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">
          {"@ "}
          {t2("mention.popover.heading", "Mention")}
        </span>
        {query && (
          <span className="text-xs text-muted-foreground truncate max-w-40">
            @{query}
          </span>
        )}
      </div>
      <div className="flex overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.filter(
          (tab2) =>
            !(
              hideAssetMention &&
              (tab2.key === "assets" || tab2.key === "project-assets")
            ),
        ).map(({ key: key2, labelKey, fallback }) => {
          const isActive2 = activeTab === key2;
          return (
            <button
              key={key2}
              type="button"
              data-action-ui-id={`mention-tab-${key2}`}
              onClick={() => handleTabClick(key2)}
              className={`flex-1 shrink-0 whitespace-nowrap px-3 py-2 text-xs transition-colors ${isActive2 ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t2(labelKey, fallback)}
            </button>
          );
        })}
      </div>
      <div
        ref={bodyRef}
        data-scrolling="false"
        className="min-h-0 flex flex-col overflow-y-auto overscroll-contain mention-body-scrollbar"
        onScroll={handleBodyScroll}
      >
        {activeTab === "references" && (
          <div className="flex-1 flex flex-col min-h-0">
            {referenceItems.length > 0 ? (
              <div className="shrink-0">
                {referenceItems.map(renderFileButton)}
              </div>
            ) : (
              <EmptyState
                text={t2(
                  "mention.popover.referencesEmpty",
                  "No referenced assets yet",
                )}
              />
            )}
          </div>
        )}
        {activeTab === "connectors" && (
          <div className="flex min-h-0 flex-1 flex-col">
            {connectorItems.length > 0 ? (
              <div className="shrink-0">
                {connectorItems.map((item) => {
                  const gi = globalIndexMap.get(item) ?? 0;
                  return (
                    <MentionConnectorRow
                      key={`connector:${item.connector.serverName}`}
                      item={item}
                      gi={gi}
                      isActive={gi === activeIndex}
                      onSelect={onSelect}
                      onHover={onHover}
                    />
                  );
                })}
              </div>
            ) : loading ? (
              <div className="flex flex-1 items-center justify-center px-3 text-xs text-muted-foreground select-none">
                {t2("mention.popover.loading", "Searching...")}
              </div>
            ) : (
              <EmptyState
                text={t2(
                  "mention.popover.connectorsEmpty",
                  "No connected plugins",
                )}
              />
            )}
          </div>
        )}
        {activeTab === "files" && (
          <div className="flex-1 flex flex-col min-h-0">
            {!isSearching && (
              <div className="shrink-0 px-3 py-2 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <Button
                  type="button"
                  variant={fileKindFilter === "all" ? "default" : "ghost"}
                  size="xs"
                  data-action-ui-id="mention-file-filter-all"
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-sm",
                    fileKindFilter === "all"
                      ? ""
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                  onClick={() => onFileKindFilterChange("all")}
                >
                  {t2("assetFilter.typeAll", "All")}
                </Button>
                {FILE_KIND_FILTERS.map(({ kind, labelKey, fallback }) => (
                  <Button
                    key={kind}
                    type="button"
                    variant={fileKindFilter === kind ? "default" : "ghost"}
                    size="xs"
                    data-action-ui-id={`mention-file-filter-${kind}`}
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-sm",
                      fileKindFilter === kind
                        ? ""
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                    onClick={() =>
                      onFileKindFilterChange(
                        fileKindFilter === kind ? "all" : kind,
                      )
                    }
                  >
                    {t2(labelKey, fallback)}
                  </Button>
                ))}
              </div>
            )}
            {fileItems.length > 0 ? (
              <div className="shrink-0">{fileItems.map(renderFileButton)}</div>
            ) : loading ? (
              <div className="flex-1 flex items-center justify-center px-3 text-xs text-muted-foreground select-none">
                {t2("mention.popover.loading", "Searching...")}
              </div>
            ) : (
              <EmptyState
                text={t2("mention.popover.noResults", "No results")}
              />
            )}
          </div>
        )}
        {activeTab === "project-assets" && !hideAssetMention && (
          <div className="flex-1 flex flex-col min-h-0">
            {projectAssetItems.length > 0 ? (
              <div className="shrink-0">
                {projectAssetItems.map(renderFileButton)}
              </div>
            ) : loading ? (
              <div className="flex-1 flex items-center justify-center px-3 text-xs text-muted-foreground select-none">
                {t2("mention.popover.loading", "Searching...")}
              </div>
            ) : (
              <EmptyState
                text={t2(
                  "mention.popover.projectAssetsEmpty",
                  "No project assets",
                )}
              />
            )}
          </div>
        )}
        {activeTab === "assets" && !hideAssetMention && (
          // Workspace 隔离:@ 面板只列当前 workspace 已 materialize 的 entity。
          // 跨 workspace 露出 entity 会让 chat 暗中可以 reference 别处 workspace
          // 的资产,违反 workspace 边界(task #92 的决策)。
          // 用户想在 chat 里使用尚未 materialize 的 entity,需要先去资产中心面板
          // 把它加入当前 workspace(右键 → 添加到 workspace),然后回来 @。
          // 反向取消这个限制会引入 cross-workspace data leak,曾经修过一次现在
          // 不能再 regress。
          <div className="flex-1 flex flex-col min-h-0">
            <AssetMentionList
              query={query}
              materializedOnly={true}
              emptyStateDensity="compact"
              onSelect={(target) => onAssetSelect?.(target)}
              onClose={onClose}
              maxHeight={ASSET_LIST_MAX_H}
              onTopEntityChange={onInlineAssetTopChange}
            />
          </div>
        )}
        {activeTab === "models" && (
          <div className="flex-1 flex flex-col min-h-0">
            {!isSearching && availableTabs.length > 0 && (
              <div className="shrink-0 px-3 py-2 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {availableTabs.map((tab2) => (
                  <Button
                    key={tab2}
                    type="button"
                    variant={modelTab === tab2 ? "default" : "ghost"}
                    size="xs"
                    data-action-ui-id={`mention-model-tab-${tab2}`}
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-sm",
                      modelTab === tab2
                        ? ""
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                    onClick={() => setModelTab(tab2)}
                  >
                    {t2(`mention.popover.${tab2}`, tab2)}
                  </Button>
                ))}
              </div>
            )}
            {visibleModelItems.length > 0 ? (
              <div className="shrink-0">
                {visibleModelItems.map((item) => {
                  const gi = globalIndexMap.get(item) ?? 0;
                  return (
                    <MentionModelRow
                      key={`model:${item.model.id}`}
                      item={item}
                      gi={gi}
                      isActive={gi === activeIndex}
                      isSearching={isSearching}
                      onSelect={onSelect}
                      onHover={onHover}
                    />
                  );
                })}
              </div>
            ) : loading ? (
              <div className="flex-1 flex items-center justify-center px-3 text-xs text-muted-foreground select-none">
                {t2("mention.popover.loading", "Searching...")}
              </div>
            ) : (
              <EmptyState
                text={t2("mention.popover.noResults", "No results")}
              />
            )}
          </div>
        )}
        {activeTab === "workflows" && (
          <div className="flex min-h-0 flex-1 flex-col">
            {showCurrentCanvasWorkflowTab && (
              <Tabs
                value={workflowScopeTab}
                onValueChange={handleWorkflowScopeTabChange}
              >
                <TabsList className="mx-3 mt-2 grid w-auto grid-cols-2 gap-0 rounded-md bg-tab-list-bg p-0.5">
                  <TabsTrigger
                    value="current-canvas"
                    data-action-ui-id="mention-workflow-tab-current-canvas"
                    className="h-7 rounded-sm px-2 text-xs font-normal text-muted-foreground data-[active]:text-foreground"
                  >
                    {t2(
                      "mention.popover.currentCanvasWorkflow",
                      "Current Canvas",
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="local"
                    data-action-ui-id="mention-workflow-tab-local"
                    className="h-7 rounded-sm px-2 text-xs font-normal text-muted-foreground data-[active]:text-foreground"
                  >
                    {t2("mention.popover.localWorkflow", "Local")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            {visibleWorkflowItems.length > 0 ? (
              <div className="shrink-0">
                {visibleWorkflowItems.map((item) => {
                  const gi = globalIndexMap.get(item) ?? 0;
                  return (
                    <MentionWorkflowRow
                      key={`workflow:${item.context ?? "local"}:${item.canvasNodeId ?? item.workflow.id}:${item.workflow.copyOrdinal ?? ""}`}
                      item={item}
                      gi={gi}
                      isActive={gi === activeIndex}
                      onSelect={onSelect}
                      onHover={onHover}
                    />
                  );
                })}
              </div>
            ) : workflowLoading ? (
              <div className="flex flex-1 items-center justify-center px-3 text-xs text-muted-foreground select-none">
                {t2("mention.popover.loading", "Searching...")}
              </div>
            ) : (
              <EmptyState
                text={t2(
                  workflowScopeTab === "current-canvas" &&
                    showCurrentCanvasWorkflowTab
                    ? "mention.popover.currentCanvasWorkflowsEmpty"
                    : "mention.popover.workflowsEmpty",
                  workflowScopeTab === "current-canvas" &&
                    showCurrentCanvasWorkflowTab
                    ? "No workflows on the current canvas"
                    : "No local workflows",
                )}
              />
            )}
          </div>
        )}
      </div>
      {truncated && activeTab === "files" && fileItems.length > 0 && (
        <div className="px-3 py-1.5 border-t border-foreground/10 text-[11px] text-muted-foreground/70 leading-relaxed select-none">
          {t2(
            "mention.popover.truncated",
            "Showing partial results -- refine your search.",
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}
