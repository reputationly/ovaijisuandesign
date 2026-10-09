// asset-center-panel.jsx
import {
  API_PATHS,
  ChevronRight$1,
  dedupedToast,
  jsxRuntimeExports,
  Loader2,
  PreviewCardPopup,
  PreviewCardPortal,
  PreviewCardPositioner,
  PreviewCardRoot,
  reactDomExports,
  reactExports,
  Search,
  useCurrentWorkspace,
  useTranslation,
  X$7,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useStableCallback } from "./use-cloud-review-nodes.js";
import { cn$2 } from "../infra/dialog-content.jsx";
import { RetryIcon, StrokeIcon } from "../workspace/use-prompt-icon.jsx";
import { EntityHoverCardBody } from "./attachment-row.jsx";
import { TooltipProvider } from "../vendor-inline/vscode-base/graph.jsx";
import { EntityRow } from "./entity-row.jsx";
import { useEntities } from "./wrap-as-asset-center-error.js";
import { workspaceEvents } from "../workspace/topbar-state-context.jsx";
import { useGatewayUrl } from "../generation/use-model-catalog-scope-key.js";
import { PageStateBoundary } from "./page-state-boundary.jsx";
import { formatAssetCenterError } from "./key-entries.js";
import { MediaLightbox } from "./text-preview.jsx";
import { useExportEntityUrl } from "../infra/use-online.jsx";
import { useMaterializeEntity } from "./use-materialize-entity.js";
import {
  trackAssetUse,
  useMaterializedEntities,
} from "./use-materialized-entities.jsx";
import { EntityEditDialog } from "./entity-edit-dialog.jsx";
import { EntityDeleteConfirm } from "./entity-delete-confirm.jsx";

const HOVER_OPEN_DELAY_MS$1 = 300;

const HOVER_CLOSE_DELAY_MS$1 = 150;

function useEntityHoverPreview() {
  const [state2, setState] = reactExports.useState({
    kind: "idle",
  });
  const stateRef = reactExports.useRef(state2);
  const openTimerRef = reactExports.useRef(null);
  const closeTimerRef = reactExports.useRef(null);
  const setBoth = reactExports.useCallback((next2) => {
    stateRef.current = next2;
    setState(next2);
  }, []);
  const cancelOpen2 = reactExports.useCallback(() => {
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
        cancelOpen2();
        setBoth({
          kind: "hover",
          target,
        });
        return;
      }
      cancelOpen2();
      openTimerRef.current = setTimeout(() => {
        openTimerRef.current = null;
        setBoth({
          kind: "hover",
          target,
        });
      }, HOVER_OPEN_DELAY_MS$1);
    },
    [cancelClose, cancelOpen2, setBoth],
  );
  const notifyHoverEnd = reactExports.useCallback(() => {
    cancelOpen2();
    if (stateRef.current.kind !== "hover") return;
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      if (stateRef.current.kind === "hover")
        setBoth({
          kind: "idle",
        });
    }, HOVER_CLOSE_DELAY_MS$1);
  }, [cancelOpen2, cancelClose, setBoth]);
  const onPopupPointerEnter = reactExports.useCallback(() => {
    cancelOpen2();
    cancelClose();
  }, [cancelOpen2, cancelClose]);
  const onPopupPointerLeave = reactExports.useCallback(() => {
    cancelOpen2();
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      if (stateRef.current.kind === "hover")
        setBoth({
          kind: "idle",
        });
    }, HOVER_CLOSE_DELAY_MS$1);
  }, [cancelOpen2, cancelClose, setBoth]);
  const dismiss = reactExports.useCallback(() => {
    cancelOpen2();
    cancelClose();
    if (stateRef.current.kind !== "idle")
      setBoth({
        kind: "idle",
      });
  }, [cancelOpen2, cancelClose, setBoth]);
  const activeAnchor = state2.kind === "hover" ? state2.target.anchor : null;
  reactExports.useEffect(() => {
    if (!activeAnchor) return;
    if (!activeAnchor.isConnected) {
      setBoth({
        kind: "idle",
      });
      return;
    }
    const io2 = new IntersectionObserver(
      (entries2) => {
        for (const entry of entries2) {
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
    io2.observe(activeAnchor);
    return () => io2.disconnect();
  }, [activeAnchor, setBoth]);
  reactExports.useEffect(() => {
    return () => {
      cancelOpen2();
      cancelClose();
    };
  }, [cancelOpen2, cancelClose]);
  return {
    state: state2,
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
    const id2 = requestAnimationFrame(() => setPositioned(true));
    return () => cancelAnimationFrame(id2);
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
          className={cn$2(
            "isolate z-50",
            positioned &&
              "transition-transform duration-200 ease-out motion-reduce:transition-none",
          )}
        >
          <PreviewCardPopup
            data-slot="preview-card-content"
            onPointerEnter={onPopupPointerEnter}
            onPointerLeave={onPopupPointerLeave}
            className={cn$2(
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
  reactExports.forwardRef(function EntityHoverPreviewHost2(
    { onPreviewAttachment, onAddToCanvas, onAddToChat },
    ref,
  ) {
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

function ProjectSidebarCategoryChips({
  options,
  value,
  onChange,
  rowActionId,
  className,
}) {
  return (
    <div className={cn$2("shrink-0 px-2 pb-1", className)}>
      <div
        className="scrollbar-none flex h-8 flex-nowrap items-center gap-1 overflow-x-auto"
        data-action-ui-id={rowActionId}
      >
        {options.map((option2) => {
          const active2 = option2.value === value;
          return (
            <button
              key={option2.value}
              type="button"
              onClick={() => onChange(option2.value)}
              data-action-ui-id={option2.actionId}
              aria-pressed={active2}
              className={cn$2(
                "group inline-flex h-[26px] max-w-[112px] shrink-0 items-center justify-center rounded-full border px-[9px] text-xs font-normal shadow-none transition-colors duration-150 select-none focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:outline-none",
                active2
                  ? "border-foreground bg-transparent text-foreground"
                  : "border-border bg-transparent text-foreground/70 hover:border-foreground hover:bg-transparent",
              )}
            >
              <span className="truncate">{option2.label}</span>
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
    const handler = (e2) => {
      if (e2.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
}

function LightboxCloseButton({ onClose }) {
  const { t: t2 } = useTranslation();
  return (
    <button
      type="button"
      aria-label={t2("common.close")}
      className="absolute right-8 top-8 flex size-9 cursor-pointer items-center justify-center bg-white/10 text-white/80 transition-colors hover:text-white"
      onClick={(e2) => {
        e2.stopPropagation();
        onClose();
      }}
    >
      <StrokeIcon icon={X$7} size={16} />
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
      className="fixed inset-0 z-9999 flex flex-col items-center justify-center gap-4 bg-black/85 p-10 backdrop-blur-sm"
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
  const [content2, setContent2] = reactExports.useState(null);
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
      .then((text2) => setContent2(text2))
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
      className="fixed inset-0 z-9999 flex flex-col items-center justify-center gap-4 bg-black/85 p-10 backdrop-blur-sm"
      onClick={(e2) => {
        if (e2.target === e2.currentTarget) onClose();
      }}
    >
      <LightboxCloseButton onClose={onClose} />
      <span className="text-sm text-white/80 truncate max-w-[60vw]">{alt}</span>
      <div className="max-h-[70vh] w-full max-w-2xl overflow-auto rounded-lg border border-white/10 bg-white/5 p-4">
        {content2 === null && !error && (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={16} className="animate-spin text-white opacity-50" />
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        {content2 !== null && (
          <pre className="text-xs text-white/80 whitespace-pre-wrap break-words font-mono leading-relaxed">
            {content2}
          </pre>
        )}
      </div>
    </div>,
    document.body,
  );
}

const SearchInput = reactExports.memo(function SearchInput2({
  onDebouncedChange,
}) {
  const { t: t2 } = useTranslation();
  const inputRef = reactExports.useRef(null);
  const debounceRef = reactExports.useRef(null);
  const [hasValue, setHasValue] = reactExports.useState(false);
  const scheduleDebounce = useStableCallback((raw2) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onDebouncedChange(raw2.trim()), 200);
  });
  const handleInput = (e2) => {
    const next2 = e2.currentTarget.value;
    scheduleDebounce(next2);
    const nextHas = next2.trim().length > 0;
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
          placeholder={t2("assetSidebarPanel.searchPlaceholder")}
          defaultValue=""
          onInput={handleInput}
        />
        <button
          type="button"
          aria-label={t2("assetSidebarPanel.clearSearch", {
            defaultValue: "Clear search",
          })}
          onClick={handleClear}
          tabIndex={hasValue ? 0 : -1}
          className={cn$2(
            "inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-foreground/[0.05] hover:text-foreground",
            hasValue ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          data-action-ui-id="canvas-sidebar-asset-center.search-clear"
        >
          <StrokeIcon icon={X$7} size={12} />
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
  const { t: t2 } = useTranslation();
  const workspacePath = useCurrentWorkspace();
  const gatewayUrl2 = useGatewayUrl();
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
  const handleDelete2 = useStableCallback((entity) => setDeleteTarget(entity));
  const closeDelete = reactExports.useCallback(() => setDeleteTarget(null), []);
  const handleExport = useStableCallback((entity) => {
    const url2 = buildExportUrl(entity.id);
    if (!url2) return;
    const a2 = document.createElement("a");
    a2.href = url2;
    a2.rel = "noopener";
    document.body.appendChild(a2);
    a2.click();
    a2.remove();
  });
  const [internalDebouncedSearch, setInternalDebouncedSearch] =
    reactExports.useState("");
  const externalControlled = externalSearchQuery !== void 0;
  reactExports.useEffect(() => {
    if (!externalControlled) return;
    const id2 = setTimeout(() => {
      setInternalDebouncedSearch(externalSearchQuery.trim());
    }, 200);
    return () => clearTimeout(id2);
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
    const path2 =
      att.kind === "video"
        ? API_PATHS.assetCenterAttachmentPlayback(att.id)
        : API_PATHS.assetCenterAttachmentBlob(att.id);
    const src = gatewayUrl2(path2);
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
          t2("assetSidebarPanel.addToChatError", {
            message: t2(
              "assetSidebarPanel.addToChatErrorNoWorkspace",
              "当前没有可用的工作区",
            ),
          }),
        );
        return;
      }
      const match2 = anchored.agentPayload.attachments.find(
        (a2) => a2.id === att.id,
      );
      if (!match2) {
        dedupedToast.error(
          t2("assetSidebarPanel.addToChatError", {
            message: t2(
              "assetSidebarPanel.addToChatErrorAttachmentNotFound",
              "未找到该附件",
            ),
          }),
        );
        return;
      }
      workspaceEvents.fireAddToChat(match2.path, match2.filename);
      trackAssetUse({
        entity_id: att.entityId,
        entity_type: "custom",
        target: "chat",
        via: "hover_button",
        source_panel: "canvas_sidebar",
        was_materialized: false,
      });
    } catch (err) {
      const message2 = err instanceof Error ? err.message : String(err);
      dedupedToast.error(
        t2("assetSidebarPanel.addToChatError", {
          message: message2,
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
    const list2 = materializedQuery.data ?? [];
    return new Set(list2.map((e2) => e2.entityId));
  }, [materializedQuery.data]);
  const materializedOrder = reactExports.useMemo(() => {
    return (materializedQuery.data ?? []).map((e2) => e2.entityId);
  }, [materializedQuery.data]);
  const sortedEntities = reactExports.useMemo(() => {
    if (materializedIds.size === 0) return entities;
    const pinned = [];
    const rest = [];
    for (const e2 of entities) {
      if (materializedIds.has(e2.id)) pinned.push(e2);
      else rest.push(e2);
    }
    return [...pinned, ...rest];
  }, [entities, materializedIds]);
  const typeChipOptions = reactExports.useMemo(
    () =>
      TYPE_CHIPS.map((chip) => ({
        value: chip,
        label: t2(`assetCenter.types.${chip}`),
        actionId: `canvas-sidebar-asset-center.chip-${chip}`,
      })),
    [t2],
  );
  const entityById = reactExports.useMemo(() => {
    const map3 = new Map();
    for (const e2 of entities) map3.set(e2.id, e2);
    return map3;
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
                description: formatAssetCenterError(loadError, t2),
                retry: {
                  icon: <RetryIcon size={14} />,
                  onClick: refresh,
                },
              }}
            />
          ) : isLoading ? (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center select-none">
              {t2("common.loading")}
            </div>
          ) : entities.length === 0 ? (
            <PageStateBoundary
              empty={true}
              density="panel"
              className="h-full"
              emptyOptions={{
                title:
                  typeFilter === "all" && debouncedSearch === ""
                    ? t2("assetCenter.entityEmpty.title")
                    : t2(`assetSidebarPanel.emptyByType.${typeFilter}`),
                description:
                  typeFilter === "all" && debouncedSearch === ""
                    ? t2("assetSidebarPanel.emptyBody")
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
                    onKeyDown={(e2) => {
                      if (e2.key === "Enter" || e2.key === " ")
                        setPinnedOpen(!pinnedOpen);
                    }}
                  >
                    <StrokeIcon
                      icon={ChevronRight$1}
                      size={12}
                      className={`transition-transform ${pinnedOpen ? "rotate-90" : ""}`}
                    />
                    {t2(
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
                                onDelete={handleDelete2}
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
              {sortedEntities.some((e2) => !materializedIds.has(e2.id)) && (
                <>
                  <li
                    className="px-3 pt-1 pb-1 text-[11px] font-medium text-muted-foreground select-none flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => setAllOpen(!allOpen)}
                    onKeyDown={(e2) => {
                      if (e2.key === "Enter" || e2.key === " ")
                        setAllOpen(!allOpen);
                    }}
                  >
                    <StrokeIcon
                      icon={ChevronRight$1}
                      size={12}
                      className={`transition-transform ${allOpen ? "rotate-90" : ""}`}
                    />
                    {t2("assetSidebarPanel.allSection", "全部资产")}
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
                          .filter((e2) => !materializedIds.has(e2.id))
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
                              onDelete={handleDelete2}
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
