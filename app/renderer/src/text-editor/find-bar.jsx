// find-bar.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import {
  ChevronDown,
  ChevronRight$1,
  ChevronUp,
  reactDomExports,
  reactExports,
  Regex,
  Search,
  useTranslation,
  WholeWord,
  X$7,
} from "../vendor.js";
import {
  CaseSensitive,
  Replace,
  ReplaceAll,
  useCanvasActive,
} from "../media-editing/package.jsx";
import { compileFindPattern } from "./paragraph-line-placement.js";
import { useSuspendCanvasInteractions } from "../canvas/use-inline-rename.jsx";
import { CloseIcon$1 } from "../canvas/file-missing-icon.jsx";
import { useCanvasRootElement } from "../media-editing/director-stage-header-icon.jsx";
import { ToolbarBtn } from "./editor-history-controls.jsx";

function FindBtn({
  icon,
  title,
  onClick,
  variant,
  active: active2,
  disabled: disabled2,
  dataActionUiId,
}) {
  const toggle = variant === "toggle";
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseDown={(e2) => e2.preventDefault()}
      disabled={disabled2}
      className={
        toggle
          ? "flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors"
          : "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-subtle,#f5f5f5)] disabled:pointer-events-none disabled:opacity-40"
      }
      style={
        toggle
          ? {
              background: active2
                ? "var(--bg-subtle-hover, #e8e8e8)"
                : "transparent",
              color: active2
                ? "var(--fg-default, #141414)"
                : "var(--fg-muted, #666)",
            }
          : {
              color: "var(--fg-muted, #666)",
            }
      }
      data-action-ui-id={dataActionUiId}
    >
      {icon}
    </button>
  );
}

function FindBar({ controller }) {
  const { t: t2 } = useTranslation();
  const {
    query,
    options,
    total,
    currentIndex,
    limited,
    replaceOpen,
    replaceValue,
  } = controller;
  const patternInvalid = reactExports.useMemo(
    () => query !== "" && compileFindPattern(query, options) == null,
    [query, options],
  );
  const handleInputKeyDown = reactExports.useCallback(
    (e2) => {
      if (e2.key === "Enter") {
        e2.preventDefault();
        if (e2.shiftKey) controller.prev();
        else controller.next();
      } else if (e2.key === "Escape") {
        e2.preventDefault();
        e2.stopPropagation();
        controller.close();
      }
    },
    [controller],
  );
  const handleReplaceKeyDown = reactExports.useCallback(
    (e2) => {
      if (e2.key === "Enter") {
        e2.preventDefault();
        controller.replaceCurrent();
      } else if (e2.key === "Escape") {
        e2.preventDefault();
        e2.stopPropagation();
        controller.close();
      }
    },
    [controller],
  );
  const inputBoxStyle = {
    background: "var(--bg-subtle, #f5f5f5)",
    border: "1px solid var(--canvas-node-border, #e0e0e0)",
  };
  return (
    <div
      className="absolute top-2 right-4 z-10 flex items-start gap-0.5 rounded-md py-1 pr-1 pl-0.5"
      style={{
        background: "var(--canvas-node-bg, #fff)",
        border: "1px solid var(--canvas-node-border, #e0e0e0)",
        boxShadow:
          "var(--canvas-shadow-dropdown, 0 4px 12px rgba(0, 0, 0, 0.12))",
      }}
      data-action-ui-id="canvas-text-find-bar"
    >
      <button
        type="button"
        title={t2("canvas.find.toggleReplace", "切换替换")}
        onClick={controller.toggleReplaceOpen}
        onMouseDown={(e2) => e2.preventDefault()}
        className="flex w-4 items-center justify-center self-stretch rounded transition-colors hover:bg-[var(--bg-subtle,#f5f5f5)]"
        style={{
          color: "var(--fg-muted, #666)",
        }}
        data-action-ui-id="canvas-text-find-toggle-replace"
      >
        {replaceOpen ? (
          <ChevronDown size={14} strokeWidth={1.5} />
        ) : (
          <ChevronRight$1 size={14} strokeWidth={1.5} />
        )}
      </button>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <div
            className="flex h-7 items-center gap-0.5 rounded-md pr-0.5 pl-1.5"
            style={{
              ...inputBoxStyle,
              border: `1px solid ${patternInvalid ? "var(--fg-danger, #e5484d)" : "var(--canvas-node-border, #e0e0e0)"}`,
            }}
          >
            <input
              ref={controller.inputRef}
              value={query}
              onChange={(e2) => controller.setQuery(e2.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={t2("canvas.find.placeholder", "查找")}
              spellCheck={false}
              className="w-40 border-0 bg-transparent text-xs outline-none"
              style={{
                color: "var(--fg-default, #141414)",
              }}
              data-action-ui-id="canvas-text-find-input"
            />
            <FindBtn
              variant="toggle"
              icon={<CaseSensitive size={14} strokeWidth={1.5} />}
              title={t2("canvas.find.matchCase", "区分大小写")}
              active={options.matchCase}
              onClick={() => controller.toggleOption("matchCase")}
              dataActionUiId="canvas-text-find-match-case"
            />
            <FindBtn
              variant="toggle"
              icon={<WholeWord size={14} strokeWidth={1.5} />}
              title={t2("canvas.find.wholeWord", "全字匹配")}
              active={options.wholeWord}
              onClick={() => controller.toggleOption("wholeWord")}
              dataActionUiId="canvas-text-find-whole-word"
            />
            <FindBtn
              variant="toggle"
              icon={<Regex size={14} strokeWidth={1.5} />}
              title={t2("canvas.find.regex", "使用正则表达式")}
              active={options.regex}
              onClick={() => controller.toggleOption("regex")}
              dataActionUiId="canvas-text-find-regex"
            />
          </div>
          <span
            className="min-w-12 px-0.5 text-center text-[11px] tabular-nums"
            style={{
              color: "var(--fg-muted, #666)",
            }}
            data-action-ui-id="canvas-text-find-count"
          >
            {total > 0
              ? `${currentIndex + 1}/${total}${limited ? "+" : ""}`
              : t2("canvas.find.noResults", "无结果")}
          </span>
          <FindBtn
            variant="nav"
            icon={<ChevronUp size={14} strokeWidth={1.5} />}
            title={t2("canvas.find.previous", "上一个匹配")}
            onClick={controller.prev}
            disabled={total === 0}
            dataActionUiId="canvas-text-find-prev"
          />
          <FindBtn
            variant="nav"
            icon={<ChevronDown size={14} strokeWidth={1.5} />}
            title={t2("canvas.find.next", "下一个匹配")}
            onClick={controller.next}
            disabled={total === 0}
            dataActionUiId="canvas-text-find-next"
          />
          <FindBtn
            variant="nav"
            icon={<X$7 size={14} strokeWidth={1.5} />}
            title={t2("canvas.close")}
            onClick={controller.close}
            dataActionUiId="canvas-text-find-close"
          />
        </div>
        {replaceOpen && (
          <div className="flex items-center gap-1">
            <div
              className="flex h-7 items-center rounded-md pl-1.5"
              style={inputBoxStyle}
            >
              <input
                value={replaceValue}
                onChange={(e2) => controller.setReplaceValue(e2.target.value)}
                onKeyDown={handleReplaceKeyDown}
                placeholder={t2("canvas.find.replacePlaceholder", "替换")}
                spellCheck={false}
                className="w-40 border-0 bg-transparent text-xs outline-none"
                style={{
                  color: "var(--fg-default, #141414)",
                }}
                data-action-ui-id="canvas-text-find-replace-input"
              />
              <span aria-hidden={true} className="w-[66px] shrink-0" />
            </div>
            <FindBtn
              variant="nav"
              icon={<Replace size={14} strokeWidth={1.5} />}
              title={t2("canvas.find.replace", "替换")}
              onClick={controller.replaceCurrent}
              disabled={total === 0}
              dataActionUiId="canvas-text-find-replace-one"
            />
            <FindBtn
              variant="nav"
              icon={<ReplaceAll size={14} strokeWidth={1.5} />}
              title={t2("canvas.find.replaceAll", "全部替换")}
              onClick={controller.replaceAll}
              disabled={total === 0}
              dataActionUiId="canvas-text-find-replace-all"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function useCanvasShortcutGuard() {
  const active2 = useCanvasActive();
  useSuspendCanvasInteractions(true);
  reactExports.useEffect(() => {
    if (!active2) return;
    const isInEditor = (target) =>
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable);
    const deleteKeyCapture = (e2) => {
      if (e2.key !== "Delete" && e2.key !== "Backspace") return;
      if (isInEditor(e2.target)) return;
      e2.stopPropagation();
      e2.stopImmediatePropagation();
    };
    const shortcutBubble = (e2) => {
      if (e2.key === "Escape") return;
      const meta2 = e2.metaKey || e2.ctrlKey;
      if (
        meta2 ||
        (e2.shiftKey && (e2.code === "Digit1" || e2.code === "Digit2"))
      ) {
        e2.stopPropagation();
      }
    };
    const clipboardCapture = (e2) => {
      if (isInEditor(e2.target)) return;
      e2.stopPropagation();
    };
    document.addEventListener("keydown", deleteKeyCapture, true);
    document.addEventListener("keydown", shortcutBubble);
    document.addEventListener("copy", clipboardCapture, true);
    document.addEventListener("cut", clipboardCapture, true);
    document.addEventListener("paste", clipboardCapture, true);
    return () => {
      document.removeEventListener("keydown", deleteKeyCapture, true);
      document.removeEventListener("keydown", shortcutBubble);
      document.removeEventListener("copy", clipboardCapture, true);
      document.removeEventListener("cut", clipboardCapture, true);
      document.removeEventListener("paste", clipboardCapture, true);
    };
  }, [active2]);
}

export function FullscreenShell({
  toolbarActions,
  saveStatus,
  headerLeft,
  overlay,
  hideFind,
  hideClose,
  find: find2,
  editorOwnsScroll,
  onClose,
  children: children2,
}) {
  const { t: t2 } = useTranslation();
  const canvasRootEl = useCanvasRootElement();
  useCanvasShortcutGuard();
  const findItem = reactExports.useMemo(
    () =>
      find2 && !hideFind
        ? {
            id: "find",
            label: t2("canvas.find.title", "查找"),
            icon: <Search size={16} strokeWidth={1.5} />,
            onClick: () => find2.open(),
            active: find2.isOpen,
            dataActionUiId: "canvas-text-find-open",
          }
        : null,
    [find2, hideFind, t2],
  );
  const handlePanelKeyDown = reactExports.useCallback(
    (e2) => {
      if (
        find2 &&
        !hideFind &&
        (e2.metaKey || e2.ctrlKey) &&
        !e2.altKey &&
        !e2.shiftKey &&
        e2.key.toLowerCase() === "f"
      ) {
        e2.preventDefault();
        find2.open();
      } else if (find2?.isOpen && e2.key === "Escape") {
        e2.preventDefault();
        find2.close();
      }
      e2.stopPropagation();
    },
    [find2, hideFind],
  );
  return reactDomExports.createPortal(
    <div
      role="dialog"
      data-canvas-chrome="true"
      className={`canvas-text-fullscreen-editor tiptap-editor-wrapper ${canvasRootEl ? "absolute" : "fixed"} inset-0 z-[10100] flex flex-col animate-[lightbox-fade-in_0.15s_ease-out]`}
      style={{
        background: "var(--canvas-node-bg, #fff)",
      }}
      onKeyDown={handlePanelKeyDown}
      onKeyUp={(e2) => e2.stopPropagation()}
      onContextMenu={(e2) => e2.stopPropagation()}
    >
      <div
        className="flex items-center shrink-0 px-3 py-2"
        style={{
          borderBottom: "1px solid var(--canvas-node-border, #e0e0e0)",
        }}
      >
        <div className="flex min-w-0 flex-1 items-center">{headerLeft}</div>
        {saveStatus}
        <div className="flex items-center gap-0.5">
          {toolbarActions}
          {findItem && <ToolbarBtn item={findItem} />}
          {!hideClose && (
            <button
              type="button"
              title={t2("canvas.close")}
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-subtle,#f5f5f5)]"
              style={{
                color: "var(--fg-muted, #666)",
              }}
            >
              <CloseIcon$1 />
            </button>
          )}
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        {find2?.isOpen && <FindBar controller={find2} />}
        <div className="flex h-full min-h-0">
          <div
            className={
              editorOwnsScroll
                ? "h-full min-w-0 flex-1 overflow-hidden pl-8"
                : "h-full flex-1 overflow-y-auto py-4 px-8"
            }
            data-diff-scroll-root="true"
          >
            {children2}
          </div>
        </div>
        {overlay}
      </div>
    </div>,
    canvasRootEl ?? document.body,
  );
}
