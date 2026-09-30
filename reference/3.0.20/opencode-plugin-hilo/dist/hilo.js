var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
import * as fs5 from "node:fs";
import * as path6 from "node:path";

// ../protocol/dist/cloud-gateway.js
var CLOUD_GATEWAY_URLS = {
  domestic: {
    dev: "https://hub-pre.xaminim.com",
    test: "https://hub-pre.xaminim.com",
    staging: "https://design.minimax.cn",
    prod: "https://design.minimax.cn"
  },
  overseas: {
    dev: "https://hilo-test.xaminim.com",
    test: "https://hilo-test.xaminim.com",
    staging: "https://design.minimax.io",
    prod: "https://design.minimax.io"
  }
};
var DEFAULT_CLOUD_GATEWAY_URL = CLOUD_GATEWAY_URLS.domestic.dev;
var LEGACY_PLATFORM_PROVIDER_URLS = [
  // The config endpoint is routed through hub-pre, but provider baseURL values
  // can still be served as the legacy hilo-pre alias.
  "https://hilo-pre.xaminim.com",
  // Pre-rebrand hub.* domains: server-side provider baseURL values may still
  // point at hub.* during the design.* domain migration window.
  "https://hub.minimaxi.com",
  "https://hub.minimax.io",
  // Pre-rebrand domestic design.minimaxi.com: the server may still serve provider
  // baseURL values on the old domain while clients roll over to design.minimax.cn.
  // Dropping this would stop token injection and fail LLM calls with 401.
  "https://design.minimaxi.com"
];
var CLOUD_GATEWAY_URL_PREFIXES = [
  ...new Set([
    ...Object.values(CLOUD_GATEWAY_URLS).flatMap((channels) => Object.values(channels)),
    ...LEGACY_PLATFORM_PROVIDER_URLS
  ].flatMap((url) => [url, url.replace("https://", "http://")]))
];

// ../protocol/dist/ad-attribution.js
var AD_ATTRIBUTION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1e3;
var CLOCK_SKEW_MS = 5 * 60 * 1e3;
var API_ORIGINS = /* @__PURE__ */ new Set([
  "https://design.minimax.cn",
  ...CLOUD_GATEWAY_URL_PREFIXES.filter((url) => url.startsWith("https://")),
  "https://hailuo-pre.xaminim.com",
  "https://hailuoai-video-test.xaminim.com",
  "https://hailuoai.com",
  "https://hailuoai.video",
  "https://openplatform-test.xaminim.com",
  "https://openplatform-test-i18n.xaminim.com",
  "https://www.minimaxi.com",
  "https://platform.minimax.io"
]);

// ../protocol/dist/asset-role.js
var AssetRole;
(function(AssetRole2) {
  AssetRole2["Source"] = "source";
  AssetRole2["InitImage"] = "init_image";
  AssetRole2["Style"] = "style";
  AssetRole2["Subject"] = "subject";
  AssetRole2["Mask"] = "mask";
  AssetRole2["Pose"] = "pose";
  AssetRole2["Depth"] = "depth";
  AssetRole2["AudioTrack"] = "audio_track";
  AssetRole2["Subtitle"] = "subtitle";
  AssetRole2["Frame"] = "frame";
  AssetRole2["Reference"] = "reference";
})(AssetRole || (AssetRole = {}));
var ROLE_DISPLAY_NAMES = {
  [AssetRole.Source]: "Source",
  [AssetRole.InitImage]: "Init Image",
  [AssetRole.Style]: "Style",
  [AssetRole.Subject]: "Subject",
  [AssetRole.Mask]: "Mask",
  [AssetRole.Pose]: "Pose",
  [AssetRole.Depth]: "Depth",
  [AssetRole.AudioTrack]: "Audio Track",
  [AssetRole.Subtitle]: "Subtitle",
  [AssetRole.Frame]: "Frame",
  [AssetRole.Reference]: "Reference"
};
var ROLE_DESCRIPTIONS = {
  [AssetRole.Source]: "Primary derivation input (e.g. the original image in img2img / upscale / remix).",
  [AssetRole.InitImage]: "Starting image for Stable Diffusion img2img pipelines.",
  [AssetRole.Style]: "Style reference for IP-Adapter, style transfer, or LoRA-style guidance.",
  [AssetRole.Subject]: "Subject identity reference for character / face consistency.",
  [AssetRole.Mask]: "Region mask used by inpainting / outpainting / segmentation backends.",
  [AssetRole.Pose]: "Pose reference (e.g. OpenPose ControlNet keypoints).",
  [AssetRole.Depth]: "Depth-map reference (e.g. Depth ControlNet, MiDaS output).",
  [AssetRole.AudioTrack]: "Audio track input for lip-sync, video soundtrack, or audio analysis.",
  [AssetRole.Subtitle]: "Subtitle / caption track referenced by the generated asset.",
  [AssetRole.Frame]: "Specific video frame referenced as input.",
  [AssetRole.Reference]: "Generic / catch-all reference used when a more specific role is unknown (also the role assigned by the legacy reference_images backfill migration)."
};

// ../protocol/dist/benchmark.js
var BENCHMARK_PROVEN_COMPLETION_REASONS = [
  "supervisor_completed",
  "external_control"
];
var BENCHMARK_PROVEN_COMPLETION_REASON_SET = new Set(BENCHMARK_PROVEN_COMPLETION_REASONS);
var BENCHMARK_DEFAULTS = {
  redaction: "truncate",
  truncateBytes: 2048,
  captureRawSse: false,
  captureThinking: true,
  captureArtifactSha: false,
  maxBytesPerRun: 200 * 1024 * 1024,
  resourceSampleMs: null,
  /** Single-record write budget; over this we drop and bump counters.dropped */
  writeBudgetMs: 5,
  /** Default retention */
  retentionDays: 30,
  retentionCount: 50
};

// ../protocol/dist/canvas/types.js
var CanvasMode = {
  Freeform: "freeform",
  Workflow: "workflow"
};
var CanvasNodeType = {
  Image: "image",
  Video: "video",
  Audio: "audio",
  Text: "text",
  File: "file",
  Placeholder: "placeholder",
  Table: "table",
  Group: "group",
  Sticker: "sticker"
};
var ASSET_BACKED_TYPES = /* @__PURE__ */ new Set([
  CanvasNodeType.Image,
  CanvasNodeType.Video,
  CanvasNodeType.Audio,
  CanvasNodeType.Text,
  CanvasNodeType.File
]);

// ../protocol/dist/canvas/image-slot.js
var EMPTY_IMAGE_NODE_VIEW = Object.freeze({
  slots: Object.freeze([]),
  primaryIndex: 0,
  primary: void 0,
  isMulti: false,
  hasLoading: false,
  hasError: false,
  status: "empty",
  isUserEmpty: false,
  rounds: Object.freeze([]),
  activeRoundIndex: 0
});

// ../protocol/dist/canvas/position-sanitization.js
var VALID_CANVAS_MODES = new Set(Object.values(CanvasMode));

// ../protocol/dist/canvas/table-document.js
var ROW_HEIGHT_ORDER = ["low", "medium", "tall", "extraTall"];
var ROW_HEIGHT_SET = new Set(ROW_HEIGHT_ORDER);

// ../protocol/dist/canvas-tags.js
var CANVAS_TAG_COLOR_PALETTE = [
  "#0A84FF",
  "#BF5AF2",
  "#FF9F0A",
  "#5E3DF5",
  "#FF5F57",
  "#30D158",
  "#FFD60A"
];
var PRESET_COLOR_TAG_IDS = {
  red: "color:red",
  orange: "color:orange",
  yellow: "color:yellow",
  green: "color:green",
  blue: "color:blue",
  purple: "color:purple",
  deepPurple: "color:deep-purple"
};
var PRESET_COLOR_NAME_KEYS = {
  [PRESET_COLOR_TAG_IDS.red]: "canvasTags.preset.red",
  [PRESET_COLOR_TAG_IDS.orange]: "canvasTags.preset.orange",
  [PRESET_COLOR_TAG_IDS.yellow]: "canvasTags.preset.yellow",
  [PRESET_COLOR_TAG_IDS.green]: "canvasTags.preset.green",
  [PRESET_COLOR_TAG_IDS.blue]: "canvasTags.preset.blue",
  [PRESET_COLOR_TAG_IDS.purple]: "canvasTags.preset.purple",
  [PRESET_COLOR_TAG_IDS.deepPurple]: "canvasTags.preset.deepPurple"
};
var PRESET_COLOR_FALLBACK_NAMES = {
  [PRESET_COLOR_TAG_IDS.red]: ["\u4EBA\u7269", "Character"],
  [PRESET_COLOR_TAG_IDS.orange]: ["\u573A\u666F", "Scene"],
  [PRESET_COLOR_TAG_IDS.yellow]: ["\u5F85\u5B9A\u7248", "Draft"],
  [PRESET_COLOR_TAG_IDS.green]: ["\u6700\u7EC8\u7248", "Final"],
  [PRESET_COLOR_TAG_IDS.blue]: ["\u9053\u5177", "Prop"],
  [PRESET_COLOR_TAG_IDS.purple]: ["\u97F3\u8272", "Voice"],
  [PRESET_COLOR_TAG_IDS.deepPurple]: ["\u670D\u88C5", "Costume"]
};
var PRESET_COLOR_TAG_ID_BY_COLOR = {
  "#FF5F57": PRESET_COLOR_TAG_IDS.red,
  "#FF9F0A": PRESET_COLOR_TAG_IDS.orange,
  "#FFD60A": PRESET_COLOR_TAG_IDS.yellow,
  "#30D158": PRESET_COLOR_TAG_IDS.green,
  "#0A84FF": PRESET_COLOR_TAG_IDS.blue,
  "#BF5AF2": PRESET_COLOR_TAG_IDS.purple,
  "#5E3DF5": PRESET_COLOR_TAG_IDS.deepPurple
};
var PRESET_COLOR_TAGS = CANVAS_TAG_COLOR_PALETTE.map((color) => {
  const id = PRESET_COLOR_TAG_ID_BY_COLOR[color];
  return {
    id,
    kind: "color",
    color,
    legacyNameKey: PRESET_COLOR_NAME_KEYS[id]
  };
});
var PRESET_COLOR_TAG_ID_SET = new Set(Object.values(PRESET_COLOR_TAG_IDS));

// ../protocol/dist/connector-capability.js
function isMarketConnectorId(value) {
  return /^[a-z0-9][a-z0-9._-]{0,127}$/.test(value) && !value.startsWith("custom.");
}
__name(isMarketConnectorId, "isMarketConnectorId");
function isConfiguredConnectorId(id) {
  return /^custom\.[a-zA-Z0-9_.-]{1,80}$/.test(id) && !/^custom\.hub(?:[._]|$)/i.test(id);
}
__name(isConfiguredConnectorId, "isConfiguredConnectorId");

// ../protocol/dist/chat.js
var CANCELLED_WITH_CANVAS_CONTINUATION_TEXT = "[Request interrupted by user \u2014 generation continues on canvas]";
var CANVAS_HANDOFF_MARKER_PREFIX = `${CANCELLED_WITH_CANVAS_CONTINUATION_TEXT}
[HILO_CANVAS_HANDOFF_V1]`;
var GUI_SUBMITTED_TIMEOUT_MS = 30 * 60 * 1e3;
var RECOVERED_MESSAGE_PREFIX = "[\u7CFB\u7EDF\u6062\u590D]";
var RECOVERED_MESSAGE_PREFIX_EN = "[System Recovery]";
var RESUME_CHILD_PROMPT_ZH = `${RECOVERED_MESSAGE_PREFIX} \u4F60\u4E4B\u524D\u4E2D\u65AD\u7684\u751F\u6210\u6B65\u9AA4\u5DF2\u6062\u590D\uFF0C\u4EA7\u7269\u89C1\u4E0A\u3002\u8BF7\u57FA\u4E8E\u8FD9\u4E9B\u4EA7\u7269\u7EE7\u7EED\u5B8C\u6210\u672C\u4EFB\u52A1\u5269\u4F59\u7684\u6B65\u9AA4\uFF1B\u82E5\u5DF2\u5168\u90E8\u5B8C\u6210\uFF0C\u7B80\u8981\u603B\u7ED3\u4EA7\u7269\u5373\u53EF\u3002`;
var RESUME_CHILD_PROMPT_EN = `${RECOVERED_MESSAGE_PREFIX_EN} The generation steps that were interrupted have been recovered; the products are shown above. Continue the remaining steps of this task based on them. If everything is already done, briefly summarize the products.`;

// ../protocol/dist/chat-model-trace.js
var CHAT_MODEL_TRACES_PATH = "/api/chat/model-traces";
var CHAT_MODEL_TRACE_CONTEXT_HEADER = "x-hilo-model-trace-context";
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
__name(isRecord, "isRecord");
function isChatModelTraceId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value);
}
__name(isChatModelTraceId, "isChatModelTraceId");
function isLabel(value) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 256 && Array.from(value).every((character) => {
    const code = character.charCodeAt(0);
    return code >= 32 && code !== 127;
  });
}
__name(isLabel, "isLabel");
function mapChatModelTrace(value) {
  if (!isRecord(value) || !isChatModelTraceId(value.call_id) || !isChatModelTraceId(value.session_id) || !isChatModelTraceId(value.request_id) || !isChatModelTraceId(value.trace_id) || !isLabel(value.agent) || !isLabel(value.model_id) || typeof value.started_at !== "number" || !Number.isSafeInteger(value.started_at) || value.started_at <= 0 || typeof value.status_code !== "number" || !Number.isInteger(value.status_code) || value.status_code < 100 || value.status_code > 599) {
    return void 0;
  }
  return {
    call_id: value.call_id,
    session_id: value.session_id,
    request_id: value.request_id,
    trace_id: value.trace_id,
    agent: value.agent,
    model_id: value.model_id,
    started_at: value.started_at,
    status_code: value.status_code
  };
}
__name(mapChatModelTrace, "mapChatModelTrace");

// ../protocol/dist/cloud-status-polling.js
var CLOUD_STATUS_POLLING_MAX_WINDOW_MS = 30 * 6e4;

// ../protocol/dist/comfyui-backend.js
var COMFYUI_BACKEND_PORT = 18188;
var COMFYUI_BACKEND_ORIGIN = `http://127.0.0.1:${COMFYUI_BACKEND_PORT}`;

// ../protocol/dist/comfyui-featured-workflows.js
var MAX_HARDWARE_BYTES = 1024 ** 5;

// ../protocol/dist/hcp-manifest-capability-readers.js
var MAX_LOCK_BYTES = 256 * 1024;

// ../protocol/dist/connector-mention.js
var CONNECTOR_MENTION_REMINDER_TAG = "connector_mention_reminder";
var CONNECTOR_TOKEN_SOURCE = String.raw`@connector:([a-zA-Z0-9_.-]{1,80})(?:\[([\p{Script=Han}a-zA-Z0-9_. -]{1,80})\])?(?=\s|$)`;
var CONNECTOR_TOKEN_RE = new RegExp(`^${CONNECTOR_TOKEN_SOURCE}`, "u");
var TRAILING_REMINDER_RE = new RegExp(
  // Non-greedy body: the gateway emits exactly one trailing block, so the
  // LAST opening tag pairs with the final closing tag at end of text.
  `\\n\\n<${CONNECTOR_MENTION_REMINDER_TAG}>\\n[\\s\\S]*?\\n</${CONNECTOR_MENTION_REMINDER_TAG}>$`
);

// ../protocol/dist/custom-model.js
function isCustomModelProvider(id) {
  return /^user-custom-[a-z0-9-]+$/.test(id ?? "");
}
__name(isCustomModelProvider, "isCustomModelProvider");

// ../protocol/dist/document-edit.js
var DOCUMENT_EDIT_TASK_TAG = "document_edit_task";
var DOCUMENT_EDIT_TASK_RE = new RegExp(`^<${DOCUMENT_EDIT_TASK_TAG}>\\n\\n([\\s\\S]*?)\\n\\n</${DOCUMENT_EDIT_TASK_TAG}>(?:\\n\\n([\\s\\S]*))?$`);
var DOCUMENT_EDITING_CONTEXT_TAG = "document_editing_context";
var PLUGIN_EDITING_CONTEXT_TAG = "plugin_editing_context";
var EDITING_CONTEXT_WRAPPER_RES = [DOCUMENT_EDITING_CONTEXT_TAG, PLUGIN_EDITING_CONTEXT_TAG].map(
  // Non-greedy body: the closing tag appears exactly once (the gateway emits
  // it before the user content), so the FIRST match is the real boundary even
  // if the user text happens to contain the literal.
  (tag) => new RegExp(`^<${tag}>\\n\\n[\\s\\S]*?\\n\\n</${tag}>(?:\\n\\n([\\s\\S]*))?$`)
);

// ../protocol/dist/text-line-diff.js
var DELETE_ONLY_CLASSIFY_MAX_CHARS = 256 * 1024;

// ../protocol/dist/enhance-image.js
var ENHANCE_IMAGE_INPUT_SHORT_MIN = 256;
var ENHANCE_IMAGE_INPUT_LONG_MAX = 2048;
var ENHANCE_IMAGE_INPUT_MAX_ASPECT = ENHANCE_IMAGE_INPUT_LONG_MAX / ENHANCE_IMAGE_INPUT_SHORT_MIN;

// ../protocol/dist/feedback.js
var FEEDBACK_CONSTRAINTS = {
  DESCRIPTION_MIN_LENGTH: 1,
  DESCRIPTION_MAX_LENGTH: 500,
  ACTION_TRAIL_MAX_ENTRIES: 20,
  /** Max number of user-attached files per submission. */
  ATTACHMENT_MAX_COUNT: 5,
  /** Max size per attached file (5 MB). */
  ATTACHMENT_MAX_BYTES: 5 * 1024 * 1024,
  /** Anti-spam: per-user submission limits (enforced server-side; documented here). */
  RATE_LIMIT_PER_5MIN: 3,
  RATE_LIMIT_PER_24H: 20
};

// ../protocol/dist/gateway-auth-bootstrap.js
var MAX_TOKEN_LENGTH = 64 * 1024;

// ../protocol/dist/generated/gateway.js
var WalletSource;
(function(WalletSource2) {
  WalletSource2[WalletSource2["WALLET_SOURCE_HILO"] = 0] = "WALLET_SOURCE_HILO";
  WalletSource2[WalletSource2["WALLET_SOURCE_OP"] = 1] = "WALLET_SOURCE_OP";
  WalletSource2[WalletSource2["UNRECOGNIZED"] = -1] = "UNRECOGNIZED";
})(WalletSource || (WalletSource = {}));
var CreditType;
(function(CreditType2) {
  CreditType2[CreditType2["CREDIT_TYPE_TOP_UP"] = 0] = "CREDIT_TYPE_TOP_UP";
  CreditType2[CreditType2["CREDIT_TYPE_MEMBERSHIP"] = 1] = "CREDIT_TYPE_MEMBERSHIP";
  CreditType2[CreditType2["CREDIT_TYPE_BONUS"] = 2] = "CREDIT_TYPE_BONUS";
  CreditType2[CreditType2["CREDIT_TYPE_DEFAULT"] = 3] = "CREDIT_TYPE_DEFAULT";
  CreditType2[CreditType2["CREDIT_TYPE_CREATOR"] = 4] = "CREDIT_TYPE_CREATOR";
  CreditType2[CreditType2["CREDIT_TYPE_ACTIVITY"] = 5] = "CREDIT_TYPE_ACTIVITY";
  CreditType2[CreditType2["CREDIT_TYPE_LOGIN"] = 6] = "CREDIT_TYPE_LOGIN";
  CreditType2[CreditType2["CREDIT_TYPE_TRANSFER"] = 7] = "CREDIT_TYPE_TRANSFER";
  CreditType2[CreditType2["UNRECOGNIZED"] = -1] = "UNRECOGNIZED";
})(CreditType || (CreditType = {}));
var PopupType;
(function(PopupType2) {
  PopupType2[PopupType2["POPUP_TYPE_NONE"] = 0] = "POPUP_TYPE_NONE";
  PopupType2[PopupType2["POPUP_TYPE_GENERAL"] = 1] = "POPUP_TYPE_GENERAL";
  PopupType2[PopupType2["POPUP_TYPE_MIGRATION"] = 2] = "POPUP_TYPE_MIGRATION";
  PopupType2[PopupType2["POPUP_TYPE_FEATURE"] = 3] = "POPUP_TYPE_FEATURE";
  PopupType2[PopupType2["UNRECOGNIZED"] = -1] = "UNRECOGNIZED";
})(PopupType || (PopupType = {}));
var TransferDirection;
(function(TransferDirection2) {
  TransferDirection2[TransferDirection2["TRANSFER_DIRECTION_UNSPECIFIED"] = 0] = "TRANSFER_DIRECTION_UNSPECIFIED";
  TransferDirection2[TransferDirection2["TRANSFER_DIRECTION_IN"] = 1] = "TRANSFER_DIRECTION_IN";
  TransferDirection2[TransferDirection2["TRANSFER_DIRECTION_OUT"] = 2] = "TRANSFER_DIRECTION_OUT";
  TransferDirection2[TransferDirection2["UNRECOGNIZED"] = -1] = "UNRECOGNIZED";
})(TransferDirection || (TransferDirection = {}));

// ../protocol/dist/generated/user.js
var PrivilegeType;
(function(PrivilegeType2) {
  PrivilegeType2[PrivilegeType2["PRIVILEGE_TYPE_DEFAULT"] = 0] = "PRIVILEGE_TYPE_DEFAULT";
  PrivilegeType2[PrivilegeType2["PRIVILEGE_TYPE_BASIC"] = 1] = "PRIVILEGE_TYPE_BASIC";
  PrivilegeType2[PrivilegeType2["PRIVILEGE_TYPE_UNLIMITED"] = 2] = "PRIVILEGE_TYPE_UNLIMITED";
  PrivilegeType2[PrivilegeType2["PRIVILEGE_TYPE_PRO"] = 3] = "PRIVILEGE_TYPE_PRO";
  PrivilegeType2[PrivilegeType2["PRIVILEGE_TYPE_VIDEO_MASTER"] = 4] = "PRIVILEGE_TYPE_VIDEO_MASTER";
  PrivilegeType2[PrivilegeType2["PRIVILEGE_TYPE_VIDEO_UNLIMITED_NEW"] = 5] = "PRIVILEGE_TYPE_VIDEO_UNLIMITED_NEW";
  PrivilegeType2[PrivilegeType2["PRIVILEGE_TYPE_VIDEO_CREATOR"] = 6] = "PRIVILEGE_TYPE_VIDEO_CREATOR";
  PrivilegeType2[PrivilegeType2["UNRECOGNIZED"] = -1] = "UNRECOGNIZED";
})(PrivilegeType || (PrivilegeType = {}));
var HubCancelBlockReason;
(function(HubCancelBlockReason2) {
  HubCancelBlockReason2[HubCancelBlockReason2["HUB_CANCEL_BLOCK_REASON_UNSPECIFIED"] = 0] = "HUB_CANCEL_BLOCK_REASON_UNSPECIFIED";
  HubCancelBlockReason2[HubCancelBlockReason2["HUB_CANCEL_BLOCK_REASON_MP_IAP_SUBSCRIPTION"] = 1] = "HUB_CANCEL_BLOCK_REASON_MP_IAP_SUBSCRIPTION";
  HubCancelBlockReason2[HubCancelBlockReason2["HUB_CANCEL_BLOCK_REASON_TEAM_OWNER"] = 2] = "HUB_CANCEL_BLOCK_REASON_TEAM_OWNER";
  HubCancelBlockReason2[HubCancelBlockReason2["HUB_CANCEL_BLOCK_REASON_TEAM_MEMBER"] = 3] = "HUB_CANCEL_BLOCK_REASON_TEAM_MEMBER";
  HubCancelBlockReason2[HubCancelBlockReason2["HUB_CANCEL_BLOCK_REASON_CHECK_UNAVAILABLE"] = 4] = "HUB_CANCEL_BLOCK_REASON_CHECK_UNAVAILABLE";
  HubCancelBlockReason2[HubCancelBlockReason2["UNRECOGNIZED"] = -1] = "UNRECOGNIZED";
})(HubCancelBlockReason || (HubCancelBlockReason = {}));

// ../protocol/dist/generated/cloud_project.js
var ProjectStatus;
(function(ProjectStatus2) {
  ProjectStatus2[ProjectStatus2["PROJECT_STATUS_UNSPECIFIED"] = 0] = "PROJECT_STATUS_UNSPECIFIED";
  ProjectStatus2[ProjectStatus2["PROJECT_STATUS_ACTIVE"] = 100] = "PROJECT_STATUS_ACTIVE";
  ProjectStatus2[ProjectStatus2["PROJECT_STATUS_DELETED"] = 300] = "PROJECT_STATUS_DELETED";
  ProjectStatus2[ProjectStatus2["UNRECOGNIZED"] = -1] = "UNRECOGNIZED";
})(ProjectStatus || (ProjectStatus = {}));
var MemberRole;
(function(MemberRole2) {
  MemberRole2[MemberRole2["MEMBER_ROLE_UNSPECIFIED"] = 0] = "MEMBER_ROLE_UNSPECIFIED";
  MemberRole2[MemberRole2["MEMBER_ROLE_CREATOR"] = 1] = "MEMBER_ROLE_CREATOR";
  MemberRole2[MemberRole2["MEMBER_ROLE_MEMBER"] = 2] = "MEMBER_ROLE_MEMBER";
  MemberRole2[MemberRole2["UNRECOGNIZED"] = -1] = "UNRECOGNIZED";
})(MemberRole || (MemberRole = {}));

// ../protocol/dist/generated/cloud_folder.js
var CloudNodeType;
(function(CloudNodeType2) {
  CloudNodeType2[CloudNodeType2["CLOUD_NODE_TYPE_UNSPECIFIED"] = 0] = "CLOUD_NODE_TYPE_UNSPECIFIED";
  CloudNodeType2[CloudNodeType2["CLOUD_NODE_TYPE_FOLDER"] = 1] = "CLOUD_NODE_TYPE_FOLDER";
  CloudNodeType2[CloudNodeType2["CLOUD_NODE_TYPE_FILE"] = 2] = "CLOUD_NODE_TYPE_FILE";
  CloudNodeType2[CloudNodeType2["UNRECOGNIZED"] = -1] = "UNRECOGNIZED";
})(CloudNodeType || (CloudNodeType = {}));
var CloudNodeStatus;
(function(CloudNodeStatus2) {
  CloudNodeStatus2[CloudNodeStatus2["CLOUD_NODE_STATUS_UNSPECIFIED"] = 0] = "CLOUD_NODE_STATUS_UNSPECIFIED";
  CloudNodeStatus2[CloudNodeStatus2["CLOUD_NODE_STATUS_ACTIVE"] = 100] = "CLOUD_NODE_STATUS_ACTIVE";
  CloudNodeStatus2[CloudNodeStatus2["CLOUD_NODE_STATUS_DELETED"] = 300] = "CLOUD_NODE_STATUS_DELETED";
  CloudNodeStatus2[CloudNodeStatus2["UNRECOGNIZED"] = -1] = "UNRECOGNIZED";
})(CloudNodeStatus || (CloudNodeStatus = {}));
var CloudNodeReviewStatus;
(function(CloudNodeReviewStatus2) {
  CloudNodeReviewStatus2[CloudNodeReviewStatus2["CLOUD_NODE_REVIEW_STATUS_UNSPECIFIED"] = 0] = "CLOUD_NODE_REVIEW_STATUS_UNSPECIFIED";
  CloudNodeReviewStatus2[CloudNodeReviewStatus2["CLOUD_NODE_REVIEW_STATUS_REVIEWING"] = 100] = "CLOUD_NODE_REVIEW_STATUS_REVIEWING";
  CloudNodeReviewStatus2[CloudNodeReviewStatus2["CLOUD_NODE_REVIEW_STATUS_PASS"] = 200] = "CLOUD_NODE_REVIEW_STATUS_PASS";
  CloudNodeReviewStatus2[CloudNodeReviewStatus2["CLOUD_NODE_REVIEW_STATUS_BLOCK"] = 300] = "CLOUD_NODE_REVIEW_STATUS_BLOCK";
  CloudNodeReviewStatus2[CloudNodeReviewStatus2["UNRECOGNIZED"] = -1] = "UNRECOGNIZED";
})(CloudNodeReviewStatus || (CloudNodeReviewStatus = {}));

// ../protocol/dist/i18n.js
var BCP47_LOCALE_RE = /^[a-z]{2,3}(?:-(?:[A-Z]{2}|[A-Z][a-z]{3}))?$/;

// ../protocol/dist/remote-connectors.js
var LIBTV_CONNECTOR = {
  id: "libtv",
  url: "https://mcp.liblib.tv/mcp",
  consentOrigin: "https://www.liblib.tv"
};

// ../protocol/dist/libtv-oauth-consent.js
var authorizationOrigin = new URL(LIBTV_CONNECTOR.url).origin;

// ../protocol/dist/macos-compat.js
var MIN_SUPPORTED_DARWIN_VERSION = "22.0.0";
var MIN_SUPPORTED_DARWIN_MAJOR = Number.parseInt(MIN_SUPPORTED_DARWIN_VERSION, 10);
var MACOS_VERSION_UNSUPPORTED_DIAGNOSIS_CODE = "macos_version_unsupported";
var MACOS_VERSION_UNSUPPORTED_ERROR_MARKER = `[${MACOS_VERSION_UNSUPPORTED_DIAGNOSIS_CODE}]`;

// ../protocol/dist/media-lineage.js
var MEDIA_LINEAGE_MAX_HASH_BYTES = 8 * 1024 * 1024;

// ../protocol/dist/memory-compaction.js
var MEMORY_COMPACTION_DEFAULTS = {
  enabled: true,
  schedule: "weekly",
  thresholdCount: 100,
  thresholdBytes: 512 * 1024,
  snapshotRetention: 10,
  snapshotTtlDays: 60,
  llmMergeEnabled: false,
  expireFeedbackDays: 90
};

// ../protocol/dist/memory-types.js
var MAX_MEMORY_BODY_BYTES = 30 * 1024;

// ../protocol/dist/model-display-aliases.js
var DOMESTIC_MODEL_DISPLAY_ALIASES = [
  // Nano Banana 2 Flash → General Image 2（空格 / 下划线 / 中划线变体）
  ["nano_banana_2_flash", "General Image 2"],
  ["NanoBanana 2 Flash", "General Image 2"],
  ["NanoBanana_2_Flash", "General Image 2"],
  ["NanoBanana-2-Flash", "General Image 2"],
  ["Nano Banana 2 Flash", "General Image 2"],
  ["Nano-Banana-2-Flash", "General Image 2"],
  ["Banana 2 Flash", "General Image 2"],
  ["Banana_2_Flash", "General Image 2"],
  ["Banana-2-Flash", "General Image 2"],
  // Nano Banana Flash → General Image 2
  ["NanoBanana Flash", "General Image 2"],
  ["NanoBanana_Flash", "General Image 2"],
  ["NanoBanana-Flash", "General Image 2"],
  ["Nano Banana Flash", "General Image 2"],
  ["Nano_Banana_Flash", "General Image 2"],
  ["Nano-Banana-Flash", "General Image 2"],
  ["Banana Flash", "General Image 2"],
  ["Banana_Flash", "General Image 2"],
  ["Banana-Flash", "General Image 2"],
  // Nano Banana Pro → General Image Pro
  ["NanoBanana Pro", "General Image Pro"],
  ["NanoBanana_Pro", "General Image Pro"],
  ["NanoBanana-Pro", "General Image Pro"],
  ["Nano Banana Pro", "General Image Pro"],
  ["Nano_Banana_Pro", "General Image Pro"],
  ["Nano-Banana-Pro", "General Image Pro"],
  ["Banana Pro", "General Image Pro"],
  ["Banana_Pro", "General Image Pro"],
  ["Banana-Pro", "General Image Pro"],
  // 特例：nano_banana_2（下划线全名）→ General Image Pro。仅此一条，不派生
  // 空格/中划线变体，避免与下方 "Nano Banana 2 → General Image 2" 的下划线
  // 全名 Nano_Banana_2 冲突。
  ["nano_banana_2", "General Image Pro"],
  // Nano Banana 2 → General Image 2（不含下划线全名 Nano_Banana_2，留给上面的特例）
  ["NanoBanana 2", "General Image 2"],
  ["NanoBanana_2", "General Image 2"],
  ["NanoBanana-2", "General Image 2"],
  ["Nano Banana 2", "General Image 2"],
  ["Nano-Banana-2", "General Image 2"],
  ["Banana 2", "General Image 2"],
  ["Banana_2", "General Image 2"],
  ["Banana-2", "General Image 2"],
  // 旧国内展示名也统一收敛到新名称，覆盖历史消息与缓存数据。
  ["\u9999\u8549Pro", "General Image Pro"],
  ["\u9999\u85492", "General Image 2"],
  // Banana 系列 → General Image 系列
  ["Banana \u7CFB\u5217", "General Image \u7CFB\u5217"],
  ["Banana\u7CFB\u5217", "General Image \u7CFB\u5217"],
  ["Banana_\u7CFB\u5217", "General Image \u7CFB\u5217"],
  ["Banana-\u7CFB\u5217", "General Image \u7CFB\u5217"],
  ["\u9999\u8549\u7CFB\u5217", "General Image \u7CFB\u5217"],
  // GPT Image 2.5 Flare / Sunburst → Design Image 2.5 Flare / Sunburst。
  // 两区只差品牌前缀，脱敏只把 GPT 换成 Design。
  // 这四个内部名都以 'gpt-image-2' / 'g-image-2' 为前缀子串，依靠
  // SORTED_DOMESTIC_MODEL_DISPLAY_ALIASES 的长度降序 + 单次 alternation
  // 保证长规则先命中，不会被下方的 'gpt-image-2' 截断成 "Design Image 2.5-flare"。
  ["gpt-image-2.5-sunburst", "Design Image 2.5 Sunburst"],
  ["GPT Image 2.5 Sunburst", "Design Image 2.5 Sunburst"],
  ["GPT_Image_2.5_Sunburst", "Design Image 2.5 Sunburst"],
  ["g-image-2.5-sunburst", "Design Image 2.5 Sunburst"],
  ["gpt-image-2.5-flare", "Design Image 2.5 Flare"],
  ["GPT Image 2.5 Flare", "Design Image 2.5 Flare"],
  ["GPT_Image_2.5_Flare", "Design Image 2.5 Flare"],
  ["g-image-2.5-flare", "Design Image 2.5 Flare"],
  // GPT Image 2 / 旧国内名 → Design Image 2。只改 2 这一版，其他版本继续沿用
  // 既有 GPT Image → G Image 的国内脱敏规则。
  ["gpt-image-2", "Design Image 2"],
  ["GPT Image 2", "Design Image 2"],
  ["GPT_Image_2", "Design Image 2"],
  ["g-image-2", "Design Image 2"],
  ["G Image 2", "Design Image 2"],
  ["G_Image_2", "Design Image 2"],
  // GPT Image → G Image（其他版本）
  ["GPT Image", "G Image"],
  ["GPT_Image", "G Image"],
  ["gpt-image", "g-image"],
  // Veo 3.1 → Beta（国内展示名）。统一海外命名后 agent 输出 veo-3.1-* / Veo3，
  // 国内渲染时 redact 回 beta。长度降序排序保证技术全名（最长）先匹配；裸 model_id
  // 形如 `veo-3.1-generate-001` 内部是 `veo-3`（带连字符），不含连续子串 `veo3`，
  // 因此短规则 `Veo3 → Beta` 不会误伤全名，双重安全。
  ["veo-3.1-fast-generate-001", "beta_fast"],
  ["veo-3.1-generate-001", "beta_pro"],
  ["Veo3.1 Fast", "Beta Fast"],
  ["Veo 3.1 Fast", "Beta Fast"],
  ["Veo3 Series", "Beta\u7CFB\u5217"],
  ["Veo3.1", "Beta Pro"],
  ["Veo 3.1", "Beta Pro"],
  ["Veo3", "Beta"],
  // seedream alias
  ["doubao-seedream-5-0-pro-260628", "Seedream 5.0 Pro"],
  ["doubao-seedream-4-5-251128", "Seedream 4.5"]
];
var SORTED_DOMESTIC_MODEL_DISPLAY_ALIASES = DOMESTIC_MODEL_DISPLAY_ALIASES.slice().sort(([a], [b]) => b.length - a.length);
var DOMESTIC_MODEL_DISPLAY_ALIAS_BY_LOWERCASE = new Map(SORTED_DOMESTIC_MODEL_DISPLAY_ALIASES.map(([internal, display]) => [
  internal.toLowerCase(),
  display
]));
var DOMESTIC_MODEL_DISPLAY_ALIAS_PATTERN = new RegExp(SORTED_DOMESTIC_MODEL_DISPLAY_ALIASES.map(([internal]) => escapeRegExp(internal)).join("|"), "gi");
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
__name(escapeRegExp, "escapeRegExp");

// ../protocol/dist/workspace-identity.js
var HILO_WORKSPACE_IDENTITY_HEADER = "x-hilo-workspace";
var HILO_WORKSPACE_IDENTITY_QUERY = "hilo_workspace";
var HILO_WORKSPACE_IDENTITY_ENV = "HILO_WORKSPACE_CLAIM";
var HILO_WORKSPACE_INSTANCE_HEADER = "x-hilo-workspace-instance";
var HILO_WORKSPACE_INSTANCE_QUERY = "hilo_workspace_instance";
var HILO_WORKSPACE_INSTANCE_ENV = "HILO_WORKSPACE_INSTANCE_ID";
var HILO_WORKSPACE_GENERATION_HEADER = "x-hilo-workspace-generation";
var HILO_WORKSPACE_GENERATION_QUERY = "hilo_workspace_generation";
var HILO_WORKSPACE_GENERATION_ENV = "HILO_WORKSPACE_GENERATION";
function workspaceGatewayIdentityHeaders(binding) {
  return {
    [HILO_WORKSPACE_IDENTITY_HEADER]: binding.claim,
    [HILO_WORKSPACE_INSTANCE_HEADER]: binding.instanceId,
    [HILO_WORKSPACE_GENERATION_HEADER]: String(binding.generation)
  };
}
__name(workspaceGatewayIdentityHeaders, "workspaceGatewayIdentityHeaders");

// ../protocol/dist/api-paths.js
function encodePath(p) {
  return p.split("/").map(encodeURIComponent).join("/");
}
__name(encodePath, "encodePath");
var DEFAULT_VIDEO_PLAYBACK_MAX_HEIGHT = 1080;
var VIDEO_PLAYBACK_IDENTITY_QUERY_KEYS = [
  HILO_WORKSPACE_IDENTITY_QUERY,
  HILO_WORKSPACE_INSTANCE_QUERY,
  HILO_WORKSPACE_GENERATION_QUERY
];
function videoPlaybackPath(source, maxHeight = DEFAULT_VIDEO_PLAYBACK_MAX_HEIGHT) {
  const params = new URLSearchParams({
    source,
    maxHeight: String(maxHeight)
  });
  try {
    const parsedSource = new URL(source, "http://hilo.local");
    for (const key of VIDEO_PLAYBACK_IDENTITY_QUERY_KEYS) {
      const value = parsedSource.searchParams.get(key);
      if (value)
        params.set(key, value);
    }
  } catch {
  }
  return `/api/asset/video-playback?${params.toString()}`;
}
__name(videoPlaybackPath, "videoPlaybackPath");
var HILO_HUB_BIZ_LINE = 4;
var TEAM_GROUP_LOAD_REASONS = [
  /** Upstream certificate chain is not trusted — terminal, retrying cannot fix it. */
  "tls_trust",
  /** Hostname resolution failed — terminal (usually DNS/proxy configuration). */
  "dns",
  /** Upstream refused the connection — retryable. */
  "conn_refused",
  /** Connection was reset mid-flight — retryable. */
  "conn_reset",
  /** TCP/TLS handshake timed out — retryable. */
  "connect_timeout",
  /** Request exceeded the gateway's time budget — retryable. */
  "timeout",
  /** Upstream answered 5xx — retryable. */
  "upstream_5xx",
  /** Upstream rejected the request (4xx) — terminal. */
  "upstream_4xx",
  /** Transport failed without a finer signature — retryable. */
  "network",
  /** Local gateway configuration is incomplete (e.g. empty baseUrl) — terminal. */
  "config_missing",
  "unknown"
];
var TEAM_GROUP_LOAD_REASON_SET = new Set(TEAM_GROUP_LOAD_REASONS);
var API_PATHS = {
  // Workspace
  workspace: "/api/workspace",
  // ComfyUI workflow catalogue and commands.
  comfyUiWorkflows: "/api/comfyui/workflows",
  comfyUiFeaturedWorkflows: /* @__PURE__ */ __name((locale) => `/api/comfyui/featured-workflows?locale=${locale}`, "comfyUiFeaturedWorkflows"),
  comfyUiAgentWorkflows: "/api/comfyui/workflows?agent_only=true",
  comfyUiWorkflowImport: "/api/comfyui/workflows/import",
  comfyUiWorkflowDraftParameters: "/api/comfyui/workflows/draft-parameters",
  comfyUiWorkflowPreflight: "/api/comfyui/workflows/preflight",
  comfyUiInputImport: "/api/comfyui/inputs/import",
  comfyUiWorkflowInstall: /* @__PURE__ */ __name((workflowId) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/install`, "comfyUiWorkflowInstall"),
  comfyUiWorkflow: /* @__PURE__ */ __name((workflowId, includeGraph = false) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}${includeGraph ? "?include_graph=true" : ""}`, "comfyUiWorkflow"),
  comfyUiNodeWorkflow: /* @__PURE__ */ __name((sourceNodeId, includeGraph = false) => `/api/comfyui/node-workflows/${encodeURIComponent(sourceNodeId)}${includeGraph ? "?include_graph=true" : ""}`, "comfyUiNodeWorkflow"),
  comfyUiWorkflowDelete: /* @__PURE__ */ __name((workflowId) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}`, "comfyUiWorkflowDelete"),
  comfyUiWorkflowClearDeletedBindings: /* @__PURE__ */ __name((workflowId) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/clear-deleted-bindings`, "comfyUiWorkflowClearDeletedBindings"),
  comfyUiWorkflowDependencies: /* @__PURE__ */ __name((workflowId) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/dependencies`, "comfyUiWorkflowDependencies"),
  comfyUiWorkflowOpen: /* @__PURE__ */ __name((workflowId) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/open`, "comfyUiWorkflowOpen"),
  comfyUiWorkflowRun: /* @__PURE__ */ __name((workflowId) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/run`, "comfyUiWorkflowRun"),
  comfyUiWorkflowExecutable: /* @__PURE__ */ __name((workflowId) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/executable`, "comfyUiWorkflowExecutable"),
  comfyUiWorkflowMetadata: /* @__PURE__ */ __name((workflowId) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/metadata`, "comfyUiWorkflowMetadata"),
  comfyUiWorkflowAgentAccess: /* @__PURE__ */ __name((workflowId) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/agent-access`, "comfyUiWorkflowAgentAccess"),
  comfyUiRuns: "/api/comfyui/runs",
  // Internal immutable request/billing Group recovery for MCP billable exits.
  internalRequestGroup: /* @__PURE__ */ __name((runtimeSessionId) => `/api/internal/sessions/${encodeURIComponent(runtimeSessionId)}/request-group`, "internalRequestGroup"),
  internalRequestGroupDiagnostic: "/api/internal/sessions/request-group-diagnostic",
  /** Gateway-level billing scope fallback when plugin context is absent. */
  internalBillingCurrentScope: "/api/internal/sessions/billing-current-scope",
  // Files
  files: "/api/files",
  deleteFiles: "/api/files/delete",
  mkdir: "/api/files/mkdir",
  rename: "/api/files/rename",
  forkRename: "/api/files/fork-rename",
  move: "/api/files/move",
  copy: "/api/files/copy",
  duplicateFiles: "/api/files/duplicate",
  writeContent: "/api/files/content",
  createTextAsset: "/api/files/text-asset",
  readContent: /* @__PURE__ */ __name((path7) => `/api/files/content?path=${encodeURIComponent(path7)}`, "readContent"),
  filesUploadCdn: "/api/files/upload-cdn",
  upload: "/api/upload",
  uploadCommit: "/api/upload/commit",
  uploadCommitAbort: "/api/upload/commit/abort",
  uploadCommitFinalize: "/api/upload/commit/finalize",
  uploadStagingDelete: "/api/upload/staging/delete",
  importExternal: "/api/files/import-external",
  /**
   * Anchor project-asset files (项目资产 "添加到 agent") into the
   * watcher-ignored `.hilo/project-assets/` directory and return their
   * workspace-relative paths without enrolling them in the vault.
   * Body: { items: Array<{ path, assetId?, projectFolderName? }> } —
   * legacy { paths: string[] } still accepted (no ledger identity).
   * Response: { ok: true, anchored: Array<{ path, filename }>, errors?: [...] }
   */
  anchorProjectAsset: "/api/files/anchor-project-asset",
  /**
   * Write-side propagation for project-asset mutations (Electron main →
   * this workspace's gateway). Re-links anchors after content replacement
   * (new inode) and unlinks them after deletion, driven by the
   * `project_asset_anchors` ledger in the workspace vault sqlite.
   * Body: ProjectAssetPropagateRequest; response: ProjectAssetPropagateResult.
   */
  projectAssetPropagate: "/api/files/project-asset-propagate",
  /**
   * Pure-stat probe used by the asset-panel right-click menu's
   * "Import" / "Paste" / "New Folder" entries to surface a conflict-resolution
   * modal before kicking off the actual mkdir / import.
   * Body: { items: Array<{ name, sourcePath?, kind? }>, targetDir? }
   * Response: { ok: true, conflicts: Array<{ name, sourcePath?, existingKind }> }
   */
  checkConflicts: "/api/files/check-conflicts",
  /**
   * Recursive directory listing for the open workspace. Returns every
   * directory (including empty ones), workspace-relative POSIX paths.
   * Used by the asset panel tree to surface empty folders that the
   * file-only vault can't enumerate. WS push: `dirs_changed`.
   * Response: { ok: true, dirs: string[] }
   */
  listDirs: "/api/files/dirs",
  trackFile: "/api/files/track",
  thumbnail: /* @__PURE__ */ __name((path7) => `/api/thumbnail/${encodePath(path7)}`, "thumbnail"),
  serveFile: /* @__PURE__ */ __name((path7) => `/files/${encodePath(path7)}`, "serveFile"),
  adoptFiles: "/api/files/adopt",
  serveFileById: /* @__PURE__ */ __name((id) => `/files/id/${encodeURIComponent(id)}`, "serveFileById"),
  scanMedia: /* @__PURE__ */ __name((dir, limit = 3) => `/api/files/scan-media?dir=${encodeURIComponent(dir)}&limit=${limit}`, "scanMedia"),
  workspaceSummary: /* @__PURE__ */ __name((dir) => `/api/files/workspace-summary?dir=${encodeURIComponent(dir)}`, "workspaceSummary"),
  serveLocal: /* @__PURE__ */ __name((absolutePath) => `/api/local-file?path=${encodeURIComponent(absolutePath)}`, "serveLocal"),
  filesMentionSearch: "/api/files/mention-search",
  projectAssetMentionSearch: "/api/files/project-asset-mention-search",
  // Text document versions (named snapshots of a text asset).
  // Content never round-trips through the renderer on save: the body only
  // carries { assetId, title, note } and the gateway snapshots off disk.
  textVersions: "/api/files/versions",
  textVersionsList: /* @__PURE__ */ __name((assetId) => `/api/files/versions?assetId=${encodeURIComponent(assetId)}`, "textVersionsList"),
  textVersion: /* @__PURE__ */ __name((id) => `/api/files/versions/${encodeURIComponent(id)}`, "textVersion"),
  textVersionContent: /* @__PURE__ */ __name((id, offset = 0, limit) => {
    const query = new URLSearchParams({ offset: String(offset) });
    if (limit !== void 0)
      query.set("limit", String(limit));
    return `/api/files/versions/${encodeURIComponent(id)}/content?${query.toString()}`;
  }, "textVersionContent"),
  /**
   * Diff between two snapshots of one document. `to` may be omitted to diff
   * a version against the CURRENT on-disk content (the editor's default
   * "what changed since this version" view). Server-side only: neither side
   * of a multi-MB document is ever shipped to the renderer.
   */
  textVersionDiff: /* @__PURE__ */ __name((params) => {
    const query = new URLSearchParams({ from: params.from });
    if (params.to)
      query.set("to", params.to);
    if (params.offset !== void 0)
      query.set("offset", String(params.offset));
    if (params.limit !== void 0)
      query.set("limit", String(params.limit));
    return `/api/files/versions/diff?${query.toString()}`;
  }, "textVersionDiff"),
  textVersionRestore: /* @__PURE__ */ __name((id) => `/api/files/versions/${encodeURIComponent(id)}/restore`, "textVersionRestore"),
  textVersionMaterialize: /* @__PURE__ */ __name((id) => `/api/files/versions/${encodeURIComponent(id)}/materialize`, "textVersionMaterialize"),
  textVersionSummarize: "/api/files/versions/summarize",
  // Media preview
  heicPreview: "/api/media/heic-preview",
  webMedia: "/api/web-media/yt-dlp",
  // Built-in workspace browser automation (proxied to the Electron main
  // process via the MainBridgeServer loopback bridge).
  browserAutomation: "/api/browser/automation",
  // Assets
  assets: /* @__PURE__ */ __name((folder) => `/api/assets/${encodeURIComponent(folder)}`, "assets"),
  allAssets: "/api/assets",
  /**
   * `GET /api/assets` opting into the raw `metadata` blob.
   *
   * Only for callers that read un-projected keys (today: mcp-tools reading
   * `read_media_cache`). Everything else must use `allAssets` -- the blob
   * duplicates every flat field and is unbounded in size.
   */
  allAssetsWithMetadata: "/api/assets?include=metadata",
  assetChanges: "/api/assets/changes",
  // W4-T1: missing-asset reconciliation actions (ADR-004 Phase 4)
  mergeMissingCandidate: /* @__PURE__ */ __name((id) => `/api/assets/${encodeURIComponent(id)}/merge-candidate`, "mergeMissingCandidate"),
  removeMissing: /* @__PURE__ */ __name((id) => `/api/assets/${encodeURIComponent(id)}/remove-missing`, "removeMissing"),
  locateMissing: /* @__PURE__ */ __name((id) => `/api/assets/${encodeURIComponent(id)}/locate`, "locateMissing"),
  // Canvas asset tags (PRD: canvas 内标签体系)
  assetTags: /* @__PURE__ */ __name((id) => `/api/assets/${encodeURIComponent(id)}/tags`, "assetTags"),
  assetTagsBatch: "/api/assets/tags/batch",
  assetTagMutationsBatch: "/api/assets/tags/mutations/batch",
  tagRegistry: "/api/canvas/tag-registry",
  canvasTags: "/api/canvas/tags",
  canvasTag: /* @__PURE__ */ __name((id) => `/api/canvas/tags/${encodeURIComponent(id)}`, "canvasTag"),
  canvasTagImpact: /* @__PURE__ */ __name((id) => `/api/canvas/tags/${encodeURIComponent(id)}/impact`, "canvasTagImpact"),
  canvasTagOrder: "/api/canvas/tags/order",
  // Dependencies (ADR-005 Layer 3 / W5-T1)
  // Lineage queries follow role='source' edges only; inputs returns
  // every role for the immediate fan-in (style / mask / pose / ...).
  dependenciesUpstream: /* @__PURE__ */ __name((assetId) => `/api/dependencies/${encodeURIComponent(assetId)}/upstream`, "dependenciesUpstream"),
  dependenciesDownstream: /* @__PURE__ */ __name((assetId) => `/api/dependencies/${encodeURIComponent(assetId)}/downstream`, "dependenciesDownstream"),
  dependenciesInputs: /* @__PURE__ */ __name((assetId) => `/api/dependencies/${encodeURIComponent(assetId)}/inputs`, "dependenciesInputs"),
  addDependency: "/api/dependencies",
  deleteDependency: /* @__PURE__ */ __name((id) => `/api/dependencies/${id}`, "deleteDependency"),
  // Asset hover-card preview (text excerpt + read-only metadata enrichment)
  assetTextPreview: /* @__PURE__ */ __name((path7, chars = 200) => `/api/asset/text-preview?path=${encodeURIComponent(path7)}&chars=${chars}`, "assetTextPreview"),
  documentRead: /* @__PURE__ */ __name((path7, offset = 1, limit = 2e3, imagePage) => `/api/internal/document/read?path=${encodeURIComponent(path7)}&offset=${offset}&limit=${limit}${imagePage === void 0 ? "" : `&image_page=${imagePage}`}`, "documentRead"),
  assetMetadata: /* @__PURE__ */ __name((id) => `/api/asset/${encodeURIComponent(id)}/metadata`, "assetMetadata"),
  /**
   * Hover-only height-capped MP4 stream. Compatible H.264 MP4 sources pass
   * through; other containers/codecs are remuxed or transcoded for Chromium.
   */
  assetVideoStream: /* @__PURE__ */ __name((path7, maxHeight = 480) => `/api/asset/video-stream?path=${encodeURIComponent(path7)}&maxHeight=${maxHeight}`, "assetVideoStream"),
  /** Browser-compatible H.264/AAC MP4 for canvas playback. */
  assetVideoPlayback: videoPlaybackPath,
  // Pre-computed audio peaks (issue #5 follow-up §2): wavesurfer.js skips
  // its own decode when peaks + duration are supplied via constructor opts.
  // Buckets are clamped server-side to [50, 4096]; default 200 matches the
  // typical hover-card waveform width (~400 px @ 2-bar minimum).
  assetPeaks: /* @__PURE__ */ __name((path7, buckets = 200) => `/api/asset/peaks?path=${encodeURIComponent(path7)}&buckets=${buckets}`, "assetPeaks"),
  // Asset Center
  assetCenterWorkspaceRefs: /* @__PURE__ */ __name((workspace) => `/api/asset-center/workspace-refs?workspace=${encodeURIComponent(workspace)}`, "assetCenterWorkspaceRefs"),
  assetCenterAttachmentBlob: /* @__PURE__ */ __name((attachmentId, width) => {
    const base = `/api/asset-center/attachments/${encodeURIComponent(attachmentId)}/blob`;
    return width === void 0 ? base : `${base}?w=${width}`;
  }, "assetCenterAttachmentBlob"),
  assetCenterAttachmentPlayback: /* @__PURE__ */ __name((attachmentId, maxHeight = 1080) => `/api/asset-center/attachments/${encodeURIComponent(attachmentId)}/playback?maxHeight=${maxHeight}`, "assetCenterAttachmentPlayback"),
  assetCenterBlobPreview: /* @__PURE__ */ __name((blobPath, width = 512) => `/api/asset-center/blobs/preview?${new URLSearchParams({ blobPath, w: String(width) }).toString()}`, "assetCenterBlobPreview"),
  assetCenterBlobPlayback: /* @__PURE__ */ __name((blobPath, maxHeight = 1080) => `/api/asset-center/blobs/playback?${new URLSearchParams({
    blobPath,
    maxHeight: String(maxHeight)
  }).toString()}`, "assetCenterBlobPlayback"),
  // Canvas
  canvas: "/api/canvas",
  canvasRecovery: "/api/canvas/recovery-result",
  canvasSearch: "/api/canvas/search",
  addCanvasNode: "/api/canvas/add-node",
  canvasMediaNode: "/api/canvas/media-node",
  // Generation
  models: "/api/models",
  modelsConfig: "/api/v1/models/config",
  imageModels: "/api/models/image",
  videoModels: "/api/models/video",
  speechModels: "/api/models/speech",
  musicModels: "/api/models/music",
  agentModels: "/api/runtime/models",
  openCodeConfig: "/api/v1/config",
  speechVoices: "/api/speech/voices",
  speechVoiceDesign: "/api/speech/voice_design",
  generateImage: "/api/generate/image",
  generateVideo: "/api/generate/video",
  generateSpeech: "/api/generate/speech",
  generateMusic: "/api/generate/music",
  generateText: "/api/generate/text",
  generationCancel: "/api/generation/cancel",
  generationQueueSummary: "/api/generation-queue/summary",
  generationQueueCancel: "/api/generation-queue/cancel",
  canvasGenerationReconcile: "/api/canvas/generation/reconcile",
  generateImageSubmit: "/api/generate/image/submit",
  generateVideoSubmit: "/api/generate/video/submit",
  generateSpeechSubmit: "/api/generate/speech/submit",
  generateMusicSubmit: "/api/generate/music/submit",
  generateTaskQueryPattern: "/api/generate/tasks/:task_id/query",
  generateTaskQuery: /* @__PURE__ */ __name((taskId) => `/api/generate/tasks/${encodeURIComponent(taskId)}/query`, "generateTaskQuery"),
  // Editing
  concatenateVideos: "/api/edit/concatenate-videos",
  embedAudio: "/api/edit/embed-audio",
  extractAudio: "/api/edit/extract-audio",
  voiceIsolation: "/api/speech/voice_isolation",
  lipSync: "/api/edit/lip-sync",
  asr: "/api/edit/asr",
  analyzeMedia: "/api/edit/analyze-media",
  superResolution: "/api/edit/super-resolution",
  eraseBanana: "/api/edit/erase-banana",
  redrawBanana: "/api/edit/redraw-banana",
  outpaintBanana: "/api/edit/outpaint-banana",
  moveObjectBanana: "/api/edit/move-object-banana",
  removeBackground: "/api/edit/remove-background",
  layerDecompose: "/api/edit/layer-decompose",
  enhanceImageMediaKit: "/api/edit/enhance-image",
  enhanceVideoMediaKit: "/api/edit/enhance-video-mediakit",
  hailuo03VideoSuperResolution: "/api/edit/hailuo03-video-super-resolution",
  eraseSubtitleMediaKit: "/api/edit/erase-subtitle-mediakit",
  asrMediaKit: "/api/edit/asr-mediakit",
  asrWhisper: "/api/edit/asr-whisper",
  // Skills
  skills: "/api/skills",
  runtimeSkills: "/api/skills/runtime",
  marketSkills: "/api/skills/market",
  marketSearch: "/api/skills/market/search",
  marketInstall: "/api/skills/market/install",
  marketUninstall: "/api/skills/market/uninstall",
  skillImport: "/api/skills/import",
  skillSubmissionStage: "/api/skills/submission/stage",
  skillSubmissionSave: "/api/skills/submission/save",
  skillSubmissionCoverUpload: "/api/skills/creator-plan/cover-upload",
  skillSubmissionAssetUpload: "/api/skills/creator-plan/asset-upload",
  skillSubmissionAssetPresign: "/api/skills/creator-plan/asset-presign",
  skillSubmissionSubmit: "/api/skills/creator-plan/submit",
  skillSubmissionList: "/api/skills/creator-plan/submissions",
  skillSubmissionOffline: "/api/skills/creator-plan/offline",
  marketWhitelist: "/api/skills/market/whitelist",
  marketSyncStatus: "/api/skills/market/sync-status",
  marketCheckOperator: "/api/skills/market/check-operator",
  marketOperations: "/api/skills/market/operation",
  marketDeleteOperation: /* @__PURE__ */ __name((skillName) => `/api/skills/market/operation/${encodeURIComponent(skillName)}`, "marketDeleteOperation"),
  marketBatchSaveOperations: "/api/skills/market/operations/batch",
  marketOperatorSubmissions: "/api/skills/market/operator/submissions",
  marketOperatorPublished: "/api/skills/market/operator/published",
  marketOperatorSubmission: /* @__PURE__ */ __name((submissionId) => `/api/skills/market/operator/submissions/${encodeURIComponent(submissionId)}`, "marketOperatorSubmission"),
  marketOperatorSubmissionPackage: /* @__PURE__ */ __name((submissionId) => `/api/skills/market/operator/submissions/${encodeURIComponent(submissionId)}/package`, "marketOperatorSubmissionPackage"),
  marketOperatorSubmissionPackageUpload: /* @__PURE__ */ __name((submissionId) => `/api/skills/market/operator/submissions/${encodeURIComponent(submissionId)}/package-upload`, "marketOperatorSubmissionPackageUpload"),
  marketOperatorBatchApprove: "/api/skills/market/operator/submissions/batch-approve",
  marketOperatorPublish: "/api/skills/market/operator/publish",
  marketOperatorCategories: "/api/skills/market/categories",
  marketTrending: "/api/skills/market/trending",
  skillFiles: /* @__PURE__ */ __name((name) => `/api/skills/${encodeURIComponent(name)}/files`, "skillFiles"),
  skillFileContent: /* @__PURE__ */ __name((name, filePath) => `/api/skills/${encodeURIComponent(name)}/file-content?path=${encodeURIComponent(filePath)}`, "skillFileContent"),
  skillUserTrash: "/api/skills/user/trash",
  skillFork: "/api/skills/fork",
  // Plugin management (local plugin listing, not cloud market)
  plugins: "/api/plugins",
  // Feedback
  feedback: "/api/feedback",
  feedbackUploadAttachment: "/api/feedback/upload-attachment",
  feedbackDetail: /* @__PURE__ */ __name((ticketId) => `/api/feedback/${encodeURIComponent(ticketId)}`, "feedbackDetail"),
  // Export
  exportSession: /* @__PURE__ */ __name((id) => `/api/sessions/${id}/export`, "exportSession"),
  customMcpApply: "/api/connectors/mcp",
  customMcpAuthorize: "/api/connectors/mcp/authorize",
  customMcpAuthenticate: "/api/connectors/mcp/authenticate",
  projectArchiveActivityBegin: "/api/projects/archive/activity/begin",
  projectArchiveActivityHeartbeat: "/api/projects/archive/activity/heartbeat",
  projectArchiveActivityEnd: "/api/projects/archive/activity/end",
  // Billing
  billingPricing: "/api/v1/billing/pricing",
  billingPromotion: "/api/v1/billing/promotion",
  /** Atomic cloud-side price calculation; reminder policy stays local. */
  creditCalculateCost: "/api/v1/credit/calculate-cost",
  /** Atomic authoritative balance query for the authenticated billing scope. */
  creditBalance: "/api/v1/credit/balance",
  /** Existing wallet envelope used by the balance/insufficient-credit UI. */
  creditWallet: "/api/v1/credit/wallet",
  hailuo03VideoTrialStatus: "/api/v1/promotions/hailuo03-video-trial/status",
  hailuo03VideoTrialClaim: "/api/v1/promotions/hailuo03-video-trial/claim",
  // Home
  hubClientConfig: "/api/v1/hub/client_config",
  /** Cloud-side OAuth code→token exchange for confidential connector providers. */
  connectorOAuthExchange: "/api/v1/connector/oauth/exchange",
  apolloConfig: /* @__PURE__ */ __name((key) => `/api/v1/apollo/config?key=${encodeURIComponent(key)}`, "apolloConfig"),
  /** Legacy path retained for old Desktop releases. */
  homeQuickStartConfig: "/api/v1/home/quick_start_config",
  /** Current Desktop explicitly selects the isolated Apollo v2 key. */
  homeQuickStartConfigV2: "/api/v1/home/quick_start_config?config_version=2",
  // Group 间 MediaCredit 转移（Owner only）。operator_uid 由云网关从登录态解析；
  // 客户端严格发送后端契约的三字段请求；幂等由云端负责。
  creditTransfer: "/api/v1/credit/transfer",
  // Account deletion（账户注销）。
  accountProfile: "/api/v1/account/profile",
  accountHailuoWeb: "/api/v1/account/hailuo-web",
  accountHailuoCancelCheck: "/api/v1/account/cancel/hailuo-check",
  accountHubCancelCheck: "/api/v1/account/cancel/check",
  accountCancelSendCode: "/api/v1/account/cancel/send-code",
  accountDelete: "/api/v1/account/cancel",
  // Team edition (Renderer-safe business data only).
  // Canonical active-context and operation coordination routes are deliberately
  // absent: they are Main-process implementation details and must never become
  // a second Renderer source of truth.
  teamContract: "/api/v1/team/contract",
  teamCapabilities: "/api/v1/team/capabilities",
  groupList: `/backend/group/list?biz_line=${HILO_HUB_BIZ_LINE}`,
  groupCreate: "/backend/group/create",
  /** QueryGroupMembers：按 scope 查成员（InGroup 当前团队全量 / Owned·Manageable 聚合去重候选，无分页）。 */
  groupMembersQuery: "/backend/group/members/query",
  /** BatchAddGroupMembers：按 UID 批量入团（单次上限 100，逐用户结果）。 */
  groupMembersBatchAdd: "/backend/group/members/batch_add",
  teamInvitations: "/api/v1/team/invitations",
  teamInvitation: /* @__PURE__ */ __name((invitationId) => `/api/v1/team/invitations/${encodeURIComponent(invitationId)}`, "teamInvitation"),
  teamDetail: /* @__PURE__ */ __name((groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}`, "teamDetail"),
  teamRename: /* @__PURE__ */ __name((groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}`, "teamRename"),
  teamDelete: /* @__PURE__ */ __name((groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}`, "teamDelete"),
  teamMembers: /* @__PURE__ */ __name((groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members`, "teamMembers"),
  teamInviteMembers: /* @__PURE__ */ __name((groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members/invite`, "teamInviteMembers"),
  teamRemoveMember: /* @__PURE__ */ __name((groupId, userId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`, "teamRemoveMember"),
  teamChangeMemberRole: /* @__PURE__ */ __name((groupId, userId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}/role`, "teamChangeMemberRole"),
  teamLeave: /* @__PURE__ */ __name((groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/leave`, "teamLeave"),
  teamTransferOwner: /* @__PURE__ */ __name((groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/transfer-owner`, "teamTransferOwner"),
  teamInviteLinks: /* @__PURE__ */ __name((groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/invite-links`, "teamInviteLinks"),
  teamInviteLinkInfo: /* @__PURE__ */ __name((token, region) => {
    const params = new URLSearchParams({ token });
    if (region)
      params.set("region", region);
    return `/api/v1/team/invite-links/info?${params.toString()}`;
  }, "teamInviteLinkInfo"),
  teamInviteLinkAccept: "/api/v1/team/invite-links/accept",
  teamInviteLinkDecline: "/api/v1/team/invite-links/decline",
  teamInvitationAccept: "/api/v1/team/invitations/accept",
  teamQuota: /* @__PURE__ */ __name((groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/quota`, "teamQuota"),
  teamMemberQuotas: /* @__PURE__ */ __name((groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/member-quotas`, "teamMemberQuotas"),
  /** 云网关 member/details 代理：全量成员 + Quota 使用 + 历史累计消耗（不分页）。 */
  teamMemberDetails: /* @__PURE__ */ __name((groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/member-details`, "teamMemberDetails"),
  teamCreditSummary: /* @__PURE__ */ __name((groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/credit-summary`, "teamCreditSummary"),
  teamTransactions: /* @__PURE__ */ __name((groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/transactions`, "teamTransactions"),
  teamSelfTransactions: /* @__PURE__ */ __name((groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/self/transactions`, "teamSelfTransactions"),
  teamMemberTransactions: /* @__PURE__ */ __name((groupId, memberId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}/transactions`, "teamMemberTransactions"),
  teamTransfers: /* @__PURE__ */ __name((groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/transfers`, "teamTransfers"),
  teamCheckoutSessions: /* @__PURE__ */ __name((groupId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/checkout-sessions`, "teamCheckoutSessions"),
  // WebSocket
  wsChat: "/ws"
};

// ../protocol/dist/backend-ids.js
var BACKEND_NANO_BANANA = "nano_banana";
var BACKEND_KLING = "kling";
var BACKEND_OPENAI = "openai";
var BACKEND_MIDJOURNEY = "midjourney";
var BACKEND_SEEDREAM = "seedream";
var BACKEND_MINIMAX_V3 = "minimax_v3";
var BACKEND_VEO3 = "veo3";
var BACKEND_WAN_I2V = "wan_i2v";
var BACKEND_MINIMAX_TTS = "minimax_tts";
var BACKEND_SEEDAUDIO = "seedaudio";
var BACKEND_MINIMAX_MUSIC = "minimax_music";
var BACKEND_ELEVENLABS_MUSIC = "elevenlabs_music";
var BACKEND_SEEDANCE = "seedance";
var BACKEND_KLING_AVATAR = "kling_avatar";

// ../protocol/dist/rest.js
var CREDIT_INTERACTION_TIMEOUT_BUDGET_MS = 15 * 6e4;
var ASYNC_GENERATE_OVERALL_TIMEOUT_MS = 300 * 6e4;

// ../protocol/dist/model-registry.js
var ASPECT_RATIOS_FULL = [
  "auto",
  "1:1",
  "16:9",
  "9:16",
  "3:4",
  "4:3",
  "3:2",
  "2:3",
  "5:4",
  "4:5",
  "21:9"
];
var IMAGE_GENERATION_ESTIMATE_SECONDS = 180;
function registrySelectionRowIds(entry) {
  return Array.from(new Set([
    entry.id,
    entry.model_name,
    entry.publicToken,
    entry.seriesId ?? entry.id,
    ...entry.selectionAliases ?? []
  ].filter((value) => Boolean(value))));
}
__name(registrySelectionRowIds, "registrySelectionRowIds");
var LEGACY_HAILUO_MODEL_ALIASES = [
  {
    publicModels: ["MiniMax-Hailuo-2.3-Fast", "Hailuo 2.3 Fast"],
    pricingModel: "MiniMax-Hailuo-2.3-Fast",
    preferredPublicModel: "MiniMax-Hailuo-2.3-Fast",
    displayName: "Hailuo 2.3 Fast"
  },
  {
    publicModels: ["MiniMax-Hailuo-2.3", "Hailuo 2.3"],
    pricingModel: "MiniMax-Hailuo-2.3",
    preferredPublicModel: "MiniMax-Hailuo-2.3",
    displayName: "Hailuo 2.3"
  },
  {
    publicModels: ["MiniMax-Hailuo-02", "Hailuo 2.0"],
    pricingModel: "MiniMax-Hailuo-02",
    preferredPublicModel: "MiniMax-Hailuo-02",
    displayName: "Hailuo 2.0"
  }
];
var LEGACY_MODEL_DISPLAY_NAMES = new Map(LEGACY_HAILUO_MODEL_ALIASES.flatMap((alias) => [...alias.publicModels, alias.pricingModel].map((model) => [model, alias.displayName])));
function gptImage25Params() {
  return {
    resolution: {
      type: "select",
      label: "\u5206\u8FA8\u7387",
      options: ["1k", "2k", "4k"],
      default: "1k"
    },
    aspect_ratio: {
      type: "select",
      label: "\u6BD4\u4F8B",
      options: [
        "1:1",
        "16:9",
        "9:16",
        "3:4",
        "4:3",
        "3:2",
        "2:3",
        "5:4",
        "4:5",
        "21:9",
        "2:1",
        "1:2",
        "3:1",
        "1:3"
      ],
      default: "1:1"
    },
    quality: {
      type: "select",
      label: "\u753B\u8D28",
      options: ["low", "medium", "high", "xhigh", "max"],
      default: "medium"
    },
    // background 只在 2.5 暴露：云网关 normalizeOpenAIBackground 会把其他 GPT Image
    // 模型上的 transparent / opaque 归一化回 auto。transparent 时由云网关自行补
    // output_format=png，前端不需要（也不应该）声明这个参数。
    background: {
      type: "select",
      label: "\u80CC\u666F",
      options: ["auto", "transparent", "opaque"],
      default: "auto"
    }
  };
}
__name(gptImage25Params, "gptImage25Params");
var IMAGE_MODELS = [
  // NanoBanana series — domestic registration (General Image branding)
  {
    id: "banana-2",
    name: "General Image 2",
    seriesId: "banana",
    publicToken: "banana_2",
    region: "domestic",
    backend: BACKEND_NANO_BANANA,
    model_name: "nano_banana_2_flash",
    //backend model name
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      image_mode: {
        type: "select",
        label: "\u751F\u6210\u65B9\u5F0F",
        options: ["reference"],
        default: "reference"
      },
      aspect_ratio: {
        type: "select",
        label: "\u6BD4\u4F8B",
        options: ASPECT_RATIOS_FULL,
        default: "auto"
      },
      resolution: {
        type: "select",
        label: "\u5206\u8FA8\u7387",
        options: ["auto", "1K", "2K", "4K"],
        default: "auto"
      }
    }
  },
  {
    id: "banana-pro",
    name: "General Image Pro",
    seriesId: "banana",
    publicToken: "banana_pro",
    region: "domestic",
    backend: BACKEND_NANO_BANANA,
    model_name: "nano_banana_2",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      image_mode: {
        type: "select",
        label: "\u751F\u6210\u65B9\u5F0F",
        options: ["reference"],
        default: "reference"
      },
      aspect_ratio: {
        type: "select",
        label: "\u6BD4\u4F8B",
        options: ASPECT_RATIOS_FULL,
        default: "auto"
      },
      resolution: {
        type: "select",
        label: "\u5206\u8FA8\u7387",
        options: ["auto", "1K", "2K", "4K"],
        default: "auto"
      }
    }
  },
  // NanoBanana series — overseas registration (NanoBanana branding)
  {
    id: "nano_banana_2_flash",
    name: "NanoBanana 2",
    seriesId: "nano-banana",
    region: "overseas",
    backend: BACKEND_NANO_BANANA,
    model_name: "nano_banana_2_flash",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      aspect_ratio: {
        type: "select",
        label: "\u6BD4\u4F8B",
        options: ASPECT_RATIOS_FULL,
        default: "auto"
      },
      resolution: {
        type: "select",
        label: "\u5206\u8FA8\u7387",
        options: ["auto", "1K", "2K", "4K"],
        default: "auto"
      }
    }
  },
  {
    id: "nano_banana_2",
    name: "NanoBanana Pro",
    seriesId: "nano-banana",
    region: "overseas",
    backend: BACKEND_NANO_BANANA,
    model_name: "nano_banana_2",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      aspect_ratio: {
        type: "select",
        label: "\u6BD4\u4F8B",
        options: ASPECT_RATIOS_FULL,
        default: "auto"
      },
      resolution: {
        type: "select",
        label: "\u5206\u8FA8\u7387",
        options: ["auto", "1K", "2K", "4K"],
        default: "auto"
      }
    }
  },
  // Seedream
  // max_refs 严格对齐官方文档上限 ≤10（4.5/4.0 多图融合），早期 registry
  // 写 14 会被上游静默截断或返回 4xx；详见画布模型参数对接 Diff 报告 §2.2
  // (2026-06-07)。如需放宽请先与上游确认。
  {
    id: "doubao-seedream-5-0-pro-260628",
    name: "Seedream 5.0 Pro",
    seriesId: "seedream",
    backend: BACKEND_SEEDREAM,
    model_name: "doubao-seedream-5-0-pro-260628",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      aspect_ratio: {
        type: "select",
        label: "\u6BD4\u4F8B",
        options: ASPECT_RATIOS_FULL,
        default: "auto"
      },
      // Seedream 5.0 Pro \u4E0A\u6E38\u5206\u8FA8\u7387\u6863\u4F4D\uFF1A1K / 2K\uFF08\u65E0 auto / \u65E0 3K / \u65E0 4K\uFF09\u3002
      // Default to 2K, matching the upstream default.
      resolution: {
        type: "select",
        label: "\u5206\u8FA8\u7387",
        options: ["1K", "2K"],
        default: "2K"
      }
    }
  },
  {
    id: "doubao-seedream-4-5-251128",
    name: "Seedream 4.5",
    seriesId: "seedream",
    backend: BACKEND_SEEDREAM,
    model_name: "doubao-seedream-4-5-251128",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      aspect_ratio: {
        type: "select",
        label: "\u6BD4\u4F8B",
        options: ASPECT_RATIOS_FULL,
        default: "auto"
      },
      // Seedream 4.5 \u4E0A\u6E38\u5206\u8FA8\u7387\u6863\u4F4D\uFF1A2K / 4K\uFF08\u65E0 auto / \u65E0 1K / \u65E0 3K\uFF09\u3002
      // Default to 2K, matching the upstream default.
      resolution: {
        type: "select",
        label: "\u5206\u8FA8\u7387",
        options: ["2K", "4K"],
        default: "2K"
      }
    }
  },
  // Midjourney 8.2 is the only generation entry; billing retains the series key.
  {
    id: "midjourney-8.2",
    name: "Midjourney 8.2",
    seriesId: "midjourney",
    backend: BACKEND_MIDJOURNEY,
    pricingId: "midjourney",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 4,
    params: {
      aspect_ratio: {
        type: "select",
        label: "\u6BD4\u4F8B",
        options: ASPECT_RATIOS_FULL,
        default: "1:1"
      },
      clarity: {
        type: "select",
        label: "\u6E05\u6670\u5EA6",
        options: ["1k", "2k"],
        default: "1k"
      },
      stylize: {
        type: "slider",
        label: "\u98CE\u683C\u5316",
        min: 0,
        max: 1e3,
        step: 1,
        default: "100",
        marks: ["0", "100", "250", "500", "750", "1000"]
      },
      chaos: {
        type: "slider",
        label: "\u591A\u6837\u5316",
        min: 0,
        max: 100,
        step: 1,
        default: "0",
        marks: ["0", "10", "30", "50", "75", "100"]
      },
      weird: {
        type: "slider",
        label: "\u602A\u5F02\u5316",
        min: 0,
        max: 3e3,
        step: 1,
        default: "0",
        marks: ["0", "250", "500", "1000", "2000", "3000"]
      }
    }
  },
  // GPT Image 2 — 双区域命名分离（与 all-in-one / nano_banana 同模式）
  // Domestic: g-image-2 / "Design Image 2" —— 去 OpenAI 品牌
  // Overseas: gpt-image-2 / "GPT Image 2" —— 沿用 OpenAI 品牌
  //
  // GPT Image 2 双区域共用一套 params 形态：
  //   - aspect_ratio: 在 21:9 之后追加 2:1 / 1:2 / 3:1 / 1:3 四个极端横纵比，
  //     横纵成对排布，保持原有横纵交替的视觉模式。
  //   - quality: low / medium / high 三档，default=medium。gateway 与云网关
  //     已透传并按 quality 分档计费。
  {
    id: "g-image-2",
    name: "Design Image 2",
    seriesId: "g-image-2",
    selectionAliases: ["gpt-image"],
    region: "domestic",
    backend: BACKEND_OPENAI,
    model_name: "gpt-image-2",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 16,
    params: {
      resolution: {
        type: "select",
        label: "\u5206\u8FA8\u7387",
        options: ["1k", "2k", "4k"],
        default: "1k"
      },
      aspect_ratio: {
        type: "select",
        label: "\u6BD4\u4F8B",
        options: [
          "1:1",
          "16:9",
          "9:16",
          "3:4",
          "4:3",
          "3:2",
          "2:3",
          "5:4",
          "4:5",
          "21:9",
          "2:1",
          "1:2",
          "3:1",
          "1:3"
        ],
        default: "1:1"
      },
      quality: {
        type: "select",
        label: "\u753B\u8D28",
        options: ["low", "medium", "high"],
        default: "medium"
      }
    }
  },
  {
    id: "gpt-image-2",
    name: "GPT Image 2",
    seriesId: "openai-image",
    region: "overseas",
    backend: BACKEND_OPENAI,
    model_name: "gpt-image-2",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 16,
    params: {
      resolution: {
        type: "select",
        label: "\u5206\u8FA8\u7387",
        options: ["1k", "2k", "4k"],
        default: "1k"
      },
      aspect_ratio: {
        type: "select",
        label: "\u6BD4\u4F8B",
        options: [
          "1:1",
          "16:9",
          "9:16",
          "3:4",
          "4:3",
          "3:2",
          "2:3",
          "5:4",
          "4:5",
          "21:9",
          "2:1",
          "1:2",
          "3:1",
          "1:3"
        ],
        default: "1:1"
      },
      quality: {
        type: "select",
        label: "\u753B\u8D28",
        options: ["low", "medium", "high"],
        default: "medium"
      }
    }
  },
  // GPT Image 2.5 — Flare（快速）/ Sunburst（精细）两个变体 × 双区域命名分离，
  // 与 GPT Image 2 同模式。max_refs 与链路与 GPT Image 2 一致；参数只多出 quality 的
  // xhigh / max 两档与独有的 background（见 gptImage25Params）。
  //
  // Domestic: g-image-2.5-*   / "Design Image 2.5 Flare|Sunburst" —— 去 OpenAI 品牌
  // Overseas: gpt-image-2.5-* / "GPT Image 2.5 Flare|Sunburst"    —— 沿用 OpenAI 品牌
  //
  // 两区只差一个品牌前缀，变体后缀保持一致。
  //
  // 两区共用同一个上游 model_name，而云网关计费按 model_name 匹配（非注册表 id），
  // 所以 Apollo media_billing_config / op_models 每个变体只需配一份。
  ...[
    { variant: "flare", label: "Flare" },
    { variant: "sunburst", label: "Sunburst" }
  ].flatMap(({ variant, label }) => [
    {
      id: `g-image-2.5-${variant}`,
      name: `Design Image 2.5 ${label}`,
      seriesId: "g-image-2.5",
      region: "domestic",
      backend: BACKEND_OPENAI,
      model_name: `gpt-image-2.5-${variant}`,
      estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
      max_refs: 16,
      params: gptImage25Params()
    },
    {
      id: `gpt-image-2.5-${variant}`,
      name: `GPT Image 2.5 ${label}`,
      seriesId: "openai-image",
      region: "overseas",
      backend: BACKEND_OPENAI,
      model_name: `gpt-image-2.5-${variant}`,
      estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
      max_refs: 16,
      params: gptImage25Params()
    }
  ])
];
var MINIMAX_H3_TEXT_ONLY_DEFAULT_RATIO = "16:9";
var HAILUO03_VIDEO_MODEL = {
  id: "MiniMax-H3",
  name: "MiniMax H3",
  seriesId: "MiniMax",
  backend: BACKEND_MINIMAX_V3,
  model_name: "MiniMax-H3",
  pricingId: "MiniMax-H3",
  max_refs: 9,
  max_video_refs: 3,
  max_audio_refs: 3,
  max_video_audio_refs: 3,
  supportsLastFrameOnly: true,
  promptMaxLength: 7e3,
  inputMediaLimits: {
    imageMinWidth: 256,
    imageMinHeight: 256,
    imageMaxWidth: 5760,
    imageMaxHeight: 5760,
    imageMinAspectRatio: 2 / 5,
    imageMaxAspectRatio: 5 / 2
  },
  params: {
    image_mode: {
      type: "select",
      label: "\u751F\u6210\u65B9\u5F0F",
      options: ["reference", "first-last-frame", "video-extension"],
      default: "reference"
    },
    duration: {
      type: "select",
      label: "\u65F6\u957F",
      options: ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
      default: "5"
    },
    aspect_ratio: {
      type: "select",
      label: "\u5BBD\u9AD8\u6BD4",
      options: [
        "adaptive",
        MINIMAX_H3_TEXT_ONLY_DEFAULT_RATIO,
        "4:3",
        "1:1",
        "3:4",
        "9:16",
        "21:9"
      ],
      default: "adaptive"
    },
    resolution: {
      type: "select",
      label: "\u5206\u8FA8\u7387",
      options: ["768P", "2K"],
      default: "2K"
    },
    generate_audio: {
      type: "select",
      label: "\u6709\u58F0\u89C6\u9891",
      options: ["true", "false"],
      default: "true"
    }
  },
  // 首尾帧模式上游只支持自适应比例（其余比例上游会忽略 / 报错）；视频续写
  // 仍走 768P 专用链路。popover 侧直接隐藏对应模式不支持的选项。
  paramConstraints: [
    {
      if: { param: "image_mode", eq: "first-last-frame" },
      disable: {
        param: "aspect_ratio",
        options: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"]
      }
    },
    {
      if: { param: "image_mode", eq: "video-extension" },
      disable: { param: "resolution", options: ["2K"] }
    }
  ],
  videoExtension: {
    inputMinDurationSec: 2,
    inputMaxDurationSec: 15,
    outputMinDurationSec: 5,
    outputMaxDurationSec: 20
  }
};
var MINIMAX_H3_MAX_VIDEO_MODEL = {
  id: "MiniMax-H3-Max",
  name: "MiniMax H3 Max",
  seriesId: "MiniMax",
  backend: BACKEND_MINIMAX_V3,
  model_name: "MiniMax-H3-Max",
  pricingId: "MiniMax-H3-Max",
  max_refs: 9,
  max_video_refs: 3,
  max_audio_refs: 3,
  max_video_audio_refs: 3,
  promptRequired: true,
  supportsLastFrameOnly: false,
  hiddenParamsByImageMode: {
    "first-last-frame": ["aspect_ratio"]
  },
  referenceMediaLimits: {
    video: { minDurationSec: 2, maxDurationSec: 15, totalMaxDurationSec: 15 },
    audio: {
      minDurationSec: 2,
      maxDurationSec: 15,
      totalMaxDurationSec: 15,
      allowStandalone: false
    }
  },
  params: {
    image_mode: {
      type: "select",
      label: "canvas.params.imageMode",
      options: ["reference", "first-last-frame", "text-to-video"],
      default: "reference"
    },
    aspect_ratio: {
      type: "select",
      label: "canvas.params.ratio",
      options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
      default: "adaptive"
    },
    resolution: {
      type: "select",
      label: "canvas.params.resolution",
      options: ["768P", "480P"],
      default: "768P"
    },
    duration: {
      type: "select",
      label: "canvas.params.duration",
      options: ["5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
      default: "5"
    },
    prompt_expansion_mode: {
      type: "select",
      label: "canvas.params.promptExpansion",
      options: ["disabled", "balanced", "quality"],
      default: "balanced"
    }
  },
  // 上游只在比例能从参考素材推导时接受 adaptive（i2va / r2va）；纯文本生成
  // （t2va）必须给固定比例。首尾帧比例整体隐藏，见 hiddenParamsByImageMode。
  paramConstraints: [
    {
      if: { param: "image_mode", eq: "text-to-video" },
      disable: { param: "aspect_ratio", options: ["adaptive"] }
    }
  ]
};
var MINIMAX_H3_MAX_TURBO_VIDEO_MODEL = {
  ...MINIMAX_H3_MAX_VIDEO_MODEL,
  id: "MiniMax-H3-Max-Turbo",
  name: "MiniMax H3 Max Turbo",
  model_name: "MiniMax-H3-Max-Turbo",
  pricingId: "MiniMax-H3-Max-Turbo",
  max_refs: 2,
  max_video_refs: void 0,
  max_audio_refs: void 0,
  max_video_audio_refs: void 0,
  referenceMediaLimits: void 0,
  params: {
    ...MINIMAX_H3_MAX_VIDEO_MODEL.params,
    image_mode: {
      ...MINIMAX_H3_MAX_VIDEO_MODEL.params.image_mode,
      options: ["first-last-frame", "text-to-video"],
      default: "text-to-video"
    },
    aspect_ratio: {
      ...MINIMAX_H3_MAX_VIDEO_MODEL.params.aspect_ratio,
      options: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
      default: "16:9"
    }
  }
};
var WAN3_MAX_REFERENCE_IMAGES = 10;
var WAN3_MAX_REFERENCE_VIDEOS = 5;
var WAN3_MAX_REFERENCE_AUDIOS = 5;
var WAN3_PROMPT_MAX_LENGTH = 2e4;
var WAN3_REFERENCE_MEDIA_LIMITS = {
  video: {
    minDurationSec: 1,
    maxDurationSec: 15,
    totalMaxDurationSec: 15,
    combinedWithOutputMaxDurationSec: 30
  },
  audio: {
    minDurationSec: 1,
    maxDurationSec: 15,
    totalMaxDurationSec: 15,
    allowStandalone: true
  }
};
var WAN3_DURATION_OPTIONS = Array.from({ length: 29 }, (_, index) => String(index + 2));
function wan3Params() {
  return {
    // 只暴露全能参考与首尾帧两种。视频编辑 / 视频延长 不单独开模式：
    // 在 reference 下放参考视频 + prompt 里写编辑或延长意图，上游自行识别，
    // 能力并没有少。文件参考（file）也归在 reference 里。
    image_mode: {
      type: "select",
      label: "\u751F\u6210\u65B9\u5F0F",
      options: ["reference", "first-last-frame"],
      default: "reference"
    },
    duration: {
      type: "select",
      label: "\u65F6\u957F",
      options: WAN3_DURATION_OPTIONS,
      default: "5"
    },
    aspect_ratio: {
      type: "select",
      label: "\u5BBD\u9AD8\u6BD4",
      options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16"],
      default: "adaptive"
    },
    resolution: {
      type: "select",
      label: "\u5206\u8FA8\u7387",
      options: ["480P", "720P", "1080P"],
      default: "1080P"
    },
    generate_audio: {
      type: "select",
      label: "\u6709\u58F0\u89C6\u9891",
      options: ["true", "false"],
      default: "true"
    }
  };
}
__name(wan3Params, "wan3Params");
var VIDEO_MODELS = [
  HAILUO03_VIDEO_MODEL,
  MINIMAX_H3_MAX_VIDEO_MODEL,
  MINIMAX_H3_MAX_TURBO_VIDEO_MODEL,
  // Seedance series
  {
    id: "seedance2.0",
    name: "Seedance 2.0",
    seriesId: "seedance",
    backend: BACKEND_SEEDANCE,
    model_name: "seedance2.0",
    max_refs: 9,
    max_video_refs: 3,
    max_audio_refs: 3,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "\u751F\u6210\u65B9\u5F0F",
        options: ["reference", "first-last-frame"],
        default: "reference"
      },
      duration: {
        type: "select",
        label: "\u65F6\u957F",
        options: ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
        default: "5"
      },
      aspect_ratio: {
        type: "select",
        label: "\u5BBD\u9AD8\u6BD4",
        options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
        default: "adaptive"
      },
      resolution: {
        type: "select",
        label: "\u5206\u8FA8\u7387",
        options: ["480p", "720p", "1080p", "4k"],
        default: "720p"
      },
      generate_audio: {
        type: "select",
        label: "\u6709\u58F0\u89C6\u9891",
        options: ["true", "false"],
        default: "true"
      }
    }
  },
  {
    id: "seedance2.0-fast",
    name: "Seedance 2.0 Fast",
    seriesId: "seedance",
    backend: BACKEND_SEEDANCE,
    model_name: "seedance2.0-fast",
    max_refs: 9,
    max_video_refs: 3,
    max_audio_refs: 3,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "\u751F\u6210\u65B9\u5F0F",
        options: ["reference", "first-last-frame"],
        default: "reference"
      },
      duration: {
        type: "select",
        label: "\u65F6\u957F",
        options: ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
        default: "5"
      },
      aspect_ratio: {
        type: "select",
        label: "\u5BBD\u9AD8\u6BD4",
        options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
        default: "adaptive"
      },
      resolution: {
        type: "select",
        label: "\u5206\u8FA8\u7387",
        options: ["480p", "720p"],
        default: "720p"
      },
      generate_audio: {
        type: "select",
        label: "\u6709\u58F0\u89C6\u9891",
        options: ["true", "false"],
        default: "true"
      }
    }
  },
  {
    id: "seedance2.0-mini",
    name: "Seedance 2.0 Mini",
    seriesId: "seedance",
    backend: BACKEND_SEEDANCE,
    model_name: "seedance2.0-mini",
    max_refs: 9,
    max_video_refs: 3,
    max_audio_refs: 3,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "\u751F\u6210\u65B9\u5F0F",
        options: ["reference", "first-last-frame"],
        default: "reference"
      },
      duration: {
        type: "select",
        label: "\u65F6\u957F",
        options: ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
        default: "5"
      },
      aspect_ratio: {
        type: "select",
        label: "\u5BBD\u9AD8\u6BD4",
        options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
        default: "adaptive"
      },
      resolution: {
        type: "select",
        label: "\u5206\u8FA8\u7387",
        options: ["480p", "720p"],
        default: "720p"
      },
      generate_audio: {
        type: "select",
        label: "\u6709\u58F0\u89C6\u9891",
        options: ["true", "false"],
        default: "true"
      }
    }
  },
  {
    id: "seedance2.5",
    name: "Seedance 2.5",
    seriesId: "seedance",
    backend: BACKEND_SEEDANCE,
    model_name: "seedance2.5",
    max_refs: 30,
    max_video_refs: 10,
    max_audio_refs: 10,
    promptRequired: true,
    referenceMediaLimits: {
      video: { minDurationSec: 2, maxDurationSec: 30, totalMaxDurationSec: 30 },
      audio: {
        minDurationSec: 2,
        maxDurationSec: 30,
        totalMaxDurationSec: 30,
        allowStandalone: true
      }
    },
    params: {
      image_mode: {
        type: "select",
        label: "\u751F\u6210\u65B9\u5F0F",
        options: ["reference", "first-last-frame", "video-edit", "video-extend"],
        default: "reference"
      },
      duration: {
        type: "select",
        label: "\u65F6\u957F",
        options: Array.from({ length: 27 }, (_, index) => String(index + 4)),
        default: "5"
      },
      aspect_ratio: {
        type: "select",
        label: "\u5BBD\u9AD8\u6BD4",
        options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
        default: "adaptive"
      },
      resolution: {
        type: "select",
        label: "\u5206\u8FA8\u7387",
        options: ["480p", "720p", "1080p"],
        default: "720p"
      },
      output_format: {
        type: "select",
        label: "\u8F93\u51FA\u683C\u5F0F",
        options: ["mp4", "mov"],
        default: "mp4"
      },
      generate_audio: {
        type: "select",
        label: "\u6709\u58F0\u89C6\u9891",
        options: ["true", "false"],
        default: "true"
      }
    }
  },
  // Kling 3.0 Omni video (multi-shot + image/video references).
  {
    id: "kling-v3-omni-video",
    name: "Kling 3.0 Omni",
    seriesId: "kling",
    backend: BACKEND_KLING,
    model_name: "kling-v3-omni",
    pricingId: "kling-v3-omni",
    max_refs: 7,
    max_video_refs: 1,
    promptMaxLength: 2500,
    params: {
      mode: {
        type: "select",
        label: "\u6E05\u6670\u5EA6",
        options: ["std", "pro", "4k"],
        default: "pro"
      },
      aspect_ratio: {
        type: "select",
        label: "\u6BD4\u4F8B",
        options: ["16:9", "9:16", "1:1"],
        default: "16:9"
      },
      duration: {
        type: "select",
        label: "\u65F6\u957F(\u79D2)",
        options: ["3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
        default: "5"
      },
      sound: {
        type: "select",
        label: "\u58F0\u97F3",
        options: ["on", "off"],
        default: "off"
      }
    }
  },
  {
    id: "kling-avatar",
    name: "Kling Avatar",
    seriesId: "kling",
    backend: BACKEND_KLING_AVATAR,
    model_name: "kling-avatar",
    pricingId: "kling-avatar",
    max_refs: 1,
    referenceImageRequired: true,
    max_audio_refs: 1,
    params: {
      image_mode: {
        type: "select",
        label: "\u751F\u6210\u65B9\u5F0F",
        options: ["reference"],
        default: "reference"
      },
      mode: {
        type: "select",
        label: "\u6E05\u6670\u5EA6",
        options: ["std", "pro"],
        default: "std"
      },
      type: {
        type: "select",
        label: "\u7C7B\u578B",
        options: ["avatar"],
        default: "avatar"
      }
    }
  },
  // Wan 2.6 已下线：Apollo 不再下发这一行，且 wan_i2v backend 现在路由到 Wan 3.0，
  // 真去生成会被云网关的 wan3 型号白名单拒掉。条目本身不能删 —— 历史用 2.6
  // 生成的资产还要靠它查显示名（见 ModelInfo.hideInModelPicker 的说明），
  // 所以只把它从选择面里藏起来。
  {
    id: "wan2.6-i2v",
    name: "Wan 2.6",
    seriesId: "wan",
    backend: BACKEND_WAN_I2V,
    model_name: "wan2.6-i2v",
    hideInModelPicker: true,
    max_refs: 1,
    referenceImageRequired: true,
    max_audio_refs: 1,
    promptMaxLength: 1500,
    params: {
      duration: {
        type: "select",
        label: "\u65F6\u957F",
        options: ["5", "10", "15"],
        default: "5"
      },
      resolution: {
        type: "select",
        label: "\u5206\u8FA8\u7387",
        options: ["720P", "1080P"],
        default: "1080P"
      },
      shot_type: {
        type: "select",
        label: "\u955C\u5934\u7C7B\u578B",
        options: ["single", "multi"],
        default: "single"
      }
    }
  },
  // Wan 3.0 — All-in-One 全能参考视频。文生 / 首帧(+尾帧) / 参考生 / 视频编辑 /
  // 视频延长共用同一上游入口，由素材组合决定模式。image_mode 只暴露 reference 与
  // first-last-frame 两档：编辑和延长靠 reference + 参考视频 + prompt 意图达成，
  // 不需要单独的模式档。
  // backend 复用 wan_i2v（见 backend-ids.ts 的说明）：新增 backend id 会让存量
  // 客户端整份 catalog 解析失败。本地 gateway 按 model_id 选实现。
  // 上游强互斥：首尾帧素材与参考素材（图 / 视频 / 音频 / 文件）不能混用，
  // 云网关 ValidateWan3Input 会在提交期拦掉非法组合。
  {
    id: "wan3.0-video",
    name: "Wan 3.0",
    seriesId: "wan",
    backend: BACKEND_WAN_I2V,
    model_name: "wan3.0-video",
    max_refs: WAN3_MAX_REFERENCE_IMAGES,
    max_video_refs: WAN3_MAX_REFERENCE_VIDEOS,
    max_audio_refs: WAN3_MAX_REFERENCE_AUDIOS,
    promptMaxLength: WAN3_PROMPT_MAX_LENGTH,
    referenceMediaLimits: WAN3_REFERENCE_MEDIA_LIMITS,
    params: wan3Params()
  },
  {
    id: "wan3.0-video-prime",
    name: "Wan 3.0 Prime",
    seriesId: "wan",
    backend: BACKEND_WAN_I2V,
    model_name: "wan3.0-video-prime",
    max_refs: WAN3_MAX_REFERENCE_IMAGES,
    max_video_refs: WAN3_MAX_REFERENCE_VIDEOS,
    max_audio_refs: WAN3_MAX_REFERENCE_AUDIOS,
    promptMaxLength: WAN3_PROMPT_MAX_LENGTH,
    referenceMediaLimits: WAN3_REFERENCE_MEDIA_LIMITS,
    params: wan3Params()
  },
  // Veo3.1 Fast — domestic registration (Beta branding)
  {
    id: "beta-3-1-fast",
    name: "Beta Fast",
    seriesId: "beta",
    publicToken: "beta_fast",
    region: "domestic",
    backend: BACKEND_VEO3,
    model_name: "veo-3.1-fast-generate-001",
    max_refs: 1,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "\u751F\u6210\u65B9\u5F0F",
        options: ["first-last-frame"],
        default: "first-last-frame"
      },
      duration: {
        type: "select",
        label: "\u65F6\u957F",
        options: ["8"],
        default: "8"
      },
      aspect_ratio: {
        type: "select",
        label: "\u6BD4\u4F8B",
        options: ["16:9", "9:16"],
        default: "16:9"
      },
      resolution: {
        type: "select",
        label: "\u5206\u8FA8\u7387",
        options: ["720p", "1080p"],
        default: "720p"
      }
    }
  },
  // Veo3.1 — domestic registration (Beta branding)
  {
    id: "beta-3-1",
    name: "Beta Pro",
    seriesId: "beta",
    publicToken: "beta_pro",
    region: "domestic",
    backend: BACKEND_VEO3,
    model_name: "veo-3.1-generate-001",
    max_refs: 1,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "\u751F\u6210\u65B9\u5F0F",
        options: ["first-last-frame"],
        default: "first-last-frame"
      },
      duration: {
        type: "select",
        label: "\u65F6\u957F",
        options: ["8"],
        default: "8"
      },
      aspect_ratio: {
        type: "select",
        label: "\u6BD4\u4F8B",
        options: ["16:9", "9:16"],
        default: "16:9"
      },
      resolution: {
        type: "select",
        label: "\u5206\u8FA8\u7387",
        options: ["720p", "1080p"],
        default: "720p"
      }
    }
  },
  // Veo3.1 Fast — overseas registration (Veo3.1 branding)
  {
    id: "veo-3.1-fast-generate-001",
    name: "Veo3.1 Fast",
    seriesId: "veo3",
    region: "overseas",
    backend: BACKEND_VEO3,
    model_name: "veo-3.1-fast-generate-001",
    max_refs: 1,
    promptRequired: true,
    params: {
      duration: {
        type: "select",
        label: "\u65F6\u957F",
        options: ["8"],
        default: "8"
      },
      aspect_ratio: {
        type: "select",
        label: "\u6BD4\u4F8B",
        options: ["16:9", "9:16"],
        default: "16:9"
      },
      resolution: {
        type: "select",
        label: "\u5206\u8FA8\u7387",
        options: ["720p", "1080p"],
        default: "720p"
      }
    }
  },
  // Veo3.1 — overseas registration (Veo3.1 branding)
  {
    id: "veo-3.1-generate-001",
    name: "Veo3.1",
    seriesId: "veo3",
    region: "overseas",
    backend: BACKEND_VEO3,
    model_name: "veo-3.1-generate-001",
    max_refs: 1,
    promptRequired: true,
    params: {
      duration: {
        type: "select",
        label: "\u65F6\u957F",
        options: ["8"],
        default: "8"
      },
      aspect_ratio: {
        type: "select",
        label: "\u6BD4\u4F8B",
        options: ["16:9", "9:16"],
        default: "16:9"
      },
      resolution: {
        type: "select",
        label: "\u5206\u8FA8\u7387",
        options: ["720p", "1080p"],
        default: "720p"
      }
    }
  }
];
var TTS_VOICE_OPTIONS = [
  "Friendly_Person",
  "Calm_Woman",
  "Energetic_Male",
  "Professional_Female",
  "Deep_Male",
  "Young_Female"
];
var TTS_SPEED_PRESETS = ["0.5", "0.75", "1", "1.25", "1.5", "1.75", "2"];
var TTS_SPEED_SLIDER = {
  type: "slider",
  label: "\u8BED\u901F",
  min: 0.5,
  max: 2,
  step: 0.25,
  marks: TTS_SPEED_PRESETS,
  default: "1"
};
var TTS_EMOTIONS_BASIC = [
  "calm",
  "happy",
  "sad",
  "angry",
  "fearful",
  "disgusted",
  "surprised",
  "fluent"
];
var TTS_EMOTION_FIELD = {
  type: "select",
  label: "\u60C5\u7EEA",
  options: TTS_EMOTIONS_BASIC,
  default: "",
  optional: true
};
var SEEDAUDIO_SPEED_SLIDER = {
  type: "slider",
  label: "\u8BED\u901F",
  min: 0.5,
  max: 2,
  step: 0.1,
  marks: ["0.5", "1", "1.5", "2"],
  default: "1"
};
var SEEDAUDIO_VOLUME_SLIDER = {
  type: "slider",
  label: "\u97F3\u91CF",
  min: 0.5,
  max: 2,
  step: 0.1,
  marks: ["0.5", "1", "1.5", "2"],
  default: "1"
};
var SEEDAUDIO_PITCH_SLIDER = {
  type: "slider",
  label: "\u97F3\u8C03",
  min: -12,
  max: 12,
  step: 1,
  marks: ["-12", "0", "12"],
  default: "0"
};
var SEEDAUDIO_SAMPLE_RATE_FIELD = {
  type: "select",
  label: "\u91C7\u6837\u7387",
  options: ["8000", "16000", "24000", "32000", "44100", "48000"],
  default: "24000"
};
var AUDIO_MODELS = [
  // MiniMax H3 reference-audio continuation.
  {
    id: "MiniMax-H3 Audio",
    name: "MiniMax H3 Audio",
    seriesId: "MiniMax",
    backend: BACKEND_MINIMAX_V3,
    model_name: "MiniMax-H3 Audio",
    pricingId: "MiniMax-H3-audio-continuation",
    max_refs: 0,
    max_audio_refs: 1,
    promptLabel: "text",
    params: {
      duration: {
        type: "select",
        label: "\u65F6\u957F",
        options: [
          "5",
          "6",
          "7",
          "8",
          "9",
          "10",
          "11",
          "12",
          "13",
          "14",
          "15",
          "16",
          "17",
          "18",
          "19",
          "20"
        ],
        default: "5"
      }
    },
    audioExtension: {
      inputMinDurationSec: 1,
      inputMaxDurationSec: 20,
      outputMinDurationSec: 5,
      outputMaxDurationSec: 20
    }
  },
  // speech-2.8 系列：当前唯一支持的版本，最高保真度
  {
    id: "speech-2.8-hd",
    name: "Speech-2.8-HD",
    seriesId: "official-speech",
    backend: BACKEND_MINIMAX_TTS,
    max_refs: 0,
    promptLabel: "text",
    promptMaxLength: 1e4,
    params: {
      voice_id: {
        type: "select",
        label: "\u97F3\u8272",
        options: TTS_VOICE_OPTIONS,
        default: "Friendly_Person"
      },
      speed: TTS_SPEED_SLIDER,
      emotion: TTS_EMOTION_FIELD
    }
  },
  // SeedAudio 1.0（字节 openspeech seed-audio）
  // - 参考文件：音频 ≤3（wav/mp3/pcm/ogg_opus，≤30s/≤10MB），或图片 1 张
  //   （jpeg/png/webp，≤10MB）；音频与图片不可同时 ref（popover 侧互斥）。
  // - @音频N 逻辑保持：由用户自己在 text 里写引用，前端/网关不自动注入。
  // - Speed / Volume UI 显示 0.5-2 倍，网关侧映射 (x-1)*100 后透传上游
  //   speech_rate / loudness_rate；Pitch / SampleRate 与上游直接对齐。
  {
    id: "seed-audio-1.0",
    name: "Seed Audio 1.0",
    seriesId: "seedaudio",
    backend: BACKEND_SEEDAUDIO,
    model_name: "seed-audio-1.0",
    max_refs: 1,
    // 参考图最多 1 张
    max_audio_refs: 3,
    // 参考音频最多 3 条
    promptLabel: "text",
    promptMaxLength: 3e3,
    params: {
      speed: SEEDAUDIO_SPEED_SLIDER,
      volume: SEEDAUDIO_VOLUME_SLIDER,
      pitch: SEEDAUDIO_PITCH_SLIDER,
      sample_rate: SEEDAUDIO_SAMPLE_RATE_FIELD
    }
  },
  // MiniMax Music
  // Proto carries `model` + `is_instrumental`; local gateway forwards both and
  // Go provider reads them. is_instrumental=true skips lyrics and generates a
  // vocal-free track.
  {
    id: "music-3.0",
    name: "Music-3.0",
    seriesId: "official-music",
    backend: BACKEND_MINIMAX_MUSIC,
    model_name: "music-3.0",
    max_refs: 0,
    promptMaxLength: 2e3,
    params: {
      is_instrumental: {
        type: "select",
        label: "canvas.params.musicMode",
        options: ["vocal", "instrumental"],
        default: "vocal"
      },
      lyrics: {
        type: "textarea",
        label: "\u6B4C\u8BCD",
        placeholder: "\u8F93\u5165\u6B4C\u8BCD,\u4E0D\u586B\u5219\u4F7F\u7528\u4E0A\u65B9\u63CF\u8FF0\u4F5C\u4E3A\u6B4C\u8BCD",
        default: ""
      }
    }
  },
  // ElevenLabs Music v2 — prompt-only song generation.
  {
    id: "elevenlabs-music-v2",
    name: "ElevenLabs Music v2",
    seriesId: "elevenlabs-music",
    backend: BACKEND_ELEVENLABS_MUSIC,
    model_name: "music_v2",
    max_refs: 0,
    promptLabel: "musicStyle",
    promptMaxLength: 2e3,
    params: {
      music_length_ms: {
        type: "select",
        label: "canvas.params.duration",
        options: ["auto", "30s", "1m", "2m", "4m", "6m", "custom"],
        default: "auto"
      },
      is_instrumental: {
        type: "select",
        label: "canvas.params.musicMode",
        options: ["auto", "instrumental"],
        default: "auto"
      }
    }
  }
];
var SPEECH_MODELS = AUDIO_MODELS.filter((m) => m.backend === BACKEND_MINIMAX_TTS || m.backend === BACKEND_SEEDAUDIO || m.backend === BACKEND_MINIMAX_V3 && !!m.audioExtension);
var MUSIC_MODELS = AUDIO_MODELS.filter((m) => m.backend === BACKEND_MINIMAX_MUSIC || m.backend === BACKEND_ELEVENLABS_MUSIC);

// ../protocol/dist/node-packages.js
var NODE_PACKAGES_ENSURE_TIMEOUT_MS = 10 * 6e4;

// ../protocol/dist/opencode-runtime-contract.js
var OPENCODE_RUNTIME_HOME_ENV = "OPENCODE_TEST_HOME";
var OPENCODE_RUNTIME_SWITCHES = [
  {
    key: "OPENCODE_DISABLE_PROJECT_CONFIG",
    value: "1",
    why: "Project trees are user content, not agent configuration. Without this, OpenCode walks up from the project dir collecting `.opencode` dirs and treats each as a config source (and an npm install target)."
  },
  {
    key: "OPENCODE_DISABLE_CLAUDE_CODE",
    value: "1",
    why: "Hub ships its own agent profile; Claude Code interop would inject a second, unversioned prompt surface."
  },
  {
    key: "OPENCODE_DISABLE_EXTERNAL_SKILLS",
    value: "1",
    why: "Skills are resolved through Hub skill paths (`@hilo/protocol/skill-paths`), not through OpenCode discovery."
  },
  {
    key: "OPENCODE_LOG_LEVEL",
    value: "INFO",
    why: "Without an explicit level OpenCode writes a ZERO-BYTE log file, so its own diagnostics \u2014 including `background dependency install failed`, which names the exact directory and cause \u2014 are discarded. That gap is why the four-hour freeze had to be root-caused by disassembling the binary instead of reading a log. Verbose debugging is unaffected: the `--log-level` CLI flag is applied by OpenCode after the env var and still wins."
  }
];
var OPENCODE_RUNTIME_ENV_KEYS = [
  ...OPENCODE_RUNTIME_SWITCHES.map(({ key }) => key),
  OPENCODE_RUNTIME_HOME_ENV
];

// ../protocol/dist/perf.js
var PERF_PATCH_DELTA = "hilo:chat:patch-delta";
var PERF_REDERIVE = "hilo:chat:rederive";
var PERF_DERIVE_MESSAGES = "hilo:chat:derive-messages";
var PERF_STORE_NOTIFY = "hilo:chat:store-notify";
var PERF_CHAT_FIRST_PROGRESS = "hilo:chat:first-progress";
var PERF_LOG_FLUSH = "hilo:log:flush";
var PERF_ASSET_PICKER_OPEN_FIRST_PAINT = "hilo:asset-picker:open-first-paint";
var PERF_ASSET_PICKER_OPEN_INTERACTIVE = "hilo:asset-picker:open-interactive";
var PERF_CANVAS_PERSIST_BUILD = "hilo:canvas:persist-build";
var PERF_CANVAS_PERSIST_QUEUE = "hilo:canvas:persist-save-queue";
var PERF_CANVAS_PERSIST_HTTP_ROUNDTRIP = "hilo:canvas:persist-http-roundtrip";
var PERF_CANVAS_PERSIST_SAVE = "hilo:canvas:persist-save";
var PERF_SLOW_THRESHOLDS = {
  [PERF_PATCH_DELTA]: 5,
  [PERF_REDERIVE]: 10,
  [PERF_DERIVE_MESSAGES]: 8,
  [PERF_STORE_NOTIFY]: 5,
  // Budget P95 (暂定) from performance-budget.md — entries above this are
  // over-budget occurrences, logged for visibility (no gate).
  [PERF_CHAT_FIRST_PROGRESS]: 1e4,
  [PERF_LOG_FLUSH]: 100,
  [PERF_ASSET_PICKER_OPEN_FIRST_PAINT]: 250,
  [PERF_ASSET_PICKER_OPEN_INTERACTIVE]: 500,
  [PERF_CANVAS_PERSIST_BUILD]: 50,
  [PERF_CANVAS_PERSIST_QUEUE]: 10,
  [PERF_CANVAS_PERSIST_HTTP_ROUNDTRIP]: 3e3,
  [PERF_CANVAS_PERSIST_SAVE]: 3e3
};

// ../protocol/dist/python-packages.js
var PYTHON_PACKAGES_ENSURE_TIMEOUT_MS = 10 * 6e4;

// ../protocol/dist/skill-detail.js
function normalizeSkillContentLocale(value) {
  return typeof value === "string" && value.toLowerCase().startsWith("en") ? "en-US" : "zh-CN";
}
__name(normalizeSkillContentLocale, "normalizeSkillContentLocale");

// ../../../node_modules/.pnpm/js-yaml@4.3.2/node_modules/js-yaml/dist/js-yaml.mjs
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
__name(getDefaultExportFromCjs, "getDefaultExportFromCjs");
var jsYaml = {};
var loader = {};
var common = {};
var hasRequiredCommon;
function requireCommon() {
  if (hasRequiredCommon) return common;
  hasRequiredCommon = 1;
  function isNothing(subject) {
    return typeof subject === "undefined" || subject === null;
  }
  __name(isNothing, "isNothing");
  function isObject(subject) {
    return typeof subject === "object" && subject !== null;
  }
  __name(isObject, "isObject");
  function toArray(sequence) {
    if (Array.isArray(sequence)) return sequence;
    else if (isNothing(sequence)) return [];
    return [sequence];
  }
  __name(toArray, "toArray");
  function extend(target, source) {
    if (source) {
      const sourceKeys = Object.keys(source);
      for (let index = 0, length = sourceKeys.length; index < length; index += 1) {
        const key = sourceKeys[index];
        target[key] = source[key];
      }
    }
    return target;
  }
  __name(extend, "extend");
  function repeat(string, count) {
    let result = "";
    for (let cycle = 0; cycle < count; cycle += 1) {
      result += string;
    }
    return result;
  }
  __name(repeat, "repeat");
  function isNegativeZero(number) {
    return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
  }
  __name(isNegativeZero, "isNegativeZero");
  common.isNothing = isNothing;
  common.isObject = isObject;
  common.toArray = toArray;
  common.repeat = repeat;
  common.isNegativeZero = isNegativeZero;
  common.extend = extend;
  return common;
}
__name(requireCommon, "requireCommon");
var exception;
var hasRequiredException;
function requireException() {
  if (hasRequiredException) return exception;
  hasRequiredException = 1;
  function formatError(exception2, compact) {
    let where = "";
    const message = exception2.reason || "(unknown reason)";
    if (!exception2.mark) return message;
    if (exception2.mark.name) {
      where += 'in "' + exception2.mark.name + '" ';
    }
    where += "(" + (exception2.mark.line + 1) + ":" + (exception2.mark.column + 1) + ")";
    if (!compact && exception2.mark.snippet) {
      where += "\n\n" + exception2.mark.snippet;
    }
    return message + " " + where;
  }
  __name(formatError, "formatError");
  function YAMLException2(reason, mark) {
    Error.call(this);
    this.name = "YAMLException";
    this.reason = reason;
    this.mark = mark;
    this.message = formatError(this, false);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error().stack || "";
    }
  }
  __name(YAMLException2, "YAMLException2");
  YAMLException2.prototype = Object.create(Error.prototype);
  YAMLException2.prototype.constructor = YAMLException2;
  YAMLException2.prototype.toString = /* @__PURE__ */ __name(function toString(compact) {
    return this.name + ": " + formatError(this, compact);
  }, "toString");
  exception = YAMLException2;
  return exception;
}
__name(requireException, "requireException");
var snippet;
var hasRequiredSnippet;
function requireSnippet() {
  if (hasRequiredSnippet) return snippet;
  hasRequiredSnippet = 1;
  const common2 = requireCommon();
  function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
    let head = "";
    let tail = "";
    const maxHalfLength = Math.floor(maxLineLength / 2) - 1;
    if (position - lineStart > maxHalfLength) {
      head = " ... ";
      lineStart = position - maxHalfLength + head.length;
    }
    if (lineEnd - position > maxHalfLength) {
      tail = " ...";
      lineEnd = position + maxHalfLength - tail.length;
    }
    return {
      str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
      pos: position - lineStart + head.length
      // relative position
    };
  }
  __name(getLine, "getLine");
  function padStart(string, max) {
    return common2.repeat(" ", max - string.length) + string;
  }
  __name(padStart, "padStart");
  function makeSnippet(mark, options) {
    options = Object.create(options || null);
    if (!mark.buffer) return null;
    if (!options.maxLength) options.maxLength = 79;
    if (typeof options.indent !== "number") options.indent = 1;
    if (typeof options.linesBefore !== "number") options.linesBefore = 3;
    if (typeof options.linesAfter !== "number") options.linesAfter = 2;
    const re = /\r?\n|\r|\0/g;
    const lineStarts = [0];
    const lineEnds = [];
    let match;
    let foundLineNo = -1;
    while (match = re.exec(mark.buffer)) {
      lineEnds.push(match.index);
      lineStarts.push(match.index + match[0].length);
      if (mark.position <= match.index && foundLineNo < 0) {
        foundLineNo = lineStarts.length - 2;
      }
    }
    if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
    let result = "";
    const lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
    const maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
    for (let i = 1; i <= options.linesBefore; i++) {
      if (foundLineNo - i < 0) break;
      const line2 = getLine(
        mark.buffer,
        lineStarts[foundLineNo - i],
        lineEnds[foundLineNo - i],
        mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
        maxLineLength
      );
      result = common2.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line2.str + "\n" + result;
    }
    const line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
    result += common2.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
    result += common2.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
    for (let i = 1; i <= options.linesAfter; i++) {
      if (foundLineNo + i >= lineEnds.length) break;
      const line2 = getLine(
        mark.buffer,
        lineStarts[foundLineNo + i],
        lineEnds[foundLineNo + i],
        mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
        maxLineLength
      );
      result += common2.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line2.str + "\n";
    }
    return result.replace(/\n$/, "");
  }
  __name(makeSnippet, "makeSnippet");
  snippet = makeSnippet;
  return snippet;
}
__name(requireSnippet, "requireSnippet");
var type;
var hasRequiredType;
function requireType() {
  if (hasRequiredType) return type;
  hasRequiredType = 1;
  const YAMLException2 = requireException();
  const TYPE_CONSTRUCTOR_OPTIONS = [
    "kind",
    "multi",
    "resolve",
    "construct",
    "instanceOf",
    "predicate",
    "represent",
    "representName",
    "defaultStyle",
    "styleAliases"
  ];
  const YAML_NODE_KINDS = [
    "scalar",
    "sequence",
    "mapping"
  ];
  function compileStyleAliases(map2) {
    const result = {};
    if (map2 !== null) {
      Object.keys(map2).forEach(function(style) {
        map2[style].forEach(function(alias) {
          result[String(alias)] = style;
        });
      });
    }
    return result;
  }
  __name(compileStyleAliases, "compileStyleAliases");
  function Type2(tag, options) {
    options = options || {};
    Object.keys(options).forEach(function(name) {
      if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
        throw new YAMLException2('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
      }
    });
    this.options = options;
    this.tag = tag;
    this.kind = options["kind"] || null;
    this.resolve = options["resolve"] || function() {
      return true;
    };
    this.construct = options["construct"] || function(data) {
      return data;
    };
    this.instanceOf = options["instanceOf"] || null;
    this.predicate = options["predicate"] || null;
    this.represent = options["represent"] || null;
    this.representName = options["representName"] || null;
    this.defaultStyle = options["defaultStyle"] || null;
    this.multi = options["multi"] || false;
    this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
    if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
      throw new YAMLException2('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
    }
  }
  __name(Type2, "Type2");
  type = Type2;
  return type;
}
__name(requireType, "requireType");
var schema;
var hasRequiredSchema;
function requireSchema() {
  if (hasRequiredSchema) return schema;
  hasRequiredSchema = 1;
  const YAMLException2 = requireException();
  const Type2 = requireType();
  function compileList(schema2, name) {
    const result = [];
    schema2[name].forEach(function(currentType) {
      let newIndex = result.length;
      result.forEach(function(previousType, previousIndex) {
        if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
          newIndex = previousIndex;
        }
      });
      result[newIndex] = currentType;
    });
    return result;
  }
  __name(compileList, "compileList");
  function compileMap() {
    const result = {
      scalar: {},
      sequence: {},
      mapping: {},
      fallback: {},
      multi: {
        scalar: [],
        sequence: [],
        mapping: [],
        fallback: []
      }
    };
    function collectType(type2) {
      if (type2.multi) {
        result.multi[type2.kind].push(type2);
        result.multi["fallback"].push(type2);
      } else {
        result[type2.kind][type2.tag] = result["fallback"][type2.tag] = type2;
      }
    }
    __name(collectType, "collectType");
    for (let index = 0, length = arguments.length; index < length; index += 1) {
      arguments[index].forEach(collectType);
    }
    return result;
  }
  __name(compileMap, "compileMap");
  function Schema2(definition) {
    return this.extend(definition);
  }
  __name(Schema2, "Schema2");
  Schema2.prototype.extend = /* @__PURE__ */ __name(function extend(definition) {
    let implicit = [];
    let explicit = [];
    if (definition instanceof Type2) {
      explicit.push(definition);
    } else if (Array.isArray(definition)) {
      explicit = explicit.concat(definition);
    } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
      if (definition.implicit) implicit = implicit.concat(definition.implicit);
      if (definition.explicit) explicit = explicit.concat(definition.explicit);
    } else {
      throw new YAMLException2("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
    }
    implicit.forEach(function(type2) {
      if (!(type2 instanceof Type2)) {
        throw new YAMLException2("Specified list of YAML types (or a single Type object) contains a non-Type object.");
      }
      if (type2.loadKind && type2.loadKind !== "scalar") {
        throw new YAMLException2("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
      }
      if (type2.multi) {
        throw new YAMLException2("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
      }
    });
    explicit.forEach(function(type2) {
      if (!(type2 instanceof Type2)) {
        throw new YAMLException2("Specified list of YAML types (or a single Type object) contains a non-Type object.");
      }
    });
    const result = Object.create(Schema2.prototype);
    result.implicit = (this.implicit || []).concat(implicit);
    result.explicit = (this.explicit || []).concat(explicit);
    result.compiledImplicit = compileList(result, "implicit");
    result.compiledExplicit = compileList(result, "explicit");
    result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
    return result;
  }, "extend");
  schema = Schema2;
  return schema;
}
__name(requireSchema, "requireSchema");
var str;
var hasRequiredStr;
function requireStr() {
  if (hasRequiredStr) return str;
  hasRequiredStr = 1;
  const Type2 = requireType();
  str = new Type2("tag:yaml.org,2002:str", {
    kind: "scalar",
    construct: /* @__PURE__ */ __name(function(data) {
      return data !== null ? data : "";
    }, "construct")
  });
  return str;
}
__name(requireStr, "requireStr");
var seq;
var hasRequiredSeq;
function requireSeq() {
  if (hasRequiredSeq) return seq;
  hasRequiredSeq = 1;
  const Type2 = requireType();
  seq = new Type2("tag:yaml.org,2002:seq", {
    kind: "sequence",
    construct: /* @__PURE__ */ __name(function(data) {
      return data !== null ? data : [];
    }, "construct")
  });
  return seq;
}
__name(requireSeq, "requireSeq");
var map;
var hasRequiredMap;
function requireMap() {
  if (hasRequiredMap) return map;
  hasRequiredMap = 1;
  const Type2 = requireType();
  map = new Type2("tag:yaml.org,2002:map", {
    kind: "mapping",
    construct: /* @__PURE__ */ __name(function(data) {
      return data !== null ? data : {};
    }, "construct")
  });
  return map;
}
__name(requireMap, "requireMap");
var failsafe;
var hasRequiredFailsafe;
function requireFailsafe() {
  if (hasRequiredFailsafe) return failsafe;
  hasRequiredFailsafe = 1;
  const Schema2 = requireSchema();
  failsafe = new Schema2({
    explicit: [
      requireStr(),
      requireSeq(),
      requireMap()
    ]
  });
  return failsafe;
}
__name(requireFailsafe, "requireFailsafe");
var _null;
var hasRequired_null;
function require_null() {
  if (hasRequired_null) return _null;
  hasRequired_null = 1;
  const Type2 = requireType();
  function resolveYamlNull(data) {
    if (data === null) return true;
    const max = data.length;
    return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
  }
  __name(resolveYamlNull, "resolveYamlNull");
  function constructYamlNull() {
    return null;
  }
  __name(constructYamlNull, "constructYamlNull");
  function isNull(object) {
    return object === null;
  }
  __name(isNull, "isNull");
  _null = new Type2("tag:yaml.org,2002:null", {
    kind: "scalar",
    resolve: resolveYamlNull,
    construct: constructYamlNull,
    predicate: isNull,
    represent: {
      canonical: /* @__PURE__ */ __name(function() {
        return "~";
      }, "canonical"),
      lowercase: /* @__PURE__ */ __name(function() {
        return "null";
      }, "lowercase"),
      uppercase: /* @__PURE__ */ __name(function() {
        return "NULL";
      }, "uppercase"),
      camelcase: /* @__PURE__ */ __name(function() {
        return "Null";
      }, "camelcase"),
      empty: /* @__PURE__ */ __name(function() {
        return "";
      }, "empty")
    },
    defaultStyle: "lowercase"
  });
  return _null;
}
__name(require_null, "require_null");
var bool;
var hasRequiredBool;
function requireBool() {
  if (hasRequiredBool) return bool;
  hasRequiredBool = 1;
  const Type2 = requireType();
  function resolveYamlBoolean(data) {
    if (data === null) return false;
    const max = data.length;
    return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
  }
  __name(resolveYamlBoolean, "resolveYamlBoolean");
  function constructYamlBoolean(data) {
    return data === "true" || data === "True" || data === "TRUE";
  }
  __name(constructYamlBoolean, "constructYamlBoolean");
  function isBoolean(object) {
    return Object.prototype.toString.call(object) === "[object Boolean]";
  }
  __name(isBoolean, "isBoolean");
  bool = new Type2("tag:yaml.org,2002:bool", {
    kind: "scalar",
    resolve: resolveYamlBoolean,
    construct: constructYamlBoolean,
    predicate: isBoolean,
    represent: {
      lowercase: /* @__PURE__ */ __name(function(object) {
        return object ? "true" : "false";
      }, "lowercase"),
      uppercase: /* @__PURE__ */ __name(function(object) {
        return object ? "TRUE" : "FALSE";
      }, "uppercase"),
      camelcase: /* @__PURE__ */ __name(function(object) {
        return object ? "True" : "False";
      }, "camelcase")
    },
    defaultStyle: "lowercase"
  });
  return bool;
}
__name(requireBool, "requireBool");
var int;
var hasRequiredInt;
function requireInt() {
  if (hasRequiredInt) return int;
  hasRequiredInt = 1;
  const common2 = requireCommon();
  const Type2 = requireType();
  function isHexCode(c) {
    return c >= 48 && c <= 57 || c >= 65 && c <= 70 || c >= 97 && c <= 102;
  }
  __name(isHexCode, "isHexCode");
  function isOctCode(c) {
    return c >= 48 && c <= 55;
  }
  __name(isOctCode, "isOctCode");
  function isDecCode(c) {
    return c >= 48 && c <= 57;
  }
  __name(isDecCode, "isDecCode");
  function resolveYamlInteger(data) {
    if (data === null) return false;
    const max = data.length;
    let index = 0;
    let hasDigits = false;
    if (!max) return false;
    let ch = data[index];
    if (ch === "-" || ch === "+") {
      ch = data[++index];
    }
    if (ch === "0") {
      if (index + 1 === max) return true;
      ch = data[++index];
      if (ch === "b") {
        index++;
        for (; index < max; index++) {
          ch = data[index];
          if (ch !== "0" && ch !== "1") return false;
          hasDigits = true;
        }
        return hasDigits && isFinite(parseYamlInteger(data));
      }
      if (ch === "x") {
        index++;
        for (; index < max; index++) {
          if (!isHexCode(data.charCodeAt(index))) return false;
          hasDigits = true;
        }
        return hasDigits && isFinite(parseYamlInteger(data));
      }
      if (ch === "o") {
        index++;
        for (; index < max; index++) {
          if (!isOctCode(data.charCodeAt(index))) return false;
          hasDigits = true;
        }
        return hasDigits && isFinite(parseYamlInteger(data));
      }
    }
    for (; index < max; index++) {
      if (!isDecCode(data.charCodeAt(index))) {
        return false;
      }
      hasDigits = true;
    }
    if (!hasDigits) return false;
    return isFinite(parseYamlInteger(data));
  }
  __name(resolveYamlInteger, "resolveYamlInteger");
  function parseYamlInteger(data) {
    let value = data;
    let sign = 1;
    let ch = value[0];
    if (ch === "-" || ch === "+") {
      if (ch === "-") sign = -1;
      value = value.slice(1);
      ch = value[0];
    }
    if (value === "0") return 0;
    if (ch === "0") {
      if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
      if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
      if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
    }
    return sign * parseInt(value, 10);
  }
  __name(parseYamlInteger, "parseYamlInteger");
  function constructYamlInteger(data) {
    return parseYamlInteger(data);
  }
  __name(constructYamlInteger, "constructYamlInteger");
  function isInteger(object) {
    return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common2.isNegativeZero(object));
  }
  __name(isInteger, "isInteger");
  int = new Type2("tag:yaml.org,2002:int", {
    kind: "scalar",
    resolve: resolveYamlInteger,
    construct: constructYamlInteger,
    predicate: isInteger,
    represent: {
      binary: /* @__PURE__ */ __name(function(obj) {
        return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
      }, "binary"),
      octal: /* @__PURE__ */ __name(function(obj) {
        return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
      }, "octal"),
      decimal: /* @__PURE__ */ __name(function(obj) {
        return obj.toString(10);
      }, "decimal"),
      hexadecimal: /* @__PURE__ */ __name(function(obj) {
        return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
      }, "hexadecimal")
    },
    defaultStyle: "decimal",
    styleAliases: {
      binary: [2, "bin"],
      octal: [8, "oct"],
      decimal: [10, "dec"],
      hexadecimal: [16, "hex"]
    }
  });
  return int;
}
__name(requireInt, "requireInt");
var float;
var hasRequiredFloat;
function requireFloat() {
  if (hasRequiredFloat) return float;
  hasRequiredFloat = 1;
  const common2 = requireCommon();
  const Type2 = requireType();
  const YAML_FLOAT_PATTERN = new RegExp(
    // 2.5e4, 2.5 and integers
    "^(?:[-+]?(?:[0-9]+)(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
  );
  const YAML_FLOAT_SPECIAL_PATTERN = new RegExp(
    "^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
  );
  function resolveYamlFloat(data) {
    if (data === null) return false;
    if (!YAML_FLOAT_PATTERN.test(data)) {
      return false;
    }
    if (isFinite(parseFloat(data, 10))) {
      return true;
    }
    return YAML_FLOAT_SPECIAL_PATTERN.test(data);
  }
  __name(resolveYamlFloat, "resolveYamlFloat");
  function constructYamlFloat(data) {
    let value = data.toLowerCase();
    const sign = value[0] === "-" ? -1 : 1;
    if ("+-".indexOf(value[0]) >= 0) {
      value = value.slice(1);
    }
    if (value === ".inf") {
      return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    } else if (value === ".nan") {
      return NaN;
    }
    return sign * parseFloat(value, 10);
  }
  __name(constructYamlFloat, "constructYamlFloat");
  const SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
  function representYamlFloat(object, style) {
    if (isNaN(object)) {
      switch (style) {
        case "lowercase":
          return ".nan";
        case "uppercase":
          return ".NAN";
        case "camelcase":
          return ".NaN";
      }
    } else if (Number.POSITIVE_INFINITY === object) {
      switch (style) {
        case "lowercase":
          return ".inf";
        case "uppercase":
          return ".INF";
        case "camelcase":
          return ".Inf";
      }
    } else if (Number.NEGATIVE_INFINITY === object) {
      switch (style) {
        case "lowercase":
          return "-.inf";
        case "uppercase":
          return "-.INF";
        case "camelcase":
          return "-.Inf";
      }
    } else if (common2.isNegativeZero(object)) {
      return "-0.0";
    }
    const res = object.toString(10);
    return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
  }
  __name(representYamlFloat, "representYamlFloat");
  function isFloat(object) {
    return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common2.isNegativeZero(object));
  }
  __name(isFloat, "isFloat");
  float = new Type2("tag:yaml.org,2002:float", {
    kind: "scalar",
    resolve: resolveYamlFloat,
    construct: constructYamlFloat,
    predicate: isFloat,
    represent: representYamlFloat,
    defaultStyle: "lowercase"
  });
  return float;
}
__name(requireFloat, "requireFloat");
var json;
var hasRequiredJson;
function requireJson() {
  if (hasRequiredJson) return json;
  hasRequiredJson = 1;
  json = requireFailsafe().extend({
    implicit: [
      require_null(),
      requireBool(),
      requireInt(),
      requireFloat()
    ]
  });
  return json;
}
__name(requireJson, "requireJson");
var core;
var hasRequiredCore;
function requireCore() {
  if (hasRequiredCore) return core;
  hasRequiredCore = 1;
  core = requireJson();
  return core;
}
__name(requireCore, "requireCore");
var timestamp;
var hasRequiredTimestamp;
function requireTimestamp() {
  if (hasRequiredTimestamp) return timestamp;
  hasRequiredTimestamp = 1;
  const Type2 = requireType();
  const YAML_DATE_REGEXP = new RegExp(
    "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
  );
  const YAML_TIMESTAMP_REGEXP = new RegExp(
    "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
  );
  function resolveYamlTimestamp(data) {
    if (data === null) return false;
    if (YAML_DATE_REGEXP.exec(data) !== null) return true;
    if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
    return false;
  }
  __name(resolveYamlTimestamp, "resolveYamlTimestamp");
  function constructYamlTimestamp(data) {
    let fraction = 0;
    let delta = null;
    let match = YAML_DATE_REGEXP.exec(data);
    if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
    if (match === null) throw new Error("Date resolve error");
    const year = +match[1];
    const month = +match[2] - 1;
    const day = +match[3];
    if (!match[4]) {
      return new Date(Date.UTC(year, month, day));
    }
    const hour = +match[4];
    const minute = +match[5];
    const second = +match[6];
    if (match[7]) {
      fraction = match[7].slice(0, 3);
      while (fraction.length < 3) {
        fraction += "0";
      }
      fraction = +fraction;
    }
    if (match[9]) {
      const tzHour = +match[10];
      const tzMinute = +(match[11] || 0);
      delta = (tzHour * 60 + tzMinute) * 6e4;
      if (match[9] === "-") delta = -delta;
    }
    const date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
    if (delta) date.setTime(date.getTime() - delta);
    return date;
  }
  __name(constructYamlTimestamp, "constructYamlTimestamp");
  function representYamlTimestamp(object) {
    return object.toISOString();
  }
  __name(representYamlTimestamp, "representYamlTimestamp");
  timestamp = new Type2("tag:yaml.org,2002:timestamp", {
    kind: "scalar",
    resolve: resolveYamlTimestamp,
    construct: constructYamlTimestamp,
    instanceOf: Date,
    represent: representYamlTimestamp
  });
  return timestamp;
}
__name(requireTimestamp, "requireTimestamp");
var merge;
var hasRequiredMerge;
function requireMerge() {
  if (hasRequiredMerge) return merge;
  hasRequiredMerge = 1;
  const Type2 = requireType();
  function resolveYamlMerge(data) {
    return data === "<<" || data === null;
  }
  __name(resolveYamlMerge, "resolveYamlMerge");
  merge = new Type2("tag:yaml.org,2002:merge", {
    kind: "scalar",
    resolve: resolveYamlMerge
  });
  return merge;
}
__name(requireMerge, "requireMerge");
var binary;
var hasRequiredBinary;
function requireBinary() {
  if (hasRequiredBinary) return binary;
  hasRequiredBinary = 1;
  const Type2 = requireType();
  const BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
  function resolveYamlBinary(data) {
    if (data === null) return false;
    let bitlen = 0;
    const max = data.length;
    const map2 = BASE64_MAP;
    for (let idx = 0; idx < max; idx++) {
      const code = map2.indexOf(data.charAt(idx));
      if (code > 64) continue;
      if (code < 0) return false;
      bitlen += 6;
    }
    return bitlen % 8 === 0;
  }
  __name(resolveYamlBinary, "resolveYamlBinary");
  function constructYamlBinary(data) {
    const input = data.replace(/[\r\n=]/g, "");
    const max = input.length;
    const map2 = BASE64_MAP;
    let bits = 0;
    const result = [];
    for (let idx = 0; idx < max; idx++) {
      if (idx % 4 === 0 && idx) {
        result.push(bits >> 16 & 255);
        result.push(bits >> 8 & 255);
        result.push(bits & 255);
      }
      bits = bits << 6 | map2.indexOf(input.charAt(idx));
    }
    const tailbits = max % 4 * 6;
    if (tailbits === 0) {
      result.push(bits >> 16 & 255);
      result.push(bits >> 8 & 255);
      result.push(bits & 255);
    } else if (tailbits === 18) {
      result.push(bits >> 10 & 255);
      result.push(bits >> 2 & 255);
    } else if (tailbits === 12) {
      result.push(bits >> 4 & 255);
    }
    return new Uint8Array(result);
  }
  __name(constructYamlBinary, "constructYamlBinary");
  function representYamlBinary(object) {
    let result = "";
    let bits = 0;
    const max = object.length;
    const map2 = BASE64_MAP;
    for (let idx = 0; idx < max; idx++) {
      if (idx % 3 === 0 && idx) {
        result += map2[bits >> 18 & 63];
        result += map2[bits >> 12 & 63];
        result += map2[bits >> 6 & 63];
        result += map2[bits & 63];
      }
      bits = (bits << 8) + object[idx];
    }
    const tail = max % 3;
    if (tail === 0) {
      result += map2[bits >> 18 & 63];
      result += map2[bits >> 12 & 63];
      result += map2[bits >> 6 & 63];
      result += map2[bits & 63];
    } else if (tail === 2) {
      result += map2[bits >> 10 & 63];
      result += map2[bits >> 4 & 63];
      result += map2[bits << 2 & 63];
      result += map2[64];
    } else if (tail === 1) {
      result += map2[bits >> 2 & 63];
      result += map2[bits << 4 & 63];
      result += map2[64];
      result += map2[64];
    }
    return result;
  }
  __name(representYamlBinary, "representYamlBinary");
  function isBinary(obj) {
    return Object.prototype.toString.call(obj) === "[object Uint8Array]";
  }
  __name(isBinary, "isBinary");
  binary = new Type2("tag:yaml.org,2002:binary", {
    kind: "scalar",
    resolve: resolveYamlBinary,
    construct: constructYamlBinary,
    predicate: isBinary,
    represent: representYamlBinary
  });
  return binary;
}
__name(requireBinary, "requireBinary");
var omap;
var hasRequiredOmap;
function requireOmap() {
  if (hasRequiredOmap) return omap;
  hasRequiredOmap = 1;
  const Type2 = requireType();
  const _hasOwnProperty = Object.prototype.hasOwnProperty;
  const _toString = Object.prototype.toString;
  function resolveYamlOmap(data) {
    if (data === null) return true;
    const objectKeys = {};
    const object = data;
    for (let index = 0, length = object.length; index < length; index += 1) {
      const pair = object[index];
      let pairHasKey = false;
      if (_toString.call(pair) !== "[object Object]") return false;
      let pairKey;
      for (pairKey in pair) {
        if (_hasOwnProperty.call(pair, pairKey)) {
          if (!pairHasKey) pairHasKey = true;
          else return false;
        }
      }
      if (!pairHasKey) return false;
      if (_hasOwnProperty.call(objectKeys, pairKey)) return false;
      Object.defineProperty(objectKeys, pairKey, { value: true });
    }
    return true;
  }
  __name(resolveYamlOmap, "resolveYamlOmap");
  function constructYamlOmap(data) {
    return data !== null ? data : [];
  }
  __name(constructYamlOmap, "constructYamlOmap");
  omap = new Type2("tag:yaml.org,2002:omap", {
    kind: "sequence",
    resolve: resolveYamlOmap,
    construct: constructYamlOmap
  });
  return omap;
}
__name(requireOmap, "requireOmap");
var pairs;
var hasRequiredPairs;
function requirePairs() {
  if (hasRequiredPairs) return pairs;
  hasRequiredPairs = 1;
  const Type2 = requireType();
  const _toString = Object.prototype.toString;
  function resolveYamlPairs(data) {
    if (data === null) return true;
    const object = data;
    const result = new Array(object.length);
    for (let index = 0, length = object.length; index < length; index += 1) {
      const pair = object[index];
      if (_toString.call(pair) !== "[object Object]") return false;
      const keys = Object.keys(pair);
      if (keys.length !== 1) return false;
      result[index] = [keys[0], pair[keys[0]]];
    }
    return true;
  }
  __name(resolveYamlPairs, "resolveYamlPairs");
  function constructYamlPairs(data) {
    if (data === null) return [];
    const object = data;
    const result = new Array(object.length);
    for (let index = 0, length = object.length; index < length; index += 1) {
      const pair = object[index];
      const keys = Object.keys(pair);
      result[index] = [keys[0], pair[keys[0]]];
    }
    return result;
  }
  __name(constructYamlPairs, "constructYamlPairs");
  pairs = new Type2("tag:yaml.org,2002:pairs", {
    kind: "sequence",
    resolve: resolveYamlPairs,
    construct: constructYamlPairs
  });
  return pairs;
}
__name(requirePairs, "requirePairs");
var set;
var hasRequiredSet;
function requireSet() {
  if (hasRequiredSet) return set;
  hasRequiredSet = 1;
  const Type2 = requireType();
  const _hasOwnProperty = Object.prototype.hasOwnProperty;
  function resolveYamlSet(data) {
    if (data === null) return true;
    const object = data;
    for (const key in object) {
      if (_hasOwnProperty.call(object, key)) {
        if (object[key] !== null) return false;
      }
    }
    return true;
  }
  __name(resolveYamlSet, "resolveYamlSet");
  function constructYamlSet(data) {
    return data !== null ? data : {};
  }
  __name(constructYamlSet, "constructYamlSet");
  set = new Type2("tag:yaml.org,2002:set", {
    kind: "mapping",
    resolve: resolveYamlSet,
    construct: constructYamlSet
  });
  return set;
}
__name(requireSet, "requireSet");
var _default;
var hasRequired_default;
function require_default() {
  if (hasRequired_default) return _default;
  hasRequired_default = 1;
  _default = requireCore().extend({
    implicit: [
      requireTimestamp(),
      requireMerge()
    ],
    explicit: [
      requireBinary(),
      requireOmap(),
      requirePairs(),
      requireSet()
    ]
  });
  return _default;
}
__name(require_default, "require_default");
var hasRequiredLoader;
function requireLoader() {
  if (hasRequiredLoader) return loader;
  hasRequiredLoader = 1;
  const common2 = requireCommon();
  const YAMLException2 = requireException();
  const makeSnippet = requireSnippet();
  const DEFAULT_SCHEMA2 = require_default();
  const _hasOwnProperty = Object.prototype.hasOwnProperty;
  const CONTEXT_FLOW_IN = 1;
  const CONTEXT_FLOW_OUT = 2;
  const CONTEXT_BLOCK_IN = 3;
  const CONTEXT_BLOCK_OUT = 4;
  const CHOMPING_CLIP = 1;
  const CHOMPING_STRIP = 2;
  const CHOMPING_KEEP = 3;
  const PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
  const PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
  const PATTERN_FLOW_INDICATORS = /[,\[\]{}]/;
  const PATTERN_TAG_HANDLE = /^(?:!|!!|![0-9A-Za-z-]+!)$/;
  const PATTERN_TAG_URI = /^(?:!|[^,\[\]{}])(?:%[0-9a-f]{2}|[0-9a-z\-#;/?:@&=+$,_.!~*'()\[\]])*$/i;
  function _class(obj) {
    return Object.prototype.toString.call(obj);
  }
  __name(_class, "_class");
  function isEol(c) {
    return c === 10 || c === 13;
  }
  __name(isEol, "isEol");
  function isWhiteSpace(c) {
    return c === 9 || c === 32;
  }
  __name(isWhiteSpace, "isWhiteSpace");
  function isWsOrEol(c) {
    return c === 9 || c === 32 || c === 10 || c === 13;
  }
  __name(isWsOrEol, "isWsOrEol");
  function isFlowIndicator(c) {
    return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
  }
  __name(isFlowIndicator, "isFlowIndicator");
  function fromHexCode(c) {
    if (c >= 48 && c <= 57) {
      return c - 48;
    }
    const lc = c | 32;
    if (lc >= 97 && lc <= 102) {
      return lc - 97 + 10;
    }
    return -1;
  }
  __name(fromHexCode, "fromHexCode");
  function escapedHexLen(c) {
    if (c === 120) {
      return 2;
    }
    if (c === 117) {
      return 4;
    }
    if (c === 85) {
      return 8;
    }
    return 0;
  }
  __name(escapedHexLen, "escapedHexLen");
  function fromDecimalCode(c) {
    if (c >= 48 && c <= 57) {
      return c - 48;
    }
    return -1;
  }
  __name(fromDecimalCode, "fromDecimalCode");
  function simpleEscapeSequence(c) {
    switch (c) {
      case 48:
        return "\0";
      case 97:
        return "\x07";
      case 98:
        return "\b";
      case 116:
        return "	";
      case 9:
        return "	";
      case 110:
        return "\n";
      case 118:
        return "\v";
      case 102:
        return "\f";
      case 114:
        return "\r";
      case 101:
        return "\x1B";
      case 32:
        return " ";
      case 34:
        return '"';
      case 47:
        return "/";
      case 92:
        return "\\";
      case 78:
        return "\x85";
      case 95:
        return "\xA0";
      case 76:
        return "\u2028";
      case 80:
        return "\u2029";
      default:
        return "";
    }
  }
  __name(simpleEscapeSequence, "simpleEscapeSequence");
  function charFromCodepoint(c) {
    if (c <= 65535) {
      return String.fromCharCode(c);
    }
    return String.fromCharCode(
      (c - 65536 >> 10) + 55296,
      (c - 65536 & 1023) + 56320
    );
  }
  __name(charFromCodepoint, "charFromCodepoint");
  function setProperty(object, key, value) {
    if (key === "__proto__") {
      Object.defineProperty(object, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value
      });
    } else {
      object[key] = value;
    }
  }
  __name(setProperty, "setProperty");
  const simpleEscapeCheck = new Array(256);
  const simpleEscapeMap = new Array(256);
  for (let i = 0; i < 256; i++) {
    simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
    simpleEscapeMap[i] = simpleEscapeSequence(i);
  }
  function State(input, options) {
    this.input = input;
    this.filename = options["filename"] || null;
    this.schema = options["schema"] || DEFAULT_SCHEMA2;
    this.onWarning = options["onWarning"] || null;
    this.legacy = options["legacy"] || false;
    this.json = options["json"] || false;
    this.listener = options["listener"] || null;
    this.maxDepth = typeof options["maxDepth"] === "number" ? options["maxDepth"] : 100;
    this.maxTotalMergeKeys = typeof options["maxTotalMergeKeys"] === "number" ? options["maxTotalMergeKeys"] : 1e4;
    this.implicitTypes = this.schema.compiledImplicit;
    this.typeMap = this.schema.compiledTypeMap;
    this.length = input.length;
    this.position = 0;
    this.line = 0;
    this.lineStart = 0;
    this.lineIndent = 0;
    this.depth = 0;
    this.totalMergeKeys = 0;
    this.firstTabInLine = -1;
    this.documents = [];
    this.anchorMapTransactions = [];
  }
  __name(State, "State");
  function generateError(state, message) {
    const mark = {
      name: state.filename,
      buffer: state.input.slice(0, -1),
      // omit trailing \0
      position: state.position,
      line: state.line,
      column: state.position - state.lineStart
    };
    mark.snippet = makeSnippet(mark);
    return new YAMLException2(message, mark);
  }
  __name(generateError, "generateError");
  function throwError(state, message) {
    throw generateError(state, message);
  }
  __name(throwError, "throwError");
  function throwWarning(state, message) {
    if (state.onWarning) {
      state.onWarning.call(null, generateError(state, message));
    }
  }
  __name(throwWarning, "throwWarning");
  function storeAnchor(state, name, value) {
    const transactions = state.anchorMapTransactions;
    if (transactions.length !== 0) {
      const transaction = transactions[transactions.length - 1];
      if (!_hasOwnProperty.call(transaction, name)) {
        transaction[name] = {
          existed: _hasOwnProperty.call(state.anchorMap, name),
          value: state.anchorMap[name]
        };
      }
    }
    state.anchorMap[name] = value;
  }
  __name(storeAnchor, "storeAnchor");
  function beginAnchorTransaction(state) {
    state.anchorMapTransactions.push(/* @__PURE__ */ Object.create(null));
  }
  __name(beginAnchorTransaction, "beginAnchorTransaction");
  function commitAnchorTransaction(state) {
    const transaction = state.anchorMapTransactions.pop();
    const transactions = state.anchorMapTransactions;
    if (transactions.length === 0) return;
    const parent = transactions[transactions.length - 1];
    const names = Object.keys(transaction);
    for (let index = 0, length = names.length; index < length; index += 1) {
      const name = names[index];
      if (!_hasOwnProperty.call(parent, name)) {
        parent[name] = transaction[name];
      }
    }
  }
  __name(commitAnchorTransaction, "commitAnchorTransaction");
  function rollbackAnchorTransaction(state) {
    const transaction = state.anchorMapTransactions.pop();
    const names = Object.keys(transaction);
    for (let index = names.length - 1; index >= 0; index -= 1) {
      const entry = transaction[names[index]];
      if (entry.existed) {
        state.anchorMap[names[index]] = entry.value;
      } else {
        delete state.anchorMap[names[index]];
      }
    }
  }
  __name(rollbackAnchorTransaction, "rollbackAnchorTransaction");
  function snapshotState(state) {
    return {
      position: state.position,
      line: state.line,
      lineStart: state.lineStart,
      lineIndent: state.lineIndent,
      firstTabInLine: state.firstTabInLine,
      tag: state.tag,
      anchor: state.anchor,
      kind: state.kind,
      result: state.result
    };
  }
  __name(snapshotState, "snapshotState");
  function restoreState(state, snapshot) {
    state.position = snapshot.position;
    state.line = snapshot.line;
    state.lineStart = snapshot.lineStart;
    state.lineIndent = snapshot.lineIndent;
    state.firstTabInLine = snapshot.firstTabInLine;
    state.tag = snapshot.tag;
    state.anchor = snapshot.anchor;
    state.kind = snapshot.kind;
    state.result = snapshot.result;
  }
  __name(restoreState, "restoreState");
  const directiveHandlers = {
    YAML: /* @__PURE__ */ __name(function handleYamlDirective(state, name, args) {
      if (state.version !== null) {
        throwError(state, "duplication of %YAML directive");
      }
      if (args.length !== 1) {
        throwError(state, "YAML directive accepts exactly one argument");
      }
      const match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
      if (match === null) {
        throwError(state, "ill-formed argument of the YAML directive");
      }
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      if (major !== 1) {
        throwError(state, "unacceptable YAML version of the document");
      }
      state.version = args[0];
      state.checkLineBreaks = minor < 2;
      if (minor !== 1 && minor !== 2) {
        throwWarning(state, "unsupported YAML version of the document");
      }
    }, "handleYamlDirective"),
    TAG: /* @__PURE__ */ __name(function handleTagDirective(state, name, args) {
      let prefix;
      if (args.length !== 2) {
        throwError(state, "TAG directive accepts exactly two arguments");
      }
      const handle = args[0];
      prefix = args[1];
      if (!PATTERN_TAG_HANDLE.test(handle)) {
        throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
      }
      if (_hasOwnProperty.call(state.tagMap, handle)) {
        throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
      }
      if (!PATTERN_TAG_URI.test(prefix)) {
        throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
      }
      try {
        prefix = decodeURIComponent(prefix);
      } catch (err) {
        throwError(state, "tag prefix is malformed: " + prefix);
      }
      state.tagMap[handle] = prefix;
    }, "handleTagDirective")
  };
  function captureSegment(state, start, end, checkJson) {
    if (start < end) {
      const _result = state.input.slice(start, end);
      if (checkJson) {
        for (let _position = 0, _length = _result.length; _position < _length; _position += 1) {
          const _character = _result.charCodeAt(_position);
          if (!(_character === 9 || _character >= 32 && _character <= 1114111)) {
            throwError(state, "expected valid JSON character");
          }
        }
      } else if (PATTERN_NON_PRINTABLE.test(_result)) {
        throwError(state, "the stream contains non-printable characters");
      }
      state.result += _result;
    }
  }
  __name(captureSegment, "captureSegment");
  function chargeMergeWork(state) {
    state.totalMergeKeys++;
    if (state.maxTotalMergeKeys !== -1 && state.totalMergeKeys > state.maxTotalMergeKeys) {
      throwError(state, "merge keys exceeded maxTotalMergeKeys (" + state.maxTotalMergeKeys + ")");
    }
  }
  __name(chargeMergeWork, "chargeMergeWork");
  function mergeMappings(state, destination, source, overridableKeys) {
    if (!common2.isObject(source)) {
      throwError(state, "cannot merge mappings; the provided source object is unacceptable");
    }
    chargeMergeWork(state);
    const sourceKeys = Object.keys(source);
    for (let index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
      const key = sourceKeys[index];
      chargeMergeWork(state);
      if (!_hasOwnProperty.call(destination, key)) {
        setProperty(destination, key, source[key]);
        overridableKeys[key] = true;
      }
    }
  }
  __name(mergeMappings, "mergeMappings");
  function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
    if (Array.isArray(keyNode)) {
      keyNode = Array.prototype.slice.call(keyNode);
      for (let index = 0, quantity = keyNode.length; index < quantity; index += 1) {
        if (Array.isArray(keyNode[index])) {
          throwError(state, "nested arrays are not supported inside keys");
        }
        if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
          keyNode[index] = "[object Object]";
        }
      }
    }
    if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
      keyNode = "[object Object]";
    }
    keyNode = String(keyNode);
    if (_result === null) {
      _result = {};
    }
    if (keyTag === "tag:yaml.org,2002:merge") {
      if (Array.isArray(valueNode)) {
        if (valueNode.length > 100) {
          throwError(state, "abnormal merge sequence size");
        }
        for (let index = 0, quantity = valueNode.length; index < quantity; index += 1) {
          mergeMappings(state, _result, valueNode[index], overridableKeys);
        }
      } else {
        mergeMappings(state, _result, valueNode, overridableKeys);
      }
    } else {
      if (!state.json && !_hasOwnProperty.call(overridableKeys, keyNode) && _hasOwnProperty.call(_result, keyNode)) {
        state.line = startLine || state.line;
        state.lineStart = startLineStart || state.lineStart;
        state.position = startPos || state.position;
        throwError(state, "duplicated mapping key");
      }
      setProperty(_result, keyNode, valueNode);
      delete overridableKeys[keyNode];
    }
    return _result;
  }
  __name(storeMappingPair, "storeMappingPair");
  function readLineBreak(state) {
    const ch = state.input.charCodeAt(state.position);
    if (ch === 10) {
      state.position++;
    } else if (ch === 13) {
      state.position++;
      if (state.input.charCodeAt(state.position) === 10) {
        state.position++;
      }
    } else {
      throwError(state, "a line break is expected");
    }
    state.line += 1;
    state.lineStart = state.position;
    state.firstTabInLine = -1;
  }
  __name(readLineBreak, "readLineBreak");
  function skipSeparationSpace(state, allowComments, checkIndent) {
    let lineBreaks = 0;
    let ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
      while (isWhiteSpace(ch)) {
        if (ch === 9 && state.firstTabInLine === -1) {
          state.firstTabInLine = state.position;
        }
        ch = state.input.charCodeAt(++state.position);
      }
      if (allowComments && ch === 35) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 10 && ch !== 13 && ch !== 0);
      }
      if (isEol(ch)) {
        readLineBreak(state);
        ch = state.input.charCodeAt(state.position);
        lineBreaks++;
        state.lineIndent = 0;
        while (ch === 32) {
          state.lineIndent++;
          ch = state.input.charCodeAt(++state.position);
        }
      } else {
        break;
      }
    }
    if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
      throwWarning(state, "deficient indentation");
    }
    return lineBreaks;
  }
  __name(skipSeparationSpace, "skipSeparationSpace");
  function testDocumentSeparator(state) {
    let _position = state.position;
    let ch = state.input.charCodeAt(_position);
    if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
      _position += 3;
      ch = state.input.charCodeAt(_position);
      if (ch === 0 || isWsOrEol(ch)) {
        return true;
      }
    }
    return false;
  }
  __name(testDocumentSeparator, "testDocumentSeparator");
  function writeFoldedLines(state, count) {
    if (count === 1) {
      state.result += " ";
    } else if (count > 1) {
      state.result += common2.repeat("\n", count - 1);
    }
  }
  __name(writeFoldedLines, "writeFoldedLines");
  function readPlainScalar(state, nodeIndent, withinFlowCollection) {
    let captureStart;
    let captureEnd;
    let hasPendingContent;
    let _line;
    let _lineStart;
    let _lineIndent;
    const _kind = state.kind;
    const _result = state.result;
    let ch = state.input.charCodeAt(state.position);
    if (isWsOrEol(ch) || isFlowIndicator(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
      return false;
    }
    if (ch === 63 || ch === 45) {
      const following = state.input.charCodeAt(state.position + 1);
      if (isWsOrEol(following) || withinFlowCollection && isFlowIndicator(following)) {
        return false;
      }
    }
    state.kind = "scalar";
    state.result = "";
    captureStart = captureEnd = state.position;
    hasPendingContent = false;
    while (ch !== 0) {
      if (ch === 58) {
        const following = state.input.charCodeAt(state.position + 1);
        if (isWsOrEol(following) || withinFlowCollection && isFlowIndicator(following)) {
          break;
        }
      } else if (ch === 35) {
        const preceding = state.input.charCodeAt(state.position - 1);
        if (isWsOrEol(preceding)) {
          break;
        }
      } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && isFlowIndicator(ch)) {
        break;
      } else if (isEol(ch)) {
        _line = state.line;
        _lineStart = state.lineStart;
        _lineIndent = state.lineIndent;
        skipSeparationSpace(state, false, -1);
        if (state.lineIndent >= nodeIndent) {
          hasPendingContent = true;
          ch = state.input.charCodeAt(state.position);
          continue;
        } else {
          state.position = captureEnd;
          state.line = _line;
          state.lineStart = _lineStart;
          state.lineIndent = _lineIndent;
          break;
        }
      }
      if (hasPendingContent) {
        captureSegment(state, captureStart, captureEnd, false);
        writeFoldedLines(state, state.line - _line);
        captureStart = captureEnd = state.position;
        hasPendingContent = false;
      }
      if (!isWhiteSpace(ch)) {
        captureEnd = state.position + 1;
      }
      ch = state.input.charCodeAt(++state.position);
    }
    captureSegment(state, captureStart, captureEnd, false);
    if (state.result) {
      return true;
    }
    state.kind = _kind;
    state.result = _result;
    return false;
  }
  __name(readPlainScalar, "readPlainScalar");
  function readSingleQuotedScalar(state, nodeIndent) {
    let captureStart;
    let captureEnd;
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 39) {
      return false;
    }
    state.kind = "scalar";
    state.result = "";
    state.position++;
    captureStart = captureEnd = state.position;
    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      if (ch === 39) {
        captureSegment(state, captureStart, state.position, true);
        ch = state.input.charCodeAt(++state.position);
        if (ch === 39) {
          captureStart = state.position;
          state.position++;
          captureEnd = state.position;
        } else {
          return true;
        }
      } else if (isEol(ch)) {
        captureSegment(state, captureStart, captureEnd, true);
        writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
        captureStart = captureEnd = state.position;
      } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
        throwError(state, "unexpected end of the document within a single quoted scalar");
      } else {
        state.position++;
        if (!isWhiteSpace(ch)) {
          captureEnd = state.position;
        }
      }
    }
    throwError(state, "unexpected end of the stream within a single quoted scalar");
  }
  __name(readSingleQuotedScalar, "readSingleQuotedScalar");
  function readDoubleQuotedScalar(state, nodeIndent) {
    let captureStart;
    let captureEnd;
    let tmp;
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 34) {
      return false;
    }
    state.kind = "scalar";
    state.result = "";
    state.position++;
    captureStart = captureEnd = state.position;
    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      if (ch === 34) {
        captureSegment(state, captureStart, state.position, true);
        state.position++;
        return true;
      } else if (ch === 92) {
        captureSegment(state, captureStart, state.position, true);
        ch = state.input.charCodeAt(++state.position);
        if (isEol(ch)) {
          skipSeparationSpace(state, false, nodeIndent);
        } else if (ch < 256 && simpleEscapeCheck[ch]) {
          state.result += simpleEscapeMap[ch];
          state.position++;
        } else if ((tmp = escapedHexLen(ch)) > 0) {
          let hexLength = tmp;
          let hexResult = 0;
          for (; hexLength > 0; hexLength--) {
            ch = state.input.charCodeAt(++state.position);
            if ((tmp = fromHexCode(ch)) >= 0) {
              hexResult = (hexResult << 4) + tmp;
            } else {
              throwError(state, "expected hexadecimal character");
            }
          }
          state.result += charFromCodepoint(hexResult);
          state.position++;
        } else {
          throwError(state, "unknown escape sequence");
        }
        captureStart = captureEnd = state.position;
      } else if (isEol(ch)) {
        captureSegment(state, captureStart, captureEnd, true);
        writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
        captureStart = captureEnd = state.position;
      } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
        throwError(state, "unexpected end of the document within a double quoted scalar");
      } else {
        state.position++;
        if (!isWhiteSpace(ch)) {
          captureEnd = state.position;
        }
      }
    }
    throwError(state, "unexpected end of the stream within a double quoted scalar");
  }
  __name(readDoubleQuotedScalar, "readDoubleQuotedScalar");
  function readFlowCollection(state, nodeIndent) {
    let readNext = true;
    let _line;
    let _lineStart;
    let _pos;
    const _tag = state.tag;
    let _result;
    const _anchor = state.anchor;
    let terminator;
    let isPair;
    let isExplicitPair;
    let isMapping;
    const overridableKeys = /* @__PURE__ */ Object.create(null);
    let keyNode;
    let keyTag;
    let valueNode;
    let ch = state.input.charCodeAt(state.position);
    if (ch === 91) {
      terminator = 93;
      isMapping = false;
      _result = [];
    } else if (ch === 123) {
      terminator = 125;
      isMapping = true;
      _result = {};
    } else {
      return false;
    }
    if (state.anchor !== null) {
      storeAnchor(state, state.anchor, _result);
    }
    ch = state.input.charCodeAt(++state.position);
    while (ch !== 0) {
      skipSeparationSpace(state, true, nodeIndent);
      ch = state.input.charCodeAt(state.position);
      if (ch === terminator) {
        state.position++;
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = isMapping ? "mapping" : "sequence";
        state.result = _result;
        return true;
      } else if (!readNext) {
        throwError(state, "missed comma between flow collection entries");
      } else if (ch === 44) {
        throwError(state, "expected the node content, but found ','");
      }
      keyTag = keyNode = valueNode = null;
      isPair = isExplicitPair = false;
      if (ch === 63) {
        const following = state.input.charCodeAt(state.position + 1);
        if (isWsOrEol(following)) {
          isPair = isExplicitPair = true;
          state.position++;
          skipSeparationSpace(state, true, nodeIndent);
        }
      }
      _line = state.line;
      _lineStart = state.lineStart;
      _pos = state.position;
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      keyTag = state.tag;
      keyNode = state.result;
      skipSeparationSpace(state, true, nodeIndent);
      ch = state.input.charCodeAt(state.position);
      if ((isExplicitPair || state.line === _line) && ch === 58) {
        isPair = true;
        ch = state.input.charCodeAt(++state.position);
        skipSeparationSpace(state, true, nodeIndent);
        composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
        valueNode = state.result;
      }
      if (isMapping) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
      } else if (isPair) {
        _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
      } else {
        _result.push(keyNode);
      }
      skipSeparationSpace(state, true, nodeIndent);
      ch = state.input.charCodeAt(state.position);
      if (ch === 44) {
        readNext = true;
        ch = state.input.charCodeAt(++state.position);
      } else {
        readNext = false;
      }
    }
    throwError(state, "unexpected end of the stream within a flow collection");
  }
  __name(readFlowCollection, "readFlowCollection");
  function readBlockScalar(state, nodeIndent) {
    let folding;
    let chomping = CHOMPING_CLIP;
    let didReadContent = false;
    let detectedIndent = false;
    let textIndent = nodeIndent;
    let emptyLines = 0;
    let atMoreIndented = false;
    let tmp;
    let ch = state.input.charCodeAt(state.position);
    if (ch === 124) {
      folding = false;
    } else if (ch === 62) {
      folding = true;
    } else {
      return false;
    }
    state.kind = "scalar";
    state.result = "";
    while (ch !== 0) {
      ch = state.input.charCodeAt(++state.position);
      if (ch === 43 || ch === 45) {
        if (CHOMPING_CLIP === chomping) {
          chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
        } else {
          throwError(state, "repeat of a chomping mode identifier");
        }
      } else if ((tmp = fromDecimalCode(ch)) >= 0) {
        if (tmp === 0) {
          throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
        } else if (!detectedIndent) {
          textIndent = nodeIndent + tmp - 1;
          detectedIndent = true;
        } else {
          throwError(state, "repeat of an indentation width identifier");
        }
      } else {
        break;
      }
    }
    if (isWhiteSpace(ch)) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (isWhiteSpace(ch));
      if (ch === 35) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (!isEol(ch) && ch !== 0);
      }
    }
    while (ch !== 0) {
      readLineBreak(state);
      state.lineIndent = 0;
      ch = state.input.charCodeAt(state.position);
      while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
      if (!detectedIndent && state.lineIndent > textIndent) {
        textIndent = state.lineIndent;
      }
      if (isEol(ch)) {
        emptyLines++;
        continue;
      }
      if (!detectedIndent && textIndent === 0) {
        throwError(state, "missing indentation for block scalar");
      }
      if (state.lineIndent < textIndent) {
        if (chomping === CHOMPING_KEEP) {
          state.result += common2.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
        } else if (chomping === CHOMPING_CLIP) {
          if (didReadContent) {
            state.result += "\n";
          }
        }
        break;
      }
      if (folding) {
        if (isWhiteSpace(ch)) {
          atMoreIndented = true;
          state.result += common2.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
        } else if (atMoreIndented) {
          atMoreIndented = false;
          state.result += common2.repeat("\n", emptyLines + 1);
        } else if (emptyLines === 0) {
          if (didReadContent) {
            state.result += " ";
          }
        } else {
          state.result += common2.repeat("\n", emptyLines);
        }
      } else {
        state.result += common2.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      }
      didReadContent = true;
      detectedIndent = true;
      emptyLines = 0;
      const captureStart = state.position;
      while (!isEol(ch) && ch !== 0) {
        ch = state.input.charCodeAt(++state.position);
      }
      captureSegment(state, captureStart, state.position, false);
    }
    return true;
  }
  __name(readBlockScalar, "readBlockScalar");
  function readBlockSequence(state, nodeIndent) {
    const _tag = state.tag;
    const _anchor = state.anchor;
    const _result = [];
    let detected = false;
    if (state.firstTabInLine !== -1) return false;
    if (state.anchor !== null) {
      storeAnchor(state, state.anchor, _result);
    }
    let ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
      if (state.firstTabInLine !== -1) {
        state.position = state.firstTabInLine;
        throwError(state, "tab characters must not be used in indentation");
      }
      if (ch !== 45) {
        break;
      }
      const following = state.input.charCodeAt(state.position + 1);
      if (!isWsOrEol(following)) {
        break;
      }
      detected = true;
      state.position++;
      if (skipSeparationSpace(state, true, -1)) {
        if (state.lineIndent <= nodeIndent) {
          _result.push(null);
          ch = state.input.charCodeAt(state.position);
          continue;
        }
      }
      const _line = state.line;
      composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
      _result.push(state.result);
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
      if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
        throwError(state, "bad indentation of a sequence entry");
      } else if (state.lineIndent < nodeIndent) {
        break;
      }
    }
    if (detected) {
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = "sequence";
      state.result = _result;
      return true;
    }
    return false;
  }
  __name(readBlockSequence, "readBlockSequence");
  function readBlockMapping(state, nodeIndent, flowIndent) {
    let allowCompact;
    let _keyLine;
    let _keyLineStart;
    let _keyPos;
    const _tag = state.tag;
    const _anchor = state.anchor;
    const _result = {};
    const overridableKeys = /* @__PURE__ */ Object.create(null);
    let keyTag = null;
    let keyNode = null;
    let valueNode = null;
    let atExplicitKey = false;
    let detected = false;
    if (state.firstTabInLine !== -1) return false;
    if (state.anchor !== null) {
      storeAnchor(state, state.anchor, _result);
    }
    let ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
      if (!atExplicitKey && state.firstTabInLine !== -1) {
        state.position = state.firstTabInLine;
        throwError(state, "tab characters must not be used in indentation");
      }
      const following = state.input.charCodeAt(state.position + 1);
      const _line = state.line;
      if ((ch === 63 || ch === 58) && isWsOrEol(following)) {
        if (ch === 63) {
          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          detected = true;
          atExplicitKey = true;
          allowCompact = true;
        } else if (atExplicitKey) {
          atExplicitKey = false;
          allowCompact = true;
        } else {
          throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
        }
        state.position += 1;
        ch = following;
      } else {
        _keyLine = state.line;
        _keyLineStart = state.lineStart;
        _keyPos = state.position;
        if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
          break;
        }
        if (state.line === _line) {
          ch = state.input.charCodeAt(state.position);
          while (isWhiteSpace(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          if (ch === 58) {
            ch = state.input.charCodeAt(++state.position);
            if (!isWsOrEol(ch)) {
              throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
            }
            if (atExplicitKey) {
              storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
              keyTag = keyNode = valueNode = null;
            }
            detected = true;
            atExplicitKey = false;
            allowCompact = false;
            keyTag = state.tag;
            keyNode = state.result;
          } else if (detected) {
            throwError(state, "can not read an implicit mapping pair; a colon is missed");
          } else {
            state.tag = _tag;
            state.anchor = _anchor;
            return true;
          }
        } else if (detected) {
          throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true;
        }
      }
      if (state.line === _line || state.lineIndent > nodeIndent) {
        if (atExplicitKey) {
          _keyLine = state.line;
          _keyLineStart = state.lineStart;
          _keyPos = state.position;
        }
        if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
          if (atExplicitKey) {
            keyNode = state.result;
          } else {
            valueNode = state.result;
          }
        }
        if (!atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
          keyTag = keyNode = valueNode = null;
        }
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
      }
      if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
        throwError(state, "bad indentation of a mapping entry");
      } else if (state.lineIndent < nodeIndent) {
        break;
      }
    }
    if (atExplicitKey) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
    }
    if (detected) {
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = "mapping";
      state.result = _result;
    }
    return detected;
  }
  __name(readBlockMapping, "readBlockMapping");
  function readTagProperty(state) {
    let isVerbatim = false;
    let isNamed = false;
    let tagHandle;
    let tagName;
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 33) return false;
    if (state.tag !== null) {
      throwError(state, "duplication of a tag property");
    }
    ch = state.input.charCodeAt(++state.position);
    if (ch === 60) {
      isVerbatim = true;
      ch = state.input.charCodeAt(++state.position);
    } else if (ch === 33) {
      isNamed = true;
      tagHandle = "!!";
      ch = state.input.charCodeAt(++state.position);
    } else {
      tagHandle = "!";
    }
    let _position = state.position;
    if (isVerbatim) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (ch !== 0 && ch !== 62);
      if (state.position < state.length) {
        tagName = state.input.slice(_position, state.position);
        ch = state.input.charCodeAt(++state.position);
      } else {
        throwError(state, "unexpected end of the stream within a verbatim tag");
      }
    } else {
      while (ch !== 0 && !isWsOrEol(ch)) {
        if (ch === 33) {
          if (!isNamed) {
            tagHandle = state.input.slice(_position - 1, state.position + 1);
            if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
              throwError(state, "named tag handle cannot contain such characters");
            }
            isNamed = true;
            _position = state.position + 1;
          } else {
            throwError(state, "tag suffix cannot contain exclamation marks");
          }
        }
        ch = state.input.charCodeAt(++state.position);
      }
      tagName = state.input.slice(_position, state.position);
      if (PATTERN_FLOW_INDICATORS.test(tagName)) {
        throwError(state, "tag suffix cannot contain flow indicator characters");
      }
    }
    if (tagName && !PATTERN_TAG_URI.test(tagName)) {
      throwError(state, "tag name cannot contain such characters: " + tagName);
    }
    try {
      tagName = decodeURIComponent(tagName);
    } catch (err) {
      throwError(state, "tag name is malformed: " + tagName);
    }
    if (isVerbatim) {
      state.tag = tagName;
    } else if (_hasOwnProperty.call(state.tagMap, tagHandle)) {
      state.tag = state.tagMap[tagHandle] + tagName;
    } else if (tagHandle === "!") {
      state.tag = "!" + tagName;
    } else if (tagHandle === "!!") {
      state.tag = "tag:yaml.org,2002:" + tagName;
    } else {
      throwError(state, 'undeclared tag handle "' + tagHandle + '"');
    }
    return true;
  }
  __name(readTagProperty, "readTagProperty");
  function readAnchorProperty(state) {
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 38) return false;
    if (state.anchor !== null) {
      throwError(state, "duplication of an anchor property");
    }
    ch = state.input.charCodeAt(++state.position);
    const _position = state.position;
    while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    if (state.position === _position) {
      throwError(state, "name of an anchor node must contain at least one character");
    }
    state.anchor = state.input.slice(_position, state.position);
    return true;
  }
  __name(readAnchorProperty, "readAnchorProperty");
  function readAlias(state) {
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 42) return false;
    ch = state.input.charCodeAt(++state.position);
    const _position = state.position;
    while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    if (state.position === _position) {
      throwError(state, "name of an alias node must contain at least one character");
    }
    const alias = state.input.slice(_position, state.position);
    if (!_hasOwnProperty.call(state.anchorMap, alias)) {
      throwError(state, 'unidentified alias "' + alias + '"');
    }
    state.result = state.anchorMap[alias];
    skipSeparationSpace(state, true, -1);
    return true;
  }
  __name(readAlias, "readAlias");
  function tryReadBlockMappingFromProperty(state, propertyStart, nodeIndent, flowIndent) {
    const fallbackState = snapshotState(state);
    beginAnchorTransaction(state);
    restoreState(state, propertyStart);
    state.tag = null;
    state.anchor = null;
    state.kind = null;
    state.result = null;
    if (readBlockMapping(state, nodeIndent, flowIndent) && state.kind === "mapping") {
      commitAnchorTransaction(state);
      return true;
    }
    rollbackAnchorTransaction(state);
    restoreState(state, fallbackState);
    return false;
  }
  __name(tryReadBlockMappingFromProperty, "tryReadBlockMappingFromProperty");
  function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
    let allowBlockScalars;
    let allowBlockCollections;
    let indentStatus = 1;
    let atNewLine = false;
    let hasContent = false;
    let propertyStart = null;
    let type2;
    let flowIndent;
    let blockIndent;
    if (state.depth >= state.maxDepth) {
      throwError(state, "nesting exceeded maxDepth (" + state.maxDepth + ")");
    }
    state.depth += 1;
    if (state.listener !== null) {
      state.listener("open", state);
    }
    state.tag = null;
    state.anchor = null;
    state.kind = null;
    state.result = null;
    const allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
    if (allowToSeek) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;
        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      }
    }
    if (indentStatus === 1) {
      while (true) {
        const ch = state.input.charCodeAt(state.position);
        const propertyState = snapshotState(state);
        if (atNewLine && (ch === 33 && state.tag !== null || ch === 38 && state.anchor !== null)) {
          break;
        }
        if (!readTagProperty(state) && !readAnchorProperty(state)) {
          break;
        }
        if (propertyStart === null) {
          propertyStart = propertyState;
        }
        if (skipSeparationSpace(state, true, -1)) {
          atNewLine = true;
          allowBlockCollections = allowBlockStyles;
          if (state.lineIndent > parentIndent) {
            indentStatus = 1;
          } else if (state.lineIndent === parentIndent) {
            indentStatus = 0;
          } else if (state.lineIndent < parentIndent) {
            indentStatus = -1;
          }
        } else {
          allowBlockCollections = false;
        }
      }
    }
    if (allowBlockCollections) {
      allowBlockCollections = atNewLine || allowCompact;
    }
    if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
      if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
        flowIndent = parentIndent;
      } else {
        flowIndent = parentIndent + 1;
      }
      blockIndent = state.position - state.lineStart;
      if (indentStatus === 1) {
        if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
          hasContent = true;
        } else {
          const ch = state.input.charCodeAt(state.position);
          if (propertyStart !== null && allowBlockStyles && !allowBlockCollections && ch !== 124 && ch !== 62 && tryReadBlockMappingFromProperty(
            state,
            propertyStart,
            propertyStart.position - propertyStart.lineStart,
            flowIndent
          )) {
            hasContent = true;
          } else if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
            hasContent = true;
          } else if (readAlias(state)) {
            hasContent = true;
            if (state.tag !== null || state.anchor !== null) {
              throwError(state, "alias node should not have any properties");
            }
          } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
            hasContent = true;
            if (state.tag === null) {
              state.tag = "?";
            }
          }
          if (state.anchor !== null) {
            storeAnchor(state, state.anchor, state.result);
          }
        }
      } else if (indentStatus === 0) {
        hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
      }
    }
    if (state.tag === null) {
      if (state.anchor !== null) {
        storeAnchor(state, state.anchor, state.result);
      }
    } else if (state.tag === "?") {
      if (state.result !== null && state.kind !== "scalar") {
        throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
      }
      for (let typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
        type2 = state.implicitTypes[typeIndex];
        if (type2.resolve(state.result)) {
          state.result = type2.construct(state.result);
          state.tag = type2.tag;
          if (state.anchor !== null) {
            storeAnchor(state, state.anchor, state.result);
          }
          break;
        }
      }
    } else if (state.tag !== "!") {
      if (_hasOwnProperty.call(state.typeMap[state.kind || "fallback"], state.tag)) {
        type2 = state.typeMap[state.kind || "fallback"][state.tag];
      } else {
        type2 = null;
        const typeList = state.typeMap.multi[state.kind || "fallback"];
        for (let typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) {
          if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
            type2 = typeList[typeIndex];
            break;
          }
        }
      }
      if (!type2) {
        throwError(state, "unknown tag !<" + state.tag + ">");
      }
      if (state.result !== null && type2.kind !== state.kind) {
        throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type2.kind + '", not "' + state.kind + '"');
      }
      if (!type2.resolve(state.result, state.tag)) {
        throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
      } else {
        state.result = type2.construct(state.result, state.tag);
        if (state.anchor !== null) {
          storeAnchor(state, state.anchor, state.result);
        }
      }
    }
    if (state.listener !== null) {
      state.listener("close", state);
    }
    state.depth -= 1;
    return state.tag !== null || state.anchor !== null || hasContent;
  }
  __name(composeNode, "composeNode");
  function readDocument(state) {
    const documentStart = state.position;
    let hasDirectives = false;
    let ch;
    state.version = null;
    state.checkLineBreaks = state.legacy;
    state.tagMap = /* @__PURE__ */ Object.create(null);
    state.anchorMap = /* @__PURE__ */ Object.create(null);
    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
      if (state.lineIndent > 0 || ch !== 37) {
        break;
      }
      hasDirectives = true;
      ch = state.input.charCodeAt(++state.position);
      let _position = state.position;
      while (ch !== 0 && !isWsOrEol(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      const directiveName = state.input.slice(_position, state.position);
      const directiveArgs = [];
      if (directiveName.length < 1) {
        throwError(state, "directive name must not be less than one character in length");
      }
      while (ch !== 0) {
        while (isWhiteSpace(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (ch === 35) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (ch !== 0 && !isEol(ch));
          break;
        }
        if (isEol(ch)) break;
        _position = state.position;
        while (ch !== 0 && !isWsOrEol(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        directiveArgs.push(state.input.slice(_position, state.position));
      }
      if (ch !== 0) readLineBreak(state);
      if (_hasOwnProperty.call(directiveHandlers, directiveName)) {
        directiveHandlers[directiveName](state, directiveName, directiveArgs);
      } else {
        throwWarning(state, 'unknown document directive "' + directiveName + '"');
      }
    }
    skipSeparationSpace(state, true, -1);
    if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    } else if (hasDirectives) {
      throwError(state, "directives end mark is expected");
    }
    composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
    skipSeparationSpace(state, true, -1);
    if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
      throwWarning(state, "non-ASCII line breaks are interpreted as content");
    }
    state.documents.push(state.result);
    if (state.position === state.lineStart && testDocumentSeparator(state)) {
      if (state.input.charCodeAt(state.position) === 46) {
        state.position += 3;
        skipSeparationSpace(state, true, -1);
      }
      return;
    }
    if (state.position < state.length - 1) {
      throwError(state, "end of the stream or a document separator is expected");
    }
  }
  __name(readDocument, "readDocument");
  function loadDocuments(input, options) {
    input = String(input);
    options = options || {};
    if (input.length !== 0) {
      if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
        input += "\n";
      }
      if (input.charCodeAt(0) === 65279) {
        input = input.slice(1);
      }
    }
    const state = new State(input, options);
    const nullpos = input.indexOf("\0");
    if (nullpos !== -1) {
      state.position = nullpos;
      throwError(state, "null byte is not allowed in input");
    }
    state.input += "\0";
    while (state.input.charCodeAt(state.position) === 32) {
      state.lineIndent += 1;
      state.position += 1;
    }
    while (state.position < state.length - 1) {
      readDocument(state);
    }
    return state.documents;
  }
  __name(loadDocuments, "loadDocuments");
  function loadAll2(input, iterator, options) {
    if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
      options = iterator;
      iterator = null;
    }
    const documents = loadDocuments(input, options);
    if (typeof iterator !== "function") {
      return documents;
    }
    for (let index = 0, length = documents.length; index < length; index += 1) {
      iterator(documents[index]);
    }
  }
  __name(loadAll2, "loadAll2");
  function load2(input, options) {
    const documents = loadDocuments(input, options);
    if (documents.length === 0) {
      return void 0;
    } else if (documents.length === 1) {
      return documents[0];
    }
    throw new YAMLException2("expected a single document in the stream, but found more");
  }
  __name(load2, "load2");
  loader.loadAll = loadAll2;
  loader.load = load2;
  return loader;
}
__name(requireLoader, "requireLoader");
var dumper = {};
var hasRequiredDumper;
function requireDumper() {
  if (hasRequiredDumper) return dumper;
  hasRequiredDumper = 1;
  const common2 = requireCommon();
  const YAMLException2 = requireException();
  const DEFAULT_SCHEMA2 = require_default();
  const _toString = Object.prototype.toString;
  const _hasOwnProperty = Object.prototype.hasOwnProperty;
  const CHAR_BOM = 65279;
  const CHAR_TAB = 9;
  const CHAR_LINE_FEED = 10;
  const CHAR_CARRIAGE_RETURN = 13;
  const CHAR_SPACE = 32;
  const CHAR_EXCLAMATION = 33;
  const CHAR_DOUBLE_QUOTE = 34;
  const CHAR_SHARP = 35;
  const CHAR_PERCENT = 37;
  const CHAR_AMPERSAND = 38;
  const CHAR_SINGLE_QUOTE = 39;
  const CHAR_ASTERISK = 42;
  const CHAR_COMMA = 44;
  const CHAR_MINUS = 45;
  const CHAR_COLON = 58;
  const CHAR_EQUALS = 61;
  const CHAR_GREATER_THAN = 62;
  const CHAR_QUESTION = 63;
  const CHAR_COMMERCIAL_AT = 64;
  const CHAR_LEFT_SQUARE_BRACKET = 91;
  const CHAR_RIGHT_SQUARE_BRACKET = 93;
  const CHAR_GRAVE_ACCENT = 96;
  const CHAR_LEFT_CURLY_BRACKET = 123;
  const CHAR_VERTICAL_LINE = 124;
  const CHAR_RIGHT_CURLY_BRACKET = 125;
  const ESCAPE_SEQUENCES = {};
  ESCAPE_SEQUENCES[0] = "\\0";
  ESCAPE_SEQUENCES[7] = "\\a";
  ESCAPE_SEQUENCES[8] = "\\b";
  ESCAPE_SEQUENCES[9] = "\\t";
  ESCAPE_SEQUENCES[10] = "\\n";
  ESCAPE_SEQUENCES[11] = "\\v";
  ESCAPE_SEQUENCES[12] = "\\f";
  ESCAPE_SEQUENCES[13] = "\\r";
  ESCAPE_SEQUENCES[27] = "\\e";
  ESCAPE_SEQUENCES[34] = '\\"';
  ESCAPE_SEQUENCES[92] = "\\\\";
  ESCAPE_SEQUENCES[133] = "\\N";
  ESCAPE_SEQUENCES[160] = "\\_";
  ESCAPE_SEQUENCES[8232] = "\\L";
  ESCAPE_SEQUENCES[8233] = "\\P";
  const DEPRECATED_BOOLEANS_SYNTAX = [
    "y",
    "Y",
    "yes",
    "Yes",
    "YES",
    "on",
    "On",
    "ON",
    "n",
    "N",
    "no",
    "No",
    "NO",
    "off",
    "Off",
    "OFF"
  ];
  const DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
  function compileStyleMap(schema2, map2) {
    if (map2 === null) return {};
    const result = {};
    const keys = Object.keys(map2);
    for (let index = 0, length = keys.length; index < length; index += 1) {
      let tag = keys[index];
      let style = String(map2[tag]);
      if (tag.slice(0, 2) === "!!") {
        tag = "tag:yaml.org,2002:" + tag.slice(2);
      }
      const type2 = schema2.compiledTypeMap["fallback"][tag];
      if (type2 && _hasOwnProperty.call(type2.styleAliases, style)) {
        style = type2.styleAliases[style];
      }
      result[tag] = style;
    }
    return result;
  }
  __name(compileStyleMap, "compileStyleMap");
  function encodeHex(character) {
    let handle;
    let length;
    const string = character.toString(16).toUpperCase();
    if (character <= 255) {
      handle = "x";
      length = 2;
    } else if (character <= 65535) {
      handle = "u";
      length = 4;
    } else if (character <= 4294967295) {
      handle = "U";
      length = 8;
    } else {
      throw new YAMLException2("code point within a string may not be greater than 0xFFFFFFFF");
    }
    return "\\" + handle + common2.repeat("0", length - string.length) + string;
  }
  __name(encodeHex, "encodeHex");
  const QUOTING_TYPE_SINGLE = 1;
  const QUOTING_TYPE_DOUBLE = 2;
  function State(options) {
    this.schema = options["schema"] || DEFAULT_SCHEMA2;
    this.indent = Math.max(1, options["indent"] || 2);
    this.noArrayIndent = options["noArrayIndent"] || false;
    this.skipInvalid = options["skipInvalid"] || false;
    this.flowLevel = common2.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
    this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
    this.sortKeys = options["sortKeys"] || false;
    this.lineWidth = options["lineWidth"] || 80;
    this.noRefs = options["noRefs"] || false;
    this.noCompatMode = options["noCompatMode"] || false;
    this.condenseFlow = options["condenseFlow"] || false;
    this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
    this.forceQuotes = options["forceQuotes"] || false;
    this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
    this.implicitTypes = this.schema.compiledImplicit;
    this.explicitTypes = this.schema.compiledExplicit;
    this.tag = null;
    this.result = "";
    this.duplicates = [];
    this.usedDuplicates = null;
  }
  __name(State, "State");
  function indentString(string, spaces) {
    const ind = common2.repeat(" ", spaces);
    let position = 0;
    let result = "";
    const length = string.length;
    while (position < length) {
      let line;
      const next = string.indexOf("\n", position);
      if (next === -1) {
        line = string.slice(position);
        position = length;
      } else {
        line = string.slice(position, next + 1);
        position = next + 1;
      }
      if (line.length && line !== "\n") result += ind;
      result += line;
    }
    return result;
  }
  __name(indentString, "indentString");
  function generateNextLine(state, level) {
    return "\n" + common2.repeat(" ", state.indent * level);
  }
  __name(generateNextLine, "generateNextLine");
  function testImplicitResolving(state, str2) {
    for (let index = 0, length = state.implicitTypes.length; index < length; index += 1) {
      const type2 = state.implicitTypes[index];
      if (type2.resolve(str2)) {
        return true;
      }
    }
    return false;
  }
  __name(testImplicitResolving, "testImplicitResolving");
  function isWhitespace(c) {
    return c === CHAR_SPACE || c === CHAR_TAB;
  }
  __name(isWhitespace, "isWhitespace");
  function isPrintable(c) {
    return c >= 32 && c <= 126 || c >= 161 && c <= 55295 && c !== 8232 && c !== 8233 || c >= 57344 && c <= 65533 && c !== CHAR_BOM || c >= 65536 && c <= 1114111;
  }
  __name(isPrintable, "isPrintable");
  function isNsCharOrWhitespace(c) {
    return isPrintable(c) && c !== CHAR_BOM && // - b-char
    c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
  }
  __name(isNsCharOrWhitespace, "isNsCharOrWhitespace");
  function isPlainSafe(c, prev, inblock) {
    const cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
    const cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
    return (
      // ns-plain-safe
      (inblock ? cIsNsCharOrWhitespace : cIsNsCharOrWhitespace && // - c-flow-indicator
      c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && // ns-plain-char
      c !== CHAR_SHARP && // false on '#'
      !(prev === CHAR_COLON && !cIsNsChar) || // false on ': '
      isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || // change to true on '[^ ]#'
      prev === CHAR_COLON && cIsNsChar
    );
  }
  __name(isPlainSafe, "isPlainSafe");
  function isPlainSafeFirst(c) {
    return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && // - s-white
    // - (c-indicator ::=
    // “-” | “?” | “:” | “,” | “[” | “]” | “{” | “}”
    c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && // | “#” | “&” | “*” | “!” | “|” | “=” | “>” | “'” | “"”
    c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && // | “%” | “@” | “`”)
    c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
  }
  __name(isPlainSafeFirst, "isPlainSafeFirst");
  function isPlainSafeLast(c) {
    return !isWhitespace(c) && c !== CHAR_COLON;
  }
  __name(isPlainSafeLast, "isPlainSafeLast");
  function codePointAt(string, pos) {
    const first = string.charCodeAt(pos);
    let second;
    if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
      second = string.charCodeAt(pos + 1);
      if (second >= 56320 && second <= 57343) {
        return (first - 55296) * 1024 + second - 56320 + 65536;
      }
    }
    return first;
  }
  __name(codePointAt, "codePointAt");
  function needIndentIndicator(string) {
    const leadingSpaceRe = /^\n* /;
    return leadingSpaceRe.test(string);
  }
  __name(needIndentIndicator, "needIndentIndicator");
  const STYLE_PLAIN = 1;
  const STYLE_SINGLE = 2;
  const STYLE_LITERAL = 3;
  const STYLE_FOLDED = 4;
  const STYLE_DOUBLE = 5;
  function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
    let i;
    let char = 0;
    let prevChar = null;
    let hasLineBreak = false;
    let hasFoldableLine = false;
    const shouldTrackWidth = lineWidth !== -1;
    let previousLineBreak = -1;
    let plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
    if (singleLineOnly || forceQuotes) {
      for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
        char = codePointAt(string, i);
        if (!isPrintable(char)) {
          return STYLE_DOUBLE;
        }
        plain = plain && isPlainSafe(char, prevChar, inblock);
        prevChar = char;
      }
    } else {
      for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
        char = codePointAt(string, i);
        if (char === CHAR_LINE_FEED) {
          hasLineBreak = true;
          if (shouldTrackWidth) {
            hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
            i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
            previousLineBreak = i;
          }
        } else if (!isPrintable(char)) {
          return STYLE_DOUBLE;
        }
        plain = plain && isPlainSafe(char, prevChar, inblock);
        prevChar = char;
      }
      hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
    }
    if (!hasLineBreak && !hasFoldableLine) {
      if (plain && !forceQuotes && !testAmbiguousType(string)) {
        return STYLE_PLAIN;
      }
      return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
    }
    if (indentPerLevel > 9 && needIndentIndicator(string)) {
      return STYLE_DOUBLE;
    }
    if (!forceQuotes) {
      return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
    }
    return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
  }
  __name(chooseScalarStyle, "chooseScalarStyle");
  function writeScalar(state, string, level, iskey, inblock) {
    state.dump = (function() {
      if (string.length === 0) {
        return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
      }
      if (!state.noCompatMode) {
        if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
          return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
        }
      }
      const indent = state.indent * Math.max(1, level);
      const lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
      const singleLineOnly = iskey || // No block styles in flow mode.
      state.flowLevel > -1 && level >= state.flowLevel;
      function testAmbiguity(string2) {
        return testImplicitResolving(state, string2);
      }
      __name(testAmbiguity, "testAmbiguity");
      switch (chooseScalarStyle(
        string,
        singleLineOnly,
        state.indent,
        lineWidth,
        testAmbiguity,
        state.quotingType,
        state.forceQuotes && !iskey,
        inblock
      )) {
        case STYLE_PLAIN:
          return string;
        case STYLE_SINGLE:
          return "'" + string.replace(/'/g, "''") + "'";
        case STYLE_LITERAL:
          return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
        case STYLE_FOLDED:
          return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
        case STYLE_DOUBLE:
          return '"' + escapeString(string) + '"';
        default:
          throw new YAMLException2("impossible error: invalid scalar style");
      }
    })();
  }
  __name(writeScalar, "writeScalar");
  function blockHeader(string, indentPerLevel) {
    const indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
    const clip = string[string.length - 1] === "\n";
    const keep = clip && (string[string.length - 2] === "\n" || string === "\n");
    const chomp = keep ? "+" : clip ? "" : "-";
    return indentIndicator + chomp + "\n";
  }
  __name(blockHeader, "blockHeader");
  function dropEndingNewline(string) {
    return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
  }
  __name(dropEndingNewline, "dropEndingNewline");
  function foldString(string, width) {
    const lineRe = /(\n+)([^\n]*)/g;
    let result = (function() {
      let nextLF = string.indexOf("\n");
      nextLF = nextLF !== -1 ? nextLF : string.length;
      lineRe.lastIndex = nextLF;
      return foldLine(string.slice(0, nextLF), width);
    })();
    let prevMoreIndented = string[0] === "\n" || string[0] === " ";
    let moreIndented;
    let match;
    while (match = lineRe.exec(string)) {
      const prefix = match[1];
      const line = match[2];
      moreIndented = line[0] === " ";
      result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
      prevMoreIndented = moreIndented;
    }
    return result;
  }
  __name(foldString, "foldString");
  function foldLine(line, width) {
    if (line === "" || line[0] === " ") return line;
    const breakRe = / [^ ]/g;
    let match;
    let start = 0;
    let end;
    let curr = 0;
    let next = 0;
    let result = "";
    while (match = breakRe.exec(line)) {
      next = match.index;
      if (next - start > width) {
        end = curr > start ? curr : next;
        result += "\n" + line.slice(start, end);
        start = end + 1;
      }
      curr = next;
    }
    result += "\n";
    if (line.length - start > width && curr > start) {
      result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
    } else {
      result += line.slice(start);
    }
    return result.slice(1);
  }
  __name(foldLine, "foldLine");
  function escapeString(string) {
    let result = "";
    let char = 0;
    for (let i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      const escapeSeq = ESCAPE_SEQUENCES[char];
      if (!escapeSeq && isPrintable(char)) {
        result += string[i];
        if (char >= 65536) result += string[i + 1];
      } else {
        result += escapeSeq || encodeHex(char);
      }
    }
    return result;
  }
  __name(escapeString, "escapeString");
  function writeFlowSequence(state, level, object) {
    let _result = "";
    const _tag = state.tag;
    for (let index = 0, length = object.length; index < length; index += 1) {
      let value = object[index];
      if (state.replacer) {
        value = state.replacer.call(object, String(index), value);
      }
      if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
        if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
        _result += state.dump;
      }
    }
    state.tag = _tag;
    state.dump = "[" + _result + "]";
  }
  __name(writeFlowSequence, "writeFlowSequence");
  function writeBlockSequence(state, level, object, compact) {
    let _result = "";
    const _tag = state.tag;
    for (let index = 0, length = object.length; index < length; index += 1) {
      let value = object[index];
      if (state.replacer) {
        value = state.replacer.call(object, String(index), value);
      }
      if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
        if (!compact || _result !== "") {
          _result += generateNextLine(state, level);
        }
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          _result += "-";
        } else {
          _result += "- ";
        }
        _result += state.dump;
      }
    }
    state.tag = _tag;
    state.dump = _result || "[]";
  }
  __name(writeBlockSequence, "writeBlockSequence");
  function writeFlowMapping(state, level, object) {
    let _result = "";
    const _tag = state.tag;
    const objectKeyList = Object.keys(object);
    for (let index = 0, length = objectKeyList.length; index < length; index += 1) {
      let pairBuffer = "";
      if (_result !== "") pairBuffer += ", ";
      if (state.condenseFlow) pairBuffer += '"';
      const objectKey = objectKeyList[index];
      let objectValue = object[objectKey];
      if (state.replacer) {
        objectValue = state.replacer.call(object, objectKey, objectValue);
      }
      if (!writeNode(state, level, objectKey, false, false)) {
        continue;
      }
      if (state.dump.length > 1024) pairBuffer += "? ";
      pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
      if (!writeNode(state, level, objectValue, false, false)) {
        continue;
      }
      pairBuffer += state.dump;
      _result += pairBuffer;
    }
    state.tag = _tag;
    state.dump = "{" + _result + "}";
  }
  __name(writeFlowMapping, "writeFlowMapping");
  function writeBlockMapping(state, level, object, compact) {
    let _result = "";
    const _tag = state.tag;
    const objectKeyList = Object.keys(object);
    if (state.sortKeys === true) {
      objectKeyList.sort();
    } else if (typeof state.sortKeys === "function") {
      objectKeyList.sort(state.sortKeys);
    } else if (state.sortKeys) {
      throw new YAMLException2("sortKeys must be a boolean or a function");
    }
    for (let index = 0, length = objectKeyList.length; index < length; index += 1) {
      let pairBuffer = "";
      if (!compact || _result !== "") {
        pairBuffer += generateNextLine(state, level);
      }
      const objectKey = objectKeyList[index];
      let objectValue = object[objectKey];
      if (state.replacer) {
        objectValue = state.replacer.call(object, objectKey, objectValue);
      }
      if (!writeNode(state, level + 1, objectKey, true, true, true)) {
        continue;
      }
      const explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
      if (explicitPair) {
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          pairBuffer += "?";
        } else {
          pairBuffer += "? ";
        }
      }
      pairBuffer += state.dump;
      if (explicitPair) {
        pairBuffer += generateNextLine(state, level);
      }
      if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
        continue;
      }
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        pairBuffer += ":";
      } else {
        pairBuffer += ": ";
      }
      pairBuffer += state.dump;
      _result += pairBuffer;
    }
    state.tag = _tag;
    state.dump = _result || "{}";
  }
  __name(writeBlockMapping, "writeBlockMapping");
  function detectType(state, object, explicit) {
    const typeList = explicit ? state.explicitTypes : state.implicitTypes;
    for (let index = 0, length = typeList.length; index < length; index += 1) {
      const type2 = typeList[index];
      if ((type2.instanceOf || type2.predicate) && (!type2.instanceOf || typeof object === "object" && object instanceof type2.instanceOf) && (!type2.predicate || type2.predicate(object))) {
        if (explicit) {
          if (type2.multi && type2.representName) {
            state.tag = type2.representName(object);
          } else {
            state.tag = type2.tag;
          }
        } else {
          state.tag = "?";
        }
        if (type2.represent) {
          const style = state.styleMap[type2.tag] || type2.defaultStyle;
          let _result;
          if (_toString.call(type2.represent) === "[object Function]") {
            _result = type2.represent(object, style);
          } else if (_hasOwnProperty.call(type2.represent, style)) {
            _result = type2.represent[style](object, style);
          } else {
            throw new YAMLException2("!<" + type2.tag + '> tag resolver accepts not "' + style + '" style');
          }
          state.dump = _result;
        }
        return true;
      }
    }
    return false;
  }
  __name(detectType, "detectType");
  function writeNode(state, level, object, block, compact, iskey, isblockseq) {
    state.tag = null;
    state.dump = object;
    if (!detectType(state, object, false)) {
      detectType(state, object, true);
    }
    const type2 = _toString.call(state.dump);
    const inblock = block;
    if (block) {
      block = state.flowLevel < 0 || state.flowLevel > level;
    }
    const objectOrArray = type2 === "[object Object]" || type2 === "[object Array]";
    let duplicateIndex;
    let duplicate;
    if (objectOrArray) {
      duplicateIndex = state.duplicates.indexOf(object);
      duplicate = duplicateIndex !== -1;
    }
    if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
      compact = false;
    }
    if (duplicate && state.usedDuplicates[duplicateIndex]) {
      state.dump = "*ref_" + duplicateIndex;
    } else {
      if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
        state.usedDuplicates[duplicateIndex] = true;
      }
      if (type2 === "[object Object]") {
        if (block && Object.keys(state.dump).length !== 0) {
          writeBlockMapping(state, level, state.dump, compact);
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + state.dump;
          }
        } else {
          writeFlowMapping(state, level, state.dump);
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + " " + state.dump;
          }
        }
      } else if (type2 === "[object Array]") {
        if (block && state.dump.length !== 0) {
          if (state.noArrayIndent && !isblockseq && level > 0) {
            writeBlockSequence(state, level - 1, state.dump, compact);
          } else {
            writeBlockSequence(state, level, state.dump, compact);
          }
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + state.dump;
          }
        } else {
          writeFlowSequence(state, level, state.dump);
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + " " + state.dump;
          }
        }
      } else if (type2 === "[object String]") {
        if (state.tag !== "?") {
          writeScalar(state, state.dump, level, iskey, inblock);
        }
      } else if (type2 === "[object Undefined]") {
        return false;
      } else {
        if (state.skipInvalid) return false;
        throw new YAMLException2("unacceptable kind of an object to dump " + type2);
      }
      if (state.tag !== null && state.tag !== "?") {
        let tagStr = encodeURI(
          state.tag[0] === "!" ? state.tag.slice(1) : state.tag
        ).replace(/!/g, "%21");
        if (state.tag[0] === "!") {
          tagStr = "!" + tagStr;
        } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
          tagStr = "!!" + tagStr.slice(18);
        } else {
          tagStr = "!<" + tagStr + ">";
        }
        state.dump = tagStr + " " + state.dump;
      }
    }
    return true;
  }
  __name(writeNode, "writeNode");
  function getDuplicateReferences(object, state) {
    const objects = [];
    const duplicatesIndexes = [];
    inspectNode(object, objects, duplicatesIndexes);
    const length = duplicatesIndexes.length;
    for (let index = 0; index < length; index += 1) {
      state.duplicates.push(objects[duplicatesIndexes[index]]);
    }
    state.usedDuplicates = new Array(length);
  }
  __name(getDuplicateReferences, "getDuplicateReferences");
  function inspectNode(object, objects, duplicatesIndexes) {
    if (object !== null && typeof object === "object") {
      const index = objects.indexOf(object);
      if (index !== -1) {
        if (duplicatesIndexes.indexOf(index) === -1) {
          duplicatesIndexes.push(index);
        }
      } else {
        objects.push(object);
        if (Array.isArray(object)) {
          for (let i = 0, length = object.length; i < length; i += 1) {
            inspectNode(object[i], objects, duplicatesIndexes);
          }
        } else {
          const objectKeyList = Object.keys(object);
          for (let i = 0, length = objectKeyList.length; i < length; i += 1) {
            inspectNode(object[objectKeyList[i]], objects, duplicatesIndexes);
          }
        }
      }
    }
  }
  __name(inspectNode, "inspectNode");
  function dump2(input, options) {
    options = options || {};
    const state = new State(options);
    if (!state.noRefs) getDuplicateReferences(input, state);
    let value = input;
    if (state.replacer) {
      value = state.replacer.call({ "": value }, "", value);
    }
    if (writeNode(state, 0, value, true, true)) return state.dump + "\n";
    return "";
  }
  __name(dump2, "dump2");
  dumper.dump = dump2;
  return dumper;
}
__name(requireDumper, "requireDumper");
var hasRequiredJsYaml;
function requireJsYaml() {
  if (hasRequiredJsYaml) return jsYaml;
  hasRequiredJsYaml = 1;
  const loader2 = requireLoader();
  const dumper2 = requireDumper();
  function renamed(from, to) {
    return function() {
      throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
    };
  }
  __name(renamed, "renamed");
  jsYaml.Type = requireType();
  jsYaml.Schema = requireSchema();
  jsYaml.FAILSAFE_SCHEMA = requireFailsafe();
  jsYaml.JSON_SCHEMA = requireJson();
  jsYaml.CORE_SCHEMA = requireCore();
  jsYaml.DEFAULT_SCHEMA = require_default();
  jsYaml.load = loader2.load;
  jsYaml.loadAll = loader2.loadAll;
  jsYaml.dump = dumper2.dump;
  jsYaml.YAMLException = requireException();
  jsYaml.types = {
    binary: requireBinary(),
    float: requireFloat(),
    map: requireMap(),
    null: require_null(),
    pairs: requirePairs(),
    set: requireSet(),
    timestamp: requireTimestamp(),
    bool: requireBool(),
    int: requireInt(),
    merge: requireMerge(),
    omap: requireOmap(),
    seq: requireSeq(),
    str: requireStr()
  };
  jsYaml.safeLoad = renamed("safeLoad", "load");
  jsYaml.safeLoadAll = renamed("safeLoadAll", "loadAll");
  jsYaml.safeDump = renamed("safeDump", "dump");
  return jsYaml;
}
__name(requireJsYaml, "requireJsYaml");
var jsYamlExports = requireJsYaml();
var yaml = /* @__PURE__ */ getDefaultExportFromCjs(jsYamlExports);
var {
  Type,
  Schema,
  FAILSAFE_SCHEMA,
  JSON_SCHEMA,
  CORE_SCHEMA,
  DEFAULT_SCHEMA,
  load,
  loadAll,
  dump,
  YAMLException,
  types,
  safeLoad,
  safeLoadAll,
  safeDump
} = yaml;

// ../protocol/dist/skill-utils.js
function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match)
    return {};
  let doc;
  try {
    doc = yaml.load(match[1]);
  } catch {
    return lenientFallback(match[1]);
  }
  if (!doc || typeof doc !== "object" || Array.isArray(doc))
    return {};
  const raw = doc;
  const result = {};
  Object.assign(result, normalizeSkillDetailMetadata(raw));
  const stringMap = [
    [["name"], "name"],
    [["summary-en", "summary"], "summary"],
    [["summary-cn", "summary-zh"], "summaryZh"],
    [["creator"], "creator"],
    [["guide-prompt"], "guidePrompt"],
    [["guide-prompt-en"], "guidePromptEn"],
    [["display-name-zh"], "displayNameZh"],
    [["version"], "version"],
    [["hash"], "hash"],
    [["tag-en"], "tagEn"],
    [["tag-cn"], "tagCn"],
    [["desc-en"], "descEn"],
    [["desc-cn"], "descCn"]
  ];
  for (const [keys, dst] of stringMap) {
    for (const k of keys) {
      const s = coerceString(raw[k]);
      if (s !== void 0) {
        result[dst] = s;
        break;
      }
    }
  }
  const desc = coerceString(raw.description);
  if (desc !== void 0)
    result.description = desc;
  const listMap = [
    [["allowed-tools", "tools"], "tools"],
    [["tags"], "tags"],
    [["tags-cn"], "tagsCn"],
    [["trigger-words"], "triggerWords"],
    [["agents"], "agents"]
  ];
  for (const [keys, dst] of listMap) {
    for (const k of keys) {
      const arr = coerceList(raw[k]);
      if (arr !== void 0) {
        result[dst] = arr;
        break;
      }
    }
  }
  const en = reconcileTag(raw["tag-en"], raw["complete-tags-en"]);
  if (en.single)
    result.tagEn = en.single;
  if (en.list.length > 0)
    result.completeTagsEn = en.list;
  const cn = reconcileTag(raw["tag-cn"], raw["complete-tags-cn"]);
  if (cn.single)
    result.tagCn = cn.single;
  if (cn.list.length > 0)
    result.completeTagsCn = cn.list;
  if (typeof raw.priority === "number" && Number.isFinite(raw.priority)) {
    result.priority = raw.priority;
  } else if (typeof raw.priority === "string") {
    const n = Number.parseInt(raw.priority, 10);
    if (Number.isFinite(n))
      result.priority = n;
  }
  const injectMode = coerceString(raw["inject-mode"]);
  if (injectMode === "append" || injectMode === "prepend") {
    result.injectMode = injectMode;
  }
  const AGENT_KEY_RE = /^allowed-tools-([a-zA-Z][a-zA-Z0-9_-]*)$/;
  const byAgent = {};
  for (const [key, value] of Object.entries(raw)) {
    const m = AGENT_KEY_RE.exec(key);
    if (!m)
      continue;
    const tools = coerceList(value);
    if (tools && tools.length > 0)
      byAgent[m[1]] = tools;
  }
  if (Object.keys(byAgent).length > 0)
    result.toolsByAgent = byAgent;
  return result;
}
__name(parseFrontmatter, "parseFrontmatter");
function coerceString(v) {
  if (v == null)
    return void 0;
  if (typeof v === "string") {
    const s = v.trim();
    return s ? s : void 0;
  }
  if (typeof v === "number" || typeof v === "boolean")
    return String(v);
  return void 0;
}
__name(coerceString, "coerceString");
function coerceList(v) {
  if (v == null)
    return void 0;
  if (Array.isArray(v)) {
    const arr = v.map((item) => item == null ? "" : String(item)).map((s) => s.trim()).filter(Boolean);
    return arr.length > 0 ? arr : void 0;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s)
      return void 0;
    const arr = s.split(/[\s,]+/).filter(Boolean);
    return arr.length > 0 ? arr : void 0;
  }
  return void 0;
}
__name(coerceList, "coerceList");
function lenientFallback(yamlText) {
  const stringMap = [
    [["name"], "name"],
    [["summary-en", "summary"], "summary"],
    [["summary-cn", "summary-zh"], "summaryZh"],
    [["creator"], "creator"],
    [["display-name-zh"], "displayNameZh"],
    [["version"], "version"],
    [["hash"], "hash"],
    [["tag-en"], "tagEn"],
    [["tag-cn"], "tagCn"]
  ];
  const result = {};
  for (const [keys, dst] of stringMap) {
    for (const k of keys) {
      const v = lenientStringField(yamlText, k);
      if (v !== void 0) {
        result[dst] = v;
        break;
      }
    }
  }
  return result;
}
__name(lenientFallback, "lenientFallback");
function lenientStringField(yamlText, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}:\\s*(.*?)\\s*$`, "m");
  const m = re.exec(yamlText);
  if (!m)
    return void 0;
  const raw = m[1];
  if (!raw)
    return void 0;
  const s = raw.trim();
  if (s.length >= 2 && (s.startsWith('"') && s.endsWith('"') || s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1) || void 0;
  }
  return s || void 0;
}
__name(lenientStringField, "lenientStringField");
function toStringArray(v) {
  if (Array.isArray(v))
    return v.filter((x) => typeof x === "string" && x !== "");
  if (typeof v === "string" && v)
    return [v];
  return [];
}
__name(toStringArray, "toStringArray");
function firstString(v) {
  if (Array.isArray(v)) {
    const first = v.find((x) => typeof x === "string" && x !== "");
    return first ?? "";
  }
  if (typeof v === "string")
    return v;
  return "";
}
__name(firstString, "firstString");
function reconcileTag(tagRaw, completeRaw) {
  const complete = toStringArray(completeRaw);
  const single = firstString(tagRaw) || complete[0] || "";
  if (complete.length > 0) {
    return { single, list: complete };
  }
  const list = toStringArray(tagRaw);
  return { single, list };
}
__name(reconcileTag, "reconcileTag");
var SKILL_MEDIA_HOSTS = /* @__PURE__ */ new Set(["cdn.hailuoai.com", "cdn.hailuoai.video"]);
var SKILL_SUBMISSION_MEDIA_HOST = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\.oss-[a-z0-9-]+\.aliyuncs\.com$/;
var SKILL_SUBMISSION_SHOWCASE_PATH = /^\/creator-plan\/[1-9]\d*\/[A-Za-z0-9._-]+\/showcase-\d+\.(mp4|webm|mov)$/;
function isSkillShowcaseUrl(value) {
  if (typeof value !== "string")
    return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return false;
    return SKILL_MEDIA_HOSTS.has(url.hostname) && /\.(mp4|webm|mov|gif|png|jpe?g|webp|jfif)$/i.test(url.pathname) || SKILL_SUBMISSION_MEDIA_HOST.test(url.hostname) && !url.hostname.includes("-internal.") && SKILL_SUBMISSION_SHOWCASE_PATH.test(decodeURIComponent(url.pathname));
  } catch {
    return false;
  }
}
__name(isSkillShowcaseUrl, "isSkillShowcaseUrl");
function skillMetadataRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
__name(skillMetadataRecord, "skillMetadataRecord");
function normalizeSkillDetailMetadata(raw) {
  const result = {};
  if (Array.isArray(raw.showcase)) {
    const media = [...new Set(raw.showcase.filter(isSkillShowcaseUrl))];
    result.showcase = media;
  } else {
    const media = [raw.showcase, raw.showcaseUrl, raw.showcase_url].find(isSkillShowcaseUrl);
    if (media)
      result.showcase = [media];
  }
  const localized = skillMetadataRecord(raw.structuredInfo ?? raw.structured_info ?? raw["structured-info"]);
  const legacyBest = raw.bestFor ?? raw.best_for ?? raw["best-for"];
  const legacyHow = raw.howToUse ?? raw.how_to_use ?? raw["how-to-use"];
  const hasLegacyDetails = [
    "bestFor",
    "best_for",
    "best-for",
    "howToUse",
    "how_to_use",
    "how-to-use",
    "outputs"
  ].some((key) => Object.hasOwn(raw, key));
  const legacyLocale = normalizeSkillContentLocale(raw.contentLocale ?? raw.content_locale ?? raw["content-locale"]);
  const info = {};
  for (const locale of ["zh-CN", "en-US"]) {
    const legacySummary = (locale === "zh-CN" ? [raw.summaryZh, raw.summary_zh, raw.summary_cn, raw["summary-cn"], raw.summary] : [raw.summary, raw.summary_en, raw["summary-en"]]).find((value) => typeof value === "string" && value.trim());
    const entry = skillMetadataRecord(localized?.[locale]) ?? (!localized && hasLegacyDetails && locale === legacyLocale ? {
      summary: legacySummary,
      best_for: legacyBest,
      how_to_use: legacyHow,
      outputs: raw.outputs
    } : void 0);
    if (!entry)
      continue;
    const summary = typeof entry.summary === "string" ? entry.summary.trim() : "";
    const how = entry.how_to_use ?? entry["how-to-use"];
    const best = entry.best_for ?? entry["best-for"];
    info[locale] = {
      summary,
      best_for: Array.isArray(best) ? best.filter((v) => typeof v === "string" && !!v.trim()).map((v) => v.trim()) : [],
      how_to_use: typeof how === "string" ? how.trim() : "",
      outputs: typeof entry.outputs === "string" ? entry.outputs.trim() : ""
    };
  }
  if (localized || Object.keys(info).length)
    result.structuredInfo = info;
  return result;
}
__name(normalizeSkillDetailMetadata, "normalizeSkillDetailMetadata");

// ../protocol/dist/text-versions.js
var TEXT_VERSION_MAX_STORED_BYTES_PER_DOCUMENT = 512 * 1024 * 1024;
var TEXT_VERSION_WORKSPACE_SOFT_QUOTA_BYTES = 5 * 1024 * 1024 * 1024;
var TEXT_VERSION_AGENT_COLLAPSE_WINDOW_MS = 5 * 60 * 1e3;
var TEXT_VERSION_TIER_S_MAX_BYTES = 1024 * 1024;
var TEXT_VERSION_TIER_M_MAX_BYTES = 8 * 1024 * 1024;
var TEXT_VERSION_CONTENT_CHUNK_MAX_BYTES = 512 * 1024;

// ../protocol/dist/tool-confirm.js
var TOOL_CONFIRM_TIMEOUT_ENV = "HILO_TOOL_CONFIRM_TIMEOUT_MS";
var TOOL_CONFIRM_DEFAULT_TIMEOUT_MS = 3e5;
var TOOL_CONFIRM_TRANSPORT_GRACE_MS = 1e4;
var MAX_DECISION_TIMEOUT_MS = 2147483647 - TOOL_CONFIRM_TRANSPORT_GRACE_MS;
var TOOL_CONFIRM_REJECT_REASONS = [
  "user_rejected",
  "confirmation_expired",
  "confirmation_unavailable"
];
function normalizeToolConfirmTimeoutMs(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > MAX_DECISION_TIMEOUT_MS) {
    return TOOL_CONFIRM_DEFAULT_TIMEOUT_MS;
  }
  const normalized = Math.floor(value);
  return normalized === 0 ? TOOL_CONFIRM_DEFAULT_TIMEOUT_MS : normalized;
}
__name(normalizeToolConfirmTimeoutMs, "normalizeToolConfirmTimeoutMs");
function resolveToolConfirmTransportTimeoutMs(value) {
  return normalizeToolConfirmTimeoutMs(value) + TOOL_CONFIRM_TRANSPORT_GRACE_MS;
}
__name(resolveToolConfirmTransportTimeoutMs, "resolveToolConfirmTransportTimeoutMs");
function isToolConfirmRejectReason(value) {
  return typeof value === "string" && TOOL_CONFIRM_REJECT_REASONS.includes(value);
}
__name(isToolConfirmRejectReason, "isToolConfirmRejectReason");
function formatToolConfirmRejectReasonMarker(reason) {
  return `[tool-confirm-reject:${reason}]`;
}
__name(formatToolConfirmRejectReasonMarker, "formatToolConfirmRejectReasonMarker");

// ../protocol/dist/updater-domain.js
var UPDATE_DISMISS_REMINDER_MS = 2 * 60 * 60 * 1e3;

// ../protocol/dist/windows-compat.js
var WINDOWS_VERSION_UNSUPPORTED_DIAGNOSIS_CODE = "windows_version_unsupported";
var WINDOWS_VERSION_UNSUPPORTED_ERROR_MARKER = `[${WINDOWS_VERSION_UNSUPPORTED_DIAGNOSIS_CODE}]`;
var WINDOWS_VERSION_UNVERIFIED_DIAGNOSIS_CODE = "windows_version_unverified";
var WINDOWS_VERSION_UNVERIFIED_ERROR_MARKER = `[${WINDOWS_VERSION_UNVERIFIED_DIAGNOSIS_CODE}]`;
var WINDOWS_CPU_UNSUPPORTED_DIAGNOSIS_CODE = "windows_cpu_unsupported";
var WINDOWS_CPU_UNSUPPORTED_ERROR_MARKER = `[${WINDOWS_CPU_UNSUPPORTED_DIAGNOSIS_CODE}]`;

// ../protocol/dist/working-language.js
var FRANC_LANGUAGE_TO_LOCALE = {
  arb: "ar",
  ben: "bn",
  ces: "cs",
  cmn: "zh-Hans",
  deu: "de",
  eng: "en",
  fra: "fr",
  heb: "he",
  hin: "hi",
  hun: "hu",
  ind: "id",
  ita: "it",
  jpn: "ja",
  kor: "ko",
  nld: "nl",
  pol: "pl",
  por: "pt",
  ron: "ro",
  rus: "ru",
  spa: "es",
  swe: "sv",
  tha: "th",
  tur: "tr",
  ukr: "uk",
  vie: "vi"
};
var FRANC_LANGUAGE_CODES = Object.keys(FRANC_LANGUAGE_TO_LOCALE);

// ../protocol/dist/workspace-migration.js
var WORKSPACE_DATABASE_MIGRATION_CONFLICT_CODE = "workspace_database_migration_conflict";
var WORKSPACE_DATABASE_MIGRATION_FAILED_CODE = "workspace_database_migration_failed";
var WORKSPACE_DATABASE_SCHEMA_AHEAD_CODE = "workspace_database_schema_ahead";
var WORKSPACE_DATABASE_RECOVERY_REQUIRED_CODE = "workspace_database_recovery_required";
var WORKSPACE_DATABASE_MIGRATION_CONFLICT_MARKER = `[${WORKSPACE_DATABASE_MIGRATION_CONFLICT_CODE}]`;
var WORKSPACE_DATABASE_MIGRATION_FAILED_MARKER = `[${WORKSPACE_DATABASE_MIGRATION_FAILED_CODE}]`;
var WORKSPACE_DATABASE_SCHEMA_AHEAD_MARKER = `[${WORKSPACE_DATABASE_SCHEMA_AHEAD_CODE}]`;
var WORKSPACE_DATABASE_RECOVERY_REQUIRED_MARKER = `[${WORKSPACE_DATABASE_RECOVERY_REQUIRED_CODE}]`;

// ../protocol/dist/ws.js
var BROWSER_CHAT_CONTEXT_TAG = "browser_context";
var BROWSER_CHAT_CONTEXT_WRAPPER_RE = new RegExp(`^<${BROWSER_CHAT_CONTEXT_TAG}\\b[^>]*>[\\s\\S]*?</${BROWSER_CHAT_CONTEXT_TAG}>(?:\\n\\n([\\s\\S]*))?$`);
var LOOP_GUARD_DEFAULT_DECISION_TIMEOUT_MS = 3e4;
var LOOP_GUARD_MAX_DECISION_TIMEOUT_MS = 6e4;
var LOOP_GUARD_TRANSPORT_GRACE_MS = 2e3;
function normalizeLoopGuardDecisionTimeoutMs(value, fallbackMs = LOOP_GUARD_DEFAULT_DECISION_TIMEOUT_MS) {
  const safeFallback = Number.isFinite(fallbackMs) && fallbackMs > 0 ? Math.min(Math.max(1, Math.floor(fallbackMs)), LOOP_GUARD_MAX_DECISION_TIMEOUT_MS) : LOOP_GUARD_DEFAULT_DECISION_TIMEOUT_MS;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return safeFallback;
  }
  return Math.min(Math.max(1, Math.floor(value)), LOOP_GUARD_MAX_DECISION_TIMEOUT_MS);
}
__name(normalizeLoopGuardDecisionTimeoutMs, "normalizeLoopGuardDecisionTimeoutMs");

// ../protocol/dist/skill-paths.js
import * as fs from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";
var HUB_ROOT_SEGMENTS = ["Movies", "Hub"];
function hubRoot(context) {
  const region = context?.region ?? process.env.HILO_RELEASE_REGION;
  const channel = context?.channel ?? process.env.HILO_RELEASE_CHANNEL;
  if (region !== void 0 || channel !== void 0) {
    const parts = [];
    if (region === "overseas")
      parts.push("global");
    switch (channel) {
      case "staging":
        parts.push("staging");
        break;
      case "test":
        parts.push("test");
        break;
      case "dev":
        parts.push("dev");
        break;
      case "prod":
      case void 0:
        break;
      default:
        break;
    }
    const suffix = parts.length > 0 ? `-${parts.join("-")}` : "";
    return path.join(homedir(), `.hub${suffix}`);
  }
  const nodeEnv = process.env.NODE_ENV;
  let hubEnv;
  if (nodeEnv === "production") {
    hubEnv = "";
  } else if (nodeEnv === "development" || !nodeEnv) {
    hubEnv = "-dev";
  } else {
    hubEnv = `-${nodeEnv}`;
  }
  return path.join(homedir(), `.hub${hubEnv}`);
}
__name(hubRoot, "hubRoot");
function installedSkillsDir(context) {
  const envDir = process.env.HUB_SKILLS_DIR;
  if (envDir)
    return envDir;
  return path.join(hubRoot(context), "skills");
}
__name(installedSkillsDir, "installedSkillsDir");
function userSkillsDir() {
  return path.join(homedir(), ...HUB_ROOT_SEGMENTS, "skills");
}
__name(userSkillsDir, "userSkillsDir");
function allSkillsDirs(context) {
  const extras = parseExtraSkillsDirs();
  const dirs = [userSkillsDir(), installedSkillsDir(context), ...extras];
  const seen = /* @__PURE__ */ new Set();
  return dirs.filter((d) => {
    if (seen.has(d))
      return false;
    seen.add(d);
    return true;
  });
}
__name(allSkillsDirs, "allSkillsDirs");
function parseExtraSkillsDirs() {
  const raw = process.env.EXTRA_SKILLS_DIRS;
  if (!raw)
    return [];
  const out = [];
  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed)
      continue;
    const expanded = trimmed.startsWith("~/") ? path.join(homedir(), trimmed.slice(2)) : trimmed === "~" ? homedir() : trimmed;
    const absolute = path.resolve(expanded);
    if (!out.includes(absolute))
      out.push(absolute);
  }
  return out;
}
__name(parseExtraSkillsDirs, "parseExtraSkillsDirs");
function scanSkillDirs(dirs) {
  const seen = /* @__PURE__ */ new Map();
  const versions = /* @__PURE__ */ new Map();
  for (const dir of dirs) {
    if (!fs.existsSync(dir))
      continue;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink())
        continue;
      const skillMdPath = path.join(dir, entry.name, "SKILL.md");
      if (!fs.existsSync(skillMdPath))
        continue;
      let name = entry.name;
      let version;
      try {
        const content = fs.readFileSync(skillMdPath, "utf-8");
        const meta = parseFrontmatter(content);
        if (meta.name)
          name = meta.name;
        if (meta.version)
          version = meta.version;
      } catch {
      }
      if (!seen.has(name)) {
        seen.set(name, path.join(dir, entry.name));
        if (version)
          versions.set(name, version);
      }
    }
  }
  return { paths: Array.from(seen.values()), versions };
}
__name(scanSkillDirs, "scanSkillDirs");
function resolvedSkillPaths(context) {
  return scanSkillDirs(allSkillsDirs(context));
}
__name(resolvedSkillPaths, "resolvedSkillPaths");

// src/_session-agent-cache.ts
var SESSION_AGENT_CACHE_MAX = 1024;
var sessionAgentCache = /* @__PURE__ */ new Map();
function rememberSessionAgent(sessionID, agentName) {
  if (sessionAgentCache.has(sessionID)) sessionAgentCache.delete(sessionID);
  sessionAgentCache.set(sessionID, agentName);
  if (sessionAgentCache.size > SESSION_AGENT_CACHE_MAX) {
    const oldest = sessionAgentCache.keys().next().value;
    if (oldest !== void 0) sessionAgentCache.delete(oldest);
  }
}
__name(rememberSessionAgent, "rememberSessionAgent");

// src/gateway-identity.ts
function withGatewayIdentity(init = {}) {
  const claim = process.env[HILO_WORKSPACE_IDENTITY_ENV]?.trim();
  if (!claim) return init;
  const headers = new Headers(init.headers);
  const instanceId = process.env[HILO_WORKSPACE_INSTANCE_ENV]?.trim();
  const generation = Number(process.env[HILO_WORKSPACE_GENERATION_ENV]);
  if (instanceId && Number.isSafeInteger(generation) && generation > 0) {
    for (const [key, value] of Object.entries(
      workspaceGatewayIdentityHeaders({ claim, instanceId, generation })
    )) {
      headers.set(key, value);
    }
  } else {
    headers.set(HILO_WORKSPACE_IDENTITY_HEADER, claim);
  }
  return { ...init, headers };
}
__name(withGatewayIdentity, "withGatewayIdentity");

// src/_session-skill-grants.ts
var SESSION_LIMIT = 1024;
var ROOT_LIMIT = 1024;
var sessionGrants = /* @__PURE__ */ new Map();
var loadedSkills = /* @__PURE__ */ new Map();
var sessionAgentRefs = /* @__PURE__ */ new Map();
var sessionRootCache = /* @__PURE__ */ new Map();
function lruSet(map2, key, value, limit) {
  if (map2.has(key)) map2.delete(key);
  map2.set(key, value);
  if (map2.size > limit) {
    const oldest = map2.keys().next().value;
    if (oldest !== void 0) map2.delete(oldest);
  }
}
__name(lruSet, "lruSet");
function rememberAgentRef(sessionId, agent) {
  lruSet(sessionAgentRefs, sessionId, agent, SESSION_LIMIT);
}
__name(rememberAgentRef, "rememberAgentRef");
function getAgentRef(sessionId) {
  return sessionAgentRefs.get(sessionId);
}
__name(getAgentRef, "getAgentRef");
function recordGrant(rootSessionId, agentName, tools) {
  let agentMap = sessionGrants.get(rootSessionId);
  if (!agentMap) {
    agentMap = /* @__PURE__ */ new Map();
    lruSet(sessionGrants, rootSessionId, agentMap, ROOT_LIMIT);
  }
  let bucket = agentMap.get(agentName);
  if (!bucket) {
    bucket = /* @__PURE__ */ new Set();
    agentMap.set(agentName, bucket);
  }
  for (const t of tools) {
    if (t.startsWith("hub_")) bucket.add(t);
  }
}
__name(recordGrant, "recordGrant");
function recordSkillLoaded(rootSessionId, skillName) {
  let skills = loadedSkills.get(rootSessionId);
  if (!skills) {
    skills = /* @__PURE__ */ new Set();
    lruSet(loadedSkills, rootSessionId, skills, ROOT_LIMIT);
  }
  skills.add(skillName);
}
__name(recordSkillLoaded, "recordSkillLoaded");
function hasSkillLoaded(rootSessionId, skillName) {
  return loadedSkills.get(rootSessionId)?.has(skillName) === true;
}
__name(hasSkillLoaded, "hasSkillLoaded");
function getGrants(rootSessionId) {
  return sessionGrants.get(rootSessionId);
}
__name(getGrants, "getGrants");
var ROOT_FETCH_TIMEOUT_MS = 2e3;
async function resolveRootSession(sessionId, gatewayUrl) {
  const cached = sessionRootCache.get(sessionId);
  if (cached !== void 0) return cached;
  const url = `${gatewayUrl}/api/internal/sessions/${sessionId}/root`;
  try {
    const resp = await fetch(
      url,
      withGatewayIdentity({ signal: AbortSignal.timeout(ROOT_FETCH_TIMEOUT_MS) })
    );
    if (!resp.ok) {
      console.warn(`[hilo-plugin] resolveRootSession ${url} \u2192 HTTP ${resp.status}`);
      return sessionId;
    }
    const data = await resp.json();
    const root = data.rootSessionId ?? sessionId;
    lruSet(sessionRootCache, sessionId, root, SESSION_LIMIT);
    return root;
  } catch (err) {
    console.warn(
      `[hilo-plugin] resolveRootSession ${url} threw: ${err instanceof Error ? err.message : String(err)}`
    );
    return sessionId;
  }
}
__name(resolveRootSession, "resolveRootSession");

// src/_session-working-language.ts
var SESSION_LIMIT2 = 2048;
var contexts = /* @__PURE__ */ new Map();
function lruSet2(key, value) {
  if (contexts.has(key)) contexts.delete(key);
  contexts.set(key, value);
  if (contexts.size > SESSION_LIMIT2) {
    const oldest = contexts.keys().next().value;
    if (oldest !== void 0) contexts.delete(oldest);
  }
}
__name(lruSet2, "lruSet");
function rememberWorkingLanguage(sessionId, context) {
  lruSet2(sessionId, context);
}
__name(rememberWorkingLanguage, "rememberWorkingLanguage");
function getWorkingLanguage(sessionId) {
  if (!sessionId) return void 0;
  return contexts.get(sessionId);
}
__name(getWorkingLanguage, "getWorkingLanguage");
function getWorkingLanguageForSessions(sessionIds) {
  for (const sessionId of sessionIds) {
    const context = contexts.get(sessionId);
    if (context) return context;
  }
  return void 0;
}
__name(getWorkingLanguageForSessions, "getWorkingLanguageForSessions");

// src/attachment-inputs.ts
import { fileURLToPath } from "node:url";
function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
__name(record, "record");
function localPaths(values) {
  return [
    ...new Set(
      values.flatMap((value) => {
        if (typeof value !== "string" || !value.trim()) return [];
        const path7 = value.trim();
        if (path7.startsWith("file:")) {
          try {
            return [fileURLToPath(path7)];
          } catch {
            return [];
          }
        }
        if (/^[a-z][a-z0-9+.-]*:/i.test(path7) && !/^[a-z]:[\\/]/i.test(path7)) return [];
        return [path7];
      })
    )
  ].slice(0, 32);
}
__name(localPaths, "localPaths");
function userAttachmentPaths(parts) {
  const paths = [];
  for (const rawPart of parts) {
    const part = record(rawPart);
    if (!part) continue;
    if (part.type === "file" && typeof part.url === "string" && part.url.startsWith("file:")) {
      paths.push(part.url);
    }
    if (part.type !== "text" || typeof part.text !== "string") continue;
    const manifest = /^\[User attached files:\n([\s\S]*?)\]\n\n/.exec(part.text);
    if (!manifest) continue;
    for (const line of manifest[1].split("\n")) {
      if (!line.trim()) break;
      if (!line.startsWith("- ")) continue;
      paths.push(
        line.slice(2).replace(/^\[\d+\]\s*/, "").replace(/^(?:image|video|audio|text|file):\s*/, "")
      );
    }
  }
  return localPaths(paths);
}
__name(userAttachmentPaths, "userAttachmentPaths");
function toolAttachmentPaths(args) {
  const input = record(args);
  if (!input) return [];
  const paths = [];
  for (const [key, value] of Object.entries(input)) {
    if (!/^(?:file|input|source|image|video|audio|reference)_paths?$/.test(key)) continue;
    paths.push(...Array.isArray(value) ? value : [value]);
  }
  return localPaths(paths);
}
__name(toolAttachmentPaths, "toolAttachmentPaths");
function reportAttachmentObservationFailure(sessionId, error) {
  try {
    console.warn(
      `[hilo-plugin] attachment observation failed session=${sessionId}: ${error instanceof Error ? error.message : String(error)}`
    );
  } catch {
  }
}
__name(reportAttachmentObservationFailure, "reportAttachmentObservationFailure");
async function observeAttachmentInputs(gatewayUrl, sessionId, paths, tool) {
  if (!sessionId || paths.length === 0) return [];
  try {
    const response = await fetch(
      `${gatewayUrl.replace(/\/+$/, "")}/api/internal/sessions/${encodeURIComponent(sessionId)}/attachment-observations`,
      withGatewayIdentity({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          paths,
          direction: "input",
          ...tool ? { tool_call_id: tool.callId, chat_turn_id: tool.chatTurnId } : { scope: "message" }
        }),
        signal: AbortSignal.timeout(2e3)
      })
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = record(await response.json());
    if (!Array.isArray(body?.attachment_refs)) return [];
    return body.attachment_refs.flatMap((raw) => {
      const ref = record(raw);
      return ref?.attachment_source === "asset_vault" && typeof ref.attachment_id === "string" && ref.attachment_id.trim() ? [{ attachment_source: "asset_vault", attachment_id: ref.attachment_id }] : [];
    });
  } catch (error) {
    reportAttachmentObservationFailure(sessionId, error);
    return [];
  }
}
__name(observeAttachmentInputs, "observeAttachmentInputs");

// src/browser-skill-gate.ts
import { existsSync as existsSync2 } from "node:fs";
import * as path2 from "node:path";
var CONTROL_IN_APP_BROWSER_SKILL = "control-in-app-browser";
var BrowserSkillRequiredError = class extends Error {
  static {
    __name(this, "BrowserSkillRequiredError");
  }
  code = "BROWSER_SKILL_REQUIRED";
  skill = CONTROL_IN_APP_BROWSER_SKILL;
  constructor() {
    super(
      'BROWSER_SKILL_REQUIRED: call skill({ "name": "control-in-app-browser" }) as the only tool call in one assistant step, wait for its complete body, then retry this hub_browser action. One successful load covers the rest of this session.'
    );
    this.name = "BrowserSkillRequiredError";
  }
};
function isBrowserSkillLoadResult(args, resultText) {
  const name = args?.name;
  if (name !== CONTROL_IN_APP_BROWSER_SKILL) return false;
  return typeof resultText === "string" && resultText.trim().length > 0;
}
__name(isBrowserSkillLoadResult, "isBrowserSkillLoadResult");
var browserSkillSeenOnDisk = false;
function isBrowserSkillInstalled(dirs = allSkillsDirs()) {
  if (browserSkillSeenOnDisk) return true;
  browserSkillSeenOnDisk = dirs.some(
    (dir) => existsSync2(path2.join(dir, CONTROL_IN_APP_BROWSER_SKILL, "SKILL.md"))
  );
  return browserSkillSeenOnDisk;
}
__name(isBrowserSkillInstalled, "isBrowserSkillInstalled");

// src/compaction-continue-rewrite.ts
var CONTINUE_MARKERS = [
  "Continue if you have next steps",
  "The previous request exceeded the provider's size limit"
];
var INSTRUCTION_MARKER = "[language]";
function languageInstruction(preferredLanguage) {
  const preferred = preferredLanguage?.toLowerCase();
  if (preferred?.startsWith("zh")) {
    return `${INSTRUCTION_MARKER} \u8BF7\u7528\u4E2D\u6587\u56DE\u590D\u3002`;
  }
  if (preferred?.startsWith("en")) {
    return `${INSTRUCTION_MARKER} Respond in English.`;
  }
  if (preferred?.startsWith("ja")) {
    return `${INSTRUCTION_MARKER} \u65E5\u672C\u8A9E\u3067\u8FD4\u7B54\u3057\u3066\u304F\u3060\u3055\u3044\u3002`;
  }
  if (preferred?.startsWith("ko")) {
    return `${INSTRUCTION_MARKER} \uD55C\uAD6D\uC5B4\uB85C \uB2F5\uBCC0\uD558\uC138\uC694.`;
  }
  if (preferred) {
    return `${INSTRUCTION_MARKER} Respond using the ${preferredLanguage} locale.`;
  }
  const lang = (process.env.HILO_USER_LANG ?? "").toLowerCase();
  if (lang.startsWith("zh")) {
    return `${INSTRUCTION_MARKER} \u8BF7\u7528\u4E2D\u6587\u56DE\u590D\u3002`;
  }
  if (lang.startsWith("en")) {
    return `${INSTRUCTION_MARKER} Respond in English.`;
  }
  return `${INSTRUCTION_MARKER} Respond in the same language the user has been using in this conversation.`;
}
__name(languageInstruction, "languageInstruction");
function isContinuePromptText(text) {
  return CONTINUE_MARKERS.some((m) => text.includes(m));
}
__name(isContinuePromptText, "isContinuePromptText");
function hasPendingCompactionContinuePrompt(messages) {
  for (const rawMsg of messages) {
    const msg = rawMsg;
    if (msg?.info?.role !== "user") continue;
    for (const rawPart of msg.parts ?? []) {
      const part = rawPart;
      if (!part || typeof part !== "object") continue;
      if (part.type !== "text" || part.synthetic !== true) continue;
      const text = typeof part.text === "string" ? part.text : "";
      if (isContinuePromptText(text) && !text.includes(INSTRUCTION_MARKER)) return true;
    }
  }
  return false;
}
__name(hasPendingCompactionContinuePrompt, "hasPendingCompactionContinuePrompt");
function rewriteCompactionContinueLanguage(messages, preferredLanguage) {
  const instruction = languageInstruction(preferredLanguage);
  let rewritten = 0;
  for (const rawMsg of messages) {
    const msg = rawMsg;
    if (msg?.info?.role !== "user") continue;
    for (const rawPart of msg.parts ?? []) {
      const part = rawPart;
      if (!part || typeof part !== "object") continue;
      if (part.type !== "text") continue;
      if (part.synthetic !== true) continue;
      const text = typeof part.text === "string" ? part.text : "";
      if (!isContinuePromptText(text)) continue;
      if (text.includes(INSTRUCTION_MARKER)) continue;
      part.text = `${text}

${instruction}`;
      rewritten++;
    }
  }
  return rewritten;
}
__name(rewriteCompactionContinueLanguage, "rewriteCompactionContinueLanguage");

// src/connector-access.ts
var originalTools = /* @__PURE__ */ new WeakMap();
function filterConnectorMessageTools(message, access) {
  const current = message.tools ?? {};
  const base = originalTools.get(current) ?? current;
  const filtered = new Proxy(base, {
    get(target, key, receiver) {
      if (typeof key === "string" && access.managedPrefixes.some(
        (prefix) => key.startsWith(prefix) && !access.allowedPrefixes.includes(prefix)
      ))
        return false;
      return Reflect.get(target, key, receiver);
    }
  });
  originalTools.set(filtered, base);
  message.tools = filtered;
}
__name(filterConnectorMessageTools, "filterConnectorMessageTools");
async function connectorAccess(gateway, sessionId) {
  const response = await fetch(
    `${gateway}/api/connectors/capability-access`,
    withGatewayIdentity({
      headers: { "x-session-id": sessionId },
      signal: AbortSignal.timeout(8e3)
    })
  );
  if (!response.ok)
    throw new Error("CONNECTOR_ACCESS_UNAVAILABLE: retry after the workspace is ready.");
  const value = await response.json();
  if (!value || typeof value !== "object") throw new Error("CONNECTOR_ACCESS_INVALID");
  const access = value;
  const strings = /* @__PURE__ */ __name((value2) => Array.isArray(value2) && value2.every((item) => typeof item === "string" && /^[a-zA-Z0-9_-]+_$/.test(item)), "strings");
  const connectorIds = /* @__PURE__ */ __name((value2) => Array.isArray(value2) && value2.every(
    (id) => typeof id === "string" && (isMarketConnectorId(id) || isConfiguredConnectorId(id))
  ), "connectorIds");
  if (access.allowedConnectorIds !== void 0 && !connectorIds(access.allowedConnectorIds) || access.discoveredConnectorIds !== void 0 && !connectorIds(access.discoveredConnectorIds) || !strings(access.managedPrefixes) || !strings(access.allowedPrefixes) || access.pendingTarget !== void 0 && typeof access.pendingTarget !== "string")
    throw new Error("CONNECTOR_ACCESS_INVALID");
  return {
    allowedConnectorIds: connectorIds(access.allowedConnectorIds) ? access.allowedConnectorIds : [],
    discoveredConnectorIds: connectorIds(access.discoveredConnectorIds) ? access.discoveredConnectorIds : [],
    managedPrefixes: access.managedPrefixes,
    allowedPrefixes: access.allowedPrefixes,
    ...typeof access.pendingTarget === "string" ? { pendingTarget: access.pendingTarget } : {}
  };
}
__name(connectorAccess, "connectorAccess");
async function guardConnectorTool(gateway, sessionId, tool, args) {
  const access = await connectorAccess(gateway, sessionId);
  if (access.pendingTarget) {
    if (tool !== "hub_capability_search")
      throw new Error(
        `CONNECTOR_DISCOVERY_REQUIRED: first call hub_capability_search with targetConnectorId=${access.pendingTarget}.`
      );
    args.targetConnectorId = access.pendingTarget;
  }
  const prefix = access.managedPrefixes.find((candidate) => tool.startsWith(candidate));
  if (prefix && !access.allowedPrefixes.includes(prefix))
    throw new Error(
      "CONNECTOR_SELECTION_REQUIRED: wait for the user to select and connect using the capability card."
    );
}
__name(guardConnectorTool, "guardConnectorTool");
async function consumeConnectorContinuation(gateway, sessionId, parts) {
  const text = parts.flatMap(
    (part) => part && typeof part === "object" && "type" in part && part.type === "text" && "text" in part && typeof part.text === "string" ? [part.text] : []
  ).join("\n");
  const selectionId = /\[connector-selection:([a-f0-9-]{36})\]/.exec(text)?.[1];
  if (!selectionId) return;
  const response = await fetch(
    `${gateway}/api/connectors/capability-selection`,
    withGatewayIdentity({
      method: "POST",
      headers: { "Content-Type": "application/json", "x-session-id": sessionId },
      body: JSON.stringify({ action: "consume", selectionId }),
      signal: AbortSignal.timeout(8e3)
    })
  );
  if (!response.ok)
    throw new Error(
      "CONNECTOR_CONTINUATION_REJECTED: task already sent, cancelled or connector no longer ready."
    );
}
__name(consumeConnectorContinuation, "consumeConnectorContinuation");

// src/load-memory-context.ts
import * as fs2 from "node:fs";
import { homedir as homedir2 } from "node:os";
import * as path3 from "node:path";
var DEFAULT_BUDGET_BYTES = 4096;
var INDEX_FILENAME = "MEMORY.md";
var MEMORY_TYPES2 = /* @__PURE__ */ new Set([
  "user",
  "feedback",
  "project",
  "reference",
  "media-style",
  "asset-pin"
]);
function hubRoot2() {
  const region = process.env.HILO_RELEASE_REGION;
  const channel = process.env.HILO_RELEASE_CHANNEL;
  if (region !== void 0 || channel !== void 0) {
    const parts = [];
    if (region === "overseas") parts.push("global");
    if (channel === "staging" || channel === "test" || channel === "dev") {
      parts.push(channel);
    }
    const suffix = parts.length > 0 ? `-${parts.join("-")}` : "";
    return path3.join(homedir2(), `.hub${suffix}`);
  }
  const nodeEnv = process.env.NODE_ENV;
  let hubEnv;
  if (nodeEnv === "production") {
    hubEnv = "";
  } else if (nodeEnv === "development" || !nodeEnv) {
    hubEnv = "-dev";
  } else {
    hubEnv = `-${nodeEnv}`;
  }
  return path3.join(homedir2(), `.hub${hubEnv}`);
}
__name(hubRoot2, "hubRoot");
function userMemoryDir() {
  const envDir = process.env.HUB_MEMORY_DIR;
  if (envDir) return envDir;
  return path3.join(hubRoot2(), "memory");
}
__name(userMemoryDir, "userMemoryDir");
function projectMemoryDir(projectRoot) {
  return path3.join(projectRoot, ".hilo", "memory");
}
__name(projectMemoryDir, "projectMemoryDir");
function workspaceStoragePath(projectRoot) {
  return path3.join(projectRoot, ".hilo", "storage.json");
}
__name(workspaceStoragePath, "workspaceStoragePath");
function shouldIncludeUserMemory(projectRoot) {
  if (projectRoot) {
    try {
      const raw = fs2.readFileSync(workspaceStoragePath(projectRoot), "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const preferences = parsed.preferences;
        if (preferences && typeof preferences === "object" && !Array.isArray(preferences)) {
          const value = preferences.loadUserMemory;
          if (typeof value === "boolean") return value;
        }
      }
    } catch {
    }
  }
  return process.env.HILO_LOAD_USER_MEMORY !== "0";
}
__name(shouldIncludeUserMemory, "shouldIncludeUserMemory");
function parseHeader(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return void 0;
  const yaml2 = match[1];
  const pick = /* @__PURE__ */ __name((key) => {
    const m = yaml2.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    if (!m) return void 0;
    const raw = m[1].trim();
    if (raw.length === 0) return void 0;
    if (raw.startsWith('"') && raw.endsWith('"') || raw.startsWith("'") && raw.endsWith("'")) {
      return raw.slice(1, -1);
    }
    return raw;
  }, "pick");
  const name = pick("name");
  const description = pick("description");
  const type2 = pick("type");
  if (!name || !description || !type2) return void 0;
  if (!MEMORY_TYPES2.has(type2)) return void 0;
  return { name, description, type: type2 };
}
__name(parseHeader, "parseHeader");
function scanScope(dir, scope) {
  if (!fs2.existsSync(dir)) return [];
  let entries;
  try {
    entries = fs2.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    console.warn(
      `[hilo-plugin] memory scope=${scope} dir=${dir} unreadable: ${err.message}`
    );
    return [];
  }
  const out = [];
  for (const entry of entries) {
    if (!entry.isFile() && !entry.isSymbolicLink()) continue;
    if (!entry.name.endsWith(".md")) continue;
    if (entry.name === INDEX_FILENAME) continue;
    const filePath = path3.join(dir, entry.name);
    let raw;
    let mtimeMs;
    try {
      raw = fs2.readFileSync(filePath, "utf-8");
      mtimeMs = fs2.statSync(filePath).mtimeMs;
    } catch (err) {
      console.warn(`[hilo-plugin] memory entry ${filePath} unreadable: ${err.message}`);
      continue;
    }
    const header = parseHeader(raw);
    if (!header) {
      console.warn(
        `[hilo-plugin] memory entry ${filePath} missing/invalid frontmatter (name/description/type), skipped`
      );
      continue;
    }
    out.push({
      scope,
      name: header.name,
      type: header.type,
      description: header.description,
      mtimeMs
    });
  }
  return out;
}
__name(scanScope, "scanScope");
var AGGREGATE_TOOL_LEXICON = {
  ref: /* @__PURE__ */ __name((action) => `hub_memory({action:'${action}'})`, "ref"),
  refWithName: /* @__PURE__ */ __name((action) => `hub_memory({action:'${action}', name})`, "refWithName"),
  family: "hub_memory",
  hint: "You can call the `hub_memory` tool with an `action` arg (`list` / `read` / `write` / `delete` / `search`) to manage memory entries. Refer to memory only when relevant; do not dump all entries."
};
function buildMemoryUsageRules(lex) {
  return `## Memory usage rules

You are a multimodal co-creator. Memory is your long-term style + asset memory
across sessions, not a notepad for the current generation. Bias toward NOT saving.

When to save:
- media-style (project): user expresses a stable preference for the **whole project / series** \u2014
  visual style, color grading, composition, default size, default duration, default voice, etc.
  Examples: "this project uses cinematic cool tones", "always use voice_id=xxx for narration"
- asset-pin (project): user explicitly says "use this as the main character", "remember this
  asset", "lock this anchor". MUST include asset_uri + asset_modality.
- project: project-level world-building / character bible / brand constraint / delivery deadline.
  Examples: "main character is Mochi the orange cat", "client forbids red tones", "deliver Friday"
- feedback: user **corrects** or **explicitly confirms** a non-obvious working pattern.
  Examples: "stop generating 4 candidates per round, too slow", "yes, storyboard first then batch generate is right"
- user: user identity / creative domain (write once, then leave alone).
  Example: "indie game artist, mixed pixel + oil-painting style"
- reference: external moodboard / Pinterest board / Linear tickets \u2014 only when user explicitly
  asks you to remember the link. Lowest priority for media work; skip unless user insists.

When NOT to save:
- one-off experimental prompts ("let me try cinematic this round") \u2014 next round may pivot
- a normal generation result \u2014 never asset-pin unless user explicitly anchors it
- the user's current edit request ("make this one darker") \u2014 that is task context, not long-term memory
- inferred aesthetic preferences \u2014 never speak for the user; require an explicit "I like / always"
- per-session model / parameter picks \u2014 only persist when user says "use this from now on"

When to update vs create:
- An existing media-style for this project? ${lex.ref("read")} first, then merge incrementally \u2014
  do not create a new entry per micro-preference.
- A better version of an existing asset-pin character? overwrite the same name, keep the name stable.
- Always ${lex.ref("list")} at the start of a session to surface project anchors.

## How to call memory tools

- The bullet list above is \`<name> [<type>] \u2014 <description>\`, where **name is
  the frontmatter \`name\` field** (kebab-case, no underscores). Pass that
  exact value to \`${lex.refWithName("read")}\`/\`${lex.refWithName("delete")}\` \u2014 do not pass the on-disk
  filename stem like \`user_image-style-preference\` or \`asset_pin_xxx\`.
- \`projectRoot\` is **auto-injected** by the runtime for every \`${lex.family}\` call,
  so you can omit it. (Pass it only when you genuinely need to point at a
  different project \u2014 almost never.)
- Always \`${lex.ref("list")}\` once at the start of a session to surface project
  anchors, then \`${lex.ref("read")}\` only what's relevant.

Recommended body template for media-style:
\`\`\`markdown
## \u98CE\u683C\u5173\u952E\u8BCD / Style keywords
cinematic, cool tone, low-key lighting

## \u9ED8\u8BA4\u53C2\u6570 / Defaults
- image: aspect_ratio=16:9, model=banana
- video: duration=5s, model=hilo-official
- audio: voice_id=xxx (\u63CF\u8FF0\u97F3\u8272)

## \u907F\u514D / Avoid
- \u8FC7\u9971\u548C\u8272
- anime \u98CE
\`\`\`
This structure lets sub-agents lift the relevant block straight into their generation prompts.`;
}
__name(buildMemoryUsageRules, "buildMemoryUsageRules");
function renderEntryLine(entry) {
  return `- ${entry.name} [${entry.type}] \u2014 ${entry.description}`;
}
__name(renderEntryLine, "renderEntryLine");
function utf8Bytes(s) {
  return Buffer.byteLength(s, "utf8");
}
__name(utf8Bytes, "utf8Bytes");
async function loadMemoryContext(opts = {}) {
  const budgetBytes = opts.budgetBytes ?? DEFAULT_BUDGET_BYTES;
  const includeUserMemory = opts.includeUserMemory ?? true;
  const usageRules = buildMemoryUsageRules(AGGREGATE_TOOL_LEXICON);
  const toolsHint = AGGREGATE_TOOL_LEXICON.hint;
  const listToolRef = AGGREGATE_TOOL_LEXICON.ref("list");
  const projectEntries = opts.projectRoot ? scanScope(projectMemoryDir(opts.projectRoot), "project") : [];
  const rawUserEntries = includeUserMemory ? scanScope(userMemoryDir(), "user") : [];
  const projectNames = new Set(projectEntries.map((e) => e.name));
  const userEntries = rawUserEntries.filter((e) => !projectNames.has(e.name));
  projectEntries.sort((a, b) => b.mtimeMs - a.mtimeMs);
  userEntries.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const totalEntries = projectEntries.length + userEntries.length;
  if (totalEntries === 0) {
    return { prompt: "", truncated: 0, totalEntries: 0 };
  }
  const header = "# Memory Context";
  const projectHeader = "## Project memory (current workspace)";
  const userHeader = "## User memory (cross-project)";
  const sections = [header];
  let bytes = utf8Bytes(header);
  let truncated = 0;
  const appendSection = /* @__PURE__ */ __name((title, items) => {
    if (items.length === 0) return;
    const headerCost = utf8Bytes(`

${title}`);
    if (bytes + headerCost > budgetBytes) {
      truncated += items.length;
      return;
    }
    sections.push(title);
    bytes += headerCost;
    for (const entry of items) {
      const line = renderEntryLine(entry);
      const cost = utf8Bytes(`
${line}`);
      if (bytes + cost > budgetBytes) {
        truncated += 1;
        continue;
      }
      sections.push(line);
      bytes += cost;
    }
  }, "appendSection");
  appendSection(projectHeader, projectEntries);
  appendSection(userHeader, userEntries);
  if (truncated > 0) {
    sections.push(`[... ${truncated} more entries truncated, use ${listToolRef} to see all]`);
  }
  sections.push(usageRules);
  sections.push(toolsHint);
  const prompt = collapseBlocks(sections);
  return { prompt, truncated, totalEntries };
}
__name(loadMemoryContext, "loadMemoryContext");
function collapseBlocks(parts) {
  const blocks = [];
  let buffer = [];
  const flush = /* @__PURE__ */ __name(() => {
    if (buffer.length > 0) {
      blocks.push(buffer.join("\n"));
      buffer = [];
    }
  }, "flush");
  for (const part of parts) {
    if (part.startsWith("- ") || part.startsWith("[... ")) {
      buffer.push(part);
    } else {
      flush();
      buffer.push(part);
    }
  }
  flush();
  return blocks.join("\n\n");
}
__name(collapseBlocks, "collapseBlocks");

// src/loop-guard/ask-client.ts
import { randomUUID } from "node:crypto";
async function askUserViaGateway(gatewayUrl, input, timeoutMs = readTimeoutMs()) {
  const sessionUrl = `${gatewayUrl.replace(/\/+$/, "")}/api/internal/sessions/${encodeURIComponent(input.sessionID)}/loop-guard`;
  const requestId = randomUUID();
  const decisionTimeoutMs = normalizeLoopGuardDecisionTimeoutMs(timeoutMs);
  try {
    const resp = await fetch(
      `${sessionUrl}/ask`,
      withGatewayIdentity({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tool: input.tool,
          hits: input.hits,
          window: input.window,
          recent_tools: input.recentTools,
          fingerprint: input.fingerprint,
          request_id: requestId,
          timeout_ms: decisionTimeoutMs
        }),
        signal: AbortSignal.timeout(decisionTimeoutMs + LOOP_GUARD_TRANSPORT_GRACE_MS)
      })
    );
    if (!resp.ok) {
      console.warn(
        `[hilo-plugin] [loop-guard] ask HTTP ${resp.status} session=${input.sessionID} tool=${input.tool}; reconciling before reject`
      );
      return await reconcileDecision(sessionUrl, requestId) ?? "reject";
    }
    const body = await resp.json();
    const decision = parseDecision(body);
    if (!decision) {
      console.warn(
        `[hilo-plugin] [loop-guard] ask got malformed body=${JSON.stringify(body)}; reconciling before reject`
      );
      return await reconcileDecision(sessionUrl, requestId) ?? "reject";
    }
    return decision;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[hilo-plugin] [loop-guard] ask failed session=${input.sessionID} tool=${input.tool}: ${msg}; reconciling before reject`
    );
    return await reconcileDecision(sessionUrl, requestId) ?? "reject";
  }
}
__name(askUserViaGateway, "askUserViaGateway");
async function reconcileDecision(sessionUrl, requestId) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(
        `${sessionUrl}/settlements/${encodeURIComponent(requestId)}`,
        withGatewayIdentity({
          method: "GET",
          signal: AbortSignal.timeout(LOOP_GUARD_TRANSPORT_GRACE_MS)
        })
      );
      if (!response.ok) return null;
      const body = await response.json();
      if (!body || typeof body !== "object" || body.status !== "settled") {
        return null;
      }
      return parseDecision(body);
    } catch {
    }
  }
  return null;
}
__name(reconcileDecision, "reconcileDecision");
function readTimeoutMs() {
  const raw = process.env.LOOP_GUARD_ASK_TIMEOUT_MS;
  if (!raw) return LOOP_GUARD_DEFAULT_DECISION_TIMEOUT_MS;
  return normalizeLoopGuardDecisionTimeoutMs(Number(raw));
}
__name(readTimeoutMs, "readTimeoutMs");
function parseDecision(body) {
  if (!body || typeof body !== "object") return null;
  const d = body.decision;
  if (d === "allow_once" || d === "allow_session" || d === "reject") return d;
  return null;
}
__name(parseDecision, "parseDecision");

// src/loop-guard/call-history.ts
var CallHistory = class {
  static {
    __name(this, "CallHistory");
  }
  map = /* @__PURE__ */ new Map();
  maxPerSession;
  maxSessions;
  idleTTLms;
  constructor(opts = {}) {
    this.maxPerSession = opts.maxPerSession ?? 20;
    this.maxSessions = opts.maxSessions ?? 200;
    this.idleTTLms = opts.idleTTLms ?? 30 * 60 * 1e3;
  }
  push(sessionID, rec) {
    let q = this.map.get(sessionID);
    if (!q) {
      this.evictIdle(rec.ts);
      this.evictLRU();
      q = [];
      this.map.set(sessionID, q);
    } else {
      this.map.delete(sessionID);
      this.map.set(sessionID, q);
    }
    q.push(rec);
    if (q.length > this.maxPerSession) q.shift();
  }
  recent(sessionID, n) {
    const q = this.map.get(sessionID);
    if (!q || q.length === 0) return [];
    if (n >= q.length) return q.slice();
    return q.slice(q.length - n);
  }
  drop(sessionID) {
    this.map.delete(sessionID);
  }
  /** 当前活跃 session 数（测试用）。 */
  size() {
    return this.map.size;
  }
  evictIdle(now) {
    if (this.map.size === 0) return;
    for (const [sid, q] of this.map) {
      const last = q[q.length - 1]?.ts ?? 0;
      if (now - last > this.idleTTLms) this.map.delete(sid);
    }
  }
  evictLRU() {
    while (this.map.size >= this.maxSessions) {
      const oldest = this.map.keys().next();
      if (oldest.done || oldest.value === void 0) break;
      this.map.delete(oldest.value);
    }
  }
};

// src/loop-guard/fingerprint.ts
import { createHash } from "node:crypto";
var sha8 = /* @__PURE__ */ __name((s) => createHash("sha1").update(s).digest("hex").slice(0, 16), "sha8");
var VIDEO_GEN_TOOLS = /* @__PURE__ */ new Set(["generate_video"]);
var AUDIO_GEN_TOOLS = /* @__PURE__ */ new Set([
  "generate_audio_speech",
  "generate_audio_music",
  "voice_prepare",
  "lyrics_generation"
]);
var READ_TOOLS = /* @__PURE__ */ new Set(["read", "Read", "view", "hub_read"]);
var TASK_TOOLS = /* @__PURE__ */ new Set(["task"]);
function normalizeTool(t) {
  return t.replace(/^hub_/, "");
}
__name(normalizeTool, "normalizeTool");
function normPrompt(p) {
  if (typeof p !== "string") return "";
  return p.toLowerCase().replace(/[^a-z0-9一-龥\s]/g, "").replace(/\s+/g, " ").trim().slice(0, 32);
}
__name(normPrompt, "normPrompt");
function bucketDuration(d) {
  if (typeof d !== "number" || !Number.isFinite(d)) return "na";
  return String(Math.round(d / 3) * 3);
}
__name(bucketDuration, "bucketDuration");
function setHash(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  return sha8([...arr].map(String).sort().join("|"));
}
__name(setHash, "setHash");
function asString(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}
__name(asString, "asString");
function fpVideoGen(tool, a) {
  const parts = [
    tool,
    asString(a.model_name ?? a.model),
    bucketDuration(a.duration),
    asString(a.ratio ?? a.aspect_ratio),
    asString(a.resolution),
    asString(a.first_frame_image_path ?? a.first_frame_image),
    asString(a.last_frame_image_path ?? a.last_frame_image),
    setHash(a.reference_image_paths ?? a.first_frame_images),
    setHash(a.reference_video_urls),
    setHash(a.reference_audio_urls),
    setHash(a.avatar_asset_ids),
    normPrompt(a.prompt)
  ];
  return `vgen|${sha8(parts.join("||"))}`;
}
__name(fpVideoGen, "fpVideoGen");
function fpAudioGen(tool, a) {
  const textsFp = Array.isArray(a.texts) ? sha8(
    a.texts.map((t) => normPrompt(t)).sort().join("|")
  ) : (
    // Speech and music modes use different prompt field names.
    normPrompt(a.texts ?? a.text ?? a.text_prompt ?? a.prompt ?? a.lyrics)
  );
  const parts = [
    tool,
    asString(a.model_id ?? a.model ?? a.model_name),
    asString(a.voice_id),
    setHash(a.voice_ids),
    // Reference-conditioned inputs diversify otherwise identical calls.
    setHash(a.reference_audio_paths),
    asString(a.reference_image_path),
    asString(a.emotion),
    asString(a.language),
    textsFp
  ];
  return `agen|${sha8(parts.join("||"))}`;
}
__name(fpAudioGen, "fpAudioGen");
function fpRead(_tool, a) {
  const path7 = asString(a.filePath ?? a.path ?? a.file_path);
  return `read|${path7}`;
}
__name(fpRead, "fpRead");
function fpTask(_tool, a) {
  const sub = asString(a.subagent_type);
  const desc = normPrompt(a.description ?? a.prompt);
  return `task|${sub}|${sha8(desc)}`;
}
__name(fpTask, "fpTask");
function fpDefault(tool, args) {
  let json2 = "";
  try {
    json2 = JSON.stringify(args ?? null);
  } catch {
    json2 = String(args);
  }
  return `default|${tool}|${sha8(json2)}`;
}
__name(fpDefault, "fpDefault");
function fingerprint(tool, args) {
  if (args == null || typeof args !== "object") {
    return fpDefault(tool, args);
  }
  const norm = normalizeTool(tool);
  const a = args;
  if (VIDEO_GEN_TOOLS.has(norm)) return fpVideoGen(norm, a);
  if (AUDIO_GEN_TOOLS.has(norm)) return fpAudioGen(norm, a);
  if (READ_TOOLS.has(norm)) return fpRead(norm, a);
  if (TASK_TOOLS.has(norm)) return fpTask(norm, a);
  return fpDefault(tool, args);
}
__name(fingerprint, "fingerprint");

// src/loop-guard/session-allow-list.ts
var DEFAULT_MAX_SESSIONS = 200;
var DEFAULT_MAX_FINGERPRINTS_PER_SESSION = 64;
var SessionAllowList = class {
  static {
    __name(this, "SessionAllowList");
  }
  entries = /* @__PURE__ */ new Map();
  maxSessions;
  maxFingerprintsPerSession;
  constructor(options = {}) {
    this.maxSessions = positiveInteger(options.maxSessions, DEFAULT_MAX_SESSIONS);
    this.maxFingerprintsPerSession = positiveInteger(
      options.maxFingerprintsPerSession,
      DEFAULT_MAX_FINGERPRINTS_PER_SESSION
    );
  }
  has(sessionId, fingerprint2) {
    const entry = this.entries.get(sessionId);
    if (!entry) return false;
    this.touchSession(sessionId, entry);
    if (!entry.fingerprints.has(fingerprint2)) return false;
    entry.fingerprints.delete(fingerprint2);
    entry.fingerprints.add(fingerprint2);
    return true;
  }
  add(sessionId, fingerprint2) {
    let entry = this.entries.get(sessionId);
    if (!entry) {
      this.evictSessionsForInsert();
      entry = { fingerprints: /* @__PURE__ */ new Set() };
    }
    this.touchSession(sessionId, entry);
    if (entry.fingerprints.has(fingerprint2)) {
      entry.fingerprints.delete(fingerprint2);
      entry.fingerprints.add(fingerprint2);
      return;
    }
    while (entry.fingerprints.size >= this.maxFingerprintsPerSession) {
      const oldest = entry.fingerprints.values().next().value;
      if (typeof oldest !== "string") break;
      entry.fingerprints.delete(oldest);
    }
    entry.fingerprints.add(fingerprint2);
  }
  size() {
    return this.entries.size;
  }
  touchSession(sessionId, entry) {
    this.entries.delete(sessionId);
    this.entries.set(sessionId, entry);
  }
  evictSessionsForInsert() {
    while (this.entries.size >= this.maxSessions) {
      const oldest = this.entries.keys().next().value;
      if (typeof oldest !== "string") break;
      this.entries.delete(oldest);
    }
  }
};
function positiveInteger(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.max(1, Math.floor(value)) : fallback;
}
__name(positiveInteger, "positiveInteger");

// src/loop-guard/index.ts
var LoopGuardError = class extends Error {
  static {
    __name(this, "LoopGuardError");
  }
  code = "LOOP_GUARD_BLOCK";
  tool;
  sessionID;
  hits;
  window;
  constructor(message, details) {
    super(message);
    this.name = "LoopGuardError";
    this.tool = details.tool;
    this.sessionID = details.sessionID;
    this.hits = details.hits;
    this.window = details.window;
  }
};
var defaultOnAsk = /* @__PURE__ */ __name(async () => "reject", "defaultOnAsk");
function createLoopGuard(opts = {}) {
  const window = opts.window ?? 5;
  const threshold = opts.threshold ?? 3;
  const history = new CallHistory(opts.history);
  const allowed = new SessionAllowList(opts.allowList);
  const onAsk = opts.onAsk ?? defaultOnAsk;
  const inFlightAsks = /* @__PURE__ */ new Map();
  const sessionAskTails = /* @__PURE__ */ new Map();
  const enqueueSessionAsk = /* @__PURE__ */ __name((input) => {
    const previous = sessionAskTails.get(input.sessionID);
    const decisionPromise = previous ? previous.then(() => askForDecision(onAsk, input)) : askForDecision(onAsk, input);
    const tail = decisionPromise.then(() => void 0);
    sessionAskTails.set(input.sessionID, tail);
    void tail.then(() => {
      if (sessionAskTails.get(input.sessionID) === tail) {
        sessionAskTails.delete(input.sessionID);
      }
    });
    return decisionPromise;
  }, "enqueueSessionAsk");
  return {
    fingerprintOf(tool, args) {
      return fingerprint(tool, args);
    },
    async check({ sessionID, tool, args }) {
      const fp = fingerprint(tool, args);
      if (allowed.has(sessionID, fp)) return;
      const recent = history.recent(sessionID, window);
      let hits = 0;
      for (const r of recent) if (r.fp === fp) hits++;
      if (hits + 1 < threshold) return;
      const askKey = JSON.stringify([sessionID, fp]);
      let decisionPromise = inFlightAsks.get(askKey);
      const ownsAllowOnce = decisionPromise === void 0;
      if (!decisionPromise) {
        decisionPromise = enqueueSessionAsk({
          sessionID,
          tool,
          fingerprint: fp,
          hits: hits + 1,
          window,
          recent
        });
        inFlightAsks.set(askKey, decisionPromise);
      }
      let decision;
      try {
        decision = await decisionPromise;
      } finally {
        if (inFlightAsks.get(askKey) === decisionPromise) inFlightAsks.delete(askKey);
      }
      if (decision === "allow_session") allowed.add(sessionID, fp);
      if (decision === "reject" || decision === "allow_once" && !ownsAllowOnce) {
        const message = decision === "allow_once" ? buildConcurrentDuplicateBlockMessage({ tool, hits: hits + 1, window, recent }) : buildBlockMessage({ tool, hits: hits + 1, window, recent });
        throw new LoopGuardError(message, {
          tool,
          sessionID,
          hits: hits + 1,
          window
        });
      }
    },
    record({ sessionID, tool, args }) {
      const fp = fingerprint(tool, args);
      history.push(sessionID, { fp, tool, ts: Date.now() });
    },
    resetSession(sessionID) {
      history.drop(sessionID);
    },
    _history: history,
    _allowedSessionCount: /* @__PURE__ */ __name(() => allowed.size(), "_allowedSessionCount")
  };
}
__name(createLoopGuard, "createLoopGuard");
async function askForDecision(onAsk, input) {
  try {
    return await onAsk(input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[loop-guard] onAsk threw (${msg}); defaulting to reject`);
    return "reject";
  }
}
__name(askForDecision, "askForDecision");
function buildConcurrentDuplicateBlockMessage(ctx) {
  const distinctTools = [...new Set(ctx.recent.map((r) => r.tool))].join(", ");
  return [
    `LoopGuard blocked a concurrent duplicate of tool "${ctx.tool}" after the user allowed one matching call.`,
    "",
    "The one-time allowance has already been assigned to the first waiting call. This duplicate was not authorized.",
    "",
    `Recent tools in window: ${distinctTools || "(none)"}.`,
    "",
    "Do not retry the same call. Wait for the allowed call to finish, use a different approach, or ask the user before continuing."
  ].join("\n");
}
__name(buildConcurrentDuplicateBlockMessage, "buildConcurrentDuplicateBlockMessage");
function buildBlockMessage(ctx) {
  const distinctTools = [...new Set(ctx.recent.map((r) => r.tool))].join(", ");
  return [
    `LoopGuard blocked: tool "${ctx.tool}" was called with semantically-identical arguments ${ctx.hits} times within the last ${ctx.window} tool calls.`,
    "",
    "The user (or default policy) chose to abort. Repeating this call will produce the same outcome.",
    "",
    `Recent tools in window: ${distinctTools || "(none)"}.`,
    "",
    "Choose ONE of:",
    "  1. Different tool / different model (e.g. seedance \u2192 kling, or t2v \u2192 multimodal).",
    "  2. Substantially different prompt (not a one-word tweak \u2014 change subject, action, or scene).",
    '  3. Stop and ask the user via the "question" tool \u2014 explain what you tried and what failed.',
    "",
    "Do NOT retry with another small parameter tweak; LoopGuard fingerprints ignore minor changes (\xB12s duration, prompt rewording, read offset)."
  ].join("\n");
}
__name(buildBlockMessage, "buildBlockMessage");

// src/media-models-cache.ts
var FETCH_TIMEOUT_MS = 5e3;
var EMPTY = { models: [] };
async function fetchMediaModels(gatewayUrl) {
  const url = `${gatewayUrl.replace(/\/+$/, "")}/api/models`;
  try {
    const resp = await fetch(
      url,
      withGatewayIdentity({ signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    );
    if (!resp.ok) {
      console.warn(`[hilo-plugin] models catalog fetch ${url} \u2192 HTTP ${resp.status}`);
      return EMPTY;
    }
    const parsed = parseMediaModelsResponse(await resp.json());
    if (!parsed.valid) {
      console.warn(`[hilo-plugin] models catalog fetch ${url} returned invalid schema`);
    }
    const models = parsed.models;
    console.log(`[hilo-plugin] models catalog fetched ${models.length} media models`);
    return { models };
  } catch (err) {
    console.warn(
      `[hilo-plugin] models catalog fetch ${url} threw: ${err instanceof Error ? err.message : String(err)}`
    );
    return EMPTY;
  }
}
__name(fetchMediaModels, "fetchMediaModels");
function parseMediaModelsResponse(data) {
  if (!isRecord2(data)) return { models: [], valid: false };
  const categories = [data.imageModels, data.videoModels, data.audioModels];
  if (!categories.every(Array.isArray)) return { models: [], valid: false };
  return {
    models: categories.flatMap((models) => models.flatMap(normalizeModelInfo)),
    valid: true
  };
}
__name(parseMediaModelsResponse, "parseMediaModelsResponse");
function normalizeModelInfo(raw) {
  if (!isRecord2(raw)) return [];
  const id = readString2(raw.id);
  const type2 = readString2(raw.type);
  const toolNames = readStringArray2(raw.tool_names);
  if (!id || !type2 || toolNames.length === 0) return [];
  return [
    {
      id,
      type: type2,
      display_name: readString2(raw.display_name) ?? id,
      description: readString2(raw.description) ?? "",
      tool_names: toolNames,
      visibility: readString2(raw.visibility) ?? "",
      icon_url: readString2(raw.icon_url) ?? "",
      series_id: readString2(raw.series_id) ?? "",
      hot: raw.hot === true
    }
  ];
}
__name(normalizeModelInfo, "normalizeModelInfo");
function readString2(value) {
  return typeof value === "string" ? value : void 0;
}
__name(readString2, "readString");
function readStringArray2(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.length > 0);
}
__name(readStringArray2, "readStringArray");
function isRecord2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
__name(isRecord2, "isRecord");

// src/model-trace-capture.ts
import { randomUUID as randomUUID2 } from "node:crypto";
var registryKey = /* @__PURE__ */ Symbol.for("hilo.model-trace-capture.v1");
var globals = globalThis;
function registry() {
  globals[registryKey] ??= { owners: /* @__PURE__ */ new Map(), lastStartedAt: 0 };
  return globals[registryKey];
}
__name(registry, "registry");
function readContext(raw) {
  if (!raw || raw.length > 4096) return void 0;
  try {
    const value = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof value !== "object" || value === null) return void 0;
    const data = value;
    if (!isChatModelTraceId(data.ownerId)) return void 0;
    const mapped = mapChatModelTrace({
      ...data,
      call_id: "validation",
      trace_id: "validation",
      started_at: 1,
      status_code: 200
    });
    if (!mapped) return void 0;
    return {
      ownerId: data.ownerId,
      context: {
        session_id: mapped.session_id,
        request_id: mapped.request_id,
        agent: mapped.agent,
        model_id: mapped.model_id
      }
    };
  } catch {
    return void 0;
  }
}
__name(readContext, "readContext");
function isResponsesRequest(input, init) {
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");
  if (method.toUpperCase() !== "POST") return false;
  try {
    const url = new URL(input instanceof Request ? input.url : String(input));
    return /^https?:$/.test(url.protocol) && /\/responses\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}
__name(isResponsesRequest, "isResponsesRequest");
async function reportTrace(owner, trace, send) {
  for (let attempt = 0; attempt < 2 && !owner.disposed; attempt++) {
    const controller = new AbortController();
    owner.controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), 1500);
    let removeAbortListener = /* @__PURE__ */ __name(() => {
    }, "removeAbortListener");
    try {
      const aborted = new Promise((_resolve, reject) => {
        const abort = /* @__PURE__ */ __name(() => reject(new Error("trace_report_aborted")), "abort");
        controller.signal.addEventListener("abort", abort, { once: true });
        removeAbortListener = /* @__PURE__ */ __name(() => controller.signal.removeEventListener("abort", abort), "removeAbortListener");
      });
      await Promise.race([
        (async () => {
          const response = await send(`${owner.gatewayUrl}${CHAT_MODEL_TRACES_PATH}`, {
            method: "POST",
            headers: owner.headers,
            body: JSON.stringify(trace),
            signal: controller.signal
          });
          if (!response.ok) throw new Error("trace_report_http_error");
          const acknowledgement = await response.json();
          if (typeof acknowledgement !== "object" || acknowledgement === null || !("call_id" in acknowledgement) || acknowledgement.call_id !== trace.call_id) {
            throw new Error("trace_report_invalid_ack");
          }
        })(),
        aborted
      ]);
      return;
    } catch {
      if (owner.disposed) return;
      if (attempt === 1) {
        console.warn(
          `[hilo-plugin] model trace report failed after 2 attempts; call_id=${trace.call_id}`
        );
      }
    } finally {
      clearTimeout(timeout);
      removeAbortListener();
      owner.controllers.delete(controller);
    }
  }
}
__name(reportTrace, "reportTrace");
function installSanitizer(state) {
  if (globalThis.fetch === state.wrapper) return;
  const send = globalThis.fetch;
  const wrapper = /* @__PURE__ */ __name(async (input, init) => {
    if (isResponsesRequest(input, init) && typeof init?.body === "string") {
      try {
        const body = JSON.parse(init.body);
        if (typeof body === "object" && body !== null) {
          const reasoning = "reasoning" in body ? body.reasoning : void 0;
          const effort = typeof reasoning === "object" && reasoning !== null && "effort" in reasoning ? reasoning.effort : void 0;
          console.log(
            `[hilo-plugin] model-request ${JSON.stringify({
              endpoint: "responses",
              model: "model" in body && typeof body.model === "string" ? body.model : null,
              reasoning_effort: effort === void 0 ? null : typeof effort === "string" && /^(none|minimal|low|medium|high|xhigh|max|ultra)$/.test(effort) ? effort : "unrecognized"
            })}`
          );
        }
      } catch {
      }
    }
    const requestHeaders = input instanceof Request ? input.headers : void 0;
    const headers = new Headers(init?.headers ?? requestHeaders);
    const raw = headers.get(CHAT_MODEL_TRACE_CONTEXT_HEADER);
    if (!raw && !requestHeaders?.has(CHAT_MODEL_TRACE_CONTEXT_HEADER)) return send(input, init);
    headers.delete(CHAT_MODEL_TRACE_CONTEXT_HEADER);
    let cleanInput = input;
    if (input instanceof Request && input.headers.has(CHAT_MODEL_TRACE_CONTEXT_HEADER)) {
      const cleanHeaders = new Headers(input.headers);
      cleanHeaders.delete(CHAT_MODEL_TRACE_CONTEXT_HEADER);
      cleanInput = new Request(input, { headers: cleanHeaders });
    }
    const cleanInit = { ...init, headers };
    const parsed = readContext(raw);
    const owner = parsed ? state.owners.get(parsed.ownerId) : void 0;
    if (!parsed || !owner || owner.disposed || !isResponsesRequest(input, init)) {
      return send(cleanInput, cleanInit);
    }
    const callId = randomUUID2();
    const startedAt = Math.max(Date.now(), state.lastStartedAt + 1);
    state.lastStartedAt = startedAt;
    const response = await send(cleanInput, cleanInit);
    const traceId = response.headers.get("Trace-Id") ?? response.headers.get("X-Trace-Id");
    if (isChatModelTraceId(traceId) && !owner.disposed) {
      const trace = {
        ...parsed.context,
        call_id: callId,
        trace_id: traceId,
        started_at: startedAt,
        status_code: response.status
      };
      const pending = reportTrace(owner, trace, send);
      owner.pending.add(pending);
      void pending.finally(() => owner.pending.delete(pending));
    }
    return response;
  }, "wrapper");
  Object.assign(wrapper, send);
  state.wrapper = wrapper;
  globalThis.fetch = wrapper;
}
__name(installSanitizer, "installSanitizer");
function createModelTraceCapture(gatewayUrl) {
  const state = registry();
  const ownerId = randomUUID2();
  const owner = {
    gatewayUrl: gatewayUrl.replace(/\/+$/, ""),
    headers: new Headers(
      withGatewayIdentity({ headers: { "content-type": "application/json" } }).headers
    ),
    disposed: false,
    controllers: /* @__PURE__ */ new Set(),
    pending: /* @__PURE__ */ new Set()
  };
  return {
    enableDiagnostics() {
      if (!owner.disposed) installSanitizer(state);
    },
    attach(context, headers) {
      if (owner.disposed) return;
      const encoded = Buffer.from(JSON.stringify({ ...context, ownerId })).toString("base64url");
      if (!readContext(encoded)) return;
      installSanitizer(state);
      state.owners.set(ownerId, owner);
      headers[CHAT_MODEL_TRACE_CONTEXT_HEADER] = encoded;
    },
    async dispose() {
      owner.disposed = true;
      state.owners.delete(ownerId);
      for (const controller of owner.controllers) controller.abort();
      await Promise.all(owner.pending);
    }
  };
}
__name(createModelTraceCapture, "createModelTraceCapture");

// src/question-model-catalog-guard.ts
function parseQuestions(args) {
  const record2 = args;
  let questions = record2?.questions;
  if (typeof questions === "string") {
    try {
      questions = JSON.parse(questions);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(questions)) return [];
  return questions.filter(
    (question) => question !== null && typeof question === "object" && !Array.isArray(question)
  );
}
__name(parseQuestions, "parseQuestions");
function selectionCategory(question) {
  const text = [question.header, question.question].filter((value) => typeof value === "string").join(" ").toLocaleLowerCase();
  if (!/(?:模型|\bmodels?\b)/iu.test(text)) return void 0;
  if (!/(?:目标模型|模型选择|选择.*模型|(?:哪个|哪种|什么).*模型|模型.*(?:选择|使用)|target\s+model|model\s+selection|(?:choose|select|which|what).*\bmodels?\b|\bmodels?\b.*(?:choose|select|use))/iu.test(
    text
  )) {
    return void 0;
  }
  if (/(?:视频|\bvideos?\b)/iu.test(text)) return "video";
  if (/(?:图像|图片|生图|\bimages?\b)/iu.test(text)) return "image";
  if (/(?:音频|声音|语音|音乐|\baudios?\b|\bspeech\b|\bmusic\b)/iu.test(text)) return "audio";
  return "all";
}
__name(selectionCategory, "selectionCategory");
function questionModelSelectionCategory(args) {
  for (const question of parseQuestions(args)) {
    const category = selectionCategory(question);
    if (category) return category;
  }
  return void 0;
}
__name(questionModelSelectionCategory, "questionModelSelectionCategory");
function stripRecommendationSuffix(label) {
  return label.replace(/\s*[（(](?:推荐|recommended)[）)]\s*$/iu, "").trim();
}
__name(stripRecommendationSuffix, "stripRecommendationSuffix");
function isGenericNonModelChoice(label) {
  const normalized = stripRecommendationSuffix(label);
  return /^(?:通用(?:模型|版本)?|自动(?:选择)?|不限模型|任意模型|由(?:agent|智能助手|系统).*(?:选择|决定)|general(?:\s+(?:model|version))?|auto(?:matic)?|any\s+model)$/iu.test(
    normalized
  );
}
__name(isGenericNonModelChoice, "isGenericNonModelChoice");
var REGISTRY_BY_CATEGORY = {
  image: IMAGE_MODELS,
  video: VIDEO_MODELS,
  audio: AUDIO_MODELS
};
function visibleModels(models, category) {
  return models.filter(
    (model) => model.visibility !== "hidden" && (category === "all" || model.type === category) && model.display_name.trim().length > 0
  );
}
__name(visibleModels, "visibleModels");
function registriesForCategory(category) {
  if (category !== "all") return REGISTRY_BY_CATEGORY[category];
  return [...IMAGE_MODELS, ...VIDEO_MODELS, ...AUDIO_MODELS];
}
__name(registriesForCategory, "registriesForCategory");
function normalizedModelLabel(value) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\s._-]+/g, "");
}
__name(normalizedModelLabel, "normalizedModelLabel");
function registryAliases(entry) {
  return [
    entry.id,
    entry.name,
    entry.model_name,
    entry.publicToken,
    entry.seriesId,
    ...entry.selectionAliases ?? []
  ].filter((value) => Boolean(value));
}
__name(registryAliases, "registryAliases");
function matchingLiveModels(label, category, liveModels) {
  const normalizedLabel = normalizedModelLabel(label);
  const matches = /* @__PURE__ */ new Map();
  for (const model of liveModels) {
    const aliases = [model.id, model.display_name, model.series_id].filter(
      (value) => Boolean(value)
    );
    if (aliases.some((alias) => normalizedModelLabel(alias) === normalizedLabel)) {
      matches.set(model.id, model);
    }
  }
  for (const entry of registriesForCategory(category)) {
    if (!registryAliases(entry).some((alias) => normalizedModelLabel(alias) === normalizedLabel)) {
      continue;
    }
    const rowIds = new Set(registrySelectionRowIds(entry).map(normalizedModelLabel));
    for (const model of liveModels) {
      if (rowIds.has(normalizedModelLabel(model.id))) matches.set(model.id, model);
    }
  }
  return [...matches.values()];
}
__name(matchingLiveModels, "matchingLiveModels");
function assertQuestionModelOptionsMatchCatalog(args, models) {
  for (const question of parseQuestions(args)) {
    const category = selectionCategory(question);
    if (!category || !Array.isArray(question.options)) continue;
    const liveModels = visibleModels(models, category);
    const displayNames = Array.from(new Set(liveModels.map((model) => model.display_name.trim())));
    if (displayNames.length === 0) continue;
    const exactDisplayNames = new Set(displayNames);
    const unavailableLabels = [];
    const ambiguousLabels = [];
    for (const rawOption of question.options) {
      const option = rawOption;
      if (typeof option.label !== "string") continue;
      const label = stripRecommendationSuffix(option.label);
      if (isGenericNonModelChoice(option.label) || exactDisplayNames.has(label)) continue;
      const matches = matchingLiveModels(label, category, liveModels);
      if (matches.length === 0) {
        unavailableLabels.push(option.label);
      } else if (matches.length > 1) {
        ambiguousLabels.push({
          label: option.label,
          matches: Array.from(new Set(matches.map((model) => model.display_name.trim())))
        });
      }
    }
    if (unavailableLabels.length === 0 && ambiguousLabels.length === 0) continue;
    const categoryLabel = category === "all" ? "media" : category;
    const issueDetails = [
      unavailableLabels.length > 0 ? `Unavailable model options: ${unavailableLabels.join(", ")}.` : "",
      ambiguousLabels.length > 0 ? `Ambiguous model options: ${ambiguousLabels.map(({ label, matches }) => `${label} (matches ${matches.join(", ")})`).join("; ")}.` : ""
    ].filter(Boolean).join(" ");
    throw new Error(
      `The question asks the user to choose a ${categoryLabel} model, but some options cannot be shown. ${issueDetails} Retry the question tool with the current catalog. Use a concrete exact display_name from: ${displayNames.join(", ")}. Remove unavailable models and replace ambiguous family names with a concrete current model. A clearly labeled generic/Auto non-model choice is allowed.`
    );
  }
}
__name(assertQuestionModelOptionsMatchCatalog, "assertQuestionModelOptionsMatchCatalog");

// src/question-option-order.ts
var RECOMMENDED_SUFFIX = /(?:（推荐）|\((?:推荐|recommended)\))\s*$/iu;
function isRecord3(value) {
  return typeof value === "object" && value !== null;
}
__name(isRecord3, "isRecord");
function isRecommendedOption(value) {
  return isRecord3(value) && typeof value.label === "string" && RECOMMENDED_SUFFIX.test(value.label);
}
__name(isRecommendedOption, "isRecommendedOption");
function putRecommendedQuestionOptionsFirst(args) {
  if (!isRecord3(args) || !Array.isArray(args.questions)) return;
  for (const rawQuestion of args.questions) {
    if (!isRecord3(rawQuestion) || !Array.isArray(rawQuestion.options)) continue;
    const recommended = rawQuestion.options.filter(isRecommendedOption);
    if (recommended.length === 0) continue;
    rawQuestion.options = [
      ...recommended,
      ...rawQuestion.options.filter((option) => !isRecommendedOption(option))
    ];
  }
}
__name(putRecommendedQuestionOptionsFirst, "putRecommendedQuestionOptionsFirst");

// src/skill-meta-reader.ts
import * as fs4 from "node:fs";
import * as path5 from "node:path";

// ../protocol/dist/plugin-paths.js
import * as fs3 from "node:fs";
import { homedir as homedir3 } from "node:os";
import * as path4 from "node:path";

// ../protocol/dist/plugin/manifest.js
var PLUGIN_DISPLAY_MODES = ["inline", "launcher"];
var PluginManifestError = class extends Error {
  static {
    __name(this, "PluginManifestError");
  }
  code;
  constructor(code, message) {
    super(message);
    this.name = "PluginManifestError";
    this.code = code;
  }
};
var PLUGIN_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
var PLUGIN_ID_MAX_LENGTH = 64;
var PLUGIN_VERSION_RE = /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/;
var PLUGIN_NAME_MAX_LENGTH = 80;
var PLUGIN_DESCRIPTION_MAX_LENGTH = 240;
var PLUGIN_DETAILS_MAX_LENGTH = 4e3;
var PLUGIN_PATH_MAX_LENGTH = 256;
var PLUGIN_URL_MAX_LENGTH = 2048;
var PLUGIN_TAG_VALUE_MAX_LENGTH = 64;
var HTML_ENTRY_RE = /\.html?$/i;
var SKILL_MD_RE = /\.md$/i;
var PLUGIN_SKILL_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
var PREVIEW_EXT_RE = /\.(png|jpe?g|gif|webp|mp4|webm|mov)$/i;
var PLUGIN_PREVIEWS_MAX_COUNT = 12;
var PLUGIN_TAGS_MAX_COUNT = 16;
var PLUGIN_SIZE_MAX = 4096;
var PLUGIN_AGENT_METHOD_RE = /^[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)*$/;
var PLUGIN_AGENT_METHOD_MAX_LENGTH = 64;
var PLUGIN_AGENT_METHODS_MAX_COUNT = 16;
var PLUGIN_AGENT_METHOD_DESCRIPTION_MAX_LENGTH = 64e3;
var PLUGIN_AGENT_INSTRUCTIONS_MAX_LENGTH = 64e3;
var PLUGIN_AGENT_SESSION_NAME_MAX_LENGTH = 40;
var PLUGIN_AGENT_TIMEOUT_MIN_MS = 1e3;
var PLUGIN_AGENT_TIMEOUT_MAX_MS = 3e5;
function parsePluginManifest(input) {
  let raw = input;
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch (err) {
      throw new PluginManifestError("invalid_json", `manifest.json is not valid JSON: ${err.message}`);
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new PluginManifestError("invalid_shape", "manifest must be a JSON object");
  }
  const obj = raw;
  const id = obj.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new PluginManifestError("invalid_id", "id must be a non-empty string");
  }
  if (id.length > PLUGIN_ID_MAX_LENGTH) {
    throw new PluginManifestError("invalid_id", `id "${id}" exceeds ${PLUGIN_ID_MAX_LENGTH} characters`);
  }
  if (!PLUGIN_ID_RE.test(id)) {
    throw new PluginManifestError("invalid_id", `id "${id}" must be kebab-case (lowercase letters, digits, single dashes)`);
  }
  const name = parseLocalizedString(obj.name, "name", PLUGIN_NAME_MAX_LENGTH, "invalid_name");
  const description = parseLocalizedString(obj.description, "description", PLUGIN_DESCRIPTION_MAX_LENGTH, "invalid_description");
  let details;
  if (obj.details !== void 0) {
    const parsed = parseLocalizedString(obj.details, "details", PLUGIN_DETAILS_MAX_LENGTH, "invalid_details", { allowEmptyValues: true });
    const filtered = {};
    for (const [loc, val] of Object.entries(parsed)) {
      if (val.length > 0)
        filtered[loc] = val;
    }
    if (Object.keys(filtered).length > 0)
      details = filtered;
  }
  let previews;
  if (obj.previews !== void 0) {
    previews = parseLocalizedPathOrUrlArray(obj.previews, "previews", "invalid_previews", PLUGIN_PREVIEWS_MAX_COUNT, PREVIEW_EXT_RE);
  }
  let tags;
  if (obj.tags !== void 0) {
    tags = parseLocalizedTagArray(obj.tags, "tags", "invalid_tags");
  }
  const version = obj.version;
  if (typeof version !== "string" || !PLUGIN_VERSION_RE.test(version)) {
    throw new PluginManifestError("invalid_version", `version "${String(version)}" must be semver (e.g. "0.1.0" or "1.2.3-beta.1")`);
  }
  const icon = parseLocalizedPathOrUrl(obj.icon, "icon", "invalid_icon");
  const entry = obj.entry;
  if (typeof entry !== "string" || entry.length === 0) {
    throw new PluginManifestError("invalid_entry", "entry must be a non-empty string");
  }
  if (entry.length > PLUGIN_PATH_MAX_LENGTH) {
    throw new PluginManifestError("invalid_entry", `entry path exceeds ${PLUGIN_PATH_MAX_LENGTH} characters`);
  }
  if (!isSafeRelativePath(entry)) {
    throw new PluginManifestError("invalid_entry", `entry "${entry}" must be a relative path inside the plugin directory`);
  }
  if (!HTML_ENTRY_RE.test(entry)) {
    throw new PluginManifestError("invalid_entry", `entry "${entry}" must end in .html or .htm \u2014 the runtime mounts it as an HTML node`);
  }
  const rawSkill = obj.skill;
  let skill;
  if (rawSkill !== void 0) {
    if (typeof rawSkill === "string") {
      validatePluginSkillPath(rawSkill, "skill");
      skill = rawSkill;
    } else if (isPlainObject(rawSkill)) {
      validatePluginSkillPath(rawSkill.entry, "skill.entry");
      if (typeof rawSkill.name !== "string" || !PLUGIN_SKILL_NAME_RE.test(rawSkill.name)) {
        throw new PluginManifestError("invalid_skill", "skill.name must match [A-Za-z0-9][A-Za-z0-9._-]{0,63}");
      }
      if (rawSkill.load !== "on-demand") {
        throw new PluginManifestError("invalid_skill", 'skill.load must be "on-demand"');
      }
      if (rawSkill.fallback !== "inline") {
        throw new PluginManifestError("invalid_skill", 'skill.fallback must be "inline"');
      }
      skill = {
        entry: rawSkill.entry,
        name: rawSkill.name,
        load: "on-demand",
        fallback: "inline"
      };
    } else {
      throw new PluginManifestError("invalid_skill", "skill must be a relative Markdown path or a hybrid skill object");
    }
  }
  const displayMode = obj.displayMode;
  if (displayMode !== void 0 && !PLUGIN_DISPLAY_MODES.includes(displayMode)) {
    throw new PluginManifestError("invalid_display_mode", `displayMode "${String(displayMode)}" must be one of: ${PLUGIN_DISPLAY_MODES.join(", ")}`);
  }
  const width = parseOptionalSize(obj.width, "width");
  const height = parseOptionalSize(obj.height, "height");
  const agent = obj.agent !== void 0 ? parseAgentManifest(obj.agent) : void 0;
  return {
    id,
    name,
    description,
    ...details !== void 0 ? { details } : {},
    ...previews !== void 0 ? { previews } : {},
    ...tags !== void 0 ? { tags } : {},
    version,
    icon,
    entry,
    ...skill !== void 0 ? { skill } : {},
    ...displayMode !== void 0 ? { displayMode } : {},
    ...width !== void 0 ? { width } : {},
    ...height !== void 0 ? { height } : {},
    ...agent !== void 0 ? { agent } : {}
  };
}
__name(parsePluginManifest, "parsePluginManifest");
function parseAgentManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new PluginManifestError("invalid_agent", "agent must be an object");
  }
  const obj = raw;
  if (obj.editorSurface !== void 0 && typeof obj.editorSurface !== "boolean") {
    throw new PluginManifestError("invalid_agent", "agent.editorSurface must be a boolean");
  }
  let sessionName;
  if (obj.sessionName !== void 0) {
    sessionName = parseLocalizedString(obj.sessionName, "agent.sessionName", PLUGIN_AGENT_SESSION_NAME_MAX_LENGTH, "invalid_agent");
  }
  const instructions = obj.instructions;
  if (typeof instructions !== "string" || instructions.trim().length === 0) {
    throw new PluginManifestError("invalid_agent", "agent.instructions must be a non-empty string");
  }
  if (instructions.length > PLUGIN_AGENT_INSTRUCTIONS_MAX_LENGTH) {
    throw new PluginManifestError("invalid_agent", `agent.instructions exceeds ${PLUGIN_AGENT_INSTRUCTIONS_MAX_LENGTH} characters`);
  }
  const methodsRaw = obj.methods;
  if (!Array.isArray(methodsRaw) || methodsRaw.length === 0) {
    throw new PluginManifestError("invalid_agent", "agent.methods must be a non-empty array");
  }
  if (methodsRaw.length > PLUGIN_AGENT_METHODS_MAX_COUNT) {
    throw new PluginManifestError("invalid_agent", `agent.methods exceeds ${PLUGIN_AGENT_METHODS_MAX_COUNT} entries`);
  }
  const seen = /* @__PURE__ */ new Set();
  const methods = methodsRaw.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new PluginManifestError("invalid_agent", `agent.methods[${index}] must be an object`);
    }
    const method = entry;
    const name = method.name;
    if (typeof name !== "string" || name.length === 0 || name.length > PLUGIN_AGENT_METHOD_MAX_LENGTH || !PLUGIN_AGENT_METHOD_RE.test(name)) {
      throw new PluginManifestError("invalid_agent", `agent.methods[${index}].name must match ${PLUGIN_AGENT_METHOD_RE.source} (\u2264 ${PLUGIN_AGENT_METHOD_MAX_LENGTH} chars)`);
    }
    if (seen.has(name)) {
      throw new PluginManifestError("invalid_agent", `agent.methods duplicate name "${name}"`);
    }
    seen.add(name);
    const description = method.description;
    if (typeof description !== "string" || description.trim().length === 0) {
      throw new PluginManifestError("invalid_agent", `agent.methods[${index}].description must be a non-empty string`);
    }
    if (description.length > PLUGIN_AGENT_METHOD_DESCRIPTION_MAX_LENGTH) {
      throw new PluginManifestError("invalid_agent", `agent.methods[${index}].description exceeds ${PLUGIN_AGENT_METHOD_DESCRIPTION_MAX_LENGTH} characters`);
    }
    const timeoutMs = method.timeoutMs;
    if (timeoutMs !== void 0) {
      if (typeof timeoutMs !== "number" || !Number.isInteger(timeoutMs) || timeoutMs < PLUGIN_AGENT_TIMEOUT_MIN_MS || timeoutMs > PLUGIN_AGENT_TIMEOUT_MAX_MS) {
        throw new PluginManifestError("invalid_agent", `agent.methods[${index}].timeoutMs must be an integer in [${PLUGIN_AGENT_TIMEOUT_MIN_MS}, ${PLUGIN_AGENT_TIMEOUT_MAX_MS}]`);
      }
    }
    return {
      name,
      description: description.trim(),
      ...timeoutMs !== void 0 ? { timeoutMs } : {}
    };
  });
  return {
    ...obj.editorSurface !== void 0 ? { editorSurface: obj.editorSurface } : {},
    ...sessionName !== void 0 ? { sessionName } : {},
    instructions: instructions.trim(),
    methods
  };
}
__name(parseAgentManifest, "parseAgentManifest");
function parseLocalizedString(raw, field, maxLength, errorCode, opts = {}) {
  const dict = ensureI18nDict(raw, field, errorCode);
  const out = {};
  for (const [locale, value] of Object.entries(dict)) {
    assertBcp47(locale, field, errorCode);
    if (typeof value !== "string") {
      throw new PluginManifestError(errorCode, `${field}["${locale}"] must be a string`);
    }
    if (value.length > maxLength) {
      throw new PluginManifestError(errorCode, `${field}["${locale}"] exceeds ${maxLength} characters`);
    }
    const trimmed = value.trim();
    if (!opts.allowEmptyValues && trimmed.length === 0) {
      throw new PluginManifestError(errorCode, `${field}["${locale}"] must be a non-empty string`);
    }
    out[locale] = trimmed;
  }
  if (Object.keys(out).length === 0) {
    throw new PluginManifestError(errorCode, `${field} must contain at least one BCP47 locale entry`);
  }
  return out;
}
__name(parseLocalizedString, "parseLocalizedString");
function parseLocalizedPathOrUrl(raw, field, errorCode) {
  const dict = ensureI18nDict(raw, field, errorCode);
  const out = {};
  for (const [locale, value] of Object.entries(dict)) {
    assertBcp47(locale, field, errorCode);
    if (typeof value !== "string" || value.length === 0) {
      throw new PluginManifestError(errorCode, `${field}["${locale}"] must be a non-empty string`);
    }
    validatePathOrUrl(value, `${field}["${locale}"]`, errorCode, void 0);
    out[locale] = value;
  }
  if (Object.keys(out).length === 0) {
    throw new PluginManifestError(errorCode, `${field} must contain at least one BCP47 locale entry`);
  }
  return out;
}
__name(parseLocalizedPathOrUrl, "parseLocalizedPathOrUrl");
function parseLocalizedPathOrUrlArray(raw, field, errorCode, maxCount, extRe) {
  const dict = ensureI18nDict(raw, field, errorCode);
  const out = {};
  for (const [locale, value] of Object.entries(dict)) {
    assertBcp47(locale, field, errorCode);
    if (!Array.isArray(value)) {
      throw new PluginManifestError(errorCode, `${field}["${locale}"] must be an array of strings`);
    }
    if (value.length > maxCount) {
      throw new PluginManifestError(errorCode, `${field}["${locale}"] exceeds ${maxCount} entries`);
    }
    const seen = /* @__PURE__ */ new Set();
    const items = [];
    for (const item of value) {
      if (typeof item !== "string" || item.length === 0) {
        throw new PluginManifestError(errorCode, `${field}["${locale}"] entries must be non-empty strings`);
      }
      validatePathOrUrl(item, `${field}["${locale}"]`, errorCode, extRe);
      if (seen.has(item))
        continue;
      seen.add(item);
      items.push(item);
    }
    if (items.length > 0)
      out[locale] = items;
  }
  return Object.keys(out).length > 0 ? out : {};
}
__name(parseLocalizedPathOrUrlArray, "parseLocalizedPathOrUrlArray");
function parseLocalizedTagArray(raw, field, errorCode) {
  const dict = ensureI18nDict(raw, field, errorCode);
  const out = {};
  for (const [locale, value] of Object.entries(dict)) {
    assertBcp47(locale, field, errorCode);
    if (!Array.isArray(value)) {
      throw new PluginManifestError(errorCode, `${field}["${locale}"] must be an array of strings`);
    }
    if (value.length > PLUGIN_TAGS_MAX_COUNT) {
      throw new PluginManifestError(errorCode, `${field}["${locale}"] exceeds ${PLUGIN_TAGS_MAX_COUNT} entries`);
    }
    const seen = /* @__PURE__ */ new Set();
    const items = [];
    for (const item of value) {
      if (typeof item !== "string")
        continue;
      if (item.length > PLUGIN_TAG_VALUE_MAX_LENGTH) {
        throw new PluginManifestError(errorCode, `${field}["${locale}"] tag exceeds ${PLUGIN_TAG_VALUE_MAX_LENGTH} characters`);
      }
      const trimmed = item.trim();
      if (trimmed.length === 0)
        continue;
      if (seen.has(trimmed))
        continue;
      seen.add(trimmed);
      items.push(trimmed);
    }
    if (items.length > 0)
      out[locale] = items;
  }
  return Object.keys(out).length > 0 ? out : {};
}
__name(parseLocalizedTagArray, "parseLocalizedTagArray");
function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
__name(isPlainObject, "isPlainObject");
function validatePluginSkillPath(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new PluginManifestError("invalid_skill", `${field} must be a non-empty string`);
  }
  if (value.length > PLUGIN_PATH_MAX_LENGTH) {
    throw new PluginManifestError("invalid_skill", `${field} path exceeds ${PLUGIN_PATH_MAX_LENGTH} characters`);
  }
  if (!isSafeRelativePath(value)) {
    throw new PluginManifestError("invalid_skill", `${field} "${value}" must be a relative path inside the plugin directory`);
  }
  if (!SKILL_MD_RE.test(value)) {
    throw new PluginManifestError("invalid_skill", `${field} "${value}" must end in .md`);
  }
}
__name(validatePluginSkillPath, "validatePluginSkillPath");
function ensureI18nDict(raw, field, errorCode) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new PluginManifestError(errorCode, `${field} must be an object keyed by BCP47 locale (e.g. { "zh-CN": "...", "en-US": "..." })`);
  }
  return raw;
}
__name(ensureI18nDict, "ensureI18nDict");
function assertBcp47(locale, field, errorCode) {
  if (!BCP47_LOCALE_RE.test(locale)) {
    throw new PluginManifestError(errorCode, `${field} key "${locale}" must be a BCP47 locale tag (e.g. "zh-CN", "en-US", "zh-Hans")`);
  }
}
__name(assertBcp47, "assertBcp47");
function validatePathOrUrl(value, fieldLabel, errorCode, extRe) {
  if (isAbsoluteHttpUrl(value)) {
    if (value.length > PLUGIN_URL_MAX_LENGTH) {
      throw new PluginManifestError(errorCode, `${fieldLabel} URL exceeds ${PLUGIN_URL_MAX_LENGTH} characters`);
    }
    if (extRe) {
      const pathname = extractUrlPathname(value);
      if (!extRe.test(pathname)) {
        throw new PluginManifestError(errorCode, `${fieldLabel} URL "${value}" must end in an allowed extension (${extRe.source})`);
      }
    }
    return;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//")) {
    throw new PluginManifestError(errorCode, `${fieldLabel} "${value}" must be an http(s) URL or a relative path inside the plugin directory`);
  }
  if (value.length > PLUGIN_PATH_MAX_LENGTH) {
    throw new PluginManifestError(errorCode, `${fieldLabel} path exceeds ${PLUGIN_PATH_MAX_LENGTH} characters`);
  }
  if (!isSafeRelativePath(value)) {
    throw new PluginManifestError(errorCode, `${fieldLabel} "${value}" must be a relative path inside the plugin directory`);
  }
  if (extRe && !extRe.test(value)) {
    throw new PluginManifestError(errorCode, `${fieldLabel} "${value}" must end in an allowed extension (${extRe.source})`);
  }
}
__name(validatePathOrUrl, "validatePathOrUrl");
function isAbsoluteHttpUrl(value) {
  return /^https?:\/\//i.test(value);
}
__name(isAbsoluteHttpUrl, "isAbsoluteHttpUrl");
function extractUrlPathname(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
__name(extractUrlPathname, "extractUrlPathname");
function isSafeRelativePath(p) {
  if (p.length === 0)
    return false;
  if (p.startsWith("/") || p.startsWith("\\") || /^[A-Za-z]:[\\/]/.test(p))
    return false;
  const normalised = p.replace(/\\/g, "/");
  if (normalised === ".." || normalised.startsWith("../") || normalised.includes("/../")) {
    return false;
  }
  if (normalised.includes("\0"))
    return false;
  return true;
}
__name(isSafeRelativePath, "isSafeRelativePath");
function parseOptionalSize(raw, field) {
  if (raw === void 0)
    return void 0;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    throw new PluginManifestError("invalid_size", `${field} must be a finite number`);
  }
  if (raw <= 0) {
    throw new PluginManifestError("invalid_size", `${field} must be greater than 0`);
  }
  if (raw > PLUGIN_SIZE_MAX) {
    throw new PluginManifestError("invalid_size", `${field} ${raw} exceeds maximum ${PLUGIN_SIZE_MAX}`);
  }
  return Math.round(raw);
}
__name(parseOptionalSize, "parseOptionalSize");

// ../protocol/dist/plugin-paths.js
function installedPluginsDir(context) {
  const envDir = process.env.HUB_PLUGINS_DIR;
  if (envDir)
    return envDir;
  return path4.join(hubRoot(context), "plugins");
}
__name(installedPluginsDir, "installedPluginsDir");
function userPluginsDir() {
  return path4.join(homedir3(), ...HUB_ROOT_SEGMENTS, "plugins");
}
__name(userPluginsDir, "userPluginsDir");
function bundledPluginsDir(context) {
  const envDir = context?.bundledPluginsDir ?? process.env.HILO_BUNDLED_PLUGINS_DIR;
  return envDir && envDir.trim().length > 0 ? envDir : null;
}
__name(bundledPluginsDir, "bundledPluginsDir");
function allPluginsDirs(context) {
  const bundled = bundledPluginsDir(context);
  const dirs = [userPluginsDir(), ...bundled ? [bundled] : [], installedPluginsDir(context)];
  const seen = /* @__PURE__ */ new Set();
  return dirs.filter((d) => {
    if (seen.has(d))
      return false;
    seen.add(d);
    return true;
  });
}
__name(allPluginsDirs, "allPluginsDirs");
function resolvedPluginSkillPaths(context) {
  const plugins = /* @__PURE__ */ new Map();
  const orderedParents = allPluginsDirs(context);
  const bundled = bundledPluginsDir(context);
  const parentRank = /* @__PURE__ */ __name((parent) => parent === userPluginsDir() ? 3 : bundled && parent === bundled ? 2 : 1, "parentRank");
  for (const parent of orderedParents) {
    let entries;
    try {
      entries = fs3.readdirSync(parent, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink() || plugins.has(entry.name))
        continue;
      const root = path4.join(parent, entry.name);
      try {
        const manifest = parsePluginManifest(fs3.readFileSync(path4.join(root, "manifest.json"), "utf8"));
        if (manifest.id !== entry.name)
          continue;
        const previous = plugins.get(manifest.id);
        if (!previous || parentRank(parent) > parentRank(path4.dirname(previous.root))) {
          plugins.set(manifest.id, { root, manifest });
        }
      } catch {
      }
    }
  }
  const occupiedNames = /* @__PURE__ */ new Set();
  for (const skillDir of resolvedSkillPaths(context).paths) {
    try {
      const frontmatter = parseFrontmatter(fs3.readFileSync(path4.join(skillDir, "SKILL.md"), "utf8"));
      occupiedNames.add(frontmatter.name ?? path4.basename(skillDir));
    } catch {
      occupiedNames.add(path4.basename(skillDir));
    }
  }
  const skills = /* @__PURE__ */ new Map();
  for (const [pluginId, plugin2] of plugins) {
    const declaration = plugin2.manifest.skill;
    if (!declaration || typeof declaration === "string")
      continue;
    try {
      const realRoot = fs3.realpathSync(plugin2.root);
      const entryPath = fs3.realpathSync(path4.resolve(plugin2.root, declaration.entry));
      if (entryPath !== realRoot && !entryPath.startsWith(realRoot + path4.sep) || !fs3.statSync(entryPath).isFile()) {
        continue;
      }
      const frontmatter = parseFrontmatter(fs3.readFileSync(entryPath, "utf8"));
      if (frontmatter.name !== declaration.name || occupiedNames.has(declaration.name) || skills.has(declaration.name)) {
        continue;
      }
      const skillDir = path4.dirname(entryPath);
      skills.set(declaration.name, {
        pluginId,
        pluginVersion: plugin2.manifest.version,
        name: declaration.name,
        path: skillDir,
        entryPath
      });
    } catch {
    }
  }
  return { paths: [...skills.values()].map((skill) => skill.path), skills };
}
__name(resolvedPluginSkillPaths, "resolvedPluginSkillPaths");

// src/skill-meta-reader.ts
var cache = /* @__PURE__ */ new Map();
function readSkillMeta(skillName) {
  const cached = cache.get(skillName);
  if (cached !== void 0) return cached;
  const meta = scanForSkill(skillName);
  cache.set(skillName, meta);
  return meta;
}
__name(readSkillMeta, "readSkillMeta");
function scanForSkill(skillName) {
  const mounted = scanMountedEvalSkillPaths(skillName);
  if (mounted !== void 0) return mounted;
  const pluginSkill = resolvedPluginSkillPaths().skills.get(skillName);
  if (pluginSkill) {
    const meta = readSkillMdMeta(pluginSkill.entryPath, skillName);
    if (meta !== void 0) return meta;
  }
  for (const dir of allSkillsDirs()) {
    const skillMd = path5.join(dir, skillName, "SKILL.md");
    const meta = readSkillMdMeta(skillMd, skillName);
    if (meta !== void 0) return meta;
  }
  return null;
}
__name(scanForSkill, "scanForSkill");
function scanMountedEvalSkillPaths(skillName) {
  const raw = process.env.HILO_EVAL_SKILLS_PATHS;
  if (!raw) return void 0;
  for (const skillDir of raw.split(path5.delimiter)) {
    const trimmed = skillDir.trim();
    if (!trimmed) continue;
    const meta = readSkillMdMeta(path5.join(trimmed, "SKILL.md"), skillName);
    if (meta !== void 0) return meta;
  }
  return void 0;
}
__name(scanMountedEvalSkillPaths, "scanMountedEvalSkillPaths");
function readSkillMdMeta(skillMd, skillName) {
  if (!fs4.existsSync(skillMd)) return void 0;
  try {
    const content = fs4.readFileSync(skillMd, "utf-8");
    const fm = parseFrontmatter(content);
    const declared = fm.name ?? skillName;
    if (declared !== skillName) return void 0;
    const out = {};
    if (fm.tools && fm.tools.length > 0) out.tools = fm.tools;
    if (fm.toolsByAgent && Object.keys(fm.toolsByAgent).length > 0) {
      out.toolsByAgent = fm.toolsByAgent;
    }
    return out.tools || out.toolsByAgent ? out : null;
  } catch {
    return null;
  }
}
__name(readSkillMdMeta, "readSkillMdMeta");

// src/tool-confirm/ask-client.ts
async function askToolConfirmViaGateway(gatewayUrl, input) {
  const url = `${gatewayUrl.replace(/\/+$/, "")}/api/internal/sessions/${encodeURIComponent(input.sessionID)}/tool-confirm/ask`;
  const timeoutMs = configuredToolConfirmTimeoutMs();
  const request = {
    tool: input.tool,
    ...input.callID ? { call_id: input.callID } : {},
    args: input.args,
    timeout_ms: timeoutMs
  };
  try {
    const resp = await fetch(
      url,
      withGatewayIdentity({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(resolveToolConfirmTransportTimeoutMs(timeoutMs))
      })
    );
    if (!resp.ok) {
      const fallback2 = fallbackResult(input.tool);
      console.warn(
        `[hilo-plugin] [tool-confirm] ask HTTP ${resp.status} session=${input.sessionID} tool=${input.tool}; defaulting to ${fallback2.decision}`
      );
      return fallback2;
    }
    const body = await resp.json();
    const parsed = parseResult(body);
    if (parsed) return parsed;
    const fallback = fallbackResult(input.tool);
    console.warn(
      `[hilo-plugin] [tool-confirm] ask got malformed body=${JSON.stringify(body)} session=${input.sessionID} tool=${input.tool}; defaulting to ${fallback.decision}`
    );
    return fallback;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const fallback = fallbackResult(input.tool);
    console.warn(
      `[hilo-plugin] [tool-confirm] ask failed session=${input.sessionID} tool=${input.tool}: ${msg}; defaulting to ${fallback.decision}`
    );
    return fallback;
  }
}
__name(askToolConfirmViaGateway, "askToolConfirmViaGateway");
function configuredToolConfirmTimeoutMs() {
  const raw = process.env[TOOL_CONFIRM_TIMEOUT_ENV];
  return normalizeToolConfirmTimeoutMs(raw === void 0 ? void 0 : Number(raw));
}
__name(configuredToolConfirmTimeoutMs, "configuredToolConfirmTimeoutMs");
function parseResult(body) {
  if (!body || typeof body !== "object") return null;
  const d = body.decision;
  if (d !== "confirm" && d !== "reject") return null;
  const modified = body.modified_args;
  const defaults = body.default_args;
  const rejectReason = body.reject_reason;
  return {
    decision: d,
    ...defaults && typeof defaults === "object" && !Array.isArray(defaults) ? { default_args: defaults } : {},
    ...d === "reject" ? {
      reject_reason: isToolConfirmRejectReason(rejectReason) ? rejectReason : "confirmation_unavailable"
    } : {},
    ...modified && typeof modified === "object" ? { modified_args: modified } : {}
  };
}
__name(parseResult, "parseResult");
function fallbackResult(tool) {
  return requiresConfirmationOnFailure(tool) ? { decision: "reject", reject_reason: "confirmation_unavailable" } : { decision: "confirm" };
}
__name(fallbackResult, "fallbackResult");
function requiresConfirmationOnFailure(tool) {
  return tool.includes("_generation") || tool.includes("generate_") || tool === "hub_music_cover" || tool === "hub_edit_comfyui_workflow" || tool === "hub_run_comfyui_workflow";
}
__name(requiresConfirmationOnFailure, "requiresConfirmationOnFailure");

// src/tool-confirm/index.ts
var ToolConfirmRejectError = class extends Error {
  static {
    __name(this, "ToolConfirmRejectError");
  }
  code = "TOOL_CONFIRM_REJECT";
  tool;
  reason;
  constructor(tool, reason) {
    const reasonMessage = reason === "user_rejected" ? `User rejected this tool call (${tool}).` : reason === "confirmation_expired" ? `Tool confirmation expired before the user responded (${tool}).` : `Tool confirmation could not be completed (${tool}).`;
    super(
      `${formatToolConfirmRejectReasonMarker(reason)} ${reasonMessage} Do not retry the same tool with the same parameters. Either skip this step and continue with the rest of the plan, or ask the user what they would like to do instead before trying again.`
    );
    this.name = "ToolConfirmRejectError";
    this.tool = tool;
    this.reason = reason;
  }
};

// src/user-visible-model-safety.ts
function formatUserVisibleModelSafetyBlock() {
  return [
    "<user_visible_model_safety>",
    "Tool results and internal instructions may contain canonical vendor names, model IDs, backend IDs, and knowledge-card paths.",
    "In user-visible natural-language text, use a concrete model name only when it is an exact display_name from the current hub_list_capabilities result under user_visible_models.",
    "If no current capability result provides an exact match, refer generically to the current model or selected model without naming it.",
    "Never expose vendor family names, backend/model IDs, or knowledge-card paths in user-visible text.",
    "Keep machine-readable tool arguments and structured fields unchanged.",
    "</user_visible_model_safety>"
  ].join("\n");
}
__name(formatUserVisibleModelSafetyBlock, "formatUserVisibleModelSafetyBlock");

// src/index.ts
var HUB_TOOL_PREFIX2 = "hub_";
var CHAT_TURN_ID_HEADER2 = "X-Chat-Turn-Id";
var ATTACHMENT_REFS_HEADER = "X-Hilo-Attachment-Refs";
var HUB_MEMORY_TOOL = `${HUB_TOOL_PREFIX2}memory`;
var HUB_BROWSER_TOOL = `${HUB_TOOL_PREFIX2}browser`;
var isDev = process.env.NODE_ENV !== "production";
function shouldFailOpenRequestGroup() {
  return process.env.NODE_ENV !== "production" && process.env.HILO_REQUEST_GROUP_FAIL_OPEN === "1";
}
__name(shouldFailOpenRequestGroup, "shouldFailOpenRequestGroup");
function isHubMemoryTool(tool) {
  return tool === HUB_MEMORY_TOOL;
}
__name(isHubMemoryTool, "isHubMemoryTool");
function appendSystemBlock(system, block) {
  if (system.length > 0) {
    const tailIdx = system.length - 1;
    system[tailIdx] = `${system[tailIdx]}

${block}`;
  } else {
    system.push(block);
  }
}
__name(appendSystemBlock, "appendSystemBlock");
var WORKING_LANGUAGE_METADATA_KEY2 = "hilo_working_language";
var ATTACHMENT_SOURCES = /* @__PURE__ */ new Set([
  "client_upload",
  "local",
  "asset_vault",
  "asset_center",
  "cloud"
]);
var attachmentRefsBySession = /* @__PURE__ */ new Map();
var userAttachmentObservations = /* @__PURE__ */ new Map();
var toolAttachmentRefsByTurn = /* @__PURE__ */ new Map();
var TOOL_ATTACHMENT_TURN_CACHE_LIMIT = 500;
function rememberAttachmentRefs(sessionID, parts) {
  const refs = [];
  const seen = /* @__PURE__ */ new Set();
  for (const rawPart of parts) {
    const part = rawPart;
    if (!part?.metadata || typeof part.metadata !== "object") continue;
    const attachments = part.metadata.attachments;
    if (!Array.isArray(attachments)) continue;
    for (const rawRef of attachments) {
      if (!rawRef || typeof rawRef !== "object") continue;
      const source = rawRef.attachment_source;
      const id = rawRef.attachment_id;
      if (typeof source !== "string" || !ATTACHMENT_SOURCES.has(source)) continue;
      if (typeof id !== "string" || id.length === 0) continue;
      const key = `${source}:${id}:input`;
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push({ attachment_source: source, attachment_id: id, direction: "input" });
    }
  }
  if (refs.length > 0) attachmentRefsBySession.set(sessionID, refs);
  else attachmentRefsBySession.delete(sessionID);
}
__name(rememberAttachmentRefs, "rememberAttachmentRefs");
function parseToolAttachmentRefs(rawRefs) {
  if (!Array.isArray(rawRefs)) return [];
  const refs = [];
  const seen = new Set(
    refs.map(
      (ref) => `${ref.attachment_source}:${ref.attachment_id}:${ref.tool_call_id}:${ref.direction}`
    )
  );
  for (const rawRef of rawRefs) {
    if (!rawRef || typeof rawRef !== "object") continue;
    const candidate = rawRef;
    const source = candidate.attachment_source;
    const id = candidate.attachment_id;
    const toolCallId = candidate.tool_call_id;
    const direction = candidate.direction;
    if (typeof source !== "string" || !ATTACHMENT_SOURCES.has(source)) continue;
    if (typeof id !== "string" || id.length === 0) continue;
    if (typeof toolCallId !== "string" || toolCallId.length === 0) continue;
    if (direction !== "input" && direction !== "output") continue;
    const key = `${source}:${id}:${toolCallId}:${direction}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({
      attachment_source: source,
      attachment_id: id,
      tool_call_id: toolCallId,
      direction
    });
  }
  return refs;
}
__name(parseToolAttachmentRefs, "parseToolAttachmentRefs");
function mergeAttachmentRefs(...groups) {
  const merged = [];
  const seen = /* @__PURE__ */ new Set();
  for (const group of groups) {
    for (const ref of group) {
      const key = `${ref.attachment_source}:${ref.attachment_id}:${ref.tool_call_id ?? "message"}:${ref.direction}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(ref);
    }
  }
  return merged;
}
__name(mergeAttachmentRefs, "mergeAttachmentRefs");
function rememberToolAttachmentRefs(sessionID, rawResult) {
  if (!rawResult || typeof rawResult !== "object" || Array.isArray(rawResult)) return;
  const rawMeta = rawResult._meta;
  if (!rawMeta || typeof rawMeta !== "object" || Array.isArray(rawMeta)) return;
  const meta = rawMeta;
  const chatTurnId = meta.chat_turn_id;
  if (typeof chatTurnId !== "string" || !/^[0-9a-f]{32}$/i.test(chatTurnId)) return;
  const refs = parseToolAttachmentRefs(meta.attachment_refs);
  if (refs.length === 0) return;
  const key = `${sessionID}:${chatTurnId.toLowerCase()}`;
  const merged = mergeAttachmentRefs(toolAttachmentRefsByTurn.get(key) ?? [], refs);
  toolAttachmentRefsByTurn.delete(key);
  toolAttachmentRefsByTurn.set(key, merged.slice(-128));
  while (toolAttachmentRefsByTurn.size > TOOL_ATTACHMENT_TURN_CACHE_LIMIT) {
    const oldest = toolAttachmentRefsByTurn.keys().next().value;
    if (typeof oldest !== "string") break;
    toolAttachmentRefsByTurn.delete(oldest);
  }
}
__name(rememberToolAttachmentRefs, "rememberToolAttachmentRefs");
function workingLanguageFromParts(parts) {
  for (const raw of parts) {
    const part = raw;
    if (!part || typeof part !== "object" || !part.metadata || typeof part.metadata !== "object") {
      continue;
    }
    const rawContext = part.metadata[WORKING_LANGUAGE_METADATA_KEY2];
    if (!rawContext || typeof rawContext !== "object") continue;
    const locale = rawContext.locale;
    const source = rawContext.source;
    if (typeof locale === "string" && ["explicit", "current-message", "ui-preference", "session", "region"].includes(String(source))) {
      return { locale, source };
    }
  }
  return void 0;
}
__name(workingLanguageFromParts, "workingLanguageFromParts");
function formatWorkingLanguage(context) {
  return [
    "<working-language>",
    `working_language: ${context.locale}`,
    `source: ${context.source}`,
    `Use ${context.locale} as working_language for interaction and instruction content in this turn: replies, progress updates, question fields, user-facing documents, planning descriptions, prompt instructions, and summaries.`,
    "Audience-facing artifact language is owned by the selected Skill/workflow and confirmed user requirements. Do not infer it globally from market or audience.",
    "Skill, workflow, and knowledge files may be written in Chinese for internal authoring. Their language must never change working_language.",
    'For Question tool templates from Skill, workflow, or knowledge files, "verbatim", "fixed wording", and "do not rewrite" preserve business semantics, option count and order, recommendation, and result mapping\u2014not the template authoring language.',
    "Render every user-visible Question header, question, option label, and description in working_language. Preserve internal identifiers and exact user-provided text verbatim.",
    "Do not let internal file language alter either language. Keep exact user-provided text verbatim. Briefly explain any hard provider language constraint to the user in working_language.",
    "</working-language>"
  ].join("\n");
}
__name(formatWorkingLanguage, "formatWorkingLanguage");
async function getEffectiveWorkingLanguage(sessionId, gatewayUrl) {
  const direct = getWorkingLanguage(sessionId);
  if (direct || !sessionId) return direct;
  const rootSessionId = await resolveRootSession(sessionId, gatewayUrl);
  if (rootSessionId === sessionId) return void 0;
  return getWorkingLanguage(rootSessionId);
}
__name(getEffectiveWorkingLanguage, "getEffectiveWorkingLanguage");
async function getEffectiveWorkingLanguageForSessions(sessionIds, gatewayUrl) {
  const direct = getWorkingLanguageForSessions(sessionIds);
  if (direct) return direct;
  for (const sessionId of sessionIds) {
    const inherited = await getEffectiveWorkingLanguage(sessionId, gatewayUrl);
    if (inherited) return inherited;
  }
  return void 0;
}
__name(getEffectiveWorkingLanguageForSessions, "getEffectiveWorkingLanguageForSessions");
function collectMessageSessionIds(messages) {
  const sessionIds = /* @__PURE__ */ new Set();
  for (const rawMessage of messages) {
    const message = rawMessage;
    if (typeof message.info?.sessionID === "string") sessionIds.add(message.info.sessionID);
    for (const rawPart of message.parts ?? []) {
      const part = rawPart;
      if (typeof part?.sessionID === "string" && part.sessionID.length > 0) {
        sessionIds.add(part.sessionID);
      }
    }
  }
  return [...sessionIds];
}
__name(collectMessageSessionIds, "collectMessageSessionIds");
var HUB_PLAN_TOOL_PREFIX = `${HUB_TOOL_PREFIX2}plan_`;
function isHubPlanTool(tool) {
  return tool.startsWith(HUB_PLAN_TOOL_PREFIX);
}
__name(isHubPlanTool, "isHubPlanTool");
var QUESTION_FORMAT_HINT = `

---

## CRITICAL: \`questions\` parameter must be a JSON array, not a stringified JSON

The \`questions\` parameter MUST be a real JSON array of objects.
DO NOT JSON.stringify the array before passing it.

CORRECT (use this):
{"questions": [{"question": "...", "header": "...", "options": [{"label": "...", "description": "..."}]}]}

WRONG (will fail validation and waste your turn):
{"questions": "[{\\"question\\": \\"...\\"}]"}

If you are about to write \`"questions": "[\`, STOP \u2014 write \`"questions": [\` (no opening quote).`;
function notifySkillUploadCheck(skillName, gatewayUrl) {
  try {
    const skillDir = path6.join(userSkillsDir(), skillName);
    if (!fs5.existsSync(path6.join(skillDir, "SKILL.md"))) return;
    const url = `${gatewayUrl.replace(/\/+$/, "")}/api/skills/upload-check`;
    fetch(
      url,
      withGatewayIdentity({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: skillName }),
        signal: AbortSignal.timeout(3e3)
      })
    ).catch((err) => {
      console.warn(`[hilo-plugin] skill upload check failed for ${skillName}:`, err);
    });
  } catch {
  }
}
__name(notifySkillUploadCheck, "notifySkillUploadCheck");
async function reportLoopGuardTrip(gatewayUrl, sessionID, tool) {
  const timeoutMs = Number(process.env.LOOP_GUARD_REPORT_TIMEOUT_MS ?? 1500);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `${gatewayUrl.replace(/\/+$/, "")}/api/internal/sessions/${encodeURIComponent(sessionID)}/loop-guard-trip`;
    const resp = await fetch(
      url,
      withGatewayIdentity({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tool }),
        signal: controller.signal
      })
    );
    if (!resp.ok) {
      console.warn(
        `[hilo-plugin] loop-guard report HTTP ${resp.status} session=${sessionID} tool=${tool}`
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[hilo-plugin] loop-guard report failed session=${sessionID} tool=${tool}: ${msg}`
    );
  } finally {
    clearTimeout(timer);
  }
}
__name(reportLoopGuardTrip, "reportLoopGuardTrip");
async function reportMcpToolCallObserved(gatewayUrl, sessionID, tool) {
  if (!tool.startsWith(HUB_TOOL_PREFIX2) || !sessionID) return;
  const timeoutMs = Number(process.env.MCP_TOOL_OBSERVED_REPORT_TIMEOUT_MS ?? 1500);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `${gatewayUrl.replace(/\/+$/, "")}/api/internal/sessions/${encodeURIComponent(sessionID)}/mcp-tool-call`;
    const resp = await fetch(
      url,
      withGatewayIdentity({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tool, observed_at: Date.now() }),
        signal: controller.signal
      })
    );
    if (!resp.ok) {
      console.warn(
        `[hilo-plugin] mcp observed report HTTP ${resp.status} session=${sessionID} tool=${tool}`
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[hilo-plugin] mcp observed report failed session=${sessionID} tool=${tool}: ${msg}`
    );
  } finally {
    clearTimeout(timer);
  }
}
__name(reportMcpToolCallObserved, "reportMcpToolCallObserved");
function questionReplyAttachmentPaths(rawResult) {
  if (!rawResult || typeof rawResult !== "object" || Array.isArray(rawResult)) return [];
  const metadata = rawResult.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const answers = metadata.answers;
  if (!Array.isArray(answers)) return [];
  const paths = [];
  const seen = /* @__PURE__ */ new Set();
  for (const answer of answers) {
    if (!Array.isArray(answer)) continue;
    for (const value of answer) {
      if (typeof value !== "string") continue;
      const blocks = value.matchAll(/\[User attached files:\n([\s\S]*?)\n\]/g);
      for (const block of blocks) {
        for (const line of block[1].split("\n")) {
          if (line.trim() === "") break;
          if (!line.startsWith("- ")) continue;
          const filePath = line.slice(2).replace(/^\[\d+\]\s*/, "").replace(/^(?:image|video|audio|text|file):\s*/, "").trim();
          if (!filePath || seen.has(filePath)) continue;
          seen.add(filePath);
          paths.push(filePath);
          if (paths.length === 32) return paths;
        }
      }
    }
  }
  return paths;
}
__name(questionReplyAttachmentPaths, "questionReplyAttachmentPaths");
async function observeQuestionReplyAttachments(gatewayUrl, sessionID, toolCallID, rawResult) {
  if (!sessionID || !toolCallID) return [];
  const paths = questionReplyAttachmentPaths(rawResult);
  if (paths.length === 0) return [];
  const timeoutMs = Number(process.env.QUESTION_ATTACHMENT_OBSERVATION_TIMEOUT_MS ?? 500);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `${gatewayUrl.replace(/\/+$/, "")}/api/internal/sessions/${encodeURIComponent(sessionID)}/attachment-observations`;
    const response = await fetch(
      url,
      withGatewayIdentity({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          paths,
          tool_call_id: toolCallID,
          direction: "input"
        }),
        signal: controller.signal
      })
    );
    if (!response.ok) return [];
    const payload = await response.json();
    const rawRefs = Array.isArray(payload.attachment_refs) ? payload.attachment_refs : [];
    return parseToolAttachmentRefs(
      rawRefs.map((rawRef) => ({
        ...rawRef && typeof rawRef === "object" ? rawRef : {},
        tool_call_id: toolCallID,
        direction: "input"
      }))
    );
  } finally {
    clearTimeout(timer);
  }
}
__name(observeQuestionReplyAttachments, "observeQuestionReplyAttachments");
function mapRequestGroupResponse(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { mode: "unknown", groupId: null };
  }
  const record2 = body;
  const rawChatTurnId = record2.chat_turn_id;
  const chatTurnId = typeof rawChatTurnId === "string" && /^[0-9a-f]{32}$/i.test(rawChatTurnId) ? rawChatTurnId : void 0;
  const rawGroup = record2.group_id;
  const groupId = typeof rawGroup === "string" && /^[1-9]\d*$/.test(rawGroup) ? rawGroup : null;
  const rawMode = record2.mode;
  if (rawMode === "canonical") {
    return groupId ? { mode: "canonical", groupId, ...chatTurnId ? { chatTurnId } : {} } : (
      // canonical without a Group is a contract violation, not a legacy turn.
      { mode: "unknown", groupId: null, ...chatTurnId ? { chatTurnId } : {} }
    );
  }
  if (rawMode === "legacy") {
    return { mode: "legacy", groupId: null, ...chatTurnId ? { chatTurnId } : {} };
  }
  if (rawMode === "unknown") {
    return { mode: "unknown", groupId: null, ...chatTurnId ? { chatTurnId } : {} };
  }
  return groupId ? { mode: "canonical", groupId, ...chatTurnId ? { chatTurnId } : {} } : { mode: "legacy", groupId: null, ...chatTurnId ? { chatTurnId } : {} };
}
__name(mapRequestGroupResponse, "mapRequestGroupResponse");
var REQUEST_GROUP_TIMEOUT_MS = (() => {
  const raw = Number.parseInt(process.env.HILO_REQUEST_GROUP_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 6e3;
})();
function classifyRequestGroupError(err) {
  const name = err instanceof Error ? err.name : "";
  const detail = err instanceof Error ? err.message : String(err);
  return name === "TimeoutError" || name === "AbortError" ? { reason: "timeout", detail } : { reason: "network_error", detail };
}
__name(classifyRequestGroupError, "classifyRequestGroupError");
async function resolveRequestGroup(gatewayUrl, sessionID) {
  if (!sessionID) return { ok: false, groupId: null, reason: "no_session", elapsedMs: 0 };
  const startedAt = Date.now();
  try {
    const url = `${gatewayUrl.replace(/\/+$/, "")}/api/internal/sessions/${encodeURIComponent(sessionID)}/request-group`;
    const resp = await fetch(
      url,
      withGatewayIdentity({ signal: AbortSignal.timeout(REQUEST_GROUP_TIMEOUT_MS) })
    );
    if (!resp.ok) {
      return {
        ok: false,
        groupId: null,
        reason: "http_error",
        status: resp.status,
        elapsedMs: Date.now() - startedAt
      };
    }
    let body;
    try {
      body = await resp.json();
    } catch (err) {
      return {
        ok: false,
        groupId: null,
        reason: "malformed",
        status: resp.status,
        elapsedMs: Date.now() - startedAt,
        detail: err instanceof Error ? err.message : String(err)
      };
    }
    const mapped = mapRequestGroupResponse(body);
    const elapsedMs = Date.now() - startedAt;
    if (mapped.mode === "canonical" && mapped.groupId) {
      return {
        ok: true,
        groupId: mapped.groupId,
        elapsedMs,
        ...mapped.chatTurnId ? { chatTurnId: mapped.chatTurnId } : {}
      };
    }
    return {
      ok: false,
      groupId: null,
      reason: mapped.mode === "legacy" ? "legacy_null" : "turn_unknown",
      elapsedMs,
      ...mapped.chatTurnId ? { chatTurnId: mapped.chatTurnId } : {}
    };
  } catch (err) {
    const { reason, detail } = classifyRequestGroupError(err);
    return { ok: false, groupId: null, reason, elapsedMs: Date.now() - startedAt, detail };
  }
}
__name(resolveRequestGroup, "resolveRequestGroup");
async function fetchRequestGroup(gatewayUrl, sessionID, stage, logContext = "") {
  const resolution = await resolveRequestGroup(gatewayUrl, sessionID);
  if (resolution.ok) {
    console.log(
      `[hilo-plugin] [request-group] HIT stage=${stage} session=${sessionID} group=${resolution.groupId} chat_turn_id=${resolution.chatTurnId ?? "none"} elapsedMs=${resolution.elapsedMs}${logContext}`
    );
    return resolution;
  }
  const line = `[hilo-plugin] [request-group] MISS stage=${stage} session=${sessionID} chat_turn_id=${resolution.chatTurnId ?? "none"} reason=${resolution.reason} elapsedMs=${resolution.elapsedMs}` + (resolution.status === void 0 ? "" : ` status=${resolution.status}`) + (resolution.detail === void 0 ? "" : ` detail=${resolution.detail}`);
  const contextualLine = `${line}${logContext}`;
  if (resolution.reason === "legacy_null" || resolution.reason === "no_session") {
    console.log(contextualLine);
  } else {
    console.warn(contextualLine);
  }
  return resolution;
}
__name(fetchRequestGroup, "fetchRequestGroup");
function groupScopeMarker(resolution) {
  return !resolution.ok && resolution.reason === "legacy_null" ? "legacy" : "unresolved";
}
__name(groupScopeMarker, "groupScopeMarker");
var plugin = /* @__PURE__ */ __name(async () => {
  const gatewayUrl = process.env.GATEWAY_URL;
  if (!gatewayUrl) {
    throw new Error(
      "[hilo-plugin] GATEWAY_URL must be set; the gateway must inject it when launching opencode"
    );
  }
  console.log(`[hilo-plugin] initialized; gatewayUrl=${gatewayUrl}`);
  const modelTraceCapture = createModelTraceCapture(gatewayUrl);
  const connectorDiscovery = process.env.HILO_CONNECTOR_DISCOVERY === "1";
  const loopGuardMode = process.env.LOOP_GUARD_MODE === "block" ? "block" : "ask";
  console.log(`[hilo-plugin] [loop-guard] mode=${loopGuardMode}`);
  const loopGuard = createLoopGuard({
    window: 5,
    threshold: 3,
    onAsk: /* @__PURE__ */ __name(async (input) => {
      console.warn(
        `[hilo-plugin] [loop-guard] TRIP session=${input.sessionID} tool=${input.tool} hits=${input.hits}/${input.window} mode=${loopGuardMode}`
      );
      void reportLoopGuardTrip(gatewayUrl, input.sessionID, input.tool).catch(() => {
      });
      if (loopGuardMode === "block") {
        return "reject";
      }
      const decision = await askUserViaGateway(gatewayUrl, {
        sessionID: input.sessionID,
        tool: input.tool,
        hits: input.hits,
        window: input.window,
        recentTools: input.recent.map((r) => r.tool),
        fingerprint: input.fingerprint
      });
      console.log(
        `[hilo-plugin] [loop-guard] DECISION session=${input.sessionID} tool=${input.tool} decision=${decision}`
      );
      return decision;
    }, "onAsk")
  });
  return {
    dispose: /* @__PURE__ */ __name(() => modelTraceCapture.dispose(), "dispose"),
    "chat.headers": /* @__PURE__ */ __name(async (input, output) => {
      const selectedModel = input.model;
      const providerId = typeof selectedModel?.providerID === "string" ? selectedModel.providerID : "unknown";
      if (isCustomModelProvider(providerId)) {
        modelTraceCapture.enableDiagnostics();
        return;
      }
      const modelId = typeof selectedModel?.modelID === "string" ? selectedModel.modelID : typeof selectedModel?.id === "string" ? selectedModel.id : "unknown";
      modelTraceCapture.attach(
        {
          session_id: input.sessionID,
          request_id: input.message?.id,
          agent: typeof input.agent === "string" ? input.agent : typeof input.agent === "object" && input.agent !== null ? input.agent.name ?? "unknown" : "unknown",
          model_id: modelId
        },
        output.headers
      );
      const resolution = await fetchRequestGroup(
        gatewayUrl,
        input.sessionID,
        "chat.headers",
        ` provider_id=${providerId} model_id=${modelId}`
      );
      const toolAttachmentRefs = resolution.chatTurnId ? toolAttachmentRefsByTurn.get(`${input.sessionID}:${resolution.chatTurnId}`) ?? [] : [];
      const attachmentRefs = mergeAttachmentRefs(
        attachmentRefsBySession.get(input.sessionID) ?? [],
        toolAttachmentRefs
      );
      if (attachmentRefs.length > 0) {
        output.headers[ATTACHMENT_REFS_HEADER] = JSON.stringify(attachmentRefs);
      }
      if (resolution.chatTurnId) {
        output.headers[CHAT_TURN_ID_HEADER2] = resolution.chatTurnId;
      }
      if (resolution.ok) {
        output.headers["X-Group-Id"] = resolution.groupId;
        return;
      }
      if (resolution.reason === "legacy_null" || resolution.reason === "no_session") return;
      if (shouldFailOpenRequestGroup()) {
        console.warn(
          `[hilo-plugin] [request-group] NON-PRODUCTION FAIL-OPEN override active \u2014 sending unscoped model request session=${input.sessionID}`
        );
        return;
      }
      throw new Error(
        `REQUEST_GROUP_UNAVAILABLE: refusing to send an unscoped model request (session=${input.sessionID}, reason=${resolution.reason}). The local gateway could not resolve this turn's request/billing Group; retry the message.`
      );
    }, "chat.headers"),
    "chat.params": /* @__PURE__ */ __name(async (input, output) => {
      if (isCustomModelProvider(input.model?.providerID) && Number.isSafeInteger(input.model.limit.output) && input.model.limit.output > 0) {
        output.maxOutputTokens = input.model.limit.output;
      }
      if (connectorDiscovery)
        filterConnectorMessageTools(
          input.message,
          await connectorAccess(gatewayUrl, input.sessionID)
        );
      const agent = typeof input.agent === "object" && input.agent !== null ? input.agent : void 0;
      if (agent?.name && input.sessionID) {
        rememberSessionAgent(input.sessionID, agent.name);
      }
      if (agent && input.sessionID) {
        rememberAgentRef(input.sessionID, agent);
      }
      if (!agent?.permission) {
        if (isDev) {
          console.log(
            `[hilo-plugin] chat.params session=${input.sessionID}: skipped (no agent.permission)`
          );
        }
        return;
      }
      let grantsApplied = 0;
      try {
        const rootId = await resolveRootSession(input.sessionID, gatewayUrl);
        const myGrants = agent.name ? getGrants(rootId)?.get(agent.name) : void 0;
        if (myGrants && myGrants.size > 0) {
          for (const tool of myGrants) {
            agent.permission.push({ permission: tool, action: "allow", pattern: "*" });
            grantsApplied++;
          }
        }
      } catch (err) {
        console.warn(
          `[hilo-plugin] grant application failed session=${input.sessionID}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      if (isDev && grantsApplied > 0) {
        console.log(
          `[hilo-plugin] permission.grants session=${input.sessionID} agent=${agent.name ?? "unknown"} grants=${grantsApplied} permission_len=${agent.permission.length}`
        );
      }
    }, "chat.params"),
    "experimental.chat.system.transform": /* @__PURE__ */ __name(async (input, output) => {
      let memoryEntries = 0;
      let memoryTruncated = 0;
      try {
        const memory = await loadMemoryContext({
          projectRoot: process.cwd(),
          includeUserMemory: shouldIncludeUserMemory(process.cwd())
        });
        if (memory.prompt) {
          appendSystemBlock(output.system, memory.prompt);
        }
        memoryEntries = memory.totalEntries;
        memoryTruncated = memory.truncated;
      } catch (err) {
        console.warn(
          `[hilo-plugin] memory injection failed session=${input.sessionID}: ${err.message}`
        );
      }
      appendSystemBlock(output.system, formatUserVisibleModelSafetyBlock());
      if (isDev && memoryEntries > 0) {
        console.log(
          `[hilo-plugin] system.transform session=${input.sessionID} memory_entries=${memoryEntries} memory_truncated=${memoryTruncated}`
        );
      }
      const workingLanguage = await getEffectiveWorkingLanguage(input.sessionID, gatewayUrl);
      if (workingLanguage) {
        appendSystemBlock(output.system, formatWorkingLanguage(workingLanguage));
      }
    }, "experimental.chat.system.transform"),
    "experimental.chat.messages.transform": /* @__PURE__ */ __name(async (_input, output) => {
      const sessionIDs = collectMessageSessionIds(output.messages);
      const workingLanguage = hasPendingCompactionContinuePrompt(output.messages) ? await getEffectiveWorkingLanguageForSessions(sessionIDs, gatewayUrl) : void 0;
      rewriteCompactionContinueLanguage(output.messages, workingLanguage?.locale);
    }, "experimental.chat.messages.transform"),
    /**
     * Reset LoopGuard's per-session call history when a new user turn starts.
     *
     * Without this, "再来一张" / repeated nudges from the same human user
     * would accumulate fingerprints across turns and trip the guard on a
     * legitimate retry.
     */
    "chat.message": /* @__PURE__ */ __name(async (input, output) => {
      if (connectorDiscovery)
        await consumeConnectorContinuation(gatewayUrl, input.sessionID, output.parts ?? []);
      loopGuard.resetSession(input.sessionID);
      const workingLanguage = workingLanguageFromParts(output.parts ?? []);
      if (workingLanguage) {
        rememberWorkingLanguage(input.sessionID, workingLanguage);
      }
      const observation = {};
      userAttachmentObservations.set(input.sessionID, observation);
      try {
        rememberAttachmentRefs(input.sessionID, output.parts ?? []);
        const observed = await observeAttachmentInputs(
          gatewayUrl,
          input.sessionID,
          userAttachmentPaths(output.parts ?? [])
        );
        if (userAttachmentObservations.get(input.sessionID) !== observation) return;
        const userRefs = mergeAttachmentRefs(
          attachmentRefsBySession.get(input.sessionID) ?? [],
          observed.map((ref) => ({ ...ref, direction: "input" }))
        );
        if (userRefs.length > 0) attachmentRefsBySession.set(input.sessionID, userRefs);
      } catch (error) {
        reportAttachmentObservationFailure(input.sessionID, error);
      } finally {
        if (userAttachmentObservations.get(input.sessionID) === observation) {
          userAttachmentObservations.delete(input.sessionID);
        }
      }
    }, "chat.message"),
    /**
     * Inject the OpenCode runtime sessionID into a few hilo MCP tools whose
     * outputs (GUI button, async task completion notification) need to be
     * routed to the originating UI session.
     *
     * MCP servers are independent stdio subprocesses with no view of OpenCode
     * sessions. We rely on this hook (which sees both `input.sessionID` and
     * `output.args`) as the bridge: the args travel through stdio to the MCP
     * tool, which forwards them to the gateway as an HTTP body field.
     *
     * Without this, gateway has to broadcast / "find first runtime-bound
     * session" — both produce wrong-session notifications when multiple tabs
     * are open.
     *
     * LoopGuard runs FIRST: a throw here aborts the tool before _session_id
     * injection (and before the tool itself). The error message becomes the
     * tool error fed back to the LLM, forcing it to change approach.
     *
     * In `LOOP_GUARD_MODE=ask` (default), `loopGuard.check` may block for
     * up to 30s while it shows a modal in the desktop UI; the plugin SDK's
     * `tool.execute.before` hook is `async () => Promise<void>` with no
     * timeout from upstream (Plugin.trigger uses Effect.promise without
     * cancellation), so blocking here is supported by design.
     */
    "tool.execute.before": /* @__PURE__ */ __name(async (input, output) => {
      if (connectorDiscovery && input.sessionID)
        await guardConnectorTool(gatewayUrl, input.sessionID, input.tool, output.args);
      if (!input.sessionID) {
        console.warn(
          `[hilo-plugin] tool.execute.before: sessionID is undefined for tool=${input.tool}`
        );
      }
      if (input.tool === "task") {
        const args2 = output.args;
        const prompt = typeof args2?.prompt === "string" ? args2.prompt.trim() : "";
        if (prompt.startsWith("/")) {
          const sub = typeof args2?.subagent_type === "string" ? args2.subagent_type : "";
          if (sub === "general" || sub === "") {
            throw new LoopGuardError(
              `"${prompt}" is not a recognized slash command or skill. Do NOT retry with the task tool. Tell the user this skill was not found and suggest they check available skills.`,
              { tool: "task", sessionID: input.sessionID, hits: 1, window: 1 }
            );
          }
        }
      }
      if (input.tool === "question") {
        putRecommendedQuestionOptionsFirst(output.args);
        if (questionModelSelectionCategory(output.args)) {
          const snapshot = await fetchMediaModels(gatewayUrl);
          assertQuestionModelOptionsMatchCatalog(output.args, snapshot.models);
        }
      }
      await loopGuard.check({
        sessionID: input.sessionID,
        tool: input.tool,
        args: output.args
      });
      if (input.tool === "skill") {
        const skillName = output.args?.name;
        if (typeof skillName === "string" && skillName.length > 0 && input.sessionID) {
          const meta = readSkillMeta(skillName);
          if (meta) {
            try {
              const rootId = await resolveRootSession(input.sessionID, gatewayUrl);
              if (meta.tools) recordGrant(rootId, "media-agent", meta.tools);
              if (meta.toolsByAgent) {
                for (const [agentName, tools] of Object.entries(meta.toolsByAgent)) {
                  recordGrant(rootId, agentName, tools);
                }
              }
              const myAgentName = sessionAgentCache.get(input.sessionID);
              const agentRef = getAgentRef(input.sessionID);
              if (myAgentName && agentRef?.permission) {
                const myGrants = getGrants(rootId)?.get(myAgentName);
                if (myGrants && myGrants.size > 0) {
                  for (const tool of myGrants) {
                    agentRef.permission.push({
                      permission: tool,
                      action: "allow",
                      pattern: "*"
                    });
                  }
                  if (isDev) {
                    console.log(
                      `[hilo-plugin] skill-grant in-turn session=${input.sessionID} skill=${skillName} agent=${myAgentName} granted=${[...myGrants].join(",")}`
                    );
                  }
                }
              }
              if (isDev) {
                const summary = [];
                if (meta.tools) summary.push(`media-agent:${meta.tools.length}`);
                if (meta.toolsByAgent) {
                  for (const [a, t] of Object.entries(meta.toolsByAgent)) {
                    summary.push(`${a}:${t.length}`);
                  }
                }
                console.log(
                  `[hilo-plugin] skill load grant root=${rootId.slice(0, 12)} skill=${skillName} ${summary.join(" ")}`
                );
              }
            } catch (err) {
              console.warn(
                `[hilo-plugin] skill grant recording failed session=${input.sessionID} skill=${skillName}: ${err instanceof Error ? err.message : String(err)}`
              );
            }
          }
        }
        if (typeof skillName === "string" && skillName.length > 0) {
          notifySkillUploadCheck(skillName, gatewayUrl);
        }
        return;
      }
      if (input.tool.startsWith(HUB_TOOL_PREFIX2) && input.sessionID) {
        if (input.tool === HUB_BROWSER_TOOL) {
          const rootId = await resolveRootSession(input.sessionID, gatewayUrl);
          if (isBrowserSkillInstalled() && !hasSkillLoaded(rootId, CONTROL_IN_APP_BROWSER_SKILL) && !hasSkillLoaded(input.sessionID, CONTROL_IN_APP_BROWSER_SKILL)) {
            throw new BrowserSkillRequiredError();
          }
        }
        const confirmResult = await askToolConfirmViaGateway(gatewayUrl, {
          sessionID: input.sessionID,
          callID: input.callID,
          tool: input.tool,
          args: output.args ?? {}
        });
        if (confirmResult.decision === "reject") {
          throw new ToolConfirmRejectError(
            input.tool,
            confirmResult.reject_reason ?? "confirmation_unavailable"
          );
        }
        if (confirmResult.default_args) {
          output.args ??= {};
          for (const [key, value] of Object.entries(confirmResult.default_args)) {
            if (output.args[key] === void 0) output.args[key] = value;
          }
        }
        if (confirmResult.modified_args) {
          const originalArgs = { ...output.args };
          for (const [k, v] of Object.entries(confirmResult.modified_args)) {
            output.args[k] = v;
          }
          const changes = Object.entries(confirmResult.modified_args).filter(([k]) => !k.startsWith("_")).filter(([k, v]) => JSON.stringify(originalArgs[k]) !== JSON.stringify(v)).map(([k, v]) => `${k}: ${JSON.stringify(originalArgs[k])} -> ${JSON.stringify(v)}`);
          if (changes.length > 0) {
            output.args._user_override_note = `User manually modified: ${changes.join("; ")}. Accept result as-is, do not retry with original parameters.`;
          }
        }
      }
      if (!input.tool.startsWith(HUB_TOOL_PREFIX2)) return;
      if (!output.args || typeof output.args !== "object") {
        output.args = {};
      }
      const args = output.args;
      if (isHubPlanTool(input.tool)) {
        args.projectRoot = process.cwd();
      } else if (isHubMemoryTool(input.tool)) {
        if (args.projectRoot == null || args.projectRoot === "") {
          args.projectRoot = process.cwd();
        }
      }
      if (!input.sessionID) return;
      output.args._session_id = input.sessionID;
      delete output.args._group_id;
      delete output.args._group_scope;
      delete output.args._chat_turn_id;
      const resolution = await fetchRequestGroup(gatewayUrl, input.sessionID, "tool.execute");
      if (resolution.chatTurnId) {
        output.args._chat_turn_id = resolution.chatTurnId;
      }
      if (resolution.ok) {
        output.args._group_id = resolution.groupId;
      } else {
        output.args._group_scope = groupScopeMarker(resolution);
      }
      if (input.callID) {
        output.args._tool_use_id = input.callID;
      }
      if (input.callID && resolution.chatTurnId) {
        try {
          const refs = await observeAttachmentInputs(
            gatewayUrl,
            input.sessionID,
            toolAttachmentPaths(output.args),
            { callId: input.callID, chatTurnId: resolution.chatTurnId }
          );
          rememberToolAttachmentRefs(input.sessionID, {
            _meta: {
              chat_turn_id: resolution.chatTurnId,
              attachment_refs: refs.map((ref) => ({
                ...ref,
                tool_call_id: input.callID,
                direction: "input"
              }))
            }
          });
        } catch (error) {
          reportAttachmentObservationFailure(input.sessionID, error);
        }
      }
    }, "tool.execute.before"),
    /**
     * Record tool calls into LoopGuard history AFTER the tool actually ran.
     * Recording on `before` would mean a throw-blocked call enters history,
     * making future retries permanently blocked even if the LLM legitimately
     * needs to escape (e.g. by switching model).
     */
    "tool.execute.after": /* @__PURE__ */ __name(async (input, output) => {
      if (input.tool === "skill" && input.sessionID) {
        if (isBrowserSkillLoadResult(input.args, output.output)) {
          const rootId = await resolveRootSession(input.sessionID, gatewayUrl);
          recordSkillLoaded(rootId, CONTROL_IN_APP_BROWSER_SKILL);
        }
      }
      if (input.tool === "question") {
        try {
          const refs = await observeQuestionReplyAttachments(
            gatewayUrl,
            input.sessionID,
            input.callID,
            output
          );
          if (refs.length > 0) {
            const metadata = output.metadata && typeof output.metadata === "object" && !Array.isArray(output.metadata) ? output.metadata : {};
            const merged = mergeAttachmentRefs(
              parseToolAttachmentRefs(metadata.attachment_refs),
              refs
            );
            metadata.attachment_refs = merged;
            output.metadata = metadata;
            attachmentRefsBySession.set(
              input.sessionID,
              mergeAttachmentRefs(attachmentRefsBySession.get(input.sessionID) ?? [], merged)
            );
          }
        } catch {
        }
      }
      rememberToolAttachmentRefs(input.sessionID, output);
      loopGuard.record({
        sessionID: input.sessionID,
        tool: input.tool,
        args: input.args
      });
      void reportMcpToolCallObserved(gatewayUrl, input.sessionID, input.tool).catch(() => {
      });
    }, "tool.execute.after"),
    /**
     * Inject UTF-8 locale env into every shell child OpenCode spawns.
     *
     * Symptom this targets: on Windows zh-CN systems, paths containing
     * 中文 break across our skill scripts — `cp "...\skill测试2\..." "..."`
     * either silently writes to a garbage path or fails with "No such file
     * or directory", and Python scripts in skills print mojibake.
     *
     * Honest scope of this hook: it does NOT fix how argv bytes are
     * encoded into the bash child — that's owned by the spawn caller
     * (Bun runtime / OpenCode BashTool) and lives outside the plugin.
     * What this hook CAN do:
     *   - Force Python children to read/write UTF-8 regardless of the
     *     ambient codepage (PYTHONUTF8=1 + PYTHONIOENCODING=utf-8).
     *     This is the most impactful piece — skills are Python-heavy.
     *   - Make GNU coreutils (ls, cp, find, grep) print filenames as
     *     UTF-8 instead of GBK, so downstream pipes don't re-mojibake
     *     output that was already correct on disk (LANG/LC_ALL).
     *
     * Locale choice — `C.UTF-8`, not `zh_CN.UTF-8`:
     *   git-bash / MSYS2 default installs ship only `C` and `en_US`;
     *   setting `zh_CN.UTF-8` on a machine without that locale silently
     *   falls back to `C` and the LANG line becomes a no-op. `C.UTF-8`
     *   is guaranteed present on msys2/git-bash/glibc and gives us the
     *   UTF-8 ctype + iconv path without depending on a regional pack.
     *
     * Why not chcp prefix the bash command:
     *   `chcp 65001` only mutates the codepage of cmd.exe, not the
     *   already-running bash process; in git-bash chcp is a no-op
     *   on the parent. shell.env is the right layer because OpenCode
     *   uses it to compose the env handed to spawn() before the shell
     *   even starts.
     *
     * No-op outside Windows: macOS / Linux already default to UTF-8
     * locale. Skipping keeps this from clobbering a user's deliberately
     * non-UTF-8 LANG (e.g. POSIX-only test harnesses).
     */
    "shell.env": /* @__PURE__ */ __name(async (_input, output) => {
      if (process.platform !== "win32") return;
      output.env.LANG ??= "C.UTF-8";
      output.env.LC_ALL ??= "C.UTF-8";
      output.env.PYTHONIOENCODING ??= "utf-8";
      output.env.PYTHONUTF8 ??= "1";
    }, "shell.env"),
    /**
     * Append a format hint to the `question` tool description so the model is
     * less likely to JSON.stringify the `questions` array. Pure prompt-level
     * mitigation — schema is unchanged. See QUESTION_FORMAT_HINT above for the
     * full rationale.
     */
    "tool.definition": /* @__PURE__ */ __name(async (input, output) => {
      if (input.toolID === "question") {
        output.description = output.description + QUESTION_FORMAT_HINT;
      }
    }, "tool.definition")
  };
}, "plugin");
var index_default = plugin;
export {
  index_default as default
};
