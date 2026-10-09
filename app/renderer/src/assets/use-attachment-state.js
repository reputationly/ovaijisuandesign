// use-attachment-state.js
import {
  dedupedToast,
  MEDIA_LINEAGE_MAX_REFERENCES,
  reactExports,
  useAssetMetadataApi,
  useAssetMetadataStore,
  useTranslation,
} from "../vendor.js";
import {
  useCanvasBridge,
  useCanvasIsBoxSelecting,
  useCanvasIsDragging,
  useCanvasIsMultiSelect,
} from "../media-editing/package.jsx";
import {
  canvasReferenceIdentity,
  isCanvasReferenceUri,
  isCanvasSubjectReference,
  parseCanvasReference,
} from "../text-editor/table-document-to-llm-content.js";
import { mergeDirectReferenceMetadata } from "../chat/merge-direct-reference-metadata.js";
import {
  AUDIO_TOTAL_MAX_SEC,
  extensionOf,
  findMetaByPath,
  FIRST_LAST_FRAME_SLOT_COUNT,
  haveSameNonEmptyPathCounts,
  normalizeAttachmentSelection,
  normalizeFirstLastFramePaths,
  reconcileDefaultPaths,
  reconcileFirstLastFrameDefaultPaths,
  selectNewAttachments,
  VIDEO_TOTAL_MAX_SEC,
} from "./reconcile-first-last-frame-default-paths.js";
import {
  SEEDANCE_REFERENCE_AUDIO_MAX_SEC,
  SEEDANCE_REFERENCE_AUDIO_MIN_SEC,
} from "../text-editor/build-asr-gateway-request.js";
import { useCanvasActions } from "../media-editing/use-canvas-actions.js";
import { restoreCanvasReferencePaths } from "../text-editor/restore-canvas-reference-paths.js";
import { canAnnotateCanvasImage } from "../media-editing/append-width.js";
import { getImageConstraintReason } from "../generation/attachment-bar.jsx";

function useAssetsRefMetadata(paths, assets) {
  const { directReferences } = useCanvasBridge();
  const pathKey = JSON.stringify(
    [...new Set(paths.filter((path2) => !!parseCanvasReference(path2)))].sort(),
  );
  const [resolved, setResolved] = reactExports.useState({
    bridge: directReferences,
    rows: new Map(),
  });
  const latest2 = reactExports.useRef(resolved);
  latest2.current = resolved;
  const revision = reactExports.useRef(0);
  const updateReferenceMetadata = reactExports.useCallback(
    (results) => {
      revision.current++;
      const byIdentity = new Map(
        results.map((row) => [canvasReferenceIdentity(row.reference), row]),
      );
      const previous2 =
        latest2.current.bridge === directReferences
          ? latest2.current.rows
          : new Map();
      const rows = new Map();
      const authoredPaths = JSON.parse(pathKey);
      for (const path2 of authoredPaths) {
        const reference = parseCanvasReference(path2);
        const row =
          reference && byIdentity.get(canvasReferenceIdentity(reference));
        if (!row) {
          const prior = previous2.get(path2);
          if (prior) rows.set(path2, prior);
          continue;
        }
        rows.set(path2, row);
      }
      const next2 = {
        bridge: directReferences,
        rows,
      };
      latest2.current = next2;
      setResolved(next2);
    },
    [directReferences, pathKey],
  );
  reactExports.useEffect(() => {
    if (!directReferences || pathKey === "[]") return;
    const authoredPaths = JSON.parse(pathKey);
    let cancelled = false;
    const refresh = async () => {
      const current2 = ++revision.current;
      const rows = [];
      try {
        for (let offset2 = 0; offset2 < authoredPaths.length; offset2 += 100) {
          const batch2 = authoredPaths.slice(offset2, offset2 + 100);
          const references = batch2.flatMap((path2) => {
            const reference = parseCanvasReference(path2);
            return reference ? [reference] : [];
          });
          const results = await directReferences.checkAvailability(references, {
            include_metadata: true,
          });
          if (cancelled || current2 !== revision.current) return;
          rows.push(...results);
        }
        if (!cancelled && current2 === revision.current)
          updateReferenceMetadata(rows);
      } catch {}
    };
    void refresh();
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      revision.current++;
      window.removeEventListener("focus", refresh);
    };
  }, [directReferences, pathKey, updateReferenceMetadata]);
  const resolutions = reactExports.useMemo(() => {
    if (resolved.bridge !== directReferences) return new Map();
    const current2 = JSON.parse(pathKey);
    return new Map(
      current2.flatMap((path2) => {
        const row = resolved.rows.get(path2);
        return row ? [[path2, row]] : [];
      }),
    );
  }, [directReferences, pathKey, resolved]);
  return {
    updateReferenceMetadata,
    resolutions,
    assets: reactExports.useMemo(
      () => mergeDirectReferenceMetadata(assets, resolutions),
      [assets, resolutions],
    ),
  };
}

function useImageAnnotationRequest() {
  const { openImageAnnotation } = useCanvasBridge();
  const active2 = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (active2.current && !active2.current.isValid())
      active2.current.controller.abort();
  });
  reactExports.useEffect(() => () => active2.current?.controller.abort(), []);
  const open = reactExports.useCallback(
    async (request, isValid2) => {
      if (!openImageAnnotation || active2.current || !isValid2()) return;
      const controller = new AbortController();
      const entry = {
        controller,
        isValid: isValid2,
      };
      active2.current = entry;
      try {
        await openImageAnnotation({
          ...request,
          signal: controller.signal,
        });
      } finally {
        if (active2.current === entry) active2.current = null;
        controller.abort();
      }
    },
    [openImageAnnotation],
  );
  return {
    available: !!openImageAnnotation,
    open,
  };
}

const ATTACHMENT_KINDS = ["image", "video", "audio", "text", "file"];

const FILE_SLOT_PICK_KINDS = ["file", "text"];

function matchesFileExtensions(path2, extensions2) {
  if (!extensions2 || extensions2.length === 0) return true;
  const ext = extensionOf(path2);
  return extensions2.some(
    (candidate) => candidate.trim().toLowerCase() === ext,
  );
}

const IMAGE_ASPECT_REJECTED_TOAST_ID = "canvas-image-aspect-rejected";

function devLogAttachment(event, payload) {
  return;
}

const AUDIO_PER_CLIP_MIN_SEC = SEEDANCE_REFERENCE_AUDIO_MIN_SEC;

const AUDIO_PER_CLIP_MAX_SEC = SEEDANCE_REFERENCE_AUDIO_MAX_SEC;

function reconcileImageModeTransitionPaths(
  prev,
  defaults2,
  removed,
  isFirstLastFrame,
  options,
) {
  const filledDefaults = defaults2.filter(Boolean);
  const canRestoreDefaultOrder =
    haveSameNonEmptyPathCounts(prev, defaults2) &&
    !filledDefaults.some((path2) => removed.has(path2));
  if (options?.preserveUserSlots && canRestoreDefaultOrder) {
    return isFirstLastFrame
      ? normalizeFirstLastFramePaths(prev)
      : [...prev.filter(Boolean)];
  }
  if (canRestoreDefaultOrder) {
    return isFirstLastFrame
      ? normalizeFirstLastFramePaths(defaults2)
      : [...filledDefaults];
  }
  return isFirstLastFrame
    ? reconcileFirstLastFrameDefaultPaths(prev, defaults2, removed)
    : reconcileDefaultPaths(prev, defaults2, removed);
}

function selectNewAttachmentPaths(currentPaths, incomingPaths, max2, count2) {
  return selectNewAttachments(currentPaths, incomingPaths, max2, count2).map(
    (item) => item.path,
  );
}

function admitAttachmentSelections(currentPaths, incoming, max2, count2) {
  const admitted = selectNewAttachments(currentPaths, incoming, max2, count2);
  if (admitted.length === 0)
    return {
      paths: [...currentPaths],
      admitted,
    };
  return {
    paths: [
      ...currentPaths.filter(Boolean),
      ...admitted.map((item) => item.path),
    ],
    admitted,
  };
}

function boundVideoAudioReferencePaths(
  videoPaths,
  audioPaths,
  maxVideoRefs,
  maxAudioRefs,
  maxVideoAudioRefs,
  count2,
) {
  const bound = (paths, max2, kind) =>
    count2 && paths.some(isCanvasSubjectReference)
      ? selectNewAttachmentPaths([], paths, max2, (path2) =>
          count2(path2, kind),
        )
      : paths.filter(Boolean).slice(0, max2);
  const boundedVideos = bound(videoPaths, maxVideoRefs, "video");
  const boundedAudios = bound(audioPaths, maxAudioRefs, "audio");
  if (maxVideoAudioRefs === void 0)
    return {
      videoPaths: boundedVideos,
      audioPaths: boundedAudios,
    };
  const sharedCap = Math.max(0, maxVideoAudioRefs);
  const selectedVideos = bound(boundedVideos, sharedCap, "video");
  const usedVideo = selectedVideos.reduce(
    (total, path2) => total + (count2?.(path2, "video") ?? 1),
    0,
  );
  return {
    videoPaths: selectedVideos,
    audioPaths: bound(
      boundedAudios,
      Math.max(0, sharedCap - usedVideo),
      "audio",
    ),
  };
}

function resolveAttachmentSourceNodeId(selection2, ensureById, ensureByPath) {
  if (selection2.sourceNodeId) {
    const exact = ensureById(selection2.sourceNodeId);
    if (exact) return exact;
  }
  return ensureByPath(selection2.path);
}

function pathToDisplayItem(
  path2,
  kind,
  assets,
  resolveFileUrl,
  badgeLabel,
  perClipMinSec,
  perClipMaxSec,
) {
  const direct = parseCanvasReference(path2);
  const name2 = direct
    ? direct.subjectName
      ? `${direct.subjectName} · ${direct.name}`
      : direct.name
    : (path2.split("/").pop() ?? path2);
  const thumbUrl = resolveFileUrl?.(path2) ?? "";
  const meta2 = findMetaByPath(path2, assets, kind);
  const durationSec = meta2?.durationSec;
  const durationOutOfRange =
    (kind === "audio" || kind === "video") &&
    durationSec != null &&
    durationSec > 0 &&
    perClipMinSec !== void 0 &&
    perClipMaxSec !== void 0
      ? durationSec < perClipMinSec || durationSec > perClipMaxSec
      : void 0;
  return {
    path: path2,
    kind,
    thumbUrl,
    name: name2,
    durationSec,
    width: meta2?.width,
    height: meta2?.height,
    durationOutOfRange,
    durationMinSec: perClipMinSec,
    durationMaxSec: perClipMaxSec,
    audioOutOfRange: kind === "audio" ? durationOutOfRange : void 0,
    badgeLabel,
  };
}

export function useAttachmentState(opts) {
  const { t: t2 } = useTranslation();
  const {
    defaultFilePaths,
    maxImageRefs,
    maxVideoRefs,
    maxAudioRefs,
    maxVideoAudioRefs,
    audioPerClipMinSec,
    audioPerClipMaxSec,
    audioTotalMaxSec,
    videoPerClipMinSec,
    videoPerClipMaxSec,
    videoTotalMaxSec,
    videoMinFps,
    videoMaxFps,
    imageInputLimits,
    suppressImageAspectRejectedToast = false,
    maxTextRefs,
    maxFileRefs,
    fileExtensions,
    imageMode,
    modelKey,
    hostNodeId,
    resolveFileUrl,
  } = opts;
  const {
    image: defaultImagePaths,
    video: defaultVideoPaths,
    audio: defaultAudioPaths,
    text: defaultTextPaths,
  } = reactExports.useMemo(() => {
    return restoreCanvasReferencePaths(opts.defaultPrompt ?? "", {
      image: opts.defaultImagePaths ?? [],
      video: opts.defaultVideoPaths ?? [],
      audio: opts.defaultAudioPaths ?? [],
      text: opts.defaultTextPaths ?? [],
    });
  }, [
    opts.defaultPrompt,
    opts.defaultImagePaths,
    opts.defaultVideoPaths,
    opts.defaultAudioPaths,
    opts.defaultTextPaths,
  ]);
  const isFirstLastFrame = imageMode === "first-last-frame";
  const isTextToVideo = imageMode === "text-to-video";
  const isVideoExtension = imageMode === "video-extension";
  const editableText = (maxTextRefs ?? 0) > 0;
  const [imagePaths, setImagePaths] = reactExports.useState(
    defaultImagePaths ?? [],
  );
  const [videoPaths, setVideoPaths] = reactExports.useState(
    defaultVideoPaths ?? [],
  );
  const [audioPaths, setAudioPaths] = reactExports.useState(
    defaultAudioPaths ?? [],
  );
  const [textPaths, setTextPaths] = reactExports.useState(
    defaultTextPaths ?? [],
  );
  const [filePaths, setFilePaths] = reactExports.useState(
    defaultFilePaths ?? [],
  );
  const pathsByKindRef = reactExports.useRef({
    image: defaultImagePaths ?? [],
    video: defaultVideoPaths ?? [],
    audio: defaultAudioPaths ?? [],
    text: defaultTextPaths ?? [],
    file: defaultFilePaths ?? [],
  });
  const removedPathsRef = reactExports.useRef(new Set());
  const userEditedImagePathsRef = reactExports.useRef(false);
  const previousImageModeRef = reactExports.useRef(imageMode);
  const sourceNodeIdByPathRef = reactExports.useRef(new Map());
  const assetMetadataStore = useAssetMetadataApi();
  const catalogAssets = useAssetMetadataStore((state2) => state2.assets);
  const {
    assets: assetMetadataAssets,
    resolutions,
    updateReferenceMetadata,
  } = useAssetsRefMetadata(
    [...imagePaths, ...videoPaths, ...audioPaths, ...textPaths],
    catalogAssets,
  );
  const subjectKinds = reactExports.useCallback(
    (path2) => {
      const ref = parseCanvasReference(path2);
      if (ref?.target !== "entity") return void 0;
      const current2 = resolutions.get(path2);
      return current2?.status === "available" && current2.metadata
        ? current2.metadata.attachments.map((item) => item.kind)
        : (ref.attachmentKinds ?? [ref.kind]);
    },
    [resolutions],
  );
  const pathsForKind = reactExports.useCallback(
    (kind, current2 = pathsByKindRef.current) => {
      const original = current2[kind];
      if (kind === "file") return original;
      const subjects = [
        ...new Set(
          Object.values(current2).flat().filter(isCanvasSubjectReference),
        ),
      ];
      if (!subjects.length) return original;
      const matching = subjects.filter((path2) =>
        subjectKinds(path2)?.includes(kind),
      );
      return [
        ...original.filter(
          (path2) =>
            !isCanvasSubjectReference(path2) || matching.includes(path2),
        ),
        ...matching.filter((path2) => !original.includes(path2)),
      ];
    },
    [subjectKinds],
  );
  const referenceCount = reactExports.useCallback(
    (path2, kind) =>
      subjectKinds(path2)?.filter((value) => value === kind).length ?? 1,
    [subjectKinds],
  );
  const usedSlots = reactExports.useCallback(
    (paths, kind) =>
      paths
        .filter(Boolean)
        .reduce((total, path2) => total + referenceCount(path2, kind), 0),
    [referenceCount],
  );
  const isDragging = useCanvasIsDragging();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const {
    pickAsset,
    ensureMediaNodeForPath,
    onMediaLineage,
    uploadAttachment,
  } = useCanvasBridge();
  const imageAnnotation = useImageAnnotationRequest();
  const {
    getNodeIdByPath,
    ensureStandaloneNodeForPath,
    ensureStandaloneNodeById,
    getIncomingSourceNodeIdByPath,
    ensureDerivationEdge,
    removeDerivationEdge,
  } = useCanvasActions();
  const updatePathsForKind = reactExports.useCallback((kind, update2) => {
    const nextPaths = update2(pathsByKindRef.current[kind]);
    pathsByKindRef.current[kind] = nextPaths;
    if (kind === "image") setImagePaths(nextPaths);
    else if (kind === "video") setVideoPaths(nextPaths);
    else if (kind === "audio") setAudioPaths(nextPaths);
    else if (kind === "file") setFilePaths(nextPaths);
    else setTextPaths(nextPaths);
  }, []);
  reactExports.useEffect(() => {
    if (!isFirstLastFrame) return;
    const subjects = [
      ...imagePaths,
      ...videoPaths,
      ...audioPaths,
      ...textPaths,
    ].filter(isCanvasSubjectReference);
    if (!subjects.length) return;
    for (const path2 of subjects) removedPathsRef.current.add(path2);
    for (const kind of ATTACHMENT_KINDS) {
      updatePathsForKind(kind, (paths) =>
        paths.some(isCanvasSubjectReference)
          ? paths.filter((path2) => !isCanvasSubjectReference(path2))
          : paths,
      );
    }
  }, [
    isFirstLastFrame,
    imagePaths,
    videoPaths,
    audioPaths,
    textPaths,
    updatePathsForKind,
  ]);
  reactExports.useEffect(() => {
    const imageModeChanged = previousImageModeRef.current !== imageMode;
    previousImageModeRef.current = imageMode;
    if (defaultImagePaths) {
      updatePathsForKind("image", (currentPaths) =>
        imageModeChanged
          ? reconcileImageModeTransitionPaths(
              currentPaths,
              defaultImagePaths,
              removedPathsRef.current,
              isFirstLastFrame,
              {
                preserveUserSlots: userEditedImagePathsRef.current,
              },
            )
          : isFirstLastFrame
            ? reconcileFirstLastFrameDefaultPaths(
                currentPaths,
                defaultImagePaths,
                removedPathsRef.current,
              )
            : reconcileDefaultPaths(
                currentPaths,
                defaultImagePaths,
                removedPathsRef.current,
              ),
      );
    }
  }, [defaultImagePaths, imageMode, isFirstLastFrame, updatePathsForKind]);
  reactExports.useEffect(() => {
    if (defaultVideoPaths) {
      updatePathsForKind("video", (currentPaths) =>
        reconcileDefaultPaths(
          currentPaths,
          defaultVideoPaths,
          removedPathsRef.current,
        ),
      );
    }
  }, [defaultVideoPaths, updatePathsForKind]);
  reactExports.useEffect(() => {
    if (defaultAudioPaths) {
      updatePathsForKind("audio", (currentPaths) =>
        reconcileDefaultPaths(
          currentPaths,
          defaultAudioPaths,
          removedPathsRef.current,
        ),
      );
    }
  }, [defaultAudioPaths, updatePathsForKind]);
  reactExports.useEffect(() => {
    if (editableText && defaultTextPaths) {
      updatePathsForKind("text", (currentPaths) =>
        reconcileDefaultPaths(
          currentPaths,
          defaultTextPaths,
          removedPathsRef.current,
        ),
      );
    }
  }, [editableText, defaultTextPaths, updatePathsForKind]);
  reactExports.useEffect(() => {
    if (defaultFilePaths) {
      updatePathsForKind("file", (currentPaths) =>
        reconcileDefaultPaths(
          currentPaths,
          defaultFilePaths,
          removedPathsRef.current,
        ),
      );
    }
  }, [defaultFilePaths, updatePathsForKind]);
  const effectiveMaxImage = isTextToVideo
    ? 0
    : isFirstLastFrame
      ? 2
      : isVideoExtension
        ? 0
        : maxImageRefs;
  const effectiveMaxVideo = isTextToVideo
    ? 0
    : isFirstLastFrame
      ? 0
      : isVideoExtension
        ? 1
        : maxVideoRefs;
  const effectiveMaxAudio =
    isTextToVideo || isFirstLastFrame || isVideoExtension ? 0 : maxAudioRefs;
  const effectiveMaxVideoAudio =
    isTextToVideo || isFirstLastFrame || isVideoExtension
      ? void 0
      : maxVideoAudioRefs;
  const effectiveMaxText =
    !isTextToVideo && editableText ? (maxTextRefs ?? 0) : 0;
  const effectiveMaxFile =
    isTextToVideo || isFirstLastFrame || isVideoExtension
      ? 0
      : (maxFileRefs ?? 0);
  const effectiveAudioPerClipMinSec =
    audioPerClipMinSec ?? AUDIO_PER_CLIP_MIN_SEC;
  const effectiveAudioPerClipMaxSec =
    audioPerClipMaxSec ?? AUDIO_PER_CLIP_MAX_SEC;
  const effectiveAudioTotalMaxSec =
    audioTotalMaxSec ?? audioPerClipMaxSec ?? AUDIO_TOTAL_MAX_SEC;
  const effectiveVideoTotalMaxSec =
    videoTotalMaxSec ?? videoPerClipMaxSec ?? VIDEO_TOTAL_MAX_SEC;
  const projectedImagePaths = reactExports.useMemo(
    () =>
      pathsForKind("image", {
        image: imagePaths,
        video: videoPaths,
        audio: audioPaths,
        text: textPaths,
        file: filePaths,
      }),
    [pathsForKind, imagePaths, videoPaths, audioPaths, textPaths, filePaths],
  );
  const rejectedImages = reactExports.useMemo(() => {
    const rejected = new Map();
    for (const path2 of projectedImagePaths) {
      if (!path2) continue;
      const meta2 = findMetaByPath(path2, assetMetadataAssets, "image");
      const reason = getImageConstraintReason(meta2, imageInputLimits);
      if (reason) rejected.set(path2, reason);
    }
    return rejected;
  }, [assetMetadataAssets, imageInputLimits, projectedImagePaths]);
  const constrainedImagePaths = reactExports.useMemo(
    () =>
      projectedImagePaths.map((path2) =>
        rejectedImages.has(path2) ? "" : path2,
      ),
    [projectedImagePaths, rejectedImages],
  );
  const filledImages = isFirstLastFrame
    ? normalizeFirstLastFramePaths(constrainedImagePaths)
    : selectNewAttachmentPaths(
        [],
        constrainedImagePaths,
        effectiveMaxImage,
        (path2) => referenceCount(path2, "image"),
      );
  const { videoPaths: filledVideos, audioPaths: filledAudios } =
    boundVideoAudioReferencePaths(
      pathsForKind("video"),
      pathsForKind("audio"),
      effectiveMaxVideo,
      effectiveMaxAudio,
      effectiveMaxVideoAudio,
      referenceCount,
    );
  const filledTexts = selectNewAttachmentPaths(
    [],
    pathsForKind("text"),
    effectiveMaxText,
    (path2) => referenceCount(path2, "text"),
  );
  const filledFiles = filePaths.filter(Boolean).slice(0, effectiveMaxFile);
  const referenceCounts = {
    image: usedSlots(filledImages, "image"),
    video: usedSlots(filledVideos, "video"),
    audio: usedSlots(filledAudios, "audio"),
    text: usedSlots(filledTexts, "text"),
    file: filledFiles.length,
  };
  const remainingImage = Math.max(0, effectiveMaxImage - referenceCounts.image);
  const remainingVideoAudio =
    effectiveMaxVideoAudio === void 0
      ? Number.POSITIVE_INFINITY
      : Math.max(
          0,
          effectiveMaxVideoAudio -
            referenceCounts.video -
            referenceCounts.audio,
        );
  const remainingVideo = Math.min(
    Math.max(0, effectiveMaxVideo - referenceCounts.video),
    remainingVideoAudio,
  );
  const remainingAudio = Math.min(
    Math.max(0, effectiveMaxAudio - referenceCounts.audio),
    remainingVideoAudio,
  );
  const remainingText = Math.max(0, effectiveMaxText - referenceCounts.text);
  const remainingFile = Math.max(0, effectiveMaxFile - filledFiles.length);
  const showAddButton =
    remainingImage +
      remainingVideo +
      remainingAudio +
      remainingText +
      remainingFile >
    0;
  const pickerKindFilter = reactExports.useMemo(() => {
    const kinds = [];
    if (remainingImage > 0) kinds.push("image");
    if (remainingVideo > 0) kinds.push("video");
    if (remainingAudio > 0) kinds.push("audio");
    if (remainingText > 0) kinds.push("text");
    if (remainingFile > 0) {
      for (const kind of FILE_SLOT_PICK_KINDS) {
        if (!kinds.includes(kind)) kinds.push(kind);
      }
    }
    return kinds;
  }, [
    remainingImage,
    remainingVideo,
    remainingAudio,
    remainingText,
    remainingFile,
  ]);
  const allowedKindsForAtPicker = reactExports.useMemo(
    () => pickerKindFilter.filter((kind) => kind !== "file"),
    [pickerKindFilter],
  );
  const modelSupportedKindsForAtPicker = reactExports.useMemo(() => {
    const kinds = [];
    if (effectiveMaxImage > 0) kinds.push("image");
    if (effectiveMaxVideo > 0) kinds.push("video");
    if (effectiveMaxAudio > 0) kinds.push("audio");
    if (effectiveMaxText > 0) kinds.push("text");
    return kinds;
  }, [
    effectiveMaxImage,
    effectiveMaxVideo,
    effectiveMaxAudio,
    effectiveMaxText,
  ]);
  const usedAudioSec = reactExports.useMemo(() => {
    let total = 0;
    for (const p3 of filledAudios) {
      const d2 = findMetaByPath(p3, assetMetadataAssets, "audio")?.durationSec;
      if (typeof d2 === "number" && d2 > 0) total += d2;
    }
    return total;
  }, [assetMetadataAssets, filledAudios]);
  const usedVideoSec = reactExports.useMemo(() => {
    let total = 0;
    for (const p3 of filledVideos) {
      const d2 = findMetaByPath(p3, assetMetadataAssets, "video")?.durationSec;
      if (typeof d2 === "number" && d2 > 0) total += d2;
    }
    return total;
  }, [assetMetadataAssets, filledVideos]);
  const pickerConstraints = reactExports.useMemo(
    () => ({
      remainingByKind: {
        image: remainingImage,
        video: remainingVideo,
        audio: remainingAudio,
        // Only hosts with editable text refs declare a text budget.
        ...(editableText
          ? {
              text: remainingText,
            }
          : {}),
        ...(effectiveMaxFile > 0
          ? {
              file: remainingFile,
            }
          : {}),
      },
      ...(effectiveMaxVideoAudio !== void 0
        ? {
            remainingVideoAudio,
          }
        : {}),
      audioPerClipMinSec: effectiveAudioPerClipMinSec,
      audioPerClipMaxSec: effectiveAudioPerClipMaxSec,
      ...(imageInputLimits ?? {}),
      ...(videoPerClipMinSec !== void 0
        ? {
            videoPerClipMinSec,
          }
        : {}),
      ...(videoPerClipMaxSec !== void 0
        ? {
            videoPerClipMaxSec,
          }
        : {}),
      ...(videoMinFps !== void 0
        ? {
            videoMinFps,
          }
        : {}),
      ...(videoMaxFps !== void 0
        ? {
            videoMaxFps,
          }
        : {}),
      remainingAudioTotalSec: Math.max(
        0,
        effectiveAudioTotalMaxSec - usedAudioSec,
      ),
      remainingVideoTotalSec: Math.max(
        0,
        effectiveVideoTotalMaxSec - usedVideoSec,
      ),
    }),
    [
      remainingImage,
      remainingVideo,
      remainingAudio,
      remainingVideoAudio,
      editableText,
      remainingText,
      effectiveMaxFile,
      remainingFile,
      usedAudioSec,
      usedVideoSec,
      effectiveAudioPerClipMinSec,
      effectiveAudioPerClipMaxSec,
      effectiveAudioTotalMaxSec,
      effectiveVideoTotalMaxSec,
      imageInputLimits,
      videoPerClipMinSec,
      videoPerClipMaxSec,
      effectiveMaxVideoAudio,
      videoMinFps,
      videoMaxFps,
    ],
  );
  const pickerConstraintsFingerprint = reactExports.useMemo(
    () => JSON.stringify(pickerConstraints),
    [pickerConstraints],
  );
  const items = reactExports.useMemo(() => {
    const result = [];
    const seen2 = new Set();
    const pushOnce = (item) => {
      if (seen2.has(item.path) || isCanvasSubjectReference(item.path)) return;
      seen2.add(item.path);
      result.push(item);
    };
    for (const p3 of editableText ? filledTexts : (defaultTextPaths ?? [])) {
      pushOnce(pathToDisplayItem(p3, "text", assetMetadataAssets, void 0));
    }
    for (const p3 of filledFiles) {
      pushOnce(pathToDisplayItem(p3, "file", assetMetadataAssets, void 0));
    }
    for (let i2 = 0; i2 < filledImages.length; i2++) {
      if (!filledImages[i2]) continue;
      const badge = isFirstLastFrame
        ? i2 === 0
          ? "first"
          : i2 === 1
            ? "last"
            : void 0
        : void 0;
      pushOnce(
        pathToDisplayItem(
          filledImages[i2],
          "image",
          assetMetadataAssets,
          resolveFileUrl,
          badge,
        ),
      );
    }
    if (!isFirstLastFrame) {
      for (const p3 of filledVideos) {
        pushOnce(
          pathToDisplayItem(
            p3,
            "video",
            assetMetadataAssets,
            resolveFileUrl,
            void 0,
            videoPerClipMinSec,
            videoPerClipMaxSec,
          ),
        );
      }
      if (!isVideoExtension) {
        for (const p3 of filledAudios) {
          pushOnce(
            pathToDisplayItem(
              p3,
              "audio",
              assetMetadataAssets,
              resolveFileUrl,
              void 0,
              effectiveAudioPerClipMinSec,
              effectiveAudioPerClipMaxSec,
            ),
          );
        }
      }
    }
    return result;
  }, [
    assetMetadataAssets,
    defaultTextPaths,
    editableText,
    filledImages,
    filledVideos,
    filledAudios,
    filledTexts,
    filledFiles,
    isFirstLastFrame,
    isVideoExtension,
    resolveFileUrl,
    effectiveAudioPerClipMinSec,
    effectiveAudioPerClipMaxSec,
    videoPerClipMinSec,
    videoPerClipMaxSec,
  ]);
  const existingAttachments = reactExports.useMemo(() => {
    const allPaths = new Set(
      [
        ...filledImages,
        ...filledVideos,
        ...filledAudios,
        ...filledTexts,
        ...filledFiles,
      ].filter(Boolean),
    );
    if (allPaths.size === 0) return [];
    const list2 = [];
    assetMetadataStore.getState().assets.forEach((meta2, id2) => {
      if (meta2.path && allPaths.has(meta2.path)) {
        const kind = meta2.type;
        list2.push({
          assetId: id2,
          name: meta2.name,
          kind,
        });
      }
    });
    return list2;
  }, [
    assetMetadataStore,
    filledImages,
    filledVideos,
    filledAudios,
    filledTexts,
    filledFiles,
  ]);
  const wireEdge = reactExports.useCallback(
    ({ path: path2, sourceNodeId }, kind) => {
      if (!hostNodeId || isCanvasReferenceUri(path2)) return;
      const sourceId = resolveAttachmentSourceNodeId(
        {
          path: path2,
          sourceNodeId,
        },
        ensureStandaloneNodeById,
        ensureStandaloneNodeForPath,
      );
      if (sourceId) {
        sourceNodeIdByPathRef.current.set(path2, sourceId);
        ensureDerivationEdge(sourceId, hostNodeId);
        if (kind === "image") {
          try {
            onMediaLineage?.({
              stage: "reference.bound",
              nodeId: hostNodeId,
              sourceNodeId: sourceId,
              path: path2,
            });
          } catch {}
        }
        return;
      }
      if (ensureMediaNodeForPath) {
        ensureMediaNodeForPath(path2).then((res) => {
          if (!res?.nodeId || !pathsByKindRef.current[kind].includes(path2))
            return;
          sourceNodeIdByPathRef.current.set(path2, res.nodeId);
          ensureDerivationEdge(res.nodeId, hostNodeId);
          if (kind === "image") {
            try {
              onMediaLineage?.({
                stage: "reference.bound",
                nodeId: hostNodeId,
                sourceNodeId: res.nodeId,
                path: path2,
              });
            } catch {}
          }
        });
      }
    },
    [
      hostNodeId,
      ensureStandaloneNodeById,
      ensureStandaloneNodeForPath,
      ensureDerivationEdge,
      ensureMediaNodeForPath,
      onMediaLineage,
    ],
  );
  const unwireEdge = reactExports.useCallback(
    (path2) => {
      if (!hostNodeId || isCanvasReferenceUri(path2)) return;
      const sourceId =
        sourceNodeIdByPathRef.current.get(path2) ??
        getIncomingSourceNodeIdByPath(hostNodeId, path2) ??
        getNodeIdByPath(path2);
      if (sourceId) {
        removeDerivationEdge(sourceId, hostNodeId);
        sourceNodeIdByPathRef.current.delete(path2);
      }
    },
    [
      hostNodeId,
      getIncomingSourceNodeIdByPath,
      getNodeIdByPath,
      removeDerivationEdge,
    ],
  );
  const interactionInFlight = isDragging || isMultiSelect || isBoxSelecting;
  reactExports.useEffect(() => {
    if (rejectedImages.size === 0) return;
    if (interactionInFlight) return;
    if (!suppressImageAspectRejectedToast) {
      const reasons = new Set(rejectedImages.values());
      if (reasons.has("image-aspect")) {
        dedupedToast.warning(
          t2(
            "canvas.attachment.imageAspectRejected",
            "Image aspect ratio does not meet the current model requirements. Connection removed.",
          ),
          {
            id: IMAGE_ASPECT_REJECTED_TOAST_ID,
          },
        );
      } else if (reasons.has("image-size")) {
        dedupedToast.warning(
          t2(
            "canvas.attachment.imageSizeRejected",
            "Image is smaller than the current model requires. Connection removed.",
          ),
          {
            id: IMAGE_ASPECT_REJECTED_TOAST_ID,
          },
        );
      }
    }
    for (const path2 of rejectedImages.keys()) {
      removedPathsRef.current.add(path2);
      unwireEdge(path2);
    }
    updatePathsForKind("image", (currentPaths) => {
      const acceptedPaths = currentPaths.map((path2) =>
        rejectedImages.has(path2) ? "" : path2,
      );
      return isFirstLastFrame
        ? normalizeFirstLastFramePaths(acceptedPaths)
        : acceptedPaths.filter(Boolean);
    });
  }, [
    interactionInFlight,
    isFirstLastFrame,
    rejectedImages,
    suppressImageAspectRejectedToast,
    t2,
    unwireEdge,
    updatePathsForKind,
  ]);
  const logImageReferences = reactExports.useCallback(
    (stage, paths) => {
      if (!onMediaLineage) return;
      try {
        const assets = assetMetadataStore.getState().assets;
        if (paths.length === 0)
          onMediaLineage({
            stage,
            nodeId: hostNodeId,
            referenceCount: 0,
          });
        for (const [referenceIndex, path2] of paths
          .slice(0, MEDIA_LINEAGE_MAX_REFERENCES)
          .entries()) {
          let assetId;
          for (const [, meta2] of assets) {
            if (meta2.path === path2) {
              assetId = meta2.url?.match(/\/files\/id\/([\w-]+)/)?.[1];
              if (assetId) break;
            }
          }
          onMediaLineage({
            stage,
            nodeId: hostNodeId,
            sourceNodeId: sourceNodeIdByPathRef.current.get(path2),
            referenceIndex,
            referenceCount: paths.length,
            path: path2,
            assetId,
          });
        }
      } catch {}
    },
    [assetMetadataStore, hostNodeId, onMediaLineage],
  );
  const addPaths = reactExports.useCallback(
    (paths, kind) => {
      const selections = paths
        .map(normalizeAttachmentSelection)
        .filter(
          (item) => !isFirstLastFrame || !isCanvasSubjectReference(item.path),
        );
      const subjects = selections.filter((selection2) =>
        isCanvasSubjectReference(selection2.path),
      );
      const admittedSubjects = [];
      if (subjects.length) {
        const limits = {
          image: effectiveMaxImage,
          video: effectiveMaxVideo,
          audio: effectiveMaxAudio,
          text: effectiveMaxText,
          file: 0,
        };
        for (const subject of subjects) {
          const kinds = ATTACHMENT_KINDS.filter(
            (targetKind) =>
              limits[targetKind] > 0 &&
              referenceCount(subject.path, targetKind) > 0,
          );
          const admissions = kinds.map((targetKind) => ({
            kind: targetKind,
            ...admitAttachmentSelections(
              pathsForKind(targetKind),
              [subject],
              limits[targetKind],
              (path2) => referenceCount(path2, targetKind),
            ),
          }));
          if (
            !admissions.length ||
            admissions.some((entry) => !entry.paths.includes(subject.path))
          )
            continue;
          const mediaCount = (targetKind) =>
            usedSlots(
              admissions.find((entry) => entry.kind === targetKind)?.paths ??
                pathsForKind(targetKind),
              targetKind,
            );
          if (
            effectiveMaxVideoAudio !== void 0 &&
            mediaCount("video") + mediaCount("audio") > effectiveMaxVideoAudio
          )
            continue;
          removedPathsRef.current.delete(subject.path);
          for (const entry of admissions)
            updatePathsForKind(entry.kind, () => entry.paths);
          admittedSubjects.push(subject.path);
        }
      }
      const max2 =
        kind === "image"
          ? effectiveMaxImage
          : kind === "video"
            ? effectiveMaxVideo
            : kind === "text"
              ? effectiveMaxText
              : kind === "file"
                ? effectiveMaxFile
                : effectiveMaxAudio;
      const sharedMax =
        kind === "video" || kind === "audio" ? effectiveMaxVideoAudio : void 0;
      const sharedUsed =
        usedSlots(pathsForKind("video"), "video") +
        usedSlots(pathsForKind("audio"), "audio");
      const maxForKind =
        sharedMax === void 0
          ? max2
          : Math.min(
              max2,
              usedSlots(pathsForKind(kind), kind) +
                Math.max(0, sharedMax - sharedUsed),
            );
      const admission = admitAttachmentSelections(
        pathsForKind(kind),
        selections.filter(
          (selection2) => !isCanvasSubjectReference(selection2.path),
        ),
        maxForKind,
        (path2) => referenceCount(path2, kind),
      );
      if (admission.admitted.length === 0) return admittedSubjects;
      const nextPaths =
        kind === "image" && isFirstLastFrame
          ? (() => {
              const next2 = normalizeFirstLastFramePaths(
                pathsByKindRef.current.image,
              );
              for (const { path: path2 } of admission.admitted) {
                const vacantSlot = Array.from({
                  length: FIRST_LAST_FRAME_SLOT_COUNT,
                }).findIndex((_2, index2) => !next2[index2]);
                if (vacantSlot < 0) break;
                while (next2.length <= vacantSlot) next2.push("");
                next2[vacantSlot] = path2;
              }
              return normalizeFirstLastFramePaths(next2);
            })()
          : admission.paths;
      for (const { path: path2 } of admission.admitted)
        removedPathsRef.current.delete(path2);
      if (kind === "image" && admission.admitted.length > 0) {
        userEditedImagePathsRef.current = true;
      }
      updatePathsForKind(kind, () => nextPaths);
      if (kind === "video") {
        devLogAttachment("add-paths", {
          incomingCount: selections.filter((item) => item.path).length,
          mergedCount: nextPaths.filter(Boolean).length,
        });
      }
      for (const selection2 of admission.admitted) wireEdge(selection2, kind);
      if (kind === "image") logImageReferences("reference.selected", nextPaths);
      return [
        ...admittedSubjects,
        ...admission.admitted.map(({ path: path2 }) => path2),
      ];
    },
    [
      pathsForKind,
      referenceCount,
      usedSlots,
      effectiveMaxImage,
      effectiveMaxVideo,
      effectiveMaxAudio,
      effectiveMaxText,
      effectiveMaxFile,
      effectiveMaxVideoAudio,
      isFirstLastFrame,
      wireEdge,
      hostNodeId,
      updatePathsForKind,
      logImageReferences,
    ],
  );
  const replaceImagePaths = reactExports.useCallback(
    (paths) => {
      const nextPaths = isFirstLastFrame
        ? normalizeFirstLastFramePaths(paths)
        : paths.filter(Boolean).slice(0, effectiveMaxImage);
      const previousPaths = pathsByKindRef.current.image;
      const previousSet = new Set(previousPaths.filter(Boolean));
      const nextSet = new Set(nextPaths.filter(Boolean));
      for (const path2 of previousSet) {
        if (nextSet.has(path2)) continue;
        removedPathsRef.current.add(path2);
        unwireEdge(path2);
      }
      for (const path2 of nextSet) {
        if (previousSet.has(path2)) continue;
        removedPathsRef.current.delete(path2);
        wireEdge(
          {
            path: path2,
          },
          "image",
        );
      }
      userEditedImagePathsRef.current = true;
      updatePathsForKind("image", () => nextPaths);
      logImageReferences("reference.replaced", nextPaths);
    },
    [
      logImageReferences,
      effectiveMaxImage,
      isFirstLastFrame,
      unwireEdge,
      updatePathsForKind,
      wireEdge,
    ],
  );
  const removePath = reactExports.useCallback(
    (path2, opts2) => {
      if (pathsByKindRef.current.image.includes(path2))
        logImageReferences(
          "reference.before-remove",
          pathsByKindRef.current.image,
        );
      removedPathsRef.current.add(path2);
      if (pathsByKindRef.current.image.includes(path2))
        userEditedImagePathsRef.current = true;
      updatePathsForKind("image", (currentPaths) =>
        isFirstLastFrame
          ? normalizeFirstLastFramePaths(
              currentPaths.map((p3) => (p3 === path2 ? "" : p3)),
            )
          : currentPaths.filter((p3) => p3 !== path2),
      );
      updatePathsForKind("video", (currentPaths) =>
        currentPaths.filter((p3) => p3 !== path2),
      );
      updatePathsForKind("audio", (currentPaths) =>
        currentPaths.filter((p3) => p3 !== path2),
      );
      updatePathsForKind("text", (currentPaths) =>
        currentPaths.filter((p3) => p3 !== path2),
      );
      updatePathsForKind("file", (currentPaths) =>
        currentPaths.filter((p3) => p3 !== path2),
      );
      if (opts2?.tearEdge) unwireEdge(path2);
      logImageReferences(
        "reference.after-remove",
        pathsByKindRef.current.image,
      );
    },
    [logImageReferences, isFirstLastFrame, unwireEdge, updatePathsForKind],
  );
  const clearPaths = reactExports.useCallback(() => {
    const hadImageReferences = pathsByKindRef.current.image.some(Boolean);
    if (hadImageReferences) {
      logImageReferences(
        "reference.before-clear",
        pathsByKindRef.current.image,
      );
      userEditedImagePathsRef.current = true;
    }
    for (const kind of ATTACHMENT_KINDS) {
      for (const path2 of pathsByKindRef.current[kind]) {
        if (path2) removedPathsRef.current.add(path2);
      }
      updatePathsForKind(kind, () => []);
    }
    if (hadImageReferences) logImageReferences("reference.cleared", []);
  }, [logImageReferences, updatePathsForKind]);
  const openPicker = reactExports.useCallback(
    async (anchor) => {
      if (!pickAsset) {
        return;
      }
      devLogAttachment("open-picker", {
        kinds: [...pickerKindFilter],
      });
      let picks = null;
      try {
        const resources = await pickAsset(
          {
            // Accept whichever media kinds still have slot room. When all kinds
            // are full the picker would offer nothing — callers gate the "+"
            // button on `showAddButton` so we never reach here in that state.
            type: [...pickerKindFilter],
            multiple: true,
            existingAssetIds: existingAttachments.map((a2) => a2.assetId),
            constraints: pickerConstraints,
            uploadMode: "attach",
            // Canvas composers have no upstream lineage to display — hide that
            // tab and keep the dialog focused on workspace + upload.
            tabs: ["canvas", "upload"],
          },
          anchor
            ? {
                anchor,
                accepts: (resource) =>
                  resource.type !== "file" &&
                  (resource.type !== "text" || editableText)
                    ? true
                    : matchesFileExtensions(resource.path, fileExtensions),
              }
            : void 0,
        );
        if (!resources) return;
        devLogAttachment("picker-confirmed", {
          hostNodeId: hostNodeId ?? "",
          resourceCount: resources.length,
          kinds: resources.map((r2) => r2.type),
        });
        picks = resources
          .filter(
            (r2) =>
              r2.type === "image" ||
              r2.type === "video" ||
              r2.type === "audio" ||
              (editableText && r2.type === "text") ||
              (effectiveMaxFile > 0 &&
                (r2.type === "file" || r2.type === "text")),
          )
          .map((r2) => ({
            assetId: r2.assetId,
            name: r2.name,
            kind: r2.type,
            nodeId: r2.nodeId,
            path: r2.path,
          }));
      } catch (err) {
        if (err?.code === "picker_busy") return;
        console.warn("[use-attachment-state] pickAsset rejected", err);
        return;
      }
      if (!picks || picks.length === 0) return;
      const assets = assetMetadataStore.getState().assets;
      const allExisting = new Set([
        ...imagePaths.filter(Boolean),
        ...videoPaths.filter(Boolean),
        ...audioPaths.filter(Boolean),
        ...textPaths.filter(Boolean),
        ...filePaths.filter(Boolean),
      ]);
      const imageAdds = [];
      const videoAdds = [];
      const audioAdds = [];
      const textAdds = [];
      const fileAdds = [];
      let rejectedFileExtension = false;
      for (const pick of picks) {
        const meta2 = assets.get(pick.assetId);
        const path2 = meta2?.path ?? pick.path;
        if (!path2 || allExisting.has(path2)) continue;
        allExisting.add(path2);
        const selection2 = {
          path: path2,
          ...(pick.nodeId
            ? {
                sourceNodeId: pick.nodeId,
              }
            : {}),
        };
        if (pick.kind === "image") imageAdds.push(selection2);
        else if (pick.kind === "video") videoAdds.push(selection2);
        else if (pick.kind === "audio") audioAdds.push(selection2);
        else if (pick.kind === "text" && editableText)
          textAdds.push(selection2);
        else {
          if (matchesFileExtensions(path2, fileExtensions))
            fileAdds.push(selection2);
          else rejectedFileExtension = true;
        }
      }
      if (rejectedFileExtension) {
        dedupedToast.error(
          t2("canvas.attachment.fileExtensionRejected", {
            defaultValue:
              "The current model does not support this document format.",
          }),
        );
      }
      if (imageAdds.length > 0) addPaths(imageAdds, "image");
      if (videoAdds.length > 0) addPaths(videoAdds, "video");
      if (audioAdds.length > 0) addPaths(audioAdds, "audio");
      if (textAdds.length > 0) addPaths(textAdds, "text");
      if (fileAdds.length > 0) addPaths(fileAdds, "file");
    },
    [
      pickAsset,
      pickerKindFilter,
      pickerConstraints,
      existingAttachments,
      assetMetadataStore,
      imagePaths,
      videoPaths,
      audioPaths,
      textPaths,
      filePaths,
      editableText,
      effectiveMaxFile,
      fileExtensions,
      addPaths,
      hostNodeId,
      t2,
    ],
  );
  const replacementContextRef = reactExports.useRef({
    pickerConstraints,
    pickerConstraintsFingerprint,
    hostNodeId,
    imageMode,
    modelKey,
    fileExtensions,
  });
  replacementContextRef.current = {
    pickerConstraints,
    pickerConstraintsFingerprint,
    hostNodeId,
    imageMode,
    modelKey,
    fileExtensions,
  };
  const replacementMountedRef = reactExports.useRef(true);
  reactExports.useEffect(() => {
    replacementMountedRef.current = true;
    return () => {
      replacementMountedRef.current = false;
    };
  }, []);
  const replacePath = reactExports.useCallback(
    async (item, anchor, canApply) => {
      if (
        !pickAsset ||
        (item.kind === "text" && !editableText) ||
        canApply?.() === false
      )
        return null;
      if (!pathsByKindRef.current[item.kind].includes(item.path)) return null;
      const context = replacementContextRef.current;
      const originalPaths = pathsByKindRef.current[item.kind];
      const replacementConstraints = {
        ...pickerConstraints,
        remainingByKind: {
          ...pickerConstraints.remainingByKind,
          [item.kind]: 1,
        },
        ...(item.kind === "video" || item.kind === "audio"
          ? {
              remainingVideoAudio: 1,
            }
          : {}),
        remainingAudioTotalSec:
          pickerConstraints.remainingAudioTotalSec +
          (item.kind === "audio" ? (item.durationSec ?? 0) : 0),
        remainingVideoTotalSec:
          pickerConstraints.remainingVideoTotalSec +
          (item.kind === "video" ? (item.durationSec ?? 0) : 0),
      };
      let resources;
      try {
        resources = await pickAsset(
          {
            // The document slot accepts two asset kinds, so a replacement must be
            // searched across both (swapping a .pdf for a .md is legitimate).
            type:
              item.kind === "file" ? [...FILE_SLOT_PICK_KINDS] : [item.kind],
            multiple: false,
            existingAssetIds: existingAttachments.map(
              (attachment) => attachment.assetId,
            ),
            constraints: replacementConstraints,
            uploadMode: "attach",
            tabs: ["canvas", "upload"],
          },
          anchor
            ? {
                anchor,
                existingPaths: Object.values(pathsByKindRef.current)
                  .flat()
                  .filter(Boolean),
                accepts: (resource2) =>
                  item.kind !== "file" ||
                  matchesFileExtensions(resource2.path, fileExtensions),
              }
            : void 0,
        );
      } catch (err) {
        if (err?.code === "picker_busy") return null;
        console.warn(
          "[use-attachment-state] replacement pickAsset rejected",
          err,
        );
        return null;
      }
      const resource = resources?.[0];
      const resourceFitsSlot =
        item.kind === "file"
          ? resource?.type === "file" || resource?.type === "text"
          : resource?.type === item.kind;
      if (!resource || !resourceFitsSlot) return null;
      const assets = assetMetadataStore.getState().assets;
      const meta2 = assets.get(resource.assetId);
      const nextPath = meta2?.path ?? resource.path;
      if (!nextPath || nextPath === item.path) return null;
      if (
        item.kind === "file" &&
        !matchesFileExtensions(nextPath, fileExtensions)
      ) {
        dedupedToast.error(
          t2("canvas.attachment.fileExtensionRejected", {
            defaultValue:
              "The current model does not support this document format.",
          }),
        );
        return null;
      }
      if (
        !replacementMountedRef.current ||
        canApply?.() === false ||
        context.modelKey !== replacementContextRef.current.modelKey ||
        context.fileExtensions !==
          replacementContextRef.current.fileExtensions ||
        context.pickerConstraintsFingerprint !==
          replacementContextRef.current.pickerConstraintsFingerprint ||
        context.hostNodeId !== replacementContextRef.current.hostNodeId ||
        context.imageMode !== replacementContextRef.current.imageMode
      )
        return null;
      if (
        !pathsByKindRef.current[item.kind].includes(item.path) ||
        pathsByKindRef.current[item.kind].includes(nextPath)
      )
        return null;
      if (
        originalPaths.indexOf(item.path) !==
        pathsByKindRef.current[item.kind].indexOf(item.path)
      )
        return null;
      if (item.kind === "image") {
        logImageReferences(
          "reference.before-replace",
          pathsByKindRef.current.image,
        );
        userEditedImagePathsRef.current = true;
      }
      removedPathsRef.current.add(item.path);
      removedPathsRef.current.delete(nextPath);
      updatePathsForKind(item.kind, (currentPaths) =>
        currentPaths.map((path2) => (path2 === item.path ? nextPath : path2)),
      );
      unwireEdge(item.path);
      wireEdge(
        {
          path: nextPath,
          ...(resource.nodeId
            ? {
                sourceNodeId: resource.nodeId,
              }
            : {}),
        },
        item.kind,
      );
      if (item.kind === "image")
        logImageReferences("reference.replaced", pathsByKindRef.current.image);
      return pathToDisplayItem(
        nextPath,
        item.kind,
        assets,
        item.kind === "text" || item.kind === "file" ? void 0 : resolveFileUrl,
        item.badgeLabel,
        item.kind === "audio"
          ? effectiveAudioPerClipMinSec
          : videoPerClipMinSec,
        item.kind === "audio"
          ? effectiveAudioPerClipMaxSec
          : videoPerClipMaxSec,
      );
    },
    [
      assetMetadataStore,
      logImageReferences,
      editableText,
      effectiveAudioPerClipMaxSec,
      effectiveAudioPerClipMinSec,
      existingAttachments,
      fileExtensions,
      pickAsset,
      pickerConstraints,
      resolveFileUrl,
      t2,
      unwireEdge,
      updatePathsForKind,
      videoPerClipMaxSec,
      videoPerClipMinSec,
      wireEdge,
    ],
  );
  const editImage = reactExports.useCallback(
    async (item, options) => {
      if (
        !uploadAttachment ||
        !canAnnotateCanvasImage(item.kind, item.name, item.thumbUrl)
      )
        return;
      const context = replacementContextRef.current;
      const index2 =
        options?.slotIndex ?? pathsByKindRef.current.image.indexOf(item.path);
      const constraints2 = context.pickerConstraintsFingerprint;
      const valid2 = () =>
        replacementMountedRef.current &&
        index2 >= 0 &&
        options?.canApply?.() !== false &&
        pathsByKindRef.current.image[index2] === item.path &&
        context.modelKey === replacementContextRef.current.modelKey &&
        context.hostNodeId === replacementContextRef.current.hostNodeId &&
        context.imageMode === replacementContextRef.current.imageMode &&
        constraints2 ===
          replacementContextRef.current.pickerConstraintsFingerprint;
      const canAppend =
        !isFirstLastFrame && pickerConstraints.remainingByKind.image > 0;
      await imageAnnotation.open(
        {
          path: item.path,
          name: item.name,
          url: resolveFileUrl?.(item.path) || item.thumbUrl || "",
          canAppend,
          onApply: async (file, mode2, signal) => {
            if (
              !valid2() ||
              signal.aborted ||
              (mode2 === "append" && !canAppend)
            )
              return false;
            const saved = await uploadAttachment(file);
            if (
              !valid2() ||
              signal.aborted ||
              saved.kind !== "image" ||
              !saved.path ||
              saved.path === item.path
            )
              return false;
            if (getImageConstraintReason(saved, imageInputLimits)) {
              throw new Error(
                t2(
                  "canvas.imageSlot.annotatedImageRejected",
                  "The edited image does not meet the current model requirements.",
                ),
              );
            }
            if (pathsByKindRef.current.image.includes(saved.path)) return false;
            assetMetadataStore.getState().set(saved.assetId, {
              type: "image",
              name: saved.name,
              path: saved.path,
              url: saved.url,
              width: saved.width,
              height: saved.height,
            });
            if (mode2 === "append")
              return addPaths([saved.path], "image").includes(saved.path);
            const replacement = {
              ...item,
              path: saved.path,
              name: saved.name,
              thumbUrl: saved.url,
              width: saved.width,
              height: saved.height,
            };
            userEditedImagePathsRef.current = true;
            removedPathsRef.current.delete(saved.path);
            updatePathsForKind("image", (paths) =>
              paths.map((path2, position2) =>
                position2 === index2 ? saved.path : path2,
              ),
            );
            if (!pathsByKindRef.current.image.includes(item.path)) {
              removedPathsRef.current.add(item.path);
              unwireEdge(item.path);
              options?.onReplace?.(replacement);
            }
            wireEdge(
              {
                path: saved.path,
              },
              "image",
            );
            return true;
          },
        },
        valid2,
      );
    },
    [
      uploadAttachment,
      imageAnnotation,
      isFirstLastFrame,
      pickerConstraints,
      resolveFileUrl,
      imageInputLimits,
      assetMetadataStore,
      addPaths,
      updatePathsForKind,
      unwireEdge,
      wireEdge,
      t2,
    ],
  );
  return {
    metadataAssets: assetMetadataAssets,
    referenceResolutions: resolutions,
    updateReferenceMetadata,
    referenceCounts,
    items,
    imagePaths: filledImages,
    videoPaths: isFirstLastFrame ? [] : filledVideos,
    audioPaths: isFirstLastFrame || isVideoExtension ? [] : filledAudios,
    textPaths: filledTexts,
    filePaths: filledFiles,
    openPicker,
    replacePath,
    editImage,
    removePath,
    clearPaths,
    addPaths,
    replaceImagePaths,
    pickerConstraints,
    allowedKindsForAtPicker,
    modelSupportedKindsForAtPicker,
    showAddButton,
    existingAttachments,
  };
}
