// 浏览器改图的请求判断和提示词。
export const IMAGE_EDIT_TOOLS = ["redraw", "outpaint", "erase", "super-resolution", "remove-bg", "move-object"];
export const STORAGE_KEY$6 = "hilo:canvas:image-edit:last-used";
export const DEFAULT_TOOL = "redraw";
export function isMergedImageEditTool(tool) {
  return IMAGE_EDIT_TOOLS.includes(tool);
}
export function readPersisted() {
  if (typeof window === "undefined") return DEFAULT_TOOL;
  try {
    const storedTool = window.localStorage.getItem(STORAGE_KEY$6);
    if (isMergedImageEditTool(storedTool)) return storedTool;
  } catch {}
  return DEFAULT_TOOL;
}
export const BROWSER_IMAGE_EDIT_ACTIONS = ["remove-background", "upscale", "describe-prompt", "separate-layers"];
export function isBrowserImageEditAction(value) {
  return typeof value === "string" && BROWSER_IMAGE_EDIT_ACTIONS.includes(value);
}
export const BROWSER_IMAGE_EDIT_EVENT = "hilo:browser-image-edit";


export function isBrowserImageEditRequest(value) {
  if (!value || typeof value !== "object") return false;
  const request = value;
  return request.file instanceof File && request.file.type.startsWith("image/") && isBrowserImageEditAction(request.action) && typeof request.pageUrl === "string" && typeof request.pageTitle === "string";
}
export function browserImageEditPrompt(t2, action) {
  const prompts = {
    "remove-background": () => t2("workspace.browser.imageEdit.prompt.removeBackground", "请使用专用抠图能力处理本次附件中的图片，保留原图主体和精细边缘，去除背景并输出透明背景 PNG，不重新生成主体。"),
    upscale: () => t2("workspace.browser.imageEdit.prompt.upscale", "请使用专用图像超清能力处理本次附件中的图片，提升分辨率和细节清晰度，保持主体、构图、色彩与原有风格，不重绘原图；未指定输出尺寸时使用默认设置。"),
    "describe-prompt": () => t2("workspace.browser.imageEdit.prompt.describePrompt", "请反推这张图片的提示词。"),
    "separate-layers": () => t2("workspace.browser.imageEdit.prompt.separateLayers", "请使用专用图层分离能力处理本次附件中的图片，按主体、背景及主要元素输出底图和独立 PNG 图层，保留分离图层的透明通道及位置信息，并说明实际图层顺序；不要重新生成替代元素。")
  };
  return prompts[action]();
}
