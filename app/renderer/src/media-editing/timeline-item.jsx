// ==== 逐文件收敛 ====
import { operation } from "../canvas-v3/canvas-v3-model.js";
// timeline-item.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CATEGORY_I18N,
  CATEGORY_ICON,
  CATEGORY_RUNNING_I18N,
  normalizeStructuredToolResult,
  resolveToolConfirmRejectReason,
  sanitizeDisplayText,
  toolConfirmRejectLabel,
} from "./turn-artifact-strip.jsx";
import { ExpandableText } from "../text-editor/expandable-text.jsx";
import {
  getToolDisplayLabel,
  isTransientTool,
} from "../generation/use-tool-confirm-edit-state.js";
import {
  formatArgs,
  getToolStatusLabel,
} from "../chat/use-tool-confirm-settlement.js";
import { API_PATHS } from "../infra/workspace-gateway.js";
import { useCurrentWorkspace } from "../infra/shared-runtime.js";
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ClipboardList, SquareMousePointer } from "./lucide-icon-wraps.js";
import { useResolveMediaUrl } from "../workspace/tool-label-definitions.js";
import {
  extractMediaCount,
  generationFailurePresentation,
  hasSuccessfulMediaOutput,
  inferFileKind,
  isGenerationFailureNonTerminal,
  isToolRecoveredInterrupted,
  KNOWLEDGE_PATH_RE,
  resolveToolInterruption,
} from "../chat/has-structured-success-payload.js";
import { FileChip } from "../generation/file-chip.jsx";
import { dispatchCanvasLocate } from "../generation/dispatch-canvas-locate.js";
import {
  CapabilitySearchCard,
  parseCapabilitySearchCardResult,
  ProductionPlanDisclosureContext,
} from "../text-editor/capability-search-card.jsx";
import { workspaceEvents } from "../workspace/topbar-state-context.jsx";
import { Button } from "../infra/dialog-content.jsx";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { Spinner } from "../team/use-team-transactions-feed-query.jsx";
import { MediaGenDetail } from "./media-gen-detail.jsx";
import {
  DEBUG_FLAGS,
  useDebugFlag,
} from "../workspace/use-deep-link-router.js";
import { Progress } from "../team/team-management-detail-loading.jsx";
import { ToolConfirmCard } from "../generation/tool-confirm-card.jsx";
import { formatJson } from "./format-json.jsx";
function useProductionPlanDisclosure() {
  return reactExports.useContext(ProductionPlanDisclosureContext);
}
function matchKnowledgePath(path) {
  if (!path) return void 0;
  const match = path.match(KNOWLEDGE_PATH_RE);
  if (!match) return void 0;
  return {
    short: match[1].replace(/\\/g, "/"),
    full: path.replace(/\\/g, "/"),
  };
}
const knowledgeHttpUrlPattern = /^https?:\/\//i;
const knowledgeWindowsAbsolutePathPattern = /^[a-zA-Z]:[\\/]/;
const knowledgeWindowsUncPathPattern = /^\\\\/;
function isWindowsPath(path) {
  return (
    knowledgeWindowsAbsolutePathPattern.test(path) || knowledgeWindowsUncPathPattern.test(path)
  );
}
function isAbsoluteKnowledgePath(path) {
  return path.startsWith("/") || isWindowsPath(path);
}
function stripQueryAndHash(path) {
  return path.split(/[?#]/, 1)[0] ?? path;
}
function decodeRoutePath(path) {
  try {
    return decodeURIComponent(path);
  } catch {
    return void 0;
  }
}
function normalizeRelativePath(path) {
  const segments = path
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment && segment !== ".");
  if (segments.length === 0 || segments.some((segment) => segment === ".."))
    return void 0;
  return segments.join("/");
}
function toWorkspaceFileRelativePath(path, workspacePath) {
  const source = path.trim();
  if (!source || knowledgeHttpUrlPattern.test(source)) return void 0;
  if (source.startsWith("/files/")) {
    const routePath = stripQueryAndHash(source).slice("/files/".length);
    const decodedPath = decodeRoutePath(routePath);
    return decodedPath ? normalizeRelativePath(decodedPath) : void 0;
  }
  if (source.startsWith("/api/")) return void 0;
  if (!isAbsoluteKnowledgePath(source)) {
    return normalizeRelativePath(stripQueryAndHash(source));
  }
  const workspace = workspacePath.trim();
  if (!workspace) return void 0;
  const normalizedPath = stripQueryAndHash(source).replace(/\\/g, "/");
  const normalizedWorkspace = workspace.replace(/\\/g, "/").replace(/\/+$/, "");
  const caseInsensitive = isWindowsPath(source) || isWindowsPath(workspace);
  const comparablePath = caseInsensitive
    ? normalizedPath.toLowerCase()
    : normalizedPath;
  const comparableWorkspace = caseInsensitive
    ? normalizedWorkspace.toLowerCase()
    : normalizedWorkspace;
  const workspacePrefix = `${comparableWorkspace}/`;
  if (!comparableWorkspace || !comparablePath.startsWith(workspacePrefix))
    return void 0;
  return normalizeRelativePath(
    normalizedPath.slice(normalizedWorkspace.length + 1),
  );
}
const MEDIA_GEN_CATEGORIES = new Set([
  "imageGen",
  "videoGen",
  "videoEdit",
  "audioGen",
  "musicGen",
]);
const FILE_ACTIVITY_FAILED_I18N = {
  analyseMedia: "chat.activity.analyseMedia.failed",
};
function formatElapsedMilliseconds(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1e3));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
const TIMELINE_ICON_SIZE = 16;
function thinkingSummary(content) {
  return content
    .replace(/[*_`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
const TIMELINE_TOOL_ICON_SIZE = 18;
const TIMELINE_ICON_STROKE_WIDTH = 1.24;
function getTimelineIconSize(entry) {
  return entry.type === "tool" && entry.category === "execute"
    ? TIMELINE_TOOL_ICON_SIZE
    : TIMELINE_ICON_SIZE;
}
function extractKnowledgePaths(toolName, toolArgs) {
  if (toolName !== "hub_read" || !toolArgs) return void 0;
  try {
    const parsed = JSON.parse(toolArgs);
    const filePath = parsed.file_path ?? parsed.filePath ?? "";
    return matchKnowledgePath(filePath);
  } catch {}
  return void 0;
}
function extractSkillName(toolArgs) {
  if (!toolArgs) return void 0;
  try {
    const parsed = JSON.parse(toolArgs);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return void 0;
    const record = parsed;
    const skillName = record.name ?? record.skill ?? record.skill_name;
    return typeof skillName === "string" && skillName.trim().length > 0
      ? skillName.trim()
      : void 0;
  } catch {}
  return void 0;
}
function parseComfyUiRunDisplayResult(toolResult) {
  const normalized = normalizeStructuredToolResult(toolResult);
  if (!normalized) return void 0;
  try {
    const parsed = JSON.parse(normalized);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return void 0;
    const record = parsed;
    const paths = Array.isArray(record.output_paths)
      ? record.output_paths.filter(
          (path) => typeof path === "string" && path.trim().length > 0,
        )
      : [];
    const uniquePaths = [...new Set(paths)];
    const succeededCount =
      typeof record.succeeded_count === "number"
        ? record.succeeded_count
        : uniquePaths.length;
    return {
      terminal: record.terminal === true,
      status: typeof record.status === "string" ? record.status : void 0,
      succeededCount,
      outputFiles: uniquePaths.map((path) => ({
        name: path.split(/[\\/]/).pop() ?? path,
        path,
      })),
    };
  } catch {
    return void 0;
  }
}
function renderToolLabel(entry, t) {
  if (entry.type === "tool" && entry.toolName === "hub_run_comfyui_workflow") {
    const result = parseComfyUiRunDisplayResult(entry.toolResult);
    if (entry.toolStatus === "running" || entry.toolStatus === "pending") {
      return t("chat.toolLabel.runComfyUiWorkflow.running");
    }
    if (entry.toolStatus === "ok" && result?.terminal) {
      if (result.status === "failed" && result.succeededCount === 0) {
        return t("chat.toolLabel.runComfyUiWorkflow.failed");
      }
      return t("chat.toolLabel.runComfyUiWorkflow.completed", {
        count: result.succeededCount,
      });
    }
  }
  if (entry.type === "tool" && isTransientTool(entry.toolName)) {
    return getToolDisplayLabel(entry.toolName, t);
  }
  if (entry.type === "tool" && entry.category === "connector") {
    return getToolDisplayLabel(entry.toolName, t);
  }
  if (
    (entry.category === "canvas" || entry.category === "plan") &&
    (entry.toolStatus === "running" || entry.toolStatus === "pending")
  ) {
    return getToolDisplayLabel(entry.toolName, t);
  }
  if (entry.aggregatedFiles) {
    if (entry.toolStatus === "running" || entry.toolStatus === "pending") {
      const runningKey = CATEGORY_RUNNING_I18N[entry.category];
      if (runningKey) return t(runningKey);
    }
    if (entry.toolStatus === "error") {
      const failedKey = FILE_ACTIVITY_FAILED_I18N[entry.category];
      if (failedKey) return t(failedKey);
    }
    return t(CATEGORY_I18N[entry.category], {
      count: entry.aggregatedFiles.length,
    });
  }
  if (entry.aggregatedSearchChips) {
    return t("chat.activity.search", {
      count: entry.aggregatedSearchChips.length,
    });
  }
  if (
    entry.aggregatedCount &&
    (entry.category === "execute" ||
      entry.category === "process" ||
      entry.category === "canvas" ||
      entry.category === "plan")
  ) {
    return t(CATEGORY_I18N[entry.category], {
      count: entry.aggregatedCount,
    });
  }
  if (entry.aggregatedTimelineOperations) {
    const count =
      entry.aggregatedTimelineOperations.reduce(
        (sum, operation) => sum + operation.count,
        0,
      ) + (entry.aggregatedTimelineFallbackCount ?? 0);
    return t(CATEGORY_I18N[entry.category], {
      count,
    });
  }
  if (entry.category === "skillOp") {
    const skillName = extractSkillName(entry.toolArgs);
    if (!skillName) return t("chat.activity.skillLoadedFallback");
    return (
      <>
        {t("chat.activity.skillLoadedPrefix", {
          defaultValue: "加载Skill",
        })}
        <span className="ml-1.5 inline-flex items-center rounded-sm bg-foreground/5 px-1.5 py-0.5 text-foreground/80 font-mono text-[12px]">
          {skillName}
        </span>
      </>
    );
  }
  const isLyrics =
    entry.type === "tool" && !!entry.toolName?.includes("lyrics_");
  if (MEDIA_GEN_CATEGORIES.has(entry.category)) {
    if (entry.toolStatus === "running" || entry.toolStatus === "pending") {
      if (isLyrics)
        return t("chat.activity.lyricsGen.running", {
          defaultValue: "歌词生成",
        });
      const runningKey = CATEGORY_RUNNING_I18N[entry.category];
      if (runningKey) return t(runningKey);
      return t(CATEGORY_I18N[entry.category], {
        count: 1,
      });
    }
    if (
      entry.toolStatus === "error" &&
      (isToolRecoveredInterrupted(entry.toolResult) ||
        hasSuccessfulMediaOutput(entry.toolResult))
    ) {
      return t(CATEGORY_I18N[entry.category], {
        count: 1,
      });
    }
    const failurePresentation = generationFailurePresentation(entry.toolResult);
    if (failurePresentation === "recoverable") {
      return t("chat.activity.mediaGenRecoverable");
    }
    if (failurePresentation === "status_unknown") {
      return t("chat.activity.mediaGenUnknown");
    }
    if (failurePresentation === "cancelled") {
      return t("chat.activity.mediaGenCancelled");
    }
    const interruption =
      entry.toolStatus === "error"
        ? resolveToolInterruption(entry.toolResult, entry.interruption)
        : void 0;
    if (interruption === "canvas_continuation") {
      return t("chat.activity.mediaGenInterrupted");
    }
    if (interruption === "aborted") {
      return t("chat.activity.mediaGenAborted");
    }
    const rejectReason = resolveToolConfirmRejectReason(entry);
    if (rejectReason) return toolConfirmRejectLabel(rejectReason, t);
    const count = extractMediaCount(sanitizeDisplayText(entry.toolResult));
    if (count === 0) return t("chat.activity.mediaGenFailed");
    if (isLyrics)
      return t("chat.activity.lyricsGen", {
        defaultValue: "生成了歌词",
      });
    return t(CATEGORY_I18N[entry.category], {
      count,
    });
  }
  return t(CATEGORY_I18N[entry.category], {
    count: 1,
  });
}
function TimelineOperationTargetChip({ operation }) {
  const currentWorkspace = useCurrentWorkspace();
  const { activePlanId, openPlan } = useProductionPlanDisclosure();
  const canOpenPlan =
    operation.kind === "production-plan" && Boolean(activePlanId && operation.targetPlanId === activePlanId);
  const handleOpenTarget = reactExports.useCallback(() => {
    if (canOpenPlan) {
      openPlan(operation.targetPlanId);
      return;
    }
    if (!currentWorkspace || operation.targetNodeIds.length === 0) return;
    workspaceEvents.fireCanvasFocus(currentWorkspace, operation.targetNodeIds, {
      select: true,
    });
  }, [canOpenPlan, currentWorkspace, openPlan, operation]);
  if (!operation.inputSummary) return null;
  if (canOpenPlan || operation.targetNodeIds.length > 0) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="xs"
        data-action-ui-id={
          operation.kind === "production-plan" ? "chat-production-plan-operation-open" : "chat-canvas-operation-locate"
        }
        className="h-auto min-w-0 max-w-[200px] rounded-sm bg-foreground/[0.06] px-1.5 py-0.5 font-normal text-caption-11 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
        onClick={handleOpenTarget}
      >
        <span className="min-w-0 truncate">{operation.inputSummary}</span>
      </Button>
    );
  }
  return (
    <span className="inline-flex max-w-[160px] items-center px-1.5 py-0.5 rounded-sm bg-foreground/[0.06] text-caption-11 text-muted-foreground">
      <span className="min-w-0 truncate">{operation.inputSummary}</span>
    </span>
  );
}
function TimelineOperationRow({ operation: operation2, isActive }) {
  const { t } = useTranslation();
  const labelKey = isActive
    ? (operation.activeLabelKey ?? operation.labelKey)
    : operation.labelKey;
  const OperationIcon =
    operation.kind === "production-plan" ? ClipboardList : SquareMousePointer;
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-body-14">
      <span className="flex size-4 shrink-0 items-center justify-center text-foreground">
        {isActive ? (
          <Spinner className="size-4 text-tertiary" />
        ) : (
          <Icon
            icon={OperationIcon}
            size="md"
            strokeWidth={TIMELINE_ICON_STROKE_WIDTH}
            className="opacity-50"
          />
        )}
      </span>
      <div className="flex min-w-0 items-center gap-1">
        <span className="shrink-0 font-normal text-muted-foreground">
          {t(labelKey)}
        </span>
        <TimelineOperationTargetChip operation={operation} />
      </div>
    </div>
  );
}
function timelineOperationKey(operation) {
  return [
    operation.kind,
    operation.targetPlanId ??
      operation.targetGroupId ??
      operation.targetNodeIds.join(","),
    operation.labelKey,
    operation.inputSummary,
  ].join("|");
}
function TimelineOperationRows({ operations, isActive }) {
  return (
    <div
      className="flex min-w-0 flex-col gap-2"
      data-timeline-operation-rows={true}
    >
      {operations.map((operation) => {
        const operationKey = timelineOperationKey(operation);
        return (
          <TimelineOperationRow
            key={operationKey}
            operation={operation}
            isActive={isActive}
          />
        );
      })}
    </div>
  );
}
const HTTP_URL_RE = /^https?:\/\//i;
const WINDOWS_ABSOLUTE_PATH_RE = /^[a-zA-Z]:[\\/]/;
const WINDOWS_UNC_PATH_RE = /^\\\\/;
function isGatewayRoute(path) {
  return path.startsWith("/files/") || path.startsWith("/api/");
}
function isAbsoluteLocalPath(path) {
  return (
    (!isGatewayRoute(path) && path.startsWith("/")) ||
    WINDOWS_ABSOLUTE_PATH_RE.test(path) ||
    WINDOWS_UNC_PATH_RE.test(path)
  );
}
function resolveFileChipMediaUrl(item, resolveUrl) {
  const source = item.url?.trim() || item.path;
  if (!source) return void 0;
  if (HTTP_URL_RE.test(source)) return source;
  if (isGatewayRoute(source)) return resolveUrl(source);
  if (isAbsoluteLocalPath(source))
    return resolveUrl(API_PATHS.serveLocal(source));
  return resolveUrl(API_PATHS.serveFile(source));
}
function FileOpChipsRow({ items }) {
  const resolveUrl = useResolveMediaUrl();
  const currentWorkspace = useCurrentWorkspace();
  return (
    <div data-fileop-chips={true}>
      <div className="flex min-w-0 flex-wrap items-start gap-1">
        {items.map((item) => {
          const kind = item.kind ?? inferFileKind(item.path);
          const src = resolveFileChipMediaUrl(item, resolveUrl);
          const isImage = kind === "image";
          const isVideo = kind === "video";
          const isAudio = kind === "audio";
          const previewable = src && (isImage || isVideo || isAudio);
          const mediaProps =
            src && isImage
              ? {
                  imageUrl: src,
                  mediaUrl: src,
                }
              : src && (isVideo || isAudio)
                ? {
                    mediaUrl: src,
                  }
                : {};
          const videoThumbnailPath =
            kind === "video"
              ? toWorkspaceFileRelativePath(item.path, currentWorkspace)
              : void 0;
          return (
            <FileChip
              key={item.path}
              filename={item.name}
              fileType={kind}
              {...mediaProps}
              videoThumbnailPath={videoThumbnailPath}
              previewOnClick={!!previewable}
              onAnchorClick={() =>
                dispatchCanvasLocate(item.path, currentWorkspace)
              }
            />
          );
        })}
      </div>
    </div>
  );
}
function ProcessStepsDetail({ steps, t }) {
  return (
    <div className="flex min-w-0 flex-col gap-2" data-process-steps={true}>
      {steps.map((step, index) => {
        const displayResult = sanitizeDisplayText(step.toolResult);
        return(
          <div
            key={step.id}
            className="min-w-0 rounded-md border border-border bg-foreground/[0.02] px-2.5 py-2"
          >
            <div className="text-body-12 font-medium text-foreground">
              {index + 1}
              {". "}
              {getToolDisplayLabel(step.toolName, t)}
            </div>
            {step.toolArgs && (
              <div className="mt-1.5">
                <div className="mb-0.5 text-body-12 text-muted-foreground">
                  {t("chat.input")}
                </div>
                <ExpandableText
                  asPre={true}
                  lineClamp={6}
                  className="text-body-12 font-sans"
                >
                  {formatArgs(step.toolArgs)}
                </ExpandableText>
              </div>
            )}
            {displayResult && (
              <div className="mt-1.5">
                <div className="mb-0.5 text-body-12 text-muted-foreground">
                  {t("chat.output")}
                </div>
                <ExpandableText
                  asPre={true}
                  lineClamp={6}
                  className="text-body-12 font-sans"
                >
                  {displayResult}
                </ExpandableText>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
function DetailCornerWrap({ children, dataMessageId }) {
  return (
    <div className="ml-[9px] pl-3 min-w-0" data-message-id={dataMessageId}>
      {children}
    </div>
  );
}
export function TimelineItem({
  entry,
  isActive,
  onSend,
  showDetailRail = true,
  showThinkingSummary = true,
  defaultDetailExpanded = false,
}) {
  const { t } = useTranslation();
  const isComfyUiRun =
    entry.type === "tool" && entry.toolName === "hub_run_comfyui_workflow";
  const comfyUiRunResult = isComfyUiRun
    ? parseComfyUiRunDisplayResult(entry.toolResult)
    : void 0;
  const isComfyUiRunning =
    isComfyUiRun &&
    (entry.toolStatus === "running" || entry.toolStatus === "pending");
  const [detailExpanded, setDetailExpanded] = reactExports.useState(
    () =>
      defaultDetailExpanded ||
      !!entry.pendingConfirm ||
      isComfyUiRunning ||
      entry.interruption === "canvas_continuation" ||
      Boolean(comfyUiRunResult?.outputFiles.length),
  );
  reactExports.useEffect(() => {
    if (entry.pendingConfirm) setDetailExpanded(true);
  }, [entry.pendingConfirm]);
  reactExports.useEffect(() => {
    if (comfyUiRunResult?.terminal && comfyUiRunResult.outputFiles.length > 0) {
      setDetailExpanded(true);
    }
  }, [comfyUiRunResult?.terminal, comfyUiRunResult?.outputFiles.length]);
  reactExports.useEffect(() => {
    if (isComfyUiRunning) setDetailExpanded(true);
  }, [isComfyUiRunning]);
  reactExports.useEffect(() => {
    if (entry.interruption === "canvas_continuation") setDetailExpanded(true);
  }, [entry.interruption]);
  const rawToolView = useDebugFlag(DEBUG_FLAGS.rawToolView);
  const isMediaGen = MEDIA_GEN_CATEGORIES.has(entry.category);
  const isConnector = entry.type === "tool" && entry.category === "connector";
  const detailEligible = isMediaGen || isConnector || rawToolView;
  const knowledgePaths =
    entry.type === "tool"
      ? extractKnowledgePaths(entry.toolName, entry.toolArgs)
      : void 0;
  const displayToolResult =
    entry.type === "tool" ? sanitizeDisplayText(entry.toolResult) : void 0;
  const showToolResult =
    entry.type === "tool" &&
    detailEligible &&
    displayToolResult &&
    entry.toolName !== "hub_read";
  const aggregatedFileItems =
    entry.aggregatedFiles ?? comfyUiRunResult?.outputFiles;
  const aggregatedProcessSteps = entry.aggregatedProcessSteps;
  const aggregatedCommands = entry.aggregatedCommands;
  const isAggregated =
    entry.type === "tool" && Boolean(aggregatedFileItems?.length);
  const hasDetail =
    isComfyUiRunning ||
    isAggregated ||
    Boolean(aggregatedProcessSteps?.length) ||
    Boolean(aggregatedCommands?.length) ||
    !!entry.pendingConfirm ||
    (entry.type === "tool" &&
      detailEligible &&
      (knowledgePaths || entry.toolArgs || showToolResult)) ||
    (entry.type === "thinking" && entry.thinkingContent);
  const Icon = CATEGORY_ICON[entry.category];
  const isFailed =
    entry.type === "tool" &&
    entry.toolStatus === "error" &&
    !isGenerationFailureNonTerminal(entry.toolResult) &&
    !isToolRecoveredInterrupted(entry.toolResult) &&
    !resolveToolInterruption(entry.toolResult, entry.interruption) &&
    !hasSuccessfulMediaOutput(entry.toolResult);
  const DisplayIcon = isFailed ? CATEGORY_ICON.mediaGenFailed : Icon;
  const timelineIconSize = getTimelineIconSize(entry);
  const timelineOperations =
    entry.type === "tool" &&
    (entry.category === "canvas" || entry.category === "plan")
      ? entry.aggregatedTimelineOperations
      : void 0;
  const isTimelineOperationInFlight =
    entry.type === "tool" &&
    (entry.category === "canvas" || entry.category === "plan") &&
    (entry.toolStatus === "running" || entry.toolStatus === "pending");
  const isGeneratingMedia =
    isMediaGen &&
    entry.type === "tool" &&
    (entry.toolStatus === "running" || entry.toolStatus === "pending");
  reactExports.useEffect(() => {
    if (isGeneratingMedia) setDetailExpanded(true);
  }, [isGeneratingMedia]);
  if (
    (entry.category === "canvas" || entry.category === "plan") &&
    !timelineOperations?.length &&
    !isTimelineOperationInFlight &&
    !entry.pendingConfirm &&
    !entry.rejectedConfirm &&
    !rawToolView
  ) {
    return null;
  }
  if (
    timelineOperations?.length &&
    !entry.pendingConfirm &&
    !entry.rejectedConfirm &&
    !rawToolView
  ) {
    return (
      <TimelineOperationRows
        operations={timelineOperations}
        isActive={isActive}
      />
    );
  }
  const toggleDetail = () => setDetailExpanded((isExpanded) => !isExpanded);
  const handleDetailKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleDetail();
  };
  const detailInteractionProps = hasDetail
    ? {
        role: "button",
        tabIndex: 0,
        "aria-expanded": detailExpanded,
        onClick: toggleDetail,
        onKeyDown: handleDetailKeyDown,
      }
    : {};
  const capabilityResult =
    entry.toolStatus === "ok"
      ? parseCapabilitySearchCardResult(entry.toolName, entry.toolResult)
      : null;
  if (capabilityResult)
    return (
      <CapabilitySearchCard
        result={capabilityResult}
        searchCallId={entry.toolCallId ?? entry.id}
      />
    );
  return (
    <div
      className={`relative ${isActive || (isMediaGen && detailExpanded) ? "" : "hover:opacity-90"} transition-opacity`}
      data-action-ui-id={isConnector ? "chat-connector-tool" : void 0}
      data-tool-name={isConnector ? entry.toolName : void 0}
      data-tool-status={isConnector ? entry.toolStatus : void 0}
    >
      <div
        className={`flex w-full items-center gap-1.5 py-0 text-left ${hasDetail ? "cursor-pointer" : "cursor-default"}`}
        {...detailInteractionProps}
        data-action-ui-id={
          isConnector && hasDetail ? "chat-connector-tool-details" : void 0
        }
      >
        <span className="shrink-0 size-4 flex items-center justify-center text-foreground">
          {isActive ? (
            <Spinner className="size-4 text-tertiary" />
          ) : (
            <DisplayIcon
              size={timelineIconSize}
              strokeWidth={TIMELINE_ICON_STROKE_WIDTH}
              className="opacity-50"
            />
          )}
        </span>
        <div className="min-w-0 flex-1 text-body-14 flex items-center gap-1">
          <span
            className="text-muted-foreground font-normal truncate"
            title={isConnector ? entry.toolName : void 0}
          >
            {entry.type === "thinking"
              ? t("chat.activity.thought")
              : renderToolLabel(entry, t)}
          </span>
          {entry.type === "thinking" &&
            showThinkingSummary &&
            entry.thinkingContent && (
              <span className="min-w-0 max-w-[240px] truncate text-muted-foreground">
                {"· "}
                {thinkingSummary(entry.thinkingContent)}
              </span>
            )}
          {(rawToolView ||
            (isConnector &&
              getToolDisplayLabel(entry.toolName, t) !== entry.toolName)) &&
            entry.type === "tool" &&
            entry.toolName && (
              <span
                className="min-w-0 truncate font-mono text-caption-10 text-muted-foreground"
                title={entry.toolName}
              >
                {entry.toolName}
              </span>
            )}
          {isConnector && entry.toolStatus !== "running" && (
            <span className="shrink-0 text-body-12 text-muted-foreground">
              {getToolStatusLabel(
                entry.toolStatus,
                t,
                entry.toolResult,
                entry.interruption,
              )}
            </span>
          )}
          {hasDetail && (
            <ChevronDown
              size={TIMELINE_ICON_SIZE}
              strokeWidth={TIMELINE_ICON_STROKE_WIDTH}
              className={`shrink-0 text-muted-foreground transition-transform ${detailExpanded ? "" : "-rotate-90"}`}
            />
          )}
        </div>
      </div>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${detailExpanded && hasDetail ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="relative pt-2">
            {detailExpanded && hasDetail && showDetailRail && (
              <span
                aria-hidden="true"
                data-action-ui-id="chat-timeline-detail-rail"
                className="absolute left-[7px] top-2 bottom-0 w-[var(--brutalist-border-width)] bg-tertiary/25 pointer-events-none"
              />
            )}
            {hasDetail &&
              (entry.pendingConfirm && onSend ? (
                <DetailCornerWrap dataMessageId={entry.pendingConfirm.id}>
                  <ToolConfirmCard
                    message={entry.pendingConfirm}
                    onSend={onSend}
                    embedded={true}
                  />
                </DetailCornerWrap>
              ) : isComfyUiRunning ? (
                <DetailCornerWrap>
                  <div
                    data-action-ui-id="chat-comfyui-progress"
                    className="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-foreground/[0.02] px-3 py-2.5"
                  >
                    {entry.comfyUiProgress ? (
                      <>
                        <div className="flex min-w-0 items-center justify-between gap-3 text-body-12">
                          <span className="min-w-0 truncate text-foreground">
                            {entry.comfyUiProgress.workflow_title ||
                              entry.comfyUiProgress.workflow_id}
                          </span>
                          <span className="shrink-0 text-muted-foreground">
                            {t(
                              "chat.toolLabel.runComfyUiWorkflow.progressCompleted",
                              {
                                completed:
                                  entry.comfyUiProgress.completed_count ??
                                  entry.comfyUiProgress.succeeded_count +
                                    entry.comfyUiProgress.failed_count,
                                total: entry.comfyUiProgress.requested_count,
                              },
                            )}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-caption-10 text-muted-foreground">
                          <span>
                            {t(
                              "chat.toolLabel.runComfyUiWorkflow.progressQueued",
                              {
                                count: entry.comfyUiProgress.queued_count,
                              },
                            )}
                          </span>
                          <span>
                            {t(
                              "chat.toolLabel.runComfyUiWorkflow.progressRunning",
                              {
                                count: entry.comfyUiProgress.running_count,
                              },
                            )}
                          </span>
                          <span>
                            {t(
                              "chat.toolLabel.runComfyUiWorkflow.progressMaterializing",
                              {
                                count:
                                  entry.comfyUiProgress.materializing_count ??
                                  0,
                              },
                            )}
                          </span>
                          <span>
                            {t(
                              "chat.toolLabel.runComfyUiWorkflow.progressElapsed",
                              {
                                elapsed: formatElapsedMilliseconds(
                                  entry.comfyUiProgress.elapsed_ms ?? 0,
                                ),
                              },
                            )}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-body-12 text-muted-foreground">
                        {t(
                          "chat.toolLabel.runComfyUiWorkflow.progressDescription",
                        )}
                      </div>
                    )}
                    <Progress
                      value={
                        entry.comfyUiProgress
                          ? Math.round(
                              ((entry.comfyUiProgress.completed_count ??
                                entry.comfyUiProgress.succeeded_count +
                                  entry.comfyUiProgress.failed_count) /
                                Math.max(
                                  1,
                                  entry.comfyUiProgress.requested_count,
                                )) *
                                100,
                            )
                          : null
                      }
                      aria-label={t(
                        "chat.toolLabel.runComfyUiWorkflow.running",
                      )}
                    />
                  </div>
                </DetailCornerWrap>
              ) : aggregatedFileItems ? (
                <DetailCornerWrap>
                  <FileOpChipsRow items={aggregatedFileItems} />
                </DetailCornerWrap>
              ) : aggregatedCommands?.length ? (
                <DetailCornerWrap>
                  <div
                    className="flex min-w-0 flex-col gap-2"
                    data-command-details={true}
                  >
                    {aggregatedCommands.map(
                      ({ id: commandId, command }) => (
                        <div
                          key={commandId}
                          className="min-w-0 rounded-md border border-border bg-foreground/[0.02] px-2.5 py-2"
                        >
                          <ExpandableText
                            asPre={true}
                            lineClamp={6}
                            className="text-body-12"
                          >
                            {command}
                          </ExpandableText>
                        </div>
                      ),
                    )}
                  </div>
                </DetailCornerWrap>
              ) : aggregatedProcessSteps?.length ? (
                <DetailCornerWrap>
                  <ProcessStepsDetail steps={aggregatedProcessSteps} t={t} />
                </DetailCornerWrap>
              ) : isMediaGen && entry.type === "tool" ? (
                <DetailCornerWrap>
                  <MediaGenDetail entry={entry} />
                </DetailCornerWrap>
              ) : (
                <DetailCornerWrap>
                  <div className="flex flex-col gap-2 text-body-14 text-muted-foreground">
                    {entry.type === "thinking" && entry.thinkingContent && (
                      <ExpandableText lineClamp={8}>
                        {entry.thinkingContent}
                      </ExpandableText>
                    )}
                    {entry.type === "tool" &&
                      entry.toolArgs &&
                      !knowledgePaths && (
                        <div>
                          <div className="text-muted-foreground mb-0.5">
                            {t("chat.input")}
                          </div>
                          <ExpandableText
                            asPre={true}
                            lineClamp={6}
                            className="text-body-14 font-sans"
                          >
                            {formatArgs(entry.toolArgs)}
                          </ExpandableText>
                        </div>
                      )}
                    {knowledgePaths && (
                      <ExpandableText
                        asPre={true}
                        lineClamp={6}
                        className="text-body-14 font-sans"
                      >
                        {knowledgePaths.short}
                      </ExpandableText>
                    )}
                    {showToolResult && !knowledgePaths && (
                      <div>
                        <div className="text-muted-foreground mb-0.5">
                          {t("chat.output")}
                        </div>
                        <ExpandableText
                          asPre={true}
                          lineClamp={6}
                          className="text-body-14 font-sans"
                        >
                          {displayToolResult}
                        </ExpandableText>
                      </div>
                    )}
                  </div>
                </DetailCornerWrap>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
