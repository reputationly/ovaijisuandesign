// use-feature-popup-action.js
import {
  claimHailuo03VideoTrial,
  fetchHailuo03VideoTrialStatus,
  H3_LAUNCH_POPUP_ID,
  HAILUO03_VIDEO_TRIAL_QUERY_KEY,
  hasShownTrialGranted,
} from "./normalize-hailuo03-video-trial-eligibility.js";
import { CHANGE_EVENT, PENDING_KEY } from "./use-auto-announcement.js";
import {
  KEY_PREFIX,
  requestPromptPrefill,
  requestRandomInspiration,
} from "./request-prompt-prefill.jsx";
import {
  dedupedToast,
  reactExports,
  useNavigate,
  usePlatform,
  useQuery,
  useQueryClient,
  useStorage,
  useTranslation,
} from "../vendor.js";
import { openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { useAuth } from "../assets/credit-query-keys.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { useProjectArchiveActions } from "../workspace/use-project-archive-actions.js";
function buildKey(userID, popupId) {
  return `${KEY_PREFIX}${userID}:${popupId}`;
}
function isClaimed(userID, popupId) {
  if (!userID || !popupId) return false;
  try {
    return window.localStorage.getItem(buildKey(userID, popupId)) === "1";
  } catch {
    return false;
  }
}
function markClaimed(userID, popupId) {
  if (!userID || !popupId) return;
  try {
    window.localStorage.setItem(buildKey(userID, popupId), "1");
  } catch {}
}
function isProjectArchiveUrl(url2) {
  try {
    return new URL(url2).pathname.toLowerCase().endsWith(".zip");
  } catch {
    return false;
  }
}
function bundledProjectTemplateForAction(popupId, url2) {
  return popupId === H3_LAUNCH_POPUP_ID && isProjectArchiveUrl(url2)
    ? "h3-playground"
    : null;
}
function requestTrialGrantedPopup(userID) {
  if (!userID || hasShownTrialGranted(userID)) return;
  try {
    window.sessionStorage.setItem(PENDING_KEY, userID);
  } catch {}
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}
export function useFeaturePopupAction(popup, { source }) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const [, setConfig] = useStorage("global.config");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { runImportBundledProject, runImportFromUrl } =
    useProjectArchiveActions();
  const queryClient2 = useQueryClient();
  const actionPendingRef = reactExports.useRef(false);
  const inspirationAbortRef = reactExports.useRef(null);
  reactExports.useEffect(() => () => inspirationAbortRef.current?.abort(), []);
  const [isPending, setIsPending] = reactExports.useState(false);
  const [locallyClaimedKey, setLocallyClaimedKey] = reactExports.useState(null);
  const userID = user?.userID ?? "";
  const claimKey = popup && userID ? `${userID}:${popup.id}` : "";
  const isH3TrialPopup = popup?.id === H3_LAUNCH_POPUP_ID;
  const trialStatusQuery = useQuery({
    queryKey: HAILUO03_VIDEO_TRIAL_QUERY_KEY,
    queryFn: fetchHailuo03VideoTrialStatus,
    retry: 2,
    staleTime: 0,
    enabled: isH3TrialPopup,
  });
  const claimed = Boolean(
    popup &&
    isH3TrialPopup &&
    (trialStatusQuery.data?.claimed === true ||
      (userID &&
        (locallyClaimedKey === claimKey || isClaimed(userID, popup.id)))),
  );
  const action = popup
    ? claimed && popup.action_claimed
      ? popup.action_claimed
      : popup.action
    : void 0;
  const applyClaimResult = reactExports.useCallback(
    (status) => {
      if (!status?.claimed || !popup) return false;
      queryClient2.setQueryData(HAILUO03_VIDEO_TRIAL_QUERY_KEY, status);
      if (userID) {
        markClaimed(userID, popup.id);
        setLocallyClaimedKey(claimKey);
      }
      return true;
    },
    [claimKey, popup, queryClient2, userID],
  );
  const execute = reactExports.useCallback(async () => {
    if (!popup || actionPendingRef.current) return false;
    const url2 = action?.url ?? "";
    trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_ACTION_CLICK, {
      popup_type: "feature",
      url: url2,
    });
    const isRandomInspiration = action?.type === "random_inspiration";
    const isPromptPrefill = action?.type === "prefill_prompt";
    const isHomeAction = isRandomInspiration || isPromptPrefill;
    if (!url2 && !isHomeAction) return true;
    actionPendingRef.current = true;
    setIsPending(true);
    const claimPromise =
      isH3TrialPopup && !claimed && !isHomeAction
        ? claimHailuo03VideoTrial()
        : null;
    try {
      if (isHomeAction) {
        const controller = new AbortController();
        inspirationAbortRef.current = controller;
        await navigate({
          to: "/",
        });
        const success = isPromptPrefill
          ? await requestPromptPrefill(
              {
                prompt: action?.prompt ?? "",
                modelId: action?.model_id ?? "",
              },
              controller.signal,
            )
          : await requestRandomInspiration(
              controller.signal,
              action.inspiration_query_ids,
            );
        if (controller.signal.aborted) return false;
        if (!success) {
          throw new Error(
            isPromptPrefill
              ? "prompt_prefill_unavailable"
              : "random_inspiration_unavailable",
          );
        }
        const agentModelId = action?.model_id?.trim();
        if (isRandomInspiration && agentModelId) {
          setConfig({
            homeAgentModelId: agentModelId,
          });
        }
        return true;
      }
      if (isProjectArchiveUrl(url2)) {
        const bundledTemplateId = bundledProjectTemplateForAction(
          popup.id,
          url2,
        );
        const importProject = bundledTemplateId
          ? runImportBundledProject(bundledTemplateId)
          : runImportFromUrl(url2);
        const [claimStatus, outcome] = await Promise.all([
          claimPromise,
          importProject,
        ]);
        if (!outcome.success) {
          trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_ACTION_FAILED, {
            popup_type: "feature",
            url: url2,
            error_type: outcome.failureStage ?? "unknown",
            error_message: outcome.failureStage ?? "project_import_failed",
          });
          return false;
        }
        const granted = applyClaimResult(claimStatus ?? null);
        if (granted && userID) {
          requestTrialGrantedPopup(userID);
        }
      } else {
        applyClaimResult(claimPromise ? await claimPromise : null);
        const opened = await openExternalUrl(platform2, url2, {
          source,
        });
        if (!opened) throw new Error("open_external_failed");
      }
      return true;
    } catch (error) {
      trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_ACTION_FAILED, {
        popup_type: "feature",
        url: url2,
        error_type: "unknown",
        error_message: String(error),
      });
      dedupedToast.error(t2("serverPopup.errorToast"));
      return false;
    } finally {
      actionPendingRef.current = false;
      setIsPending(false);
    }
  }, [
    action?.type,
    action?.url,
    action?.prompt,
    action?.model_id,
    action?.inspiration_query_ids,
    applyClaimResult,
    isH3TrialPopup,
    navigate,
    claimed,
    platform2,
    popup,
    runImportBundledProject,
    runImportFromUrl,
    source,
    setConfig,
    t2,
    userID,
  ]);
  return {
    action,
    claimed,
    execute,
    isPending,
  };
}
