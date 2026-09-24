// 内部小工具：把 Rust 标准库里几个语义精确的字符串 / 数值操作搬过来。
//
// 单独一个文件而不是各模块自己写一遍：这些函数和 JS 自带的「看起来一样」的
// 那个**有细微差别**（`toLowerCase` 会动非 ASCII 字符、`Number("")` 是 0、
// `.length` 数的是 UTF-16 码元），差别一旦散落在各处，出了问题就很难对上
// Rust 那边的行为。不从 index 导出。

/** Rust `str::to_ascii_lowercase`：只动 A-Z。 */
export function asciiLower(s: string): string {
  return s.replace(/[A-Z]/g, (c) => c.toLowerCase());
}

/** Rust `str::to_ascii_uppercase`：只动 a-z。 */
export function asciiUpper(s: string): string {
  return s.replace(/[a-z]/g, (c) => c.toUpperCase());
}

/** Rust `str::eq_ignore_ascii_case`。 */
export function eqIgnoreAsciiCase(a: string, b: string): boolean {
  return asciiLower(a) === asciiLower(b);
}

/** Rust `s.chars().count()`：按 Unicode 标量数，不按 UTF-16 码元。 */
export function charCount(s: string): number {
  let n = 0;
  for (const _ of s) n++;
  return n;
}

/**
 * 按字符截断，超出时补一个 `…`。
 *
 * 按码点而不是 `.slice()`：后者可能从一个代理对中间切开，
 * 日志里留下一个乱码字符。
 */
export function truncate(s: string, max: number): string {
  if (charCount(s) <= max) return s;
  let out = "";
  let n = 0;
  for (const c of s) {
    if (n >= max) break;
    out += c;
    n++;
  }
  return out + "…";
}

/**
 * Rust `str::parse::<f64>()`。
 *
 * **不能用 `Number()`**：`Number("")` 是 `0`、`Number(" 16 ")` 是 `16`、
 * `Number("0x10")` 是 `16` —— Rust 那边这三个都是解析失败。比例串解析宽了，
 * `":9"` 这种残缺输入会被当成 `0:9` 继续往下算。
 */
export function parseF64(s: string): number | null {
  if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return Number(s);
  const lower = asciiLower(s);
  const m = /^([+-]?)(inf|infinity|nan)$/.exec(lower);
  if (m) {
    if (m[2] === "nan") return Number.NaN;
    return m[1] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  }
  return null;
}

/** Rust `f64 as u32`：饱和转换，NaN → 0，向零截断。 */
export function asU32(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x <= 0) return 0;
  if (x >= 4294967295) return 4294967295;
  return Math.trunc(x);
}

/** Rust `f64::round`：半数远离零取整（JS 的 `Math.round` 是朝正无穷）。 */
export function roundHalfAway(x: number): number {
  return x < 0 ? -Math.round(-x) : Math.round(x);
}

/** Rust `str::lines`：按 `\n` 切、去掉行尾 `\r`，末尾的空行不算一行。 */
export function lines(s: string): string[] {
  if (s === "") return [];
  const parts = s.split("\n");
  if (parts[parts.length - 1] === "") parts.pop();
  return parts.map((l) => (l.endsWith("\r") ? l.slice(0, -1) : l));
}

/** 取 JSON 里的一个字符串值；不是字符串就是 `undefined`（Rust `Value::as_str`）。 */
export function asStr(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/** 普通对象（不是数组、不是 null）。 */
export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
