// mode-selector.jsx
import { jsxRuntimeExports, reactExports, useTranslation, dedupedToast, useStorage, CompositedSvg, Hand, Check, BellRing, ChevronRight$1, ChevronDown, useQuery, API_PATHS, usePlatform, X$7, Trans } from "../vendor.js";
import { gatewayFetch } from "../infra/agent-ws-client.jsx";
import { useAuth } from "../assets/apply-asset-change.jsx";
import { openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { Sparkles } from "../media-editing/parse-item.jsx";
import { parseFeaturedSkill } from "../workspace/parse-prompt-item.js";
import { DEFAULT_SCENE_IDS, SCENE_CATEGORIES, DEFAULT_SCENE_ARTWORKS, DEFAULT_HOME_FEATURED_SKILLS, HOME_QUICK_START_SCHEMA_VERSION, configIdentifier, parseLocalizedText, uniqueBy, HOME_QUICK_START_MAX_ITEMS_PER_SECTION, normalizeConfiguredAssetUrl } from "../workspace/scene-categories.js";
import { RecoveringChildrenContext, PENDING_AUTO_UPDATE_KEY, featuredSkillArtwork } from "../generation/use-mention-models.jsx";
import { useRuntimeConfig } from "../generation/use-resizable-width.js";
import { useComposerActionsCompact } from "./mention-popover.jsx";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  cn$2,
} from "../infra/use-browser-overlay-dialog-props.jsx";
import { StrokeIcon, SkillIcon } from "../workspace/browser-inspiration-urls.jsx";
import { QuickZoomPresence } from "../canvas/canvas-toggle-icon.jsx";
import { CreditReminderSettings } from "../team/billing-model-display-labels.jsx";
import { useGatewayReady } from "../infra/hub-logo.jsx";
import { useMpSubscriptionWalletQuery, useMpSubscribeUrl } from "../team/use-credit-details.jsx";
import { isAnnualMember } from "../team/team-credit-summary-surface.jsx";
import { useWorkspaceWSConnection } from "../settings/compact-rewrite-flow.jsx";
import { getMediaUsageGuidelinesUrl } from "../workspace/shortcut-categories.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { MessageInputBase } from "./message-input-base.jsx";
export const MessageInput = reactExports.memo(MessageInputBase);
MessageInput.displayName = "MessageInput";
function AttachmentFaceNoticeDialog({ open, confirming, onOpenChange, onConfirm }) {
  const { t: t2 } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        data-action-ui-id="attachment-face-notice.dialog"
        className="max-h-[60vh] !max-w-[calc(100%-2rem)] gap-4 p-4 text-xs/relaxed sm:!max-w-2xl"
      >
        <AlertDialogHeader className="min-h-0 place-items-stretch gap-4 text-left">
          <AlertDialogTitle className="font-heading text-sm font-medium">
            {t2("attachmentFaceNotice.title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="scrollbar-fade max-h-[calc(60vh-8rem)] overflow-y-auto overscroll-none whitespace-pre-line pr-2 text-left text-wrap text-xs/relaxed text-muted-foreground [contain:paint] [scrollbar-gutter:stable] [will-change:scroll-position]">
            {t2("attachmentFaceNotice.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            type="button"
            disabled={confirming}
            data-action-ui-id="attachment-face-notice.cancel"
          >
            {t2("attachmentFaceNotice.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            loading={confirming}
            onClick={onConfirm}
            data-action-ui-id="attachment-face-notice.confirm"
          >
            {t2("attachmentFaceNotice.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function useAttachmentFaceNoticeGate(openFilePicker) {
  const [config2, , setConfigAsync, hydrated] = useStorage("global.config");
  const [dialogOpen, setDialogOpen] = reactExports.useState(false);
  const [confirming, setConfirming] = reactExports.useState(false);
  const pendingRequestRef = reactExports.useRef(false);
  const confirmingRef = reactExports.useRef(false);
  const requestAttachmentPicker = reactExports.useCallback(() => {
    if (config2.attachmentFaceNoticeAccepted) {
      openFilePicker();
      return;
    }
    pendingRequestRef.current = true;
    if (hydrated) setDialogOpen(true);
  }, [config2.attachmentFaceNoticeAccepted, hydrated, openFilePicker]);
  reactExports.useEffect(() => {
    if (!hydrated || !pendingRequestRef.current || dialogOpen) return;
    if (config2.attachmentFaceNoticeAccepted) {
      pendingRequestRef.current = false;
      openFilePicker();
      return;
    }
    setDialogOpen(true);
  }, [config2.attachmentFaceNoticeAccepted, dialogOpen, hydrated, openFilePicker]);
  const handleOpenChange = reactExports.useCallback((open) => {
    if (!open) pendingRequestRef.current = false;
    setDialogOpen(open);
  }, []);
  const handleConfirm = reactExports.useCallback(async () => {
    if (confirmingRef.current || !pendingRequestRef.current) return;
    confirmingRef.current = true;
    setConfirming(true);
    const persisted = await setConfigAsync((current2) => ({
      ...current2,
      attachmentFaceNoticeAccepted: true,
    }));
    if (persisted && pendingRequestRef.current) {
      pendingRequestRef.current = false;
      setDialogOpen(false);
      openFilePicker();
    }
    confirmingRef.current = false;
    setConfirming(false);
  }, [openFilePicker, setConfigAsync]);
  return {
    requestAttachmentPicker,
    attachmentFaceNoticeDialog: (
      <AttachmentFaceNoticeDialog
        open={dialogOpen}
        confirming={confirming}
        onOpenChange={handleOpenChange}
        onConfirm={() => void handleConfirm()}
      />
    ),
  };
}
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
  const currentOption = MODE_OPTIONS.find((o2) => o2.value === mode2) ?? MODE_OPTIONS[0];
  const handleCreditReminderSave = async (config2) => {
    if (!creditReminderAdapter) return;
    await creditReminderAdapter.save(config2);
  };
  const showCreditReminderSettings = view2 === "credit-reminder" && !!creditReminderAdapter;
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
            <StrokeIcon icon={ChevronRight$1} size={14} className="text-muted-foreground" />
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
function isBillingPromotionActive(promotion, nowMs = Date.now()) {
  if (!promotion) return false;
  return (
    Number.isFinite(promotion.startTime) &&
    Number.isFinite(promotion.endTime) &&
    nowMs >= promotion.startTime &&
    nowMs <= promotion.endTime
  );
}
const EMPTY = {
  promotion: null,
  models: [],
};
function normalize(raw2) {
  if (!raw2 || typeof raw2 !== "object") return EMPTY;
  const obj = raw2;
  return {
    promotion: obj.promotion ?? null,
    models: Array.isArray(obj.models) ? obj.models : [],
  };
}
function useBillingPromotion() {
  const gatewayReady = useGatewayReady();
  const { user, isLoggedIn, isLoading } = useAuth();
  const { data: data2 } = useQuery({
    queryKey: ["billing-promotion"],
    queryFn: async () => {
      try {
        const res = await gatewayFetch(API_PATHS.billingPromotion);
        if (!res.ok) return EMPTY;
        return normalize(await res.json());
      } catch {
        return EMPTY;
      }
    },
    enabled: gatewayReady && !isLoading && isLoggedIn && !!user?.userID,
    staleTime: 6e4,
    retry: false,
  });
  return data2?.promotion ?? null;
}
function readDismissedUntil(key2) {
  try {
    const raw2 = window.localStorage.getItem(key2);
    if (!raw2) return 0;
    const n2 = Number(raw2);
    return Number.isFinite(n2) ? n2 : 0;
  } catch {
    return 0;
  }
}
function writeDismissedUntil(key2, untilMs) {
  try {
    window.localStorage.setItem(key2, String(untilMs));
  } catch {}
}
function usePromotionGate(keyPrefix) {
  const promotion = useBillingPromotion();
  const [, setDismissTick] = reactExports.useState(0);
  const dismiss = reactExports.useCallback(() => {
    if (!promotion) return;
    const muteMs = promotion.muteRangeTime > 0 ? promotion.muteRangeTime : 0;
    writeDismissedUntil(`${keyPrefix}${promotion.activityID}`, Date.now() + muteMs);
    setDismissTick((n2) => n2 + 1);
  }, [promotion, keyPrefix]);
  if (!promotion)
    return {
      promotion: null,
      dismiss,
    };
  const now2 = Date.now();
  if (!isBillingPromotionActive(promotion, now2))
    return {
      promotion: null,
      dismiss,
    };
  const dismissedUntil = readDismissedUntil(`${keyPrefix}${promotion.activityID}`);
  if (now2 < dismissedUntil)
    return {
      promotion: null,
      dismiss,
    };
  return {
    promotion,
    dismiss,
  };
}
const BANNER_KEY_PREFIX = "hilo:promo-banner:dismissed-until:";
function usePromoBanner() {
  const gate = usePromotionGate(BANNER_KEY_PREFIX);
  const { mpWallet, isLoading, isError, isRefetchError } = useMpSubscriptionWalletQuery();
  const subscriptionStateKnown =
    mpWallet?.subscription_state_known === true && !isLoading && !isError && !isRefetchError;
  if (!subscriptionStateKnown || isAnnualMember(mpWallet)) {
    return {
      ...gate,
      promotion: null,
    };
  }
  return gate;
}
export function PromoBanner() {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const subscribeUrl = useMpSubscribeUrl();
  const { promotion, dismiss } = usePromoBanner();
  const handleJump = reactExports.useCallback(() => {
    if (!subscribeUrl) {
      dedupedToast.error(t2("credits.walletUrlNotReady"));
      return;
    }
    void openExternalUrl(platform2, subscribeUrl, {
      source: "promo.banner.subscribe",
    });
  }, [platform2, subscribeUrl, t2]);
  if (!promotion) return null;
  return (
    // biome-ignore lint/a11y/useSemanticElements: can't use a native <button> here — it contains a nested close <button>, which is invalid HTML. role="button" + keyboard handler keeps it accessible.
    <div
      role="button"
      tabIndex={0}
      onClick={handleJump}
      onKeyDown={(e2) => {
        if (e2.key === "Enter" || e2.key === " ") {
          e2.preventDefault();
          handleJump();
        }
      }}
      className="-mb-3 flex cursor-pointer items-center gap-2.5 rounded-t-lg bg-foreground/[0.04] px-3 pb-5 pt-2.5"
      data-action-ui-id="promo-banner"
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-accent">
        <Sparkles size={14} strokeWidth={1.5} className="text-white" fill="currentColor" />
      </span>
      <span
        className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground"
        title={promotion.toastTitle}
      >
        {promotion.toastTitle}
      </span>
      <button
        type="button"
        onClick={(e2) => {
          e2.stopPropagation();
          dismiss();
        }}
        data-action-ui-id="promo-banner-close"
        aria-label={t2("promoBanner.close", "Dismiss")}
        className="shrink-0 cursor-pointer rounded-sm p-0.5 text-muted-foreground transition-colors duration-150 hover:bg-foreground/10 hover:text-foreground"
      >
        <X$7 size={16} strokeWidth={1} />
      </button>
    </div>
  );
}
export function useActiveBillingPromotion() {
  const promotion = useBillingPromotion();
  return isBillingPromotionActive(promotion) ? promotion : null;
}
export function resolveChatReadiness(status, runtimeUnavailable) {
  if (runtimeUnavailable) return "runtime_unavailable";
  if (status.state !== "bound") return "starting";
  return status.readiness?.chat ?? "ready";
}
export function chatReadinessBlocksInput(readiness) {
  return readiness !== "ready";
}
const ChatReadinessContext = reactExports.createContext("ready");
export const ChatReadinessProvider = ChatReadinessContext.Provider;
export function useChatReadiness() {
  return reactExports.useContext(ChatReadinessContext);
}
export function useIsChildRecovering(childSessionId) {
  const recovering = reactExports.useContext(RecoveringChildrenContext);
  return childSessionId ? recovering.has(childSessionId) : false;
}
export function useSkillReloadNotification(hasActiveSession) {
  const { subscribe: subscribe2 } = useWorkspaceWSConnection();
  const [pendingSkills, setPendingSkills] = reactExports.useState(null);
  reactExports.useEffect(() => {
    return subscribe2((msg) => {
      if (msg.type !== "skills_reload") return;
      const payload = msg;
      const names = payload.unloadedSkills ?? [];
      if (names.length === 0) return;
      if (payload.autoUpdate) {
        const pending2 = {
          updatedCount: names.length,
          updatedSkills: names,
          timestamp: Date.now(),
        };
        try {
          sessionStorage.setItem(PENDING_AUTO_UPDATE_KEY, JSON.stringify(pending2));
        } catch {}
        return;
      }
      if (!hasActiveSession) {
        window.hilo.opencode.restart().catch((e2) => console.error("OpenCode restart failed:", e2));
      } else {
        setPendingSkills(names);
      }
    });
  }, [subscribe2, hasActiveSession]);
  const reload = reactExports.useCallback(() => {
    window.hilo.opencode.restart().catch((e2) => console.error("OpenCode restart failed:", e2));
    setPendingSkills(null);
  }, []);
  const dismiss = reactExports.useCallback(() => setPendingSkills(null), []);
  return {
    pendingSkills,
    reload,
    dismiss,
  };
}
export function ChatComplianceNotice() {
  const { i18n, t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const { channel, region } = useRuntimeConfig();
  const guidelinesUrl = getMediaUsageGuidelinesUrl(region, channel);
  const handleGuidelinesClick = reactExports.useCallback(
    (event) => {
      event.preventDefault();
      void openExternalUrl(platform2, guidelinesUrl, {
        source: "chat.compliance-guidelines",
      });
    },
    [guidelinesUrl, platform2],
  );
  return (
    <p
      data-action-ui-id="chat-compliance-notice"
      className={cn$2(
        "mt-px min-w-0 translate-y-1 px-2 text-center text-[10px] leading-4 text-muted-foreground/40 [overflow-wrap:anywhere] dark:text-muted-foreground/30",
        i18n.language.startsWith("zh")
          ? "tracking-[0.6px]"
          : i18n.language.startsWith("en") && "tracking-[0.2px]",
      )}
    >
      <Trans
        t={t2}
        i18nKey="chat.complianceNotice"
        components={{
          guidelines: (
            <a
              href={guidelinesUrl}
              data-action-ui-id="chat-compliance-guidelines-link"
              aria-label={t2("chat.complianceGuidelinesLink")}
              onClick={handleGuidelinesClick}
              className="-mx-1 inline cursor-pointer rounded-md px-1 py-0.5 text-muted-foreground/40 underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 dark:text-muted-foreground/30 dark:hover:text-foreground/60"
            >
              {t2("chat.complianceGuidelinesLink")}
            </a>
          ),
        }}
      />
    </p>
  );
}
function buildDefaultCategories() {
  const scenes = DEFAULT_SCENE_IDS.flatMap((id2) => {
    const scene = SCENE_CATEGORIES.find((candidate) => candidate.id === id2);
    if (!scene) return [];
    return [
      {
        kind: "scene",
        id: scene.id,
        name: scene.name,
        nameEn: scene.nameEn,
        icon: scene.icon,
        artworkUrl: DEFAULT_SCENE_ARTWORKS[scene.id],
        scene,
      },
    ];
  });
  return [
    ...scenes,
    {
      kind: "featured-skills",
      id: "official-featured",
      name: "Skill",
      nameEn: "Skills",
      icon: SkillIcon,
      artworkUrl: featuredSkillArtwork,
      marketSource: "official-featured",
      skills: DEFAULT_HOME_FEATURED_SKILLS,
    },
  ];
}
export const DEFAULT_HOME_QUICK_START_CONFIG = {
  schemaVersion: HOME_QUICK_START_SCHEMA_VERSION,
  categories: buildDefaultCategories(),
};
export function parseSkillSection(value) {
  const id2 = configIdentifier(value.id);
  const title = parseLocalizedText(value.title);
  const marketSource = configIdentifier(value.source);
  if (!id2 || !title || !marketSource) return void 0;
  const skills = Array.isArray(value.items)
    ? uniqueBy(
        value.items.slice(0, HOME_QUICK_START_MAX_ITEMS_PER_SECTION).flatMap((skill) => {
          const parsed = parseFeaturedSkill(skill);
          return parsed ? [parsed] : [];
        }),
        (skill) => skill.name,
      )
    : [];
  if (skills.length === 0) return void 0;
  return {
    kind: "featured-skills",
    id: id2,
    name: title.zh,
    nameEn: title.en,
    icon: SkillIcon,
    artworkUrl: normalizeConfiguredAssetUrl(value.cover),
    videoUrl: normalizeConfiguredAssetUrl(value.video),
    marketSource,
    skills,
  };
}
