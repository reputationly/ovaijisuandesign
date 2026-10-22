/**
 * 建议简介引导浮层（4.0.3 新增）。
 *
 * 移植自参照 index-B3Ss5vz1.js 的 `usePromptSuggestionCoachMark`（约 3.5KB）与
 * `promptSuggestionMarkId`。它负责「第一次出现提示建议时，把浮层显示在输入框上方，
 * 用户一旦开始输入/粘贴/按 Esc 就记为该用户已看过，以后不再出现」。
 *
 * 触发条件（全部满足才显示，参照原样）：
 *   有建议 && 有会话 && 未看过 && 存储已水合 && 窗口在前台 && 输入框在视口内 && 没有阻塞模态
 * 延迟 500ms 再显示 —— 避免刚切进会话就弹，显得突兀。
 *
 * 三条撤销路径：在可编辑区 beforeinput 插入、粘贴文本、按 Escape。
 * 已读状态写进 global.dismissedCoachMarks（与其它引导共用同一份列表）。
 */

import reactExports from "react";

import { useStorage } from "../infra/use-storage.js";
import { useHasBlockingModal } from "../infra/schedule.js";

/** 已读标记的 id；没有 userId（未登录）时返回 null，即不显示也不记录。 */
export function promptSuggestionMarkId(userId) {
  return userId ? `prompt-suggestion-intro:v1:${userId}` : null;
}

function isForeground() {
  return document.visibilityState === "visible" && document.hasFocus();
}

export function usePromptSuggestionCoachMark({ rootRef, suggestion, sessionId, enabled, user }) {
  const [dismissed, setDismissed, , hydrated] = useStorage("global.dismissedCoachMarks");
  const blockingModal = useHasBlockingModal();
  const markId = promptSuggestionMarkId(user?.userID);
  const [foreground, setForeground] = reactExports.useState(isForeground);
  const [inViewport, setInViewport] = reactExports.useState(false);
  const [openedKey, setOpenedKey] = reactExports.useState(null);
  const anchorRef = reactExports.useRef(null);

  // 窗口可见性与焦点：失焦时不弹，回来再弹
  reactExports.useEffect(() => {
    const sync = () => setForeground(isForeground());
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("blur", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("blur", sync);
    };
  }, []);

  // 锚点 = 输入框；只有它真的在视口里才显示（否则浮层会飘在屏幕外）
  reactExports.useLayoutEffect(() => {
    const anchor = suggestion && sessionId ? rootRef.current?.querySelector(".message-input-editor") : null;
    anchorRef.current = anchor ?? null;
    setInViewport(false);
    if (!anchor) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInViewport(Boolean(entry?.isIntersecting && entry.intersectionRatio > 0));
    });
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [rootRef, suggestion, sessionId]);

  const completed = Boolean(markId && dismissed?.includes(markId));
  const eligible = Boolean(
    enabled &&
      suggestion &&
      sessionId &&
      markId &&
      hydrated &&
      !completed &&
      foreground &&
      inViewport &&
      !blockingModal,
  );

  // displayKey 变化（换了会话或换了建议）就重新计时
  const displayKey = JSON.stringify([markId, sessionId, suggestion]);
  const open = eligible && openedKey === displayKey;

  reactExports.useEffect(() => {
    if (!eligible) {
      setOpenedKey(null);
      return;
    }
    const timer = setTimeout(() => setOpenedKey(displayKey), 500);
    return () => clearTimeout(timer);
  }, [eligible, displayKey]);

  const dismiss = reactExports.useCallback(() => {
    if (!open || !markId) return;
    setOpenedKey(null);
    setDismissed((previous) => {
      const marks = Array.isArray(previous) ? previous : [];
      return marks.includes(markId) ? marks : [...marks, markId];
    });
  }, [open, markId, setDismissed]);

  reactExports.useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    const handleBeforeInput = (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest('[contenteditable="true"]') &&
        String(event.inputType).startsWith("insert")
      ) {
        dismiss();
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !event.isComposing) dismiss();
    };
    const handlePaste = (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest('[contenteditable="true"]') &&
        event.clipboardData?.getData("text/plain")
      ) {
        dismiss();
      }
    };
    root?.addEventListener("beforeinput", handleBeforeInput, true);
    root?.addEventListener("paste", handlePaste, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      root?.removeEventListener("beforeinput", handleBeforeInput, true);
      root?.removeEventListener("paste", handlePaste, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [rootRef, open, dismiss]);

  return { open, dismiss, anchorRef };
}
