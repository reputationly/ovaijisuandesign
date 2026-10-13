// local-connector-setup-content.jsx
import { Check, CircleAlert, connectorSummaryActionLabelKey, focusManager, isCancelledError, jsxRuntimeExports, Loader2, queryOptions, reactExports, usePlatform, useQueries, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { Icon, openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button, cn$2 as cn, DialogHeader } from "../infra/dialog-content.jsx";
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
const POLL_INTERVAL_MS = 3e4;
const QUERY_KEY = ["local-connector-host-status"];
const hostQueryKey = (connectorName) => [...QUERY_KEY, connectorName];
function requiresLiveHostStatus(connectorId) {
  return connectorId === "nuke";
}
function createLocalConnectorHostStatusTracker(
  service,
  client = queryClient,
) {
  const configurations = new Map();
  const installations = new Map();
  const options = (connectorName) =>
    queryOptions({
      queryKey: hostQueryKey(connectorName),
      queryFn: async () => ({
        status: await service.status(connectorName),
      }),
      staleTime: POLL_INTERVAL_MS,
      gcTime: Number.POSITIVE_INFINITY,
      retry: false,
      networkMode: "always",
      enabled: () => !installations.has(connectorName) && focusManager.isFocused(),
      refetchInterval: () =>
        installations.has(connectorName) ? false : POLL_INTERVAL_MS,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
      refetchOnReconnect: false,
    });
  const invalidate = (connectorName) => {
    const installation = installations.get(connectorName);
    if (installation) installation.invalidated = true;
    void client.cancelQueries({
      queryKey: hostQueryKey(connectorName),
      exact: true,
    });
    client.setQueryData(hostQueryKey(connectorName), {});
    void client.invalidateQueries({
      queryKey: hostQueryKey(connectorName),
      exact: true,
      refetchType: "none",
    });
  };
  const refresh = async (connectorName, force = false) => {
    if (installations.has(connectorName)) return void 0;
    try {
      const result = await client.fetchQuery({
        ...options(connectorName),
        staleTime: force ? 0 : POLL_INTERVAL_MS,
      });
      return result.status;
    } catch {
      return void 0;
    }
  };
  const configure = (server) => {
    const fingerprint = JSON.stringify([
      server.enabled,
      server.transport,
      server.endpoint,
      server.runtimeName,
    ]);
    const previous = configurations.get(server.name);
    configurations.set(server.name, fingerprint);
    if (previous !== void 0 && previous !== fingerprint) {
      invalidate(server.name);
      void refresh(server.name, true);
      return true;
    }
    return false;
  };
  const remove = (connectorName) => {
    configurations.delete(connectorName);
    invalidate(connectorName);
  };
  return {
    client,
    options,
    getSnapshot() {
      return Object.fromEntries(
        client
          .getQueryCache()
          .findAll({
            queryKey: QUERY_KEY,
          })
          .map((query) => {
            const state = client.getQueryState(query.queryKey);
            return [
              query.queryKey[1],
              {
                status: state?.data?.status,
                ...(state?.status === "error"
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
    async preflight(connectorName) {
      const pending = client.getQueryCache().find({
        queryKey: hostQueryKey(connectorName),
        exact: true,
      });
      if (pending?.state.fetchStatus === "fetching") {
        try {
          const result = await pending.promise;
          if (result?.preflight) return result.preflight;
        } catch (error) {
          if (isCancelledError(error)) return void 0;
        }
      }
      if (installations.has(connectorName)) return void 0;
      try {
        const result = await client.fetchQuery({
          ...options(connectorName),
          staleTime: 0,
          queryFn: async () => {
            const preflight = await service.preflight(connectorName);
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
    configure,
    remove,
    reconcile(servers) {
      const names = new Set(servers.map((server) => server.name));
      for (const connectorName of configurations.keys()) {
        if (!names.has(connectorName)) remove(connectorName);
      }
      for (const server of servers) configure(server);
    },
    beginInstallation(connectorName) {
      void client.cancelQueries({
        queryKey: hostQueryKey(connectorName),
        exact: true,
      });
      const installation = {
        invalidated: false,
      };
      installations.set(connectorName, installation);
      const previous = client.getQueryData(hostQueryKey(connectorName))?.status;
      client.setQueryData(hostQueryKey(connectorName), {
        status: {
          connectorId: previous?.connectorId ?? connectorName,
          packageStaged: previous?.packageStaged ?? false,
          packageUsable: previous?.packageUsable ?? false,
          updateAvailable: previous?.updateAvailable ?? false,
          connectorConfigured: previous?.connectorConfigured ?? false,
          state: "installing",
        },
      });
      return (status) => {
        if (installations.get(connectorName) !== installation) return;
        installations.delete(connectorName);
        if (status && !installation.invalidated) {
          client.setQueryData(hostQueryKey(connectorName), {
            status,
          });
        } else {
          invalidate(connectorName);
          void refresh(connectorName, true);
        }
      };
    },
    reset() {
      client.removeQueries({
        queryKey: QUERY_KEY,
      });
      configurations.clear();
      installations.clear();
    },
  };
}
const localConnectorHostStatus = createLocalConnectorHostStatusTracker({
  status: (connectorName) => homeService.connector.status(connectorName),
  preflight: (connectorName) => homeService.connector.preflight(connectorName),
});
function useLocalConnectorHostStatus(
  names,
  tracker = localConnectorHostStatus,
) {
  const queries = useQueries(
    {
      queries: names.map(tracker.options),
    },
    tracker.client,
  );
  return Object.fromEntries(
    names.map((connectorName, index) => [
      connectorName,
      {
        status: queries[index].data?.status,
        ...(queries[index].isError
          ? {
              queryFailed: true,
            }
          : {}),
      },
    ]),
  );
}
function localConnectorHostDisplayState(snapshot) {
  if (snapshot?.status?.state === "installing") return "installing";
  if (snapshot?.queryFailed) return "saved";
  if (snapshot?.status?.runtimeState === "disabled") return "disabled";
  if (
    snapshot?.status?.runtimeState === "failed" ||
    snapshot?.status?.runtimeState === "partial"
  )
    return "saved";
  if (!snapshot?.status) return "checking";
  if (snapshot.status.state === "connected") return "connected";
  return "notConnected";
}
const PROBE_INTERVAL_MS = 3e3;
const connectorStepLineClassName =
  "absolute left-1/2 w-[1px] -translate-x-1/2 bg-[repeating-linear-gradient(to_bottom,var(--muted-foreground)_0,var(--muted-foreground)_1px,transparent_1px,transparent_3px)]";
function LocalConnectorPreparationStatus({
  state,
  connectorName,
  onRetry,
}) {
  const { t } = useTranslation();
  if (state === "skipped") return null;
  const labelKey = `connectors.connector.prepare.${state}`;
  const icon = state === "checking" ? Loader2 : CircleAlert;
  const isUnsupported = state === "unsupported";
  return (
    <div
      role={isUnsupported ? "alert" : "status"}
      className={cn(
        "mt-2 flex min-h-7 items-start justify-between gap-2 rounded-md bg-secondary px-2.5 py-1 text-xs leading-5 text-foreground/70",
        isUnsupported && "text-destructive",
      )}
      data-action-ui-id="connector-local-preparation-status"
      data-preparation-state={state}
    >
      <div className="flex min-w-0 items-start gap-1.5">
        <Icon
          icon={icon}
          size="sm"
          strokeWidth={1.5}
          className={cn(
            "mt-0.5 shrink-0",
            state === "checking" && "animate-spin",
          )}
          aria-hidden={true}
        />
        <span>
          {t(labelKey, {
            name: connectorName,
          })}
        </span>
      </div>
      {state === "error" ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="-my-1 shrink-0 font-normal"
          onClick={onRetry}
          data-action-ui-id="connector-local-preparation-retry"
        >
          {t("connectors.connector.prepare.retry")}
        </Button>
      ) : null}
    </div>
  );
}
function LocalConnectorStep({
  ordinal,
  title,
  first = false,
  last = false,
  completed = false,
  action,
  children,
}) {
  const { t } = useTranslation();
  return (
    <section
      className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2"
      data-layout-slot="connector-local-step"
      data-step={ordinal}
      data-step-state={completed ? "complete" : "active"}
    >
      <div className="relative flex justify-center pt-4">
        {!first ? (
          <span
            aria-hidden={true}
            className={cn(connectorStepLineClassName, "top-0 h-4")}
            data-layout-slot="connector-local-step-line"
          />
        ) : null}
        <span
          aria-hidden={true}
          className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-xs font-medium leading-none text-foreground"
          data-layout-slot="connector-local-step-node"
        >
          {t(`connectors.stepOrdinal.${ordinal}`)}
        </span>
        {!last ? (
          <span
            aria-hidden={true}
            className={cn(connectorStepLineClassName, "top-10 bottom-0")}
            data-layout-slot="connector-local-step-line"
          />
        ) : null}
      </div>
      <div className={cn("min-w-0 py-4", completed && !children && "py-3.5")}>
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
        {children ? (
          <div
            className="mt-3 min-w-0"
            data-layout-slot="connector-local-step-content"
          >
            {children}
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
  const { t, i18n } = useTranslation();
  const targetName = serverName ?? connectorId;
  const platform = usePlatform();
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
      const next = await homeService.connector.status(targetName);
      if (!closed.current) setStatus(next);
      return next;
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
    const timer = liveHostStatus
      ? void 0
      : setInterval(() => void refresh(), PROBE_INTERVAL_MS);
    return () => {
      closed.current = true;
      clearInterval(timer);
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
          dedupedToast.error(t("connectors.runtimeState.failed"));
        } else
          dedupedToast.success(
            t(
              result.status.state === "connected"
                ? "connectors.connector.installedConnected"
                : "connectors.connector.installedWaiting",
            ),
          );
      } else {
        const reason = t(`connectors.connector.error.${result.code}`, {
          name: connectorTitle(
            t,
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
        setInstallError(t("connectors.customDialog.error.requestFailed"));
    } finally {
      if (!installedStatus) finishInstallation?.();
      if (!closed.current) setInstalling(false);
    }
  };
  const state = installInProgress
    ? "installing"
    : liveHostStatus &&
        (hostDisplayState === "saved" || hostDisplayState === "disabled")
      ? hostDisplayState
      : (status?.state ?? (liveHostStatus ? "checking" : "not_installed"));
  const connected = state === "connected";
  const connectorName = connectorTitle(
    t,
    i18n?.language ?? "en",
    connectorId,
    displayName2,
  );
  const installStepTitle = t("connectors.connector.step.install");
  const prepareSecondaryKey =
    connectorId === "illustrator"
      ? "connectors.connector.prepare.illustrator"
      : connectorId === "touchdesigner"
        ? "connectors.connector.prepare.componentPackage"
        : "connectors.connector.prepare.inAppActivation";
  const blenderInstallerUrl =
    platform.app?.os === "win32"
      ? CDN_BLENDER_INSTALLER_WINDOWS_X64
      : platform.app?.os === "darwin" &&
          (platform.app.arch === "arm64" ||
            platform.app.runningUnderARM64Translation === true)
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
              {t("connectors.connector.setupTitle", {
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
                    label={t(`connectors.connector.state.${state}`)}
                    tone={connected ? "neutral" : "muted"}
                    markerTone={
                      connected
                        ? "success"
                        : state === "installing"
                          ? "warning"
                          : "muted"
                    }
                    markerActive={state === "installing"}
                    markerLabel={t(`connectors.connector.state.${state}`)}
                  />
                )}
              </span>
              {status?.updateAvailable ? (
                <Badge
                  variant="info"
                  data-action-ui-id={`connector-${connectorId}-update-available`}
                >
                  {t("connectors.connector.updateAvailable")}
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
              {t("connectors.connector.setupDescription")}
            </DialogDescription>
            <div className="w-full" data-layout-slot="connector-local-steps">
              <LocalConnectorStep
                ordinal={1}
                title={t("connectors.connector.step.prepare", {
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
                      {t("connectors.connector.prepare.primary", {
                        name: connectorName,
                      })}
                    </p>
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      {t(prepareSecondaryKey, {
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="mt-2 -ml-2 font-normal text-foreground underline underline-offset-2"
                        onClick={() => {
                          void openExternalUrl(platform, blenderInstallerUrl, {
                            source: "connector-blender-download",
                          });
                        }}
                        data-action-ui-id="connector-blender-download"
                      >
                        <Icon icon={Download} size="xs" aria-hidden={true} />
                        {t("connectors.connector.downloadHostApp.blender")}
                      </Button>
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
                    label={t(connectorSummaryActionLabelKey.install)}
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
