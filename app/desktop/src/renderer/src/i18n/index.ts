import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import { readConfig, type Language } from "../stores/global-config"
import { runtimeConfig } from "../api/runtime"
import { extraEn, extraZh } from "./extra"
import en from "./locales/en.json"
import zh from "./locales/zh.json"

/**
 * 界面语言：先看用户在设置里选的，再按发行区域推断（海外 → en，其余 → zh），都没有就 en。
 * key 是扁平字符串，点号不代表嵌套，所以关掉 keySeparator / nsSeparator。
 */
export function detectLanguage(): Language {
  const saved = readConfig().language
  if (saved === "zh" || saved === "en") return saved
  const region = runtimeConfig().region
  if (region) return region === "overseas" ? "en" : "zh"
  return "en"
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: { ...en, ...extraEn } }, zh: { translation: { ...zh, ...extraZh } } },
  lng: detectLanguage(),
  fallbackLng: "en",
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
})

/** 设置里改了语言后调用；值没变就什么都不做 */
export function syncLanguage(lang: Language) {
  if (i18n.language !== lang) void i18n.changeLanguage(lang)
}

export default i18n
