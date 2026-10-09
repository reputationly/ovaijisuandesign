#!/usr/bin/env python3
"""从蒜狸形象生成桌面端的 app 图标。

    python3 scripts/app-icon.py                  # 默认：蒜皮紫圆角底板
    python3 scripts/app-icon.py --bg "#8FAF7F"   # 换底板颜色
    python3 scripts/app-icon.py --bare           # 不要底板（透明底）

产物（提交进仓库，构建机上不需要 Pillow / iconutil）：

    app/desktop/resources/icon.png   1024  母图，另两份都从它出
    app/desktop/resources/icon.icns  macOS，档位见 ICNS
    app/desktop/resources/icon.ico   Windows，内含 16~256 七档

## 为什么要有这个脚本

`electron-builder` 的图标是**自动查找**的，只找 `build/` 目录。而这个仓库的图标一直在
`app/desktop/resources/` —— 于是它一声不吭地用了 Electron 的默认图标，构建日志里只有
一行 `default Electron icon is used`。出包时没人盯那行，装完在 Dock 里看见个 Electron
才想起来。所以这里除了生成，还要在 `electron-builder.yml` 里把 `mac.icon` / `win.icon`
**写死**，让路径显式出现在配置里，不再靠猜目录。

## 为什么默认带一块彩色底板

蒜狸本体是奶油色 + 细黑描边，直接铺在透明底上：浅色桌面（访达、资源管理器）里身体和
背景糊在一起，深色菜单栏里描边又消失 —— 实测缩到 32px 就只剩一团浅色，16px 完全不可认。
垫一块不透明的圆角方片同时解决两件事：任何桌面主题下都有对比，而且这才是一颗系统图标
该有的样子（苹果的图标本来就都是整幅铺满的）。底板取**蒜皮紫**，和奶油身体分离度最好，
又扣「蒜」这个题。嫌紫的换 `--bg`，想回到裸形象 `--bare`。

## 小尺寸另做一版裁切

形象本身细节多（胡须、条纹、耳朵内衬），整只缩到 16px 一定糊。所以 ≤`FACE_BELOW` 的档位
不按整只裁，而是先框住上半张脸再放大 —— 小图标只保住「一张脸」这个信息量，认得出。
这几个比例是照着这张图调的，**换了源图要重看**（和 `scripts/icons.py` 只服务
`assets/logo.svg` 是同一个道理）。

## 分辨率

源图只有 512，而 icns 的 `512@2x` 档要 1024，这里做了一次 LANCZOS 放大。可接受是因为
它是贴纸式平涂，没有细线条和渐变，放大不出痕迹；要真出 1024 原图得重画矢量。
"""

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "app/desktop/src/renderer/public/mascot.png"
OUT_DIR = ROOT / "app/desktop/resources"
MASTER = 1024

DEFAULT_BG = "#B79CD8"  # 蒜皮紫
COVER = 0.90            # 形象占底板的比例
RADIUS = 0.2237         # 底板圆角，按苹果 squircle 的观感取，犯不上画超椭圆

# 小档位改成「只框脸」：竖直方向留上沿到嘴、水平方向留两颊胡须根。
FACE_BELOW = 48
FACE_BOX = (0.20, 0.06, 0.80, 0.72)  # 相对包围盒的 (左, 上, 右, 下)
FACE_COVER = 0.98

# 和 scripts/icons.py 同一套档位：ico 缺档 Windows 会拿最近的缩，缩出来发糊；
# icns 的档位是苹果定死的，多一档少一档 iconutil 都会拒绝整包。
ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
ICNS = [(16, 1), (16, 2), (32, 1), (32, 2), (128, 1), (128, 2),
        (256, 1), (256, 2), (512, 1), (512, 2)]


def art_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    """按不透明像素裁 —— 源图的画布本来就比形象大一圈，照画布留边会双重缩小。"""
    box = img.split()[3].getbbox()
    if box is None:
        sys.exit(f"{SRC} 全透明，检查一下文件")
    return box


def render(px: int, bg: tuple[int, int, int, int] | None, face: bool) -> Image.Image:
    """→ px×px 的一档。"""
    art = Image.open(SRC).convert("RGBA")
    l, t, r, b = art_bbox(art)
    if face:
        w, h = r - l, b - t
        art = art.crop((l + int(w * FACE_BOX[0]), t + int(h * FACE_BOX[1]),
                        l + int(w * FACE_BOX[2]), t + int(h * FACE_BOX[3])))
    else:
        art = art.crop((l, t, r, b))

    cover = FACE_COVER if face else COVER
    box = int(px * cover)
    # 等比放进来，取更紧的那一边 —— 形象不是正方形也不能拉变形。
    scale = min(box / art.width, box / art.height)
    art = art.resize((max(1, round(art.width * scale)), max(1, round(art.height * scale))), Image.LANCZOS)

    canvas = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    if bg is not None:
        mask = Image.new("L", (px, px), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, px - 1, px - 1], radius=max(1, int(px * RADIUS)), fill=255)
        canvas.paste(Image.new("RGBA", (px, px), bg), (0, 0), mask)
    canvas.alpha_composite(art, ((px - art.width) // 2, (px - art.height) // 2))
    return canvas


def parse_bg(s: str) -> tuple[int, int, int, int]:
    h = s.lstrip("#")
    if len(h) != 6 or any(c not in "0123456789abcdefABCDEF" for c in h):
        sys.exit(f"颜色要写成 #RRGGBB，收到的是 {s!r}")
    return (*[int(h[i:i + 2], 16) for i in (0, 2, 4)], 255)


def save_ico(path: Path, frames: list[Image.Image]) -> None:
    """手写 .ico —— Pillow 那条路走不通。

    `im.save(fp, sizes=[...])` 只会拿一张图逐档 resize，做不到「小档换裁切」；而
    `append_images` 对 ICO 根本不生效（实测七个档只剩一条 16px，Windows 上就会到处拉伸
    这一张）。也不想用 PNG 压缩的 entry：electron-builder 改 exe 图标走 resedit/rcedit
    那条链，喂 BMP(DIB) 是最没悬念的写法。

    格式本身不复杂：头部 + 每项一条目录 + 每项一段 DIB。DIB 的高度写两倍（下面那半是
    AND 掩码），32 位色带 alpha 时掩码全 0 就行，行要补齐到 4 字节。
    """
    import struct

    bodies: list[bytes] = []
    for img in frames:
        w, h = img.size
        px = img.convert("RGBA")
        xor = bytearray()
        for y in range(h - 1, -1, -1):  # DIB 是自底向上
            for x in range(w):
                r, g, b, a = px.getpixel((x, y))
                xor += bytes((b, g, r, a))
        mask_row = ((w + 31) // 32) * 4
        mask = bytes(mask_row * h)  # 全 0：透明交给 alpha
        header = struct.pack("<IiiHHIIiiII", 40, w, h * 2, 1, 32, 0, len(xor) + len(mask), 0, 0, 0, 0)
        bodies.append(header + bytes(xor) + mask)

    out = bytearray(struct.pack("<HHH", 0, 1, len(bodies)))
    offset = 6 + 16 * len(bodies)
    for img, body in zip(frames, bodies):
        w, h = img.size
        # 256 在目录里写成 0（一个字节放不下）。
        out += struct.pack("<BBBBHHII", w & 0xFF, h & 0xFF, 0, 0, 1, 32, len(body), offset)
        offset += len(body)
    out += b"".join(bodies)
    path.write_bytes(bytes(out))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--bg", default=DEFAULT_BG, help=f"底板颜色，默认 {DEFAULT_BG}")
    ap.add_argument("--bare", action="store_true", help="不垫底板，透明底")
    args = ap.parse_args()
    if not SRC.exists():
        sys.exit(f"找不到形象源图：{SRC.relative_to(ROOT)}")
    if not OUT_DIR.exists():
        sys.exit(f"输出目录不存在：{OUT_DIR.relative_to(ROOT)}")
    bg = None if args.bare else parse_bg(args.bg)

    # 母图：大的那几档用它，一次放大到位比分档各自从 512 缩要稳。
    master = render(MASTER, bg, face=False)
    png = OUT_DIR / "icon.png"
    master.save(png)
    print(f"  {png.relative_to(ROOT)}  {MASTER}×{MASTER}"
          f"{'（透明底）' if bg is None else f'（{args.bg} 底板）'}")

    ico = OUT_DIR / "icon.ico"
    # 逐档单独画，而不是拿母图缩 —— 小档要换裁切。
    frames = [render(s, bg, face=s < FACE_BELOW) for s in ICO_SIZES]
    save_ico(ico, frames)
    print(f"  {ico.relative_to(ROOT)}  {ICO_SIZES}（<{FACE_BELOW}px 用脸部裁切）")

    if not shutil.which("iconutil"):
        # 不是 macOS 就到此为止：icns 是既有的提交产物，别让别的平台把它删了。
        print("  跳过 .icns（没有 iconutil，只有 macOS 才有）")
        return 0
    with tempfile.TemporaryDirectory() as td:
        s = Path(td) / "icon.iconset"
        s.mkdir()
        for base, scale in ICNS:
            px = base * scale
            suffix = "" if scale == 1 else "@2x"
            render(px, bg, face=px < FACE_BELOW).save(s / f"icon_{base}x{base}{suffix}.png")
        icns = OUT_DIR / "icon.icns"
        subprocess.run(["iconutil", "-c", "icns", str(s), "-o", str(icns)], check=True)
        print(f"  {icns.relative_to(ROOT)}  {icns.stat().st_size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
