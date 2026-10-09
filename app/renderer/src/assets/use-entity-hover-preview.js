// use-entity-hover-preview.js
import { reactExports } from "../vendor.js";
import { checkCloudAssetUpload } from "./check-cloud-asset-upload.js";
import { checkTextSafety, listProjectMembers } from "../workspace/record-recent-workspace-opened.jsx";
import { ROOT_KEY, listAllCloudFolders, listCloudReviewNodes } from "./use-cloud-search.js";
const REVIEW_NODES_MAX_PAGES = 10;
export function useCloudReviewNodes(projectId) {
  const [nodes, setNodes] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const epochRef = reactExports.useRef(0);
  const refresh = reactExports.useCallback(() => {
    const epoch = ++epochRef.current;
    if (!projectId) {
      setNodes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        const all2 = [];
        let cursor = "";
        for (let page = 0; page < REVIEW_NODES_MAX_PAGES; page++) {
          const data2 = await listCloudReviewNodes(projectId, cursor || void 0);
          all2.push(...data2.nodes);
          if (!data2.hasMore) break;
          cursor = data2.nextCursor;
        }
        if (epoch === epochRef.current) setNodes(all2);
      } catch {
      } finally {
        if (epoch === epochRef.current) setLoading(false);
      }
    })();
  }, [projectId]);
  reactExports.useEffect(() => {
    refresh();
  }, [refresh]);
  const activeCount = reactExports.useMemo(
    () => nodes.filter((node2) => node2.review === "reviewing").length,
    [nodes],
  );
  return {
    nodes,
    loading,
    activeCount,
    refresh,
  };
}
export function isLive(item) {
  return (
    item.status === "pending" ||
    item.status === "uploading" ||
    item.status === "downloading" ||
    item.status === "reviewing"
  );
}
export function useProjectMemberNames(projectId) {
  const [names, setNames] = reactExports.useState(new Map());
  reactExports.useEffect(() => {
    if (!projectId) {
      setNames(new Map());
      return;
    }
    let disposed = false;
    void listProjectMembers(projectId)
      .then((members) => {
        if (disposed) return;
        setNames(new Map(members.map((member) => [member.userId, member.nickname])));
      })
      .catch(() => {});
    return () => {
      disposed = true;
    };
  }, [projectId]);
  return names;
}
export function useDownloadingNodeIds(transfers, cloudProjectId) {
  return reactExports.useMemo(() => {
    const ids2 = new Set();
    for (const item of transfers) {
      if (
        item.cloudProjectId === cloudProjectId &&
        item.kind === "download" &&
        item.nodeId &&
        (item.status === "pending" || item.status === "downloading")
      ) {
        ids2.add(item.nodeId);
      }
    }
    return ids2;
  }, [transfers, cloudProjectId]);
}
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
    mediaCandidates.map((candidate, index2) => [candidate.index, mediaDurations[index2]]),
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
export function normalizeCloudParentId(parentId) {
  return parentId === "0" ? "" : parentId;
}
export function formatBytes$1(bytes2) {
  if (!Number.isFinite(bytes2) || bytes2 <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i2 = Math.min(Math.floor(Math.log(bytes2) / Math.log(1024)), units.length - 1);
  return `${(bytes2 / 1024 ** i2).toFixed(1)} ${units[i2]}`;
}
export function isCloudFileDownloadEnabled(node2, syncState) {
  return (
    node2.kind === "file" &&
    node2.review === "pass" &&
    Boolean(node2.cdnUrl) &&
    syncState !== "downloading"
  );
}
export function resolveSyncState(node2, syncMap, downloadingIds) {
  if (node2.kind !== "file" || node2.review !== "pass") return void 0;
  if (downloadingIds.has(node2.id)) return "downloading";
  const snapshot2 = syncMap.get(node2.id);
  if (snapshot2 === void 0) return "notDownloaded";
  return snapshot2 < node2.updatedAt ? "stale" : "synced";
}
export function filterMoveOptions(options, movedFolderSegments) {
  if (!movedFolderSegments || movedFolderSegments.length === 0) return options;
  return options.filter((option2) => {
    if (option2.key === ROOT_KEY) return true;
    if (option2.segments.length < movedFolderSegments.length) return true;
    return !movedFolderSegments.every((segment, index2) => option2.segments[index2] === segment);
  });
}
export function localFolderOptions(relPaths) {
  return [
    {
      key: ROOT_KEY,
      segments: [],
    },
    ...relPaths.map((rel) => ({
      key: rel,
      segments: rel.split("/"),
    })),
  ];
}
export function useCloudMoveOptions(projectId, active2) {
  const [options, setOptions] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!active2 || !projectId) return;
    let disposed = false;
    setLoading(true);
    void listAllCloudFolders(projectId)
      .then((cloud) => {
        if (disposed) return;
        setOptions([
          {
            key: ROOT_KEY,
            segments: [],
          },
          ...cloud.map((folder) => ({
            key: folder.id,
            segments: folder.segments,
          })),
        ]);
      })
      .catch(() => {
        if (!disposed)
          setOptions([
            {
              key: ROOT_KEY,
              segments: [],
            },
          ]);
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [active2, projectId]);
  return {
    options,
    loading,
  };
}
export function useStableCallback(fn2) {
  const ref = reactExports.useRef(fn2);
  reactExports.useInsertionEffect(() => {
    ref.current = fn2;
  });
  return reactExports.useCallback((...args) => ref.current(...args), []);
}
const HOVER_OPEN_DELAY_MS$1 = 300;
const HOVER_CLOSE_DELAY_MS$1 = 150;
export function useEntityHoverPreview() {
  const [state2, setState] = reactExports.useState({
    kind: "idle",
  });
  const stateRef = reactExports.useRef(state2);
  const openTimerRef = reactExports.useRef(null);
  const closeTimerRef = reactExports.useRef(null);
  const setBoth = reactExports.useCallback((next2) => {
    stateRef.current = next2;
    setState(next2);
  }, []);
  const cancelOpen2 = reactExports.useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);
  const cancelClose = reactExports.useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);
  const notifyHoverIntent = reactExports.useCallback(
    (target) => {
      cancelClose();
      if (stateRef.current.kind === "hover") {
        cancelOpen2();
        setBoth({
          kind: "hover",
          target,
        });
        return;
      }
      cancelOpen2();
      openTimerRef.current = setTimeout(() => {
        openTimerRef.current = null;
        setBoth({
          kind: "hover",
          target,
        });
      }, HOVER_OPEN_DELAY_MS$1);
    },
    [cancelClose, cancelOpen2, setBoth],
  );
  const notifyHoverEnd = reactExports.useCallback(() => {
    cancelOpen2();
    if (stateRef.current.kind !== "hover") return;
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      if (stateRef.current.kind === "hover")
        setBoth({
          kind: "idle",
        });
    }, HOVER_CLOSE_DELAY_MS$1);
  }, [cancelOpen2, cancelClose, setBoth]);
  const onPopupPointerEnter = reactExports.useCallback(() => {
    cancelOpen2();
    cancelClose();
  }, [cancelOpen2, cancelClose]);
  const onPopupPointerLeave = reactExports.useCallback(() => {
    cancelOpen2();
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      if (stateRef.current.kind === "hover")
        setBoth({
          kind: "idle",
        });
    }, HOVER_CLOSE_DELAY_MS$1);
  }, [cancelOpen2, cancelClose, setBoth]);
  const dismiss = reactExports.useCallback(() => {
    cancelOpen2();
    cancelClose();
    if (stateRef.current.kind !== "idle")
      setBoth({
        kind: "idle",
      });
  }, [cancelOpen2, cancelClose, setBoth]);
  const activeAnchor = state2.kind === "hover" ? state2.target.anchor : null;
  reactExports.useEffect(() => {
    if (!activeAnchor) return;
    if (!activeAnchor.isConnected) {
      setBoth({
        kind: "idle",
      });
      return;
    }
    const io2 = new IntersectionObserver(
      (entries2) => {
        for (const entry of entries2) {
          if (!entry.isIntersecting)
            setBoth({
              kind: "idle",
            });
        }
      },
      {
        threshold: 0,
      },
    );
    io2.observe(activeAnchor);
    return () => io2.disconnect();
  }, [activeAnchor, setBoth]);
  reactExports.useEffect(() => {
    return () => {
      cancelOpen2();
      cancelClose();
    };
  }, [cancelOpen2, cancelClose]);
  return {
    state: state2,
    stateRef,
    notifyHoverIntent,
    notifyHoverEnd,
    onPopupPointerEnter,
    onPopupPointerLeave,
    dismiss,
  };
}
