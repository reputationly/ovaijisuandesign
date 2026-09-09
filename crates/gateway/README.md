# gateway

本地 gateway。**画布 / 资产 / 文件 / 生成 / 事件已经全部自己实现，
不需要官方应用了。**

## 已实现

```text
GET  /api/health/live                    带版本号
GET  /api/workspace                      工作区目录
GET  /api/assets                         资产列表
GET  /files/id/{assetId}?w=              字节流 / 实时缩略
GET  /files/{*path}                      同上，按路径
POST /api/files/import-url               公网 URL → 收进工作区 → 登记
GET  /api/canvas                         整份画布
POST /api/canvas                         整份写回
GET  /api/canvas/nodes                   节点清单
POST /api/canvas/nodes/detail            节点详情（含文本内容与哈希）
POST /api/canvas/media-node              媒体文件上画布
POST /api/canvas/text-node               建 / 改文本节点
GET  /ws                                 事件推送
POST /api/generate/image/submit          出图
GET  /api/generate/tasks/{task_id}/query 轮询
*    其余反代给 upstream（没配就如实回 404）
```

反代还留着：官方那 423 条里我们只实现了用得上的这些。想临时借官方的某条
路由，把 `upstream` 指过去即可 —— **实现一条就接管一条，调用方始终只认
这一个地址**。默认不配，那时未实现的路由如实回 404，而不是悄悄连去别处。

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

## 事件推送

`GET /ws`，帧是 `{"event": …, "data": …}`（和官方 Nest `WsAdapter` 一样，
前端 `connectEvents()` 就是按这个解的）。

**自己实现而不是反代** —— reqwest 转不了 WebSocket 的 Upgrade 握手，
这也是它之前只能让前端直连官方的原因。

订阅者跟不上时丢最旧的，不断开连接：事件是提示不是账本，断开会让前端
以为服务挂了。

## health 必须回 JSON 对象

官方 mcp-tools 的探活用 `z.object({}).passthrough()` 校验，而且**探不通会
FATAL 退出**。回纯文本 `ok` 的话，将来把官方 mcp-tools 接过来会直接起不来。
所以 `/api/health/live` 回的是 `{ok, service, version}`。

`version` 不只是好看：升级流程靠它确认新版真的起来了，本地同时跑两个
gateway 时也靠它分辨连的是哪一个。

## 资产库：刻意做得比官方浅

官方那套是 SQLite + 11 个 migration：xxh3 指纹、inode/dev 追踪、
birthtime 防碰撞、文件移动后重绑、丢失资产的候选匹配。我们只用一个原子写的
JSON 索引（`.hilo/assets.json`），因为真正需要的只有"路径 ⇄ 稳定 id + 尺寸"。

**代价说清楚**：官方那套能扛住"用户在 Finder 里把文件挪了"，我们不能 ——
挪了就当新资产，旧的成为悬空引用。等真遇到再补，不要提前造。

**兼容边界**：文件布局（`images/` `videos/` `audios/` `texts/` `files/`）和
`canvas.json` 与官方完全一致，索引各自建。同一个工作区两边都能打开，
只是各自认各自的 assetId —— 官方本来每次启动也会 reconcile 重建索引。

## 落盘

平台返回的是公网 URL，调用方要的是**工作区相对路径**（官方契约是
`result: { ok, path, width?, height? }`）。`land.rs` 直接进程内调
`api_files::import_one`，和 `POST /api/files/import-url` 是同一段代码 ——
不自己给自己发一次 HTTP。

文件名从 URL 的**路径**取，不能带查询串：平台返回的直链后面跟着一长串
`AccessKeyId` / `Signature`，连进文件名会让扩展名判错，进而归错目录。

`import-url` 的契约照抄官方：**每个 URL 失败也回 200**，失败落在 `errors[]`。
一批里有成功有失败时，成功的那些不该被整体退回。

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

## 画布写入的三道闸

`canvas.json` 是用户的画布本身，写坏了没有第二份。

**一、每一层都留 `extra`。** 文件里有大量我们不解释的字段 ——
`data.popoverDraft` 存着"重新生成"要用的 prompt / modelId / 歌词，还有
`meta` / `round` / `groupId`。用严格结构体反序列化再序列化回去，这些会被
**静默抹掉，而且校验能过**。

同一个道理踩过一次：`assetId` 忘了写 `#[serde(rename)]`，它落进 `extra`，
round-trip 照样对，但 `asset_id` 字段永远是 `None` —— 所有按资产查节点的
逻辑静默失效。现在有测试钉住。

**二、结构校验。** 节点 id 不空不重复；边的两端必须存在 ——
悬空的边会让 React Flow 抛错，整张画布白屏。

**三、破坏性写入防护。** 节点数掉到一半以下就拒绝并把快照丢进
`.hilo/quarantine/`。调用方一个 bug 就能清空画布，而那份数据**结构完全
合法**，校验拦不住。

闸不能太紧：官方那次事故就是 144 → 143 被连续拒了三天。所以只拦"掉一半
以上"，而且只有一个节点时删掉它照常放行。

## 还没做的

官方那 423 条里其余的：分组、搜索、文本版本、依赖图、插件存储、
其余三个模态的生成路由。用得上再补，`upstream` 可以临时借。
