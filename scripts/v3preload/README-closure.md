# 设施层闭包清单（closure-manifest.json）

**清单入库，以后只减不增。**

## 它是什么

`closure-plan.mjs` 从 4 个种子出发，在 4.0.0 主 bundle 里把所有被引用的顶层声明
算到**不动点**，停止边界是「树里已有的名字 + npm 导出」。

```
种子：createWorkspaceStructureRuntime / useWorkspaceStructureEvents /
      createTaskSubscriptionNegotiation / WorkspaceStructureProvider
```

## 当前数字（第 172 轮）

```
总量      77 个声明 / 约 3,001 行
每圈新增  4 → 12 → 15 → 18 → 23 → 3 → 2 → 0
状态      restored 28 · stub 1 · todo 48
严格/宽松  77 / 75（接近说明停止边界稳定）
```

装 `fractional-indexing@4.0.0` 之后从 98 降到 77（少掉 21 个第三方声明）。

## 怎么用

```bash
node scripts/v3preload/closure-plan.mjs          # 只看摘要
node scripts/v3preload/closure-plan.mjs --write  # 更新清单
```

**只允许往下减。** 若某次运行后 `total` 变大，说明有东西被误判成「树里没有」，
要先查原因，不要直接接受。

## 取回方式

按 `segments` 里的**连续区间**整段取回，不按名字逐个抽：

- 用 `start`/`end`（**字节偏移**，来自 `toplevel-4.0.0.json`）切片，不用行号；
- bundle 里的顺序就是求值顺序，按原顺序放进一个文件天然不会有 TDZ；
- 每段各自成文件，取回后跑 `check-tdz` + `checks/run-all`。

历史教训：按行号切片曾造成 `returnstructure = …` 重复拼接 4 次、
`layout : layout2=` 这类损坏，见 `find-damage.mjs`。

## 验收

**不看缺口数，看行为：**

```
ws-a-v3 的 wsSent 从 4 → 14（与 4.0.0 基线一致）
网络差异与基线对齐
像素差低于当前的 4.088%
```

缺口 0 只是前提，不是验收。
