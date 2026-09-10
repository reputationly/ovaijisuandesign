#!/usr/bin/env python3
"""下载品牌字体的子集。

    python3 scripts/brand-font.py

马善政毛笔楷书（Ma Shan Zheng），OFL 开源许可，可随包分发。

## 为什么是子集

完整的中文字体 5~10 MB。我们整个安装包才 6 MB —— 打进去就翻倍了。
子集由 Google Fonts 的 `text=` 参数在服务端生成，只含下面 `CHARS` 里的字，
现在是 8 KB 上下。

## 改文案之后要重跑

**不在子集里的字会安静地掉回黑体。** 一句话里有一个字长得不一样，
是那种看着别扭但说不出哪里不对的问题。所以 `CHARS` 里除了当前用到的，
还预留了一批可能会用的词和全部常见标点。

改完 UI 文案就重跑一次这个脚本，然后肉眼扫一眼 hero 和侧栏。
"""

import pathlib
import sys
import urllib.parse
import urllib.request

FAMILY = "Ma Shan Zheng"
OUT = (
    pathlib.Path(__file__).resolve().parent.parent
    / "apps/canvas-web/public/fonts/mashanzheng-subset.woff2"
)

# 当前用到的 + 预留的。宁可多几百字节，不要缺一个字。
CHARS = (
    "蒜狸小助手光谷爱计算"    # 品牌名（旧名留着：万一哪里漏改，掉字体比掉字好认）
    "说一句话剩下的交给蒜狸"  # 副标题
    "创作项目库画布开始新建未分组"  # 侧栏和按钮
    "，。、：；！？（）「」…—"      # 标点
)

# Google Fonts 会按 UA 决定回 woff2 还是 ttf。不带 UA 时它回的是 ttf，
# 大三倍。
UA = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120 Safari/537.36"
    )
}


def main() -> int:
    text = "".join(dict.fromkeys(CHARS))  # 去重但保持顺序，便于 diff
    q = (
        f"https://fonts.googleapis.com/css2?family={urllib.parse.quote_plus(FAMILY)}"
        f"&text={urllib.parse.quote(text)}"
    )
    css = urllib.request.urlopen(urllib.request.Request(q, headers=UA), timeout=30)
    css = css.read().decode()
    start = css.find("url(") + 4
    url = css[start : css.index(")", start)]
    if not url.startswith("https://fonts.gstatic.com/"):
        print(f"返回的不是 gstatic 地址，拒绝下载：{url[:80]}", file=sys.stderr)
        return 1
    data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(data)
    print(f"{OUT.name}  {len(data)} 字节  {len(text)} 个字")
    return 0


if __name__ == "__main__":
    sys.exit(main())
