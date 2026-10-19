// asset-center-panel.jsx
import { API_PATHS } from "../infra/workspace-gateway.js";
import { useCurrentWorkspace } from "../infra/shared-runtime.js";
import jsxRuntimeExports from "react/jsx-runtime";
import reactDomExports from "react-dom";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight$1 as ChevronRight, Loader2, Search, X$7 as CloseIcon } from "../media-editing/lucide-icon-wraps.js";
import { PreviewCardPopup, PreviewCardPortal, PreviewCardPositioner, PreviewCardRoot } from "../infra/base-ui.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useStableCallback } from "./use-cloud-review-nodes.js";
import { mergeTailwindClasses as cn } from "../infra/dialog-content.jsx";
import { RetryIcon, StrokeIcon } from "../workspace/use-prompt-icon.jsx";
import { EntityHoverCardBody } from "./attachment-row.jsx";
import { TooltipProvider } from "../vendor-inline/vscode-base/graph.jsx";
import { EntityRow } from "./entity-row.jsx";
import { useEntities } from "./wrap-as-asset-center-error.js";
import { workspaceEvents } from "../workspace/topbar-state-context.jsx";
import { useGatewayUrl } from "../generation/use-model-catalog-scope-key.js";
import { PageStateBoundary } from "./page-state-boundary.jsx";
import { formatAssetCenterError } from "./asset-center-error.js";
import { MediaLightbox } from "./text-preview.jsx";
import { useExportEntityUrl } from "../infra/use-online.jsx";
import { useMaterializeEntity } from "./use-materialize-entity.js";
import {
  trackAssetUse,
  useMaterializedEntities,
} from "./use-materialized-entities.jsx";
import { EntityEditDialog } from "./entity-edit-dialog.jsx";
import { EntityDeleteConfirm } from "./entity-delete-confirm.jsx";
const HOVER_OPEN_DELAY_MS = 300;
const HOVER_CLOSE_DELAY_MS = 150;
function useEntityHoverPreview() {
  const [state, setState] = reactExports.useState({
    kind: "idle",
  });
  const stateRef = reactExports.useRef(state);
  const openTimerRef = reactExports.useRef(null);
  const closeTimerRef = reactExports.useRef(null);
  const setBoth = reactExports.useCallback((next) => {
    stateRef.current = next;
    setState(next);
  }, []);
  const cancelOpen = reactExports.useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);
  const cancelClose = reactExports.useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);
  const notifyHoverIntent = reactExports.useCallback(
    (target) => {
      cancelClose();
      if (stateRef.current.kind === "hover") {
        cancelOpen();
        setBoth({
          kind: "hover",
          target,
        });
        return;
      }
      cancelOpen();
      openTimerRef.current = setTimeout(() => {
        openTimerRef.current = null;
        setBoth({
          kind: "hover",
          target,
        });
      }, HOVER_OPEN_DELAY_MS);
    },
    [cancelClose, cancelOpen, setBoth],
  );
  const notifyHoverEnd = reactExports.useCallback(() => {
    cancelOpen();
    if (stateRef.current.kind !== "hover") return;
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      if (stateRef.current.kind === "hover")
        setBoth({
          kind: "idle",
        });
    }, HOVER_CLOSE_DELAY_MS);
  }, [cancelOpen, cancelClose, setBoth]);
  const onPopupPointerEnter = reactExports.useCallback(() => {
    cancelOpen();
    cancelClose();
  }, [cancelOpen, cancelClose]);
  const onPopupPointerLeave = reactExports.useCallback(() => {
    cancelOpen();
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      if (stateRef.current.kind === "hover")
        setBoth({
          kind: "idle",
        });
    }, HOVER_CLOSE_DELAY_MS);
  }, [cancelOpen, cancelClose, setBoth]);
  const dismiss = reactExports.useCallback(() => {
    cancelOpen();
    cancelClose();
    if (stateRef.current.kind !== "idle")
      setBoth({
        kind: "idle",
      });
  }, [cancelOpen, cancelClose, setBoth]);
  const activeAnchor = state.kind === "hover" ? state.target.anchor : null;
  reactExports.useEffect(() => {
    if (!activeAnchor) return;
    if (!activeAnchor.isConnected) {
      setBoth({
        kind: "idle",
      });
      return;
    }
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting)
            setBoth({
              kind: "idle",
            });
        }
      },
      {
        threshold: 0,
      },
    );
    intersectionObserver.observe(activeAnchor);
    return () => intersectionObserver.disconnect();
  }, [activeAnchor, setBoth]);
  reactExports.useEffect(() => {
    return () => {
      cancelOpen();
      cancelClose();
    };
  }, [cancelOpen, cancelClose]);
  return {
    state,
    stateRef,
    notifyHoverIntent,
    notifyHoverEnd,
    onPopupPointerEnter,
    onPopupPointerLeave,
    dismiss,
  };
}
function EntityHoverPreviewPopup({
  anchor,
  entityId,
  onPreview,
  onAddToCanvas,
  onAddToChat,
  onPopupPointerEnter,
  onPopupPointerLeave,
}) {
  const [positioned, setPositioned] = reactExports.useState(false);
  reactExports.useLayoutEffect(() => {
    const id = requestAnimationFrame(() => setPositioned(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <PreviewCardRoot open={true}>
      <PreviewCardPortal>
        <PreviewCardPositioner
          anchor={anchor}
          side="right"
          sideOffset={8}
          align="start"
          alignOffset={0}
          className={cn(
            "isolate z-50",
            positioned && "transition-transform duration-200 ease-out motion-reduce:transition-none",
          )}
        >
          <PreviewCardPopup
            data-slot="preview-card-content"
            onPointerEnter={onPopupPointerEnter}
            onPointerLeave={onPopupPointerLeave}
            className={cn(
              "elevated-surface-border z-50 w-[260px] origin-(--transform-origin) rounded-lg bg-popover text-popover-foreground shadow-lg outline-none",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            <EntityHoverCardBody
              entityId={entityId}
              onPreview={onPreview}
              onAddToCanvas={onAddToCanvas}
              onAddToChat={onAddToChat}
            />
          </PreviewCardPopup>
        </PreviewCardPositioner>
      </PreviewCardPortal>
    </PreviewCardRoot>
  );
}
const EntityHoverPreviewHost = reactExports.memo(
  reactExports.forwardRef(function EntityHoverPreviewHost2({ onPreviewAttachment, onAddToCanvas, onAddToChat }, ref) {
    const host = useEntityHoverPreview();
    reactExports.useImperativeHandle(
      ref,
      () => ({
        notifyHoverIntent: (entityId, anchor) => {
          const target = {
            entityId,
            anchor,
          };
          host.notifyHoverIntent(target);
        },
        notifyHoverEnd: () => host.notifyHoverEnd(),
      }),
      [host],
    );
    const handleBodyPreview = useStableCallback((att) => {
      const s2 = host.stateRef.current;
      if (s2.kind !== "hover") return;
      const { entityId } = s2.target;
      host.dismiss();
      onPreviewAttachment(entityId, att);
    });
    const handleAddToCanvas = useStableCallback((att) => {
      const s2 = host.stateRef.current;
      if (s2.kind !== "hover") return;
      onAddToCanvas(att);
    });
    const handleAddToChat = useStableCallback((att) => {
      const s2 = host.stateRef.current;
      if (s2.kind !== "hover") return;
      onAddToChat(att);
    });
    if (host.state.kind !== "hover") return null;
    return (
      <EntityHoverPreviewPopup
        anchor={host.state.target.anchor}
        entityId={host.state.target.entityId}
        onPreview={handleBodyPreview}
        onAddToCanvas={handleAddToCanvas}
        onAddToChat={handleAddToChat}
        onPopupPointerEnter={host.onPopupPointerEnter}
        onPopupPointerLeave={host.onPopupPointerLeave}
      />
    );
  }),
);
function ProjectSidebarCategoryChips({ options, value, onChange, rowActionId, className }) {
  return (
    <div className={cn("shrink-0 px-2 pb-1", className)}>
      <div
        className="scrollbar-none flex h-8 flex-nowrap items-center gap-1 overflow-x-auto"
        data-action-ui-id={rowActionId}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              data-action-ui-id={option.actionId}
              aria-pressed={active}
              className={cn(
                "group inline-flex h-[26px] max-w-[112px] shrink-0 items-center justify-center rounded-full border px-[9px] text-xs font-normal shadow-none transition-colors duration-150 select-none focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:outline-none",
                active
                  ? "border-foreground bg-transparent text-foreground"
                  : "border-border bg-transparent text-foreground/70 hover:border-foreground hover:bg-transparent",
              )}
            >
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
const TYPE_CHIPS = ["all", "character", "scene", "style_pack", "custom"];
function useLightboxEscape(onClose) {
  reactExports.useEffect(() => {
    const handler = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
}
function LightboxCloseButton({ onClose }) {
  const { t: translate } = useTranslation();
  return (
    <button
      type="button"
      aria-label={translate("common.close")}
      className="absolute right-8 top-8 flex size-9 cursor-pointer items-center justify-center bg-white/10 text-white/80 transition-colors hover:text-white"
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
        onClose();
      }}
    >
      <StrokeIcon icon={CloseIcon} size={16} />
    </button>
  );
}
function AudioLightbox({ src, alt, onClose }) {
  useLightboxEscape(onClose);
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape key provides keyboard close path.
    <div
      role="dialog"
      aria-label={alt}
      data-mask="immersive"
      className="fixed inset-0 z-9999 flex flex-col items-center justify-center gap-4 modal-mask modal-mask-media p-10"
      onClick={(e2) => {
        if (e2.target === e2.currentTarget) onClose();
      }}
    >
      <LightboxCloseButton onClose={onClose} />
      <span className="text-sm text-white/80 truncate max-w-[60vw]">{alt}</span>
      <audio
        src={src}
        controls={true}
        autoPlay={true}
        style={{
          width: "min(480px, 80vw)",
        }}
      />
    </div>,
    document.body,
  );
}
function TextLightbox({ src, alt, onClose }) {
  const [content, setContent] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const controller = new AbortController();
    fetch(src, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.text();
      })
      .then((text) => setContent(text))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => controller.abort();
  }, [src]);
  useLightboxEscape(onClose);
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape key provides keyboard close path.
    <div
      role="dialog"
      aria-label={alt}
      data-mask="immersive"
      className="fixed inset-0 z-9999 flex flex-col items-center justify-center gap-4 modal-mask modal-mask-media p-10"
      onClick={(e2) => {
        if (e2.target === e2.currentTarget) onClose();
      }}
    >
      <LightboxCloseButton onClose={onClose} />
      <span className="text-sm text-white/80 truncate max-w-[60vw]">{alt}</span>
      <div className="max-h-[70vh] w-full max-w-2xl overflow-auto rounded-lg border border-white/10 bg-white/5 p-4">
        {content === null && !error && (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={16} className="animate-spin text-white opacity-50" />
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        {content !== null && (
          <pre className="text-xs text-white/80 whitespace-pre-wrap break-words font-mono leading-relaxed">
            {content}
          </pre>
        )}
      </div>
    </div>,
    document.body,
  );
}
const SearchInput = reactExports.memo(function SearchInput({
  onDebouncedChange,
}) {
  const { t: translate } = useTranslation();
  const inputRef = reactExports.useRef(null);
  const debounceRef = reactExports.useRef(null);
  const [hasValue, setHasValue] = reactExports.useState(false);
  const scheduleDebounce = useStableCallback((raw) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onDebouncedChange(raw.trim()), 200);
  });
  const handleInput = (inputEvent) => {
    const next = inputEvent.currentTarget.value;
    scheduleDebounce(next);
    const nextHas = next.trim().length > 0;
    setHasValue((prev) => (prev === nextHas ? prev : nextHas));
  };
  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = "";
    scheduleDebounce("");
    setHasValue(false);
    inputRef.current?.focus();
  };
  reactExports.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);
  return (
    <div className="group flex shrink-0 px-2 pb-3">
      <div
        className="flex h-9 w-full items-center gap-1.5 rounded-md border border-transparent bg-muted px-2.5 text-muted-foreground transition-colors focus-within:border-border-strong focus-within:bg-card focus-within:text-foreground"
        data-action-ui-id="canvas-sidebar-asset-center.search-row"
      >
        <StrokeIcon icon={Search} size={16} />
        <input
          ref={inputRef}
          type="text"
          data-action-ui-id="canvas-sidebar-asset-center.search"
          className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          placeholder={translate("assetSidebarPanel.searchPlaceholder")}
          defaultValue=""
          onInput={handleInput}
        />
        <button
          type="button"
          aria-label={translate("assetSidebarPanel.clearSearch", {
            defaultValue: "Clear search",
          })}
          onClick={handleClear}
          tabIndex={hasValue ? 0 : -1}
          className={cn(
            "inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-foreground/[0.05] hover:text-foreground",
            hasValue ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          data-action-ui-id="canvas-sidebar-asset-center.search-clear"
        >
          <StrokeIcon icon={CloseIcon} size={12} />
        </button>
      </div>
    </div>
  );
});
export function AssetCenterPanel({
  viewMode = "tree",
  onRegisterRefresh,
  externalSearchQuery,
  sortKey = "updated_at",
} = {}) {
  const { t: translate } = useTranslation();
  const workspacePath = useCurrentWorkspace();
  const gatewayUrl = useGatewayUrl();
  const [editingEntityId, setEditingEntityId] = reactExports.useState(null);
  const [deleteTarget, setDeleteTarget] = reactExports.useState(null);
  const buildExportUrl = useExportEntityUrl();
  const openEdit = useStableCallback((entityId) =>
    setEditingEntityId(entityId),
  );
  const closeEdit = reactExports.useCallback(
    () => setEditingEntityId(null),
    [],
  );
  const handleDelete = useStableCallback((entity) => setDeleteTarget(entity));
  const closeDelete = reactExports.useCallback(() => setDeleteTarget(null), []);
  const handleExport = useStableCallback((entity) => {
    const url = buildExportUrl(entity.id);
    if (!url) return;
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.rel = "noopener";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  });
  const [internalDebouncedSearch, setInternalDebouncedSearch] =
    reactExports.useState("");
  const externalControlled = externalSearchQuery !== void 0;
  reactExports.useEffect(() => {
    if (!externalControlled) return;
    const debounceTimerId = setTimeout(() => {
      setInternalDebouncedSearch(externalSearchQuery.trim());
    }, 200);
    return () => clearTimeout(debounceTimerId);
  }, [externalControlled, externalSearchQuery]);
  const debouncedSearch = internalDebouncedSearch;
  const setDebouncedSearch = setInternalDebouncedSearch;
  const [typeFilter, setTypeFilter] = reactExports.useState("all");
  const [lightbox, setLightbox] = reactExports.useState(null);
  const [highlightedEntityId, setHighlightedEntityId] =
    reactExports.useState(null);
  const [pinnedOpen, setPinnedOpen] = reactExports.useState(true);
  const [allOpen, setAllOpen] = reactExports.useState(true);
  const highlightTimerRef = reactExports.useRef(null);
  const applyHighlight = useStableCallback((entityId) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedEntityId(entityId);
    highlightTimerRef.current = setTimeout(
      () => setHighlightedEntityId(null),
      3e4,
    );
  });
  const clearHighlight = useStableCallback(() => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    setHighlightedEntityId(null);
  });
  const hostRef = reactExports.useRef(null);
  const handleRowHoverIntent = useStableCallback((entityId, anchor) => {
    clearHighlight();
    hostRef.current?.notifyHoverIntent(entityId, anchor);
  });
  const handleRowHoverEnd = useStableCallback(() => {
    hostRef.current?.notifyHoverEnd();
  });
  const handlePreviewAttachment = useStableCallback((entityId, att) => {
    const path =
      att.kind === "video"
        ? API_PATHS.assetCenterAttachmentPlayback(att.id)
        : API_PATHS.assetCenterAttachmentBlob(att.id);
    const src = gatewayUrl(path);
    if (!src) return;
    if (att.kind === "document") return;
    setLightbox({
      kind: att.kind,
      src,
      alt: att.originalFilename,
      entityId,
    });
  });
  const handleLightboxClose = useStableCallback(() => {
    if (lightbox) applyHighlight(lightbox.entityId);
    setLightbox(null);
  });
  const materializeMutation = useMaterializeEntity();
  const ensureEntityAnchored = useStableCallback(async (entityId) => {
    if (!workspacePath) return null;
    try {
      return await materializeMutation.mutateAsync({
        entityId,
        input: {
          workspacePath,
        },
        _track: {
          trigger: "auto_before_use",
        },
      });
    } catch {
      return null;
    }
  });
  const handleHoverAddToCanvas = useStableCallback((att) => {
    workspaceEvents.fireAddEntityToCanvas(att.entityId, {
      attachmentIds: [att.id],
    });
    trackAssetUse({
      entity_id: att.entityId,
      entity_type: "custom",
      target: "canvas",
      via: "hover_button",
      source_panel: "canvas_sidebar",
      was_materialized: false,
    });
  });
  const handleHoverAddToChat = useStableCallback(async (att) => {
    try {
      const anchored = await ensureEntityAnchored(att.entityId);
      if (!anchored) {
        dedupedToast.error(
          translate("assetSidebarPanel.addToChatError", {
            message: translate(
              "assetSidebarPanel.addToChatErrorNoWorkspace",
              "当前没有可用的工作区",
            ),
          }),
        );
        return;
      }
      const match = anchored.agentPayload.attachments.find(
        (candidateAttachment) => candidateAttachment.id === att.id,
      );
      if (!match) {
        dedupedToast.error(
          translate("assetSidebarPanel.addToChatError", {
            message: translate(
              "assetSidebarPanel.addToChatErrorAttachmentNotFound",
              "未找到该附件",
            ),
          }),
        );
        return;
      }
      workspaceEvents.fireAddToChat(match.path, match.filename);
      trackAssetUse({
        entity_id: att.entityId,
        entity_type: "custom",
        target: "chat",
        via: "hover_button",
        source_panel: "canvas_sidebar",
        was_materialized: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      dedupedToast.error(
        translate("assetSidebarPanel.addToChatError", {
          message,
        }),
      );
    }
  });
  reactExports.useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);
  const listOpts = reactExports.useMemo(() => {
    const opts = {
      sort: sortKey,
    };
    if (typeFilter !== "all") opts.type = typeFilter;
    if (debouncedSearch) opts.q = debouncedSearch;
    return opts;
  }, [typeFilter, debouncedSearch, sortKey]);
  const entitiesQuery = useEntities(listOpts);
  const entities = entitiesQuery.data ?? [];
  const materializedQuery = useMaterializedEntities();
  const refresh = useStableCallback(() => {
    void entitiesQuery.refetch();
    void materializedQuery.refetch();
  });
  reactExports.useEffect(() => {
    onRegisterRefresh?.(refresh);
  }, [onRegisterRefresh, refresh]);
  const materializedIds = reactExports.useMemo(() => {
    const list = materializedQuery.data ?? [];
    return new Set(list.map((materializedEntry) => materializedEntry.entityId));
  }, [materializedQuery.data]);
  const materializedOrder = reactExports.useMemo(() => {
    return (materializedQuery.data ?? []).map((materializedEntry) => materializedEntry.entityId);
  }, [materializedQuery.data]);
  const sortedEntities = reactExports.useMemo(() => {
    if (materializedIds.size === 0) return entities;
    const pinned = [];
    const rest = [];
    for (const entity of entities) {
      if (materializedIds.has(entity.id)) pinned.push(entity);
      else rest.push(entity);
    }
    return [...pinned, ...rest];
  }, [entities, materializedIds]);
  const typeChipOptions = reactExports.useMemo(
    () =>
      TYPE_CHIPS.map((chip) => ({
        value: chip,
        label: translate(`assetCenter.types.${chip}`),
        actionId: `canvas-sidebar-asset-center.chip-${chip}`,
      })),
    [translate],
  );
  const entityById = reactExports.useMemo(() => {
    const map = new Map();
    for (const entity of entities) map.set(entity.id, entity);
    return map;
  }, [entities]);
  const loadError = entitiesQuery.error ?? null;
  const isLoading = entitiesQuery.isPending;
  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      data-action-ui-id="canvas-sidebar-asset-center"
    >
      {externalControlled ? null : (
        <SearchInput onDebouncedChange={setDebouncedSearch} />
      )}
      {!(
        entities.length === 0 &&
        typeFilter === "all" &&
        debouncedSearch === ""
      ) && (
        <ProjectSidebarCategoryChips
          options={typeChipOptions}
          value={typeFilter}
          onChange={setTypeFilter}
          rowActionId="canvas-sidebar-asset-center.chip-row"
        />
      )}
      <TooltipProvider delay={200}>
        <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-none pt-1 pb-2">
          {loadError ? (
            <PageStateBoundary
              error={true}
              density="panel"
              className="h-full"
              errorOptions={{
                description: formatAssetCenterError(loadError, translate),
                retry: {
                  icon: <RetryIcon size={14} />,
                  onClick: refresh,
                },
              }}
            />
          ) : isLoading ? (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center select-none">
              {translate("common.loading")}
            </div>
          ) : entities.length === 0 ? (
            <PageStateBoundary
              empty={true}
              density="panel"
              className="h-full"
              emptyOptions={{
                title:
                  typeFilter === "all" && debouncedSearch === ""
                    ? translate("assetCenter.entityEmpty.title")
                    : translate(`assetSidebarPanel.emptyByType.${typeFilter}`),
                description:
                  typeFilter === "all" && debouncedSearch === ""
                    ? translate("assetSidebarPanel.emptyBody")
                    : void 0,
              }}
            />
          ) : (
            <ul className="flex flex-col">
              {materializedIds.size > 0 && (
                <>
                  <li
                    className="px-3 pt-1 pb-1 text-[11px] font-medium text-muted-foreground select-none flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => setPinnedOpen(!pinnedOpen)}
                    onKeyDown={(keyboardEvent) => {
                      if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ")
                        setPinnedOpen(!pinnedOpen);
                    }}
                  >
                    <StrokeIcon
                      icon={ChevronRight}
                      size={12}
                      className={`transition-transform ${pinnedOpen ? "rotate-90" : ""}`}
                    />
                    {translate(
                      "assetSidebarPanel.materializedSection",
                      "已添加至此项目的资产",
                    )}
                  </li>
                  {pinnedOpen && (
                    <li
                      className={
                        viewMode === "grid"
                          ? "grid grid-cols-2 gap-2 px-2 pb-2"
                          : "contents"
                      }
                    >
                      <ul className="contents">
                        {materializedOrder
                          .filter((eid) => entityById.has(eid))
                          .map((eid) => {
                            const entity = entityById.get(eid);
                            return (
                              <EntityRow
                                key={entity.id}
                                entity={entity}
                                workspacePath={workspacePath}
                                isMaterialized={true}
                                isHighlighted={
                                  highlightedEntityId === entity.id
                                }
                                onHoverIntent={handleRowHoverIntent}
                                onHoverEnd={handleRowHoverEnd}
                                onEdit={openEdit}
                                onDelete={handleDelete}
                                onExport={handleExport}
                                layout={viewMode === "grid" ? "grid" : "row"}
                              />
                            );
                          })}
                      </ul>
                    </li>
                  )}
                </>
              )}
              {sortedEntities.some((entity) => !materializedIds.has(entity.id)) && (
                <>
                  <li
                    className="px-3 pt-1 pb-1 text-[11px] font-medium text-muted-foreground select-none flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => setAllOpen(!allOpen)}
                    onKeyDown={(keyboardEvent) => {
                      if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ")
                        setAllOpen(!allOpen);
                    }}
                  >
                    <StrokeIcon
                      icon={ChevronRight}
                      size={12}
                      className={`transition-transform ${allOpen ? "rotate-90" : ""}`}
                    />
                    {translate("assetSidebarPanel.allSection", "全部资产")}
                  </li>
                  {allOpen && (
                    <li
                      className={
                        viewMode === "grid"
                          ? "grid grid-cols-2 gap-2 px-2 pb-2"
                          : "contents"
                      }
                    >
                      <ul className="contents">
                        {sortedEntities
                          .filter((entity) => !materializedIds.has(entity.id))
                          .map((entity) => (
                            <EntityRow
                              key={entity.id}
                              entity={entity}
                              workspacePath={workspacePath}
                              isMaterialized={false}
                              isHighlighted={highlightedEntityId === entity.id}
                              onHoverIntent={handleRowHoverIntent}
                              onHoverEnd={handleRowHoverEnd}
                              onEdit={openEdit}
                              onDelete={handleDelete}
                              onExport={handleExport}
                              layout={viewMode === "grid" ? "grid" : "row"}
                            />
                          ))}
                      </ul>
                    </li>
                  )}
                </>
              )}
            </ul>
          )}
        </div>
      </TooltipProvider>
      <EntityHoverPreviewHost
        ref={hostRef}
        onPreviewAttachment={handlePreviewAttachment}
        onAddToCanvas={handleHoverAddToCanvas}
        onAddToChat={handleHoverAddToChat}
      />
      {lightbox && lightbox.kind === "audio" && (
        <AudioLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={handleLightboxClose}
        />
      )}
      {lightbox && lightbox.kind === "text" && (
        <TextLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={handleLightboxClose}
        />
      )}
      {lightbox && (lightbox.kind === "image" || lightbox.kind === "video") && (
        <MediaLightbox
          kind={lightbox.kind}
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={handleLightboxClose}
        />
      )}
      <EntityEditDialog entityId={editingEntityId} onClose={closeEdit} />
      <EntityDeleteConfirm
        entity={deleteTarget}
        onClose={closeDelete}
        surface="canvas_sidebar"
      />
    </div>
  );
}
