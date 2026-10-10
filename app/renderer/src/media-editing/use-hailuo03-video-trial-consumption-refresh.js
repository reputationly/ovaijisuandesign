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
function isHailuo03OrdinaryVideoTrialGeneratingPlaceholder(node2, eligibility) {
  if (node2.type !== CanvasNodeType.Placeholder) return false;
  const data2 = recordField(node2.data);
  const params = recordField(data2?.params);
  const draft = recordField(recordField(data2?.popoverDraft)?.i2v);
  const imageMode = params?.image_mode;
  const subType = imageModeSubType(imageMode);
  const videoPaths = [
    data2?.video_paths,
    data2?.reference_videos,
    params?.video_paths,
    params?.reference_videos,
    draft?.videoPaths,
  ];
  const imagePaths = [
    data2?.image_paths,
    data2?.reference_images,
    params?.image_paths,
    draft?.imagePaths,
  ];
  const audioPaths = [
    data2?.audio_paths,
    data2?.reference_audios,
    params?.audio_paths,
    draft?.audioPaths,
  ];
  return (
    data2?.mediaType === "video" &&
    data2.status === "generating" &&
    [data2.model_id, data2.model].some((value) =>
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
  t: t2,
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
        let elapsedMs2 = 0;
        let baselineStartedAtMs = 0;
        for (const delayMs of HAILUO03_VIDEO_TRIAL_REFRESH_DELAYS_MS) {
          if (delayMs > 0) {
            await wait(delayMs);
            elapsedMs2 += delayMs;
          }
          if (!mountedRef.current) return;
          const next2 = await refresh();
          statusRef.current = next2;
          if (
            beforeRemaining > 0 &&
            next2.claimed &&
            next2.remainingCount < beforeRemaining
          ) {
            const expectedConsumed = Math.min(
              beforeRemaining,
              expectedUseCountRef.current,
            );
            const observedConsumed = beforeRemaining - next2.remainingCount;
            const batchWaitExpired =
              elapsedMs2 - baselineStartedAtMs >=
              HAILUO03_VIDEO_TRIAL_BATCH_MAX_WAIT_MS;
            if (observedConsumed < expectedConsumed && !batchWaitExpired) {
              continue;
            }
            if (lastNotifiedRemainingRef.current !== next2.remainingCount) {
              lastNotifiedRemainingRef.current = next2.remainingCount;
              dedupedToast.success(
                t2("canvas.hailuo03Trial.freeUsed", {
                  count: observedConsumed,
                  defaultValue: "本次免费，已使用 {{count}} 次免费机会",
                }),
              );
            }
            return;
          }
          if (
            beforeRemaining <= 0 &&
            next2.claimed &&
            next2.remainingCount > 0
          ) {
            beforeRemaining = next2.remainingCount;
            baselineStartedAtMs = elapsedMs2;
            continue;
          }
          if (
            beforeRemaining <= 0 ||
            !next2.claimed ||
            next2.remainingCount <= 0
          ) {
            return;
          }
        }
      } finally {
        pollingRef.current = false;
        expectedUseCountRef.current = 1;
      }
    },
    [refresh, t2],
  );
  reactExports.useEffect(() => {
    return sessionStore.onCanvasUpdated((update2) => {
      for (const removedId of update2.removedNodeIds ?? []) {
        queueStartedNodeIdsRef.current.delete(removedId);
      }
      const eligibility = statusRef.current.eligibility;
      const node2 = [
        ...(update2.addedNodes ?? []),
        ...(update2.updatedNodes ?? []),
      ].find((item) =>
        isHailuo03OrdinaryVideoTrialGeneratingPlaceholder(item, eligibility),
      );
      if (!node2 || queueStartedNodeIdsRef.current.has(node2.id)) {
        return;
      }
      queueStartedNodeIdsRef.current.add(node2.id);
      void handleMaybeConsumed().catch(() => void 0);
    });
  }, [handleMaybeConsumed, sessionStore]);
  return handleMaybeConsumed;
}
