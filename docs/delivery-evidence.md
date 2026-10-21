# 交付证据

按四条验收标准逐条给出可复现的命令与结果。**每条都标明证据类型与它不能证明什么。**

复现前提：仓库根目录、已装依赖；门禁命令见文末。

---

## 第 1 条：可达代码 0 unbound / 0 占位 / 0 真实重复 / 0 常量不一致

**证据类型**：静态分析（不依赖运行、不依赖截图）。

| 指标 | 命令 | 结果 |
|---|---|---|
| 可达代码缺口 / 解析失败 / 真实重复 | `node scripts/v3preload/audit-v3.mjs` | **三项均为 0** |
| 占位扫描 | `node scripts/v3preload/check-placeholders.mjs` | **1308 个文件，命中 0 处** |
| 未绑定 / 对象属性 | `node scripts/desource/check-undef.mjs` | **14 处，全部在 vendor.js，与白名单登记一致** |
| 常量对照 | `node scripts/v3preload/check-constants.mjs` | **一致 1849 / 不一致 0** |
| 类型逃逸 | `node scripts/desource/check-type-escapes.mjs` | **62 个文件，命中 0 处** |
| 全部自检 | `node scripts/v3preload/checks/run-all.mjs` | **✓ 全部自检通过** |

> 第 3 项那 14 处是 three.js 运行时往内建原型挂属性，登记在
> `scripts/desource/undef-allowlist.json`，理由见 `docs/intentional-differences.md` 第四节。
> 该检查已是 L0 阻断项：命中数必须等于登记总额。

**不能证明什么**：静态分析不证明运行时行为正确。运行时证据见第 2、3 条。

---

## 第 2 条：v3 关键操作与参照网络一致

**证据类型**：网络抓包对比（不依赖截图）。

### HTTP 路径集合

```
环境变量：HILO_PROJECT_ARCHITECTURE=resource_v3
ONLY=ws-a-v3 node scripts/ui-compare/compare.mjs
node scripts/ui-compare/compare-v3-network.mjs <recovered.net.json> <golden.net.json>
```

**结果：路径集合 23 vs 23，完全一致（已排除白名单）。**

白名单两条：`/api/v1/popup`（有意关闭）、`/api/v1/home/showcase-assets/`（本地资源）。

### WebSocket 帧类型集合

按 `type` 逐类比对（**按集合判定，不按条数**）：

| 屏 | 我方类型集合 | 参照类型集合 | 结论 |
|---|---|---|---|
| `ws-a-v3-resource` | `editor_subscribe` / `list_sessions` / `task_subscribe` / `task_unsubscribe` | 同一集合 | **完全一致，无单边独占类型** |
| `ws-a-v3` | 缺 `editor_subscribe` | 有 `editor_subscribe` | **符合预期**：该屏 `resourcesOpen=false`，不渲染 `NativeWorkbenchHost` |

### 已知限制

`ws-a-v3` 的 v3 内容在**独立原生 `WebContentsView`** 里，主窗口 `capturePage` 拍不到，
因此该屏的**像素**数字不能作为证据；网络与 WS 抓包不受此影响。

---

## 第 3 条：网关 v3 协议

**证据类型**：夹具重放（不依赖运行我们的 UI）。

```
node scripts/gateway-compare/compare.mjs
```

**结果：8 组夹具断言全部通过 + 71 条路径重放，真差异 0**（输出「✓ 协议完全一致（状态码 + 结构 + 固定字符串）」）。
4 条已登记的有意差异见 `scripts/gateway-compare/intentional.json` 与
`docs/intentional-differences.md` 第二节。

---

## 第 4 条：M6–M8

| 项 | 内容 | 结果 |
|---|---|---|
| M6 | v3 工具清单 | **25/25** |
| M7 | v3 agent 配置 | **20 个文件** |
| M8 | 打包契约 | `node scripts/verify-desktop-package.mjs` → **✓ 产物布局符合契约** |

---

## 横切：构建与测试

| 项 | 结果 |
|---|---|
| 渲染层构建 | **0 错** |
| desktop 构建 | **0 错** |
| desktop 类型检查 | **0 错** |
| desktop 测试 | **569 passed / 1 skipped** |
| mcp-tools 测试 | **199 passed** |
| `home` 屏 | **(0/0)** |

---

## 关于 40 屏像素回归的定位

**必须说清楚**：当前 40 屏基线是用 `recovered` 模式录的（自比），
所以「19 屏 0.000% / 最大 0.142% / 平均 0.0201%」
**只证明界面在两次运行之间稳定，不构成与原版一致的证据**。

证据与推导见 `scripts/ui-compare/baseline-audit.json`。

能作为「与原版一致」证据的，是本文件前面列的四类：
静态指标、网络路径与帧集合、网关协议重放、M6–M8 契约。

---

## 复现命令

```bash
# 门禁（全量 40 屏）
env -u ELECTRON_RUN_AS_NODE \
  GOLDEN="$HOME/ov-golden/.probe/ui-golden" \
  ELECTRON_DISABLE_SANDBOX=1 \
  OPENCODE_BIN="$HOME/.cache/opencode-v1.18.18/opencode" \
  SKIP_BUILD=1 SKIP_CHECK_UNDEF=1 \
  node scripts/ui-compare/compare.mjs

# v3 屏
env -u ELECTRON_RUN_AS_NODE HILO_PROJECT_ARCHITECTURE=resource_v3 \
  GOLDEN="$HOME/ov-golden/.probe/ui-golden" \
  ELECTRON_DISABLE_SANDBOX=1 \
  OPENCODE_BIN="$HOME/.cache/opencode-v1.18.18/opencode" \
  SKIP_BUILD=1 SKIP_CHECK_UNDEF=1 \
  ONLY=ws-a-v3,ws-a-v3-resource \
  node scripts/ui-compare/compare.mjs

# 每次跑完清理
bash scripts/ui-compare/cleanup.sh   # 期望输出：残留: 0
```
