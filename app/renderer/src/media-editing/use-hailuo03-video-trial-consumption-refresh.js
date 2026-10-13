// use-hailuo03-video-trial-consumption-refresh.js
import {
  areHailuo03VideoTrialReferencesEligible,
  imageModeSubType,
  includesString,
  isHailuo03VideoTrialEligibleResolution,
  stringValue,
} from "../generation/use-mention-models.jsx";
import { CanvasNodeType, reactExports } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
function recordField(value) {
  return value && typeof value === "object" ? value : void 0;
}
function isHailuo03VideoTrialModelValue(value, eligibility) {
  const model = stringValue(value);
  return model !== "" && includesString(eligibility?.models, model);
}
function isHailuo03OrdinaryVideoTrialGeneratingPlaceholder(node, eligibility) {
  if (node.type !== CanvasNodeType.Placeholder) return false;
  const data = recordField(node.data);
  const params = recordField(data?.params);
  const draft = recordField(recordField(data?.popoverDraft)?.i2v);
  const imageMode = params?.image_mode;
  const subType = imageModeSubType(imageMode);
  const videoPaths = [
    data?.video_paths,
    data?.reference_videos,
    params?.video_paths,
    params?.reference_videos,
    draft?.videoPaths,
  ];
  const imagePaths = [
    data?.image_paths,
    data?.reference_images,
    params?.image_paths,
    draft?.imagePaths,
  ];
  const audioPaths = [
    data?.audio_paths,
    data?.reference_audios,
    params?.audio_paths,
    draft?.audioPaths,
  ];
  return (
    data?.mediaType === "video" &&
    data.status === "generating" &&
    [data.model_id, data.model].some((value) =>
      isHailuo03VideoTrialModelValue(value, eligibility),
    ) &&
    includesString(eligibility?.subTypes, subType) &&
    isHailuo03VideoTrialEligibleResolution(params?.resolution, eligibility) &&
    areHailuo03VideoTrialReferencesEligible({
      eligibility,
      imageMode,
      imagePaths: imagePaths.flatMap((value) =>
        Array.isArray(value)
          ? value.filter((item) => typeof item === "string")
          : [],
      ),
      videoPaths:
        stringValue(imageMode) === "video-extension"
          ? []
          : videoPaths.flatMap((value) =>
              Array.isArray(value)
                ? value.filter((item) => typeof item === "string")
                : [],
            ),
      audioPaths: audioPaths.flatMap((value) =>
        Array.isArray(value)
          ? value.filter((item) => typeof item === "string")
          : [],
      ),
    })
  );
}
const HAILUO03_VIDEO_TRIAL_REFRESH_DELAYS_MS = [
  0, 200, 300, 500, 1e3, 3e3, 5e3, 1e4, 3e4, 6e4,
];
const HAILUO03_VIDEO_TRIAL_BATCH_MAX_WAIT_MS = 2e3;
function wait(ms) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}
export function useHailuo03VideoTrialConsumptionRefresh({
  sessionStore,
  status,
  refresh,
  t,
}) {
  const statusRef = reactExports.useRef(status);
  const mountedRef = reactExports.useRef(true);
  const pollingRef = reactExports.useRef(false);
  const expectedUseCountRef = reactExports.useRef(1);
  const queueStartedNodeIdsRef = reactExports.useRef(new Set());
  const lastNotifiedRemainingRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    statusRef.current = status;
    const lastNotifiedRemaining = lastNotifiedRemainingRef.current;
    if (
      lastNotifiedRemaining != null &&
      status.remainingCount > lastNotifiedRemaining
    ) {
      lastNotifiedRemainingRef.current = null;
    }
  }, [status]);
  reactExports.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const handleMaybeConsumed = reactExports.useCallback(
    async (expectedUseCount = 1) => {
      const normalizedExpectedUseCount = Number.isFinite(expectedUseCount)
        ? Math.max(1, Math.floor(expectedUseCount))
        : 1;
      expectedUseCountRef.current = Math.max(
        expectedUseCountRef.current,
        normalizedExpectedUseCount,
      );
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        const before = statusRef.current;
        let beforeRemaining = before.claimed ? before.remainingCount : 0;
        let elapsedMs = 0;
        let baselineStartedAtMs = 0;
        for (const delayMs of HAILUO03_VIDEO_TRIAL_REFRESH_DELAYS_MS) {
          if (delayMs > 0) {
            await wait(delayMs);
            elapsedMs += delayMs;
          }
          if (!mountedRef.current) return;
          const next = await refresh();
          statusRef.current = next;
          if (
            beforeRemaining > 0 &&
            next.claimed &&
            next.remainingCount < beforeRemaining
          ) {
            const expectedConsumed = Math.min(
              beforeRemaining,
              expectedUseCountRef.current,
            );
            const observedConsumed = beforeRemaining - next.remainingCount;
            const batchWaitExpired =
              elapsedMs - baselineStartedAtMs >=
              HAILUO03_VIDEO_TRIAL_BATCH_MAX_WAIT_MS;
            if (observedConsumed < expectedConsumed && !batchWaitExpired) {
              continue;
            }
            if (lastNotifiedRemainingRef.current !== next.remainingCount) {
              lastNotifiedRemainingRef.current = next.remainingCount;
              dedupedToast.success(
                t("canvas.hailuo03Trial.freeUsed", {
                  count: observedConsumed,
                  defaultValue: "本次免费，已使用 {{count}} 次免费机会",
                }),
              );
            }
            return;
          }
          if (
            beforeRemaining <= 0 &&
            next.claimed &&
            next.remainingCount > 0
          ) {
            beforeRemaining = next.remainingCount;
            baselineStartedAtMs = elapsedMs;
            continue;
          }
          if (
            beforeRemaining <= 0 ||
            !next.claimed ||
            next.remainingCount <= 0
          ) {
            return;
          }
        }
      } finally {
        pollingRef.current = false;
        expectedUseCountRef.current = 1;
      }
    },
    [refresh, t],
  );
  reactExports.useEffect(() => {
    return sessionStore.onCanvasUpdated((update) => {
      for (const removedId of update.removedNodeIds ?? []) {
        queueStartedNodeIdsRef.current.delete(removedId);
      }
      const eligibility = statusRef.current.eligibility;
      const node = [
        ...(update.addedNodes ?? []),
        ...(update.updatedNodes ?? []),
      ].find((item) =>
        isHailuo03OrdinaryVideoTrialGeneratingPlaceholder(item, eligibility),
      );
      if (!node || queueStartedNodeIdsRef.current.has(node.id)) {
        return;
      }
      queueStartedNodeIdsRef.current.add(node.id);
      void handleMaybeConsumed().catch(() => void 0);
    });
  }, [handleMaybeConsumed, sessionStore]);
  return handleMaybeConsumed;
}
