// local-connector-setup-content.jsx
import {
  Check,
  CircleAlert,
  connectorSummaryActionLabelKey,
  dedupedToast,
  focusManager,
  isCancelledError,
  jsxRuntimeExports,
  Loader2,
  queryOptions,
  reactExports,
  usePlatform,
  useQueries,
  useTranslation,
} from "../vendor.js";
import { Icon, openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button$1, cn$2, DialogHeader } from "../infra/dialog-content.jsx";
import { queryClient } from "../assets/wrap-as-asset-center-error.js";
import { homeService } from "../workspace/home-service.jsx";
import {
  ConnectorDetailNotice,
  ConnectorSummaryAction,
} from "./connector-summary-action.jsx";
import { ConnectorDialogScrollableBody } from "./request-prompt-prefill.jsx";
import { Download } from "../media-editing/package.jsx";
import {
  Badge,
  DialogDescription,
  DialogTitle,
} from "../infra/badge-variants.jsx";
import {
  CDN_BLENDER_INSTALLER_MACOS_ARM64,
  CDN_BLENDER_INSTALLER_WINDOWS_X64,
} from "../workspace/context-menu-content.jsx";
import { ConnectorRelationshipGraphic } from "./connector-relationship-graphic.jsx";
import { IntegrationStatusPill } from "./integration-status-pill.jsx";
import { connectorTitle } from "./make-async-image-task.jsx";
import { ConnectorStatusPill } from "./connector-prompt-action.jsx";

const POLL_INTERVAL_MS$1 = 3e4;

const QUERY_KEY = ["local-connector-host-status"];

const hostQueryKey = (name2) => [...QUERY_KEY, name2];

function requiresLiveHostStatus(connectorId) {
  return connectorId === "nuke";
}

function createLocalConnectorHostStatusTracker(
  service2,
  client2 = queryClient,
) {
  const configurations = new Map();
  const installations = new Map();
  const options = (name2) =>
    queryOptions({
      queryKey: hostQueryKey(name2),
      queryFn: async () => ({
        status: await service2.status(name2),
      }),
      staleTime: POLL_INTERVAL_MS$1,
      gcTime: Number.POSITIVE_INFINITY,
      retry: false,
      networkMode: "always",
      enabled: () => !installations.has(name2) && focusManager.isFocused(),
      refetchInterval: () =>
        installations.has(name2) ? false : POLL_INTERVAL_MS$1,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
      refetchOnReconnect: false,
    });
  const invalidate = (name2) => {
    const installation = installations.get(name2);
    if (installation) installation.invalidated = true;
    void client2.cancelQueries({
      queryKey: hostQueryKey(name2),
      exact: true,
    });
    client2.setQueryData(hostQueryKey(name2), {});
    void client2.invalidateQueries({
      queryKey: hostQueryKey(name2),
      exact: true,
      refetchType: "none",
    });
  };
  const refresh = async (name2, force = false) => {
    if (installations.has(name2)) return void 0;
    try {
      const result = await client2.fetchQuery({
        ...options(name2),
        staleTime: force ? 0 : POLL_INTERVAL_MS$1,
      });
      return result.status;
    } catch {
      return void 0;
    }
  };
  const configure2 = (server) => {
    const fingerprint = JSON.stringify([
      server.enabled,
      server.transport,
      server.endpoint,
      server.runtimeName,
    ]);
    const previous2 = configurations.get(server.name);
    configurations.set(server.name, fingerprint);
    if (previous2 !== void 0 && previous2 !== fingerprint) {
      invalidate(server.name);
      void refresh(server.name, true);
      return true;
    }
    return false;
  };
  const remove2 = (name2) => {
    configurations.delete(name2);
    invalidate(name2);
  };
  return {
    client: client2,
    options,
    getSnapshot() {
      return Object.fromEntries(
        client2
          .getQueryCache()
          .findAll({
            queryKey: QUERY_KEY,
          })
          .map((query) => {
            const state2 = client2.getQueryState(query.queryKey);
            return [
              query.queryKey[1],
              {
                status: state2?.data?.status,
                ...(state2?.status === "error"
                  ? {
                      queryFailed: true,
                    }
                  : {}),
              },
            ];
          }),
      );
    },
    refresh,
    async preflight(name2) {
      const pending2 = client2.getQueryCache().find({
        queryKey: hostQueryKey(name2),
        exact: true,
      });
      if (pending2?.state.fetchStatus === "fetching") {
        try {
          const result = await pending2.promise;
          if (result?.preflight) return result.preflight;
        } catch (error) {
          if (isCancelledError(error)) return void 0;
        }
      }
      if (installations.has(name2)) return void 0;
      try {
        const result = await client2.fetchQuery({
          ...options(name2),
          staleTime: 0,
          queryFn: async () => {
            const preflight = await service2.preflight(name2);
            return {
              status: preflight.status,
              preflight,
            };
          },
        });
        return result.preflight;
      } catch {
        return void 0;
      }
    },
    invalidate,
    configure: configure2,
    remove: remove2,
    reconcile(servers) {
      const names = new Set(servers.map((server) => server.name));
      for (const name2 of configurations.keys()) {
        if (!names.has(name2)) remove2(name2);
      }
      for (const server of servers) configure2(server);
    },
    beginInstallation(name2) {
      void client2.cancelQueries({
        queryKey: hostQueryKey(name2),
        exact: true,
      });
      const installation = {
        invalidated: false,
      };
      installations.set(name2, installation);
      const previous2 = client2.getQueryData(hostQueryKey(name2))?.status;
      client2.setQueryData(hostQueryKey(name2), {
        status: {
          connectorId: previous2?.connectorId ?? name2,
          packageStaged: previous2?.packageStaged ?? false,
          packageUsable: previous2?.packageUsable ?? false,
          updateAvailable: previous2?.updateAvailable ?? false,
          connectorConfigured: previous2?.connectorConfigured ?? false,
          state: "installing",
        },
      });
      return (status) => {
        if (installations.get(name2) !== installation) return;
        installations.delete(name2);
        if (status && !installation.invalidated) {
          client2.setQueryData(hostQueryKey(name2), {
            status,
          });
        } else {
          invalidate(name2);
          void refresh(name2, true);
        }
      };
    },
    reset() {
      client2.removeQueries({
        queryKey: QUERY_KEY,
      });
      configurations.clear();
      installations.clear();
    },
  };
}

const localConnectorHostStatus = createLocalConnectorHostStatusTracker({
  status: (name2) => homeService.connector.status(name2),
  preflight: (name2) => homeService.connector.preflight(name2),
});

function useLocalConnectorHostStatus(
  names,
  tracker2 = localConnectorHostStatus,
) {
  const queries = useQueries(
    {
      queries: names.map(tracker2.options),
    },
    tracker2.client,
  );
  return Object.fromEntries(
    names.map((name2, index2) => [
      name2,
      {
        status: queries[index2].data?.status,
        ...(queries[index2].isError
          ? {
              queryFailed: true,
            }
          : {}),
      },
    ]),
  );
}

function localConnectorHostDisplayState(snapshot2) {
  if (snapshot2?.status?.state === "installing") return "installing";
  if (snapshot2?.queryFailed) return "saved";
  if (snapshot2?.status?.runtimeState === "disabled") return "disabled";
  if (
    snapshot2?.status?.runtimeState === "failed" ||
    snapshot2?.status?.runtimeState === "partial"
  )
    return "saved";
  if (!snapshot2?.status) return "checking";
  if (snapshot2.status.state === "connected") return "connected";
  return "notConnected";
}

const PROBE_INTERVAL_MS = 3e3;

const connectorStepLineClassName =
  "absolute left-1/2 w-[1px] -translate-x-1/2 bg-[repeating-linear-gradient(to_bottom,var(--muted-foreground)_0,var(--muted-foreground)_1px,transparent_1px,transparent_3px)]";

function LocalConnectorPreparationStatus({
  state: state2,
  connectorName,
  onRetry,
}) {
  const { t: t2 } = useTranslation();
  if (state2 === "skipped") return null;
  const labelKey = `connectors.connector.prepare.${state2}`;
  const icon = state2 === "checking" ? Loader2 : CircleAlert;
  const isUnsupported = state2 === "unsupported";
  return (
    <div
      role={isUnsupported ? "alert" : "status"}
      className={cn$2(
        "mt-2 flex min-h-7 items-start justify-between gap-2 rounded-md bg-secondary px-2.5 py-1 text-xs leading-5 text-foreground/70",
        isUnsupported && "text-destructive",
      )}
      data-action-ui-id="connector-local-preparation-status"
      data-preparation-state={state2}
    >
      <div className="flex min-w-0 items-start gap-1.5">
        <Icon
          icon={icon}
          size="sm"
          strokeWidth={1.5}
          className={cn$2(
            "mt-0.5 shrink-0",
            state2 === "checking" && "animate-spin",
          )}
          aria-hidden={true}
        />
        <span>
          {t2(labelKey, {
            name: connectorName,
          })}
        </span>
      </div>
      {state2 === "error" ? (
        <Button$1
          type="button"
          variant="ghost"
          size="xs"
          className="-my-1 shrink-0 font-normal"
          onClick={onRetry}
          data-action-ui-id="connector-local-preparation-retry"
        >
          {t2("connectors.connector.prepare.retry")}
        </Button$1>
      ) : null}
    </div>
  );
}

function LocalConnectorStep({
  ordinal,
  title,
  first: first2 = false,
  last: last2 = false,
  completed = false,
  action,
  children: children2,
}) {
  const { t: t2 } = useTranslation();
  return (
    <section
      className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2"
      data-layout-slot="connector-local-step"
      data-step={ordinal}
      data-step-state={completed ? "complete" : "active"}
    >
      <div className="relative flex justify-center pt-4">
        {!first2 ? (
          <span
            aria-hidden={true}
            className={cn$2(connectorStepLineClassName, "top-0 h-4")}
            data-layout-slot="connector-local-step-line"
          />
        ) : null}
        <span
          aria-hidden={true}
          className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-xs font-medium leading-none text-foreground"
          data-layout-slot="connector-local-step-node"
        >
          {t2(`connectors.stepOrdinal.${ordinal}`)}
        </span>
        {!last2 ? (
          <span
            aria-hidden={true}
            className={cn$2(connectorStepLineClassName, "top-10 bottom-0")}
            data-layout-slot="connector-local-step-line"
          />
        ) : null}
      </div>
      <div
        className={cn$2("min-w-0 py-4", completed && !children2 && "py-3.5")}
      >
        <div className="flex min-w-0 items-center justify-between gap-3">
          <h3 className="min-w-0 text-sm font-medium text-foreground">
            {title}
          </h3>
          <div className="flex shrink-0 items-center gap-2">
            {completed ? (
              <Icon
                icon={Check}
                size="sm"
                className="text-muted-foreground"
                aria-hidden={true}
              />
            ) : null}
            {action}
          </div>
        </div>
        {children2 ? (
          <div
            className="mt-3 min-w-0"
            data-layout-slot="connector-local-step-content"
          >
            {children2}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function LocalConnectorSetupContent({
  connectorId,
  displayName: displayName2,
  serverName,
  iconUrl,
  onClose,
  onInstalled,
  setupUrl,
}) {
  const { t: t2, i18n } = useTranslation();
  const targetName = serverName ?? connectorId;
  const platform2 = usePlatform();
  const [legacyStatus, setStatus] = reactExports.useState();
  const [installing, setInstalling] = reactExports.useState(false);
  const [preparationState, setPreparationState] =
    reactExports.useState("checking");
  const liveHostStatus = requiresLiveHostStatus(connectorId);
  const hostStatuses = useLocalConnectorHostStatus(
    liveHostStatus && preparationState !== "checking" ? [targetName] : [],
  );
  const status = liveHostStatus
    ? hostStatuses[targetName]?.status
    : legacyStatus;
  const hostDisplayState = localConnectorHostDisplayState(
    hostStatuses[targetName],
  );
  const hostQueryFailed =
    liveHostStatus && hostStatuses[targetName]?.queryFailed === true;
  const [installError, setInstallError] = reactExports.useState();
  const [openingSetup, setOpeningSetup] = reactExports.useState(false);
  const [_setupError, setSetupError] = reactExports.useState(false);
  const closed = reactExports.useRef(false);
  const refresh = reactExports.useCallback(async () => {
    if (liveHostStatus)
      return localConnectorHostStatus.refresh(targetName, true);
    try {
      const next2 = await homeService.connector.status(targetName);
      if (!closed.current) setStatus(next2);
      return next2;
    } catch {
      return void 0;
    }
  }, [liveHostStatus, targetName]);
  const checkPreparation = reactExports.useCallback(async () => {
    setPreparationState("checking");
    try {
      const result = liveHostStatus
        ? await localConnectorHostStatus.preflight(targetName)
        : await homeService.connector.preflight(targetName);
      if (closed.current) return;
      if (!result) {
        setPreparationState("error");
        return;
      }
      setStatus(result.status);
      if (!result.platformSupported) {
        setPreparationState("unsupported");
        return;
      }
      setPreparationState("skipped");
    } catch {
      await refresh();
      if (!closed.current) setPreparationState("error");
    }
  }, [liveHostStatus, refresh, targetName]);
  reactExports.useEffect(() => {
    closed.current = false;
    void checkPreparation();
    const timer2 = liveHostStatus
      ? void 0
      : setInterval(() => void refresh(), PROBE_INTERVAL_MS);
    return () => {
      closed.current = true;
      clearInterval(timer2);
    };
  }, [checkPreparation, liveHostStatus, refresh]);
  reactExports.useEffect(() => {
    if (liveHostStatus) {
      if (hostDisplayState !== "connected" || preparationState === "checking")
        return;
    } else if (status?.state !== "connected") return;
    onClose();
  }, [
    hostDisplayState,
    liveHostStatus,
    onClose,
    preparationState,
    status?.state,
  ]);
  const installInProgress = installing || status?.state === "installing";
  const handleInstall = async () => {
    if (installInProgress || preparationState === "unsupported") return;
    if (liveHostStatus && preparationState === "checking") return;
    if (hostQueryFailed) return;
    setInstalling(true);
    setInstallError(void 0);
    const finishInstallation = liveHostStatus
      ? localConnectorHostStatus.beginInstallation(targetName)
      : void 0;
    let installedStatus;
    try {
      const result = await homeService.connector.install(targetName);
      if (result.ok) {
        installedStatus = result.status;
        finishInstallation?.(result.status);
      }
      if (result.ok) onInstalled();
      if (closed.current) return;
      if (result.ok) {
        setStatus(result.status);
        if (
          liveHostStatus &&
          localConnectorHostDisplayState({
            status: result.status,
          }) === "saved"
        ) {
          dedupedToast.error(t2("connectors.runtimeState.failed"));
        } else
          dedupedToast.success(
            t2(
              result.status.state === "connected"
                ? "connectors.connector.installedConnected"
                : "connectors.connector.installedWaiting",
            ),
          );
      } else {
        const reason = t2(`connectors.connector.error.${result.code}`, {
          name: connectorTitle(
            t2,
            i18n?.language ?? "en",
            connectorId,
            displayName2,
          ),
        });
        setInstallError(
          result.message ? `${reason}: ${result.message.trim()}` : reason,
        );
      }
    } catch {
      if (!closed.current)
        setInstallError(t2("connectors.customDialog.error.requestFailed"));
    } finally {
      if (!installedStatus) finishInstallation?.();
      if (!closed.current) setInstalling(false);
    }
  };
  const state2 = installInProgress
    ? "installing"
    : liveHostStatus &&
        (hostDisplayState === "saved" || hostDisplayState === "disabled")
      ? hostDisplayState
      : (status?.state ?? (liveHostStatus ? "checking" : "not_installed"));
  const connected = state2 === "connected";
  const connectorName = connectorTitle(
    t2,
    i18n?.language ?? "en",
    connectorId,
    displayName2,
  );
  const installStepTitle = t2("connectors.connector.step.install");
  const prepareSecondaryKey =
    connectorId === "illustrator"
      ? "connectors.connector.prepare.illustrator"
      : connectorId === "touchdesigner"
        ? "connectors.connector.prepare.componentPackage"
        : "connectors.connector.prepare.inAppActivation";
  const blenderInstallerUrl =
    platform2.app?.os === "win32"
      ? CDN_BLENDER_INSTALLER_WINDOWS_X64
      : platform2.app?.os === "darwin" &&
          (platform2.app.arch === "arm64" ||
            platform2.app.runningUnderARM64Translation === true)
        ? CDN_BLENDER_INSTALLER_MACOS_ARM64
        : void 0;
  return (
    <>
      <DialogHeader className="shrink-0 items-center px-4 pt-8 text-center sm:px-6">
        <ConnectorRelationshipGraphic targetIconUrl={iconUrl} />
      </DialogHeader>
      <ConnectorDialogScrollableBody>
        <div className="px-4 pb-5 sm:px-6">
          <DialogHeader className="mt-4 items-center gap-2 text-center">
            <DialogTitle className="font-heading text-lg font-medium text-foreground">
              {t2("connectors.connector.setupTitle", {
                name: connectorName,
              })}
            </DialogTitle>
            <div
              className="flex items-center justify-center gap-1.5"
              data-layout-slot="connector-local-title-status"
            >
              <span data-action-ui-id={`connector-${connectorId}-state`}>
                {liveHostStatus ? (
                  <ConnectorStatusPill state={hostDisplayState} />
                ) : (
                  <IntegrationStatusPill
                    label={t2(`connectors.connector.state.${state2}`)}
                    tone={connected ? "neutral" : "muted"}
                    markerTone={
                      connected
                        ? "success"
                        : state2 === "installing"
                          ? "warning"
                          : "muted"
                    }
                    markerActive={state2 === "installing"}
                    markerLabel={t2(`connectors.connector.state.${state2}`)}
                  />
                )}
              </span>
              {status?.updateAvailable ? (
                <Badge
                  variant="info"
                  data-action-ui-id={`connector-${connectorId}-update-available`}
                >
                  {t2("connectors.connector.updateAvailable")}
                </Badge>
              ) : null}
            </div>
          </DialogHeader>
          <div
            className="mt-4 rounded-[10px] bg-secondary/60 px-3 pb-3"
            data-layout-slot="connector-local-steps-surface"
          >
            <DialogDescription
              className="px-3 pt-3 text-xs leading-relaxed font-medium text-muted-foreground"
              data-layout-slot="connector-local-steps-eyebrow"
            >
              {t2("connectors.connector.setupDescription")}
            </DialogDescription>
            <div className="w-full" data-layout-slot="connector-local-steps">
              <LocalConnectorStep
                ordinal={1}
                title={t2("connectors.connector.step.prepare", {
                  name: connectorName,
                })}
                first={true}
                completed={installInProgress}
                last={false}
              >
                {!installInProgress ? (
                  <div
                    className="space-y-1"
                    data-action-ui-id={`connector-${connectorId}-install-hint`}
                    data-content-structure="primary-secondary"
                  >
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      {t2("connectors.connector.prepare.primary", {
                        name: connectorName,
                      })}
                    </p>
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      {t2(prepareSecondaryKey, {
                        name: connectorName,
                      })}
                    </p>
                    <LocalConnectorPreparationStatus
                      state={
                        hostQueryFailed && preparationState !== "checking"
                          ? "error"
                          : preparationState
                      }
                      connectorName={connectorName}
                      onRetry={() => void checkPreparation()}
                    />
                    {connectorId === "blender" && blenderInstallerUrl ? (
                      <Button$1
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="mt-2 -ml-2 font-normal text-foreground underline underline-offset-2"
                        onClick={() => {
                          void openExternalUrl(platform2, blenderInstallerUrl, {
                            source: "connector-blender-download",
                          });
                        }}
                        data-action-ui-id="connector-blender-download"
                      >
                        <Icon icon={Download} size="xs" aria-hidden={true} />
                        {t2("connectors.connector.downloadHostApp.blender")}
                      </Button$1>
                    ) : null}
                  </div>
                ) : null}
              </LocalConnectorStep>
              <LocalConnectorStep
                ordinal={2}
                title={installStepTitle}
                completed={false}
                last={true}
              >
                <div className="flex justify-center">
                  <ConnectorSummaryAction
                    mode="install"
                    label={t2(connectorSummaryActionLabelKey.install)}
                    disabled={
                      installInProgress ||
                      hostQueryFailed ||
                      preparationState === "unsupported" ||
                      (liveHostStatus && preparationState === "checking") ||
                      !status
                    }
                    loading={installInProgress}
                    onClick={() => void handleInstall()}
                    data-action-ui-id={`connector-${connectorId}-install`}
                  />
                </div>
                {installError ? (
                  <div className="mt-3">
                    <ConnectorDetailNotice
                      description={installError}
                      tone="error"
                      actionUiId={`connector-${connectorId}-install-error`}
                    />
                  </div>
                ) : null}
              </LocalConnectorStep>
            </div>
          </div>
        </div>
      </ConnectorDialogScrollableBody>
    </>
  );
}
