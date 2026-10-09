// gate-cloud-asset-uploads.js
import { checkCloudAssetUpload } from "./check-cloud-asset-upload.js";
import { checkTextSafety } from "../workspace/asset-lineage-query-key.js";

const CLOUD_ASSET_NAME_SAFETY_CONCURRENCY = 4;

const CLOUD_ASSET_MEDIA_PROBE_CONCURRENCY = 4;

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const index2 = nextIndex;
      nextIndex += 1;
      results[index2] = await mapper(items[index2]);
    }
  };
  await Promise.all(
    Array.from(
      {
        length: Math.min(concurrency, items.length),
      },
      () => worker(),
    ),
  );
  return results;
}

function probeDurationSeconds(file, timeoutMs = 5e3) {
  const isVideo = file.type.startsWith("video/");
  const isAudio = file.type.startsWith("audio/");
  if (!isVideo && !isAudio) return Promise.resolve(0);
  return new Promise((resolve) => {
    const url2 = URL.createObjectURL(file);
    const el = document.createElement(isVideo ? "video" : "audio");
    el.preload = "metadata";
    let settled = false;
    const cleanup = (value) => {
      if (settled) return;
      settled = true;
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("error", onError);
      URL.revokeObjectURL(url2);
      resolve(value);
    };
    const onLoaded = () => {
      const d2 = el.duration;
      cleanup(Number.isFinite(d2) && d2 > 0 ? d2 : 0);
    };
    const onError = () => cleanup(0);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("error", onError);
    el.src = url2;
    setTimeout(() => cleanup(0), timeoutMs);
  });
}

export async function gateCloudAssetUploads(
  files,
  getPath2,
  probe = probeDurationSeconds,
  checkNameSafety = checkTextSafety,
) {
  const outcomes = new Array(files.length);
  const gateCandidates = [];
  const safetyCandidates = [];
  for (const [index2, file] of files.entries()) {
    const verdict = checkCloudAssetUpload({
      fileName: file.name,
      sizeBytes: file.size,
    });
    if (!verdict.ok) {
      outcomes[index2] = {
        kind: "rejected",
        value: {
          fileName: file.name,
          rejection: verdict.rejection,
        },
      };
      continue;
    }
    const path2 = getPath2(file);
    if (!path2) {
      outcomes[index2] = {
        kind: "rejected",
        value: {
          fileName: file.name,
          rejection: "no-local-path",
        },
      };
      continue;
    }
    gateCandidates.push({
      index: index2,
      accepted: {
        file,
        path: path2,
      },
      maxDurationSeconds: verdict.maxDurationSeconds,
    });
  }
  const mediaCandidates = gateCandidates.filter(
    (candidate) => candidate.maxDurationSeconds !== void 0,
  );
  const mediaDurations = await mapWithConcurrency(
    mediaCandidates,
    CLOUD_ASSET_MEDIA_PROBE_CONCURRENCY,
    ({ accepted: accepted2 }) => probe(accepted2.file),
  );
  const durationByIndex = new Map(
    mediaCandidates.map((candidate, index2) => [
      candidate.index,
      mediaDurations[index2],
    ]),
  );
  for (const candidate of gateCandidates) {
    const durationSeconds = durationByIndex.get(candidate.index);
    if (durationSeconds !== void 0 && durationSeconds > 0) {
      const recheck = checkCloudAssetUpload({
        fileName: candidate.accepted.file.name,
        sizeBytes: candidate.accepted.file.size,
        durationSeconds,
      });
      if (!recheck.ok) {
        outcomes[candidate.index] = {
          kind: "rejected",
          value: {
            fileName: candidate.accepted.file.name,
            rejection: recheck.rejection,
          },
        };
        continue;
      }
    }
    safetyCandidates.push(candidate);
  }
  const safetyResults = await mapWithConcurrency(
    safetyCandidates,
    CLOUD_ASSET_NAME_SAFETY_CONCURRENCY,
    ({ accepted: accepted2 }) => checkNameSafety(accepted2.file.name),
  );
  for (const [candidateIndex, candidate] of safetyCandidates.entries()) {
    const safety = safetyResults[candidateIndex];
    if (!safety.pass) {
      outcomes[candidate.index] = {
        kind: "rejected",
        value: {
          fileName: candidate.accepted.file.name,
          rejection: "name-safety-blocked",
        },
      };
      continue;
    }
    outcomes[candidate.index] = {
      kind: "accepted",
      value: candidate.accepted,
    };
  }
  const accepted = [];
  const rejected = [];
  for (const outcome of outcomes) {
    if (outcome?.kind === "accepted") accepted.push(outcome.value);
    if (outcome?.kind === "rejected") rejected.push(outcome.value);
  }
  return {
    accepted,
    rejected,
  };
}
