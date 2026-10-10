// 创作者计划的邀请卡片。
import { useTranslation, Plus } from "../../vendor.js";
import { __jsx } from "../../shared/jsx-runtime.js";
export function CreatorPlanInviteCard({ onOpen }) {
  const { t } = useTranslation();
  return (
    <div
      data-action-ui-id="market-creator-plan-invite"
      className="group h-full overflow-hidden rounded-lg border border-dashed border-brand-accent/50 bg-card transition-colors hover:border-brand-accent"
    >
      <button
        type="button"
        data-action-ui-id="market-creator-plan-invite-cta"
        onClick={onOpen}
        className="flex h-full min-h-[260px] w-full flex-col items-center justify-center gap-2 px-6 py-8 text-center cursor-pointer"
      >
        <Plus size={28} strokeWidth={1.5} className="text-brand-accent" />
        <div className="mt-1 text-base font-semibold text-foreground">
          {t("skills.header.submitSkill", "Submit Skill")}
        </div>
        <p className="line-clamp-2 max-w-[18rem] text-xs text-muted-foreground">
          {t(
            "skills.market.creatorPlanInviteDesc",
            "投稿 Skill，被选中可获 2000 积分或加入共创计划",
          )}
        </p>
      </button>
    </div>
  );
}
