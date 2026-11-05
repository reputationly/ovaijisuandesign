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
- **唯一未完成**：**表格节点创建**（因此表格预览也验不到）。根因已定位到网关层：网关不认识渲染层发的 `content.import` 命令，且节点模型里没有表格内容节点。详见 §3。
- 全部改动已推送，`turbo typecheck+test` 全绿；CI 对 `e6f9ed63` 及之前提交均 success（`363aa7bd`、`d5352d15` 的 CI 结果本会话未查看，接手后请补查）。

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

## 3. 未完成：表格节点创建（**新会话的第一件事**）

### 3.1 现象

画布底部「+ → 表格」菜单项**可点**（`disabled:false`），点完：

- `POST /api/v3/document`（`format:"htable"`）**成功**；
- 画布上**没有**表格节点（`canvas.table-node` = 0），也无报错弹窗；
- 抓网络：只有 document 请求，**没有** `canvas/commands` 请求跟在后面。

### 3.2 已确认的链路与契约

1. **`addTable()` 的约定**（`app/renderer/src/canvas-v3/canvas-area-v3.js:32622`）：

```js
run(async () => {
  await tableStorage.save({ nodeId: id2, doc: createEmptyDocument(...), name: ..., position: point, ...(edges) });
  if (editor.getSnapshot().document.nodes[id2]) selectNodeExclusive(id2);   // ← save 返回时节点必须已存在
});
```

2. **`storage` 需要的方法**（文本侧同一套 `useCanvasV3Text`，`canvas-v3-hooks.js:229`）：
   `subscribe(listener)` / `getSnapshot() → {pending,error}` / `load({resourceId,versionId,contentRevision}, signal)` / `save({nodeId,doc,name,position,edges,source})`。
3. **表格在数据模型里 = 路径以 `.htable` 结尾的 TEXT_DOCUMENT**（`canvas-v3-model.js:4270`）。
4. **后端能力**：
   - 写文档：`POST /api/v3/document`，`FORMATS = ["md","txt","htable","srt","ass"]`（`project-kernel/document.service.ts:14`）；
     返回 `{requestId, resource:{resourceId, versionId, name, kind:"text", lines, contentRevision}}`；
   - 读文档：`POST /api/project/resources/get`（`mode:"content"`，内容可能分块返回）。

### 3.3 卡点（实测，不是猜测）

| 尝试 | 结果 |
|---|---|
| `POST /api/v3/document {format:"htable"}` | ✅ 200，返回 `res_65464f7b97cf` / `ver_8cd1d9010199` |
| `POST /api/v3/canvas/commands` `{type:"content.import", items:[…]}` | ❌ `400 CANVAS_V3_INVALID_COMMAND`（网关源码里 **grep 不到 `content.import`**） |
| `canvas.patch` 节点 `{kind:"table", resourceId, versionId, …}` | ❌ 400（`LEGACY_NODE_FIELDS` 把 `resourceId/versionId` 判成 legacy 快照） |
| `canvas.patch` 节点 `{id,parentId,position,size,zIndex,hidden,kind:"placeholder",expectedKind:"table",draft:null}` | ❌ 400 `CANVAS_V3_INVALID_COMMAND` |

网关侧事实：

- 命令只有 `canvas.patch` / `canvas.batch`（`canvas-v3/commands.ts:224`）；
- 节点 kind 只有 `composition / placeholder / frame / sticker / director-stage / clip-studio`（`canvas-v3/protocol.ts` 的 `parseNode`）；
- `LEGACY_NODE_FIELDS = ["resourceId","versionId","mediaKind","imageResults","generationIntentId"]`（`protocol.ts:296`），带这些字段的节点一律 legacy 拒绝。

### 3.4 建议实现路径（按顺序）

1. **在网关实现 `content.import`**（`canvas-v3/protocol.ts` 加解析、`commands.ts` 加执行）：把
   `{items:[{nodeId, resourceId, versionId, placement?, size?, edges?}]}` **翻译成 `canvas.patch`**，
   节点形态用网关认可的 `placeholder`（`expectedKind` 由资源推导：`.htable` → `table`）或该资源类别对应的合法形态；
2. 加 e2e：`document` 写 `.htable` → `content.import` → `GET /api/v3/canvas` 能看到该节点；
3. 回到 UI 验：**「+ → 表格 → 双击表格卡片 → 表格编辑器/预览」**，并截图；
4. 若 `placeholder` 仍被拒，先用**最小 patch** 逐字段二分，找出 `parseNode` 到底缺哪个字段（不要靠猜，错误信息只有 `Invalid canvas command`，需要在网关侧临时加日志把具体 fail 原因打出来）。

### 3.5 相关未完成代码（已在 `d5352d15` 提交，可继续用）

- `app/renderer/src/canvas-v3/table-storage.js`：`load`/`save`/`subscribe`/`getSnapshot` 已就绪，
  `save()` 里已按 `content.import` 组装命令（网关支持后即可工作）；
- 画布内兜底构造：`canvas-area-v3.js`（`tableStorageProp ?? useMemo(createCanvasV3TableStorage…)`）；
- 用例：`app/renderer/src/canvas-v3/table-storage.test.ts`（5 条，含"第二步打 canvas/commands、type=content.import"）。

---

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

## 6. 下一步 TODO（按优先级）

1. **【阻塞项】表格**：§3.4 —— 网关实现 `content.import`，再验「+ → 表格 → 双击预览」；
2. `design_composition_edit` 的 `action=update` 网关没有对应命令（只支持 `ensure`/`rename`），模型会撞到；
3. `deliver` 偶发 `NOT_FOUND: Delivery source version …`（模型引用了不存在的 versionId）→ 工具层加引用存在性预检，提前给可操作提示；
4. `design_execute` 提交前校验 `prompt` 非空（曾出现平台侧 `prompt is required`）；
5. PPT 后续：`export_slides` 现在只支持"一图一页"，若要排版/文字页/多图网格，扩展 `pptx.ts` 的 `slideXml`；
6. 补查 `363aa7bd`、`d5352d15` 的 CI 结果，并确认最新 HEAD 的 `turbo build typecheck test` 全绿。

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
| 表格存储 | `app/renderer/src/canvas-v3/table-storage.js` |
| 画布数据模型（parser） | `app/renderer/src/canvas-v3/canvas-v3-model.js` |
| 工具参数兜底 | `app/mcp-tools/src/registrar.ts` |
| 技能/知识卡可读 | `app/gateway/src/asset-preview/document-read.service.ts` |

---

## 8. 本次会话产生的探针脚本（可参考写法，均未入库）

会话里用的临时脚本都放在 `scripts/pw/tmp-*.mjs` 或 `/tmp/*.py`，验证完即删。常用套路：

- **浏览器侧**：`chromium.connectOverCDP('http://127.0.0.1:<port>')` → 取 `app://` 页面 → `page.evaluate` 里直接 `dispatchEvent(new MouseEvent('dblclick', {bubbles:true}))`（比坐标点击稳，坐标点击容易被画布滚动/浮层影响）；
- **网关侧**：见 §4.3 的 python 片段；
- **校验 PPTX**：`python3 -c "import pptx; p=pptx.Presentation(f); print(len(p.slides))"`。
