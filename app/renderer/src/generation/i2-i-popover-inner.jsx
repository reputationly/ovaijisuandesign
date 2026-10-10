// i2-i-popover-inner.jsx
import {
  ASPECT_RATIO_PARAM_KEYS,
  IMAGE_MODE_KEY,
  isDraftSubmitFormDisabled,
  rejectedReferencePaths,
  shouldPersistPopoverDraftOnUnmount,
  submitWithPersistedPopoverDraft,
} from "../media-editing/use-warn-missing-asset-meta.jsx";
import {
  attachmentExtraHeight,
  buildPromotionClickHandler,
  enforceConstraints,
  findModelByStoredId,
  getDefaultParams,
  migrateParamsForModel,
  normalizeParamsForModel,
  paramI18nKey,
  paramLabelFallback,
  paramPlaceholderFallback,
  paramPlaceholderI18nKey,
  popoverDraftIsDirty,
  translateOptionValue,
} from "./param-label-fallbacks.js";
import { jsxRuntimeExports, reactExports, useTranslation } from "../vendor.js";
import { dedupedToast, useAssetMetadataApi } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  PromptPlaceholder,
  useAttachmentReplacement,
  useMediaFileRefSwitch,
} from "./prompt-placeholder.jsx";
import { FileClock, useCanvasBridge } from "../media-editing/package.jsx";
import { useCanvasActions } from "../media-editing/use-canvas-actions.js";
import { BACKEND_MIDJOURNEY } from "./normalize-skill-detail-metadata.js";
import {
  composePromptWithReferenceText,
  MAX_IMAGES_PER_NODE,
  pickPersistableModelParams,
} from "../canvas/is-reexecutable-generation-node.js";
import { getDisabledOptions } from "./resolve-reference-texts.js";
import { ParamQualitySlider } from "../media-editing/param-quality-slider.jsx";
import { Tooltip } from "./missing-asset-card.jsx";
import { calcImageCost } from "./resolve-video-billing-tooltip.js";
import { nextAtPickerState, resolvePricingId } from "./select-content.jsx";
import { ParamSectionLabel, ResolutionTabs } from "./resolution-tabs.jsx";
import { AspectRatioGrid } from "./aspect-ratio-grid.jsx";
import { ParamSlider } from "./param-slider.jsx";
import { ModelChip } from "./model-chip.jsx";
import {
  collectTextChipPaths,
  countCompiledMediaPromptCharacters,
  countPromptCharacters,
  extractCanvasEditorSubmitText,
  extractCanvasEditorText,
  loadReferenceTextContent,
  parsePromptToTiptap,
  useReferenceTextContent,
} from "../assets/parse-prompt-to-tiptap.js";
import { useAssetsRefValidate } from "../assets/use-assets-ref-validate.js";
import { compileChipPromptForModel } from "../assets/compile-chip-prompt-for-model.js";
import { usePopoverOpenTrack } from "../media-editing/get-reference-navigation-defaults.jsx";
import { useReferenceAttachmentNavigation } from "../media-editing/use-reference-attachment-navigation.js";
import { useAttachmentState } from "../assets/use-attachment-state.js";
import { DEFAULT_TEXT_REFERENCE_MAX } from "../assets/reconcile-first-last-frame-default-paths.js";
import { isCanvasReferenceUri } from "../text-editor/table-document-to-llm-content.js";
import { ParamTabs } from "./param-tabs.jsx";
import {
  ExpandToggleButton,
  GeneratingButton,
  ParamTextarea,
} from "./expand-arrow-icon.jsx";
import { DualSubmitButtons } from "./dual-submit-buttons.jsx";
import { SubmitButton } from "./submit-button.jsx";
import { AttachmentBar, PopoverShell } from "./attachment-bar.jsx";
import { RichPromptInput } from "../chat/rich-prompt-input.jsx";
import { MentionPickerPopover } from "./mention-picker-popover.jsx";
import { ParamsChip } from "./params-chip.jsx";
import { ParamsPopup } from "./params-popup.jsx";
import { CountChip } from "../media-editing/count-chip.jsx";
const I2I_STANDARD_PARAMS = [
  {
    id: "aspect_ratio",
    i18nKey: "canvas.param.std.aspectRatio",
    fallbackLabel: "Aspect Ratio",
    aliases: ASPECT_RATIO_PARAM_KEYS,
  },
  {
    id: "resolution",
    i18nKey: "canvas.param.std.resolution",
    fallbackLabel: "Resolution",
    aliases: ["resolution"],
  },
];
function summarizeI2IParams(t2, model, modelParams) {
  if (!model) return "";
  const parts = [];
  for (const standardParam of I2I_STANDARD_PARAMS) {
    const matchedKey = standardParam.aliases.find(
      (alias) => model.params[alias],
    );
    if (!matchedKey) continue;
    const value = modelParams[matchedKey] ?? model.params[matchedKey].default;
    if (!value) continue;
    parts.push(translateOptionValue(t2, value));
  }
  for (const [key2, definition2] of Object.entries(model.params)) {
    if (key2 === IMAGE_MODE_KEY) continue;
    if (
      I2I_STANDARD_PARAMS.some((standardParam) =>
        standardParam.aliases.includes(key2),
      )
    )
      continue;
    const value = modelParams[key2] ?? definition2.default;
    if (!value) continue;
    parts.push(translateOptionValue(t2, value));
  }
  return parts.join(" · ");
}
function appendMidjourneyHdFlag(prompt, clarity) {
  if (clarity !== "2k" || /(^|\s)--hd(?:\s|$)/i.test(prompt)) return prompt;
  return prompt ? `${prompt} --hd` : "--hd";
}
const IMAGE_MODE_FOR_I2I = "reference";
export function I2IPopoverInner({
  onSubmit,
  onClose,
  listImageModels,
  defaultImagePath,
  resolveFileUrl,
  creditCost,
  replaceNodeId,
  defaultPrompt,
  defaultPromptJson,
  defaultModelId,
  defaultParams,
  lastUsedModelId,
  lastUsedParams,
  defaultImagePaths,
  selfAssetIds,
  nodeId,
  currentImageCount = 0,
  hasLoadingSlots = false,
  isGenerating = false,
  onAspectRatioChange,
  onSaveDraft,
  defaultTextPaths,
  hasUpstreamText,
  referenceTextContent = "",
  originalGenerationDraft,
  popoverGapOffset = 0,
  navigationSnapshot,
}) {
  const { t: t2 } = useTranslation();
  const assetMetadataStore = useAssetMetadataApi();
  const paramsAnchorRef = reactExports.useRef(null);
  const [promptText, setPromptText] = reactExports.useState(
    defaultPrompt ?? "",
  );
  const buildPromptContent = reactExports.useCallback(
    (prompt, promptJson) => {
      if (promptJson) {
        try {
          return JSON.parse(promptJson);
        } catch {}
      }
      if (!prompt) return "";
      const assets = assetMetadataStore.getState().assets;
      return parsePromptToTiptap(prompt, (path2) => {
        let hit;
        assets.forEach((meta2) => {
          if (hit) return;
          if (meta2.path === path2) {
            hit = {
              path: meta2.path,
              name: meta2.name,
              type: meta2.type,
            };
          }
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
    },
    [assetMetadataStore],
  );
  const initialEditorContent = reactExports.useMemo(() => {
    return buildPromptContent(defaultPrompt, defaultPromptJson);
  }, [buildPromptContent, defaultPrompt, defaultPromptJson]);
  const [editorContentOverride, setEditorContentOverride] =
    reactExports.useState(null);
  const [editorContentRevision, setEditorContentRevision] =
    reactExports.useState(0);
  const [expanded, setExpanded] = reactExports.useState(
    navigationSnapshot?.expanded ?? false,
  );
  const [paramsOpen, setParamsOpen] = reactExports.useState(false);
  const [count2, setCount] = reactExports.useState(
    navigationSnapshot?.count ?? 1,
  );
  const [isPreparing, setIsPreparing] = reactExports.useState(false);
  const {
    accountSubmissionAllowed = true,
    beforeAccountSubmission = () => true,
    pricingConfig,
    loadTextContent,
    saveLastUsedModelParams,
    onPromotionToast,
  } = useCanvasBridge();
  const { attachDraftOnNextDerived } = useCanvasActions();
  usePopoverOpenTrack({
    popoverType: "i2i",
    nodeId: nodeId ?? replaceNodeId ?? "",
    hasDefault: !!(defaultPrompt || defaultModelId),
  });
  const [imageModels, setImageModels] = reactExports.useState([]);
  const [modelsLoading, setModelsLoading] = reactExports.useState(false);
  const [selectedModelId, setSelectedModelId] = reactExports.useState("");
  const [modelParams, setModelParams] = reactExports.useState({});
  const userPickedModelRef = reactExports.useRef(false);
  const selectedModel = imageModels.find((m3) => m3.id === selectedModelId);
  const isMidjourney = selectedModel?.backend === BACKEND_MIDJOURNEY;
  const maxRefs = selectedModel?.max_refs ?? 0;
  const initImagePaths =
    defaultImagePaths && defaultImagePaths.length > 0
      ? defaultImagePaths
      : defaultImagePath
        ? [defaultImagePath]
        : [];
  const attachmentState = useAttachmentState({
    defaultPrompt,
    defaultImagePaths: initImagePaths,
    defaultVideoPaths: void 0,
    defaultAudioPaths: void 0,
    defaultTextPaths,
    maxImageRefs: maxRefs,
    maxVideoRefs: 0,
    maxAudioRefs: 0,
    maxTextRefs: DEFAULT_TEXT_REFERENCE_MAX,
    imageMode: IMAGE_MODE_FOR_I2I,
    hostNodeId: nodeId ?? replaceNodeId,
    resolveFileUrl,
  });
  const currentReferenceTextContent = useReferenceTextContent(
    attachmentState.textPaths,
    loadTextContent,
    referenceTextContent,
  );
  const editorRef = reactExports.useRef(null);
  const [atPickerState, setAtPickerState] = reactExports.useState({
    open: false,
    query: "",
    rect: null,
    getRect: null,
    triggerRange: null,
  });
  const [editorHasText, setEditorHasText] =
    reactExports.useState(!!defaultPrompt);
  const [promptLength, setPromptLength] = reactExports.useState(0);
  reactExports.useEffect(() => {
    const nextPrompt = typeof defaultPrompt === "string" ? defaultPrompt : "";
    const shouldHydrate =
      nextPrompt.trim().length > 0 &&
      !defaultPromptJson &&
      !promptText.trim() &&
      !editorHasText;
    if (!shouldHydrate) return;
    setPromptText(nextPrompt);
    setEditorHasText(true);
    setEditorContentRevision((revision) => revision + 1);
  }, [defaultPrompt, defaultPromptJson, editorHasText, promptText]);
  const formDisabled = isDraftSubmitFormDisabled(modelsLoading, isPreparing);
  const maxCount = Math.max(
    1,
    Math.min(4, MAX_IMAGES_PER_NODE - currentImageCount),
  );
  const paramsSummary = reactExports.useMemo(
    () => summarizeI2IParams(t2, selectedModel, modelParams),
    [t2, selectedModel, modelParams],
  );
  const computedCreditCost = reactExports.useMemo(() => {
    if (creditCost != null) return creditCost;
    if (!pricingConfig || !selectedModel) return void 0;
    const quality = selectedModel.params.quality ? modelParams.quality : void 0;
    const perImage = calcImageCost(
      pricingConfig,
      resolvePricingId(selectedModel),
      modelParams.resolution,
      quality,
      attachmentState.referenceCounts.image,
    );
    if (perImage == null) return void 0;
    if (isMidjourney) return perImage;
    const effectiveCount = Math.max(1, Math.min(count2, maxCount));
    return perImage * effectiveCount;
  }, [
    creditCost,
    pricingConfig,
    selectedModel,
    modelParams.resolution,
    modelParams.quality,
    attachmentState.referenceCounts.image,
    count2,
    maxCount,
    isMidjourney,
  ]);
  const aspectRatioKey = reactExports.useMemo(() => {
    if (!selectedModel) return void 0;
    return ["aspect_ratio", "ratio"].find((k2) => selectedModel.params[k2]);
  }, [selectedModel]);
  const aspectRatioValue = aspectRatioKey
    ? modelParams[aspectRatioKey]
    : void 0;
  reactExports.useEffect(() => {
    onAspectRatioChange?.(aspectRatioValue);
  }, [aspectRatioValue, onAspectRatioChange]);
  reactExports.useEffect(() => {
    if (!listImageModels) return;
    setModelsLoading(true);
    listImageModels()
      .then((models) => {
        setImageModels(models);
        if (userPickedModelRef.current) return;
        if (models.length > 0) {
          const preselect = findModelByStoredId(models, defaultModelId);
          if (preselect) {
            setSelectedModelId(preselect.id);
            setModelParams(normalizeParamsForModel(preselect, defaultParams));
          } else {
            const lastUsedMatch = findModelByStoredId(models, lastUsedModelId);
            if (lastUsedMatch) {
              setSelectedModelId(lastUsedMatch.id);
              setModelParams(
                normalizeParamsForModel(lastUsedMatch, lastUsedParams),
              );
            } else {
              setSelectedModelId(models[0].id);
              setModelParams(getDefaultParams(models[0]));
            }
          }
        }
      })
      .catch(console.error)
      .finally(() => setModelsLoading(false));
  }, [
    listImageModels,
    defaultModelId,
    defaultParams,
    lastUsedModelId,
    lastUsedParams,
  ]);
  const handleModelChange = reactExports.useCallback(
    (modelId) => {
      userPickedModelRef.current = true;
      setSelectedModelId(modelId);
      const model = imageModels.find((m3) => m3.id === modelId);
      if (model)
        setModelParams(
          migrateParamsForModel(selectedModel, model, modelParams),
        );
    },
    [imageModels, selectedModel, modelParams],
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
  const atCapacity = currentImageCount >= MAX_IMAGES_PER_NODE;
  const isPromptOverLimit =
    !!selectedModel?.promptMaxLength &&
    promptLength > selectedModel.promptMaxLength;
  const canSubmit =
    accountSubmissionAllowed &&
    !!selectedModelId &&
    (editorHasText ||
      !!hasUpstreamText ||
      attachmentState.textPaths.length > 0) &&
    !isPreparing &&
    !hasLoadingSlots &&
    !atCapacity &&
    !isPromptOverLimit;
  const showDualButtons = !replaceNodeId && !!nodeId;
  const showCountChip = isMidjourney || showDualButtons || !!replaceNodeId;
  const countChipValue = isMidjourney
    ? 4
    : count2 > maxCount
      ? maxCount
      : count2;
  const countChipMaxCount = isMidjourney ? 4 : maxCount;
  const countChipMinCount = isMidjourney ? 4 : 1;
  const onSaveDraftRef = reactExports.useRef(onSaveDraft);
  onSaveDraftRef.current = onSaveDraft;
  const draftSnapshotRef = reactExports.useRef({
    promptText,
    selectedModelId,
    modelParams,
    imagePaths: attachmentState.imagePaths,
    textPaths: attachmentState.textPaths,
  });
  draftSnapshotRef.current = {
    promptText,
    selectedModelId,
    modelParams,
    imagePaths: attachmentState.imagePaths,
    textPaths: attachmentState.textPaths,
  };
  const modelLoadedRef = reactExports.useRef(false);
  modelLoadedRef.current = !modelsLoading && !!selectedModelId;
  const submittedRef = reactExports.useRef(false);
  const referenceNavigation = useReferenceAttachmentNavigation({
    nodeId: nodeId ?? replaceNodeId,
    mode: "i2i",
    editorRef,
    expanded,
    count: count2,
    snapshot: navigationSnapshot,
    defaults: {
      imagePaths: [...(defaultImagePaths ?? [])],
      videoPaths: [],
      audioPaths: [],
      textPaths: [...(defaultTextPaths ?? [])],
    },
    onSaveDraft,
    getDraft: () => ({
      prompt: promptText,
      modelId: selectedModelId,
      params: {
        ...modelParams,
      },
      imagePaths: [...attachmentState.imagePaths],
      textPaths: [...attachmentState.textPaths],
    }),
  });
  const navigationSavedRef = referenceNavigation.navigationSavedRef;
  const draftBaselineRef = reactExports.useRef(null);
  if (modelLoadedRef.current && draftBaselineRef.current === null) {
    draftBaselineRef.current = {
      prompt: promptText,
      modelId: selectedModelId,
      params: {
        ...modelParams,
      },
      imagePaths: [...attachmentState.imagePaths],
      textPaths: [...attachmentState.textPaths],
    };
  }
  reactExports.useEffect(
    () => () => {
      if (
        navigationSavedRef.current ||
        !shouldPersistPopoverDraftOnUnmount(
          submittedRef.current,
          modelLoadedRef.current,
        )
      )
        return;
      const editor = editorRef.current;
      const snapshot2 = draftSnapshotRef.current;
      const editorAlive = editor && !editor.isDestroyed;
      const livePrompt = editorAlive
        ? extractCanvasEditorText(editor)
        : snapshot2.promptText;
      const baseline = draftBaselineRef.current;
      if (baseline) {
        const isDirty = popoverDraftIsDirty(baseline, {
          prompt: livePrompt,
          modelId: snapshot2.selectedModelId,
          params: snapshot2.modelParams,
          imagePaths: snapshot2.imagePaths,
          textPaths: snapshot2.textPaths,
        });
        if (!isDirty) return;
      }
      onSaveDraftRef.current?.({
        prompt: livePrompt,
        promptJson: editorAlive ? JSON.stringify(editor.getJSON()) : void 0,
        modelId: snapshot2.selectedModelId,
        params: {
          ...snapshot2.modelParams,
        },
        imagePaths: snapshot2.imagePaths,
        textPaths: snapshot2.textPaths,
      });
    },
    [navigationSavedRef],
  );
  const handleRestoreOriginalDraft = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      if (!originalGenerationDraft) return;
      const nextPrompt = originalGenerationDraft.prompt ?? "";
      const targetModel = findModelByStoredId(
        imageModels,
        originalGenerationDraft.modelId,
      );
      const nextModelId =
        targetModel?.id ?? originalGenerationDraft.modelId ?? selectedModelId;
      const nextParams = targetModel
        ? normalizeParamsForModel(targetModel, originalGenerationDraft.params)
        : {
            ...(originalGenerationDraft.params ?? {}),
          };
      const nextImagePaths =
        originalGenerationDraft.imagePaths ?? attachmentState.imagePaths;
      const nextTextPaths =
        originalGenerationDraft.textPaths ?? attachmentState.textPaths;
      const nextPromptJson = originalGenerationDraft.promptJson;
      const nextDraft = {
        prompt: nextPrompt,
        ...(nextPromptJson
          ? {
              promptJson: nextPromptJson,
            }
          : {}),
        ...(nextModelId
          ? {
              modelId: nextModelId,
            }
          : {}),
        params: nextParams,
        imagePaths: nextImagePaths,
        textPaths: nextTextPaths,
      };
      userPickedModelRef.current = true;
      if (nextModelId) setSelectedModelId(nextModelId);
      setModelParams(nextParams);
      setPromptText(nextPrompt);
      setEditorHasText(nextPrompt.trim().length > 0);
      setPromptLength(countPromptCharacters(nextPrompt));
      setEditorContentOverride(buildPromptContent(nextPrompt, nextPromptJson));
      setEditorContentRevision((revision) => revision + 1);
      draftSnapshotRef.current = {
        promptText: nextPrompt,
        selectedModelId: nextModelId,
        modelParams: nextParams,
        imagePaths: nextImagePaths,
        textPaths: nextTextPaths,
      };
      draftBaselineRef.current = {
        prompt: nextPrompt,
        modelId: nextModelId,
        params: {
          ...nextParams,
        },
        imagePaths: [...nextImagePaths],
        textPaths: [...nextTextPaths],
      };
      onSaveDraftRef.current?.(nextDraft);
    },
    [
      originalGenerationDraft,
      imageModels,
      selectedModelId,
      attachmentState.imagePaths,
      attachmentState.textPaths,
      buildPromptContent,
    ],
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
      const trimmed = attachmentState.imagePaths.filter(Boolean);
      const editor = editorRef.current;
      const rawPrompt = editor ? extractCanvasEditorText(editor) : promptText;
      const authoredPrompt = editor
        ? extractCanvasEditorSubmitText(editor)
        : promptText;
      const chipPromptJson = editor ? JSON.stringify(editor.getJSON()) : void 0;
      const hasPersistentReferences =
        (editor ? collectTextChipPaths(editor).length > 0 : false) ||
        [...attachmentState.imagePaths, ...attachmentState.textPaths].some(
          isCanvasReferenceUri,
        );
      setPromptText(rawPrompt);
      const normalizedParams = selectedModel
        ? normalizeParamsForModel(selectedModel, modelParams)
        : modelParams;
      const { [IMAGE_MODE_KEY]: _imageModeOmitted, ...paramsForSubmit } =
        normalizedParams;
      setIsPreparing(true);
      let selectedReferenceText = "";
      try {
        selectedReferenceText = await loadReferenceTextContent(
          attachmentState.textPaths,
          loadTextContent,
          currentReferenceTextContent,
        );
      } catch {
        dedupedToast.error(
          t2(
            "canvas.reference.unavailable",
            "Reference unavailable. Please select again.",
          ),
        );
        return;
      } finally {
        setIsPreparing(false);
      }
      if (!selectedReferenceText && !authoredPrompt.trim()) {
        dedupedToast.error(
          t2("canvas.promptRequired", {
            defaultValue: "输入 prompt",
          }),
        );
        return;
      }
      const compiled = compileChipPromptForModel(authoredPrompt, {
        imagePaths: trimmed,
        videoPaths: [],
        audioPaths: [],
      });
      const modelPrompt = isMidjourney
        ? appendMidjourneyHdFlag(compiled.text, paramsForSubmit.clarity)
        : compiled.text;
      const promptForSubmit = composePromptWithReferenceText(
        selectedReferenceText,
        modelPrompt,
      );
      const finalPromptLength = countCompiledMediaPromptCharacters(
        modelPrompt,
        selectedReferenceText,
        {
          imagePaths: trimmed,
          videoPaths: [],
          audioPaths: [],
        },
      );
      if (
        selectedModel?.promptMaxLength &&
        finalPromptLength > selectedModel.promptMaxLength
      ) {
        setPromptLength(finalPromptLength);
        dedupedToast.error(
          t2("canvas.prompt.tooLong", {
            current: finalPromptLength,
            max: selectedModel.promptMaxLength,
          }),
        );
        return;
      }
      if (compiled.unresolved.length > 0) {
        dedupedToast.warning(
          `以下引用未在附件中找到，已保留原文: ${compiled.unresolved.map((u4) => `@${u4.path}`).join(", ")}`,
        );
      }
      const submittedDraft = {
        prompt: rawPrompt,
        promptJson: chipPromptJson,
        modelId: selectedModelId,
        params: paramsForSubmit,
        imagePaths: trimmed,
        textPaths: attachmentState.textPaths,
      };
      setIsPreparing(true);
      let accepted = false;
      try {
        accepted = await submitWithPersistedPopoverDraft({
          draft: submittedDraft,
          saveDraft: onSaveDraftRef.current,
          markSubmitted: () => {
            submittedRef.current = true;
          },
          submit: () => {
            if (
              !replaceId &&
              nodeId &&
              hasPersistentReferences &&
              chipPromptJson
            ) {
              attachDraftOnNextDerived(nodeId, "i2i", submittedDraft);
            }
            return onSubmit(
              promptForSubmit,
              selectedModelId,
              paramsForSubmit,
              trimmed,
              replaceId,
              // Midjourney returns 4 images from a single task, so submit one
              // upstream generation even though the UI displays fixed "×4".
              isMidjourney ? 1 : count2,
              // Preserve the display-form prompt instead of model-facing text.
              rawPrompt,
              attachmentState.textPaths,
            );
          },
        });
      } finally {
        setIsPreparing(false);
      }
      if (!accepted) return;
      if (selectedModel && saveLastUsedModelParams && !isMidjourney) {
        saveLastUsedModelParams(
          "i2i",
          selectedModelId,
          pickPersistableModelParams(paramsForSubmit, selectedModel),
        );
      }
      onClose();
    },
    [
      onSubmit,
      onClose,
      promptText,
      selectedModelId,
      selectedModel,
      modelParams,
      attachmentState.imagePaths,
      attachmentState.textPaths,
      currentReferenceTextContent,
      canSubmit,
      beforeAccountSubmission,
      checkReferencesBeforeSubmit,
      loadTextContent,
      attachDraftOnNextDerived,
      nodeId,
      count2,
      isMidjourney,
      saveLastUsedModelParams,
      t2,
    ],
  );
  const inGeneratingState = isGenerating || isPreparing || hasLoadingSlots;
  const handleConfirm = reactExports.useCallback(
    (e2) => {
      void doSubmit(e2, replaceNodeId);
    },
    [doSubmit, replaceNodeId],
  );
  const handleNewNode = reactExports.useCallback(
    (e2) => {
      void doSubmit(e2, void 0);
    },
    [doSubmit],
  );
  const handleReplace = reactExports.useCallback(
    (e2) => {
      void doSubmit(e2, nodeId);
    },
    [doSubmit, nodeId],
  );
  const handleAttachmentClick = reactExports.useCallback((item) => {
    if (item.kind === "file") return;
    editorRef.current?.commands.insertCanvasFileRef({
      path: item.path,
      filename: item.name,
      kind: item.kind,
    });
  }, []);
  const handleRemoveAttachment = reactExports.useCallback(
    (path2) => {
      attachmentState.removePath(path2, {
        tearEdge: true,
      });
      editorRef.current?.commands.removeCanvasFileRefsByPath(path2);
    },
    [attachmentState],
  );
  const replacement = useAttachmentReplacement(attachmentState, editorRef);
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
  const handleFileRefSwitchSelect = useMediaFileRefSwitch(attachmentState);
  const handleAtSelect = reactExports.useCallback(
    (meta2, assetId, sourceNodeId) => {
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
      const kind = rawKind;
      if (kind !== "image" && kind !== "video" && kind !== "audio") return;
      handleFileRefSwitchSelect(meta2, assetId, sourceNodeId);
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
      atPickerState.triggerRange,
      attachmentState.addPaths,
      handleFileRefSwitchSelect,
    ],
  );
  const handleEditorUpdate = reactExports.useCallback(
    (hasContent2, textLen) => {
      setEditorHasText(hasContent2);
      setPromptLength(textLen);
    },
    [],
  );
  const handleFileRefsAdded = reactExports.useCallback(
    (refs) => {
      const imageAdds = [];
      const videoAdds = [];
      const audioAdds = [];
      const textAdds = [];
      for (const ref of refs) {
        if (ref.kind === "image") imageAdds.push(ref.path);
        else if (ref.kind === "video") videoAdds.push(ref.path);
        else if (ref.kind === "audio") audioAdds.push(ref.path);
        else if (ref.kind === "text") textAdds.push(ref.path);
      }
      if (imageAdds.length > 0) attachmentState.addPaths(imageAdds, "image");
      if (videoAdds.length > 0) attachmentState.addPaths(videoAdds, "video");
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
    },
    [attachmentState],
  );
  const existingPathSet = reactExports.useMemo(
    () =>
      new Set([...attachmentState.imagePaths, ...attachmentState.textPaths]),
    [attachmentState.imagePaths, attachmentState.textPaths],
  );
  const atPickerKindFilter = attachmentState.modelSupportedKindsForAtPicker;
  const renderedParamElements = reactExports.useMemo(() => {
    if (!selectedModel) return null;
    const elements = [];
    const consumedKeys = new Set();
    for (const std of I2I_STANDARD_PARAMS) {
      const matchedKey = std.aliases.find((a2) => selectedModel.params[a2]);
      const def = matchedKey ? selectedModel.params[matchedKey] : void 0;
      const stdLabel = t2(std.i18nKey, {
        defaultValue: std.fallbackLabel,
      });
      if (matchedKey) consumedKeys.add(matchedKey);
      if (def && matchedKey) {
        const disabled2 = getDisabledOptions(
          matchedKey,
          modelParams,
          selectedModel.paramConstraints,
        );
        const fieldValue = modelParams[matchedKey] ?? def.default;
        const fieldOptions = def.options ?? [];
        const fieldOnChange = (v2) => handleParamChange(matchedKey, v2);
        if (std.id === "aspect_ratio") {
          elements.push(
            <div key={`std-${std.id}`}>
              <ParamSectionLabel>{stdLabel}</ParamSectionLabel>
              <AspectRatioGrid
                options={fieldOptions}
                value={fieldValue}
                onChange={fieldOnChange}
                disabled={formDisabled}
                disabledOptions={disabled2}
              />
            </div>,
          );
        } else if (std.id === "resolution") {
          elements.push(
            <div key={`std-${std.id}`}>
              <ParamSectionLabel>{stdLabel}</ParamSectionLabel>
              <ResolutionTabs
                options={fieldOptions}
                value={fieldValue}
                onChange={fieldOnChange}
                disabled={formDisabled}
                disabledOptions={disabled2}
              />
            </div>,
          );
        } else {
          elements.push(
            <ParamTabs
              key={`std-${std.id}`}
              label={stdLabel}
              options={fieldOptions}
              value={fieldValue}
              onChange={fieldOnChange}
              disabled={formDisabled}
              disabledOptions={disabled2}
            />,
          );
        }
      }
    }
    for (const [key2, def] of Object.entries(selectedModel.params)) {
      if (consumedKeys.has(key2)) continue;
      if (key2 === IMAGE_MODE_KEY) continue;
      if (def.type === "select" && (!def.options || def.options.length <= 1))
        continue;
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
            disabled={formDisabled}
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
            disabled={formDisabled}
          />,
        );
        continue;
      }
      const disabled2 = getDisabledOptions(
        key2,
        modelParams,
        selectedModel.paramConstraints,
      );
      const labelKey = paramI18nKey(key2, def.label);
      if (key2 === "quality" && def.type === "select") {
        elements.push(
          <ParamQualitySlider
            key={`${selectedModel.id}:${key2}`}
            label={
              labelKey
                ? t2(labelKey, {
                    defaultValue: paramLabelFallback(key2, def.label),
                  })
                : paramLabelFallback(key2, def.label)
            }
            options={def.options ?? []}
            value={modelParams[key2] ?? def.default}
            onChange={(v2) => handleParamChange(key2, v2)}
            disabled={formDisabled}
            disabledOptions={disabled2}
          />,
        );
        continue;
      }
      elements.push(
        <ParamTabs
          key={key2}
          label={
            labelKey
              ? t2(labelKey, {
                  defaultValue: paramLabelFallback(key2, def.label),
                })
              : paramLabelFallback(key2, def.label)
          }
          options={def.options ?? []}
          value={modelParams[key2] ?? def.default}
          onChange={(v2) => handleParamChange(key2, v2)}
          disabled={formDisabled}
          disabledOptions={disabled2}
          optionUnit={key2 === "duration" ? "seconds" : void 0}
        />,
      );
    }
    return elements;
  }, [selectedModel, modelParams, formDisabled, handleParamChange, t2]);
  const hasConfigurableParams = (renderedParamElements?.length ?? 0) > 0;
  const attachmentChipCount =
    attachmentState.items.length + (attachmentState.showAddButton ? 1 : 0);
  const extraHeight = attachmentExtraHeight(attachmentChipCount);
  const promptAreaHeightExtra = expanded ? 40 : 64;
  return (
    <PopoverShell
      promptLayout={true}
      onClose={onClose}
      expanded={expanded}
      extraHeight={extraHeight + promptAreaHeightExtra}
      gapOffset={popoverGapOffset}
    >
      <div className="flex items-start justify-between gap-3 shrink-0">
        <AttachmentBar
          items={attachmentState.items}
          disabled={formDisabled}
          showAddButton={attachmentState.showAddButton}
          onReplace={replacement.replaceAttachment}
          onRemove={handleRemoveAttachment}
          onAdd={() => {
            void attachmentState.openPicker();
          }}
          onItemClick={handleAttachmentClick}
          getLocateAction={referenceNavigation.getLocateAction}
        />
        <ExpandToggleButton
          expanded={expanded}
          onToggle={() => setExpanded((v2) => !v2)}
        />
      </div>
      <div className="flex-1 min-h-0">
        <RichPromptInput
          key={editorContentRevision}
          initialContent={editorContentOverride ?? initialEditorContent}
          editorRef={editorRef}
          onEditorReady={referenceNavigation.onEditorReady}
          disabled={formDisabled}
          placeholder=""
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
          resolveCharacterCount={(_serializedPrompt, countedText) =>
            countPromptCharacters(
              composePromptWithReferenceText(
                currentReferenceTextContent,
                countedText,
              ),
            )
          }
          resolveFileUrl={resolveFileUrl}
          fileRefSwitchConfig={
            formDisabled
              ? void 0
              : {
                  kindFilter: atPickerKindFilter,
                  existingPaths: existingPathSet,
                  excludeAssetIds: selfAssetIds,
                  constraints: attachmentState.pickerConstraints,
                  onSelectAsset: handleFileRefSwitchSelect,
                }
          }
          onFileRefsAdded={handleFileRefsAdded}
          onDirectReferencesRemoved={(paths) => {
            for (const path2 of paths) attachmentState.removePath(path2);
          }}
          maxLength={selectedModel?.promptMaxLength}
          emptyStateAction={({ openAtPicker }) => (
            <PromptPlaceholder
              description={t2("canvas.promptDescribe", {
                defaultValue: "Describe anything you want to generate",
              })}
              atPrefix={t2("canvas.promptAtPrefix", {
                defaultValue: ", click ",
              })}
              atSuffix={t2("canvas.promptAtSuffix", {
                defaultValue: " to add reference content.",
              })}
              onAtClick={openAtPicker}
            />
          )}
        />
      </div>
      {atPickerState.open && atPickerState.rect && (
        <MentionPickerPopover
          query={atPickerState.query}
          anchorRect={atPickerState.rect}
          getAnchorRect={atPickerState.getRect ?? void 0}
          kindFilter={atPickerKindFilter}
          existingPaths={existingPathSet}
          excludeAssetIds={selfAssetIds}
          constraints={attachmentState.pickerConstraints}
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
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <ModelChip
            models={imageModels}
            selectedModelId={selectedModelId}
            onChange={handleModelChange}
            loading={modelsLoading}
            disabled={formDisabled}
            onPromotionClick={buildPromotionClickHandler(onPromotionToast)}
          />
          {hasConfigurableParams && (
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
                disabled={formDisabled || !selectedModel}
              />
            </>
          )}
          {showCountChip && (
            <>
              <span
                aria-hidden={true}
                className="w-px h-3 bg-foreground/15 shrink-0"
              />
              <CountChip
                value={countChipValue}
                maxCount={countChipMaxCount}
                minCount={countChipMinCount}
                onChange={setCount}
                disabled={formDisabled || isMidjourney}
              />
            </>
          )}
          {originalGenerationDraft && (
            <>
              <span
                aria-hidden={true}
                className="w-px h-3 bg-foreground/15 shrink-0"
              />
              <Tooltip
                content={t2("canvas.popover.restoreOriginalDraft")}
                side="top"
              >
                <button
                  type="button"
                  data-action-ui-id="popover.restore-original-draft"
                  aria-label={t2("canvas.popover.restoreOriginalDraft")}
                  onClick={handleRestoreOriginalDraft}
                  disabled={formDisabled}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--canvas-controls-text-muted)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] disabled:cursor-default disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-border)]"
                >
                  <FileClock size={16} strokeWidth={1} />
                </button>
              </Tooltip>
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
              newNodeLabel={t2("canvas.generateNewNode")}
              replaceLabel={t2("canvas.addToCurrentNode", "替换节点")}
              onNewNode={handleNewNode}
              onReplace={handleReplace}
            />
          ) : (
            <SubmitButton
              submitting={false}
              canSubmit={canSubmit}
              creditCost={computedCreditCost}
              onClick={handleConfirm}
              title={
                currentImageCount > 0
                  ? t2("canvas.addToCurrentNode")
                  : t2("canvas.generate")
              }
            />
          )}
        </div>
        {paramsOpen && selectedModel && hasConfigurableParams && (
          <ParamsPopup
            anchorRef={paramsAnchorRef}
            onClose={() => setParamsOpen(false)}
          >
            {renderedParamElements}
          </ParamsPopup>
        )}
      </div>
    </PopoverShell>
  );
}
