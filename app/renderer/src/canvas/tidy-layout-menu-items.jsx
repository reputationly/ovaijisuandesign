// tidy-layout-menu-items.jsx
import {
  CompositedSvg,
  jsxRuntimeExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  TidyHint,
  TidySortContext,
} from "./canvas-high-blast-delete-dialog.jsx";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../media-editing/audio-lightbox.jsx";
import { SegmentedSwitch } from "../generation/segmented-switch.jsx";
import { Checkbox } from "../infra/checkbox.jsx";
const useTidySort = () => reactExports.useContext(TidySortContext);
function TidyGridIcon(props) {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      {...props}
    >
      <path
        d="M5.25 8.75C6.28565 8.75 7.137 9.53722 7.23926 10.5459L7.25 10.75V12.75L7.23926 12.9541C7.1438 13.8957 6.39565 14.6438 5.4541 14.7393L5.25 14.75H3.25C2.14543 14.75 1.25 13.8546 1.25 12.75V10.75C1.25 9.64543 2.14543 8.75 3.25 8.75H5.25ZM13.5098 10.75C13.5098 10.3303 13.1697 9.99023 12.75 9.99023H10.75C10.3303 9.99023 9.99023 10.3303 9.99023 10.75V12.75C9.99023 13.1697 10.3303 13.5098 10.75 13.5098H12.75C13.1697 13.5098 13.5098 13.1697 13.5098 12.75V10.75ZM3.25 9.99023C2.83026 9.99023 2.49023 10.3303 2.49023 10.75V12.75C2.49023 13.1697 2.83026 13.5098 3.25 13.5098H5.25C5.66974 13.5098 6.00977 13.1697 6.00977 12.75V10.75C6.00977 10.3303 5.66974 9.99023 5.25 9.99023H3.25ZM5.25 1.25C6.28565 1.25 7.137 2.03722 7.23926 3.0459L7.25 3.25V5.25L7.23926 5.4541C7.1438 6.39565 6.39565 7.1438 5.4541 7.23926L5.25 7.25H3.25C2.14543 7.25 1.25 6.35457 1.25 5.25V3.25C1.25 2.14543 2.14543 1.25 3.25 1.25H5.25ZM12.75 1.25C13.7857 1.25 14.637 2.03722 14.7393 3.0459L14.75 3.25V5.25L14.7393 5.4541C14.6438 6.39565 13.8957 7.1438 12.9541 7.23926L12.75 7.25H10.75C9.64543 7.25 8.75 6.35457 8.75 5.25V3.25C8.75 2.14543 9.64543 1.25 10.75 1.25H12.75ZM3.25 2.49023C2.83026 2.49023 2.49023 2.83026 2.49023 3.25V5.25C2.49023 5.66974 2.83026 6.00977 3.25 6.00977H5.25C5.66974 6.00977 6.00977 5.66974 6.00977 5.25V3.25C6.00977 2.83026 5.66974 2.49023 5.25 2.49023H3.25ZM10.75 2.49023C10.3303 2.49023 9.99023 2.83026 9.99023 3.25V5.25C9.99023 5.66974 10.3303 6.00977 10.75 6.00977H12.75C13.1697 6.00977 13.5098 5.66974 13.5098 5.25V3.25C13.5098 2.83026 13.1697 2.49023 12.75 2.49023H10.75ZM14.75 12.75L14.7393 12.9541C14.6438 13.8957 13.8957 14.6438 12.9541 14.7393L12.75 14.75H10.75C9.64543 14.75 8.75 13.8546 8.75 12.75V10.75C8.75 9.64543 9.64543 8.75 10.75 8.75H12.75C13.7857 8.75 14.637 9.53722 14.7393 10.5459L14.75 10.75V12.75Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
function TidyHorizontalIcon(props) {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      {...props}
    >
      <path
        d="M5.75977 10C5.75977 9.58026 5.41974 9.24023 5 9.24023H3C2.58026 9.24023 2.24023 9.58026 2.24023 10V12C2.24023 12.4197 2.58026 12.7598 3 12.7598H5C5.41974 12.7598 5.75977 12.4197 5.75977 12V10ZM13.2598 10C13.2598 9.58026 12.9197 9.24023 12.5 9.24023H10.5C10.0803 9.24023 9.74023 9.58026 9.74023 10V12C9.74023 12.4197 10.0803 12.7598 10.5 12.7598H12.5C12.9197 12.7598 13.2598 12.4197 13.2598 12V10ZM7 12L6.98926 12.2041C6.8938 13.1457 6.14565 13.8938 5.2041 13.9893L5 14H3C1.89543 14 1 13.1046 1 12V10C1 8.89543 1.89543 8 3 8H5C6.03565 8 6.887 8.78722 6.98926 9.7959L7 10V12ZM14.5 12L14.4893 12.2041C14.3938 13.1457 13.6457 13.8938 12.7041 13.9893L12.5 14H10.5C9.39543 14 8.5 13.1046 8.5 12V10C8.5 8.89543 9.39543 8 10.5 8H12.5C13.5357 8 14.387 8.78722 14.4893 9.7959L14.5 10V12Z"
        fill="currentColor"
      />
      <path
        d="M1.06152 3.83398C1.06152 3.4915 1.33916 3.21387 1.68164 3.21387L12.5645 3.21387L11.5615 2.21094C11.3194 1.96877 11.3194 1.57615 11.5615 1.33398C11.8037 1.09182 12.1963 1.09182 12.4385 1.33398L14.2314 3.12688C14.6219 3.5174 14.6219 4.15057 14.2314 4.54109L12.4385 6.33398C12.1963 6.57615 11.8037 6.57615 11.5615 6.33398C11.3194 6.09182 11.3194 5.69919 11.5615 5.45703L12.5645 4.4541L1.68164 4.4541C1.33916 4.4541 1.06152 4.17647 1.06152 3.83398Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
function TidyVerticalIcon(props) {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      {...props}
    >
      <path
        d="M6 8.5C7.10457 8.5 8 9.39543 8 10.5V12.5C8 13.5357 7.21278 14.387 6.2041 14.4893L6 14.5H4L3.7959 14.4893C2.85435 14.3938 2.1062 13.6457 2.01074 12.7041L2 12.5V10.5C2 9.39543 2.89543 8.5 4 8.5H6ZM4 9.74023C3.58026 9.74023 3.24023 10.0803 3.24023 10.5V12.5C3.24023 12.9197 3.58026 13.2598 4 13.2598H6C6.41974 13.2598 6.75977 12.9197 6.75977 12.5V10.5C6.75977 10.0803 6.41974 9.74023 6 9.74023H4ZM6 1C7.10457 1 8 1.89543 8 3V5C8 6.03565 7.21278 6.887 6.2041 6.98926L6 7H4L3.7959 6.98926C2.85435 6.8938 2.1062 6.14565 2.01074 5.2041L2 5V3C2 1.89543 2.89543 1 4 1H6ZM4 2.24023C3.58026 2.24023 3.24023 2.58026 3.24023 3V5C3.24023 5.41974 3.58026 5.75977 4 5.75977H6C6.41974 5.75977 6.75977 5.41974 6.75977 5V3C6.75977 2.58026 6.41974 2.24023 6 2.24023H4Z"
        fill="currentColor"
      />
      <path
        d="M12 1.06152C12.3425 1.06152 12.6201 1.33916 12.6201 1.68164V12.5645L13.623 11.5615C13.8652 11.3194 14.2578 11.3194 14.5 11.5615C14.7422 11.8037 14.7422 12.1963 14.5 12.4385L12.7071 14.2314C12.3166 14.6219 11.6834 14.6219 11.2929 14.2314L9.5 12.4385C9.25784 12.1963 9.25784 11.8037 9.5 11.5615C9.74216 11.3194 10.1348 11.3194 10.377 11.5615L11.3799 12.5645V1.68164C11.3799 1.33916 11.6575 1.06152 12 1.06152Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
const INCLUDE_DEPS_STORAGE_KEY = "hilo:canvas:tidy:includeDeps";
const autoAlignListeners = new Set();
function readAutoAlignPreference() {
  try {
    return (
      typeof localStorage !== "undefined" &&
      localStorage.getItem(INCLUDE_DEPS_STORAGE_KEY) === "1"
    );
  } catch {
    return false;
  }
}
function emitAutoAlignChange() {
  for (const listener of autoAlignListeners) listener();
}
let autoAlignSnapshot;
function getAutoAlignSnapshot() {
  if (autoAlignSnapshot === void 0)
    autoAlignSnapshot = readAutoAlignPreference();
  return autoAlignSnapshot;
}
function handleStorageChange(event) {
  if (event.key !== INCLUDE_DEPS_STORAGE_KEY) return;
  const next2 = event.newValue === "1";
  if (next2 === getAutoAlignSnapshot()) return;
  autoAlignSnapshot = next2;
  emitAutoAlignChange();
}
function setAutoAlignPreference(next2) {
  if (next2 === getAutoAlignSnapshot()) return;
  autoAlignSnapshot = next2;
  try {
    localStorage.setItem(INCLUDE_DEPS_STORAGE_KEY, next2 ? "1" : "0");
  } catch {}
  emitAutoAlignChange();
}
function subscribeAutoAlign(listener) {
  autoAlignListeners.add(listener);
  if (autoAlignListeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageChange);
  }
  return () => {
    autoAlignListeners.delete(listener);
    if (autoAlignListeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorageChange);
    }
  };
}
const LAYOUT_OPTIONS = [
  {
    kind: "grid",
    labelKey: "canvas.tidy.grid",
    defaultLabel: "宫格布局",
    icon: TidyGridIcon,
  },
  {
    kind: "horizontal",
    labelKey: "canvas.tidy.horizontal",
    defaultLabel: "水平布局",
    icon: TidyHorizontalIcon,
  },
  {
    kind: "vertical",
    labelKey: "canvas.tidy.vertical",
    defaultLabel: "垂直布局",
    icon: TidyVerticalIcon,
  },
];
const MENU_LEADING_CLASS =
  "flex size-4 shrink-0 items-center justify-center pointer-coarse:size-11";
export function TidyLayoutMenuItems({ onTidy, showIncludeDeps, uiIdPrefix }) {
  const { t: t2 } = useTranslation();
  const { sortBy, setSortBy } = useTidySort();
  const includeDeps = reactExports.useSyncExternalStore(
    subscribeAutoAlign,
    getAutoAlignSnapshot,
    () => false,
  );
  const includeDepsHint = t2(
    "canvas.tidy.includeDeps.hint",
    "根据节点连线关系自动整理上下游结构",
  );
  const includeDepsHintId = reactExports.useId();
  const includeDepsId = reactExports.useId();
  return (
    <>
      <SegmentedSwitch
        value={sortBy}
        onValueChange={setSortBy}
        ariaLabel={t2("canvas.tidy.orderBy", "排序依据")}
        dataActionUiId={`${uiIdPrefix}-order-tabs`}
        options={[
          {
            value: "name",
            label: t2("canvas.tidy.orderName", "按名称"),
            dataActionUiId: `${uiIdPrefix}-order-name`,
          },
          {
            value: "addedAt",
            label: t2("canvas.tidy.orderAddedAt", "按时间"),
            dataActionUiId: `${uiIdPrefix}-order-added-at`,
          },
        ]}
        variant="label"
        gap="xs"
        stretch={true}
        itemClassName={
          uiIdPrefix === "canvas.selection-tidy"
            ? "canvas-toolbar-menu-item h-[26px]"
            : "h-[26px] text-xs hover:!bg-tab-active-bg/80"
        }
        className="mb-1 h-[30px] shrink-0 [&_[data-slot=segmented-switch-thumb]]:h-[26px] [&_[data-slot=segmented-switch-thumb]]:bg-card"
      />
      {LAYOUT_OPTIONS.map((option2) => {
        const Icon2 = option2.icon;
        return (
          <DropdownMenuItem
            key={option2.kind}
            data-action-ui-id={`${uiIdPrefix}-${option2.kind}`}
            onClick={() => void onTidy(option2.kind, includeDeps)}
            className="cursor-pointer gap-2 rounded-md px-3 py-2 text-xs tracking-tight"
          >
            <span className={MENU_LEADING_CLASS}>
              <Icon2
                aria-hidden="true"
                className="text-[var(--canvas-controls-text-muted)]"
              />
            </span>
            <span className="whitespace-nowrap text-[var(--canvas-controls-text)]">
              {t2(option2.labelKey, option2.defaultLabel)}
            </span>
          </DropdownMenuItem>
        );
      })}
      {showIncludeDeps && (
        <>
          <DropdownMenuSeparator />
          <div
            className={
              uiIdPrefix === "canvas.selection-tidy"
                ? "canvas-toolbar-menu-item group flex cursor-pointer items-center gap-2 px-3 py-2"
                : "group flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs tracking-tight hover:bg-[var(--canvas-controls-hover)]"
            }
          >
            <label
              htmlFor={includeDepsId}
              className="flex flex-1 cursor-pointer items-center gap-2"
            >
              <span className={MENU_LEADING_CLASS}>
                <Checkbox
                  id={includeDepsId}
                  data-action-ui-id={`${uiIdPrefix}-include-deps`}
                  checked={includeDeps}
                  onCheckedChange={setAutoAlignPreference}
                  aria-describedby={includeDepsHintId}
                  size="sm"
                  className="cursor-pointer"
                />
              </span>
              <span className="whitespace-nowrap text-[var(--canvas-controls-text)]">
                {t2("canvas.tidy.includeDeps", "整理相连的上下游")}
              </span>
            </label>
            <TidyHint hint={includeDepsHint} hintId={includeDepsHintId} />
          </div>
        </>
      )}
    </>
  );
}
