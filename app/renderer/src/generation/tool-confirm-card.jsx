// tool-confirm-card.jsx
import {
  acceptForMediaKind,
  batchPageCountForArgs,
  CATEGORY_ICON,
  comfyUiDraftParameters,
  comfyUiInputBindings,
  comfyUiRunInputValues,
  getParamLabel,
  INTERNAL_KEYS,
  isComfyUiPromptParameter,
  isInheritedSeedance25Param,
  isProtectedComfyUiModelParameter,
  isVendorParamsObject,
  LOCKED_COMFYUI_DRAFT_VALUE,
  mediaItemId,
  mediaKindForKey,
  mediaValues,
  mergeComfyUiInputValues,
  MODEL_NAME_KEYS,
  resolveTaskCategory,
  stringifyParamValue,
  ToolConfirmEditsContext,
  updateIndexedMediaValue,
  uploadedRelativePath,
  valueAtBatchPage,
  VENDOR_PARAM_KEYS,
  withMiniMaxH3ParamHints,
} from "./domestic-param-labels.jsx";
import { API_PATHS } from "../infra/workspace-gateway.js";
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Loader2 } from "../media-editing/lucide-icon-wraps.js";
import { CompositedSvg } from "../media-editing/icon-compositing.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  Icon,
  useComfyUiDownloadProgress,
} from "../vendor-inline/vscode-base/graph.jsx";
import { isComfyUiModelUnavailable } from "../vendor-inline/vscode-base/linked-list.js";
import {
  BatchPager,
  EditablePromptBlock,
  parseParamValueLikeOriginal,
  ReferenceMediaStrip,
} from "./reference-media-strip.jsx";
import { EditableParamChip } from "./editable-param-chip.jsx";
import { ParamField } from "./param-field.jsx";
import { useResolveMediaUrl } from "../workspace/tool-label-definitions.js";
import { Clock } from "../media-editing/package.jsx";
import { useMentionModels } from "./use-mention-models.jsx";
import { useGatewayFetch } from "./use-model-catalog-scope-key.js";
import { useMediaModels } from "./normalize-model-info.js";
import { mergeTailwindClasses as cn } from "../infra/dialog-content.jsx";
import { homeService } from "../workspace/home-service.jsx";
import {
  redactForCurrentRegion,
  resolveModelNameForCurrentRegion,
} from "./replace-configured-model-names-for-current-region.js";
import {
  IMAGE_DISPATCHER_TOOL,
  isHiddenVideoGenerationMode,
  registryMediaTypeForCategory,
  resolveDispatcherSeriesLabel,
  VIDEO_DISPATCHER_TOOL,
  VIDEO_QUALITY_VALUE_DISPLAY_MAP,
} from "../chat/use-tool-confirm-settlement.js";
function ToolConfirmBranchIcon() {
  return (
    <CompositedSvg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-current"
    >
      <path d="M10 0V10C10 11.1046 10.8954 12 12 12H22" stroke="currentColor" />
    </CompositedSvg>
  );
}
function useToolConfirmEdits() {
  return reactExports.useContext(ToolConfirmEditsContext);
}
function isInternalKey(key) {
  return key.startsWith("_") || INTERNAL_KEYS.has(key);
}
const PROMPT_KEYS = new Set([
  "prompt",
  "prompts",
  "text",
  "texts",
  "lyrics",
  "positive_prompt",
  "negative_prompt",
]);
const TIMELINE_VISIBLE_TAG_KEYS = new Set([
  "model_name",
  "model",
  "model_id",
  "aspect_ratio",
  "aspect_ratios",
  "duration",
  "durations",
  "resolution",
  // Capability dispatcher knobs (live under vendor_params; flattened
  // onto top-level visibleKeys below). Only the few that are useful
  // user-facing signals are surfaced — audio toggles (sound /
  // generate_audio / sound) and multi-shot kling
  // controls intentionally stay in the PM-advanced bucket.
  "mode",
  // TTS signal fields for hub_generate_audio_speech.
  // voice_id / voice_ids intentionally NOT here yet — follow-up MR will
  // wire dynamic enum hints (ParamEnumPopover). speed / emotion and their
  // batch forms are simple scalars, surfaced as chips for parity with
  // the timeline media card.
  "speed",
  "speeds",
  "emotion",
  "emotions",
  // Editing signal fields for hub_merge_videos.
  // PM-decided "advanced" knobs that only matter in edge cases
  // (target_width / target_height when scale_mode === 'custom') stay in
  // INTERNAL_KEYS. scale_mode is the user-meaningful choice the timeline
  // already shows, so the inline confirm card surfaces it too.
  "scale_mode",
  // ComfyUI one-run overrides.
  "seed",
  "steps",
  "cfg",
  "sampler_name",
  "scheduler",
  "denoise",
]);
const COMFYUI_RUN_TOOL = "hub_run_comfyui_workflow";
const COMFYUI_DRAFT_EDIT_TOOL = "hub_edit_comfyui_workflow";
function comfyUiReviewMode(value) {
  return value === "detailed" ? "detailed" : "summary";
}
function comfyUiInputValueKey(entry) {
  return `${entry.node_id}:${entry.parameter}`;
}
function isLockedComfyUiDraftParameter(entry) {
  return (
    typeof entry.value === "string" &&
    entry.value.trim().toLowerCase() === LOCKED_COMFYUI_DRAFT_VALUE
  );
}
const COMFYUI_OVERRIDE_KEYS = new Set([
  "positive_prompt",
  "negative_prompt",
  "seed",
  "steps",
  "cfg",
  "sampler_name",
  "scheduler",
  "denoise",
]);
function asComfyUiPreflightResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid ComfyUI preflight response");
  }
  const response = value;
  if (
    typeof response.ready !== "boolean" ||
    typeof response.workflow_id !== "string" ||
    typeof response.workflow_title !== "string" ||
    typeof response.source_sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(response.source_sha256) ||
    !Array.isArray(response.issues) ||
    !Array.isArray(response.model_dependencies) ||
    !Array.isArray(response.input_values)
  ) {
    throw new Error("Invalid ComfyUI preflight response");
  }
  return response;
}
function asComfyUiDraftParametersResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid ComfyUI Draft parameter response");
  }
  const response = value;
  if (
    typeof response.workflow_id !== "string" ||
    typeof response.workflow_title !== "string" ||
    typeof response.source_sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(response.source_sha256) ||
    !Array.isArray(response.draft_parameters)
  ) {
    throw new Error("Invalid ComfyUI Draft parameter response");
  }
  return {
    ...response,
    draft_parameters: comfyUiDraftParameters(response.draft_parameters),
  };
}
function comfyUiRepairOperations(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const operation = item;
    return operation.type === "set_node_parameter" &&
      typeof operation.node_id === "string" &&
      typeof operation.parameter === "string"
      ? [operation]
      : [];
  });
}
function comfyUiStructuralEditOperations(value) {
  if (!Array.isArray(value)) return [];
  const structuralTypes = new Set([
    "add_node",
    "remove_node",
    "connect",
    "disconnect",
  ]);
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const operation = item;
    return typeof operation.type === "string" &&
      structuralTypes.has(operation.type)
      ? [operation]
      : [];
  });
}
function sanitizeComfyUiRunArgs(args) {
  if (!Array.isArray(args.input_values)) return args;
  return {
    ...args,
    input_values: comfyUiRunInputValues(args.input_values),
  };
}
function comfyUiInputMediaKind(entry) {
  if (entry.media_kind) return entry.media_kind;
  const parameter = entry.parameter.toLowerCase();
  if (/^image(?:_\d+)?$/.test(parameter)) return "image";
  if (/^audio(?:_\d+)?$/.test(parameter)) return "audio";
  if (/^video(?:_\d+)?$/.test(parameter)) return "video";
  return void 0;
}
function getComfyUiInputLabel(parameter) {
  return isComfyUiPromptParameter(parameter)
    ? getParamLabel("text")
    : getParamLabel(parameter);
}
export function ToolConfirmCard({
  message: cardMessage,
  onSend,
  embedded = false,
}) {
  const { t: translate } = useTranslation();
  const gatewayFetch = useGatewayFetch();
  const resolveUrl = useResolveMediaUrl();
  const data = cardMessage.toolConfirmData;
  const requestId = cardMessage.requestId;
  const originalArgs = reactExports.useMemo(() => data?.args ?? {}, [data]);
  const unionParamHints = data?.paramHints;
  const vendorParamHints = data?.vendorParamHints;
  const liftedEdits = useToolConfirmEdits();
  const submitting = Boolean(
    requestId && liftedEdits?.submittingIds?.has(requestId),
  );
  const [localArgs, setLocalArgs] = reactExports.useState(originalArgs);
  const editedArgs =
    liftedEdits && requestId
      ? (liftedEdits.edits[requestId] ?? originalArgs)
      : (localArgs ?? originalArgs);
  const editedArgsRef = reactExports.useRef(editedArgs);
  editedArgsRef.current = editedArgs;
  const paramHints = reactExports.useMemo(() => {
    const vendor =
      typeof editedArgs.vendor === "string" ? editedArgs.vendor : void 0;
    const perVendor = vendor ? vendorParamHints?.[vendor] : void 0;
    const hints = perVendor
      ? {
          ...unionParamHints,
          ...perVendor,
        }
      : unionParamHints;
    return withMiniMaxH3ParamHints(editedArgs, hints);
  }, [unionParamHints, vendorParamHints, editedArgs]);
  const [batchPageIndex, setBatchPageIndex] = reactExports.useState(0);
  const [uploadingMediaId, setUploadingMediaId] = reactExports.useState(null);
  const [mediaInputAccept, setMediaInputAccept] = reactExports.useState(void 0);
  const mediaFileInputRef = reactExports.useRef(null);
  const pendingMediaPickRef = reactExports.useRef(null);
  const [comfyPreflight, setComfyPreflight] = reactExports.useState(null);
  const [comfyPreflightLoading, setComfyPreflightLoading] =
    reactExports.useState(false);
  const [comfyPreflightError, setComfyPreflightError] =
    reactExports.useState(null);
  const [comfyPreflightRevision, setComfyPreflightRevision] =
    reactExports.useState(0);
  const [comfyDraftMetadata, setComfyDraftMetadata] =
    reactExports.useState(null);
  const [comfyDraftLoading, setComfyDraftLoading] =
    reactExports.useState(false);
  const [comfyDraftError, setComfyDraftError] = reactExports.useState(null);
  const [comfyDraftRevision, setComfyDraftRevision] = reactExports.useState(0);
  const [comfyInputUploading, setComfyInputUploading] =
    reactExports.useState(null);
  const [comfyDownloadTaskIds, setComfyDownloadTaskIds] = reactExports.useState(
    {},
  );
  const [comfyDraftEdits, setComfyDraftEdits] = reactExports.useState({});
  const [comfyDraftInputBindings, setComfyDraftInputBindings] =
    reactExports.useState([]);
  const comfyInputRef = reactExports.useRef(null);
  const pendingComfyInputRef = reactExports.useRef(null);
  const taskCategory = reactExports.useMemo(
    () => resolveTaskCategory(data?.tool ?? ""),
    [data],
  );
  const isComfyUiRun = data?.tool === COMFYUI_RUN_TOOL;
  const isComfyUiDraftEdit = data?.tool === COMFYUI_DRAFT_EDIT_TOOL;
  const reviewMode = comfyUiReviewMode(editedArgs.review_mode);
  const { tasks: comfyDownloadTasks } = useComfyUiDownloadProgress();
  const repairOperations = reactExports.useMemo(
    () => comfyUiRepairOperations(editedArgs.repair_operations),
    [editedArgs.repair_operations],
  );
  const explicitComfyInputValues = reactExports.useMemo(
    () => comfyUiRunInputValues(editedArgs.input_values),
    [editedArgs.input_values],
  );
  const hasComfyUiInputBindings = reactExports.useMemo(
    () => comfyUiInputBindings(editedArgs.input_bindings).length > 0,
    [editedArgs.input_bindings],
  );
  const missingComfyInputKeys = reactExports.useMemo(
    () =>
      new Set(
        (comfyPreflight?.issues ?? [])
          .filter((issue) => issue.type === "missing_input")
          .map((issue) => `${issue.node_id}:${issue.parameter}`),
      ),
    [comfyPreflight?.issues],
  );
  const comfyInputValues = reactExports.useMemo(
    () =>
      mergeComfyUiInputValues(
        comfyPreflight?.input_values ?? [],
        explicitComfyInputValues,
      )
        .filter(
          (entry) =>
            !isProtectedComfyUiModelParameter(entry.parameter) &&
            !missingComfyInputKeys.has(`${entry.node_id}:${entry.parameter}`),
        )
        .sort(
          (left, right) =>
            Number(isComfyUiPromptParameter(right.parameter)) -
            Number(isComfyUiPromptParameter(left.parameter)),
        ),
    [
      comfyPreflight?.input_values,
      explicitComfyInputValues,
      missingComfyInputKeys,
    ],
  );
  const displayedComfyInputValues = reactExports.useMemo(() => {
    if (reviewMode === "detailed") return comfyInputValues;
    const explicitKeys = new Set(
      explicitComfyInputValues.map(comfyUiInputValueKey),
    );
    return comfyInputValues.filter((entry) =>
      explicitKeys.has(comfyUiInputValueKey(entry)),
    );
  }, [comfyInputValues, explicitComfyInputValues, reviewMode]);
  const shouldConfirmComfyUiPrompt =
    hasComfyUiInputBindings &&
    comfyInputValues.some((entry) => isComfyUiPromptParameter(entry.parameter));
  const comfyDraftParameters = comfyDraftMetadata?.draft_parameters ?? [];
  const comfyDraftStructuralOperations = reactExports.useMemo(
    () => comfyUiStructuralEditOperations(editedArgs.operations),
    [editedArgs.operations],
  );
  const comfyDraftOperations = reactExports.useMemo(
    () => [
      ...comfyDraftStructuralOperations,
      ...comfyDraftParameters.flatMap((entry) => {
        if (isLockedComfyUiDraftParameter(entry)) return [];
        const key = comfyUiInputValueKey(entry);
        if (!(key in comfyDraftEdits)) return [];
        return [
          {
            type: "set_node_parameter",
            node_id: entry.node_id,
            parameter: entry.parameter,
            value: comfyDraftEdits[key],
          },
        ];
      }),
    ],
    [comfyDraftEdits, comfyDraftParameters, comfyDraftStructuralOperations],
  );
  const comfyDraftModifiedArgs = reactExports.useMemo(() => {
    if (!comfyDraftMetadata?.source_sha256) return void 0;
    return {
      ...Object.fromEntries(
        Object.entries(editedArgs).filter(
          ([key]) =>
            key !== "operations" && key !== "expected_source_sha256",
        ),
      ),
      expected_source_sha256: comfyDraftMetadata.source_sha256,
      operations: comfyDraftOperations,
      ...(comfyDraftInputBindings.length
        ? {
            input_bindings: comfyDraftInputBindings,
          }
        : {}),
    };
  }, [
    comfyDraftInputBindings,
    comfyDraftMetadata?.source_sha256,
    comfyDraftOperations,
    editedArgs,
  ]);
  reactExports.useEffect(() => {
    if (!isComfyUiRun || !requestId || cardMessage.expired) {
      setComfyPreflight(null);
      setComfyPreflightError(null);
      return;
    }
    const controller = new AbortController();
    setComfyPreflightLoading(true);
    setComfyPreflightError(null);
    const workflowId =
      typeof editedArgs.workflow_id === "string" ? editedArgs.workflow_id : "";
    const sourceNodeId =
      typeof editedArgs.source_node_id === "string"
        ? editedArgs.source_node_id
        : "";
    void gatewayFetch(API_PATHS.comfyUiWorkflowPreflight, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(workflowId
          ? {
              workflow_id: workflowId,
            }
          : {}),
        ...(sourceNodeId
          ? {
              source_node_id: sourceNodeId,
            }
          : {}),
        ...(isComfyUiRun && repairOperations.length
          ? {
              repair_operations: repairOperations,
            }
          : {}),
        ...(isComfyUiRun && explicitComfyInputValues.length
          ? {
              input_values: explicitComfyInputValues,
            }
          : {}),
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const value = await response.json().catch(() => void 0);
        if (!response.ok) {
          const reason =
            value &&
            typeof value === "object" &&
            typeof value.message === "string"
              ? value.message
              : `HTTP ${response.status}`;
          throw new Error(reason);
        }
        setComfyPreflight(asComfyUiPreflightResponse(value));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setComfyPreflight(null);
        setComfyPreflightError(
          error instanceof Error ? error.message : String(error),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setComfyPreflightLoading(false);
      });
    return () => controller.abort();
  }, [
    editedArgs.source_node_id,
    editedArgs.workflow_id,
    gatewayFetch,
    isComfyUiRun,
    cardMessage.expired,
    requestId,
    comfyPreflightRevision,
    explicitComfyInputValues,
    repairOperations,
  ]);
  reactExports.useEffect(() => {
    if (!isComfyUiDraftEdit || !requestId || cardMessage.expired) {
      setComfyDraftMetadata(null);
      setComfyDraftError(null);
      return;
    }
    const controller = new AbortController();
    setComfyDraftLoading(true);
    setComfyDraftError(null);
    const workflowId =
      typeof editedArgs.workflow_id === "string" ? editedArgs.workflow_id : "";
    const sourceNodeId =
      typeof editedArgs.source_node_id === "string"
        ? editedArgs.source_node_id
        : "";
    void gatewayFetch(API_PATHS.comfyUiWorkflowDraftParameters, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(workflowId
          ? {
              workflow_id: workflowId,
            }
          : {}),
        ...(sourceNodeId
          ? {
              source_node_id: sourceNodeId,
            }
          : {}),
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const value = await response.json().catch(() => void 0);
        if (!response.ok) {
          const reason =
            value &&
            typeof value === "object" &&
            typeof value.message === "string"
              ? value.message
              : `HTTP ${response.status}`;
          throw new Error(reason);
        }
        setComfyDraftMetadata(asComfyUiDraftParametersResponse(value));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setComfyDraftMetadata(null);
        setComfyDraftError(
          error instanceof Error ? error.message : String(error),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setComfyDraftLoading(false);
      });
    return () => controller.abort();
  }, [
    comfyDraftRevision,
    editedArgs.source_node_id,
    editedArgs.workflow_id,
    gatewayFetch,
    isComfyUiDraftEdit,
    cardMessage.expired,
    requestId,
  ]);
  reactExports.useEffect(() => {
    if (!liftedEdits || !requestId) return;
    const nextArgs = isComfyUiDraftEdit
      ? comfyDraftOperations.length > 0
        ? comfyDraftModifiedArgs
        : void 0
      : isComfyUiRun && comfyPreflight?.source_sha256
        ? {
            ...sanitizeComfyUiRunArgs(editedArgs),
            expected_source_sha256: comfyPreflight.source_sha256,
          }
        : void 0;
    if (!nextArgs) return;
    if (
      JSON.stringify(liftedEdits.edits[requestId]) === JSON.stringify(nextArgs)
    )
      return;
    liftedEdits.setEdit(requestId, nextArgs);
  }, [
    comfyDraftModifiedArgs,
    comfyDraftOperations.length,
    comfyPreflight?.source_sha256,
    editedArgs,
    isComfyUiDraftEdit,
    isComfyUiRun,
    liftedEdits,
    requestId,
  ]);
  const CategoryIcon = CATEGORY_ICON[taskCategory];
  const modelPreferType = reactExports.useMemo(
    () => registryMediaTypeForCategory(taskCategory),
    [taskCategory],
  );
  const { data: mentionModels } = useMentionModels();
  const modelDisplayMap = reactExports.useMemo(() => {
    const map = new Map();
    if (!mentionModels) return map;
    for (const mentionModel of mentionModels) {
      if (!mentionModel.display_name) continue;
      const displayName = redactForCurrentRegion(
        mentionModel.display_name ||
          resolveModelNameForCurrentRegion(mentionModel.model_name, modelPreferType),
      );
      const publicToken = mentionModel.mention_name ?? mentionModel.model_name;
      map.set(publicToken, displayName);
      map.set(mentionModel.model_name, displayName);
      map.set(mentionModel.id, displayName);
    }
    return map;
  }, [mentionModels, modelPreferType]);
  for (const key of MODEL_NAME_KEYS) {
    const value = editedArgs[key];
    if (typeof value === "string" && value) {
      modelDisplayMap.set(
        value,
        modelDisplayMap.get(value) ??
          resolveModelNameForCurrentRegion(value, modelPreferType),
      );
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item) {
          modelDisplayMap.set(
            item,
            modelDisplayMap.get(item) ??
              resolveModelNameForCurrentRegion(item, modelPreferType),
          );
        }
      }
    }
  }
  const { data: mediaModels } = useMediaModels();
  reactExports.useMemo(() => {
    const tool = data?.tool;
    if (!tool || !mediaModels) return void 0;
    if (tool === IMAGE_DISPATCHER_TOOL || tool === VIDEO_DISPATCHER_TOOL) {
      const vendor =
        typeof originalArgs.vendor === "string" ? originalArgs.vendor : void 0;
      return resolveDispatcherSeriesLabel(tool, vendor, mediaModels);
    }
    const match = mediaModels.find((mediaModel) => mediaModel.tool_names.includes(tool));
    return match?.display_name
      ? redactForCurrentRegion(match.display_name)
      : void 0;
  }, [data?.tool, originalArgs.vendor, mediaModels]);
  const visibleKeys = reactExports.useMemo(() => {
    const vendorParams = editedArgs.vendor_params;
    const hasVp = isVendorParamsObject(vendorParams);
    const overrides = editedArgs.overrides;
    const hasOverrides = isComfyUiRun && isVendorParamsObject(overrides);
    const isVisible = (key) =>
      !(isComfyUiRun && key === "review_mode") &&
      !isInheritedSeedance25Param(data?.tool, editedArgs, key) &&
      (!isInternalKey(key) ||
        (isComfyUiRun && COMFYUI_OVERRIDE_KEYS.has(key)));
    const topLevelKeys = Object.keys(editedArgs).filter(
      (key) =>
        isVisible(key) &&
        key !== "vendor_params" &&
        key !== "overrides" &&
        // A vendor knob that ALSO lives in vendor_params is rendered from the
        // nested copy (readArg reads vendor_params first). Drop the top-level
        // duplicate so it doesn't render twice — and so the dispatcher's
        // top-level `mode` (generation TYPE t2v/i2v) doesn't shadow
        // vendor_params.mode (kling quality std/pro/4k → resolution).
        !(hasVp && VENDOR_PARAM_KEYS.has(key) && key in vendorParams),
    );
    const nestedOverrides = hasOverrides
      ? Object.keys(overrides).filter(
          (key) => COMFYUI_OVERRIDE_KEYS.has(key) && isVisible(key),
        )
      : [];
    if (!hasVp) return [...topLevelKeys, ...nestedOverrides];
    const nested = Object.keys(vendorParams).filter(
      (key) =>
        VENDOR_PARAM_KEYS.has(key) &&
        !isInternalKey(key) &&
        !isInheritedSeedance25Param(data?.tool, editedArgs, key),
    );
    return [...topLevelKeys, ...nested, ...nestedOverrides];
  }, [data?.tool, editedArgs, isComfyUiRun]);
  const readArg = reactExports.useCallback(
    (source, key) => {
      if (isComfyUiRun && COMFYUI_OVERRIDE_KEYS.has(key)) {
        const overrides = source.overrides;
        if (isVendorParamsObject(overrides) && key in overrides)
          return overrides[key];
      }
      if (VENDOR_PARAM_KEYS.has(key)) {
        const vendorParams = source.vendor_params;
        if (isVendorParamsObject(vendorParams) && key in vendorParams) return vendorParams[key];
      }
      return source[key];
    },
    [isComfyUiRun],
  );
  const batchPageCount = reactExports.useMemo(
    () => batchPageCountForArgs(editedArgs, visibleKeys),
    [editedArgs, visibleKeys],
  );
  reactExports.useEffect(() => {
    setBatchPageIndex((index) =>
      Math.min(index, Math.max(0, batchPageCount - 1)),
    );
  }, [batchPageCount]);
  const promptKeys = reactExports.useMemo(
    () => visibleKeys.filter((key) => PROMPT_KEYS.has(key)),
    [visibleKeys],
  );
  const mediaKeys = reactExports.useMemo(
    () =>
      visibleKeys.filter(
        (key) =>
          !!mediaKindForKey(key) &&
          mediaValues(readArg(editedArgs, key)).length > 0,
      ),
    [visibleKeys, editedArgs, readArg],
  );
  const chipKeys = reactExports.useMemo(
    () =>
      visibleKeys.filter(
        (key) =>
          !PROMPT_KEYS.has(key) &&
          !mediaKindForKey(key) &&
          TIMELINE_VISIBLE_TAG_KEYS.has(key) &&
          // Skip the `mode` chip when the value is a hidden capability
          // generation type (t2v / i2v). The agent picks these based on
          // trigger context, not user-meaningful choices — the chip would
          // otherwise display the raw English value and clutter the card.
          // The dropdown options for `mode` are also filtered (see
          // ParamField) so users can't pick the hidden values either.
          !(
            key === "mode" &&
            isHiddenVideoGenerationMode(String(readArg(editedArgs, key) ?? ""))
          ),
      ),
    [visibleKeys, editedArgs, readArg],
  );
  const modeDisplayMap = reactExports.useMemo(() => {
    const map = new Map(VIDEO_QUALITY_VALUE_DISPLAY_MAP);
    map.set("first-last-frame", translate("chat.videoMode.firstLastFrame", "首尾帧"));
    map.set("multimodal", translate("chat.videoMode.omniReference", "全能参考"));
    map.set("omni", translate("chat.videoMode.omniReference", "全能参考"));
    map.set("video-edit", translate("chat.videoMode.videoEdit", "视频编辑"));
    map.set("video-extend", translate("chat.videoMode.videoExtend", "视频续写"));
    map.set("avatar", translate("chat.videoMode.avatar", "数字人"));
    return map;
  }, [translate]);
  const setArgValue = reactExports.useCallback(
    (key, value) => {
      const current = editedArgsRef.current;
      let next;
      if (
        isComfyUiRun &&
        COMFYUI_OVERRIDE_KEYS.has(key) &&
        isVendorParamsObject(current.overrides)
      ) {
        next = {
          ...current,
          overrides: {
            ...current.overrides,
            [key]: value,
          },
        };
      } else if (
        VENDOR_PARAM_KEYS.has(key) &&
        isVendorParamsObject(current.vendor_params) &&
        (key !== "mode" || Object.hasOwn(current.vendor_params, key))
      ) {
        next = {
          ...current,
          vendor_params: {
            ...current.vendor_params,
            [key]: value,
          },
        };
      } else {
        next = {
          ...current,
          [key]: value,
        };
      }
      if (liftedEdits && requestId) {
        liftedEdits.setEdit(requestId, next);
      } else {
        setLocalArgs(next);
      }
    },
    [isComfyUiRun, liftedEdits, requestId],
  );
  const updateArg = reactExports.useCallback(
    (key, value) => {
      const original = readArg(originalArgs, key);
      let parsed = value;
      if (typeof original === "number") {
        const numericValue = Number(value);
        if (Number.isFinite(numericValue)) parsed = numericValue;
      } else if (typeof original === "boolean") {
        parsed = value === "true";
      } else if (Array.isArray(original)) {
        try {
          parsed = JSON.parse(value);
        } catch {
          parsed = value;
        }
      }
      setArgValue(key, parsed);
    },
    [originalArgs, setArgValue, readArg],
  );
  const setComfyDraftParameterValue = reactExports.useCallback(
    (entry, value) => {
      if (isLockedComfyUiDraftParameter(entry)) return;
      const nextValue = parseParamValueLikeOriginal(entry.value, value);
      const key = comfyUiInputValueKey(entry);
      setComfyDraftEdits((current) => {
        if (Object.is(nextValue, entry.value)) {
          if (!(key in current)) return current;
          const next = {
            ...current,
          };
          delete next[key];
          return next;
        }
        return {
          ...current,
          [key]: nextValue,
        };
      });
    },
    [],
  );
  const setComfyImportedInput = reactExports.useCallback(
    (issue, filename, workspacePath) => {
      if (isComfyUiDraftEdit) {
        const parameter = comfyDraftParameters.find(
          (entry) =>
            entry.node_id === issue.node_id &&
            entry.parameter === issue.parameter,
        );
        if (parameter) {
          setComfyDraftParameterValue(parameter, filename);
          setComfyDraftInputBindings((current) => [
            ...current.filter(
              (binding) =>
                binding.node_id !== issue.node_id ||
                binding.parameter !== issue.parameter,
            ),
            {
              node_id: issue.node_id,
              parameter: issue.parameter,
              workspace_path: workspacePath,
            },
          ]);
        }
        return;
      }
      const currentArgs = editedArgsRef.current;
      const operations = comfyUiRepairOperations(
        currentArgs.repair_operations,
      ).filter(
        (operation) =>
          operation.node_id !== issue.node_id ||
          operation.parameter !== issue.parameter,
      );
      operations.push({
        type: "set_node_parameter",
        node_id: issue.node_id,
        parameter: issue.parameter,
        value: filename,
      });
      const bindings = comfyUiInputBindings(currentArgs.input_bindings).filter(
        (binding) =>
          binding.node_id !== issue.node_id ||
          binding.parameter !== issue.parameter,
      );
      bindings.push({
        node_id: issue.node_id,
        parameter: issue.parameter,
        workspace_path: workspacePath,
      });
      const nextArgs = {
        ...currentArgs,
        repair_operations: operations,
        input_bindings: bindings,
      };
      if (liftedEdits && requestId) {
        liftedEdits.setEdit(requestId, nextArgs);
      } else {
        setLocalArgs(nextArgs);
      }
    },
    [
      comfyDraftParameters,
      isComfyUiDraftEdit,
      liftedEdits,
      requestId,
      setComfyDraftParameterValue,
    ],
  );
  const setComfyInputValue = reactExports.useCallback(
    (entry, value) => {
      const current = structuredClone(explicitComfyInputValues);
      const key = comfyUiInputValueKey(entry);
      const index = current.findIndex(
        (candidate) => comfyUiInputValueKey(candidate) === key,
      );
      const next = {
        node_id: entry.node_id,
        parameter: entry.parameter,
        value: parseParamValueLikeOriginal(entry.value, value),
      };
      if (index >= 0) current[index] = next;
      else current.push(next);
      setArgValue("input_values", comfyUiRunInputValues(current));
    },
    [explicitComfyInputValues, setArgValue],
  );
  const handleComfyInputPick = reactExports.useCallback((issue) => {
    if (issue.type !== "missing_input") return;
    pendingComfyInputRef.current = issue;
    if (comfyInputRef.current) {
      comfyInputRef.current.accept = acceptForMediaKind(issue.media_kind) ?? "";
      comfyInputRef.current.click();
    }
  }, []);
  const handleComfyExistingInputPick = reactExports.useCallback((entry) => {
    const mediaKind = comfyUiInputMediaKind(entry);
    if (!mediaKind) return;
    pendingComfyInputRef.current = {
      type: "missing_input",
      node_id: entry.node_id,
      node_type: "",
      parameter: entry.parameter,
      media_kind: mediaKind,
      ...(typeof entry.value === "string" && entry.value
        ? {
            current_value: entry.value,
          }
        : {}),
    };
    if (comfyInputRef.current) {
      comfyInputRef.current.accept = acceptForMediaKind(mediaKind) ?? "";
      comfyInputRef.current.click();
    }
  }, []);
  const handleComfyInputChange = reactExports.useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      const issue = pendingComfyInputRef.current;
      pendingComfyInputRef.current = null;
      if (!file || issue?.type !== "missing_input") return;
      const issueKey = `${issue.node_id}:${issue.parameter}`;
      setComfyInputUploading(issueKey);
      try {
        const form = new FormData();
        form.append("file", file, file.name);
        form.append("media_kind", issue.media_kind);
        const response = await gatewayFetch(API_PATHS.comfyUiInputImport, {
          method: "POST",
          body: form,
        });
        const value = await response.json().catch(() => void 0);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const imported = value;
        if (
          typeof imported.filename !== "string" ||
          imported.media_kind !== issue.media_kind ||
          typeof imported.workspace_path !== "string"
        ) {
          throw new Error("Invalid ComfyUI input import response");
        }
        setComfyImportedInput(
          issue,
          imported.filename,
          imported.workspace_path,
        );
      } catch (error) {
        dedupedToast.error(
          translate(
            "chat.toolConfirm.comfyInputImportFailed",
            "导入 ComfyUI 输入失败：{{reason}}",
            {
              reason: error instanceof Error ? error.message : String(error),
            },
          ),
        );
      } finally {
        setComfyInputUploading(null);
      }
    },
    [gatewayFetch, setComfyImportedInput, translate],
  );
  const handleComfyModelDownload = reactExports.useCallback(
    async (issue) => {
      if (
        issue.type !== "missing_model" ||
        !issue.dependency?.url ||
        !comfyPreflight
      )
        return;
      const issueKey = `${issue.node_id}:${issue.parameter}`;
      try {
        const task = await homeService.comfyUiModelDownload.prepareWorkflow({
          workflowId: comfyPreflight.workflow_id,
          workflowTitle: comfyPreflight.workflow_title,
          models: [issue.dependency],
        });
        setComfyDownloadTaskIds((current) => ({
          ...current,
          [issueKey]: task.id,
        }));
      } catch (error) {
        dedupedToast.error(
          translate(
            "chat.toolConfirm.comfyModelDownloadFailed",
            "模型下载失败：{{reason}}",
            {
              reason: error instanceof Error ? error.message : String(error),
            },
          ),
        );
      }
    },
    [comfyPreflight, translate],
  );
  const handleMediaPick = reactExports.useCallback((paramKey, index, kind) => {
    pendingMediaPickRef.current = {
      paramKey,
      index,
      kind,
    };
    setMediaInputAccept(acceptForMediaKind(kind));
    window.setTimeout(() => mediaFileInputRef.current?.click(), 0);
  }, []);
  const handleMediaFileChange = reactExports.useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      const pending = pendingMediaPickRef.current;
      pendingMediaPickRef.current = null;
      if (!file || !pending) return;
      const id = mediaItemId(pending.paramKey, pending.index);
      setUploadingMediaId(id);
      try {
        const form = new FormData();
        form.append("file", file, file.name);
        const response = await gatewayFetch(API_PATHS.upload, {
          method: "POST",
          body: form,
        });
        const nextPath = uploadedRelativePath(await response.json());
        if (!nextPath) throw new Error(translate("chat.uploadError.missingPath"));
        const current = editedArgsRef.current[pending.paramKey];
        setArgValue(
          pending.paramKey,
          updateIndexedMediaValue(current, pending.index, nextPath),
        );
      } catch (err) {
        const reason =
          err instanceof Error
            ? err.message
            : translate("chat.uploadError.generic", "Upload failed");
        dedupedToast.error(
          translate("chat.uploadFailed", "Failed to upload {{name}}: {{reason}}", {
            name: file.name,
            reason,
          }),
        );
      } finally {
        setUploadingMediaId(null);
      }
    },
    [gatewayFetch, setArgValue, translate],
  );
  const hasChanges = reactExports.useMemo(() => {
    if (isComfyUiDraftEdit && Object.keys(comfyDraftEdits).length > 0)
      return true;
    for (const key of visibleKeys) {
      if (
        JSON.stringify(readArg(editedArgs, key)) !==
        JSON.stringify(readArg(originalArgs, key))
      )
        return true;
    }
    if (
      isComfyUiRun &&
      JSON.stringify(editedArgs.repair_operations) !==
        JSON.stringify(originalArgs.repair_operations)
    ) {
      return true;
    }
    if (
      isComfyUiRun &&
      JSON.stringify(editedArgs.input_values) !==
        JSON.stringify(originalArgs.input_values)
    ) {
      return true;
    }
    if (
      isComfyUiRun &&
      JSON.stringify(editedArgs.input_bindings) !==
        JSON.stringify(originalArgs.input_bindings)
    ) {
      return true;
    }
    return false;
  }, [
    comfyDraftEdits,
    editedArgs,
    isComfyUiDraftEdit,
    isComfyUiRun,
    originalArgs,
    visibleKeys,
    readArg,
  ]);
  const dispatch = reactExports.useCallback(
    (decision) => {
      if (!requestId || submitting) return;
      const sanitizedArgs = isComfyUiRun
        ? sanitizeComfyUiRunArgs(editedArgs)
        : isComfyUiDraftEdit
          ? Object.fromEntries(
              Object.entries(editedArgs).filter(
                ([key]) =>
                  key !== "operations" && key !== "expected_source_sha256",
              ),
            )
          : editedArgs;
      const modifiedArgs =
        isComfyUiDraftEdit && comfyDraftModifiedArgs
          ? comfyDraftModifiedArgs
          : isComfyUiRun && comfyPreflight?.source_sha256
            ? {
                ...sanitizedArgs,
                expected_source_sha256: comfyPreflight.source_sha256,
              }
            : sanitizedArgs;
      const shouldSendModifiedArgs =
        isComfyUiDraftEdit ||
        hasChanges ||
        (isComfyUiRun && Boolean(comfyPreflight?.source_sha256));
      const message = {
        type: "tool_confirm_reply",
        id: requestId,
        decision,
        ...(decision === "confirm" && shouldSendModifiedArgs
          ? {
              modified_args: modifiedArgs,
            }
          : {}),
      };
      onSend(message);
    },
    [
      requestId,
      onSend,
      hasChanges,
      editedArgs,
      isComfyUiRun,
      isComfyUiDraftEdit,
      comfyPreflight?.source_sha256,
      comfyDraftModifiedArgs,
      submitting,
    ],
  );
  const handleConfirm = reactExports.useCallback(
    () => dispatch("confirm"),
    [dispatch],
  );
  const handleReject = reactExports.useCallback(
    () => dispatch("reject"),
    [dispatch],
  );
  const isExpired = cardMessage.expired === true;
  const unresolvedComfyIssues = reactExports.useMemo(() => {
    if (!comfyPreflight) return [];
    return comfyPreflight.issues.filter((issue) => {
      const repair = repairOperations.find(
        (operation) =>
          operation.node_id === issue.node_id &&
          operation.parameter === issue.parameter,
      );
      if (repair && typeof repair.value === "string" && repair.value)
        return false;
      if (issue.type !== "missing_model") return true;
      const taskId =
        comfyDownloadTaskIds[`${issue.node_id}:${issue.parameter}`];
      const task = comfyDownloadTasks.find(
        (candidate) => candidate.id === taskId,
      );
      return !(
        task?.status === "completed" &&
        !isComfyUiModelUnavailable(task, issue.current_value)
      );
    });
  }, [
    comfyDownloadTaskIds,
    comfyDownloadTasks,
    comfyPreflight,
    repairOperations,
  ]);
  const comfyConfirmBlocked =
    (isComfyUiRun &&
      (!comfyPreflight ||
        comfyPreflightLoading ||
        Boolean(comfyPreflightError) ||
        unresolvedComfyIssues.length > 0)) ||
    (isComfyUiDraftEdit &&
      (!comfyDraftMetadata ||
        comfyDraftLoading ||
        Boolean(comfyDraftError) ||
        comfyDraftOperations.length === 0));
  reactExports.useEffect(() => {
    if (!liftedEdits || !requestId || (!isComfyUiRun && !isComfyUiDraftEdit))
      return;
    const isChecking = isComfyUiRun
      ? comfyPreflightLoading || !comfyPreflight
      : comfyDraftLoading || !comfyDraftMetadata;
    const state = isChecking
      ? "checking"
      : comfyConfirmBlocked
        ? "blocked"
        : "ready";
    liftedEdits.setApprovalState(requestId, state);
  }, [
    comfyConfirmBlocked,
    comfyDraftLoading,
    comfyDraftMetadata,
    comfyPreflight,
    comfyPreflightLoading,
    isComfyUiDraftEdit,
    isComfyUiRun,
    liftedEdits,
    requestId,
  ]);
  if (!requestId || !data) return null;
  const content = (
    <>
      {isExpired ? (
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon icon={Clock} size="xs" className="shrink-0" />
            {translate("chat.toolConfirm.expired", "Request timed out")}
          </span>
          <button
            type="button"
            data-action-ui-id="chat-tool-confirm-close"
            className="cursor-pointer rounded-md border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={handleReject}
          >
            {translate("chat.toolConfirm.close", "Close")}
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {isComfyUiRun && (
              <div className="rounded-sm border border-border bg-muted/30 p-2.5">
                <div className="mb-2 flex items-center justify-between gap-3 border-b border-border pb-2">
                  <span className="min-w-0 truncate text-body-12 font-medium text-foreground">
                    {comfyPreflight?.workflow_title ??
                      translate(
                        "chat.toolConfirm.comfyWorkflowFallback",
                        "ComfyUI 工作流",
                      )}
                  </span>
                  <span className="shrink-0 text-caption-11 text-muted-foreground">
                    {typeof editedArgs.count === "number"
                      ? editedArgs.count
                      : 1}{" "}
                    {translate("chat.toolConfirm.comfyRunCountUnit", "次")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-body-12 font-medium text-foreground">
                  {comfyPreflightLoading ? (
                    <Loader2
                      size={14}
                      className="animate-spin text-muted-foreground"
                    />
                  ) : (
                    <AlertTriangle
                      size={14}
                      className="text-muted-foreground"
                    />
                  )}
                  <span>
                    {comfyPreflightLoading
                      ? translate(
                          "chat.toolConfirm.comfyPreflightChecking",
                          "正在检查工作流输入和模型",
                        )
                      : comfyPreflight?.ready
                        ? translate(
                            "chat.toolConfirm.comfyPreflightReady",
                            "工作流已通过执行检查",
                          )
                        : translate(
                            "chat.toolConfirm.comfyPreflightNeedsRepair",
                            "执行前需要处理以下问题",
                          )}
                  </span>
                </div>
                {comfyPreflightError && (
                  <div className="mt-2 flex items-center justify-between gap-2 text-caption-11 text-muted-foreground">
                    <span className="min-w-0 break-words">
                      {comfyPreflightError}
                    </span>
                    <button
                      type="button"
                      data-action-ui-id="chat-tool-confirm-comfy-preflight-retry"
                      className="shrink-0 rounded-sm border border-border px-2 py-1 text-body-12 text-foreground hover:bg-muted"
                      onClick={() =>
                        setComfyPreflightRevision((value) => value + 1)
                      }
                    >
                      {translate("chat.toolConfirm.retry", "重试")}
                    </button>
                  </div>
                )}
                {!comfyPreflightLoading &&
                  comfyPreflight?.issues.map((issue) => {
                    const issueKey = `${issue.node_id}:${issue.parameter}`;
                    const repair = repairOperations.find(
                      (operation) =>
                        operation.node_id === issue.node_id &&
                        operation.parameter === issue.parameter,
                    );
                    const taskId = comfyDownloadTaskIds[issueKey];
                    const downloadTask = comfyDownloadTasks.find(
                      (task) => task.id === taskId,
                    );
                    return (
                      <div
                        key={`${issue.type}:${issueKey}`}
                        className="mt-2 flex items-start justify-between gap-3 border-t border-border pt-2"
                      >
                        <div className="min-w-0">
                          <div className="text-body-12 text-foreground">
                            {issue.type === "missing_input"
                              ? translate(
                                  "chat.toolConfirm.comfyMissingInput",
                                  "缺少{{kind}}输入",
                                  {
                                    kind:
                                      issue.media_kind === "image"
                                        ? translate("common.image", "图片")
                                        : issue.media_kind === "audio"
                                          ? translate("common.audio", "音频")
                                          : translate("common.video", "视频"),
                                  },
                                )
                              : translate(
                                  "chat.toolConfirm.comfyMissingModel",
                                  "模型不可用",
                                )}
                          </div>
                          <div className="mt-0.5 break-all text-caption-11 text-muted-foreground">
                            {issue.node_type}
                            {" · "}
                            {issue.parameter}
                            {issue.current_value
                              ? ` · ${issue.current_value}`
                              : ""}
                          </div>
                          {downloadTask && (
                            <div className="mt-1 text-caption-11 text-muted-foreground">
                              {downloadTask.status === "completed"
                                ? translate(
                                    "chat.toolConfirm.comfyDownloadCompleted",
                                    "模型已准备完成",
                                  )
                                : downloadTask.status === "failed"
                                  ? downloadTask.error
                                  : translate(
                                      "chat.toolConfirm.comfyDownloading",
                                      "正在准备模型",
                                    )}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {issue.type === "missing_input" ? (
                            <button
                              type="button"
                              data-action-ui-id={`chat-tool-confirm-comfy-input-${issueKey}`}
                              disabled={comfyInputUploading === issueKey}
                              className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-body-12 text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => handleComfyInputPick(issue)}
                            >
                              {comfyInputUploading === issueKey && (
                                <Loader2 size={13} className="animate-spin" />
                              )}
                              {repair
                                ? translate(
                                    "chat.toolConfirm.comfyReplaceInput",
                                    "重新选择",
                                  )
                                : translate(
                                    "chat.toolConfirm.comfySelectInput",
                                    "选择文件",
                                  )}
                            </button>
                          ) : (
                            issue.dependency?.url &&
                            downloadTask?.status !== "completed" && (
                              <button
                                type="button"
                                data-action-ui-id={`chat-tool-confirm-comfy-download-${issueKey}`}
                                disabled={
                                  downloadTask?.status === "queued" ||
                                  downloadTask?.status === "verifying" ||
                                  downloadTask?.status === "downloading"
                                }
                                className="rounded-sm border border-border px-2 py-1 text-body-12 text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={() =>
                                  void handleComfyModelDownload(issue)
                                }
                              >
                                {translate(
                                  "chat.toolConfirm.comfyDownloadModel",
                                  "下载缺失模型",
                                )}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                {!comfyPreflightLoading && shouldConfirmComfyUiPrompt && (
                  <div className="mt-2 border-t border-border pt-2 text-caption-11 text-muted-foreground">
                    {translate(
                      "chat.toolConfirm.comfyReferencePromptWarning",
                      "已更换参考素材，请确认提示词仍与新素材一致",
                    )}
                  </div>
                )}
              </div>
            )}
            {isComfyUiDraftEdit && (
              <div className="rounded-sm border border-border bg-muted/30 p-2.5">
                <div className="mb-2 flex items-center justify-between gap-3 border-b border-border pb-2">
                  <span className="min-w-0 truncate text-body-12 font-medium text-foreground">
                    {comfyDraftMetadata?.workflow_title ??
                      translate(
                        "chat.toolConfirm.comfyWorkflowFallback",
                        "ComfyUI 工作流",
                      )}
                  </span>
                  <span className="shrink-0 text-caption-11 text-muted-foreground">
                    {translate("chat.toolConfirm.comfyDraftBadge", "Workflow Draft")}
                  </span>
                </div>
                {comfyDraftLoading && (
                  <div className="flex items-center gap-1.5 text-body-12 text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" />
                    {translate(
                      "chat.toolConfirm.comfyDraftLoading",
                      "正在读取工作流参数",
                    )}
                  </div>
                )}
                {comfyDraftError && (
                  <div className="flex items-center justify-between gap-2 text-caption-11 text-muted-foreground">
                    <span className="min-w-0 break-words">
                      {comfyDraftError}
                    </span>
                    <button
                      type="button"
                      data-action-ui-id="chat-tool-confirm-comfy-draft-retry"
                      className="shrink-0 rounded-sm border border-border px-2 py-1 text-body-12 text-foreground hover:bg-muted"
                      onClick={() =>
                        setComfyDraftRevision((value) => value + 1)
                      }
                    >
                      {translate("chat.toolConfirm.retry", "重试")}
                    </button>
                  </div>
                )}
                {!comfyDraftLoading &&
                  !comfyDraftError &&
                  comfyDraftParameters.length === 0 && (
                    <div className="text-body-12 text-muted-foreground">
                      {translate(
                        "chat.toolConfirm.comfyDraftNoParameters",
                        "没有可编辑的工作流参数",
                      )}
                    </div>
                  )}
                {!comfyDraftLoading && comfyDraftParameters.length > 0 && (
                  <div
                    data-action-ui-id="chat-tool-confirm-comfy-draft-parameter-list"
                    className="divide-y divide-border rounded-sm border border-border bg-background"
                  >
                    {comfyDraftParameters.map((entry) => {
                      const key = comfyUiInputValueKey(entry);
                      const parameterLocked =
                        isLockedComfyUiDraftParameter(entry);
                      const currentValue =
                        key in comfyDraftEdits
                          ? comfyDraftEdits[key]
                          : entry.value;
                      const label =
                        entry.label === entry.parameter
                          ? getComfyUiInputLabel(entry.parameter)
                          : entry.label;
                      return (
                        <div
                          key={key}
                          className="grid gap-1 px-2.5 py-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:items-center sm:gap-3"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-body-12 font-medium text-foreground">
                              {label}
                            </div>
                            <div
                              title={`${entry.node_id}.${entry.parameter}`}
                              className="truncate text-caption-11 text-muted-foreground"
                            >
                              {entry.node_id}.{entry.parameter}
                            </div>
                          </div>
                          {entry.control === "media" && entry.media_kind ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 truncate text-body-12 text-muted-foreground">
                                {typeof currentValue === "string" &&
                                currentValue
                                  ? currentValue
                                  : translate(
                                      "chat.toolConfirm.comfyInputNotSelected",
                                      "未选择文件",
                                    )}
                              </span>
                              <button
                                type="button"
                                data-action-ui-id={`chat-tool-confirm-comfy-draft-media-${key}`}
                                disabled={
                                  parameterLocked ||
                                  comfyInputUploading === key
                                }
                                className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-border px-2 py-1 text-body-12 text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={() =>
                                  handleComfyExistingInputPick({
                                    ...entry,
                                    value: currentValue,
                                  })
                                }
                              >
                                {comfyInputUploading === key && (
                                  <Loader2 size={13} className="animate-spin" />
                                )}
                                {translate(
                                  "chat.toolConfirm.comfyReplaceExistingInput",
                                  "重新选择",
                                )}
                              </button>
                            </div>
                          ) : (
                            <ParamField
                              paramKey={entry.parameter}
                              value={stringifyParamValue(currentValue)}
                              originalValue={entry.value}
                              hint={
                                entry.control === "enum" && entry.values
                                  ? {
                                      type: "enum",
                                      values: entry.values,
                                    }
                                  : void 0
                              }
                              multiline={entry.control === "textarea"}
                              disabled={parameterLocked}
                              onChange={(value) =>
                                setComfyDraftParameterValue(entry, value)
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {promptKeys.map((key) => (
              <EditablePromptBlock
                key={key}
                paramKey={key}
                value={readArg(editedArgs, key)}
                pageIndex={batchPageCount > 1 ? batchPageIndex : void 0}
                onChange={(value) => updateArg(key, value)}
              />
            ))}
            {isComfyUiRun && displayedComfyInputValues.length > 0 && (
              <div
                data-action-ui-id="chat-tool-confirm-comfy-parameter-list"
                className="divide-y divide-border rounded-sm border border-border bg-muted/30"
              >
                {displayedComfyInputValues.map((entry) => (
                  <div
                    key={`${entry.node_id}:${entry.parameter}`}
                    className="grid gap-1 px-2.5 py-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:items-center sm:gap-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-body-12 font-medium text-foreground">
                        {getComfyUiInputLabel(entry.parameter)}
                      </div>
                      <div
                        title={`${entry.node_id}.${entry.parameter}`}
                        className="truncate text-caption-11 text-muted-foreground"
                      >
                        {entry.node_id}.{entry.parameter}
                      </div>
                    </div>
                    {comfyUiInputMediaKind(entry) ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-body-12 text-muted-foreground">
                          {typeof entry.value === "string" && entry.value
                            ? entry.value
                            : translate(
                                "chat.toolConfirm.comfyInputNotSelected",
                                "未选择文件",
                              )}
                        </span>
                        <button
                          type="button"
                          data-action-ui-id={`chat-tool-confirm-comfy-existing-input-${entry.node_id}:${entry.parameter}`}
                          disabled={
                            comfyInputUploading ===
                            `${entry.node_id}:${entry.parameter}`
                          }
                          className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-border px-2 py-1 text-body-12 text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => handleComfyExistingInputPick(entry)}
                        >
                          {comfyInputUploading ===
                            `${entry.node_id}:${entry.parameter}` && (
                            <Loader2 size={13} className="animate-spin" />
                          )}
                          {translate(
                            "chat.toolConfirm.comfyReplaceExistingInput",
                            "重新选择",
                          )}
                          {comfyUiInputMediaKind(entry) === "image"
                            ? translate("common.image", "图片")
                            : comfyUiInputMediaKind(entry) === "audio"
                              ? translate("common.audio", "音频")
                              : translate("common.video", "视频")}
                        </button>
                      </div>
                    ) : (
                      <ParamField
                        paramKey={entry.parameter}
                        value={stringifyParamValue(entry.value)}
                        originalValue={entry.value}
                        hint={paramHints?.[entry.parameter]}
                        onChange={(value) => setComfyInputValue(entry, value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            {(chipKeys.length > 0 || batchPageCount > 1) && (
              <div className="flex min-w-0 items-center">
                {chipKeys.length > 0 && (
                  <div className="flex min-w-0 items-center gap-1 h-7 text-body-12 text-foreground/70 overflow-x-auto scrollbar-none">
                    {chipKeys.map((key, index) => {
                      const isLast = index === chipKeys.length - 1;
                      return (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1 shrink-0"
                        >
                          <EditableParamChip
                            paramKey={key}
                            value={readArg(editedArgs, key)}
                            displayValue={valueAtBatchPage(
                              readArg(editedArgs, key),
                              batchPageIndex,
                              batchPageCount,
                            )}
                            originalValue={readArg(originalArgs, key)}
                            hint={paramHints?.[key]}
                            displayMap={
                              MODEL_NAME_KEYS.has(key)
                                ? modelDisplayMap
                                : key === "mode"
                                  ? modeDisplayMap
                                  : void 0
                            }
                            categoryIcon={CategoryIcon}
                            batchPageIndex={
                              batchPageCount > 1 ? batchPageIndex : void 0
                            }
                            batchPageCount={batchPageCount}
                            onChange={(value) => updateArg(key, value)}
                          />
                          {!isLast && (
                            <span
                              aria-hidden="true"
                              className="block h-[10px] w-px shrink-0 bg-foreground/15"
                            />
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
                <BatchPager
                  pageIndex={batchPageIndex}
                  pageCount={batchPageCount}
                  onChange={setBatchPageIndex}
                />
              </div>
            )}
            {mediaKeys.length > 0 && (
              <div className="flex flex-col">
                {mediaKeys.map((key) => (
                  <ReferenceMediaStrip
                    key={key}
                    paramKey={key}
                    value={readArg(editedArgs, key)}
                    uploadingId={uploadingMediaId}
                    onPick={handleMediaPick}
                    resolveUrl={resolveUrl}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              data-action-ui-id="chat-tool-confirm-reject"
              disabled={submitting}
              className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-md bg-foreground/5 text-body-12 font-medium text-foreground transition-colors hover:bg-foreground/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              onClick={handleReject}
            >
              {translate("chat.toolConfirm.cancel", "Cancel")}
            </button>
            <button
              type="button"
              data-action-ui-id="chat-tool-confirm-confirm"
              disabled={comfyConfirmBlocked || submitting}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-foreground text-body-12 font-medium text-background transition-colors hover:bg-foreground/90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              onClick={handleConfirm}
            >
              <span>{translate("chat.toolConfirm.confirm", "Confirm")}</span>
              {hasChanges && (
                <span className="text-caption-10 opacity-70">
                  {translate("chat.toolConfirm.paramEdited", "(edited)")}
                </span>
              )}
            </button>
          </div>
          <input
            ref={mediaFileInputRef}
            type="file"
            accept={mediaInputAccept}
            className="hidden"
            onChange={handleMediaFileChange}
          />
          <input
            ref={comfyInputRef}
            type="file"
            className="hidden"
            onChange={handleComfyInputChange}
          />
        </>
      )}
    </>
  );
  if (embedded) {
    return (
      <div
        data-action-ui-id="chat-tool-confirm-card"
        data-tool-confirm-request-id={requestId}
        className={cn("min-w-0 flex flex-col gap-2", isExpired && "opacity-70")}
      >
        {content}
      </div>
    );
  }
  return (
    <div
      data-action-ui-id="chat-tool-confirm-card"
      data-tool-confirm-request-id={requestId}
      className={cn(
        "flex items-start gap-1 w-full min-w-0",
        isExpired && "opacity-70",
      )}
    >
      <span className="shrink-0 size-6 flex items-center justify-center text-tertiary">
        <ToolConfirmBranchIcon />
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-2">{content}</div>
    </div>
  );
}
