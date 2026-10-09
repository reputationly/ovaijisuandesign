// account-submission-blocked-host.jsx
import {
  ACCOUNT_SUBMISSION_BLOCKED_EVENT,
  dedupedToast,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { TeamInviteDeepLinkDialog } from "./team-invite-deep-link-dialog.jsx";
import { useDeepLinkRouter } from "../workspace/use-deep-link-router.js";

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
    return () =>
      window.removeEventListener(
        ACCOUNT_SUBMISSION_BLOCKED_EVENT,
        handleBlocked,
      );
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
