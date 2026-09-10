/**
 * 宫格切分。官方的 `canvas.splitGrid.*`：
 *
 * ```
 * canvas.splitGrid.label               = 宫格切分
 * canvas.splitGrid.preset              = {{n}}宫格
 * canvas.splitGrid.custom              = 自定义
 * canvas.splitGrid.cropSplit           = 编组
 * canvas.splitGrid.cropSplitGroupLabel = 宫格编组
 * canvas.splitGrid.selectHint          = 选择想切分的宫格
 * canvas.splitGrid.selectedCount       = 已选 {{count}} 个宫格
 * ```
 *
 * 官方还有「生成高清」（`hd2x` / `hd4x`）——那要图片超分，我们平台上没有，
 * **不做也不放按钮**。切分本身是纯前端的：`<canvas>` 裁剪 + 上传。
 *
 * 用途：出图模型常常一次给一张 2x2 拼图，用户要的是里面某一格。
 */

/** 一格的位置，像素。 */
export interface Cell {
  /** 从 0 开始，按行优先编号 —— 和用户从左上往右下数的顺序一致。 */
  index: number
  row: number
  col: number
  x: number
  y: number
  width: number
  height: number
}

/** 常见宫格。官方的预设按 `{{n}}宫格` 命名。 */
export const GRID_PRESETS = [
  { n: 4, rows: 2, cols: 2 },
  { n: 6, rows: 2, cols: 3 },
  { n: 9, rows: 3, cols: 3 },
] as const

/**
 * 把 `width x height` 切成 `rows x cols` 格。
 *
 * **最后一行/列吃掉余数**，不是每格都向下取整。
 * 每格都取整的话，1001px 切 3 列会得到 333*3 = 999，右边缘那 2px 被丢掉 ——
 * 拼回去比原图窄，而且丢的正是画面边缘。
 */
export function gridCells(width: number, height: number, rows: number, cols: number): Cell[] {
  if (width <= 0 || height <= 0 || rows < 1 || cols < 1) return []
  const out: Cell[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = Math.round((width * c) / cols)
      const y = Math.round((height * r) / rows)
      // 下一格的起点就是这一格的终点 —— 用同一个公式算，格与格之间
      // 既不重叠也不留缝。
      const x2 = Math.round((width * (c + 1)) / cols)
      const y2 = Math.round((height * (r + 1)) / rows)
      out.push({
        index: r * cols + c,
        row: r,
        col: c,
        x,
        y,
        width: x2 - x,
        height: y2 - y,
      })
    }
  }
  return out
}

/**
 * 切出来那一格的文件名。
 *
 * 带上行列（`-r1c2`）而不是只带序号：用户是按位置认的，「第 5 格」在
 * 2x3 和 3x3 下不是同一个位置。
 */
export function cellFileName(source: string | undefined, cell: Cell): string {
  const stem = (source ?? "image").replace(/\.[^.]+$/, "")
  return `${stem}-r${cell.row + 1}c${cell.col + 1}.png`
}

/**
 * 把地址加载成 `<img>`。
 *
 * **要等 `decode()`**，不能只等 `onload`：Chromium 里 `onload` 之后像素
 * 未必已经解码，这时 `drawImage` 可能画出一片空白 —— 而且不报错。
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // 同源也显式声明：将来素材换成 CDN 时，没有这行画布会被 taint，
    // toBlob 直接抛，而报错位置离这里很远。
    img.crossOrigin = "anonymous"
    img.onload = () => {
      void img
        .decode()
        .then(() => resolve(img))
        // 老浏览器没有 decode 或对某些格式抛 —— onload 已经过了，
        // 退回去用也比整个失败强。
        .catch(() => resolve(img))
    }
    img.onerror = () => reject(new Error("图片加载失败"))
    img.src = src
  })
}
