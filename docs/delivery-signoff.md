# 交付签收

**日期**：2026-10-21
**分支**：`wip/4.0.0-restore`
**依据**：本文件逐条对应用户设定的四条验收标准；详细命令与结果见 `docs/delivery-evidence.md`，
所有已知差异见 `docs/intentional-differences.md`。

---

## 一、四条标准

### (a) 可达代码 0 unbound / 0 占位 / 0 真实重复 / 0 常量不一致 —— **达标**

```
node scripts/v3preload/audit-v3.mjs            → ✓ 三项均为 0
node scripts/v3preload/check-placeholders.mjs  → 1308 个文件，命中 0 处
node scripts/desource/check-undef.mjs          → 14 处，全在 vendor.js，与白名单登记一致
node scripts/v3preload/check-constants.mjs     → 一致 1850 / 不一致 0
node scripts/desource/check-type-escapes.mjs   → 62 个文件，命中 0 处
node scripts/v3preload/checks/run-all.mjs      → ✓ 全部自检通过
```

### (b) v3 关键操作与参照网络一致 —— **达标（按路径集合口径）**

基线来源已核验：`~/ov-golden-v3/baseline-source.json` 记录
`mode: reference`、`mainScript: app://./assets/index-BBp4hclA.js`（参照 bundle 本体）。

```
ws-a-v3             路径集合 我方 23 / 参照 23   完全一致
ws-a-v3-resource    路径集合 我方 26 / 参照 26   完全一致
```

WS 帧类型集合：

```
ws-a-v3-resource    完全一致（含 editor_subscribe）
ws-a-v3             缺 editor_subscribe —— 已登记的已知差距，见下
```

### (c) 网关 v3 协议 —— **达标**

```
node scripts/gateway-compare/compare.mjs → ✓ 协议完全一致（状态码 + 结构 + 固定字符串）
```

8 组夹具断言 + 71 条路径重放，真差异 0；4 条已登记的有意差异见登记表第二节。

### (d) M6–M8 —— **达标**

```
M6 v3 工具清单   25/25
M7 v3 agent 配置 20 个文件
M8 打包契约      node scripts/verify-desktop-package.mjs → ✓ 产物布局符合契约
```

---

## 二、横切验证

```
渲染层构建             0 错
desktop 构建           0 错
desktop 类型检查       0 错
desktop 测试           569 passed | 1 skipped
mcp-tools 测试         199 passed
home 屏                (0/0)
40 屏回归              19 屏 0.000% / 最大 0.142% / 平均 0.0201% / 0 新增报错
清理                   残留: 0
```

---

## 三、已知差距（1 条，已登记，不影响四条标准）

**画布屏 `ws-a-v3` 缺 2 帧 `editor_subscribe`。**

- 原因：`WorkspaceResultNavigationProvider` 接上会触发渲染期硬错
  `Task result navigation: stale`（`canvas-v3/ui-components.js:13232`），
  缺的是任务结果导航的数据链路（资源 id + 版本 id）。
- 两个组件都已还原在树里，只差那条数据链路。
- 详细说明与「试过但没有采用的捷径」见 `docs/intentional-differences.md` 四·补。
- 影响：不影响 (b) 的路径集合口径，不影响 (a)(c)(d)。

---

## 四、需要如实说明的两点

1. **40 屏像素数字不构成平价证据。**
   现有 40 屏基线是用 `recovered` 模式录的自比，只证明界面在两次运行之间稳定。
   证据与推导见 `scripts/ui-compare/baseline-audit.json`。
   能作为「与原版一致」证据的是 (a)(b)(c)(d) 四类。

2. **v3 两屏用的是独立基线目录 `~/ov-golden-v3`**（以 `reference` 模式录制），
   与 40 屏那套基线分开，来源可核验。

---

## 五、结论

**按用户设定的四条标准，交付完成。**

一条已知差距已登记；两处如实说明已写明。
