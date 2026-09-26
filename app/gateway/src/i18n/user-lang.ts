/**
 * 当前界面语言（进程级）。启动时取主进程给的 `HILO_USER_LANG`，之后由 `POST /api/i18n/lang` 更新。
 * 放成模块级变量而不是注入的服务：读它的地方（错误文案、提示词）很散，不值得每处都注入。
 */
let userLang = process.env.HILO_USER_LANG ?? "";

export function getUserLang(): string {
  return userLang;
}

export function setUserLang(lang: string | undefined): void {
  userLang = lang ?? "";
}
