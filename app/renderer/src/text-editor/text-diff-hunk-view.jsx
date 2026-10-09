// text-diff-hunk-view.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { reactExports } from "../vendor.js";

export function useTextDocumentDirty() {
  const [dirty, setDirty] = reactExports.useState(false);
  const dirtyRef = reactExports.useRef(false);
  const markDirty = reactExports.useCallback(() => {
    if (dirtyRef.current) return;
    dirtyRef.current = true;
    setDirty(true);
  }, []);
  const clearDirty = reactExports.useCallback(() => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    setDirty(false);
  }, []);
  return reactExports.useMemo(
    () => ({
      dirty,
      markDirty,
      clearDirty,
    }),
    [dirty, markDirty, clearDirty],
  );
}

export function TextDiffHunkView({
  hunk,
  headerActions,
  containerRef,
  dataActionUiId,
}) {
  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-md border border-border"
      data-action-ui-id={dataActionUiId}
    >
      <div className="flex items-center justify-between gap-2 bg-muted px-3 py-1 font-mono text-[11px] text-muted-foreground">
        <span>{`@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`}</span>
        {headerActions}
      </div>
      <div className="font-mono text-xs leading-relaxed">
        {hunk.lines.map((line, index2) => (
          <div
            key={`${hunk.oldStart}-${hunk.newStart}-${index2}`}
            className="flex gap-2 px-3 py-px"
            style={{
              // Canvas diff tokens are shared by inline Agent review and
              // version comparison, including their Light/Dark values.
              background:
                line.kind === "add"
                  ? "var(--canvas-diff-add-bg, oklch(0.72 0.19 145 / 0.18))"
                  : line.kind === "del"
                    ? "var(--canvas-diff-del-bg, oklch(0.63 0.21 25 / 0.12))"
                    : void 0,
            }}
          >
            <span className="w-10 shrink-0 select-none text-right text-muted-foreground">
              {line.oldLine ?? ""}
            </span>
            <span className="w-10 shrink-0 select-none text-right text-muted-foreground">
              {line.newLine ?? ""}
            </span>
            <span className="w-3 shrink-0 select-none text-muted-foreground">
              {line.kind === "add" ? "+" : line.kind === "del" ? "-" : " "}
            </span>
            <span className="whitespace-pre-wrap break-words text-foreground">
              {line.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
