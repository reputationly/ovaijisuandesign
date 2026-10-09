// migration-popup.jsx
import { jsxRuntimeExports, useTranslation, reactExports, dedupedToast, useQuery, useStorage, usePlatform, getRuntimeConfig, InfoIcon$1, guardAccountSubmission, XIcon, PanelBottomClose } from "../vendor.js";
import { useAuth, MpIcon, useAccountSubmissionDecision, resolveDesktopCanvasRenderPolicy } from "../m15/apply-asset-change.jsx";
import { FALLBACK_LOG_SERVICE, safeWarn, safeInfo, safeTrack, CANVAS_SURFACE_RECOVERY_MEASURE } from "../m15/check-cloud-asset-upload.js";
import { CanvasRenderPolicyProvider } from "../m15/create-html-iframe-pool-store.jsx";
import { openExternalUrl, actionTrailLog, Tooltip, TooltipTrigger, TooltipProvider, serverPopupLog } from "../m15/graph.jsx";
import { PopupType } from "../m15/push-inline.js";
import { useOptionalUpdaterContext } from "../m15/run-manual-update-check.js";
import { BLOCKING_MODAL_IDS, useModalSlotWithLoading, STARTUP_MODAL_IDS, useModalSlot } from "../m15/thumbnail-load-scheduler.jsx";
import { isElectron, TRACK_EVENTS } from "../m15/track-events.js";
import { useBlockingModalPresence } from "../m15/use-hub-logo-hover-animation.jsx";
import { usePopup, useAutoAnnouncement, touchSeen, trackTypeOf, readMutedUntil, MUTE_FOREVER, setMutedUntil, clearPendingTrialGranted } from "../m15/use-popup.jsx";
import { useRuntimeConfig } from "../m15/use-resizable-width.js";
import {
  Checkbox,
  Button$1,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  TooltipContent,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { useWalletQuery } from "../m09/infinite-scroll-container.jsx";
import { Input3 } from "../asset-center/shared/select-content.jsx";
import {
  instantiation,
  instantiationService,
  IWindowMainService,
  IRendererPowerStateMainService,
} from "../m08/browser-inspiration-urls.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { ILogService } from "../m08/instantiation-service.js";
import {
  useMpWallet,
  useHailuoWallet,
  useMigrateDeadline,
  useMigrateCredit,
  useHiloToMpRatio,
  ShellIcon,
} from "../m09/use-credit-details.jsx";
import { Switch } from "../m01/calc-video-cost-breakdown.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { CDN_TRIAL_GRANTED_ICON } from "./new-workspace-dialog.jsx";
import { GeneralPopup } from "./update-banner.jsx";
import { useSettings } from "./use-data-directory.js";
import {
  FeaturePopup,
  HAILUO03_VIDEO_TRIAL_QUERY_KEY,
  fetchHailuo03VideoTrialStatus,
  getPendingTrialGranted,
  hasShownTrialGranted,
  markTrialGrantedShown,
  subscribeTrialGranted,
} from "./use-feature-popup-action.jsx";
const MIN_AMOUNT = 10;
export function MigrationDialog({ open, onOpenChange, onSuccess }) {
  const { t: t2 } = useTranslation();
  const mpWallet = useMpWallet();
  const hailuoWallet = useHailuoWallet();
  const deadline = useMigrateDeadline();
  const migrate = useMigrateCredit();
  const ratio = useHiloToMpRatio();
  const [confirmed, setConfirmed] = reactExports.useState(false);
  const [amount, setAmount] = reactExports.useState(0);
  const hubCredits = mpWallet?.total_credit ?? 0;
  const hailuoCredits = hailuoWallet?.total_credit ?? 0;
  const effectiveAmount = (() => {
    if (hailuoCredits < MIN_AMOUNT) return hailuoCredits;
    if (amount > 0 && amount < MIN_AMOUNT) return MIN_AMOUNT;
    return Math.min(amount, hailuoCredits);
  })();
  const willReceive = effectiveAmount * ratio;
  reactExports.useEffect(() => {
    if (!open) return;
    setConfirmed(false);
    setAmount(hailuoCredits);
  }, [open, hailuoCredits]);
  const handleAmountChange = (raw2) => {
    const trimmed = raw2.trim();
    if (trimmed === "") {
      setAmount(0);
      return;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      setAmount(0);
      return;
    }
    setAmount(Math.min(parsed, hailuoCredits));
  };
  const handleAmountBlur = () => {
    if (hailuoCredits < MIN_AMOUNT) return;
    if (amount > 0 && amount < MIN_AMOUNT) {
      setAmount(MIN_AMOUNT);
    }
  };
  const handleConfirm = () => {
    if (migrate.isPending || !confirmed || effectiveAmount <= 0) return;
    migrate.mutate(
      {
        amount: effectiveAmount,
      },
      {
        onSuccess: (resp) => {
          if (!resp.ok) {
            dedupedToast.error(resp.error_message || t2("mediaplan.migration.failed"));
            return;
          }
          const transferred = resp.transferred_amount ?? effectiveAmount;
          dedupedToast.success(
            t2("mediaplan.migration.success", {
              amount: transferred.toLocaleString(),
            }),
          );
          onSuccess?.();
          onOpenChange(false);
        },
        onError: () => {
          dedupedToast.error(t2("mediaplan.migration.failed"));
        },
      },
    );
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px]"
        showCloseButton={true}
        data-action-ui-id="migration.dialog"
      >
        <DialogHeader>
          <DialogTitle>{t2("mediaplan.migration.title")}</DialogTitle>
          <DialogDescription>
            {t2("mediaplan.migration.subtitle", {
              ratio,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-muted/50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <ExchangeSide
              tone="from"
              icon={<ShellIcon size={18} />}
              label={t2("mediaplan.migration.fromHailuo")}
              value={effectiveAmount}
              hint={t2("mediaplan.migration.hailuoBalanceHint", {
                balance: hailuoCredits.toLocaleString(),
              })}
            />
            <span className="shrink-0 text-base text-muted-foreground">→</span>
            <ExchangeSide
              tone="to"
              icon={<MpIcon size={18} />}
              label={t2("mediaplan.migration.toHub")}
              value={willReceive}
              hint={t2("mediaplan.migration.hubCurrentBalanceHint", {
                balance: hubCredits.toLocaleString(),
              })}
            />
          </div>
        </div>
        {hailuoCredits >= MIN_AMOUNT && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="migration-amount" className="text-[11px] font-medium text-foreground">
              {t2("mediaplan.migration.amountLabel")}
            </label>
            <div className="flex items-stretch gap-2">
              <Input3
                id="migration-amount"
                inputMode="numeric"
                value={amount === 0 ? "" : String(amount)}
                onChange={(e2) => handleAmountChange(e2.target.value)}
                onBlur={handleAmountBlur}
                placeholder={t2("mediaplan.migration.amountPlaceholder")}
                data-action-ui-id="migration.amount-input"
                className="flex-1"
              />
              <Button$1
                variant="outline"
                onClick={() => setAmount(hailuoCredits)}
                data-action-ui-id="migration.amount-max"
              >
                {t2("mediaplan.migration.amountMax")}
              </Button$1>
            </div>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {t2("mediaplan.migration.willReceive", {
                credits: willReceive.toLocaleString(),
              })}
            </p>
          </div>
        )}
        <ul className="flex flex-col gap-1 px-0.5 pt-1 text-[11px] leading-[1.55] text-muted-foreground">
          <NoteItem
            text={t2("mediaplan.migration.noteRatio", {
              ratio,
            })}
          />
          <NoteItem
            text={t2("mediaplan.migration.noteDeadline", {
              date: deadline?.date ?? "--",
            })}
          />
          <NoteItem text={t2("mediaplan.migration.noteIrreversible")} />
        </ul>
        <label className="hilo-checkbox-label flex cursor-pointer items-start text-xs text-foreground/80">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(v2) => setConfirmed(v2 === true)}
            data-action-ui-id="migration.confirm-check"
          />
          <span className="pt-2 pointer-coarse:pt-3.5">
            {t2("mediaplan.migration.confirmCheckText")}
          </span>
        </label>
        <DialogFooter>
          <Button$1
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-action-ui-id="migration.cancel"
          >
            {t2("common.cancel")}
          </Button$1>
          <Button$1
            onClick={handleConfirm}
            disabled={!confirmed || effectiveAmount <= 0 || migrate.isPending}
            loading={migrate.isPending}
            data-action-ui-id="migration.confirm"
          >
            {t2("mediaplan.migration.confirmCta")}
          </Button$1>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function NoteItem({ text: text2 }) {
  return (
    <li className="relative pl-2.5 before:absolute before:left-0 before:top-[7px] before:size-[3px] before:rounded-full before:bg-muted-foreground before:content-['']">
      {renderBoldPrefix(text2)}
    </li>
  );
}
function renderBoldPrefix(text2) {
  const match2 = text2.match(/^\*\*(.+?)\*\*(.*)$/s);
  if (!match2) return text2;
  const [, bold, rest] = match2;
  return (
    <>
      <strong className="font-medium text-foreground">{bold}</strong>
      {rest}
    </>
  );
}
function ExchangeSide({ tone, icon, label, value, hint }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 text-center">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span
        className={`flex items-center justify-center gap-[3px] text-lg font-semibold tabular-nums leading-none ${tone === "from" ? "text-muted-foreground" : "text-foreground"}`}
      >
        {icon}
        <span>{value.toLocaleString()}</span>
      </span>
      <span className="text-[11px] text-muted-foreground">{hint}</span>
    </div>
  );
}
const BLOCK_TAGS = new Set(["title", "subtitle", "bullet", "details"]);
const INLINE_TAGS = new Set(["b", "br"]);
function parsePopupRichText(raw2) {
  if (!raw2 || typeof raw2 !== "string") return [];
  const trimmed = raw2.trim();
  if (!trimmed) return [];
  const doc2 = new DOMParser().parseFromString(`<root>${trimmed}</root>`, "text/html");
  const root2 = doc2.querySelector("root");
  if (!root2) return fallbackPlainText(trimmed);
  const blocks = [];
  let hasBlockTag = false;
  for (const child of Array.from(root2.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text2 = (child.textContent ?? "").trim();
      if (text2)
        blocks.push({
          kind: "subtitle",
          inlines: [
            {
              kind: "text",
              value: text2,
            },
          ],
        });
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child;
    const tag = el.tagName.toLowerCase();
    if (!BLOCK_TAGS.has(tag)) {
      const text2 = (el.textContent ?? "").trim();
      if (text2)
        blocks.push({
          kind: "subtitle",
          inlines: [
            {
              kind: "text",
              value: text2,
            },
          ],
        });
      continue;
    }
    hasBlockTag = true;
    if (tag === "details") {
      const text2 = (el.textContent ?? "").trim();
      if (text2)
        blocks.push({
          kind: "subtitle",
          inlines: [
            {
              kind: "text",
              value: text2,
            },
          ],
        });
      continue;
    }
    if (tag === "bullet") {
      blocks.push({
        kind: "bullet",
        content: parseBulletContent(el),
      });
      continue;
    }
    const inlines = parseInlines(el);
    blocks.push({
      kind: tag,
      inlines,
    });
  }
  if (!hasBlockTag && blocks.length === 0) return fallbackPlainText(trimmed);
  return blocks;
}
function parseBulletContent(parent) {
  const out = [];
  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const value = child.textContent ?? "";
      if (value)
        out.push({
          kind: "text",
          value,
        });
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child;
    const tag = el.tagName.toLowerCase();
    if (tag === "details") {
      out.push({
        kind: "details",
        items: parseDetailsItems(el),
      });
      continue;
    }
    if (tag === "br") {
      out.push({
        kind: "br",
      });
      continue;
    }
    if (tag === "b") {
      out.push({
        kind: "bold",
        inlines: parseInlines(el),
      });
      continue;
    }
    if (BLOCK_TAGS.has(tag)) {
      const text2 = el.textContent ?? "";
      if (text2)
        out.push({
          kind: "text",
          value: text2,
        });
      continue;
    }
    if (!INLINE_TAGS.has(tag)) {
      const text2 = el.textContent ?? "";
      if (text2)
        out.push({
          kind: "text",
          value: text2,
        });
    }
  }
  return out;
}
function parseInlines(parent) {
  const out = [];
  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const value = child.textContent ?? "";
      if (value)
        out.push({
          kind: "text",
          value,
        });
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") {
      out.push({
        kind: "br",
      });
      continue;
    }
    if (tag === "b") {
      out.push({
        kind: "bold",
        inlines: parseInlines(el),
      });
      continue;
    }
    if (BLOCK_TAGS.has(tag)) {
      const text2 = el.textContent ?? "";
      if (text2)
        out.push({
          kind: "text",
          value: text2,
        });
      continue;
    }
    if (!INLINE_TAGS.has(tag)) {
      const text2 = el.textContent ?? "";
      if (text2)
        out.push({
          kind: "text",
          value: text2,
        });
    }
  }
  return out;
}
function parseDetailsItems(parent) {
  const items = [];
  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child;
    if (el.tagName.toLowerCase() !== "item") continue;
    items.push(parseInlines(el));
  }
  return items;
}
function fallbackPlainText(text2) {
  return [
    {
      kind: "subtitle",
      inlines: [
        {
          kind: "text",
          value: text2,
        },
      ],
    },
  ];
}
function firstBlockOf(blocks, kind) {
  return blocks.find((b3) => b3.kind === kind);
}
function allBlocksOf(blocks, kind) {
  return blocks.filter((b3) => b3.kind === kind);
}
const POPUP_TYPE = "migration";
function MigrationPopup({ popup, onClose }) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const walletQuery = useWalletQuery();
  const hailuoWallet = useHailuoWallet();
  const deadline = useMigrateDeadline();
  const checkoutDecision = useAccountSubmissionDecision("personal_checkout");
  const [showMigrationDialog, setShowMigrationDialog] = reactExports.useState(false);
  const primaryButtonRef = reactExports.useRef(null);
  const blocks = reactExports.useMemo(() => {
    const dateLabel = deadline?.date ?? "--";
    const interpolated = (popup.description ?? "").replace(/\{\{date\}\}/g, dateLabel);
    return parsePopupRichText(interpolated);
  }, [popup.description, deadline?.date]);
  const titleBlock = firstBlockOf(blocks, "title");
  const subtitleBlock = firstBlockOf(blocks, "subtitle");
  const bulletBlocks = allBlocksOf(blocks, "bullet");
  const hailuoCredits = hailuoWallet?.total_credit ?? 0;
  const walletLoading = walletQuery.isLoading;
  const showRedeem = walletQuery.isSuccess ? hailuoCredits > 0 : true;
  const url2 = popup.action?.url ?? "";
  const trackedUrl = url2;
  const primaryLabel = popup.action?.label ?? "";
  const handlePrimary = async () => {
    const decision = guardAccountSubmission("personal_checkout");
    if (!decision.allowed) return;
    trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_ACTION_CLICK, {
      popup_type: POPUP_TYPE,
      url: trackedUrl,
    });
    if (!url2) {
      onClose();
      return;
    }
    try {
      const opened = await openExternalUrl(platform2, url2, {
        source: "server-popup.migration",
      });
      if (!opened) throw new Error("open_external_failed");
    } catch (err) {
      trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_ACTION_FAILED, {
        popup_type: POPUP_TYPE,
        url: trackedUrl,
        error_type: "unknown",
        error_message: String(err),
      });
      dedupedToast.error(t2("serverPopup.errorToast"));
      return;
    }
    onClose();
  };
  const handleRedeem = () => {
    trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_ACTION_CLICK, {
      popup_type: POPUP_TYPE,
      url: "inapp:migration-dialog",
    });
    setShowMigrationDialog(true);
  };
  const handleOpenChange = (open, eventDetails) => {
    if (open) return;
    if (!popup.can_close) {
      eventDetails.cancel();
      return;
    }
    if (eventDetails.reason !== "escape-key" && eventDetails.reason !== "close-press") {
      eventDetails.cancel();
      return;
    }
    const method = eventDetails.reason === "escape-key" ? "escape" : "cancel_button";
    trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_DISMISS, {
      popup_type: POPUP_TYPE,
      url: trackedUrl,
      method,
    });
    onClose();
  };
  const a11yTitle = inlinesToPlainText(titleBlock?.inlines) || t2("serverPopup.a11yTitle");
  const a11ySubtitle = inlinesToPlainText(subtitleBlock?.inlines) || popup.description || a11yTitle;
  return (
    <>
      <Dialog open={true} onOpenChange={handleOpenChange}>
        <DialogContent
          className="w-[460px] max-w-[460px] sm:max-w-[460px] p-0 gap-0 overflow-hidden"
          showCloseButton={popup.can_close}
          data-action-ui-id="server-popup.migration"
          initialFocus={primaryButtonRef}
        >
          <div
            className="flex flex-col items-center gap-3 border-b border-border px-6 pb-6 pt-8 text-center"
            style={{
              background:
                "radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--brand-accent) 10%, transparent), transparent 60%),radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--brand-accent) 5%, transparent), transparent 50%),var(--card)",
            }}
          >
            <DialogHeader className="items-center gap-2 space-y-0 text-center sm:text-center">
              {titleBlock ? (
                <DialogTitle className="font-heading text-[22px] font-medium leading-[1.25] text-foreground text-center">
                  {renderInlines(titleBlock.inlines)}
                </DialogTitle>
              ) : (
                <DialogTitle className="sr-only">{a11yTitle}</DialogTitle>
              )}
              {subtitleBlock ? (
                <DialogDescription className="mx-auto max-w-[360px] text-xs leading-[1.6] text-muted-foreground text-center">
                  {renderInlines(subtitleBlock.inlines)}
                </DialogDescription>
              ) : (
                <DialogDescription className="sr-only">{a11ySubtitle}</DialogDescription>
              )}
            </DialogHeader>
          </div>
          <div className="flex flex-col gap-4 px-6 pb-3 pt-[18px]">
            {bulletBlocks.length > 0 && (
              <ul className="flex flex-col">
                {bulletBlocks.map((bullet, i2) => {
                  return (
                    <li
                      key={i2}
                      className={`flex gap-2.5 py-2.5 text-xs leading-[1.55] text-foreground ${i2 < bulletBlocks.length - 1 ? "border-b border-dashed border-border" : ""}`}
                    >
                      <span className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center bg-foreground font-heading text-[10px] font-medium leading-none text-background">
                        {i2 + 1}
                      </span>
                      <span className="flex-1">{renderBulletContent(bullet.content)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <DialogFooter className="flex flex-col gap-2 px-6 pb-6 pt-2 sm:flex-col sm:justify-stretch">
            <Button$1
              ref={primaryButtonRef}
              className="h-9 w-full text-[13px]"
              onClick={handlePrimary}
              disabled={!checkoutDecision.allowed}
              data-action-ui-id="server-popup.migration.primary"
            >
              {primaryLabel}
            </Button$1>
            {showRedeem && (
              <Button$1
                variant="outline"
                className="h-8 w-full text-xs"
                onClick={handleRedeem}
                loading={walletLoading}
                data-action-ui-id="server-popup.migration.redeem"
              >
                {t2("mediaplan.migration.popup.redeemCta")}
              </Button$1>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MigrationDialog
        open={showMigrationDialog}
        onOpenChange={setShowMigrationDialog}
        onSuccess={onClose}
      />
    </>
  );
}
function DetailsTooltipTrigger({ details }) {
  const { t: t2 } = useTranslation();
  const items = details.items;
  if (items.length === 0) return null;
  const [headItem, ...bodyItems] = items;
  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger render={<span className="ml-1 inline-flex align-middle" />}>
          <button
            type="button"
            data-action-ui-id="server-popup.migration.details-icon"
            aria-label={t2("mediaplan.migration.popup.detailsAriaLabel")}
            className="inline-flex cursor-help items-center text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            <InfoIcon$1 size={12} strokeWidth={1.75} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={8}
          className="max-w-[320px] text-[11px] leading-[1.55] [&_strong]:text-background"
        >
          <div className="flex flex-col gap-1.5">
            {headItem && headItem.length > 0 && (
              <div className="font-medium text-background">{renderInlines(headItem)}</div>
            )}
            {bodyItems.map((item, i2) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: details items 顺序固定
              <div key={i2} className="text-background/85">
                {renderInlines(item)}
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
function renderInlines(inlines) {
  if (!inlines || inlines.length === 0) return null;
  return inlines.map((inline2, i2) => renderInline(inline2, i2));
}
function renderInline(inline2, key2) {
  if (inline2.kind === "text") return <span key={key2}>{inline2.value}</span>;
  if (inline2.kind === "br") return <br key={key2} />;
  return (
    <strong key={key2} className="font-medium text-foreground">
      {renderInlines(inline2.inlines)}
    </strong>
  );
}
function renderBulletContent(content2) {
  if (content2.length === 0) return null;
  const detailsIdx = content2.findIndex((n2) => n2.kind === "details");
  if (detailsIdx === -1) {
    return renderBulletInlines(content2);
  }
  const beforeInlines = content2.slice(0, detailsIdx);
  const afterInlines = content2.slice(detailsIdx + 1);
  const details = content2[detailsIdx];
  return (
    <>
      {renderBulletInlines(beforeInlines)}
      <DetailsTooltipTrigger details={details} />
      {afterInlines.length > 0 && renderInlines(afterInlines)}
    </>
  );
}
function renderBulletInlines(inlines) {
  if (inlines.length === 0) return null;
  const first2 = inlines[0];
  if (first2?.kind === "bold") {
    return (
      <>
        <strong className="font-medium text-foreground mr-1">
          {renderInlines(first2.inlines)}
        </strong>
        <span className="text-muted-foreground">
          {inlines.slice(1).map((node2, i2) => renderInline(node2, i2))}
        </span>
      </>
    );
  }
  return renderInlines(inlines);
}
function inlinesToPlainText(inlines) {
  if (!inlines) return "";
  return inlines
    .map((i2) => {
      if (i2.kind === "text") return i2.value;
      if (i2.kind === "bold") return inlinesToPlainText(i2.inlines);
      return "";
    })
    .join("")
    .trim();
}
export function ServerDrivenPopupOrchestrator() {
  const { user } = useAuth();
  const popupQuery = usePopup();
  const { data: rawPopup } = popupQuery;
  const updater = useOptionalUpdaterContext();
  const forcedUpdate = updater?.state.forced ?? false;
  const userID = user?.userID;
  const { popup, ready: announcementReady } = useAutoAnnouncement(rawPopup, userID);
  const [closedFor, setClosedFor] = reactExports.useState(null);
  const onClose = reactExports.useCallback(() => {
    if (userID && popup && popup.popup_type !== PopupType.POPUP_TYPE_NONE && popup.id) {
      setClosedFor({
        userID,
        popupId: popup.id,
      });
    }
  }, [popup, userID]);
  const seenUserId = userID;
  const seenPopupId = popup && popup.popup_type !== PopupType.POPUP_TYPE_NONE ? popup.id : null;
  reactExports.useEffect(() => {
    if (!seenUserId || !seenPopupId) return;
    touchSeen(seenUserId, seenPopupId);
  }, [seenUserId, seenPopupId]);
  const autoShowBlocked =
    popup?.popup_type === PopupType.POPUP_TYPE_FEATURE &&
    (popup.auto_show === false || popup.trial_active === false);
  const candidatePopupId =
    popup && popup.popup_type !== PopupType.POPUP_TYPE_NONE && !autoShowBlocked ? popup.id : null;
  const muteRangeMs =
    popup?.popup_type === PopupType.POPUP_TYPE_FEATURE ? 0 : (popup?.mute_range_time ?? 0);
  const trackType = popup ? trackTypeOf(popup.popup_type) : null;
  const trackUrl = popup?.action?.url ?? "";
  const trackHasCover = Boolean(popup?.cover_url);
  const trackCanClose = popup?.can_close ?? false;
  const [activation, setActivation] = reactExports.useState(null);
  const [muteVerdict, setMuteVerdict] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!userID || !candidatePopupId) {
      if (muteVerdict) setMuteVerdict(null);
      return;
    }
    if (muteVerdict?.userID === userID && muteVerdict.popupId === candidatePopupId) return;
    if (activation?.userID === userID && activation.popupId === candidatePopupId) return;
    const mutedUntil = readMutedUntil(userID, candidatePopupId);
    if (mutedUntil !== null) {
      serverPopupLog.info("skip: muted", {
        popupId: candidatePopupId,
        userID,
        mutedUntil,
      });
    }
    setMuteVerdict({
      userID,
      popupId: candidatePopupId,
      muted: mutedUntil !== null,
    });
  }, [userID, candidatePopupId, muteVerdict, activation]);
  const verdictClear =
    !!muteVerdict &&
    muteVerdict.userID === userID &&
    muteVerdict.popupId === candidatePopupId &&
    !muteVerdict.muted;
  const activationMatches =
    !!activation &&
    !!userID &&
    activation.userID === userID &&
    activation.popupId === candidatePopupId;
  const closedByUser =
    !!closedFor &&
    !!userID &&
    closedFor.userID === userID &&
    closedFor.popupId === candidatePopupId;
  const wantsSlot =
    !forcedUpdate &&
    !!userID &&
    !!candidatePopupId &&
    !closedByUser &&
    (verdictClear || activationMatches);
  const waitingForAnnouncement =
    !forcedUpdate &&
    !!userID &&
    ((popupQuery.isPending && !popupQuery.isError) ||
      !announcementReady ||
      (!!candidatePopupId &&
        !activationMatches &&
        (muteVerdict?.userID !== userID || muteVerdict.popupId !== candidatePopupId)));
  const granted = useModalSlotWithLoading(STARTUP_MODAL_IDS.serverDrivenPopup, {
    candidate: wantsSlot,
    loading: waitingForAnnouncement,
  });
  reactExports.useEffect(() => {
    if (!candidatePopupId || forcedUpdate) {
      if (activation) setActivation(null);
      if (!candidatePopupId) return;
      serverPopupLog.info("skip: forced-update", {
        popupId: candidatePopupId,
        userID: userID ?? null,
      });
      return;
    }
    if (!userID) return;
    if (activation?.userID === userID && activation.popupId === candidatePopupId) return;
    if (!granted) return;
    if (!verdictClear) return;
    const writeMutedUntil = muteRangeMs === 0 ? MUTE_FOREVER : Date.now() + muteRangeMs;
    setMutedUntil(userID, candidatePopupId, writeMutedUntil);
    setActivation({
      userID,
      popupId: candidatePopupId,
    });
    serverPopupLog.info("activated", {
      popupId: candidatePopupId,
      userID,
      popupType: trackType,
      muteRangeMs,
      mutedUntil: writeMutedUntil,
    });
    if (trackType) {
      trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_VIEW, {
        popup_type: trackType,
        url: trackUrl,
        has_cover: trackHasCover,
        can_close: trackCanClose,
      });
    }
  }, [
    forcedUpdate,
    userID,
    candidatePopupId,
    muteRangeMs,
    activation,
    granted,
    verdictClear,
    trackType,
    trackUrl,
    trackHasCover,
    trackCanClose,
  ]);
  const shouldRender = !forcedUpdate && granted && activationMatches && !closedByUser;
  useBlockingModalPresence(BLOCKING_MODAL_IDS.serverDrivenPopup, shouldRender);
  const wasShownRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (shouldRender) {
      wasShownRef.current = true;
      return;
    }
    if (!wasShownRef.current || !activation) return;
    wasShownRef.current = false;
    const closedByUser2 =
      closedFor?.userID === activation.userID && closedFor?.popupId === activation.popupId;
    if (closedByUser2) {
      serverPopupLog.info("closed by user", {
        popupId: activation.popupId,
        userID: activation.userID,
      });
      return;
    }
    const sameCandidate = activation.userID === userID && activation.popupId === candidatePopupId;
    if (forcedUpdate || !sameCandidate) {
      serverPopupLog.info("dismissed", {
        reason: forcedUpdate ? "forced-update" : "candidate-changed",
        prevPopupId: activation.popupId,
        prevUserID: activation.userID,
        currentUserID: userID ?? null,
        candidatePopupId,
      });
      return;
    }
    serverPopupLog.warn("activation dropped", {
      popupId: activation.popupId,
      userID: activation.userID,
    });
  }, [shouldRender, activation, closedFor, userID, candidatePopupId, forcedUpdate]);
  if (!shouldRender || !popup) return null;
  switch (popup.popup_type) {
    case PopupType.POPUP_TYPE_GENERAL:
      return <GeneralPopup popup={popup} onClose={onClose} />;
    case PopupType.POPUP_TYPE_MIGRATION:
      return <MigrationPopup popup={popup} onClose={onClose} />;
    case PopupType.POPUP_TYPE_FEATURE:
      return <FeaturePopup popup={popup} onClose={onClose} />;
    default:
      return null;
  }
}
export function TrialGrantedPopup({ onClose }) {
  const { t: t2 } = useTranslation();
  const { data: trialStatus } = useQuery({
    queryKey: HAILUO03_VIDEO_TRIAL_QUERY_KEY,
    queryFn: fetchHailuo03VideoTrialStatus,
    retry: 2,
  });
  if (trialStatus?.activityActive !== true) return null;
  const freeCount = trialStatus.freeCount;
  return (
    <div
      className="pointer-events-auto absolute bottom-[10px] left-[10px] z-30 flex w-[278px] flex-col items-start justify-center gap-3 rounded-[20px] border border-border bg-card px-3 pt-6 pb-3 shadow-brutalist-sm"
      data-action-ui-id="server-popup.trial-granted"
    >
      <img
        src={CDN_TRIAL_GRANTED_ICON}
        alt=""
        aria-hidden={true}
        className="pointer-events-none absolute -top-10 -left-1 h-20 w-20 select-none object-contain"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label={t2("common.close")}
        className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
        data-action-ui-id="server-popup.trial-granted.close"
      >
        <XIcon className="size-4" strokeWidth={2} />
      </button>
      <div className="flex flex-col items-start gap-2.5 pt-1">
        <div className="font-heading text-[18px] font-bold leading-tight text-foreground">
          {t2("serverPopup.trialGranted.title")}
        </div>
        <p className="text-[12px] text-muted-foreground">
          {t2("serverPopup.trialGranted.description", {
            count: freeCount > 0 ? freeCount : 3,
          })}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-8 w-full items-center justify-center rounded-[8px] bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90"
        data-action-ui-id="server-popup.trial-granted.confirm"
      >
        {t2("serverPopup.trialGranted.action")}
      </button>
    </div>
  );
}
export function useTrialGrantedPopup(userID) {
  const [pendingMatchesUser, setPendingMatchesUser] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const recompute = () => {
      const pending2 = getPendingTrialGranted();
      setPendingMatchesUser(
        !!pending2 && !!userID && pending2 === userID && !hasShownTrialGranted(userID),
      );
    };
    recompute();
    return subscribeTrialGranted(recompute);
  }, [userID]);
  const trialStatusQuery = useQuery({
    queryKey: HAILUO03_VIDEO_TRIAL_QUERY_KEY,
    queryFn: fetchHailuo03VideoTrialStatus,
    retry: 2,
    staleTime: 0,
    enabled: pendingMatchesUser,
  });
  const statusUnavailable = trialStatusQuery.isError || trialStatusQuery.isRefetchError;
  const statusSettled = trialStatusQuery.isSuccess && !trialStatusQuery.isFetching;
  reactExports.useEffect(() => {
    if (
      pendingMatchesUser &&
      statusSettled &&
      !statusUnavailable &&
      trialStatusQuery.data?.activityActive === false
    ) {
      clearPendingTrialGranted();
      setPendingMatchesUser(false);
    }
  }, [pendingMatchesUser, statusSettled, statusUnavailable, trialStatusQuery.data?.activityActive]);
  const close2 = reactExports.useCallback(() => {
    if (userID) markTrialGrantedShown(userID);
    clearPendingTrialGranted();
    setPendingMatchesUser(false);
  }, [userID]);
  const visible =
    pendingMatchesUser &&
    statusSettled &&
    !statusUnavailable &&
    trialStatusQuery.data?.activityActive === true;
  return {
    visible,
    close: close2,
  };
}
export function WatermarkOnboarding() {
  const [config2, , , isHydrated] = useStorage("global.config");
  const { set: set2 } = useSettings();
  const [pendingRemove, setPendingRemove] = reactExports.useState(false);
  const isDomestic = getRuntimeConfig().region === "domestic";
  const candidate = isHydrated && !!config2 && config2.watermarkOnboardingShown !== true;
  const granted = useModalSlot(STARTUP_MODAL_IDS.watermarkOnboarding, {
    candidate,
  });
  const open = granted && candidate;
  const wasOpenRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (open && !wasOpenRef.current) {
      setPendingRemove(config2?.watermarkEnabled === false);
    }
    wasOpenRef.current = open;
  }, [open, config2]);
  useBlockingModalPresence(BLOCKING_MODAL_IDS.watermarkOnboarding, open);
  const handleSave = async () => {
    await set2("watermarkEnabled", !pendingRemove);
    await set2("watermarkOnboardingShown", true);
  };
  const handleOpenChange = (next2, eventDetails) => {
    if (!next2) eventDetails.cancel();
  };
  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal={true}>
      <DialogContent
        className="sm:max-w-2xl max-h-[85vh] flex flex-col gap-4"
        data-action-ui-id="watermark-onboarding.dialog"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>
            {isDomestic ? "AI 生成水印设置" : "AI Generated Watermark Settings"}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 text-xs/relaxed text-foreground space-y-3 pr-1">
          {isDomestic ? (
            <>
              <p>一、根据法律法规，AI 生成内容用于网络公开传播时，必须添加"AI 生成"显式水印。</p>
              <ol className="list-decimal list-inside space-y-2 pl-2 text-muted-foreground">
                <li>
                  本平台所有生成内容
                  <strong className="font-bold text-foreground">默认带有"AI 生成"水印</strong>
                  ，满足公开传播的标识合规要求。
                </li>
                <li>
                  若您仅用于本地学习、收藏、内部研究等
                  <strong className="font-bold text-foreground">非公开场景时</strong>，
                  <strong className="font-bold text-foreground">您可选择关闭水印</strong>；
                </li>
                <li>
                  您知悉并承诺：若将无水印内容用于
                  <strong className="font-bold text-foreground">任何网络公开传播场景</strong>，
                  您必须<strong className="font-bold text-foreground">主动声明"AI 生成"</strong>，
                  <strong className="font-bold text-foreground">
                    并使用传播平台提供的标识功能进行标识
                  </strong>
                  。
                </li>
              </ol>
              <p>
                二、您无论本地使用还是公开传播生成内容，均须严格遵守国家法律法规和公序良俗，禁止侵犯他人知识产权、肖像权、名誉权、隐私权等合法权益，不得利用本服务从事各类违法犯罪活动。
              </p>
              <p>
                三、您如将生成内容用于违法违规用途，或因未履行 AI
                标识义务，因此所发生的后果和责任均由您自行承担。
              </p>
            </>
          ) : (
            <>
              <p>
                All content generated by this platform{" "}
                <strong className="font-bold text-foreground">
                  includes an “AI Generated” watermark by default
                </strong>
                .
              </p>
              <p>
                If you only use the generated content for personal, non-public purposes, you may
                choose to remove the watermark.
              </p>
              <p>
                If you share AI-generated content publicly without the watermark, you acknowledge
                responsibility for clearly disclosing that it was AI-generated.
              </p>
            </>
          )}
        </div>
        <div className="border-t border-border pt-4 flex items-start gap-3">
          <Switch
            checked={pendingRemove}
            onCheckedChange={setPendingRemove}
            className="mt-0.5"
            data-action-ui-id="watermark-onboarding.switch"
          />
          <div className="flex-1 text-xs">
            <div className="font-medium text-foreground">
              {isDomestic ? "去除水印" : "Remove Watermark"}
            </div>
            <p className="mt-1 text-muted-foreground">
              {isDomestic ? (
                <>
                  打开开关并点击保存设置，代表您已确认充分了解上述情况并同意。
                  <br />
                  后续可以在 设置 → 通用 → 去除水印 中修改水印设置。
                </>
              ) : (
                <>
                  Toggle this switch and click save to confirm you understand the above.
                  <br />
                  You can change this later in Settings → General → Remove Watermark.
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button$1 onClick={() => void handleSave()} data-action-ui-id="watermark-onboarding.save">
            {isDomestic ? "保存设置" : "Save Settings"}
          </Button$1>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function WindowCloseDialogContent({ onChoose }) {
  const { t: t2 } = useTranslation();
  const [remember, setRemember] = reactExports.useState(false);
  const [busy, setBusy] = reactExports.useState(false);
  const [failed, setFailed] = reactExports.useState(false);
  const submitting = reactExports.useRef(false);
  const cancelRef = reactExports.useRef(null);
  useBlockingModalPresence("window-close", true);
  async function handleChoose(action) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await onChoose({
        action,
        remember: action !== "cancel" && remember,
      });
    } catch (error) {
      actionTrailLog.error("window-close response failed", {
        error,
      });
      submitting.current = false;
      setBusy(false);
      setFailed(true);
    }
  }
  return (
    <Dialog open={true} onOpenChange={(open) => !open && void handleChoose("cancel")}>
      <DialogContent
        layer="nested"
        showCloseButton={false}
        initialFocus={cancelRef}
        className="gap-6 p-6 shadow-lg sm:max-w-[440px]"
        data-action-ui-id="window-close-dialog"
      >
        <DialogHeader className="gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <PanelBottomClose className="size-5" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <DialogTitle className="text-base">{t2("windowClose.message")}</DialogTitle>
          </div>
          <DialogDescription className="whitespace-pre-line text-sm/relaxed">
            {t2("windowClose.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label
            htmlFor="window-close-remember"
            className="hilo-checkbox-label flex w-fit cursor-pointer items-center text-sm"
          >
            <Checkbox
              id="window-close-remember"
              checked={remember}
              onCheckedChange={setRemember}
              disabled={busy}
              data-action-ui-id="window-close-remember"
            />
            {t2("windowClose.dontShowAgain")}
          </label>
          <p className="pl-8 text-xs text-muted-foreground pointer-coarse:pl-11">
            {t2("windowClose.settingsHint")}
          </p>
          {failed && (
            <p role="alert" className="text-xs text-destructive">
              {t2("windowClose.failed")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
          <Button$1
            ref={cancelRef}
            variant="ghost"
            size="lg"
            className="mr-auto px-3"
            disabled={busy}
            onClick={() => void handleChoose("cancel")}
            data-action-ui-id="window-close-cancel"
          >
            {t2("windowClose.cancel")}
          </Button$1>
          <Button$1
            variant="outline"
            size="lg"
            className="min-w-20 px-4"
            disabled={busy}
            onClick={() => void handleChoose("quit")}
            data-action-ui-id="window-close-quit"
          >
            {t2("windowClose.quit")}
          </Button$1>
          <Button$1
            size="lg"
            className="px-4"
            disabled={busy}
            onClick={() => void handleChoose("tray")}
            data-action-ui-id="window-close-tray"
          >
            {t2("windowClose.tray")}
          </Button$1>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function WindowCloseDialog() {
  const platform2 = usePlatform();
  const [request, setRequest] = reactExports.useState(null);
  const serviceRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!isElectron() || platform2.app.os !== "win32") return;
    let disposed = false;
    let eventReceived = false;
    let subscription;
    let connectedService;
    void (() => Promise.resolve().then(() => instantiation))()
      .then(async ({ services: services2 }) => {
        if (disposed) return;
        const service2 = services2.get(IWindowMainService);
        connectedService = service2;
        serviceRef.current = service2;
        subscription = service2.onDidChangeWindowCloseConfirmation((pending22) => {
          eventReceived = true;
          if (!disposed) setRequest(pending22);
        });
        await service2.setWindowCloseConfirmationReady(true);
        if (disposed) return;
        const pending2 = await service2.getPendingWindowCloseConfirmation();
        if (!disposed && !eventReceived) setRequest(pending2);
      })
      .catch((error) =>
        actionTrailLog.error("window-close subscription failed", {
          error,
        }),
      );
    return () => {
      disposed = true;
      subscription?.dispose();
      void connectedService?.setWindowCloseConfirmationReady(false).catch((error) =>
        actionTrailLog.error("window-close unregister failed", {
          error,
        }),
      );
      serviceRef.current = null;
    };
  }, [platform2.app.os]);
  const requestId = request?.id;
  reactExports.useEffect(() => {
    if (requestId === void 0) return;
    void serviceRef.current?.acknowledgeWindowCloseConfirmation(requestId).catch((error) =>
      actionTrailLog.error("window-close acknowledge failed", {
        error,
      }),
    );
  }, [requestId]);
  if (!request) return null;
  return (
    <WindowCloseDialogContent
      key={request.id}
      onChoose={async (choice) => {
        if (!serviceRef.current) throw new Error("Window service unavailable");
        await serviceRef.current.respondWindowCloseConfirmation(request.id, choice);
        setRequest((current2) => (current2?.id === request.id ? null : current2));
      }}
    />
  );
}
function resolveRuntimeServices(enableResumeRecovery) {
  let logService2 = FALLBACK_LOG_SERVICE;
  try {
    logService2 = instantiationService.invokeFunction((accessor) => accessor.get(ILogService));
  } catch (error) {
    safeWarn(
      FALLBACK_LOG_SERVICE,
      `[canvas-render] log_service_unavailable ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let powerStateService = null;
  if (!enableResumeRecovery)
    return {
      powerStateService,
      logService: logService2,
      trackEvent,
    };
  try {
    powerStateService = instantiationService.invokeFunction((accessor) =>
      accessor.get(IRendererPowerStateMainService),
    );
  } catch (error) {
    safeWarn(
      logService2,
      `[canvas-render] power_bridge_unavailable ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return {
    powerStateService,
    logService: logService2,
    trackEvent,
  };
}
export function CanvasRenderRuntimeProvider({ services: services2, children: children2 }) {
  const platform2 = usePlatform();
  const runtimeConfig = useRuntimeConfig();
  const { arch, os: os2, runningUnderARM64Translation } = platform2.app;
  const translationState = runningUnderARM64Translation ?? "unknown";
  const { canvasContentVisibilityOverride, canvasResumeRecoveryEnabled } = runtimeConfig;
  const policy = reactExports.useMemo(
    () =>
      resolveDesktopCanvasRenderPolicy(
        {
          arch,
          os: os2,
          runningUnderARM64Translation,
        },
        {
          canvasContentVisibilityOverride,
          canvasResumeRecoveryEnabled,
        },
      ),
    [
      arch,
      os2,
      runningUnderARM64Translation,
      canvasContentVisibilityOverride,
      canvasResumeRecoveryEnabled,
    ],
  );
  const runtimeServices = reactExports.useMemo(
    () => services2 ?? resolveRuntimeServices(policy.recoverAfterResume),
    [policy.recoverAfterResume, services2],
  );
  const { logService: logService2, powerStateService } = runtimeServices;
  const [resumeEpoch, setResumeEpoch] = reactExports.useState(0);
  const didTrackPolicyRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    const profile = {
      profile: policy.reason,
      content_visibility: policy.contentVisibility,
      resume_recovery_enabled: policy.recoverAfterResume,
      recovery_frame_budget_ms: policy.recoveryFrameBudgetMs,
      recovery_max_per_frame: policy.recoveryMaxPerFrame,
      os: os2,
      arch,
      running_under_arm64_translation: translationState,
    };
    safeInfo(logService2, `[canvas-render] policy_applied ${JSON.stringify(profile)}`);
    if (!didTrackPolicyRef.current) {
      didTrackPolicyRef.current = true;
      safeTrack(runtimeServices, TRACK_EVENTS.CANVAS_RENDER_POLICY_APPLIED, profile);
    }
  }, [arch, logService2, os2, policy, runtimeServices, translationState]);
  reactExports.useEffect(() => {
    if (!policy.recoverAfterResume) return;
    if (!powerStateService) {
      safeWarn(logService2, "[canvas-render] power_bridge_unavailable");
      return;
    }
    let subscription;
    try {
      subscription = powerStateService.onDidResume((event) => {
        setResumeEpoch((current2) => Math.max(current2, event.resumeEpoch));
      });
    } catch (error) {
      safeWarn(
        logService2,
        `[canvas-render] power_bridge_subscribe_failed ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }
    try {
      Promise.resolve(powerStateService.getSnapshot())
        .then((snapshot2) => {
          setResumeEpoch((current2) => Math.max(current2, snapshot2.resumeEpoch));
        })
        .catch((error) => {
          safeWarn(
            logService2,
            `[canvas-render] power_snapshot_failed ${error instanceof Error ? error.message : String(error)}`,
          );
        });
    } catch (error) {
      safeWarn(
        logService2,
        `[canvas-render] power_snapshot_failed ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return () => {
      try {
        subscription?.dispose();
      } catch {}
    };
  }, [logService2, policy.recoverAfterResume, powerStateService]);
  const handleRecovery = reactExports.useCallback(
    (result) => {
      const detail = {
        ...result,
        profile: policy.reason,
        content_visibility: policy.contentVisibility,
        os: os2,
        arch,
        running_under_arm64_translation: translationState,
      };
      safeInfo(logService2, `[canvas-render] recovery_completed ${JSON.stringify(detail)}`);
      const recoveryProperties = {
        profile: policy.reason,
        content_visibility: policy.contentVisibility,
        os: os2,
        arch,
        running_under_arm64_translation: translationState,
        resume_epoch: result.resumeEpoch,
        recovery_trigger: result.trigger,
        scheduled_count: result.scheduledCount,
        recovered_count: result.recoveredCount,
        skipped_count: result.skippedCount,
        error_count: result.errorCount,
        frame_count: result.frameCount,
        max_frame_work_ms: result.maxFrameWorkMs,
        duration_ms: result.durationMs,
        scheduled_bitmap_canvas_count: result.scheduledByType.bitmapCanvas,
        scheduled_video_count: result.scheduledByType.video,
        recovered_bitmap_canvas_count: result.recoveredByType.bitmapCanvas,
        recovered_video_count: result.recoveredByType.video,
      };
      safeTrack(runtimeServices, TRACK_EVENTS.CANVAS_SURFACE_RECOVERY, recoveryProperties);
      if (typeof performance === "undefined" || typeof performance.measure !== "function") return;
      try {
        performance.measure(CANVAS_SURFACE_RECOVERY_MEASURE, {
          start: Math.max(0, performance.now() - result.durationMs),
          duration: result.durationMs,
          detail,
        });
      } catch {}
    },
    [
      arch,
      logService2,
      os2,
      policy.contentVisibility,
      policy.reason,
      runtimeServices,
      translationState,
    ],
  );
  return (
    <CanvasRenderPolicyProvider
      policy={policy}
      resumeEpoch={resumeEpoch}
      onRecovery={handleRecovery}
    >
      {children2}
    </CanvasRenderPolicyProvider>
  );
}
