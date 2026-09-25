# Direction：病毒传播广告

> 经 `direction/index.md` 命中后才读。视觉调研只看 `creative-research` 节，进入具体 Stage 后只看该 Stage 的节。

## `creative-research`

- 往 `direction_profile` 里补：一个让人想转发的主要理由、一个让人相信的日常开场、一点不对劲的苗头、一个爆点、一个简短的品牌落点。
- 爆点要能落成一个看得见的事件；别叠好几个反转，也别只贴“洗脑”“魔性”这类抽象标签。

## `anchors`

- 路线要把“日常”和“反常”之间的反差立清楚，并给唯一的爆点留足画面空间；真出路线 KV 时只画这层反差。

## `storyboard`

- 分镜阶段把本节中适用的条目写成稳定标量，挂到对应单元扁平的 `constraints[kind=tvc_storyboard_plan_unit].execution_delta` 下。本节只冻结 Prompt 输入，不写视频 work item；`prompt` 由视频生成阶段的 Planner 写，视频生成只认 capsule，不会再翻本卡。
- `viral_ad.event_arc`：先让人相信这是日常，再蓄势，然后引爆一次；爆完迅速收尾，不再加抢戏的第二件事。
- `viral_ad.brand_role`：产品只在事件需要它时出场，品牌信息不能压过那个让人记住的瞬间。
