// 工作流署名与许可证的悬浮说明。
import { useTranslation, reactExports, ExternalLink, usePlatform } from "../vendor.js";
import { Button } from "../infra/dialog-content.jsx";
import { Icon, openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { Popover } from "../assets/credit-query-keys.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
import { PopoverTitle } from "../canvas/popover-title.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { comfyUiLicenseKey } from "./workflow-card-helpers.js";
const LICENSE_POPOVER_CLOSE_DELAY_MS = 120;
export function AttributionLicenseControl({
  attributionId,
  licenses,
  onInteractionEnter,
  onInteractionLeave,
  onOpenExternal,
}) {
  const { t } = useTranslation();
  const hasLicenses = licenses.length > 0;
  const licenseTriggerRef = reactExports.useRef(null);
  const licenseCloseTimerRef = reactExports.useRef(null);
  const [licenseDetailsOpen, setLicenseDetailsOpen] = reactExports.useState(false);
  const clearLicenseCloseTimer = () => {
    if (licenseCloseTimerRef.current) {
      clearTimeout(licenseCloseTimerRef.current);
      licenseCloseTimerRef.current = null;
    }
  };
  const handleLicenseDetailsEnter = () => {
    clearLicenseCloseTimer();
    setLicenseDetailsOpen(true);
    onInteractionEnter?.();
  };
  const handleLicenseDetailsLeave = () => {
    clearLicenseCloseTimer();
    licenseCloseTimerRef.current = setTimeout(() => {
      setLicenseDetailsOpen(false);
      licenseCloseTimerRef.current = null;
    }, LICENSE_POPOVER_CLOSE_DELAY_MS);
    onInteractionLeave?.();
  };
  reactExports.useEffect(
    () => () => {
      if (licenseCloseTimerRef.current) clearTimeout(licenseCloseTimerRef.current);
    },
    [],
  );
  if (!hasLicenses) return null;
  return (
    <span
      className="flex shrink-0 items-center gap-1"
      data-action-ui-id={`workflows-attribution-license-entry-${attributionId}`}
    >
      <span aria-hidden="true" className="text-[11px] font-normal text-muted-foreground">
        ·
      </span>
      <Popover open={licenseDetailsOpen} onOpenChange={setLicenseDetailsOpen}>
        <Button
          ref={licenseTriggerRef}
          type="button"
          variant="ghost"
          className="-my-1 h-auto shrink-0 rounded-md border-0 px-1.5 py-1 text-[11px] font-normal text-muted-foreground hover:bg-foreground/5 hover:text-muted-foreground hover:underline disabled:cursor-default disabled:opacity-100"
          aria-label={t("workflows.attribution.licenseAgreement")}
          aria-expanded={licenseDetailsOpen}
          aria-haspopup="dialog"
          onMouseEnter={handleLicenseDetailsEnter}
          onMouseLeave={handleLicenseDetailsLeave}
          onFocus={handleLicenseDetailsEnter}
          onBlur={handleLicenseDetailsLeave}
          onClick={handleLicenseDetailsEnter}
          data-action-ui-id={`workflows-attribution-license-trigger-${attributionId}`}
        >
          {t("workflows.attribution.licenseAgreement")}
        </Button>
        {licenseDetailsOpen ? (
          <PopoverContent
            anchor={licenseTriggerRef}
            side="top"
            align="start"
            sideOffset={6}
            initialFocus={false}
            finalFocus={false}
            className="relative w-80 max-w-[calc(100vw-2rem)] gap-0 p-1"
            data-action-ui-id="workflows-attribution-license-details"
            onMouseEnter={handleLicenseDetailsEnter}
            onMouseLeave={handleLicenseDetailsLeave}
            onFocusCapture={handleLicenseDetailsEnter}
            onBlurCapture={handleLicenseDetailsLeave}
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-full h-1.5"
              data-action-ui-id="workflows-attribution-license-hover-bridge"
            />
            <PopoverTitle className="px-2 py-1.5">
              {t("workflows.attribution.licenses")}
            </PopoverTitle>
            <div className="max-h-72 space-y-0.5 overflow-y-auto">
              {licenses.map((license) => (
                <Button
                  key={comfyUiLicenseKey(license)}
                  type="button"
                  variant="ghost"
                  className="h-auto w-full items-start justify-start gap-2 rounded-sm border-0 px-2 py-2.5 text-left whitespace-normal hover:bg-popup-item-hover"
                  aria-label={t("workflows.attribution.viewNamedLicense", {
                    name: license.name,
                  })}
                  onClick={() => {
                    onOpenExternal(license.url, `workflows.license.${license.id}`);
                    setLicenseDetailsOpen(false);
                  }}
                  data-action-ui-id={`workflows-attribution-license-${license.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">{license.name}</p>
                    <p className="mt-1 line-clamp-3 break-words text-[11px] leading-4 text-muted-foreground">
                      {license.notice ?? t("workflows.attribution.noLicenseNotice")}
                    </p>
                  </div>
                  <Icon
                    icon={ExternalLink}
                    size="sm"
                    strokeWidth={1.5}
                    className="mt-0.5 shrink-0 text-muted-foreground"
                    aria-hidden={true}
                  />
                </Button>
              ))}
            </div>
          </PopoverContent>
        ) : null}
      </Popover>
    </span>
  );
}
const ATTRIBUTION_POPOVER_CLOSE_DELAY_MS = 160;
export function WorkflowCardAttributionPopover({ attributions, workflowId }) {
  const { t } = useTranslation();
  const platform = usePlatform();
  const triggerRef = reactExports.useRef(null);
  const closeTimerRef = reactExports.useRef(null);
  const [open, setOpen] = reactExports.useState(false);
  const clearCloseTimer = () => {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };
  const handleEnter = () => {
    clearCloseTimer();
    setOpen(true);
  };
  const handleLeave = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, ATTRIBUTION_POPOVER_CLOSE_DELAY_MS);
  };
  reactExports.useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );
  const disclaimer = t("workflows.attribution.communityAdapted");
  const handleOpenLicense = (url, source) => {
    void openExternalUrl(platform, url, {
      source,
    });
    setOpen(false);
  };
  if (attributions.length === 0) {
    return (
      <div className="mt-auto min-w-0 pt-2">
        <p
          className="w-fit max-w-full truncate text-xs leading-4 text-muted-foreground"
          data-action-ui-id={`workflows-card-attribution-disclaimer-${workflowId}`}
        >
          {disclaimer}
        </p>
      </div>
    );
  }
  return (
    <div className="relative z-20 mt-auto min-w-0 pt-2">
      <Popover open={open} onOpenChange={setOpen}>
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          className="-ml-1.5 h-auto max-w-full min-w-0 justify-start rounded-md border-0 bg-transparent px-1.5 py-1 text-xs leading-4 font-normal text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          aria-label={disclaimer}
          aria-expanded={open}
          aria-haspopup="dialog"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          onFocus={handleEnter}
          onBlur={handleLeave}
          onClick={handleEnter}
          data-action-ui-id={`workflows-card-attribution-disclaimer-${workflowId}`}
        >
          <span className="truncate">{disclaimer}</span>
        </Button>
        {open ? (
          <PopoverContent
            anchor={triggerRef}
            side="bottom"
            align="start"
            sideOffset={6}
            initialFocus={false}
            finalFocus={false}
            className="relative w-80 max-w-[calc(100vw-2rem)] gap-2 p-2.5"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            onFocusCapture={handleEnter}
            onBlurCapture={handleLeave}
            data-action-ui-id={`workflows-card-attributions-${workflowId}`}
          >
            <span aria-hidden="true" className="absolute inset-x-0 bottom-full h-1.5" />
            <PopoverTitle className="px-1 py-0.5 text-xs">
              {t("workflows.attribution.title")}
            </PopoverTitle>
            <div className="max-h-44 min-w-0 overflow-y-auto rounded-lg bg-muted">
              {attributions.map((attribution) => {
                const metadata = [
                  t(`workflows.attribution.sourceKind.${attribution.sourceKind}`),
                  t(`workflows.attribution.role.${attribution.role}`),
                  ...(attribution.modified ? [t("workflows.attribution.modified")] : []),
                ].join(" · ");
                return (
                  <article key={attribution.id} className="min-w-0 px-3 py-3">
                    {attribution.url ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="-ml-1 h-auto max-w-full min-w-0 shrink justify-start rounded-sm border-0 px-1 py-0 text-xs font-medium text-foreground hover:bg-foreground/5 hover:underline"
                        aria-label={t("workflows.attribution.viewNamedSource", {
                          name: attribution.name,
                        })}
                        onClick={() => {
                          if (!attribution.url) return;
                          void openExternalUrl(platform, attribution.url, {
                            source: `workflows.card.attribution.${attribution.id}`,
                          });
                          setOpen(false);
                        }}
                        data-action-ui-id={`workflows-card-attribution-source-${attribution.id}`}
                      >
                        <span className="truncate">{attribution.name}</span>
                      </Button>
                    ) : (
                      <p className="truncate text-xs font-medium text-foreground">
                        {attribution.name}
                      </p>
                    )}
                    <div className="mt-1 flex min-w-0 items-center gap-1.5">
                      <p className="min-w-0 truncate text-[11px] text-muted-foreground">
                        {metadata}
                      </p>
                      <AttributionLicenseControl
                        attributionId={attribution.id}
                        licenses={attribution.licenses ?? []}
                        onInteractionEnter={handleEnter}
                        onInteractionLeave={handleLeave}
                        onOpenExternal={handleOpenLicense}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </PopoverContent>
        ) : null}
      </Popover>
    </div>
  );
}
