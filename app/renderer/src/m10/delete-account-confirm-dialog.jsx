// delete-account-confirm-dialog.jsx
import { jsxRuntimeExports, useTranslation, reactExports, useMutation, dedupedToast, AlertTriangle, useQueries, Check, Copy, Pencil, useQuery } from "../vendor.js";
import { useAuth, useOptionalTeamAccount } from "../m15/apply-asset-change.jsx";
import { services } from "../m15/graph.jsx";
import { isElectron } from "../m15/track-events.js";
import { ACTIVE_CUSTOM_MODEL_QUERY_KEY } from "../m15/use-resizable-width.js";
import {
  RESEND_COOLDOWN_SEC,
  sendCancelCode,
  SUBMIT_LOCK_AFTER_SEND_MS,
  deleteAccount,
  backendUserMessage,
  isVerifyCodeError,
  WARNING_KEYS,
  useHailuoWebSummary,
  useHailuoCancelCheck,
  useHubCancelCheck,
  ACCOUNT_QUERY_KEYS,
  fetchTeamCreditSummaryByGroupId,
  useUpdateAccountProfile,
  useAccountProfile,
  groupTeamContexts,
} from "../m09/use-update-account-profile.js";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  Checkbox,
  Button$1,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { Label } from "../m09/infinite-scroll-container.jsx";
import { Input3 } from "../asset-center/shared/select-content.jsx";
import { useTeamContextsQuery } from "../m09/use-team-transactions-feed-query.jsx";
import { SettingGroup, SettingRow, SettingsSelect } from "../m09/auth-provider.jsx";
import {
  INetworkDiagnosticsMainService,
  IDesktopSettingsMainService,
} from "../m08/browser-inspiration-urls.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
function DeleteAccountConfirmDialog({ open, onOpenChange, onDeleted }) {
  const { t: t2 } = useTranslation();
  const { clearLocalAuth } = useAuth();
  const dataErasedId = reactExports.useId();
  const selfInitiatedId = reactExports.useId();
  const [dataErasedChecked, setDataErasedChecked] = reactExports.useState(false);
  const [selfInitiatedChecked, setSelfInitiatedChecked] = reactExports.useState(false);
  const [verifyCode, setVerifyCode] = reactExports.useState("");
  const [countdown, setCountdown] = reactExports.useState(0);
  const [actionError, setActionError] = reactExports.useState(null);
  const [submitLocked, setSubmitLocked] = reactExports.useState(false);
  const timerRef = reactExports.useRef(null);
  const submitLockTimerRef = reactExports.useRef(null);
  const canSubmit =
    dataErasedChecked && selfInitiatedChecked && verifyCode.trim().length > 0 && !submitLocked;
  reactExports.useEffect(() => {
    if (open) {
      setDataErasedChecked(false);
      setSelfInitiatedChecked(false);
      setVerifyCode("");
      setActionError(null);
      setSubmitLocked(false);
    }
  }, [open]);
  reactExports.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (submitLockTimerRef.current) clearTimeout(submitLockTimerRef.current);
    };
  }, []);
  const startCountdown = () => {
    setCountdown(RESEND_COOLDOWN_SEC);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1e3);
  };
  const sendCodeMutation = useMutation({
    mutationFn: () => sendCancelCode(),
    retry: false,
    onSuccess: () => {
      dedupedToast.success(t2("account.delete.codeSent"));
      startCountdown();
      setSubmitLocked(true);
      if (submitLockTimerRef.current) clearTimeout(submitLockTimerRef.current);
      submitLockTimerRef.current = setTimeout(
        () => setSubmitLocked(false),
        SUBMIT_LOCK_AFTER_SEND_MS,
      );
    },
    onError: () => {
      dedupedToast.error(t2("account.delete.codeSendFailed"));
    },
  });
  const mutation = useMutation({
    mutationFn: () => deleteAccount(verifyCode.trim()),
    retry: false,
    onSuccess: () => {
      dedupedToast.success(t2("account.delete.successToast"));
      onDeleted();
      clearLocalAuth();
    },
    onError: (error) => {
      const message2 = backendUserMessage(error);
      if (message2) {
        setActionError(message2);
        return;
      }
      setActionError(
        isVerifyCodeError(error)
          ? t2("account.delete.verifyCodeError")
          : t2("account.delete.failed"),
      );
    },
  });
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => !mutation.isPending && onOpenChange(nextOpen)}
    >
      <AlertDialogContent
        layer="nested"
        className="max-h-[85vh] grid-rows-[auto_1fr_auto]"
        data-action-ui-id="account-delete-confirm-dialog"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{t2("account.delete.confirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t2("account.delete.confirmIntro")}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="scrollbar-fade min-h-0 space-y-6 overflow-y-auto pr-1.5 [scrollbar-gutter:stable]">
          <ol className="list-decimal space-y-1 rounded-lg bg-secondary py-2.5 pr-3 pl-7 text-xs/relaxed text-foreground/70">
            {WARNING_KEYS.map((key2) => (
              <li key={key2}>{t2(key2)}</li>
            ))}
          </ol>
          <div className="space-y-2.5">
            <div className="hilo-checkbox-label flex items-start">
              <Checkbox
                id={dataErasedId}
                checked={dataErasedChecked}
                onCheckedChange={(checked) => setDataErasedChecked(checked === true)}
                disabled={mutation.isPending}
                data-action-ui-id="account-delete-confirm.ack-data-erased"
              />
              <Label
                htmlFor={dataErasedId}
                className="cursor-pointer pt-1.5 text-sm font-normal pointer-coarse:pt-3"
              >
                {t2("account.delete.ackDataErased")}
              </Label>
            </div>
            <div className="hilo-checkbox-label flex items-start">
              <Checkbox
                id={selfInitiatedId}
                checked={selfInitiatedChecked}
                onCheckedChange={(checked) => setSelfInitiatedChecked(checked === true)}
                disabled={mutation.isPending}
                data-action-ui-id="account-delete-confirm.ack-self-initiated"
              />
              <Label
                htmlFor={selfInitiatedId}
                className="cursor-pointer pt-1.5 text-sm font-normal pointer-coarse:pt-3"
              >
                {t2("account.delete.ackSelfInitiated")}
              </Label>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-normal">{t2("account.delete.verifyCodeLabel")}</Label>
            <div className="flex gap-2">
              <Input3
                value={verifyCode}
                onChange={(e2) => setVerifyCode(e2.target.value)}
                placeholder={t2("account.delete.verifyCodePlaceholder")}
                disabled={mutation.isPending}
                inputMode="numeric"
                autoComplete="one-time-code"
                data-action-ui-id="account-delete-confirm.verify-code"
              />
              <Button$1
                type="button"
                variant="secondary"
                disabled={countdown > 0 || sendCodeMutation.isPending || mutation.isPending}
                onClick={() => sendCodeMutation.mutate()}
                data-action-ui-id="account-delete-confirm.send-code"
              >
                {countdown > 0
                  ? t2("account.delete.resendCodeIn", {
                      seconds: countdown,
                    })
                  : t2("account.delete.sendCode")}
              </Button$1>
            </div>
          </div>
          {actionError ? (
            <div
              role="alert"
              className="rounded-lg border border-border bg-muted p-3 text-xs text-foreground"
              data-action-ui-id="account-delete-confirm.error"
            >
              <p className="flex gap-2">
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0"
                  strokeWidth={1.5}
                  aria-hidden={true}
                />
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                  {actionError}
                </span>
              </p>
            </div>
          ) : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>{t2("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            loading={mutation.isPending}
            disabled={!canSubmit || mutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              if (!canSubmit || mutation.isPending) return;
              mutation.mutate();
            }}
            data-action-ui-id="account-delete-confirm.submit"
          >
            {t2("account.delete.submitButton")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
function SummaryBlock({ title, children: children2 }) {
  return (
    <div className="rounded-lg bg-secondary p-1.5">
      <div className="px-2.5 pt-1.5 pb-0.5 text-xs text-muted-foreground">{title}</div>
      {children2}
    </div>
  );
}
function SummaryRow({ label, value }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-4 rounded-md px-2.5 py-1">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-sm text-foreground">{value}</span>
    </div>
  );
}
function BlockGroup({ title, items }) {
  return (
    <div
      role="alert"
      className="space-y-1.5 rounded-lg border border-border bg-muted p-3 text-xs text-foreground"
    >
      <div className="font-medium">{title}</div>
      {items.map((item) => (
        <p key={item} className="flex gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden={true} />
          <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{item}</span>
        </p>
      ))}
    </div>
  );
}
function roleLabelKey(role) {
  switch (role) {
    case "OWNER":
      return "team.role.owner";
    case "ADMIN":
      return "team.role.admin";
    default:
      return "team.role.member";
  }
}
function DeleteAccountDialog({ open, onOpenChange, createdTeams, joinedTeams }) {
  const { t: t2 } = useTranslation();
  const { user } = useAuth();
  const [confirmOpen, setConfirmOpen] = reactExports.useState(false);
  const summaryQuery = useHailuoWebSummary(open);
  const cancelCheckQuery = useHailuoCancelCheck(open);
  const hubCancelCheckQuery = useHubCancelCheck(open);
  const hailuoBlocked = cancelCheckQuery.data?.canCancel === false;
  const hailuoBlockedReason = cancelCheckQuery.data?.reason ?? null;
  const hubCancelCheck = hubCancelCheckQuery.data;
  const hubCancelAllowed = hubCancelCheckQuery.isSuccess && hubCancelCheck?.canDelete === true;
  const blocked = hailuoBlocked || !hubCancelAllowed;
  const hubCancelSettled = hubCancelCheckQuery.isSuccess || hubCancelCheckQuery.isError;
  const hubCancelBlocked = hubCancelSettled && !hubCancelAllowed;
  const hubBlockItems = [
    ...(hubCancelCheck?.hasIapSubscription ? [t2("account.delete.blockIapSubscription")] : []),
    ...(hubCancelCheck?.blockingTeams ?? []).map((team) =>
      t2(
        team.role === "OWNER" ? "account.delete.blockTeamOwner" : "account.delete.blockTeamMember",
        {
          team: team.groupName,
        },
      ),
    ),
  ];
  const identityKey = useOptionalTeamAccount()?.snapshot?.identityKey ?? null;
  const ownerCreditQueries = useQueries({
    queries: createdTeams.map((team) => ({
      queryKey: ACCOUNT_QUERY_KEYS.deletionPreviewTeamCredit(identityKey ?? "", team.groupId),
      queryFn: ({ signal }) => fetchTeamCreditSummaryByGroupId(team.groupId, signal),
      enabled: open && identityKey !== null,
      retry: false,
      staleTime: 3e4,
    })),
  });
  const ownerCreditByGroupId = new Map(
    createdTeams.map((team, index2) => [team.groupId, ownerCreditQueries[index2]?.data ?? null]),
  );
  const allTeams = [...createdTeams, ...joinedTeams];
  const hubPlan = hubCancelCheck?.personalSubscriptionPlan || "--";
  const hubCredits = hubCancelCheck?.personalCredits ?? null;
  const hubCreditsNum = hubCredits != null ? Number(hubCredits) : Number.NaN;
  const showHubCredits = Number.isFinite(hubCreditsNum) && hubCreditsNum > 0;
  const hailuoPlan = summaryQuery.data?.subscriptionPlan ?? "--";
  const hailuoCredits = summaryQuery.data?.remainingCredits ?? null;
  const hailuoCreditsNum = hailuoCredits != null ? Number(hailuoCredits) : Number.NaN;
  const showHailuoCredits = Number.isFinite(hailuoCreditsNum) && hailuoCreditsNum > 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="md"
        layer="nested"
        className="max-h-[85vh] grid-rows-[auto_1fr_auto]"
        data-action-ui-id="account-delete-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t2("account.delete.title")}</DialogTitle>
          <DialogDescription>{t2("account.delete.subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="scrollbar-fade min-h-0 space-y-2 overflow-y-auto pr-1.5 [scrollbar-gutter:stable]">
          <SummaryBlock title={t2("account.delete.hubPersonalTitle")}>
            <SummaryRow label={t2("account.delete.accountName")} value={user?.username || "--"} />
            <SummaryRow label={t2("account.delete.subscriptionPlan")} value={hubPlan} />
            {showHubCredits && hubCredits !== null && (
              <SummaryRow label={t2("account.delete.remainingCredits")} value={hubCredits} />
            )}
          </SummaryBlock>
          {allTeams.length > 0 && (
            <SummaryBlock title={t2("account.delete.hubTeamsTitle")}>
              {allTeams.map((team) => {
                const ownerCredit =
                  team.role === "OWNER"
                    ? (ownerCreditByGroupId.get(team.groupId)?.teamRemaining ?? null)
                    : null;
                const roleLabel = t2(roleLabelKey(team.role));
                return (
                  <SummaryRow
                    key={team.groupId}
                    label={team.displayName}
                    value={
                      ownerCredit !== null
                        ? `${roleLabel} · ${t2("account.delete.teamRemainingCredits")} ${ownerCredit}`
                        : roleLabel
                    }
                  />
                );
              })}
            </SummaryBlock>
          )}
          <SummaryBlock title={t2("account.delete.hailuoTitle")}>
            <SummaryRow label={t2("account.delete.subscriptionPlan")} value={hailuoPlan} />
            {showHailuoCredits && hailuoCredits !== null && (
              <SummaryRow label={t2("account.delete.remainingCredits")} value={hailuoCredits} />
            )}
          </SummaryBlock>
          {hailuoBlocked && (
            <BlockGroup
              title={t2("account.delete.blockGroupHailuo")}
              items={[
                hailuoBlockedReason
                  ? t2("account.delete.blockHailuoReason", {
                      reason: hailuoBlockedReason,
                    })
                  : t2("account.delete.blockHailuoFallback"),
              ]}
            />
          )}
          {hubCancelBlocked && (
            <BlockGroup
              title={t2("account.delete.blockGroupDesign")}
              items={
                hubBlockItems.length > 0
                  ? hubBlockItems
                  : [t2("account.delete.blockCheckUnavailable")]
              }
            />
          )}
        </div>
        <DialogFooter>
          <Button$1
            variant="secondary"
            onClick={() => onOpenChange(false)}
            data-action-ui-id="account-delete-dialog.cancel"
          >
            {t2("common.cancel")}
          </Button$1>
          <Button$1
            variant="destructive"
            disabled={blocked}
            onClick={() => setConfirmOpen(true)}
            data-action-ui-id="account-delete-dialog.confirm"
          >
            {t2("account.delete.confirmButton")}
          </Button$1>
        </DialogFooter>
        <DeleteAccountConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onDeleted={() => {
            setConfirmOpen(false);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
function CopyIconButton({ value, label, actionId }) {
  const { t: t2 } = useTranslation();
  const [copied, setCopied] = reactExports.useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      data-action-ui-id={actionId}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          dedupedToast.error(t2("common.copyFailed"));
        }
      }}
      className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
    >
      {copied ? (
        <Check size={13} strokeWidth={2} className="text-primary" />
      ) : (
        <Copy size={13} strokeWidth={1.5} />
      )}
    </button>
  );
}
function InfoRow({ label, value, copyActionId }) {
  const { t: t2 } = useTranslation();
  return (
    <div className="flex h-9 items-center justify-between gap-4 rounded-md px-2.5">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-1">
        <span className="truncate text-sm text-foreground">{value ?? "--"}</span>
        {value ? (
          <CopyIconButton value={value} label={t2("common.copy")} actionId={copyActionId} />
        ) : null}
      </div>
    </div>
  );
}
const ACCOUNT_NAME_MIN_LENGTH = 2;
const ACCOUNT_NAME_MAX_LENGTH = 20;
function countChars(value) {
  return Array.from(value).length;
}
function AccountNameRow({ savedName }) {
  const { t: t2 } = useTranslation();
  const [draft, setDraft] = reactExports.useState(null);
  const updateMutation = useUpdateAccountProfile();
  const handleBlur = () => {
    if (draft === null) return;
    const next2 = draft.trim();
    setDraft(null);
    if (next2 === savedName) return;
    if (next2 === "") {
      dedupedToast.error(t2("settings.account.nameEmptyError"));
      return;
    }
    const length2 = countChars(next2);
    if (length2 < ACCOUNT_NAME_MIN_LENGTH || length2 > ACCOUNT_NAME_MAX_LENGTH) {
      dedupedToast.error(t2("settings.account.nameLengthError"));
      return;
    }
    updateMutation.mutate(next2, {
      onError: () => dedupedToast.error(t2("settings.account.nameUpdateFailed")),
    });
  };
  return (
    <div className="flex h-9 items-center justify-between gap-4 rounded-md px-2.5">
      <span className="shrink-0 text-sm text-muted-foreground">
        {t2("settings.account.nameLabel")}
      </span>
      <div
        className="flex w-52 min-w-0 items-center gap-1"
        data-action-ui-id="settings-account.name-control"
      >
        {draft === null ? (
          <>
            <span className="min-w-0 flex-1 truncate text-right text-sm text-foreground">
              {savedName || "--"}
            </span>
            <Button$1
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={updateMutation.isPending}
              aria-label={`${t2("common.edit")} ${t2("settings.account.nameLabel")}`}
              data-action-ui-id="settings-account.edit-name"
              onClick={() => setDraft(savedName)}
              className="text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            >
              <Pencil size={13} strokeWidth={1.5} aria-hidden={true} />
            </Button$1>
          </>
        ) : (
          <>
            <Input3
              autoFocus={true}
              value={draft}
              placeholder={t2("settings.account.namePlaceholder")}
              disabled={updateMutation.isPending}
              data-action-ui-id="settings-account.name-input"
              className="h-7 min-w-0 flex-1 text-right text-sm md:text-sm"
              onChange={(event) => setDraft(event.target.value)}
              onBlur={handleBlur}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
            <span
              aria-hidden={true}
              className="size-6 shrink-0"
              data-action-ui-id="settings-account.name-edit-slot"
            />
          </>
        )}
      </div>
    </div>
  );
}
function TeamRow({ team }) {
  const { t: t2 } = useTranslation();
  return (
    <div className="flex h-9 items-center justify-between gap-4 rounded-md px-2.5">
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{team.displayName}</span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {t2("team.management.groupId")} {team.groupId}
      </span>
    </div>
  );
}
export function AccountSection() {
  const { t: t2 } = useTranslation();
  const { user } = useAuth();
  const profileQuery = useAccountProfile();
  const teamAccount = useOptionalTeamAccount();
  const contextsQuery = useTeamContextsQuery(teamAccount?.snapshot?.identityKey ?? null);
  const [deleteDialogOpen, setDeleteDialogOpen] = reactExports.useState(false);
  const teams = reactExports.useMemo(
    () => groupTeamContexts(contextsQuery.data?.items),
    [contextsQuery.data],
  );
  const hasTeams = teams.created.length > 0 || teams.joined.length > 0;
  const account = profileQuery.data?.account || null;
  const uid2 = profileQuery.data?.uid || user?.userID || null;
  const userName = profileQuery.data?.user_name || user?.username || "";
  return (
    <div className="space-y-3">
      <SettingGroup title={t2("settings.account.infoTitle")}>
        <div className="space-y-0.5 rounded-lg bg-secondary p-1.5">
          <AccountNameRow savedName={userName} />
          <InfoRow
            label={t2("settings.account.accountLabel")}
            value={account}
            copyActionId="settings-account.copy-account"
          />
          <InfoRow
            label={t2("settings.account.uidLabel")}
            value={uid2}
            copyActionId="settings-account.copy-uid"
          />
        </div>
      </SettingGroup>
      <SettingGroup title={t2("settings.account.teamsTitle")}>
        {hasTeams ? (
          <div className="space-y-2">
            {teams.created.length > 0 && (
              <div className="space-y-0.5 rounded-lg bg-secondary p-1.5">
                <div className="px-2.5 pt-1.5 pb-0.5 text-xs text-muted-foreground">
                  {t2("settings.account.createdTeams")}
                </div>
                {teams.created.map((team) => (
                  <TeamRow key={team.groupId} team={team} />
                ))}
              </div>
            )}
            {teams.joined.length > 0 && (
              <div className="space-y-0.5 rounded-lg bg-secondary p-1.5">
                <div className="px-2.5 pt-1.5 pb-0.5 text-xs text-muted-foreground">
                  {t2("settings.account.joinedTeams")}
                </div>
                {teams.joined.map((team) => (
                  <TeamRow key={team.groupId} team={team} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-secondary p-1.5">
            <p className="px-2.5 py-2 text-sm text-muted-foreground">
              {t2("settings.account.noTeams")}
            </p>
          </div>
        )}
      </SettingGroup>
      <SettingGroup title={t2("settings.account.deleteTitle")}>
        <SettingRow
          label={t2("settings.account.deleteLabel")}
          description={t2("settings.account.deleteDescription")}
        >
          <Button$1
            variant="destructive"
            size="sm"
            data-action-ui-id="settings-account.delete-account"
            onClick={() => setDeleteDialogOpen(true)}
          >
            {t2("settings.account.deleteButton")}
          </Button$1>
        </SettingRow>
      </SettingGroup>
      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        createdTeams={teams.created}
        joinedTeams={teams.joined}
      />
    </div>
  );
}
let service = null;
export function getNetworkDiagnosticsMainService() {
  if (!service) {
    service = services.get(INetworkDiagnosticsMainService);
  }
  return service;
}
const PROXY_MODES$1 = ["auto", "direct", "system"];
export function NetworkSection() {
  const { t: t2 } = useTranslation();
  const [mode2, setMode] = reactExports.useState("auto");
  const requestRevisionRef = reactExports.useRef(0);
  reactExports.useEffect(() => {
    let mounted = true;
    const revision = requestRevisionRef.current;
    getNetworkDiagnosticsMainService()
      .getProxyMode()
      .then((m3) => {
        if (mounted && requestRevisionRef.current === revision) setMode(m3);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  if (!isElectron()) return null;
  const handleChange = async (value) => {
    const revision = ++requestRevisionRef.current;
    const next2 = value;
    const prev = mode2;
    setMode(next2);
    try {
      const result = await getNetworkDiagnosticsMainService().setProxyMode(next2);
      if (requestRevisionRef.current !== revision) return;
      if (result.success) {
        setMode(result.mode);
        dedupedToast.success(t2("settings.network.proxyModeSaved"));
      } else {
        setMode(prev);
        dedupedToast.error(t2("settings.network.proxyModeFailed"));
      }
    } catch {
      if (requestRevisionRef.current !== revision) return;
      setMode(prev);
      dedupedToast.error(t2("settings.network.proxyModeFailed"));
    }
  };
  return (
    <div className="space-y-4">
      <SettingGroup title={t2("settings.network.proxyGroup")}>
        <SettingRow
          label={t2("settings.network.proxyMode")}
          description={t2("settings.network.proxyModeDesc")}
        >
          <SettingsSelect
            value={mode2}
            onValueChange={(v2) => void handleChange(v2)}
            options={PROXY_MODES$1.map((m3) => ({
              value: m3,
              label: t2(`settings.network.proxyMode.${m3}`),
            }))}
          />
        </SettingRow>
      </SettingGroup>
    </div>
  );
}
let _service$4 = null;
export function getDesktopSettingsMainService() {
  if (!_service$4) {
    _service$4 = services.get(IDesktopSettingsMainService);
  }
  return _service$4;
}
const desktopSettingsMainService = Object.freeze(
  Object.defineProperty(
    {
      __proto__: null,
      getDesktopSettingsMainService,
    },
    Symbol.toStringTag,
    {
      value: "Module",
    },
  ),
);
export async function readActiveCustomModel() {
  if (!isElectron()) return null;
  let timer2;
  try {
    return await Promise.race([
      (async () => {
        const { getDesktopSettingsMainService: getDesktopSettingsMainService2 } =
          await Promise.resolve().then(() => desktopSettingsMainService);
        return {
          getDesktopSettingsMainService: getDesktopSettingsMainService2,
        };
      })().then(({ getDesktopSettingsMainService: getDesktopSettingsMainService2 }) =>
        getDesktopSettingsMainService2().getActiveCustomModel(),
      ),
      new Promise((_2, reject) => {
        timer2 = setTimeout(
          () => reject(new Error("Custom model configuration is unavailable")),
          5e3,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer2);
  }
}
export function useActiveCustomModel() {
  return useQuery({
    queryKey: ACTIVE_CUSTOM_MODEL_QUERY_KEY,
    queryFn: readActiveCustomModel,
    retry: 2,
    retryDelay: 300,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchInterval: (query) => (query.state.data?.applyStatus === "pending" ? 1e3 : false),
  });
}
export const sideEffectErrorKeys = {
  menuBarVisible: "settings.errors.trayFailed",
  runOnStartup: "settings.errors.startupFailed",
  language: "settings.errors.languageFailed",
  preventSleep: "settings.errors.preventSleepFailed",
  autoFeedbackEnabled: "settings.errors.autoFeedbackFailed",
  autoInstallOnQuit: "settings.errors.autoInstallFailed",
  watermarkEnabled: "settings.errors.watermarkFailed",
  compactionEnabled: "settings.errors.compactionFailed",
  lane: "settings.errors.laneFailed",
};
export const sideEffects = {
  menuBarVisible: async (service2, value) => {
    const result = await service2.setTrayVisible(value);
    return result.success;
  },
  runOnStartup: async (service2, value) => {
    const result = await service2.setRunOnStartup(value);
    return result.success;
  },
  language: async (service2, value) => {
    const result = await service2.setLanguage(value);
    return result.success;
  },
  theme: async (service2, value) => {
    const result = await service2.setTheme(value);
    return result.success;
  },
  preventSleep: async (service2, value) => {
    const result = await service2.setPreventSleep(value);
    return result.success;
  },
  autoFeedbackEnabled: async (service2, value) => {
    const result = await service2.setAutoFeedbackEnabled(value);
    return result.success;
  },
  watermarkEnabled: async (service2, value) => {
    const result = await service2.setWatermarkEnabled(value);
    return result.success;
  },
  compactionEnabled: async (service2, value) => {
    const result = await service2.setCompactionEnabled(value);
    return result.success;
  },
  lane: async (service2, value) => {
    const result = await service2.setLane(value ?? "");
    return result.success;
  },
};
