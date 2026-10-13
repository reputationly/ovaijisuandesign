# vendor.js 内联 Base UI / Floating UI / hls.js 版本与改动分析

- 仓库：reputationly/ovaijisuandesign，分支 `devin/1791701596-renderer-desource`（只读 worktree `~/ov-desource`，没有改动、没有提交）
- 对象：`app/renderer/src/vendor.js`（约 3 MB，87,968 行），以及其它还原文件中同名的库声明（扫描 `app/renderer/src` 全部 .js/.mjs/.jsx）
- 工具与中间产物都在 `~/baseui-hls-analysis/`（tools/、index/、closure-*.json、perstmt-*.json、excluded-*.json、scores-*.json）

## 1. 结论

| 一族 | 结论 | 行为改动 |
|---|---|---|
| Base UI | **@base-ui/react 1.3.0 + @base-ui/utils 0.2.6**（正式版，就是 1.3.0 package.json 写死的 utils 依赖）。Floating UI 部分是 1.3.0 自带的 fork（`esm/floating-ui-react/`），**不是 @floating-ui/react** | **无**。剩下 12 条不一致全部是构建器优化（已知参数值 / 死属性 / 撞名改写），在本 bundle 的调用点上没有可观察的行为差异 |
| @floating-ui/react-dom、@floating-ui/dom、@floating-ui/core、@floating-ui/utils、tabbable、reselect、use-sync-external-store | **未内联**，vendor.js 第 30–101 行是 npm 外部 `import`，版本由 lockfile 决定，本分析不涉及 | — |
| hls.js | **未内联**。整个 src 没有 `import "hls.js"`，hls.js 特有声明 0 命中；“HLS”字样全部来自 mediabunny（`vendor-inline/mediabunny/hls-segmented-input.js`、vendor.js:41370 `HLS_MIME_TYPE` 等）和 shiki 的 `hlsl` 语言 | — |

**之前“按 1.3.0 比 209 处冲突、132 处证明不了，调用参数也对不上”的原因**：版本没判错，冲突来自比对方法。(1) 没有把 @base-ui/utils 0.2.6 并进来；(2) 没有处理 jsx/jsxs、`$a` 字母后缀、`ownerWindow`↔`getWindow` 再导出、对象简写等打印/构建差异；(3) “调用参数对不上”是 Rollup 的已知参数值优化：`useToolbarRootContext(true)`、`useMenubarContext(true)` 的 `true` 被删掉，`useDialogRoot({...})` 里没人读的 `onOpenChange`/`triggerIdProp` 被删掉，见 §3.2。

npm-packages.json 里的历史候选 `@base-ui/utils@0.2.6` 和 `@base-ui/react@1.3.0` 是对的，`@floating-ui/react@0.27.20` 和 `hls.js@1.7.3` 是误判（都是通用名撞上的）。

## 2. 闭包怎么建

### 2.1 候选与入口
- 下载范围：@base-ui/react 13 个版本、@base-ui/utils 13 个、@base-ui-components/react 14 个、@base-ui-components/utils 7 个、@floating-ui/react 84 个（0.x 全部）、tabbable 12 个、reselect 13 个、hls.js 62 个（1.5–1.7，含 alpha/beta/rc）。
- 入口：按 package.json `exports`，条件优先级 browser > import > module > default（`tools/pkgfiles.mjs`，支持 `./*` 通配），从入口出发递归收集所有相对 import 的文件（Base UI 实际选的是 `esm/**`）。

### 2.2 选入规则（`tools/score.mjs`）
1. 种子：还原树里的顶层声明，只要和任一候选版本的同名声明 A 或 N 或 B（再去掉字面量）形状一致，或者 B 形状一致且长度 ≥60（改了名搬家的那种）。
2. 扩展：同名、token 相似度 ≥0.6，并且和闭包内声明有引用关系（双向都算），迭代到不动点。
3. ref-dep：vendor.js 里被闭包声明按名引用的同名候选，相似度再低也并入（同一模块内顶层绑定唯一，一定是这个依赖）。靠这条补进 `createSelector`、`useToolbarRootContext`、`useMenubarContext`。
4. 其余同名声明归为重名排除（`excluded-baseui.json`，131 条，比如 shadcn 包装、sonner 的 `SWIPE_THRESHOLD = 45`、应用自己的 `clamp`）。

最终 Base UI 闭包 763 条：vendor.js 746 条，另外 17 条在 `infra/from-vendor.js`、`canvas/popover-title.jsx`、`generation/select-content.jsx` 等文件。

### 2.3 闭包里 3 条应用自有的同名函数（不算库差异）
| 位置 | 情况 |
|---|---|
| canvas/node-shell-inner.jsx:285 `stopEvent` | 应用自己的版本只调 `stopPropagation()`；库版是 vendor.js:11842 `stopEvent$2`，exact |
| infra/from-vendor.js:870 `clamp` | 应用自己的版本没有默认参数；库版是 infra/from-vendor.js:935 `clamp`，exact |
| text-editor/collect-video-rows.js:27 `formatNumber` | 应用自己的 `Intl.NumberFormat` 包装；库版是 vendor.js:25117 `formatNumber$4`，exact |

这 3 条是因为“相似度 + 引用”规则被收进来的（它们引用了闭包里的名字），实际不属于库。

## 3. 最接近版本（1.3.0 + 0.2.6）剩余不一致的语义判定

### 3.1 “归一化一致”（norm 35 条）用到的规则：都没有行为影响
A 形状本身已经包含：去注释/空白/引号/分号；`process.env.NODE_ENV !== "production"` 按生产折叠（删掉 dev 报错文案、`displayName`）；`undefined`→`void 0`；`React.xxx`/`reactExports.xxx` 和具名 import 统一；`import * as ns` 的成员访问和具名 import 统一；JSX 脱糖成 `jsx()`；局部变量 α 重命名；还原树的 `$1`/`$a` 后缀去掉。N 形状再加：

| 规则 | 内容 | 为什么不影响行为 |
|---|---|---|
| R2 | 相邻字符串字面量拼接折叠 | 编译期常量 |
| R3 | 删掉空的或只有 `break` 的末尾 `default:` | 控制流相同 |
| R4 | 删掉条件无副作用的空 `if` | 不执行任何东西 |
| R5 | 块内 `function f(){}` ↔ `let f = function(){}` | 块内函数声明在 ESM 严格模式下就是块级绑定，且调用都在声明之后 |
| R6 | 删掉对空函数的调用（`disableEslintWarning(x)`，1.3.0 `CompositeList.js` 里 `function disableEslintWarning(_) {}`） | 空函数，参数是普通标识符，没有副作用 |
| R7 | `jsxs` ↔ `jsx` | React 生产版 jsx-runtime 里 `jsxs === jsx`（静态 children 只是 dev 校验提示） |
| R8 | `{k: k}` ↔ `{k}` | 同一个 AST |
| R10 | `if (x);` ↔ `if (x) {}` | 同上 |
| R11 | `let a=…, b=…` 拆成多条声明 | 求值顺序相同 |
| R12 | `ownerWindow` ↔ `getWindow` | @base-ui/utils 0.2.6 `esm/owner.js` 是 `export { getWindow as ownerWindow } from '@floating-ui/utils/dom'`，同一个函数 |
| R13 | `let Store$1 = class Store {…}` ↔ `class Store {…}` | Rollup 撞名改写，类体逐字一致（tools/storecheck.mjs 验证 A 相等），外部没有重新赋值 |
| R14 | 去掉源码里多余的括号（`throw (/*c*/ new Error())`） | 打印形式 |

### 3.2 “diff” 15 条逐条判定
| # | 声明（vendor 行） | vendor 与 dist 的差异 | 判定 | 证据 |
|---|---|---|---|---|
| 1–3 | stopEvent / clamp / formatNumber（应用文件） | 见 §2.3 | 不属于库 | 库版各自 exact |
| 4 | `useToolbarRootContext`（20163） | 删掉了 `if (context === undefined && !optional) throw` | 无行为影响（已知参数值） | vendor 里 4 个调用点（MenuPopup、SelectPopup、PopoverPopup、ToggleGroup）在 dist 里**全部**传 `true`；会传空参数的 Toolbar.* 部件没打进 bundle（vendor 里没有 `ToolbarRootContext.Provider`）。`optional===true` 时这个分支永远不走 |
| 5–8 | MenuPopup(20269)、SelectPopup(23919)、PopoverPopup(27071)、ToggleGroup(81739) | `useToolbarRootContext(true)` → `useToolbarRootContext()` | 无行为影响 | 被调函数已经不读参数（#4） |
| 9 | `useMenubarContext`（21154） | 删掉了 `if (context === null && !optional) throw` | 无行为影响（已知参数值） | dist 里打进 bundle 的调用点 MenuRoot、MenuTrigger/useMenuParent 都传 `true`；Menubar 组件没打进来（vendor 里没有 `MenubarContext.Provider`） |
| 10 | `useMenuParent`（22085） | `useMenubarContext(true)` → `()` | 无行为影响 | 同 #9；MenuRoot（21378）在 vendor 里仍然传 `true` |
| 11 | `createGenericEventDetails`（12366） | `customProperties ?? EMPTY_OBJECT` → `EMPTY_OBJECT` | 无行为影响（已知参数值） | vendor 里只有 2 个调用点（SliderRoot、SliderControl 的 onValueCommitted），都只传 2 个参数 → 第三个参数恒为 undefined。用到第三个参数的 Combobox 没打进来 |
| 12 | `createSelector`（14645，utils） | 只留下 `if (a) selector = a; else throw`，删掉 2–6 个 selector 的分支 | 无行为影响（已知参数值） | Babel 统计 vendor 里 `createSelector(...)` 98 处调用，**全部 1 个参数** → `b..f` 恒为 undefined。旁边 14638 行残留的一句 `createSelectorCreator({...})` 就是 `reselectCreateSelector`（只有 createSelectorMemoized 用它，那个函数没被用到），绑定被删掉、调用表达式保留 |
| 13–14 | DialogRoot(57237)、AlertDialogRoot(76997) | 传给 `useDialogRoot({...})` 的对象少了 `onOpenChange`、`triggerIdProp` | 无行为影响（死属性） | 1.3.0 `useDialogRoot(params)` 只解构 `store, parentContext, actionsRef`，`params` 没有别的用处（vendor 57056 一样） |
| 15 | `Store`（14705，utils） | `let Store$1 = class Store` | 无行为影响 | R13 |

**行为改动：0 条。** 没有一条声明在本 bundle 的实际调用条件下和 1.3.0/0.2.6 表现不同。

推断（没有逐字核实）：#4–#14 是 Rollup 的“已知参数值/未用属性”tree-shaking 产物，不是人工修改。依据是改动全部都只在调用方传的值恒定时才成立，而且没有一处改了交互逻辑。具体是哪个 Rollup 版本没有核实。

## 4. 补丁与验证

虽然没有行为改动，我还是按要求做了“构建等价补丁”，用来证明剩下的差异**全部**能用上面这些规则解释。这两个补丁**不需要**打进项目，因为它们不改变本 bundle 里的行为。另外它们会让没打进来的 Toolbar.*/Menubar 部件失去 context 缺失时的报错：

- `patch/base-ui-react-1.3.0.buildeq.patch`：针对 npm `@base-ui/react@1.3.0` 包根（`patch -p1`），改 10 个文件，对应 #4–#11、#13、#14
- `patch/base-ui-utils-0.2.6.buildeq.patch`：针对 `@base-ui/utils@0.2.6`，改 1 个文件，对应 #12

验证步骤：拷贝 npm 包 → `patch -p1 --dry-run` 再正式打 → 当作 `1.3.0-buildeq`/`0.2.6-buildeq` 重新建索引 → 用同一个闭包重新打分。结果：763 条里 exact 720、norm 39、diff 4、missing 0。剩下的 4 条是 3 条应用重名加上 Store（R13，单独验证 A 相等），**全部一致**（SCORES.md 最后一行）。

## 5. 共享内部对象 / 双实例风险

1. **Base UI 和“Floating UI”是同一个包**：FloatingTreeContext、FloatingNodeContext、PortalContext、FloatingDelayGroupContext、FloatingTreeStore、FloatingRootStore 都定义在 `@base-ui/react/esm/floating-ui-react/`，vendor 里也是和 Base UI 组件一起内联的。不存在“Base UI 换 npm、Floating UI 留 vendor”这种拆法；要是另外装 `@floating-ui/react`，它的 FloatingTree 和 Base UI 的那份互不相通（Tooltip/Menu 嵌套关闭、FloatingDelayGroup 都会失效）。
2. **@base-ui/react ↔ @base-ui/utils**：React context 都在 react 包里（1.3.0 有 82 个文件调用 createContext，utils 0.2.6 一个都没有），但两边共享 utils 里的 `ReactStore`/`Store` 类、`useStore`、`createSelector`、`EMPTY_OBJECT`/`EMPTY_ARRAY` 等常量身份、`useId`、`Timeout`/`useTimeout`。react 换成 npm、utils 留 vendor，会产生两份 Store 类和两份空常量（引用相等判断失效、多一次渲染），所以必须 **react 1.3.0 和 utils 0.2.6 一起换**（npm 装 1.3.0 时 utils 本来就会精确拉 0.2.6）。
3. **应用代码直接依赖 vendor 里的 Base UI 内部符号**（`shared-imports.txt`）：104 个闭包名被应用文件从 vendor 导入，其中不在公开 exports 里的内部对象有 `usePopoverRootContext`（canvas/popover-title.jsx）、`SelectGroupContext`/`useSelectGroupContext`（generation/select-content.jsx）、`ProgressRootContext`（generation/use-model-catalog-scope-key.js）、`AvatarRootContext`/`useAvatarRootContext`、`avatarStateAttributesMapping`（infra/inline-rename-input.jsx）、`useRenderElement`、`formatErrorMessage`、`useTimeout`、`mergeProps`、`useBaseUiId`、`useIsoLayoutEffect` 等。1.3.0 的 `exports` 只有 46 个组件级子路径，不能 deep import 这些文件。**切换时，这些地方要么跟着改成走公开 API，要么继续从同一份实例拿**；只换组件不换这些 context，Provider 和 Consumer 会分属两份实例，`useXxxContext` 拿到的是 undefined。
4. **npm 外部依赖是共享的，但没有状态**：闭包里用到的 `@floating-ui/react-dom`（useFloating 等）、`@floating-ui/dom`（computePosition/autoUpdate/platform）、`@floating-ui/utils(/dom)`、`tabbable`、`reselect`、`use-sync-external-store/shim(+with-selector)` 都是 vendor 的 npm import，vendor 里其它库也在用（比如 zustand 用 with-selector）。这些都是纯函数或没有模块级状态的 shim，多一份副本不会出错，只是体积变大。
5. vendor.js 内部闭包外的声明按名引用闭包的地方（shared-vendor.txt）只有 `disabled`、`update`、`useId`、`getTarget` 这类通用标识符，查过都是撞名（属性名或局部名），没有发现别的内联库共用 Base UI 的 context/store。

## 6. 没能确定的点
- 闭包选入第 2 步用了 token 相似度 ≥0.6 的启发式；被排除的 131 条重名里，如果有被删改到相似度 <0.6、又没被闭包引用的库声明，会被漏掉。vendor 里 Base UI 行段（11573–27200）内被排除的只有 `CloseIcon`(18780，sonner)、`SWIPE_THRESHOLD`(19091，sonner)、`assert`(27199)、上面已补回的 3 条，没有发现漏收的库代码。
- §5.5 的引用分析按标识符名做，没有做作用域解析。
- 构建器是 Rollup、改动是自动优化，这是推断；具体版本和开关没有核实。
- npm 外部依赖（@floating-ui/*、tabbable 等）的实际版本取决于 lockfile，不在本次范围内。
