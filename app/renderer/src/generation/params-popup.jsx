// params-popup.jsx
import { reactDomExports, reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { usePortalAnchorPlacement } from "./use-portal-anchor-placement.jsx";

function nextStablePortalPanelHeight(
  previousHeight,
  measuredHeight,
  maxHeight,
) {
  return Math.min(Math.max(previousHeight, measuredHeight), maxHeight);
}

const POPUP_MIN_HEIGHT = 200;

const POPUP_MAX_HEIGHT = 480;

export function ParamsPopup({
  onClose,
  children: children2,
  widthPx = 380,
  scale: scale2 = 1,
  anchorRef,
}) {
  const popupRef = reactExports.useRef(null);
  const [stableHeight, setStableHeight] = reactExports.useState(0);
  const panelScale = scale2 > 0 ? scale2 : 1;
  const onCloseRef = reactExports.useRef(onClose);
  reactExports.useEffect(() => {
    onCloseRef.current = onClose;
  });
  reactExports.useEffect(() => {
    const handleMouseDown2 = (e2) => {
      const target = e2.target;
      if (!target) return;
      if (popupRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onCloseRef.current();
    };
    const handleKeyDown2 = (e2) => {
      if (e2.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("mousedown", handleMouseDown2, true);
    document.addEventListener("keydown", handleKeyDown2);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown2, true);
      document.removeEventListener("keydown", handleKeyDown2);
    };
  }, [anchorRef]);
  const placement = usePortalAnchorPlacement(anchorRef, {
    open: true,
    minHeight: POPUP_MIN_HEIGHT * panelScale,
    maxHeight: POPUP_MAX_HEIGHT * panelScale,
    gap: 8,
  });
  reactExports.useLayoutEffect(() => {
    const measuredHeight =
      (popupRef.current?.getBoundingClientRect().height ?? 0) / panelScale;
    if (measuredHeight <= 0) return;
    setStableHeight((previousHeight) =>
      nextStablePortalPanelHeight(
        previousHeight,
        measuredHeight,
        POPUP_MAX_HEIGHT,
      ),
    );
  });
  if (!placement) return null;
  const panel = (
    // biome-ignore lint/a11y/noStaticElementInteractions: popup container, click only stops propagation
    // biome-ignore lint/a11y/useKeyWithClickEvents: same reason
    <div
      ref={popupRef}
      data-side={placement.side}
      className={`canvas-portal-popover-in nowheel overflow-y-auto scrollbar-none rounded-[16px] border shadow-lg p-2.5 ${panelScale === 1 ? "fixed z-[10001]" : ""}`}
      style={{
        background: "var(--canvas-controls-bg)",
        borderColor: "var(--canvas-controls-border)",
        width: widthPx,
        left: panelScale === 1 ? placement.left : void 0,
        top: panelScale === 1 ? placement.top : void 0,
        bottom: panelScale === 1 ? placement.bottom : void 0,
        maxHeight: placement.maxHeight / panelScale,
        minHeight:
          stableHeight > 0
            ? Math.min(stableHeight, placement.maxHeight / panelScale)
            : void 0,
      }}
      onClick={(e2) => e2.stopPropagation()}
    >
      <div className="flex flex-col gap-4">{children2}</div>
    </div>
  );
  return reactDomExports.createPortal(
    panelScale === 1 ? (
      panel
    ) : (
      <div
        className="fixed z-[10001]"
        style={{
          left: placement.left,
          top: placement.top,
          bottom: placement.bottom,
          width: widthPx,
          transform: `scale(${panelScale})`,
          transformOrigin: placement.openUp ? "bottom left" : "top left",
        }}
      >
        {panel}
      </div>
    ),
    document.body,
  );
}
