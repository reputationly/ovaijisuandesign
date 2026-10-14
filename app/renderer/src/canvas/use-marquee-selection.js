// use-marquee-selection.js
import reactExports from "react";

function intersects(firstRect, secondRect) {
  return (
    firstRect.left < secondRect.right &&
    firstRect.right > secondRect.left &&
    firstRect.top < secondRect.bottom &&
    firstRect.bottom > secondRect.top
  );
}

function reconcileMarquee(snapshot, previous, entryOrder, hits, canAdd) {
  const candidates = new Map(hits.map((row) => [row.rowKey, row]));
  const order = entryOrder.filter((id) => candidates.has(id));
  const queued = new Set(order);
  for (const row of hits) {
    if (!queued.has(row.rowKey)) {
      order.push(row.rowKey);
      queued.add(row.rowKey);
    }
  }
  const selection = new Map(snapshot);
  const add = (id) => {
    const row = candidates.get(id);
    if (row && !selection.has(id) && canAdd(row, selection))
      selection.set(id, row);
  };
  for (const id of previous.keys()) add(id);
  for (const id of order) add(id);
  return {
    selection,
    entryOrder: order,
  };
}

export function useMarqueeSelection(options) {
  const { scrollEl, enabled, rows, view } = options;
  const latest = reactExports.useRef(options);
  latest.current = options;
  const [rectangle, setRectangle] = reactExports.useState(null);
  const rowOrder = JSON.stringify(rows.map((row) => [row.rowKey, row.assetId]));
  reactExports.useEffect(() => {
    if (!scrollEl || !enabled) return;
    const ownerWindow = scrollEl.ownerDocument.defaultView;
    if (!ownerWindow) return;
    const selectionScope =
      scrollEl.closest("[data-asset-picker-selection-scope]") ?? scrollEl;
    let gesture = null;
    let frame = 0;
    let suppressClick = false;
    let clickTimer = 0;
    function clearNativeSelection() {
      const selection = ownerWindow?.getSelection();
      if (
        selection &&
        (selectionScope.contains(selection.anchorNode) ||
          selectionScope.contains(selection.focusNode))
      )
        selection.removeAllRanges();
    }
    function clearClickSuppression() {
      suppressClick = false;
      ownerWindow?.clearTimeout(clickTimer);
    }
    function finish(restore, publish = true) {
      if (!gesture) return;
      const {
        active,
        snapshot,
        pointerId,
        previousUserSelect,
        previousUserSelectPriority,
      } = gesture;
      if (active) clearNativeSelection();
      gesture = null;
      ownerWindow?.cancelAnimationFrame(frame);
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
      if (restore && active && publish)
        latest.current.onSelectionChange(snapshot);
      if (active) {
        suppressClick = true;
        clickTimer = ownerWindow?.setTimeout(clearClickSuppression, 400) ?? 0;
      }
    }
    function update() {
      if (!gesture?.active || !scrollEl) return;
      const bounds = scrollEl.getBoundingClientRect();
      const left = bounds.left + scrollEl.clientLeft;
      const viewportTop = bounds.top + scrollEl.clientTop;
      const localX = Math.max(
        0,
        Math.min(scrollEl.clientWidth, gesture.clientX - left),
      );
      const localY = Math.max(
        0,
        Math.min(scrollEl.clientHeight, gesture.clientY - viewportTop),
      );
      const endX = localX + scrollEl.scrollLeft;
      const endY = localY + scrollEl.scrollTop;
      const rect = {
        left: Math.min(gesture.originX, endX),
        top: Math.min(gesture.originY, endY),
        right: Math.max(gesture.originX, endX),
        bottom: Math.max(gesture.originY, endY),
      };
      for (const element of scrollEl.querySelectorAll("[data-marquee-hit]")) {
        const key = element.dataset.marqueeHit;
        const box = element.getBoundingClientRect();
        if (!key || box.width <= 0 || box.height <= 0) continue;
        gesture.measured.set(key, {
          left: box.left - left + scrollEl.scrollLeft,
          right: box.right - left + scrollEl.scrollLeft,
          top: box.top - viewportTop + scrollEl.scrollTop,
          bottom: box.bottom - viewportTop + scrollEl.scrollTop,
        });
      }
      const hits = latest.current.rows.filter((row) => {
        const box = gesture?.measured.get(row.rowKey);
        return box && intersects(rect, box);
      });
      const next = reconcileMarquee(
        gesture.snapshot,
        gesture.selection,
        gesture.entryOrder,
        hits,
        latest.current.canAddSelection,
      );
      gesture.entryOrder = next.entryOrder;
      gesture.selection = next.selection;
      const current = latest.current.selected;
      if (
        current.size !== next.selection.size ||
        [...current].some(([id, row]) => next.selection.get(id) !== row)
      ) {
        latest.current.onSelectionChange(next.selection);
      }
      setRectangle((previous) =>
        previous &&
        previous.left === rect.left &&
        previous.top === rect.top &&
        previous.right === rect.right &&
        previous.bottom === rect.bottom
          ? previous
          : rect,
      );
    }
    function tick() {
      if (!gesture?.active || !scrollEl) return;
      const bounds = scrollEl.getBoundingClientRect();
      const pointerY = gesture.clientY - bounds.top;
      if (gesture.clientX >= bounds.left && gesture.clientX <= bounds.right) {
        const edge = Math.min(40, scrollEl.clientHeight / 4);
        const speed =
          pointerY < edge
            ? -Math.min(16, (edge - pointerY) / 2)
            : pointerY > scrollEl.clientHeight - edge
              ? Math.min(16, (pointerY - scrollEl.clientHeight + edge) / 2)
              : 0;
        if (speed) scrollEl.scrollTop += speed;
      }
      update();
      frame = ownerWindow?.requestAnimationFrame(tick) ?? 0;
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
      const pointerX = event.clientX - bounds.left - scrollEl.clientLeft;
      const pointerY = event.clientY - bounds.top - scrollEl.clientTop;
      if (
        inScroller &&
        (pointerX < 0 ||
          pointerY < 0 ||
          pointerX >= scrollEl.clientWidth ||
          pointerY >= scrollEl.clientHeight)
      )
        return;
      const snapshot = new Map(latest.current.selected);
      gesture = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        clientX: event.clientX,
        clientY: event.clientY,
        originX:
          Math.max(0, Math.min(scrollEl.clientWidth, pointerX)) + scrollEl.scrollLeft,
        originY:
          Math.max(0, Math.min(scrollEl.clientHeight, pointerY)) + scrollEl.scrollTop,
        active: false,
        snapshot,
        selection: snapshot,
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
        frame = ownerWindow?.requestAnimationFrame(tick) ?? 0;
      }
      event.preventDefault();
      event.stopPropagation();
      update();
    }
    function handleUp(event) {
      if (gesture?.pointerId !== event.pointerId) return;
      if (gesture.active) {
        gesture.clientX = event.clientX;
        gesture.clientY = event.clientY;
        update();
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
    function handleClick(event) {
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
    ownerWindow.addEventListener("click", handleClick, true);
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
      ownerWindow.removeEventListener("click", handleClick, true);
      selectionScope.removeEventListener("dragstart", handleDragStart);
      selectionScope.removeEventListener(
        "selectstart",
        handleSelectStart,
        true,
      );
      scrollEl.removeEventListener("lostpointercapture", handleCancel);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [scrollEl, enabled, rowOrder, view]);
  return rectangle;
}
