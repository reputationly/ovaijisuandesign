// chat-compliance-notice.jsx
import {
  API_PATHS,
  reactExports,
  Trans,
  usePlatform,
  useQuery,
  useTranslation,
} from "../vendor.js";
import { MessageInputBase } from "./message-input-base.jsx";
import { openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useRuntimeConfig } from "../generation/use-model-catalog-scope-key.js";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
import { getMediaUsageGuidelinesUrl } from "../workspace/shortcut-hint.jsx";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { useAuth } from "../assets/credit-query-keys.jsx";
import { useGatewayReady } from "../infra/inline-rename-input.jsx";
import { PENDING_AUTO_UPDATE_KEY } from "../generation/use-mention-models.jsx";
import { useWorkspaceWSConnection } from "../settings/changelog-table.jsx";
export const MessageInput = reactExports.memo(MessageInputBase);
MessageInput.displayName = "MessageInput";
export function isBillingPromotionActive(promotion, nowMs = Date.now()) {
  if (!promotion) return false;
  return (
    Number.isFinite(promotion.startTime) &&
    Number.isFinite(promotion.endTime) &&
    nowMs >= promotion.startTime &&
    nowMs <= promotion.endTime
  );
}
const EMPTY = {
  promotion: null,
  models: [],
};
function normalize(raw2) {
  if (!raw2 || typeof raw2 !== "object") return EMPTY;
  const obj = raw2;
  return {
    promotion: obj.promotion ?? null,
    models: Array.isArray(obj.models) ? obj.models : [],
  };
}
export function useBillingPromotion() {
  const gatewayReady = useGatewayReady();
  const { user, isLoggedIn, isLoading } = useAuth();
  const { data: data2 } = useQuery({
    queryKey: ["billing-promotion"],
    queryFn: async () => {
      try {
        const res = await gatewayFetch(API_PATHS.billingPromotion);
        if (!res.ok) return EMPTY;
        return normalize(await res.json());
      } catch {
        return EMPTY;
      }
    },
    enabled: gatewayReady && !isLoading && isLoggedIn && !!user?.userID,
    staleTime: 6e4,
    retry: false,
  });
  return data2?.promotion ?? null;
}
export function useActiveBillingPromotion() {
  const promotion = useBillingPromotion();
  return isBillingPromotionActive(promotion) ? promotion : null;
}
export function resolveChatReadiness(status, runtimeUnavailable) {
  if (runtimeUnavailable) return "runtime_unavailable";
  if (status.state !== "bound") return "starting";
  return status.readiness?.chat ?? "ready";
}
export function chatReadinessBlocksInput(readiness) {
  return readiness !== "ready";
}
const ChatReadinessContext = reactExports.createContext("ready");
export const ChatReadinessProvider = ChatReadinessContext.Provider;
export function useChatReadiness() {
  return reactExports.useContext(ChatReadinessContext);
}
export function useSkillReloadNotification(hasActiveSession) {
  const { subscribe: subscribe2 } = useWorkspaceWSConnection();
  const [pendingSkills, setPendingSkills] = reactExports.useState(null);
  reactExports.useEffect(() => {
    return subscribe2((msg) => {
      if (msg.type !== "skills_reload") return;
      const payload = msg;
      const names = payload.unloadedSkills ?? [];
      if (names.length === 0) return;
      if (payload.autoUpdate) {
        const pending2 = {
          updatedCount: names.length,
          updatedSkills: names,
          timestamp: Date.now(),
        };
        try {
          sessionStorage.setItem(
            PENDING_AUTO_UPDATE_KEY,
            JSON.stringify(pending2),
          );
        } catch {}
        return;
      }
      if (!hasActiveSession) {
        window.hilo.opencode
          .restart()
          .catch((e2) => console.error("OpenCode restart failed:", e2));
      } else {
        setPendingSkills(names);
      }
    });
  }, [subscribe2, hasActiveSession]);
  const reload = reactExports.useCallback(() => {
    window.hilo.opencode
      .restart()
      .catch((e2) => console.error("OpenCode restart failed:", e2));
    setPendingSkills(null);
  }, []);
  const dismiss = reactExports.useCallback(() => setPendingSkills(null), []);
  return {
    pendingSkills,
    reload,
    dismiss,
  };
}
export function ChatComplianceNotice() {
  const { i18n, t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const { channel, region } = useRuntimeConfig();
  const guidelinesUrl = getMediaUsageGuidelinesUrl(region, channel);
  const handleGuidelinesClick = reactExports.useCallback(
    (event) => {
      event.preventDefault();
      void openExternalUrl(platform2, guidelinesUrl, {
        source: "chat.compliance-guidelines",
      });
    },
    [guidelinesUrl, platform2],
  );
  return (
    <p
      data-action-ui-id="chat-compliance-notice"
      className={cn(
        "mt-px min-w-0 translate-y-1 px-2 text-center text-[10px] leading-4 text-muted-foreground/40 [overflow-wrap:anywhere] dark:text-muted-foreground/30",
        i18n.language.startsWith("zh")
          ? "tracking-[0.6px]"
          : i18n.language.startsWith("en") && "tracking-[0.2px]",
      )}
    >
      <Trans
        t={t2}
        i18nKey="chat.complianceNotice"
        components={{
          guidelines: (
            <a
              href={guidelinesUrl}
              data-action-ui-id="chat-compliance-guidelines-link"
              aria-label={t2("chat.complianceGuidelinesLink")}
              onClick={handleGuidelinesClick}
              className="-mx-1 inline cursor-pointer rounded-md px-1 py-0.5 text-muted-foreground/40 underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 dark:text-muted-foreground/30 dark:hover:text-foreground/60"
            >
              {t2("chat.complianceGuidelinesLink")}
            </a>
          ),
        }}
      />
    </p>
  );
}
