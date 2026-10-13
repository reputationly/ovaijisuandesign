// assets-dropzone-empty.jsx
import { FolderUp, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
function useDragDepth() {
  const [count, setCount] = reactExports.useState(0);
  return {
    count,
    enter: () => setCount((currentCount) => currentCount + 1),
    leave: () => setCount((currentCount) => Math.max(0, currentCount - 1)),
    reset: () => setCount(0),
  };
}
export function AssetsDropzoneEmpty({
  disabled,
  onPickFiles,
  onOpenPicker,
  title,
  description,
}) {
  const { t: translate } = useTranslation();
  const [dragActive, setDragActive] = reactExports.useState(false);
  const dragDepth = useDragDepth();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) onOpenPicker();
      }}
      onDragEnter={(event) => {
        if (disabled) return;
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        dragDepth.enter();
        setDragActive(true);
      }}
      onDragOver={(event) => {
        if (disabled) return;
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (disabled) return;
        if (!event.dataTransfer.types.includes("Files")) return;
        dragDepth.leave();
        if (dragDepth.count <= 1) setDragActive(false);
      }}
      onDrop={(event) => {
        if (disabled) return;
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        dragDepth.reset();
        setDragActive(false);
        const files = [...event.dataTransfer.files];
        if (files.length > 0) onPickFiles(files);
      }}
      className={cn(
        "flex flex-1 min-h-0 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border/70 bg-card/40 py-8 text-center transition-colors",
        !disabled &&
          "cursor-pointer hover:border-foreground/25 hover:bg-muted/40",
        dragActive && "border-brand-accent bg-brand-accent/[0.06]",
        disabled && "cursor-not-allowed opacity-60",
      )}
      data-action-ui-id="project-assets.dropzone"
      aria-disabled={disabled}
    >
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors",
          dragActive && "bg-brand-accent/10 text-brand-accent",
        )}
      >
        <FolderUp size={26} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <div className="flex max-w-sm flex-col gap-1 px-6">
        <p className="text-body-14 font-medium text-foreground">
          {title ?? translate("projectAssets.dropzoneTitle")}
        </p>
        <p className="text-caption-11 text-muted-foreground">
          {description ?? translate("projectAssets.dropzoneDesc")}
        </p>
      </div>
    </button>
  );
}
