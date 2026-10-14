// 按语言取 `zh` 或 `en` 字段。


export function localizedI18nText(text2, language2) {
  return language2.toLowerCase().startsWith("zh") ? text2.zh : text2.en;
}
