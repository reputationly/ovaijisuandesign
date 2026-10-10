// 技能列表里的卡片：普通技能、精选技能卡与精选区。
import { useTranslation, jsxRuntimeExports, Download$2 as Download, MessageCircle, Loader2, getSkillCoverUrl, Eye$2 as Eye, BadgeCheck } from "../../vendor.js";
import { Switch } from "../../generation/select-content.jsx";
import { cn$2 as cn } from "../../infra/dialog-content.jsx";
import { PageStateBoundary } from "../../assets/page-state-boundary.jsx";
import { toDisplayName, formatDownloads, SkillCoverMedia } from "../../generation/use-mention-models.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
export function OtherSkillItem({ skill, installing, onInstall, onToggle, onDetail, onTryItOut }) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");
  const displayName = isZh
    ? skill.displayNameZh || toDisplayName(skill.name)
    : toDisplayName(skill.name);
  const summary = isZh ? skill.summaryZh || skill.summary : skill.summary;
  const market = skill;
  const downloads = market.downloads;
  const isInstalled = skill.enabled === true || market.installed === true;
  const enabled = skill.enabled;
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: row click opens detail
    // biome-ignore lint/a11y/noStaticElementInteractions: row click handler
    <div
      data-action-ui-id="other-skill-item"
      data-skill-name={skill.name}
      className="group flex min-h-20 cursor-pointer items-center gap-3 rounded-lg bg-card px-4 py-3 transition-shadow duration-200 ease-out hover:ring-[0.5px] hover:ring-inset hover:ring-border-strong focus-within:ring-[0.5px] focus-within:ring-inset focus-within:ring-border-strong"
      onClick={() => onDetail?.(skill)}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="truncate text-[15px] font-medium leading-5 text-foreground">
          {displayName}
        </div>
        {summary && <p className="truncate text-sm leading-5 text-muted-foreground">{summary}</p>}
        {downloads != null && downloads > 0 && (
          <div className="inline-flex items-center gap-1 text-[11px] leading-4 text-muted-foreground">
            <Download size={12} />
            {formatDownloads(downloads)}
          </div>
        )}
      </div>
      <div
        className="relative flex shrink-0 items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {isInstalled ? (
          <>
            {onTryItOut && (
              <button
                type="button"
                data-action-ui-id="other-skill-try"
                className="pointer-events-none absolute right-full z-10 mr-2 inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground opacity-0 transition-[opacity,colors] hover:border-foreground hover:bg-card group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
                onClick={() => onTryItOut(skill)}
              >
                <MessageCircle size={14} strokeWidth={1.5} />
                {t("skills.market.tryInChat", "去对话中试试")}
              </button>
            )}
            {onToggle && (
              <Switch checked={enabled} onCheckedChange={() => onToggle(skill.name, !enabled)} />
            )}
          </>
        ) : (
          onInstall && (
            <button
              type="button"
              data-action-ui-id="other-skill-install"
              disabled={installing}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-foreground/15 bg-transparent px-3 text-xs font-medium text-foreground transition-colors hover:border-foreground hover:bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => onInstall(skill.name)}
            >
              {installing ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  {t("skills.market.installing")}
                </>
              ) : (
                <>
                  <Download size={12} strokeWidth={1.75} />
                  {t("skills.market.install")}
                </>
              )}
            </button>
          )
        )}
      </div>
    </div>
  );
}
function FeaturedSkillCard({ skill, installing, onInstall, onTryItOut, onDetail, onToggle }) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");
  const market = skill;
  const displayName = isZh
    ? skill.displayNameZh || toDisplayName(skill.name)
    : toDisplayName(skill.name);
  const summary = isZh ? skill.summaryZh || skill.summary : skill.summary;
  const author = isZh
    ? market.authorCn || market.authorEn || ""
    : market.authorEn || market.authorCn || "";
  const downloads = market.downloads;
  const cover = getSkillCoverUrl(skill);
  const isInstalled = skill.enabled === true || market.installed === true;
  const showVerified = market.source === "official" || market.source === "official-featured";
  if (!cover) {
    return (
      <div className="min-w-0 self-start">
        <OtherSkillItem
          skill={skill}
          installing={installing}
          onInstall={onInstall}
          onTryItOut={onTryItOut}
          onDetail={onDetail}
          onToggle={onToggle}
        />
      </div>
    );
  }
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: cover/card opens detail
    // biome-ignore lint/a11y/noStaticElementInteractions: card click handler
    <div
      data-action-ui-id="featured-skill-card"
      data-skill-name={skill.name}
      className="group flex h-full flex-col overflow-hidden rounded-lg bg-card transition-shadow duration-200 ease-out hover:ring-[0.5px] hover:ring-inset hover:ring-border-strong cursor-pointer"
      onClick={() => onDetail?.(skill)}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <SkillCoverMedia url={cover} />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex gap-3 p-3 opacity-0 translate-y-2 transition-[opacity,transform] duration-200 ease-out group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0"
          onClick={(e) => e.stopPropagation()}
        >
          {onDetail && (
            <button
              type="button"
              data-action-ui-id="featured-skill-detail"
              className="flex flex-1 items-center justify-center gap-1.5 h-9 rounded-full text-[13px] font-normal whitespace-nowrap bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-colors cursor-pointer"
              onClick={() => onDetail(skill)}
            >
              <Eye size={14} strokeWidth={1.75} />
              {t("skills.viewDetail")}
            </button>
          )}
          {isInstalled
            ? onTryItOut && (
                <button
                  type="button"
                  data-action-ui-id="featured-skill-try"
                  className="flex flex-1 items-center justify-center gap-1.5 h-9 rounded-full text-[13px] font-normal whitespace-nowrap bg-brand-accent text-white hover:opacity-90 transition-opacity cursor-pointer"
                  onClick={() => onTryItOut(skill)}
                >
                  <MessageCircle size={14} strokeWidth={1.75} />
                  {t("skills.market.tryInChat", "去对话中试试")}
                </button>
              )
            : onInstall && (
                <button
                  type="button"
                  data-action-ui-id="featured-skill-install"
                  disabled={installing}
                  className="flex flex-1 items-center justify-center gap-1.5 h-9 rounded-full text-[13px] font-normal whitespace-nowrap bg-brand-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  onClick={() => onInstall(skill.name)}
                >
                  {installing ? (
                    <>
                      <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
                      {t("skills.market.installing")}
                    </>
                  ) : (
                    <>
                      <Download size={14} strokeWidth={1.75} />
                      {t("skills.market.downloadSkill", "下载 Skill")}
                    </>
                  )}
                </button>
              )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="truncate text-base font-medium text-foreground">{displayName}</div>
        {summary && <p className="line-clamp-2 text-sm text-muted-foreground">{summary}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1">
            {author && (
              <span className="inline-flex min-w-0 items-center gap-0.5 text-sm text-foreground/85">
                <span aria-hidden="true">@</span>
                <span className="truncate">{author}</span>
              </span>
            )}
            {author && showVerified && (
              <BadgeCheck
                size={14}
                fill="none"
                strokeWidth={2}
                className="shrink-0 text-brand-accent"
                aria-label={t("skills.market.verifiedOfficial", "Verified by MiniMax Design")}
              />
            )}
          </span>
          {downloads != null && downloads > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1">
              <Download size={12} />
              {formatDownloads(downloads)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
export function FeaturedSkillSection({
  title,
  titleAccessory,
  headerAccessory,
  emptyText,
  skills,
  installingSet,
  onInstall,
  onTryItOut,
  onDetail,
  onToggle,
  dataActionUiId,
  footerCard,
}) {
  return (
    <section data-action-ui-id={dataActionUiId} className="space-y-3">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-base font-heading font-medium text-foreground">
          <span>{title}</span>
          {titleAccessory}
        </div>
        {headerAccessory && <div className="flex items-center gap-2">{headerAccessory}</div>}
      </header>
      {skills.length === 0 && !footerCard ? (
        <PageStateBoundary
          empty={true}
          density="panel"
          className="min-h-40"
          emptyOptions={{
            text: emptyText,
          }}
        /> // Twelve tracks preserve large-card counts (2/3/4) and two-column
      ) : (
        // compact rows without reordering the server's configured skill order.
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-12">
          {skills.map((skill) => (
            <div
              key={skill.name}
              className={cn(
                "min-w-0 sm:col-span-6",
                getSkillCoverUrl(skill) ? "lg:col-span-4 xl:col-span-3" : "self-start",
              )}
            >
              <FeaturedSkillCard
                skill={skill}
                installing={installingSet?.has(skill.name)}
                onInstall={onInstall}
                onTryItOut={onTryItOut}
                onDetail={onDetail}
                onToggle={onToggle}
              />
            </div>
          ))}
          {footerCard && (
            <div className="min-w-0 sm:col-span-6 lg:col-span-4 xl:col-span-3">{footerCard}</div>
          )}
        </div>
      )}
    </section>
  );
}
