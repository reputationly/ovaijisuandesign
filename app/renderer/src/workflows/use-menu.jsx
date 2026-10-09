// 「使用此工作流」菜单：按最近项目与工作区分组。
import {
  h as useTranslation,
  fM as Button,
  r as reactExports,
  dX as PanelsTopLeft,
  o as usePlatform,
  v as useStorage,
  iy as useTopbarState,
  a1 as useProjectStore,
  k_ as isCaseInsensitiveOs,
  k$ as workspaceInventoryPathKey,
  l0 as resolveRecentProjectsSortMode,
  ae as DropdownMenu,
  af as DropdownMenuTrigger,
  ah as DropdownMenuContent,
  ai as DropdownMenuItem,
  Q as Plus,
  l1 as DropdownMenuSub,
  l2 as DropdownMenuSubTrigger,
  cE as FolderClock,
  l3 as DropdownMenuSubContent,
  gI as DropdownMenuGroup,
  gJ as DropdownMenuLabel,
  $ as workspaceDisplayName,
  iz as mergeWorkspaceInventory,
  l4 as splitPinnedInventory,
  l5 as groupRecentWorkspacesByProject,
  l6 as UNGROUPED_RECENT_GROUP_KEY,
} from "../main.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
function isWorkspaceUnavailable(item, unavailablePaths) {
  return (
    unavailablePaths.has(item.workspace.path) ||
    (item.recentPath !== void 0 && unavailablePaths.has(item.recentPath))
  );
}
function resolveRecentProjectsGroupMode(value) {
  return value === "none" ? "none" : "project";
}
function buildWorkflowUseMenuSections({
  recentWorkspaces,
  entries,
  projects,
  pinnedWorkspacePaths,
  sortMode,
  groupMode,
  caseInsensitiveWorkspacePaths,
  caseInsensitiveProjectPaths,
  workspaceStatusById,
  syntheticOpenedAtForEntry,
  unavailablePaths = new Set(),
}) {
  const baseInventory = mergeWorkspaceInventory(recentWorkspaces, entries, {
    caseInsensitive: caseInsensitiveWorkspacePaths,
    sortMode,
    syntheticOpenedAtForEntry,
  }).filter((item) => !isWorkspaceUnavailable(item, unavailablePaths));
  const inventory =
    sortMode === "priority"
      ? baseInventory
          .map((item, index) => {
            const status = item.authoritativeEntry
              ? workspaceStatusById.get(item.authoritativeEntry.workspaceId)
              : void 0;
            const rank = status?.needsUserAction ? 0 : status?.running ? 1 : status?.unread ? 2 : 3;
            return {
              item,
              index,
              rank,
            };
          })
          .sort((a, b) => a.rank - b.rank || a.index - b.index)
          .map(({ item }) => item)
      : baseInventory;
  const { pinned, unpinned } = splitPinnedInventory(
    inventory,
    pinnedWorkspacePaths,
    caseInsensitiveWorkspacePaths,
  );
  const sections = [];
  if (pinned.length > 0)
    sections.push({
      key: "pinned",
      kind: "pinned",
      items: pinned,
    });
  if (groupMode === "none") {
    if (unpinned.length > 0)
      sections.push({
        key: "recent",
        kind: "recent",
        items: unpinned,
      });
    return sections;
  }
  for (const group of groupRecentWorkspacesByProject(
    unpinned,
    projects,
    caseInsensitiveProjectPaths,
  )) {
    if (group.items.length === 0) continue;
    sections.push({
      key: group.key,
      kind: group.key === UNGROUPED_RECENT_GROUP_KEY ? "ungrouped" : "project",
      label: group.project?.name,
      items: group.items,
    });
  }
  return sections;
}
export function WorkflowUseMenu({
  workflowId,
  recentWorkspaces,
  unavailablePaths,
  onCreate,
  onSelect,
  compact = false,
}) {
  const { t } = useTranslation();
  const platform = usePlatform();
  const { entries, workspaceStatusById } = useTopbarState();
  const { projects, caseInsensitive: caseInsensitiveProjectPaths } = useProjectStore();
  const [globalConfig] = useStorage("global.config");
  const caseInsensitiveWorkspacePaths = isCaseInsensitiveOs(platform.app.os);
  const syntheticOpenedAtByPathRef = reactExports.useRef(new Map());
  for (const workspace of recentWorkspaces) {
    const key = workspaceInventoryPathKey(workspace.path, caseInsensitiveWorkspacePaths);
    const previousOpenedAt = syntheticOpenedAtByPathRef.current.get(key);
    if (previousOpenedAt === void 0 || workspace.openedAt > previousOpenedAt) {
      syntheticOpenedAtByPathRef.current.set(key, workspace.openedAt);
    }
  }
  const syntheticOpenedAtForEntry = reactExports.useCallback(
    (entry) => {
      const key = workspaceInventoryPathKey(entry.folderPath, caseInsensitiveWorkspacePaths);
      const existing = syntheticOpenedAtByPathRef.current.get(key);
      if (existing !== void 0) return existing;
      const firstSeenAt = Date.now();
      syntheticOpenedAtByPathRef.current.set(key, firstSeenAt);
      return firstSeenAt;
    },
    [caseInsensitiveWorkspacePaths],
  );
  const sections = reactExports.useMemo(
    () =>
      buildWorkflowUseMenuSections({
        recentWorkspaces,
        entries,
        projects,
        pinnedWorkspacePaths: globalConfig.pinnedWorkspacePaths ?? [],
        sortMode: resolveRecentProjectsSortMode(globalConfig.recentProjectsSortMode),
        groupMode: resolveRecentProjectsGroupMode(globalConfig.recentProjectsGroupMode),
        caseInsensitiveWorkspacePaths,
        caseInsensitiveProjectPaths,
        workspaceStatusById,
        syntheticOpenedAtForEntry,
        unavailablePaths,
      }),
    [
      caseInsensitiveProjectPaths,
      entries,
      globalConfig.pinnedWorkspacePaths,
      globalConfig.recentProjectsGroupMode,
      globalConfig.recentProjectsSortMode,
      projects,
      recentWorkspaces,
      caseInsensitiveWorkspacePaths,
      syntheticOpenedAtForEntry,
      unavailablePaths,
      workspaceStatusById,
    ],
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            size={compact ? "sm" : "lg"}
            className={
              compact
                ? "h-9 rounded-md border-0 bg-brand-accent px-2.5 text-xs font-medium text-brand-accent-foreground shadow-none transition-opacity hover:opacity-90"
                : "h-11 w-full rounded-md border-0 bg-brand-accent text-sm font-medium text-brand-accent-foreground shadow-none transition-opacity hover:opacity-90"
            }
            data-action-ui-id={`workflows-use-${workflowId}`}
          >
            <PanelsTopLeft size={compact ? 14 : 16} strokeWidth={compact ? 1.5 : 2} />
            {t("workflows.use")}
          </Button>
        }
      />
      <DropdownMenuContent
        align="center"
        side="bottom"
        sideOffset={4}
        className="w-72 p-1"
        data-action-ui-id={`workflows-use-menu-${workflowId}`}
      >
        <DropdownMenuItem
          onClick={onCreate}
          className="list-row-hit-area [--list-row-gap:4px] before:top-0 group mb-1 min-h-16 cursor-pointer items-center gap-2.5 rounded-md p-2.5 whitespace-normal"
          data-action-ui-id={`workflows-use-new-${workflowId}`}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground/70 transition-colors duration-150 group-hover:bg-background group-hover:text-foreground group-focus:bg-background group-focus:text-foreground">
            <Plus size={16} strokeWidth={1.5} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-heading text-sm font-medium text-foreground">
              {t("workflows.useMenu.newCanvas")}
            </span>
            <span className="mt-1 block text-xs leading-4 font-normal text-muted-foreground">
              {t("workflows.useMenu.newCanvasHint")}
            </span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className="list-row-hit-area [--list-row-gap:4px] before:bottom-0 group/sub min-h-16 cursor-pointer items-center gap-2.5 rounded-md p-2.5 whitespace-normal"
            data-action-ui-id={`workflows-use-existing-${workflowId}`}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground/70 transition-colors duration-150 group-hover/sub:bg-background group-hover/sub:text-foreground group-focus/sub:bg-background group-focus/sub:text-foreground">
              <FolderClock size={16} strokeWidth={1.5} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-heading text-sm font-medium text-foreground">
                {t("workflows.useMenu.existingCanvas")}
              </span>
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className="flex max-h-80 w-96 flex-col overflow-y-auto p-1.5"
            data-action-ui-id={`workflows-use-existing-menu-${workflowId}`}
          >
            {sections.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">
                {t("workflows.useMenu.noRecentCanvas")}
              </p>
            ) : (
              sections.map((section) => (
                <DropdownMenuGroup key={section.key} data-workflow-use-section={section.kind}>
                  <DropdownMenuLabel>
                    {section.kind === "pinned"
                      ? t("homeSidebar.pinned")
                      : section.kind === "ungrouped"
                        ? t("project.ungrouped")
                        : section.kind === "recent"
                          ? t("homeSidebar.recentProjects")
                          : section.label}
                  </DropdownMenuLabel>
                  {section.items.map((item) => {
                    const workspace = item.workspace;
                    return (
                      <DropdownMenuItem
                        key={workspace.path}
                        title={workspace.path}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelect(workspace.path);
                        }}
                        className="min-h-10 min-w-0 cursor-pointer gap-2.5 px-3 py-2 text-sm font-normal"
                        data-action-ui-id={`workflows-use-existing-item-${workspace.path}`}
                      >
                        <PanelsTopLeft size={16} strokeWidth={1.5} />
                        <span className="min-w-0 flex-1 truncate">
                          {workspaceDisplayName(workspace)}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
