// canvas-help-button.jsx
import {
  ChevronRight$1,
  Keyboard,
  Lightbulb,
  reactExports,
  usePlatform,
  useTranslation,
} from "../vendor.js";
import {
  DropdownMenu,
  getTutorialUrlByLocale,
  openExternalUrl,
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useFeedback } from "./use-direct-feedback.jsx";
import { CircleHelp, MessageSquarePlus } from "../media-editing/package.jsx";
import { ShortcutsPanel } from "../workspace/shortcut-categories.jsx";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import { FeedbackIcon } from "../workspace/home-service.jsx";

export function CanvasHelpButton({
  menuOpen: controlledMenuOpen,
  onMenuOpenChange,
  variant = "floating",
}) {
  const { t: t2, i18n } = useTranslation();
  const platform2 = usePlatform();
  const { openFeedback } = useFeedback();
  const [shortcutsOpen, setShortcutsOpen] = reactExports.useState(false);
  const [uncontrolledMenuOpen, setUncontrolledMenuOpen] =
    reactExports.useState(false);
  const menuOpen = controlledMenuOpen ?? uncontrolledMenuOpen;
  const handleMenuOpenChange = (open) => {
    if (controlledMenuOpen === void 0) setUncontrolledMenuOpen(open);
    onMenuOpenChange?.(open);
  };
  const handleTutorial = () => {
    void openExternalUrl(platform2, getTutorialUrlByLocale(i18n.language), {
      source: "canvas.help.tutorial",
    });
  };
  const handleFeedback = () => {
    openFeedback({
      source: "canvas_help",
    });
  };
  const handleFeatureRequest = () => {
    openFeedback({
      source: "canvas_help",
      category: "feature_request",
    });
  };
  const helpLabel = t2("canvas.help.tooltip", {
    defaultValue: "帮助指南",
  });
  const helpTrigger = (
    <DropdownMenuTrigger
      className={
        variant === "toolbar"
          ? `pointer-events-auto inline-flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring ${menuOpen ? "bg-[var(--canvas-controls-active)] text-[var(--canvas-controls-text)]" : "text-[var(--canvas-controls-text-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"}`
          : "pointer-events-auto inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-background opacity-70 transition-colors [border-width:var(--divider-width)] hover:border-foreground/80 hover:bg-muted/60 hover:opacity-100 focus:outline-none"
      }
      data-canvas-control-kind={variant === "toolbar" ? "panel" : void 0}
      aria-expanded={variant === "toolbar" ? menuOpen : void 0}
      aria-label={helpLabel}
      data-action-ui-id="canvas.help.trigger"
    >
      <CircleHelp
        size={variant === "toolbar" ? 18 : 16}
        strokeWidth={1.5}
        aria-hidden="true"
      />
    </DropdownMenuTrigger>
  );
  return (
    <div>
      <DropdownMenu open={menuOpen} onOpenChange={handleMenuOpenChange}>
        <Tooltip>
          <TooltipTrigger render={helpTrigger} />
          <TooltipContent side={variant === "toolbar" ? "top" : "left"}>
            {helpLabel}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          align={variant === "toolbar" ? "start" : "end"}
          side="top"
          sideOffset={variant === "toolbar" ? 8 : 4}
          className="min-w-[180px] p-1.5"
          style={{
            backgroundColor: "var(--canvas-controls-bg)",
            color: "var(--canvas-controls-text)",
            border: "var(--divider-width) solid var(--canvas-controls-border)",
            boxShadow: "var(--canvas-shadow-menu)",
          }}
        >
          <DropdownMenuItem
            onClick={handleTutorial}
            data-action-ui-id="canvas.help.tutorial"
            className="justify-between gap-2.5 py-2 pr-2 text-[13px] font-normal rounded-md hover:bg-foreground/[0.03] focus:bg-foreground/[0.03]"
          >
            <span className="flex items-center gap-2">
              <Lightbulb size={16} strokeWidth={1.5} />
              {t2("canvas.help.tutorial")}
            </span>
            <ChevronRight$1
              size={14}
              strokeWidth={1.5}
              className="text-muted-foreground"
            />
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleFeedback}
            data-action-ui-id="canvas.help.feedback"
            className="justify-between gap-2.5 py-2 pr-2 text-[13px] font-normal rounded-md hover:bg-foreground/[0.03] focus:bg-foreground/[0.03]"
          >
            <span className="flex items-center gap-2">
              <FeedbackIcon size={16} />
              {t2("canvas.help.feedback")}
            </span>
            <ChevronRight$1
              size={14}
              strokeWidth={1.5}
              className="text-muted-foreground"
            />
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleFeatureRequest}
            data-action-ui-id="canvas.help.featureRequest"
            className="justify-between gap-2.5 py-2 pr-2 text-[13px] font-normal rounded-md hover:bg-foreground/[0.03] focus:bg-foreground/[0.03]"
          >
            <span className="flex items-center gap-2">
              <MessageSquarePlus size={16} strokeWidth={1.5} />
              {t2("canvas.help.featureRequest")}
            </span>
            <ChevronRight$1
              size={14}
              strokeWidth={1.5}
              className="text-muted-foreground"
            />
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShortcutsOpen(true)}
            data-action-ui-id="canvas.help.shortcuts"
            className="justify-between gap-2.5 py-2 pr-2 text-[13px] font-normal rounded-md hover:bg-foreground/[0.03] focus:bg-foreground/[0.03]"
          >
            <span className="flex items-center gap-2">
              <Keyboard size={16} strokeWidth={1.5} />
              {t2("canvas.help.shortcuts")}
            </span>
            <ChevronRight$1
              size={14}
              strokeWidth={1.5}
              className="text-muted-foreground"
            />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ShortcutsPanel open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
