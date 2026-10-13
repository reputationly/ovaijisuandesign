// load-source-as-png-blob.js

function loadImage(url2) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url2}`));
    image.src = url2;
  });
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob returned null"));
      },
      "image/png",
      1,
    );
  });
}

export async function loadSourceAsPngBlob(srcImageUrl, opts) {
  const srcImg = await loadImage(srcImageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = srcImg.naturalWidth;
  canvas.height = srcImg.naturalHeight;
  const canvasContext = canvas.getContext("2d");
  if (!canvasContext) throw new Error("Failed to get 2d context for source encode");
  if (opts?.background) {
    canvasContext.fillStyle = opts.background;
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);
  }
  canvasContext.drawImage(srcImg, 0, 0);
  return canvasToPngBlob(canvas);
}

export async function compositeOutpaintCanvas(srcImageUrl, params) {
  const srcImg = await loadImage(srcImageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = params.targetWidth;
  canvas.height = params.targetHeight;
  const canvasContext = canvas.getContext("2d");
  if (!canvasContext) throw new Error("Failed to get 2d context for outpaint composite");
  canvasContext.fillStyle = "#ffffff";
  canvasContext.fillRect(0, 0, canvas.width, canvas.height);
  canvasContext.drawImage(
    srcImg,
    params.offsetX,
    params.offsetY,
    srcImg.naturalWidth,
    srcImg.naturalHeight,
  );
  return canvasToPngBlob(canvas);
}
