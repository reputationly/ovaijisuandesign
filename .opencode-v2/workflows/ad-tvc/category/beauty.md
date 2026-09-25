# Category：美妆

> 经 `category/index.md` 命中后才读。视觉调研只看 `creative-research` 节，进入具体 Stage 后只看该 Stage 的节。

## `creative-research`

### 补充事实

- 弄清楚它属于彩妆、护肤、香氛还是美容仪；产品本身和外盒 / Logo 的准确颜色；质地（膏、乳、液、粉、油）和妆效（哑光、缎光、水润、珠光）；片中打算怎么用它。
- 片中有人时，记下肤色冷暖、上妆前的样子、想要的妆效，以及每个镜头都要一致的唇色、眼妆、眉形和腮红。
- 香氛类只写有可靠出处的香调、适合的季节与场合；把“查证过的产品信息”“用户认可的品牌感觉”“只是创意的比喻”分成三栏记。
- 护肤效果的说法，没有用户资料或可靠出处支撑就删掉。

### 参考与输出

- 产品图逐张写：包装朝哪边、颜色、盖子开没开，以及能看到的使用事件（涂开、流下、粉扬起等）。
- 人物图和产品图分开登记；产品颜色与包装只认真实照片，AI 生成的概念图不能拿来当证据。
- 产品、包装、模特、妆效图都不算风格参考。只有用户明说“这张要参考它的风格”，同一张图才能另起一条风格登记，贡献可以迁移的构图、用光、配色、材质、空间或运动。
- 没有合格的风格素材时，必须拿出 5–6 个彼此不同的风格候选让用户在画布上挑，不能光凭“这是美妆”“品牌色是什么”“质地如何”“模特是谁”或内部审美直接写 Style Master。
- `category_profile` 写入：产品颜色、质地、肤色与妆容连续性、品牌色与肤色之间怎么互不干扰。
- 路线要走感官意象时，在 `category_profile.sensory_basis` 里分别列出：可用的核实属性、已确认的品牌情绪、以及不能当作功效证明的比喻；用不上就不建这个字段。

## `anchors`

- 读 `<workflowsDir>/ad-tvc/category/beauty/creative-route-beauty.md`。
- 需要把皮肤颜色、妆面或品牌色钉死时，再读 `<workflowsDir>/ad-tvc/category/beauty/anchors-beauty.md`。

## `storyboard`

分镜阶段把本节中适用的条目写成稳定标量，挂到对应单元扁平的 `constraints[kind=tvc_storyboard_plan_unit].execution_delta` 下。本节只负责冻结 Prompt 的输入、执行约束和结果检查，不写视频 work item；`prompt` 由视频生成阶段的 Planner 写，视频生成只认 capsule，不会再翻本卡。

### Prompt 输入增量

- 皮肤要留住真实毛孔和本来的冷暖；相邻镜头之间，口红颜色、眼部妆、眉毛形状、腮红、光泽都不能变。
- 上脸、液体流下、粉扬起、拉丝、珠光闪动这些事件，写明它从哪来、多快、镜头怎么跟、最后停在什么状态。
- 产品与包装长什么样、什么颜色、标志在哪，都照实拍图来。
- 只有当产品、皮肤或者质地上正在发生点什么才上微距，不设比例指标。
- 选了 T20 时，每个镜头只让一种角色当主角（环境、人物、微观质地或产品之一），并用颜色、形状、动势或材质把它接到下一个镜头。
- 感官比喻只负责传达触感、气味联想和品牌情绪；护肤效果、妆效、使用结果仍然要靠核实事实和看得见的动作来证明。

### 参考与检查

- 锚点阶段确实出了 `creative_route_kv` 时，需要它的视频单元带上这张图，只继承已确认的路线、Hero 构图、色光质感和字体包装；没出就直接用 Style Master 和路线 constraints。再按镜头需要补产品、人物、特殊质地的 refs；原始风格参考图不进视频 refs。
- `product_color`、`makeup_continuity`、`skin_rendering`、`macro_target`、`texture_event` 合并进一个 `beauty.result_qc_boundary`；选了 T20 再加 `sensory_motif_continuity`、`metaphor_claim_boundary`、`product_recall`，不另建 `quality_checks`。

### Flat capsule 执行增量

- `beauty.prompt_scope`：视频 Prompt 只能把定好的感官主题、它落在谁身上、产品在哪收回写出来；执行时别再冒出另一组自然景物或材质象征。
- `beauty.continuity`：母题的颜色 / 形状 / 材质 / 动势在各单元之间保持不变，同时环境、人物、微观质地、产品各讲各的信息。
- `beauty.result_qc_boundary`：上述检查加上产品身份、肤色与妆容一致性；只规定视频生成阶段自检的范围，不保存结果。
