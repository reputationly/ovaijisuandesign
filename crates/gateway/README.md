# gateway

本地 gateway。最终要替掉官方那个（423 条路由），**现在只实现生成那几条**。

## 已实现

```text
GET  /api/health/live
POST /api/generate/image/submit
GET  /api/generate/tasks/{task_id}/query
*    其余全部反代给 upstream
```

**反代是关键**：调用方（画布前端、MCP server、将来的官方 mcp-tools）
只认这一个地址，我们实现一条路由就接管一条，剩下的照旧走官方。
没配 `upstream` 时如实回 404 —— 反代到一个猜出来的地址会让"路由没实现"
表现成别的错误。

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

## 已知缺口：WebSocket 转不了

反代用的是 reqwest，**转发不了 WebSocket 的 Upgrade 握手**。所以 `/ws`
（画布的实时事件）目前由 `canvas-web` 直连官方 gateway，见
`apps/canvas-web/vite.config.ts`。

接过来只会让实时事件**安静地不工作** —— 不报错，界面上就是"永远没有事件"。
第 6 步自己实现事件推送时一起解决；在那之前不要把 `/ws` 指到这里。

## health 必须回 JSON 对象

官方 mcp-tools 的探活用 `z.object({}).passthrough()` 校验，而且**探不通会
FATAL 退出**。回纯文本 `ok` 的话，将来把官方 mcp-tools 接过来会直接起不来。
所以 `/api/health/live` 回的是 `{ok, service, version}`。

`version` 不只是好看：升级流程靠它确认新版真的起来了，本地同时跑两个
gateway 时也靠它分辨连的是哪一个。

## 落盘

平台返回的是公网 URL，而调用方要的是**工作区相对路径**（官方契约就是
`result: { ok, path, width?, height? }`）。中间那一步（下载、按类型归档、
去重、登记成资产）目前借上游的 `POST /api/files/import-url`，实现在
`land.rs`，等自己的资产库写完换掉那个文件即可，对外契约不变。

`import-url` 有个坑：**每个 URL 失败时它也回 200**（源码注释原文
"returns 200 even if every URL failed"），失败落在 `errors[]`。
只看 HTTP 状态会把失败当成功，然后交给调用方一个空路径。

## 两个 HTTP 客户端

- `client` 打自建平台，走公网，**尊重系统代理**
- `local` 打上游 gateway，**必须 `.no_proxy()`**

macOS 打开系统 HTTP 代理后，reqwest 会把发往 `127.0.0.1` 的请求也交给代理，
被吞成一个空的 503（响应头带 `proxy-connection: close`）。症状是"官方明明
在跑，反代却全挂"，很难往代理上想 —— 踩过一次。

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
