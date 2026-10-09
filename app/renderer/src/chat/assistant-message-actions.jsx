// assistant-message-actions.jsx
import {
  Check,
  Copy,
  dedupedToast,
  MonochromeIcon,
  reactExports,
  useTranslation,
} from "../vendor.js";
import {
  DropdownMenu,
  Icon,
  MoreVerticalIcon,
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { ChatRatingControls } from "./chat-rating-controls.jsx";
import { useCopy } from "./use-copy.jsx";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import { useFeedback } from "../settings/use-direct-feedback.jsx";

const HOVER_MENU_CLOSE_DELAY_MS = 150;

export function AssistantMessageActions({
  content: content2,
  requestId,
  alwaysVisible = false,
  ratingTarget,
}) {
  const { t: t2 } = useTranslation();
  const { openFeedback } = useFeedback();
  const { copied: messageCopied, copy: copyMessage } = useCopy();
  const handleRequestIdCopied = reactExports.useCallback(() => {
    dedupedToast.success(t2("chat.requestIdCopied"));
  }, [t2]);
  const { copied: requestIdCopied, copy: copyRequestId } = useCopy(
    handleRequestIdCopied,
  );
  const [menuOpen, setMenuOpen] = reactExports.useState(false);
  const [ratingOpen, setRatingOpen] = reactExports.useState(false);
  const openFrameRef = reactExports.useRef(null);
  const closeTimerRef = reactExports.useRef(null);
  const cancelScheduledOpen = reactExports.useCallback(() => {
    if (openFrameRef.current === null) return;
    cancelAnimationFrame(openFrameRef.current);
    openFrameRef.current = null;
  }, []);
  const cancelScheduledClose = reactExports.useCallback(() => {
    if (closeTimerRef.current === null) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);
  const handlePointerEnter = reactExports.useCallback(() => {
    cancelScheduledClose();
    if (menuOpen || openFrameRef.current !== null) return;
    openFrameRef.current = requestAnimationFrame(() => {
      openFrameRef.current = requestAnimationFrame(() => {
        openFrameRef.current = null;
        setMenuOpen(true);
      });
    });
  }, [cancelScheduledClose, menuOpen]);
  const handlePointerLeave = reactExports.useCallback(() => {
    cancelScheduledOpen();
    cancelScheduledClose();
    closeTimerRef.current = setTimeout(() => {
      setMenuOpen(false);
      closeTimerRef.current = null;
    }, HOVER_MENU_CLOSE_DELAY_MS);
  }, [cancelScheduledClose, cancelScheduledOpen]);
  const handleMenuOpenChange = reactExports.useCallback(
    (open) => {
      cancelScheduledOpen();
      if (open) cancelScheduledClose();
      setMenuOpen(open);
    },
    [cancelScheduledClose, cancelScheduledOpen],
  );
  reactExports.useEffect(
    () => () => {
      cancelScheduledOpen();
      cancelScheduledClose();
    },
    [cancelScheduledClose, cancelScheduledOpen],
  );
  const handleFeedback = reactExports.useCallback(() => {
    handleMenuOpenChange(false);
    openFeedback({
      source: "chat_message",
      context: requestId
        ? {
            message_id: requestId,
          }
        : void 0,
      logUploadReason: "chat_message_feedback",
    });
  }, [handleMenuOpenChange, openFeedback, requestId]);
  const copyLabel = t2(messageCopied ? "chat.copied" : "chat.copyMessage");
  return (
    <div
      data-action-ui-id="chat-assistant-actions"
      data-always-visible={alwaysVisible ? "true" : void 0}
      className={`flex items-center gap-1 pt-1 text-muted-foreground transition-opacity duration-150 ${alwaysVisible || menuOpen || ratingOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0 group-hover/assistant:pointer-events-auto group-hover/assistant:opacity-100 group-focus-within/assistant:pointer-events-auto group-focus-within/assistant:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100"}`}
    >
      {content2 && (
        <Tooltip>
          <TooltipTrigger
            closeOnClick={false}
            render={
              <button
                type="button"
                data-action-ui-id="chat-assistant-copy"
                onClick={() => void copyMessage(content2)}
                aria-label={copyLabel}
                className="icon-muted-control inline-flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              >
                <Icon
                  tone="control"
                  icon={messageCopied ? Check : Copy}
                  size="sm"
                  aria-hidden={true}
                />
              </button>
            }
          />
          <TooltipContent side="top">{copyLabel}</TooltipContent>
        </Tooltip>
      )}
      {ratingTarget && (
        <ChatRatingControls
          key={`${ratingTarget.sessionId}:${ratingTarget.requestId}`}
          target={ratingTarget}
          onOpenChange={setRatingOpen}
        />
      )}
      <div
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <DropdownMenu
          modal={false}
          open={menuOpen}
          onOpenChange={handleMenuOpenChange}
        >
          <DropdownMenuTrigger
            type="button"
            data-action-ui-id="chat-assistant-more"
            aria-label={t2("chat.moreActions")}
            className="icon-muted-control inline-flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 data-[popup-open]:bg-foreground/5 data-[popup-open]:text-foreground"
          >
            <MonochromeIcon tone="control">
              <MoreVerticalIcon size={14} />
            </MonochromeIcon>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            sideOffset={4}
            className="min-w-40 duration-[80ms] data-open:zoom-in-100 data-closed:zoom-out-100"
            data-action-ui-id="chat-assistant-actions-menu"
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
          >
            <DropdownMenuItem
              data-action-ui-id="chat-assistant-menu-copy"
              className="px-3 py-2 text-body-14 font-normal"
              onClick={() => void copyMessage(content2)}
            >
              {t2("chat.copyMessage")}
            </DropdownMenuItem>
            <DropdownMenuItem
              data-action-ui-id="chat-assistant-menu-feedback"
              className="px-3 py-2 text-body-14 font-normal"
              onClick={handleFeedback}
            >
              {t2("chat.submitFeedback")}
            </DropdownMenuItem>
            <DropdownMenuItem
              data-action-ui-id="chat-assistant-menu-copy-request-id"
              className="px-3 py-2 text-body-14 font-normal"
              disabled={!requestId}
              onClick={() => requestId && void copyRequestId(requestId)}
            >
              {t2(
                requestIdCopied ? "chat.requestIdCopied" : "chat.copyRequestId",
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
