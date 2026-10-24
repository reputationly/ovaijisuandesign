# v3 工作台运行时源码化：工作指导（交接文档）

写给接手的 agent。**先读完第 0~3 节再动手**，第 4 节是分阶段的做法，第 5 节是验收标准，第 6 节是汇报格式。

- 写于 2026-10-24，基线提交 `84203e66`（分支 `wip/4.0.0-restore`）。
- 本文数字和代码冲突时，**以代码和实测为准**，先实测再动手。
- 相关文档：`docs/4.0.3-v3-runtime-inventory.md`（路由与 chunk 盘点）、`docs/4.0.3-methodology.md`（门禁方法论，必读）、
  `docs/ov-changes.md`（产品有意改动清单）、`docs/4.0.4-upgrade-plan.md`（补丁层与升级流程）。

## 交接提醒（写给接手的 agent，先看这两条）

这两条是任务里最容易误判的地方，写进文档，避免只留在口头交接里。

1. **现在「逐像素一致」是必然的，不是成绩。** 基线（`~/ov-golden-v3-4.0.3-wb2`）和当前产物都来自参照原包，
   两边本来就是同一份字节，所以 6 个工作台视图现在一定是 0 差异。这个标准只有在产物内容开始
   由我们的构建产出之后（阶段 2 换 npm 库起逐步生效，阶段 3 换掉产品代码后全面生效）才真正起作用；
   阶段 1 的 0 只证明构建链路通了，不证明还原正确。因此：
   - 第 5.1 节**不允许**给工作台视图加 `workbenchGuard`。现在加护栏，等于把这条验收标准关掉
     （3.3 节已有禁令，这里再强调一次）。
   - 换成我们自己的产物后，差异**变多才是正常的** —— 那是门禁刚开始真正工作。不要为了变绿去调阈值、
     登记未查明的差异或加护栏，先按 5.2 节查清差异来源。
2. **门禁有盲区，必须用 Playwright 补，不能用门禁结果替代。** fixture 里没有 v3 数据：assets、structure、
   execution 三屏拍到的都是空状态。有数据时的列表/卡片，以及聊天发消息、画布编辑这些交互，门禁完全覆盖不到。
   按 5.2 节的要求，在**原产物**和**我们的产物**上跑同样的操作，比较界面 id、请求序列（方法 + 路径）、
   WS 帧类型，把结果写进汇报；没跑就写没跑。

---

## 0. 一页纸总览

**目标**：v3 工作台运行时（`renderer/v3`，工作台窗口加载的那个独立 SPA）现在是**参照的压缩产物整包复制**进来的，
不是我们的源码。要把其中的**产品代码**还原成仓库里可维护的源码，由我们自己的构建打出等价的 `renderer/v3`。

**不要求源码化的**：第三方库（React、TanStack、xyflow、three.js、mediabunny、shiki 语法/主题等）和数据类内容。
这些直接用 npm 上**与产物里打包的同一版本**的编译产物即可。

**验收的硬标准**：我们构建出的 v3 运行时，在门禁的 7 屏 v3 场景里与参照**逐像素一致、界面 id 集合一致**
（第 5 节），并且全量 37 屏门禁不退步。

**现状（`84203e66`）**：

| 项 | 状态 |
|---|---|
| v3 产物来源 | `scripts/v3-runtime/v3-4.0.3.tgz`（锁文件 `scripts/v3-runtime.lock.json`），构建时由 `scripts/stage-v3-bundle.mjs` 解包到 `app/desktop/src/renderer/public/v3`，再由 `app/official-ui/build-v3.mjs` 打补丁（目前只有 `<title>`）并重生成 `bundle-manifest.json` |
| 门禁覆盖 | 7 屏 v3 场景，其中 6 屏采集工作台视图（独立 WebContentsView）的截图与界面 id |
| 基线 | `~/ov-golden-v3-4.0.3-wb2`（7 屏同批，batch `2026-10-24T00:25:00.071Z-5s2smj`），护栏在 `scripts/ui-compare/residual-budget.json` |
| 当前门禁结果 | 7 屏退出码 0；6 个工作台视图 5 次全部逐像素一致（因为两边是同一份产物 —— 这正是源码化之后要守住的标准） |

---

## 1. 必须遵守的规则（违反任何一条都验收不过）

1. **退出码是门禁唯一的机器可读结论**。看到非 0 不追问就报告「通过」，等于没验收。
2. **门禁不可复现时，所有数字都不可信**。改了门禁或环境，先证明同一份代码连跑两次结果一致。
3. **护栏和基线必须同一批次生成**；换了基线，护栏重新生成（5 次取最大值）。
4. **不改门禁的判定逻辑和阈值来让结果变绿**；不往 `expected-diffs.json` 里登记未查明的差异；不把屏加进 `DISABLED_PAGES`。
5. **不重录、不覆盖 `~/ov-golden-v3-4.0.3-wb2` 和 `~/ov-golden-4.0.3-clean`**。验收必须对着它们比。
6. **不碰 `.probe/reference/*`**（冻结参照，只读）。
7. **看到「参照有、我们没有」，先分清「它没实现」和「它没拿到数据」**（详见 methodology 第二条）。
8. 代码、注释、测试名里不写「官方 / official / MiniMax」；注释用中文、只写「为什么」；提交信息用中文。
9. **不做的范围**：账号、计费、团队、云端同步、对方的外部 Agent 云端部分、ComfyUI、内置浏览器、自定义模型、
   对方的前端监控（RUM / 神策，见 `ov-changes.md` #10）。v3 产物里有一组云端账号/计费的 protobuf 枚举
   （`PRIVILEGE_TYPE_*`、`HUB_CANCEL_BLOCK_REASON_*`、`CLOUD_NODE_STATUS_*`），**不要还原成可用的云端调用**，
   界面需要的地方保持与参照相同的「不可用/空」表现即可。
10. 不合并到 main、不 force push。

---

## 2. v3 运行时是什么（必须知道的事实）

### 2.1 产物结构

冻结原件：`.probe/reference/4.0.3/asar/out/renderer/v3/`（346 个文件，22 MB）。

```
index.html            <div id="root">，加载 assets/index-gOAN8KHr.js，标题 MiniMax Design V3（我们打补丁换成蒜狸小助手）
bundle-manifest.json  { version: 1, protocolVersion: 1, files: [{ path, sha256 }] }，不含自身
assets/               324 个 js + css/svg/png/wasm/json
```

宿主端约束（**源码化后必须照样满足**）：

- `app/desktop/src/main/v3/bundle.ts`：启动前按 `bundle-manifest.json` 逐文件核对 sha256，`version`/`protocolVersion` 必须为 1，
  多文件、少文件、哈希不符都拒绝加载。
- `app/desktop/src/main/v3/host.ts`：打包态从 `app.getAppPath()/out/renderer/v3` 读，开发态从 `src/renderer/public/v3` 读。
- `app/desktop/src/main/v3/session.ts` 的 `nativeWorkbenchEntry`：入口是 `app://<ownerId>/index.html`，
  只允许 `initialRoute` 为 `/canvas` | `/assets`、`presentation` 为 `canvas-only` | `workspace`。
- preload `app/desktop/src/preload/v3-workbench/`（产物 `out/preload/v3-workbench.cjs`）只暴露一个
  `window.__HILO_V3_PORT_HOST__`，运行时通过 MessagePort 和宿主通信。**宿主协议不要改**；
  要改说明你在改宿主，不在本任务范围内。
- `scripts/verify-desktop-package.mjs` 检查包里有 `out/renderer/v3/bundle-manifest.json` 和 `index.html`。

### 2.2 路由与模块

TanStack Router，hash 路由。模块表在入口 chunk 里（`F4 = [assets, canvas, structure, execution, chat]`）：

| 模块 | 路由 | 视图代码所在 | 产品里怎么到达 |
|---|---|---|---|
| assets | `/`（另有 `/assets` 子路由） | 入口 chunk 内 | 资源视图入口（`hilo:workspace-resource-view:<ws>`）→ `#/assets` |
| canvas | `/canvas` | lazy `CanvasPage-CrarlH7w.js`（5.5 MB） | 视图内点 `workspace.structure-canvas-tab`；或调试工作台模式进入 `/`，会重定向到 `#/canvas` |
| structure | `/structure` | 入口 chunk 内 | 视图内点 `workspace.structure-list-tab` |
| execution | `/execution` | 入口 chunk 内 | 视图内点 `workspace.tasks` |
| chat | `/chat` | lazy `ChatPage-CtSjFboN.js` | **产品里没有入口**，只能直接改 hash。照样还原，但它不是用户路径 |

其他 lazy chunk：`EditorInterface-Cz3KTJZH.js`（导出编辑器，1.2 MB，由画布按需加载）、`editing-fetch-*`、`client-*`、
`index-DPa0ey8S.js` / `index-DDAF-k1M.js`（画布侧的大块依赖）、`webgpu-renderer-impl-*` 等。

### 2.3 代码构成（实测，`scripts/refdiff/v3-composition.mjs` 可重跑）

做法：把每个 chunk 拆成顶层声明，用字符串字面量 + 属性名做指纹（压缩不改这两样），
分别对照主界面参照（未压缩的 `.probe/reference/4.0.3/asar/out/renderer/assets/`）、`node_modules`、我们的源码。

| 类别 | 大小（压缩后） | 处理方式 |
|---|---|---|
| 数据类（shiki 语法/主题、内嵌 worker 源码等） | 10.9 MB | 用 npm 包 |
| 第三方库（npm 里能对上） | 3.6 MB | 用 npm 包，版本对齐 |
| 与主界面共享（单条语句能在主界面参照里对上） | 2.8 MB（其中约 1.8 MB 我们源码里已有字符串） | **复用我们 `app/renderer/src` 里的实现**，没有的照主界面参照的未压缩代码还原 |
| 大概率共享（字符串 80% 以上在主界面参照里，但单条对不上） | 3.8 MB | 逐块确认：是库（three.js 等）还是被压缩改写过的共享代码 |
| 只有 v3 有 | 约 0.16 MB | 只能从压缩代码反推（内容主要是 chunk 文件名、three 着色器、云端 protobuf 枚举、少量提示词模板/图标路径） |

**结论：需要源码化的业务代码约 6.7 MB（压缩后），绝大部分在主界面参照里有未压缩的对应代码可以照着还原名字和结构。**
限制：分类依赖阈值；「字符串对上」不等于「实现一致」—— 实现一致只能靠门禁证明。

---

## 3. 环境与命令

### 3.1 必须知道的环境坑

- **shell 里设了 `ELECTRON_RUN_AS_NODE=1`**，它会让门禁的 Electron 起不来（表现：「等不到界面页面」）。
  所有门禁命令前面加 `env -u ELECTRON_RUN_AS_NODE ELECTRON_DISABLE_SANDBOX=1`。
- 主进程有 **10 分钟闲置挂起**（`DEFAULT_IDLE_SUSPEND_MS`）。门禁全量要保持在约 16 分钟、单屏间隔约 25 秒；
  如果全量明显变慢，后面的屏会因为工作区被挂起而失败。先查门禁为什么变慢，不要绕开。
- 门禁运行时机器上不要跑别的 Electron / 构建，端口 9360 必须空闲。

### 3.2 构建

```bash
pnpm --filter @ov/desktop build        # stage-v3-bundle → electron-vite → 主界面 vite build
```

### 3.3 门禁

```bash
# v3 七屏（验收主战场）
env -u ELECTRON_RUN_AS_NODE ELECTRON_DISABLE_SANDBOX=1 HILO_PROJECT_ARCHITECTURE=resource_v3 \
  GOLDEN="$HOME/ov-golden-v3-4.0.3-wb2" \
  ONLY=ws-a-v3,ws-a-v3-resource,ws-a-v3-wb-canvas,ws-a-v3-wb-structure,ws-a-v3-wb-execution,ws-a-v3-wb-hierarchy,ws-a-v3-wb-chat \
  node scripts/ui-compare/compare.mjs > /tmp/v3gate.log 2>&1; echo "REAL_EXIT=$?"

# 全量 37 屏（不退步检查）
env -u ELECTRON_RUN_AS_NODE ELECTRON_DISABLE_SANDBOX=1 GOLDEN="$HOME/ov-golden-4.0.3-clean" \
  node scripts/ui-compare/compare.mjs > /tmp/full.log 2>&1; echo "REAL_EXIT=$?"
```

- **退出码要直接取**（不要接管道，否则拿到的是 `tail` 的退出码）。
- 每次运行的结果在 `.probe/ui-compare/<时间戳>/`，`report.json` 里每屏有 `diffPctNonAA`、`budgetVerdict`、
  `unregisteredDiffCount`、`setDiffs`、`workbench`（`diffPctNonAA` / `diffPixelsNonAA` / `failed`）。
- 工作台视图的判定：id 集合差异（含「视图在不在」的占位项 `<workbench-view>`）走登记表；
  像素没设 `workbenchGuard` 时要求**非 AA 像素为 0**。**本任务不允许给工作台视图加 `workbenchGuard`。**

### 3.4 静态检查（每个阶段结束都跑，结果不得比开始时差）

```bash
node scripts/v3preload/audit-v3.mjs          # 必须 ✓ 全部通过（含第 6 项 Context 声明对账）
node scripts/v3preload/check-tdz.mjs
node scripts/desource/check-tdz.mjs          # 现有 1 条已知（export-engine.js:17422），不得新增
node scripts/desource/check-undef.mjs        # 现有 14 条已知（vendor.js），不得新增
node scripts/v3preload/check-constants.mjs
node scripts/v3preload/check-placeholders.mjs
```

### 3.5 诊断工具（不进门禁）

- Playwright：`.probe/pw/`（`playwright-core@1.64.1`，用仓库自带 Electron），已有
  `probe.mjs`、`worker-probe.mjs`、`v3routes-probe.mjs` 可参考（`.probe/` 不进 Git）。
  适合查「谁在什么时候发了什么请求 / 建了什么 worker / 点了之后 hash 变成什么」。
- 构成测量：`node --max-old-space-size=12288 scripts/refdiff/v3-composition.mjs`。

---

## 4. 怎么做（分阶段）

**每个阶段单独提交、单独验收**，验收没过不要进下一阶段。阶段内可以再拆小步。

### 阶段 1：构建骨架（产物不变）

目标：让 `renderer/v3` **由仓库里的构建产出**，但第一版内容仍然等价于原产物。

1. 新建 v3 工作台的源码目录与 Vite 配置。建议放在 `app/renderer` 下作为第二个入口（例如 `app/renderer/v3/`，
   复用 `app/renderer/src` 的模块），或独立包 `app/v3-workbench`。**二选一后在汇报里写清理由**；
   要求能 `import` 主界面源码里的组件，且不产生第二份 React / 第二份 Context（见 `audit-v3` 第 6 项）。
2. 构建输出与原产物**同结构**：`index.html`、`assets/`、`bundle-manifest.json`（`version: 1, protocolVersion: 1`，
   逐文件 sha256，不含自身）。文件名可以不同（哈希），但宿主只认 manifest，不认具体文件名 —— 先读 `bundle.ts` 确认。
3. 改 `scripts/stage-v3-bundle.mjs`：从「解包 tgz」改为「跑我们的构建」；保留 tgz 作为**对照用**的原版
   （不要删，验收和回退都要用它），用一个明确的开关切换来源，默认走源码构建。补丁层（`app/official-ui/build-v3.mjs`）
   要么继续作用于构建产物，要么把 `<title>` 改到源码里并删掉这条补丁，同步改 `ov-changes.md` #9。
4. 第一版可以把原产物的 chunk 作为「未拆的模块」原样纳入构建（例如作为外部静态资源复制），目的只是打通链路。

**阶段 1 验收**：第 5.1 节全部通过；并证明 `bundle.ts` 能加载我们构建出的产物（工作台视图能打开）。

### 阶段 2：第三方库换成 npm

1. 逐个识别产物里打包进去的库和**确切版本**：版本号字符串（如 three 的 `REVISION`、mediabunny 的版本常量）、
   许可证注释、逐声明比对（`scripts/refdiff/` 和 `analysis/xyflow/tools` 里有跨模块逐声明比对的现成工具）。
   **不要凭短名巧合认定库归属**。
2. 按 `app/renderer/package.json` 已有依赖优先复用同版本；版本不同的，以 v3 产物里的版本为准，
   并确认不会和主界面的同名依赖冲突（必要时 v3 单独锁版本）。新依赖遵守仓库规则：选发布超过 7 天的版本，不用浮动范围。
3. 库被应用改过的地方（产物和 npm 原版逐声明比对不一致）：用 `pnpm patch` 保留，写进 `patches/README.md`。
4. shiki 语法/主题按需加载的结构保持（ChatPage 里引用了 200+ 个语法 chunk），别一次性打进主 chunk。

**阶段 2 验收**：第 5.1 节全部通过；汇报里给出「库 → 版本 → 证据 → 是否打补丁」清单。

### 阶段 3：按模块换成源码（每个模块一次提交）

顺序（由小到大、由空状态到有内容）：

1. **structure**（`/structure`）、**execution**（`/execution`）—— 入口 chunk 内，fixture 下都是空状态
2. **assets**（`/`、`/assets`，含合成面板树、层级菜单 `ws-a-v3-wb-hierarchy`）
3. 入口 chunk 的外壳：路由、模块表、视图内导航条（`workspace.assets/tasks/structure-*-tab`）、宿主通信（MessagePort 客户端）
4. **chat**（`ChatPage`，离线聊天 `offline-chat.*`）
5. **canvas**（`CanvasPage`，最大；大量组件在主界面的 `canvas-v3/`、`canvas/`、`media-editing/` 已有）
6. **EditorInterface**（导出编辑器；先和我们的 `app/renderer/src/export-engine/editor-interface.js` 逐声明比对，
   确认是不是同一份实现再决定复用还是另还原）

每个模块的做法：

1. 用指纹把该模块的顶层声明对到主界面参照（未压缩）里的同一实体：同模块邻居、同字符串集合、同属性名集合；
   `$n` 后缀和压缩名都不可信（rollup 每次构建重新编号）。
2. **已在 `app/renderer/src` 里的，直接 import 复用**，不要再抄一份（重复声明会被 `audit-v3` 拦下；
   重复 Context 会让 Provider 和消费者分挂两份，运行时永远拿默认值 —— 这类缺陷构建和运行都不报错）。
3. 主界面没有、主界面参照里有未压缩版本的：照参照还原（名字、结构、注释风格对齐周围代码）。
4. 只在 v3 里有的（约 0.16 MB 的字符串所在的声明）：从压缩代码反推，命名要有依据（字符串、调用关系、i18n 键），
   拿不准的在汇报里列出来。
5. 云端账号/计费相关（第 1 节第 9 条）：保持与参照相同的界面表现，不接云端。
6. 写成 JSX；不留 `xxx$3` 这类打包器名字；不留 `jsxRuntimeExports.jsx(...)` 调用。

**阶段 3 每个模块的验收**：第 5.1 节全部通过（尤其该模块对应的那一屏工作台视图逐像素一致）+ 第 5.2 节该模块的条目。

### 阶段 4：清理

- 删除构建里残留的「原样纳入的旧 chunk」；`v3-4.0.3.tgz` 保留为对照与回退。
- 更新 `docs/ov-changes.md`（#9 标题补丁的落点）、`docs/4.0.4-upgrade-plan.md`（升级流程里 v3 不再是「换 tgz」，
  改为三方合并，写清楚怎么做）。
- 给 v3 源码里的纯逻辑（路由表、宿主协议客户端、数据整形）补单元测试（vitest，参照 `app/desktop` 的配置）。

---

## 5. 怎么验收

### 5.1 每次提交都要满足（机器判定）

| # | 检查 | 通过标准 |
|---|---|---|
| 1 | 构建 | `pnpm --filter @ov/desktop build` 退出码 0；产物里 `bundle-manifest.json` 与磁盘逐文件一致 |
| 2 | v3 七屏门禁（3.3 节命令） | **退出码 0**；7 屏 `unregisteredDiffCount` 全为 0、新报错 0；6 个工作台视图 `workbench.failed=false` 且 `diffPixelsNonAA=0`；主页面 `budgetVerdict` 不是 `over` |
| 3 | v3 七屏可复现 | 同一份代码连跑 2 次，每屏数值一致（工作台视图都为 0） |
| 4 | 全量 37 屏门禁 | 退出码 0，超护栏 0，未登记 0 |
| 5 | 静态检查（3.4 节） | 不比开始时差；`audit-v3` 全部通过 |
| 6 | 打包验证 | 阶段 1 和最终交付时各跑一次 `node scripts/stage-desktop-resources.mjs --rebuild` + 打包 + `node scripts/verify-desktop-package.mjs`，包里有 `out/renderer/v3/bundle-manifest.json` |

**允许的唯一例外**：如果某屏和参照的差异来自**有意改动**（只可能是品牌，且必须已在 `ov-changes.md` 里），
在 `expected-diffs.json` 登记并在汇报里单列。除此之外任何工作台视图的像素差异都算失败。

**工作台视图的像素护栏**：按 3.3 节，未设 `workbenchGuard` 时要求非 AA 像素为 0；本任务**不允许**新增
`workbenchGuard`。现阶段的一致性来自「两边是同一份产物」，加护栏只会把这条标准关掉（见开头「交接提醒」）。

### 5.2 人工核对（每个模块）

- 该模块的顶层声明清单：来源（复用我们源码 / 照主界面参照还原 / 从压缩代码反推）、对应文件。
- 反推的声明：命名依据。
- 没有新的重复实体（Context、store、单例）；`audit-v3` 第 6 项为 0。
- 门禁覆盖不到的交互（fixture 里没有数据的列表/卡片、聊天发消息、画布编辑）：至少用 Playwright 诊断脚本
  在**原产物**和**我们的产物**上各跑一遍同样的操作，比较界面 id、请求序列（方法 + 路径）、WS 帧类型，
  结果写进汇报。这是补门禁的盲区，不替代门禁。

### 5.3 最终交付标准

1. 默认构建不再从 `v3-4.0.3.tgz` 取任何产品代码（tgz 只作对照）。
2. 第 5.1 节全部通过，且 v3 七屏连跑 5 次都满足。
3. v3 源码里没有打包器名字、没有 `jsx()` 调用、没有内联的第三方库代码。
4. 第三方库清单（库 / 版本 / 证据 / 补丁）、模块声明清单、未能确认的点，都写进 `docs/`。
5. 升级流程文档已改：以后官方 v3 升级时，怎么从新产物得到差异、怎么合进我们的源码。

---

## 6. 汇报格式（每个阶段 / 模块结束时）

```
阶段/模块：
提交：<hash>（工作区是否干净）
改动：按文件列，说明来源（复用 / 照参照还原 / 反推）
构建：退出码
v3 七屏：运行目录 · 退出码 · 每屏 未登记/新报错/主页面非AA%/budgetVerdict/工作台非AA像素
可复现：第二次运行目录 · 是否逐屏一致
全量 37 屏：运行目录 · 退出码 · 超护栏 · 未登记
静态检查：每项结果（与开始时对比）
未解决 / 拿不准：逐条列，附证据
```

**数字一律给运行目录**，不给「应该是」「估计」。没跑就写没跑。

---

## 7. 已知的坑（前人踩过的）

- **按名字配对会配错实体**：rollup 每次构建重新编号 `$n` 后缀；`isRecord`、`PREVIEW_W` 这类通用名在多个模块里各有一份。
  配对必须看模块邻居和指纹。
- **Context 被复制成两份**：Provider 挂一份、消费者读另一份，构建、运行、报错都没有，功能悄悄失效。
  `audit-v3` 第 6 项专门查这个。
- **空桩挡住真实现**：曾有 `createWorkbenchEvents = () => ({ dispose() {} })` 遮住已取回的真实现，导致结果导航一注册就抛错。
  还原时别留桩；`check-placeholders.mjs` 会拦一部分。
- **工具的「可直接套用」不可全信**：`apply-delta.mjs` 曾提议删掉还在用的常量。每条都要人工核对。
- **门禁变慢会导致假失败**：截图前的等待逻辑写得不好，会让全量跑过 10 分钟闲置挂起。
- **基线是用原产物录的**：两边都用原产物时「逐像素一致」是必然；只有换成我们的产物后，这个标准才有意义。
- **门禁只比本地接口**：网络比较只看本地 gateway 的请求。v3 产物里写着对方的域名（`hub.minimaxi.com`、`design.minimax.io` 等），
  源码化时确认它们只是配置/外链，不要引入对外请求；有疑问用 Playwright 记录所有外部请求核对。

---

## 8. 需要先找负责人确认的事

- 源码放在 `app/renderer` 下作为第二入口，还是独立包 —— 阶段 1 动手前在汇报里给方案，确认后再做。
- 以后是否继续跟官方升级 —— **已定（2026-10-24）：4.0.4 要跟；跟完 4.0.4 之后再暂停一段时间。**
  - 4.0.3 → 4.0.4 时 v3 产物 345 个文件里有 18 个变了，涉及 13 个 chunk 基名（`index.html`、入口、`CanvasPage`、`ChatPage`、
    `EditorInterface`、`client`、`editing-fetch`、`editor`、`highlighted-body`、两个 3D 加载器、两份 css），即所有业务 chunk 都动过。
  - **建议顺序（待负责人确认）：先把整个产品升到 4.0.4（v3 这时仍是整包复制，换 tgz 即可），再以 4.0.4 的产物为对象做本文的源码化。**
    反过来做的话，4.0.4 对 v3 的改动只能从压缩代码的差异里读出来再合进我们的源码，成本最高。
  - 所以本文里的 `4.0.3`、`index-gOAN8KHr.js` 等路径和文件名，开工时都要换成 4.0.4 的；基线也要换成 4.0.4 参照界面重录的
    v3 七屏（新目录，七屏同批），护栏按同批 5 次最大值重新生成。以 `scripts/reference-version.json` 的当前值为准。
  - 4.0.4 跟完、产品稳定后，阶段 4 只需在 `docs/4.0.4-upgrade-plan.md` 里注明「v3 已源码化，恢复升级时要另定合并方法」。
- `/chat` 在产品里没有入口：照样还原（当前要求），还是去掉 —— 未改之前按「照样还原」做。
