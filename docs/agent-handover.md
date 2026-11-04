# 交接文档：对齐 MiniMax Design 并修蒜狸小助手的 bug

> 面向：接手继续做「参照产品 vs 我们产品」差异定位与修复的 agent。
> 只讲**能直接用**的东西：架构在哪、怎么复现、怎么取证、我们踩过哪些坑、还有哪些坑没填。

- 仓库：`~/Desktop/code/api/ovaijisuandesign`（我们），`~/Desktop/code/api/new-api`（平台侧）
- 版本：`app/desktop/package.json` → `40.4.3`
- 参照产品：`/Applications/MiniMax Design.app`（asar 可直接读，见 §3.1）

---

## 1. 一句话背景

MiniMax Design 是商业产品，我们用「还原 + 自研」的方式做了蒜狸小助手：**Electron 桌面端 + NestJS 网关 + 复刻的渲染层 + opencode agent 运行时 + MCP 工具层**。
所以我们的 bug 绝大多数不是「算法不对」，而是**还原时把契约弄丢了一部分**：

| 类别 | 典型症状 | 根因 |
|---|---|---|
| 路由按名字猜 | 工具 404 / 参数校验失败 | 猜了个不存在的 URL（`/api/project/resources/deliver` 之类） |
| 组件搬来、配套没搬 | 文字糊出容器、字号不对、层级被盖 | CSS 类没定义 / 用了包装组件而非根组件 |
| store 与 hook 语义搞反 | `selector is not a function` | 参照里是 hook，我们还原成了 zustand store |
| 缺兜底 | 一个节点抛错 → 整块画布白屏 | `undefined.length` / `undefined.then` |
| 参数形状没对齐 | `UNSUPPORTED_FIELD` / `Required at …` | 网关白名单严格，模型按语义自己拼字段 |
| 权限过紧 | agent 连 `/System/Library/Fonts` 都读不了 | `external_directory: deny` 在非交互会话里等于拒绝 |

**定位差异的第一原则：先看"哪一层"，不要先怀疑模型能力。**
分层顺序：渲染层（DOM/控制台）→ MCP 工具层（打的 URL / 参数）→ 网关（真实路由与白名单）→ agent 运行时（profile/权限/模型）→ 平台（new-api 目录/编排）。

---

## 2. 架构地图

```
┌─────────────────────────── Electron 桌面端（app/desktop）───────────────────────────┐
│ main 进程                                                                          │
│   ├─ opencode 运行时（子进程，agent 在这里跑）                                       │
│   │    ├─ profile：assets/agent-profiles/v3/config（media-agent / code-agent）       │
│   │    ├─ MCP server：app/mcp-tools（design_* 工具实现）                             │
│   │    └─ 插件：app/packages/opencode-plugin-hilo（权限注入、chat.params、事件）      │
│   └─ gateway 子进程（NestJS，app/gateway）                                          │
│        ├─ app-level 网关（一个 App 一个）                                            │
│        └─ workspace 网关（每个工作区一个，带 workspace claim 身份）                   │
├────────────────────────────────────────────────────────────────────────────────────┤
│ renderer（app/renderer/src，复刻的界面；构建产物 app/desktop/out/recovered-ui）        │
└────────────────────────────────────────────────────────────────────────────────────┘
                              │ HTTPS
                              ▼
                    平台 new-api（模型目录 / 聚合编排 / relayvsr 超分）
```

### 2.1 两套架构，现在只发 v3

- v2（`hub_*` 工具、`.config-v2/` profile、v2 画布）**已停用**，代码路径删了 v2 回落。
- v3（`design_*` 工具、`resource_v3`、`.hilo/` 下的资源/组合）是唯一形态。
- 环境变量 `HILO_PROJECT_ARCHITECTURE=resource_v3` 必须设，否则网关 403 `PROJECT_V3_DISABLED`。

### 2.2 关键目录

| 路径 | 作用 |
|---|---|
| `app/renderer/src` | 复刻界面（JSX + 还原出来的 JS）。改 UI 基本都在这里 |
| `app/desktop/src/main` | Electron 主进程：opencode 启动、网关管理、平台配置 |
| `app/gateway/src` | NestJS 网关：**真实路由与参数白名单在这里** |
| `app/mcp-tools/src` | MCP 工具实现（`design_*`）→ 决定打哪个 URL、传什么参数 |
| `app/mcp-tools/src/registrar.ts` | **参数兜底层**：别名、JSON 字符串、缺字段推断、信封组装 |
| `app/packages/maas-media` | 媒体生成参数（分辨率/时长）与路由 |
| `app/packages/protocol` | 能力目录（vendor/模型/参数 schema）、协议常量 |
| `assets/agent-profiles/v3/config` | agent 人设与硬性要求（`agents/*.md`、`knowledge/*.md`） |
| `scripts/pw/` | 真机自动化（启动 App、跑真实会话、画布冒烟） |

---

## 3. 取证工具（最重要的一节）

### 3.1 读参照产品的实现

```bash
# 参照界面/常量全在这一个 asar 里（纯文本，可直接 grep）
python3 - <<'PY'
s=open('/Applications/MiniMax Design.app/Contents/Resources/app.asar','rb').read().decode('utf-8','replace')
i=s.find('关键词'); print(s[max(0,i-200):i+400])
PY
```

判断"我们和它哪里不一样"时优先用它：同一个类名/函数名在参照里通常能找到**原实现**。

### 3.2 我们的运行日志

```bash
L=~/Library/Application\ Support/蒜狸小助手/logs/main.log
tail -50 "$L"
# 抓渲染层崩溃
grep -n "\[renderer error\]" "$L" | tail -5
# 抓网关 stdout（Nest 的路由表、任务失败）
grep -n "gateway workspace stdout" "$L" | tail -20
```

### 3.3 会话与工具调用（谁调了什么、失败在哪）

```bash
cp ~/Library/Application\ Support/蒜狸小助手/ai-runtime/data-home/opencode/opencode.db /tmp/our.db
python3 - <<'PY'
import sqlite3, json, collections
db=sqlite3.connect('file:/tmp/our.db?mode=ro', uri=True)
sid=db.execute("select id from session order by time_created desc limit 1").fetchone()[0]
parts=[json.loads(d) for (d,) in db.execute("select data from part where session_id=? order by time_created,rowid",(sid,))]
for p in parts:
    if p.get('type')!='tool': continue
    st=p.get('state') or {}
    out=str(st.get('output') or st.get('error') or '')[:200].replace('\n',' ')
    print(p.get('tool'), st.get('status'), '|', out)
PY
```

参照产品同样的库：`~/Library/Application Support/@hilo/desktop/ai-runtime/data-home/opencode/opencode.db`。

### 3.4 工作区落盘状态

| 文件 | 内容 |
|---|---|
| `<ws>/.hilo/index.sqlite` | `compositions` / `composition_members` / `resource_versions` / `project_changelog` |
| `<ws>/.hilo/canvas-v3/state.sqlite` | **画布文档**（`document` 表里一列 JSON：`nodes` / `edges`） |
| `<ws>/store/ver_*.{mp4,png,md}` | 已交付的版本内容 |

画布能不能看到东西，先看 `canvas-v3/state.sqlite` 里 `nodes` 有没有、`kind` 是什么：

```bash
python3 - <<'PY'
import sqlite3, os, json, glob
for d in glob.glob(os.path.expanduser("~/Movies/蒜狸小助手/Projects/*/")):
    p=os.path.join(d,".hilo/canvas-v3/state.sqlite")
    if not os.path.exists(p): continue
    db=sqlite3.connect(f'file:{p}?mode=ro', uri=True)
    doc=json.loads(db.execute("select json from document limit 1").fetchone()[0])
    print(os.path.basename(d.rstrip('/'))[:30], len(doc.get("nodes",{})), sorted({n.get('kind') for n in doc.get("nodes",{}).values()}))
PY
```

### 3.5 直接打网关（绕开 agent 复现后端问题）

工作区网关的端口与身份在**子进程环境变量**里：

```bash
for pid in $(ps -Ao pid=,command= | grep "gateway/dist/main.js" | grep 蒜狸 | awk '{print $1}'); do
  ps eww -p $pid | tr ' ' '\n' | grep -E "^(PORT|HILO_GATEWAY_ROLE|HILO_WORKSPACE_CLAIM|HILO_WORKSPACE_INSTANCE_ID|HILO_AGENT_CALLER_KEY)="
done
```

请求必须带齐身份头，**并且要带 agent 头**才是"agent 视角"：

```bash
curl -sS "http://127.0.0.1:$PORT/api/models?agent_version=2" \
  -H "x-hilo-workspace: $CLAIM" \
  -H "x-hilo-workspace-instance: $INST" \
  -H "x-hilo-workspace-generation: $GEN" \
  -H "x-hilo-agent-caller: $AGENT_KEY"
```

> **这条极其重要**：画布只展示 `project_changelog` 里 `actor='agent'` 的 composition。
> 不带 `x-hilo-agent-caller` 的交付会被记成 `human`，画布永远看不到——我们为此误判过一整轮。

---

## 4. 已经做过什么（按类别，含提交号）

> 想看细节：`git show <sha>`；每个提交信息里都写了"现象/根因/修法"。

### 4.1 工具路由与参数形状（最多的一类）

| 提交 | 现象 | 根因 → 修法 |
|---|---|---|
| `8b8bd1c2` | 成片进不了画布 | `deliver` 打 `/api/project/resources/deliver` → 改 `/api/v3/deliveries`，解包 `{delivery}` |
| `024ecc31` | `analyse_media` 永远失败 | 改 `/api/v3/analyse`（新增 `ProjectAnalyseController`：versionId→relativePath→`EditService.analyzeMedia`）；传本地路径时给可执行报错 |
| `00a2ccb7` `04f71edd` `4ba39c8f` | `code_publish` 反复失败（一次 38 连败） | `outputs` 归一成 `[{key,source:{path}}]`；缺 `output` 时按 outputs 推断；`checkpoint` 收 `note`/空参兜底 |
| `0ad0b553` | 生图失败、画布无对象 | `execute` 白名单过滤；`composition_edit`/`resource_edit` 组装网关信封 `{commandId,actor,command:{type}}` |
| `f6206bec` | `execute` 仍被拒 | `output` 语义归一：第一个目标当 primary（去 key）、顶层 composition 字段搬进 `output.composition`。**必须在 registrar 预处理里做**（schema 会丢未知字段） |
| `2998a4da` | 三种坏形状 | `deliver` 清洗；`code_project_open` 的 `inputs` 字符串→对象；`document_write` 的 `title`→`name`、丢弃 `docType` |

**通用做法**：所有"模型习惯"都在 `app/mcp-tools/src/registrar.ts` 的 `withAutoRequestId` 预处理里修，**不要改 `v3-tool-specs.ts`**（那是与参照逐字对齐的契约，有 parity 测试）。

### 4.2 画布渲染

| 提交 | 现象 | 根因 → 修法 |
|---|---|---|
| `6f1a8b28` | 交付成功但画布白屏 | ①`TooltipTrigger` 被塞进便捷包装 → 改用根 `Tooltip`；②`useMediaPlayback` 被还原成 store（参照是 hook） |
| `36d3569e` `432f50d5` | 视频节点一点就白屏 | `NodeToolbarInner` 直接读 `items.length`；第一次改偏楼层，第二次改对 + 加源码守卫用例 |
| `ec712079` | 单节点崩 → 整块画布卸载 | 新增 `canvas-v3/node-render-boundary.jsx`，8 种节点类型全包上，抛错只影响该节点 |
| `88f654d9` | 侧栏长标题糊出 3 行 | 标题要用 `OverflowMarqueeText`，且它依赖的 CSS 要一起搬 |
| `ed3934ea` | 字号/层级不对 | 差集扫出 5 条"用了但没定义"的 CSS 类并补上 |

### 4.3 崩溃（窗口级）

| 提交 | 现象 | 根因 → 修法 |
|---|---|---|
| `dab3ee73` | 弹「出现异常」整窗白屏（错误码 EB-…） | `notifyTaskNeedsUserAction` 没有 return，调用点 `.then` → undefined.then。触发条件：agent 提问 + 窗口失焦 |

**排查入口**：`grep "\[renderer error\]" main.log`，错误码与时间戳都在。

### 4.4 agent 运行时（profile / 权限 / 模型）

| 提交 | 内容 |
|---|---|
| `1d0a80a8` | 所有 agent 的 `external_directory` 放开（否则非交互会话里连系统字体都读不了） |
| `885ef9f6` | 程序化视频**默认要带声音**，发布前 ffprobe 自查音轨 |
| `3499408b` | 视频交付默认带**封面帧 + 分镜脚本**（role：成片/封面/分镜） |
| `a9e69ffb` | code-agent 单独用 `deepseek-v4-1-flash`（`platform.code_model`），普通对话仍用 `chat_model` |
| `e49f2bf3` | 档位允许 `max`/`xhigh`（平台实测 reasoning_tokens：max 264 > xhigh 128 > high 70） |
| `65487279` | 视频分辨率只给 **768P/2K**（1080P 下线；2K=聚合增强+relayvsr 超分）；`minimax-music3-enhanced` 引擎推断用例 |

### 4.5 门禁与稳定性

| 提交 | 内容 |
|---|---|
| `1139ab28` | `scripts/check-css-classes.mjs`：**JSX 用到的类，构建产物里必须有定义**（配 `scripts/ui-css-allowlist.json`，31 条确认无害的） |
| `d57c0ebd` | `scripts/pw/canvas-smoke.mjs` 进 CI（macOS 硬门禁）：真 App + 真网关交付 4 类成员（视频/图/音频/文件），断言画布有节点、无报错 |
| `d387aed0` `96f8359a` `9c169074` | 三套 e2e 的随机 flake：环境变量按文件清理、销毁全局 keep-alive、超时 20s + `retry: 1` |

---

## 5. 工作流程（接手后照这个做）

### 5.1 定位一个差异

1. **拿到双方的原始证据**，不要靠截图猜：
   - 我们：`main.log` 的 `[renderer error]` / 网关 4xx / session DB 的工具序列
   - 参照：`~/Library/Logs/MiniMax Design/*.log` + `@hilo/desktop` 的 session DB
2. **判断层级**（§1 的表）：渲染？工具？网关？profile？平台？
3. **对照参照 asar** 找同名实现（§3.1）。
4. **最小复现**：
   - 后端问题 → 直接 curl 网关（§3.5），比跑 agent 快 10 倍
   - 前端问题 → `launchApp` + CDP 打开同一项目截图/`evaluate`
5. **改代码 → 加用例 → 跑 turbo → 打包 → 真机复验**。
6. **提交**：中文提交信息，写清「现象 / 根因 / 修法 / 验证」；push 后**必须**查 CI。

### 5.2 常用命令

```bash
# 全量（build + typecheck + test），本地必跑
env -u ELECTRON_RUN_AS_NODE pnpm turbo run build typecheck test --concurrency=2 --force

# 只跑某个包
cd app/mcp-tools && npx vitest run src/tools/read-tool.test.ts

# CSS 门禁
node scripts/check-css-classes.mjs

# 画布冒烟（起真 App + 真网关交付 + 截图）
node scripts/pw/canvas-smoke.mjs        # 产物：artifacts/canvas-smoke.png / .json

# 跑一次真实的 agent 会话（会把工具序列打到 /tmp/ov-pw/opencode.db）
OV_PLATFORM_KEY="$OV_PLATFORM_KEY" node scripts/pw/design-execute-online.mjs \
  --real-session --timeout 900 --model qwen3.8-flash-fp8 --effort high --prompt "…"

# 打包（本地验证用；注意 electron-builder 偶尔网络超时，重试即可）
node scripts/stage-desktop-resources.mjs --rebuild
cd app/desktop && npx --yes electron-builder@26.15.3 --mac --arm64 --publish never
pkill -9 -f "MacOS/蒜狸小助手"; env -u ELECTRON_RUN_AS_NODE open -n \
  "app/desktop/dist-electron/mac-arm64/蒜狸小助手.app"
```

### 5.3 提交与 CI 约定（务必遵守）

- 提交信息用**中文**，标题一行说清"修了什么"，正文写现象/根因/修法/用例。
- 每项改动都要能在正文里指出：**文件 / 用例 / 修复前失败输出 / 修复后通过**。
- 凡没做到的，单独列一节说明（别藏在正文里）。
- push 后查 CI：`gh run list --limit 1` → `gh run view <id> --json jobs`（`gh` 不稳，失败就重试几次）。
- 已知 CI 现象：gateway 套件在 `--concurrency=2` 下偶发 1 个用例失败，单独跑 537 全过——先复跑确认再判断是不是真回归。

---

## 6. 必须守住的约束

1. **不要改 `app/mcp-tools/src/tools/v3-tool-specs.ts`**：工具描述与 inputSchema 与参照逐字对齐，有 parity 测试；所有容错写在 `registrar.ts` 预处理里。
2. **联调 key 只通过环境变量 `OV_PLATFORM_KEY`** 传入，不要写进代码/文档/提交。
3. **写文件前先 `git status`**，不要用 `cat >` 覆盖别人的改动。
4. `scripts/ui-compare/expected-diffs.json` 是护栏文件，只允许改已授权的那一行。
5. 自动应答的 pw 脚本**只用于调试**，绝不能让产品在用户面前自动作答。

---

## 7. 还没填的坑（接手可从这里开始）

1. **`design_composition_edit` 只映射了 `ensure` / `rename`**。`update`/`set_attributes`/`move`/`duplicate`/`batch` 网关还没有对应命令，现在会返回可执行报错——要么在网关补命令，要么在工具层映射到 `composition.apply` 的 operation 列表。
2. **`design_resource_edit` 同理**：只映射了 `describe` / `adopt`。
3. **`design_execute` 的语义校验**：`output` 已归一，但"多输出时 placements 必须覆盖每个 key"这类规则仍靠网关口径报错，模型会遇到一次 400 才改对（可以再加一层预检）。
4. **视频/音频节点在画布上的播放与工具栏**：只做过视频与图片的手工验证；音频绑定（`CanvasV3AudioPlayer`）没有专门的回归用例。
5. **参照功能面**：封面/分镜已按规则强制产出，但参照还有「分镜脚本可编辑」「素材库」等面板，未逐项比对。
6. **平台目录项**：`minimax-music3-enhanced` 已能被识别（引擎推断有用例），但没有端到端的出曲验证（需要真实 key + 一次音乐生成）。
7. **gateway e2e 的并发 flake** 只是缓解（retry/超时），没根治。

---

## 8. 附：常见症状 → 先看哪里

| 症状 | 先看 |
|---|---|
| 画布空白/红字 | `main.log` 的 `[renderer error]`；`canvas-v3/state.sqlite` 的 nodes |
| 「交付成功但看不到」 | 交付是否带了 `x-hilo-agent-caller`（actor 必须是 agent） |
| 工具报 `Required at …` / `UNSUPPORTED_FIELD` | `registrar.ts` 的预处理有没有覆盖这个形状；网关的 `object(value, [...])` 白名单 |
| 工具报 404 | `grep -rn "@Controller(" app/gateway/src` 找真实前缀；别再猜 |
| agent 行为不对（不肯用工具/乱调） | `assets/agent-profiles/v3/config/agents/*.md`、模型与档位（`platform.code_model`、`OV_REASONING_EFFORT`） |
| 模型/档位不对 | `/api/models`、`/api/v3/capabilities` 直接 curl；`app/packages/maas-media/src/params.ts` |
| 界面文字糊/字号错 | 先跑 `node scripts/check-css-classes.mjs` |
