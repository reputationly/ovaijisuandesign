// migration-popup.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { usePlatform } from "../infra/platform-context.js";
import { useTranslation } from "react-i18next";
import { InfoIcon$1 as InfoIcon } from "../media-editing/lucide-icon-wraps.js";
import { dedupedToast, guardAccountSubmission } from "../infra/agent-http-client.js";
import {
  openExternalUrl,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import {
  Button,
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
      const text = el.textContent ?? "";
      if (text)
        out.push({
          kind: "text",
          value: text,
        });
      continue;
    }
    if (!INLINE_TAGS.has(tag)) {
      const text = el.textContent ?? "";
      if (text)
        out.push({
          kind: "text",
          value: text,
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
      const text = el.textContent ?? "";
      if (text)
        out.push({
          kind: "text",
          value: text,
        });
      continue;
    }
    if (!INLINE_TAGS.has(tag)) {
      const text = el.textContent ?? "";
      if (text)
        out.push({
          kind: "text",
          value: text,
        });
    }
  }
  return out;
}
function fallbackPlainText(text) {
  return [
    {
      kind: "subtitle",
      inlines: [
        {
          kind: "text",
          value: text,
        },
      ],
    },
  ];
}
function parsePopupRichText(raw) {
  if (!raw || typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const doc = new DOMParser().parseFromString(
    `<root>${trimmed}</root>`,
    "text/html",
  );
  const root = doc.querySelector("root");
  if (!root) return fallbackPlainText(trimmed);
  const blocks = [];
  let hasBlockTag = false;
  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? "").trim();
      if (text)
        blocks.push({
          kind: "subtitle",
          inlines: [
            {
              kind: "text",
              value: text,
            },
          ],
        });
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child;
    const tag = el.tagName.toLowerCase();
    if (!BLOCK_TAGS.has(tag)) {
      const text = (el.textContent ?? "").trim();
      if (text)
        blocks.push({
          kind: "subtitle",
          inlines: [
            {
              kind: "text",
              value: text,
            },
          ],
        });
      continue;
    }
    hasBlockTag = true;
    if (tag === "details") {
      const text = (el.textContent ?? "").trim();
      if (text)
        blocks.push({
          kind: "subtitle",
          inlines: [
            {
              kind: "text",
              value: text,
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
  return blocks.find((block) => block.kind === kind);
}
function allBlocksOf(blocks, kind) {
  return blocks.filter((block) => block.kind === kind);
}
const POPUP_TYPE = "migration";
function renderInlines(inlines) {
  if (!inlines || inlines.length === 0) return null;
  return inlines.map((inline, i) => renderInline(inline, i));
}
function renderInline(inline, key) {
  if (inline.kind === "text") return <span key={key}>{inline.value}</span>;
  if (inline.kind === "br") return <br key={key} />;
  return (
    <strong key={key} className="font-medium text-foreground">
      {renderInlines(inline.inlines)}
    </strong>
  );
}
function DetailsTooltipTrigger({ details }) {
  const { t } = useTranslation();
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
            aria-label={t("mediaplan.migration.popup.detailsAriaLabel")}
            className="inline-flex cursor-help items-center text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            <InfoIcon size={12} strokeWidth={1.75} />
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
            {bodyItems.map((item, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: details items 顺序固定
              <div key={i} className="text-background/85">
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
  const first = inlines[0];
  if (first?.kind === "bold") {
    return (
      <>
        <strong className="font-medium text-foreground mr-1">
          {renderInlines(first.inlines)}
        </strong>
        <span className="text-muted-foreground">
          {inlines.slice(1).map((node, i) => renderInline(node, i))}
        </span>
      </>
    );
  }
  return renderInlines(inlines);
}
function renderBulletContent(content) {
  if (content.length === 0) return null;
  const detailsIdx = content.findIndex((contentNode) => contentNode.kind === "details");
  if (detailsIdx === -1) {
    return renderBulletInlines(content);
  }
  const beforeInlines = content.slice(0, detailsIdx);
  const afterInlines = content.slice(detailsIdx + 1);
  const details = content[detailsIdx];
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
    .map((i) => {
      if (i.kind === "text") return i.value;
      if (i.kind === "bold") return inlinesToPlainText(i.inlines);
      return "";
    })
    .join("")
    .trim();
}
export function MigrationPopup({ popup, onClose }) {
  const { t } = useTranslation();
  const platform = usePlatform();
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
  const url = popup.action?.url ?? "";
  const trackedUrl = url;
  const primaryLabel = popup.action?.label ?? "";
  const handlePrimary = async () => {
    const decision = guardAccountSubmission("personal_checkout");
    if (!decision.allowed) return;
    trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_ACTION_CLICK, {
      popup_type: POPUP_TYPE,
      url: trackedUrl,
    });
    if (!url) {
      onClose();
      return;
    }
    try {
      const opened = await openExternalUrl(platform, url, {
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
      dedupedToast.error(t("serverPopup.errorToast"));
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
    inlinesToPlainText(titleBlock?.inlines) || t("serverPopup.a11yTitle");
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
                {bulletBlocks.map((bullet, i) => {
                  return (
                    <li
                      key={i}
                      className={`flex gap-2.5 py-2.5 text-xs leading-[1.55] text-foreground ${i < bulletBlocks.length - 1 ? "border-b border-dashed border-border" : ""}`}
                    >
                      <span className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center bg-foreground font-heading text-[10px] font-medium leading-none text-background">
                        {i + 1}
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
            <Button
              ref={primaryButtonRef}
              className="h-9 w-full text-[13px]"
              onClick={handlePrimary}
              disabled={!checkoutDecision.allowed}
              data-action-ui-id="server-popup.migration.primary"
            >
              {primaryLabel}
            </Button>
            {showRedeem && (
              <Button
                variant="outline"
                className="h-8 w-full text-xs"
                onClick={handleRedeem}
                loading={walletLoading}
                data-action-ui-id="server-popup.migration.redeem"
              >
                {t("mediaplan.migration.popup.redeemCta")}
              </Button>
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
