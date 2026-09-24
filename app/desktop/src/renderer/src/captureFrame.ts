/**
 * 视频截帧。官方的 `canvas.captureFrame` =「截帧」。
 *
 * 把视频当前这一帧画进 `<canvas>` 取字节，**纯前端** —— 不需要 ffmpeg，
 * 也不用把整个视频传上去让后端抽。
 *
 * ## 两个必须处理的失败
 *
 * - **跨源污染**：给 `<video>` 的地址如果不同源，`toBlob` 会抛
 *   `SecurityError`（画布被 taint）。我们的视频来自本机 gateway、同源，
 *   所以正常情况下不会 —— 但用户手动拖进来一个外链视频就会。
 * - **还没有可解码的帧**：刚创建、还没 loadeddata 的 `<video>`
 *   `videoWidth` 是 0，这时截出来是一张全黑的图，**而且不报错**。
 */

/** 截出来的一帧。`blob` 直接能丢给上传接口。 */
export interface Frame {
  blob: Blob
  width: number
  height: number
}

/**
 * 从一个已经在播（或已 seek 到位）的 `<video>` 上截当前帧。
 *
 * `type` 用 PNG：截帧多半是拿去当参考图或底图，再压一次 JPEG 会把
 * 已经压过一轮的画面又劣化一次。
 */
export async function captureFrame(video: HTMLVideoElement): Promise<Frame> {
  const w = video.videoWidth
  const h = video.videoHeight
  // 0x0 说明还没有可解码的帧。**必须拦** —— 不拦的话画出来是一张全黑的图，
  // 存进工作区、放上画布，全程没有任何报错。
  if (!w || !h) {
    throw new Error("这一帧还没准备好，等视频加载出画面再试")
  }
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("拿不到 2D 上下文")
  ctx.drawImage(video, 0, 0, w, h)

  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob(resolve, "image/png")
    } catch {
      // 跨源视频会让画布被 taint，`toBlob` 直接抛。
      resolve(null)
    }
  })
  if (!blob) throw new Error("这个视频不允许截帧（可能来自外部地址）")
  return { blob, width: w, height: h }
}

/**
 * 截帧的文件名。
 *
 * 带上秒数，同一个视频截好几帧时能分得清 —— 都叫 `frame.png` 的话，
 * 落盘时会被同名避让改成 `frame-2.png`,但用户看不出那是第几秒。
 */
export function frameFileName(videoName: string | undefined, seconds: number): string {
  const stem = (videoName ?? "video").replace(/\.[^.]+$/, "")
  // 秒数取整到 0.1，避免 `3.7000000000000002` 这种浮点尾巴进文件名。
  const t = Math.round(seconds * 10) / 10
  return `${stem}-${t}s.png`
}
