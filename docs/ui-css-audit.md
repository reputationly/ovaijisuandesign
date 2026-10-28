# 界面 CSS 类审计（构建产物 vs JSX）

## 方法

1. 从构建产物 `app/desktop/out/recovered-ui/assets/*.css` 提取**已定义**的类名集合；
2. 从 `app/renderer/src/**/*.{js,jsx}` 的 `className` 提取**实际使用**的类名（去掉 `${}` 模板片段）；
3. 取差集 → 使用但未定义；
4. 对差额在参照 `/Applications/MiniMax Design.app/Contents/Resources/app.asar` 里查同名规则。

## 结果

| 类别 | 数量 | 说明 |
|---|---|---|
| 使用但构建产物里没有定义 | 34 | 差集 |
| 其中参照有对应规则、本轮已补 | 5 | 见下表 |
| react-flow 交互标记（无需样式） | 4 | `nodrag` / `nowheel` / `nopan` / `nokey` |
| 参照里也不存在的死类 | 25 | 用了但两边都没定义，等实现对应功能时再补 |

## 本轮补上的 5 条

| 类名 | 用途 |
|---|---|
| `.home-project-greeting` | 首页问候语字号/行高 |
| `.home-whats-new__ticker` | 首页更新条宽度过渡 |
| `.home-sidebar-recent-thumbnail-fallback` | 侧栏缩略图兜底底色 |
| `.canvas-horizontal-resize-control` | 画布横向缩放控件层级 |
| `.canvas-lightbox-action-menu` | 灯箱操作菜单配色变量 |

## 差额清单（34）

- `text-hl-text-03` — 参照也没有
- `home-media-showcase-footer` — 参照也没有
- `canvas-horizontal-resize-control` — 参照有规则（已补）
- `canvas-lightbox-action-menu` — 参照有规则（已补）
- `bg-hl-alpha-04` — 参照也没有
- `toaster` — 参照也没有
- `update-sidebar-poster-slot` — 参照也没有
- `home-whats-new__ticker` — 参照有规则（已补）
- `home-project-greeting` — 参照有规则（已补）
- `file-type-icon__archive-zipper` — 参照也没有
- `hl-mention-connector` — 参照也没有
- `hl-asset-context` — 参照也没有
- `home-sidebar-recent-thumbnail-fallback` — 参照有规则（已补）
- `update-sidebar-slot` — 参照也没有
- `transparent-window-workbench-inset` — 参照也没有
- `canvas-group-collapsed-drag-handle` — 参照也没有
- `shj-lang-` — 参照也没有
- `hilo-docx-body` — 参照也没有
- `image-edit-mosaic-slider` — 参照也没有
- `hilo-overlay-scrollbar-track` — 参照也没有
- `browser-annotation-canvas-wrap` — 参照也没有
- `hilo-edges-canvas` — 参照也没有
- `hilo-edges-flow-canvas` — 参照也没有
- `canvas-toggle-` — 参照也没有
- `hilo-node-tag-rings-canvas` — 参照也没有
- `canvas-node-empty-state` — 参照也没有
- `canvas-node-suggestion` — 参照也没有
- `canvas-node-suggestion-icon` — 参照也没有
- `canvas-global-tag-manager` — 参照也没有
- `text-hl-text-02` — 参照也没有
- `text-hl-error` — 参照也没有
- `text-hl-text-01` — 参照也没有
- `not-prose` — 参照也没有
- `chat-markdown-streaming-text` — 参照也没有

## 结论

- 首页/侧栏那种「文字糊出来、底色缺失、层级不对」的问题，多半就是这一类：组件搬过来了、配套 CSS 没搬。
- 下一步建议把它做成常驻门禁：在 `scripts/` 加一个脚本跑同一套差集，超过阈值就让 CI 失败，避免再漏。
