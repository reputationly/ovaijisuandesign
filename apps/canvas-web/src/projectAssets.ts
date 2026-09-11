/**
 * 项目资产。官方 `projectAssets.*`：
 *
 * ```
 * title            = 项目资产        searchPlaceholder = 搜索文件名
 * columns.name     = 名称            columns.type      = 类型
 * columns.size     = 大小            columns.updated   = 最近修改
 * sortBy.{name,size,type,updated}   sortDir.{asc,desc} = 升序 / 降序
 * bucket.{image,video,audio,document,code,archive,folder,other}
 * viewGrid = 网格视图  viewList = 列表视图
 * countMixed = {{folders}} 个文件夹 · {{files}} 个文件
 * selectedCount = 已选择 {{count}} 项
 * emptyStateTitle = 暂无项目资产
 * emptyStateSearchTitle = 没有匹配的资产   emptyStateSearchDesc = 换个关键词或清除筛选。
 * batchDeleteLocalBody = 已选择的本地文件和文件夹将从项目资产中删除，可在废纸篓中找到。
 * ```
 *
 * **和「主体库」(`assetCenter`) 不是一回事。** 主体库是跨创作页复用的角色 /
 * 场景 / 风格包，有自己的一整套导入导出和 agent 推荐；项目资产就是这个
 * 项目里的文件浏览器。官方在底部工具条上是两个不同的按钮
 * （`canvas.toolbar.assets` 和 `canvas.toolbar-project-assets`）。
 *
 * 逻辑全在这里、界面只管画 —— 排序的稳定性和分桶归类在界面里很难测。
 */

import type { AssetInfo as Asset } from "./api"

/** 官方 `projectAssets.bucket.*`。 */
export const BUCKETS = {
  image: "图片",
  video: "视频",
  audio: "音频",
  document: "文档",
  code: "代码",
  archive: "压缩包",
  folder: "文件夹",
  other: "其他",
} as const

export type Bucket = keyof typeof BUCKETS

/** 官方 `projectAssets.sortBy.*`。 */
export const SORT_KEYS = {
  name: "名称",
  size: "文件大小",
  type: "文件类型",
  updated: "最近修改",
} as const

export type SortKey = keyof typeof SORT_KEYS
export type SortDir = "asc" | "desc"

const EXT: Record<string, Bucket> = {
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", bmp: "image",
  svg: "image", heic: "image", avif: "image", tif: "image", tiff: "image",
  mp4: "video", mov: "video", webm: "video", mkv: "video", avi: "video", m4v: "video",
  mp3: "audio", wav: "audio", flac: "audio", aac: "audio", ogg: "audio", m4a: "audio",
  pdf: "document", doc: "document", docx: "document", txt: "document", md: "document",
  rtf: "document", ppt: "document", pptx: "document", xls: "document", xlsx: "document",
  csv: "document",
  js: "code", ts: "code", tsx: "code", jsx: "code", py: "code", rs: "code", go: "code",
  java: "code", c: "code", h: "code", cpp: "code", json: "code", yaml: "code", yml: "code",
  toml: "code", sh: "code", html: "code", css: "code",
  zip: "archive", tar: "archive", gz: "archive", rar: "archive", "7z": "archive",
}

/**
 * 文件归到哪个桶。
 *
 * **先看扩展名再看资产索引里的 `type`。** 索引那个字段只分 image/video/
 * audio/text 四类，pdf 和 .rs 都会落进 text —— 而筛选器上「文档」和「代码」
 * 是两个选项，混在一起的话用户按"代码"筛不出自己的脚本。
 */
export function bucketOf(a: Pick<Asset, "path" | "type">): Bucket {
  const ext = a.path.split(".").pop()?.toLowerCase() ?? ""
  const byExt = EXT[ext]
  if (byExt) return byExt
  if (a.type === "image" || a.type === "video" || a.type === "audio") return a.type
  return "other"
}

/** 文件大小。官方列表里是「1.2 MB」这种，不是字节数。 */
export function humanSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—"
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB", "TB"]
  let v = bytes / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  // 小于 10 时留一位小数：「1.2 MB」比「1 MB」有信息量，而「123.4 MB」
  // 那位小数没人看。
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`
}

/** 资产索引里的 `time` 是秒级字符串。 */
export function timeOf(a: Pick<Asset, "time">): number {
  const n = Number(a.time)
  return Number.isFinite(n) ? n : 0
}

export function humanTime(secs: number): string {
  if (!secs) return "—"
  const d = new Date(secs * 1000)
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return "刚刚"
  if (mins < 60) return `${mins} 分钟前`
  if (mins < 60 * 24) return `${Math.floor(mins / 60)} 小时前`
  if (mins < 60 * 24 * 30) return `${Math.floor(mins / 1440)} 天前`
  return d.toLocaleDateString()
}

export interface ListOptions {
  search: string
  /** 空集合 = 不筛。 */
  buckets: Set<Bucket>
  sort: SortKey
  dir: SortDir
}

export const DEFAULT_LIST: ListOptions = {
  search: "",
  buckets: new Set(),
  // 官方默认「最近修改」降序 —— 刚生成的东西在最上面，这是最常见的意图。
  sort: "updated",
  dir: "desc",
}

/**
 * 筛 + 排。
 *
 * **排序必须是稳定的**：两个文件大小一样时，切换一次升降序再切回来，
 * 顺序要和原来一致。`Array.sort` 在 V8 里是稳定的，但只有比较函数在相等时
 * 真的返回 0 才成立 —— 所以每一路都用 `path` 兜底做次级键。
 */
export function listAssets(all: readonly Asset[], opts: ListOptions): Asset[] {
  const q = opts.search.trim().toLowerCase()
  const out = all.filter((a) => {
    if (opts.buckets.size > 0 && !opts.buckets.has(bucketOf(a))) return false
    if (!q) return true
    // 路径也参与匹配：用户记得"在 images 那个目录里"是很常见的找法。
    return a.name.toLowerCase().includes(q) || a.path.toLowerCase().includes(q)
  })

  const sign = opts.dir === "asc" ? 1 : -1
  out.sort((a, b) => {
    let d = 0
    switch (opts.sort) {
      case "name":
        // `localeCompare` 带 numeric：`图-2` 排在 `图-10` 前面。
        // 默认的字典序会把 10 排到 2 前面，而用户是按数字理解的。
        d = a.name.localeCompare(b.name, "zh-CN", { numeric: true })
        break
      case "size":
        d = a.file_size - b.file_size
        break
      case "type":
        d = bucketOf(a).localeCompare(bucketOf(b))
        break
      case "updated":
        d = timeOf(a) - timeOf(b)
        break
    }
    // 次级键保证稳定，见上面那段说明。次级键**不跟随升降序** ——
    // 跟随的话相等项会在两个方向上反过来，看起来像"顺序乱跳"。
    return d !== 0 ? d * sign : a.path.localeCompare(b.path)
  })
  return out
}

/** 官方 `projectAssets.countMixed` / `countFiles`。 */
export function countLabel(n: number): string {
  return n === 0 ? "0 项" : `${n} 个文件`
}

/**
 * 每个桶里有多少个。筛选菜单上要显示数量。
 *
 * **按"没有这一条筛选时"算**，不是按当前结果算 —— 否则选中「图片」之后
 * 其它桶全变成 0，用户没法知道切过去有没有东西。
 */
export function bucketCounts(all: readonly Asset[], opts: ListOptions): Map<Bucket, number> {
  const base = listAssets(all, { ...opts, buckets: new Set() })
  const m = new Map<Bucket, number>()
  for (const a of base) {
    const b = bucketOf(a)
    m.set(b, (m.get(b) ?? 0) + 1)
  }
  return m
}
