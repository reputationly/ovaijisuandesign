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

import { __jsx } from "../shared/jsx-runtime.js";
import { Button } from "../infra/dialog-content.jsx";
import { dedupedToast } from "../infra/agent-http-client.js";
import { workspaceEvents } from "./topbar-state-context.jsx";

export class BrowserVideoDownloadError extends Error {}

/** 参照里等于 `origin.architecture === "resource_v3"`。 */
export const RESOURCE_ARCHITECTURE_V3 = "resource_v3";

/**
 * 「已添加到画布」的提示，带一个「查看」按钮（4.0.3 新增）。
 *
 * 与直接弹个 toast 的区别：有了 compositionId 就给出可点击的定位入口，
 * 用户点一下直接跳到画布上那个节点。没有 id 时退化成纯提示。
 */
export function showBrowserCanvasToast(t, handleView) {
  const toastId = dedupedToast.success(t("workspace.browser.pluginAddedToCanvas", "已添加到画布"), {
    duration: 8_000,
    action: __jsx(Button, {
      variant: "default",
      size: "default",
      className: "ml-auto min-w-14 shrink-0 px-3",
      "data-action-ui-id": "browser-toast-view-on-canvas",
      onClick: () => {
        dedupedToast.dismiss(toastId);
        handleView();
      },
      children: t("workspace.browser.viewOnCanvas", "查看"),
    }),
  });
}

/**
 * 「浏览器插件把内容加到了画布」的统一提示（4.0.3 新增）。
 * 有 workspaceId + compositionId 就给定位入口；缺任何一个就只提示。
 */
export function notifyBrowserCanvasCompositionAdded(workspaceId, compositionIds, t) {
  const [compositionId] = compositionIds;
  if (!workspaceId || !compositionId) {
    dedupedToast.success(t("workspace.browser.pluginAddedToCanvas", "已添加到画布"));
    return;
  }
  showBrowserCanvasToast(t, () =>
    workspaceEvents.fireLocateCanvasCompositionRequest(workspaceId, compositionId),
  );
}
