# 文件 / 资产 / 静态文件：接口契约

官方 3.0.16 gateway 核心子集的请求 / 响应形状。行号指官方 `gateway/dist/main.js`
（本机该文件前 24 行是第三方注入的 prologue，行号已按原文件计）。
新 gateway（`app/gateway`）照这份实现。

## 和直觉不符、容易写错的几点

1. 上传是 `POST /api/upload`（不是 `/api/files/upload`），另有 `/api/upload/commit`、`/commit/abort`、`/commit/finalize`、`/api/upload/staging/delete`。
2. 文本内容是 `GET` / `PUT /api/files/content`，没有 POST。
3. `/api/thumbnail/{*filepath}` 只处理视频和音频（ffmpeg，固定 jpeg，没有 `h`/`format`）。图片缩略图走 `/files/...?w=`（sharp）。
4. 没有 rescan，对应的是 `POST /api/assets/reconcile`。
5. **`/ws` 广播直接发 EventBus 的 payload，没有 `{event, data}` 包装**，payload 自带 `type` 字段。
6. undo 窗口过期后没有从撤销栈移除条目：10 秒后撤销返回 `errorType:"expired"`。

## 通用约定

- 全局 `ValidationPipe({whitelist:true, transform:true, forbidNonWhitelisted:true})`：多余字段 400，`message` 是字符串数组。
- 错误体：Nest 默认 `{statusCode, message, error}`。
- JSON body 默认 100kb；`/api/files/content` 放宽到 256MB。
- Multer：`memoryStorage()`，单文件 500MB；字段限制 `{fieldNestingDepth:8, fieldArrayIndexLimit:1000, fields:64, files:1, parts:65, fieldNameSize:256}`。
- workspace 身份守卫只在设了 `HILO_WORKSPACE_CLAIM` 时校验。
- 批量上限 `MAX_BATCH_PATHS = 100`。

## WorkspacePathService

- `baseDir` = `path.resolve(workspaceDir ?? outputDir ?? "./output_files")`；`isWorkspaceLocked` = 是否配置了 workspaceDir；锁定时换目录请求回 400 `Workspace override rejected: gateway is locked to <dir>`。
- `safeResolve(rel)`：`resolve(baseDir, rel)`，`relative(baseDir, resolved)` 以 `..` 开头或是绝对路径 → 400 `Path traversal detected: <rel>`（副作用：以 `..` 开头的文件名也被拦）；空串解析为 baseDir。FilesService 包装后异常统一 400 `"Path traversal detected"`。
- `toPosixRelative`：绝对路径转相对并把 `\` 换成 `/`。`safeResolveAllowAbsolute`：绝对路径直接放行。
- `.hilo` 子目录：`.thumbnails`（视频/音频）、`.thumbnails/img`（图片）、`.tmp/uploads`、`trash`、`canvas.json`、`texts`、`tables`。
- `.hilo` 读写白名单（`assertReadableHiloPath`）：`.hilo/` 开头的路径只放行 `^\.hilo\/tables\/[A-Za-z0-9_-]+\.htable$` 和 `^\.hilo\/texts\/[^\\/]+\.md$`，其余 403 `Access to .hilo/ is restricted; only .hilo/tables/<id>.htable and .hilo/texts/<name>.md are allowed (got: <p>)`。

## 路由

### GET /api/workspace
`{dir: baseDir}`。`POST /api/workspace` 空操作回 `{ok:true, dir}`。

### GET /api/assets
- query：`include`（逗号分隔、不区分大小写，只认 `metadata`）、`path`（可选，trim）。
- 有 `path`：`{assets:[asset]}` 或 `{assets:[]}`。
- 无 `path`：`{assets:[...]}`，`SELECT * FROM assets WHERE soft_deleted_at IS NULL ORDER BY path`（含 missing 行）。
- 不带 `include=metadata` 时删掉每条的 `metadata`。
- AssetInfo 字段见 `app/packages/protocol/src/asset.ts`。
- `GET /api/assets/{*folder}`：参数里 `,` 换成 `/`，返回 path 以 `folder/` 开头的资产，**直接是数组**，不带 metadata。

### GET /api/assets/changes
- query：`workspace_id` 必填（缺失 400 `workspace_id query parameter is required`；绝对目录会哈希成 `ws_`+sha256 前 16 hex）；`event_epoch`、`after_seq`（默认 0）、`to_seq`（默认当前 seq，截到不超过当前）、`limit`（默认 100，[1,500]）。
- 返回 `{workspace_id, event_epoch, after_seq, to_seq, seq_end, limit, has_gap, has_more, events}`。
- `has_gap`（此时 `events=[]`，客户端应全量重拉）：epoch 不一致；或 `after_seq>0 && after_seq+1 < oldestSeq`（环形日志每 workspace 500 条）。
- epoch 是进程启动时的 `randomUUID()`；seq 按 workspace 从 1 自增。

### PATCH /api/assets/:id/metadata
- body `{patch: object}`。id 空 400 `asset id path param is required`；不存在 404 `Asset not found: <id>`（按 id 查，不过滤软删除）。
- 浅合并：`null` 删 key，其它覆盖，嵌套对象整体替换。
- 返回 `{ok:true, metadata}`；事件 `assets:changed` `{id, change:"updated", asset, path}`。

### 删除与撤销
**POST /api/files/delete**：body `{paths: string[]}`（非空，≤100）。整批进 MutationQueue（按 workspace 串行，单任务超时 5500ms）。逐个：`safeResolve` → 建 `.hilo/trash/<uuid>/` → `UPDATE assets SET soft_deleted_at=now WHERE path=?` → 文件 rename 进 `.hilo/trash/<uuid>/<basename>` → 写 `.hilo-meta.json` `{originalPath, uuid, deletedAt}` → 10 秒后 promote。ENOENT 静默跳过；其它错误直接抛，已删的不回滚。单个压栈 `{type:"delete", uuid, originalPath}`，多个 `{type:"batch", ops}`，栈深 10。返回 `{ok:true}`。
- promote：`DELETE FROM assets WHERE soft_deleted_at <= now-9000`；文件经 `POST ${HILO_MAIN_BRIDGE_URL}/__main/trash`（`Authorization: Bearer <token>`，body `{path}`）进系统回收站；没有 bridge 时开发环境 `rm`、生产环境报错；最后 `rm -rf` entry 目录。启动和关闭时各扫一次 `.hilo/trash/*`。
- 删除 / 硬删除 / 恢复都**不发** `assets:changed`（前端乐观更新）。

**POST /api/operations/undo**：无 body。空栈 200 `{ok:false, errorType:"empty-stack"}`。撤销 delete：清定时器、`soft_deleted_at=NULL`、文件 rename 回原位、删 entry 目录。错误分类 ENOENT→`expired`、EEXIST→`path-conflict`、其它→`unknown`。全部 200：成功 `{ok:true, restored:[绝对路径]}`；失败 `{ok:false, errorType, errorMessage, failed?:[{path,reason}]}`；部分 `{ok:false, errorType:"partial", restored, failed}`。

### POST /api/assets/reconcile
返回 status 之一：`skipped-locked`、`skipped-scale`（budget 50000）、`aborted`（`missing-ratio-exceeded`，阈值 0.5）、`completed`（`walked, unchanged, dirty, orphan_initial, missing_initial, rebound, enrolled, evicted, marked_missing, candidates_set, dirty_changed, dirty_touched, duration_ms`）。结束发一条 `assets:changed_batch`。
同组：`POST /api/assets/:id/merge-candidate` `{candidateId}`、`/remove-missing`、`/locate` `{newPath}`，成功 `{ok:true}`。

### POST /api/upload
- multipart，字段 `file`；body `folder`、`useDefaultDir`、`staging`（字符串，只有 `"true"` 生效）。缺 file 实际是 500（TypeError）。
- 目标目录：`staging && !folder && !useDefaultDir` → `.hilo/.tmp/uploads/<uuid>/`；有 `folder` → `safeResolve(folder)`；`useDefaultDir` → defaultBaseDir；**默认工作区根目录，不按类型分子目录**。
- 文件名：multer 的 latin1 名解码成 utf8 → `.replace(/[/\\:\0]/g,"_").replace(/^\.+/,"_")`；`wx` 独占写，重名依次 `name(1).ext` … `name(1000).ext`，再不行 `name_<Date.now()>.ext`。
- 非暂存且扩展名在媒体表里才入库：探测宽高时长 → `ensureEnrolled(abs, {metadata:{model:"user_uploaded"}})`。
- 返回 `{ok:true, path, relative, id?, width?, height?, durationMs?, enrollError?, staged?:true}`；新插入发 `assets:changed` `{id, change:"created", asset, path}`。

### POST /api/files/import-url
- body `{urls: string[]}`（非空，≤100）。串行，每个 URL 的错误进 `errors`，HTTP 始终 200。
- 返回 `{ok:true, imported:[{url, id, path, type, width?, height?, durationMs?}], errors?:[{url, error}]}`（没错误时不带 errors）。
- SSRF：只允许 http/https；IP 或 DNS 结果落在 v4 `0/8 127/8 10/8 172.16-31 192.168/16 169.254/16`、v6 `::1 :: fc/fd fe80-febf` 及 v4 映射时拒绝，error `SSRF policy rejected URL (<reason>): <detail>`，reason ∈ `invalid-url scheme-not-allowed private-address dns-lookup-failed`。
- `deriveImportTarget`：pathname 去尾 `/` 取 basename；扩展名要求 `dotIdx>0` 且不在末尾；stem `decodeURIComponent` 后 `sanitizeFileName(stem, 60)`；扩展名小写；缺失部分用 `download-<ms>`。子目录按 `detectFileType`：`images/ videos/ audios/ texts/ files/`。
- `sanitizeFileName(seed, max=12)`：`[\\/:*?"<>|\x00-\x1f]` 换空格 → 连续空白压一个、trim → 去开头 `.` 再 trim → 按码点截到 max 后 trim。
- 去重：`getByPath(relPath)` 已有记录就直接返回，不下载（磁盘有同名但未入库的会被覆盖）。
- 下载超时：视频 120s、音频 60s、图片 30s、其它 60s。网络失败 `fetch failed (<msg>[: cause])`；非 2xx `HTTP <status> <statusText>`。
- 入库 metadata `{model:"imported", width?, height?, duration(秒)?}`；被拒 `Failed to enroll downloaded file <rel>: <reason>`。

### GET / PUT /api/files/content
- GET：`path` 必填（400 `path query parameter is required`）→ `.hilo` 白名单 → `safeResolve` → utf8 读；读失败 404 `File not found: <path>`；返回 `{content}`。
- PUT：`{path: 非空, content: string, unique?: boolean}`；`mkdir -p`；`unique` 时 `wx` 写，重名 `"<stem> 2<ext>"`（中间空格）…到 100，超过 400 `Too many existing files for <p>`；否则覆盖。非 `.hilo` 路径：已有行取 id，否则扩展名可识别时入库；`unique` 且有 assetId 时建文本初始版本。返回 `{ok:true, assetId?, path, enrollError?}`。
- `POST /api/files/text-asset` `{content}`：根目录新建 `<stem>.md`，stem 是首行 `sanitizeFileName(..., 12)`，空则 `text-YYYYMMDD-HHMMSS`；重名 `-2` `-3`… 到 100；返回 `{ok:true, assetId, path}`。

### GET /api/thumbnail/{*filepath}
- 路径 `decodeURIComponent`（失败 400 `Malformed URL encoding`）；`w` 限制 [1,2048]；`force=1` 强制重新生成。
- `safeResolve` 失败 400；ENOENT 404 `File not found`；非视频/音频 400 `Unsupported file type for thumbnail: <ext>`。
- 缓存 `.hilo/.thumbnails/`，文件名 `md5(rel + (w ? ":w"+w : "") + ":" + mtimeMs + (video ? ":p2" : ""))` 前 12 hex + `.jpg`；同文件并发合并。
- 信号量并发 2（上限 4），队列 32（上限 128），等待 30s；忙时 503 + `Retry-After: 2`，`{statusCode:503, message:"Thumbnail generation is busy, please retry"}`。
- 视频：`-y -ss <seek> -i f -vframes 1 [-vf scale=w:-1] -q:v 2`，超时 15s；seek = 时长 10%，限制 [0.1,10] 且不超过一半，拿不到时长用 0.1。
- 音频：`showwavespic=s=${w??320}x${round(w*180/320)}:colors=#8b5cf6`。
- 失败回共享占位 `_placeholder.jpg`（320x180，#1a1a1a），占位也失败 404 `Failed to generate thumbnail`。`Content-Type: image/jpeg`，`sendFile`。

### StaticController（`@Controller("files")`）
- `GET /files/id/:assetId`：`assets.resolve(id)`；查不到 / stat 失败 / 不是文件 → **404 空响应体**。query：`w`、`thumbnail_fallback`、`thumbnail_format`、`panorama_preview`。
- `GET /files/{*path}`：`decodeURIComponent`（失败 400 `Malformed URL encoding`）→ `safeResolve`（失败 400 `Invalid path`）→ 同上。
- Range / 缓存头全交给 `res.sendFile(p, {dotfiles:"allow"})`：Range（206/416）、`Accept-Ranges`、弱 ETag、Last-Modified、304、`Cache-Control: public, max-age=0`、按扩展名 MIME。
- `w`（只对图片）：限制 [16,2048]，向上取桶 `[64,128,256,512,1024,2048]`；sharp 生成，缓存 `.hilo/.thumbnails/img/`，文件名 `md5("image-v2-width-buckets-format:"+rel+":"+mtime+":"+bucket+":"+format)` 前 12 hex；`thumbnail_format=webp` 时 `.webp`，否则跟随源格式。`thumbnail_fallback=error` 时忙 503，默认忙或失败回落原图（HEIC 例外）。视频 / 音频带 `w` 直接回原文件。
- HEIC 不带 `w`：转 JPEG 发送，失败回落原文件。

### Health
`/api/health`、`/api/health/live`、`/api/health/ready` 都是 terminus `check([])`，永远 200，body `{"status":"ok","info":{},"error":{},"details":{}}`；`live` 在 `GATEWAY_NONCE` 非空时加 `X-Gateway-Nonce`。

## GatewayEventBus

- `assets:changed`：producer 传 `{id, change, asset?, path?, old_path?, status?}`，盖戳成 `{..., workspace_id, type:"asset_changed", event_epoch, seq}`。change ∈ `created updated removed renamed status-changed`。
- `assets:changed_batch`：`{type:"assets_changed_batch", workspace_id, event_epoch, seq_start, seq_end, events}`，空数组不发。
- 每条事件写进环形日志，供 `/api/assets/changes` 回放。
- 转发到 `/ws` 的：`canvas:updated canvas:focus canvas:node-generating canvas-tags:registry-changed assets:changed assets:changed_batch dependencies:changed dirs:changed plugin-* document-edit:result skills:reload memory:changed plan:changed sessions:changed`。

## /ws

- 鉴权只在设了 `HILO_WORKSPACE_CLAIM` 时：query `hilo_workspace` 等 → 不符 `close(1008, "Workspace identity mismatch")`。
- 出站：对所有 OPEN 客户端发 `JSON.stringify(payload)`，**没有包装**。
- 入站：按 `data.type` 分发；`{"type":"ping"}` 只给发送方回 `{"type":"pong"}`；服务端不主动心跳；JSON 解析失败回 `{type:"error", content:"Invalid JSON", error:{error_code:"GATEWAY_BAD_REQUEST", user_message:"Invalid JSON", retryable:false}}`。

## 入库（ensureEnrolled）

路径必须绝对，否则 `rejected`；边界校验 → xxh3 指纹 + mime → `INSERT OR IGNORE`。新插入发 created，没有预探测时异步 ffprobe 后再发 updated；已存在时有 metadata 就 merge、有预探测就写宽高时长列，发 updated。生成结果入库（`recordAsset`）把 prompt、model、description、params、backend、model_id、source_tool、session_id、turn_id、各 task id、reference_images 放进 metadata。
