# Workflows — 运行时路由索引

本文件只回答运行时的三个问题：当前有哪些项目型 workflow 可以被选中；router 怎样把用户意图、文档指针和已知约束归纳成一条路由结论；planner 拿到结论后读什么。怎么写、怎么改 workflow 文件，看 `README.md` 与 `AUTHORING.md`，这里不收录写作规范。

## Routing

- media-agent 拿到任务，先判断能否直接执行；判断不了或明显是多阶段项目，再交给 router 分类。
- 纯图片任务（生成、改图、批量出图、同一视觉身份的一组图、排版或文字海报、风格变体）走直接路径，不进 workflow，只要它不需要非图片阶段，也不需要最终合成。
- 以产品为主角的种草 / 带货 / UGC 口播短视频不设单独入口：一两条短片、无需跨片一致性的，走直接路径；更长、多镜头、需要脚本和分镜的商业片，按广告片路由到 `ad-tvc/workflow.md`。
- 同一主体身份要出现在两条及以上视频里，就算每条单看都能直接生成，也按 workflow 单元处理，交给 router。
- 交给 router 时带上：内联的 `user_intent`、用户明确指定的 `source_documents[]`（可省略）、已知约束、本索引的路径。router 只回一个精简的 `routing_capsule`，写明路由结论；命中项目型 workflow 时再附 `workflow_match`。
- media-agent 按 `routing_capsule.route_kind` 行动：`direct` 回到直接执行；`ask` 先停下向用户确认；`workflow` 则把 `routing_capsule` 和 `workflow_match` 转交 planner。
- planner 读取文档指针、`routing_capsule`、`workflow_match`、`_shared/stage-execution-plan.md`，以及被选中 workflow 点名的共享工具卡，然后物化任务 / 脚本文档节点，写出 Stage Execution Plan。外部来源放在计划顶层 `sources`，不要伪装成一个 stage。planner 回给 media-agent 的只有 `plan_id`、`stage_count` 和精简的 `stages[]`。
- 长文档始终是来源文件，不塞进 media-agent 的上下文。只把指针交给 router，由 router 把它压缩成路由依据。

## Layout

```text
workflows/
  workflow.md                 运行时路由索引（本文件）
  README.md                   目录说明与写作入口
  AUTHORING.md                workflow 写作规范
  <project_type>/workflow.md  每个可选中的项目型 workflow
  drama-series/reference/     只给短剧用的分阶段模板
  mv/reference/               只给 MV 用的分阶段参考
  _shared/                    多个 workflow 共用的工具卡（不能被 workflow_match 选中）
```

暂停接入的 workflow 不随本配置分发，目录里没有归档子目录。

## Project Workflows

| 文件 | 适用任务 |
|---|---|
| `ad-tvc/workflow.md` | 电视广告、品牌片、产品片、商业宣传视频，以及较长的产品种草 / 带货视频 |
| `drama-series/workflow.md` | 短剧、微短剧、分集连续剧、短剧剧本、试播集 / 第一集、短剧企划（配套 `reference/` 下的制作计划、分镜、资产与走位等模板） |
| `mv/workflow.md` | 音乐视频、给歌配画面、卡点剪辑、歌词视频、音乐可视化、表演 / 说唱视频、视觉专辑；英文如 music video、lyric video、visualizer、beat-synced video、"make a video for my song"。以已确认的音乐作为主时间轴 |

只有上表三个文件可以作为 `workflow_match` 的目标。

## Shared Utilities

| 文件 | 作用 |
|---|---|
| `_shared/stage-execution-plan.md` | 计划的结构化写法：每个 stage 的 work_items、引用、依赖、锁定项与校验规则 |
| `_shared/asset-pipeline.md` | 何时建立可复用锚点：角色 / 主体、音色、场景、品牌与产品 |
| `_shared/audio-pipeline.md` | 独立配音、BGM、歌曲与终混的资产形态和前置条件 |
| `_shared/subtitle-pipeline.md` | 字幕的来源、格式化与烧录链路 |
| `_shared/video-merge.md` | 确定性的终剪合成，以及成片落到画布 |

共享工具卡不是 `workflow_match` 的目标。只在被选中的 workflow 或 agent 提示词点名时才读。
