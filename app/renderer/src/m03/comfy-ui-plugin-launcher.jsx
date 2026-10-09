// comfy-ui-plugin-launcher.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  useCanvasBridge,
  useCanvasActions,
  reactExports,
  useHtmlFullscreenApi,
  useHtmlViewerPresentation,
  usePluginMeta,
  pickLocalized,
  useHtmlViewerHandle,
  usePluginRunInfo,
  useViewerActive,
  usePluginOpenRequest,
  MEDIA_NODE_RADIUS,
  CircleAlert,
  LoaderCircle,
  Workflow,
  Dialog$1,
  Search,
  Check,
  CompositedSvg,
  reactDomExports,
  MoreHorizontal,
} from "../vendor.js";
import { AddToChatIcon, FullscreenIcon$1, RunIcon } from "../m01/generating-media-area.jsx";
import { resolvePluginEditorPresentation } from "../m02/canvas-image.jsx";
import { NodeToolbar, useCanvasShortcutGuard$1 } from "../m01/use-lightbox-media-actions.jsx";
import { NodeBody, Button$2 } from "../m01/use-media-node-actions.jsx";
import {
  DialogContent$1,
  DialogHeader$1,
  DialogTitle$1,
  DialogDescription$1,
} from "../m02/thumb-chip.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  COMFYUI_PREVIEW_SCALE,
  COMFYUI_PREVIEW_UNLOAD_AFTER_MS,
  HtmlViewer,
  Input$1,
  createComfyUiWorkflowRequestId,
  filterComfyUiWorkflows,
  publishComfyUiRetryRequest,
  shouldAllowComfyUiPreviewInteraction,
  shouldCreateComfyUiOpenRequest,
  shouldShowComfyUiTemplateAction,
} from "./use-plugin-host.jsx";
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
  const { fetchComfyUiWorkflows, onAddPluginNodeToChat, onComfyUiDraftAction, onPluginEditorOpen } =
    useCanvasBridge();
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
  const locale = rawLang.startsWith("zh") ? "zh-CN" : rawLang.startsWith("en") ? "en-US" : rawLang;
  const name2 = (meta2 ? pickLocalized(meta2.name, locale) : "") || displayName2;
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
  const [templateDialogOpen, setTemplateDialogOpen] = reactExports.useState(false);
  const [workflows, setWorkflows] = reactExports.useState([]);
  const [workflowSearch, setWorkflowSearch] = reactExports.useState("");
  const [isLoadingWorkflows, setIsLoadingWorkflows] = reactExports.useState(false);
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
            requestId: createComfyUiWorkflowRequestId(nodeId, currentWorkflowId, workflowRevision),
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
        requestId: createComfyUiWorkflowRequestId(nodeId, currentWorkflowId, workflowRevision),
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
    if (handledAgentOpenRequestIdRef.current === agentPluginOpenRequest.requestId) return;
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
          resolveWorkflowDisplayName(agentPluginOpenRequest.workflow) ?? currentWorkflowName,
        comfyuiWorkflowError: void 0,
        comfyuiWorkflowDeleted: void 0,
        comfyuiDeletedWorkflowName: void 0,
      });
    }
  }, [agentPluginOpenRequest, currentWorkflowId, currentWorkflowName, mergeNodeData, nodeId]);
  reactExports.useEffect(() => {}, [defaultPresentation, isPresented, onPluginEditorOpen]);
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
  }, [agentPluginOpenRequest, currentWorkflowId, fullscreenApi, htmlViewerHandle, workflowLabel]);
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
              : t2("canvas.comfyui.workflowLoadFailed", "无法加载 ComfyUI 模板"),
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
        sourceTemplateName: workflow.source === "template" ? workflow.title : void 0,
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
          <div ref={previewHostRef} className="relative min-h-0 flex-1 overflow-hidden bg-muted">
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
                  interactive={shouldAllowComfyUiPreviewInteraction(comfyuiBackendReady)}
                  displayName={name2}
                  pluginOpenRequest={
                    agentPluginOpenRequest ?? pluginOpenRequest ?? boundWorkflowOpenRequest
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
                  <p className="truncate text-muted-foreground" title={comfyuiWorkflowError}>
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
                <p className="truncate text-sm font-medium text-foreground" title={workflowLabel}>
                  {workflowLabel}
                </p>
                {copySuffix && (
                  <p className="truncate text-xs text-muted-foreground" title={copySuffix}>
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
        <DialogContent$1 className="max-w-2xl" data-action-ui-id="canvas.comfyui.workflow-dialog">
          <DialogHeader$1>
            <DialogTitle$1>
              {t2("canvas.comfyui.chooseWorkflow", "选择 ComfyUI 模板")}
            </DialogTitle$1>
            <DialogDescription$1>
              {t2("canvas.comfyui.chooseWorkflowDesc", "选择后将在当前节点的编辑器中打开。")}
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
            {!isLoadingWorkflows && !workflowError && filteredWorkflows.length === 0 && (
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
                        {isCurrent && <Check className="size-4 shrink-0 text-foreground" />}
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
export function DirectorStageHeaderIcon({ size: size2 = 14, className } = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M22.4351 17.4581C22.4351 17.6416 22.3371 17.8082 22.1695 17.9025L12.2095 23.3966C12.1321 23.4379 12.0531 23.4581 11.9654 23.4581C11.9099 23.4581 11.8451 23.445 11.7779 23.4181L11.7105 23.3868L1.81793 17.8907C1.74166 17.8474 1.67775 17.7848 1.63336 17.7091C1.59989 17.652 1.57874 17.5888 1.56989 17.5236L1.565 17.4572V7.98938L10.4654 12.8448V22.1281L11.233 21.6398L13.233 20.3702L13.4654 20.2228V12.8273L22.4351 7.69836V17.4581Z"
        fill="currentColor"
        stroke="currentColor"
      />
      <path
        d="M11.965 10.808H11.955L11.96 10.805L11.965 10.808ZM11.155 0.247008C11.655 -0.022992 12.265 -0.032992 12.775 0.247008L21.815 5.17701L11.959 10.805L1.97501 5.35801L11.155 0.247008Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
export function VideoEditorHeaderIcon({ size: size2 = 14, className } = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M19 2C20.6569 2 22 3.34315 22 5V19C22 20.6569 20.6569 22 19 22H5C3.34315 22 2 20.6569 2 19V5C2 3.34315 3.34315 2 5 2H19ZM17.707 6.29297C17.3165 5.90266 16.6824 5.90252 16.292 6.29297L11.999 10.585L10.8252 9.41113C10.936 9.12848 11 8.82196 11 8.5C11 7.11929 9.88071 6 8.5 6C7.11929 6 6 7.11929 6 8.5C6 9.88071 7.11929 11 8.5 11C8.82196 11 9.12848 10.936 9.41113 10.8252L10.585 11.999L9.41016 13.1729C9.12792 13.0624 8.82138 13 8.5 13C7.11929 13 6 14.1193 6 15.5C6 16.8807 7.11929 18 8.5 18C9.88071 18 11 16.8807 11 15.5C11 15.1777 10.9362 14.8708 10.8252 14.5879L17.707 7.70703C18.0973 7.31656 18.0973 6.68344 17.707 6.29297ZM15.5273 14.1133C15.1368 13.7228 14.5038 13.7228 14.1133 14.1133C13.7228 14.5038 13.7228 15.1368 14.1133 15.5273L16.293 17.707C16.6835 18.0972 17.3166 18.0974 17.707 17.707C18.0975 17.3166 18.0972 16.6835 17.707 16.293L15.5273 14.1133ZM8.5 15C8.63434 15 8.75587 15.0534 8.8457 15.1396C8.84812 15.1421 8.85009 15.145 8.85254 15.1475C8.85459 15.1495 8.85731 15.1513 8.85938 15.1533C8.94615 15.2433 9 15.3652 9 15.5C9 15.7761 8.77614 16 8.5 16C8.22386 16 8 15.7761 8 15.5C8 15.2239 8.22386 15 8.5 15ZM8.5 8C8.77614 8 9 8.22386 9 8.5C9 8.77614 8.77614 9 8.5 9C8.22386 9 8 8.77614 8 8.5C8 8.22386 8.22386 8 8.5 8Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
const CanvasRootElementContext = reactExports.createContext(null);
export const CanvasRootElementProvider = CanvasRootElementContext.Provider;
export function useCanvasRootElement() {
  return reactExports.useContext(CanvasRootElementContext);
}
const PLUGIN_EDITOR_OVERLAY_MESSAGE = "hilo:plugin-editor-overlay";
const PLUGIN_EDITOR_OVERLAY_ACTION_MESSAGE = "hilo:plugin-editor-overlay-action";
function isFiniteNumber$1(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function isOverlayItem(value) {
  if (!value || typeof value !== "object") return false;
  const item = value;
  if (item.separator === true) return true;
  return typeof item.type === "string" && typeof item.label === "string";
}
function resolveCssColor$1(value, fallback) {
  if (typeof value !== "string" || value.length > 128) return fallback;
  return /^(?:#[\da-f]{3,8}|(?:rgb|rgba|hsl|hsla|oklab|oklch)\([^;{}]*\))$/i.test(value)
    ? value
    : fallback;
}
function resolvePluginEditorOverlayModel(data2) {
  if (!data2 || typeof data2 !== "object") return null;
  const message2 = data2;
  if (message2.type !== PLUGIN_EDITOR_OVERLAY_MESSAGE || message2.open !== true) return null;
  if (
    typeof message2.destination !== "string" ||
    !isFiniteNumber$1(message2.left) ||
    !isFiniteNumber$1(message2.top) ||
    !Array.isArray(message2.items) ||
    !message2.items.every(isOverlayItem)
  ) {
    return null;
  }
  return {
    destination: message2.destination,
    left: Math.max(0, message2.left),
    top: Math.max(0, message2.top),
    items: message2.items,
    customLabel: message2.customLabel ?? "Custom export...",
    customDescription: message2.customDescription ?? "Full export settings",
    bestMatchLabel: message2.bestMatchLabel ?? "Best match",
    palette: {
      rowBackground: resolveCssColor$1(message2.palette?.rowBackground, "var(--muted)"),
      iconBackground: resolveCssColor$1(message2.palette?.iconBackground, "var(--muted)"),
      iconColor: resolveCssColor$1(message2.palette?.iconColor, "var(--foreground)"),
    },
  };
}
export function PluginEditorSurface({ children: children2, visible, onContainerChange }) {
  const canvasRootEl = useCanvasRootElement();
  const pinnedRootRef = reactExports.useRef(null);
  if (pinnedRootRef.current === null && canvasRootEl) pinnedRootRef.current = canvasRootEl;
  const portalTarget = pinnedRootRef.current;
  const [, forceRender] = reactExports.useState(0);
  reactExports.useEffect(() => {
    if (canvasRootEl && portalTarget === null) forceRender((n2) => n2 + 1);
  }, [canvasRootEl, portalTarget]);
  const containerRef = reactExports.useRef(null);
  const [overlayModel, setOverlayModel] = reactExports.useState(null);
  const setContainerRef = reactExports.useCallback(
    (element2) => {
      containerRef.current = element2;
      onContainerChange?.(element2);
    },
    [onContainerChange],
  );
  useCanvasShortcutGuard$1(visible, containerRef);
  reactExports.useEffect(() => {
    if (!visible) {
      setOverlayModel(null);
      return;
    }
    const onMessage = (event) => {
      const container = containerRef.current;
      const iframe = container?.querySelector("iframe");
      if (!container || !iframe || event.source !== iframe.contentWindow) return;
      const data2 = event.data;
      if (data2?.type !== PLUGIN_EDITOR_OVERLAY_MESSAGE) return;
      if (data2.open !== true) {
        setOverlayModel(null);
        return;
      }
      setOverlayModel(resolvePluginEditorOverlayModel(data2));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [visible]);
  const runOverlayAction = reactExports.useCallback((action, destination) => {
    const iframe = containerRef.current?.querySelector("iframe");
    if (!iframe) return;
    iframe.contentWindow?.postMessage(
      {
        type: PLUGIN_EDITOR_OVERLAY_ACTION_MESSAGE,
        destination,
        action,
      },
      "*",
    );
  }, []);
  const overlayStyle = overlayModel
    ? {
        left: overlayModel.left,
        top: overlayModel.top,
        transform: "scale(0.8)",
        transformOrigin: "top left",
        "--clip-studio-export-row-bg": overlayModel.palette.rowBackground,
      }
    : void 0;
  if (!portalTarget) return null;
  return reactDomExports.createPortal(
    <div
      ref={setContainerRef}
      role="dialog"
      data-canvas-chrome="true"
      data-plugin-editor-surface="true"
      data-plugin-editor-overlay-open={overlayModel ? "true" : "false"}
      data-visible={visible ? "true" : "false"}
      className="absolute inset-0 z-[10100] flex flex-col"
      style={{
        background: "var(--canvas-node-bg, #fff)",
        // Hidden-but-mounted during the launcher's unmount grace window:
        // `display:none` would not reload the iframe, but it does drop layout
        // and can reset scroll/media state, so we keep it laid out and merely
        // invisible + non-interactive.
        visibility: visible ? "visible" : "hidden",
        pointerEvents: visible ? "auto" : "none",
      }}
      inert={!visible}
      onKeyDown={(e2) => e2.stopPropagation()}
      onKeyUp={(e2) => e2.stopPropagation()}
    >
      {children2}
      {overlayModel ? (
        <div
          data-action-ui-id="clip-studio-export-host-preset-panel"
          className="absolute z-[10150] max-h-[400px] w-[19rem] overflow-y-auto rounded-lg border border-border bg-popover p-3 shadow-lg transition-[top] duration-200 ease-out animate-in fade-in-0 slide-in-from-left-1 motion-reduce:animate-none motion-reduce:transition-none"
          style={overlayStyle}
        >
          <div
            key={overlayModel.destination}
            className="space-y-1 animate-in fade-in-0 slide-in-from-left-1 duration-150 ease-out motion-reduce:animate-none"
          >
            {overlayModel.items.map((item) => {
              if (item.separator) {
                return <div key={"separator"} className="my-1 h-px bg-border" />;
              }
              return (
                <button
                  key={item.type}
                  type="button"
                  data-action-ui-id={`clip-studio-export-host-${overlayModel.destination}-${item.type}`}
                  className={`flex w-full items-center gap-3 rounded-sm p-3 text-left text-foreground hover:bg-[var(--clip-studio-export-row-bg)] ${item.recommended ? "bg-muted/50" : ""}`}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    runOverlayAction(item.type ?? "", overlayModel.destination);
                  }}
                  onClick={(event) => {
                    if (event.detail !== 0) return;
                    runOverlayAction(item.type ?? "", overlayModel.destination);
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[13px] font-medium">{item.label}</span>
                      {item.recommended ? (
                        <span className="shrink-0 rounded-full border border-foreground/70 px-1.5 py-0.5 text-[10px] text-foreground/70 [border-width:var(--divider-width)]">
                          {overlayModel.bestMatchLabel}
                        </span>
                      ) : null}
                    </span>
                    {item.description ? (
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              data-action-ui-id={`clip-studio-export-host-${overlayModel.destination}-custom`}
              className="flex w-full items-center gap-3 rounded-sm p-3 text-left text-foreground hover:bg-[var(--clip-studio-export-row-bg)]"
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                runOverlayAction("custom", overlayModel.destination);
              }}
              onClick={(event) => {
                if (event.detail !== 0) return;
                runOverlayAction("custom", overlayModel.destination);
              }}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">
                  {overlayModel.customLabel}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {overlayModel.customDescription}
                </span>
              </span>
              <MoreHorizontal size={14} className="shrink-0 text-muted-foreground" />
            </button>
          </div>
        </div>
      ) : null}
    </div>,
    portalTarget,
  );
}
