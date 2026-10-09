// use-plugin-host.js
import {
  byNode,
  configChangeListeners,
  installedPluginId,
  isPluginAgentRegistered,
  PLUGIN_STORAGE_KEY,
  upsert,
} from "./input.jsx";
import { reactExports, useAssetMetadataApi } from "../vendor.js";
import { buildDispatch } from "./build-dispatch.js";
import {
  useHtmlFullscreenApi,
  usePluginRunStateApi,
} from "../infra/use-plugin-metadata-store.js";
import { useCanvasBridge } from "./package.jsx";
import { useCanvasActions } from "./use-canvas-actions.js";

const HUB_PROTOCOL_VERSION = "2";

function isHubFrame(value) {
  if (!value || typeof value !== "object") return false;
  const v2 = value;
  if (v2.v !== HUB_PROTOCOL_VERSION) return false;
  return (
    v2.kind === "hub:rpc:request" ||
    v2.kind === "hub:rpc:response" ||
    v2.kind === "hub:event" ||
    v2.kind === "hub:handshake"
  );
}

function isRpcRequest(frame2) {
  return frame2.kind === "hub:rpc:request";
}

function isHubEvent(frame2) {
  return frame2.kind === "hub:event";
}

function isHandshake(frame2) {
  return frame2.kind === "hub:handshake";
}

function setPluginAgentRegistered(nodeId, registered) {
  upsert(nodeId, {
    registered,
  });
}

function clearPluginAgentNode(nodeId) {
  byNode.delete(nodeId);
}

function subscribePluginConfigChange(pluginId, cb) {
  let set2 = configChangeListeners.get(pluginId);
  if (!set2) {
    set2 = new Set();
    configChangeListeners.set(pluginId, set2);
  }
  set2.add(cb);
  return () => {
    const s2 = configChangeListeners.get(pluginId);
    if (!s2) return;
    s2.delete(cb);
    if (s2.size === 0) configChangeListeners.delete(pluginId);
  };
}

function subscribePluginStorageChangeForNode(pluginHost, nodeId, callback) {
  if (!pluginHost) return () => {};
  return pluginHost.subscribePluginStorageChanged((event) => {
    if (event.nodeId !== nodeId) return;
    callback();
  });
}

const DEFAULT_PLUGIN_APP_INFO = {
  locale: "en",
  theme: "light",
  region: "domestic",
  version: "",
  gpuAccelerationDisabled: false,
  currentChatSessionId: null,
};

export function usePluginHost(iframe, nodeId, requestExitFullscreen) {
  const actions = useCanvasActions();
  const bridge = useCanvasBridge();
  const assetMetadataApi = useAssetMetadataApi();
  const pluginRunStateApi = usePluginRunStateApi();
  const fullscreenApi = useHtmlFullscreenApi();
  const appInfo = bridge.pluginAppInfo ?? DEFAULT_PLUGIN_APP_INFO;
  const pricingConfig = bridge.pricingConfig;
  const actionsRef = reactExports.useRef(actions);
  const bridgeRef = reactExports.useRef(bridge);
  const assetMetadataApiRef = reactExports.useRef(assetMetadataApi);
  const pluginRunStateApiRef = reactExports.useRef(pluginRunStateApi);
  const fullscreenApiRef = reactExports.useRef(fullscreenApi);
  const appInfoRef = reactExports.useRef(appInfo);
  const requestExitFullscreenRef = reactExports.useRef(requestExitFullscreen);
  actionsRef.current = actions;
  bridgeRef.current = bridge;
  assetMetadataApiRef.current = assetMetadataApi;
  pluginRunStateApiRef.current = pluginRunStateApi;
  fullscreenApiRef.current = fullscreenApi;
  appInfoRef.current = appInfo;
  requestExitFullscreenRef.current = requestExitFullscreen;
  reactExports.useEffect(() => {
    if (!nodeId) return;
    if (!iframe) return;
    const send2 = (frame2) => {
      iframe.contentWindow?.postMessage(frame2, "*");
    };
    const invokeMain = () => {
      const evt = {
        kind: "hub:event",
        v: HUB_PROTOCOL_VERSION,
        topic: "main:invoke",
        payload: null,
      };
      send2(evt);
    };
    const sendResponse = (id2, ok2, payload) => {
      const frame2 = ok2
        ? {
            kind: "hub:rpc:response",
            v: HUB_PROTOCOL_VERSION,
            id: id2,
            ok: true,
            result: payload,
          }
        : {
            kind: "hub:rpc:response",
            v: HUB_PROTOCOL_VERSION,
            id: id2,
            ok: false,
            error: payload,
          };
      send2(frame2);
    };
    const postIncomingChange = () => {
      if (fullscreenApiRef.current.getState().nodeId !== nodeId) return;
      const evt = {
        kind: "hub:event",
        v: HUB_PROTOCOL_VERSION,
        topic: "incoming",
        payload: null,
      };
      send2(evt);
    };
    const postFullscreenChange = () => {
      const evt = {
        kind: "hub:event",
        v: HUB_PROTOCOL_VERSION,
        topic: "fullscreen:changed",
        payload: {
          fullscreen:
            fullscreenApiRef.current.getState().nodeId === nodeId &&
            fullscreenApiRef.current.getState().presentation === "fullscreen",
        },
      };
      send2(evt);
    };
    const handleRpc = async (req) => {
      const dispatch2 = buildDispatch({
        nodeId,
        actions: actionsRef.current,
        bridge: bridgeRef.current,
        assetMetadataApi: assetMetadataApiRef.current,
        fullscreenApi: fullscreenApiRef.current,
        requestExitFullscreen: requestExitFullscreenRef.current,
      });
      const handler = dispatch2[req.method];
      if (!handler) {
        sendResponse(req.id, false, {
          code: "unknown_method",
          message: `unknown hub method: ${req.method}`,
        });
        return;
      }
      try {
        const result = await handler(req.args);
        sendResponse(req.id, true, result);
      } catch (err) {
        const e2 = err;
        sendResponse(req.id, false, {
          code: e2.code ?? "internal_error",
          message: e2.message ?? "internal error",
        });
      }
    };
    const onMessage = (event) => {
      if (event.source !== iframe.contentWindow) return;
      const frame2 = event.data;
      if (!isHubFrame(frame2)) return;
      if (isHandshake(frame2) && frame2.from === "sdk") {
        const reply = {
          kind: "hub:handshake",
          v: HUB_PROTOCOL_VERSION,
          from: "host",
          nodeId,
          app: appInfoRef.current,
        };
        send2(reply);
        postFullscreenChange();
        postIncomingChange();
        return;
      }
      if (isRpcRequest(frame2)) {
        void handleRpc(frame2);
        return;
      }
      if (isHubEvent(frame2)) {
        if (frame2.topic === "main:registered") {
          pluginRunStateApiRef.current.getState().set(nodeId, {
            hasMain: true,
            invoke: invokeMain,
          });
          return;
        }
        if (frame2.topic === "main:unregistered") {
          pluginRunStateApiRef.current.getState().set(nodeId, {
            hasMain: false,
            invoke: invokeMain,
          });
          return;
        }
        if (frame2.topic === "agent:registered") {
          setPluginAgentRegistered(nodeId, true);
          return;
        }
        if (frame2.topic === "agent:unregistered") {
          setPluginAgentRegistered(nodeId, false);
          return;
        }
        return;
      }
    };
    window.addEventListener("message", onMessage);
    const unsubGraph = actionsRef.current.subscribeIncomingChange(
      nodeId,
      postIncomingChange,
    );
    const ownPluginId = installedPluginId(actionsRef.current, nodeId);
    const sendStorageChanged = () => {
      const evt = {
        kind: "hub:event",
        v: HUB_PROTOCOL_VERSION,
        topic: "storage",
        payload: null,
      };
      send2(evt);
    };
    const unsubInstalledStorage = ownPluginId
      ? subscribePluginStorageChangeForNode(
          bridgeRef.current.pluginHost,
          nodeId,
          sendStorageChanged,
        )
      : () => {};
    const bucketOf = (data2) => data2?.[PLUGIN_STORAGE_KEY] ?? null;
    let lastBucket = bucketOf(actionsRef.current.getNodeById(nodeId)?.data);
    let lastStorageJson = JSON.stringify(lastBucket);
    const unsubLocalStorage = ownPluginId
      ? () => {}
      : actionsRef.current.subscribeNodeDataChange(nodeId, (data2) => {
          const nextBucket = bucketOf(data2);
          if (nextBucket === lastBucket) return;
          let nextJson;
          try {
            nextJson = JSON.stringify(nextBucket);
          } catch {
            return;
          }
          lastBucket = nextBucket;
          if (nextJson === lastStorageJson) return;
          lastStorageJson = nextJson;
          sendStorageChanged();
        });
    const unsubConfig = ownPluginId
      ? subscribePluginConfigChange(ownPluginId, () => {
          const evt = {
            kind: "hub:event",
            v: HUB_PROTOCOL_VERSION,
            topic: "config",
            payload: null,
          };
          send2(evt);
        })
      : () => {};
    const unsubChatMessage = bridgeRef.current.pluginHost?.subscribeChatMessages
      ? bridgeRef.current.pluginHost.subscribeChatMessages((envelope) => {
          const evt = {
            kind: "hub:event",
            v: HUB_PROTOCOL_VERSION,
            topic: "chat:message",
            payload: envelope,
          };
          send2(evt);
        })
      : () => {};
    const unsubChatDone = bridgeRef.current.pluginHost?.subscribeChatDone
      ? bridgeRef.current.pluginHost.subscribeChatDone((payload) => {
          const evt = {
            kind: "hub:event",
            v: HUB_PROTOCOL_VERSION,
            topic: "chat:done",
            payload,
          };
          send2(evt);
        })
      : () => {};
    const unsubDagDone = bridgeRef.current.pluginHost?.subscribeDagDone
      ? bridgeRef.current.pluginHost.subscribeDagDone(nodeId, (envelope) => {
          const evt = {
            kind: "hub:event",
            v: HUB_PROTOCOL_VERSION,
            topic: "dag:done",
            payload: envelope,
          };
          send2(evt);
        })
      : () => {};
    const agentHost = bridgeRef.current.pluginHost;
    const unsubAgentInvoke = agentHost
      ? agentHost.subscribePluginAgentInvoke((event) => {
          if (event.nodeId !== nodeId) return;
          if (!isPluginAgentRegistered(nodeId)) {
            void agentHost
              .postPluginAgentResult({
                invokeId: event.invokeId,
                ok: false,
                error: {
                  code: "editor_not_open",
                  message:
                    "plugin has no registered agent handler yet — call hub_plugin_agent_open_editor, wait ~500ms, then retry",
                },
              })
              .catch(() => {});
            return;
          }
          const evt = {
            kind: "hub:event",
            v: HUB_PROTOCOL_VERSION,
            topic: "agent:invoke",
            payload: {
              invokeId: event.invokeId,
              method: event.method,
              args: event.args,
            },
          };
          send2(evt);
        })
      : () => {};
    return () => {
      window.removeEventListener("message", onMessage);
      unsubGraph();
      unsubInstalledStorage();
      unsubLocalStorage();
      unsubConfig();
      unsubChatMessage();
      unsubChatDone();
      unsubDagDone();
      unsubAgentInvoke();
      bridgeRef.current.pluginHost?.releaseDagRuns?.(nodeId);
      pluginRunStateApiRef.current.getState().clear(nodeId);
      clearPluginAgentNode(nodeId);
    };
  }, [iframe, nodeId]);
  const {
    locale,
    theme: theme2,
    region,
    version: version2,
    gpuAccelerationDisabled,
    gpuAccelerationDisabledReason,
    currentChatSessionId,
  } = appInfo;
  reactExports.useEffect(() => {
    if (!nodeId) return;
    if (!iframe) return;
    const evt = {
      kind: "hub:event",
      v: HUB_PROTOCOL_VERSION,
      topic: "app:changed",
      // Full snapshot, not a diff — the wire is cheap (5 fields) and
      // the SDK is happy to receive either; using the full object means
      // no diff bookkeeping host-side.
      payload: {
        locale,
        theme: theme2,
        region,
        version: version2,
        gpuAccelerationDisabled,
        gpuAccelerationDisabledReason,
        currentChatSessionId: currentChatSessionId ?? null,
      },
    };
    iframe.contentWindow?.postMessage(evt, "*");
  }, [
    iframe,
    nodeId,
    locale,
    theme2,
    region,
    version2,
    gpuAccelerationDisabled,
    gpuAccelerationDisabledReason,
    currentChatSessionId,
  ]);
  reactExports.useEffect(() => {
    if (!nodeId || !iframe) return;
    const evt = {
      kind: "hub:event",
      v: HUB_PROTOCOL_VERSION,
      topic: "billing:changed",
      payload: {
        locale,
        promotionEndUnix: pricingConfig?.promotionEndUnix ?? null,
      },
    };
    iframe.contentWindow?.postMessage(evt, "*");
  }, [iframe, locale, nodeId, pricingConfig]);
  reactExports.useEffect(() => {
    if (!nodeId) return;
    if (!iframe) return;
    const store = fullscreenApi;
    const post2 = (fullscreen) => {
      const evt = {
        kind: "hub:event",
        v: HUB_PROTOCOL_VERSION,
        topic: "fullscreen:changed",
        payload: {
          fullscreen,
        },
      };
      iframe.contentWindow?.postMessage(evt, "*");
    };
    const postIncoming = () => {
      const evt = {
        kind: "hub:event",
        v: HUB_PROTOCOL_VERSION,
        topic: "incoming",
        payload: null,
      };
      iframe.contentWindow?.postMessage(evt, "*");
    };
    const initialState = store.getState();
    let lastPresented = initialState.nodeId === nodeId;
    let lastFullscreen =
      lastPresented && initialState.presentation === "fullscreen";
    post2(lastFullscreen);
    if (lastPresented) postIncoming();
    const unsub = store.subscribe((state2) => {
      const nextPresented = state2.nodeId === nodeId;
      const nextFullscreen =
        nextPresented && state2.presentation === "fullscreen";
      if (nextFullscreen !== lastFullscreen) {
        lastFullscreen = nextFullscreen;
        post2(nextFullscreen);
      }
      if (!lastPresented && nextPresented) postIncoming();
      lastPresented = nextPresented;
    });
    return unsub;
  }, [iframe, nodeId, fullscreenApi]);
}
