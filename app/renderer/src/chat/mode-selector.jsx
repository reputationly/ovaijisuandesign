// mode-selector.jsx
import {
  BellRing,
  Check,
  ChevronDown,
  ChevronRight$1,
  CompositedSvg,
  Hand,
  jsxRuntimeExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useComposerActionsCompact } from "./create-expanded-composer-actions-measurer.jsx";
import { StrokeIcon } from "../workspace/use-prompt-icon.jsx";
import { QuickZoomPresence } from "../canvas/canvas-high-blast-delete-dialog.jsx";
import { CreditReminderSettings } from "../team/credit-reminder-settings.jsx";

function ShieldArrowIcon({ size: size2 = 24, strokeWidth = 2, className }) {
  return (
    <CompositedSvg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      role="img"
    >
      <path d="M20 13C20 18 16.5 20.5 12.34 21.95C12.1222 22.0238 11.8855 22.0202 11.67 21.94C7.5 20.5 4 18 4 13V5.99996C4 5.73474 4.10536 5.48039 4.29289 5.29285C4.48043 5.10532 4.73478 4.99996 5 4.99996C7 4.99996 9.5 3.79996 11.24 2.27996C11.4519 2.09896 11.7214 1.99951 12 1.99951C12.2786 1.99951 12.5481 2.09896 12.76 2.27996C14.51 3.80996 17 4.99996 19 4.99996C19.2652 4.99996 19.5196 5.10532 19.7071 5.29285C19.8946 5.48039 20 5.73474 20 5.99996V13Z" />
      <path d="M8 9L10 11.2222L8 14" />
      <path d="M12 14L16 14" />
    </CompositedSvg>
  );
}

const MODE_OPTIONS = [
  {
    value: "auto",
    icon: ShieldArrowIcon,
    labelKey: "chat.mode.auto",
    descKey: "chat.mode.autoDesc",
  },
  {
    value: "ask",
    icon: Hand,
    labelKey: "chat.mode.ask",
    descKey: "chat.mode.askDesc",
  },
];

export const ModeSelector = reactExports.memo(function ModeSelector2({
  mode: mode2,
  onChange,
  disabled: disabled2 = false,
  creditReminderConfig,
  onCreditReminderConfigChange,
}) {
  const { t: t2 } = useTranslation();
  const actionsCompact = useComposerActionsCompact();
  const [open, setOpen] = reactExports.useState(false);
  const [view2, setView] = reactExports.useState("modes");
  const containerRef = reactExports.useRef(null);
  const creditReminderReady =
    creditReminderConfig !== void 0 && onCreditReminderConfigChange !== void 0;
  const creditReminderAdapter = creditReminderReady
    ? {
        config: creditReminderConfig,
        save: onCreditReminderConfigChange,
      }
    : void 0;
  const handleSelect = reactExports.useCallback(
    (value) => {
      if (disabled2) return;
      onChange(value);
      setOpen(false);
    },
    [disabled2, onChange],
  );
  reactExports.useEffect(() => {
    if (actionsCompact || disabled2) {
      setOpen(false);
      setView("modes");
    }
  }, [actionsCompact, disabled2]);
  reactExports.useEffect(() => {
    if (!creditReminderReady && view2 === "credit-reminder") setView("modes");
  }, [creditReminderReady, view2]);
  reactExports.useEffect(() => {
    if (!open) return;
    const handler = (e2) => {
      if (containerRef.current && !containerRef.current.contains(e2.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  reactExports.useEffect(() => {
    if (!open) return;
    const handler = (e2) => {
      if (e2.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);
  const currentOption =
    MODE_OPTIONS.find((o2) => o2.value === mode2) ?? MODE_OPTIONS[0];
  const handleCreditReminderSave = async (config2) => {
    if (!creditReminderAdapter) return;
    await creditReminderAdapter.save(config2);
  };
  const showCreditReminderSettings =
    view2 === "credit-reminder" && !!creditReminderAdapter;
  const popoverClassName = `elevated-surface-border @container/mode-menu absolute bottom-[calc(100%+6px)] right-0 w-[min(300px,calc(100cqw-2.5rem))] bg-popover rounded-xl shadow-lg p-1.5 z-50 overflow-hidden flex flex-col gap-0.5 [--dp-quick-zoom-origin:bottom_right] dp-motion-quick-zoom`;
  const modeMenuContent = (
    <>
      <div className="px-2.5 pt-1 pb-0.5 text-[10px] font-normal text-muted-foreground uppercase tracking-wider">
        {t2("chat.mode.label", "Agent Mode")}
      </div>
      {MODE_OPTIONS.map((option2) => {
        const OptionIcon = option2.icon;
        const isActive2 = option2.value === mode2;
        return (
          <button
            key={option2.value}
            type="button"
            role="menuitemradio"
            aria-checked={isActive2}
            className="list-row-hit-area [--list-row-gap:2px] first:before:top-0 [&:has(+div)]:before:bottom-0 last:before:bottom-0 w-full flex items-start gap-2.5 px-2.5 py-2 text-left cursor-pointer text-foreground rounded-md transition-colors duration-100 hover:bg-popup-item-hover @max-[220px]/mode-menu:items-center"
            onClick={() => handleSelect(option2.value)}
            data-action-ui-id={`chat-mode-option-${option2.value}`}
          >
            <span className="flex-shrink-0 mt-0.5 text-foreground @max-[220px]/mode-menu:mt-0">
              <StrokeIcon icon={OptionIcon} size={16} />
            </span>
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="min-w-0 truncate whitespace-nowrap text-[13px] font-heading font-normal text-foreground">
                {t2(option2.labelKey, option2.value)}
              </span>
              <span className="line-clamp-2 text-[12px] text-muted-foreground leading-snug @max-[220px]/mode-menu:hidden">
                {t2(option2.descKey)}
              </span>
            </div>
            {isActive2 && (
              <StrokeIcon
                icon={Check}
                size={14}
                className="flex-shrink-0 self-center text-foreground"
              />
            )}
          </button>
        );
      })}
      {creditReminderAdapter && (
        <>
          <div className="mx-2 my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            className="list-row-hit-area flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-foreground/70 transition-colors duration-100 hover:bg-popup-item-hover hover:text-foreground"
            onClick={() => setView("credit-reminder")}
            data-action-ui-id="chat-credit-reminder-settings.open"
          >
            <StrokeIcon icon={BellRing} size={16} />
            <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[13px]">
              {t2("chat.creditReminder.settingsTitle", "Credit usage reminder")}
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground @max-[260px]/mode-menu:hidden">
              {creditReminderAdapter.config.enabled
                ? creditReminderAdapter.config.threshold.toLocaleString()
                : t2("chat.creditReminder.disabled", "Off")}
            </span>
            <StrokeIcon
              icon={ChevronRight$1}
              size={14}
              className="text-muted-foreground"
            />
          </button>
        </>
      )}
    </>
  );
  return (
    <div ref={containerRef} data-composer-optional={true} className="relative">
      <button
        type="button"
        data-action-ui-id="chat-mode-selector"
        className={`inline-flex items-center gap-0.5 h-8 pl-2 pr-1 whitespace-nowrap rounded-full bg-transparent border-none text-[length:var(--home-input-toolbar-font-size)] tracking-[var(--tracking-toolbar)] cursor-pointer transition-colors duration-75 ${open ? "bg-foreground/8" : "hover:bg-[var(--message-input-control-hover)]"} text-foreground/70 hover:text-foreground`}
        onClick={() => {
          if (!disabled2) {
            setOpen((prev) => !prev);
            setView("modes");
          }
        }}
        disabled={disabled2}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t2(currentOption.labelKey, currentOption.value)}
      >
        <span>{t2(currentOption.labelKey, currentOption.value)}</span>
        <StrokeIcon
          icon={ChevronDown}
          size={16}
          className={`text-muted-foreground transition-transform duration-150 group-data-[actions-compact=true]/composer:hidden ${open ? "rotate-180" : ""}`}
        />
      </button>
      <QuickZoomPresence value={open ? showCreditReminderSettings : null}>
        {(showSettings, motionProps) =>
          showSettings && creditReminderAdapter ? (
            <div
              {...motionProps}
              className={popoverClassName}
              role="dialog"
              aria-labelledby="chat-credit-reminder-settings-title"
            >
              <div className="p-1.5">
                <CreditReminderSettings
                  config={creditReminderAdapter.config}
                  onBack={() => setView("modes")}
                  onSave={handleCreditReminderSave}
                />
              </div>
            </div>
          ) : (
            <div
              {...motionProps}
              className={popoverClassName}
              role="menu"
              aria-label={t2("chat.mode.label", "Agent Mode")}
            >
              {modeMenuContent}
            </div>
          )
        }
      </QuickZoomPresence>
    </div>
  );
});

ModeSelector.displayName = "ModeSelector";
