// 文件大小格式化与下载进度估算，纯函数。
import { kU as isComfyUiModelUnavailable } from "../main.jsx";
const BYTE_UNIT = 1024;
const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"];
export const DOWNLOAD_PROGRESS_INTERVAL_MS = 120;
export const DOWNLOAD_PROGRESS_STEP = 2;
export function calculateFileProgress(overallProgress, fileIndex, fileCount) {
  if (fileCount <= 1) return overallProgress;
  const workflowFileShare = 5;
  if (fileIndex === 0) return Math.min(100, overallProgress * (100 / workflowFileShare));
  const dependencyShare = (100 - workflowFileShare) / (fileCount - 1);
  const dependencyStart = workflowFileShare + (fileIndex - 1) * dependencyShare;
  return Math.min(100, Math.max(0, ((overallProgress - dependencyStart) / dependencyShare) * 100));
}
export function liveDownloadPhase(task) {
  return task.status === "completed" ? "complete" : "downloading";
}
export function calculateLiveFileProgress(task, fileName, fileIndex) {
  if (fileIndex === 0) return 100;
  if (task.downloadedModels.includes(fileName) || task.skippedModels.includes(fileName)) return 100;
  if (isComfyUiModelUnavailable(task, fileName)) return 0;
  if (task.status === "completed") return 100;
  if (task.currentModel === fileName && task.status === "downloading") {
    return task.percent ?? null;
  }
  return 0;
}
export function formatFileSize(bytes, locale) {
  if (bytes === void 0 || bytes <= 0) return "—";
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(BYTE_UNIT)),
    FILE_SIZE_UNITS.length - 1,
  );
  const value = bytes / BYTE_UNIT ** unitIndex;
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  }).format(value)} ${FILE_SIZE_UNITS[unitIndex]}`;
}
