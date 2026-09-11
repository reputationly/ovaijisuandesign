import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "bun:test"

/**
 * 同名不同大小写的源文件。
 *
 * **macOS 和 Windows 的文件系统默认大小写不敏感**,`Sticker.tsx` 和
 * `sticker.ts` 在磁盘上是两个文件，但 tsc 认为它们是同一个，直接报
 * `TS1261: differs from ... only in casing`,整个类型检查失败。
 *
 * 这个错我犯过两次（sticker、projectAssets），两次都是写完一整个组件之后
 * 才在 tsc 上撞见。仓里的惯例是**逻辑文件小写、组件文件 PascalCase 且换个
 * 名字**：`find.ts` / `FindBar.tsx`、`sticker.ts` / `StickerCard.tsx`、
 * `projectAssets.ts` / `AssetsPanel.tsx`。
 *
 * Linux 的 CI 上不会报这个错（那边大小写敏感），所以本地这条检查更重要。
 */
describe("文件名", () => {
  it("没有只差大小写的同名文件", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url))
    const seen = new Map<string, string[]>()
    for (const f of readdirSync(dir)) {
      // 比的是**去掉扩展名后的主干**。`a.ts` 和 `a.tsx` 也算撞 ——
      // tsc 的模块解析会在 `./a` 上二选一，而选哪个不由你决定。
      const stem = f.replace(/\.(ts|tsx|js|jsx|css)$/, "")
      if (stem === f) continue
      const key = stem.toLowerCase()
      seen.set(key, [...(seen.get(key) ?? []), f])
    }
    const clashes = [...seen.values()]
      .filter((fs) => fs.length > 1)
      .map((fs) => `${fs.join(" 和 ")} 只差大小写 —— tsc 会报 TS1261`)
    expect(clashes).toEqual([])
  })
})
