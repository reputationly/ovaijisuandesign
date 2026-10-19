// create-tracker.js
const MENU_SELECTOR = '[data-action-ui-id="canvas.add-node-menu"]';
import { trackers } from "./missing-asset-card.jsx";
const ENTER_RADIUS = 32;
const EXIT_RADIUS = 40;
const CENTER_OFFSET = 14;
export function createTracker(root) {
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  if (!view) throw new Error("Handle proximity requires a document window");
  const win = view;
  const entries = new Map();
  let active = null;
  let gesture = null;
  let spaceHeld = false;
  let menuObserver = null;
  let frame = 0;
  function activate(next) {
    if (next === active) return;
    active?.element.removeAttribute("data-near");
    active = next;
    active?.element.setAttribute("data-near", "true");
  }
  function reset() {
    win.cancelAnimationFrame(frame);
    frame = 0;
    menuObserver?.disconnect();
    menuObserver = null;
    gesture = null;
    activate(null);
  }
  function retainForMenu() {
    win.cancelAnimationFrame(frame);
    frame = win.requestAnimationFrame(() => {
      frame = 0;
      const menu = doc.querySelector(MENU_SELECTOR);
      if (!menu) {
        reset();
        return;
      }
      menuObserver?.disconnect();
      menuObserver = new win.MutationObserver(() => {
        if (!menu.isConnected) reset();
      });
      menuObserver.observe(doc.body, {
        childList: true,
        subtree: true,
      });
    });
  }
  function handleMove(event) {
    if (gesture) {
      if (
        Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) >
        gesture.dragThreshold
      ) {
        gesture.entry.dragged = true;
      }
      return;
    }
    if (menuObserver || frame) return;
    const target = event.target;
    if (
      !(target instanceof win.Element) ||
      !root.contains(target) ||
      event.buttons ||
      spaceHeld
    ) {
      activate(null);
      return;
    }
    if (
      target.closest(
        '[role="menu"],button,input,textarea,[contenteditable="true"],.react-flow__resize-control',
      )
    ) {
      activate(null);
      return;
    }
    const nearby = new Set();
    const collect = (element) => {
      const node = element?.closest(".react-flow__node");
      if (node && root.contains(node)) nearby.add(node);
    };
    collect(target);
    for (const dx of [-46, CENTER_OFFSET + ENTER_RADIUS]) {
      collect(doc.elementFromPoint(event.clientX + dx, event.clientY));
    }
    if (active) nearby.add(active.node);
    let nearest = null;
    let distance = Number.POSITIVE_INFINITY;
    const pointerNode = target.closest(".node-handle-plus")
      ? null
      : target.closest(".react-flow__node");
    for (const node of nearby) {
      for (const entry of entries.get(node) ?? []) {
        if (pointerNode && pointerNode !== node) continue;
        const rect = entry.element.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distanceFromCenter = Math.hypot(event.clientX - centerX, event.clientY - centerY);
        if (
          distanceFromCenter > (entry === active ? EXIT_RADIUS : ENTER_RADIUS) ||
          distanceFromCenter >= distance
        )
          continue;
        const visible = [
          [0, 0],
          [-9, -9],
          [9, -9],
          [-9, 9],
          [9, 9],
        ].every(([dx, dy]) => {
          const hit = doc.elementFromPoint(centerX + dx, centerY + dy);
          if (!hit || !root.contains(hit)) return false;
          if (
            hit.closest(
              '[role="menu"],button,input,textarea,[contenteditable="true"]',
            )
          )
            return false;
          const coveringNode = hit.closest(".node-handle-plus")
            ? null
            : hit.closest(".react-flow__node");
          return (
            !coveringNode ||
            coveringNode === node ||
            coveringNode.classList.contains("react-flow__node-group")
          );
        });
        if (visible) {
          nearest = entry;
          distance = distanceFromCenter;
        }
      }
    }
    activate(nearest);
  }
  function handleUp(event) {
    if (!gesture) return;
    if (
      Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) >
      gesture.dragThreshold
    ) {
      gesture.entry.dragged = true;
    }
    gesture = null;
    retainForMenu();
  }
  function handleKey(event) {
    if (event.code === "Space") spaceHeld = event.type === "keydown";
    if (event.key === "Escape" || spaceHeld) reset();
  }
  function handleBlur() {
    spaceHeld = false;
    reset();
  }
  function handleLeave(event) {
    if (!event.relatedTarget && !gesture && !menuObserver) reset();
  }
  doc.addEventListener("pointermove", handleMove, {
    passive: true,
  });
  doc.addEventListener("mouseup", handleUp);
  doc.addEventListener("keydown", handleKey);
  doc.addEventListener("keyup", handleKey);
  doc.addEventListener("mouseout", handleLeave);
  root.addEventListener("wheel", reset, {
    passive: true,
  });
  win.addEventListener("blur", handleBlur);
  doc.addEventListener("pointercancel", reset);
  const viewportObserver = new win.MutationObserver(() => {
    if (!gesture && !menuObserver && !frame) activate(null);
  });
  const viewport = root.querySelector(".react-flow__viewport");
  if (viewport)
    viewportObserver.observe(viewport, {
      attributes: true,
      attributeFilter: ["style"],
    });
  return {
    register(element, node) {
      const entry = {
        element,
        node,
        dragged: false,
      };
      const siblings = entries.get(node) ?? new Set();
      siblings.add(entry);
      entries.set(node, siblings);
      return {
        beginGesture(event, dragThreshold = 5) {
          if (event.button !== 0) return;
          reset();
          entry.dragged = false;
          gesture = {
            entry,
            x: event.clientX,
            y: event.clientY,
            dragThreshold,
          };
          activate(entry);
        },
        didDrag: () => entry.dragged,
        retainForMenu,
        dispose() {
          if (active === entry || gesture?.entry === entry) reset();
          siblings.delete(entry);
          if (!siblings.size) entries.delete(node);
          if (entries.size) return;
          reset();
          doc.removeEventListener("pointermove", handleMove);
          doc.removeEventListener("mouseup", handleUp);
          doc.removeEventListener("keydown", handleKey);
          doc.removeEventListener("keyup", handleKey);
          doc.removeEventListener("mouseout", handleLeave);
          root.removeEventListener("wheel", reset);
          win.removeEventListener("blur", handleBlur);
          doc.removeEventListener("pointercancel", reset);
          viewportObserver.disconnect();
          trackers.delete(root);
        },
      };
    },
  };
}
