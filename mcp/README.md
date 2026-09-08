# mcp

自己的 MCP server。**按官方那 103 个工具同名同参实现** ——
清单见 [`docs/mcp-tools.md`](../docs/mcp-tools.md)。

## 为什么要一模一样

这是整个方案的支点。工具面对齐之后：

- 官方那套 agent 配置能直接驱动我们的实现，不用重写提示词
- 我们的 server 也能挂到官方应用上跑，用来验证行为一致
- 出问题时能一块一块换着试，而不是整条链一起怀疑

opencode 按 MCP server 名加前缀，所以 server 名必须是 `hub`，
agent 侧看到的才是 `hub_canvas_write_node` 这种。

## 实现顺序

103 个不用一次做完。按"链路能不能跑"排：

1. **画布 14 个** —— `canvas_write_media_node` / `canvas_write_text_node` /
   `canvas_list_nodes` / `canvas_get_node` 这四个就能让 agent 往画布上放东西
2. **生成 4 个** —— `generate_image` / `generate_video` /
   `generate_audio_speech` / `generate_audio_music`，底下调
   `crates/maas-media`
3. **资产与文件** —— `read` / `write` / `analyse_media` / `probe_media`
4. 其余按需要补。ComfyUI 那 10 个和插件那 6 个可以最后，甚至不做 ——
   但那样要同步删掉 agent 配置里对应的路由段（见 [`agent/README.md`](../agent/README.md)）

没实现的工具**不要注册一个空壳**：注册了但返回"未实现"，agent 会把它当成
一次失败的调用去重试；不注册，agent 至少能看到工具不存在而换条路。

## 两条从官方踩出来的经验

**stdout 是 MCP 协议通道，绝对不能往里写东西。** 一行 `console.log` 就会
破坏协议帧。

**诊断要落到确定的文件。** 官方 mcp-tools 的诊断只写 stderr，而 opencode
不落盘、应用日志里也看不到 —— 排查工具层成败时那是唯一的地面真相，却看不见。
我们从一开始就写文件。

## 契约要能被测试钉住

工具名和关键字段名是跨进程的字面量约定：agent 按名字调，schema 按名字校验，
两处分开维护而没有任何东西保证一致。写错一个字母的表现是
「agent 说它调了，但什么都没发生」。

值得用测试把 103 个名字和各自的必填字段钉住，并且和
`docs/mcp-tools.md` 对账 —— 那份文档是从官方产物里提取的，
`scripts/extract-mcp-tools.py` 可以随时重跑。
