// assets-dropzone-empty.jsx
import { FolderUp, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 } from "../infra/dialog-content.jsx";

function useDragDepth() {
  const [count2, setCount] = reactExports.useState(0);
  return {
    count: count2,
    enter: () => setCount((n2) => n2 + 1),
    leave: () => setCount((n2) => Math.max(0, n2 - 1)),
    reset: () => setCount(0),
  };
}

export function AssetsDropzoneEmpty({
  disabled: disabled2,
  onPickFiles,
  onOpenPicker,
  title,
  description,
}) {
  const { t: t2 } = useTranslation();
  const [dragActive, setDragActive] = reactExports.useState(false);
  const dragDepth = useDragDepth();
  return (
    <button
      type="button"
      disabled={disabled2}
      onClick={() => {
        if (!disabled2) onOpenPicker();
      }}
      onDragEnter={(event) => {
        if (disabled2) return;
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        dragDepth.enter();
        setDragActive(true);
      }}
      onDragOver={(event) => {
        if (disabled2) return;
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (disabled2) return;
        if (!event.dataTransfer.types.includes("Files")) return;
        dragDepth.leave();
        if (dragDepth.count <= 1) setDragActive(false);
      }}
      onDrop={(event) => {
        if (disabled2) return;
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        dragDepth.reset();
        setDragActive(false);
        const files = [...event.dataTransfer.files];
        if (files.length > 0) onPickFiles(files);
      }}
      className={cn$2(
        "flex flex-1 min-h-0 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border/70 bg-card/40 py-8 text-center transition-colors",
        !disabled2 &&
          "cursor-pointer hover:border-foreground/25 hover:bg-muted/40",
        dragActive && "border-brand-accent bg-brand-accent/[0.06]",
        disabled2 && "cursor-not-allowed opacity-60",
      )}
      data-action-ui-id="project-assets.dropzone"
      aria-disabled={disabled2}
    >
      <span
        className={cn$2(
          "flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors",
          dragActive && "bg-brand-accent/10 text-brand-accent",
        )}
      >
        <FolderUp size={26} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <div className="flex max-w-sm flex-col gap-1 px-6">
        <p className="text-body-14 font-medium text-foreground">
          {title ?? t2("projectAssets.dropzoneTitle")}
        </p>
        <p className="text-caption-11 text-muted-foreground">
          {description ?? t2("projectAssets.dropzoneDesc")}
        </p>
      </div>
    </button>
  );
}
