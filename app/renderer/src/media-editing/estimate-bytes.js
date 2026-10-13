// estimate-bytes.js

export function estimateBytes(frame) {
  const image = frame.img;
  if (image instanceof ImageBitmap) {
    return image.width * image.height * 4;
  }
  return 0;
}
