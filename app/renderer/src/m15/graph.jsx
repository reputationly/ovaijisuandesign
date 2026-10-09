// graph.jsx
import {
  reactExports,
  CompositedSvg,
  TooltipProvider$2,
  getRuntimeConfig,
  desktopMediaIcon,
  PlaybackPauseIcon$1,
  MonochromeIcon,
  MenuRoot,
  MenuGroup,
  MenuRadioGroup,
  MenuSubmenuRoot,
  TooltipRoot,
  TooltipTrigger$1,
  PlatformContext,
  makeLogger,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { IPCClient, ProxyChannel } from "./channel-client.js";
import { DisposableStore } from "./linked-list.js";
import { getPlatform } from "./track-events.js";
import { Event$1, VSBuffer } from "./vs-buffer.js";
class Protocol {
  constructor(sender, onMessage) {
    this.sender = sender;
    this.onMessage = onMessage;
  }
  send(message2) {
    try {
      this.sender.send("hilo:message", message2.buffer);
    } catch (_e2) {}
  }
  disconnect() {
    this.sender.send("hilo:disconnect", null);
  }
}
const hiloGlobal = globalThis;
const ipcRenderer =
  hiloGlobal.hilo?.ipcRenderer ??
  (() => {
    throw new Error("hilo.ipcRenderer is not available. Is the preload script configured?");
  })();
class Client extends IPCClient {
  protocol;
  static createProtocol() {
    const onMessage = Event$1.fromNodeEventEmitter(
      {
        on(event, listener) {
          const dispose2 = ipcRenderer.on(event, listener);
          listener.__hiloDispose = dispose2;
          return this;
        },
        removeListener(_event, listener) {
          const disposeFn = listener.__hiloDispose;
          if (typeof disposeFn === "function") {
            disposeFn();
            delete listener.__hiloDispose;
          }
          return this;
        },
      },
      "hilo:message",
      (_2, message2) => VSBuffer.wrap(message2),
    );
    ipcRenderer.send("hilo:hello");
    return new Protocol(
      {
        send: (channel, msg) => ipcRenderer.send(channel, msg),
      },
      onMessage,
    );
  }
  constructor(id2) {
    const protocol = Client.createProtocol();
    super(protocol, id2);
    this.protocol = protocol;
  }
  dispose() {
    this.protocol.disconnect();
    super.dispose();
  }
}
let Node$1 = class Node4 {
  constructor(key2, data2) {
    this.key = key2;
    this.data = data2;
  }
  incoming = new Map();
  outgoing = new Map();
};
export class Graph {
  constructor(_hashFn) {
    this._hashFn = _hashFn;
  }
  _nodes = new Map();
  roots() {
    const ret = [];
    for (const node2 of this._nodes.values()) {
      if (node2.outgoing.size === 0) {
        ret.push(node2);
      }
    }
    return ret;
  }
  insertEdge(from2, to) {
    const fromNode = this.lookupOrInsertNode(from2);
    const toNode = this.lookupOrInsertNode(to);
    fromNode.outgoing.set(toNode.key, toNode);
    toNode.incoming.set(fromNode.key, fromNode);
  }
  removeNode(data2) {
    const key2 = this._hashFn(data2);
    this._nodes.delete(key2);
    for (const node2 of this._nodes.values()) {
      node2.outgoing.delete(key2);
      node2.incoming.delete(key2);
    }
  }
  lookupOrInsertNode(data2) {
    const key2 = this._hashFn(data2);
    let node2 = this._nodes.get(key2);
    if (!node2) {
      node2 = new Node$1(key2, data2);
      this._nodes.set(key2, node2);
    }
    return node2;
  }
  lookup(data2) {
    return this._nodes.get(this._hashFn(data2));
  }
  isEmpty() {
    return this._nodes.size === 0;
  }
  toString() {
    const data2 = [];
    for (const [key2, value] of this._nodes) {
      data2.push(`${key2}
	(-> incoming)[${[...value.incoming.keys()].join(", ")}]
	(outgoing ->)[${[...value.outgoing.keys()].join(",")}]
`);
    }
    return data2.join("\n");
  }
  findCycleSlow() {
    for (const [id2, node2] of this._nodes) {
      const seen2 = new Set([id2]);
      const res = this._findCycle(node2, seen2);
      if (res) {
        return res;
      }
    }
    return void 0;
  }
  _findCycle(node2, seen2) {
    for (const [id2, outgoing] of node2.outgoing) {
      if (seen2.has(id2)) {
        return [...seen2, id2].join(" -> ");
      }
      seen2.add(id2);
      const value = this._findCycle(outgoing, seen2);
      if (value) {
        return value;
      }
      seen2.delete(id2);
    }
    return void 0;
  }
}
export class ServiceCollection {
  _entries = new Map();
  constructor(...entries2) {
    for (const [id2, service2] of entries2) {
      this.set(id2, service2);
    }
  }
  set(id2, instanceOrDescriptor) {
    const result = this._entries.get(id2);
    this._entries.set(id2, instanceOrDescriptor);
    return result;
  }
  has(id2) {
    return this._entries.has(id2);
  }
  get(id2) {
    return this._entries.get(id2);
  }
}
export const _enableAllTracing = false;
export class CyclicDependencyError extends Error {
  constructor(graph) {
    super("cyclic dependency between services");
    this.message =
      graph.findCycleSlow() ??
      `UNABLE to detect cycle, dumping graph: 
${graph.toString()}`;
  }
}
export class Trace {
  constructor(type2, name2) {
    this.type = type2;
    this.name = name2;
  }
  static traceInvocation(_enableTracing, _ctor) {
    return Trace._None;
  }
  static traceCreation(_enableTracing, _ctor) {
    return Trace._None;
  }
  static _None = new (class extends Trace {
    constructor() {
      super(-1, null);
    }
    branch() {
      return this;
    }
    stop() {}
  })();
  branch(_id, _first) {
    return Trace._None;
  }
  stop() {}
}
export const disposables = new DisposableStore();
export const client = new Client("renderer");
disposables.add(client);
export const services = new ServiceCollection();
export const workspaceId = new URLSearchParams(window.location.search).get("workspaceId");
const workspaceBundleCache = new Map();
export function getWorkspaceBundle(workspaceId2) {
  const cached = workspaceBundleCache.get(workspaceId2);
  if (cached) return cached;
  const bundle = ProxyChannel.toService(client.getChannel(`workspace-bundle-${workspaceId2}`));
  workspaceBundleCache.set(workspaceId2, bundle);
  return bundle;
}
export function pruneWorkspaceBundleCache(activeWorkspaceIds) {
  for (const cachedId of workspaceBundleCache.keys()) {
    if (!activeWorkspaceIds.has(cachedId)) {
      workspaceBundleCache.delete(cachedId);
    }
  }
}
const EMPTY_DOWNLOAD_PROGRESS = {
  tasks: [],
  activeTasks: [],
  cancelTask: () => {},
  dismissTask: () => {},
  clearFinished: () => {},
  openModelsFolder: () => {},
};
export const ComfyUiDownloadProgressContext = reactExports.createContext(EMPTY_DOWNLOAD_PROGRESS);
export function useComfyUiDownloadProgress() {
  return reactExports.useContext(ComfyUiDownloadProgressContext);
}
export function isActiveComfyUiDownloadTask(task) {
  return task.status === "queued" || task.status === "verifying" || task.status === "downloading";
}
const macLocalFolderIcon = "" + new URL("../mac-CHMBn6kt.png", import.meta.url).href;
const windowsLocalFolderIcon =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFgAAABYCAYAAABxlTA0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAOdEVYdFNvZnR3YXJlAEZpZ21hnrGWYwAAA4lJREFUeAHt3M1OE1EYBuD3TBsNC7WJOzeWBE3clTuoV6AXYCJsNN3hFZhegbqBJXAF0iugXbhyU3ciicymGBM0jUQBpXM8p+lIf+bnm5lSyfR9Eh08HDF5PXzzzZlhACIiIiIiIiIiIpJRsTM29qtm1iN4+rGZXkYWGl3ztVwo1QYKddQWXeRcdMDr+6/M72u4LAW1gudL28ix8IAvO1xfzkMODtiWBY1dzIYpG8XlvJYLJ3hYPcXslKB7u9g8KCGHggPWuoKZ0mWcnr9FDoWsYD371aRRHdT9XAkrEWX8H2um/r9EjgSf5Nb3Na4E7WJmVBlh/75S5mh/Je/dr3jAV1DCttIBJdPTW/02VogBp6HVprStLEomHTwpY151f/ewc/AT9fffh0b7baVtZZtxf18UcPmGaFpOFVG5fR2tzgmahycXwxqigFkihKp3FkYHNEQlggEL3b059l3saAZ8uZxbkllTL67dMw/u8R9zcvCQJ63O6eiAMit4vF0r6C6e3W+PTAv8amMXGrq2hDj2BGDPtCMngrlkr/j0DhaKdawudjOvYLtiV3e/9lsZskwLZ/dUTs6r5ricKWAb7sNGB+1vZ6AJFVMJ1jKd5F68O2K4UczN4tQBt4/OsLX3AxRBq3LqgLf3jkFxdCl1wM3OvHcLEtpNFbB7fM7aK6GcdqqAm4e/QBJeK1XAjc/seUUKSLmCv7D+xjP388xlc+KA7aWwvcCgGMpp2kPigBu8JJbRvYY9JF/BbM9kFq417SFRwGzPhJS5lWR20uyHiQJmeyal/z03kShgtmdSvab/kShgv2tgeyZh2rPaA9f/k2g/2AZsay/bM4FBe+YTl4jtj9w9k9Ejz62JAi5dd3iCk+midq85PCAK2N4lti0axVBea3xIFHBr7u8US6md8RFRwLxjLHXRnvlEAfNZBwndHm7PfHx0aloUWkHDDHhqJuuvxYCnY6I98zHgaVDBq9diwFPhtcI+w4CnYrI98zHgrOzmekB75mPAWXloRX2aAWflRP+kEQPOxG6uB7dnPgacxdjmehAGnMXg2YcoDDiLwbMPURhwWkPPPkQJe6WMC4qhP0hmcQWnFr7/MCw4YMdpgyLEt2e+sNd6vQGFU2pVOjU4YPu/o1EHjeq/3NSEK1y9VvTLQTc+rfTfAuihYmbm8s18MqYkKJiet/c6amOHiIiIiIiIiGL9BRVMNGKRZA1aAAAAAElFTkSuQmCC";
export function getLocalFolderIconSrc(os2 = getPlatform().app.os) {
  return os2 === "darwin" ? macLocalFolderIcon : windowsLocalFolderIcon;
}
export function MoreVerticalIcon({ size: size2 = 24, className, ...rest }) {
  return (
    <CompositedSvg
      xmlns="http://www.w3.org/2000/svg"
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </CompositedSvg>
  );
}
export const PlaybackPauseIcon = desktopMediaIcon(PlaybackPauseIcon$1);
const SIZE_PX = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
};
export function Icon({
  icon: LucideIconComp,
  size: size2 = "sm",
  strokeWidth = 1.5,
  className,
  tone,
  "aria-hidden": ariaHidden,
}) {
  const glyph = (
    <LucideIconComp
      size={SIZE_PX[size2]}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden={ariaHidden}
    />
  );
  return tone ? <MonochromeIcon tone={tone}>{glyph}</MonochromeIcon> : glyph;
}
export const TUTORIAL_URL$2 = {
  domestic: "https://my.feishu.cn/wiki/VEoVwpfCKiTHvHkAGQ7cQJxCncf",
  overseas: "https://my.feishu.cn/wiki/X3pGw8I5Gi6E1fkMqQpcP5ZBnHd?from=from_parent_docx",
};
const CREATION_GUIDE_URLS = {
  domestic: {
    design: "https://my.feishu.cn/wiki/VEoVwpfCKiTHvHkAGQ7cQJxCncf",
    h3: "https://vrfi1sk8a0.feishu.cn/wiki/FIWjwgL33ipnkekzk30crmKUnIh?from=from_copylink",
  },
  overseas: {
    design: "https://my.feishu.cn/wiki/X3pGw8I5Gi6E1fkMqQpcP5ZBnHd?from=from_copylink",
    h3: "https://app.notion.com/p/MiniMax-H3-Next-Generation-Open-Weights-General-Purpose-Multimodal-Video-Model-3acbb3a8c3ae81618844cb0a3904e247",
  },
};
export const HUB_WEB_INVITE_DOMAINS = {
  test: {
    domestic: "https://hub-test-cn.xaminim.com",
    overseas: "https://hub-test.xaminim.com",
  },
  prod: {
    domestic: "https://design.minimax.cn",
    overseas: "https://design.minimax.io",
  },
};
const SKILL_SHARE_DOMAINS = {
  test: {
    domestic: "https://hub-test.xaminim.com",
    overseas: "https://hub-test.xaminim.com",
  },
  prod: {
    domestic: "https://design.minimax.cn",
    overseas: "https://design.minimax.io",
  },
};
export function getSkillShareUrl(skillName, region, channel) {
  const environment = channel === "test" || channel === "dev" ? "test" : "prod";
  return new URL(
    `/skill/${encodeURIComponent(skillName)}`,
    SKILL_SHARE_DOMAINS[environment][region],
  ).href;
}
export const WORKFLOW_TUTORIAL_SOURCE_URL = "https://design.minimax.cn/h3";
const PROJECT_TUTORIAL_URL = {
  domestic: "https://fcnwq3l4qnzo.feishu.cn/wiki/H7C4wyD4Qi9R6okXVYOcXxdqnue",
  overseas: "https://ssgg33vl3vlh.sg.larksuite.com/wiki/Ip18wsxrAiEum7ksI7LlrK58g3c",
};
export function getProjectTutorialUrl(region) {
  return PROJECT_TUTORIAL_URL[region];
}
export function getTutorialUrlByLocale(language2) {
  return TUTORIAL_URL$2[language2.startsWith("zh") ? "domestic" : "overseas"];
}
export function getCreationGuideUrlsByLocale(language2) {
  return CREATION_GUIDE_URLS[language2.startsWith("zh") ? "domestic" : "overseas"];
}
export function DropdownMenu({ ...props }) {
  return <MenuRoot data-slot="dropdown-menu" {...props} />;
}
export function DropdownMenuGroup({ ...props }) {
  return <MenuGroup data-slot="dropdown-menu-group" {...props} />;
}
export function DropdownMenuRadioGroup({ ...props }) {
  return <MenuRadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}
export function DropdownMenuSub({ ...props }) {
  return <MenuSubmenuRoot data-slot="dropdown-menu-sub" {...props} />;
}
export function TooltipProvider({ delay = 0, ...props }) {
  return <TooltipProvider$2 data-slot="tooltip-provider" delay={delay} {...props} />;
}
export function Tooltip({ disableHoverablePopup = true, ...props }) {
  return (
    <TooltipRoot data-slot="tooltip" disableHoverablePopup={disableHoverablePopup} {...props} />
  );
}
export function TooltipTrigger({ ...props }) {
  return <TooltipTrigger$1 data-slot="tooltip-trigger" {...props} />;
}
export const RuntimeConfigContext = reactExports.createContext(null);
export function PlatformProvider({ children: children2 }) {
  const platform2 = reactExports.useMemo(() => getPlatform(), []);
  const config2 = reactExports.useMemo(() => getRuntimeConfig(), []);
  return (
    <PlatformContext value={platform2}>
      <RuntimeConfigContext value={config2}>{children2}</RuntimeConfigContext>
    </PlatformContext>
  );
}
export const chatLog = makeLogger("chat");
export const remoteToolLog = makeLogger("remote-tool");
export const remoteDebugLog = makeLogger("remote-debug");
export const actionTrailLog = makeLogger("action-trail");
export const assetCenterLog = makeLogger("asset-center");
export const serverPopupLog = makeLogger("server-popup");
export const projectLog = makeLogger("project");
function errorMessage$1(error) {
  return error instanceof Error ? error.message : String(error);
}
function isWebUrl$1(url2) {
  try {
    const parsed = new URL(url2);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
export function externalUrlTargetForLog(url2) {
  try {
    const parsed = new URL(url2);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.origin;
    }
    if (parsed.protocol === "mailto:") {
      return "mailto:<redacted>";
    }
    return `${parsed.protocol}<redacted>`;
  } catch {
    return "<invalid-url>";
  }
}
function shouldUseFallback(platform2, url2) {
  return (
    platform2.app?.os === "win32" &&
    isWebUrl$1(url2) &&
    typeof platform2.shell.openExternalWithFallback === "function"
  );
}
export async function openExternalUrl(platform2, url2, options) {
  try {
    const fallback = platform2.shell.openExternalWithFallback;
    if (shouldUseFallback(platform2, url2) && fallback) {
      await fallback.call(platform2.shell, url2);
    } else {
      await platform2.shell.openExternal(url2);
    }
    return true;
  } catch (error) {
    actionTrailLog.warn("external-link open failed", {
      source: options.source,
      target: externalUrlTargetForLog(url2),
      error: errorMessage$1(error),
    });
    return false;
  }
}
