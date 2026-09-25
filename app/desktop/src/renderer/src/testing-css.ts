import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

/** 测试用：入口 styles.css + styles/ 下全部分片 + tokens.css，按导入顺序拼成一份 */
export function allCss(): string {
  const src = fileURLToPath(new URL(".", import.meta.url))
  const parts = readdirSync(join(src, "styles"))
    .filter((f) => f.endsWith(".css"))
    .sort()
    .map((f) => readFileSync(join(src, "styles", f), "utf8"))
  return [readFileSync(join(src, "styles.css"), "utf8"), readFileSync(join(src, "tokens.css"), "utf8"), ...parts].join("\n")
}
