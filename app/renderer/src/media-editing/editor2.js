// editor2.js
import {
  buildTextShapeData,
  cornerCursor,
  EventBus,
  hitHandle,
  TextTool,
} from "./hit-handle.js";
import { SelectTool } from "./select-tool.js";
import { TagTool } from "./tag-tool.js";
import { MosaicTool } from "./mosaic-tool.js";
import {
  cloneShapeData,
  DEFAULT_STYLE,
  HistoryManager$1 as HistoryManager,
} from "./history-manager.js";
import { Renderer } from "./renderer.js";
import { MosaicShape } from "./mosaic-shape.js";
import { createShape } from "./arrow-shape.js";
import {
  BrushTool,
  keepTagInCanvas,
  loadImage as loadImageElement,
  pickContrastColor,
  TAG_DEFAULT_FONT_SIZE,
  TAG_PADDING_X,
  TAG_PADDING_Y,
} from "./keep-tag-in-canvas.js";
import { TextShape } from "./text-shape.js";
import { TagShape } from "./tag-shape.js";
import { DrawShapeTool } from "./draw-shape-tool.js";
function autoResizeTextarea(textareaElement, fontSize, lineHeight, maxWidth) {
  const lines = textareaElement.value.split("\n");
  const measure = document.createElement("span");
  measure.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${textareaElement.style.fontWeight} ${fontSize}px ${textareaElement.style.fontFamily};letter-spacing:normal;`;
  document.body.appendChild(measure);
  let maxW = 0;
  for (const line of lines) {
    measure.textContent = line || " ";
    const measuredWidth = measure.getBoundingClientRect().width;
    if (measuredWidth > maxW) maxW = measuredWidth;
  }
  document.body.removeChild(measure);
  const widthCap = Math.max(8, Math.floor(maxWidth));
  textareaElement.style.width = `${Math.min(widthCap, Math.max(8, Math.ceil(maxW) + 2))}px`;
  textareaElement.style.height = `${Math.max(1, lines.length) * fontSize * lineHeight}px`;
}
export class Editor2 {
  container;
  renderer;
  bus = new EventBus();
  history = new HistoryManager(50);
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
  setTool(toolName) {
    if (this.currentToolName === toolName) return;
    this.currentTool.onDeactivate();
    this.currentToolName = toolName;
    this.currentTool = this.makeTool(toolName);
    this.currentTool.onActivate();
    this.applyCursor();
    this.interactionTool = null;
    if (toolName !== "select") {
      this.select(null);
    }
    this.bus.emit("tool:change", toolName);
    this.emitChange();
  }
  getTool() {
    return this.currentToolName;
  }
  setStyle(style) {
    this.style = {
      ...this.style,
      ...style,
    };
    const selectedShape = this.getSelectedShape();
    if (selectedShape) {
      this.beginInteraction();
      selectedShape.data.style = {
        ...selectedShape.data.style,
        ...style,
      };
      if (selectedShape instanceof MosaicShape) {
        const next = selectedShape.data;
        const newMode = style.mosaicMode ?? next.mode;
        const newStrength =
          newMode === "blur"
            ? (style.blurRadius ?? selectedShape.data.style.blurRadius ?? next.strength)
            : (style.mosaicBlockSize ??
              selectedShape.data.style.mosaicBlockSize ??
              next.strength);
        next.mode = newMode;
        next.strength = newStrength;
        if (next.shape === "brush") {
          const newBrush =
            style.mosaicBrushSize ??
            selectedShape.data.style.mosaicBrushSize ??
            next.brushSize;
          if (newBrush > 0) next.brushSize = newBrush;
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
  addShape(data) {
    this.beginInteraction();
    const shape = createShape(data);
    this.shapes.push(shape);
    this.shapeMap.set(shape.id, shape);
    this.commitInteraction();
    this.bus.emit("shape:add", cloneShapeData(data));
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
  removeShape(shapeId) {
    this.deleteShapes([shapeId]);
  }
  /** 公共：一次事务删除多个形状（浏览器批注用它成组移除框与文字标签）。 */
  deleteShapes(ids) {
    const idSet = new Set(ids);
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
  select(selectedShapeId) {
    if (this.selectedId === selectedShapeId) return;
    this.selectedId = selectedShapeId;
    this.renderer.setSelected(selectedShapeId ? (this.shapeMap.get(selectedShapeId) ?? null) : null);
    this.bus.emit("select", selectedShapeId);
    this.emitChange();
  }
  getSelectedShape() {
    return this.selectedId
      ? (this.shapeMap.get(this.selectedId) ?? null)
      : null;
  }
  findShapeAt(point) {
    for (let shapeIndex = this.shapes.length - 1; shapeIndex >= 0; shapeIndex--) {
      if (this.shapes[shapeIndex].hitTest(point)) return this.shapes[shapeIndex];
    }
    return null;
  }
  undo() {
    const snapshot = this.cloneShapesData();
    const prev = this.history.undo(snapshot);
    if (prev !== null) {
      this.applySnapshot(prev);
    }
  }
  redo() {
    const snapshot = this.cloneShapesData();
    const next = this.history.redo(snapshot);
    if (next !== null) {
      this.applySnapshot(next);
    }
  }
  on(type, handler) {
    return this.bus.on(type, handler);
  }
  off(type, handler) {
    this.bus.off(type, handler);
  }
  getState() {
    return {
      shapes: this.shapes.map((shape) => cloneShapeData(shape.data)),
      selectedId: this.selectedId,
      tool: this.currentToolName,
      style: {
        ...this.style,
      },
      canUndo: this.history.canUndo,
      canRedo: this.history.canRedo,
    };
  }
  toDataURL(type = "image/png", quality = 0.92) {
    return this.renderer.exportComposed().toDataURL(type, quality);
  }
  toBlob(type = "image/png", quality = 0.92) {
    const canvas = this.renderer.exportComposed();
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas.toBlob returned null"));
        },
        type,
        quality,
      );
    });
  }
  /**
   * 重新加载一张图片。会按图片比例自动调整 canvas 高度，并清空打码缓存。
   * 不清空 shapes（用户已画的标注会保留在新图上）。
   */
  async loadImage(src) {
    const version = ++this.imageLoadVersion;
    try {
      const imageElement = typeof src === "string" ? await loadImageElement(src) : src;
      if (this.destroyed || version !== this.imageLoadVersion) return;
      const targetW = this.width;
      const targetH = Math.round(
        targetW * (imageElement.naturalHeight / imageElement.naturalWidth),
      );
      this.width = targetW;
      this.height = targetH;
      this.renderer.setSize(targetW, targetH);
      this.renderer.drawBackground(imageElement);
      this.renderer.drawShapes(this.shapes);
      this.bus.emit("ready", void 0);
      this.emitChange();
    } catch (error) {
      if (this.destroyed || version !== this.imageLoadVersion) return;
      this.bus.emit("error", error);
      console.error("[Editor] load image failed", error);
      throw error;
    }
  }
  /**
   * 设置外层施加在 canvas 上的 CSS scale（屏幕像素 / 逻辑像素）。
   * 用于让选中框 / 4 角手柄保持屏幕像素大小、不随外层 zoom 一起放大缩小。
   * SelectTool 也会读这个值来按"屏幕像素"语义做手柄命中判定。
   */
  setUiScale(scale) {
    this.renderer.setUiScale(scale);
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
  openTextEditor(point, existing) {
    this.closeTextEditor(false);
    const textareaElement = document.createElement("textarea");
    const style = existing ? existing.data.style : this.style;
    const fontSize = style.fontSize ?? 18;
    const fontFamily =
      style.fontFamily ??
      'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    const fontWeight = String(style.fontWeight ?? 500);
    const lineHeight = 1.4;
    const variant = style.textVariant ?? "plain";
    const mainColor = style.stroke;
    const inverseColor =
      style.textOutlineColor ?? pickContrastColor(mainColor);
    Object.assign(textareaElement.style, {
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
      Object.assign(textareaElement.style, {
        outline: "none",
        caretColor: inverseColor,
      });
    } else if (variant === "outlined") {
      textareaElement.style.caretColor = mainColor;
    }
    let shape;
    const isNew = !existing;
    if (existing) {
      shape = existing;
    } else {
      const data = buildTextShapeData(point, "", this.style);
      shape = new TextShape(data);
    }
    const originalText = shape.data.text;
    const padXForCanvas =
      variant === "filled" ? Math.max(4, fontSize * 0.45) : 0;
    if (isNew) {
      const minX = padXForCanvas;
      const minY = 0;
      const maxX = Math.max(minX, this.width - fontSize - padXForCanvas);
      const maxY = Math.max(minY, this.height - fontSize);
      shape.data.x = Math.max(minX, Math.min(maxX, shape.data.x));
      shape.data.y = Math.max(minY, Math.min(maxY, shape.data.y));
    }
    const taMaxWidth = Math.max(
      fontSize,
      this.width - shape.data.x - padXForCanvas,
    );
    this.beginInteraction();
    if (isNew) {
      this.shapes.push(shape);
      this.shapeMap.set(shape.id, shape);
    }
    this.renderer.drawShapes(this.shapes);
    textareaElement.value = originalText;
    textareaElement.style.left = `${shape.data.x}px`;
    textareaElement.style.top = `${shape.data.y}px`;
    textareaElement.style.maxWidth = `${taMaxWidth}px`;
    this.editingTextShape = shape;
    this.editingTextIsNew = isNew;
    this.editingTextOriginal = originalText;
    autoResizeTextarea(textareaElement, fontSize, lineHeight, taMaxWidth);
    this.container.appendChild(textareaElement);
    setTimeout(() => textareaElement.focus(), 0);
    const onInput = () => {
      shape.data.text = textareaElement.value;
      autoResizeTextarea(textareaElement, fontSize, lineHeight, taMaxWidth);
      this.renderer.drawShapes(this.shapes);
    };
    const onBlur = () => this.closeTextEditor(true);
    const onKey = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        keyboardEvent.preventDefault();
        this.closeTextEditor(false);
      }
    };
    textareaElement.addEventListener("input", onInput);
    textareaElement.addEventListener("blur", onBlur);
    textareaElement.addEventListener("keydown", onKey);
    this.textarea = textareaElement;
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
    const data = shape.data;
    const style = data.style;
    const fontSize = style.fontSize ?? TAG_DEFAULT_FONT_SIZE;
    const fontFamily =
      style.fontFamily ??
      'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    const fontWeight = String(style.fontWeight ?? 500);
    const foregroundColor = style.tagTextColor ?? "#FFFFFF";
    const textareaElement = document.createElement("textarea");
    Object.assign(textareaElement.style, {
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
      caretColor: foregroundColor,
      textAlign: "center",
      fontSize: `${fontSize}px`,
      fontFamily,
      fontWeight,
      lineHeight: "1.4",
      letterSpacing: "normal",
      WebkitFontSmoothing: "antialiased",
    });
    textareaElement.value = data.text || "";
    if (keepTagInCanvas(data, this.width, this.height)) {
      this.renderer.drawShapes(this.shapes);
    }
    const placeTextarea = () => {
      const innerW = Math.max(fontSize * 2, data.width - TAG_PADDING_X * 2);
      const innerH = Math.max(fontSize * 1.4, data.height - TAG_PADDING_Y * 2);
      textareaElement.style.width = `${innerW}px`;
      textareaElement.style.height = `${innerH}px`;
      textareaElement.style.left = `${data.x + (data.width - innerW) / 2}px`;
      textareaElement.style.top = `${data.y + (data.height - innerH) / 2}px`;
    };
    placeTextarea();
    this.editingTagShape = shape;
    this.container.appendChild(textareaElement);
    setTimeout(() => textareaElement.focus(), 0);
    const onInput = () => {
      data.text = textareaElement.value;
      this.renderer.drawShapes(this.shapes);
      if (keepTagInCanvas(data, this.width, this.height)) {
        this.renderer.drawShapes(this.shapes);
      }
      placeTextarea();
    };
    const onBlur = () => this.closeTextEditor(true);
    const onKey = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        keyboardEvent.preventDefault();
        this.closeTextEditor(false);
      } else if (keyboardEvent.key === "Enter" && !keyboardEvent.shiftKey) {
        keyboardEvent.preventDefault();
        this.closeTextEditor(true);
      }
    };
    textareaElement.addEventListener("input", onInput);
    textareaElement.addEventListener("blur", onBlur);
    textareaElement.addEventListener("keydown", onKey);
    this.textarea = textareaElement;
  }
  closeTextEditor(commit) {
    if (!this.textarea) return;
    const textareaElement = this.textarea;
    const text = textareaElement.value;
    const editing = this.editingTextShape;
    const editingTag = this.editingTagShape;
    const isNew = this.editingTextIsNew;
    const originalText = this.editingTextOriginal;
    this.textarea = null;
    this.editingTextShape = null;
    this.editingTagShape = null;
    this.editingTextIsNew = false;
    this.editingTextOriginal = "";
    textareaElement.parentElement?.removeChild(textareaElement);
    if (editingTag) {
      const removeTag = !commit || !text.trim();
      if (removeTag) {
        const shapeIndex = this.shapes.findIndex((shape) => shape.id === editingTag.id);
        let removed = null;
        if (shapeIndex >= 0) {
          removed = cloneShapeData(this.shapes[shapeIndex].data);
          this.shapes.splice(shapeIndex, 1);
          this.shapeMap.delete(editingTag.id);
        }
        this.commitInteraction();
        if (removed) this.bus.emit("shape:remove", removed);
        return;
      }
      editingTag.data.text = text;
      this.commitInteraction();
      this.bus.emit("shape:update", cloneShapeData(editingTag.data));
      return;
    }
    if (editing) {
      if (!commit) {
        if (isNew) {
          const shapeIndex = this.shapes.findIndex((shape) => shape.id === editing.id);
          if (shapeIndex >= 0) {
            this.shapes.splice(shapeIndex, 1);
            this.shapeMap.delete(editing.id);
          }
        } else {
          editing.data.text = originalText;
        }
        this.renderer.drawShapes(this.shapes);
        this.cancelInteraction();
        return;
      }
      if (!text.trim()) {
        const removed = cloneShapeData(editing.data);
        const shapeIndex = this.shapes.findIndex((shape) => shape.id === editing.id);
        if (shapeIndex >= 0) {
          this.shapes.splice(shapeIndex, 1);
          this.shapeMap.delete(editing.id);
        }
        this.renderer.drawShapes(this.shapes);
        this.commitInteraction();
        this.bus.emit("shape:remove", removed);
        return;
      }
      editing.data.text = text;
      this.renderer.drawShapes(this.shapes);
      this.commitInteraction();
      this.bus.emit(
        isNew ? "shape:add" : "shape:update",
        cloneShapeData(editing.data),
      );
      return;
    }
  }
  // ==================== 内部 ====================
  makeTool(toolName) {
    switch (toolName) {
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
    return this.shapes.map((shape) => cloneShapeData(shape.data));
  }
  applySnapshot(snapshot) {
    const oldMap = new Map(this.shapes.map((shape) => [shape.id, shape]));
    this.shapes = snapshot.map((data) => {
      const existingShape = oldMap.get(data.id);
      if (existingShape) {
        Object.assign(existingShape.data, data);
        return existingShape;
      }
      return createShape(data);
    });
    this.shapeMap = new Map(this.shapes.map((shape) => [shape.id, shape]));
    if (this.selectedId && !this.shapeMap.has(this.selectedId))
      this.selectedId = null;
    this.renderer.drawShapes(this.shapes);
    this.renderer.setSelected(this.getSelectedShape());
    this.emitChange();
  }
  emitChange() {
    this.bus.emit("change", this.getState());
  }
  // ==================== 事件绑定 ====================
  bindEvents() {
    const canvasElement = this.renderer.main;
    canvasElement.addEventListener("pointerdown", this.handlePointerDown);
    canvasElement.addEventListener("pointermove", this.handlePointerMove);
    canvasElement.addEventListener("pointerup", this.handlePointerUp);
    canvasElement.addEventListener("pointercancel", this.handlePointerUp);
    canvasElement.addEventListener("dblclick", this.handleDoubleClick);
    if (this.shortcutsEnabled) {
      window.addEventListener("keydown", this.handleKeyDown);
    }
  }
  unbindEvents() {
    const canvasElement = this.renderer.main;
    canvasElement.removeEventListener("pointerdown", this.handlePointerDown);
    canvasElement.removeEventListener("pointermove", this.handlePointerMove);
    canvasElement.removeEventListener("pointerup", this.handlePointerUp);
    canvasElement.removeEventListener("pointercancel", this.handlePointerUp);
    canvasElement.removeEventListener("dblclick", this.handleDoubleClick);
    if (this.shortcutsEnabled) {
      window.removeEventListener("keydown", this.handleKeyDown);
    }
  }
  toToolEvent(pointerEvent) {
    const rect = this.renderer.main.getBoundingClientRect();
    const scaleX = rect.width === 0 ? 1 : this.width / rect.width;
    const scaleY = rect.height === 0 ? 1 : this.height / rect.height;
    return {
      point: {
        x: (pointerEvent.clientX - rect.left) * scaleX,
        y: (pointerEvent.clientY - rect.top) * scaleY,
      },
      shiftKey: pointerEvent.shiftKey,
      ctrlKey: pointerEvent.ctrlKey,
      altKey: pointerEvent.altKey,
      metaKey: pointerEvent.metaKey,
      button: pointerEvent.button,
      native: pointerEvent,
    };
  }
  handlePointerDown = (pointerEvent) => {
    if (this.textarea) return;
    this.renderer.main.setPointerCapture(pointerEvent.pointerId);
    const toolEvent = this.toToolEvent(pointerEvent);
    if (
      this.currentToolName !== "select" &&
      this.shouldDelegateToSelection(toolEvent.point)
    ) {
      this.interactionTool = this.getDelegationSelectTool();
    } else {
      this.interactionTool = this.currentTool;
      if (this.currentToolName !== "select") {
        this.select(null);
      }
    }
    this.interactionTool.onPointerDown(toolEvent);
  };
  handlePointerMove = (pointerEvent) => {
    if (this.textarea) return;
    const toolEvent = this.toToolEvent(pointerEvent);
    if (this.interactionTool) {
      this.interactionTool.onPointerMove(toolEvent);
      return;
    }
    if (this.currentToolName === "select") {
      this.currentTool.onPointerMove(toolEvent);
      return;
    }
    this.updateHoverCursorForCreationTool(toolEvent.point);
    this.currentTool.onPointerMove(toolEvent);
  };
  handlePointerUp = (pointerEvent) => {
    if (this.textarea) return;
    try {
      this.renderer.main.releasePointerCapture(pointerEvent.pointerId);
    } catch {}
    const tool = this.interactionTool ?? this.currentTool;
    this.interactionTool = null;
    tool.onPointerUp(this.toToolEvent(pointerEvent));
  };
  getDelegationSelectTool() {
    if (!this.delegationSelectTool) {
      this.delegationSelectTool = new SelectTool(this);
    }
    return this.delegationSelectTool;
  }
  shouldDelegateToSelection(point) {
    const selectedShape = this.getSelectedShape();
    if (selectedShape && hitHandle(point, selectedShape.getBounds(), this.getUiScale()))
      return true;
    return this.findShapeAt(point) !== null;
  }
  updateHoverCursorForCreationTool(point) {
    const selectedShape = this.getSelectedShape();
    if (selectedShape) {
      const corner = hitHandle(point, selectedShape.getBounds(), this.getUiScale());
      if (corner) {
        this.setCursor(cornerCursor(corner));
        return;
      }
    }
    if (this.findShapeAt(point)) {
      this.setCursor("move");
      return;
    }
    this.setCursor(this.currentTool.cursor);
  }
  handleDoubleClick = (mouseEvent) => {
    const rect = this.renderer.main.getBoundingClientRect();
    const scaleX = rect.width === 0 ? 1 : this.width / rect.width;
    const scaleY = rect.height === 0 ? 1 : this.height / rect.height;
    const point = {
      x: (mouseEvent.clientX - rect.left) * scaleX,
      y: (mouseEvent.clientY - rect.top) * scaleY,
    };
    const hitShape = this.findShapeAt(point);
    if (hitShape instanceof TextShape) {
      this.setTool("text");
      this.openTextEditor(point, hitShape);
    } else if (hitShape instanceof TagShape) {
      this.setTool("select");
      this.openTagTextEditor(hitShape.id);
    }
  };
  handleKeyDown = (keyboardEvent) => {
    if (this.textarea) return;
    if ((keyboardEvent.metaKey || keyboardEvent.ctrlKey) && keyboardEvent.key.toLowerCase() === "z") {
      keyboardEvent.preventDefault();
      if (keyboardEvent.shiftKey) this.redo();
      else this.undo();
      return;
    }
    if ((keyboardEvent.metaKey || keyboardEvent.ctrlKey) && keyboardEvent.key.toLowerCase() === "y") {
      keyboardEvent.preventDefault();
      this.redo();
      return;
    }
    this.currentTool.onKeyDown(keyboardEvent);
  };
}
