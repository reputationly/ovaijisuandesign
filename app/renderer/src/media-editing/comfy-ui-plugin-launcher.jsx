// comfy-ui-plugin-launcher.jsx
import {
  useHtmlFullscreenApi,
  useHtmlFullscreenStore,
  useHtmlViewerHandle,
  useHtmlViewerPresentation,
  usePluginMeta,
  usePluginRunInfo,
} from "../infra/use-plugin-metadata-store.js";
import {
  Check,
  CircleAlert,
  jsxRuntimeExports,
  LoaderCircle,
  reactExports,
  Search,
  useTranslation,
  Workflow,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Dialog$1 } from "../canvas/separator.jsx";
import { useViewerActive } from "../infra/use-viewer-active.js";
import { MEDIA_NODE_RADIUS, useCanvasBridge } from "./package.jsx";
import { useCanvasActions } from "./use-canvas-actions.js";
import { pickLocalized } from "../generation/normalize-skill-detail-metadata.js";
import { AddToChatIcon, FullscreenIcon$1 } from "../canvas/fullscreen-icon.jsx";
import { RunIcon } from "../canvas/file-missing-icon.jsx";
import { resolvePluginEditorPresentation } from "./resolve-panorama-generation-presentation.js";
import { NodeToolbar } from "./toolbar-item.jsx";
import { NodeBody } from "../canvas/node-body-inner.jsx";
import { Button$2 } from "../canvas/node-shell-inner.jsx";
import {
  DialogContent$1,
  DialogDescription$1,
  DialogHeader$1,
  DialogTitle$1,
} from "./use-preview-text.jsx";
import { HtmlViewer } from "../infra/create-html-iframe-pool-store.jsx";
import { Input$1 } from "./input.jsx";

function usePluginOpenRequest(nodeId) {
  return useHtmlFullscreenStore((s2) =>
    s2.nodeId === nodeId ? s2.pluginOpenRequest : null,
  );
}

function shouldShowComfyUiTemplateAction({
  currentWorkflowId,
  hasWorkflowContent,
  backendReady,
}) {
  return (
    backendReady !== false &&
    !currentWorkflowId?.trim() &&
    hasWorkflowContent !== true
  );
}

function shouldCreateComfyUiOpenRequest(isPreviewActive) {
  return !isPreviewActive;
}

function shouldAllowComfyUiPreviewInteraction(backendReady) {
  return backendReady !== true;
}

function createComfyUiWorkflowRequestId(nodeId, workflowId, workflowRevision) {
  return `${nodeId}:${workflowId}:${workflowRevision ?? 0}`;
}

function publishComfyUiRetryRequest({
  activeRequest,
  retryRequest,
  setActiveRequest,
  setLocalRequest,
}) {
  if (activeRequest) {
    setActiveRequest(retryRequest);
    setLocalRequest(retryRequest);
    return;
  }
  setLocalRequest(retryRequest);
}

function filterComfyUiWorkflows(workflows, query) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [...workflows];
  return workflows.filter((workflow) =>
    [
      workflow.title,
      workflow.name,
      workflow.short_desc ?? "",
      ...(workflow.tags ?? []),
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalized),
  );
}

const COMFYUI_PREVIEW_UNLOAD_AFTER_MS = 6e3;

const COMFYUI_PREVIEW_SCALE = 0.6;

const COMFYUI_PREVIEW_UNSCALED_PERCENT = `${100 / COMFYUI_PREVIEW_SCALE}%`;

function resolveWorkflowDisplayName(workflowName) {
  const trimmed = workflowName?.trim();
  return trimmed && !/^(?:user|template):/i.test(trimmed) ? trimmed : void 0;
}

export function ComfyUiPluginLauncher({
  nodeId,
  pluginId,
  filePath,
  displayName: displayName2,
  width,
  height,
  selected: selected2,
  currentWorkflowId,
  currentWorkflowName,
  templateCopyOrdinal,
  workflowRevision,
  hasWorkflowContent,
  comfyuiBackendReady,
  comfyuiWorkflowError,
  comfyuiWorkflowDeleted,
  comfyuiDeletedWorkflowName,
  comfyuiRunSummary,
  onReportAction,
}) {
  const { i18n, t: t2 } = useTranslation();
  const meta2 = usePluginMeta(pluginId);
  const {
    fetchComfyUiWorkflows,
    onAddPluginNodeToChat,
    onComfyUiDraftAction,
    onPluginEditorOpen,
  } = useCanvasBridge();
  const reportDraftAction = reactExports.useCallback(
    (action, workflowSource) => {
      try {
        onComfyUiDraftAction?.({
          action,
          ...(workflowSource
            ? {
                workflowSource,
              }
            : {}),
        });
      } catch {}
    },
    [onComfyUiDraftAction],
  );
  const { mergeNodeData } = useCanvasActions();
  const rawLang = i18n.language || "en-US";
  const locale = rawLang.startsWith("zh")
    ? "zh-CN"
    : rawLang.startsWith("en")
      ? "en-US"
      : rawLang;
  const name2 =
    (meta2 ? pickLocalized(meta2.name, locale) : "") || displayName2;
  const currentWorkflowLabel =
    resolveWorkflowDisplayName(currentWorkflowName) ??
    t2("canvas.comfyui.untitledWorkflow", "未命名工作流");
  const isWorkflowDeleted = comfyuiWorkflowDeleted === true;
  const workflowLabel = isWorkflowDeleted
    ? t2("canvas.comfyui.localWorkflowDeleted")
    : currentWorkflowLabel;
  const copySuffix =
    typeof templateCopyOrdinal === "number" && templateCopyOrdinal > 0
      ? t2("canvas.comfyui.copySuffix", {
          index: templateCopyOrdinal,
        })
      : void 0;
  const openLabel = t2("canvas.comfyui.openEditor", "全屏编辑");
  const showTemplateAction = shouldShowComfyUiTemplateAction({
    currentWorkflowId,
    hasWorkflowContent,
    backendReady: comfyuiBackendReady,
  });
  const runningCount = comfyuiRunSummary?.runningCount ?? 0;
  const queuedCount = comfyuiRunSummary?.queuedCount ?? 0;
  const hasActiveRuns = runningCount > 0 || queuedCount > 0;
  const progressLabel = t2("canvas.comfyui.runProgress", {
    running: runningCount,
    queued: queuedCount,
    defaultValue: "{{running}} running · {{queued}} queued",
  });
  const [templateDialogOpen, setTemplateDialogOpen] =
    reactExports.useState(false);
  const [workflows, setWorkflows] = reactExports.useState([]);
  const [workflowSearch, setWorkflowSearch] = reactExports.useState("");
  const [isLoadingWorkflows, setIsLoadingWorkflows] =
    reactExports.useState(false);
  const [workflowError, setWorkflowError] = reactExports.useState(null);
  const [pluginOpenRequest, setPluginOpenRequest] = reactExports.useState(null);
  const handledAgentOpenRequestIdRef = reactExports.useRef(null);
  const fullscreenApi = useHtmlFullscreenApi();
  const htmlViewerHandle = useHtmlViewerHandle(nodeId);
  const runInfo = usePluginRunInfo(nodeId);
  const [previewHostRef, isPreviewActive] = useViewerActive({
    unloadAfterMs: COMFYUI_PREVIEW_UNLOAD_AFTER_MS,
  });
  const [runPending, setRunPending] = reactExports.useState(false);
  const presentation = useHtmlViewerPresentation(nodeId);
  const isPresented = presentation !== null;
  const agentPluginOpenRequest = usePluginOpenRequest(nodeId);
  const defaultPresentation = resolvePluginEditorPresentation();
  const boundWorkflowOpenRequest = reactExports.useMemo(
    () =>
      currentWorkflowId
        ? {
            requestId: createComfyUiWorkflowRequestId(
              nodeId,
              currentWorkflowId,
              workflowRevision,
            ),
            command: "comfyui:load-workflow",
            workflow: workflowLabel,
            workflowId: currentWorkflowId,
            target: "current",
          }
        : null,
    // workflowId is the graph's authoritative identity. A title refresh must
    // not alter the iframe URL after it has mounted.
    [currentWorkflowId, nodeId, workflowLabel, workflowRevision],
  );
  reactExports.useEffect(() => {
    if (!workflowRevision || !currentWorkflowId || !isPresented) return;
    fullscreenApi.getState().enter(
      nodeId,
      {
        requestId: createComfyUiWorkflowRequestId(
          nodeId,
          currentWorkflowId,
          workflowRevision,
        ),
        command: "comfyui:load-workflow",
        workflow: workflowLabel,
        workflowId: currentWorkflowId,
        target: "current",
      },
      presentation ?? defaultPresentation,
    );
  }, [
    currentWorkflowId,
    defaultPresentation,
    fullscreenApi,
    isPresented,
    nodeId,
    presentation,
    workflowLabel,
    workflowRevision,
  ]);
  reactExports.useEffect(() => {
    if (!agentPluginOpenRequest) return;
    if (
      handledAgentOpenRequestIdRef.current === agentPluginOpenRequest.requestId
    )
      return;
    handledAgentOpenRequestIdRef.current = agentPluginOpenRequest.requestId;
    setPluginOpenRequest(agentPluginOpenRequest);
    if (
      agentPluginOpenRequest.workflowId &&
      (agentPluginOpenRequest.workflowId !== currentWorkflowId ||
        agentPluginOpenRequest.workflow !== currentWorkflowName)
    ) {
      mergeNodeData(nodeId, {
        currentWorkflowId: agentPluginOpenRequest.workflowId,
        currentWorkflowName:
          resolveWorkflowDisplayName(agentPluginOpenRequest.workflow) ??
          currentWorkflowName,
        comfyuiWorkflowError: void 0,
        comfyuiWorkflowDeleted: void 0,
        comfyuiDeletedWorkflowName: void 0,
      });
    }
  }, [
    agentPluginOpenRequest,
    currentWorkflowId,
    currentWorkflowName,
    mergeNodeData,
    nodeId,
  ]);
  reactExports.useEffect(() => {}, [
    defaultPresentation,
    isPresented,
    onPluginEditorOpen,
  ]);
  reactExports.useEffect(() => {
    if (!runPending || !runInfo?.hasMain) return;
    runInfo.invoke();
    setRunPending(false);
  }, [runInfo, runPending]);
  const openStage = reactExports.useCallback(() => {
    if (shouldCreateComfyUiOpenRequest(isPreviewActive)) {
      setPluginOpenRequest(
        currentWorkflowId
          ? {
              requestId: crypto.randomUUID(),
              command: "comfyui:load-workflow",
              workflow: workflowLabel,
              workflowId: currentWorkflowId,
              target: "current",
            }
          : {
              requestId: crypto.randomUUID(),
              command: "comfyui:load-workflow",
              workflow: t2("canvas.comfyui.untitledWorkflow", "未命名工作流"),
              target: "empty",
            },
      );
    }
    htmlViewerHandle?.activate();
    fullscreenApi.getState().enter(nodeId, void 0, defaultPresentation);
    onReportAction?.("fullscreen", "enter");
    reportDraftAction("editor_open");
  }, [
    currentWorkflowId,
    defaultPresentation,
    fullscreenApi,
    htmlViewerHandle,
    isPreviewActive,
    nodeId,
    onReportAction,
    reportDraftAction,
    t2,
    workflowLabel,
  ]);
  const handleRetryWorkflowLoad = reactExports.useCallback(() => {
    if (!currentWorkflowId) return;
    const retryRequest = {
      requestId: crypto.randomUUID(),
      command: "comfyui:load-workflow",
      workflow: workflowLabel,
      workflowId: currentWorkflowId,
      target: "current",
    };
    if (agentPluginOpenRequest) {
      handledAgentOpenRequestIdRef.current = retryRequest.requestId;
    }
    publishComfyUiRetryRequest({
      activeRequest: agentPluginOpenRequest,
      retryRequest,
      setActiveRequest: (request) =>
        fullscreenApi.setState({
          pluginOpenRequest: request,
        }),
      setLocalRequest: setPluginOpenRequest,
    });
    htmlViewerHandle?.activate();
  }, [
    agentPluginOpenRequest,
    currentWorkflowId,
    fullscreenApi,
    htmlViewerHandle,
    workflowLabel,
  ]);
  const openTemplateDialog = reactExports.useCallback(() => {
    setWorkflowSearch("");
    setWorkflowError(null);
    setTemplateDialogOpen(true);
  }, []);
  reactExports.useEffect(() => {
    if (!templateDialogOpen || !fetchComfyUiWorkflows) return;
    let cancelled = false;
    setIsLoadingWorkflows(true);
    setWorkflowError(null);
    fetchComfyUiWorkflows()
      .then((items) => {
        if (!cancelled) setWorkflows(items);
      })
      .catch((error) => {
        if (!cancelled) {
          setWorkflowError(
            error instanceof Error
              ? error.message
              : t2(
                  "canvas.comfyui.workflowLoadFailed",
                  "无法加载 ComfyUI 模板",
                ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingWorkflows(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchComfyUiWorkflows, t2, templateDialogOpen]);
  const filteredWorkflows = filterComfyUiWorkflows(workflows, workflowSearch);
  const selectWorkflow = reactExports.useCallback(
    (workflow) => {
      mergeNodeData(nodeId, {
        currentWorkflowId: workflow.id,
        currentWorkflowName: workflow.title,
        sourceTemplateId: workflow.source === "template" ? workflow.id : void 0,
        sourceTemplateName:
          workflow.source === "template" ? workflow.title : void 0,
        comfyuiWorkflowDirty: false,
        comfyuiWorkflowError: void 0,
        comfyuiWorkflowDeleted: void 0,
        comfyuiDeletedWorkflowName: void 0,
      });
      setPluginOpenRequest({
        requestId: crypto.randomUUID(),
        command: "comfyui:load-workflow",
        workflow: workflow.title,
        workflowId: workflow.id,
        target: "current",
      });
      setTemplateDialogOpen(false);
      reportDraftAction("template_selected", workflow.source);
    },
    [mergeNodeData, nodeId, reportDraftAction],
  );
  const handleRun = reactExports.useCallback(() => {
    htmlViewerHandle?.activate();
    if (runInfo?.hasMain) {
      runInfo.invoke();
      onReportAction?.("run", void 0, "registered_handler");
      return;
    }
    setRunPending(true);
    onReportAction?.("run", void 0, "pending_handler");
  }, [htmlViewerHandle, onReportAction, runInfo]);
  const handleAddToChat = reactExports.useCallback(() => {
    onAddPluginNodeToChat?.({
      nodeId,
      pluginId,
      name: workflowLabel,
    });
  }, [nodeId, onAddPluginNodeToChat, pluginId, workflowLabel]);
  const nodeToolbarActions = [
    ...(hasWorkflowContent === true
      ? [
          {
            id: "run",
            label: t2("canvas.comfyui.run", "运行"),
            icon: <RunIcon />,
            forceLabel: true,
            onClick: handleRun,
            dataActionUiId: "canvas.comfyui.run",
          },
        ]
      : []),
    {
      id: "fullscreen",
      label: openLabel,
      icon: <FullscreenIcon$1 />,
      onClick: openStage,
      dataActionUiId: "canvas.plugin-node.open-launcher",
    },
    {
      id: "add-to-chat",
      label: t2("canvas.addToChat"),
      icon: <AddToChatIcon />,
      onClick: handleAddToChat,
      dataActionUiId: "canvas.plugin-node.add-to-chat",
    },
  ];
  return (
    <>
      <NodeBody
        width={width}
        height={height}
        selected={selected2}
        variant="media"
        onDoubleClick={openStage}
      >
        <div
          className="flex h-full flex-col overflow-hidden rounded-lg border bg-card"
          style={{
            borderColor: "transparent",
            borderRadius: MEDIA_NODE_RADIUS,
          }}
        >
          <div
            ref={previewHostRef}
            className="relative min-h-0 flex-1 overflow-hidden bg-muted"
          >
            {isPreviewActive && (
              <div
                className="origin-top-left"
                style={{
                  width: COMFYUI_PREVIEW_UNSCALED_PERCENT,
                  height: COMFYUI_PREVIEW_UNSCALED_PERCENT,
                  transform: `scale(${COMFYUI_PREVIEW_SCALE})`,
                }}
              >
                <HtmlViewer
                  filePath={filePath ?? ""}
                  interactive={shouldAllowComfyUiPreviewInteraction(
                    comfyuiBackendReady,
                  )}
                  displayName={name2}
                  pluginOpenRequest={
                    agentPluginOpenRequest ??
                    pluginOpenRequest ??
                    boundWorkflowOpenRequest
                  }
                  supportsCanvasPresentation={defaultPresentation === "canvas"}
                />
              </div>
            )}
            {isWorkflowDeleted ? (
              <div
                className="absolute right-3 bottom-3 left-3 z-10 flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5"
                role="status"
              >
                <CircleAlert
                  className="mt-0.5 size-3.5 shrink-0 text-destructive"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <div className="min-w-0 text-xs leading-4">
                  <p className="font-medium text-destructive">
                    {t2("canvas.comfyui.localWorkflowDeleted")}
                  </p>
                  {comfyuiDeletedWorkflowName && (
                    <p
                      className="truncate text-muted-foreground"
                      title={comfyuiDeletedWorkflowName}
                    >
                      {comfyuiDeletedWorkflowName}
                    </p>
                  )}
                </div>
              </div>
            ) : comfyuiWorkflowError ? (
              <div
                className="absolute right-3 bottom-3 left-3 z-10 flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5"
                role="alert"
              >
                <CircleAlert
                  className="mt-0.5 size-3.5 shrink-0 text-destructive"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <div className="min-w-0 text-xs leading-4">
                  <p className="font-medium text-destructive">
                    {t2("canvas.comfyui.workflowLoadErrorTitle")}
                  </p>
                  <p
                    className="truncate text-muted-foreground"
                    title={comfyuiWorkflowError}
                  >
                    {comfyuiWorkflowError}
                  </p>
                </div>
                {currentWorkflowId && (
                  <Button$2
                    type="button"
                    variant="outline"
                    size="sm"
                    className="nodrag ml-auto h-6 shrink-0 px-2 text-xs"
                    data-action-ui-id="canvas.comfyui.workflow-load-retry"
                    onClick={handleRetryWorkflowLoad}
                  >
                    {t2("common.retry", "重试")}
                  </Button$2>
                )}
              </div>
            ) : hasActiveRuns ? (
              <div
                className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                role="status"
              >
                <LoaderCircle
                  className="size-3 animate-spin"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <span>{progressLabel}</span>
              </div>
            ) : null}
          </div>
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-t bg-card px-3">
            <div className="flex min-w-0 items-center gap-2">
              <Workflow
                className="size-4 shrink-0 text-muted-foreground"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p
                  className="truncate text-sm font-medium text-foreground"
                  title={workflowLabel}
                >
                  {workflowLabel}
                </p>
                {copySuffix && (
                  <p
                    className="truncate text-xs text-muted-foreground"
                    title={copySuffix}
                  >
                    {copySuffix}
                  </p>
                )}
              </div>
            </div>
            {showTemplateAction && (
              <Button$2
                size="sm"
                variant="ghost"
                className="comfyui-template-action shrink-0"
                onClick={(event) => {
                  event.stopPropagation();
                  openTemplateDialog();
                }}
                onMouseDown={(event) => event.stopPropagation()}
                data-action-ui-id="canvas.plugin-node.use-template"
              >
                {t2("canvas.comfyui.useTemplate", "使用模板")}
              </Button$2>
            )}
          </div>
        </div>
      </NodeBody>
      <NodeToolbar items={nodeToolbarActions} visible={!!selected2} />
      <Dialog$1 open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent$1
          className="max-w-2xl"
          data-action-ui-id="canvas.comfyui.workflow-dialog"
        >
          <DialogHeader$1>
            <DialogTitle$1>
              {t2("canvas.comfyui.chooseWorkflow", "选择 ComfyUI 模板")}
            </DialogTitle$1>
            <DialogDescription$1>
              {t2(
                "canvas.comfyui.chooseWorkflowDesc",
                "选择后将在当前节点的编辑器中打开。",
              )}
            </DialogDescription$1>
          </DialogHeader$1>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input$1
              value={workflowSearch}
              onChange={(event) => setWorkflowSearch(event.target.value)}
              placeholder={t2("canvas.comfyui.searchWorkflow", "搜索模板")}
              className="pl-9"
              data-action-ui-id="canvas.comfyui.workflow-search"
            />
          </div>
          <div className="max-h-[min(55vh,32rem)] space-y-2 overflow-y-auto pr-1">
            {isLoadingWorkflows && (
              <div className="py-10 text-center text-muted-foreground">
                {t2("common.loading", "加载中…")}
              </div>
            )}
            {!isLoadingWorkflows && workflowError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
                {workflowError}
              </div>
            )}
            {!isLoadingWorkflows &&
              !workflowError &&
              filteredWorkflows.length === 0 && (
                <div className="py-10 text-center text-muted-foreground">
                  {t2("canvas.comfyui.noWorkflows", "没有可用模板")}
                </div>
              )}
            {!isLoadingWorkflows &&
              !workflowError &&
              filteredWorkflows.map((workflow) => {
                const isCurrent = workflow.id === currentWorkflowId;
                return (
                  <button
                    key={workflow.id}
                    type="button"
                    className="flex w-full items-start gap-3 rounded-md border border-border bg-card p-3 text-left transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                    onClick={() => selectWorkflow(workflow)}
                    data-action-ui-id="canvas.comfyui.workflow-select"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-card-foreground">
                          {workflow.title}
                        </span>
                        {isCurrent && (
                          <Check className="size-4 shrink-0 text-foreground" />
                        )}
                      </div>
                      <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                        <span>
                          {workflow.source === "template"
                            ? t2("canvas.comfyui.officialTemplate", "官方模板")
                            : t2("canvas.comfyui.userWorkflow", "我的工作流")}
                        </span>
                        {typeof workflow.node_count === "number" && (
                          <span>
                            {t2("canvas.comfyui.nodeCount", "{{count}} 节点", {
                              count: workflow.node_count,
                            })}
                          </span>
                        )}
                      </div>
                      {workflow.short_desc && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {workflow.short_desc}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </DialogContent$1>
      </Dialog$1>
    </>
  );
}
