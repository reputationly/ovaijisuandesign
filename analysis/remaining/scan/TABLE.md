# 任务 3：全量扫描命中表

由 `tools/t3-index.mjs`（src/npm 两侧形状哈希）+ `tools/t3-match.mjs` 生成，人工复核列见“复核”。完整机器结果：`matches-accepted.json`（接受）、`matches-all.json`（含因短/通用被拒的）。

| 文件 | 声明 | 行 | 字节 | 匹配包@版本 | 是否一致 | 复核 |
|---|---|---|---|---|---|---|
| pdf.worker.min-yatZIOMy.mjs | （755 条声明，逐条略，见 matches-accepted.json） | | 701911 | pdfjs-dist@4.10.38 | 一致 | 整文件与 pdfjs-dist@4.10.38 build/pdf.worker.min.mjs 字节一致（cmp 相同）；pdf-parse 命中是它内置的同源 pdf.js，忽略 |
| infra/from-vendor.js | `Bitstream2` | 941 | 1485 | mediabunny@1.44.2、@mediabunny/aac-encoder@1.44.2 | 一致（形状哈希相同） | 真命中 |
| infra/from-vendor.js | `WidgetType2` | 1318 | 2295 | @codemirror/view@6.43.6 | 一致（形状哈希相同） | 真命中 |
| infra/from-vendor.js | `getCssSelector` | 1546 | 283 | @tanstack/router-core@1.168.9 | 一致（形状哈希相同） | 真命中 |
| infra/from-vendor.js | `CatchBoundaryImpl` | 1556 | 841 | @tanstack/react-router@1.168.10 | 一致（形状哈希相同） | 真命中 |
| infra/from-vendor.js | `isCtrlEvent` | 1608 | 127 | @tanstack/react-router@1.168.10 | 一致（形状哈希相同） | 真命中 |
| infra/from-vendor.js | `EventEmitter3` | 1614 | 1142 | i18next@25.10.10 | 一致（形状哈希相同） | 真命中 |
| chat/streamdown.jsx | `getTextDirection` | 55 | 465 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/streamdown.jsx | `hasUnclosedCodeFence` | 70 | 736 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/streamdown.jsx | `hasTableSeparator` | 91 | 280 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/streamdown.jsx | `getMarkdownProcessor` | 101 | 329 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/streamdown.jsx | `renderHastToJsx` | 107 | 1372 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/streamdown.jsx | `MarkdownBlockRenderer` | 143 | 294 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/streamdown.jsx | `prefixClassNames` | 149 | 312 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/streamdown.jsx | `createClassNameMerger` | 158 | 137 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/streamdown.jsx | `FileDownloadButton` | 159 | 1358 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/streamdown.jsx | `MarkdownImageRenderer` | 201 | 4184 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/streamdown.jsx | `ExternalLinkConfirmation` | 314 | 4542 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/streamdown.jsx | `TableFullscreenButton` | 440 | 3846 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/streamdown.jsx | `MarkdownTableWrapper` | 548 | 1488 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/streamdown.jsx | `isOptionEnabled` | 604 | 120 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/streamdown.jsx | `isTableActionEnabled` | 605 | 283 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/streamdown.jsx | `MarkdownLink` | 698 | 2164 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/streamdown.jsx | `MarkdownCodeBlock` | 1090 | 5923 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/streamdown.jsx | `normalizeIndentedHtml` | 1271 | 211 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| canvas/use-persist.js | `CanvasSnapshotNotHydratedError` | 32 | 222 | hono@4.13.9 | 近似（仅字面量不同） | 假阳性：通用 Error 子类结构 |
| workspace/build-inspiration-media-showcase-collections.js | `c2` | 103 | 591 | remend@1.3.0 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `isFenceMarkerAtPosition` | 119 | 425 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `L` | 125 | 379 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `f` | 136 | 792 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `E` | 158 | 272 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `g` | 165 | 343 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `X` | 175 | 308 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `C2` | 182 | 318 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `h` | 189 | 583 | remend@1.3.0 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `isThematicBreakLine` | 204 | 834 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `isValidEmphasisDelimiter` | 236 | 783 | remend@1.3.0 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `countValidAsteriskDelimiters` | 257 | 794 | remend@1.3.0 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `countTripleAsteriskRuns` | 278 | 879 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `A` | 299 | 620 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `countDoubleUnderscoreMarkers` | 320 | 653 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `isAsteriskEmphasisInListContext` | 341 | 547 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `j` | 353 | 449 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `isUnderscoreEmphasisInListContext` | 366 | 549 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `Q` | 378 | 741 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `findSingleAsteriskDelimiter` | 396 | 1248 | remend@1.3.0 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `Z` | 439 | 446 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `hasBalancedAsteriskDelimiters` | 446 | 217 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `isAsteriskDelimiterInListContext` | 451 | 272 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/build-inspiration-media-showcase-collections.js | `V2` | 453 | 487 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| chat/nn.jsx | `useLazyIntersectionRendering` | 13 | 4574 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/nn.jsx | `ZoomableDiagram` | 125 | 7301 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/nn.jsx | `po` | 326 | 4593 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| team/create-invite-link-page.jsx | `optionClass` | 39 | 189 | effect@4.0.0-beta.83 | 近似（仅字面量不同） | 假阳性：通用字符串格式化箭头函数 |
| vendor-inline/minified/s2.js | `x` | 6 | 140 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `En` | 10 | 138 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `Mn` | 18 | 54 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `nn$1` | 19 | 236 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `en$1` | 30 | 194 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `Nn$1` | 34 | 239 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `yn$1` | 42 | 353 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `Rn` | 58 | 239 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `rn$1` | 73 | 49 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `sn$1` | 74 | 51 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `Un` | 75 | 390 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `on$1` | 86 | 361 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `Wn$1` | 99 | 645 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `B` | 122 | 340 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `ln$1` | 139 | 545 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `tn$1` | 168 | 137 | remend@1.3.0 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `an$1` | 172 | 552 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `S2` | 191 | 25 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `Fn$1` | 192 | 26 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `zn$1` | 325 | 710 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `vn$1` | 348 | 773 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `_n` | 377 | 90 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `qn` | 378 | 58 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `$n` | 379 | 221 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `Wn` | 389 | 173 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `Zn` | 395 | 412 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `Xn` | 415 | 753 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| vendor-inline/minified/s2.js | `be` | 443 | 1185 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| workspace/asset-lineage-query-key.js | `useWSConnection` | 47 | 259 | @xyflow/react@12.11.6 | 近似（仅字面量不同） | 假阳性：通用 zustand/context hook 结构（且 xyflow 不在本次范围） |
| settings/settings-select.jsx | `WorkspaceCanvasPersistenceUnavailableError` | 176 | 209 | hono@4.13.9 | 近似（仅字面量不同） | 假阳性：通用 Error 子类结构 |
| settings/settings-select.jsx | `WorkspaceCanvasPersistenceChangedError` | 182 | 212 | hono@4.13.9 | 近似（仅字面量不同） | 假阳性：通用 Error 子类结构 |
| team/calendar.jsx | `getDefaultClassNames` | 25 | 452 | react-day-picker@9.14.0 | 一致（形状哈希相同） | 真命中 |
| media-editing/wt.js | `Li` | 56 | 109 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| media-editing/wt.js | `de` | 61 | 112 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| media-editing/wt.js | `Go` | 66 | 192 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| media-editing/wt.js | `wt` | 81 | 1707 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| media-editing/wt.js | `Cs` | 139 | 92 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| media-editing/wt.js | `ks` | 141 | 313 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| media-editing/wt.js | `on` | 153 | 15 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| media-editing/wt.js | `vs` | 154 | 143 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| media-editing/wt.js | `xs` | 162 | 363 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| media-editing/wt.js | `Ts` | 173 | 224 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| assets/use-canvas-model-registry-hydration.js | `useWorkspaceProductionPlanDisclosureStore` | 118 | 317 | @xyflow/react@12.11.6 | 近似（仅字面量不同） | 假阳性：通用 zustand/context hook 结构（且 xyflow 不在本次范围） |
| chat/ae.jsx | `he` | 10 | 49 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/ae.jsx | `W2` | 12 | 666 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/ae.jsx | `y3` | 32 | 38 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/ae.jsx | `ot` | 34 | 551 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/ae.jsx | `rt` | 61 | 346 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/ae.jsx | `Oe` | 74 | 566 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/ae.jsx | `le` | 95 | 110 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/ae.jsx | `ce` | 99 | 134 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/ae.jsx | `ao` | 103 | 458 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/ae.jsx | `To` | 118 | 290 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/ae.jsx | `Fe` | 128 | 308 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/ae.jsx | `Ae` | 150 | 1959 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/co.jsx | `convertSvgToPngBlob` | 7 | 1206 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/co.jsx | `co` | 39 | 4484 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| workspace/q.js | `hasClosingParenBeforeLineBreak` | 10 | 269 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/q.js | `isInsideMarkdownLinkDestination` | 22 | 415 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/q.js | `isInsideAngleBracketTag` | 36 | 541 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/q.js | `isUnderscoreExcludedFromEmphasis` | 52 | 469 | remend@1.3.0 | 一致（形状哈希相同） | 真命中 |
| workspace/q.js | `countValidUnderscoreDelimiters` | 62 | 798 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/q.js | `findOpeningUnderscoreDelimiter` | 83 | 1005 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/q.js | `appendClosingUnderscore` | 112 | 394 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/q.js | `appendUnderscoreBeforeTrailingAsterisks` | 129 | 545 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| workspace/q.js | `J2` | 137 | 688 | remend@1.3.0/1.3.1 | 一致（形状哈希相同） | 真命中 |
| chat/te.jsx | `Te` | 15 | 4728 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/at.jsx | `parseInlineStyle` | 20 | 458 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/fo.jsx | `fo` | 13 | 3807 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/pe.jsx | `Pe` | 7 | 3424 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/st.jsx | `trimTrailingNewlines` | 8 | 202 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/st.jsx | `st` | 27 | 2452 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |
| chat/highlighted-code-block-body.js | `R` | 5 | 846 | streamdown@2.5.0 | 一致（形状哈希相同） | 真命中 |

## 按包汇总（机器接受数，未扣除假阳性）

| 包 | 声明数 | 形状一致 | 字节 | 文件数 | 命中版本 |
|---|---|---|---|---|---|
| pdfjs-dist | 755 | 755 | 701911 | 1 | 4.10.38、5.4.296 |
| pdf-parse | 557 | 557 | 247400 | 1 | 2.4.5 |
| streamdown | 59 | 59 | 77756 | 12 | 2.5.0 |
| remend | 54 | 54 | 24851 | 3 | 1.3.0、1.3.1 |
| @codemirror/view | 1 | 1 | 2295 | 1 | 6.43.6 |
| mediabunny | 1 | 1 | 1485 | 1 | 1.44.2 |
| @mediabunny/aac-encoder | 1 | 1 | 1485 | 1 | 1.44.2 |
| i18next | 1 | 1 | 1142 | 1 | 25.10.10 |
| @tanstack/react-router | 2 | 2 | 968 | 1 | 1.168.10 |
| hono | 3 | 0 | 643 | 2 | 4.13.9 |
| @xyflow/react | 2 | 0 | 576 | 2 | 12.11.6 |
| react-day-picker | 1 | 1 | 452 | 1 | 9.14.0 |
| @tanstack/router-core | 1 | 1 | 283 | 1 | 1.168.9 |
| effect | 1 | 0 | 189 | 1 | 4.0.0-beta.83 |
