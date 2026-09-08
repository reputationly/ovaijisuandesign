# agent

给 opencode 的配置：agents、contracts、skills、workflows。

## 用 opencode，不 fork

MiniMax Design 里那个 142MB 的 `opencode` 二进制是**原版 1.18.18，一行没改**
（整个二进制里 `hilo` 零命中，`minimax` 全是 models.dev 的 provider 图标）。
它们的全部定制都落在 opencode 官方支持的三个扩展点上：MCP server、
agent/contract 配置、plugin。

我们照做。opencode 是 MIT，直接依赖发布版二进制或自己 build，
不维护 fork。

## 这里的东西必须自己写

**不能抄 MiniMax 的那批 markdown**，两个理由，第二个更要命：

1. 那是受版权保护的创作性表达，不是接口事实
2. **它们是照他们的工具调的** —— `contracts/` 里到处引用 `hub_*` 的工具名、
   他们的模型目录、他们画布的语义。我们的工具契约一旦不同，抄来的契约就是
   错的，而且是**安静地错**：agent 行为跑偏，不报错

可以借鉴的是**结构**：把"编排纪律"、"防打转"、"模型路由"、"长宽比"这些
关注点拆成独立的 contract 文件按需组合，这个组织方式本身是好设计。

## 布局

```
agents/       每个 agent 一个 md：做什么、能用哪些工具、什么时候交棒
contracts/    跨 agent 的行为约定，按关注点拆开
skills/       渐进式检索的知识（出图配方、失败案例、vendor 特性）
opencode.json  mcp / agent / plugin 的接线
```
