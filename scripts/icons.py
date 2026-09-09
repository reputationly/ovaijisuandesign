#!/usr/bin/env python3
"""从 assets/logo.svg 生成各平台的图标。

    python3 scripts/icons.py

产物（都提交进仓库，构建时不需要任何图形工具链）：

    apps/canvas-web/public/logo.png   512   前端 favicon + 顶栏
    assets/icon.ico                   Windows，内含 16~256 七档
    assets/icon.icns                  macOS，内含 16~1024（需要 iconutil）

## 为什么自己写光栅化

机器上没有 potrace / inkscape / imagemagick / cairosvg，装一套只为了出几个
图标不划算。这里只实现 `logo.svg` 真正用到的那点子集：`M` / `L` /
`A`（正圆弧）/ `Z`，填充规则按非零。**换了 SVG 就未必还能解析** ——
它不是通用渲染器，只是和 `assets/logo.svg` 配套的那一半。

抗锯齿靠 4 倍超采样后 LANCZOS 缩回去，比自己写覆盖率积分省事且够用。
"""

import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SVG = ROOT / "assets" / "logo.svg"
SS = 4  # 超采样倍数

# .ico 里放哪些尺寸。Windows 在不同位置取不同档：任务栏 32、桌面大图标 96、
# 资源管理器超大图标 256。缺档时系统会拿最近的缩，缩出来发糊。
ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
# .icns 的档位是苹果定死的，多一档少一档 iconutil 都会拒绝整包。
ICNS = [(16, 1), (16, 2), (32, 1), (32, 2), (128, 1), (128, 2),
        (256, 1), (256, 2), (512, 1), (512, 2)]


def parse(svg_text):
    """→ [(颜色, [顶点…])]。只认 M/L/A/Z。"""
    out = []
    for color, d in re.findall(r'fill="(#[0-9a-fA-F]{6})"\s+d="([^"]+)"', svg_text):
        pts, cur = [], np.zeros(2)
        for cmd, arg in re.findall(r"([MLAZ])([^MLAZ]*)", d):
            v = [float(x) for x in arg.replace(",", " ").split()] if arg.strip() else []
            if cmd in "ML":
                cur = np.array(v[:2])
                pts.append(cur.copy())
            elif cmd == "A":
                r, large, sweep = v[0], int(v[3]), int(v[4])
                a, b = cur, np.array(v[5:7])
                # 由「两端点 + 半径 + large/sweep 两个标志」反解圆心：
                # 弦的中垂线上有两个候选，取和标志一致的那个。
                m, dv = (a + b) / 2, b - a
                L = float(np.hypot(*dv))
                h = np.sqrt(max(r * r - (L / 2) ** 2, 0))
                n = np.array([-dv[1], dv[0]]) / L
                for c in (m + n * h, m - n * h):
                    t0 = np.arctan2(a[1] - c[1], a[0] - c[0])
                    t1 = np.arctan2(b[1] - c[1], b[0] - c[0])
                    dd = (t1 - t0) % (2 * np.pi)
                    if sweep == 0:
                        dd -= 2 * np.pi
                    if (abs(dd) > np.pi) == bool(large):
                        break
                k = max(2, int(abs(dd) * r / 0.5))
                t = t0 + np.linspace(0, dd, k)
                pts += list(c + np.c_[np.cos(t), np.sin(t)] * r)
                cur = b
        out.append((color, pts))
    return out


def render(shapes, box, size):
    W = size * SS
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    k = W / box
    for color, pts in shapes:
        dr.polygon([tuple(p * k) for p in pts], fill=color)
    return img.resize((size, size), Image.LANCZOS)


def main():
    text = SVG.read_text(encoding="utf8")
    box = float(re.search(r'viewBox="0 0 (\d+)', text).group(1))
    shapes = parse(text)
    print(f"{SVG.relative_to(ROOT)}  {len(shapes)} 个形状  viewBox {box:.0f}")

    web = ROOT / "apps/canvas-web/public/logo.png"
    render(shapes, box, 512).save(web)
    print(f"  {web.relative_to(ROOT)}  512")

    ico = ROOT / "assets/icon.ico"
    render(shapes, box, 256).save(ico, sizes=[(s, s) for s in ICO_SIZES])
    print(f"  {ico.relative_to(ROOT)}  {ICO_SIZES}")

    if not shutil.which("iconutil"):
        print("  跳过 .icns（没有 iconutil，只有 macOS 才有）")
        return 0
    with tempfile.TemporaryDirectory() as td:
        s = Path(td) / "icon.iconset"
        s.mkdir()
        for base, scale in ICNS:
            suffix = "" if scale == 1 else "@2x"
            render(shapes, box, base * scale).save(s / f"icon_{base}x{base}{suffix}.png")
        icns = ROOT / "assets/icon.icns"
        subprocess.run(["iconutil", "-c", "icns", str(s), "-o", str(icns)], check=True)
        print(f"  {icns.relative_to(ROOT)}  {icns.stat().st_size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
