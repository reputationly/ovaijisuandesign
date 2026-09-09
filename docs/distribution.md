# 分发与升级

自己做发布通道，包放 **R2 或 OBS**。这份文档记两件事：官方那套是怎么做的
（可以照抄的部分不少），以及我们要怎么做。

目前还没到实现的时候 —— 但它影响现在的一些结构决定，见最后一节。

## 一、官方那套

### 应用本体：velopack

`app.asar` 里的 `package.json` 带一个 `hiloRelease` 块：

```jsonc
"hiloRelease": {
  "channel": "prod",
  "region": "domestic",
  "appId": "com.minimax.hub",
  "productName": "MiniMax Design",
  "deepLinkScheme": "minimax-hub-cn",
  "updateBaseUrl": "https://filecdn.minimax.chat/public/minimax-hub/release/domestic",
  "hotUpdateBaseUrl": "",
  "locale": "zh"
}
```

- **`updateBaseUrl`** 是完整包的更新源，按 `channel` × `region` 分目录
- **`hotUpdateBaseUrl`** 是另一条通道（国内 prod 留空），用于不换整包的
  JS 热更
- 全部可以被 `HILO_RELEASE_*` 环境变量覆盖 —— 测试环境靠这个切
- 依赖是 `velopack@1.2.0` + `electron-updater`，Windows 侧还有
  `verify-install-ownership.ps1` 和 junction 相关的一堆处理

### 按需下载的运行时：ComfyUI 后端

**这套更值得抄。** 应用里只有一个清单 `bundled-plugins/comfyui/hub/backend-bundle.json`：

```jsonc
{
  "comment": "托管后端 bootstrap 清单。客户端先识别设备目标，再读取该目标 CDN
              的 latest.json；latest 只在不可变 bundle 双 CDN 校验完成后更新。
              不要手工修改 URL，使用 scripts/release-comfyui-backend.py 发布。",
  "schemaVersion": 2,
  "version": "0.1.10",
  "targets": {
    "darwin-arm64": {
      "status": "published",
      "runtime": "metal",
      "latestUrls": {
        "domestic": "https://cdn.hailuoai.com/public_assets/comfyui-backend/darwin-arm64/latest.json",
        "overseas": "https://cdn.hailuoai.video/public_assets/comfyui-backend/darwin-arm64/latest.json"
      }
    },
    "win32-x64-nvidia-cuda12": { … },
    "win32-x64-nvidia-cuda13": { … }
  }
}
```

配套的安装脚本 `install-backend.py`（832 行，中文注释）里有几个直接可抄的决定：

| | |
|---|---|
| **两层间接** | 清单里只有 `latest.json` 的地址，真正的包地址在 `latest.json` 里。发新版只改一个小 JSON |
| **包不可变** | bundle 按版本存死，`latest.json` 才是可变的那一个 |
| **双 CDN 校验后才翻指针** | 两个源都验完，`latest` 才指过去。避免"翻了指针但某个区下不到" |
| **按设备目标分** | `darwin-arm64` / `win32-x64-nvidia-cuda12` /… 而不是只按 OS |
| **`status: published`** | 目标可以先存在、后发布 |
| **断点续传** | `downloads/<file>.part` |
| **进度写状态文件** | `install-state.json`，前端轮询 `GET /api/plugins/comfyui/data/install-state.json`，装的过程不占住 UI |
| **入口/worker 双模式** | 入口调用秒级返回，真正干活的 worker 是 detached 孤儿进程 |

## 二、我们要怎么做

包放 **Cloudflare R2 或华为 OBS**。平台本身在 `ovaijisuan.com`（华为云），
所以 OBS 在国内链路上有天然优势；R2 出网便宜、全球可达。**两个都发，
照抄"双源校验后才翻指针"那条。**

### 我们要发的东西和官方不一样

我们现在不是一个 Electron 应用，而是三块：

| | 形态 | 平台相关 |
|---|---|---|
| `ovgw`（gateway） | Rust 二进制 | 是，按 `darwin-arm64` / `linux-x64` /… 分 |
| `canvas-web` | 静态产物（HTML/JS/CSS） | 否 |
| `mcp` | TS 源码 + 依赖 | 否，但要 bun 或 node |

所以**不需要 velopack 那一套**（那是给桌面安装器的）。我们要的是
ComfyUI 后端那种形状：一个清单 + 每个目标一个 `latest.json` + 不可变包。

### 布局

```text
<base>/<channel>/manifest.json                       ← 唯一的入口，客户端只知道这个
<base>/<channel>/<target>/latest.json                ← 小、可变
<base>/<channel>/<target>/<version>/<sha256>.tar.zst ← 大、不可变
```

`latest.json`：

```jsonc
{
  "version": "0.3.1",
  "url": "…/0.3.1/9f2c….tar.zst",
  "sha256": "9f2c…",
  "size": 18234567,
  "releasedAt": "2026-09-09T00:00:00Z",
  "minSupported": "0.2.0"        // 低于它必须整包换，不能增量
}
```

### 几个必须先想清楚的

**校验只能防损坏，防不了投毒。** manifest 里的 sha256 只保证"下到的和发的
一样"，前提是 manifest 本身可信 —— 而它就在同一个桶里。桶被写了就全完。
要真正防住得有签名密钥，manifest 带签名、客户端内置公钥。**先做 sha256，
但要知道它挡不住什么**，别把它当安全措施写进文档。

**回滚要在设计里，不是事后补。** 保留最近 N 个版本的包，`latest.json`
指回去就是回滚。所以包必须不可变、按版本存死 —— 覆盖发布会让回滚变成
"再发一次旧版"，而那时候你手上未必还有旧产物。

**channel 从一开始就分。** `dev` / `prod` 两条起步。合成一条之后再拆，
要动客户端。

**目标粒度按官方那样细。** 不是 `macos` 而是 `darwin-arm64`。
将来出 `linux-x64` 时不用改协议。

**下载和安装分开。** 官方那个入口/worker 双模式是对的 —— 装的过程不能占住
调用方。我们的 gateway 是个服务，升级得能在后台下、下完再切。

## 三、这件事现在就影响的决定

还没到实现的时候，但下面几条现在做错、以后要返工：

1. **配置和程序必须分开存。** 配置在
   `~/Library/Application Support/ovaijisuandesign/config.json`，
   程序在别处 —— 升级换程序不能碰配置。**现在已经是这样的。**
2. **gateway 要能报自己的版本。** 加一条 `GET /api/health/live` 之外的
   版本端点，或者让 health 带上版本。升级流程和排查都要它。**还没做。**
3. **`canvas-web` 的产物不能硬编码后端地址。** 现在是 Vite 代理，打包后
   得从运行时拿。**还没做，等真打包时一起。**
4. **不要把 `mcp/` 的绝对路径写死进配置。** `run-agent.sh` 现在拼的是
   `$ROOT/mcp/src/main.ts`，装到用户机器上得按安装目录解析。

## 四、还没定的

- R2 和 OBS 谁是主、谁是镜像
- 增量更新做不做（Rust 二进制十几 MB，直接全量换可能更省事）
- 签名密钥怎么管
- 用不用现成的（`cargo-dist`、`velopack` 也支持非 Electron）还是自己写发布脚本
