// segmented-control.jsx
import { __jsx } from "../shared/jsx-runtime.js";

const SCROLL_EDGE_EPSILON = 1;

function shouldConsumePanelWheel(element2, deltaY) {
  if (deltaY === 0) return false;
  const maxScrollTop = element2.scrollHeight - element2.clientHeight;
  if (maxScrollTop <= SCROLL_EDGE_EPSILON) return false;
  return deltaY < 0
    ? element2.scrollTop > SCROLL_EDGE_EPSILON
    : element2.scrollTop < maxScrollTop - SCROLL_EDGE_EPSILON;
}

function handleScrollablePanelWheel(event) {
  if (shouldConsumePanelWheel(event.currentTarget, event.deltaY)) {
    event.stopPropagation();
  }
}

export function LeftPanel({
  leftContent,
  leftFooter,
  leftContentScrollable = true,
  rightContent,
  rightFooter,
  rightScrollClassName = "",
}) {
  return (
    <aside className="bg-hl_bg_01 flex h-full w-full overflow-hidden rounded-lg">
      <div className="flex w-[328px] shrink-0 flex-col">
        <div
          className={`[scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-h-0 flex-1 ${leftContentScrollable ? "overflow-y-auto" : "overflow-hidden"}`}
          onWheelCapture={handleScrollablePanelWheel}
        >
          {leftContent}
        </div>
        {leftFooter}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className={`[scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-h-0 overflow-y-auto ${rightScrollClassName}`}
          onWheelCapture={handleScrollablePanelWheel}
        >
          {rightContent}
        </div>
        {rightFooter}
      </div>
    </aside>
  );
}

export function SegmentedControl$1({
  options,
  value,
  onChange,
  className = "",
  dataActionUiIdPrefix,
}) {
  return (
    <div
      className={`bg-hl_bg_01 flex items-center gap-[2px] rounded-[100px] p-[2px] ${className}`}
    >
      {options.map((opt) => {
        const isActive2 = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            data-action-ui-id={
              dataActionUiIdPrefix
                ? `${dataActionUiIdPrefix}.${opt.value}`
                : void 0
            }
            className={[
              "flex flex-1 items-center justify-center rounded-[100px] py-[7px] transition-colors",
              isActive2
                ? "bg-hl_bg_08 text-hl_text_00"
                : "text-hl_text_02 hover:text-hl_text_00",
            ].join(" ")}
            onClick={() => onChange(opt.value)}
          >
            <span className="text-[11px] font-medium leading-[14px] tracking-[0.44px]">
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function readableGenerationError(error) {
  const raw2 = error instanceof Error ? error.message : String(error);
  if (/<!doctype\s+html|<html[\s>]/i.test(raw2)) {
    const status = raw2.match(/failed:\s*(\d{3})\b/i)?.[1];
    return status ? `服务请求失败（HTTP ${status}）` : "服务请求失败";
  }
  return raw2.length > 240 ? `${raw2.slice(0, 240)}…` : raw2;
}
