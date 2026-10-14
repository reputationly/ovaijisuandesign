// reconcile-media-fallback-style.js
import { MEDIA_FALLBACK_NODE_SIZE } from "../generation/missing-asset-card.jsx";
import { reactExports } from "../vendor.js";
import { useReactFlow, useStore } from "../vendor-fork/xyflow/react/index.js";
const constraints = {
  minWidth: MEDIA_FALLBACK_NODE_SIZE.width,
  maxWidth: MEDIA_FALLBACK_NODE_SIZE.width,
  minHeight: MEDIA_FALLBACK_NODE_SIZE.height,
  maxHeight: MEDIA_FALLBACK_NODE_SIZE.height,
};
const keys = ["minWidth", "maxWidth", "minHeight", "maxHeight"];
const savedStyles = new WeakMap();
function reconcileMediaFallbackStyle(style, active, saved) {
  if (!active && !saved)
    return {
      style,
      saved,
    };
  const next = {
    ...style,
  };
  const baseline = {
    ...saved,
  };
  for (const key of keys) {
    if (active) {
      if (!saved || style?.[key] !== constraints[key])
        baseline[key] = style?.[key];
      next[key] = constraints[key];
    } else if (style?.[key] === constraints[key]) {
      if (saved?.[key] === void 0) delete next[key];
      else next[key] = saved[key];
    }
  }
  const unchanged = keys.every((key) => next[key] === style?.[key]);
  return {
    style: unchanged ? style : next,
    saved: active ? baseline : null,
  };
}
export function useMediaFallbackSize(id, active) {
  const { setNodes } = useReactFlow();
  const style = useStore((state) => state.nodeLookup.get(id)?.style);
  const saved = reactExports.useRef(
    style ? (savedStyles.get(style) ?? null) : null,
  );
  reactExports.useLayoutEffect(() => {
    if (!active && !saved.current) return;
    setNodes((nodes) => {
      let changed = false;
      const next = nodes.map((node) => {
        if (node.id !== id) return node;
        const result = reconcileMediaFallbackStyle(
          node.style,
          active,
          saved.current,
        );
        saved.current = result.saved;
        if (result.style && result.saved)
          savedStyles.set(result.style, result.saved);
        if (result.style === node.style) return node;
        changed = true;
        return {
          ...node,
          style: result.style,
        };
      });
      return changed ? next : nodes;
    });
  }, [id, active, style, setNodes]);
}
