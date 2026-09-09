"""按首页预设的提示词，生成一套固定封面。

**跑一次就够，产物提交进仓库。** 之前试过两条路都不行：
  - 官方那些 MV 封面不在应用包里（只有托盘图标），是运行时从他们的推荐
    服务拉的；而且题材也对不上——卡片写"暖光台灯"配一个说唱 MV 更糟。
  - 拿用户自己生成的结果当封面不稳定：换台机器、清了工作区就没了，
    而首页应该是确定的。

封面用 3:4，和卡片的 aspect-[3/4] 一致，不用再裁。
"""
import json, pathlib, subprocess, sys, time, urllib.request

GW = "http://127.0.0.1:8100"
OUT = pathlib.Path("apps/canvas-web/public/covers")
PRESETS = [
    ("still-lamp", "一盏黄铜台灯放在旧木桌上，暖光，静物摄影，浅景深，柔和阴影"),
    ("still-ceramic", "一只手工陶罐，米白背景，侧逆光拉出长影子，极简，静物摄影"),
    ("portrait-studio", "棚拍人像，单灯硬光，深灰背景，轻微胶片颗粒，35mm"),
    ("scene-street", "雨后的城市街道，夜晚，霓虹在湿地面上的倒影，电影感构图"),
    ("scene-interior", "清晨的室内，阳光从百叶窗斜射进来，空气中可见尘埃，安静"),
    ("video-corgi", "一只柯基在落叶铺满的小路上奔跑，跟拍镜头，浅景深"),
    ("music-lofi", "lo-fi 风格插画：夜晚书桌，台灯、耳机、窗外城市灯火，暖色"),
    ("music-rap", "舞台灯光下的麦克风特写，冷蓝调，烟雾，低角度"),
]

def req(path, body=None):
    r = urllib.request.Request(
        GW + path,
        data=json.dumps(body).encode() if body else None,
        headers={"content-type": "application/json"},
    )
    return json.load(urllib.request.urlopen(r, timeout=30))

def one(pid, prompt):
    dst = OUT / f"{pid}.webp"
    if dst.exists():
        print(f"  {pid:16} 已有，跳过")
        return
    t = req("/api/generate/image/submit",
            {"prompt": prompt, "params": {"aspect_ratio": "3:4", "resolution": "1K"}})["task_id"]
    for _ in range(60):
        time.sleep(3)
        s = req(f"/api/generate/tasks/{t}/query")
        if s["status"] in ("succeeded", "failed"):
            break
    if s["status"] != "succeeded":
        print(f"  {pid:16} 失败: {s.get('error')}")
        return
    path = s["result"]["path"]
    raw = urllib.request.urlopen(f"{GW}/files/{path}", timeout=60).read()
    tmp = OUT / f"{pid}.png"
    tmp.write_bytes(raw)
    # 压成 webp。卡片最宽也就 190px，存 512 够两倍屏用，再大是浪费仓库体积。
    from PIL import Image
    im = Image.open(tmp).convert("RGB")
    im.thumbnail((512, 512), Image.LANCZOS)
    im.save(dst, "WEBP", quality=82, method=6)
    tmp.unlink()
    print(f"  {pid:16} {dst.stat().st_size // 1024} KB  {im.size[0]}x{im.size[1]}")

OUT.mkdir(parents=True, exist_ok=True)
for pid, prompt in PRESETS:
    one(pid, prompt)
print("\n合计", sum(f.stat().st_size for f in OUT.glob("*.webp")) // 1024, "KB")
