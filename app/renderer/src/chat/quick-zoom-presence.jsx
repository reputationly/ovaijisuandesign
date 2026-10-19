import { default as reactExports } from "react";
export function QuickZoomPresence({ value, elementRef, children: children2 }) {
  const [retained, setRetained] = reactExports.useState(value);
  const internalRef = reactExports.useRef(null);
  const ref = elementRef ?? internalRef;
  const open = value !== null;
  if (open && retained !== value) setRetained(value);
  reactExports.useLayoutEffect(() => {
    if (open || retained === null) return;
    let cancelled = false;
    const animations2 = ref.current?.getAnimations?.() ?? [];
    if (animations2.length === 0) {
      setRetained(null);
      return;
    }
    void Promise.allSettled(animations2.map((animation) => animation.finished)).then(() => {
      if (!cancelled) setRetained(null);
    });
    return () => {
      cancelled = true;
    };
  }, [open, retained, ref]);
  const content2 = value ?? retained;
  return content2 === null
    ? null
    : children2(content2, {
        ref,
        "data-ending-style": open ? void 0 : "",
        inert: !open,
      });
}
