import { Body, Controller, HttpCode, Module, Post } from "@nestjs/common";

import { getUserLang, setUserLang } from "./user-lang.js";

/**
 * 界面语言：主进程在用户切换语言后广播给每个 gateway。gateway 生成的提示文案、给模型的语言提示按它来；
 * 不做校验，空串表示"跟随系统"。
 */
@Controller()
export class I18nController {
  @Post("api/i18n/lang")
  @HttpCode(200)
  setLang(@Body() body: Record<string, unknown>) {
    setUserLang(typeof body?.lang === "string" ? body.lang : "");
    return { ok: true, lang: getUserLang() };
  }
}

@Module({ controllers: [I18nController] })
export class I18nModule {}
