import { V as useWorkspaceThumbnails, j as jsxRuntimeExports, Y as SquareDashed, h as useTranslation, w as useNavigate, o as usePlatform, v as useStorage, r as reactExports, Z as folderNameFromPath, $ as workspaceDisplayName, a0 as useWorkspaceDisplayNameRename, a1 as useProjectStore, a2 as useWorkspaceProject, E as useProjectActions, a3 as dedupedToast, G as stageWorkspacePreview, H as homeService, t as trackEvent, T as TRACK_EVENTS, J as buildWorkspaceSearch, a4 as persistRecentProjectDismissals, a5 as upsertRecentProjectDismissal, a6 as readRecentProjectDismissals, a7 as removeWorkspaceSessionTabs, a8 as removeRecentProjectDismissal, a9 as isWorkspacePathCaseInsensitivePlatform, aa as removePinnedWorkspacePaths, ab as ClickableArea, ac as InlineRenameInput, ad as formatTimestampDot, ae as DropdownMenu, af as DropdownMenuTrigger, ag as MoreVerticalIcon, ah as DropdownMenuContent, ai as DropdownMenuItem, aj as PencilIcon, ak as AddToProjectSubMenu, al as FolderX, am as Trash2, an as DeleteConfirmDialog } from "./index-ZNI5SgRm.js";
function WorkspaceThumbnails({ workspacePath }) {
  const { data: thumbnails } = useWorkspaceThumbnails(workspacePath);
  if (!thumbnails || thumbnails.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full h-full bg-muted flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SquareDashed, { size: 26, strokeWidth: 1.5, className: "text-muted-foreground/30" }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full h-full bg-muted flex items-center justify-center gap-2 p-3", children: thumbnails.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 min-w-0 h-full overflow-hidden rounded-md", children: /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: item.src, alt: "", className: "h-full w-full object-cover", draggable: false }) }, item.src)) });
}
function WorkspaceCard({
  workspace,
  unavailable = false,
  className,
  hideDelete = false
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const platform = usePlatform();
  const [, , setRecentWorkspacesAsync] = useStorage("global.recentWorkspaces");
  const [, , setGlobalConfigAsync] = useStorage("global.config");
  const [menuOpen, setMenuOpen] = reactExports.useState(false);
  const [renaming, setRenaming] = reactExports.useState(false);
  const [deleting, setDeleting] = reactExports.useState(false);
  const renameAfterMenuCloseRef = reactExports.useRef(false);
  const folderName = folderNameFromPath(workspace.path);
  const displayName = workspaceDisplayName(workspace);
  const hasCustomName = displayName !== folderName;
  const renameDisplayName = useWorkspaceDisplayNameRename(workspace.path);
  const { projects } = useProjectStore();
  const currentProject = useWorkspaceProject(workspace.path);
  const { addWorkspaceToProject, removeWorkspaceFromProject } = useProjectActions();
  const handleClick = reactExports.useCallback(() => {
    if (unavailable) {
      dedupedToast.error(t("home.workspaceUnavailable"));
      return;
    }
    void stageWorkspacePreview({
      hiloApp: homeService.hiloApp,
      folderPath: workspace.path,
      t,
      onStaged: (entry) => {
        trackEvent(TRACK_EVENTS.WORKSPACE_OPEN, { source: "card" });
        return navigate({
          to: "/workspace",
          search: buildWorkspaceSearch(entry.workspaceId)
        });
      }
    }).catch(() => {
    });
  }, [navigate, unavailable, workspace.path, t]);
  const handleRenameConfirm = reactExports.useCallback(
    (newName) => {
      renameDisplayName(newName);
      setRenaming(false);
    },
    [renameDisplayName]
  );
  const handleDeleteConfirm = reactExports.useCallback(() => {
    const dismissal = {
      paths: [workspace.path],
      recentOpenedAt: workspace.openedAt
    };
    persistRecentProjectDismissals(
      upsertRecentProjectDismissal(readRecentProjectDismissals(), dismissal)
    );
    void setRecentWorkspacesAsync(
      (previous) => previous.filter((entry) => entry.path !== workspace.path)
    ).then((persisted) => {
      if (persisted) {
        void removeWorkspaceSessionTabs(workspace.path, () => platform.storage);
        return;
      }
      persistRecentProjectDismissals(
        removeRecentProjectDismissal(readRecentProjectDismissals(), dismissal)
      );
    }).catch(() => {
      persistRecentProjectDismissals(
        removeRecentProjectDismissal(readRecentProjectDismissals(), dismissal)
      );
    });
    const caseInsensitive = isWorkspacePathCaseInsensitivePlatform(platform.app.os);
    void setGlobalConfigAsync((previous) => {
      const current = previous.pinnedWorkspacePaths ?? [];
      const next = removePinnedWorkspacePaths(current, [workspace.path], caseInsensitive);
      return next.length === current.length ? previous : { ...previous, pinnedWorkspacePaths: next };
    });
    setDeleting(false);
  }, [
    platform.app.os,
    platform.storage,
    setGlobalConfigAsync,
    setRecentWorkspacesAsync,
    workspace.openedAt,
    workspace.path
  ]);
  const handleMenuOpenChange = reactExports.useCallback((open) => {
    setMenuOpen(open);
    if (open || !renameAfterMenuCloseRef.current) return;
    renameAfterMenuCloseRef.current = false;
    window.setTimeout(() => setRenaming(true), 0);
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: `group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-colors duration-[80ms] hover:border-foreground/40 ${unavailable ? "opacity-50" : ""} ${className ?? ""}`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            ClickableArea,
            {
              onClick: handleClick,
              className: "flex w-full cursor-pointer flex-col items-stretch text-left",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative aspect-[4/3] w-full overflow-hidden border-b border-border bg-muted", children: [
                  workspace.coverImage ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "img",
                    {
                      src: workspace.coverImage,
                      alt: displayName,
                      className: "w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    }
                  ) : /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceThumbnails, { workspacePath: workspace.path }),
                  unavailable && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-background/60", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[12px] text-muted-foreground px-2 text-center", children: t("home.workspaceUnavailable") }) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex w-full flex-col gap-1 p-3 pr-9", children: [
                  renaming ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                    InlineRenameInput,
                    {
                      initialName: displayName,
                      placeholder: t("home.workspace.displayNamePlaceholder"),
                      onConfirm: handleRenameConfirm,
                      onCancel: () => setRenaming(false)
                    }
                  ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "p",
                    {
                      title: hasCustomName ? folderName : void 0,
                      className: "text-[14px] font-medium text-foreground overflow-hidden text-ellipsis whitespace-nowrap",
                      children: displayName
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: workspace.openedAt <= 0 ? " " : i18n.language.startsWith("zh") ? formatTimestampDot(workspace.openedAt) : new Date(workspace.openedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  }) })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { open: menuOpen, onOpenChange: handleMenuOpenChange, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              DropdownMenuTrigger,
              {
                className: `absolute bottom-2 right-2 flex size-6 items-center justify-center rounded-sm border border-border bg-background text-foreground/60 transition-all duration-[80ms] hover:border-foreground/40 hover:text-foreground ${renaming ? "hidden" : menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(MoreVerticalIcon, { size: 14 })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", side: "bottom", sideOffset: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                DropdownMenuItem,
                {
                  onClick: () => {
                    renameAfterMenuCloseRef.current = true;
                    handleMenuOpenChange(false);
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(PencilIcon, { size: 14, strokeWidth: 1.5 }),
                    t("common.rename")
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                AddToProjectSubMenu,
                {
                  projects,
                  currentProjectId: currentProject?.id,
                  onSelect: (projectId) => {
                    setMenuOpen(false);
                    void addWorkspaceToProject(workspace.path, projectId, "workspace-card-menu");
                  }
                }
              ),
              currentProject ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                DropdownMenuItem,
                {
                  onClick: () => {
                    setMenuOpen(false);
                    void removeWorkspaceFromProject(workspace.path, "workspace-card-menu");
                  },
                  "data-action-ui-id": "workspace-card.remove-from-project",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(FolderX, { size: 14, strokeWidth: 1.5 }),
                    t("project.removeFromProject")
                  ]
                }
              ) : null,
              hideDelete ? null : /* @__PURE__ */ jsxRuntimeExports.jsxs(
                DropdownMenuItem,
                {
                  variant: "destructive",
                  onClick: () => {
                    setMenuOpen(false);
                    setDeleting(true);
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 14, strokeWidth: 1.5 }),
                    t("common.delete")
                  ]
                }
              )
            ] })
          ] })
        ]
      }
    ),
    hideDelete ? null : /* @__PURE__ */ jsxRuntimeExports.jsx(
      DeleteConfirmDialog,
      {
        open: deleting,
        name: displayName,
        onConfirm: handleDeleteConfirm,
        onCancel: () => setDeleting(false)
      }
    )
  ] });
}
export {
  WorkspaceCard as W
};
