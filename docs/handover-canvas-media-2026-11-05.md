# 交接文档 · 生成与预览链路（2026-11-05 会话）

> 面向：**新会话**接手继续做「蒜狸小助手 · 画布生成与预览」的 agent。
> 这份文档只写能直接用的东西：已经改了什么（含根因/验证）、还差什么（含确切规格）、怎么复现与自测、环境命令、踩过的坑。
> 上一份通用交接见 `docs/agent-handover.md`（架构、参照 asar 位置、DB 位置等），本文不重复。

- 仓库：`~/Desktop/code/api/ovaijisuandesign`
- 版本：`app/desktop/package.json` → `40.4.3`
- 参照产品：`/Applications/MiniMax Design.app`（`Contents/Resources/app.asar` 可直接按 UTF-8 搜函数做对照）

---

## 0. TL;DR

- **已完成**：多输出扇出、生图/生视频/生音乐（含参考入参）、图片/视频/音频/文本预览、PPT（原生 `edit_media:export_slides`）、以及一批会导致崩溃/静默失败的老 bug。
- **表格已打通（2026-11-05 续做）**：「+ → 表格」能建出节点、卡片能渲染 `.htable` 内容、双击能打开表格编辑器。**两个真根因**见 §3：网关缺 `content.import`，以及**文档写接口的响应缺 `media` 字段**（后者同时卡死了文本编辑）。
- 全部改动已推送。CI：`e6f9ed63`、`d5352d15`、`b9bd2b42` success；`363aa7bd` **failure 但是环境问题**（Windows 打包机 `listen EACCES 127.0.0.1:49893`，见 §4.5），其子提交 `d5352d15` 同代码全绿。

---

## 1. 提交清单（按时间正序，均为本地已提交并推送）

| 提交 | 主题 | 根因（一句话） |
|---|---|---|
| `ce200041` | 任务读接口「超集」；`resolveRetryAction` 还原 | 只换信封会让 execute 卡住；桩返回字符串而非对象 |
| `6cee6727` | `editor_subscription_ready` 的 `serverEpoch` 必须是字符串 | 回数字被渲染层判 `INVALID_EDITOR_EVENT`，每 10s 重试 |
| `f4c7e454` | 附件迁移跳过 v2 投影时要记成"已投影" | 否则 `ready` 恒 false，首条消息永不发出（"发送后一直没动静"） |
| `6c0825da` | 参考素材按**扩展名**落槽位 | 视频任务把所有参考素材塞进 `video_paths`，图片被当视频 → `输入 video 不是有效的媒体文件` |
| `bea7d71d` | 音乐风格描述从 `params.prompt` 提升到顶层；`params` 允许 JSON 字符串 | 平台报 `音乐生成缺少风格描述` |
| `5669360d` | `deliver`/`capability_get` 单对象当数组归一 | 模型常把 `{...}` 当数组传，被 schema 判 400 |
| `5708acb2` | `design_read` 允许读技能目录 | `allowedRoots()` 没包含 `~/.ovhub/skills`，技能资料一律 `unsupported` |
| `a3996214` | ①`writer.write is not a function` 崩溃 ②知识卡可读 ③`deliver` 自动补 `placements` | ①`serialize` 误连到 VS Code IPC 编码器 ②缺 `.config-v2/knowledge` 根 ③缺 placements 被硬拒 |
| `bfd5f9b6` | `references` 单字符串/JSON 字符串/单对象统一成数组 | 模型三次被 `Expected array` 挡回 |
| `b1278ec4` | `FixedMediaLightbox` 由空壳补回真组件（160 行） | 还原时写成 `React.createElement("div", …)`，视频预览打开是空的 |
| `0058740e` | `ImageLightboxView` 由空壳补回真组件（347 行）+ 灯箱中文文案 | 同上；`canvas.lightbox.copyToClipboard` 等 key 缺中文 |
| `f4e9f600` | 补 `Minus`/`Plus`/`ChevronRight` 导入 | 组件渲染即 `ReferenceError`，整树崩 |
| `5befcc58` | 模型目录解析兼容 `presentation.displayName` | 平台目录与渲染层字段不一致 |
| `9e762954` | 单击只选中，双击才开提示词编辑器 | 单击待生成卡片直接弹面板（还连带加载目录） |
| `e4d61944` | 目录 `references/prompt` 为 null 时补默认值 | `pickerInfo` 直接解构 null → TypeError → 「模型目录加载失败」 |
| `22a33213` | `count>1` 扇出 N 任务 + `serverTaskIds` | `count` 只校验不使用、`n` 写死 1，`count:4` 只出 1 张 |
| `38c97348` | 补 `isLightboxCopyShortcut`/`getWheelZoomScale` 等 5 个辅助函数 | 双击图片 `ReferenceError` |
| `77bc8eac` | 视频/音频成员卡接预览入口 + `canvasV3CanPreview` 放行 video/audio | 成员卡没传 `onPreview/onFullscreen`；门禁 `!ref` 只放行 image |
| `bbbca8de` | 零依赖 PPTX 生成器 `app/gateway/src/generate/pptx.ts` | 网关没有打包库；PPTX 就是 ZIP+OOXML |
| `e6f9ed63` | 原生能力 `edit_media:export_slides` | 应用内原本完全没有 PPT 生成能力 |
| `363aa7bd` | `tableStorage`（A 方案第一步） | 该 prop 全仓库无人提供，`addActions.table.enabled` 恒 false |
| `d5352d15` | 表格 `save()` 追加建节点（`content.import`） | `addTable()` 约定 save 后节点已存在 |
| （续做，见 §3.6） | 网关实现 `content.import` + 文档写响应补 `media` | 见 §3.6 的两个真根因 |

---

## 2. 已完成项与验证方式（可直接复跑）

### 2.1 多输出扇出（`execute` count>1）

- 代码：`app/gateway/src/generate/execute-task.ts`
  - `count>1 && operation==="generate_image"` → 按 `requestId#i` 派生幂等键与任务 id，逐个 `begin`+`runner.submit`；
  - 每个任务输出目标加 ` i` 后缀（资源名/角色），避免 N 个任务写同一资源；
  - 响应 `{ task: 第一个任务, serverTaskIds: [...] }`。
- 用例：`app/gateway/src/generate/multi-output.e2e.test.ts`（2 条；**已做重试安全**：每次尝试用不同 toolUseId，否则 vitest 重试会命中幂等记录）。
- 真机验证：`count=3` → `serverTaskIds: 3`，20 秒内 3 个任务全部 `completed`。

### 2.2 三条生成链路（真机，agent 身份直连网关）

| 链路 | 关键参数 | 结果 |
|---|---|---|
| 生图（多张） | `generate_image:qwen-image-pro-enhanced` + `count:2` | `扇出图-1.png` / `扇出图-2.png` |
| 生图（参考入参） | `references:[{versionId},{versionId}]` | `合成图.png` completed |
| 生视频（参考图） | `generate_video:minimax-h3-ref-2k`，`params:{duration:4, aspect_ratio:"16:9", resolution:"2K", image_mode:"reference"}` + 2 张参考图 | `测试视频.mp4` completed |
| 生音乐 | `generate_music:minimax-music3-enhanced`，`mode=instrumental` / `mode=song`+`lyrics` | 两条均 completed（带唱词产物约 7MB wav） |

> 注意：该模型有唱词时**必须**给 `lyrics`，否则平台报「音乐请求声明了要有唱词却没有提供歌词」。

### 2.3 预览（元素级证据）

在含图片/视频/音频的项目里双击节点，检查 `[data-action-ui-id="canvas.media-lightbox"]`：

| 类型 | 结果 |
|---|---|
| 图片 | 灯箱 1、`<img>`×2、缩放 100%、按钮「复制到剪贴板/在文件夹中显示/下载」 |
| 视频 | 灯箱 1、`<video>`×1 |
| 音频 | 灯箱 1、`<audio>`×1、标题「主音轨」 |
| 文本 | 双击文本节点 → `[role="dialog"]` 打开 |

单击节点：不再弹提示词面板（`panel:false`），只选中。

### 2.4 PPT（B 方案）

- 生成器：`app/gateway/src/generate/pptx.ts` —— `node:zlib` 自写 ZIP，输出标准 OOXML（`[Content_Types].xml` / `_rels` / `presentation.xml` / 母版 / 版式 / theme / 每页 `slideN.xml` / `media/imageN.*`），16:9 `12192000×6858000`。
- 验证：`pptx.test.ts` 用 **python-pptx**（本机 1.0.2）真打开，断言 `"2 2"`（2 页 / 2 张图）。
- 能力：`edit_media:export_slides`（`app/gateway/src/generate/media-edit.ts`）—— 读 references 里的 PNG/JPEG（≤20MB/张、≤30 页），`params.titles` 作每页标题，写 `.hilo/tmp/<hash>.pptx` 后 `publish()` 成项目资源。
- 用例：`app/gateway/src/generate/export-slides.e2e.test.ts`（未知能力仍 422、缺 references 返 4xx）。

---

## 3. 表格：已打通（原「唯一阻塞项」）

### 3.1 结论先说

「+ → 表格 → 卡片渲染 `.htable` → 双击打开表格编辑器」**全链路可用**，真机已验证（证据与复跑脚本见 §3.5）。
上一轮把它记成"唯一阻塞项：网关不认识 `content.import`"，那只说对了一半：`content.import` 确实缺，但**在它之前还有一道墙**——文档写成功了，渲染层却判定响应非法，于是根本没走到发命令那一步。

### 3.2 真根因一：文档写响应缺 `resource.media`

`POST /api/v3/document` 返回：

```json
{ "requestId": "...", "resource": { "resourceId": "res_…", "versionId": "ver_…", "name": "…", "kind": "text", "lines": 1, "contentRevision": 1 } }
```

而渲染层的 `parseCanvasV3DocumentWriteResult`（`canvas-v3-model.js:4221`）把 `media` 当**必需**字段：

```js
const metadata = media(resource2.media);            // 需要 { mimeType: string, sizeBytes: number }
if (… || !metadata || …) return void 0;             // 缺了就直接返回 undefined
```

于是表格存 `CANVAS_V3_TABLE_INVALID_RESPONSE`、文本存 `CANVAS_V3_TEXT_INVALID_RESPONSE`（`canvas-area-v3.js` 的 `CanvasV3TableStorage.run()` / `CanvasV3TextStorage.run()` 都会判）。
**文本编辑器同样受害**——只是添加文本节点不写文档，所以平时看不出来。

修：`app/gateway/src/project-kernel/document.service.ts` 的返回值补
`media: { mimeType: 扩展名 === ".md" ? "text/markdown" : "text/plain", sizeBytes: Buffer.byteLength(content) }`（与 `query.service.ts` 的读接口一致）。

**文本侧真机复验**（同一个 bug 的受害者）：`+ → 文本 → 双击卡片 → 编辑器里打字 → Esc 关闭` 之后，
节点从 `placeholder` 变成 `composition`、`activeItem` 指向 `ver_9b208c3a1fae`，工作区里出现两条版本
（草稿 + 定稿），`problems: []`。修之前这里必然抛 `CANVAS_V3_TEXT_INVALID_RESPONSE`。

### 3.3 真根因二：网关没有 `content.import`

渲染层所有"把资源放进画布"的动作（拖入图片、粘贴、上传、新建表格、文本生成完成）都发
`{type:"content.import", items:[{nodeId, resourceId, versionId, placement?, size?, edges?}]}`；
网关当时只认 `canvas.patch` / `canvas.batch`，回 `400 CANVAS_V3_INVALID_COMMAND`。

实现（`app/gateway/src/canvas-v3/protocol.ts` + `commands.ts` + `content.service.ts`）：

- `parseCanvasV3ContentImport`：严格解析（未知字段拒绝、目标 id 去重、`items` ≤ `CANVAS_V3_LIMITS.importItems`），`canvas.batch` 里也允许出现；
- `importPatch()` 把每一项翻译成 `canvas.patch`：
  - 节点不存在 → 按 `placement` 建**组合节点**（`kind:"composition"`），尺寸默认 表格 350×200 / 文本 350×500 / 图 350×350 / 视频 350×280 / 音频 350×150；
  - 节点是占位符 → 校验 `expectedKind === mediaKind` 后换成组合节点（保持父级/坐标/层级，尺寸取 `size` 覆盖或沿用）；
  - 节点已是组合 → 只把 `activeItem` 切到这一版（内容必须属于该组合，`validatePatch` 会再核）；
  - `edges:[{id, source}]` 的终点固定是该导入节点；
- **一份资源要有自己的组合**：`content.importTarget()` 先核版本可用并算出 `mediaKind`（kind=1 且路径以 `.htable` 结尾 → `"table"`），
  `contentComposition()` 找"只装了这份资源、且画布上还没被引用"的组合复用，否则按 `commandId` 用 `ensureAgent` 建一个
  （类型名沿用产品既有 `图片/视频/音频/文本/表格`，名字是 `资源名 · 组合id`，显示时后缀会被 `compositionTitle` 剥掉）；
- 命令 id 参与派生，所以重放同一条命令不会重复建组合。

### 3.4 节点形态（库里的真身）

`kind:"composition"` 是唯一能挂内容的节点。实测落盘（工作区 `.hilo/canvas-v3/state.sqlite`）：

```json
{"id":"f94ee0e1-…","parentId":null,"position":{"x":176,"y":295.5},
 "size":{"width":350,"height":200},"zIndex":0,"hidden":false,
 "kind":"composition","compositionId":"cmp_4c6ed84c72f7",
 "activeItem":{"type":"version","resourceId":"res_4905d7b57ece","versionId":"ver_6b7ad08f86b7"},"draft":null}
```

参考：真实项目里 agent 建的表格节点是 `containerKind:"subject"` + `activeItem:null`（14 个 `cmp_*` 组成一屏），
`activeItem` 为 null 时渲染层按默认 item 解析，也合法。

### 3.5 验证（可复跑）

```bash
# 网关侧：document 写 .htable → content.import → GET /api/v3/canvas 有节点 → 普通用例 5 条
pnpm --filter @ov/gateway exec vitest run src/canvas-v3/content-import.e2e.test.ts
# 界面侧：+ → 表格 → 双击 → 表格编辑器（开发态跑，需先 build renderer+gateway）
HILO_PROJECT_ARCHITECTURE=resource_v3 node scripts/pw/table-node-probe.mjs
```

界面侧的实测输出：

```
① 建节点: OK {"kind":"composition","size":{"width":350,"height":200},"compositionId":"cmp_4c6ed84c72f7","activeItem":{…}}
② 编辑器: OK {"editorOpen":1,"addRow":true,"previewText":"文本暂无数据 — 点击下方 + 添加一行"}
③ 界面问题: 无
```

请求序列（表格一次点击）：`POST /api/v3/document` → `POST /api/v3/canvas/commands` → `POST /api/v3/canvas/content` → `POST /api/project/resources/get` → `GET /api/files/content`，全部 200，无 toast。

### 3.6 顺手清掉的坑

- **手写的 `app/renderer/src/canvas-v3/table-storage.js` 已删除**（含它的 5 条用例）。它从没被用上：`tableStorage` 本来就有，
  由 `CanvasV3SessionImports.table` → `CanvasV3Surface`（`canvas-area-v3.js:61253`）传进来；而且它自己拼 `canvas/commands` 时
  **没带 `expectedRevision`**，真被用上也只会 400。兜底逻辑一并去掉——宁可菜单项显示不可用，也不静默走坏路径。
- `CanvasV3TableStorage.run()` 的 catch 里补了 `console.warn(...)`：调用方 `addTable` 只 toast 一句「画布改动尚未保存」，
  真实原因（`CANVAS_V3_TABLE_INVALID_RESPONSE`）原来完全看不到，这次就是靠它定位的。

### 3.7 还没验的

表格编辑器里改动后**关闭→保存回写**（`mode:"replace"` 出新版本 + `canvasV3SetActiveItemPatch` 切 `activeItem`）没在真机跑通完整一轮。已知线索（省下一轮摸索）：

- 编辑器是 `role="dialog"` 里的自绘网格：标题/筛选是 `<input>`，**数据单元格不是 `contenteditable` 也不是 `input`**
  （点进去才出现编辑态），所以 `locator('[contenteditable]')` 抓不到，得按坐标点；
- 关闭时若 `doc` 没变，`onClose(doc)` 不会带内容 → 根本不写版本（实测 `versions` 仍是 1 条，符合预期，别误判成 bug）；
- 关闭按钮**没有 aria-label**（`role="dialog"` 里 8 个 button 的 label 全空，靠 title/文本区分：字段配置/筛选/行高/…），
  探针里用 `Escape` 反而能关掉。

## 4. 环境与命令手册

### 4.1 起 App（带 CDP，便于自动化验证）

```bash
cd ~/Desktop/code/api/ovaijisuandesign
# 正常退出（**不要用 pkill -9**，见 §5.2）
osascript -e 'tell application "蒜狸小助手" to quit'
env -u ELECTRON_RUN_AS_NODE nohup "app/desktop/dist-electron/mac-arm64/蒜狸小助手.app/Contents/MacOS/蒜狸小助手" \
  --remote-debugging-port=9427 > /tmp/app.log 2>&1 &
```

### 4.2 打包（**有陷阱**，见 §5.1）

```bash
pkill -9 -f "MacOS/蒜狸小助手" 2>/dev/null; sleep 2
pnpm --filter @ov/renderer build
pnpm --filter @ov/gateway build        # ← stage 脚本**不会**重编 gateway，必须显式跑
pnpm --filter @ov/mcp-tools build      # 改 mcp-tools 时同理
node scripts/stage-desktop-resources.mjs --rebuild
cd app/desktop && npx --yes electron-builder@26.15.3 --mac --arm64 --publish never
```

验证打包产物里是否真的包含新代码：

```bash
grep -o 'content.import' "app/desktop/build-resources/gateway/dist/canvas-v3/commands.js" | head
grep -c 'handleNodeDoubleClick' app/desktop/out/recovered-ui/assets/*.js
```

### 4.3 以 agent 身份直连网关（最省事的探针方式）

工作区网关子进程的环境里有身份信息，用它就能发"agent 请求"（`x-hilo-agent-caller` 必须是 `HILO_AGENT_CALLER_KEY` 的值，否则会被当成 canvas 调用、`requestId` 校验失败）：

```python
import subprocess, re, json, urllib.request
out = subprocess.run(["ps","-Ao","pid=,command="],capture_output=True,text=True).stdout
env = None
for line in out.split("\n"):
    if "gateway/dist/main.js" in line and "蒜狸小助手.app" in line:
        pid = line.split()[0]
        e = subprocess.run(["ps","eww","-p",pid],capture_output=True,text=True).stdout
        if "HILO_GATEWAY_ROLE=workspace" in e:
            g = lambda k: (re.search(rf"(?:^|\s){k}=(\S+)", e) or [None,None])[1]
            if g("PORT") and g("HILO_WORKSPACE_CLAIM"):
                cur = {"pid":int(pid),"port":g("PORT"),"claim":g("HILO_WORKSPACE_CLAIM"),
                       "inst":g("HILO_WORKSPACE_INSTANCE_ID"),"gen":g("HILO_WORKSPACE_GENERATION") or "1",
                       "key":g("HILO_AGENT_CALLER_KEY"),"ws":g("HILO_WORKSPACE_DIR") or g("WORKSPACE_DIR")}
                if env is None or cur["pid"] > env["pid"]: env = cur
H = {"content-type":"application/json",
     "x-hilo-workspace": env["claim"], "x-hilo-workspace-instance": env["inst"],
     "x-hilo-workspace-generation": env["gen"], "x-hilo-agent-caller": env["key"] or "",
     "x-session-id":"probe", "x-tool-use-id":"probe-<随机>"}
BASE = f"http://127.0.0.1:{env['port']}"
```

常用端点：

| 用途 | 端点 |
|---|---|
| 能力目录 | `GET /api/v3/capabilities?operation=generate_video`、`?source=model&operation=generate_image` |
| 提交生成 | `POST /api/v3/execute`（`capabilityId/prompt/params/references/count/output`） |
| 任务查询 | `GET /api/v3/tasks/{id}`（扁平字段 + `{task,input,output}` 超集） |
| 交付/落位 | `POST /api/v3/deliveries`（`sources[{key,path}]`，**path 是 workspace 相对路径**） |
| 画布读写 | `GET /api/v3/canvas`、`POST /api/v3/canvas/commands` |
| 文档读写 | `POST /api/v3/document`、`POST /api/project/resources/get` |

### 4.4 质量门禁

```bash
node scripts/check-css-classes.mjs          # CSS 类门禁（1049 类）
pnpm turbo run typecheck test --concurrency=2
pnpm turbo run build typecheck test --concurrency=2 --force   # 全量
gh run list --limit 3 --json databaseId,headSha,status,conclusion
gh run view <id> --json status,conclusion,jobs
```

---

### 4.5 CI 结果怎么看（含一次假失败）

```bash
gh run list --limit 5 --json databaseId,headSha,status,conclusion,displayTitle
gh run view <id> --log-failed | tail -40
```

- `363aa7bd` 的 failure **不是代码问题**：Windows 打包机的「运行时证明」步骤起网关时
  `Error: listen EACCES: permission denied 127.0.0.1:49893` —— Windows 的 Hyper-V/WinNAT 预留端口段偶尔会命中随机端口。
  同一个提交的子提交 `d5352d15` 同代码全绿，重跑即可。
- **全量 `pnpm turbo run test` 里 `app/gateway/src/canvas/canvas.e2e.test.ts`（legacy v2 画布）会偶发失败**
  （`期望 409 实际 201`，即"渲染层确认"状态没建立起来）。已在**干净 tree** 上复现过，属于本仓库既有抖动，
  与本轮改动无关；单独跑该文件或与 `canvas-v3` 用例一起跑都通过。**不要**拿它当回归信号。

## 5. 踩坑清单（本轮新增，务必先读）

### 5.1 打包脚本不重编 gateway / mcp-tools
`node scripts/stage-desktop-resources.mjs --rebuild` **只重编 renderer**。改过 `app/gateway` 或 `app/mcp-tools` 后必须显式
`pnpm --filter @ov/gateway build` / `pnpm --filter @ov/mcp-tools build`，否则打出来的包跑的还是旧后端（本会话踩过一次，白跑一轮验证）。

### 5.2 `pkill -9` 会触发"上次有项目没能正常关闭"弹窗
主进程收不到正常退出 → `workspaceRestoreHealth[path]` 计数 +1，累计 ≥2 就弹"跳过/恢复"。
- 正常退出用 `osascript -e 'tell application "蒜狸小助手" to quit'`；
- 已经脏了：把 `~/Library/Application Support/蒜狸小助手/hub-config.json` 里 `workspaceRestoreHealth` 清成 `{}`（**先正常退出再改**）。

### 5.3 vitest 重试会让幂等测试假失败
任何按 `toolUseId`/`requestId` 做幂等的用例，**每次尝试都要用新的 id**，否则重试时命中原任务 → `reused:true`、平台调用次数为 0。

### 5.4 渲染层 "空壳组件" 是这批 bug 的主要来源
还原产物里用 `React.createElement("div", …)` 顶替真组件的桩，会让功能**静默失效**（不报错）。已修：`FixedMediaLightbox`、`ImageLightboxView`；**仍存在**：`arrangeCanvasV3SelectionPatch`（恒等）、`matchesReferenceSelectionDuration`（恒 false），见 `docs/agent-handover.md`。
判定手法：`grep -rn 'React.createElement("div", { className: props?.className' app/renderer/src`。

### 5.5 补组件时容易漏依赖
`ImageLightboxView` 补回来时漏了 `Minus/Plus/ChevronRight`（图标）和 `isLightboxCopyShortcut/getWheelZoomScale`（辅助函数），每次都直接 `ReferenceError` 白屏。
`app/renderer/src/canvas-v3/lightbox-icons.test.ts` 会扫"组件里用到但没定义/导入"的符号，**改动灯箱后一定跑它**。

### 5.6 平台目录 ≠ 渲染层期望
- 展示名在 `model.presentation.displayName`（不是 `name`）；
- `references` / `prompt` 可能是 **null**，`pickerInfo` 直接解构会 `TypeError` → 界面显示「模型目录加载失败」；
- H3 两条模型的 `limits.maxDurationSeconds = 10`，所以 agent 会说"上限 10 秒"——这是**平台目录的真实限制**，不是 bug。

### 5.7 网关身份头
`x-hilo-agent-caller` 必须等于网关进程的 `HILO_AGENT_CALLER_KEY`；否则按 canvas 调用处理，`requestId` 从 body 取，随便传会得到 `INVALID_ARGUMENT: Invalid requestId`。

---

### 5.8 探针里 `dispatchEvent('dblclick')` 只能向上冒泡
节点双击处理器挂在**内部**元素上（表格是 `[data-action-ui-id="canvas-v3.table-preview"]` 的 `onDoubleClick`）。
把事件打在 `.react-flow__node` 外层，它只会往上冒泡，处理函数永远不触发 —— 表现成"双击没反应"，
其实代码是好的。要么打在宿主元素上，要么用 `page.mouse.dblclick(x, y)` 按坐标点。

### 5.9 `run()` 会把真实错误换成一句泛泛的话
`canvas-area-v3.js:31474` 的 `run()` 是 `catch(() => dedupedToast.error(t("canvas.persistence.failed")))` ——
任何动作失败都只显示「画布改动尚未保存」，真实 message 丢掉了。排查这类问题先临时加 `console.warn(error)`，
或者直接看 `CanvasV3TableStorage.run().catch` 里那条（本轮已加过 warning）。

## 6. 下一步 TODO（按优先级）

1. ~~**【阻塞项】表格**~~ —— 已打通，见 §3；剩下「编辑器改完 → 关闭保存 → 新版本 + `activeItem` 切换」没真机走通一轮；
2. `design_composition_edit` 的 `action=update` 网关没有对应命令（只支持 `ensure`/`rename`），模型会撞到；
3. `deliver` 偶发 `NOT_FOUND: Delivery source version …`（模型引用了不存在的 versionId）→ 工具层加引用存在性预检，提前给可操作提示；
4. `design_execute` 提交前校验 `prompt` 非空（曾出现平台侧 `prompt is required`）；
5. PPT 后续：`export_slides` 现在只支持"一图一页"，若要排版/文字页/多图网格，扩展 `pptx.ts` 的 `slideXml`；
6. ~~补查 CI~~ —— 已查，结论见 §4.5（`363aa7bd` 是 Windows 端口假失败）；
7. ~~复制粘贴坏~~ —— 已修（`clipboard.paste` 网关实现 + 3 条 e2e，真机 `Cmd+C`/`Cmd+V` 出两个独立组合、无 400）；
8. **~~画布内点「生成」400~~ → 命令已实现（第一段）**：网关现在接 `generation.start`，
   把节点改成组合 + 写入 `draft` / `pendingGeneration`（同组合出图走 `outputCompositionId`，
   `create` 时连节点带边建出来）。真机实测：点生成 → `200 POST /api/v3/canvas/commands`
   + `200 /api/v3/canvas/content`，节点变成 `composition` 且带 `pendingGeneration`，不再 400、无 toast。
   **剩下的**：真实提交与回填没验（探针里账号是「未连接」，本来也提交不了，正好零花费）；
   要验得在已登录、有额度的会话里点一次真实生成，确认产物能落进这个组合。
   `subjectResource`（主体内出图）目前只解析不落状态。
   证据：`canvas-area-v3.js:9362` 用 `editor.createRequest(command)` 造请求、第 9430 行 `executeRequest(...)` 发出去；
   真机点 `popover.submit`（↑）后只看到 `400 POST /api/v3/canvas/commands`，**没有**任何 `/api/v3/execute`（探针把该路由 abort 了做双保险，一次都没触发）。
   含义：agent/聊天那条生成链路是好的（§2.2 验过），但**画布节点上的生成按钮全不可用**（图片/视频/音频）。
   不花钱：网关在提交平台前就拒了。实现要素：`draft`（模型/提示词/参数/参考/数量）、可选 `create`（派生新节点）、
   `subjectResource`、`historyRequest`、`outputCompositionId`（同组合内出图），要顺带想清"命令成功后由谁跑任务"。
9. **节点右侧「+」悬浮入口点了不开菜单**：A/B 测过（把旧手柄样式注回去结果一样），与手柄样式无关，需单独查
   `NodeHandleEntry` 的 onMouseDown/onClick 组合；
10. 手感/视觉已修：节点左右两边的「小黑点」= xyflow 默认手柄样式，参照实现的
   `.canvas-v3-target/.canvas-v3-source`（零尺寸透明锚点）整块缺失，已按参照补回 `after.css`。

---

## 7. 关键文件索引

| 关注点 | 文件 |
|---|---|
| 生成任务提交/扇出 | `app/gateway/src/generate/execute-task.ts` |
| 参考素材落槽位 | 同上（`referencePaths`） |
| 音乐风格描述提升 | 同上（`promoteMusicStylePrompt`） |
| 任务读接口超集 | `app/gateway/src/generate/tasks.ts` |
| PPTX 生成器 | `app/gateway/src/generate/pptx.ts` |
| PPT 能力 | `app/gateway/src/generate/media-edit.ts`（`exportSlides`） |
| 画布节点/命令模型 | `app/gateway/src/canvas-v3/protocol.ts`、`commands.ts` |
| 文档读写 | `app/gateway/src/project-kernel/document.service.ts` |
| 画布 UI（节点/菜单/预览入口） | `app/renderer/src/canvas-v3/canvas-area-v3.js` |
| 灯箱与编辑器组件 | `app/renderer/src/canvas-v3/ui-components.js` |
| 表格/文本存储（真身） | `app/renderer/src/canvas-v3/canvas-area-v3.js` 的 `CanvasV3TableStorage` / `CanvasV3TextStorage` |
| 导入命令（网关） | `app/gateway/src/canvas-v3/commands.ts`（`importPatch`）、`content.service.ts`（`importTarget` / `contentComposition`） |
| 文档写响应（media 必需） | `app/gateway/src/project-kernel/document.service.ts` |
| 画布数据模型（parser） | `app/renderer/src/canvas-v3/canvas-v3-model.js` |
| 工具参数兜底 | `app/mcp-tools/src/registrar.ts` |
| 技能/知识卡可读 | `app/gateway/src/asset-preview/document-read.service.ts` |

---

## 8. 本次会话产生的探针脚本（可参考写法，均未入库）

会话里用的临时脚本都放在 `scripts/pw/tmp-*.mjs` 或 `/tmp/*.py`，验证完即删。常用套路：

- **表格链路（已入库，可复跑）**：`scripts/pw/table-node-probe.mjs` —— 「+ → 表格 → 双击 → 编辑器」三步取证，读 sqlite 判节点、读 DOM 判编辑器、退出码非 0 即失败；
- **浏览器侧**：`chromium.connectOverCDP('http://127.0.0.1:<port>')` → 取 `app://` 页面 → `page.evaluate` 里直接 `dispatchEvent(new MouseEvent('dblclick', {bubbles:true}))`（比坐标点击稳，坐标点击容易被画布滚动/浮层影响）——**但要打在宿主元素上，见 §5.8**；
- **网关侧**：见 §4.3 的 python 片段；
- **校验 PPTX**：`python3 -c "import pptx; p=pptx.Presentation(f); print(len(p.slides))"`。
