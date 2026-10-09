// migration-popup.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import {
  dedupedToast,
  guardAccountSubmission,
  InfoIcon$1,
  jsxRuntimeExports,
  reactExports,
  usePlatform,
  useTranslation,
} from "../vendor.js";
import {
  openExternalUrl,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import {
  Button$1,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import { MigrationDialog } from "./migration-dialog.jsx";
import { useAccountSubmissionDecision } from "../assets/gateway-scope-provider.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";
import { useWalletQuery } from "../team/use-wallet-query.jsx";
import { trackEvent } from "../infra/sanitize-track-props.js";
import {
  useHailuoWallet,
  useMigrateDeadline,
} from "../team/hailuo-credit-row.jsx";

const BLOCK_TAGS = new Set(["title", "subtitle", "bullet", "details"]);

const INLINE_TAGS = new Set(["b", "br"]);

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

function parsePopupRichText(raw2) {
  if (!raw2 || typeof raw2 !== "string") return [];
  const trimmed = raw2.trim();
  if (!trimmed) return [];
  const doc2 = new DOMParser().parseFromString(
    `<root>${trimmed}</root>`,
    "text/html",
  );
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

function firstBlockOf(blocks, kind) {
  return blocks.find((b3) => b3.kind === kind);
}

function allBlocksOf(blocks, kind) {
  return blocks.filter((b3) => b3.kind === kind);
}

const POPUP_TYPE = "migration";

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

function DetailsTooltipTrigger({ details }) {
  const { t: t2 } = useTranslation();
  const items = details.items;
  if (items.length === 0) return null;
  const [headItem, ...bodyItems] = items;
  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          render={<span className="ml-1 inline-flex align-middle" />}
        >
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
              <div className="font-medium text-background">
                {renderInlines(headItem)}
              </div>
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

export function MigrationPopup({ popup, onClose }) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const walletQuery = useWalletQuery();
  const hailuoWallet = useHailuoWallet();
  const deadline = useMigrateDeadline();
  const checkoutDecision = useAccountSubmissionDecision("personal_checkout");
  const [showMigrationDialog, setShowMigrationDialog] =
    reactExports.useState(false);
  const primaryButtonRef = reactExports.useRef(null);
  const blocks = reactExports.useMemo(() => {
    const dateLabel = deadline?.date ?? "--";
    const interpolated = (popup.description ?? "").replace(
      /\{\{date\}\}/g,
      dateLabel,
    );
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
    if (
      eventDetails.reason !== "escape-key" &&
      eventDetails.reason !== "close-press"
    ) {
      eventDetails.cancel();
      return;
    }
    const method =
      eventDetails.reason === "escape-key" ? "escape" : "cancel_button";
    trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_DISMISS, {
      popup_type: POPUP_TYPE,
      url: trackedUrl,
      method,
    });
    onClose();
  };
  const a11yTitle =
    inlinesToPlainText(titleBlock?.inlines) || t2("serverPopup.a11yTitle");
  const a11ySubtitle =
    inlinesToPlainText(subtitleBlock?.inlines) ||
    popup.description ||
    a11yTitle;
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
                <DialogDescription className="sr-only">
                  {a11ySubtitle}
                </DialogDescription>
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
                      <span className="flex-1">
                        {renderBulletContent(bullet.content)}
                      </span>
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
