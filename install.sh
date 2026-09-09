#!/bin/sh
# ovaijisuandesign 安装脚本。
#
#   curl -fsSL https://raw.githubusercontent.com/reputationly/ovaijisuandesign/main/install.sh | sh
#   curl -fsSL .../install.sh | sh -s -- ~/apps/ovaijisuandesign     # 装到指定目录
#
# ## 为什么要有这个脚本
#
# **它不只是图省事，它绕开了一个会让人完全查不出原因的问题。**
#
# macOS 上从浏览器下载的文件会被打上 `com.apple.quarantine`，而 tar 会把这个
# 属性传给解出来的二进制。我们的包没有签名和公证，于是运行时被 Gatekeeper
# 直接 SIGKILL —— **退出码 137，没有任何输出**，看着像程序自己崩了。
#
# curl 不打这个属性（实测），所以走这个脚本装的就不会遇到。
#
# ## 它做了什么
#
# 读我们自己发布的清单 → 挑本机的目标 → 下载 → **校验 sha256** → 解压。
# 校验不过就中止，什么都不留。
#
# 不用 root，不写系统目录，不改 PATH —— 装完告诉你路径，剩下的你自己决定。

set -eu

MANIFEST="${OVAIJISUAN_MANIFEST_URL:-https://github.com/reputationly/ovaijisuandesign/releases/download/manifest/manifest.json}"
DEST="${1:-$HOME/.local/share/ovaijisuandesign}"
UA="ovaijisuandesign-install/1.0"

die() { printf '\n错误：%s\n' "$1" >&2; exit 1; }
say() { printf '%s\n' "$1"; }

# --- 本机是哪个目标 -----------------------------------------------------
# 必须和 scripts/release.py 的 host_target() 一致，对不上就查不到自己那一档。
os=$(uname -s)
arch=$(uname -m)
case "$os" in
  Darwin) os=darwin ;;
  Linux)  os=linux ;;
  *) die "不支持的系统 ${os}（Windows 请直接从 Release 页面下载 zip）" ;;
esac
case "$arch" in
  arm64|aarch64) arch=arm64 ;;
  x86_64|amd64)  arch=x64 ;;
  *) die "不支持的架构 $arch" ;;
esac
TARGET="$os-$arch"

# --- 依赖 ---------------------------------------------------------------
command -v curl >/dev/null || die "需要 curl"
if command -v shasum >/dev/null; then
  sha() { shasum -a 256 "$1" | cut -d' ' -f1; }
elif command -v sha256sum >/dev/null; then
  sha() { sha256sum "$1" | cut -d' ' -f1; }
else
  die "需要 shasum 或 sha256sum —— 不校验就装等于没有校验"
fi

# 只用 sed/grep 抠 JSON：不能假设机器上有 python 或 jq。
# 字段固定由我们自己的发布脚本生成，格式是稳的。
jsonstr() { sed 's/[[:space:]]//g' | grep -o "\"$1\":\"[^\"]*\"" | head -1 | cut -d'"' -f4; }
jsonnum() { sed 's/[[:space:]]//g' | grep -o "\"$1\":[0-9]*" | head -1 | cut -d: -f2; }

fetch() { curl -fsSL -A "$UA" --retry 3 --retry-delay 2 --max-time 60 "$1"; }

say "目标      $TARGET"
say "清单      $MANIFEST"

manifest=$(fetch "$MANIFEST") || die "读不到清单"
# 抠出本目标那一段里的所有 latest.json 地址（可能有多个源）。
section=$(printf '%s' "$manifest" | tr -d ' \n' | grep -o "\"$TARGET\":{[^}]*}[^}]*}" || true)
[ -n "$section" ] || die "清单里没有 $TARGET 这一档"
# 只认 https：能改 DNS 的人否则就能换掉包地址，而 sha256 也来自同一条链路。
urls=$(printf '%s' "$section" | grep -o 'https://[^"]*latest\.json' || true)
[ -n "$urls" ] || die "$TARGET 这一档里没有 https 的 latest.json 地址"

# --- 依次试每个源。任一个能读到就行 —— 这正是双源的意义。 ---------------
latest=""
for u in $urls; do
  say "试源      $u"
  if latest=$(fetch "$u"); then break; fi
  latest=""
done
[ -n "$latest" ] || die "所有源都读不到"

VERSION=$(printf '%s' "$latest" | jsonstr version)
URL=$(printf '%s' "$latest" | jsonstr url)
SHA=$(printf '%s' "$latest" | jsonstr sha256)
SIZE=$(printf '%s' "$latest" | jsonnum size)
[ -n "$VERSION" ] && [ -n "$URL" ] && [ -n "$SHA" ] || die "latest.json 缺字段"

say "版本      $VERSION"
say "大小      $((SIZE / 1048576)) MB"

# --- 下载、校验、解压 ---------------------------------------------------
tmp=$(mktemp -d)
# 中途失败/被打断都不留垃圾。
trap 'rm -rf "$tmp"' EXIT INT TERM

say "下载中…"
fetch "$URL" > "$tmp/pkg.tar.gz" || die "下载失败"

got=$(sha "$tmp/pkg.tar.gz")
if [ "$got" != "$SHA" ]; then
  die "校验和对不上
  期望 $SHA
  实际 $got"
fi
say "校验      ok"

mkdir -p "$tmp/x"
tar -xzf "$tmp/pkg.tar.gz" -C "$tmp/x" || die "解压失败"
[ -f "$tmp/x/ovgw" ] || die "包里没有 ovgw，结构不对"

# 先解到临时目录再整体搬过去：直接解到 DEST 的话，中途失败会留下一个
# 新旧掺杂的安装，而它看起来是完好的。
mkdir -p "$DEST"
if [ -e "$DEST/ovgw" ]; then
  say "覆盖      ${DEST}（旧的备份到 $DEST.bak）"
  rm -rf "$DEST.bak"
  cp -R "$DEST" "$DEST.bak"
fi
cp -R "$tmp/x/." "$DEST/"
chmod +x "$DEST/ovgw" "$DEST/ovagent" 2>/dev/null || true

# --- 自检 ---------------------------------------------------------------
# 装完立刻跑一次。装错架构、少了执行位、被 Gatekeeper 拦，都在这里暴露，
# 而不是等用户第一次用的时候。
if ! reported=$("$DEST/ovgw" --version 2>&1); then
  die "装好了但跑不起来：$reported
  在 macOS 上这通常是隔离属性，试试：
    xattr -dr com.apple.quarantine \"$DEST\""
fi

say ""
say "已安装    $reported"
say "位置      $DEST"
say ""
say "下一步："
say "  $DEST/ovgw          # 首次启动会写配置模板，填好 platform.api_key 再启动"
say "  $DEST/ovagent       # 跑 agent（还需要 opencode 在 PATH 里）"
