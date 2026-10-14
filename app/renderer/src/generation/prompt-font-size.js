// 提示词字号 store，以及歌词区布局 hook。
import { create as create$2 } from "zustand";

export const PROMPT_FONT_SIZE_MIN = 8;
export const PROMPT_FONT_SIZE_MAX = 36;
export const PROMPT_FONT_SIZE_DEFAULT = 15;
export const STORAGE_KEY$a = "hilo:canvas:prompt-font-size";
export function normalizePromptFontSize(value) {
  if (!Number.isFinite(value)) return PROMPT_FONT_SIZE_DEFAULT;
  return Math.min(PROMPT_FONT_SIZE_MAX, Math.max(PROMPT_FONT_SIZE_MIN, Math.round(value)));
}
export function readPersistedPromptFontSize() {
  if (typeof window === "undefined") return PROMPT_FONT_SIZE_DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY$a);
    if (raw === null || raw.trim() === "") return PROMPT_FONT_SIZE_DEFAULT;
    return normalizePromptFontSize(Number(raw));
  } catch {
    return PROMPT_FONT_SIZE_DEFAULT;
  }
}
export function persistPromptFontSize(fontSize) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY$a, String(fontSize));
  } catch {}
}


export const usePromptFontSizeStore = create$2((set2, get3) => ({
  fontSize: readPersistedPromptFontSize(),
  setFontSize: fontSize => {
    const normalized = normalizePromptFontSize(fontSize);
    if (get3().fontSize === normalized) return;
    set2({
      fontSize: normalized
    });
    persistPromptFontSize(normalized);
  },
  resetFontSize: () => {
    const current2 = get3().fontSize;
    if (current2 === PROMPT_FONT_SIZE_DEFAULT) return;
    set2({
      fontSize: PROMPT_FONT_SIZE_DEFAULT
    });
    persistPromptFontSize(PROMPT_FONT_SIZE_DEFAULT);
  }
}));
export function useMusicPromptLayout(showsLyrics, hasReadOnlyLyrics, expanded) {
  const fontSize = usePromptFontSizeStore(state2 => state2.fontSize);
  return {
    fontSize,
    prompt: {
      flex: "1.25 1 0%",
      // One full line, 12px input padding and the 32px metadata row.
      minHeight: showsLyrics ? fontSize * 1.5 + 44 : void 0
    },
    lyrics: {
      flex: "2 1 0%",
      minHeight: fontSize * 1.5 + (hasReadOnlyLyrics ? 5 : 9)
    },
    // Reserve the font-height increase for both inputs in compact mode.
    extraHeight: showsLyrics && !expanded ? Math.max(0, (fontSize - PROMPT_FONT_SIZE_DEFAULT) * 3) : 0
  };
}
