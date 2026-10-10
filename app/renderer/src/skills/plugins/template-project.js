// 插件模板项目：地区适配、模板插件准备与一键导入。
import { useTranslation, reactExports, API_PATHS, useStorage } from "../../vendor.js";
import { dedupedToast } from "../../infra/agent-http-client.js";
import { gatewayFetch } from "../../infra/gateway-fetch.js";
import { CDN_TEMPLATE_PROJECT_WATERMARK_TOOL, CDN_TEMPLATE_PROJECT_RELIGHT, CDN_TEMPLATE_PROJECT_PANORAMA_VIEWER, CDN_TEMPLATE_PROJECT_N_STORYBOARD, CDN_TEMPLATE_PROJECT_MULTI_SHOT, CDN_TEMPLATE_PROJECT_3D_DIRECTOR } from "../../workspace/topbar-state-context.jsx";
import { pluginEvents } from "../../canvas/resolve-workspace-failure-diagnosis.js";
import { useProjectArchiveActions } from "../../workspace/use-project-archive-actions.js";
import { SIDEBAR_TAB_STORAGE_KEY } from "../../workspace/set-home-widget-dev-preview-mode.js";
export function normalizePluginLocale(short) {
  if (!short) return "en-US";
  if (short.startsWith("zh")) return "zh-CN";
  if (short.startsWith("en")) return "en-US";
  return short;
}
const PLUGIN_TEMPLATE_PROJECTS = {
  "3d-director-stage": {
    templateProjectUrl: CDN_TEMPLATE_PROJECT_3D_DIRECTOR,
    // Version the template's canvas.json was authored against (the embedded
    // plugin node records pluginVersion 0.1.21).
    requiredPlugin: {
      id: "3d-director-stage",
      minVersion: "0.1.21",
    },
  },
  // minVersion below = the pluginVersion embedded in each template zip's
  // .hilo/canvas.json plugin file-node (verified against both regional zips).
  "multi-shot": {
    templateProjectUrl: CDN_TEMPLATE_PROJECT_MULTI_SHOT,
    requiredPlugin: {
      id: "multi-shot",
      minVersion: "0.3.3",
    },
  },
  "n-storyboard": {
    templateProjectUrl: CDN_TEMPLATE_PROJECT_N_STORYBOARD,
    requiredPlugin: {
      id: "n-storyboard",
      minVersion: "0.1.33",
    },
  },
  "panorama-viewer": {
    templateProjectUrl: CDN_TEMPLATE_PROJECT_PANORAMA_VIEWER,
    requiredPlugin: {
      id: "panorama-viewer",
      minVersion: "0.1.0",
    },
  },
  relight: {
    templateProjectUrl: CDN_TEMPLATE_PROJECT_RELIGHT,
    requiredPlugin: {
      id: "relight",
      minVersion: "0.1.15",
    },
  },
  "watermark-tool": {
    templateProjectUrl: CDN_TEMPLATE_PROJECT_WATERMARK_TOOL,
    requiredPlugin: {
      id: "watermark-tool",
      minVersion: "0.0.14",
    },
  },
};
export function getPluginTemplateProject(pluginId) {
  return PLUGIN_TEMPLATE_PROJECTS[pluginId];
}
class TemplatePluginPrepareError extends Error {
  constructor(openMode, cause) {
    super(cause instanceof Error ? cause.message : String(cause), {
      cause,
    });
    this.openMode = openMode;
    this.name = "TemplatePluginPrepareError";
  }
}
function compareVersions(a, b) {
  const pa = a.split(".").map((s) => Number.parseInt(s, 10) || 0);
  const pb = b.split(".").map((s) => Number.parseInt(s, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
async function ensureTemplatePlugin(required) {
  let existing;
  try {
    const listResp = await gatewayFetch(API_PATHS.plugins);
    if (!listResp.ok) throw new Error(`list plugins: HTTP ${listResp.status}`);
    const payload = await listResp.json();
    existing = (payload.plugins ?? []).find((p) => p.id === required.id);
  } catch (error) {
    throw new TemplatePluginPrepareError("unknown", error);
  }
  if (existing?.source === "user") return "direct";
  if (existing && compareVersions(existing.version, required.minVersion) >= 0) return "direct";
  const openMode = existing ? "upgrade_then_open" : "install_then_open";
  try {
    const resp = await gatewayFetch(API_PATHS.marketInstall, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: required.id,
        skillType: "plugin",
      }),
    });
    if (!resp.ok) throw new Error(`install: HTTP ${resp.status}`);
    const result = await resp.json();
    if (!result.ok) throw new Error(result.error ?? "install failed");
  } catch (error) {
    throw new TemplatePluginPrepareError(openMode, error);
  }
  pluginEvents.firePluginsChanged(required.id, "installed");
  return openMode;
}
export function useTemplateProjectImport() {
  const { t } = useTranslation();
  const { runImportFromUrl } = useProjectArchiveActions();
  const [, setConfig] = useStorage("global.config");
  return reactExports.useCallback(
    async (template) => {
      localStorage.setItem(SIDEBAR_TAB_STORAGE_KEY, "plugins");
      setConfig((prev) => ({
        ...prev,
        canvasSidebarOpen: true,
      }));
      const pluginReady = template.requiredPlugin
        ? ensureTemplatePlugin(template.requiredPlugin).then(
            (openMode) => ({
              openMode,
              result: "success",
            }),
            (error) => ({
              openMode: error instanceof TemplatePluginPrepareError ? error.openMode : "unknown",
              result: "failed",
            }),
          )
        : Promise.resolve({
            openMode: "direct",
            result: "not_needed",
          });
      const [importOutcome, pluginOutcome] = await Promise.all([
        runImportFromUrl(template.templateProjectUrl),
        pluginReady,
      ]);
      if (pluginOutcome.result === "failed") {
        dedupedToast.warning(
          t("coachMark.pluginInstallFailed", "插件安装失败，可稍后在插件市场手动安装"),
        );
      }
      return {
        success: importOutcome.success,
        openMode: pluginOutcome.openMode,
        pluginPrepareResult: pluginOutcome.result,
        ...(importOutcome.failureStage
          ? {
              failureStage: importOutcome.failureStage,
            }
          : {}),
      };
    },
    [runImportFromUrl, setConfig, t],
  );
}
