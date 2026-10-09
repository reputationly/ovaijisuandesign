// plugin-node-inner.jsx
import {
  CompositedSvg,
  Position,
  reactExports,
  useTranslation,
} from "../vendor.js";
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
  selected: selected2,
  interactive,
  filePath,
  pluginId,
  displayName: displayName2,
  extension: extension2,
  width,
  height,
}) {
  const paneWidth = width - 2;
  const { i18n } = useTranslation();
  const meta2 = usePluginMeta(pluginId);
  const rawLang = i18n.language || "en-US";
  const locale = rawLang.startsWith("zh")
    ? "zh-CN"
    : rawLang.startsWith("en")
      ? "en-US"
      : rawLang;
  const localizedName = meta2 ? pickLocalized(meta2.name, locale) : "";
  const headerName = localizedName || displayName2;
  const iconUrl = meta2 ? pickLocalized(meta2.iconUrl, locale) : "";
  const [iconBroken, setIconBroken] = reactExports.useState(false);
  const showIcon = !!iconUrl && !iconBroken;
  return (
    <NodeBody
      width={width}
      height={height}
      selected={selected2}
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
            extension={extension2}
            displayName={displayName2}
            paneWidth={paneWidth}
            interactive={interactive}
          />
        </div>
      </div>
    </NodeBody>
  );
}
export function PluginNodeInner({
  id: id2,
  data: data2,
  selected: selected2,
  width,
  height,
}) {
  const { i18n, t: t2 } = useTranslation();
  const meta2 = useAssetMeta(id2);
  const persisted = data2;
  const { onPluginAction } = useCanvasBridge();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isDragging = useCanvasNodeIsDragging(id2);
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
  const filePath = meta2?.path ?? persisted?.path;
  const displayName2 =
    meta2?.name ||
    persisted?.name ||
    filePath?.split("/").pop() ||
    t2("canvas.file.untitled", "Untitled");
  const extension2 = ".html";
  const pluginMeta = usePluginMeta(persisted?.pluginId);
  const rawLang = i18n.language || "en-US";
  const locale = rawLang.startsWith("zh")
    ? "zh-CN"
    : rawLang.startsWith("en")
      ? "en-US"
      : rawLang;
  const savedName = meta2?.name || persisted?.name;
  const isCustomName =
    savedName &&
    pluginMeta &&
    !Object.values(pluginMeta.name).includes(savedName);
  const headerName =
    (!isCustomName && pickLocalized(pluginMeta?.name, locale)) || displayName2;
  const displayMode =
    pluginMeta?.displayMode ?? persisted?.pluginDisplayMode ?? "inline";
  const isLauncher = displayMode === "launcher";
  const isComfyUi = persisted?.pluginId === COMFYUI_PLUGIN_ID;
  const isEditorSurface =
    isLauncher && isPluginEditorSurface(pluginMeta?.agent);
  const runInfo = usePluginRunInfo(id2);
  const htmlViewerHandle = useHtmlViewerHandle(id2);
  const isHtmlFullscreen = useIsHtmlFullscreen(id2);
  const fullscreenApi = useHtmlFullscreenApi();
  const reportPluginAction = reactExports.useCallback(
    (action, state2, runPath) => {
      if (!persisted.pluginId) return;
      onPluginAction?.({
        pluginId: persisted.pluginId,
        pluginVersion: persisted.pluginVersion,
        pluginInstanceId: id2,
        action,
        ...(state2
          ? {
              state: state2,
            }
          : {}),
        ...(runPath
          ? {
              runPath,
            }
          : {}),
      });
    },
    [id2, onPluginAction, persisted.pluginId, persisted.pluginVersion],
  );
  const enterHtmlFullscreen = reactExports.useCallback(() => {
    if (!htmlViewerHandle) return;
    fullscreenApi.getState().enter(id2);
    reportPluginAction("fullscreen", "enter");
  }, [id2, fullscreenApi, htmlViewerHandle, reportPluginAction]);
  const exitHtmlFullscreen = reactExports.useCallback(() => {
    fullscreenApi.getState().exit(id2);
    reportPluginAction("fullscreen", "exit");
  }, [id2, fullscreenApi, reportPluginAction]);
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
            label: t2("canvas.file.refresh", "刷新"),
            icon: <RefreshIcon />,
            onClick: refreshPlugin,
            dataActionUiId: "canvas.plugin-node.refresh",
          },
          {
            id: "fullscreen",
            label: isHtmlFullscreen
              ? t2("canvas.file.exitFullscreen", "退出全屏")
              : t2("canvas.file.enterFullscreen", "全屏预览"),
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
            label: t2("canvas.file.run", "执行"),
            icon: <RunIcon />,
            onClick: runPlugin,
            dataActionUiId: "canvas.plugin-node.run",
          },
        ]
      : []),
  ];
  const isInteractiveSelect = !isMultiSelect && !isDragging && !isBoxSelecting;
  const isPreviewInteractive = !!selected2 && isInteractiveSelect;
  const handlePreviewResize = reactExports.useCallback((newW, newH) => {
    setPreviewWidth(newW);
    setPreviewHeight(newH);
  }, []);
  const handleDoubleClick2 = reactExports.useCallback(() => {
    if (isLauncher) {
      fullscreenApi.getState().enter(id2);
      reportPluginAction("fullscreen", "enter");
    }
  }, [isLauncher, fullscreenApi, id2, reportPluginAction]);
  return (
    <NodeShell
      width={previewWidth}
      onDoubleClick={isLauncher ? handleDoubleClick2 : void 0}
    >
      <NodeHeader
        nodeType="file"
        name={headerName}
        maxWidth={previewWidth}
        selected={selected2}
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
            nodeId={id2}
            pluginId={persisted.pluginId}
            filePath={filePath}
            displayName={displayName2}
            width={previewWidth}
            height={previewHeight}
            selected={!!selected2}
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
            nodeId={id2}
            pluginId={persisted.pluginId}
            filePath={filePath}
            displayName={displayName2}
            width={previewWidth}
            height={previewHeight}
            selected={!!selected2}
            onReportAction={reportPluginAction}
            editorSurface={isEditorSurface}
          />
        )
      ) : (
        <PluginPreview
          selected={selected2}
          interactive={isPreviewInteractive}
          filePath={filePath}
          {...(persisted?.pluginId
            ? {
                pluginId: persisted.pluginId,
              }
            : {})}
          displayName={displayName2}
          extension={extension2}
          width={previewWidth}
          height={previewHeight}
        />
      )}
      {selected2 && isInteractiveSelect && toolbarItems.length > 0 && (
        <NodeToolbar items={toolbarItems} visible={true} />
      )}
      {selected2 && (
        <NodeResizeFrame
          nodeId={id2}
          minWidth={FILE_PREVIEW_MIN_SIZE.width}
          minHeight={FILE_PREVIEW_MIN_SIZE.height}
          onResize={handlePreviewResize}
        />
      )}
      <NodeHandles
        nodeId={id2}
        selected={!!selected2}
        showSourceAffordance={shouldShowPluginNodeSourceAffordance(
          persisted?.pluginId,
        )}
        sourcePosition={Position.Left}
      />
    </NodeShell>
  );
}
