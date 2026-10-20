// mention-popover.jsx
import reactDomExports from "react-dom";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { classifyFileType } from "../infra/file-type.js";
import { Workflow } from "../media-editing/lucide-icon-wraps.js";
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
import { Button, mergeTailwindClasses as mergeClassNames } from "../infra/dialog-content.jsx";
import { AssetMentionList } from "../assets/asset-mention-list.jsx";
import { Tabs, TabsList, TabsTrigger } from "../workspace/shortcut-hint.jsx";
import { MESSAGE_INPUT_POPOVER_Z_INDEX } from "../assets/classify-upload-error.js";
import { Video$2 } from "../media-editing/custom-icons.js";
import { FileText } from "../media-editing/package.jsx";
import { KEY_PREFIX as KEY_PREFIX$1 } from "../assets/read-envelope.js";
import { AudioFileIcon } from "../assets/scrollable-asset-view.jsx";
import { Image as Image$1 } from "lucide-react";
import { MentionThumb } from "./mention-file-thumbnail.jsx";
const POPOVER_FALLBACK_WIDTH = 380;
const HOME_POPOVER_GAP = 4;
const THUMB_PX = 24;
const BODY_MAX_H = 336;
const BODY_MIN_H = 160;
const VIEWPORT_GAP = 8;
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
    Icon: Image$1,
  },
  {
    kind: "video",
    labelKey: "assetFilter.typeVideo",
    fallback: "Video",
    Icon: Video$2,
  },
  {
    kind: "audio",
    labelKey: "assetFilter.typeAudio",
    fallback: "Audio",
    Icon: AudioFileIcon,
  },
  {
    kind: "text",
    labelKey: "assetFilter.typeText",
    fallback: "Text",
    Icon: FileText,
  },
];
function buildMentionThumbUrl(
  gatewayUrl,
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
  const base = gatewayUrl(`${prefix}${encoded}`);
  return withThumbnail(base, displayWidth);
}
const KEY_ENTRIES = {
  // resource not found (404)
  entity_not_found: `${KEY_PREFIX$1}entityNotFound`,
  attachment_not_found: `${KEY_PREFIX$1}attachmentNotFound`,
  suggestion_not_found: `${KEY_PREFIX$1}suggestionNotFound`,
  // attachment / upload validation (400)
  attachment_format_unsupported: `${KEY_PREFIX$1}attachmentFormatUnsupported`,
  attachment_count_exceeded: `${KEY_PREFIX$1}attachmentCountExceeded`,
  attachment_kind_uninferred: `${KEY_PREFIX$1}attachmentKindUninferred`,
  attachment_file_missing: `${KEY_PREFIX$1}attachmentFileMissing`,
  attachment_filename_invalid: `${KEY_PREFIX$1}attachmentFilenameInvalid`,
  blob_path_invalid: `${KEY_PREFIX$1}blobPathInvalid`,
  file_too_large: `${KEY_PREFIX$1}fileTooLarge`,
  // import / export (400 / 409)
  import_invalid_zip: `${KEY_PREFIX$1}importInvalidZip`,
  import_manifest_invalid: `${KEY_PREFIX$1}importManifestInvalid`,
  import_version_unsupported: `${KEY_PREFIX$1}importVersionUnsupported`,
  import_entity_conflict: `${KEY_PREFIX$1}importEntityConflict`,
  export_no_attachments: `${KEY_PREFIX$1}exportNoAttachments`,
  // suggestions (400)
  suggestion_not_pending: `${KEY_PREFIX$1}suggestionNotPending`,
  // generic request validation (400)
  invalid_request: `${KEY_PREFIX$1}invalidRequest`,
  // infra (500 / 503)
  asset_center_unavailable: `${KEY_PREFIX$1}assetCenterUnavailable`,
  internal_error: `${KEY_PREFIX$1}internalError`,
};
const ASSET_CENTER_ERROR_KEYS = KEY_ENTRIES;
MentionThumb.displayName = "MentionThumb";
const ModelIcon = reactExports.memo(function ModelIcon({ model }) {
  const [errored, setErrored] = reactExports.useState(false);
  const wrapperCls =
    "flex-shrink-0 flex items-center justify-center rounded-sm bg-muted/40 overflow-hidden";
  const wrapperStyle = {
    width: THUMB_PX,
    height: THUMB_PX,
  };
  if (!model.iconUrl || errored) {
    return (
      <span className={wrapperCls} style={wrapperStyle}>
        <ModelTypeIcon mediaType={model.mediaType} />
      </span>
    );
  }
  return (
    <span className={wrapperCls} style={wrapperStyle}>
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
function EmptyState({ text }) {
  return (
    <PageStateBoundary
      empty={true}
      density="compact"
      emptyOptions={{
        text,
      }}
    />
  );
}
const MentionFileRow = reactExports.memo(function MentionFileRow2({ item, gi, isActive, onSelect, onHover }) {
  const { t } = useTranslation();
  const handleClick = reactExports.useCallback(() => onSelect(item), [onSelect, item]);
  const handleHover = reactExports.useCallback(() => onHover(gi), [onHover, gi]);
  return (
    <button
      id={`mention-opt-${gi}`}
      type="button"
      role="option"
      aria-selected={isActive}
      data-action-ui-id={`mention-opt-${gi}`}
      className={`flex h-12 w-full shrink-0 cursor-pointer items-center gap-2 rounded-md px-2 text-left transition-colors ${isActive ? "bg-popup-item-hover text-foreground" : "hover:bg-popup-item-hover"}`}
      onClick={handleClick}
      onMouseMove={handleHover}
    >
      <MentionThumb item={item.file} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-normal leading-5 text-foreground">
          {item.file.displayName ?? item.file.name}
        </span>
        {item.file.compositionRefs?.length ? (
          <span
            className="truncate text-xs leading-4 text-muted-foreground"
            title={item.file.compositionRefs.map((ref) => ref.name).join(" · ")}
          >
            {t("mention.popover.materialGroupRelation", "Material group")}
            {" ·"} {item.file.compositionRefs.map((ref) => ref.name).join(" · ")}
          </span>
        ) : null}
      </span>
    </button>
  );
});
MentionFileRow.displayName = "MentionFileRow";
const MentionModelRow = reactExports.memo(function MentionModelRow({
  item,
  gi: globalIndex,
  isActive,
  isSearching,
  onSelect,
  onHover,
}) {
  const handleClick = reactExports.useCallback(
    () => onSelect(item),
    [onSelect, item],
  );
  const handleHover = reactExports.useCallback(
    () => onHover(globalIndex),
    [onHover, globalIndex],
  );
  return (
    <button
      id={`mention-opt-${globalIndex}`}
      type="button"
      role="option"
      aria-selected={isActive}
      data-action-ui-id={`mention-opt-${globalIndex}`}
      className={`w-full min-h-10 shrink-0 flex items-center gap-2 rounded-md px-2 py-2 text-left cursor-pointer transition-colors ${isActive ? "bg-popup-item-hover text-foreground" : "hover:bg-popup-item-hover"}`}
      onClick={handleClick}
      onMouseEnter={handleHover}
    >
      <ModelIcon model={item.model} />
      <span className="text-sm text-foreground font-normal truncate min-w-0 flex-1">
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
const MentionConnectorRow = reactExports.memo(function MentionConnectorRow({
  item,
  gi: globalIndex,
  isActive,
  onSelect,
  onHover,
}) {
  const handleClick = reactExports.useCallback(
    () => onSelect(item),
    [onSelect, item],
  );
  const handleHover = reactExports.useCallback(
    () => onHover(globalIndex),
    [onHover, globalIndex],
  );
  return (
    <button
      id={`mention-opt-${globalIndex}`}
      type="button"
      role="option"
      aria-selected={isActive}
      data-action-ui-id={`mention-connector-${item.connector.serverName}`}
      className={`w-full min-h-10 shrink-0 flex items-center gap-2 rounded-md px-2 py-2 text-left cursor-pointer transition-colors ${isActive ? "bg-popup-item-hover text-foreground" : "hover:bg-popup-item-hover"}`}
      onClick={handleClick}
      onMouseEnter={handleHover}
    >
      <ConnectorIcon iconUrl={item.connector.iconUrl} size="list" />
      <span className="min-w-0 flex-1 truncate text-sm font-normal text-foreground">
        {item.connector.displayName}
      </span>
    </button>
  );
});
MentionConnectorRow.displayName = "MentionConnectorRow";
const MentionWorkflowRow = reactExports.memo(function MentionWorkflowRow({
  item,
  gi: globalIndex,
  isActive,
  onSelect,
  onHover,
}) {
  const { t: translate } = useTranslation();
  const handleClick = reactExports.useCallback(
    () => onSelect(item),
    [onSelect, item],
  );
  const handleHover = reactExports.useCallback(
    () => onHover(globalIndex),
    [onHover, globalIndex],
  );
  const title =
    item.context === "current-canvas" && item.workflow.copyOrdinal
      ? `${item.workflow.title} · ${translate(
          "canvas.comfyui.copySuffix",
          "Copy {{index}}",
          {
            index: item.workflow.copyOrdinal,
          },
        )}`
      : item.workflow.title;
  return (
    <button
      id={`mention-opt-${globalIndex}`}
      type="button"
      role="option"
      aria-selected={isActive}
      data-action-ui-id={`mention-workflow-${item.canvasNodeId ?? item.workflow.id}`}
      className={`w-full min-h-10 shrink-0 flex items-center gap-2 rounded-md px-2 py-2 text-left cursor-pointer transition-colors ${isActive ? "bg-popup-item-hover text-foreground" : "hover:bg-popup-item-hover"}`}
      onClick={handleClick}
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
        <span className="block truncate text-sm font-normal text-foreground">
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
          ? translate("mention.popover.currentCanvasWorkflow", "Current Canvas")
          : translate("mention.popover.localWorkflow", "Local")}
      </span>
    </button>
  );
});
MentionWorkflowRow.displayName = "MentionWorkflowRow";
export function MentionPopover({
  id: popoverId,
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
  position = "up",
  anchorRef,
}) {
  const { t: translate } = useTranslation();
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
    for (const modelEntry of models) {
      const mediaType = modelEntry.model.mediaType;
      if (mediaType === "image" || mediaType === "video" || mediaType === "audio") tabs.add(mediaType);
    }
    const order = ["image", "video", "audio"];
    return {
      referenceItems: references,
      connectorItems: connectors,
      modelItems: models,
      fileItems: files,
      projectAssetItems: projectAssets,
      workflowItems: workflows,
      availableTabs: order.filter((mediaTab) => tabs.has(mediaTab)),
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
    const current = items[activeIndex];
    if (!current) return;
    if (current.category === "reference") setActiveTab("references");
    else if (current.category === "connector") setActiveTab("connectors");
    else if (current.category === "file") setActiveTab("files");
    else if (current.category === "project-asset")
      setActiveTab("project-assets");
    else if (current.category === "workflow") setActiveTab("workflows");
    else if (current.category === "model") setActiveTab("models");
  }, [activeIndex]);
  reactExports.useEffect(() => {
    if (!isSearching) return;
    const current = items[activeIndex] ?? items[0];
    if (!current) return;
    if (current.category === "reference") setActiveTab("references");
    else if (current.category === "connector") setActiveTab("connectors");
    else if (current.category === "file") setActiveTab("files");
    else if (current.category === "project-asset")
      setActiveTab("project-assets");
    else if (current.category === "workflow") setActiveTab("workflows");
    else if (current.category === "model") setActiveTab("models");
  }, [activeIndex, isSearching, items]);
  reactExports.useEffect(() => {
    if (isSearching) return;
    const active = items[activeIndex];
    if (active?.category !== "model") return;
    const mediaType = active.model.mediaType;
    if (mediaType === "image" || mediaType === "video" || mediaType === "audio") {
      if (mediaType !== modelTab) setModelTab(mediaType);
    }
  }, [activeIndex]);
  const handleTabClick = reactExports.useCallback(
    (targetTab) => {
      setActiveTab(targetTab);
      if (targetTab === "assets") return;
      const target =
        targetTab === "references"
          ? "reference"
          : targetTab === "connectors"
            ? "connector"
            : targetTab === "files"
              ? "file"
              : targetTab === "project-assets"
                ? "project-asset"
                : targetTab === "workflows"
                  ? "workflow"
                  : "model";
      const categoryIndex = items.findIndex((item) => item.category === target);
      if (categoryIndex >= 0) onHover(categoryIndex);
    },
    [items, onHover],
  );
  const visibleModelItems = reactExports.useMemo(
    () =>
      isSearching
        ? modelItems
        : modelItems.filter((modelEntry) => modelEntry.model.mediaType === modelTab),
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
    const itemIndexByItem = new Map();
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      itemIndexByItem.set(items[itemIndex], itemIndex);
    }
    return itemIndexByItem;
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
      const index = items.indexOf(firstItem);
      if (index >= 0) onHover(index);
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
    const bodyElement = bodyRef.current;
    if (bodyElement) bodyElement.dataset.scrolling = "true";
    if (bodyScrollEndRef.current) {
      clearTimeout(bodyScrollEndRef.current);
    }
    bodyScrollEndRef.current = setTimeout(() => {
      if (bodyRef.current) bodyRef.current.dataset.scrolling = "false";
    }, 700);
  }, []);
  reactExports.useEffect(() => {
    if (!onClose) return;
    const handler = (mouseEvent) => {
      if (listRef.current && !listRef.current.contains(mouseEvent.target)) {
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
    const update = () => {
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
      if (position === "down") {
        const popoverTop = inputRect.bottom + HOME_POPOVER_GAP;
        popover.style.top = `${popoverTop}px`;
        popover.style.bottom = "";
        availableHeight = window.innerHeight - popoverTop - VIEWPORT_GAP;
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
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorRef, position]);
  const renderFileButton = (item) => {
    const globalIndex = globalIndexMap.get(item) ?? 0;
    return (
      <MentionFileRow
        key={`${item.category}:${item.file.path}`}
        item={item}
        gi={globalIndex}
        isActive={globalIndex === activeIndex}
        onSelect={onSelect}
        onHover={onHover}
      />
    );
  };
  return reactDomExports.createPortal(
    <div
      ref={listRef}
      id={popoverId}
      role="listbox"
      style={{
        visibility: "hidden",
      }}
      className="elevated-surface-border rounded-lg bg-popover p-0 text-popover-foreground shadow-lg"
      onMouseDown={(mouseEvent) => mouseEvent.preventDefault()}
      onWheel={(wheelEvent) => wheelEvent.stopPropagation()}
      onTouchMove={(touchEvent) => touchEvent.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">
          {"@ "}
          {translate("mention.popover.heading", "Mention")}
        </span>
        {query && (
          <span className="text-xs text-muted-foreground truncate max-w-40">
            @{query}
          </span>
        )}
      </div>
      <div className="flex overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.filter(
          (tabDefinition) =>
            !(
              hideAssetMention &&
              (tabDefinition.key === "assets" || tabDefinition.key === "project-assets")
            ),
        ).map(({ key: tabKey, labelKey, fallback }) => {
          const isActive = activeTab === tabKey;
          return (
            <button
              key={tabKey}
              type="button"
              data-action-ui-id={`mention-tab-${tabKey}`}
              onClick={() => handleTabClick(tabKey)}
              className={`flex-1 shrink-0 whitespace-nowrap px-3 py-2 text-xs transition-colors ${isActive ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {translate(labelKey, fallback)}
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
                text={translate(
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
                  const globalIndex = globalIndexMap.get(item) ?? 0;
                  return (
                    <MentionConnectorRow
                      key={`connector:${item.connector.serverName}`}
                      item={item}
                      gi={globalIndex}
                      isActive={globalIndex === activeIndex}
                      onSelect={onSelect}
                      onHover={onHover}
                    />
                  );
                })}
              </div>
            ) : loading ? (
              <div className="flex flex-1 items-center justify-center px-3 text-xs text-muted-foreground select-none">
                {translate("mention.popover.loading", "Searching...")}
              </div>
            ) : (
              <EmptyState
                text={translate(
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
                  className={mergeClassNames(
                    "shrink-0 whitespace-nowrap rounded-sm",
                    fileKindFilter === "all"
                      ? ""
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                  onClick={() => onFileKindFilterChange("all")}
                >
                  {translate("assetFilter.typeAll", "All")}
                </Button>
                {FILE_KIND_FILTERS.map(({ kind, labelKey, fallback }) => (
                  <Button
                    key={kind}
                    type="button"
                    variant={fileKindFilter === kind ? "default" : "ghost"}
                    size="xs"
                    data-action-ui-id={`mention-file-filter-${kind}`}
                    className={mergeClassNames(
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
                    {translate(labelKey, fallback)}
                  </Button>
                ))}
              </div>
            )}
            {fileItems.length > 0 ? (
              <div className="shrink-0">{fileItems.map(renderFileButton)}</div>
            ) : loading ? (
              <div className="flex-1 flex items-center justify-center px-3 text-xs text-muted-foreground select-none">
                {translate("mention.popover.loading", "Searching...")}
              </div>
            ) : (
              <EmptyState
                text={translate("mention.popover.noResults", "No results")}
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
                {translate("mention.popover.loading", "Searching...")}
              </div>
            ) : (
              <EmptyState
                text={translate(
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
                {availableTabs.map((availableModelTab) => (
                  <Button
                    key={availableModelTab}
                    type="button"
                    variant={modelTab === availableModelTab ? "default" : "ghost"}
                    size="xs"
                    data-action-ui-id={`mention-model-tab-${availableModelTab}`}
                    className={mergeClassNames(
                      "shrink-0 whitespace-nowrap rounded-sm",
                      modelTab === availableModelTab
                        ? ""
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                    onClick={() => setModelTab(availableModelTab)}
                  >
                    {translate(`mention.popover.${availableModelTab}`, availableModelTab)}
                  </Button>
                ))}
              </div>
            )}
            {visibleModelItems.length > 0 ? (
              <div className="shrink-0">
                {visibleModelItems.map((item) => {
                  const globalIndex = globalIndexMap.get(item) ?? 0;
                  return (
                    <MentionModelRow
                      key={`model:${item.model.id}`}
                      item={item}
                      gi={globalIndex}
                      isActive={globalIndex === activeIndex}
                      isSearching={isSearching}
                      onSelect={onSelect}
                      onHover={onHover}
                    />
                  );
                })}
              </div>
            ) : loading ? (
              <div className="flex-1 flex items-center justify-center px-3 text-xs text-muted-foreground select-none">
                {translate("mention.popover.loading", "Searching...")}
              </div>
            ) : (
              <EmptyState
                text={translate("mention.popover.noResults", "No results")}
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
                    {translate(
                      "mention.popover.currentCanvasWorkflow",
                      "Current Canvas",
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="local"
                    data-action-ui-id="mention-workflow-tab-local"
                    className="h-7 rounded-sm px-2 text-xs font-normal text-muted-foreground data-[active]:text-foreground"
                  >
                    {translate("mention.popover.localWorkflow", "Local")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            {visibleWorkflowItems.length > 0 ? (
              <div className="shrink-0">
                {visibleWorkflowItems.map((item) => {
                  const globalIndex = globalIndexMap.get(item) ?? 0;
                  return (
                    <MentionWorkflowRow
                      key={`workflow:${item.context ?? "local"}:${item.canvasNodeId ?? item.workflow.id}:${item.workflow.copyOrdinal ?? ""}`}
                      item={item}
                      gi={globalIndex}
                      isActive={globalIndex === activeIndex}
                      onSelect={onSelect}
                      onHover={onHover}
                    />
                  );
                })}
              </div>
            ) : workflowLoading ? (
              <div className="flex flex-1 items-center justify-center px-3 text-xs text-muted-foreground select-none">
                {translate("mention.popover.loading", "Searching...")}
              </div>
            ) : (
              <EmptyState
                text={translate(
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
          {translate(
            "mention.popover.truncated",
            "Showing partial results -- refine your search.",
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}

