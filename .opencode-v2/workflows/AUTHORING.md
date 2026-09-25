# Workflow 写作规范

在 `workflows/` 下新建或改动任何 Markdown，都按下面的约定来。

## 1. 分层

- `workflow.md`：进入信号、Stage 顺序、各 Stage 产出和用户检查、本 Stage 该读哪些 reference，以及这一类项目独有的执行规则。
- `reference/*.md`：某一个 Stage 或某一类产物的具体写法——字段、模板、校验方式、出错怎么办。
- `_shared/*.md`：好几个项目型 workflow 都要用的执行约定；frontmatter 用 `utility` 标名字、用 `applies_to` 标适用的 workflow。
- `knowledge/vendors/*.md` 只讲某个供应商能做什么、怎么调用；`knowledge/failures/*.md` 只讲跨 workflow 的语义风险怎么识别。
- 每条规则只放在能覆盖它的最窄那一层，而且只放一处。上层写文件路径，不把下层内容再讲一遍。
- 怎么写好提示词、模型内部如何工作、运行时的状态流转、界面怎么交互，这些都不属于 workflow。

## 2. `workflow.md` 的形状

- frontmatter 只有 `project_type` 与 `stages` 两个键。拓扑固定的 workflow，`stages` 就是执行顺序；按 variant 决定顺序的 workflow，`stages` 只是可选 Stage 的全集，正文要说明本次的 `stage_outline` 顺序完全由所选 variant 自带的资产决定。variant id 只在它所属的 workflow 里有意义。
- 正文顺序固定为：`# 标题`、`> 进入信号`、`## Principle`、`## Stages`、若干规则章节、`## Anti-patterns`。
- `Principle` 写这个 workflow 要达成什么、管到哪里为止、哪些领域约束绝不能破。
- `Stages` 用一张表：阶段、产出、执行前检查、产出后检查。不另加确认门、终止状态或状态流转之类的列。
- 规则章节写 planner 在编写当前 Stage 时要做的事，以及该去读哪份 reference。
- `Anti-patterns` 只收能被识别、能被拦下来的具体错误做法。
- 人物、场景、分镜、宫格、声音、视频、后期这些细则，主文件里各给一次路径就够，正文放到对应 reference。
- 行数上限见 `.opencode-v2/README.md`，超出就拆到 reference。

## 3. Stage

- 一个 Stage 对应一个说得出名字的目标；它的产出要么是可以审阅的文档，要么是可以执行的媒体，要么是下游能直接读取的确定选择。
- 固定拓扑的完整顺序写在 frontmatter `stages`；按 variant 走的，顺序从所选 variant 的资产里得出。planner 一次只写当前这一个 Stage，后面的 Stage 不预读、不预建、不预跑。
- 当前 Stage 还没完成，后面的 Stage 一律不建：不建条目，不派 work item，不占逻辑输出 id，也不留空文档。
- 文档类 Stage 由 planner 自己写出来；图片、视频、音频与后期产物由 executor 逐个 work item 去做。
- 每个媒体 work item，planner 都要给出成品 `prompt`、稳定的 `id`、给用户看的 `name`，以及有序的 `refs`。executor 只执行，不补写也不改写创作内容。
- workflow 里不提计划处于什么状态、为什么在等、怎么流转、谁批准了，也不规定先调哪个工具后调哪个。
- 用户改了当前产物，就让 planner 同时修订当前 Stage 的 contract 和受影响的文档，不能只改一句阶段描述。
- 只有当用户要在“已经生成出来的候选”之间做选择、并且下游要拿选中结果继续做时，才单独设一个选择 Stage。
- 生成候选的 Stage 只负责出候选、登记候选；除此之外没有要用户看的，就把检查写成“无”。
- 选择 Stage 用 `question` 收集用户的选择，把结果落成明确的选定项或资产绑定；只提问、不给下游留东西的空壳 Stage 不要建。
- 选择 Stage 若只改 planner 自己维护的文档或绑定，就不给 executor 派 work item。

## 4. Question

- 当前 Stage 的 reference 里写一节 `## Questions`，每条都写成“触发条件：要让用户选什么”。
- 各 Stage 的问题清单不在主 workflow 里重抄，主文件给出当前 Stage 的 reference 路径即可。
- 调 `question` 的前提有两个：触发条件成立；用户说过的话、来源文件、现有文档、已锁定的值里都找不到答案。
- 同一 Stage 命中多条问题，合成一次 `question`；一条都没命中就不问。
- 选项要互斥、选了就能执行。agent 自己能推断、查到或验证的事实，不拿来问用户。
- 只在编写当前 Stage 缺输入时发问，后续 Stage 的问题留到那时再问。
- 必须先有候选才能挑的，放到候选生成之后的选择 Stage 里问。
- `question` 的作用仅限于拿到信息或选项，它不等于用户批准了这个 Stage，生产看板上也不会因此记一次审批。
- 放行只看用户这次就本 Stage 明说的同意；上一个 Stage 的回答、以前 `question` 的结果都不能拿来顶替。

## 5. Stage 检查

- Stage 表里，开工前要看的和做完后要看的分成两列。
- 开工前那一列只放 executor 动手前必须由用户点头的内容，例如做多少、用哪些输入、定稿的 prompt、参考素材、锁定项、上游依赖。
- 做完后那一列只放用户需要亲眼核对的成品质量点，文档或媒体都算。
- 某一侧确实没有要检查的，就写“无”，不要为了填满而编。
- 两列都是“无”的 Stage，框架不会停，也别额外安排一次确认提问或一个专门确认的 Stage。
- planner 自己直接写好的文档类 Stage，开工前那一列留空。
- 适用的检查写进 Stage contract 的 `review.before_execution` 与 `review.after_execution`；“无”就是省略该字段或给 `[]`。
- “请确认计划”“确认后继续下一步”“通过才往下走”这种话属于框架，不写进检查项。
- 确认 gate 由框架依据这两个 review 字段统一处理，各个 workflow 不要自己再实现一遍。
- 用 `question` 做的选择和生产看板上的审阅是两回事；不要把挑候选塞进笼统的“产出验收”里。
- 候选出来后需要用户挑的，用选择 Stage 承接；生成候选的那个 Stage 不因此加 `after_execution`。

## 6. Reference 的写法

- 只写 agent 要做的动作。
- 用祈使句：读什么、判断什么、产出什么、怎么校验、出错怎么处理，直接写。
- 一条规则只讲一个动作；字段、路径、模板与工具的名字照原样写。
- 不写演变过程、迁移步骤、旧版行为、设计缘由、模型原理，也不解释“为什么要这样”。
- 开头不要铺垫“本文介绍……”“这一步连接了……”“为了防止……”“因为模型容易……”，直接给约束。
- 示例只用来展示对的写法、错的写法或边界情况，示例后面不再追加论证。
- agent 不需要兼容的旧字段、弃用字段、旧流程，一律不写。
- 触发条件、动作、输出格式、校验规则写在一起，不要分散到不同章节里重复出现。

## 7. 改完自查

- Stage 顺序、Stage 表、reference 指向、frontmatter 四者一致。
- 每个 Stage 都有真实产出，并且没有混进后面 Stage 的内容。
- 每个问题都有明确的触发条件，并且答案确实无法从已有信息里直接拿到。
- 每项 review 都要求用户核对具体内容；空泛的“请确认”删掉。
- 主 workflow 和 reference 没有重复同一条规则。
- 全文不出现计划状态、框架 gate、演变过程、背景解释，也没有要求 executor 改写 prompt。
- 用 `wc -l` 对照 `.opencode-v2/README.md` 的行数上限；文中出现的工具名只能是本配置实际提供的 `hub_*` 工具。
