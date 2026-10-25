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

### 7. 隐藏反馈入口（L-6）

**原版**：画布帮助菜单有「反馈」「功能建议」两项，对话消息菜单有「提交反馈」，错误页有「反馈」按钮。

**本项目**：这些入口全部隐藏（`settings/use-direct-feedback.jsx` 的
`FEEDBACK_ENTRY_ENABLED = false`）。

**理由**：没有服务端接收方。`infra/submit-feedback.js` 把内容写到本机目录，而界面文案是
「提交成功（单号 xxx）」—— 用户会以为已经送达，实际上只有他自己能看到。
这比"没有反馈入口"更糟，所以先隐藏入口，管线保留。

**恢复条件**：接上真的接收方（P2 的市场/运营接口）后把开关翻回 true 即可，不用改其他文件。

**影响面**：三个菜单项（`canvas.help.feedback`、`canvas.help.featureRequest`、
`chat-assistant-menu-feedback`）与 `FeedbackButton` 本身。

**门禁**：`ws-chat-input` 这一屏的对话消息行里，参照有「反馈问题」按钮而我们没有 ——
实测（`2026-10-25T15-01-55-239Z` 那一批次）DOM 差一项 `feedback-button`，像素也因此
超出该屏残差预算。所以两处都要处理：
- `scripts/ui-compare/expected-diffs.json` 的 `ws-chat-input.dom.refOnly` 登记 `feedback-button`；
- `scripts/ui-compare/compare.mjs` 的 `MASK_TARGETS` 按该 id 遮掉那块（与 ComfyUI 整行、
  用户头像同一套做法：参照有、我们没有）。

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

## 四·补：已知功能差距（不是有意差异，但已确认不做）

### 画布屏缺 2 帧 `editor_subscribe`

| 屏 | 我方帧类型集合 | 参照帧类型集合 |
|---|---|---|
| `ws-a-v3-resource` | `editor_subscribe` / `list_sessions` / `task_subscribe` / `task_unsubscribe` | 同一集合，**完全一致** |
| `ws-a-v3` | 缺 `editor_subscribe` | 有 `editor_subscribe` |

**原因**：`useWorkbenchEditorEvents` 有两个调用点。
资源视图走 `native-workbench-host.jsx`（我们已还原，正常发帧）；
画布路径走 `WorkspaceResultNavigationProvider`，而把它接上会崩：

```
Task result navigation: stale
  at canvas-v3/ui-components.js:13232  (run2 的第一行)
  条件：target.scopeKey !== workbench.scopeKey
        || !target.resourceId.trim()
        || !target.versionId.trim()
```

`WorkspaceResultNavigationLayout`（21 行）与 `WorkspaceResultNavigationProvider`
（11 声明 / 943 行）都已还原在树里，**缺的是任务结果导航的数据链路**
（资源 id + 版本 id 的真实来源）。

**为什么不做**：补这条链路的成本远大于这 2 帧的价值，
而 `ws-a-v3-resource` 的类型集合已经完全一致。

**试过并且不采用的捷径**：
- 只渲染 `useWorkbenchEditorEvents`、不启动那两个 agent —— 能拿到帧，
  但绕开了参照里真实存在的行为，属行为差异，会误导后续判断；
- 给 `agent.start()` 加 `try/catch` —— 掩盖失败，与本项目「不静默桩」原则冲突。

**判定影响**：不影响第 2 条的 HTTP 部分（23/23 完全一致），
也不影响第 1、3、4 条。属于**已登记的已知差距**。

---

## 四·补二：`ws-code-editor` —— **待做功能**（不是有意差异）

**现象**：该屏在参照侧有 2 帧 `focus_session` + 3 帧 `set_mode`，我们一帧都没有。

**追因**：不是发送路径的问题。DOM 对比给出更完整的图景 —— 参照这一屏比我们多一整块聊天面板：

```
只参照有：chat-message-list / chat-message-turn / chat-…  （聊天面板）
          canvas.text-quick-plan / -quick-prompt / -quick-script / -quick-write（4 个快捷动作）
          canvas.table-node / canvas.file-node.rename-from-preview / -view-card-from-preview
          canvas.audio-node.toggle-play
只我方有：canvas.audio.toggle-play（旧音频节点）、canvas.node-promote-to-asset、
          home-sidebar.connectors-release-badge、workspace-stage.controls
```

也就是说：**参照的「大 markdown 编辑器」是会话驱动的** —— 打开它会绑定一个 text-edit 会话，
所以有 `focus_session` / `set_mode`，也有聊天面板与 4 个快捷动作。
我们的大编辑器（`text-editor/source-text-fullscreen.jsx`）里**没有任何会话逻辑**。

**对照证据**：`ws-text-node` 在参照侧这两个帧都是 **0**。
所以不能把「所有文本编辑路径都加 focus_session」当成修法 —— 那会把 text-node 改坏。

**定性（按验收意见）**：4.0.0 把大编辑器改成了由会话驱动，**我们尚未还原这个功能**。
这不是「有意差异」，是**待做功能**，交付结论里按这个口径列。

**为什么本轮不做**：把大编辑器改成会话驱动是一项功能开发，不是补两帧；
而且它牵涉会话绑定、聊天面板复用、快捷动作四件事。**登记为已知差距。**

**验证方式**：`ONLY=ws-code-editor` 跑门禁，看 `只参照有` 里是否还有 `chat-*` 与 `canvas.text-quick-*`。

---

## 四·补三：音频节点仍是 v2 组件（18 屏受影响）

**现象**：参照的画布音频节点 id 是 `canvas.audio-node.toggle-play`（v3 组件），
我们渲染的是 `canvas.audio.toggle-play`（v2 组件）。

**已确认的事实**（`ONLY=ws-canvas-ops` 实测）：

```
canvas.audio.toggle-play         有    ← 我们的
canvas.audio-node.toggle-play    无    ← 参照的
canvas-resource-detail-panel     无    ← v3 独有 id，我们也没有
canvas.tool-dock / canvas.pane   有    ← 两边都有（共享）
```

**能排除的**：
- `canvas-v3/canvas-area-v3.js` 里 **0 处**引用 `hilo-media-plugin`（v2 的插件注册）
- 所以不是 v3 画布直接挂载了 v2 插件

**还没查清的**（本轮证据互相矛盾，如实记录）：

| 证据 | 指向 |
|---|---|
| `canvas.tool-dock` 在 DOM 里，而该 id **只在 `canvas-v3/canvas-area-v3.js` 出现**（v2 的 canvas-area.jsx 里 0 处） | **v3 画布在渲染** |
| `canvas-resource-detail-panel`（也只在 v3）不在 DOM 里 | 该面板只是没打开，不矛盾 |
| `canvas.audio.toggle-play` 在 DOM 里，而该 id **只在 `media-editing/audio-node-inner.jsx` 出现** | **v2 音频组件在渲染** |
| `canvas-area-v3.js` 不 import `audio-node-inner` / `resolve-panorama` / `hilo-media-plugin`（均 0 处） | v3 画布不该产出这个 id |
| `canvasV3NodeTypes` 只有 placeholder/frame/subject/sticker/composition/director-stage/clip-studio，**没有 audio** | v3 的节点映射里没有音频 |

**结论：v3 画布在渲染，但音频节点的 id 来自 v2 组件，而 v3 侧既不 import 它、
节点映射里也没有 audio —— 这三件事凑不到一起。当前模型解释不了。**

**下一步不是改代码，而是先把这条打通**：可以在 `audio-node-inner.jsx` 的
`canvas.audio.toggle-play` 处临时加一条 `console.trace`（或用 DOM 断点），
看它到底是谁渲染的。拿到调用栈再决定。
v2 的音频组件链是 `audio-node-inner.jsx` → `resolve-panorama-generation-presentation.js`
的 `AudioNode` → `canvas/hilo-media-plugin.js:135` 注册 → `canvas/canvas-area.jsx` 使用。
这条链在 v3 上不该成立，但 id 确实出现在 v3 屏的 DOM 里，**中间那一环还没找到**。

**为什么没有直接改**：换组件要同时对齐 props、事件与控制契约；
在没查清 v3 的节点解析路径之前换，等于把 18 屏一起赌上去。

**下一步**：在 v3 画布侧找节点渲染器映射（`nodeTypes` / 组件注册表），
确认 `audio` 类型解析到哪个组件，再决定是替换还是登记。

---

## 四·补四：节点工具栏组成 —— **已修**（第 339 轮）

### 真实原因：图片工具栏的常量没跟上 4.0.0

**不是运行时状态差异**。我上一版查错了实体：`DEFAULT_PINNED` 在我们树里有 3 个同名常量
（`canvas-v3/canvas-v3-constants.js`、`media-editing/use-start-cloud-edit-from-node.js`、
`canvas/use-video-starter-preset-store.js`），而**图片工具栏用的是第二个**。
我比对时拿错了，才得出「两边一致」的错误结论。

按参照 `index-BBp4hclA.js:88865–88910`（锚点是紧邻的
`STORAGE_KEY$a = "hilo:canvas:image-toolbar:customization"`）逐项对照：

| | 参照 4.0.0 | 我们（修前） |
|---|---|---|
| `IMAGE_TOOLBAR_TOOLS` 第 7 项 | `layer-decompose` | `storyboard-grid` |
| `IMAGE_TOOLBAR_TOOLS` 最后一项 | `storyboard-grid` | `layer-decompose` |
| `DEFAULT_PINNED` 最后一项 | `layer-decompose` | `storyboard-grid` |
| 旧版置顶迁移常量 | `PRE_LAYER_DECOMPOSE_DEFAULT_PINNED`（:88904） | **没有** |

这正好解释验收看到的现象：参照多 `node-layer-decompose`、我们多 `node-storyboard-grid`。

### 已改

- `media-editing/use-start-cloud-edit-from-node.js`：`IMAGE_TOOLBAR_TOOLS` 与 `DEFAULT_PINNED` 按参照顺序改
- `media-editing/read-persisted.js`：补 `PRE_LAYER_DECOMPOSE_DEFAULT_PINNED`，并加进迁移数组
  （原本迁移逻辑就在，只是缺这一个常量，所以升级前的出厂配置识别不出来）

### 验证

`ONLY=ws-select-image`：**「只参照有」为空** —— `canvas.node-layer-decompose` 已出现。
「只我方有」只剩 `canvas.node-promote-to-asset`（待单独查，见下）。

### 为什么常量对照没抓到（三次了）

`TOOLS`、`THUMB_PX`、`DEFAULT_PINNED` —— **同名常量带 `$n` 变体时，`check-constants.mjs` 会直接跳过**。
已列入待办：改成「用相邻独特常量做锚点定位实体再比」，匹配不上就列清单人工判断。

### 仍未解决

`canvas.node-promote-to-asset` 仍只在我们这边出现，需要单独查它在参照里的触发条件。

---

## 四·补五：布局菜单（参照侧打不开，只能部分验证）

**原现象**：录 `ws-layout` 时参照报「界面上找不到 `workspace.view-mode.chat-only`」。

**本轮查清**：
- `workspace.view-mode.chat-only` / `.split` / `.canvas-only` 三个 id **在参照 bundle 里都存在**；
- 但点开 `workspace.view-mode-menu.stage` 之后，**参照 DOM 里只有触发器一个 id，一个菜单项都没有**
  （我方同一动作后有 5 个菜单项）。
- 延长等待到 1.4s、各种点法都试过，**参照的菜单就是没打开**。

也就是说：**不是「菜单里没有 chat-only」，而是「我们的合成点击打不开参照的菜单」**。
可能原因：该触发器需要真实指针序列、或它在那个状态下是禁用/被遮挡的。

**按验收建议又试了两种打开方式，都不行**：
- 合成鼠标事件（`mousePressed`/`mouseReleased`，CDP 会转成 pointerdown）—— 菜单没开；
- **聚焦 + 键盘**：给门禁加了 `{ ui, press: "Enter" }` 步骤类型，`el.focus()` 成功
  （没报「聚焦不了」，说明触发器存在且可聚焦），但 Enter 之后菜单仍没开。

**结论**：触发器在、可聚焦，但两种标准打开方式都不生效。可能是它需要完整指针序列
（进入→移动→按下→抬起）或某个前置状态。

**处置**：把 `ws-layout` 这一屏改成「打开菜单就截图」，参照侧因此能录成功（截到的是**未展开**的状态）。
这一屏现在覆盖布局页的整体视觉，但**菜单内容无法对比**。
已从 `REFERENCE_MISSING` 移除并补上预算。

**要真正验证菜单内容**，需要让参照的菜单打开（换事件序列，或改用键盘导航）。
在那之前，菜单项的差异只能靠源码对照。

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


---

## 四、4.0.4 基线里登记的待做差异

| 差异 | 位置 | 理由 | 登记 |
|---|---|---|---|
| `home-sidebar.connectors-release-badge` 在我方出现、参照基线没有 | 侧栏 | **门禁状态不对称**：徽标配置三处一致，是否显示只取决于 `global.dismissedCoachMarks`；4.0.4 基线在首页之后不再有该标记，我方逐屏清标记后又出现。已按实际出现差异的屏登记，不再放 `*`。 | `scripts/ui-compare/expected-diffs.json` 各屏 `dom.oursOnly` |
| `task_subscribe` / `task_unsubscribe` | — | 已实现 `DesignExecuteCard` + `useDesignTaskPush`，不再登记。卡片产出/参考图有简化分支，见 `docs/design-execute-card-status.md`。 | — |
