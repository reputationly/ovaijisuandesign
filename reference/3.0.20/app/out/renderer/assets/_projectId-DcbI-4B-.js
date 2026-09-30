import { k as useQuery, hq as createProjectOperationId, hr as logProjectOperationAttempt, hs as listProjectMembers, ht as logProjectOperationSuccess, hu as logProjectOperationFailure, h as useTranslation, gm as useQueryClient, g as useRuntimeConfig, hv as useAuth, r as reactExports, hw as removeProjectMember, a3 as dedupedToast, hx as cloudErrorDisplayMessage, hy as createProjectInviteLink, hz as buildProjectInviteWebLink, j as jsxRuntimeExports, be as BadgeInfo, f5 as Users, fM as Button, bz as Check, di as Link2, b$ as Clock, gl as MemberRole, fP as Avatar, fQ as AvatarImage, fR as AvatarFallback, au as cn, ae as DropdownMenu, af as DropdownMenuTrigger, bE as ChevronDown, ah as DropdownMenuContent, ai as DropdownMenuItem, am as Trash2, as as Dialog, at as DialogContent, gj as DialogHeader, g8 as DialogTitle, S as Search, X, hA as SegmentedSwitch, dj as List, aB as LayoutGrid, aT as AlertTriangle, hB as Skeleton, d4 as Inbox, hC as Checkbox, gu as Tooltip, gv as TooltipTrigger, gw as TooltipContent, cf as Download, dl as Loader2, hD as formatBytes, o as usePlatform, hE as useCloudFolder, hF as useProjectAssetsService, E as useProjectActions, hG as useTransfers, hH as useCloudReviewNodes, hI as useProjectMemberNames, v as useStorage, hJ as getCloudStorageUsage, hK as useDownloadingNodeIds, hL as gatewayUrl, m as API_PATHS, hM as withThumbnailWidth, hN as onDidChangeCloudAssets, hO as getVisibleCloudUploads, hP as useCloudSearch, hQ as getProjectAssetWritePolicy, hR as PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS, hS as gateCloudAssetUploads, hT as rejectionToastText, hU as cloudAssetMimeType, hV as toastFolderDownloadSummary, hW as deleteCloudNode, hX as moveCloudNode, hY as normalizeCloudParentId, hZ as useMoveDnd, h_ as useCloudMoveOptions, h$ as filterMoveOptions, i0 as ROOT_KEY, i1 as debugDumpCloudProjectAssets, aL as FolderPlus, f0 as Upload, i2 as CLOUD_ASSET_ACCEPT, br as Bug, gk as RetryIcon, i3 as TransfersButton, i4 as AssetsDropzoneEmpty, i5 as UploadingAssets, i6 as NewFolderDialog, i7 as RenameNodeDialog, i8 as DeleteNodeDialog, i9 as MoveNodeDialog, g9 as DialogDescription, ia as MediaLightbox, bI as ChevronRight, ib as resolveTypeBucket, ic as resolveSyncState, h3 as ContextMenu, h4 as ContextMenuTrigger, id as ProjectAssetThumbnail, ie as NodeUpdatedMeta, ig as SyncBadge, c9 as Copy, ag as MoreVerticalIcon, ih as ActionDropdownMenuContent, ii as ActionDropdownMenuItem, ij as isCloudFileDownloadEnabled, aG as FolderOpen, ik as PlatformFileManagerLabel, aj as PencilIcon, cG as FolderInput, il as ActionContextMenuContent, im as ActionContextMenuItem, io as importPickedFiles, ip as localFolderOptions, iq as NewLocalFolderDialog, ir as RenameLocalNodeDialog, is as DeleteLocalNodeDialog, ck as ExternalLink, it as Popover, gt as TooltipProvider, iu as PopoverTrigger, iv as PopoverContent, w as useNavigate, iw as useParams, fT as useSearch, ix as useProject, iy as useTopbarState, y as useLoginGuard, x as useNavigateToWorkspace, P as useRecentWorkspacesRefresh, p as projectLog, gz as projectListLocation, a9 as isWorkspacePathCaseInsensitivePlatform, iz as mergeWorkspaceInventory, iA as selectProjectWorkspaces, H as homeService, K as workspaceRuntimeFromOpenResult, M as handleNewWorkspaceOpenResult, t as trackEvent, T as TRACK_EVENTS, N as useNewWorkspaceDialog, b0 as ArrowLeft, f4 as UserRoundPlus, gE as Tabs, gF as TabsList, Q as Plus, U as PageStateBoundary, gG as TabsTrigger, d5 as Info } from "./index-CANVzzmD.js";
import { m as memberAvatarColors, u as useWindowedList, P as ProjectMemberSummary } from "./ProjectMemberSummary-DbxNlG4U.js";
import { u as useWorkspaceAvailability } from "./use-workspace-availability-C9xXSOAk.js";
import { W as WorkspaceCard } from "./WorkspaceCard-C8b0Nrum.js";
import "./use-hub-entries-C9rw1YU1.js";
const PROJECT_MEMBERS_STALE_TIME_MS = 3e4;
function projectMembersQueryKey(projectId) {
  return ["project", projectId, "members"];
}
function useProjectMembers(projectId) {
  return useQuery({
    queryKey: projectMembersQueryKey(projectId ?? "NO_PROJECT"),
    queryFn: async () => {
      if (!projectId) return [];
      const operationId = createProjectOperationId("list-project-members");
      const startedAt = logProjectOperationAttempt("list-project-members", operationId, {
        remoteId: projectId
      });
      try {
        const members = await listProjectMembers(projectId);
        logProjectOperationSuccess("list-project-members", operationId, startedAt, {
          remoteId: projectId,
          memberCount: members.length
        });
        return members;
      } catch (error) {
        logProjectOperationFailure(
          "list-project-members",
          operationId,
          startedAt,
          "cloud-list-members",
          error,
          { remoteId: projectId }
        );
        throw error;
      }
    },
    enabled: Boolean(projectId),
    retry: false,
    staleTime: PROJECT_MEMBERS_STALE_TIME_MS,
    refetchOnWindowFocus: true
  });
}
function InviteProjectPanel({
  project,
  canManageMembers,
  /**
   * Optional key that causes the panel to refetch members and reset the
   * copy-link state. Parent surfaces (dialog / popover) pass the open
   * signal here so each open re-fetches the roster.
   */
  refreshKey,
  /** Hide the "仅受邀成员可访问..." info banner (popover uses this). */
  hideAccessBanner = false,
  /** Hide the copy-link CTA + expiry note (popover uses this). */
  hideInviteCta = false
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const runtimeConfig = useRuntimeConfig();
  const { user } = useAuth();
  const cloudProjectId = project.remoteId ?? "";
  const {
    data: members = [],
    isError: membersError,
    refetch: refreshMembers
  } = useProjectMembers(cloudProjectId || void 0);
  const [copyState, setCopyState] = reactExports.useState("idle");
  reactExports.useEffect(() => {
    if (refreshKey === false) return;
    setCopyState("idle");
    void refreshMembers();
  }, [refreshKey, refreshMembers]);
  const handleRemoveMember = reactExports.useCallback(
    async (member) => {
      const operationId = createProjectOperationId("remove-project-member");
      const startedAt = logProjectOperationAttempt("remove-project-member", operationId, {
        remoteId: cloudProjectId,
        memberId: member.userId
      });
      try {
        await removeProjectMember(cloudProjectId, member.userId);
        logProjectOperationSuccess("remove-project-member", operationId, startedAt, {
          remoteId: cloudProjectId,
          memberId: member.userId
        });
        queryClient.setQueryData(
          projectMembersQueryKey(cloudProjectId),
          (previous) => previous?.filter((item) => item.userId !== member.userId) ?? []
        );
      } catch (err) {
        logProjectOperationFailure(
          "remove-project-member",
          operationId,
          startedAt,
          "cloud-remove-member",
          err,
          { remoteId: cloudProjectId, memberId: member.userId }
        );
        dedupedToast.error(cloudErrorDisplayMessage(err) ?? t("project.invite.removeFailed"));
      }
      void queryClient.invalidateQueries({ queryKey: projectMembersQueryKey(cloudProjectId) });
    },
    [cloudProjectId, queryClient, t]
  );
  const handleCopyLink = reactExports.useCallback(async () => {
    if (copyState === "busy") return;
    const operationId = createProjectOperationId("copy-project-invite-link");
    const startedAt = logProjectOperationAttempt("copy-project-invite-link", operationId, {
      remoteId: cloudProjectId
    });
    setCopyState("busy");
    let stage = "cloud-create-invite";
    try {
      const ticket = await createProjectInviteLink(cloudProjectId);
      const link = buildProjectInviteWebLink({
        channel: runtimeConfig.channel,
        region: runtimeConfig.region,
        token: ticket.token,
        projectName: project.name,
        inviterName: user?.username,
        memberCount: members.length
      });
      stage = "clipboard-write";
      await navigator.clipboard.writeText(link);
      logProjectOperationSuccess("copy-project-invite-link", operationId, startedAt, {
        remoteId: cloudProjectId
      });
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2e3);
    } catch (err) {
      logProjectOperationFailure("copy-project-invite-link", operationId, startedAt, stage, err, {
        remoteId: cloudProjectId
      });
      dedupedToast.error(cloudErrorDisplayMessage(err) ?? t("project.invite.copyFailed"));
      setCopyState("idle");
    }
  }, [
    cloudProjectId,
    copyState,
    members.length,
    project.name,
    runtimeConfig.channel,
    runtimeConfig.region,
    t,
    user?.username
  ]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    hideAccessBanner ? null : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2.5 rounded-lg bg-muted/60 p-3 text-xs leading-5 text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(BadgeInfo, { className: "mt-0.5 size-4 shrink-0", strokeWidth: 1.5, "aria-hidden": "true" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: t("project.invite.accessDescription", {
        defaultValue: "仅受邀成员可访问该项目及其中的资产"
      }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 px-1 text-[13px] font-medium text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { size: 12, strokeWidth: 1.75, "aria-hidden": "true" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("project.invite.membersLabel", {
          defaultValue: "成员"
        }) }),
        members.some((m) => m.userId !== user?.userID) ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto text-[11px] tabular-nums", children: t("project.invite.membersTotal", {
          count: members.length,
          defaultValue: "{{count}} 名"
        }) }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex max-h-64 flex-col gap-0.5 overflow-y-auto rounded-lg bg-muted/60 p-1.5", children: membersError ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2 rounded-md bg-card px-3 py-2.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: t("project.invite.membersFailed") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "xs", onClick: () => void refreshMembers(), children: t("common.retry") })
      ] }) : members.map((member) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        MemberRow,
        {
          member,
          isSelf: member.userId === user?.userID,
          canManage: canManageMembers,
          onRemove: () => void handleRemoveMember(member)
        },
        member.userId
      )) })
    ] }),
    canManageMembers && !hideInviteCta ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          className: "w-full",
          size: "lg",
          loading: copyState === "busy",
          onClick: () => void handleCopyLink(),
          "data-action-ui-id": "project.invite-copy-link",
          children: [
            copyState === "busy" ? null : copyState === "copied" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 15, strokeWidth: 2, "aria-hidden": "true" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Link2, { size: 15, strokeWidth: 1.75, "aria-hidden": "true" }),
            copyState === "copied" ? t("project.invite.copied") : t("project.invite.copyLink")
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center justify-center gap-1 text-center text-[11px] text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 11, strokeWidth: 1.75, "aria-hidden": "true" }),
        t("project.invite.expiryNote")
      ] })
    ] }) : null
  ] });
}
function MemberRow({
  member,
  isSelf,
  canManage,
  onRemove
}) {
  const { t } = useTranslation();
  const isCreator = member.role === MemberRole.MEMBER_ROLE_CREATOR;
  const roleLabel = isCreator ? t("project.invite.roleOwner") : t("project.invite.roleMember");
  const palette = memberAvatarColors(member.userId || member.nickname);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-foreground/[0.03]",
      "data-action-ui-id": "project.invite-member-row",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Avatar, { size: "sm", children: [
          member.avatarUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarImage, { src: member.avatarUrl, alt: "" }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarFallback, { className: cn(palette.bg, palette.fg), children: member.nickname.charAt(0).toUpperCase() || "?" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1 truncate text-[13px] text-foreground", children: [
          member.nickname,
          isSelf ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 text-muted-foreground", children: t("project.invite.you") }) : null
        ] }),
        !canManage || isCreator || isSelf ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 px-1.5 text-[12px] text-muted-foreground", children: roleLabel }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuTrigger,
            {
              className: "flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground",
              "data-action-ui-id": "project.invite-member-role",
              children: [
                roleLabel,
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 12, strokeWidth: 1.5, "aria-hidden": "true" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuContent, { align: "end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuItem,
            {
              variant: "destructive",
              onClick: onRemove,
              "data-action-ui-id": "project.invite-remove-member",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 14, strokeWidth: 1.5, "aria-hidden": "true" }),
                t("project.invite.removeMember")
              ]
            }
          ) })
        ] })
      ]
    }
  );
}
function InviteProjectDialog({
  project,
  open,
  canManageMembers,
  onOpenChange
}) {
  const { t } = useTranslation();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    DialogContent,
    {
      size: "sm",
      className: "sm:max-w-[480px]",
      "data-action-ui-id": "project.invite-dialog",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "truncate text-[15px]", children: t(canManageMembers ? "project.invite.title" : "project.invite.membersTitle", {
          name: project.name
        }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          InviteProjectPanel,
          {
            project,
            canManageMembers,
            refreshKey: open
          }
        )
      ]
    }
  ) });
}
const PROJECT_DETAIL_TABS = [
  {
    key: "creations",
    labelKey: "project.tabs.creations",
    infoKey: "project.tabs.creationsInfo",
    visibleFor: ["local", "team"],
    comingSoon: false
  },
  {
    key: "localAssets",
    labelKey: "project.tabs.localAssets",
    infoKey: "project.tabs.localAssetsInfo",
    comingSoonInfoKey: "project.tabs.localAssetsComingSoonInfo",
    visibleFor: ["local"],
    comingSoon: false
  },
  {
    key: "cloudAssets",
    labelKey: "project.tabs.cloudAssets",
    infoKey: "project.tabs.cloudAssetsInfo",
    visibleFor: ["team"],
    comingSoon: false
  }
];
function visibleProjectDetailTabs(kind) {
  return PROJECT_DETAIL_TABS.filter((tab) => tab.visibleFor.includes(kind));
}
function AssetsHeader({
  breadcrumb,
  rightMeta,
  state,
  viewMode,
  setViewMode,
  actionIdPrefix
}) {
  const { t } = useTranslation();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center justify-between gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "-ml-1.5 flex min-w-0 items-center", children: breadcrumb }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex w-40 items-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Search,
          {
            size: 13,
            strokeWidth: 1.5,
            "aria-hidden": "true",
            className: "pointer-events-none absolute left-2 text-muted-foreground"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            value: state.search,
            onChange: (event) => state.setSearch(event.target.value),
            placeholder: t("projectAssets.searchPlaceholder"),
            "aria-label": t("projectAssets.searchPlaceholder"),
            "data-action-ui-id": `${actionIdPrefix}.search`,
            className: "h-7 w-full rounded-md border border-border bg-transparent pl-7 pr-6 text-[12px] outline-none placeholder:text-muted-foreground hover:bg-muted/40 focus:border-ring/50 focus:bg-background focus:ring-1 focus:ring-ring/30"
          }
        ),
        state.search ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "aria-label": t("projectAssets.searchClear"),
            onClick: () => state.setSearch(""),
            className: "absolute right-1.5 flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 11, strokeWidth: 1.5, "aria-hidden": "true" })
          }
        ) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SegmentedSwitch,
        {
          value: viewMode,
          onValueChange: setViewMode,
          ariaLabel: t("projectAssets.viewSwitch"),
          dataActionUiId: `${actionIdPrefix}.view-switch`,
          className: "[&>span]:!h-6 [&>span]:!rounded-[5px] p-0.5 [&_button]:!size-6",
          options: [
            {
              value: "list",
              label: t("projectAssets.viewList"),
              icon: List,
              ariaLabel: t("projectAssets.viewList"),
              tooltip: t("projectAssets.viewList"),
              dataActionUiId: `${actionIdPrefix}.view-list`
            },
            {
              value: "grid",
              label: t("projectAssets.viewGrid"),
              icon: LayoutGrid,
              ariaLabel: t("projectAssets.viewGrid"),
              tooltip: t("projectAssets.viewGrid"),
              dataActionUiId: `${actionIdPrefix}.view-grid`
            }
          ]
        }
      ),
      rightMeta
    ] })
  ] });
}
function AssetsEmptyState({
  variant = "default",
  title,
  description,
  cta,
  className
}) {
  const { t } = useTranslation();
  const Icon = variant === "search" ? Search : Inbox;
  const resolvedTitle = title ?? (variant === "search" ? t("projectAssets.emptyStateSearchTitle") : t("projectAssets.emptyStateTitle"));
  const resolvedDescription = description ?? (variant === "search" ? t("projectAssets.emptyStateSearchDesc") : t("projectAssets.emptyStateDesc"));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/70 px-4 py-14 text-center",
        className
      ),
      role: "status",
      "aria-live": "polite",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: 20, strokeWidth: 1.5, "aria-hidden": "true" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-body-14 font-medium text-foreground", children: resolvedTitle }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-w-sm text-caption-11 text-muted-foreground", children: resolvedDescription })
        ] }),
        cta
      ]
    }
  );
}
function AssetsErrorState({
  title,
  message,
  onRetry,
  className
}) {
  const { t } = useTranslation();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/70 px-4 py-14 text-center",
        className
      ),
      role: "alert",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { size: 20, strokeWidth: 1.5, "aria-hidden": "true" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-body-14 font-medium text-foreground", children: title ?? t("projectAssets.errorTitle") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-w-md text-caption-11 text-muted-foreground", children: message })
        ] }),
        onRetry ? /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", onClick: onRetry, children: t("common.retry") }) : null
      ]
    }
  );
}
function AssetsListSkeleton({ rows = 6 }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col", "aria-hidden": "true", children: Array.from({ length: rows }).map((_, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "flex h-13 items-center gap-3 border-b border-border/40 px-3",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-4 shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "size-8 rounded-md" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-1 flex-col gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-3 w-1/3 rounded-md" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-2.5 w-1/5 rounded-md" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "hidden h-3 w-16 rounded-md sm:block" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "hidden h-3 w-32 rounded-md md:block" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-3 w-14 rounded-md" })
      ]
    },
    index
  )) });
}
function AssetsRowCheckbox({
  selected,
  onToggle,
  ariaLabel,
  actionUiId
}) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: event boundary prevents the hidden input click from activating the host row.
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        className: "contents",
        onClick: (event) => event.stopPropagation(),
        onKeyDown: (event) => event.stopPropagation(),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Checkbox,
          {
            checked: selected,
            "aria-label": ariaLabel,
            "data-action-ui-id": actionUiId,
            onCheckedChange: () => onToggle({ shiftKey: false }),
            onClick: (event) => {
              event.stopPropagation();
              if (!event.shiftKey) return;
              event.preventDefault();
              event.preventBaseUIHandler();
              onToggle({ shiftKey: true });
            },
            className: cn(
              "cursor-pointer transition-opacity",
              selected ? "opacity-100" : "opacity-0 group-hover/row:opacity-100 focus:opacity-100"
            )
          }
        )
      }
    )
  );
}
function AssetsSelectionBar({
  count,
  onClear,
  allSelected = false,
  someSelected = false,
  onToggleAll,
  onDownload,
  downloadLabel,
  downloadDisabled,
  onDelete,
  busy = false,
  extraActions,
  actionIdPrefix,
  className
}) {
  const { t } = useTranslation();
  if (count === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      role: "toolbar",
      "aria-label": t("projectAssets.selectionBar"),
      "data-action-ui-id": `${actionIdPrefix}.selection-bar`,
      className: cn(
        "relative sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-[var(--home-content-surface)] px-1 py-2",
        className
      ),
      children: [
        onToggleAll ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute -left-6 top-1/2 flex -translate-y-1/2 items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TooltipTrigger,
            {
              render: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Checkbox,
                {
                  checked: allSelected,
                  indeterminate: someSelected && !allSelected,
                  onCheckedChange: onToggleAll,
                  "aria-label": t("projectAssets.selectAllFiles"),
                  "data-action-ui-id": `${actionIdPrefix}.selection-select-all`
                }
              )
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { side: "bottom", children: t("projectAssets.selectAllFiles") })
        ] }) }) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("text-xs", onToggleAll && "ml-2"), children: t("projectAssets.selectedCount", { count }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "secondary",
            size: "sm",
            className: "h-7",
            onClick: onClear,
            disabled: busy,
            "data-action-ui-id": `${actionIdPrefix}.selection-clear`,
            children: t("projectAssets.clearSelection")
          }
        ),
        onDownload ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "secondary",
            size: "sm",
            className: "h-7 gap-1.5",
            onClick: onDownload,
            disabled: busy || downloadDisabled,
            "data-action-ui-id": `${actionIdPrefix}.selection-download`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 12, strokeWidth: 1.5, "data-icon": "inline-start" }),
              downloadLabel ?? t("projectAssets.batchDownload")
            ]
          }
        ) : null,
        extraActions,
        onDelete ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "destructive",
            size: "sm",
            className: "h-7 gap-1.5",
            onClick: onDelete,
            disabled: busy,
            "data-action-ui-id": `${actionIdPrefix}.selection-delete`,
            children: [
              busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { size: 12, className: "animate-spin", "data-icon": "inline-start" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 12, strokeWidth: 1.5, "data-icon": "inline-start" }),
              t("projectAssets.batchDelete")
            ]
          }
        ) : null
      ]
    }
  );
}
const DEFAULT_SORT = { by: "updated", dir: "desc" };
function useAssetsListState() {
  const [search, setSearch] = reactExports.useState("");
  const [activeBuckets, setActiveBuckets] = reactExports.useState(
    void 0
  );
  const [sort, setSort] = reactExports.useState(DEFAULT_SORT);
  const [selection, setSelection] = reactExports.useState(/* @__PURE__ */ new Set());
  const [lastAnchor, setLastAnchor] = reactExports.useState(null);
  const toggleBucket = reactExports.useCallback((bucket) => {
    setActiveBuckets((current) => {
      const next = new Set(current ?? []);
      if (next.has(bucket)) next.delete(bucket);
      else next.add(bucket);
      return next.size === 0 ? void 0 : next;
    });
  }, []);
  const clearBuckets = reactExports.useCallback(() => setActiveBuckets(void 0), []);
  const toggleSort = reactExports.useCallback((by) => {
    setSort((current) => {
      if (current.by !== by) {
        return { by, dir: by === "name" || by === "type" ? "asc" : "desc" };
      }
      return { by, dir: current.dir === "asc" ? "desc" : "asc" };
    });
  }, []);
  const toggle = reactExports.useCallback((key) => {
    setSelection((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setLastAnchor(key);
  }, []);
  const selectOnly = reactExports.useCallback((key) => {
    setSelection(/* @__PURE__ */ new Set([key]));
    setLastAnchor(key);
  }, []);
  const toggleRange = reactExports.useCallback(
    (allKeys, targetKey) => {
      const anchor = lastAnchor;
      if (!anchor || anchor === targetKey) {
        toggle(targetKey);
        return;
      }
      const a = allKeys.indexOf(anchor);
      const b = allKeys.indexOf(targetKey);
      if (a === -1 || b === -1) {
        toggle(targetKey);
        return;
      }
      const [from, to] = a < b ? [a, b] : [b, a];
      setSelection((current) => {
        const next = new Set(current);
        for (let i = from; i <= to; i += 1) {
          const key = allKeys[i];
          if (key !== void 0) next.add(key);
        }
        return next;
      });
    },
    [lastAnchor, toggle]
  );
  const toggleAll = reactExports.useCallback(
    (allKeys, options) => {
      setSelection((current) => {
        const allSelected = allKeys.every((key) => current.has(key));
        if (!options?.preserveOtherSelection) {
          return allSelected && current.size === allKeys.length ? /* @__PURE__ */ new Set() : new Set(allKeys);
        }
        const next = new Set(current);
        if (allSelected) {
          for (const key of allKeys) next.delete(key);
        } else {
          for (const key of allKeys) next.add(key);
        }
        return next;
      });
    },
    []
  );
  const clearSelection = reactExports.useCallback(() => {
    setSelection(/* @__PURE__ */ new Set());
    setLastAnchor(null);
  }, []);
  return reactExports.useMemo(
    () => ({
      search,
      setSearch,
      activeBuckets,
      toggleBucket,
      clearBuckets,
      sort,
      setSort,
      toggleSort,
      selection,
      hasSelection: selection.size > 0,
      toggle,
      selectOnly,
      toggleRange,
      toggleAll,
      clearSelection
    }),
    [
      search,
      activeBuckets,
      toggleBucket,
      clearBuckets,
      sort,
      toggleSort,
      selection,
      toggle,
      selectOnly,
      toggleRange,
      toggleAll,
      clearSelection
    ]
  );
}
function selectionTargetsForAction(clicked, candidates, selection, keyOf) {
  const clickedKey = keyOf(clicked);
  if (!selection.has(clickedKey)) return [clicked];
  const selected = candidates.filter((item) => selection.has(keyOf(item)));
  return selected.length > 0 ? selected : [clicked];
}
function fileKeysForSelection(items, keyOf) {
  return items.filter((item) => item.kind === "file").map(keyOf);
}
function CloudUsagePanel({
  usedBytes,
  totalBytes,
  className,
  loading = false,
  error,
  onRetry
}) {
  const { t } = useTranslation();
  const ratio = totalBytes > 0 ? Math.min(1, usedBytes / totalBytes) : 0;
  const size = 40;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);
  const ringColor = ratio >= 0.9 ? "stroke-destructive" : ratio >= 0.7 ? "stroke-warning" : "stroke-brand-accent";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      TooltipTrigger,
      {
        render: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: cn(
              "flex h-[64px] min-w-0 flex-1 cursor-default items-center gap-3.5 rounded-lg border border-border/70 bg-card px-4 transition-colors hover:border-border-strong hover:bg-foreground/[0.025]",
              className
            ),
            "data-action-ui-id": "cloud-assets.usage-panel"
          }
        ),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "relative flex size-10 shrink-0 items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "svg",
            {
              width: size,
              height: size,
              viewBox: `0 0 ${size} ${size}`,
              className: "-rotate-90",
              "aria-hidden": "true",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "circle",
                  {
                    cx: size / 2,
                    cy: size / 2,
                    r: radius,
                    fill: "none",
                    strokeWidth,
                    className: "stroke-foreground/[0.08]"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "circle",
                  {
                    cx: size / 2,
                    cy: size / 2,
                    r: radius,
                    fill: "none",
                    strokeWidth,
                    strokeLinecap: "round",
                    strokeDasharray: circumference,
                    strokeDashoffset: loading ? circumference : dashOffset,
                    className: cn("transition-[stroke-dashoffset] duration-500 ease-out", ringColor)
                  }
                )
              ]
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 flex-col gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[11px] leading-none tracking-wide text-muted-foreground uppercase", children: t("cloudAssets.usagePanelTitle", { defaultValue: "云端用量" }) }),
            loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                "aria-hidden": "true",
                className: "h-[14px] w-24 animate-pulse rounded bg-foreground/[0.08]"
              }
            ) : error ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: onRetry,
                title: error,
                className: "text-[14px] font-medium leading-none text-muted-foreground hover:text-foreground",
                "data-action-ui-id": "cloud-assets.usage-retry",
                children: [
                  "-- · ",
                  t("common.retry")
                ]
              }
            ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "truncate text-[14px] font-medium leading-none text-foreground tabular-nums", children: [
              formatBytes(usedBytes),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-1 text-muted-foreground", children: [
                "/ ",
                formatBytes(totalBytes)
              ] })
            ] })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { side: "top", className: "max-w-[240px] text-center", children: t("cloudAssets.usagePanelTooltip", {
      defaultValue: "共创项目的资产存在云端，支持团队人员共享查看"
    }) })
  ] });
}
function compactCloudMoveTargets(targets, parentSegmentsFor) {
  const pathOf = (node) => [...parentSegmentsFor(node), node.name].join("/");
  const folderPaths = targets.filter((node) => node.kind === "folder").map(pathOf);
  return targets.filter((node) => {
    const path = pathOf(node);
    return !folderPaths.some(
      (folderPath) => folderPath !== path && path.startsWith(`${folderPath}/`)
    );
  });
}
const UPLOAD_REFRESH_DEBOUNCE_MS = 300;
function isCloudAssetsDebugEnabled(isDev = false) {
  return isDev;
}
function CloudAssetsPanel({ project }) {
  const { t } = useTranslation();
  const debugEnabled = isCloudAssetsDebugEnabled();
  const platform = usePlatform();
  const cloudProjectId = project.remoteId ?? "";
  const folder = useCloudFolder(cloudProjectId || void 0);
  const service = useProjectAssetsService();
  const { ensureProjectFolderName } = useProjectActions();
  const transfers = useTransfers();
  const projectTransfers = reactExports.useMemo(
    () => transfers.transfers.filter((item) => item.cloudProjectId === cloudProjectId),
    [cloudProjectId, transfers.transfers]
  );
  const review = useCloudReviewNodes(cloudProjectId || void 0);
  const memberNames = useProjectMemberNames(cloudProjectId || void 0);
  const [config, setConfig] = useStorage("global.config");
  const viewMode = config.cloudAssetsViewMode === "grid" ? "grid" : "list";
  const setViewMode = reactExports.useCallback(
    (mode) => {
      setConfig((previous) => ({ ...previous, cloudAssetsViewMode: mode }));
    },
    [setConfig]
  );
  const [usage, setUsage] = reactExports.useState(null);
  const [usageLoading, setUsageLoading] = reactExports.useState(false);
  const [usageError, setUsageError] = reactExports.useState(null);
  const [newFolderOpen, setNewFolderOpen] = reactExports.useState(false);
  const [renameTarget, setRenameTarget] = reactExports.useState(null);
  const [deleteTarget, setDeleteTarget] = reactExports.useState(null);
  const [batchDeleteTargets, setBatchDeleteTargets] = reactExports.useState([]);
  const [moveDialogTargets, setMoveDialogTargets] = reactExports.useState([]);
  const [preview, setPreview] = reactExports.useState(
    null
  );
  const [debugDump, setDebugDump] = reactExports.useState(null);
  const [debugLoading, setDebugLoading] = reactExports.useState(false);
  const fileInputRef = reactExports.useRef(null);
  const refreshUsage = reactExports.useCallback(() => {
    if (!cloudProjectId) return;
    setUsageLoading(true);
    setUsageError(null);
    getCloudStorageUsage(cloudProjectId).then(setUsage).catch((err) => {
      setUsage(null);
      setUsageError(err instanceof Error ? err.message : String(err));
    }).finally(() => setUsageLoading(false));
  }, [cloudProjectId]);
  reactExports.useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);
  const [folderName, setFolderName] = reactExports.useState(void 0);
  const [assetsDir, setAssetsDir] = reactExports.useState(void 0);
  reactExports.useEffect(() => {
    let disposed = false;
    void ensureProjectFolderName(project.id).then((name) => {
      if (!disposed) setFolderName(name);
    });
    return () => {
      disposed = true;
    };
  }, [ensureProjectFolderName, project.id]);
  reactExports.useEffect(() => {
    if (!folderName) return;
    let disposed = false;
    void service.getAssetsDir(folderName).then((dir) => {
      if (!disposed) setAssetsDir(dir);
    });
    return () => {
      disposed = true;
    };
  }, [folderName, service]);
  const [syncMap, setSyncMap] = reactExports.useState(/* @__PURE__ */ new Map());
  const [mirrorPathMap, setMirrorPathMap] = reactExports.useState(/* @__PURE__ */ new Map());
  const refreshSyncMap = reactExports.useCallback(async () => {
    if (!folderName) return;
    try {
      const states = await service.listAssetSyncStates(folderName);
      const next = /* @__PURE__ */ new Map();
      const nextMirrorPaths = /* @__PURE__ */ new Map();
      for (const state of states) {
        if (!state.mirrorExists) continue;
        nextMirrorPaths.set(state.id, state.relPath);
        if (state.remoteUpdatedAt !== void 0) next.set(state.id, state.remoteUpdatedAt);
      }
      setSyncMap(next);
      setMirrorPathMap(nextMirrorPaths);
    } catch {
    }
  }, [folderName, service]);
  reactExports.useEffect(() => {
    void refreshSyncMap();
  }, [refreshSyncMap]);
  reactExports.useEffect(() => {
    if (!folderName) return;
    const subscription = service.onDidChangeAssets((event) => {
      if (event.projectFolderName === folderName) void refreshSyncMap();
    });
    return () => subscription.dispose();
  }, [folderName, refreshSyncMap, service]);
  const downloadingIds = useDownloadingNodeIds(transfers.transfers, cloudProjectId);
  const downloadStartingIdsRef = reactExports.useRef(/* @__PURE__ */ new Set());
  const downloadDoneCount = reactExports.useMemo(
    () => transfers.transfers.filter(
      (item) => item.cloudProjectId === cloudProjectId && item.kind === "download" && item.status === "done"
    ).length,
    [transfers.transfers, cloudProjectId]
  );
  const downloadDoneCountRef = reactExports.useRef(downloadDoneCount);
  reactExports.useEffect(() => {
    if (downloadDoneCount > downloadDoneCountRef.current) void refreshSyncMap();
    downloadDoneCountRef.current = downloadDoneCount;
  }, [downloadDoneCount, refreshSyncMap]);
  const thumbnailSrcFor = reactExports.useCallback(
    (node, width) => {
      if (!assetsDir || node.kind !== "file" || node.review !== "pass") return void 0;
      const relPath = mirrorPathMap.get(node.id);
      if (!relPath) return void 0;
      const url = gatewayUrl(API_PATHS.serveLocal(`${assetsDir}/${relPath}`));
      return withThumbnailWidth(url, width);
    },
    [assetsDir, mirrorPathMap]
  );
  const { refresh: refreshFolder } = folder;
  const { refresh: refreshReview } = review;
  reactExports.useEffect(() => {
    const subscription = onDidChangeCloudAssets((event) => {
      if (event.projectId !== cloudProjectId) return;
      refreshFolder();
      refreshUsage();
      refreshReview();
    });
    return () => subscription.dispose();
  }, [cloudProjectId, refreshFolder, refreshReview, refreshUsage]);
  const uploadStatusKey = reactExports.useMemo(() => {
    let reviewing = 0;
    let done = 0;
    let failed = 0;
    for (const item of transfers.transfers) {
      if (item.cloudProjectId !== cloudProjectId || item.kind !== "upload") continue;
      if (item.status === "reviewing") reviewing += 1;
      else if (item.status === "done") done += 1;
      else if (item.status === "failed") failed += 1;
    }
    return `${reviewing}:${done}:${failed}`;
  }, [transfers.transfers, cloudProjectId]);
  const uploadStatusKeyRef = reactExports.useRef(uploadStatusKey);
  const uploadRefreshTimerRef = reactExports.useRef(void 0);
  const uploadRefreshProjectIdRef = reactExports.useRef(cloudProjectId);
  const uploadRefreshActionsRef = reactExports.useRef({
    refreshFolder,
    refreshUsage,
    refreshReview,
    refreshSyncMap
  });
  reactExports.useEffect(() => {
    uploadRefreshActionsRef.current = {
      refreshFolder,
      refreshUsage,
      refreshReview,
      refreshSyncMap
    };
  }, [refreshFolder, refreshUsage, refreshReview, refreshSyncMap]);
  const cancelUploadRefresh = reactExports.useCallback(() => {
    if (uploadRefreshTimerRef.current === void 0) return;
    window.clearTimeout(uploadRefreshTimerRef.current);
    uploadRefreshTimerRef.current = void 0;
  }, []);
  reactExports.useEffect(() => {
    if (cloudProjectId !== uploadRefreshProjectIdRef.current) {
      cancelUploadRefresh();
      uploadRefreshProjectIdRef.current = cloudProjectId;
      uploadStatusKeyRef.current = uploadStatusKey;
      return;
    }
    if (uploadStatusKey !== uploadStatusKeyRef.current) {
      cancelUploadRefresh();
      uploadRefreshTimerRef.current = window.setTimeout(() => {
        uploadRefreshTimerRef.current = void 0;
        const actions = uploadRefreshActionsRef.current;
        actions.refreshFolder();
        actions.refreshUsage();
        actions.refreshReview();
        void actions.refreshSyncMap();
      }, UPLOAD_REFRESH_DEBOUNCE_MS);
    }
    uploadStatusKeyRef.current = uploadStatusKey;
  }, [cancelUploadRefresh, cloudProjectId, uploadStatusKey]);
  reactExports.useEffect(() => cancelUploadRefresh, [cancelUploadRefresh]);
  const orderedNodes = reactExports.useMemo(() => {
    const folders = folder.nodes.filter((node) => node.kind === "folder");
    const files = folder.nodes.filter((node) => node.kind === "file");
    return [...folders, ...files];
  }, [folder.nodes]);
  const listState = useAssetsListState();
  reactExports.useEffect(() => {
    if (viewMode === "grid") listState.clearSelection();
  }, [listState.clearSelection, viewMode]);
  const searchQuery = listState.search.trim();
  const visibleUploads = reactExports.useMemo(
    () => getVisibleCloudUploads(projectTransfers, searchQuery),
    [projectTransfers, searchQuery]
  );
  const hasVisibleUploads = visibleUploads.length > 0;
  const search = useCloudSearch(cloudProjectId || void 0, searchQuery);
  const isSearching = searchQuery.length > 0;
  const visibleNodes = isSearching ? search.nodes : orderedNodes;
  const activeLoading = isSearching ? search.loading : folder.loading;
  const activeError = isSearching ? search.error : folder.error;
  const activeMembershipError = isSearching ? search.membershipError : folder.membershipError;
  const activeHasMore = isSearching ? search.hasMore : folder.hasMore;
  const loadMore = isSearching ? search.loadMore : folder.loadMore;
  const parentPathFor = reactExports.useCallback(
    (node) => isSearching ? search.folderPathsById.get(node.parentId) ?? [] : folder.stack,
    [folder.stack, isSearching, search.folderPathsById]
  );
  const parentSegmentsFor = reactExports.useCallback(
    (node) => parentPathFor(node).map((crumb) => crumb.name),
    [parentPathFor]
  );
  const isRootEmpty = folder.stack.length === 0 && orderedNodes.length === 0 && folder.hasLoaded && !folder.error;
  const writePolicy = getProjectAssetWritePolicy(folder.folderSegments.length);
  const folderDepthMessage = !writePolicy.canCreateFolder ? writePolicy.canCreateFile ? t("projectAssets.folderDepthReached", {
    count: PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS
  }) : t("projectAssets.depthExceeded") : void 0;
  const fileDepthMessage = !writePolicy.canCreateFile ? t("projectAssets.depthExceeded") : void 0;
  const handleUploadPicked = reactExports.useCallback(
    async (files) => {
      if (files.length === 0) return;
      const folderName2 = await ensureProjectFolderName(project.id);
      if (!folderName2) return;
      const { accepted, rejected } = await gateCloudAssetUploads(
        files,
        (file) => window.hilo?.webUtils?.getPathForFile(file)
      );
      for (const rejection of rejected) {
        dedupedToast.error(rejectionToastText(t, rejection));
      }
      for (const entry of accepted) {
        try {
          await service.startUpload({
            projectFolderName: folderName2,
            cloudProjectId,
            parentId: folder.currentFolderId,
            filePath: entry.path,
            name: entry.file.name,
            // Browser MIME when known; extension fallback otherwise (md /
            // htable etc. — cloud review needs a real MIME type).
            mime: entry.file.type || cloudAssetMimeType(entry.file.name),
            // Own-upload mirror: land a `.assets/` copy alongside the cloud
            // upload so the uploader never needs to re-download it.
            mirrorFolderSegments: folder.folderSegments
          });
        } catch (err) {
          dedupedToast.error(
            t("cloudAssets.uploadStartFailed", {
              name: entry.file.name,
              message: err instanceof Error ? err.message : String(err)
            })
          );
        }
      }
    },
    [
      cloudProjectId,
      ensureProjectFolderName,
      folder.currentFolderId,
      folder.folderSegments,
      project.id,
      service,
      t
    ]
  );
  const handleDownload = reactExports.useCallback(
    async (node) => {
      if (node.kind !== "file" || node.review !== "pass" || !node.cdnUrl) return;
      if (downloadingIds.has(node.id) || downloadStartingIdsRef.current.has(node.id)) return;
      downloadStartingIdsRef.current.add(node.id);
      try {
        const folderName2 = await ensureProjectFolderName(project.id);
        if (!folderName2) return;
        await service.startDownload({
          projectFolderName: folderName2,
          cloudProjectId,
          nodeId: node.id,
          name: node.name,
          cdnUrl: node.cdnUrl,
          folderSegments: parentSegmentsFor(node),
          size: node.size || void 0,
          mime: node.mimeType || void 0,
          // Snapshot for the sync badge: "cloud state as of this download".
          remoteUpdatedAt: node.updatedAt || void 0,
          // Cloud creation time — provenance snapshot for the local index.
          remoteCreatedAt: node.createdAt || void 0
        });
      } catch (err) {
        dedupedToast.error(err instanceof Error ? err.message : String(err));
      } finally {
        downloadStartingIdsRef.current.delete(node.id);
      }
    },
    [
      cloudProjectId,
      downloadingIds,
      ensureProjectFolderName,
      parentSegmentsFor,
      project.id,
      service
    ]
  );
  const handleDownloadFolder = reactExports.useCallback(
    async (node) => {
      const folderName2 = await ensureProjectFolderName(project.id);
      if (!folderName2) return;
      try {
        const summary = await service.startFolderDownload({
          projectFolderName: folderName2,
          cloudProjectId,
          folderNodeId: node.id,
          folderName: node.name,
          folderSegments: [...parentSegmentsFor(node), node.name]
        });
        toastFolderDownloadSummary(t, summary);
      } catch (err) {
        dedupedToast.error(
          cloudErrorDisplayMessage(err) ?? t("cloudAssets.folderDownloadFailed", {
            message: t("cloudAssets.failServer")
          })
        );
      }
    },
    [cloudProjectId, ensureProjectFolderName, parentSegmentsFor, project.id, service, t]
  );
  const handleDeleteBlocked = reactExports.useCallback(
    async (node) => {
      try {
        await deleteCloudNode(node.id);
      } catch (err) {
        dedupedToast.error(cloudErrorDisplayMessage(err) ?? t("cloudAssets.failServer"));
        return;
      }
      refreshReview();
      refreshFolder();
      refreshUsage();
    },
    [refreshFolder, refreshReview, refreshUsage, t]
  );
  const handleDelete = reactExports.useCallback(
    async (node) => {
      await deleteCloudNode(node.id);
      const folderName2 = await ensureProjectFolderName(project.id);
      if (folderName2) {
        try {
          if (node.kind === "folder") {
            await service.deleteLocalFolder(folderName2, [...parentSegmentsFor(node), node.name]);
          } else {
            await service.deleteLocalAsset(folderName2, node.id);
          }
        } catch {
          dedupedToast.warning(t("cloudAssets.deleteLocalFailed", { name: node.name }));
        }
      }
    },
    [ensureProjectFolderName, parentSegmentsFor, project.id, service, t]
  );
  const rowKeys = reactExports.useMemo(() => visibleNodes.map((node) => node.id), [visibleNodes]);
  const fileRowKeys = reactExports.useMemo(
    () => fileKeysForSelection(visibleNodes, (node) => node.id),
    [visibleNodes]
  );
  const [batchBusy, setBatchBusy] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (listState.selection.size === 0) return;
    const visible = new Set(rowKeys);
    for (const key of listState.selection) {
      if (!visible.has(key)) {
        listState.clearSelection();
        return;
      }
    }
  }, [rowKeys, listState]);
  const handleBatchDownload = reactExports.useCallback(async () => {
    const selected = visibleNodes.filter((node) => listState.selection.has(node.id));
    const nodes = selected.filter((node) => isCloudNodeDownloadable(node, downloadingIds));
    const skipped = selected.length - nodes.length;
    if (skipped > 0) {
      dedupedToast.info(t("projectAssets.batchDownloadSkipped", { count: skipped }));
    }
    if (nodes.length === 0) return;
    setBatchBusy(true);
    try {
      for (const node of nodes) {
        if (node.kind === "folder") {
          await handleDownloadFolder(node);
        } else {
          await handleDownload(node);
        }
      }
    } finally {
      setBatchBusy(false);
      listState.clearSelection();
    }
  }, [visibleNodes, listState, downloadingIds, handleDownload, handleDownloadFolder, t]);
  const selectedNodes = reactExports.useMemo(
    () => visibleNodes.filter((node) => listState.selection.has(node.id)),
    [listState.selection, visibleNodes]
  );
  const actionTargetsFor = reactExports.useCallback(
    (node) => selectionTargetsForAction(node, visibleNodes, listState.selection, (item) => item.id),
    [listState.selection, visibleNodes]
  );
  const hasDownloadableSelection = selectedNodes.some(
    (node) => isCloudNodeDownloadable(node, downloadingIds)
  );
  const openBatchDelete = reactExports.useCallback(() => {
    if (selectedNodes.length > 0) setBatchDeleteTargets(selectedNodes);
  }, [selectedNodes]);
  const handleContextMenu = reactExports.useCallback(
    (node) => {
      if (!listState.selection.has(node.id)) listState.selectOnly(node.id);
    },
    [listState]
  );
  const allSelected = fileRowKeys.length > 0 && fileRowKeys.every((key) => listState.selection.has(key));
  const someSelected = fileRowKeys.some((key) => listState.selection.has(key));
  const handleNodeClick = reactExports.useCallback(
    (node) => {
      if (node.kind === "folder") {
        if (isSearching) {
          const path = search.folderPathsById.get(node.id);
          if (!path) return;
          folder.goToFolderPath(path);
          listState.setSearch("");
        } else {
          folder.enterFolder(node);
        }
        return;
      }
      if (node.review !== "pass" || !node.cdnUrl) return;
      const media = mediaKind$1(node);
      if (media) setPreview({ kind: media, node });
    },
    [folder, isSearching, listState, search.folderPathsById]
  );
  const handleMoveNode = reactExports.useCallback(
    async (node, target) => {
      try {
        await moveCloudNode(node.id, target.folderId);
      } catch (err) {
        dedupedToast.error(cloudErrorDisplayMessage(err) ?? t("cloudAssets.failServer"));
        return;
      }
      if (folderName) {
        try {
          if (node.kind === "folder") {
            await service.moveLocalFolder(
              folderName,
              [...parentSegmentsFor(node), node.name],
              target.segments,
              { onConflict: "uniquify", missingOk: true }
            );
          } else {
            await service.moveLocalAsset(folderName, node.id, target.segments, {
              onConflict: "uniquify",
              missingOk: true
            });
          }
        } catch {
          dedupedToast.warning(t("cloudAssets.moveLocalFailed", { name: node.name }));
        }
      }
    },
    [folderName, parentSegmentsFor, service, t]
  );
  const handleMoveTargets = reactExports.useCallback(
    async (targets, target) => {
      for (const node of compactCloudMoveTargets(targets, parentSegmentsFor)) {
        await handleMoveNode(node, target);
      }
      listState.clearSelection();
      refreshFolder();
      if (isSearching) search.refresh();
      void refreshSyncMap();
    },
    [
      handleMoveNode,
      isSearching,
      listState,
      parentSegmentsFor,
      refreshFolder,
      refreshSyncMap,
      search.refresh
    ]
  );
  const handleRenamed = reactExports.useCallback(
    async (node, newName) => {
      if (folderName) {
        try {
          if (node.kind === "folder") {
            await service.renameLocalFolder(
              folderName,
              [...parentSegmentsFor(node), node.name],
              newName,
              { onConflict: "uniquify", missingOk: true }
            );
          } else {
            const snapshot = syncMap.get(node.id);
            const wasSynced = snapshot !== void 0 && snapshot >= node.updatedAt;
            await service.renameLocalAsset(folderName, node.id, newName, {
              onConflict: "uniquify",
              missingOk: true,
              ...wasSynced && node.updatedAt ? { remoteUpdatedAt: node.updatedAt } : {}
            });
          }
        } catch {
          dedupedToast.warning(t("cloudAssets.renameLocalFailed", { name: node.name }));
        }
      }
      refreshFolder();
      if (isSearching) search.refresh();
      void refreshSyncMap();
    },
    [
      folderName,
      isSearching,
      parentSegmentsFor,
      refreshFolder,
      refreshSyncMap,
      search.refresh,
      service,
      syncMap,
      t
    ]
  );
  const canDropNode = reactExports.useCallback((node, target) => {
    if (node.kind === "folder" && target.folderId === node.id) return false;
    return normalizeCloudParentId(target.folderId) !== normalizeCloudParentId(node.parentId);
  }, []);
  const canDropTargets = reactExports.useCallback(
    (targets, target) => targets.length > 0 && targets.every((node) => canDropNode(node, target)),
    [canDropNode]
  );
  const moveDnd = useMoveDnd({
    keyOf: (target) => target.key,
    canDrop: canDropTargets,
    onDrop: (targets, target) => void handleMoveTargets(targets, target)
  });
  const nodeDnd = reactExports.useCallback(
    (node) => ({
      dndProps: {
        draggable: true,
        onDragStart: (event) => {
          const targets = actionTargetsFor(node);
          if (!listState.selection.has(node.id)) listState.selectOnly(node.id);
          moveDnd.startDrag(
            event,
            targets,
            targets.length > 1 ? t("projectAssets.selectedCount", { count: targets.length }) : void 0
          );
        },
        onDragEnd: moveDnd.endDrag,
        ...node.kind === "folder" ? moveDnd.targetProps({
          key: node.id,
          folderId: node.id,
          segments: [...parentSegmentsFor(node), node.name]
        }) : moveDnd.blockerProps()
      },
      dropActive: node.kind === "folder" && moveDnd.overKey === node.id
    }),
    [actionTargetsFor, listState, moveDnd, parentSegmentsFor, t]
  );
  const crumbTarget = reactExports.useCallback(
    (index) => {
      const id = index < 0 ? "" : folder.stack[index]?.id ?? "";
      return {
        key: `crumb:${id}`,
        folderId: id,
        segments: folder.folderSegments.slice(0, index + 1)
      };
    },
    [folder.folderSegments, folder.stack]
  );
  const cloudMove = useCloudMoveOptions(cloudProjectId, moveDialogTargets.length > 0);
  const moveOptions = reactExports.useMemo(
    () => moveDialogTargets.filter((node) => node.kind === "folder").reduce(
      (options, node) => filterMoveOptions(options, [...parentSegmentsFor(node), node.name]),
      cloudMove.options
    ),
    [cloudMove.options, moveDialogTargets, parentSegmentsFor]
  );
  const moveNoopKey = reactExports.useMemo(() => {
    const parents = new Set(
      moveDialogTargets.map((node) => normalizeCloudParentId(node.parentId) || ROOT_KEY)
    );
    return parents.size === 1 ? [...parents][0] : void 0;
  }, [moveDialogTargets]);
  const handleReveal = reactExports.useCallback(
    async (node) => {
      if (!folderName) return;
      const absolute = await service.getAssetAbsolutePath(folderName, node.id);
      if (!absolute || !platform.shell.showItemInFolder) {
        dedupedToast.error(t("localAssets.openFailed", { name: node.name }));
        void refreshSyncMap();
        return;
      }
      await platform.shell.showItemInFolder(absolute);
    },
    [folderName, platform.shell, refreshSyncMap, service, t]
  );
  const handleRevealTargets = reactExports.useCallback(
    async (targets) => {
      if (targets.length === 0) return;
      if (targets.length === 1 && targets[0]) {
        await handleReveal(targets[0]);
        return;
      }
      if (!assetsDir || !platform.shell.openPath) {
        dedupedToast.error(t("localAssets.openFailed", { name: project.name }));
        return;
      }
      const parentPaths = targets.map((node) => parentSegmentsFor(node).join("/"));
      const sharedParent = parentPaths.every((path) => path === parentPaths[0]) ? parentPaths[0] ?? folder.folderSegments.join("/") : folder.folderSegments.join("/");
      await platform.shell.openPath(sharedParent ? `${assetsDir}/${sharedParent}` : assetsDir);
    },
    [
      assetsDir,
      folder.folderSegments,
      handleReveal,
      parentSegmentsFor,
      platform.shell,
      project.name,
      t
    ]
  );
  const handleDebugDump = reactExports.useCallback(async () => {
    if (!debugEnabled || debugLoading) return;
    setDebugLoading(true);
    try {
      const dump = await debugDumpCloudProjectAssets(cloudProjectId);
      console.log("[cloud-assets] raw dump", dump);
      setDebugDump(dump);
    } catch (err) {
      dedupedToast.error(
        cloudErrorDisplayMessage(err) ?? t("cloudAssets.debugDumpFailed", {
          message: t("cloudAssets.failServer")
        })
      );
    } finally {
      setDebugLoading(false);
    }
  }, [cloudProjectId, debugEnabled, debugLoading, t]);
  if (!cloudProjectId) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "pt-10 text-center text-[13px] text-muted-foreground", children: t("cloudAssets.noCloudBinding") });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "no-drag flex min-h-0 flex-1 flex-col gap-3",
      "data-action-ui-id": "cloud-assets.panel",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-stretch gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setNewFolderOpen(true),
              disabled: !writePolicy.canCreateFolder,
              title: folderDepthMessage,
              "data-action-ui-id": "cloud-assets.new-folder",
              className: "group flex h-[64px] min-w-0 flex-1 items-center gap-3.5 rounded-lg border border-border/70 bg-card px-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-150 hover:border-border hover:bg-foreground/[0.03] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] focus-visible:border-ring/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-10 shrink-0 items-center justify-center rounded-md bg-foreground/[0.03] text-foreground/80 transition-colors group-hover:bg-foreground/[0.05] dark:bg-foreground/[0.06] dark:group-hover:bg-foreground/[0.1] group-hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FolderPlus, { size: 18, strokeWidth: 1.75, "aria-hidden": "true" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 flex-col gap-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[13px] leading-none text-foreground", children: t("cloudAssets.newFolder") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[11px] leading-none text-muted-foreground", children: folderDepthMessage ?? t("projectAssets.createFolderHint") })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => fileInputRef.current?.click(),
              disabled: !writePolicy.canCreateFile,
              title: fileDepthMessage,
              "data-action-ui-id": "cloud-assets.upload",
              className: "group flex h-[64px] min-w-0 flex-1 items-center gap-3.5 rounded-lg border border-border/70 bg-card px-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-150 hover:border-border hover:bg-foreground/[0.03] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] focus-visible:border-ring/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-10 shrink-0 items-center justify-center rounded-md bg-foreground/[0.03] text-foreground/80 transition-colors group-hover:bg-foreground/[0.05] dark:bg-foreground/[0.06] dark:group-hover:bg-foreground/[0.1] group-hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { size: 18, strokeWidth: 1.75, "aria-hidden": "true" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 flex-col gap-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[13px] leading-none text-foreground", children: t("cloudAssets.upload") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[11px] leading-none text-muted-foreground", children: fileDepthMessage ?? t("projectAssets.batchUploadHint") })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            CloudUsagePanel,
            {
              usedBytes: usage?.usedBytes ?? 0,
              totalBytes: usage?.totalBytes ?? 0,
              loading: usageLoading,
              error: usageError,
              onRetry: refreshUsage
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            ref: fileInputRef,
            type: "file",
            multiple: true,
            accept: CLOUD_ASSET_ACCEPT,
            className: "hidden",
            onChange: (event) => {
              const files = [...event.target.files ?? []];
              event.target.value = "";
              void handleUploadPicked(files);
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          AssetsHeader,
          {
            state: listState,
            viewMode,
            setViewMode,
            actionIdPrefix: "cloud-assets",
            breadcrumb: (
              // Always show the "全部文件" root crumb, even at an empty root, so
              // users always see where uploads will land.
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Breadcrumb$1,
                {
                  stack: folder.stack,
                  onCrumb: folder.goToCrumb,
                  crumbDnd: (index) => moveDnd.targetProps(crumbTarget(index)),
                  crumbDropActive: (index) => moveDnd.overKey === crumbTarget(index).key
                }
              )
            ),
            rightMeta: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              debugEnabled ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "ghost",
                  size: "icon-sm",
                  "aria-label": t("cloudAssets.debugDump"),
                  title: t("cloudAssets.debugDump"),
                  disabled: debugLoading,
                  onClick: () => void handleDebugDump(),
                  "data-action-ui-id": "cloud-assets.debug-dump",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Bug,
                    {
                      size: 15,
                      strokeWidth: 1.5,
                      className: cn(debugLoading && "animate-pulse")
                    }
                  )
                }
              ) : null,
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "ghost",
                  size: "icon-sm",
                  "aria-label": t("cloudAssets.refresh"),
                  onClick: () => {
                    if (isSearching) search.refresh();
                    else refreshFolder();
                    refreshUsage();
                    refreshReview();
                    void refreshSyncMap();
                  },
                  "data-action-ui-id": "cloud-assets.refresh",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    RetryIcon,
                    {
                      size: 15,
                      strokeWidth: 1.5,
                      className: cn(activeLoading && "animate-spin")
                    }
                  )
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TransfersButton,
                {
                  reviewNodes: review.nodes,
                  reviewLoading: review.loading,
                  transfers: projectTransfers,
                  onOpen: refreshReview,
                  onCancelTransfer: transfers.cancelTransfer,
                  onDeleteBlocked: (node) => void handleDeleteBlocked(node),
                  onRemoveTransfer: transfers.removeTransfer
                }
              )
            ] })
          }
        ) }),
        activeError ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          AssetsErrorState,
          {
            title: activeMembershipError ? t("cloudAssets.notTeamMemberTitle") : void 0,
            message: activeMembershipError ? t("cloudAssets.notTeamMemberDescription") : isSearching ? search.userMessage ?? t("cloudAssets.failServer") : activeError,
            onRetry: isSearching ? search.refresh : refreshFolder
          }
        ) : visibleNodes.length === 0 && !hasVisibleUploads && activeLoading && (isSearching || !folder.hasLoaded) ? /* @__PURE__ */ jsxRuntimeExports.jsx(AssetsListSkeleton, {}) : isRootEmpty && !hasVisibleUploads && !isSearching ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          AssetsDropzoneEmpty,
          {
            onOpenPicker: () => fileInputRef.current?.click(),
            onPickFiles: (files) => void handleUploadPicked(files),
            disabled: !writePolicy.canCreateFile
          }
        ) : visibleNodes.length === 0 && !hasVisibleUploads && !isSearching ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          AssetsEmptyState,
          {
            variant: "default",
            title: t("localAssets.emptyFolderTitle", "当前文件夹暂无资产"),
            cta: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                size: "sm",
                disabled: !writePolicy.canCreateFile,
                title: fileDepthMessage,
                onClick: () => fileInputRef.current?.click(),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { size: 14, strokeWidth: 1.5, "data-icon": "inline-start" }),
                  t("cloudAssets.upload")
                ]
              }
            )
          }
        ) : visibleNodes.length === 0 && !hasVisibleUploads ? /* @__PURE__ */ jsxRuntimeExports.jsx(AssetsEmptyState, { variant: "search" }) : viewMode === "grid" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(UploadingAssets, { transfers: visibleUploads, viewMode }),
          visibleNodes.map((node) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            NodeCard$1,
            {
              node,
              thumbSrc: thumbnailSrcFor(node, 480),
              syncMap,
              downloadingIds,
              memberNames,
              onOpen: handleNodeClick,
              onDownload: handleDownload,
              onDownloadFolder: (target) => void handleDownloadFolder(target),
              onReveal: (target) => void handleReveal(target),
              onRename: setRenameTarget,
              onMove: (target) => setMoveDialogTargets([target]),
              onDelete: setDeleteTarget,
              ...nodeDnd(node)
            },
            node.id
          ))
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            AssetsSelectionBar,
            {
              count: listState.selection.size,
              onClear: listState.clearSelection,
              allSelected,
              someSelected,
              onToggleAll: () => listState.toggleAll(fileRowKeys, { preserveOtherSelection: true }),
              onDownload: () => void handleBatchDownload(),
              downloadLabel: t("cloudAssets.download"),
              downloadDisabled: !hasDownloadableSelection,
              onDelete: openBatchDelete,
              busy: batchBusy,
              actionIdPrefix: "cloud-assets"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-9 w-full shrink-0 items-center gap-3 border-y border-border px-3 text-[12px] font-medium tracking-wide text-muted-foreground uppercase", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate", children: t("projectAssets.columns.name") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden w-28 shrink-0 truncate md:block", children: t("projectAssets.columns.owner") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "-translate-x-4 hidden w-32 shrink-0 truncate md:block", children: t("projectAssets.columns.updated") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "-translate-x-4 w-20 shrink-0 truncate pr-3", children: t("projectAssets.columns.size") })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(UploadingAssets, { transfers: visibleUploads, viewMode }),
          visibleNodes.map((node, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            NodeRow$1,
            {
              node,
              thumbSrc: thumbnailSrcFor(node, 48),
              isLast: index === visibleNodes.length - 1,
              syncMap,
              downloadingIds,
              memberNames,
              selected: listState.selection.has(node.id),
              onToggleSelect: (event) => {
                if (event.shiftKey) {
                  listState.toggleRange(rowKeys, node.id);
                } else {
                  listState.toggle(node.id);
                }
              },
              onOpen: handleNodeClick,
              onDownload: handleDownload,
              onDownloadFolder: (target) => void handleDownloadFolder(target),
              onReveal: (target) => void handleReveal(target),
              onRename: setRenameTarget,
              onMove: (target) => setMoveDialogTargets([target]),
              onDelete: setDeleteTarget,
              actionTargets: actionTargetsFor(node),
              onContextMenu: handleContextMenu,
              onRevealTargets: (targets) => void handleRevealTargets(targets),
              onMoveTargets: (targets) => setMoveDialogTargets([...targets]),
              onDeleteTargets: (targets) => setBatchDeleteTargets([...targets]),
              ...nodeDnd(node)
            },
            node.id
          ))
        ] }),
        activeHasMore ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", disabled: activeLoading, onClick: loadMore, children: t("cloudAssets.loadMore") }) }) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          NewFolderDialog,
          {
            open: newFolderOpen,
            projectId: cloudProjectId,
            parentId: folder.currentFolderId,
            onOpenChange: setNewFolderOpen,
            onCreated: refreshFolder
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          RenameNodeDialog,
          {
            node: renameTarget,
            onOpenChange: (open) => {
              if (!open) setRenameTarget(null);
            },
            onRenamed: (node, newName) => void handleRenamed(node, newName)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DeleteNodeDialog,
          {
            node: deleteTarget,
            batchNodes: batchDeleteTargets,
            onOpenChange: (open) => {
              if (!open) {
                setDeleteTarget(null);
                setBatchDeleteTargets([]);
              }
            },
            onConfirm: handleDelete,
            onCompleted: () => {
              listState.clearSelection();
              refreshFolder();
              if (isSearching) search.refresh();
              refreshUsage();
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          MoveNodeDialog,
          {
            open: moveDialogTargets.length > 0,
            name: moveDialogTargets[0]?.name ?? "",
            itemCount: moveDialogTargets.length,
            options: moveOptions,
            loading: cloudMove.loading,
            noopKey: moveNoopKey,
            onOpenChange: (open) => {
              if (!open) setMoveDialogTargets([]);
            },
            onConfirm: async (destination) => {
              if (moveDialogTargets.length === 0) return;
              await handleMoveTargets(moveDialogTargets, {
                key: destination.key,
                folderId: destination.key === ROOT_KEY ? "" : destination.key,
                segments: destination.segments
              });
            }
          }
        ),
        debugEnabled ? /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: debugDump !== null, onOpenChange: (open) => !open && setDebugDump(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { size: "xl", "data-action-ui-id": "cloud-assets.debug-dump-dialog", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "text-body-14 leading-5 font-medium", children: t("cloudAssets.debugDumpTitle") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { className: "sr-only", children: t("cloudAssets.debugDumpTitle") })
          ] }),
          debugDump ? /* @__PURE__ */ jsxRuntimeExports.jsx(DebugDumpView, { dump: debugDump }) : null
        ] }) }) : null,
        preview ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          MediaLightbox,
          {
            kind: preview.kind,
            src: preview.node.cdnUrl,
            alt: preview.node.name,
            onClose: () => setPreview(null)
          }
        ) : null
      ]
    }
  );
}
function DebugDumpView({ dump }) {
  const { t } = useTranslation();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-0 flex-col gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "truncate font-mono text-[11px] text-muted-foreground", children: [
        "project_id=",
        dump.project_id,
        " · fetched_at=",
        dump.fetched_at,
        " ·",
        " ",
        t("cloudAssets.debugDumpCallCount", { count: dump.calls.length })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "outline",
          size: "sm",
          className: "shrink-0",
          onClick: () => {
            void navigator.clipboard.writeText(JSON.stringify(dump, null, 2)).then(() => dedupedToast.success(t("common.copied"))).catch(() => dedupedToast.error(t("common.copyFailed")));
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { size: 14, strokeWidth: 1.5, "data-icon": "inline-start" }),
            t("common.copy")
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex max-h-[60vh] flex-col gap-2 overflow-auto", children: dump.calls.map((call) => {
      const [path, query = ""] = call.url.split("?", 2);
      const isError = !!call.response && typeof call.response === "object" && "error" in call.response;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { open: true, className: "rounded-md border border-border bg-muted/40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "flex cursor-pointer select-none flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-3 py-2 font-mono text-[11px] leading-4 hover:bg-foreground/[0.03]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
            "#",
            call.seq
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-sm bg-foreground/10 px-1 py-px font-medium text-foreground", children: call.method }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-foreground", children: path }),
          call.context ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-muted px-1.5 py-px text-muted-foreground", children: call.context }) : null,
          isError ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-destructive/10 px-1.5 py-px font-medium text-destructive", children: "error" }) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1.5 border-t border-border px-3 py-2", children: [
          query ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1 font-mono text-[11px] leading-4", children: [...new URLSearchParams(query).entries()].map(([key, value]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "span",
            {
              className: "rounded-sm border border-border bg-background px-1.5 py-px text-muted-foreground",
              children: [
                key,
                "=",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground", children: value || "(root)" })
              ]
            },
            key
          )) }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "overflow-auto rounded-md border border-border bg-background p-2 font-mono text-[11px] leading-4 text-foreground", children: JSON.stringify(call.response, null, 2) })
        ] })
      ] }, call.seq);
    }) })
  ] });
}
function Breadcrumb$1({
  stack,
  onCrumb,
  crumbDnd,
  crumbDropActive
}) {
  const { t } = useTranslation();
  const rootLabel = t("cloudAssets.breadcrumbRoot", { defaultValue: "全部文件" });
  const items = [
    { index: -1, name: rootLabel, isCurrent: stack.length === 0 },
    ...stack.map((crumb, i) => ({
      index: i,
      name: crumb.name,
      isCurrent: i === stack.length - 1
    }))
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "flex min-w-0 items-center gap-0.5 text-[14px]",
      "data-action-ui-id": "cloud-assets.breadcrumb",
      children: items.map((item, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-0.5", children: [
        i > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          ChevronRight,
          {
            size: 13,
            strokeWidth: 1,
            className: "shrink-0 text-muted-foreground/60",
            "aria-hidden": "true"
          }
        ) : null,
        item.isCurrent ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "max-w-40 truncate rounded-md px-1.5 py-0.5 text-foreground",
            "data-current": "true",
            children: item.name
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => onCrumb(item.index),
            ...crumbDnd?.(item.index),
            className: cn(
              "max-w-40 truncate rounded-md px-1.5 py-0.5 transition-colors text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
              crumbDropActive?.(item.index) && "bg-primary/10 text-foreground"
            ),
            children: item.name
          }
        )
      ] }, `${item.index}:${item.name}`))
    }
  );
}
function isCloudNodeDownloadable(node, downloadingIds) {
  if (node.kind === "folder") return true;
  return node.review === "pass" && Boolean(node.cdnUrl) && !downloadingIds.has(node.id);
}
function mediaKind$1(node) {
  if (node.mimeType.startsWith("image/")) return "image";
  if (node.mimeType.startsWith("video/")) return "video";
  return void 0;
}
function ReviewBadge({ node }) {
  const { t } = useTranslation();
  if (node.kind === "folder" || node.review === "pass") return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: cn(
        "rounded-full px-1.5 py-px text-[11px] font-medium",
        node.review === "reviewing" ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive"
      ),
      children: node.review === "reviewing" ? t("cloudAssets.reviewing") : t("cloudAssets.blocked")
    }
  );
}
function NodeMenu$1({
  node,
  syncMap,
  downloadingIds,
  onDownload,
  onDownloadFolder,
  onReveal,
  onRename,
  onMove,
  onDelete,
  className
}) {
  const { t } = useTranslation();
  const syncState = resolveSyncState(node, syncMap, downloadingIds);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DropdownMenuTrigger,
      {
        "aria-label": t("cloudAssets.moreActions"),
        "data-action-ui-id": "cloud-assets.node-menu",
        className: cn(
          "flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className
        ),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(MoreVerticalIcon, { size: 14 })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionDropdownMenuContent, { align: "end", side: "bottom", sideOffset: 2, children: [
      node.kind === "file" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          ActionDropdownMenuItem,
          {
            disabled: !isCloudFileDownloadEnabled(node, syncState),
            onClick: () => onDownload(node),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 14, strokeWidth: 1.5 }),
              syncState === "stale" ? t("cloudAssets.redownload") : t("cloudAssets.download")
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionDropdownMenuItem, { disabled: !syncMap.has(node.id), onClick: () => onReveal(node), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { size: 14, strokeWidth: 1.5 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(PlatformFileManagerLabel, {})
        ] })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionDropdownMenuItem, { onClick: () => onDownloadFolder(node), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 14, strokeWidth: 1.5 }),
        t("cloudAssets.download")
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionDropdownMenuItem, { disabled: node.review === "block", onClick: () => onRename(node), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(PencilIcon, { size: 14, strokeWidth: 1.5 }),
        t("cloudAssets.rename")
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionDropdownMenuItem, { onClick: () => onMove(node), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FolderInput, { size: 14, strokeWidth: 1.5 }),
        t("cloudAssets.moveTo")
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionDropdownMenuItem, { variant: "destructive", onClick: () => onDelete(node), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 14, strokeWidth: 1.5 }),
        t("cloudAssets.delete")
      ] })
    ] })
  ] });
}
function NodeContextMenuContent$1({
  node,
  syncMap,
  downloadingIds,
  onDownload,
  onDownloadFolder,
  onReveal,
  onRename,
  onMove,
  onDelete,
  actionTargets,
  onRevealTargets,
  onMoveTargets,
  onDeleteTargets
}) {
  const { t } = useTranslation();
  const syncState = resolveSyncState(node, syncMap, downloadingIds);
  const targets = actionTargets?.length ? actionTargets : [node];
  const isBatch = targets.length > 1;
  const handleRevealAction = () => {
    if (onRevealTargets) onRevealTargets(isBatch ? targets : [node]);
    else onReveal(node);
  };
  const handleMoveAction = () => {
    if (onMoveTargets) onMoveTargets(isBatch ? targets : [node]);
    else onMove(node);
  };
  const handleDeleteAction = () => {
    if (onDeleteTargets) onDeleteTargets(isBatch ? targets : [node]);
    else onDelete(node);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionContextMenuContent, { "data-action-ui-id": "cloud-assets.node-context-menu", children: [
    !isBatch && node.kind === "file" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      ActionContextMenuItem,
      {
        disabled: !isCloudFileDownloadEnabled(node, syncState),
        onClick: () => onDownload(node),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 14, strokeWidth: 1.5 }),
          syncState === "stale" ? t("cloudAssets.redownload") : t("cloudAssets.download")
        ]
      }
    ) : !isBatch ? /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionContextMenuItem, { onClick: () => onDownloadFolder(node), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 14, strokeWidth: 1.5 }),
      t("cloudAssets.download")
    ] }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      ActionContextMenuItem,
      {
        disabled: !isBatch && !syncMap.has(node.id),
        onClick: handleRevealAction,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { size: 14, strokeWidth: 1.5 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(PlatformFileManagerLabel, {})
        ]
      }
    ),
    !isBatch ? /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionContextMenuItem, { disabled: node.review === "block", onClick: () => onRename(node), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PencilIcon, { size: 14, strokeWidth: 1.5 }),
      t("cloudAssets.rename")
    ] }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionContextMenuItem, { onClick: handleMoveAction, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(FolderInput, { size: 14, strokeWidth: 1.5 }),
      isBatch ? t("projectAssets.batchMove") : t("cloudAssets.moveTo")
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionContextMenuItem, { variant: "destructive", onClick: handleDeleteAction, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 14, strokeWidth: 1.5 }),
      isBatch ? t("projectAssets.batchDelete") : t("cloudAssets.delete")
    ] })
  ] });
}
function NodeCard$1({
  node,
  thumbSrc,
  syncMap,
  downloadingIds,
  memberNames,
  onOpen,
  onDownload,
  onDownloadFolder,
  onReveal,
  onRename,
  onMove,
  onDelete,
  dndProps,
  dropActive
}) {
  const { t } = useTranslation();
  const typeBucket = resolveTypeBucket({
    kind: node.kind,
    name: node.name,
    mime: node.mimeType
  });
  const syncState = resolveSyncState(node, syncMap, downloadingIds);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ContextMenu, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ContextMenuTrigger,
      {
        render: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            ...dndProps,
            className: cn(
              "group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-colors duration-[80ms] hover:border-foreground/40",
              dropActive && "border-primary bg-primary/5"
            ),
            "data-action-ui-id": "cloud-assets.node-card",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => onOpen(node),
                  className: cn(
                    "flex w-full flex-col text-left",
                    node.review === "block" && "opacity-60"
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      ProjectAssetThumbnail,
                      {
                        name: node.name,
                        kind: node.kind,
                        typeBucket,
                        thumbnailSrc: thumbSrc,
                        variant: "grid",
                        muted: node.review === "reviewing"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex w-full flex-col gap-0.5 p-3 pr-9", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[13px] text-foreground", children: node.name }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[12px] text-muted-foreground", children: node.kind === "folder" ? t("cloudAssets.folderMeta", { count: node.totalFileCount }) : formatBytes(node.size) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        NodeUpdatedMeta,
                        {
                          node,
                          memberNames,
                          className: "text-[11px] opacity-0 transition-opacity group-hover:opacity-100"
                        }
                      )
                    ] })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute left-2 top-2 flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ReviewBadge, { node }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SyncBadge, { state: syncState })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-2 right-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                NodeMenu$1,
                {
                  node,
                  syncMap,
                  downloadingIds,
                  onDownload,
                  onDownloadFolder,
                  onReveal,
                  onRename,
                  onMove,
                  onDelete
                }
              ) })
            ]
          }
        )
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      NodeContextMenuContent$1,
      {
        node,
        syncMap,
        downloadingIds,
        onDownload,
        onDownloadFolder,
        onReveal,
        onRename,
        onMove,
        onDelete
      }
    )
  ] });
}
function NodeRow$1({
  node,
  thumbSrc,
  isLast,
  syncMap,
  downloadingIds,
  memberNames,
  selected,
  onToggleSelect,
  onOpen,
  onDownload,
  onDownloadFolder,
  onReveal,
  onRename,
  onMove,
  onDelete,
  actionTargets,
  onContextMenu,
  onRevealTargets,
  onMoveTargets,
  onDeleteTargets,
  dndProps,
  dropActive
}) {
  const { t } = useTranslation();
  const typeBucket = resolveTypeBucket({
    kind: node.kind,
    name: node.name,
    mime: node.mimeType
  });
  const syncState = resolveSyncState(node, syncMap, downloadingIds);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ContextMenu, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ContextMenuTrigger,
      {
        onContextMenu: () => onContextMenu?.(node),
        render: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            ...dndProps,
            className: cn(
              "group/row relative w-full",
              dropActive && "bg-primary/10",
              selected && "bg-foreground/[0.04]"
            ),
            "data-action-ui-id": "cloud-assets.node-row",
            children: [
              onToggleSelect ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute -left-6 top-1/2 flex -translate-y-1/2 items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                AssetsRowCheckbox,
                {
                  selected: selected ?? false,
                  onToggle: onToggleSelect,
                  ariaLabel: t("projectAssets.selectRow"),
                  actionUiId: "cloud-assets.row-select"
                }
              ) }) : null,
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => onOpen(node),
                  className: cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-foreground/[0.04] focus-visible:bg-foreground/[0.04] focus-visible:outline-none",
                    !isLast && "border-b border-border",
                    node.review === "block" && "opacity-60"
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      ProjectAssetThumbnail,
                      {
                        name: node.name,
                        kind: node.kind,
                        typeBucket,
                        thumbnailSrc: thumbSrc,
                        variant: "list",
                        muted: node.review === "reviewing"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex min-w-0 flex-1 flex-col gap-0.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 items-center gap-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate text-[13px] text-foreground", children: node.name }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SyncBadge, { state: syncState }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(ReviewBadge, { node })
                    ] }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden w-28 shrink-0 truncate text-[12px] text-muted-foreground md:block", children: memberNames.get(node.uploaderId) ?? "" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      NodeUpdatedMeta,
                      {
                        node: { uploaderId: "", updatedAt: node.updatedAt },
                        memberNames,
                        className: "-translate-x-4 hidden w-32 shrink-0 truncate text-[12px] text-muted-foreground md:block"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "-translate-x-4 w-20 shrink-0 pr-3 text-[12px] text-muted-foreground", children: node.kind === "folder" ? t("cloudAssets.folderMeta", { count: node.totalFileCount }) : formatBytes(node.size) })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute right-2 top-1/2 -translate-y-1/2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                NodeMenu$1,
                {
                  node,
                  syncMap,
                  downloadingIds,
                  onDownload,
                  onDownloadFolder,
                  onReveal,
                  onRename,
                  onMove,
                  onDelete
                }
              ) })
            ]
          }
        )
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      NodeContextMenuContent$1,
      {
        node,
        syncMap,
        downloadingIds,
        onDownload,
        onDownloadFolder,
        onReveal,
        onRename,
        onMove,
        onDelete,
        actionTargets,
        onRevealTargets,
        onMoveTargets,
        onDeleteTargets
      }
    )
  ] });
}
const LOCAL_ASSETS_PAGE_SIZE = 100;
function LocalAssetsPanel({ project }) {
  const { t } = useTranslation();
  const platform = usePlatform();
  const service = useProjectAssetsService();
  const { ensureProjectFolderName } = useProjectActions();
  const [config, setConfig] = useStorage("global.config");
  const viewMode = config.cloudAssetsViewMode === "grid" ? "grid" : "list";
  const setViewMode = reactExports.useCallback(
    (mode) => {
      setConfig((previous) => ({ ...previous, cloudAssetsViewMode: mode }));
    },
    [setConfig]
  );
  const [folderName, setFolderName] = reactExports.useState(void 0);
  const [assetsDir, setAssetsDir] = reactExports.useState(void 0);
  const [records, setRecords] = reactExports.useState([]);
  const [folders, setFolders] = reactExports.useState([]);
  const [segments, setSegments] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [newFolderOpen, setNewFolderOpen] = reactExports.useState(false);
  const [renameTarget, setRenameTarget] = reactExports.useState(null);
  const [deleteTarget, setDeleteTarget] = reactExports.useState(null);
  const [batchDeleteTargets, setBatchDeleteTargets] = reactExports.useState([]);
  const [moveDialogTargets, setMoveDialogTargets] = reactExports.useState([]);
  const [preview, setPreview] = reactExports.useState(
    null
  );
  const fileInputRef = reactExports.useRef(null);
  const epochRef = reactExports.useRef(0);
  reactExports.useEffect(() => {
    let disposed = false;
    void ensureProjectFolderName(project.id).then((name) => {
      if (!disposed) setFolderName(name);
    });
    return () => {
      disposed = true;
    };
  }, [ensureProjectFolderName, project.id]);
  reactExports.useEffect(() => {
    if (!folderName) return;
    let disposed = false;
    void service.getAssetsDir(folderName).then((dir) => {
      if (!disposed) setAssetsDir(dir);
    });
    return () => {
      disposed = true;
    };
  }, [folderName, service]);
  const refresh = reactExports.useCallback(async () => {
    if (!folderName) return;
    const epoch = ++epochRef.current;
    setLoading(true);
    try {
      const [nextRecords, nextFolders] = await Promise.all([
        service.listAssets(folderName),
        service.listLocalFolders(folderName)
      ]);
      if (epoch !== epochRef.current) return;
      setRecords(nextRecords);
      setFolders(nextFolders);
      setSegments((previous) => {
        const existing = new Set(nextFolders);
        let keep = previous.length;
        while (keep > 0 && !existing.has(previous.slice(0, keep).join("/"))) keep -= 1;
        return keep === previous.length ? previous : previous.slice(0, keep);
      });
    } catch (err) {
      if (epoch === epochRef.current) {
        dedupedToast.error(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (epoch === epochRef.current) setLoading(false);
    }
  }, [folderName, service]);
  reactExports.useEffect(() => {
    void refresh();
  }, [refresh]);
  reactExports.useEffect(() => {
    if (!folderName) return;
    const subscription = service.onDidChangeAssets((event) => {
      if (event.projectFolderName === folderName) void refresh();
    });
    return () => subscription.dispose();
  }, [folderName, refresh, service]);
  const currentRel = segments.join("/");
  const nodes = reactExports.useMemo(
    () => deriveLocalNodes(records, folders, currentRel),
    [records, folders, currentRel]
  );
  const listState = useAssetsListState();
  reactExports.useEffect(() => {
    if (viewMode === "grid") listState.clearSelection();
  }, [listState.clearSelection, viewMode]);
  const searchQuery = listState.search.trim();
  const [searchRecords, setSearchRecords] = reactExports.useState([]);
  const [searchFolders, setSearchFolders] = reactExports.useState([]);
  const [searchLoading, setSearchLoading] = reactExports.useState(false);
  const searchEpochRef = reactExports.useRef(0);
  reactExports.useEffect(() => {
    const epoch = ++searchEpochRef.current;
    if (!folderName || !searchQuery) {
      setSearchRecords([]);
      setSearchFolders([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      void service.searchLocalAssets(folderName, searchQuery, currentRel).then((matchingRecords) => {
        if (epoch !== searchEpochRef.current) return;
        setSearchRecords(matchingRecords);
        setSearchFolders(
          folders.filter((relPath) => {
            const slash = relPath.lastIndexOf("/");
            const parent = slash === -1 ? "" : relPath.slice(0, slash);
            const name = slash === -1 ? relPath : relPath.slice(slash + 1);
            return parent === currentRel && name.toLowerCase().includes(searchQuery.toLowerCase());
          })
        );
      }).catch((err) => {
        if (epoch !== searchEpochRef.current) return;
        setSearchRecords([]);
        setSearchFolders([]);
        dedupedToast.error(err instanceof Error ? err.message : String(err));
      }).finally(() => {
        if (epoch === searchEpochRef.current) setSearchLoading(false);
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [currentRel, folderName, folders, searchQuery, service]);
  const listedNodes = reactExports.useMemo(
    () => searchQuery ? deriveLocalSearchNodes(records, searchRecords, searchFolders, currentRel) : nodes,
    [currentRel, nodes, records, searchFolders, searchQuery, searchRecords]
  );
  const {
    visibleItems: visibleNodes,
    hasMore,
    sentinelRef
  } = useWindowedList(
    listedNodes,
    LOCAL_ASSETS_PAGE_SIZE,
    `${folderName ?? ""}\0${currentRel}\0${searchQuery}`
  );
  const rowKeys = reactExports.useMemo(() => listedNodes.map((node) => nodeKey(node)), [listedNodes]);
  const fileRowKeys = reactExports.useMemo(() => fileKeysForSelection(listedNodes, nodeKey), [listedNodes]);
  const selectedNodes = reactExports.useMemo(
    () => listedNodes.filter((node) => listState.selection.has(nodeKey(node))),
    [listState.selection, listedNodes]
  );
  const actionTargetsFor = reactExports.useCallback(
    (node) => selectionTargetsForAction(node, listedNodes, listState.selection, nodeKey),
    [listState.selection, listedNodes]
  );
  const fileUrlFor = reactExports.useCallback(
    (node, width) => {
      if (!assetsDir || !node.record) return void 0;
      const url = gatewayUrl(API_PATHS.serveLocal(`${assetsDir}/${node.record.relPath}`));
      return width === void 0 ? url : withThumbnailWidth(url, width);
    },
    [assetsDir]
  );
  const handleImportPicked = reactExports.useCallback(
    async (files) => {
      if (!folderName || files.length === 0) return;
      if (await importPickedFiles({ service, folderName, folderSegments: segments, files, t })) {
        void refresh();
      }
    },
    [folderName, refresh, segments, service, t]
  );
  const handleCreateFolder = reactExports.useCallback(
    async (name) => {
      if (!folderName) return;
      await service.createLocalFolder(folderName, [...segments, name]);
      void refresh();
    },
    [folderName, refresh, segments, service]
  );
  const handleDelete = reactExports.useCallback(
    async (node) => {
      if (!folderName) return;
      if (node.kind === "folder") {
        await service.deleteLocalFolder(folderName, [...segments, node.name]);
      } else if (node.record) {
        await service.deleteLocalAsset(folderName, node.record.id);
      }
    },
    [folderName, segments, service]
  );
  const handleOpenFile = reactExports.useCallback(
    async (node) => {
      if (!folderName || !node.record) return;
      const absolute = await service.getAssetAbsolutePath(folderName, node.record.id);
      if (!absolute || !platform.shell.openPath) {
        dedupedToast.error(t("localAssets.openFailed", { name: node.name }));
        void refresh();
        return;
      }
      await platform.shell.openPath(absolute);
    },
    [folderName, platform.shell, refresh, service, t]
  );
  const handleReveal = reactExports.useCallback(
    async (node) => {
      if (!folderName) return;
      const absolute = node.kind === "folder" ? assetsDir && `${assetsDir}/${[...segments, node.name].join("/")}` : node.record && await service.getAssetAbsolutePath(folderName, node.record.id);
      if (!absolute || !platform.shell.showItemInFolder) {
        dedupedToast.error(t("localAssets.openFailed", { name: node.name }));
        void refresh();
        return;
      }
      await platform.shell.showItemInFolder(absolute);
    },
    [assetsDir, folderName, platform.shell, refresh, segments, service, t]
  );
  const handleRevealTargets = reactExports.useCallback(
    async (targets) => {
      if (targets.length === 0) return;
      if (targets.length === 1 && targets[0]) {
        await handleReveal(targets[0]);
        return;
      }
      if (!assetsDir || !platform.shell.openPath) {
        dedupedToast.error(t("localAssets.openFailed", { name: project.name }));
        return;
      }
      const parentRels = targets.map((node) => localNodeParentRel(node, currentRel));
      const sharedParent = parentRels.every((rel) => rel === parentRels[0]) ? parentRels[0] ?? currentRel : currentRel;
      await platform.shell.openPath(sharedParent ? `${assetsDir}/${sharedParent}` : assetsDir);
    },
    [assetsDir, currentRel, handleReveal, platform.shell, project.name, t]
  );
  const handleNodeClick = reactExports.useCallback(
    (node) => {
      if (node.kind === "folder") {
        setSegments((previous) => [...previous, node.name]);
        return;
      }
      const media = mediaKind(node);
      if (media && fileUrlFor(node)) {
        setPreview({ kind: media, node });
        return;
      }
      void handleOpenFile(node);
    },
    [fileUrlFor, handleOpenFile]
  );
  const handleRename = reactExports.useCallback(
    async (node, newName) => {
      if (!folderName) return;
      if (node.kind === "folder") {
        await service.renameLocalFolder(folderName, [...segments, node.name], newName);
      } else if (node.record) {
        await service.renameLocalAsset(folderName, node.record.id, newName);
      }
      void refresh();
    },
    [folderName, refresh, segments, service]
  );
  const handleMoveTargets = reactExports.useCallback(
    async (targets, target) => {
      if (!folderName) return;
      for (const node of compactLocalMoveTargets(targets, currentRel)) {
        try {
          if (node.kind === "folder") {
            await service.moveLocalFolder(
              folderName,
              localNodeRelPath(node, currentRel).split("/"),
              target.segments
            );
          } else if (node.record) {
            await service.moveLocalAsset(folderName, node.record.id, target.segments);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          dedupedToast.error(
            message.includes("duplicate_name") ? t("localAssets.moveDuplicate") : message.includes("depth_exceeded") ? t("localAssets.folderDepthLimit", {
              count: PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS
            }) : message
          );
        }
      }
      listState.clearSelection();
      void refresh();
    },
    [currentRel, folderName, listState, refresh, service, t]
  );
  const canDropNode = reactExports.useCallback(
    (node, target) => {
      if (target.key === currentRel) return false;
      if (node.kind === "folder") {
        const draggedRel = localNodeRelPath(node, currentRel);
        if (target.key === draggedRel || target.key.startsWith(`${draggedRel}/`)) return false;
      }
      return true;
    },
    [currentRel]
  );
  const canDropTargets = reactExports.useCallback(
    (targets, target) => targets.length > 0 && targets.every((node) => canDropNode(node, target)),
    [canDropNode]
  );
  const moveDnd = useMoveDnd({
    keyOf: (target) => target.key,
    canDrop: canDropTargets,
    onDrop: (targets, target) => void handleMoveTargets(targets, target)
  });
  const nodeDnd = reactExports.useCallback(
    (node) => {
      const folderKey = currentRel === "" ? node.name : `${currentRel}/${node.name}`;
      return {
        dndProps: {
          draggable: true,
          onDragStart: (event) => {
            const targets = actionTargetsFor(node);
            if (!listState.selection.has(nodeKey(node))) listState.selectOnly(nodeKey(node));
            moveDnd.startDrag(
              event,
              targets,
              targets.length > 1 ? t("projectAssets.selectedCount", { count: targets.length }) : void 0
            );
          },
          onDragEnd: moveDnd.endDrag,
          ...node.kind === "folder" ? moveDnd.targetProps({ key: folderKey, segments: [...segments, node.name] }) : moveDnd.blockerProps()
        },
        dropActive: node.kind === "folder" && moveDnd.overKey === folderKey
      };
    },
    [actionTargetsFor, currentRel, listState, moveDnd, segments, t]
  );
  const crumbTarget = reactExports.useCallback(
    (index) => {
      const crumbSegments = segments.slice(0, index + 1);
      return { key: crumbSegments.join("/"), segments: crumbSegments };
    },
    [segments]
  );
  const moveOptions = reactExports.useMemo(
    () => moveDialogTargets.filter((node) => node.kind === "folder").reduce(
      (options, node) => filterMoveOptions(options, localNodeRelPath(node, currentRel).split("/")),
      localFolderOptions(folders)
    ),
    [currentRel, folders, moveDialogTargets]
  );
  const moveNoopKey = reactExports.useMemo(() => {
    const parents = new Set(
      moveDialogTargets.map((node) => localNodeParentRel(node, currentRel) || ROOT_KEY)
    );
    return parents.size === 1 ? [...parents][0] : void 0;
  }, [currentRel, moveDialogTargets]);
  const writePolicy = getProjectAssetWritePolicy(segments.length);
  const folderDepthMessage = !writePolicy.canCreateFolder ? writePolicy.canCreateFile ? t("projectAssets.folderDepthReached", {
    count: PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS
  }) : t("projectAssets.depthExceeded") : void 0;
  const fileDepthMessage = !writePolicy.canCreateFile ? t("projectAssets.depthExceeded") : void 0;
  const isRootEmpty = segments.length === 0 && nodes.length === 0 && !loading;
  reactExports.useEffect(() => {
    if (listState.selection.size === 0) return;
    const visible = new Set(rowKeys);
    for (const key of listState.selection) {
      if (!visible.has(key)) {
        listState.clearSelection();
        return;
      }
    }
  }, [rowKeys, listState]);
  const openBatchDelete = reactExports.useCallback(() => {
    if (selectedNodes.length > 0) setBatchDeleteTargets(selectedNodes);
  }, [selectedNodes]);
  const handleContextMenu = reactExports.useCallback(
    (node) => {
      const key = nodeKey(node);
      if (!listState.selection.has(key)) listState.selectOnly(key);
    },
    [listState]
  );
  const allSelected = fileRowKeys.length > 0 && fileRowKeys.every((key) => listState.selection.has(key));
  const someSelected = fileRowKeys.some((key) => listState.selection.has(key));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "no-drag flex min-h-0 flex-1 flex-col gap-3",
      "data-action-ui-id": "local-assets.panel",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-stretch gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              disabled: !folderName || !writePolicy.canCreateFolder,
              title: folderDepthMessage,
              onClick: () => setNewFolderOpen(true),
              "data-action-ui-id": "local-assets.new-folder",
              className: "group flex h-[64px] min-w-0 flex-1 items-center gap-3.5 rounded-lg border border-border/70 bg-card px-4 text-left transition-colors duration-150 hover:border-border hover:bg-foreground/[0.02] dark:hover:bg-foreground/[0.06] focus-visible:border-ring/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-10 shrink-0 items-center justify-center rounded-md bg-foreground/[0.03] text-foreground/80 transition-colors group-hover:bg-foreground/[0.05] dark:bg-foreground/[0.06] dark:group-hover:bg-foreground/[0.1] group-hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FolderPlus, { size: 18, strokeWidth: 1.75, "aria-hidden": "true" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 flex-col gap-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[13px] leading-none text-foreground", children: t("localAssets.newFolder") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[11px] leading-none text-muted-foreground", children: folderDepthMessage ?? t("projectAssets.createFolderHint") })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              disabled: !folderName || !writePolicy.canCreateFile,
              title: fileDepthMessage,
              onClick: () => fileInputRef.current?.click(),
              "data-action-ui-id": "local-assets.upload",
              className: "group flex h-[64px] min-w-0 flex-1 items-center gap-3.5 rounded-lg border border-border/70 bg-card px-4 text-left transition-colors duration-150 hover:border-border hover:bg-foreground/[0.02] dark:hover:bg-foreground/[0.06] focus-visible:border-ring/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-10 shrink-0 items-center justify-center rounded-md bg-foreground/[0.03] text-foreground/80 transition-colors group-hover:bg-foreground/[0.05] dark:bg-foreground/[0.06] dark:group-hover:bg-foreground/[0.1] group-hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { size: 18, strokeWidth: 1.75, "aria-hidden": "true" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 flex-col gap-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[13px] leading-none text-foreground", children: t("localAssets.upload") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[11px] leading-none text-muted-foreground", children: fileDepthMessage ?? t("projectAssets.batchUploadHint") })
                ] })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            ref: fileInputRef,
            type: "file",
            multiple: true,
            className: "hidden",
            onChange: (event) => {
              const files = [...event.target.files ?? []];
              event.target.value = "";
              void handleImportPicked(files);
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          AssetsHeader,
          {
            state: listState,
            viewMode,
            setViewMode,
            actionIdPrefix: "local-assets",
            breadcrumb: (
              // Always show the "全部文件" root crumb, even at an empty root, so
              // users always see where uploads will land.
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Breadcrumb,
                {
                  segments,
                  onCrumb: (index) => {
                    if (index < 0) {
                      setSegments([]);
                      return;
                    }
                    setSegments((previous) => previous.slice(0, index + 1));
                  },
                  crumbDnd: (index) => moveDnd.targetProps(crumbTarget(index)),
                  crumbDropActive: (index) => moveDnd.overKey === crumbTarget(index).key
                }
              )
            ),
            rightMeta: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "ghost",
                size: "icon-sm",
                "aria-label": t("localAssets.refresh"),
                onClick: () => void refresh(),
                "data-action-ui-id": "local-assets.refresh",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(RetryIcon, { size: 15, className: cn(loading && "animate-spin") })
              }
            )
          }
        ) }),
        loading && nodes.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(AssetsListSkeleton, {}) : searchQuery && searchLoading && listedNodes.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(AssetsListSkeleton, {}) : isRootEmpty && !searchQuery ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          AssetsDropzoneEmpty,
          {
            disabled: !folderName || !writePolicy.canCreateFile,
            onOpenPicker: () => fileInputRef.current?.click(),
            onPickFiles: (files) => void handleImportPicked(files)
          }
        ) : nodes.length === 0 && !searchQuery ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          AssetsEmptyState,
          {
            variant: "default",
            title: t("localAssets.emptyFolderTitle", "当前文件夹暂无资产"),
            cta: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                size: "sm",
                onClick: () => fileInputRef.current?.click(),
                disabled: !folderName || !writePolicy.canCreateFile,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { size: 14, strokeWidth: 1.5, "data-icon": "inline-start" }),
                  t("localAssets.upload")
                ]
              }
            )
          }
        ) : visibleNodes.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(AssetsEmptyState, { variant: "search" }) : viewMode === "grid" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4", children: visibleNodes.map((node) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          NodeCard,
          {
            node,
            thumbSrc: fileUrlFor(node, 480),
            onOpen: handleNodeClick,
            onOpenFile: handleOpenFile,
            onReveal: handleReveal,
            onRename: setRenameTarget,
            onMove: (target) => setMoveDialogTargets([target]),
            onDelete: setDeleteTarget,
            ...nodeDnd(node)
          },
          nodeKey(node)
        )) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-col", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            AssetsSelectionBar,
            {
              count: listState.selection.size,
              onClear: listState.clearSelection,
              allSelected,
              someSelected,
              onToggleAll: () => listState.toggleAll(fileRowKeys, { preserveOtherSelection: true }),
              onDelete: openBatchDelete,
              actionIdPrefix: "local-assets"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-9 items-center gap-2 border-y border-border/70 px-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1", children: t("localAssets.columnName", "名称") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-24 shrink-0 text-right", children: t("localAssets.columnSize", "大小") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-28 shrink-0 text-right", children: t("localAssets.columnModified", "更新时间") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-12 shrink-0", "aria-hidden": "true" })
          ] }),
          visibleNodes.map((node) => {
            const key = nodeKey(node);
            return /* @__PURE__ */ jsxRuntimeExports.jsx(
              NodeRow,
              {
                node,
                thumbSrc: fileUrlFor(node, 48),
                selected: listState.selection.has(key),
                onToggleSelect: (event) => {
                  if (event.shiftKey) {
                    listState.toggleRange(rowKeys, key);
                  } else {
                    listState.toggle(key);
                  }
                },
                onOpen: handleNodeClick,
                onOpenFile: handleOpenFile,
                onReveal: handleReveal,
                onRename: setRenameTarget,
                onMove: (target) => setMoveDialogTargets([target]),
                onDelete: setDeleteTarget,
                actionTargets: actionTargetsFor(node),
                onContextMenu: handleContextMenu,
                onRevealTargets: (targets) => void handleRevealTargets(targets),
                onMoveTargets: (targets) => setMoveDialogTargets([...targets]),
                onDeleteTargets: (targets) => setBatchDeleteTargets([...targets]),
                ...nodeDnd(node)
              },
              key
            );
          })
        ] }),
        hasMore ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            ref: sentinelRef,
            "aria-hidden": "true",
            className: "h-px",
            "data-action-ui-id": "local-assets.load-more-sentinel"
          }
        ) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          NewLocalFolderDialog,
          {
            open: newFolderOpen,
            onOpenChange: setNewFolderOpen,
            onCreate: handleCreateFolder
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          RenameLocalNodeDialog,
          {
            node: renameTarget,
            onOpenChange: (open) => {
              if (!open) setRenameTarget(null);
            },
            onRename: handleRename
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DeleteLocalNodeDialog,
          {
            node: deleteTarget,
            batchNodes: batchDeleteTargets,
            onOpenChange: (open) => {
              if (!open) {
                setDeleteTarget(null);
                setBatchDeleteTargets([]);
              }
            },
            onConfirm: handleDelete,
            onCompleted: () => {
              listState.clearSelection();
              void refresh();
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          MoveNodeDialog,
          {
            open: moveDialogTargets.length > 0,
            name: moveDialogTargets[0]?.name ?? "",
            itemCount: moveDialogTargets.length,
            options: moveOptions,
            noopKey: moveNoopKey,
            onOpenChange: (open) => {
              if (!open) setMoveDialogTargets([]);
            },
            onConfirm: async (destination) => {
              if (moveDialogTargets.length === 0) return;
              await handleMoveTargets(moveDialogTargets, {
                key: destination.key === ROOT_KEY ? "" : destination.key,
                segments: destination.segments
              });
            }
          }
        ),
        preview ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          MediaLightbox,
          {
            kind: preview.kind,
            src: fileUrlFor(preview.node) ?? "",
            alt: preview.node.name,
            onClose: () => setPreview(null)
          }
        ) : null
      ]
    }
  );
}
function relParent(relPath) {
  const idx = relPath.lastIndexOf("/");
  return idx === -1 ? "" : relPath.slice(0, idx);
}
function localNodeRelPath(node, currentRel) {
  if (node.kind === "file" && node.record) return node.record.relPath;
  return currentRel === "" ? node.name : `${currentRel}/${node.name}`;
}
function localNodeParentRel(node, currentRel) {
  return relParent(localNodeRelPath(node, currentRel));
}
function compactLocalMoveTargets(targets, currentRel) {
  const folderPaths = targets.filter((node) => node.kind === "folder").map((node) => localNodeRelPath(node, currentRel));
  return targets.filter((node) => {
    const relPath = localNodeRelPath(node, currentRel);
    return !folderPaths.some(
      (folderPath) => folderPath !== relPath && relPath.startsWith(`${folderPath}/`)
    );
  });
}
function deriveLocalNodes(records, folders, currentRel) {
  const prefix = currentRel === "" ? "" : `${currentRel}/`;
  const folderNodes = folders.filter((rel) => relParent(rel) === currentRel).map((rel) => {
    const childRecords = records.filter((record) => record.relPath.startsWith(`${rel}/`));
    let folderUpdatedAt = 0;
    for (const record of childRecords) {
      const ts = record.updatedAt ?? record.createdAt ?? 0;
      if (ts > folderUpdatedAt) folderUpdatedAt = ts;
    }
    return {
      kind: "folder",
      name: rel.slice(prefix.length),
      fileCount: childRecords.length,
      folderUpdatedAt
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
  const fileNodes = records.filter((record) => relParent(record.relPath) === currentRel).sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt)).map((record) => ({ kind: "file", name: record.name, record }));
  return [...folderNodes, ...fileNodes];
}
function deriveLocalSearchNodes(allRecords, matchingRecords, matchingFolders, currentRel) {
  const prefix = currentRel === "" ? "" : `${currentRel}/`;
  const folderNodes = matchingFolders.map((rel) => {
    const childRecords = allRecords.filter((record) => record.relPath.startsWith(`${rel}/`));
    let folderUpdatedAt = 0;
    for (const record of childRecords) {
      const ts = record.updatedAt ?? record.createdAt ?? 0;
      if (ts > folderUpdatedAt) folderUpdatedAt = ts;
    }
    return {
      kind: "folder",
      name: rel.slice(prefix.length),
      fileCount: childRecords.length,
      folderUpdatedAt
    };
  });
  return [
    ...folderNodes,
    ...matchingRecords.map((record) => ({
      kind: "file",
      name: record.name,
      record
    }))
  ];
}
function nodeKey(node) {
  return node.kind === "folder" ? `folder:${node.name}` : `file:${node.record?.id ?? node.name}`;
}
function Breadcrumb({
  segments,
  onCrumb,
  crumbDnd,
  crumbDropActive
}) {
  const { t } = useTranslation();
  const rootLabel = t("localAssets.breadcrumbRoot", { defaultValue: "全部文件" });
  const items = [
    { index: -1, name: rootLabel, isCurrent: segments.length === 0 },
    ...segments.map((name, i) => ({
      index: i,
      name,
      isCurrent: i === segments.length - 1
    }))
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "flex min-w-0 items-center gap-0.5 text-[14px]",
      "data-action-ui-id": "local-assets.breadcrumb",
      children: items.map((item, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-0.5", children: [
        i > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          ChevronRight,
          {
            size: 13,
            strokeWidth: 1,
            className: "shrink-0 text-muted-foreground/60",
            "aria-hidden": "true"
          }
        ) : null,
        item.isCurrent ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "max-w-40 truncate rounded-md px-1.5 py-0.5 text-foreground",
            "data-current": "true",
            children: item.name
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => onCrumb(item.index),
            ...crumbDnd?.(item.index),
            className: cn(
              "max-w-40 truncate rounded-md px-1.5 py-0.5 transition-colors text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
              crumbDropActive?.(item.index) && "bg-primary/10 text-foreground"
            ),
            children: item.name
          }
        )
      ] }, `${item.index}:${item.name}`))
    }
  );
}
function mediaKind(node) {
  if (node.kind !== "file") return void 0;
  const mime = node.record?.mime ?? "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  const ext = node.name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  return void 0;
}
function NodeMenu({
  node,
  onOpenFile,
  onReveal,
  onRename,
  onMove,
  onDelete,
  className
}) {
  const { t } = useTranslation();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DropdownMenuTrigger,
      {
        "aria-label": t("localAssets.moreActions"),
        "data-action-ui-id": "local-assets.node-menu",
        className: cn(
          "flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className
        ),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(MoreVerticalIcon, { size: 14 })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionDropdownMenuContent, { align: "end", side: "bottom", sideOffset: 2, children: [
      node.kind === "file" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionDropdownMenuItem, { onClick: () => onOpenFile(node), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { size: 14, strokeWidth: 1.5 }),
        t("localAssets.open")
      ] }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionDropdownMenuItem, { onClick: () => onReveal(node), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { size: 14, strokeWidth: 1.5 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(PlatformFileManagerLabel, {})
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionDropdownMenuItem, { onClick: () => onRename(node), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(PencilIcon, { size: 14, strokeWidth: 1.5 }),
        t("localAssets.rename")
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionDropdownMenuItem, { onClick: () => onMove(node), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FolderInput, { size: 14, strokeWidth: 1.5 }),
        t("localAssets.moveTo")
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionDropdownMenuItem, { variant: "destructive", onClick: () => onDelete(node), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 14, strokeWidth: 1.5 }),
        t("localAssets.delete")
      ] })
    ] })
  ] });
}
function NodeContextMenuContent({
  node,
  onOpenFile,
  onReveal,
  onRename,
  onMove,
  onDelete,
  actionTargets,
  onRevealTargets,
  onMoveTargets,
  onDeleteTargets
}) {
  const { t } = useTranslation();
  const targets = actionTargets?.length ? actionTargets : [node];
  const isBatch = targets.length > 1;
  const handleRevealAction = () => {
    if (onRevealTargets) onRevealTargets(isBatch ? targets : [node]);
    else onReveal(node);
  };
  const handleMoveAction = () => {
    if (onMoveTargets) onMoveTargets(isBatch ? targets : [node]);
    else onMove(node);
  };
  const handleDeleteAction = () => {
    if (onDeleteTargets) onDeleteTargets(isBatch ? targets : [node]);
    else onDelete(node);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionContextMenuContent, { "data-action-ui-id": "local-assets.node-context-menu", children: [
    !isBatch && node.kind === "file" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionContextMenuItem, { onClick: () => onOpenFile(node), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { size: 14, strokeWidth: 1.5 }),
      t("localAssets.open")
    ] }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionContextMenuItem, { onClick: handleRevealAction, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { size: 14, strokeWidth: 1.5 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(PlatformFileManagerLabel, {})
    ] }),
    !isBatch ? /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionContextMenuItem, { onClick: () => onRename(node), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PencilIcon, { size: 14, strokeWidth: 1.5 }),
      t("localAssets.rename")
    ] }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionContextMenuItem, { onClick: handleMoveAction, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(FolderInput, { size: 14, strokeWidth: 1.5 }),
      isBatch ? t("projectAssets.batchMove") : t("localAssets.moveTo")
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionContextMenuItem, { variant: "destructive", onClick: handleDeleteAction, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 14, strokeWidth: 1.5 }),
      isBatch ? t("projectAssets.batchDelete") : t("localAssets.delete")
    ] })
  ] });
}
function nodeMeta(node, t) {
  return node.kind === "folder" ? t("localAssets.folderMeta", { count: node.fileCount ?? 0 }) : formatBytes(node.record?.size ?? 0);
}
function nodeUpdatedAt(node, language) {
  let ts;
  if (node.kind === "file" && node.record) {
    ts = node.record.updatedAt ?? node.record.createdAt;
  } else if (node.kind === "folder" && node.folderUpdatedAt && node.folderUpdatedAt > 0) {
    ts = node.folderUpdatedAt;
  }
  if (!ts) return void 0;
  const date = new Date(ts);
  if (language.startsWith("zh")) {
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function NodeCard({
  node,
  thumbSrc,
  onOpen,
  onOpenFile,
  onReveal,
  onRename,
  onMove,
  onDelete,
  dndProps,
  dropActive
}) {
  const { t } = useTranslation();
  const typeBucket = resolveTypeBucket({
    kind: node.kind,
    name: node.name,
    mime: node.record?.mime
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ContextMenu, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ContextMenuTrigger,
      {
        render: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            ...dndProps,
            className: cn(
              "group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-colors duration-[80ms] hover:border-foreground/40",
              dropActive && "border-primary bg-primary/5"
            ),
            "data-action-ui-id": "local-assets.node-card",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => onOpen(node),
                  className: "flex w-full flex-col text-left",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      ProjectAssetThumbnail,
                      {
                        name: node.name,
                        kind: node.kind,
                        typeBucket,
                        thumbnailSrc: thumbSrc,
                        variant: "grid"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex w-full flex-col gap-0.5 p-3 pr-9", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[13px] text-foreground", children: node.name }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[12px] text-muted-foreground", children: nodeMeta(node, t) })
                    ] })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-2 right-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                NodeMenu,
                {
                  node,
                  onOpenFile,
                  onReveal,
                  onRename,
                  onMove,
                  onDelete
                }
              ) })
            ]
          }
        )
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      NodeContextMenuContent,
      {
        node,
        onOpenFile,
        onReveal,
        onRename,
        onMove,
        onDelete
      }
    )
  ] });
}
function NodeRow({
  node,
  thumbSrc,
  selected,
  onToggleSelect,
  onOpen,
  onOpenFile,
  onReveal,
  onRename,
  onMove,
  onDelete,
  actionTargets,
  onContextMenu,
  onRevealTargets,
  onMoveTargets,
  onDeleteTargets,
  dndProps,
  dropActive
}) {
  const { t, i18n } = useTranslation();
  const typeBucket = resolveTypeBucket({
    kind: node.kind,
    name: node.name,
    mime: node.record?.mime
  });
  const updatedAt = nodeUpdatedAt(node, i18n.language);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ContextMenu, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ContextMenuTrigger,
      {
        onContextMenu: () => onContextMenu?.(node),
        render: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            ...dndProps,
            className: cn(
              "group/row relative h-11 w-full border-b border-border/60",
              dropActive && "rounded-md bg-primary/10",
              selected && "bg-foreground/[0.04]"
            ),
            "data-action-ui-id": "local-assets.node-row",
            children: [
              onToggleSelect ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute -left-6 top-1/2 flex -translate-y-1/2 items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                AssetsRowCheckbox,
                {
                  selected: selected ?? false,
                  onToggle: onToggleSelect,
                  ariaLabel: t("projectAssets.selectRow"),
                  actionUiId: "local-assets.row-select"
                }
              ) }) : null,
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => onOpen(node),
                  className: "flex h-full w-full items-center gap-2 px-3 pr-14 text-left transition-colors hover:bg-foreground/[0.04]",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      ProjectAssetThumbnail,
                      {
                        name: node.name,
                        kind: node.kind,
                        typeBucket,
                        thumbnailSrc: thumbSrc,
                        variant: "list"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex min-w-0 flex-1 flex-col gap-0.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate text-[13px] text-foreground", children: node.name }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-24 shrink-0 text-right text-[12px] text-muted-foreground", children: node.kind === "folder" ? "—" : formatBytes(node.record?.size ?? 0) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-28 shrink-0 text-right text-[12px] text-muted-foreground", children: updatedAt ?? "—" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute right-2 top-1/2 -translate-y-1/2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                NodeMenu,
                {
                  node,
                  onOpenFile,
                  onReveal,
                  onRename,
                  onMove,
                  onDelete
                }
              ) })
            ]
          }
        )
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      NodeContextMenuContent,
      {
        node,
        onOpenFile,
        onReveal,
        onRename,
        onMove,
        onDelete,
        actionTargets,
        onRevealTargets,
        onMoveTargets,
        onDeleteTargets
      }
    )
  ] });
}
function ProjectMemberSummaryPopover({
  project,
  members,
  canManageMembers
}) {
  const { t } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  if (members.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TooltipTrigger,
        {
          render: /* @__PURE__ */ jsxRuntimeExports.jsx(
            PopoverTrigger,
            {
              render: /* @__PURE__ */ jsxRuntimeExports.jsx(
                ProjectMemberSummary,
                {
                  members,
                  ariaLabel: t("project.invite.membersTitle", { name: project.name })
                }
              )
            }
          )
        }
      ),
      open ? null : /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { side: "bottom", children: t(
        canManageMembers ? "project.invite.viewMembers" : "project.invite.viewMembersOnly"
      ) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PopoverContent,
      {
        align: "end",
        sideOffset: 8,
        className: "w-[320px] gap-3 p-3",
        "data-action-ui-id": "project-detail.members-popover",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          InviteProjectPanel,
          {
            project,
            canManageMembers,
            refreshKey: open,
            hideAccessBanner: true,
            hideInviteCta: true
          }
        )
      }
    )
  ] });
}
const CREATIONS_PAGE_SIZE = 100;
function ProjectDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const platform = usePlatform();
  const { projectId } = useParams({ from: "/_home/projects/$projectId" });
  const { tab: tabAnchor } = useSearch({ from: "/_home/projects/$projectId" });
  const project = useProject(projectId);
  const { entries } = useTopbarState();
  const [recentWorkspaces] = useStorage("global.recentWorkspaces");
  const [activeTab, setActiveTab] = reactExports.useState("creations");
  const [inviteOpen, setInviteOpen] = reactExports.useState(false);
  const [isProjectOwner, setIsProjectOwner] = reactExports.useState(false);
  const { guard: loginGuard, LoginDialog } = useLoginGuard();
  const { addWorkspaceToProject, syncCloudProjects } = useProjectActions();
  const navigateToWorkspace = useNavigateToWorkspace();
  useRecentWorkspacesRefresh();
  const remoteId = project?.remoteId;
  const isCloudProject = project?.kind === "team" && !!remoteId;
  const { data: projectMembers = [] } = useProjectMembers(isCloudProject ? remoteId : void 0);
  reactExports.useEffect(() => {
    setIsProjectOwner(false);
    if (!isCloudProject) return;
    let cancelled = false;
    void syncCloudProjects().then((cloudProjects) => {
      if (cancelled || !cloudProjects) return;
      const cloud = cloudProjects.find((item) => item.id === remoteId);
      setIsProjectOwner(cloud?.myRole === MemberRole.MEMBER_ROLE_CREATOR);
    });
    return () => {
      cancelled = true;
    };
  }, [isCloudProject, remoteId, syncCloudProjects]);
  reactExports.useEffect(() => {
    if (project) return;
    projectLog.warn("project-detail redirect: project missing", { projectId });
    void navigate(projectListLocation("local"));
  }, [navigate, project, projectId]);
  const caseInsensitive = isWorkspacePathCaseInsensitivePlatform(platform.app.os);
  const inventory = reactExports.useMemo(
    () => mergeWorkspaceInventory(recentWorkspaces, entries, { caseInsensitive }),
    [caseInsensitive, entries, recentWorkspaces]
  );
  const projectWorkspaces = reactExports.useMemo(
    () => selectProjectWorkspaces(inventory, project, caseInsensitive),
    [caseInsensitive, inventory, project]
  );
  const {
    visibleItems: visibleWorkspaces,
    hasMore: hasMoreWorkspaces,
    sentinelRef
  } = useWindowedList(projectWorkspaces, CREATIONS_PAGE_SIZE, projectId);
  const workspaceEntries = reactExports.useMemo(
    () => visibleWorkspaces.map((item) => item.workspace),
    [visibleWorkspaces]
  );
  const unavailablePaths = useWorkspaceAvailability(workspaceEntries);
  const handleCreateWorkspace = reactExports.useCallback(
    async (name, options) => {
      if (!loginGuard()) return;
      const result = await homeService.hiloApp.createWorkspaceWithResult({
        name,
        projectId: options.projectId,
        parentFolderPath: options.parentFolderPath,
        loadUserMemory: options.loadUserMemory,
        allowDataDirectoryFallback: options.allowDataDirectoryFallback
      }).catch(() => null);
      if (!result) return;
      const runtime = workspaceRuntimeFromOpenResult(result);
      if (options.projectId && runtime?.folderPath) {
        await addWorkspaceToProject(runtime.folderPath, options.projectId, "project-detail-create");
      }
      const opened = handleNewWorkspaceOpenResult(result, t, navigateToWorkspace);
      if (opened) trackEvent(TRACK_EVENTS.WORKSPACE_OPEN, { source: "project_detail_new" });
    },
    [addWorkspaceToProject, loginGuard, navigateToWorkspace, t]
  );
  const { requestOpenForProject, dialog: newWorkspaceDialog } = useNewWorkspaceDialog(handleCreateWorkspace);
  const requestNewWorkspace = reactExports.useCallback(
    () => requestOpenForProject(projectId),
    [projectId, requestOpenForProject]
  );
  const tabs = reactExports.useMemo(() => visibleProjectDetailTabs(project?.kind ?? "local"), [project?.kind]);
  reactExports.useEffect(() => {
    if (!tabAnchor) return;
    const target = tabs.find((tab) => tab.key === tabAnchor && !tab.comingSoon);
    if (target) setActiveTab(target.key);
  }, [tabAnchor, tabs]);
  if (!project) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--home-content-surface)]", children: [
    LoginDialog,
    newWorkspaceDialog,
    project.kind === "team" && project.remoteId ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      InviteProjectDialog,
      {
        project,
        open: inviteOpen,
        canManageMembers: isProjectOwner,
        onOpenChange: setInviteOpen
      }
    ) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex shrink-0 items-center gap-2 bg-[color:color-mix(in_srgb,var(--foreground)_2%,var(--background))] px-8 pt-[14px] pb-2.5 md:px-12",
        "data-action-ui-id": "project-detail.breadcrumb",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => void navigate(projectListLocation(project.kind)),
              className: "group flex h-8 items-center rounded-lg text-[14px] text-muted-foreground transition-colors hover:text-foreground",
              "data-action-ui-id": "project-detail.breadcrumb-root",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    "aria-hidden": "true",
                    className: "flex w-0 items-center overflow-hidden opacity-0 transition-all duration-150 group-hover:mr-1.5 group-hover:w-4 group-hover:opacity-100",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { size: 14, strokeWidth: 1.5 })
                  }
                ),
                t("project.listTitle")
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            ChevronRight,
            {
              size: 14,
              strokeWidth: 1.5,
              className: "shrink-0 text-muted-foreground/40",
              "aria-hidden": "true"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "min-w-0 truncate translate-y-px text-[14px] font-semibold leading-none text-foreground",
              "data-action-ui-id": "project-detail.breadcrumb-current",
              children: project.name
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex shrink-0 -translate-y-0.5 items-center gap-2", children: [
            isCloudProject && projectMembers.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              ProjectMemberSummaryPopover,
              {
                project,
                members: projectMembers,
                canManageMembers: isProjectOwner
              }
            ) : null,
            project.kind === "team" && project.remoteId && isProjectOwner ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => setInviteOpen(true),
                className: "flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-foreground/[0.05]",
                "data-action-ui-id": "project-detail.invite",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(UserRoundPlus, { size: 14, strokeWidth: 1.5, "aria-hidden": "true" }),
                  t("project.invite.button")
                ]
              }
            ) : null
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 flex h-14 shrink-0 items-center justify-between gap-3 px-8 md:px-12", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Tabs,
        {
          value: activeTab,
          onValueChange: (value) => {
            if (tabs.some((tab) => tab.key === value && !tab.comingSoon)) {
              setActiveTab(value);
            }
          },
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TabsList,
            {
              variant: "underline",
              className: "gap-5",
              "aria-label": t("project.tabsAria"),
              "data-action-ui-id": "project-detail.tabs",
              children: tabs.map((tab) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                ProjectDetailTab,
                {
                  value: tab.key,
                  disabled: tab.comingSoon,
                  label: t(tab.labelKey),
                  info: tab.comingSoon && tab.comingSoonInfoKey ? t(tab.comingSoonInfoKey) : tab.infoKey ? t(tab.infoKey) : void 0,
                  comingSoonLabel: tab.comingSoon && !tab.comingSoonInfoKey ? t("project.comingSoon") : void 0
                },
                tab.key
              ))
            }
          )
        }
      ),
      activeTab === "creations" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: requestNewWorkspace,
          className: "flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-3 text-[13px] font-medium text-background transition-opacity hover:opacity-90",
          "data-action-ui-id": "project-detail.new-creation",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 14, strokeWidth: 1.5, "aria-hidden": "true" }),
            t("project.newCreation")
          ]
        }
      ) : null
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-0 flex-1 flex-col overflow-y-auto px-8 pt-0 pb-8 md:px-12", children: activeTab === "creations" ? projectWorkspaces.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      PageStateBoundary,
      {
        empty: true,
        className: "min-h-80",
        emptyOptions: {
          reason: "project",
          title: t("project.creationsEmpty"),
          description: t("project.creationsEmptyDescription")
        }
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4", children: visibleWorkspaces.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        WorkspaceCard,
        {
          workspace: item.workspace,
          unavailable: unavailablePaths.has(item.workspace.path),
          hideDelete: true
        },
        item.authoritativeEntry?.workspaceId ?? item.workspace.path
      )) }),
      hasMoreWorkspaces ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          ref: sentinelRef,
          "aria-hidden": "true",
          className: "h-px",
          "data-action-ui-id": "project-detail.creations-load-more-sentinel"
        }
      ) : null
    ] }) : activeTab === "cloudAssets" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CloudAssetsPanel, { project }) : activeTab === "localAssets" ? /* @__PURE__ */ jsxRuntimeExports.jsx(LocalAssetsPanel, { project }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "pt-8 text-center text-[13px] text-muted-foreground", children: t("project.comingSoonBody") }) })
  ] });
}
function ProjectDetailTab({
  value,
  disabled,
  label,
  info,
  comingSoonLabel
}) {
  const tabButton = /* @__PURE__ */ jsxRuntimeExports.jsxs(
    TabsTrigger,
    {
      value,
      variant: "underline",
      disabled,
      className: "gap-1 disabled:cursor-not-allowed disabled:text-muted-foreground/50",
      "data-action-ui-id": "project-detail.tab",
      children: [
        label,
        info ? /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { size: 14, strokeWidth: 2.25, className: "shrink-0 opacity-60" }) : null
      ]
    }
  );
  const tooltip = comingSoonLabel ? [info, comingSoonLabel].filter(Boolean).join(" · ") : info;
  if (!tooltip) return tabButton;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { render: tabButton }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { side: "bottom", className: "max-w-64", children: tooltip })
  ] }) });
}
const SplitComponent = ProjectDetailPage;
export {
  SplitComponent as component
};
