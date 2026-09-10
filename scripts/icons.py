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
    """只画标本身，透明底。"""
    W = size * SS
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    k = W / box
    for color, pts in shapes:
        dr.polygon([tuple(p * k) for p in pts], fill=color)
    return img.resize((size, size), Image.LANCZOS)


# ---------------------------------------------------------------------------
# 应用图标
#
# 标本身是个铺满画布的正圆。**直接拿它当应用图标是不对的** —— macOS 的图标
# 是有底板的，Dock 里一排方角圆角的图标中间夹一个裸圆，看起来像贴纸而不像
# 应用。
#
# 苹果 Big Sur 之后的网格：1024 的画布里放一个 824 的圆角方形，四边各留
# 100px。那 100px 不是装饰 —— Dock 放大、Launchpad 的投影、通知角标都按这个
# 边界算，铺满画布的图标在这些地方会被裁掉一圈。
# ---------------------------------------------------------------------------

CANVAS = 1024
PLATE = 824          # 苹果网格里图标底板的边长
MARK = 560           # 标在底板里再内缩一圈，留出光学边距
# 底板配色：深灰渐变。**不是白也不是品牌蓝** ——
# 白底会让标中间那道白色镂空和底板连成一片，小尺寸下那道缝直接消失；
# 纯蓝底就得把标改成单色白，而绿色是这个标一半的辨识度。
PLATE_TOP = (44, 52, 62)
PLATE_BOTTOM = (24, 29, 36)
# 超椭圆指数。苹果用的是连续圆角（squircle）不是普通圆角矩形，
# n=5 和它几乎重合；用 rounded_rectangle 的话四角会明显更"方"。
SQUIRCLE_N = 5.0


def squircle_alpha(size):
    """超椭圆遮罩。`|x|^n + |y|^n <= 1`，超采样后缩回去做抗锯齿。"""
    W = size * SS
    y, x = np.mgrid[0:W, 0:W]
    c = (W - 1) / 2
    u = np.abs((x - c) / (W / 2))
    v = np.abs((y - c) / (W / 2))
    mask = (u**SQUIRCLE_N + v**SQUIRCLE_N) <= 1.0
    return Image.fromarray((mask * 255).astype(np.uint8), "L").resize(
        (size, size), Image.LANCZOS
    )


# 小尺寸下的比例。
#
# **不能所有档位共用一套比例。** 苹果那 100px 边距在 1024 上是呼吸空间，
# 缩到 16px 只剩 1.6px —— 毫无观感收益，却让标只剩 9px，糊成一团色块。
# 实测 16 和 32 都到了认不出的程度。
#
# 所以小尺寸收边距：底板几乎铺满，标跟着放大。128 以上回到苹果网格 ——
# 那些档位（Dock、Launchpad、访达大图标）留白是有用的。
SMALL_PLATE, SMALL_MARK = 0.94, 0.78
SMALL_AT, FULL_AT = 32, 128


def _ratios(size):
    """这个尺寸该用多大的底板和标。32→128 之间线性过渡，避免出现明显的跳档。"""
    big = (PLATE / CANVAS, MARK / CANVAS)
    if size <= SMALL_AT:
        return SMALL_PLATE, SMALL_MARK
    if size >= FULL_AT:
        return big
    t = (size - SMALL_AT) / (FULL_AT - SMALL_AT)
    return (
        SMALL_PLATE + (big[0] - SMALL_PLATE) * t,
        SMALL_MARK + (big[1] - SMALL_MARK) * t,
    )


def app_icon(shapes, box, size):
    """带底板的应用图标。"""
    pr, mr = _ratios(size)
    plate_px = round(size * pr)
    mark_px = round(size * mr)

    grad = Image.new("RGBA", (1, plate_px))
    for i in range(plate_px):
        t = i / max(plate_px - 1, 1)
        grad.putpixel(
            (0, i),
            tuple(
                round(PLATE_TOP[j] + (PLATE_BOTTOM[j] - PLATE_TOP[j]) * t)
                for j in range(3)
            )
            + (255,),
        )
    plate = grad.resize((plate_px, plate_px), Image.BILINEAR)
    plate.putalpha(squircle_alpha(plate_px))

    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.alpha_composite(plate, ((size - plate_px) // 2,) * 2)
    out.alpha_composite(render(shapes, box, mark_px), ((size - mark_px) // 2,) * 2)
    return out


def main():
    text = SVG.read_text(encoding="utf8")
    box = float(re.search(r'viewBox="0 0 (\d+)', text).group(1))
    shapes = parse(text)
    print(f"{SVG.relative_to(ROOT)}  {len(shapes)} 个形状  viewBox {box:.0f}")

    # 前端那份**不带底板**：它出现在浏览器标签页和应用顶栏里，
    # 那两个地方本来就是内容区，套一块深色板子会像贴了张纸。
    web = ROOT / "apps/canvas-web/public/logo.png"
    render(shapes, box, 512).save(web)
    print(f"  {web.relative_to(ROOT)}  512（裸标，无底板）")

    ico = ROOT / "assets/icon.ico"
    app_icon(shapes, box, 256).save(ico, sizes=[(s, s) for s in ICO_SIZES])
    print(f"  {ico.relative_to(ROOT)}  {ICO_SIZES}")

    # Tauri 按 tauri.conf.json 的 bundle.icon 取这几个文件。
    # 少一个 `tauri build` 会直接失败，多的没人用但留着也不碍事。
    tdir = ROOT / "apps/desktop/icons"
    tdir.mkdir(parents=True, exist_ok=True)
    for name, px in [
        ("32x32.png", 32),
        ("128x128.png", 128),
        ("128x128@2x.png", 256),
        ("256x256.png", 256),
        ("512x512.png", 512),
    ]:
        app_icon(shapes, box, px).save(tdir / name)
    print(f"  {tdir.relative_to(ROOT)}/  32 / 128 / 128@2x / 256 / 512")

    if not shutil.which("iconutil"):
        print("  跳过 .icns（没有 iconutil，只有 macOS 才有）")
        return 0
    with tempfile.TemporaryDirectory() as td:
        s = Path(td) / "icon.iconset"
        s.mkdir()
        for base, scale in ICNS:
            suffix = "" if scale == 1 else "@2x"
            app_icon(shapes, box, base * scale).save(s / f"icon_{base}x{base}{suffix}.png")
        icns = ROOT / "assets/icon.icns"
        subprocess.run(["iconutil", "-c", "icns", str(s), "-o", str(icns)], check=True)
        print(f"  {icns.relative_to(ROOT)}  {icns.stat().st_size / 1024:.0f} KB")
    # 桌面端那份就是 assets 里这两个，复制过去而不是各生成一次 ——
    # 两处独立生成的话，改了配色只更新其中一处不会有任何提示。
    for src, dst in [("assets/icon.icns", "icon.icns"), ("assets/icon.ico", "icon.ico")]:
        shutil.copyfile(ROOT / src, tdir / dst)
    print(f"  {tdir.relative_to(ROOT)}/  icon.icns + icon.ico（从 assets/ 复制）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
