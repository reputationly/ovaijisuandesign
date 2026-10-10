// 技能详情弹窗。
import { useTranslation, reactExports, jsxRuntimeExports, X$7 as X, Loader2, BadgeCheck, reactDomExports, UserRound, Share2 } from "../../vendor.js";
import { Switch } from "../../generation/select-content.jsx";
import { StrokeIcon, RetryIcon } from "../../workspace/use-prompt-icon.jsx";
import { cn$2 as cn, Button, TooltipContent } from "../../infra/dialog-content.jsx";
import { toDisplayName, formatDownloads, UPDATE_INDICATOR_STYLES } from "../../generation/use-mention-models.jsx";
import { Download as Download$1, MessageSquare } from "../../media-editing/package.jsx";
import { Tooltip, TooltipTrigger } from "../../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
import { canSubmitSkillDetail, mergeSkillDetail, useSkillDetail } from "./data.js";
import { SkillShowcase, SkillStructuredOverview } from "./showcase.jsx";
export function SkillDetailDialog({
  skill,
  installedSkill,
  accountId = "",
  activeTab,
  onClose,
  onToggle,
  onTryItOut,
  onInstall,
  installing,
  onShare,
  updateInfo,
  onUpdate,
  updating,
  onOpenCreatorPlan,
}) {
  const { t, i18n } = useTranslation();
  const dialogRef = reactExports.useRef(null);
  const onCloseRef = reactExports.useRef(onClose);
  reactExports.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const detail = useSkillDetail(skill.name, accountId, i18n.language);
  const resolved = mergeSkillDetail(
    installedSkill ?? skill,
    detail?.skill ?? ("installed" in skill ? skill : void 0),
  );
  const local = installedSkill ?? ("enabled" in resolved ? resolved : void 0);
  const isInstalled = !!local || ("installed" in resolved && resolved.installed === true);
  const isZh = i18n.language.startsWith("zh");
  const displayName = isZh
    ? resolved.displayNameZh || toDisplayName(resolved.name)
    : toDisplayName(resolved.name);
  const author =
    (isZh ? resolved.authorCn || resolved.authorEn : resolved.authorEn || resolved.authorCn) ||
    resolved.creator ||
    t("skills.detail.unknownCreator");
  const downloads = detail?.skill?.downloads ?? ("downloads" in skill ? skill.downloads : void 0);
  const version =
    (isInstalled
      ? local?.version || ("installedVersion" in resolved ? resolved.installedVersion : void 0)
      : void 0) ||
    resolved.version ||
    detail?.skill?.version;
  const marketSource = "marketSource" in resolved ? resolved.marketSource : resolved.source;
  const verified = marketSource === "official" || marketSource === "official-featured";
  const showSubmit =
    canSubmitSkillDetail(
      activeTab,
      resolved,
      !!accountId && detail?.canSubmitToCommunity === true,
    ) && !!onOpenCreatorPlan;
  const mediaKey = JSON.stringify([
    skill.name,
    i18n.language,
    resolved.showcase,
    resolved.coverUrl,
    "coverUrlEn" in resolved ? resolved.coverUrlEn : void 0,
  ]);
  reactExports.useEffect(() => {
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.focus();
    const handleKeyDown = (event) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const controls = Array.from(
        dialogRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), video[controls], [tabindex="0"]',
        ),
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialogRef.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    dialog?.addEventListener("keydown", handleKeyDown);
    return () => {
      dialog?.removeEventListener("keydown", handleKeyDown);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: dialog backdrop
    // biome-ignore lint/a11y/noStaticElementInteractions: dialog backdrop
    <div
      className="modal-mask fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="skill-detail-title"
        className="elevated-surface-border flex max-h-[calc(100dvh-2rem)] w-full max-w-[960px] flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pb-3 pt-4">
          <div className="min-w-0">
            <h2 id="skill-detail-title" className="break-words text-2xl font-medium">
              {displayName}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-muted">
                <UserRound size={16} strokeWidth={1.5} />
              </span>
              <span className="break-words">{author}</span>
              {verified && (
                <BadgeCheck
                  size={16}
                  fill="none"
                  strokeWidth={2}
                  className="shrink-0 text-brand-accent"
                  aria-label={t("skills.detail.verifiedCreator")}
                />
              )}
              <span className="ml-3 flex items-center gap-1.5">
                <Download$1 size={14} strokeWidth={1.5} aria-hidden="true" />
                <span className="sr-only">
                  {t("skills.detail.downloadCount")}
                  {": "}
                </span>
                <span>
                  {typeof downloads === "number" && Number.isFinite(downloads)
                    ? formatDownloads(Math.max(0, downloads))
                    : "—"}
                </span>
              </span>
              {version && (
                <span className="ml-3 flex items-center gap-1.5">
                  <span className="sr-only">
                    {t("skills.detail.version")}
                    {": "}
                  </span>
                  <span>v{version}</span>
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-lg"
            onClick={onClose}
            aria-label={t("common.close")}
            data-action-ui-id="skills.detail-close"
          >
            <StrokeIcon icon={X} size={20} />
          </Button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-5">
          <SkillShowcase key={mediaKey} skill={resolved} />
          <SkillStructuredOverview info={resolved.structuredInfo} />
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {local && onToggle && (
              <>
                <Switch
                  checked={local.enabled}
                  onCheckedChange={(enabled) => onToggle(skill.name, enabled)}
                  data-action-ui-id="skills.detail-toggle"
                  aria-label={t("skills.enabled")}
                />
                <span>{local.enabled ? t("skills.enabled") : t("skills.disabled")}</span>
                {local.enabled && (
                  <span className="ml-1 text-muted-foreground/70">
                    {t("skills.detail.readyToUse")}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isInstalled && updateInfo && onUpdate && (
              <Button
                variant="outline"
                disabled={updating}
                onClick={() => onUpdate(skill.name)}
                data-action-ui-id="skill-detail-update"
                className={cn(
                  "gap-1.5 rounded-lg",
                  UPDATE_INDICATOR_STYLES.base,
                  UPDATE_INDICATOR_STYLES.hover,
                )}
              >
                {updating ? (
                  <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
                ) : (
                  <RetryIcon size={14} />
                )}
                {t("skills.market.updateAvailable")}
              </Button>
            )}
            {showSubmit ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      onClick={() => onOpenCreatorPlan?.(skill.name)}
                      data-action-ui-id="skill-detail-submit-to-community"
                      className="gap-1.5 rounded-lg"
                    >
                      <Share2 size={14} strokeWidth={1.5} />
                      {t("skills.detail.submitToCommunity")}
                    </Button>
                  }
                />
                <TooltipContent>{t("skills.detail.submitToCommunityTooltip")}</TooltipContent>
              </Tooltip>
            ) : (
              onShare && (
                <Button
                  variant="outline"
                  onClick={() => onShare(skill.name)}
                  data-action-ui-id="skill-detail-share"
                  className="gap-1.5 rounded-lg"
                >
                  <Share2 size={14} strokeWidth={1.5} />
                  {t("skills.share")}
                </Button>
              )
            )}
            {isInstalled
              ? onTryItOut && (
                  <Button
                    onClick={() => onTryItOut(resolved)}
                    data-action-ui-id="skill-detail-try"
                    className="gap-1.5 rounded-lg"
                  >
                    <MessageSquare size={14} strokeWidth={1.5} />
                    {t("skills.market.tryInChat")}
                  </Button>
                )
              : onInstall && (
                  <Button
                    disabled={installing}
                    onClick={() => onInstall(skill.name)}
                    data-action-ui-id="skill-detail-install"
                    className="gap-1.5 rounded-lg"
                  >
                    {installing ? (
                      <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                    ) : (
                      <Download$1 size={16} strokeWidth={1.5} />
                    )}
                    {installing ? t("skills.market.installing") : t("skills.market.install")}
                  </Button>
                )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
