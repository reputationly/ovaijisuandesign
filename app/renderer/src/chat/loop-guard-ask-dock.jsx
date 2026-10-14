// loop-guard-ask-dock.jsx
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCheck, Repeat2 } from "../media-editing/lucide-icon-wraps.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  shouldIgnoreChatGlobalShortcut,
} from "../media-editing/message-list-props-equal.jsx";
import { Button } from "../infra/dialog-content.jsx";
import { CHAT_CONTENT_MAX_WIDTH_PX } from "./chat-content-width.jsx";
import { Kbd as KeyboardShortcut } from "../workspace/shortcut-hint.jsx";
import { RetryIcon } from "../workspace/use-prompt-icon.jsx";
export function LoopGuardAskDock({
  message,
  onSend,
  isPresented = true,
  shortcutsEnabled = true,
  submitting = false,
}) {
  const { t: translate } = useTranslation();
  const data = message.loopGuardData;
  const requestId = message.requestId;
  const sessionId = message.loopGuardSessionId;
  const dispatch = reactExports.useCallback(
    (decision) => {
      if (!requestId || !sessionId || submitting) return;
      onSend({
        type: "loop_guard_reply",
        id: requestId,
        decision,
        session_id: sessionId,
      });
    },
    [requestId, sessionId, submitting, onSend],
  );
  const handleAllowOnce = reactExports.useCallback(
    () => dispatch("allow_once"),
    [dispatch],
  );
  const handleAllowSession = reactExports.useCallback(
    () => dispatch("allow_session"),
    [dispatch],
  );
  const handleReject = reactExports.useCallback(
    () => dispatch("reject"),
    [dispatch],
  );
  const keydownRef = reactExports.useRef(() => {});
  keydownRef.current = (keyboardEvent) => {
    if (!isPresented || !shortcutsEnabled || submitting) return;
    const loopGuardTarget =
      keyboardEvent.target instanceof HTMLElement
        ? keyboardEvent.target.closest('[data-action-ui-id="chat-loop-guard-dock"]')
        : null;
    if (keyboardEvent.key === "Escape" && loopGuardTarget && !keyboardEvent.defaultPrevented) {
      keyboardEvent.preventDefault();
      handleReject();
      return;
    }
    if (shouldIgnoreChatGlobalShortcut(keyboardEvent)) return;
    if (keyboardEvent.key === "1" || keyboardEvent.key === "Enter") {
      keyboardEvent.preventDefault();
      handleAllowOnce();
      return;
    }
    if (keyboardEvent.key === "2") {
      keyboardEvent.preventDefault();
      handleAllowSession();
      return;
    }
    if (keyboardEvent.key === "3" || keyboardEvent.key === "Escape") {
      keyboardEvent.preventDefault();
      handleReject();
    }
  };
  reactExports.useEffect(() => {
    if (!isPresented || !shortcutsEnabled) return;
    const handler = (keyboardEvent) => keydownRef.current(keyboardEvent);
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isPresented, shortcutsEnabled]);
  if (!requestId || !sessionId || !data) return null;
  const recentToolsLabel = [...new Set(data.recent_tools)].join(", ") || "—";
  return (
    <div
      data-action-ui-id="chat-loop-guard-dock"
      aria-busy={submitting}
      className="bg-transparent pt-2"
    >
      <div
        data-action-ui-id="chat-loop-guard-dock-content"
        className="mx-auto w-full min-w-0 overflow-hidden rounded-xl border-solid border-border bg-card [border-width:var(--divider-width)]"
        style={{
          maxWidth: `${CHAT_CONTENT_MAX_WIDTH_PX}px`,
        }}
      >
        <div className="flex items-start gap-2 px-3 pt-3 pb-2.5">
          <Icon
            icon={Repeat2}
            size="md"
            className="mt-0.5 shrink-0 text-foreground opacity-70"
            aria-hidden={true}
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium leading-5 text-foreground">
              {translate("chat.loopGuard.title")}
            </h3>
            <p className="mt-1 text-body-12 leading-[18px] text-muted-foreground">
              {translate("chat.loopGuard.askPrimary", {
                tool: data.tool,
                hits: data.hits,
                window: data.window,
              })}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 px-3 pb-3">
          <Button
            type="button"
            variant="outline"
            data-action-ui-id="chat-loop-guard-allow-once"
            className="h-auto w-full justify-start gap-3 rounded-lg border-border bg-transparent px-3 py-2 text-left whitespace-normal hover:border-foreground hover:bg-muted/30"
            onClick={handleAllowOnce}
            disabled={submitting}
          >
            <span className="flex size-4 shrink-0 items-center justify-center text-foreground opacity-70">
              <Icon icon={ArrowRight} size="md" aria-hidden={true} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body-13 font-medium leading-5 text-foreground">
                {translate("chat.loopGuard.allowOnce")}
              </span>
              <span className="text-body-12 font-normal leading-[18px] text-muted-foreground">
                {translate("chat.loopGuard.allowOnceDesc")}
              </span>
            </span>
            <KeyboardShortcut className="ml-auto shrink-0 self-center">Enter</KeyboardShortcut>
          </Button>
          <Button
            type="button"
            variant="outline"
            data-action-ui-id="chat-loop-guard-allow-session"
            className="h-auto w-full justify-start gap-3 rounded-lg border-border bg-transparent px-3 py-2 text-left whitespace-normal hover:border-foreground hover:bg-muted/30"
            onClick={handleAllowSession}
            disabled={submitting}
          >
            <span className="flex size-4 shrink-0 items-center justify-center text-foreground opacity-70">
              <Icon icon={CheckCheck} size="md" aria-hidden={true} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body-13 font-medium leading-5 text-foreground">
                {translate("chat.loopGuard.allowSession")}
              </span>
              <span className="text-body-12 font-normal leading-[18px] text-muted-foreground">
                {translate("chat.loopGuard.allowSessionDesc")}
              </span>
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            data-action-ui-id="chat-loop-guard-reject"
            className="h-auto w-full justify-start gap-3 rounded-lg border-border bg-transparent px-3 py-2 text-left whitespace-normal hover:border-foreground hover:bg-muted/30"
            onClick={handleReject}
            disabled={submitting}
          >
            <span className="flex size-4 shrink-0 items-center justify-center text-destructive">
              <RetryIcon size={16} aria-hidden={true} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body-13 font-medium leading-5 text-foreground">
                {translate("chat.loopGuard.reject")}
              </span>
              <span className="text-body-12 font-normal leading-[18px] text-muted-foreground">
                {translate("chat.loopGuard.rejectDesc")}
              </span>
            </span>
            <KeyboardShortcut className="ml-auto shrink-0 self-center">Esc</KeyboardShortcut>
          </Button>
        </div>
        <Accordion className="border-t border-border">
          <AccordionItem value="technical-details" className="border-0">
            <AccordionTrigger
              data-action-ui-id="chat-loop-guard-technical-details"
              className="rounded-none px-3 py-2 text-caption-11 font-normal text-muted-foreground hover:bg-muted/30 hover:no-underline"
            >
              {translate("chat.loopGuard.technicalDetails")}
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-caption-11 leading-4">
                <dt className="text-muted-foreground">
                  {translate("chat.loopGuard.currentTool")}
                </dt>
                <dd className="break-all font-mono text-foreground/70">
                  {data.tool}
                </dd>
                <dt className="text-muted-foreground">
                  {translate("chat.loopGuard.recentTools")}
                </dt>
                <dd className="break-all font-mono text-foreground/70">
                  {recentToolsLabel}
                </dd>
              </dl>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
