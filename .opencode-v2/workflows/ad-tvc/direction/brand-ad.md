# Direction：品牌广告

> 经 `direction/index.md` 命中后才读。视觉调研只看 `creative-research` 节，进入具体 Stage 后只看该 Stage 的节。

## `creative-research`

- 往 `direction_profile` 里补：品牌想传达的价值、希望观众产生的情绪、品牌和产品各自扮演什么角色、文案口吻、整体节奏快慢。
- 如果关于品牌还缺了一块，而这块会左右片子往哪走，退回需求简报阶段去补；视觉调研阶段不调 `question`，也别用某种原型、段落配比或产品露出比例替用户拍板。

## `anchors`

- `compose_from_brief` 要卖的是一种生活态度、一种“我是谁”的认同或一份情绪时，把 `video_creative_route.route_structure` 定为 `brand_identity_reveal`，按语义顺序写五个 `narrative_stage.stage_role`：`world_build → identity_state → symbolic_totem → product_tease → hero_reveal`。它们依次负责：立起品牌所在的世界、交代人物的气场、出现一个精神象征、吊起对产品的期待、完整亮出产品并回到品牌。不规定秒数和镜头数，但每一拍都要有一件新的、看得见的事；片子短时可以把相邻两拍放进同一个生成单元，但哪一拍的作用都不能丢。
- `symbolic_totem` 只挑一个意象：动物、自然力量或某件物品，要和品牌气质、投放地文化都合得来。在 `technique_plan` 里绑定 T20，记下：它由什么承载、象征什么、颜色 / 形状 / 材质 / 动势里哪些不能变、它和人物或产品怎样看得见地连起来、最后在哪收回。动物意象要保持同一物种、同样外观和习性，不要乱插无关动物；速度、力量、稀有之类的比喻都不能当作产品真的具备的本事来写。
- `product_tease` 只靠剪影、局部质感、倒影、一个操作动作或一段声音制造期待，别堆一串没含义的细节；到 `hero_reveal` 才让产品完整、清楚地出现（或者给出使用结果、品牌动作），同时把前面铺的世界、人物、意象拧成观众能记住的那一个点。
- 路线用一个清楚的视觉母题来承载品牌价值；如果真的出路线 KV，KV 只把这个母题画出来。Style Master 和用户挑中的参考优先于“品牌片一般长这样”的默认审美。
- `compose_from_brief` 有旁白时，从定稿文案中选一到三句最能让情绪转弯、或最该被记住的短语写进 `key_copy_policy`；按原旁白时间逐字绑定，用 T06 做动态字体构图；不把整段旁白都上屏，同一时刻如果已有普通字幕，就别再重复一遍。
- `compose_from_brief` 在 `hero_reveal` 之后按片长编 `brand_end_card_spec`：用核实过的 Logo 文件，没有就只写准确品牌名；加上已确认的 Slogan，版式层级只有一层，风格与 Style Master 一致，是一个完整的动态结尾画面；片长允许时至少稳稳停 2 秒让人看清，不固定占 3–5 秒。这个结尾单元也是视频模型一次生成出来的；锚点阶段真出了 `creative_route_kv` 就带上它，否则用 Style Master 和文字包装锁。没有核实 Logo 时绝不自己画一个像 Logo 的图形。
- `preserve_script` / `preserve_storyboard` 模式只保留原稿里已有的关键词大字和结尾卡；原稿没写的，不能以“提升质量”为理由加进去或改掉。

## `storyboard`

- 分镜阶段把本节中适用的条目写成稳定标量，挂到对应单元扁平的 `constraints[kind=tvc_storyboard_plan_unit].execution_delta` 下。本节只冻结 Prompt 输入和执行增量，不写视频 work item；`prompt` 由视频生成阶段的 Planner 写，视频生成只认 capsule，不会再翻本卡。
- 只用三个 key：`brand_ad.emotional_grammar`、`brand_ad.prompt_rules`、`brand_ad.native_text`，把下面的要求压成短标量；视频生成不能临时改名或回头读本卡。
- `brand_ad.emotional_grammar` 依次登记五个 `stage_role` 各自对应的 `narrative_stage_id`、画面上发生了什么、情绪往哪走、产品露多少、如何接到下一拍。前三拍 `world_build`、`identity_state`、`symbolic_totem` 的 `product_visibility` 都是 `absent`，`product_tease` 是 `tease`，`hero_reveal` 是 `full`。前三拍分别负责让人认出品牌的世界、用细微表情 / 姿态 / 日常动作让人想象这个人是谁、把同一个意象往前推；后两拍攒足期待再把产品和品牌收回来。不许用没有因果的漂亮空镜或重复的产品局部把五拍凑满。
- 动物意象必须靠姿态、视线、动势、颜色、形状、材质或声音和相邻的人物 / 产品镜头连起来；不能变成一段独立的动物纪录片，也不能借它暗示产品有什么没查证的快、稳或罕见。
- 品牌名、Slogan、Logo 和结尾卡按 `confirmed_text_timeline` 与核实过的 refs，由相应视频单元直接画进画面；不要反复出现，也不留给后期去烧。
