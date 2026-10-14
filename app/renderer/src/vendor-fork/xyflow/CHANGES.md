# xyflow fork 改动

底本是 npm 上可读的 ESM 入口，不是压缩包：

- `@xyflow/system@0.0.76` 的 `dist/esm/index.js` → `system/index.js`
- `@xyflow/react@12.10.2` 的 `dist/esm/index.js` → `react/index.js`

发布包的 sourcemap 只有 `sources` 路径，没有 `sourcesContent`，恢复不了拆开的 TypeScript。下面的行号是未改动的上游 `dist/esm/index.js`。

`react/index.js` 用 `../system/index.js` 引用旁边这份 system，不再依赖 npm 上的 `@xyflow/system`，避免产物里再打进一份。

应用 helper 不复制函数体，从 `../../../infra/from-vendor.js` 引入。system 直接用到的是 `clamp$c`、`getDragBounds`、`getDragSnapAffectedIds`、`getDragSnapReferenceBounds`。react 直接用到的是 `AUTO_PAN_ARM_SLACK`、`OVERSCAN_PX`、`RECOMPUTE_DELTA_PX`、`cascadeAbsolutePosition`、`edgeZones`、`getKeyboardMoveFactor`、`getNodesSelectionActiveOnPointerUp`、`maskAutoPanSides`。`hasDraggedAncestor`、`AUTO_PAN_DISTANCE`、`DEFAULT_LARGE_MOVE_FACTOR` 只被这些 helper 自己调用，留在 `from-vendor.js` 里。

`resolveInterpolate` 不是 `from-vendor.js` 里的函数，它跟平移缩放写在一起，留在 `system/index.js`。

上游用 `process.env.NODE_ENV === 'development'` 包着的开发期检查，在这里写成 `false`。浏览器包里没有 Node 的 `process`，这些分支本来也不会在生产构建里执行。

## @xyflow/system

### 1. getNodesInside（354–380）

增加第 6 个参数 `includeRenderBounds`。为真时用节点的 `renderBounds` 把矩形外扩。面积按节点矩形算，不再用 measured / initial 尺寸（这两个值仍会求，但不再参与判断）。`excludeNonSelectableNodes` 为真时，不再把还没测量过的节点强制算进来。框选范围、以及只渲染可见节点时的裁剪，都走这里。

### 2. XYDrag（2063–2291）

拖动可以吸附。`nodeDragSnapResolver` 收到 `{ movingBounds, movement, draggedIds, referenceBounds, zoom, bypass, phase }`，`bypass` 来自 Alt。松手时调用 `onNodeDragSnapEnd`。参考矩形只取其它节点：排除正在拖的节点和它们的子孙，跳过 hidden 和没有尺寸的节点（`getDragSnapReferenceBounds`）。拖动过程中直接改 DOM 的 `style.transform`，用 `requestAnimationFrame` 合帧，并当场重算相关连线；子节点跟着父节点平移。同一坐标不重复处理（`lastProcessedPos`）。结束走 `finishDrag`，用 `getEventHandlerParams` 调 `onNodeDragStop` / `onSelectionDragStop`。

### 3. XYMinimap（2594–2665）

增加 `getViewBB`、`getPointerPosition`。允许平移时，只有按下点落在视口框里才开始拖。解绑改成 `on('.zoom', null)`。返回对象里不再带 `pointer`。

### 4. wheelDelta（2685–2688）

Ctrl+滚轮或触控板捏合时，`deltaY` 先截到 ±10 再乘 0.01，不再把 Mac 单独乘 10。`deltaMode === 1` 时 Ctrl 一律乘 10。Mac 和 Windows 的单次缩放幅度因此一致，并且有上限。

### 5. XYPanZoom（2876–3060）

`interpolate` 选项可以直接传函数，由 `resolveInterpolate` 分辨：函数原样用，`'linear'` 用 d3 的 `interpolate`，否则用 `interpolateZoom`。`prevViewport` 初值从 `{ x: 0, y: 0, zoom: 0 }` 改成 `{}`。`userSelectionActive` 为真时也挂上 `zoom` 监听：忽略 `sourceEvent.sync`，其余照常同步视口，框选贴边自动平移要靠这个。

## @xyflow/react

### 6. reactFlowFieldsToTrack（187–246）

跟踪字段加上 `nodeDragSnapResolver`、`onNodeDragSnapEnd`、`snapGridShiftMultiplier`，好把它们放进 store。

### 7. Pane（1412–1560）

框选预览给框内节点 DOM 加上 `box-select-preview`，并设置 `--box-select-preview-outline-width`。框选时光标贴边会自动平移（`calcAutoPan`、`edgeZones`、`maskAutoPanSides`）；起点就在边缘时，要先离开 `AUTO_PAN_ARM_SLACK` 才启动。选择变化用 `flushSync` 提交。松手时 `nodesSelectionActive` 由 `getNodesSelectionActiveOnPointerUp` 决定：这次框选结束且选中数 ≥ 2 才为真。

### 8. handleNodeClick（1568–1583）

原来一点节点就把 `nodesSelectionActive` 设成 false。现在按点击之后的选中数是否 ≥ 2 来设（加选 +1，Shift 取消 −1）。多选后再 Shift 点其中一个，或 Shift 加选时，选择框会跟着出现或消失。

### 9. useMoveSelectedNodes（1638–1678）

调用 `updateNodePositions(..., false, 'keyboard')`，变更对象带上 `positionChangeSource: 'keyboard'`。

### 10. selector$f（1931–1941）

NodesSelection 的 selector。包围盒排除 hidden 节点，并多返回 `multiSelectionActive`。

### 11. NodesSelection（1942–1983）

方向键步长改用 `getKeyboardMoveFactor`：没按 Shift 是 1；按住 Shift 且开了 `snapToGrid` 时乘 `snapGridShiftMultiplier`（默认 4），否则 Shift 乘 4。`multiSelectionActive` 时选择框 `pointerEvents: none`，点击可以落到下面的节点上。

### 12. useVisibleNodeIds（2015–2018）

`onlyRenderVisibleElements` 时向外多算 `OVERSCAN_PX`（300）。平移不到 `RECOMPUTE_DELTA_PX`（150）且 zoom、尺寸、nodes 都没变，就复用上次结果。调用 `getNodesInside(..., true, false, true)`，带上 `renderBounds`。

### 13. NodeWrapper（2101–2241）

单个节点的方向键移动使用和第 11 条相同的 `getKeyboardMoveFactor`，变更同样带 `positionChangeSource: 'keyboard'`。

### 14. GraphViewComponent（3121–3128）

不再渲染 `EdgeRenderer`。`onEdgeClick`、`onReconnect`、`defaultMarkerColor` 等边事件参数从这里拿掉。连线由应用自己画，这些边事件不会从 xyflow 的 SVG 层触发。`EdgeRenderer` 函数还在本文件里，但画布视图不挂它。

### 15. getInitialState（3132–3220）

默认值增加 `nodeDragSnapResolver: undefined`、`onNodeDragSnapEnd: undefined`、`snapGridShiftMultiplier: 4`。

### 16. createStore（3222–3524）

去掉初始参数 `nodesSelectionActive` / `hasSelectedNodes`。`setNodes` 时 `nodesSelectionActive` 等于「选中且未隐藏的节点数 ≥ 2」。`updateNodePositions(items, dragging, positionChangeSource)` 在 `dragging === true` 时直接改 `nodeLookup`（同步连接线起点、`cascadeAbsolutePosition` 级联子节点、再 `set({})`），不触发 `onNodesChange`。变更对象带上 `positionChangeSource`。

### 17. ReactFlow（3598–3607）

把 `nodeDragSnapResolver`、`onNodeDragSnapEnd`、`snapGridShiftMultiplier` 传下去。

`createStore` 和 `getInitialState` 属于这份 react 源码，不是 zustand。zustand 4.5.7 只通过 `zustand/vanilla`、`zustand/traditional`、`zustand/shallow` 引入。`cc` 来自 classcat 5.0.5。
