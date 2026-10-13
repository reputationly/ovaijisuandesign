// at.jsx
import { he as mergeClassNames, y3 as useClassNameMerger } from "./ae.jsx";
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";

var lineNumberClassName = mergeClassNames(
  "block",
  "before:content-[counter(line)]",
  "before:inline-block",
  "before:[counter-increment:line]",
  "before:w-6",
  "before:mr-4",
  "before:text-[13px]",
  "before:text-right",
  "before:text-muted-foreground/50",
  "before:font-mono",
  "before:select-none",
);

var parseInlineStyle = (styleText) => {
  let styleProperties = {};
  for (let styleDeclaration of styleText.split(";")) {
    let colonIndex = styleDeclaration.indexOf(":");
    if (colonIndex > 0) {
      let styleProperty = styleDeclaration.slice(0, colonIndex).trim(),
        styleValue = styleDeclaration.slice(colonIndex + 1).trim();
      styleProperty && styleValue && (styleProperties[styleProperty] = styleValue);
    }
  }
  return styleProperties;
};

export var At = reactExports.memo(
  ({
    children,
    result,
    language,
    className,
    startLine,
    lineNumbers = true,
    ...restProps
  }) => {
    let mergeClassNames = useClassNameMerger(),
      codeLineNumberClassName = reactExports.useMemo(() => mergeClassNames(lineNumberClassName), [mergeClassNames]),
      rootStyle = reactExports.useMemo(() => {
        let codeBlockStyle = {};
        return (
          result.bg && (codeBlockStyle["--sdm-bg"] = result.bg),
          result.fg && (codeBlockStyle["--sdm-fg"] = result.fg),
          result.rootStyle && Object.assign(codeBlockStyle, parseInlineStyle(result.rootStyle)),
          codeBlockStyle
        );
      }, [result.bg, result.fg, result.rootStyle]);
    return (
      <div
        className={mergeClassNames(
          className,
          "overflow-x-auto rounded-md border border-border bg-background p-4 text-sm",
        )}
        data-language={language}
        data-streamdown="code-block-body"
        {...restProps}
      >
        <pre
          className={mergeClassNames(
            className,
            "bg-[var(--sdm-bg,inherit]",
            "dark:bg-[var(--shiki-dark-bg,var(--sdm-bg,inherit)]",
          )}
          style={rootStyle}
        >
          <code
            className={
              lineNumbers
                ? mergeClassNames("[counter-increment:line_0] [counter-reset:line]")
                : void 0
            }
            style={
              lineNumbers && startLine && startLine > 1
                ? {
                    counterReset: `line ${startLine - 1}`,
                  }
                : void 0
            }
          >
            {result.tokens.map((tokenLine, tokenLineIndex) => (
              <span key={tokenLineIndex} className={lineNumbers ? codeLineNumberClassName : void 0}>
                {tokenLine.length === 0 || (tokenLine.length === 1 && tokenLine[0].content === "")
                  ? `
`
                  : tokenLine.map((token, tokenIndex) => {
                      let tokenStyle = {},
                        hasBackgroundColor = !!token.bgColor;
                      if (
                        (token.color && (tokenStyle["--sdm-c"] = token.color),
                        token.bgColor && (tokenStyle["--sdm-tbg"] = token.bgColor),
                        token.htmlStyle)
                      )
                        for (let [cssProperty, cssValue] of Object.entries(token.htmlStyle))
                          cssProperty === "color"
                            ? (tokenStyle["--sdm-c"] = cssValue)
                            : cssProperty === "background-color"
                              ? ((tokenStyle["--sdm-tbg"] = cssValue), (hasBackgroundColor = true))
                              : (tokenStyle[cssProperty] = cssValue);
                      return (
                        <span
                          key={tokenIndex}
                          className={mergeClassNames(
                            "text-[var(--sdm-c,inherit)]",
                            "dark:text-[var(--shiki-dark,var(--sdm-c,inherit))]",
                            hasBackgroundColor && "bg-[var(--sdm-tbg)]",
                            hasBackgroundColor &&
                              "dark:bg-[var(--shiki-dark-bg,var(--sdm-tbg))]",
                          )}
                          style={tokenStyle}
                          {...token.htmlAttrs}
                        >
                          {token.content}
                        </span>
                      );
                    })}
              </span>
            ))}
          </code>
        </pre>
      </div>
    );
  },
  (previousProps, nextProps) =>
    previousProps.result === nextProps.result &&
    previousProps.language === nextProps.language &&
    previousProps.className === nextProps.className &&
    previousProps.startLine === nextProps.startLine &&
    previousProps.lineNumbers === nextProps.lineNumbers,
);
