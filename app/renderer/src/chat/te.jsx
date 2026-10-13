// te.jsx
import {
  dt as tableToTsv,
  jsxRuntimeExports,
  L as useIcons,
  ne as tableToCsv,
  re as tableToMarkdown,
  reactExports,
  ue as extractTableData,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { R as markdownRenderOptionsContext, y3 as useClassNameMerger } from "./ae.jsx";
import { D3 as useStreamdownLabels } from "../media-editing/wt.js";

export var Te = ({
  children,
  className,
  onCopy,
  onError,
  timeout: copyFeedbackDurationMs = 2e3,
}) => {
  let mergeClassNames = useClassNameMerger(),
    [isMenuOpen, setIsMenuOpen] = reactExports.useState(false),
    [isCopied, setIsCopied] = reactExports.useState(false),
    menuRef = reactExports.useRef(null),
    copyFeedbackTimerRef = reactExports.useRef(0),
    { isAnimating } = reactExports.useContext(markdownRenderOptionsContext),
    translations = useStreamdownLabels(),
    copyTable = async (format) => {
      var clipboardWrite, menuElement;
      if (
        typeof window == "undefined" ||
        !(
          (clipboardWrite = navigator == null ? void 0 : navigator.clipboard) != null &&
          clipboardWrite.write
        )
      ) {
        onError == null || onError(new Error("Clipboard API not available"));
        return;
      }
      try {
        let tableWrapper =
            (menuElement = menuRef.current) == null
              ? void 0
              : menuElement.closest('[data-streamdown="table-wrapper"]'),
          tableElement = tableWrapper == null ? void 0 : tableWrapper.querySelector("table");
        if (!tableElement) {
          onError == null || onError(new Error("Table not found"));
          return;
        }
        let tableData = extractTableData(tableElement),
          serializedTable = (
            {
              csv: tableToCsv,
              tsv: tableToTsv,
              md: tableToMarkdown,
            }[format] || tableToMarkdown
          )(tableData),
          clipboardItem = new ClipboardItem({
            "text/plain": new Blob([serializedTable], {
              type: "text/plain",
            }),
            "text/html": new Blob([tableElement.outerHTML], {
              type: "text/html",
            }),
          });
        (await navigator.clipboard.write([clipboardItem]),
          setIsCopied(true),
          setIsMenuOpen(false),
          onCopy == null || onCopy(format),
          (copyFeedbackTimerRef.current = window.setTimeout(() => setIsCopied(false), copyFeedbackDurationMs)));
      } catch (error) {
        onError == null || onError(error);
      }
    };
  reactExports.useEffect(() => {
    let handleOutsideMouseDown = (mouseEvent) => {
      let eventPath = mouseEvent.composedPath();
      menuRef.current && !eventPath.includes(menuRef.current) && setIsMenuOpen(false);
    };
    return (
      document.addEventListener("mousedown", handleOutsideMouseDown),
      () => {
        (document.removeEventListener("mousedown", handleOutsideMouseDown),
          window.clearTimeout(copyFeedbackTimerRef.current));
      }
    );
  }, []);
  let icons = useIcons(),
    copyStatusIcon = isCopied ? icons.CheckIcon : icons.CopyIcon;
  return (
    <div className={mergeClassNames("relative")} ref={menuRef}>
      <button
        className={mergeClassNames(
          "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        disabled={isAnimating}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        title={translations.copyTable}
        type="button"
      >
        {children != null
          ? children
          : jsxRuntimeExports.jsx(copyStatusIcon, {
              height: 14,
              width: 14,
            })}
      </button>
      {isMenuOpen ? (
        <div
          className={mergeClassNames(
            "absolute top-full right-0 z-20 mt-1 min-w-[120px] overflow-hidden rounded-md border border-border bg-background shadow-lg",
          )}
        >
          <button
            className={mergeClassNames(
              "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40",
            )}
            onClick={() => copyTable("md")}
            title={translations.copyTableAsMarkdown}
            type="button"
          >
            {translations.tableFormatMarkdown}
          </button>
          <button
            className={mergeClassNames(
              "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40",
            )}
            onClick={() => copyTable("csv")}
            title={translations.copyTableAsCsv}
            type="button"
          >
            {translations.tableFormatCsv}
          </button>
          <button
            className={mergeClassNames(
              "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40",
            )}
            onClick={() => copyTable("tsv")}
            title={translations.copyTableAsTsv}
            type="button"
          >
            {translations.tableFormatTsv}
          </button>
        </div>
      ) : null}
    </div>
  );
};
