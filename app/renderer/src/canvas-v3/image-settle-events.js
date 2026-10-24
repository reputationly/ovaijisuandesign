import reactExports from "react";

import { PERF_CANVAS_V3_FIRST_IMAGE_READY, PERF_CANVAS_V3_FIRST_NODE_COMMIT, PERF_CANVAS_V3_FIRST_NODE_PAINT, PERF_CANVAS_V3_IMAGES_SETTLED, recordPerfSpan } from "../infra/perf-spans.js";

const SETTLE_MS = 500;

/**
 * 4.0.4 的首图/图片稳定事件：观察 v3 画布里的 `<img>`。
 *
 * 参照在 surface perf hook 里按视口扫描；源码树没有那套 DOM 观察器，这里用
 * MutationObserver + load/error 做等价的最小实现：第一张 complete 图报 first-image-ready，
 * 连续 500ms 没有未完成图片再报 images-settled。
 */
export function useCanvasV3ImageSettleEvents(workspaceId, active = true) {
  reactExports.useEffect(() => {
    if (!active || typeof document === "undefined") return;
    let stopped = false;
    let timer = 0;
    let firstReported = false;
    let firstNodeReported = false;
    const pending = new Set();
    const watched = new WeakSet();
    let root = document.querySelector(".react-flow");

    const settle = () => {
      if (stopped) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (stopped || pending.size) return;
        recordPerfSpan(PERF_CANVAS_V3_IMAGES_SETTLED, performance.now(), { workspaceId });
      }, SETTLE_MS);
    };

    const watch = (img) => {
      if (watched.has(img)) return;
      watched.add(img);
      if (img.complete) {
        if (!firstReported && img.naturalWidth > 0) {
          firstReported = true;
          recordPerfSpan(PERF_CANVAS_V3_FIRST_IMAGE_READY, performance.now(), { workspaceId });
        }
        settle();
        return;
      }
      pending.add(img);
      const done = () => {
        pending.delete(img);
        if (!firstReported && img.naturalWidth > 0) {
          firstReported = true;
          recordPerfSpan(PERF_CANVAS_V3_FIRST_IMAGE_READY, performance.now(), { workspaceId });
        }
        settle();
      };
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    };

    const scan = () => {
      if (!root) root = document.querySelector(".react-flow");
      if (!root) return;
      if (!firstNodeReported && root.querySelector(".react-flow__node")) {
        firstNodeReported = true;
        recordPerfSpan(PERF_CANVAS_V3_FIRST_NODE_COMMIT, performance.now(), { workspaceId });
        requestAnimationFrame(() => {
          if (!stopped) recordPerfSpan(PERF_CANVAS_V3_FIRST_NODE_PAINT, performance.now(), { workspaceId });
        });
      }
      for (const img of root.querySelectorAll("img")) watch(img);
      settle();
    };

    const observer = new MutationObserver(scan);
    const attach = () => {
      if (stopped) return;
      if (!root) root = document.querySelector(".react-flow");
      if (!root) {
        window.setTimeout(attach, 200);
        return;
      }
      observer.observe(root, { childList: true, subtree: true });
      scan();
    };
    attach();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [active, workspaceId]);
}
