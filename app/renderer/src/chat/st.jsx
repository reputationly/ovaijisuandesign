// st.jsx
import { jsxRuntimeExports, reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ot as CodeBlockContainer, rt as CodeBlockHeader, y3 as useClassNameMerger } from "./ae.jsx";
import { At as CodeBlockBody } from "./at.jsx";
import { nt as codeMetadataContext } from "../media-editing/wt.js";

var trimTrailingNewlines = (code) => {
  let codeLength = code.length;
  for (
    ;
    codeLength > 0 &&
    code[codeLength - 1] ===
      `
`;
  )
    codeLength--;
  return code.slice(0, codeLength);
};

var LazyHighlightedCodeBlockBody = reactExports.lazy(() =>
  (() => import("./highlighted-code-block-body.js"))().then((module) => ({
    default: module.HighlightedCodeBlockBody,
  })),
);

export var st = ({
  code,
  language,
  className,
  children,
  isIncomplete = false,
  startLine,
  lineNumbers,
  ...restProps
}) => {
  let mergeClassNames = useClassNameMerger(),
    codeWithoutTrailingNewline = reactExports.useMemo(() => trimTrailingNewlines(code), [code]),
    fallbackResult = reactExports.useMemo(
      () => ({
        bg: "transparent",
        fg: "inherit",
        tokens: codeWithoutTrailingNewline
          .split(
            `
`,
          )
          .map((codeLine) => [
            {
              content: codeLine,
              color: "inherit",
              bgColor: "transparent",
              htmlStyle: {},
              offset: 0,
            },
          ]),
      }),
      [codeWithoutTrailingNewline],
    );
  return (
    <codeMetadataContext.Provider
      value={{
        code,
      }}
    >
      {jsxRuntimeExports.jsxs(CodeBlockContainer, {
        isIncomplete,
        language,
        children: [
          jsxRuntimeExports.jsx(CodeBlockHeader, {
            language,
          }),
          children ? (
            <div
              className={mergeClassNames(
                "pointer-events-none sticky top-2 z-10 -mt-10 flex h-8 items-center justify-end",
              )}
            >
              <div
                className={mergeClassNames(
                  "pointer-events-auto flex shrink-0 items-center gap-2 rounded-md border border-sidebar bg-sidebar/80 px-1.5 py-1 supports-[backdrop-filter]:bg-sidebar/70 supports-[backdrop-filter]:backdrop-blur",
                )}
                data-streamdown="code-block-actions"
              >
                {children}
              </div>
            </div>
          ) : null,
          <reactExports.Suspense
            fallback={
              <CodeBlockBody
                className={className}
                language={language}
                lineNumbers={lineNumbers}
                result={fallbackResult}
                startLine={startLine}
                {...restProps}
              />
            }
          >
            {jsxRuntimeExports.jsx(LazyHighlightedCodeBlockBody, {
              className,
              code: codeWithoutTrailingNewline,
              language,
              lineNumbers,
              raw: fallbackResult,
              startLine,
              ...restProps,
            })}
          </reactExports.Suspense>,
        ],
      })}
    </codeMetadataContext.Provider>
  );
};
