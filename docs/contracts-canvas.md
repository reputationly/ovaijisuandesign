# 画布：接口契约

官方 3.0.16 gateway 画布模块（CanvasController 26 条 + mcp-tools 用到的 check-text）的请求 / 响应形状与内部行为。
行号指官方 `gateway/dist/main.js`。新 gateway（`app/gateway/src/canvas`）照这份实现。

## 容易写错的几点

1. **文本节点的 `.md` 不在 `texts/`**：MCP 新建的放在工作区根目录，文件名取 `name`（去掉原扩展名再加 `.md`，空名 `untitled.md`），重名 `name(1).md`、`name(2).md`…。`.hilo/texts/` 只是旧路径。
2. **shrink guard 两层**：任何规模下只要有节点或边消失就必须有删除证据；再加 "≥10 且剩下不到一半" 的 high-blast 确认，节点和边分别判断。
3. **只有 text-node 更新回 409**；apply-edits 的 hash 不一致回成功状态码，body `status:"conflict"`、reason `version_changed`。
4. **文本更新和表格替换不写 canvas.json**，只广播带 `textRevision` / `tableRevision` 的 updatedNodes。
5. `POST /placeholder` 找不到 source 回 400；`POST /generation/reconcile` 是空实现。
6. **POST 默认 201**（Nest 默认）。例外：`split-sub-images` 200；`selection`、`text-edit-state`、`placeholder/fail`、`placeholder/cleanup` 204。

## 0. 全局约定

- 全局 ValidationPipe（whitelist + forbidNonWhitelisted），多余字段 400。`/api/canvas` JSON 上限 16mb；`/api/safety` 默认 100kb。
- `SESSION_ID_HEADER = "x-session-id"`。`PositionDto {x:IsInt, y:IsInt}`。
- 节点类型 `image|video|audio|text|file|placeholder|table|group|sticker`（前 5 种由资产支撑）；模式 `freeform|workflow`。
- id：新节点 `randomUUID()`；group `"group-"+uuid`；边 `` `${source}->${target}` ``；旧格式 `asset~clone` 由 `parseNodeId` 解析。
- 派生边 `addDerivationEdges`：`{id:"src->tgt", source, target, type:"derivation", data:{time:ISO}}`；自环、重复 source、不存在的 source、已存在的同 id 边跳过；placeholder 的边 data 里额外带 `prompt`、`model`。
- 节点 assetId：`node.assetId ?? data.assetId ?? parseNodeId(id).assetId`。
- `buildAssetIndex`：assetId → nodeId，跳过 `meta.cloneOf` 非空的克隆，重复时后者覆盖。

## 1. 持久化

### 1.1 读取
- 路径 `<baseDir>/.hilo/canvas.json`；schema 见 `app/packages/protocol/src/canvas.ts`；空画布 `{version:1, mode:"workflow", nodes:[], edges:[]}`。
- 缓存按 `{mtimeMs,size}` 失效，并发冷加载共用一个 promise。ENOENT → 空画布；其他读错误抛 `Canvas load failed ... Refusing to fall back to empty canvas`；JSON 解析失败抛 `Canvas parse failed for <path>: ... Refusing to fall back to empty canvas to prevent overwriting existing data.`（都清缓存、都**不**回退空画布）。
- 冷加载管线：positions 只保留 `freeform`/`workflow` 且 x、y 有限 → normalize → 旧 id 迁移成 uuid（`empty-` 前缀、含 `~`、缺 assetId、`assetId===id`；`~clone` 转 `meta.cloneOf`；reason `node-id-migration`，记旧→新别名）→ 若干旧数据修复 → 过期 placeholder 清扫（1.8）→ 清理卡在 loading 的槽位 → status_unknown 自愈 → 尺寸清扫 → 有改动才写盘。

### 1.2 原子写
`atomicWriteJson(p,d)` = `atomicWriteFile(p, JSON.stringify(d,null,2))`（末尾无换行）。临时文件同目录 `.tmp-${uuid8}` → writeFile → `fd.sync()` → rename（仅 EBUSY/EPERM/EACCES 重试，间隔 80/200/500/1000ms）→ 尽力 fsync 目录（EISDIR/EINVAL/ENOSYS/ENOTSUP/EOPNOTSUPP 与 win32 EPERM 忽略）→ 失败 unlink 临时文件再抛。备份用 durable copy（`.tmp-copy-${uuid}`，`wx`，0600）。

### 1.3 写入校验
依次：校验 → shrink guard → `mkdir -p` → 原子写。拒绝：zod 不过（最多列 5 条）、节点 id 重复、两个 text 节点共用 assetId、边 id 重复或端点不存在、parentId 悬空（上一版已存在且位置没变的放行）、parent 链成环。快照进隔离区后 409 `{statusCode:409, error:"Conflict", code:"CANVAS_INVALID_SAVE_REJECTED", message:"Canvas save was rejected because the graph snapshot is structurally invalid."}`。
`repairAliasedOriginNodes`：多个非克隆节点共用 assetId 时选一个 origin（优先 `meta.hidden!==true`），其余标 `meta.cloneOf`；text 节点不修复，交给校验拒绝。

### 1.4 Shrink guard
- 基线：缓存或冷加载时的上一版；没有就读盘（盘上文件坏了先备份一份 `corrupt` 再放行）。
- **第一层**：新快照里消失的节点 / 边 id 为空就放行；否则必须有 `deletionIntent{operationId 非空, removedNodeIds, removedEdgeIds}`（渲染端）或 `systemMutationIntent{operationId, reason, removedNodeIds, removedEdgeIds, allowHighBlast}`（内部）覆盖所有消失项（端点落在被删节点上的边自动算授权），否则拒绝 `missing_deletion_evidence`。
- **第二层**：`cur>=10 && inc<cur*0.5`，节点和边分别判断；需要 `deletionIntent.highBlastConfirmed===true`，或 `allowHighBlast===true` 且 reason ∈ `timeline-migration explicit-node-delete node-id-migration group-reconciliation reference-materialization placeholder-cleanup`；否则拒绝 `high_blast_confirmation_required`。有确认时写前先做安全备份。
- 安全备份：`.hilo/canvas-backups/canvas-${ISO(: 和 . 换成 -)}-${uuid8}-nodes${cur}-edges${curEdges}.json`，durable copy；按文件名排序删最旧，最多 10 个 / 100MB，本次这份不删；备份失败抛 `Canvas safety backup failed`，写入被阻止。
- 被拒快照：`canvas-backups/rejected/rejected-canvas-${stamp}-${uuid8}-nodes${inc}-from${cur}.json`，最多 5 个 / 50MB，尽力而为；超过 24h 的 `.tmp-copy-*`、`.tmp-canvas-backup-*` 清理。
- 409：渲染端保存 `{statusCode:409, error:"Conflict", code:"CANVAS_DESTRUCTIVE_SAVE_REJECTED", reason, message:"Canvas save was rejected because graph elements disappeared without an authorized deletion operation.", currentNodeCount, incomingNodeCount}`；内部路径 message 为 `"Canvas mutation was blocked because its deletion proof was incomplete."`。

### 1.5 persistCanvas（调用方持有 canvasLock）
规范化 positions → normalize → `repairAliasedOriginNodes`（规范化删掉的 id 并入 systemMutationIntent，默认 reason `storage-migration`）。
`stableCanvasHash`：key 递归排序后 `JSON.stringify`，逐 UTF-16 code unit 做 FNV-1a 32（offset 2166136261，prime 16777619，`Math.imul`），8 位 hex；等于上次写盘的 hash 就跳过。写后更新缓存与指纹、`canvasDetailGen++`、清 nodeDetail memo。
写入模式：`{kind:"non-destructive"}`；有删除时 `{kind:"semantic", intent:{operationId:uuid, reason, removedNodeIds, removedEdgeIds, allowHighBlast:true}}`。

### 1.6 锁
AsyncMutex（promise 链 `chain.then(fn,fn)`，一次失败不堵后面）。canvasLock 全局唯一、不可重入，所有读-改-写走它。NodeWriteLockRegistry：每节点一把锁保护 `.md`/`.htable` 读-改-写，节点删除后 drop。CanvasWriterFence：渲染端整画布替换时 `revision<=highestPersisted || revision<=highestSeen` 回 `{superseded:true}` 忽略。

### 1.7 positions 与尺寸
- positions 的 key 只能是 `workflow`/`freeform`。`addNodeByAsset` 和 table 新建固定写 `positions:{workflow:pos}`；placeholder 和物化引用节点写 `positions:{[canvas.mode]:pos}`。
- 有效尺寸 `sizes?.[mode] ?? size ?? fallback ?? defaultNodeSizeForType(type)`；placeholder 尺寸每次现算。
- 默认尺寸：image 350×350、text 350×500、table 350×200、file card 350×76、file preview 820×480（最小 320×200）、audio 350×150、空 video 350×280、sticker 56×56。
- `computeNodeSize(w,h)`：缺失或 ≤0 → undefined；否则 `scale=min(350/w,350/h)`，每边 `max(100, round(边*scale))`。
- `placeholderNodeSize(status,ratio,mediaType)`：非错误态 audio 350×150、有合法 ratio 用 `computeNodeSize`、image/video 350×350；其余宽 350，高 pending/queue_paused 188、generating（及未知）248、error/recoverable_error/status_unknown 216。
- 子节点 position 相对父节点，绝对坐标沿父链累加。group 内边距 `{x:24, top:48, bottom:24}`。

### 1.8 过期 placeholder 清扫（仅冷加载）
`PLACEHOLDER_STALE_MS=30min`，`PLACEHOLDER_ORPHAN_GRACE_MS=2min`。起始时间 `data.createdAt` → 入边 `edge.data.time` → 回填 now。归属来自 `.hilo/active-generations.json` 和 `.hilo/generation-queue.json`（schemaVersion 1，忽略死进程和别的工作区；任一读坏整轮跳过）。generating/pending 有归属保留；本进程首次冷加载时年龄 >2min 改 `status_unknown`（删 retryPayload、error；有 attemptId/cloudTaskId/providerTaskId 时文案 `"Generation state could not be confirmed. The task identifier was preserved. Please contact support before retrying."`，否则 `"Generation interrupted (app restarted)"`）；非首次 >30min 才改。text（generating）、image/video/audio（generating/pending）只按 2min 宽限；`loading` 宽限 10min。有改动写盘并发 `canvas_updated {updatedNodes}`（无 origin）。

### 1.9 contentHash
文本 `sha256(.md 原始 UTF-8 字符串).hex`（64 位小写，不规范化）；读失败按空串算。nodes/detail 的 `textContentHash` 同算法。

### 1.10 事件
- `canvas:updated`：`{type:"canvas_updated", addedNodes?, updatedNodes?, removedNodeIds?, addedEdges?, removedEdgeIds?, nodeIdReplacements?:[{oldNodeId,newNodeId}], origin?}`，空数组的 key 省略；同一 id 不能出现在两处。
- origin：`mcp-write`（text 更新、apply-edits、revert-edits、table 替换）、`user-add`（split-sub-images 等）、`generation-status`（placeholder 失败和 patch）、`reconcile`；其余创建类路径不带 origin。
- `canvas:focus` `{type:"canvas_focus", nodeIds, padding, duration}`；`plugin-storage:changed` `{type:"plugin_storage_changed", nodeId}`；`document-edit:result` `{type:"document_edit_result", ...}`。

### 1.11 放置算法
- `findFreePosition`：被占区域只算无 parentId 且有当前 mode 坐标的节点；新节点默认 350×500；gap 100、行容差 10、碰撞 margin 5、每行最多 8 列、最多试 50 次。空画布 (0,0)；否则按 y 分行，候选是最后一行末尾右边 +100；行满 8 个或行宽超 `w*8+700` 换行（x 取第一行起点，y = 最后一行 y + 该行最高 + 100）；碰撞右移或换行。
- `resolveDerivedOrFreePosition`：有 source 用 `getDerivedNodePositionFromCanvasMulti`，null 时退回 findFreePosition。多 source 间隙 ≤1200 归一簇，取最右簇（比右边缘，平手比下边缘）的外包框当 source。
- `computeDerivedNodePosition`：无同级时放 `(src.x+src.w+100, src.y)`，碰撞优先往下（挡住者底部 +100），往下累计 1200 仍不行改往右；有同级时取最右一列，该列 ≥5 个就新开一列（列最右边缘 +100，y 取列内最小），否则放列内最底节点下方 100；`verticalStacking` 时放完再避碰。

## 2. 路由（前缀 /api/canvas）

### GET /nodes
query `type?`（IsIn）、`limit?`（Int ≥1，默认 50，无上限）、`offset?`（默认 0）。返回 `{count, nodes:[Summary]}`（count 是过滤后分页前）。Summary：`{id, type, name}`（name = `asset.name ?? data.name`，data.name 只对 file）、file 身份字段（`pluginId?` 及相关）、`label?`（group 且非空）、`promptSnippet?`（prompt 或 description，trim，>100 截断加 `…`）。

### POST /nodes/detail
body `nodeIds`（≥1）。返回 `{nodes, missing?}`（去重保序，missing 空时省略）。每节点：`{id, type, name(asset.name ?? data.name ?? basename(data.path)), <file 身份>, prompt?, metadata?, incomingEdges?, outgoingEdges?}`；metadata 只取 `model, model_id, description, voice_id, width, height, duration_ms, fps, reference_images, reference_audios, reference_videos, error_message`（跳过 null）；边元素 `{source,target,type}`；不返回 assetId/position/size。按类型追加：image/video/audio `filePath`（拒绝绝对路径、盘符、http(s)、含 `..`）；text `textContent` + `textContentHash`（读失败都省略）；table `tableContent`；group `childIds`（字典序，最多 50，超出带 `childIdsTotal`）。memo 256 条。

### POST /nodes/delete
body `nodeIds`（≥1）。只处理存在的 id，都不存在回 `{removedNodeIds:[], removedEdgeIds:[]}` 不写盘不广播。被删 group 先解散（子节点转绝对坐标、清 parentId）；图片组主节点提升（边改指向新主节点，产生 addedEdges）；删节点及相连边。semantic 写盘（reason `explicit-node-delete`），释放写锁，**不删资产文件**。事件 `{removedNodeIds, removedEdgeIds?, addedEdges?, updatedNodes?}`（无 origin）。返回 `{removedNodeIds, removedEdgeIds}`。

### POST /focus
body `nodeIds`（≥1）、`padding?`（0..2）、`duration?`（Int 0..5000）。不改 canvas.json；focused 非空时发 `canvas:focus`。返回 `{focused, missing}`。

### POST /text-node
body `content`（必填非空）、`nodeId?`、`name?`、`position?`、`sourceNodeIds?`、`mode?`（replace|append|prepend）、`appendSeparator?`（auto-newline|none）、`expectedContentHash?`、`review?`（auto|suppress）。
- **新建**（无 nodeId）：传 mode 回 400 ``"`mode` is only valid when patching an existing node (provide `nodeId`)."``。资产创建：根目录，先写 `.<base>.tmp-<uuid>` 再 rename，metadata `{description:snippet, source_tool:"hub_canvas_write_node"}`。`addNodeByAsset(extraData:{source_tool:"hub_canvas_write_node", promptSeedSource:"agent"})`：有 source 用派生位置（verticalStacking）否则 findFreePosition；text 节点不写 size；同资产已有主节点时带 `meta.cloneOf`；发 `{addedNodes:[node], addedEdges?}`（无 origin）。返回 `{nodeId, assetId, path, contentLength, created:true}`。
- **更新**：404 `Canvas node not found: ${id}`；400 `Node is not a text node: ${id} (type=${type}). Use canvas_update_text_node only on text nodes.`；404 `Text node has no asset reference: ${id}`；404 `Asset not found for node: ${id}`。节点写锁内读文件（失败按 `""`）算 hash，不等于 `expectedContentHash` 回 **409** `Text node content changed since your last read (current contentHash: <hex>). Re-run canvas_grep_text or canvas_read_text and retry with fresh content.`。append：`existing + sep + content`（none → ""；否则 existing 非空且不以 `\n` 结尾时 `"\n"`）；prepend 对称（看 content 结尾）；replace 覆盖。`review!=="suppress"` 且有变化时先写版本快照（`text_document_versions`，5 分钟合并，错误吞掉）；existing 非空时发 `document-edit:result {requestId:"agent-<uuid>", nodeId, status:"applied", origin:"agent", previousContentHash, contentHash, results, appliedEdits}`。直接 writeFile（非原子），不写 canvas.json。发 `{origin:"mcp-write", updatedNodes:[{...node, data:{...data, textRevision:Date.now()}}]}`。返回 `{nodeId, assetId, contentLength, created:false}`。

### POST /text-node/apply-edits
body `requestId?`、`editSessionId?`、`nodeId`、`expectedContentHash`（非空）、`edits`（1–100，每项 `{annotationId, targetIndex?:int≥0, exact:非空, prefix?, suffix?, occurrence?:int≥0, replacement}`）。无 requestId 时生成 `agent-<uuid>`、origin `"agent"`，有则 origin `"annotation"`。hash 不一致：`{requestId, editSessionId?, nodeId, status:"conflict", origin, previousContentHash, contentHash, results:[{annotationId, targetIndex?, status:"conflict", reason:"version_changed"}]}` 并发 `document-edit:result`。锚点：exact 与 prefix/suffix 紧邻匹配；重复 `annotationId:targetIndex` → `duplicate_id`；多处且无 occurrence → `ambiguous`；occurrence 越界且非唯一 → `not_found`；区间重叠 → `overlap`；任一冲突整批不应用；`not_found`/`ambiguous` 带 `nearest:[{line, occurrence?, sourceExact?, snippet}]`（≤5）。成功：写快照 → atomicWriteFile → 发 `document-edit:result` 和 `canvas_updated`（mcp-write，textRevision）；返回 `{requestId, editSessionId?, nodeId, status:"applied", origin, previousContentHash, contentHash, results, appliedEdits:[{annotationId, targetIndex?, originalText, replacement, newStart, newEnd, startLine(1 起), reversePrefix(32), reverseSuffix(32), reverseOccurrence?}]}`。

### POST /text-node/revert-edits
body `nodeId`、`edits`（1–100，exact 可空）。逐项按 原样 → 只 prefix → 只 suffix → 只 exact 尝试。至少一项成功就 atomicWriteFile 并发 `canvas_updated`（mcp-write），不发 document-edit:result。返回 `{nodeId, status:"applied"|"conflict", contentHash, content, results}`。

### POST /table-node
body `nodeId?`、`title?`、`position?`、`sourceNodeIds?`、`columns?[{title, type?:text|number|attachment, visible?, width?:40–2000}]`、`rows?[{cells}]`、`filter?{match:all|any, conditions:[{columnIndex, op, value?}]}`（op ∈ `equals notEquals contains notContains gt gte lt lte empty notEmpty`）、`rowHeight?`（low|medium|tall|extraTall）。列 `{id:"col_"+8 base36, title, type, width?, visible?:false}`；行 `{id:"row_…", cells:{[colId]:v}}`（null 丢弃，数组只在 attachment 列保留）；无列时默认一列 Text。新建：`.hilo/tables/<base36><base36>.htable`，findFreePosition(350×200)，节点 `{id, type:"table", positions:{workflow}, size:{350,200}, data:{tablePath, title?}}` + 派生边，发 `{addedNodes, addedEdges?}`，返回 `{nodeId, tablePath, columnCount, rowCount, created:true}`。替换：404 / 400 `Node is not a table node: ...` / 404 `Table node has no tablePath` / 400 ``"Replacing a table requires at least one column in `columns`."``；只重写 .htable，发 `{origin:"mcp-write", updatedNodes:[...tableRevision]}`，`created:false`。

### POST /media-node
body `assetPath`（必填）、`position?`、`sourceNodeIds?`、`allowDuplicate?`。未入库 404 `Asset not tracked at "<p>". Import or generate the media into the workspace asset vault first, then retry.`；非 image/video/audio 400 `Cannot place asset of type "<t>" as canvas media. Use canvas_write_node with kind=text or kind=table for authored content.`。无 allowDuplicate 且已有主节点：补派生边（有新增才写盘并发 `{addedEdges}`），返回 `{nodeId:primaryId, assetId, assetType, reused:true}`。新建：`addNodeByAsset`，size = `computeNodeSize(宽高)`（缺失不写），返回 `{nodeId, assetId, assetType, reused:false}`。

### POST /file-node
body `assetPath`、`position?`、`sourceNodeIds?`、`allowDuplicate?`、`viewMode?:card|preview`、`width?`/`height?`（1–8192）。未入库 404 `...Import or upload the file into the workspace asset vault first, then retry.`；非 file 400 `Cannot place asset of type "<t>" as a file node. ...`。viewMode：显式 > 给了宽高则 preview > html/htm preview > card。card 固定 350×76（传了宽高加 warning `width/height ignored in card mode — card frame is fixed at 350x76. Pass viewMode: "preview" to use a custom size.`）；preview `max(320, round(w??820)) × max(200, round(h??480))`。复用时形状参数不同就原地改 size 和 `data.viewMode` 并发 `{updatedNodes}`。返回 `{nodeId, assetId, fileType, viewMode, size, reused, warnings?}`。

### POST /plugin-data、/plugin-data/read
写 `{nodeId, key, value?, deleteKey?}`；读 `{nodeId, key?}`。节点须为 file 且 `data.pluginId` 非空，否则 400 `Node is not an installed HTML-plugin node: ...`。存 vault SQLite（`plugin_node_storage_scopes`/`_entries`）。限制：单值 256KB、总量 1MB、≤256 key（comfyui 草稿单值 5MB / 总量 6MB）。值变化 revision+1 并发 `plugin-storage:changed`。返回写 `{nodeId, key, keys, totalBytes}`、读 `{nodeId, keys, value?}`。

### GET /search
query `query`（必填）、`type?`、`fields?`（`name,prompt,textContent`，默认 `name,prompt`）、`limit?`（50）、`offset?`。不区分大小写子串；textContent 只对前两项没命中的 text 节点读 .md，排在后面。返回 `{count, matches:[Summary + matchedField]}`。

### GET /selection、POST /selection（204）、POST /text-edit-state（204）
selection body `{nodeIds}`（可空）；text-edit-state `{nodeId, editSessionId, active}`（`active:false` 只在两者都匹配时清除）。GET 返回 `{nodeIds(仍存在的), nodes:[Summary], editing?:{nodeId, editSessionId, node?}}`。纯内存，按 baseDir 隔离，不发事件。

### POST /split-sub-images（200）
不走 DTO；缺 `nodeId` 或空 `imageIds` 400 `nodeId and non-empty imageIds[] are required`。无匹配回 `{splitNodeIds:[], removed:0}`。第 i 个成员：去 groupId/round、position `{x: main.x+(i+1)*(w+24), y: main.y}`、`meta.hidden=false`、补 prompt/model、补派生边。发 `{updatedNodes, addedEdges?, origin:"user-add"}`，返回 `{splitNodeIds, removed}`。

### 分组
写入在 canvasLock 内；有删除时 reason `group-reconciliation` + allowHighBlast，否则 non-destructive；事件无 origin。label trim 空视为无、>40 截断；layout ∈ grid|vertical。
- **POST /group**：`nodeIds`（≥2）、`label?`、`layout?`。不足 2 回 `{groupId:null, addedNodes:[], removedNodeIds:[], updatedNodes:[]}`。不存在的进 `skippedNodes`（`unknown`），已有 parentId 的进 `skippedNodes`（`already-grouped`，不嵌套）。新建：每个所有成员都有坐标的 mode 算外包框，节点 `{id:"group-"+uuid, type:"group", positions:{m:(minX-24, minY-48)}, size, sizes:{m:(w+48, h+72)}, data:label?{label}:{}, meta:{zIndex:-100}}` 追加到末尾；子节点 `positions[m]=绝对-组位置`、`parentId=组id`。选择里有 group 时并入第一个组、其余解散（进 removedNodeIds），写 `data.frameMode="auto"`，label 忽略。当前 mode 缺坐标 400 `{code:"incomplete-positions", mode, missingNodeIds, skippedNodes?, message}`。之后：reconcile 组几何（auto 贴合、manual 只扩不缩）→ 有 layout 时 relayout（格子取子节点最大宽高；排序 `data.params.order` 优先，否则 y 差超过半格高按 y 否则按 x；grid 间距 100、列数 `max(1, round(sqrt(n)))`、格内水平居中；有边时按连通分量分层后打包，孤立节点在底部；vertical 按拓扑深度分层；子节点 `(24+relX, 48+relY)`，组尺寸 = 内容 +(48,72)，frameMode auto）→ 避让顶层节点（右移到挡住者右边 +100，最多 1200，再往下，最多 200 次）。返回 `{groupId, addedNodes, removedNodeIds, updatedNodes, skippedNodes?}`。
- **POST /ungroup**：`groupId`。不存在或非 group 回 `{removed:false, removedNodeIds:[], updatedNodes:[]}` 不广播；当前 mode 无坐标 400 `{code:"incomplete-positions", mode, missingNodeIds:[groupId], availableModes, message}`。成功删组节点，子节点坐标加回组位置并删 parentId，边不变；semantic 写盘，发 `{removedNodeIds:[groupId], updatedNodes?}`，返回 `{removed:true, removedNodeIds:[groupId], updatedNodes}`。
- **POST /placeholder-group**：`sourceNodeId`、`cells`（≥1，`{prompt, model 必填, mediaType?, aspectRatio?}`）、`label?`、`layout?`（默认 grid）。source 不存在 400 `{code:"PLACEHOLDER_SOURCE_NOT_FOUND", message:"Source node not found on canvas", sourceNodeId}`。每 cell 一个 generating placeholder（`data.params.order=String(i)`，派生位置依次放，source→placeholder 边）；≥2 个时分组 + 流水线（失败只 warn）；只发一帧 `{addedNodes, addedEdges?, updatedNodes?}`。返回 `{placeholderIds, groupId}`（单个时 null）。
- **POST /nodes-group**：`sourceNodeId`、`assetIds`（≥1）、`label?`、`layout?`。找不到的资产丢弃，全找不到回 `{nodeIds:[], groupId:null}`。每资产新建节点（不复用），`data:{name, path, params:{order}, prompt?, model?, width?, height?}`，后续同上。返回 `{nodeIds, groupId}`。
- **POST /group-recent-outputs**：`label?` + 头 `x-session-id`。rootSessionId 沿父会话链上溯，turnId `${root}#${epoch}`。候选排除 group、placeholder、克隆、无资产、`metadata.model` 为 user_uploaded/imported、已有 parentId；有 session 时要求 `metadata.session_id===root`（有 turnId 还要 `turn_id` 匹配）；无 session 时以已分组资产的最大 createdAt 为阈值（没有组时全算）。返回：无 session 且阈值 0 且有候选 `{groupId:null, groupedCount:0, reason:"no-session-scope"}`；候选 <2 `reason:"insufficient-candidates"`；否则按 grid 分组，没生成组 `reason:"no-op"`，成功 `{groupId, groupedCount, label?}`。

### placeholder 生命周期
- **POST /placeholder**：`sourceNodeId`、`prompt`、`model` 必填；`mediaType?`、`aspectRatio?`。source 按 id → 迁移别名 → 唯一 assetId 匹配，还找不到就当 image/video/audio 资产物化成新节点（产生 `nodeIdReplacements`）；最终找不到 400 `{code:"PLACEHOLDER_SOURCE_NOT_FOUND", message, sourceNodeId, referenceAssetIds:[], candidateNodeIds}`。删除 source 出边指向的同 prompt `status==="error"` placeholder（reason `placeholder-cleanup`）。aspectRatio 须匹配 `^\d+(\.\d+)?\s*[:x/]\s*\d+(\.\d+)?$`，否则用 source 资产宽高算 `"W:H"`。节点 `{id, type:"placeholder", positions:{[mode]}, size:placeholderNodeSize, data:{prompt, model, status:"generating", createdAt, generationStartedAt, mediaType?, aspectRatio?}}`，位置 `resolveDerivedOrFreePosition(verticalStacking)`。发 `{addedNodes, addedEdges?, removedNodeIds?, removedEdgeIds?, nodeIdReplacements?}`，返回 `{placeholderId}`。
- **POST /placeholder/fail**（204）：`placeholderId`、`errorMessage` 必填；`errorReason?`、`retryPayload?`。节点不存在什么都不做。文案信息量不足时换成 `"生成失败，请重试"` / `"Generation failed. Please retry."`；像并发上限的文案自动补 `errorReason=CONCURRENCY_LIMIT` 和 retryPayload。patch `{status:"error", errorMessage, errorReason?, retryPayload?, refundStatus/refundedCredits/refundRecheckedAt: undefined}`，发 `{origin:"generation-status", updatedNodes:[node]}`。
- **POST /placeholder/cleanup**（204）：只删 placeholder 类型节点及其边（reason `placeholder-cleanup`），发 `{removedNodeIds:[id], removedEdgeIds?}`。
- **POST /generation/reconcile**：空实现，返回 `{ok:true, terminalized:0, loaded, remaining, updatedNodeIds:[]}`。

## 3. POST /api/safety/check-text
不走 DTO。`content` 非 string 400 ``"`content` must be a string"``；UTF-8 超 102400 字节 400 `content exceeds 102400 bytes; split caller-side`。云端未配置回 `{pass:true, decision:"bypass"}`（我们固定走这条）。状态码 201。
