// 浏览器连接器：状态、试用、详情弹窗与卡片，以及能力列表。
import {
  jh as useSettings,
  h as useTranslation,
  r as reactExports,
  a3 as dedupedToast,
  x as useNavigateToWorkspace,
  H as homeService,
  K as workspaceRuntimeFromOpenResult,
  l9 as toastWorkspaceOpenResult,
  mw as workspaceEvents,
  hm as useTheme,
  j as jsxRuntimeExports,
  j3 as ConnectorDialogFrame,
  gj as DialogHeader,
  j4 as ConnectorRelationshipGraphic,
  mx as CDN_BROWSER_START_ICON,
  j5 as ConnectorDialogScrollableBody,
  j9 as ConnectorSummaryAction,
  jg as IntegrationStatusPill,
  j2 as ConnectorPromptAction,
  iT as ConnectorIcon,
  kq as Switch,
  bo as Boxes,
  er as ScrollText,
  e as Icon,
} from "../../main.jsx";
import {
  a as ConnectorDialogSummary,
  c as ConnectorPromptList,
  C as ConnectorCardContent,
} from "../../connector-catalog-data-DiTljgxj.js";
import { __jsx } from "../../shared/jsx-runtime.js";
export function useBrowserConnector() {
  const { config, set } = useSettings();
  const { t } = useTranslation();
  const [pending, setPending] = reactExports.useState(false);
  const inFlight = reactExports.useRef(false);
  const handleEnabledChange = async (enabled) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      if (!(await set("browserConnectorEnabled", enabled))) {
        dedupedToast.error(t("connectors.browser.saveFailed", "无法更新浏览器连接器设置，请重试"));
      }
    } catch {
      dedupedToast.error(t("connectors.browser.saveFailed", "无法更新浏览器连接器设置，请重试"));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  return {
    enabled: config.browserConnectorEnabled !== false,
    pending,
    handleEnabledChange,
  };
}
export function useTryConnector() {
  const { t } = useTranslation();
  const navigateToWorkspace = useNavigateToWorkspace();
  const [trying, setTrying] = reactExports.useState(false);
  const tryConnector = reactExports.useCallback(
    async (connector, prompt) => {
      if (trying) return;
      setTrying(true);
      try {
        const workspacePrompt = prompt?.trim() || connector.displayName;
        const result = await homeService.hiloApp
          .createWorkspaceWithResult(workspacePrompt)
          .catch(() => null);
        if (!result) {
          dedupedToast.error(t("skills.tryItOutFailed"));
          return;
        }
        const runtime = workspaceRuntimeFromOpenResult(result);
        if (!runtime) {
          toastWorkspaceOpenResult(result, t);
          return;
        }
        workspaceEvents.queueAddConnectorToChat(runtime.workspaceId, connector, prompt ?? "");
        navigateToWorkspace(runtime);
      } finally {
        setTrying(false);
      }
    },
    [trying, t, navigateToWorkspace],
  );
  return {
    tryConnector,
    trying,
  };
}
function useTryBrowserTask() {
  const { t } = useTranslation();
  const navigateToWorkspace = useNavigateToWorkspace();
  const inFlight = reactExports.useRef(false);
  const [trying, setTrying] = reactExports.useState(false);
  const tryBrowserTask = async (prompt) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setTrying(true);
    try {
      const result = await homeService.hiloApp.createWorkspaceWithResult(prompt);
      const runtime = workspaceRuntimeFromOpenResult(result);
      if (!runtime) {
        toastWorkspaceOpenResult(result, t);
        return false;
      }
      await navigateToWorkspace(runtime, {
        skillPrompt: prompt,
      });
      return true;
    } catch {
      dedupedToast.error(t("skills.tryItOutFailed"));
      return false;
    } finally {
      inFlight.current = false;
      setTrying(false);
    }
  };
  return {
    tryBrowserTask,
    trying,
  };
}
function BrowserConnectorDetailDialog({
  title,
  description,
  enabled,
  pending,
  onEnabledChange,
  onClose,
}) {
  const { t } = useTranslation();
  const { resolved } = useTheme();
  const { tryBrowserTask, trying } = useTryBrowserTask();
  const busy = pending || trying;
  const status = t(enabled ? "connectors.browser.enabled" : "connectors.browser.disabled");
  const handlePrompt = async (prompt) => {
    if (busy) return;
    if (!enabled) {
      await onEnabledChange(true);
      return;
    }
    if (await tryBrowserTask(prompt)) onClose();
  };
  return (
    <ConnectorDialogFrame
      open={true}
      onOpenChange={(open) => !open && onClose()}
      actionUiId="connector-browser-detail-dialog"
      closeActionUiId="connector-browser-detail-close"
      closeLabel={t("common.close")}
      size="md"
      stableHeight={true}
    >
      <DialogHeader className="shrink-0 items-center px-4 pt-8 text-center sm:px-6">
        <ConnectorRelationshipGraphic targetIconUrl={CDN_BROWSER_START_ICON[resolved]} />
      </DialogHeader>
      <ConnectorDialogScrollableBody>
        <div className="flex flex-col items-center px-4 sm:px-6">
          <ConnectorDialogSummary
            title={title}
            description={description}
            status={
              <IntegrationStatusPill
                label={status}
                tone={enabled ? "neutral" : "muted"}
                markerTone={enabled ? "success" : "muted"}
                markerLabel={status}
              />
            }
            actions={
              <ConnectorSummaryAction
                mode="connect"
                label={enabled ? status : t("connectors.browser.enable")}
                loading={pending}
                disabled={enabled || busy}
                onClick={() => void onEnabledChange(true)}
                data-action-ui-id="connector-browser-detail-enable"
              />
            }
          />
        </div>
        <ConnectorPromptList
          title={t("connectors.detail.trySection")}
          description={t("connectors.detail.tryDescription")}
          actionUiId="connector-browser-detail-prompts"
          items={[0, 1, 2].map((index) => {
            const key = `connectors.detail.browser.prompt.${index}`;
            const prompt = t(key);
            return {
              key,
              title: t(`connectors.detail.browser.promptTitle.${index}`),
              description: prompt,
              muted: !enabled,
              action: (
                <ConnectorPromptAction
                  mode={enabled ? "ready" : "requiresEnable"}
                  label={t(
                    enabled ? "connectors.detail.tryInChat" : "connectors.browser.enableToUse",
                  )}
                  disabled={busy}
                  onClick={() => void handlePrompt(prompt)}
                  data-action-ui-id={`connector-browser-detail-prompt-${index}`}
                />
              ),
            };
          })}
        />
      </ConnectorDialogScrollableBody>
    </ConnectorDialogFrame>
  );
}
export function BrowserConnectorCard({ title, description, enabled, pending, onEnabledChange }) {
  const { t } = useTranslation();
  const { resolved } = useTheme();
  const [detailOpen, setDetailOpen] = reactExports.useState(false);
  return (
    <>
      <article
        className="relative flex min-h-40 flex-col rounded-2xl border border-border bg-card p-5"
        data-action-ui-id="connectors-browser-card"
        data-connector-id="browser"
        aria-busy={pending}
      >
        <button
          type="button"
          className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("connectors.browser.details")}
          data-action-ui-id="connectors-browser-details"
          onClick={() => setDetailOpen(true)}
        />
        <div className="pointer-events-none relative flex items-start justify-between gap-4">
          <ConnectorIcon
            size="card"
            className="bg-transparent"
            fallback={
              <img
                src={CDN_BROWSER_START_ICON[resolved]}
                alt=""
                className="size-full"
                draggable={false}
              />
            }
          />
          <div
            className="pointer-events-auto relative z-10 flex min-h-10 items-center gap-2"
            data-layout-slot="connector-card-controls"
          >
            <span className="text-xs text-muted-foreground">
              {enabled
                ? t("connectors.browser.enabled", "已开启")
                : t("connectors.browser.disabled", "已关闭")}
            </span>
            <Switch
              className="data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
              checked={enabled}
              disabled={pending}
              onCheckedChange={(checked) => void onEnabledChange(checked)}
              aria-label={t("connectors.browser.toggle", "允许 Agent 使用浏览器")}
              data-action-ui-id="connectors-browser-toggle"
            />
          </div>
        </div>
        <div className="pointer-events-none relative">
          <ConnectorCardContent title={title} description={description} />
        </div>
      </article>
      {detailOpen ? (
        <BrowserConnectorDetailDialog
          title={title}
          description={description}
          enabled={enabled}
          pending={pending}
          onEnabledChange={onEnabledChange}
          onClose={() => setDetailOpen(false)}
        />
      ) : null}
    </>
  );
}
function CapabilityRow({ item, fallbackIcon }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <span
        aria-hidden={true}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary"
      >
        {item.iconUrl ? (
          <ConnectorIcon iconUrl={item.iconUrl} size="card" />
        ) : (
          <Icon icon={fallbackIcon} size="sm" className="text-muted-foreground" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
        {item.description ? (
          <span className="mt-0.5 line-clamp-1 block text-[13px] leading-relaxed text-muted-foreground">
            {item.description}
          </span>
        ) : null}
      </span>
    </li>
  );
}
export function ConnectorCapabilityList({ app, skills }) {
  const { t } = useTranslation();
  if (!app && skills.length === 0) return null;
  return (
    <div className="mb-5" data-layout-slot="connector-capability-content">
      {app ? (
        <section className="relative pt-5 pl-2 pr-1 sm:pl-3 sm:pr-2">
          <span
            aria-hidden="true"
            className="absolute inset-x-4 top-0 border-t border-border-soft"
          />
          <h3 className="mb-1 px-4 font-heading text-sm font-medium text-foreground">
            {t("connectors.detail.appSection", "Application")}
          </h3>
          <ul className="px-4">
            <CapabilityRow item={app} fallbackIcon={Boxes} />
          </ul>
        </section>
      ) : null}
      {skills.length > 0 ? (
        <section className="relative pt-5 pl-2 pr-1 sm:pl-3 sm:pr-2">
          <span
            aria-hidden="true"
            className="absolute inset-x-4 top-0 border-t border-border-soft"
          />
          <h3 className="mb-1 px-4 font-heading text-sm font-medium text-foreground">
            {t("connectors.detail.skillsSection", "Skills")}
          </h3>
          <ul className="divide-y divide-border-soft px-4">
            {skills.map((skill) => (
              <CapabilityRow key={skill.key} item={skill} fallbackIcon={ScrollText} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
export function localizedCapabilityText(text, language) {
  return language.toLowerCase().startsWith("zh") ? text.zh : text.en;
}
