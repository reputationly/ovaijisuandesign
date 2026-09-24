/**
 * 原始 IPC 通道名。preload 的白名单就是这里的全集：不在表里的通道渲染层收发不了，
 * 避免页面里的脚本随便摸到主进程的 handler。主进程和 preload 共用这一份。
 */

const group = (domain: string, names: string[]) => names.map((n) => `${domain}:${n}`);

/** 主进程代码里直接引用的那些。 */
export const IPC = {
  hello: "hilo:hello",
  message: "hilo:message",
  disconnect: "hilo:disconnect",
  storageGlobalGet: "storage:global-get",
  storageGlobalSet: "storage:global-set",
  storageWorkspaceGet: "storage:workspace-get",
  storageWorkspaceSet: "storage:workspace-set",
  storageGlobalConfigChanged: "storage:global-config-changed",
  menuNewWorkspace: "menu:new-workspace",
  menuCloseTab: "menu:close-tab",
  skillPermissionsChanged: "skill:permissions-changed-to-renderer",
  fullscreenChanged: "window:fullscreen-changed",
} as const;

export const ALL_IPC_CHANNELS: readonly string[] = [
  // 总线；`hilo:close-tab` 是 DOM 事件名，一并放行
  ...group("hilo", ["hello", "message", "disconnect", "close-tab"]),
  ...group("window", ["minimize", "maximize", "close", "is-maximized", "is-fullscreen", "fullscreen-changed", "set-button-visibility"]),
  ...group("app", [
    "get-version", "get-platform", "get-runtime-info", "get-diagnostics-context", "get-log-path",
    "open-log-dir", "quit", "get-proxy-status", "add-breadcrumb",
  ]),
  ...group("shell", [
    "open-external", "open-external-with-fallback", "open-in-app", "open-path", "show-item-in-folder",
    "inspect-file-reference", "reveal-file-reference", "trash-item",
  ]),
  ...group("clipboard", ["read-text", "write-text", "write-image", "write-image-data", "write-file"]),
  ...group("fs", [
    "exists", "read-dir", "read-text-file", "write-text-file", "write-binary-file", "mkdir", "rename",
    "delete", "stat", "copy", "watch", "unwatch", "change",
  ]),
  ...group("dialog", ["open", "save"]),
  ...group("hot-update", ["check", "clear-cache", "reload", "get-version", "get-version-sync"]),
  ...group("updater", ["check", "download", "cancel-download", "dismiss", "get-status", "get-version", "state-changed"]),
  "screenshot:start",
  "deeplink:received",
  ...group("auth", [
    "fetch-user-info", "renew-token", "login", "logout", "changed-to-main", "changed-to-renderer",
    "expired-to-main", "expired-to-renderer",
  ]),
  "skill:permissions-changed-to-renderer",
  ...group("storage", [
    "get-tokens", "set-tokens", "clear-tokens", "get-user", "set-user", "clear-user", "get-desktop-config",
    "set-desktop-config", "clear-all", "workspace-get", "workspace-set", "global-get", "global-set",
    "global-config-changed",
  ]),
  ...group("notification", ["show", "click", "close"]),
  ...group("log", ["write", "export", "upload"]),
  ...group("browser", [
    "get-state", "downloads-get", "download-action", "download-transfer", "download-save-prompt",
    "downloads-open-folder", "downloads-changed", "set-surface-open", "set-native-view-occlusion",
    "surface-requested", "create-tab", "show-tab", "hide-tab", "destroy-tab", "navigate", "back", "forward",
    "reload", "set-bounds", "set-zoom", "set-device-preview", "set-annotation", "screenshot", "capture-frame",
    "open-external", "clear-cookies", "clear-cache", "import-cookies", "import-bookmarks", "open-menu",
    "downloads-open-panel", "downloads-close-panel", "downloads-update-panel", "downloads-panel-state",
    "close-menu", "show-project-preview", "hide-project-preview", "project-preview-event", "update-menu",
    "menu-state-changed", "state-changed",
  ]),
  ...group("browser-profile-import", ["list", "start", "cancel", "progress", "requested"]),
  ...group("browser-bookmark-import", ["list", "start", "requested"]),
  "browser-bookmark:delete",
  "browser-plugin:renderer-event",
  "opencode:restart",
  "proxy:detected-toast",
  ...group("network", ["status-changed", "get-status"]),
  ...group("perf", ["capture-cpu", "capture-heap", "capture-trace", "capture-netlog"]),
  ...group("memory", ["get-stats", "low-toast", "pressure-relief"]),
  "runtime:memory-reclaim",
  ...group("menu", ["new-chat", "new-workspace", "close-tab", "open-settings", "import-project", "export-project", "open-feedback", "trigger"]),
];

export const ALLOWED_IPC_CHANNELS: ReadonlySet<string> = new Set(ALL_IPC_CHANNELS);
