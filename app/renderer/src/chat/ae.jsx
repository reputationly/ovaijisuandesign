// ae.jsx
import { vn as defaultCodeThemes, xn as defaultLinkSafety } from "./xn.js";
import { clsx, jsxRuntimeExports, L as useIconComponents, reactExports } from "../vendor.js";
import { twMerge } from "../infra/dialog-content.jsx";
import { ct2 as useMarkdownRenderOptions, D3 as useMarkdownUiLabels, He as useCodeBlockContext } from "../media-editing/wt.js";
import { __jsx } from "../shared/jsx-runtime.js";

export const CHAT_CONTENT_MAX_WIDTH_PX = 880;

export var he = (...classNames) => twMerge(clsx(classNames));

export var W2 = (fileName, downloadContent, mimeType) => {
  let byteOrderMarkPrefix = typeof downloadContent == "string" && mimeType.startsWith("text/csv") ? "\uFEFF" : "",
    blob =
      typeof downloadContent == "string"
        ? new Blob([byteOrderMarkPrefix + downloadContent], {
            type: mimeType,
          })
        : downloadContent,
    objectUrl = URL.createObjectURL(blob),
    downloadLink = document.createElement("a");
  ((downloadLink.href = objectUrl),
    (downloadLink.download = fileName),
    document.body.appendChild(downloadLink),
    downloadLink.click(),
    document.body.removeChild(downloadLink),
    URL.revokeObjectURL(objectUrl));
};

export var Ee = reactExports.createContext(he);

export var y3 = () => reactExports.useContext(Ee);

export var ot = ({
  className,
  language,
  style,
  isIncomplete,
  ...restProps
}) => {
  let mergeClassNames = y3();
  return (
    <div
      className={mergeClassNames(
        "my-4 flex w-full flex-col gap-2 rounded-xl border border-border bg-sidebar p-2",
        className,
      )}
      data-incomplete={isIncomplete || void 0}
      data-language={language}
      data-streamdown="code-block"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "auto 200px",
        ...style,
      }}
      {...restProps}
    />
  );
};

export var rt = ({ language }) => {
  let mergeClassNames = y3();
  return (
    <div
      className={mergeClassNames("flex h-8 items-center text-muted-foreground text-xs")}
      data-language={language}
      data-streamdown="code-block-header"
    >
      <span className={mergeClassNames("ml-1 font-mono lowercase")}>{language}</span>
    </div>
  );
};

export var Oe = () => {
  let { Loader2Icon: loadingIcon } = useIconComponents(),
    mergeClassNames = y3();
  return (
    <div
      className={mergeClassNames(
        "w-full divide-y divide-border overflow-hidden rounded-xl border border-border",
      )}
    >
      <div className={mergeClassNames("h-[46px] w-full bg-muted/80")} />
      <div className={mergeClassNames("flex w-full items-center justify-center p-4")}>
        {jsxRuntimeExports.jsx(loadingIcon, {
          className: mergeClassNames("size-4 animate-spin"),
        })}
      </div>
    </div>
  );
};

var scrollLockCount = 0;

export var le = () => {
  ((scrollLockCount += 1), scrollLockCount === 1 && (document.body.style.overflow = "hidden"));
};

export var ce = () => {
  ((scrollLockCount = Math.max(0, scrollLockCount - 1)), scrollLockCount === 0 && (document.body.style.overflow = ""));
};

export var ao = (language) => {
  var languageRenderer;
  let renderOptions = useMarkdownRenderOptions();
  return renderOptions != null &&
    renderOptions.renderers &&
    language &&
    (languageRenderer = renderOptions.renderers.find((candidateRenderer) =>
      Array.isArray(candidateRenderer.language)
        ? candidateRenderer.language.includes(language)
        : candidateRenderer.language === language,
    )) != null
    ? languageRenderer
    : null;
};

export var To = (renderOptions, language) => {
  if (typeof renderOptions == "boolean") return renderOptions;
  let codeOptions = renderOptions.code;
  return codeOptions === false
    ? false
    : codeOptions === true || codeOptions === void 0
      ? true
      : codeOptions[language] !== false;
};

export var Fe = (renderOptions, language) => {
  if (typeof renderOptions == "boolean") return renderOptions;
  let mermaidOptions = renderOptions.mermaid;
  return mermaidOptions === false
    ? false
    : mermaidOptions === true || mermaidOptions === void 0
      ? true
      : mermaidOptions[language] !== false;
};

var defaultMarkdownRenderOptions = {
  shikiTheme: defaultCodeThemes,
  controls: true,
  isAnimating: false,
  lineNumbers: true,
  mode: "streaming",
  mermaid: void 0,
  linkSafety: defaultLinkSafety,
};

export var R = reactExports.createContext(defaultMarkdownRenderOptions);

export var Ae = ({
  onCopy,
  onError,
  timeout = 2e3,
  children,
  className,
  code,
  ...buttonProps
}) => {
  let mergeClassNames = y3(),
    [isCopied, setIsCopied] = reactExports.useState(false),
    copyResetTimeoutRef = reactExports.useRef(0),
    { code: contextualCode } = useCodeBlockContext(),
    { isAnimating } = reactExports.useContext(R),
    localizedLabels = useMarkdownUiLabels(),
    codeToCopy = code != null ? code : contextualCode,
    handleCopy = async () => {
      var clipboardApi;
      if (
        typeof window == "undefined" ||
        !(
          (clipboardApi = navigator == null ? void 0 : navigator.clipboard) != null &&
          clipboardApi.writeText
        )
      ) {
        onError == null || onError(new Error("Clipboard API not available"));
        return;
      }
      try {
        isCopied ||
          (await navigator.clipboard.writeText(codeToCopy),
          setIsCopied(true),
          onCopy == null || onCopy(),
          (copyResetTimeoutRef.current = window.setTimeout(() => setIsCopied(false), timeout)));
      } catch (error) {
        onError == null || onError(error);
      }
    };
  reactExports.useEffect(
    () => () => {
      window.clearTimeout(copyResetTimeoutRef.current);
    },
    [],
  );
  let iconComponents = useIconComponents(),
    copyFeedbackIcon = isCopied ? iconComponents.CheckIcon : iconComponents.CopyIcon;
  return (
    <button
      className={mergeClassNames(
        "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      data-streamdown="code-block-copy-button"
      disabled={isAnimating}
      onClick={handleCopy}
      title={localizedLabels.copyCode}
      type="button"
      {...buttonProps}
    >
      {children != null
        ? children
        : jsxRuntimeExports.jsx(copyFeedbackIcon, {
            size: 14,
          })}
    </button>
  );
};
