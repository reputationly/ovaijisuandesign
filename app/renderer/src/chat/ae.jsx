// ae.jsx
import { vn, xn } from "./xn.js";
import { clsx, jsxRuntimeExports, L, reactExports } from "../vendor.js";
import { twMerge } from "../infra/dialog-content.jsx";
import { ct2, D3, He } from "../media-editing/wt.js";
import { __jsx } from "../shared/jsx-runtime.js";

export const CHAT_CONTENT_MAX_WIDTH_PX = 880;

export var he = (...e2) => twMerge(clsx(e2));

export var W2 = (e2, t2, o2) => {
  let n2 = typeof t2 == "string" && o2.startsWith("text/csv") ? "\uFEFF" : "",
    r2 =
      typeof t2 == "string"
        ? new Blob([n2 + t2], {
            type: o2,
          })
        : t2,
    s2 = URL.createObjectURL(r2),
    a2 = document.createElement("a");
  ((a2.href = s2),
    (a2.download = e2),
    document.body.appendChild(a2),
    a2.click(),
    document.body.removeChild(a2),
    URL.revokeObjectURL(s2));
};

export var Ee = reactExports.createContext(he);

export var y3 = () => reactExports.useContext(Ee);

export var ot = ({
  className: e2,
  language: t2,
  style: o2,
  isIncomplete: n2,
  ...r2
}) => {
  let s2 = y3();
  return (
    <div
      className={s2(
        "my-4 flex w-full flex-col gap-2 rounded-xl border border-border bg-sidebar p-2",
        e2,
      )}
      data-incomplete={n2 || void 0}
      data-language={t2}
      data-streamdown="code-block"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "auto 200px",
        ...o2,
      }}
      {...r2}
    />
  );
};

export var rt = ({ language: e2 }) => {
  let t2 = y3();
  return (
    <div
      className={t2("flex h-8 items-center text-muted-foreground text-xs")}
      data-language={e2}
      data-streamdown="code-block-header"
    >
      <span className={t2("ml-1 font-mono lowercase")}>{e2}</span>
    </div>
  );
};

export var Oe = () => {
  let { Loader2Icon: e2 } = L(),
    t2 = y3();
  return (
    <div
      className={t2(
        "w-full divide-y divide-border overflow-hidden rounded-xl border border-border",
      )}
    >
      <div className={t2("h-[46px] w-full bg-muted/80")} />
      <div className={t2("flex w-full items-center justify-center p-4")}>
        {jsxRuntimeExports.jsx(e2, {
          className: t2("size-4 animate-spin"),
        })}
      </div>
    </div>
  );
};

var ke = 0;

export var le = () => {
  ((ke += 1), ke === 1 && (document.body.style.overflow = "hidden"));
};

export var ce = () => {
  ((ke = Math.max(0, ke - 1)), ke === 0 && (document.body.style.overflow = ""));
};

export var ao = (e2) => {
  var o2;
  let t2 = ct2();
  return t2 != null &&
    t2.renderers &&
    e2 &&
    (o2 = t2.renderers.find((n2) =>
      Array.isArray(n2.language)
        ? n2.language.includes(e2)
        : n2.language === e2,
    )) != null
    ? o2
    : null;
};

export var To = (e2, t2) => {
  if (typeof e2 == "boolean") return e2;
  let o2 = e2.code;
  return o2 === false
    ? false
    : o2 === true || o2 === void 0
      ? true
      : o2[t2] !== false;
};

export var Fe = (e2, t2) => {
  if (typeof e2 == "boolean") return e2;
  let o2 = e2.mermaid;
  return o2 === false
    ? false
    : o2 === true || o2 === void 0
      ? true
      : o2[t2] !== false;
};

var Ys = {
  shikiTheme: vn,
  controls: true,
  isAnimating: false,
  lineNumbers: true,
  mode: "streaming",
  mermaid: void 0,
  linkSafety: xn,
};

export var R = reactExports.createContext(Ys);

export var Ae = ({
  onCopy: e2,
  onError: t2,
  timeout: o2 = 2e3,
  children: n2,
  className: r2,
  code: s2,
  ...a2
}) => {
  let l2 = y3(),
    [i2, d2] = reactExports.useState(false),
    c3 = reactExports.useRef(0),
    { code: p3 } = He(),
    { isAnimating: m3 } = reactExports.useContext(R),
    u4 = D3(),
    f2 = s2 != null ? s2 : p3,
    h2 = async () => {
      var T2;
      if (
        typeof window == "undefined" ||
        !(
          (T2 = navigator == null ? void 0 : navigator.clipboard) != null &&
          T2.writeText
        )
      ) {
        t2 == null || t2(new Error("Clipboard API not available"));
        return;
      }
      try {
        i2 ||
          (await navigator.clipboard.writeText(f2),
          d2(true),
          e2 == null || e2(),
          (c3.current = window.setTimeout(() => d2(false), o2)));
      } catch (v2) {
        t2 == null || t2(v2);
      }
    };
  reactExports.useEffect(
    () => () => {
      window.clearTimeout(c3.current);
    },
    [],
  );
  let b3 = L(),
    g2 = i2 ? b3.CheckIcon : b3.CopyIcon;
  return (
    <button
      className={l2(
        "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
        r2,
      )}
      data-streamdown="code-block-copy-button"
      disabled={m3}
      onClick={h2}
      title={u4.copyCode}
      type="button"
      {...a2}
    >
      {n2 != null
        ? n2
        : jsxRuntimeExports.jsx(g2, {
            size: 14,
          })}
    </button>
  );
};
