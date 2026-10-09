// image-inplace-editor.jsx
import {
  MOSAIC_BRUSH_SIZES,
  strengthPercentToPx,
  STROKE_WIDTHS,
  useEditorState,
} from "./use-editor-state.js";
import { DEFAULT_STYLE } from "./history-manager.js";
import { reactExports, useStore$3 as useStore } from "../vendor.js";
import { ImageInplaceEditToolbarInner } from "./image-inplace-edit-toolbar-inner.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { ImageEditor } from "./image-editor.jsx";
import { useCanvasActive } from "./package.jsx";
import { useSuspendCanvasInteractions } from "../canvas/use-inline-rename.jsx";
const ImageInplaceEditToolbar = reactExports.memo(ImageInplaceEditToolbarInner);
DEFAULT_STYLE.stroke;
const IMAGE_INPLACE_DEFAULT_STROKE_WIDTH = STROKE_WIDTHS[0]?.value ?? 2;
const IMAGE_INPLACE_DEFAULT_TEXT_VARIANT = DEFAULT_STYLE.textVariant ?? "plain";
const IMAGE_INPLACE_DEFAULT_FONT_SIZE = 12;
const IMAGE_INPLACE_DEFAULT_MOSAIC_MODE = DEFAULT_STYLE.mosaicMode ?? "mosaic";
const IMAGE_INPLACE_DEFAULT_MOSAIC_SHAPE =
  DEFAULT_STYLE.mosaicShape ?? "rectangle";
const IMAGE_INPLACE_DEFAULT_MOSAIC_BRUSH_SIZE =
  MOSAIC_BRUSH_SIZES[0]?.value ?? DEFAULT_STYLE.mosaicBrushSize ?? 6;
const IMAGE_INPLACE_DEFAULT_MOSAIC_STRENGTH = 45;
function mosaicStrengthPercentToPx(percent2, mode2) {
  return strengthPercentToPx(percent2, mode2);
}
const zoomSelector = (s2) => s2.transform[2];
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
  const active2 = useCanvasActive();
  const viewportZoom = useStore(zoomSelector);
  const editorRef = reactExports.useRef(null);
  const state2 = useEditorState(editorRef);
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
  const handleSelectTool = reactExports.useCallback((tool2) => {
    setUiActiveTool((current2) => {
      if (current2 === tool2) {
        if (tool2 === "select") return current2;
        editorRef.current?.setTool("select");
        return "select";
      }
      editorRef.current?.setTool(tool2);
      return tool2;
    });
  }, []);
  const handleSelectColor = reactExports.useCallback((color2) => {
    setActiveColor(color2);
    editorRef.current?.setStyle({
      stroke: color2,
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
  const handleSelectFontSize = reactExports.useCallback((size2) => {
    setActiveFontSize(size2);
    editorRef.current?.setStyle({
      fontSize: size2,
    });
  }, []);
  const handleSelectMosaicMode = reactExports.useCallback(
    (mode2) => {
      setActiveMosaicMode(mode2);
      const px = mosaicStrengthPercentToPx(activeMosaicStrength, mode2);
      editorRef.current?.setStyle(
        mode2 === "blur"
          ? {
              mosaicMode: mode2,
              blurRadius: px,
            }
          : {
              mosaicMode: mode2,
              mosaicBlockSize: px,
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
  const handleSelectMosaicBrushSize = reactExports.useCallback((size2) => {
    setActiveMosaicBrushSize(size2);
    editorRef.current?.setStyle({
      mosaicBrushSize: size2,
    });
  }, []);
  const handleSelectMosaicStrength = reactExports.useCallback(
    (percent2, px) => {
      setActiveMosaicStrength(percent2);
      editorRef.current?.setStyle(
        activeMosaicMode === "blur"
          ? {
              blurRadius: px,
            }
          : {
              mosaicBlockSize: px,
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
    if (!visible || !active2) return;
    const handler = (e2) => {
      if (e2.key !== "Delete" && e2.key !== "Backspace") return;
      const target = e2.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }
      const editor = editorRef.current?.getEditor();
      if (!editor || editor.getState().selectedId == null) return;
      e2.preventDefault();
      e2.stopPropagation();
      editor.deleteSelected();
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [visible, active2]);
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
  const canUndo = state2.canUndo;
  const canRedo = state2.canRedo;
  const hasShapes = state2.shapes.length > 0;
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
      onPointerDown={(e2) => e2.stopPropagation()}
      onWheel={(e2) => e2.stopPropagation()}
      onContextMenu={(e2) => e2.stopPropagation()}
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
