// chat-empty-state.jsx
import { jsxRuntimeExports, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { DEFAULT_SESSION_NAME } from "../canvas/fullscreen-icon.jsx";
import { redactForCurrentRegion } from "../generation/replace-configured-model-names-for-current-region.js";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
import { EmptyChatRecommendations } from "./empty-chat-recommendations.jsx";
import {
  usePendingFirstMessage,
  useWorkspaceChatSelector,
} from "../assets/use-canvas-model-registry-hydration.js";
import { useChatReadiness } from "./chat-compliance-notice.jsx";
const BRAILLE_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const WAVE_FRAMES = [
  "⠁⠂⠄⡀",
  "⠂⠄⡀⢀",
  "⠄⡀⢀⠠",
  "⡀⢀⠠⠐",
  "⢀⠠⠐⠈",
  "⠠⠐⠈⠁",
  "⠐⠈⠁⠂",
  "⠈⠁⠂⠄",
];
const DNA_FRAMES = [
  "⠋⠉⠙⠚",
  "⠉⠙⠚⠒",
  "⠙⠚⠒⠂",
  "⠚⠒⠂⠂",
  "⠒⠂⠂⠒",
  "⠂⠂⠒⠲",
  "⠂⠒⠲⠴",
  "⠒⠲⠴⠤",
  "⠲⠴⠤⠄",
  "⠴⠤⠄⠋",
  "⠤⠄⠋⠉",
  "⠄⠋⠉⠙",
];
const SPINNERS = {
  braille: {
    frames: BRAILLE_FRAMES,
    interval: 80,
  },
  wave: {
    frames: WAVE_FRAMES,
    interval: 100,
  },
  dna: {
    frames: DNA_FRAMES,
    interval: 80,
  },
};
export function BrailleSpinner({ type: type2 = "braille", className = "" }) {
  const [frame2, setFrame2] = reactExports.useState(0);
  const spinner = SPINNERS[type2];
  reactExports.useEffect(() => {
    const timer2 = setInterval(() => {
      setFrame2((f2) => (f2 + 1) % spinner.frames.length);
    }, spinner.interval);
    return () => clearInterval(timer2);
  }, [spinner]);
  return (
    <span className={`font-mono inline-block ${className}`}>
      {spinner.frames[frame2]}
    </span>
  );
}
export function ChatEmptyState(props) {
  const { t: t2 } = useTranslation();
  const pendingFirstMessage = usePendingFirstMessage();
  const starting = useChatReadiness() === "starting";
  const composerHasText = useWorkspaceChatSelector(
    (chat) => chat.input.trim().length > 0,
  );
  if (!pendingFirstMessage || composerHasText) {
    return <EmptyChatRecommendations {...props} />;
  }
  return (
    <div className="flex w-full min-w-0 flex-col gap-3 py-4">
      <div
        data-action-ui-id="chat-message-user-pending"
        className="group/user px-4 flex flex-col items-end"
      >
        <div className="relative inline-flex max-w-3/4">
          <div className="max-h-[40vh] overflow-y-auto bg-foreground/5 px-3.5 py-2.5 rounded-xl text-body-15 font-normal text-foreground whitespace-pre-wrap break-words">
            {pendingFirstMessage}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 px-4 text-body-14 text-muted-foreground">
        <BrailleSpinner type="braille" className="text-xs text-tertiary" />
        <span className="text-shimmer text-muted-foreground">
          {starting
            ? t2(
                "chat.pendingFirstMessage.preparingRuntime",
                "Preparing your workspace...",
              )
            : t2("chat.pendingFirstMessage.sending", "Sending your message...")}
        </span>
      </div>
    </div>
  );
}
export function sessionDisplayName(session, t2) {
  if (session.name === DEFAULT_SESSION_NAME)
    return t2("chat.newChat", {
      defaultValue: "New Chat",
    });
  if (session.name) return redactForCurrentRegion(session.name);
  return t2("chat.sessionFallback", {
    id: session.id.slice(0, 6),
  });
}
export function FourCornerLoading({
  variant,
  size: size2 = "md",
  label,
  className,
}) {
  const classes = cn(
    "four-corner-loading",
    `is-${variant}`,
    `is-${size2}`,
    className,
  );
  const dots = (
    <>
      <span className="four-corner-loading-dot" />
      <span className="four-corner-loading-dot" />
      <span className="four-corner-loading-dot" />
      <span className="four-corner-loading-dot" />
    </>
  );
  if (label) {
    return (
      <span className={classes} role="status" aria-label={label}>
        {dots}
      </span>
    );
  }
  return (
    <span className={classes} aria-hidden={true}>
      {dots}
    </span>
  );
}
