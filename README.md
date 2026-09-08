# ovaijisuandesign

一个 agent 驱动的媒体创作画布，生成全部落在自建 MaaS 平台
（`maas.ovaijisuan.com`）上。

不依赖任何商业客户端 —— 这是它和 [DesignPlusPlus](../DesignPlusPlus) 的区别：
那个是「接管官方 MiniMax Design、把它的模型换掉」，需要官方应用装着；
这个是把整条链自己搭起来。

## 为什么可行

MiniMax Design 是这条路上最完整的参考实现，而它**大部分不闭源**：

| | |
|---|---|
| `opencode` 1.18.18 | MIT，**原封不动**嵌进去当 agent runtime，零业务代码 |
| `gateway/dist/main.js` | 未混淆，类名注释齐全，能脱离 Electron 独立跑（[实测](docs/standalone-gateway.md)） |
| `mcp-tools/dist/main.js` | 未混淆，14 个 `hub_*` + 15 个 `canvas_*` 工具 |
| 画布 | React Flow + Yjs + selecto，全是 MIT 库；`canvas.json` 就是 RF 的 nodes/edges |
| `app.asar` | **唯一闭源的部分** —— Electron 主进程 + 画布渲染层 |

也就是说：难的部分（资产依赖图、生成任务恢复对账、agent 编排契约）设计全都
可读，而闭源的那部分恰好是整套东西里最标准、最好写的一层。

## 边界：读规格，不抄原文

**仓库里没有复制任何 MiniMax 的文件。**

- **协议事实**（路径、字段名、枚举值、`canvasFileSchema` 的结构、失败长什么样）
  记在 `docs/` 里，照着实现是互操作
- **他们的提示词**（`agents/` `contracts/` `knowledge/` `workflows/` 那批 markdown）
  是受版权保护的创作性表达，一个字都不进来。而且它们引用的是他们的 `hub_*`
  工具名和模型目录 —— 我们的工具契约不同，抄来本来就是错的，还是**安静地错**
- 要对照原文时放 `reference/`（已 gitignore）

opencode 是 MIT，直接依赖，不 fork —— MiniMax 自己都没改一行。

## 结构

```
crates/maas-media/     平台适配层。已完成，55 个测试
crates/gateway/        资产库 + 画布持久化 + 生成队列。待写
apps/canvas-web/       React Flow 画布前端。已跑通读写闭环
agent/                 自己写的 opencode agents / contracts / skills
mcp/                   自己的 canvas_* 与生成工具
docs/                  逆向出来的协议事实
scripts/               开发辅助
```

### `crates/maas-media`

**不知道 MiniMax 的存在** —— 只回答「给一段提示词和一些素材，怎么让平台产出
图 / 视频 / 语音 / 音乐」。

平台侧的形状：图片是同步的（`POST /v1/images/*` 直接返回 URL），**其余全部**
挂在 `POST /v1/videos` 下靠 `metadata.task_type` 区分（`t2v` / `i2v` /
`flf2v` / `l2va` / `r2va` / `sr` / `tts` / `t2m` / `cover` / `repaint`）。

这一层的注释密度偏高，因为**这条链上大量失败是不报错的**：键名放错位置、
参数越界、音色映射不到，平台照样返回一个成功的任务和一段能播的音频，
只是内容完全不是要的东西。每处都记着实测依据。

最典型的一处 —— 两个音乐引擎的映射**正好相反**：

| | caption | 歌词 |
|---|---|---|
| `minimax-music3` | `metadata.instructions` | 顶层 `prompt` |
| `ace-step` | 顶层 `prompt` | `metadata.lyrics` |

发反了会把风格描述一遍遍唱出来，出曲成功、时长正常，只有听了才知道。
所以引擎族推断不出来时**拒绝启动**，而不是挑一个默认值。

### `apps/canvas-web`

React Flow 重写的画布前端。当前后端接的是官方 gateway（独立跑，见
[`docs/standalone-gateway.md`](docs/standalone-gateway.md)），等
`crates/gateway` 写完再切过去。

已跑通：打开真实项目、渲染 image/video/audio/text 节点和边、四种模式切换、
拖动落盘（CDP 驱动 headless Chrome 实测，不是 curl 模拟）。

## 路线

**gateway 放最后写。** 顺序是按"未知数从多到少"排的，不是按依赖关系：

1. ~~平台适配层~~ —— 已完成
2. ~~画布前端读写闭环~~ —— 已完成
3. **canvas-web 接上 `maas-media` 的生成** ← 下一步。画布上点生成直接出图，
   中间仍借官方 gateway 落盘。跑通"我的前端 → 我的后端"
4. 自己的 MCP 工具 + agent 契约，接 opencode
5. `crates/gateway` —— 资产库、画布持久化、生成队列。最后一个替换的模块

第 3 步之后，官方应用就只剩"存文件"这一个用途了。

## 起环境

```bash
# 平台适配层
cargo test -p maas-media

# 画布前端（需要先起一个 gateway）
./scripts/standalone-gateway.sh ~/Movies/Hub/Projects/<项目> 8099
cd apps/canvas-web && bun install && bun dev   # http://localhost:5273
```

## 许可

个人学习研究用，未授权分发。
