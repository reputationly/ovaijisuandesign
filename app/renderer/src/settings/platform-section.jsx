// platform-section.jsx
// 设置页「平台接入」分区：填平台地址和令牌（API Key），模型只读展示（取值来自主进程的产品预设和配置覆盖）。
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { Button } from "../infra/dialog-content.jsx";
import { Input3 } from "../infra/select-content.jsx";
import { platformService } from "../infra/platform-service.js";
import { SettingGroup, SettingRow } from "./settings-select.jsx";
const FIRST_RUN_PROMPTED_KEY = "__ovPlatformPrompted";
export function PlatformSection() {
  const { t: t2 } = useTranslation();
  const [state, setState] = reactExports.useState(null);
  const [loadError, setLoadError] = reactExports.useState(null);
  const [saveError, setSaveError] = reactExports.useState(null);
  const [saving, setSaving] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({ baseUrl: "", apiKey: "" });
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  reactExports.useEffect(() => {
    let alive = true;
    platformService
      .get()
      .then((data) => {
        if (!alive) return;
        setState(data);
        setForm((prev) => ({ ...prev, baseUrl: data.platform?.baseUrl ?? "" }));
      })
      .catch((e2) => alive && setLoadError(String(e2?.message ?? e2)));
    return () => {
      alive = false;
    };
  }, []);
  if (loadError) return <p className="text-xs text-destructive">{t2("ov.platform.loadFailed")}</p>;
  if (!state) return <p className="text-xs text-muted-foreground">…</p>;
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
    ["ov.platform.speech", m.speech],
  ];
  const field = (labelKey, key, opts = {}) => (
    <SettingRow label={t2(labelKey)} description={opts.desc ? t2(opts.desc) : void 0}>
      <Input3
        type={opts.password ? "password" : "text"}
        value={form[key] ?? ""}
        onChange={set(key)}
        placeholder={opts.placeholder ?? ""}
        autoComplete="off"
        spellCheck={false}
        className="w-80"
      />
    </SettingRow>
  );
  const usedRow = ([labelKey, value]) => (
    <SettingRow key={labelKey} label={t2(labelKey)}>
      {value ? (
        <span className="font-mono text-xs text-foreground truncate" title={value}>
          {value}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">{t2("ov.platform.notEnabled")}</span>
      )}
    </SettingRow>
  );
  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const patch = { baseUrl: form.baseUrl };
      if (form.apiKey) patch.apiKey = form.apiKey;
      await platformService.save(patch);
      setForm((prev) => ({ ...prev, apiKey: "" }));
      setState(await platformService.get());
      dedupedToast.success(t2("ov.platform.saved"));
      try {
        await window.hilo.opencode.restart();
      } catch {}
    } catch (e2) {
      setSaveError(String(e2?.message ?? e2));
      dedupedToast.error(t2("ov.platform.saveFailed"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-2">
      <p className="text-xs leading-5 text-muted-foreground">{t2("ov.platform.desc")}</p>
      <SettingGroup title={t2("ov.platform.title")}>
        {field("ov.platform.baseUrl", "baseUrl", { placeholder: "https://maas.ovaijisuan.com/v1" })}
        {field("ov.platform.apiKey", "apiKey", { password: true, placeholder: hasKey ? masked : "", desc: "ov.platform.apiKeyHelp" })}
      </SettingGroup>
      <SettingGroup title={t2("ov.platform.modelsTitle")}>{usedModels.map(usedRow)}</SettingGroup>
      {saveError ? <p className="text-xs text-destructive">{saveError}</p> : null}
      <div className="flex justify-end gap-2">
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? t2("ov.platform.saving") : t2("ov.platform.save")}
        </Button>
      </div>
    </div>
  );
}
// 没配过令牌时自动打开设置到本分区。正常流程由主进程的令牌页先拦住，走到这里说明令牌后来被清掉了，
// 所以每个会话只弹一次。
export function usePlatformFirstRun(openSettings) {
  reactExports.useEffect(() => {
    let alive = true;
    platformService
      .get()
      .then((data) => {
        if (!alive) return;
        if (data?.platform?.hasApiKey) return;
        if (sessionStorage.getItem(FIRST_RUN_PROMPTED_KEY)) return;
        sessionStorage.setItem(FIRST_RUN_PROMPTED_KEY, "1");
        openSettings("platform");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [openSettings]);
}
