#!/usr/bin/env python3
"""把发布版本号写进 `app/desktop/package.json` 的 `version`（编码后的三段）。

    python3 scripts/set-desktop-version.py 3.0.21.3

## 为什么出包前必须改这个文件

`version` 这一栏**只有一个消费者，但后果极大**：electron-builder 从它取版本，
既写进 `latest-*.yml` 的 `version:`，也编进 asar 里的 `package.json` ——
于是运行中的应用 `app.getVersion()` 读到的就是它。

自动更新拿「清单里的版本」和「应用自报的版本」比。两者必须**同一次发布**的值：

- 清单 `30.21.3`、应用自报 `30.21.2` → 提示更新，装完还是 30.21.2，
  **每次点「检查更新」都还有新版**。
- 两边都是 30.21.3 → 干净的「已是最新」。

所以这个值不能在仓库里写死 —— 仓库里那份只代表「上一次发布的版本」，
真出包时由 CI 按 tag 覆写。这就是为什么它在 workflow 里排在
`pnpm turbo run build` 之后、`electron-builder` 之前。

**但只写进去还不够。** `release-desktop.py` 会拿 electron-builder 出的那份
`latest-*.yml` 断言这里的编码值对得上；对不上就在**上传任何东西之前**失败。
写进去和断言是两件事，少一件就会退化成「发布全绿、用户永远收不到更新」。
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

from versioning import release_semver_or_die  # noqa: E402

PKG = ROOT / "app/desktop/package.json"


def main() -> int:
    if len(sys.argv) != 2:
        print(f"用法：python3 {Path(__file__).name} <发布版本，如 30.21.8>", file=sys.stderr)
        return 2
    given = sys.argv[1].strip()
    encoded = release_semver_or_die(given, where=f"set-desktop-version {given}")

    doc = json.loads(PKG.read_text(encoding="utf8"))
    before = str(doc.get("version", ""))
    doc["version"] = encoded
    # indent=2 + 尾换行和文件现状**字节级一致**，所以改一个字段不会带出
    # 整份文件重排的噪音，diff 里只看得到那一行。
    PKG.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf8")

    print(f"✓ app/desktop/package.json  version: {before or '（无）'} → {encoded}")
    print(f"  清单 version 和 app.getVersion() 都会报 {encoded}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
