// connector-capability-card.jsx
import { homeService } from "../workspace/home-service.jsx";
import {
  LoaderCircle$1,
  matchesLocalConnectorServer,
  matchesRemoteConnectorServer,
  reactExports,
  resolveConnectorIcon,
  resolveConnectorSetupAsset,
  supportsConnectorDialog,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { LocalConnectorDialog } from "./local-connector-dialog.jsx";
import { useConnectorCatalog } from "./use-connector-catalog.js";
import { findOfficialConnectorForServer } from "./request-prompt-prefill.jsx";
import {
  useGatewayFetch,
  useGatewayScopeKey,
} from "../generation/use-model-catalog-scope-key.js";
import { useConnectorInventory } from "../text-editor/get-wire-content-text.jsx";
import { Button$1, cn$2 } from "../infra/dialog-content.jsx";
import { SESSION_ID_HEADER } from "../generation/to-workspace-browser-url.js";
import { useSessionStore } from "../workspace/resolve-retry-message-payload.jsx";
import { useWorkspaceChatOptional } from "../assets/use-canvas-model-registry-hydration.js";
import {
  CONNECTOR_CAPABILITY_PATHS,
  parseConnectorSelection,
  parseConnectorSelections,
} from "../infra/parse-connector-selection.js";
import { parseConnectorCatalog } from "../infra/parse-connector-catalog.js";
import { ConnectorDialog } from "./connector-hub-o-auth-section.jsx";
import {
  ConnectorPromptAction,
  ConnectorStatusPill,
} from "./connector-prompt-action.jsx";
import { CustomConnectorDialog } from "./custom-connector-dialog.jsx";

const jobs = new Map();

function stopConnectorPreparation(key2) {
  clearTimeout(jobs.get(key2));
  jobs.delete(key2);
}

function followConnectorPreparation(key2, check) {
  if (jobs.has(key2)) return;
  const poll = async () => {
    const timer2 = jobs.get(key2);
    if (!timer2) return;
    let keepWaiting = false;
    try {
      keepWaiting = await check();
    } catch {}
    if (jobs.get(key2) !== timer2) return;
    if (keepWaiting)
      jobs.set(
        key2,
        setTimeout(() => void poll(), 3e3),
      );
    else jobs.delete(key2);
  };
  jobs.set(
    key2,
    setTimeout(() => void poll(), 3e3),
  );
}

const POLL_INTERVAL_MS = 3e3;

function createLocalConnectorInstallationTracker(service2) {
  let snapshot2 = {};
  const active2 = new Map();
  const listeners2 = new Set();
  const finishedListeners = new Set();
  const update2 = (connectorId, installation) => {
    snapshot2 = {
      ...snapshot2,
      [connectorId]: installation,
    };
    for (const listener of listeners2) listener();
  };
  const finish = (task, result) => {
    if (active2.get(task.connectorId) !== task) return;
    clearTimeout(task.timer);
    active2.delete(task.connectorId);
    update2(task.connectorId, {
      phase: "finished",
      result,
    });
    for (const listener of finishedListeners)
      listener(task.connectorId, result);
  };
  const follow = (task) => {
    const poll = async () => {
      if (active2.get(task.connectorId) !== task) return;
      try {
        const status = await service2.status(task.connectorId);
        if (active2.get(task.connectorId) !== task) return;
        if (status.state !== "installing") {
          finish(
            task,
            status.state === "not_installed"
              ? null
              : {
                  ok: true,
                  status,
                },
          );
          return;
        }
        update2(task.connectorId, {
          phase: "installing",
        });
      } catch {
        if (active2.get(task.connectorId) !== task) return;
        update2(task.connectorId, {
          phase: "installing",
          queryFailed: true,
        });
      }
      task.timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
    };
    task.timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
  };
  const begin = (connectorId) => {
    if (active2.has(connectorId)) return void 0;
    const task = {
      connectorId,
    };
    active2.set(connectorId, task);
    update2(connectorId, {
      phase: "installing",
    });
    return task;
  };
  return {
    getSnapshot: () => snapshot2,
    subscribe(listener) {
      listeners2.add(listener);
      return () => {
        listeners2.delete(listener);
      };
    },
    subscribeFinished(listener) {
      finishedListeners.add(listener);
      return () => {
        finishedListeners.delete(listener);
      };
    },
    observe(connectorId) {
      if (active2.has(connectorId)) {
        update2(connectorId, {
          phase: "installing",
        });
        return;
      }
      const task = begin(connectorId);
      if (task) follow(task);
    },
    async install(connectorId) {
      const task = begin(connectorId);
      if (!task) return;
      try {
        const result = await service2.install(connectorId);
        if (active2.get(connectorId) !== task) return;
        if (!result.ok && result.code === "busy") follow(task);
        else finish(task, result);
      } catch {
        finish(task, null);
      }
    },
    dispose() {
      for (const task of active2.values()) clearTimeout(task.timer);
      active2.clear();
      listeners2.clear();
      finishedListeners.clear();
      snapshot2 = {};
    },
  };
}

const tracker = createLocalConnectorInstallationTracker({
  install: (id2) => homeService.connector.install(id2),
  status: (id2) => homeService.connector.status(id2),
});

function useLocalConnectorInstallations(
  onFinished,
  installationTracker = tracker,
) {
  const installations = reactExports.useSyncExternalStore(
    installationTracker.subscribe,
    installationTracker.getSnapshot,
  );
  const onFinishedRef = reactExports.useRef(onFinished);
  onFinishedRef.current = onFinished;
  reactExports.useEffect(
    () =>
      installationTracker.subscribeFinished((id2, result) =>
        onFinishedRef.current(id2, result),
      ),
    [installationTracker],
  );
  return {
    installations,
    getInstallations: installationTracker.getSnapshot,
    install: installationTracker.install,
    observe: installationTracker.observe,
  };
}

export function ConnectorCapabilityCard({ capability, searchCallId }) {
  const { t: t2 } = useTranslation();
  const catalog = useConnectorCatalog();
  const manifest = catalog.entries.find(
    (entry) => entry.manifest.connectorId === capability.connectorId,
  )?.manifest;
  const mcp = manifest?.capabilities.mcp;
  const inventory = useConnectorInventory();
  const configuredOnly = capability.source === "configured";
  const matchesCapability = (server) =>
    configuredOnly
      ? (server.runtimeName ?? server.name) === capability.runtimeName
      : mcp?.kind === "remote"
        ? matchesRemoteConnectorServer(server, mcp)
        : !!mcp && matchesLocalConnectorServer(server, capability.connectorId);
  const [editSnapshot, setEditSnapshot] = reactExports.useState();
  const installations = useLocalConnectorInstallations(() => {
    void inventory.refresh().catch(() => void 0);
  });
  const installationId = [
    capability.connectorId,
    ...(mcp ? [mcp.serverName] : []),
  ].find((id2) => installations.installations[id2]?.phase === "installing");
  const installing = installationId !== void 0;
  const fetcher = useGatewayFetch(),
    scope = useGatewayScopeKey();
  const chat = useWorkspaceChatOptional(),
    store = useSessionStore();
  const [originScope] = reactExports.useState(scope);
  const [origin] = reactExports.useState(
    () => store.getState().focusedSessionId,
  );
  const live = reactExports.useRef({
    chat,
    scope,
  });
  live.current = {
    chat,
    scope,
  };
  const mounted = reactExports.useRef(true),
    lock = reactExports.useRef(false),
    configured = reactExports.useRef(false),
    cancelled = reactExports.useRef(false);
  const cancelPending = reactExports.useRef(false);
  const setupCompletionPending = reactExports.useRef(false);
  const feedbackRequested = reactExports.useRef(false);
  const [cancelling, setCancelling] = reactExports.useState(false);
  const [cancelActivityVisible, setCancelActivityVisible] =
    reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!cancelling) {
      setCancelActivityVisible(false);
      return;
    }
    const timer2 = setTimeout(() => setCancelActivityVisible(true), 300);
    return () => clearTimeout(timer2);
  }, [cancelling]);
  const [waiting, updateWaiting] = reactExports.useState(null);
  const waitingRef = reactExports.useRef(null);
  const jobKey = JSON.stringify([
    originScope,
    origin,
    searchCallId,
    capability.connectorId,
  ]);
  const checkConnection = reactExports.useRef(async () => false);
  const setWaiting = (value) => {
    waitingRef.current = value;
    if (mounted.current && (value || !cancelled.current)) updateWaiting(value);
    if (value)
      followConnectorPreparation(jobKey, () => checkConnection.current());
    else stopConnectorPreparation(jobKey);
  };
  const [connectionError, setConnectionError] = reactExports.useState("");
  const selectionRef = reactExports.useRef(null);
  const selectionRevision = reactExports.useRef(0);
  const [selection2, setSelection] = reactExports.useState(null);
  const [hydrated, setHydrated] = reactExports.useState(false),
    [busy, setBusy] = reactExports.useState(false);
  const [checking, setChecking] = reactExports.useState(null);
  const [checkActivityVisible, setCheckActivityVisible] =
    reactExports.useState(false);
  const [setupBusy, setSetupBusy] = reactExports.useState(false);
  const preparing = setupBusy || installing || (busy && !checking);
  reactExports.useEffect(() => {
    if (!busy || !checking || installing) {
      setCheckActivityVisible(false);
      return;
    }
    const timer2 = setTimeout(() => setCheckActivityVisible(true), 300);
    return () => clearTimeout(timer2);
  }, [busy, checking, installing]);
  const [state2, setState] = reactExports.useState(capability.state),
    [phase, setPhase] = reactExports.useState("");
  const [error, setError] = reactExports.useState(""),
    [dialog, setDialog] = reactExports.useState(false);
  const settled =
    capability.autoActivated ||
    selection2?.delivery?.status === "accepted" ||
    (selection2?.state === "sent" && !selection2.delivery);
  const headers = {
    [SESSION_ID_HEADER]: origin ?? "",
    "Content-Type": "application/json",
  };
  const checkContext = () => {
    if (cancelled.current) throw new Error("cancelled");
    if (!origin || originScope !== live.current.scope)
      throw new Error("sessionChanged");
  };
  const request = async (body2) => {
    selectionRevision.current += 1;
    const response = await fetcher(CONNECTOR_CAPABILITY_PATHS.selection, {
      method: "POST",
      headers,
      body: JSON.stringify(body2),
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => null);
      if (failure && typeof failure === "object" && "message" in failure) {
        const errors = {
          connector_task_unavailable: "taskUnavailable",
          connector_input_missing: "inputMissing",
          connector_already_started: "alreadyStarted",
        };
        if (typeof failure.message === "string" && errors[failure.message])
          throw new Error(errors[failure.message]);
      }
      if (
        body2.action === "activate" &&
        response.status === 409 &&
        failure &&
        typeof failure === "object" &&
        "message" in failure &&
        failure.message === "connector_not_ready"
      )
        throw new Error("waitingRuntime");
      throw new Error("unavailable");
    }
    const value = parseConnectorSelection(await response.json());
    selectionRef.current = value;
    if (mounted.current) setSelection(value);
    return value;
  };
  const refresh = reactExports.useCallback(async () => {
    if (!origin) return null;
    const revision = selectionRevision.current;
    const [records, catalog2] = await Promise.all([
      fetcher(CONNECTOR_CAPABILITY_PATHS.selection, {
        headers: {
          [SESSION_ID_HEADER]: origin,
        },
      }),
      fetcher(CONNECTOR_CAPABILITY_PATHS.catalog),
    ]);
    if (!records.ok || !catalog2.ok) throw new Error("unavailable");
    const entries2 = parseConnectorSelections(await records.json());
    const current2 = parseConnectorCatalog(
      await catalog2.json(),
    ).connectors.find((entry) => entry.connectorId === capability.connectorId);
    if (selectionRevision.current !== revision) return selectionRef.current;
    const record2 =
      entries2.find(
        (entry) =>
          entry.connectorId === capability.connectorId &&
          entry.searchCallId === searchCallId,
      ) ?? null;
    selectionRef.current = record2;
    if (!mounted.current) return record2;
    setSelection(record2);
    if (current2) setState(current2.state);
    setHydrated(true);
    return record2;
  }, [origin, fetcher, capability.connectorId, searchCallId]);
  reactExports.useEffect(() => {
    mounted.current = true;
    if (settled)
      return () => {
        mounted.current = false;
      };
    void refresh().catch(() => {
      if (mounted.current) setError("unavailable");
    });
    const timer2 = setInterval(
      () =>
        void refresh().catch(() => {
          if (mounted.current) setError("unavailable");
        }),
      3e3,
    );
    return () => {
      mounted.current = false;
      clearInterval(timer2);
    };
  }, [refresh, settled]);
  const clearFeedbackErrors = () => {
    if (mounted.current) {
      setError("");
      setConnectionError("");
    }
  };
  const showCheckFeedback = (kind = null) => {
    feedbackRequested.current = true;
    if (mounted.current) {
      setBusy(true);
      setChecking(kind);
      setPhase("connecting");
      clearFeedbackErrors();
    }
  };
  const handleUse = async ({
    checkOnly = false,
    background = false,
    setupComplete = false,
  } = {}) => {
    if (
      cancelPending.current ||
      capability.autoActivated ||
      (selectionRef.current?.state !== "cancelled" &&
        selectionRef.current?.delivery &&
        selectionRef.current.delivery.status !== "failed") ||
      selectionRef.current?.state === "sent"
    )
      return;
    if (lock.current) {
      if (!background && checkOnly) showCheckFeedback("connection");
      return;
    }
    lock.current = true;
    feedbackRequested.current = false;
    if (!checkOnly) cancelled.current = false;
    if (!background)
      showCheckFeedback(checkOnly || waiting ? "connection" : null);
    try {
      checkContext();
      const restored = await refresh();
      checkContext();
      if (checkOnly && restored?.state === "cancelled")
        throw new Error("cancelled");
      if (restored?.state === "sent") {
        setWaiting(null);
        return;
      }
      const chosen = checkOnly
        ? selectionRef.current
        : await request({
            action: "select",
            connectorId: capability.connectorId,
            searchCallId,
          });
      if (!chosen || chosen.state === "sent") {
        setWaiting(null);
        return;
      }
      checkContext();
      const saved = (await inventory.refresh()).find(matchesCapability);
      if (configuredOnly && !saved) {
        setConnectionError("server_not_found");
        setWaiting(null);
        return;
      }
      if (!configuredOnly) {
        if (
          !manifest ||
          (manifest.ui.dialog !== "local-app" &&
            !supportsConnectorDialog(manifest))
        )
          throw new Error("unavailable");
        const authorized =
          manifest.auth.kind !== "cliAuth" ||
          (await homeService.hcpCli.getAccount(manifest.connectorId)).ok;
        checkContext();
        const needsSetup =
          !saved || saved.runtimeState === "needs_auth" || !authorized;
        if (needsSetup) {
          if (!checkOnly && !setupComplete) {
            configured.current = false;
            setDialog(true);
          }
          setWaiting(null);
          return;
        }
      }
      checkContext();
      if (
        !checkOnly &&
        saved &&
        (!saved.enabled || saved.runtimeState !== "connected")
      ) {
        const result = await homeService.customMcp.setEnabled(saved.name, true);
        if (!result.ok) {
          setConnectionError(result.code);
          setWaiting(null);
          return;
        }
        await inventory.refresh();
      }
      checkContext();
      const current2 = (await inventory.refresh()).find(matchesCapability);
      checkContext();
      if (!current2 || current2.runtimeState !== "connected") {
        clearFeedbackErrors();
        setWaiting("runtime");
        return;
      }
      const ready = await request({
        action: "activate",
        selectionId: chosen.selectionId,
      });
      checkContext();
      clearFeedbackErrors();
      setWaiting(null);
      if (ready.state === "sent") return;
      await request({
        action: "deliver",
        selectionId: ready.selectionId,
      });
    } catch (cause) {
      if (!(cause instanceof Error && cause.message === "waitingRuntime"))
        setWaiting(null);
      if (mounted.current) {
        if (
          cause instanceof Error &&
          cause.message === "waitingRuntime" &&
          !cancelled.current
        ) {
          clearFeedbackErrors();
          setWaiting("runtime");
        } else {
          setWaiting(null);
          if (!(cause instanceof Error && cause.message === "cancelled"))
            setError(
              cause instanceof Error &&
                [
                  "sessionChanged",
                  "sendFailed",
                  "taskUnavailable",
                  "inputMissing",
                  "alreadyStarted",
                ].includes(cause.message)
                ? cause.message
                : "unavailable",
            );
        }
      }
    } finally {
      lock.current = false;
      if (mounted.current && feedbackRequested.current) {
        setBusy(false);
        setChecking(null);
        setPhase("");
      }
      feedbackRequested.current = false;
      if (setupCompletionPending.current) {
        setupCompletionPending.current = false;
        if (!cancelled.current)
          void handleUse({
            setupComplete: true,
          });
      }
    }
  };
  checkConnection.current = async () => {
    await handleUse({
      checkOnly: true,
      background: true,
    });
    return waitingRef.current !== null && !cancelled.current;
  };
  const handleCancel = async () => {
    if (cancelPending.current) return;
    cancelPending.current = true;
    cancelled.current = true;
    setCancelling(true);
    setWaiting(null);
    setError("");
    try {
      if (selectionRef.current)
        await request({
          action: "cancel",
          selectionId: selectionRef.current.selectionId,
        });
      setError("cancelled");
    } catch (cause) {
      if (mounted.current) {
        updateWaiting(null);
        setError(
          cause instanceof Error && cause.message === "alreadyStarted"
            ? "alreadyStarted"
            : "unavailable",
        );
      }
    } finally {
      cancelPending.current = false;
      if (mounted.current) setCancelling(false);
    }
  };
  const handleClose = async () => {
    setDialog(false);
    setSetupBusy(false);
    setEditSnapshot(void 0);
    if (configuredOnly) {
      if (!configured.current && selectionRef.current) await handleCancel();
      return;
    }
    try {
      const saved = (await inventory.refresh()).find(matchesCapability);
      const authorized =
        manifest?.auth.kind !== "cliAuth" ||
        (await homeService.hcpCli.getAccount(capability.connectorId)).ok;
      checkContext();
      if (
        saved &&
        authorized &&
        saved.runtimeState !== "needs_auth" &&
        (configured.current || saved.runtimeState === "connected")
      ) {
        void handleUse({
          setupComplete: true,
        });
      } else await handleCancel();
    } catch {
      if (!cancelled.current) setError("unavailable");
    }
  };
  const handleSetupCompleted = () => {
    if (cancelled.current || cancelPending.current) return;
    configured.current = true;
    if (lock.current) {
      setupCompletionPending.current = true;
      return;
    }
    void handleUse({
      setupComplete: true,
    });
  };
  const handleEditConfiguration = async () => {
    if (lock.current) return;
    lock.current = true;
    cancelled.current = false;
    showCheckFeedback();
    try {
      checkContext();
      setWaiting(null);
      const saved = (await inventory.refresh()).find(matchesCapability);
      if (!saved) {
        setConnectionError("server_not_found");
        return;
      }
      await request({
        action: "select",
        connectorId: capability.connectorId,
        searchCallId,
      });
      const snapshot2 = await homeService.customMcp.getForEdit(saved.name);
      checkContext();
      if (!snapshot2) {
        setConnectionError("server_not_found");
        return;
      }
      configured.current = false;
      setEditSnapshot(snapshot2);
      setDialog(true);
    } catch {
      if (mounted.current) setConnectionError("loadFailed");
    } finally {
      lock.current = false;
      feedbackRequested.current = false;
      if (mounted.current) {
        setBusy(false);
        setChecking(null);
        setPhase("");
      }
    }
  };
  const dialogProps = {
    onClose: () => void handleClose(),
    onSubmit: (input) => homeService.customMcp.create(input),
    onCreated: handleSetupCompleted,
    // Existing CLI accounts can re-authorize without another onCreated event.
    onBusyChange: (working) => {
      setSetupBusy(working);
      if (!working) handleSetupCompleted();
    },
  };
  const savedConnector = inventory.servers.find(matchesCapability);
  const availability =
    !inventory.loaded || inventory.failed
      ? state2
      : !savedConnector
        ? !configuredOnly && capability.connection === "local"
          ? "not_installed"
          : "not_configured"
        : !savedConnector.enabled
          ? "disabled"
          : savedConnector.runtimeState === "connected"
            ? "connected"
            : "failed";
  const deliveryPending =
    selection2?.state !== "cancelled" &&
    !!selection2?.delivery &&
    ["submitting", "queued", "unknown"].includes(selection2.delivery.status);
  if (settled) return null;
  const needsRecovery = availability === "failed" || !!connectionError;
  const promptMode =
    preparing || deliveryPending
      ? "installing"
      : checking || waiting || needsRecovery
        ? "requiresRecovery"
        : availability === "not_installed"
          ? "requiresInstall"
          : availability === "not_configured"
            ? "requiresConnection"
            : availability === "disabled"
              ? "requiresEnable"
              : "ready";
  const showCancelledResult =
    selection2?.state === "cancelled" || error === "cancelled";
  const showCancelling =
    cancelling && cancelActivityVisible && !showCancelledResult;
  const status = needsRecovery
    ? savedConnector?.runtimeState === "needs_auth"
      ? "needs_auth"
      : "notConnected"
    : availability === "disabled"
      ? "disabled"
      : availability === "connected" && !waiting
        ? "connected"
        : "notConnected";
  return (
    <div
      className="space-y-3 rounded-lg bg-muted p-4"
      data-action-ui-id="capability-connector-card"
      data-connector-id={capability.connectorId}
      data-connection-state={
        busy || cancelling || installing
          ? "checking"
          : waiting
            ? `waiting_${waiting}`
            : availability
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{capability.displayName}</span>
        {!preparing && <ConnectorStatusPill state={status} />}
      </div>
      <p className="grid text-xs text-muted-foreground">
        <span
          className={cn$2(
            "col-start-1 row-start-1",
            showCancelledResult && "invisible",
          )}
          aria-hidden={showCancelledResult || void 0}
        >
          {t2(
            preparing
              ? "chat.connector.setupInProgress"
              : waiting
                ? configuredOnly
                  ? "chat.connector.needsRecovery"
                  : "chat.connector.needsHost"
                : availability === "not_installed"
                  ? "chat.connector.needsInstallation"
                  : availability === "not_configured"
                    ? "chat.connector.needsConnection"
                    : availability === "disabled"
                      ? "chat.connector.needsEnable"
                      : needsRecovery
                        ? "chat.connector.needsRecovery"
                        : "chat.connector.useForTask",
            {
              name: capability.displayName,
            },
          )}
        </span>
        <span
          role="status"
          data-action-ui-id="capability-connector-cancel-result"
          className={cn$2(
            "col-start-1 row-start-1",
            !showCancelledResult && "invisible",
          )}
          aria-hidden={!showCancelledResult || void 0}
        >
          {t2(
            installing
              ? "chat.connector.cancelled"
              : "chat.connector.cancelledResult",
          )}
        </span>
      </p>
      <div
        className="flex w-fit max-w-full flex-wrap items-center gap-2 pt-1"
        data-layout-slot="connector-card-actions"
      >
        <ConnectorPromptAction
          mode={promptMode}
          checking={!!checking && !installing && checkActivityVisible}
          className="h-8 min-w-24 shrink-0 whitespace-nowrap pl-3.5 pr-4 data-[checking=true]:disabled:opacity-100 data-[cancelling=true]:disabled:opacity-100"
          data-action-ui-id="capability-connector-use"
          data-checking={!!checking && !installing}
          data-cancelling={cancelling}
          aria-busy={busy || installing}
          disabled={
            !origin ||
            !chat ||
            busy ||
            installing ||
            cancelling ||
            dialog ||
            deliveryPending
          }
          onClick={() =>
            void handleUse({
              checkOnly: Boolean(waitingRef.current),
            })
          }
          label={t2(
            busy || installing
              ? checking && !installing
                ? "chat.connector.check"
                : "chat.capabilitySearch.preparing"
              : deliveryPending
                ? "chat.connector.queued"
                : waiting
                  ? "chat.connector.check"
                  : !hydrated
                    ? "chat.connector.check"
                    : availability === "not_installed"
                      ? "chat.capabilitySearch.installAndUse"
                      : availability === "not_configured"
                        ? "chat.connector.connect"
                        : availability === "disabled"
                          ? "chat.connector.enable"
                          : availability === "failed"
                            ? "chat.connector.retryConnection"
                            : availability === "connecting"
                              ? "chat.connector.check"
                              : "chat.capabilitySearch.use",
          )}
        />
        {configuredOnly &&
          (!savedConnector ||
            !findOfficialConnectorForServer(savedConnector)) && (
            <Button$1
              size="sm"
              variant="outline"
              className="h-8 min-w-24 shrink-0 whitespace-nowrap rounded-[10px] px-4"
              disabled={
                !origin ||
                !chat ||
                busy ||
                cancelling ||
                deliveryPending ||
                dialog
              }
              data-action-ui-id="capability-connector-edit"
              onClick={() => void handleEditConfiguration()}
            >
              {t2("connectors.editConfiguration")}
            </Button$1>
          )}
        {(busy ||
          waiting ||
          cancelling ||
          showCancelledResult ||
          deliveryPending ||
          selection2?.state === "selected" ||
          selection2?.state === "ready") && (
          <Button$1
            size="sm"
            variant="ghost"
            className="h-8 rounded-[10px] px-4 disabled:opacity-100 data-[cancelled=true]:text-muted-foreground"
            onClick={() => void handleCancel()}
            disabled={cancelling || showCancelledResult}
            aria-busy={cancelling}
            data-cancelled={showCancelledResult}
            data-action-ui-id="capability-connector-cancel"
          >
            <span className="grid">
              <span
                className={cn$2(
                  "col-start-1 row-start-1",
                  (showCancelling || showCancelledResult) && "invisible",
                )}
                aria-hidden={showCancelling || showCancelledResult || void 0}
              >
                {t2("chat.connector.cancel")}
              </span>
              <span
                className={cn$2(
                  "col-start-1 row-start-1",
                  !showCancelling && "invisible",
                )}
                aria-hidden={!showCancelling || void 0}
              >
                {t2("chat.connector.cancelling")}
              </span>
              <span
                className={cn$2(
                  "col-start-1 row-start-1",
                  !showCancelledResult && "invisible",
                )}
                aria-hidden={!showCancelledResult || void 0}
              >
                {t2("chat.connector.cancelledLabel")}
              </span>
            </span>
          </Button$1>
        )}
      </div>
      {deliveryPending && (
        <p role="status" className="text-xs text-muted-foreground">
          {t2(
            selection2?.delivery?.status === "unknown"
              ? "chat.connector.deliveryUnknown"
              : "chat.connector.deliveryPending",
          )}
        </p>
      )}
      {selection2?.delivery?.status === "failed" && (
        <p role="alert" className="text-xs text-destructive">
          {t2("chat.capabilitySearch.errors.sendFailed")}
        </p>
      )}
      {connectionError && (
        <p role="alert" className="text-xs text-destructive">
          {t2(`connectors.customDialog.error.${connectionError}`)}
        </p>
      )}
      {editSnapshot && (
        <CustomConnectorDialog
          open={dialog}
          initialInput={editSnapshot.input}
          onOpenChange={(open) => {
            if (!open) void handleClose();
          }}
          onSubmit={(input) =>
            homeService.customMcp.update(
              editSnapshot.input.name,
              input,
              editSnapshot.revision,
            )
          }
          onCreated={(result) => {
            inventory.update((current2) =>
              current2.map((server) =>
                server.name === result.server.name ? result.server : server,
              ),
            );
            configured.current = true;
            setDialog(false);
            setEditSnapshot(void 0);
            if (result.server.enabled) void handleUse();
            else {
              clearFeedbackErrors();
              setState("disabled");
              void handleCancel();
            }
          }}
        />
      )}
      {preparing && (
        <div
          role="progressbar"
          aria-label={t2("chat.connector.progress")}
          aria-valuetext={t2(`chat.connector.phase.${phase || "connecting"}`)}
          className="h-1 overflow-hidden rounded-full bg-border"
        >
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </div>
      )}
      {preparing && (
        <div
          role="status"
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <LoaderCircle$1 className="size-4 animate-spin" strokeWidth={1.5} />
          {t2(`chat.connector.phase.${phase || "connecting"}`)}
        </div>
      )}
      {waiting && (
        <div
          role="status"
          className="space-y-2 text-xs text-muted-foreground"
          data-action-ui-id="capability-connector-waiting"
        >
          <p>{t2("chat.connector.waitingRuntime")}</p>
          <p className="grid">
            <span
              className={cn$2(
                "col-start-1 row-start-1",
                showCancelledResult && "invisible",
              )}
              aria-hidden={showCancelledResult || void 0}
            >
              {t2("chat.connector.autoContinue")}
            </span>
            <span
              className={cn$2(
                "col-start-1 row-start-1",
                !showCancelledResult && "invisible",
              )}
              aria-hidden={!showCancelledResult || void 0}
            >
              {t2("chat.connector.resumeHint")}
            </span>
          </p>
        </div>
      )}
      {error && error !== "cancelled" && (
        <p role="alert" className="text-xs text-destructive">
          {t2(`chat.capabilitySearch.errors.${error}`)}
        </p>
      )}
      {dialog &&
        !configuredOnly &&
        manifest &&
        (manifest.ui.dialog === "local-app" ? (
          <LocalConnectorDialog
            connectorId={manifest.connectorId}
            displayName={manifest.displayName}
            serverName={mcp?.serverName}
            iconUrl={resolveConnectorIcon(manifest.icon)}
            setupUrl={
              manifest.ui.setupAssetKey
                ? resolveConnectorSetupAsset(manifest.ui.setupAssetKey)
                : void 0
            }
            onClose={() => void handleClose()}
            onInstalled={handleSetupCompleted}
          />
        ) : supportsConnectorDialog(manifest) ? (
          <ConnectorDialog manifest={manifest} {...dialogProps} />
        ) : null)}
    </div>
  );
}
