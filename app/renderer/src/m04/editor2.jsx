// editor2.jsx
import { jsxRuntimeExports, reactExports, CompositedSvg, useTranslation, useStore$3, NodeToolbar$1, Position, Undo2, Redo2, ChevronDown, Check, Hand, BoxSelect } from "../vendor.js";
import { TOOLS$1 } from "../m15/deep-freeze.js";
import { Trash2, MosaicIcon, Droplet, useCanvasActive, Rotate90Icon, FlipHorizontalIcon, FlipVerticalIcon } from "../m15/parse-item.jsx";
import {
  EventBus,
  buildTextShapeData,
  SelectTool,
  TextTool,
  TagTool,
  MosaicTool,
  hitHandle,
  cornerCursor,
} from "../m03/mosaic-tool.js";
import { HistoryManager$1, DEFAULT_STYLE, Renderer, cloneShapeData } from "../m03/renderer.js";
import {
  MosaicShape,
  createShape,
  loadImage$4,
  pickContrastColor,
  TextShape,
  TagShape,
  TAG_DEFAULT_FONT_SIZE,
  keepTagInCanvas,
  TAG_PADDING_X,
  TAG_PADDING_Y,
  DrawShapeTool,
  BrushTool,
} from "../m03/mosaic-shape.js";
import { CloseIcon$1, SendArrowIcon } from "../m01/generating-media-area.jsx";
import { useSuspendCanvasInteractions } from "../m01/use-inline-rename.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { AngleGlyph, Divider$4, IconButton$3 } from "./use-image-split-mode.jsx";
class Editor2 {
  container;
  renderer;
  bus = new EventBus();
  history = new HistoryManager$1(50);
  shapes = [];
  shapeMap = new Map();
  selectedId = null;
  currentToolName = "rectangle";
  currentTool;
  style;
  previewShape = null;
  /**
   * 飞书截图风格的"创建工具下命中已有元素自动转移动/缩放"——
   * 这次 pointer 序列实际生效的工具，可能是 currentTool（创建/正常路径），
   * 也可能是 delegationSelectTool（命中已有元素时的临时委托）。
   * 仅在 down→up 这一段非 null。
   */
  interactionTool = null;
  delegationSelectTool = null;
  width;
  height;
  destroyed = false;
  imageLoadVersion = 0;
  shortcutsEnabled;
  // 文字编辑浮层
  textarea = null;
  editingTextShape = null;
  editingTagShape = null;
  /** Text 编辑是否为新建路径：true 表示 cancel 时需要从 shapes 移除 */
  editingTextIsNew = false;
  /** Text 编辑前的原始文本：cancel 时回滚 data.text 用 */
  editingTextOriginal = "";
  // 交互期间的快照（供 undo）
  interactionSnapshot = null;
  constructor(options) {
    this.container = options.container;
    this.style = {
      ...DEFAULT_STYLE,
      ...(options.initialStyle ?? {}),
    };
    this.width = options.width ?? 800;
    this.height = options.height ?? 600;
    this.shortcutsEnabled = options.disableShortcuts !== true;
    this.container.style.position = this.container.style.position || "relative";
    this.renderer = new Renderer();
    this.container.appendChild(this.renderer.main);
    this.renderer.setSize(this.width, this.height);
    this.currentTool = this.makeTool("rectangle");
    this.currentTool.onActivate();
    this.applyCursor();
    this.bindEvents();
    void this.loadImage(options.image).catch(() => void 0);
  }
  // ==================== 公共 API ====================
  setTool(name2) {
    if (this.currentToolName === name2) return;
    this.currentTool.onDeactivate();
    this.currentToolName = name2;
    this.currentTool = this.makeTool(name2);
    this.currentTool.onActivate();
    this.applyCursor();
    this.interactionTool = null;
    if (name2 !== "select") {
      this.select(null);
    }
    this.bus.emit("tool:change", name2);
    this.emitChange();
  }
  getTool() {
    return this.currentToolName;
  }
  setStyle(style2) {
    this.style = {
      ...this.style,
      ...style2,
    };
    const sel = this.getSelectedShape();
    if (sel) {
      this.beginInteraction();
      sel.data.style = {
        ...sel.data.style,
        ...style2,
      };
      if (sel instanceof MosaicShape) {
        const next2 = sel.data;
        const newMode = style2.mosaicMode ?? next2.mode;
        const newStrength =
          newMode === "blur"
            ? (style2.blurRadius ?? sel.data.style.blurRadius ?? next2.strength)
            : (style2.mosaicBlockSize ?? sel.data.style.mosaicBlockSize ?? next2.strength);
        next2.mode = newMode;
        next2.strength = newStrength;
        if (next2.shape === "brush") {
          const newBrush =
            style2.mosaicBrushSize ?? sel.data.style.mosaicBrushSize ?? next2.brushSize;
          if (newBrush > 0) next2.brushSize = newBrush;
        }
      }
      this.commitInteraction();
    }
    this.emitChange();
  }
  getStyle() {
    return this.style;
  }
  /** Current logical canvas size after the source image aspect ratio is applied. */
  getSize() {
    return {
      width: this.width,
      height: this.height,
    };
  }
  /** 公共：在画布上添加一个形状（自动 push history）。 */
  addShape(data2) {
    this.beginInteraction();
    const shape = createShape(data2);
    this.shapes.push(shape);
    this.shapeMap.set(shape.id, shape);
    this.commitInteraction();
    this.bus.emit("shape:add", cloneShapeData(data2));
  }
  /**
   * @internal Tool 用：直接传入 Shape 实例，避免重新构造时丢失 bitmap。
   */
  addShapeInstance(shape) {
    this.beginInteraction();
    this.shapes.push(shape);
    this.shapeMap.set(shape.id, shape);
    this.commitInteraction();
    this.bus.emit("shape:add", cloneShapeData(shape.data));
  }
  /**
   * @internal Tool 用：把 shape 加入但不 push history。配合 begin/commitInteraction
   * 实现"一个用户动作 = 一次 history" 的事务语义。
   */
  addShapeInstanceWithoutHistory(shape) {
    this.shapes.push(shape);
    this.shapeMap.set(shape.id, shape);
    this.renderer.drawShapes(this.shapes);
    this.bus.emit("shape:add", cloneShapeData(shape.data));
  }
  removeShape(id2) {
    this.deleteShapes([id2]);
  }
  /** 公共：一次事务删除多个形状（浏览器批注用它成组移除框与文字标签）。 */
  deleteShapes(ids2) {
    const idSet = new Set(ids2);
    if (idSet.size === 0) return;
    const removed = this.shapes.filter((shape) => idSet.has(shape.id));
    if (removed.length === 0) return;
    this.beginInteraction();
    this.shapes = this.shapes.filter((shape) => !idSet.has(shape.id));
    for (const shape of removed) this.shapeMap.delete(shape.id);
    if (this.selectedId && idSet.has(this.selectedId)) this.selectedId = null;
    this.commitInteraction();
    for (const shape of removed) {
      this.bus.emit("shape:remove", cloneShapeData(shape.data));
    }
  }
  deleteSelected() {
    if (!this.selectedId) return;
    this.deleteShapes([this.selectedId]);
  }
  clear() {
    if (this.shapes.length === 0) return;
    this.beginInteraction();
    this.shapes = [];
    this.shapeMap.clear();
    this.selectedId = null;
    this.commitInteraction();
  }
  select(id2) {
    if (this.selectedId === id2) return;
    this.selectedId = id2;
    this.renderer.setSelected(id2 ? (this.shapeMap.get(id2) ?? null) : null);
    this.bus.emit("select", id2);
    this.emitChange();
  }
  getSelectedShape() {
    return this.selectedId ? (this.shapeMap.get(this.selectedId) ?? null) : null;
  }
  findShapeAt(p3) {
    for (let i2 = this.shapes.length - 1; i2 >= 0; i2--) {
      if (this.shapes[i2].hitTest(p3)) return this.shapes[i2];
    }
    return null;
  }
  undo() {
    const snapshot2 = this.cloneShapesData();
    const prev = this.history.undo(snapshot2);
    if (prev !== null) {
      this.applySnapshot(prev);
    }
  }
  redo() {
    const snapshot2 = this.cloneShapesData();
    const next2 = this.history.redo(snapshot2);
    if (next2 !== null) {
      this.applySnapshot(next2);
    }
  }
  on(type2, handler) {
    return this.bus.on(type2, handler);
  }
  off(type2, handler) {
    this.bus.off(type2, handler);
  }
  getState() {
    return {
      shapes: this.shapes.map((s2) => cloneShapeData(s2.data)),
      selectedId: this.selectedId,
      tool: this.currentToolName,
      style: {
        ...this.style,
      },
      canUndo: this.history.canUndo,
      canRedo: this.history.canRedo,
    };
  }
  toDataURL(type2 = "image/png", quality = 0.92) {
    return this.renderer.exportComposed().toDataURL(type2, quality);
  }
  toBlob(type2 = "image/png", quality = 0.92) {
    const canvas = this.renderer.exportComposed();
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas.toBlob returned null"));
        },
        type2,
        quality,
      );
    });
  }
  /**
   * 重新加载一张图片。会按图片比例自动调整 canvas 高度，并清空打码缓存。
   * 不清空 shapes（用户已画的标注会保留在新图上）。
   */
  async loadImage(src) {
    const version2 = ++this.imageLoadVersion;
    try {
      const img = typeof src === "string" ? await loadImage$4(src) : src;
      if (this.destroyed || version2 !== this.imageLoadVersion) return;
      const targetW = this.width;
      const targetH = Math.round(targetW * (img.naturalHeight / img.naturalWidth));
      this.width = targetW;
      this.height = targetH;
      this.renderer.setSize(targetW, targetH);
      this.renderer.drawBackground(img);
      this.renderer.drawShapes(this.shapes);
      this.bus.emit("ready", void 0);
      this.emitChange();
    } catch (e2) {
      if (this.destroyed || version2 !== this.imageLoadVersion) return;
      this.bus.emit("error", e2);
      console.error("[Editor] load image failed", e2);
      throw e2;
    }
  }
  /**
   * 设置外层施加在 canvas 上的 CSS scale（屏幕像素 / 逻辑像素）。
   * 用于让选中框 / 4 角手柄保持屏幕像素大小、不随外层 zoom 一起放大缩小。
   * SelectTool 也会读这个值来按"屏幕像素"语义做手柄命中判定。
   */
  setUiScale(scale2) {
    this.renderer.setUiScale(scale2);
  }
  getUiScale() {
    return this.renderer.getUiScale();
  }
  destroy() {
    this.destroyed = true;
    this.unbindEvents();
    this.closeTextEditor(false);
    this.renderer.destroy();
    if (this.renderer.main.parentElement === this.container) {
      this.container.removeChild(this.renderer.main);
    }
    this.bus.clear();
  }
  // ==================== Tool 用的低层 API（@internal） ====================
  /** @internal */
  setPreviewShape(shape) {
    this.previewShape = shape;
    this.renderer.drawPreview(shape);
  }
  /** @internal */
  requestPreviewRender() {
    this.renderer.drawPreview(this.previewShape);
  }
  /** @internal */
  requestRender() {
    this.renderer.drawShapes(this.shapes);
    this.renderer.setSelected(this.getSelectedShape());
  }
  /** @internal */
  beginInteraction() {
    if (this.interactionSnapshot !== null) return;
    this.interactionSnapshot = this.cloneShapesData();
  }
  /** @internal */
  commitInteraction() {
    if (this.interactionSnapshot === null) {
      this.history.push(this.cloneShapesData());
    } else {
      this.history.push(this.interactionSnapshot);
      this.interactionSnapshot = null;
    }
    this.renderer.drawShapes(this.shapes);
    this.renderer.setSelected(this.getSelectedShape());
    this.emitChange();
  }
  /** @internal 取消进行中的交互（不入 history），仅丢弃 snapshot。 */
  cancelInteraction() {
    this.interactionSnapshot = null;
  }
  /** @internal */
  setCursor(cursor) {
    this.renderer.main.style.cursor = cursor;
  }
  /** @internal */
  getComposedSnapshot() {
    return this.renderer.snapshotComposed();
  }
  // ==================== 文字编辑 ====================
  /**
   * 打开文字编辑 textarea。
   * - 不传 existing：在 point 处新建一段文字
   * - 传 existing：编辑已有 TextShape，进入时把它从 shapes 临时移除（避免 textarea 与
   *   canvas 文字重叠），编辑结束时由 closeTextEditor 决定加回 / 删除 / 更新
   *
   * 关键：编辑期间的整个生命周期被包裹在一次 beginInteraction 事务里，
   * 这样无论是"编辑提交"、"编辑清空 → 删除"、"取消编辑"，都只产生一个 history 入口。
   */
  openTextEditor(point2, existing) {
    this.closeTextEditor(false);
    const ta2 = document.createElement("textarea");
    const style2 = existing ? existing.data.style : this.style;
    const fontSize = style2.fontSize ?? 18;
    const fontFamily =
      style2.fontFamily ?? 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    const fontWeight = String(style2.fontWeight ?? 500);
    const lineHeight = 1.4;
    const variant = style2.textVariant ?? "plain";
    const mainColor = style2.stroke;
    const inverseColor = style2.textOutlineColor ?? pickContrastColor(mainColor);
    Object.assign(ta2.style, {
      position: "absolute",
      background: "transparent",
      border: "none",
      padding: "0",
      margin: "0",
      outline: "1px dashed #3370FF",
      outlineOffset: "2px",
      resize: "none",
      overflow: "hidden",
      whiteSpace: "pre",
      boxSizing: "content-box",
      minWidth: "4px",
      zIndex: "10",
      color: "transparent",
      WebkitTextFillColor: "transparent",
      WebkitTextStroke: "0px transparent",
      fontSize: `${fontSize}px`,
      fontFamily,
      fontWeight,
      lineHeight: String(lineHeight),
      letterSpacing: "normal",
      textRendering: "auto",
      WebkitFontSmoothing: "antialiased",
      caretColor: mainColor,
    });
    if (variant === "filled") {
      Object.assign(ta2.style, {
        outline: "none",
        caretColor: inverseColor,
      });
    } else if (variant === "outlined") {
      ta2.style.caretColor = mainColor;
    }
    let shape;
    const isNew = !existing;
    if (existing) {
      shape = existing;
    } else {
      const data2 = buildTextShapeData(point2, "", this.style);
      shape = new TextShape(data2);
    }
    const originalText = shape.data.text;
    const padXForCanvas = variant === "filled" ? Math.max(4, fontSize * 0.45) : 0;
    if (isNew) {
      const minX = padXForCanvas;
      const minY = 0;
      const maxX = Math.max(minX, this.width - fontSize - padXForCanvas);
      const maxY = Math.max(minY, this.height - fontSize);
      shape.data.x = Math.max(minX, Math.min(maxX, shape.data.x));
      shape.data.y = Math.max(minY, Math.min(maxY, shape.data.y));
    }
    const taMaxWidth = Math.max(fontSize, this.width - shape.data.x - padXForCanvas);
    this.beginInteraction();
    if (isNew) {
      this.shapes.push(shape);
      this.shapeMap.set(shape.id, shape);
    }
    this.renderer.drawShapes(this.shapes);
    ta2.value = originalText;
    ta2.style.left = `${shape.data.x}px`;
    ta2.style.top = `${shape.data.y}px`;
    ta2.style.maxWidth = `${taMaxWidth}px`;
    this.editingTextShape = shape;
    this.editingTextIsNew = isNew;
    this.editingTextOriginal = originalText;
    autoResizeTextarea(ta2, fontSize, lineHeight, taMaxWidth);
    this.container.appendChild(ta2);
    setTimeout(() => ta2.focus(), 0);
    const onInput = () => {
      shape.data.text = ta2.value;
      autoResizeTextarea(ta2, fontSize, lineHeight, taMaxWidth);
      this.renderer.drawShapes(this.shapes);
    };
    const onBlur = () => this.closeTextEditor(true);
    const onKey = (e2) => {
      if (e2.key === "Escape") {
        e2.preventDefault();
        this.closeTextEditor(false);
      }
    };
    ta2.addEventListener("input", onInput);
    ta2.addEventListener("blur", onBlur);
    ta2.addEventListener("keydown", onKey);
    this.textarea = ta2;
  }
  /**
   * 标签文字编辑：在 tag 卡片中央弹一个 textarea，输入完成后写回 tag.data.text。
   * 取消或留空 → 把这个 tag 从 shapes 中移除（占位卡片不应留下空标签）。
   *
   * 调用方（TagTool）应在调用本方法前 beginInteraction 并把 tag 加入 shapes，
   * 这样整个"创建 tag + 输入文字"是一次事务，撤销一步彻底消失。
   */
  openTagTextEditor(tagId) {
    this.closeTextEditor(false);
    const shape = this.shapeMap.get(tagId);
    if (!(shape instanceof TagShape)) return;
    const data2 = shape.data;
    const style2 = data2.style;
    const fontSize = style2.fontSize ?? TAG_DEFAULT_FONT_SIZE;
    const fontFamily =
      style2.fontFamily ?? 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    const fontWeight = String(style2.fontWeight ?? 500);
    const fg = style2.tagTextColor ?? "#FFFFFF";
    const ta2 = document.createElement("textarea");
    Object.assign(ta2.style, {
      position: "absolute",
      background: "transparent",
      border: "none",
      padding: "0",
      margin: "0",
      outline: "none",
      resize: "none",
      overflow: "hidden",
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
      wordBreak: "break-all",
      boxSizing: "content-box",
      zIndex: "10",
      // 文字本身透明，仅作为 caret / 输入承载层；可见文字由 Canvas 实时渲染。
      // 这样根治 Canvas fillText 与 textarea 文字基线无法像素级对齐导致的"重影"问题。
      color: "transparent",
      caretColor: fg,
      textAlign: "center",
      fontSize: `${fontSize}px`,
      fontFamily,
      fontWeight,
      lineHeight: "1.4",
      letterSpacing: "normal",
      WebkitFontSmoothing: "antialiased",
    });
    ta2.value = data2.text || "";
    if (keepTagInCanvas(data2, this.width, this.height)) {
      this.renderer.drawShapes(this.shapes);
    }
    const placeTextarea = () => {
      const innerW = Math.max(fontSize * 2, data2.width - TAG_PADDING_X * 2);
      const innerH = Math.max(fontSize * 1.4, data2.height - TAG_PADDING_Y * 2);
      ta2.style.width = `${innerW}px`;
      ta2.style.height = `${innerH}px`;
      ta2.style.left = `${data2.x + (data2.width - innerW) / 2}px`;
      ta2.style.top = `${data2.y + (data2.height - innerH) / 2}px`;
    };
    placeTextarea();
    this.editingTagShape = shape;
    this.container.appendChild(ta2);
    setTimeout(() => ta2.focus(), 0);
    const onInput = () => {
      data2.text = ta2.value;
      this.renderer.drawShapes(this.shapes);
      if (keepTagInCanvas(data2, this.width, this.height)) {
        this.renderer.drawShapes(this.shapes);
      }
      placeTextarea();
    };
    const onBlur = () => this.closeTextEditor(true);
    const onKey = (e2) => {
      if (e2.key === "Escape") {
        e2.preventDefault();
        this.closeTextEditor(false);
      } else if (e2.key === "Enter" && !e2.shiftKey) {
        e2.preventDefault();
        this.closeTextEditor(true);
      }
    };
    ta2.addEventListener("input", onInput);
    ta2.addEventListener("blur", onBlur);
    ta2.addEventListener("keydown", onKey);
    this.textarea = ta2;
  }
  closeTextEditor(commit) {
    if (!this.textarea) return;
    const ta2 = this.textarea;
    const text2 = ta2.value;
    const editing = this.editingTextShape;
    const editingTag = this.editingTagShape;
    const isNew = this.editingTextIsNew;
    const originalText = this.editingTextOriginal;
    this.textarea = null;
    this.editingTextShape = null;
    this.editingTagShape = null;
    this.editingTextIsNew = false;
    this.editingTextOriginal = "";
    ta2.parentElement?.removeChild(ta2);
    if (editingTag) {
      const removeTag = !commit || !text2.trim();
      if (removeTag) {
        const idx = this.shapes.findIndex((s2) => s2.id === editingTag.id);
        let removed = null;
        if (idx >= 0) {
          removed = cloneShapeData(this.shapes[idx].data);
          this.shapes.splice(idx, 1);
          this.shapeMap.delete(editingTag.id);
        }
        this.commitInteraction();
        if (removed) this.bus.emit("shape:remove", removed);
        return;
      }
      editingTag.data.text = text2;
      this.commitInteraction();
      this.bus.emit("shape:update", cloneShapeData(editingTag.data));
      return;
    }
    if (editing) {
      if (!commit) {
        if (isNew) {
          const idx = this.shapes.findIndex((s2) => s2.id === editing.id);
          if (idx >= 0) {
            this.shapes.splice(idx, 1);
            this.shapeMap.delete(editing.id);
          }
        } else {
          editing.data.text = originalText;
        }
        this.renderer.drawShapes(this.shapes);
        this.cancelInteraction();
        return;
      }
      if (!text2.trim()) {
        const removed = cloneShapeData(editing.data);
        const idx = this.shapes.findIndex((s2) => s2.id === editing.id);
        if (idx >= 0) {
          this.shapes.splice(idx, 1);
          this.shapeMap.delete(editing.id);
        }
        this.renderer.drawShapes(this.shapes);
        this.commitInteraction();
        this.bus.emit("shape:remove", removed);
        return;
      }
      editing.data.text = text2;
      this.renderer.drawShapes(this.shapes);
      this.commitInteraction();
      this.bus.emit(isNew ? "shape:add" : "shape:update", cloneShapeData(editing.data));
      return;
    }
  }
  // ==================== 内部 ====================
  makeTool(name2) {
    switch (name2) {
      case "select":
        return new SelectTool(this);
      case "rectangle":
        return new DrawShapeTool(this, "rectangle");
      case "ellipse":
        return new DrawShapeTool(this, "ellipse");
      case "line":
        return new DrawShapeTool(this, "line");
      case "arrow":
        return new DrawShapeTool(this, "arrow");
      case "brush":
        return new BrushTool(this);
      case "text":
        return new TextTool(this);
      case "tag":
        return new TagTool(this);
      case "mosaic":
        return new MosaicTool(this);
    }
  }
  applyCursor() {
    this.renderer.main.style.cursor = this.currentTool.cursor;
  }
  cloneShapesData() {
    return this.shapes.map((s2) => cloneShapeData(s2.data));
  }
  applySnapshot(snapshot2) {
    const oldMap = new Map(this.shapes.map((s2) => [s2.id, s2]));
    this.shapes = snapshot2.map((data2) => {
      const old = oldMap.get(data2.id);
      if (old) {
        Object.assign(old.data, data2);
        return old;
      }
      return createShape(data2);
    });
    this.shapeMap = new Map(this.shapes.map((s2) => [s2.id, s2]));
    if (this.selectedId && !this.shapeMap.has(this.selectedId)) this.selectedId = null;
    this.renderer.drawShapes(this.shapes);
    this.renderer.setSelected(this.getSelectedShape());
    this.emitChange();
  }
  emitChange() {
    this.bus.emit("change", this.getState());
  }
  // ==================== 事件绑定 ====================
  bindEvents() {
    const c3 = this.renderer.main;
    c3.addEventListener("pointerdown", this.handlePointerDown);
    c3.addEventListener("pointermove", this.handlePointerMove);
    c3.addEventListener("pointerup", this.handlePointerUp);
    c3.addEventListener("pointercancel", this.handlePointerUp);
    c3.addEventListener("dblclick", this.handleDoubleClick);
    if (this.shortcutsEnabled) {
      window.addEventListener("keydown", this.handleKeyDown);
    }
  }
  unbindEvents() {
    const c3 = this.renderer.main;
    c3.removeEventListener("pointerdown", this.handlePointerDown);
    c3.removeEventListener("pointermove", this.handlePointerMove);
    c3.removeEventListener("pointerup", this.handlePointerUp);
    c3.removeEventListener("pointercancel", this.handlePointerUp);
    c3.removeEventListener("dblclick", this.handleDoubleClick);
    if (this.shortcutsEnabled) {
      window.removeEventListener("keydown", this.handleKeyDown);
    }
  }
  toToolEvent(e2) {
    const rect = this.renderer.main.getBoundingClientRect();
    const scaleX = rect.width === 0 ? 1 : this.width / rect.width;
    const scaleY = rect.height === 0 ? 1 : this.height / rect.height;
    return {
      point: {
        x: (e2.clientX - rect.left) * scaleX,
        y: (e2.clientY - rect.top) * scaleY,
      },
      shiftKey: e2.shiftKey,
      ctrlKey: e2.ctrlKey,
      altKey: e2.altKey,
      metaKey: e2.metaKey,
      button: e2.button,
      native: e2,
    };
  }
  handlePointerDown = (e2) => {
    if (this.textarea) return;
    this.renderer.main.setPointerCapture(e2.pointerId);
    const ev = this.toToolEvent(e2);
    if (this.currentToolName !== "select" && this.shouldDelegateToSelection(ev.point)) {
      this.interactionTool = this.getDelegationSelectTool();
    } else {
      this.interactionTool = this.currentTool;
      if (this.currentToolName !== "select") {
        this.select(null);
      }
    }
    this.interactionTool.onPointerDown(ev);
  };
  handlePointerMove = (e2) => {
    if (this.textarea) return;
    const ev = this.toToolEvent(e2);
    if (this.interactionTool) {
      this.interactionTool.onPointerMove(ev);
      return;
    }
    if (this.currentToolName === "select") {
      this.currentTool.onPointerMove(ev);
      return;
    }
    this.updateHoverCursorForCreationTool(ev.point);
    this.currentTool.onPointerMove(ev);
  };
  handlePointerUp = (e2) => {
    if (this.textarea) return;
    try {
      this.renderer.main.releasePointerCapture(e2.pointerId);
    } catch {}
    const tool2 = this.interactionTool ?? this.currentTool;
    this.interactionTool = null;
    tool2.onPointerUp(this.toToolEvent(e2));
  };
  getDelegationSelectTool() {
    if (!this.delegationSelectTool) {
      this.delegationSelectTool = new SelectTool(this);
    }
    return this.delegationSelectTool;
  }
  shouldDelegateToSelection(point2) {
    const sel = this.getSelectedShape();
    if (sel && hitHandle(point2, sel.getBounds(), this.getUiScale())) return true;
    return this.findShapeAt(point2) !== null;
  }
  updateHoverCursorForCreationTool(point2) {
    const sel = this.getSelectedShape();
    if (sel) {
      const corner = hitHandle(point2, sel.getBounds(), this.getUiScale());
      if (corner) {
        this.setCursor(cornerCursor(corner));
        return;
      }
    }
    if (this.findShapeAt(point2)) {
      this.setCursor("move");
      return;
    }
    this.setCursor(this.currentTool.cursor);
  }
  handleDoubleClick = (e2) => {
    const rect = this.renderer.main.getBoundingClientRect();
    const scaleX = rect.width === 0 ? 1 : this.width / rect.width;
    const scaleY = rect.height === 0 ? 1 : this.height / rect.height;
    const point2 = {
      x: (e2.clientX - rect.left) * scaleX,
      y: (e2.clientY - rect.top) * scaleY,
    };
    const hit = this.findShapeAt(point2);
    if (hit instanceof TextShape) {
      this.setTool("text");
      this.openTextEditor(point2, hit);
    } else if (hit instanceof TagShape) {
      this.setTool("select");
      this.openTagTextEditor(hit.id);
    }
  };
  handleKeyDown = (e2) => {
    if (this.textarea) return;
    if ((e2.metaKey || e2.ctrlKey) && e2.key.toLowerCase() === "z") {
      e2.preventDefault();
      if (e2.shiftKey) this.redo();
      else this.undo();
      return;
    }
    if ((e2.metaKey || e2.ctrlKey) && e2.key.toLowerCase() === "y") {
      e2.preventDefault();
      this.redo();
      return;
    }
    this.currentTool.onKeyDown(e2);
  };
}
function autoResizeTextarea(ta2, fontSize, lineHeight, maxWidth) {
  const lines = ta2.value.split("\n");
  const measure = document.createElement("span");
  measure.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${ta2.style.fontWeight} ${fontSize}px ${ta2.style.fontFamily};letter-spacing:normal;`;
  document.body.appendChild(measure);
  let maxW = 0;
  for (const line of lines) {
    measure.textContent = line || " ";
    const w3 = measure.getBoundingClientRect().width;
    if (w3 > maxW) maxW = w3;
  }
  document.body.removeChild(measure);
  const cap2 = Math.max(8, Math.floor(maxWidth));
  ta2.style.width = `${Math.min(cap2, Math.max(8, Math.ceil(maxW) + 2))}px`;
  ta2.style.height = `${Math.max(1, lines.length) * fontSize * lineHeight}px`;
}
function createEditor(options) {
  return new Editor2(options);
}
export const ImageEditor = reactExports.forwardRef(function ImageEditor2(props, ref) {
  const containerRef = reactExports.useRef(null);
  const editorRef = reactExports.useRef(null);
  const callbacksRef = reactExports.useRef({
    onChange: props.onChange,
    onReady: props.onReady,
    onError: props.onError,
  });
  const initRef = reactExports.useRef({
    src: props.src,
    width: props.width,
    height: props.height,
    initialTool: props.initialTool,
    initialStyle: props.initialStyle,
    disableShortcuts: props.disableShortcuts,
  });
  reactExports.useLayoutEffect(() => {
    if (!containerRef.current) return;
    const editor = createEditor({
      container: containerRef.current,
      image: initRef.current.src,
      width: initRef.current.width,
      height: initRef.current.height,
      initialStyle: initRef.current.initialStyle,
      disableShortcuts: initRef.current.disableShortcuts,
    });
    editorRef.current = editor;
    if (initRef.current.initialTool) {
      editor.setTool(initRef.current.initialTool);
    }
    const offChange = editor.on("change", (state2) => {
      callbacksRef.current.onChange?.(state2);
    });
    const offReady = editor.on("ready", () => {
      callbacksRef.current.onReady?.();
    });
    const offError = editor.on("error", (error) => callbacksRef.current.onError?.(error));
    return () => {
      offError();
      offChange();
      offReady();
      editor.destroy();
      editorRef.current = null;
    };
  }, []);
  const initialSrcRef = reactExports.useRef(props.src);
  reactExports.useEffect(() => {
    if (props.src === initialSrcRef.current) return;
    void editorRef.current?.loadImage(props.src).catch(() => void 0);
  }, [props.src]);
  reactExports.useEffect(() => {
    if (props.uiScale === void 0) return;
    editorRef.current?.setUiScale(props.uiScale);
  }, [props.uiScale]);
  reactExports.useEffect(() => {
    callbacksRef.current.onChange = props.onChange;
    callbacksRef.current.onReady = props.onReady;
    callbacksRef.current.onError = props.onError;
  }, [props.onChange, props.onReady, props.onError]);
  reactExports.useImperativeHandle(
    ref,
    () => ({
      setTool: (t2) => editorRef.current?.setTool(t2),
      setStyle: (s2) => editorRef.current?.setStyle(s2),
      undo: () => editorRef.current?.undo(),
      redo: () => editorRef.current?.redo(),
      clear: () => editorRef.current?.clear(),
      deleteSelected: () => editorRef.current?.deleteSelected(),
      loadImage: (src) => {
        const editor = editorRef.current;
        if (!editor) return Promise.resolve();
        return editor.loadImage(src);
      },
      toBlob: (type2, quality) => {
        const editor = editorRef.current;
        if (!editor) return Promise.reject(new Error("ImageEditor not ready"));
        return editor.toBlob(type2, quality);
      },
      toDataURL: (type2, quality) => {
        const editor = editorRef.current;
        if (!editor) return "";
        return editor.toDataURL(type2, quality);
      },
      getEditor: () => editorRef.current,
      getSize: () => editorRef.current?.getSize() ?? null,
    }),
    [],
  );
  return (
    <div
      ref={containerRef}
      className={props.className}
      style={{
        position: "relative",
        display: "inline-block",
        userSelect: "none",
        ...props.style,
      }}
    />
  );
});
const EMPTY_STATE = {
  shapes: [],
  selectedId: null,
  tool: "rectangle",
  style: DEFAULT_STYLE,
  canUndo: false,
  canRedo: false,
};
export function useEditorState(handleRef) {
  const [state2, setState] = reactExports.useState(EMPTY_STATE);
  reactExports.useEffect(() => {
    let off = null;
    let rafId2 = null;
    let cancelled = false;
    const attach = (retry) => {
      if (cancelled) return;
      const editor = handleRef.current?.getEditor();
      if (!editor) {
        if (retry) {
          rafId2 = requestAnimationFrame(() => attach(false));
        }
        return;
      }
      setState(editor.getState());
      off = editor.on("change", (s2) => {
        if (!cancelled) setState(s2);
      });
    };
    attach(true);
    return () => {
      cancelled = true;
      if (rafId2 !== null) cancelAnimationFrame(rafId2);
      off?.();
    };
  }, [handleRef]);
  return state2;
}
const TOOL_ICON_SIZE = 16;
const ACTION_ICON_SIZE = 14;
export const INPLACE_EDIT_TOOLBAR_RESERVE_PX = 116;
const TOOLS_WITH_STYLE = new Set([
  "rectangle",
  "ellipse",
  "arrow",
  "line",
  "brush",
  "text",
  "tag",
  "mosaic",
]);
const COLORS$1 = [
  "#FF3B30",
  "#FF9500",
  "#FFCC00",
  "#34C759",
  "#007AFF",
  "#AF52DE",
  "#1C1C1E",
  "#FFFFFF",
];
const STROKE_WIDTHS$1 = [
  {
    value: 2,
    dotPx: 4,
  },
  {
    value: 4,
    dotPx: 7,
  },
  {
    value: 8,
    dotPx: 11,
  },
];
const MOSAIC_BRUSH_SIZES = [
  {
    value: 6,
    dotPx: 4,
  },
  {
    value: 12,
    dotPx: 7,
  },
  {
    value: 18,
    dotPx: 11,
  },
];
const MOSAIC_BLOCK_RANGE = {
  min: 0,
  max: 10,
};
const BLUR_RADIUS_RANGE = {
  min: 0,
  max: 10,
};
function strengthPercentToPx(percent2, mode2) {
  const range2 = mode2 === "blur" ? BLUR_RADIUS_RANGE : MOSAIC_BLOCK_RANGE;
  const pct = Math.min(100, Math.max(0, percent2));
  return Math.round(range2.min + ((range2.max - range2.min) * pct) / 100);
}
const FONT_SIZES = [12, 16, 24, 36, 48, 60, 72, 96];
function PlainTextIcon({ size: size2 = 16 }) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3 3h10v2.2h-1.05v-1.1H8.7V12h1.2v1.1H6.1V12h1.2V4.1H4.05V5.2H3z" />
    </CompositedSvg>
  );
}
function FilledTextIcon({ size: size2 = 16 }) {
  return (
    <CompositedSvg width={size2} height={size2} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.5 4.6h7v1.6h-.85v-.7H8.65v5.5h.95v.9H6.4v-.9h.95v-5.5H5.35v.7H4.5z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
function OutlinedTextIcon({ size: size2 = 16 }) {
  return (
    <CompositedSvg width={size2} height={size2} viewBox="2 2 12 12" fill="none" aria-hidden="true">
      <path
        d="M3 3h10v2.2h-1.05v-1.1H8.7V12h1.2v1.1H6.1V12h1.2V4.1H4.05V5.2H3z"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
const TEXT_VARIANTS = [
  {
    id: "plain",
    i18nKey: "imageEdit.textVariantPlain",
    defaultLabel: "Plain text",
    Icon: PlainTextIcon,
  },
  {
    id: "filled",
    i18nKey: "imageEdit.textVariantFilled",
    defaultLabel: "Filled text",
    Icon: FilledTextIcon,
  },
  {
    id: "outlined",
    i18nKey: "imageEdit.textVariantOutlined",
    defaultLabel: "Outlined text",
    Icon: OutlinedTextIcon,
  },
];
const HEADER_FLOW_HEIGHT$2 = 28;
const TOOLBAR_GAP$3 = 16;
const zoomSelector$5 = (s2) => s2.transform[2];
function ImageInplaceEditToolbarInner({
  visible,
  activeTool,
  activeColor,
  activeStrokeWidth,
  activeTextVariant,
  activeFontSize,
  activeMosaicMode,
  activeMosaicShape,
  activeMosaicBrushSize,
  activeMosaicStrength,
  canUndo,
  canRedo,
  hasShapes,
  saving,
  onSelectTool,
  onSelectColor,
  onSelectStrokeWidth,
  onSelectTextVariant,
  onSelectFontSize,
  onSelectMosaicMode,
  onSelectMosaicShape,
  onSelectMosaicBrushSize,
  onSelectMosaicStrength,
  onUndo,
  onRedo,
  onClear,
  onCancel,
  onSave,
}) {
  const { t: t2 } = useTranslation();
  const zoom2 = useStore$3(zoomSelector$5);
  const offset2 = HEADER_FLOW_HEIGHT$2 * zoom2 + TOOLBAR_GAP$3;
  const showStylePopover = TOOLS_WITH_STYLE.has(activeTool);
  const isTextTool = activeTool === "text";
  const isTagTool = activeTool === "tag";
  const isMosaicTool = activeTool === "mosaic";
  const showVariant = isTextTool;
  const showFontSize = isTextTool || isTagTool;
  const showStrokeWidth = !isTextTool && !isTagTool && !isMosaicTool;
  const showColors = !isMosaicTool;
  const showMosaic = isMosaicTool;
  const [fontSizeOpen, setFontSizeOpen] = reactExports.useState(false);
  const fontSizeMenuRef = reactExports.useRef(null);
  const fontSizeBtnRef = reactExports.useRef(null);
  const [brushSizeOpen, setBrushSizeOpen] = reactExports.useState(false);
  const brushSizeMenuRef = reactExports.useRef(null);
  const brushSizeBtnRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    setFontSizeOpen(false);
    setBrushSizeOpen(false);
  }, [activeTool]);
  reactExports.useEffect(() => {
    if (!fontSizeOpen) return;
    const onDown = (e2) => {
      const t22 = e2.target;
      if (!t22) return;
      if (fontSizeMenuRef.current?.contains(t22)) return;
      if (fontSizeBtnRef.current?.contains(t22)) return;
      setFontSizeOpen(false);
    };
    const onKey = (e2) => {
      if (e2.key === "Escape") setFontSizeOpen(false);
    };
    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [fontSizeOpen]);
  reactExports.useEffect(() => {
    if (!brushSizeOpen) return;
    const onDown = (e2) => {
      const t22 = e2.target;
      if (!t22) return;
      if (brushSizeMenuRef.current?.contains(t22)) return;
      if (brushSizeBtnRef.current?.contains(t22)) return;
      setBrushSizeOpen(false);
    };
    const onKey = (e2) => {
      if (e2.key === "Escape") setBrushSizeOpen(false);
    };
    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [brushSizeOpen]);
  const wrapperRef = reactExports.useRef(null);
  const popoverRef = reactExports.useRef(null);
  const mainBarRef = reactExports.useRef(null);
  const [popoverLeft, setPopoverLeft] = reactExports.useState(null);
  reactExports.useLayoutEffect(() => {
    if (!visible || !showStylePopover) {
      setPopoverLeft(null);
      return;
    }
    const wrapper = wrapperRef.current;
    const popover = popoverRef.current;
    const bar = mainBarRef.current;
    if (!wrapper || !popover || !bar) return;
    const btn = bar.querySelector(`[data-tool-id="${activeTool}"]`);
    if (!btn) return;
    const wrapperRect = wrapper.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const btnCenter = btnRect.left - wrapperRect.left + btnRect.width / 2;
    setPopoverLeft(btnCenter - popover.offsetWidth / 2);
  }, [
    activeTool,
    showStylePopover,
    visible,
    zoom2,
    activeFontSize,
    activeMosaicMode,
    activeMosaicShape,
  ]);
  return (
    <NodeToolbar$1 isVisible={visible} position={Position.Top} offset={offset2} align="center">
      <div
        ref={wrapperRef}
        className="relative inline-flex flex-col select-none animate-[toolbar-fade-in_0.15s_ease-out]"
        onPointerDown={(e2) => e2.stopPropagation()}
        onWheel={(e2) => e2.stopPropagation()}
        onContextMenu={(e2) => e2.stopPropagation()}
      >
        <div
          ref={mainBarRef}
          className="canvas-toolbar-surface"
          data-canvas-toolbar="true"
          data-density="compact"
        >
          <div className="flex items-center gap-0.5">
            {TOOLS$1.map((tool2) => {
              const active2 = activeTool === tool2.id;
              return (
                <ToolbarIconButton
                  key={tool2.id}
                  dataToolId={tool2.id}
                  title={t2(tool2.i18nKey, tool2.defaultLabel)}
                  active={active2}
                  onClick={() => onSelectTool(tool2.id)}
                >
                  <tool2.Icon size={TOOL_ICON_SIZE} strokeWidth={2} />
                </ToolbarIconButton>
              );
            })}
          </div>
          <Divider$5 />
          <div className="flex items-center gap-0.5">
            <ToolbarIconButton title={t2("imageEdit.undo")} disabled={!canUndo} onClick={onUndo}>
              <Undo2 size={ACTION_ICON_SIZE} strokeWidth={2} />
            </ToolbarIconButton>
            <ToolbarIconButton title={t2("imageEdit.redo")} disabled={!canRedo} onClick={onRedo}>
              <Redo2 size={ACTION_ICON_SIZE} strokeWidth={2} />
            </ToolbarIconButton>
            <ToolbarIconButton
              title={t2("imageEdit.clear")}
              disabled={!hasShapes}
              onClick={onClear}
            >
              <Trash2 size={ACTION_ICON_SIZE} strokeWidth={2} />
            </ToolbarIconButton>
          </div>
          <Divider$5 />
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="canvas-toolbar-action"
            aria-label={t2("common.cancel")}
            title={t2("common.cancel")}
          >
            <CloseIcon$1 />
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="canvas-toolbar-action"
            aria-label={saving ? t2("imageEdit.saving") : t2("imageEdit.saveToCanvas")}
            title={saving ? t2("imageEdit.saving") : t2("imageEdit.saveToCanvas")}
            data-variant="primary"
          >
            <SendArrowIcon />
          </button>
        </div>
        {showStylePopover && (
          <div
            ref={popoverRef}
            className="canvas-toolbar-surface absolute bottom-full mb-2 animate-[toolbar-fade-in_0.15s_ease-out]"
            style={{
              left: popoverLeft ?? 0,
              visibility: popoverLeft === null ? "hidden" : "visible",
            }}
            data-canvas-toolbar="true"
            data-density="compact"
          >
            <div
              aria-hidden={true}
              className="absolute -bottom-[5px] left-1/2 h-2 w-2 [border-bottom-width:var(--canvas-toolbar-border-width)] [border-right-width:var(--canvas-toolbar-border-width)]"
              style={{
                transform: "translateX(-50%) rotate(45deg)",
                background: "var(--canvas-toolbar-bg)",
                borderColor: "var(--canvas-toolbar-border)",
              }}
            />
            {showVariant && (
              <>
                <div className="flex items-center gap-0.5">
                  {TEXT_VARIANTS.map((v2) => {
                    const active2 = activeTextVariant === v2.id;
                    return (
                      <ToolbarIconButton
                        key={v2.id}
                        title={t2(v2.i18nKey, v2.defaultLabel)}
                        active={active2}
                        onClick={() => onSelectTextVariant(v2.id)}
                      >
                        <v2.Icon size={16} />
                      </ToolbarIconButton>
                    );
                  })}
                </div>
                <Divider$5 />
              </>
            )}
            {showFontSize && (
              /* 字号下拉 */ <div className="relative flex items-center">
                <button
                  ref={fontSizeBtnRef}
                  type="button"
                  title={t2("imageEdit.fontSize")}
                  aria-haspopup="listbox"
                  aria-expanded={fontSizeOpen}
                  onClick={() => setFontSizeOpen((v2) => !v2)}
                  className="canvas-toolbar-action"
                  data-active={fontSizeOpen || void 0}
                >
                  <span>{activeFontSize}pt</span>
                  <ChevronDown
                    size={12}
                    strokeWidth={2}
                    style={{
                      transform: fontSizeOpen ? "rotate(180deg)" : void 0,
                      transition: "transform 0.15s",
                    }}
                    data-toolbar-icon="disclosure"
                  />
                </button>
                {fontSizeOpen && (
                  <div
                    ref={fontSizeMenuRef}
                    role="listbox"
                    className="absolute left-0 bottom-full z-10 mb-2 flex min-w-[80px] flex-col canvas-toolbar-menu py-1 animate-[toolbar-fade-in_0.12s_ease-out]"
                    data-density="compact"
                  >
                    {FONT_SIZES.map((size2) => {
                      const active2 = activeFontSize === size2;
                      return (
                        <button
                          key={size2}
                          type="button"
                          role="option"
                          aria-selected={active2}
                          onClick={() => {
                            onSelectFontSize(size2);
                            setFontSizeOpen(false);
                          }}
                          className="canvas-toolbar-action"
                        >
                          <span>{size2}pt</span>
                          {active2 && (
                            <Check
                              size={12}
                              strokeWidth={3}
                              className="ml-2"
                              data-toolbar-icon="disclosure"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {showStrokeWidth && (
              /* Stroke width — dot size previews the stroke; the button owns selection. */ <div className="flex items-center gap-0.5">
                {STROKE_WIDTHS$1.map(({ value, dotPx }) => {
                  const active2 = activeStrokeWidth === value;
                  return (
                    <ToolbarIconButton
                      key={value}
                      title={`${t2("imageEdit.strokeWidth")} ${value}`}
                      onClick={() => onSelectStrokeWidth(value)}
                      active={active2}
                    >
                      <span
                        className="block rounded-full"
                        style={{
                          width: dotPx,
                          height: dotPx,
                          background: "var(--canvas-toolbar-fg)",
                        }}
                      />
                    </ToolbarIconButton>
                  );
                })}
              </div>
            )}
            {showMosaic && (
              <>
                <div className="flex items-center gap-0.5">
                  <ToolbarIconButton
                    title={t2("imageEdit.mosaicModeMosaic")}
                    active={activeMosaicMode === "mosaic"}
                    onClick={() => onSelectMosaicMode("mosaic")}
                  >
                    <MosaicIcon size={TOOL_ICON_SIZE} strokeWidth={1.75} />
                  </ToolbarIconButton>
                  <ToolbarIconButton
                    title={t2("imageEdit.mosaicModeBlur")}
                    active={activeMosaicMode === "blur"}
                    onClick={() => onSelectMosaicMode("blur")}
                  >
                    <Droplet size={TOOL_ICON_SIZE} strokeWidth={2} />
                  </ToolbarIconButton>
                </div>
                <Divider$5 />
                <div className="flex items-center gap-0.5">
                  <ToolbarIconButton
                    title={t2("imageEdit.mosaicShapeBrush")}
                    active={activeMosaicShape === "brush"}
                    onClick={() => onSelectMosaicShape("brush")}
                  >
                    <Hand size={TOOL_ICON_SIZE} strokeWidth={2} />
                  </ToolbarIconButton>
                  <div className="relative flex items-center">
                    <button
                      ref={brushSizeBtnRef}
                      type="button"
                      title={t2("imageEdit.mosaicBrushSize")}
                      aria-haspopup="listbox"
                      aria-expanded={brushSizeOpen}
                      onClick={() => setBrushSizeOpen((v2) => !v2)}
                      className="canvas-toolbar-action canvas-toolbar-disclosure"
                      data-active={brushSizeOpen || void 0}
                    >
                      <ChevronDown
                        size={12}
                        strokeWidth={2}
                        style={{
                          transform: brushSizeOpen ? "rotate(180deg)" : void 0,
                          transition: "transform 0.15s",
                        }}
                        data-toolbar-icon="disclosure"
                      />
                    </button>
                    {brushSizeOpen && (
                      <div
                        ref={brushSizeMenuRef}
                        role="listbox"
                        aria-label={t2("imageEdit.mosaicBrushSize")}
                        className="absolute left-1/2 bottom-full z-10 mb-2 flex -translate-x-1/2 flex-col items-center gap-1 canvas-toolbar-menu p-2 animate-[toolbar-fade-in_0.12s_ease-out]"
                        data-density="compact"
                      >
                        {MOSAIC_BRUSH_SIZES.map(({ value, dotPx }) => {
                          const active2 = activeMosaicBrushSize === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              role="option"
                              aria-selected={active2}
                              title={`${t2("imageEdit.mosaicBrushSize")} ${value}`}
                              aria-label={`${t2("imageEdit.mosaicBrushSize")} ${value}`}
                              data-content="icon"
                              onClick={() => {
                                onSelectMosaicBrushSize(value);
                                if (activeMosaicShape !== "brush") {
                                  onSelectMosaicShape("brush");
                                }
                                setBrushSizeOpen(false);
                              }}
                              className="canvas-toolbar-action"
                            >
                              <span
                                className="block rounded-full"
                                style={{
                                  width: dotPx,
                                  height: dotPx,
                                  background: "var(--canvas-toolbar-fg)",
                                }}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <ToolbarIconButton
                    title={t2("imageEdit.mosaicShapeRect")}
                    active={activeMosaicShape === "rectangle"}
                    onClick={() => onSelectMosaicShape("rectangle")}
                  >
                    <BoxSelect size={TOOL_ICON_SIZE} strokeWidth={2} />
                  </ToolbarIconButton>
                </div>
                <Divider$5 />
                <div className="flex h-7 items-center gap-2 pl-1 pr-2">
                  <span
                    className="whitespace-nowrap canvas-toolbar-label"
                    style={{
                      color: "var(--canvas-toolbar-fg)",
                    }}
                  >
                    {activeMosaicMode === "blur"
                      ? t2("imageEdit.mosaicStrengthBlur")
                      : t2("imageEdit.mosaicStrengthMosaic")}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={activeMosaicStrength}
                    onChange={(e2) => {
                      const percent2 = Number(e2.currentTarget.value);
                      onSelectMosaicStrength(
                        percent2,
                        strengthPercentToPx(percent2, activeMosaicMode),
                      );
                    }}
                    aria-label={t2("imageEdit.mosaicStrength")}
                    className="image-edit-mosaic-slider h-1 w-[110px] cursor-pointer appearance-none rounded-full"
                    style={{
                      background: `linear-gradient(to right, var(--canvas-controls-primary, #007AFF) 0%, var(--canvas-controls-primary, #007AFF) ${activeMosaicStrength}%, rgba(0,0,0,0.15) ${activeMosaicStrength}%, rgba(0,0,0,0.15) 100%)`,
                    }}
                  />
                  <span
                    className="inline-block min-w-[34px] text-right canvas-toolbar-label tabular-nums"
                    style={{
                      color: "var(--canvas-toolbar-fg)",
                    }}
                  >
                    {activeMosaicStrength}%
                  </span>
                </div>
              </>
            )}
            {showColors && (
              <>
                <Divider$5 />
                <div className="flex items-center gap-[6px]">
                  {COLORS$1.map((color2) => {
                    const active2 = activeColor.toLowerCase() === color2.toLowerCase();
                    const checkColor = isLightColor(color2) ? "#1C1C1E" : "#FFFFFF";
                    return (
                      <button
                        key={color2}
                        type="button"
                        title={color2}
                        aria-label={color2}
                        aria-pressed={active2}
                        onClick={() => onSelectColor(color2)}
                        className="inline-flex size-5 items-center justify-center rounded-[4px] border border-black/10 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: color2,
                        }}
                      >
                        {active2 && (
                          <Check
                            size={12}
                            strokeWidth={3}
                            style={{
                              color: checkColor,
                            }}
                            data-toolbar-icon="disclosure"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </NodeToolbar$1>
  );
}
const ImageInplaceEditToolbar = reactExports.memo(ImageInplaceEditToolbarInner);
DEFAULT_STYLE.stroke;
const IMAGE_INPLACE_DEFAULT_STROKE_WIDTH = STROKE_WIDTHS$1[0]?.value ?? 2;
const IMAGE_INPLACE_DEFAULT_TEXT_VARIANT = DEFAULT_STYLE.textVariant ?? "plain";
const IMAGE_INPLACE_DEFAULT_FONT_SIZE = 12;
const IMAGE_INPLACE_DEFAULT_MOSAIC_MODE = DEFAULT_STYLE.mosaicMode ?? "mosaic";
const IMAGE_INPLACE_DEFAULT_MOSAIC_SHAPE = DEFAULT_STYLE.mosaicShape ?? "rectangle";
const IMAGE_INPLACE_DEFAULT_MOSAIC_BRUSH_SIZE =
  MOSAIC_BRUSH_SIZES[0]?.value ?? DEFAULT_STYLE.mosaicBrushSize ?? 6;
const IMAGE_INPLACE_DEFAULT_MOSAIC_STRENGTH = 45;
function mosaicStrengthPercentToPx(percent2, mode2) {
  return strengthPercentToPx(percent2, mode2);
}
function ToolbarIconButton({
  title,
  active: active2 = false,
  disabled: disabled2 = false,
  onClick,
  children: children2,
  dataToolId,
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active2}
      disabled={disabled2}
      onClick={onClick}
      data-tool-id={dataToolId}
      data-content="icon"
      className="canvas-toolbar-action"
    >
      {children2}
    </button>
  );
}
function Divider$5() {
  return <div className="canvas-toolbar-separator" aria-hidden="true" />;
}
function isLightColor(hex2) {
  const c3 = hex2.replace("#", "");
  if (c3.length !== 6) return false;
  const r2 = Number.parseInt(c3.slice(0, 2), 16);
  const g2 = Number.parseInt(c3.slice(2, 4), 16);
  const b3 = Number.parseInt(c3.slice(4, 6), 16);
  return (r2 * 299 + g2 * 587 + b3 * 114) / 1e3 > 165;
}
const zoomSelector$4 = (s2) => s2.transform[2];
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
  const viewportZoom = useStore$3(zoomSelector$4);
  const editorRef = reactExports.useRef(null);
  const state2 = useEditorState(editorRef);
  const [uiActiveTool, setUiActiveTool] = reactExports.useState("select");
  const [activeColor, setActiveColor] = reactExports.useState(DEFAULT_STYLE.stroke);
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
  const [activeMosaicBrushSize, setActiveMosaicBrushSize] = reactExports.useState(
    IMAGE_INPLACE_DEFAULT_MOSAIC_BRUSH_SIZE,
  );
  const [activeMosaicStrength, setActiveMosaicStrength] = reactExports.useState(
    IMAGE_INPLACE_DEFAULT_MOSAIC_STRENGTH,
  );
  const [saving, setSaving] = reactExports.useState(false);
  const [editorReady, setEditorReady] = reactExports.useState(false);
  const handleEditorReady = reactExports.useCallback(() => setEditorReady(true), []);
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
  const handleUndo = reactExports.useCallback(() => editorRef.current?.undo(), []);
  const handleRedo = reactExports.useCallback(() => editorRef.current?.redo(), []);
  const handleClear = reactExports.useCallback(() => editorRef.current?.clear(), []);
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
  const handleCancel = reactExports.useCallback(() => onCancel(hasShapes), [hasShapes, onCancel]);
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
                blurRadius: mosaicStrengthPercentToPx(activeMosaicStrength, "blur"),
              }
            : {
                mosaicBlockSize: mosaicStrengthPercentToPx(activeMosaicStrength, "mosaic"),
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
export const ROTATE_STEP_DEG = 90;
export const ROTATE_ANGLE_MIN = -180;
export const ROTATE_ANGLE_MAX = 180;
const ROTATE_SNAP_DEG = 1;
export const DEFAULT_ROTATE_STATE = {
  angle: 0,
  flipH: false,
  flipV: false,
};
export function clamp$5(value, min2, max2) {
  return Math.max(min2, Math.min(max2, value));
}
export function normalizeAngle(deg) {
  let a2 = deg % 360;
  if (a2 > 180) a2 -= 360;
  if (a2 < -180) a2 += 360;
  return a2;
}
function maybeSnapAngle(deg) {
  const n2 = normalizeAngle(deg);
  for (const step of [-180, -90, 0, 90, 180]) {
    if (Math.abs(n2 - step) <= ROTATE_SNAP_DEG) return step;
  }
  return n2;
}
export function rotatedAabb(w3, h2, angleDeg) {
  const rad = (Math.abs(angleDeg) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    width: w3 * cos + h2 * sin,
    height: w3 * sin + h2 * cos,
  };
}
function loadImage$3(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e2) => reject(e2);
    img.src = src;
  });
}
export async function renderRotatedBlob(src, state2, originalWidth, originalHeight) {
  const img = await loadImage$3(src);
  const sw = originalWidth || img.naturalWidth;
  const sh = originalHeight || img.naturalHeight;
  const { width, height } = rotatedAabb(sw, sh, state2.angle);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("rotate-utils: 2d context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((state2.angle * Math.PI) / 180);
  ctx.scale(state2.flipH ? -1 : 1, state2.flipV ? -1 : 1);
  ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("rotate-utils: toBlob returned null"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}
export function isIdentityRotate(state2) {
  return state2.angle === 0 && !state2.flipH && !state2.flipV;
}
const HEADER_FLOW_HEIGHT$1 = 28;
const TOOLBAR_GAP$2 = 8;
const zoomSelector$3 = (s2) => s2.transform[2];
function ImageRotateEditToolbarInner({
  angle,
  onAngleChange,
  onRotate90,
  flipH,
  flipV,
  onFlipHorizontal,
  onFlipVertical,
  onCancel,
  onSave,
  saving,
  canSave,
  visible,
}) {
  const { t: t2 } = useTranslation();
  const zoom2 = useStore$3(zoomSelector$3);
  const offset2 = HEADER_FLOW_HEIGHT$1 * zoom2 + TOOLBAR_GAP$2;
  return (
    <NodeToolbar$1 isVisible={visible} position={Position.Top} offset={offset2} align="center">
      <div
        className="canvas-toolbar-surface animate-[toolbar-fade-in_0.15s_ease-out]"
        onPointerDown={(e2) => e2.stopPropagation()}
        onWheel={(e2) => e2.stopPropagation()}
        onContextMenu={(e2) => e2.stopPropagation()}
        data-canvas-toolbar="true"
        data-density="compact"
      >
        <CancelChip onClick={onCancel} label={t2("canvas.rotate.title")} />
        <Divider$4 />
        <AngleInput value={angle} onChange={onAngleChange} />
        <Divider$4 />
        <IconButton$3
          onClick={onRotate90}
          title={t2("canvas.rotate.step90", {
            degrees: ROTATE_STEP_DEG,
          })}
        >
          <Rotate90Icon />
        </IconButton$3>
        <IconButton$3 active={flipH} onClick={onFlipHorizontal} title={t2("canvas.rotate.flipH")}>
          <FlipHorizontalIcon />
        </IconButton$3>
        <IconButton$3 active={flipV} onClick={onFlipVertical} title={t2("canvas.rotate.flipV")}>
          <FlipVerticalIcon />
        </IconButton$3>
        <Divider$4 />
        <button
          type="button"
          disabled={!canSave || saving}
          onClick={onSave}
          className="canvas-toolbar-action"
          aria-label={saving ? t2("canvas.rotate.saving") : t2("canvas.rotate.save")}
          title={saving ? t2("canvas.rotate.saving") : t2("canvas.rotate.save")}
          data-variant="primary"
        >
          <SendArrowIcon />
        </button>
      </div>
    </NodeToolbar$1>
  );
}
export const ImageRotateEditToolbar = reactExports.memo(ImageRotateEditToolbarInner);
function CancelChip({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="canvas-toolbar-action"
      aria-label={label}
    >
      <CloseIcon$1 />
    </button>
  );
}
function AngleInput({ value, onChange }) {
  const [draft, setDraft] = reactExports.useState(String(Math.round(value)));
  const focusedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (!focusedRef.current) {
      setDraft(String(Math.round(value)));
    }
  }, [value]);
  const commit = reactExports.useCallback(
    (raw2) => {
      const parsed = Number.parseFloat(raw2);
      if (!Number.isFinite(parsed)) {
        setDraft(String(Math.round(value)));
        return;
      }
      const snapped = maybeSnapAngle(clamp$5(parsed, ROTATE_ANGLE_MIN, ROTATE_ANGLE_MAX));
      onChange(snapped);
      setDraft(String(Math.round(snapped)));
    },
    [onChange, value],
  );
  return (
    <div className="flex items-center gap-0 py-0.5 pr-1 pl-0.5">
      <AngleScrubber value={value} onChange={onChange} />
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(e2) => setDraft(e2.currentTarget.value)}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={(e2) => {
          focusedRef.current = false;
          commit(e2.currentTarget.value);
        }}
        onKeyDown={(e2) => {
          if (e2.key === "Enter") {
            e2.currentTarget.blur();
          } else if (e2.key === "ArrowUp") {
            e2.preventDefault();
            const next2 = clamp$5(normalizeAngle(value + 1), ROTATE_ANGLE_MIN, ROTATE_ANGLE_MAX);
            onChange(next2);
            setDraft(String(Math.round(next2)));
          } else if (e2.key === "ArrowDown") {
            e2.preventDefault();
            const next2 = clamp$5(normalizeAngle(value - 1), ROTATE_ANGLE_MIN, ROTATE_ANGLE_MAX);
            onChange(next2);
            setDraft(String(Math.round(next2)));
          } else if (e2.key === "Escape") {
            e2.currentTarget.blur();
          }
        }}
        className="w-8 bg-transparent text-center canvas-toolbar-input tabular-nums outline-none"
        style={{
          color: "var(--canvas-toolbar-fg)",
        }}
      />
      <span
        className="canvas-toolbar-label tabular-nums opacity-70 select-none"
        style={{
          color: "var(--canvas-toolbar-fg)",
        }}
      >
        °
      </span>
    </div>
  );
}
function AngleScrubber({ value, onChange }) {
  const { t: t2 } = useTranslation();
  const buttonRef = reactExports.useRef(null);
  const draggingRef = reactExports.useRef(false);
  const startXRef = reactExports.useRef(0);
  const startAngleRef = reactExports.useRef(0);
  const resetBackground = reactExports.useCallback(() => {
    document.body.style.cursor = "";
    buttonRef.current?.removeAttribute("data-dragging");
  }, []);
  reactExports.useEffect(() => {
    return () => {
      if (draggingRef.current) {
        document.body.style.cursor = "";
      }
    };
  }, []);
  const handlePointerDown = reactExports.useCallback(
    (e2) => {
      if (e2.button !== 0) return;
      e2.preventDefault();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      draggingRef.current = true;
      e2.currentTarget.dataset.dragging = "true";
      startXRef.current = e2.clientX;
      startAngleRef.current = value;
      e2.currentTarget.setPointerCapture(e2.pointerId);
      document.body.style.cursor = "ew-resize";
    },
    [value],
  );
  const handlePointerMove = reactExports.useCallback(
    (e2) => {
      if (!draggingRef.current) return;
      const deltaX = e2.clientX - startXRef.current;
      const sensitivity = e2.shiftKey ? 2 : 0.5;
      const next2 = clamp$5(
        startAngleRef.current + deltaX * sensitivity,
        ROTATE_ANGLE_MIN,
        ROTATE_ANGLE_MAX,
      );
      onChange(next2);
    },
    [onChange],
  );
  const handlePointerUp = reactExports.useCallback(
    (e2) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      if (e2.currentTarget.hasPointerCapture(e2.pointerId)) {
        e2.currentTarget.releasePointerCapture(e2.pointerId);
      }
      resetBackground();
    },
    [resetBackground],
  );
  const label = t2("canvas.rotate.scrub");
  return (
    <button
      ref={buttonRef}
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      title={label}
      aria-label={label}
      className="canvas-toolbar-action"
      style={{
        cursor: "ew-resize",
        touchAction: "none",
      }}
    >
      <AngleGlyph />
    </button>
  );
}
