// 聊天代码块的高亮插件和缓存留在应用里：已装的 streamdown 没有这套缓存键。
// 高亮器从 shiki 公开入口创建，语言目录不再留在 vendor.js。
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";
import { createHighlighter } from "shiki";
import { bundledLanguages, bundledLanguagesInfo } from "shiki/langs";

const javascriptRegexEngine = createJavaScriptRegexEngine({
  forgiving: true,
});

const languageAliases = Object.fromEntries(
  bundledLanguagesInfo.flatMap((info) =>
    (info.aliases ?? []).map((alias) => [alias, info.id]),
  ),
);
const languageIds = new Set(Object.keys(bundledLanguages));
const highlighterCache = new Map();
const tokenCache = new Map();
const pendingListeners = new Map();

function normalizeLanguage(language) {
  const normalized = language.trim().toLowerCase();
  return languageAliases[normalized] || normalized;
}

function themeName(theme) {
  return typeof theme === "string" ? theme : (theme?.name ?? "custom");
}

function highlighterCacheKey(language, themes) {
  return `${language}-${themeName(themes[0])}-${themeName(themes[1])}`;
}

function tokenCacheKey(code, language, themeNames) {
  const head = code.slice(0, 100);
  const tail = code.length > 100 ? code.slice(-100) : "";
  return `${language}:${themeNames[0]}:${themeNames[1]}:${code.length}:${head}:${tail}`;
}

function loadHighlighter(language, themes) {
  const key = highlighterCacheKey(language, themes);
  if (highlighterCache.has(key)) return highlighterCache.get(key);
  const pending = createHighlighter({
    themes,
    langs: [language],
    engine: javascriptRegexEngine,
  });
  highlighterCache.set(key, pending);
  return pending;
}

function createCodeHighlighterPlugin(options = {}) {
  const themes = options.themes ?? ["github-light", "github-dark"];
  return {
    name: "shiki",
    type: "code-highlighter",
    supportsLanguage(language) {
      return languageIds.has(normalizeLanguage(language));
    },
    getSupportedLanguages() {
      return Array.from(languageIds);
    },
    getThemes() {
      return themes;
    },
    highlight({ code, language, themes: requestThemes }, notify) {
      const normalized = normalizeLanguage(language);
      const themePair = [themeName(requestThemes[0]), themeName(requestThemes[1])];
      const cacheKey = tokenCacheKey(code, normalized, themePair);
      if (tokenCache.has(cacheKey)) return tokenCache.get(cacheKey);
      if (notify) {
        if (!pendingListeners.has(cacheKey)) pendingListeners.set(cacheKey, new Set());
        pendingListeners.get(cacheKey).add(notify);
      }
      const lang = languageIds.has(normalized) ? normalized : "text";
      loadHighlighter(lang, requestThemes).then((highlighter) => {
        const loaded = highlighter.getLoadedLanguages().includes(normalized) ? normalized : "text";
        const tokens = highlighter.codeToTokens(code, {
          lang: loaded,
          themes: {
            light: themePair[0],
            dark: themePair[1],
          },
        });
        tokenCache.set(cacheKey, tokens);
        const listeners = pendingListeners.get(cacheKey);
        if (listeners) {
          for (const listener of listeners) listener(tokens);
          pendingListeners.delete(cacheKey);
        }
      }).catch((error) => {
        console.error("[Streamdown Code] Failed to highlight code:", error);
        pendingListeners.delete(cacheKey);
      });
      return null;
    },
  };
}

export const codeHighlighterPlugin = createCodeHighlighterPlugin();
