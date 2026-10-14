// single-position.js

function singlePosition(width, height, settings) {
  const padding = settings.padding;
  const topY = padding + settings.fontSize / 2;
  const middle = height / 2;
  const bottom = height - padding - settings.fontSize / 2;
  const left = padding;
  const center = width / 2;
  const right = width - padding;
  const positions = {
    tl: {
      x: left,
      y: topY,
      align: "left",
    },
    tc: {
      x: center,
      y: topY,
      align: "center",
    },
    tr: {
      x: right,
      y: topY,
      align: "right",
    },
    ml: {
      x: left,
      y: middle,
      align: "left",
    },
    mc: {
      x: center,
      y: middle,
      align: "center",
    },
    mr: {
      x: right,
      y: middle,
      align: "right",
    },
    bl: {
      x: left,
      y: bottom,
      align: "left",
    },
    bc: {
      x: center,
      y: bottom,
      align: "center",
    },
    br: {
      x: right,
      y: bottom,
      align: "right",
    },
  };
  return positions[settings.position];
}

export function drawWatermark(context, width, height, settings) {
  if (!settings.text.trim()) return;
  context.save();
  context.font = `${settings.fontWeight} ${settings.fontSize}px ${settings.fontFamily}`;
  context.fillStyle = settings.color;
  context.globalAlpha = settings.opacity / 100;
  context.textBaseline = "middle";
  if (settings.shadow) {
    context.shadowColor = "rgba(0, 0, 0, 0.6)";
    context.shadowBlur = settings.shadowBlur;
    context.shadowOffsetX = settings.shadowBlur / 4;
    context.shadowOffsetY = settings.shadowBlur / 4;
  }
  const lines = settings.text.split("\n");
  const lineHeight = settings.fontSize * 1.3;
  const rotation = (settings.rotation * Math.PI) / 180;
  if (settings.mode === "single") {
    const { x: positionX, y: positionY, align } = singlePosition(width, height, settings);
    const startY = positionY - ((lines.length - 1) * lineHeight) / 2;
    context.textAlign = align;
    context.translate(positionX, positionY);
    context.rotate(rotation);
    context.translate(-positionX, -positionY);
    lines.forEach((line, index) => {
      context.fillText(line, positionX, startY + index * lineHeight);
    });
  } else {
    context.textAlign = "center";
    const widest = Math.max(
      ...lines.map((line) => context.measureText(line).width),
    );
    const blockHeight = lines.length * lineHeight;
    const stepX = Math.max(1, widest + settings.spacing);
    const stepY = Math.max(1, blockHeight + settings.spacing);
    const centerX = width / 2;
    const centerY = height / 2;
    const diagonal = Math.hypot(width, height);
    context.translate(centerX, centerY);
    context.rotate(rotation);
    context.translate(-centerX, -centerY);
    for (let tileY = -diagonal; tileY < height + diagonal; tileY += stepY) {
      for (let tileX = -diagonal; tileX < width + diagonal; tileX += stepX) {
        lines.forEach((line, index) => {
          context.fillText(line, tileX, tileY + index * lineHeight);
        });
      }
    }
  }
  context.restore();
}
