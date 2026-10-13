// pe.jsx
import { L as useIcons, ne as tableToCsv, re as tableToMarkdown, reactExports, ue as extractTableData } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { R as markdownRenderOptionsContext, W2 as downloadFile, y3 as useClassNameMerger } from "./ae.jsx";
import { D3 as useStreamdownLabels } from "../media-editing/wt.js";

export var Pe = ({
  children,
  className,
  onDownload,
  onError,
}) => {
  let mergeClassNames = useClassNameMerger(),
    [isMenuOpen, setIsMenuOpen] = reactExports.useState(false),
    menuRef = reactExports.useRef(null),
    { isAnimating } = reactExports.useContext(markdownRenderOptionsContext),
    translations = useStreamdownLabels(),
    icons = useIcons(),
    downloadTable = (format) => {
      var menuElement;
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
          serializedTable = format === "csv" ? tableToCsv(tableData) : tableToMarkdown(tableData);
        (downloadFile(
          `table.${format === "csv" ? "csv" : "md"}`,
          serializedTable,
          format === "csv" ? "text/csv" : "text/markdown",
        ),
          setIsMenuOpen(false),
          onDownload == null || onDownload(format));
      } catch (error) {
        onError == null || onError(error);
      }
    };
  return (
    reactExports.useEffect(() => {
      let handleOutsideMouseDown = (mouseEvent) => {
        let eventPath = mouseEvent.composedPath();
        menuRef.current && !eventPath.includes(menuRef.current) && setIsMenuOpen(false);
      };
      return (
        document.addEventListener("mousedown", handleOutsideMouseDown),
        () => {
          document.removeEventListener("mousedown", handleOutsideMouseDown);
        }
      );
    }, []),
    (
      <div className={mergeClassNames("relative")} ref={menuRef}>
        <button
          className={mergeClassNames(
            "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          disabled={isAnimating}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          title={translations.downloadTable}
          type="button"
        >
          {children != null ? children : <icons.DownloadIcon size={14} />}
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
              onClick={() => downloadTable("csv")}
              title={translations.downloadTableAsCsv}
              type="button"
            >
              {translations.tableFormatCsv}
            </button>
            <button
              className={mergeClassNames(
                "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40",
              )}
              onClick={() => downloadTable("markdown")}
              title={translations.downloadTableAsMarkdown}
              type="button"
            >
              {translations.tableFormatMarkdown}
            </button>
          </div>
        ) : null}
      </div>
    )
  );
};
