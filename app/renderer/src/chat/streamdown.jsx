// streamdown.jsx
import {
  at as iconContextProvider,
  clsx,
  cn as preserveLiteralTagContent,
  defaultSchema,
  E2 as areMarkdownPropsEqual,
  Jo as MarkdownParagraph,
  jsxRuntimeExports,
  kt as splitMarkdownIntoBlocks,
  L as useMarkdownIcons,
  ln as preserveHtmlWhitespace,
  mn as preserveRawTagContent,
  qe as haveSameNodePosition,
  reactDomExports,
  reactExports,
  remarkGfm,
  toJsxRuntime,
  un as attachCodeMetadata,
  visit,
} from "../vendor.js";
import { harden } from "rehype-harden";
import {
  Be as markdownTranslationContext,
  D3 as useMarkdownTranslations,
  de as useMermaidOptions,
  De as defaultMarkdownTranslations,
  et as incompleteCodeContext,
  He as useCodeMetadata,
  ks as createMarkdownProcessor,
  on as identityUrlTransform,
  Ts as shouldSkipElement,
  tt as useIsIncompleteCode,
  Ve as markdownRenderContext,
  vs as replaceNodeWithText,
  wt as MarkdownRenderCache,
  xs as transformUrlProperties,
} from "../media-editing/wt.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { rehypeSanitize } from "../settings/request-prompt-prefill.jsx";
import { rehypeRaw } from "../workspace/build-inspiration-media-showcase-collections.js";
import { Ae as CopyCodeButton, ao as findRendererForLanguage, ce as unlockBodyScroll, Ee as classNameMergerContext, Fe as isMermaidActionEnabled, he as mergeClassNames, le as lockBodyScroll, Oe as CodeBlockLoadingPlaceholder, R as markdownRenderOptionsContext, To as isCodeActionEnabled, W2 as downloadFile, y3 as useClassNameMerger } from "./ae.jsx";
import { mermaidGHXKKRXX } from "./mermaid-ghxkkrxx.js";
import { Yt as fileExtensionByMimeType } from "./yt.js";
import { st as HighlightedCodeBlock } from "./st.jsx";
import { co as MermaidDownloadButton } from "./co.jsx";
import { fo as MarkdownImage } from "./fo.jsx";
import { Te as TableCopyButton } from "./te.jsx";
import { Pe as TableDownloadMenu } from "./pe.jsx";
import { twMerge } from "../infra/dialog-content.jsx";
import { $e$1 as remendMarkdown, be as createAnimatePlugin } from "../vendor-inline/minified/s2.js";
import { vn as defaultCodeTheme, xn as defaultLinkSafety } from "./xn.js";
var rtlCharacterPattern = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
var unicodeLetterPattern = new RegExp("\\p{L}", "u");
function getTextDirection(markdownText) {
  let textWithoutMarkdownSyntax = markdownText
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*{1,3}|_{1,3})/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^[\s>*\-+\d.]+/gm, "");
  for (let character of textWithoutMarkdownSyntax) {
    if (rtlCharacterPattern.test(character)) return "rtl";
    if (unicodeLetterPattern.test(character)) return "ltr";
  }
  return "ltr";
}
var fencedCodeStartPattern = /^[ \t]{0,3}(`{3,}|~{3,})/;
var tableDelimiterPattern = /^\|?[ \t]*:?-{1,}:?[ \t]*(\|[ \t]*:?-{1,}:?[ \t]*)*\|?$/;
var hasUnclosedCodeFence = (markdownText) => {
  let sourceLines = markdownText.split(`
`),
    fenceMarker = null,
    fenceLength = 0;
  for (let line of sourceLines) {
    let fenceMatch = fencedCodeStartPattern.exec(line);
    if (fenceMarker === null) {
      if (fenceMatch) {
        let fenceLineMatch = fenceMatch[1];
        ((fenceMarker = fenceLineMatch[0]), (fenceLength = fenceLineMatch.length));
      }
    } else if (fenceMatch) {
      let delimiterMatch = fenceMatch[1],
        delimiterText = delimiterMatch[0],
        delimiterLength = delimiterMatch.length;
      delimiterText === fenceMarker && delimiterLength >= fenceLength && ((fenceMarker = null), (fenceLength = 0));
    }
  }
  return fenceMarker !== null;
};
var hasTableSeparator = (markdownText) => {
  let lines = markdownText.split(`
`);
  for (let line of lines) {
    let trimmedLine = line.trim();
    if (trimmedLine.length > 0 && trimmedLine.includes("|") && tableDelimiterPattern.test(trimmedLine)) return true;
  }
  return false;
};
var markdownProcessorCache = new MarkdownRenderCache();
var getMarkdownProcessor = (processorOptions) => {
  let cachedProcessor = markdownProcessorCache.get(processorOptions);
  if (cachedProcessor) return cachedProcessor;
  let markdownProcessor = createMarkdownProcessor(processorOptions);
  return (markdownProcessorCache.set(processorOptions, markdownProcessor), markdownProcessor);
};
var renderHastToJsx = (tree, options) => {
  let {
    allowElement,
    allowedElements,
    disallowedElements,
    skipHtml,
    unwrapDisallowed,
    urlTransform,
  } = options;
  if (allowElement || allowedElements || disallowedElements || skipHtml || urlTransform) {
    let sanitizedUrlTransform = urlTransform || identityUrlTransform;
    visit(tree, (htmlElement, childIndex, parentNode) => {
      if (htmlElement.type === "raw" && parentNode && typeof childIndex == "number")
        return (replaceNodeWithText(parentNode, childIndex, skipHtml, htmlElement.value), childIndex);
      if (
        htmlElement.type === "element" &&
        (transformUrlProperties(htmlElement, sanitizedUrlTransform), shouldSkipElement(htmlElement, childIndex, parentNode, allowedElements, disallowedElements, allowElement) && parentNode && typeof childIndex == "number")
      )
        return (
          unwrapDisallowed && htmlElement.children
            ? parentNode.children.splice(childIndex, 1, ...htmlElement.children)
            : parentNode.children.splice(childIndex, 1),
          childIndex
        );
    });
  }
  return toJsxRuntime(tree, {
    Fragment: jsxRuntimeExports.Fragment,
    components: options.components,
    ignoreInvalidStyle: true,
    jsx: jsxRuntimeExports.jsx,
    jsxs: jsxRuntimeExports.jsxs,
    passKeys: true,
    passNode: true,
  });
};
var MarkdownBlockRenderer = (markdownProps) => {
  let processor = getMarkdownProcessor(markdownProps),
    markdownSource = markdownProps.children || "",
    renderedTree = processor.runSync(processor.parse(markdownSource), markdownSource);
  return renderHastToJsx(renderedTree, markdownProps);
};
var prefixClassNames = (prefix, classNames) => {
  if (!prefix || !classNames) return classNames;
  let classNamePrefix = `${prefix}:`;
  return classNames
    .split(/\s+/)
    .filter(Boolean)
    .map((className) => (className.startsWith(classNamePrefix) ? className : `${prefix}:${className}`))
    .join(" ");
};
var createClassNameMerger = (prefix) => (prefix ? (...classValues) => prefixClassNames(prefix, twMerge(clsx(classValues))) : mergeClassNames);
var FileDownloadButton = ({
  onDownload,
  onError,
  language,
  children,
  className,
  code,
  ...additionalProps
}) => {
  let mergeClasses = useClassNameMerger(),
    { code: contextCode } = useCodeMetadata(),
    { isAnimating } = reactExports.useContext(markdownRenderOptionsContext),
    translationStrings = useMarkdownTranslations(),
    markdownIcons = useMarkdownIcons(),
    codeContent = code != null ? code : contextCode,
    downloadFilename = `file.${language && language in fileExtensionByMimeType ? fileExtensionByMimeType[language] : "txt"}`,
    mimeType = "text/plain",
    handleDownload = () => {
      try {
        (downloadFile(downloadFilename, codeContent, mimeType), onDownload == null || onDownload());
      } catch (downloadError) {
        onError == null || onError(downloadError);
      }
    };
  return (
    <button
      className={mergeClasses(
        "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      data-streamdown="code-block-download-button"
      disabled={isAnimating}
      onClick={handleDownload}
      title={translationStrings.downloadFile}
      type="button"
      {...additionalProps}
    >
      {children != null ? children : <markdownIcons.DownloadIcon size={14} />}
    </button>
  );
};
var fileExtensionPattern = /\.[^/.]+$/;
var MarkdownImageRenderer = ({
  node: markdownNode,
  className,
  src,
  alt,
  onLoad,
  onError,
  ...additionalProps
}) => {
  let { DownloadIcon: downloadIcon } = useMarkdownIcons(),
    mergeClasses = useClassNameMerger(),
    imageElementRef = reactExports.useRef(null),
    [isLoaded, setIsLoaded] = reactExports.useState(false),
    [hasError, setHasError] = reactExports.useState(false),
    translations = useMarkdownTranslations(),
    hasImageDimensions = additionalProps.width != null || additionalProps.height != null,
    isImageReady = (isLoaded || hasImageDimensions) && !hasError,
    hasImageError = hasError && !hasImageDimensions;
  reactExports.useEffect(() => {
    let imageElement = imageElementRef.current;
    if (imageElement != null && imageElement.complete) {
      let hasLoadedImage = imageElement.naturalWidth > 0;
      (setIsLoaded(hasLoadedImage), setHasError(!hasLoadedImage));
    }
  }, []);
  let handleImageLoad = reactExports.useCallback(
      (loadEvent) => {
        (setIsLoaded(true), setHasError(false), onLoad == null || onLoad(loadEvent));
      },
      [onLoad],
    ),
    handleImageError = reactExports.useCallback(
      (errorEvent) => {
        (setIsLoaded(false), setHasError(true), onError == null || onError(errorEvent));
      },
      [onError],
    ),
    downloadImage = async () => {
      if (src)
        try {
          let imageBlob = await (await fetch(src)).blob(),
            downloadName =
              new URL(src, window.location.origin).pathname.split("/").pop() ||
              "",
            fileExtension = downloadName.split(".").pop(),
            hasKnownExtension = downloadName.includes(".") && fileExtension !== void 0 && fileExtension.length <= 4,
            fallbackExtension = "";
          if (hasKnownExtension) fallbackExtension = downloadName;
          else {
            let blobMimeType = imageBlob.type,
              fallbackMimeType = "png";
            (blobMimeType.includes("jpeg") || blobMimeType.includes("jpg")
              ? (fallbackMimeType = "jpg")
              : blobMimeType.includes("png")
                ? (fallbackMimeType = "png")
                : blobMimeType.includes("svg")
                  ? (fallbackMimeType = "svg")
                  : blobMimeType.includes("gif")
                    ? (fallbackMimeType = "gif")
                    : blobMimeType.includes("webp") && (fallbackMimeType = "webp"),
              (fallbackExtension = `${(alt || downloadName || "image").replace(fileExtensionPattern, "")}.${fallbackMimeType}`));
          }
          downloadFile(fallbackExtension, imageBlob, imageBlob.type);
        } catch (downloadError) {
          window.open(src, "_blank");
        }
    };
  return src ? (
    <div
      className={mergeClasses("group relative my-4 inline-block")}
      data-streamdown="image-wrapper"
    >
      <img
        alt={alt}
        className={mergeClasses("max-w-full rounded-lg", hasImageError && "hidden", className)}
        data-streamdown="image"
        onError={handleImageError}
        onLoad={handleImageLoad}
        ref={imageElementRef}
        src={src}
        {...additionalProps}
      />
      {hasImageError && (
        <span
          className={mergeClasses("text-muted-foreground text-xs italic")}
          data-streamdown="image-fallback"
        >
          {translations.imageNotAvailable}
        </span>
      )}
      <div
        className={mergeClasses(
          "pointer-events-none absolute inset-0 hidden rounded-lg bg-black/10 group-hover:block",
        )}
      />
      {isImageReady && (
        <button
          className={mergeClasses(
            "absolute right-2 bottom-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background/90 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-background",
            "opacity-0 group-hover:opacity-100",
          )}
          onClick={downloadImage}
          title={translations.downloadImage}
          type="button"
        >
          {jsxRuntimeExports.jsx(downloadIcon, {
            size: 14,
          })}
        </button>
      )}
    </div>
  ) : null;
};
var ExternalLinkConfirmation = ({ url, isOpen, onClose, onConfirm }) => {
  let { CheckIcon: checkIcon, CopyIcon: copyIcon, ExternalLinkIcon: externalLinkIcon, XIcon: xIcon } = useMarkdownIcons(),
    mergeClasses = useClassNameMerger(),
    [hasCopiedLink, setHasCopiedLink] = reactExports.useState(false),
    translations = useMarkdownTranslations(),
    copyLinkToClipboard = reactExports.useCallback(async () => {
      try {
        (await navigator.clipboard.writeText(url),
          setHasCopiedLink(true),
          setTimeout(() => setHasCopiedLink(false), 2e3));
      } catch (caughtError) {}
    }, [url]),
    confirmAndClose = reactExports.useCallback(() => {
      (onConfirm(), onClose());
    }, [onConfirm, onClose]);
  return (
    reactExports.useEffect(() => {
      if (isOpen) {
        lockBodyScroll();
        let handleKeyDown = (keyboardEvent) => {
          keyboardEvent.key === "Escape" && onClose();
        };
        return (
          document.addEventListener("keydown", handleKeyDown),
          () => {
            (document.removeEventListener("keydown", handleKeyDown), unlockBodyScroll());
          }
        );
      }
    }, [isOpen, onClose]),
    isOpen ? (
      <div
        className={mergeClasses(
          "fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm",
        )}
        data-streamdown="link-safety-modal"
        onClick={onClose}
        onKeyDown={(keyboardEvent) => {
          keyboardEvent.key === "Escape" && onClose();
        }}
        role="button"
        tabIndex={0}
      >
        <div
          className={mergeClasses(
            "relative mx-4 flex w-full max-w-md flex-col gap-4 rounded-xl border bg-background p-6 shadow-lg",
          )}
          onClick={(clickEvent) => clickEvent.stopPropagation()}
          onKeyDown={(keyboardEvent) => keyboardEvent.stopPropagation()}
          role="presentation"
        >
          <button
            className={mergeClasses(
              "absolute top-4 right-4 rounded-md p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
            )}
            onClick={onClose}
            title={translations.close}
            type="button"
          >
            {jsxRuntimeExports.jsx(xIcon, {
              size: 16,
            })}
          </button>
          <div className={mergeClasses("flex flex-col gap-2")}>
            <div
              className={mergeClasses("flex items-center gap-2 font-semibold text-lg")}
            >
              {jsxRuntimeExports.jsx(externalLinkIcon, {
                size: 20,
              })}
              <span>{translations.openExternalLink}</span>
            </div>
            <p className={mergeClasses("text-muted-foreground text-sm")}>
              {translations.externalLinkWarning}
            </p>
          </div>
          <div
            className={mergeClasses(
              "break-all rounded-md bg-muted p-3 font-mono text-sm",
              url.length > 100 && "max-h-32 overflow-y-auto",
            )}
          >
            {url}
          </div>
          <div className={mergeClasses("flex gap-2")}>
            <button
              className={mergeClasses(
                "flex flex-1 items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 font-medium text-sm transition-all hover:bg-muted",
              )}
              onClick={copyLinkToClipboard}
              type="button"
            >
              {hasCopiedLink ? (
                <>
                  {jsxRuntimeExports.jsx(checkIcon, {
                    size: 14,
                  })}
                  <span>{translations.copied}</span>
                </>
              ) : (
                <>
                  {jsxRuntimeExports.jsx(copyIcon, {
                    size: 14,
                  })}
                  <span>{translations.copyLink}</span>
                </>
              )}
            </button>
            <button
              className={mergeClasses(
                "flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-all hover:bg-primary/90",
              )}
              onClick={confirmAndClose}
              type="button"
            >
              {jsxRuntimeExports.jsx(externalLinkIcon, {
                size: 14,
              })}
              <span>{translations.openLink}</span>
            </button>
          </div>
        </div>
      </div>
    ) : null
  );
};
var TableFullscreenButton = ({
  children,
  className,
  showCopy = true,
  showDownload = true,
}) => {
  let { Maximize2Icon: maximizeIcon, XIcon: xIcon } = useMarkdownIcons(),
    mergeClasses = useClassNameMerger(),
    [isFullscreen, setIsFullscreen] = reactExports.useState(false),
    { isAnimating } = reactExports.useContext(markdownRenderOptionsContext),
    translations = useMarkdownTranslations(),
    openFullscreen = () => {
      setIsFullscreen(true);
    },
    closeFullscreen = () => {
      setIsFullscreen(false);
    };
  return (
    reactExports.useEffect(() => {
      if (isFullscreen) {
        lockBodyScroll();
        let handleFullscreenKeyDown = (keyboardEvent) => {
          keyboardEvent.key === "Escape" && setIsFullscreen(false);
        };
        return (
          document.addEventListener("keydown", handleFullscreenKeyDown),
          () => {
            (document.removeEventListener("keydown", handleFullscreenKeyDown), unlockBodyScroll());
          }
        );
      }
    }, [isFullscreen]),
    (
      <>
        <button
          className={mergeClasses(
            "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          disabled={isAnimating}
          onClick={openFullscreen}
          title={translations.viewFullscreen}
          type="button"
        >
          {jsxRuntimeExports.jsx(maximizeIcon, {
            size: 14,
          })}
        </button>
        {isFullscreen
          ? reactDomExports.createPortal(
              <div
                aria-label={translations.viewFullscreen}
                aria-modal="true"
                className={mergeClasses("fixed inset-0 z-50 flex flex-col bg-background")}
                data-streamdown="table-fullscreen"
                onClick={closeFullscreen}
                onKeyDown={(keyboardEvent) => {
                  keyboardEvent.key === "Escape" && closeFullscreen();
                }}
                role="dialog"
              >
                <div
                  className={mergeClasses("flex h-full flex-col")}
                  onClick={(clickEvent) => clickEvent.stopPropagation()}
                  onKeyDown={(keyboardEvent) => keyboardEvent.stopPropagation()}
                  role="presentation"
                >
                  <div
                    className={mergeClasses("flex items-center justify-end gap-1 p-4")}
                  >
                    {showCopy ? <TableCopyButton /> : null}
                    {showDownload ? <TableDownloadMenu /> : null}
                    <button
                      className={mergeClasses(
                        "rounded-md p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
                      )}
                      onClick={closeFullscreen}
                      title={translations.exitFullscreen}
                      type="button"
                    >
                      {jsxRuntimeExports.jsx(xIcon, {
                        size: 20,
                      })}
                    </button>
                  </div>
                  <div
                    className={mergeClasses(
                      "flex-1 overflow-auto p-4 pt-0 [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10",
                    )}
                  >
                    <table
                      className={mergeClasses(
                        "w-full border-collapse border border-border",
                      )}
                      data-streamdown="table"
                    >
                      {children}
                    </table>
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null}
      </>
    )
  );
};
var MarkdownTableWrapper = ({
  children,
  className,
  showControls,
  showCopy = true,
  showDownload = true,
  showFullscreen = true,
  ...additionalProps
}) => {
  let mergeClasses = useClassNameMerger(),
    canCopyTable = showControls && showCopy,
    canDownloadTable = showControls && showDownload,
    canShowFullscreen = showControls && showFullscreen,
    hasTableActions = canCopyTable || canDownloadTable || canShowFullscreen;
  return (
    <div
      className={mergeClasses(
        "my-4 flex flex-col gap-2 rounded-lg border border-border bg-sidebar p-2",
      )}
      data-streamdown="table-wrapper"
    >
      {hasTableActions ? (
        <div className={mergeClasses("flex items-center justify-end gap-1")}>
          {canCopyTable ? <TableCopyButton /> : null}
          {canDownloadTable ? <TableDownloadMenu /> : null}
          {canShowFullscreen ? (
            <TableFullscreenButton showCopy={canCopyTable} showDownload={canDownloadTable}>
              {children}
            </TableFullscreenButton>
          ) : null}
        </div>
      ) : null}
      <div
        className={mergeClasses(
          "border-collapse overflow-x-auto overflow-y-auto rounded-md border border-border bg-background",
        )}
      >
        <table
          className={mergeClasses("w-full divide-y divide-border", className)}
          data-streamdown="table"
          {...additionalProps}
        >
          {children}
        </table>
      </div>
    </div>
  );
};
var startingLinePattern = /startLine=(\d+)/;
var noLineNumbersPattern = /\bnoLineNumbers\b/;
var MermaidRenderer = reactExports.lazy(() =>
  (() => Promise.resolve().then(() => mermaidGHXKKRXX))().then((loadedMermaidModule) => ({
    default: loadedMermaidModule.Mermaid,
  })),
);
var languageClassPattern = /language-([^\s]+)/;
var isOptionEnabled = (controls, controlName) => (typeof controls == "boolean" ? controls : controls[controlName] !== false);
var isTableActionEnabled = (controls, actionName) => {
  if (typeof controls == "boolean") return controls;
  let tableNode = controls.table;
  return tableNode === false
    ? false
    : tableNode === true || tableNode === void 0
      ? true
      : tableNode[actionName] !== false;
};
var MarkdownOrderedList = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    let mergeClasses = useClassNameMerger();
    return (
      <ol
        className={mergeClasses(
          "list-inside list-decimal whitespace-normal [li_&]:pl-6",
          className,
        )}
        data-streamdown="ordered-list"
        {...additionalProps}
      >
        {children}
      </ol>
    );
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownOrderedList.displayName = "MarkdownOl";
var MarkdownListItem = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    let mergeClasses = useClassNameMerger();
    return (
      <li
        className={mergeClasses("py-1 [&>p]:inline", className)}
        data-streamdown="list-item"
        {...additionalProps}
      >
        {children}
      </li>
    );
  },
  (previousProps, nextProps) => previousProps.className === nextProps.className && haveSameNodePosition(previousProps.node, nextProps.node),
);
MarkdownListItem.displayName = "MarkdownLi";
var MarkdownUnorderedList = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    let mergeClasses = useClassNameMerger();
    return (
      <ul
        className={mergeClasses(
          "list-inside list-disc whitespace-normal [li_&]:pl-6",
          className,
        )}
        data-streamdown="unordered-list"
        {...additionalProps}
      >
        {children}
      </ul>
    );
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownUnorderedList.displayName = "MarkdownUl";
var MarkdownHorizontalRule = reactExports.memo(
  ({ className, node: markdownNode, ...additionalProps }) => {
    let mergeClasses = useClassNameMerger();
    return (
      <hr
        className={mergeClasses("my-6 border-border", className)}
        data-streamdown="horizontal-rule"
        {...additionalProps}
      />
    );
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownHorizontalRule.displayName = "MarkdownHr";
var MarkdownStrong = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    let mergeClasses = useClassNameMerger();
    return (
      <span
        className={mergeClasses("font-semibold", className)}
        data-streamdown="strong"
        {...additionalProps}
      >
        {children}
      </span>
    );
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownStrong.displayName = "MarkdownStrong";
var MarkdownLink = ({ children, className, href, node: markdownNode, ...additionalProps }) => {
  let mergeClasses = useClassNameMerger(),
    { linkSafety } = reactExports.useContext(markdownRenderOptionsContext),
    [isLinkSafetyOpen, setIsLinkSafetyOpen] = reactExports.useState(false),
    isIncompleteLink = href === "streamdown:incomplete-link",
    handleLinkClick = reactExports.useCallback(
      async (linkEvent) => {
        if (!(!(linkSafety != null && linkSafety.enabled && href) || isIncompleteLink)) {
          if (
            (linkEvent.preventDefault(), linkSafety.onLinkCheck && (await linkSafety.onLinkCheck(href)))
          ) {
            window.open(href, "_blank", "noreferrer");
            return;
          }
          setIsLinkSafetyOpen(true);
        }
      },
      [linkSafety, href, isIncompleteLink],
    ),
    confirmOpenLink = reactExports.useCallback(() => {
      href && window.open(href, "_blank", "noreferrer");
    }, [href]),
    closeLinkSafety = reactExports.useCallback(() => {
      setIsLinkSafetyOpen(false);
    }, []),
    linkSafetyModalProps = {
      url: href != null ? href : "",
      isOpen: isLinkSafetyOpen,
      onClose: closeLinkSafety,
      onConfirm: confirmOpenLink,
    };
  return linkSafety != null && linkSafety.enabled && href ? (
    <>
      <button
        className={mergeClasses(
          "wrap-anywhere appearance-none text-left font-medium text-primary underline",
          className,
        )}
        data-incomplete={isIncompleteLink}
        data-streamdown="link"
        onClick={handleLinkClick}
        type="button"
      >
        {children}
      </button>
      {linkSafety.renderModal
        ? linkSafety.renderModal(linkSafetyModalProps)
        : jsxRuntimeExports.jsx(ExternalLinkConfirmation, {
            ...linkSafetyModalProps,
          })}
    </>
  ) : (
    <a
      className={mergeClasses("wrap-anywhere font-medium text-primary underline", className)}
      data-incomplete={isIncompleteLink}
      data-streamdown="link"
      href={href}
      rel="noreferrer"
      target="_blank"
      {...additionalProps}
    >
      {children}
    </a>
  );
};
var MemoizedMarkdownLink = reactExports.memo(MarkdownLink, (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps) && previousProps.href === nextProps.href);
MemoizedMarkdownLink.displayName = "MarkdownA";
var MarkdownHeadingOne = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    let mergeClasses = useClassNameMerger();
    return (
      <h1
        className={mergeClasses("mt-6 mb-2 font-semibold text-3xl", className)}
        data-streamdown="heading-1"
        {...additionalProps}
      >
        {children}
      </h1>
    );
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownHeadingOne.displayName = "MarkdownH1";
var MarkdownHeadingTwo = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    let mergeClasses = useClassNameMerger();
    return (
      <h2
        className={mergeClasses("mt-6 mb-2 font-semibold text-2xl", className)}
        data-streamdown="heading-2"
        {...additionalProps}
      >
        {children}
      </h2>
    );
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownHeadingTwo.displayName = "MarkdownH2";
var MarkdownHeadingThree = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    let mergeClasses = useClassNameMerger();
    return (
      <h3
        className={mergeClasses("mt-6 mb-2 font-semibold text-xl", className)}
        data-streamdown="heading-3"
        {...additionalProps}
      >
        {children}
      </h3>
    );
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownHeadingThree.displayName = "MarkdownH3";
var MarkdownHeadingFour = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    let mergeClasses = useClassNameMerger();
    return (
      <h4
        className={mergeClasses("mt-6 mb-2 font-semibold text-lg", className)}
        data-streamdown="heading-4"
        {...additionalProps}
      >
        {children}
      </h4>
    );
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownHeadingFour.displayName = "MarkdownH4";
var MarkdownHeadingFive = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    let mergeClasses = useClassNameMerger();
    return (
      <h5
        className={mergeClasses("mt-6 mb-2 font-semibold text-base", className)}
        data-streamdown="heading-5"
        {...additionalProps}
      >
        {children}
      </h5>
    );
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownHeadingFive.displayName = "MarkdownH5";
var MarkdownHeadingSix = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    let mergeClasses = useClassNameMerger();
    return (
      <h6
        className={mergeClasses("mt-6 mb-2 font-semibold text-sm", className)}
        data-streamdown="heading-6"
        {...additionalProps}
      >
        {children}
      </h6>
    );
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownHeadingSix.displayName = "MarkdownH6";
var MarkdownTableRenderer = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    let { controls } = reactExports.useContext(markdownRenderOptionsContext),
      areTableControlsEnabled = isOptionEnabled(controls, "table"),
      canCopyTable = isTableActionEnabled(controls, "copy"),
      canDownloadTable = isTableActionEnabled(controls, "download"),
      canShowFullscreen = isTableActionEnabled(controls, "fullscreen");
    return jsxRuntimeExports.jsx(MarkdownTableWrapper, {
      className,
      showControls: areTableControlsEnabled,
      showCopy: canCopyTable,
      showDownload: canDownloadTable,
      showFullscreen: canShowFullscreen,
      ...additionalProps,
      children,
    });
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownTableRenderer.displayName = "MarkdownTable";
var MarkdownTableHead = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    let mergeClasses = useClassNameMerger();
    return (
      <thead
        className={mergeClasses("bg-muted/80", className)}
        data-streamdown="table-header"
        {...additionalProps}
      >
        {children}
      </thead>
    );
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownTableHead.displayName = "MarkdownThead";
var MarkdownTableBody = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    let mergeClasses = useClassNameMerger();
    return (
      <tbody
        className={mergeClasses("divide-y divide-border", className)}
        data-streamdown="table-body"
        {...additionalProps}
      >
        {children}
      </tbody>
    );
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownTableBody.displayName = "MarkdownTbody";
var MarkdownTableRowRenderer = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    let mergeClasses = useClassNameMerger();
    return (
      <tr
        className={mergeClasses("border-border", className)}
        data-streamdown="table-row"
        {...additionalProps}
      >
        {children}
      </tr>
    );
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownTableRowRenderer.displayName = "MarkdownTr";
var MarkdownTableHeaderCell = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    let mergeClasses = useClassNameMerger();
    return (
      <th
        className={mergeClasses(
          "whitespace-nowrap px-4 py-2 text-left font-semibold text-sm",
          className,
        )}
        data-streamdown="table-header-cell"
        {...additionalProps}
      >
        {children}
      </th>
    );
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownTableHeaderCell.displayName = "MarkdownTh";
var MarkdownDataCell = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    let mergeClasses = useClassNameMerger();
    return (
      <td
        className={mergeClasses("px-4 py-2 text-sm", className)}
        data-streamdown="table-cell"
        {...additionalProps}
      >
        {children}
      </td>
    );
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownDataCell.displayName = "MarkdownTd";
var MarkdownBlockquote = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    let mergeClasses = useClassNameMerger();
    return (
      <blockquote
        className={mergeClasses(
          "my-4 border-muted-foreground/30 border-l-4 pl-4 text-muted-foreground italic",
          className,
        )}
        data-streamdown="blockquote"
        {...additionalProps}
      >
        {children}
      </blockquote>
    );
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownBlockquote.displayName = "MarkdownBlockquote";
var MarkdownSuperscript = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    let mergeClasses = useClassNameMerger();
    return (
      <sup className={mergeClasses("text-sm", className)} data-streamdown="superscript" {...additionalProps}>
        {children}
      </sup>
    );
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownSuperscript.displayName = "MarkdownSup";
var MarkdownSubscript = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    let mergeClasses = useClassNameMerger();
    return (
      <sub className={mergeClasses("text-sm", className)} data-streamdown="subscript" {...additionalProps}>
        {children}
      </sub>
    );
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownSubscript.displayName = "MarkdownSub";
var MarkdownSection = reactExports.memo(
  ({ children, className, node: markdownNode, ...additionalProps }) => {
    if ("data-footnotes" in additionalProps) {
      let isBackrefOnlyItem = (renderedElement) => {
          var childProps, nestedChildProps;
          if (!reactExports.isValidElement(renderedElement)) return false;
          let childList = Array.isArray(renderedElement.props.children)
              ? renderedElement.props.children
              : [renderedElement.props.children],
            hasTextContent = false,
            hasBackref = false;
          for (let childElement of childList)
            if (childElement) {
              if (typeof childElement == "string") childElement.trim() !== "" && (hasTextContent = true);
              else if (reactExports.isValidElement(childElement))
                if (
                  ((childProps = childElement.props) == null
                    ? void 0
                    : childProps["data-footnote-backref"]) !== void 0
                )
                  hasBackref = true;
                else {
                  let childElements = Array.isArray(childElement.props.children)
                    ? childElement.props.children
                    : [childElement.props.children];
                  for (let nestedChild of childElements) {
                    if (typeof nestedChild == "string" && nestedChild.trim() !== "") {
                      hasTextContent = true;
                      break;
                    }
                    if (
                      reactExports.isValidElement(nestedChild) &&
                      ((nestedChildProps = nestedChild.props) == null
                        ? void 0
                        : nestedChildProps["data-footnote-backref"]) === void 0
                    ) {
                      hasTextContent = true;
                      break;
                    }
                  }
                }
            }
          return hasBackref && !hasTextContent;
        },
        renderedChildren = Array.isArray(children)
          ? children.map((sectionChild) => {
              if (!reactExports.isValidElement(sectionChild)) return sectionChild;
              if (sectionChild.type === MarkdownOrderedList) {
                let visibleListItems = (
                  Array.isArray(sectionChild.props.children)
                    ? sectionChild.props.children
                    : [sectionChild.props.children]
                ).filter((listItem) => !isBackrefOnlyItem(listItem));
                return visibleListItems.length === 0
                  ? null
                  : {
                      ...sectionChild,
                      props: {
                        ...sectionChild.props,
                        children: visibleListItems,
                      },
                    };
              }
              return sectionChild;
            })
          : children;
      return (
        Array.isArray(renderedChildren) ? renderedChildren.some((childNode) => childNode !== null) : renderedChildren !== null
      ) ? (
        <section className={className} {...additionalProps}>
          {renderedChildren}
        </section>
      ) : null;
    }
    return (
      <section className={className} {...additionalProps}>
        {children}
      </section>
    );
  },
  (previousProps, nextProps) => areMarkdownPropsEqual(previousProps, nextProps),
);
MarkdownSection.displayName = "MarkdownSection";
var MarkdownCodeBlock = ({ node: markdownNode, className, children, ...additionalProps }) => {
  var matchedLanguage, nodeProperties;
  let mergeClasses = useClassNameMerger(),
    isInlineCode = !("data-block" in additionalProps),
    { mermaid: mermaidOptions, controls: showCodeControls, lineNumbers: showLineNumbers } = reactExports.useContext(markdownRenderOptionsContext),
    mermaidContext = useMermaidOptions(),
    isIncompleteCode = useIsIncompleteCode(),
    languageMatch = className == null ? void 0 : className.match(languageClassPattern),
    languageName = (matchedLanguage = languageMatch == null ? void 0 : languageMatch.at(1)) != null ? matchedLanguage : "",
    languageRenderer = findRendererForLanguage(languageName);
  if (isInlineCode)
    return (
      <code
        className={mergeClasses("rounded bg-muted px-1.5 py-0.5 font-mono text-sm", className)}
        data-streamdown="inline-code"
        {...additionalProps}
      >
        {children}
      </code>
    );
  let codeMetadata =
      (nodeProperties = markdownNode == null ? void 0 : markdownNode.properties) == null
        ? void 0
        : nodeProperties.metastring,
    lineStartMatch = codeMetadata == null ? void 0 : codeMetadata.match(startingLinePattern),
    startingLine = lineStartMatch ? Number.parseInt(lineStartMatch[1], 10) : void 0,
    validStartingLine = startingLine !== void 0 && startingLine >= 1 ? startingLine : void 0,
    shouldRenderLineNumbers = !(codeMetadata ? noLineNumbersPattern.test(codeMetadata) : false) && showLineNumbers !== false,
    highlightedCode = "";
  if (
    (reactExports.isValidElement(children) &&
    children.props &&
    typeof children.props == "object" &&
    "children" in children.props &&
    typeof children.props.children == "string"
      ? (highlightedCode = children.props.children)
      : typeof children == "string" && (highlightedCode = children),
    languageRenderer)
  ) {
    let mermaidComponent = languageRenderer.component;
    return (
      <reactExports.Suspense fallback={<CodeBlockLoadingPlaceholder />}>
        {jsxRuntimeExports.jsx(mermaidComponent, {
          code: highlightedCode,
          isIncomplete: isIncompleteCode,
          language: languageName,
          meta: codeMetadata,
        })}
      </reactExports.Suspense>
    );
  }
  if (languageName === "mermaid" && mermaidContext) {
    let showMermaidControls = isOptionEnabled(showCodeControls, "mermaid"),
      canDownloadDiagram = isMermaidActionEnabled(showCodeControls, "download"),
      canCopyDiagram = isMermaidActionEnabled(showCodeControls, "copy"),
      canOpenDiagramFullscreen = isMermaidActionEnabled(showCodeControls, "fullscreen"),
      canPanZoomDiagram = isMermaidActionEnabled(showCodeControls, "panZoom"),
      hasDiagramControls = showMermaidControls && (canDownloadDiagram || canCopyDiagram || canOpenDiagramFullscreen);
    return (
      <reactExports.Suspense fallback={<CodeBlockLoadingPlaceholder />}>
        <div
          className={mergeClasses(
            "group relative my-4 flex w-full flex-col gap-2 rounded-xl border border-border bg-sidebar p-2",
            className,
          )}
          data-streamdown="mermaid-block"
        >
          <div
            className={mergeClasses(
              "flex h-8 items-center text-muted-foreground text-xs",
            )}
          >
            <span className={mergeClasses("ml-1 font-mono lowercase")}>mermaid</span>
          </div>
          {hasDiagramControls ? (
            <div
              className={mergeClasses(
                "pointer-events-none sticky top-2 z-10 -mt-10 flex h-8 items-center justify-end",
              )}
            >
              <div
                className={mergeClasses(
                  "pointer-events-auto flex shrink-0 items-center gap-2 rounded-md border border-sidebar bg-sidebar/80 px-1.5 py-1 supports-[backdrop-filter]:bg-sidebar/70 supports-[backdrop-filter]:backdrop-blur",
                )}
                data-streamdown="mermaid-block-actions"
              >
                {canDownloadDiagram
                  ? jsxRuntimeExports.jsx(MermaidDownloadButton, {
                      chart: highlightedCode,
                      config: mermaidOptions == null ? void 0 : mermaidOptions.config,
                    })
                  : null}
                {canCopyDiagram ? <CopyCodeButton code={highlightedCode} /> : null}
                {canOpenDiagramFullscreen
                  ? jsxRuntimeExports.jsx(MarkdownImage, {
                      chart: highlightedCode,
                      config: mermaidOptions == null ? void 0 : mermaidOptions.config,
                    })
                  : null}
              </div>
            </div>
          ) : null}
          <div className={mergeClasses("rounded-md border border-border bg-background")}>
            {jsxRuntimeExports.jsx(MermaidRenderer, {
              chart: highlightedCode,
              config: mermaidOptions == null ? void 0 : mermaidOptions.config,
              showControls: canPanZoomDiagram,
            })}
          </div>
        </div>
      </reactExports.Suspense>
    );
  }
  let canRenderCode = isOptionEnabled(showCodeControls, "code"),
    canDownloadCode = isCodeActionEnabled(showCodeControls, "download"),
    canCopyCode = isCodeActionEnabled(showCodeControls, "copy");
  return jsxRuntimeExports.jsx(HighlightedCodeBlock, {
    className,
    code: highlightedCode,
    isIncomplete: isIncompleteCode,
    language: languageName,
    lineNumbers: shouldRenderLineNumbers,
    startLine: validStartingLine,
    children: canRenderCode ? (
      <>
        {canDownloadCode
          ? jsxRuntimeExports.jsx(FileDownloadButton, {
              code: highlightedCode,
              language: languageName,
            })
          : null}
        {canCopyCode ? <CopyCodeButton /> : null}
      </>
    ) : null,
  });
};
var MemoizedMarkdownCode = reactExports.memo(
  MarkdownCodeBlock,
  (previousProps, nextProps) => previousProps.className === nextProps.className && haveSameNodePosition(previousProps.node, nextProps.node),
);
MemoizedMarkdownCode.displayName = "MarkdownCode";
var MemoizedMarkdownImage = reactExports.memo(
  MarkdownImageRenderer,
  (previousProps, nextProps) => previousProps.className === nextProps.className && haveSameNodePosition(previousProps.node, nextProps.node),
);
MemoizedMarkdownImage.displayName = "MarkdownImg";
var markdownComponents = {
  ol: MarkdownOrderedList,
  li: MarkdownListItem,
  ul: MarkdownUnorderedList,
  hr: MarkdownHorizontalRule,
  strong: MarkdownStrong,
  a: MemoizedMarkdownLink,
  h1: MarkdownHeadingOne,
  h2: MarkdownHeadingTwo,
  h3: MarkdownHeadingThree,
  h4: MarkdownHeadingFour,
  h5: MarkdownHeadingFive,
  h6: MarkdownHeadingSix,
  table: MarkdownTableRenderer,
  thead: MarkdownTableHead,
  tbody: MarkdownTableBody,
  tr: MarkdownTableRowRenderer,
  th: MarkdownTableHeaderCell,
  td: MarkdownDataCell,
  blockquote: MarkdownBlockquote,
  code: MemoizedMarkdownCode,
  img: MemoizedMarkdownImage,
  pre: ({ children }) =>
    reactExports.isValidElement(children)
      ? reactExports.cloneElement(children, {
          "data-block": "true",
        })
      : children,
  sup: MarkdownSuperscript,
  sub: MarkdownSubscript,
  p: MarkdownParagraph,
  section: MarkdownSection,
};
var htmlStartPattern = /^[ \t]*<[\w!/?-]/;
var indentedHtmlPattern = /(^|\n)[ \t]{4,}(?=<[\w!/?-])/g;
var normalizeIndentedHtml = (htmlContent) =>
  typeof htmlContent != "string" || htmlContent.length === 0 || !htmlStartPattern.test(htmlContent)
    ? htmlContent
    : htmlContent.replace(indentedHtmlPattern, "$1");
var defaultHrefProtocols;
var hrefProtocols;
var defaultCodeAttributes;
var codeAttributes;
var markdownSanitizationSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    href: [
      ...((hrefProtocols = (defaultHrefProtocols = defaultSchema.protocols) == null ? void 0 : defaultHrefProtocols.href) !=
      null
        ? hrefProtocols
        : []),
      "tel",
    ],
  },
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...((codeAttributes = (defaultCodeAttributes = defaultSchema.attributes) == null ? void 0 : defaultCodeAttributes.code) !=
      null
        ? codeAttributes
        : []),
      "metastring",
    ],
  },
};
var rehypePluginRegistry = {
  raw: rehypeRaw,
  sanitize: [rehypeSanitize, markdownSanitizationSchema],
  harden: [
    harden,
    {
      allowedImagePrefixes: ["*"],
      allowedLinkPrefixes: ["*"],
      allowedProtocols: ["*"],
      defaultOrigin: void 0,
      allowDataImages: true,
    },
  ],
};
var remarkPluginRegistry = {
  gfm: [remarkGfm, {}],
  codeMeta: attachCodeMetadata,
};
var defaultRehypePlugins = Object.values(rehypePluginRegistry);
var defaultRemarkPlugins = Object.values(remarkPluginRegistry);
var caretMarkers = {
  block: " ▋",
  circle: " ●",
};
var defaultBlockRenderer = reactExports.memo(
  ({
    content,
    shouldParseIncompleteMarkdown,
    shouldNormalizeHtmlIndentation,
    index,
    isIncomplete,
    dir,
    animatePlugin,
    ...additionalProps
  }) => {
    if (animatePlugin) {
      let lastRenderCharCount = animatePlugin.getLastRenderCharCount();
      animatePlugin.setPrevContentLength(lastRenderCharCount);
    }
    let normalizedContent = typeof content == "string" && shouldNormalizeHtmlIndentation ? normalizeIndentedHtml(content) : content,
      renderedContent = <MarkdownBlockRenderer {...additionalProps}>{normalizedContent}</MarkdownBlockRenderer>;
    return (
      <incompleteCodeContext.Provider value={isIncomplete}>
        {dir ? (
          <div
            dir={dir}
            style={{
              display: "contents",
            }}
          >
            {renderedContent}
          </div>
        ) : (
          renderedContent
        )}
      </incompleteCodeContext.Provider>
    );
  },
  (previousProps, nextProps) => {
    if (
      previousProps.content !== nextProps.content ||
      previousProps.shouldNormalizeHtmlIndentation !== nextProps.shouldNormalizeHtmlIndentation ||
      previousProps.index !== nextProps.index ||
      previousProps.isIncomplete !== nextProps.isIncomplete ||
      previousProps.dir !== nextProps.dir
    )
      return false;
    if (previousProps.components !== nextProps.components) {
      let previousComponentNames = Object.keys(previousProps.components || {}),
        nextComponentNames = Object.keys(nextProps.components || {});
      if (
        previousComponentNames.length !== nextComponentNames.length ||
        previousComponentNames.some((componentName) => {
          var previousComponent, nextComponent;
          return (
            ((previousComponent = previousProps.components) == null ? void 0 : previousComponent[componentName]) !==
            ((nextComponent = nextProps.components) == null ? void 0 : nextComponent[componentName])
          );
        })
      )
        return false;
    }
    return !(
      previousProps.rehypePlugins !== nextProps.rehypePlugins ||
      previousProps.remarkPlugins !== nextProps.remarkPlugins
    );
  },
);
defaultBlockRenderer.displayName = "Block";
export var Streamdown = reactExports.memo(
  ({
    children,
    mode = "streaming",
    dir,
    parseIncompleteMarkdown = true,
    normalizeHtmlIndentation: normalizeHtml = false,
    components,
    rehypePlugins = defaultRehypePlugins,
    remarkPlugins = defaultRemarkPlugins,
    className,
    shikiTheme = defaultCodeTheme,
    mermaid,
    controls = true,
    isAnimating = false,
    animated,
    BlockComponent: blockComponent = defaultBlockRenderer,
    parseMarkdownIntoBlocksFn = splitMarkdownIntoBlocks,
    caret,
    plugins,
    remend,
    linkSafety = defaultLinkSafety,
    lineNumbers = true,
    allowedTags,
    literalTagContent,
    translations,
    icons,
    prefix,
    onAnimationStart,
    onAnimationEnd,
    ...additionalProps
  }) => {
    let componentId = reactExports.useId(),
      [isTransitionPending, startTransition] = reactExports.useTransition(),
      mergeClasses = reactExports.useMemo(() => createClassNameMerger(prefix), [prefix]),
      wasAnimatingRef = reactExports.useRef(null),
      animationStartCallbackRef = reactExports.useRef(onAnimationStart),
      animationEndCallbackRef = reactExports.useRef(onAnimationEnd);
    ((animationStartCallbackRef.current = onAnimationStart),
      (animationEndCallbackRef.current = onAnimationEnd),
      reactExports.useEffect(() => {
        var startCallback, resumeStartCallback, endCallback;
        if (mode === "static") return;
        let wasAnimating = wasAnimatingRef.current;
        if (((wasAnimatingRef.current = isAnimating), wasAnimating === null)) {
          isAnimating && ((startCallback = animationStartCallbackRef.current) == null || startCallback.call(animationStartCallbackRef));
          return;
        }
        isAnimating && !wasAnimating
          ? (resumeStartCallback = animationStartCallbackRef.current) == null || resumeStartCallback.call(animationStartCallbackRef)
          : !isAnimating && wasAnimating && ((endCallback = animationEndCallbackRef.current) == null || endCallback.call(animationEndCallbackRef));
      }, [isAnimating, mode]));
    let allowedTagNames = reactExports.useMemo(() => (allowedTags ? Object.keys(allowedTags) : []), [allowedTags]),
      markdownContent = reactExports.useMemo(() => {
        if (typeof children != "string") return "";
        let processedMarkdown = mode === "streaming" && parseIncompleteMarkdown ? remendMarkdown(children, remend) : children;
        return (
          literalTagContent && literalTagContent.length > 0 && (processedMarkdown = preserveLiteralTagContent(processedMarkdown, literalTagContent)),
          allowedTagNames.length > 0 && (processedMarkdown = preserveHtmlWhitespace(processedMarkdown, allowedTagNames)),
          processedMarkdown
        );
      }, [children, mode, parseIncompleteMarkdown, remend, allowedTagNames, literalTagContent]),
      markdownBlocks = reactExports.useMemo(() => parseMarkdownIntoBlocksFn(markdownContent), [markdownContent, parseMarkdownIntoBlocksFn]),
      [deferredBlocks, setDeferredBlocks] = reactExports.useState(markdownBlocks);
    reactExports.useEffect(() => {
      mode === "streaming" && !animatePlugin
        ? startTransition(() => {
            setDeferredBlocks(markdownBlocks);
          })
        : setDeferredBlocks(markdownBlocks);
    }, [markdownBlocks, mode]);
    let displayedBlocks = mode === "streaming" ? deferredBlocks : markdownBlocks,
      blockDirections = reactExports.useMemo(
        () => (dir === "auto" ? displayedBlocks.map(getTextDirection) : void 0),
        [displayedBlocks, dir],
      ),
      blockKeys = reactExports.useMemo(
        () => displayedBlocks.map((block, blockIndex) => `${componentId}-${blockIndex}`),
        [displayedBlocks.length, componentId],
      ),
      animatedConfigKey = reactExports.useMemo(
        () => (animated === true ? "true" : animated ? JSON.stringify(animated) : ""),
        [animated],
      ),
      animatePlugin = reactExports.useMemo(
        () => (animatedConfigKey ? (animatedConfigKey === "true" ? createAnimatePlugin() : createAnimatePlugin(animated)) : null),
        [animatedConfigKey],
      ),
      markdownRenderOptions = reactExports.useMemo(() => {
        var codeTheme, selectedCodeTheme;
        return {
          shikiTheme:
            (selectedCodeTheme =
              (codeTheme = plugins == null ? void 0 : plugins.code) == null
                ? void 0
                : codeTheme.getThemes()) != null
              ? selectedCodeTheme
              : shikiTheme,
          controls,
          isAnimating,
          lineNumbers,
          mode,
          mermaid,
          linkSafety,
        };
      }, [shikiTheme, controls, isAnimating, lineNumbers, mode, mermaid, linkSafety, plugins == null ? void 0 : plugins.code]),
      translationsKey = reactExports.useMemo(() => (translations ? JSON.stringify(translations) : ""), [translations]),
      mergedTranslations = reactExports.useMemo(
        () => ({
          ...defaultMarkdownTranslations,
          ...translations,
        }),
        [translationsKey],
      ),
      mergedComponents = reactExports.useMemo(() => {
        let { inlineCode: InlineCode, ...componentOverrides } = components != null ? components : {},
          codeComponentOverrides = {
            ...markdownComponents,
            ...componentOverrides,
          };
        if (InlineCode) {
          let CodeBlock = codeComponentOverrides.code;
          codeComponentOverrides.code = (codeBlockProps) =>
            "data-block" in codeBlockProps
              ? CodeBlock
                ? reactExports.createElement(CodeBlock, codeBlockProps)
                : null
              : reactExports.createElement(InlineCode, codeBlockProps);
        }
        return codeComponentOverrides;
      }, [components]),
      finalRemarkPlugins = reactExports.useMemo(() => {
        let baseRemarkPlugins = [];
        return (
          plugins != null && plugins.cjk && (baseRemarkPlugins = [...baseRemarkPlugins, ...plugins.cjk.remarkPluginsBefore]),
          (baseRemarkPlugins = [...baseRemarkPlugins, ...remarkPlugins]),
          plugins != null && plugins.cjk && (baseRemarkPlugins = [...baseRemarkPlugins, ...plugins.cjk.remarkPluginsAfter]),
          plugins != null && plugins.math && (baseRemarkPlugins = [...baseRemarkPlugins, plugins.math.remarkPlugin]),
          baseRemarkPlugins
        );
      }, [remarkPlugins, plugins == null ? void 0 : plugins.math, plugins == null ? void 0 : plugins.cjk]),
      configuredRehypePlugins = reactExports.useMemo(() => {
        var sanitizedAllowedTags;
        let baseRehypePlugins = rehypePlugins;
        if (allowedTags && Object.keys(allowedTags).length > 0 && rehypePlugins === defaultRehypePlugins) {
          let sanitizedPlugins = {
            ...markdownSanitizationSchema,
            tagNames: [
              ...((sanitizedAllowedTags = markdownSanitizationSchema.tagNames) != null ? sanitizedAllowedTags : []),
              ...Object.keys(allowedTags),
            ],
            attributes: {
              ...markdownSanitizationSchema.attributes,
              ...allowedTags,
            },
          };
          baseRehypePlugins = [rehypePluginRegistry.raw, [rehypeSanitize, sanitizedPlugins], rehypePluginRegistry.harden];
        }
        return (
          literalTagContent && literalTagContent.length > 0 && (baseRehypePlugins = [...baseRehypePlugins, [preserveRawTagContent, literalTagContent]]),
          plugins != null && plugins.math && (baseRehypePlugins = [...baseRehypePlugins, plugins.math.rehypePlugin]),
          animatePlugin && isAnimating && (baseRehypePlugins = [...baseRehypePlugins, animatePlugin.rehypePlugin]),
          baseRehypePlugins
        );
      }, [rehypePlugins, plugins == null ? void 0 : plugins.math, animatePlugin, isAnimating, allowedTags, literalTagContent]),
      shouldHideCaret = reactExports.useMemo(() => {
        if (!isAnimating || displayedBlocks.length === 0) return false;
        let lastMarkdownBlock = displayedBlocks.at(-1);
        return hasUnclosedCodeFence(lastMarkdownBlock) || hasTableSeparator(lastMarkdownBlock);
      }, [isAnimating, displayedBlocks]),
      containerStyle = reactExports.useMemo(
        () =>
          caret && isAnimating && !shouldHideCaret
            ? {
                "--streamdown-caret": `"${caretMarkers[caret]}"`,
              }
            : void 0,
        [caret, isAnimating, shouldHideCaret],
      );
    return mode === "static" ? (
      <markdownTranslationContext.Provider value={mergedTranslations}>
        <markdownRenderContext.Provider value={plugins != null ? plugins : null}>
          <markdownRenderOptionsContext.Provider value={markdownRenderOptions}>
            {jsxRuntimeExports.jsx(iconContextProvider, {
              icons,
              children: (
                <classNameMergerContext.Provider value={mergeClasses}>
                  <div
                    className={mergeClasses(
                      "space-y-4 whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                      className,
                    )}
                    dir={dir === "auto" ? getTextDirection(markdownContent) : dir}
                  >
                    <MarkdownBlockRenderer
                      components={mergedComponents}
                      rehypePlugins={configuredRehypePlugins}
                      remarkPlugins={finalRemarkPlugins}
                      {...additionalProps}
                    >
                      {markdownContent}
                    </MarkdownBlockRenderer>
                  </div>
                </classNameMergerContext.Provider>
              ),
            })}
          </markdownRenderOptionsContext.Provider>
        </markdownRenderContext.Provider>
      </markdownTranslationContext.Provider>
    ) : (
      <markdownTranslationContext.Provider value={mergedTranslations}>
        <markdownRenderContext.Provider value={plugins != null ? plugins : null}>
          <markdownRenderOptionsContext.Provider value={markdownRenderOptions}>
            {jsxRuntimeExports.jsx(iconContextProvider, {
              icons,
              children: (
                <classNameMergerContext.Provider value={mergeClasses}>
                  <div
                    className={mergeClasses(
                      "space-y-4 whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                      caret && !shouldHideCaret
                        ? "[&>*:last-child]:after:inline [&>*:last-child]:after:align-baseline [&>*:last-child]:after:content-[var(--streamdown-caret)]"
                        : null,
                      className,
                    )}
                    style={containerStyle}
                  >
                    {displayedBlocks.length === 0 && caret && isAnimating && <span />}
                    {displayedBlocks.map((markdownBlock, blockIndex) => {
                      var blockDirection;
                      let isLastBlock = blockIndex === displayedBlocks.length - 1,
                        isIncompleteBlock = isAnimating && isLastBlock && hasUnclosedCodeFence(markdownBlock);
                      return jsxRuntimeExports.jsx(
                        blockComponent,
                        {
                          animatePlugin,
                          components: mergedComponents,
                          content: markdownBlock,
                          dir:
                            (blockDirection = blockDirections == null ? void 0 : blockDirections[blockIndex]) != null
                              ? blockDirection
                              : dir !== "auto"
                                ? dir
                                : void 0,
                          index: blockIndex,
                          isIncomplete: isIncompleteBlock,
                          rehypePlugins: configuredRehypePlugins,
                          remarkPlugins: finalRemarkPlugins,
                          shouldNormalizeHtmlIndentation: normalizeHtml,
                          shouldParseIncompleteMarkdown: parseIncompleteMarkdown,
                          ...additionalProps,
                        },
                        blockKeys[blockIndex],
                      );
                    })}
                  </div>
                </classNameMergerContext.Provider>
              ),
            })}
          </markdownRenderOptionsContext.Provider>
        </markdownRenderContext.Provider>
      </markdownTranslationContext.Provider>
    );
  },
  (previousProps, nextProps) =>
    previousProps.children === nextProps.children &&
    previousProps.shikiTheme === nextProps.shikiTheme &&
    previousProps.isAnimating === nextProps.isAnimating &&
    previousProps.animated === nextProps.animated &&
    previousProps.mode === nextProps.mode &&
    previousProps.plugins === nextProps.plugins &&
    previousProps.className === nextProps.className &&
    previousProps.linkSafety === nextProps.linkSafety &&
    previousProps.lineNumbers === nextProps.lineNumbers &&
    previousProps.normalizeHtmlIndentation === nextProps.normalizeHtmlIndentation &&
    previousProps.literalTagContent === nextProps.literalTagContent &&
    JSON.stringify(previousProps.translations) === JSON.stringify(nextProps.translations) &&
    previousProps.prefix === nextProps.prefix &&
    previousProps.dir === nextProps.dir,
);
Streamdown.displayName = "Streamdown";
