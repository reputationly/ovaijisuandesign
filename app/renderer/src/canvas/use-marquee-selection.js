// use-marquee-selection.js
import { reactExports } from "../vendor.js";

function intersects(a2, b3) {
  return (
    a2.left < b3.right &&
    a2.right > b3.left &&
    a2.top < b3.bottom &&
    a2.bottom > b3.top
  );
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
    if (row && !selection2.has(id2) && canAdd(row, selection2))
      selection2.set(id2, row);
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
    const selectionScope =
      scrollEl.closest("[data-asset-picker-selection-scope]") ?? scrollEl;
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
      if (scrollEl?.hasPointerCapture?.(pointerId))
        scrollEl.releasePointerCapture(pointerId);
      if (previousUserSelect)
        selectionScope.style.setProperty(
          "user-select",
          previousUserSelect,
          previousUserSelectPriority,
        );
      else selectionScope.style.removeProperty("user-select");
      setRectangle(null);
      if (restore && active2 && publish)
        latest2.current.onSelectionChange(snapshot2);
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
      const x2 = Math.max(
        0,
        Math.min(scrollEl.clientWidth, gesture.clientX - left),
      );
      const y4 = Math.max(
        0,
        Math.min(scrollEl.clientHeight, gesture.clientY - top2),
      );
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
      if (
        gesture ||
        event.button !== 0 ||
        event.pointerType !== "mouse" ||
        !scrollEl
      )
        return;
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
        (x2 < 0 ||
          y4 < 0 ||
          x2 >= scrollEl.clientWidth ||
          y4 >= scrollEl.clientHeight)
      )
        return;
      const snapshot2 = new Map(latest2.current.selected);
      gesture = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        clientX: event.clientX,
        clientY: event.clientY,
        originX:
          Math.max(0, Math.min(scrollEl.clientWidth, x2)) + scrollEl.scrollLeft,
        originY:
          Math.max(0, Math.min(scrollEl.clientHeight, y4)) + scrollEl.scrollTop,
        active: false,
        snapshot: snapshot2,
        selection: snapshot2,
        entryOrder: [],
        measured: new Map(),
        previousUserSelect:
          selectionScope.style.getPropertyValue("user-select"),
        previousUserSelectPriority:
          selectionScope.style.getPropertyPriority("user-select"),
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
        if (
          Math.hypot(
            event.clientX - gesture.startX,
            event.clientY - gesture.startY,
          ) <= 5
        )
          return;
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
      selectionScope.removeEventListener(
        "selectstart",
        handleSelectStart,
        true,
      );
      scrollEl.removeEventListener("lostpointercapture", handleCancel);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [scrollEl, enabled, rowOrder, view2]);
  return rectangle;
}
