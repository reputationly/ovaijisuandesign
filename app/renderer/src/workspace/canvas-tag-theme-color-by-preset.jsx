export const CANVAS_TAG_THEME_COLOR_BY_PRESET = {
  "#0A84FF": "var(--canvas-node-tag-blue-surface, #54A9FF)",
  "#BF5AF2": "var(--canvas-node-tag-purple-surface, #D28CF6)",
  "#FF9F0A": "var(--canvas-node-tag-orange-surface, #FFBC54)",
  "#5E3DF5": "var(--canvas-node-tag-deep-purple-surface, #8E77F8)",
  "#FF5F57": "var(--canvas-node-tag-red-surface, #FF8F89)",
  "#30D158": "var(--canvas-node-tag-green-surface, #6EDF8A)",
  "#FFD60A": "var(--canvas-node-tag-yellow-surface, #FFE254)",
};

export function getCanvasTagPresentationColor(color2) {
  if (!color2) return void 0;
  return (
    CANVAS_TAG_THEME_COLOR_BY_PRESET[color2.toUpperCase()] ??
    `color-mix(in srgb, ${color2} var(--canvas-tag-presentation-strength, 70%), var(--canvas-tag-presentation-base, #ffffff))`
  );
}
