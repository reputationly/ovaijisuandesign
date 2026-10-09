// im-bridge-manager.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  reactExports,
  dedupedToast,
  useQuery,
  useQueryClient,
  TRACK_EVENTS,
  usePlatform,
  API_PATHS,
  useGatewayFetch,
  useGatewayScopeKey,
  openExternalUrl,
  Trash2,
  getRuntimeConfig,
  ArrowUpRight,
  Icon,
  Tooltip,
  TooltipTrigger,
  Info$1,
  PlaybackPauseIcon,
  SettingsPanelHeaderContext,
  useSettingsPanelHeader,
  assetInfoToAssetMeta,
  assetLineageQueryKey,
  useAssetMetadataApi,
  useGatewayScope,
  useGatewayUrl,
  buildWSUrl,
  rebindWorkspaceAssetMetadataUrls,
  ASSET_STATE_BREADCRUMB_INTERVAL_MS,
  getAssetEventStateSnapshot,
  replayAssetChangesOrFallback,
  AgentWSClient,
  remoteToolLog,
  invalidateAssetQueries,
  invalidateAssetBatchQueries,
  CANVAS_TAG_REGISTRY_CHANGED_MESSAGE_TYPE,
  canvasTagRegistryQueryKey,
  invalidateAssetLineageQueries,
  resetAssetSeqState,
  requestAssetWorkspaceResync,
  guardedSubmissionKind,
  guardAccountSubmission,
  WSConnectionContext,
} from "../vendor.js";
import {
  Button$1,
  cn$2,
  TooltipContent,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { Label } from "../m09/infinite-scroll-container.jsx";
import { Input3 } from "../asset-center/shared/select-content.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { Switch } from "../m01/calc-video-cost-breakdown.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  FeishuSection,
  FeishuUserAuthFlow,
  PlatformIcon,
  WechatQrSection,
  getAccountDisplayName,
  trackConnectionFailure,
} from "./feishu-qr-section.jsx";
import { useSettings } from "./use-data-directory.js";
import {
  IntegrationActionButton,
  IntegrationActionGroup,
  IntegrationCard,
  IntegrationIconFrame,
  IntegrationLifecycleToggleButton,
  IntegrationMoreMenu,
  IntegrationStatusPill,
  useAvailablePlatforms,
  useImAccounts,
  useImStatuses,
} from "./use-feishu-qr-login.jsx";
function AddAccountForm({
  platform: platform2,
  onClose,
  onAdded,
  onDialogHeaderChange,
  onConnected,
  layout = "dialog",
}) {
  const { t: t2 } = useTranslation();
  const { addAccount } = useImAccounts();
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [botToken, setBotToken] = reactExports.useState("");
  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const creds = {
        platform: "telegram",
        botToken: botToken.trim(),
      };
      await addAccount(creds, void 0);
      onAdded();
    } catch (err) {
      trackConnectionFailure("connect", "telegram", layout, err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div
      className="flex min-h-full flex-1 flex-col gap-4"
      data-action-ui-id={`im-bridge.add.${platform2}`}
    >
      {platform2 === "feishu" && (
        <FeishuSection
          alias=""
          layout={layout}
          onClose={onClose}
          onConfirmed={onAdded}
          onDialogHeaderChange={onDialogHeaderChange}
          onConnected={onConnected}
        />
      )}
      {platform2 === "wechat" && (
        <WechatQrSection
          alias=""
          layout={layout}
          onClose={onClose}
          onConfirmed={onAdded}
          onDialogHeaderChange={onDialogHeaderChange}
          onConnected={onConnected}
        />
      )}
      {platform2 === "telegram" && (
        <>
          <div className="space-y-1">
            <Label htmlFor="im-bottoken" className="text-xs">
              {t2("settings.imBridge.field.botToken")}
            </Label>
            <Input3
              id="im-bottoken"
              type="password"
              value={botToken}
              onChange={(e2) => setBotToken(e2.target.value)}
              placeholder={t2("settings.imBridge.field.botTokenPlaceholder")}
              autoComplete="off"
            />
          </div>
          {error && (
            <p className="text-destructive text-xs" data-action-ui-id="im-bridge.add.error">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button$1 variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
              {t2("common.cancel")}
            </Button$1>
            <Button$1 size="sm" onClick={handleSubmit} loading={submitting}>
              {t2("settings.imBridge.add.submit")}
            </Button$1>
          </div>
        </>
      )}
    </div>
  );
}
function getAccountStatusHint(status) {
  const state2 = status?.state ?? "disconnected";
  if (status?.errorKind === "credential_corrupt") {
    return {
      key: "settings.imBridge.credentialError.rowHint",
      tone: "destructive",
    };
  }
  if (status?.lastError) {
    return null;
  }
  switch (state2) {
    case "connected":
      return null;
    case "connecting":
      return {
        key: "settings.imBridge.status.connecting",
        tone: "warning",
      };
    case "error":
      return {
        key: "settings.imBridge.status.error",
        tone: "destructive",
      };
    case "disconnected":
      return {
        key: "settings.imBridge.status.disconnected",
        tone: "muted",
      };
  }
}
const TUTORIAL_URL = {
  wechat: "https://my.feishu.cn/wiki/UqkAwo1tMi050hkDlnic4a1Tntf",
  feishu: "https://my.feishu.cn/wiki/OAmLwbUOsiGOfSk8sB8c3klinPd",
};
const DOMESTIC_PLATFORM_ORDER = ["feishu", "wechat", "telegram", "discord", "dingtalk"];
const OVERSEAS_PLATFORM_ORDER = ["feishu", "telegram", "wechat", "discord", "dingtalk"];
function regionKeySuffix() {
  return getRuntimeConfig().region === "overseas" ? "overseas" : "domestic";
}
function getConnectionPlatformOrder() {
  return getRuntimeConfig().region === "overseas"
    ? OVERSEAS_PLATFORM_ORDER
    : DOMESTIC_PLATFORM_ORDER;
}
function getAddablePlatformOrder() {
  return getRuntimeConfig().region === "overseas" ? ["feishu", "telegram"] : ["feishu", "wechat"];
}
export function ImBridgeManager({ onDialogHeaderChange, layout = "dialog" } = {}) {
  const { t: t2, i18n } = useTranslation();
  const {
    accounts,
    legacyCredentialsPresent,
    loading,
    error,
    removeAccount,
    pauseAccount,
    resumeAccount,
    resetLegacyCredentialState,
    refresh,
  } = useImAccounts();
  const statuses = useImStatuses();
  const available = useAvailablePlatforms();
  const { config: config2, set: set2 } = useSettings();
  const [addingPlatform, setAddingPlatform] = reactExports.useState(null);
  const [authorizingAccount, setAuthorizingAccount] = reactExports.useState(null);
  const [updatingCredentials, setUpdatingCredentials] = reactExports.useState(false);
  const surface = layout === "settings" ? "settings" : "dialog";
  const trackAccountAction = (action, result, platform2, error2) => {
    trackEvent(TRACK_EVENTS.IM_BRIDGE_ACCOUNT_ACTION, {
      action,
      result,
      surface,
      ...(platform2
        ? {
            platform: platform2,
          }
        : {}),
      ...(error2
        ? {
            error_message: (error2 instanceof Error ? error2.message : String(error2)).slice(
              0,
              200,
            ),
          }
        : {}),
    });
  };
  const platformOrder = reactExports.useMemo(() => getConnectionPlatformOrder(), []);
  const addablePlatformOrder = reactExports.useMemo(() => getAddablePlatformOrder(), []);
  const platformRank = reactExports.useMemo(
    () => new Map(platformOrder.map((platform2, index2) => [platform2, index2])),
    [platformOrder],
  );
  const sorted = reactExports.useMemo(
    () =>
      [...accounts].sort((a2, b3) => {
        const rankDelta =
          (platformRank.get(a2.platform) ?? Number.MAX_SAFE_INTEGER) -
          (platformRank.get(b3.platform) ?? Number.MAX_SAFE_INTEGER);
        return rankDelta === 0 ? a2.createdAt - b3.createdAt : rankDelta;
      }),
    [accounts, platformRank],
  );
  const boundPlatforms = reactExports.useMemo(
    () => new Set(accounts.map((a2) => a2.platform)),
    [accounts],
  );
  const addableAccountOptions = reactExports.useMemo(() => {
    return addablePlatformOrder
      .filter((platform2) => available[platform2] && !boundPlatforms.has(platform2))
      .map((platform2) => ({
        platform: platform2,
        label: t2(`settings.imBridge.platform.${platform2}`),
      }));
  }, [addablePlatformOrder, available, boundPlatforms, t2]);
  const hasCredentialError = reactExports.useMemo(
    () => sorted.some((a2) => statuses[a2.accountId]?.errorKind === "credential_corrupt"),
    [sorted, statuses],
  );
  if (addingPlatform) {
    return (
      <AddAccountForm
        platform={addingPlatform}
        layout={layout}
        onClose={() => setAddingPlatform(null)}
        onDialogHeaderChange={onDialogHeaderChange}
        onConnected={async () => {
          trackAccountAction("connect", "success", addingPlatform);
          await refresh();
        }}
        onAdded={() => {
          if (addingPlatform === "telegram") {
            trackAccountAction("connect", "success", addingPlatform);
          }
          void refresh();
          setAddingPlatform(null);
        }}
      />
    );
  }
  if (authorizingAccount) {
    const authorizingAgentName = getAccountDisplayName(
      authorizingAccount,
      statuses[authorizingAccount.accountId],
      i18n?.resolvedLanguage || i18n?.language,
    );
    return (
      <FeishuUserAuthFlow
        accountId={authorizingAccount.accountId}
        agentName={authorizingAgentName}
        layout={layout}
        onClose={() => setAuthorizingAccount(null)}
        onAuthorized={async () => {
          trackAccountAction("authorize", "success", authorizingAccount.platform);
          await refresh();
        }}
        onDialogHeaderChange={onDialogHeaderChange}
      />
    );
  }
  const regionSuffix = regionKeySuffix();
  const tutorialPlatform = getFallbackTutorialPlatform();
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm">
              {t2("settings.imBridge.hero.title")}
            </p>
            <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
              {t2(`settings.imBridge.hero.description.${regionSuffix}`)}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={t2("settings.imBridge.connection.infoLabel")}
                      className="ml-1 inline-flex size-4 cursor-pointer items-center justify-center rounded-full align-middle text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                    />
                  }
                >
                  <Icon icon={Info$1} size="xs" strokeWidth={2} />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] text-center leading-relaxed">
                  {t2("settings.imBridge.executionNotice")}
                </TooltipContent>
              </Tooltip>
            </p>
          </div>
          <TutorialLink
            platform={tutorialPlatform}
            actionId="im-bridge.tutorial"
            className="mt-0.5 shrink-0"
          />
        </div>
        {loading && (
          <p className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-muted-foreground text-xs">
            {t2("settings.imBridge.loading")}
          </p>
        )}
        {error && !loading && (
          <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-destructive text-xs">
            {t2("settings.imBridge.errors.listFailed", {
              message: error,
            })}
          </p>
        )}
        {(legacyCredentialsPresent || hasCredentialError) && (
          <div
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/50 px-3 py-2.5"
            data-action-ui-id="im-bridge.credential-update-banner"
          >
            <p className="text-[13px] leading-relaxed text-foreground">
              {t2("settings.imBridge.credentialUpdate.banner")}
            </p>
            <Button$1
              size="sm"
              disabled={updatingCredentials}
              onClick={async () => {
                setUpdatingCredentials(true);
                trackAccountAction("reset_credentials", "start");
                try {
                  await resetLegacyCredentialState();
                  trackAccountAction("reset_credentials", "success");
                  dedupedToast.success(t2("settings.imBridge.credentialUpdate.success"));
                } catch (error2) {
                  trackAccountAction("reset_credentials", "failed", void 0, error2);
                  dedupedToast.error(t2("settings.imBridge.credentialUpdate.failed"));
                } finally {
                  setUpdatingCredentials(false);
                }
              }}
              data-action-ui-id="im-bridge.credential-update"
            >
              {t2("settings.imBridge.credentialUpdate.action")}
            </Button$1>
          </div>
        )}
        {!loading && !error && (
          <ConnectionList
            platformOrder={platformOrder}
            accounts={sorted}
            statuses={statuses}
            addableOptions={addableAccountOptions}
            onAdd={(platform2) => {
              trackAccountAction("connect", "start", platform2);
              setAddingPlatform(platform2);
            }}
            onRemove={async (accountId) => {
              const account = sorted.find((item) => item.accountId === accountId);
              trackAccountAction("remove", "start", account?.platform);
              try {
                await removeAccount(accountId);
                trackAccountAction("remove", "success", account?.platform);
              } catch (error2) {
                trackAccountAction("remove", "failed", account?.platform, error2);
                dedupedToast.error(t2("settings.imBridge.errors.removeFailed"));
              }
            }}
            onPause={async (accountId) => {
              const account = sorted.find((item) => item.accountId === accountId);
              trackAccountAction("pause", "start", account?.platform);
              try {
                await pauseAccount(accountId);
                trackAccountAction("pause", "success", account?.platform);
              } catch (error2) {
                trackAccountAction("pause", "failed", account?.platform, error2);
                throw error2;
              }
            }}
            onResume={async (accountId) => {
              const account = sorted.find((item) => item.accountId === accountId);
              trackAccountAction("resume", "start", account?.platform);
              try {
                await resumeAccount(accountId);
                trackAccountAction("resume", "success", account?.platform);
              } catch (error2) {
                trackAccountAction("resume", "failed", account?.platform, error2);
                throw error2;
              }
            }}
            onAuthorize={(account) => {
              trackAccountAction("authorize", "start", account.platform);
              setAuthorizingAccount(account);
            }}
          />
        )}
      </section>
      <section>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm">
              {t2("imBridge.preventSleep.title")}
            </p>
            <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
              {t2("imBridge.preventSleep.description")}
            </p>
          </div>
          <Switch
            checked={config2.preventSleep ?? false}
            onCheckedChange={(checked) => {
              trackEvent(TRACK_EVENTS.IM_BRIDGE_ACCOUNT_ACTION, {
                action: "prevent_sleep",
                result: "start",
                surface,
                enabled: checked,
              });
              void set2("preventSleep", checked)
                .then(() => {
                  trackEvent(TRACK_EVENTS.IM_BRIDGE_ACCOUNT_ACTION, {
                    action: "prevent_sleep",
                    result: "success",
                    surface,
                    enabled: checked,
                  });
                })
                .catch((error2) => {
                  trackEvent(TRACK_EVENTS.IM_BRIDGE_ACCOUNT_ACTION, {
                    action: "prevent_sleep",
                    result: "failed",
                    surface,
                    enabled: checked,
                    error_message: (error2 instanceof Error
                      ? error2.message
                      : String(error2)
                    ).slice(0, 200),
                  });
                });
            }}
            data-action-ui-id="im-bridge.prevent-sleep-toggle"
          />
        </div>
      </section>
    </div>
  );
}
function ConnectionList({
  platformOrder,
  accounts,
  statuses,
  addableOptions,
  onAdd: onAdd2,
  onRemove: onRemove2,
  onPause,
  onResume,
  onAuthorize,
}) {
  const accountsByPlatform = reactExports.useMemo(() => {
    const map3 = new Map();
    for (const account of accounts) {
      const existing = map3.get(account.platform) ?? [];
      existing.push(account);
      map3.set(account.platform, existing);
    }
    return map3;
  }, [accounts]);
  const addableByPlatform = reactExports.useMemo(
    () => new Map(addableOptions.map((option2) => [option2.platform, option2])),
    [addableOptions],
  );
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {platformOrder.flatMap((platform2) => {
          const platformAccounts = accountsByPlatform.get(platform2);
          if (platformAccounts?.length) {
            return platformAccounts.map((acc) => (
              <AccountRow
                key={acc.accountId}
                account={acc}
                status={statuses[acc.accountId]}
                onRemove={() => onRemove2(acc.accountId)}
                onPause={() => onPause(acc.accountId)}
                onResume={() => onResume(acc.accountId)}
                onAuthorize={() => onAuthorize(acc)}
              />
            ));
          }
          const option2 = addableByPlatform.get(platform2);
          return option2
            ? [<AddableAccountRow key={option2.platform} option={option2} onAdd={onAdd2} />]
            : [];
        })}
      </ul>
    </div>
  );
}
function AddableAccountRow({ option: option2, onAdd: onAdd2 }) {
  const { t: t2 } = useTranslation();
  const status = getPlatformStatusDisplay("notConnected");
  return (
    <IntegrationCard>
      <PlatformIconFrame platform={option2.platform} label={option2.label} />
      <div className="flex min-w-0 flex-1 flex-col justify-center self-stretch">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-medium text-[16px] text-foreground leading-none">
            {option2.label}
          </p>
          <ConnectionStatusIndicator display={status} />
        </div>
        <p className="mt-2 truncate text-muted-foreground text-xs">
          {t2(`settings.imBridge.channel.description.${option2.platform}`)}
        </p>
      </div>
      <div className="shrink-0">
        <Button$1
          type="button"
          size="lg"
          className="h-8 min-w-20 px-3 text-sm font-medium"
          onClick={() => onAdd2(option2.platform)}
          data-action-ui-id={`im-bridge.empty.add.${option2.platform}`}
        >
          {t2("settings.imBridge.channel.action.connectPlatform", {
            platform: option2.label,
          })}
        </Button$1>
      </div>
    </IntegrationCard>
  );
}
function AccountRow({ account, status, onRemove: onRemove2, onPause, onResume, onAuthorize }) {
  const { t: t2, i18n } = useTranslation();
  const platformLabel = t2(`settings.imBridge.platform.${account.platform}`);
  const displayName2 =
    getAccountDisplayName(account, status, i18n?.resolvedLanguage || i18n?.language) ||
    platformLabel;
  const needsAuth = account.platform === "feishu" && account.needsUserAuth === true;
  const credentialError = status?.errorKind === "credential_corrupt";
  const statusHint = account.paused && !credentialError ? null : getAccountStatusHint(status);
  const statusDisplay = getAccountRowStatusDisplay({
    account,
    status,
    needsAuth,
    credentialError,
  });
  const connectedGuidePlatform =
    account.platform === "feishu" || account.platform === "wechat" ? account.platform : null;
  const showConnectedGuide =
    connectedGuidePlatform !== null &&
    status?.state === "connected" &&
    !account.paused &&
    !needsAuth &&
    !credentialError;
  const subtitle =
    account.paused && !credentialError
      ? t2("settings.imBridge.channel.subtitle.paused", {
          name: displayName2,
        })
      : statusHint
        ? t2(statusHint.key)
        : showConnectedGuide
          ? t2(`settings.imBridge.channel.subtitle.connected.${connectedGuidePlatform}`)
          : `${displayName2}${!credentialError && status?.lastError ? ` • ${status.lastError}` : ""}`;
  const subtitleToneClass = statusHint
    ? ACCOUNT_STATUS_HINT_TONE_CLASS[statusHint.tone]
    : "text-muted-foreground";
  return (
    <IntegrationCard>
      <PlatformIconFrame platform={account.platform} label={platformLabel} />
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex min-h-14 flex-col justify-center">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate font-medium text-[16px] text-foreground leading-none">
              {platformLabel}
            </p>
            <ConnectionStatusIndicator
              display={statusDisplay}
              tooltipActionId={
                needsAuth ? `im-bridge.row.${account.accountId}.needs-auth-info` : void 0
              }
              tooltipContent={
                needsAuth ? (
                  <>
                    <span>{t2("settings.imBridge.userAuth.hint")}</span>
                    <span>{t2("settings.imBridge.security.availabilityHint")}</span>
                  </>
                ) : (
                  void 0
                )
              }
            />
          </div>
          <div className="mt-1.5 flex items-center">
            <p
              className={cn$2(
                "line-clamp-2 whitespace-normal break-words text-xs leading-snug",
                subtitleToneClass,
              )}
            >
              {subtitle}
            </p>
          </div>
        </div>
      </div>
      <IntegrationActionGroup>
        {needsAuth && (
          <IntegrationActionButton
            type="button"
            variant="outline"
            tone="warning"
            onClick={() => onAuthorize()}
            data-action-ui-id={`im-bridge.row.${account.accountId}.authorize`}
          >
            <span>{t2("settings.imBridge.userAuth.action")}</span>
          </IntegrationActionButton>
        )}
        {!needsAuth && (
          <IntegrationLifecycleToggleButton
            type="button"
            inactive={account.paused}
            activeLabel={t2("settings.imBridge.actions.pause")}
            inactiveLabel={t2("settings.imBridge.actions.resume")}
            onClick={() => (account.paused ? onResume() : onPause())}
            data-action-ui-id={`im-bridge.row.${account.accountId}.${account.paused ? "resume" : "pause"}`}
          />
        )}
        <AccountMoreMenu accountId={account.accountId} onRemove={onRemove2} />
      </IntegrationActionGroup>
    </IntegrationCard>
  );
}
function AccountMoreMenu({ accountId, onRemove: onRemove2 }) {
  const { t: t2 } = useTranslation();
  return (
    <IntegrationMoreMenu
      triggerLabel={t2("settings.imBridge.actions.more")}
      actionLabel={t2("settings.imBridge.actions.remove")}
      actionIcon={<Icon icon={Trash2} size="sm" strokeWidth={1.5} />}
      onAction={onRemove2}
      actionUiIds={{
        trigger: `im-bridge.row.${accountId}.more`,
        content: `im-bridge.row.${accountId}.more-popover`,
        bridge: `im-bridge.row.${accountId}.more-popover-hover-bridge`,
        action: `im-bridge.row.${accountId}.remove`,
      }}
    />
  );
}
function PlatformIconFrame({ platform: platform2, label }) {
  return (
    <IntegrationIconFrame>
      <PlatformIcon
        platform={platform2}
        label={label}
        className="size-12 rounded-md bg-white object-contain"
      />
    </IntegrationIconFrame>
  );
}
function getPlatformStatusDisplay(status) {
  return {
    key: `settings.imBridge.channel.status.${status}`,
    markerTone: "muted",
    state: "disconnected",
    tone: "muted",
  };
}
function getAccountRowStatusDisplay({ account, status, needsAuth, credentialError }) {
  const state2 = status?.state ?? "disconnected";
  if (credentialError) {
    return {
      key: "settings.imBridge.channel.status.error",
      markerTone: "destructive",
      state: "error",
      tone: "destructive",
    };
  }
  if (needsAuth) {
    return {
      key: "settings.imBridge.channel.status.needsAuth",
      markerTone: "warning",
      state: "needsAuth",
      tone: "warning",
    };
  }
  if (account.paused) {
    return {
      key: "settings.imBridge.channel.status.paused",
      markerTone: "warning",
      state: "paused",
      tone: "warning",
    };
  }
  switch (state2) {
    case "connected":
      return {
        key: "settings.imBridge.channel.status.connected",
        markerTone: "success",
        state: state2,
        tone: "neutral",
      };
    case "connecting":
      return {
        key: "settings.imBridge.channel.status.connecting",
        markerTone: "warning",
        state: state2,
        tone: "warning",
      };
    case "error":
      return {
        key: "settings.imBridge.channel.status.error",
        markerTone: "destructive",
        state: state2,
        tone: "destructive",
      };
    case "disconnected":
      return {
        key: "settings.imBridge.channel.status.disconnected",
        markerTone: "muted",
        state: state2,
        tone: "muted",
      };
  }
}
function ConnectionStatusIndicator({ display, className, tooltipActionId, tooltipContent }) {
  const { t: t2 } = useTranslation();
  return (
    <IntegrationStatusPill
      label={t2(display.key)}
      tone={display.tone}
      markerTone={display.markerTone}
      markerActive={display.state === "needsAuth"}
      markerIcon={
        display.state === "paused" ? (
          <PlaybackPauseIcon size={10} className="shrink-0 text-warning/80" />
        ) : (
          void 0
        )
      }
      markerLabel={`status:${display.state}`}
      tooltipActionId={tooltipActionId}
      tooltipContent={tooltipContent}
      className={className}
    />
  );
}
function TutorialLink({ platform: platform2, actionId, className }) {
  const { t: t2 } = useTranslation();
  const shellPlatform = usePlatform();
  const tutorialUrl = TUTORIAL_URL[platform2];
  if (!tutorialUrl) return null;
  return (
    <Button$1
      type="button"
      variant="ghost"
      size="sm"
      className={cn$2("gap-1 text-brand-accent hover:text-brand-accent", className)}
      onClick={() => {
        void openExternalUrl(shellPlatform, tutorialUrl, {
          source: "im-bridge.tutorial",
        });
      }}
      data-action-ui-id={actionId}
    >
      {t2("settings.imBridge.tutorialLink")}
      <Icon icon={ArrowUpRight} size="sm" strokeWidth={2} />
    </Button$1>
  );
}
function getFallbackTutorialPlatform() {
  return "feishu";
}
const ACCOUNT_STATUS_HINT_TONE_CLASS = {
  muted: "text-muted-foreground",
  warning: "text-warning",
  destructive: "text-destructive",
};
export function SettingsPanelHeaderProvider({ children: children2, setHeaderOverride }) {
  return (
    <SettingsPanelHeaderContext.Provider
      value={{
        setHeaderOverride,
      }}
    >
      {children2}
    </SettingsPanelHeaderContext.Provider>
  );
}
export function ImBridgeSection() {
  const { setHeaderOverride } = useSettingsPanelHeader();
  const { accounts } = useImAccounts();
  const openTrackedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (openTrackedRef.current) return;
    openTrackedRef.current = true;
    trackEvent(TRACK_EVENTS.IM_BRIDGE_OPEN, {
      source: "settings",
      has_account: accounts.length > 0,
    });
  }, [accounts.length]);
  return (
    <div className="flex min-h-[calc(min(620px,80vh)-5.5rem)] flex-col [&>div]:flex-1">
      <ImBridgeManager layout="settings" onDialogHeaderChange={setHeaderOverride} />
    </div>
  );
}
function hasPayload(payload) {
  return Boolean(
    payload.initialMessage ||
    (payload.initialAttachments?.length ?? 0) > 0 ||
    (payload.initialEntityRefs?.length ?? 0) > 0 ||
    payload.initialModelId ||
    payload.initialSelectedMediaModels,
  );
}
export function workspaceInitialPayloadSignature(payload) {
  return JSON.stringify([
    payload.initialMessage ?? null,
    payload.initialAttachments ?? [],
    payload.initialEntityRefs ?? [],
    payload.initialModelId ?? null,
    payload.initialSelectedMediaModels ?? null,
  ]);
}
function workspaceInitialPayloadKey(payload) {
  return payload.initialPayloadId
    ? `operation:${payload.initialPayloadId}`
    : `legacy:${workspaceInitialPayloadSignature(payload)}`;
}
function cloneSelectedMediaModels$1(selectedMediaModels) {
  if (!selectedMediaModels) return void 0;
  return {
    ...(selectedMediaModels.image
      ? {
          image: [...selectedMediaModels.image],
        }
      : {}),
    ...(selectedMediaModels.video
      ? {
          video: [...selectedMediaModels.video],
        }
      : {}),
    ...(selectedMediaModels.audio
      ? {
          audio: [...selectedMediaModels.audio],
        }
      : {}),
  };
}
export class WorkspaceInitialPayloadCache {
  payloads = new Map();
  consumedPayloadKeys = new Map();
  capture(workspaceId2, payload) {
    if (!workspaceId2 || !hasPayload(payload)) return;
    const next2 = {
      initialPayloadId: payload.initialPayloadId,
      initialMessage: payload.initialMessage,
      initialAttachments: payload.initialAttachments ? [...payload.initialAttachments] : void 0,
      initialEntityRefs: payload.initialEntityRefs ? [...payload.initialEntityRefs] : void 0,
      initialModelId: payload.initialModelId,
      initialSelectedMediaModels: cloneSelectedMediaModels$1(payload.initialSelectedMediaModels),
    };
    const payloadKey = workspaceInitialPayloadKey(next2);
    if (this.consumedPayloadKeys.get(workspaceId2) === payloadKey) return;
    this.payloads.set(workspaceId2, next2);
  }
  get(workspaceId2) {
    return this.payloads.get(workspaceId2);
  }
  consume(workspaceId2) {
    const payload = this.payloads.get(workspaceId2);
    if (payload) {
      this.consumedPayloadKeys.set(workspaceId2, workspaceInitialPayloadKey(payload));
    }
    this.payloads.delete(workspaceId2);
  }
  /**
   * Drop cached payloads for workspaces that have been closed.
   *
   * A workspace is considered "closed" when it was previously seen in the live
   * set but is no longer present — and is not the currently active workspace
   * (which may not yet have appeared in entries).
   */
  cleanupClosed(liveIds, seenIds, currentId) {
    for (const id2 of liveIds) {
      seenIds.add(id2);
    }
    for (const id2 of this.payloads.keys()) {
      if (seenIds.has(id2) && !liveIds.has(id2) && id2 !== currentId) {
        this.payloads.delete(id2);
        this.consumedPayloadKeys.delete(id2);
      }
    }
  }
}
const FILE_CHANGE_DEBOUNCE_MS = 150;
function assetInfoToCanvasItem(asset, fileUrlById) {
  if (!asset.id) return void 0;
  const meta2 = assetInfoToAssetMeta(asset, fileUrlById);
  return meta2
    ? {
        id: asset.id,
        meta: meta2,
      }
    : void 0;
}
export class HiloCanvasDataSource {
  constructor(httpClient, sessionStore, logger, persistenceInstanceId) {
    this.httpClient = httpClient;
    this.sessionStore = sessionStore;
    this.logger = logger;
    this.persistenceInstanceId = persistenceInstanceId;
  }
  /**
   * Active count of "canvas self-initiated add" sequences. While > 0, any
   * path-scoped reload event is downgraded to metadata-only (see
   * `downgradeSuppressedReload`).
   *
   * Why: paths like native-file drop, file-picker upload, clipboard paste,
   * and resource-panel drop all (a) write a file into the vault, which makes
   * the gateway synchronously emit a `created` asset_changed → the adapter
   * maps it to `requiresCanvasReload: true`, AND (b) immediately issue their
   * own `add-node` calls to place the node. The `created`-driven `load(false)`
   * lands mid-sequence, rebuilds the graph from `vault items (all present) +
   * canvas.json (only the nodes added so far)`, and synthesizes fresh
   * random-UUID nodes for the not-yet-added assets. The remaining `add-node`
   * broadcasts then arrive with DIFFERENT random UUIDs, so `applyIncremental`'s
   * id-based dedupe misses → the same asset lands twice → duplicate cards.
   *
   * The add-node WS broadcast is the canonical sync path for these nodes (see
   * `addCanvasAssetsAtPosition`), so the reload is purely redundant during the
   * window. We suppress by SESSION rather than by basename because the on-disk
   * name can differ from what the caller knows up front — `uniquePath` may
   * append `(1)` on a name collision, and upload emits its `created` before
   * the HTTP response hands us the real path — so a name-based match is both
   * racy and collision-blind. A session counter sidesteps both.
   */
  addSessionDepth = 0;
  /**
   * Open a reload-suppression session around a canvas self-initiated add
   * (import/upload/fork + add-node). Returns a disposer that MUST be called
   * once the add sequence settles (typically in a `finally`). A `ttlMs`
   * safety net auto-closes the session in case the disposer is dropped, so a
   * lost reference can never wedge reloads off permanently. Re-entrant:
   * overlapping sessions refcount, and the window closes only when the last
   * one ends.
   */
  beginCanvasAddSession(ttlMs = 5e3) {
    this.addSessionDepth += 1;
    let closed = false;
    let ttlHandle;
    const close2 = () => {
      if (closed) return;
      closed = true;
      if (ttlHandle !== void 0) clearTimeout(ttlHandle);
      this.addSessionDepth = Math.max(0, this.addSessionDepth - 1);
    };
    ttlHandle = setTimeout(close2, ttlMs);
    return close2;
  }
  /**
   * Downgrade a reload-requiring event to metadata-only while a canvas-add
   * session is open AND the event carries precise paths. A `broad` event (no
   * precise paths) is NEVER suppressed — it signals "something changed but we
   * don't know what" (e.g. an agent turn finishing), which a self-add window
   * never produces and which still needs a reload. Path-scoped events during
   * the window are exactly the redundant `created` echoes of our own writes,
   * so the only loss is a momentarily-deferred reload for an unrelated file
   * that happened to change while a session is open (bounded by the add's I/O
   * duration, or the TTL safety net) — self-healing on the next change, and
   * never affecting gateway-generated nodes (those ride the `canvas_updated`
   * broadcast, not this path).
   */
  downgradeSuppressedReload(event) {
    if (!event?.requiresCanvasReload) return event;
    if (this.addSessionDepth === 0) return event;
    const paths = event.paths;
    if (!paths || paths.length === 0) return event;
    return {
      ...event,
      requiresCanvasReload: false,
    };
  }
  async loadItems(signal) {
    const allAssetsRes = await this.httpClient.getAllAssets({
      signal,
    });
    const items = [];
    for (const a2 of allAssetsRes.assets) {
      const item = assetInfoToCanvasItem(a2, this.httpClient.fileUrlById.bind(this.httpClient));
      if (item) items.push(item);
    }
    return items;
  }
  async loadCanvas(signal) {
    try {
      return await this.httpClient.getCanvas({
        signal,
      });
    } catch (error) {
      const isAbort = error instanceof Error && error.type === "abort";
      if (!isAbort) {
        const message2 = error instanceof Error ? error.message : String(error);
        void Promise.resolve(
          this.logger?.error(`[CanvasData] canvas load failed: ${message2}`),
        ).catch(() => void 0);
      }
      throw error;
    }
  }
  async saveCanvas(canvas, options) {
    return this.httpClient.saveCanvas(canvas, options);
  }
  async reportCanvasRecovery(report) {
    await this.httpClient.reportCanvasRecovery?.(report);
  }
  onCanvasUpdated(callback) {
    return this.sessionStore.onCanvasUpdated(callback);
  }
  onCanvasFocus(callback) {
    if (!this.sessionStore.onCanvasFocus) {
      return () => {};
    }
    return this.sessionStore.onCanvasFocus(callback);
  }
  onCanvasNodeGenerating(callback) {
    if (!this.sessionStore.onCanvasNodeGenerating) {
      return () => {};
    }
    return this.sessionStore.onCanvasNodeGenerating(callback);
  }
  onFileChanged(callback) {
    let timer2;
    let pendingEvent;
    const debounced = (event) => {
      pendingEvent = mergeFileChangeEvents(pendingEvent, this.downgradeSuppressedReload(event));
      if (timer2 !== void 0) clearTimeout(timer2);
      timer2 = setTimeout(() => {
        timer2 = void 0;
        const next2 = pendingEvent;
        pendingEvent = void 0;
        callback(next2);
      }, FILE_CHANGE_DEBOUNCE_MS);
    };
    const unsubFile = this.sessionStore.onFileChanged((event) =>
      debounced(
        event ?? {
          requiresCanvasReload: true,
          broad: true,
        },
      ),
    );
    const unsubAsset =
      this.sessionStore.onAssetChanged?.((event) =>
        debounced(assetEventToFileChangeEvent(event)),
      ) ?? (() => {});
    return () => {
      if (timer2 !== void 0) {
        clearTimeout(timer2);
        timer2 = void 0;
      }
      pendingEvent = void 0;
      unsubFile();
      unsubAsset();
    };
  }
  resolveFileUrl(path2) {
    return this.httpClient.fileUrl(path2);
  }
  resolveFileUrlById(assetId) {
    return this.httpClient.fileUrlById(assetId);
  }
}
function assetEventToFileChangeEvent(event) {
  if (event.type === "assets_changed_batch") {
    return event.events
      .map(assetEventToFileChangeEvent)
      .reduce((acc, next2) => mergeFileChangeEvents(acc, next2) ?? acc, {
        requiresCanvasReload: false,
        paths: [],
      });
  }
  const path2 = event.path ?? event.asset?.path;
  const paths = path2 ? [path2] : void 0;
  return {
    requiresCanvasReload: true,
    paths,
    broad: paths === void 0,
  };
}
function mergeFileChangeEvents(left, right) {
  if (!left) return right;
  if (!right) return left;
  const paths = new Set();
  for (const path2 of left.paths ?? []) paths.add(path2);
  for (const path2 of right.paths ?? []) paths.add(path2);
  return {
    requiresCanvasReload: left.requiresCanvasReload || right.requiresCanvasReload,
    paths: paths.size > 0 ? Array.from(paths) : void 0,
    broad: left.broad || right.broad,
  };
}
async function fetchUpstream(gatewayFetch2, assetId, depth2) {
  const url2 = depth2
    ? `${API_PATHS.dependenciesUpstream(assetId)}?depth=${depth2}`
    : API_PATHS.dependenciesUpstream(assetId);
  const res = await gatewayFetch2(url2);
  return res.json();
}
async function fetchDownstream(gatewayFetch2, assetId, depth2) {
  const url2 = depth2
    ? `${API_PATHS.dependenciesDownstream(assetId)}?depth=${depth2}`
    : API_PATHS.dependenciesDownstream(assetId);
  const res = await gatewayFetch2(url2);
  return res.json();
}
async function fetchInputs(gatewayFetch2, assetId) {
  const res = await gatewayFetch2(API_PATHS.dependenciesInputs(assetId));
  return res.json();
}
export function useAssetLineage(assetId, options) {
  const gatewayFetch2 = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  const enabled = (options?.enabled ?? true) && !!assetId;
  return useQuery({
    queryKey: assetLineageQueryKey.upstream(assetId ?? "", options?.depth, scopeKey),
    queryFn: () => fetchUpstream(gatewayFetch2, assetId, options?.depth),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    // WS event drives invalidation
  });
}
export function useAssetDescendants(assetId, options) {
  const gatewayFetch2 = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  const enabled = (options?.enabled ?? true) && !!assetId;
  return useQuery({
    queryKey: assetLineageQueryKey.downstream(assetId ?? "", options?.depth, scopeKey),
    queryFn: () => fetchDownstream(gatewayFetch2, assetId, options?.depth),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
export function useAssetInputs(assetId, options) {
  const gatewayFetch2 = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  const enabled = !!assetId;
  return useQuery({
    queryKey: assetLineageQueryKey.inputs(assetId ?? "", scopeKey),
    queryFn: () => fetchInputs(gatewayFetch2, assetId),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
export function WSConnectionProviderCore({
  children: children2,
  wsUrl,
  scope,
  syncCanvasAssetMetadata = true,
}) {
  const queryClient2 = useQueryClient();
  const assetMetadataStore = useAssetMetadataApi();
  const gatewayScopeKey = useGatewayScopeKey();
  const { gatewayBinding, gatewayReady, recoverWorkspace, workspaceClaim } = useGatewayScope();
  const gatewayFetch2 = useGatewayFetch();
  const gatewayUrl2 = useGatewayUrl();
  const resolvedWsUrl = reactExports.useMemo(() => buildWSUrl(wsUrl), [wsUrl]);
  const [connected, setConnected] = reactExports.useState(false);
  const subscribersRef = reactExports.useRef(new Set());
  const wsRef = reactExports.useRef(null);
  const syncCanvasAssetMetadataRef = reactExports.useRef(syncCanvasAssetMetadata);
  syncCanvasAssetMetadataRef.current = syncCanvasAssetMetadata;
  const queryClientRef = reactExports.useRef(queryClient2);
  queryClientRef.current = queryClient2;
  const assetMetadataStoreRef = reactExports.useRef(assetMetadataStore);
  assetMetadataStoreRef.current = assetMetadataStore;
  const gatewayFetchRef = reactExports.useRef(gatewayFetch2);
  gatewayFetchRef.current = gatewayFetch2;
  reactExports.useEffect(() => {
    if (scope !== "workspace") return;
    assetMetadataStore.setState((state2) => {
      const assets = rebindWorkspaceAssetMetadataUrls(state2.assets, gatewayUrl2);
      return assets === state2.assets
        ? state2
        : {
            ...state2,
            assets,
          };
    });
  }, [assetMetadataStore, gatewayUrl2, scope]);
  reactExports.useEffect(() => {
    let connectStart = 0;
    let wasConnected = false;
    let lastAssetStateBreadcrumbAt = 0;
    const assetReplayInFlight = new Set();
    let failedAttempts = 0;
    trackEvent(TRACK_EVENTS.WS_CONNECT_START, {});
    connectStart = Date.now();
    const syncAssetMeta = (assetId, asset) => {
      if (!syncCanvasAssetMetadataRef.current) return;
      const metaStore = assetMetadataStoreRef.current.getState();
      const existing = metaStore.get(assetId);
      if (!existing) return;
      const nextMeta = assetInfoToAssetMeta(asset, () => existing.url);
      if (!nextMeta) return;
      const next2 = {
        ...existing,
        ...nextMeta,
        url: existing.url,
      };
      const assetLevelChanged =
        existing.name !== next2.name ||
        existing.path !== next2.path ||
        JSON.stringify(existing.tagIds) !== JSON.stringify(next2.tagIds);
      if (
        assetLevelChanged ||
        existing.prompt !== next2.prompt ||
        existing.description !== next2.description ||
        existing.model !== next2.model ||
        existing.backend !== next2.backend ||
        existing.model_id !== next2.model_id ||
        existing.source_tool !== next2.source_tool ||
        existing.cloudTraceId !== next2.cloudTraceId ||
        existing.cloudTaskId !== next2.cloudTaskId ||
        JSON.stringify(existing.params) !== JSON.stringify(next2.params) ||
        JSON.stringify(existing.referenceImageIds) !== JSON.stringify(next2.referenceImageIds) ||
        JSON.stringify(existing.referenceAudioIds) !== JSON.stringify(next2.referenceAudioIds) ||
        JSON.stringify(existing.referenceVideoIds) !== JSON.stringify(next2.referenceVideoIds) ||
        JSON.stringify(existing.referenceTextIds) !== JSON.stringify(next2.referenceTextIds) ||
        existing.width !== next2.width ||
        existing.height !== next2.height ||
        existing.durationSec !== next2.durationSec ||
        existing.fileSize !== next2.fileSize
      ) {
        if (assetLevelChanged) {
          metaStore.mergeAsset(assetId, {
            name: next2.name,
            path: next2.path,
            tagIds: next2.tagIds,
          });
        }
        metaStore.set(assetId, next2);
      }
    };
    const recordAssetStateBreadcrumb = (reason) => {
      const now2 = Date.now();
      if (
        reason !== "resync" &&
        now2 - lastAssetStateBreadcrumbAt < ASSET_STATE_BREADCRUMB_INTERVAL_MS
      ) {
        return;
      }
      lastAssetStateBreadcrumbAt = now2;
      void window.hilo?.diagnostics
        ?.addBreadcrumb?.("network", "asset-events: state", {
          reason,
          assetEventState: getAssetEventStateSnapshot(),
        })
        .catch(() => {});
    };
    const replayAssetChangesOrFallbackOnce = async (request) => {
      const replayKey = `${request.workspaceId}:${request.eventEpoch ?? ""}:${request.afterSeq}`;
      if (assetReplayInFlight.has(replayKey)) return;
      assetReplayInFlight.add(replayKey);
      try {
        await replayAssetChangesOrFallback({
          qc: queryClientRef.current,
          gatewayScopeKey,
          gatewayFetch: gatewayFetchRef.current,
          request,
          syncAssetMeta,
          onReplayApplied: () => recordAssetStateBreadcrumb("batch"),
          onFallbackResync: () => recordAssetStateBreadcrumb("resync"),
        });
      } finally {
        assetReplayInFlight.delete(replayKey);
      }
    };
    const hiloLogger = window.hilo?.logger;
    const wsLogger = hiloLogger
      ? {
          info: (m3) => hiloLogger.info(m3, "chat"),
          warn: (m3) => hiloLogger.warn(m3, "chat"),
          error: (m3) => hiloLogger.error(m3, "chat"),
        }
      : void 0;
    const ws2 = new AgentWSClient({
      url: resolvedWsUrl,
      workspaceClaim,
      workspaceBinding: gatewayBinding,
      onWorkspaceIdentityMismatch: () => {
        void recoverWorkspace?.();
      },
      // The client URL is pinned at construction. When the gateway respawned
      // on a NEW port (crash recovery, idle-suspend resume while this window
      // stayed open), retrying the old port can never succeed and no 1008
      // arrives (dead port → 1006). Re-resolve the runtime binding after a few
      // consecutive failures: recoverWorkspace resumes a suspended runtime /
      // refreshes the binding, and the provider rebuilds this client with the
      // fresh URL. Single-flighted by the workspace host, so the periodic
      // calls during a long outage stay cheap.
      onPersistentDisconnect: () => {
        void recoverWorkspace?.();
      },
      logger: wsLogger,
      onMessage: (msg) => {
        if (msg.type === "open_remote_tool" || msg.type === "close_remote_tool") {
          remoteToolLog.info("ws-connection received", {
            msg_type: msg.type,
            tool_name: "tool_name" in msg ? msg.tool_name : null,
            session_id: "session_id" in msg ? (msg.session_id ?? null) : null,
            subscriber_count: subscribersRef.current.size,
          });
        }
        if (msg.type === "asset_changed") {
          const result = invalidateAssetQueries({
            qc: queryClientRef.current,
            gatewayScopeKey,
            msg,
            syncAssetMeta,
            resyncMode: "defer",
            onResyncNeeded: (request) => {
              void replayAssetChangesOrFallbackOnce(request);
            },
          });
          recordAssetStateBreadcrumb(result === "resync" ? "resync" : "sample");
        } else if (msg.type === "assets_changed_batch") {
          const result = invalidateAssetBatchQueries({
            qc: queryClientRef.current,
            gatewayScopeKey,
            msg,
            syncAssetMeta,
            resyncMode: "defer",
            onResyncNeeded: (request) => {
              void replayAssetChangesOrFallbackOnce(request);
            },
          });
          recordAssetStateBreadcrumb(result === "resync" ? "resync" : "batch");
        }
        if (msg.type === CANVAS_TAG_REGISTRY_CHANGED_MESSAGE_TYPE) {
          queryClientRef.current.setQueryData(
            canvasTagRegistryQueryKey(gatewayScopeKey),
            msg.registry,
          );
        }
        if (msg.type === "dependency_changed") {
          invalidateAssetLineageQueries(
            queryClientRef.current,
            msg.child_id,
            msg.parent_id,
            gatewayScopeKey,
          );
        }
        for (const handler of subscribersRef.current) {
          try {
            handler(msg);
          } catch (err) {
            console.error("[WSConnection] subscriber error:", err);
          }
        }
      },
      onConnectionChange: (next2) => {
        if (next2 && !wasConnected) {
          trackEvent(TRACK_EVENTS.WS_CONNECT_SUCCESS, {
            duration_ms: Date.now() - connectStart,
          });
          wasConnected = true;
          failedAttempts = 0;
          resetAssetSeqState(gatewayScopeKey);
          requestAssetWorkspaceResync({
            qc: queryClientRef.current,
            gatewayScopeKey,
            reason: "reconnect",
          });
          if (scope === "workspace") {
            void queryClientRef.current.invalidateQueries({
              queryKey: canvasTagRegistryQueryKey(gatewayScopeKey),
            });
          }
        } else if (!next2 && wasConnected) {
          trackEvent(TRACK_EVENTS.WS_DISCONNECT, {});
          wasConnected = false;
          connectStart = Date.now();
          trackEvent(TRACK_EVENTS.WS_RECONNECT, {});
          failedAttempts = 0;
        } else if (!next2 && !wasConnected) {
          failedAttempts += 1;
          const isPowerOfTwo = (failedAttempts & (failedAttempts - 1)) === 0;
          if (isPowerOfTwo) {
            trackEvent(TRACK_EVENTS.WS_CONNECT_FAILED, {
              duration_ms: Date.now() - connectStart,
              error_type: "network",
              attempt: failedAttempts,
            });
          }
          connectStart = Date.now();
        }
        setConnected(next2);
      },
    });
    wsRef.current = ws2;
    ws2.connect();
    return () => {
      ws2.disconnect();
      resetAssetSeqState(gatewayScopeKey);
      wsRef.current = null;
    };
  }, [gatewayBinding, gatewayScopeKey, recoverWorkspace, resolvedWsUrl, scope, workspaceClaim]);
  reactExports.useEffect(() => {
    if (gatewayReady) wsRef.current?.reconnectNow();
  }, [gatewayReady]);
  const send2 = reactExports.useCallback(
    (msg) => {
      if (scope === "workspace") {
        const submissionKind = guardedSubmissionKind(msg);
        if (submissionKind && !guardAccountSubmission(submissionKind).allowed) return false;
      }
      return wsRef.current?.send(msg) ?? false;
    },
    [scope],
  );
  const subscribe2 = reactExports.useCallback((handler) => {
    subscribersRef.current.add(handler);
    return () => {
      subscribersRef.current.delete(handler);
    };
  }, []);
  const value = reactExports.useMemo(
    () => ({
      scope,
      wsUrl: resolvedWsUrl,
      connected,
      send: send2,
      subscribe: subscribe2,
    }),
    [scope, resolvedWsUrl, connected, send2, subscribe2],
  );
  return <WSConnectionContext.Provider value={value}>{children2}</WSConnectionContext.Provider>;
}
