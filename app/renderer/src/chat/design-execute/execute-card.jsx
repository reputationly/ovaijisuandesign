/**
 * 4.0.4 的 design_execute 任务卡片。
 *
 * 数据链：工具结果里的 task 快照 → useDesignTask 轮询/反查 → 推送缓存覆盖；
 * 渲染状态、进度、产出、参考素材与 retry。计费确认组按范围排除。
 */
import reactExports from "react";
// **fragment（`<>…</>`）走的是 `jsxRuntimeExports.Fragment`，不是 `__jsx`。**
// 少了这一行的后果是运行期 `ReferenceError: jsxRuntimeExports is not defined`，
// 而且只在"有产出"或"资源读取失败"那两条分支上炸 —— 也就是产出那条路一直是坏的，
// 空产出的时候看不出来（T-1 修的 `outputs=0` 让这条路第一次真的被走到）。
import jsxRuntimeExports from "react/jsx-runtime";
import { __jsx } from "../../shared/jsx-runtime.js";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import { useGatewayFetch } from "../../assets/listeners-a.jsx";
import { useGatewayUrl } from "../../workspace/use-required-gateway-scope.jsx";
import { API_PATHS } from "../../infra/workspace-gateway.js";
import { billingRechecking } from "../../canvas-v3/canvas-v3-model.js";
import { parseToolConfirmRejectReason } from "../../canvas/fullscreen-icon.jsx";
import { DEBUG_FLAGS, useDebugFlag } from "../../workspace/use-deep-link-router.js";
import { Loader2, ChevronDown } from "../../media-editing/lucide-icon-wraps.js";
import { AudioLines, FileText, Image as ImageIcon, Video } from "lucide-react";
import { Button } from "../../canvas-v3/main-exports.js";
import { CollapsiblePresence } from "../../media-editing/collapsible-presence.js";
import { MediaGenCardLayout, PromptBlock, TagsRow } from "../../media-editing/media-gen-detail.jsx";
import { ArtifactAssetCard } from "../../generation/artifact-asset-card.jsx";
import { useDesignResourceScope } from "../../canvas-v3/canvas-v3-hooks.js";
import { designInput, designOutputs, designTags, designTaskCallId, designTaskDetails, isDesignDeliveryComplete } from "./design-input.js";
import { useDesignTask, useDesignTaskParams } from "./task-query.js";
import { designTaskFinal } from "./task-push.js";
import { useReportDesignTask } from "./turn-registry.jsx";
import { useDesignResourcePath } from "./resources.js";

const MEDIA_ICONS = { image: ImageIcon, video: Video, audio: AudioLines, text: FileText };
const DESIGN_KINDS = {
  generate_image: { label: "generate_image", media: "image" },
  generate_video: { label: "generate_video", media: "video" },
  generate_speech: { label: "generate_speech", media: "audio" },
  generate_music: { label: "generate_music", media: "audio" },
  "edit_media:ffmpeg": { label: "ffmpeg", media: "video" },
  "edit_media:merge_videos": { label: "merge_videos", media: "video" },
  "edit_media:transcribe": { label: "transcribe", media: "text" },
  "edit_media:subtitle_format": { label: "subtitle_format", media: "text" },
};
const record = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : undefined);
// 本地 gateway 没有 billing/confirm_cost，参照在无计费时也返回 null。
function costConfirmationKind() {
  return null;
}
function taskStatusText(t, task) {
  return t(`workspaceTasks.status.${task.status}`);
}

export function DesignExecuteCard({ entry }) {
  const { scopeKey, ready } = useDesignResourceScope();
  return <ScopedCard entry={entry} scopeKey={scopeKey} ready={ready} />;
}

export function ScopedCard({ entry, scopeKey, ready }) {
  const { t } = useTranslation();
  const rawToolView = useDebugFlag(DEBUG_FLAGS.rawToolView);
  const fetch = useGatewayFetch();
  const input = designInput(entry.toolArgs);
  const result = reactExports.useMemo(() => {
    if (entry.toolResult && typeof entry.toolResult === "object") return entry.toolResult;
    if (typeof entry.toolResult === "string") {
      try { return JSON.parse(entry.toolResult); } catch { return undefined; }
    }
    return undefined;
  }, [entry.toolResult]);
  const snapshot = record(result?.task);
  const taskId = typeof snapshot?.id === "string" ? snapshot.id : undefined;
  const inputRejected = entry.toolStatus === "error" && !entry.interruption && /^MCP error -32602: Input validation error:/.test(entry.toolResult ?? "");
  const confirmRejectReason = entry.toolStatus === "error" ? parseToolConfirmRejectReason(entry.toolResult) : undefined;
  const executionRejected = inputRejected || !!confirmRejectReason;
  const snapshotFinal = designTaskFinal(snapshot);
  // 入口上的字段是 `toolCallId`（时间线归并时从 part 的 `callID` 换名而来）。
  // 读错字段的后果不是"少一次请求"，是**查询整个不打开**：`useDesignTask` 的 enabled
  // 要求 `taskId || callID`，两者都拿不到时卡片只能靠推送更新，轮询一次都不发。
  const observed = useDesignTask(scopeKey, ready, input.operation, designTaskCallId(entry), taskId, snapshotFinal, executionRejected);
  const observedRevision = observed.data?.revision ?? -1;
  const snapshotRevision = typeof snapshot?.revision === "number" ? snapshot.revision : -1;
  const task = observed.data && (snapshotFinal ? observedRevision > snapshotRevision : observedRevision >= snapshotRevision) ? observed.data : snapshot;
  const progress = record(task?.progress);
  const taskParams = useDesignTaskParams(scopeKey, ready, typeof task?.id === "string" ? task.id : undefined);
  const delivered = record(result?.delivery)?.outputs;
  const outputs = reactExports.useMemo(() => designOutputs(task ? task.outputs : delivered), [task, delivered]);
  const status = typeof task?.status === "string" ? task.status : undefined;
  const problem = record(task?.problem);
  const billingRetrying = !!status && billingRechecking({ status, problem: typeof problem?.code === "string" ? { code: problem.code } : null });
  const interrupted = !!entry.interruption;
  const failed = status === "failed" || (!task && entry.toolStatus === "error" && !interrupted && (!input.operation || inputRejected || confirmRejectReason === "confirmation_unavailable"));
  const cancelled = status === "cancelled" || progress?.phase === "stopped";
  const busy = !failed && !cancelled && (task || !executionRejected) && !interrupted && !observed.isError && (task ? ["accepted", "running"].includes(status ?? "") && progress?.phase !== "paused" : entry.toolStatus === "running" || entry.toolStatus === "pending");
  const model = useQuery({
    queryKey: ["design-execute-model", scopeKey, input.capabilityId],
    enabled: Boolean(ready && input.operation),
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/v3/capabilities/${encodeURIComponent(input.capabilityId)}?operation=${input.operation}`, { signal });
      if (!response.ok) throw new Error("Model unavailable");
      const detail = record(record(await response.json())?.capability);
      if (detail?.id !== input.capabilityId) throw new Error("Model identity mismatch");
      return typeof detail.displayName === "string" ? detail.displayName : undefined;
    },
    staleTime: 300_000,
    retry: false,
  });
  const presentation = input.kind ? DESIGN_KINDS[input.kind] : undefined;
  const Icon = presentation ? MEDIA_ICONS[presentation.media] : MEDIA_ICONS.audio;
  const modelLabel = model.data || input.capabilityId.split(":").slice(1).join(":");
  const params = taskParams.data ?? input.params;
  useReportDesignTask(entry.id, observed.data ? { task: observed.data, model: modelLabel, mediaType: presentation?.media ?? "image", title: input.title, prompt: input.prompt, ...designTaskDetails(params) } : null, outputs, isDesignDeliveryComplete(task ?? result?.delivery, !!task));
  const subtaskPhases = (Array.isArray(progress?.subtasks) ? progress.subtasks : []).map((subtask) => ({ phase: String(record(subtask)?.phase ?? "") }));
  const confirmationLabel = !task && confirmRejectReason ? t(confirmRejectReason === "user_rejected" ? "chat.activity.generationCancelled" : confirmRejectReason === "confirmation_expired" ? "chat.activity.confirmationExpired" : "chat.activity.confirmationUnavailable") : undefined;
  const stateLabel = confirmationLabel ?? (failed ? t("workspaceTasks.status.failed") : cancelled ? t("workspaceTasks.status.cancelled") : progress?.phase === "paused" ? t("workspaceTasks.status.paused") : status === "unknown" ? t("workspaceTasks.status.unknown") : billingRetrying ? t("canvasV3.generation.billingUnavailable") : status === "waiting_user" ? t("workspaceTasks.status.waiting_user") : progress?.phase === "pending" ? t("canvasV3.generation.preparing") : progress?.phase === "queued" ? t("canvasV3.generation.queued") : status === "completed" ? taskStatusText(t, { status, progress: { phase: String(progress?.phase ?? ""), subtasks: subtaskPhases } }) : !task && outputs.length > 0 ? t("workspaceTasks.status.completed") : interrupted || observed.isError || (!task && entry.toolStatus === "error") ? t("chat.designExecute.waitingStatus") : busy ? t("workspaceTasks.status.running") : t("chat.designExecute.waitingStatus"));
  const attention = !!busy || status === "waiting_user" || !!costConfirmationKind(observed.data);
  const settled = !attention && (failed || cancelled || status === "completed" || (!task && outputs.length > 0) || !!confirmationLabel);
  const [expanded, setExpanded] = reactExports.useState(attention);
  const hadAttention = reactExports.useRef(attention);
  const wasSettled = reactExports.useRef(settled);
  reactExports.useEffect(() => {
    if (attention && !hadAttention.current) setExpanded(true);
    hadAttention.current = attention;
  }, [attention]);
  reactExports.useEffect(() => {
    if (settled && !wasSettled.current) setExpanded(false);
    wasSettled.current = settled;
  }, [settled]);
  const awaitingCost = !!observed.data && costConfirmationKind(observed.data) !== null;
  const errorMessage = typeof problem?.message === "string" && problem.code !== "PAUSED" && !billingRetrying && !awaitingCost ? problem.message : !task && inputRejected ? entry.toolResult : undefined;
  const offline = !ready || (observed.isError && observed.error?.code === "NETWORK_ERROR");
  const queryFailedCode = observed.isError && !offline ? (observed.error?.code || observed.error?.message || "UNKNOWN") : undefined;
  const tags = [...(input.operation ? [{ key: "model", value: modelLabel }] : []), ...designTags(params)];
  return (
    <div className="min-w-0 text-body-14" data-action-ui-id="chat-design-execute" data-task-id={taskId ?? observed.data?.id}>
      <button type="button" className="flex w-full min-w-0 items-center gap-2 text-left text-muted-foreground" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} data-action-ui-id="chat-design-execute-toggle">
        {busy && ready ? <Loader2 className="size-4 shrink-0 animate-spin" strokeWidth={1.5} /> : <Icon className="size-4 shrink-0" />}
        <span className="min-w-0 truncate">
          {t(`chat.designExecute.operation.${presentation?.label ?? "unknown"}`, { count: outputs.length || 1 })}
          <span role="status" className={failed ? "text-destructive" : undefined}>{t("chat.designExecute.headerStatus", { status: stateLabel })}</span>
        </span>
        {rawToolView && <span className="truncate font-mono text-xs">design_execute</span>}
        <ChevronDown className={`size-3 shrink-0 chat-disclosure-chevron ${expanded ? "" : "-rotate-90"}`} />
      </button>
      <CollapsiblePresence open={expanded} className="pl-2">
        <MediaGenCardLayout
          className="relative pl-4 pt-2 before:absolute before:left-0 before:top-2 before:bottom-0 before:border-l before:border-border"
          prompt={input.prompt ? <PromptBlock text={input.prompt} lineClamp={2} /> : undefined}
          tags={<TagsRow tags={tags} categoryIcon={Icon} flushStart={true} />}
          media={
            <div className="flex flex-col gap-2">
              {input.references.length > 0 && (
                <div data-testid="design-execute-references" className="flex flex-col gap-1">
                  <p className="text-xs text-muted-foreground">{input.lastFrameOnly ? t("canvas.imageSlot.lastFrame") : t("chat.designExecute.references")}</p>
                  <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
                    {input.references.map((reference) => <ReferenceChip key={reference.versionId ?? reference.resourceId} reference={reference} scopeKey={scopeKey} ready={ready} />)}
                  </div>
                </div>
              )}
              {outputs.length > 0 && (
                <div data-testid="design-execute-outputs" className="flex flex-wrap gap-2">
                  {outputs.map((output) => <OutputResult key={`${output.resourceId}:${output.versionId}`} output={output} scopeKey={scopeKey} ready={ready} />)}
                </div>
              )}
            </div>
          }
          footer={
            <div className="space-y-2 empty:hidden">
              {errorMessage && <p role={cancelled ? "status" : "alert"} className={`break-words ${cancelled ? "text-muted-foreground" : "text-destructive"}`}>{errorMessage}</p>}
              {billingRetrying && <p role="status" className="break-words text-muted-foreground">{t("canvasV3.generation.billingUnavailableNotice")}</p>}
              {offline && <p className="text-xs text-muted-foreground">{t("workspaceTasks.offline")}</p>}
              {queryFailedCode && <p className="break-words text-xs text-muted-foreground">{t("chat.designExecute.statusQueryFailed", { code: queryFailedCode })}</p>}
              {observed.isError && <Button size="sm" variant="outline" disabled={!ready} onClick={() => void observed.refetch()}>{t("common.refresh")}</Button>}
              {rawToolView && <DesignRawDetails entry={entry} input={input} outputs={outputs} />}
            </div>
          }
        />
      </CollapsiblePresence>
    </div>
  );
}

function ReferenceChip({ reference, scopeKey, ready }) {
  const url = useGatewayUrl();
  const detail = useDesignResourcePath({ resourceId: reference.resourceId, versionId: reference.versionId }, scopeKey, ready && !!reference.resourceId);
  if (detail.data) {
    const src = url(API_PATHS.serveFile(detail.data));
    return <ArtifactAssetCard artifact={{ type: "image", path: detail.data, url: src }} resourceReference={{ resourceId: reference.resourceId, versionId: reference.versionId }} src={src} size="sm" showLabel={false} />;
  }
  return <span className="flex h-8 min-w-8 max-w-48 shrink-0 items-center overflow-hidden rounded-sm bg-muted/30 px-1 text-xs text-muted-foreground"><span className="truncate">{reference.name ?? reference.versionId ?? reference.resourceId}</span></span>;
}

function OutputResult({ output, scopeKey, ready }) {
  const { t } = useTranslation();
  const url = useGatewayUrl();
  const detail = useDesignResourcePath(output, scopeKey, ready);
  const readable = !output.availability || output.availability === "available";
  const src = detail.data ? url(API_PATHS.serveFile(detail.data)) : undefined;
  if (src && detail.data) {
    return <ArtifactAssetCard artifact={{ type: output.kind === "text" ? "file" : output.kind, path: detail.data, url: src }} resourceReference={{ resourceId: output.resourceId, versionId: output.versionId }} src={src} size="md" showLabel={output.kind === "text"} />;
  }
  return (
    <div className="flex h-16 min-w-16 max-w-full items-center gap-2 overflow-hidden rounded-sm bg-muted/30 px-2 text-xs text-muted-foreground">
      {detail.isFetching && <Loader2 className="size-4 animate-spin" />}
      <span className="max-w-48 truncate">{output.name}</span>
      {(!readable || detail.isError) && <><span>{t("canvas.file.viewer.loadFailed")}</span>{readable && <Button size="sm" variant="outline" disabled={!ready} onClick={() => void detail.refetch()}>{t("common.retry")}</Button>}</>}
    </div>
  );
}

function DesignRawDetails({ entry, input, outputs }) {
  const { t } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  return (
    <div className="text-xs text-muted-foreground">
      <button type="button" className="underline" onClick={() => setOpen((value) => !value)}>{t("chat.designExecute.rawDetails")}</button>
      {open && <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify({ args: input, result: entry.toolResult, outputs }, null, 2)}</pre>}
    </div>
  );
}
