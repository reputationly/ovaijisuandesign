// src/preload/browser-tab/index.ts
var import_electron = require("electron");

// src/shared/browser-plugins.ts
var BROWSER_PLUGIN_CHANNELS = {
  /** tab preload -> main (invoke): runtime config for the calling tab. */
  GET_CONFIG: "browser-plugin:get-config",
  /** tab preload -> main (invoke): a plugin emitted an event; resolves to an ack. */
  EVENT: "browser-plugin:event",
  /** main -> tab preload (send): runtime command. */
  COMMAND: "browser-plugin:command",
  /** main -> host renderer (send): a validated, resolved plugin event. */
  RENDERER_EVENT: "browser-plugin:renderer-event"
};
var BROWSER_PLUGIN_IMAGE_ACTIONS = ["chat", "canvas", "clipboard", "edit"];
var BROWSER_IMAGE_EDIT_ACTIONS = [
  "remove-background",
  "upscale",
  "describe-prompt",
  "separate-layers"
];
var BROWSER_PLUGIN_LIMITS = {
  maxUrlLength: 8192,
  maxTextLength: 512,
  /** Decoded image bytes accepted from a tab (matches the chat upload ceiling comfortably). */
  maxImageBytes: 25 * 1024 * 1024,
  /** `data:image/...` source length: base64 inflates by 4/3, plus header slack. */
  maxDataUrlLength: Math.ceil(25 * 1024 * 1024 * 1.4) + 256,
  /** Maximum wait for response headers or between received data chunks. */
  imageFetchTimeoutMs: 15e3,
  /** Direct-file video bytes accepted from a tab. */
  maxVideoBytes: 100 * 1024 * 1024,
  /** Inactivity timeout; ongoing downloads may exceed this duration. */
  videoFetchTimeoutMs: 6e4,
  /** Gateway process timeout plus completion/import allowance. */
  videoDownloadTimeoutMs: 31 * 6e4
};

// ../packages/canvas/src/icon-artwork.ts
var ADD_TO_CHAT_VIEW_BOX = "0 0 20 20";
var ADD_TO_CHAT_PATHS = [
  "M12.1545 15.3767H18.6118",
  "M15.3896 12.1545L15.3896 18.6118",
  "M17.2956 9.34192C17.2956 4.94921 13.7346 1.38821 9.34191 1.38821C4.94919 1.38821 1.3882 4.94921 1.3882 9.34192C1.3882 10.9548 1.38819 14.4074 1.38819 16.186C1.38818 16.7996 1.88394 17.2956 2.49759 17.2956C4.28696 17.2956 7.76843 17.2956 9.34191 17.2956",
  "M5.93323 7.60952L12.7507 7.60952",
  "M5.93323 12.1545L9.34196 12.1545"
];

// ../packages/protocol/dist/browser-video.js
var PLATFORM_HOSTS = {
  youtube: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
  bilibili: ["bilibili.com", "www.bilibili.com", "m.bilibili.com"],
  douyin: ["douyin.com", "www.douyin.com"],
  xiaohongshu: ["xiaohongshu.com", "www.xiaohongshu.com"]
};
function isBrowserVideoPageForTab(page, tabUrl) {
  try {
    const tab = new URL(tabUrl);
    return ["http:", "https:"].includes(tab.protocol) && PLATFORM_HOSTS[page.platform].includes(tab.hostname);
  } catch {
    return false;
  }
}
function parseBrowserVideoPage(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port)
    return null;
  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  const result = (platform, pathname, keys = []) => {
    const query = new URLSearchParams();
    for (const key of keys) {
      const value2 = url.searchParams.get(key);
      if (value2)
        query.set(key, value2);
    }
    url.protocol = "https:";
    url.pathname = pathname;
    url.search = query.toString();
    url.hash = "";
    return { platform, url: url.toString() };
  };
  if (PLATFORM_HOSTS.youtube.includes(host)) {
    const id = host === "youtu.be" ? path.slice(1) : path === "/watch" ? url.searchParams.get("v") : /^\/(?:shorts|embed)\/([^/]+)\/?$/.exec(path)?.[1];
    if (!id || !/^[\w-]{11}$/.test(id))
      return null;
    url.hostname = "www.youtube.com";
    url.searchParams.set("v", id);
    return result("youtube", "/watch", ["v"]);
  }
  if (PLATFORM_HOSTS.bilibili.includes(host)) {
    const id = /^\/video\/(BV[\da-zA-Z]+|av\d+)\/?$/.exec(path)?.[1];
    if (!id)
      return null;
    const part = url.searchParams.get("p");
    if (part && !/^[1-9]\d{0,3}$/.test(part))
      return null;
    url.hostname = "www.bilibili.com";
    return result("bilibili", `/video/${id}/`, ["p"]);
  }
  if (PLATFORM_HOSTS.douyin.includes(host)) {
    const id = /^\/video\/(\d+)\/?$/.exec(path)?.[1] ?? url.searchParams.get("modal_id");
    if (!id || !/^\d{10,25}$/.test(id))
      return null;
    url.hostname = "www.douyin.com";
    return result("douyin", `/video/${id}`);
  }
  if (PLATFORM_HOSTS.xiaohongshu.includes(host)) {
    const id = /^\/(?:explore|discovery\/item)\/([\da-f]{24})\/?$/.exec(path)?.[1];
    if (!id)
      return null;
    url.hostname = "www.xiaohongshu.com";
    return result("xiaohongshu", `/explore/${id}`, ["xsec_token", "xsec_source"]);
  }
  return null;
}

// src/preload/browser-tab/plugins/collection-coach-mark.ts
var coachMarkStyles = `
.cm { width:286px; max-width:calc(100vw - 24px); padding:12px; background:var(--cm-bg); color:var(--cm-text); box-shadow:var(--cm-shadow); border-radius:var(--brutalist-radius-md); }
.cm-title { margin:0; font-size:13px; font-weight:600; line-height:1.4; }
.cm-desc { margin:6px 0 0; font-size:12px; line-height:1.55; color:var(--cm-text-muted); }
.cm-footer { display:flex; justify-content:flex-end; margin-top:14px; }
.cm-cta { height:28px; padding:0 12px; border:0; border-radius:var(--brutalist-radius-sm); background:var(--cm-cta-bg); color:var(--cm-cta-text); font-family:inherit; font-size:12px; font-weight:600; cursor:pointer; }
.cm-cta:hover { background:var(--cm-cta-bg-hover); }
.cm-cta:focus-visible { outline:2px solid var(--cm-text); outline-offset:3px; }
`;
function createCollectionCoachMark(root, document2, locale, persistence) {
  const zh = locale.startsWith("zh");
  const sheet = document2.createElement("style");
  sheet.textContent = `${coachMarkStyles}
    .collection-coach {
      --cm-bg: #15171f; --cm-text: #f6f7fb;
      --cm-text-muted: rgba(246,247,251,.6); --cm-text-icon: rgba(246,247,251,.7);
      --cm-border: transparent; --cm-shadow: 0 24px 48px -16px rgba(0,0,0,.45), 0 8px 16px -8px rgba(0,0,0,.32);
      --cm-cta-bg: #f6f7fb; --cm-cta-bg-hover: #fff; --cm-cta-text: #15171f;
      --brutalist-radius-md: 12px; --brutalist-radius-sm: 6px;
      position: fixed; box-sizing: border-box; z-index: 2; pointer-events: auto;
      font-family: ui-sans-serif, -apple-system, system-ui, sans-serif;
    }
    @media (prefers-color-scheme: dark) {
      .collection-coach { --cm-shadow: 0 28px 56px -18px rgba(0,0,0,.85), 0 12px 24px -10px rgba(0,0,0,.7); }
    }
    .collection-coach[hidden] { display: none; }
    .collection-coach::before { content: ''; position: absolute; width: 12px; height: 12px;
      background: var(--cm-bg); transform: rotate(45deg); left: var(--arrow-x); top: -6px; }
    .collection-coach[data-side="top"]::before { top: auto; bottom: -6px; }
  `;
  try {
    const styles = new CSSStyleSheet();
    styles.replaceSync(sheet.textContent);
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, styles];
  } catch {
    root.appendChild(sheet);
  }
  const element = document2.createElement("section");
  element.className = "cm collection-coach";
  element.hidden = true;
  element.setAttribute("role", "dialog");
  element.dataset.actionUiId = "browser.collection-guide";
  const title = document2.createElement("h3");
  title.className = "cm-title";
  const description = document2.createElement("p");
  description.className = "cm-desc";
  const footer = document2.createElement("div");
  footer.className = "cm-footer cm-footer--no-steps";
  const dismiss = document2.createElement("button");
  dismiss.type = "button";
  dismiss.className = "cm-cta";
  dismiss.textContent = zh ? "\u6211\u77E5\u9053\u4E86" : "Got it";
  dismiss.dataset.actionUiId = "browser.collection-guide-dismiss";
  footer.append(dismiss);
  element.append(title, description, footer);
  root.append(element);
  let dismissed = false;
  let menuStep = false;
  const hide = () => {
    element.hidden = true;
  };
  const onDismiss = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dismissed = true;
    persistence?.dismiss();
    hide();
  };
  const onKey = (event) => {
    if (event.key === "Escape" && !element.hidden) onDismiss(event);
  };
  dismiss.addEventListener("click", onDismiss);
  document2.addEventListener("keydown", onKey, true);
  const position = (anchor) => {
    if (persistence?.isDismissed()) hide();
    if (element.hidden) return;
    const rect = anchor.getBoundingClientRect();
    const width = document2.documentElement.clientWidth;
    const height = document2.documentElement.clientHeight;
    const left = Math.max(
      12,
      Math.min(
        rect.left + rect.width / 2 - element.offsetWidth / 2,
        width - element.offsetWidth - 12
      )
    );
    const above = rect.bottom + element.offsetHeight + 20 > height;
    element.style.left = `${left}px`;
    element.style.top = `${Math.max(12, above ? rect.top - element.offsetHeight - 10 : rect.bottom + 10)}px`;
    element.dataset.side = above ? "top" : "bottom";
    element.style.setProperty(
      "--arrow-x",
      `${Math.max(16, Math.min(rect.right - rect.width / 2 - left - 6, element.offsetWidth - 28))}px`
    );
  };
  return {
    element,
    hide,
    position,
    show(anchor, inMenu) {
      if (dismissed || persistence?.isDismissed()) {
        hide();
        return;
      }
      menuStep = inMenu;
      title.textContent = zh ? menuStep ? "\u9009\u62E9\u7D20\u6750\u53BB\u5411" : "\u6536\u96C6\u7D20\u6750\uFF0C\u968F\u624B\u521B\u4F5C" : menuStep ? "Choose where to send it" : "Collect media as you browse";
      description.textContent = zh ? menuStep ? "\u70B9\u51FB\u300C\u53D1\u9001\u5230\u753B\u5E03\u300D\u6216\u300C\u53D1\u9001\u5230\u5BF9\u8BDD\u300D\uFF0C\u76F4\u63A5\u4F7F\u7528\u8FD9\u4EFD\u7D20\u6750\u4F5C\u4E3A\u53C2\u8003\u3002" : "\u70B9\u51FB\u7D20\u6750\u53F3\u4E0A\u89D2\u56FE\u6807\uFF0C\u8FDB\u884C\u4FBF\u6377\u64CD\u4F5C" : menuStep ? "Choose Send to canvas or Send to chat to use this media as a reference." : "Click the icon in the top-right corner of the media for quick actions.";
      element.setAttribute("aria-label", title.textContent);
      element.hidden = false;
      position(anchor);
    },
    dispose() {
      document2.removeEventListener("keydown", onKey, true);
      element.remove();
      sheet.remove();
    }
  };
}

// src/preload/browser-tab/plugins/video-page-source.ts
function resolveVideoPage(video, pageUrl = video.ownerDocument.location.href) {
  const document2 = video.ownerDocument;
  const page = parseBrowserVideoPage(pageUrl);
  const players = Array.from(document2.querySelectorAll("video")).filter((candidate) => {
    const rect = candidate.getBoundingClientRect();
    const view = document2.defaultView;
    const style = view?.getComputedStyle(candidate);
    return candidate.videoWidth >= 64 && candidate.videoHeight >= 64 && rect.width >= 96 && rect.height >= 96 && rect.bottom > 0 && rect.right > 0 && (!view || rect.top < view.innerHeight && rect.left < view.innerWidth) && style?.visibility !== "hidden" && style?.display !== "none";
  });
  if (page && players.length === 1 && players[0] === video) return page.url;
  let container = video;
  for (let depth = 0; container && container !== document2.body && depth < 6; depth++) {
    if (container.querySelectorAll("video").length > 1) break;
    const links = container.matches("a[href]") ? [container] : Array.from(container.querySelectorAll("a[href]"));
    const candidates = /* @__PURE__ */ new Set();
    for (const link of links) {
      try {
        const candidate = parseBrowserVideoPage(
          new URL(link.getAttribute("href") ?? "", pageUrl).href
        );
        if (candidate && isBrowserVideoPageForTab(candidate, pageUrl))
          candidates.add(candidate.url);
      } catch {
      }
    }
    if (candidates.size === 1) return [...candidates][0];
    if (candidates.size > 1) break;
    container = container.parentElement;
  }
  return null;
}

// src/preload/browser-tab/plugins/image-hover.ts
var IMAGE_HOVER_THRESHOLDS = {
  /** Rendered size below which an image is treated as an icon/avatar. */
  minOnScreenPx: 96,
  /** Decoded size below which an image is treated as an icon/avatar. */
  minNaturalPx: 64,
  /** How many stacked elements to look through before giving up. */
  maxStackDepth: 10,
  /** Elements covering at least this share of the viewport block the search (modal backdrops). */
  occluderViewportRatio: 0.9
};
var IMAGE_HOVER_LAYOUT = {
  buttonSize: 28,
  hintIconSize: 22,
  hintStartPadding: 5,
  hintEndPadding: 10,
  hintGap: 6,
  /** Distance from the image's top-right corner. */
  buttonInset: 6,
  /** Space between the hovered media edge and the menu. */
  menuGap: 6,
  submenuGap: 4,
  menuPadding: 4,
  submenuMinWidth: 128
};
var HIDE_DELAY_MS = 160;
var HINT_DELAY_MS = 150;
var RESULT_LINGER_MS = 1200;
var VIDEO_ACTIONS = /* @__PURE__ */ new Set(["chat", "canvas"]);
var LABELS = {
  zh: {
    quickAction: "\u4F7F\u7528\u6B64\u7D20\u6750",
    trigger: { image: "\u4F7F\u7528\u6B64\u7D20\u6750", video: "\u4F7F\u7528\u6B64\u7D20\u6750" },
    items: {
      chat: "\u53D1\u9001\u5230\u5BF9\u8BDD",
      canvas: "\u53D1\u9001\u5230\u753B\u5E03",
      clipboard: "\u590D\u5236\u5230\u526A\u8D34\u677F",
      edit: "\u56FE\u50CF\u7F16\u8F91"
    },
    busy: { chat: "\u6B63\u5728\u53D1\u9001\u2026", canvas: "\u6B63\u5728\u53D1\u9001\u2026", clipboard: "\u6B63\u5728\u590D\u5236\u2026", edit: "\u6B63\u5728\u53D1\u9001\u2026" },
    done: {
      chat: "\u5DF2\u6DFB\u52A0\u5230\u5BF9\u8BDD",
      canvas: "\u5DF2\u6DFB\u52A0\u5230\u753B\u5E03",
      clipboard: "\u5DF2\u590D\u5236",
      edit: "\u5DF2\u9009\u62E9\u56FE\u50CF\u7F16\u8F91"
    },
    editItems: {
      "remove-background": "\u62A0\u56FE",
      upscale: "\u9AD8\u6E05\u653E\u5927",
      "describe-prompt": "\u53CD\u63A8\u63D0\u793A\u8BCD",
      "separate-layers": "\u62C6\u5206\u56FE\u5C42"
    },
    error: "\u56E0\u7248\u6743\u9650\u5236\uFF0C\u6682\u4E0D\u652F\u6301\u4E0B\u8F7D",
    videoError: "\u89C6\u9891\u6DFB\u52A0\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5"
  },
  en: {
    quickAction: "Use This Media",
    trigger: { image: "Use This Media", video: "Use This Media" },
    items: {
      chat: "Send to chat",
      canvas: "Send to canvas",
      clipboard: "Copy to clipboard",
      edit: "Image Editing"
    },
    busy: { chat: "Sending\u2026", canvas: "Sending\u2026", clipboard: "Copying\u2026", edit: "Sending\u2026" },
    done: {
      chat: "Added to chat",
      canvas: "Added to canvas",
      clipboard: "Copied",
      edit: "Image editing selected"
    },
    editItems: {
      "remove-background": "Remove Background",
      upscale: "Upscale",
      "describe-prompt": "Extract Prompt",
      "separate-layers": "Separate Layers"
    },
    error: "Download unavailable due to copyright restrictions.",
    videoError: "Could not add this video. Please try again."
  }
};
var BRAND_ICON_VIEWBOX = "0 0 969 968";
var BRAND_ICON_NODES = [
  [
    "path",
    {
      d: "M14.2348 427.047C-0.900966 577.189 88.7057 681.58 135.401 715.008C95.0122 757.028 75.8241 875.728 149.49 917.185C257.694 978.08 345.396 904.7 375.721 860.399C382.027 894.498 415.09 963.581 496.887 967.126C578.684 970.67 618.188 897.451 627.715 860.399C662.602 906.311 751.376 981.947 827.377 917.186C903.378 852.424 873.267 755.417 848.712 715.008C898.628 695.945 977.444 611.665 968.105 427.047C956.431 196.274 769.621 67.8375 701.32 38.4309C596.984 -6.48963 427.99 -18.7643 294.748 38.4309C161.508 95.6256 33.1546 239.368 14.2348 427.047Z",
      fill: "black"
    }
  ],
  ["ellipse", { cx: "179.848", cy: "469.257", rx: "113.934", ry: "144.205", fill: "white" }],
  ["ellipse", { cx: "179.142", cy: "471.012", rx: "86.7617", ry: "114.853", fill: "black" }],
  ["ellipse", { cx: "800.53", cy: "469.261", rx: "113.934", ry: "144.205", fill: "white" }],
  ["ellipse", { cx: "800.326", cy: "471.752", rx: "86.7617", ry: "114.853", fill: "black" }],
  ["ellipse", { cx: "193.312", cy: "408.544", rx: "18.6573", ry: "19.8976", fill: "white" }],
  ["ellipse", { cx: "804.014", cy: "407.79", rx: "18.6573", ry: "19.8976", fill: "white" }],
  [
    "path",
    {
      d: "M187.12 115.554C187.12 115.554 121.53 36.0198 23.3314 107.525C-23.5188 141.628 9.20137 189.348 42.8586 176.517C76.5158 163.687 127.002 134.012 137.421 203.004",
      fill: "black"
    }
  ],
  [
    "path",
    {
      d: "M779.398 117.221C779.398 117.221 844.989 37.6868 943.187 109.192C990.037 143.294 957.317 191.015 923.66 178.184C890.002 165.354 839.517 135.679 829.097 204.671",
      fill: "black"
    }
  ]
];
var ICONS = {
  // Product brand mark for the plugin entry point, shared by images and videos.
  idle: BRAND_ICON_NODES,
  "idle-video": BRAND_ICON_NODES,
  // loader-circle
  busy: [["path", { d: "M21 12a9 9 0 1 1-6.219-8.56" }]],
  // check
  done: [["path", { d: "M20 6 9 17l-5-5" }]],
  // x
  error: [
    ["path", { d: "M18 6 6 18" }],
    ["path", { d: "m6 6 12 12" }]
  ],
  // Same product artwork as the renderer's AddToChatIcon.
  chat: ADD_TO_CHAT_PATHS.map((d) => ["path", { d }]),
  // layout-dashboard
  canvas: [
    ["rect", { width: "7", height: "9", x: "3", y: "3", rx: "1" }],
    ["rect", { width: "7", height: "5", x: "14", y: "3", rx: "1" }],
    ["rect", { width: "7", height: "9", x: "14", y: "12", rx: "1" }],
    ["rect", { width: "7", height: "5", x: "3", y: "16", rx: "1" }]
  ],
  // copy
  clipboard: [
    ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }],
    ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }]
  ],
  edit: [["path", { d: "m16 3 5 5-12 12-6 1 1-6Z M14 5l5 5" }]],
  chevron: [["path", { d: "m9 6 6 6-6 6" }]]
};
var STYLES = `
/* Isolated page UI mirrors the foreground/background tokens in renderer/index.css. */
:host {
  all: initial;
  --foreground: #000000;
  --background: #fafafa;
  --radius: 12px;
  --radius-sm: calc(var(--radius) * .6);
  --font-sans: "Inter Variable", ui-sans-serif, -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif;
  --popover: #ffffff;
  --popover-foreground: #000000;
  --elevated-border-width: .5px;
  --elevated-border-color: rgba(0, 0, 0, .08);
  --popup-item-hover: rgba(0, 0, 0, .03);
  --popup-item-active: rgba(0, 0, 0, .06);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1);
}
.pick, .menu, .item { box-sizing: border-box; }
.pick {
  position: fixed;
  right: 0;
  top: 0;
  min-width: ${IMAGE_HOVER_LAYOUT.buttonSize}px;
  height: ${IMAGE_HOVER_LAYOUT.buttonSize}px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: #1a1a1a;
  color: #fafafa;
  box-shadow: 0 1px 6px rgba(0, 0, 0, .28), inset 0 0 0 1px rgba(255, 255, 255, .12);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  overflow: hidden;
  font: 500 12px/16px ui-sans-serif, -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  white-space: nowrap;
  cursor: pointer;
  visibility: hidden;
  opacity: 0;
  transform: scale(.92);
  transform-origin: top right;
  transition: opacity 120ms ease, transform 120ms ease, background-color 150ms ease;
  pointer-events: none;
  -webkit-user-select: none;
  user-select: none;
}
.pick[data-visible="true"] {
  visibility: visible;
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}
/* Keep the collapsed entry silhouette-only; the brand mark has a light contour. */
.pick[data-state="idle"],
.pick[data-state="idle"]:hover,
.pick[data-state="idle"][aria-expanded="true"] {
  background: transparent;
  box-shadow: none;
}
/* Expand inside the same click target, keeping its right edge anchored. */
.pick[data-state="idle"] {
  gap: 0;
  border-radius: 999px;
  transition: opacity 120ms ease, transform 120ms ease, background-color 180ms ease, padding 180ms ease;
}
.pick[data-state="idle"] .label {
  display: block;
  max-width: 0;
  margin-left: 0;
  opacity: 0;
  transition: max-width 180ms ease, margin-left 180ms ease, opacity 140ms ease;
}
.pick[data-state="idle"][data-hint-expanded="true"] {
  padding: 0 ${IMAGE_HOVER_LAYOUT.hintEndPadding}px 0 ${IMAGE_HOVER_LAYOUT.hintStartPadding}px;
  background: color-mix(in srgb, var(--foreground) 48%, transparent);
  color: var(--background);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.pick[data-state="idle"][data-hint-expanded="true"] .label {
  max-width: 96px;
  margin-left: ${IMAGE_HOVER_LAYOUT.hintGap}px;
  opacity: 1;
}
/* Skip the collapse animation if layout space disappears, keeping the icon intact. */
.pick[data-state="idle"][data-hint-space="false"] { padding: 0; transition: none; }
.pick[data-state="idle"][data-hint-space="false"] .label {
  max-width: 0; margin-left: 0; opacity: 0; transition: none;
}
/* busy / done / error grow leftwards into a pill that spells the state out. */
.pick[data-expanded="true"] { padding: 0 8px 0 6px; cursor: default; }
.pick .label { display: none; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.pick[data-expanded="true"] .label { display: block; }
.pick:hover, .pick[aria-expanded="true"] { background: #2b2b2b; }
.pick:focus-visible { outline: 2px solid rgba(255, 255, 255, .6); outline-offset: 1px; }
.pick[data-state="busy"] { cursor: progress; }
.pick .icon {
  display: none;
  width: 14px;
  height: 14px;
  stroke-width: 2;
}
.pick .icon-idle, .pick .icon-idle-video {
  width: ${IMAGE_HOVER_LAYOUT.hintIconSize}px;
  height: ${IMAGE_HOVER_LAYOUT.hintIconSize}px;
  stroke: none;
  filter: drop-shadow(0 0 1px rgba(255, 255, 255, .7))
    drop-shadow(0 0 1px rgba(255, 255, 255, .45))
    drop-shadow(0 1px 1.5px rgba(0, 0, 0, .18));
}
.pick[data-state="idle"]:not([data-kind="video"]) .icon-idle,
.pick[data-state="idle"][data-kind="video"] .icon-idle-video,
.pick[data-state="busy"] .icon-busy,
.pick[data-state="done"] .icon-done,
.pick[data-state="error"] .icon-error { display: block; }
.icon {
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.icon-busy { animation: spin 800ms linear infinite; }
.menu {
  position: fixed;
  left: 0;
  top: 0;
  min-width: 148px;
  margin: 0;
  padding: ${IMAGE_HOVER_LAYOUT.menuPadding}px;
  border: var(--elevated-border-width) solid var(--elevated-border-color);
  border-radius: var(--radius);
  background: var(--popover);
  color: var(--popover-foreground);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  font: 500 11px/16px var(--font-sans);
  -webkit-font-smoothing: antialiased;
  visibility: hidden;
  opacity: 0;
  transform: scale(.96);
  transform-origin: top left;
  transition: opacity 100ms ease, transform 100ms ease;
  pointer-events: none;
  -webkit-user-select: none;
  user-select: none;
}
.menu[data-open="true"] {
  visibility: visible;
  opacity: 1;
  transform: none;
  pointer-events: auto;
}
.menu[data-side="above"] { transform-origin: bottom right; }
.menu[data-side="overlay"] { transform-origin: top right; }
.item {
  position: relative;
  isolation: isolate;
  display: flex;
  width: 100%;
  height: 28px;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 6px 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  white-space: nowrap;
  cursor: default;
  transition: background-color 80ms ease, color 80ms ease;
}
/* Author styles beat the UA [hidden] rule, so restate it for items the current media kind lacks. */
.item[hidden] { display: none; }
/* Match list-row-hit-area: rounded visuals retain continuous rectangular hit targets. */
.item::before { content: ""; position: absolute; inset: 0; z-index: -1; border-radius: 0; }
.item:hover, .item:focus-visible { outline: 0; background: var(--popup-item-hover); color: var(--foreground); }
.item[aria-expanded="true"] { background: var(--popup-item-active); color: var(--foreground); }
.item .icon { width: 14px; height: 14px; stroke-width: 1.5; opacity: .8; }
.item .icon-chevron { margin-left: auto; }
.edit-menu { min-width: ${IMAGE_HOVER_LAYOUT.submenuMinWidth}px; max-width: calc(100vw - 12px); max-height: calc(100vh - 12px); overflow-y: auto; }
@media (prefers-color-scheme: dark) {
  :host {
    --foreground: #e0e0e0;
    --background: #181818;
    --popover: #1f1f1f;
    --popover-foreground: #fafafa;
    --elevated-border-color: rgba(255, 255, 255, .10);
    --popup-item-hover: rgba(255, 255, 255, .04);
    --popup-item-active: rgba(255, 255, 255, .06);
  }
}
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .pick, .pick[data-state="idle"], .pick[data-state="idle"] .label, .menu, .item { transition: none; }
  .icon-busy { animation-duration: 1600ms; }
}
`;
var SVG_NS = "http://www.w3.org/2000/svg";
function createIcon(document2, name) {
  const svg = document2.createElementNS(SVG_NS, "svg");
  const isBrandIcon = name === "idle" || name === "idle-video";
  svg.setAttribute(
    "viewBox",
    isBrandIcon ? BRAND_ICON_VIEWBOX : name === "chat" ? ADD_TO_CHAT_VIEW_BOX : "0 0 24 24"
  );
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", `icon icon-${name}`);
  if (isBrandIcon) svg.dataset.brandIcon = "true";
  for (const [tag, attrs] of ICONS[name]) {
    const node = document2.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    svg.appendChild(node);
  }
  return svg;
}
function installStyles(root, document2) {
  try {
    if ("adoptedStyleSheets" in root && typeof CSSStyleSheet === "function") {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(STYLES);
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      return;
    }
  } catch {
  }
  const style = document2.createElement("style");
  style.textContent = STYLES;
  root.appendChild(style);
}
function labelsFor(locale) {
  return locale.toLowerCase().startsWith("zh") ? LABELS.zh : LABELS.en;
}
function clampToViewport(value, size, viewport) {
  return Math.min(Math.max(value, 0), Math.max(0, viewport - size));
}
function resolveImageSource(img) {
  const src = (img.currentSrc || img.src || "").trim();
  if (!src) return "";
  if (/^data:image\//iu.test(src)) {
    return src.length <= BROWSER_PLUGIN_LIMITS.maxDataUrlLength ? src : "";
  }
  if (src.length > BROWSER_PLUGIN_LIMITS.maxUrlLength) return "";
  return /^(https?:|blob:)/iu.test(src) ? src : "";
}
function resolveVideoSource(video) {
  let src = (video.currentSrc || video.src || "").trim();
  if (!src) {
    const source = video.querySelector("source[src]");
    src = (source?.getAttribute("src") || "").trim();
    if (src && !/^[a-z][a-z0-9+.-]*:/iu.test(src)) {
      try {
        src = new URL(src, video.ownerDocument.baseURI).toString();
      } catch {
        return "";
      }
    }
  }
  if (!src || src.length > BROWSER_PLUGIN_LIMITS.maxUrlLength) return "";
  return /^https?:/iu.test(src) ? src : "";
}
function mediaKindOf(target) {
  return target.tagName === "VIDEO" ? "video" : "image";
}
function isPluginHost(element) {
  return element.hasAttribute("data-hilo-browser-plugin");
}
function findMediaAt(env, x, y) {
  const elementsFromPoint = env.elementsFromPoint ?? ((px, py) => env.document.elementsFromPoint(px, py));
  const stack = elementsFromPoint(x, y);
  const viewportArea = Math.max(1, env.window.innerWidth * env.window.innerHeight);
  const depth = Math.min(stack.length, IMAGE_HOVER_THRESHOLDS.maxStackDepth);
  for (let index = 0; index < depth; index += 1) {
    const element = stack[index];
    if (isPluginHost(element)) continue;
    if (element.tagName === "IMG") {
      if (qualifies(element)) return element;
      continue;
    }
    if (element.tagName === "VIDEO") {
      if (qualifiesVideo(element)) return element;
      continue;
    }
    if (element.tagName === "PICTURE" || element.tagName === "HTML" || element.tagName === "BODY") {
      continue;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width * rect.height >= viewportArea * IMAGE_HOVER_THRESHOLDS.occluderViewportRatio) {
      return null;
    }
  }
  return null;
}
function qualifies(img) {
  if (img.naturalWidth < IMAGE_HOVER_THRESHOLDS.minNaturalPx) return false;
  if (img.naturalHeight < IMAGE_HOVER_THRESHOLDS.minNaturalPx) return false;
  const rect = img.getBoundingClientRect();
  if (rect.width < IMAGE_HOVER_THRESHOLDS.minOnScreenPx) return false;
  if (rect.height < IMAGE_HOVER_THRESHOLDS.minOnScreenPx) return false;
  return resolveImageSource(img) !== "";
}
function qualifiesVideo(video) {
  if (video.videoWidth < IMAGE_HOVER_THRESHOLDS.minNaturalPx) return false;
  if (video.videoHeight < IMAGE_HOVER_THRESHOLDS.minNaturalPx) return false;
  const rect = video.getBoundingClientRect();
  if (rect.width < IMAGE_HOVER_THRESHOLDS.minOnScreenPx) return false;
  if (rect.height < IMAGE_HOVER_THRESHOLDS.minOnScreenPx) return false;
  if ("mediaKeys" in video && video.mediaKeys) return false;
  return resolveVideoPage(video) !== null || resolveVideoSource(video) !== "";
}
async function defaultReadBlobAsDataUrl(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  if (blob.size > BROWSER_PLUGIN_LIMITS.maxImageBytes) throw new Error("Image is too large");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(blob);
  });
}
var SWALLOWED_EVENTS = [
  "pointerdown",
  "pointerup",
  "mouseup",
  "auxclick",
  "contextmenu",
  "dblclick"
];
function createImageHoverInstance(context, env) {
  const { document: document2 } = env;
  const labels = labelsFor(context.locale);
  const readBlobAsDataUrl = env.readBlobAsDataUrl ?? defaultReadBlobAsDataUrl;
  const root = context.ui.mount();
  const host = root.host;
  installStyles(root, document2);
  const button = document2.createElement("button");
  button.type = "button";
  button.className = "pick";
  button.tabIndex = -1;
  button.setAttribute("aria-haspopup", "menu");
  button.setAttribute("aria-expanded", "false");
  for (const state2 of ["idle", "idle-video", "busy", "done", "error"]) {
    button.appendChild(createIcon(document2, state2));
  }
  const label = document2.createElement("span");
  label.className = "label";
  button.appendChild(label);
  root.appendChild(button);
  const menu = document2.createElement("div");
  menu.className = "menu";
  menu.setAttribute("role", "menu");
  menu.dataset.open = "false";
  const items = [];
  for (const action of BROWSER_PLUGIN_IMAGE_ACTIONS) {
    const item = document2.createElement("button");
    item.type = "button";
    item.className = "item";
    item.tabIndex = -1;
    item.setAttribute("role", "menuitem");
    item.dataset.action = action;
    item.dataset.actionUiId = `browser-image-${action}`;
    item.appendChild(createIcon(document2, action));
    const text = document2.createElement("span");
    text.textContent = labels.items[action];
    item.appendChild(text);
    if (action === "edit") {
      item.setAttribute("aria-haspopup", "menu");
      item.setAttribute("aria-expanded", "false");
      item.appendChild(createIcon(document2, "chevron"));
    }
    menu.appendChild(item);
    items.push(item);
  }
  root.appendChild(menu);
  const editTrigger = items.find((item) => item.dataset.action === "edit");
  if (!editTrigger) throw new Error("Image editing menu entry is missing");
  const editMenu = document2.createElement("div");
  editMenu.className = "menu edit-menu";
  editMenu.dataset.open = "false";
  editMenu.dataset.actionUiId = "browser-image-edit-menu";
  editMenu.setAttribute("role", "menu");
  editMenu.setAttribute("aria-label", labels.items.edit);
  const editItems = BROWSER_IMAGE_EDIT_ACTIONS.map((editAction) => {
    const item = document2.createElement("button");
    item.type = "button";
    item.className = "item";
    item.tabIndex = -1;
    item.setAttribute("role", "menuitem");
    item.dataset.editAction = editAction;
    item.dataset.actionUiId = `browser-image-edit-${editAction}`;
    item.textContent = labels.editItems[editAction];
    item.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      void pick("edit", editAction);
    });
    editMenu.appendChild(item);
    return item;
  });
  root.appendChild(editMenu);
  const coach = createCollectionCoachMark(root, document2, context.locale, {
    isDismissed: () => context.isCollectionGuideDismissed?.() ?? false,
    dismiss: () => {
      void context.emit({ pluginId: "image-hover", type: "collection-guide-dismissed" });
    }
  });
  let target = null;
  let kind = "image";
  let state = "idle";
  let currentAction = "chat";
  let visible = false;
  let menuOpen = false;
  let editMenuOpen = false;
  let suspended = false;
  let disposed = false;
  let hoveringUi = false;
  let pointerX = -1;
  let pointerY = -1;
  let frame = 0;
  let hideTimer = null;
  let lingerTimer = null;
  const labelFor = (next) => {
    switch (next) {
      case "idle":
        return labels.trigger[kind];
      case "busy":
        return labels.busy[currentAction];
      case "done":
        return labels.done[currentAction];
      default:
        return kind === "video" ? labels.videoError : labels.error;
    }
  };
  let hintTimer = null;
  const collapseHint = () => {
    if (hintTimer !== null) env.window.clearTimeout(hintTimer);
    hintTimer = null;
    button.dataset.hintExpanded = "false";
    document2.removeEventListener("keydown", onHintKeyDown, true);
  };
  const onHintKeyDown = (event) => {
    if (event.key === "Escape") collapseHint();
  };
  const expandHint = () => {
    collapseHint();
    if (!visible || menuOpen || state !== "idle") return;
    document2.addEventListener("keydown", onHintKeyDown, true);
    hintTimer = env.window.setTimeout(() => {
      hintTimer = null;
      if (disposed || suspended || !visible || menuOpen || state !== "idle") return;
      if (!updateHintSpace()) {
        collapseHint();
        return;
      }
      button.dataset.hintExpanded = "true";
    }, HINT_DELAY_MS);
  };
  const updateHintSpace = () => {
    const { hintIconSize, hintStartPadding, hintEndPadding, hintGap } = IMAGE_HOVER_LAYOUT;
    const requiredWidth = label.scrollWidth + hintIconSize + hintStartPadding + hintEndPadding + hintGap + 1;
    const availableWidth = Number.parseFloat(button.style.maxWidth) || 0;
    const fits = availableWidth >= requiredWidth;
    button.dataset.hintSpace = String(fits);
    if (!fits) collapseHint();
    return fits;
  };
  const setState = (next) => {
    collapseHint();
    state = next;
    button.dataset.state = next;
    const text = labelFor(next);
    button.setAttribute("aria-label", text);
    const expanded = next !== "idle";
    if (expanded) button.title = text;
    else button.removeAttribute("title");
    button.dataset.expanded = expanded ? "true" : "false";
    label.textContent = expanded ? text : labels.quickAction;
  };
  const visibleItems = () => editMenuOpen ? editItems : items.filter((item) => !item.hidden);
  const setKind = (next) => {
    kind = next;
    button.dataset.kind = next;
    for (const item of items) {
      item.hidden = next === "video" && !VIDEO_ACTIONS.has(item.dataset.action ?? "");
    }
  };
  setKind("image");
  setState("idle");
  button.dataset.visible = "false";
  const clearHideTimer = () => {
    if (hideTimer !== null) {
      env.window.clearTimeout(hideTimer);
      hideTimer = null;
    }
  };
  const layoutWidth = () => document2.documentElement?.clientWidth || env.window.innerWidth;
  const positionButton = () => {
    if (!target?.isConnected) return false;
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const viewportWidth = env.window.innerWidth;
    const viewportHeight = env.window.innerHeight;
    if (rect.bottom <= 0 || rect.right <= 0 || rect.top >= viewportHeight || rect.left >= viewportWidth) {
      return false;
    }
    const { buttonSize, buttonInset } = IMAGE_HOVER_LAYOUT;
    const width = layoutWidth();
    const anchorRight = Math.min(rect.right, width) - buttonInset;
    const right = clampToViewport(width - anchorRight, buttonSize, width);
    const top = clampToViewport(Math.max(rect.top, 0) + buttonInset, buttonSize, viewportHeight);
    button.style.right = `${Math.round(right)}px`;
    button.style.top = `${Math.round(top)}px`;
    button.style.maxWidth = `${Math.max(buttonSize, Math.round(width - right))}px`;
    if (state === "idle") updateHintSpace();
    coach.position(button);
    return true;
  };
  const positionMenu = () => {
    if (!target?.isConnected) return;
    const { buttonSize, menuGap } = IMAGE_HOVER_LAYOUT;
    const buttonRight = Number.parseFloat(button.style.right) || 0;
    const buttonTop = Number.parseFloat(button.style.top) || 0;
    const width = layoutWidth();
    const viewportHeight = env.window.innerHeight;
    const targetRect = target.getBoundingClientRect();
    const menuWidth = menu.offsetWidth || 148;
    const height = menu.offsetHeight || (kind === "image" ? 122 : 66);
    const visibleRight = Math.min(width, targetRect.right);
    const preferredLeft = visibleRight + menuGap;
    const aboveTop = targetRect.top - menuGap - height;
    const triggerAlignedLeft = clampToViewport(width - buttonRight - menuWidth, menuWidth, width);
    let left;
    let top = buttonTop;
    let side;
    if (preferredLeft + menuWidth <= width) {
      left = preferredLeft;
      side = "right";
    } else if (aboveTop >= 0) {
      left = triggerAlignedLeft;
      top = aboveTop;
      side = "above";
    } else {
      left = triggerAlignedLeft;
      top = buttonTop + buttonSize + menuGap;
      if (top + height > viewportHeight) top = buttonTop - menuGap - height;
      side = "overlay";
    }
    menu.style.removeProperty("right");
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(clampToViewport(top, height, viewportHeight))}px`;
    menu.dataset.side = side;
    if (editMenuOpen) positionEditMenu();
  };
  const positionEditMenu = () => {
    const parent = menu.getBoundingClientRect();
    const item = editTrigger.getBoundingClientRect();
    const width = editMenu.offsetWidth || IMAGE_HOVER_LAYOUT.submenuMinWidth;
    const height = editMenu.offsetHeight || BROWSER_IMAGE_EDIT_ACTIONS.length * 28 + 2 * IMAGE_HOVER_LAYOUT.menuPadding + 1;
    const gap = IMAGE_HOVER_LAYOUT.submenuGap;
    const right = parent.right + gap;
    const left = right + width <= layoutWidth() ? right : parent.left - gap - width;
    editMenu.style.left = `${Math.round(clampToViewport(left < 0 ? parent.left : left, width, layoutWidth()))}px`;
    editMenu.style.top = `${Math.round(clampToViewport(item.top - IMAGE_HOVER_LAYOUT.menuPadding, height, env.window.innerHeight))}px`;
  };
  const closeEditMenu = () => {
    const focused = root.activeElement;
    if (focused instanceof HTMLElement && editMenu.contains(focused)) focused.blur();
    editMenuOpen = false;
    editMenu.dataset.open = "false";
    editTrigger.setAttribute("aria-expanded", "false");
  };
  const openEditMenu = () => {
    if (!menuOpen || kind !== "image") return;
    editMenuOpen = true;
    editMenu.dataset.open = "true";
    editTrigger.setAttribute("aria-expanded", "true");
    positionEditMenu();
  };
  const focusedItemIndex = () => {
    const active = root.activeElement;
    return active ? visibleItems().indexOf(active) : -1;
  };
  const focusItem = (index) => {
    const candidates = visibleItems();
    const count = candidates.length;
    if (count === 0) return;
    const next = (index % count + count) % count;
    candidates[next].focus({ preventScroll: true });
  };
  const onDocumentPointerDown = (event) => {
    if (!menuOpen) return;
    if (event.composedPath().includes(host)) return;
    closeMenu();
  };
  const onDocumentKeyDown = (event) => {
    if (!menuOpen) return;
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        if (editMenuOpen) {
          closeEditMenu();
          editTrigger.focus();
        } else closeMenu();
        return;
      case "ArrowRight":
        if (!editMenuOpen && root.activeElement === editTrigger) {
          event.preventDefault();
          event.stopPropagation();
          openEditMenu();
          editItems[0].focus();
        }
        return;
      case "ArrowLeft":
        if (editMenuOpen) {
          event.preventDefault();
          event.stopPropagation();
          closeEditMenu();
          editTrigger.focus();
        }
        return;
      case "ArrowDown":
        event.preventDefault();
        event.stopPropagation();
        focusItem(focusedItemIndex() + 1);
        return;
      case "ArrowUp":
        event.preventDefault();
        event.stopPropagation();
        focusItem(focusedItemIndex() - 1);
        return;
      case "Home":
      case "End":
        if (focusedItemIndex() < 0) return;
        event.preventDefault();
        event.stopPropagation();
        focusItem(event.key === "Home" ? 0 : visibleItems().length - 1);
        return;
      case "Tab":
        closeMenu();
        return;
      default:
        return;
    }
  };
  const openMenu = () => {
    if (menuOpen || !target || disposed) return;
    collapseHint();
    menuOpen = true;
    menu.dataset.open = "true";
    button.setAttribute("aria-expanded", "true");
    clearHideTimer();
    positionMenu();
    coach.show(menu, true);
    document2.addEventListener("pointerdown", onDocumentPointerDown, true);
    document2.addEventListener("keydown", onDocumentKeyDown, true);
  };
  const closeMenu = () => {
    if (!menuOpen) return;
    closeEditMenu();
    menuOpen = false;
    menu.dataset.open = "false";
    coach.hide();
    button.setAttribute("aria-expanded", "false");
    document2.removeEventListener("pointerdown", onDocumentPointerDown, true);
    document2.removeEventListener("keydown", onDocumentKeyDown, true);
    if (focusedItemIndex() >= 0) root.activeElement.blur();
    schedule();
  };
  const hide = () => {
    collapseHint();
    clearHideTimer();
    if (state === "busy") return;
    closeMenu();
    visible = false;
    target = null;
    button.dataset.visible = "false";
    coach.hide();
  };
  const scheduleHide = () => {
    if (hideTimer !== null || !visible) return;
    hideTimer = env.window.setTimeout(() => {
      hideTimer = null;
      if (!hoveringUi && !menuOpen) hide();
    }, HIDE_DELAY_MS);
  };
  const show = (media) => {
    clearHideTimer();
    if (target !== media) {
      target = media;
      setKind(mediaKindOf(media));
      if (state !== "busy") setState("idle");
    }
    context.ui.ensureAttached();
    if (!positionButton()) {
      hide();
      return;
    }
    visible = true;
    button.dataset.visible = "true";
    coach.show(button, false);
  };
  const reposition = () => {
    if (!positionButton()) {
      if (state === "busy") return;
      closeMenu();
      hide();
      return;
    }
    if (menuOpen) {
      positionMenu();
      coach.position(menu);
    }
  };
  const evaluate = () => {
    frame = 0;
    if (disposed || suspended) return;
    if (menuOpen || hoveringUi || state === "busy") {
      reposition();
      return;
    }
    if (pointerX < 0 || pointerY < 0) return;
    const media = findMediaAt(env, pointerX, pointerY);
    if (media) show(media);
    else scheduleHide();
  };
  function schedule() {
    if (frame !== 0 || disposed) return;
    frame = env.window.requestAnimationFrame(evaluate);
  }
  const onPointerMove = (event) => {
    if (event.pointerType === "touch") return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    schedule();
  };
  const onPointerGone = () => {
    collapseHint();
    pointerX = -1;
    pointerY = -1;
    hoveringUi = false;
    if (menuOpen || state === "busy") return;
    hide();
  };
  const onWindowGone = () => {
    closeMenu();
    onPointerGone();
  };
  const onViewportChange = () => {
    collapseHint();
    if (target) schedule();
  };
  const onVisibilityChange = () => {
    if (document2.visibilityState === "hidden") onWindowGone();
  };
  const finishPick = (next) => {
    setState(next);
    if (lingerTimer !== null) env.window.clearTimeout(lingerTimer);
    lingerTimer = env.window.setTimeout(() => {
      lingerTimer = null;
      if (disposed) return;
      setState("idle");
      const stillOnTarget = hoveringUi || pointerX >= 0 && target !== null && findMediaAt(env, pointerX, pointerY) === target;
      if (!stillOnTarget) hide();
    }, RESULT_LINGER_MS);
  };
  const buildEvent = (media, action, imageSrc, editAction) => {
    const pageUrl = context.currentUrl();
    const pageTitle = (document2.title || "").slice(0, BROWSER_PLUGIN_LIMITS.maxTextLength);
    if (mediaKindOf(media) === "video") {
      if (!VIDEO_ACTIONS.has(action)) return null;
      const video = media;
      const pageSource = resolveVideoPage(video);
      const directSource = resolveVideoSource(video);
      const platform = pageSource ? parseBrowserVideoPage(pageSource)?.platform : void 0;
      const usePage = pageSource && (!directSource || platform === "youtube" || platform === "bilibili");
      const src = usePage ? pageSource : directSource;
      if (!src) return null;
      const payload2 = {
        src,
        ...usePage ? { sourceKind: "page" } : pageSource ? { videoPageUrl: pageSource } : {},
        action,
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        pageUrl,
        pageTitle
      };
      return { pluginId: "image-hover", type: "video-picked", payload: payload2 };
    }
    if (!imageSrc) return null;
    const img = media;
    const payload = {
      src: imageSrc,
      action,
      ...action === "edit" ? { editAction } : {},
      alt: (img.alt || "").slice(0, BROWSER_PLUGIN_LIMITS.maxTextLength),
      width: img.naturalWidth,
      height: img.naturalHeight,
      pageUrl,
      pageTitle
    };
    return { pluginId: "image-hover", type: "image-picked", payload };
  };
  const pick = async (action, editAction) => {
    if (state === "busy" || !target || disposed) return;
    const media = target;
    currentAction = action;
    const isImage = mediaKindOf(media) === "image";
    let imageSrc = isImage ? resolveImageSource(media) : "";
    if (isImage && !imageSrc) {
      finishPick("error");
      return;
    }
    setState("busy");
    try {
      if (imageSrc.startsWith("blob:")) imageSrc = await readBlobAsDataUrl(imageSrc);
      const event = buildEvent(media, action, imageSrc, editAction);
      if (!event) {
        finishPick("error");
        return;
      }
      const ack = await context.emit(event);
      if (disposed) return;
      finishPick(ack.ok ? "done" : "error");
    } catch {
      if (!disposed) finishPick("error");
    }
  };
  const swallow = (event) => event.stopPropagation();
  const onUiMouseDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const onButtonClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (state === "busy") return;
    if (menuOpen) closeMenu();
    else openMenu();
  };
  const onMenuClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const path = event.composedPath();
    const item = items.find((candidate) => path.includes(candidate));
    const action = item?.dataset.action;
    if (!action || item?.hidden) return;
    if (action === "edit") {
      if (editMenuOpen) closeEditMenu();
      else openEditMenu();
      return;
    }
    closeMenu();
    void pick(action);
  };
  const onUiEnter = () => {
    hoveringUi = true;
    clearHideTimer();
  };
  const onUiLeave = () => {
    hoveringUi = false;
    schedule();
  };
  for (const element of [button, menu, editMenu, coach.element]) {
    element.addEventListener("pointerenter", onUiEnter);
    element.addEventListener("pointerleave", onUiLeave);
    element.addEventListener("mousedown", onUiMouseDown);
    for (const type of SWALLOWED_EVENTS) element.addEventListener(type, swallow);
  }
  button.addEventListener("pointerenter", expandHint);
  button.addEventListener("pointerleave", collapseHint);
  button.addEventListener("focus", expandHint);
  button.addEventListener("blur", collapseHint);
  button.addEventListener("click", onButtonClick);
  menu.addEventListener("click", onMenuClick);
  const listenerOptions = { capture: true, passive: true };
  document2.addEventListener("pointermove", onPointerMove, listenerOptions);
  document2.addEventListener("scroll", onViewportChange, listenerOptions);
  document2.addEventListener("visibilitychange", onVisibilityChange);
  document2.documentElement?.addEventListener("pointerleave", onPointerGone);
  env.window.addEventListener("resize", onViewportChange, { passive: true });
  env.window.addEventListener("blur", onWindowGone);
  return {
    suspend() {
      collapseHint();
      suspended = true;
      hoveringUi = false;
      closeMenu();
      visible = false;
      button.dataset.visible = "false";
      coach.hide();
      clearHideTimer();
    },
    resume() {
      suspended = false;
      if (target && state === "busy") {
        button.dataset.visible = "true";
        visible = true;
      }
    },
    dispose() {
      collapseHint();
      disposed = true;
      closeMenu();
      clearHideTimer();
      if (lingerTimer !== null) env.window.clearTimeout(lingerTimer);
      if (frame !== 0) env.window.cancelAnimationFrame(frame);
      document2.removeEventListener("pointermove", onPointerMove, listenerOptions);
      document2.removeEventListener("scroll", onViewportChange, listenerOptions);
      document2.removeEventListener("visibilitychange", onVisibilityChange);
      document2.documentElement?.removeEventListener("pointerleave", onPointerGone);
      env.window.removeEventListener("resize", onViewportChange);
      env.window.removeEventListener("blur", onWindowGone);
      coach.dispose();
      menu.remove();
      editMenu.remove();
      button.remove();
    }
  };
}
var imageHoverPlugin = {
  id: "image-hover",
  matches: ["<all_urls>"],
  activate(context) {
    return createImageHoverInstance(context, { document, window });
  }
};

// src/preload/browser-tab/match-pattern.ts
var PATTERN_RE = /^(\*|https?):\/\/(\*|\*\.[^/*]+|[^/*]+)(\/.*)$/u;
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
function globToRegExp(glob) {
  return new RegExp(`^${glob.split("*").map(escapeRegExp).join(".*")}$`, "u");
}
function hostMatches(patternHost, host) {
  if (patternHost === "*") return true;
  const wanted = patternHost.toLowerCase();
  const actual = host.toLowerCase();
  if (wanted.startsWith("*.")) {
    const domain = wanted.slice(2);
    return actual === domain || actual.endsWith(`.${domain}`);
  }
  return actual === wanted;
}
function matchesUrlPattern(pattern, url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (pattern === "<all_urls>") return true;
  const match = PATTERN_RE.exec(pattern.trim());
  if (!match) return false;
  const [, scheme, host, path] = match;
  if (scheme !== "*" && `${scheme}:` !== parsed.protocol) return false;
  if (!hostMatches(host, parsed.hostname)) return false;
  return globToRegExp(path).test(`${parsed.pathname}${parsed.search}`);
}
function matchesAnyUrlPattern(patterns, url) {
  return patterns.some((pattern) => matchesUrlPattern(pattern, url));
}

// src/preload/browser-tab/runtime.ts
var PLUGIN_HOST_ATTRIBUTE = "data-hilo-browser-plugin";
var HOST_STYLE = "all:initial;position:fixed;top:0;left:0;width:0;height:0;overflow:visible;z-index:2147483647;pointer-events:none;";
function createPluginUiHost(document2, pluginId) {
  let host = null;
  let root = null;
  const ensureAttached = () => {
    if (!host || host.isConnected) return;
    (document2.documentElement ?? document2).appendChild(host);
  };
  return {
    mount() {
      if (!root || !host) {
        host = document2.createElement("div");
        host.setAttribute(PLUGIN_HOST_ATTRIBUTE, pluginId);
        host.style.cssText = HOST_STYLE;
        root = host.attachShadow({ mode: "closed" });
      }
      ensureAttached();
      return root;
    },
    ensureAttached,
    unmount() {
      host?.remove();
      host = null;
      root = null;
    }
  };
}
function createPluginRuntime(options) {
  const warn = options.warn ?? ((message, error) => {
    console.warn(`[hilo-browser-plugin] ${message}`, error ?? "");
  });
  let locale = options.locale ?? "en";
  let collectionGuideDismissed = false;
  const enabled = /* @__PURE__ */ new Set();
  const active = /* @__PURE__ */ new Map();
  let started = false;
  let suspended = false;
  let disposed = false;
  const deactivate = (id) => {
    const entry = active.get(id);
    if (!entry) return;
    active.delete(id);
    try {
      entry.instance.dispose();
    } catch (error) {
      warn(`${id} failed to dispose`, error);
    }
    entry.ui.unmount();
  };
  const activate = (plugin) => {
    const ui = createPluginUiHost(options.document, plugin.id);
    const context = {
      pluginId: plugin.id,
      ui,
      locale,
      emit: (event) => options.emit(event),
      currentUrl: () => options.currentUrl(),
      isCollectionGuideDismissed: () => collectionGuideDismissed
    };
    try {
      const instance = plugin.activate(context);
      active.set(plugin.id, { plugin, instance, ui });
      if (suspended) instance.suspend?.();
    } catch (error) {
      ui.unmount();
      warn(`${plugin.id} failed to activate`, error);
    }
  };
  const reconcile = () => {
    if (disposed || !started) return;
    const url = options.currentUrl();
    for (const plugin of options.plugins) {
      const wanted = enabled.has(plugin.id) && matchesAnyUrlPattern(plugin.matches, url);
      const isActive = active.has(plugin.id);
      if (wanted && !isActive) activate(plugin);
      else if (!wanted && isActive) deactivate(plugin.id);
    }
  };
  return {
    start() {
      if (started || disposed) return;
      started = true;
      reconcile();
    },
    setConfig(config) {
      if (disposed) return;
      const nextLocale = config.locale ?? locale;
      if (nextLocale !== locale) {
        locale = nextLocale;
        for (const id of Array.from(active.keys())) deactivate(id);
      }
      collectionGuideDismissed = config.collectionGuideDismissed === true;
      enabled.clear();
      const ids = Array.isArray(config?.enabledPlugins) ? config.enabledPlugins : [];
      for (const id of ids) enabled.add(id);
      reconcile();
    },
    handleCommand(command) {
      if (disposed || !command || typeof command !== "object") return;
      switch (command.type) {
        case "suspend":
          suspended = true;
          for (const entry of active.values()) entry.instance.suspend?.();
          return;
        case "resume":
          suspended = false;
          for (const entry of active.values()) entry.instance.resume?.();
          return;
        case "config":
          this.setConfig(command.config);
          return;
        case "url-changed":
          reconcile();
          return;
        default:
          return;
      }
    },
    activePluginIds() {
      return Array.from(active.keys());
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const id of Array.from(active.keys())) deactivate(id);
    }
  };
}

// src/preload/browser-tab/index.ts
function boot() {
  if (window.top !== window) return;
  const runtime = createPluginRuntime({
    plugins: [imageHoverPlugin],
    document,
    currentUrl: () => location.href,
    emit: (event) => import_electron.ipcRenderer.invoke(BROWSER_PLUGIN_CHANNELS.EVENT, event)
  });
  import_electron.ipcRenderer.on(
    BROWSER_PLUGIN_CHANNELS.COMMAND,
    (_event, command) => {
      runtime.handleCommand(command);
    }
  );
  const start = () => runtime.start();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
  void import_electron.ipcRenderer.invoke(BROWSER_PLUGIN_CHANNELS.GET_CONFIG).then((config) => runtime.setConfig(config)).catch(() => {
  });
}
boot();
