// reconcile-media-fallback-style.js
import { MEDIA_FALLBACK_NODE_SIZE } from "../generation/missing-asset-card.jsx";
import { reactExports, useReactFlow, useStore$3 } from "../vendor.js";

const constraints = {
  minWidth: MEDIA_FALLBACK_NODE_SIZE.width,
  maxWidth: MEDIA_FALLBACK_NODE_SIZE.width,
  minHeight: MEDIA_FALLBACK_NODE_SIZE.height,
  maxHeight: MEDIA_FALLBACK_NODE_SIZE.height,
};

const keys$3 = ["minWidth", "maxWidth", "minHeight", "maxHeight"];

const savedStyles = new WeakMap();

function reconcileMediaFallbackStyle(style2, active2, saved) {
  if (!active2 && !saved)
    return {
      style: style2,
      saved,
    };
  const next2 = {
    ...style2,
  };
  const baseline = {
    ...saved,
  };
  for (const key2 of keys$3) {
    if (active2) {
      if (!saved || style2?.[key2] !== constraints[key2])
        baseline[key2] = style2?.[key2];
      next2[key2] = constraints[key2];
    } else if (style2?.[key2] === constraints[key2]) {
      if (saved?.[key2] === void 0) delete next2[key2];
      else next2[key2] = saved[key2];
    }
  }
  const unchanged = keys$3.every((key2) => next2[key2] === style2?.[key2]);
  return {
    style: unchanged ? style2 : next2,
    saved: active2 ? baseline : null,
  };
}

export function useMediaFallbackSize(id2, active2) {
  const { setNodes } = useReactFlow();
  const style2 = useStore$3((state2) => state2.nodeLookup.get(id2)?.style);
  const saved = reactExports.useRef(
    style2 ? (savedStyles.get(style2) ?? null) : null,
  );
  reactExports.useLayoutEffect(() => {
    if (!active2 && !saved.current) return;
    setNodes((nodes) => {
      let changed = false;
      const next2 = nodes.map((node2) => {
        if (node2.id !== id2) return node2;
        const result = reconcileMediaFallbackStyle(
          node2.style,
          active2,
          saved.current,
        );
        saved.current = result.saved;
        if (result.style && result.saved)
          savedStyles.set(result.style, result.saved);
        if (result.style === node2.style) return node2;
        changed = true;
        return {
          ...node2,
          style: result.style,
        };
      });
      return changed ? next2 : nodes;
    });
  }, [id2, active2, style2, setNodes]);
}
