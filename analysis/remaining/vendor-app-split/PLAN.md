# vendor.js 应用代码拆分计划

本文件只定方案。不改 `app/renderer/src/vendor.js`，不改依赖，不跑 `scripts/desource/gen-renderer.mjs`，不跑 `scripts/ui-compare/gate.sh`，不跑 `pnpm install`。

现在不能动手搬。第一批、第二批、第三批库声明都删掉，并且每一批自己的两轮 `gate.sh` 都通过之后，才能按声明名做这一步。当前行号只对这份工作副本的 `4b80e7ae` 有用，三批改完行号会再变。

## 1. 依据和口径

- 工作副本 `devin/vendor-app-split` @ `4b80e7ae`，`app/renderer/src/vendor.js` 828,241 字节。用 TypeScript 解析器取顶层声明（变量按每个声明符，函数和类按整段声明）。顶层声明 1,380 个，没有重名。
- 旧清单：`origin/devin/analysis-remaining-artifacts` @ `17686e0` 的 `analysis/remaining/vendor-residual/REPORT.md`、`TABLES.md`、`decls-final.json`。那份清单分析的是更早的 `vendor.js`（约 1,059,484 字节）。只 `git show`，没有 checkout。
- 换包删除表：`ov-desource-vplan` 的 `analysis/remaining/vendor-swap-plan/DELETIONS.md` 和 `PLAN.md`。`## @dagrejs/graphlib` 及以后不在三批里。graphlib 的名字在当前文件里已经不在。
- 三批删除表里的库声明共 850 个名字，当前文件里按名字都能找到，全部不算应用代码。`Plus$1` 和 222 个 `withIconCompositing(...)` 包装虽然列在 lucide 那一节，换包计划写明不删，算图标。
- 字节是声明节点源码的 UTF-8 长度。变量不含 `const` / `let` / `var` / `export` 关键字；函数和类含关键字。旧报告的 92,610 是字符长度，而且把后来确认的库代码算了进去，不能和这里的数直接相减。
- 调用方只扫了 `app/renderer/src` 里静态的 `import` / `export ... from`，路径以 `vendor.js` 或 `from-vendor.js` 结尾。没有 `import("…vendor.js")`。

## 2. 和旧清单 303 个声明的对账

旧清单 `status: none` 是 303 个声明、92,610 字节（启发式，含误归类）。按当前文件的名字核对：

| 去向 | 声明 | 说明 |
|---|---:|---|
| 当前文件里已经没有 | 8 | 在旧行号上夹在 xyflow 或 graphlib 段里，那两段已经删了：`__vite_import_meta_env__`、`identity$1`、`ge`、`hn$2`、`fn$1`、`pe`、`z$4`、`tr$2` |
| 第二批、第三批正文已经认领 | 7 | 见第 6 节。不重复计入 |
| 还在文件里、且 `status: none` | 288 | 其中 12 个是库胶水，17 个拿不准，259 个确定搬走或删掉 |
| 另加换包计划写明留下的图标 | 223 | `Plus$1` 1 个，`withIconCompositing` 包装 222 个。旧清单把它们标成 lucide-react |

确定处理的应用声明是 259 + 223 = **482** 个，**82,257** 字节。另有 24 个确定是库、17 个拿不准，都不算进这 482。

旧分类是启发式的，这里按当前函数体改了几处：

- `Brain$2` 到 `Wrench$2` 这 23 个写在旧「常量」里，初始化式是 `withIconCompositing(自定义图标)`，归图标。
- `MIN_SELECTED_NODE_SIZE`、`SELECTED_GLOW_BLUR`、`NODE_HIT_SLOP`、`ENTRY_OFFSET`、`ENTRY_DROP_RADIUS`、`GRID_COLUMN_COUNT_WIDE`、`decisionVersion` 写在旧「导入别名」里，它们是数字或计数器，按用途归到画布、资产网格或决策版本。
- `SelectIcon` 是 `__baseUiNamespace13.Icon`，归 import 别名。
- `resolveConnectorIcon` 旧清单在图标里，它只给连接器清单取 CDN 地址，归连接器市场。
- `pauseGeometry`、`playGeometry`、`nextGeometry` 是播放图标的 SVG，归图标。
- `E$4` 旧清单标成常量，函数体是 WaveSurfer 类。第二批正文要求删，不进应用拆分。

## 3. 确定拆走

下表是 482 个声明。路径都在 `app/renderer/src/` 已有目录下，不新造 `vendor/` 一层。调用方把 `from "…/vendor.js"` 改成从新路径 import，本地别名保持原样（`Download$2 as Download` 这种不要改成本地名）。

| 分组 | 声明 | 字节 | 落点 |
|---|---:|---:|---|
| 连接器市场 | 27 | 9,131 | `skills/connectors/hcp-catalog.js`、`skills/connectors/connector-market.js` |
| 画布 helper | 18 | 7,963 | `canvas/tidy-nodes.js`、`canvas/connection-target.js`、`canvas/selection-metrics.js`、`canvas/artwork-opacity.js` |
| 常量与配置 | 14 | 7,869 | `infra/file-type.js`、`media-editing/icon-compositing.js`、`infra/track-events.js`、`shared/tab-enter-class.js`、`workspace/browser-start-icon.js`、`generation/normalize-model-info.js` |
| 图标定义 | 291 | 32,778 | `media-editing/icon-compositing.js`、`media-editing/custom-icons.js`、`media-editing/lucide-icon-wraps.js`、`media-editing/playback-icons.js` |
| import 别名 | 83 | 3,544 | `infra/base-ui.js` |
| 构建 helper | 6 | 3,350 | `infra/cjs-interop.js`、`（不新建文件，三批之后若仍无调用方就删）` |
| 其他 | 43 | 17,622 | `infra/file-type.js`、`media-editing/action-list.jsx`、`infra/logger.js`、`infra/use-storage.js`、`infra/start-perf-observer.js`、`infra/decision-version.js`、`workspace/use-new-project-folder.js`、`workspace/workspace-folder-missing.js`、`skills/skill-cover-url.js`、`generation/browser-image-edit.js`、`generation/prompt-font-size.js`、`i18n/localized-text.js`、`chat/media-tool-result.js`、`chat/chat-rating-controls.jsx`、`assets/visible-cloud-uploads.js`、`assets/grid-row-size.js`、`text-editor/editor-doc-snapshot.js`、`infra/agent-http-client.js`、`team/team-ledger-filters.jsx` |
| 合计 | 482 | 82,257 | |

建议落点 35 个：28 个新文件，6 个已有文件（`infra/track-events.js`、`generation/normalize-model-info.js`、`infra/start-perf-observer.js`、`chat/chat-rating-controls.jsx`、`infra/agent-http-client.js`、`team/team-ledger-filters.jsx`），外加 `infra/cjs-interop.js`，这个文件只在三批之后应用还调用 `getDefaultExportFromCjs$1` 时才建。构建 helper 里另外 5 个声明不落文件。`infra/file-type.js` 和 `media-editing/icon-compositing.js` 各出现在两个分组里，是同一个文件。

### 3.1 连接器市场

27 个声明，9,131 字节。

#### `skills/connectors/hcp-catalog.js`

新文件。动态连接器清单：版本门槛、能力过滤、合并缓存、按 id 查找、图标和安装素材地址。`mergedCache` 没有应用 import，只给同文件的注册和读取用。下面列出的 from-vendor 名字从 `infra/from-vendor.js` import，不复制。

本组名字 13 个，3,472 字节：`satisfiesMinHubVersion`（878 行，278 字节）、`isDynamicallyDeliverable`（884 行，804 字节）、`buildHcpCatalogEntries`（901 行，676 字节）、`registerDynamicHcpManifests`（20293 行，196 字节）、`mergedCache`（20292 行，11 字节）、`getMergedHcpCatalogEntries`（20301 行，93 字节）、`getMergedHcpCatalog`（20305 行，102 字节）、`findHcpConnector`（20308 行，149 字节）、`hcpToDefinition`（20325 行，754 字节）、`isSkillsOnly`（23678 行，133 字节）、`resolveConnectorIcon`（20211 行，75 字节）、`resolveConnectorSetupAsset`（20217 行，108 字节）、`CONNECTOR_SETUP_ASSET_BY_KEY`（20214 行，93 字节）。

对外导出 8 个：`satisfiesMinHubVersion`、`registerDynamicHcpManifests`、`getMergedHcpCatalog`、`findHcpConnector`、`hcpToDefinition`、`isSkillsOnly`、`resolveConnectorIcon`、`resolveConnectorSetupAsset`。
同文件内部 5 个，不导出：`isDynamicallyDeliverable`、`buildHcpCatalogEntries`、`mergedCache`、`getMergedHcpCatalogEntries`、`CONNECTOR_SETUP_ASSET_BY_KEY`。
声明体里引用的 from-vendor 名字：`compareSemver`、`parseSemver`、`matchesLocalConnectorServer`、`getCdnRegion`、`CDN_TOUCHDESIGNER_COMPONENTS`。新文件改为从 `infra/from-vendor.js`（或第 7 节拆开之后的模块）import。

现在从 vendor.js import 这些导出的应用文件 7 个：

`debug-panel/debug-panel-dialog.jsx`、`settings/connector-capability-card.jsx`、`settings/connector-hub-o-auth-section.jsx`、`settings/request-prompt-prefill.jsx`、`settings/use-connector-catalog.js`、`skills/connectors/connector-catalog-data.jsx`、`skills/connectors/connector-detail.jsx`。

#### `skills/connectors/connector-market.js`

新文件。市场策略、@ 提及、特殊连接器、状态文案、清单库存。`namesMatch$1` 和 `originsMatch$1` 的函数体与 `infra/from-vendor.js` 里的 `namesMatch`、`originsMatch` 相同。这两份不要再搬出一份新绑定：删掉 vendor 里的副本，调用改到已有的那两个函数。`matchesRemoteConnectorServer` 继续用它们。`SPECIAL_CONNECTORS` 和 `findConnectorMentions` 还依赖 from-vendor 的 `CONNECTOR_TOKEN_SOURCE` 等。

本组名字 14 个，5,659 字节：`emptyConnectorMarketPolicy`（925 行，160 字节）、`findConnectorMentions`（935 行，317 字节）、`FIGMA_DESKTOP_MCP`（20288 行，88 字节）、`SPECIAL_CONNECTORS`（20347 行，716 字节）、`matchesRemoteConnectorServer`（20322 行，259 字节）、`namesMatch$1`（20311 行，110 字节）、`originsMatch$1`（20314 行，168 字节）、`buildOfficialConnectorList`（20366 行，376 字节）、`connectorDescription`（23675 行，179 字节）、`supportsConnectorDialog`（23681 行，548 字节）、`connectorPromptActionLabelKey`（23691 行，351 字节）、`CONNECTOR_STATUS_VISUAL`（23699 行，546 字节）、`connectorSummaryActionLabelKey`（23733 行，282 字节）、`createConnectorInventory`（22126 行，1,559 字节）。

对外导出 11 个：`emptyConnectorMarketPolicy`、`findConnectorMentions`、`SPECIAL_CONNECTORS`、`matchesRemoteConnectorServer`、`buildOfficialConnectorList`、`connectorDescription`、`supportsConnectorDialog`、`connectorPromptActionLabelKey`、`CONNECTOR_STATUS_VISUAL`、`connectorSummaryActionLabelKey`、`createConnectorInventory`。
同文件内部 3 个，不导出：`FIGMA_DESKTOP_MCP`、`namesMatch$1`、`originsMatch$1`。
声明体里引用的 from-vendor 名字：`CONNECTOR_TOKEN_SOURCE`、`LIBTV_CONNECTOR`、`libtvIconUrl`、`namesMatch`、`originsMatch`。新文件改为从 `infra/from-vendor.js`（或第 7 节拆开之后的模块）import。

现在从 vendor.js import 这些导出的应用文件 13 个：

`debug-panel/debug-panel-dialog.jsx`、`home/scene.js`、`settings/connector-api-key-section.jsx`、`settings/connector-capability-card.jsx`、`settings/connector-prompt-action.jsx`、`settings/local-connector-setup-content.jsx`、`settings/request-prompt-prefill.jsx`、`settings/use-connector-catalog.js`、`skills/connectors/connector-catalog-data.jsx`、`skills/connectors/connector-detail.jsx`、`skills/connectors/connectors-tab.jsx`、`skills/connectors/local-connector.jsx`、`text-editor/get-wire-content-text.jsx`。

### 3.2 画布 helper

18 个声明，7,963 字节。

#### `canvas/tidy-nodes.js`

新文件。整理节点时的名字、加入时间和稳定排序。`normalizeLabel$1` 用 from-vendor 的 `GROUP_LABEL_MAX_LENGTH`。`nameCollator`、`nonEmpty`、`addedAt`、`stableOrder` 没有外部 import，跟排序函数放一起。

本组名字 8 个，2,300 字节：`normalizeLabel$1`（365 行，262 字节）、`nonEmpty`（13549 行，85 字节）、`tidyNodeName`（13550 行，363 字节）、`addedAt`（13555 行，156 字节）、`stableOrder`（13559 行，255 字节）、`orderTidyNodes`（13569 行，595 字节）、`pinnedTidyNodeIds`（13585 行，502 字节）、`nameCollator`（13545 行，82 字节）。

对外导出 4 个：`normalizeLabel$1`、`tidyNodeName`、`orderTidyNodes`、`pinnedTidyNodeIds`。
同文件内部 4 个，不导出：`nonEmpty`、`addedAt`、`stableOrder`、`nameCollator`。
声明体里引用的 from-vendor 名字：`GROUP_LABEL_MAX_LENGTH`。新文件改为从 `infra/from-vendor.js`（或第 7 节拆开之后的模块）import。

现在从 vendor.js import 这些导出的应用文件 2 个：

`canvas/canvas-instance.js`、`canvas/group-nodes-in-canvas.js`。

#### `canvas/connection-target.js`

新文件。拖线落点、落点标记、小地图矩形。`findConnectionTarget` 和 `nodeToMiniMapRect` 调用的 `findHitTarget`、`flowPointToMiniMap` 已经在 from-vendor.js。`ENTRY_OFFSET`、`ENTRY_DROP_RADIUS` 只被同文件使用。

本组名字 5 个，4,837 字节：`findConnectionTarget`（13430 行，1,732 字节）、`ConnectionTargetMarker`（13466 行，2,577 字节）、`ENTRY_OFFSET`（13428 行，17 字节）、`ENTRY_DROP_RADIUS`（13429 行，22 字节）、`nodeToMiniMapRect`（13412 行，489 字节）。

对外导出 3 个：`findConnectionTarget`、`ConnectionTargetMarker`、`nodeToMiniMapRect`。
同文件内部 2 个，不导出：`ENTRY_OFFSET`、`ENTRY_DROP_RADIUS`。
声明体里引用的 from-vendor 名字：`CanvasNodeType`、`findHitTarget`、`flowPointToMiniMap`。新文件改为从 `infra/from-vendor.js`（或第 7 节拆开之后的模块）import。

现在从 vendor.js import 这些导出的应用文件 3 个：

`canvas/canvas-mini-map.jsx`、`canvas/canvas-shell-inner.jsx`、`canvas/use-connect-to-add-node.js`。

#### `canvas/selection-metrics.js`

新文件。选中描边和命中余量，以及生成媒体节点的筛选。三个数字常量各有自己的调用方。

本组名字 4 个，632 字节：`MIN_SELECTED_NODE_SIZE`（13409 行，26 字节）、`SELECTED_GLOW_BLUR`（13410 行，22 字节）、`NODE_HIT_SLOP`（13411 行，17 字节）、`selectGeneratedMediaNodeIds`（13536 行，567 字节）。

对外导出 4 个：`MIN_SELECTED_NODE_SIZE`、`SELECTED_GLOW_BLUR`、`NODE_HIT_SLOP`、`selectGeneratedMediaNodeIds`。
声明体里引用的 from-vendor 名字：`BACKEND_VIBE_STORYBOARD`、`CanvasNodeType`、`isUserProvidedAssetModel`。新文件改为从 `infra/from-vendor.js`（或第 7 节拆开之后的模块）import。

现在从 vendor.js import 这些导出的应用文件 2 个：

`canvas/canvas-mini-map.jsx`、`canvas/use-canvas-data.js`。

#### `canvas/artwork-opacity.js`

新文件。把透明度写进作品滤镜。调用方是 `canvas/fullscreen-icon.jsx` 和 `media-editing/package.jsx`。

本组名字 1 个，194 字节：`withArtworkOpacity`（4895 行，194 字节）。

对外导出 1 个：`withArtworkOpacity`。

现在从 vendor.js import 这些导出的应用文件 2 个：

`canvas/fullscreen-icon.jsx`、`media-editing/package.jsx`。

### 3.3 常量与配置

14 个声明，7,869 字节。

#### `infra/file-type.js`

新文件。扩展名、MIME 和文件类型字形路径，加上 `classifyFileType`。字形和表是常量，三个函数是读取它们的 helper，放同一个文件，避免两处各持一份表。`extensions`、`exactMime` 没有外部 import。`BODY` / `FOLD` / `ARCHIVE_ZIPPER` / `JPEG` 的现有调用在 `infra/file-type-icon.jsx`。

本组名字 7 个，6,074 字节：`BODY`（4910 行，465 字节）、`FOLD`（4911 行，352 字节）、`ARCHIVE_ZIPPER`（4912 行，1,191 字节）、`JPEG`（4913 行，2,728 字节）、`FILE_TYPE_EXTENSIONS`（4914 行，572 字节）、`extensions`（4928 行，128 字节）、`exactMime`（4933 行，638 字节）。

对外导出 5 个：`BODY`、`FOLD`、`ARCHIVE_ZIPPER`、`JPEG`、`FILE_TYPE_EXTENSIONS`。
同文件内部 2 个，不导出：`extensions`、`exactMime`。

现在从 vendor.js import 这些导出的应用文件 2 个：

`infra/file-type-icon.jsx`、`media-editing/action-list-section.jsx`。

#### `media-editing/icon-compositing.js`

新文件。图标合成：`withIconCompositing`、`CompositedSvg`、单色图标、线宽。`TONES`、`ICON_CLASS_FILTERS`、`ICON_STROKE_SPEC` 是常量，只给这套合成用，所以跟组件放同一个文件，分组统计仍算在常量里。`TONES` 和 `ICON_CLASS_FILTERS` 没有外部 import。

本组名字 3 个，984 字节：`ICON_CLASS_FILTERS`（620 行，201 字节）、`TONES`（692 行，442 字节）、`ICON_STROKE_SPEC`（16380 行，341 字节）。

对外导出 1 个：`ICON_STROKE_SPEC`。
同文件内部 2 个，不导出：`ICON_CLASS_FILTERS`、`TONES`。

现在从 vendor.js import 这些导出的应用文件 2 个：

`infra/media-preview.jsx`、`workspace/use-prompt-icon.jsx`。

#### `infra/track-events.js`

写进已有文件。它现在从 vendor.js import `AUTH_TRACK_EVENTS`，把常量搬进这个文件，删掉那行 import。

本组名字 1 个，348 字节：`AUTH_TRACK_EVENTS`（13612 行，348 字节）。

对外导出 1 个：`AUTH_TRACK_EVENTS`。

现在从 vendor.js import 这些导出的应用文件 1 个：

`infra/track-events.js`。

#### `shared/tab-enter-class.js`

新文件。页签内容的进入动画类名。调用方分散在 skills、workflows、workspace，不塞进其中某一个。

本组名字 1 个，137 字节：`TAB_CONTENT_ENTER_CLASS_NAME`（23761 行，137 字节）。

对外导出 1 个：`TAB_CONTENT_ENTER_CLASS_NAME`。

现在从 vendor.js import 这些导出的应用文件 4 个：

`projects/index.jsx`、`skills/index.jsx`、`workflows/index.jsx`、`workspace/browser-bookmarks.jsx`。

#### `workspace/browser-start-icon.js`

新文件。浏览器起始图标的 CDN 路径。调用方是 `skills/connectors/browser-connector.jsx` 和 `workspace/browser-bookmarks.jsx`。用 from-vendor 的 `cdnPublicAsset`。

本组名字 1 个，302 字节：`CDN_BROWSER_START_ICON`（20201 行，302 字节）。

对外导出 1 个：`CDN_BROWSER_START_ICON`。
声明体里引用的 from-vendor 名字：`cdnPublicAsset`。新文件改为从 `infra/from-vendor.js`（或第 7 节拆开之后的模块）import。

现在从 vendor.js import 这些导出的应用文件 2 个：

`skills/connectors/browser-connector.jsx`、`workspace/browser-bookmarks.jsx`。

#### `generation/normalize-model-info.js`

写进已有文件。

本组名字 1 个，24 字节：`QUERY_KEY$1`（16524 行，24 字节）。

对外导出 1 个：`QUERY_KEY$1`。

现在从 vendor.js import 这些导出的应用文件 1 个：

`generation/normalize-model-info.js`。

### 3.4 图标定义

291 个声明，32,778 字节。

#### `media-editing/icon-compositing.js`

新文件。图标合成：`withIconCompositing`、`CompositedSvg`、单色图标、线宽。`TONES`、`ICON_CLASS_FILTERS`、`ICON_STROKE_SPEC` 是常量，只给这套合成用，所以跟组件放同一个文件，分组统计仍算在常量里。`TONES` 和 `ICON_CLASS_FILTERS` 没有外部 import。

本组名字 5 个，5,104 字节：`withIconCompositing`（621 行，2,562 字节）、`IconCompositingContext`（619 行，57 字节）、`CompositedSvg`（729 行，1,789 字节）、`MonochromeIcon`（710 行，455 字节）、`getIconStrokeWidth`（16405 行，241 字节）。

对外导出 5 个：`withIconCompositing`、`IconCompositingContext`、`CompositedSvg`、`MonochromeIcon`、`getIconStrokeWidth`。

现在从 vendor.js import 这些导出的应用文件 78 个：

`canvas/assets-tab-panel.jsx`、`canvas/canvas-context-menu.jsx`、`canvas/canvas-load-error.jsx`、`canvas/canvas-move-object-overlay.jsx`、`canvas/canvas-outpaint-overlay.jsx`、`canvas/canvas-toggle-icon.jsx`、`canvas/canvas-toolbar.jsx`、`canvas/canvas-view-controls.jsx`、`canvas/diagnostic-history-tools.js`、`canvas/file-missing-icon.jsx`、`canvas/fullscreen-icon.jsx`、`canvas/generating-media-area.jsx`、`canvas/multi-select-plus-handle-inner.jsx`、`canvas/node-header-inner.jsx`、`canvas/node-shell-inner.jsx`、`canvas/proximity-handle-inner.jsx`、`canvas/selection-toolbar-inner.jsx`、`canvas/tidy-layout-menu-items.jsx`、`canvas/tool-mode-split-button.jsx`、`canvas/use-inline-rename.jsx`、`chat/assistant-message-actions.jsx`、`chat/chat-rating-controls.jsx`、`chat/mode-selector.jsx`、`chat/question-dock.jsx`、`chat/use-composer-placeholder-actions.jsx`、`debug-panel/icon-opacity-preview-section.jsx`、`debug-panel/opacity-sample-cell.jsx`、`generation/aspect-ratio-grid.jsx`、`generation/expand-arrow-icon.jsx`、`generation/file-chip.jsx`、`generation/media-error-card.jsx`、`generation/missing-asset-card.jsx`、`generation/params-chip.jsx`、`generation/resolution-tabs.jsx`、`generation/tool-confirm-card.jsx`、`generation/use-portal-anchor-placement.jsx`、`infra/error-fallback-ui.jsx`、`media-editing/angle-scrubber.jsx`、`media-editing/audio-action-surface.jsx`、`media-editing/camera-ball.jsx`、`media-editing/canvas-sticker-assets.jsx`、`media-editing/compute-multi-image-grid-positions.jsx`、`media-editing/condition-row.jsx`、`media-editing/create-column.jsx`、`media-editing/customize-toolbar-dialog.jsx`、`media-editing/director-stage-header-icon.jsx`、`media-editing/field-row.jsx`、`media-editing/image-inplace-edit-toolbar-inner.jsx`、`media-editing/image-node-toolbar-section.jsx`、`media-editing/image-slot-list.jsx`、`media-editing/media-hover-preview.jsx`、`media-editing/media-lightbox.jsx`、`media-editing/multi-angle-editor.jsx`、`media-editing/package.jsx`、`media-editing/panorama-viewer.jsx`、`media-editing/pdf-viewer.jsx`、`media-editing/plane-quad.jsx`、`media-editing/plugin-node-inner.jsx`、`media-editing/thumb-chip.jsx`、`media-editing/toolbar-item.jsx`、`media-editing/video-node-inner.jsx`、`projects/index.jsx`、`settings/diagnostics-status-button.jsx`、`settings/recent-project-group-header.jsx`、`settings/search-button.jsx`、`text-editor/error-block.jsx`、`text-editor/skill-reload-dock.jsx`、`text-editor/table-editor-inner.jsx`、`text-editor/table-node-inner.jsx`、`text-editor/todo-card.jsx`、`vendor-inline/vscode-base/graph.jsx`、`workspace/home-service.jsx`、`workspace/home-sidebar.jsx`、`workspace/move-workspace-dialog.jsx`、`workspace/recent-project-row.jsx`、`workspace/recent-projects-header-actions.jsx`、`workspace/sidebar-nav-button.jsx`、`workspace/use-prompt-icon.jsx`。

#### `media-editing/custom-icons.js`

新文件。形状对不上已装 lucide 的那套图标，工厂是 `createLucideIcon$1`（比 0.468 的 `createLucideIcon` 多 viewBox 和填充参数）。`$3` 是几何，`$2` 是 `withIconCompositing` 包一层。工厂从 `icon-compositing.js` 引进包装函数。没有外部 import 的几何不要单独导出。

本组名字 48 个，9,160 字节：`createLucideIcon$1`（379 行，1,385 字节）、`Brain$3`（422 行，471 字节）、`Check$3`（435 行，224 字节）、`ChevronDown$3`（443 行，234 字节）、`CircleAlert$3`（451 行，169 字节）、`Clapperboard$3`（458 行，364 字节）、`Download$3`（466 行，176 字节）、`ExternalLink$3`（471 行，300 字节）、`Eye$3`（479 行，237 字节）、`File$4`（486 行，240 字节）、`Film$3`（491 行，224 字节）、`FolderInput$3`（500 行，262 字节）、`Headphones$3`（505 行，342 字节）、`Megaphone$3`（513 行，292 字节）、`Music$3`（518 行，210 字节）、`Package$3`（529 行，278 字节）、`Plus$3`（534 行，223 字节）、`Search$3`（542 行，159 字节）、`Share2$3`（549 行，296 字节）、`ShoppingBag$3`（564 行，288 字节）、`Square$3`（569 行，272 字节）、`Trash2$3`（581 行，311 字节）、`Ungroup$1`（589 行，233 字节）、`Video$3`（602 行，243 字节）、`Wrench$3`（611 行，404 字节）、`Brain$2`（852 行，53 字节）、`Check$2`（853 行，53 字节）、`ChevronDown$2`（854 行，65 字节）、`CircleAlert$2`（855 行，65 字节）、`Clapperboard$2`（856 行，67 字节）、`Download$2`（857 行，59 字节）、`ExternalLink$2`（858 行，67 字节）、`Eye$2`（859 行，49 字节）、`File$3`（860 行，51 字节）、`Film$2`（861 行，51 字节）、`FolderInput$2`（862 行，65 字节）、`Headphones$2`（863 行，63 字节）、`Megaphone$2`（864 行，61 字节）、`Music$2`（865 行，53 字节）、`Package$2`（866 行，57 字节）、`Plus$2`（867 行，51 字节）、`Search$2`（868 行，55 字节）、`Share2$2`（869 行，55 字节）、`ShoppingBag$2`（870 行，65 字节）、`Square$2`（871 行，55 字节）、`Trash2$2`（872 行，55 字节）、`Video$2`（873 行，53 字节）、`Wrench$2`（874 行，55 字节）。

对外导出 24 个：`Ungroup$1`、`Brain$2`、`Check$2`、`ChevronDown$2`、`CircleAlert$2`、`Clapperboard$2`、`Download$2`、`ExternalLink$2`、`Eye$2`、`File$3`、`Film$2`、`FolderInput$2`、`Headphones$2`、`Megaphone$2`、`Music$2`、`Package$2`、`Plus$2`、`Search$2`、`Share2$2`、`ShoppingBag$2`、`Square$2`、`Trash2$2`、`Video$2`、`Wrench$2`。
同文件内部 24 个，不导出：`createLucideIcon$1`、`Brain$3`、`Check$3`、`ChevronDown$3`、`CircleAlert$3`、`Clapperboard$3`、`Download$3`、`ExternalLink$3`、`Eye$3`、`File$4`、`Film$3`、`FolderInput$3`、`Headphones$3`、`Megaphone$3`、`Music$3`、`Package$3`、`Plus$3`、`Search$3`、`Share2$3`、`ShoppingBag$3`、`Square$3`、`Trash2$3`、`Video$3`、`Wrench$3`。
声明体里引用的 from-vendor 名字：`getDefaultStrokeWidth`。新文件改为从 `infra/from-vendor.js`（或第 7 节拆开之后的模块）import。

现在从 vendor.js import 这些导出的应用文件 15 个：

`assets/asset-mention-list.jsx`、`assets/entity-row.jsx`、`assets/general-section.jsx`、`canvas/diagnostic-history-tools.js`、`debug-panel/icon-opacity-preview-section.jsx`、`debug-panel/project-icon-catalog.jsx`、`media-editing/audio-node-inner.jsx`、`media-editing/canvas-sticker-assets.jsx`、`media-editing/group-node-inner.jsx`、`media-editing/image-slot-body.jsx`、`media-editing/multi-image-chrome.jsx`、`media-editing/ready-sub-video-card.jsx`、`skills/my-skills/skill-cards.jsx`、`workflows/workflow-card.jsx`、`workspace/slash-command-popover-content.jsx`。

#### `media-editing/lucide-icon-wraps.js`

新文件。222 个包装加上 `Plus$1`。必须等第二批把内联的 0.468 图标换成 `lucide-react-0468` 之后再写这个文件。包装改成 `withIconCompositing(从 lucide-react-0468 导入的组件)`，包装函数从 `icon-compositing.js` 导入。`Plus$1` 用包里的 `createLucideIcon`，几何是加长十字加四个端点圆，key 为 `ov-plus-*`。不要把 `Plus$1` 打进 lucide 补丁。

本组名字 223 个，13,248 字节：`ActivityIcon`（4673 行，59 字节）、`AlertCircle`（4674 行，63 字节）、`AlertTriangle`（4675 行，67 字节）、`AlertTriangleIcon`（4676 行，71 字节）、`AppWindow`（4677 行，59 字节）、`Archive`（4678 行，55 字节）、`ArrowDown`（4679 行，59 字节）、`ArrowDownToLine`（4680 行，71 字节）、`ArrowLeft`（4681 行，59 字节）、`ArrowLeftRight`（4682 行，69 字节）、`ArrowLeftToLine`（4683 行，71 字节）、`ArrowRight`（4684 行，61 字节）、`ArrowRightToLine`（4685 行，73 字节）、`ArrowUp`（4686 行，55 字节）、`ArrowUpDown`（4687 行，63 字节）、`ArrowUpFromLine`（4688 行，71 字节）、`ArrowUpRight`（4689 行，65 字节）、`ArrowUpToLine`（4690 行，67 字节）、`AtSign`（4691 行，53 字节）、`AudioLines`（4692 行，61 字节）、`AudioWaveform$1`（4693 行，69 字节）、`BadgeCheck`（4694 行，61 字节）、`BadgeInfo`（4695 行，59 字节）、`Bell`（4696 行，49 字节）、`BellRing`（4697 行，57 字节）、`Bold$1`（4698 行，51 字节）、`BookUser`（4699 行，57 字节）、`Bot`（4700 行，47 字节）、`Box`（4701 行，47 字节）、`BoxSelect`（4703 行，62 字节）、`Boxes`（4702 行，51 字节）、`Bug`（4704 行，47 字节）、`Calculator`（4705 行，61 字节）、`ChartNoAxesCombined`（4706 行，79 字节）、`Check`（4707 行，51 字节）、`CheckCheck`（4708 行，61 字节）、`CheckCircle2`（4709 行，62 字节）、`CheckCircle2Icon`（4710 行，66 字节）、`ChevronDown`（4711 行，63 字节）、`ChevronDownIcon$1`（4712 行，69 字节）、`ChevronLeft`（4713 行，63 字节）、`ChevronLeftIcon`（4714 行，67 字节）、`ChevronRight$1`（4715 行，67 字节）、`ChevronRightIcon`（4716 行，69 字节）、`ChevronUp`（4717 行，59 字节）、`ChevronUpIcon`（4718 行，63 字节）、`CircleAlert`（4719 行，63 字节）、`CircleArrowUp`（4720 行，67 字节）、`CircleCheckIcon`（4721 行，65 字节）、`CircleIcon`（4722 行，57 字节）、`CircleMinus`（4723 行，63 字节）、`CircleX`（4724 行，55 字节）、`ClipboardIcon`（4725 行，61 字节）、`ClipboardList`（4726 行，67 字节）、`Cloud`（4727 行，51 字节）、`CloudDownload`（4728 行，67 字节）、`CloudIcon`（4729 行，55 字节）、`CloudUpload`（4730 行，63 字节）、`Code$1`（4731 行，51 字节）、`Cog`（4732 行，47 字节）、`Command`（4733 行，55 字节）、`Compass`（4734 行，55 字节）、`Copy`（4735 行，49 字节）、`CopyPlus`（4736 行，57 字节）、`CreditCard`（4737 行，61 字节）、`Crosshair`（4738 行，59 字节）、`Crown`（4739 行，51 字节）、`DownloadIcon`（4740 行，61 字节）、`Ellipsis`（4741 行，57 字节）、`ExternalLink`（4742 行，65 字节）、`Eye`（4743 行，47 字节）、`EyeIcon$1`（4744 行，53 字节）、`EyeOff`（4745 行，53 字节）、`EyeOffIcon$1`（4746 行，59 字节）、`FileImage`（4747 行，59 字节）、`FilePlus2`（4748 行，59 字节）、`Film`（4749 行，49 字节）、`FolderClock`（4750 行，63 字节）、`FolderClosed`（4751 行，65 字节）、`FolderInput`（4752 行，63 字节）、`FolderMinus`（4753 行，63 字节）、`FolderOpenIcon`（4754 行，65 字节）、`FolderPlus`（4755 行，61 字节）、`FolderUp`（4756 行，57 字节）、`FolderX`（4757 行，55 字节）、`Gauge`（4758 行，51 字节）、`GiftIcon`（4759 行，51 字节）、`GitCompare`（4760 行，61 字节）、`Globe`（4761 行，51 字节）、`Globe2`（4762 行，50 字节）、`GraduationCap`（4763 行，67 字节）、`Grid2X2`（4764 行，53 字节）、`Grid2x2Plus`（4765 行，63 字节）、`Grid3X3`（4766 行，53 字节）、`GripHorizontalIcon`（4767 行，71 字节）、`GripVertical`（4768 行，65 字节）、`Hand`（4769 行，49 字节）、`Headphones`（4770 行，61 字节）、`HistoryIcon`（4771 行，59 字节）、`Home`（4772 行，48 字节）、`ImagePlus`（4773 行，59 字节）、`Import`（4774 行，53 字节）、`Inbox`（4775 行，51 字节）、`Info$1`（4776 行，51 字节）、`InfoIcon$1`（4777 行，55 字节）、`Italic$1`（4778 行，55 字节）、`KeyRound`（4779 行，57 字节）、`Keyboard`（4780 行，57 字节）、`Languages`（4781 行，59 字节）、`Layers`（4782 行，53 字节）、`Layers2`（4783 行，55 字节）、`Layers3`（4784 行，54 字节）、`LayoutGrid`（4785 行，61 字节）、`LayoutList`（4786 行，61 字节）、`LayoutTemplate`（4787 行，69 字节）、`Library`（4788 行，55 字节）、`Lightbulb`（4789 行，59 字节）、`Link2`（4790 行，51 字节）、`ListChecks`（4791 行，61 字节）、`Loader2`（4792 行，60 字节）、`Loader2Icon`（4793 行，64 字节）、`LoaderCircle`（4794 行，65 字节）、`Lock`（4795 行，49 字节）、`LockKeyhole`（4796 行，63 字节）、`Mail`（4797 行，49 字节）、`Map$1`（4798 行，49 字节）、`MapPin`（4799 行，53 字节）、`Maximize`（4800 行，57 字节）、`MessageCircle`（4801 行，67 字节）、`MessageCircleMore`（4802 行，75 字节）、`MessageSquareMore`（4803 行，75 字节）、`Minus`（4804 行，51 字节）、`MinusIcon`（4805 行，55 字节）、`Monitor`（4806 行，55 字节）、`MonitorUp`（4807 行，59 字节）、`MoreHorizontal`（4808 行，63 字节）、`Music`（4809 行，51 字节）、`Music2`（4810 行，53 字节）、`Network`（4811 行，55 字节）、`Newspaper`（4812 行，59 字节）、`NotebookPen`（4813 行，63 字节）、`OctagonXIcon`（4814 行，59 字节）、`PackageSearch`（4815 行，67 字节）、`Palette`（4816 行，55 字节）、`PanelBottomClose`（4817 行，73 字节）、`PanelLeftClose`（4818 行，69 字节）、`PanelLeftOpen`（4819 行，67 字节）、`PanelRightClose`（4820 行，71 字节）、`PanelRightOpen`（4821 行，69 字节）、`PanelsTopLeft`（4822 行，67 字节）、`Pencil`（4823 行，53 字节）、`PencilRuler`（4824 行，63 字节）、`Phone`（4825 行，51 字节）、`Pin`（4826 行，47 字节）、`PinIcon`（4827 行，51 字节）、`PinOff`（4828 行，53 字节）、`Plus`（4829 行，49 字节）、`PlusCircle`（4830 行，59 字节）、`Podcast`（4831 行，55 字节）、`Power`（4832 行，51 字节）、`Redo2`（4833 行，51 字节）、`Regex`（4834 行，51 字节）、`Repeat2`（4835 行，55 字节）、`RotateCcw`（4836 行，59 字节）、`RotateCw`（4837 行，57 字节）、`Save`（4838 行，49 字节）、`Scan`（4839 行，49 字节）、`Scissors`（4840 行，57 字节）、`ScrollText`（4841 行，61 字节）、`Search`（4842 行，53 字节）、`SearchIcon`（4843 行，57 字节）、`Send`（4844 行，49 字节）、`ServerIcon`（4845 行，55 字节）、`ServerOff`（4846 行，59 字节）、`Share2`（4847 行，53 字节）、`ShieldAlert`（4848 行，63 字节）、`ShieldCheck`（4849 行，63 字节）、`ShieldCheckIcon`（4850 行，67 字节）、`ShieldOff`（4851 行，59 字节）、`Shuffle`（4852 行，55 字节）、`Slash`（4853 行，51 字节）、`Smartphone`（4854 行，61 字节）、`Speech`（4855 行，53 字节）、`Split`（4856 行，51 字节）、`SquareDashed`（4857 行，65 字节）、`SquareMousePointer`（4858 行，77 字节）、`StickyNote`（4859 行，61 字节）、`Sun`（4860 行，47 字节）、`SwatchBook`（4861 行，61 字节）、`Tag$1`（4862 行，49 字节）、`ThumbsDown`（4863 行，61 字节）、`ThumbsUp`（4864 行，57 字节）、`Trash2Icon`（4865 行，57 字节）、`TrendingUp`（4866 行，61 字节）、`TriangleAlert`（4867 行，67 字节）、`TriangleAlertIcon`（4868 行，71 字节）、`Tv`（4869 行，45 字节）、`Underline$1`（4870 行，61 字节）、`Undo2`（4871 行，51 字节）、`UploadIcon$1`（4872 行，59 字节）、`User`（4873 行，49 字节）、`UserRound`（4874 行，59 字节）、`UserRoundPlus`（4875 行，67 字节）、`UsersIcon`（4876 行，55 字节）、`Video`（4877 行，51 字节）、`VideoOff`（4878 行，57 字节）、`Volume2`（4879 行，55 字节）、`Volume2Icon`（4880 行，59 字节）、`VolumeXIcon`（4881 行，59 字节）、`Wand2`（4882 行，58 字节）、`WandSparkles`（4883 行，65 字节）、`WholeWord`（4884 行，59 字节）、`WifiIcon`（4885 行，51 字节）、`WifiOff`（4886 行，55 字节）、`WifiOffIcon`（4887 行，59 字节）、`Workflow`（4888 行，57 字节）、`Wrench`（4889 行，53 字节）、`X$7`（4890 行，45 字节）、`XIcon`（4891 行，47 字节）、`Zap`（4892 行，47 字节）、`ZoomIn`（4893 行，53 字节）、`ZoomOut`（4894 行，55 字节）、`Plus$1`（3687 行，295 字节）。

对外导出 223 个：`ActivityIcon`、`AlertCircle`、`AlertTriangle`、`AlertTriangleIcon`、`AppWindow`、`Archive`、`ArrowDown`、`ArrowDownToLine`、`ArrowLeft`、`ArrowLeftRight`、`ArrowLeftToLine`、`ArrowRight`、`ArrowRightToLine`、`ArrowUp`、`ArrowUpDown`、`ArrowUpFromLine`、`ArrowUpRight`、`ArrowUpToLine`、`AtSign`、`AudioLines`、`AudioWaveform$1`、`BadgeCheck`、`BadgeInfo`、`Bell`、`BellRing`、`Bold$1`、`BookUser`、`Bot`、`Box`、`BoxSelect`、`Boxes`、`Bug`、`Calculator`、`ChartNoAxesCombined`、`Check`、`CheckCheck`、`CheckCircle2`、`CheckCircle2Icon`、`ChevronDown`、`ChevronDownIcon$1`、`ChevronLeft`、`ChevronLeftIcon`、`ChevronRight$1`、`ChevronRightIcon`、`ChevronUp`、`ChevronUpIcon`、`CircleAlert`、`CircleArrowUp`、`CircleCheckIcon`、`CircleIcon`、`CircleMinus`、`CircleX`、`ClipboardIcon`、`ClipboardList`、`Cloud`、`CloudDownload`、`CloudIcon`、`CloudUpload`、`Code$1`、`Cog`、`Command`、`Compass`、`Copy`、`CopyPlus`、`CreditCard`、`Crosshair`、`Crown`、`DownloadIcon`、`Ellipsis`、`ExternalLink`、`Eye`、`EyeIcon$1`、`EyeOff`、`EyeOffIcon$1`、`FileImage`、`FilePlus2`、`Film`、`FolderClock`、`FolderClosed`、`FolderInput`、`FolderMinus`、`FolderOpenIcon`、`FolderPlus`、`FolderUp`、`FolderX`、`Gauge`、`GiftIcon`、`GitCompare`、`Globe`、`Globe2`、`GraduationCap`、`Grid2X2`、`Grid2x2Plus`、`Grid3X3`、`GripHorizontalIcon`、`GripVertical`、`Hand`、`Headphones`、`HistoryIcon`、`Home`、`ImagePlus`、`Import`、`Inbox`、`Info$1`、`InfoIcon$1`、`Italic$1`、`KeyRound`、`Keyboard`、`Languages`、`Layers`、`Layers2`、`Layers3`、`LayoutGrid`、`LayoutList`、`LayoutTemplate`、`Library`、`Lightbulb`、`Link2`、`ListChecks`、`Loader2`、`Loader2Icon`、`LoaderCircle`、`Lock`、`LockKeyhole`、`Mail`、`Map$1`、`MapPin`、`Maximize`、`MessageCircle`、`MessageCircleMore`、`MessageSquareMore`、`Minus`、`MinusIcon`、`Monitor`、`MonitorUp`、`MoreHorizontal`、`Music`、`Music2`、`Network`、`Newspaper`、`NotebookPen`、`OctagonXIcon`、`PackageSearch`、`Palette`、`PanelBottomClose`、`PanelLeftClose`、`PanelLeftOpen`、`PanelRightClose`、`PanelRightOpen`、`PanelsTopLeft`、`Pencil`、`PencilRuler`、`Phone`、`Pin`、`PinIcon`、`PinOff`、`Plus`、`PlusCircle`、`Podcast`、`Power`、`Redo2`、`Regex`、`Repeat2`、`RotateCcw`、`RotateCw`、`Save`、`Scan`、`Scissors`、`ScrollText`、`Search`、`SearchIcon`、`Send`、`ServerIcon`、`ServerOff`、`Share2`、`ShieldAlert`、`ShieldCheck`、`ShieldCheckIcon`、`ShieldOff`、`Shuffle`、`Slash`、`Smartphone`、`Speech`、`Split`、`SquareDashed`、`SquareMousePointer`、`StickyNote`、`Sun`、`SwatchBook`、`Tag$1`、`ThumbsDown`、`ThumbsUp`、`Trash2Icon`、`TrendingUp`、`TriangleAlert`、`TriangleAlertIcon`、`Tv`、`Underline$1`、`Undo2`、`UploadIcon$1`、`User`、`UserRound`、`UserRoundPlus`、`UsersIcon`、`Video`、`VideoOff`、`Volume2`、`Volume2Icon`、`VolumeXIcon`、`Wand2`、`WandSparkles`、`WholeWord`、`WifiIcon`、`WifiOff`、`WifiOffIcon`、`Workflow`、`Wrench`、`X$7`、`XIcon`、`Zap`、`ZoomIn`、`ZoomOut`、`Plus$1`。

现在从 vendor.js import 这些导出的应用文件 320 个：

`assets/add-entity-dialog.jsx`、`assets/asset-center-page.jsx`、`assets/asset-center-panel.jsx`、`assets/asset-context-menu-content.jsx`、`assets/asset-empty-area-menu-content.jsx`、`assets/asset-grid-item-impl.jsx`、`assets/asset-panel-overlay-host.jsx`、`assets/asset-picker-dialog.jsx`、`assets/assets-dropzone-empty.jsx`、`assets/attachment-row.jsx`、`assets/attachment-upload-zone.jsx`、`assets/close-button.jsx`、`assets/entity-card.jsx`、`assets/entity-delete-confirm.jsx`、`assets/entity-edit-dialog.jsx`、`assets/entity-list-row.jsx`、`assets/entity-row.jsx`、`assets/file-explorer-search-bar.jsx`、`assets/folder-drill-down-picker.jsx`、`assets/general-section.jsx`、`assets/image-lightbox.jsx`、`assets/local-assets-sidebar-panel.jsx`、`assets/materialize-workspace-dialog.jsx`、`assets/missing-candidate-actions.jsx`、`assets/preset-tags.jsx`、`assets/promote-to-asset-form.jsx`、`assets/scrollable-asset-view.jsx`、`assets/staged-row.jsx`、`assets/team-assets-sidebar-panel.jsx`、`assets/text-preview.jsx`、`assets/tree-item.jsx`、`assets/use-canvas-asset-promotion.jsx`、`canvas/assets-tab-panel.jsx`、`canvas/canvas-area.jsx`、`canvas/canvas-command-panel-content.jsx`、`canvas/canvas-global-tag-manager.jsx`、`canvas/canvas-tag-manager-panel.jsx`、`canvas/canvas-tag-picker-panel.jsx`、`canvas/canvas-toolbar.jsx`、`canvas/canvas-view-controls.jsx`、`canvas/canvas-view-inner.jsx`、`canvas/edge-interaction-layer.jsx`、`canvas/empty-viewport-toast.jsx`、`canvas/file-missing-icon.jsx`、`canvas/fullscreen-icon.jsx`、`canvas/node-header-inner.jsx`、`canvas/node-shell-inner.jsx`、`canvas/selection-toolbar-inner.jsx`、`canvas/sortable-tag-row.jsx`、`canvas/tool-mode-split-button.jsx`、`canvas/transfers-button.jsx`、`canvas/uploading-assets.jsx`、`chat/assistant-message-actions.jsx`、`chat/chat-history-loading-state.jsx`、`chat/chat-panel.jsx`、`chat/chat-rating-controls.jsx`、`chat/document-edit-review-bar.jsx`、`chat/loop-guard-ask-dock.jsx`、`chat/mention-popover.jsx`、`chat/mention-ref-chip.js`、`chat/message-input-base.jsx`、`chat/message-turn.jsx`、`chat/mode-selector.jsx`、`chat/promo-banner.jsx`、`chat/question-dock.jsx`、`chat/session-history.jsx`、`chat/session-tab-strip.jsx`、`chat/sortable-queued-row.jsx`、`chat/sub-agent-group.jsx`、`chat/use-composer-placeholder-actions.jsx`、`chat/use-copy.jsx`、`creations/index.jsx`、`debug-panel/debug-panel-dialog.jsx`、`debug-panel/icon-opacity-preview-section.jsx`、`debug-panel/project-icon-catalog.jsx`、`generation/artifact-asset-card.jsx`、`generation/attachment-bar.jsx`、`generation/chat-toolbar.jsx`、`generation/domestic-param-labels.jsx`、`generation/editable-param-chip.jsx`、`generation/file-chip.jsx`、`generation/file-explorer.jsx`、`generation/filter-trigger.jsx`、`generation/markdown-link.jsx`、`generation/media-error-card.jsx`、`generation/media-model-selector.jsx`、`generation/mention-chip-node-view.jsx`、`generation/mention-picker-popover.jsx`、`generation/model-chip.jsx`、`generation/model-param-select.jsx`、`generation/param-field.jsx`、`generation/prompt-font-size-control.jsx`、`generation/prompt-placeholder.jsx`、`generation/reference-media-strip.jsx`、`generation/reference-switch-popover.jsx`、`generation/render-cost-disclosure.jsx`、`generation/select-content.jsx`、`generation/tool-confirm-card.jsx`、`generation/txt-popover-inner.jsx`、`global-search/index.jsx`、`global-search/result-visuals.jsx`、`home/media-showcase.jsx`、`home/promotion.jsx`、`home/prompt-picker.jsx`、`home/toolbar.jsx`、`home/whats-new.jsx`、`infra/bundle-error-screen.jsx`、`infra/dialog-content.jsx`、`infra/error-fallback-ui.jsx`、`infra/media-preview.jsx`、`infra/parse-page-state-preview-schema.js`、`infra/remote-tool-dialog.jsx`、`infra/select-content.jsx`、`media-editing/action-list-section.jsx`、`media-editing/audio-preview-player.jsx`、`media-editing/build-video-thumb-base.jsx`、`media-editing/canvas-sticker-assets.jsx`、`media-editing/color-adjust-dialog.jsx`、`media-editing/comfy-ui-plugin-launcher.jsx`、`media-editing/customize-toolbar-dialog.jsx`、`media-editing/html-viewer-inner.jsx`、`media-editing/image-inplace-edit-toolbar-inner.jsx`、`media-editing/image-lightbox.jsx`、`media-editing/image-slot-list.jsx`、`media-editing/image-tool-meta.jsx`、`media-editing/layer-decompose-prompt.jsx`、`media-editing/markdown-audio.jsx`、`media-editing/media-clip-panel-inner.jsx`、`media-editing/media-gen-detail.jsx`、`media-editing/media-hover-preview.jsx`、`media-editing/message-list-props-equal.jsx`、`media-editing/multi-angle-editor.jsx`、`media-editing/panorama-generation-panel.jsx`、`media-editing/panorama-node.jsx`、`media-editing/panorama-viewer.jsx`、`media-editing/plugin-launcher.jsx`、`media-editing/ready-sub-image-card.jsx`、`media-editing/reference-thumbnail-overlay.jsx`、`media-editing/relight-editor.jsx`、`media-editing/relight-popover.jsx`、`media-editing/sticker-node-toolbar.jsx`、`media-editing/storyboard-grid-editor.jsx`、`media-editing/text-node-inner.jsx`、`media-editing/thumb-chip.jsx`、`media-editing/timeline-item.jsx`、`media-editing/turn-artifact-strip.jsx`、`media-editing/use-lightbox-media-actions.jsx`、`media-editing/use-preview-text.jsx`、`media-editing/video-lightbox.jsx`、`media-editing/watermark-popover.jsx`、`project-detail/assets-common.jsx`、`project-detail/cloud/cloud-assets-panel.jsx`、`project-detail/cloud/cloud-node.jsx`、`project-detail/cloud/debug-dump-view.jsx`、`project-detail/index.jsx`、`project-detail/invite.jsx`、`project-detail/local/local-assets-panel.jsx`、`project-detail/local/local-node.jsx`、`projects/cloud-debug.jsx`、`projects/index.jsx`、`projects/project-member-summary.jsx`、`routes/chat-case.jsx`、`settings/asset-center-migrate-dialog.jsx`、`settings/attach-native-toast-surface.jsx`、`settings/canvas-help-button.jsx`、`settings/changelog-detail-dialog.jsx`、`settings/changelog-table.jsx`、`settings/compact-rewrite-flow.jsx`、`settings/connector-api-key-section.jsx`、`settings/connector-cli-auth-section.jsx`、`settings/connector-dialog-frame.jsx`、`settings/connector-manual-credential-section.jsx`、`settings/connector-prompt-action.jsx`、`settings/connector-relationship-graphic.jsx`、`settings/connector-summary-action.jsx`、`settings/custom-connector-dialog.jsx`、`settings/custom-provider-form.jsx`、`settings/data-directory-settings.jsx`、`settings/diagnostics-status-button.jsx`、`settings/feature-popup.jsx`、`settings/feedback-dialog.jsx`、`settings/folder-whitelist-section.jsx`、`settings/forced-update-dialog.jsx`、`settings/im-bridge-manager.jsx`、`settings/integration-status-pill.jsx`、`settings/local-connector-setup-content.jsx`、`settings/make-async-image-task.jsx`、`settings/memory-manager.jsx`、`settings/migration-popup.jsx`、`settings/qr-card.jsx`、`settings/recent-project-group-header.jsx`、`settings/restart-banner.jsx`、`settings/search-button.jsx`、`settings/server-driven-popup-orchestrator.jsx`、`settings/software-update-section-content.jsx`、`settings/step-indicator.jsx`、`settings/trial-granted-popup.jsx`、`settings/tutorial-button.jsx`、`settings/update-banner.jsx`、`settings/update-sidebar-widget-inner.jsx`、`settings/use-direct-feedback.jsx`、`settings/version-row.jsx`、`settings/window-close-dialog-content.jsx`、`shared/page-search-input.jsx`、`skills/auto-update-banner.jsx`、`skills/community-tab.jsx`、`skills/connectors/browser-connector.jsx`、`skills/connectors/connector-catalog-data.jsx`、`skills/connectors/connectors-tab.jsx`、`skills/creator-plan/dialog.jsx`、`skills/creator-plan/form-parts.jsx`、`skills/creator-plan/invite-card.jsx`、`skills/index.jsx`、`skills/my-skills/my-skills-view.jsx`、`skills/my-skills/skill-cards.jsx`、`skills/operations/category-weight-editor.jsx`、`skills/operations/operations-view.jsx`、`skills/operations/published-panel.jsx`、`skills/operations/review-lists.jsx`、`skills/page-parts.jsx`、`skills/plugins/plugin-market-card.jsx`、`skills/plugins/plugin-market-detail.jsx`、`skills/plugins/plugin-market-tab.jsx`、`skills/skill-detail/dialog.jsx`、`skills/skill-detail/showcase.jsx`、`skills/skill-import-dialog.jsx`、`team/account-switcher-row-surface.jsx`、`team/account-switcher-view.jsx`、`team/activity-group.jsx`、`team/billing-insufficient-card.jsx`、`team/calendar.jsx`、`team/copy-icon-button.jsx`、`team/create-invite-link-page.jsx`、`team/create-team-dialog.jsx`、`team/credit-details-dialog.jsx`、`team/credit-reminder-settings.jsx`、`team/credit-threshold-reminder-card.jsx`、`team/delete-account-confirm-dialog.jsx`、`team/dissolve-team-dialog.jsx`、`team/error-message.jsx`、`team/hailuo-credit-row.jsx`、`team/invite-members-page.jsx`、`team/past-team-members-panel.jsx`、`team/streaming-label.jsx`、`team/team-account-summary.jsx`、`team/team-credit-history-section.jsx`、`team/team-credit-summary-surface.jsx`、`team/team-invite-deep-link-dialog.jsx`、`team/team-ledger-filters.jsx`、`team/team-management-detail-loading.jsx`、`team/team-management-dialog.jsx`、`team/team-member-combobox.jsx`、`team/team-member-quota-usage-cell.jsx`、`team/team-panel-error.jsx`、`team/team-panel-stale.jsx`、`team/transfer-credit-form.jsx`、`team/use-team-transactions-feed-query.jsx`、`text-editor/attachment-preview.jsx`、`text-editor/browser-annotation-editor.jsx`、`text-editor/creation-guide-placeholder.jsx`、`text-editor/editor-history-controls.jsx`、`text-editor/error-block.jsx`、`text-editor/find-bar.jsx`、`text-editor/image-annotation-dialog.jsx`、`text-editor/markdown-fullscreen.jsx`、`text-editor/node-context-menu.jsx`、`text-editor/pending-annotation-list.jsx`、`text-editor/production-plan-timeline.jsx`、`text-editor/question-tool-card.jsx`、`text-editor/skill-reload-dock.jsx`、`text-editor/source-text-fullscreen.jsx`、`text-editor/table-ops.jsx`、`text-editor/use-source-diff-review.jsx`、`text-editor/use-text-conflict-resolver.jsx`、`text-editor/use-text-version-panel.jsx`、`text-editor/use-text-version-preview.jsx`、`workflows/attribution.jsx`、`workflows/compatibility-comparison.jsx`、`workflows/download-confirm-dialog.jsx`、`workflows/download-section.jsx`、`workflows/index.jsx`、`workflows/tutorial-dialog.jsx`、`workflows/use-menu.jsx`、`workflows/user-workflow-item.jsx`、`workflows/workflow-card.jsx`、`workflows/workflow-detail.jsx`、`workspace/add-to-project-sub-menu.jsx`、`workspace/browser-bookmarks.jsx`、`workspace/browser-error-card.jsx`、`workspace/browser-search-history.jsx`、`workspace/browser-tab-overview.jsx`、`workspace/canvas-sidebar-overlay.jsx`、`workspace/coach-mark-popup.jsx`、`workspace/context-menu-content.jsx`、`workspace/create-project-dialog.jsx`、`workspace/home-sidebar.jsx`、`workspace/home-widget-host.jsx`、`workspace/icon-button.jsx`、`workspace/interest-option-grid.jsx`、`workspace/new-workspace-dialog.jsx`、`workspace/recent-project-row.jsx`、`workspace/recent-projects-header-actions.jsx`、`workspace/save-to-project-assets-dialog.jsx`、`workspace/scenarios.jsx`、`workspace/scene-categories.js`、`workspace/shortcut-categories.jsx`、`workspace/shortcut-hint.jsx`、`workspace/skill-filter-bar.jsx`、`workspace/slash-command-popover-content.jsx`、`workspace/stage-prompt-editor-card.jsx`、`workspace/text-editor-skill-categories.jsx`、`workspace/topbar-search-dialog-lazy.jsx`、`workspace/use-folder-permission-gate.jsx`、`workspace/use-home-quick-start-config.js`、`workspace/use-new-workspace-dialog.jsx`、`workspace/user-avatar-menu.jsx`、`workspace/workspace-browser.jsx`、`workspace/workspace-card.jsx`、`workspace/workspace-content.jsx`、`workspace/workspace-view-switch.jsx`。

#### `media-editing/playback-icons.js`

新文件。播放、暂停、停止、上一段、下一段，以及圆形媒体图标。`playGeometry`、`pauseGeometry`、`nextGeometry`、`CircleMediaSvg`、两个工厂没有外部 import。

本组名字 15 个，5,266 字节：`createMediaIcon`（782 行，844 字节）、`PlaybackPlayIcon$1`（811 行，203 字节）、`PlaybackPauseIcon$1`（814 行，393 字节）、`PlaybackStopIcon$1`（829 行，158 字节）、`nextGeometry`（836 行，367 字节）、`PlaybackNextIcon$1`（847 行，58 字节）、`PlaybackPreviousIcon$1`（848 行，169 字节）、`playGeometry`（1050 行，305 字节）、`pauseGeometry`（1054 行，456 字节）、`CircleMediaSvg`（1070 行，604 字节）、`createCircleMediaIcon`（1095 行，405 字节）、`PlaybackCirclePlayIcon$1`（1110 行，70 字节）、`PlaybackCirclePauseIcon$1`（1111 行，73 字节）、`PlaybackCircleToggleIcon`（1112 行，901 字节）、`desktopMediaIcon`（16368 行，260 字节）。

对外导出 9 个：`PlaybackPlayIcon$1`、`PlaybackPauseIcon$1`、`PlaybackStopIcon$1`、`PlaybackNextIcon$1`、`PlaybackPreviousIcon$1`、`PlaybackCirclePlayIcon$1`、`PlaybackCirclePauseIcon$1`、`PlaybackCircleToggleIcon`、`desktopMediaIcon`。
同文件内部 6 个，不导出：`createMediaIcon`、`nextGeometry`、`playGeometry`、`pauseGeometry`、`CircleMediaSvg`、`createCircleMediaIcon`。

现在从 vendor.js import 这些导出的应用文件 24 个：

`assets/audio-play-button.jsx`、`canvas/file-missing-icon.jsx`、`chat/empty-chat-recommendations.jsx`、`debug-panel/debug-panel-dialog.jsx`、`debug-panel/project-icon-catalog.jsx`、`generation/artifact-asset-card.jsx`、`generation/attachment-bar.jsx`、`global-search/result-visuals.jsx`、`infra/create-html-iframe-pool-store.jsx`、`infra/media-preview.jsx`、`media-editing/action-list-section.jsx`、`media-editing/audio-node-inner.jsx`、`media-editing/audio-preview-player.jsx`、`media-editing/build-video-thumb-base.jsx`、`media-editing/erase-subtitle-editor.jsx`、`media-editing/markdown-audio.jsx`、`media-editing/reference-thumbnail-overlay.jsx`、`media-editing/video-color-adjust-dialog.jsx`、`settings/connector-prompt-action.jsx`、`skills/skill-detail/showcase.jsx`、`vendor-inline/vscode-base/graph.jsx`、`workflows/download-section.jsx`、`workflows/workflow-detail.jsx`、`workspace/home-service.jsx`。

### 3.5 import 别名

83 个声明，3,544 字节。

#### `infra/base-ui.js`

新文件。把已经 `import` 的 `@base-ui/react/*` 命名空间收成短名字。`SelectIcon` 也在这里。新文件自己 import 那些命名空间，不再经 vendor.js 转发。没有应用 import 的别名搬进去但不导出；三批之后如果仍然没人用，删掉。

本组名字 83 个，3,544 字节：`AccordionHeader`（179 行，43 字节）、`AccordionItem$1`（180 行，41 字节）、`AccordionPanel`（181 行，41 字节）、`AccordionRoot`（182 行，39 字节）、`AccordionTrigger$1`（183 行，47 字节）、`AlertDialogRoot`（184 行，41 字节）、`AvatarImage$1`（185 行，40 字节）、`CheckboxRoot`（186 行，38 字节）、`ContextMenuRoot`（187 行，41 字节）、`ContextMenuTrigger$1`（188 行，49 字节）、`DialogBackdrop`（189 行，44 字节）、`DialogClose$1`（190 行，40 字节）、`DialogDescription$2`（191 行，52 字节）、`DialogPopup`（192 行，38 字节）、`DialogPortal$2`（193 行，42 字节）、`DialogRoot`（194 行，36 字节）、`DialogTitle$2`（195 行，40 字节）、`DialogTrigger$1`（196 行，44 字节）、`FieldControl`（197 行，41 字节）、`FieldRoot`（198 行，35 字节）、`MenuGroup`（199 行，36 字节）、`MenuGroupLabel`（200 行，46 字节）、`MenuItem$3`（201 行，36 字节）、`MenuPopup`（202 行，36 字节）、`MenuPortal`（203 行，38 字节）、`MenuPositioner`（204 行，46 字节）、`MenuRadioGroup`（205 行，46 字节）、`MenuRadioItem`（206 行，44 字节）、`MenuRadioItemIndicator`（207 行，62 字节）、`MenuRoot`（208 行，34 字节）、`MenuSubmenuRoot`（209 行，48 字节）、`MenuSubmenuTrigger`（210 行，54 字节）、`MenuTrigger`（211 行，40 字节）、`PopoverArrow$1`（212 行，41 字节）、`PopoverPopup`（213 行，39 字节）、`PopoverPortal`（214 行，41 字节）、`PopoverPositioner`（215 行，49 字节）、`PopoverRoot`（216 行，37 字节）、`PopoverTrigger$1`（217 行，45 字节）、`PreviewCardPopup`（218 行，43 字节）、`PreviewCardPortal`（219 行，45 字节）、`PreviewCardPositioner`（220 行，53 字节）、`PreviewCardRoot`（221 行，41 字节）、`PreviewCardTrigger$1`（222 行，49 字节）、`ProgressRoot`（223 行，39 字节）、`RadioIndicator`（224 行，46 字节）、`RadioRoot`（225 行，36 字节）、`ScrollAreaCorner`（226 行，45 字节）、`ScrollAreaRoot`（227 行，41 字节）、`ScrollAreaScrollbar`（228 行，51 字节）、`ScrollAreaThumb`（229 行，43 字节）、`ScrollAreaViewport`（230 行，49 字节）、`SelectIcon`（231 行，37 字节）、`SelectItem$2`（232 行，39 字节）、`SelectItemIndicator`（233 行，55 字节）、`SelectItemText`（234 行，45 字节）、`SelectList`（235 行，37 字节）、`SelectPopup`（236 行，39 字节）、`SelectPortal`（237 行，41 字节）、`SelectPositioner`（238 行，49 字节）、`SelectRoot`（239 行，37 字节）、`SelectScrollDownArrow`（240 行，59 字节）、`SelectScrollUpArrow`（241 行，55 字节）、`SelectTrigger$2`（242 行，45 字节）、`SelectValue$2`（243 行，41 字节）、`SliderControl$1`（244 行，45 字节）、`SliderIndicator`（245 行，47 字节）、`SliderRoot`（246 行，37 字节）、`SliderThumb`（247 行，39 字节）、`SliderTrack`（248 行，39 字节）、`SwitchRoot`（249 行，37 字节）、`SwitchThumb`（250 行，39 字节）、`TabsIndicator`（251 行，45 字节）、`TabsList$1`（252 行，37 字节）、`TabsPanel`（253 行，37 字节）、`TabsRoot`（254 行，35 字节）、`TabsTab`（255 行，33 字节）、`TooltipPopup`（256 行，40 字节）、`TooltipPortal`（257 行，42 字节）、`TooltipPositioner`（258 行，50 字节）、`TooltipProvider$2`（259 行，48 字节）、`TooltipRoot`（260 行，38 字节）、`TooltipTrigger$1`（261 行，46 字节）。

对外导出 82 个：`AccordionHeader`、`AccordionItem$1`、`AccordionPanel`、`AccordionRoot`、`AccordionTrigger$1`、`AlertDialogRoot`、`AvatarImage$1`、`CheckboxRoot`、`ContextMenuRoot`、`ContextMenuTrigger$1`、`DialogBackdrop`、`DialogClose$1`、`DialogDescription$2`、`DialogPopup`、`DialogPortal$2`、`DialogRoot`、`DialogTitle$2`、`DialogTrigger$1`、`FieldRoot`、`MenuGroup`、`MenuGroupLabel`、`MenuItem$3`、`MenuPopup`、`MenuPortal`、`MenuPositioner`、`MenuRadioGroup`、`MenuRadioItem`、`MenuRadioItemIndicator`、`MenuRoot`、`MenuSubmenuRoot`、`MenuSubmenuTrigger`、`MenuTrigger`、`PopoverArrow$1`、`PopoverPopup`、`PopoverPortal`、`PopoverPositioner`、`PopoverRoot`、`PopoverTrigger$1`、`PreviewCardPopup`、`PreviewCardPortal`、`PreviewCardPositioner`、`PreviewCardRoot`、`PreviewCardTrigger$1`、`ProgressRoot`、`RadioIndicator`、`RadioRoot`、`ScrollAreaCorner`、`ScrollAreaRoot`、`ScrollAreaScrollbar`、`ScrollAreaThumb`、`ScrollAreaViewport`、`SelectIcon`、`SelectItem$2`、`SelectItemIndicator`、`SelectItemText`、`SelectList`、`SelectPopup`、`SelectPortal`、`SelectPositioner`、`SelectRoot`、`SelectScrollDownArrow`、`SelectScrollUpArrow`、`SelectTrigger$2`、`SelectValue$2`、`SliderControl$1`、`SliderIndicator`、`SliderRoot`、`SliderThumb`、`SliderTrack`、`SwitchRoot`、`SwitchThumb`、`TabsIndicator`、`TabsList$1`、`TabsPanel`、`TabsRoot`、`TabsTab`、`TooltipPopup`、`TooltipPortal`、`TooltipPositioner`、`TooltipProvider$2`、`TooltipRoot`、`TooltipTrigger$1`。
同文件内部 1 个，不导出：`FieldControl`。

现在从 vendor.js import 这些导出的应用文件 44 个：

`assets/asset-center-panel.jsx`、`assets/asset-panel-overlay-host.jsx`、`assets/asset-picker-dialog.jsx`、`assets/credit-query-keys.jsx`、`assets/gateway-scope-provider.jsx`、`assets/general-section.jsx`、`assets/image-lightbox.jsx`、`assets/text-preview.jsx`、`canvas/separator.jsx`、`debug-panel/debug-panel-dialog.jsx`、`generation/artifact-asset-card.jsx`、`generation/missing-asset-card.jsx`、`generation/param-field.jsx`、`generation/param-slider.jsx`、`generation/prompt-font-size-control.jsx`、`generation/render-cost-disclosure.jsx`、`generation/select-content.jsx`、`generation/slider.jsx`、`generation/use-chat-file-reference-action.jsx`、`home/media-showcase.jsx`、`infra/badge-variants.jsx`、`infra/checkbox.jsx`、`infra/create-recently-added-store.js`、`infra/dialog-content.jsx`、`infra/gateway-http-error.jsx`、`infra/inline-rename-input.jsx`、`infra/select-content.jsx`、`media-editing/action-list-section.jsx`、`media-editing/audio-lightbox.jsx`、`media-editing/message-list-props-equal.jsx`、`media-editing/scroll-bar.jsx`、`media-editing/slider-section.jsx`、`media-editing/use-preview-text.jsx`、`media-editing/use-warn-missing-asset-meta.jsx`、`settings/changelog-table.jsx`、`settings/server-driven-popup-orchestrator.jsx`、`team/hailuo-credit-row.jsx`、`team/team-management-detail-loading.jsx`、`text-editor/use-placeholder-asset-source.jsx`、`vendor-inline/vscode-base/graph.jsx`、`workspace/coach-mark-popup.jsx`、`workspace/context-menu-content.jsx`、`workspace/shortcut-hint.jsx`、`workspace/topbar-state-context.jsx`。

### 3.6 构建 helper

6 个声明，3,350 字节。

#### `infra/cjs-interop.js`

新文件，仅当三批之后仍有应用调用。`getDefaultExportFromCjs$1` 现在有两个调用方：`media-editing/pdf-viewer.jsx`、`settings/im-bridge-manager.jsx`。这两个文件同时在用第二批、第三批要换掉的库包装。三批改完后如果它们不再调用这个函数，就删掉声明，不要建这个文件。还在调用，再落到这里。

本组名字 1 个，148 字节：`getDefaultExportFromCjs$1`（362 行，148 字节）。

对外导出 1 个：`getDefaultExportFromCjs$1`。

现在从 vendor.js import 这些导出的应用文件 2 个：

`media-editing/pdf-viewer.jsx`、`settings/im-bridge-manager.jsx`。

#### `（不新建文件，三批之后若仍无调用方就删）`

不新建文件。`__ovVitePreload` 只出现在 export 列表里，应用没有 import。`seen`、`scriptRel`、`assetsURL` 只被它使用。`_mergeNamespaces` 只被 `React$1` 使用，而 `React$1` 是库互操作（第 5 节）。这 5 个是 Vite/Rollup 运行时，不是要养在应用目录里的模块。

本组名字 5 个，3,202 字节：`__ovVitePreload`（292 行，2,259 字节）、`seen`（291 行，9 字节）、`scriptRel`（284 行，257 字节）、`assetsURL`（288 行，84 字节）、`_mergeNamespaces`（263 行，593 字节）。

不导出。应用文件没有 import 它们。

### 3.7 其他

43 个声明，17,622 字节。

#### `infra/file-type.js`

新文件。扩展名、MIME 和文件类型字形路径，加上 `classifyFileType`。字形和表是常量，三个函数是读取它们的 helper，放同一个文件，避免两处各持一份表。`extensions`、`exactMime` 没有外部 import。`BODY` / `FOLD` / `ARCHIVE_ZIPPER` / `JPEG` 的现有调用在 `infra/file-type-icon.jsx`。

本组名字 3 个，2,357 字节：`extensionOf$1`（4950 行，337 字节）、`broadCategory`（4957 行，187 字节）、`classifyFileType`（4962 行，1,833 字节）。

对外导出 1 个：`classifyFileType`。
同文件内部 2 个，不导出：`extensionOf$1`、`broadCategory`。
声明体里引用的 from-vendor 名字：`inferMediaKind`。新文件改为从 `infra/from-vendor.js`（或第 7 节拆开之后的模块）import。

现在从 vendor.js import 这些导出的应用文件 26 个：

`assets/asset-panel-overlay-host.jsx`、`assets/attachment-row.jsx`、`assets/attachment-upload-zone.jsx`、`assets/audio-play-button.jsx`、`assets/entity-row.jsx`、`assets/inline-input.jsx`、`assets/preview-media.jsx`、`assets/scrollable-asset-view.jsx`、`assets/staged-row.jsx`、`canvas/uploading-assets.jsx`、`chat/mention-popover.jsx`、`chat/mention-ref-chip.js`、`chat/rich-user-prompt-content.jsx`、`generation/artifact-asset-card.jsx`、`generation/file-chip.jsx`、`generation/markdown-link.jsx`、`generation/mention-chip-node-view.jsx`、`generation/missing-asset-card.jsx`、`global-search/result-visuals.jsx`、`infra/create-html-iframe-pool-store.jsx`、`infra/project-asset-thumbnail-generation.jsx`、`media-editing/action-list-section.jsx`、`media-editing/file-node-impl.jsx`、`media-editing/pdf-viewer.jsx`、`text-editor/table-editor-inner.jsx`、`text-editor/table-node-inner.jsx`。

#### `media-editing/action-list.jsx`

新文件。操作列表的面板、条目、分隔线，内部用已安装的 `@base-ui/react/use-render`。旁边已有 `media-editing/action-list-section.jsx`，那是调用方，不是这三份组件的家。

本组名字 3 个，1,237 字节：`ActionListPanel`（6081 行，370 字节）、`ActionListItem`（6101 行，481 字节）、`ActionListSeparator`（6126 行，386 字节）。

对外导出 3 个：`ActionListPanel`、`ActionListItem`、`ActionListSeparator`。

现在从 vendor.js import 这些导出的应用文件 10 个：

`assets/use-canvas-asset-promotion.jsx`、`canvas/canvas-pane-context-menu.jsx`、`infra/media-preview.jsx`、`media-editing/action-list-section.jsx`、`media-editing/image-node-toolbar-section.jsx`、`media-editing/toolbar-item.jsx`、`text-editor/markdown-fullscreen.jsx`、`text-editor/node-context-menu.jsx`、`text-editor/table-ops.jsx`、`workspace/context-menu-content.jsx`。

#### `infra/logger.js`

新文件。`makeLogger` 和 `workspaceLog`。`fmt`、`emit$6` 没有外部 import。

本组名字 4 个，889 字节：`fmt`（16410 行，233 字节）、`emit$6`（16415 行，286 字节）、`makeLogger`（16424 行，332 字节）、`workspaceLog`（16432 行，38 字节）。

对外导出 2 个：`makeLogger`、`workspaceLog`。
同文件内部 2 个，不导出：`fmt`、`emit$6`。
声明体里引用的 from-vendor 名字：`fmtValue`。新文件改为从 `infra/from-vendor.js`（或第 7 节拆开之后的模块）import。

现在从 vendor.js import 这些导出的应用文件 17 个：

`assets/credit-query-keys.jsx`、`chat/chat-panel.jsx`、`creations/index.jsx`、`home/data.js`、`home/index.jsx`、`home/media-showcase.jsx`、`infra/agent-http-client.js`、`media-editing/use-img2-video.js`、`vendor-inline/vscode-base/graph.jsx`、`workspace/create-project-dialog.jsx`、`workspace/new-workspace-dialog.jsx`、`workspace/shortcut-hint.jsx`、`workspace/tool-label-definitions.js`、`workspace/topbar-provider.jsx`、`workspace/use-folder-permission-gate.jsx`、`workspace/use-home-quick-start-config.js`、`workspace/use-new-workspace-dialog.jsx`。

#### `infra/use-storage.js`

新文件。`useStorage` 有 50 个调用文件。`getDefault` 读 from-vendor 的 `WORKSPACE_STORAGE_DEFAULTS` 和 `getRendererGlobalDefaults`。另外三个 helper 没有外部 import。不要和已有的 `infra/web-storage.js` 并成一个文件，那个文件是平台能力垫片。

本组名字 4 个，5,698 字节：`isPlainObject$1`（16489 行，113 字节）、`resolveUpdater`（16492 行，242 字节）、`getDefault`（16525 行，197 字节）、`useStorage`（16532 行，5,146 字节）。

对外导出 1 个：`useStorage`。
同文件内部 3 个，不导出：`isPlainObject$1`、`resolveUpdater`、`getDefault`。
声明体里引用的 from-vendor 名字：`WORKSPACE_STORAGE_DEFAULTS`、`getRendererGlobalDefaults`、`enqueueStorageWrite`、`isUndefinedStorageValue`、`localCacheKey`、`readLocalCache$2`、`removeLocalCache`、`resolveStorageQueryData`、`storageKeys`、`toStorageQueryData`、`useCurrentWorkspace`、`usePlatform`、`writeLocalCache$2`。新文件改为从 `infra/from-vendor.js`（或第 7 节拆开之后的模块）import。

现在从 vendor.js import 这些导出的应用文件 50 个：

`assets/asset-center-relocation-coach-mark.jsx`、`assets/materialize-workspace-dialog.jsx`、`assets/use-canvas-model-registry-hydration.js`、`assets/use-coach-mark-sequence.js`、`assets/workspace-chat-provider.jsx`、`assets/wrap-as-asset-center-error.js`、`chat/session-history.jsx`、`chat/session-tab-strip.jsx`、`chat/use-attachment-face-notice-gate.jsx`、`creations/index.jsx`、`debug-panel/debug-panel-dialog.jsx`、`generation/file-explorer.jsx`、`generation/use-mention-models.jsx`、`home/coach-marks.jsx`、`home/index.jsx`、`home/sample-project.js`、`project-detail/cloud/cloud-assets-panel.jsx`、`project-detail/index.jsx`、`project-detail/local/local-assets-panel.jsx`、`projects/index.jsx`、`settings/folder-whitelist-section.jsx`、`settings/memory-manager.jsx`、`settings/server-driven-popup-orchestrator.jsx`、`settings/use-feature-popup-action.js`、`settings/use-project-actions.js`、`settings/use-settings.js`、`skills/index.jsx`、`skills/plugins/template-project.js`、`team/derive-subscription-status.js`、`team/team-credit-history-section.jsx`、`team/team-management-dialog.jsx`、`text-editor/canvas-host-toolbar-button.jsx`、`workflows/index.jsx`、`workflows/license-acceptance.js`、`workflows/use-menu.jsx`、`workspace/canvas-sidebar-overlay.jsx`、`workspace/global-sidebar-provider.jsx`、`workspace/home-sidebar.jsx`、`workspace/new-workspace-dialog.jsx`、`workspace/normalize-project-entries.js`、`workspace/resolve-retry-message-payload.jsx`、`workspace/tool-label-definitions.js`、`workspace/topbar-provider.jsx`、`workspace/topbar-search-dialog-lazy.jsx`、`workspace/use-canvas-sidebar-controller.js`、`workspace/use-coach-mark.js`、`workspace/use-folder-permission-gate.jsx`、`workspace/use-new-workspace-dialog.jsx`、`workspace/use-workspace-stage-layout.js`、`workspace/workspace-card.jsx`。

#### `infra/start-perf-observer.js`

写进已有文件。`flush` 和 `pendingLogLines` 的唯一调用方就是它。`flush` 还调用 from-vendor 的 `measurePerf`、`PERF_LOG_FLUSH`。

本组名字 2 个，402 字节：`flush`（16503 行，382 字节）、`pendingLogLines`（16502 行，20 字节）。

对外导出 2 个：`flush`、`pendingLogLines`。
声明体里引用的 from-vendor 名字：`PERF_LOG_FLUSH`、`measurePerf`。新文件改为从 `infra/from-vendor.js`（或第 7 节拆开之后的模块）import。

现在从 vendor.js import 这些导出的应用文件 1 个：

`infra/start-perf-observer.js`。

#### `infra/decision-version.js`

新文件。决策版本计数。调用方分在 `infra/agent-http-client.js` 和 `assets/gateway-scope-provider.jsx`，所以单独放，不塞进其中一边。

本组名字 3 个，152 字节：`emit$5`（16520 行，95 字节）、`listeners$8`（16519 行，38 字节）、`decisionVersion`（16518 行，19 字节）。

对外导出 3 个：`emit$5`、`listeners$8`、`decisionVersion`。

现在从 vendor.js import 这些导出的应用文件 2 个：

`assets/gateway-scope-provider.jsx`、`infra/agent-http-client.js`。

#### `workspace/use-new-project-folder.js`

新文件。新建项目目录的 hook。它 import `useStorage` 和 `workspaceLog`，以及 from-vendor 的 `resolveNewProjectPreferences`。

本组名字 1 个，1,185 字节：`useNewProjectFolder`（20165 行，1,185 字节）。

对外导出 1 个：`useNewProjectFolder`。
声明体里引用的 from-vendor 名字：`resolveNewProjectPreferences`、`updateNewProjectPreferences`、`usePlatform`。新文件改为从 `infra/from-vendor.js`（或第 7 节拆开之后的模块）import。

现在从 vendor.js import 这些导出的应用文件 4 个：

`home/index.jsx`、`settings/use-project-actions.js`、`workspace/create-project-dialog.jsx`、`workspace/new-workspace-dialog.jsx`。

#### `workspace/workspace-folder-missing.js`

新文件。判断错误是不是 `WorkspaceFolderMissingError`。

本组名字 1 个，130 字节：`isWorkspaceFolderMissingError`（16365 行，130 字节）。

对外导出 1 个：`isWorkspaceFolderMissingError`。

现在从 vendor.js import 这些导出的应用文件 3 个：

`home/index.jsx`、`settings/parse-custom-mcp-arguments.js`、`workspace/new-workspace-dialog.jsx`。

#### `skills/skill-cover-url.js`

新文件。按区域选技能封面。用 from-vendor 的 `getRuntimeConfig`。

本组名字 1 个，226 字节：`getSkillCoverUrl`（22194 行，226 字节）。

对外导出 1 个：`getSkillCoverUrl`。
声明体里引用的 from-vendor 名字：`getRuntimeConfig`。新文件改为从 `infra/from-vendor.js`（或第 7 节拆开之后的模块）import。

现在从 vendor.js import 这些导出的应用文件 2 个：

`generation/use-mention-models.jsx`、`skills/my-skills/skill-cards.jsx`。

#### `generation/browser-image-edit.js`

新文件。浏览器改图的请求判断和提示词。提示词函数在 `4b80e7ae` 上是 1,103 字节，旧清单记的是 671，函数体变过，以当前声明为准。

本组名字 2 个，1,435 字节：`isBrowserImageEditRequest`（23658 行，332 字节）、`browserImageEditPrompt`（23663 行，1,103 字节）。

对外导出 2 个：`isBrowserImageEditRequest`、`browserImageEditPrompt`。
声明体里引用的 from-vendor 名字：`isBrowserImageEditAction`。新文件改为从 `infra/from-vendor.js`（或第 7 节拆开之后的模块）import。

现在从 vendor.js import 这些导出的应用文件 1 个：

`infra/agent-http-client.js`。

#### `generation/prompt-font-size.js`

新文件。提示词字号 store，以及歌词区布局 hook。字号的读写辅助已经在 from-vendor.js（`normalizePromptFontSize`、`readPersistedPromptFontSize`、`persistPromptFontSize`），store 从那里 import。`create$2` 是 zustand，见第 5 节，不要把 store 工厂一起搬进这个文件。

本组名字 2 个，1,191 字节：`usePromptFontSizeStore`（6146 行，559 字节）、`useMusicPromptLayout`（6165 行，632 字节）。

对外导出 2 个：`usePromptFontSizeStore`、`useMusicPromptLayout`。
声明体里引用的 from-vendor 名字：`PROMPT_FONT_SIZE_DEFAULT`、`normalizePromptFontSize`、`persistPromptFontSize`、`readPersistedPromptFontSize`。新文件改为从 `infra/from-vendor.js`（或第 7 节拆开之后的模块）import。

现在从 vendor.js import 这些导出的应用文件 6 个：

`chat/rich-prompt-input.jsx`、`generation/prompt-font-size-control.jsx`、`generation/time-intervals.jsx`、`generation/txt-popover-inner.jsx`、`media-editing/layer-decompose-prompt.jsx`、`media-editing/panorama-generation-panel.jsx`。

#### `i18n/localized-text.js`

新文件。按语言取 `zh` 或 `en` 字段。目录 `i18n/` 已经存在。

本组名字 1 个，121 字节：`localizedI18nText`（23672 行，121 字节）。

对外导出 1 个：`localizedI18nText`。

现在从 vendor.js import 这些导出的应用文件 5 个：

`settings/connector-manual-credential-section.jsx`、`settings/connector-required-input-fields.jsx`、`settings/make-async-image-task.jsx`、`skills/connectors/connector-detail.jsx`、`skills/connectors/local-connector.jsx`。

#### `chat/media-tool-result.js`

新文件。工具回包里的媒体记录和失败判断。`isRecord$2` 也被 `media-editing/aggregate-timeline-runs.js` 使用，所以导出。`tryParseJson$1` 在 from-vendor.js。

本组名字 5 个，828 字节：`isRecord$2`（23741 行，102 字节）、`getFileActivityKind`（23748 行，91 字节）、`collectMediaResultRecords`（23751 行，252 字节）、`hasMediaAnalysisFailure`（23757 行，295 字节）、`FILE_ACTIVITY_KIND_BY_TOOL`（23744 行，88 字节）。

对外导出 4 个：`isRecord$2`、`getFileActivityKind`、`collectMediaResultRecords`、`hasMediaAnalysisFailure`。
同文件内部 1 个，不导出：`FILE_ACTIVITY_KIND_BY_TOOL`。
声明体里引用的 from-vendor 名字：`tryParseJson$1`。新文件改为从 `infra/from-vendor.js`（或第 7 节拆开之后的模块）import。

现在从 vendor.js import 这些导出的应用文件 3 个：

`chat/has-structured-success-payload.js`、`media-editing/aggregate-timeline-runs.js`、`media-editing/merge-into-timeline-entries.js`。

#### `chat/chat-rating-controls.jsx`

写进已有文件。`isRecord$g` 只有这里 import。它和 `isRecord$2` 的空值判断不一样，不要合并成一个函数。

本组名字 1 个，109 字节：`isRecord$g`（875 行，109 字节）。

对外导出 1 个：`isRecord$g`。

现在从 vendor.js import 这些导出的应用文件 1 个：

`chat/chat-rating-controls.jsx`。

#### `assets/visible-cloud-uploads.js`

新文件。云上传列表的可见项过滤。唯一调用方是资产面板。

本组名字 2 个，349 字节：`isVisibleCloudUpload`（20397 行，134 字节）、`getVisibleCloudUploads`（20400 行，215 字节）。

对外导出 1 个：`getVisibleCloudUploads`。
同文件内部 1 个，不导出：`isVisibleCloudUpload`。

现在从 vendor.js import 这些导出的应用文件 2 个：

`assets/team-assets-sidebar-panel.jsx`、`project-detail/cloud/cloud-assets-panel.jsx`。

#### `assets/grid-row-size.js`

新文件。资产网格行高。两个名字都只被 `assets/scrollable-asset-view.jsx` import。这不是画布布局。

本组名字 2 个，399 字节：`estimateGridRowSize`（22117 行，373 字节）、`GRID_COLUMN_COUNT_WIDE`（22116 行，26 字节）。

对外导出 2 个：`estimateGridRowSize`、`GRID_COLUMN_COUNT_WIDE`。

现在从 vendor.js import 这些导出的应用文件 1 个：

`assets/scrollable-asset-view.jsx`。

#### `text-editor/editor-doc-snapshot.js`

新文件。编辑器 doc 的快照。`cloneDraftEditorDoc` 没有外部 import。

本组名字 2 个，364 字节：`cloneDraftEditorDoc`（22096 行，232 字节）、`editorDocSnapshot`（22104 行，132 字节）。

对外导出 1 个：`editorDocSnapshot`。
同文件内部 1 个，不导出：`cloneDraftEditorDoc`。

现在从 vendor.js import 这些导出的应用文件 2 个：

`assets/draft-controller.js`、`assets/read-envelope.js`。

#### `infra/agent-http-client.js`

写进已有文件。`readRecord`、`basename$8`、`uploadResponseFilename` 的应用 import 都在这个文件里，直接搬进来。

本组名字 3 个，329 字节：`readRecord`（16433 行，92 字节）、`basename$8`（22110 行，69 字节）、`uploadResponseFilename`（22113 行，168 字节）。

对外导出 3 个：`readRecord`、`basename$8`、`uploadResponseFilename`。

现在从 vendor.js import 这些导出的应用文件 1 个：

`infra/agent-http-client.js`。

#### `team/team-ledger-filters.jsx`

写进已有文件。`formatDate` 只有这里 import。

本组名字 1 个，221 字节：`formatDate`（19103 行，221 字节）。

对外导出 1 个：`formatDate`。

现在从 vendor.js import 这些导出的应用文件 1 个：

`team/team-ledger-filters.jsx`。

## 4. 拿不准，不划进确定拆走

下面 **17** 个声明，合计 **5,977** 字节。形状没有对上已装包，函数体又很像某个库。三批删除表没有它们的名字。在用 `analysis/remaining/tools/xcanon.mjs` 对上下面写的包之前，不要搬进应用目录，也不要删。对上了就改成从该包的公开入口 import；对不上、而且差异是应用行为，再单独立项，不塞进第 3 节的文件。

### 很像 @dnd-kit/core 的两个 hook

2 个，540 字节：`useSensor`（11487 行，220 字节）、`useSensors`（11495 行，320 字节）。

renderer 已经安装并在 vendor.js 顶部 import 了 `@dnd-kit/core@6.3.1` 的一部分符号。这两个函数的写法（`useMemo` 包 sensor 配置）和该包的公开 hook 同形，但 decls-final 的状态是 `none`，没有形状命中。删除表里的 dnd-kit 只有 `@dnd-kit/sortable`。应用有 4 个文件在用。

应用 import：`canvas/canvas-tag-manager-panel.jsx`、`chat/sortable-queued-row.jsx`、`media-editing/customize-toolbar-dialog.jsx`、`skills/operations/published-panel.jsx`。

### 很像 @tanstack/react-virtual 的三个声明

3 个，1,039 字节：`useVirtualizer`（13348 行，168 字节）、`useVirtualizerBase`（13321 行，756 字节）、`useIsomorphicLayoutEffect`（13320 行，115 字节）。

vendor.js 已经 `import { Virtualizer, observeElementRect, observeElementOffset, elementScroll } from "@tanstack/virtual-core"`。`useVirtualizer` 只是用这三个观察器构造 `Virtualizer`。renderer 的 package.json 没有 `@tanstack/react-virtual`。`useIsomorphicLayoutEffect` 只被 `useVirtualizerBase` 使用。应用有 4 个文件 import `useVirtualizer`。

应用 import：`assets/scrollable-asset-view.jsx`、`chat/message-list-impl.jsx`、`generation/file-explorer.jsx`、`text-editor/use-source-diff-review.jsx`。

### 很像 react-error-boundary 的三件套

3 个，1,626 字节：`m$4`（20225 行，1,540 字节）、`c$3`（20221 行，48 字节）、`h$4`（20220 行，38 字节）。

vendor.js 已经 `import { ErrorBoundary as C$5 } from "react-error-boundary"`。`m$4` 是带 `getDerivedStateFromError` 和 `resetErrorBoundary` 的类组件，`c$3` 是它的初始 state，`h$4` 是它的 context。已装版本是 6.1.6，这份类没有形状命中。3 个应用文件 import `m$4`，另外两个没有外部 import。

应用 import：`media-editing/remote-tool-host.jsx`、`settings/server-driven-popup-orchestrator.jsx`、`settings/update-sidebar-widget-inner.jsx`。

### 很像主题脚本的四件套，外加一段没有名字的表达式

4 个，931 字节：`M$3`（16436 行，745 字节）、`x$4`（16458 行，40 字节）、`U$3`（16459 行，50 字节）、`z$3`（16463 行，96 字节）。

`M$3` 在 `documentElement` 上改 class 和 `colorScheme`，并被一段没有绑定名的 `reactExports.memo(...)` 塞进 `<script>`（当前约 16467 行，`dangerouslySetInnerHTML` 调用 `M$3.toString()`）。这段表达式不是顶层声明，不在 17 个里面，但必须和这四件套一起处理。`z$3` 读 context，`settings/attach-native-toast-surface.jsx` 以 `z$3 as useTheme` 导入。renderer 的 package.json 没有 next-themes。`M$3`、`x$4`、`U$3` 没有应用 import。

应用 import：`settings/attach-native-toast-surface.jsx`。

### 很像 @tanstack/react-router 的三件套

3 个，1,507 字节：`createFileRoute`（14099 行，207 字节）、`FileRoute`（14107 行，244 字节）、`lazyRouteComponent`（14118 行，1,056 字节）。

vendor.js 顶部已经从 `@tanstack/react-router` 导入 `useHydrated`、`createRoute`、`useNavigate` 等。这三个的函数体是路由的文件路由和懒加载组件，decls-final 写明与已装的 1.168.10 / 1.170.32 同名但对不上。`createFileRoute` 和 `lazyRouteComponent` 的调用方都是 `workspace/topbar-search-dialog-lazy.jsx`。`FileRoute` 没有应用 import，只被 `createFileRoute` 使用。

应用 import：`workspace/topbar-search-dialog-lazy.jsx`。

### 没有调用方、很像路由里的 ClientOnly

1 个，264 字节：`ClientOnly`（13621 行，264 字节）。

函数体是 `useHydrated() ? children : fallback`。`useHydrated` 来自已 import 的 `@tanstack/react-router`。应用文件没有 import `ClientOnly`，vendor 内部也只有 export 列表提到它。它可能是路由包的残片，也可能是死导出。没对上包之前两样都不做。

应用 import：无。

### 紧挨 travels 的 Operation

1 个，70 字节：`Operation`（11736 行，70 字节）。

值是 `{ Remove: "remove", Replace: "replace", Add: "add" }`。在当前文件里，它紧挨第一批要删的 travels 声明 `r$5`。应用没有 import。它可能是 travels / JSON patch 漏掉的枚举，也可能是应用自己的操作名。没有打开 travels 源码逐字对照，所以不删、也不搬。

应用 import：无。

## 5. 确定是库，三批删除表没有这些名字

**24** 个声明，**4,272** 字节。它们不是应用代码。拆第 3 节之前先确认它们已经不在；还在就删，或者改成从对应的包 import。不要搬进应用目录。

| 声明 | 字节 | 原因 |
|---|---:|---|
| `a$1`（7209 行） | 53 | 只被 `@speed-highlight/core` 的懒加载声明调用（`F$6`、`f$4` 等，都在第三批删除表）。应用没有 import |
| `unreachable`（11854 行） | 25 | 空函数，唯一调用在 react-markdown 的 `post`（第三批） |
| `commonjsRequire`（8234 行） | 255 | Rollup 动态 require 垫片，唯一调用在 `requireJszip_min`（第二批） |
| `commonjsGlobal`（361 行） | 187 | 旧清单放在构建 helper。唯一调用在 `requireJszip_min` |
| `requireReact`（371 行） | 48 | 返回 `__ov_react`。调用在 `requireLib`、`requireQRCodeSvg`（第三批 react-qr-code） |
| `isString`（14160 行） | 41 | 只被 i18next 内部声明使用（第一批） |
| `cjsExports`（12111 行） | 25 | `requireCjs()`，style-to-js 的互操作（第一批）。没有别的引用 |
| `extendExports`（12362 行） | 31 | `requireExtend()`，extend 的互操作（第一批）。没有别的引用 |
| `__defProp`（23549 行） | 33 | `Object.defineProperty`。没有引用 |
| `React`（374 行） | 62 | `getDefaultExportFromCjs$1(reactExports)`。引用来自将要删除的 sonner 等库声明，以及下面的 zustand `useStore$2`。应用没有 import 这个名字 |
| `React$1`（375 行） | 98 | `_mergeNamespaces` 包出来的 React 命名空间。没有引用 |
| `getStoreFactory`（14153 行） | 130 | 返回 `createStore` 和 `batch`，这两个名字在第一批的 `@tanstack/store` 删除表里。应用没有 import |
| `e$1`（970 行） | 67 | 函数体是 `getDefaultExportFromCjs$1(voidElementsExports)`。decls-final 误标成 `@xyflow/react`。换包计划第一批已经说跟 void-elements 一起删。应用没有 import |
| `createStoreImpl`（1010 行） | 928 | zustand 的 store 实现，形状命中已装的 zustand |
| `createStore$1`（1036 行） | 94 | zustand vanilla 的 `createStore`。应用有 import |
| `identity`（1037 行） | 21 | 只被 `useStore$2` 当作默认 selector |
| `useStore$2`（1038 行） | 305 | zustand 的 `useStore`。应用有 import |
| `createImpl`（1043 行） | 201 | 把 store 和 hook 绑在一起，只被 `create$2` 使用 |
| `create$2`（1049 行） | 79 | zustand 的 react `create`。应用有 import |
| `isIterable`（13356 行） | 42 | 只被 `shallow` 使用 |
| `hasIterableEntries`（13357 行） | 85 | 只被 `shallow` 使用 |
| `compareEntries`（13360 行） | 392 | 只被 `shallow` 使用 |
| `compareIterables`（13373 行） | 416 | 只被 `shallow` 使用 |
| `shallow`（13387 行） | 654 | zustand 的 `shallow`。`canvas/canvas-mini-map.jsx` 有 import |

zustand 这一组（`createStoreImpl`、`createStore$1`、`identity`、`useStore$2`、`createImpl`、`create$2`、`isIterable`、`hasIterableEntries`、`compareEntries`、`compareIterables`、`shallow`）形状命中已装的 zustand 4.5.7。xyflow 可读副本已经改走 npm，这 11 个留在 vendor.js 里是因为应用还在从这里 import。执行时对一下 4.5.7 的公开导出：`create$2` 对 react 的 `create`，`createStore$1` 对 vanilla 的 `createStore`，`useStore$2` 对 `useStore`，`shallow` 对 `shallow`。调用方改到包上，不深拷进应用目录。

- `createStore$1`：`canvas/create-canvas-overlay-store.js`、`canvas/get-alignment-reference-ids.js`、`infra/agent-http-client.js`、`infra/create-html-fullscreen-store.js`、`infra/create-html-iframe-pool-store.jsx`、`infra/create-recently-added-store.js`、`infra/use-plugin-metadata-store.js`、`media-editing/package.jsx`、`media-editing/use-start-cloud-edit-from-node.js`
- `useStore$2`：`canvas/node-shell-inner.jsx`、`canvas/use-start-crop-from-node.js`、`infra/agent-http-client.js`、`infra/create-html-iframe-pool-store.jsx`、`infra/use-plugin-metadata-store.js`、`media-editing/package.jsx`、`media-editing/use-start-cloud-edit-from-node.js`
- `create$2`：`canvas/read-persisted.js`、`canvas/use-active-mode.js`、`canvas/use-video-starter-preset-store.js`、`infra/use-canvas-node-assets-store.js`、`infra/use-plugin-metadata-store.js`、`media-editing/package.jsx`、`media-editing/read-persisted.js`、`media-editing/video-player-inner.jsx`、`text-editor/use-diff-review-store.js`
- `shallow`：`canvas/canvas-mini-map.jsx`

`media-editing/package.jsx` 同时 import 了第二批要换的 lucide `$1` 图标、这里的 `create$2` / `createStore$1` / `useStore$2`，以及第 3 节的 `CompositedSvg`、`withIconCompositing`、`withArtworkOpacity`。换包、删 zustand 副本、搬图标合成，三件事改的是这个文件里不同的名字，不要混在一次替换里。

## 6. 第二批、第三批正文已经认领

这 7 个在 decls-final 里是 `status: none`，所以会冒出来像应用代码。换包计划的正文要求它们随库处理，删除表的表格没写全。本方案不计入 482。

| 声明 | 当前行 | 字节 | 归属 |
|---|---:|---:|---|
| `E$4` | 21689 | 14,568 | 第二批 wavesurfer。类体是 WaveSurfer，`assets/asset-panel-overlay-host.jsx` 以 `E$4 as WaveSurfer` 导入 |
| `S$1` | 23555 | 60 | 第三批 shiki 高亮插件 |
| `C$1` | 23558 | 152 | 第三批 shiki 高亮插件 |
| `r` | 23562 | 42 | 第三批 shiki 高亮插件 |
| `B$1` | 23563 | 109 | 第三批 shiki 高亮插件 |
| `$$2` | 23591 | 1,258 | 第三批：换包计划要求挪到应用模块后从 vendor.js 删除，不在本方案再规划一次 |
| `G$1` | 23639 | 11 | 第三批。`G$1 = $$2()`，`generation/markdown-link.jsx` 把它当代码高亮插件 |

这 7 个合计 16,200 字节。`$$2` 若第三批没有挪走，拆分开始前先按换包计划处理，不要并进第 3 节。

## 7. 拆完之后的 vendor.js，以及 from-vendor.js

### vendor.js

目标是删掉 `vendor.js`。第 3 节的 482 个声明搬走或按构建 helper 那 5 个删掉之后，文件里还剩三类东西，它们都不是这次要搬的应用声明：

1. 三批要删的 850 个库声明，以及第 5 节、第 6 节的库声明。三批做完之后这些应该已经不在。
2. `infra/from-vendor.js` 的再导出。当前 vendor.js 从该文件 import 了全部导出，再在文末的 `export { ... }` 里转出去。应用几乎都是经 vendor.js 间接用，不是直接 import from-vendor.js。
3. 已经换成 npm、但仍由 vendor.js 转发的包符号。文末具名 export 里，除了本地声明和 from-vendor 再导出，还有一批 `import` 自包然后再 export 的名字，另有 `export { ... } from "…"`（mediabunny，以及若干 `@base-ui/react` 深路径）。

只搬第 3 节、留下这个转发桶，vendor.js 不会变成「有说明的极小 re-export」。转发的名字有几百个，说不上极小。要删文件，就在第 3 节搬完之后把剩余的 `from "…/vendor.js"` 改到真实的包或 from-vendor 拆出去的模块。每个留下的转发如果暂时删不掉，必须在那个模块顶上写明包名和为什么还不能直接 import。不允许留一个没有说明的大桶。

推荐的终态是文件不存在。不推荐把 npm 转发收成一个新的 `vendor.js`。

### from-vendor.js 要一起处理

`app/renderer/src/infra/from-vendor.js` 现在 87,494 字节，导出 253 个名字。文件头写的是从打包文件里搬出的第一方语句。它和 vendor.js 里剩下的应用声明是同一类东西，只是已经搬过一次，仍堆在一个文件里。

要一起处理，排在第 3 节之后、删 vendor.js 之前。原因：vendor.js 删不掉，就是因为它还在转发这些名字；xyflow 可读副本也直接引用其中的画布 helper。三批换包不改这个文件。不要在三批完成前拆它，也不要在第 3 节的声明还引用这些名字时先把它拆散。

现在直接 import `from-vendor.js` 的文件：

- `infra/agent-http-client.js`
- `vendor-fork/xyflow/react/index.js`（`AUTO_PAN_ARM_SLACK`、`OVERSCAN_PX`、`RECOMPUTE_DELTA_PX`、`cascadeAbsolutePosition`、`edgeZones`、`getKeyboardMoveFactor`、`getNodesSelectionActiveOnPointerUp`、`maskAutoPanSides`）
- `vendor-fork/xyflow/system/index.js`（`clamp$c`、`getDragBounds`、`getDragSnapAffectedIds`、`getDragSnapReferenceBounds`）
- `vendor.js` 自身，把全部导出再转出去

其余应用文件经 vendor.js 间接使用。第 3 节每个文件下列了它引用的 from-vendor 名字，那些 import 在 from-vendor 拆开之后要跟着改一次。xyflow 两处直接 import 的路径在拆的同一批里改掉。

from-vendor.js 按现有导出的用途，落到已有目录，不新造一层。下面是聚类，不是第 3 节那种逐声明搬迁表。逐个名字的调用方要在第 3 节做完、三批也做完之后再扫一遍，因为间接 import 都还挂在 vendor.js 上。

| 聚类 | 例子 | 建议目录 |
|---|---|---|
| 运行时配置、版本、区域 | `getRuntimeConfig`、`parseSemver`、`regionToLocale`、`DEFAULT_RUNTIME_CONFIG` | `infra/` |
| 工作区身份和网关 | `API_PATHS`、`WorkspaceGatewayClient`、`withWorkspaceGatewayHeaders`、`useCurrentWorkspace` | `infra/` |
| 画布几何和拖拽，xyflow 副本在用 | `flowPointToMiniMap`、`findHitTarget`、`getDragBounds`、`maskAutoPanSides`、`CanvasNodeType` | `canvas/` |
| 存储和额度 | `useStorage` 所依赖的 `WORKSPACE_STORAGE_DEFAULTS`、`getRendererGlobalDefaults`、额度展示 | `infra/` |
| 连接器和媒体血缘 | `CONNECTOR_TOKEN_SOURCE`、`matchesLocalConnectorServer`、`mediaLineageToken`、`cdnPublicAsset` | `skills/connectors/` 与 `infra/` |
| 表格和编辑器残片 | `TableView`、`renderTableToMarkdown`、`rangeFrom` | 先对一下是不是某个已换包的编辑器私有符号；像库的不要再搬进应用目录 |
| 提示词字号的持久化 | `normalizePromptFontSize`、`readPersistedPromptFontSize` | 跟 `generation/prompt-font-size.js` 放一起 |

拆完后 `from-vendor.js` 同样删掉，或者只留一个文件头写明「这些名字已迁走」的再导出。不要让它变成第二个没有说明的桶。

## 8. 执行顺序

这一步现在不能做。顺序是：

1. 先做换包计划的第一批、第二批、第三批。每批删的是 `DELETIONS.md` 里那 850 个库声明，外加第 6 节的 7 个和第 5 节里明确属于该批的胶水（`e$1` 跟 void-elements，`a$1` 跟 speed-highlight，`commonjsRequire` / `commonjsGlobal` 跟 jszip，`requireReact` 跟 react-qr-code，`isString` 跟 i18next，`cjsExports` / `extendExports` 跟 style-to-js 和 extend，`getStoreFactory` 跟 `@tanstack/store`，`unreachable` 跟 react-markdown）。`Plus$1` 和 222 个 `withIconCompositing` 包装不删。
2. 每一批自己跑两轮 `gate.sh`，两轮都过，才算这批做完。交接文档 6.3 的单实例和补丁说明也要齐。本方案不跑门禁。
3. 三批都做完之后，在当时的 `vendor.js` 上再按声明名扫一遍。第 3 节的 482 个名字还在，850 个库名字不在，`Plus$1` 和 222 个包装还在。行号以那次扫描为准，不要用本文件里的行号删代码。
4. 第 4 节的 17 个先对包。对上了就改 import，对不上就停在原处，不要为了清空 vendor.js 把它们塞进第 3 节的文件。
5. 然后才搬第 3 节。先搬不依赖 lucide 包导入的文件，`media-editing/lucide-icon-wraps.js` 放在第二批的图标导入改完之后。`infra/cjs-interop.js` 只在两个调用方还需要时才建。
6. 接着把 from-vendor.js 按第 7 节的目录拆开，改掉 vendor.js 转发、第 3 节新文件、以及 xyflow 两处直接 import。
7. 把还从 vendor.js 拿 npm 符号的 import 改到包的公开入口。然后删除 vendor.js。若有暂时删不掉的转发，每个导出在文件头写明包名和原因，并且文件必须小到可以逐条核对。
8. 这一步自己再跑交接文档要求的检查和两轮 `gate.sh`。那是 6.6 的验收，不是开工条件。开工条件是第 2 步。

不要和正在改 vendor.js 的第一批工作副本、以及另一个并行任务同时改这个文件。不要把本分支合进 `main`，不要推到 `devin/1791701596-renderer-desource`。

## 9. 没有把握的点

- 第 4 节 17 个声明没有再跑 xcanon。判断依据是函数体和已有 import，不是逐声明形状分。
- `Operation` 没有和 travels 的源码逐字比过。
- 只核对了 `namesMatch$1` / `originsMatch$1` 这一对和 from-vendor 的同体函数。其他剩余声明没有和 from-vendor.js 做全文查重，可能还有第二份。
- 字节不含关键字和语句之间的空行。从文件里实际删掉的体积会比 82,257 大一点。
- 主题脚本那段没有名字的 `reactExports.memo` 不在声明计数里。处理 `M$3` 时如果漏了它，页面会留下一个引用已删函数的表达式。
- from-vendor.js 的 253 个导出只做了聚类，没有逐个给出调用文件。第 7 节写了要在三批和第 3 节之后再扫。
- 第二批如果没按换包计划留下 `Plus$1` 和 222 个包装，第 3 节的图标文件会对不上。本方案假设那条约束会被遵守。
- `getDefaultExportFromCjs$1` 的两个调用方可能在换包后消失，所以对应文件是条件的。
- 静态 import 扫描覆盖了 `app/renderer/src`。测试、桌面端和注释里提到的名字没有当成调用方。
