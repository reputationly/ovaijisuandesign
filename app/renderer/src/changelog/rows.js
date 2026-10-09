// 更新日志的语言选择与列表行数据整理，纯函数。
export function pickLocale(lang) {
  return lang.startsWith("zh") ? "zh" : "en";
}
export function buildChangelogRows(locale) {
  return locale.items.map((item) => ({
    badge: locale.badge,
    version: item.version,
    date: item.date,
    subtitle: item.subtitle,
    changelog: item.changelog,
    featured: item.featured,
    id: item.version,
  }));
}
