import { reactExports, jsxRuntimeExports } from "../vendor.js";
import { R as markdownRenderOptionsContext } from "./ae.jsx";
import { Li as useCodeHighlighter } from "../media-editing/wt.js";
import { At as CodeBlockBody } from "./at.jsx";
var R = ({ code, language, raw: rawResult, className, startLine, lineNumbers, ...restProps }) => {
  let { shikiTheme } = reactExports.useContext(markdownRenderOptionsContext), highlighter = useCodeHighlighter(), [highlightedResult, setHighlightedResult] = reactExports.useState(rawResult);
  return reactExports.useEffect(() => {
    if (!highlighter) {
      setHighlightedResult(rawResult);
      return;
    }
    let initialHighlightResult = highlighter.highlight({ code, language, themes: shikiTheme }, (highlightResult) => {
      setHighlightedResult(highlightResult);
    });
    initialHighlightResult && setHighlightedResult(initialHighlightResult);
  }, [code, language, shikiTheme, highlighter, rawResult]), jsxRuntimeExports.jsx(CodeBlockBody, { className, language, lineNumbers, result: highlightedResult, startLine, ...restProps });
};
export {
  R as HighlightedCodeBlockBody
};
