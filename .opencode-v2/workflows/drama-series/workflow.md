---
project_type: drama-series
stages: [script, production-plan, asset-anchors, storyboard, scene-keyframes, visual-gen, post]
---

# 短剧流程

> **何时进入**：用户要做短剧、微短剧、系列剧集，或要写剧本、企划案、"第一集"；也包括任何需要同一批角色和场景在多个镜头之间保持一致的剧情类视频。信号可以来自用户原话，也可以来自上传的剧本内容。

## Principle

整条线按这个顺序推进：剧本（没有才写）→ 制作计划 → 角色 / 道具 / 场景锚点 → 分镜 → 宫格关键帧（可跳过）→ 视频片段 → 后期拼接。每一层只做自己的事：制作计划管锁项和资产清单，不重抄剧本；分镜管镜头拆分和逐字台词；情节 beat 的拆解是 planner 自己的草稿，不上画布。

用户给的剧本（上传文件或画布节点）写进 Stage Execution Plan 顶层 `sources`，它是事实源，不是一个 Stage。Media-agent 拿到 router 的路由结果后交给 planner；planner 只处理 `source_documents[]` 中已经确认的集数。来源是多集时，先确认 `target_episode_scope` 再动手，没有明确要求时建议先做第 1 集。

平台约束贯穿全流程：视频由 `hub_generate_video`（`MiniMax` / `MiniMax-H3`）逐段生成，**每段最长 10 秒**（`duration` 只取 5 或 10），带参考图时一次最多 4 张；图片由 `hub_generate_image`（`banana`）生成；没有语音识别、没有时间线插件，后期只靠 `hub_merge_videos`、`hub_ffmpeg`、`hub_subtitle_format`。

## Rules

### 来源接收

- 先把用户给的东西归类：成稿剧本、故事梗概、分镜笔记、画风样图、手头的人物图或场景图、指定集数。只记下还缺什么，以及用户接受了哪些物料建议。
- 成稿剧本只做提取：目标集的场次、人物、地点、要紧的道具、人物状态的变化、台词、冲突与反转、hook / payoff，以及能推算时长的内容。对白一个字都不改；用户没要求就不加戏；多集剧本只取已确认范围。
- 用户已有的图要按"下游能不能靠它保持一致"来检查：人物图能否锁住脸、身材和服装，场景图能否支撑多个机位，时代地域是否和剧本冲突。不采纳的建议记成"按原样使用"。结论写进制作计划里的"物料质检"一节。
- 制作模式（A 真人 / B 漫剧动画）、时代地域、媒介风格、画幅、语言、BGM 策略只锁一次，之后各阶段照用。时长默认等分镜时一句句算出来；用户自己提的目标秒数只在分镜确认时拿来对比，不参与默认拆分。用户在分镜确认时选了更短的目标，先出一版缩短的剧本，然后以它为准重来。字幕策略和视频分辨率到视频生成前再问。每条生成 prompt 只带和当前产物有关的风格、时代、光线。音频怎么走由制作模式决定，见 `production-plan.md`。
- **资产前的基础信息确认**：剧本定稿后、生成任何资产前，按 `production-plan.md` 的问询确认画幅等锁项；时长不在这里问。

## Stages

| 环节 | 产物 | 开工前核对 | 完成后核对 |
|---|---|---|---|
| Script | 只在手里没有能用的剧本时：先在对话里定下创作大纲，再写一份画布剧本文档。用户给了成稿就跳过。 | 按 `script-craft.md` 完成大纲确认；没确认不写剧本。 | 剧本是否贴合大纲，分集、场次、对白、动作是否完整。 |
| Production Plan | 画布文档「制作计划 — <scope>」：基础锁项（含时代地域）、物料核查结论、画面风格锚、要生成的资产表，按 `production-plan.md`。 | 无；planner 直接写。 | 锁项、核查结论、风格锚、资产表。 |
| Asset Anchors | 同一 Stage 内先角色、再道具、再场景，按 `assets.md` 与 `assets-blocking.md`；道具主卡要早于用到它的角色状态图。 | 无。 | 全部出完后统一看一遍：人物身份及各状态、Prop Lock、场景空间、引用是否齐全。 |
| Storyboard | 需要时先写「站位记忆 — <scope>」，再写「分镜列表 — <scope>」，按 `storyboard.md`。 | 无；planner 直接写。 | 站位、分组、每组时长（≤10 秒）、逐字台词、节奏。 |
| Scene Keyframes | 按 `scene-keyframes.md` 和选定的 `storyboard_style` / `keyframe_scope` 出宫格；选了 `skip` 则整段省略。 | 无。 | 每格构图与景别、人物走位先后、组间衔接。 |
| Visual Gen | 确认过的镜头组，一组出一段视频，按 `h3-video-prompt.md` 与 `video-prompt.md`。 | 用户过目并可改动每段的最终 prompt 和按序排列的参考图。 | 人物是否认得出、台词是否齐、站位与声音对不对、画面有无杂字。 |
| Post | 依据制作计划里的音频与 BGM 锁、视频阶段定下的字幕锁，把片段接起来并收尾；`off` 不加 BGM，`provided` 只放用户给的音乐，`generate` 时才去生成。 | 无。 | 节奏与转场、台词有没有缺、字幕是否照锁执行、BGM 是否照锁。 |

用户要改东西时，恢复对应 planner `task_id`，连同 Stage contract 与牵涉到的文档节点一并修订。站位记忆若有变动，就在同一次 patch 内重算那些分镜行的空间一栏。

资产锚点、分镜两处都只请用户确认一回；有意见就填在那一回的自定义答复里，不另起一个征求意见的问题。用户确实要改、并且修完或重生成之后，才为新结果再确认一次。

站位与分镜这两份一起过审之后，按 `scene-keyframes.md` 的问询先定宫格范围再定样式；范围选 `skip` 就跳过宫格 Stage。站位记忆是后续所有空间描述的依据，它没有自己的确认门，但必须出现在分镜的那次联合确认里。

## 计划编写约定

- 一次只 author 当前 Stage。第一次写计划头、完整 `stage_outline`（每项有 `id`、`order`、简短 `name`）和第一个需要的 Stage；当前 Stage 通过产出后检查，接着用原来那个 planner `task_id`，靠 `hub_plan_patch_stage` 往后补一个 Stage，已经做完的不动。
- 中文会话里 `stage_outline`、`stages`、`pending_stages` 的可见名称固定为：Script=`剧本`、Production Plan=`制作计划`、Asset Anchors=`资产锚点`、Storyboard=`分镜`、Scene Keyframes=`宫格关键帧`、Visual Gen=`视频生成`、Post=`后期`，不向用户露出英文阶段 id。

| 次序 | Stage id | 画布上新增的文档 | 本 Stage 能读的材料 |
|---|---|---|---|
| 0（没有剧本才有） | script | 剧本文档 | `<workflowsDir>/drama-series/reference/script-craft.md` |
| 1 | production-plan | 制作计划文档 | 这份 workflow、`<workflowsDir>/_shared/stage-execution-plan.md`、来源剧本、`<workflowsDir>/drama-series/reference/production-plan.md` |
| 2 | asset-anchors | —（只出图） | `<workflowsDir>/drama-series/reference/assets.md`、`<workflowsDir>/drama-series/reference/assets-blocking.md` |
| 3 | storyboard | 站位文档（按需）与镜头表 | `<workflowsDir>/drama-series/reference/storyboard.md`、`<workflowsDir>/drama-series/reference/assets-blocking.md`（站位记忆部分） |
| 4（`storyboard_style` 不是 `skip`） | scene-keyframes | —（只出宫格图） | `<workflowsDir>/drama-series/reference/scene-keyframes.md`、站位节点（若存在）、镜头表节点 |
| 5 | visual-gen | —（只出视频） | `<workflowsDir>/drama-series/reference/production-plan.md` 中"视频生成前的问询"、`<workflowsDir>/drama-series/reference/h3-video-prompt.md`、`<workflowsDir>/drama-series/reference/video-prompt.md`、站位节点（若存在）、镜头表节点 |
| 6 | post | —（只出成片） | `<workflowsDir>/drama-series/reference/post.md`、`<workflowsDir>/_shared/video-merge.md`、视频阶段的 `execution_locks.subtitle_policy`；要字幕或烧字时再读 `<workflowsDir>/_shared/subtitle-pipeline.md` |

- 只读当前 Stage 列出的文件，不提前读、不提前 author 后面的 Stage。
- 文档类 work item 填真实的 `document_node_id`；生成类 work item 填最终 `prompt`、有序 `refs`、稳定 `id` 以及对应参考文件规定的执行字段；创作内容一律由 planner 写好，executor 只负责派发。
- 分镜阶段先写站位记忆（需要时），再用完整的时长账本写分镜列表；时长必须在提交确认前算完。站位记忆和分镜、预计时长放在同一次确认里。用户调站位，同一次 patch 改掉牵连的文档再重新核算；用户在确认卡上选更短时长，先出短版剧本，再以它为新事实源重新拆分，不按目标秒数去倒推或平摊现有镜头。
- 宫格和视频阶段都恢复同一个 planner `task_id`，按 `clip_group_id` 去读分镜真实节点和对应的空间快照，不拿会话摘要顶替。视频阶段把实际读到的分镜节点、站位记忆节点（若有）和分镜行号写进每个 work item 的 `source`。
- 视频阶段每个 work item 必须带 `storyboard_document_node_id`；有站位记忆时再带 `blocking_memory_document_node_id`，并写正整数 `shot_count`。缺指针或缺来源时照 `h3-video-prompt.md` 的骨架补；补不上就返回 `stage_blocked`，`execution_excerpt`、阶段 goal、前一条 prompt、模型自带的默认构图都不能拿来填空。
- 锚点 Stage 里依次 author 人物组、道具组、场景组；同脸变体和道具派生按 `assets-blocking.md` 的"先基准后派生"写成串行依赖，整组出齐以后才请用户审一次。
- 无论用户改的是文档、prompt、refs 还是锁项，都回到原 planner `task_id` 修订当前 Stage 与牵涉文档，重跑时只动被影响到的那些稳定 work item id。

## Anti-patterns

- 把上传的剧本当成一个 Stage，或在制作计划里整段重抄剧本。
- 改台词、加戏，或处理用户没确认的集数。
- 模式、画幅、音频、BGM 还没锁就开始 author 生成类 Stage。
- 调了站位却只改了阶段说明，镜头表里的空间栏还是旧的。
- 把一个镜头组规划成超过 10 秒的片段，指望生成时自动截断或拆分。
- 当前 Stage 还没结束就去读、写或跑后面的环节。
