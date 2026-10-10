// asset-center-page.jsx
import { ArrowLeft, Check, CheckCircle2, ChevronDown, ChevronUp, LayoutGrid, Loader2, Plus, reactExports, Search, ShieldAlert, useMutation, useNavigate, useQuery, useQueryClient, useSearch, useTranslation, X$7 as X } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { PageStateBoundary } from "./page-state-boundary.jsx";
import { EntityCard } from "./entity-card.jsx";
import { EntityListRow } from "./entity-list-row.jsx";
import {
  classifyAssetError,
  jsonInit,
  ToggleGroup,
  ToggleGroupItem,
  trackAssetCenterAction,
  trackAssetCreate,
  useExportEntityUrl,
  useImportEntity,
} from "../infra/use-online.jsx";
import {
  AlertDialog,
  Button,
  cn$2 as cn,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../infra/dialog-content.jsx";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
} from "../infra/badge-variants.jsx";
import {
  assetCenterKeys,
  BASE,
  readEnvelope,
  readObject,
  ROOT_KEY,
  useAssetCenterFetcher,
  useEntities,
} from "./wrap-as-asset-center-error.js";
import { formatAssetCenterError } from "./key-entries.js";
import { Download, List, Sparkles, Upload } from "../media-editing/package.jsx";
import { buildWorkspaceSearch } from "../workspace/use-deep-link-router.js";
import { useGatewayUrl } from "../generation/use-model-catalog-scope-key.js";
import { ENTITY_TYPES } from "./audio-play-button.jsx";
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  Icon,
} from "../vendor-inline/vscode-base/graph.jsx";
import { CatalogPageHeading } from "./catalog-page-heading.jsx";
import { Input3 } from "../infra/select-content.jsx";
import { MaterializeWorkspaceDialog } from "./materialize-workspace-dialog.jsx";
import { AddEntityDialog } from "./add-entity-dialog.jsx";
import { EntityDeleteConfirm } from "./entity-delete-confirm.jsx";
import { EntityEditDialog } from "./entity-edit-dialog.jsx";
import { ImportEntityConflictError } from "./import-entity-conflict-error.js";
import { useDeleteEntity } from "./use-materialize-entity.js";
function exportEntitiesBatchUrl(buildUrl, entityIds) {
  if (entityIds.length === 0) return void 0;
  const ids2 = entityIds.map((id2) => encodeURIComponent(id2)).join(",");
  return buildUrl(`${BASE}/entities-export?ids=${ids2}`);
}
async function listPendingSuggestions(fetcher, limit) {
  const qs = `?limit=${encodeURIComponent(String(limit))}`;
  const res = await fetcher(`${BASE}/suggestions${qs}`);
  return readEnvelope(res, "suggestions", "suggestions", "array");
}
async function approveSuggestion(fetcher, suggestionId, request = {}) {
  const res = await fetcher(
    `${BASE}/suggestions/${encodeURIComponent(suggestionId)}/approve`,
    jsonInit("POST", request),
  );
  return readObject(res, "approve suggestion result");
}
async function rejectSuggestion(fetcher, suggestionId) {
  const res = await fetcher(
    `${BASE}/suggestions/${encodeURIComponent(suggestionId)}/reject`,
    {
      method: "POST",
    },
  );
  return readEnvelope(res, "suggestion", "rejected suggestion");
}
function usePendingSuggestions(limit) {
  const fetcher = useAssetCenterFetcher();
  return useQuery({
    queryKey: assetCenterKeys.suggestions(limit),
    queryFn: () => listPendingSuggestions(fetcher, limit),
  });
}
function useExportEntitiesBatchUrl() {
  const buildUrl = useGatewayUrl();
  return (entityIds) => exportEntitiesBatchUrl(buildUrl, entityIds);
}
function useApproveSuggestion() {
  const queryClient2 = useQueryClient();
  const fetcher = useAssetCenterFetcher();
  return useMutation({
    mutationFn: ({ suggestionId, request }) =>
      approveSuggestion(fetcher, suggestionId, request),
    onSuccess: () => {
      queryClient2.invalidateQueries({
        queryKey: ROOT_KEY,
      });
    },
  });
}
function useRejectSuggestion() {
  const queryClient2 = useQueryClient();
  const fetcher = useAssetCenterFetcher();
  return useMutation({
    mutationFn: ({ suggestionId }) => rejectSuggestion(fetcher, suggestionId),
    onSuccess: () => {
      queryClient2.invalidateQueries({
        queryKey: ROOT_KEY,
      });
    },
  });
}
const TYPE_CHIPS = ["all", ...ENTITY_TYPES];
const SORT_MODES = ["updated_at", "use_count"];
function AssetCenterToolbar({
  onBack,
  search: search2,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
  onAddClick,
  onImportFile,
  isImporting,
}) {
  const { t: t2 } = useTranslation();
  const importInputRef = reactExports.useRef(null);
  return (
    <div
      className="shrink-0 bg-[var(--home-content-surface)] px-8 md:px-12 pt-7"
      data-window-app-controls-safe-row="true"
    >
      <div className="relative z-10 border-b border-border-soft pb-6">
        <div className="mt-3 flex min-w-0 items-start gap-2">
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-0.5 size-8 rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              onClick={onBack}
              aria-label={t2("assetCenter.backToWorkspace")}
              title={t2("assetCenter.backToWorkspace")}
              data-action-ui-id="asset-center-back-to-workspace"
            >
              <Icon icon={ArrowLeft} size="md" aria-hidden={true} />
            </Button>
          ) : null}
          <CatalogPageHeading
            title={t2("assetCenter.title")}
            description={t2("assetCenter.subtitle")}
          />
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Button
            size="default"
            className="h-9 gap-1.5 rounded-lg px-4 text-[13px] font-medium"
            onClick={onAddClick}
            data-action-ui-id="asset-center-add-entity"
          >
            <Plus size={16} strokeWidth={1.5} />
            {t2("assetCenter.add")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="default"
            className="h-9 gap-1.5 rounded-lg px-4 text-[13px] font-medium"
            onClick={() => importInputRef.current?.click()}
            disabled={isImporting}
            data-action-ui-id="asset-center-toolbar-import"
          >
            <Upload size={16} strokeWidth={1.5} />
            {t2("assetCenter.import.action")}
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".zip,application/zip"
            multiple={true}
            className="hidden"
            data-action-ui-id="asset-center-toolbar-import-input"
            onChange={(e2) => {
              const files = Array.from(e2.target.files ?? []);
              e2.target.value = "";
              if (files.length > 0) onImportFile(files);
            }}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-4 pb-3">
        <ToggleGroup
          value={[typeFilter]}
          onValueChange={(values3) => {
            onTypeFilterChange(values3[0] ?? "all");
          }}
          className="gap-1"
          aria-label={t2("assetCenter.typeFilter.label")}
        >
          {TYPE_CHIPS.map((chip) => (
            <ToggleGroupItem
              key={chip}
              value={chip}
              data-action-ui-id={`asset-center-filter-${chip}`}
              className="h-7 px-3 text-xs !rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-muted/60 aria-pressed:bg-foreground/10 aria-pressed:text-foreground aria-pressed:font-medium"
            >
              {t2(`assetCenter.types.${chip}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <div className="relative flex h-8 w-full max-w-64 items-center">
            <Search
              size={14}
              strokeWidth={1.5}
              aria-hidden="true"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input3
              value={search2}
              onChange={(e2) => onSearchChange(e2.target.value)}
              placeholder={t2("assetCenter.searchPlaceholder")}
              aria-label={t2("assetCenter.searchPlaceholder")}
              className="h-8 pl-8 pr-8"
              data-action-ui-id="asset-center-search"
            />
            {search2 ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label={t2("common.clear")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                data-action-ui-id="asset-center-search-clear"
              >
                <X size={13} strokeWidth={1.5} />
              </button>
            ) : null}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t2("assetCenter.sort.label", "排序")}
              data-action-ui-id="asset-center-sort"
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-foreground/[0.05] px-3 text-xs text-muted-foreground transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
            >
              {t2(`assetCenter.sort.${sort}`)}
              <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="bottom"
              sideOffset={4}
              className="min-w-40"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  {t2("assetCenter.sort.label", "排序")}
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={sort}
                  aria-label={t2("assetCenter.sort.label", "排序")}
                  onValueChange={(v2) => onSortChange(v2)}
                >
                  {SORT_MODES.map((mode2) => (
                    <DropdownMenuRadioItem key={mode2} value={mode2}>
                      {t2(`assetCenter.sort.${mode2}`)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onViewModeChange("grid")}
              aria-pressed={viewMode === "grid"}
              title={t2("assetCenter.viewMode.grid")}
              data-action-ui-id="asset-center-toolbar-view-grid"
              className={cn(
                viewMode === "grid"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid size={16} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onViewModeChange("list")}
              aria-pressed={viewMode === "list"}
              title={t2("assetCenter.viewMode.list")}
              data-action-ui-id="asset-center-toolbar-view-list"
              className={cn(
                viewMode === "list"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
function assetCenterSearchWithoutAction(returnWorkspaceId) {
  return returnWorkspaceId
    ? {
        returnWorkspaceId,
      }
    : {};
}
function buildAssetCenterWorkspaceReturn(returnWorkspaceId) {
  return {
    to: "/workspace",
    search: buildWorkspaceSearch(returnWorkspaceId),
    replace: true,
  };
}
const VIEW_MODE_STORAGE_KEY = "assetCenter.viewMode";
function readInitialViewMode() {
  try {
    const raw2 = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (raw2 === "grid" || raw2 === "list") return raw2;
  } catch {}
  return "grid";
}
function useAssetCenterPage() {
  const [typeFilter, setTypeFilter] = reactExports.useState("all");
  const [search2, setSearch] = reactExports.useState("");
  const [sort, setSort] = reactExports.useState("updated_at");
  const [viewMode, setViewMode] = reactExports.useState(readInitialViewMode);
  reactExports.useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {}
  }, [viewMode]);
  const listOpts = reactExports.useMemo(() => {
    const opts = {};
    if (typeFilter !== "all") opts.type = typeFilter;
    if (search2.trim()) opts.q = search2.trim();
    return opts;
  }, [typeFilter, search2]);
  const entitiesQuery = useEntities(listOpts);
  const entities = reactExports.useMemo(() => {
    const data2 = entitiesQuery.data ?? [];
    if (sort === "use_count") {
      return [...data2].sort(
        (a2, b3) => b3.useCount - a2.useCount || b3.updatedAt - a2.updatedAt,
      );
    }
    return data2;
  }, [entitiesQuery.data, sort]);
  const isLoading = entitiesQuery.isPending;
  const isEmpty2 =
    !entitiesQuery.isPending &&
    !entitiesQuery.isError &&
    entities.length === 0 &&
    !search2.trim() &&
    typeFilter === "all";
  const loadError = entitiesQuery.error ?? null;
  return {
    isLoading,
    loadError,
    typeFilter,
    search: search2,
    sort,
    viewMode,
    entities,
    isEmpty: isEmpty2,
    setTypeFilter,
    setSearch,
    setSort,
    setViewMode,
  };
}
function EntityEmptyState({ onCreate, filteredTitle, density = "page" } = {}) {
  const { t: t2 } = useTranslation();
  return (
    <PageStateBoundary
      empty={true}
      density={density}
      className="h-full"
      emptyOptions={{
        title: filteredTitle ?? t2("assetCenter.entityEmpty.title"),
        description: filteredTitle
          ? void 0
          : t2("assetCenter.entityEmpty.body"),
        actions: onCreate
          ? [
              {
                key: "create",
                icon: <Plus size={14} strokeWidth={2} />,
                label: t2("assetSidebarPanel.createCta"),
                variant: "default",
                onClick: onCreate,
              },
            ]
          : void 0,
      }}
    />
  );
}
function EntityGrid({
  entities,
  onCardClick,
  onMaterialize,
  onDelete,
  selectedIds,
  onToggleSelect,
}) {
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      }}
      data-action-ui-id="asset-center-grid"
    >
      {entities.map((ent) => (
        <EntityCard
          key={ent.id}
          entity={ent}
          onClick={() => onCardClick(ent.id)}
          onMaterialize={
            onMaterialize
              ? () =>
                  onMaterialize({
                    id: ent.id,
                    name: ent.name,
                  })
              : void 0
          }
          onDelete={onDelete ? () => onDelete(ent) : void 0}
          selected={selectedIds?.has(ent.id) ?? false}
          onToggleSelect={
            onToggleSelect ? () => onToggleSelect(ent.id) : void 0
          }
        />
      ))}
    </div>
  );
}
function EntityList({
  entities,
  onCardClick,
  onMaterialize,
  onDelete,
  draggable = false,
  selectedIds,
  onToggleSelect,
}) {
  const exportUrl = useExportEntityUrl();
  const triggerExport = reactExports.useCallback(
    (entity) => {
      const url2 = exportUrl(entity.id);
      if (!url2) return;
      const a2 = document.createElement("a");
      a2.href = url2;
      a2.rel = "noopener";
      document.body.appendChild(a2);
      a2.click();
      a2.remove();
      trackAssetCenterAction({
        action: "entity_export",
        surface: "asset_center_page",
        entity_id: entity.id,
        entity_type: entity.type,
        success: true,
      });
    },
    [exportUrl],
  );
  return (
    <div
      className="flex flex-col border border-border rounded-lg bg-card overflow-hidden"
      data-action-ui-id="asset-center-list"
    >
      {entities.map((ent, idx) => (
        <EntityListRow
          key={ent.id}
          entity={ent}
          onClick={() => onCardClick(ent.id)}
          onMaterialize={
            onMaterialize
              ? () =>
                  onMaterialize({
                    id: ent.id,
                    name: ent.name,
                  })
              : void 0
          }
          onExport={() => triggerExport(ent)}
          onDelete={onDelete ? () => onDelete(ent) : void 0}
          draggable={draggable}
          isLast={idx === entities.length - 1}
          selected={selectedIds?.has(ent.id) ?? false}
          onToggleSelect={
            onToggleSelect ? () => onToggleSelect(ent.id) : void 0
          }
        />
      ))}
    </div>
  );
}
function ImportConflictDialog({
  open,
  existingEntity,
  importingName,
  onChoose,
  onCancel,
}) {
  const { t: t2 } = useTranslation();
  const [pendingMode, setPendingMode] = reactExports.useState(null);
  const handleChoose = async (mode2) => {
    setPendingMode(mode2);
    try {
      await onChoose(mode2);
    } finally {
      setPendingMode(null);
    }
  };
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next2) => {
        if (!next2 && pendingMode === null) onCancel();
      }}
    >
      <AlertDialogContent
        className="sm:max-w-md"
        data-action-ui-id="asset-center-import-conflict-dialog"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-destructive" />
            {t2("assetCenter.import.conflictTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs space-y-2 text-left">
            <span className="block">
              {t2("assetCenter.import.conflictDescription", {
                name: existingEntity?.name ?? "",
                type: existingEntity
                  ? t2(`assetCenter.types.${existingEntity.type}`)
                  : "",
              })}
            </span>
            {existingEntity &&
              importingName &&
              importingName !== existingEntity.name && (
                <span className="block text-muted-foreground/80">
                  {t2("assetCenter.import.conflictRenameHint", {
                    oldName: existingEntity.name,
                    newName: importingName,
                  })}
                </span>
              )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-between sm:gap-2">
          <AlertDialogCancel
            disabled={pendingMode !== null}
            data-action-ui-id="asset-center-import-conflict-cancel"
          >
            {t2("common.cancel")}
          </AlertDialogCancel>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogAction
              variant="outline"
              onClick={() => void handleChoose("copy")}
              disabled={pendingMode !== null}
              data-action-ui-id="asset-center-import-conflict-copy"
            >
              {pendingMode === "copy" && (
                <Loader2 size={14} className="animate-spin mr-1.5" />
              )}
              {t2("assetCenter.import.actionCopy")}
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => void handleChoose("overwrite")}
              disabled={pendingMode !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-action-ui-id="asset-center-import-conflict-overwrite"
            >
              {pendingMode === "overwrite" && (
                <Loader2 size={14} className="animate-spin mr-1.5" />
              )}
              {t2("assetCenter.import.actionOverwrite")}
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
function SuggestionCard({ suggestion }) {
  const { t: t2 } = useTranslation();
  const approve = useApproveSuggestion();
  const reject = useRejectSuggestion();
  const [error, setError] = reactExports.useState(null);
  const handleApprove = async () => {
    setError(null);
    try {
      await approve.mutateAsync({
        suggestionId: suggestion.id,
      });
      trackAssetCreate({
        source: "asset_center_page",
        method: "agent_suggestion",
        entity_type: suggestion.suggested.type,
        success: true,
        attachment_count: suggestion.suggested.attachmentRefs?.length ?? 0,
        has_description: !!suggestion.suggested.description,
      });
    } catch (err) {
      setError(formatAssetCenterError(err, t2));
      trackAssetCreate({
        source: "asset_center_page",
        method: "agent_suggestion",
        entity_type: suggestion.suggested.type,
        success: false,
        attachment_count: suggestion.suggested.attachmentRefs?.length ?? 0,
        has_description: !!suggestion.suggested.description,
        error_type: classifyAssetError(err),
      });
    }
  };
  const handleReject = async () => {
    setError(null);
    try {
      await reject.mutateAsync({
        suggestionId: suggestion.id,
      });
    } catch (err) {
      setError(formatAssetCenterError(err, t2));
    }
  };
  const isBusy = approve.isPending || reject.isPending;
  const attachmentCount = suggestion.suggested.attachmentRefs?.length ?? 0;
  return (
    <article
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-xs"
      data-action-ui-id="asset-center-suggestion-card"
      data-suggestion-id={suggestion.id}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {suggestion.suggested.name}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge
              variant="secondary"
              className="text-[10px] h-4 px-1.5 font-normal"
            >
              {t2(`assetCenter.types.${suggestion.suggested.type}`)}
            </Badge>
            {attachmentCount > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {t2("assetCenter.suggestions.attachmentCount", {
                  count: attachmentCount,
                })}
              </span>
            )}
          </div>
        </div>
      </div>
      {suggestion.suggested.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {suggestion.suggested.description}
        </p>
      )}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      <div className="flex items-center gap-1.5 mt-1">
        <Button
          size="sm"
          className="h-7 gap-1.5 text-xs flex-1"
          onClick={() => void handleApprove()}
          disabled={isBusy}
          data-action-ui-id="asset-center-suggestion-approve"
        >
          {approve.isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Check size={12} />
          )}
          {t2("assetCenter.suggestions.approve")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground"
          onClick={() => void handleReject()}
          disabled={isBusy}
          data-action-ui-id="asset-center-suggestion-reject"
        >
          {reject.isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <X size={12} />
          )}
          {t2("assetCenter.suggestions.reject")}
        </Button>
      </div>
    </article>
  );
}
function SuggestionPanel() {
  const { t: t2 } = useTranslation();
  const [collapsed, setCollapsed] = reactExports.useState(false);
  const suggestions = usePendingSuggestions(20);
  const list2 = suggestions.data ?? [];
  if (suggestions.isError) {
    return (
      <section
        className="border-b border-border bg-destructive/5 px-16 py-2 text-xs text-destructive"
        data-action-ui-id="asset-center-suggestion-error"
      >
        {t2("assetCenter.suggestions.loadError", {
          message: suggestions.error.message,
        })}
      </section>
    );
  }
  if (list2.length === 0) return null;
  return (
    <section
      className="border-b border-border bg-[var(--home-content-surface)] px-16 py-3"
      data-action-ui-id="asset-center-suggestion-panel"
      data-suggestion-count={list2.length}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-foreground/60" />
          <h2 className="text-xs font-medium">
            {t2("assetCenter.suggestions.title", {
              count: list2.length,
            })}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground"
          onClick={() => setCollapsed((c3) => !c3)}
          data-action-ui-id="asset-center-suggestion-panel-toggle"
        >
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          {collapsed
            ? t2("assetCenter.suggestions.expand")
            : t2("assetCenter.suggestions.collapse")}
        </Button>
      </div>
      {!collapsed && (
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
          {list2.map((sug) => (
            <SuggestionCard key={sug.id} suggestion={sug} />
          ))}
        </div>
      )}
    </section>
  );
}
export function AssetCenterPage({ surface = "route", initialAction } = {}) {
  const { t: t2 } = useTranslation();
  const page = useAssetCenterPage();
  const importMutation = useImportEntity();
  const [editId, setEditId] = reactExports.useState(null);
  const [deleteTarget, setDeleteTarget] = reactExports.useState(null);
  const [addOpen, setAddOpen] = reactExports.useState(false);
  const search2 = useSearch({
    from: "/_home/asset-center/",
    shouldThrow: false,
  });
  const returnWorkspaceId =
    surface === "route" ? search2?.returnWorkspaceId : void 0;
  const navigate = useNavigate();
  const routeAction = surface === "route" ? search2?.action : void 0;
  reactExports.useEffect(() => {
    if (surface !== "route") return;
    if (routeAction === "create") {
      setAddOpen(true);
      navigate({
        to: "/asset-center",
        search: assetCenterSearchWithoutAction(returnWorkspaceId),
        replace: true,
      });
    }
  }, [surface, routeAction, returnWorkspaceId, navigate]);
  reactExports.useEffect(() => {
    if (surface !== "sheet") return;
    if (initialAction === "create") setAddOpen(true);
  }, [surface, initialAction]);
  const handleBackToWorkspace = reactExports.useCallback(() => {
    if (!returnWorkspaceId) return;
    navigate(buildAssetCenterWorkspaceReturn(returnWorkspaceId));
  }, [navigate, returnWorkspaceId]);
  const [materializeTarget, setMaterializeTarget] = reactExports.useState(null);
  const [selectedEntityIds, setSelectedEntityIds] = reactExports.useState(
    () => new Set(),
  );
  const toggleSelectEntity = reactExports.useCallback((entityId) => {
    setSelectedEntityIds((prev) => {
      const next2 = new Set(prev);
      if (next2.has(entityId)) {
        next2.delete(entityId);
      } else {
        next2.add(entityId);
      }
      return next2;
    });
  }, []);
  const clearSelection = reactExports.useCallback(
    () => setSelectedEntityIds(new Set()),
    [],
  );
  const deleteMutation = useDeleteEntity();
  const [batchDeleteError, setBatchDeleteError] = reactExports.useState(null);
  const [batchDeleting, setBatchDeleting] = reactExports.useState(false);
  const runBatchDelete = reactExports.useCallback(async () => {
    if (selectedEntityIds.size === 0) return;
    setBatchDeleteError(null);
    setBatchDeleting(true);
    const remaining = new Set(selectedEntityIds);
    try {
      for (const id2 of selectedEntityIds) {
        await deleteMutation.mutateAsync({
          entityId: id2,
        });
        remaining.delete(id2);
      }
      clearSelection();
    } catch (err) {
      setSelectedEntityIds(remaining);
      setBatchDeleteError(formatAssetCenterError(err, t2));
    } finally {
      setBatchDeleting(false);
    }
  }, [selectedEntityIds, deleteMutation, clearSelection, t2]);
  const buildBatchExportUrl = useExportEntitiesBatchUrl();
  const runBatchExport = reactExports.useCallback(() => {
    if (selectedEntityIds.size === 0) return;
    const url2 = buildBatchExportUrl([...selectedEntityIds]);
    if (!url2) return;
    const a2 = document.createElement("a");
    a2.href = url2;
    a2.rel = "noopener";
    document.body.appendChild(a2);
    a2.click();
    a2.remove();
  }, [selectedEntityIds, buildBatchExportUrl]);
  const [importSuccess, setImportSuccess] = reactExports.useState(null);
  const [importError, setImportError] = reactExports.useState(null);
  const [conflictState, setConflictState] = reactExports.useState(null);
  const openEdit = reactExports.useCallback((eid) => {
    setEditId(eid);
  }, []);
  const closeEdit = reactExports.useCallback(() => setEditId(null), []);
  const openDelete = reactExports.useCallback((entity) => {
    setDeleteTarget(entity);
    setEditId(null);
  }, []);
  const closeDelete = reactExports.useCallback(() => setDeleteTarget(null), []);
  const openAdd = reactExports.useCallback(() => setAddOpen(true), []);
  const closeAdd = reactExports.useCallback(() => setAddOpen(false), []);
  const openMaterialize = reactExports.useCallback((entity) => {
    setMaterializeTarget(entity);
    setEditId(null);
  }, []);
  const closeMaterialize = reactExports.useCallback(
    () => setMaterializeTarget(null),
    [],
  );
  const runImport = reactExports.useCallback(
    async (file, mode2) => {
      setImportSuccess(null);
      setImportError(null);
      try {
        const result = await importMutation.mutateAsync({
          file,
          mode: mode2,
        });
        setImportSuccess({
          name: result.entity.name,
          warnings: result.warnings,
        });
        dedupedToast.success(
          t2("assetCenter.import.toastSuccess", {
            name: result.entity.name,
          }),
        );
        setConflictState(null);
        trackAssetCreate({
          source: "asset_center_page",
          method: "import",
          entity_type: result.entity.type,
          success: true,
          has_description: !!result.entity.description,
          import_mode: mode2,
        });
      } catch (err) {
        if (err instanceof ImportEntityConflictError) {
          setConflictState({
            file,
            existingEntity: err.conflict.existingEntity,
            importingName: err.conflict.importedManifest.name,
          });
          return;
        }
        setImportError(formatAssetCenterError(err, t2));
        trackAssetCreate({
          source: "asset_center_page",
          method: "import",
          success: false,
          has_description: false,
          import_mode: mode2,
          error_type: classifyAssetError(err),
        });
      }
    },
    [importMutation, t2],
  );
  const handleImportFile = reactExports.useCallback(
    (file) => void runImport(file, "create-new"),
    [runImport],
  );
  const [batchImportProgress, setBatchImportProgress] =
    reactExports.useState(null);
  const [batchImportSummary, setBatchImportSummary] =
    reactExports.useState(null);
  const handleImportFiles = reactExports.useCallback(
    async (files) => {
      if (files.length === 1) {
        const single = files[0];
        if (single) handleImportFile(single);
        return;
      }
      setImportSuccess(null);
      setImportError(null);
      setBatchImportSummary(null);
      const succeeded = [];
      const failed = [];
      for (let i2 = 0; i2 < files.length; i2++) {
        const file = files[i2];
        if (!file) continue;
        setBatchImportProgress({
          current: i2 + 1,
          total: files.length,
        });
        try {
          const result = await importMutation.mutateAsync({
            file,
            mode: "create-new",
          });
          succeeded.push(result.entity.name);
          trackAssetCreate({
            source: "asset_center_page",
            method: "import",
            entity_type: result.entity.type,
            success: true,
            has_description: !!result.entity.description,
            import_mode: "create-new",
          });
        } catch (err) {
          if (err instanceof ImportEntityConflictError) {
            failed.push({
              name: file.name,
              message: t2("assetCenter.import.conflictBatchSkipped", {
                existingName: err.conflict.existingEntity.name,
              }),
            });
          } else {
            failed.push({
              name: file.name,
              message: formatAssetCenterError(err, t2),
            });
          }
          trackAssetCreate({
            source: "asset_center_page",
            method: "import",
            success: false,
            has_description: false,
            import_mode: "create-new",
            error_type:
              err instanceof ImportEntityConflictError
                ? "conflict"
                : classifyAssetError(err),
          });
        }
      }
      setBatchImportProgress(null);
      setBatchImportSummary({
        succeeded,
        failed,
      });
    },
    [importMutation, handleImportFile, t2],
  );
  const handleConflictChoice = reactExports.useCallback(
    async (mode2) => {
      if (!conflictState) return;
      await runImport(conflictState.file, mode2);
    },
    [conflictState, runImport],
  );
  const closeConflictDialog = reactExports.useCallback(
    () => setConflictState(null),
    [],
  );
  return (
    <div className="flex flex-col h-full min-h-0 bg-[var(--home-content-surface)]">
      <AssetCenterToolbar
        onBack={returnWorkspaceId ? handleBackToWorkspace : void 0}
        search={page.search}
        onSearchChange={page.setSearch}
        typeFilter={page.typeFilter}
        onTypeFilterChange={page.setTypeFilter}
        sort={page.sort}
        onSortChange={page.setSort}
        viewMode={page.viewMode}
        onViewModeChange={page.setViewMode}
        onAddClick={openAdd}
        onImportFile={handleImportFiles}
        isImporting={importMutation.isPending}
      />
      <SuggestionPanel />
      {selectedEntityIds.size > 0 && (
        <div
          className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-soft bg-[var(--home-content-surface)] px-8 md:px-12 py-2"
          data-action-ui-id="asset-center-batch-action-bar"
        >
          <span className="text-xs">
            {t2("assetCenter.batch.selected", {
              count: selectedEntityIds.size,
            })}
          </span>
          <span className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={clearSelection}
            disabled={batchDeleting}
            data-action-ui-id="asset-center-batch-clear"
          >
            {t2("assetCenter.batch.clear")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 gap-1.5"
            onClick={runBatchExport}
            disabled={batchDeleting}
            data-action-ui-id="asset-center-batch-export"
          >
            <Download size={12} />
            {t2("assetCenter.batch.export", {
              count: selectedEntityIds.size,
            })}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 gap-1.5"
            onClick={() => void runBatchDelete()}
            disabled={batchDeleting}
            data-action-ui-id="asset-center-batch-delete"
          >
            {batchDeleting && <Loader2 size={12} className="animate-spin" />}
            {t2("assetCenter.batch.delete", {
              count: selectedEntityIds.size,
            })}
          </Button>
        </div>
      )}
      {batchDeleteError && (
        <div
          className="mx-8 mt-2 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 md:mx-12"
          data-action-ui-id="asset-center-batch-delete-error"
        >
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-destructive" />
          <p className="text-xs text-destructive">{batchDeleteError}</p>
        </div>
      )}
      {batchImportProgress && (
        <div
          className="mx-10 mt-2 flex items-center gap-2 rounded-lg border border-foreground/20 bg-muted/30 px-3 py-2"
          data-action-ui-id="asset-center-batch-import-progress"
        >
          <Loader2 size={14} className="shrink-0 animate-spin" />
          <p className="text-xs">
            {t2("assetCenter.batch.importing", {
              current: batchImportProgress.current,
              total: batchImportProgress.total,
            })}
          </p>
        </div>
      )}
      {batchImportSummary && (
        <div
          className="mx-10 mt-2 flex items-start gap-2 rounded-lg border border-foreground/20 bg-muted/30 px-3 py-2"
          data-action-ui-id="asset-center-batch-import-summary"
        >
          {batchImportSummary.failed.length === 0 ? (
            <CheckCircle2
              size={14}
              className="mt-0.5 shrink-0 text-foreground"
            />
          ) : (
            <ShieldAlert
              size={14}
              className="mt-0.5 shrink-0 text-destructive"
            />
          )}
          <div className="text-xs min-w-0 flex-1 space-y-1">
            <p>
              {t2("assetCenter.batch.imported", {
                count: batchImportSummary.succeeded.length,
              })}
            </p>
            {batchImportSummary.failed.length > 0 && (
              <ul className="text-[11px] text-destructive/90 space-y-0.5 pl-4 list-disc">
                {batchImportSummary.failed.map((f2) => (
                  <li key={f2.name} className="break-words">
                    <span className="font-medium">{f2.name}</span>
                    {": "}
                    {f2.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 -mt-0.5 -mr-1 text-muted-foreground hover:text-foreground"
            onClick={() => setBatchImportSummary(null)}
            aria-label={t2("common.close")}
            data-action-ui-id="asset-center-batch-import-summary-close"
          >
            <X size={12} />
          </Button>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto px-8 md:px-12 pt-3 pb-6 space-y-3 [scrollbar-gutter:stable]">
        {importSuccess && (
          <div
            className="flex items-start gap-2 rounded-lg border border-foreground/20 bg-muted/30 px-3 py-2"
            data-action-ui-id="asset-center-import-success"
          >
            <CheckCircle2
              size={14}
              className="mt-0.5 shrink-0 text-foreground"
            />
            <div className="text-xs min-w-0 flex-1 space-y-1">
              <p>
                {importSuccess.warnings.length > 0
                  ? t2("assetCenter.import.successWithWarnings", {
                      name: importSuccess.name,
                      count: importSuccess.warnings.length,
                    })
                  : t2("assetCenter.import.success", {
                      name: importSuccess.name,
                    })}
              </p>
              {importSuccess.warnings.length > 0 && (
                <ul
                  className="text-[11px] text-muted-foreground/90 space-y-0.5 pl-4 list-disc"
                  data-action-ui-id="asset-center-import-warning-list"
                >
                  {importSuccess.warnings.map((w3) => (
                    <li
                      key={`${w3.code}:${Object.values(w3.params ?? {}).join(",")}`}
                      className="whitespace-pre-wrap break-words"
                    >
                      {t2(`assetCenter.warnings.${w3.code}`, {
                        ...w3.params,
                      })}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0 -mt-0.5 -mr-1 text-muted-foreground hover:text-foreground"
              onClick={() => setImportSuccess(null)}
              aria-label={t2("common.close")}
              data-action-ui-id="asset-center-import-success-close"
            >
              <X size={12} />
            </Button>
          </div>
        )}
        {importError && (
          <div
            className="flex items-center gap-2 border border-destructive/50 bg-destructive/10 px-3 py-2 rounded-lg"
            data-action-ui-id="asset-center-import-error"
          >
            <ShieldAlert size={14} className="shrink-0 text-destructive" />
            <p className="text-xs text-destructive flex-1 min-w-0">
              {t2("assetCenter.import.error", {
                message: importError,
              })}
            </p>
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0 -mr-1 text-destructive/70 hover:text-destructive"
              onClick={() => setImportError(null)}
              aria-label={t2("common.close")}
              data-action-ui-id="asset-center-import-error-close"
            >
              <X size={12} />
            </Button>
          </div>
        )}
        {page.loadError ? (
          <div
            className="flex items-start gap-2 border border-destructive/50 bg-destructive/10 px-3 py-3 rounded-lg"
            data-action-ui-id="asset-center-load-error"
          >
            <ShieldAlert
              size={16}
              className="mt-0.5 shrink-0 text-destructive"
            />
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-medium text-destructive">
                {t2("assetCenter.loadError.title")}
              </p>
              <p className="text-xs text-destructive/80">
                {page.loadError.message}
              </p>
            </div>
          </div>
        ) : page.isLoading ? (
          <div className="text-xs text-muted-foreground py-12 text-center">
            {t2("assetCenter.loading")}
          </div>
        ) : page.entities.length === 0 ? (
          <EntityEmptyState
            density={surface === "sheet" ? "panel" : "page"}
            filteredTitle={
              page.isEmpty
                ? void 0
                : page.search.trim()
                  ? t2("assetCenter.searchEmpty")
                  : t2(`assetSidebarPanel.emptyByType.${page.typeFilter}`)
            }
          />
        ) : page.viewMode === "list" ? (
          <EntityList
            entities={page.entities}
            onCardClick={openEdit}
            selectedIds={selectedEntityIds}
            onToggleSelect={toggleSelectEntity}
            onMaterialize={openMaterialize}
            onDelete={openDelete}
          />
        ) : (
          <EntityGrid
            entities={page.entities}
            onCardClick={openEdit}
            selectedIds={selectedEntityIds}
            onToggleSelect={toggleSelectEntity}
            onMaterialize={openMaterialize}
            onDelete={openDelete}
          />
        )}
      </div>
      <EntityEditDialog
        entityId={editId}
        onClose={closeEdit}
        onDelete={openDelete}
        onMaterialize={openMaterialize}
      />
      <EntityDeleteConfirm entity={deleteTarget} onClose={closeDelete} />
      <AddEntityDialog open={addOpen} onClose={closeAdd} />
      <MaterializeWorkspaceDialog
        entity={materializeTarget}
        onClose={closeMaterialize}
      />
      <ImportConflictDialog
        open={conflictState !== null}
        existingEntity={conflictState?.existingEntity ?? null}
        importingName={conflictState?.importingName ?? ""}
        onChoose={handleConflictChoice}
        onCancel={closeConflictDialog}
      />
    </div>
  );
}
