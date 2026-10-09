// browser-tab-motion.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";

export function BrowserTabMotion({
  id: id2,
  entering,
  exiting,
  className,
  children: children2,
  onExit,
}) {
  const ref = reactExports.useRef(null);
  const interrupted = reactExports.useRef(null);
  const closeAppearance = reactExports.useRef(null);
  const captureCloseAppearance = (target) => {
    if (!(target instanceof Element)) return;
    const close2 = target.closest("[data-browser-tab-close]");
    const node2 = ref.current;
    if (!close2 || !node2) return;
    const style2 = getComputedStyle(node2);
    closeAppearance.current = {
      backgroundColor: style2.backgroundColor,
      color: style2.color,
      opacity: getComputedStyle(close2).opacity,
    };
  };
  reactExports.useLayoutEffect(() => {
    const node2 = ref.current;
    if (!node2 || (!entering && !exiting)) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches || typeof node2.animate !== "function") {
      if (exiting) onExit(id2);
      return;
    }
    const width = node2.getBoundingClientRect().width;
    const computed = getComputedStyle(node2);
    const collapsed = {
      overflow: "hidden",
      minWidth: "0px",
      maxWidth: "0px",
      flexBasis: "0px",
      flexGrow: 0,
      paddingLeft: "0px",
      paddingRight: "0px",
      marginRight: "0px",
      opacity: 0,
      transform: "translateX(-4px)",
    };
    const expanded = {
      overflow: "hidden",
      minWidth: computed.minWidth,
      maxWidth: computed.maxWidth,
      flexBasis: computed.flexBasis,
      flexGrow: computed.flexGrow,
      paddingLeft: computed.paddingLeft,
      paddingRight: computed.paddingRight,
      marginRight: computed.marginRight,
      opacity: 1,
      transform: "translateX(0)",
    };
    const appearance =
      exiting && closeAppearance.current
        ? {
            backgroundColor: closeAppearance.current.backgroundColor,
            color: closeAppearance.current.color,
          }
        : {};
    const animation = node2.animate(
      exiting
        ? [
            {
              ...expanded,
              minWidth: `${width}px`,
              maxWidth: `${width}px`,
              flexBasis: `${width}px`,
              ...interrupted.current,
              ...appearance,
            },
            {
              ...collapsed,
              ...appearance,
            },
          ]
        : [collapsed, expanded],
      {
        duration: exiting ? 200 : 300,
        easing: exiting
          ? "cubic-bezier(.4, 0, .6, 1)"
          : "cubic-bezier(.22, 1, .36, 1)",
        fill: "both",
      },
    );
    const close2 = node2.querySelector("[data-browser-tab-close]");
    const closeAnimation =
      exiting && close2 && closeAppearance.current
        ? close2.animate(
            [
              {
                opacity: closeAppearance.current.opacity,
              },
              {
                opacity: closeAppearance.current.opacity,
              },
            ],
            {
              duration: 200,
              fill: "both",
            },
          )
        : null;
    const finish = () => {
      if (exiting) onExit(id2);
      else animation.cancel();
    };
    animation.addEventListener("finish", finish, {
      once: true,
    });
    const handleReducedMotion = () => {
      if (reduced.matches) animation.finish();
    };
    reduced.addEventListener("change", handleReducedMotion);
    return () => {
      if (animation.playState === "running") {
        const current2 = getComputedStyle(node2);
        const currentWidth = `${node2.getBoundingClientRect().width}px`;
        interrupted.current = {
          minWidth: currentWidth,
          maxWidth: currentWidth,
          flexBasis: currentWidth,
          paddingLeft: current2.paddingLeft,
          paddingRight: current2.paddingRight,
          marginRight: current2.marginRight,
          opacity: current2.opacity,
          transform: current2.transform,
        };
      } else interrupted.current = null;
      closeAnimation?.cancel();
      animation.removeEventListener("finish", finish);
      reduced.removeEventListener("change", handleReducedMotion);
      animation.cancel();
    };
  }, [entering, exiting, id2, onExit]);
  return (
    <div
      ref={ref}
      className={className}
      data-exiting={exiting}
      inert={exiting}
      aria-hidden={exiting || void 0}
      onPointerDownCapture={(event) => captureCloseAppearance(event.target)}
      onKeyDownCapture={(event) => {
        if (event.key === "Enter" || event.key === " ")
          captureCloseAppearance(event.target);
      }}
    >
      {children2}
    </div>
  );
}
