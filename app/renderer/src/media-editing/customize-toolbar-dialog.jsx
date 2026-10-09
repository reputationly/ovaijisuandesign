// customize-toolbar-dialog.jsx
import {
  arrayMove,
  closestCenter,
  CompositedSvg,
  CSS$1,
  DndContext,
  DragOverlay,
  horizontalListSortingStrategy,
  jsxRuntimeExports,
  KeyboardSensor,
  Pin,
  PinOff,
  PointerSensor,
  reactDomExports,
  reactExports,
  RotateCcw,
  SortableContext,
  sortableKeyboardCoordinates,
  useSensor,
  useSensors,
  useSortable,
  useTranslation,
  X$7,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Dialog$1 } from "../canvas/separator.jsx";
import {
  DialogContent$1,
  DialogDescription$1,
  DialogTitle$1,
} from "./use-preview-text.jsx";

function SortablePreviewChip({ id: id2, meta: meta2, showLabel, onUnpin }) {
  const { t: t2 } = useTranslation();
  const label = t2(meta2.labelKey, meta2.defaultLabel);
  const {
    attributes,
    listeners: listeners2,
    setNodeRef,
    transform: transform2,
    transition: transition2,
    isDragging,
  } = useSortable({
    id: id2,
    transition: {
      duration: 220,
      easing: "cubic-bezier(0.18, 0.67, 0.16, 1)",
    },
  });
  const style2 = {
    transform: CSS$1.Transform.toString(transform2),
    transition: transition2,
  };
  return (
    <div
      ref={setNodeRef}
      style={{
        ...style2,
        ...(isDragging
          ? {
              visibility: "hidden",
            }
          : null),
      }}
      className={`relative group outline-none ${isDragging ? "pointer-events-none" : ""}`}
      {...attributes}
      {...listeners2}
    >
      <div
        className="flex h-10 min-w-10 items-center justify-center gap-0.5 p-2.5 rounded-[6px] cursor-grab active:cursor-grabbing"
        style={{
          color: "var(--canvas-controls-text)",
        }}
      >
        {meta2.icon}
        {showLabel && (
          <span className="text-sm font-normal tracking-tight whitespace-nowrap">
            {label}
          </span>
        )}
      </div>
      {!isDragging && (
        <button
          type="button"
          onClick={(e2) => {
            e2.stopPropagation();
            onUnpin();
          }}
          onPointerDown={(e2) => e2.stopPropagation()}
          className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background opacity-0 group-hover:opacity-100 transition-opacity outline-none"
          aria-label={t2("canvas.customizeToolbar.unpin", "Unpin")}
          title={t2("canvas.customizeToolbar.unpin", "Unpin")}
        >
          <X$7 size={10} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

function DragGhost({ meta: meta2, showLabel }) {
  const { t: t2 } = useTranslation();
  const label = t2(meta2.labelKey, meta2.defaultLabel);
  return (
    <div
      className="flex h-10 min-w-10 items-center justify-center gap-0.5 p-2.5 rounded-[6px] cursor-grabbing"
      style={{
        background: "#ffffff",
        color: "#262626",
        outline: "1.5px solid rgba(0, 0, 0, 0.6)",
        outlineOffset: "0px",
        boxShadow:
          "0 12px 28px rgba(0, 0, 0, 0.18), 0 4px 10px rgba(0, 0, 0, 0.08)",
        transition: "none",
      }}
    >
      {meta2.icon}
      {showLabel && (
        <span className="text-sm font-normal tracking-tight whitespace-nowrap">
          {label}
        </span>
      )}
    </div>
  );
}

function FixedDivider() {
  return (
    <div
      style={{
        width: 1,
        height: 24,
        background: "var(--canvas-controls-text)",
        opacity: 0.1,
        flexShrink: 0,
        margin: "0 2px",
      }}
    />
  );
}

function FixedChip({ icon, label, showLabel }) {
  return (
    <div
      className="flex h-10 min-w-10 items-center justify-center gap-0.5 p-2.5 rounded-[4px]"
      style={{
        color: "var(--canvas-controls-text)",
      }}
      title={label}
    >
      {icon}
      {showLabel && (
        <span className="text-sm font-normal tracking-tight whitespace-nowrap">
          {label}
        </span>
      )}
    </div>
  );
}

function ToolTile({ id: _id, meta: meta2, pinned, onTogglePin }) {
  const { t: t2 } = useTranslation();
  const label = t2(meta2.labelKey, meta2.defaultLabel);
  return (
    <button
      type="button"
      onClick={onTogglePin}
      aria-pressed={pinned}
      title={pinned ? `${label} (Unpin)` : `${label} (Pin)`}
      className={`flex items-center gap-2 h-10 rounded-lg border px-3 select-none transition-colors text-left ${pinned ? "border-foreground/30 bg-[var(--canvas-controls-active)] text-foreground hover:bg-[var(--canvas-controls-hover)]" : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {meta2.icon}
      </span>
      <span className="flex-1 min-w-0 truncate text-sm">{label}</span>
      <span
        aria-hidden={true}
        className={`flex h-5 w-5 shrink-0 items-center justify-center ${pinned ? "text-foreground" : "text-muted-foreground/60"}`}
      >
        {pinned ? (
          <Pin size={14} strokeWidth={1.75} className="fill-current" />
        ) : (
          <PinOff size={14} strokeWidth={1.75} />
        )}
      </span>
    </button>
  );
}

function MorePreviewIcon() {
  return (
    <CompositedSvg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" />
    </CompositedSvg>
  );
}

function PreviewMoreChip() {
  return (
    <div
      className="flex h-10 min-w-10 items-center justify-center gap-0.5 p-2.5 rounded-[4px]"
      style={{
        color: "var(--canvas-controls-text)",
      }}
    >
      <MorePreviewIcon />
    </div>
  );
}

function PreviewBar({
  pinned,
  showLabels,
  toolMeta,
  fixedRightChips,
  onUnpin,
}) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border-[1.5px] border-[var(--canvas-controls-border)] p-1"
      style={{
        background: "var(--canvas-controls-bg)",
      }}
    >
      <SortableContext items={pinned} strategy={horizontalListSortingStrategy}>
        {pinned.map((id2) => (
          <SortablePreviewChip
            key={id2}
            id={id2}
            meta={toolMeta[id2]}
            showLabel={showLabels}
            onUnpin={() => onUnpin(id2)}
          />
        ))}
      </SortableContext>
      <PreviewMoreChip />
      {fixedRightChips.length > 0 && (
        <>
          <FixedDivider />
          {fixedRightChips.map((chip) => (
            <FixedChip
              key={chip.id}
              icon={chip.icon}
              label={chip.label}
              showLabel={chip.showLabel}
            />
          ))}
        </>
      )}
    </div>
  );
}

export function CustomizeToolbarDialog$2({
  open,
  onOpenChange,
  allToolIds,
  toolMeta,
  store,
  defaults: defaults2,
  fixedRightChips,
  onApply,
  onAbandon,
}) {
  const { t: t2 } = useTranslation();
  const [draftPinned, setDraftPinned] = reactExports.useState([
    ...store.pinned,
  ]);
  const [draftShowLabels, setDraftShowLabels] = reactExports.useState(
    store.showLabels,
  );
  const [activeDragId, setActiveDragId] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (open) {
      setDraftPinned([...store.pinned]);
      setDraftShowLabels(store.showLabels);
    }
  }, [open, store.pinned, store.showLabels]);
  const togglePin = (id2) => {
    setDraftPinned((prev) =>
      prev.includes(id2) ? prev.filter((x2) => x2 !== id2) : [...prev, id2],
    );
  };
  const unpin = (id2) => {
    setDraftPinned((prev) => prev.filter((x2) => x2 !== id2));
  };
  const reset2 = () => {
    setDraftPinned([...defaults2.pinned]);
    setDraftShowLabels(defaults2.showLabels);
  };
  const save = () => {
    onApply?.({
      pinnedCount: draftPinned.length,
      showLabels: draftShowLabels,
    });
    store.setCustomization({
      pinned: draftPinned,
      showLabels: draftShowLabels,
    });
    onOpenChange(false);
  };
  const abandon = () => {
    onAbandon?.(
      draftShowLabels !== store.showLabels ||
        draftPinned.length !== store.pinned.length ||
        draftPinned.some((id2, index2) => id2 !== store.pinned[index2]),
    );
    onOpenChange(false);
  };
  const handleDialogOpenChange = (nextOpen) => {
    if (!nextOpen) {
      abandon();
      return;
    }
    onOpenChange(true);
  };
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const onDragStart = (event) => {
    setActiveDragId(event.active.id);
  };
  const onDragEnd = (event) => {
    setActiveDragId(null);
    const { active: active2, over } = event;
    if (!over || active2.id === over.id) return;
    setDraftPinned((prev) => {
      const oldIdx = prev.indexOf(active2.id);
      const newIdx = prev.indexOf(over.id);
      if (oldIdx === -1 || newIdx === -1) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
  };
  const onDragCancel = () => setActiveDragId(null);
  const activeMeta = activeDragId ? toolMeta[activeDragId] : void 0;
  return (
    <Dialog$1 open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent$1
        className="!max-w-[760px] gap-0 p-0"
        onClick={(e2) => e2.stopPropagation()}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <div className="flex flex-col gap-1 px-6 pt-6">
            <DialogTitle$1 className="text-lg font-medium">
              {t2("canvas.customizeToolbar.title", "Customize Toolbar")}
            </DialogTitle$1>
            <DialogDescription$1 className="text-sm text-muted-foreground">
              {t2(
                "canvas.customizeToolbar.subtitle",
                "Choose the tools you want in your edit bar",
              )}
            </DialogDescription$1>
          </div>
          <div
            className="relative mx-6 mt-5 mb-4 h-[140px] rounded-lg overflow-hidden border border-border"
            style={{
              background: "var(--canvas-bg)",
            }}
          >
            <div className="h-full overflow-x-auto overflow-y-hidden">
              <div className="flex h-full min-w-max items-center justify-center px-6">
                <PreviewBar
                  pinned={draftPinned}
                  showLabels={draftShowLabels}
                  toolMeta={toolMeta}
                  fixedRightChips={fixedRightChips}
                  onUnpin={unpin}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={reset2}
              className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--canvas-controls-bg)] backdrop-blur text-muted-foreground hover:bg-[var(--canvas-controls-hover)] hover:text-foreground border border-[var(--canvas-controls-border)] transition-colors"
              aria-label={t2(
                "canvas.customizeToolbar.reset",
                "Reset to defaults",
              )}
              title={t2("canvas.customizeToolbar.reset", "Reset to defaults")}
            >
              <RotateCcw size={14} strokeWidth={1.75} />
            </button>
          </div>
          <div className="px-6">
            <div className="grid grid-cols-3 gap-2">
              {allToolIds.map((id2) => (
                <ToolTile
                  key={id2}
                  id={id2}
                  meta={toolMeta[id2]}
                  pinned={draftPinned.includes(id2)}
                  onTogglePin={() => togglePin(id2)}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <button
                type="button"
                role="switch"
                aria-checked={draftShowLabels}
                onClick={() => setDraftShowLabels((v2) => !v2)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${draftShowLabels ? "bg-foreground" : "bg-muted-foreground/30"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full transition-transform ${draftShowLabels ? "bg-background translate-x-[18px]" : "bg-foreground translate-x-0.5"}`}
                />
              </button>
              <span>
                {t2("canvas.customizeToolbar.showLabels", "Show tool names")}
              </span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={abandon}
                className="h-9 rounded-md px-4 text-sm text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
              >
                {t2("common.cancel", "Cancel")}
              </button>
              <button
                type="button"
                onClick={save}
                className="h-9 rounded-md bg-foreground px-4 text-sm text-background hover:bg-foreground/90 transition-colors"
              >
                {t2("common.save", "Save")}
              </button>
            </div>
          </div>
          {typeof document !== "undefined" &&
            reactDomExports.createPortal(
              <DragOverlay
                dropAnimation={{
                  duration: 220,
                  easing: "cubic-bezier(0.18, 0.67, 0.16, 1)",
                }}
                zIndex={10010}
              >
                {activeMeta ? (
                  <DragGhost meta={activeMeta} showLabel={draftShowLabels} />
                ) : null}
              </DragOverlay>,
              document.body,
            )}
        </DndContext>
      </DialogContent$1>
    </Dialog$1>
  );
}
