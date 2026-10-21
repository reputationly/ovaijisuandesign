# 有意差异与例外登记表

本文件列出**我们与原版 MiniMax Design 4.0.0 之间所有已知的、经确认属于设计选择的差异**，
以及为让自动化检查可用而登记的例外。每条都写明位置与理由。

> 判读方式：凡是本表登记过的差异，都不算缺陷；**没有登记过的任何差异都算缺陷**。
> 各检查脚本以本表为唯一依据（见每节的「对应登记文件」）。

---

## 一、产品层差异（用户可见）

### 1. 品牌

| 项 | 原版 | 本项目 |
|---|---|---|
| 应用名 | MiniMax Design | **蒜狸小助手（狸小助手）** |
| 图标 / 吉祥物 | MiniMax 品牌素材 | 自有素材 |

**理由**：本项目是独立产品，不冒用原品牌。
**影响面**：侧栏标题、关于页、窗口标题、`appId`。

### 2. 无账号体系

**原版**：登录、账号页、团队、云端同步、用户头像。
**本项目**：本机固定用户；**侧栏左下角用「连接状态指示器」替代用户头像与用户名**；
令牌（平台地址 + API Key）改为在设置页「平台接入」里自填。

**理由**：自托管、去云端。
**代码位置**：`app/renderer/src/workspace/connection-indicator.jsx`（`ConnectionPill`，文件头注释写明替代头像的原因）。

### 3. 移除 ComfyUI

**原版**：侧栏有「ComfyUI 工作流 Beta」入口。
**本项目**：整行移除。

**影响面**：侧栏项目列表因此整体上移一行（这是移除的直接视觉后果，不是布局缺陷）。

### 4. 「平台接入」设置页为本项目新增

**原版设置页只有 `settings.account.*`（账号体系）**，没有自托管地址/令牌分区。
本项目新增该分区，i18n 键为 `ov.platform.title` / `ov.settings.platform`（`ov.` 是本项目命名空间）。

**影响面**：门禁屏 `settings-platform` 在 `reference` 模式下无法录制 ——
见 `scripts/ui-compare/compare.mjs` 的 `REFERENCE_EXCLUDED`。

### 5. 关闭营销弹窗

`settings/use-popup.js:159` `const enabled = false`（提交 `b7e1d018`）。

**对应登记文件**：`scripts/ui-compare/network-intentional.json`（`/api/v1/popup`）。

### 6. 本地演示资源替代 CDN

`/api/v1/home/showcase-assets/` 由本项目自带（19 个 key），参照发行包不含。
缩略图在两边都取不到（CDN 被策略屏蔽），因此**两边都显示灰块**，不是缺陷。

**对应登记文件**：
`scripts/ui-compare/network-intentional.json`、`scripts/gateway-compare/intentional.json`、`scripts/ui-compare/compare.mjs` 的 `NET_VOLATILE`。

---

## 二、网关协议差异

| 端点 | 参照行为 | 本项目行為 | 理由 |
|---|---|---|---|
| `GET /api/v1/home/showcase-assets/` | 404（发行包不含） | 200 | 自带本地演示资源 |
| `GET /backend/group/list` | 代理到云端团队服务（离线 400） | 本地数据 200 | 自托管、去云端 |
| `GET /api/models` | 云端取列表（离线 500） | 本地配置 200 | 自托管 |
| `POST /api/upload` | 500（自身未捕获 TypeError） | 400（正确） | **我方行为优于参照** |

**对应登记文件**：`scripts/gateway-compare/intentional.json`（4 条）。

---

## 三、常量表差异

`scripts/v3preload/constants-intentional.json`（**25 条**）。

主要是**整份镜像的第三方库**（three.js / highlight.js / mediabunny 等）内部同名常量与我们树里的值不同。
这些是上游库自己的常量，不是我们的业务常量。

---

## 四、静态检查例外

### 未绑定 / 对象属性

`scripts/desource/undef-allowlist.json`（**14 处，全在 `app/renderer/src/vendor.js`**）。

内容：three.js 在运行时往内建原型上挂属性（`Info.prototype.spaceSeparated` 等）。
这是上游库的写法，静态检查看不到运行时挂载。

**这条检查现在是 L0 阻断项**：命中数必须等于登记总额，否则构建失败 ——
这样新问题不会被淹没在历史噪声里。

> 历史：`text-editor/image-annotation-dialog.jsx` 曾有一处 `TOOLS.map`，
> 就是因为这项检查当时不阻断而长期未修。已在第 306 轮修掉。

### 类型逃逸

`scripts/desource/check-type-escapes.mjs` 扫描 `app/desktop/src/main` 与 `src/preload` 的非测试代码，
禁止 `as never` / `as any` / `@ts-ignore` / `@ts-expect-error`（L0 阻断，当前 **0 处**）。

`@ts-nocheck` 只允许两个**整份镜像自参照**的文件：

| 文件 | 理由 |
|---|---|
| `app/desktop/src/main/persistence/renderer-persistence-service.ts` | 101 行整份取回，保留原形态不改写类型 |
| `app/desktop/src/preload/v3-workbench/index.ts` | 2699 行整份镜像，同上 |

> 历史：本项目的 `mainFrame.postMessage(bootstrap as never, …)` 把「第一个参数该是频道名」
> 这个错误藏了很久，是 v3 资源视图 12 环链路的最后一环。这条规则就是为此加的。

---

## 五、门禁例外

### 无基线 / 基线不可用的屏

| 屏 | 情况 |
|---|---|
| `settings-platform` | 本项目新增，`reference` 模式渲染不出来（见一.4） |
| `ws-a-v3` / `ws-b-v3` | 基线缺 png；`ws-a-v3` 的 v3 内容在独立原生 `WebContentsView` 里，主窗口截图拍不到 |

### 像素对比的定位

**当前 40 屏基线是用 `recovered` 模式录的（自比）**，因此：

- 「19 屏 0.000% / 最大 0.142% / 平均 0.0201%」只证明**界面在两次运行之间稳定**；
- **不构成与原版一致的证据**。

详细证据见 `scripts/ui-compare/baseline-audit.json`。

`--record` 现在必须显式指定 `reference` / `recovered`，并写入 `baseline-source.json`；
比较时校验来源，非 `reference` 一律拒绝。

---

## 六、范围排除

| 项 | 说明 |
|---|---|
| 云端服务 | 团队、计费、云端同步、模型市场等一律不实现 |
| 自动更新 | 无更新服务 |
| ComfyUI | 整块移除 |

---

## 附：各登记文件一览

| 文件 | 条数 | 作用 |
|---|---|---|
| `scripts/v3preload/constants-intentional.json` | 25 | 常量表的有意差异 |
| `scripts/gateway-compare/intentional.json` | 4 | 网关协议的有意差异 |
| `scripts/ui-compare/network-intentional.json` | 2 | 网络路径的白名单 |
| `scripts/desource/undef-allowlist.json` | 1（覆盖 14 处） | 静态检查例外 |
| `scripts/ui-compare/compare.mjs` `REFERENCE_EXCLUDED` | 1 | 只在本项目存在的屏 |
| `scripts/ui-compare/baseline-audit.json` | — | 基线来源审计结论 |
