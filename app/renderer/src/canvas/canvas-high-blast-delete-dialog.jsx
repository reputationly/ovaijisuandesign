// canvas-high-blast-delete-dialog.jsx
import { jsxRuntimeExports, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { CircleHelp } from "../media-editing/package.jsx";
import { Tooltip$1 } from "../generation/missing-asset-card.jsx";
import { Dialog$1 } from "./separator.jsx";
import {
  DialogContent$1,
  DialogDescription$1,
  DialogFooter$1,
  DialogHeader$1,
  DialogTitle$1,
} from "../media-editing/use-preview-text.jsx";
import { Button$2 } from "./node-shell-inner.jsx";
import {
  readCanvasPreference,
  writeCanvasPreference,
} from "./use-active-mode.js";

export function CanvasConfirmationDialog({
  open,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}) {
  return (
    <Dialog$1 open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent$1
        className="gap-4 sm:max-w-[420px]"
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DialogHeader$1>
          <DialogTitle$1>{title}</DialogTitle$1>
          <DialogDescription$1>{description}</DialogDescription$1>
        </DialogHeader$1>
        <DialogFooter$1>
          <Button$2 variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button$2>
          <Button$2 variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </Button$2>
        </DialogFooter$1>
      </DialogContent$1>
    </Dialog$1>
  );
}

export function CanvasHighBlastDeleteDialog({ instance: instance2 }) {
  const { t: t2 } = useTranslation();
  const [pendingRequest, setPendingRequest] = reactExports.useState(null);
  const pendingRequestRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    instance2.setHighBlastDeleteConfirmer((request) => {
      pendingRequestRef.current?.cancel();
      pendingRequestRef.current = request;
      setPendingRequest(request);
    });
    return () => {
      instance2.setHighBlastDeleteConfirmer(void 0);
      pendingRequestRef.current?.cancel();
      pendingRequestRef.current = null;
    };
  }, [instance2]);
  const handleCancel = reactExports.useCallback(() => {
    const request = pendingRequestRef.current;
    pendingRequestRef.current = null;
    setPendingRequest(null);
    request?.cancel();
  }, []);
  const handleConfirm = reactExports.useCallback(() => {
    const request = pendingRequestRef.current;
    pendingRequestRef.current = null;
    setPendingRequest(null);
    request?.confirm();
  }, []);
  return (
    <CanvasConfirmationDialog
      open={pendingRequest !== null}
      title={t2(
        "canvas.persistence.highBlastDeleteTitle",
        "确认删除大量画布内容",
      )}
      description={t2("canvas.persistence.highBlastDeleteConfirm", {
        defaultValue:
          "此操作将从画布移除 {{nodeCount}} 个节点和 {{edgeCount}} 条连线。为防止误清空，请确认是否继续。",
        nodeCount: pendingRequest?.removedNodeCount ?? 0,
        edgeCount: pendingRequest?.removedEdgeCount ?? 0,
      })}
      cancelLabel={t2("common.cancel", "取消")}
      confirmLabel={t2("canvas.persistence.highBlastDeleteAction", "确认删除")}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
    />
  );
}

export function useDismissMenu(
  menuRef,
  onClose,
  onEscape,
  trigger,
  enabled = true,
) {
  const escapeHandlerRef = reactExports.useRef(onEscape);
  escapeHandlerRef.current = onEscape;
  const captureEscape = !!onEscape;
  reactExports.useEffect(() => {
    if (!enabled) return;
    const handleMouseDown2 = (e2) => {
      if (trigger?.contains(e2.target)) return;
      if (menuRef.current && !menuRef.current.contains(e2.target)) {
        onClose();
      }
    };
    const handleKeyDown2 = (e2) => {
      if (e2.key !== "Escape") return;
      if (escapeHandlerRef.current?.()) {
        e2.preventDefault();
        e2.stopImmediatePropagation();
        return;
      }
      onClose();
    };
    const timer2 = setTimeout(() => {
      document.addEventListener("mousedown", handleMouseDown2);
      document.addEventListener("keydown", handleKeyDown2, captureEscape);
    }, 0);
    return () => {
      clearTimeout(timer2);
      document.removeEventListener("mousedown", handleMouseDown2);
      document.removeEventListener("keydown", handleKeyDown2, captureEscape);
    };
  }, [menuRef, onClose, captureEscape, trigger, enabled]);
}

export function QuickZoomPresence({ value, elementRef, children: children2 }) {
  const [retained, setRetained] = reactExports.useState(value);
  const internalRef = reactExports.useRef(null);
  const ref = elementRef ?? internalRef;
  const open = value !== null;
  if (open && retained !== value) setRetained(value);
  reactExports.useLayoutEffect(() => {
    if (open || retained === null) return;
    let cancelled = false;
    const animations = ref.current?.getAnimations?.() ?? [];
    if (animations.length === 0) {
      setRetained(null);
      return;
    }
    void Promise.allSettled(
      animations.map((animation) => animation.finished),
    ).then(() => {
      if (!cancelled) setRetained(null);
    });
    return () => {
      cancelled = true;
    };
  }, [open, retained, ref]);
  const content2 = value ?? retained;
  return content2 === null
    ? null
    : children2(content2, {
        ref,
        "data-ending-style": open ? void 0 : "",
        inert: !open,
      });
}

const SORT_OPTIONS = ["name", "addedAt"];

export const TidySortContext = reactExports.createContext({
  sortBy: "name",
  setSortBy: () => {},
});

export function useTidySortPreference(scope) {
  const key2 = `hilo:canvas:tidy:sortBy:${scope}`;
  const [choice, setChoice] = reactExports.useState(() => ({
    key: key2,
    value: readCanvasPreference(key2, SORT_OPTIONS, "name"),
  }));
  const sortBy =
    choice.key === key2
      ? choice.value
      : readCanvasPreference(key2, SORT_OPTIONS, "name");
  const context = reactExports.useMemo(
    () => ({
      sortBy,
      setSortBy: (value) =>
        setChoice({
          key: key2,
          value,
        }),
    }),
    [key2, sortBy],
  );
  const finish = reactExports.useCallback(
    async (action) => {
      const result = await action;
      if (result.applied) writeCanvasPreference(key2, sortBy);
      return result;
    },
    [key2, sortBy],
  );
  return reactExports.useMemo(
    () => ({
      context,
      sortBy,
      finish,
    }),
    [context, sortBy, finish],
  );
}

export function TidyHint({ hint, hintId }) {
  const swallow = reactExports.useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);
  return (
    <>
      <Tooltip$1
        content={hint}
        side="right"
        sideOffset={10}
        className="max-w-[260px]"
      >
        <span
          data-canvas-tidy-hint=""
          aria-hidden="true"
          onClick={swallow}
          onPointerDown={swallow}
          className="ml-auto flex size-[18px] shrink-0 cursor-default items-center justify-center rounded-full text-[var(--canvas-controls-text-muted)] transition-colors hover:bg-[var(--canvas-controls-active)] hover:text-[var(--canvas-controls-text)]"
        >
          <CircleHelp size={14} strokeWidth={1.5} />
        </span>
      </Tooltip$1>
      <span id={hintId} className="sr-only">
        {hint}
      </span>
    </>
  );
}
