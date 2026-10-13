# vendor.js 内联 xyflow 改动分析

基线：`devin/1791701596-renderer-desource` @ `478cc70`（分析期间 fetch 复核，`vendor.js` / `infra/from-vendor.js` 没变）。只读，仓库没动。
工具：Babel parser/traverse，在仓库外 `~/xyflow-analysis/tools`（附 tools.tgz）。逐声明映射见 `mapping.tsv`。

## 0. 结论摘要
- 配对上 220 个声明 = **180 一致 + 23 无行为影响 + 17 行为改动**（不一致合计 40）。和前期的 173 + 42 = 215 对不齐，见第 6 节。
- 17 处行为改动全是本应用自己改的：拿 system 0.0.77–0.0.83、react 12.11.0/12.11.6 同法比对，差异反而更多，所以不是从上游新版回移的。
- 改动的 xyflow 代码 import 了 15 个 `./infra/from-vendor.js` 里的应用 helper，补丁把它们原样内联进 dist（AST 跟应用源码 15/15 一致）。
- 打补丁后：全新解压 tarball → `patch -p1` → 重新比对，结果 **192 一致 + 29 无行为影响 + 0 行为差异**（多出的 1 个配对是内联进去的 `resolveInterpolate`），17 处全部消掉。
- 归属纠正：`createStore$2`（vendor 6323）、`getInitialState$1`（6209）是 `@xyflow/react` 的 store 工厂，不是 zustand 的；zustand 只有 `createStoreImpl$1`（2991 → zustand/vanilla `createStoreImpl`，差异只是 ENV）、`useStoreWithEqualityFn`/`createWithEqualityFn`（traditional）、`shallow`（shallow），这些都一致或无行为影响。`selector$a`（5076）对应 react 的 `selector$f`（NodesSelection 的 selector）。

## 1. 入口与闭包
| 包 | exports 选中的文件 | 说明 |
|---|---|---|
| @xyflow/system@0.0.76 | `browser.import` → `dist/esm/index.js` | `node.import` → `index.mjs`，内容与 index.js 字节一致 |
| @xyflow/react@12.10.2 | `browser.import` → `dist/esm/index.js` | 同上 |
| zustand@4.5.7 | `./vanilla`→`esm/vanilla.mjs`，`./traditional`→`esm/traditional.mjs`，`./shallow`→`esm/shallow.mjs` | |
| classcat@5.0.5 | `index.js` | |

- 闭包在 vendor 第 814–7560 行。配对到 npm 之外的声明只有：`resolveInterpolate`（2331，应用自加，被 XYPanZoom 用到）、`ReactDOM`（4263），以及打包互操作产物 `React`、`useSyncExternalStoreExports`、`__vite_import_meta_env__`。
- d3：本分支的 `d3-selection/drag/zoom/transition/interpolate/...` 都是 npm import（vendor 27–109 行），xyflow 闭包里没有内联的 d3 声明。
- npm 里有 214 个声明没出现在 vendor 中：要么没被用到被摇掉了，要么已经改成从 npm import。27 个声明同名候选不唯一，都按语句顺序对齐定下来了，最终全部是一致或无行为影响，不影响结论。

## 2. 无行为影响（23）——规则
| 规则 | 含义 |
|---|---|
| UNDEF | `undefined` ↔ `void 0` |
| ENV | `import.meta.env.MODE` / `process.env.NODE_ENV` 在生产构建里取值 `"production"` |
| FOLD / DEADIF / EMPTY | 常量折叠后得到 `if(false)` 死分支、空分支、空语句（开发期警告被裁掉） |
| VARCONST | var/let/const 互换（不重复声明、不再赋值） |
| REFARG | `useRef()` ↔ `useRef(void 0)` |
| UNUSEDCALL | 绑定从未使用的 `const x = call()` ↔ `call();` |
| ENUM | TS 枚举的两条语句 ↔ esbuild 合成的单表达式 |

| vendor 声明 | npm 声明（行） | 规则 |
|---|---|---|
| getNodesBounds$1 | system getNodesBounds 317-338 | UNDEF+ENV+FOLD+DEADIF+EMPTY |
| isValidHandle | system 2544-2588 | UNDEF |
| ResizeControlVariant | system 3067-3071 | ENUM+VARCONST |
| XYResizer | system 3319-3512 | UNDEF |
| createStoreImpl$1 | zustand vanilla createStoreImpl 1-29 | ENV |
| applyChanges / getSelectionChanges / getElementsDiffChanges | react 591-669 / 782-800 / 801-821 | UNDEF |
| useReactFlow, win$1, win | react 1032-1216, 1219, 1985 | UNDEF |
| ZoomPane / useDrag | react 1288-1379 / 1590-1629 | REFARG |
| HandleComponent / getNodeInlineStyleDimensions / createSimpleBezierEdge | react 1737-1862 / 1918-1929 / 2518-2532 | UNDEF |
| NodeWrapper$1（memo 包装）/ ReactFlow$1（=npm `index`） | react 2242 / 3628 | VARCONST |
| useNodeOrEdgeTypesWarning / useStylesLoadedWarning | react 3088-3103 / 3105-3119 | ENV+FOLD+DEADIF+EMPTY+UNUSEDCALL |
| selector$1（=npm selector$4）/ scaleSelector / ResizeControl | react 4049-4062 / 4659 / 4664-4803 | UNDEF |

（23 个声明全部在上表里；有些行合并了几个声明，完整清单见 mapping.tsv。）

## 3. 行为改动（17）
行号指 npm `dist/esm/index.js` 原文件。

### @xyflow/system@0.0.76
1. **getNodesInside 354-380**：新增第 6 个参数 `includeRenderBounds`，为真时用 `node.renderBounds` 外扩节点矩形；面积改按节点矩形计算，不再用 measured/initial 尺寸（这两个值还会算，但不再使用）；`excludeNonSelectableNodes` 为真时（框选时就是这样）去掉“未测量节点强制算进来”的逻辑。→ 影响框选范围、只渲染可见节点时的裁剪。
2. **XYDrag 2063-2291**：拖动吸附接口：`nodeDragSnapResolver({movingBounds, movement, draggedIds, referenceBounds, zoom, bypass: altKey, phase})`，结束时调用 `onNodeDragSnapEnd`。参考矩形只取其它节点：排除被拖节点和它们的子孙，跳过 hidden 和没测到尺寸的节点（`getDragSnapReferenceBounds`）。拖动过程中直接改 DOM 的 `style.transform`，用 rAF 合帧，同时直接重算相关连线，子节点跟着父节点平移；同一坐标去重（`lastProcessedPos`）；结束流程改成 `finishDrag`，用 `getEventHandlerParams` 回调 onNodeDragStop / onSelectionDragStop。→ 拖动、吸附、按住 Alt 不吸附、组拖动、拖动时连线跟随、拖动结束回调。
3. **XYMinimap 2594-2665**：新增 `getViewBB` / `getPointerPosition`；可平移时，只有按下点落在视口框内才开始拖动；解绑改为 `on('.zoom', null)`；返回对象里去掉了 `pointer`。→ 小地图拖动视口。
4. **wheelDelta 2685-2688**：Ctrl+滚轮 / 触控板捏合时，deltaY 先截到 ±10 再乘 0.01，不再区分 Mac×10；deltaMode=1 时 Ctrl 一律 ×10。→ 缩放速度。
5. **XYPanZoom 2876-3060**：`interpolate` 选项可以直接传函数（`resolveInterpolate`）；`prevViewport` 初值从 `{x:0,y:0,zoom:0}` 改为 `{}`；`userSelectionActive` 为真的分支（原来什么都不挂）现在也挂上 `zoom` 监听，忽略 `sourceEvent.sync` 事件，其余同步视口（框选时自动平移要用）。

### @xyflow/react@12.10.2
6. **reactFlowFieldsToTrack 187-246**：新增 `nodeDragSnapResolver`、`onNodeDragSnapEnd`、`snapGridShiftMultiplier`。
7. **Pane 1412-1560**：框选预览：给框内节点 DOM 加 `box-select-preview` class 和 `--box-select-preview-outline-width`。框选时光标贴边会自动平移（`calcAutoPan` + `edgeZones` + `maskAutoPanSides`，起点就在边缘时先离开 `AUTO_PAN_ARM_SLACK` 才启动）。选择变化用 `flushSync`。松手时 `nodesSelectionActive = 选中数 ≥ 2`（`getNodesSelectionActiveOnPointerUp`）。
8. **handleNodeClick 1568-1583**：原来点节点一律把 `nodesSelectionActive` 设成 false，现在按点击后的选中数是否 ≥ 2 来设（加选 +1，Shift/unselect 取消 −1）。→ 多选后 Shift 点其中一个、Shift 加选时选择框的显示。
9. **useMoveSelectedNodes 1638-1678**：调用 `updateNodePositions(..., false, 'keyboard')`，变更带上 `positionChangeSource`。
10. **selector$f 1931-1941**（NodesSelection 的 selector）：选择框包围盒排除 hidden 节点；新增 `multiSelectionActive`。
11. **NodesSelection 1942-1983**：方向键步长改为 `getKeyboardMoveFactor`：Shift 且 snapToGrid 时乘 `snapGridShiftMultiplier`（默认 4），否则 Shift 乘 4；`multiSelectionActive` 时 `pointerEvents:none`。
12. **useVisibleNodeIds 2015-2018**：`onlyRenderVisibleElements` 时向外多算 300px（overscan），平移不到 150px 且 zoom/尺寸/nodes 没变就复用上次结果；调用 `getNodesInside(..., true, false, true)`，带上 renderBounds。
13. **NodeWrapper 2101-2241**：单节点方向键移动，同第 11 条的 `getKeyboardMoveFactor`。
14. **GraphViewComponent 3121-3128**：**不再渲染 `EdgeRenderer`**，相关 props（onEdgeClick/onReconnect/defaultMarkerColor…）都去掉了。→ 连线不再由 xyflow 渲染，这些边事件不会触发。
15. **getInitialState 3132-3220**：新增默认值 `nodeDragSnapResolver/onNodeDragSnapEnd: undefined`、`snapGridShiftMultiplier: 4`。
16. **createStore 3222-3524**：去掉初始参数 `nodesSelectionActive`/`hasSelectedNodes`；setNodes 时 `nodesSelectionActive = 选中且未隐藏的节点数 ≥ 2`；`updateNodePositions(items, dragging, positionChangeSource)` 在 dragging=true 时直接改 nodeLookup（同步连接线起点、`cascadeAbsolutePosition` 级联子节点、`set({})`），不再触发 onNodesChange；变更对象带上 `positionChangeSource`。
17. **ReactFlow 3598-3607**：透传上面三个新 props。

## 4. 补丁
- `@xyflow__system@0.0.76.patch`：44 hunks，+1258/−270；`@xyflow__react@12.10.2.patch`：78 hunks，+882/−314。
- 每个文件 index.js 和 index.mjs 都打了一遍（两者原本相同），所以每条改动在 patch 里出现两次。
- 生成方式：沿 AST 逐层对齐（语句列表、参数、对象属性、实参）。相同的子树保留 dist 原文，不同的才替换、插入或删除，缩进和 tsc 输出一致（4 空格）。新增代码按 vendor 原样移植，包括 getNodesInside 里那两行不再使用的 `??` 表达式，保证 AST 一一对应。
- 内联的 helper：
  - react：edgeZones、AUTO_PAN_DISTANCE、AUTO_PAN_ARM_SLACK、maskAutoPanSides、getNodesSelectionActiveOnPointerUp、getKeyboardMoveFactor、DEFAULT_LARGE_MOVE_FACTOR、OVERSCAN_PX、RECOMPUTE_DELTA_PX、cascadeAbsolutePosition
  - system：getDragBounds、getDragSnapReferenceBounds、hasDraggedAncestor、getDragSnapAffectedIds、clamp$c、resolveInterpolate
- 新增 import：react 从 `@xyflow/system` 导入 `calcAutoPan`（已有导出），从 `react-dom` 导入 `flushSync`。
- 验证：全新解压 tarball → `patch -p1` 无 fuzz → `node --check` 通过 → 重跑比对：0 行为差异，15 个 helper AST 全部一致。

## 5. UI 门禁建议补的场景
1. 框选两个节点 → 出现选择框；Shift 点其中一个 → 只剩一个选中，选择框消失（第 8、16 条）。
2. 单选一个节点，Shift/Meta 加选第二个 → 选择框出现；再点空白 → 消失。
3. 选中三个节点，再把其中一个设为 hidden → 选择框包围盒只框可见的两个；只剩一个可见时选择框消失（第 10、16 条）。
4. 框选范围里有 hidden 节点和还没测到尺寸的节点 → 都不应被选中（第 1 条）。
5. 框选过程中节点有 `box-select-preview` 预览描边；松手后预览清掉（第 7 条）。
6. 框选拖到画布边缘 → 画布自动平移；起点就在边缘时，先离开边缘再回来才平移（第 5、7 条）。
7. 拖节点靠近另一个节点 → 吸附，触发 onNodeDragSnapEnd；按住 Alt 拖动 → 不吸附；hidden 节点不作为吸附参考（第 2 条）。
8. 拖动父分组 → 子节点和连线实时跟随，松手后位置正确并触发 onNodeDragStop；多选拖动触发 onSelectionDragStop（第 2、16 条）。
9. 开启 snapToGrid：方向键移动 1 格；Shift+方向键移动 `snapGridShiftMultiplier` 格（默认 4）；关闭 snapToGrid 时 Shift 步长为 4。单选（NodeWrapper）和多选（NodesSelection）各测一遍，并检查变更里 `positionChangeSource` 为 `keyboard`（第 9、11、13 条）。
10. 小地图：在视口框外按下拖动 → 不平移；在框内拖动 → 平移（第 3 条）。
11. Ctrl+滚轮 / 触控板捏合缩放：单次缩放幅度有上限，Mac 和 Windows 一致（第 4 条）。
12. 大画布开启只渲染可见元素：小幅平移不重新挂载节点，移出 300px 以外的节点才卸载；带外扩 renderBounds 的节点贴边时不被裁掉（第 1、12 条）。
13. 连线：确认由应用自己渲染，点击、悬停、重连行为正常（第 14 条）。

## 6. 无法确定的点
- 前期统计是 173 + 42（215），这里是 180 + 40（220）。没有前期的逐条清单，没法逐项对账。可能的原因：前期没有 UNDEF/REFARG/ENUM 等归一化规则，或者匹配方式不同（之前就出过 zustand 归属错误）。
- 第 14 条去掉 EdgeRenderer：只核对了 xyflow 闭包，没有核实应用里谁在渲染连线。
- 补丁是“让 npm dist 和 vendor 的行为一致”，不代表这些改动本身是对的；新增 props（nodeDragSnapResolver 等）没有改 `.d.ts`。
- 只核对了 vendor 814–7560 行这一段闭包；如果闭包外别处还有 xyflow 声明的拷贝，不在这次范围内（按引用闭包检查过，没有发现）。
