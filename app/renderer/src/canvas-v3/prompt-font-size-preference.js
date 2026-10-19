/**
 * 提示词字号偏好（v3 画布侧）—— 从产物主包取回（第 78 轮）。
 *
 * 这是一个手写的「外部存储 + 订阅」实现，和 `generation/prompt-font-size.js` 里的 zustand
 * store 是**两套**东西：产物在 v3 画布这边用的是这份轻量实现（`promptFontSizePreference`
 * 是个模块级单例，供 `useSyncExternalStore` 直接用）。
 */
import reactExports from "react";
import {
  PROMPT_FONT_SIZE_DEFAULT,
  STORAGE_KEY$a as PROMPT_FONT_SIZE_STORAGE_KEY,
  normalizePromptFontSize,
} from "../generation/prompt-font-size.js";

export function createPromptFontSizePreference(storage = () => (typeof window === "undefined" ? void 0 : window.localStorage)) {
  let current;
  const listeners = new Set();
  const getSnapshot = () => {
    if (current !== void 0) return current;
    current = PROMPT_FONT_SIZE_DEFAULT;
    try {
      const raw = storage()?.getItem(PROMPT_FONT_SIZE_STORAGE_KEY);
      if (raw != null && raw.trim() !== "") current = normalizePromptFontSize(Number(raw));
    } catch {
      // localStorage 不可用时保持默认值
    }
    return current;
  };
  const setFontSize = (value) => {
    current = normalizePromptFontSize(value);
    try {
      storage()?.setItem(PROMPT_FONT_SIZE_STORAGE_KEY, String(current));
    } catch {
      // 存不下不影响本次会话
    }
    for (const listener of listeners) listener();
  };
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  return { getSnapshot, setFontSize, subscribe };
}

export const promptFontSizePreference = createPromptFontSizePreference();

export function usePromptFontSizePreference() {
  const fontSize = reactExports.useSyncExternalStore(
    promptFontSizePreference.subscribe,
    promptFontSizePreference.getSnapshot,
    promptFontSizePreference.getSnapshot,
  );
  return [fontSize, promptFontSizePreference.setFontSize];
}
