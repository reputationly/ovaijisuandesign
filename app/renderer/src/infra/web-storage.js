// web-storage.js
import { getElectronPlatform } from "./use-canvas-node-assets-store.js";

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
