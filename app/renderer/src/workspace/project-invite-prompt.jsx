// project-invite-prompt.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { Users } from "../media-editing/package.jsx";
import { AlertDialog, cn$2 as cn } from "../infra/dialog-content.jsx";
import {
  dedupedToast,
  reactExports,
  useNavigate,
  useTranslation,
} from "../vendor.js";
import { projectLog } from "../vendor-inline/vscode-base/graph.jsx";
import { useAuth } from "../assets/credit-query-keys.jsx";
import { useLoginGuard } from "../infra/schedule.js";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../infra/badge-variants.jsx";
import { useProjectActions } from "../settings/use-project-actions.js";
function parseProjectInviteParams(params) {
  const token2 = params.token?.trim();
  if (!token2) return null;
  const memberCount = Number(params.members ?? 0);
  return {
    token: token2,
    projectName: params.name?.trim() ?? "",
    inviterName: params.inviter?.trim() ?? "",
    memberCount:
      Number.isFinite(memberCount) && memberCount > 0
        ? Math.floor(memberCount)
        : 0,
  };
}
function useProjectInviteDeepLink() {
  const [pendingInvite, setPendingInvite] = reactExports.useState(null);
  const recentTokensRef = reactExports.useRef(new Map());
  reactExports.useEffect(() => {
    if (!window.hilo?.projectInvite) return;
    const off = window.hilo.projectInvite.onReceived((action) => {
      const payload = parseProjectInviteParams(action.params);
      if (!payload) {
        projectLog.warn("invite-deeplink unusable", {
          params: Object.keys(action.params).join(","),
        });
        return;
      }
      const now2 = Date.now();
      const seenAt = recentTokensRef.current.get(payload.token);
      if (seenAt && now2 - seenAt < 3e3) {
        projectLog.info("invite-deeplink deduped", {
          ageMs: now2 - seenAt,
        });
        return;
      }
      recentTokensRef.current.set(payload.token, now2);
      for (const [token2, ts2] of recentTokensRef.current) {
        if (now2 - ts2 >= 3e3) recentTokensRef.current.delete(token2);
      }
      projectLog.info("invite-deeplink received", {
        projectName: payload.projectName,
        inviterName: payload.inviterName,
        memberCount: payload.memberCount,
      });
      setPendingInvite(payload);
    });
    return off;
  }, []);
  const dismiss = reactExports.useCallback(() => setPendingInvite(null), []);
  return {
    pendingInvite,
    dismiss,
  };
}
function ProjectFolderPreview({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative overflow-visible", className)}
      data-action-ui-id="project.folder-preview"
    >
      <span className="pointer-events-none absolute inset-x-0 top-1 bottom-0 z-0 rounded-[24px] border border-[color:color-mix(in_srgb,var(--sidebar-foreground)_4%,transparent)] bg-[color:color-mix(in_srgb,var(--sidebar-accent)_98%,var(--sidebar-foreground))] shadow-[0_1px_3px_rgba(0,0,0,0.04)]" />
      <div className="pointer-events-none absolute inset-x-5 top-4 h-[64%]">
        <div className="absolute inset-x-3 top-0 h-[88%] -rotate-3 rounded-[18px] bg-muted shadow-[0_3px_8px_rgba(0,0,0,0.10)]" />
        <div className="absolute -inset-x-0.5 top-3 h-[88%] rotate-2 rounded-[18px] border border-border bg-card shadow-[0_4px_10px_rgba(0,0,0,0.14)]" />
      </div>
      <span className="pointer-events-none absolute top-[40%] left-0 h-5 w-24 translate-y-px rounded-t-[32px] border border-b-0 border-[color:color-mix(in_srgb,var(--sidebar-foreground)_4%,transparent)] bg-[color:color-mix(in_srgb,color-mix(in_srgb,var(--sidebar-accent)_98%,var(--sidebar-foreground))_88%,transparent)] backdrop-blur-[6px]" />
      <div className="absolute inset-x-0 bottom-0 top-[calc(40%+20px)] rounded-tr-[30px] rounded-b-[24px] border border-t-0 border-[color:color-mix(in_srgb,var(--sidebar-foreground)_4%,transparent)] bg-[color:color-mix(in_srgb,color-mix(in_srgb,var(--sidebar-accent)_98%,var(--sidebar-foreground))_88%,transparent)] backdrop-blur-[6px]">
        <span
          className="absolute left-5 top-3 flex size-5 items-center justify-center rounded-full bg-sidebar/70 text-sidebar-foreground/60"
          data-action-ui-id="project.folder-preview-badge"
        >
          <Users size={12} strokeWidth={1.5} aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
export function ProjectInvitePrompt() {
  const { t: t2 } = useTranslation();
  const navigate = useNavigate();
  const { pendingInvite, dismiss } = useProjectInviteDeepLink();
  const { isLoggedIn, unauthenticatedReason } = useAuth();
  const { guard: loginGuard } = useLoginGuard();
  const { acceptProjectInviteToken } = useProjectActions({
    enabled: isLoggedIn || unauthenticatedReason === "expired",
  });
  const [accepting, setAccepting] = reactExports.useState(false);
  const handleAccept = reactExports.useCallback(async () => {
    if (!pendingInvite || accepting) return;
    if (!loginGuard()) {
      projectLog.info("accept-invite blocked by login");
      return;
    }
    setAccepting(true);
    try {
      const result = await acceptProjectInviteToken(pendingInvite.token);
      if (!result.projectId) {
        dedupedToast.error(
          result.errorMessage || t2("project.invite.acceptFailed"),
        );
        return;
      }
      dismiss();
      void navigate({
        to: "/projects/$projectId",
        params: {
          projectId: result.projectId,
        },
        search: {
          tab: "cloudAssets",
        },
      });
    } finally {
      setAccepting(false);
    }
  }, [
    accepting,
    acceptProjectInviteToken,
    dismiss,
    loginGuard,
    navigate,
    pendingInvite,
    t2,
  ]);
  const handleDecline = reactExports.useCallback(() => {
    projectLog.info("invite-prompt declined");
    dismiss();
  }, [dismiss]);
  if (!pendingInvite) return null;
  const projectName =
    pendingInvite.projectName || t2("project.invite.card.unknownProject");
  const inviteLine = pendingInvite.inviterName
    ? t2("project.invite.card.inviteLine", {
        inviter: pendingInvite.inviterName,
      })
    : t2("project.invite.card.inviteLineAnonymous");
  return (
    <AlertDialog
      open={true}
      onOpenChange={(open) => !open && !accepting && handleDecline()}
    >
      <AlertDialogContent size="sm" data-action-ui-id="project.invite-prompt">
        <div className="flex w-full min-w-0 flex-col items-center gap-4">
          <ProjectFolderPreview className="h-32 w-44 shrink-0" />
          <AlertDialogHeader className="w-full min-w-0 items-center text-center">
            <AlertDialogTitle className="w-full max-w-full truncate text-center">
              {projectName}
            </AlertDialogTitle>
            <AlertDialogDescription className="w-full max-w-full text-center break-words">
              {inviteLine}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel
            disabled={accepting}
            data-action-ui-id="project.invite-decline"
          >
            {t2("project.invite.card.decline")}
          </AlertDialogCancel>
          <AlertDialogAction
            loading={accepting}
            onClick={() => void handleAccept()}
            data-action-ui-id="project.invite-accept"
          >
            {t2("project.invite.card.accept")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
