export const SHOW_ASSET_PROMOTION = false;

export function isCanvasToolbarActionVisible(id2) {
  return id2 !== "promote-to-asset" || SHOW_ASSET_PROMOTION;
}
