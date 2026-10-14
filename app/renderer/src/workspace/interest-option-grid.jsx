// interest-option-grid.jsx
import { useTranslation } from "react-i18next";
import { Film, GraduationCap, Music } from "../media-editing/lucide-icon-wraps.js";
import {
  Brush,
  Clapperboard,
  Megaphone,
  ShoppingBag,
  Sparkles,
} from "../media-editing/package.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Checkbox } from "../infra/checkbox.jsx";
import { mergeTailwindClasses as cn } from "../infra/dialog-content.jsx";
const INTEREST_OPTIONS = [
  {
    key: "shortDrama",
    icon: Film,
  },
  {
    key: "filmEdit",
    icon: Clapperboard,
  },
  {
    key: "ecommerce",
    icon: ShoppingBag,
  },
  {
    key: "adsMarketing",
    icon: Megaphone,
  },
  {
    key: "mvMusic",
    icon: Music,
  },
  {
    key: "animation",
    icon: Brush,
  },
  {
    key: "knowledge",
    icon: GraduationCap,
  },
  {
    key: "other",
    icon: Sparkles,
  },
];
export const MAX_INTERESTS = 3;
export function InterestOptionGrid({ value, onToggle }) {
  const { t: translate } = useTranslation();
  const reachedLimit = value.length >= MAX_INTERESTS;
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {INTEREST_OPTIONS.map(({ key, icon: Icon }) => {
        const selected = value.includes(key);
        const disabled = !selected && reachedLimit;
        return (
          // biome-ignore lint/a11y/noLabelWithoutControl: shared Checkbox renders the associated native input inside this label.
          <label
            key={key}
            data-action-ui-id={`interestSelection.option.${key}`}
            className={cn(
              // 基础:左对齐 icon + 文字,gap-2,brutalist 圆角,过渡只走 colors
              "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border-[1.5px] px-3 text-left text-sm font-medium transition-colors",
              // 默认(未选中):弱黑细边 + 卡片底,hover 加深边色
              !selected && [
                "border-foreground/15 bg-card text-foreground",
                "hover:border-foreground/30",
              ],
              // 选中态:反色激活(global.md 红线 5,激活优先反色)
              selected &&
                "border-brutalist-border bg-foreground text-background",
              // 已达上限且未选中:disabled 视觉
              disabled &&
                "cursor-not-allowed text-muted-foreground hover:border-foreground/15",
            )}
          >
            <Icon
              size={16}
              strokeWidth={1}
              className="shrink-0"
              aria-hidden={true}
            />
            <span className="flex-1 truncate">
              {translate(`interestSelection.option.${key}`)}
            </span>
            <Checkbox
              size="sm"
              shape="circle"
              checked={selected}
              disabled={disabled}
              onCheckedChange={() => onToggle(key)}
              aria-label={translate(`interestSelection.option.${key}`)}
            />
          </label>
        );
      })}
    </div>
  );
}
