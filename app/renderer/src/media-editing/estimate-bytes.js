// estimate-bytes.js

export function estimateBytes(frame2) {
  const img = frame2.img;
  if (img instanceof ImageBitmap) {
    return img.width * img.height * 4;
  }
  return 0;
}
