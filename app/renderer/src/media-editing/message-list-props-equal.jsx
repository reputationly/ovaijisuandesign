// message-list-props-equal.jsx
import {
  AccordionHeader,
  AccordionItem$1 as AccordionItemPrimitive,
  AccordionPanel,
  AccordionRoot,
  AccordionTrigger$1 as AccordionTriggerPrimitive,
  ChevronDownIcon$1 as ChevronDownIcon,
  ChevronUpIcon,
  RadioGroup$1 as RadioGroupPrimitive,
  RadioIndicator,
  RadioRoot,
  reactExports,
  useCurrentWorkspace,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { mergeTailwindClasses as mergeClassNames } from "../infra/dialog-content.jsx";
import { MessageListImpl } from "../chat/message-list-impl.jsx";
import { useGatewayScopeKey } from "../generation/use-model-catalog-scope-key.js";
import { useWorkspaceChatSelector } from "../assets/use-canvas-model-registry-hydration.js";
function messageListPropsEqual(prev, next) {
  if (
    prev.busy !== next.busy ||
    prev.busyLabel !== next.busyLabel ||
    prev.focusMessageId !== next.focusMessageId ||
    prev.isPresented !== next.isPresented ||
    prev.recovering !== next.recovering ||
    prev.focusedSessionId !== next.focusedSessionId ||
    prev.feedbackSessionId !== next.feedbackSessionId ||
    prev.feedbackWorkspaceDir !== next.feedbackWorkspaceDir ||
    prev.feedbackWorkspaceId !== next.feedbackWorkspaceId ||
    prev.onSend !== next.onSend ||
    prev.onRetry !== next.onRetry ||
    prev.onFork !== next.onFork ||
    prev.conversationTail !== next.conversationTail ||
    prev.turnTails !== next.turnTails ||
    prev.showTurnArtifacts !== next.showTurnArtifacts
  ) {
    return false;
  }
  if (prev.messages.length !== next.messages.length) return false;
  if (prev.messages === next.messages) return true;
  for (let messageIndex = prev.messages.length - 1; messageIndex >= 0; messageIndex--) {
    if (prev.messages[messageIndex] !== next.messages[messageIndex]) return false;
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
  const workspaceId = useGatewayScopeKey();
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
      feedbackWorkspaceId={workspaceId}
    />
  );
}
export function Accordion({ className, ...props }) {
  return (
    <AccordionRoot
      data-slot="accordion"
      className={mergeClassNames("flex w-full flex-col", className)}
      {...props}
    />
  );
}
export function AccordionItem({ className, ...props }) {
  return (
    <AccordionItemPrimitive
      data-slot="accordion-item"
      className={mergeClassNames(
        "not-last:[border-bottom-width:var(--divider-width)]",
        className,
      )}
      {...props}
    />
  );
}
export function AccordionTrigger({ className, children, ...props }) {
  return (
    <AccordionHeader className="flex">
      <AccordionTriggerPrimitive
        data-slot="accordion-trigger"
        className={mergeClassNames(
          "group/accordion-trigger relative flex flex-1 items-start justify-between rounded-lg border border-transparent py-2.5 text-left text-xs font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:after:border-ring aria-disabled:pointer-events-none aria-disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon
          data-slot="accordion-trigger-icon"
          className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
        />
        <ChevronUpIcon
          data-slot="accordion-trigger-icon"
          className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
        />
      </AccordionTriggerPrimitive>
    </AccordionHeader>
  );
}
export function AccordionContent({ className, children, ...props }) {
  return (
    <AccordionPanel
      data-slot="accordion-content"
      className="overflow-hidden text-xs data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div
        className={mergeClassNames(
          "h-(--accordion-panel-height) pt-0 pb-2.5 data-ending-style:h-0 data-starting-style:h-0 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          className,
        )}
      >
        {children}
      </div>
    </AccordionPanel>
  );
}
function isEditableTarget(target) {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
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
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={mergeClassNames("grid w-full gap-2", className)}
      {...props}
    />
  );
}
export function RadioGroupItem({ className, ...props }) {
  return (
    <RadioRoot
      data-slot="radio-group-item"
      className={mergeClassNames(
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
