// 设置页「平台接入」分区：填平台地址和令牌（API Key），并**只展示**正在使用的模型。
//
// 这是**我们的**分区，不是官方的「模型接入」（那个是自定义 provider 表单，已被
// scope.custom-models-settings 补丁从导航里删掉）。注入方式见 patches.mjs 的
// platform-section 系列补丁：
//   1. 这个文件编译成一段代码，插在官方 SECTIONS 数组前面（PlatformSection 组件 + 服务代理）；
//   2. SECTIONS / SECTION_COMPONENTS 各加一行，让设置导航出现「平台接入」；
//   3. i18n 两份资源里加 ov.platform.* 文案；
//   4. SettingsDialogProvider 里挂首次引导：没配过令牌就自动弹到本分区（兜底；正常流程由主进程的令牌页先拦住）。
//
// 模型不让选：界面上只有只读的列表，取值来自主进程（产品预设 + 配置文件里的覆盖，见 `@ov/protocol`）。
// 数据通道走主进程的 platform-settings 服务（get / save），和旧界面同一条。
//
// **注意**：这段代码会被拼进官方产物，只能用产物里已存在的标识符。下面用到的每个名字
// 都核对过定义在注入点（SECTIONS 数组）之前：reactExports / jsxRuntimeExports /
// useTranslation / SettingGroup / SettingRow / Input3 / Button$1 / dedupedToast /
// ProxyChannel / client / createDecorator / ServerIcon。
export const PlatformSection = `function PlatformSection() {
  const { t: t2 } = useTranslation();
  const [state, setState] = reactExports.useState(null);
  const [loadError, setLoadError] = reactExports.useState(null);
  const [saveError, setSaveError] = reactExports.useState(null);
  const [saving, setSaving] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({ baseUrl: "", apiKey: "" });
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  reactExports.useEffect(() => {
    let alive = true;
    __ovPlatformService.get().then((data) => {
      if (!alive) return;
      setState(data);
      setForm((prev) => ({ ...prev, baseUrl: data.platform?.baseUrl ?? "" }));
    }).catch((e2) => alive && setLoadError(String(e2?.message ?? e2)));
    return () => { alive = false; };
  }, []);
  if (loadError) return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-destructive", children: t2("ov.platform.loadFailed") });
  if (!state) return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "…" });
  const masked = state.platform?.apiKeyMasked ?? "";
  const hasKey = state.platform?.hasApiKey === true;
  const m = state.models ?? {};
  const usedModels = [
    ["ov.platform.chatModel", state.platform?.chatModel],
    ["ov.platform.image", m.image],
    ["ov.platform.imageEdit", m.image_edit],
    ["ov.platform.video", m.video],
    ["ov.platform.videoRef", m.video_ref],
    ["ov.platform.videoUpscale", m.video_upscale],
    ["ov.platform.imageUpscale", m.image_upscale],
    ["ov.platform.music", m.music],
    ["ov.platform.musicEdit", m.music_edit],
    ["ov.platform.speech", m.speech]
  ];
  const field = (labelKey, key, opts = {}) => /* @__PURE__ */ jsxRuntimeExports.jsx(SettingRow, {
    label: t2(labelKey),
    description: opts.desc ? t2(opts.desc) : void 0,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input3, {
      type: opts.password ? "password" : "text",
      value: form[key] ?? "",
      onChange: set(key),
      placeholder: opts.placeholder ?? "",
      autoComplete: "off",
      spellCheck: false,
      className: "w-80"
    })
  });
  const usedRow = ([labelKey, value]) => /* @__PURE__ */ jsxRuntimeExports.jsx(SettingRow, {
    key: labelKey,
    label: t2(labelKey),
    children: value
      ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-xs text-foreground truncate", title: value, children: value })
      : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: t2("ov.platform.notEnabled") })
  });
  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const patch = { baseUrl: form.baseUrl };
      if (form.apiKey) patch.apiKey = form.apiKey;
      await __ovPlatformService.save(patch);
      setForm((prev) => ({ ...prev, apiKey: "" }));
      setState(await __ovPlatformService.get());
      dedupedToast.success(t2("ov.platform.saved"));
      try { await window.hilo.opencode.restart(); } catch {}
    } catch (e2) {
      setSaveError(String(e2?.message ?? e2));
      dedupedToast.error(t2("ov.platform.saveFailed"));
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs leading-5 text-muted-foreground", children: t2("ov.platform.desc") }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingGroup, { title: t2("ov.platform.title"), children: [
      field("ov.platform.baseUrl", "baseUrl", { placeholder: "https://maas.ovaijisuan.com/v1" }),
      field("ov.platform.apiKey", "apiKey", { password: true, placeholder: hasKey ? masked : "", desc: "ov.platform.apiKeyHelp" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SettingGroup, { title: t2("ov.platform.modelsTitle"), children: usedModels.map(usedRow) }),
    saveError ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-destructive", children: saveError }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button$1, {
      onClick: save,
      disabled: saving,
      size: "sm",
      children: saving ? t2("ov.platform.saving") : t2("ov.platform.save")
    }) })
  ] });
}`

// 服务代理：主进程的 platform-settings 通道（registerChannel("platform-settings", …)）
// 走官方自己的 ProxyChannel 协议，和 desktopSettings 等同一条总线。
export const PlatformServiceShim = `const IPlatformSettingsService = createDecorator("platformSettingsService");
const __ovPlatformService = ProxyChannel.toService(client.getChannel("platform-settings"));`

// 首次打开的引导（兜底）：没配过令牌就自动弹设置到本分区。正常情况下主进程的令牌页先拦住了，
// 走到这里说明令牌后来被清掉了，所以只弹一次（sessionStorage 挡住本次会话内的重复弹）。
export const FirstRunShim = `function __ovPlatformFirstRun() {
  reactExports.useEffect(() => {
    let alive = true;
    __ovPlatformService.get().then((data) => {
      if (!alive) return;
      if (data?.platform?.hasApiKey) return;
      if (sessionStorage.getItem("__ovPlatformPrompted")) return;
      sessionStorage.setItem("__ovPlatformPrompted", "1");
      openSettings("platform");
    }).catch(() => {});
    return () => { alive = false; };
  }, [openSettings]);
}`

// 左下角的连接状态：替代原来的用户头像和名字（没有账户体系，不再显示用户）。
// 每 3 秒问一次主进程的缓存结果；启动时主进程已经用令牌探测过（见 app/desktop/src/main/platform-connection.ts）。
// 颜色走内联样式，不依赖官方 CSS 里有没有 bg-green-500 之类的类。
// 三个函数都是模块顶层声明，侧栏组件在后面才渲染，引用时已经定义好。
export const ConnectionIndicatorShim = `function __ovConnectionState() {
  const { t: t2 } = useTranslation();
  const [status, setStatus] = reactExports.useState(null);
  reactExports.useEffect(() => {
    let alive = true;
    const poll = () => {
      __ovPlatformService.status().then((s) => { if (alive) setStatus(s); }).catch(() => {});
    };
    poll();
    const timer = setInterval(poll, 3000);
    return () => { alive = false; clearInterval(timer); };
  }, []);
  const state = status ? status.state : "checking";
  const color = state === "connected" ? "#22c55e" : state === "disconnected" ? "#ef4444" : "#a3a3a3";
  const label = state === "connected" ? t2("ov.connection.connected") : state === "disconnected" ? t2("ov.connection.disconnected") : t2("ov.connection.checking");
  const reason = status && status.reason ? status.reason : label;
  return { color, label, reason };
}
function OvConnectionPill() {
  const { color, label, reason } = __ovConnectionState();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
    className: "flex min-w-0 flex-1 items-center gap-2 text-body-14",
    style: { paddingLeft: 8 },
    title: reason,
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: color } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: label })
    ]
  });
}
function OvConnectionDot() {
  const { color, label, reason } = __ovConnectionState();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
    role: "img",
    "aria-label": label,
    title: reason,
    style: { display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color }
  });
}`;

// i18n 文案。键名 ov.platform.*，两份资源（zh / en）各一组。
export const I18N_ZH = {
  "ov.platform.title": "平台接入",
  "ov.platform.desc": "对话和生成都走平台。令牌保存在本机，填过一次之后不再要求输入；模型由平台统一配置，这里只展示。",
  "ov.platform.baseUrl": "接口地址",
  "ov.platform.apiKey": "令牌（API Key）",
  "ov.platform.apiKeyHelp": "令牌保存在本机。留空则保留已保存的令牌。",
  "ov.platform.modelsTitle": "正在使用的模型",
  "ov.platform.chatModel": "对话",
  "ov.platform.image": "文生图",
  "ov.platform.imageEdit": "图生图",
  "ov.platform.video": "视频",
  "ov.platform.videoRef": "参考生视频",
  "ov.platform.videoUpscale": "视频超分",
  "ov.platform.imageUpscale": "图片超分",
  "ov.platform.music": "文生音乐",
  "ov.platform.musicEdit": "翻唱 / 重绘",
  "ov.platform.speech": "语音合成",
  "ov.platform.notEnabled": "未启用",
  "ov.platform.save": "保存",
  "ov.platform.saving": "保存中…",
  "ov.platform.saved": "已保存，马上生效。",
  "ov.platform.saveFailed": "保存失败，请重试。",
  "ov.platform.loadFailed": "暂时无法读取平台配置。",
  "ov.settings.platform": "平台接入",
  "ov.platform.nav": "平台接入",
  "ov.connection.connected": "已连接",
  "ov.connection.disconnected": "未连接",
  "ov.connection.checking": "检测中…"
}

export const I18N_EN = {
  "ov.platform.title": "Platform",
  "ov.platform.desc": "Chat and generation both run on the platform. The token stays on this machine and is only asked for once. Models are set by the platform and shown here for reference.",
  "ov.platform.baseUrl": "Base URL",
  "ov.platform.apiKey": "Token (API Key)",
  "ov.platform.apiKeyHelp": "Stored on this device. Leave blank to keep the saved token.",
  "ov.platform.modelsTitle": "Models in use",
  "ov.platform.chatModel": "Chat",
  "ov.platform.image": "Text to image",
  "ov.platform.imageEdit": "Image edit",
  "ov.platform.video": "Video",
  "ov.platform.videoRef": "Reference video",
  "ov.platform.videoUpscale": "Video upscale",
  "ov.platform.imageUpscale": "Image upscale",
  "ov.platform.music": "Text to music",
  "ov.platform.musicEdit": "Cover / repaint",
  "ov.platform.speech": "Speech",
  "ov.platform.notEnabled": "Not enabled",
  "ov.platform.save": "Save",
  "ov.platform.saving": "Saving…",
  "ov.platform.saved": "Saved. Takes effect right away.",
  "ov.platform.saveFailed": "Could not save. Please try again.",
  "ov.platform.loadFailed": "Could not load platform settings.",
  "ov.settings.platform": "Platform",
  "ov.platform.nav": "Platform",
  "ov.connection.connected": "Connected",
  "ov.connection.disconnected": "Not connected",
  "ov.connection.checking": "Checking…"
}
