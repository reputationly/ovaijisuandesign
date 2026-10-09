// tutorial-button.jsx
import { ArrowUpRight, Bot, usePlatform } from "../vendor.js";
import { Icon, openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button$1, cn$2 } from "../infra/dialog-content.jsx";

export function isZhLocale(locale) {
  return Boolean(locale?.toLowerCase().startsWith("zh"));
}

const feishuIcon =
  "data:image/webp;base64,UklGRsoFAABXRUJQVlA4IL4FAADQIQCdASqAAIAAPlEijkQjoiGXS90IOAUEoA1IoufwGpaeD/KfpBuPfA3M7IB6zv4vnw9QH519Bz/VdSPzFfth+x3vVeh7/d+oB/gOod9ADy3PZN/cr0qtVJ8x9l+PrGIW53VGZGqgGo+QCjA9l/o3IaO9FcWQoir3pqotbIgUQCNPAI0iR/RBibJbQpC4rAs2GKG98nD5BKkrooK2rKKCZaX/WesrxdvrfhDTa7D8TzCQQtn0esCpl1gF+6cok8IUPhtLv9cBcno7PmoE/qTBbykBEgsw9RPFbgb4untmD7jm9SM/m3NHRknw6OGmRPf55jUhdDH11cwN6GpaXm8u11gekVb058KZNnj97Knd9WZvDu4e2gAA/v3AgACXucPEd1TggozyAZjWGZWva9XWwIeWjQAFCRnQZZI5Bnjb0KaFISpIkLLXnZoxk+bmRod/jz9tDyFF49zg783PYx/UCUZJGgODvEjkA5dQF36ePOSHdJWeH1qgBei1cBMHk/8i1XQXCVn7EMo0hZbz9VOrqUgfWDQjo0uT5ZbN/W5scxNyWGNOIE+9+Qwoqbcuv76C4EuT1tV2/FFyIdfNc2kXnTq/dLTStxNdzWti0stbGXb1T0VQp8r9I792ynK2W/b/kuoLq/X/Jk8GVuTXc8bN1bhucgHFFPnKy3hACT8rYRtcZG4nzhS+Y5M2ze7ov3A6wQyOdAz3ROXd9PyZBGw5A5Gm7AnKcF1VEKr/bkiMvxn62fLX/qHxnvifn0jX3kSqZ5v4aMcfmNrrGCgxYJtRbj6PYYHK0EOWAzM9SMEnHtKFQ+4sNgM7rlkfzPwYSF5+lNvFkI7YLfw5OdGp5qOoa85na1arm+MR2Nd++08781jPzpaQuS5Xe3v6f9vL1K1B1ryfamT8BI+m0U4hpdOhcR9ueaehbkVvn/mjT5aGe7/TmgQrjEGm6u345YYWpxKNXp8zed293bo4rP2WIu58+GJNEwWkj90OJuu0p14n3JaZmalHpuJELvTQBu2O3izALVtWCmi/SRHxwsRZ/8OkxlE529rbrMTpmnd1R943daUOjsS5Jja2ohtFvZyMuTLS4TQTG95Npcg8TjPlRO7h6Ra+/GLOuDCLR9Kr1wOEFMErBu0eTV5XKAZIDgl8hy+h8At9N4NRv6hGMJj9Ky5ef1SQpRfSuF4q8t+maffydOSauSpAImieeuvAG8K0gNCHfENqofiD5/9nEciggfkTF7F35ZxICyu5WnTwUSSnPPoxhStM9qPg4px2xUty4MoX3N0ScbWU8+2Pn2/mnd0ZL++LSiOVhAxTH14Se7vnu6wnM8aPYuXVooqf4PSreI6jYfWWz5iKM9mPRej90+m55hXlQzRjSk5/7+Z8/eIrYXGFA4sasZs/1gBlemkqgCzTQwnOcLopD4qQj+aSS/lLG9hkAGcLqkUuusi77VhLmnnNuYhyAsVUj8QgbLcB5qDWOkue4AWy28aLRFeWsULAUVmftgvbQvQDrzK+z9TnxRZLkM1spsG/eVs65JHXxofZNwbkfr7m0s/0LUvLLWTeX7i6aDq+A3qiz/fU9vIVVAM5+Hz2KQqGjkvpHZy/aPg8IcWTv7wbasDwJS+L9rho4KHO4GuGP/sZJ4DMD8q6ea8fIqXnQQlQ3ScwQOAk17KB4Xorn97NMELN5095uoeRuIlJ+qNqBBtHpbwqejY10GuPhq4Dd39T5XdIwHrX2Bk1WNZXNbgVtAIXATTOVHq4lc4j4Pw5uOocI2StirMSmxS1oPmXl8tDVVZly3+Lp9+FbvPd5/aB+6+HAE4jjbzN/Ye7CCNLKHFlJwLzk4bFZ00OZEzsger1GsUsOC0tai8/dz5cptvQA8AwAA0xvuBejvdtP+udqb9QO82oh0ljrYw/Cd7z8FNF9lyXOEkoEP2JxAUxsrAdxAhdKFJnSI5pOVZGNn7pQqvnTZYAAAA=";

const wechatIcon =
  "data:image/webp;base64,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";

const PLATFORM_ICON_SRC = {
  feishu: feishuIcon,
  wechat: wechatIcon,
};

export function PlatformIcon({ platform: platform2, label, className }) {
  const iconSrc = PLATFORM_ICON_SRC[platform2];
  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt=""
        aria-hidden="true"
        className={cn$2("size-4 shrink-0 object-contain", className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn$2(
        "flex size-4 shrink-0 items-center justify-center rounded-sm bg-secondary text-[10px] font-medium text-muted-foreground",
        className,
      )}
    >
      {label.trim().charAt(0).toUpperCase()}
    </span>
  );
}

const TUTORIAL_URL$1 = {
  wechat: "https://my.feishu.cn/wiki/UqkAwo1tMi050hkDlnic4a1Tntf",
  feishu: "https://my.feishu.cn/wiki/OAmLwbUOsiGOfSk8sB8c3klinPd",
};

export function AgentEntityChip({
  name: name2,
  size: size2 = "default",
  className,
}) {
  return (
    <span
      className={cn$2(
        "inline-flex min-w-0 max-w-[220px] items-center rounded-full border font-medium",
        "border-brand-accent/20 bg-brand-accent/10 text-brand-accent",
        size2 === "lg"
          ? "max-w-[260px] gap-1.5 px-3 py-1 text-[15px]"
          : "gap-1 px-2.5 py-1 text-[13px]",
        className,
      )}
    >
      <Icon
        icon={Bot}
        size={size2 === "lg" ? "md" : "sm"}
        strokeWidth={2}
        className="shrink-0"
      />
      <span className="truncate">{name2}</span>
    </span>
  );
}

export function addFlowTitleClassName(isChineseLocale2) {
  return cn$2(
    "max-w-full break-words text-center font-heading text-[20px] font-medium leading-tight text-foreground",
    isChineseLocale2 && "tracking-[0.03em]",
  );
}

export function TutorialButton({
  platform: platform2,
  actionId,
  label,
  variant,
  size: size2 = "sm",
  className,
}) {
  const shellPlatform = usePlatform();
  const tutorialUrl = TUTORIAL_URL$1[platform2];
  if (!tutorialUrl) return null;
  return (
    <Button$1
      type="button"
      variant={variant}
      size={size2}
      className={cn$2(
        "gap-1",
        variant === "ghost" && "text-brand-accent hover:text-brand-accent",
        className,
      )}
      onClick={() => {
        void openExternalUrl(shellPlatform, tutorialUrl, {
          source: "im-bridge.tutorial",
        });
      }}
      data-action-ui-id={actionId}
    >
      {label}
      <Icon icon={ArrowUpRight} size="sm" strokeWidth={2} />
    </Button$1>
  );
}
