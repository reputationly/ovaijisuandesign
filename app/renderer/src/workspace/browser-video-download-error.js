/**
 * 浏览器视频下载/保存失败的区分（4.0.3 新增）。
 *
 * 为什么需要一个专门的错误类：同一段 catch 里要区分三种结果
 *   · 已存到项目但没加进对话  -> videoAttachmentFailed
 *   · 资源架构 v3 下保存失败  -> videoSaveFailed
 *   · 下载本身就失败          -> videoDownloadFailed
 * 前两种都是「保存」环节，第三种是「下载」环节。
 * 用 instanceof 区分，比在 message 里塞标记可靠。
 */

export class BrowserVideoDownloadError extends Error {}

/** 参照里等于 `origin.architecture === "resource_v3"`。 */
export const RESOURCE_ARCHITECTURE_V3 = "resource_v3";
