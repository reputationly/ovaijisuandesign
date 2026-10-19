/**
 * v3 画布的协议常量。
 *
 * 从产物 `index-*.js` 逐条取回（第 72 轮）。这些是 `CanvasAreaV3` 直接 import 的常量，
 * 原先散在主包里、没有还原；抽出来集中放，后续还原 v3 代码时从这里取。
 *
 * 说明：只搬了**值本身**，没有改动任何语义。
 */
import { CANVAS_V3_IMAGE_MAX_BYTES, CANVAS_V3_TEXT_GENERATION_ROUTES, CLIP_STUDIO_CAPABILITY_ID } from "./frame-services.js";
import { coachMarkImage } from "../workspace/topbar-state-context.jsx";
import { MAX_VISIBLE_CANVAS_TAG_COLORS } from "../infra/parse-connector-selection.js";

// 产物里 v3 的引导图在共享图上多挂了一个版本号参数。
function v3CoachMarkImage(baseName) {
  return `${coachMarkImage(baseName)}&v=20261012-optimized`;
}

const CANVAS_STICKER_NODE_SIZE = { width: 56, height: 56 };

const CANVAS_V3_AUDIO_ACCEPT = ".mp3,.wav,.m4a,.aac,.ogg,.oga,.opus,.weba,.flac,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg,audio/webm,audio/flac,audio/x-flac";

const CANVAS_V3_CLIPBOARD_MAX_BYTES = 16 * 1024 * 1024;

const CANVAS_V3_CLIPBOARD_MIME = "application/x-hilo-canvas-v3";

const CANVAS_V3_CLIPBOARD_PREFIX = "hilo-canvas-v3:";

const CANVAS_V3_CONTENT_KINDS = Object.freeze([
  "image",
  "video",
  "audio",
  "text",
  "file",
  "table"
]);

const CANVAS_V3_DEFAULT_NODE_SIZES = Object.freeze({
  image: Object.freeze({ width: 350, height: 350 }),
  video: Object.freeze({ width: 350, height: 280 }),
  audio: Object.freeze({ width: 350, height: 150 }),
  text: Object.freeze({ width: 350, height: 500 }),
  // Mirrors TABLE_CARD_DEFAULT_SIZE; the table body is a `.htable` TEXT_DOCUMENT version.
  table: Object.freeze({ width: 350, height: 200 })
});

const CANVAS_V3_FRAME_PADDING = { x: 24, top: 48, bottom: 24 };

const CANVAS_V3_IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif";

const CANVAS_V3_IMAGE_DOWNLOAD_MAX_BYTES = 256 * 1024 * 1024;

const CANVAS_V3_VIDEO_ACCEPT = ".mp4,.mov,.webm,.m4v,video/mp4,video/quicktime,video/webm";

const CANVAS_V3_MEDIA_ACCEPT = `${CANVAS_V3_VIDEO_ACCEPT},${CANVAS_V3_AUDIO_ACCEPT}`;

const CANVAS_V3_RESOURCE_DRAG_MIME = "application/x-hilo-canvas-v3-resource";

const CANVAS_V3_SUBJECT_PREVIEW_SIZE = { width: 640, height: 600 };

const CANVAS_V3_SUBJECT_TYPE_HEADER = 64;

const CANVAS_V3_SUBJECT_TYPE_PADDING = 32;

const CANVAS_V3_TEXT_REFERENCE_LIMITS = {
  image: 6,
  video: 2,
  audio: 2,
  text: 5
};

const CDN_COACHMARK_V3_GROUP_ADD = v3CoachMarkImage("v3-group-add");

const CDN_COACHMARK_V3_GROUP_AUTO = v3CoachMarkImage("v3-group-auto");

const CDN_COACHMARK_V3_GROUP_DRAG = v3CoachMarkImage("v3-group-drag");

const CDN_COACHMARK_V3_HISTORY_MANAGE = v3CoachMarkImage("v3-history-manage");

const CDN_COACHMARK_V3_HISTORY_SWITCH = v3CoachMarkImage("v3-history-switch");

const CLIP_DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;

const COMFYUI_WORKFLOW_DRAFT_MAX_BYTES = 5 * 1024 * 1024;

const PLUGIN_STORAGE_MAX_TOTAL_BYTES = 1024 * 1024;

const COMFYUI_PLUGIN_STORAGE_MAX_TOTAL_BYTES = COMFYUI_WORKFLOW_DRAFT_MAX_BYTES + PLUGIN_STORAGE_MAX_TOTAL_BYTES;

const COMFYUI_WORKFLOW_DRAFT_STORAGE_KEY = "comfyui.workflow-draft.v1";

const COMPOSITION_TREE_DRAG_MIME = "application/x-hilo-composition-tree";

const DEFAULT_ROTATE_STATE = {
  angle: 0,
  flipH: false,
  flipV: false
};

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
  PythonRun: "python.run"
};

const IMAGE_DAG_CREDIT_ESTIMATES = {
  "generate_image:multi_shot": 60,
  "generate_image:relight": 60,
  "generate_image:storyboard": 50
};

const INPLACE_EDIT_TOOLBAR_RESERVE_PX = 116;

const NODE_TAG_BORDER_COLOR = "color-mix(in srgb, var(--node-tag-color) var(--canvas-node-tag-border-strength, 100%), var(--node-tag-surface))";

const NODE_TAG_INK_COLOR = "color-mix(in srgb, var(--node-tag-color) var(--canvas-node-tag-ink-strength, 30%), var(--canvas-node-tag-ink-base, #141414))";

const NODE_TAG_MAX_COUNTER_SCALE = 4.35;

const NODE_TAG_MAX_VISIBLE_COLORS = MAX_VISIBLE_CANVAS_TAG_COLORS;

const NODE_TAG_MIN_COUNTER_SCALE = 1;

const NODE_TAG_SURFACE_COLOR = "color-mix(in srgb, var(--node-tag-color) var(--canvas-node-tag-surface-strength, 35%), var(--canvas-node-tag-surface-base, #ffffff))";

const PANORAMA_GENERATION_COUNT = 1;

const PICKER_VIEW_STORAGE_KEY = "assetPicker.view";

const PLUGIN_STORAGE_MAX_KEYS = 256;

const PLUGIN_STORAGE_MAX_VALUE_BYTES = 256 * 1024;

const PROJECT_DOCUMENT_MAX_BYTES = 2 * 1024 * 1024;

const PROJECT_GENERATION_OPERATIONS = [
  "generate_image",
  "generate_video",
  "generate_speech",
  "generate_music"
];

const PROJECT_QUERY_HTTP_ROUTES = {
  composition_search: "/api/v3/query/composition_search",
  composition_type_list: "/api/v3/query/composition_type_list",
  composition_get: "/api/v3/query/composition_get",
  resource_relations: "/api/v3/query/resource_relations",
  resource_preview: "/api/v3/query/resource_preview"
};

const PROJECT_RESOURCE_TAG_HTTP_ROUTES = {
  get: "/api/project/resources/tags/get",
  commands: "/api/project/resources/tags/commands"
};

const PROJECT_TASK_HTTP_ROUTES = {
  execute: "/api/v3/execute",
  capabilities: "/api/v3/capabilities",
  tasks: "/api/v3/tasks",
  lookup: "/api/v3/tasks/lookup",
  queue: "/api/v3/tasks/queue",
  detail: (id2) => `/api/v3/tasks/${encodeURIComponent(id2)}`,
  resolve: (id2) => `/api/v3/tasks/${encodeURIComponent(id2)}/resolve`
};

const ROUND_DOTS_MIN_ZOOM = 0.3;

const TEXT_VERSION_CONTENT_CHUNK_MAX_BYTES = 512 * 1024;

const DEFAULT_PINNED = [
  "hailuo03-super-resolution",
  "clip",
  "extract-frame",
  "erase-subtitle",
  "asr",
  "watermark",
  "extract-audio"
];

const DEFAULT_SHOW_LABELS = true;

const VIDEO_TOOLBAR_DEFAULT_PINNED = DEFAULT_PINNED;

const VIDEO_TOOLBAR_DEFAULT_SHOW_LABELS = DEFAULT_SHOW_LABELS;

export {
  DEFAULT_PINNED,
  DEFAULT_SHOW_LABELS,
  CANVAS_STICKER_NODE_SIZE,
  CANVAS_V3_AUDIO_ACCEPT,
  CANVAS_V3_CLIPBOARD_MAX_BYTES,
  CANVAS_V3_CLIPBOARD_MIME,
  CANVAS_V3_CLIPBOARD_PREFIX,
  CANVAS_V3_CONTENT_KINDS,
  CANVAS_V3_DEFAULT_NODE_SIZES,
  CANVAS_V3_FRAME_PADDING,
  CANVAS_V3_IMAGE_ACCEPT,
  CANVAS_V3_IMAGE_DOWNLOAD_MAX_BYTES,
  CANVAS_V3_IMAGE_MAX_BYTES,
  CANVAS_V3_MEDIA_ACCEPT,
  CANVAS_V3_RESOURCE_DRAG_MIME,
  CANVAS_V3_SUBJECT_PREVIEW_SIZE,
  CANVAS_V3_SUBJECT_TYPE_HEADER,
  CANVAS_V3_SUBJECT_TYPE_PADDING,
  CANVAS_V3_TEXT_GENERATION_ROUTES,
  CANVAS_V3_TEXT_REFERENCE_LIMITS,
  CANVAS_V3_VIDEO_ACCEPT,
  CDN_COACHMARK_V3_GROUP_ADD,
  CDN_COACHMARK_V3_GROUP_AUTO,
  CDN_COACHMARK_V3_GROUP_DRAG,
  CDN_COACHMARK_V3_HISTORY_MANAGE,
  CDN_COACHMARK_V3_HISTORY_SWITCH,
  CLIP_DOCUMENT_MAX_BYTES,
  CLIP_STUDIO_CAPABILITY_ID,
  COMFYUI_PLUGIN_STORAGE_MAX_TOTAL_BYTES,
  COMFYUI_WORKFLOW_DRAFT_MAX_BYTES,
  COMFYUI_WORKFLOW_DRAFT_STORAGE_KEY,
  COMPOSITION_TREE_DRAG_MIME,
  DEFAULT_ROTATE_STATE,
  HUB_METHODS,
  IMAGE_DAG_CREDIT_ESTIMATES,
  INPLACE_EDIT_TOOLBAR_RESERVE_PX,
  NODE_TAG_BORDER_COLOR,
  NODE_TAG_INK_COLOR,
  NODE_TAG_MAX_COUNTER_SCALE,
  NODE_TAG_MAX_VISIBLE_COLORS,
  NODE_TAG_MIN_COUNTER_SCALE,
  NODE_TAG_SURFACE_COLOR,
  PANORAMA_GENERATION_COUNT,
  PICKER_VIEW_STORAGE_KEY,
  PLUGIN_STORAGE_MAX_KEYS,
  PLUGIN_STORAGE_MAX_TOTAL_BYTES,
  PLUGIN_STORAGE_MAX_VALUE_BYTES,
  PROJECT_DOCUMENT_MAX_BYTES,
  PROJECT_GENERATION_OPERATIONS,
  PROJECT_QUERY_HTTP_ROUTES,
  PROJECT_RESOURCE_TAG_HTTP_ROUTES,
  PROJECT_TASK_HTTP_ROUTES,
  ROUND_DOTS_MIN_ZOOM,
  TEXT_VERSION_CONTENT_CHUNK_MAX_BYTES,
  VIDEO_TOOLBAR_DEFAULT_PINNED,
  VIDEO_TOOLBAR_DEFAULT_SHOW_LABELS,
};
