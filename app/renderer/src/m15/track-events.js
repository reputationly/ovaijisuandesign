// track-events.js
import { create$2, AUTH_TRACK_EVENTS } from "../vendor.js";
import { getExtFromMime } from "./canvas-surface-recovery-scheduler.jsx";
import { parseNodeId } from "./resolve-derived-collision.js";
export function isCanvasInteractive(rootEl, enabled = true) {
  if (!enabled) return false;
  if (rootEl === null) return true;
  return rootEl.offsetParent !== null;
}
export function isInsideCanvas(target) {
  if (typeof window !== "undefined") {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const anchor = sel.anchorNode;
      const el = anchor?.nodeType === Node.ELEMENT_NODE ? anchor : (anchor?.parentElement ?? null);
      if (el && el.closest('.react-flow, [data-hilo-canvas-root="true"]') === null) {
        return false;
      }
    }
  }
  if (typeof document !== "undefined") {
    const active2 = document.activeElement;
    if (active2 === null || active2 === document.body) return true;
  }
  if (!target || !(target instanceof HTMLElement)) return false;
  return target.closest('.react-flow, [data-hilo-canvas-root="true"]') !== null;
}
export function collectClipboardFiles(data2) {
  if (!data2) return [];
  const collected = [];
  const seen2 = new Set();
  const push2 = (file, fallbackMime) => {
    const key2 = `${file.type}|${file.size}`;
    if (seen2.has(key2)) return;
    seen2.add(key2);
    if (!file.name || file.name === "image.png" || file.name === "image") {
      const ext = getExtFromMime(file.type || fallbackMime || "image/png", "png");
      collected.push(
        new File([file], `pasted-${Date.now()}.${ext}`, {
          type: file.type || fallbackMime,
        }),
      );
      return;
    }
    collected.push(file);
  };
  for (const file of Array.from(data2.files)) {
    push2(file);
  }
  for (const item of Array.from(data2.items)) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (!file) continue;
    push2(file, item.type);
  }
  return collected;
}
export function isFromInternalNativeCopy(files, internalNodes) {
  if (files.length === 0 || files.length !== internalNodes.length) return false;
  const fileNames = new Set(files.map((f2) => f2.name));
  return internalNodes.every((node2) => {
    const data2 = node2.data;
    const name2 = typeof data2?.name === "string" ? data2.name : void 0;
    const path2 = typeof data2?.path === "string" ? data2.path : void 0;
    const basename2 = path2 ? (path2.split("/").pop() ?? path2) : void 0;
    return Boolean((name2 && fileNames.has(name2)) || (basename2 && fileNames.has(basename2)));
  });
}
export function collectMeasuredSizes(storeApi) {
  const measured = new Map();
  const { nodeLookup } = storeApi.getState();
  for (const [id2, entry] of nodeLookup) {
    const m3 = entry.measured;
    if (m3?.width && m3?.height && m3.width > 0 && m3.height > 0) {
      measured.set(id2, {
        width: Math.round(m3.width),
        height: Math.round(m3.height),
      });
    }
  }
  return measured.size > 0 ? measured : void 0;
}
export function toHistoryActionResult(checkpoint, instance2) {
  const current2 =
    checkpoint && instance2.history.isCheckpointCurrent(checkpoint) ? checkpoint : null;
  return {
    changed: current2 !== null,
    checkpoint: current2,
  };
}
export const KEYBOARD_MOVE_COMMIT_DELAY_MS = 200;
export function generateNodeId() {
  return crypto.randomUUID();
}
export function isBoxFullyVisible(box2, rect) {
  return (
    box2.x >= rect.x &&
    box2.y >= rect.y &&
    box2.x + box2.width <= rect.x + rect.width &&
    box2.y + box2.height <= rect.y + rect.height
  );
}
const DEFAULT_WORKSPACE_SCOPE = "__default__";
function workspaceScope(workspaceId2) {
  return workspaceId2 || DEFAULT_WORKSPACE_SCOPE;
}
function buildByAssetFromRefs(refs) {
  const next2 = new Map();
  for (const { nodeId, assetId } of refs) {
    if (!assetId) continue;
    const list2 = next2.get(assetId);
    if (list2) list2.push(nodeId);
    else next2.set(assetId, [nodeId]);
  }
  return next2;
}
function buildByAsset(nodeIds) {
  const next2 = new Map();
  for (const id2 of nodeIds) {
    const { assetId } = parseNodeId(id2);
    const list2 = next2.get(assetId);
    if (list2) list2.push(id2);
    else next2.set(assetId, [id2]);
  }
  return next2;
}
function isSameAssetNodeIndex(current2, next2) {
  if (!current2 || current2.size !== next2.size) return false;
  for (const [assetId, nextNodeIds] of next2) {
    const currentNodeIds = current2.get(assetId);
    if (!currentNodeIds || currentNodeIds.length !== nextNodeIds.length) return false;
    if (nextNodeIds.some((nodeId, index2) => currentNodeIds[index2] !== nodeId)) return false;
  }
  return true;
}
export const useCanvasNodeAssetsStore = create$2((set2) => ({
  byWorkspace: new Map(),
  setFromNodes: (workspaceId2, refs) =>
    set2((state2) => {
      const scope = workspaceScope(workspaceId2);
      const byAsset = buildByAssetFromRefs(refs);
      if (isSameAssetNodeIndex(state2.byWorkspace.get(scope), byAsset)) return state2;
      const next2 = new Map(state2.byWorkspace);
      next2.set(scope, byAsset);
      return {
        byWorkspace: next2,
      };
    }),
  setFromNodeIds: (workspaceId2, nodeIds) =>
    set2((state2) => {
      const scope = workspaceScope(workspaceId2);
      const byAsset = buildByAsset(nodeIds);
      if (isSameAssetNodeIndex(state2.byWorkspace.get(scope), byAsset)) return state2;
      const next2 = new Map(state2.byWorkspace);
      next2.set(scope, byAsset);
      return {
        byWorkspace: next2,
      };
    }),
  clearWorkspace: (workspaceId2) =>
    set2((state2) => {
      const next2 = new Map(state2.byWorkspace);
      next2.delete(workspaceScope(workspaceId2));
      return {
        byWorkspace: next2,
      };
    }),
  clear: () =>
    set2({
      byWorkspace: new Map(),
    }),
}));
export function getNodeIdsForAsset(assetId, workspaceId2) {
  return (
    useCanvasNodeAssetsStore
      .getState()
      .byWorkspace.get(workspaceScope(workspaceId2))
      ?.get(assetId) ?? []
  );
}
const EMPTY_ASSET_NODE_IDS = new Map();
export function useCanvasAssetNodeIds(workspaceId2) {
  return useCanvasNodeAssetsStore(
    (state2) => state2.byWorkspace.get(workspaceScope(workspaceId2)) ?? EMPTY_ASSET_NODE_IDS,
  );
}
export function useHasAssetOnCanvas(assetId, workspaceId2) {
  return useCanvasNodeAssetsStore((state2) =>
    assetId ? (state2.byWorkspace.get(workspaceScope(workspaceId2))?.has(assetId) ?? false) : false,
  );
}
export function isEnoentErrorMessage(message2) {
  return /ENOENT|no such file or directory/i.test(message2);
}
const ELECTRON_BRIDGE_KEY = "__HILO_PLATFORM__";
export function isElectron() {
  return typeof window !== "undefined" && ELECTRON_BRIDGE_KEY in window;
}
export function getElectronPlatform() {
  if (!isElectron()) return void 0;
  return window[ELECTRON_BRIDGE_KEY];
}
class UnsupportedCapabilityError extends Error {
  capability;
  constructor(capability) {
    super(
      `Platform capability "${capability}" is not available. Check platform.capabilities.has('${capability}') before calling.`,
    );
    this.name = "UnsupportedCapabilityError";
    this.capability = capability;
  }
}
const WEB_CAPABILITIES = new Set(["clipboard", "notification", "shell"]);
const webFs = {
  async readTextFile() {
    throw new UnsupportedCapabilityError("fs");
  },
  async writeTextFile() {
    throw new UnsupportedCapabilityError("fs");
  },
  async exists() {
    throw new UnsupportedCapabilityError("fs");
  },
  async mkdir() {
    throw new UnsupportedCapabilityError("fs");
  },
  async readDir() {
    throw new UnsupportedCapabilityError("fs");
  },
};
const webWindow = {
  minimize() {},
  toggleMaximize() {},
  close() {
    window.close();
  },
  async isMaximized() {
    return false;
  },
  async isFullScreen() {
    return false;
  },
  setTitle(title) {
    document.title = title;
  },
};
const webClipboard = {
  async readText() {
    return navigator.clipboard.readText();
  },
  async writeText(text2) {
    await navigator.clipboard.writeText(text2);
  },
};
const webNotification = {
  show(title, body2, options) {
    if (!("Notification" in window)) return;
    const doShow = () => {
      if (Notification.permission !== "granted") return;
      const n2 = new Notification(title, {
        body: body2,
      });
      if (options?.onClick) {
        n2.onclick = options.onClick;
      }
    };
    if (Notification.permission === "default") {
      Notification.requestPermission().then(doShow);
    } else {
      doShow();
    }
  },
};
const webShell = {
  async openExternal(url2) {
    window.open(url2, "_blank");
  },
  async openExternalWithFallback(url2) {
    window.open(url2, "_blank");
  },
  async openInApp(url2) {
    window.open(url2, "_blank");
  },
};
const webStorage = {
  async workspaceLoad() {
    throw new UnsupportedCapabilityError("storage");
  },
  async workspaceGet() {
    throw new UnsupportedCapabilityError("storage");
  },
  async workspaceSet() {
    throw new UnsupportedCapabilityError("storage");
  },
  async globalLoad() {
    throw new UnsupportedCapabilityError("storage");
  },
  async globalGet() {
    throw new UnsupportedCapabilityError("storage");
  },
  async globalSet() {
    throw new UnsupportedCapabilityError("storage");
  },
};
const webAppInfo = {
  version: "0.0.0",
  platform: "web",
  os: "browser",
  arch: "browser",
  runningUnderARM64Translation: false,
};
const webPlatform = {
  capabilities: WEB_CAPABILITIES,
  fs: webFs,
  window: webWindow,
  clipboard: webClipboard,
  notification: webNotification,
  shell: webShell,
  app: webAppInfo,
  storage: webStorage,
};
export function getPlatform() {
  return getElectronPlatform() ?? webPlatform;
}
const PAGE_MAP = {
  "/": "Home",
  "/projects": "Projects",
  "/projects/": "Projects",
  "/skills": "Skills",
  "/skills/": "Skills",
  "/workflows": "ComfyUI Workflows",
  "/workflows/": "ComfyUI Workflows",
  "/workspace": "Workspace",
  "/workspace/": "Workspace",
};
export function resolvePageTitle(pathname) {
  return PAGE_MAP[pathname] ?? PAGE_MAP[pathname.replace(/\/$/, "")] ?? pathname;
}
export function resolveEventIpCountry(eventValue, fallback) {
  return typeof eventValue === "string" ? eventValue : fallback;
}
export const TRACK_EVENTS = {
  // App lifecycle
  APP_LAUNCH: "app_launch",
  APP_QUIT: "app_quit",
  APP_CRASH: "app_crash",
  APP_ERROR: "app_error",
  APP_MEMORY_WARNING: "app_memory_warning",
  APP_PERFORMANCE: "app_performance",
  MEDIA_REFERENCE_DIAGNOSTIC_RESULT: "media_reference_diagnostic_result",
  GPU_RECOVERY: "gpu_recovery",
  WORKSPACE_RETENTION_SAMPLE: "workspace_retention_sample",
  DATA_DIRECTORY_ACTIVATION: "data_directory_activation",
  DATA_DIRECTORY_FALLBACK_CREATE: "data_directory_fallback_create",
  DATA_DIRECTORY_RECOVERY: "data_directory_recovery",
  DATA_DIRECTORY_MIGRATION_BLOCKED: "data_directory_migration_blocked",
  RUM_INIT_STATUS: "rum_init_status",
  UPDATER_POLICY_BOOTSTRAP: "updater_policy_bootstrap",
  LEGACY_INSTALL_CENSUS_POLICY_EVALUATED: "legacy_install_census_policy_evaluated",
  LEGACY_INSTALL_DETECTED: "legacy_install_detected",
  // Auth
  ...AUTH_TRACK_EVENTS,
  // Team / request-and-billing Group recovery
  TEAM_GROUP_RECOVERY: "team_group_recovery",
  // WebSocket
  WS_CONNECT_START: "ws_connect_start",
  WS_CONNECT_SUCCESS: "ws_connect_success",
  WS_CONNECT_FAILED: "ws_connect_failed",
  WS_DISCONNECT: "ws_disconnect",
  WS_RECONNECT: "ws_reconnect",
  // Chat
  CHAT_SESSION_CREATE: "chat_session_create",
  CHAT_SESSION_SWITCH: "chat_session_switch",
  CHAT_MESSAGE_SEND: "chat_message_send",
  CHAT_MESSAGE_RECEIVED: "chat_message_received",
  CHAT_MESSAGE_FAILED: "chat_message_failed",
  /** Observe-only watchdog stall notice shown/recovered (`session_stalled` push). */
  CHAT_SESSION_STALLED: "chat_session_stalled",
  /** User decision on the stall banner: keep waiting (dismiss) or stop task. */
  CHAT_SESSION_STALL_ACTION: "chat_session_stall_action",
  /** Authoritative terminal outcome of a LoopGuard confirmation. */
  CHAT_LOOP_GUARD_SETTLED: "chat_loop_guard_settled",
  /** User interaction with the workspace chat composer toolbar. */
  CHAT_TOOLBAR_ACTION: "chat_toolbar_action",
  /** User explicitly stops the currently running agent turn. */
  CHAT_TASK_STOP: "chat_task_stop",
  /** User interaction with the workspace chat session tab strip. */
  CHAT_SESSION_TAB_ACTION: "chat_session_tab_action",
  /** User action on an http(s) link rendered inside a chat message. */
  CHAT_LINK_ACTION: "chat_link_action",
  // Upload
  UPLOAD_FILE_START: "upload_file_start",
  UPLOAD_FILE_SUCCESS: "upload_file_success",
  UPLOAD_FILE_FAILED: "upload_file_failed",
  // Generation tasks
  GENERATE_TASK_SUBMIT: "generate_task_submit",
  GENERATE_TASK_SUCCESS: "generate_task_success",
  GENERATE_TASK_FAILED: "generate_task_failed",
  GENERATE_TASK_CANCEL: "generate_task_cancel",
  MODEL_CATALOG_POLLING_POLICY_INVALID: "model_catalog_polling_policy_invalid",
  // MCP tools
  MCP_TOOL_CALL_START: "mcp_tool_call_start",
  MCP_TOOL_CALL_SUCCESS: "mcp_tool_call_success",
  MCP_TOOL_CALL_FAILED: "mcp_tool_call_failed",
  // Gateway HTTP
  GATEWAY_API_REQUEST: "gateway_api_request",
  GATEWAY_API_RESPONSE: "gateway_api_response",
  GATEWAY_API_FAILED: "gateway_api_failed",
  // Workspace
  WORKSPACE_CREATE: "workspace_create",
  WORKSPACE_OPEN: "workspace_open",
  WORKSPACE_CLOSE: "workspace_close",
  WORKSPACE_RESTORE_CIRCUIT_BREAKER: "workspace_restore_circuit_breaker",
  PROJECT_EXPORT_FAILED: "project_export_failed",
  PROJECT_IMPORT_RESULT: "project_import_result",
  HUB_ENTRY_LOAD_RESULT: "hub_entry_load_result",
  // Skills
  SKILL_INSTALL: "skill_install",
  SKILL_INSTALL_FAILED: "skill_install_failed",
  SKILL_UNINSTALL: "skill_uninstall",
  SKILL_UNINSTALL_FAILED: "skill_uninstall_failed",
  SKILL_TOGGLE: "skill_toggle",
  SKILL_INVOKE: "skill_invoke",
  // Skill market (browse / detail / acquisition funnel)
  SKILL_MARKET_OPEN: "skill_market_open",
  SKILL_DETAIL_VIEW: "skill_detail_view",
  SKILL_TRY: "skill_try",
  SKILL_EXPORT: "skill_export",
  SKILL_FORK: "skill_fork",
  SKILL_IMPORT: "skill_import",
  SKILL_IMPORT_FAILED: "skill_import_failed",
  SKILL_SEARCH: "skill_search",
  SKILL_FILTER: "skill_filter",
  SKILL_LOAD_MORE: "skill_load_more",
  SKILL_TAB_SWITCH: "skill_tab_switch",
  // Skill creator (user-authored skills)
  SKILL_CREATOR_INVOKE: "skill_creator_invoke",
  // Post-install activation funnel
  SKILL_DEBUG_OPEN: "skill_debug_open",
  // Home page (scene tags + curated query funnel)
  HOME_SCENE_TAG_CLICK: "home_scene_tag_click",
  HOME_SCENE_QUERY_SELECT: "home_scene_query_select",
  HOME_QUICK_START_CONFIG_RESOLUTION: "home_quick_start_config_resolution",
  HOME_MEDIA_SHOWCASE_CONFIG_RESOLUTION: "home_media_showcase_config_resolution",
  HOME_MEDIA_SHOWCASE_EXPOSURE: "home_media_showcase_exposure",
  HOME_MEDIA_SHOWCASE_TAB_EXPOSURE: "home_media_showcase_tab_exposure",
  HOME_MEDIA_SHOWCASE_TAB_SWITCH: "home_media_showcase_tab_switch",
  HOME_MEDIA_SHOWCASE_CONTENT_EXPOSURE: "home_media_showcase_content_exposure",
  HOME_MEDIA_SHOWCASE_CONTENT_CLICK: "home_media_showcase_content_click",
  HOME_WIDGET_VIEW: "home_widget_view",
  HOME_WIDGET_CLICK: "home_widget_click",
  HOME_WIDGET_DISMISS: "home_widget_dismiss",
  HOME_WIDGET_ACTION_FAILED: "home_widget_action_failed",
  // Settings
  SETTINGS_CHANGE: "settings_change",
  // 服务端编排弹窗(详见 modules/business/server-driven-popup)
  SERVER_DRIVEN_POPUP_VIEW: "server_driven_popup_view",
  SERVER_DRIVEN_POPUP_ACTION_CLICK: "server_driven_popup_action_click",
  SERVER_DRIVEN_POPUP_ACTION_FAILED: "server_driven_popup_action_failed",
  SERVER_DRIVEN_POPUP_DISMISS: "server_driven_popup_dismiss",
  // Onboarding (first-launch guide tour) — REMOVED: 4-step tour deprecated, replaced by
  // login-gate (auth.login-gate) + interest-selection (interestSelection) flow.
  // Login gate (启动强阻断登录弹窗)
  LOGIN_GATE_VIEW: "login_gate_view",
  LOGIN_GATE_DISMISS: "login_gate_dismiss",
  // Interest selection (登录后创作方向多选)
  INTEREST_SELECTION_VIEW: "interest_selection_view",
  INTEREST_SELECTION_COMPLETE: "interest_selection_complete",
  // Coach mark (in-app guided tips)
  COACH_MARK_SHOW: "coach_mark_show",
  COACH_MARK_DISMISS: "coach_mark_dismiss",
  // Plugin discovery → detail → install → canvas adoption → use funnel
  PLUGIN_CLICK: "plugin_click",
  PLUGIN_LIST_VIEW: "plugin_list_view",
  PLUGIN_DETAIL_VIEW: "plugin_detail_view",
  PLUGIN_INSTALL: "plugin_install",
  PLUGIN_INSTALL_FAILED: "plugin_install_failed",
  PLUGIN_UNINSTALL: "plugin_uninstall",
  PLUGIN_UNINSTALL_FAILED: "plugin_uninstall_failed",
  PLUGIN_ADD_TO_CANVAS: "plugin_add_to_canvas",
  PLUGIN_ADD_TO_CANVAS_FAILED: "plugin_add_to_canvas_failed",
  PLUGIN_EDITOR_OPEN: "plugin_editor_open",
  PLUGIN_WORKFLOW_CLICK: "plugin_workflow_click",
  PLUGIN_WORKFLOW_OPEN: "plugin_workflow_open",
  PLUGIN_WORKFLOW_OPEN_FAILED: "plugin_workflow_open_failed",
  PLUGIN_OUTPUT_CREATE: "plugin_output_create",
  // ComfyUI workflow catalogue, canvas binding and batch execution funnel.
  COMFYUI_WORKFLOW_CATALOG_ACTION: "comfyui_workflow_catalog_action",
  COMFYUI_WORKFLOW_INSTALL: "comfyui_workflow_install",
  COMFYUI_WORKFLOW_INSTALL_FAILED: "comfyui_workflow_install_failed",
  COMFYUI_WORKFLOW_OPEN: "comfyui_workflow_open",
  COMFYUI_WORKFLOW_OPEN_FAILED: "comfyui_workflow_open_failed",
  COMFYUI_WORKFLOW_DRAFT_ACTION: "comfyui_workflow_draft_action",
  // Updater
  APP_UPDATE_CHECK: "app_update_check",
  APP_UPDATE_DOWNLOAD: "app_update_download",
  APP_UPDATE_INSTALL: "app_update_install",
  APP_UPDATE_INSTALL_SAFETY_BLOCKED: "app_update_install_safety_blocked",
  APP_INSTALL_LOCATION: "app_install_location",
  UPDATER_FAILURE: "updater_failure",
  // Canvas
  CANVAS_OPEN: "canvas_open",
  CANVAS_RENDER_POLICY_APPLIED: "canvas_render_policy_applied",
  CANVAS_SURFACE_RECOVERY: "canvas_surface_recovery",
  CANVAS_NODE_ADD: "canvas_node_add",
  CANVAS_NODE_RUN: "canvas_node_run",
  CANVAS_EXPORT: "canvas_export",
  CANVAS_POPOVER_OPEN: "canvas_popover_open",
  CANVAS_GENERATE_SUBMIT: "canvas_generate_submit",
  // Canvas view enter
  CANVAS_VIEW_ENTER: "canvas_view_enter",
  CANVAS_STICKER_ADD: "canvas_sticker_add",
  CANVAS_ZOOM_CHANGE: "canvas_zoom_change",
  CANVAS_MINIMAP_TOGGLE: "canvas_minimap_toggle",
  CANVAS_EDGES_TOGGLE: "canvas_edges_toggle",
  // Canvas — generation outcome / satisfaction (proposal theme 1)
  CANVAS_NODE_REGENERATE: "canvas_node_regenerate",
  CANVAS_NODE_SAVE: "canvas_node_save",
  CANVAS_NODE_DELETE_AFTER_GENERATE: "canvas_node_delete_after_generate",
  CANVAS_NODE_TOOL_CLICK: "canvas_node_tool_click",
  CANVAS_NODE_TOOL_APPLY: "canvas_node_tool_apply",
  CANVAS_NODE_TOOL_ABANDON: "canvas_node_tool_abandon",
  CANVAS_GENERATE_ABANDON: "canvas_generate_abandon",
  // Canvas — common node interactions (proposal theme 2)
  CANVAS_NODE_COPY_PASTE: "canvas_node_copy_paste",
  CANVAS_UNDO_REDO: "canvas_undo_redo",
  CANVAS_CONTEXT_MENU_CLICK: "canvas_context_menu_click",
  CANVAS_SHORTCUT_USE: "canvas_shortcut_use",
  CANVAS_SELECTION_CHANGE: "canvas_selection_change",
  CANVAS_SIDEBAR_HOME_CLICK: "canvas_sidebar_home_click",
  CANVAS_SIDEBAR_TAB_CLICK: "canvas_sidebar_tab_click",
  // Canvas — pre-generate parameter selection (proposal theme 3)
  CANVAS_PARAM_ADJUST: "canvas_param_adjust",
  CANVAS_POPOVER_CLOSE_WITHOUT_SUBMIT: "canvas_popover_close_without_submit",
  CANVAS_POPOVER_CHIP_OPEN: "canvas_popover_chip_open",
  CANVAS_NODE_CONTENT_EDIT: "canvas_node_content_edit",
  CANVAS_LUT_IMPORT_CLICK: "canvas_lut_import_click",
  CANVAS_LUT_IMPORT_SUCCESS: "canvas_lut_import_success",
  CANVAS_LUT_IMPORT_FAILED: "canvas_lut_import_failed",
  // Chat — model picker (proposal theme 3)
  CHAT_MODEL_CHANGE: "chat_model_change",
  // Dialog (proposal theme 4 — generic dialog funnel)
  DIALOG_OPEN: "dialog_open",
  DIALOG_CLOSE: "dialog_close",
  DIALOG_STEP_CHANGE: "dialog_step_change",
  DIALOG_VALIDATION_ERROR: "dialog_validation_error",
  // Home (proposal theme 5) — input / attachment / popovers / tutorial / promo
  HOME_INPUT_FOCUS: "home_input_focus",
  HOME_INPUT_SUBMIT: "home_input_submit",
  HOME_INPUT_STOP: "home_input_stop",
  HOME_INPUT_CLEAR: "home_input_clear",
  HOME_ATTACHMENT_PICKER_OPEN: "home_attachment_picker_open",
  HOME_ATTACHMENT_ADD: "home_attachment_add",
  HOME_ATTACHMENT_REMOVE: "home_attachment_remove",
  HOME_SKILLS_POPOVER_OPEN: "home_skills_popover_open",
  HOME_MENTION_POPOVER_OPEN: "home_mention_popover_open",
  HOME_MODEL_PICKER_OPEN: "home_model_picker_open",
  HOME_MODEL_SELECTION_CHANGE: "home_model_selection_change",
  HOME_WORKSPACE_FOLDER_ACTION: "home_workspace_folder_action",
  HOME_TUTORIAL_CLICK: "home_tutorial_click",
  HOME_PROMOTION_SHOW: "home_promotion_show",
  HOME_PROMOTION_CLICK: "home_promotion_click",
  HOME_NAV_CLICK: "home_nav_click",
  // Built-in browser
  BROWSER_SURFACE_ACTION: "browser_surface_action",
  BROWSER_INSPIRATION_ACTION: "browser_inspiration_action",
  BROWSER_TAB_ACTION: "browser_tab_action",
  BROWSER_ADDRESS_SUBMIT: "browser_address_submit",
  BROWSER_BOOKMARK_ACTION: "browser_bookmark_action",
  BROWSER_TOOLBAR_ACTION: "browser_toolbar_action",
  BROWSER_NAVIGATION: "browser_navigation",
  BROWSER_REFERENCE_ACTION: "browser_reference_action",
  BROWSER_CAPTURE_RESULT: "browser_capture_result",
  BROWSER_ANNOTATION_ACTION: "browser_annotation_action",
  BROWSER_DOWNLOAD_START: "browser_download_start",
  BROWSER_DOWNLOAD_RESULT: "browser_download_result",
  BROWSER_DOWNLOAD_ACTION: "browser_download_action",
  BROWSER_PROFILE_IMPORT_ACTION: "browser_profile_import_action",
  // Credits details
  CREDIT_DETAILS_ACTION: "credit_details_action",
  // Settings navigation / memory management
  SETTINGS_SECTION_VIEW: "settings_section_view",
  MEMORY_MANAGEMENT_ACTION: "memory_management_action",
  // Topbar (proposal theme 5)
  TOPBAR_HOME_CLICK: "topbar_home_click",
  TOPBAR_SEARCH_OPEN: "topbar_search_open",
  GLOBAL_SEARCH_QUERY: "global_search_query",
  GLOBAL_SEARCH_RESULT_CLICK: "global_search_result_click",
  GLOBAL_SEARCH_COMMAND_EXECUTE: "global_search_command_execute",
  GLOBAL_SEARCH_NO_RESULT: "global_search_no_result",
  GLOBAL_SEARCH_CLOSE: "global_search_close",
  TOPBAR_TAB_ACTION: "topbar_tab_action",
  TOPBAR_TAB_CONTEXT_MENU_SELECT: "topbar_tab_context_menu_select",
  TOPBAR_NEW_WORKSPACE_CLICK: "topbar_new_workspace_click",
  WORKSPACE_OPEN_SUBMIT: "workspace_open_submit",
  // User menu (proposal theme 5)
  USER_MENU_OPEN: "user_menu_open",
  USER_MENU_ACTION: "user_menu_action",
  // Asset center
  ASSET_CREATE: "asset_create",
  ASSET_USE: "asset_use",
  ASSET_MATERIALIZE: "asset_materialize",
  ASSET_UNMATERIALIZE: "asset_unmaterialize",
  ASSET_PANEL_ACTION: "asset_panel_action",
  ASSET_CENTER_ACTION: "asset_center_action",
  ASSET_CENTER_SEARCH: "asset_center_search",
  ASSET_CENTER_FILTER: "asset_center_filter",
  ASSET_CENTER_SORT_CHANGE: "asset_center_sort_change",
  ASSET_CENTER_VIEW_CHANGE: "asset_center_view_change",
  ASSET_CREATE_FORM_ACTION: "asset_create_form_action",
  ASSET_EDIT_FORM_ACTION: "asset_edit_form_action",
  ASSET_EXPORT: "asset_export",
  ASSET_DETAIL_VIEW: "asset_detail_view",
  ASSET_DELETE: "asset_delete",
  ASSET_MATERIALIZE_DIALOG: "asset_materialize_dialog",
  ASSET_PROMOTE_VALIDATION_FAILED: "asset_promote_validation_failed",
  // IM bridge (Feishu / WeChat / Telegram → agent)
  IM_BRIDGE_OPEN: "im_bridge_open",
  IM_BRIDGE_ACCOUNT_ACTION: "im_bridge_account_action",
  IM_MESSAGE_SEND: "im_message_send",
  IM_MESSAGE_FAILED: "im_message_failed",
  // Page view (auto)
  PAGE_VIEW: "$pageview",
};
