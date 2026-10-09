// message-list-props-equal.jsx
import {
  AccordionHeader,
  AccordionItem$1,
  AccordionPanel,
  AccordionRoot,
  AccordionTrigger$1,
  ChevronDownIcon$1 as ChevronDownIcon,
  ChevronUpIcon,
  RadioGroup$1,
  RadioIndicator,
  RadioRoot,
  reactExports,
  useCurrentWorkspace,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
import { MessageListImpl } from "../chat/message-list-impl.jsx";
import { useGatewayScopeKey } from "../generation/use-model-catalog-scope-key.js";
import { useWorkspaceChatSelector } from "../assets/use-canvas-model-registry-hydration.js";
function messageListPropsEqual(prev, next2) {
  if (
    prev.busy !== next2.busy ||
    prev.busyLabel !== next2.busyLabel ||
    prev.focusMessageId !== next2.focusMessageId ||
    prev.isPresented !== next2.isPresented ||
    prev.recovering !== next2.recovering ||
    prev.focusedSessionId !== next2.focusedSessionId ||
    prev.feedbackSessionId !== next2.feedbackSessionId ||
    prev.feedbackWorkspaceDir !== next2.feedbackWorkspaceDir ||
    prev.feedbackWorkspaceId !== next2.feedbackWorkspaceId ||
    prev.onSend !== next2.onSend ||
    prev.onRetry !== next2.onRetry ||
    prev.onFork !== next2.onFork ||
    prev.conversationTail !== next2.conversationTail ||
    prev.turnTails !== next2.turnTails ||
    prev.showTurnArtifacts !== next2.showTurnArtifacts
  ) {
    return false;
  }
  if (prev.messages.length !== next2.messages.length) return false;
  if (prev.messages === next2.messages) return true;
  for (let i2 = prev.messages.length - 1; i2 >= 0; i2--) {
    if (prev.messages[i2] !== next2.messages[i2]) return false;
  }
  return true;
}
export const MessageList = reactExports.memo(
  MessageListImpl,
  messageListPropsEqual,
);
MessageList.displayName = "MessageList";
export function MessageListContainer(props) {
  const workspaceDir = useCurrentWorkspace();
  const workspaceId2 = useGatewayScopeKey();
  const feedbackSessionId = useWorkspaceChatSelector((chat) =>
    props.focusedSessionId
      ? chat.sessionStore.getState().sessions.get(props.focusedSessionId)
          ?.runtimeSessionId
      : void 0,
  );
  return (
    <MessageList
      {...props}
      feedbackSessionId={feedbackSessionId}
      feedbackWorkspaceDir={workspaceDir}
      feedbackWorkspaceId={workspaceId2}
    />
  );
}
export function Accordion({ className, ...props }) {
  return (
    <AccordionRoot
      data-slot="accordion"
      className={cn("flex w-full flex-col", className)}
      {...props}
    />
  );
}
export function AccordionItem({ className, ...props }) {
  return (
    <AccordionItem$1
      data-slot="accordion-item"
      className={cn(
        "not-last:[border-bottom-width:var(--divider-width)]",
        className,
      )}
      {...props}
    />
  );
}
export function AccordionTrigger({ className, children: children2, ...props }) {
  return (
    <AccordionHeader className="flex">
      <AccordionTrigger$1
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger relative flex flex-1 items-start justify-between rounded-lg border border-transparent py-2.5 text-left text-xs font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:after:border-ring aria-disabled:pointer-events-none aria-disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground",
          className,
        )}
        {...props}
      >
        {children2}
        <ChevronDownIcon
          data-slot="accordion-trigger-icon"
          className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
        />
        <ChevronUpIcon
          data-slot="accordion-trigger-icon"
          className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
        />
      </AccordionTrigger$1>
    </AccordionHeader>
  );
}
export function AccordionContent({ className, children: children2, ...props }) {
  return (
    <AccordionPanel
      data-slot="accordion-content"
      className="overflow-hidden text-xs data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div
        className={cn(
          "h-(--accordion-panel-height) pt-0 pb-2.5 data-ending-style:h-0 data-starting-style:h-0 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          className,
        )}
      >
        {children2}
      </div>
    </AccordionPanel>
  );
}
function isEditableTarget(target) {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable ||
    Boolean(target.closest('[contenteditable="true"]'))
  );
}
function isIndependentInteractiveTarget(target) {
  if (!target || !(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      'button, a[href], [role="button"], [role="dialog"], [role="menu"], [role="menuitem"], [role="option"], [role="tab"], [role="switch"], [role="slider"], [role="combobox"], [role="listbox"]',
    ),
  );
}
export function shouldIgnoreChatGlobalShortcut(event) {
  return (
    event.defaultPrevented ||
    isEditableTarget(event.target) ||
    isIndependentInteractiveTarget(event.target)
  );
}
export function RadioGroup({ className, ...props }) {
  return (
    <RadioGroup$1
      data-slot="radio-group"
      className={cn("grid w-full gap-2", className)}
      {...props}
    />
  );
}
export function RadioGroupItem({ className, ...props }) {
  return (
    <RadioRoot
      data-slot="radio-group-item"
      className={cn(
        "group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-input outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        className,
      )}
      {...props}
    >
      <RadioIndicator
        data-slot="radio-group-indicator"
        className="flex size-4 items-center justify-center"
      >
        <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
      </RadioIndicator>
    </RadioRoot>
  );
}
