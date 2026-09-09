# mcp

自己的 MCP server。**按官方那 103 个工具同名同参实现** ——
清单见 [`docs/mcp-tools.md`](../docs/mcp-tools.md)。

用 TypeScript + `@modelcontextprotocol/sdk`，版本**钉死成和官方一样的
1.29.0 + zod 3.25.76** —— SDK 1.30 换了 zod v4 的兼容层，混着用会在
`zod/v3` 上直接解析失败。

## 为什么要一模一样

这是整个方案的支点。工具面对齐之后：

- 官方那套 agent 配置能直接驱动我们的实现，不用重写提示词
- 我们的 server 也能挂到官方应用上跑，用来验证行为一致
- 出问题时能一块一块换着试，而不是整条链一起怀疑

**server 名必须是 `hub`** —— opencode 按 server 名给工具加前缀，agent 侧
看到的才是 `hub_generate_image` 这种。改了名字，官方提示词里那 120 处工具
调用会全部落空，**而且 LLM 不会报错，它会自己编一个看起来合理的做法**。

## 已实现（8 个）

| | |
|---|---|
| `canvas_list_nodes` | `type`, `limit`, `offset` |
| `canvas_get_node` | `nodeId`, `nodeIds` |
| `canvas_write_media_node` | `assetPath`, `sourceNodeIds`, `allowDuplicate`, `position` |
| `canvas_write_text_node` | `content`, `name`, `nodeId`, `mode`, `expectedContentHash`, `sourceNodeIds`, `position` |
| `generate_image` | `vendor`, `model_id`, `prompt`, `image_paths`, `filename`, `vendor_params` |
| `generate_video` | + `mode`, `duration`, `first_frame_image`, `last_frame_image`, `reference_image_paths` |
| `generate_audio_speech` | `vendor`, `model_name`, `texts`, `voice_id`, `filename` |
| `generate_audio_music` | `vendor`, `model_id`, `prompt`, `lyrics`, `mode`, `filename` |

`src/tools.test.ts` 拿 `docs/mcp-tools.md` 当基准，逐条比对名字和入参 ——
应用升级后重跑提取脚本，这些测试就会告诉我们接口面变了没有。

## 跑起来

```bash
bun install
bun test               # schema 对齐
bun scripts/smoke.ts   # stdio 握手 + 真调工具（需要 gateway 在跑）
```

opencode 那边由 [`scripts/run-agent.sh`](../scripts/run-agent.sh) 拉起，
不用手动启动。

## 三处从官方规格里学到的细节

**一、`vendor_params` 才是 `aspect_ratio` / `resolution` 的落点。**

官方 `generate_image` 的顶层参数里**没有** aspect_ratio ——
「Vendor-specific knobs (aspect_ratio, resolution, multi-image references, etc.)
go in `vendor_params` as a flat key-value map」。把它提到顶层的话，agent 按
契约填进 `vendor_params` 的比例就再也传不进来了。

**二、语音那个字段叫 `model_name`，不是 `model_id`。**

官方自己就不一致。跟着它 —— 我们统一成一个名字的话，agent 填的那个会落空。

**三、`vendor` / `model_id` 收下但不参与决策。**

用哪个模型由 gateway 的配置决定。但官方 schema 里 `vendor` 是必填枚举，
agent 一定会填；收下比让它撞上"未知字段"要好。

## 两条纪律

**stdout 是 MCP 协议通道，绝对不能往里写东西。** 一行 `console.log` 就会
破坏协议帧。诊断走 stderr + 文件（`OVMCP_LOG`，默认
`/tmp/ovaijisuandesign-mcp.log`）—— 官方只写 stderr，而 opencode 不落盘、
应用日志里也看不到，排查工具层成败时唯一的地面真相却看不见。

**没实现的工具不注册空壳。** 注册了但返回"未实现"的话，agent 会把它当成
一次失败的调用去重试；不注册，agent 至少能看到工具不存在而换条路。

## 还没做的 95 个

按"链路能不能跑"排在后面。ComfyUI 那 10 个和插件那 6 个可以最后，
甚至不做 —— 但那样要同步删掉 agent 配置里对应的路由段，
见 [`agent/README.md`](../agent/README.md)。
