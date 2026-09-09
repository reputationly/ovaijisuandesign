#!/usr/bin/env python3
"""构建、打包、发布。

    python3 scripts/release.py                    # 只打包，产物在 dist/
    python3 scripts/release.py --publish          # 打包并上传（需要凭据）

设计照抄官方那套按需下载的运行时（`bundled-plugins/comfyui/hub/backend-bundle.json`），
不是 velopack —— 我们不是 Electron 应用，要发的是一个 Rust 二进制 + 一份静态
产物 + 一个 JS 包。四条可抄的：

  两层间接    清单里只放 latest.json 的地址，真包地址在 latest.json 里
  包不可变    按版本存死，latest.json 才是可变的那一个
  双源校验    两个源都验完，latest 才翻指针
  目标细分    darwin-arm64 而不是 macos

详见 docs/distribution.md。
"""

import argparse
import hashlib
import json
import os
import platform
import shutil
import subprocess
import sys
import tarfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

# 发布源。两个都发，都验完才翻 latest。
# 值是 S3 兼容的 endpoint —— R2 和 OBS 都支持 S3 API，所以上传是同一段代码。
SOURCES = {
    "r2": {"endpoint": "OVAIJISUAN_R2_ENDPOINT", "bucket": "OVAIJISUAN_R2_BUCKET"},
    "obs": {"endpoint": "OVAIJISUAN_OBS_ENDPOINT", "bucket": "OVAIJISUAN_OBS_BUCKET"},
}


def host_target() -> str:
    """当前机器的目标标识。

    细到架构，不是只到 OS —— 官方就是 `darwin-arm64` /
    `win32-x64-nvidia-cuda12` 这种粒度。将来出别的架构不用改协议。
    """
    system = {"Darwin": "darwin", "Windows": "win32", "Linux": "linux"}.get(
        platform.system(), platform.system().lower()
    )
    machine = {"arm64": "arm64", "aarch64": "arm64", "x86_64": "x64", "AMD64": "x64"}.get(
        platform.machine(), platform.machine()
    )
    return f"{system}-{machine}"


def version() -> str:
    """版本号取自 workspace 的 Cargo.toml，单一来源。"""
    for line in (ROOT / "Cargo.toml").read_text(encoding="utf8").splitlines():
        if line.startswith("version = "):
            return line.split('"')[1]
    raise SystemExit("Cargo.toml 里找不到 version")


def run(cmd: list[str], cwd: Path = ROOT) -> None:
    print(f"  $ {' '.join(cmd)}")
    subprocess.run(cmd, cwd=cwd, check=True)


# 目标 → Rust 的 target triple。只在需要交叉编译时用得上。
#
# macOS 上 arm64 ⇄ x86_64 是能交叉的（Xcode 自带两个 SDK，连 ring 的 C 代码
# 都能过），所以**两个 mac 架构一台 runner 就能出** —— 私仓的 Actions 配额里
# macOS 是 10 倍计费，省下一台是实打实的。
#
# 别的方向交叉不了：rustls 依赖 ring，那是 C 代码，要目标平台的 SDK 头文件。
RUST_TRIPLES = {
    "darwin-arm64": "aarch64-apple-darwin",
    "darwin-x64": "x86_64-apple-darwin",
    "win32-x64": "x86_64-pc-windows-msvc",
    "linux-x64": "x86_64-unknown-linux-gnu",
}


def build(target: str, cross: bool = False) -> Path:
    """构建三块产物，摆成发布包的形态。

    ```text
    ovgw / ovagent      Rust 二进制
    web/                canvas-web 的静态产物
    mcp/main.js         bun build 出来的单文件（不需要 node_modules）
    ```

    `cross=True` 时显式指定 `--target`，产物落在
    `target/<triple>/release/` 而不是 `target/release/`。
    """
    stage = DIST / "stage" / target
    shutil.rmtree(stage, ignore_errors=True)
    stage.mkdir(parents=True)

    print("构建 Rust")
    cmd = ["cargo", "build", "--release", "-p", "gateway"]
    bin_dir = ROOT / "target/release"
    if cross:
        triple = RUST_TRIPLES.get(target)
        if not triple:
            raise SystemExit(f"不认识的目标 {target}，没法交叉编译")
        cmd += ["--target", triple]
        bin_dir = ROOT / "target" / triple / "release"
    run(cmd)
    exe = ".exe" if target.startswith("win32") else ""
    for name in ("ovgw", "ovagent"):
        src = bin_dir / f"{name}{exe}"
        if not src.is_file():
            raise SystemExit(f"缺产物: {src}")
        shutil.copy2(src, stage / f"{name}{exe}")
        (stage / f"{name}{exe}").chmod(0o755)

    print("构建画布前端")
    run(["bun", "install", "--frozen-lockfile"], ROOT / "apps/canvas-web")
    run(["bun", "run", "build"], ROOT / "apps/canvas-web")
    shutil.copytree(ROOT / "apps/canvas-web/dist", stage / "web")

    print("打包 MCP server")
    run(["bun", "install", "--frozen-lockfile"], ROOT / "mcp")
    (stage / "mcp").mkdir()
    run(
        ["bun", "build", "src/main.ts", "--target=bun", "--outfile", str(stage / "mcp/main.js")],
        ROOT / "mcp",
    )
    return stage


def pack(stage: Path, ver: str, target: str) -> tuple[Path, str]:
    """打成 tar.gz，返回路径和 sha256。

    **包名带 sha** 且按版本存死：`latest.json` 才是可变的那一个，
    包本身不可变 —— 覆盖发布会让回滚变成"再发一次旧版"，而那时候手上
    未必还有旧产物。
    """
    out_dir = DIST / ver / target
    out_dir.mkdir(parents=True, exist_ok=True)
    tmp = out_dir / "bundle.tar.gz"
    with tarfile.open(tmp, "w:gz") as tar:
        for item in sorted(stage.iterdir()):
            tar.add(item, arcname=item.name)

    digest = hashlib.sha256(tmp.read_bytes()).hexdigest()
    final = out_dir / f"{digest}.tar.gz"
    tmp.replace(final)
    return final, digest


def write_manifests(ver: str, target: str, bundle: Path, digest: str, base: str) -> None:
    latest = {
        "version": ver,
        "url": f"{base}/{ver}/{target}/{digest}.tar.gz",
        "sha256": digest,
        "size": bundle.stat().st_size,
        "releasedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    (DIST / target / "latest.json").parent.mkdir(parents=True, exist_ok=True)
    (DIST / target / "latest.json").write_text(
        json.dumps(latest, indent=2, ensure_ascii=False) + "\n", encoding="utf8"
    )

    # 客户端只知道 manifest.json 这一个地址，真包地址在 latest.json 里。
    # 发新版只改一个小 JSON。
    manifest_path = DIST / "manifest.json"
    manifest = (
        json.loads(manifest_path.read_text(encoding="utf8"))
        if manifest_path.is_file()
        else {"schemaVersion": 1, "targets": {}}
    )
    manifest["targets"][target] = {
        "status": "published",
        "latestUrls": {name: f"{base}/{target}/latest.json" for name in SOURCES},
    }
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf8"
    )


# 所有 S3 key 的前缀。空跑时是 `dry-run/`，生产是空串。
# **必须和写进 latest.json 的 base 地址一致** —— 对象传到了 dry-run/ 而 URL
# 写成生产路径的话，回读校验必然 404，而"上传成功"的日志会让人往别处查。
PREFIX = ""


def s3_upload(source: str, local: Path, key: str) -> None:
    env = SOURCES[source]
    endpoint, bucket = os.environ.get(env["endpoint"]), os.environ.get(env["bucket"])
    if not endpoint or not bucket:
        raise SystemExit(f"{source} 缺配置：需要 {env['endpoint']} 和 {env['bucket']}")
    run(
        [
            "aws", "s3", "cp", str(local), f"s3://{bucket}/{PREFIX}{key}",
            "--endpoint-url", endpoint,
        ]
    )


def discover(ver: str) -> list[tuple[str, Path, str]]:
    """从 `dist/` 里找出所有已打好的目标。

    CI 上各平台各自打包、上传成 artifact，最后由一个 job 汇总下载到 `dist/`
    再统一发布 —— 所以这里要能认出"别人打的包"。
    """
    found = []
    version_dir = DIST / ver
    if not version_dir.is_dir():
        return found
    for target_dir in sorted(version_dir.iterdir()):
        if not target_dir.is_dir():
            continue
        bundles = list(target_dir.glob("*.tar.gz"))
        if len(bundles) != 1:
            raise SystemExit(f"{target_dir} 里有 {len(bundles)} 个包，期望正好 1 个")
        found.append((target_dir.name, bundles[0], bundles[0].stem.replace(".tar", "")))
    return found


def publish(ver: str, targets: list[tuple[str, Path, str]]) -> None:
    """先把不可变的包发到两个源、都校验通过，最后才翻 latest 指针。

    顺序反了的话会出现"latest 指向一个某个区下不到的包"——用户看到的是
    升级失败，而两边的对象存储各自都"正常"。

    **所有目标一起翻指针**，不是打一个发一个：中途失败的话，已翻的那些
    目标会指向新版、没翻的还是旧版，用户装到的版本取决于他用什么系统。
    """
    for target, bundle, digest in targets:
        key = f"{ver}/{target}/{digest}.tar.gz"
        for source in SOURCES:
            print(f"上传 {target} → {source}")
            s3_upload(source, bundle, key)

    for target, _, digest in targets:
        key = f"{ver}/{target}/{digest}.tar.gz"
        for source in SOURCES:
            print(f"校验 {target} @ {source}")
            verify(source, key, digest)

    for target, _, _ in targets:
        for source in SOURCES:
            print(f"翻 {target} @ {source} 的 latest 指针")
            s3_upload(source, DIST / target / "latest.json", f"{target}/latest.json")
    for source in SOURCES:
        s3_upload(source, DIST / "manifest.json", "manifest.json")


def verify(source: str, key: str, digest: str) -> None:
    """回读校验。**不是可选步骤** —— 传完就翻指针的话，一次半截的上传
    会让所有客户端升级到一个下不完的包。"""
    env = SOURCES[source]
    endpoint, bucket = os.environ[env["endpoint"]], os.environ[env["bucket"]]
    tmp = DIST / "verify.tmp"
    run(["aws", "s3", "cp", f"s3://{bucket}/{PREFIX}{key}", str(tmp), "--endpoint-url", endpoint])
    actual = hashlib.sha256(tmp.read_bytes()).hexdigest()
    tmp.unlink(missing_ok=True)
    if actual != digest:
        raise SystemExit(f"{source} 上的包哈希对不上：期望 {digest}，实际 {actual}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", default=host_target())
    ap.add_argument(
        "--cross",
        action="store_true",
        help="显式指定 --target 交叉编译。macOS 上出另一个架构时用",
    )
    ap.add_argument(
        "--base",
        default=os.environ.get("OVAIJISUAN_RELEASE_BASE", "https://example.invalid/release"),
        help="包的公开基地址，写进 latest.json",
    )
    ap.add_argument("--publish", action="store_true", help="上传（需要 aws cli 和凭据）")
    ap.add_argument(
        "--prefix",
        default=os.environ.get("OVAIJISUAN_RELEASE_PREFIX", ""),
        help="所有 S3 key 的前缀。空跑用 dry-run/，不碰生产清单",
    )
    ap.add_argument(
        "--publish-only",
        action="store_true",
        help="不构建，只发布 dist/ 里已有的包（CI 上各平台分别打包后汇总用）",
    )
    args = ap.parse_args()

    global PREFIX
    PREFIX = args.prefix
    ver = version()

    if args.publish_only:
        targets = discover(ver)
        if not targets:
            raise SystemExit(f"dist/{ver}/ 下没有任何包")
        print(f"版本 {ver}，待发布 {len(targets)} 个目标：")
        for t, b, d in targets:
            print(f"  {t:16} {b.stat().st_size / 1_048_576:5.1f} MB  {d[:16]}…")
        publish(ver, targets)
        print("\n已发布")
        return 0

    target = args.target
    print(f"版本 {ver}  目标 {target}\n")

    stage = build(target, cross=args.cross)
    bundle, digest = pack(stage, ver, target)
    write_manifests(ver, target, bundle, digest, args.base)

    size_mb = bundle.stat().st_size / 1_048_576
    print(f"\n包    {bundle.relative_to(ROOT)}  ({size_mb:.1f} MB)")
    print(f"sha256 {digest}")
    print(f"清单  {(DIST / 'manifest.json').relative_to(ROOT)}")

    if args.publish:
        publish(ver, [(target, bundle, digest)])
        print("\n已发布")
    else:
        print("\n（没有 --publish，只打了包）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
