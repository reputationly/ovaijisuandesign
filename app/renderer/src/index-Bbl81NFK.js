import { h as useTranslation, r as reactExports, ba as canUseDebugTooling, bb as listCloudProjects, j as jsxRuntimeExports, bc as CloudDownload, aG as Dialog, aH as DialogContent, bd as DialogHeader, be as DialogTitle, bf as DialogDescription, bg as Button, bh as RetryIcon, bi as MemberRole, bj as AlertDialog, bk as AlertDialogContent, bl as AlertDialogHeader, bm as AlertDialogTitle, bn as AlertDialogDescription, bo as AlertDialogFooter, bp as AlertDialogCancel, bq as AlertDialogAction, br as useQueryClient, bs as WORKSPACE_THUMBNAILS_QUERY_ROOT, u as useGatewayReady, bt as useQueries, bu as WORKSPACE_THUMBNAILS_STALE_TIME, bv as fetchWorkspaceThumbnails, bw as workspaceThumbnailsQueryKey, aS as FolderOpen, au as cn, bx as DeferredThumbnailImage, af as formatTimestampDot, ad as ClickableArea, by as TooltipProvider, bz as Tooltip, bA as TooltipTrigger, bB as Users, bC as TooltipContent, ae as InlineRenameInput, ag as DropdownMenu, ah as DropdownMenuTrigger, ai as MoreVerticalIcon, aj as DropdownMenuContent, ak as DropdownMenuItem, al as PencilIcon, ao as Trash2, w as useNavigate, ax as useSearch, o as usePlatform, v as useStorage, bD as useProjects, E as useProjectActions, bE as projectListLocation, a5 as dedupedToast, bF as getProjectTutorialUrl, bG as getRuntimeConfig, bH as openExternalUrl, bI as CatalogPageHeading, Q as Plus, bJ as CreateProjectMenuContent, aL as BookOpen, bK as Tabs, bL as TabsList, bM as TabsTrigger, bN as CloudUpload, av as ChevronDown, bO as DropdownMenuGroup, bP as DropdownMenuLabel, bQ as DropdownMenuRadioGroup, bR as DropdownMenuRadioItem, S as PageStateBoundary, bS as CreateProjectDialog } from "./main.jsx";
import { u as useWindowedList } from "./ProjectMemberSummary-D-KuAEDo.js";
import { u as useHubEntries, H as HUB_ENTRY_IDS } from "./use-hub-entries-BVopDERb.js";
import { P as PageSearchInput, T as TAB_CONTENT_ENTER_CLASS_NAME } from "./index-eXcNLvyz.js";
const INITIAL_STATE = {
  loading: false,
  projects: [],
  errorMessage: null,
  fetchedAt: null
};
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return index === 0 ? `${bytes} B` : `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
}
function formatTimestamp(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "-";
  return new Date(ms).toLocaleString();
}
function roleKey(role) {
  if (role === MemberRole.MEMBER_ROLE_CREATOR) return "project.cloudDebug.role.creator";
  if (role === MemberRole.MEMBER_ROLE_MEMBER) return "project.cloudDebug.role.member";
  return "project.cloudDebug.role.unknown";
}
function CloudProjectsInspector() {
  const { t } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const [state, setState] = reactExports.useState(INITIAL_STATE);
  const visible = canUseDebugTooling();
  const fetchProjects = reactExports.useCallback(async () => {
    setState((previous) => ({ ...previous, loading: true, errorMessage: null }));
    try {
      const projects = await listCloudProjects();
      setState({ loading: false, projects, errorMessage: null, fetchedAt: Date.now() });
    } catch (err) {
      setState({
        loading: false,
        projects: [],
        errorMessage: err instanceof Error ? err.message : String(err),
        fetchedAt: Date.now()
      });
    }
  }, []);
  const handleOpenChange = reactExports.useCallback(
    (next) => {
      setOpen(next);
      if (next) void fetchProjects();
    },
    [fetchProjects]
  );
  if (!visible) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => handleOpenChange(true),
        "aria-label": t("project.cloudDebug.trigger"),
        "data-action-ui-id": "project-list.cloud-debug-trigger",
        className: "flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 text-xs text-foreground transition-colors hover:border-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CloudDownload, { size: 14, strokeWidth: 1.5, "aria-hidden": "true" }),
          t("project.cloudDebug.trigger")
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: handleOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { size: "lg", "data-action-ui-id": "project-list.cloud-debug-dialog", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: t("project.cloudDebug.title") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: t("project.cloudDebug.description") })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: state.loading ? t("project.cloudDebug.loading") : state.errorMessage ? t("project.cloudDebug.failed", { message: state.errorMessage }) : t("project.cloudDebug.summary", {
          count: state.projects.length,
          time: formatTimestamp(state.fetchedAt ?? 0)
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            size: "sm",
            loading: state.loading,
            onClick: () => void fetchProjects(),
            "data-action-ui-id": "project-list.cloud-debug-refresh",
            children: [
              state.loading ? null : /* @__PURE__ */ jsxRuntimeExports.jsx(RetryIcon, { size: 14, "aria-hidden": "true" }),
              t("project.cloudDebug.refresh")
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-[60vh] overflow-y-auto rounded-lg border border-border", children: state.projects.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-3 py-6 text-center text-xs text-muted-foreground", children: state.loading ? t("project.cloudDebug.loading") : t("project.cloudDebug.empty") }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "divide-y divide-border", children: state.projects.map((project) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex flex-col gap-1 px-3 py-2.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[13px] font-medium text-foreground", children: project.name || t("project.cloudDebug.unnamed") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-xs text-muted-foreground", children: t(roleKey(project.myRole)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "truncate font-mono text-xs text-muted-foreground", children: project.id }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("project.cloudDebug.members", { count: project.memberCount }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("project.cloudDebug.storage", {
            used: formatBytes(project.usedBytes),
            total: formatBytes(project.totalBytes)
          }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("project.cloudDebug.createdAt", {
            time: formatTimestamp(project.createdAt)
          }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("project.cloudDebug.updatedAt", {
            time: formatTimestamp(project.updatedAt)
          }) })
        ] })
      ] }, project.id)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "rounded-lg bg-foreground/[0.04] px-3 py-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "cursor-pointer text-xs text-muted-foreground", children: t("project.cloudDebug.raw") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "mt-2 max-h-60 overflow-auto font-mono text-[11px] leading-relaxed text-muted-foreground", children: JSON.stringify(state.projects, null, 2) })
      ] })
    ] }) })
  ] });
}
function DissolveProjectDialog({
  project,
  onConfirm,
  onCancel
}) {
  const { t } = useTranslation();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialog, { open: Boolean(project), onOpenChange: (open) => !open && onCancel(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { size: "sm", "data-action-ui-id": "project.dissolve-dialog", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTitle, { children: t("project.dissolve.title") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogDescription, { children: t("project.dissolve.description", { name: project?.name ?? "" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { children: t("common.cancel") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogAction, { variant: "destructive", onClick: onConfirm, children: t("project.dissolve.confirm") })
    ] })
  ] }) });
}
const PROJECT_COVER_TILE_LIMIT = 4;
function useRefreshProjectCovers() {
  const queryClient = useQueryClient();
  reactExports.useEffect(() => {
    void queryClient.invalidateQueries({
      queryKey: WORKSPACE_THUMBNAILS_QUERY_ROOT,
      refetchType: "none"
    });
  }, [queryClient]);
}
function useProjectCover(project, workspacePaths, enabled) {
  const gatewayReady = useGatewayReady();
  const paths = reactExports.useMemo(() => workspacePaths.slice(0, PROJECT_COVER_TILE_LIMIT), [workspacePaths]);
  const customCover = project?.coverImage;
  const results = useQueries({
    queries: paths.map((path) => ({
      queryKey: workspaceThumbnailsQueryKey(path),
      queryFn: () => fetchWorkspaceThumbnails(path),
      enabled: enabled && gatewayReady && !customCover,
      staleTime: WORKSPACE_THUMBNAILS_STALE_TIME,
      retry: false,
      refetchOnWindowFocus: false
    }))
  });
  if (customCover) return [{ src: customCover, mediaType: "image" }];
  return results.map((result) => result.data?.[0]).filter((thumbnail) => Boolean(thumbnail)).map((thumbnail) => ({ src: thumbnail.src, mediaType: thumbnail.mediaType }));
}
const PLACEHOLDER_GRADIENTS = [
  "from-[color-mix(in_oklab,var(--chart-1)_28%,transparent)] to-[color-mix(in_oklab,var(--chart-1)_8%,transparent)]",
  "from-[color-mix(in_oklab,var(--chart-2)_28%,transparent)] to-[color-mix(in_oklab,var(--chart-2)_8%,transparent)]",
  "from-[color-mix(in_oklab,var(--chart-3)_28%,transparent)] to-[color-mix(in_oklab,var(--chart-3)_8%,transparent)]",
  "from-[color-mix(in_oklab,var(--chart-4)_28%,transparent)] to-[color-mix(in_oklab,var(--chart-4)_8%,transparent)]",
  "from-[color-mix(in_oklab,var(--chart-5)_28%,transparent)] to-[color-mix(in_oklab,var(--chart-5)_8%,transparent)]"
];
function stableGradient(seed) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 1000003;
  }
  return PLACEHOLDER_GRADIENTS[hash % PLACEHOLDER_GRADIENTS.length] ?? PLACEHOLDER_GRADIENTS[0];
}
const COVER_VISIBILITY_ROOT_MARGIN = "96px 0px";
const COVER_VISIBILITY_STABLE_DELAY_MS = 240;
function useStableVisibility() {
  const hostRef = reactExports.useRef(null);
  const [visible, setVisible] = reactExports.useState(() => typeof IntersectionObserver === "undefined");
  reactExports.useEffect(() => {
    if (visible || typeof IntersectionObserver === "undefined") return;
    const host = hostRef.current;
    if (!host) return;
    let timer = null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          if (timer !== null) {
            window.clearTimeout(timer);
            timer = null;
          }
          return;
        }
        if (timer !== null) return;
        timer = window.setTimeout(() => {
          timer = null;
          setVisible(true);
          observer.disconnect();
        }, COVER_VISIBILITY_STABLE_DELAY_MS);
      },
      { rootMargin: COVER_VISIBILITY_ROOT_MARGIN }
    );
    observer.observe(host);
    return () => {
      observer.disconnect();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [visible]);
  return [hostRef, visible];
}
function CoverTile({ tile }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative h-full w-full min-w-0 overflow-hidden bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    DeferredThumbnailImage,
    {
      src: tile.src,
      alt: "",
      draggable: false,
      className: "h-full w-full object-cover"
    }
  ) });
}
function ProjectCover({
  project,
  workspacePaths,
  className
}) {
  const [hostRef, visible] = useStableVisibility();
  const tiles = useProjectCover(project, workspacePaths, visible);
  const gradient = stableGradient(project.id);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: hostRef, className: cn("relative h-full w-full overflow-hidden", className), children: tiles.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br",
        gradient
      ),
      "data-action-ui-id": "project.cover-placeholder",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { size: 28, strokeWidth: 1.2, className: "text-foreground/25" })
    }
  ) : tiles.length === 1 ? /* @__PURE__ */ jsxRuntimeExports.jsx(CoverTile, { tile: tiles[0] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: cn(
        "grid h-full w-full",
        tiles.length === 2 && "grid-cols-2",
        tiles.length === 3 && "grid-cols-2 grid-rows-2",
        tiles.length >= 4 && "grid-cols-2 grid-rows-2"
      ),
      "data-action-ui-id": "project.cover-collage",
      children: tiles.map((tile, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: cn(
            "relative min-h-0 min-w-0 overflow-hidden",
            // 3 tiles: first one spans the full left column.
            tiles.length === 3 && index === 0 && "row-span-2"
          ),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(CoverTile, { tile })
        },
        tile.src
      ))
    }
  ) });
}
function ProjectCard({ project, onOpen, onRename, onRequestDelete }) {
  const { t, i18n } = useTranslation();
  const [menuOpen, setMenuOpen] = reactExports.useState(false);
  const [renaming, setRenaming] = reactExports.useState(false);
  const renameAfterMenuCloseRef = reactExports.useRef(false);
  const handleMenuOpenChange = reactExports.useCallback((open) => {
    setMenuOpen(open);
    if (open || !renameAfterMenuCloseRef.current) return;
    renameAfterMenuCloseRef.current = false;
    window.setTimeout(() => setRenaming(true), 0);
  }, []);
  const updatedLabel = i18n.language.startsWith("zh") ? formatTimestampDot(project.updatedAt) : new Date(project.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "group relative w-full aspect-[4/3] min-w-0 overflow-visible text-left", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        "aria-hidden": "true",
        className: "pointer-events-none absolute inset-x-0 top-1 bottom-0 z-0 rounded-[24px] border border-[color:color-mix(in_srgb,var(--sidebar-foreground)_4%,transparent)] bg-[color:color-mix(in_srgb,var(--sidebar-accent)_98%,var(--sidebar-foreground))] shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[background-color,border-color,box-shadow] duration-200 group-hover:border-[color:color-mix(in_srgb,var(--sidebar-foreground)_10%,transparent)] group-hover:bg-[color:color-mix(in_srgb,var(--sidebar-accent)_92%,var(--brand-accent))] group-hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      ClickableArea,
      {
        onClick: () => onOpen(project),
        className: "relative z-10 flex h-full w-full cursor-pointer flex-col items-stretch text-left",
        "data-action-ui-id": "project-card",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pointer-events-none absolute inset-x-5 top-4 h-[64%]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-x-3 top-0 h-[88%] -rotate-3 rounded-[18px] bg-muted shadow-[0_3px_8px_rgba(0,0,0,0.10)]" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -inset-x-0.5 top-3 h-[88%] rotate-2 overflow-hidden rounded-[18px] border border-border bg-card p-1 shadow-[0_4px_10px_rgba(0,0,0,0.14)]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              ProjectCover,
              {
                project,
                workspacePaths: project.workspacePaths,
                className: "rounded-[12px] bg-card"
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              "aria-hidden": "true",
              className: "pointer-events-none absolute top-[40%] left-0 h-5 w-24 translate-y-px rounded-t-[32px] border border-b-0 border-[color:color-mix(in_srgb,var(--sidebar-foreground)_4%,transparent)] bg-[color:color-mix(in_srgb,color-mix(in_srgb,var(--sidebar-accent)_98%,var(--sidebar-foreground))_88%,transparent)] backdrop-blur-[6px] transition-colors duration-200 group-hover:border-[color:color-mix(in_srgb,var(--sidebar-foreground)_10%,transparent)] group-hover:bg-[color:color-mix(in_srgb,color-mix(in_srgb,var(--sidebar-accent)_92%,var(--brand-accent))_88%,transparent)]"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute inset-x-0 bottom-0 top-[calc(40%+20px)] flex min-h-0 flex-col justify-end overflow-hidden rounded-tr-[30px] rounded-b-[24px] border border-t-0 border-[color:color-mix(in_srgb,var(--sidebar-foreground)_4%,transparent)] bg-[color:color-mix(in_srgb,color-mix(in_srgb,var(--sidebar-accent)_98%,var(--sidebar-foreground))_88%,transparent)] pr-12 pl-5 pt-8 pb-3 backdrop-blur-[6px] transition-colors duration-200 group-hover:border-[color:color-mix(in_srgb,var(--sidebar-foreground)_10%,transparent)] group-hover:bg-[color:color-mix(in_srgb,color-mix(in_srgb,var(--sidebar-accent)_92%,var(--brand-accent))_88%,transparent)]", children: [
            project.kind === "team" ? /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TooltipTrigger,
                {
                  render: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: "absolute left-5 top-3 flex size-5 items-center justify-center rounded-full bg-sidebar/70 text-sidebar-foreground/60 transition-colors group-hover:bg-sidebar/20 group-hover:text-sidebar-foreground",
                      "data-action-ui-id": "project-card.team-badge",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { size: 12, strokeWidth: 1.5, "aria-hidden": "true" })
                    }
                  )
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { side: "top", children: t("project.kind.team") })
            ] }) }) : null,
            renaming ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              InlineRenameInput,
              {
                initialName: project.name,
                placeholder: t("project.create.namePlaceholder"),
                onConfirm: (name) => {
                  onRename(project, name);
                  setRenaming(false);
                },
                onCancel: () => setRenaming(false)
              }
            ) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-medium text-[color:color-mix(in_srgb,var(--sidebar-foreground)_68%,transparent)] transition-colors group-hover:text-[color:color-mix(in_srgb,var(--sidebar-accent-foreground)_76%,transparent)] dark:text-[color:color-mix(in_srgb,var(--sidebar-foreground)_92%,transparent)] dark:group-hover:text-[color:color-mix(in_srgb,var(--sidebar-accent-foreground)_98%,transparent)]", children: project.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-sidebar-foreground/60 transition-colors group-hover:text-sidebar-accent-foreground/70 dark:text-sidebar-foreground/80 dark:group-hover:text-sidebar-accent-foreground/90", children: updatedLabel })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { open: menuOpen, onOpenChange: handleMenuOpenChange, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        DropdownMenuTrigger,
        {
          "aria-label": t("project.cardActions"),
          "data-action-ui-id": "project-card-more",
          className: `absolute right-3 bottom-3 z-20 flex size-7 items-center justify-center rounded-full border border-sidebar-border bg-sidebar/70 text-sidebar-foreground/70 transition-all duration-[80ms] hover:bg-sidebar hover:text-sidebar-foreground ${renaming ? "hidden" : menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`,
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
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          DropdownMenuItem,
          {
            variant: "destructive",
            onClick: () => {
              setMenuOpen(false);
              onRequestDelete(project);
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 14, strokeWidth: 1.5 }),
              t("common.delete")
            ]
          }
        )
      ] })
    ] })
  ] });
}
const SORT_MODES = ["updated", "created", "name"];
function isProjectsSortMode(value) {
  return SORT_MODES.includes(value);
}
const KIND_TABS = [
  { kind: "local", labelKey: "project.kindTabs.local" },
  { kind: "team", labelKey: "project.kindTabs.cloud" }
];
const PROJECTS_PAGE_SIZE = 100;
function ProjectListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { kind } = useSearch({ from: "/_home/projects/" });
  const activeKind = kind ?? "local";
  const platform = usePlatform();
  const [config, setConfig] = useStorage("global.config");
  const [keyword, setKeyword] = reactExports.useState("");
  const [createKind, setCreateKind] = reactExports.useState(null);
  const [pendingDelete, setPendingDelete] = reactExports.useState(null);
  const sortMode = isProjectsSortMode(config.projectsSortMode) ? config.projectsSortMode : "updated";
  const projects = useProjects({ sortMode, keyword, kind: activeKind });
  const { createProject, renameProject, deleteProject, syncCloudProjects } = useProjectActions();
  const {
    visibleItems: visibleProjects,
    hasMore,
    sentinelRef,
    reset: resetWindow
  } = useWindowedList(projects, PROJECTS_PAGE_SIZE);
  const handleKindChange = reactExports.useCallback(
    (kind2) => {
      void navigate({ ...projectListLocation(kind2), replace: true });
      resetWindow();
    },
    [navigate, resetWindow]
  );
  const handleKeywordChange = reactExports.useCallback(
    (value) => {
      setKeyword(value);
      resetWindow();
    },
    [resetWindow]
  );
  reactExports.useEffect(() => {
    if (activeKind !== "team") return;
    void syncCloudProjects();
  }, [activeKind, syncCloudProjects]);
  useRefreshProjectCovers();
  const handleSortModeChange = reactExports.useCallback(
    (value) => {
      if (!isProjectsSortMode(value)) return;
      setConfig((previous) => ({ ...previous, projectsSortMode: value }));
      resetWindow();
    },
    [resetWindow, setConfig]
  );
  const handleCreate = reactExports.useCallback(
    async (name, kind2) => {
      const result = await createProject(name, kind2);
      if (!result.project) {
        dedupedToast.error(result.errorMessage ?? t(result.errorMessageKey ?? "project.create.failed"));
        return;
      }
      setCreateKind(null);
      await navigate({
        to: "/projects/$projectId",
        params: { projectId: result.project.id }
      });
    },
    [createProject, navigate, t]
  );
  const handleOpen = reactExports.useCallback(
    (project) => {
      void navigate({ to: "/projects/$projectId", params: { projectId: project.id } });
    },
    [navigate]
  );
  const handleRename = reactExports.useCallback(
    (project, name) => {
      void renameProject(project, name).then((result) => {
        if (result.safetyBlocked) {
          dedupedToast.error(t("rename.safetyBlocked"));
          return;
        }
        if (result.errorCode === "project-name-conflict") {
          dedupedToast.error(t("home.workspace.duplicateName"));
        } else if (result.errorMessage || result.errorCode === "cloud-request-failed") {
          dedupedToast.error(result.errorMessage ?? t("project.rename.failed"));
        }
      });
    },
    [renameProject, t]
  );
  const handleConfirmDelete = reactExports.useCallback(() => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    void deleteProject(target).then((result) => {
      if (result.errorCode === "project-transfer-active") {
        dedupedToast.warning(t("project.dissolve.transferActive"));
      } else if (result.errorCode === "project-hide-failed") {
        dedupedToast.error(t("project.dissolve.failed"));
      } else if (result.errorMessage || result.errorCode === "cloud-request-failed") {
        dedupedToast.error(result.errorMessage ?? t("project.dissolve.failed"));
      }
    });
  }, [deleteProject, pendingDelete, t]);
  const hubEntries = useHubEntries();
  const tutorialEntry = hubEntries[HUB_ENTRY_IDS.projectTutorial];
  const handleOpenTutorial = reactExports.useCallback(() => {
    const url = tutorialEntry?.url ?? getProjectTutorialUrl(getRuntimeConfig().region);
    void openExternalUrl(platform, url, {
      source: "project-list.tutorial"
    });
  }, [platform, tutorialEntry?.url]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "flex flex-1 flex-col overflow-y-auto bg-[var(--home-content-surface)]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0 px-8 pt-7 md:px-12", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "section",
      {
        className: "relative isolate overflow-hidden border-b border-border-soft pb-6",
        "data-action-ui-id": "project-list.hero",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative z-10 w-full", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            CatalogPageHeading,
            {
              className: "mt-3",
              title: t("project.listTitle"),
              description: t("project.heroDescription")
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                DropdownMenuTrigger,
                {
                  render: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      size: "default",
                      "data-action-ui-id": "project-list.create-trigger",
                      className: "h-9 gap-1.5 rounded-lg px-4 text-[13px] font-medium",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 16, strokeWidth: 1.5, "aria-hidden": "true" }),
                        t("project.create.trigger")
                      ]
                    }
                  )
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                CreateProjectMenuContent,
                {
                  actionUiIdPrefix: "project-list",
                  onSelectKind: setCreateKind,
                  align: "start",
                  side: "bottom",
                  sideOffset: 4
                }
              )
            ] }),
            tutorialEntry?.visible !== false ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                variant: "outline",
                size: "default",
                onClick: handleOpenTutorial,
                "data-action-ui-id": "project-list.tutorial-trigger",
                className: "h-9 gap-1.5 rounded-lg px-4 text-[13px] font-medium",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { size: 16, strokeWidth: 1.5, "aria-hidden": "true" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "max-w-48 truncate", children: tutorialEntry?.title ?? t("project.tutorial.trigger") })
                ]
              }
            ) : null
          ] })
        ] })
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-1 flex-col px-8 pt-4 pb-8 md:px-12", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex min-w-0 flex-nowrap items-center gap-3 py-2",
          "data-layout-slot": "project-list-toolbar",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Tabs,
              {
                value: activeKind,
                className: "shrink-0",
                onValueChange: (value) => {
                  if (value === "local" || value === "team") handleKindChange(value);
                },
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TabsList,
                  {
                    variant: "underline",
                    "aria-label": t("project.kindTabsAria"),
                    "data-action-ui-id": "project-list.kind-tabs",
                    children: KIND_TABS.map((tab) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      TabsTrigger,
                      {
                        value: tab.kind,
                        variant: "underline",
                        className: "gap-1.5",
                        "data-action-ui-id": `project-list.kind-tab-${tab.kind}`,
                        children: [
                          t(tab.labelKey),
                          tab.kind === "team" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CloudUpload, { size: 14, strokeWidth: 2.25, "aria-hidden": "true" }) : null
                        ]
                      },
                      tab.kind
                    ))
                  }
                )
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "scrollbar-none flex min-w-0 flex-1 flex-nowrap items-center gap-3 overflow-x-auto overscroll-x-contain [&>*:first-child]:ml-auto",
                "data-layout-slot": "project-list-toolbar-actions",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      className: "w-60 min-w-36 max-w-60 flex-1 shrink",
                      "data-layout-slot": "project-list-search-slot",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                        PageSearchInput,
                        {
                          value: keyword,
                          onValueChange: handleKeywordChange,
                          placeholder: t("project.searchPlaceholder"),
                          clearLabel: t("common.clear"),
                          inputActionId: "project-list.search"
                        }
                      )
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      DropdownMenuTrigger,
                      {
                        "aria-label": t("project.sortLabel"),
                        "data-action-ui-id": "project-list.sort-trigger",
                        className: "flex h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-transparent px-3 text-xs text-foreground transition-colors hover:border-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
                        children: [
                          t(`project.sort.${sortMode}`),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 14, strokeWidth: 1.5, "aria-hidden": "true" })
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuContent, { align: "end", side: "bottom", sideOffset: 4, className: "min-w-40", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuGroup, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: t("project.sortLabel") }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        DropdownMenuRadioGroup,
                        {
                          value: sortMode,
                          "aria-label": t("project.sortLabel"),
                          onValueChange: handleSortModeChange,
                          children: SORT_MODES.map((mode) => /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuRadioItem, { value: mode, children: t(`project.sort.${mode}`) }, mode))
                        }
                      )
                    ] }) })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(CloudProjectsInspector, {})
                ]
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: `flex flex-1 flex-col ${TAB_CONTENT_ENTER_CLASS_NAME}`,
          "data-layout-slot": "project-tab-content",
          children: projects.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            PageStateBoundary,
            {
              empty: true,
              className: "mt-2",
              emptyOptions: {
                reason: keyword ? "generic" : "project",
                ...keyword ? {
                  title: t("project.searchEmpty"),
                  description: t("project.searchEmptyDescription")
                } : {
                  title: t(
                    activeKind === "local" ? "project.listEmptyLocalTitle" : "project.listEmptyCloudTitle"
                  ),
                  description: t(
                    activeKind === "local" ? "project.listEmptyLocalDescription" : "project.listEmptyCloudDescription"
                  )
                }
              }
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4", children: visibleProjects.map((project) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              ProjectCard,
              {
                project,
                onOpen: handleOpen,
                onRename: handleRename,
                onRequestDelete: setPendingDelete
              },
              project.id
            )) }),
            hasMore ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                ref: sentinelRef,
                "aria-hidden": "true",
                className: "h-px",
                "data-action-ui-id": "project-list.load-more-sentinel"
              }
            ) : null
          ] })
        },
        `project-tab-content-${activeKind}`
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      CreateProjectDialog,
      {
        open: createKind !== null,
        kind: createKind ?? "local",
        onConfirm: handleCreate,
        onOpenChange: (open) => {
          if (!open) setCreateKind(null);
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DissolveProjectDialog,
      {
        project: pendingDelete,
        onConfirm: handleConfirmDelete,
        onCancel: () => setPendingDelete(null)
      }
    )
  ] });
}
const SplitComponent = ProjectListPage;
export {
  SplitComponent as component
};
