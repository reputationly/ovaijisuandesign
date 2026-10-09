// 云端资产的移动目标整理与调试开关。
export function compactCloudMoveTargets(targets, parentSegmentsFor) {
  const pathOf = (node) => [...parentSegmentsFor(node), node.name].join("/");
  const folderPaths = targets.filter((node) => node.kind === "folder").map(pathOf);
  return targets.filter((node) => {
    const path = pathOf(node);
    return !folderPaths.some(
      (folderPath) => folderPath !== path && path.startsWith(`${folderPath}/`),
    );
  });
}
export const UPLOAD_REFRESH_DEBOUNCE_MS = 300;
export function isCloudAssetsDebugEnabled(isDev = false) {
  return isDev;
}
