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
  - **未验证**：v3 运行时是独立 webContents，门禁只采主页面，
    v3 内容一像素都没被采集 —— **界面层面未验证**。见「待办 3」
- **门禁登记**：暂无可登记的屏（v3 运行时未纳入采集）；待门禁能采 v3 后再补

---

## 维护规则

1. **加改动前先问能不能放层 0**（数据 / 开关 / gateway / 主进程）—— 那一层不需要条目。
2. **同一功能要打 5 处以上补丁，或补丁连续两次升级失效，就往下一层移。**
3. **每条都要有「验证方式」**；没有验证方式的条目等于没登记。
4. **删改动时同步删条目与门禁登记。**
5. 升级时逐条过一遍：**补丁命中数对不上 = 这条要重新处理**。

## 待办（与本清单直接相关）

1. #2 / #5 的现状确认（本轮没查到落点，未臆造）
2. v3 那两屏的 7 条真实缺口（`workspace.structure-*` ×3、`canvas.toolbar-project-assets`、
   WS 帧 `editor_subscribe`、`GET /api/canvas/nodes` 返回 `PROJECT_ARCHITECTURE_UNSUPPORTED`）
3. **门禁采集 v3 工作台的 webContents** —— 不做这件事，#9 以及以后所有 v3 补丁都没有界面验证
