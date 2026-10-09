// use-plugin-host.jsx
import { useTranslation, reactExports, classifyFileType, PlaybackPlayIcon$1, useAssetMetadataApi, useNodeId, useConnection, X$7 } from "../vendor.js";
import { CANVAS_MAX_ZOOM, usePluginRunStateApi, useHtmlFullscreenApi, CANVAS_MIN_ZOOM, useHtmlIframePoolApi, useHtmlViewerHandleApi, useIsHtmlIframeActive, useFileUrl, useHtmlViewerPresentation, workspaceScope$1, WorkspaceContentBudgetScopeContext, statesByWorkspace } from "../infra/create-html-iframe-pool-store.jsx";
import { FileTypeIcon } from "../infra/create-recently-added-store.jsx";
import { useCanvasBridge, useCanvasActions, useCanvasActive, MessageSquare, Minimize2, Maximize2 } from "./parse-item.jsx";
import { parseNodeId } from "../canvas/resolve-derived-collision.js";
import { FileMissingIcon } from "../canvas/generating-media-area.jsx";
import { isSubtitleFileName } from "../canvas/prune-persisted-node-data.js";
import { Button$2 } from "../canvas/use-media-node-actions.jsx";
import { Input$2, cn$5 } from "../infra/use-browser-overlay-dialog-props.jsx";
import { toWorkspaceBrowserUrl } from "../generation/text-models.js";
import { __jsx } from "../shared/jsx-runtime.js";
export function exitFullscreenForRemovedNode(store, nodeId) {
  if (store.getState().nodeId === nodeId) {
    store.getState().exit(nodeId);
  }
}
const inputBaseClass$1 =
  "h-8 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 md:text-xs dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";
export function Input$1({ className, type: type2, startIcon, endIcon, ...props }) {
  if (!startIcon && !endIcon) {
    return (
      <Input$2
        type={type2}
        data-slot="input"
        className={cn$5(inputBaseClass$1, className)}
        {...props}
      />
    );
  }
  return (
    <div className={cn$5("relative flex items-center", className)}>
      {startIcon && (
        <span className="pointer-events-none absolute left-2 flex items-center text-muted-foreground [&_svg:not([class*='size-'])]:size-4">
          {startIcon}
        </span>
      )}
      <Input$2
        type={type2}
        data-slot="input"
        className={cn$5(inputBaseClass$1, "w-full", startIcon && "pl-8", endIcon && "pr-8")}
        {...props}
      />
      {endIcon && (
        <span className="pointer-events-none absolute right-2 flex items-center text-muted-foreground [&_svg:not([class*='size-'])]:size-4">
          {endIcon}
        </span>
      )}
    </div>
  );
}
export function Label$1({ className, ...props }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: generic shadcn Label primitive — callers attach htmlFor or wrap a control
    <label
      data-slot="label"
      className={cn$5(
        "flex items-center gap-2 text-xs leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
function HtmlViewerPlaceholder({ displayName: displayName2, onActivate }) {
  const { t: t2 } = useTranslation();
  const label = displayName2?.trim() || t2("canvas.file.untitled");
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted px-6 text-center">
      <FileTypeIcon
        {...classifyFileType({
          filename: displayName2,
        })}
        size={48}
        decorative={true}
      />
      <div className="max-w-full truncate text-xs text-muted-foreground" title={label}>
        {label}
      </div>
      <Button$2
        size="sm"
        onClick={(e2) => {
          e2.stopPropagation();
          onActivate();
        }}
        onMouseDown={(e2) => e2.stopPropagation()}
        data-action-ui-id="canvas.file-node.html-activate"
      >
        <PlaybackPlayIcon$1 />
        {t2("canvas.file.html.activatePreview")}
      </Button$2>
    </div>
  );
}
const HUB_METHODS = {
  CanvasGetIncomingResources: "canvas.getIncomingResources",
  CanvasGetWorkspaceResources: "canvas.getWorkspaceResources",
  CanvasGetNode: "canvas.getNode",
  CanvasRemoveCurrentNode: "canvas.removeCurrentNode",
  CanvasFocusNode: "canvas.focusNode",
  CanvasPickAsset: "canvas.pickAsset",
  CanvasInsertImageNode: "canvas.insertImageNode",
  CanvasInsertVideoNode: "canvas.insertVideoNode",
  CanvasInsertAudioNode: "canvas.insertAudioNode",
  CanvasInsertTextNode: "canvas.insertTextNode",
  CanvasInsertFileNode: "canvas.insertFileNode",
  CanvasUpdateNodeData: "canvas.updateNodeData",
  CanvasSuperResolution: "canvas.superResolution",
  CanvasInsertImagesAsGroup: "canvas.insertImagesAsGroup",
  CanvasAddPlaceholderGroup: "canvas.addPlaceholderGroup",
  CanvasAddPlaceholder: "canvas.addPlaceholder",
  CanvasFailPlaceholder: "canvas.failPlaceholder",
  CanvasCleanupPlaceholder: "canvas.cleanupPlaceholder",
  StorageGet: "storage.get",
  StorageSet: "storage.set",
  StorageDelete: "storage.delete",
  StorageKeys: "storage.keys",
  ConfigGet: "config.get",
  ConfigSet: "config.set",
  ConfigDelete: "config.delete",
  ConfigKeys: "config.keys",
  BillingGetNodePriceDescription: "billing.getNodePriceDescription",
  ComfyUiDownloadModel: "comfyui.downloadModel",
  UiNotify: "ui.notify",
  UiSaveFile: "ui.saveFile",
  UiPickDirectory: "ui.pickDirectory",
  UiEnterFullscreen: "ui.enterFullscreen",
  UiExitFullscreen: "ui.exitFullscreen",
  LogWrite: "log.write",
  AppNavigate: "app.navigate",
  ChatSend: "chat.send",
  ChatCancel: "chat.cancel",
  AgentResult: "agent.result",
  AgentSetEditorState: "agent.setEditorState",
  SkillList: "skill.list",
  SkillGet: "skill.get",
  SkillRun: "skill.run",
  DagSubmit: "dag.submit",
  DagQuery: "dag.query",
  FilesUploadToCdn: "files.uploadToCdn",
  FilesReadFromPluginDir: "files.readFromPluginDir",
  FilesWriteToPluginDir: "files.writeToPluginDir",
  PythonEnsureEnv: "python.ensureEnv",
  PythonRun: "python.run",
};
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
const PLUGIN_STORAGE_KEY = "pluginStorage";
const PLUGIN_STORAGE_MAX_VALUE_BYTES = 256 * 1024;
const PLUGIN_STORAGE_MAX_TOTAL_BYTES = 1024 * 1024;
const PLUGIN_STORAGE_MAX_KEYS = 256;
const COMFYUI_WORKFLOW_DRAFT_STORAGE_KEY = "comfyui.workflow-draft.v1";
const COMFYUI_WORKFLOW_DRAFT_MAX_BYTES = 5 * 1024 * 1024;
const COMFYUI_PLUGIN_STORAGE_MAX_TOTAL_BYTES =
  COMFYUI_WORKFLOW_DRAFT_MAX_BYTES + PLUGIN_STORAGE_MAX_TOTAL_BYTES;
function pluginStorageByteSize(value) {
  try {
    const json2 = JSON.stringify(value ?? null);
    if (typeof json2 !== "string") return Number.POSITIVE_INFINITY;
    return new TextEncoder().encode(json2).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}
export function isBlobRef(value) {
  return !!value && typeof value === "object" && value.__hubBlobRef === true;
}
const HUB_BILLING_NODE_TYPES = [
  "Banana2Node",
  "BananaProNode",
  "GImage2Node",
  "MinimaxH3PromptExpandNode",
  "MinimaxH3VideoEnhancementNode",
  "MinimaxHailuo03TextToVideoNode",
  "MinimaxHailuo03FirstLastFrameNode",
  "MinimaxHailuo03ReferenceNode",
];
export const CANVAS_ZOOM_PRESETS = [0.5, 1, 2, 3, CANVAS_MAX_ZOOM];
export const CANVAS_INITIAL_FIT_MIN_ZOOM = 0.2;
export const CANVAS_INITIAL_FIT_MAX_ZOOM = 1;
const PLUGIN_AGENT_EDITOR_STATE_MAX_CHARS = 6e3;
const byNode = new Map();
function upsert(nodeId, patch2) {
  const current2 = byNode.get(nodeId) ?? {
    registered: false,
    editorState: null,
    editSessionId: null,
    updatedAt: 0,
  };
  byNode.set(nodeId, {
    ...current2,
    ...patch2,
    updatedAt: Date.now(),
  });
}
function setPluginAgentRegistered(nodeId, registered) {
  upsert(nodeId, {
    registered,
  });
}
function setPluginAgentEditorState(nodeId, state2) {
  const bounded =
    typeof state2 === "string" ? state2.slice(0, PLUGIN_AGENT_EDITOR_STATE_MAX_CHARS) : null;
  upsert(nodeId, {
    editorState: bounded,
  });
}
export function setPluginAgentEditSession(nodeId, editSessionId) {
  upsert(nodeId, {
    editSessionId,
  });
}
function clearPluginAgentNode(nodeId) {
  byNode.delete(nodeId);
}
export function isPluginAgentRegistered(nodeId) {
  return byNode.get(nodeId)?.registered === true;
}
export function getPluginAgentEditorState(nodeId) {
  return byNode.get(nodeId)?.editorState ?? null;
}
export function getPluginAgentEditSession(nodeId) {
  return byNode.get(nodeId)?.editSessionId ?? null;
}
const configChangeListeners = new Map();
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
function emitPluginConfigChange(pluginId) {
  const set2 = configChangeListeners.get(pluginId);
  if (!set2) return;
  for (const cb of set2) {
    try {
      cb();
    } catch (err) {
      console.error("[plugin-host] config change listener threw", err);
    }
  }
}
const HIDDEN_NODE_DATA_KEYS = new Set([PLUGIN_STORAGE_KEY, "popoverDraft"]);
const IMMUTABLE_PLUGIN_NODE_DATA_KEYS = new Set([...HIDDEN_NODE_DATA_KEYS, "pluginId"]);
function sanitiseNodeData(data2) {
  const out = {};
  for (const [k2, v2] of Object.entries(data2)) {
    if (HIDDEN_NODE_DATA_KEYS.has(k2)) continue;
    out[k2] = v2;
  }
  return out;
}
function installedPluginId(actions, nodeId) {
  const pluginId = actions.getNodeById(nodeId)?.data?.pluginId;
  return typeof pluginId === "string" && pluginId ? pluginId : void 0;
}
function pluginStorageHttpStatus(err) {
  if (!err || typeof err !== "object") return void 0;
  const status = err.status;
  return typeof status === "number" ? status : void 0;
}
async function runInstalledPluginStorageRequest(actions, request) {
  try {
    return await request();
  } catch (err) {
    if (pluginStorageHttpStatus(err) !== 404) throw err;
    await actions.flushPersist();
    return request();
  }
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
const BILLING_NODE_TYPES = new Set(HUB_BILLING_NODE_TYPES);
function usePluginHost(iframe, nodeId, requestExitFullscreen) {
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
    const unsubGraph = actionsRef.current.subscribeIncomingChange(nodeId, postIncomingChange);
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
    let lastFullscreen = lastPresented && initialState.presentation === "fullscreen";
    post2(lastFullscreen);
    if (lastPresented) postIncoming();
    const unsub = store.subscribe((state2) => {
      const nextPresented = state2.nodeId === nodeId;
      const nextFullscreen = nextPresented && state2.presentation === "fullscreen";
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
function buildDispatch(deps) {
  const { nodeId, actions, bridge, assetMetadataApi, fullscreenApi, requestExitFullscreen } = deps;
  const requirePluginHost = () => {
    if (!bridge.pluginHost) {
      throw withCode$2(new Error("plugin host bridge not configured by renderer"), "not_available");
    }
    return bridge.pluginHost;
  };
  const requirePluginId = () => {
    const snap = actions.getNodeById(nodeId);
    const pluginId = snap?.data?.pluginId;
    if (typeof pluginId !== "string" || !pluginId) {
      throw withCode$2(
        new Error("this API is only available to installed plugin nodes"),
        "not_available",
      );
    }
    return pluginId;
  };
  const reportPluginOutputs = (outputNodeIds, outputType, durationMs) => {
    if (!bridge.onPluginOutput || outputNodeIds.length === 0) return;
    const snap = actions.getNodeById(nodeId);
    const pluginId = snap?.data?.pluginId;
    if (typeof pluginId !== "string" || !pluginId) return;
    const pluginVersion =
      typeof snap?.data?.pluginVersion === "string" ? snap.data.pluginVersion : void 0;
    outputNodeIds.forEach((outputNodeId, outputIndex) => {
      bridge.onPluginOutput?.({
        pluginId,
        pluginVersion,
        pluginInstanceId: nodeId,
        outputNodeId,
        outputType,
        outputCount: outputNodeIds.length,
        outputIndex,
        durationMs,
      });
    });
  };
  return {
    [HUB_METHODS.CanvasGetIncomingResources]: async (args) => {
      const filter2 = args[0] ?? null;
      const sourceIds = actions.getIncomingSourceIds(nodeId);
      const store = assetMetadataApi.getState();
      const out = [];
      for (const id2 of sourceIds) {
        const sourceNode = actions.getNodeById(id2);
        const dataAssetId = sourceNode?.data?.assetId;
        const assetId =
          sourceNode?.assetId ??
          (typeof dataAssetId === "string" && dataAssetId.length > 0
            ? dataAssetId
            : parseNodeId(id2).assetId);
        const meta2 = store.assets.get(assetId) ?? store.assets.get(id2);
        if (!meta2) continue;
        const type2 = normaliseAssetType$1(meta2.type, meta2.path || meta2.name);
        if (!matchesFilter(type2, filter2)) continue;
        out.push(buildResource(id2, assetId, meta2, type2));
      }
      return out;
    },
    [HUB_METHODS.CanvasGetWorkspaceResources]: async (args) => {
      const filter2 = args[0] ?? null;
      const store = assetMetadataApi.getState();
      const byPath = new Map();
      for (const [assetId, meta2] of store.assets) {
        if (!meta2.path || byPath.has(meta2.path)) continue;
        const type2 = normaliseAssetType$1(meta2.type, meta2.path || meta2.name);
        if (!matchesFilter(type2, filter2)) continue;
        byPath.set(meta2.path, buildResource(assetId, assetId, meta2, type2));
      }
      return [...byPath.values()];
    },
    [HUB_METHODS.CanvasGetNode]: async (args) => {
      const targetId = String(args[0] ?? "");
      const snap = actions.getNodeById(targetId);
      if (!snap) return null;
      const info2 = {
        id: snap.id,
        type: nodeTypeToAssetType(snap.type),
        position: snap.position,
        size: snap.size,
        // Strip internal-only fields (other nodes' pluginStorage, popover
        // draft state) so a plugin can't cross-read another node's KV by
        // calling getNode(otherNodeId). See HIDDEN_NODE_DATA_KEYS.
        data: sanitiseNodeData(snap.data),
      };
      return info2;
    },
    [HUB_METHODS.CanvasRemoveCurrentNode]: async () => {
      actions.removeNode(nodeId);
      return void 0;
    },
    [HUB_METHODS.CanvasFocusNode]: async (args) => {
      const target = String(args[0] ?? "").trim();
      if (!target) return false;
      const rawOptions = args[1];
      if (
        rawOptions !== void 0 &&
        rawOptions !== null &&
        (typeof rawOptions !== "object" || Array.isArray(rawOptions))
      ) {
        throw withCode$2(new Error("focusNode: options must be an object"), "invalid_args");
      }
      const options = rawOptions ?? {};
      if (options.preserveZoom !== void 0 && typeof options.preserveZoom !== "boolean") {
        throw withCode$2(new Error("focusNode: preserveZoom must be a boolean"), "invalid_args");
      }
      if (
        options.zoom !== void 0 &&
        (typeof options.zoom !== "number" ||
          !Number.isFinite(options.zoom) ||
          options.zoom < CANVAS_MIN_ZOOM ||
          options.zoom > CANVAS_MAX_ZOOM)
      ) {
        throw withCode$2(
          new Error(
            `focusNode: zoom must be a finite number in [${CANVAS_MIN_ZOOM}, ${CANVAS_MAX_ZOOM}]`,
          ),
          "invalid_args",
        );
      }
      const targetId = actions.getNodeById(target)
        ? target
        : actions.findNodeIdByPartialFileName(target);
      if (!targetId) return false;
      if (requestExitFullscreen) {
        if (!requestExitFullscreen()) return false;
      } else {
        fullscreenApi.getState().exit(nodeId);
      }
      actions.focusNodeIds([targetId], options);
      return true;
    },
    [HUB_METHODS.CanvasPickAsset]: async (args) => {
      const opts = args[0] ?? null;
      const sourceNodeIds = actions.getIncomingSourceIds(nodeId);
      const seenAsset = new Set();
      const upstreamAssetIds = [];
      for (const sid of sourceNodeIds) {
        const { assetId } = parseNodeId(sid);
        if (seenAsset.has(assetId)) continue;
        seenAsset.add(assetId);
        upstreamAssetIds.push(assetId);
      }
      return requirePluginHost().pickAsset(opts, {
        callerNodeId: nodeId,
        upstreamAssetIds,
      });
    },
    [HUB_METHODS.CanvasInsertImageNode]: async (args) => {
      const startedAt = Date.now();
      const result = await requirePluginHost().insertImageNode(args[0]);
      reportPluginOutputs([result.nodeId], "image", Date.now() - startedAt);
      return result;
    },
    [HUB_METHODS.CanvasInsertVideoNode]: async (args) => {
      const startedAt = Date.now();
      const request = args[0];
      const normalizedRequest = request.selectOnEditorExit
        ? {
            ...request,
            sourceNodeId: nodeId,
          }
        : request;
      const result = await requirePluginHost().insertVideoNode(normalizedRequest);
      reportPluginOutputs([result.nodeId], "video", Date.now() - startedAt);
      return result;
    },
    [HUB_METHODS.CanvasInsertAudioNode]: async (args) => {
      const startedAt = Date.now();
      const request = args[0];
      const normalizedRequest = request.selectOnEditorExit
        ? {
            ...request,
            sourceNodeId: nodeId,
          }
        : request;
      const result = await requirePluginHost().insertAudioNode(normalizedRequest);
      reportPluginOutputs([result.nodeId], "audio", Date.now() - startedAt);
      return result;
    },
    [HUB_METHODS.CanvasInsertTextNode]: async (args) => {
      const startedAt = Date.now();
      const result = await requirePluginHost().insertTextNode(args[0]);
      reportPluginOutputs([result.nodeId], "text", Date.now() - startedAt);
      return result;
    },
    [HUB_METHODS.CanvasInsertFileNode]: async (args) => {
      const startedAt = Date.now();
      const result = await requirePluginHost().insertFileNode(args[0]);
      reportPluginOutputs([result.nodeId], "file", Date.now() - startedAt);
      return result;
    },
    [HUB_METHODS.CanvasUpdateNodeData]: async (args) => {
      const targetId = String(args[0] ?? "");
      if (!targetId) throw withCode$2(new Error("updateNodeData: missing nodeId"), "invalid_args");
      const rawPatch = args[1];
      if (!rawPatch || typeof rawPatch !== "object" || Array.isArray(rawPatch)) {
        throw withCode$2(new Error("updateNodeData: patch must be an object"), "invalid_args");
      }
      const patch2 = rawPatch;
      for (const key2 of Object.keys(patch2)) {
        if (IMMUTABLE_PLUGIN_NODE_DATA_KEYS.has(key2)) {
          throw withCode$2(
            new Error(`updateNodeData: reserved data key "${key2}" cannot be changed`),
            "invalid_args",
          );
        }
      }
      actions.mergeNodeData(targetId, patch2);
      return void 0;
    },
    [HUB_METHODS.CanvasInsertImagesAsGroup]: async (args) => {
      const startedAt = Date.now();
      const result = await requirePluginHost().insertImagesAsGroup(args[0]);
      reportPluginOutputs(result.nodeIds, "image", Date.now() - startedAt);
      return result;
    },
    [HUB_METHODS.CanvasSuperResolution]: async (args) => {
      const payload = args[0];
      const startedAt = Date.now();
      const result = await requirePluginHost().superResolution(payload);
      if (payload.placeholderId) {
        reportPluginOutputs([payload.placeholderId], "image", Date.now() - startedAt);
      }
      return result;
    },
    [HUB_METHODS.CanvasAddPlaceholderGroup]: async (args) =>
      requirePluginHost().addPlaceholderGroup(args[0]),
    // ── Placeholder lifecycle — thin pass-through to the gateway. The
    // host bridge implements each method by POSTing to /api/canvas/
    // placeholder*, which delegates to CanvasService and broadcasts a
    // canvas_updated event so every connected renderer (this iframe's
    // host included) repaints. We don't track placeholderIds here —
    // ownership is the plugin's responsibility (must terminal-call
    // exactly once per addPlaceholder).
    [HUB_METHODS.CanvasAddPlaceholder]: async (args) => {
      const payload = args[0] ?? null;
      if (!payload || typeof payload.sourceNodeId !== "string" || !payload.sourceNodeId) {
        throw withCode$2(new Error("addPlaceholder: missing sourceNodeId"), "invalid_args");
      }
      if (typeof payload.prompt !== "string" || !payload.prompt) {
        throw withCode$2(new Error("addPlaceholder: prompt must be non-empty"), "invalid_args");
      }
      if (typeof payload.model !== "string" || !payload.model) {
        throw withCode$2(new Error("addPlaceholder: model must be non-empty"), "invalid_args");
      }
      return requirePluginHost().addPlaceholder(payload);
    },
    [HUB_METHODS.CanvasFailPlaceholder]: async (args) => {
      const id2 = String(args[0] ?? "");
      const msg = String(args[1] ?? "");
      if (!id2) throw withCode$2(new Error("failPlaceholder: missing id"), "invalid_args");
      if (!msg)
        throw withCode$2(
          new Error("failPlaceholder: errorMessage must be non-empty"),
          "invalid_args",
        );
      await requirePluginHost().failPlaceholder(id2, msg);
      return void 0;
    },
    [HUB_METHODS.CanvasCleanupPlaceholder]: async (args) => {
      const id2 = String(args[0] ?? "");
      if (!id2) throw withCode$2(new Error("cleanupPlaceholder: missing id"), "invalid_args");
      await requirePluginHost().cleanupPlaceholder(id2);
      return void 0;
    },
    // ── Storage: installed-plugin gateway KV + plain-HTML local fallback ───
    // Installed plugin nodes (identified by data.pluginId) read and write the
    // gateway-owned per-node store. They never mirror values into node.data,
    // so storage mutations do not enter canvas persistence or undo/render
    // paths. Plain user HTML nodes have no plugin namespace on the gateway and
    // retain the legacy node.data.pluginStorage behaviour for compatibility.
    [HUB_METHODS.StorageGet]: async (args) => {
      const key2 = String(args[0] ?? "");
      if (installedPluginId(actions, nodeId)) {
        const result = await runInstalledPluginStorageRequest(actions, () =>
          requirePluginHost().readPluginData({
            nodeId,
            key: key2,
          }),
        );
        return result.value;
      }
      const bucket = readStorage(actions, nodeId);
      return bucket[key2];
    },
    [HUB_METHODS.StorageSet]: async (args) => {
      const key2 = String(args[0] ?? "");
      if (!key2) throw withCode$2(new Error("storage.set: empty key"), "invalid_args");
      const value = args[1];
      const valueSize = pluginStorageByteSize(value);
      const pluginId = installedPluginId(actions, nodeId);
      const maxValueBytes =
        pluginId === "comfyui" && key2 === COMFYUI_WORKFLOW_DRAFT_STORAGE_KEY
          ? COMFYUI_WORKFLOW_DRAFT_MAX_BYTES
          : PLUGIN_STORAGE_MAX_VALUE_BYTES;
      if (valueSize > maxValueBytes) {
        throw withCode$2(
          new Error(
            `storage.set: value for "${key2}" is ${valueSize} bytes (limit ${maxValueBytes})`,
          ),
          "invalid_args",
        );
      }
      if (pluginId) {
        await runInstalledPluginStorageRequest(actions, () =>
          requirePluginHost().writePluginData({
            nodeId,
            key: key2,
            value,
          }),
        );
        return void 0;
      }
      const cur = readStorage(actions, nodeId);
      const isNewKey = !(key2 in cur);
      if (isNewKey && Object.keys(cur).length >= PLUGIN_STORAGE_MAX_KEYS) {
        throw withCode$2(
          new Error(
            `storage.set: too many keys (limit ${PLUGIN_STORAGE_MAX_KEYS}). Delete entries before adding new ones.`,
          ),
          "invalid_args",
        );
      }
      const next2 = {
        ...cur,
        [key2]: value,
      };
      const totalSize = pluginStorageByteSize(next2);
      const maxTotalBytes =
        pluginId === "comfyui" && COMFYUI_WORKFLOW_DRAFT_STORAGE_KEY in next2
          ? COMFYUI_PLUGIN_STORAGE_MAX_TOTAL_BYTES
          : PLUGIN_STORAGE_MAX_TOTAL_BYTES;
      if (totalSize > maxTotalBytes) {
        throw withCode$2(
          new Error(
            `storage.set: total storage ${totalSize} bytes would exceed limit ${maxTotalBytes}`,
          ),
          "invalid_args",
        );
      }
      actions.updateNodeData(nodeId, writeStoragePatch(actions, nodeId, next2));
      await writeThroughPluginData(bridge.pluginHost, {
        nodeId,
        key: key2,
        value,
      });
      return void 0;
    },
    [HUB_METHODS.StorageDelete]: async (args) => {
      const key2 = String(args[0] ?? "");
      if (installedPluginId(actions, nodeId)) {
        await runInstalledPluginStorageRequest(actions, () =>
          requirePluginHost().writePluginData({
            nodeId,
            key: key2,
            deleteKey: true,
          }),
        );
        return void 0;
      }
      const cur = readStorage(actions, nodeId);
      if (!(key2 in cur)) return void 0;
      const next2 = {
        ...cur,
      };
      delete next2[key2];
      actions.updateNodeData(nodeId, writeStoragePatch(actions, nodeId, next2));
      await writeThroughPluginData(bridge.pluginHost, {
        nodeId,
        key: key2,
        deleteKey: true,
      });
      return void 0;
    },
    [HUB_METHODS.StorageKeys]: async () => {
      if (installedPluginId(actions, nodeId)) {
        return (
          await runInstalledPluginStorageRequest(actions, () =>
            requirePluginHost().readPluginData({
              nodeId,
            }),
          )
        ).keys;
      }
      return Object.keys(readStorage(actions, nodeId));
    },
    [HUB_METHODS.UiNotify]: async (args) => {
      const message2 = String(args[0] ?? "");
      const level = args[1] ?? "info";
      const options = args[2] ?? void 0;
      if (!["info", "success", "warning", "error"].includes(level)) {
        throw withCode$2(new Error("ui.notify: invalid level"), "invalid_args");
      }
      if (message2.length === 0 || message2.length > 500) {
        throw withCode$2(new Error("ui.notify: invalid message"), "invalid_args");
      }
      if (
        options &&
        (typeof options !== "object" ||
          Array.isArray(options) ||
          (options.description !== void 0 &&
            (typeof options.description !== "string" || options.description.length > 1e3)) ||
          (options.action !== void 0 &&
            (typeof options.action !== "object" ||
              Array.isArray(options.action) ||
              typeof options.action.label !== "string" ||
              options.action.label.length === 0 ||
              options.action.label.length > 100 ||
              typeof options.action.revealPath !== "string" ||
              options.action.revealPath.length === 0 ||
              options.action.revealPath.length > 4096)))
      ) {
        throw withCode$2(new Error("ui.notify: invalid options"), "invalid_args");
      }
      requirePluginHost().notify(message2, level, options);
      return void 0;
    },
    [HUB_METHODS.UiSaveFile]: async (args) => {
      requirePluginId();
      const payload = args[0] ?? null;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw withCode$2(new Error("ui.saveFile: missing args"), "invalid_args");
      }
      const source = payload.source;
      const validSource =
        (typeof source === "string" && source.length > 0 && source.length <= 4096) ||
        (!!source &&
          typeof source === "object" &&
          source.__hubBlobRef === true &&
          typeof source.path === "string" &&
          source.path.length > 0 &&
          source.path.length <= 4096);
      if (
        !validSource ||
        typeof payload.suggestedName !== "string" ||
        payload.suggestedName.length === 0 ||
        payload.suggestedName.length > 255 ||
        payload.suggestedName.includes("/") ||
        payload.suggestedName.includes("\\") ||
        (payload.mimeType !== void 0 &&
          (typeof payload.mimeType !== "string" || payload.mimeType.length > 200)) ||
        (payload.title !== void 0 &&
          (typeof payload.title !== "string" || payload.title.length > 200))
      ) {
        throw withCode$2(new Error("ui.saveFile: invalid args"), "invalid_args");
      }
      return requirePluginHost().saveFile(payload);
    },
    [HUB_METHODS.ComfyUiDownloadModel]: async (args) => {
      const pluginId = requirePluginId();
      if (pluginId !== "comfyui") {
        throw withCode$2(
          new Error("comfyui.downloadModel is only available to the bundled ComfyUI plugin"),
          "not_available",
        );
      }
      const payload = args[0] ?? null;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw withCode$2(new Error("comfyui.downloadModel: missing args"), "invalid_args");
      }
      if (
        typeof payload.url !== "string" ||
        payload.url.length === 0 ||
        payload.url.length > 8192 ||
        typeof payload.filename !== "string" ||
        payload.filename.length === 0 ||
        payload.filename.length > 255 ||
        typeof payload.directory !== "string" ||
        payload.directory.length === 0 ||
        payload.directory.length > 64
      ) {
        throw withCode$2(
          new Error("comfyui.downloadModel: invalid url, filename, or directory"),
          "invalid_args",
        );
      }
      return requirePluginHost().downloadComfyUiModel(payload);
    },
    [HUB_METHODS.UiPickDirectory]: async (args) => {
      requirePluginId();
      const options = args[0] ?? {};
      if (typeof options !== "object" || Array.isArray(options)) {
        throw withCode$2(new Error("ui.pickDirectory: options must be an object"), "invalid_args");
      }
      if (options.title !== void 0 && typeof options.title !== "string") {
        throw withCode$2(new Error("ui.pickDirectory: title must be a string"), "invalid_args");
      }
      if ((options.title?.length ?? 0) > 200) {
        throw withCode$2(new Error("ui.pickDirectory: title is too long"), "invalid_args");
      }
      return requirePluginHost().pickDirectory(options);
    },
    [HUB_METHODS.LogWrite]: async (args) => {
      const level = args[0];
      if (level !== "debug" && level !== "info" && level !== "warn" && level !== "error") {
        throw withCode$2(new Error("log.write: invalid level"), "invalid_args");
      }
      if (
        typeof args[1] !== "string" ||
        args[1].length === 0 ||
        new TextEncoder().encode(args[1]).byteLength > 8192
      ) {
        throw withCode$2(
          new Error("log.write: message must be a non-empty UTF-8 string up to 8192 bytes"),
          "invalid_args",
        );
      }
      const details = args[2];
      if (details !== void 0) {
        let encoded;
        try {
          encoded = JSON.stringify(details);
        } catch {
          throw withCode$2(
            new Error("log.write: details must be JSON-serialisable"),
            "invalid_args",
          );
        }
        if (encoded === void 0 || new TextEncoder().encode(encoded).byteLength > 16384) {
          throw withCode$2(
            new Error("log.write: details must be JSON-serialisable and at most 16384 bytes"),
            "invalid_args",
          );
        }
      }
      requirePluginHost().writePluginLog({
        pluginId: installedPluginId(actions, nodeId) ?? "html-node",
        nodeId,
        level,
        message: args[1],
        details,
      });
      return void 0;
    },
    // ── App navigation: renderer-local router drive (no gateway trip).
    // Open-ended pass-through by design — shape-check the envelope only
    // (`to` must be a string; params/search plain objects when present)
    // and hand the rest to the host, which owns the absolute-path and
    // route-existence guards and resolves `false` on a miss.
    [HUB_METHODS.AppNavigate]: async (args) => {
      const raw2 = args[0];
      if (!raw2 || typeof raw2 !== "object" || typeof raw2.to !== "string") {
        throw withCode$2(new Error("app.navigate: missing route path"), "invalid_args");
      }
      if (raw2.params != null && (typeof raw2.params !== "object" || Array.isArray(raw2.params))) {
        throw withCode$2(new Error("app.navigate: params must be an object"), "invalid_args");
      }
      if (raw2.search != null && (typeof raw2.search !== "object" || Array.isArray(raw2.search))) {
        throw withCode$2(new Error("app.navigate: search must be an object"), "invalid_args");
      }
      return requirePluginHost().navigate({
        to: raw2.to,
        params: raw2.params,
        search: raw2.search,
      });
    },
    // ── Fullscreen: drive the canvas-internal html-fullscreen-store
    // directly (no gateway round-trip — fullscreen is pure renderer state).
    // `enter` promotes this node into the at-most-one fullscreen popover
    // (implicitly exiting any other); `exit` only releases if THIS node
    // currently owns it (the store's `exit` is a no-op otherwise, so a
    // plugin can't close another node's fullscreen). The resulting state
    // change is broadcast back via the `fullscreen:changed` effect, so the
    // shim's cached `isFullscreen` / `onFullscreenChange` stay in sync.
    [HUB_METHODS.UiEnterFullscreen]: async () => {
      const state2 = fullscreenApi.getState();
      if (state2.nodeId === nodeId) state2.setPresentation(nodeId, "fullscreen");
      else state2.enter(nodeId);
      return void 0;
    },
    [HUB_METHODS.UiExitFullscreen]: async () => {
      if (requestExitFullscreen) requestExitFullscreen();
      else fullscreenApi.getState().exit(nodeId);
      return void 0;
    },
    // ── Chat: thin pass-through to host (renderer-side ChatController) ────
    // Host owns session lifecycle (create-or-reuse), attachment dedup, and
    // async vs sync routing. The dispatcher's job is the
    // arg→ctx→host handoff plus the caller node id default.
    [HUB_METHODS.ChatSend]: async (args) => {
      const payload = args[0] ?? null;
      if (!payload || typeof payload !== "object" || typeof payload.content !== "string") {
        throw withCode$2(new Error("chat.send: missing content"), "invalid_args");
      }
      return requirePluginHost().sendChatMessage(payload, {
        callerNodeId: nodeId,
      });
    },
    [HUB_METHODS.ChatCancel]: async (args) => {
      const sessionId = String(args[0] ?? "");
      if (!sessionId) throw withCode$2(new Error("chat.cancel: missing sessionId"), "invalid_args");
      await requirePluginHost().cancelChat(sessionId);
      return void 0;
    },
    // ── Agent capability channel: the iframe settles one gateway-originated
    // invoke (`agent.result`) or pushes its compact editor-state snapshot
    // (`agent.setEditorState`). Both originate from the SDK's `hub.agent`.
    [HUB_METHODS.AgentResult]: async (args) => {
      const payload = args[0] ?? null;
      if (!payload || typeof payload !== "object" || typeof payload.invokeId !== "string") {
        throw withCode$2(new Error("agent.result: missing invokeId"), "invalid_args");
      }
      await requirePluginHost().postPluginAgentResult({
        invokeId: payload.invokeId,
        ok: payload.ok === true,
        result: payload.result,
        error:
          payload.error && typeof payload.error === "object"
            ? {
                code: String(payload.error.code ?? "handler_error"),
                message: String(payload.error.message ?? ""),
              }
            : void 0,
      });
      return void 0;
    },
    [HUB_METHODS.AgentSetEditorState]: async (args) => {
      const state2 = args[0];
      if (state2 !== null && typeof state2 !== "string") {
        throw withCode$2(
          new Error("agent.setEditorState: state must be string|null"),
          "invalid_args",
        );
      }
      setPluginAgentEditorState(nodeId, state2);
      return void 0;
    },
    // ── Skill: list / get pass through; run wraps chat.send with
    // `/<name>` prefix + skill existence check.
    [HUB_METHODS.SkillList]: async () => requirePluginHost().listSkills(),
    [HUB_METHODS.SkillGet]: async (args) => {
      const name2 = String(args[0] ?? "");
      if (!name2) throw withCode$2(new Error("skill.get: missing name"), "invalid_args");
      return requirePluginHost().getSkill(name2);
    },
    [HUB_METHODS.SkillRun]: async (args) => {
      const name2 = String(args[0] ?? "");
      if (!name2) throw withCode$2(new Error("skill.run: missing name"), "invalid_args");
      const runArgs = args[1] ?? {};
      const host = requirePluginHost();
      const info2 = await host.getSkill(name2);
      if (!info2) {
        throw withCode$2(new Error(`skill.run: unknown skill "${name2}"`), "not_available");
      }
      if (!info2.enabled) {
        throw withCode$2(
          new Error(`skill.run: skill "${name2}" is disabled — enable it in Settings first`),
          "not_available",
        );
      }
      const body2 =
        typeof runArgs.content === "string" && runArgs.content.length > 0
          ? `/${name2}

${runArgs.content}`
          : `/${name2}`;
      const sendArgs = {
        content: body2,
        sessionId: runArgs.sessionId,
        useCurrentSession: runArgs.useCurrentSession,
        sessionName: runArgs.sessionName || info2.displayNameZh || name2,
        attachments: runArgs.attachments,
        canvasNodeAttachments: runArgs.canvasNodeAttachments,
        sourceNodeId: runArgs.sourceNodeId,
        agentType: runArgs.agentType,
        async: runArgs.async,
      };
      return host.sendChatMessage(sendArgs, {
        callerNodeId: nodeId,
      });
    },
    // ── DAG: thin pass-through to host bridge. The bridge is responsible
    // for the N-way concurrent fan-out (`POST /api/dag/run` per run),
    // partial-failure tolerance, polling, and ownership bookkeeping.
    // Ownership routing is enforced inside the bridge by binding each
    // group to `callerNodeId` (= this iframe's nodeId) at submit time;
    // the matching `subscribeDagDone(nodeId, …)` in the parent effect
    // only fires for envelopes owned by this iframe, so no local
    // per-iframe ledger is required here. Plugin DAG submissions
    // deliberately bypass the gateway's chat-wakeup pipeline (no
    // `session_id` is forwarded), so results only reach the iframe
    // through the host's polling → `subscribeDagDone` → `dag:done`
    // event chain.
    [HUB_METHODS.DagSubmit]: async (args) => {
      const payload = args[0] ?? null;
      if (!payload || typeof payload !== "object" || typeof payload.dag_id !== "string") {
        throw withCode$2(new Error("dag.submit: missing dag_id"), "invalid_args");
      }
      if (!payload.inputs || typeof payload.inputs !== "object") {
        throw withCode$2(new Error("dag.submit: inputs must be an object"), "invalid_args");
      }
      if (!Array.isArray(payload.asset_keys)) {
        throw withCode$2(new Error("dag.submit: asset_keys must be an array"), "invalid_args");
      }
      if (
        payload.concurrency !== void 0 &&
        (!Number.isInteger(payload.concurrency) ||
          payload.concurrency < 1 ||
          payload.concurrency > 5)
      ) {
        throw withCode$2(
          new Error("dag.submit: concurrency must be an integer in [1, 5]"),
          "invalid_args",
        );
      }
      return requirePluginHost().submitDag(payload, {
        callerNodeId: nodeId,
      });
    },
    [HUB_METHODS.DagQuery]: async (args) => {
      const id2 = String(args[0] ?? "");
      if (!id2) throw withCode$2(new Error("dag.query: missing runId"), "invalid_args");
      return requirePluginHost().queryDagRun(id2);
    },
    // ── Files: CDN upload. Only the string-source branch hits the host —
    // Blob sources are short-circuited shim-side (direct multipart POST,
    // same-origin shortcut) and never reach this dispatcher. Reject
    // mistakenly-forwarded Blob args with `invalid_args` so plugin authors
    // discover the wire boundary early instead of seeing a confusing
    // serialization error later.
    [HUB_METHODS.FilesUploadToCdn]: async (args) => {
      const payload = args[0] ?? null;
      if (!payload || typeof payload !== "object") {
        throw withCode$2(new Error("files.uploadToCdn: missing args"), "invalid_args");
      }
      if (typeof payload.source !== "string") {
        throw withCode$2(
          new Error(
            "files.uploadToCdn: host RPC only accepts string source (workspace path); Blob sources go through the shim directly",
          ),
          "invalid_args",
        );
      }
      if (payload.source.length === 0) {
        throw withCode$2(new Error("files.uploadToCdn: empty source"), "invalid_args");
      }
      return requirePluginHost().uploadToCdn({
        source: payload.source,
        name: payload.name,
      });
    },
    [HUB_METHODS.FilesReadFromPluginDir]: async (args) => {
      const pluginId = requirePluginId();
      const payload = args[0] ?? null;
      if (!payload || typeof payload !== "object") {
        throw withCode$2(new Error("files.readFromPluginDir: missing args"), "invalid_args");
      }
      if (typeof payload.path !== "string" || payload.path.length === 0) {
        throw withCode$2(
          new Error("files.readFromPluginDir: `path` must be a non-empty string"),
          "invalid_args",
        );
      }
      return requirePluginHost().readFromPluginDir(pluginId, payload);
    },
    // writeToPluginDir: pluginId-scoped (dispatcher-injected, same guard as
    // python.* / config.*) so a node can only write its own plugin's data.
    [HUB_METHODS.FilesWriteToPluginDir]: async (args) => {
      const pluginId = requirePluginId();
      const payload = args[0] ?? null;
      if (!payload || typeof payload !== "object") {
        throw withCode$2(new Error("files.writeToPluginDir: missing args"), "invalid_args");
      }
      if (typeof payload.path !== "string" || payload.path.length === 0) {
        throw withCode$2(
          new Error("files.writeToPluginDir: `path` must be a non-empty string"),
          "invalid_args",
        );
      }
      if (!(payload.source instanceof Blob)) {
        throw withCode$2(
          new Error("files.writeToPluginDir: `source` must be a Blob"),
          "invalid_args",
        );
      }
      return requirePluginHost().writeToPluginDir(pluginId, {
        path: payload.path,
        source: payload.source,
      });
    },
    // ── Python: per-plugin venv + script execution. Both methods are
    // scoped to the plugin that owns this iframe — the dispatcher reads
    // `pluginId` off the host node's data (written by the gateway at
    // `addPluginNode` time) and passes it to the host bridge, so a node
    // can only touch its own plugin's venv. A non-plugin HTML file-node
    // (no `pluginId`) gets `not_available` — these methods only make
    // sense for installed plugins, which have a directory + requirements.
    [HUB_METHODS.PythonEnsureEnv]: async () => {
      const pluginId = requirePluginId();
      return requirePluginHost().pythonEnsureEnv(pluginId);
    },
    [HUB_METHODS.PythonRun]: async (args) => {
      const pluginId = requirePluginId();
      const payload = args[0] ?? null;
      if (!payload || typeof payload.script !== "string" || !payload.script) {
        throw withCode$2(new Error("python.run: missing script"), "invalid_args");
      }
      return requirePluginHost().pythonRun(pluginId, payload);
    },
    // ── Config: per-plugin global KV, namespaced by pluginId (NOT nodeId).
    // StorageGet/Set for installed plugins is also gateway-backed, but remains
    // node-scoped and workspace-scoped. Config survives node deletion and is
    // shared across every node + workspace of the same plugin. pluginId is
    // dispatcher-injected (same guard as python.*) — a node can only read /
    // write its own plugin's config. Quota / shape validation lives on the
    // gateway (fast-fail) so the host bridge stays a thin pass-through.
    [HUB_METHODS.ConfigGet]: async (args) => {
      const pluginId = requirePluginId();
      const key2 = String(args[0] ?? "");
      if (!key2) throw withCode$2(new Error("config.get: empty key"), "invalid_args");
      return requirePluginHost().configGet(pluginId, key2);
    },
    [HUB_METHODS.ConfigSet]: async (args) => {
      const pluginId = requirePluginId();
      const key2 = String(args[0] ?? "");
      if (!key2) throw withCode$2(new Error("config.set: empty key"), "invalid_args");
      const result = await requirePluginHost().configSet(pluginId, key2, args[1]);
      emitPluginConfigChange(pluginId);
      return result;
    },
    [HUB_METHODS.ConfigDelete]: async (args) => {
      const pluginId = requirePluginId();
      const key2 = String(args[0] ?? "");
      if (!key2) throw withCode$2(new Error("config.delete: empty key"), "invalid_args");
      const result = await requirePluginHost().configDelete(pluginId, key2);
      emitPluginConfigChange(pluginId);
      return result;
    },
    [HUB_METHODS.ConfigKeys]: async () => {
      const pluginId = requirePluginId();
      return requirePluginHost().configKeys(pluginId);
    },
    [HUB_METHODS.BillingGetNodePriceDescription]: async (args) => {
      const nodeType = args[0];
      if (typeof nodeType !== "string" || !BILLING_NODE_TYPES.has(nodeType)) {
        throw withCode$2(
          new Error("billing.getNodePriceDescription: unsupported node type"),
          "invalid_args",
        );
      }
      return requirePluginHost().getNodePriceDescription(nodeType);
    },
  };
}
function readStorage(actions, nodeId) {
  const snap = actions.getNodeById(nodeId);
  if (!snap) return {};
  const bucket = snap.data[PLUGIN_STORAGE_KEY];
  return bucket && typeof bucket === "object" ? bucket : {};
}
function writeStoragePatch(actions, nodeId, next2) {
  const snap = actions.getNodeById(nodeId);
  const base2 = snap?.data ?? {};
  return {
    ...base2,
    [PLUGIN_STORAGE_KEY]: next2,
  };
}
async function writeThroughPluginData(pluginHost, args) {
  if (!pluginHost) return;
  try {
    await pluginHost.writePluginData(args);
  } catch (err) {
    console.warn("[plugin-host] pluginStorage write-through failed:", err);
  }
}
function buildResource(nodeId, assetId, meta2, type2) {
  const resource = {
    nodeId,
    assetId,
    type: type2,
    name: meta2.name,
    url: meta2.url,
    path: meta2.path,
  };
  if (meta2.width !== void 0) resource.width = meta2.width;
  if (meta2.height !== void 0) resource.height = meta2.height;
  if (meta2.durationSec !== void 0) resource.durationSec = meta2.durationSec;
  if (meta2.fileSize !== void 0) resource.fileSize = meta2.fileSize;
  return resource;
}
function normaliseAssetType$1(raw2, fileName) {
  if (fileName && isSubtitleFileName(fileName)) return "subtitle";
  switch (raw2) {
    case "image":
    case "video":
    case "audio":
    case "text":
      return raw2;
    default:
      return "file";
  }
}
function nodeTypeToAssetType(raw2) {
  switch (raw2) {
    case "image":
    case "video":
    case "audio":
    case "text":
    case "file":
      return raw2;
    case "placeholder":
      return "placeholder";
    default:
      return "file";
  }
}
function matchesFilter(type2, filter2) {
  if (!filter2?.type) return true;
  const allowed = Array.isArray(filter2.type) ? filter2.type : [filter2.type];
  return allowed.includes(type2);
}
function withCode$2(err, code2) {
  err.code = code2;
  return err;
}
function ViewerStateShell({ children: children2 }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted px-6 text-center">
      {children2}
    </div>
  );
}
export function ViewerLoading({ label }) {
  const { t: t2 } = useTranslation();
  return (
    <ViewerStateShell>
      <div
        className="size-5 animate-[canvas-spin_0.8s_linear_infinite] rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground"
        aria-hidden={true}
      />
      <div className="text-xs text-muted-foreground">
        {label ?? t2("canvas.file.viewer.loading", "加载中...")}
      </div>
    </ViewerStateShell>
  );
}
export function ViewerError({ messageKey }) {
  const { t: t2 } = useTranslation();
  return (
    <ViewerStateShell>
      <div className="text-sm font-medium text-foreground">
        {t2(messageKey ?? "canvas.file.viewer.loadFailed", "预览加载失败")}
      </div>
    </ViewerStateShell>
  );
}
function ViewerNotFound({ messageKey, detail }) {
  const { t: t2 } = useTranslation();
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted px-6 text-center">
      <FileMissingIcon />
      <div className="text-sm font-medium text-foreground">
        {t2(
          messageKey ?? "canvas.file.viewer.notFound",
          "找不到文件，可能已被删除或对应插件已卸载",
        )}
      </div>
      {detail ? (
        <div className="max-w-full truncate text-xs text-muted-foreground">{detail}</div>
      ) : null}
    </div>
  );
}
const CANVAS_PRESENTATION_LAYOUT_SETTLE_MS = 250;
function useUrlAvailability(url2, reloadKey) {
  const [state2, setState] = reactExports.useState("checking");
  const probeInput = reactExports.useMemo(
    () => ({
      url: url2,
      reloadKey,
    }),
    [url2, reloadKey],
  );
  reactExports.useEffect(() => {
    const probeUrl = probeInput.url;
    if (!probeUrl) {
      setState("checking");
      return;
    }
    const controller = new AbortController();
    setState("checking");
    fetch(probeUrl, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) => {
        if (controller.signal.aborted) return;
        if (res.status === 404) setState("not-found");
        else setState("ok");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState("error");
      });
    return () => controller.abort();
  }, [probeInput]);
  return state2;
}
function getWindowBridge$1() {
  const platform2 = window.__HILO_PLATFORM__;
  return platform2?.window;
}
let htmlViewerHolderCounter = 0;
export function HtmlViewer({
  filePath,
  interactive,
  displayName: displayName2,
  eagerActivate,
  pluginOpenRequest,
  supportsCanvasPresentation,
  surface,
  requestExitFullscreen,
}) {
  const nodeId = useNodeId() ?? "";
  const [holderId2] = reactExports.useState(() => `html-viewer-${++htmlViewerHolderCounter}`);
  const poolApi = useHtmlIframePoolApi();
  const handleStoreApi = useHtmlViewerHandleApi();
  const isPoolActive = useIsHtmlIframeActive(nodeId);
  const [eager] = reactExports.useState(() => !!eagerActivate);
  reactExports.useEffect(() => {
    if (!nodeId) return;
    if (eager) poolApi.getState().activateManual(nodeId, holderId2);
    else poolApi.getState().requestAuto(nodeId, holderId2);
    return () => {
      poolApi.getState().release(nodeId, holderId2);
    };
  }, [nodeId, poolApi, holderId2, eager]);
  const handleManualActivate = reactExports.useCallback(() => {
    if (!nodeId) return;
    poolApi.getState().activateManual(nodeId, holderId2);
  }, [nodeId, poolApi, holderId2]);
  const [reloadKey, setReloadKey] = reactExports.useState(0);
  const reload = reactExports.useCallback(() => {
    setReloadKey((key2) => key2 + 1);
  }, []);
  reactExports.useEffect(() => {
    if (!nodeId) return;
    handleStoreApi.getState().set(nodeId, {
      reload,
      activate: handleManualActivate,
    });
    return () => {
      handleStoreApi.getState().clear(nodeId);
    };
  }, [nodeId, reload, handleManualActivate, handleStoreApi]);
  if (!nodeId) return <ViewerLoading />;
  if (isPoolActive) {
    return (
      <HtmlViewerInner
        filePath={filePath}
        interactive={interactive}
        displayName={displayName2}
        pluginOpenRequest={pluginOpenRequest}
        supportsCanvasPresentation={supportsCanvasPresentation}
        surface={surface}
        requestExitFullscreen={requestExitFullscreen}
        reloadKey={reloadKey}
      />
    );
  }
  return <HtmlViewerPlaceholder displayName={displayName2} onActivate={handleManualActivate} />;
}
function HtmlViewerInner({
  filePath,
  interactive,
  displayName: displayName2,
  pluginOpenRequest,
  supportsCanvasPresentation,
  surface,
  requestExitFullscreen,
  reloadKey,
}) {
  const inlineSurface = surface === "inline";
  const { t: t2 } = useTranslation();
  const nodeId = useNodeId() ?? "";
  const actions = useCanvasActions();
  const active2 = useCanvasActive();
  const { onPluginEditorOpen, pluginEditorAgentVisible, resolvePluginAssetUrl } = useCanvasBridge();
  const pluginUrl = reactExports.useMemo(() => {
    if (!nodeId || !resolvePluginAssetUrl) return null;
    const data2 = actions.getNodeById(nodeId)?.data;
    const pid = typeof data2?.pluginId === "string" ? data2.pluginId : null;
    const entry = typeof data2?.pluginEntry === "string" ? data2.pluginEntry : null;
    return pid && entry ? resolvePluginAssetUrl(pid, entry) : null;
  }, [nodeId, actions, resolvePluginAssetUrl]);
  const workspaceFileUrl = useFileUrl(filePath, {
    cacheBust: false,
  });
  const rawFileUrl = pluginUrl ?? workspaceFileUrl;
  const fileUrl = reactExports.useMemo(() => {
    if (!rawFileUrl) return rawFileUrl;
    const browserUrl = toWorkspaceBrowserUrl(rawFileUrl);
    if (!pluginOpenRequest) return browserUrl;
    const url2 = new URL(browserUrl);
    url2.searchParams.set("hubWorkflow", pluginOpenRequest.workflow);
    url2.searchParams.set("hubWorkflowRequestId", pluginOpenRequest.requestId);
    url2.searchParams.set("hubWorkflowCommand", pluginOpenRequest.command);
    if (pluginOpenRequest.workflowId) {
      url2.searchParams.set("hubWorkflowId", pluginOpenRequest.workflowId);
    }
    if (pluginOpenRequest.target) {
      url2.searchParams.set("hubWorkflowTarget", pluginOpenRequest.target);
    }
    return url2.toString();
  }, [rawFileUrl, pluginOpenRequest]);
  const [iframeEl, setIframeEl] = reactExports.useState(null);
  const fullscreenApi = useHtmlFullscreenApi();
  const exitFullscreen = reactExports.useCallback(() => {
    if (!nodeId) return false;
    if (requestExitFullscreen) return requestExitFullscreen();
    fullscreenApi.getState().exit(nodeId);
    return true;
  }, [fullscreenApi, nodeId, requestExitFullscreen]);
  usePluginHost(iframeEl, nodeId, requestExitFullscreen ? exitFullscreen : void 0);
  const presentation = useHtmlViewerPresentation(nodeId);
  const isPresented = presentation !== null;
  const isFullscreen = presentation === "fullscreen";
  const [containerEl, setContainerElState] = reactExports.useState(null);
  const setContainerEl = reactExports.useCallback(
    (el) => {
      setContainerElState(el);
      if (nodeId) fullscreenApi.getState().setContainerEl(nodeId, el);
    },
    [nodeId, fullscreenApi],
  );
  reactExports.useEffect(() => {
    if (!containerEl || inlineSurface) return;
    if (isPresented) {
      try {
        containerEl.showPopover();
      } catch {}
    } else {
      try {
        containerEl.hidePopover();
      } catch {}
    }
  }, [isPresented, containerEl, inlineSurface]);
  reactExports.useLayoutEffect(() => {
    if (!containerEl || presentation !== "canvas") return;
    const canvasHost = containerEl.closest('[data-workspace-canvas-viewport-host="true"]');
    if (!canvasHost) return;
    const updateBounds = () => {
      const bounds = canvasHost.getBoundingClientRect();
      containerEl.style.setProperty("--html-viewer-canvas-top", `${bounds.top}px`);
      containerEl.style.setProperty("--html-viewer-canvas-left", `${bounds.left}px`);
      containerEl.style.setProperty("--html-viewer-canvas-width", `${bounds.width}px`);
      containerEl.style.setProperty("--html-viewer-canvas-height", `${bounds.height}px`);
    };
    updateBounds();
    const observer2 = new ResizeObserver(updateBounds);
    observer2.observe(canvasHost);
    let layoutSettleTimer = null;
    const mutationObserver = new MutationObserver(() => {
      updateBounds();
      if (layoutSettleTimer !== null) window.clearTimeout(layoutSettleTimer);
      layoutSettleTimer = window.setTimeout(updateBounds, CANVAS_PRESENTATION_LAYOUT_SETTLE_MS);
    });
    mutationObserver.observe(canvasHost, {
      attributes: true,
      attributeFilter: ["data-layout-relocation-key"],
    });
    window.addEventListener("resize", updateBounds);
    return () => {
      observer2.disconnect();
      mutationObserver.disconnect();
      if (layoutSettleTimer !== null) window.clearTimeout(layoutSettleTimer);
      window.removeEventListener("resize", updateBounds);
    };
  }, [containerEl, presentation]);
  reactExports.useEffect(() => {
    if (!containerEl || !nodeId) return;
    const onToggle = (e2) => {
      const tev = e2;
      if (tev.newState === "closed" && fullscreenApi.getState().nodeId === nodeId) {
        fullscreenApi.getState().exit(nodeId);
      }
    };
    containerEl.addEventListener("toggle", onToggle);
    return () => containerEl.removeEventListener("toggle", onToggle);
  }, [nodeId, fullscreenApi, containerEl]);
  reactExports.useEffect(() => {
    if (!active2 || !isFullscreen || !nodeId) return;
    const onKey = (e2) => {
      if (e2.key !== "Escape") return;
      e2.preventDefault();
      e2.stopPropagation();
      exitFullscreen();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [active2, isFullscreen, nodeId, exitFullscreen]);
  reactExports.useEffect(() => {
    if (!isFullscreen || inlineSurface) return;
    const bridge = getWindowBridge$1();
    bridge?.setWindowButtonVisibility?.(false);
    return () => {
      bridge?.setWindowButtonVisibility?.(true);
    };
  }, [isFullscreen, inlineSurface]);
  const togglePresentation = reactExports.useCallback(() => {
    if (!nodeId || !presentation || !supportsCanvasPresentation) return;
    if (presentation === "fullscreen") {
      fullscreenApi.getState().leaveFullscreen(nodeId);
      return;
    }
    fullscreenApi.getState().setPresentation(nodeId, "fullscreen");
  }, [fullscreenApi, nodeId, presentation, supportsCanvasPresentation]);
  const isConnecting = useConnection((c3) => c3.inProgress);
  const allowPointer = isPresented || inlineSurface ? true : interactive && !isConnecting;
  const availability = useUrlAvailability(fileUrl, reloadKey);
  if (!fileUrl) return <ViewerLoading />;
  if (availability === "checking") return <ViewerLoading />;
  if (availability === "not-found") return <ViewerNotFound detail={displayName2} />;
  return (
    <div
      ref={setContainerEl}
      {...(inlineSurface
        ? {}
        : {
            popover: "manual",
          })}
      className={inlineSurface ? "h-full w-full" : "html-viewer-popover"}
      data-presentation={presentation ?? "inline"}
      data-action-ui-id="canvas.file-node.html-fullscreen-container"
    >
      <iframe
        key={reloadKey}
        ref={setIframeEl}
        src={fileUrl}
        title={displayName2 ?? "HTML preview"}
        loading="lazy"
        className={`${allowPointer ? "nowheel pointer-events-auto " : "pointer-events-none "}h-full w-full border-0 bg-background`}
      />
      {pluginUrl && !isPresented && nodeId && (
        <button
          type="button"
          className="html-viewer-inline-remove"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            actions.removeNode(nodeId);
          }}
          aria-label={t2("shortcuts.action.deleteNode", "删除节点")}
          data-action-ui-id="canvas.file-node.remove-plugin-inline"
        />
      )}
      <div className="html-viewer-popover-actions">
        {supportsCanvasPresentation &&
          presentation === "canvas" &&
          pluginEditorAgentVisible === false && (
            <button
              type="button"
              className="html-viewer-popover-action"
              onClick={() => onPluginEditorOpen?.()}
              aria-label={t2("workspace.openChat", "Open Chat")}
              data-action-ui-id="canvas.file-node.open-agent"
            >
              <MessageSquare size={18} strokeWidth={1.5} aria-hidden="true" />
            </button>
          )}
        {supportsCanvasPresentation && (
          <button
            type="button"
            className="html-viewer-popover-action"
            onClick={togglePresentation}
            aria-label={
              isFullscreen
                ? t2("canvas.file.showInCanvas", "在画布中显示")
                : t2("canvas.file.enterFullscreen", "全屏预览")
            }
            data-action-ui-id="canvas.file-node.toggle-presentation"
          >
            {isFullscreen ? (
              <Minimize2 size={18} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Maximize2 size={18} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
        )}
        {supportsCanvasPresentation && presentation === "canvas" && nodeId && (
          <button
            type="button"
            className="html-viewer-popover-action"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              actions.removeNode(nodeId);
            }}
            aria-label={t2("shortcuts.action.deleteNode", "删除节点")}
            data-action-ui-id="canvas.file-node.remove-plugin"
          >
            <X$7 size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
        {inlineSurface && (
          <button
            type="button"
            className="html-viewer-popover-action"
            onClick={exitFullscreen}
            aria-label={t2("canvas.file.exitFullscreen", "退出全屏")}
            data-action-ui-id="canvas.file-node.exit-fullscreen"
          >
            <Minimize2 size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
export function WorkspaceContentBudgetScopeProvider({
  workspaceId: workspaceId2,
  children: children2,
}) {
  const scopedWorkspaceId = workspaceScope$1(workspaceId2);
  reactExports.useEffect(() => {
    return () => resetWorkspaceContentBudget(scopedWorkspaceId);
  }, [scopedWorkspaceId]);
  return reactExports.createElement(
    WorkspaceContentBudgetScopeContext.Provider,
    {
      value: scopedWorkspaceId,
    },
    children2,
  );
}
function resetWorkspaceContentBudget(workspaceId2) {
  statesByWorkspace.delete(workspaceScope$1(workspaceId2));
}
export function shouldShowComfyUiTemplateAction({
  currentWorkflowId,
  hasWorkflowContent,
  backendReady,
}) {
  return backendReady !== false && !currentWorkflowId?.trim() && hasWorkflowContent !== true;
}
export function shouldCreateComfyUiOpenRequest(isPreviewActive) {
  return !isPreviewActive;
}
export function shouldAllowComfyUiPreviewInteraction(backendReady) {
  return backendReady !== true;
}
export function createComfyUiWorkflowRequestId(nodeId, workflowId, workflowRevision) {
  return `${nodeId}:${workflowId}:${workflowRevision ?? 0}`;
}
export function publishComfyUiRetryRequest({
  activeRequest,
  retryRequest,
  setActiveRequest,
  setLocalRequest,
}) {
  if (activeRequest) {
    setActiveRequest(retryRequest);
    setLocalRequest(retryRequest);
    return;
  }
  setLocalRequest(retryRequest);
}
export function filterComfyUiWorkflows(workflows, query) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [...workflows];
  return workflows.filter((workflow) =>
    [workflow.title, workflow.name, workflow.short_desc ?? "", ...(workflow.tags ?? [])]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalized),
  );
}
export const COMFYUI_PREVIEW_UNLOAD_AFTER_MS = 6e3;
export const COMFYUI_PREVIEW_SCALE = 0.6;
