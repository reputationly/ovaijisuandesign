// 技能页的小部件：同步横幅、标签说明气泡、创作者计划悬浮卡。
import {
  h as useTranslation,
  r as reactExports,
  d5 as Info,
  dl as Loader2,
  it as Popover,
  iu as PopoverTrigger,
  iv as PopoverContent,
} from "../main.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
export function SyncBanner({ syncStatus, showComplete }) {
  const { t } = useTranslation();
  if (!syncStatus) return null;
  if (syncStatus.syncing) {
    return (
      <div
        data-action-ui-id="skills-sync-banner"
        className="flex items-center gap-2 border-b border-primary/20 bg-primary/10 py-2"
      >
        <Loader2 size={14} strokeWidth={1.5} className="animate-spin text-primary" />
        <span className="text-xs text-primary font-medium">
          {t("skills.market.syncProgress", {
            done: syncStatus.progress?.completed ?? 0,
            total: syncStatus.progress?.total ?? 0,
          })}
        </span>
      </div>
    );
  }
  if (showComplete && syncStatus.lastSyncResult) {
    const { installed, updated, failed } = syncStatus.lastSyncResult;
    const hasFailed = failed > 0;
    return (
      <div
        data-action-ui-id="skills-sync-banner"
        className={`flex items-center gap-2 border-b py-2 animate-in fade-in duration-300 ${hasFailed ? "bg-destructive/5 border-destructive/10" : "bg-primary/5 border-primary/10"}`}
      >
        <span className={`text-xs ${hasFailed ? "text-destructive/80" : "text-primary/80"}`}>
          {t("skills.market.syncComplete", {
            installed,
            updated,
          })}
          {hasFailed &&
            ` (${t("skills.market.syncFailed", {
              failed,
            })})`}
        </span>
      </div>
    );
  }
  return null;
}
export function TabInfoPopover({ bodyKey, tabKey }) {
  const { t } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const closeTimer = reactExports.useRef(null);
  const handleOpen = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  };
  const handleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-action-ui-id={`skills-tab-info-${tabKey}`}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground cursor-help outline-none focus-visible:outline-none"
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
      >
        <Info size={14} strokeWidth={2.25} />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="max-w-72 rounded-md p-3 text-xs leading-relaxed"
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
      >
        {t(bodyKey)}
      </PopoverContent>
    </Popover>
  );
}
export function CreatorPlanHoverPopover({ onOpenCreatorPlan }) {
  const { t } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const closeTimer = reactExports.useRef(null);
  const handleOpen = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  };
  const handleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-action-ui-id="market-community-info"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
      >
        <Info size={14} />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="max-w-80 rounded-[4px] p-3 text-xs"
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
      >
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(
            "skills.market.creatorPlanTipBody",
            "做了好用的 skill？申请官方 review，被选中可获积分奖励或加入共创社区。",
          )}{" "}
          <button
            type="button"
            data-action-ui-id="market-community-info-cta"
            onClick={() => onOpenCreatorPlan?.()}
            className="text-foreground underline underline-offset-2 hover:opacity-80 cursor-pointer outline-none focus-visible:outline-none"
          >
            {t("skills.market.creatorPlanApply", "申请审核")}
          </button>
        </p>
      </PopoverContent>
    </Popover>
  );
}
