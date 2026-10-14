// plugin-node-inner.jsx
import { CompositedSvg, reactExports, useTranslation } from "../vendor.js";
import { Position } from "../vendor-fork/xyflow/system/index.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { FileViewerRouter } from "./pdf-viewer.jsx";
import {
  useHtmlFullscreenApi,
  useHtmlViewerHandle,
  useIsHtmlFullscreen,
  usePluginMeta,
  usePluginRunInfo,
} from "../infra/use-plugin-metadata-store.js";
import { pickLocalized } from "../generation/normalize-skill-detail-metadata.js";
import { PluginIcon, RunIcon } from "../canvas/file-missing-icon.jsx";
import { NodeBody } from "../canvas/node-body-inner.jsx";
import { NodeResizeFrame } from "../infra/node-resize-frame-inner.jsx";
import {
  useAssetMeta,
  useCanvasBridge,
  useCanvasIsBoxSelecting,
  useCanvasIsMultiSelect,
} from "./package.jsx";
import {
  FullscreenIcon,
  MinimizeIcon,
  useCanvasNodeIsDragging,
} from "../canvas/fullscreen-icon.jsx";
import { RefreshIcon } from "../canvas/generating-media-area.jsx";
import {
  FILE_PREVIEW_MIN_SIZE,
  FILE_PREVIEW_SIZE,
} from "../canvas/is-reexecutable-generation-node.js";
import {
  CLIP_STUDIO_PLUGIN_ID,
  COMFYUI_PLUGIN_ID,
  DIRECTOR_STAGE_PLUGIN_ID,
  isPluginEditorSurface,
  shouldShowPluginNodeSourceAffordance,
} from "./resolve-panorama-generation-presentation.js";
import { NodeToolbar } from "./toolbar-item.jsx";
import { NodeShell } from "../canvas/node-shell-inner.jsx";
import { NodeHeader } from "../canvas/node-header-inner.jsx";
import { NodeHandles } from "../canvas/proximity-handle-inner.jsx";
import { ComfyUiPluginLauncher } from "./comfy-ui-plugin-launcher.jsx";
import {
  DirectorStageHeaderIcon,
  VideoEditorHeaderIcon,
} from "./director-stage-header-icon.jsx";
import { PluginLauncher } from "./plugin-launcher.jsx";
function PluginPreview({
  selected: isSelected,
  interactive,
  filePath,
  pluginId,
  displayName,
  extension,
  width,
  height,
}) {
  const paneWidth = width - 2;
  const { i18n } = useTranslation();
  const pluginMeta = usePluginMeta(pluginId);
  const rawLang = i18n.language || "en-US";
  const locale = rawLang.startsWith("zh")
    ? "zh-CN"
    : rawLang.startsWith("en")
      ? "en-US"
      : rawLang;
  const localizedName = pluginMeta ? pickLocalized(pluginMeta.name, locale) : "";
  const headerName = localizedName || displayName;
  const iconUrl = pluginMeta ? pickLocalized(pluginMeta.iconUrl, locale) : "";
  const [iconBroken, setIconBroken] = reactExports.useState(false);
  const showIcon = !!iconUrl && !iconBroken;
  return (
    <NodeBody
      width={width}
      height={height}
      selected={isSelected}
      variant="media"
    >
      <div
        className="flex h-full flex-col overflow-hidden rounded-lg"
        style={{
          background: "var(--canvas-node-bg, #fff)",
          border: "1px solid transparent",
        }}
      >
        <div className="flex items-center justify-between gap-2 border-[var(--canvas-node-border)] border-b px-4 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
              {showIcon ? (
                // Manifest-supplied icon. `referrerPolicy="no-referrer"`
                // keeps relative `/api/plugins/<id>/static/...` requests
                // out of the gateway log noise; `draggable=false` prevents
                // the iframe-host area from receiving an accidental
                // image-drag while the user pans the canvas.
                <img
                  src={iconUrl}
                  alt=""
                  className="h-full w-full object-contain"
                  draggable={false}
                  referrerPolicy="no-referrer"
                  onError={() => setIconBroken(true)}
                />
              ) : (
                <PluginIcon />
              )}
            </div>
            <div
              className="truncate text-xs text-foreground"
              title={headerName}
            >
              {headerName}
            </div>
          </div>
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground"
            aria-hidden="true"
          >
            <CompositedSvg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="5" r="1" />
              <circle cx="19" cy="5" r="1" />
              <circle cx="5" cy="5" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
              <circle cx="12" cy="19" r="1" />
              <circle cx="19" cy="19" r="1" />
              <circle cx="5" cy="19" r="1" />
            </CompositedSvg>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <FileViewerRouter
            filePath={filePath}
            extension={extension}
            displayName={displayName}
            paneWidth={paneWidth}
            interactive={interactive}
          />
        </div>
      </div>
    </NodeBody>
  );
}
export function PluginNodeInner({
  id: nodeId,
  data: nodeData,
  selected: isSelected,
  width,
  height,
}) {
  const { i18n, t } = useTranslation();
  const assetMeta = useAssetMeta(nodeId);
  const persisted = nodeData;
  const { onPluginAction } = useCanvasBridge();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isDragging = useCanvasNodeIsDragging(nodeId);
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const [previewWidth, setPreviewWidth] = reactExports.useState(
    typeof width === "number" && width > 0 ? width : FILE_PREVIEW_SIZE.width,
  );
  const [previewHeight, setPreviewHeight] = reactExports.useState(
    typeof height === "number" && height > 0
      ? height
      : FILE_PREVIEW_SIZE.height,
  );
  reactExports.useEffect(() => {
    if (typeof width === "number" && width > 0) setPreviewWidth(width);
  }, [width]);
  reactExports.useEffect(() => {
    if (typeof height === "number" && height > 0) setPreviewHeight(height);
  }, [height]);
  const filePath = assetMeta?.path ?? persisted?.path;
  const displayName =
    assetMeta?.name ||
    persisted?.name ||
    filePath?.split("/").pop() ||
    t("canvas.file.untitled", "Untitled");
  const extension = ".html";
  const pluginMeta = usePluginMeta(persisted?.pluginId);
  const rawLang = i18n.language || "en-US";
  const locale = rawLang.startsWith("zh")
    ? "zh-CN"
    : rawLang.startsWith("en")
      ? "en-US"
      : rawLang;
  const savedName = assetMeta?.name || persisted?.name;
  const isCustomName =
    savedName &&
    pluginMeta &&
    !Object.values(pluginMeta.name).includes(savedName);
  const headerName =
    (!isCustomName && pickLocalized(pluginMeta?.name, locale)) || displayName;
  const displayMode =
    pluginMeta?.displayMode ?? persisted?.pluginDisplayMode ?? "inline";
  const isLauncher = displayMode === "launcher";
  const isComfyUi = persisted?.pluginId === COMFYUI_PLUGIN_ID;
  const isEditorSurface =
    isLauncher && isPluginEditorSurface(pluginMeta?.agent);
  const runInfo = usePluginRunInfo(nodeId);
  const htmlViewerHandle = useHtmlViewerHandle(nodeId);
  const isHtmlFullscreen = useIsHtmlFullscreen(nodeId);
  const fullscreenApi = useHtmlFullscreenApi();
  const reportPluginAction = reactExports.useCallback(
    (action, actionState, runPath) => {
      if (!persisted.pluginId) return;
      onPluginAction?.({
        pluginId: persisted.pluginId,
        pluginVersion: persisted.pluginVersion,
        pluginInstanceId: nodeId,
        action,
        ...(actionState
          ? {
              state: actionState,
            }
          : {}),
        ...(runPath
          ? {
              runPath,
            }
          : {}),
      });
    },
    [nodeId, onPluginAction, persisted.pluginId, persisted.pluginVersion],
  );
  const enterHtmlFullscreen = reactExports.useCallback(() => {
    if (!htmlViewerHandle) return;
    fullscreenApi.getState().enter(nodeId);
    reportPluginAction("fullscreen", "enter");
  }, [nodeId, fullscreenApi, htmlViewerHandle, reportPluginAction]);
  const exitHtmlFullscreen = reactExports.useCallback(() => {
    fullscreenApi.getState().exit(nodeId);
    reportPluginAction("fullscreen", "exit");
  }, [nodeId, fullscreenApi, reportPluginAction]);
  const refreshPlugin = reactExports.useCallback(() => {
    if (!htmlViewerHandle) return;
    htmlViewerHandle.reload();
    reportPluginAction("refresh");
  }, [htmlViewerHandle, reportPluginAction]);
  const runPlugin = reactExports.useCallback(() => {
    if (!runInfo?.hasMain) return;
    runInfo.invoke();
    reportPluginAction("run");
  }, [reportPluginAction, runInfo]);
  const toolbarItems = [
    // Launcher mode has no persistent inline iframe — refresh / fullscreen
    // toggles would act on a viewer that only exists while the overlay is
    // open, so they are omitted; the card owns its fullscreen/template
    // entry points. (htmlViewerHandle is normally absent here anyway; the
    // explicit gate covers the grace window where the hidden iframe is
    // still registered.)
    ...(htmlViewerHandle && !isLauncher
      ? [
          {
            id: "refresh",
            label: t("canvas.file.refresh", "刷新"),
            icon: <RefreshIcon />,
            onClick: refreshPlugin,
            dataActionUiId: "canvas.plugin-node.refresh",
          },
          {
            id: "fullscreen",
            label: isHtmlFullscreen
              ? t("canvas.file.exitFullscreen", "退出全屏")
              : t("canvas.file.enterFullscreen", "全屏预览"),
            icon: isHtmlFullscreen ? <MinimizeIcon /> : <FullscreenIcon />,
            onClick: isHtmlFullscreen
              ? exitHtmlFullscreen
              : enterHtmlFullscreen,
            active: isHtmlFullscreen,
            dataActionUiId: "canvas.plugin-node.fullscreen",
          },
        ]
      : []),
    ...(runInfo?.hasMain && !isLauncher
      ? [
          {
            id: "run",
            label: t("canvas.file.run", "执行"),
            icon: <RunIcon />,
            onClick: runPlugin,
            dataActionUiId: "canvas.plugin-node.run",
          },
        ]
      : []),
  ];
  const isInteractiveSelect = !isMultiSelect && !isDragging && !isBoxSelecting;
  const isPreviewInteractive = !!isSelected && isInteractiveSelect;
  const handlePreviewResize = reactExports.useCallback((newW, newH) => {
    setPreviewWidth(newW);
    setPreviewHeight(newH);
  }, []);
  const handleDoubleClick = reactExports.useCallback(() => {
    if (isLauncher) {
      fullscreenApi.getState().enter(nodeId);
      reportPluginAction("fullscreen", "enter");
    }
  }, [isLauncher, fullscreenApi, nodeId, reportPluginAction]);
  return (
    <NodeShell
      width={previewWidth}
      onDoubleClick={isLauncher ? handleDoubleClick : void 0}
    >
      <NodeHeader
        nodeType="file"
        name={headerName}
        maxWidth={previewWidth}
        selected={isSelected}
        icon={
          persisted.pluginId === DIRECTOR_STAGE_PLUGIN_ID ? (
            <DirectorStageHeaderIcon />
          ) : persisted.pluginId === CLIP_STUDIO_PLUGIN_ID ? (
            <VideoEditorHeaderIcon />
          ) : (
            void 0
          )
        }
      />
      {isLauncher ? (
        isComfyUi ? (
          <ComfyUiPluginLauncher
            nodeId={nodeId}
            pluginId={persisted.pluginId}
            filePath={filePath}
            displayName={displayName}
            width={previewWidth}
            height={previewHeight}
            selected={!!isSelected}
            currentWorkflowId={persisted.currentWorkflowId}
            currentWorkflowName={persisted.currentWorkflowName}
            templateCopyOrdinal={persisted.comfyuiTemplateCopyOrdinal}
            workflowRevision={persisted.comfyuiWorkflowRevision}
            hasWorkflowContent={persisted.hasWorkflowContent}
            comfyuiBackendReady={persisted.comfyuiBackendReady}
            comfyuiWorkflowError={persisted.comfyuiWorkflowError}
            comfyuiWorkflowDeleted={persisted.comfyuiWorkflowDeleted}
            comfyuiDeletedWorkflowName={persisted.comfyuiDeletedWorkflowName}
            comfyuiRunSummary={persisted.comfyuiRunSummary}
            onReportAction={reportPluginAction}
          />
        ) : (
          <PluginLauncher
            nodeId={nodeId}
            pluginId={persisted.pluginId}
            filePath={filePath}
            displayName={displayName}
            width={previewWidth}
            height={previewHeight}
            selected={!!isSelected}
            onReportAction={reportPluginAction}
            editorSurface={isEditorSurface}
          />
        )
      ) : (
        <PluginPreview
          selected={isSelected}
          interactive={isPreviewInteractive}
          filePath={filePath}
          {...(persisted?.pluginId
            ? {
                pluginId: persisted.pluginId,
              }
            : {})}
          displayName={displayName}
          extension={extension}
          width={previewWidth}
          height={previewHeight}
        />
      )}
      {isSelected && isInteractiveSelect && toolbarItems.length > 0 && (
        <NodeToolbar items={toolbarItems} visible={true} />
      )}
      {isSelected && (
        <NodeResizeFrame
          nodeId={nodeId}
          minWidth={FILE_PREVIEW_MIN_SIZE.width}
          minHeight={FILE_PREVIEW_MIN_SIZE.height}
          onResize={handlePreviewResize}
        />
      )}
      <NodeHandles
        nodeId={nodeId}
        selected={!!isSelected}
        showSourceAffordance={shouldShowPluginNodeSourceAffordance(
          persisted?.pluginId,
        )}
        sourcePosition={Position.Left}
      />
    </NodeShell>
  );
}
