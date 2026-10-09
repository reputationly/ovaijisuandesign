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
  HistoryManager$1,
} from "./history-manager.js";
import { Renderer } from "./renderer.js";
import { MosaicShape } from "./mosaic-shape.js";
import { createShape } from "./arrow-shape.js";
import {
  BrushTool,
  keepTagInCanvas,
  loadImage$4,
  pickContrastColor,
  TAG_DEFAULT_FONT_SIZE,
  TAG_PADDING_X,
  TAG_PADDING_Y,
} from "./keep-tag-in-canvas.js";
import { TextShape } from "./text-shape.js";
import { TagShape } from "./tag-shape.js";
import { DrawShapeTool } from "./draw-shape-tool.js";

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

export class Editor2 {
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
            : (style2.mosaicBlockSize ??
              sel.data.style.mosaicBlockSize ??
              next2.strength);
        next2.mode = newMode;
        next2.strength = newStrength;
        if (next2.shape === "brush") {
          const newBrush =
            style2.mosaicBrushSize ??
            sel.data.style.mosaicBrushSize ??
            next2.brushSize;
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
    return this.selectedId
      ? (this.shapeMap.get(this.selectedId) ?? null)
      : null;
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
      const targetH = Math.round(
        targetW * (img.naturalHeight / img.naturalWidth),
      );
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
      style2.fontFamily ??
      'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    const fontWeight = String(style2.fontWeight ?? 500);
    const lineHeight = 1.4;
    const variant = style2.textVariant ?? "plain";
    const mainColor = style2.stroke;
    const inverseColor =
      style2.textOutlineColor ?? pickContrastColor(mainColor);
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
      style2.fontFamily ??
      'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
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
      this.bus.emit(
        isNew ? "shape:add" : "shape:update",
        cloneShapeData(editing.data),
      );
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
    if (
      this.currentToolName !== "select" &&
      this.shouldDelegateToSelection(ev.point)
    ) {
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
    if (sel && hitHandle(point2, sel.getBounds(), this.getUiScale()))
      return true;
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
