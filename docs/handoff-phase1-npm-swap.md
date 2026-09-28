# 界面源码还原 · 阶段 1 交接（npm 替换）

写给下一个接手的 agent。日期 2026-09-27，分支 `replicate-official-stack`，工作区有未提交改动（见下）。
背景（为什么做这件事）见 `docs/remaining-work.md` 四节开头的引言和记忆里的 plan B 说明；本文只讲阶段 1 的现状、调试方法、下一步。

## 目标

参照渲染层（`reference/3.0.16/app/out/renderer/assets/index-C4qF1HE0.js`，511k 行）已经拆成
`app/renderer/src/vendor.js`（第三方库，约 6842 条顶层语句）+ `app/renderer/src/main.jsx`（参照自己的代码，约 11888 条）。
阶段 1 要把 vendor 里的库**逐个换成 npm 包的 import**，最后 vendor 只剩少量拼装代码；
每换一批都要构建 + 和 `official-raw`（参照原样，不打补丁）逐屏像素对比，差异必须是 0.000%。

## 当前状态（截至停手时）

**能跑通的部分：** react、react-dom、@lezer/common 三个包已换成功（gen-renderer 全流程跑通过，8 屏对比 0.000%，是上个会话验证的）。

**像素对比的假差异已查清（2026-09-28）。** 一度出现 home 7.704% / skills 6.393%，看着像我们换包改坏了渲染。查了四层：
差异永远落在卡片封面那 432px 宽 × 240px 高的矩形里（差异带 `y1222-1464`、`y533-770`、`y1091-1328`，列段 `634-1065` / `2031-2461`），
非封面区域逐行完全一致；而这些封面是 **CDN 上的 mp4**（`cdn.hailuoai.com/...`，实测 18 个 `video` 元素里只有 4~8 个能解码出来）。
**决定性证据**：不挡 CDN 时，同一种模式连跑两次差 **7.342%**——比两种构建之间的差（2.451%）还大。
所以这是采集噪声，不是渲染回归。`compare.mjs` 现在采集时挡掉 `*cdn.hailuoai.com*`，改完连跑两次 8 屏全 0.000%。
（另外顺带修了两处会让结果不可信的东西：截图改成"连拍到相邻两帧一致"，`diff` 的硬编码阈值 24 收进 `TOL` 常量。）
**注意**：`official-raw` ↔ `official-raw` 这种自比会写同名文件、自己和自己比必然 0%，别拿它当"稳定"的证据。

**卡住的地方：** 完整跑 `gen-renderer.mjs`（88 包清单时）从第 4 个包 @floating-ui/dom 起级联失败。今天诊断跑（40 分钟后手动杀掉）输出在
`/private/tmp/claude-501/…/tasks/bhygob901.output`（本机会话临时目录，可能已清理；结论已抄在下面）：

- 3 个包成功（react / react-dom / @lezer/common）；
- @floating-ui/dom 76 处冲突、@codemirror/view 228 处、@base-ui/react 249 处，其余 4~20 名全部失败。

失败原因分三类（按占比）：

1. **依赖闭包不全（主因，级联）。** swapEsm 规则 3 要求"包引用的 vendor 语句只能是已换的包"，清单缺依赖就失败，且依赖它的包跟着失败。
   今天已把清单从 88 补到 119（`scripts/decompile/npm-packages.json`，重跑了 `npm-plan.mjs`）：
   - 30 个检测过但没进清单的包（i18next、tabbable、sonner、d3-zoom、@tanstack/store 等）已进；
   - 新检测了传递依赖：`@floating-ui/utils@0.2.12`（命中 15）、`@tanstack/form-core@1.33.5`（命中 1）已进；
   - **还缺但检测不出（0 命中）**：`scheduler`、`use-sync-external-store`、`rememo`、`@remix-run/router` ——它们在 bundle 里形状被打包器改写（比如 use-sync-external-store 被打进 react-redux 类 wrapper，scheduler 被打进 react-dom 的 CJS wrapper），
     建议先按下面"版本人工定"的办法补；
   - `@tanstack/history` **npm registry 上 1.161.9 版本被撤/不存在**（`npm view time` 里有发布时间但 404），@tanstack/react-router 的依赖没法用这个版本检测，
     需要换一个存在的近似版本（1.161.4~1.161.12 或 1.170.x）人工指定。@tanstack/react-router 自身检测是 1.170.32、命中 7。
2. **个别包文本形状对不上（真失败，需逐个看）。** 目前已知的一个：`reselect@5.2.0`。
   vendor 里它的内部函数 `createLruCache$1(maxSize, equals2)` 和 dist 的 `createLruCache(maxSize, comparator)`——**参数名不同**（equals2 vs comparator），
   `norm()` 把非属性标识符都换成 `_`，应该能匹配……实际没匹配上，需要用 dbg 工具（见下）对比 norm 后的形状找差异。
   同类可疑：@lezer/highlight（tags 定义被识别成"不是导出"）、w3c-keyname（mac$1/ie$5 是内部变量被外部引用——这个其实是**分类问题**：keyName 函数在 main，引用了 vendor 里的 mac$1，说明 split 把 w3c-keyname 拆散了）。
3. **性能没解决。** swapEsm 的剔除循环对大包要几百轮，每轮全量扫 body（采样热点全在 `FindOrderedHashSetEntry`/Set 查找），
   平均 2 分钟/包，119 个包约 4 小时。上个会话改的"只分析一次"（`a.swapped` 集合）没治根——贵的是冲突循环里每次重算 `mine` 的邻接扫描。

## 工具和用法（都在 scripts/decompile/，不在 pnpm 工作区，先 `npm install`）

```
# 归类（一般不用重跑，.probe/decompile/classified.json 已在）
bash scripts/decompile/run-all.sh

# 版本反推：对单个包，取截止日期前最近 20 个版本，数 bundle 里 lib 语句形状命中数
node scripts/decompile/npm-versions.mjs 2026-09-18 <包名>...
#   结果追加到 .probe/decompile/npm-versions.json；可用 OUT=xxx.json 指定输出文件（目录要先建）
#   ⚠ OUT 是相对 .probe/decompile 的路径，mkdir .probe/decompile/tmp && OUT=tmp/deps-x.json

# 按依赖拓扑排序生成替换清单（合并所有 npm-versions*.json，已进的保留在前）
node scripts/decompile/npm-plan.mjs > 新清单.json

# 生成 app/renderer/src（会整目录覆盖！先提交或备份手头的改动）
node scripts/decompile/gen-renderer.mjs
#   SWAP_STRICT=0 时换不动的包只打印 ✗ 不中断（调试用）
#   注意：会写 app/renderer/package.json 和根 package.json 的 pnpm.overrides

# 构建还原版界面 → app/desktop/out/recovered-ui
pnpm --filter @ov/renderer build

# 参照原样基准（不打补丁）→ app/desktop/out/official-ui-raw
node app/official-ui/build.mjs --raw

# 逐屏像素对比（official-raw ↔ recovered，隐藏窗口跑，8 个页面）
node scripts/ui-compare/compare.mjs
#   结果在 .probe/ui-compare/<时间戳>/，report.json 里 diff 百分比；要求全部 0.000%
#   采集时会挡掉 CDN 上那批卡片封面视频（*cdn.hailuoai.com*）：它们是外部资源、边下边播，
#   同一份界面连跑两次能差出 7%，会把真正的界面差异淹掉。挡掉后两边封面都是空白，差异才有意义。
```

调试单个包为什么没认全：`scripts/decompile/dbg-swap.mjs`（**我刚建了个空壳，没写完**）。
本来要做的事：对报冲突的名字（swapEsm 打印的原名，如 `cmpRange`、`mac$1`），把 vendor 里该语句的
norm 形状和包 dist（`moduleGraph` 走到的文件拼接文本）对一遍，打印：语句头 60 字、形状长度、是否 `text.includes(s)`、
dist 里同名定义的原文片段。需要从 `npm-swap.mjs` export `moduleGraph`（现在是模块内函数，我在 dbg-swap.mjs 里写了个
`with { "module-graph": "private" }` 的占位 import，那是无效语法，删掉改成正常 export/import）。

## swapEsm 的三条冲突规则（读代码：scripts/decompile/npm-swap.mjs）

1. 外面没认出的语句在初始化时给它的对象挂属性（`X.none = …`）→ 命中原文就收进来，否则冲突/踢出；
2. 对外暴露的名字必须是包的导出（`exportMap`，名字带 `$1` 后缀会试 baseCandidates 剥后缀匹配）；
3. 它引用的 vendor 语句只能是已换的包 / 打包器辅助函数 / CommonJS 互操作语句。

冲突落在长语句（strong）上 = 真问题报错；落在短语句上 = 多半是邻居的，踢出重算（evict 循环）。

## 建议的接手顺序

1. **先修 dbg-swap.mjs（半小时）**：export moduleGraph，写完对比逻辑。没有它，第 2、3 步都是盲飞。
2. **补齐 0 命中的四个包**：scheduler@0.28.0（react-dom 19.2.4 的依赖，pnpm 上看 react-dom 要什么就给什么）、
   use-sync-external-store（react 19 自带 useSyncExternalStore，**可能 bundle 里根本没用这个包**，先 grep vendor 确认再决定要不要进清单）、
   rememo（@tanstack/react-query 5.x 的依赖）、@remix-run/router（可能是 @tanstack/react-router 的旧名，先确认 vendor 里有没有它的代码）。
   版本以"和检测出的父包版本配套"为准：`npm view <父包>@<检测版本> dependencies`。
3. **重跑 gen-renderer（SWAP_STRICT=0）拿全量失败清单**，按包统计冲突数排序，先修依赖链上游（@floating-ui/*、@lezer/*、reselect）。
4. **修 reselect 一类形状不匹配**：用 dbg-swap 对比；如果只是 minifier 改了参数名/局部变量，考虑给 norm() 加一条归一化（比如把 `function _(a,b)` 的参数名也抹掉要小心——字符串和属性名不能动）。
   **宁可少换不要错换**：换错一半比不换危害大（双实例、instanceof 错）。换不动的包留在 vendor 里不丢人，阶段 1 结束时 vendor 里剩多少算多少，阶段 2 继续拆 main。
5. **每修一批就全流程验证**：`gen-renderer → build → build.mjs --raw → compare.mjs`，8 屏 0.000% 才算过。
   注意 compare.mjs 起真 Electron（隐藏窗口），只能本机跑。
6. **性能**：如果全量跑还是 >1 小时，把 evict 循环改成增量（只重扫受影响的语句区间），或者干脆把 strong 邻接扩展做成一次性区间合并。但先 correctness 后 speed，别倒过来。

## 工作区状态（未提交，接手先看）

- `scripts/decompile/npm-packages.json`（新文件）：119 个包的替换清单，**今天已更新**（含拓扑排序结果）；
- `scripts/decompile/npm-swap.mjs` / `npm-versions.mjs` / `npm-plan.mjs`（新文件）：上个会话写的替换工具，今天没大改；
- `scripts/decompile/dbg-swap.mjs`（新文件，**空壳没写完**）；
- `M scripts/decompile/gen-renderer.mjs`：接入了 swapPackages + writeDependencies；
- `M scripts/decompile/split.mjs`：两条规则微调（不引用任何东西的语句进 vendor 更安全；main 的依赖钉在 main 防摆动）；
- `M app/renderer/package.json` / `M package.json` / `M pnpm-lock.yaml`：gen-renderer 写的依赖和 pnpm overrides；
- `D app/renderer/src/*`（200+ 个）：**是失败运行覆盖的残留，已 `git checkout --` 恢复成已提交状态**，重新跑 gen-renderer 会再生成；
- `?? .opencode-v2/`：不是我的产物，别动。
- `.probe/decompile/`（gitignored）：classified.json、pkg-cache/（2000+ 个解开的包）、npm-versions.*.json（版本检测结果，今天加了 tmp/deps-{a,b,c}.json）。

## 规矩（别踩）

- 汇报、提问一律用中文（用户定的）。
- 代码注释只写"为什么"，不写"照官方/官方如何"（用户定的，见记忆 no-official-attribution-in-code）。
- `gen-renderer.mjs` 会整目录覆盖 `app/renderer/src`，跑之前确认工作区干净。
- 别打印用户的平台 key；`~/Library/Application Support/ovaijisuandesign/config.json` 不能进仓库。
- 仓库保持私有。
- 每次推送后等 CI（含 Windows）绿了再汇报。
