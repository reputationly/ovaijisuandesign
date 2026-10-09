// load-asset-fps-batch.js
import { API_PATHS } from "../vendor.js";

const FPS_BATCH_CONCURRENCY = 4;

const FPS_BATCH_TIMEOUT_MS = 15e3;

function isRecord$8(value) {
  return typeof value === "object" && value !== null;
}

function mapAssetFpsResponse(value) {
  if (!isRecord$8(value) || value.ok !== true || !isRecord$8(value.metadata))
    return 0;
  const fps = value.metadata.fps;
  return typeof fps === "number" && Number.isFinite(fps) && fps > 0 ? fps : 0;
}

function raceWithAbort(promise, signal) {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const handleAbort = () => reject(signal.reason);
    signal.addEventListener("abort", handleAbort, {
      once: true,
    });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", handleAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", handleAbort);
        reject(error);
      },
    );
  });
}

async function loadAssetFps(assetId, gatewayFetch2, signal) {
  try {
    return await raceWithAbort(
      gatewayFetch2(API_PATHS.assetMetadata(assetId), {
        signal,
      }).then(async (response) => mapAssetFpsResponse(await response.json())),
      signal,
    );
  } catch {
    return 0;
  }
}

export async function loadAssetFpsBatch(assetIds, gatewayFetch2, signal) {
  const uniqueIds = [...new Set(assetIds.filter(Boolean))];
  if (signal.aborted || uniqueIds.length === 0) return new Map();
  const results = new Map();
  let nextIndex = 0;
  const batchController = new AbortController();
  const handleCallerAbort = () => batchController.abort(signal.reason);
  signal.addEventListener("abort", handleCallerAbort, {
    once: true,
  });
  const timeoutId = setTimeout(
    () =>
      batchController.abort(
        new DOMException("FPS probe timed out", "TimeoutError"),
      ),
    FPS_BATCH_TIMEOUT_MS,
  );
  const worker = async () => {
    while (!batchController.signal.aborted) {
      const index2 = nextIndex;
      if (index2 >= uniqueIds.length) return;
      nextIndex += 1;
      const assetId = uniqueIds[index2];
      if (!assetId) continue;
      const fps = await loadAssetFps(
        assetId,
        gatewayFetch2,
        batchController.signal,
      );
      if (!batchController.signal.aborted) results.set(assetId, fps);
    }
  };
  const workerCount = Math.min(FPS_BATCH_CONCURRENCY, uniqueIds.length);
  try {
    await Promise.all(
      Array.from(
        {
          length: workerCount,
        },
        () => worker(),
      ),
    );
  } finally {
    clearTimeout(timeoutId);
    signal.removeEventListener("abort", handleCallerAbort);
  }
  if (signal.aborted) return new Map();
  return new Map(
    uniqueIds.map((assetId) => [assetId, results.get(assetId) ?? 0]),
  );
}
