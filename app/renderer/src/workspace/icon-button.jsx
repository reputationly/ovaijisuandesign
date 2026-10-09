// icon-button.jsx
import {
  Icon,
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { TooltipContent } from "../infra/dialog-content.jsx";
import { Globe } from "../vendor.js";

export function BrowserTabIcon({ tab: tab2 }) {
  return (
    <span className="relative flex size-5 shrink-0 items-center justify-center">
      {tab2.faviconUrl ? (
        <img src={tab2.faviconUrl} alt="" className="size-4 object-contain" />
      ) : (
        <Icon icon={Globe} size="sm" />
      )}
    </span>
  );
}

export function IconButton({
  buttonRef,
  actionId,
  label,
  active: active2,
  disabled: disabled2,
  onClick,
  children: children2,
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
        <button
          type="button"
          ref={buttonRef}
          {...(actionId
            ? {
                "data-action-ui-id": actionId,
              }
            : {})}
          aria-label={label}
          disabled={disabled2}
          onClick={onClick}
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 ${active2 ? "bg-foreground/10 text-foreground" : ""}`}
        >
          {children2}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
