import { reactExports, jsxRuntimeExports } from "./vendor.js";
import { R as R$1 } from "./chat/ae.jsx";
import { Li } from "./media-editing/wt.js";
import { At } from "./chat/at.jsx";
var R = ({ code: s, language: e, raw: t, className: h, startLine: d, lineNumbers: m, ...p }) => {
  let { shikiTheme: l } = reactExports.useContext(R$1), o = Li(), [a, i] = reactExports.useState(t);
  return reactExports.useEffect(() => {
    if (!o) {
      i(t);
      return;
    }
    let r = o.highlight({ code: s, language: e, themes: l }, (c) => {
      i(c);
    });
    r && i(r);
  }, [s, e, l, o, t]), jsxRuntimeExports.jsx(At, { className: h, language: e, lineNumbers: m, result: a, startLine: d, ...p });
};
export {
  R as HighlightedCodeBlockBody
};
