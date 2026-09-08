# gateway

本地 gateway。最终要替掉官方那个（423 条路由），**现在只实现生成那几条**。

## 已实现

```text
GET  /api/health/live
POST /api/generate/image/submit
GET  /api/generate/tasks/{task_id}/query
```

路由形状按官方对齐（见 [`docs/gateway-api.md`](../../docs/gateway-api.md)），
这样两边可以互换着验：我们的前端能接官方 gateway，官方的 mcp-tools 也能接
我们的。

## 跑起来

```bash
cargo run -p gateway          # 或 ./target/release/ovgw
```

首次启动会在
`~/Library/Application Support/ovaijisuandesign/config.json`
写一份模板然后退出。填 `platform.api_key` 再启动 —— **没有登录流程，
key 就是唯一凭据**。

```jsonc
{
  "port": 8100,
  "platform": {
    "base_url": "https://maas.ovaijisuan.com/v1",
    "api_key": "sk-…",
    "chat_model": "qwen3.8-27b"     // 写 caption / 歌词用
  },
  "models": {
    "image": "qwen-image",
    "image_edit": "qwen-image-edit"
    // 其余模态的模型，等对应路由实现了再填
  }
}
```

`OVGW_CONFIG` 可以覆盖配置路径。

## 三个刻意的设计

**一、提交阶段永远不回 4xx。**

调用方（mcp-tools / 画布）把提交失败当**硬错误**，而画布上更希望看到一个
带原因的失败节点。所以请求体解不出来也照常铸 task_id，让失败带着原因在轮询
时回去。

代价是 `Json<T>` 提取器不能用（它对畸形 body 直接 400），得自己读 `Bytes`
宽松解析。

**二、`/query` 后缀不能省。**

漏了会 404，而**调用方对非 2xx 的查询不写任何日志** —— 表现是画布上一个
没有原因的失败节点。这个坑在 DesignPlusPlus 时期踩过一次，现在有测试钉住
字面量。

**三、失败时 `error_code` 只用枚举内的值。**

官方的 `GenerateErrorCode` 是个枚举，自定义字符串会让调用方的 zod 解析失败 ——
于是连 `message` 都传不回去，画布上就成了一个没有原因的失败节点。所以统一
报 `backend_error`，真正的码放在不参与解析的 `detail_code` 里。

## 任务表

自己铸 id 是因为**平台侧图片是同步的、视频音频是另一套 id**，而调用方统一
按"提交拿 id → 轮询"用。

终态任务保留 30 分钟后淘汰。没有这个上限的话这张表在长会话里只增不减 ——
调用方拿到终态就不再轮询了，那条记录再也不会被访问。**在途任务永不淘汰**，
把它们扫掉会表现成"生成到一半任务消失了"。

## 还没做的

资产库、画布持久化、文件服务、其余三个模态的生成路由。当前这些仍由官方
gateway 提供，前端同时连两个（Vite 按 `/api/generate` 前缀分流）。

顺序见仓库 README 的路线 —— gateway 补齐是**最后一步**，因为那时可以拿官方
mcp-tools 当测试客户端，逐条路由对着验。
