// use-astra-send-gate.js
import {
  buildResourceDragItem,
  isCustomModelId,
  RESOURCE_DRAG_MIME,
} from "../text-editor/build-asr-gateway-request.js";
import reactExports from "react";
import { usePlatform } from "../infra/platform-context.js";
import { useTranslation } from "react-i18next";
import { dedupedToast, guardAccountSubmission } from "../infra/agent-http-client.js";
import { openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { useOptionalTeamAccount } from "../assets/credit-query-keys.jsx";
import {
  useMpSubscribeUrl,
  useMpSubscriptionWalletQuery,
} from "../team/hailuo-credit-row.jsx";
import { resolveActiveModelId } from "./use-model-catalog-scope-key.js";
import { useAgentModels } from "./media-model-selector.jsx";
import {
  agentModelMatchesSelection,
  normalizeAgentModelAccess,
  resolveAgentModelAccess,
} from "../infra/parse-connector-selection.js";
import { useActiveCustomModel } from "../team/copy-icon-button.jsx";

export function resolveLegacyInteractionReply(messages, requestId) {
  let changed = false;
  const next = messages.map((message) => {
    if (
      (message.type === "interact" || message.type === "confirm") &&
      message.requestId === requestId &&
      !message.resolved
    ) {
      changed = true;
      return {
        ...message,
        resolved: true,
      };
    }
    return message;
  });
  return changed ? next : messages;
}

export function useAgentModelMembershipAccess() {
  const { t: translate } = useTranslation();
  const platform = usePlatform();
  const { mpWallet, isError, isRefetchError } = useMpSubscriptionWalletQuery();
  const subscribeUrl = useMpSubscribeUrl();
  const teamAccount = useOptionalTeamAccount();
  const isReadyTeam = Boolean(
    teamAccount?.integrationEnabled &&
    teamAccount.viewModel.kind === "ready_team" &&
    teamAccount.activeScope &&
    teamAccount.accountDataVisible &&
    teamAccount.billingAvailable,
  );
  const privilegeType = mpWallet?.privilege_type;
  const membershipKnown =
    isReadyTeam || (privilegeType !== void 0 && !isError && !isRefetchError);
  const membershipState = !membershipKnown
    ? "unknown"
    : !isReadyTeam && privilegeType === 0
      ? "non-member"
      : "member";
  const guardAccess = reactExports.useCallback(
    (access, source) => {
      if (access?.requirement !== "membership") return true;
      if (!membershipKnown) {
        dedupedToast.error(translate("chat.astraMembershipUnavailable"));
        return false;
      }
      if (isReadyTeam || privilegeType !== 0) return true;
      if (!guardAccountSubmission("personal_checkout").allowed) return false;
      if (!subscribeUrl) {
        dedupedToast.error(translate("credits.walletUrlNotReady"));
        return false;
      }
      void openExternalUrl(platform, subscribeUrl, {
        source,
      });
      return false;
    },
    [membershipKnown, isReadyTeam, privilegeType, subscribeUrl, platform, translate],
  );
  return {
    membershipState,
    guardAccess,
  };
}

export function useAstraSendGate(modelId) {
  const { t: translate } = useTranslation();
  const activeCustomModel = useActiveCustomModel();
  const selectedId = resolveActiveModelId(modelId, activeCustomModel.data);
  // 第 264 轮：参照 4.0.0 在这里也调 useAgentModelCatalog（bundle 第 433497 行）——
  // 它是 GET /api/runtime/models 在该屏的第二个调用点。
  // 只有非自定义模型才需要内置目录。
  const catalog = useAgentModels(!isCustomModelId(selectedId));
  const selectedModel = catalog.data?.models.find((model) =>
    agentModelMatchesSelection(model, selectedId ?? catalog.data?.default),
  );
  // 参照：normalizeAgentModelAccess(selectedModel?.access)，取不到时回落到内置表
  const access =
    normalizeAgentModelAccess(selectedModel?.access) ??
    resolveAgentModelAccess(selectedId);
  const { isSuccess, isError, isFetching, refetch } = activeCustomModel;
  const { membershipState, guardAccess } = useAgentModelMembershipAccess();
  const requiresMembership =
    access?.requirement === "membership" && membershipState === "non-member";
  const sendGuard = reactExports.useCallback(() => {
    if (!isSuccess) {
      dedupedToast.error(translate("settings.models.loadFailed"));
      if (isError && !isFetching) {
        void refetch();
      }
      return false;
    }
    if (isCustomModelId(modelId)) {
      if (activeCustomModel.data?.applyStatus === "pending") {
        dedupedToast.error(translate("settings.models.applying"));
        return false;
      }
      if (activeCustomModel.data?.applyStatus === "failed") {
        dedupedToast.error(translate("settings.models.applyFailed"));
        return false;
      }
      if (
        !activeCustomModel.data?.models.some((model) =>
          agentModelMatchesSelection(model, modelId),
        )
      ) {
        dedupedToast.error(translate("settings.models.modelRemoved"));
        return false;
      }
    }
    if (!access) return true;
    return guardAccess(access, "chat.astra-send");
  }, [
    access,
    guardAccess,
    isSuccess,
    isError,
    isFetching,
    refetch,
    translate,
    modelId,
    activeCustomModel.data,
  ]);
  return {
    sendGuard,
    sendLabel: requiresMembership ? translate("chat.astraMembershipOnly") : void 0,
    sendTooltip: requiresMembership
      ? translate("chat.astraMembershipRequired")
      : void 0,
  };
}

function resolveResourceAbsolutePath(workspacePath, relativePath) {
  if (!workspacePath || !relativePath) return void 0;
  const base = workspacePath.replace(/[\\/]+$/, "");
  const trimmedPath = relativePath.replace(/^[\\/]+/, "");
  return `${base}/${trimmedPath}`;
}

export function canWriteResourceDragData(source) {
  const relativePath = source.relativePath?.trim();
  const resourceName = source.name?.trim();
  const absolutePath =
    source.absolutePath ??
    resolveResourceAbsolutePath(source.workspacePath, relativePath);
  return Boolean(relativePath && absolutePath && resourceName);
}

export function writeResourceDragData(event, source) {
  const relativePath = source.relativePath?.trim();
  const resourceName = source.name?.trim();
  const absolutePath =
    source.absolutePath ??
    resolveResourceAbsolutePath(source.workspacePath, relativePath);
  if (!relativePath || !absolutePath || !resourceName) return false;
  const item = buildResourceDragItem(
    absolutePath,
    relativePath,
    resourceName,
    false,
    source.assetId,
  );
  event.dataTransfer.setData(RESOURCE_DRAG_MIME, JSON.stringify([item]));
  event.dataTransfer.effectAllowed = "copy";
  if (event.currentTarget instanceof HTMLElement) {
    event.dataTransfer.setDragImage(
      event.currentTarget,
      event.currentTarget.offsetWidth / 2,
      event.currentTarget.offsetHeight / 2,
    );
  }
  return true;
}
