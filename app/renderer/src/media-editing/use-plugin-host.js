// use-plugin-host.js
import {
  byNode,
  configChangeListeners,
  installedPluginId,
  isPluginAgentRegistered,
  PLUGIN_STORAGE_KEY,
  upsert,
} from "./input.jsx";
import reactExports from "react";
import { useAssetMetadataApi } from "../infra/agent-http-client.js";
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
  const hubFrame = value;
  if (hubFrame.v !== HUB_PROTOCOL_VERSION) return false;
  return (
    hubFrame.kind === "hub:rpc:request" ||
    hubFrame.kind === "hub:rpc:response" ||
    hubFrame.kind === "hub:event" ||
    hubFrame.kind === "hub:handshake"
  );
}

function isRpcRequest(frame) {
  return frame.kind === "hub:rpc:request";
}

function isHubEvent(frame) {
  return frame.kind === "hub:event";
}

function isHandshake(frame) {
  return frame.kind === "hub:handshake";
}

function setPluginAgentRegistered(nodeId, registered) {
  upsert(nodeId, {
    registered,
  });
}

function clearPluginAgentNode(nodeId) {
  byNode.delete(nodeId);
}

function subscribePluginConfigChange(pluginId, listener) {
  let set = configChangeListeners.get(pluginId);
  if (!set) {
    set = new Set();
    configChangeListeners.set(pluginId, set);
  }
  set.add(listener);
  return () => {
    const listeners = configChangeListeners.get(pluginId);
    if (!listeners) return;
    listeners.delete(listener);
    if (listeners.size === 0) configChangeListeners.delete(pluginId);
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
    const send = (frame) => {
      iframe.contentWindow?.postMessage(frame, "*");
    };
    const invokeMain = () => {
      const hubEvent = {
        kind: "hub:event",
        v: HUB_PROTOCOL_VERSION,
        topic: "main:invoke",
        payload: null,
      };
      send(hubEvent);
    };
    const sendResponse = (requestId, isSuccess, payload) => {
      const frame = isSuccess
        ? {
            kind: "hub:rpc:response",
            v: HUB_PROTOCOL_VERSION,
            id: requestId,
            ok: true,
            result: payload,
          }
        : {
            kind: "hub:rpc:response",
            v: HUB_PROTOCOL_VERSION,
            id: requestId,
            ok: false,
            error: payload,
          };
      send(frame);
    };
    const postIncomingChange = () => {
      if (fullscreenApiRef.current.getState().nodeId !== nodeId) return;
      const hubEvent = {
        kind: "hub:event",
        v: HUB_PROTOCOL_VERSION,
        topic: "incoming",
        payload: null,
      };
      send(hubEvent);
    };
    const postFullscreenChange = () => {
      const hubEvent = {
        kind: "hub:event",
        v: HUB_PROTOCOL_VERSION,
        topic: "fullscreen:changed",
        payload: {
          fullscreen:
            fullscreenApiRef.current.getState().nodeId === nodeId &&
            fullscreenApiRef.current.getState().presentation === "fullscreen",
        },
      };
      send(hubEvent);
    };
    const handleRpc = async (rpcRequest) => {
      const dispatch = buildDispatch({
        nodeId,
        actions: actionsRef.current,
        bridge: bridgeRef.current,
        assetMetadataApi: assetMetadataApiRef.current,
        fullscreenApi: fullscreenApiRef.current,
        requestExitFullscreen: requestExitFullscreenRef.current,
      });
      const handler = dispatch[rpcRequest.method];
      if (!handler) {
        sendResponse(rpcRequest.id, false, {
          code: "unknown_method",
          message: `unknown hub method: ${rpcRequest.method}`,
        });
        return;
      }
      try {
        const result = await handler(rpcRequest.args);
        sendResponse(rpcRequest.id, true, result);
      } catch (err) {
        const pluginError = err;
        sendResponse(rpcRequest.id, false, {
          code: pluginError.code ?? "internal_error",
          message: pluginError.message ?? "internal error",
        });
      }
    };
    const onMessage = (event) => {
      if (event.source !== iframe.contentWindow) return;
      const frame = event.data;
      if (!isHubFrame(frame)) return;
      if (isHandshake(frame) && frame.from === "sdk") {
        const reply = {
          kind: "hub:handshake",
          v: HUB_PROTOCOL_VERSION,
          from: "host",
          nodeId,
          app: appInfoRef.current,
        };
        send(reply);
        postFullscreenChange();
        postIncomingChange();
        return;
      }
      if (isRpcRequest(frame)) {
        void handleRpc(frame);
        return;
      }
      if (isHubEvent(frame)) {
        if (frame.topic === "main:registered") {
          pluginRunStateApiRef.current.getState().set(nodeId, {
            hasMain: true,
            invoke: invokeMain,
          });
          return;
        }
        if (frame.topic === "main:unregistered") {
          pluginRunStateApiRef.current.getState().set(nodeId, {
            hasMain: false,
            invoke: invokeMain,
          });
          return;
        }
        if (frame.topic === "agent:registered") {
          setPluginAgentRegistered(nodeId, true);
          return;
        }
        if (frame.topic === "agent:unregistered") {
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
      const hubEvent = {
        kind: "hub:event",
        v: HUB_PROTOCOL_VERSION,
        topic: "storage",
        payload: null,
      };
      send(hubEvent);
    };
    const unsubInstalledStorage = ownPluginId
      ? subscribePluginStorageChangeForNode(
          bridgeRef.current.pluginHost,
          nodeId,
          sendStorageChanged,
        )
      : () => {};
    const bucketOf = (data) => data?.[PLUGIN_STORAGE_KEY] ?? null;
    let lastBucket = bucketOf(actionsRef.current.getNodeById(nodeId)?.data);
    let lastStorageJson = JSON.stringify(lastBucket);
    const unsubLocalStorage = ownPluginId
      ? () => {}
      : actionsRef.current.subscribeNodeDataChange(nodeId, (data) => {
          const nextBucket = bucketOf(data);
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
          const hubEvent = {
            kind: "hub:event",
            v: HUB_PROTOCOL_VERSION,
            topic: "config",
            payload: null,
          };
          send(hubEvent);
        })
      : () => {};
    const unsubChatMessage = bridgeRef.current.pluginHost?.subscribeChatMessages
      ? bridgeRef.current.pluginHost.subscribeChatMessages((envelope) => {
          const hubEvent = {
            kind: "hub:event",
            v: HUB_PROTOCOL_VERSION,
            topic: "chat:message",
            payload: envelope,
          };
          send(hubEvent);
        })
      : () => {};
    const unsubChatDone = bridgeRef.current.pluginHost?.subscribeChatDone
      ? bridgeRef.current.pluginHost.subscribeChatDone((payload) => {
          const hubEvent = {
            kind: "hub:event",
            v: HUB_PROTOCOL_VERSION,
            topic: "chat:done",
            payload,
          };
          send(hubEvent);
        })
      : () => {};
    const unsubDagDone = bridgeRef.current.pluginHost?.subscribeDagDone
      ? bridgeRef.current.pluginHost.subscribeDagDone(nodeId, (envelope) => {
          const hubEvent = {
            kind: "hub:event",
            v: HUB_PROTOCOL_VERSION,
            topic: "dag:done",
            payload: envelope,
          };
          send(hubEvent);
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
          const hubEvent = {
            kind: "hub:event",
            v: HUB_PROTOCOL_VERSION,
            topic: "agent:invoke",
            payload: {
              invokeId: event.invokeId,
              method: event.method,
              args: event.args,
            },
          };
          send(hubEvent);
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
    theme,
    region,
    version,
    gpuAccelerationDisabled,
    gpuAccelerationDisabledReason,
    currentChatSessionId,
  } = appInfo;
  reactExports.useEffect(() => {
    if (!nodeId) return;
    if (!iframe) return;
    const hubEvent = {
      kind: "hub:event",
      v: HUB_PROTOCOL_VERSION,
      topic: "app:changed",
      // Full snapshot, not a diff — the wire is cheap (5 fields) and
      // the SDK is happy to receive either; using the full object means
      // no diff bookkeeping host-side.
      payload: {
        locale,
        theme,
        region,
        version,
        gpuAccelerationDisabled,
        gpuAccelerationDisabledReason,
        currentChatSessionId: currentChatSessionId ?? null,
      },
    };
    iframe.contentWindow?.postMessage(hubEvent, "*");
  }, [
    iframe,
    nodeId,
    locale,
    theme,
    region,
    version,
    gpuAccelerationDisabled,
    gpuAccelerationDisabledReason,
    currentChatSessionId,
  ]);
  reactExports.useEffect(() => {
    if (!nodeId || !iframe) return;
    const hubEvent = {
      kind: "hub:event",
      v: HUB_PROTOCOL_VERSION,
      topic: "billing:changed",
      payload: {
        locale,
        promotionEndUnix: pricingConfig?.promotionEndUnix ?? null,
      },
    };
    iframe.contentWindow?.postMessage(hubEvent, "*");
  }, [iframe, locale, nodeId, pricingConfig]);
  reactExports.useEffect(() => {
    if (!nodeId) return;
    if (!iframe) return;
    const store = fullscreenApi;
    const post = (fullscreen) => {
      const hubEvent = {
        kind: "hub:event",
        v: HUB_PROTOCOL_VERSION,
        topic: "fullscreen:changed",
        payload: {
          fullscreen,
        },
      };
      iframe.contentWindow?.postMessage(hubEvent, "*");
    };
    const postIncoming = () => {
      const hubEvent = {
        kind: "hub:event",
        v: HUB_PROTOCOL_VERSION,
        topic: "incoming",
        payload: null,
      };
      iframe.contentWindow?.postMessage(hubEvent, "*");
    };
    const initialState = store.getState();
    let lastPresented = initialState.nodeId === nodeId;
    let lastFullscreen =
      lastPresented && initialState.presentation === "fullscreen";
    post(lastFullscreen);
    if (lastPresented) postIncoming();
    const unsub = store.subscribe((state) => {
      const nextPresented = state.nodeId === nodeId;
      const nextFullscreen =
        nextPresented && state.presentation === "fullscreen";
      if (nextFullscreen !== lastFullscreen) {
        lastFullscreen = nextFullscreen;
        post(nextFullscreen);
      }
      if (!lastPresented && nextPresented) postIncoming();
      lastPresented = nextPresented;
    });
    return unsub;
  }, [iframe, nodeId, fullscreenApi]);
}
