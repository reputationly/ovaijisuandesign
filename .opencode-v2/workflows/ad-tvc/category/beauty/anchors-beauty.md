# 美妆品类：Anchors 增量

> 何时读：锚点阶段发现 `category_profile.category_id: beauty`，由品类根卡指过来。
> 怎么用：只有通用锚点规则判定确实缺卡时，才把下面几条套用到三类卡：产品资料卡、路线 KV、5-plate 人物卡；没写到的按通用规则。

## Input Contract

- 视觉调研已通过的 `constraints[kind=research_decision|product_ref_registry|ref_analysis|style_master|category_profile]`、`brand_palette` 及相应 `ref_capsules`。先看 `product_evidence_mode`：是 `real_product` 就用核实过的 `product_ref_registry`；是 `concept_product` 就用用户的概念稿 / 品牌素材、简报里确认的外观，以及带 `must_not_claim` 的 `concept_product_inspiration`。
- 简报或采纳的脚本 / 分镜里定下的出镜人物，外加用户上传的模特照（如有）；不要为了读这张卡去补写简报。
- Stage 表已经把本轮要读的文件路由好了，本卡不再调 `hub_read`。

## Output Delta

- 核实过的产品素材覆盖不了下游需要的外观、视角或使用状态时，才出一张 `product_reference_card`：`real_product` 只能用真实产品 refs；`concept_product` 按通用 `product-spec.md` 与 TPL-01，用已确认的概念依据补齐缺的角度，并标明 `concept anchor`。素材够就直接用原图。
- 只有当某种构图、色光质感或字体包装必须在好几个视频单元里一模一样，而 Style Master 和路线 constraints 单靠文字说不稳时，才把风格总纲、品牌色、产品色以及“别让皮肤变色”的规则一起画进一张 `creative_route_kv`；风格不再单独出卡。
- 用户选了固定模特、现有人物素材又撑不住跨镜身份或妆容一致性时，出一张 `character_reference_card`，沿用 TVC 5-plate 版式，出图参数 `vendor=banana`、`resolution=2K`、`aspect_ratio=16:9`；素材够就直接用。
- 在人物卡 work item 的 `constraints` 字段中登记 `category_profile.makeup_state_plan` 的状态计划、`category_profile.skin_finish` 的肤质值，外加手型、嘴唇形状这类细节。
- “素颜 → 上妆后”默认是同一个人的状态计划，不是两张人物卡；只有分镜明确两种状态都要、且一张卡装不下时，Planner 才可以显式加一张状态参考。

## Execution Rules

- 出人物卡时，以用户给的模特照为身份主参考，卡片必须把这个人的脸、眉眼口鼻、皮肤颜色、头发、年龄感和体型固定下来。
- 需要表现上妆前后时，两个状态共用同一个人、相同的拍摄方式、同一个发型、同一套底光；变化只能发生在底妆、嘴唇、眉毛、眼影以及皮肤亮暗上，且以简报或已采纳来源为准。
- 默认缎光（`satin finish`）；水光（`dewy`）只给颧骨高点和唇部，眼周用哑光（`matte`）。不要笼统写“满脸水光”。
- 卡上的动作、衣着、配饰、肤质都要有出处（简报、选角规格 casting-spec、采纳的脚本、用户照片或核实过的产品资料），不从还没写的分镜里反推。

## Binding

- 出人物卡时，work item 固定写 `constraints.makeup_state_plan`、`constraints.identity_locks`、`constraints.skin_finish`、`constraints.continuity_guards`；前两项的美妆取值原样继承 `category_profile`。
- 出产品卡时仍按通用分区版式；膏体、液体、刷头、喷嘴、包材各放进对应的局部 / 材质区。`concept_product` 只写用户素材、简报或允许的灵感依据里有的东西，不需要真实产品登记表，也灵感来源那款产品的牌子、标志、包材文字、配色和型号一律不能带过来。
- 全片的路线和风格由 `style_master` / `style_prompt` 往下传；真出了 `creative_route_kv` 时，只给需要它锚定画面的视频单元带上，其余单元只用路线 constraints。然后按单元需要补上真实存在的 `character_reference_card`、人物原图和产品特殊角度图；视频 Prompt 不得照搬 KV 上的信息栏、宫格、标签或卡片排版。
- Style Master、`brand_palette`、肤色保护规则以文字约束形式存在；KV 里的主画面好看归好看，不能覆盖产品真实样子和人物长相。

## Anchors 交接字段

交给锚点阶段唯一的 `anchor_asset_qc`：`beauty_identity_match`、`makeup_state_binding`、`product_evidence_trace`、`palette_skin_guard_trace`。本卡自己不做单独校验。

## Anti-patterns

- 已经判定缺人物卡，却还是只把模特原图往下传，身份或妆容的跨镜缺口没补上。
- 一有“素颜 / 上妆后”就默认出两张人物卡，白白多花积分。
- 把分镜里将来才发生的上妆动作提前编进人物卡。
