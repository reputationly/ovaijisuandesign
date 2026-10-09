// team-invite-deep-link-dialog.jsx
import { jsxRuntimeExports, useTranslation, reactExports, dedupedToast, Loader2, getRuntimeConfig, UserRound, useQueryClient, ShieldCheck, ACCOUNT_SUBMISSION_BLOCKED_EVENT } from "../vendor.js";
import { teamQueryKeys, creditQueryKeys, useTeamAccount, accountScopeKey } from "../m15/apply-asset-change.jsx";
import { useDeepLinkRouter } from "../m15/create-visible-preview-tabs-store.js";
import { Users, CalendarDays } from "../m15/parse-item.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button$1,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import {
  instantiationService,
  ITeamOperationService,
  ITeamDataInvalidationService,
} from "../m08/browser-inspiration-urls.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  BLOCKING_REASON_FALLBACKS,
  BLOCKING_REASON_KEYS,
  hasUserStoppableReason,
} from "./account-switcher-view.jsx";
import { CreateTeamDialog, DissolveTransferSuccessDialog } from "./infinite-scroll-container.jsx";
import { teamApi } from "./team-api.js";
import { TeamCreditPage } from "./team-credit-page.jsx";
import { TeamManagementDialog } from "./team-management-dialog.jsx";
import { accountScopeEquals } from "./team-provider.jsx";
function TeamSwitchBlockedDialog({ open, blockingReasons, onOpenChange }) {
  const { t: t2 } = useTranslation();
  const stoppable = hasUserStoppableReason(blockingReasons);
  const description = stoppable
    ? t2("team.switchBlocked.stoppableDescription", {
        defaultValue: "当前有生成中的任务，无法切换 Group。请先停止该任务，然后再切换。",
      })
    : t2("team.switchBlocked.waitDescription", {
        defaultValue: "当前有正在进行的操作，无法切换 Group。请等待其完成后重试。",
      });
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-action-ui-id="team.switch-blocked-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t2("team.switchBlocked.title", {
              defaultValue: "无法切换 Group",
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {blockingReasons.length > 0 ? (
          <ul
            className="list-disc space-y-1 break-words pl-5 text-xs text-muted-foreground"
            data-action-ui-id="team.switch-blocked-reasons"
          >
            {blockingReasons.map((reason) => (
              <li
                key={reason}
                data-action-ui-id="team.switch-blocked-reason"
                data-team-blocking-reason={reason}
              >
                {t2(BLOCKING_REASON_KEYS[reason], {
                  defaultValue: BLOCKING_REASON_FALLBACKS[reason],
                })}
              </li>
            ))}
          </ul>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => onOpenChange(false)}
            data-action-ui-id="team.switch-blocked-confirm"
          >
            {t2("team.switchBlocked.confirm", {
              defaultValue: "知道了",
            })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
function dialogScopeKey(scope) {
  return [scope.identityKey, scope.groupId, scope.epoch].join(":");
}
function dialogScopeIdentityEquals(left, right) {
  if (!left || !right) return false;
  return (
    left.identityKey === right.identityKey &&
    left.groupId === right.groupId &&
    left.epoch === right.epoch
  );
}
export function TeamDialogHost() {
  const { t: t2 } = useTranslation();
  const {
    integrationEnabled,
    snapshot: snapshot2,
    dialog,
    activeScope,
    accountDataVisible,
    closeDialog,
  } = useTeamAccount();
  const [dissolveTransferSuccess, setDissolveTransferSuccess] = reactExports.useState(null);
  const handleOpenChange = (open) => {
    if (!open) closeDialog();
  };
  const renderActiveDialog = () => {
    if (!integrationEnabled || dialog.type === "closed") return null;
    if (dialog.type === "create") {
      if (dialog.identityKey !== snapshot2?.identityKey) return null;
      return <CreateTeamDialog open={true} onOpenChange={handleOpenChange} />;
    }
    if (dialog.type === "switch-blocked") {
      if (dialog.identityKey !== snapshot2?.identityKey) return null;
      return (
        <TeamSwitchBlockedDialog
          open={true}
          blockingReasons={dialog.blockingReasons}
          onOpenChange={handleOpenChange}
        />
      );
    }
    if (!accountDataVisible) return null;
    if (dialog.type === "management") {
      if (!accountScopeEquals(dialog.scope, activeScope)) return null;
      return (
        <TeamManagementDialog
          key={accountScopeKey(dialog.scope)}
          open={true}
          scope={dialog.scope}
          onOpenChange={handleOpenChange}
          onDissolveTransferSucceeded={setDissolveTransferSuccess}
        />
      );
    }
    if (!dialogScopeIdentityEquals(dialog.scope, activeScope)) return null;
    return (
      <Dialog key={dialogScopeKey(dialog.scope)} open={true} onOpenChange={handleOpenChange}>
        <DialogContent
          size="lg"
          className="flex max-h-[calc(100dvh-4rem)] flex-col gap-0 overflow-hidden p-0"
        >
          <DialogHeader className="shrink-0 border-b border-border px-4 pt-4 pr-14 pb-3 sm:px-6 sm:pt-5 sm:pr-16 sm:pb-4">
            <DialogTitle>
              {t2("team.credit.detailTitle", {
                defaultValue: "消耗明细",
              })}
            </DialogTitle>
            <DialogDescription>
              {t2("team.credit.detailDescription", {
                defaultValue: "仅展示当前账号的消耗明细，不包含团队整体消耗。",
              })}
            </DialogDescription>
          </DialogHeader>
          <TeamCreditPage open={true} scope={dialog.scope} />
        </DialogContent>
      </Dialog>
    );
  };
  return (
    <>
      {renderActiveDialog()}
      {dissolveTransferSuccess ? (
        <DissolveTransferSuccessDialog
          result={dissolveTransferSuccess}
          onClose={() => setDissolveTransferSuccess(null)}
        />
      ) : null}
    </>
  );
}
const INVITATION_STATUS_ACCEPTED = 2;
const INVITATION_STATUS_ALREADY_MEMBER = 8;
const INVITATION_STATUS_ERROR_COPY = {
  1: {
    i18nKey: "team.invitation.status.pending",
    defaultValue: "邀请已发送，等待对方接受",
  },
  3: {
    i18nKey: "team.invitation.status.expired",
    defaultValue: "邀请已过期，请联系团队管理员重新发送",
  },
  4: {
    i18nKey: "team.invitation.status.cancelled",
    defaultValue: "邀请已被取消，请联系团队管理员重新发送",
  },
  5: {
    i18nKey: "team.invitation.status.userIdNotMatch",
    defaultValue: "当前登录账号与受邀账号不一致，请切换至受邀账号后重试",
  },
  6: {
    i18nKey: "team.invitation.status.invalidInvitationId",
    defaultValue: "邀请链接无效或不存在，请检查链接后重试",
  },
  7: {
    i18nKey: "team.invitation.status.userHasTooManyGroup",
    defaultValue: "已达到可加入团队数量上限，请先退出其他团队后重试",
  },
  9: {
    i18nKey: "team.invitation.status.invitationLinkExhausted",
    defaultValue: "邀请链接使用次数已达上限，请联系管理员获取新的邀请链接",
  },
  10: {
    i18nKey: "team.invitation.status.groupHasTooManyMembers",
    defaultValue: "团队成员已满，暂时无法加入，请联系团队管理员",
  },
};
const INVITATION_STATUS_FALLBACK_COPY = {
  i18nKey: "team.invitation.acceptFailed",
  defaultValue: "邀请失败，请稍后重试或联系团队管理员。",
};
function isInvitationAcceptSuccessStatus(status) {
  return status === INVITATION_STATUS_ACCEPTED || status === INVITATION_STATUS_ALREADY_MEMBER;
}
function getInvitationStatusErrorCopy(status) {
  return INVITATION_STATUS_ERROR_COPY[status] ?? INVITATION_STATUS_FALLBACK_COPY;
}
const ACCEPTED_TEAM_SWITCH_RETRY_DELAYS_MS = [300, 700, 1500];
function formatExpiry(expiresAtMs, neverExpiresLabel) {
  if (expiresAtMs === null || expiresAtMs === 0) return neverExpiresLabel;
  return new Date(expiresAtMs).toLocaleDateString();
}
async function waitForAcceptedTeamPropagation(delayMs) {
  await new Promise((resolve) => window.setTimeout(resolve, delayMs));
}
function TeamInviteDeepLinkDialog({
  request,
  open,
  accepting,
  onAcceptingChange,
  onAccepted,
  onClose,
  onError,
}) {
  const { t: t2 } = useTranslation();
  const { revalidateContext, switchContext } = useTeamAccount();
  const [info2, setInfo] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [loadFailed, setLoadFailed] = reactExports.useState(false);
  const [alreadyJoined, setAlreadyJoined] = reactExports.useState(false);
  const region = getRuntimeConfig().region;
  const isOverseas = region === "overseas";
  reactExports.useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setInfo(null);
    setLoadFailed(false);
    setAlreadyJoined(false);
    if (isOverseas) {
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    teamApi
      .getInviteLinkInfo(request.token, region, {
        signal: controller.signal,
      })
      .then(async (inviteInfo) => {
        const contexts = await teamApi.listContexts({
          signal: controller.signal,
        });
        const hasJoined = contexts.items.some(
          (item) =>
            item.groupId === inviteInfo.groupId &&
            item.accountType === "TEAM" &&
            item.lifecycle === "ACTIVE" &&
            item.role !== null,
        );
        setAlreadyJoined(hasJoined);
        setInfo(inviteInfo);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [isOverseas, open, region, request.token]);
  const handleAccept = async () => {
    onAcceptingChange(true);
    try {
      const result = isOverseas
        ? await teamApi.acceptInvitation(request.token)
        : await teamApi.acceptInviteLink(request.token);
      if (!isInvitationAcceptSuccessStatus(result.status)) {
        const copy2 = getInvitationStatusErrorCopy(result.status);
        onError(
          t2(copy2.i18nKey, {
            defaultValue: copy2.defaultValue,
          }),
        );
        return;
      }
      const groupId2 = result.groupId ?? info2?.groupId;
      if (groupId2) {
        const refreshAndSwitch = async () => {
          const contexts = await teamApi.listContexts();
          await revalidateContext(contexts.contextsRevision);
          return switchContext(groupId2, "INVITATION_ACCEPTED");
        };
        let switchResult = await refreshAndSwitch();
        for (const delayMs of ACCEPTED_TEAM_SWITCH_RETRY_DELAYS_MS) {
          if (switchResult.status !== "rejected" || switchResult.code !== "permission_denied")
            break;
          await waitForAcceptedTeamPropagation(delayMs);
          switchResult = await refreshAndSwitch();
        }
      }
      dedupedToast.success(
        t2("team.invitation.acceptSucceeded", {
          defaultValue: "已接受邀请并加入团队。",
        }),
      );
      onAccepted();
    } catch {
      onError(
        t2("team.invitation.acceptFailed", {
          defaultValue: "邀请失败，请稍后重试或联系团队管理员。",
        }),
      );
    } finally {
      onAcceptingChange(false);
    }
  };
  const isExhausted =
    info2?.status === "EXHAUSTED" ||
    (info2 !== null && info2.usageLimit > 0 && info2.usedCount >= info2.usageLimit);
  const hideAcceptButton = !isOverseas && (alreadyJoined || isExhausted);
  const actionDisabled =
    accepting ||
    (!isOverseas &&
      (loading || !info2 || info2.status !== "ACTIVE" || alreadyJoined || isExhausted));
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent size="sm" data-action-ui-id="team.invitation-deep-link-dialog">
        <DialogHeader>
          <DialogTitle>
            {t2("team.invitation.pendingTitle", {
              defaultValue: "待处理团队邀请",
            })}
          </DialogTitle>
          <DialogDescription>
            {isOverseas
              ? t2("team.invitation.emailDescription", {
                  defaultValue: "你收到了一封团队邀请，接受后即可加入团队。",
                })
              : t2("team.invitation.pendingDescription", {
                  defaultValue: "确认邀请信息后接受邀请。",
                })}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden={true} />
          </div>
        ) : null}
        {loadFailed ? (
          <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
            {t2("team.invitation.notFound", {
              defaultValue: "该邀请不存在、已失效，或暂时无法读取。",
            })}
          </div>
        ) : null}
        {info2 ? (
          <article className="overflow-hidden rounded-lg border border-border">
            <div className="flex items-center gap-3 border-b border-border bg-muted px-4 py-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
                <Users className="size-5" strokeWidth={1.5} aria-hidden={true} />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-base font-medium text-foreground">
                  {info2.groupName}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {info2.inviterName.trim()
                    ? t2("team.invitation.invitedBy", {
                        defaultValue: "{{name}} 邀请你加入团队",
                        name: info2.inviterName.trim(),
                      })
                    : t2("team.invitation.invitedByUnknown", {
                        defaultValue: "团队管理员邀请你加入团队",
                      })}
                </p>
              </div>
            </div>
            <dl className="grid gap-3 px-4 py-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <UserRound className="size-4" strokeWidth={1.5} aria-hidden={true} />
                  {t2("team.invitation.members", {
                    defaultValue: "团队成员",
                  })}
                </dt>
                <dd className="text-foreground">{info2.memberCount}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="size-4" strokeWidth={1.5} aria-hidden={true} />
                  {t2("team.invitation.role", {
                    defaultValue: "受邀角色",
                  })}
                </dt>
                <dd className="text-foreground">
                  {t2(`team.role.${info2.role.toLowerCase()}`, {
                    defaultValue: info2.role,
                  })}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="size-4" strokeWidth={1.5} aria-hidden={true} />
                  {t2("team.invitation.validity", {
                    defaultValue: "链接有效期",
                  })}
                </dt>
                <dd className="text-foreground">
                  {formatExpiry(
                    info2.expiresAtMs,
                    t2("team.inviteLink.neverExpires", {
                      defaultValue: "永久有效",
                    }),
                  )}
                </dd>
              </div>
            </dl>
          </article>
        ) : null}
        {alreadyJoined ? (
          <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
            {t2("team.invitation.alreadyJoined", {
              defaultValue: "已加入过该团队",
            })}
          </div>
        ) : null}
        {!alreadyJoined && isExhausted ? (
          <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
            {t2("team.invitation.exhausted", {
              defaultValue: "该邀请链接的使用次数已用完。",
            })}
          </div>
        ) : null}
        {!hideAcceptButton ? (
          <DialogFooter>
            <Button$1
              type="button"
              loading={accepting}
              disabled={actionDisabled}
              onClick={() => void handleAccept()}
              data-action-ui-id="team.invitation-accept-link"
            >
              {t2("team.invitation.accept", {
                defaultValue: "接受",
              })}
            </Button$1>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
export function TeamInviteDeepLinkHost() {
  const { pendingTeamInvite, dismissTeamInvite } = useDeepLinkRouter();
  const [accepting, setAccepting] = reactExports.useState(false);
  const handleAccepted = reactExports.useCallback(() => {
    dismissTeamInvite();
  }, [dismissTeamInvite]);
  if (!pendingTeamInvite) return null;
  return (
    <TeamInviteDeepLinkDialog
      request={pendingTeamInvite}
      open={true}
      accepting={accepting}
      onAcceptingChange={setAccepting}
      onAccepted={handleAccepted}
      onClose={dismissTeamInvite}
      onError={(message2) => dedupedToast.error(message2)}
    />
  );
}
function resolveServices(operationOverride, invalidationOverride) {
  try {
    return {
      operation:
        operationOverride ??
        instantiationService.invokeFunction((accessor) => accessor.get(ITeamOperationService)),
      invalidation:
        invalidationOverride ??
        instantiationService.invokeFunction((accessor) =>
          accessor.get(ITeamDataInvalidationService),
        ),
    };
  } catch {
    return {
      operation: operationOverride ?? null,
      invalidation: invalidationOverride ?? null,
    };
  }
}
export function TeamOperationHost({ operationService, invalidationService }) {
  const queryClient2 = useQueryClient();
  const { integrationEnabled, snapshot: snapshot2, activeScope } = useTeamAccount();
  const [lastOperation, setLastOperation] = reactExports.useState(null);
  const services2 = reactExports.useMemo(
    () =>
      integrationEnabled
        ? resolveServices(operationService, invalidationService)
        : {
            operation: null,
            invalidation: null,
          },
    [integrationEnabled, invalidationService, operationService],
  );
  const identityKey = snapshot2?.identityKey ?? null;
  reactExports.useEffect(() => {
    if (!integrationEnabled || !identityKey || !services2.operation) return void 0;
    let disposed = false;
    const accept = (operation) => {
      if (!disposed && operation.identityKey === identityKey) setLastOperation(operation);
    };
    const subscription = services2.operation.onDidChange(accept);
    void services2.operation
      .getSnapshot(identityKey)
      .then((operations) => {
        if (!disposed && operations.length > 0) accept(operations.at(-1));
      })
      .catch(() => {});
    return () => {
      disposed = true;
      subscription.dispose();
      setLastOperation(null);
    };
  }, [identityKey, integrationEnabled, services2.operation]);
  reactExports.useEffect(() => {
    if (!integrationEnabled || !identityKey || !services2.invalidation) return void 0;
    const invalidateDomain = (domain2, event) => {
      if (domain2 === "CONTEXTS") {
        return queryClient2.invalidateQueries({
          queryKey: teamQueryKeys.contexts(identityKey),
        });
      }
      if (domain2 === "INVITATIONS") {
        return Promise.resolve();
      }
      if (domain2 === "CAPABILITIES") {
        return queryClient2.invalidateQueries({
          queryKey: teamQueryKeys.userCapabilities(identityKey),
        });
      }
      if (event.groupId && event.groupId !== activeScope?.groupId) {
        return queryClient2.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(identityKey) && query.queryKey.includes(event.groupId),
        });
      }
      if (!activeScope) {
        return Promise.resolve();
      }
      if (domain2 === "TEAM_DETAIL") {
        return queryClient2.invalidateQueries({
          queryKey: teamQueryKeys.detail(activeScope),
        });
      }
      if (domain2 === "MEMBERS") {
        return queryClient2.invalidateQueries({
          queryKey: [...teamQueryKeys.membership(activeScope), "members"],
        });
      }
      if (domain2 === "INVITE_LINKS") {
        return queryClient2.invalidateQueries({
          queryKey: [...teamQueryKeys.membership(activeScope), "invite-links"],
        });
      }
      if (domain2 === "QUOTA") {
        return queryClient2.invalidateQueries({
          queryKey: teamQueryKeys.quota(activeScope),
        });
      }
      if (domain2 === "CREDIT_SUMMARY") {
        return queryClient2.invalidateQueries({
          queryKey: creditQueryKeys.summary(activeScope),
        });
      }
      return queryClient2.invalidateQueries({
        queryKey: [...creditQueryKeys.scope(activeScope), "transactions"],
      });
    };
    const subscription = services2.invalidation.onDidInvalidate((event) => {
      if (event.identityKey !== identityKey) return;
      void Promise.all(event.domains.map((domain2) => invalidateDomain(domain2, event)));
    });
    return () => subscription.dispose();
  }, [activeScope, identityKey, integrationEnabled, queryClient2, services2.invalidation]);
  if (!lastOperation) return null;
  return (
    <span className="sr-only" role="status" data-team-operation-status={lastOperation.status}>
      {lastOperation.type}
      {": "}
      {lastOperation.status}
    </span>
  );
}
export function AccountSubmissionBlockedHost() {
  const { t: t2 } = useTranslation();
  reactExports.useEffect(() => {
    const handleBlocked = (event) => {
      const detail = event.detail;
      if (!detail?.kind || !detail.reasonCode) return;
      dedupedToast.warning(
        t2("team.submission.blocked", {
          defaultValue: "账号状态尚未就绪，暂时无法提交",
        }),
        {
          id: `team-account-submission-${detail.reasonCode}`,
          description: t2(`team.submission.reason.${detail.reasonCode}`, {
            defaultValue: "正在同步团队账号信息，请稍后重试。",
          }),
        },
      );
    };
    window.addEventListener(ACCOUNT_SUBMISSION_BLOCKED_EVENT, handleBlocked);
    return () => window.removeEventListener(ACCOUNT_SUBMISSION_BLOCKED_EVENT, handleBlocked);
  }, [t2]);
  return null;
}
export function asRecord$3(value) {
  return typeof value === "object" && value !== null ? value : null;
}
export function asString(value) {
  return typeof value === "string" ? value : "";
}
export function asNullableString(value) {
  return typeof value === "string" && value !== "" ? value : null;
}
export function mapAccountProfile(value) {
  const raw2 = asRecord$3(value);
  return {
    account: asString(raw2?.account),
    uid: asString(raw2?.uid),
    user_name: asString(raw2?.user_name),
  };
}
