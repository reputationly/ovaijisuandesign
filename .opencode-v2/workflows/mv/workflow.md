---
project_type: mv
stages: [intent, music-prep, production-plan, assets, shot-plan, visual-gen, post]
---

# MV — music-led video workflow

> **进入信号**：用户在本轮请求里亲口把要交付的东西叫作 `MV`、`音乐视频` 或 `music video`（含"做一支 MV / 完整 MV / 全曲 MV / make a music video / full music video"等说法）。没给时长时按本流程处理；给了超过 15 秒的时长、要求整首歌、多段分镜、多条连续视频、音乐分析、角色或场景锚点、终剪合成，也进入本流程。附件名、素材标题、分析结果或 Agent 自己的推测里出现"MV"字样不算进入依据。
>
> **边界**：用户明确限定在 15 秒以内的单条 MV（"15 秒 MV / 不超过 15 秒 / 15s music video"等）不进本流程，交回 media-agent 的直接路径，按一次视频生成（必要时加一首配乐）处理。用户没有说出 MV / 音乐视频 / music video 时，不因为出现音乐、歌词、卡点或表演就把任务归到这里。

## Principle

整首最终主音乐是全片唯一的时间基准。七个 Stage 只吃已经被确认的上游产物，已完成并被接受的 Stage 不再重做，也不根据聊天里的概括重新拼事实。用户看得到的一切——Stage 名、`question` 文案、画布文档、审阅说明、图片 / 音乐 / 视频 Prompt 里的描述——从第一版就用运行时 `working_language` 书写；歌词原文、人名、片名等用户给出的文字保留原语言。Gate、稳定 id、字段路径和派单骨架这类机器信息只放进各 Stage 的 `execution_excerpt`，下游经 Stage detail 读取，不出现在画布正文里。

内容先定 `direction_mode`：`narrative_story` 守住人物、事件、因果、地点用途和结局，风格只改变"怎么看见"；`visual_aesthetic` 用主体、情绪、母题、关键画面和视觉演进组织全片，不替用户编人物目标、关系、任务或结局。动态大字默认在视频生成里完成，只有必须逐字准确的歌词、标题或指定文案才登记到 Post 兜底。

本平台的视频片段只有 5 秒和 10 秒两种长度，所以镜头组时长只取 5 或 10 秒，最终主音乐时长必须是 5 的整数倍，由 Stage 2 在定稿时保证。

## Stages

| 用户显示 | stage_id | 稳定输出 | 执行前检查 | 产出后检查 |
|---|---|---|---|---|
| <以 `working_language` 表达"确定 MV 方向"> | intent | 显式输入登记与一次补充问询、内部 Intake capsule、可读的创意方向文档、音乐来源、媒介、风格、时长、画幅、角色与主唱关系、真实 refs 用途 | 无 | 看故事梗概或五项视觉概念，以及媒介、风格、时长、画幅和音乐来源 |
| <以 `working_language` 表达"确定音乐"> | music-prep | 时长为 5 秒整数倍的最终 `main_song` runtime ref、音乐 Gate、来源 / 形式 / 语言 / 曲风、主唱呈现 | Agent 生成带歌词的歌曲时，看歌词与曲风描述；上传音乐无 | 试听最终歌曲，确认整体与结尾可用 |
| <以 `working_language` 表达"制作计划"> | production-plan | 唯一的 `main_song_lyrics_timeline`、内部 Production capsule、可读的 `production_plan` | 无 | 同时看逐句时间轴和制作计划（内容、段落、空间、动作、风格、字体、执行说明） |
| <以 `working_language` 表达"角色与场景锚点"> | assets | `style_reference_capsule`、角色卡、按条件生成的场景卡、普通场景描述 | 有生成项时看生成清单、Prompt、用户指定的人物 refs 与图片参数 | 看人物身份、服装与风格投影，以及条件场景卡 |
| <以 `working_language` 表达"分镜规划"> | shot-plan | 一份（长片两份）导演分镜，逐组锁定 Shot、动作、空间、运镜、歌词口型、光影 / 材质 / VFX、字体层和可见终态 | 无 | 一次看完全部分镜：时间连续、镜头密度、逐镜导演事实、风格与字体过程、跨文档衔接 |
| <以 `working_language` 表达"视频生成"> | visual-gen | 每组一条音乐切片和一条视频 work item；按分镜低自由度编译出可直接派单的六段 Prompt | 模型固定为 `MiniMax-H3`，分辨率按已确认值（默认 768P）；在同一 Production Board 检查完整 Prompt、refs、时长、画幅和声音策略 | 看各组主体与场景、口型、节奏、字体包装和段间衔接 |
| <以 `working_language` 表达"后期合成"> | post | `mv_timeline` 与 `mv_final` | Stage 6 结果被确认后自动执行，不再问剪辑确认 | 直接看成片：音乐连贯、文字 / 音效、画幅、首尾、无黑屏 |

## Artifact Handoff

- `intent`：完整结构写进 `execution_excerpt`；方向文档只是同一创意的可读版本。Plan 另存合法标量、真实文档引用和审阅文案。Stage 2 处理已有音乐时只读 `execution_excerpt` 与真实音频 ref；Stage 3 需要展开创意时才读方向文档。
- `music-prep`：Stage 3 只分析最终 `main_song`。生成前写的歌词种子和音乐 Prompt 都不是最终歌词依据。
- `production-plan`：内部 Production capsule 是 Stage 4–7 的执行数据，画布制作计划是它的可读投影。下游默认只读 Stage detail；capsule 缺本 Stage 必需的 Treatment，或用户接受后又改了文档，才补读制作计划的相关段落。任何下游都无权重算总时长。
- `assets`：被替换的资产移出当前 refs，稳定资产 id 保持不变。
- `shot-plan`：一个镜头组对应一条视频 work item。内部 capsule 锁定稳定 id、refs、文档顺序、每组 Shot 数与时间、准确文字映射；画布分镜是逐镜内容和视觉过程的依据，已含风格、光影、材质、VFX、字体层与衔接终态，但不负责最终 Prompt 的格式。
- `visual-gen`：Stage 6 把每个 Shot 的全部事实装进固定六段骨架，只补真实 refs、音乐切片和生成所需的物理过程。确认后的 `work_items[].prompt` 就是派单原文；Stage detail 因体积省略 Prompt 时，Executor 用 `hub_plan_get_work_items` 按稳定 item id 取回。Post 按 `sequence_index` 取当前视频，并用 Stage 2 的完整主音乐替换口型代理音轨。

## Reference Routing

每个 reference 文件顶部都写了"Stage-local 读取路由"，给出各段的 `offset/limit`；按路由直接读需要的切片，不先读整本。同一 Planner session 里，同一文件、同一行范围、同一来源 Stage revision、同一已选路线的读取结果可以复用；只有发生 compaction、上次读取报错或截断、上游 revision 变化、风格或字体路线改变时才重读受影响切片。不读未选路线。

| 当前 Stage | Required reads |
|---|---|
| intent | `<workflowsDir>/mv/reference/creative-and-plan.md` 的问询切片；登记显式输入并完成本次问询后，再读方向文档切片，以及 `<workflowsDir>/_shared/stage-execution-plan.md` |
| music-prep | 已有唯一主音乐时：intent Stage detail、真实音频 ref、`<workflowsDir>/mv/reference/music.md` 的"已有主音乐快路径"切片，不读方向文档、曲风库或生成章节。Agent 生成音乐时读问询与生成切片。多段音频用途不清或需要独立混音时读 `<workflowsDir>/_shared/audio-pipeline.md` |
| production-plan | intent Stage detail、当前方向文档、最终 `main_song`；`music.md` 的 Stage 3 切片、`creative-and-plan.md` 的 Stage 3 切片、`<workflowsDir>/mv/reference/style-system.md` 共用段 + 已选风格段、`<workflowsDir>/mv/reference/typography-packaging.md` 共用段 + 已选路线 + 同步与 Gate |
| assets | 用户已上传完整角色卡且无新增人物或条件场景时：production-plan Stage detail + `<workflowsDir>/mv/reference/assets.md` 的快路径切片。需要生成时再读 `<workflowsDir>/_shared/asset-pipeline.md` 的共用段 |
| shot-plan | production-plan Stage detail（Treatment、节奏 / 空间 / 动作 / 插入策略、`style_anchor`、`typography_system`、文字账本、时间轴与时长）、Stage 4 当前资产；`<workflowsDir>/mv/reference/storyboard.md` 全文；`_shared/stage-execution-plan.md`、style-system 与 typography-packaging 只补读未覆盖的切片 |
| visual-gen | 第一个工具回合只读 shot-plan Stage detail；拿到有序 `document_node_id` 后，第二个工具回合用 `hub_canvas_read_text` 把分镜逐份读到 EOF。之后才读 production-plan、assets Stage detail、最终 `main_song` 和 `<workflowsDir>/mv/reference/video-generation.md`；不再读风格库、字体库或聊天概括 |
| post | 按 `shot-plan.execution_excerpt` 读分镜中的顺序、画幅和准确文字兜底，`main_song`、Stage 6 refs；`<workflowsDir>/mv/reference/post.md` 与 `<workflowsDir>/_shared/video-merge.md`；只有连续字幕兜底才读 `<workflowsDir>/_shared/subtitle-pipeline.md` |

## Stage Rules

- 每轮只 author 当前 Stage，它被接受后才追加下一个。全部镜头组共用一个 `shot-plan`，全部视频共用一个 `visual-gen`；不建版本号 Stage、汇总 Stage 或逐组 Stage。
- Stage 1 第一次进入时，先把用户原文和真实附件里已经明确的内容、音乐、参考素材、媒介、时长、画幅登记下来；再用 `working_language` 写好问询，一次 `question` 只弹缺失的卡加上必弹的视觉风格卡。已有具体证据的项目不再问，概括和推测不能代替用户作答。回答后再写方向文档和扁平 Plan，嵌套结构不塞进 `constraints` 或 `stage_fields`。
- Stage 2 只有 Agent 生成音乐时才问一次曲风卡和"歌曲语言形式"卡（带歌词·英文 / 带歌词·中文 / 纯音乐 / 用户指定语言），文案先整体写成 `working_language`。带歌词时把 Planner 写好的完整歌词与曲风描述放进 `review.before_execution`，用户确认后才生成。生成或登记、试听选终点、按 5 秒整数倍裁切、复听结尾都在同一个 Executor turn 里完成；窗口内没有自然落点时直接按目标裁切并短淡出，不问用户、不退回 Planner、不重做歌曲。
- Stage 3 在同一次 author 里先从最终成歌物化逐句整数秒时间轴，再写制作计划和内部 capsule；不另建音乐分析 Stage、问询或 Executor 任务。音乐实际时长、时间轴末行和制作计划必须是同一个整数。
- Stage 4 默认直接生成角色卡；普通 MV 只写场景描述，只有叙事需要空间连续、用户锁定同一空间或跨派单动作依赖空间时才生成场景卡。确认说明里附一句：用户可以上传自己的氛围参考图，不上传直接继续。
- Stage 5 先把最终时长切成连续的 5 / 10 秒镜头组（优先 10 秒，最多一个 5 秒组），总和严格等于音乐。10 秒的非叙事高能组通常 6–9 个 Shot，叙事组 3–5 个；5 秒组减半。逐 Shot 锁定时间、空间、主体动作、景别 / 构图 / 运镜、歌词口型、光影、材质、成像、VFX、准确文字、字体层、切换与可见终态，但不写 refs 外壳或最终 Prompt。
- Stage 5 默认一份分镜；镜头组超过 12 组或正文预计超过 30000 字符时，在完整镜头组边界切成上下两份，仍属同一个 `shot-plan`、只确认一次。文档顺序、覆盖范围和交界终态写进 `execution_excerpt`。写完后复读真实文档，记录节点 / 路径、`contentHash`、总行数、覆盖组与 Shot 数。
- Stage 6 先拿 shot-plan Stage detail，再按真实 `document_node_id` 用 `hub_canvas_read_text` 逐份读到 EOF；没读完不建视频 work item。逐 Shot 投影分镜里的导演、风格和字体事实，只补 refs、音乐切片与生成执行细节；每组 Prompt 不超过 4000 字符，不合并、删减或概括 Shot。全部 Prompt 在同一 Production Board 一次确认，用户可在确认前直接改。
- `visual-gen` 固定 `concurrency_limit=1`、严格按 `sequence_index` 提交。确认后 Executor 只用已确认的 work item；Prompt 被省略时经 `hub_plan_get_work_items` 取回，过大就缩到单个 item。不从分镜或聊天重写；只有已确认 Prompt 真的缺失才退回同一 Stage 的 Planner。
- Stage 7 在用户确认 Stage 6 结果后自动合成，完整主音乐盖掉代理音轨；只执行 Stage 3 / 5 登记过的准确文字兜底，不重新设计包装。

## Anti-patterns

- 对已完成的 Stage 重新问询、重新分析或重新生成稳定产物。
- 视觉模式替用户编人物故事，或故事模式让风格改掉人物、因果、地点用途和结局。
- 把旧资产、旧音乐或聊天概括当作当前依据。
- 镜头组不是 5 或 10 秒、总时长不等于音乐、一个组拆成多次派单，或逐组建 Stage。
- 分镜只有概念摘要，没有逐镜动作、运镜、口型、光影 / VFX、字体层和终态；或 Stage 6 合并、省略 Shot，改写已确认事实，写成短版 Prompt。
- 长片分镜超过两份、上下两份重复或遗漏 Shot，或 Stage 6 没按顺序把两份读到 EOF。
- 确认后并行提交多条视频，或把后续组写成"参见前组"的引用句，或派单参数与已确认 work item 不一致。
- Stage detail 省略长 Prompt 后让用户拆文档、从分镜重建或凭零散字段重写，而不是用 `hub_plan_get_work_items` 取回原条目。
- 用普通字幕、随机文字或 Post 重做来代替视频内生成的字体包装。
