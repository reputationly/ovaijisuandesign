# mcp

自己的 MCP server：agent 通过它操作画布和发起生成。

## 两组工具

**画布操作** —— 对应官方的 15 个 `canvas_*`：

```
写：  write_node / write_media_node / write_text_node / write_table_node / write_file_node
组：  group_nodes / ungroup_node / group_recent_outputs
文本：apply_text_edits / read_text / grep_text
查：  search_nodes / list_nodes / get_node / source
```

这组是**必须自己写**的：它们直接操作画布的数据结构，而数据结构由
`crates/gateway` 定义。

**生成** —— 对应官方的 `hub_generate_*`：图片、视频、语音、音乐。
底下调 `crates/maas-media`。

## 一条踩过的经验

官方 mcp-tools 的诊断**只写 stderr**，opencode 不落盘、应用日志里也看不到 ——
排查工具层成败时那是唯一的地面真相，却看不见。

我们的 server 从一开始就要把诊断写到一个确定的文件里。注意
**stdout 是 MCP 协议通道，绝对不能往里写东西**。

## 契约要自洽

工具的入参/出参 schema 和 `agent/contracts/` 里写的必须对得上。这两处分开
维护、又没有任何东西保证一致，是最容易出"安静的错"的地方 —— agent 按契约
调用，schema 校验失败，而失败信息未必回得到 agent 手里。

值得用测试把工具名和关键字段名钉住。
