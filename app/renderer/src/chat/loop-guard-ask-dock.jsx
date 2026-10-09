// loop-guard-ask-dock.jsx
import {
  ArrowRight,
  CheckCheck,
  reactExports,
  Repeat2,
  useTranslation,
} from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  shouldIgnoreChatGlobalShortcut,
} from "../media-editing/message-list-props-equal.jsx";
import { Button$1 } from "../infra/dialog-content.jsx";
import { CHAT_CONTENT_MAX_WIDTH_PX } from "./ae.jsx";
import { Kbd } from "../workspace/shortcut-hint.jsx";
import { RetryIcon } from "../workspace/use-prompt-icon.jsx";

export function LoopGuardAskDock({
  message: message2,
  onSend,
  isPresented = true,
  shortcutsEnabled = true,
  submitting = false,
}) {
  const { t: t2 } = useTranslation();
  const data2 = message2.loopGuardData;
  const requestId = message2.requestId;
  const sessionId = message2.loopGuardSessionId;
  const dispatch2 = reactExports.useCallback(
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
    () => dispatch2("allow_once"),
    [dispatch2],
  );
  const handleAllowSession = reactExports.useCallback(
    () => dispatch2("allow_session"),
    [dispatch2],
  );
  const handleReject = reactExports.useCallback(
    () => dispatch2("reject"),
    [dispatch2],
  );
  const keydownRef = reactExports.useRef(() => {});
  keydownRef.current = (e2) => {
    if (!isPresented || !shortcutsEnabled || submitting) return;
    const loopGuardTarget =
      e2.target instanceof HTMLElement
        ? e2.target.closest('[data-action-ui-id="chat-loop-guard-dock"]')
        : null;
    if (e2.key === "Escape" && loopGuardTarget && !e2.defaultPrevented) {
      e2.preventDefault();
      handleReject();
      return;
    }
    if (shouldIgnoreChatGlobalShortcut(e2)) return;
    if (e2.key === "1" || e2.key === "Enter") {
      e2.preventDefault();
      handleAllowOnce();
      return;
    }
    if (e2.key === "2") {
      e2.preventDefault();
      handleAllowSession();
      return;
    }
    if (e2.key === "3" || e2.key === "Escape") {
      e2.preventDefault();
      handleReject();
    }
  };
  reactExports.useEffect(() => {
    if (!isPresented || !shortcutsEnabled) return;
    const handler = (e2) => keydownRef.current(e2);
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isPresented, shortcutsEnabled]);
  if (!requestId || !sessionId || !data2) return null;
  const recentToolsLabel = [...new Set(data2.recent_tools)].join(", ") || "—";
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
              {t2("chat.loopGuard.title")}
            </h3>
            <p className="mt-1 text-body-12 leading-[18px] text-muted-foreground">
              {t2("chat.loopGuard.askPrimary", {
                tool: data2.tool,
                hits: data2.hits,
                window: data2.window,
              })}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 px-3 pb-3">
          <Button$1
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
                {t2("chat.loopGuard.allowOnce")}
              </span>
              <span className="text-body-12 font-normal leading-[18px] text-muted-foreground">
                {t2("chat.loopGuard.allowOnceDesc")}
              </span>
            </span>
            <Kbd className="ml-auto shrink-0 self-center">Enter</Kbd>
          </Button$1>
          <Button$1
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
                {t2("chat.loopGuard.allowSession")}
              </span>
              <span className="text-body-12 font-normal leading-[18px] text-muted-foreground">
                {t2("chat.loopGuard.allowSessionDesc")}
              </span>
            </span>
          </Button$1>
          <Button$1
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
                {t2("chat.loopGuard.reject")}
              </span>
              <span className="text-body-12 font-normal leading-[18px] text-muted-foreground">
                {t2("chat.loopGuard.rejectDesc")}
              </span>
            </span>
            <Kbd className="ml-auto shrink-0 self-center">Esc</Kbd>
          </Button$1>
        </div>
        <Accordion className="border-t border-border">
          <AccordionItem value="technical-details" className="border-0">
            <AccordionTrigger
              data-action-ui-id="chat-loop-guard-technical-details"
              className="rounded-none px-3 py-2 text-caption-11 font-normal text-muted-foreground hover:bg-muted/30 hover:no-underline"
            >
              {t2("chat.loopGuard.technicalDetails")}
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-caption-11 leading-4">
                <dt className="text-muted-foreground">
                  {t2("chat.loopGuard.currentTool")}
                </dt>
                <dd className="break-all font-mono text-foreground/70">
                  {data2.tool}
                </dd>
                <dt className="text-muted-foreground">
                  {t2("chat.loopGuard.recentTools")}
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
