// image-inplace-editor.jsx
import {
  MOSAIC_BRUSH_SIZES,
  strengthPercentToPx,
  STROKE_WIDTHS,
  useEditorState,
} from "./use-editor-state.js";
import { DEFAULT_STYLE } from "./history-manager.js";
import reactExports from "react";
import { useStore } from "../vendor-fork/xyflow/react/index.js";
import { ImageInplaceEditToolbarInner } from "./image-inplace-edit-toolbar-inner.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { ImageEditor } from "./image-editor.jsx";
import { useCanvasActive } from "./package.jsx";
import { useSuspendCanvasInteractions } from "../canvas/use-inline-rename.jsx";
export const ImageInplaceEditToolbar = reactExports.memo(ImageInplaceEditToolbarInner);
DEFAULT_STYLE.stroke;
const IMAGE_INPLACE_DEFAULT_STROKE_WIDTH = STROKE_WIDTHS[0]?.value ?? 2;
export const IMAGE_INPLACE_DEFAULT_TEXT_VARIANT = DEFAULT_STYLE.textVariant ?? "plain";
export const IMAGE_INPLACE_DEFAULT_FONT_SIZE = 12;
export const IMAGE_INPLACE_DEFAULT_MOSAIC_MODE = DEFAULT_STYLE.mosaicMode ?? "mosaic";
export const IMAGE_INPLACE_DEFAULT_MOSAIC_SHAPE =
  DEFAULT_STYLE.mosaicShape ?? "rectangle";
export const IMAGE_INPLACE_DEFAULT_MOSAIC_BRUSH_SIZE =
  MOSAIC_BRUSH_SIZES[0]?.value ?? DEFAULT_STYLE.mosaicBrushSize ?? 6;
export const IMAGE_INPLACE_DEFAULT_MOSAIC_STRENGTH = 45;
function mosaicStrengthPercentToPx(percent, mode) {
  return strengthPercentToPx(percent, mode);
}
const zoomSelector = (editorState) => editorState.transform[2];
export function ImageInplaceEditor({
  src,
  srcSet,
  sizes,
  width,
  height,
  visible,
  onCancel,
  onProgressChange,
  onConfirm,
}) {
  useSuspendCanvasInteractions(true);
  const active = useCanvasActive();
  const viewportZoom = useStore(zoomSelector);
  const editorRef = reactExports.useRef(null);
  const state = useEditorState(editorRef);
  const [uiActiveTool, setUiActiveTool] = reactExports.useState("select");
  const [activeColor, setActiveColor] = reactExports.useState(
    DEFAULT_STYLE.stroke,
  );
  const [activeStrokeWidth, setActiveStrokeWidth] = reactExports.useState(
    IMAGE_INPLACE_DEFAULT_STROKE_WIDTH,
  );
  const [activeTextVariant, setActiveTextVariant] = reactExports.useState(
    IMAGE_INPLACE_DEFAULT_TEXT_VARIANT,
  );
  const [activeFontSize, setActiveFontSize] = reactExports.useState(
    IMAGE_INPLACE_DEFAULT_FONT_SIZE,
  );
  const [activeMosaicMode, setActiveMosaicMode] = reactExports.useState(
    IMAGE_INPLACE_DEFAULT_MOSAIC_MODE,
  );
  const [activeMosaicShape, setActiveMosaicShape] = reactExports.useState(
    IMAGE_INPLACE_DEFAULT_MOSAIC_SHAPE,
  );
  const [activeMosaicBrushSize, setActiveMosaicBrushSize] =
    reactExports.useState(IMAGE_INPLACE_DEFAULT_MOSAIC_BRUSH_SIZE);
  const [activeMosaicStrength, setActiveMosaicStrength] = reactExports.useState(
    IMAGE_INPLACE_DEFAULT_MOSAIC_STRENGTH,
  );
  const [saving, setSaving] = reactExports.useState(false);
  const [editorReady, setEditorReady] = reactExports.useState(false);
  const handleEditorReady = reactExports.useCallback(
    () => setEditorReady(true),
    [],
  );
  const handleSelectTool = reactExports.useCallback((tool) => {
    setUiActiveTool((current) => {
      if (current === tool) {
        if (tool === "select") return current;
        editorRef.current?.setTool("select");
        return "select";
      }
      editorRef.current?.setTool(tool);
      return tool;
    });
  }, []);
  const handleSelectColor = reactExports.useCallback((color) => {
    setActiveColor(color);
    editorRef.current?.setStyle({
      stroke: color,
    });
  }, []);
  const handleSelectStrokeWidth = reactExports.useCallback((widthPx) => {
    setActiveStrokeWidth(widthPx);
    editorRef.current?.setStyle({
      strokeWidth: widthPx,
    });
  }, []);
  const handleSelectTextVariant = reactExports.useCallback((variant) => {
    setActiveTextVariant(variant);
    editorRef.current?.setStyle({
      textVariant: variant,
    });
  }, []);
  const handleSelectFontSize = reactExports.useCallback((size) => {
    setActiveFontSize(size);
    editorRef.current?.setStyle({
      fontSize: size,
    });
  }, []);
  const handleSelectMosaicMode = reactExports.useCallback(
    (mode) => {
      setActiveMosaicMode(mode);
      const pixelSize = mosaicStrengthPercentToPx(activeMosaicStrength, mode);
      editorRef.current?.setStyle(
        mode === "blur"
          ? {
              mosaicMode: mode,
              blurRadius: pixelSize,
            }
          : {
              mosaicMode: mode,
              mosaicBlockSize: pixelSize,
            },
      );
    },
    [activeMosaicStrength],
  );
  const handleSelectMosaicShape = reactExports.useCallback((shape) => {
    setActiveMosaicShape(shape);
    editorRef.current?.setStyle({
      mosaicShape: shape,
    });
  }, []);
  const handleSelectMosaicBrushSize = reactExports.useCallback((size) => {
    setActiveMosaicBrushSize(size);
    editorRef.current?.setStyle({
      mosaicBrushSize: size,
    });
  }, []);
  const handleSelectMosaicStrength = reactExports.useCallback(
    (percent, pixelSize) => {
      setActiveMosaicStrength(percent);
      editorRef.current?.setStyle(
        activeMosaicMode === "blur"
          ? {
              blurRadius: pixelSize,
            }
          : {
              mosaicBlockSize: pixelSize,
            },
      );
    },
    [activeMosaicMode],
  );
  const handleUndo = reactExports.useCallback(
    () => editorRef.current?.undo(),
    [],
  );
  const handleRedo = reactExports.useCallback(
    () => editorRef.current?.redo(),
    [],
  );
  const handleClear = reactExports.useCallback(
    () => editorRef.current?.clear(),
    [],
  );
  reactExports.useEffect(() => {
    if (!visible || !active) return;
    const handler = (keyboardEvent) => {
      if (keyboardEvent.key !== "Delete" && keyboardEvent.key !== "Backspace") return;
      const target = keyboardEvent.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }
      const editor = editorRef.current?.getEditor();
      if (!editor || editor.getState().selectedId == null) return;
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      editor.deleteSelected();
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [visible, active]);
  const handleSave = reactExports.useCallback(async () => {
    if (!editorRef.current || saving) return;
    setSaving(true);
    try {
      const blob = await editorRef.current.toBlob("image/png");
      await onConfirm(blob);
    } catch (err) {
      console.error("[ImageInplaceEditor] export failed:", err);
    } finally {
      setSaving(false);
    }
  }, [saving, onConfirm]);
  const canUndo = state.canUndo;
  const canRedo = state.canRedo;
  const hasShapes = state.shapes.length > 0;
  reactExports.useEffect(() => {
    onProgressChange?.(hasShapes);
  }, [hasShapes, onProgressChange]);
  const handleCancel = reactExports.useCallback(
    () => onCancel(hasShapes),
    [hasShapes, onCancel],
  );
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: editor surface — pointer events drive shape drawing
    <div
      className="nopan nodrag nowheel relative h-full w-full"
      onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
      onWheel={(wheelEvent) => wheelEvent.stopPropagation()}
      onContextMenu={(contextMenuEvent) => contextMenuEvent.stopPropagation()}
    >
      <ImageEditor
        ref={editorRef}
        src={src}
        width={width}
        {...(height
          ? {
              height,
            }
          : {})}
        initialTool="select"
        initialStyle={{
          stroke: activeColor,
          strokeWidth: activeStrokeWidth,
          textVariant: activeTextVariant,
          fontSize: activeFontSize,
          mosaicMode: activeMosaicMode,
          mosaicShape: activeMosaicShape,
          mosaicBrushSize: activeMosaicBrushSize,
          // 强度按当前 mode 一次性映射好交给 editor，避免初次绘制使用 DEFAULT_STYLE
          // 与 toolbar 显示不一致的物理值。
          ...(activeMosaicMode === "blur"
            ? {
                blurRadius: mosaicStrengthPercentToPx(
                  activeMosaicStrength,
                  "blur",
                ),
              }
            : {
                mosaicBlockSize: mosaicStrengthPercentToPx(
                  activeMosaicStrength,
                  "mosaic",
                ),
              }),
        }}
        uiScale={viewportZoom}
        disableShortcuts={true}
        onReady={handleEditorReady}
        className="h-full w-full"
      />
      {!editorReady && (
        <img
          src={src}
          {...(srcSet
            ? {
                srcSet,
              }
            : {})}
          {...(sizes
            ? {
                sizes,
              }
            : {})}
          alt=""
          aria-hidden={true}
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      )}
      <ImageInplaceEditToolbar
        visible={visible}
        activeTool={uiActiveTool}
        activeColor={activeColor}
        activeStrokeWidth={activeStrokeWidth}
        activeTextVariant={activeTextVariant}
        activeFontSize={activeFontSize}
        activeMosaicMode={activeMosaicMode}
        activeMosaicShape={activeMosaicShape}
        activeMosaicBrushSize={activeMosaicBrushSize}
        activeMosaicStrength={activeMosaicStrength}
        canUndo={canUndo}
        canRedo={canRedo}
        hasShapes={hasShapes}
        saving={saving}
        onSelectTool={handleSelectTool}
        onSelectColor={handleSelectColor}
        onSelectStrokeWidth={handleSelectStrokeWidth}
        onSelectTextVariant={handleSelectTextVariant}
        onSelectFontSize={handleSelectFontSize}
        onSelectMosaicMode={handleSelectMosaicMode}
        onSelectMosaicShape={handleSelectMosaicShape}
        onSelectMosaicBrushSize={handleSelectMosaicBrushSize}
        onSelectMosaicStrength={handleSelectMosaicStrength}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onCancel={handleCancel}
        onSave={handleSave}
      />
    </div>
  );
}
