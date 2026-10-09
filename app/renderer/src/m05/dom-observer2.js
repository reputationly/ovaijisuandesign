// dom-observer2.js
import { DOMSelectionState, browser, EditContextManager, editable, hasSelection, isEquivalentPosition, getSelection$1, safariSelectionRangeHack, atElementStart, observeOptions, dispatchKey, applyDOMChange, sameSelPos, findChild } from "../vendor.js";
import { buildTheme, baseThemeID, lightDarkIDs, useCharData } from "../m15/line2.js";
import { DOMChange } from "../m04/input-state2.js";
export const baseTheme$1$1 = buildTheme(
  "." + baseThemeID,
  {
    "&": {
      position: "relative !important",
      boxSizing: "border-box",
      "&.cm-focused": {
        // Provide a simple default outline to make sure a focused
        // editor is visually distinct. Can't leave the default behavior
        // because that will apply to the content element, which is
        // inside the scrollable container and doesn't include the
        // gutters. We also can't use an 'auto' outline, since those
        // are, for some reason, drawn behind the element content, which
        // will cause things like the active line background to cover
        // the outline (#297).
        outline: "1px dotted #212121",
      },
      display: "flex !important",
      flexDirection: "column",
    },
    ".cm-scroller": {
      display: "flex !important",
      alignItems: "flex-start !important",
      fontFamily: "monospace",
      lineHeight: 1.4,
      height: "100%",
      overflowX: "auto",
      position: "relative",
      zIndex: 0,
      overflowAnchor: "none",
    },
    ".cm-content": {
      margin: 0,
      flexGrow: 2,
      flexShrink: 0,
      display: "block",
      whiteSpace: "pre",
      wordWrap: "normal",
      // Issue #456
      boxSizing: "border-box",
      minHeight: "100%",
      padding: "4px 0",
      outline: "none",
      "&[contenteditable=true]": {
        WebkitUserModify: "read-write-plaintext-only",
      },
    },
    ".cm-lineWrapping": {
      whiteSpace_fallback: "pre-wrap",
      // For IE
      whiteSpace: "break-spaces",
      wordBreak: "break-word",
      // For Safari, which doesn't support overflow-wrap: anywhere
      overflowWrap: "anywhere",
      flexShrink: 1,
    },
    "&light .cm-content": {
      caretColor: "black",
    },
    "&dark .cm-content": {
      caretColor: "white",
    },
    ".cm-line": {
      display: "block",
      padding: "0 2px 0 6px",
    },
    ".cm-layer": {
      userSelect: "none",
      // #1708
      position: "absolute",
      left: 0,
      top: 0,
      contain: "size style",
      "& > *": {
        position: "absolute",
      },
    },
    "&light .cm-selectionBackground": {
      background: "#d9d9d9",
    },
    "&dark .cm-selectionBackground": {
      background: "#222",
    },
    "&light.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
      background: "#d7d4f0",
    },
    "&dark.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
      background: "#233",
    },
    ".cm-cursorLayer": {
      pointerEvents: "none",
    },
    "&.cm-focused > .cm-scroller > .cm-cursorLayer": {
      animation: "steps(1) cm-blink 1.2s infinite",
    },
    // Two animations defined so that we can switch between them to
    // restart the animation without forcing another style
    // recomputation.
    "@keyframes cm-blink": {
      "0%": {},
      "50%": {
        opacity: 0,
      },
      "100%": {},
    },
    "@keyframes cm-blink2": {
      "0%": {},
      "50%": {
        opacity: 0,
      },
      "100%": {},
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeft: "1.2px solid black",
      marginLeft: "-0.6px",
      pointerEvents: "none",
    },
    ".cm-cursor": {
      display: "none",
    },
    "&dark .cm-cursor": {
      borderLeftColor: "#ddd",
    },
    ".cm-selectionHandle": {
      backgroundColor: "currentColor",
      width: "1.5px",
    },
    ".cm-selectionHandle-start::before, .cm-selectionHandle-end::before": {
      content: '""',
      backgroundColor: "inherit",
      borderRadius: "50%",
      width: "8px",
      height: "8px",
      position: "absolute",
      left: "-3.25px",
    },
    ".cm-selectionHandle-start::before": {
      top: "-8px",
    },
    ".cm-selectionHandle-end::before": {
      bottom: "-8px",
    },
    ".cm-dropCursor": {
      position: "absolute",
    },
    "&.cm-focused > .cm-scroller > .cm-cursorLayer .cm-cursor": {
      display: "block",
    },
    ".cm-iso": {
      unicodeBidi: "isolate",
    },
    ".cm-announced": {
      position: "fixed",
      top: "-10000px",
    },
    "@media print": {
      ".cm-announced": {
        display: "none",
      },
    },
    "&light .cm-activeLine": {
      backgroundColor: "#cceeff44",
    },
    "&dark .cm-activeLine": {
      backgroundColor: "#99eeff33",
    },
    "&light .cm-specialChar": {
      color: "red",
    },
    "&dark .cm-specialChar": {
      color: "#f78",
    },
    ".cm-gutters": {
      flexShrink: 0,
      display: "flex",
      height: "100%",
      boxSizing: "border-box",
      zIndex: 200,
    },
    ".cm-gutters-before": {
      insetInlineStart: 0,
    },
    ".cm-gutters-after": {
      insetInlineEnd: 0,
    },
    "&light .cm-gutters": {
      backgroundColor: "#f5f5f5",
      color: "#6c6c6c",
      border: "0px solid #ddd",
      "&.cm-gutters-before": {
        borderRightWidth: "1px",
      },
      "&.cm-gutters-after": {
        borderLeftWidth: "1px",
      },
    },
    "&dark .cm-gutters": {
      backgroundColor: "#333338",
      color: "#ccc",
    },
    ".cm-gutter": {
      display: "flex !important",
      // Necessary -- prevents margin collapsing
      flexDirection: "column",
      flexShrink: 0,
      boxSizing: "border-box",
      minHeight: "100%",
      overflow: "hidden",
    },
    ".cm-gutterElement": {
      boxSizing: "border-box",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 3px 0 5px",
      minWidth: "20px",
      textAlign: "right",
      whiteSpace: "nowrap",
    },
    "&light .cm-activeLineGutter": {
      backgroundColor: "#e2f2ff",
    },
    "&dark .cm-activeLineGutter": {
      backgroundColor: "#222227",
    },
    ".cm-panels": {
      boxSizing: "border-box",
      position: "sticky",
      left: 0,
      right: 0,
      zIndex: 300,
    },
    "&light .cm-panels": {
      backgroundColor: "#f5f5f5",
      color: "black",
    },
    "&light .cm-panels-top": {
      borderBottom: "1px solid #ddd",
    },
    "&light .cm-panels-bottom": {
      borderTop: "1px solid #ddd",
    },
    "&dark .cm-panels": {
      backgroundColor: "#333338",
      color: "white",
    },
    ".cm-dialog": {
      padding: "2px 19px 4px 6px",
      position: "relative",
      "& label": {
        fontSize: "80%",
      },
    },
    ".cm-dialog-close": {
      position: "absolute",
      top: "3px",
      right: "4px",
      backgroundColor: "inherit",
      border: "none",
      font: "inherit",
      fontSize: "14px",
      padding: "0",
    },
    ".cm-tab": {
      display: "inline-block",
      overflow: "hidden",
      verticalAlign: "bottom",
    },
    ".cm-widgetBuffer": {
      verticalAlign: "text-top",
      height: "1em",
      width: 0,
      display: "inline",
    },
    ".cm-placeholder": {
      color: "#888",
      display: "inline-block",
      verticalAlign: "top",
      userSelect: "none",
    },
    ".cm-highlightSpace": {
      backgroundImage: "radial-gradient(circle at 50% 55%, #aaa 20%, transparent 5%)",
      backgroundPosition: "center",
    },
    ".cm-highlightTab": {
      backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="20"><path stroke="%23888" stroke-width="1" fill="none" d="M1 10H196L190 5M190 15L196 10M197 4L197 16"/></svg>')`,
      backgroundSize: "auto 100%",
      backgroundPosition: "right 90%",
      backgroundRepeat: "no-repeat",
    },
    ".cm-trailingSpace": {
      backgroundColor: "#ff332255",
    },
    ".cm-button": {
      verticalAlign: "middle",
      color: "inherit",
      fontSize: "70%",
      padding: ".2em 1em",
      borderRadius: "1px",
    },
    "&light .cm-button": {
      backgroundImage: "linear-gradient(#eff1f5, #d9d9df)",
      border: "1px solid #888",
      "&:active": {
        backgroundImage: "linear-gradient(#b4b4b4, #d0d3d6)",
      },
    },
    "&dark .cm-button": {
      backgroundImage: "linear-gradient(#393939, #111)",
      border: "1px solid #888",
      "&:active": {
        backgroundImage: "linear-gradient(#111, #333)",
      },
    },
    ".cm-textfield": {
      verticalAlign: "middle",
      color: "inherit",
      fontSize: "70%",
      border: "1px solid silver",
      padding: ".2em .5em",
    },
    "&light .cm-textfield": {
      backgroundColor: "white",
    },
    "&dark .cm-textfield": {
      border: "1px solid #555",
      backgroundColor: "inherit",
    },
  },
  lightDarkIDs,
);
export class DOMObserver2 {
  constructor(view2) {
    this.view = view2;
    this.active = false;
    this.editContext = null;
    this.selectionRange = new DOMSelectionState();
    this.selectionChanged = false;
    this.delayedFlush = -1;
    this.resizeTimeout = -1;
    this.queue = [];
    this.delayedAndroidKey = null;
    this.flushingAndroidKey = -1;
    this.lastChange = 0;
    this.scrollTargets = [];
    this.intersection = null;
    this.resizeScroll = null;
    this.intersecting = false;
    this.gapIntersection = null;
    this.gaps = [];
    this.printQuery = null;
    this.parentCheck = -1;
    this.dom = view2.contentDOM;
    this.observer = new MutationObserver((mutations) => {
      for (let mut of mutations) this.queue.push(mut);
      if (
        ((browser.ie && browser.ie_version <= 11) || (browser.ios && view2.composing)) &&
        mutations.some(
          (m3) =>
            (m3.type == "childList" && m3.removedNodes.length) ||
            (m3.type == "characterData" && m3.oldValue.length > m3.target.nodeValue.length),
        )
      )
        this.flushSoon();
      else this.flush();
    });
    if (
      window.EditContext &&
      browser.android &&
      view2.constructor.EDIT_CONTEXT !== false &&
      // Chrome <126 doesn't support inverted selections in edit context (#1392)
      !(browser.chrome && browser.chrome_version < 126)
    ) {
      this.editContext = new EditContextManager(view2);
      if (view2.state.facet(editable)) view2.contentDOM.editContext = this.editContext.editContext;
    }
    if (useCharData)
      this.onCharData = (event) => {
        this.queue.push({
          target: event.target,
          type: "characterData",
          oldValue: event.prevValue,
        });
        this.flushSoon();
      };
    this.onSelectionChange = this.onSelectionChange.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onPrint = this.onPrint.bind(this);
    this.onScroll = this.onScroll.bind(this);
    if (window.matchMedia) this.printQuery = window.matchMedia("print");
    if (typeof ResizeObserver == "function") {
      this.resizeScroll = new ResizeObserver(() => {
        var _a2;
        if (
          ((_a2 = this.view.docView) === null || _a2 === void 0 ? void 0 : _a2.lastUpdate) <
          Date.now() - 75
        )
          this.onResize();
      });
      this.resizeScroll.observe(view2.scrollDOM);
    }
    this.addWindowListeners((this.win = view2.win));
    this.start();
    if (typeof IntersectionObserver == "function") {
      this.intersection = new IntersectionObserver(
        (entries2) => {
          if (this.parentCheck < 0)
            this.parentCheck = setTimeout(this.listenForScroll.bind(this), 1e3);
          if (
            entries2.length > 0 &&
            entries2[entries2.length - 1].intersectionRatio > 0 != this.intersecting
          ) {
            this.intersecting = !this.intersecting;
            if (this.intersecting != this.view.inView)
              this.onScrollChanged(document.createEvent("Event"));
          }
        },
        {
          threshold: [0, 1e-3],
        },
      );
      this.intersection.observe(this.dom);
      this.gapIntersection = new IntersectionObserver((entries2) => {
        if (entries2.length > 0 && entries2[entries2.length - 1].intersectionRatio > 0)
          this.onScrollChanged(document.createEvent("Event"));
      }, {});
    }
    this.listenForScroll();
    this.readSelectionRange();
  }
  onScrollChanged(e2) {
    this.view.inputState.runHandlers("scroll", e2);
    if (this.intersecting) this.view.measure();
  }
  onScroll(e2) {
    if (this.intersecting) this.flush(false);
    if (this.editContext) this.view.requestMeasure(this.editContext.measureReq);
    this.onScrollChanged(e2);
  }
  onResize() {
    if (this.resizeTimeout < 0)
      this.resizeTimeout = setTimeout(() => {
        this.resizeTimeout = -1;
        this.view.requestMeasure();
      }, 50);
  }
  onPrint(event) {
    if ((event.type == "change" || !event.type) && !event.matches) return;
    this.view.viewState.printing = true;
    this.view.measure();
    setTimeout(() => {
      this.view.viewState.printing = false;
      this.view.requestMeasure();
    }, 500);
  }
  updateGaps(gaps) {
    if (
      this.gapIntersection &&
      (gaps.length != this.gaps.length || this.gaps.some((g2, i2) => g2 != gaps[i2]))
    ) {
      this.gapIntersection.disconnect();
      for (let gap of gaps) this.gapIntersection.observe(gap);
      this.gaps = gaps;
    }
  }
  onSelectionChange(event) {
    let wasChanged = this.selectionChanged;
    if (!this.readSelectionRange() || this.delayedAndroidKey) return;
    let { view: view2 } = this,
      sel = this.selectionRange;
    if (
      view2.state.facet(editable)
        ? view2.root.activeElement != this.dom
        : !hasSelection(this.dom, sel)
    )
      return;
    let context = sel.anchorNode && view2.docView.tile.nearest(sel.anchorNode);
    if (context && context.isWidget() && context.widget.ignoreEvent(event)) {
      if (!wasChanged) this.selectionChanged = false;
      return;
    }
    if (
      ((browser.ie && browser.ie_version <= 11) || (browser.android && browser.chrome)) &&
      !view2.state.selection.main.empty &&
      // (Selection.isCollapsed isn't reliable on IE)
      sel.focusNode &&
      isEquivalentPosition(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset)
    )
      this.flushSoon();
    else this.flush(false);
  }
  readSelectionRange() {
    let { view: view2 } = this;
    let selection2 = getSelection$1(view2.root);
    if (!selection2) return false;
    let range2 =
      (browser.safari &&
        view2.root.nodeType == 11 &&
        view2.root.activeElement == this.dom &&
        safariSelectionRangeHack(this.view, selection2)) ||
      selection2;
    if (!range2 || this.selectionRange.eq(range2)) return false;
    let local = hasSelection(this.dom, range2);
    if (
      local &&
      !this.selectionChanged &&
      view2.inputState.lastFocusTime > Date.now() - 200 &&
      view2.inputState.lastTouchTime < Date.now() - 300 &&
      atElementStart(this.dom, range2)
    ) {
      this.view.inputState.lastFocusTime = 0;
      view2.docView.updateSelection();
      return false;
    }
    this.selectionRange.setRange(range2);
    if (local) this.selectionChanged = true;
    return true;
  }
  setSelectionRange(anchor, head2) {
    this.selectionRange.set(anchor.node, anchor.offset, head2.node, head2.offset);
    this.selectionChanged = false;
  }
  clearSelectionRange() {
    this.selectionRange.set(null, 0, null, 0);
  }
  listenForScroll() {
    this.parentCheck = -1;
    let i2 = 0,
      changed = null;
    for (let dom = this.dom; dom;) {
      if (dom.nodeType == 1) {
        if (!changed && i2 < this.scrollTargets.length && this.scrollTargets[i2] == dom) i2++;
        else if (!changed) changed = this.scrollTargets.slice(0, i2);
        if (changed) changed.push(dom);
        dom = dom.assignedSlot || dom.parentNode;
      } else if (dom.nodeType == 11) {
        dom = dom.host;
      } else {
        break;
      }
    }
    if (i2 < this.scrollTargets.length && !changed) changed = this.scrollTargets.slice(0, i2);
    if (changed) {
      for (let dom of this.scrollTargets) dom.removeEventListener("scroll", this.onScroll);
      for (let dom of (this.scrollTargets = changed)) dom.addEventListener("scroll", this.onScroll);
    }
  }
  ignore(f2) {
    if (!this.active) return f2();
    try {
      this.stop();
      return f2();
    } finally {
      this.start();
      this.clear();
    }
  }
  start() {
    if (this.active) return;
    this.observer.observe(this.dom, observeOptions);
    if (useCharData) this.dom.addEventListener("DOMCharacterDataModified", this.onCharData);
    this.active = true;
  }
  stop() {
    if (!this.active) return;
    this.active = false;
    this.observer.disconnect();
    if (useCharData) this.dom.removeEventListener("DOMCharacterDataModified", this.onCharData);
  }
  // Throw away any pending changes
  clear() {
    this.processRecords();
    this.queue.length = 0;
    this.selectionChanged = false;
  }
  // Chrome Android, especially in combination with GBoard, not only
  // doesn't reliably fire regular key events, but also often
  // surrounds the effect of enter or backspace with a bunch of
  // composition events that, when interrupted, cause text duplication
  // or other kinds of corruption. This hack makes the editor back off
  // from handling DOM changes for a moment when such a key is
  // detected (via beforeinput or keydown), and then tries to flush
  // them or, if that has no effect, dispatches the given key.
  delayAndroidKey(key2, keyCode) {
    var _a2;
    if (!this.delayedAndroidKey) {
      let flush2 = () => {
        let key3 = this.delayedAndroidKey;
        if (key3) {
          this.clearDelayedAndroidKey();
          this.view.inputState.lastKeyCode = key3.keyCode;
          this.view.inputState.lastKeyTime = Date.now();
          let flushed = this.flush();
          if (!flushed && key3.force) dispatchKey(this.dom, key3.key, key3.keyCode);
        }
      };
      this.flushingAndroidKey = this.view.win.requestAnimationFrame(flush2);
    }
    if (!this.delayedAndroidKey || key2 == "Enter")
      this.delayedAndroidKey = {
        key: key2,
        keyCode,
        // Only run the key handler when no changes are detected if
        // this isn't coming right after another change, in which case
        // it is probably part of a weird chain of updates, and should
        // be ignored if it returns the DOM to its previous state.
        force:
          this.lastChange < Date.now() - 50 ||
          !!((_a2 = this.delayedAndroidKey) === null || _a2 === void 0 ? void 0 : _a2.force),
      };
  }
  clearDelayedAndroidKey() {
    this.win.cancelAnimationFrame(this.flushingAndroidKey);
    this.delayedAndroidKey = null;
    this.flushingAndroidKey = -1;
  }
  flushSoon() {
    if (this.delayedFlush < 0)
      this.delayedFlush = this.view.win.requestAnimationFrame(() => {
        this.delayedFlush = -1;
        this.flush();
      });
  }
  forceFlush() {
    if (this.delayedFlush >= 0) {
      this.view.win.cancelAnimationFrame(this.delayedFlush);
      this.delayedFlush = -1;
    }
    this.flush();
  }
  pendingRecords() {
    for (let mut of this.observer.takeRecords()) this.queue.push(mut);
    return this.queue;
  }
  processRecords() {
    let records = this.pendingRecords();
    if (records.length) this.queue = [];
    let from2 = -1,
      to = -1,
      typeOver = false;
    for (let record2 of records) {
      let range2 = this.readMutation(record2);
      if (!range2) continue;
      if (range2.typeOver) typeOver = true;
      if (from2 == -1) {
        ({ from: from2, to } = range2);
      } else {
        from2 = Math.min(range2.from, from2);
        to = Math.max(range2.to, to);
      }
    }
    return {
      from: from2,
      to,
      typeOver,
    };
  }
  readChange() {
    let { from: from2, to, typeOver } = this.processRecords();
    let newSel = this.selectionChanged && hasSelection(this.dom, this.selectionRange);
    if (from2 < 0 && !newSel) return null;
    if (from2 > -1) this.lastChange = Date.now();
    this.view.inputState.lastFocusTime = 0;
    this.selectionChanged = false;
    let change = new DOMChange(this.view, from2, to, typeOver);
    this.view.docView.domChanged = {
      newSel: change.newSel ? change.newSel.main : null,
    };
    return change;
  }
  // Apply pending changes, if any
  flush(readSelection2 = true) {
    if (this.delayedFlush >= 0 || this.delayedAndroidKey) return false;
    if (readSelection2) this.readSelectionRange();
    let domChange = this.readChange();
    if (!domChange) {
      this.view.requestMeasure();
      return false;
    }
    let startState = this.view.state;
    let handled = applyDOMChange(this.view, domChange);
    if (
      this.view.state == startState &&
      (domChange.domChanged ||
        (domChange.newSel && !sameSelPos(this.view.state.selection, domChange.newSel.main)))
    )
      this.view.update([]);
    return handled;
  }
  readMutation(rec) {
    let tile = this.view.docView.tile.nearest(rec.target);
    if (!tile || tile.isWidget()) return null;
    tile.markDirty(rec.type == "attributes");
    if (rec.type == "childList") {
      let childBefore = findChild(tile, rec.previousSibling || rec.target.previousSibling, -1);
      let childAfter = findChild(tile, rec.nextSibling || rec.target.nextSibling, 1);
      return {
        from: childBefore ? tile.posAfter(childBefore) : tile.posAtStart,
        to: childAfter ? tile.posBefore(childAfter) : tile.posAtEnd,
        typeOver: false,
      };
    } else if (rec.type == "characterData") {
      return {
        from: tile.posAtStart,
        to: tile.posAtEnd,
        typeOver: rec.target.nodeValue == rec.oldValue,
      };
    } else {
      return null;
    }
  }
  setWindow(win2) {
    if (win2 != this.win) {
      this.removeWindowListeners(this.win);
      this.win = win2;
      this.addWindowListeners(this.win);
    }
  }
  addWindowListeners(win2) {
    win2.addEventListener("resize", this.onResize);
    if (this.printQuery) {
      if (this.printQuery.addEventListener)
        this.printQuery.addEventListener("change", this.onPrint);
      else this.printQuery.addListener(this.onPrint);
    } else win2.addEventListener("beforeprint", this.onPrint);
    win2.addEventListener("scroll", this.onScroll);
    win2.document.addEventListener("selectionchange", this.onSelectionChange);
  }
  removeWindowListeners(win2) {
    win2.removeEventListener("scroll", this.onScroll);
    win2.removeEventListener("resize", this.onResize);
    if (this.printQuery) {
      if (this.printQuery.removeEventListener)
        this.printQuery.removeEventListener("change", this.onPrint);
      else this.printQuery.removeListener(this.onPrint);
    } else win2.removeEventListener("beforeprint", this.onPrint);
    win2.document.removeEventListener("selectionchange", this.onSelectionChange);
  }
  update(update2) {
    if (this.editContext) {
      this.editContext.update(update2);
      if (update2.startState.facet(editable) != update2.state.facet(editable))
        update2.view.contentDOM.editContext = update2.state.facet(editable)
          ? this.editContext.editContext
          : null;
    }
  }
  destroy() {
    var _a2, _b, _c;
    this.stop();
    (_a2 = this.intersection) === null || _a2 === void 0 ? void 0 : _a2.disconnect();
    (_b = this.gapIntersection) === null || _b === void 0 ? void 0 : _b.disconnect();
    (_c = this.resizeScroll) === null || _c === void 0 ? void 0 : _c.disconnect();
    for (let dom of this.scrollTargets) dom.removeEventListener("scroll", this.onScroll);
    this.removeWindowListeners(this.win);
    clearTimeout(this.parentCheck);
    clearTimeout(this.resizeTimeout);
    this.win.cancelAnimationFrame(this.delayedFlush);
    this.win.cancelAnimationFrame(this.flushingAndroidKey);
    if (this.editContext) {
      this.view.contentDOM.editContext = null;
      this.editContext.destroy();
    }
  }
}
