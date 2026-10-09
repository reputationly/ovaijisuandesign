// use-canvas-tags.jsx
import { useTranslation, reactExports, dedupedToast, API_PATHS, usePlatform, ChevronDown, ChevronRight$1, useCurrentWorkspace, Plus, ChevronLeft, Info$1, Check, getIconStrokeWidth, LayoutList, LayoutGrid, Library, useQuery, useQueryClient, useAssetMetadataApi, useMutation } from "../vendor.js";
import { refreshAssetIndex } from "../m15/apply-asset-change.jsx";
import { TooltipProvider, Tooltip, TooltipTrigger, DropdownMenu } from "../m15/graph.jsx";
import { useLocation } from "../m15/linked-list.js";
import { Upload } from "../m15/parse-item.jsx";
import { canvasTagRegistryQueryKey } from "../m15/record-recent-workspace-opened.jsx";
import { useGatewayFetch, useGatewayScopeKey } from "../m15/use-resizable-width.js";
import { useWorkspaceProject } from "../m15/workspace-events.js";
import {
  Button$1,
  TooltipContent,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  Checkbox,
  AlertDialogFooter,
  AlertDialogAction,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { formatAssetCenterError } from "../asset-center/shared/page-state-boundary.jsx";
import { RetryIcon, StrokeIcon, ICON_TEXT_SPEC } from "../m08/browser-inspiration-urls.jsx";
import {
  CDN_COACHMARK_FILE_LOCATE,
  CDN_COACHMARK_FILE_VIEW,
} from "../m10/new-workspace-dialog.jsx";
import { SegmentedSwitch } from "../m09/use-credit-details.jsx";
import {
  useImportEntity,
  trackAssetCreate,
  classifyAssetError,
} from "../asset-center/shared/misc-02.jsx";
import { useCoachMarkSequence } from "../m10/asset-mention-list.jsx";
import { ImportEntityConflictError } from "../asset-center/shared/import-entity.js";
import { AssetCenterPage } from "../asset-center/asset-center-page.jsx";
import { AddEntityDialog } from "../asset-center/shared/attachment-upload-zone.jsx";
import { resolveShortcutDisplay } from "../m08/shortcut-categories.jsx";
import { CoachMarkPopup } from "../m10/use-coach-mark.jsx";
import { normalizeTagRegistry, seedTagRegistry } from "../m01/normalize-tag-registry.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { AssetCenterPanel } from "./asset-center-panel.jsx";
import { FileExplorerSearchBar, ProjectAssetsSidebarPanel } from "./team-assets-sidebar-panel.jsx";
export function AssetsTabPanel({ onManageActiveChange } = {}) {
  const { t: t2 } = useTranslation();
  const [view2, setView] = reactExports.useState("default");
  const [addEntityOpen, setAddEntityOpen] = reactExports.useState(false);
  const [librarySortKey, setLibrarySortKey] = reactExports.useState("updated_at");
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
  const [projectAssetsToolbar, setProjectAssetsToolbar] = reactExports.useState(void 0);
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
            <span className="min-w-0 truncate">{t2("canvasAssets.libraryEntry")}</span>
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
                  <span className="truncate">{t2(`assetCenter.sort.${librarySortKey}`)}</span>
                  <StrokeIcon
                    icon={ChevronDown}
                    size={ICON_TEXT_SPEC.compact.iconSize}
                    className="shrink-0 opacity-70"
                  />
                </button>
              }
            />
            <DropdownMenuContent align="end" side="bottom" sideOffset={4} className="min-w-36">
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
                  <span className="mr-1.5 inline-block size-3 shrink-0" aria-hidden={true} />
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
                  <span className="mr-1.5 inline-block size-3 shrink-0" aria-hidden={true} />
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
              <TooltipContent side="bottom">{t2("fileExplorer.refresh")}</TooltipContent>
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
        <AddEntityDialog open={addEntityOpen} onClose={() => setAddEntityOpen(false)} />
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
                  onClick={libraryEntryDisabled ? void 0 : () => setView("library")}
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
                <TooltipContent side="bottom">{t2("fileExplorer.refresh")}</TooltipContent>
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
const MARK_ID$2 = "file-panel-intro";
const STEP_MEDIA_URLS = [CDN_COACHMARK_FILE_LOCATE, CDN_COACHMARK_FILE_VIEW];
function queryAnchor(root2, actionUiId) {
  return root2?.querySelector(`[data-action-ui-id="${actionUiId}"]`) ?? null;
}
export function FilePanelCoachMarks({ containerRef, isActive: isActive2 }) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const { pathname } = useLocation();
  const [armed, setArmed] = reactExports.useState(false);
  const triggeredRef = reactExports.useRef(false);
  const [anchorEl, setAnchorEl] = reactExports.useState(null);
  const anchorRef = reactExports.useRef(null);
  anchorRef.current = anchorEl;
  const firstHoveredRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const container = containerRef.current;
    if (!container || armed || !isActive2) return;
    const onOver = (e2) => {
      const target = e2.target;
      const item = target?.closest('[data-coach-anchor="file-item"]');
      if (item) {
        firstHoveredRef.current = item;
        triggeredRef.current = true;
        setArmed(true);
      }
    };
    container.addEventListener("pointerover", onOver);
    return () => container.removeEventListener("pointerover", onOver);
  }, [containerRef, armed, isActive2]);
  const resolvers = [
    () => firstHoveredRef.current ?? queryAnchor(containerRef.current, "file-view-mode-toggle"),
    () => queryAnchor(containerRef.current, "file-view-mode-toggle"),
  ];
  const seq2 = useCoachMarkSequence(
    MARK_ID$2,
    // The sequence only needs the step count; anchor resolution is driven by the
    // effect below (so it also re-resolves on route changes).
    resolvers.map(() => ({})),
    armed && isActive2,
  );
  reactExports.useEffect(() => {
    if (isActive2 || !triggeredRef.current || seq2.isDismissed) return;
    seq2.dismiss("close");
  }, [isActive2, seq2.dismiss, seq2.isDismissed]);
  reactExports.useEffect(() => {
    if (!seq2.isOpen || !isActive2) {
      setAnchorEl(null);
      return;
    }
    setAnchorEl(null);
    const resolver2 = resolvers[seq2.index];
    if (!resolver2) return;
    let tries = 0;
    let raf = 0;
    const tick = () => {
      const el = resolver2();
      if (el?.isConnected && el.offsetParent !== null) {
        setAnchorEl(el);
        return;
      }
      if (tries++ < 60) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [seq2.isOpen, seq2.index, pathname]);
  if (!isActive2 || !seq2.isOpen || !anchorEl) return null;
  const treeViewShortcut = resolveShortcutDisplay("CommandOrControl+1", platform2.app.os).text;
  const gridViewShortcut = resolveShortcutDisplay("CommandOrControl+2", platform2.app.os).text;
  const STEP_COPY = [
    {
      title: t2("coachMark.file.locate.title", "在画布定位"),
      desc: t2(
        "coachMark.file.locate.desc",
        "在资源面板右键「在画布定位」，快速在画布中找到对应素材",
      ),
      side: "right",
      mediaUrl: CDN_COACHMARK_FILE_LOCATE,
    },
    {
      title: t2("coachMark.file.view.title", "两种视图可切换"),
      desc: t2(
        "coachMark.file.view.desc",
        "点击此处或资源面板按 {{treeShortcut}} / {{gridShortcut}} 切换排序 / 视图模式",
        {
          treeShortcut: treeViewShortcut,
          gridShortcut: gridViewShortcut,
        },
      ),
      side: "bottom",
      mediaUrl: CDN_COACHMARK_FILE_VIEW,
    },
  ];
  const copy2 = STEP_COPY[seq2.index];
  if (!copy2) return null;
  return (
    <CoachMarkPopup
      open={isActive2 && seq2.isOpen}
      onDismiss={(method) => (method === "button" ? seq2.next() : seq2.dismiss(method))}
      anchorRef={anchorRef}
      anchorEl={anchorEl}
      side={copy2.side}
      align="start"
      title={copy2.title}
      description={copy2.desc}
      media={{
        url: copy2.mediaUrl,
        type: "image",
      }}
      preloadUrls={STEP_MEDIA_URLS}
      ctaLabel={seq2.isLast ? t2("coachMark.gotIt", "我知道了") : t2("coachMark.next", "下一步")}
      stepCurrent={seq2.stepCurrent}
      stepTotal={seq2.stepTotal}
      showClose={true}
      actionUiId={`coach-mark-${MARK_ID$2}`}
    />
  );
}
function deduplicateCanvasTagAssets(assets) {
  const uniqueAssets = [];
  const seenAssetIds = new Set();
  for (const asset of assets) {
    if (seenAssetIds.has(asset.id)) continue;
    seenAssetIds.add(asset.id);
    uniqueAssets.push(asset);
  }
  return uniqueAssets;
}
async function fetchTagRegistry(gatewayFetch2) {
  const res = await gatewayFetch2(API_PATHS.tagRegistry);
  const data2 = await res.json();
  return normalizeTagRegistry(data2.registry);
}
export function useTagRegistry() {
  const gatewayFetch2 = useGatewayFetch();
  const gatewayScopeKey = useGatewayScopeKey();
  const { data: data2 } = useQuery({
    queryKey: canvasTagRegistryQueryKey(gatewayScopeKey),
    queryFn: () => fetchTagRegistry(gatewayFetch2),
    staleTime: Number.POSITIVE_INFINITY,
  });
  return reactExports.useMemo(() => normalizeTagRegistry(data2 ?? seedTagRegistry()), [data2]);
}
function createJsonMutationRequest(method, body2) {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body2),
  };
}
export function aggregateTagState(tagId, assets) {
  if (assets.length === 0) return "none";
  let have = 0;
  for (const asset of assets) {
    if ((asset.tagIds ?? []).includes(tagId)) have += 1;
  }
  if (have === 0) return "none";
  if (have === assets.length) return "all";
  return "mixed";
}
export function useCanvasTags() {
  const gatewayFetch2 = useGatewayFetch();
  const gatewayScopeKey = useGatewayScopeKey();
  const queryClient2 = useQueryClient();
  const assetMetadataStore = useAssetMetadataApi();
  const queryKey = canvasTagRegistryQueryKey(gatewayScopeKey);
  const { data: data2, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchTagRegistry(gatewayFetch2),
    staleTime: Number.POSITIVE_INFINITY,
  });
  const registry2 = reactExports.useMemo(
    () => normalizeTagRegistry(data2 ?? seedTagRegistry()),
    [data2],
  );
  const refreshAssets = reactExports.useCallback(
    () =>
      refreshAssetIndex({
        qc: queryClient2,
        gatewayScopeKey,
      }),
    [gatewayScopeKey, queryClient2],
  );
  const recoverRegistryAfterError = reactExports.useCallback(async () => {
    await queryClient2.invalidateQueries({
      queryKey,
    });
  }, [queryClient2, queryKey]);
  const saveTagsMutation = useMutation({
    mutationFn: async (request) => {
      const res = await gatewayFetch2(
        API_PATHS.assetTagMutationsBatch,
        createJsonMutationRequest("PATCH", request),
      );
      return await res.json();
    },
    onSuccess: (body2) => {
      for (const asset of body2.updatedAssets) {
        assetMetadataStore.getState().mergeAsset(asset.id, {
          tagIds: asset.tagIds,
        });
      }
    },
  });
  const updateAssignments = reactExports.useCallback(
    async (tagId, assets, mode2) => {
      if (assets.length === 0) return;
      const uniqueAssets = deduplicateCanvasTagAssets(assets);
      const shouldRemove = mode2 === "toggle" && aggregateTagState(tagId, uniqueAssets) === "all";
      await saveTagsMutation.mutateAsync({
        assetIds: uniqueAssets.map((asset) => asset.id),
        tagId,
        operation: shouldRemove ? "remove" : "assign",
      });
      await refreshAssets();
    },
    [refreshAssets, saveTagsMutation],
  );
  const toggleTagForAssets = reactExports.useCallback(
    (tagId, assets) => updateAssignments(tagId, assets, "toggle"),
    [updateAssignments],
  );
  const assignTagToAssets = reactExports.useCallback(
    (tagId, assets) => updateAssignments(tagId, assets, "assign"),
    [updateAssignments],
  );
  const createTag = reactExports.useCallback(
    async (name2, assets) => {
      try {
        const res = await gatewayFetch2(
          API_PATHS.canvasTags,
          createJsonMutationRequest("POST", {
            name: name2,
            kind: "keyword",
            revision: registry2.revision,
          }),
        );
        const body2 = await res.json();
        queryClient2.setQueryData(queryKey, body2.registry);
        if (assets?.length) await updateAssignments(body2.tag.id, assets, "assign");
        return body2.tag;
      } catch (error) {
        await recoverRegistryAfterError();
        throw error;
      }
    },
    [
      gatewayFetch2,
      queryClient2,
      queryKey,
      recoverRegistryAfterError,
      registry2.revision,
      updateAssignments,
    ],
  );
  const updateTag = reactExports.useCallback(
    async (tagId, patch2) => {
      try {
        const res = await gatewayFetch2(
          API_PATHS.canvasTag(tagId),
          createJsonMutationRequest("PATCH", {
            ...patch2,
            revision: registry2.revision,
          }),
        );
        const body2 = await res.json();
        queryClient2.setQueryData(queryKey, body2.registry);
        return body2.tag;
      } catch (error) {
        await recoverRegistryAfterError();
        throw error;
      }
    },
    [gatewayFetch2, queryClient2, queryKey, recoverRegistryAfterError, registry2.revision],
  );
  const reorderTags = reactExports.useCallback(
    async (tagIds) => {
      try {
        const res = await gatewayFetch2(
          API_PATHS.canvasTagOrder,
          createJsonMutationRequest("PUT", {
            tagIds,
            revision: registry2.revision,
          }),
        );
        const body2 = await res.json();
        queryClient2.setQueryData(queryKey, body2.registry);
      } catch (error) {
        await recoverRegistryAfterError();
        throw error;
      }
    },
    [gatewayFetch2, queryClient2, queryKey, recoverRegistryAfterError, registry2.revision],
  );
  const getTagImpact = reactExports.useCallback(
    async (tagId) => {
      const res = await gatewayFetch2(API_PATHS.canvasTagImpact(tagId));
      return await res.json();
    },
    [gatewayFetch2],
  );
  const deleteTag = reactExports.useCallback(
    async (tagId) => {
      try {
        const res = await gatewayFetch2(
          API_PATHS.canvasTag(tagId),
          createJsonMutationRequest("DELETE", {
            revision: registry2.revision,
          }),
        );
        const body2 = await res.json();
        queryClient2.setQueryData(queryKey, body2.registry);
        for (const asset of body2.updatedAssets) {
          assetMetadataStore.getState().mergeAsset(asset.id, {
            tagIds: asset.tagIds,
          });
        }
        await refreshAssets();
        return body2;
      } catch (error) {
        await recoverRegistryAfterError();
        throw error;
      }
    },
    [
      assetMetadataStore,
      gatewayFetch2,
      queryClient2,
      queryKey,
      recoverRegistryAfterError,
      refreshAssets,
      registry2.revision,
    ],
  );
  return {
    registry: registry2,
    isLoading,
    toggleTagForAssets,
    assignTagToAssets,
    createTag,
    updateTag,
    reorderTags,
    getTagImpact,
    deleteTag,
  };
}
export function ConflictResolutionDialog({
  open,
  conflict,
  remainingCount,
  onDecision,
  onDismiss,
}) {
  const { t: t2 } = useTranslation();
  const [applyToAll, setApplyToAll] = reactExports.useState(false);
  const isFolder = conflict?.existingKind === "folder";
  const showApplyToAll = remainingCount > 0;
  const decide = (decision) => {
    const snapshotApplyToAll = applyToAll;
    setApplyToAll(false);
    onDecision(decision, snapshotApplyToAll);
  };
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onDismiss();
      }}
    >
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isFolder
              ? t2("fileExplorer.folderAlreadyExists")
              : t2("fileExplorer.fileAlreadyExists")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t2("fileExplorer.conflictDescription", {
              name: conflict?.name ?? "",
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {showApplyToAll && (
          <div className="hilo-checkbox-label flex items-center text-xs text-muted-foreground">
            <Checkbox
              id="apply-to-remaining-conflicts"
              checked={applyToAll}
              onCheckedChange={(value) => setApplyToAll(value === true)}
            />
            <label htmlFor="apply-to-remaining-conflicts" className="cursor-pointer">
              {t2("fileExplorer.applyToRemaining", {
                count: remainingCount,
              })}
            </label>
          </div>
        )}
        <AlertDialogFooter className="!flex !flex-row !justify-end !gap-2">
          <Button$1
            variant="ghost"
            onClick={() => decide("skip")}
            data-action-ui-id="asset-panel.conflict-skip"
          >
            {t2("common.cancel")}
          </Button$1>
          <Button$1
            variant="secondary"
            onClick={() => decide("rename")}
            data-action-ui-id="asset-panel.conflict-rename"
          >
            {t2("fileExplorer.conflictRename")}
          </Button$1>
          <AlertDialogAction
            variant="destructive"
            disabled={isFolder}
            onClick={() => decide("overwrite")}
            data-action-ui-id="asset-panel.conflict-overwrite"
          >
            {t2("fileExplorer.conflictOverwrite")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
