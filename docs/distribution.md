# 分发与升级

自己做发布通道。这份文档记两件事：官方那套是怎么做的（可以照抄的部分不少），
以及我们怎么做。

**当前状态**：GitHub Release 已经是一条真跑通的分发链路（打包 → 发包 →
翻指针 → 客户端查到新版本，全都实测过）。R2 / OBS 的代码写完了但**从未真跑**
—— 缺凭据。见第六节。

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

清单里带一段说明，大意是：客户端先识别自己的设备目标，再读该目标对应 CDN 的
`latest.json`；而 `latest` **只在不可变 bundle 在两个 CDN 上都校验通过之后**
才会更新；URL 不要手改，用发布脚本。结构长这样：

```jsonc
{
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

## 三、已经实现的

`scripts/release.py`。**不依赖 velopack** —— 那是给桌面安装器的。

```bash
python3 scripts/release.py                # 打包，产物在 dist/
python3 scripts/release.py --publish      # 打包并上传
```

### 发布包的形态

```text
ovgw          gateway 服务，自己把画布也服务起来
ovagent       agent 启动器
web/          canvas-web 的静态产物
mcp/main.js   bun build 出来的单文件，不需要 node_modules
```

3.9 MB。实测：解到一个干净目录（没有仓库）就能跑 ——
`ovgw` 从旁边的 `web/` 服务画布，`ovagent` 从旁边的 `mcp/main.js` 拉起
MCP server。

**`reference/` 不在包里**：那是 MiniMax 的专有配置，不能分发。缺了它
`ovagent` 会明确说"还没快照官方配置"，而不是启动到一半失败。

### 落在磁盘上的布局

```text
<base>/manifest.json                         唯一入口，客户端只知道这个
<base>/<target>/latest.json                  小、可变
<base>/<version>/<target>/<sha256>.tar.gz    大、不可变
```

### 发布顺序

先把不可变的包发到两个源、**都回读校验通过**，最后才翻 `latest` 指针。

顺序反了会出现"latest 指向一个某个区下不到的包"—— 用户看到的是升级失败，
而两边的对象存储各自都"正常"。

回读校验不是可选步骤：传完就翻指针的话，一次半截的上传会让所有客户端
升级到一个下不完的包。

R2 和 OBS 都用 S3 API，所以上传是同一段代码 —— 但**凭据和公开域名必须各是
各的**。变量名跟 Toonflow-app 对齐，同一个 Cloudflare 账号下两个项目长得一样，
值可以直接复用：

| | 放哪 | 说明 |
|---|---|---|
| `R2_ACCOUNT_ID` | Secret | endpoint 由它拼出 `https://<id>.r2.cloudflarestorage.com` |
| `R2_BUCKET` | Secret | 桶名。独立的桶最省事；共用桶见下面的命名空间 |
| `R2_ACCESS_KEY_ID` | Secret | |
| `R2_SECRET_ACCESS_KEY` | Secret | |
| `R2_PUBLIC_BASE` | **Variable** | 公开下载地址，不带结尾斜杠。它不是秘密 |

OBS 同样五个，前缀换成 `OBS_`；但**华为云没有"account id 拼域名"那套**，
所以是 `OBS_ENDPOINT` 直接给（形如 `https://obs.cn-north-4.myhuaweicloud.com`）。

配齐几个就发几个（`configured()`），只配 R2 就只发 R2。**一个都没配是硬失败**
—— 静默地什么都不传、日志还写着"已发布"，是最糟的一种。

### 命名空间：`ovaijisuandesign/`

所有 key 都在 `ovaijisuandesign/` 下面（`PRODUCT`，`RELEASE_PRODUCT=` 可关掉）。

用**独立的桶**时它只是让桶根干净点，可有可无。但**和别的项目共用一个桶时
它是必需的**，因为这类流水线的"清理旧版本"普遍是同一套写法：列出桶顶层
目录 → 挑出版本号形状的 → 只保留最新 N 个 → 其余整个 `rm --recursive`。
Toonflow-app 就是这么写的，我们这份也是。共用桶而不分命名空间：

```
桶根           1.1.8.1/  1.1.8.2/  1.1.8.3/  3.0.12.1/  ← 混在一张表里
sort -V 之后   1.1.8.1 < 1.1.8.2 < 1.1.8.3 < 3.0.12.1
```

我们的 `3.0.12.x` 按版本序**永远排在 `1.1.x` 之上**。于是我们发够三版之后，
对方下一次发版的清理会把**它自己所有版本删光**，包括正在服役的那一版 ——
它的清单随即指向不存在的包，全部用户升级 404，而我们这边一切正常，非常难查。

分了命名空间就互不可见：对方的 `^[0-9]+\.[0-9]+…` 匹配不上 `ovaijisuandesign`，
我们的清理也只列 `s3://<桶>/ovaijisuandesign/` 这一层。空跑清理同理，删的是
`ovaijisuandesign/dry-run/` 而不是桶根的 `dry-run/`。

### 两个曾经写错的地方

都是"从没真跑过"才留到现在的：

| 错法 | 后果 |
|---|---|
| 两个源共用一组 `AWS_ACCESS_KEY_ID` | OBS 拿 R2 的 key 去认证，403 |
| 两个源共用一个 `PUBLIC_BASE` | 清单里两条 `latestUrls` 指向同一台主机 —— "双源互为备份"成了摆设，那台挂了两条一起挂 |

所以指针（`latest.json` + `manifest.json`）**只能在发布时按源生成**，
不能在打包时生成一份到处传：打包发生在各平台的 runner 上，那时候还不知道
最终会发到几个源、各自的域名是什么。

> **`--publish` 这条路还没真跑过** —— 手上没有两边的凭据。打包、算哈希、
> 写清单这三步是实测过的；上传和回读校验只做到"代码写完"。第一次真发布时
> 要盯着这一段。

## 四、这件事现在就影响的决定

原来列的四条，现在的状态：

1. ~~**配置和程序必须分开存**~~ —— 配置在
   `~/Library/Application Support/ovaijisuandesign/config.json`，
   升级换程序不碰配置。
2. ~~**gateway 要能报自己的版本**~~ —— `GET /api/health/live` 回
   `{ok, service, version}`。
3. ~~**`canvas-web` 的产物不能硬编码后端地址**~~ —— 打包后由 `ovgw` 同源
   服务，前端只用相对路径，本来就没有后端地址可硬编码。
4. ~~**不要把 `mcp/` 的绝对路径写死**~~ —— `ovagent` 按
   `<可执行文件目录>/mcp/main.js` → `<仓库>/mcp/src/main.ts` 的顺序找，
   两种形态都认。

## 五、CI 与客户端

### 版本号

四段 `MAJOR.MINOR.PATCH.BUILD`，**前三段跟着官方 MiniMax Design 走，
第四段是本仓的迭代号**（和 Toonflow-app 同一套）：

```
   3.0.12  .1
   └──┬─┘   └┬┘
  官方版本   本仓迭代号
```

意思是"对齐到官方 3.0.12 的功能面，这是我们在这条基线上的第 1 版"。

| 放在哪 | 形态 | 谁维护 |
|---|---|---|
| `Cargo.toml` 的 `version` | `3.0.12` 三段 | **手改**，只在跟进官方新版时 |
| Git tag | `v3.0.12.1` 四段 | `scripts/tag.py --push` 自动算 |
| `gateway::VERSION` | 四段 | CI 编译期经 `OVAIJISUAN_VERSION` 注入 |
| `latest-<target>.json` 的 `version` | 四段 | CI 生成 |

**基线为什么不能直接写四段**：`3.0.12.1` 不是合法 semver，cargo 会拒绝解析
整个 workspace。所以基线在 Cargo.toml，完整版本号在 tag 里。
`crates/gateway/build.rs` 只干一件事 —— 声明 `rerun-if-env-changed`，
否则 CI 上有构建缓存时改了版本号也不重编，二进制自报的还是上一版。

**版本号必须是纯数字分段。** `is_newer()` 逐段解析，非数字段一律按 0 ——
用 new-api 那种 `v0.13.2-ovaijisuan-20260903-6e9f99b1` 风格喂进清单的话，
客户端会**静默地永远收不到更新**：不报错、不提示，只是永远认为自己最新。

跟进官方新版本时：改 `Cargo.toml` 的基线 → `scripts/tag.py` 会从 `.1`
重新起（不跟着旧基线跳号，否则 `3.0.11.7 → 3.0.12.8` 看着像丢了七个版本）。

### `.github/workflows/release.yml`

打 `v*` tag 触发，也可以手动跑空跑。

```
prepare          解析四段版本 + 前缀 + 打包矩阵（空跑用 dry-run/）
build（矩阵）     macos-latest→darwin-arm64 + darwin-x64（交叉）
                 windows-latest→win32-x64   ubuntu-latest→linux-x64
publish          汇总各平台产物 → 上传 → 回读校验 → 清理旧版本
                 （没配 R2 凭据时整个跳过）
github-release   挂到 Release 页面 → 再翻升级指针
```

**一台 macOS runner 出两个架构**：arm64 ⇄ x86_64 能交叉（Xcode 自带两个
SDK，连 ring 的 C 代码都能过，实测 15 秒）。别的方向交叉不了 —— 在 Mac 上
试过给 Windows 交叉，卡在 `assert.h` 找不到。所以 Windows 和 Linux 各用
自己的 runner。

`prepare` 里算打包矩阵，而不是在 `build` 的 `if:` 里筛：**job 级 `if:` 拿不到
`matrix` 上下文**，写了会让整个 workflow 文件校验失败，症状是每次 push 都
冒出一个 0 秒的失败 run，点进去只说"workflow file issue"。

### GitHub Release 就是第一个分发源

R2/OBS 的桶还没开，但公开仓的 Release 资产本来就是公网可下的不可变对象 ——
版本 tag 一发出，资产就不再变，正好满足"包不可变"这一条。所以升级链路
**今天就是通的**，不用等桶：

```
固定 tag `manifest` 的 release        ← 可变的那一层，每次发版覆盖
  manifest.json                       有哪些平台
  latest-<target>.json                当前版本、包地址、sha256、大小
各版本 tag 的 release                 ← 不可变，包本体
  ovaijisuandesign-<版本>-<平台>.tar.gz
```

指针那一步**必须排在包上传之后**。反过来的话，中间那几十秒里客户端查到
新版本、去下载、404。

桶开了之后不用改结构：往 `latestUrls` 里加一个源就行，客户端本来就按顺序
试所有源。GitHub 在国内下载慢，R2/OBS 补的是这一块。

从 Toonflow-app 那套流水线抄来的几条，都是踩过才知道的：

| | |
|---|---|
| **版本号集中解析** | 包名、`latest.json`、二进制自报的版本三处必须同源。不一致的话用户装完立刻被提示更新到自己刚装的那个版本 |
| **版本号纯数字** | 带后缀的版本号会让 `is_newer()` 把整段读成 0，客户端静默地永远收不到更新 |
| **`publish` 不要用 `always()`** | 它会放行"某平台打包失败"，仍然翻 latest 指针 —— 那个平台的用户升级时撞 404，其余平台一切正常，很难发现。矩阵改成 prepare 动态给出之后不再有被 skip 的 build，默认的 `success()` 语义就够了 |
| **aws cli 的两个 checksum 开关** | v2 默认发 CRC32 尾部校验，**R2 不支持会直接 501**，而错误信息完全看不出是校验的问题 |
| **公网回读** | 上传后的校验走的是 S3 API，再从公开域名读一次才能抓到"传上去了但公网读不到"（自定义域没映射、缓存策略把清单缓住了） |
| **按数量清理，不按天数** | 生命周期规则按天数有个陷阱：长期不发版时会把当前正在服役的那一版一并删掉 |
| **空跑写 `dry-run/` 前缀** | 前缀必须和写进 `latest.json` 的 base 一致，否则对象在 `dry-run/` 而 URL 指向生产路径，回读必然 404 |

清理放在回读之后、不加 `always()`：前面失败时保持现状，宁可多占空间也不
误删。空跑的清理反过来**必须**加 `always()` —— 否则前面失败（这恰恰是空跑
最可能的结果）残留就留在桶里了。

### 客户端：`GET /api/update/check`

```jsonc
{ "ok": true, "current": "0.1.0", "target": "darwin-arm64",
  "latest": "0.9.0", "needUpdate": true, "reachable": true,
  "source": "r2", "url": "…", "sha256": "…", "size": 4096 }
```

**已实测通过**：从 Release 下载的真实 0.1.1 二进制，查到 0.1.2 并给出可下载
的地址和正确的 sha256。走的就是上面 GitHub Release 那条链路。

三条实测过的行为：

- **多个源按顺序试**。第一个 404 会自动换第二个 —— 两个源本来就是互为
  备份，只试第一个的话它挂了等于没有备份。
- **不可达一律回 200 + `reachable: false`**，不回 5xx。这个接口会被界面
  后台静默轮询，回 500 的话前端拿到的 body 是错误对象，读 `needUpdate`
  会再触发一次异常 —— 一个断网变成两个报错。
- **版本比较逐段短路**。写成"主版本大 或 次版本大 或 修订大"的话，
  远端 `1.1.9` 对本地 `1.2.0` 会在修订号那段命中，把降级当升级推出去。
  （这条是从 Toonflow 的 `checkUpdate.ts` 注释里学的，他们原来就是这个 bug。）

`OVAIJISUAN_MANIFEST_URL` 可以覆盖清单地址 —— 私有化部署各自指向自己的桶，
不用改代码重新打包。

## 六、还没定的

- **R2 / OBS 还没接**。R2 要四个 secrets（`R2_ACCOUNT_ID` / `R2_BUCKET` /
  `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`）加一个 variable
  （`R2_PUBLIC_BASE`）—— 和 Toonflow-app 那边同名，值可以照搬，桶也能共用。
  齐了之后先用 `workflow_dispatch` + `dry_run=true` 跑一次再打真 tag ——
  上传和回读那两步至今没真跑过。
- **OBS 的旧版本清理还没写**。现在只清 R2。
- R2 和 OBS 谁是主、谁是镜像（现在是并列，客户端拿到两个地址自己选）
- **下载和安装还没写** —— 现在只到"知道有新版本"。要能后台下、下完再切
- 增量更新做不做。整包才 3.9 MB，全量换大概率更省事 —— 但 Rust 二进制
  占大头，将来内嵌前端会变大
- 签名密钥怎么管（见上面「校验只能防损坏」那一段）
- Windows 上要不要做安装器。官方那套是 NSIS 外壳 + velopack；我们是三个
  文件加一个目录，解压即用可能就够
