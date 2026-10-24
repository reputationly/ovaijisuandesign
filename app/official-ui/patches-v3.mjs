/**
 * v3 工作台运行时的补丁表（第 2040 轮）。
 *
 * ⚠ 规则（与 3.0.16 时期的 official-ui/patches.mjs 一致，这里更严）：
 *   · **定位只能用不会变的字面量**：界面 id、i18n 键、API 路径、CSS 类名、文案原文。
 *     这份产物压缩过、每次构建变量名都会变，**不能用变量名定位**。
 *   · **文件按前缀匹配**（哈希每次都会变），例如 `index.html`、`assets/index-`。
 *   · **每条必须写 count**：实际命中数与 count 不符 → 构建失败。
 *     这是升级后「补丁悄悄失效」的唯一防线。
 *
 * 加补丁之前先问：能不能在层 0（数据/开关/gateway/主进程）解决？能就别加到这里。
 */
export const VERSION = "4.0.4";

/**
 * @typedef {Object} Patch
 * @property {string} id            唯一标识，出现在构建日志里
 * @property {string} file          相对产物根的**路径前缀**（哈希之前的部分）
 * @property {string|RegExp} find   字符串，或带 g 的正则
 * @property {string|Function} replace
 * @property {number} [count=1]     预期命中次数，不符则失败
 * @property {[string,string]} [within] 把替换限定在 [开始锚点, 结束锚点] 区间内
 * @property {string} why           为什么需要这条补丁（写清原因，便于以后判断能否删除）
 */

/** @type {Patch[]} */
export const PATCHES = [
  {
    id: "v3-title",
    file: "index.html",
    find: "<title>MiniMax Design V3</title>",
    // 官方标题；宿主用独立窗口时这一行就是窗口标题。
    replace: "<title>蒜狸小助手</title>",
    count: 1,
    why:
      "品牌替换。4.0.4 的 v3 产物里 `MiniMax Design` 只出现这 1 次；" +
      "其余 `MiniMax` 都是模型 id / 模型名 / 后端取值（MiniMax-H3、backend:\"minimax_v3\" 等），" +
      "属于接口值，**不能替换**。logo 与字标都在主界面（已是源码），不进这个补丁层。",
  },
];

/** 拷进产物的自有资源：{ src（相对本目录）, dest（相对产物根） }。第一批为空。 */
export const ASSETS = [];
