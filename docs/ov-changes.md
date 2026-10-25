# 产品改动清单

> **为什么要有这张表**：门禁一直在和参照比。我们改了界面，它就会报差异。
> **登记过的差异 = 我们有意改的；没登记的差异 = 升级或改动带来的副作用。**
> 这样门禁才能同时守住两件事：「参照那部分没被我们改坏」和「我们的改动还在」。

## 字段

| 字段 | 说明 |
|---|---|
| 编号 | 稳定标识，代码注释与提交信息里引用它 |
| 原因 | 为什么改（产品要求 / 合规 / 品牌） |
| 层 | 0 不碰界面 · 1 构建时打补丁 · 2 接入点替换 · 3 局部改成源码（见 `4.0.4-upgrade-plan.md`） |
| 落点 | 具体文件 / 补丁 id / gateway 模块 |
| 验证方式 | 哪个测试、或门禁哪一屏 |
| 门禁登记 | `expected-diffs.json` 的条目、或遮罩、或 `REFERENCE_MISSING` |

**规则**：**改了界面就必须在门禁里登记**，否则下一次升级时分不清「参照变了」和「我们改了」。

---

## #1 品牌替换（蒜狸小助手 / Suanli Assistant）

- **原因**：品牌
- **层**：1（构建时补丁）+ 主界面源码里的 i18n 品牌串
- **落点**：
  - 主界面：`app/renderer/src/infra/hub-logo.jsx`（蒜狸形象替换字标）、
    `app/renderer/src/i18n/chinese-translations.js` 等品牌串
  - v3 运行时：见 #9
- **验证方式**：37 屏门禁绿；品牌区域按「有意差异」遮罩
- **门禁登记**：`expected-diffs.json` 的通配白名单（`*` 级）与逐屏遮罩；
  品牌文本差异不产生 id 集合差异，走遮罩而非 `refOnly`/`oursOnly`
- **备注**：参照的品牌行是 `span[role=img]` + 两个字标 `svg`；
  我们是 `span[role=img]` + 一个蒜狸 `<img>`。**这是有意差异，不是缺失。**

## #2 去掉登录引导弹窗 / 服务端运营弹窗 / 公告条 / 每日促销弹窗

- **原因**：产品要求（不做登录营销）
- **层**：1
- **落点**：**待确认** —— 3.0.16 时期由 `app/official-ui/patches.mjs` 处理；
  4.0.x 主界面已是源码，需确认现在是否仍需处理、或已由别处实现
- **验证方式**：门禁「0 屏新增报错」+ 首页/工作区各屏视觉确认
- **门禁登记**：若这些弹窗在参照里出现而我们没有，会产生 `refOnly`，需逐条登记
- **状态**：**未验证**（本轮未查到对应实现，不臆造落点）

## #3 隐藏工作区浏览器切换、侧栏 / 画布菜单 / 设置里的 ComfyUI 入口

- **原因**：范围裁剪（不做浏览器 / ComfyUI）
- **层**：1
- **落点**：主界面源码（入口组件按开关不渲染）；v3 运行时入口见第 4 步
- **验证方式**：37 屏门禁
- **门禁登记**：`expected-diffs.json` 通配 `refOnly`：
  `workspace.switch-to-browser`、`workspace.switch-to-canvas`、
  `home-sidebar-nav-workflows`、`home-sidebar.workflows-release-badge`

## #4 `/workflows` 重定向回首页

- **原因**：同 #3（工作流入口隐藏）
- **层**：2
- **落点**：路由层（重定向）
- **验证方式**：37 屏门禁（该屏不再出现）
- **门禁登记**：与 #3 共用 `home-sidebar-nav-workflows`、`home-sidebar.workflows-release-badge`

## #5 去掉输入框「使用指南」外链

- **原因**：产品要求（不外链到官方文档）
- **层**：1
- **落点**：**待确认** —— 3.0.16 时期在 `patches.mjs`；4.0.x 需确认现状。
  相关组件是 `app/renderer/src/text-editor/creation-guide-placeholder.jsx`，
  但当前实现里没有外链，**可能已不需要这条改动**
- **验证方式**：首页/工作区输入框屏
- **门禁登记**：无（若不再有外链，则不产生差异）
- **状态**：**未验证**

## #6 设置里的「平台接入」页（`settings-platform`）

- **原因**：本项目新增（配置平台地址与令牌）
- **层**：3（本项目自己的源码，非补丁）
- **落点**：`app/renderer/src/settings/platform-section.jsx`；
  i18n `ov.platform.title` / `ov.settings.platform`
- **验证方式**：该屏跑门禁时按 `REFERENCE_MISSING` 跳过
- **门禁登记**：`scripts/ui-compare/compare.mjs` 的 `REFERENCE_MISSING`
  （理由：参照没有这一屏）

## #7 插件子标签行（插件 / 我的插件）

- **原因**：4.0.3 参照有、我们后补
- **层**：2（在 `connectors` 能力分支的接入点插入）
- **落点**：`app/renderer/src/skills/index.jsx` ——
  `plugins-primary-tabs`、`plugins-tab-community`、`plugins-tab-mine`、`skills-tab-info-plugins`；
  内容分区在 `skills/connectors/connectors-tab.jsx`（`pluginTab === "mine"` 只看 `kind === "saved"`）
- **验证方式**：`skills-connectors` 屏（未登记差异 0）
- **门禁登记**：**无**（已与参照一致，登记已删除）

## #9 v3 运行时标题替换（`<title>`）

- **原因**：品牌
- **层**：1（构建时补丁）
- **落点**：`app/official-ui/patches-v3.mjs` 的 `v3-title`，作用于 v3 产物的 `index.html`
- **验证方式**：
  - **已验证**：补丁命中数 1（不中即构建失败）、重生成 `bundle-manifest.json` 后
    345/345 文件校验一致、`pnpm run build` 退出码 0、产物里标题确实为「蒜狸小助手」
  - **已对照**：用未打补丁的产物跑 v3 门禁，像素计数与差异**完全相同**
    → **补丁对门禁的影响为零**
  - **门禁已覆盖 v3 工作台视图**：`compare.mjs` 另采独立 WebContentsView 的界面 id 与截图，
    `ws-a-v3-resource` 对 `~/ov-golden-v3-4.0.3-wb` 连跑 5 次逐像素一致。
    但 `<title>` 是文档标题，不画在视图里，**截图看不到它**；它只有构建侧的校验
- **门禁登记**：不需要（视图内容与参照一致，标题不参与像素和界面 id 比较）

---

## #10 停用观测云前端监控（RUM）与神策统计

- **原因**：不向参照方的云端上报（产品范围：不接对方云端）
- **层**：3（源码）
- **落点**：`app/renderer/src/i18n/init-rum.js`（提交 24b8d1ee）：不加载 SDK、不上报，
  `initRum` / `reportRumAction` 只在本地记状态供诊断面板显示
- **验证方式**：Playwright 诊断（`.probe/pw/worker-probe.mjs`，不进门禁）：
  - 参照启动 361ms 时由 `initRum` → `datafluxRum.init({ compressIntakeRequests: true })`
    在 `index-YnY-ya8p.js` 的 `createDeflateWorker` 里建一个 blob 压缩 worker（每一屏都有）
  - 我们这边没有任何 worker
  - v3 运行时产物里没有 RUM SDK（`datafluxRum` / `DATAFLUX` / `clientToken` 均 0 处）
- **门禁登记**：不需要。门禁不比较 worker；参照多出的这个 worker 已解释为本条

---

## #11 去掉「上传日志」功能

- **原因**：产品没有日志上传服务，也不向对方云端发送任何东西；主进程 `log:upload`
  固定返回失败，所有上传入口只会给用户一个必然报错的入口。
- **层**：3（源码）
- **落点**（全部删除，不只隐藏）：
  - 设置页两处「上传日志」行：`app/renderer/src/settings/diagnostics-group.jsx`、
    `app/desktop/src/renderer/src/settings/sections.tsx`
  - 帮助菜单 `upload-logs` 项（`workspace/groups.js`、`app-root.jsx` 两版标签、
    `app/desktop/src/main/menu.ts` 的 case）
  - 顶栏诊断弹层「上传」按钮（`settings/diagnostics-status-button.jsx`，grid 改 3 列）
  - debug 面板「上传日志」按钮及上传上下文（`debug-panel/debug-panel-dialog.jsx`）
  - workspace 启动失败页：自动上传 useEffect、上传 promise 缓存、定位/说明行、
    「上传日志并复制反馈」按钮 —— 改为固定「复制反馈信息」，只复制用户 ID +
    反馈码 + 诊断类型三行；支持提示固定指向「帮助 → 导出日志」
    （`infra/bundle-error-screen.jsx`）
  - 错误边界自动上传（`settings/log-error-boundary.js`，breadcrumb 与 RUM 上报保留）
  - 反馈附带日志上传（`infra/submit-feedback.js` 及 4 处调用方的死参数；
    gateway 契约不变：`auto_log_uploaded: false`、`detail_url: ""` 照发）
  - 桥接：`preload/index.ts` 的 `diagnostics.uploadLogs`、`raw-ipc.ts` 的
    `log:upload` handler
  - 文案：所有引导「上传日志 / Upload logs」的提示统一改为「导出日志 / Export logs」；
    删除无引用的 i18n key，新增 `bundleError.supportHint.exportLogs`
- **保留**：「打开日志目录」「导出日志」、本地诊断、breadcrumb、本地 RUM 桩；
  gateway 反馈服务（本地存储）不受影响。
- **验证方式（已跑）**：
  - `pnpm --filter @ov/desktop build` 退出码 0；
  - `pnpm --filter @ov/desktop test`：575 passed / 1 skipped（跳过的是需要 `OV_SMOKE` 的
    opencode 冒烟，不是失败）；
  - `node scripts/v3preload/audit-v3.mjs` 退出码 0，第 7 项 0 处违规；
  - 全量 37 屏：`.probe/ui-compare/2026-10-24T03-09-56-148Z` 退出码 0，
    超护栏 0、未登记 0、新报错 0。
- **合并注意**：以后从参照合并（含 4.0.4）时，这些入口一个都不要带回来；
  参照里相关的按钮文案只当参考，不要照抄上传链路。

---

## 维护规则

1. **加改动前先问能不能放层 0**（数据 / 开关 / gateway / 主进程）—— 那一层不需要条目。
2. **同一功能要打 5 处以上补丁，或补丁连续两次升级失效，就往下一层移。**
3. **每条都要有「验证方式」**；没有验证方式的条目等于没登记。
4. **删改动时同步删条目与门禁登记。**
5. 升级时逐条过一遍：**补丁命中数对不上 = 这条要重新处理**。

## 待办（与本清单直接相关）

1. #2 / #5 的现状确认（本轮没查到落点，未臆造）
2. ~~v3 那两屏的 7 条真实缺口~~ —— 已清零（67e9fc82、a0c199ce）；属于还原缺口，不是产品改动
3. ~~门禁采集 v3 工作台的 webContents~~ —— 已做；只有 `ws-a-v3-resource` 挂工作台视图


---

## #12 v3 运行时切 4.0.4（阶段 3）

- `scripts/v3-runtime/v3-4.0.4.tgz`：从历史 `50abf9ff` 恢复，sha256 `88076404d0d979ae568a9aa862ee81dfb02b6afd8347e698256f4b541c5b4e59`；
- `scripts/v3-runtime.lock.json`、`scripts/reference-version.json`、`patches-v3.mjs VERSION` 全部切到 4.0.4；
- `node scripts/stage-v3-bundle.mjs` 走仓库压缩包装配，标题补丁命中 1 次，清单 345 文件；
- 桌面构建 `pnpm --filter @ov/desktop build` exit 0；
- 新基线：`~/ov-golden-4.0.4-clean`（37 屏同批）、`~/ov-golden-v3-4.0.4`（7 屏）；
- 37 屏 / v3 七屏门禁均 exit 0；connectors 徽标按门禁状态不对称逐屏登记；`task_subscribe`/`task_unsubscribe` 仍登记为待做（4.0.3 起缺 `DesignExecuteCard` 实时任务卡片，4.0.4 的推送依附于它）。


---

## #13 design_execute 任务卡片（4.0.3 起缺失）

- MCP `execute` 改走 `/api/v3/execute`，返回 `{task}`；gateway `/api/v3/tasks` 支持 `operation`/`source`/`toolUseId`/`limit`；
- `retry` 真正重提，其余未实现 action 返回 422，不再静默 stop；
- 渲染层补 `DesignExecuteCard`/`ScopedCard`、任务查询、WS 推送、回合注册表；
- 已知简化：产出/参考图使用基础媒体标签，计费确认组不做，Playwright 实时场景未补。

---

## #14 隐藏反馈入口（L-6）

- **原因**：产品要求 —— 反馈没有服务端接收方。提交后只写在本机
  （`infra/submit-feedback.js`），而界面提示「提交成功（单号 …）」，用户会以为已经送达。
- **层**：3（局部改成源码）—— 只改开关与三处菜单渲染，管线保留。
- **落点**：
  - `app/renderer/src/settings/use-direct-feedback.jsx`：`FEEDBACK_ENTRY_ENABLED = false`，
    `FeedbackButton` 直接 `return null`；
  - `app/renderer/src/settings/canvas-help-button.jsx`：`canvas.help.feedback`、
    `canvas.help.featureRequest` 两项按开关隐藏；
  - `app/renderer/src/chat/assistant-message-actions.jsx`：`chat-assistant-menu-feedback`
    按开关隐藏。
- **保留**：`FeedbackDialog`、`submitFeedback`、`bundle-error-screen` 的「复制反馈信息」
  （那是本地复制，不发网络）。接上真的接收方后把开关翻成 `true` 即可恢复。
- **验证方式**：`node scripts/v3preload/audit-v3.mjs`（无新增缺口）；37 屏 / v3 七屏门禁。
- **门禁登记**：`ws-chat-input` 屏的参照侧有「反馈问题」按钮（DOM 实测 2 个
  `feedback-button`），我们隐藏后该屏 DOM 差一项、像素也超出该屏残差预算。处理：
  `expected-diffs.json` 的 `ws-chat-input.dom.refOnly` 记 `feedback-button`；
  `compare.mjs` 的 `MASK_TARGETS` 按该 id 遮掉那块。理由见
  `docs/intentional-differences.md` 一.7。
- **基线怎么更新的（方法留痕）**：参照侧的遮罩位在**录基线**时才算得出来，所以新加的
  selector 不会自动出现在已有基线里。做法是单屏录一次参照（`ONLY=ws-chat-input … --record
  reference`）拿到那两个矩形，**只把新增的两个矩形并进原来的 `ws-chat-input.mask.json`**，
  像素 / DOM / state / 批次信息全部保留原值 —— 单屏录制的界面状态和整批不同（实测：
  整批录的 `ws-chat-input` 没有 connectors 徽标、且有 `task_subscribe`），拿它当基线
  会凭空多出两处差异。老基线备份在 `~/ov-golden-4.0.4-clean.bak-2344/`。
