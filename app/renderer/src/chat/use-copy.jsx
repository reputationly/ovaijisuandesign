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
  const copy2 = reactExports.useCallback(
    async (text2) => {
      if (!navigator.clipboard) return;
      try {
        await navigator.clipboard.writeText(text2);
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
    copy: copy2,
  };
}

export function collectAssistantCopyText(messages2) {
  return messages2
    .filter(
      (message2) =>
        message2.role === "agent" &&
        message2.type === "text" &&
        message2.content.trim().length > 0,
    )
    .map((message2) => message2.content.trim())
    .join("\n\n");
}

export function BottomAnchorButton({ state: state2, onClick }) {
  const { t: t2 } = useTranslation();
  const isScrolling = state2 === "scrolling-to-bottom";
  const ariaLabel = t2("chat.bottomAnchor.label", "回到最新消息");
  const handleClick2 = () => {
    if (isScrolling) return;
    onClick();
  };
  return (
    <button
      type="button"
      onClick={handleClick2}
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

export function ChatPresentationProvider({ children: children2, isPresented }) {
  return (
    <ChatPresentationContext.Provider value={isPresented}>
      {children2}
    </ChatPresentationContext.Provider>
  );
}

export function useChatPresentation() {
  return reactExports.useContext(ChatPresentationContext);
}

export function GenerationHandoffSummary({ targets }) {
  const { t: t2 } = useTranslation();
  const completedCount = useAssetMetadataStore((state22) => {
    let count2 = 0;
    for (const target of targets) {
      if (state22.assets.get(target.node_id)?.url) count2 += 1;
    }
    return count2;
  });
  const activeCount = useGeneratingStateStore((state22) => {
    let count2 = 0;
    for (const target of targets) {
      if (state22.byNode.has(target.node_id)) count2 += 1;
    }
    return count2;
  });
  const allCompleted =
    targets.length > 0 &&
    activeCount === 0 &&
    completedCount === targets.length;
  const state2 = allCompleted
    ? "completed"
    : activeCount > 0
      ? "generating"
      : "settled";
  return (
    <div
      className="flex min-w-0 flex-col gap-1"
      data-action-ui-id="chat-generation-handoff-summary"
      data-generation-state={state2}
    >
      <p className="text-body-14 text-muted-foreground">
        {state2 === "completed"
          ? t2("chat.activity.mediaGenHandoffCompletedDescription", {
              count: targets.length,
            })
          : t2("chat.activity.mediaGenInterruptedDescription")}
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
    return TIP_KEYS.filter((key2) => key2 !== IM_BRIDGE_TIP_KEY);
  }
  return TIP_KEYS;
}

function shuffleArray(arr) {
  const copy2 = [...arr];
  for (let i2 = copy2.length - 1; i2 > 0; i2--) {
    const j2 = Math.floor(Math.random() * (i2 + 1));
    [copy2[i2], copy2[j2]] = [copy2[j2], copy2[i2]];
  }
  return copy2;
}

function localizeShortcuts(text2) {
  if (IS_MAC) return text2;
  return text2
    .replace(/⌘⇧/g, "Ctrl+Shift+")
    .replace(/⌘/g, "Ctrl+")
    .replace(/⇧/g, "Shift+")
    .replace(/⌥/g, "Alt+")
    .replace(/Cmd\+Shift\+/g, "Ctrl+Shift+")
    .replace(/Cmd\+/g, "Ctrl+")
    .replace(/Option\+/g, "Alt+");
}

export function useChatTips(active2) {
  const { t: t2 } = useTranslation();
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
    const timer2 = setInterval(advance, ROTATION_INTERVAL_MS);
    return () => clearInterval(timer2);
  }, [active2]);
  if (!currentKey) return null;
  return localizeShortcuts(t2(currentKey));
}
