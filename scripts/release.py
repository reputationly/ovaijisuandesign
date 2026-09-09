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


def build(target: str) -> Path:
    """构建三块产物，摆成发布包的形态。

    ```text
    ovgw / ovagent      Rust 二进制
    web/                canvas-web 的静态产物
    mcp/main.js         bun build 出来的单文件（不需要 node_modules）
    ```
    """
    stage = DIST / "stage" / target
    shutil.rmtree(stage, ignore_errors=True)
    stage.mkdir(parents=True)

    print("构建 Rust")
    run(["cargo", "build", "--release", "-p", "gateway"])
    exe = ".exe" if target.startswith("win32") else ""
    for name in ("ovgw", "ovagent"):
        src = ROOT / "target/release" / f"{name}{exe}"
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


def s3_upload(source: str, local: Path, key: str) -> None:
    env = SOURCES[source]
    endpoint, bucket = os.environ.get(env["endpoint"]), os.environ.get(env["bucket"])
    if not endpoint or not bucket:
        raise SystemExit(f"{source} 缺配置：需要 {env['endpoint']} 和 {env['bucket']}")
    run(
        [
            "aws", "s3", "cp", str(local), f"s3://{bucket}/{key}",
            "--endpoint-url", endpoint,
        ]
    )


def publish(ver: str, target: str, bundle: Path, digest: str) -> None:
    """先把不可变的包发到两个源、都校验通过，最后才翻 latest 指针。

    顺序反了的话会出现"latest 指向一个某个区下不到的包"——用户看到的是
    升级失败，而两边的对象存储各自都"正常"。
    """
    key = f"{ver}/{target}/{digest}.tar.gz"
    for source in SOURCES:
        print(f"上传到 {source}")
        s3_upload(source, bundle, key)

    for source in SOURCES:
        print(f"校验 {source}")
        verify(source, key, digest)

    for source in SOURCES:
        print(f"翻 {source} 的 latest 指针")
        s3_upload(source, DIST / target / "latest.json", f"{target}/latest.json")
        s3_upload(source, DIST / "manifest.json", "manifest.json")


def verify(source: str, key: str, digest: str) -> None:
    """回读校验。**不是可选步骤** —— 传完就翻指针的话，一次半截的上传
    会让所有客户端升级到一个下不完的包。"""
    env = SOURCES[source]
    endpoint, bucket = os.environ[env["endpoint"]], os.environ[env["bucket"]]
    tmp = DIST / "verify.tmp"
    run(["aws", "s3", "cp", f"s3://{bucket}/{key}", str(tmp), "--endpoint-url", endpoint])
    actual = hashlib.sha256(tmp.read_bytes()).hexdigest()
    tmp.unlink(missing_ok=True)
    if actual != digest:
        raise SystemExit(f"{source} 上的包哈希对不上：期望 {digest}，实际 {actual}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", default=host_target())
    ap.add_argument(
        "--base",
        default=os.environ.get("OVAIJISUAN_RELEASE_BASE", "https://example.invalid/release"),
        help="包的公开基地址，写进 latest.json",
    )
    ap.add_argument("--publish", action="store_true", help="上传（需要 aws cli 和凭据）")
    args = ap.parse_args()

    ver, target = version(), args.target
    print(f"版本 {ver}  目标 {target}\n")

    stage = build(target)
    bundle, digest = pack(stage, ver, target)
    write_manifests(ver, target, bundle, digest, args.base)

    size_mb = bundle.stat().st_size / 1_048_576
    print(f"\n包    {bundle.relative_to(ROOT)}  ({size_mb:.1f} MB)")
    print(f"sha256 {digest}")
    print(f"清单  {(DIST / 'manifest.json').relative_to(ROOT)}")

    if args.publish:
        publish(ver, target, bundle, digest)
        print("\n已发布")
    else:
        print("\n（没有 --publish，只打了包）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
