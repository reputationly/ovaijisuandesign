// file-node-impl.jsx
import { classifyFileType, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { FileViewerRouter } from "./pdf-viewer.jsx";
import { TooltipProvider } from "../infra/create-recently-added-store.js";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import {
  AddToChatIcon,
  formatFileSize,
  FullscreenIcon,
  getFileExtension,
  MinimizeIcon,
  useCanvasNodeIsDragging,
} from "../canvas/fullscreen-icon.jsx";
import {
  CardViewIcon,
  PreviewViewIcon,
  RenameIcon,
  RunIcon,
  VisibleIcon,
} from "../canvas/file-missing-icon.jsx";
import { NodeBody } from "../canvas/node-body-inner.jsx";
import {
  NodeQuickTagTrigger,
  useInlineRename,
} from "../canvas/use-inline-rename.jsx";
import { Tooltip } from "../generation/missing-asset-card.jsx";
import { NodeResizeFrame } from "../infra/node-resize-frame-inner.jsx";
import {
  useHtmlFullscreenApi,
  useHtmlViewerHandle,
  useIsHtmlFullscreen,
  usePluginRunInfo,
} from "../infra/use-plugin-metadata-store.js";
import { useNodeRename } from "../infra/use-node-rename.js";
import { FILE_CARD_DEFAULT_SIZE } from "../canvas/compute-group-bounds-from-children.js";
import {
  useAssetMeta,
  useCanvasBridge,
  useCanvasIsBoxSelecting,
  useCanvasIsMultiSelect,
} from "./package.jsx";
import { useCanvasActions } from "./use-canvas-actions.js";
import { RefreshIcon } from "../canvas/generating-media-area.jsx";
import {
  FILE_PREVIEW_MIN_SIZE,
  FILE_PREVIEW_SIZE,
} from "../canvas/is-reexecutable-generation-node.js";
import { NodeToolbar } from "./toolbar-item.jsx";
import { isCloneData } from "./use-warn-missing-asset-meta.jsx";
import { NodeShell, useAddToChat } from "../canvas/node-shell-inner.jsx";
import { NodeHandles } from "../canvas/proximity-handle-inner.jsx";
function FilePreview({
  selected,
  interactive,
  filePath,
  displayName,
  tagIds,
  sizeLabel,
  extension,
  displayFileOnly,
  width,
  height,
  onShowCardView,
  onRename,
}) {
  const { t } = useTranslation();
  const paneWidth = width - 2;
  const rename = useInlineRename({
    currentValue: displayName,
    onCommit: onRename,
    preserveExtension: true,
  });
  return (
    <NodeBody
      width={width}
      height={height}
      selected={selected}
      tagIds={tagIds}
      variant="media"
    >
      <div
        className="flex h-full flex-col"
        style={{
          background: "var(--canvas-node-bg, #fff)",
          border: "1px solid transparent",
        }}
      >
        <div
          hidden={displayFileOnly}
          className="flex items-center justify-between gap-2 border-[var(--canvas-node-border)] border-b px-4 py-2"
        >
          <div className="flex min-w-0 flex-shrink items-center gap-2">
            <FileTypeIcon
              {...classifyFileType({
                filename: displayName,
              })}
              size={24}
              decorative={true}
            />
            {rename.editing ? (
              <input
                ref={rename.inputRef}
                className="nodrag min-w-0 flex-1 truncate border-[var(--canvas-node-border)] [border-bottom-width:var(--control-border-width)] bg-transparent text-xs text-foreground outline-none focus:border-[var(--canvas-node-border-selected,#141414)]"
                value={rename.editValue}
                onChange={(changeEvent) => rename.setEditValue(changeEvent.target.value)}
                onBlur={rename.commit}
                onKeyDown={rename.onKeyDown}
                onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
                onClick={(clickEvent) => clickEvent.stopPropagation()}
                onDoubleClick={(mouseEvent) => mouseEvent.stopPropagation()}
              />
            ) : (
              <div
                className="min-w-0 truncate text-xs text-foreground"
                title={rename.displayValue}
              >
                {rename.displayValue}
              </div>
            )}
            <TooltipProvider delay={300} closeDelay={0}>
              {onRename && !rename.editing ? (
                <Tooltip content={t("canvas.file.rename", "重命名")}>
                  <button
                    type="button"
                    aria-label={t("canvas.file.rename", "重命名")}
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      rename.beginEdit();
                    }}
                    onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
                    onDoubleClick={(mouseEvent) => mouseEvent.stopPropagation()}
                    className="flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                    data-action-ui-id="canvas.file-node.rename-from-preview"
                  >
                    <RenameIcon />
                  </button>
                </Tooltip>
              ) : null}
            </TooltipProvider>
          </div>
          <TooltipProvider delay={300} closeDelay={0}>
            <div className="flex shrink-0 items-center">
              <Tooltip content={t("canvas.file.cardView", "卡片视图")}>
                <button
                  type="button"
                  aria-label={t("canvas.file.cardView", "卡片视图")}
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    onShowCardView();
                  }}
                  onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
                  onDoubleClick={(mouseEvent) => mouseEvent.stopPropagation()}
                  className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  data-action-ui-id="canvas.file-node.view-card-from-preview"
                >
                  <MinimizeIcon />
                </button>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
        <div className="flex-1 overflow-hidden">
          <FileViewerRouter
            filePath={filePath}
            extension={extension}
            displayName={displayName}
            sizeLabel={sizeLabel}
            paneWidth={paneWidth}
            interactive={interactive}
          />
        </div>
      </div>
    </NodeBody>
  );
}
function resolveDisplayFileOnly(data) {
  return data?.displayFileOnly === true;
}
export function FileNodeImpl({
  id: nodeId,
  data,
  selected,
  width,
  height,
}) {
  const { t } = useTranslation();
  const meta = useAssetMeta(nodeId);
  const persisted = data;
  const { onAddToChat } = useCanvasBridge();
  const { updateNodeDataAndResize } = useCanvasActions();
  const onRename = useNodeRename(nodeId, isCloneData(data));
  const isMultiSelect = useCanvasIsMultiSelect();
  const isDragging = useCanvasNodeIsDragging(nodeId);
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const viewMode = persisted?.viewMode === "preview" ? "preview" : "card";
  const isPreview = viewMode === "preview";
  const displayFileOnly = resolveDisplayFileOnly(persisted);
  const [previewWidth, setPreviewWidth] = reactExports.useState(
    typeof width === "number" && width > 0 ? width : FILE_PREVIEW_SIZE.width,
  );
  const [previewHeight, setPreviewHeight] = reactExports.useState(
    typeof height === "number" && height > 0
      ? height
      : FILE_PREVIEW_SIZE.height,
  );
  reactExports.useEffect(() => {
    if (!isPreview) return;
    if (typeof width === "number" && width > 0) setPreviewWidth(width);
  }, [width, isPreview]);
  reactExports.useEffect(() => {
    if (!isPreview) return;
    if (typeof height === "number" && height > 0) setPreviewHeight(height);
  }, [height, isPreview]);
  const filePath = meta?.path ?? persisted?.path;
  const displayName =
    meta?.name ||
    persisted?.name ||
    filePath?.split("/").pop() ||
    t("canvas.file.untitled", "Untitled");
  const sizeLabel = formatFileSize(meta?.fileSize ?? persisted?.fileSize);
  const extension =
    getFileExtension(filePath?.split("/").pop()) ??
    getFileExtension(displayName);
  const handleAddToChat = useAddToChat(nodeId, meta, onAddToChat, filePath);
  const runInfo = usePluginRunInfo(nodeId);
  const htmlViewerHandle = useHtmlViewerHandle(nodeId);
  const isHtmlFullscreen = useIsHtmlFullscreen(nodeId);
  const fullscreenApi = useHtmlFullscreenApi();
  const enterHtmlFullscreen = reactExports.useCallback(() => {
    if (!htmlViewerHandle) return;
    fullscreenApi.getState().enter(nodeId);
  }, [nodeId, fullscreenApi, htmlViewerHandle]);
  const exitHtmlFullscreen = reactExports.useCallback(() => {
    fullscreenApi.getState().exit(nodeId);
  }, [nodeId, fullscreenApi]);
  const setViewMode = reactExports.useCallback(
    (next) => {
      const nextSize =
        next === "preview" ? FILE_PREVIEW_SIZE : FILE_CARD_DEFAULT_SIZE;
      if (next === "preview") {
        setPreviewWidth(nextSize.width);
        setPreviewHeight(nextSize.height);
      }
      updateNodeDataAndResize(
        nodeId,
        {
          ...(persisted ?? {}),
          viewMode: next,
        },
        nextSize.width,
        nextSize.height,
      );
    },
    [nodeId, persisted, updateNodeDataAndResize],
  );
  const showCardView = reactExports.useCallback(
    () => setViewMode("card"),
    [setViewMode],
  );
  const showPreviewView = reactExports.useCallback(
    () => setViewMode("preview"),
    [setViewMode],
  );
  const handlePreviewClick = reactExports.useCallback(
    (clickEvent) => {
      clickEvent.stopPropagation();
      showPreviewView();
    },
    [showPreviewView],
  );
  const toolbarItems = [
    {
      id: "add-to-chat",
      label: t("canvas.addToChat"),
      icon: <AddToChatIcon />,
      onClick: handleAddToChat,
      dataActionUiId: "canvas.file-node.add-to-chat",
    },
    {
      id: "view-card",
      label: t("canvas.file.cardView", "卡片视图"),
      icon: <CardViewIcon />,
      onClick: showCardView,
      active: !isPreview,
      dataActionUiId: "canvas.file-node.view-card",
    },
    {
      id: "view-preview",
      label: t("canvas.file.previewView", "预览视图"),
      icon: <PreviewViewIcon />,
      onClick: showPreviewView,
      active: isPreview,
      dataActionUiId: "canvas.file-node.view-preview",
    },
    ...(isPreview && htmlViewerHandle
      ? [
          {
            id: "refresh",
            label: t("canvas.file.refresh", "刷新"),
            icon: <RefreshIcon />,
            onClick: htmlViewerHandle.reload,
            dataActionUiId: "canvas.file-node.refresh",
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
            dataActionUiId: "canvas.file-node.fullscreen",
          },
        ]
      : []),
    ...(runInfo?.hasMain
      ? [
          {
            id: "run",
            label: t("canvas.file.run", "执行"),
            icon: <RunIcon />,
            onClick: runInfo.invoke,
            dataActionUiId: "canvas.file-node.run",
          },
        ]
      : []),
  ];
  const iconSourceName =
    meta?.name || filePath?.split("/").pop() || persisted?.name;
  const isInteractiveSelect = !isMultiSelect && !isDragging && !isBoxSelecting;
  const isPreviewInteractive = !!selected && isInteractiveSelect;
  const shellWidth = isPreview ? previewWidth : FILE_CARD_DEFAULT_SIZE.width;
  const handlePreviewResize = reactExports.useCallback((newW, newH) => {
    setPreviewWidth(newW);
    setPreviewHeight(newH);
  }, []);
  return (
    <NodeShell tagIds={meta?.tagIds} width={shellWidth}>
      {isPreview ? (
        <FilePreview
          selected={selected}
          interactive={isPreviewInteractive}
          filePath={filePath}
          displayName={displayName}
          tagIds={meta?.tagIds}
          sizeLabel={sizeLabel}
          extension={extension}
          displayFileOnly={displayFileOnly}
          width={previewWidth}
          height={previewHeight}
          onShowCardView={showCardView}
          {...(onRename
            ? {
                onRename,
              }
            : {})}
        />
      ) : (
        <NodeBody
          width={FILE_CARD_DEFAULT_SIZE.width}
          tagIds={meta?.tagIds}
          height={FILE_CARD_DEFAULT_SIZE.height}
          selected={selected}
          variant="panel"
        >
          <div className="flex h-full items-center gap-3">
            <FileTypeIcon
              {...classifyFileType({
                filename: iconSourceName,
              })}
              size={32}
              decorative={true}
            />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              <div
                className="truncate text-sm font-medium text-foreground"
                title={displayName}
              >
                {displayName}
              </div>
              {sizeLabel ? (
                <span className="text-xs text-muted-foreground">
                  {sizeLabel}
                </span>
              ) : null}
            </div>
            <TooltipProvider delay={300} closeDelay={0}>
              <Tooltip content={t("canvas.preview", "预览")}>
                <button
                  type="button"
                  aria-label={t("canvas.preview", "预览")}
                  onClick={handlePreviewClick}
                  onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
                  onDoubleClick={(mouseEvent) => mouseEvent.stopPropagation()}
                  className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  data-action-ui-id="canvas.file-node.preview-eye"
                >
                  <VisibleIcon />
                </button>
              </Tooltip>
            </TooltipProvider>
          </div>
        </NodeBody>
      )}
      {selected && isInteractiveSelect && !displayFileOnly && (
        <NodeToolbar items={toolbarItems} visible={true} />
      )}
      <NodeQuickTagTrigger
        visible={!!selected && isInteractiveSelect && !displayFileOnly}
        className="node-floating-ui absolute -top-7 left-full z-10 ml-1"
        counterScaleOrigin="left bottom"
      />
      {selected && isPreview && (
        <NodeResizeFrame
          nodeId={nodeId}
          minWidth={FILE_PREVIEW_MIN_SIZE.width}
          minHeight={FILE_PREVIEW_MIN_SIZE.height}
          onResize={handlePreviewResize}
        />
      )}
      <NodeHandles nodeId={nodeId} selected={!!selected} />
    </NodeShell>
  );
}
