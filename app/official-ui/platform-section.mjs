// 设置页「平台接入」分区：填 MaaS 平台的地址、密钥和各模态模型。
//
// 这是**我们的**分区，不是官方的「模型接入」（那个是自定义 provider 表单，已被
// scope.custom-models-settings 补丁从导航里删掉）。注入方式见 patches.mjs 的
// platform-section 系列补丁：
//   1. 这个文件编译成一段代码，插在官方 SECTIONS 数组前面（PlatformSection 组件 + 服务代理）；
//   2. SECTIONS / SECTION_COMPONENTS 各加一行，让设置导航出现「平台接入」；
//   3. i18n 两份资源里加 ov.platform.* 文案；
//   4. SettingsDialogProvider 里挂首次引导：没配过密钥就自动弹到本分区。
// 数据通道走主进程的 platform-settings 服务（get / save），和旧界面同一条。
//
// **注意**：这段代码会被拼进官方产物，只能用产物里已存在的标识符。下面用到的每个名字
// 都核对过定义在注入点（SECTIONS 数组）之前：reactExports / jsxRuntimeExports /
// useTranslation / SettingGroup / SettingRow / Input3 / Button$1 / dedupedToast /
// ProxyChannel / client / createDecorator / ServerIcon。
export const PlatformSection = `function PlatformSection() {
  const { t: t2 } = useTranslation();
  const [state, setState] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const [saving, setSaving] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({});
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  reactExports.useEffect(() => {
    let alive = true;
    __ovPlatformService.get().then((data) => {
      if (!alive) return;
      const p = data.platform ?? {};
      const m = data.models ?? {};
      setForm({
        baseUrl: p.baseUrl ?? "",
        apiKey: "",
        chatModel: p.chatModel ?? "",
        image: m.image ?? "",
        imageEdit: m.image_edit ?? "",
        video: m.video ?? "",
        videoRef: m.video_ref ?? "",
        videoUpscale: m.video_upscale ?? "",
        imageUpscale: m.image_upscale ?? "",
        music: m.music ?? "",
        musicEdit: m.music_edit ?? "",
        speech: m.speech ?? ""
      });
      setState(data);
    }).catch((e2) => alive && setError(String(e2?.message ?? e2)));
    return () => { alive = false; };
  }, []);
  if (error) return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-destructive", children: t2("ov.platform.loadFailed") });
  if (!state) return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "…" });
  const masked = state.platform?.apiKeyMasked ?? "";
  const hasKey = state.platform?.hasApiKey === true;
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
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const patch = { ...form };
      if (!patch.apiKey) delete patch.apiKey;
      await __ovPlatformService.save(patch);
      dedupedToast.success(t2("ov.platform.saved"));
      try { await window.hilo.opencode.restart(); } catch {}
    } catch (e2) {
      setError(String(e2?.message ?? e2));
      dedupedToast.error(t2("ov.platform.saveFailed"));
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs leading-5 text-muted-foreground", children: t2("ov.platform.desc") }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingGroup, { title: t2("ov.platform.title"), children: [
      field("ov.platform.baseUrl", "baseUrl", { placeholder: "https://maas.ovaijisuan.com/v1" }),
      field("ov.platform.apiKey", "apiKey", { password: true, placeholder: hasKey ? masked : "", desc: "ov.platform.apiKeyHelp" }),
      field("ov.platform.chatModel", "chatModel", { placeholder: "qwen3.8-flash-fp8" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SettingGroup, { title: t2("ov.platform.mediaModels"), children: [
      field("ov.platform.image", "image", { placeholder: "qwen-image-pro-enhanced" }),
      field("ov.platform.imageEdit", "imageEdit"),
      field("ov.platform.video", "video", { placeholder: "minimax-h3-2k" }),
      field("ov.platform.videoRef", "videoRef"),
      field("ov.platform.videoUpscale", "videoUpscale"),
      field("ov.platform.imageUpscale", "imageUpscale"),
      field("ov.platform.music", "music", { placeholder: "minimax-music3" }),
      field("ov.platform.musicEdit", "musicEdit"),
      field("ov.platform.speech", "speech")
    ] }),
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

// 首次打开的引导：没配过密钥就自动弹设置（只弹一次；存 localStorage 之外的真实状态为准）。
// 挂在 SettingsDialogProvider 里：它的 openSettings 本来就是唯一入口。
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

// i18n 文案。键名 ov.platform.*，两份资源（zh / en）各一组。
export const I18N_ZH = {
  "ov.platform.title": "平台接入",
  "ov.platform.desc": "生成能力走自建 MaaS 平台（OpenAI 兼容端点）。地址和密钥保存在本机配置文件里。",
  "ov.platform.baseUrl": "接口地址",
  "ov.platform.apiKey": "API Key",
  "ov.platform.apiKeyHelp": "密钥保存在本机。留空可保留已保存的密钥。",
  "ov.platform.chatModel": "对话模型",
  "ov.platform.mediaModels": "生成模型",
  "ov.platform.image": "文生图",
  "ov.platform.imageEdit": "图生图（选填）",
  "ov.platform.video": "视频",
  "ov.platform.videoRef": "参考生视频（选填）",
  "ov.platform.videoUpscale": "视频超分（选填）",
  "ov.platform.imageUpscale": "图片超分（选填）",
  "ov.platform.music": "音乐",
  "ov.platform.musicEdit": "翻唱 / 重绘（选填）",
  "ov.platform.speech": "语音合成（选填）",
  "ov.platform.save": "保存",
  "ov.platform.saving": "保存中…",
  "ov.platform.saved": "已保存。新配置在下次启动工作区时生效。",
  "ov.platform.saveFailed": "保存失败，请重试。",
  "ov.platform.loadFailed": "暂时无法读取平台配置。",
  "ov.settings.platform": "平台接入",
  "ov.platform.nav": "平台接入"
}

export const I18N_EN = {
  "ov.platform.title": "Platform",
  "ov.platform.desc": "Generation goes through your own MaaS platform (OpenAI-compatible endpoint). Address and key stay on this machine.",
  "ov.platform.baseUrl": "Base URL",
  "ov.platform.apiKey": "API Key",
  "ov.platform.apiKeyHelp": "Keys are stored on this device. Leave blank to keep your saved key.",
  "ov.platform.chatModel": "Chat model",
  "ov.platform.mediaModels": "Media models",
  "ov.platform.image": "Text to image",
  "ov.platform.imageEdit": "Image edit (optional)",
  "ov.platform.video": "Video",
  "ov.platform.videoRef": "Reference video (optional)",
  "ov.platform.videoUpscale": "Video upscale (optional)",
  "ov.platform.imageUpscale": "Image upscale (optional)",
  "ov.platform.music": "Music",
  "ov.platform.musicEdit": "Cover / repaint (optional)",
  "ov.platform.speech": "Speech (optional)",
  "ov.platform.save": "Save",
  "ov.platform.saving": "Saving…",
  "ov.platform.saved": "Saved. Takes effect when the workspace restarts.",
  "ov.platform.saveFailed": "Could not save. Please try again.",
  "ov.platform.loadFailed": "Could not load platform settings.",
  "ov.settings.platform": "Platform",
  "ov.platform.nav": "Platform"
}
