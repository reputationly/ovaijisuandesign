// txt-popover-inner.jsx
import { ChevronDown, jsxRuntimeExports, Lock, reactDomExports, reactExports, useMusicPromptLayout, useTranslation, X$7 as CloseIcon } from "../vendor.js";
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
  mode,
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
  readOnly = false,
  readOnlyLyrics,
  readOnlyHint,
  navigationSnapshot,
}) {
  const { t: translate } = useTranslation();
  const paramsAnchorRef = reactExports.useRef(null);
  const voiceAnchorRef = reactExports.useRef(null);
  const assetMetadataStore = useAssetMetadataApi();
  const mentionEnabled = mode === "text" && !!mentionPicker;
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
      const assets = assetMetadataStore.getState().assets;
      return parsePromptToTiptap(defaultPrompt, (path) => {
        let foundAsset;
        assets.forEach((meta) => {
          if (foundAsset) return;
          if (meta.path === path)
            foundAsset = {
              path: meta.path,
              name: meta.name,
              type: meta.type,
            };
        });
        if (!foundAsset) return null;
        const kind =
          foundAsset.type === "video" || foundAsset.type === "audio" || foundAsset.type === "text"
            ? foundAsset.type
            : "image";
        return {
          path: foundAsset.path,
          filename: foundAsset.name,
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
    popoverType: mode === "audio" ? "t2a" : "t2t",
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
    const audioElement = auditionAudioRef.current;
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
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
      const audioElement = auditionAudioRef.current;
      if (audioElement) {
        audioElement.pause();
        audioElement.src = "";
      }
      auditionAudioRef.current = null;
    };
  }, []);
  const [models, setModels] = reactExports.useState([]);
  const [modelsLoading, setModelsLoading] = reactExports.useState(false);
  const [selectedModelId, setSelectedModelId] = reactExports.useState("");
  const [modelParams, setModelParams] = reactExports.useState({});
  const [voiceList, setVoiceList] = reactExports.useState([]);
  const selectedModel = models.find((modelEntry) => modelEntry.id === selectedModelId);
  const formDisabled = modelsLoading || isResolvingTextReferences;
  const controlsDisabled = formDisabled || readOnly;
  const audioMode = selectedModel
    ? audioModeForModel(selectedModel)
    : initialAudioMode === "music"
      ? "music"
      : "tts";
  const audioModeSelectionsRef = reactExports.useRef({});
  const audioModelParamsRef = reactExports.useRef({});
  const modeFilteredModels = reactExports.useMemo(() => {
    if (mode !== "audio") return models;
    return models.filter((model) => modelBelongsToAudioMode(model, audioMode));
  }, [models, mode, audioMode]);
  const supportsReferences =
    mode === "audio" &&
    ((selectedModel?.max_refs ?? 0) > 0 ||
      (selectedModel?.max_audio_refs ?? 0) > 0);
  const richEnabled = mentionEnabled || supportsReferences;
  const attachmentState = useAttachmentState({
    defaultPrompt:
      supportsReferences || mode === "audio" ? defaultPrompt : void 0,
    defaultImagePaths: supportsReferences ? defaultImagePaths : void 0,
    defaultAudioPaths: supportsReferences ? defaultAudioPaths : void 0,
    defaultTextPaths: mode === "audio" ? defaultTextPaths : void 0,
    maxImageRefs: supportsReferences ? (selectedModel?.max_refs ?? 0) : 0,
    maxAudioRefs: supportsReferences ? (selectedModel?.max_audio_refs ?? 0) : 0,
    maxVideoRefs: 0,
    maxTextRefs: mode === "audio" ? DEFAULT_TEXT_REFERENCE_MAX : 0,
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
  const isAudioExtension = mode === "audio" && !!selectedModel?.audioExtension;
  const audioExtensionCapability = selectedModel?.audioExtension;
  const assets = useAssetMetadataStore((state) => state.assets);
  const audioExtensionSourceMeta = reactExports.useMemo(() => {
    if (!isAudioExtension) return void 0;
    const sourcePath = attachmentState.audioPaths.find(Boolean);
    if (!sourcePath) return void 0;
    for (const meta of assets.values()) {
      if (meta.path === sourcePath) return meta;
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
      (option) => !disabledAudioDurationOptions.has(option),
    );
    if (!firstEnabledDuration) return;
    setModelParams((current) =>
      current.duration === firstEnabledDuration
        ? current
        : {
            ...current,
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
    () => summarizeParams(translate, selectedModel, modelParams),
    [translate, selectedModel, modelParams],
  );
  const computedCreditCost = reactExports.useMemo(() => {
    if (creditCost != null) return creditCost;
    if (mode === "text")
      return selectedModelId
        ? calcTextCost(pricingConfig, selectedModelId)
        : void 0;
    if (selectedModel?.backend === BACKEND_SEEDAUDIO) {
      return translate("canvas.credit.perSecondCompact", {
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
        return translate("canvas.credit.perMinuteCompact", {
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
    mode,
    audioMode,
    isAudioExtension,
    translate,
    promptText,
    countFinalPromptCharacters,
    modelParams,
  ]);
  const placeholder = reactExports.useMemo(() => {
    const { key, defaultValue } = getPlaceholder(
      mode,
      selectedModel,
      initialAudioMode,
    );
    return translate(key, {
      defaultValue,
    });
  }, [initialAudioMode, mode, selectedModel, translate]);
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
      .then((all) => {
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
          ? all.filter((model) => currentModelBackends.includes(model.backend))
          : all;
        setModels((current) => {
          if (
            current.length === filtered.length &&
            current.every((model, index) => model === filtered[index])
          ) {
            return current;
          }
          return filtered;
        });
        const applyInitialSelection = (model, paramOverrides) => {
          const nextParams = {
            ...getDefaultParams(model),
            ...(paramOverrides ?? {}),
          };
          setSelectedModelId((current) =>
            current === model.id ? current : model.id,
          );
          setModelParams((current) =>
            stringRecordsEqual(current, nextParams) ? current : nextParams,
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
    const firstValid = models.find((modelEntry) => !disabledModelIds.has(modelEntry.id));
    if (firstValid) {
      setSelectedModelId(firstValid.id);
      setModelParams(getDefaultParams(firstValid));
    }
  }, [disabledModelIds, selectedModelId, models]);
  reactExports.useEffect(() => {
    if (mode !== "audio" || !fetchTtsVoices) return;
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
  }, [mode, fetchTtsVoices]);
  const voiceIdToName = reactExports.useMemo(() => {
    const map = new Map();
    for (const voice of voiceList) map.set(voice.voice_id, voice.name);
    return map;
  }, [voiceList]);
  const showVoicePicker =
    voiceList.length > 0 && !!selectedModel?.params?.voice_id;
  const selectedVoiceId =
    modelParams.voice_id ?? selectedModel?.params?.voice_id?.default ?? "";
  const selectedVoiceLabel =
    voiceIdToName.get(selectedVoiceId) ?? selectedVoiceId;
  const voiceFilterOptions = reactExports.useMemo(() => {
    const collect = (key) => {
      const set = new Set();
      for (const voice of voiceList) {
        const value = voice[key];
        if (value) set.add(value);
      }
      return [...set].sort();
    };
    return {
      language: collect("language"),
      accent: collect("accent"),
      gender: collect("gender"),
      age: collect("age"),
    };
  }, [voiceList]);
  const filteredVoices = reactExports.useMemo(() => {
    let list = voiceList;
    if (filterLanguage)
      list = list.filter((voice) => voice.language === filterLanguage);
    if (filterAccent) list = list.filter((voice) => voice.accent === filterAccent);
    if (filterGender) list = list.filter((voice) => voice.gender === filterGender);
    if (filterAge) list = list.filter((voice) => voice.age === filterAge);
    const normalizedVoiceQuery = voiceQuery.trim().toLowerCase();
    if (normalizedVoiceQuery) {
      list = list.filter(
        (voice) =>
          voice.name.toLowerCase().includes(normalizedVoiceQuery) ||
          voice.voice_id.toLowerCase().includes(normalizedVoiceQuery),
      );
    }
    if (selectedVoiceId) {
      const voiceIndex = list.findIndex((voice) => voice.voice_id === selectedVoiceId);
      if (voiceIndex > 0) {
        list = [list[voiceIndex], ...list.slice(0, voiceIndex), ...list.slice(voiceIndex + 1)];
      }
    }
    return list;
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
    const voiceQuery = trimmedVoiceQuery.toLowerCase();
    return voiceList.some(
      (voice) => voice.voice_id.toLowerCase() === voiceQuery || voice.name.toLowerCase() === voiceQuery,
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
      if (mode !== "audio") {
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
      const selection = resolveModelSelection(
        models,
        modelId,
        audioModelParamsRef.current[modelId],
      );
      if (!selection) return;
      setSelectedModelId(selection.modelId);
      setModelParams(selection.params);
    },
    [mode, modelParams, models, selectedModel, selectedModelId],
  );
  const handleAudioModeChange = reactExports.useCallback(
    (next) => {
      if (next === audioMode) return;
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
      const selection = resolveAudioModeSelection(
        models,
        next,
        audioModeSelectionsRef.current[next],
      );
      if (!selection) return;
      setSelectedModelId(selection.modelId);
      setModelParams(selection.params);
    },
    [audioMode, models, modelParams, selectedModelId],
  );
  const handleParamChange = reactExports.useCallback(
    (key, value) => {
      setModelParams((prev) => {
        const next = {
          ...prev,
          [key]: value,
        };
        return selectedModel ? enforceConstraints(next, selectedModel) : next;
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
      audioExtensionValidationMessage = translate(
        "canvas.audioExtension.referenceRequired",
        {
          defaultValue: "请选择一条参考音频",
        },
      );
    } else if (audioExtensionSourceDurationSec === void 0) {
      audioExtensionValidationMessage = translate(
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
      audioExtensionValidationMessage = translate(
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
      audioExtensionValidationMessage = translate(
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
    ...(mode === "audio"
      ? {
          textPaths: attachmentState.textPaths,
        }
      : {}),
  };
  const referenceNavigation = useReferenceAttachmentNavigation({
    nodeId: nodeId ?? replaceNodeId,
    mode,
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
          const text = extractCanvasEditorText(editor);
          onSaveDraftRef.current?.({
            // Empty editor → BOTH fields undefined, mirroring draftRef's
            // `promptText || undefined` intent. An empty Tiptap doc still
            // serializes to truthy JSON — persisting it would mask the ??
            // fallback chain (quick-prompt template / upstream preset /
            // markdown) on the next open with a blank editor.
            prompt: text || void 0,
            promptJson: text ? JSON.stringify(editor.getJSON()) : void 0,
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
    async (submitEvent, replaceId) => {
      submitEvent.stopPropagation();
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
            translate(
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
          translate("canvas.promptRequired", {
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
          translate("canvas.prompt.tooLong", {
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
          ...(mode === "audio"
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
            translate("canvas.seedAudio.refMutuallyExclusive", {
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
            translate("canvas.prompt.unresolvedRefs", {
              defaultValue: "以下引用未在附件中找到，已保留原文：{{refs}}",
              refs: compiled.unresolved.map((unresolvedReference) => `@${unresolvedReference.path}`).join(", "),
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
        const popoverKey = mode === "audio" ? "t2a" : "t2t";
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
      mode,
      richEnabled,
      supportsReferences,
      attachmentState,
      translate,
      saveLastUsedModelParams,
    ],
  );
  const inGeneratingState = isGenerating;
  const pendingSubmitRef = reactExports.useRef(null);
  const handleConfirm = reactExports.useCallback(
    (changeEvent) => {
      if (modelsLoading || !selectedModelId) {
        pendingSubmitRef.current = {
          kind: "confirm",
        };
        return;
      }
      doSubmit(changeEvent, replaceNodeId);
    },
    [doSubmit, modelsLoading, replaceNodeId, selectedModelId],
  );
  const handleNewNode = reactExports.useCallback(
    (clickEvent) => {
      if (modelsLoading || !selectedModelId) {
        pendingSubmitRef.current = {
          kind: "new",
        };
        return;
      }
      doSubmit(clickEvent, void 0);
    },
    [doSubmit, modelsLoading, selectedModelId],
  );
  const handleReplace = reactExports.useCallback(
    (clickEvent) => {
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
      doSubmit(clickEvent, nodeId);
    },
    [doSubmit, modelsLoading, nodeId, selectedModelId],
  );
  reactExports.useEffect(() => {
    if (modelsLoading || !selectedModelId) return;
    const pending = pendingSubmitRef.current;
    if (!pending) return;
    pendingSubmitRef.current = null;
    const syntheticEvent = {
      stopPropagation: () => void 0,
    };
    if (pending.kind === "confirm") doSubmit(syntheticEvent, replaceNodeId);
    else if (pending.kind === "new") doSubmit(syntheticEvent, void 0);
    else doSubmit(syntheticEvent, pending.targetNodeId);
  }, [doSubmit, modelsLoading, replaceNodeId, selectedModelId]);
  const handleEditorUpdate = reactExports.useCallback(
    (hasContent, textLen) => {
      setEditorHasText(hasContent);
      setEditorPromptLength(textLen);
    },
    [],
  );
  const handleAtTrigger = reactExports.useCallback(
    (query, rect, getRect, triggerRange) => {
      setAtPickerState((state) =>
        nextAtPickerState(state, {
          query,
          rect,
          getRect,
          triggerRange,
        }),
      );
    },
    [],
  );
  const handleAtSelect = reactExports.useCallback(
    (meta, assetId, sourceNodeId) => {
      if (supportsReferences) {
        const rawKind = meta.type;
        if (rawKind === "text") {
          const admitted = attachmentState.addPaths(
            [
              {
                path: meta.path,
                sourceNodeId: sourceNodeId ?? assetId,
              },
            ],
            "text",
          );
          if (!admitted.includes(meta.path)) {
            setAtPickerState((state) => ({
              ...state,
              open: false,
            }));
            return;
          }
          editorRef.current?.commands.replaceAtTriggerWithFileRef(
            {
              path: meta.path,
              filename: meta.name,
              kind: "text",
            },
            atPickerState.triggerRange ?? void 0,
          );
          setAtPickerState((currentState) => ({
            ...currentState,
            open: false,
          }));
          return;
        }
        const kind = rawKind;
        if (kind !== "image" && kind !== "audio") return;
        if (blockedRefKind && kind === blockedRefKind) {
          dedupedToast.error(
            translate("canvas.seedAudio.refMutuallyExclusive", {
              defaultValue: "参考音频与参考图片不能同时使用，请只保留其中一种",
            }),
          );
          setAtPickerState((currentState) => ({
            ...currentState,
            open: false,
          }));
          return;
        }
        attachmentState.addPaths(
          [
            {
              path: meta.path,
              sourceNodeId: sourceNodeId ?? assetId,
            },
          ],
          kind,
        );
        editorRef.current?.commands.replaceAtTriggerWithFileRef(
          {
            path: meta.path,
            filename: meta.name,
            kind,
          },
          atPickerState.triggerRange ?? void 0,
        );
        setAtPickerState((currentState) => ({
          ...currentState,
          open: false,
        }));
        return;
      }
      const kind =
        meta.type === "video" ||
        meta.type === "audio" ||
        meta.type === "text"
          ? meta.type
          : "image";
      mentionPicker?.addPaths([meta.path], kind);
      editorRef.current?.commands.replaceAtTriggerWithFileRef(
        {
          path: meta.path,
          filename: meta.name,
          kind,
        },
        atPickerState.triggerRange ?? void 0,
      );
      setAtPickerState((currentState) => ({
        ...currentState,
        open: false,
      }));
    },
    [
      mentionPicker,
      atPickerState.triggerRange,
      supportsReferences,
      attachmentState,
      blockedRefKind,
      translate,
    ],
  );
  const handleReferenceRemove = reactExports.useCallback(
    (path) => {
      onRemoveReference?.(path);
      editorRef.current?.commands.removeCanvasFileRefsByPath(path);
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
    (path) => {
      attachmentState.removePath(path, {
        tearEdge: true,
      });
      editorRef.current?.commands.removeCanvasFileRefsByPath(path);
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
    (meta, assetId, sourceNodeId) => {
      if (!supportsReferences) {
        const kind =
          meta.type === "video" ||
          meta.type === "audio" ||
          meta.type === "text"
            ? meta.type
            : "image";
        mentionPicker?.addPaths([meta.path], kind);
        return;
      }
      if (meta.type === "text") return;
      const kind = meta.type;
      if (kind !== "image" && kind !== "audio") return;
      if (blockedRefKind === kind) {
        dedupedToast.error(
          translate("canvas.seedAudio.refMutuallyExclusive", {
            defaultValue: "参考音频与参考图片不能同时使用，请只保留其中一种",
          }),
        );
        return;
      }
      attachmentState.addPaths(
        [
          {
            path: meta.path,
            sourceNodeId: sourceNodeId ?? assetId,
          },
        ],
        kind,
      );
    },
    [attachmentState, blockedRefKind, mentionPicker, supportsReferences, translate],
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
          for (const path of rejectedReferencePaths(
            textAdds,
            attachmentState.textPaths,
            admitted,
          )) {
            editorRef.current?.commands.removeCanvasFileRefsByPath(path);
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
    return new Set((referenceItems ?? []).map((item) => item.path));
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
        (kind) => kind !== blockedRefKind,
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
    for (const [key, parameterDefinition] of Object.entries(selectedModel.params)) {
      if (key === "voice_id" && showVoicePicker) continue;
      if (key === "lyrics" && audioMode === "music") continue;
      if (key === "is_instrumental" && audioMode === "music") continue;
      if (key === "music_length_ms" && audioMode === "music") {
        elements.push(
          <MusicLengthParam
            key={key}
            value={modelParams[key] ?? parameterDefinition.default ?? "auto"}
            onChange={(value) => handleParamChange(key, value)}
            disabled={controlsDisabled}
          />,
        );
        continue;
      }
      if (parameterDefinition.type === "textarea") {
        const labelKey = paramI18nKey(key, parameterDefinition.label);
        const placeholderKey = paramPlaceholderI18nKey(key);
        elements.push(
          <ParamTextarea
            key={key}
            label={
              labelKey
                ? translate(labelKey, {
                    defaultValue: paramLabelFallback(key, parameterDefinition.label),
                  })
                : paramLabelFallback(key, parameterDefinition.label)
            }
            value={modelParams[key] ?? parameterDefinition.default ?? ""}
            onChange={(value) => handleParamChange(key, value)}
            disabled={controlsDisabled}
            placeholder={
              placeholderKey
                ? translate(placeholderKey, {
                    defaultValue: paramPlaceholderFallback(
                      key,
                      parameterDefinition.placeholder,
                    ),
                  })
                : paramPlaceholderFallback(key, parameterDefinition.placeholder)
            }
          />,
        );
        continue;
      }
      if (parameterDefinition.type === "slider") {
        if (parameterDefinition.min === void 0 || parameterDefinition.max === void 0 || parameterDefinition.step === void 0)
          continue;
        const labelKey = paramI18nKey(key, parameterDefinition.label);
        elements.push(
          <ParamSlider
            key={key}
            variant={
              mode === "audio" && key === "speed" ? "filled" : "standard"
            }
            label={
              labelKey
                ? translate(labelKey, {
                    defaultValue: paramLabelFallback(key, parameterDefinition.label),
                  })
                : paramLabelFallback(key, parameterDefinition.label)
            }
            value={modelParams[key] ?? parameterDefinition.default}
            min={parameterDefinition.min}
            max={parameterDefinition.max}
            step={parameterDefinition.step}
            marks={parameterDefinition.marks}
            onChange={(value) => handleParamChange(key, value)}
            disabled={controlsDisabled}
          />,
        );
        continue;
      }
      const isVoiceId = key === "voice_id" && voiceList.length > 0;
      const options = isVoiceId
        ? voiceList.map((voice) => voice.voice_id)
        : isAudioExtension && key === "duration"
          ? effectiveAudioDurationOptions
          : parameterDefinition.options;
      if (!options || options.length <= 1) continue;
      const disabled = getDisabledOptions(
        key,
        modelParams,
        selectedModel.paramConstraints,
      );
      const disabledOptions =
        isAudioExtension && key === "duration"
          ? new Set([...disabled, ...disabledAudioDurationOptions])
          : disabled;
      const labelKey =
        isAudioExtension && key === "duration"
          ? "canvas.audioExtension.extendTo"
          : paramI18nKey(key, parameterDefinition.label);
      elements.push(
        <ParamTabs
          key={key}
          label={
            labelKey
              ? translate(labelKey, {
                  defaultValue:
                    isAudioExtension && key === "duration"
                      ? "延长至"
                      : paramLabelFallback(key, parameterDefinition.label),
                })
              : paramLabelFallback(key, parameterDefinition.label)
          }
          options={options}
          value={modelParams[key] ?? parameterDefinition.default}
          onChange={(value) => handleParamChange(key, value)}
          disabled={controlsDisabled}
          disabledOptions={disabledOptions}
          optionUnit={key === "duration" ? "seconds" : void 0}
          getDisabledOptionTooltip={
            isAudioExtension && key === "duration"
              ? () =>
                  translate("canvas.audioExtension.durationOptionDisabled", {
                    defaultValue:
                      "最终时长需从原音频时长向上取整后的下一秒开始选择",
                  })
              : void 0
          }
          getOptionLabel={
            isVoiceId
              ? (option) => voiceIdToName.get(option) ?? option
              : isAudioExtension && key === "duration"
                ? (option) => `${option}s`
                : void 0
          }
          grouped={isAudioExtension && key === "duration"}
          allowDeselect={parameterDefinition.optional}
        />,
      );
    }
    return elements;
  }, [
    mode,
    selectedModel,
    modelParams,
    controlsDisabled,
    handleParamChange,
    translate,
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
    mode === "audio" &&
    (selectedModel?.id.toLowerCase().includes("speech-2.8") ||
      selectedModel?.backend === "seedaudio");
  const hasReadOnlyLyrics = !!readOnlyLyrics?.trim();
  const showsMusicLyricsEditor =
    mode === "audio" &&
    audioMode === "music" &&
    !!(selectedModel?.params.lyrics || hasReadOnlyLyrics) &&
    modelParams.is_instrumental !== "instrumental";
  const musicLayout = useMusicPromptLayout(
    showsMusicLyricsEditor,
    hasReadOnlyLyrics,
    expanded,
  );
  const referenceBarVisible =
    (mode === "text" && !!onAddReference) ||
    !!(referenceItems && referenceItems.length > 0);
  const body = (
    <>
      {mode !== "audio" && (
        <div className="absolute top-3 right-3 z-10">
          <ExpandToggleButton
            expanded={expanded}
            onToggle={() => setExpanded((isExpanded) => !isExpanded)}
          />
        </div>
      )}
      <TextPopoverReferenceSection
        mode={mode}
        audioMode={audioMode}
        controlsDisabled={controlsDisabled}
        onAudioModeChange={handleAudioModeChange}
        expanded={expanded}
        onToggle={() => setExpanded((isExpanded) => !isExpanded)}
        references={
          referenceBarVisible
            ? {
                items: referenceItems ?? [],
                readOnly: mode !== "text" || !onAddReference,
                showAddButton:
                  mode === "text" &&
                  !!onAddReference &&
                  !!showReferenceAddButton,
                onReplace:
                  mode === "text" && onReplaceReference
                    ? (item) => {
                        void handleReferenceReplace(item);
                      }
                    : void 0,
                onRemove:
                  mode === "text" && onRemoveReference
                    ? handleReferenceRemove
                    : () => {},
                onAdd:
                  mode === "text" && onAddReference
                    ? onAddReference
                    : () => {},
                onItemClick: handleAttachmentClick,
                getLocateAction: referenceNavigation.getLocateAction,
              }
            : null
        }
        audioAttachments={
          mode === "audio" &&
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
            mode === "audio" && audioMode === "music"
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
                  setAtPickerState((currentState) => ({
                    ...currentState,
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
                  for (const path of paths) {
                    if (supportsReferences) attachmentState.removePath(path);
                    else onRemoveReference?.(path);
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
                    setAtPickerState((currentState) => ({
                      ...currentState,
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
              readOnly={readOnly}
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
              onChange={(changeEvent) => {
                changeEvent.stopPropagation();
                handleParamChange("lyrics", changeEvent.target.value);
              }}
              onClick={(clickEvent) => clickEvent.stopPropagation()}
              onKeyDown={(keyEvent) => keyEvent.stopPropagation()}
              disabled={formDisabled}
              readOnly={readOnly || readOnlyLyrics !== void 0}
              placeholder={translate("canvas.txt.music.lyricsPlaceholder", {
                defaultValue:
                  "请在此添加您的歌词。如果未填歌词，我们将根据曲风为您自动生成。",
              })}
              className={`canvas-prompt-font-size-textarea nowheel nopan w-full h-full bg-transparent border-none outline-none resize-none text-[var(--canvas-controls-text)] placeholder:text-muted-foreground/50 ${readOnly || readOnlyLyrics !== void 0 ? "hover:cursor-not-allowed" : ""}`}
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
          {mode === "audio" &&
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
                      aria-label={translate("canvas.txt.music.instrumental")}
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
                      {translate("canvas.txt.music.instrumental")}
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
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  setVoicePickerOpen((isOpen) => !isOpen);
                  setVoiceQuery("");
                }}
                disabled={controlsDisabled}
                className="h-8 px-2 text-[13px] font-normal leading-[20px] tracking-normal border-none bg-transparent text-[var(--canvas-controls-text-muted)] hover:enabled:text-[var(--canvas-controls-text)] disabled:cursor-default disabled:opacity-60 truncate min-w-0 max-w-[160px] flex items-center gap-1.5 canvas-prompt-control"
                title={selectedVoiceLabel}
              >
                <span className="truncate">
                  {selectedVoiceLabel || translate("canvas.voice.placeholder")}
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
                onToggle={() => setParamsOpen((isOpen) => !isOpen)}
                disabled={controlsDisabled || !selectedModel}
                iconOnly={showAudioParamsIcon}
              />
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {inGeneratingState ? (
            <GeneratingButton label={translate("canvas.generating")} />
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
              title={audioExtensionValidationMessage ?? translate("canvas.generate")}
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
              onClick={(clickEvent) => clickEvent.stopPropagation()}
            >
              <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
                <span className="text-[10px] font-medium text-[var(--canvas-controls-text-muted)]">
                  {translate("canvas.voice.title")}
                </span>
                <CloseButton
                  variant="inline"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    setVoicePickerOpen(false);
                  }}
                  title={translate("common.close")}
                />
              </div>
              <div className="px-2.5 pb-1 shrink-0">
                <input
                  type="text"
                  value={voiceQuery}
                  onChange={(changeEvent) => setVoiceQuery(changeEvent.target.value)}
                  onClick={(clickEvent) => clickEvent.stopPropagation()}
                  onKeyDown={(keyEvent) => {
                    if (keyEvent.key === "Enter" && showCustomVoiceRow) {
                      keyEvent.preventDefault();
                      applyCustomVoiceId();
                    }
                  }}
                  placeholder={translate("canvas.voice.searchPlaceholder", {
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
                    label: translate("canvas.voice.filter.language", {
                      defaultValue: "Language",
                    }),
                    value: filterLanguage,
                    set: setFilterLanguage,
                  },
                  {
                    key: "accent",
                    label: translate("canvas.voice.filter.accent", {
                      defaultValue: "Accent",
                    }),
                    value: filterAccent,
                    set: setFilterAccent,
                  },
                  {
                    key: "gender",
                    label: translate("canvas.voice.filter.gender", {
                      defaultValue: "Gender",
                    }),
                    value: filterGender,
                    set: setFilterGender,
                  },
                  {
                    key: "age",
                    label: translate("canvas.voice.filter.age", {
                      defaultValue: "Age",
                    }),
                    value: filterAge,
                    set: setFilterAge,
                  },
                ].map((filter) => (
                  <div
                    key={filter.key}
                    className="flex-1 min-w-0 flex items-center bg-[var(--canvas-node-bg)] border border-[var(--canvas-controls-border)] rounded cursor-pointer transition-[border-color] duration-150 focus-within:border-[var(--canvas-node-border-selected)]"
                  >
                    <Select
                      value={filter.value}
                      onValueChange={(value) => {
                        if (typeof value === "string") filter.set(value);
                      }}
                    >
                      <SelectTrigger
                        size="sm"
                        onClick={(clickEvent) => clickEvent.stopPropagation()}
                        className="h-6 min-w-0 flex-1 border-none! bg-transparent! py-1 pr-0 pl-1 text-[10px] text-[var(--canvas-controls-text)] shadow-none outline-none focus-visible:border-transparent! focus-visible:ring-0! data-placeholder:text-[var(--canvas-controls-text-muted)] [&>svg]:hidden"
                      >
                        <SelectValue placeholder={filter.label} />
                      </SelectTrigger>
                      <SelectContent
                        sideOffset={6}
                        className="min-w-32"
                        onClick={(clickEvent) => clickEvent.stopPropagation()}
                      >
                        {voiceFilterOptions[filter.key].map((option) => (
                          <SelectItem
                            key={option}
                            value={option}
                            className="text-[11px]"
                          >
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {filter.value ? (
                      <button
                        type="button"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          clickEvent.preventDefault();
                          filter.set("");
                        }}
                        className="shrink-0 flex items-center justify-center w-4 h-4 mr-px text-[var(--canvas-controls-text-muted)] hover:text-[var(--canvas-controls-text)] transition-colors duration-150"
                      >
                        <CloseIcon size={9} strokeWidth={1.5} />
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
                    {translate("canvas.voice.empty")}
                  </div>
                ) : (
                  <>
                    {filteredVoices.map((voice) => {
                      const isSelected = voice.voice_id === selectedVoiceId;
                      const isAuditioning = voice.voice_id === auditioningVoiceId;
                      const hasSample = !!voice.sample_audio;
                      return (
                        <div
                          key={voice.voice_id}
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
                              onClick={(clickEvent) => {
                                clickEvent.stopPropagation();
                                toggleAudition(voice.voice_id, voice.sample_audio);
                              }}
                              className="flex items-center justify-center w-5 h-5 shrink-0 rounded text-[var(--canvas-controls-text-muted)] hover:text-[var(--canvas-controls-text)] hover:bg-[var(--canvas-controls-hover)] transition-colors duration-100"
                              title={
                                isAuditioning
                                  ? translate("common.pause", {
                                      defaultValue: "Pause",
                                    })
                                  : translate("common.play", {
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
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation();
                              handleParamChange("voice_id", voice.voice_id);
                              setVoicePickerOpen(false);
                              setVoiceQuery("");
                            }}
                            className="flex-1 min-w-0 text-left truncate cursor-pointer"
                          >
                            {voice.name}
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
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          applyCustomVoiceId();
                        }}
                        className={[
                          "w-full px-2 py-1.5 rounded text-[11px] text-left transition-colors duration-100 flex items-center gap-1.5 text-[var(--canvas-controls-text-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] cursor-pointer",
                          filteredVoices.length > 0
                            ? "mt-1 border-t border-[var(--canvas-controls-border)] pt-2"
                            : "",
                        ].join(" ")}
                        title={translate("canvas.voice.useCustomTitle", {
                          defaultValue:
                            "Use this string as a custom voice ID (e.g. cloned hub_… or designed ttv_…)",
                        })}
                      >
                        <span className="shrink-0 text-[9px]">↵</span>
                        <span className="truncate">
                          {translate("canvas.voice.useCustom", {
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
      (mode === "text" && !!onAddReference && !!showReferenceAddButton ? 1 : 0)
    : mode === "audio"
      ? attachmentState.items.length +
        (attachmentState.showAddButton && !controlsDisabled ? 1 : 0)
      : 0;
  const promptLengthHintExtraHeight =
    selectedModel?.promptMaxLength && selectedModel.promptMaxLength > 0
      ? PROMPT_LENGTH_HINT_EXTRA_HEIGHT
      : 0;
  const audioReferenceBarVisible =
    mode === "audio" &&
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
          children: body,
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
      {body}
    </PopoverShell>
  );
}
