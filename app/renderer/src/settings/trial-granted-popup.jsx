// trial-granted-popup.jsx
import { cdnRegionalImage } from "../workspace/topbar-state-context.jsx";
import { reactExports, useQuery, useTranslation, XIcon } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  fetchHailuo03VideoTrialStatus,
  HAILUO03_VIDEO_TRIAL_QUERY_KEY,
  hasShownTrialGranted,
} from "./normalize-hailuo03-video-trial-eligibility.js";
import {
  buildShownKey,
  CHANGE_EVENT,
  clearPendingTrialGranted,
  PENDING_KEY,
} from "./use-auto-announcement.js";
import {
  FALLBACK_LOG_SERVICE,
  safeWarn,
} from "../assets/wrap-as-asset-center-error.js";
import {
  instantiationService,
  IRendererPowerStateMainService,
} from "../workspace/home-service.jsx";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { ILogService } from "./parse-custom-mcp-arguments.js";

const CDN_TRIAL_GRANTED_ICON = cdnRegionalImage({
  domestic: "6300a240-c39b-4bc7-99a7-928e449f878b.png",
  overseas: "49079329-9416-45d4-a7c2-b91bf8e2c0c6.png",
});

function markTrialGrantedShown(userID) {
  if (!userID) return;
  try {
    window.localStorage.setItem(buildShownKey(userID), "1");
  } catch {}
}

function getPendingTrialGranted() {
  try {
    return window.sessionStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

function subscribeTrialGranted(listener) {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

export function TrialGrantedPopup({ onClose }) {
  const { t: t2 } = useTranslation();
  const { data: trialStatus } = useQuery({
    queryKey: HAILUO03_VIDEO_TRIAL_QUERY_KEY,
    queryFn: fetchHailuo03VideoTrialStatus,
    retry: 2,
  });
  if (trialStatus?.activityActive !== true) return null;
  const freeCount = trialStatus.freeCount;
  return (
    <div
      className="pointer-events-auto absolute bottom-[10px] left-[10px] z-30 flex w-[278px] flex-col items-start justify-center gap-3 rounded-[20px] border border-border bg-card px-3 pt-6 pb-3 shadow-brutalist-sm"
      data-action-ui-id="server-popup.trial-granted"
    >
      <img
        src={CDN_TRIAL_GRANTED_ICON}
        alt=""
        aria-hidden={true}
        className="pointer-events-none absolute -top-10 -left-1 h-20 w-20 select-none object-contain"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label={t2("common.close")}
        className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
        data-action-ui-id="server-popup.trial-granted.close"
      >
        <XIcon className="size-4" strokeWidth={2} />
      </button>
      <div className="flex flex-col items-start gap-2.5 pt-1">
        <div className="font-heading text-[18px] font-bold leading-tight text-foreground">
          {t2("serverPopup.trialGranted.title")}
        </div>
        <p className="text-[12px] text-muted-foreground">
          {t2("serverPopup.trialGranted.description", {
            count: freeCount > 0 ? freeCount : 3,
          })}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-8 w-full items-center justify-center rounded-[8px] bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90"
        data-action-ui-id="server-popup.trial-granted.confirm"
      >
        {t2("serverPopup.trialGranted.action")}
      </button>
    </div>
  );
}

export function useTrialGrantedPopup(userID) {
  const [pendingMatchesUser, setPendingMatchesUser] =
    reactExports.useState(false);
  reactExports.useEffect(() => {
    const recompute = () => {
      const pending2 = getPendingTrialGranted();
      setPendingMatchesUser(
        !!pending2 &&
          !!userID &&
          pending2 === userID &&
          !hasShownTrialGranted(userID),
      );
    };
    recompute();
    return subscribeTrialGranted(recompute);
  }, [userID]);
  const trialStatusQuery = useQuery({
    queryKey: HAILUO03_VIDEO_TRIAL_QUERY_KEY,
    queryFn: fetchHailuo03VideoTrialStatus,
    retry: 2,
    staleTime: 0,
    enabled: pendingMatchesUser,
  });
  const statusUnavailable =
    trialStatusQuery.isError || trialStatusQuery.isRefetchError;
  const statusSettled =
    trialStatusQuery.isSuccess && !trialStatusQuery.isFetching;
  reactExports.useEffect(() => {
    if (
      pendingMatchesUser &&
      statusSettled &&
      !statusUnavailable &&
      trialStatusQuery.data?.activityActive === false
    ) {
      clearPendingTrialGranted();
      setPendingMatchesUser(false);
    }
  }, [
    pendingMatchesUser,
    statusSettled,
    statusUnavailable,
    trialStatusQuery.data?.activityActive,
  ]);
  const close2 = reactExports.useCallback(() => {
    if (userID) markTrialGrantedShown(userID);
    clearPendingTrialGranted();
    setPendingMatchesUser(false);
  }, [userID]);
  const visible =
    pendingMatchesUser &&
    statusSettled &&
    !statusUnavailable &&
    trialStatusQuery.data?.activityActive === true;
  return {
    visible,
    close: close2,
  };
}

export function resolveRuntimeServices(enableResumeRecovery) {
  let logService2 = FALLBACK_LOG_SERVICE;
  try {
    logService2 = instantiationService.invokeFunction((accessor) =>
      accessor.get(ILogService),
    );
  } catch (error) {
    safeWarn(
      FALLBACK_LOG_SERVICE,
      `[canvas-render] log_service_unavailable ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let powerStateService = null;
  if (!enableResumeRecovery)
    return {
      powerStateService,
      logService: logService2,
      trackEvent,
    };
  try {
    powerStateService = instantiationService.invokeFunction((accessor) =>
      accessor.get(IRendererPowerStateMainService),
    );
  } catch (error) {
    safeWarn(
      logService2,
      `[canvas-render] power_bridge_unavailable ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return {
    powerStateService,
    logService: logService2,
    trackEvent,
  };
}
