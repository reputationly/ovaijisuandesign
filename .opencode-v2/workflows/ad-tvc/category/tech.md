# Category：3C 数码

> 经 `category/index.md` 命中后才读。视觉调研只看 `creative-research` 节，进入具体 Stage 后只看该 Stage 的节。

## `creative-research`

### 补充事实

- 确认具体型号和版本、外壳用料、配色、接口按键和摄像头模组的位置、屏幕亮着什么、拿在手里有多大。
- 参数只收本片要讲的那几项，每个数字都附上它是在什么条件下、按哪个协议 / 标准、哪个版本测出来的。
- 内部结构、多设备互联只有在厂商公开资料里有、而且路线需要时才登记。

### 参考与输出

- 外观图逐张写清角度和能认出型号的部位；用料、接口的近景按将来要拍的镜头分别登记。
- 屏幕界面、多设备摆放都按真实状态记录，不为凑微距比例去要更多图。
- `category_profile` 里放：材质对光的表现、产品大小、屏幕与交互状态、参数出处、设备之间的联动关系。

## `anchors`

- 挑一个主要的证明方式（外观设计、材质、性能参数或生态联动之一）来组织路线。
- 只有当产品是耳机音箱、透明外壳硬件、AI 电脑或性能本、需要几台设备联动、同款有多种颜色，或者用户给了类似的数码广告参考片时，才读 `<workflowsDir>/ad-tvc/category/tech/casebook-tech-ads.md`；不要为了找灵感把它通读。

## `storyboard`

分镜阶段把本节中适用的条目写成稳定标量，挂到对应单元扁平的 `constraints[kind=tvc_storyboard_plan_unit].execution_delta` 下。本节只冻结 Prompt 输入和执行增量，不写视频 work item；`prompt` 由视频生成阶段的 Planner 写，视频生成只认 capsule，不会再翻本卡。
只用 `tech.prompt_rules`、`tech.ref_routing`、`tech.result_qc_boundary` 这三个 key，只写本单元用得上的短标量，不另开 `quality_checks`。

### Prompt 输入增量

- 铝、玻璃、陶瓷、塑料、碳纤维，各按真实材料的反光和漫射来写，微距也一样。
- 屏幕、各类开孔与按钮、摄像头、手握时的大小，都照登记表写；界面写清当前显示什么、操作后变成什么。
- 每提一个参数，就配一个观众看得见的好处，出处条件照抄登记表。
- 设备之间的联动要写明每台设备放在哪、谁先触发、数据或动作怎么传过去；没这个需求就不加联动镜头。

### 参考与检查

- 拍某个特别角度、某块屏、某个开孔或某种材质时，从登记表挑对应产品 refs；一个单元里产品外观参考加起来不超过 3 张。
- `tech.result_qc_boundary` 包含 `material_match`、`screen_state`、`parameter_evidence`、`product_scale`，有联动时再加连续性检查。
