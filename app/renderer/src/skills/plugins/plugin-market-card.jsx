// 插件市场的卡片：图标取色、封面横幅、工作流按钮。
import { useTranslation, reactExports, BadgeCheck, Eye as Eye$1, Workflow } from "../../vendor.js";
import { PluginIcon } from "../../workspace/home-service.jsx";
import { pickLocalized } from "../../generation/normalize-skill-detail-metadata.js";
import { pluginTrackBase } from "../../generation/use-mention-models.jsx";
import { trackPluginWorkflowClick, trackPluginWorkflowOpen, trackPluginWorkflowOpenFailed } from "../../assets/use-plugin-editor-output-selection.js";
import { __jsx } from "../../shared/jsx-runtime.js";
import {
  getPluginTemplateProject,
  normalizePluginLocale,
  useTemplateProjectImport,
} from "./template-project.js";
function extractLogoBackgroundColor(img) {
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", {
      willReadFrequently: false,
    });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, w, h);
    const buckets = new Map();
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] ?? 0;
      if (alpha < 200) continue;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
      const cur = buckets.get(key);
      if (cur) {
        cur.r += r;
        cur.g += g;
        cur.b += b;
        cur.count += 1;
      } else {
        buckets.set(key, {
          r,
          g,
          b,
          count: 1,
        });
      }
    }
    if (buckets.size === 0) return null;
    let winner = null;
    for (const bucket of buckets.values()) {
      if (!winner || bucket.count > winner.count) winner = bucket;
    }
    if (!winner) return null;
    const avgR = Math.round(winner.r / winner.count);
    const avgG = Math.round(winner.g / winner.count);
    const avgB = Math.round(winner.b / winner.count);
    return `rgb(${avgR}, ${avgG}, ${avgB})`;
  } catch {
    return null;
  }
}
function PluginLogoBanner({ iconUrl, className, ...rest }) {
  const imgRef = reactExports.useRef(null);
  const [bgColor, setBgColor] = reactExports.useState(null);
  reactExports.useEffect(() => {
    setBgColor(null);
  }, [iconUrl]);
  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setBgColor(extractLogoBackgroundColor(img));
  };
  return (
    <div
      className={`relative aspect-video w-full overflow-hidden bg-muted ${className ?? ""}`}
      style={
        bgColor
          ? {
              backgroundColor: bgColor,
            }
          : void 0
      }
      data-action-ui-id={rest["data-action-ui-id"]}
    >
      {iconUrl ? (
        <img
          ref={imgRef}
          src={iconUrl}
          alt=""
          crossOrigin="anonymous"
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
          onLoad={handleImgLoad}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <PluginIcon size={40} strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}
function resolvePluginIcon$2(icon, locale) {
  if (!icon) return void 0;
  if (typeof icon === "string") return icon || void 0;
  return pickLocalized(icon, locale) || void 0;
}
export function PluginMarketCard({ plugin, installedSkill, entrySource, position, onDetail }) {
  const { t, i18n } = useTranslation();
  const locale = normalizePluginLocale(i18n.language);
  const displayName = pickLocalized(plugin.name, locale) || plugin.id;
  const summary = pickLocalized(plugin.description, locale);
  const iconUrl = resolvePluginIcon$2(plugin.icon, locale);
  const workflowTemplate = getPluginTemplateProject(plugin.id);
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: cover/card opens detail
    // biome-ignore lint/a11y/noStaticElementInteractions: card click handler
    <div
      data-action-ui-id="plugin-market-card"
      data-plugin-id={plugin.id}
      className="group flex flex-col overflow-hidden rounded-lg border border-transparent bg-card transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg cursor-pointer"
      onClick={() => onDetail?.(plugin)}
    >
      <div className="relative">
        <PluginLogoBanner iconUrl={iconUrl} />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex gap-3 p-3 opacity-0 translate-y-2 transition-[opacity,transform] duration-200 ease-out group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0"
          onClick={(e) => e.stopPropagation()}
        >
          {onDetail && (
            <button
              type="button"
              data-action-ui-id="plugin-market-detail"
              className="flex flex-1 items-center justify-center gap-1.5 h-9 rounded-[4px] text-[13px] font-normal whitespace-nowrap bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-colors cursor-pointer"
              onClick={() => onDetail(plugin)}
            >
              <Eye$1 size={14} strokeWidth={1.5} />
              {t("skills.viewDetail")}
            </button>
          )}
          {workflowTemplate && (
            <PluginWorkflowButton
              plugin={plugin}
              template={workflowTemplate}
              entrySource={entrySource}
              isInstalled={!!installedSkill || plugin.installed === true}
              position={position}
            />
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="truncate text-base font-semibold text-foreground">{displayName}</div>
        {summary && <p className="line-clamp-2 text-sm text-muted-foreground">{summary}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1">
            <span className="truncate text-foreground/85">
              {t("skills.plugin.publisher", "MiniMax Design")}
            </span>
            <BadgeCheck
              size={14}
              fill="none"
              strokeWidth={2}
              className="shrink-0 text-brand-accent"
              aria-label={t("skills.market.verifiedOfficial", "Verified by MiniMax Design")}
            />
          </span>
        </div>
      </div>
    </div>
  );
}
function PluginWorkflowButton({ plugin, template, entrySource, isInstalled, position }) {
  const { t } = useTranslation();
  const importTemplateProject = useTemplateProjectImport();
  const [importing, setImporting] = reactExports.useState(false);
  const handleViewWorkflow = () => {
    if (importing) return;
    const startedAt = Date.now();
    const trackBase = {
      ...pluginTrackBase(plugin, "plugin_market_list", entrySource),
      trigger: "workflow_button",
      ...(position !== void 0
        ? {
            position,
          }
        : {}),
    };
    trackPluginWorkflowClick({
      ...trackBase,
      is_installed: isInstalled,
    });
    setImporting(true);
    void importTemplateProject(template)
      .then((outcome) => {
        const terminal = {
          ...trackBase,
          open_mode: outcome.openMode,
          plugin_prepare_result: outcome.pluginPrepareResult,
          duration_ms: Date.now() - startedAt,
        };
        if (outcome.success) {
          trackPluginWorkflowOpen(terminal);
        } else {
          trackPluginWorkflowOpenFailed({
            ...terminal,
            stage: outcome.failureStage ?? "template_import",
          });
        }
      })
      .finally(() => setImporting(false));
  };
  return (
    <button
      type="button"
      data-action-ui-id="plugin-market-workflow"
      className="flex flex-1 items-center justify-center gap-1.5 h-9 rounded-[4px] text-[13px] font-normal whitespace-nowrap bg-brand-accent text-white hover:opacity-90 transition-opacity cursor-pointer disabled:cursor-wait disabled:opacity-70"
      onClick={handleViewWorkflow}
      disabled={importing}
      aria-busy={importing}
    >
      <Workflow size={14} strokeWidth={1.5} />
      {importing
        ? t("coachMark.downloading", "Downloading…")
        : t("skills.plugin.viewWorkflow", "View workflow")}
    </button>
  );
}
