// 邀请成员：邀请面板、成员行与邀请弹窗。
import { createProjectOperationId, logProjectOperationAttempt, logProjectOperationSuccess, logProjectOperationFailure, removeProjectMember, cloudErrorDisplayMessage, createProjectInviteLink } from "../workspace/asset-lineage-query-key.js";
import { useTranslation, useQueryClient, reactExports, jsxRuntimeExports, BadgeInfo, Check, Link2, ChevronDown } from "../vendor.js";
import { useRuntimeConfig } from "../generation/use-model-catalog-scope-key.js";
import { useAuth } from "../assets/credit-query-keys.jsx";
import { dedupedToast } from "../infra/agent-http-client.js";
import { buildProjectInviteWebLink } from "../infra/schedule.js";
import { Users, Clock, Trash2 } from "../media-editing/package.jsx";
import { Button, cn$2 as cn, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Dialog, DialogContent, DialogHeader } from "../infra/dialog-content.jsx";
import { MemberRole } from "../generation/normalize-skill-detail-metadata.js";
import { Avatar, AvatarImage, AvatarFallback } from "../infra/inline-rename-input.jsx";
import { DropdownMenu } from "../vendor-inline/vscode-base/graph.jsx";
import { DialogTitle } from "../infra/badge-variants.jsx";
import { memberAvatarColors } from "../projects/project-member-summary.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { projectMembersQueryKey, useProjectMembers } from "./use-project-members.js";
export function InviteProjectPanel({
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
  hideInviteCta = false,
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const runtimeConfig = useRuntimeConfig();
  const { user } = useAuth();
  const cloudProjectId = project.remoteId ?? "";
  const {
    data: members = [],
    isError: membersError,
    refetch: refreshMembers,
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
        memberId: member.userId,
      });
      try {
        await removeProjectMember(cloudProjectId, member.userId);
        logProjectOperationSuccess("remove-project-member", operationId, startedAt, {
          remoteId: cloudProjectId,
          memberId: member.userId,
        });
        queryClient.setQueryData(
          projectMembersQueryKey(cloudProjectId),
          (previous) => previous?.filter((item) => item.userId !== member.userId) ?? [],
        );
      } catch (err) {
        logProjectOperationFailure(
          "remove-project-member",
          operationId,
          startedAt,
          "cloud-remove-member",
          err,
          {
            remoteId: cloudProjectId,
            memberId: member.userId,
          },
        );
        dedupedToast.error(cloudErrorDisplayMessage(err) ?? t("project.invite.removeFailed"));
      }
      void queryClient.invalidateQueries({
        queryKey: projectMembersQueryKey(cloudProjectId),
      });
    },
    [cloudProjectId, queryClient, t],
  );
  const handleCopyLink = reactExports.useCallback(async () => {
    if (copyState === "busy") return;
    const operationId = createProjectOperationId("copy-project-invite-link");
    const startedAt = logProjectOperationAttempt("copy-project-invite-link", operationId, {
      remoteId: cloudProjectId,
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
        memberCount: members.length,
      });
      stage = "clipboard-write";
      await navigator.clipboard.writeText(link);
      logProjectOperationSuccess("copy-project-invite-link", operationId, startedAt, {
        remoteId: cloudProjectId,
      });
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2e3);
    } catch (err) {
      logProjectOperationFailure("copy-project-invite-link", operationId, startedAt, stage, err, {
        remoteId: cloudProjectId,
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
    user?.username,
  ]);
  return (
    <>
      {hideAccessBanner ? null : (
        <div className="flex items-start gap-2.5 rounded-lg bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
          <BadgeInfo className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
          <p>
            {t("project.invite.accessDescription", {
              defaultValue: "仅受邀成员可访问该项目及其中的资产",
            })}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 px-1 text-[13px] font-medium text-muted-foreground">
          <Users size={12} strokeWidth={1.75} aria-hidden="true" />
          <span>
            {t("project.invite.membersLabel", {
              defaultValue: "成员",
            })}
          </span>
          {members.some((m) => m.userId !== user?.userID) ? (
            <span className="ml-auto text-[11px] tabular-nums">
              {t("project.invite.membersTotal", {
                count: members.length,
                defaultValue: "{{count}} 名",
              })}
            </span>
          ) : null}
        </div>
        <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto rounded-lg bg-muted/60 p-1.5">
          {membersError ? (
            <div className="flex items-center justify-between gap-2 rounded-md bg-card px-3 py-2.5">
              <p className="text-xs text-muted-foreground">{t("project.invite.membersFailed")}</p>
              <Button variant="outline" size="xs" onClick={() => void refreshMembers()}>
                {t("common.retry")}
              </Button>
            </div>
          ) : (
            members.map((member) => (
              <MemberRow
                key={member.userId}
                member={member}
                isSelf={member.userId === user?.userID}
                canManage={canManageMembers}
                onRemove={() => void handleRemoveMember(member)}
              />
            ))
          )}
        </div>
      </div>
      {canManageMembers && !hideInviteCta ? (
        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            size="lg"
            loading={copyState === "busy"}
            onClick={() => void handleCopyLink()}
            data-action-ui-id="project.invite-copy-link"
          >
            {copyState === "busy" ? null : copyState === "copied" ? (
              <Check size={15} strokeWidth={2} aria-hidden="true" />
            ) : (
              <Link2 size={15} strokeWidth={1.75} aria-hidden="true" />
            )}
            {copyState === "copied" ? t("project.invite.copied") : t("project.invite.copyLink")}
          </Button>
          <p className="flex items-center justify-center gap-1 text-center text-[11px] text-muted-foreground">
            <Clock size={11} strokeWidth={1.75} aria-hidden="true" />
            {t("project.invite.expiryNote")}
          </p>
        </div>
      ) : null}
    </>
  );
}
function MemberRow({ member, isSelf, canManage, onRemove }) {
  const { t } = useTranslation();
  const isCreator = member.role === MemberRole.MEMBER_ROLE_CREATOR;
  const roleLabel = isCreator ? t("project.invite.roleOwner") : t("project.invite.roleMember");
  const palette = memberAvatarColors(member.userId || member.nickname);
  return (
    <div
      className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-foreground/[0.03]"
      data-action-ui-id="project.invite-member-row"
    >
      <Avatar size="sm">
        {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
        <AvatarFallback className={cn(palette.bg, palette.fg)}>
          {member.nickname.charAt(0).toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
        {member.nickname}
        {isSelf ? (
          <span className="ml-1 text-muted-foreground">{t("project.invite.you")}</span>
        ) : null}
      </span>
      {!canManage || isCreator || isSelf ? (
        <span className="shrink-0 px-1.5 text-[12px] text-muted-foreground">{roleLabel}</span>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            data-action-ui-id="project.invite-member-role"
          >
            {roleLabel}
            <ChevronDown size={12} strokeWidth={1.5} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              onClick={onRemove}
              data-action-ui-id="project.invite-remove-member"
            >
              <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
              {t("project.invite.removeMember")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
export function InviteProjectDialog({ project, open, canManageMembers, onOpenChange }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        className="sm:max-w-[480px]"
        data-action-ui-id="project.invite-dialog"
      >
        <DialogHeader>
          <DialogTitle className="truncate text-[15px]">
            {t(canManageMembers ? "project.invite.title" : "project.invite.membersTitle", {
              name: project.name,
            })}
          </DialogTitle>
        </DialogHeader>
        <InviteProjectPanel
          project={project}
          canManageMembers={canManageMembers}
          refreshKey={open}
        />
      </DialogContent>
    </Dialog>
  );
}
