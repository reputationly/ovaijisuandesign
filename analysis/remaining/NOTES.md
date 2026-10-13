# WIP 笔记（防上下文丢失）
- 工具：analysis/remaining/tools/xcanon.mjs（跨模块 F/FN 形状，自由引用占位 $F<i>+key）、xmatch.mjs（种子配对传播）、t1-s2.mjs
- npm 包下载到 ~/ana/pkgs/<pkg>@<v>/package（streamdown、remend 全版本）；工作分支只读 worktree ~/wt-desource（已 pnpm 9.3.0 install）
- 任务1结果（模板字符串按 cooked 比较后）：remend@1.3.0 88 exact / 0 diff / 0 conflict；1.3.1 80 exact 8 diff（tn$1/ln$1/c2/Gn$1/findSingleAsteriskDelimiter/countValidAsteriskDelimiters/h/isValidEmphasisDelimiter/isUnderscoreExcludedFromEmphasis 等实质差异）；
  原先 ln$1 的 1 处差异 = `\u200B` 转义 vs 字面零宽空格（同一字符串）。
- be: streamdown@2.5.0 chunk 11 exact（be,Jn,Xn,qn,Wn,$n,Fn,Zn,_n,zn,St），visitParents/SKIP 是 unist-util-visit-parents 外部（src 内联在 vendor.js）；2.4.0/2.6.0/2.7.0 有 diff
- s2.js 全部顶层声明 = remend 闭包(30) + be 闭包(11)，两边并集覆盖全部
- remend 闭包散在 s2.js、workspace/build-inspiration-media-showcase-collections.js、workspace/q.js、vendor.js
- renderer package.json 已有 remend 1.3.1 直接依赖，但 src 里没有 `from "remend"`；streamdown@2.5.0 依赖 remend 精确 1.3.0
- main.jsx:544 side-effect import s2.js；s2.js 被 chat/streamdown.jsx:51 导入 $e$1/be
- 任务2：t2-streamdown.mjs -> analysis/remaining/streamdown/；2.5.0 最优：总 exact165 diff14 conf0；streamdown.jsx exact60 diff7；2.4.0 exact153 diff23；2.6.0 exact124 diff50
  diff 列表：Streamdown(Qs) defaultBlockRenderer(Tn) unicodeLetterPattern(is) MarkdownCodeBlock(ss) ExternalLinkConfirmation(so) te.jsx#Te pe.jsx#Pe co.jsx#co ae.jsx#Ae MermaidRenderer(os) st.jsx#st FileDownloadButton(it) nn.jsx#po st.jsx#LazyHighlightedCodeBlockBody(cr)
  npm 未配对只剩 chunk#Wr(864B)；src 内联 npm 外部包：rehypeSanitize(settings/request-prompt-prefill.jsx) twMerge(infra/dialog-content.jsx) rehypeRaw(build-inspiration...) + vendor.js 里 marked/clsx/unified 等
- 任务4：find 命中 16 图 + decode-worker + error-card-fixtures + pdf.worker.min-yatZIOMy.mjs（与 pdfjs-dist@4.10.38 build/pdf.worker.min.mjs 字节一致，第三方！handoff 文档 280 行已计划换 ?url）+ chat/mermaid-ghxkkrxx.js(小写，regex 也命中)
  find 漏掉（哈希含 _ 或 -）：empty-light-BIA_9y_3.svg sticker-approved-Cvm_nH-W.png sticker-thumbs-up-DL9-hU6T.png
  引用全部是 new URL("../x", import.meta.url) 或静态 import，见 git grep
- 修了 xcanon：JSX 成员标签对象一律标识符；desugar 后 scope.crawl；!0/!1→布尔；react default 成员→具名。重跑：remend1.3.0 88 exact；sd2.5.0 总 exact176 diff3 conf0（diff=unicodeLetterPattern RegExp 构造降级、MermaidRenderer 动态 import 被内联成 Promise.resolve、LazyHighlightedCodeBlockBody 路径改名+IIFE，均构建等价）；2.4.0 diff17；2.6.0 diff49
- t3-index.mjs src 已跑：scan/src-index.jsonl 8241 条，32s
- s2.js 唯一非声明语句 = 第 484 行 `be();`，npm chunk-BO2N2NFS 里 be 定义后同样有顶层 `be()`（同一副作用：Jn 计数器 +1）
- displayName：npm 27 条全部在 src 中同名同值；src 多出的 8 条是 vendor.js 的 xyflow
- remend 闭包 88 声明（s2.js、vendor.js、infra/from-vendor.js、build-inspiration、q.js），闭包外只有 Streamdown 用 $e$1 -> s2/remend-closure-users.json
- t3：npm-index 908 包目录 27491 文件 81966 声明；t3-match：命中 1276，接受 881，拒 395（短/通用无上下文）
  包汇总：pdfjs-dist(pdf.worker 文件) pdf-parse(同文件, 次要) streamdown 59 remend 54 + 少量 infra/from-vendor.js(@codemirror/view, mediabunny, i18next, tanstack router) hono xyflow react-day-picker effect —— 需逐条人工复核
- 哈希名 git grep 引用：new URL 或 import；workspace/scene-categories.js 引用 featured-skill-C1bqOHc_.png（待确认）
- streamdown 闭包 179 声明 15 文件；闭包外使用：generation/markdown-link.jsx（Streamdown、st、Ae、ot、rt、wt.js#tt），mermaid-ghxkkrxx.js 用 nn.jsx#po；其余为 displayName 语句 -> streamdown/streamdown-closure-users.json
- t3 人工复核：真命中 infra/from-vendor.js 6 条（Bitstream2=mediabunny@1.44.2 Bitstream；WidgetType2=@codemirror/view@6.43.6；getCssSelector=@tanstack/router-core@1.168.9；CatchBoundaryImpl/isCtrlEvent=@tanstack/react-router@1.168.10（package.json 是 1.170.32/1.171.13，不一致！）；EventEmitter3=i18next@25.10.10，被 vendor.js i18next 类继承）；team/calendar.jsx#getDefaultClassNames=react-day-picker@9.14.0（文件已 import DayPicker）
  假阳性：hono/effect/xyflow coarse（通用 Error 子类、hook 模式）；拒绝的 395 条无 >=300B，聚簇都是通用短函数
- golden：仓库内无 golden 文件；handoff 说 golden 在 .probe/ui-golden（未入库）
- hash-files.json 已写（24 条：20 图含 find 漏掉的 empty-light/featured-skill/sticker-approved/sticker-thumbs-up，+decode-worker、error-card-fixtures、pdf.worker.min、chat/mermaid-module.js），无重名
- rehype-raw@7.0.0 rehypeRaw、rehype-sanitize@6.0.0 rehypeSanitize 形状哈希精确一致但因短被拒，靠 streamdown 闭包上下文确认
- ui-compare 网络快照记录 GET 的 pathname+search（compare.mjs:140-160），构建产物文件名会进 golden（推断）
- rename-files 需要 git 跟踪：在 ~/ana/rncheck（git init 副本）上跑
