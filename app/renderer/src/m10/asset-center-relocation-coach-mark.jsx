// asset-center-relocation-coach-mark.jsx
import { useTranslation, reactExports, Check, useQueryClient, useStorage, storageKeys, Loader2, ChevronDown, Plus, useNavigate, getRuntimeConfig, resolveNewProjectPreferences, ChevronRight$1, FolderUp } from "../vendor.js";
import { Popover, PopoverTrigger } from "../m15/apply-asset-change.jsx";
import { useAssetCenterRelocation, HOME_INPUT_COACH_MARK_ID, ASSET_CENTER_RELOCATION_REVISION } from "../m15/check-cloud-asset-upload.js";
import { buildWorkspaceSearch } from "../m15/create-visible-preview-tabs-store.js";
import { Tooltip, TooltipTrigger, TooltipProvider } from "../m15/graph.jsx";
import { Folder, Expand } from "../m15/parse-item.jsx";
import { CloudProjectRequestError } from "../m15/record-recent-workspace-opened.jsx";
import { STARTUP_MODAL_IDS, useModalSlot, useHasBlockingModal } from "../m15/thumbnail-load-scheduler.jsx";
import { ROOT_KEY, cloudAssetsChangedListeners, requestJson, mapCloudNode } from "../m15/use-cloud-search.js";
import { useTopbarActions, useTopbarState } from "../m15/use-hub-logo-hover-animation.jsx";
import { useProjectStore, projectWorkspaceKey, sortRecentWorkspaces } from "../m15/workspace-events.js";
import {
  Badge,
  cn$2,
  TooltipContent,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { PlaybackPlayIcon, homeService } from "../m08/browser-inspiration-urls.jsx";
import { PopoverContent } from "../m09/use-credit-details.jsx";
import { ENTITY_DRAG_MIME } from "../asset-center/shared/misc-02.jsx";
import { AddToChatIcon } from "../m01/generating-media-area.jsx";
import { useEntityCanvas } from "../asset-center/shared/use-materialize-entity.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  ASSET_CENTER_RELOCATION_SPOTLIGHT,
  AttachmentPreviewThumb,
  formatBytes$2,
  formatRelativeTime$1,
  isPreviewableKind,
  useCoachMarkSequence,
} from "./asset-mention-list.jsx";
import { stageWorkspacePreview } from "./new-workspace-dialog.jsx";
import { getAssetCenterMainService } from "./use-asset-center-settings.jsx";
import { CoachMarkPopup } from "./use-coach-mark.jsx";
function AttachmentRow$1({ attachment, onPreview, onAddToCanvas, onAddToChat }) {
  const { t: t2 } = useTranslation();
  if (!onPreview) {
    return (
      <li className="flex items-center gap-2 py-1 px-1">
        <AttachmentPreviewThumb attachment={attachment} />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[11px] text-foreground truncate">
            {attachment.originalFilename}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatBytes$2(attachment.byteSize)}
          </span>
        </div>
      </li>
    );
  }
  const clickable = isPreviewableKind(attachment.kind);
  return (
    <li
      role={clickable ? "button" : void 0}
      tabIndex={clickable ? 0 : void 0}
      className={`group/att flex items-center gap-2 py-1 pl-0 pr-1 transition-colors ${clickable ? "cursor-pointer hover:bg-muted/50" : "hover:bg-muted/50"}`}
      onClick={clickable ? () => onPreview(attachment) : void 0}
      onKeyDown={
        clickable
          ? (e2) => {
              if (e2.key === "Enter" || e2.key === " ") {
                e2.preventDefault();
                onPreview(attachment);
              }
            }
          : void 0
      }
    >
      <span className="relative flex-shrink-0">
        <AttachmentPreviewThumb attachment={attachment} />
        {clickable && (
          <span className="absolute inset-0 flex items-center justify-center rounded-[4px] bg-black/40 opacity-0 group-hover/att:opacity-100 transition-opacity">
            <Expand size={12} className="text-white" />
          </span>
        )}
      </span>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[11px] text-foreground truncate">{attachment.originalFilename}</span>
        <span className="text-[10px] text-muted-foreground">
          {formatBytes$2(attachment.byteSize)}
        </span>
      </div>
      {(onAddToCanvas || onAddToChat) && (
        <TooltipProvider delay={300}>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {onAddToCanvas && (
              <Tooltip>
                <TooltipTrigger
                  className="size-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  onClick={(e2) => {
                    e2.stopPropagation();
                    onAddToCanvas(attachment);
                  }}
                >
                  <Plus size={12} />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {t2("assetSidebarPanel.addToCanvas")}
                </TooltipContent>
              </Tooltip>
            )}
            {onAddToChat && (
              <Tooltip>
                <TooltipTrigger
                  className="size-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  onClick={(e2) => {
                    e2.stopPropagation();
                    onAddToChat(attachment);
                  }}
                >
                  <AddToChatIcon size={12} />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {t2("assetSidebarPanel.addToChat")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      )}
    </li>
  );
}
export function EntityHoverCardBody({ entityId, onPreview, onAddToCanvas, onAddToChat }) {
  const { t: t2, i18n } = useTranslation();
  const entityQuery = useEntityCanvas(entityId);
  const entity = entityQuery.data;
  if (entityQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (entityQuery.error || !entity) {
    return (
      <div className="px-3 py-4 text-xs text-destructive">
        {entityQuery.error?.message ?? t2("common.error")}
      </div>
    );
  }
  const attachments = entity.attachments ?? [];
  return (
    <div className="flex flex-col gap-1.5 p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-foreground line-clamp-2">{entity.name}</span>
        <Badge variant="secondary" className="shrink-0">
          {t2(`assetCenter.types.${entity.type}`)}
        </Badge>
      </div>
      {entity.description && (
        <p className="text-[11px] text-muted-foreground line-clamp-3">{entity.description}</p>
      )}
      {attachments.length > 0 && (
        <ul className="flex flex-col gap-1 max-h-[12rem] overflow-y-auto">
          {attachments.map((att) => (
            <AttachmentRow$1
              key={att.id}
              attachment={att}
              onPreview={onPreview}
              onAddToCanvas={onAddToCanvas}
              onAddToChat={onAddToChat}
            />
          ))}
        </ul>
      )}
      {attachments.length === 0 && (
        <span className="text-[11px] text-muted-foreground">
          {t2("assetSidebarPanel.noAttachments")}
        </span>
      )}
      <p className="flex items-center text-[10px] text-muted-foreground -mb-1">
        {t2("assetCenter.entityList.updatedAt", {
          when: formatRelativeTime$1(entity.updatedAt, i18n.language),
        })}
        {" · "}
        {t2("assetCenter.useCount", {
          count: entity.useCount,
        })}
      </p>
    </div>
  );
}
export function readEntityDragData(e2) {
  const raw2 = e2.dataTransfer?.getData(ENTITY_DRAG_MIME);
  if (!raw2) return null;
  try {
    const parsed = JSON.parse(raw2);
    if (
      parsed &&
      typeof parsed.entityId === "string" &&
      typeof parsed.name === "string" &&
      typeof parsed.type === "string" &&
      (parsed.thumbnailUrl === void 0 || typeof parsed.thumbnailUrl === "string")
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
function usePersistAssetCenterRelocation(relocation) {
  const queryClient2 = useQueryClient();
  const persistStartedRef = reactExports.useRef(false);
  const { ready, libraryInitialized, hasAssetData, assetCenterHidden } = relocation;
  reactExports.useEffect(() => {
    if (
      !ready ||
      !libraryInitialized ||
      hasAssetData ||
      assetCenterHidden ||
      persistStartedRef.current
    ) {
      return;
    }
    persistStartedRef.current = true;
    void Promise.resolve()
      .then(() => getAssetCenterMainService().markLegacyEntryHidden())
      .then(() =>
        queryClient2.invalidateQueries({
          queryKey: storageKeys.global("config"),
        }),
      )
      .catch(() => {
        persistStartedRef.current = false;
      });
  }, [assetCenterHidden, hasAssetData, libraryInitialized, queryClient2, ready]);
}
const ASSET_CENTER_NAV_SELECTOR =
  '[data-action-ui-id="home-sidebar-nav-asset-center-coachmark-anchor"]';
export function AssetCenterRelocationCoachMark() {
  const { t: t2 } = useTranslation();
  const navigate = useNavigate();
  const [config2, , , configHydrated] = useStorage("global.config");
  const [recentWorkspaces] = useStorage("global.recentWorkspaces");
  const [lastActiveWorkspacePath] = useStorage("global.lastActiveWorkspacePath");
  const relocation = useAssetCenterRelocation();
  usePersistAssetCenterRelocation(relocation);
  const { currentWorkspaceId, previewEntries } = useTopbarState();
  const { createWorkspace } = useTopbarActions();
  const { projects, caseInsensitive } = useProjectStore();
  const hasBlockingModal = useHasBlockingModal();
  const { loadUserMemory } = resolveNewProjectPreferences(config2);
  const anchorRef = reactExports.useRef(null);
  const [anchorEl, setAnchorEl] = reactExports.useState(null);
  const [closedForSession, setClosedForSession] = reactExports.useState(false);
  const [handoffStarted, setHandoffStarted] = reactExports.useState(false);
  const [ctaLoading, setCtaLoading] = reactExports.useState(false);
  const configReady =
    configHydrated &&
    (getRuntimeConfig().region !== "domestic" || config2.watermarkOnboardingShown === true);
  const candidate =
    configReady && relocation.relocationPending && !closedForSession && !handoffStarted;
  const granted = useModalSlot(STARTUP_MODAL_IDS.homeCoachMarks, {
    candidate,
  });
  reactExports.useEffect(() => {
    if (!candidate) {
      anchorRef.current = null;
      setAnchorEl(null);
      return;
    }
    const resolveAnchor = () => {
      const next2 = document.querySelector(ASSET_CENTER_NAV_SELECTOR);
      anchorRef.current = next2;
      setAnchorEl((current2) => (current2 === next2 ? current2 : next2));
    };
    resolveAnchor();
    const observer2 = new MutationObserver(resolveAnchor);
    observer2.observe(document.body, {
      childList: true,
      subtree: true,
    });
    return () => observer2.disconnect();
  }, [candidate]);
  const sequence = useCoachMarkSequence(
    HOME_INPUT_COACH_MARK_ID,
    [
      {
        revision: ASSET_CENTER_RELOCATION_REVISION,
      },
    ],
    granted && !hasBlockingModal,
    void 0,
    {
      persistOnEscape: false,
      onIncompleteEscape: () => setClosedForSession(true),
    },
  );
  const teamWorkspaceKeys = reactExports.useMemo(
    () =>
      new Set(
        projects
          .filter((project2) => project2.kind === "team")
          .flatMap((project2) => project2.workspacePaths)
          .map((path2) => projectWorkspaceKey(path2, caseInsensitive)),
      ),
    [caseInsensitive, projects],
  );
  const isPersonalWorkspace = (path2) =>
    !teamWorkspaceKeys.has(projectWorkspaceKey(path2, caseInsensitive));
  const handleDismiss = (method) => {
    if (method !== "button") {
      if (ctaLoading) return;
      sequence.closeWithoutPersisting(method);
      setClosedForSession(true);
      return;
    }
    if (ctaLoading || handoffStarted) return;
    setHandoffStarted(true);
    setCtaLoading(true);
    const currentEntry = currentWorkspaceId
      ? previewEntries.find(
          (entry) =>
            entry.workspaceId === currentWorkspaceId && isPersonalWorkspace(entry.folderPath),
        )
      : void 0;
    const lastActiveEntry = lastActiveWorkspacePath
      ? previewEntries.find(
          (entry) =>
            (entry.workspaceId === lastActiveWorkspacePath ||
              entry.folderPath === lastActiveWorkspacePath) &&
            isPersonalWorkspace(entry.folderPath),
        )
      : void 0;
    const openEntry =
      currentEntry ??
      lastActiveEntry ??
      previewEntries.find((entry) => isPersonalWorkspace(entry.folderPath));
    const run2 = async () => {
      if (openEntry) {
        await navigate({
          to: "/workspace",
          search: buildWorkspaceSearch(openEntry.workspaceId, {
            assetCenterRelocation: true,
          }),
        });
        return true;
      }
      const recentEntry = sortRecentWorkspaces(recentWorkspaces, "recent").find((entry) =>
        isPersonalWorkspace(entry.path),
      );
      if (recentEntry) {
        return Boolean(
          await stageWorkspacePreview({
            hiloApp: homeService.hiloApp,
            folderPath: recentEntry.path,
            t: t2,
            onStaged: (entry) =>
              navigate({
                to: "/workspace",
                search: buildWorkspaceSearch(entry.workspaceId, {
                  assetCenterRelocation: true,
                }),
              }),
          }),
        );
      }
      return createWorkspace(
        t2("coachMark.home.assetCenterRelocation.defaultWorkspaceName", "New project"),
        {
          loadUserMemory,
        },
        {
          assetCenterRelocation: true,
        },
      );
    };
    void run2()
      .then((opened) => {
        if (!opened) setHandoffStarted(false);
      })
      .catch(() => setHandoffStarted(false))
      .finally(() => setCtaLoading(false));
  };
  return (
    <CoachMarkPopup
      open={sequence.isOpen && Boolean(anchorEl) && !handoffStarted}
      onDismiss={handleDismiss}
      anchorRef={anchorRef}
      anchorEl={anchorEl}
      side="right"
      align="center"
      title={t2("coachMark.home.assetCenterRelocation.title", "资产中心搬家啦")}
      description={t2(
        "coachMark.home.assetCenterRelocation.desc",
        "资产中心已改名为「主体库」，搬到了创作页（画布）里，让你在创作时更方便地取用素材。",
      )}
      ctaLabel={t2("coachMark.next", "下一步")}
      ctaLoading={ctaLoading}
      stepCurrent={1}
      stepTotal={2}
      showClose={true}
      showSpotlight={ASSET_CENTER_RELOCATION_SPOTLIGHT}
      actionUiId="coach-mark-asset-center-relocation-entry"
    />
  );
}
const LINE_BASE_CLASS_NAME =
  "relative z-30 -mx-[4.5px] h-full w-[9px] shrink-0 cursor-col-resize overflow-visible border-0 bg-transparent p-0";
const GRIP_BASE_CLASS_NAME =
  "relative -mx-[4.5px] h-full w-[9px] shrink-0 cursor-col-resize border-0 bg-transparent p-0";
export function ResizeColHandle({
  onMouseDown,
  onDoubleClick,
  onValueChange,
  invertKeyboardDirection = false,
  tabIndex,
  baseClassName,
  indicatorVariant = "line",
  ...aria2
}) {
  const sepRef = reactExports.useRef(null);
  const [hovered, setHovered] = reactExports.useState(false);
  const [dragging, setDragging] = reactExports.useState(false);
  const currentValue = aria2["aria-valuenow"];
  const minValue = aria2["aria-valuemin"];
  const maxValue = aria2["aria-valuemax"];
  reactExports.useEffect(() => {
    if (!dragging) return;
    const endDragging = () => setDragging(false);
    document.addEventListener("mouseup", endDragging);
    window.addEventListener("blur", endDragging);
    return () => {
      document.removeEventListener("mouseup", endDragging);
      window.removeEventListener("blur", endDragging);
    };
  }, [dragging]);
  const handleMouseDown2 = reactExports.useCallback(
    (event) => {
      if (!onMouseDown) return;
      setDragging(true);
      onMouseDown(event);
    },
    [onMouseDown],
  );
  const handleKeyDown2 = reactExports.useCallback(
    (event) => {
      if (
        onValueChange === void 0 ||
        currentValue === void 0 ||
        minValue === void 0 ||
        maxValue === void 0
      ) {
        return;
      }
      const step = event.shiftKey ? 24 : 8;
      let next2;
      if (event.key === "Home") {
        next2 = minValue;
      } else if (event.key === "End") {
        next2 = maxValue;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const arrowDirection = event.key === "ArrowRight" ? 1 : -1;
        const direction = invertKeyboardDirection ? -arrowDirection : arrowDirection;
        next2 = Math.min(maxValue, Math.max(minValue, currentValue + direction * step));
      }
      if (next2 === void 0 || next2 === currentValue) {
        if (next2 !== void 0) event.preventDefault();
        return;
      }
      event.preventDefault();
      onValueChange(next2);
    },
    [currentValue, invertKeyboardDirection, maxValue, minValue, onValueChange],
  );
  return (
    <hr
      ref={sepRef}
      tabIndex={tabIndex}
      aria-valuenow={aria2["aria-valuenow"]}
      aria-valuemin={aria2["aria-valuemin"]}
      aria-valuemax={aria2["aria-valuemax"]}
      aria-orientation={aria2["aria-orientation"] ?? "vertical"}
      aria-label={aria2["aria-label"]}
      data-action-ui-id={aria2["data-action-ui-id"]}
      data-workspace-divider={aria2["data-workspace-divider"]}
      data-global-sidebar-hover-region={aria2["data-global-sidebar-hover-region"]}
      data-indicator-variant={indicatorVariant}
      data-active={hovered || dragging ? "true" : "false"}
      className={`resize-col ${baseClassName ?? (indicatorVariant === "grip" ? GRIP_BASE_CLASS_NAME : LINE_BASE_CLASS_NAME)}`}
      onMouseDown={handleMouseDown2}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={handleKeyDown2}
    />
  );
}
export const CLOUD_ASSET_TABLE_EXTENSION = "htable";
function findBySegments(options, segments) {
  if (segments.length === 0) return options.find((option2) => option2.key === ROOT_KEY);
  return options.find(
    (option2) =>
      option2.key !== ROOT_KEY &&
      option2.segments.length === segments.length &&
      option2.segments.every((segment, index2) => segment === segments[index2]),
  );
}
function childrenOf(options, path2) {
  return options.filter(
    (option2) =>
      option2.key !== ROOT_KEY &&
      option2.segments.length === path2.length + 1 &&
      path2.every((segment, index2) => option2.segments[index2] === segment),
  );
}
export function FolderDrillDownPicker({
  options,
  value,
  onChange,
  loading = false,
  className,
  actionUiId,
}) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const [browsePath, setBrowsePath] = reactExports.useState([]);
  const selected2 = reactExports.useMemo(
    () => options.find((option2) => option2.key === value),
    [options, value],
  );
  const browseOption = reactExports.useMemo(
    () => findBySegments(options, browsePath),
    [options, browsePath],
  );
  const children2 = reactExports.useMemo(
    () => childrenOf(options, browsePath),
    [options, browsePath],
  );
  const hasChildren2 = reactExports.useCallback(
    (option2) => childrenOf(options, option2.segments).length > 0,
    [options],
  );
  const handleOpenChange = reactExports.useCallback(
    (next2) => {
      setOpen(next2);
      if (next2) setBrowsePath(selected2 ? selected2.segments.slice(0, -1) : []);
    },
    [selected2],
  );
  const pick = reactExports.useCallback(
    (key2) => {
      if (!key2) return;
      onChange(key2);
      setOpen(false);
    },
    [onChange],
  );
  const leafName = selected2?.segments[selected2.segments.length - 1];
  const parentPrefix =
    selected2 && selected2.segments.length > 1
      ? selected2.segments.slice(0, -1).join(" / ")
      : void 0;
  const currentLevelLabel =
    browsePath.length === 0
      ? t2("localAssets.saveRootFolder")
      : (browsePath[browsePath.length - 1] ?? "");
  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className={cn$2(
          "flex h-8 min-w-0 cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-xs transition-colors outline-none select-none hover:bg-muted/60 hover:text-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
          className,
        )}
        data-action-ui-id={actionUiId}
      >
        {selected2 ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <Folder size={13} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
            <span className="truncate">
              {parentPrefix ? (
                <span className="text-muted-foreground">
                  {parentPrefix}
                  {" / "}
                </span>
              ) : null}
              {selected2.segments.length === 0 ? t2("localAssets.saveRootFolder") : leafName}
            </span>
          </span>
        ) : (
          <span className="truncate text-muted-foreground">
            {loading ? t2("common.loading") : t2("localAssets.saveLocationPlaceholder")}
          </span>
        )}
        <ChevronDown size={16} strokeWidth={1} className="shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        positionerClassName="z-[70]"
        className="w-(--anchor-width) min-w-64 gap-0 p-1"
      >
        <div className="flex min-w-0 items-center gap-0.5 overflow-hidden px-1 py-1 text-xs">
          <button
            type="button"
            onClick={() => setBrowsePath([])}
            className={cn$2(
              "min-w-6 max-w-28 truncate rounded-md px-1 py-0.5 transition-colors",
              browsePath.length === 0
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
            )}
          >
            {t2("localAssets.saveRootFolder")}
          </button>
          {browsePath.map((segment, index2) => {
            const prefixPath = browsePath.slice(0, index2 + 1).join("/");
            const isLast = index2 === browsePath.length - 1;
            return (
              <span key={prefixPath} className="flex min-w-0 items-center gap-0.5">
                <ChevronRight$1
                  size={12}
                  strokeWidth={1}
                  className="shrink-0 text-muted-foreground/60"
                />
                <button
                  type="button"
                  onClick={() => setBrowsePath(browsePath.slice(0, index2 + 1))}
                  className={cn$2(
                    "min-w-6 max-w-28 truncate rounded-md px-1 py-0.5 transition-colors",
                    isLast
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
                  )}
                >
                  {segment}
                </button>
              </span>
            );
          })}
        </div>
        <div className="mb-1 h-px shrink-0 bg-foreground/5" />
        <FolderRow$1
          label={currentLevelLabel}
          isSelected={browseOption !== void 0 && browseOption.key === value}
          onPick={() => pick(browseOption?.key)}
        />
        {children2.length > 0 ? (
          <div className="flex max-h-56 flex-col overflow-y-auto">
            {children2.map((child) => (
              <FolderRow$1
                key={child.key}
                label={child.segments[child.segments.length - 1] ?? ""}
                isSelected={child.key === value}
                canDrill={hasChildren2(child)}
                drillLabel={t2("localAssets.folderPickerEnter")}
                onPick={() => pick(child.key)}
                onDrill={() => setBrowsePath(child.segments)}
              />
            ))}
          </div>
        ) : (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            {t2("localAssets.folderPickerEmpty")}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
function FolderRow$1({ label, isSelected, canDrill = false, drillLabel, onPick, onDrill }) {
  return (
    <div
      className={cn$2(
        "flex w-full items-center gap-1 rounded-lg pr-1.5 transition-colors focus-within:bg-popup-item-hover focus-within:text-foreground hover:bg-popup-item-hover hover:text-foreground",
        isSelected ? "text-foreground" : "text-foreground/70",
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-2 pl-2 text-xs outline-none select-none"
        onClick={onPick}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" && canDrill && onDrill) {
            event.preventDefault();
            onDrill();
          }
        }}
      >
        <Folder size={13} strokeWidth={1.5} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        {isSelected ? <Check size={14} strokeWidth={1.5} className="shrink-0" /> : null}
      </button>
      {canDrill && onDrill ? (
        <button
          type="button"
          aria-label={drillLabel}
          title={drillLabel}
          className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
          onClick={onDrill}
        >
          <ChevronRight$1 size={14} strokeWidth={1.5} />
        </button>
      ) : null}
    </div>
  );
}
function notifyCloudAssetsChanged(projectId) {
  for (const listener of cloudAssetsChangedListeners)
    listener({
      projectId,
    });
}
export async function createCloudFolder(projectId, parentId, name2) {
  const data2 = await requestJson("/api/v1/cloud-folder/folders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      project_id: projectId,
      parent_id: parentId,
      name: name2,
    }),
  });
  const node2 = mapCloudNode(data2.node);
  if (!node2) throw new CloudProjectRequestError(200, void 0);
  notifyCloudAssetsChanged(projectId);
  return node2;
}
export async function renameCloudNode(nodeId, newName) {
  await requestJson(`/api/v1/cloud-folder/nodes/${encodeURIComponent(nodeId)}/rename`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      new_name: newName,
    }),
  });
}
export function AssetsDropzoneEmpty({
  disabled: disabled2,
  onPickFiles,
  onOpenPicker,
  title,
  description,
}) {
  const { t: t2 } = useTranslation();
  const [dragActive, setDragActive] = reactExports.useState(false);
  const dragDepth = useDragDepth();
  return (
    <button
      type="button"
      disabled={disabled2}
      onClick={() => {
        if (!disabled2) onOpenPicker();
      }}
      onDragEnter={(event) => {
        if (disabled2) return;
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        dragDepth.enter();
        setDragActive(true);
      }}
      onDragOver={(event) => {
        if (disabled2) return;
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (disabled2) return;
        if (!event.dataTransfer.types.includes("Files")) return;
        dragDepth.leave();
        if (dragDepth.count <= 1) setDragActive(false);
      }}
      onDrop={(event) => {
        if (disabled2) return;
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        dragDepth.reset();
        setDragActive(false);
        const files = [...event.dataTransfer.files];
        if (files.length > 0) onPickFiles(files);
      }}
      className={cn$2(
        "flex flex-1 min-h-0 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border/70 bg-card/40 py-8 text-center transition-colors",
        !disabled2 && "cursor-pointer hover:border-foreground/25 hover:bg-muted/40",
        dragActive && "border-brand-accent bg-brand-accent/[0.06]",
        disabled2 && "cursor-not-allowed opacity-60",
      )}
      data-action-ui-id="project-assets.dropzone"
      aria-disabled={disabled2}
    >
      <span
        className={cn$2(
          "flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors",
          dragActive && "bg-brand-accent/10 text-brand-accent",
        )}
      >
        <FolderUp size={26} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <div className="flex max-w-sm flex-col gap-1 px-6">
        <p className="text-body-14 font-medium text-foreground">
          {title ?? t2("projectAssets.dropzoneTitle")}
        </p>
        <p className="text-caption-11 text-muted-foreground">
          {description ?? t2("projectAssets.dropzoneDesc")}
        </p>
      </div>
    </button>
  );
}
function useDragDepth() {
  const [count2, setCount] = reactExports.useState(0);
  return {
    count: count2,
    enter: () => setCount((n2) => n2 + 1),
    leave: () => setCount((n2) => Math.max(0, n2 - 1)),
    reset: () => setCount(0),
  };
}
export function VideoThumbnailPlayIndicator({ size: size2 = 14 }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      data-project-asset-video-play="true"
    >
      <PlaybackPlayIcon
        size={size2}
        style={{
          color: "var(--media-overlay-foreground)",
          filter: "drop-shadow(0 1px 2px rgb(0 0 0 / 0.65))",
        }}
      />
    </span>
  );
}
