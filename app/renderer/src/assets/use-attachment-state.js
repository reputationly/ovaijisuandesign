// use-attachment-state.js
import { MEDIA_LINEAGE_MAX_REFERENCES, reactExports, useTranslation } from "../vendor.js";
import { dedupedToast, useAssetMetadataApi, useAssetMetadataStore } from "../infra/agent-http-client.js";
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
    [...new Set(paths.filter((path) => !!parseCanvasReference(path)))].sort(),
  );
  const [resolved, setResolved] = reactExports.useState({
    bridge: directReferences,
    rows: new Map(),
  });
  const latest = reactExports.useRef(resolved);
  latest.current = resolved;
  const revision = reactExports.useRef(0);
  const updateReferenceMetadata = reactExports.useCallback(
    (results) => {
      revision.current++;
      const byIdentity = new Map(
        results.map((row) => [canvasReferenceIdentity(row.reference), row]),
      );
      const previous =
        latest.current.bridge === directReferences
          ? latest.current.rows
          : new Map();
      const rows = new Map();
      const authoredPaths = JSON.parse(pathKey);
      for (const path of authoredPaths) {
        const reference = parseCanvasReference(path);
        const row =
          reference && byIdentity.get(canvasReferenceIdentity(reference));
        if (!row) {
          const prior = previous.get(path);
          if (prior) rows.set(path, prior);
          continue;
        }
        rows.set(path, row);
      }
      const next = {
        bridge: directReferences,
        rows,
      };
      latest.current = next;
      setResolved(next);
    },
    [directReferences, pathKey],
  );
  reactExports.useEffect(() => {
    if (!directReferences || pathKey === "[]") return;
    const authoredPaths = JSON.parse(pathKey);
    let cancelled = false;
    const refresh = async () => {
      const current = ++revision.current;
      const rows = [];
      try {
        for (let offset = 0; offset < authoredPaths.length; offset += 100) {
          const batch = authoredPaths.slice(offset, offset + 100);
          const references = batch.flatMap((path) => {
            const reference = parseCanvasReference(path);
            return reference ? [reference] : [];
          });
          const results = await directReferences.checkAvailability(references, {
            include_metadata: true,
          });
          if (cancelled || current !== revision.current) return;
          rows.push(...results);
        }
        if (!cancelled && current === revision.current)
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
    const current = JSON.parse(pathKey);
    return new Map(
      current.flatMap((path) => {
        const row = resolved.rows.get(path);
        return row ? [[path, row]] : [];
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
  const active = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (active.current && !active.current.isValid())
      active.current.controller.abort();
  });
  reactExports.useEffect(() => () => active.current?.controller.abort(), []);
  const open = reactExports.useCallback(
    async (request, isValid) => {
      if (!openImageAnnotation || active.current || !isValid()) return;
      const controller = new AbortController();
      const entry = {
        controller,
        isValid,
      };
      active.current = entry;
      try {
        await openImageAnnotation({
          ...request,
          signal: controller.signal,
        });
      } finally {
        if (active.current === entry) active.current = null;
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

function matchesFileExtensions(path, extensions) {
  if (!extensions || extensions.length === 0) return true;
  const ext = extensionOf(path);
  return extensions.some(
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
  defaults,
  removed,
  isFirstLastFrame,
  options,
) {
  const filledDefaults = defaults.filter(Boolean);
  const canRestoreDefaultOrder =
    haveSameNonEmptyPathCounts(prev, defaults) &&
    !filledDefaults.some((path) => removed.has(path));
  if (options?.preserveUserSlots && canRestoreDefaultOrder) {
    return isFirstLastFrame
      ? normalizeFirstLastFramePaths(prev)
      : [...prev.filter(Boolean)];
  }
  if (canRestoreDefaultOrder) {
    return isFirstLastFrame
      ? normalizeFirstLastFramePaths(defaults)
      : [...filledDefaults];
  }
  return isFirstLastFrame
    ? reconcileFirstLastFrameDefaultPaths(prev, defaults, removed)
    : reconcileDefaultPaths(prev, defaults, removed);
}

function selectNewAttachmentPaths(currentPaths, incomingPaths, max, count) {
  return selectNewAttachments(currentPaths, incomingPaths, max, count).map(
    (item) => item.path,
  );
}

function admitAttachmentSelections(currentPaths, incoming, max, count) {
  const admitted = selectNewAttachments(currentPaths, incoming, max, count);
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
  count,
) {
  const bound = (paths, max, kind) =>
    count && paths.some(isCanvasSubjectReference)
      ? selectNewAttachmentPaths([], paths, max, (path) =>
          count(path, kind),
        )
      : paths.filter(Boolean).slice(0, max);
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
    (total, path) => total + (count?.(path, "video") ?? 1),
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

function resolveAttachmentSourceNodeId(selection, ensureById, ensureByPath) {
  if (selection.sourceNodeId) {
    const exact = ensureById(selection.sourceNodeId);
    if (exact) return exact;
  }
  return ensureByPath(selection.path);
}

function pathToDisplayItem(
  path,
  kind,
  assets,
  resolveFileUrl,
  badgeLabel,
  perClipMinSec,
  perClipMaxSec,
) {
  const direct = parseCanvasReference(path);
  const displayName = direct
    ? direct.subjectName
      ? `${direct.subjectName} · ${direct.name}`
      : direct.name
    : (path.split("/").pop() ?? path);
  const thumbUrl = resolveFileUrl?.(path) ?? "";
  const meta = findMetaByPath(path, assets, kind);
  const durationSec = meta?.durationSec;
  const durationOutOfRange =
    (kind === "audio" || kind === "video") &&
    durationSec != null &&
    durationSec > 0 &&
    perClipMinSec !== void 0 &&
    perClipMaxSec !== void 0
      ? durationSec < perClipMinSec || durationSec > perClipMaxSec
      : void 0;
  return {
    path,
    kind,
    thumbUrl,
    name: displayName,
    durationSec,
    width: meta?.width,
    height: meta?.height,
    durationOutOfRange,
    durationMinSec: perClipMinSec,
    durationMaxSec: perClipMaxSec,
    audioOutOfRange: kind === "audio" ? durationOutOfRange : void 0,
    badgeLabel,
  };
}

export function useAttachmentState(opts) {
  const { t: translate } = useTranslation();
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
  const catalogAssets = useAssetMetadataStore((state) => state.assets);
  const {
    assets: assetMetadataAssets,
    resolutions,
    updateReferenceMetadata,
  } = useAssetsRefMetadata(
    [...imagePaths, ...videoPaths, ...audioPaths, ...textPaths],
    catalogAssets,
  );
  const subjectKinds = reactExports.useCallback(
    (path) => {
      const ref = parseCanvasReference(path);
      if (ref?.target !== "entity") return void 0;
      const current = resolutions.get(path);
      return current?.status === "available" && current.metadata
        ? current.metadata.attachments.map((item) => item.kind)
        : (ref.attachmentKinds ?? [ref.kind]);
    },
    [resolutions],
  );
  const pathsForKind = reactExports.useCallback(
    (kind, current = pathsByKindRef.current) => {
      const original = current[kind];
      if (kind === "file") return original;
      const subjects = [
        ...new Set(
          Object.values(current).flat().filter(isCanvasSubjectReference),
        ),
      ];
      if (!subjects.length) return original;
      const matching = subjects.filter((path) =>
        subjectKinds(path)?.includes(kind),
      );
      return [
        ...original.filter(
          (path) =>
            !isCanvasSubjectReference(path) || matching.includes(path),
        ),
        ...matching.filter((path) => !original.includes(path)),
      ];
    },
    [subjectKinds],
  );
  const referenceCount = reactExports.useCallback(
    (path, kind) =>
      subjectKinds(path)?.filter((value) => value === kind).length ?? 1,
    [subjectKinds],
  );
  const usedSlots = reactExports.useCallback(
    (paths, kind) =>
      paths
        .filter(Boolean)
        .reduce((total, path) => total + referenceCount(path, kind), 0),
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
  const updatePathsForKind = reactExports.useCallback((kind, update) => {
    const nextPaths = update(pathsByKindRef.current[kind]);
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
    for (const path of subjects) removedPathsRef.current.add(path);
    for (const kind of ATTACHMENT_KINDS) {
      updatePathsForKind(kind, (paths) =>
        paths.some(isCanvasSubjectReference)
          ? paths.filter((path) => !isCanvasSubjectReference(path))
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
    for (const path of projectedImagePaths) {
      if (!path) continue;
      const meta = findMetaByPath(path, assetMetadataAssets, "image");
      const reason = getImageConstraintReason(meta, imageInputLimits);
      if (reason) rejected.set(path, reason);
    }
    return rejected;
  }, [assetMetadataAssets, imageInputLimits, projectedImagePaths]);
  const constrainedImagePaths = reactExports.useMemo(
    () =>
      projectedImagePaths.map((path) =>
        rejectedImages.has(path) ? "" : path,
      ),
    [projectedImagePaths, rejectedImages],
  );
  const filledImages = isFirstLastFrame
    ? normalizeFirstLastFramePaths(constrainedImagePaths)
    : selectNewAttachmentPaths(
        [],
        constrainedImagePaths,
        effectiveMaxImage,
        (path) => referenceCount(path, "image"),
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
    (path) => referenceCount(path, "text"),
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
    for (const audioPath of filledAudios) {
      const audioDurationSec = findMetaByPath(audioPath, assetMetadataAssets, "audio")?.durationSec;
      if (typeof audioDurationSec === "number" && audioDurationSec > 0) total += audioDurationSec;
    }
    return total;
  }, [assetMetadataAssets, filledAudios]);
  const usedVideoSec = reactExports.useMemo(() => {
    let total = 0;
    for (const videoPath of filledVideos) {
      const videoDurationSec = findMetaByPath(videoPath, assetMetadataAssets, "video")?.durationSec;
      if (typeof videoDurationSec === "number" && videoDurationSec > 0) total += videoDurationSec;
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
    const seen = new Set();
    const pushOnce = (item) => {
      if (seen.has(item.path) || isCanvasSubjectReference(item.path)) return;
      seen.add(item.path);
      result.push(item);
    };
    for (const textPath of editableText ? filledTexts : (defaultTextPaths ?? [])) {
      pushOnce(pathToDisplayItem(textPath, "text", assetMetadataAssets, void 0));
    }
    for (const filePath of filledFiles) {
      pushOnce(pathToDisplayItem(filePath, "file", assetMetadataAssets, void 0));
    }
    for (let imageIndex = 0; imageIndex < filledImages.length; imageIndex++) {
      if (!filledImages[imageIndex]) continue;
      const badge = isFirstLastFrame
        ? imageIndex === 0
          ? "first"
          : imageIndex === 1
            ? "last"
            : void 0
        : void 0;
      pushOnce(
        pathToDisplayItem(
          filledImages[imageIndex],
          "image",
          assetMetadataAssets,
          resolveFileUrl,
          badge,
        ),
      );
    }
    if (!isFirstLastFrame) {
      for (const videoPath of filledVideos) {
        pushOnce(
          pathToDisplayItem(
            videoPath,
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
        for (const audioPath of filledAudios) {
          pushOnce(
            pathToDisplayItem(
              audioPath,
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
    const list = [];
    assetMetadataStore.getState().assets.forEach((meta, assetId) => {
      if (meta.path && allPaths.has(meta.path)) {
        const kind = meta.type;
        list.push({
          assetId,
          name: meta.name,
          kind,
        });
      }
    });
    return list;
  }, [
    assetMetadataStore,
    filledImages,
    filledVideos,
    filledAudios,
    filledTexts,
    filledFiles,
  ]);
  const wireEdge = reactExports.useCallback(
    ({ path, sourceNodeId }, kind) => {
      if (!hostNodeId || isCanvasReferenceUri(path)) return;
      const sourceId = resolveAttachmentSourceNodeId(
        {
          path,
          sourceNodeId,
        },
        ensureStandaloneNodeById,
        ensureStandaloneNodeForPath,
      );
      if (sourceId) {
        sourceNodeIdByPathRef.current.set(path, sourceId);
        ensureDerivationEdge(sourceId, hostNodeId);
        if (kind === "image") {
          try {
            onMediaLineage?.({
              stage: "reference.bound",
              nodeId: hostNodeId,
              sourceNodeId: sourceId,
              path,
            });
          } catch {}
        }
        return;
      }
      if (ensureMediaNodeForPath) {
        ensureMediaNodeForPath(path).then((res) => {
          if (!res?.nodeId || !pathsByKindRef.current[kind].includes(path))
            return;
          sourceNodeIdByPathRef.current.set(path, res.nodeId);
          ensureDerivationEdge(res.nodeId, hostNodeId);
          if (kind === "image") {
            try {
              onMediaLineage?.({
                stage: "reference.bound",
                nodeId: hostNodeId,
                sourceNodeId: res.nodeId,
                path,
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
    (path) => {
      if (!hostNodeId || isCanvasReferenceUri(path)) return;
      const sourceId =
        sourceNodeIdByPathRef.current.get(path) ??
        getIncomingSourceNodeIdByPath(hostNodeId, path) ??
        getNodeIdByPath(path);
      if (sourceId) {
        removeDerivationEdge(sourceId, hostNodeId);
        sourceNodeIdByPathRef.current.delete(path);
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
          translate(
            "canvas.attachment.imageAspectRejected",
            "Image aspect ratio does not meet the current model requirements. Connection removed.",
          ),
          {
            id: IMAGE_ASPECT_REJECTED_TOAST_ID,
          },
        );
      } else if (reasons.has("image-size")) {
        dedupedToast.warning(
          translate(
            "canvas.attachment.imageSizeRejected",
            "Image is smaller than the current model requires. Connection removed.",
          ),
          {
            id: IMAGE_ASPECT_REJECTED_TOAST_ID,
          },
        );
      }
    }
    for (const path of rejectedImages.keys()) {
      removedPathsRef.current.add(path);
      unwireEdge(path);
    }
    updatePathsForKind("image", (currentPaths) => {
      const acceptedPaths = currentPaths.map((path) =>
        rejectedImages.has(path) ? "" : path,
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
    translate,
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
        for (const [referenceIndex, path] of paths
          .slice(0, MEDIA_LINEAGE_MAX_REFERENCES)
          .entries()) {
          let assetId;
          for (const [, meta] of assets) {
            if (meta.path === path) {
              assetId = meta.url?.match(/\/files\/id\/([\w-]+)/)?.[1];
              if (assetId) break;
            }
          }
          onMediaLineage({
            stage,
            nodeId: hostNodeId,
            sourceNodeId: sourceNodeIdByPathRef.current.get(path),
            referenceIndex,
            referenceCount: paths.length,
            path,
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
      const subjects = selections.filter((selection) =>
        isCanvasSubjectReference(selection.path),
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
              (path) => referenceCount(path, targetKind),
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
      const max =
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
          ? max
          : Math.min(
              max,
              usedSlots(pathsForKind(kind), kind) +
                Math.max(0, sharedMax - sharedUsed),
            );
      const admission = admitAttachmentSelections(
        pathsForKind(kind),
        selections.filter(
          (selection) => !isCanvasSubjectReference(selection.path),
        ),
        maxForKind,
        (path) => referenceCount(path, kind),
      );
      if (admission.admitted.length === 0) return admittedSubjects;
      const nextPaths =
        kind === "image" && isFirstLastFrame
          ? (() => {
              const next = normalizeFirstLastFramePaths(
                pathsByKindRef.current.image,
              );
              for (const { path } of admission.admitted) {
                const vacantSlot = Array.from({
                  length: FIRST_LAST_FRAME_SLOT_COUNT,
                }).findIndex((_unusedValue, index) => !next[index]);
                if (vacantSlot < 0) break;
                while (next.length <= vacantSlot) next.push("");
                next[vacantSlot] = path;
              }
              return normalizeFirstLastFramePaths(next);
            })()
          : admission.paths;
      for (const { path } of admission.admitted)
        removedPathsRef.current.delete(path);
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
      for (const selection of admission.admitted) wireEdge(selection, kind);
      if (kind === "image") logImageReferences("reference.selected", nextPaths);
      return [
        ...admittedSubjects,
        ...admission.admitted.map(({ path }) => path),
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
      for (const path of previousSet) {
        if (nextSet.has(path)) continue;
        removedPathsRef.current.add(path);
        unwireEdge(path);
      }
      for (const path of nextSet) {
        if (previousSet.has(path)) continue;
        removedPathsRef.current.delete(path);
        wireEdge(
          {
            path,
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
    (path, opts) => {
      if (pathsByKindRef.current.image.includes(path))
        logImageReferences(
          "reference.before-remove",
          pathsByKindRef.current.image,
        );
      removedPathsRef.current.add(path);
      if (pathsByKindRef.current.image.includes(path))
        userEditedImagePathsRef.current = true;
      updatePathsForKind("image", (currentPaths) =>
        isFirstLastFrame
          ? normalizeFirstLastFramePaths(
              currentPaths.map((currentPath) => (currentPath === path ? "" : currentPath)),
            )
          : currentPaths.filter((currentPath) => currentPath !== path),
      );
      updatePathsForKind("video", (currentPaths) =>
        currentPaths.filter((currentPath) => currentPath !== path),
      );
      updatePathsForKind("audio", (currentPaths) =>
        currentPaths.filter((currentPath) => currentPath !== path),
      );
      updatePathsForKind("text", (currentPaths) =>
        currentPaths.filter((currentPath) => currentPath !== path),
      );
      updatePathsForKind("file", (currentPaths) =>
        currentPaths.filter((currentPath) => currentPath !== path),
      );
      if (opts?.tearEdge) unwireEdge(path);
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
      for (const path of pathsByKindRef.current[kind]) {
        if (path) removedPathsRef.current.add(path);
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
            existingAssetIds: existingAttachments.map((attachment) => attachment.assetId),
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
          kinds: resources.map((resource) => resource.type),
        });
        picks = resources
          .filter(
            (resource) =>
              resource.type === "image" ||
              resource.type === "video" ||
              resource.type === "audio" ||
              (editableText && resource.type === "text") ||
              (effectiveMaxFile > 0 &&
                (resource.type === "file" || resource.type === "text")),
          )
          .map((resource) => ({
            assetId: resource.assetId,
            name: resource.name,
            kind: resource.type,
            nodeId: resource.nodeId,
            path: resource.path,
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
        const meta = assets.get(pick.assetId);
        const path = meta?.path ?? pick.path;
        if (!path || allExisting.has(path)) continue;
        allExisting.add(path);
        const selection = {
          path,
          ...(pick.nodeId
            ? {
                sourceNodeId: pick.nodeId,
              }
            : {}),
        };
        if (pick.kind === "image") imageAdds.push(selection);
        else if (pick.kind === "video") videoAdds.push(selection);
        else if (pick.kind === "audio") audioAdds.push(selection);
        else if (pick.kind === "text" && editableText)
          textAdds.push(selection);
        else {
          if (matchesFileExtensions(path, fileExtensions))
            fileAdds.push(selection);
          else rejectedFileExtension = true;
        }
      }
      if (rejectedFileExtension) {
        dedupedToast.error(
          translate("canvas.attachment.fileExtensionRejected", {
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
      translate,
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
                accepts: (resource) =>
                  item.kind !== "file" ||
                  matchesFileExtensions(resource.path, fileExtensions),
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
      const meta = assets.get(resource.assetId);
      const nextPath = meta?.path ?? resource.path;
      if (!nextPath || nextPath === item.path) return null;
      if (
        item.kind === "file" &&
        !matchesFileExtensions(nextPath, fileExtensions)
      ) {
        dedupedToast.error(
          translate("canvas.attachment.fileExtensionRejected", {
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
        currentPaths.map((path) => (path === item.path ? nextPath : path)),
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
      translate,
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
      const index =
        options?.slotIndex ?? pathsByKindRef.current.image.indexOf(item.path);
      const constraints = context.pickerConstraintsFingerprint;
      const valid = () =>
        replacementMountedRef.current &&
        index >= 0 &&
        options?.canApply?.() !== false &&
        pathsByKindRef.current.image[index] === item.path &&
        context.modelKey === replacementContextRef.current.modelKey &&
        context.hostNodeId === replacementContextRef.current.hostNodeId &&
        context.imageMode === replacementContextRef.current.imageMode &&
        constraints ===
          replacementContextRef.current.pickerConstraintsFingerprint;
      const canAppend =
        !isFirstLastFrame && pickerConstraints.remainingByKind.image > 0;
      await imageAnnotation.open(
        {
          path: item.path,
          name: item.name,
          url: resolveFileUrl?.(item.path) || item.thumbUrl || "",
          canAppend,
          onApply: async (file, mode, signal) => {
            if (
              !valid() ||
              signal.aborted ||
              (mode === "append" && !canAppend)
            )
              return false;
            const saved = await uploadAttachment(file);
            if (
              !valid() ||
              signal.aborted ||
              saved.kind !== "image" ||
              !saved.path ||
              saved.path === item.path
            )
              return false;
            if (getImageConstraintReason(saved, imageInputLimits)) {
              throw new Error(
                translate(
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
            if (mode === "append")
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
              paths.map((path, position) =>
                position === index ? saved.path : path,
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
        valid,
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
      translate,
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
