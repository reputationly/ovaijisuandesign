# chat/streamdown.jsx 闭包逐声明配对 ↔ streamdown@2.5.0

由 `tools/t2-streamdown.mjs` + `tools/gen-tables.mjs` 生成。种子：`chat/streamdown.jsx#Streamdown` ↔ `dist/index.js` 导出 `Streamdown`，沿引用闭包传播配对。

## 配对结果

### chat/streamdown.jsx（67 条）

| 声明 | 行 | 字节 | npm 声明 | npm 行 | 结论 |
|---|---|---|---|---|---|
| `rtlCharacterPattern` | 53 | 65 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#as` | 11 | 一致 |
| `unicodeLetterPattern` | 54 | 48 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#is` | 11 | 构建等价：`/\p{L}/u` 被降级成 `new RegExp("\\p{L}", "u")` |
| `getTextDirection` | 55 | 465 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#$e` | 11 | 一致 |
| `fencedCodeStartPattern` | 68 | 51 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#ls` | 11 | 一致 |
| `tableDelimiterPattern` | 69 | 81 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#cs` | 11 | 一致 |
| `hasUnclosedCodeFence` | 70 | 736 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#ht` | 11 | 一致 |
| `hasTableSeparator` | 91 | 280 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Uo` | 12 | 一致 |
| `markdownProcessorCache` | 100 | 50 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#tn` | 13 | 一致 |
| `getMarkdownProcessor` | 101 | 329 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#ws` | 13 | 一致 |
| `renderHastToJsx` | 107 | 1372 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Ps` | 13 | 一致 |
| `MarkdownBlockRenderer` | 143 | 294 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Ct` | 13 | 一致 |
| `prefixClassNames` | 149 | 312 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Gn` | 2 | 一致 |
| `createClassNameMerger` | 158 | 137 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Dt` | 2 | 一致 |
| `FileDownloadButton` | 159 | 1358 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#it` | 5 | 一致 |
| `fileExtensionPattern` | 200 | 34 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Mr` | 5 | 一致 |
| `MarkdownImageRenderer` | 201 | 4184 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#oo` | 5 | 一致 |
| `ExternalLinkConfirmation` | 314 | 4542 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#so` | 5 | 一致 |
| `TableFullscreenButton` | 440 | 3846 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Co` | 11 | 一致 |
| `MarkdownTableWrapper` | 548 | 1488 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#vo` | 11 | 一致 |
| `startingLinePattern` | 596 | 39 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#es` | 11 | 一致 |
| `noLineNumbersPattern` | 597 | 42 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#ts` | 11 | 一致 |
| `MermaidRenderer` | 598 | 183 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#os` | 11 | 构建等价：`import("./mermaid-GHXKKRXX.js")` 因 chunk 合并被内联成 `Promise.resolve().then(() => 模块命名空间)` |
| `languageClassPattern` | 603 | 42 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#ns` | 11 | 一致 |
| `isOptionEnabled` | 604 | 120 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#ft` | 11 | 一致 |
| `isTableActionEnabled` | 605 | 283 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#pt` | 11 | 一致 |
| `MarkdownOrderedList` | 614 | 516 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#bt` | 11 | 一致 |
| `MarkdownListItem` | 633 | 502 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Po` | 11 | 一致 |
| `MarkdownUnorderedList` | 649 | 517 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Mo` | 11 | 一致 |
| `MarkdownHorizontalRule` | 668 | 415 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Io` | 11 | 一致 |
| `MarkdownStrong` | 682 | 437 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#No` | 11 | 一致 |
| `MarkdownLink` | 698 | 2164 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#rs` | 11 | 一致 |
| `MemoizedMarkdownLink` | 763 | 174 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Lo` | 11 | 一致 |
| `MarkdownHeadingOne` | 765 | 459 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Ro` | 11 | 一致 |
| `MarkdownHeadingTwo` | 781 | 459 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#So` | 11 | 一致 |
| `MarkdownHeadingThree` | 797 | 460 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Eo` | 11 | 一致 |
| `MarkdownHeadingFour` | 813 | 459 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Ho` | 11 | 一致 |
| `MarkdownHeadingFive` | 829 | 461 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Do` | 11 | 一致 |
| `MarkdownHeadingSix` | 845 | 458 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Bo` | 11 | 一致 |
| `MarkdownTableRenderer` | 861 | 829 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Ao` | 11 | 一致 |
| `MarkdownTableHead` | 881 | 446 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Oo` | 11 | 一致 |
| `MarkdownTableBody` | 897 | 455 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Vo` | 11 | 一致 |
| `MarkdownTableRowRenderer` | 913 | 446 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#jo` | 11 | 一致 |
| `MarkdownTableHeaderCell` | 929 | 530 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Fo` | 11 | 一致 |
| `MarkdownDataCell` | 948 | 443 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#zo` | 11 | 一致 |
| `MarkdownBlockquote` | 964 | 551 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#_o` | 11 | 一致 |
| `MarkdownSuperscript` | 983 | 408 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#qo` | 11 | 一致 |
| `MarkdownSubscript` | 995 | 404 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#$o` | 11 | 一致 |
| `MarkdownSection` | 1007 | 3414 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Wo` | 11 | 一致 |
| `MarkdownCodeBlock` | 1090 | 5923 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#ss` | 11 | 一致 |
| `MemoizedMarkdownCode` | 1226 | 205 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Zo` | 11 | 一致 |
| `MemoizedMarkdownImage` | 1231 | 210 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Xo` | 11 | 一致 |
| `markdownComponents` | 1236 | 896 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Ko` | 11 | 一致 |
| `htmlStartPattern` | 1269 | 37 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Zs` | 23 | 一致 |
| `indentedHtmlPattern` | 1270 | 53 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Xs` | 23 | 一致 |
| `normalizeIndentedHtml` | 1271 | 211 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Js` | 23 | 一致 |
| `defaultHrefProtocols` | 1275 | 20 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#bn` | 23 | 一致 |
| `hrefProtocols` | 1276 | 13 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#hn` | 23 | 一致 |
| `defaultCodeAttributes` | 1277 | 21 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#yn` | 23 | 一致 |
| `codeAttributes` | 1278 | 14 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#wn` | 23 | 一致 |
| `markdownSanitizationSchema` | 1279 | 584 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Ze` | 23 | 一致 |
| `rehypePluginRegistry` | 1302 | 302 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#xt` | 23 | 一致 |
| `remarkPluginRegistry` | 1316 | 82 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Ks` | 23 | 一致 |
| `defaultRehypePlugins` | 1320 | 58 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#gn` | 23 | 一致 |
| `defaultRemarkPlugins` | 1321 | 58 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Us` | 23 | 一致 |
| `caretMarkers` | 1322 | 49 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Gs` | 23 | 一致 |
| `defaultBlockRenderer` | 1326 | 2217 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Tn` | 23 | 一致 |
| `Streamdown` | 1391 | 13458 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Qs` | 23 | 一致 |

### chat/xn.js（2 条）

| 声明 | 行 | 字节 | npm 声明 | npm 行 | 结论 |
|---|---|---|---|---|---|
| `vn` | 3 | 36 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#vn` | 23 | 一致 |
| `xn` | 5 | 25 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#xn` | 23 | 一致 |

### vendor.js（54 条）

| 声明 | 行 | 字节 | npm 声明 | npm 行 | 结论 |
|---|---|---|---|---|---|
| `clsx` | 11713 |  | `ext:clsx#clsx` |  | src 内联 / npm 外部导入 |
| `toJsxRuntime` | 19118 |  | `ext:hast-util-to-jsx-runtime#toJsxRuntime` |  | src 内联 / npm 外部导入 |
| `urlAttributes` | 19472 |  | `ext:html-url-attributes#urlAttributes` |  | src 内联 / npm 外部导入 |
| `remarkParse` | 20292 |  | `ext:remark-parse#default` |  | src 内联 / npm 外部导入 |
| `SKIP` | 21327 |  | `ext:unist-util-visit-parents#SKIP` |  | src 内联 / npm 外部导入 |
| `visitParents` | 21328 |  | `ext:unist-util-visit-parents#visitParents` |  | src 内联 / npm 外部导入 |
| `visit` | 21393 |  | `ext:unist-util-visit#visit` |  | src 内联 / npm 外部导入 |
| `remarkRehype` | 21595 |  | `ext:remark-rehype#default` |  | src 内联 / npm 外部导入 |
| `unified` | 23093 |  | `ext:unified#unified` |  | src 内联 / npm 外部导入 |
| `remarkGfm` | 25763 |  | `ext:remark-gfm#default` |  | src 内联 / npm 外部导入 |
| `x$6` | 27076 |  | `ext:marked#Lexer` |  | src 内联 / npm 外部导入 |
| `defaultSchema` | 35682 |  | `ext:rehype-sanitize#defaultSchema` |  | src 内联 / npm 外部导入 |
| `jt` | 39299 | 620 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#jt` | 5 | 一致 |
| `Ft` | 39313 | 876 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Ft` | 5 | 一致 |
| `zt` | 39327 | 659 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#zt` | 5 | 一致 |
| `_t` | 39341 | 1726 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#_t` | 5 | 一致 |
| `qt` | 39399 | 650 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#qt` | 5 | 一致 |
| `$t` | 39413 | 730 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#$t` | 5 | 一致 |
| `Wt` | 39427 | 634 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Wt` | 5 | 一致 |
| `Zt` | 39441 | 756 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Zt` | 5 | 一致 |
| `Xt` | 39455 | 820 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Xt` | 5 | 一致 |
| `Jt` | 39469 | 752 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Jt` | 5 | 一致 |
| `we` | 39483 | 217 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#we` | 5 | 一致 |
| `Ut` | 39495 | 35 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Ut` | 5 | 一致 |
| `fr` | 39496 | 231 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#fr` | 5 | 一致 |
| `at` | 39503 | 392 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#at` | 5 | 一致 |
| `L` | 39522 | 37 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#L` | 5 | 一致 |
| `ue` | 39523 | 503 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#ue` | 5 | 一致 |
| `ne` | 39541 | 655 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#ne` | 5 | 一致 |
| `dt` | 39567 | 705 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#dt` | 7 | 一致 |
| `je` | 39593 | 291 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#je` | 10 | 一致 |
| `re` | 39604 | 744 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#re` | 10 | 一致 |
| `qe` | 39628 | 589 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#qe` | 11 | 一致 |
| `E2` | 39637 | 87 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#E` | 11 | 一致 |
| `Jo` | 39640 | 641 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Jo` | 11 | 一致 |
| `Is` | 39662 | 30 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Is` | 13 | 一致 |
| `Ns` | 39663 | 26 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Ns` | 13 | 一致 |
| `Ls` | 39664 | 18 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Ls` | 13 | 一致 |
| `Rs` | 39665 | 140 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Rs` | 13 | 一致 |
| `nn` | 39666 | 29 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#nn` | 13 | 一致 |
| `rn` | 39667 | 29 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#rn` | 13 | 一致 |
| `Ss` | 39668 | 182 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Ss` | 13 | 一致 |
| `Es` | 39675 | 182 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Es` | 13 | 一致 |
| `sn` | 39682 | 216 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#sn` | 13 | 一致 |
| `an` | 39690 | 84 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#an` | 13 | 一致 |
| `Hs` | 39694 | 157 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Hs` | 13 | 一致 |
| `kt` | 39699 | 1056 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#kt` | 13 | 一致 |
| `ln` | 39741 | 461 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#ln` | 13 | 一致 |
| `Ds` | 39765 | 22 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Ds` | 23 | 一致 |
| `Bs` | 39766 | 33 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Bs` | 23 | 一致 |
| `cn` | 39767 | 347 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#cn` | 23 | 一致 |
| `dn` | 39779 | 125 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#dn` | 23 | 一致 |
| `mn` | 39780 | 327 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#mn` | 23 | 一致 |
| `un` | 39793 | 245 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#un` | 23 | 一致 |

### vendor-inline/minified/s2.js（12 条）

| 声明 | 行 | 字节 | npm 声明 | npm 行 | 结论 |
|---|---|---|---|---|---|
| `$e$1` | 373 |  | `ext:remend#default` |  | src 内联 / npm 外部导入 |
| `St` | 374 | 9 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#St` | 2 | 一致 |
| `Fn` | 375 | 12 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Fn` | 2 | 一致 |
| `zn` | 376 | 58 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#zn` | 2 | 一致 |
| `_n` | 377 | 90 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#_n` | 2 | 一致 |
| `qn` | 378 | 58 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#qn` | 2 | 一致 |
| `$n` | 379 | 221 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#$n` | 2 | 一致 |
| `Wn` | 389 | 173 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Wn` | 2 | 一致 |
| `Zn` | 395 | 412 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Zn` | 2 | 一致 |
| `Xn` | 415 | 753 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Xn` | 2 | 一致 |
| `Jn` | 442 | 6 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Jn` | 2 | 一致 |
| `be` | 443 | 1185 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#be` | 2 | 一致 |

### media-editing/wt.js（22 条）

| 声明 | 行 | 字节 | npm 声明 | npm 行 | 结论 |
|---|---|---|---|---|---|
| `et` | 15 | 38 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#et` | 2 | 一致 |
| `tt` | 16 | 38 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#tt` | 2 | 一致 |
| `nt` | 17 | 48 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#nt` | 3 | 一致 |
| `He` | 20 | 38 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#He` | 3 | 一致 |
| `De` | 21 | 1070 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#De` | 5 | 一致 |
| `Be` | 52 | 35 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Be` | 5 | 一致 |
| `D3` | 53 | 38 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#D` | 5 | 一致 |
| `Ve` | 54 | 37 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Ve` | 5 | 一致 |
| `ct2` | 55 | 39 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#ct` | 5 | 一致 |
| `Li` | 56 | 109 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Li` | 5 | 一致 |
| `de` | 61 | 112 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#de` | 5 | 一致 |
| `Go` | 66 | 192 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Go` | 13 | 一致 |
| `Qo` | 76 | 7 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Qo` | 13 | 一致 |
| `en` | 77 | 36 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#en` | 13 | 一致 |
| `We` | 80 | 18 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#We` | 13 | 一致 |
| `wt` | 81 | 1707 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#wt` | 13 | 一致 |
| `Cs` | 139 | 92 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Cs` | 13 | 一致 |
| `ks` | 141 | 313 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#ks` | 13 | 一致 |
| `on` | 153 | 15 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#on` | 13 | 一致 |
| `vs` | 154 | 143 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#vs` | 13 | 一致 |
| `xs` | 162 | 363 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#xs` | 13 | 一致 |
| `Ts` | 173 | 224 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Ts` | 13 | 一致 |

### settings/request-prompt-prefill.jsx（1 条）

| 声明 | 行 | 字节 | npm 声明 | npm 行 | 结论 |
|---|---|---|---|---|---|
| `rehypeSanitize` | 160 |  | `ext:rehype-sanitize#default` |  | src 内联 / npm 外部导入 |

### chat/ae.jsx（16 条）

| 声明 | 行 | 字节 | npm 声明 | npm 行 | 结论 |
|---|---|---|---|---|---|
| `he` | 10 | 49 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#he` | 2 | 一致 |
| `W2` | 12 | 666 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#W` | 2 | 一致 |
| `Ee` | 30 | 35 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Ee` | 2 | 一致 |
| `y3` | 32 | 38 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#y` | 2 | 一致 |
| `ot` | 34 | 551 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#ot` | 3 | 一致 |
| `rt` | 61 | 346 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#rt` | 3 | 一致 |
| `Oe` | 74 | 566 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Oe` | 5 | 一致 |
| `scrollLockCount` | 93 | 19 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#ke` | 5 | 一致 |
| `le` | 95 | 110 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#le` | 5 | 一致 |
| `ce` | 99 | 134 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#ce` | 5 | 一致 |
| `ao` | 103 | 458 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#ao` | 5 | 一致 |
| `To` | 118 | 290 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#To` | 11 | 一致 |
| `Fe` | 128 | 308 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Fe` | 11 | 一致 |
| `defaultMarkdownRenderOptions` | 138 | 201 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Ys` | 23 | 一致 |
| `R` | 148 | 60 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#R` | 23 | 一致 |
| `Ae` | 150 | 1959 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Ae` | 5 | 一致 |

### infra/dialog-content.jsx（1 条）

| 声明 | 行 | 字节 | npm 声明 | npm 行 | 结论 |
|---|---|---|---|---|---|
| `twMerge` | 37 |  | `ext:tailwind-merge#twMerge` |  | src 内联 / npm 外部导入 |

### workspace/build-inspiration-media-showcase-collections.js（1 条）

| 声明 | 行 | 字节 | npm 声明 | npm 行 | 结论 |
|---|---|---|---|---|---|
| `rehypeRaw` | 92 |  | `ext:rehype-raw#default` |  | src 内联 / npm 外部导入 |

### chat/te.jsx（1 条）

| 声明 | 行 | 字节 | npm 声明 | npm 行 | 结论 |
|---|---|---|---|---|---|
| `Te` | 15 | 4728 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Te` | 11 | 一致 |

### chat/pe.jsx（1 条）

| 声明 | 行 | 字节 | npm 声明 | npm 行 | 结论 |
|---|---|---|---|---|---|
| `Pe` | 7 | 3424 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Pe` | 11 | 一致 |

### chat/co.jsx（2 条）

| 声明 | 行 | 字节 | npm 声明 | npm 行 | 结论 |
|---|---|---|---|---|---|
| `convertSvgToPngBlob` | 7 | 1206 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#io` | 5 | 一致 |
| `co` | 39 | 4484 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#co` | 5 | 一致 |

### chat/fo.jsx（1 条）

| 声明 | 行 | 字节 | npm 声明 | npm 行 | 结论 |
|---|---|---|---|---|---|
| `fo` | 13 | 3807 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#fo` | 5 | 一致 |

### chat/st.jsx（3 条）

| 声明 | 行 | 字节 | npm 声明 | npm 行 | 结论 |
|---|---|---|---|---|---|
| `trimTrailingNewlines` | 8 | 202 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#lr` | 3 | 一致 |
| `LazyHighlightedCodeBlockBody` | 21 | 184 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#cr` | 4 | 构建等价：`import("./highlighted-body-OFNGDK62.js")` 只是改了文件名并包了一层 IIFE |
| `st` | 27 | 2452 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#st` | 4 | 一致 |

### chat/nn.jsx（6 条）

| 声明 | 行 | 字节 | npm 声明 | npm 行 | 结论 |
|---|---|---|---|---|---|
| `DEFAULT_DEBOUNCE_DELAY_MS` | 7 | 31 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Bn` | 2 | 一致 |
| `DEFAULT_INTERSECTION_ROOT_MARGIN` | 9 | 42 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#An` | 2 | 一致 |
| `DEFAULT_IDLE_TIMEOUT_MS` | 11 | 29 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#On` | 2 | 一致 |
| `useLazyIntersectionRendering` | 13 | 4574 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Rt` | 2 | 一致 |
| `ZoomableDiagram` | 125 | 7301 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Nn` | 23 | 一致 |
| `po` | 326 | 4593 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#po` | 23 | 一致 |

### chat/at.jsx（3 条）

| 声明 | 行 | 字节 | npm 声明 | npm 行 | 结论 |
|---|---|---|---|---|---|
| `lineNumberClassName` | 6 | 312 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#tr` | 2 | 一致 |
| `parseInlineStyle` | 20 | 458 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#or` | 2 | 一致 |
| `At` | 33 | 3980 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#At` | 2 | 一致 |

### chat/yt.js（1 条）

| 声明 | 行 | 字节 | npm 声明 | npm 行 | 结论 |
|---|---|---|---|---|---|
| `Yt` | 3 | 5131 | `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Yt` | 5 | 一致 |

### chat/highlighted-code-block-body.js（1 条）

| 声明 | 行 | 字节 | npm 声明 | npm 行 | 结论 |
|---|---|---|---|---|---|
| `R` | 5 | 846 | `streamdown@2.5.0/package/dist/highlighted-body-OFNGDK62.js#R` | 2 | 一致 |

## npm 侧未配对

- `streamdown@2.5.0/package/dist/chunk-BO2N2NFS.js#Wr`（864 字节）
