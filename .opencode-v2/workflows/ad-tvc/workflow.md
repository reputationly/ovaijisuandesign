---
project_type: ad-tvc
stages: [intake-brief, visual-research, anchors, storyboard, visual-gen, audio, post]
---

# Ad TVC — 视觉广告工作流

> **什么时候进来**：成片目标长于 15 秒，并且至少存在一种复杂依赖：成段叙事、参考调研、要反复出现的产品或人物、多条视频拼接、终剪合成。
>
> **适用类型**：品牌片、产品片、剧情片共用一条主干；差异交给 Direction 卡、Category 卡和素材保持方式。
>
> **流程顺序**：需求简报 → 视觉调研 → 锚点 → 分镜 → 视频生成 → （可选）音乐 → 后期。只要一条短片就能交付的广告，回到 direct 路径或 brand-ad 轻量做法。

## Principle

先回答三件事：这支广告要传达什么、看的人是谁、产品以什么方式出场。之后再分别收集产品真实外观依据和风格依据。锚点阶段只补下游一致性真正缺的那一块（产品、人物、场景或创意路线），然后按单元生成视频并合成。用户手上已有的素材优先直接用，不为走完流程而重复写文档、重复出图。

提问只针对会改变创意方向、花费或交付物的问题。视觉调研阶段请用户在画布上挑参考时，用普通聊天等待回复，不用 `question`；锚点阶段只有本轮确实出了锚点图才请用户过目；视频生成只在花钱之前确认一次；后期只在成片导出后审一次。

只要保留分镜或视频生成，就要先拿到稳定的产品身份、确定的创意路线、Style Master，以及适用时的人物 / 场景依据。视觉调研里已经核实、路径可解析的素材可以直接充当锚点；只有纯文字约束或现有素材撑不住一致性时才去生成锚点卡。

除非用户给了必须原样使用的成品 Prompt，否则凡是保留分镜 / 视频生成的项目都要编译一份 `tvc_typography_package`：从品牌与产品事实、Style Master、品类气质推出主标题字体、辅助字体、说明字体、符号、字号层级、颜色、承载面、画面位置和出现 / 退场节奏，并随每个视频单元下发。只有文字本身成为画面主角时才另外启用 T06；后期阶段不再往画面上加东西。

## 路由判断

- 两个条件必须同时成立：存在至少一种复杂依赖，且目标时长超过 15 秒。
- 所谓复杂依赖：要讲一段完整故事、要做参考调研、要有反复出现的锚点、要拼多段视频、要做最终合成。
- 只满足其一时，走 direct 或 brand-ad 轻量做法。
- 用户没说成片时长，router 先问清楚再决定路径。

## 全链路

信息充分的简报 → 视觉调研：整理用户提供的产品 / 风格素材与画布节点，缺口处请用户补图，用户在画布上选定后做一次集中分析 → 锚点：从零创作时给出三条路线供选，并只为缺口出卡 → 分镜与生成规划文档 → 视频生成（画面连同原生旁白、对白、环境声一起出）→ 可选一条背景音乐 → 后期合成。已有脚本、分镜、成品 Prompt 或验证过的素材够用时直接复用，只补下游还缺的锚点。旁白不单独用语音合成另做。

平台能力边界：出图用 `hub_generate_image`（`vendor=banana`，不传 `model_id`），视频用 `hub_generate_video`（`vendor=MiniMax`、`model_id=MiniMax-H3`，每条 5 或 10 秒），音乐用 `hub_generate_audio_music`（`model_id=music-3.0`）。没有联网搜图、网页素材下载、语音转写、抠图和时间线插件；需要这些输入时请用户上传。细节见 `<knowledgeDir>/vendors/platform-routing.md`。

## Rules

以下要求对所有 Stage 生效。

- 本文件只定骨架，各 Stage 的细则以对应 reference 为准。
- 方向、素材、产品信息、片长、声音做法以及执行锁一经确认只向后传递，下游不得重新发散。
- 文档归 Planner 物化，媒体归 Executor 执行；Planner 已物化、若该 Stage 不含媒体任务，就不要切到 `doing`。
- 需求简报阶段提问之前必须先读 `reference/intake-and-brief.md`；能在同一轮回答的问题一次性发成多张独立选择卡，要看前一题结果才能问的，留到下一轮。

### 用户审核唯一真相

Stage 的 `review.*` 只允许出现在下面标注的三个位置。其余 `question` 属于业务选择，Executor 内部 QC 属于完成条件，二者都不会把 Stage 置为 `waiting_user(result_review)`。

| 环节 | `review.before_execution` | `review.after_execution` |
|---|---|---|
| Intake | — | —（`brief_doc` 落地且合同齐备即 `done`） |
| Visual Research | — | —（参考在画布上挑，用户发消息告知即可） |
| Anchors | — | 本 Stage 确实新出了锚点图，就对这批图请用户看一次；只复用或只写文档则不设 |
| Storyboard | — | —（`generation_strategy_doc` 落地且合同齐备即 `done`） |
| Visual Gen | 开跑前请用户确认一次：最终 Prompt、费用估算、执行锁与上一版的差异 | —（出片后自己做 QC） |
| Audio | — | —（背景音乐自己做 QC） |
| Post | — | 成片导出后请用户看一次 |

## Stages

下表只负责告诉你去哪读；依赖、author 与否、执行锁、work item、QC、返修全部按各自 reference 执行。

| Stage | 交付物 | 先读 | 何时结束 |
|---|---|---|---|
| `intake-brief` | `brief_doc`、`tvc_intake_brief` | `reference/intake-and-brief.md` | 简报落地即结束，用户不审 |
| `visual-research` | 核实过的产品与风格 refs、Style Master、`tvc_visual_research` | `reference/creative-research.md` | 调研字段齐全即结束，用户不审 |
| `anchors` | 视缺口而定的产品卡 / 路线 KV / 人物卡 / 环境卡、`tvc_anchor_set` | `reference/creative-brainstorm.md` | 自检过关；本轮新出图才请用户看 |
| `storyboard` | `generation_strategy_doc`、`tvc_storyboard_plan` | `reference/video-generation-strategy.md` | 规划文档落地即结束，用户不审 |
| `visual-gen` | 每个视频单元一条定稿 Prompt 与对应成片、`tvc_video_set` | `reference/video-generation-execution.md` | 开跑前确认一次，出片自检后结束 |
| `audio` | 可选 `bgm_final`、`tvc_bgm` | `reference/audio-strategy.md` | 是否存在由 reference 判定，用户不审 |
| `post` | `tvc_final`、`tvc_final_delivery` | `reference/post-production.md` | 导出自检后请用户审成片 |

## 阶段计划契约

- 一次只写一个 Stage。第一次落计划时写计划头、完整的 `stage_outline`（每项带 `id`、`order` 和简短 `name`）和 `intake-brief`；某 Stage 收尾后，用同一个 planner `task_id` 调 `hub_plan_patch_stage` 把下一个需要的 Stage 接上去，已经结束的 Stage 保持原样。
- 中文对话中，`stage_outline`、`stages`、`pending_stages` 对用户展示的名字依次是：需求简报、视觉调研、锚点、分镜、视频生成、音乐、后期；内部英文 id 不出现在界面文字里。

| # | Stage | 会写出的文档 | 这一步能读的文件 |
|---|---|---|---|
| 一 | intake-brief | 需求简报 | 本文件；`<workflowsDir>/_shared/stage-execution-plan.md`；`<workflowsDir>/ad-tvc/reference/intake-and-brief.md` |
| 二 | visual-research | — | `<workflowsDir>/ad-tvc/reference/creative-research.md`、`product-research.md`、`visual-style-spec.md`；另加所命中 Category 根卡与 Direction 卡里的 `creative-research` 部分 |
| 三 | anchors | — | `<workflowsDir>/ad-tvc/reference/creative-brainstorm.md`、`product-spec.md`、`visual-techniques-library.md` 目录、`visual-techniques/T06-typography-composition.md` 里“基础字体包”那一段；Category 与 Direction 卡里的 `anchors` 部分。确实要出卡时再加读 `prompt-templates.md`、`<workflowsDir>/_shared/asset-pipeline.md` 和它们点名的锚点文件 |
| 四 | storyboard | 分镜与视频生成规划 | `<workflowsDir>/ad-tvc/reference/video-generation-strategy.md`、T06 的“基础字体包”那一段、Category 与 Direction 卡里的 `storyboard` 部分、`technique_plan` 所选技法卡中的 `## Generation Strategy`。选中技法的要求要落进分镜脚本以及对应的 `tvc_storyboard_plan_unit` |
| 五 | visual-gen | — | `<workflowsDir>/ad-tvc/reference/video-generation-execution.md` |
| 六（仅当 `independent_bgm=on` 且 `bgm_source_id=generate`） | audio | — | `<workflowsDir>/ad-tvc/reference/audio-strategy.md`；`<workflowsDir>/_shared/audio-pipeline.md` |
| 七 | post | — | `<workflowsDir>/ad-tvc/reference/post-production.md`；`<workflowsDir>/_shared/video-merge.md` |

- 超出上表的文件一律不读，也别提前替后面的 Stage 写计划或干活。Category、Direction 各自只读命中的那一张，并且只用和当前 Stage 对应的部分；体量大的可选卡要等根卡明确指过去才打开。
- 文档型 work item 填真实的 `document_node_id`。生成型 work item 填定稿 `prompt`、排好顺序的 `refs`、不会变的 `id`，以及 reference 规定的其它执行字段——Executor 只执行，不替你补创意。只有文档的 Stage 落地后直接结束。
- `depends_on`、capsule 的精简字段、要不要 author、执行锁、QC、返修方式都看该 Stage 自己的 reference。Audio 以外的 Stage 只接收直接上游交出的 capsule 和能解析的媒体路径；Audio 只接收同一 Planner task 里已冻结的 `tvc_audio_intent`。
- 用户想改文档、Prompt、refs 或某个锁定项时，回到相应 planner `task_id`，只改当前 Stage、它的文档和确实受影响的 work item；审核位置仍按上面那张表。

## Anti-patterns
- 下游回头去读调研过程、别的 Stage 长文档或没命中的品类卡；用固定的产品角度、镜头数、节奏或技法数量替代对用户方向与现有素材的判断。
- 后期去读 `<workflowsDir>/_shared/subtitle-pipeline.md` 补字幕；屏幕文字、品牌标识、行动号召与结尾定版都要在视频单元里直接生成，后期不再叠字、不烧录。
