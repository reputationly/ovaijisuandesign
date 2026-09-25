# 美妆品类：Anchors Video Creative Route 增量

> 何时读：锚点阶段确认 `category_profile.category_id: beauty` 后，从 `beauty.md` 的 `anchors` 节指过来。
> 怎么用：直接叠加到锚点阶段的 `constraints[kind=video_creative_route|narrative_stage|route_asset_requirement]`，不另建一套路线产物。

## Input Contract

- 简报、Style Master、核实过的 `research_style_reference_set`、`direction_profile.visual_rhythm`，以及用户选定参考视频的节奏。
- 核实过的产品图登记表、`beauty_research.application_states`、可选的 `category_profile.sensory_basis`、人物范围、已确认的广告类型。

## Output Delta

美妆的特殊信息直接落进通用的 `video_creative_route`：

| 片子里的美妆元素 | 落在哪个字段 |
|---|---|
| 仪式感、蜕变、表达自我、证明质地 | `creative_premise` |
| 上妆前 → 上妆中 → 上妆后，以及产品何时亮相 | `narrative_stages` |
| 妆容变化带动的情绪起伏 | `emotional_arc` |
| Hero 镜头、使用仪式、让人记住牌子的那一下 | `product_brand_role` |
| 液体淌下、粉体扬起、刷毛触肤、上脸瞬间等质地时刻 | `impact_signature` |
| 一个感官主题在场景、人、细微质地、产品之间轮流出现 | `impact_signature` |

同时把 `beauty_research.application_states` 整理成 `category_profile.makeup_state_plan`：按路线顺序写每个状态的固定 id、看得见的妆面、用什么产品动作进入该状态、依据是什么。状态不够撑起路线时，退回视觉调研补证据，锚点和分镜都不能自己编。

## Execution Rules

- 产品片可以走“上妆前气色一般 → 上妆的仪式 → 上妆后亮相”；品牌片可以讲个人态度、用妆容作比喻、表达自我。
- 剧情片让妆容跟着人物的变化走；病毒片可以做前后反差、上妆 ASMR 或身份反转，但产品事实必须是真的。
- 做香水或纯情绪片时，从 `category_profile.sensory_basis` 里挑一个主感受，让产品成为意象的来源、开启的动作或最后的落点；别把花、露水、风、梦一股脑全堆上去。
- 做护肤或证明效果的片子时，把场景里、身体上的触觉和实际的推开、滑落、渗入或最后的光泽串起来；比喻只负责建立感受，功效仍要靠核实事实和看得见的结果。
- 如果打算让一个感官主题依次落在场景、人、细微质地和产品上，把 T20 列为候选技法，并在 `technique_plan` 里写清依据、承载物和产品回收点。
- Hero 镜头在 `narrative_stages` 里至少出现一次，可以是提前预告，也可以是结尾定格；具体几次看片长和分镜节奏。
- 颜色从视觉调研确认过的品牌色与产品色里取，不凭空发明；哪个颜色当主、哪个当辅、怎样不让皮肤变色、背景怎么反光，都照 Style Master。
- 光和背景不能让皮肤明显偏绿、偏灰或偏青；品牌色可以染环境，但产品长相和人的长相不许因此变。

## Binding

美妆元素只能落在 `video_creative_route` 已有字段里；分镜再把它们展开成逐镜计划，不另建品类文档或并行字段。

## Anchors 交接

美妆相关内容只落在上表列出的那些路线字段、`category_profile.makeup_state_plan`、`constraints[kind=route_asset_requirement]` 和现有的 `constraints[kind=selling_point_binding]`；来源追溯交给路线字段和分镜的 `route_trace`，不再加并行 trace 字段或单独校验。
