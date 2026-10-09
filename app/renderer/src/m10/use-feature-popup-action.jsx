// use-feature-popup-action.jsx
import { jsxRuntimeExports, useTranslation, reactExports, dedupedToast, useQuery, useQueryClient, useStorage, usePlatform, API_PATHS, useNavigate, XIcon, VolumeXIcon, Volume2Icon, Markdown$1, remarkGfm, GiftIcon } from "../vendor.js";
import { gatewayFetch, DialogClose, IPC_CHANNELS } from "../m15/agent-ws-client.jsx";
import { useAuth } from "../m15/apply-asset-change.jsx";
import { openExternalUrl, Icon } from "../m15/graph.jsx";
import { KEY_PREFIX$3, requestPromptPrefill, requestRandomInspiration, rehypeSanitize } from "../m15/interest-selection-provider.jsx";
import { useRouterState } from "../m15/linked-list.js";
import { TRACK_EVENTS } from "../m15/track-events.js";
import { buildShownKey, PENDING_KEY, CHANGE_EVENT } from "../m15/use-popup.jsx";
import {
  Button$1,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { instantiationService, PlaybackPlayIcon } from "../m08/browser-inspiration-urls.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { IHiloApp } from "../m08/instantiation-service.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { CDN_UPDATE_POSTER } from "./new-workspace-dialog.jsx";
import { useHubClientConfig } from "./use-new-workspace-dialog.jsx";
import { useProjectArchiveActions } from "./use-project-archive-actions.jsx";
export function ProjectArchiveMenuProvider({ children: children2 }) {
  const { runExport, runImport } = useProjectArchiveActions();
  const routerSearch = useRouterState({
    select: (s2) => s2.location.search,
  });
  const currentWorkspaceId = routerSearch?.workspaceId;
  const workspaceIdRef = reactExports.useRef(currentWorkspaceId);
  workspaceIdRef.current = currentWorkspaceId;
  reactExports.useEffect(() => {
    const ipc = window.hilo?.ipcRenderer;
    if (!ipc) return;
    const offExport = ipc.on(IPC_CHANNELS.MENU_EXPORT_PROJECT, () => {
      void (async () => {
        const workspaceId2 = workspaceIdRef.current;
        if (!workspaceId2) {
          await runExport(void 0);
          return;
        }
        const hiloApp2 = instantiationService.invokeFunction((accessor) => accessor.get(IHiloApp));
        const runtime = await hiloApp2.getWorkspaceRuntime(workspaceId2);
        await runExport(runtime?.folderPath);
      })();
    });
    const offImport = ipc.on(IPC_CHANNELS.MENU_IMPORT_PROJECT, () => {
      runImport();
    });
    return () => {
      offExport();
      offImport();
    };
  }, [runExport, runImport]);
  return <>{children2}</>;
}
function buildKey$1(userID, popupId) {
  return `${KEY_PREFIX$3}${userID}:${popupId}`;
}
function isClaimed(userID, popupId) {
  if (!userID || !popupId) return false;
  try {
    return window.localStorage.getItem(buildKey$1(userID, popupId)) === "1";
  } catch {
    return false;
  }
}
function markClaimed(userID, popupId) {
  if (!userID || !popupId) return;
  try {
    window.localStorage.setItem(buildKey$1(userID, popupId), "1");
  } catch {}
}
const H3_LAUNCH_POPUP_ID = "h3_playground_launch_2026";
export const EMPTY_HAILUO03_VIDEO_TRIAL_STATUS = {
  claimed: false,
  claimable: false,
  freeCount: 0,
  remainingCount: 0,
  claimHint: "",
  activityActive: false,
};
export const HAILUO03_VIDEO_TRIAL_QUERY_KEY = ["hailuo03-video-trial"];
function numberField(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
function stringField$1(value) {
  return typeof value === "string" ? value.trim() : "";
}
function stringListField(value, options) {
  if (!Array.isArray(value)) return [];
  const result = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const normalized = item.trim();
    if (!options.allowEmpty && normalized.length === 0) continue;
    if (!result.includes(normalized)) result.push(normalized);
  }
  return result;
}
function boolField(value) {
  return value === true;
}
function normalizeHailuo03VideoTrialEligibility(raw2) {
  if (!raw2 || typeof raw2 !== "object") return void 0;
  const obj = raw2;
  const models = stringListField(obj.models, {
    allowEmpty: false,
  });
  const resolutions = stringListField(obj.resolutions, {
    allowEmpty: false,
  });
  const subTypes = stringListField(obj.subTypes ?? obj.sub_types, {
    allowEmpty: true,
  });
  if (models.length === 0 || resolutions.length === 0 || subTypes.length === 0) {
    return void 0;
  }
  return {
    models,
    resolutions,
    subTypes,
    allowReferenceImages: boolField(obj.allowReferenceImages ?? obj.allow_reference_images),
    allowReferenceAudios: boolField(obj.allowReferenceAudios ?? obj.allow_reference_audios),
    allowReferenceVideos: boolField(obj.allowReferenceVideos ?? obj.allow_reference_videos),
    allowOmniVideos: boolField(obj.allowOmniVideos ?? obj.allow_omni_videos),
  };
}
function normalizeHailuo03VideoTrialStatus(raw2) {
  if (!raw2 || typeof raw2 !== "object") return EMPTY_HAILUO03_VIDEO_TRIAL_STATUS;
  const obj = raw2;
  return {
    claimed: obj.claimed === true,
    claimable: obj.claimable === true,
    freeCount: numberField(obj.freeCount ?? obj.free_count),
    remainingCount: numberField(obj.remainingCount ?? obj.remaining_count),
    claimHint: stringField$1(obj.claimHint ?? obj.claim_hint),
    activityActive: boolField(obj.activityActive ?? obj.activity_active),
    eligibility: normalizeHailuo03VideoTrialEligibility(obj.eligibility),
  };
}
export async function fetchHailuo03VideoTrialStatus() {
  const resp = await gatewayFetch(API_PATHS.hailuo03VideoTrialStatus);
  if (!resp.ok) {
    throw new Error(`fetchMiniMaxH3VideoTrialStatus failed: HTTP ${resp.status}`);
  }
  return normalizeHailuo03VideoTrialStatus(await resp.json());
}
export async function claimHailuo03VideoTrial() {
  try {
    const resp = await gatewayFetch(API_PATHS.hailuo03VideoTrialClaim, {
      method: "POST",
    });
    if (!resp.ok) return EMPTY_HAILUO03_VIDEO_TRIAL_STATUS;
    return normalizeHailuo03VideoTrialStatus(await resp.json());
  } catch {
    return EMPTY_HAILUO03_VIDEO_TRIAL_STATUS;
  }
}
function isProjectArchiveUrl(url2) {
  try {
    return new URL(url2).pathname.toLowerCase().endsWith(".zip");
  } catch {
    return false;
  }
}
function bundledProjectTemplateForAction(popupId, url2) {
  return popupId === H3_LAUNCH_POPUP_ID && isProjectArchiveUrl(url2) ? "h3-playground" : null;
}
export function hasShownTrialGranted(userID) {
  if (!userID) return false;
  try {
    return window.localStorage.getItem(buildShownKey(userID)) === "1";
  } catch {
    return false;
  }
}
export function markTrialGrantedShown(userID) {
  if (!userID) return;
  try {
    window.localStorage.setItem(buildShownKey(userID), "1");
  } catch {}
}
function requestTrialGrantedPopup(userID) {
  if (!userID || hasShownTrialGranted(userID)) return;
  try {
    window.sessionStorage.setItem(PENDING_KEY, userID);
  } catch {}
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}
export function getPendingTrialGranted() {
  try {
    return window.sessionStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}
export function subscribeTrialGranted(listener) {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}
export function useFeaturePopupAction(popup, { source }) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const [, setConfig] = useStorage("global.config");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { runImportBundledProject, runImportFromUrl } = useProjectArchiveActions();
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
      (userID && (locallyClaimedKey === claimKey || isClaimed(userID, popup.id)))),
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
      isH3TrialPopup && !claimed && !isHomeAction ? claimHailuo03VideoTrial() : null;
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
          : await requestRandomInspiration(controller.signal, action.inspiration_query_ids);
        if (controller.signal.aborted) return false;
        if (!success) {
          throw new Error(
            isPromptPrefill ? "prompt_prefill_unavailable" : "random_inspiration_unavailable",
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
        const bundledTemplateId = bundledProjectTemplateForAction(popup.id, url2);
        const importProject = bundledTemplateId
          ? runImportBundledProject(bundledTemplateId)
          : runImportFromUrl(url2);
        const [claimStatus, outcome] = await Promise.all([claimPromise, importProject]);
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
const POPUP_TYPE$2 = "feature";
export function FeaturePopup({ popup, onClose }) {
  const { t: t2 } = useTranslation();
  const videoRef = reactExports.useRef(null);
  const closePendingRef = reactExports.useRef(false);
  const [isOpen, setIsOpen] = reactExports.useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = reactExports.useState(false);
  const [isVideoMuted, setIsVideoMuted] = reactExports.useState(false);
  const {
    action: activeAction,
    execute: executeAction,
    isPending: isActionPending,
  } = useFeaturePopupAction(popup, {
    source: "server-popup.feature",
  });
  const url2 = activeAction?.url ?? "";
  const label = activeAction?.label ?? "";
  const trialWindowActive = popup.trial_active !== false;
  const isH3TrialPopup = popup.id === H3_LAUNCH_POPUP_ID;
  const serverHint = activeAction?.hint?.trim() ?? "";
  const actionHint = !trialWindowActive || !isH3TrialPopup ? "" : serverHint;
  const videoUrl = popup.video_url ?? "";
  const coverUrl = popup.cover_url ?? "";
  const beginClose = () => {
    closePendingRef.current = true;
    setIsOpen(false);
  };
  const handleOpenChangeComplete = (open) => {
    if (open || !closePendingRef.current) return;
    closePendingRef.current = false;
    onClose();
  };
  const handleAction = async () => {
    if (await executeAction()) beginClose();
  };
  const handleToggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isVideoPlaying) {
      video.pause();
      return;
    }
    const played = video.play();
    if (played && typeof played.catch === "function") played.catch(() => {});
  };
  const handleToggleMute = () => {
    setIsVideoMuted((muted) => !muted);
  };
  const handleOpenChange = (open, eventDetails) => {
    if (open) return;
    if (!popup.can_close) {
      eventDetails.cancel();
      return;
    }
    if (eventDetails.reason !== "escape-key" && eventDetails.reason !== "close-press") {
      eventDetails.cancel();
      return;
    }
    const method = eventDetails.reason === "escape-key" ? "escape" : "cancel_button";
    trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_DISMISS, {
      popup_type: POPUP_TYPE$2,
      url: url2,
      method,
    });
    beginClose();
  };
  const visibleTitle = popup.title?.trim() || "";
  const subtitle =
    popup.subtitle?.trim() || (isH3TrialPopup ? t2("serverPopup.feature.topTitle") : "");
  const a11yTitle = visibleTitle || popup.description || t2("serverPopup.a11yTitle");
  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={handleOpenChangeComplete}
    >
      <DialogContent
        className="flex flex-col gap-0 overflow-hidden rounded-[20px] p-0 sm:max-w-[600px]"
        showCloseButton={false}
        overlayClassName="!bg-black opacity-50 ![backdrop-filter:none] ![-webkit-backdrop-filter:none]"
        data-action-ui-id="server-popup.feature"
      >
        {popup.can_close && (
          <DialogClose
            render={
              <Button$1
                variant="ghost"
                size="icon-lg"
                onClick={(event) => event.stopPropagation()}
                className="absolute top-3 right-3 z-20 size-10 cursor-pointer rounded-full border-[var(--Line-line_03,rgba(255,255,255,0.06))] bg-black/40 text-white hover:bg-black/55 hover:text-white active:!translate-y-0 [&_svg]:text-white"
                data-action-ui-id="server-popup.feature.close"
              />
            }
          >
            <Icon icon={XIcon} size="lg" strokeWidth={2} />
            <span className="sr-only">{t2("common.close")}</span>
          </DialogClose>
        )}
        {videoUrl ? (
          <div className="w-full p-1">
            <div
              className="relative aspect-video w-full cursor-pointer overflow-hidden rounded-[16px] bg-muted"
              data-action-ui-id="server-popup.feature.media"
            >
              <video
                ref={videoRef}
                src={videoUrl}
                poster={coverUrl || void 0}
                autoPlay={true}
                loop={true}
                muted={isVideoMuted}
                playsInline={true}
                preload="metadata"
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                className="pointer-events-none h-full w-full object-cover"
                data-action-ui-id="server-popup.feature.video"
              />
              <button
                type="button"
                onClick={handleToggleVideo}
                aria-label={t2(isVideoPlaying ? "common.pause" : "common.play")}
                className="group absolute inset-0 flex cursor-pointer items-center justify-center"
                data-action-ui-id={`server-popup.feature.${isVideoPlaying ? "pause" : "play"}`}
              >
                {!isVideoPlaying && (
                  <span
                    className="flex size-15 items-center justify-center rounded-full bg-transparent transition-colors duration-100 group-hover:opacity-90 motion-reduce:transition-none"
                    data-action-ui-id="server-popup.feature.play-indicator"
                  >
                    <PlaybackPlayIcon
                      size={32}
                      className="text-[var(--media-overlay-foreground)] drop-shadow-lg"
                    />
                  </span>
                )}
              </button>
              <Button$1
                type="button"
                variant="ghost"
                size="icon"
                onClick={(event) => {
                  event.stopPropagation();
                  handleToggleMute();
                }}
                aria-label={t2(
                  isVideoMuted ? "serverPopup.feature.unmute" : "serverPopup.feature.mute",
                )}
                className="absolute right-3 bottom-3 z-10 size-9 cursor-pointer bg-transparent p-0 text-white opacity-70 shadow-none transition-opacity duration-100 hover:bg-transparent hover:text-white hover:opacity-100 active:!translate-y-0 [&_svg]:text-white [&_svg]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
                data-action-ui-id="server-popup.feature.mute"
              >
                <Icon icon={isVideoMuted ? VolumeXIcon : Volume2Icon} size="md" strokeWidth={2} />
              </Button$1>
            </div>
          </div>
        ) : coverUrl ? (
          <div className="w-full p-1">
            <button
              type="button"
              onClick={handleAction}
              disabled={isActionPending}
              aria-label={label || a11yTitle}
              className="block aspect-video w-full overflow-hidden rounded-[16px] bg-muted disabled:cursor-wait"
              data-action-ui-id="server-popup.feature.cover"
            >
              <img src={coverUrl} alt="" className="h-full w-full object-cover" />
            </button>
          </div>
        ) : null}
        <DialogHeader className="gap-4 px-8 pt-6">
          <div className="flex flex-col gap-4 text-left">
            {subtitle && (
              <span className="text-xs font-medium leading-none text-muted-foreground">
                {subtitle}
              </span>
            )}
            {visibleTitle ? (
              <DialogTitle className="font-heading text-xl font-medium leading-tight text-foreground">
                {visibleTitle}
              </DialogTitle>
            ) : (
              <DialogTitle className="sr-only">{a11yTitle}</DialogTitle>
            )}
          </div>
          <DialogDescription
            render={<div />}
            className="chat-markdown text-left text-sm text-foreground [&_ol]:!pl-[1em] [&_ol]:list-decimal [&_ul]:!pl-[1em] [&_ul]:list-disc"
          >
            <Markdown$1 remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
              {popup.description}
            </Markdown$1>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter
          className={`flex-col gap-0 px-8 pt-6 ${actionHint ? "pb-4" : "pb-8"} sm:flex-col`}
        >
          <Button$1
            className="relative h-12 w-full rounded-xl text-sm"
            onClick={handleAction}
            loading={isActionPending}
            disabled={isActionPending}
            data-action-ui-id="server-popup.feature.confirm"
          >
            {actionHint && <Icon icon={GiftIcon} size="lg" strokeWidth={2} />}
            {label}
          </Button$1>
          {actionHint && (
            <div
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 bg-[linear-gradient(90deg,transparent_0%,color-mix(in_srgb,var(--brand-accent)_8%,transparent)_18%,color-mix(in_srgb,var(--brand-accent)_8%,transparent)_82%,transparent_100%)] px-8 text-center text-sm leading-none text-foreground"
              data-action-ui-id="server-popup.feature.action-hint"
            >
              <span aria-hidden="true">🎉</span>
              <span>{actionHint}</span>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function useUpdatePoster() {
  const { updateWidget } = useHubClientConfig();
  const sourceUrl =
    (updateWidget.enabled === false ? null : updateWidget.imageUrl) ?? CDN_UPDATE_POSTER;
  const [failure, setFailure] = reactExports.useState(null);
  reactExports.useEffect(() => {
    setFailure((current2) => (current2?.sourceUrl === sourceUrl ? current2 : null));
  }, [sourceUrl]);
  const imageUrl =
    failure?.sourceUrl === sourceUrl
      ? failure.defaultFailed
        ? null
        : CDN_UPDATE_POSTER
      : sourceUrl;
  const handleImageError = () => {
    setFailure({
      sourceUrl,
      defaultFailed: imageUrl === CDN_UPDATE_POSTER,
    });
  };
  return {
    imageUrl,
    handleImageError,
  };
}
