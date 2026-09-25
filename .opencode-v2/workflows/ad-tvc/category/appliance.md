# Category：家用电器

> 经 `category/index.md` 命中后才读。视觉调研只看 `creative-research` 节，进入具体 Stage 后只看该 Stage 的节。

## `creative-research`

### 补充事实

- 记下本次广告真正要讲的功能、使用场合、机身尺寸与摆放 / 安装方式，以及操作后肉眼可见的结果。
- 成片里有人按面板或用手机 APP 操作时，才整理面板与 APP 的显示状态。
- 能效等级、除菌率、安全认证、检测报告只在文案会用到时核对，且只认品牌方公开资料或检测机构来源。
- 滤网、风道、电机等内部结构只有在公开资料里存在、而且创意路线用得上时才登记。

### 参考与输出

- 把手头每张产品图的拍摄方向、它放在房间里显得多大、显示屏亮着什么、露出了哪些零件记清楚；缺了某个角度不必硬凑。
- 路线确实要做前后对比时才准备 Before / After 素材。
- `category_profile` 里放功能说明、大小参照、显示内容，以及证据最多能证明到什么程度。

## `anchors`

- 把“用户的麻烦 → 产品出手 → 可信的结果”压成一个画面能证明的机制；内部透视、参数、安全类说法只在真实结构或认证支撑时使用。

## `storyboard`

分镜阶段把本节适用的规则写成稳定的标量条目，追加到对应单元扁平的 `constraints[kind=tvc_storyboard_plan_unit].execution_delta` 里。这里只冻结 Prompt 的输入和执行增量，不写视频 work item；`prompt` 只由视频生成阶段 Planner author 的 video work item 持有，视频生成只读这个 capsule，不再回来读本卡。
固定用三个 key：`appliance.prompt_rules`、`appliance.ref_routing`、`appliance.result_qc_boundary`；只写本单元用得到的简短标量，不另外建 `quality_checks`。

### Prompt 输入增量

- 功能要按“手上做了什么 → 机器里外发生了什么 → 得到什么结果”一口气写下来，不要一闪就完成的假效果。
- 做前后对比时，场景、机位、角度都保持一致，只让目标状态变化。
- 产品与房间的比例、面板 / APP 显示、使用动作都从已登记事实里取。
- 机器嗡嗡声、出水、冒汽、开合、滴一声提示，都写进那一镜自带的声音里。

### 参考与检查

- 某镜要拍某块面板、某个零件或某个方向时，去登记表里找能对上的 refs。
- `appliance.result_qc_boundary` 包含 `effect_credibility`、`before_after_match`、`screen_state`、`spatial_scale`，涉及认证文案时再加相应检查。
