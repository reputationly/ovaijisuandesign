// use-astra-send-gate.js
import {
  buildResourceDragItem,
  isCustomModelId,
  RESOURCE_DRAG_MIME,
} from "../text-editor/build-asr-gateway-request.js";
import { reactExports, usePlatform, useTranslation } from "../vendor.js";
import { dedupedToast, guardAccountSubmission } from "../infra/agent-http-client.js";
import { openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { useOptionalTeamAccount } from "../assets/credit-query-keys.jsx";
import {
  useMpSubscribeUrl,
  useMpSubscriptionWalletQuery,
} from "../team/hailuo-credit-row.jsx";
import { resolveActiveModelId } from "./use-model-catalog-scope-key.js";
import {
  agentModelMatchesSelection,
  resolveAgentModelAccess,
} from "../infra/parse-connector-selection.js";
import { useActiveCustomModel } from "../team/copy-icon-button.jsx";

export function resolveLegacyInteractionReply(messages2, requestId) {
  let changed = false;
  const next2 = messages2.map((message2) => {
    if (
      (message2.type === "interact" || message2.type === "confirm") &&
      message2.requestId === requestId &&
      !message2.resolved
    ) {
      changed = true;
      return {
        ...message2,
        resolved: true,
      };
    }
    return message2;
  });
  return changed ? next2 : messages2;
}

export function useAgentModelMembershipAccess() {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
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
        dedupedToast.error(t2("chat.astraMembershipUnavailable"));
        return false;
      }
      if (isReadyTeam || privilegeType !== 0) return true;
      if (!guardAccountSubmission("personal_checkout").allowed) return false;
      if (!subscribeUrl) {
        dedupedToast.error(t2("credits.walletUrlNotReady"));
        return false;
      }
      void openExternalUrl(platform2, subscribeUrl, {
        source,
      });
      return false;
    },
    [membershipKnown, isReadyTeam, privilegeType, subscribeUrl, platform2, t2],
  );
  return {
    membershipState,
    guardAccess,
  };
}

export function useAstraSendGate(modelId) {
  const { t: t2 } = useTranslation();
  const activeCustomModel = useActiveCustomModel();
  const access = resolveAgentModelAccess(
    resolveActiveModelId(modelId, activeCustomModel.data),
  );
  const { isSuccess, isError, isFetching, refetch } = activeCustomModel;
  const { membershipState, guardAccess } = useAgentModelMembershipAccess();
  const requiresMembership =
    access?.requirement === "membership" && membershipState === "non-member";
  const sendGuard = reactExports.useCallback(() => {
    if (!isSuccess) {
      dedupedToast.error(t2("settings.models.loadFailed"));
      if (isError && !isFetching) {
        void refetch();
      }
      return false;
    }
    if (isCustomModelId(modelId)) {
      if (activeCustomModel.data?.applyStatus === "pending") {
        dedupedToast.error(t2("settings.models.applying"));
        return false;
      }
      if (activeCustomModel.data?.applyStatus === "failed") {
        dedupedToast.error(t2("settings.models.applyFailed"));
        return false;
      }
      if (
        !activeCustomModel.data?.models.some((model) =>
          agentModelMatchesSelection(model, modelId),
        )
      ) {
        dedupedToast.error(t2("settings.models.modelRemoved"));
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
    t2,
    modelId,
    activeCustomModel.data,
  ]);
  return {
    sendGuard,
    sendLabel: requiresMembership ? t2("chat.astraMembershipOnly") : void 0,
    sendTooltip: requiresMembership
      ? t2("chat.astraMembershipRequired")
      : void 0,
  };
}

function resolveResourceAbsolutePath(workspacePath, relativePath) {
  if (!workspacePath || !relativePath) return void 0;
  const base2 = workspacePath.replace(/[\\/]+$/, "");
  const rel = relativePath.replace(/^[\\/]+/, "");
  return `${base2}/${rel}`;
}

export function canWriteResourceDragData(source) {
  const relativePath = source.relativePath?.trim();
  const name2 = source.name?.trim();
  const absolutePath =
    source.absolutePath ??
    resolveResourceAbsolutePath(source.workspacePath, relativePath);
  return Boolean(relativePath && absolutePath && name2);
}

export function writeResourceDragData(event, source) {
  const relativePath = source.relativePath?.trim();
  const name2 = source.name?.trim();
  const absolutePath =
    source.absolutePath ??
    resolveResourceAbsolutePath(source.workspacePath, relativePath);
  if (!relativePath || !absolutePath || !name2) return false;
  const item = buildResourceDragItem(
    absolutePath,
    relativePath,
    name2,
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
