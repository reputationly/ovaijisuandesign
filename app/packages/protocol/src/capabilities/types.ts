/**
 * 能力操作的取值表。
 *
 * 与生成指令共用一份取值，另外多一个 `edit_media` —— 媒体编辑不走生成那条路。
 * **这个文件是「部分还原」**：v3 的 preload 只用到它的一部分，其余声明在打包时被
 * tree-shaking 去掉了，产物里没有。这里只放得回产物里还留着的那部分 ——
 * 不要把它当成完整文件来对照；要补全需要别的证据（dist 快照、source map 或上游仓库）。
 */
import { PROJECT_GENERATION_OPERATIONS } from "../project-v3/generation.js";

export const CAPABILITY_OPERATIONS = [...PROJECT_GENERATION_OPERATIONS, "edit_media"];

