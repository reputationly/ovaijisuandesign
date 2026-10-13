// use-copy.jsx
import { ArrowDown, getRuntimeConfig, reactExports, useTranslation } from "../vendor.js";
import { useAssetMetadataStore } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { isMacPlatform } from "../workspace/shortcut-hint.jsx";
import { useGeneratingStateStore } from "../media-editing/package.jsx";

export function useCopy(onCopied) {
  const [copied, setCopied] = reactExports.useState(false);
  const mountedRef = reactExports.useRef(false);
  const resetTimerRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    };
  }, []);
  const copy = reactExports.useCallback(
    async (text) => {
      if (!navigator.clipboard) return;
      try {
        await navigator.clipboard.writeText(text);
        if (!mountedRef.current) return;
        if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current);
        setCopied(true);
        resetTimerRef.current = setTimeout(() => {
          resetTimerRef.current = null;
          setCopied(false);
        }, 1500);
        onCopied?.();
      } catch {}
    },
    [onCopied],
  );
  return {
    copied,
    copy,
  };
}

export function collectAssistantCopyText(messages) {
  return messages
    .filter(
      (message) =>
        message.role === "agent" &&
        message.type === "text" &&
        message.content.trim().length > 0,
    )
    .map((message) => message.content.trim())
    .join("\n\n");
}

export function BottomAnchorButton({ state, onClick }) {
  const { t: translate } = useTranslation();
  const isScrolling = state === "scrolling-to-bottom";
  const ariaLabel = translate("chat.bottomAnchor.label", "回到最新消息");
  const handleClick = () => {
    if (isScrolling) return;
    onClick();
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-busy={isScrolling}
      data-action-ui-id="chat-bottom-anchor-button"
      className="flex size-8 items-center justify-center rounded-full bg-card border border-border shadow-xs transition-colors hover:bg-muted animate-[bottom-anchor-in_150ms_ease-out]"
    >
      <ArrowDown size={16} strokeWidth={1.75} className="text-foreground" />
    </button>
  );
}

const ChatPresentationContext = reactExports.createContext(true);

export function ChatPresentationProvider({ children, isPresented }) {
  return (
    <ChatPresentationContext.Provider value={isPresented}>
      {children}
    </ChatPresentationContext.Provider>
  );
}

export function useChatPresentation() {
  return reactExports.useContext(ChatPresentationContext);
}

export function GenerationHandoffSummary({ targets }) {
  const { t: translate } = useTranslation();
  const completedCount = useAssetMetadataStore((state) => {
    let count = 0;
    for (const target of targets) {
      if (state.assets.get(target.node_id)?.url) count += 1;
    }
    return count;
  });
  const activeCount = useGeneratingStateStore((state) => {
    let count = 0;
    for (const target of targets) {
      if (state.byNode.has(target.node_id)) count += 1;
    }
    return count;
  });
  const allCompleted =
    targets.length > 0 &&
    activeCount === 0 &&
    completedCount === targets.length;
  const state = allCompleted
    ? "completed"
    : activeCount > 0
      ? "generating"
      : "settled";
  return (
    <div
      className="flex min-w-0 flex-col gap-1"
      data-action-ui-id="chat-generation-handoff-summary"
      data-generation-state={state}
    >
      <p className="text-body-14 text-muted-foreground">
        {state === "completed"
          ? translate("chat.activity.mediaGenHandoffCompletedDescription", {
              count: targets.length,
            })
          : translate("chat.activity.mediaGenInterruptedDescription")}
      </p>
    </div>
  );
}

const ROTATION_INTERVAL_MS = 8e3;

const IS_MAC = isMacPlatform();

const TIP_KEYS = [
  "chat.tips.agent.1",
  "chat.tips.agent.2",
  "chat.tips.agent.3",
  "chat.tips.agent.4",
  "chat.tips.input.2",
  "chat.tips.input.3",
  "chat.tips.asset.5",
  "chat.tips.system.1",
  "chat.tips.system.3",
  "chat.tips.system.5",
  "chat.tips.system.6",
  "chat.tips.discovery.1",
  "chat.tips.discovery.4",
  "chat.tips.discovery.5",
  "chat.tips.discovery.8",
  "chat.tips.discovery.9",
  "chat.tips.discovery.10",
  "chat.tips.discovery.11",
  "chat.tips.skill.1",
  "chat.tips.skill.3",
  "chat.tips.skill.4",
  "chat.tips.plugin.1",
  "chat.tips.assetCenter.1",
  "chat.tips.assetCenter.3",
];

const IM_BRIDGE_TIP_KEY = "chat.tips.system.5";

function availableTipKeys() {
  if (getRuntimeConfig().region === "overseas") {
    return TIP_KEYS.filter((key) => key !== IM_BRIDGE_TIP_KEY);
  }
  return TIP_KEYS;
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function localizeShortcuts(text) {
  if (IS_MAC) return text;
  return text
    .replace(/⌘⇧/g, "Ctrl+Shift+")
    .replace(/⌘/g, "Ctrl+")
    .replace(/⇧/g, "Shift+")
    .replace(/⌥/g, "Alt+")
    .replace(/Cmd\+Shift\+/g, "Ctrl+Shift+")
    .replace(/Cmd\+/g, "Ctrl+")
    .replace(/Option\+/g, "Alt+");
}

export function useChatTips(active) {
  const { t: translate } = useTranslation();
  const poolRef = reactExports.useRef(shuffleArray(availableTipKeys()));
  const indexRef = reactExports.useRef(0);
  const [currentKey, setCurrentKey] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const advance = () => {
      setCurrentKey(poolRef.current[indexRef.current]);
      indexRef.current += 1;
      if (indexRef.current >= poolRef.current.length) {
        poolRef.current = shuffleArray(availableTipKeys());
        indexRef.current = 0;
      }
    };
    advance();
    const timer = setInterval(advance, ROTATION_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [active]);
  if (!currentKey) return null;
  return localizeShortcuts(translate(currentKey));
}
