// 选中描边和命中余量，以及生成媒体节点的筛选。
import { CanvasNodeType } from "./canvas-geometry.js";
import { BACKEND_VIBE_STORYBOARD, isUserProvidedAssetModel } from "../infra/shared-runtime.js";

export const MIN_SELECTED_NODE_SIZE = 4;
export const SELECTED_GLOW_BLUR = 5;
export const NODE_HIT_SLOP = 2;
export function selectGeneratedMediaNodeIds(nodes) {
  return nodes.filter(node2 => {
    if (node2.type !== CanvasNodeType.Image && node2.type !== CanvasNodeType.Video && node2.type !== CanvasNodeType.Audio) return false;
    const data2 = node2.data;
    if (!data2 || typeof data2 !== "object") return false;
    const model = "model" in data2 ? data2.model : void 0;
    return !("backend" in data2 && data2.backend === BACKEND_VIBE_STORYBOARD) && !isUserProvidedAssetModel(model) && ("source_tool" in data2 && data2.source_tool || model);
  }).map(node2 => node2.id);
}
