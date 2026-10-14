// 主题脚本像 next-themes，仓库里没有这个包。z$3 被设置页当成 useTheme。
import reactExports from "react";

var M$3 = (e2, i2, s2, u4, m3, a2, l2, h2) => {
  let d2 = document.documentElement,
    w3 = ["light", "dark"];
  function p3(n2) {
    (Array.isArray(e2) ? e2 : [e2]).forEach(y4 => {
      let k2 = y4 === "class",
        S3 = k2 && a2 ? m3.map(f2 => a2[f2] || f2) : m3;
      k2 ? (d2.classList.remove(...S3), d2.classList.add(a2 && a2[n2] ? a2[n2] : n2)) : d2.setAttribute(y4, n2);
    }), R2(n2);
  }
  function R2(n2) {
    h2 && w3.includes(n2) && (d2.style.colorScheme = n2);
  }
  function c3() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  if (u4) p3(u4);else try {
    let n2 = localStorage.getItem(i2) || s2,
      y4 = l2 && n2 === "system" ? c3() : n2;
    p3(y4);
  } catch (n2) {}
};
var x$4 = reactExports.createContext(void 0),
  U$3 = {
    setTheme: e2 => {},
    themes: []
  },
  z$3 = () => {
    var e2;
    return (e2 = reactExports.useContext(x$4)) != null ? e2 : U$3;
  };
reactExports.memo(({
  forcedTheme: e2,
  storageKey: i2,
  attribute: s2,
  enableSystem: u4,
  enableColorScheme: m3,
  defaultTheme: a2,
  value: l2,
  themes: h2,
  nonce: d2,
  scriptProps: w3
}) => {
  let p3 = JSON.stringify([s2, i2, a2, e2, h2, l2, u4, m3]).slice(1, -1);
  return reactExports.createElement("script", {
    ...w3,
    suppressHydrationWarning: true,
    nonce: typeof window == "undefined" ? d2 : "",
    dangerouslySetInnerHTML: {
      __html: `(${M$3.toString()})(${p3})`
    }
  });
});

export { z$3 as useTheme };
