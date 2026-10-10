// txt-popover-inner.jsx
import { ChevronDown, jsxRuntimeExports, Lock, reactDomExports, reactExports, useMusicPromptLayout, useTranslation, X$7 as X } from "../vendor.js";
import { dedupedToast, useAssetMetadataApi, useAssetMetadataStore } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { summarizeParams } from "./summarize-params.js";
import { useCanvasBridge } from "../media-editing/package.jsx";
import { BACKEND_SEEDAUDIO } from "./normalize-skill-detail-metadata.js";
import { PromptTextarea } from "./time-intervals.jsx";
import { ParamsChip } from "./params-chip.jsx";
import { ParamsPopup } from "./params-popup.jsx";
import { rejectedReferencePaths } from "../media-editing/use-warn-missing-asset-meta.jsx";
import {
  attachmentExtraHeight,
  buildPromotionClickHandler,
  enforceConstraints,
  getDefaultParams,
  migrateParamsForModel,
  paramI18nKey,
  paramLabelFallback,
  paramPlaceholderFallback,
  paramPlaceholderI18nKey,
} from "./param-label-fallbacks.js";
import { getDisabledOptions } from "./resolve-reference-texts.js";
import {
  CloseButton,
  ExpandToggleButton,
  GeneratingButton,
  ParamTextarea,
} from "./expand-arrow-icon.jsx";
import { ParamTabs } from "./param-tabs.jsx";
import { DualSubmitButtons } from "./dual-submit-buttons.jsx";
import { SubmitButton } from "./submit-button.jsx";
import { useAssetsRefValidate } from "../assets/use-assets-ref-validate.js";
import {
  composePromptWithUpstreamText,
  countCompiledMediaPromptCharacters,
  countPromptCharacters,
  createComposedPromptCharacterCounter,
  extractCanvasEditorSubmitText,
  extractCanvasEditorText,
  loadReferenceTextContent,
  parsePromptToTiptap,
  useReferenceTextContent,
} from "../assets/parse-prompt-to-tiptap.js";
import { compileChipPromptForModel } from "../assets/compile-chip-prompt-for-model.js";
import {
  audioModeForModel,
  CanvasSwitch,
  createPopoverModelInitializationKey,
  getPlaceholder,
  isAudioModeBackend,
  MIN_MUSIC_BILLING_SECONDS,
  modelBelongsToAudioMode,
  nextAtPickerState,
  resolveAudioModeSelection,
  resolveAudioPricingId,
  resolveModelSelection,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  stringRecordsEqual,
} from "./select-content.jsx";
import { calcVideoCost } from "./calc-video-cost.js";
import {
  calcTTSCost,
  isPerMinuteCreditCost,
} from "./resolve-video-billing-tooltip.js";
import {
  calcMusicCostDisplay,
  calcTextCost,
  isMediaExtensionInputDurationValid,
  isMediaExtensionOutputDurationValid,
  mediaExtensionDisabledDurationOptions,
  mediaExtensionDurationOptions,
} from "./resolution-tabs.jsx";
import { ParamSlider } from "./param-slider.jsx";
import { usePortalAnchorPlacement } from "./use-portal-anchor-placement.jsx";
import { ModelChip } from "./model-chip.jsx";
import { pickPersistableModelParams } from "../canvas/is-reexecutable-generation-node.js";
import {
  AUDIO_REFERENCE_BAR_FIRST_ROW_EXTRA_HEIGHT,
  isCustomMusicLength,
  parseCustomMusicLengthSeconds,
  PROMPT_LENGTH_HINT_EXTRA_HEIGHT,
  SEEDAUDIO_CREDITS_PER_SECOND,
  usePopoverOpenTrack,
} from "../media-editing/get-reference-navigation-defaults.jsx";
import { MusicLengthParam } from "../media-editing/music-length-param.jsx";
import { useReferenceAttachmentNavigation } from "../media-editing/use-reference-attachment-navigation.js";
import {
  PauseIcon,
  PlayIcon,
} from "../media-editing/build-video-thumb-base.jsx";
import { MentionPickerPopover } from "./mention-picker-popover.jsx";
import { RichPromptInput } from "../chat/rich-prompt-input.jsx";
import { DEFAULT_TEXT_REFERENCE_MAX } from "../assets/reconcile-first-last-frame-default-paths.js";
import { useAttachmentState } from "../assets/use-attachment-state.js";
import {
  PopoverShell,
  TextPopoverReferenceSection,
} from "./attachment-bar.jsx";
export function TxtPopoverInner({
  mode: mode2,
  onSubmit,
  onClose,
  listModels,
  modelBackends,
  defaultPrompt,
  creditCost,
  fetchTtsVoices,
  replaceNodeId,
  defaultModelId,
  initialAudioMode,
  defaultParams,
  lastUsedModelId,
  lastUsedParams,
  nodeId,
  isGenerating = false,
  onSaveDraft,
  submitLabel,
  popoverGapOffset = 0,
  renderShell,
  referenceItems,
  onAddReference,
  onRemoveReference,
  onReplaceReference,
  showReferenceAddButton,
  disabledModelIds,
  disabledModelReason,
  resolveFileUrl,
  defaultPromptJson,
  mentionPicker,
  hidePromptUtilities = false,
  compactPromptExtraHeight = 0,
  selfAssetIds,
  defaultImagePaths,
  defaultAudioPaths,
  defaultTextPaths,
  referenceTextContent = "",
  readOnly: readOnly2 = false,
  readOnlyLyrics,
  readOnlyHint,
  navigationSnapshot,
}) {
  const { t: t2 } = useTranslation();
  const paramsAnchorRef = reactExports.useRef(null);
  const voiceAnchorRef = reactExports.useRef(null);
  const assetMetadataStore = useAssetMetadataApi();
  const mentionEnabled = mode2 === "text" && !!mentionPicker;
  const [promptText, setPromptText] = reactExports.useState(
    defaultPrompt ?? "",
  );
  const [expanded, setExpanded] = reactExports.useState(
    navigationSnapshot?.expanded ?? false,
  );
  const [paramsOpen, setParamsOpen] = reactExports.useState(false);
  const editorRef = reactExports.useRef(null);
  const [editorHasText, setEditorHasText] =
    reactExports.useState(!!defaultPrompt);
  const [editorPromptLength, setEditorPromptLength] = reactExports.useState(
    countPromptCharacters(defaultPrompt ?? ""),
  );
  const [isResolvingTextReferences, setIsResolvingTextReferences] =
    reactExports.useState(false);
  const textSubmitPendingRef = reactExports.useRef(false);
  const mountedRef = reactExports.useRef(true);
  reactExports.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const [atPickerState, setAtPickerState] = reactExports.useState({
    open: false,
    query: "",
    rect: null,
    getRect: null,
    triggerRange: null,
  });
  const initialEditorContent = reactExports.useMemo(() => {
    if (defaultPromptJson) {
      try {
        return JSON.parse(defaultPromptJson);
      } catch {}
    }
    if (defaultPrompt) {
      const assets2 = assetMetadataStore.getState().assets;
      return parsePromptToTiptap(defaultPrompt, (path2) => {
        let hit;
        assets2.forEach((meta2) => {
          if (hit) return;
          if (meta2.path === path2)
            hit = {
              path: meta2.path,
              name: meta2.name,
              type: meta2.type,
            };
        });
        if (!hit) return null;
        const kind =
          hit.type === "video" || hit.type === "audio" || hit.type === "text"
            ? hit.type
            : "image";
        return {
          path: hit.path,
          filename: hit.name,
          kind,
        };
      });
    }
    return "";
  }, [assetMetadataStore, defaultPrompt, defaultPromptJson]);
  const {
    accountSubmissionAllowed = true,
    beforeAccountSubmission = () => true,
    pricingConfig,
    saveLastUsedModelParams,
    onPromotionToast,
    loadTextContent,
  } = useCanvasBridge();
  usePopoverOpenTrack({
    popoverType: mode2 === "audio" ? "t2a" : "t2t",
    nodeId: nodeId ?? replaceNodeId ?? "",
    hasDefault: !!(defaultPrompt || defaultModelId),
  });
  const [voicePickerOpen, setVoicePickerOpen] = reactExports.useState(false);
  const [voiceQuery, setVoiceQuery] = reactExports.useState("");
  const [filterLanguage, setFilterLanguage] = reactExports.useState("");
  const [filterAccent, setFilterAccent] = reactExports.useState("");
  const [filterGender, setFilterGender] = reactExports.useState("");
  const [filterAge, setFilterAge] = reactExports.useState("");
  const [auditioningVoiceId, setAuditioningVoiceId] =
    reactExports.useState(null);
  const auditionAudioRef = reactExports.useRef(null);
  const stopAudition = reactExports.useCallback(() => {
    const a2 = auditionAudioRef.current;
    if (a2) {
      a2.pause();
      a2.currentTime = 0;
    }
    setAuditioningVoiceId(null);
  }, []);
  const toggleAudition = reactExports.useCallback(
    (voiceId, sampleUrl) => {
      if (!sampleUrl) return;
      if (auditioningVoiceId === voiceId) {
        stopAudition();
        return;
      }
      let audio = auditionAudioRef.current;
      if (!audio) {
        audio = new Audio();
        audio.addEventListener("ended", () => setAuditioningVoiceId(null));
        audio.addEventListener("error", () => setAuditioningVoiceId(null));
        auditionAudioRef.current = audio;
      }
      audio.src = sampleUrl;
      setAuditioningVoiceId(voiceId);
      audio.play().catch((err) => {
        console.warn("[TxtPopover] voice audition failed:", err);
        setAuditioningVoiceId(null);
      });
    },
    [auditioningVoiceId, stopAudition],
  );
  reactExports.useEffect(() => {
    if (!voicePickerOpen) stopAudition();
  }, [voicePickerOpen, stopAudition]);
  reactExports.useEffect(() => {
    return () => {
      const a2 = auditionAudioRef.current;
      if (a2) {
        a2.pause();
        a2.src = "";
      }
      auditionAudioRef.current = null;
    };
  }, []);
  const [models, setModels] = reactExports.useState([]);
  const [modelsLoading, setModelsLoading] = reactExports.useState(false);
  const [selectedModelId, setSelectedModelId] = reactExports.useState("");
  const [modelParams, setModelParams] = reactExports.useState({});
  const [voiceList, setVoiceList] = reactExports.useState([]);
  const selectedModel = models.find((m3) => m3.id === selectedModelId);
  const formDisabled = modelsLoading || isResolvingTextReferences;
  const controlsDisabled = formDisabled || readOnly2;
  const audioMode = selectedModel
    ? audioModeForModel(selectedModel)
    : initialAudioMode === "music"
      ? "music"
      : "tts";
  const audioModeSelectionsRef = reactExports.useRef({});
  const audioModelParamsRef = reactExports.useRef({});
  const modeFilteredModels = reactExports.useMemo(() => {
    if (mode2 !== "audio") return models;
    return models.filter((model) => modelBelongsToAudioMode(model, audioMode));
  }, [models, mode2, audioMode]);
  const supportsReferences =
    mode2 === "audio" &&
    ((selectedModel?.max_refs ?? 0) > 0 ||
      (selectedModel?.max_audio_refs ?? 0) > 0);
  const richEnabled = mentionEnabled || supportsReferences;
  const attachmentState = useAttachmentState({
    defaultPrompt:
      supportsReferences || mode2 === "audio" ? defaultPrompt : void 0,
    defaultImagePaths: supportsReferences ? defaultImagePaths : void 0,
    defaultAudioPaths: supportsReferences ? defaultAudioPaths : void 0,
    defaultTextPaths: mode2 === "audio" ? defaultTextPaths : void 0,
    maxImageRefs: supportsReferences ? (selectedModel?.max_refs ?? 0) : 0,
    maxAudioRefs: supportsReferences ? (selectedModel?.max_audio_refs ?? 0) : 0,
    maxVideoRefs: 0,
    maxTextRefs: mode2 === "audio" ? DEFAULT_TEXT_REFERENCE_MAX : 0,
    audioPerClipMinSec: selectedModel?.audioExtension?.inputMinDurationSec,
    audioPerClipMaxSec: selectedModel?.audioExtension?.inputMaxDurationSec,
    imageInputLimits: selectedModel?.inputMediaLimits,
    imageMode: "reference",
    hostNodeId: nodeId ?? replaceNodeId,
    resolveFileUrl,
  });
  const currentReferenceTextContent = useReferenceTextContent(
    attachmentState.textPaths,
    loadTextContent,
    referenceTextContent,
  );
  const countFinalPromptCharacters = reactExports.useMemo(
    () => createComposedPromptCharacterCounter(currentReferenceTextContent),
    [currentReferenceTextContent],
  );
  const resolveFinalPromptCharacterCount = reactExports.useCallback(
    (_serializedPrompt, countedText) => countFinalPromptCharacters(countedText),
    [countFinalPromptCharacters],
  );
  const isAudioExtension = mode2 === "audio" && !!selectedModel?.audioExtension;
  const audioExtensionCapability = selectedModel?.audioExtension;
  const assets = useAssetMetadataStore((state2) => state2.assets);
  const audioExtensionSourceMeta = reactExports.useMemo(() => {
    if (!isAudioExtension) return void 0;
    const sourcePath = attachmentState.audioPaths.find(Boolean);
    if (!sourcePath) return void 0;
    for (const meta2 of assets.values()) {
      if (meta2.path === sourcePath) return meta2;
    }
    return void 0;
  }, [assets, attachmentState.audioPaths, isAudioExtension]);
  const audioExtensionSourceDurationSec =
    typeof audioExtensionSourceMeta?.durationSec === "number" &&
    Number.isFinite(audioExtensionSourceMeta.durationSec) &&
    audioExtensionSourceMeta.durationSec > 0
      ? audioExtensionSourceMeta.durationSec
      : void 0;
  const effectiveAudioDurationOptions = reactExports.useMemo(
    () =>
      isAudioExtension
        ? mediaExtensionDurationOptions(audioExtensionCapability)
        : (selectedModel?.params.duration?.options ?? []),
    [
      audioExtensionCapability,
      isAudioExtension,
      selectedModel?.params.duration?.options,
    ],
  );
  const disabledAudioDurationOptions = reactExports.useMemo(
    () =>
      isAudioExtension
        ? mediaExtensionDisabledDurationOptions(
            audioExtensionSourceDurationSec,
            audioExtensionCapability,
          )
        : new Set(),
    [
      audioExtensionCapability,
      audioExtensionSourceDurationSec,
      isAudioExtension,
    ],
  );
  reactExports.useEffect(() => {
    if (!isAudioExtension || effectiveAudioDurationOptions.length === 0) return;
    const firstEnabledDuration = effectiveAudioDurationOptions.find(
      (option2) => !disabledAudioDurationOptions.has(option2),
    );
    if (!firstEnabledDuration) return;
    setModelParams((current2) =>
      current2.duration === firstEnabledDuration
        ? current2
        : {
            ...current2,
            duration: firstEnabledDuration,
          },
    );
  }, [
    disabledAudioDurationOptions,
    effectiveAudioDurationOptions,
    isAudioExtension,
  ]);
  const hasImageRefs = attachmentState.imagePaths.length > 0;
  const hasAudioRefs = attachmentState.audioPaths.length > 0;
  const blockedRefKind = hasImageRefs ? "audio" : hasAudioRefs ? "image" : null;
  const paramsSummary = reactExports.useMemo(
    () => summarizeParams(t2, selectedModel, modelParams),
    [t2, selectedModel, modelParams],
  );
  const computedCreditCost = reactExports.useMemo(() => {
    if (creditCost != null) return creditCost;
    if (mode2 === "text")
      return selectedModelId
        ? calcTextCost(pricingConfig, selectedModelId)
        : void 0;
    if (selectedModel?.backend === BACKEND_SEEDAUDIO) {
      return t2("canvas.credit.perSecondCompact", {
        cost: SEEDAUDIO_CREDITS_PER_SECOND,
        defaultValue: "3/s",
      });
    }
    if (!pricingConfig || !selectedModelId) return void 0;
    if (isAudioExtension && selectedModel) {
      const duration = modelParams.duration
        ? Number(modelParams.duration)
        : void 0;
      return calcVideoCost(
        pricingConfig,
        resolveAudioPricingId(selectedModel),
        void 0,
        duration,
        true,
        false,
        0,
      );
    }
    if (audioMode === "music") {
      const musicCost = calcMusicCostDisplay(
        pricingConfig,
        selectedModel,
        modelParams,
      );
      if (isPerMinuteCreditCost(musicCost)) {
        return t2("canvas.credit.perMinuteCompact", {
          cost: musicCost.credits,
          defaultValue: `${String(musicCost.credits)}/min`,
        });
      }
      return musicCost;
    }
    const charCount = countFinalPromptCharacters(promptText);
    if (charCount <= 0) return void 0;
    return calcTTSCost(pricingConfig, selectedModelId, charCount);
  }, [
    creditCost,
    pricingConfig,
    selectedModelId,
    selectedModel,
    mode2,
    audioMode,
    isAudioExtension,
    t2,
    promptText,
    countFinalPromptCharacters,
    modelParams,
  ]);
  const placeholder = reactExports.useMemo(() => {
    const { key: key2, defaultValue: defaultValue2 } = getPlaceholder(
      mode2,
      selectedModel,
      initialAudioMode,
    );
    return t2(key2, {
      defaultValue: defaultValue2,
    });
  }, [initialAudioMode, mode2, selectedModel, t2]);
  const disabledModelIdsRef = reactExports.useRef(disabledModelIds);
  disabledModelIdsRef.current = disabledModelIds;
  const modelInitializationInputRef = reactExports.useRef({
    modelBackends,
    initialAudioMode,
    defaultModelId,
    defaultParams,
    lastUsedModelId,
    lastUsedParams,
  });
  modelInitializationInputRef.current = {
    modelBackends,
    initialAudioMode,
    defaultModelId,
    defaultParams,
    lastUsedModelId,
    lastUsedParams,
  };
  const modelInitializationKey = createPopoverModelInitializationKey(
    modelInitializationInputRef.current,
  );
  reactExports.useEffect(() => {
    if (!listModels) return;
    let cancelled = false;
    const requestedInitializationKey = modelInitializationKey;
    const {
      modelBackends: currentModelBackends,
      initialAudioMode: currentInitialAudioMode,
      defaultModelId: currentDefaultModelId,
      defaultParams: currentDefaultParams,
      lastUsedModelId: currentLastUsedModelId,
      lastUsedParams: currentLastUsedParams,
    } = modelInitializationInputRef.current;
    setModelsLoading(true);
    void listModels()
      .then((all2) => {
        if (
          cancelled ||
          requestedInitializationKey !==
            createPopoverModelInitializationKey(
              modelInitializationInputRef.current,
            )
        ) {
          return;
        }
        const filtered = currentModelBackends
          ? all2.filter((model) => currentModelBackends.includes(model.backend))
          : all2;
        setModels((current2) => {
          if (
            current2.length === filtered.length &&
            current2.every((model, index2) => model === filtered[index2])
          ) {
            return current2;
          }
          return filtered;
        });
        const applyInitialSelection = (model, paramOverrides) => {
          const nextParams = {
            ...getDefaultParams(model),
            ...(paramOverrides ?? {}),
          };
          setSelectedModelId((current2) =>
            current2 === model.id ? current2 : model.id,
          );
          setModelParams((current2) =>
            stringRecordsEqual(current2, nextParams) ? current2 : nextParams,
          );
        };
        if (filtered.length > 0) {
          const forcedExtensionSelection =
            currentInitialAudioMode === "extension"
              ? resolveAudioModeSelection(filtered, "extension")
              : void 0;
          const forcedExtensionModel = forcedExtensionSelection
            ? filtered.find(
                (model) => model.id === forcedExtensionSelection.modelId,
              )
            : void 0;
          const defaultPreselect = currentDefaultModelId
            ? filtered.find((model) => model.id === currentDefaultModelId)
            : void 0;
          const tabModeSelection =
            !forcedExtensionModel &&
            !defaultPreselect &&
            currentInitialAudioMode
              ? resolveAudioModeSelection(filtered, currentInitialAudioMode)
              : void 0;
          const tabPreselect = tabModeSelection
            ? filtered.find((model) => model.id === tabModeSelection.modelId)
            : void 0;
          if (forcedExtensionSelection && forcedExtensionModel) {
            applyInitialSelection(
              forcedExtensionModel,
              forcedExtensionSelection.params,
            );
          } else if (defaultPreselect) {
            applyInitialSelection(defaultPreselect, currentDefaultParams);
          } else if (tabModeSelection && tabPreselect) {
            applyInitialSelection(tabPreselect, tabModeSelection.params);
          } else {
            const lastUsedMatch = currentLastUsedModelId
              ? filtered.find((model) => model.id === currentLastUsedModelId)
              : void 0;
            if (
              lastUsedMatch &&
              !disabledModelIdsRef.current?.has(lastUsedMatch.id)
            ) {
              applyInitialSelection(lastUsedMatch, currentLastUsedParams);
            } else {
              const firstValid =
                filtered.find(
                  (model) => !disabledModelIdsRef.current?.has(model.id),
                ) ?? filtered[0];
              if (firstValid) {
                applyInitialSelection(firstValid);
              }
            }
          }
        }
      })
      .catch((error) => {
        if (!cancelled) console.error("[TxtPopover] listModels failed:", error);
      })
      .finally(() => {
        if (!cancelled) setModelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listModels, modelInitializationKey]);
  reactExports.useEffect(() => {
    if (!selectedModelId || !disabledModelIds?.has(selectedModelId)) return;
    const firstValid = models.find((m3) => !disabledModelIds.has(m3.id));
    if (firstValid) {
      setSelectedModelId(firstValid.id);
      setModelParams(getDefaultParams(firstValid));
    }
  }, [disabledModelIds, selectedModelId, models]);
  reactExports.useEffect(() => {
    if (mode2 !== "audio" || !fetchTtsVoices) return;
    let cancelled = false;
    fetchTtsVoices()
      .then((voices) => {
        if (cancelled) return;
        setVoiceList(voices);
      })
      .catch((err) =>
        console.error("[TxtPopover] fetchTtsVoices failed:", err),
      );
    return () => {
      cancelled = true;
    };
  }, [mode2, fetchTtsVoices]);
  const voiceIdToName = reactExports.useMemo(() => {
    const map3 = new Map();
    for (const v2 of voiceList) map3.set(v2.voice_id, v2.name);
    return map3;
  }, [voiceList]);
  const showVoicePicker =
    voiceList.length > 0 && !!selectedModel?.params?.voice_id;
  const selectedVoiceId =
    modelParams.voice_id ?? selectedModel?.params?.voice_id?.default ?? "";
  const selectedVoiceLabel =
    voiceIdToName.get(selectedVoiceId) ?? selectedVoiceId;
  const voiceFilterOptions = reactExports.useMemo(() => {
    const collect = (key2) => {
      const set2 = new Set();
      for (const v2 of voiceList) {
        const val = v2[key2];
        if (val) set2.add(val);
      }
      return [...set2].sort();
    };
    return {
      language: collect("language"),
      accent: collect("accent"),
      gender: collect("gender"),
      age: collect("age"),
    };
  }, [voiceList]);
  const filteredVoices = reactExports.useMemo(() => {
    let list2 = voiceList;
    if (filterLanguage)
      list2 = list2.filter((v2) => v2.language === filterLanguage);
    if (filterAccent) list2 = list2.filter((v2) => v2.accent === filterAccent);
    if (filterGender) list2 = list2.filter((v2) => v2.gender === filterGender);
    if (filterAge) list2 = list2.filter((v2) => v2.age === filterAge);
    const q2 = voiceQuery.trim().toLowerCase();
    if (q2) {
      list2 = list2.filter(
        (v2) =>
          v2.name.toLowerCase().includes(q2) ||
          v2.voice_id.toLowerCase().includes(q2),
      );
    }
    if (selectedVoiceId) {
      const idx = list2.findIndex((v2) => v2.voice_id === selectedVoiceId);
      if (idx > 0) {
        list2 = [list2[idx], ...list2.slice(0, idx), ...list2.slice(idx + 1)];
      }
    }
    return list2;
  }, [
    voiceList,
    voiceQuery,
    filterLanguage,
    filterAccent,
    filterGender,
    filterAge,
    selectedVoiceId,
  ]);
  const trimmedVoiceQuery = voiceQuery.trim();
  const voiceQueryMatchesCatalog = reactExports.useMemo(() => {
    if (!trimmedVoiceQuery) return true;
    const q2 = trimmedVoiceQuery.toLowerCase();
    return voiceList.some(
      (v2) => v2.voice_id.toLowerCase() === q2 || v2.name.toLowerCase() === q2,
    );
  }, [voiceList, trimmedVoiceQuery]);
  const showCustomVoiceRow = !!trimmedVoiceQuery && !voiceQueryMatchesCatalog;
  const voicePickerPlacement = usePortalAnchorPlacement(voiceAnchorRef, {
    open: voicePickerOpen && showVoicePicker,
    minHeight: 200,
    maxHeight: 360,
    gap: 2,
  });
  const handleModelChange = reactExports.useCallback(
    (modelId) => {
      if (mode2 !== "audio") {
        setSelectedModelId(modelId);
        const model = models.find((candidate) => candidate.id === modelId);
        if (model)
          setModelParams(
            migrateParamsForModel(selectedModel, model, modelParams),
          );
        return;
      }
      if (selectedModelId) {
        audioModelParamsRef.current[selectedModelId] = {
          ...modelParams,
        };
      }
      const selection2 = resolveModelSelection(
        models,
        modelId,
        audioModelParamsRef.current[modelId],
      );
      if (!selection2) return;
      setSelectedModelId(selection2.modelId);
      setModelParams(selection2.params);
    },
    [mode2, modelParams, models, selectedModel, selectedModelId],
  );
  const handleAudioModeChange = reactExports.useCallback(
    (next2) => {
      if (next2 === audioMode) return;
      if (selectedModelId) {
        audioModelParamsRef.current[selectedModelId] = {
          ...modelParams,
        };
        audioModeSelectionsRef.current[audioMode] = {
          modelId: selectedModelId,
          params: {
            ...modelParams,
          },
        };
      }
      const selection2 = resolveAudioModeSelection(
        models,
        next2,
        audioModeSelectionsRef.current[next2],
      );
      if (!selection2) return;
      setSelectedModelId(selection2.modelId);
      setModelParams(selection2.params);
    },
    [audioMode, models, modelParams, selectedModelId],
  );
  const handleParamChange = reactExports.useCallback(
    (key2, value) => {
      setModelParams((prev) => {
        const next2 = {
          ...prev,
          [key2]: value,
        };
        return selectedModel ? enforceConstraints(next2, selectedModel) : next2;
      });
    },
    [selectedModel],
  );
  const applyCustomVoiceId = reactExports.useCallback(() => {
    if (!trimmedVoiceQuery) return;
    handleParamChange("voice_id", trimmedVoiceQuery);
    setVoicePickerOpen(false);
    setVoiceQuery("");
  }, [trimmedVoiceQuery, handleParamChange]);
  const hasPromptContent =
    (richEnabled ? editorHasText : !!promptText.trim()) ||
    !!currentReferenceTextContent.trim() ||
    attachmentState.textPaths.length > 0;
  const effectivePromptLength = richEnabled
    ? editorPromptLength
    : countFinalPromptCharacters(promptText);
  const isPromptOverLimit =
    !!selectedModel?.promptMaxLength &&
    effectivePromptLength > selectedModel.promptMaxLength;
  const isModelDisabled = disabledModelIds?.has(selectedModelId) ?? false;
  const musicLengthValue = isAudioModeBackend(
    selectedModel?.backend,
    "music",
    selectedModel,
  )
    ? modelParams.music_length_ms
    : void 0;
  const musicDurationInvalid =
    musicLengthValue === "custom" ||
    (isCustomMusicLength(musicLengthValue) &&
      (() => {
        const secs = parseCustomMusicLengthSeconds(musicLengthValue ?? "");
        return secs == null || secs < MIN_MUSIC_BILLING_SECONDS;
      })());
  let audioExtensionValidationMessage;
  if (isAudioExtension) {
    if (attachmentState.audioPaths.length !== 1) {
      audioExtensionValidationMessage = t2(
        "canvas.audioExtension.referenceRequired",
        {
          defaultValue: "请选择一条参考音频",
        },
      );
    } else if (audioExtensionSourceDurationSec === void 0) {
      audioExtensionValidationMessage = t2(
        "canvas.audioExtension.durationUnavailable",
        {
          defaultValue: "无法读取原音频时长，请更换音频",
        },
      );
    } else if (
      !isMediaExtensionInputDurationValid(
        audioExtensionSourceDurationSec,
        audioExtensionCapability,
      )
    ) {
      audioExtensionValidationMessage = t2(
        "canvas.audioExtension.inputDurationRange",
        {
          defaultValue: "上传音频时长需在 1-20 秒之间",
        },
      );
    } else if (
      !isMediaExtensionOutputDurationValid(
        audioExtensionSourceDurationSec,
        modelParams.duration,
        audioExtensionCapability,
      )
    ) {
      audioExtensionValidationMessage = t2(
        "canvas.audioExtension.outputDurationRange",
        {
          defaultValue: "续写后的总时长必须大于原音频，且最长 20 秒",
        },
      );
    }
  }
  const canSubmit =
    accountSubmissionAllowed &&
    !!selectedModelId &&
    hasPromptContent &&
    !isPromptOverLimit &&
    !isModelDisabled &&
    !musicDurationInvalid &&
    !audioExtensionValidationMessage;
  const showDualButtons = !replaceNodeId && !!nodeId;
  const draftRef = reactExports.useRef({});
  draftRef.current = {
    // Empty prompt → undefined so the caller can recompute the appropriate
    // seed (for example, an upstream preset) on the next open.
    prompt: promptText || void 0,
    modelId: selectedModelId,
    params: {
      ...modelParams,
    },
    ...(supportsReferences
      ? {
          imagePaths: attachmentState.imagePaths,
          audioPaths: attachmentState.audioPaths,
        }
      : {}),
    ...(mode2 === "audio"
      ? {
          textPaths: attachmentState.textPaths,
        }
      : {}),
  };
  const referenceNavigation = useReferenceAttachmentNavigation({
    nodeId: nodeId ?? replaceNodeId,
    mode: mode2,
    editorRef,
    expanded,
    count: 1,
    snapshot: navigationSnapshot,
    defaults: {
      imagePaths: [...(defaultImagePaths ?? [])],
      videoPaths: [],
      audioPaths: [...(defaultAudioPaths ?? [])],
      textPaths: [...(defaultTextPaths ?? [])],
    },
    onSaveDraft,
    getDraft: () => ({
      ...draftRef.current,
    }),
  });
  const navigationSavedRef = referenceNavigation.navigationSavedRef;
  const onSaveDraftRef = reactExports.useRef(onSaveDraft);
  onSaveDraftRef.current = onSaveDraft;
  const richEnabledRef = reactExports.useRef(richEnabled);
  richEnabledRef.current = richEnabled;
  const modelLoadedRef = reactExports.useRef(false);
  modelLoadedRef.current = !modelsLoading && !!selectedModelId;
  reactExports.useEffect(
    () => () => {
      if (!modelLoadedRef.current || navigationSavedRef.current) return;
      if (richEnabledRef.current) {
        const editor = editorRef.current;
        if (editor && !editor.isDestroyed) {
          const text2 = extractCanvasEditorText(editor);
          onSaveDraftRef.current?.({
            // Empty editor → BOTH fields undefined, mirroring draftRef's
            // `promptText || undefined` intent. An empty Tiptap doc still
            // serializes to truthy JSON — persisting it would mask the ??
            // fallback chain (quick-prompt template / upstream preset /
            // markdown) on the next open with a blank editor.
            prompt: text2 || void 0,
            promptJson: text2 ? JSON.stringify(editor.getJSON()) : void 0,
            modelId: draftRef.current.modelId,
            params: draftRef.current.params,
            // Reference-capable audio models: carry the attachment slots so a
            // re-open restores the reference bar (see PopoverDraft.imagePaths).
            imagePaths: draftRef.current.imagePaths,
            audioPaths: draftRef.current.audioPaths,
            textPaths: draftRef.current.textPaths,
          });
        }
        return;
      }
      onSaveDraftRef.current?.(draftRef.current);
    },
    [navigationSavedRef],
  );
  const { validate: checkReferencesBeforeSubmit } = useAssetsRefValidate({
    submit: {
      editorRef,
      promptText,
      setPromptText,
      attachmentState,
    },
  });
  const doSubmit = reactExports.useCallback(
    async (e2, replaceId) => {
      e2.stopPropagation();
      if (!canSubmit) return;
      if (!beforeAccountSubmission()) return;
      if (!(await checkReferencesBeforeSubmit())) return;
      if (textSubmitPendingRef.current) return;
      textSubmitPendingRef.current = true;
      setIsResolvingTextReferences(true);
      const editor = richEnabled ? editorRef.current : null;
      const authoredPrompt = editor
        ? extractCanvasEditorSubmitText(editor)
        : promptText;
      let selectedReferenceText;
      try {
        selectedReferenceText = await loadReferenceTextContent(
          attachmentState.textPaths,
          loadTextContent,
          currentReferenceTextContent,
        );
      } catch {
        if (mountedRef.current)
          dedupedToast.error(
            t2(
              "canvas.reference.unavailable",
              "Reference unavailable. Please select again.",
            ),
          );
        return;
      } finally {
        textSubmitPendingRef.current = false;
        if (mountedRef.current) setIsResolvingTextReferences(false);
      }
      if (!mountedRef.current) return;
      const submitPrompt = composePromptWithUpstreamText(
        selectedReferenceText,
        authoredPrompt,
      );
      if (!submitPrompt.trim()) {
        dedupedToast.error(
          t2("canvas.promptRequired", {
            defaultValue: "输入 prompt",
          }),
        );
        return;
      }
      const charCount = countCompiledMediaPromptCharacters(
        submitPrompt,
        "",
        attachmentState,
      );
      if (
        selectedModel?.promptMaxLength &&
        charCount > selectedModel.promptMaxLength
      ) {
        setEditorPromptLength(charCount);
        dedupedToast.error(
          t2("canvas.prompt.tooLong", {
            current: charCount,
            max: selectedModel.promptMaxLength,
          }),
        );
        return;
      }
      const persistSubmittedDraft = () => {
        const submittedDraft = {
          source: "submitted",
          prompt: submitPrompt || void 0,
          ...(editor
            ? {
                promptJson: JSON.stringify(editor.getJSON()),
              }
            : {}),
          modelId: selectedModelId,
          params: {
            ...modelParams,
          },
          ...(supportsReferences
            ? {
                imagePaths: attachmentState.imagePaths,
                audioPaths: attachmentState.audioPaths,
              }
            : {}),
          ...(mode2 === "audio"
            ? {
                textPaths: attachmentState.textPaths,
              }
            : {}),
        };
        draftRef.current = submittedDraft;
        onSaveDraftRef.current?.(submittedDraft);
      };
      if (supportsReferences) {
        const imagePaths = attachmentState.imagePaths;
        const audioPaths = attachmentState.audioPaths;
        if (imagePaths.length > 0 && audioPaths.length > 0) {
          dedupedToast.error(
            t2("canvas.seedAudio.refMutuallyExclusive", {
              defaultValue: "参考音频与参考图片不能同时使用，请只保留其中一种",
            }),
          );
          return;
        }
        setPromptText(submitPrompt);
        const compiled = compileChipPromptForModel(submitPrompt, {
          imagePaths,
          videoPaths: [],
          audioPaths,
        });
        if (compiled.unresolved.length > 0) {
          dedupedToast.warning(
            t2("canvas.prompt.unresolvedRefs", {
              defaultValue: "以下引用未在附件中找到，已保留原文：{{refs}}",
              refs: compiled.unresolved.map((u4) => `@${u4.path}`).join(", "),
            }),
          );
        }
        persistSubmittedDraft();
        onSubmit(
          compiled.text,
          selectedModelId,
          modelParams,
          replaceId,
          imagePaths,
          audioPaths,
          attachmentState.textPaths,
        );
      } else {
        persistSubmittedDraft();
        onSubmit(
          submitPrompt,
          selectedModelId,
          modelParams,
          replaceId,
          void 0,
          void 0,
          attachmentState.textPaths,
        );
      }
      if (selectedModel && saveLastUsedModelParams) {
        const popoverKey = mode2 === "audio" ? "t2a" : "t2t";
        saveLastUsedModelParams(
          popoverKey,
          selectedModelId,
          pickPersistableModelParams(modelParams, selectedModel),
        );
      }
      onClose();
    },
    [
      onSubmit,
      onClose,
      promptText,
      currentReferenceTextContent,
      loadTextContent,
      selectedModelId,
      selectedModel,
      modelParams,
      canSubmit,
      beforeAccountSubmission,
      checkReferencesBeforeSubmit,
      mode2,
      richEnabled,
      supportsReferences,
      attachmentState,
      t2,
      saveLastUsedModelParams,
    ],
  );
  const inGeneratingState = isGenerating;
  const pendingSubmitRef = reactExports.useRef(null);
  const handleConfirm = reactExports.useCallback(
    (e2) => {
      if (modelsLoading || !selectedModelId) {
        pendingSubmitRef.current = {
          kind: "confirm",
        };
        return;
      }
      doSubmit(e2, replaceNodeId);
    },
    [doSubmit, modelsLoading, replaceNodeId, selectedModelId],
  );
  const handleNewNode = reactExports.useCallback(
    (e2) => {
      if (modelsLoading || !selectedModelId) {
        pendingSubmitRef.current = {
          kind: "new",
        };
        return;
      }
      doSubmit(e2, void 0);
    },
    [doSubmit, modelsLoading, selectedModelId],
  );
  const handleReplace = reactExports.useCallback(
    (e2) => {
      if (modelsLoading || !selectedModelId) {
        pendingSubmitRef.current = nodeId
          ? {
              kind: "replace",
              targetNodeId: nodeId,
            }
          : {
              kind: "confirm",
            };
        return;
      }
      doSubmit(e2, nodeId);
    },
    [doSubmit, modelsLoading, nodeId, selectedModelId],
  );
  reactExports.useEffect(() => {
    if (modelsLoading || !selectedModelId) return;
    const pending2 = pendingSubmitRef.current;
    if (!pending2) return;
    pendingSubmitRef.current = null;
    const syntheticEvent = {
      stopPropagation: () => void 0,
    };
    if (pending2.kind === "confirm") doSubmit(syntheticEvent, replaceNodeId);
    else if (pending2.kind === "new") doSubmit(syntheticEvent, void 0);
    else doSubmit(syntheticEvent, pending2.targetNodeId);
  }, [doSubmit, modelsLoading, replaceNodeId, selectedModelId]);
  const handleEditorUpdate = reactExports.useCallback(
    (hasContent2, textLen) => {
      setEditorHasText(hasContent2);
      setEditorPromptLength(textLen);
    },
    [],
  );
  const handleAtTrigger = reactExports.useCallback(
    (query, rect, getRect2, triggerRange) => {
      setAtPickerState((state2) =>
        nextAtPickerState(state2, {
          query,
          rect,
          getRect: getRect2,
          triggerRange,
        }),
      );
    },
    [],
  );
  const handleAtSelect = reactExports.useCallback(
    (meta2, assetId, sourceNodeId) => {
      if (supportsReferences) {
        const rawKind = meta2.type;
        if (rawKind === "text") {
          const admitted = attachmentState.addPaths(
            [
              {
                path: meta2.path,
                sourceNodeId: sourceNodeId ?? assetId,
              },
            ],
            "text",
          );
          if (!admitted.includes(meta2.path)) {
            setAtPickerState((state2) => ({
              ...state2,
              open: false,
            }));
            return;
          }
          editorRef.current?.commands.replaceAtTriggerWithFileRef(
            {
              path: meta2.path,
              filename: meta2.name,
              kind: "text",
            },
            atPickerState.triggerRange ?? void 0,
          );
          setAtPickerState((s2) => ({
            ...s2,
            open: false,
          }));
          return;
        }
        const kind2 = rawKind;
        if (kind2 !== "image" && kind2 !== "audio") return;
        if (blockedRefKind && kind2 === blockedRefKind) {
          dedupedToast.error(
            t2("canvas.seedAudio.refMutuallyExclusive", {
              defaultValue: "参考音频与参考图片不能同时使用，请只保留其中一种",
            }),
          );
          setAtPickerState((s2) => ({
            ...s2,
            open: false,
          }));
          return;
        }
        attachmentState.addPaths(
          [
            {
              path: meta2.path,
              sourceNodeId: sourceNodeId ?? assetId,
            },
          ],
          kind2,
        );
        editorRef.current?.commands.replaceAtTriggerWithFileRef(
          {
            path: meta2.path,
            filename: meta2.name,
            kind: kind2,
          },
          atPickerState.triggerRange ?? void 0,
        );
        setAtPickerState((s2) => ({
          ...s2,
          open: false,
        }));
        return;
      }
      const kind =
        meta2.type === "video" ||
        meta2.type === "audio" ||
        meta2.type === "text"
          ? meta2.type
          : "image";
      mentionPicker?.addPaths([meta2.path], kind);
      editorRef.current?.commands.replaceAtTriggerWithFileRef(
        {
          path: meta2.path,
          filename: meta2.name,
          kind,
        },
        atPickerState.triggerRange ?? void 0,
      );
      setAtPickerState((s2) => ({
        ...s2,
        open: false,
      }));
    },
    [
      mentionPicker,
      atPickerState.triggerRange,
      supportsReferences,
      attachmentState,
      blockedRefKind,
      t2,
    ],
  );
  const handleReferenceRemove = reactExports.useCallback(
    (path2) => {
      onRemoveReference?.(path2);
      editorRef.current?.commands.removeCanvasFileRefsByPath(path2);
    },
    [onRemoveReference],
  );
  const handleReferenceReplace = reactExports.useCallback(
    async (item) => {
      const replacement = await onReplaceReference?.(item);
      if (!replacement) return;
      if (replacement.kind === "file") return;
      editorRef.current?.commands.replaceCanvasFileRefsByPath(item.path, {
        path: replacement.path,
        filename: replacement.name,
        kind: replacement.kind,
      });
    },
    [onReplaceReference],
  );
  const handleAudioAttachmentRemove = reactExports.useCallback(
    (path2) => {
      attachmentState.removePath(path2, {
        tearEdge: true,
      });
      editorRef.current?.commands.removeCanvasFileRefsByPath(path2);
    },
    [attachmentState],
  );
  const handleAudioAttachmentReplace = reactExports.useCallback(
    async (item) => {
      const replacement = await attachmentState.replacePath(item);
      if (!replacement) return;
      if (replacement.kind === "file") return;
      editorRef.current?.commands.replaceCanvasFileRefsByPath(item.path, {
        path: replacement.path,
        filename: replacement.name,
        kind: replacement.kind,
      });
    },
    [attachmentState],
  );
  const handleFileRefSwitchSelect = reactExports.useCallback(
    (meta2, assetId, sourceNodeId) => {
      if (!supportsReferences) {
        const kind2 =
          meta2.type === "video" ||
          meta2.type === "audio" ||
          meta2.type === "text"
            ? meta2.type
            : "image";
        mentionPicker?.addPaths([meta2.path], kind2);
        return;
      }
      if (meta2.type === "text") return;
      const kind = meta2.type;
      if (kind !== "image" && kind !== "audio") return;
      if (blockedRefKind === kind) {
        dedupedToast.error(
          t2("canvas.seedAudio.refMutuallyExclusive", {
            defaultValue: "参考音频与参考图片不能同时使用，请只保留其中一种",
          }),
        );
        return;
      }
      attachmentState.addPaths(
        [
          {
            path: meta2.path,
            sourceNodeId: sourceNodeId ?? assetId,
          },
        ],
        kind,
      );
    },
    [attachmentState, blockedRefKind, mentionPicker, supportsReferences, t2],
  );
  const handleAttachmentClick = reactExports.useCallback(
    (item) => {
      if (formDisabled || item.kind === "file") return;
      editorRef.current?.commands.insertCanvasFileRef({
        path: item.path,
        filename: item.name,
        kind: item.kind,
      });
    },
    [formDisabled],
  );
  const handleFileRefsAdded = reactExports.useCallback(
    (refs) => {
      if (supportsReferences) {
        const imageAdds = [];
        const audioAdds = [];
        const textAdds = [];
        for (const ref of refs) {
          if (ref.kind === "image" && blockedRefKind !== "image")
            imageAdds.push(ref.path);
          else if (ref.kind === "audio" && blockedRefKind !== "audio")
            audioAdds.push(ref.path);
          else if (ref.kind === "text") textAdds.push(ref.path);
        }
        if (imageAdds.length > 0) attachmentState.addPaths(imageAdds, "image");
        if (audioAdds.length > 0) attachmentState.addPaths(audioAdds, "audio");
        if (textAdds.length > 0) {
          const admitted = attachmentState.addPaths(textAdds, "text");
          for (const path2 of rejectedReferencePaths(
            textAdds,
            attachmentState.textPaths,
            admitted,
          )) {
            editorRef.current?.commands.removeCanvasFileRefsByPath(path2);
          }
        }
        return;
      }
      const byKind = {
        image: [],
        video: [],
        audio: [],
        text: [],
      };
      for (const ref of refs) byKind[ref.kind].push(ref.path);
      for (const kind of ["image", "video", "audio", "text"]) {
        if (byKind[kind].length > 0)
          mentionPicker?.addPaths(byKind[kind], kind);
      }
    },
    [mentionPicker, supportsReferences, attachmentState, blockedRefKind],
  );
  const existingPathSet = reactExports.useMemo(() => {
    if (supportsReferences) {
      return new Set([
        ...attachmentState.imagePaths,
        ...attachmentState.audioPaths,
        ...attachmentState.textPaths,
      ]);
    }
    return new Set((referenceItems ?? []).map((i2) => i2.path));
  }, [
    supportsReferences,
    attachmentState.imagePaths,
    attachmentState.audioPaths,
    attachmentState.textPaths,
    referenceItems,
  ]);
  const atPickerKindFilter = reactExports.useMemo(
    () =>
      attachmentState.modelSupportedKindsForAtPicker.filter(
        (k2) => k2 !== blockedRefKind,
      ),
    [attachmentState.modelSupportedKindsForAtPicker, blockedRefKind],
  );
  const activeAtPicker = supportsReferences
    ? {
        kindFilter: atPickerKindFilter,
        constraints: attachmentState.pickerConstraints,
        excludeAssetIds: selfAssetIds,
      }
    : mentionPicker
      ? {
          kindFilter: mentionPicker.supportedKinds,
          constraints: mentionPicker.constraints,
          excludeAssetIds: void 0,
        }
      : null;
  const renderedParamElements = reactExports.useMemo(() => {
    if (!selectedModel) return null;
    const elements = [];
    for (const [key2, def] of Object.entries(selectedModel.params)) {
      if (key2 === "voice_id" && showVoicePicker) continue;
      if (key2 === "lyrics" && audioMode === "music") continue;
      if (key2 === "is_instrumental" && audioMode === "music") continue;
      if (key2 === "music_length_ms" && audioMode === "music") {
        elements.push(
          <MusicLengthParam
            key={key2}
            value={modelParams[key2] ?? def.default ?? "auto"}
            onChange={(v2) => handleParamChange(key2, v2)}
            disabled={controlsDisabled}
          />,
        );
        continue;
      }
      if (def.type === "textarea") {
        const labelKey2 = paramI18nKey(key2, def.label);
        const placeholderKey = paramPlaceholderI18nKey(key2);
        elements.push(
          <ParamTextarea
            key={key2}
            label={
              labelKey2
                ? t2(labelKey2, {
                    defaultValue: paramLabelFallback(key2, def.label),
                  })
                : paramLabelFallback(key2, def.label)
            }
            value={modelParams[key2] ?? def.default ?? ""}
            onChange={(v2) => handleParamChange(key2, v2)}
            disabled={controlsDisabled}
            placeholder={
              placeholderKey
                ? t2(placeholderKey, {
                    defaultValue: paramPlaceholderFallback(
                      key2,
                      def.placeholder,
                    ),
                  })
                : paramPlaceholderFallback(key2, def.placeholder)
            }
          />,
        );
        continue;
      }
      if (def.type === "slider") {
        if (def.min === void 0 || def.max === void 0 || def.step === void 0)
          continue;
        const labelKey2 = paramI18nKey(key2, def.label);
        elements.push(
          <ParamSlider
            key={key2}
            variant={
              mode2 === "audio" && key2 === "speed" ? "filled" : "standard"
            }
            label={
              labelKey2
                ? t2(labelKey2, {
                    defaultValue: paramLabelFallback(key2, def.label),
                  })
                : paramLabelFallback(key2, def.label)
            }
            value={modelParams[key2] ?? def.default}
            min={def.min}
            max={def.max}
            step={def.step}
            marks={def.marks}
            onChange={(v2) => handleParamChange(key2, v2)}
            disabled={controlsDisabled}
          />,
        );
        continue;
      }
      const isVoiceId = key2 === "voice_id" && voiceList.length > 0;
      const options = isVoiceId
        ? voiceList.map((v2) => v2.voice_id)
        : isAudioExtension && key2 === "duration"
          ? effectiveAudioDurationOptions
          : def.options;
      if (!options || options.length <= 1) continue;
      const disabled2 = getDisabledOptions(
        key2,
        modelParams,
        selectedModel.paramConstraints,
      );
      const disabledOptions =
        isAudioExtension && key2 === "duration"
          ? new Set([...disabled2, ...disabledAudioDurationOptions])
          : disabled2;
      const labelKey =
        isAudioExtension && key2 === "duration"
          ? "canvas.audioExtension.extendTo"
          : paramI18nKey(key2, def.label);
      elements.push(
        <ParamTabs
          key={key2}
          label={
            labelKey
              ? t2(labelKey, {
                  defaultValue:
                    isAudioExtension && key2 === "duration"
                      ? "延长至"
                      : paramLabelFallback(key2, def.label),
                })
              : paramLabelFallback(key2, def.label)
          }
          options={options}
          value={modelParams[key2] ?? def.default}
          onChange={(v2) => handleParamChange(key2, v2)}
          disabled={controlsDisabled}
          disabledOptions={disabledOptions}
          optionUnit={key2 === "duration" ? "seconds" : void 0}
          getDisabledOptionTooltip={
            isAudioExtension && key2 === "duration"
              ? () =>
                  t2("canvas.audioExtension.durationOptionDisabled", {
                    defaultValue:
                      "最终时长需从原音频时长向上取整后的下一秒开始选择",
                  })
              : void 0
          }
          getOptionLabel={
            isVoiceId
              ? (opt) => voiceIdToName.get(opt) ?? opt
              : isAudioExtension && key2 === "duration"
                ? (opt) => `${opt}s`
                : void 0
          }
          grouped={isAudioExtension && key2 === "duration"}
          allowDeselect={def.optional}
        />,
      );
    }
    return elements;
  }, [
    mode2,
    selectedModel,
    modelParams,
    controlsDisabled,
    handleParamChange,
    t2,
    voiceList,
    voiceIdToName,
    showVoicePicker,
    audioMode,
    isAudioExtension,
    effectiveAudioDurationOptions,
    disabledAudioDurationOptions,
  ]);
  const hasConfigurableParams = (renderedParamElements?.length ?? 0) > 0;
  const showAudioParamsIcon =
    mode2 === "audio" &&
    (selectedModel?.id.toLowerCase().includes("speech-2.8") ||
      selectedModel?.backend === "seedaudio");
  const hasReadOnlyLyrics = !!readOnlyLyrics?.trim();
  const showsMusicLyricsEditor =
    mode2 === "audio" &&
    audioMode === "music" &&
    !!(selectedModel?.params.lyrics || hasReadOnlyLyrics) &&
    modelParams.is_instrumental !== "instrumental";
  const musicLayout = useMusicPromptLayout(
    showsMusicLyricsEditor,
    hasReadOnlyLyrics,
    expanded,
  );
  const referenceBarVisible =
    (mode2 === "text" && !!onAddReference) ||
    !!(referenceItems && referenceItems.length > 0);
  const body2 = (
    <>
      {mode2 !== "audio" && (
        <div className="absolute top-3 right-3 z-10">
          <ExpandToggleButton
            expanded={expanded}
            onToggle={() => setExpanded((v2) => !v2)}
          />
        </div>
      )}
      <TextPopoverReferenceSection
        mode={mode2}
        audioMode={audioMode}
        controlsDisabled={controlsDisabled}
        onAudioModeChange={handleAudioModeChange}
        expanded={expanded}
        onToggle={() => setExpanded((v2) => !v2)}
        references={
          referenceBarVisible
            ? {
                items: referenceItems ?? [],
                readOnly: mode2 !== "text" || !onAddReference,
                showAddButton:
                  mode2 === "text" &&
                  !!onAddReference &&
                  !!showReferenceAddButton,
                onReplace:
                  mode2 === "text" && onReplaceReference
                    ? (item) => {
                        void handleReferenceReplace(item);
                      }
                    : void 0,
                onRemove:
                  mode2 === "text" && onRemoveReference
                    ? handleReferenceRemove
                    : () => {},
                onAdd:
                  mode2 === "text" && onAddReference
                    ? onAddReference
                    : () => {},
                onItemClick: handleAttachmentClick,
                getLocateAction: referenceNavigation.getLocateAction,
              }
            : null
        }
        audioAttachments={
          mode2 === "audio" &&
          (attachmentState.items.length > 0 || attachmentState.showAddButton)
            ? {
                items: attachmentState.items,
                disabled: controlsDisabled,
                showAddButton: attachmentState.showAddButton,
                onReplace: (item) => {
                  void handleAudioAttachmentReplace(item);
                },
                onRemove: handleAudioAttachmentRemove,
                onAdd: () => {
                  void attachmentState.openPicker();
                },
                onItemClick: handleAttachmentClick,
                getLocateAction: referenceNavigation.getLocateAction,
              }
            : null
        }
      />
      <div className="flex-1 min-h-0 flex flex-col">
        <div
          className="flex-1 min-h-0"
          style={
            mode2 === "audio" && audioMode === "music"
              ? musicLayout.prompt
              : void 0
          }
        >
          {richEnabled ? (
            <>
              <RichPromptInput
                initialContent={initialEditorContent}
                editorRef={editorRef}
                onEditorReady={referenceNavigation.onEditorReady}
                disabled={formDisabled}
                placeholder={placeholder}
                onClose={onClose}
                blockKeyHandlers={inGeneratingState || atPickerState.open}
                onAtTrigger={handleAtTrigger}
                onAtDismiss={() =>
                  setAtPickerState((s2) => ({
                    ...s2,
                    open: false,
                  }))
                }
                onUpdate={handleEditorUpdate}
                resolveCharacterCount={resolveFinalPromptCharacterCount}
                resolveFileUrl={resolveFileUrl}
                fileRefSwitchConfig={
                  !formDisabled && activeAtPicker
                    ? {
                        kindFilter: activeAtPicker.kindFilter,
                        existingPaths: existingPathSet,
                        excludeAssetIds: activeAtPicker.excludeAssetIds,
                        constraints: activeAtPicker.constraints,
                        onSelectAsset: handleFileRefSwitchSelect,
                      }
                    : void 0
                }
                onFileRefsAdded={handleFileRefsAdded}
                onDirectReferencesRemoved={(paths) => {
                  for (const path2 of paths) {
                    if (supportsReferences) attachmentState.removePath(path2);
                    else onRemoveReference?.(path2);
                  }
                }}
                maxLength={selectedModel?.promptMaxLength}
                showUtilityControls={!hidePromptUtilities}
              />
              {atPickerState.open && atPickerState.rect && activeAtPicker && (
                <MentionPickerPopover
                  query={atPickerState.query}
                  anchorRect={atPickerState.rect}
                  getAnchorRect={atPickerState.getRect ?? void 0}
                  kindFilter={activeAtPicker.kindFilter}
                  existingPaths={existingPathSet}
                  excludeAssetIds={activeAtPicker.excludeAssetIds}
                  constraints={activeAtPicker.constraints}
                  resolveFileUrl={resolveFileUrl}
                  onSelect={handleAtSelect}
                  onClose={() =>
                    setAtPickerState((s2) => ({
                      ...s2,
                      open: false,
                    }))
                  }
                />
              )}
            </>
          ) : (
            <PromptTextarea
              value={promptText}
              onChange={setPromptText}
              disabled={formDisabled}
              readOnly={readOnly2}
              placeholder={placeholder}
              onClose={onClose}
              blockKeyHandlers={inGeneratingState}
              maxLength={selectedModel?.promptMaxLength}
              currentLength={effectivePromptLength}
              showUtilityControls={!hidePromptUtilities}
            />
          )}
        </div>
        {showsMusicLyricsEditor && (
          <div
            className={
              hasReadOnlyLyrics
                ? "min-h-0 mt-1 pt-1 border-t border-[var(--canvas-controls-border)]"
                : "min-h-0 mt-2 pt-2 border-t border-[var(--canvas-controls-border)]"
            }
            style={musicLayout.lyrics}
          >
            <textarea
              value={readOnlyLyrics ?? modelParams.lyrics ?? ""}
              onChange={(e2) => {
                e2.stopPropagation();
                handleParamChange("lyrics", e2.target.value);
              }}
              onClick={(e2) => e2.stopPropagation()}
              onKeyDown={(e2) => e2.stopPropagation()}
              disabled={formDisabled}
              readOnly={readOnly2 || readOnlyLyrics !== void 0}
              placeholder={t2("canvas.txt.music.lyricsPlaceholder", {
                defaultValue:
                  "请在此添加您的歌词。如果未填歌词，我们将根据曲风为您自动生成。",
              })}
              className={`canvas-prompt-font-size-textarea nowheel nopan w-full h-full bg-transparent border-none outline-none resize-none text-[var(--canvas-controls-text)] placeholder:text-muted-foreground/50 ${readOnly2 || readOnlyLyrics !== void 0 ? "hover:cursor-not-allowed" : ""}`}
              style={{
                "--canvas-prompt-font-size": musicLayout.fontSize,
              }}
            />
          </div>
        )}
      </div>
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <ModelChip
            models={modeFilteredModels}
            selectedModelId={selectedModelId}
            onChange={handleModelChange}
            loading={modelsLoading}
            disabled={controlsDisabled}
            showEmptyHint={true}
            disabledModelIds={disabledModelIds}
            disabledReason={disabledModelReason}
            onPromotionClick={buildPromotionClickHandler(onPromotionToast)}
          />
          {mode2 === "audio" &&
            audioMode === "music" &&
            selectedModel?.params.is_instrumental && (
              <>
                <span
                  aria-hidden={true}
                  className="w-px h-3 bg-foreground/15 shrink-0"
                />
                {readOnlyHint ? (
                  <span className="flex items-center gap-1 text-[12px] text-[var(--canvas-controls-text-muted)]">
                    <Lock size={14} strokeWidth={1.5} aria-hidden="true" />
                    {readOnlyHint}
                  </span>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <CanvasSwitch
                      size="sm"
                      aria-label={t2("canvas.txt.music.instrumental")}
                      checked={modelParams.is_instrumental === "instrumental"}
                      onCheckedChange={(checked) => {
                        const offValue =
                          selectedModel?.params.is_instrumental?.default ??
                          "vocal";
                        handleParamChange(
                          "is_instrumental",
                          checked ? "instrumental" : offValue,
                        );
                      }}
                      disabled={controlsDisabled}
                      data-action-ui-id="popover.instrumental-switch"
                    />
                    <span className="text-[12px] text-[var(--canvas-controls-text)]">
                      {t2("canvas.txt.music.instrumental")}
                    </span>
                  </div>
                )}
              </>
            )}
          {showVoicePicker && (
            <>
              <span
                aria-hidden={true}
                className="w-px h-3 bg-foreground/15 shrink-0"
              />
              <button
                ref={voiceAnchorRef}
                type="button"
                onClick={(e2) => {
                  e2.stopPropagation();
                  setVoicePickerOpen((v2) => !v2);
                  setVoiceQuery("");
                }}
                disabled={controlsDisabled}
                className="h-8 px-2 text-[13px] font-normal leading-[20px] tracking-normal border-none bg-transparent text-[var(--canvas-controls-text-muted)] hover:enabled:text-[var(--canvas-controls-text)] disabled:cursor-default disabled:opacity-60 truncate min-w-0 max-w-[160px] flex items-center gap-1.5 canvas-prompt-control"
                title={selectedVoiceLabel}
              >
                <span className="truncate">
                  {selectedVoiceLabel || t2("canvas.voice.placeholder")}
                </span>
                <span className="text-[9px] text-[var(--canvas-controls-text-muted)] shrink-0">
                  ▼
                </span>
              </button>
            </>
          )}
          {hasConfigurableParams && !readOnlyHint && (
            <>
              <span
                aria-hidden={true}
                className="w-px h-3 bg-foreground/15 shrink-0"
              />
              <ParamsChip
                anchorRef={paramsAnchorRef}
                summary={paramsSummary}
                open={paramsOpen}
                onToggle={() => setParamsOpen((v2) => !v2)}
                disabled={controlsDisabled || !selectedModel}
                iconOnly={showAudioParamsIcon}
              />
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {inGeneratingState ? (
            <GeneratingButton label={t2("canvas.generating")} />
          ) : showDualButtons ? (
            <DualSubmitButtons
              submitting={false}
              canSubmit={canSubmit}
              creditCost={computedCreditCost}
              onNewNode={handleNewNode}
              onReplace={handleReplace}
              disabledTitle={
                !canSubmit ? audioExtensionValidationMessage : void 0
              }
            />
          ) : (
            <SubmitButton
              submitting={false}
              canSubmit={canSubmit}
              loading={modelsLoading}
              creditCost={computedCreditCost}
              onClick={handleConfirm}
              title={audioExtensionValidationMessage ?? t2("canvas.generate")}
            >
              {submitLabel}
            </SubmitButton>
          )}
        </div>
        {paramsOpen &&
          selectedModel &&
          hasConfigurableParams &&
          !readOnlyHint && (
            <ParamsPopup
              anchorRef={paramsAnchorRef}
              onClose={() => setParamsOpen(false)}
            >
              {renderedParamElements}
            </ParamsPopup>
          )}
        {voicePickerOpen &&
          showVoicePicker &&
          voicePickerPlacement &&
          reactDomExports.createPortal(
            // biome-ignore lint/a11y/noStaticElementInteractions: popup container, click only stops propagation
            // biome-ignore lint/a11y/useKeyWithClickEvents: same reason
            <div
              data-side={voicePickerPlacement.side}
              className="canvas-portal-popover-in nowheel fixed z-[10001] w-[336px] flex flex-col rounded-[16px] border border-[var(--canvas-controls-border)] shadow-[var(--canvas-shadow-dropdown)]"
              style={{
                background: "var(--canvas-controls-bg)",
                left: voicePickerPlacement.left,
                top: voicePickerPlacement.top,
                bottom: voicePickerPlacement.bottom,
                maxHeight: voicePickerPlacement.maxHeight,
              }}
              onClick={(e2) => e2.stopPropagation()}
            >
              <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
                <span className="text-[10px] font-medium text-[var(--canvas-controls-text-muted)]">
                  {t2("canvas.voice.title")}
                </span>
                <CloseButton
                  variant="inline"
                  onClick={(e2) => {
                    e2.stopPropagation();
                    setVoicePickerOpen(false);
                  }}
                  title={t2("common.close")}
                />
              </div>
              <div className="px-2.5 pb-1 shrink-0">
                <input
                  type="text"
                  value={voiceQuery}
                  onChange={(e2) => setVoiceQuery(e2.target.value)}
                  onClick={(e2) => e2.stopPropagation()}
                  onKeyDown={(e2) => {
                    if (e2.key === "Enter" && showCustomVoiceRow) {
                      e2.preventDefault();
                      applyCustomVoiceId();
                    }
                  }}
                  placeholder={t2("canvas.voice.searchPlaceholder", {
                    defaultValue: "Search or paste voice ID...",
                  })}
                  className="w-full bg-[var(--canvas-node-bg)] border border-[var(--canvas-controls-border)] rounded px-2 py-1 text-[11px] text-[var(--canvas-controls-text)] placeholder:text-[var(--canvas-controls-text-muted)] outline-none transition-[border-color] duration-150 focus:border-[var(--canvas-node-border-selected)]"
                  autoFocus={true}
                />
              </div>
              <div className="flex items-center gap-1 px-2.5 pb-1 shrink-0">
                {[
                  {
                    key: "language",
                    label: t2("canvas.voice.filter.language", {
                      defaultValue: "Language",
                    }),
                    value: filterLanguage,
                    set: setFilterLanguage,
                  },
                  {
                    key: "accent",
                    label: t2("canvas.voice.filter.accent", {
                      defaultValue: "Accent",
                    }),
                    value: filterAccent,
                    set: setFilterAccent,
                  },
                  {
                    key: "gender",
                    label: t2("canvas.voice.filter.gender", {
                      defaultValue: "Gender",
                    }),
                    value: filterGender,
                    set: setFilterGender,
                  },
                  {
                    key: "age",
                    label: t2("canvas.voice.filter.age", {
                      defaultValue: "Age",
                    }),
                    value: filterAge,
                    set: setFilterAge,
                  },
                ].map((f2) => (
                  <div
                    key={f2.key}
                    className="flex-1 min-w-0 flex items-center bg-[var(--canvas-node-bg)] border border-[var(--canvas-controls-border)] rounded cursor-pointer transition-[border-color] duration-150 focus-within:border-[var(--canvas-node-border-selected)]"
                  >
                    <Select
                      value={f2.value}
                      onValueChange={(value) => {
                        if (typeof value === "string") f2.set(value);
                      }}
                    >
                      <SelectTrigger
                        size="sm"
                        onClick={(e2) => e2.stopPropagation()}
                        className="h-6 min-w-0 flex-1 border-none! bg-transparent! py-1 pr-0 pl-1 text-[10px] text-[var(--canvas-controls-text)] shadow-none outline-none focus-visible:border-transparent! focus-visible:ring-0! data-placeholder:text-[var(--canvas-controls-text-muted)] [&>svg]:hidden"
                      >
                        <SelectValue placeholder={f2.label} />
                      </SelectTrigger>
                      <SelectContent
                        sideOffset={6}
                        className="min-w-32"
                        onClick={(e2) => e2.stopPropagation()}
                      >
                        {voiceFilterOptions[f2.key].map((opt) => (
                          <SelectItem
                            key={opt}
                            value={opt}
                            className="text-[11px]"
                          >
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {f2.value ? (
                      <button
                        type="button"
                        onClick={(e2) => {
                          e2.stopPropagation();
                          e2.preventDefault();
                          f2.set("");
                        }}
                        className="shrink-0 flex items-center justify-center w-4 h-4 mr-px text-[var(--canvas-controls-text-muted)] hover:text-[var(--canvas-controls-text)] transition-colors duration-150"
                      >
                        <X size={9} strokeWidth={1.5} />
                      </button>
                    ) : (
                      <span className="shrink-0 flex items-center justify-center w-4 h-4 mr-px pointer-events-none text-[var(--canvas-controls-text-muted)]">
                        <ChevronDown size={10} strokeWidth={1.5} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="overflow-y-auto autohide-scrollbar scrollbar-2 px-1 pb-1.5 flex-1">
                {filteredVoices.length === 0 && !showCustomVoiceRow ? (
                  <div className="text-[10px] text-[var(--canvas-controls-text-muted)] text-center py-3 italic">
                    {t2("canvas.voice.empty")}
                  </div>
                ) : (
                  <>
                    {filteredVoices.map((v2) => {
                      const isSelected = v2.voice_id === selectedVoiceId;
                      const isAuditioning = v2.voice_id === auditioningVoiceId;
                      const hasSample = !!v2.sample_audio;
                      return (
                        <div
                          key={v2.voice_id}
                          className={[
                            "group w-full pl-1 pr-2 py-1 rounded text-[11px] transition-colors duration-100 flex items-center gap-1.5",
                            isSelected
                              ? "bg-indigo-500/20 text-[var(--canvas-controls-text)]"
                              : "text-[var(--canvas-controls-text)] hover:bg-[var(--canvas-controls-hover)]",
                          ].join(" ")}
                        >
                          {hasSample ? (
                            <button
                              type="button"
                              onClick={(e2) => {
                                e2.stopPropagation();
                                toggleAudition(v2.voice_id, v2.sample_audio);
                              }}
                              className="flex items-center justify-center w-5 h-5 shrink-0 rounded text-[var(--canvas-controls-text-muted)] hover:text-[var(--canvas-controls-text)] hover:bg-[var(--canvas-controls-hover)] transition-colors duration-100"
                              title={
                                isAuditioning
                                  ? t2("common.pause", {
                                      defaultValue: "Pause",
                                    })
                                  : t2("common.play", {
                                      defaultValue: "Play",
                                    })
                              }
                            >
                              {isAuditioning ? <PauseIcon /> : <PlayIcon />}
                            </button>
                          ) : (
                            <span className="w-5 h-5 shrink-0" />
                          )}
                          <button
                            type="button"
                            onClick={(e2) => {
                              e2.stopPropagation();
                              handleParamChange("voice_id", v2.voice_id);
                              setVoicePickerOpen(false);
                              setVoiceQuery("");
                            }}
                            className="flex-1 min-w-0 text-left truncate cursor-pointer"
                          >
                            {v2.name}
                          </button>
                          {isSelected && (
                            <span className="text-[10px] text-indigo-400 shrink-0 ml-2">
                              ✓
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {showCustomVoiceRow && (
                      <button
                        type="button"
                        onClick={(e2) => {
                          e2.stopPropagation();
                          applyCustomVoiceId();
                        }}
                        className={[
                          "w-full px-2 py-1.5 rounded text-[11px] text-left transition-colors duration-100 flex items-center gap-1.5 text-[var(--canvas-controls-text-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] cursor-pointer",
                          filteredVoices.length > 0
                            ? "mt-1 border-t border-[var(--canvas-controls-border)] pt-2"
                            : "",
                        ].join(" ")}
                        title={t2("canvas.voice.useCustomTitle", {
                          defaultValue:
                            "Use this string as a custom voice ID (e.g. cloned hub_… or designed ttv_…)",
                        })}
                      >
                        <span className="shrink-0 text-[9px]">↵</span>
                        <span className="truncate">
                          {t2("canvas.voice.useCustom", {
                            defaultValue: "Use voice ID:",
                          })}{" "}
                          <span className="text-[var(--canvas-controls-text)] font-mono">
                            {trimmedVoiceQuery}
                          </span>
                        </span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>,
            document.body,
          )}
      </div>
    </>
  );
  const attachmentChipCount = referenceBarVisible
    ? (referenceItems?.length ?? 0) +
      (mode2 === "text" && !!onAddReference && !!showReferenceAddButton ? 1 : 0)
    : mode2 === "audio"
      ? attachmentState.items.length +
        (attachmentState.showAddButton && !controlsDisabled ? 1 : 0)
      : 0;
  const promptLengthHintExtraHeight =
    selectedModel?.promptMaxLength && selectedModel.promptMaxLength > 0
      ? PROMPT_LENGTH_HINT_EXTRA_HEIGHT
      : 0;
  const audioReferenceBarVisible =
    mode2 === "audio" &&
    (attachmentState.items.length > 0 || attachmentState.showAddButton);
  const audioReferenceBarExtraHeight = audioReferenceBarVisible
    ? AUDIO_REFERENCE_BAR_FIRST_ROW_EXTRA_HEIGHT
    : 0;
  const extraHeight =
    musicLayout.extraHeight +
    audioReferenceBarExtraHeight +
    attachmentExtraHeight(attachmentChipCount) +
    promptLengthHintExtraHeight +
    (expanded ? 0 : compactPromptExtraHeight);
  if (renderShell)
    return (
      <>
        {renderShell({
          onClose,
          expanded,
          extraHeight,
          children: body2,
        })}
      </>
    );
  return (
    <PopoverShell
      promptLayout={true}
      onClose={onClose}
      expanded={expanded}
      extraHeight={extraHeight}
      gapOffset={popoverGapOffset}
    >
      {body2}
    </PopoverShell>
  );
}
