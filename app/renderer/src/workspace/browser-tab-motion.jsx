// browser-tab-motion.jsx
import reactExports from "react";
import { __jsx } from "../shared/jsx-runtime.js";

export function BrowserTabMotion({
  id,
  entering,
  exiting,
  className,
  children,
  onExit,
}) {
  const ref = reactExports.useRef(null);
  const interrupted = reactExports.useRef(null);
  const closeAppearance = reactExports.useRef(null);
  const captureCloseAppearance = (target) => {
    if (!(target instanceof Element)) return;
    const closeButton = target.closest("[data-browser-tab-close]");
    const node = ref.current;
    if (!closeButton || !node) return;
    const style = getComputedStyle(node);
    closeAppearance.current = {
      backgroundColor: style.backgroundColor,
      color: style.color,
      opacity: getComputedStyle(closeButton).opacity,
    };
  };
  reactExports.useLayoutEffect(() => {
    const node = ref.current;
    if (!node || (!entering && !exiting)) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches || typeof node.animate !== "function") {
      if (exiting) onExit(id);
      return;
    }
    const width = node.getBoundingClientRect().width;
    const computed = getComputedStyle(node);
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
    const animation = node.animate(
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
    const closeButton = node.querySelector("[data-browser-tab-close]");
    const closeAnimation =
      exiting && closeButton && closeAppearance.current
        ? closeButton.animate(
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
      if (exiting) onExit(id);
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
        const current = getComputedStyle(node);
        const currentWidth = `${node.getBoundingClientRect().width}px`;
        interrupted.current = {
          minWidth: currentWidth,
          maxWidth: currentWidth,
          flexBasis: currentWidth,
          paddingLeft: current.paddingLeft,
          paddingRight: current.paddingRight,
          marginRight: current.marginRight,
          opacity: current.opacity,
          transform: current.transform,
        };
      } else interrupted.current = null;
      closeAnimation?.cancel();
      animation.removeEventListener("finish", finish);
      reduced.removeEventListener("change", handleReducedMotion);
      animation.cancel();
    };
  }, [entering, exiting, id, onExit]);
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
      {children}
    </div>
  );
}
