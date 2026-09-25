# Knowledge — 用到时再读的领域知识

知识库不进启动上下文。staging 只把 `<knowledgeDir>` 的绝对路径告诉 agent，卡片正文由 agent 在任务确实需要时用 `hub_read` 或 `hub_search_knowledge` 取。

| 子目录 | 内容 | 谁读 |
|---|---|---|
| `vendors/` | 平台各模态模型的真实能力、参数范围和踩过的坑 | 直接路径上的 media-agent 写 prompt 前读；executor 只按 plan 派发，不读 |
| `failures/` | 跨模型的语义风险判断题 | executor 预防时读，media-agent 决定重试方式时读 |
| `image-recipes/` | 单图垂直品类的 prompt 编写配方 | media-agent 在直接路径上经 `hub_select_image_recipe` 命中后读一张 |

> 项目工作流不在这里，而在与 knowledge 平级的 `workflows/`，入口是 `workflows/workflow.md`。

## Routing

- 模型怎么选以 `hub_list_capabilities` 为准；它返回空列表时按 `vendors/platform-routing.md` 的默认路由走。vendor 卡只补工程事实。
- failure 卡只在风险真的出现时读；`activation_hints` 用来召回，不划定规则边界。
- image recipe 不改变任务形态，只服务直接路径的单图 prompt，不当 `workflow_match`，也不进 planner。
- 工作流的路由写在 `workflows/workflow.md`，这里不重复。
- 不另建总索引，也不把卡片正文抄进提示词或合同。

## Writing

- vendor 卡不超过 60 行，failure 卡不超过 25 行，image recipe 不超过 180 行（工作流的行数上限见 `.opencode-v2/README.md`）。
- 每一句都要能影响路由、prompt、参数、依赖或重试中的某个决定。
- 例子只用来校准判断；不写演变历史、待办、墓碑、长篇解释或模型本来就懂的常识。
- vendor 卡只写本平台真实可用的模型；接口里出现但平台没有的 vendor 不写卡。
