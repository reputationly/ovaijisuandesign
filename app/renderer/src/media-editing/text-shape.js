// text-shape.js
import { pickContrastColor } from "./keep-tag-in-canvas.js";
import { pointInBounds, Shape } from "./free-path-shape.js";

const baselineCache = new Map();

function measureFirstLineBaseline(font, lineHeight) {
  const key2 = `${font}|${lineHeight}`;
  const cached = baselineCache.get(key2);
  if (cached !== void 0) return cached;
  const probeWrap = document.createElement("div");
  probeWrap.style.cssText = [
    "position:absolute",
    "visibility:hidden",
    "left:-9999px",
    "top:0",
    "padding:0",
    "margin:0",
    "border:0",
    "white-space:pre",
    `font:${font}`,
    `line-height:${lineHeight}`,
  ].join(";");
  const baselineProbe = document.createElement("span");
  baselineProbe.style.cssText =
    "display:inline-block;width:0;height:0;vertical-align:baseline";
  probeWrap.appendChild(baselineProbe);
  probeWrap.appendChild(document.createTextNode("Mg"));
  document.body.appendChild(probeWrap);
  const wrapRect = probeWrap.getBoundingClientRect();
  const probeRect = baselineProbe.getBoundingClientRect();
  const baselineY = probeRect.bottom - wrapRect.top;
  document.body.removeChild(probeWrap);
  baselineCache.set(key2, baselineY);
  return baselineY;
}

const LINE_HEIGHT_RATIO = 1.4;

const TEXT_VARIANT_METRICS = {
  /** filled：背景内边距系数（基于字号）。padX 0.45×、padY 0.18×，下限保证小字号也有手感。 */
  filledPadXRatio: 0.45,
  filledPadYRatio: 0.18,
  filledMinPadX: 4,
  filledMinPadY: 2,
  /** outlined：固定细描边宽度（不按字号比例放大），与示意图视觉一致。 */
  outlinedStrokeWidth: 0.5,
};

export class TextShape extends Shape {
  draw(ctx) {
    const { text: text2, x: x2, y: y4, style: style2 } = this.data;
    if (!text2) return;
    const fontSize = style2.fontSize ?? 18;
    const fontFamily =
      style2.fontFamily ||
      'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    const fontWeight = style2.fontWeight ?? 400;
    const fontShort = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const variant = style2.textVariant ?? "plain";
    const mainColor = style2.stroke;
    const inverseColor =
      style2.textOutlineColor ?? pickContrastColor(mainColor);
    ctx.save();
    ctx.font = fontShort;
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    const lineHeight = fontSize * LINE_HEIGHT_RATIO;
    const baselineOffset = measureFirstLineBaseline(
      fontShort,
      LINE_HEIGHT_RATIO,
    );
    const lines = text2.split("\n");
    let maxWidth = 0;
    for (const line of lines) {
      const w3 = ctx.measureText(line).width;
      if (w3 > maxWidth) maxWidth = w3;
    }
    const textBoxH = lines.length * lineHeight;
    if (variant === "filled") {
      const padX = Math.max(
        TEXT_VARIANT_METRICS.filledMinPadX,
        fontSize * TEXT_VARIANT_METRICS.filledPadXRatio,
      );
      const padY = Math.max(
        TEXT_VARIANT_METRICS.filledMinPadY,
        fontSize * TEXT_VARIANT_METRICS.filledPadYRatio,
      );
      const cardW = maxWidth + padX * 2;
      const cardH = textBoxH + padY * 2;
      const cardX = x2 - padX;
      const cardY = y4 - padY;
      ctx.fillStyle = mainColor;
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.fillStyle = inverseColor;
      lines.forEach((line, i2) => {
        ctx.fillText(line, x2, y4 + baselineOffset + i2 * lineHeight);
      });
      this.data.width = cardW;
      this.data.height = cardH;
    } else if (variant === "outlined") {
      const strokeW = TEXT_VARIANT_METRICS.outlinedStrokeWidth;
      ctx.lineWidth = strokeW;
      ctx.strokeStyle = mainColor;
      ctx.fillStyle = inverseColor;
      lines.forEach((line, i2) => {
        const lx = x2;
        const ly = y4 + baselineOffset + i2 * lineHeight;
        ctx.strokeText(line, lx, ly);
      });
      const padPerSide = strokeW / 2;
      this.data.width = maxWidth + padPerSide * 2;
      this.data.height = textBoxH + padPerSide * 2;
    } else {
      ctx.fillStyle = mainColor;
      lines.forEach((line, i2) => {
        ctx.fillText(line, x2, y4 + baselineOffset + i2 * lineHeight);
      });
      this.data.width = maxWidth;
      this.data.height = textBoxH;
    }
    ctx.restore();
  }
  hitTest(p3) {
    return pointInBounds(p3, this.getBounds(), 4);
  }
  getBounds() {
    const { x: x2, y: y4, width, height, style: style2 } = this.data;
    const fontSize = style2.fontSize ?? 18;
    const variant = style2.textVariant ?? "plain";
    if (variant === "filled") {
      const padX = Math.max(
        TEXT_VARIANT_METRICS.filledMinPadX,
        fontSize * TEXT_VARIANT_METRICS.filledPadXRatio,
      );
      const padY = Math.max(
        TEXT_VARIANT_METRICS.filledMinPadY,
        fontSize * TEXT_VARIANT_METRICS.filledPadYRatio,
      );
      return {
        x: x2 - padX,
        y: y4 - padY,
        width: Math.max(width, fontSize + padX * 2),
        height: Math.max(height, fontSize + padY * 2),
      };
    }
    return {
      x: x2,
      y: y4,
      width: Math.max(width, fontSize),
      height: Math.max(height, fontSize),
    };
  }
  move(dx, dy) {
    this.data.x += dx;
    this.data.y += dy;
  }
  resize(b3) {
    const cur = this.getBounds();
    if (cur.height > 0) {
      const ratio = b3.height / cur.height;
      this.data.style = {
        ...this.data.style,
        fontSize: Math.max(
          8,
          Math.round((this.data.style.fontSize ?? 18) * ratio),
        ),
      };
    }
    const variant = this.data.style.textVariant ?? "plain";
    if (variant === "filled") {
      const fontSize = this.data.style.fontSize ?? 18;
      const padX = Math.max(
        TEXT_VARIANT_METRICS.filledMinPadX,
        fontSize * TEXT_VARIANT_METRICS.filledPadXRatio,
      );
      const padY = Math.max(
        TEXT_VARIANT_METRICS.filledMinPadY,
        fontSize * TEXT_VARIANT_METRICS.filledPadYRatio,
      );
      this.data.x = b3.x + padX;
      this.data.y = b3.y + padY;
    } else {
      this.data.x = b3.x;
      this.data.y = b3.y;
    }
  }
}
