// busy-tip-indicator.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useChatTips } from "./use-copy.jsx";
import { BrailleSpinner } from "./chat-empty-state.jsx";

export const BusyTipIndicator = reactExports.memo(function BusyTipIndicator2({
  label,
}) {
  const { t: t2 } = useTranslation();
  const tip = useChatTips(true);
  return (
    <div
      data-action-ui-id="chat-busy-tip"
      className="flex h-10 shrink-0 items-start gap-2 overflow-hidden text-body-13 text-muted-foreground"
    >
      <BrailleSpinner
        type="dna"
        className="mt-px shrink-0 text-sm text-muted-foreground"
      />
      <span
        key={label ?? tip ?? "thinking"}
        data-action-ui-id="chat-busy-tip-text"
        className="line-clamp-2 min-w-0 flex-1 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300"
      >
        <span className="text-shimmer text-muted-foreground">
          {label ??
            (tip
              ? t2("chat.tipLabel", {
                  tip,
                })
              : t2("chat.thinking"))}
        </span>
      </span>
    </div>
  );
});

BusyTipIndicator.displayName = "BusyTipIndicator";
