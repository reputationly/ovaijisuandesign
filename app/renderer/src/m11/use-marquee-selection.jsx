// use-marquee-selection.jsx
import { useTranslation, reactExports, API_PATHS, measurePerf, MenuPortal, MenuPositioner, MenuPopup, MonitorUp } from "../vendor.js";
import { DropdownMenu } from "../m15/graph.jsx";
import { FolderOpen } from "../m15/parse-item.jsx";
import { cn$2 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { ActionMenuPanel, ActionDropdownMenuItem } from "../m10/new-workspace-dialog.jsx";
import {
  PERF_ASSET_PICKER_OPEN_FIRST_PAINT,
  PERF_ASSET_PICKER_OPEN_INTERACTIVE,
} from "../m01/text-models.js";
import { __jsx } from "../shared/jsx-runtime.js";
const FPS_BATCH_CONCURRENCY = 4;
const FPS_BATCH_TIMEOUT_MS = 15e3;
function isRecord$8(value) {
  return typeof value === "object" && value !== null;
}
function mapAssetFpsResponse(value) {
  if (!isRecord$8(value) || value.ok !== true || !isRecord$8(value.metadata)) return 0;
  const fps = value.metadata.fps;
  return typeof fps === "number" && Number.isFinite(fps) && fps > 0 ? fps : 0;
}
async function loadAssetFps(assetId, gatewayFetch2, signal) {
  try {
    return await raceWithAbort(
      gatewayFetch2(API_PATHS.assetMetadata(assetId), {
        signal,
      }).then(async (response) => mapAssetFpsResponse(await response.json())),
      signal,
    );
  } catch {
    return 0;
  }
}
function raceWithAbort(promise, signal) {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const handleAbort = () => reject(signal.reason);
    signal.addEventListener("abort", handleAbort, {
      once: true,
    });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", handleAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", handleAbort);
        reject(error);
      },
    );
  });
}
export async function loadAssetFpsBatch(assetIds, gatewayFetch2, signal) {
  const uniqueIds = [...new Set(assetIds.filter(Boolean))];
  if (signal.aborted || uniqueIds.length === 0) return new Map();
  const results = new Map();
  let nextIndex = 0;
  const batchController = new AbortController();
  const handleCallerAbort = () => batchController.abort(signal.reason);
  signal.addEventListener("abort", handleCallerAbort, {
    once: true,
  });
  const timeoutId = setTimeout(
    () => batchController.abort(new DOMException("FPS probe timed out", "TimeoutError")),
    FPS_BATCH_TIMEOUT_MS,
  );
  const worker = async () => {
    while (!batchController.signal.aborted) {
      const index2 = nextIndex;
      if (index2 >= uniqueIds.length) return;
      nextIndex += 1;
      const assetId = uniqueIds[index2];
      if (!assetId) continue;
      const fps = await loadAssetFps(assetId, gatewayFetch2, batchController.signal);
      if (!batchController.signal.aborted) results.set(assetId, fps);
    }
  };
  const workerCount = Math.min(FPS_BATCH_CONCURRENCY, uniqueIds.length);
  try {
    await Promise.all(
      Array.from(
        {
          length: workerCount,
        },
        () => worker(),
      ),
    );
  } finally {
    clearTimeout(timeoutId);
    signal.removeEventListener("abort", handleCallerAbort);
  }
  if (signal.aborted) return new Map();
  return new Map(uniqueIds.map((assetId) => [assetId, results.get(assetId) ?? 0]));
}
const MAX_MOUNTED_ITEMS = 500;
export function createAssetPickerPerfSession({
  openedAt = performance.now(),
  now: now2 = () => performance.now(),
  totalItems,
  view: view2,
}) {
  let phase = "opened";
  let mountedItems = 0;
  let firstPaintMs;
  let interactiveMs;
  const snapshot2 = () => ({
    phase,
    view: view2,
    totalItemsBucket: bucketItemCount(totalItems),
    mountedItems,
    ...(firstPaintMs === void 0
      ? {}
      : {
          firstPaintMs,
        }),
    ...(interactiveMs === void 0
      ? {}
      : {
          interactiveMs,
        }),
  });
  return {
    markFirstPaint() {
      if (firstPaintMs !== void 0) return;
      firstPaintMs = elapsedMs(openedAt, now2());
      phase = "first-paint";
      measurePerf(PERF_ASSET_PICKER_OPEN_FIRST_PAINT, openedAt, snapshot2());
    },
    markInteractive() {
      if (interactiveMs !== void 0) return;
      interactiveMs = elapsedMs(openedAt, now2());
      phase = "interactive";
      measurePerf(PERF_ASSET_PICKER_OPEN_INTERACTIVE, openedAt, snapshot2());
    },
    recordMountedItems(count2) {
      mountedItems = boundedCount(count2, MAX_MOUNTED_ITEMS);
    },
    snapshot: snapshot2,
  };
}
function bucketItemCount(count2) {
  const normalized = boundedCount(count2, Number.MAX_SAFE_INTEGER);
  if (normalized === 0) return "0";
  if (normalized <= 20) return "1-20";
  if (normalized <= 50) return "21-50";
  if (normalized <= 100) return "51-100";
  if (normalized <= 250) return "101-250";
  return "251+";
}
function elapsedMs(start2, end2) {
  if (!Number.isFinite(start2) || !Number.isFinite(end2)) return 0;
  return Math.round(Math.max(0, end2 - start2) * 100) / 100;
}
function boundedCount(count2, max2) {
  if (!Number.isFinite(count2)) return count2 > 0 ? max2 : 0;
  return Math.min(Math.max(Math.trunc(count2), 0), max2);
}
export function getAssetSourceAvailability(status, reasons) {
  if (reasons.some((reason) => reason === void 0)) return "available";
  if (status === "error") return "error";
  if (
    status === "loading" ||
    reasons.some((reason) => reason === "media-metadata-pending" || reason === "video-fps-pending")
  )
    return "pending";
  return "empty";
}
export function selectionSummary(options, count2, allowedTypes, t2, counts) {
  const constraints2 = options?.constraints;
  const types2 = allowedTypes.length
    ? allowedTypes
    : ["image", "video", "audio", "text", "subtitle", "file"];
  const limits = types2
    .map((type2) => {
      const label = t2(`assetPicker.typeFilter.${type2}`, type2);
      if (constraints2 && (type2 === "image" || type2 === "video" || type2 === "audio")) {
        return t2("assetPicker.summary.limits", "最多 {{types}}", {
          types: `${Math.max(0, constraints2.remainingByKind[type2])} ${label}`,
        });
      }
      return label;
    })
    .join(" · ");
  let max2 = options?.multiple ? options.maxCount : 1;
  if (max2 !== void 0 && (!Number.isFinite(max2) || max2 <= 0)) max2 = void 0;
  if (
    constraints2 &&
    types2.every((type2) => type2 === "image" || type2 === "video" || type2 === "audio")
  ) {
    const image2 = types2.includes("image") ? Math.max(0, constraints2.remainingByKind.image) : 0;
    const video = types2.includes("video") ? Math.max(0, constraints2.remainingByKind.video) : 0;
    const audio = types2.includes("audio") ? Math.max(0, constraints2.remainingByKind.audio) : 0;
    const capacity =
      image2 + Math.min(video + audio, Math.max(0, constraints2.remainingVideoAudio ?? Infinity));
    max2 = typeof max2 === "number" && max2 > 0 ? Math.min(max2, capacity) : capacity;
  }
  const selected2 =
    typeof max2 === "number" && max2 >= 0
      ? t2("assetPicker.summary.bounded", "已选：{{count}} / {{max}}", {
          count: count2,
          max: max2,
        })
      : t2("assetPicker.summary.unbounded", "已选 {{count}} 项", {
          count: count2,
        });
  const detail = t2("assetPicker.summary.types", "可选：{{types}}", {
    types: limits,
  });
  const shared =
    constraints2?.remainingVideoAudio !== void 0 &&
    types2.includes("video") &&
    types2.includes("audio")
      ? t2("assetPicker.summary.shared", "；视频与音频合计最多 {{max}} 项", {
          max: Math.max(0, constraints2.remainingVideoAudio),
        })
      : "";
  const minimum =
    options?.minCount && options.minCount > 0
      ? t2("assetPicker.summary.minimum", "；至少选择 {{min}} 项", {
          min: options.minCount,
        })
      : "";
  const fullTypes =
    constraints2 && counts
      ? types2
          .filter(
            (type2) =>
              (type2 === "image" || type2 === "video" || type2 === "audio") &&
              counts[type2] > 0 &&
              counts[type2] >= constraints2.remainingByKind[type2],
          )
          .map((type2) => t2(`assetPicker.typeFilter.${type2}`, type2))
          .join(" · ")
      : "";
  const full =
    typeof max2 === "number" && count2 >= max2
      ? ` · ${t2("assetPicker.summary.full", "已达选择上限，请先取消部分已选素材。")}`
      : fullTypes
        ? ` · ${t2(
            "assetPicker.summary.typeFull",
            "{{types}}已达选择上限，请先取消部分已选素材。",
            {
              types: fullTypes,
            },
          )}`
        : "";
  return {
    selected: selected2,
    detail: `${detail}${shared}${minimum}`,
    full,
  };
}
export function AssetSourceMenu({
  anchor,
  preferredSide = "bottom",
  appearance = "canvas",
  availability,
  onCanvas,
  onLocal,
  onCancel,
}) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(true);
  const pendingActionRef = reactExports.useRef(null);
  function closeWithAction(action) {
    if (pendingActionRef.current) return;
    pendingActionRef.current = action;
    setOpen(false);
  }
  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen, details) => {
        if (!nextOpen && details.reason !== "item-press") closeWithAction(onCancel);
      }}
      onOpenChangeComplete={(nextOpen) => {
        if (nextOpen) return;
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        action?.();
      }}
    >
      <MenuPortal>
        <MenuPositioner
          anchor={anchor}
          side={preferredSide}
          collisionAvoidance={{
            side: "flip",
            align: "shift",
            fallbackAxisSide: "none",
          }}
          collisionPadding={8}
          align={preferredSide === "top" ? "center" : "start"}
          sideOffset={8}
          className="z-10002"
        >
          <ActionMenuPanel
            appearance={appearance}
            className={`w-60 max-w-[calc(100vw-1rem)] [--action-list-item-height:38px] [--action-list-item-padding:9px_12px] [--action-list-item-radius:8px] [--action-list-row-gap:4px] ${preferredSide === "top" ? "data-[side=top]:origin-bottom data-[side=bottom]:origin-top" : ""}`}
            render={
              <MenuPopup
                className={cn$2("origin-(--transform-origin) outline-none", "dp-motion-quick-zoom")}
                finalFocus={() => anchor}
              />
            }
            data-action-ui-id="asset-source.menu"
          >
            {availability !== "empty" && (
              <ActionDropdownMenuItem
                disabled={availability !== "available"}
                data-action-ui-id="asset-source.canvas"
                onClick={() => closeWithAction(onCanvas)}
              >
                <FolderOpen className="size-4" strokeWidth={1.5} aria-hidden="true" />
                {availability === "pending"
                  ? t2("assetPicker.source.loading", "正在检查可选资源…")
                  : availability === "error"
                    ? t2("assetPicker.source.error", "资源暂不可用")
                    : t2("assetPicker.source.task", "当前任务文件中选择")}
              </ActionDropdownMenuItem>
            )}
            <ActionDropdownMenuItem
              data-action-ui-id="asset-source.local"
              onClick={() => closeWithAction(onLocal)}
            >
              <MonitorUp className="size-4" strokeWidth={1.5} aria-hidden="true" />
              {t2("assetPicker.source.local", "本地上传")}
            </ActionDropdownMenuItem>
          </ActionMenuPanel>
        </MenuPositioner>
      </MenuPortal>
    </DropdownMenu>
  );
}
function intersects(a2, b3) {
  return a2.left < b3.right && a2.right > b3.left && a2.top < b3.bottom && a2.bottom > b3.top;
}
function reconcileMarquee(snapshot2, previous2, entryOrder, hits, canAdd) {
  const candidates2 = new Map(hits.map((row) => [row.rowKey, row]));
  const order2 = entryOrder.filter((id2) => candidates2.has(id2));
  const queued = new Set(order2);
  for (const row of hits) {
    if (!queued.has(row.rowKey)) {
      order2.push(row.rowKey);
      queued.add(row.rowKey);
    }
  }
  const selection2 = new Map(snapshot2);
  const add2 = (id2) => {
    const row = candidates2.get(id2);
    if (row && !selection2.has(id2) && canAdd(row, selection2)) selection2.set(id2, row);
  };
  for (const id2 of previous2.keys()) add2(id2);
  for (const id2 of order2) add2(id2);
  return {
    selection: selection2,
    entryOrder: order2,
  };
}
export function useMarqueeSelection(options) {
  const { scrollEl, enabled, rows, view: view2 } = options;
  const latest2 = reactExports.useRef(options);
  latest2.current = options;
  const [rectangle, setRectangle] = reactExports.useState(null);
  const rowOrder = JSON.stringify(rows.map((row) => [row.rowKey, row.assetId]));
  reactExports.useEffect(() => {
    if (!scrollEl || !enabled) return;
    const ownerWindow = scrollEl.ownerDocument.defaultView;
    if (!ownerWindow) return;
    const selectionScope = scrollEl.closest("[data-asset-picker-selection-scope]") ?? scrollEl;
    let gesture = null;
    let frame2 = 0;
    let suppressClick = false;
    let clickTimer = 0;
    function clearNativeSelection() {
      const selection2 = ownerWindow?.getSelection();
      if (
        selection2 &&
        (selectionScope.contains(selection2.anchorNode) ||
          selectionScope.contains(selection2.focusNode))
      )
        selection2.removeAllRanges();
    }
    function clearClickSuppression() {
      suppressClick = false;
      ownerWindow?.clearTimeout(clickTimer);
    }
    function finish(restore, publish = true) {
      if (!gesture) return;
      const {
        active: active2,
        snapshot: snapshot2,
        pointerId,
        previousUserSelect,
        previousUserSelectPriority,
      } = gesture;
      if (active2) clearNativeSelection();
      gesture = null;
      ownerWindow?.cancelAnimationFrame(frame2);
      if (scrollEl?.hasPointerCapture?.(pointerId)) scrollEl.releasePointerCapture(pointerId);
      if (previousUserSelect)
        selectionScope.style.setProperty(
          "user-select",
          previousUserSelect,
          previousUserSelectPriority,
        );
      else selectionScope.style.removeProperty("user-select");
      setRectangle(null);
      if (restore && active2 && publish) latest2.current.onSelectionChange(snapshot2);
      if (active2) {
        suppressClick = true;
        clickTimer = ownerWindow?.setTimeout(clearClickSuppression, 400) ?? 0;
      }
    }
    function update2() {
      if (!gesture?.active || !scrollEl) return;
      const bounds = scrollEl.getBoundingClientRect();
      const left = bounds.left + scrollEl.clientLeft;
      const top2 = bounds.top + scrollEl.clientTop;
      const x2 = Math.max(0, Math.min(scrollEl.clientWidth, gesture.clientX - left));
      const y4 = Math.max(0, Math.min(scrollEl.clientHeight, gesture.clientY - top2));
      const endX = x2 + scrollEl.scrollLeft;
      const endY = y4 + scrollEl.scrollTop;
      const rect = {
        left: Math.min(gesture.originX, endX),
        top: Math.min(gesture.originY, endY),
        right: Math.max(gesture.originX, endX),
        bottom: Math.max(gesture.originY, endY),
      };
      for (const element2 of scrollEl.querySelectorAll("[data-marquee-hit]")) {
        const key2 = element2.dataset.marqueeHit;
        const box2 = element2.getBoundingClientRect();
        if (!key2 || box2.width <= 0 || box2.height <= 0) continue;
        gesture.measured.set(key2, {
          left: box2.left - left + scrollEl.scrollLeft,
          right: box2.right - left + scrollEl.scrollLeft,
          top: box2.top - top2 + scrollEl.scrollTop,
          bottom: box2.bottom - top2 + scrollEl.scrollTop,
        });
      }
      const hits = latest2.current.rows.filter((row) => {
        const box2 = gesture?.measured.get(row.rowKey);
        return box2 && intersects(rect, box2);
      });
      const next2 = reconcileMarquee(
        gesture.snapshot,
        gesture.selection,
        gesture.entryOrder,
        hits,
        latest2.current.canAddSelection,
      );
      gesture.entryOrder = next2.entryOrder;
      gesture.selection = next2.selection;
      const current2 = latest2.current.selected;
      if (
        current2.size !== next2.selection.size ||
        [...current2].some(([id2, row]) => next2.selection.get(id2) !== row)
      ) {
        latest2.current.onSelectionChange(next2.selection);
      }
      setRectangle((previous2) =>
        previous2 &&
        previous2.left === rect.left &&
        previous2.top === rect.top &&
        previous2.right === rect.right &&
        previous2.bottom === rect.bottom
          ? previous2
          : rect,
      );
    }
    function tick() {
      if (!gesture?.active || !scrollEl) return;
      const bounds = scrollEl.getBoundingClientRect();
      const y4 = gesture.clientY - bounds.top;
      if (gesture.clientX >= bounds.left && gesture.clientX <= bounds.right) {
        const edge = Math.min(40, scrollEl.clientHeight / 4);
        const speed =
          y4 < edge
            ? -Math.min(16, (edge - y4) / 2)
            : y4 > scrollEl.clientHeight - edge
              ? Math.min(16, (y4 - scrollEl.clientHeight + edge) / 2)
              : 0;
        if (speed) scrollEl.scrollTop += speed;
      }
      update2();
      frame2 = ownerWindow?.requestAnimationFrame(tick) ?? 0;
    }
    function handleDown(event) {
      clearClickSuppression();
      if (gesture || event.button !== 0 || event.pointerType !== "mouse" || !scrollEl) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const inScroller = scrollEl.contains(target);
      const blankOrigin = target.closest("[data-marquee-blank-origin]");
      const scope = scrollEl.closest("[data-asset-picker-selection-scope]");
      if (!inScroller && !(blankOrigin && scope?.contains(blankOrigin))) return;
      const interactive = target.closest(
        'button, input, select, textarea, a, [role="button"], [role="checkbox"], [contenteditable="true"], [data-action-ui-id="asset-picker.tag-mark"]',
      );
      if (
        (interactive && !interactive.hasAttribute("data-marquee-start")) ||
        target.closest('[draggable="true"]')
      )
        return;
      const bounds = scrollEl.getBoundingClientRect();
      const x2 = event.clientX - bounds.left - scrollEl.clientLeft;
      const y4 = event.clientY - bounds.top - scrollEl.clientTop;
      if (
        inScroller &&
        (x2 < 0 || y4 < 0 || x2 >= scrollEl.clientWidth || y4 >= scrollEl.clientHeight)
      )
        return;
      const snapshot2 = new Map(latest2.current.selected);
      gesture = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        clientX: event.clientX,
        clientY: event.clientY,
        originX: Math.max(0, Math.min(scrollEl.clientWidth, x2)) + scrollEl.scrollLeft,
        originY: Math.max(0, Math.min(scrollEl.clientHeight, y4)) + scrollEl.scrollTop,
        active: false,
        snapshot: snapshot2,
        selection: snapshot2,
        entryOrder: [],
        measured: new Map(),
        previousUserSelect: selectionScope.style.getPropertyValue("user-select"),
        previousUserSelectPriority: selectionScope.style.getPropertyPriority("user-select"),
      };
      selectionScope.style.setProperty("user-select", "none");
    }
    function handleMove(event) {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      if (event.buttons === 0) {
        finish(false);
        return;
      }
      gesture.clientX = event.clientX;
      gesture.clientY = event.clientY;
      if (!gesture.active) {
        if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) <= 5) return;
        gesture.active = true;
        clearNativeSelection();
        scrollEl?.setPointerCapture?.(event.pointerId);
        frame2 = ownerWindow?.requestAnimationFrame(tick) ?? 0;
      }
      event.preventDefault();
      event.stopPropagation();
      update2();
    }
    function handleUp(event) {
      if (gesture?.pointerId !== event.pointerId) return;
      if (gesture.active) {
        gesture.clientX = event.clientX;
        gesture.clientY = event.clientY;
        update2();
      }
      finish(false);
    }
    function handleCancel() {
      finish(true);
    }
    function handleVisibility() {
      if (document.hidden) finish(true);
    }
    function handleKey(event) {
      if (!gesture?.active) return;
      if (
        event.key === "Escape" ||
        event.key === "Enter" ||
        event.key === " " ||
        event.key.startsWith("Arrow")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.key === "Escape") finish(true);
      }
    }
    function handleClick2(event) {
      if (!suppressClick || event.detail === 0) return;
      clearClickSuppression();
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    function handleDragStart(event) {
      if (gesture) event.preventDefault();
    }
    function handleSelectStart(event) {
      if (gesture) event.preventDefault();
    }
    ownerWindow.addEventListener("pointerdown", handleDown, true);
    ownerWindow.addEventListener("pointermove", handleMove, {
      capture: true,
      passive: false,
    });
    ownerWindow.addEventListener("pointerup", handleUp, true);
    ownerWindow.addEventListener("pointercancel", handleCancel, true);
    ownerWindow.addEventListener("blur", handleCancel);
    ownerWindow.addEventListener("keydown", handleKey, true);
    ownerWindow.addEventListener("click", handleClick2, true);
    selectionScope.addEventListener("dragstart", handleDragStart);
    selectionScope.addEventListener("selectstart", handleSelectStart, true);
    scrollEl.addEventListener("lostpointercapture", handleCancel);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      finish(false, false);
      clearClickSuppression();
      ownerWindow.removeEventListener("pointerdown", handleDown, true);
      ownerWindow.removeEventListener("pointermove", handleMove, true);
      ownerWindow.removeEventListener("pointerup", handleUp, true);
      ownerWindow.removeEventListener("pointercancel", handleCancel, true);
      ownerWindow.removeEventListener("blur", handleCancel);
      ownerWindow.removeEventListener("keydown", handleKey, true);
      ownerWindow.removeEventListener("click", handleClick2, true);
      selectionScope.removeEventListener("dragstart", handleDragStart);
      selectionScope.removeEventListener("selectstart", handleSelectStart, true);
      scrollEl.removeEventListener("lostpointercapture", handleCancel);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [scrollEl, enabled, rowOrder, view2]);
  return rectangle;
}
