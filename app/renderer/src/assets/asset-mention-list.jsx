// asset-mention-list.jsx
import { useTranslation, reactExports, useMutation, useQuery, useQueryClient, useStorage, usePlatform, API_PATHS, useCurrentWorkspace, Video$2, Music$2, Package$2, File$3, Search$2, Check$2, Square$2, classifyFileType } from "../vendor.js";
import { gatewayFetch } from "../infra/agent-ws-client.jsx";
import { DEFAULT_OPEN_DELAY_MS, stepRevision, resolveSeenRevision, appendSeenEntries, BASE, readObject, readEnvelope$1, useAssetCenterFetcher, ROOT_KEY$1, useEntities } from "./check-cloud-asset-upload.js";
import { FileTypeIcon } from "../infra/create-recently-added-store.jsx";
import { withThumbnail } from "../workspace/deferred-thumbnail-image-generation.jsx";
import { ImageOutlineIcon } from "../media-editing/parse-item.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { useGatewayUrl } from "../generation/use-resizable-width.js";
import { Badge } from "../infra/use-browser-overlay-dialog-props.jsx";
import { Input3 } from "../infra/select-content.jsx";
import { trackEvent } from "../infra/init-track.js";
import { jsonInit } from "../infra/use-online.jsx";
import { PageStateBoundary } from "./page-state-boundary.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { CoachMarkPopup, useCoachMark } from "../workspace/use-coach-mark.jsx";
export function CoachMark({ markId, enabled = true, persistOnOpen = false, ...uiProps }) {
  const { isOpen, dismiss, onPointerEnter, onPointerLeave } = useCoachMark(markId, enabled, {
    persistOnOpen,
  });
  return (
    <CoachMarkPopup
      {...uiProps}
      open={isOpen}
      onDismiss={dismiss}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      actionUiId={`coach-mark-${markId}`}
    />
  );
}
export function useCoachMarkSequence(
  markId,
  steps,
  enabled = true,
  openDelayMs = DEFAULT_OPEN_DELAY_MS,
  options = {},
) {
  const { persistOnEscape = true, onIncompleteEscape } = options;
  const [dismissedMarks, setDismissedMarks, setDismissedMarksAsync] = useStorage(
    "global.dismissedCoachMarks",
  );
  const [isOpen, setIsOpen] = reactExports.useState(false);
  const [index2, setIndex] = reactExports.useState(0);
  const indexRef = reactExports.useRef(0);
  const dismissedRef = reactExports.useRef(false);
  const openedRef = reactExports.useRef(false);
  const lockedSeenRef = reactExports.useRef(null);
  const maxRevision = steps.reduce((max2, s2) => Math.max(max2, stepRevision(s2)), 1);
  const seenRevision = lockedSeenRef.current ?? resolveSeenRevision(dismissedMarks, markId);
  const visibleSteps = steps.filter((s2) => stepRevision(s2) > seenRevision);
  const stepTotal = visibleSteps.length;
  const stepsRef = reactExports.useRef(visibleSteps);
  stepsRef.current = visibleSteps;
  reactExports.useEffect(() => {
    if (openedRef.current) return;
    dismissedRef.current = resolveSeenRevision(dismissedMarks, markId) >= maxRevision;
  }, [dismissedMarks, markId, maxRevision]);
  const persistDismissed = reactExports.useCallback(() => {
    setDismissedMarks((prev) => appendSeenEntries(prev, markId, maxRevision));
  }, [markId, maxRevision, setDismissedMarks]);
  reactExports.useEffect(() => {
    if (!enabled || stepTotal === 0) return;
    if (dismissedRef.current || openedRef.current) return;
    const seenNow = resolveSeenRevision(dismissedMarks, markId);
    if (seenNow >= maxRevision) {
      dismissedRef.current = true;
      return;
    }
    const timer2 = setTimeout(() => {
      if (dismissedRef.current) return;
      openedRef.current = true;
      lockedSeenRef.current = seenNow;
      stepsRef.current[0]?.onEnter?.();
      indexRef.current = 0;
      setIndex(0);
      setIsOpen(true);
      trackEvent(TRACK_EVENTS.COACH_MARK_SHOW, {
        mark_id: markId,
        step: 1,
      });
    }, openDelayMs);
    return () => clearTimeout(timer2);
  }, [enabled, stepTotal, dismissedMarks, markId, openDelayMs, maxRevision]);
  const finish = reactExports.useCallback(
    (method) => {
      setIsOpen(false);
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      persistDismissed();
      trackEvent(TRACK_EVENTS.COACH_MARK_DISMISS, {
        mark_id: markId,
        method,
      });
    },
    [markId, persistDismissed],
  );
  const next2 = reactExports.useCallback(() => {
    const nextIdx = indexRef.current + 1;
    if (nextIdx >= stepTotal) {
      finish("button");
      return;
    }
    indexRef.current = nextIdx;
    stepsRef.current[nextIdx]?.onEnter?.();
    trackEvent(TRACK_EVENTS.COACH_MARK_SHOW, {
      mark_id: markId,
      step: nextIdx + 1,
    });
    setIndex(nextIdx);
  }, [stepTotal, finish, markId]);
  const dismiss = reactExports.useCallback((method) => finish(method), [finish]);
  const closeWithoutPersisting = reactExports.useCallback(
    (method) => {
      setIsOpen(false);
      trackEvent(TRACK_EVENTS.COACH_MARK_DISMISS, {
        mark_id: markId,
        method,
      });
    },
    [markId],
  );
  const persistSeen = reactExports.useCallback(
    async (revision = maxRevision) => {
      try {
        await setDismissedMarksAsync((prev) => appendSeenEntries(prev, markId, revision));
      } catch {}
    },
    [markId, maxRevision, setDismissedMarksAsync],
  );
  reactExports.useEffect(() => {
    if (!isOpen) return;
    const handler = (e2) => {
      if (e2.key === "Escape") {
        e2.stopPropagation();
        if (persistOnEscape) {
          dismiss("close");
        } else {
          closeWithoutPersisting("close");
          onIncompleteEscape?.();
        }
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [isOpen, dismiss, closeWithoutPersisting, persistOnEscape, onIncompleteEscape]);
  return {
    isOpen,
    index: index2,
    stepCurrent: index2 + 1,
    stepTotal,
    isLast: index2 >= stepTotal - 1,
    visibleSteps,
    next: next2,
    dismiss,
    closeWithoutPersisting,
    persistSeen,
    isDismissed: dismissedRef.current,
  };
}
export const ASSET_CENTER_RELOCATION_SPOTLIGHT = false;
async function dropEntityToCanvas(fetcher, entityId, input) {
  const res = await fetcher(
    `${BASE}/entities/${encodeURIComponent(entityId)}/drop-to-canvas`,
    jsonInit("POST", input),
  );
  return readObject(res, "drop-to-canvas result");
}
async function appendAttachmentFromWorkspace(fetcher, entityId, input) {
  const res = await fetcher(
    `${BASE}/entities/${encodeURIComponent(entityId)}/attachments-from-workspace`,
    jsonInit("POST", input),
  );
  return readEnvelope$1(res, "attachment", "appended attachment");
}
export function useMaterializedEntities() {
  const platform2 = usePlatform();
  const workspacePath = useCurrentWorkspace();
  return useQuery({
    queryKey: ["materialized-entities", workspacePath],
    queryFn: async () => {
      if (!workspacePath) return [];
      try {
        const res = await gatewayFetch(API_PATHS.assetCenterWorkspaceRefs(workspacePath));
        const data2 = await res.json();
        return data2.refs.map((r2) => ({
          entityId: r2.entityId,
          materializedAt: r2.materializedAt,
        }));
      } catch {}
      try {
        const matDir = `${workspacePath}/.hilo/materialized-entities`;
        const entries2 = await platform2.fs.readDir(matDir);
        return entries2
          .filter((e2) => e2.isDirectory || e2.isSymbolicLink)
          .map((e2) => ({
            entityId: e2.name,
          }));
      } catch {
        return [];
      }
    },
    enabled: Boolean(workspacePath),
    staleTime: 3e4,
  });
}
export function trackAssetPromoteValidationFailed(props) {
  trackEvent(TRACK_EVENTS.ASSET_PROMOTE_VALIDATION_FAILED, props);
}
export function trackAssetUse(props) {
  trackEvent(TRACK_EVENTS.ASSET_USE, props);
}
export function useDropEntityToCanvas() {
  const queryClient2 = useQueryClient();
  const fetcher = useAssetCenterFetcher();
  return useMutation({
    mutationFn: ({ entityId, input }) => dropEntityToCanvas(fetcher, entityId, input),
    onSuccess: () => {
      queryClient2.invalidateQueries({
        queryKey: ROOT_KEY$1,
      });
    },
  });
}
export function useAppendAttachmentFromWorkspace() {
  const queryClient2 = useQueryClient();
  const fetcher = useAssetCenterFetcher();
  return useMutation({
    mutationFn: ({ entityId, input }) => appendAttachmentFromWorkspace(fetcher, entityId, input),
    onSuccess: () => {
      queryClient2.invalidateQueries({
        queryKey: ROOT_KEY$1,
      });
      queryClient2.invalidateQueries({
        queryKey: ["materialized-entities"],
      });
    },
  });
}
const DEFAULT_MAX_HEIGHT = 280;
const SEARCH_LIMIT$1 = 50;
const THUMB_PX$2 = 32;
function TypeIcon({ type: type2 }) {
  if (type2 === "character") return <ImageOutlineIcon size={16} strokeWidth={1.67} />;
  if (type2 === "scene") return <Video$2 size={16} />;
  if (type2 === "style_pack") return <Music$2 size={16} />;
  if (type2 === "prop") return <Package$2 size={16} />;
  return <File$3 size={16} />;
}
function AssetThumb({ entity }) {
  const gatewayUrl2 = useGatewayUrl();
  const [errored, setErrored] = reactExports.useState(false);
  const wrapperCls =
    "flex-shrink-0 flex items-center justify-center bg-muted overflow-hidden text-muted-foreground";
  const wrapperStyle2 = {
    width: THUMB_PX$2,
    height: THUMB_PX$2,
  };
  const previewUrl = entity.thumbnailUrl ?? entity.coverUrl;
  const resolvedUrl = previewUrl ? withThumbnail(gatewayUrl2(previewUrl), THUMB_PX$2) : void 0;
  if (!resolvedUrl || errored) {
    return (
      <span className={wrapperCls} style={wrapperStyle2}>
        <TypeIcon type={entity.type} />
      </span>
    );
  }
  return (
    <span className={wrapperCls} style={wrapperStyle2}>
      <img
        src={resolvedUrl}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="w-full h-full object-cover"
        onError={() => setErrored(true)}
      />
    </span>
  );
}
export function AssetMentionList(props) {
  const {
    query: externalQuery,
    materializedOnly,
    onSelect,
    onClose,
    maxHeight,
    hideEmpty,
    emptyStateDensity,
    onTopEntityChange,
    selectedEntityId,
    selectedEntityIds,
    bordered,
    typeFilter,
  } = props;
  const { t: t2 } = useTranslation();
  const [internalQuery, setInternalQuery] = reactExports.useState("");
  const effectiveQuery = externalQuery ?? internalQuery;
  const entitiesQuery = useEntities({
    q: effectiveQuery.trim() || void 0,
    limit: SEARCH_LIMIT$1,
    ...(typeFilter
      ? {
          type: typeFilter,
        }
      : {}),
  });
  const materializedQuery = useMaterializedEntities();
  const materializedIds = reactExports.useMemo(() => {
    if (!materializedOnly) return null;
    const list2 = materializedQuery.data ?? [];
    return new Set(list2.map((e2) => e2.entityId));
  }, [materializedOnly, materializedQuery.data]);
  const entities = reactExports.useMemo(() => {
    const raw2 = entitiesQuery.data ?? [];
    if (!materializedIds) return raw2;
    return raw2.filter((e2) => materializedIds.has(e2.id));
  }, [entitiesQuery.data, materializedIds]);
  const [activeIndex, setActiveIndex] = reactExports.useState(0);
  const listRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (activeIndex >= entities.length) {
      setActiveIndex(Math.max(0, entities.length - 1));
    }
  }, [activeIndex, entities.length]);
  reactExports.useEffect(() => {
    setActiveIndex(0);
  }, [effectiveQuery]);
  reactExports.useEffect(() => {
    if (!onTopEntityChange) return;
    const top2 = entities[0];
    if (top2) {
      onTopEntityChange({
        kind: "entity",
        entityId: top2.id,
        entityName: top2.name,
        entityType: top2.type,
      });
    } else {
      onTopEntityChange(null);
    }
  }, [entities, onTopEntityChange]);
  const handleSelect = reactExports.useCallback(
    (entity) => {
      onSelect({
        kind: "entity",
        entityId: entity.id,
        entityName: entity.name,
        entityType: entity.type,
      });
    },
    [onSelect],
  );
  const handleKeyDown2 = reactExports.useCallback(
    (e2) => {
      if (entities.length === 0) {
        if (e2.key === "Escape" && onClose) {
          e2.preventDefault();
          onClose();
        }
        return;
      }
      if (e2.key === "ArrowDown") {
        e2.preventDefault();
        setActiveIndex((prev) => (prev >= entities.length - 1 ? 0 : prev + 1));
      } else if (e2.key === "ArrowUp") {
        e2.preventDefault();
        setActiveIndex((prev) => (prev <= 0 ? entities.length - 1 : prev - 1));
      } else if (e2.key === "Enter") {
        e2.preventDefault();
        const selected2 = entities[activeIndex];
        if (selected2) handleSelect(selected2);
      } else if (e2.key === "Escape" && onClose) {
        e2.preventDefault();
        onClose();
      }
    },
    [entities, activeIndex, handleSelect, onClose],
  );
  reactExports.useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-asset-row="${activeIndex}"]`);
    if (el) {
      el.scrollIntoView({
        block: "nearest",
      });
    }
  }, [activeIndex]);
  const isLoading = entitiesQuery.isLoading || (materializedOnly && materializedQuery.isLoading);
  const error = entitiesQuery.error;
  const showSharedEmpty = Boolean(
    emptyStateDensity && !isLoading && !error && entities.length === 0,
  );
  if (hideEmpty && !isLoading && !error && entities.length === 0) {
    return null;
  }
  return (
    <div
      role="listbox"
      aria-multiselectable={selectedEntityIds !== void 0 ? true : void 0}
      aria-label={t2("assetMentionList.tabLabel")}
      className={`flex flex-col bg-popover text-popover-foreground rounded-md outline-none ${showSharedEmpty ? "flex-1 min-h-0" : ""} ${bordered ? "elevated-surface-border" : ""}`}
      tabIndex={0}
      onKeyDown={handleKeyDown2}
      data-action-ui-id="asset-mention-list"
    >
      {externalQuery === void 0 && (
        <div className="p-2 border-b border-border">
          <Input3
            type="search"
            value={internalQuery}
            placeholder={t2("assetMentionList.placeholder")}
            startIcon={<Search$2 />}
            onChange={(e2) => setInternalQuery(e2.target.value)}
            className="[&_input]:rounded-md"
            data-action-ui-id="asset-mention-list.search"
          />
        </div>
      )}
      <div
        ref={listRef}
        className={`overflow-y-auto overscroll-contain ${showSharedEmpty ? "flex flex-col flex-1 min-h-0" : ""}`}
        style={
          showSharedEmpty
            ? void 0
            : {
                maxHeight: maxHeight ?? DEFAULT_MAX_HEIGHT,
              }
        }
      >
        {error ? (
          <div className="px-3 py-4 text-xs text-destructive select-none">
            {t2("assetMentionList.loadError", {
              message: error.message,
            })}
          </div>
        ) : isLoading ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center select-none">
            {t2("assetMentionList.loading")}
          </div>
        ) : showSharedEmpty ? (
          <PageStateBoundary
            empty={true}
            density={emptyStateDensity}
            emptyOptions={{
              text: t2("assetMentionList.empty"),
            }}
          />
        ) : entities.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center select-none">
            {t2("assetMentionList.empty")}
          </div>
        ) : (
          entities.map((entity, idx) => {
            const isSelected =
              selectedEntityId === entity.id || selectedEntityIds?.has(entity.id) === true;
            const showSelectionIndicator =
              selectedEntityId !== void 0 || selectedEntityIds !== void 0;
            return (
              <button
                key={entity.id}
                type="button"
                role="option"
                data-asset-row={idx}
                aria-selected={showSelectionIndicator ? isSelected : idx === activeIndex}
                data-action-ui-id={`asset-mention-row-${idx}`}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer transition-colors ${isSelected ? "bg-popup-item-active" : idx === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-popup-item-hover"}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleSelect(entity)}
              >
                {showSelectionIndicator &&
                  (isSelected ? (
                    <Check$2 size={14} className="shrink-0 text-foreground" />
                  ) : (
                    <Square$2 size={14} className="shrink-0 text-muted-foreground/40" />
                  ))}
                <AssetThumb entity={entity} />
                <span className="text-sm font-medium truncate shrink-0 max-w-[40%]">
                  {entity.name}
                </span>
                <Badge variant="secondary" className="shrink-0">
                  {t2(`assetCenter.types.${entity.type}`)}
                </Badge>
                {entity.description ? (
                  <span className="text-xs text-muted-foreground truncate min-w-0 flex-1">
                    {entity.description}
                  </span>
                ) : (
                  <span className="flex-1" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
export function formatRelativeTime$1(ts2, locale) {
  const diff = Date.now() - ts2;
  if (Number.isNaN(diff) || diff < 0) {
    return new Date(ts2).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });
  }
  const rtf = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
  });
  const minutes = Math.floor(diff / 6e4);
  if (minutes < 1) return rtf.format(0, "minute");
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 7) return rtf.format(-days, "day");
  return new Date(ts2).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}
export function isPreviewableKind(kind) {
  return kind === "image" || kind === "video" || kind === "audio" || kind === "text";
}
export function formatBytes$2(bytes2) {
  if (bytes2 < 1024) return `${bytes2} B`;
  if (bytes2 < 1024 * 1024) return `${(bytes2 / 1024).toFixed(1)} KB`;
  return `${(bytes2 / (1024 * 1024)).toFixed(1)} MB`;
}
export function AttachmentPreviewThumb({ attachment }) {
  const gatewayUrl2 = useGatewayUrl();
  const [errored, setErrored] = reactExports.useState(false);
  const blobSrc = gatewayUrl2(
    API_PATHS.assetCenterAttachmentBlob(attachment.id, attachment.kind === "video" ? 512 : void 0),
  );
  if ((attachment.kind === "image" || attachment.kind === "video") && blobSrc && !errored) {
    return (
      <span className="flex-shrink-0 w-10 h-10 bg-muted overflow-hidden rounded-[4px] flex items-center justify-center">
        <img
          src={blobSrc}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 w-10 h-10 bg-muted overflow-hidden rounded-[4px] flex items-center justify-center text-muted-foreground">
      <FileTypeIcon
        {...classifyFileType({
          filename: attachment.originalFilename,
        })}
        size={28}
        decorative={true}
      />
    </span>
  );
}
