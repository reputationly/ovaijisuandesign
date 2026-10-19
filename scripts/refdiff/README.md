# 参照比对工具（refdiff）

把「安装好的参照应用」冻结成可离线比对的一份快照，再算出两个版本之间的差异图。
换参照版本时按顺序跑这两个，就能重新得到一张作业清单。

```bash
# 1. 冻结（每换一次参照版本跑一次；输出默认在 .probe/reference/<版本>/，不进版本库）
node scripts/refdiff/freeze.mjs --app "/Applications/MiniMax Design.app" --out .probe/reference/4.0.0

# 2. 比对（产出机器可读的 JSON + 人读的差异报告 + 冻结清单）
node scripts/refdiff/delta.mjs --old .probe/reference/3.0.21 --new .probe/reference/4.0.0 \
  --json .probe/refdiff/delta-3.0.21-to-4.0.0.json \
  --md   docs/4.0.0-delta-map.md

# 3. 把渲染层入口 bundle 拆成顶层语句，并跨版本比对
node scripts/refdiff/toplevel.mjs extract .probe/reference/3.0.21/asar/out/renderer/assets/index-ZNI5SgRm.js .probe/refdiff/toplevel-3.0.21.json
node scripts/refdiff/toplevel.mjs extract .probe/reference/4.0.0/asar/out/renderer/assets/index-BBp4hclA.js .probe/refdiff/toplevel-4.0.0.json
node scripts/refdiff/toplevel.mjs diff .probe/refdiff/toplevel-3.0.21.json .probe/refdiff/toplevel-4.0.0.json

# 4. 把语句差异挂回 app/renderer/src 的具体文件，产出逐文件作业表
node scripts/refdiff/map-statements.mjs

# 5. 地面真值校验：能否从 3.0.21 的 bundle 里重新生成我们现有的源码（当前 94.2% 归一化后完全一致）
node scripts/refdiff/verify-restore.mjs 120

# 6. 把 4.0.0 的语句差异应用到源码（默认 dry-run，加 --apply 才写回）
node scripts/refdiff/apply-delta.mjs
node scripts/refdiff/apply-delta.mjs --apply

# 7. 冲突（两边都改了）里能做三方合并的那部分
node scripts/refdiff/inspect-conflict.mjs --top 5     # 看某条为什么被判冲突
node scripts/refdiff/merge-conflicts.mjs --apply

# 8. 「上游删除」要先做形状回查再删（实测 95% 是误报），删之前还会查引用
node scripts/refdiff/apply-deletions.mjs --apply

# 9. 给新增语句找家（按「引用了但没定义」的标识符定位），删除的回退也在这里
node scripts/refdiff/materialize-new.mjs --apply
node scripts/refdiff/restore-deleted.mjs --apply

# 10. 收尾悬空引用：补包 import / 在引用方目录建小模块
node scripts/refdiff/fix-dangling-refs.mjs --apply

# 11. 体检（**必跑**：构建不会报悬空引用，rollup 把未知标识符当外部全局，退出码 0）
node scripts/refdiff/check-dangling.mjs
```

`buildNodeModulesIndex` / `collectPackageIdentifiers` 用来把新语句引用的第三方符号接回依赖：
查 node_modules 有两类坑，都会把「包里有」查成「没有」：
**① 符号链接**（pnpm 全是软链，`grep -r` 默认不跟）；
**② scoped 包**（`@tiptap/core` 在 node_modules 里是 `@tiptap/` 下面一层，枚举时要展开 scope）。
两次都据此做过错误判断，改完索引从 6,760 个符号涨到 8,032 个。前者只收导出名（用来 import），
后者收全部标识符（用来判断「这条语句是不是第三方代码被内联进来」）。

**标点要取 `token.value || token.type`**：babel 把标点的字符放在 `type` 里、`value` 是空串。
只读 `value` 会让所有标点变成空串原子 —— 简写归并失效、空原子被 LCS 乱对齐、
冲突数虚高到看不出原因。踩过一次，改的时候还先走了「过滤空值」的弯路（等于删掉标点）。

比对都在 `token-merge.mjs` 的**归一化原子序列**上做：标识符抹平（`platform2` 与 `platform` 视为同一个），
`{ t }` / `{ t: t2 }` / `{ t: translate }` 归成同一个原子。**不要退回文本比对** ——
那会把 rollup 的改名后缀全算成改动，凭空造出两百多条假冲突。

## 为什么要先冻结

参照应用是 Velopack 装上去的，会被自动升级。字节一变，之前所有「相对参照的差异」
就失去基准。`freeze.mjs` 做三件事：

- 把 `app.asar` 里的代码原样解到 `asar/`（`out/main`、`out/preload`、`out/renderer` 含 `v3`）；
- 把要读的旁挂资源拷到 `sidecar/`（gateway dist、mcp-tools、插件、agent-profiles、bundled-plugins…）；
- 给整包每个文件记 SHA-256，写进 `MANIFEST.json`。

`MANIFEST.json` 只有内容、没有时间戳，所以两份冻结结果可以直接按字节比。
来源信息（在哪台机器、什么时候冻的）写在 `FREEZE.json`，比对时会忽略。

动手前先确认参照没被升级掉：

```bash
shasum -a 256 "/Applications/MiniMax Design.app/Contents/Resources/app.asar"
# 和 .probe/reference/<版本>/MANIFEST.json 里的 appAsarSha256 比
```

## 比对的口径

`delta.mjs` 里的每条结论都只有「数出来的事实」，不含推断：

| 节 | 口径 | 为什么这么定 |
|---|---|---|
| 表面差异 | 路径 + SHA-256 | 文件名带构建哈希，按名字比会把未变的文件全判成删+增 |
| chunk 配对 | 先内容、再基名（哈希前那段）、最后同大小 | Vite 的 chunk 基名来自源码模块名，跨版本最稳 |
| 功能面信号 | 字面量：`data-action-ui-id`、`/api/…`、`hilo:…`、翻译键、路由 | bundle 不是压缩产物，这些字面量都在；抽不到不等于不存在 |
| 覆盖度 | 同一批字面量在我们的 `app/renderer/src` 里再抽一遍求交集 | 比「人工看有没有」可复现 |
| IPC 通道 | `ipcMain`/`ipcRenderer`/`webContents` 调用的第一个实参，按**整棵树**的常量表解回字符串 | 单文件解析会有上百个实参解不出来（表在一个 chunk、调用在另一个） |
| agent-profiles | 三方比对：旧参照 / 我们 / 新参照 | 一方改了直接取，两边都改了才是冲突，要人工合 |
| 顶层语句 | 按 `02c-anchor.mjs` 的 `norm()` 归一化后比对 | bundle 每次构建都重排、合模块，整文件 diff 全是噪声；顶层语句是最接近「一个模块/一个函数」的粒度 |
| 语句 → 源文件 | 先声明名、再 IDF 加权锚点 | 还原时顶层声明名保留（只去掉 `$2` 后缀），是最硬的判据 |

`signals.mjs` 是纯函数库，也可以单独用：

```js
import { extractSignalsFromTree, extractIpcSurfaceFromTree } from "./signals.mjs";
```

## 已知边界

- 信号是**字面量**层面的。模板拼出来的路径、运行时才知道的值抽不到，所以是下界。
- `uiId` 两种写法都认（编译产物里的 `"data-action-ui-id": "x"` 和源码里的 JSX 属性
  `data-action-ui-id="x"`）；只认一种会把覆盖度算成接近 0。
- IPC 通道只从真正的 IPC 对象调用点认。放宽成任意 `x.on(...)` 会混进 DOM 事件名
  （`click.drag`）和 three.js 的属性名（`fov`）。
- 差异图只回答「哪里不一样」，不回答「该不该改」。属于有意去掉的东西（登录、营销弹窗、
  内置浏览器、ComfyUI）在清单里也会出现，要对着产品范围过一遍。
