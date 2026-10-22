/**
 * AttachmentPresence / PresenceSlot / attachmentMotionStyle（4.0.3 新增）。
 *
 * 作用：让附件列表在**增删时**有进出场动画，而不是瞬间跳动。
 * 做法是保留即将被移除的子元素（标记 exiting），等退场动画放完再真正卸载。
 *
 * 三个导出的关系：
 *   attachmentMotionStyle  把 ATTACHMENT_MOTION 的四个数值写成 CSS 变量，
 *                          挂到容器上，供 .attachment-presence-* 这些类使用
 *   PresenceSlot           单个槽位：负责在 exiting 时计时并通知父级卸载
 *   AttachmentPresence     外层：比较前后 key 集合，把消失的项标成 exiting
 *
 * 适配：参照的 PresenceSlot 在退场时会调 releaseComposerPreviewWithin(container)
 * 释放输入框预览的占用。**本仓库没有那套预览占用机制**，所以这里省略了这一步
 * （那套机制存在时补上即可，不影响进出场本身）。
 */

import reactExports from "react";

import { __jsx } from "../shared/jsx-runtime.js";

/** 四个时长与一条缓动（参照值）。 */
const ATTACHMENT_MOTION = {
  layout: 240,
  enter: 180,
  exit: 140,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};

export const attachmentMotionStyle = {
  "--attachment-layout-duration": `${ATTACHMENT_MOTION.layout}ms`,
  "--attachment-enter-duration": `${ATTACHMENT_MOTION.enter}ms`,
  "--attachment-exit-duration": `${ATTACHMENT_MOTION.exit}ms`,
  "--attachment-resize-duration": `${ATTACHMENT_MOTION.layout}ms`,
  "--attachment-motion-easing": ATTACHMENT_MOTION.easing,
};

function PresenceSlot({ itemKey, exiting, onExited, children }) {
  const ref = reactExports.useRef(null);
  reactExports.useLayoutEffect(() => {
    if (!exiting) return;
    // 尊重「减少动效」偏好：直接卸载，不等动画
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onExited(itemKey);
      return;
    }
    const timer = window.setTimeout(
      () => onExited(itemKey),
      Math.max(ATTACHMENT_MOTION.layout, ATTACHMENT_MOTION.exit),
    );
    return () => window.clearTimeout(timer);
  }, [exiting, itemKey, onExited]);
  return __jsx(
    "div",
    {
      ref,
      "data-attachment-presence": exiting ? "exiting" : "present",
      className: "attachment-presence-slot",
      inert: exiting || undefined,
      "aria-hidden": exiting || undefined,
    },
    __jsx("div", { className: "attachment-presence-content" }, children),
  );
}

export function AttachmentPresence({ children }) {
  const incoming = reactExports.Children.toArray(children).filter(reactExports.isValidElement);
  const keys = JSON.stringify(incoming.map((child) => child.key));
  const [previousKeys, setPreviousKeys] = reactExports.useState(keys);
  const [items, setItems] = reactExports.useState(() =>
    incoming.map((element) => ({ key: String(element.key), element, exiting: false })),
  );
  const current = new Map(incoming.map((element) => [String(element.key), element]));
  const latest = reactExports.useRef(current);

  // 退场中的项已经不在 incoming 里了，但它们要显示"最后一帧"，
  // 所以这里记住它们最后一次出现的样子。
  reactExports.useLayoutEffect(() => {
    latest.current = new Map(
      items.map((item) => [item.key, current.get(item.key) ?? latest.current.get(item.key) ?? item.element]),
    );
  });

  if (keys !== previousKeys) {
    const next = incoming.map((element) => ({
      key: String(element.key),
      element,
      exiting: false,
    }));
    // 把消失的项按原位置插回去（标记 exiting），位置不变才不会跳
    for (const [index, item] of items.entries()) {
      if (!current.has(item.key)) {
        next.splice(Math.min(index, next.length), 0, { ...item, exiting: true });
      }
    }
    setPreviousKeys(keys);
    setItems(next);
  }

  const handleExited = reactExports.useCallback((key) => {
    setItems((existing) => existing.filter((item) => item.key !== key || !item.exiting));
  }, []);

  return items.map((item) =>
    __jsx(
      PresenceSlot,
      {
        itemKey: item.key,
        exiting: item.exiting,
        onExited: handleExited,
      },
      current.get(item.key) ?? latest.current.get(item.key) ?? item.element,
    ),
  );
}
