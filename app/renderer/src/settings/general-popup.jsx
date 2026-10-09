// general-popup.jsx
import {
  dedupedToast,
  Markdown$1 as Markdown,
  remarkGfm,
  usePlatform,
  useTranslation,
} from "../vendor.js";
import { openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { rehypeSanitize } from "./request-prompt-prefill.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";
import { trackEvent } from "../infra/sanitize-track-props.js";
const POPUP_TYPE = "general";
export function GeneralPopup({ popup, onClose }) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const url2 = popup.action?.url ?? "";
  const label = popup.action?.label ?? "";
  const trackedUrl = url2;
  const handleAction = async () => {
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
        source: "server-popup.general",
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
  const handleCancel = () => {
    trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_DISMISS, {
      popup_type: POPUP_TYPE,
      url: trackedUrl,
      method: "cancel_button",
    });
    onClose();
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
  const visibleTitle = popup.title?.trim() || "";
  const a11yTitle =
    visibleTitle || popup.description || t2("serverPopup.a11yTitle");
  if (popup.cover_url) {
    return (
      <Dialog open={true} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-[760px] h-[480px] p-0 gap-0 grid grid-cols-[320px_1fr] overflow-hidden"
          showCloseButton={popup.can_close}
          data-action-ui-id="server-popup.general"
        >
          <div className="bg-muted overflow-hidden">
            <img
              src={popup.cover_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex h-[480px] flex-col">
            <DialogHeader className="sr-only">
              <DialogTitle>{a11yTitle}</DialogTitle>
              <DialogDescription>{popup.description}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-1 flex-col justify-center gap-3 px-8">
              {visibleTitle && (
                <h2 className="font-heading text-xl font-medium leading-tight text-foreground">
                  {visibleTitle}
                </h2>
              )}
              <div className="chat-markdown text-sm text-foreground [&_ol]:list-decimal [&_ul]:list-disc">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                >
                  {popup.description}
                </Markdown>
              </div>
            </div>
            <DialogFooter className="px-8 pb-6 sm:justify-end gap-2">
              {popup.can_close && (
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  data-action-ui-id="server-popup.general.cancel"
                >
                  {t2("common.cancel")}
                </Button>
              )}
              <Button
                onClick={handleAction}
                data-action-ui-id="server-popup.general.confirm"
              >
                {label}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-xl p-0 gap-0 overflow-hidden"
        showCloseButton={popup.can_close}
        data-action-ui-id="server-popup.general"
      >
        <DialogHeader className="px-8 pt-8 gap-3">
          {visibleTitle ? (
            <DialogTitle className="text-center font-heading text-xl font-medium leading-tight text-foreground">
              {visibleTitle}
            </DialogTitle>
          ) : (
            <DialogTitle className="sr-only">{a11yTitle}</DialogTitle>
          )}
          <DialogDescription
            render={<div />}
            className="chat-markdown text-left text-sm text-foreground [&_ol]:list-decimal [&_ul]:list-disc"
          >
            <Markdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
            >
              {popup.description}
            </Markdown>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="px-8 pt-6 pb-6 sm:justify-end gap-2">
          {popup.can_close && (
            <Button
              variant="outline"
              onClick={handleCancel}
              data-action-ui-id="server-popup.general.cancel"
            >
              {t2("common.cancel")}
            </Button>
          )}
          <Button
            onClick={handleAction}
            data-action-ui-id="server-popup.general.confirm"
          >
            {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
