// tag-tool.js
import {
  placeCardForAnchor,
  TAG_DEFAULT_FONT_SIZE,
  Tool,
  uid,
} from "./keep-tag-in-canvas.js";
import { TagShape } from "./tag-shape.js";

const MIN_DRAG_DISTANCE = 8;

const PLACEHOLDER_WIDTH = 44;

const PLACEHOLDER_HEIGHT = 26;

export class TagTool extends Tool {
  cursor = "crosshair";
  anchor = null;
  workingShape = null;
  constructor(editor) {
    super(editor);
  }
  onPointerDown(e2) {
    if (e2.button !== 0) return;
    this.anchor = e2.point;
    const data2 = this.buildInitialData(e2.point, this.editor.getStyle());
    this.workingShape = new TagShape(data2);
    this.placeCardOnSide("right");
    this.editor.setPreviewShape(this.workingShape);
  }
  onPointerMove(e2) {
    if (!this.anchor || !this.workingShape) return;
    const dx = e2.point.x - this.anchor.x;
    const dy = e2.point.y - this.anchor.y;
    const dist2 = Math.hypot(dx, dy);
    if (dist2 >= MIN_DRAG_DISTANCE) {
      let cardSide;
      if (Math.abs(dx) >= Math.abs(dy)) {
        cardSide = dx >= 0 ? "right" : "left";
      } else {
        cardSide = dy >= 0 ? "bottom" : "top";
      }
      this.placeCardOnSide(cardSide);
    }
    this.editor.requestPreviewRender();
  }
  onPointerUp(_e2) {
    if (!this.anchor || !this.workingShape) return;
    const data2 = this.workingShape.data;
    const shape = this.workingShape;
    this.editor.setPreviewShape(null);
    this.workingShape = null;
    this.anchor = null;
    this.editor.beginInteraction();
    this.editor.addShapeInstanceWithoutHistory(shape);
    this.editor.openTagTextEditor(data2.id);
  }
  /**
   * 把 working shape 的卡片摆到 anchor 的指定侧紧贴。
   * anchor 保持在落点位置不变 —— Tag.draw 内部会推断 inferSide 并校正紧贴，
   * 落点本身就在校正后的精确位置上，因此不需要在这里二次计算 anchor。
   */
  placeCardOnSide(cardSide) {
    if (!this.workingShape || !this.anchor) return;
    const data2 = this.workingShape.data;
    const pos = placeCardForAnchor(
      this.anchor,
      cardSide,
      data2.width,
      data2.height,
    );
    data2.x = pos.x;
    data2.y = pos.y;
    data2.anchorX = this.anchor.x;
    data2.anchorY = this.anchor.y;
  }
  buildInitialData(anchor, style2) {
    return {
      id: uid("tag"),
      type: "tag",
      anchorX: anchor.x,
      anchorY: anchor.y,
      // x/y 会被 placeCardOnSide 覆盖，这里给个占位
      x: anchor.x,
      y: anchor.y,
      width: PLACEHOLDER_WIDTH,
      height: PLACEHOLDER_HEIGHT,
      text: "",
      // tag 字号沿用 editor 当前 style.fontSize（toolbar 的字号下拉），
      // 仅在未设置时回退到 TAG_DEFAULT_FONT_SIZE
      style: {
        ...style2,
        fontSize: style2.fontSize ?? TAG_DEFAULT_FONT_SIZE,
      },
    };
  }
}
