// build-dispatch.js
import { isSubtitleFileName } from "../canvas/is-reexecutable-generation-node.js";
import {
  configChangeListeners,
  installedPluginId,
  PLUGIN_STORAGE_KEY,
  upsert,
} from "./input.jsx";
import {
  CANVAS_MAX_ZOOM,
  CANVAS_MIN_ZOOM,
} from "../infra/use-plugin-metadata-store.js";
import { parseNodeId } from "../canvas/find-free-position-from-anchor.js";
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
const PLUGIN_AGENT_EDITOR_STATE_MAX_CHARS = 6e3;
function setPluginAgentEditorState(nodeId, state2) {
  const bounded =
    typeof state2 === "string"
      ? state2.slice(0, PLUGIN_AGENT_EDITOR_STATE_MAX_CHARS)
      : null;
  upsert(nodeId, {
    editorState: bounded,
  });
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
const IMMUTABLE_PLUGIN_NODE_DATA_KEYS = new Set([
  ...HIDDEN_NODE_DATA_KEYS,
  "pluginId",
]);
function sanitiseNodeData(data2) {
  const out = {};
  for (const [k2, v2] of Object.entries(data2)) {
    if (HIDDEN_NODE_DATA_KEYS.has(k2)) continue;
    out[k2] = v2;
  }
  return out;
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
const BILLING_NODE_TYPES = new Set(HUB_BILLING_NODE_TYPES);
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
function normaliseAssetType(raw2, fileName) {
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
function withCode(err, code2) {
  err.code = code2;
  return err;
}
export function buildDispatch(deps) {
  const {
    nodeId,
    actions,
    bridge,
    assetMetadataApi,
    fullscreenApi,
    requestExitFullscreen,
  } = deps;
  const requirePluginHost = () => {
    if (!bridge.pluginHost) {
      throw withCode(
        new Error("plugin host bridge not configured by renderer"),
        "not_available",
      );
    }
    return bridge.pluginHost;
  };
  const requirePluginId = () => {
    const snap = actions.getNodeById(nodeId);
    const pluginId = snap?.data?.pluginId;
    if (typeof pluginId !== "string" || !pluginId) {
      throw withCode(
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
      typeof snap?.data?.pluginVersion === "string"
        ? snap.data.pluginVersion
        : void 0;
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
        const type2 = normaliseAssetType(meta2.type, meta2.path || meta2.name);
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
        const type2 = normaliseAssetType(meta2.type, meta2.path || meta2.name);
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
        throw withCode(
          new Error("focusNode: options must be an object"),
          "invalid_args",
        );
      }
      const options = rawOptions ?? {};
      if (
        options.preserveZoom !== void 0 &&
        typeof options.preserveZoom !== "boolean"
      ) {
        throw withCode(
          new Error("focusNode: preserveZoom must be a boolean"),
          "invalid_args",
        );
      }
      if (
        options.zoom !== void 0 &&
        (typeof options.zoom !== "number" ||
          !Number.isFinite(options.zoom) ||
          options.zoom < CANVAS_MIN_ZOOM ||
          options.zoom > CANVAS_MAX_ZOOM)
      ) {
        throw withCode(
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
      const result =
        await requirePluginHost().insertVideoNode(normalizedRequest);
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
      const result =
        await requirePluginHost().insertAudioNode(normalizedRequest);
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
      if (!targetId)
        throw withCode(
          new Error("updateNodeData: missing nodeId"),
          "invalid_args",
        );
      const rawPatch = args[1];
      if (
        !rawPatch ||
        typeof rawPatch !== "object" ||
        Array.isArray(rawPatch)
      ) {
        throw withCode(
          new Error("updateNodeData: patch must be an object"),
          "invalid_args",
        );
      }
      const patch2 = rawPatch;
      for (const key2 of Object.keys(patch2)) {
        if (IMMUTABLE_PLUGIN_NODE_DATA_KEYS.has(key2)) {
          throw withCode(
            new Error(
              `updateNodeData: reserved data key "${key2}" cannot be changed`,
            ),
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
        reportPluginOutputs(
          [payload.placeholderId],
          "image",
          Date.now() - startedAt,
        );
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
      if (
        !payload ||
        typeof payload.sourceNodeId !== "string" ||
        !payload.sourceNodeId
      ) {
        throw withCode(
          new Error("addPlaceholder: missing sourceNodeId"),
          "invalid_args",
        );
      }
      if (typeof payload.prompt !== "string" || !payload.prompt) {
        throw withCode(
          new Error("addPlaceholder: prompt must be non-empty"),
          "invalid_args",
        );
      }
      if (typeof payload.model !== "string" || !payload.model) {
        throw withCode(
          new Error("addPlaceholder: model must be non-empty"),
          "invalid_args",
        );
      }
      return requirePluginHost().addPlaceholder(payload);
    },
    [HUB_METHODS.CanvasFailPlaceholder]: async (args) => {
      const id2 = String(args[0] ?? "");
      const msg = String(args[1] ?? "");
      if (!id2)
        throw withCode(
          new Error("failPlaceholder: missing id"),
          "invalid_args",
        );
      if (!msg)
        throw withCode(
          new Error("failPlaceholder: errorMessage must be non-empty"),
          "invalid_args",
        );
      await requirePluginHost().failPlaceholder(id2, msg);
      return void 0;
    },
    [HUB_METHODS.CanvasCleanupPlaceholder]: async (args) => {
      const id2 = String(args[0] ?? "");
      if (!id2)
        throw withCode(
          new Error("cleanupPlaceholder: missing id"),
          "invalid_args",
        );
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
      if (!key2)
        throw withCode(new Error("storage.set: empty key"), "invalid_args");
      const value = args[1];
      const valueSize = pluginStorageByteSize(value);
      const pluginId = installedPluginId(actions, nodeId);
      const maxValueBytes =
        pluginId === "comfyui" && key2 === COMFYUI_WORKFLOW_DRAFT_STORAGE_KEY
          ? COMFYUI_WORKFLOW_DRAFT_MAX_BYTES
          : PLUGIN_STORAGE_MAX_VALUE_BYTES;
      if (valueSize > maxValueBytes) {
        throw withCode(
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
        throw withCode(
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
        throw withCode(
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
        throw withCode(new Error("ui.notify: invalid level"), "invalid_args");
      }
      if (message2.length === 0 || message2.length > 500) {
        throw withCode(new Error("ui.notify: invalid message"), "invalid_args");
      }
      if (
        options &&
        (typeof options !== "object" ||
          Array.isArray(options) ||
          (options.description !== void 0 &&
            (typeof options.description !== "string" ||
              options.description.length > 1e3)) ||
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
        throw withCode(new Error("ui.notify: invalid options"), "invalid_args");
      }
      requirePluginHost().notify(message2, level, options);
      return void 0;
    },
    [HUB_METHODS.UiSaveFile]: async (args) => {
      requirePluginId();
      const payload = args[0] ?? null;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw withCode(new Error("ui.saveFile: missing args"), "invalid_args");
      }
      const source = payload.source;
      const validSource =
        (typeof source === "string" &&
          source.length > 0 &&
          source.length <= 4096) ||
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
          (typeof payload.mimeType !== "string" ||
            payload.mimeType.length > 200)) ||
        (payload.title !== void 0 &&
          (typeof payload.title !== "string" || payload.title.length > 200))
      ) {
        throw withCode(new Error("ui.saveFile: invalid args"), "invalid_args");
      }
      return requirePluginHost().saveFile(payload);
    },
    [HUB_METHODS.ComfyUiDownloadModel]: async (args) => {
      const pluginId = requirePluginId();
      if (pluginId !== "comfyui") {
        throw withCode(
          new Error(
            "comfyui.downloadModel is only available to the bundled ComfyUI plugin",
          ),
          "not_available",
        );
      }
      const payload = args[0] ?? null;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw withCode(
          new Error("comfyui.downloadModel: missing args"),
          "invalid_args",
        );
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
        throw withCode(
          new Error(
            "comfyui.downloadModel: invalid url, filename, or directory",
          ),
          "invalid_args",
        );
      }
      return requirePluginHost().downloadComfyUiModel(payload);
    },
    [HUB_METHODS.UiPickDirectory]: async (args) => {
      requirePluginId();
      const options = args[0] ?? {};
      if (typeof options !== "object" || Array.isArray(options)) {
        throw withCode(
          new Error("ui.pickDirectory: options must be an object"),
          "invalid_args",
        );
      }
      if (options.title !== void 0 && typeof options.title !== "string") {
        throw withCode(
          new Error("ui.pickDirectory: title must be a string"),
          "invalid_args",
        );
      }
      if ((options.title?.length ?? 0) > 200) {
        throw withCode(
          new Error("ui.pickDirectory: title is too long"),
          "invalid_args",
        );
      }
      return requirePluginHost().pickDirectory(options);
    },
    [HUB_METHODS.LogWrite]: async (args) => {
      const level = args[0];
      if (
        level !== "debug" &&
        level !== "info" &&
        level !== "warn" &&
        level !== "error"
      ) {
        throw withCode(new Error("log.write: invalid level"), "invalid_args");
      }
      if (
        typeof args[1] !== "string" ||
        args[1].length === 0 ||
        new TextEncoder().encode(args[1]).byteLength > 8192
      ) {
        throw withCode(
          new Error(
            "log.write: message must be a non-empty UTF-8 string up to 8192 bytes",
          ),
          "invalid_args",
        );
      }
      const details = args[2];
      if (details !== void 0) {
        let encoded;
        try {
          encoded = JSON.stringify(details);
        } catch {
          throw withCode(
            new Error("log.write: details must be JSON-serialisable"),
            "invalid_args",
          );
        }
        if (
          encoded === void 0 ||
          new TextEncoder().encode(encoded).byteLength > 16384
        ) {
          throw withCode(
            new Error(
              "log.write: details must be JSON-serialisable and at most 16384 bytes",
            ),
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
        throw withCode(
          new Error("app.navigate: missing route path"),
          "invalid_args",
        );
      }
      if (
        raw2.params != null &&
        (typeof raw2.params !== "object" || Array.isArray(raw2.params))
      ) {
        throw withCode(
          new Error("app.navigate: params must be an object"),
          "invalid_args",
        );
      }
      if (
        raw2.search != null &&
        (typeof raw2.search !== "object" || Array.isArray(raw2.search))
      ) {
        throw withCode(
          new Error("app.navigate: search must be an object"),
          "invalid_args",
        );
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
      if (state2.nodeId === nodeId)
        state2.setPresentation(nodeId, "fullscreen");
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
      if (
        !payload ||
        typeof payload !== "object" ||
        typeof payload.content !== "string"
      ) {
        throw withCode(new Error("chat.send: missing content"), "invalid_args");
      }
      return requirePluginHost().sendChatMessage(payload, {
        callerNodeId: nodeId,
      });
    },
    [HUB_METHODS.ChatCancel]: async (args) => {
      const sessionId = String(args[0] ?? "");
      if (!sessionId)
        throw withCode(
          new Error("chat.cancel: missing sessionId"),
          "invalid_args",
        );
      await requirePluginHost().cancelChat(sessionId);
      return void 0;
    },
    // ── Agent capability channel: the iframe settles one gateway-originated
    // invoke (`agent.result`) or pushes its compact editor-state snapshot
    // (`agent.setEditorState`). Both originate from the SDK's `hub.agent`.
    [HUB_METHODS.AgentResult]: async (args) => {
      const payload = args[0] ?? null;
      if (
        !payload ||
        typeof payload !== "object" ||
        typeof payload.invokeId !== "string"
      ) {
        throw withCode(
          new Error("agent.result: missing invokeId"),
          "invalid_args",
        );
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
        throw withCode(
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
      if (!name2)
        throw withCode(new Error("skill.get: missing name"), "invalid_args");
      return requirePluginHost().getSkill(name2);
    },
    [HUB_METHODS.SkillRun]: async (args) => {
      const name2 = String(args[0] ?? "");
      if (!name2)
        throw withCode(new Error("skill.run: missing name"), "invalid_args");
      const runArgs = args[1] ?? {};
      const host = requirePluginHost();
      const info2 = await host.getSkill(name2);
      if (!info2) {
        throw withCode(
          new Error(`skill.run: unknown skill "${name2}"`),
          "not_available",
        );
      }
      if (!info2.enabled) {
        throw withCode(
          new Error(
            `skill.run: skill "${name2}" is disabled — enable it in Settings first`,
          ),
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
      if (
        !payload ||
        typeof payload !== "object" ||
        typeof payload.dag_id !== "string"
      ) {
        throw withCode(new Error("dag.submit: missing dag_id"), "invalid_args");
      }
      if (!payload.inputs || typeof payload.inputs !== "object") {
        throw withCode(
          new Error("dag.submit: inputs must be an object"),
          "invalid_args",
        );
      }
      if (!Array.isArray(payload.asset_keys)) {
        throw withCode(
          new Error("dag.submit: asset_keys must be an array"),
          "invalid_args",
        );
      }
      if (
        payload.concurrency !== void 0 &&
        (!Number.isInteger(payload.concurrency) ||
          payload.concurrency < 1 ||
          payload.concurrency > 5)
      ) {
        throw withCode(
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
      if (!id2)
        throw withCode(new Error("dag.query: missing runId"), "invalid_args");
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
        throw withCode(
          new Error("files.uploadToCdn: missing args"),
          "invalid_args",
        );
      }
      if (typeof payload.source !== "string") {
        throw withCode(
          new Error(
            "files.uploadToCdn: host RPC only accepts string source (workspace path); Blob sources go through the shim directly",
          ),
          "invalid_args",
        );
      }
      if (payload.source.length === 0) {
        throw withCode(
          new Error("files.uploadToCdn: empty source"),
          "invalid_args",
        );
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
        throw withCode(
          new Error("files.readFromPluginDir: missing args"),
          "invalid_args",
        );
      }
      if (typeof payload.path !== "string" || payload.path.length === 0) {
        throw withCode(
          new Error(
            "files.readFromPluginDir: `path` must be a non-empty string",
          ),
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
        throw withCode(
          new Error("files.writeToPluginDir: missing args"),
          "invalid_args",
        );
      }
      if (typeof payload.path !== "string" || payload.path.length === 0) {
        throw withCode(
          new Error(
            "files.writeToPluginDir: `path` must be a non-empty string",
          ),
          "invalid_args",
        );
      }
      if (!(payload.source instanceof Blob)) {
        throw withCode(
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
        throw withCode(new Error("python.run: missing script"), "invalid_args");
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
      if (!key2)
        throw withCode(new Error("config.get: empty key"), "invalid_args");
      return requirePluginHost().configGet(pluginId, key2);
    },
    [HUB_METHODS.ConfigSet]: async (args) => {
      const pluginId = requirePluginId();
      const key2 = String(args[0] ?? "");
      if (!key2)
        throw withCode(new Error("config.set: empty key"), "invalid_args");
      const result = await requirePluginHost().configSet(
        pluginId,
        key2,
        args[1],
      );
      emitPluginConfigChange(pluginId);
      return result;
    },
    [HUB_METHODS.ConfigDelete]: async (args) => {
      const pluginId = requirePluginId();
      const key2 = String(args[0] ?? "");
      if (!key2)
        throw withCode(new Error("config.delete: empty key"), "invalid_args");
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
        throw withCode(
          new Error("billing.getNodePriceDescription: unsupported node type"),
          "invalid_args",
        );
      }
      return requirePluginHost().getNodePriceDescription(nodeType);
    },
  };
}
