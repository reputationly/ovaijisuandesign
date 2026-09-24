/**
 * 应用菜单与 `menu:trigger`。菜单项只通知渲染层（新建标签、关标签、导入导出），
 * 真正的流程在渲染层；"新建窗口"是例外：主进程先建好工作区，再把 id 发过去。
 */
import { app, BrowserWindow, Menu, type MenuItemConstructorOptions, type WebContents } from "electron";

import { IPC } from "./ipc/channels.js";

export interface MenuDeps {
  createWorkspace(): Promise<string | undefined>;
  openLogDir(): void;
}

function focusedContents(sender?: WebContents): WebContents | undefined {
  if (sender && !sender.isDestroyed()) return sender;
  const w = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  return w?.webContents;
}

export async function triggerMenuAction(actionId: string, deps: MenuDeps, sender?: WebContents): Promise<void> {
  const wc = focusedContents(sender);
  const send = (channel: string, ...args: unknown[]) => wc && !wc.isDestroyed() && wc.send(channel, ...args);
  const win = wc ? BrowserWindow.fromWebContents(wc) : null;
  switch (actionId) {
    case "new-window": {
      const id = await deps.createWorkspace();
      if (id) send(IPC.menuNewWorkspace, id);
      return;
    }
    case "new-chat":
      send("menu:new-chat");
      return;
    case "open-settings":
      send("menu:open-settings");
      return;
    case "import-project":
      send("menu:import-project");
      return;
    case "export-project":
      send("menu:export-project");
      return;
    case "close-tab":
      send(IPC.menuCloseTab);
      return;
    case "feedback":
      send("menu:open-feedback");
      return;
    case "minimize":
      win?.minimize();
      return;
    case "toggle-fullscreen":
      win?.setFullScreen(!win.isFullScreen());
      return;
    case "reload":
      wc?.reload();
      return;
    case "toggle-devtools":
      wc?.toggleDevTools();
      return;
    case "open-logs-folder":
      deps.openLogDir();
      return;
    case "quit":
      app.quit();
      return;
    default:
      // 编辑类动作（undo/copy/…）由菜单角色直接处理；其余不支持的忽略
      return;
  }
}

export function installAppMenu(deps: MenuDeps): void {
  const act = (id: string) => () => void triggerMenuAction(id, deps);
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === "darwin" ? [{ role: "appMenu" as const }] : []),
    {
      label: "文件",
      submenu: [
        { label: "新建对话", accelerator: "CmdOrCtrl+N", click: act("new-chat") },
        { label: "新建窗口", accelerator: "CmdOrCtrl+Shift+N", click: act("new-window") },
        { type: "separator" },
        { label: "导入项目…", click: act("import-project") },
        { label: "导出项目…", click: act("export-project") },
        { type: "separator" },
        { label: "关闭标签", accelerator: "CmdOrCtrl+W", click: act("close-tab") },
      ],
    },
    { role: "editMenu" },
    {
      label: "视图",
      submenu: [{ role: "reload" }, { role: "toggleDevTools" }, { type: "separator" }, { role: "togglefullscreen" }],
    },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
