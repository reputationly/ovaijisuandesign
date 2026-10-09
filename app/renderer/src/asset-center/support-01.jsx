// support-01.jsx
import {
  useTranslation,
  reactExports,
  X$7,
  useQueryClient,
  useGatewayUrl,
  useMutation,
  ROOT_KEY$1,
  useAssetCenterFetcher,
  Icon,
  ArrowLeft,
  Plus,
  Upload,
  Search,
  DropdownMenu,
  ChevronDown,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  LayoutGrid,
  List,
  BASE,
  readObject,
  readEnvelope$1,
  useQuery,
  assetCenterKeys,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ENTITY_TYPES } from "./shared/attachment-upload-zone.jsx";
import { ToggleGroup, ToggleGroupItem, jsonInit } from "./shared/misc-02.jsx";
import { Input3 } from "./shared/select-content.jsx";
import {
  Button$1,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  cn$2,
} from "./shared/use-browser-overlay-dialog-props.jsx";
function exportEntitiesBatchUrl(buildUrl, entityIds) {
  if (entityIds.length === 0) return void 0;
  const ids2 = entityIds.map((id2) => encodeURIComponent(id2)).join(",");
  return buildUrl(`${BASE}/entities-export?ids=${ids2}`);
}
async function listPendingSuggestions(fetcher, limit) {
  const qs = `?limit=${encodeURIComponent(String(limit))}`;
  const res = await fetcher(`${BASE}/suggestions${qs}`);
  return readEnvelope$1(res, "suggestions", "suggestions", "array");
}
async function approveSuggestion(fetcher, suggestionId, request = {}) {
  const res = await fetcher(
    `${BASE}/suggestions/${encodeURIComponent(suggestionId)}/approve`,
    jsonInit("POST", request),
  );
  return readObject(res, "approve suggestion result");
}
async function rejectSuggestion(fetcher, suggestionId) {
  const res = await fetcher(`${BASE}/suggestions/${encodeURIComponent(suggestionId)}/reject`, {
    method: "POST",
  });
  return readEnvelope$1(res, "suggestion", "rejected suggestion");
}
export function usePendingSuggestions(limit) {
  const fetcher = useAssetCenterFetcher();
  return useQuery({
    queryKey: assetCenterKeys.suggestions(limit),
    queryFn: () => listPendingSuggestions(fetcher, limit),
  });
}
export function useExportEntitiesBatchUrl() {
  const buildUrl = useGatewayUrl();
  return (entityIds) => exportEntitiesBatchUrl(buildUrl, entityIds);
}
export function useApproveSuggestion() {
  const queryClient2 = useQueryClient();
  const fetcher = useAssetCenterFetcher();
  return useMutation({
    mutationFn: ({ suggestionId, request }) => approveSuggestion(fetcher, suggestionId, request),
    onSuccess: () => {
      queryClient2.invalidateQueries({
        queryKey: ROOT_KEY$1,
      });
    },
  });
}
export function useRejectSuggestion() {
  const queryClient2 = useQueryClient();
  const fetcher = useAssetCenterFetcher();
  return useMutation({
    mutationFn: ({ suggestionId }) => rejectSuggestion(fetcher, suggestionId),
    onSuccess: () => {
      queryClient2.invalidateQueries({
        queryKey: ROOT_KEY$1,
      });
    },
  });
}
export function CatalogPageHeading({ title, description, level = 1, variant = "page", className }) {
  const Heading2 = level === 1 ? "h1" : "h2";
  const page = variant === "page";
  return (
    <div className={cn$2("min-w-0", className)} data-slot="catalog-page-heading">
      <Heading2
        className={cn$2(
          "font-heading font-medium tracking-[0.02em] text-foreground",
          page ? "text-[20px] leading-tight" : "text-lg",
        )}
      >
        {title}
      </Heading2>
      <p
        className={cn$2(
          "text-[15px] leading-5 text-[var(--catalog-page-subtitle-foreground)]",
          page ? "mt-2" : "mt-1",
        )}
        data-slot="catalog-page-subtitle"
      >
        {description}
      </p>
    </div>
  );
}
const TYPE_CHIPS$1 = ["all", ...ENTITY_TYPES];
const SORT_MODES = ["updated_at", "use_count"];
export function AssetCenterToolbar({
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
            <Button$1
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
            </Button$1>
          ) : null}
          <CatalogPageHeading
            title={t2("assetCenter.title")}
            description={t2("assetCenter.subtitle")}
          />
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Button$1
            size="default"
            className="h-9 gap-1.5 rounded-lg px-4 text-[13px] font-medium"
            onClick={onAddClick}
            data-action-ui-id="asset-center-add-entity"
          >
            <Plus size={16} strokeWidth={1.5} />
            {t2("assetCenter.add")}
          </Button$1>
          <Button$1
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
          </Button$1>
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
          {TYPE_CHIPS$1.map((chip) => (
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
                <X$7 size={13} strokeWidth={1.5} />
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
            <DropdownMenuContent align="end" side="bottom" sideOffset={4} className="min-w-40">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t2("assetCenter.sort.label", "排序")}</DropdownMenuLabel>
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
            <Button$1
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onViewModeChange("grid")}
              aria-pressed={viewMode === "grid"}
              title={t2("assetCenter.viewMode.grid")}
              data-action-ui-id="asset-center-toolbar-view-grid"
              className={cn$2(
                viewMode === "grid"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid size={16} />
            </Button$1>
            <Button$1
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onViewModeChange("list")}
              aria-pressed={viewMode === "list"}
              title={t2("assetCenter.viewMode.list")}
              data-action-ui-id="asset-center-toolbar-view-list"
              className={cn$2(
                viewMode === "list"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List size={16} />
            </Button$1>
          </div>
        </div>
      </div>
    </div>
  );
}
