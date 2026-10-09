// team-invite-deep-link-dialog.jsx
import {
  dedupedToast,
  getRuntimeConfig,
  Loader2,
  reactExports,
  ShieldCheck,
  UserRound,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useTeamAccount } from "../assets/credit-query-keys.jsx";
import { CalendarDays, Users } from "../media-editing/package.jsx";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";
import { teamApi } from "./team-api.js";
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
  return (
    status === INVITATION_STATUS_ACCEPTED ||
    status === INVITATION_STATUS_ALREADY_MEMBER
  );
}
function getInvitationStatusErrorCopy(status) {
  return (
    INVITATION_STATUS_ERROR_COPY[status] ?? INVITATION_STATUS_FALLBACK_COPY
  );
}
const ACCEPTED_TEAM_SWITCH_RETRY_DELAYS_MS = [300, 700, 1500];
function formatExpiry(expiresAtMs, neverExpiresLabel) {
  if (expiresAtMs === null || expiresAtMs === 0) return neverExpiresLabel;
  return new Date(expiresAtMs).toLocaleDateString();
}
async function waitForAcceptedTeamPropagation(delayMs) {
  await new Promise((resolve) => window.setTimeout(resolve, delayMs));
}
export function TeamInviteDeepLinkDialog({
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
          if (
            switchResult.status !== "rejected" ||
            switchResult.code !== "permission_denied"
          )
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
    (info2 !== null &&
      info2.usageLimit > 0 &&
      info2.usedCount >= info2.usageLimit);
  const hideAcceptButton = !isOverseas && (alreadyJoined || isExhausted);
  const actionDisabled =
    accepting ||
    (!isOverseas &&
      (loading ||
        !info2 ||
        info2.status !== "ACTIVE" ||
        alreadyJoined ||
        isExhausted));
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        size="sm"
        data-action-ui-id="team.invitation-deep-link-dialog"
      >
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
            <Loader2
              className="size-5 animate-spin text-muted-foreground"
              aria-hidden={true}
            />
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
                <Users
                  className="size-5"
                  strokeWidth={1.5}
                  aria-hidden={true}
                />
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
                  <UserRound
                    className="size-4"
                    strokeWidth={1.5}
                    aria-hidden={true}
                  />
                  {t2("team.invitation.members", {
                    defaultValue: "团队成员",
                  })}
                </dt>
                <dd className="text-foreground">{info2.memberCount}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck
                    className="size-4"
                    strokeWidth={1.5}
                    aria-hidden={true}
                  />
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
                  <CalendarDays
                    className="size-4"
                    strokeWidth={1.5}
                    aria-hidden={true}
                  />
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
            <Button
              type="button"
              loading={accepting}
              disabled={actionDisabled}
              onClick={() => void handleAccept()}
              data-action-ui-id="team.invitation-accept-link"
            >
              {t2("team.invitation.accept", {
                defaultValue: "接受",
              })}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
