# 要从 vendor.js 删除的声明

来源：`origin/devin/analysis-remaining-artifacts` @ `17686e0` 的 `analysis/remaining/vendor-residual/decls-final.json`。行号对应该提交所分析的 `vendor.js`（本分支 `43d2cf7c` 上同一文件）。字节数是声明源码字符长度。

`installed-exact`：形状哈希与已装版本一致。`installed-cjs`：与已装版本的 CJS 词元相似度达到报告阈值。`mismatch` / `mismatch-cjs`：对上了某个未装版本，或对不上当前已装版本。`mismatch-inferred`：没有形状命中，只靠同名和位置归到该包。

xyflow 一族（`@xyflow/react`、`@xyflow/system`、zustand、classcat）不在本表。`@dagrejs/graphlib` 列在文末，只给 dagre 换包用，不进本计划的执行批次。

## travels

12 个声明，3886 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `r$5` | 18543 | 55 | installed-exact | 2.2.0 |
| `n$1` | 18544 | 315 | installed-exact | 2.2.0 |
| `o$4` | 18552 | 48 | installed-exact | 2.2.0 |
| `h$5` | 18553 | 142 | installed-exact | 2.2.0 |
| `c$4` | 18558 | 171 | installed-exact | 2.2.0 |
| `l$3` | 18563 | 674 | installed-exact | 2.2.0 |
| `p$5` | 18583 | 19 | installed-exact | 2.2.0 |
| `u$3` | 18584 | 683 | installed-exact | 2.2.0 |
| `d$3` | 18603 | 638 | installed-exact | 2.2.0 |
| `v$6` | 18620 | 79 | installed-exact | 2.2.0 |
| `y$6` | 18621 | 481 | installed-exact | 2.2.0 |
| `f$3` | 18630 | 581 | installed-exact | 2.2.0 |

## class-variance-authority

2 个声明，2056 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `falsyToString` | 11805 | 92 | installed-exact | 0.7.1 |
| `cva` | 11807 | 1964 | installed-exact | 0.7.1 |

## react-i18next

2 个声明，889 字节。

`voidElementsExports`（行 7770，43 字节）是 void-elements 的 CJS 互操作结果，被短形状误配到 react-i18next。跟 void-elements 一起删。react-i18next 只删 `Trans`。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `voidElementsExports` | 7770 | 43 | installed-exact | 15.7.4 |
| `Trans` | 7772 | 846 | installed-exact | 15.7.4 |

## extend

3 个声明，3034 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `extend$1` | 19067 | 8 | installed-cjs | 3.0.2 |
| `hasRequiredExtend` | 19068 | 17 | installed-cjs | 3.0.2 |
| `requireExtend` | 19069 | 3009 | installed-cjs | 3.0.2 |

## style-to-js

6 个声明，2060 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `utilities` | 18843 | 14 | installed-cjs | 1.1.21 |
| `hasRequiredUtilities` | 18844 | 20 | installed-cjs | 1.1.21 |
| `requireUtilities` | 18845 | 1266 | installed-cjs | 1.1.21 |
| `cjs` | 18884 | 3 | installed-cjs | 1.1.21 |
| `hasRequiredCjs` | 18885 | 14 | installed-cjs | 1.1.21 |
| `requireCjs` | 18886 | 743 | installed-cjs | 1.1.21 |

## void-elements

3 个声明，449 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `voidElements` | 7747 | 12 | installed-cjs | 3.1.0 |
| `hasRequiredVoidElements` | 7748 | 23 | installed-cjs | 3.1.0 |
| `requireVoidElements` | 7749 | 414 | installed-cjs | 3.1.0 |

## i18next

55 个声明，81524 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `defer` | 21621 | 202 | installed-exact | 25.10.10 |
| `makeString` | 21632 | 84 | installed-exact | 25.10.10 |
| `copy` | 21636 | 86 | installed-exact | 25.10.10 |
| `lastOfPathSeparatorRegExp` | 21641 | 34 | installed-exact | 25.10.10 |
| `cleanKey` | 21642 | 105 | installed-exact | 25.10.10 |
| `canNotTraverseDeeper` | 21643 | 63 | installed-exact | 25.10.10 |
| `getLastOfPath` | 21644 | 601 | installed-exact | 25.10.10 |
| `setPath` | 21664 | 662 | installed-exact | 25.10.10 |
| `pushPath` | 21686 | 179 | installed-exact | 25.10.10 |
| `getPath` | 21694 | 213 | installed-exact | 25.10.10 |
| `getPathWithDefaults` | 21703 | 180 | installed-exact | 25.10.10 |
| `deepExtend` | 21710 | 525 | installed-exact | 25.10.10 |
| `regexEscape` | 21726 | 81 | installed-exact | 25.10.10 |
| `_entityMap` | 21727 | 111 | installed-exact | 25.10.10 |
| `escape$1` | 21735 | 130 | installed-exact | 25.10.10 |
| `RegExpCache` | 21741 | 572 | installed-exact | 25.10.10 |
| `chars` | 21761 | 33 | installed-exact | 25.10.10 |
| `looksLikeObjectPathRegExpCache` | 21762 | 52 | installed-exact | 25.10.10 |
| `looksLikeObjectPath` | 21763 | 604 | installed-exact | 25.10.10 |
| `deepFind` | 21778 | 869 | installed-exact | 25.10.10 |
| `getCleanedCode` | 21810 | 51 | installed-exact | 25.10.10 |
| `consoleLogger` | 21811 | 264 | installed-exact | 25.10.10 |
| `Logger` | 21826 | 1135 | installed-exact | 25.10.10 |
| `baseLogger` | 21867 | 25 | installed-exact | 25.10.10 |
| `ResourceStore` | 21868 | 3946 | installed-exact | 25.10.10 |
| `postProcessor` | 21997 | 333 | installed-exact | 25.10.10 |
| `PATH_KEY` | 22009 | 37 | installed-exact | 25.10.10 |
| `createProxy` | 22010 | 390 | installed-exact | 25.10.10 |
| `keysFromSelector` | 22023 | 531 | installed-exact | 25.10.10 |
| `checkedLoadedFor` | 22038 | 21 | installed-exact | 25.10.10 |
| `shouldHandleAsObject` | 22039 | 99 | installed-exact | 25.10.10 |
| `Translator` | 22040 | 19261 | installed-exact | 25.10.10 |
| `LanguageUtil` | 22473 | 4507 | installed-exact | 25.10.10 |
| `suffixesOrder` | 22580 | 82 | installed-exact | 25.10.10 |
| `dummyRule` | 22588 | 139 | installed-exact | 25.10.10 |
| `PluralResolver` | 22594 | 2269 | installed-exact | 25.10.10 |
| `deepFindWithDefaults` | 22654 | 371 | installed-exact | 25.10.10 |
| `regexSafe` | 22662 | 45 | installed-exact | 25.10.10 |
| `Interpolator` | 22663 | 7918 | installed-exact | 25.10.10 |
| `parseFormatStr` | 22854 | 1189 | installed-exact | 25.10.10 |
| `createCachedFormatter` | 22885 | 523 | installed-exact | 25.10.10 |
| `createNonCachedFormatter` | 22904 | 81 | installed-exact | 25.10.10 |
| `Formatter` | 22905 | 2726 | installed-exact | 25.10.10 |
| `removePending` | 22989 | 129 | installed-exact | 25.10.10 |
| `Connector` | 22995 | 7324 | installed-exact | 25.10.10 |
| `get2` | 23204 | 1629 | installed-exact | 25.10.10 |
| `transformOptions` | 23265 | 490 | installed-exact | 25.10.10 |
| `noop$1` | 23275 | 17 | installed-exact | 25.10.10 |
| `bindMemberFunctions` | 23276 | 224 | installed-exact | 25.10.10 |
| `SUPPORT_NOTICE_KEY` | 23284 | 51 | installed-exact | 25.10.10 |
| `getSupportNoticeShown` | 23285 | 365 | mismatch-inferred | — |
| `setSupportNoticeShown` | 23291 | 113 | installed-exact | 25.10.10 |
| `usesLocize` | 23294 | 577 | installed-exact | 25.10.10 |
| `I18n` | 23306 | 19244 | installed-exact | 25.10.10 |
| `instance` | 23810 | 32 | installed-exact | 25.10.10 |

## react-day-picker

126 个声明，72689 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `setMonth` | 24329 | 390 | mismatch-inferred | — |
| `setYear` | 24340 | 184 | mismatch-inferred | — |
| `FIVE_WEEKS` | 24346 | 14 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `FOUR_WEEKS` | 24347 | 14 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `getBroadcastWeeksInMonth` | 24348 | 494 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `startOfBroadcastWeek` | 24356 | 355 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `endOfBroadcastWeek` | 24367 | 258 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `enUS` | 24373 | 2114 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `DateLib` | 24440 | 9065 | installed-exact | 9.13.1, 9.13.2, 9.14.0 |
| `defaultDateLib` | 24669 | 30 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `CalendarDay` | 24670 | 834 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `CalendarMonth` | 24691 | 104 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `CalendarWeek` | 24697 | 116 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `Button` | 24703 | 86 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `CaptionLabel` | 24708 | 90 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `Chevron` | 24713 | 906 | installed-exact | 9.13.1, 9.13.2, 9.14.0 |
| `Day` | 24737 | 155 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `DayButton` | 24747 | 320 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `UI` | 24762 | 2 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `DayFlag` | 24789 | 7 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `Animation` | 24797 | 9 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `Dropdown` | 24808 | 965 | installed-exact | 9.13.1, 9.13.2, 9.14.0 |
| `DropdownNav` | 24843 | 88 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `Footer` | 24848 | 83 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `Month` | 24853 | 177 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `MonthCaption` | 24863 | 168 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `MonthGrid` | 24873 | 88 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `Months` | 24878 | 83 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `dayPickerContext` | 24883 | 53 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `useDayPicker` | 24884 | 217 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `MonthsDropdown` | 24891 | 166 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `Nav` | 24899 | 1563 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0 |
| `NextMonthButton` | 24951 | 165 | installed-exact | 9.13.1, 9.13.2, 9.14.0 |
| `Option` | 24959 | 86 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `PreviousMonthButton` | 24964 | 169 | installed-exact | 9.13.1, 9.13.2, 9.14.0 |
| `Root` | 24972 | 146 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `Select` | 24982 | 86 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `Week` | 24987 | 130 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `Weekday` | 24996 | 83 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `Weekdays` | 25001 | 145 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `WeekNumber` | 25008 | 136 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `WeekNumberHeader` | 25017 | 92 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `Weeks` | 25022 | 84 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `YearsDropdown` | 25027 | 165 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `components` | 25035 | 473 | mismatch-inferred | — |
| `rangeIncludesDate` | 25066 | 736 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `isDateInterval` | 25091 | 144 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `isDateRange` | 25094 | 104 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `isDateAfterType` | 25097 | 109 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `isDateBeforeType` | 25100 | 111 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `isDayOfWeekType` | 25103 | 113 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `isDatesArray` | 25106 | 103 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `dateMatchModifiers` | 25109 | 1719 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `createGetModifiers` | 25159 | 2865 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `getComponents` | 25239 | 103 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `getDataAttributes` | 25245 | 594 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `formatCaption` | 25261 | 137 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `formatMonthCaption` | 25265 | 34 | installed-exact | 9.13.1, 9.13.2, 9.14.0 |
| `formatDay` | 25266 | 110 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `formatMonthDropdown` | 25269 | 105 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `formatWeekdayName` | 25272 | 127 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `formatWeekNumber` | 25275 | 229 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `formatWeekNumberHeader` | 25281 | 50 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `formatYearDropdown` | 25284 | 102 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `formatYearCaption` | 25287 | 38 | installed-exact | 9.13.1, 9.13.2, 9.14.0 |
| `defaultFormatters` | 25288 | 337 | mismatch-inferred | — |
| `getFormatters` | 25302 | 436 | installed-exact | 9.13.1, 9.13.2, 9.14.0 |
| `labelDayButton` | 25314 | 259 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `labelDay` | 25320 | 25 | installed-exact | 9.13.1, 9.13.2, 9.14.0 |
| `labelGrid` | 25321 | 133 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `labelCaption` | 25325 | 24 | installed-exact | 9.13.1, 9.13.2, 9.14.0 |
| `labelGridcell` | 25326 | 212 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `labelMonthDropdown` | 25333 | 70 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `labelNav` | 25336 | 36 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `defaultLabel` | 25339 | 37 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `labelNext` | 25340 | 63 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `labelPrevious` | 25343 | 71 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `labelWeekday` | 25346 | 116 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `labelWeekNumber` | 25349 | 81 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `labelWeekNumberHeader` | 25352 | 68 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `labelYearDropdown` | 25355 | 68 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `defaultLabels` | 25358 | 369 | mismatch-inferred | — |
| `resolveLabel` | 25376 | 239 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `getLabels` | 25383 | 1343 | mismatch-inferred | — |
| `getMonthOptions` | 25401 | 746 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `getStyleForModifiers` | 25425 | 326 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `getWeekdays` | 25437 | 438 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `getYearOptions` | 25447 | 691 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `createNoonOverrides` | 25472 | 4998 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `asHtmlElement` | 25611 | 102 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `queryMonthEls` | 25615 | 91 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `queryMonthEl` | 25616 | 89 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `queryCaptionEl` | 25617 | 93 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `queryWeeksEl` | 25618 | 89 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `queryNavEl` | 25619 | 85 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `queryWeekdaysEl` | 25620 | 95 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `useAnimation` | 25621 | 5336 | mismatch-inferred | — |
| `getDates` | 25738 | 1961 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `getDays` | 25781 | 323 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `getDisplayMonths` | 25790 | 381 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `getInitialMonth` | 25804 | 701 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `getMonths` | 25826 | 2014 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `getNavMonths` | 25874 | 1359 | installed-exact | 9.13.1, 9.13.2, 9.14.0 |
| `getNextMonth` | 25924 | 718 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `getPreviousMonth` | 25948 | 705 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `getWeeks` | 25972 | 173 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `useControlledValue` | 25978 | 251 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `useCalendar` | 25983 | 2760 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `FocusTargetPriority` | 26068 | 19 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `isFocusableDay` | 26075 | 142 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `calculateFocusTarget` | 26078 | 1173 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `getFocusableDate` | 26104 | 1196 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `getNextFocus` | 26139 | 787 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `useFocus` | 26153 | 1154 | mismatch-inferred | — |
| `useMulti` | 26189 | 1237 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `addToRange` | 26236 | 2082 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `rangeContainsDayOfWeek` | 26333 | 492 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `rangeOverlaps` | 26346 | 338 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `rangeContainsModifiers` | 26349 | 2111 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `useRange` | 26403 | 1805 | installed-exact | 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `useSingle` | 26460 | 983 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `useSelection` | 26495 | 352 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `toTimeZone` | 26510 | 164 | installed-exact | 9.13.1, 9.13.2, 9.14.0, 10.0.0, 10.0.1, 10.0.2 |
| `toZoneNoon` | 26516 | 88 | mismatch-inferred | — |
| `convertMatcher` | 26519 | 996 | mismatch-inferred | — |
| `convertMatchersToTimeZone` | 26554 | 267 | mismatch-inferred | — |

## sonner

35 个声明，40828 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `cx` | 11806 | 9 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `__insertCSS` | 11848 | 365 | mismatch-inferred | — |
| `getAsset` | 11856 | 252 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `bars` | 11870 | 24 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `Loader` | 11871 | 431 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `SuccessIcon` | 11885 | 430 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7 |
| `WarningIcon` | 11896 | 513 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7 |
| `InfoIcon` | 11907 | 508 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7 |
| `ErrorIcon` | 11918 | 409 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7 |
| `CloseIcon` | 11929 | 456 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7 |
| `useIsDocumentHidden` | 11950 | 393 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `toastsCounter` | 11961 | 17 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `Observer` | 11962 | 7806 | installed-exact | 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7 |
| `ToastState` | 12201 | 27 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `toastFunction` | 12202 | 201 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7 |
| `isHttpResponse` | 12211 | 181 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `basicToast` | 12214 | 26 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `getHistory` | 12215 | 36 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `getToasts` | 12216 | 46 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `toast` | 12217 | 335 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `isAction` | 12231 | 63 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `VISIBLE_TOASTS_AMOUNT` | 12234 | 25 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `VIEWPORT_OFFSET` | 12235 | 24 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `MOBILE_VIEWPORT_OFFSET` | 12236 | 31 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `TOAST_LIFETIME` | 12237 | 20 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `TOAST_WIDTH` | 12238 | 17 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `GAP$1` | 12239 | 10 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `SWIPE_THRESHOLD` | 12240 | 20 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `TIME_BEFORE_UNMOUNT` | 12241 | 25 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `cn$4` | 12242 | 73 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `getDefaultSwipeDirections` | 12245 | 222 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `Toast` | 12256 | 17030 | installed-exact | 2.0.7 |
| `getDocumentDirection` | 12594 | 357 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `assignOffset` | 12603 | 1038 | installed-exact | 2.0.1, 2.0.2, 2.0.3, 2.0.4, 2.0.5, 2.0.6, 2.0.7, 2.0.8 |
| `Toaster$1` | 12630 | 9408 | installed-exact | 2.0.7 |

## mediabunny

66 个声明，14325 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `isU32` | 12985 | 60 | installed-exact | 1.44.2 |
| `readExpGolomb` | 12988 | 342 | installed-exact | 1.44.2 |
| `readSignedExpGolomb` | 12999 | 149 | installed-exact | 1.44.2 |
| `writeBits` | 13003 | 337 | installed-exact | 1.44.2 |
| `toUint8Array` | 13013 | 263 | installed-exact | 1.44.2 |
| `textDecoder$1` | 13023 | 48 | installed-exact | 1.44.2 |
| `textEncoder$2` | 13024 | 48 | installed-exact | 1.44.2 |
| `isIso88591Compatible` | 13025 | 189 | installed-exact | 1.44.2 |
| `invertObject` | 13034 | 121 | installed-exact | 1.44.2 |
| `COLOR_PRIMARIES_MAP` | 13037 | 206 | installed-exact | 1.44.2 |
| `COLOR_PRIMARIES_MAP_INVERSE` | 13049 | 78 | installed-exact | 1.44.2 |
| `TRANSFER_CHARACTERISTICS_MAP` | 13050 | 334 | installed-exact | 1.44.2 |
| `TRANSFER_CHARACTERISTICS_MAP_INVERSE` | 13064 | 96 | installed-exact | 1.44.2 |
| `MATRIX_COEFFICIENTS_MAP` | 13065 | 221 | installed-exact | 1.44.2 |
| `MATRIX_COEFFICIENTS_MAP_INVERSE` | 13077 | 86 | installed-exact | 1.44.2 |
| `colorSpaceIsComplete` | 13078 | 172 | installed-exact | 1.44.2 |
| `isAllowSharedBufferSource` | 13081 | 178 | installed-exact | 1.44.2 |
| `AsyncMutex` | 13084 | 557 | installed-exact | 1.44.2 |
| `HEX_STRING_REGEX` | 13109 | 35 | installed-exact | 1.44.2 |
| `bytesToHexString` | 13110 | 107 | installed-exact | 1.44.2 |
| `reverseBitsU32` | 13114 | 299 | installed-exact | 1.44.2 |
| `binarySearchExact` | 13122 | 388 | installed-exact | 1.44.2 |
| `findLast` | 13144 | 162 | installed-exact | 1.44.2 |
| `findLastIndex$1` | 13152 | 160 | installed-exact | 1.44.2 |
| `toAsyncIterator` | 13160 | 177 | installed-exact | 1.44.2 |
| `validateAnyIterable` | 13167 | 196 | installed-exact | 1.44.2 |
| `getUint24` | 13173 | 319 | installed-exact | 1.44.2 |
| `getInt24` | 13183 | 114 | installed-exact | 1.44.2 |
| `setUint24` | 13186 | 459 | installed-exact | 1.44.2 |
| `setInt64` | 13200 | 187 | mismatch-inferred | — |
| `mapAsyncGenerator` | 13206 | 518 | installed-exact | 1.44.2 |
| `roundIfAlmostInteger` | 13235 | 186 | installed-exact | 1.44.2 |
| `roundToMultiple` | 13243 | 92 | installed-exact | 1.44.2 |
| `roundToDivisor` | 13246 | 91 | installed-exact | 1.44.2 |
| `floorToMultiple` | 13249 | 92 | installed-exact | 1.44.2 |
| `ilog` | 13253 | 89 | installed-exact | 1.44.2 |
| `ISO_639_2_REGEX` | 13261 | 30 | installed-exact | 1.44.2 |
| `SECOND_TO_MICROSECOND_FACTOR` | 13263 | 57 | installed-exact | 1.44.2 |
| `mergeRequestInit` | 13264 | 680 | installed-exact | 1.44.2 |
| `normalizeHeaders` | 13286 | 363 | installed-exact | 1.44.2 |
| `computeRationalApproximation` | 13304 | 917 | installed-exact | 1.44.2 |
| `CallSerializer` | 13336 | 173 | installed-exact | 1.44.2 |
| `isWebKitCache` | 13344 | 20 | installed-exact | 1.44.2 |
| `isWebKit` | 13345 | 386 | installed-exact | 1.44.2 |
| `isFirefoxCache` | 13353 | 21 | installed-exact | 1.44.2 |
| `isFirefox` | 13354 | 189 | installed-exact | 1.44.2 |
| `isChromiumCache` | 13360 | 22 | installed-exact | 1.44.2 |
| `isChromium` | 13361 | 237 | installed-exact | 1.44.2 |
| `chromiumVersionCache` | 13367 | 27 | installed-exact | 1.44.2 |
| `getChromiumVersion` | 13368 | 320 | installed-exact | 1.44.2 |
| `coalesceIndex` | 13381 | 61 | installed-exact | 1.44.2 |
| `closedIntervalsOverlap` | 13384 | 103 | installed-exact | 1.44.2 |
| `keyValueIterator` | 13387 | 209 | installed-exact | 1.44.2 |
| `imageMimeTypeToExtension` | 13399 | 574 | installed-exact | 1.44.2 |
| `bytesToBase64` | 13426 | 172 | installed-exact | 1.44.2 |
| `uint8ArraysAreEqual` | 13433 | 209 | installed-exact | 1.44.2 |
| `polyfillSymbolDispose` | 13444 | 80 | installed-exact | 1.44.2 |
| `isNumber$2` | 13447 | 76 | installed-exact | 1.44.2 |
| `validateRectangle` | 13454 | 723 | installed-exact | 1.44.2 |
| `toArray$1` | 13472 | 95 | installed-exact | 1.44.2 |
| `isRecordStringString` | 13481 | 202 | installed-exact | 1.44.2 |
| `RichImageData` | 13484 | 367 | installed-exact | 1.44.2 |
| `AttachedFile` | 13497 | 766 | installed-exact | 1.44.2 |
| `__defProp$2` | 13991 | 35 | installed-exact | 1.44.2 |
| `src_default$1` | 13995 | 27 | installed-exact | 1.44.2 |
| `Xt$2` | 14009 | 28 | installed-exact | 1.44.2 |

## @tanstack/store

17 个声明，11428 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `ReactiveFlags` | 21091 | 535 | installed-exact | 0.9.3 |
| `createReactiveSystem` | 21101 | 5421 | installed-exact | 0.9.3 |
| `toObserver` | 21319 | 418 | installed-exact | 0.9.3 |
| `queuedEffects` | 21328 | 18 | installed-exact | 0.9.3 |
| `cycle` | 21329 | 9 | installed-exact | 0.9.3 |
| `notifyIndex` | 21353 | 15 | installed-exact | 0.9.3 |
| `queuedEffectsLength` | 21354 | 23 | installed-exact | 0.9.3 |
| `activeSub` | 21355 | 9 | installed-exact | 0.9.3 |
| `batchDepth` | 21356 | 14 | installed-exact | 0.9.3 |
| `batch` | 21357 | 127 | installed-exact | 0.9.3 |
| `purgeDeps` | 21367 | 182 | installed-exact | 0.9.3 |
| `flush$1` | 21374 | 271 | installed-exact | 0.9.3 |
| `createAtom` | 21386 | 2700 | mismatch-inferred | — |
| `effect` | 21484 | 950 | installed-exact | 0.9.3 |
| `Store2` | 21522 | 315 | installed-exact | 0.9.3 |
| `ReadonlyStore` | 21539 | 268 | installed-exact | 0.9.3 |
| `createStore` | 21553 | 153 | installed-exact | 0.9.3 |

## @date-fns/tz

12 个声明，7700 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `tzName` | 24115 | 298 | installed-exact | 1.5.0 |
| `offsetFormatCache` | 24123 | 22 | installed-exact | 1.5.0 |
| `offsetCache` | 24124 | 16 | installed-exact | 1.5.0 |
| `tzOffset` | 24125 | 581 | installed-exact | 1.5.0 |
| `offsetRe` | 24141 | 32 | installed-exact | 1.5.0 |
| `calcOffset` | 24142 | 284 | installed-exact | 1.5.0 |
| `TZDateMini` | 24148 | 1550 | mismatch-inferred | — |
| `re$2` | 24200 | 26 | installed-exact | 1.5.0 |
| `syncToInternal` | 24222 | 184 | installed-exact | 1.5.0 |
| `syncFromInternal` | 24226 | 367 | installed-exact | 1.5.0 |
| `adjustToSystemTZ` | 24231 | 2362 | mismatch-inferred | — |
| `TZDate` | 24268 | 1978 | installed-exact | 1.5.0 |

## @dnd-kit/sortable

11 个声明，7185 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `defaultScale` | 18304 | 43 | installed-exact | 10.0.0 |
| `horizontalListSortingStrategy` | 18308 | 1120 | installed-exact | 10.0.0 |
| `getItemGap` | 18353 | 554 | installed-exact | 10.0.0 |
| `defaultScale$1` | 18365 | 45 | installed-exact | 10.0.0 |
| `verticalListSortingStrategy` | 18369 | 1133 | installed-exact | 10.0.0 |
| `getItemGap$1` | 18414 | 580 | installed-exact | 10.0.0 |
| `hasSortableData` | 18426 | 315 | installed-exact | 10.0.0 |
| `directions` | 18436 | 88 | installed-exact | 10.0.0 |
| `sortableKeyboardCoordinates` | 18437 | 2871 | mismatch-inferred | — |
| `isSameContainer` | 18522 | 200 | installed-exact | 10.0.0 |
| `isAfter$1` | 18528 | 236 | installed-exact | 10.0.0 |

## vfile

9 个声明，6508 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `basename$a` | 19169 | 1495 | installed-exact | 6.0.3 |
| `dirname` | 19227 | 513 | installed-exact | 6.0.3 |
| `extname` | 19247 | 986 | installed-exact | 6.0.3 |
| `join` | 19287 | 319 | installed-exact | 6.0.3 |
| `normalize$2` | 19298 | 348 | installed-exact | 6.0.3 |
| `normalizeString` | 19310 | 1936 | mismatch-inferred | — |
| `assertPath$1` | 19373 | 156 | installed-exact | 6.0.3 |
| `cwd` | 19379 | 32 | installed-exact | 6.0.3 |
| `getPathFromURLPosix` | 19384 | 723 | installed-exact | 6.0.3 |

## jszip

3 个声明，170032 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `jszip_min` | 15038 | 29 | mismatch-cjs | 3.10.1 |
| `hasRequiredJszip_min` | 15041 | 20 | mismatch-cjs | 3.10.1 |
| `requireJszip_min` | 15042 | 169983 | mismatch-cjs | 3.10.1 |

## lucide-react

488 个声明，93270 字节。

0.468.0 区块（行 7941–11456）。`Plus$1` 是应用改过的图标，**不删**。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `toKebabCase` | 7941 | 85 | installed-exact | 0.468.0 |
| `defaultAttributes$1` | 7942 | 227 | installed-exact | 0.468.0 |
| `Icon$1` | 7953 | 646 | installed-exact | 0.468.0 |
| `createLucideIcon` | 7974 | 350 | installed-exact | 0.468.0 |
| `Activity` | 7987 | 203 | installed-exact | 0.468.0 |
| `AlignCenter$1` | 7991 | 192 | installed-exact | 0.468.0 |
| `AlignLeft$1` | 8001 | 188 | installed-exact | 0.468.0 |
| `AlignRight$1` | 8011 | 190 | installed-exact | 0.468.0 |
| `AppWindow$1` | 8021 | 278 | installed-exact | 0.468.0 |
| `Archive$1` | 8038 | 261 | installed-exact | 0.468.0 |
| `ArrowDownToLine$1` | 8052 | 206 | installed-exact | 0.468.0 |
| `ArrowDown$1` | 8062 | 147 | installed-exact | 0.468.0 |
| `ArrowLeftRight$1` | 8069 | 256 | installed-exact | 0.468.0 |
| `ArrowLeftToLine$1` | 8082 | 205 | installed-exact | 0.468.0 |
| `ArrowLeft$1` | 8092 | 147 | installed-exact | 0.468.0 |
| `ArrowRightToLine$1` | 8099 | 209 | installed-exact | 0.468.0 |
| `ArrowRight$1` | 8109 | 148 | installed-exact | 0.468.0 |
| `ArrowUpDown$1` | 8116 | 250 | installed-exact | 0.468.0 |
| `ArrowUpFromLine$1` | 8129 | 206 | installed-exact | 0.468.0 |
| `ArrowUpRight$1` | 8139 | 151 | installed-exact | 0.468.0 |
| `ArrowUpToLine$1` | 8146 | 202 | installed-exact | 0.468.0 |
| `ArrowUp$1` | 8156 | 142 | installed-exact | 0.468.0 |
| `AtSign$1` | 8163 | 186 | installed-exact | 0.468.0 |
| `AudioLines$1` | 8172 | 332 | installed-exact | 0.468.0 |
| `AudioWaveform$2` | 8191 | 195 | installed-exact | 0.468.0 |
| `BadgeCheck$1` | 8195 | 299 | installed-exact | 0.468.0 |
| `BadgeInfo$1` | 8202 | 403 | installed-exact | 0.468.0 |
| `Ban$1` | 8218 | 159 | installed-exact | 0.468.0 |
| `BellRing$1` | 8227 | 400 | installed-exact | 0.468.0 |
| `Bell$1` | 8240 | 268 | installed-exact | 0.468.0 |
| `Blocks$1` | 8247 | 262 | installed-exact | 0.468.0 |
| `Bold$2` | 8258 | 144 | installed-exact | 0.468.0 |
| `BookOpen$1` | 8262 | 260 | installed-exact | 0.468.0 |
| `BookUser$1` | 8269 | 295 | installed-exact | 0.468.0 |
| `Bookmark$1` | 8281 | 134 | installed-exact | 0.468.0 |
| `Bot$1` | 8285 | 365 | installed-exact | 0.468.0 |
| `Box$1` | 8308 | 298 | installed-exact | 0.468.0 |
| `Boxes$1` | 8318 | 940 | installed-exact | 0.468.0 |
| `Brain$1` | 8355 | 790 | installed-exact | 0.468.0 |
| `Brush$1` | 8383 | 299 | installed-exact | 0.468.0 |
| `Bug$1` | 8390 | 742 | installed-exact | 0.468.0 |
| `Building2$1` | 8424 | 476 | installed-exact | 0.468.0 |
| `Cable$1` | 8446 | 440 | installed-exact | 0.468.0 |
| `Calculator$1` | 8462 | 642 | installed-exact | 0.468.0 |
| `CalendarDays$1` | 8503 | 583 | installed-exact | 0.468.0 |
| `Camera$1` | 8538 | 236 | installed-exact | 0.468.0 |
| `CaseSensitive$1` | 8547 | 267 | installed-exact | 0.468.0 |
| `ChartNoAxesCombined$1` | 8562 | 414 | installed-exact | 0.468.0 |
| `CheckCheck$1` | 8581 | 162 | installed-exact | 0.468.0 |
| `Check$1` | 8588 | 92 | installed-exact | 0.468.0 |
| `ChevronDown$1` | 8592 | 101 | installed-exact | 0.468.0 |
| `ChevronLeft$1` | 8596 | 103 | installed-exact | 0.468.0 |
| `ChevronRight$2` | 8600 | 104 | installed-exact | 0.468.0 |
| `ChevronUp$1` | 8604 | 99 | installed-exact | 0.468.0 |
| `Chrome$1` | 8608 | 427 | installed-exact | 0.468.0 |
| `CircleAlert$1` | 8637 | 277 | installed-exact | 0.468.0 |
| `CircleArrowUp$1` | 8655 | 223 | installed-exact | 0.468.0 |
| `CircleCheck` | 8667 | 168 | installed-exact | 0.468.0 |
| `CircleHelp$1` | 8676 | 241 | installed-exact | 0.468.0 |
| `CircleMinus$1` | 8688 | 164 | installed-exact | 0.468.0 |
| `CirclePlus` | 8697 | 207 | installed-exact | 0.468.0 |
| `CircleUserRound$1` | 8709 | 253 | installed-exact | 0.468.0 |
| `CircleX$1` | 8723 | 206 | installed-exact | 0.468.0 |
| `Circle$1` | 8735 | 107 | installed-exact | 0.468.0 |
| `Clapperboard$1` | 8741 | 354 | installed-exact | 0.468.0 |
| `ClipboardList$1` | 8754 | 461 | installed-exact | 0.468.0 |
| `ClipboardPaste$1` | 8778 | 344 | installed-exact | 0.468.0 |
| `Clipboard` | 8788 | 257 | installed-exact | 0.468.0 |
| `Clock3$1` | 8800 | 174 | installed-exact | 0.468.0 |
| `Clock$1` | 8809 | 170 | installed-exact | 0.468.0 |
| `CloudDownload$1` | 8818 | 258 | installed-exact | 0.468.0 |
| `CloudOff$1` | 8828 | 295 | installed-exact | 0.468.0 |
| `CloudUpload$1` | 8838 | 246 | installed-exact | 0.468.0 |
| `Cloud$1` | 8848 | 128 | installed-exact | 0.468.0 |
| `Code$2` | 8852 | 162 | installed-exact | 0.468.0 |
| `Cog$1` | 8859 | 819 | installed-exact | 0.468.0 |
| `Command$1` | 8902 | 152 | installed-exact | 0.468.0 |
| `Compass$1` | 8906 | 240 | installed-exact | 0.468.0 |
| `CopyPlus$1` | 8915 | 400 | installed-exact | 0.468.0 |
| `Copy$1` | 8939 | 234 | installed-exact | 0.468.0 |
| `CornerDownRight$1` | 8951 | 186 | installed-exact | 0.468.0 |
| `CreditCard$1` | 8958 | 218 | installed-exact | 0.468.0 |
| `Crosshair$1` | 8972 | 425 | installed-exact | 0.468.0 |
| `Crown$1` | 9002 | 341 | installed-exact | 0.468.0 |
| `Download$1` | 9009 | 267 | installed-exact | 0.468.0 |
| `Droplet$1` | 9022 | 182 | installed-exact | 0.468.0 |
| `Earth` | 9026 | 400 | installed-exact | 0.468.0 |
| `Ellipsis$1` | 9041 | 243 | installed-exact | 0.468.0 |
| `Expand$1` | 9057 | 308 | installed-exact | 0.468.0 |
| `ExternalLink$1` | 9070 | 247 | installed-exact | 0.468.0 |
| `EyeOff$1` | 9080 | 431 | installed-exact | 0.468.0 |
| `Eye$1` | 9093 | 241 | installed-exact | 0.468.0 |
| `FileArchive$1` | 9102 | 435 | installed-exact | 0.468.0 |
| `FileAudio$1` | 9123 | 324 | installed-exact | 0.468.0 |
| `FileClock$1` | 9133 | 321 | installed-exact | 0.468.0 |
| `FileCode$1` | 9148 | 323 | installed-exact | 0.468.0 |
| `FileDiff$1` | 9161 | 283 | installed-exact | 0.468.0 |
| `FileImage$1` | 9174 | 360 | installed-exact | 0.468.0 |
| `FileInput$1` | 9189 | 296 | installed-exact | 0.468.0 |
| `FileJson2$1` | 9202 | 407 | installed-exact | 0.468.0 |
| `FilePlus2$1` | 9215 | 289 | installed-exact | 0.468.0 |
| `FileText$1` | 9228 | 347 | installed-exact | 0.468.0 |
| `FileVideo$1` | 9244 | 264 | installed-exact | 0.468.0 |
| `FileWarning$1` | 9254 | 244 | installed-exact | 0.468.0 |
| `Files$1` | 9264 | 276 | installed-exact | 0.468.0 |
| `Film$1` | 9274 | 467 | installed-exact | 0.468.0 |
| `Flag$1` | 9303 | 209 | installed-exact | 0.468.0 |
| `FolderClock$1` | 9313 | 308 | installed-exact | 0.468.0 |
| `FolderClosed$1` | 9325 | 257 | installed-exact | 0.468.0 |
| `FolderInput$1` | 9332 | 309 | installed-exact | 0.468.0 |
| `FolderKey$1` | 9342 | 359 | installed-exact | 0.468.0 |
| `FolderMinus$1` | 9357 | 254 | installed-exact | 0.468.0 |
| `FolderOpen$1` | 9364 | 264 | installed-exact | 0.468.0 |
| `FolderPlus$1` | 9368 | 300 | installed-exact | 0.468.0 |
| `FolderUp$1` | 9378 | 302 | installed-exact | 0.468.0 |
| `FolderX$1` | 9388 | 306 | installed-exact | 0.468.0 |
| `Folder$1` | 9398 | 197 | installed-exact | 0.468.0 |
| `Gauge$1` | 9402 | 155 | installed-exact | 0.468.0 |
| `Gift` | 9409 | 370 | installed-exact | 0.468.0 |
| `GitCompare$1` | 9426 | 306 | installed-exact | 0.468.0 |
| `Globe$1` | 9443 | 240 | installed-exact | 0.468.0 |
| `GraduationCap$1` | 9455 | 329 | installed-exact | 0.468.0 |
| `Grid2x2Plus$1` | 9465 | 275 | installed-exact | 0.468.0 |
| `Grid2x2` | 9475 | 227 | installed-exact | 0.468.0 |
| `Grid3x3` | 9489 | 322 | installed-exact | 0.468.0 |
| `GripHorizontal` | 9509 | 450 | installed-exact | 0.468.0 |
| `GripVertical$1` | 9540 | 448 | installed-exact | 0.468.0 |
| `Hand$1` | 9571 | 406 | installed-exact | 0.468.0 |
| `HardDrive$1` | 9584 | 431 | installed-exact | 0.468.0 |
| `Headphones$1` | 9606 | 210 | installed-exact | 0.468.0 |
| `History$1` | 9610 | 229 | installed-exact | 0.468.0 |
| `House` | 9620 | 266 | installed-exact | 0.468.0 |
| `ImagePlus$1` | 9627 | 386 | installed-exact | 0.468.0 |
| `Import$1` | 9645 | 253 | installed-exact | 0.468.0 |
| `Inbox$1` | 9655 | 265 | installed-exact | 0.468.0 |
| `Info$2` | 9662 | 201 | installed-exact | 0.468.0 |
| `Italic$2` | 9674 | 271 | installed-exact | 0.468.0 |
| `KeyRound$1` | 9693 | 348 | installed-exact | 0.468.0 |
| `Keyboard$1` | 9703 | 528 | installed-exact | 0.468.0 |
| `Languages$1` | 9735 | 343 | installed-exact | 0.468.0 |
| `Layers2$1` | 9754 | 313 | installed-exact | 0.468.0 |
| `Layers$1` | 9761 | 412 | installed-exact | 0.468.0 |
| `LayoutGrid$1` | 9771 | 415 | installed-exact | 0.468.0 |
| `LayoutList$1` | 9800 | 420 | installed-exact | 0.468.0 |
| `LayoutTemplate$1` | 9827 | 332 | installed-exact | 0.468.0 |
| `Library$1` | 9849 | 233 | installed-exact | 0.468.0 |
| `Lightbulb$1` | 9862 | 280 | installed-exact | 0.468.0 |
| `Link2$1` | 9872 | 243 | installed-exact | 0.468.0 |
| `ListChecks$1` | 9885 | 295 | installed-exact | 0.468.0 |
| `List$1` | 9901 | 324 | installed-exact | 0.468.0 |
| `LoaderCircle$1` | 9920 | 118 | installed-exact | 0.468.0 |
| `LockKeyhole$1` | 9924 | 274 | installed-exact | 0.468.0 |
| `Lock$1` | 9940 | 204 | installed-exact | 0.468.0 |
| `LogOut$1` | 9952 | 261 | installed-exact | 0.468.0 |
| `Mail$1` | 9965 | 209 | installed-exact | 0.468.0 |
| `MapPin$1` | 9976 | 246 | installed-exact | 0.468.0 |
| `Map$2` | 9985 | 413 | installed-exact | 0.468.0 |
| `Maximize2$1` | 9995 | 327 | installed-exact | 0.468.0 |
| `Maximize$1` | 10014 | 297 | installed-exact | 0.468.0 |
| `Megaphone$1` | 10027 | 175 | installed-exact | 0.468.0 |
| `MessageCircleMore$1` | 10034 | 280 | installed-exact | 0.468.0 |
| `MessageCircle$1` | 10047 | 123 | installed-exact | 0.468.0 |
| `MessageSquareMore$1` | 10051 | 311 | installed-exact | 0.468.0 |
| `MessageSquarePlus$1` | 10064 | 256 | installed-exact | 0.468.0 |
| `MessageSquareQuote$1` | 10074 | 292 | installed-exact | 0.468.0 |
| `MessageSquare$1` | 10084 | 154 | installed-exact | 0.468.0 |
| `Mic$1` | 10088 | 270 | installed-exact | 0.468.0 |
| `Minimize2$1` | 10101 | 331 | installed-exact | 0.468.0 |
| `Minus$1` | 10120 | 85 | installed-exact | 0.468.0 |
| `MonitorUp$1` | 10124 | 334 | installed-exact | 0.468.0 |
| `Monitor$1` | 10144 | 291 | installed-exact | 0.468.0 |
| `Moon$1` | 10164 | 109 | installed-exact | 0.468.0 |
| `MousePointer2$1` | 10168 | 225 | installed-exact | 0.468.0 |
| `Music2$1` | 10172 | 157 | installed-exact | 0.468.0 |
| `Music$1` | 10181 | 225 | installed-exact | 0.468.0 |
| `Network$1` | 10195 | 446 | installed-exact | 0.468.0 |
| `Newspaper$1` | 10223 | 347 | installed-exact | 0.468.0 |
| `NotebookPen$1` | 10236 | 504 | installed-exact | 0.468.0 |
| `OctagonX` | 10255 | 412 | installed-exact | 0.468.0 |
| `PackageSearch$1` | 10265 | 535 | installed-exact | 0.468.0 |
| `Palette$1` | 10289 | 677 | installed-exact | 0.468.0 |
| `PanelBottomClose$1` | 10317 | 253 | installed-exact | 0.468.0 |
| `PanelLeftClose$1` | 10331 | 249 | installed-exact | 0.468.0 |
| `PanelLeftOpen$1` | 10345 | 246 | installed-exact | 0.468.0 |
| `PanelRightClose$1` | 10359 | 250 | installed-exact | 0.468.0 |
| `PanelRightOpen$1` | 10373 | 250 | installed-exact | 0.468.0 |
| `PanelsTopLeft$1` | 10387 | 240 | installed-exact | 0.468.0 |
| `Paperclip$1` | 10401 | 283 | installed-exact | 0.468.0 |
| `PenLine$1` | 10408 | 258 | installed-exact | 0.468.0 |
| `PencilLine$1` | 10415 | 313 | installed-exact | 0.468.0 |
| `PencilRuler$1` | 10425 | 586 | installed-exact | 0.468.0 |
| `Pencil$1` | 10444 | 256 | installed-exact | 0.468.0 |
| `Phone$1` | 10451 | 362 | installed-exact | 0.468.0 |
| `PinOff$1` | 10455 | 335 | installed-exact | 0.468.0 |
| `Pin$1` | 10468 | 323 | installed-exact | 0.468.0 |
| `Plug$1` | 10475 | 258 | installed-exact | 0.468.0 |
| `Plus$1` | 10488 | 295 | mismatch | 0.468.0 |
| `Podcast$1` | 10505 | 318 | installed-exact | 0.468.0 |
| `Power$1` | 10520 | 152 | installed-exact | 0.468.0 |
| `Puzzle$1` | 10527 | 540 | installed-exact | 0.468.0 |
| `ReceiptText$1` | 10531 | 303 | installed-exact | 0.468.0 |
| `Redo2$1` | 10544 | 185 | installed-exact | 0.468.0 |
| `Regex$1` | 10551 | 311 | installed-exact | 0.468.0 |
| `Repeat2$1` | 10564 | 275 | installed-exact | 0.468.0 |
| `ReplaceAll$1` | 10577 | 644 | installed-exact | 0.468.0 |
| `Replace$1` | 10609 | 485 | installed-exact | 0.468.0 |
| `RotateCcw$1` | 10635 | 182 | installed-exact | 0.468.0 |
| `RotateCw$1` | 10642 | 182 | installed-exact | 0.468.0 |
| `Save$1` | 10649 | 316 | installed-exact | 0.468.0 |
| `Scan$1` | 10659 | 289 | installed-exact | 0.468.0 |
| `Scissors$1` | 10672 | 342 | installed-exact | 0.468.0 |
| `ScrollText$1` | 10692 | 354 | installed-exact | 0.468.0 |
| `Search$1` | 10705 | 160 | installed-exact | 0.468.0 |
| `Send$1` | 10714 | 268 | installed-exact | 0.468.0 |
| `ServerOff$1` | 10721 | 473 | installed-exact | 0.468.0 |
| `Server` | 10740 | 402 | installed-exact | 0.468.0 |
| `Settings2$1` | 10769 | 273 | installed-exact | 0.468.0 |
| `Settings$1` | 10786 | 715 | installed-exact | 0.468.0 |
| `Share2$1` | 10795 | 417 | installed-exact | 0.468.0 |
| `ShieldAlert$1` | 10823 | 348 | installed-exact | 0.468.0 |
| `ShieldCheck$1` | 10833 | 304 | installed-exact | 0.468.0 |
| `ShieldOff$1` | 10840 | 393 | installed-exact | 0.468.0 |
| `ShoppingBag$1` | 10850 | 246 | installed-exact | 0.468.0 |
| `Shuffle$1` | 10860 | 397 | installed-exact | 0.468.0 |
| `Slash$1` | 10876 | 87 | installed-exact | 0.468.0 |
| `SlidersHorizontal$1` | 10880 | 760 | installed-exact | 0.468.0 |
| `Smartphone$1` | 10935 | 201 | installed-exact | 0.468.0 |
| `Sparkles$1` | 10947 | 523 | installed-exact | 0.468.0 |
| `Speech$1` | 10963 | 350 | installed-exact | 0.468.0 |
| `Split$1` | 10973 | 260 | installed-exact | 0.468.0 |
| `Sprout$1` | 10986 | 403 | installed-exact | 0.468.0 |
| `SquareDashed$1` | 10999 | 663 | installed-exact | 0.468.0 |
| `SquareMousePointer$1` | 11036 | 329 | installed-exact | 0.468.0 |
| `Stamp$1` | 11043 | 355 | installed-exact | 0.468.0 |
| `StickyNote$1` | 11053 | 208 | installed-exact | 0.468.0 |
| `Sun$1` | 11060 | 534 | installed-exact | 0.468.0 |
| `SwatchBook$1` | 11090 | 393 | installed-exact | 0.468.0 |
| `Tag$2` | 11103 | 315 | installed-exact | 0.468.0 |
| `ThumbsDown$1` | 11113 | 286 | installed-exact | 0.468.0 |
| `ThumbsUp$1` | 11120 | 283 | installed-exact | 0.468.0 |
| `Trash2$1` | 11127 | 394 | installed-exact | 0.468.0 |
| `TrendingUp$1` | 11149 | 188 | installed-exact | 0.468.0 |
| `TriangleAlert$1` | 11156 | 262 | installed-exact | 0.468.0 |
| `Tv$1` | 11166 | 197 | installed-exact | 0.468.0 |
| `Type$2` | 11178 | 257 | installed-exact | 0.468.0 |
| `Underline$2` | 11194 | 186 | installed-exact | 0.468.0 |
| `Undo2$1` | 11204 | 186 | installed-exact | 0.468.0 |
| `Upload$1` | 11211 | 260 | installed-exact | 0.468.0 |
| `UserRoundPlus$1` | 11224 | 280 | installed-exact | 0.468.0 |
| `UserRound$1` | 11239 | 172 | installed-exact | 0.468.0 |
| `User$1` | 11248 | 182 | installed-exact | 0.468.0 |
| `Users$1` | 11257 | 313 | installed-exact | 0.468.0 |
| `VideoOff$1` | 11272 | 293 | installed-exact | 0.468.0 |
| `Video$1` | 11282 | 243 | installed-exact | 0.468.0 |
| `Volume2$1` | 11293 | 381 | installed-exact | 0.468.0 |
| `VolumeX$1` | 11303 | 405 | installed-exact | 0.468.0 |
| `WandSparkles$1` | 11319 | 564 | installed-exact | 0.468.0 |
| `WholeWord$1` | 11344 | 354 | installed-exact | 0.468.0 |
| `WifiOff$1` | 11364 | 495 | installed-exact | 0.468.0 |
| `Wifi` | 11386 | 278 | installed-exact | 0.468.0 |
| `Workflow$1` | 11399 | 290 | installed-exact | 0.468.0 |
| `Wrench$1` | 11417 | 231 | installed-exact | 0.468.0 |
| `X$8` | 11421 | 129 | installed-exact | 0.468.0 |
| `Zap$1` | 11428 | 228 | installed-exact | 0.468.0 |
| `ZoomIn$1` | 11432 | 347 | installed-exact | 0.468.0 |
| `ZoomOut$1` | 11456 | 271 | installed-exact | 0.468.0 |

行 11474–11695 的 222 个 `withIconCompositing(...)` **不是** lucide-react@1.42.0 的图标实现。形状哈希把短调用 `const X = f(Y)` 误配到 1.42.0（该版本每个图标文件都有 `const Icon = createLucideIcon(__iconData)`）。这些声明留在应用代码里，不随换包删除。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `ActivityIcon` | 11474 | 59 | installed-exact | 1.42.0 |
| `AlertCircle` | 11475 | 63 | installed-exact | 1.42.0 |
| `AlertTriangle` | 11476 | 67 | installed-exact | 1.42.0 |
| `AlertTriangleIcon` | 11477 | 71 | installed-exact | 1.42.0 |
| `AppWindow` | 11478 | 59 | installed-exact | 1.42.0 |
| `Archive` | 11479 | 55 | installed-exact | 1.42.0 |
| `ArrowDown` | 11480 | 59 | installed-exact | 1.42.0 |
| `ArrowDownToLine` | 11481 | 71 | installed-exact | 1.42.0 |
| `ArrowLeft` | 11482 | 59 | installed-exact | 1.42.0 |
| `ArrowLeftRight` | 11483 | 69 | installed-exact | 1.42.0 |
| `ArrowLeftToLine` | 11484 | 71 | installed-exact | 1.42.0 |
| `ArrowRight` | 11485 | 61 | installed-exact | 1.42.0 |
| `ArrowRightToLine` | 11486 | 73 | installed-exact | 1.42.0 |
| `ArrowUp` | 11487 | 55 | installed-exact | 1.42.0 |
| `ArrowUpDown` | 11488 | 63 | installed-exact | 1.42.0 |
| `ArrowUpFromLine` | 11489 | 71 | installed-exact | 1.42.0 |
| `ArrowUpRight` | 11490 | 65 | installed-exact | 1.42.0 |
| `ArrowUpToLine` | 11491 | 67 | installed-exact | 1.42.0 |
| `AtSign` | 11492 | 53 | installed-exact | 1.42.0 |
| `AudioLines` | 11493 | 61 | installed-exact | 1.42.0 |
| `AudioWaveform$1` | 11494 | 69 | installed-exact | 1.42.0 |
| `BadgeCheck` | 11495 | 61 | installed-exact | 1.42.0 |
| `BadgeInfo` | 11496 | 59 | installed-exact | 1.42.0 |
| `Bell` | 11497 | 49 | installed-exact | 1.42.0 |
| `BellRing` | 11498 | 57 | installed-exact | 1.42.0 |
| `Bold$1` | 11499 | 51 | installed-exact | 1.42.0 |
| `BookUser` | 11500 | 57 | installed-exact | 1.42.0 |
| `Bot` | 11501 | 47 | installed-exact | 1.42.0 |
| `Box` | 11502 | 47 | installed-exact | 1.42.0 |
| `Boxes` | 11503 | 51 | installed-exact | 1.42.0 |
| `BoxSelect` | 11504 | 62 | installed-exact | 1.42.0 |
| `Bug` | 11505 | 47 | installed-exact | 1.42.0 |
| `Calculator` | 11506 | 61 | installed-exact | 1.42.0 |
| `ChartNoAxesCombined` | 11507 | 79 | installed-exact | 1.42.0 |
| `Check` | 11508 | 51 | installed-exact | 1.42.0 |
| `CheckCheck` | 11509 | 61 | installed-exact | 1.42.0 |
| `CheckCircle2` | 11510 | 62 | installed-exact | 1.42.0 |
| `CheckCircle2Icon` | 11511 | 66 | installed-exact | 1.42.0 |
| `ChevronDown` | 11512 | 63 | installed-exact | 1.42.0 |
| `ChevronDownIcon$1` | 11513 | 69 | installed-exact | 1.42.0 |
| `ChevronLeft` | 11514 | 63 | installed-exact | 1.42.0 |
| `ChevronLeftIcon` | 11515 | 67 | installed-exact | 1.42.0 |
| `ChevronRight$1` | 11516 | 67 | installed-exact | 1.42.0 |
| `ChevronRightIcon` | 11517 | 69 | installed-exact | 1.42.0 |
| `ChevronUp` | 11518 | 59 | installed-exact | 1.42.0 |
| `ChevronUpIcon` | 11519 | 63 | installed-exact | 1.42.0 |
| `CircleAlert` | 11520 | 63 | installed-exact | 1.42.0 |
| `CircleArrowUp` | 11521 | 67 | installed-exact | 1.42.0 |
| `CircleCheckIcon` | 11522 | 65 | installed-exact | 1.42.0 |
| `CircleIcon` | 11523 | 57 | installed-exact | 1.42.0 |
| `CircleMinus` | 11524 | 63 | installed-exact | 1.42.0 |
| `CircleX` | 11525 | 55 | installed-exact | 1.42.0 |
| `ClipboardIcon` | 11526 | 61 | installed-exact | 1.42.0 |
| `ClipboardList` | 11527 | 67 | installed-exact | 1.42.0 |
| `Cloud` | 11528 | 51 | installed-exact | 1.42.0 |
| `CloudDownload` | 11529 | 67 | installed-exact | 1.42.0 |
| `CloudIcon` | 11530 | 55 | installed-exact | 1.42.0 |
| `CloudUpload` | 11531 | 63 | installed-exact | 1.42.0 |
| `Code$1` | 11532 | 51 | installed-exact | 1.42.0 |
| `Cog` | 11533 | 47 | installed-exact | 1.42.0 |
| `Command` | 11534 | 55 | installed-exact | 1.42.0 |
| `Compass` | 11535 | 55 | installed-exact | 1.42.0 |
| `Copy` | 11536 | 49 | installed-exact | 1.42.0 |
| `CopyPlus` | 11537 | 57 | installed-exact | 1.42.0 |
| `CreditCard` | 11538 | 61 | installed-exact | 1.42.0 |
| `Crosshair` | 11539 | 59 | installed-exact | 1.42.0 |
| `Crown` | 11540 | 51 | installed-exact | 1.42.0 |
| `DownloadIcon` | 11541 | 61 | installed-exact | 1.42.0 |
| `Ellipsis` | 11542 | 57 | installed-exact | 1.42.0 |
| `ExternalLink` | 11543 | 65 | installed-exact | 1.42.0 |
| `Eye` | 11544 | 47 | installed-exact | 1.42.0 |
| `EyeIcon$1` | 11545 | 53 | installed-exact | 1.42.0 |
| `EyeOff` | 11546 | 53 | installed-exact | 1.42.0 |
| `EyeOffIcon$1` | 11547 | 59 | installed-exact | 1.42.0 |
| `FileImage` | 11548 | 59 | installed-exact | 1.42.0 |
| `FilePlus2` | 11549 | 59 | installed-exact | 1.42.0 |
| `Film` | 11550 | 49 | installed-exact | 1.42.0 |
| `FolderClock` | 11551 | 63 | installed-exact | 1.42.0 |
| `FolderClosed` | 11552 | 65 | installed-exact | 1.42.0 |
| `FolderInput` | 11553 | 63 | installed-exact | 1.42.0 |
| `FolderMinus` | 11554 | 63 | installed-exact | 1.42.0 |
| `FolderOpenIcon` | 11555 | 65 | installed-exact | 1.42.0 |
| `FolderPlus` | 11556 | 61 | installed-exact | 1.42.0 |
| `FolderUp` | 11557 | 57 | installed-exact | 1.42.0 |
| `FolderX` | 11558 | 55 | installed-exact | 1.42.0 |
| `Gauge` | 11559 | 51 | installed-exact | 1.42.0 |
| `GiftIcon` | 11560 | 51 | installed-exact | 1.42.0 |
| `GitCompare` | 11561 | 61 | installed-exact | 1.42.0 |
| `Globe` | 11562 | 51 | installed-exact | 1.42.0 |
| `Globe2` | 11563 | 50 | installed-exact | 1.42.0 |
| `GraduationCap` | 11564 | 67 | installed-exact | 1.42.0 |
| `Grid2X2` | 11565 | 53 | installed-exact | 1.42.0 |
| `Grid2x2Plus` | 11566 | 63 | installed-exact | 1.42.0 |
| `Grid3X3` | 11567 | 53 | installed-exact | 1.42.0 |
| `GripHorizontalIcon` | 11568 | 71 | installed-exact | 1.42.0 |
| `GripVertical` | 11569 | 65 | installed-exact | 1.42.0 |
| `Hand` | 11570 | 49 | installed-exact | 1.42.0 |
| `Headphones` | 11571 | 61 | installed-exact | 1.42.0 |
| `HistoryIcon` | 11572 | 59 | installed-exact | 1.42.0 |
| `Home` | 11573 | 48 | installed-exact | 1.42.0 |
| `ImagePlus` | 11574 | 59 | installed-exact | 1.42.0 |
| `Import` | 11575 | 53 | installed-exact | 1.42.0 |
| `Inbox` | 11576 | 51 | installed-exact | 1.42.0 |
| `Info$1` | 11577 | 51 | installed-exact | 1.42.0 |
| `InfoIcon$1` | 11578 | 55 | installed-exact | 1.42.0 |
| `Italic$1` | 11579 | 55 | installed-exact | 1.42.0 |
| `KeyRound` | 11580 | 57 | installed-exact | 1.42.0 |
| `Keyboard` | 11581 | 57 | installed-exact | 1.42.0 |
| `Languages` | 11582 | 59 | installed-exact | 1.42.0 |
| `Layers` | 11583 | 53 | installed-exact | 1.42.0 |
| `Layers2` | 11584 | 55 | installed-exact | 1.42.0 |
| `Layers3` | 11585 | 54 | installed-exact | 1.42.0 |
| `LayoutGrid` | 11586 | 61 | installed-exact | 1.42.0 |
| `LayoutList` | 11587 | 61 | installed-exact | 1.42.0 |
| `LayoutTemplate` | 11588 | 69 | installed-exact | 1.42.0 |
| `Library` | 11589 | 55 | installed-exact | 1.42.0 |
| `Lightbulb` | 11590 | 59 | installed-exact | 1.42.0 |
| `Link2` | 11591 | 51 | installed-exact | 1.42.0 |
| `ListChecks` | 11592 | 61 | installed-exact | 1.42.0 |
| `Loader2` | 11593 | 60 | installed-exact | 1.42.0 |
| `Loader2Icon` | 11594 | 64 | installed-exact | 1.42.0 |
| `LoaderCircle` | 11595 | 65 | installed-exact | 1.42.0 |
| `Lock` | 11596 | 49 | installed-exact | 1.42.0 |
| `LockKeyhole` | 11597 | 63 | installed-exact | 1.42.0 |
| `Mail` | 11598 | 49 | installed-exact | 1.42.0 |
| `Map$1` | 11599 | 49 | installed-exact | 1.42.0 |
| `MapPin` | 11600 | 53 | installed-exact | 1.42.0 |
| `Maximize` | 11601 | 57 | installed-exact | 1.42.0 |
| `MessageCircle` | 11602 | 67 | installed-exact | 1.42.0 |
| `MessageCircleMore` | 11603 | 75 | installed-exact | 1.42.0 |
| `MessageSquareMore` | 11604 | 75 | installed-exact | 1.42.0 |
| `Minus` | 11605 | 51 | installed-exact | 1.42.0 |
| `MinusIcon` | 11606 | 55 | installed-exact | 1.42.0 |
| `Monitor` | 11607 | 55 | installed-exact | 1.42.0 |
| `MonitorUp` | 11608 | 59 | installed-exact | 1.42.0 |
| `MoreHorizontal` | 11609 | 63 | installed-exact | 1.42.0 |
| `Music` | 11610 | 51 | installed-exact | 1.42.0 |
| `Music2` | 11611 | 53 | installed-exact | 1.42.0 |
| `Network` | 11612 | 55 | installed-exact | 1.42.0 |
| `Newspaper` | 11613 | 59 | installed-exact | 1.42.0 |
| `NotebookPen` | 11614 | 63 | installed-exact | 1.42.0 |
| `OctagonXIcon` | 11615 | 59 | installed-exact | 1.42.0 |
| `PackageSearch` | 11616 | 67 | installed-exact | 1.42.0 |
| `Palette` | 11617 | 55 | installed-exact | 1.42.0 |
| `PanelBottomClose` | 11618 | 73 | installed-exact | 1.42.0 |
| `PanelLeftClose` | 11619 | 69 | installed-exact | 1.42.0 |
| `PanelLeftOpen` | 11620 | 67 | installed-exact | 1.42.0 |
| `PanelRightClose` | 11621 | 71 | installed-exact | 1.42.0 |
| `PanelRightOpen` | 11622 | 69 | installed-exact | 1.42.0 |
| `PanelsTopLeft` | 11623 | 67 | installed-exact | 1.42.0 |
| `Pencil` | 11624 | 53 | installed-exact | 1.42.0 |
| `PencilRuler` | 11625 | 63 | installed-exact | 1.42.0 |
| `Phone` | 11626 | 51 | installed-exact | 1.42.0 |
| `Pin` | 11627 | 47 | installed-exact | 1.42.0 |
| `PinIcon` | 11628 | 51 | installed-exact | 1.42.0 |
| `PinOff` | 11629 | 53 | installed-exact | 1.42.0 |
| `Plus` | 11630 | 49 | installed-exact | 1.42.0 |
| `PlusCircle` | 11631 | 59 | installed-exact | 1.42.0 |
| `Podcast` | 11632 | 55 | installed-exact | 1.42.0 |
| `Power` | 11633 | 51 | installed-exact | 1.42.0 |
| `Redo2` | 11634 | 51 | installed-exact | 1.42.0 |
| `Regex` | 11635 | 51 | installed-exact | 1.42.0 |
| `Repeat2` | 11636 | 55 | installed-exact | 1.42.0 |
| `RotateCcw` | 11637 | 59 | installed-exact | 1.42.0 |
| `RotateCw` | 11638 | 57 | installed-exact | 1.42.0 |
| `Save` | 11639 | 49 | installed-exact | 1.42.0 |
| `Scan` | 11640 | 49 | installed-exact | 1.42.0 |
| `Scissors` | 11641 | 57 | installed-exact | 1.42.0 |
| `ScrollText` | 11642 | 61 | installed-exact | 1.42.0 |
| `Search` | 11643 | 53 | installed-exact | 1.42.0 |
| `SearchIcon` | 11644 | 57 | installed-exact | 1.42.0 |
| `Send` | 11645 | 49 | installed-exact | 1.42.0 |
| `ServerIcon` | 11646 | 55 | installed-exact | 1.42.0 |
| `ServerOff` | 11647 | 59 | installed-exact | 1.42.0 |
| `Share2` | 11648 | 53 | installed-exact | 1.42.0 |
| `ShieldAlert` | 11649 | 63 | installed-exact | 1.42.0 |
| `ShieldCheck` | 11650 | 63 | installed-exact | 1.42.0 |
| `ShieldCheckIcon` | 11651 | 67 | installed-exact | 1.42.0 |
| `ShieldOff` | 11652 | 59 | installed-exact | 1.42.0 |
| `Shuffle` | 11653 | 55 | installed-exact | 1.42.0 |
| `Slash` | 11654 | 51 | installed-exact | 1.42.0 |
| `Smartphone` | 11655 | 61 | installed-exact | 1.42.0 |
| `Speech` | 11656 | 53 | installed-exact | 1.42.0 |
| `Split` | 11657 | 51 | installed-exact | 1.42.0 |
| `SquareDashed` | 11658 | 65 | installed-exact | 1.42.0 |
| `SquareMousePointer` | 11659 | 77 | installed-exact | 1.42.0 |
| `StickyNote` | 11660 | 61 | installed-exact | 1.42.0 |
| `Sun` | 11661 | 47 | installed-exact | 1.42.0 |
| `SwatchBook` | 11662 | 61 | installed-exact | 1.42.0 |
| `Tag$1` | 11663 | 49 | installed-exact | 1.42.0 |
| `ThumbsDown` | 11664 | 61 | installed-exact | 1.42.0 |
| `ThumbsUp` | 11665 | 57 | installed-exact | 1.42.0 |
| `Trash2Icon` | 11666 | 57 | installed-exact | 1.42.0 |
| `TrendingUp` | 11667 | 61 | installed-exact | 1.42.0 |
| `TriangleAlert` | 11668 | 67 | installed-exact | 1.42.0 |
| `TriangleAlertIcon` | 11669 | 71 | installed-exact | 1.42.0 |
| `Tv` | 11670 | 45 | installed-exact | 1.42.0 |
| `Underline$1` | 11671 | 61 | installed-exact | 1.42.0 |
| `Undo2` | 11672 | 51 | installed-exact | 1.42.0 |
| `UploadIcon$1` | 11673 | 59 | installed-exact | 1.42.0 |
| `User` | 11674 | 49 | installed-exact | 1.42.0 |
| `UserRound` | 11675 | 59 | installed-exact | 1.42.0 |
| `UserRoundPlus` | 11676 | 67 | installed-exact | 1.42.0 |
| `UsersIcon` | 11677 | 55 | installed-exact | 1.42.0 |
| `Video` | 11678 | 51 | installed-exact | 1.42.0 |
| `VideoOff` | 11679 | 57 | installed-exact | 1.42.0 |
| `Volume2` | 11680 | 55 | installed-exact | 1.42.0 |
| `Volume2Icon` | 11681 | 59 | installed-exact | 1.42.0 |
| `VolumeXIcon` | 11682 | 59 | installed-exact | 1.42.0 |
| `Wand2` | 11683 | 58 | installed-exact | 1.42.0 |
| `WandSparkles` | 11684 | 65 | installed-exact | 1.42.0 |
| `WholeWord` | 11685 | 59 | installed-exact | 1.42.0 |
| `WifiIcon` | 11686 | 51 | installed-exact | 1.42.0 |
| `WifiOff` | 11687 | 55 | installed-exact | 1.42.0 |
| `WifiOffIcon` | 11688 | 59 | installed-exact | 1.42.0 |
| `Workflow` | 11689 | 57 | installed-exact | 1.42.0 |
| `Wrench` | 11690 | 53 | installed-exact | 1.42.0 |
| `X$7` | 11691 | 45 | installed-exact | 1.42.0 |
| `XIcon` | 11692 | 47 | installed-exact | 1.42.0 |
| `Zap` | 11693 | 47 | installed-exact | 1.42.0 |
| `ZoomIn` | 11694 | 53 | installed-exact | 1.42.0 |
| `ZoomOut` | 11695 | 55 | installed-exact | 1.42.0 |

## wavesurfer.js

23 个声明，43099 字节。

另外删除 decls-final 未归包、但类体是 WaveSurfer 本体的 `E$4`（行 29149，14568 字节，`class E extends c$2`，带 `static create`）。`assets/asset-panel-overlay-host.jsx` 以 `E$4 as WaveSurfer` 导入它。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `t` | 27864 | 535 | installed-exact | 7.12.2, 7.12.3, 7.12.4, 7.12.5, 7.12.6, 7.12.7, 7.12.8, 7.12.9, 7.12.10, 7.12.11, 7.12.12, 8.0.0, 8.0.1, 8.0.2 |
| `e` | 27890 | 716 | installed-exact | 7.12.2, 7.12.3, 7.12.4, 7.12.5, 7.12.6, 7.12.7, 7.12.8, 7.12.9, 7.12.10, 7.12.11, 7.12.12, 8.0.0, 8.0.1, 8.0.2 |
| `i$1` | 27919 | 1471 | mismatch | 7.12.2, 7.12.3, 7.12.4, 7.12.5, 7.12.6, 7.12.7, 7.12.8, 7.12.9, 7.12.10 |
| `n` | 27964 | 516 | installed-exact | 7.12.2, 7.12.3, 7.12.4, 7.12.5, 7.12.6, 7.12.7, 7.12.8, 7.12.9, 7.12.10, 7.12.11, 7.12.12, 8.0.0, 8.0.1, 8.0.2 |
| `s$3` | 27969 | 105 | installed-exact | 7.12.2, 7.12.3, 7.12.4, 7.12.5, 7.12.6, 7.12.7, 7.12.8, 7.12.9, 7.12.10, 7.12.11, 7.12.12, 8.0.0, 8.0.1, 8.0.2 |
| `r$4` | 27973 | 80 | mismatch | 7.12.2, 7.12.3, 7.12.4, 7.12.5, 7.12.6, 7.12.7 |
| `o$3` | 27978 | 974 | mismatch | 7.12.2, 7.12.3, 7.12.4, 7.12.5, 7.12.6, 7.12.7 |
| `a` | 28008 | 318 | installed-exact | 7.12.2, 7.12.3, 7.12.4, 7.12.5, 7.12.6, 7.12.7, 7.12.8, 7.12.9, 7.12.10, 7.12.11, 7.12.12 |
| `l$2` | 28024 | 257 | installed-exact | 7.12.2, 7.12.3, 7.12.4, 7.12.5, 7.12.6, 7.12.7, 7.12.8, 7.12.9, 7.12.10, 7.12.11, 7.12.12 |
| `h$3` | 28036 | 230 | installed-exact | 7.12.2, 7.12.3, 7.12.4, 7.12.5, 7.12.6, 7.12.7, 7.12.8, 7.12.9, 7.12.10, 7.12.11, 7.12.12 |
| `c$2` | 28046 | 4780 | mismatch-inferred | — |
| `u$2` | 28181 | 305 | installed-exact | 7.12.2, 7.12.3, 7.12.4, 7.12.5, 7.12.6, 7.12.7, 7.12.8, 7.12.9, 7.12.10, 7.12.11, 7.12.12, 8.0.0, 8.0.1, 8.0.2 |
| `d$2` | 28196 | 175 | installed-exact | 7.12.2, 7.12.3, 7.12.4, 7.12.5, 7.12.6, 7.12.7, 7.12.8, 7.12.9, 7.12.10, 7.12.11, 7.12.12, 8.0.0, 8.0.1, 8.0.2 |
| `p$3` | 28205 | 119 | installed-exact | 7.12.2, 7.12.3, 7.12.4, 7.12.5, 7.12.6, 7.12.7, 7.12.8, 7.12.9, 7.12.10, 7.12.11, 7.12.12 |
| `m$3` | 28210 | 79 | installed-exact | 7.12.2, 7.12.3, 7.12.4, 7.12.5, 7.12.6, 7.12.7, 7.12.8, 7.12.9, 7.12.10, 7.12.11, 7.12.12, 8.0.0, 8.0.1, 8.0.2 |
| `g$1` | 28213 | 172 | installed-exact | 7.12.2, 7.12.3, 7.12.4, 7.12.5, 7.12.6, 7.12.7, 7.12.8, 7.12.9, 7.12.10, 7.12.11, 7.12.12 |
| `v$3` | 28219 | 186 | installed-exact | 7.12.2, 7.12.3, 7.12.4, 7.12.5, 7.12.6, 7.12.7, 7.12.8, 7.12.9, 7.12.10, 7.12.11, 7.12.12 |
| `f$2` | 28229 | 81 | installed-exact | 7.12.2, 7.12.3, 7.12.4, 7.12.5, 7.12.6, 7.12.7, 7.12.8, 7.12.9, 7.12.10, 7.12.11, 7.12.12, 8.0.0, 8.0.1, 8.0.2 |
| `b$3` | 28233 | 1078 | installed-exact | 7.12.2, 7.12.3, 7.12.4, 7.12.5, 7.12.6, 7.12.7, 7.12.8, 7.12.9, 7.12.10, 7.12.11, 7.12.12 |
| `y$4` | 28281 | 25413 | mismatch-inferred | — |
| `C$4` | 28995 | 528 | mismatch-inferred | — |
| `S$3` | 29014 | 4773 | mismatch-inferred | — |
| `P$3` | 29137 | 208 | installed-exact | 7.12.2, 7.12.3, 7.12.4, 7.12.5, 7.12.6, 7.12.7, 7.12.8, 7.12.9, 7.12.10, 7.12.11, 7.12.12, 8.0.0, 8.0.1, 8.0.2 |

## @tiptap/extension-table

9 个声明，13465 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `TableCell$1` | 19655 | 799 | mismatch | 3.31.3 |
| `TableHeader$1` | 19695 | 810 | mismatch | 3.31.3 |
| `TableRow$1` | 19735 | 367 | mismatch | 3.27.3, 3.31.3 |
| `createCell` | 19755 | 81 | mismatch-inferred | — |
| `createTable` | 19758 | 673 | mismatch-inferred | — |
| `isCellSelection` | 19774 | 76 | mismatch | 3.27.3, 3.31.3 |
| `deleteTableWhenAllCellsSelected` | 19777 | 636 | mismatch | 3.31.3 |
| `keepCursorInTable` | 19796 | 533 | mismatch | 3.31.3 |
| `Table$2` | 19805 | 9490 | mismatch | 3.31.3 |

## shiki

7 个声明，33626 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `bundledLanguagesInfo` | 29661 | 23832 | mismatch | 3.23.0 |
| `bundledLanguagesBase` | 30676 | 93 | mismatch | 3.23.0 |
| `bundledLanguagesAlias` | 30677 | 124 | mismatch | 3.23.0 |
| `bundledLanguages` | 30678 | 76 | mismatch | 3.23.0 |
| `bundledThemesInfo` | 30682 | 9204 | mismatch | 3.23.0 |
| `bundledThemes` | 31008 | 83 | mismatch | 3.23.0 |
| `createHighlighter` | 31010 | 214 | mismatch-inferred | — |

## qr.js

27 个声明，28001 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `ErrorCorrectLevel` | 26641 | 17 | mismatch-cjs | 0.0.0 |
| `hasRequiredErrorCorrectLevel` | 26642 | 28 | mismatch-cjs | 0.0.0 |
| `requireErrorCorrectLevel` | 26643 | 233 | mismatch-cjs | 0.0.0 |
| `mode` | 26654 | 4 | mismatch-cjs | 0.0.0 |
| `hasRequiredMode` | 26655 | 15 | mismatch-cjs | 0.0.0 |
| `requireMode` | 26656 | 220 | mismatch-cjs | 0.0.0 |
| `_8BitByte` | 26667 | 9 | mismatch-cjs | 0.0.0 |
| `hasRequired_8BitByte` | 26668 | 20 | mismatch-cjs | 0.0.0 |
| `require_8BitByte` | 26669 | 529 | mismatch-cjs | 0.0.0 |
| `RSBlock` | 26690 | 7 | mismatch-cjs | 0.0.0 |
| `hasRequiredRSBlock` | 26691 | 18 | mismatch-cjs | 0.0.0 |
| `requireRSBlock` | 26692 | 5596 | mismatch-cjs | 0.0.0 |
| `BitBuffer` | 26816 | 9 | mismatch-cjs | 0.0.0 |
| `hasRequiredBitBuffer` | 26817 | 20 | mismatch-cjs | 0.0.0 |
| `requireBitBuffer` | 26818 | 906 | mismatch-cjs | 0.0.0 |
| `math` | 26852 | 4 | mismatch-cjs | 0.0.0 |
| `hasRequiredMath` | 26853 | 15 | mismatch-cjs | 0.0.0 |
| `requireMath` | 26854 | 852 | mismatch-cjs | 0.0.0 |
| `Polynomial` | 26888 | 10 | mismatch-cjs | 0.0.0 |
| `hasRequiredPolynomial` | 26889 | 21 | mismatch-cjs | 0.0.0 |
| `requirePolynomial` | 26890 | 1589 | mismatch-cjs | 0.0.0 |
| `util` | 26941 | 4 | mismatch-cjs | 0.0.0 |
| `hasRequiredUtil` | 26942 | 15 | mismatch-cjs | 0.0.0 |
| `requireUtil` | 26943 | 7130 | mismatch-cjs | 0.0.0 |
| `QRCode_1` | 27132 | 8 | mismatch-cjs | 0.0.0 |
| `hasRequiredQRCode` | 27133 | 17 | mismatch-cjs | 0.0.0 |
| `requireQRCode` | 27134 | 10705 | mismatch-cjs | 0.0.0 |

## @speed-highlight/core

119 个声明，24198 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `s$4` | 14011 | 101 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `P$7` | 14017 | 8 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `Wt$2` | 14021 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `F$6` | 14022 | 459 | mismatch | 1.2.22 |
| `$$8` | 14048 | 8 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `M$7` | 14052 | 3 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `T$6` | 14053 | 3 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `f$4` | 14054 | 931 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `v$7` | 14087 | 8 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `jt$2` | 14091 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `B$7` | 14092 | 247 | mismatch | 1.2.22 |
| `G$5` | 14107 | 8 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `Kt$1` | 14111 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `H$5` | 14112 | 947 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `_$5` | 14150 | 8 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `Vt$1` | 14154 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `k$6` | 14155 | 909 | mismatch-inferred | — |
| `z$7` | 14197 | 8 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `qt$2` | 14201 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `Y$4` | 14202 | 117 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `Z$4` | 14210 | 8 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `I$5` | 14214 | 3 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `N$4` | 14215 | 275 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `X$6` | 14230 | 8 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `Qt$1` | 14234 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `W$7` | 14235 | 227 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `j$5` | 14242 | 8 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `Jt$2` | 14246 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `K$6` | 14247 | 256 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `V$6` | 14262 | 8 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `te$3` | 14266 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `q$5` | 14267 | 581 | mismatch | 1.2.22, 1.2.23 |
| `J$6` | 14289 | 8 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `Q$6` | 14296 | 3 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `ee$3` | 14297 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `u$4` | 14298 | 3 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `l$4` | 14299 | 3 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `o$5` | 14300 | 3 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `A$5` | 14301 | 3 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `R$6` | 14302 | 1284 | mismatch-inferred | — |
| `tt$4` | 14351 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `ae$3` | 14355 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `et$4` | 14356 | 887 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `se$3` | 14391 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `E$7` | 14392 | 3 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `d$4` | 14393 | 1806 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `at$3` | 14396 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `pe$2` | 14400 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `st$3` | 14401 | 450 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `pt$2` | 14424 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `ne$4` | 14428 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `nt$4` | 14429 | 311 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `ct$3` | 14447 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `ce$3` | 14451 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `mt$2` | 14452 | 790 | mismatch | 1.2.22, 1.2.23 |
| `rt$3` | 14474 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `O$6` | 14478 | 3 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `L$7` | 14479 | 1180 | mismatch-inferred | — |
| `ot$3` | 14516 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `me$1` | 14521 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `re$6` | 14522 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `ut$2` | 14523 | 700 | mismatch-inferred | — |
| `lt$3` | 14548 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `x$8` | 14553 | 3 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `oe$3` | 14554 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `S$7` | 14555 | 326 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `Et$2` | 14570 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `ue$3` | 14575 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `le$3` | 14576 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `ht$2` | 14577 | 244 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `it$3` | 14590 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `Ee$3` | 14594 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `gt$2` | 14595 | 307 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `dt$4` | 14611 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `C$a` | 14615 | 3 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `D$7` | 14616 | 788 | mismatch-inferred | — |
| `bt$3` | 14655 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `he$3` | 14659 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `yt$2` | 14660 | 692 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `Tt$2` | 14685 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `ie$4` | 14689 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `ft$3` | 14690 | 469 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `It$1` | 14712 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `ge$2` | 14716 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `Nt$1` | 14717 | 521 | mismatch-inferred | — |
| `At$3` | 14739 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `de$4` | 14743 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `Rt$2` | 14744 | 486 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `Ot$2` | 14772 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `be$2` | 14776 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `Lt$1` | 14777 | 570 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `xt$2` | 14797 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `ye$2` | 14801 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `St$2` | 14802 | 71 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `Ct$3` | 14807 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `Te$3` | 14811 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `Dt$2` | 14812 | 946 | mismatch | 1.2.22 |
| `wt$3` | 14851 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `fe$1` | 14856 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `Ie$2` | 14857 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `Ut$2` | 14858 | 305 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `Pt$2` | 14873 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `Ne$2` | 14877 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `Ft$2` | 14878 | 709 | mismatch | 1.2.22, 1.2.23 |
| `Mt$1` | 14900 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `Ae$3` | 14904 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `$t$2` | 14905 | 3187 | mismatch-inferred | — |
| `vt$2` | 14931 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `Re$2` | 14935 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `Bt$1` | 14936 | 519 | mismatch | 1.2.22 |
| `Gt$1` | 14964 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `Oe$3` | 14968 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `Ht$1` | 14969 | 302 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `_t$2` | 14979 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `Le$2` | 14983 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `kt$2` | 14984 | 373 | mismatch | 1.2.22 |
| `zt$2` | 15005 | 9 | mismatch | 1.2.22, 1.2.23, 1.2.24, 2.0.0, 2.0.1, 2.1.0 |
| `xe$1` | 15009 | 4 | mismatch | 1.2.22, 1.2.23, 1.2.24 |
| `Yt$2` | 15010 | 445 | mismatch | 1.2.22 |

## react-qr-code

6 个声明，6337 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `lib` | 26569 | 8 | mismatch-cjs | 2.0.19~2.0.21 |
| `QRCodeSvg` | 27449 | 14 | mismatch-cjs | 2.0.19~2.0.21 |
| `hasRequiredQRCodeSvg` | 27450 | 20 | mismatch-cjs | 2.0.19~2.0.21 |
| `requireQRCodeSvg` | 27451 | 2682 | mismatch-cjs | 2.0.19~2.0.21 |
| `hasRequiredLib` | 27526 | 14 | mismatch-cjs | 2.0.19~2.0.21 |
| `requireLib` | 27527 | 3599 | mismatch-cjs | 2.0.19~2.0.21 |

## react-markdown

10 个声明，5380 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `changelog` | 19423 | 79 | mismatch | 9.0.0, 9.0.1, 9.0.2, 9.0.3, 9.1.0, 10.0.0, 10.0.1, 10.1.0 |
| `emptyPlugins` | 19424 | 17 | mismatch | 9.0.0, 9.0.1, 9.0.2, 9.0.3, 9.1.0, 10.0.0, 10.0.1, 10.1.0 |
| `emptyRemarkRehypeOptions` | 19425 | 57 | mismatch | 9.0.0, 9.0.1, 9.0.2, 9.0.3, 9.1.0, 10.0.0, 10.0.1, 10.1.0 |
| `safeProtocol$1` | 19428 | 48 | mismatch | 9.0.0, 9.0.1, 9.0.2, 9.0.3, 9.1.0, 10.0.0, 10.0.1, 10.1.0 |
| `deprecations` | 19429 | 1362 | mismatch | 10.0.0, 10.0.1, 10.1.0 |
| `Markdown$1` | 19489 | 186 | mismatch | 9.1.0, 10.0.0, 10.0.1, 10.1.0 |
| `createProcessor` | 19494 | 470 | mismatch | 9.1.0, 10.0.0, 10.0.1, 10.1.0 |
| `createFile` | 19504 | 190 | mismatch-inferred | — |
| `post` | 19512 | 2370 | mismatch-inferred | — |
| `defaultUrlTransform` | 19575 | 601 | mismatch | 9.0.2, 9.0.3, 9.1.0, 10.0.0, 10.0.1, 10.1.0 |

## inline-style-parser

3 个声明，3963 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `cjs$1` | 18661 | 5 | mismatch-cjs | 0.2.4 |
| `hasRequiredCjs$2` | 18662 | 16 | mismatch-cjs | 0.2.4 |
| `requireCjs$2` | 18663 | 3942 | mismatch-cjs | 0.2.4 |

## prop-types

9 个声明，2262 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `propTypes` | 26570 | 29 | mismatch-cjs | 15.8.1 |
| `ReactPropTypesSecret_1` | 26573 | 22 | mismatch-cjs | 15.8.1 |
| `hasRequiredReactPropTypesSecret` | 26574 | 31 | mismatch-cjs | 15.8.1 |
| `requireReactPropTypesSecret` | 26575 | 310 | mismatch-cjs | 15.8.1 |
| `factoryWithThrowingShims` | 26582 | 24 | mismatch-cjs | 15.8.1 |
| `hasRequiredFactoryWithThrowingShims` | 26583 | 35 | mismatch-cjs | 15.8.1 |
| `requireFactoryWithThrowingShims` | 26584 | 1566 | mismatch-cjs | 15.8.1 |
| `hasRequiredPropTypes` | 26632 | 20 | mismatch-cjs | 15.8.1 |
| `requirePropTypes` | 26633 | 225 | mismatch-cjs | 15.8.1 |

## style-to-object

3 个声明，1134 字节。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `cjs$2` | 18660 | 10 | mismatch-cjs | 1.0.11 |
| `hasRequiredCjs$1` | 18803 | 16 | mismatch-cjs | 1.0.11 |
| `requireCjs$1` | 18804 | 1108 | mismatch-cjs | 1.0.11 |

## streamdown

7 个声明，634 字节。

这 7 个声明是高亮插件的缓存，不是已换上的 streamdown@2.5.0 组件。同段还有未归包的 `$$2`（行 31051，1258 字节）、`G$1`（行 31099，11 字节）、`S$1`（行 31015，60 字节）、`C$1`（行 31018，152 字节）、`r`（行 31022，42 字节）、`B$1`（行 31023，109 字节）。`generation/markdown-link.jsx` 把 `G$1` 当代码高亮插件使用。换 shiki 时这一段一起处理，不把 streamdown 从 2.5.0 降回 1.6。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `c$1` | 31028 | 30 | installed-exact | 1.1.8, 1.1.9, 1.1.10, 1.2.0, 1.3.0, 1.4.0, 1.5.0, 1.5.1, 1.6.0, 1.6.1, 1.6.2, 1.6.3, 1.6.4, 1.6.5, 1.6.6, 1.6.7, 1.6.8, 1.6.9, 1.6.10, 1.6.11, 2.0.0, 2.0.1, 2.1.0, 2.2.0, 2.3.0, 2.4.0, 2.5.0, 2.6.0, 2.7.0 |
| `p$1` | 31029 | 30 | installed-exact | 1.1.8, 1.1.9, 1.1.10, 1.2.0, 1.3.0, 1.4.0, 1.5.0, 1.5.1, 1.6.0, 1.6.1, 1.6.2, 1.6.3, 1.6.4, 1.6.5, 1.6.6, 1.6.7, 1.6.8, 1.6.9, 1.6.10, 1.6.11, 2.0.0, 2.0.1, 2.1.0, 2.2.0, 2.3.0, 2.4.0, 2.5.0, 2.6.0, 2.7.0 |
| `s$1` | 31030 | 30 | installed-exact | 1.1.8, 1.1.9, 1.1.10, 1.2.0, 1.3.0, 1.4.0, 1.5.0, 1.5.1, 1.6.0, 1.6.1, 1.6.2, 1.6.3, 1.6.4, 1.6.5, 1.6.6, 1.6.7, 1.6.8, 1.6.9, 1.6.10, 1.6.11, 2.0.0, 2.0.1, 2.1.0, 2.2.0, 2.3.0, 2.4.0, 2.5.0, 2.6.0, 2.7.0 |
| `o` | 31031 | 107 | mismatch-inferred | — |
| `v$1` | 31035 | 49 | mismatch | 1.6.0, 1.6.1, 1.6.2, 1.6.3, 1.6.4, 1.6.5, 1.6.6, 1.6.7, 1.6.8, 1.6.9, 1.6.10, 1.6.11, 2.0.0, 2.0.1 |
| `x$1` | 31036 | 171 | mismatch | 1.6.0, 1.6.1, 1.6.2, 1.6.3, 1.6.4, 1.6.5, 1.6.6, 1.6.7, 1.6.8, 1.6.9, 1.6.10, 1.6.11, 2.0.0, 2.0.1 |
| `P2` | 31041 | 217 | mismatch | 1.6.0, 1.6.1, 1.6.2, 1.6.3, 1.6.4, 1.6.5, 1.6.6, 1.6.7 |

## @dagrejs/graphlib

40 个声明，18691 字节。

**不进入本计划的执行批次。** 并入 canvas 内联 dagre 换包。精确版本 4.0.1（源码常量 `pn = "4.0.1"`；37 个已匹配声明在 4.0.1 全部一致，4.0.3 只剩 35，4.0.5 只剩 23）。

| 声明 | 行 | 字节 | 状态 | 形状命中的版本 |
|---|---:|---:|---|---|
| `bn$2` | 20367 | 28 | mismatch | 3.0.4, 4.0.1, 4.0.3, 4.0.5 |
| `Le` | 20368 | 110 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `p$4` | 20374 | 7881 | mismatch-inferred | — |
| `me` | 20564 | 57 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `Ee$1` | 20567 | 77 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `C$6` | 20570 | 197 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `gn$2` | 20579 | 212 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `Y$2` | 20592 | 63 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `pn` | 20595 | 12 | mismatch | 4.0.1 |
| `ye` | 20596 | 7 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `mn$2` | 20601 | 305 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `En$1` | 20614 | 231 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `Ln$1` | 20624 | 232 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `yn$2` | 20634 | 335 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `R$4` | 20646 | 8 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `wn$2` | 20663 | 14 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `we$1` | 20664 | 131 | mismatch | 4.0.1, 4.0.3 |
| `Nn$2` | 20669 | 947 | mismatch | 4.0.1, 4.0.3 |
| `Gn$2` | 20705 | 292 | mismatch | 4.0.1, 4.0.3 |
| `Ne` | 20716 | 2001 | mismatch-inferred | — |
| `kn$1` | 20783 | 14 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `F$3` | 20784 | 145 | mismatch | 4.0.1, 4.0.3 |
| `vn$2` | 20790 | 750 | mismatch | 4.0.1, 4.0.3 |
| `_n$2` | 20812 | 131 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `Ge` | 20817 | 645 | mismatch | 4.0.1, 4.0.3 |
| `xn$1` | 20841 | 139 | mismatch | 4.0.1 |
| `Tn$2` | 20846 | 14 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `On$2` | 20847 | 115 | mismatch | 4.0.1, 4.0.3 |
| `In$1` | 20852 | 870 | mismatch | 4.0.1, 4.0.3 |
| `D$4` | 20886 | 77 | mismatch-inferred | — |
| `ke$1` | 20891 | 333 | mismatch | 4.0.1, 4.0.3 |
| `Cn$1` | 20902 | 134 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `Rn$1` | 20911 | 395 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `ve` | 20923 | 213 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `_e` | 20928 | 111 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `Pn$1` | 20933 | 54 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `Mn$1` | 20936 | 53 | mismatch | 4.0.1, 4.0.3, 4.0.5 |
| `jn` | 20939 | 713 | mismatch | 4.0.1, 4.0.3 |
| `Sn$1` | 20966 | 154 | mismatch | 4.0.1, 4.0.3 |
| `Fn$2` | 20972 | 491 | mismatch | 4.0.1, 4.0.3 |
