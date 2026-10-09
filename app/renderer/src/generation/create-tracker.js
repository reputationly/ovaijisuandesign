// create-tracker.js
import { trackers$1 } from "./missing-asset-card.jsx";

const ENTER_RADIUS = 32;

const EXIT_RADIUS = 40;

const CENTER_OFFSET = 14;

const MENU_SELECTOR = '[data-action-ui-id="canvas.add-node-menu"]';

export function createTracker(root2) {
  const doc2 = root2.ownerDocument;
  const view2 = doc2.defaultView;
  if (!view2) throw new Error("Handle proximity requires a document window");
  const win2 = view2;
  const entries2 = new Map();
  let active2 = null;
  let gesture = null;
  let spaceHeld = false;
  let menuObserver = null;
  let frame2 = 0;
  function activate(next2) {
    if (next2 === active2) return;
    active2?.element.removeAttribute("data-near");
    active2 = next2;
    active2?.element.setAttribute("data-near", "true");
  }
  function reset2() {
    win2.cancelAnimationFrame(frame2);
    frame2 = 0;
    menuObserver?.disconnect();
    menuObserver = null;
    gesture = null;
    activate(null);
  }
  function retainForMenu() {
    win2.cancelAnimationFrame(frame2);
    frame2 = win2.requestAnimationFrame(() => {
      frame2 = 0;
      const menu = doc2.querySelector(MENU_SELECTOR);
      if (!menu) {
        reset2();
        return;
      }
      menuObserver?.disconnect();
      menuObserver = new win2.MutationObserver(() => {
        if (!menu.isConnected) reset2();
      });
      menuObserver.observe(doc2.body, {
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
    if (menuObserver || frame2) return;
    const target = event.target;
    if (
      !(target instanceof win2.Element) ||
      !root2.contains(target) ||
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
    const collect = (element2) => {
      const node2 = element2?.closest(".react-flow__node");
      if (node2 && root2.contains(node2)) nearby.add(node2);
    };
    collect(target);
    for (const dx of [-46, CENTER_OFFSET + ENTER_RADIUS]) {
      collect(doc2.elementFromPoint(event.clientX + dx, event.clientY));
    }
    if (active2) nearby.add(active2.node);
    let nearest = null;
    let distance2 = Number.POSITIVE_INFINITY;
    const pointerNode = target.closest(".node-handle-plus")
      ? null
      : target.closest(".react-flow__node");
    for (const node2 of nearby) {
      for (const entry of entries2.get(node2) ?? []) {
        if (pointerNode && pointerNode !== node2) continue;
        const rect = entry.element.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const x2 = rect.left + rect.width / 2;
        const y4 = rect.top + rect.height / 2;
        const d2 = Math.hypot(event.clientX - x2, event.clientY - y4);
        if (
          d2 > (entry === active2 ? EXIT_RADIUS : ENTER_RADIUS) ||
          d2 >= distance2
        )
          continue;
        const visible = [
          [0, 0],
          [-9, -9],
          [9, -9],
          [-9, 9],
          [9, 9],
        ].every(([dx, dy]) => {
          const hit = doc2.elementFromPoint(x2 + dx, y4 + dy);
          if (!hit || !root2.contains(hit)) return false;
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
            coveringNode === node2 ||
            coveringNode.classList.contains("react-flow__node-group")
          );
        });
        if (visible) {
          nearest = entry;
          distance2 = d2;
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
    if (event.key === "Escape" || spaceHeld) reset2();
  }
  function handleBlur() {
    spaceHeld = false;
    reset2();
  }
  function handleLeave(event) {
    if (!event.relatedTarget && !gesture && !menuObserver) reset2();
  }
  doc2.addEventListener("pointermove", handleMove, {
    passive: true,
  });
  doc2.addEventListener("mouseup", handleUp);
  doc2.addEventListener("keydown", handleKey);
  doc2.addEventListener("keyup", handleKey);
  doc2.addEventListener("mouseout", handleLeave);
  root2.addEventListener("wheel", reset2, {
    passive: true,
  });
  win2.addEventListener("blur", handleBlur);
  doc2.addEventListener("pointercancel", reset2);
  const viewportObserver = new win2.MutationObserver(() => {
    if (!gesture && !menuObserver && !frame2) activate(null);
  });
  const viewport = root2.querySelector(".react-flow__viewport");
  if (viewport)
    viewportObserver.observe(viewport, {
      attributes: true,
      attributeFilter: ["style"],
    });
  return {
    register(element2, node2) {
      const entry = {
        element: element2,
        node: node2,
        dragged: false,
      };
      const siblings2 = entries2.get(node2) ?? new Set();
      siblings2.add(entry);
      entries2.set(node2, siblings2);
      return {
        beginGesture(event, dragThreshold = 5) {
          if (event.button !== 0) return;
          reset2();
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
          if (active2 === entry || gesture?.entry === entry) reset2();
          siblings2.delete(entry);
          if (!siblings2.size) entries2.delete(node2);
          if (entries2.size) return;
          reset2();
          doc2.removeEventListener("pointermove", handleMove);
          doc2.removeEventListener("mouseup", handleUp);
          doc2.removeEventListener("keydown", handleKey);
          doc2.removeEventListener("keyup", handleKey);
          doc2.removeEventListener("mouseout", handleLeave);
          root2.removeEventListener("wheel", reset2);
          win2.removeEventListener("blur", handleBlur);
          doc2.removeEventListener("pointercancel", reset2);
          viewportObserver.disconnect();
          trackers$1.delete(root2);
        },
      };
    },
  };
}
