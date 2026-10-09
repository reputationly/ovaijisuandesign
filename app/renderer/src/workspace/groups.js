// groups.js

export const GROUPS = [
  {
    id: "file",
    items: [
      {
        kind: "item",
        action: "new-chat",
        key: "newChat",
        accelerator: "Ctrl+N",
      },
      {
        kind: "item",
        action: "new-window",
        key: "newWindow",
        accelerator: "Ctrl+Shift+N",
      },
      {
        kind: "separator",
      },
      {
        kind: "item",
        action: "import-project",
        key: "importProject",
      },
      {
        kind: "item",
        action: "export-project",
        key: "exportProject",
      },
      {
        kind: "separator",
      },
      {
        kind: "item",
        action: "close-tab",
        key: "closeTab",
        accelerator: "Ctrl+W",
      },
      {
        kind: "separator",
      },
      {
        kind: "item",
        action: "open-settings",
        key: "settings",
        accelerator: "Ctrl+,",
      },
      {
        kind: "item",
        action: "quit",
        key: "quit",
      },
    ],
  },
  {
    id: "window",
    items: [
      {
        kind: "item",
        action: "minimize",
        key: "minimize",
      },
      {
        kind: "item",
        action: "toggle-fullscreen",
        key: "toggleFullscreen",
        accelerator: "F11",
      },
      {
        kind: "separator",
      },
      {
        kind: "item",
        action: "reload",
        key: "reload",
        accelerator: "Ctrl+R",
      },
    ],
  },
  {
    id: "help",
    items: [
      {
        kind: "item",
        action: "check-for-updates",
        key: "checkForUpdates",
      },
      {
        kind: "separator",
      },
      {
        kind: "item",
        action: "open-logs-folder",
        key: "openLogsFolder",
      },
      {
        kind: "item",
        action: "export-logs",
        key: "exportLogs",
      },
      {
        kind: "item",
        action: "upload-logs",
        key: "uploadLogs",
      },
      {
        kind: "separator",
      },
      {
        kind: "item",
        action: "feedback",
        key: "feedback",
      },
      {
        kind: "item",
        action: "documentation",
        key: "documentation",
      },
    ],
  },
];
