// annotation-input.jsx
import { reactDomExports, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { getAnnotationMarks } from "./configuration2.js";

const POPOVER_WIDTH = 320;

const GAP = 8;

const FALLBACK_HEIGHT = 120;

export function AnnotationInput({
  editor,
  annotationId,
  value,
  placeholder,
  portalTarget,
  boundsEl,
  onChange,
  onClose,
}) {
  const getBounds = reactExports.useCallback(() => {
    const el = boundsEl ?? portalTarget;
    const rect = el?.getBoundingClientRect();
    const left = rect && rect.width > 0 ? rect.left : 0;
    const right = rect && rect.width > 0 ? rect.right : window.innerWidth;
    return {
      left,
      right,
      top: 0,
      bottom: window.innerHeight,
    };
  }, [boundsEl, portalTarget]);
  const { t: t2 } = useTranslation();
  const cardRef = reactExports.useRef(null);
  const textareaRef = reactExports.useRef(null);
  const [pos, setPos] = reactExports.useState(null);
  reactExports.useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
    return () => cancelAnimationFrame(raf);
  }, []);
  reactExports.useLayoutEffect(() => {
    const compute = () => {
      const mark2 = getAnnotationMarks(editor).find(
        (m3) => m3.id === annotationId,
      );
      if (!mark2) return;
      try {
        const start2 = editor.view.coordsAtPos(mark2.from);
        const end2 = editor.view.coordsAtPos(mark2.to);
        const selTop = Math.min(start2.top, end2.top);
        const selBottom = Math.max(start2.bottom, end2.bottom);
        const card = cardRef.current;
        const height = card?.offsetHeight || FALLBACK_HEIGHT;
        const width = card?.offsetWidth || POPOVER_WIDTH;
        const bounds = getBounds();
        const left = Math.max(
          bounds.left + GAP,
          Math.min(start2.left, bounds.right - width - GAP),
        );
        let top2 = selBottom + GAP;
        if (top2 + height + GAP > bounds.bottom) {
          const above = selTop - height - GAP;
          top2 =
            above >= bounds.top + GAP ? above : bounds.bottom - height - GAP;
        }
        top2 = Math.max(bounds.top + GAP, top2);
        setPos({
          left,
          top: top2,
        });
      } catch {}
    };
    compute();
    const onScroll = () => compute();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    const onTransaction = () => compute();
    editor.on("transaction", onTransaction);
    const ro = cardRef.current ? new ResizeObserver(() => compute()) : null;
    if (ro && cardRef.current) ro.observe(cardRef.current);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      editor.off("transaction", onTransaction);
      ro?.disconnect();
    };
  }, [editor, annotationId, getBounds]);
  const node2 = (
    // biome-ignore lint/a11y/noStaticElementInteractions: onMouseDown only guards textarea focus (prevents blur-close when clicking the popover chrome)
    <div
      ref={cardRef}
      data-canvas-chrome="true"
      className="fixed z-[10110] flex flex-col gap-2 rounded-xl border p-3 animate-[toolbar-fade-in_0.12s_ease-out]"
      style={{
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        width: POPOVER_WIDTH,
        background: "var(--canvas-node-bg, #fff)",
        borderColor: "var(--canvas-node-border, rgba(0,0,0,0.08))",
        boxShadow: "0 6px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)",
        // Hidden until positioned to avoid a first-frame flash at (0,0).
        opacity: pos ? 1 : 0,
        pointerEvents: pos ? "auto" : "none",
      }}
      onMouseDown={(e2) => {
        if (e2.target !== textareaRef.current) e2.preventDefault();
      }}
    >
      <textarea
        ref={textareaRef}
        rows={2}
        value={value}
        placeholder={placeholder}
        onChange={(e2) => onChange(e2.currentTarget.value)}
        onBlur={onClose}
        onKeyDown={(e2) => {
          e2.stopPropagation();
          if (e2.nativeEvent.isComposing || e2.keyCode === 229) return;
          if (e2.key === "Escape") {
            e2.preventDefault();
            onClose();
            return;
          }
          if (e2.key === "Enter" && !e2.shiftKey) {
            e2.preventDefault();
            onClose();
          }
        }}
        className="max-h-40 min-h-[3rem] w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-[var(--fg-disabled,#919191)]"
        style={{
          color: "var(--fg-default, #141414)",
          caretColor: "var(--canvas-text-accent)",
        }}
      />
      <div
        className="flex items-center justify-between border-t pt-2"
        style={{
          borderColor: "var(--canvas-node-border, rgba(0,0,0,0.06))",
        }}
      >
        <span
          className="text-[11px]"
          style={{
            color: "var(--fg-disabled, #919191)",
          }}
        >
          {t2("canvas.annotationHint", "Enter 确认 · Shift+Enter 换行")}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-90"
          style={{
            background: "var(--canvas-text-accent)",
            color: "var(--canvas-text-accent-foreground)",
          }}
        >
          {t2("canvas.annotationConfirm", "完成")}
        </button>
      </div>
    </div>
  );
  return reactDomExports.createPortal(node2, document.body);
}
