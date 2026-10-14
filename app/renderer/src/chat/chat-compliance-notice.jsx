// chat-compliance-notice.jsx
import { Trans } from "react-i18next";
import { API_PATHS } from "../infra/workspace-gateway.js";
import { usePlatform } from "../infra/platform-context.js";
import reactExports from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MessageInputBase } from "./message-input-base.jsx";
import { openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useRuntimeConfig } from "../generation/use-model-catalog-scope-key.js";
import { mergeTailwindClasses as mergeClassNames } from "../infra/dialog-content.jsx";
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
function normalize(raw) {
  if (!raw || typeof raw !== "object") return EMPTY;
  const promotionPayload = raw;
  return {
    promotion: promotionPayload.promotion ?? null,
    models: Array.isArray(promotionPayload.models) ? promotionPayload.models : [],
  };
}
export function useBillingPromotion() {
  const gatewayReady = useGatewayReady();
  const { user, isLoggedIn, isLoading } = useAuth();
  const { data } = useQuery({
    queryKey: ["billing-promotion"],
    queryFn: async () => {
      try {
        const response = await gatewayFetch(API_PATHS.billingPromotion);
        if (!response.ok) return EMPTY;
        return normalize(await response.json());
      } catch {
        return EMPTY;
      }
    },
    enabled: gatewayReady && !isLoading && isLoggedIn && !!user?.userID,
    staleTime: 6e4,
    retry: false,
  });
  return data?.promotion ?? null;
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
  const { subscribe } = useWorkspaceWSConnection();
  const [pendingSkills, setPendingSkills] = reactExports.useState(null);
  reactExports.useEffect(() => {
    return subscribe((message) => {
      if (message.type !== "skills_reload") return;
      const payload = message;
      const names = payload.unloadedSkills ?? [];
      if (names.length === 0) return;
      if (payload.autoUpdate) {
        const pending = {
          updatedCount: names.length,
          updatedSkills: names,
          timestamp: Date.now(),
        };
        try {
          sessionStorage.setItem(
            PENDING_AUTO_UPDATE_KEY,
            JSON.stringify(pending),
          );
        } catch {}
        return;
      }
      if (!hasActiveSession) {
        window.hilo.opencode
          .restart()
          .catch((error) => console.error("OpenCode restart failed:", error));
      } else {
        setPendingSkills(names);
      }
    });
  }, [subscribe, hasActiveSession]);
  const reload = reactExports.useCallback(() => {
    window.hilo.opencode
      .restart()
      .catch((error) => console.error("OpenCode restart failed:", error));
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
  const { i18n, t: translate } = useTranslation();
  const platform = usePlatform();
  const { channel, region } = useRuntimeConfig();
  const guidelinesUrl = getMediaUsageGuidelinesUrl(region, channel);
  const handleGuidelinesClick = reactExports.useCallback(
    (event) => {
      event.preventDefault();
      void openExternalUrl(platform, guidelinesUrl, {
        source: "chat.compliance-guidelines",
      });
    },
    [guidelinesUrl, platform],
  );
  return (
    <p
      data-action-ui-id="chat-compliance-notice"
      className={mergeClassNames(
        "mt-px min-w-0 translate-y-1 px-2 text-center text-[10px] leading-4 text-muted-foreground/40 [overflow-wrap:anywhere] dark:text-muted-foreground/30",
        i18n.language.startsWith("zh")
          ? "tracking-[0.6px]"
          : i18n.language.startsWith("en") && "tracking-[0.2px]",
      )}
    >
      <Trans
        t={translate}
        i18nKey="chat.complianceNotice"
        components={{
          guidelines: (
            <a
              href={guidelinesUrl}
              data-action-ui-id="chat-compliance-guidelines-link"
              aria-label={translate("chat.complianceGuidelinesLink")}
              onClick={handleGuidelinesClick}
              className="-mx-1 inline cursor-pointer rounded-md px-1 py-0.5 text-muted-foreground/40 underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 dark:text-muted-foreground/30 dark:hover:text-foreground/60"
            >
              {translate("chat.complianceGuidelinesLink")}
            </a>
          ),
        }}
      />
    </p>
  );
}
