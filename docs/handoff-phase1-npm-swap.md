# 界面源码还原 · 阶段 1 交接（npm 替换）

写给下一个接手的 agent。日期 2026-09-27，分支 `replicate-official-stack`，工作区有未提交改动（见下）。
背景（为什么做这件事）见 `docs/remaining-work.md` 四节开头的引言和记忆里的 plan B 说明；本文只讲阶段 1 的现状、调试方法、下一步。

## 目标

参照渲染层（`reference/3.0.16/app/out/renderer/assets/index-C4qF1HE0.js`，511k 行）已经拆成
`app/renderer/src/vendor.js`（第三方库，约 6842 条顶层语句）+ `app/renderer/src/main.jsx`（参照自己的代码，约 11888 条）。
阶段 1 要把 vendor 里的库**逐个换成 npm 包的 import**，最后 vendor 只剩少量拼装代码；
每换一批都要构建 + 和 `official-raw`（参照原样，不打补丁）逐屏像素对比，差异必须是 0.000%。

## 当前状态（截至停手时）

**进度：清单 144 个包，换成 npm import 的 32 个**（2026-09-29 验证：gen-renderer → vite build →
official-raw → compare.mjs，8 屏 0.000%、新增报错 0）。已换成的是：react / react-dom /
use-sync-external-store、@lezer/common、@lezer/highlight、tabbable、@dnd-kit/utilities、
@dnd-kit/accessibility、d3-array / d3-dispatch / d3-timer / d3-ease、micromark 系列 13 个、
orderedmap、rope-sequence、prosemirror-model / -transform / -state / -schema-list。

**像素对比的假差异已查清（2026-09-28）。** 一度出现 home 7.704% / skills 6.393%，看着像我们换包改坏了渲染。查了四层：
差异永远落在卡片封面那 432px 宽 × 240px 高的矩形里（差异带 `y1222-1464`、`y533-770`、`y1091-1328`，列段 `634-1065` / `2031-2461`），
非封面区域逐行完全一致；而这些封面是 **CDN 上的 mp4**（`cdn.hailuoai.com/...`，实测 18 个 `video` 元素里只有 4~8 个能解码出来）。
**决定性证据**：不挡 CDN 时，同一种模式连跑两次差 **7.342%**——比两种构建之间的差（2.451%）还大。
所以这是采集噪声，不是渲染回归。`compare.mjs` 现在采集时挡掉 `*cdn.hailuoai.com*`，改完连跑两次 8 屏全 0.000%。
（另外顺带修了两处会让结果不可信的东西：截图改成"连拍到相邻两帧一致"，`diff` 的硬编码阈值 24 收进 `TOL` 常量。）
**注意**：`official-raw` ↔ `official-raw` 这种自比会写同名文件、自己和自己比必然 0%，别拿它当"稳定"的证据。

**依赖闭包已补齐（2026-09-29）。** 上一轮失败的传递依赖都补进清单了，其中三条老结论要更新：

- `scheduler`：**不用补**。react-dom 换成 npm 后，它内联的 scheduler 实现（`unstable_scheduleCallback` 那段）
  随 react-dom 的 CJS 包装一起从产物里删掉了，vendor/main 里都搜不到；react-dom 从 npm 引入时自带 scheduler。
  清单里 react-dom 那行的 `deps: ["react","scheduler"]` 只是标注依赖关系。`npm-plan.mjs` 遇到清单里没这个包会跳过。
- `@tanstack/history`：**1.161.9 确实撤包了，但 1.162.1 存在**（`npm view` 能查到、tarball 能下）。
  `@tanstack/router-core@1.171.13` 要 1.162.0、`@tanstack/react-router@1.170.32` 要 1.162.1。已按 1.162.1 进清单。
- `rememo` / `@remix-run/router`：**vendor 里根本没有它们的代码**（`classified.json` 命中 0），不用进清单。

`npm-plan.mjs` 修了一个会让排序失效的 bug：原来只给**新增**条目算依赖表、把新条目整段追加在已有条目之后——
新加的包常常是老包的依赖（prosemirror-view 之于 prosemirror-state），这么排父包会排在依赖前面。
改成对全部条目做拓扑排序。`npm-versions.mjs` 也加了"候选版本 tarball 取不到就跳过"（一个撤包版本曾把整包检测带崩）。

**剩下 112 个没换成，按失败原因分四类**（`SWAP_STRICT=0` 全量跑一次 `gen-renderer` 即可复现，日志格式是每包一段）：

| 类 | 数量 | 含义 | 从哪下手 |
|---|---|---|---|
| 内部分块被拆到 main | 49 | 报 `X 不是包的导出（main 在用）`——包的内部分块被 `split.mjs` 分给了 main，swapEsm 只认 vendor 里的语句 | 最大的一类，见下 |
| 内部分块在别的 vendor 簇 | 28 | 报 `X 不是包的导出`（不带"main 在用"）——内部函数落在 vendor 里别的语句簇，没被收进来 | 同上 |
| 引用了没换的 vendor 语句 | 27 | 规则 3 失败：引用了还没换的包 | 等上游那批换掉后重跑，多半自解 |
| vendor 里没这段代码 | 8 | `decode-named-character-reference`、`inline-style-parser`、`seroval`、`seroval-plugins`、`style-to-js`、`style-to-object`、`zustand` 等 | 有的是死代码，有的是版本不对；逐个 grep vendor 确认 |

**注意 `main.jsx` 没有提交。** 这一轮 gen-renderer 生成的 `main.jsx` 与上一提交逐字节相同，只有 `vendor.js` 变了。

**性能没解决。** swapEsm 平均 2 分钟/包，144 个包约 5 小时。真跑一次全量要留足时间（本次跑了约 5 分钟就结束了——
因为失败的包在冲突判定阶段就退出，只有成功的包才会走完 evict 循环）。

## 下一步：先攻「内部分块被拆到 main」（49 个，最大的一类）

症状是 swapEsm 报 `X 不是包的导出（main 在用）`。含义：包的一个内部分块（比如 `resolveEnabled`、
`parseHref`）被 `split.mjs` 判给了 **main**，swapEsm 只在 vendor 的语句里找这个包，
main 里的那块它看不见，于是认为"这个包不完整"。

上一轮的两个例子印证了这个机制：
- `w3c-keyname`：`keyName` 函数在 main，引用了 vendor 里的 `mac$1` —— 同一个包被 split 拆成了两半；
- `@lezer/highlight`：`tags` 定义被识别成"不是导出"（已被移出清单）。

值得先查的：**split.mjs 把"只被 main 引用"的语句判给 main，但那条语句其实属于某个库**。
`classified.json` 里每条语句都有 `kind: lib|app` 和 `pkgs` 列表，先统计一下这 49 个包里
「在 main 里、但 classified 标成 lib 且 pkgs 是某个待换包」的语句有多少 —— 如果数量可观，
可能一条规则就能解锁一大片。

## 工具和用法（都在 scripts/decompile/，不在 pnpm 工作区，先 `npm install`）

```
# 归类（一般不用重跑，.probe/decompile/classified.json 已在）
bash scripts/decompile/run-all.sh

# 版本反推：对单个包，取截止日期前最近 20 个版本，数 bundle 里 lib 语句形状命中数
node scripts/decompile/npm-versions.mjs 2026-09-27 <包名>...
#   结果追加到 .probe/decompile/npm-versions.json；可用 OUT=xxx.json 指定输出文件（目录要先建）
#   ⚠ OUT 是相对 .probe/decompile 的路径，mkdir .probe/decompile/tmp && OUT=tmp/deps-x.json
#   取不到 tarball 的版本（撤包）会跳过并打印一行

# 按依赖拓扑排序生成替换清单（合并所有 npm-versions*.json；已有条目保留，但位置由拓扑决定）
node scripts/decompile/npm-plan.mjs > 新清单.json

# 生成 app/renderer/src（会整目录覆盖！先提交或备份手头的改动）
node scripts/decompile/gen-renderer.mjs
#   SWAP_STRICT=0 时换不动的包只打印 ✗ 不中断（调试用）
#   注意：会写 app/renderer/package.json 和根 package.json 的 pnpm.overrides
#   新增了依赖之后要跑一次 pnpm install，否则 vite build 会报 "Rollup failed to resolve import"

# 调试单个包为什么没认全（对报冲突的名字，比 vendor 形状和 dist 文本）
node scripts/decompile/dbg-swap.mjs <包名> <版本> [名字...]

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

调试单个包为什么没认全：`scripts/decompile/dbg-swap.mjs`（**已修好，可用**）。
对报冲突的名字（swapEsm 打印的原名，如 `cmpRange`、`mac$1`），把 vendor 里该语句的
norm 形状和包 dist（`moduleGraph` 走到的文件拼接文本）对一遍，打印：语句头 60 字、形状长度、
是否 `text.includes(s)`、dist 里同名定义的原文片段。不带名字时打印整包：dist 的顶层函数/类里，
哪些在 vendor 里形状对不上（用来发现"拆散了 / 版本不对"）。

例：`node scripts/decompile/dbg-swap.mjs @tanstack/history 1.162.1`
→ dist 8 个顶层函数，vendor 只对上 1 个，`createHistory`/`createBrowserHistory`/`parseHref` 全没对上
（它们的代码在 main 里，正是上面「内部分块被拆到 main」那一类）。

## swapEsm 的三条冲突规则（读代码：scripts/decompile/npm-swap.mjs）

1. 外面没认出的语句在初始化时给它的对象挂属性（`X.none = …`）→ 命中原文就收进来，否则冲突/踢出；
2. 对外暴露的名字必须是包的导出（`exportMap`，名字带 `$1` 后缀会试 baseCandidates 剥后缀匹配）；
3. 它引用的 vendor 语句只能是已换的包 / 打包器辅助函数 / CommonJS 互操作语句。

冲突落在长语句（strong）上 = 真问题报错；落在短语句上 = 多半是邻居的，踢出重算（evict 循环）。

## 建议的接手顺序

1. **攻「内部分块被拆到 main」**（49 个，最大一类）：先用 `classified.json` 统计那 49 个包
   有多少语句是「在 main 里、但 classified 标成 `lib` 且 `pkgs` 指向待换包」——一条 split 规则
   可能就能解锁一大片。参考 `@tanstack/history`（dist 8 个顶层函数，vendor 只对上 1 个）。
2. **`dbg-swap.mjs` 已可用**，不用再修。
3. **「引用了没换的 vendor 语句」的 27 个**多半会随上游换掉自解，攻完第 1 类重跑一次看剩多少。
4. **「vendor 里没这段代码」的 8 个**逐个 grep 确认是死代码还是版本不对
   （`decode-named-character-reference`、`inline-style-parser`、`seroval`、`seroval-plugins`、
   `style-to-js`、`style-to-object`、`zustand` 等）。
5. **每修一批就全流程验证**：`gen-renderer → pnpm install（新增依赖时）→ build → build.mjs --raw → compare.mjs`，
   8 屏 0.000% 才算过。注意 `compare.mjs` 起真 Electron（隐藏窗口），只能本机跑。
6. **性能**：evict 循环对大包要几百轮。但先 correctness 后 speed，别倒过来。
   **宁可少换不要错换**：换错一半比不换危害大（双实例、instanceof 错）。换不动的包留在 vendor 里不丢人。

## 工作区状态

已全部提交（HEAD `be28773`）。工作区只有两个未跟踪目录：
- `?? .claude/`（Claude Code 本地设置，gitignore 只挡了 settings.local.json 和 worktrees/）；
- `?? .opencode-v2/`：不是我的产物，别动。
- `.probe/`（gitignored）：`decompile/`（classified.json、pkg-cache/ 2000+ 个解开的包、npm-versions*.json）、
  `ui-compare/<时间戳>/`（每次逐屏对比的截图与 report.json）、`tmp/`（本次诊断写的一次性脚本）。

## 规矩（别踩）

- 汇报、提问一律用中文（用户定的）。
- 代码注释只写"为什么"，不写"照官方/官方如何"（用户定的，见记忆 no-official-attribution-in-code）。
- `gen-renderer.mjs` 会整目录覆盖 `app/renderer/src`，跑之前确认工作区干净。
- 别打印用户的平台 key；`~/Library/Application Support/ovaijisuandesign/config.json` 不能进仓库。
- 仓库保持私有。
- 每次推送后等 CI（含 Windows）绿了再汇报。
