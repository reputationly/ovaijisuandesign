// assets-tab-panel.jsx
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight$1,
  dedupedToast,
  getIconStrokeWidth,
  Info$1,
  LayoutGrid,
  LayoutList,
  Library,
  Plus,
  reactExports,
  useCurrentWorkspace,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { TeamAssetsSidebarPanel } from "../assets/team-assets-sidebar-panel.jsx";
import { LocalAssetsSidebarPanel } from "../assets/local-assets-sidebar-panel.jsx";
import { useWorkspaceProject } from "../workspace/normalize-project-entries.js";
import {
  DropdownMenu,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { Upload } from "../media-editing/package.jsx";
import {
  Button$1,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import { formatAssetCenterError } from "../assets/key-entries.js";
import {
  ICON_TEXT_SPEC,
  RetryIcon,
  StrokeIcon,
} from "../workspace/use-prompt-icon.jsx";
import { SegmentedSwitch } from "./popover-title.jsx";
import {
  classifyAssetError,
  trackAssetCreate,
  useImportEntity,
} from "../infra/use-online.jsx";
import { ImportEntityConflictError } from "../assets/import-entity-conflict-error.js";
import { AssetCenterPage } from "../assets/asset-center-page.jsx";
import { AddEntityDialog } from "../assets/add-entity-dialog.jsx";
import { AssetCenterPanel } from "../assets/asset-center-panel.jsx";
import { FileExplorerSearchBar } from "../assets/file-explorer-search-bar.jsx";

function ProjectAssetsSidebarPanel({ onToolbarStateChange, searchQuery } = {}) {
  const workspacePath = useCurrentWorkspace();
  const project2 = useWorkspaceProject(workspacePath || void 0);
  if (!project2) return null;
  if (project2.kind === "team" && project2.remoteId) {
    return (
      <TeamAssetsSidebarPanel
        project={project2}
        cloudProjectId={project2.remoteId}
        onToolbarStateChange={onToolbarStateChange}
        searchQuery={searchQuery}
      />
    );
  }
  return (
    <LocalAssetsSidebarPanel
      project={project2}
      onToolbarStateChange={onToolbarStateChange}
      searchQuery={searchQuery}
    />
  );
}

export function AssetsTabPanel({ onManageActiveChange } = {}) {
  const { t: t2 } = useTranslation();
  const [view2, setView] = reactExports.useState("default");
  const [addEntityOpen, setAddEntityOpen] = reactExports.useState(false);
  const [librarySortKey, setLibrarySortKey] =
    reactExports.useState("updated_at");
  const importMutation = useImportEntity();
  const importInputRef = reactExports.useRef(null);
  const handleImportPicked = reactExports.useCallback(
    async (files) => {
      for (const file of files) {
        try {
          const result = await importMutation.mutateAsync({
            file,
            mode: "create-new",
          });
          dedupedToast.success(
            t2("assetCenter.import.toastSuccess", {
              name: result.entity.name,
            }),
          );
          trackAssetCreate({
            source: "canvas_sidebar",
            method: "import",
            entity_type: result.entity.type,
            success: true,
            has_description: !!result.entity.description,
            import_mode: "create-new",
          });
        } catch (err) {
          if (err instanceof ImportEntityConflictError) {
            dedupedToast.error(
              t2("assetCenter.import.conflictBatchSkipped", {
                existingName: err.conflict.existingEntity.name,
              }),
            );
            trackAssetCreate({
              source: "canvas_sidebar",
              method: "import",
              success: false,
              has_description: false,
              import_mode: "create-new",
              error_type: "conflict",
            });
          } else {
            dedupedToast.error(formatAssetCenterError(err, t2));
            trackAssetCreate({
              source: "canvas_sidebar",
              method: "import",
              success: false,
              has_description: false,
              import_mode: "create-new",
              error_type: classifyAssetError(err),
            });
          }
        }
      }
    },
    [importMutation, t2],
  );
  const [searchQuery, setSearchQuery2] = reactExports.useState("");
  const [librarySearchQuery, setLibrarySearchQuery] = reactExports.useState("");
  const [libraryViewMode, setLibraryViewMode] = reactExports.useState("grid");
  const libraryRefreshRef = reactExports.useRef(() => {});
  const registerLibraryRefresh = reactExports.useCallback((fn2) => {
    libraryRefreshRef.current = fn2;
  }, []);
  const [projectAssetsToolbar, setProjectAssetsToolbar] =
    reactExports.useState(void 0);
  const workspacePath = useCurrentWorkspace();
  const project2 = useWorkspaceProject(workspacePath || void 0);
  const isTeamProject = project2?.kind === "team";
  const libraryEntryDisabled = isTeamProject;
  const forceLibraryView = !project2 && !libraryEntryDisabled;
  reactExports.useEffect(() => {
    if (forceLibraryView && view2 === "default") setView("library");
  }, [forceLibraryView, view2]);
  reactExports.useEffect(() => {
    onManageActiveChange?.(view2 === "manage");
    return () => onManageActiveChange?.(false);
  }, [onManageActiveChange, view2]);
  if (view2 === "manage" && !libraryEntryDisabled) {
    return (
      <div
        className="flex h-full min-h-0 flex-col"
        data-action-ui-id="canvas-sidebar-assets.manage-view"
      >
        <div className="flex shrink-0 items-center gap-1 border-b border-border-soft px-2 pt-3 pb-2">
          <button
            type="button"
            aria-label={t2("canvasAssets.libraryBack")}
            title={t2("canvasAssets.libraryBack")}
            onClick={() => setView("library")}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            data-action-ui-id="canvas-sidebar-assets.manage-back"
          >
            <StrokeIcon icon={ChevronLeft} size={16} />
          </button>
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-foreground">
            {t2("assetCenter.title")}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <AssetCenterPage surface="sheet" />
        </div>
      </div>
    );
  }
  if (view2 === "library" && !libraryEntryDisabled) {
    return (
      <div
        className="flex h-full min-h-0 flex-col"
        data-action-ui-id="canvas-sidebar-assets.library-view"
      >
        <div className="mb-1 flex h-9 shrink-0 items-center gap-1 px-2">
          {!forceLibraryView && (
            <button
              type="button"
              aria-label={t2("canvasAssets.libraryBack")}
              title={t2("canvasAssets.libraryBack")}
              onClick={() => setView("default")}
              className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              data-action-ui-id="canvas-sidebar-assets.library-back"
            >
              <StrokeIcon icon={ChevronLeft} size={16} />
            </button>
          )}
          <span
            className="flex min-w-0 flex-1 items-center gap-1 truncate pl-1 text-sm font-medium text-foreground/70"
            data-action-ui-id="canvas-sidebar-assets.library-heading"
          >
            <span className="min-w-0 truncate">
              {t2("canvasAssets.libraryEntry")}
            </span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-sm text-muted-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
                    aria-label={t2("canvasAssets.libraryEntryTooltip")}
                    data-action-ui-id="canvas-sidebar-assets.library-info"
                  />
                }
              >
                <Info$1 size={13} strokeWidth={1.5} aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-64">
                {t2("canvasAssets.libraryEntryTooltip")}{" "}
                <span className="text-muted-foreground">
                  {t2("canvasAssets.libraryEntryAlias")}
                </span>
              </TooltipContent>
            </Tooltip>
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground ${ICON_TEXT_SPEC.compact.textClassName}`}
                  data-action-ui-id="canvas-sidebar-asset-center.sort"
                  aria-label={t2(`assetCenter.sort.${librarySortKey}`)}
                >
                  <span className="truncate">
                    {t2(`assetCenter.sort.${librarySortKey}`)}
                  </span>
                  <StrokeIcon
                    icon={ChevronDown}
                    size={ICON_TEXT_SPEC.compact.iconSize}
                    className="shrink-0 opacity-70"
                  />
                </button>
              }
            />
            <DropdownMenuContent
              align="end"
              side="bottom"
              sideOffset={4}
              className="min-w-36"
            >
              <DropdownMenuItem
                onClick={() => setLibrarySortKey("updated_at")}
                data-action-ui-id="canvas-sidebar-asset-center.sort.updated_at"
                className={ICON_TEXT_SPEC.compact.textClassName}
              >
                {librarySortKey === "updated_at" ? (
                  <StrokeIcon
                    icon={Check}
                    size={ICON_TEXT_SPEC.compact.iconSize}
                    className="mr-1.5 shrink-0"
                  />
                ) : (
                  <span
                    className="mr-1.5 inline-block size-3 shrink-0"
                    aria-hidden={true}
                  />
                )}
                {t2("assetCenter.sort.updated_at")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLibrarySortKey("use_count")}
                data-action-ui-id="canvas-sidebar-asset-center.sort.use_count"
                className={ICON_TEXT_SPEC.compact.textClassName}
              >
                {librarySortKey === "use_count" ? (
                  <StrokeIcon
                    icon={Check}
                    size={ICON_TEXT_SPEC.compact.iconSize}
                    className="mr-1.5 shrink-0"
                  />
                ) : (
                  <span
                    className="mr-1.5 inline-block size-3 shrink-0"
                    aria-hidden={true}
                  />
                )}
                {t2("assetCenter.sort.use_count")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex shrink-0 items-center gap-1 px-2 pb-2">
          <div className="flex min-w-0 flex-1 items-center">
            <FileExplorerSearchBar
              useStrokeSpec={true}
              value={librarySearchQuery}
              onChange={setLibrarySearchQuery}
              placeholder={t2("assetSidebarPanel.searchPlaceholder")}
              rowActionId="canvas-sidebar-assets.library-search-row"
              inputActionId="canvas-sidebar-assets.library-search"
              clearActionId="canvas-sidebar-assets.library-search-clear"
              className="w-full !px-0 !pb-0"
            />
          </div>
          <TooltipProvider>
            <SegmentedSwitch
              value={libraryViewMode}
              onValueChange={setLibraryViewMode}
              dataActionUiId="canvas-sidebar-asset-center.view-mode-toggle"
              thumbDataSlot="canvas-sidebar-asset-center.view-mode-thumb"
              size="sm"
              iconSize={12}
              iconStrokeWidth={getIconStrokeWidth(12)}
              options={[
                {
                  value: "tree",
                  label: t2("fileExplorer.treeView"),
                  ariaLabel: t2("fileExplorer.treeView"),
                  icon: LayoutList,
                  tooltip: t2("fileExplorer.treeView"),
                  dataActionUiId: "canvas-sidebar-asset-center.view-tree",
                },
                {
                  value: "grid",
                  label: t2("fileExplorer.gridView"),
                  ariaLabel: t2("fileExplorer.gridView"),
                  icon: LayoutGrid,
                  tooltip: t2("fileExplorer.gridView"),
                  dataActionUiId: "canvas-sidebar-asset-center.view-grid",
                },
              ]}
            />
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={t2("fileExplorer.refreshList")}
                    className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
                    onClick={() => libraryRefreshRef.current()}
                    data-action-ui-id="canvas-sidebar-asset-center.refresh"
                  />
                }
              >
                <RetryIcon size={14} />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t2("fileExplorer.refresh")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <AssetCenterPanel
            viewMode={libraryViewMode}
            onRegisterRefresh={registerLibraryRefresh}
            externalSearchQuery={librarySearchQuery}
            sortKey={librarySortKey}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1 border-t border-border p-2">
          <Button$1
            type="button"
            size="sm"
            onClick={() => setAddEntityOpen(true)}
            className="h-8 flex-1 justify-center gap-1 rounded-md text-[12px] font-medium"
            data-action-ui-id="canvas-sidebar-asset-center.add"
          >
            <StrokeIcon icon={Plus} size={14} />
            {t2("assetCenter.add")}
          </Button$1>
          <Button$1
            type="button"
            variant="outline"
            size="sm"
            onClick={() => importInputRef.current?.click()}
            disabled={importMutation.isPending}
            className="h-8 flex-1 justify-center gap-1 rounded-md bg-foreground/[0.08] text-[12px] font-medium hover:bg-foreground/[0.12] dark:bg-foreground/[0.14] dark:hover:bg-foreground/[0.18]"
            data-action-ui-id="canvas-sidebar-asset-center.import"
          >
            <StrokeIcon icon={Upload} size={14} />
            {t2("assetCenter.import.action")}
          </Button$1>
          <input
            ref={importInputRef}
            type="file"
            accept=".zip,application/zip"
            multiple={true}
            className="hidden"
            onChange={(e2) => {
              const files = Array.from(e2.target.files ?? []);
              e2.target.value = "";
              if (files.length > 0) void handleImportPicked(files);
            }}
            data-action-ui-id="canvas-sidebar-asset-center.import-input"
          />
        </div>
        <AddEntityDialog
          open={addEntityOpen}
          onClose={() => setAddEntityOpen(false)}
        />
      </div>
    );
  }
  return (
    <div
      className="flex h-full min-h-0 flex-col"
      data-action-ui-id="canvas-sidebar-assets.default-view"
    >
      <div className="shrink-0 border-b border-border-soft px-2 pb-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                /* biome-ignore lint/a11y/useSemanticElements: nested Info button forces the outer element to be a div; role=button + keyboard handlers preserve semantics. */ <div
                  role="button"
                  tabIndex={0}
                  aria-disabled={libraryEntryDisabled}
                  onClick={
                    libraryEntryDisabled ? void 0 : () => setView("library")
                  }
                  onKeyDown={
                    libraryEntryDisabled
                      ? void 0
                      : (e2) => {
                          if (e2.key === "Enter" || e2.key === " ") {
                            e2.preventDefault();
                            setView("library");
                          }
                        }
                  }
                  className={
                    libraryEntryDisabled
                      ? "group flex w-full items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-left opacity-60 cursor-not-allowed"
                      : "group flex w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-left transition-colors hover:border-foreground/20 hover:bg-foreground/[0.02]"
                  }
                  data-action-ui-id="canvas-sidebar-assets.library-entry"
                  data-disabled={libraryEntryDisabled ? "true" : "false"}
                >
                  <span
                    className={
                      libraryEntryDisabled
                        ? "flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground/5 text-foreground/50"
                        : "flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground/5 text-foreground/70 transition-colors group-hover:bg-foreground/10 group-hover:text-foreground"
                    }
                  >
                    <StrokeIcon icon={Library} size={16} />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-1">
                    <span
                      className={
                        libraryEntryDisabled
                          ? "min-w-0 truncate text-[13px] font-medium text-foreground/70"
                          : "min-w-0 truncate text-[13px] font-medium text-foreground transition-colors"
                      }
                    >
                      {t2("canvasAssets.libraryEntry")}
                    </span>
                    <Info$1
                      size={13}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="shrink-0 text-muted-foreground/60 transition-colors group-hover:text-muted-foreground"
                    />
                  </span>
                  {libraryEntryDisabled ? null : (
                    <StrokeIcon
                      icon={ChevronRight$1}
                      size={14}
                      className="shrink-0 text-muted-foreground/70 transition-colors group-hover:text-foreground"
                    />
                  )}
                </div>
              }
            />
            <TooltipContent side="bottom" className="max-w-64">
              {libraryEntryDisabled
                ? t2("canvasAssets.libraryEntryTeamComingSoon")
                : t2("canvasAssets.libraryEntryTooltip")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex shrink-0 items-center gap-1 px-2 pt-2 pb-2">
        <FileExplorerSearchBar
          value={searchQuery}
          onChange={setSearchQuery2}
          placeholder={t2("localAssets.searchPlaceholder", {
            defaultValue: "搜索资产",
          })}
          rowActionId="canvas-sidebar-assets.search-row"
          inputActionId="canvas-sidebar-assets.search"
          clearActionId="canvas-sidebar-assets.search-clear"
          className="min-w-0 flex-1 !p-0"
        />
        {projectAssetsToolbar ? (
          <TooltipProvider>
            <div className="flex shrink-0 items-center gap-0.5">
              <SegmentedSwitch
                value={projectAssetsToolbar.viewMode}
                onValueChange={projectAssetsToolbar.onViewModeChange}
                dataActionUiId="project-assets-panel.view-mode-toggle"
                thumbDataSlot="project-assets-panel.view-mode-thumb"
                size="sm"
                iconSize={13}
                options={[
                  {
                    value: "tree",
                    label: t2("fileExplorer.treeView"),
                    ariaLabel: t2("fileExplorer.treeView"),
                    icon: LayoutList,
                    tooltip: t2("fileExplorer.treeView"),
                    dataActionUiId: "project-assets-panel.view-tree",
                  },
                  {
                    value: "grid",
                    label: t2("fileExplorer.gridView"),
                    ariaLabel: t2("fileExplorer.gridView"),
                    icon: LayoutGrid,
                    tooltip: t2("fileExplorer.gridView"),
                    dataActionUiId: "project-assets-panel.view-grid",
                  },
                ]}
              />
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={t2("fileExplorer.refreshList")}
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
                      onClick={() => projectAssetsToolbar.onRefresh()}
                      data-action-ui-id="project-assets-panel.refresh"
                    />
                  }
                >
                  <RetryIcon size={14} />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {t2("fileExplorer.refresh")}
                </TooltipContent>
              </Tooltip>
              {projectAssetsToolbar.trailingSlot ?? null}
            </div>
          </TooltipProvider>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <ProjectAssetsSidebarPanel
          onToolbarStateChange={setProjectAssetsToolbar}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  );
}
