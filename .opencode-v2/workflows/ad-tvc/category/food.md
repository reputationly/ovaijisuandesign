# Category：餐饮食品

> 经 `category/index.md` 命中后才读。视觉调研只看 `creative-research` 节，进入具体 Stage 后只看该 Stage 的节。

## `creative-research`

### 补充事实

- 弄清楚这道菜 / 这款产品到底长什么样、是热是冷、最突出的口感质地、怎么做出来的，以及打算在什么场合被吃掉。
- 餐具、外包装、摆盘规范和品牌颜色，只有画面里真会出现时才整理。
- 配料、营养、产地、功效类文案，只用能查证的出处。

### 参考与输出

- 路线用得到哪些状态就登记哪些：生的熟的、切开的截面、流淌、冒热气、咔嚓裂开、拉出丝。
- 参考图的用处是告诉我们质感、色泽和变化过程是否真实；摆了几盘不是完成标准。
- `category_profile` 里写：最能勾起食欲的点、温度与新鲜程度、关键的物理动作、品牌摆盘能改到什么程度。

## `anchors`

- 挑一个主打的“馋点”——热气、爆浆、拉丝、酥脆断裂、液体倾泻、一口咬下——只围绕它做路线，不把所有效果塞进一条片子。

## `storyboard`

分镜阶段把本节中适用的条目写成稳定标量，挂到对应单元扁平的 `constraints[kind=tvc_storyboard_plan_unit].execution_delta` 下。本节只冻结 Prompt 输入和执行增量，不写视频 work item；`prompt` 由视频生成阶段的 Planner 写，视频生成只认 capsule，不会再翻本卡。
只用 `food.prompt_rules`、`food.ref_routing`、`food.result_qc_boundary` 这三个 key，只写本单元用得上的短标量，不另开 `quality_checks`。

### Prompt 输入增量

- 热气、油光、爆浆、拉丝、下刀、下锅、倒入、咬下这些动作，写清是怎么来的、快慢如何、最后是什么物理结果。
- 热菜、冰饮、烘焙、茶和咖啡，冷热感、新鲜感、色泽和口感都要准确。
- 光为食欲服务：冒热气时用逆光把烟雾层次打出来，饮料要透亮，食物表面不能像塑料。
- 油炸的滋滋声、切菜的咔嚓声、倒液体的声音、碰杯声、咬下去的脆响，写进原生声音。

### 参考与检查

- 要拍某个切面、某种摆法、某个包装或某种口感时，带上相应 refs。
- `food.result_qc_boundary` 包含 `appetite_texture`、`food_color`、`steam_or_temperature`、`freshness_state`、`ambient_sfx`。
