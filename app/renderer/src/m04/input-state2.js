// input-state2.js
import { EditorSelection, BidiSpan, LTR, RTL, LineBreakPlaceholder, Tile, isBlockElement, isEmptyToEnd, isAtEnd, domBoundsAround, selectionPoints, selectionFromPoints, contains, browser, firefoxCopyCutHack, eventBelongsToEditor, modifierCodes, PendingKeys, EmacsyPendingKeys, iosVirtualKeyboardOpen, dispatchKey, bindHandler, observers, scrollableParents, atomicRanges, addsSelectionRange, isInPrimarySelection, getClickType, dist, getScrollMargins, dragScrollMargin, dragScrollSpeed, skipAtomsForSelection, textFilter, clipboardInputFilter, basicMouseSelection, focusPreventScroll, clipboardOutputFilter, dropText, brokenClipboardAPI, hasSelection, copiedRange, captureCopy, applyDOMChangeInner } from "../vendor.js";
import { types, computeCharTypes, BidiRE } from "../m15/annotation-highlight.js";
import { processNeutrals, trivialOrder, mouseSelectionStyle } from "../m15/line2.js";
import { EditorState2, processBracketPairs } from "./editor-state2.js";
function emitSpans(line, from2, to, level, baseLevel, isolates, order2) {
  let ourType = level % 2 ? 2 : 1;
  if (level % 2 == baseLevel % 2) {
    for (let iCh = from2, iI = 0; iCh < to;) {
      let sameDir = true,
        isNum = false;
      if (iI == isolates.length || iCh < isolates[iI].from) {
        let next2 = types[iCh];
        if (next2 != ourType) {
          sameDir = false;
          isNum = next2 == 16;
        }
      }
      let recurse = !sameDir && ourType == 1 ? [] : null;
      let localLevel = sameDir ? level : level + 1;
      let iScan = iCh;
      run: for (;;) {
        if (iI < isolates.length && iScan == isolates[iI].from) {
          if (isNum) break run;
          let iso = isolates[iI];
          if (!sameDir)
            for (let upto = iso.to, jI = iI + 1; ;) {
              if (upto == to) break run;
              if (jI < isolates.length && isolates[jI].from == upto) upto = isolates[jI++].to;
              else if (types[upto] == ourType) break run;
              else break;
            }
          iI++;
          if (recurse) {
            recurse.push(iso);
          } else {
            if (iso.from > iCh) order2.push(new BidiSpan(iCh, iso.from, localLevel));
            let dirSwap = (iso.direction == LTR) != !(localLevel % 2);
            computeSectionOrder(
              line,
              dirSwap ? level + 1 : level,
              baseLevel,
              iso.inner,
              iso.from,
              iso.to,
              order2,
            );
            iCh = iso.to;
          }
          iScan = iso.to;
        } else if (iScan == to || (sameDir ? types[iScan] != ourType : types[iScan] == ourType)) {
          break;
        } else {
          iScan++;
        }
      }
      if (recurse) emitSpans(line, iCh, iScan, level + 1, baseLevel, recurse, order2);
      else if (iCh < iScan) order2.push(new BidiSpan(iCh, iScan, localLevel));
      iCh = iScan;
    }
  } else {
    for (let iCh = to, iI = isolates.length; iCh > from2;) {
      let sameDir = true,
        isNum = false;
      if (!iI || iCh > isolates[iI - 1].to) {
        let next2 = types[iCh - 1];
        if (next2 != ourType) {
          sameDir = false;
          isNum = next2 == 16;
        }
      }
      let recurse = !sameDir && ourType == 1 ? [] : null;
      let localLevel = sameDir ? level : level + 1;
      let iScan = iCh;
      run: for (;;) {
        if (iI && iScan == isolates[iI - 1].to) {
          if (isNum) break run;
          let iso = isolates[--iI];
          if (!sameDir)
            for (let upto = iso.from, jI = iI; ;) {
              if (upto == from2) break run;
              if (jI && isolates[jI - 1].to == upto) upto = isolates[--jI].from;
              else if (types[upto - 1] == ourType) break run;
              else break;
            }
          if (recurse) {
            recurse.push(iso);
          } else {
            if (iso.to < iCh) order2.push(new BidiSpan(iso.to, iCh, localLevel));
            let dirSwap = (iso.direction == LTR) != !(localLevel % 2);
            computeSectionOrder(
              line,
              dirSwap ? level + 1 : level,
              baseLevel,
              iso.inner,
              iso.from,
              iso.to,
              order2,
            );
            iCh = iso.from;
          }
          iScan = iso.from;
        } else if (
          iScan == from2 ||
          (sameDir ? types[iScan - 1] != ourType : types[iScan - 1] == ourType)
        ) {
          break;
        } else {
          iScan--;
        }
      }
      if (recurse) emitSpans(line, iScan, iCh, level + 1, baseLevel, recurse, order2);
      else if (iScan < iCh) order2.push(new BidiSpan(iScan, iCh, localLevel));
      iCh = iScan;
    }
  }
}
function computeSectionOrder(line, level, baseLevel, isolates, from2, to, order2) {
  let outerType = level % 2 ? 2 : 1;
  computeCharTypes(line, from2, to, isolates, outerType);
  processBracketPairs(line, from2, to, isolates, outerType);
  processNeutrals(from2, to, isolates, outerType);
  emitSpans(line, from2, to, level, baseLevel, isolates, order2);
}
export function computeOrder(line, direction, isolates) {
  if (!line) return [new BidiSpan(0, 0, direction == RTL ? 1 : 0)];
  if (direction == LTR && !isolates.length && !BidiRE.test(line)) return trivialOrder(line.length);
  if (isolates.length) while (line.length > types.length) types[types.length] = 256;
  let order2 = [],
    level = direction == LTR ? 0 : 1;
  computeSectionOrder(line, level, level, isolates, 0, line.length, order2);
  return order2;
}
class DOMReader {
  constructor(points, view2) {
    this.points = points;
    this.view = view2;
    this.text = "";
    this.lineSeparator = view2.state.facet(EditorState2.lineSeparator);
  }
  append(text2) {
    this.text += text2;
  }
  lineBreak() {
    this.text += LineBreakPlaceholder;
  }
  readRange(start2, end2) {
    if (!start2) return this;
    let parent = start2.parentNode;
    for (let cur = start2; ;) {
      this.findPointBefore(parent, cur);
      let oldLen = this.text.length;
      this.readNode(cur);
      let tile = Tile.get(cur),
        next2 = cur.nextSibling;
      if (next2 == end2) {
        if (
          (tile === null || tile === void 0 ? void 0 : tile.breakAfter) &&
          !next2 &&
          parent != this.view.contentDOM
        )
          this.lineBreak();
        break;
      }
      let nextTile = Tile.get(next2);
      if (
        (tile && nextTile
          ? tile.breakAfter
          : (tile ? tile.breakAfter : isBlockElement(cur)) ||
            (isBlockElement(next2) &&
              (cur.nodeName != "BR" ||
                (tile === null || tile === void 0 ? void 0 : tile.isWidget())) &&
              this.text.length > oldLen)) &&
        !isEmptyToEnd(next2, end2)
      )
        this.lineBreak();
      cur = next2;
    }
    this.findPointBefore(parent, end2);
    return this;
  }
  readTextNode(node2) {
    let text2 = node2.nodeValue;
    for (let point2 of this.points)
      if (point2.node == node2)
        point2.pos = this.text.length + Math.min(point2.offset, text2.length);
    for (let off = 0, re2 = this.lineSeparator ? null : /\r\n?|\n/g; ;) {
      let nextBreak = -1,
        breakSize = 1,
        m3;
      if (this.lineSeparator) {
        nextBreak = text2.indexOf(this.lineSeparator, off);
        breakSize = this.lineSeparator.length;
      } else if ((m3 = re2.exec(text2))) {
        nextBreak = m3.index;
        breakSize = m3[0].length;
      }
      this.append(text2.slice(off, nextBreak < 0 ? text2.length : nextBreak));
      if (nextBreak < 0) break;
      this.lineBreak();
      if (breakSize > 1) {
        for (let point2 of this.points)
          if (point2.node == node2 && point2.pos > this.text.length) point2.pos -= breakSize - 1;
      }
      off = nextBreak + breakSize;
    }
  }
  readNode(node2) {
    let tile = Tile.get(node2);
    let fromView = tile && tile.overrideDOMText;
    if (fromView != null) {
      this.findPointInside(node2, fromView.length);
      for (let i2 = fromView.iter(); !i2.next().done;) {
        if (i2.lineBreak) this.lineBreak();
        else this.append(i2.value);
      }
    } else if (node2.nodeType == 3) {
      this.readTextNode(node2);
    } else if (node2.nodeName == "BR") {
      if (node2.nextSibling) this.lineBreak();
    } else if (node2.nodeType == 1) {
      this.readRange(node2.firstChild, null);
    }
  }
  findPointBefore(node2, next2) {
    for (let point2 of this.points)
      if (point2.node == node2 && node2.childNodes[point2.offset] == next2)
        point2.pos = this.text.length;
  }
  findPointInside(node2, length2) {
    for (let point2 of this.points)
      if (node2.nodeType == 3 ? point2.node == node2 : node2.contains(point2.node))
        point2.pos = this.text.length + (isAtEnd(node2, point2.node, point2.offset) ? length2 : 0);
  }
}
export class DOMChange {
  constructor(view2, start2, end2, typeOver) {
    this.typeOver = typeOver;
    this.bounds = null;
    this.text = "";
    this.domChanged = start2 > -1;
    let { impreciseHead: iHead, impreciseAnchor: iAnchor } = view2.docView,
      curSel = view2.state.selection;
    if (view2.state.readOnly && start2 > -1) {
      this.newSel = null;
    } else if (
      start2 > -1 &&
      (this.bounds = domBoundsAround(view2.docView.tile, start2, end2, 0))
    ) {
      let selPoints = iHead || iAnchor ? [] : selectionPoints(view2);
      let reader = new DOMReader(selPoints, view2);
      reader.readRange(this.bounds.startDOM, this.bounds.endDOM);
      this.text = reader.text;
      this.newSel = selectionFromPoints(selPoints, this.bounds.from);
    } else {
      let domSel = view2.observer.selectionRange;
      let head2 =
        (iHead && iHead.node == domSel.focusNode && iHead.offset == domSel.focusOffset) ||
        !contains(view2.contentDOM, domSel.focusNode)
          ? curSel.main.head
          : view2.docView.posFromDOM(domSel.focusNode, domSel.focusOffset);
      let anchor =
        (iAnchor && iAnchor.node == domSel.anchorNode && iAnchor.offset == domSel.anchorOffset) ||
        !contains(view2.contentDOM, domSel.anchorNode)
          ? curSel.main.anchor
          : view2.docView.posFromDOM(domSel.anchorNode, domSel.anchorOffset);
      let vp = view2.viewport;
      if (
        (browser.ios || browser.chrome) &&
        head2 != anchor &&
        Math.min(head2, anchor) <= curSel.main.from &&
        Math.max(head2, anchor) >= curSel.main.to &&
        (vp.from > 0 || vp.to < view2.state.doc.length)
      ) {
        let from2 = Math.min(head2, anchor),
          to = Math.max(head2, anchor);
        let offFrom = vp.from - from2,
          offTo = vp.to - to;
        if (
          (offFrom == 0 || offFrom == 1 || from2 == 0) &&
          (offTo == 0 || offTo == -1 || to == view2.state.doc.length)
        ) {
          head2 = 0;
          anchor = view2.state.doc.length;
        }
      }
      if (view2.inputState.composing > -1 && curSel.ranges.length > 1) {
        this.newSel = curSel.replaceRange(EditorSelection.range(anchor, head2));
      } else if (
        view2.lineWrapping &&
        anchor == head2 &&
        !(curSel.main.empty && curSel.main.head == head2) &&
        view2.inputState.lastTouchTime > Date.now() - 100
      ) {
        let before = view2.coordsAtPos(head2, -1),
          assoc = 0;
        if (before) assoc = view2.inputState.lastTouchY <= before.bottom ? -1 : 1;
        this.newSel = EditorSelection.create([EditorSelection.cursor(head2, assoc)]);
      } else {
        this.newSel = EditorSelection.single(anchor, head2);
      }
    }
  }
}
export class InputState2 {
  setSelectionOrigin(origin) {
    this.lastSelectionOrigin = origin;
    this.lastSelectionTime = Date.now();
  }
  constructor(view2) {
    this.view = view2;
    this.lastKeyCode = 0;
    this.lastKeyTime = 0;
    this.touchActive = false;
    this.lastTouchTime = 0;
    this.lastTouchX = 0;
    this.lastTouchY = 0;
    this.lastFocusTime = 0;
    this.lastScrollTop = 0;
    this.lastScrollLeft = 0;
    this.lastWheelEvent = 0;
    this.pendingIOSKey = void 0;
    this.lastIOSMomentumScroll = 0;
    this.tabFocusMode = -1;
    this.lastSelectionOrigin = null;
    this.lastSelectionTime = 0;
    this.lastContextMenu = 0;
    this.scrollHandlers = [];
    this.handlers = Object.create(null);
    this.composing = -1;
    this.compositionFirstChange = null;
    this.compositionEndedAt = 0;
    this.compositionPendingKey = false;
    this.compositionPendingChange = false;
    this.insertingText = "";
    this.insertingTextAt = 0;
    this.mouseSelection = null;
    this.draggedContent = null;
    this.handleEvent = this.handleEvent.bind(this);
    this.notifiedFocused = view2.hasFocus;
    if (browser.safari) view2.contentDOM.addEventListener("input", () => null);
    if (browser.gecko) firefoxCopyCutHack(view2.contentDOM.ownerDocument);
  }
  handleEvent(event) {
    if (!eventBelongsToEditor(this.view, event) || this.ignoreDuringComposition(event)) return;
    if (event.type == "keydown" && this.keydown(event)) return;
    if (this.view.updateState != 0)
      Promise.resolve().then(() => this.runHandlers(event.type, event));
    else this.runHandlers(event.type, event);
  }
  runHandlers(type2, event) {
    let handlers2 = this.handlers[type2];
    if (handlers2) {
      for (let observer2 of handlers2.observers) observer2(this.view, event);
      for (let handler of handlers2.handlers) {
        if (event.defaultPrevented) break;
        if (handler(this.view, event)) {
          event.preventDefault();
          break;
        }
      }
    }
  }
  ensureHandlers(plugins) {
    let handlers2 = computeHandlers(plugins),
      prev = this.handlers,
      dom = this.view.contentDOM;
    for (let type2 in handlers2)
      if (type2 != "scroll") {
        let passive = !handlers2[type2].handlers.length;
        let exists = prev[type2];
        if (exists && passive != !exists.handlers.length) {
          dom.removeEventListener(type2, this.handleEvent);
          exists = null;
        }
        if (!exists)
          dom.addEventListener(type2, this.handleEvent, {
            passive,
          });
      }
    for (let type2 in prev)
      if (type2 != "scroll" && !handlers2[type2]) dom.removeEventListener(type2, this.handleEvent);
    this.handlers = handlers2;
  }
  keydown(event) {
    this.lastKeyCode = event.keyCode;
    this.lastKeyTime = Date.now();
    if (
      event.keyCode == 9 &&
      this.tabFocusMode > -1 &&
      (!this.tabFocusMode || Date.now() <= this.tabFocusMode)
    )
      return true;
    if (this.tabFocusMode > 0 && event.keyCode != 27 && modifierCodes.indexOf(event.keyCode) < 0)
      this.tabFocusMode = -1;
    if (
      browser.android &&
      browser.chrome &&
      !event.synthetic &&
      (event.keyCode == 13 || event.keyCode == 8)
    ) {
      this.view.observer.delayAndroidKey(event.key, event.keyCode);
      return true;
    }
    if (
      browser.ios &&
      !event.synthetic &&
      !event.altKey &&
      !event.metaKey &&
      ((PendingKeys.some((key2) => key2.keyCode == event.keyCode) && !event.ctrlKey) ||
        (EmacsyPendingKeys.indexOf(event.key) > -1 && event.ctrlKey))
    ) {
      let mods = {
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
      };
      if (
        mods.shiftKey &&
        browser.ios &&
        !/^(off|none)$/.test(this.view.contentDOM.autocapitalize) &&
        iosVirtualKeyboardOpen(this.view.win)
      )
        mods.shiftKey = false;
      this.pendingIOSKey = {
        key: event.key,
        keyCode: event.keyCode,
        mods,
      };
      setTimeout(() => this.flushIOSKey(), 250);
      return true;
    }
    if (event.keyCode != 229) this.view.observer.forceFlush();
    return false;
  }
  flushIOSKey(change) {
    let key2 = this.pendingIOSKey;
    if (!key2) return false;
    if (
      key2.key == "Enter" &&
      change &&
      change.from < change.to &&
      /^\S+$/.test(change.insert.toString())
    )
      return false;
    this.pendingIOSKey = void 0;
    return dispatchKey(this.view.contentDOM, key2.key, key2.keyCode, key2.mods);
  }
  ignoreDuringComposition(event) {
    if (!/^key/.test(event.type) || event.synthetic) return false;
    if (this.composing > 0) return true;
    if (
      browser.safari &&
      !browser.ios &&
      this.compositionPendingKey &&
      Date.now() - this.compositionEndedAt < 100
    ) {
      this.compositionPendingKey = false;
      return true;
    }
    return false;
  }
  startMouseSelection(mouseSelection) {
    if (this.mouseSelection) this.mouseSelection.destroy();
    this.mouseSelection = mouseSelection;
  }
  update(update2) {
    this.view.observer.update(update2);
    if (this.mouseSelection) this.mouseSelection.update(update2);
    if (this.draggedContent && update2.docChanged)
      this.draggedContent = this.draggedContent.map(update2.changes);
    if (update2.transactions.length) this.lastKeyCode = this.lastSelectionTime = 0;
  }
  destroy() {
    if (this.mouseSelection) this.mouseSelection.destroy();
  }
}
function computeHandlers(plugins) {
  let result = Object.create(null);
  function record2(type2) {
    return (
      result[type2] ||
      (result[type2] = {
        observers: [],
        handlers: [],
      })
    );
  }
  for (let plugin of plugins) {
    let spec = plugin.spec,
      handlers2 = spec && spec.plugin.domEventHandlers,
      observers2 = spec && spec.plugin.domEventObservers;
    if (handlers2)
      for (let type2 in handlers2) {
        let f2 = handlers2[type2];
        if (f2) record2(type2).handlers.push(bindHandler(plugin.value, f2));
      }
    if (observers2)
      for (let type2 in observers2) {
        let f2 = observers2[type2];
        if (f2) record2(type2).observers.push(bindHandler(plugin.value, f2));
      }
  }
  for (let type2 in handlers) record2(type2).handlers.push(handlers[type2]);
  for (let type2 in observers) record2(type2).observers.push(observers[type2]);
  return result;
}
class MouseSelection {
  constructor(view2, startEvent, style2, mustSelect) {
    this.view = view2;
    this.startEvent = startEvent;
    this.style = style2;
    this.mustSelect = mustSelect;
    this.scrollSpeed = {
      x: 0,
      y: 0,
    };
    this.scrolling = -1;
    this.lastEvent = startEvent;
    this.scrollParents = scrollableParents(view2.contentDOM);
    this.atoms = view2.state.facet(atomicRanges).map((f2) => f2(view2));
    let doc2 = view2.contentDOM.ownerDocument;
    doc2.addEventListener("mousemove", (this.move = this.move.bind(this)));
    doc2.addEventListener("mouseup", (this.up = this.up.bind(this)));
    this.extend = startEvent.shiftKey;
    this.multiple =
      view2.state.facet(EditorState2.allowMultipleSelections) &&
      addsSelectionRange(view2, startEvent);
    this.dragging =
      isInPrimarySelection(view2, startEvent) && getClickType(startEvent) == 1 ? null : false;
  }
  start(event) {
    if (this.dragging === false) this.select(event);
  }
  move(event) {
    if (event.buttons == 0) return this.destroy();
    if (this.dragging || (this.dragging == null && dist(this.startEvent, event) < 10)) return;
    this.select((this.lastEvent = event));
    let sx = 0,
      sy = 0;
    let left = 0,
      top2 = 0,
      right = this.view.win.innerWidth,
      bottom = this.view.win.innerHeight;
    if (this.scrollParents.x) ({ left, right } = this.scrollParents.x.getBoundingClientRect());
    if (this.scrollParents.y)
      ({ top: top2, bottom } = this.scrollParents.y.getBoundingClientRect());
    let margins = getScrollMargins(this.view);
    if (event.clientX - margins.left <= left + dragScrollMargin)
      sx = -dragScrollSpeed(left - event.clientX);
    else if (event.clientX + margins.right >= right - dragScrollMargin)
      sx = dragScrollSpeed(event.clientX - right);
    if (event.clientY - margins.top <= top2 + dragScrollMargin)
      sy = -dragScrollSpeed(top2 - event.clientY);
    else if (event.clientY + margins.bottom >= bottom - dragScrollMargin)
      sy = dragScrollSpeed(event.clientY - bottom);
    this.setScrollSpeed(sx, sy);
  }
  up(event) {
    if (this.dragging == null) this.select(this.lastEvent);
    if (!this.dragging) event.preventDefault();
    this.destroy();
  }
  destroy() {
    this.setScrollSpeed(0, 0);
    let doc2 = this.view.contentDOM.ownerDocument;
    doc2.removeEventListener("mousemove", this.move);
    doc2.removeEventListener("mouseup", this.up);
    this.view.inputState.mouseSelection = this.view.inputState.draggedContent = null;
  }
  setScrollSpeed(sx, sy) {
    this.scrollSpeed = {
      x: sx,
      y: sy,
    };
    if (sx || sy) {
      if (this.scrolling < 0) this.scrolling = setInterval(() => this.scroll(), 50);
    } else if (this.scrolling > -1) {
      clearInterval(this.scrolling);
      this.scrolling = -1;
    }
  }
  scroll() {
    let { x: x2, y: y4 } = this.scrollSpeed;
    if (x2 && this.scrollParents.x) {
      this.scrollParents.x.scrollLeft += x2;
      x2 = 0;
    }
    if (y4 && this.scrollParents.y) {
      this.scrollParents.y.scrollTop += y4;
      y4 = 0;
    }
    if (x2 || y4) this.view.win.scrollBy(x2, y4);
    if (this.dragging === false) this.select(this.lastEvent);
  }
  select(event) {
    let { view: view2 } = this,
      selection2 = skipAtomsForSelection(
        this.atoms,
        this.style.get(event, this.extend, this.multiple),
      );
    if (this.mustSelect || !selection2.eq(view2.state.selection, this.dragging === false))
      this.view.dispatch({
        selection: selection2,
        userEvent: "select.pointer",
      });
    this.mustSelect = false;
  }
  update(update2) {
    if (update2.transactions.some((tr2) => tr2.isUserEvent("input.type"))) this.destroy();
    else if (this.style.update(update2)) setTimeout(() => this.select(this.lastEvent), 20);
  }
}
const handlers = Object.create(null);
function capturePaste(view2) {
  let parent = view2.dom.parentNode;
  if (!parent) return;
  let target = parent.appendChild(document.createElement("textarea"));
  target.style.cssText = "position: fixed; left: -10000px; top: 10px";
  target.focus();
  setTimeout(() => {
    view2.focus();
    target.remove();
    doPaste(view2, target.value);
  }, 50);
}
function doPaste(view2, input) {
  input = textFilter(view2.state, clipboardInputFilter, input);
  let { state: state2 } = view2,
    changes,
    i2 = 1,
    text2 = state2.toText(input);
  let byLine = text2.lines == state2.selection.ranges.length;
  let linewise =
    lastLinewiseCopy != null &&
    state2.selection.ranges.every((r2) => r2.empty) &&
    lastLinewiseCopy == text2.toString();
  if (linewise) {
    let lastLine = -1;
    changes = state2.changeByRange((range2) => {
      let line = state2.doc.lineAt(range2.from);
      if (line.from == lastLine)
        return {
          range: range2,
        };
      lastLine = line.from;
      let insert2 = state2.toText((byLine ? text2.line(i2++).text : input) + state2.lineBreak);
      return {
        changes: {
          from: line.from,
          insert: insert2,
        },
        range: EditorSelection.cursor(range2.from + insert2.length),
      };
    });
  } else if (byLine) {
    changes = state2.changeByRange((range2) => {
      let line = text2.line(i2++);
      return {
        changes: {
          from: range2.from,
          to: range2.to,
          insert: line.text,
        },
        range: EditorSelection.cursor(range2.from + line.length),
      };
    });
  } else {
    changes = state2.replaceSelection(text2);
  }
  view2.dispatch(changes, {
    userEvent: "input.paste",
    scrollIntoView: true,
  });
}
handlers.keydown = (view2, event) => {
  view2.inputState.setSelectionOrigin("select");
  if (event.keyCode == 27 && view2.inputState.tabFocusMode != 0)
    view2.inputState.tabFocusMode = Date.now() + 2e3;
  return false;
};
handlers.mousedown = (view2, event) => {
  view2.observer.flush();
  if (view2.inputState.lastTouchTime > Date.now() - 2e3) return false;
  let style2 = null;
  for (let makeStyle of view2.state.facet(mouseSelectionStyle)) {
    style2 = makeStyle(view2, event);
    if (style2) break;
  }
  if (!style2 && event.button == 0) style2 = basicMouseSelection(view2, event);
  if (style2) {
    let mustFocus = !view2.hasFocus;
    view2.inputState.startMouseSelection(new MouseSelection(view2, event, style2, mustFocus));
    if (mustFocus)
      view2.observer.ignore(() => {
        focusPreventScroll(view2.contentDOM);
        let active2 = view2.root.activeElement;
        if (active2 && !active2.contains(view2.contentDOM)) active2.blur();
      });
    let mouseSel = view2.inputState.mouseSelection;
    if (mouseSel) {
      mouseSel.start(event);
      return mouseSel.dragging === false;
    }
  } else {
    view2.inputState.setSelectionOrigin("select.pointer");
  }
  return false;
};
handlers.dragstart = (view2, event) => {
  let {
    selection: { main: range2 },
  } = view2.state;
  if (event.target.draggable) {
    let tile = view2.docView.tile.nearest(event.target);
    if (tile && tile.isWidget()) {
      let from2 = tile.posAtStart,
        to = from2 + tile.length;
      if (from2 >= range2.to || to <= range2.from)
        range2 = EditorSelection.undirectionalRange(from2, to);
    }
  }
  let { inputState } = view2;
  if (inputState.mouseSelection) inputState.mouseSelection.dragging = true;
  inputState.draggedContent = range2;
  if (event.dataTransfer) {
    event.dataTransfer.setData(
      "Text",
      textFilter(view2.state, clipboardOutputFilter, view2.state.sliceDoc(range2.from, range2.to)),
    );
    event.dataTransfer.effectAllowed = "copyMove";
  }
  return false;
};
handlers.dragend = (view2) => {
  view2.inputState.draggedContent = null;
  return false;
};
handlers.drop = (view2, event) => {
  if (!event.dataTransfer) return false;
  if (view2.state.readOnly) return true;
  let files = event.dataTransfer.files;
  if (files && files.length) {
    let text2 = Array(files.length),
      read = 0;
    let finishFile = () => {
      if (++read == files.length)
        dropText(view2, event, text2.filter((s2) => s2 != null).join(view2.state.lineBreak), false);
    };
    for (let i2 = 0; i2 < files.length; i2++) {
      let reader = new FileReader();
      reader.onerror = finishFile;
      reader.onload = () => {
        if (!/[\x00-\x08\x0e-\x1f]{2}/.test(reader.result)) text2[i2] = reader.result;
        finishFile();
      };
      reader.readAsText(files[i2]);
    }
    return true;
  } else {
    let text2 = event.dataTransfer.getData("Text");
    if (text2) {
      dropText(view2, event, text2, true);
      return true;
    }
  }
  return false;
};
handlers.paste = (view2, event) => {
  if (view2.state.readOnly) return true;
  view2.observer.flush();
  let data2 = brokenClipboardAPI ? null : event.clipboardData;
  if (data2) {
    doPaste(view2, data2.getData("text/plain") || data2.getData("text/uri-list"));
    return true;
  } else {
    capturePaste(view2);
    return false;
  }
};
let lastLinewiseCopy = null;
handlers.copy = handlers.cut = (view2, event) => {
  if (!hasSelection(view2.contentDOM, view2.observer.selectionRange)) return false;
  let { text: text2, ranges, linewise } = copiedRange(view2.state);
  if (!text2 && !linewise) return false;
  lastLinewiseCopy = linewise ? text2 : null;
  if (event.type == "cut" && !view2.state.readOnly)
    view2.dispatch({
      changes: ranges,
      scrollIntoView: true,
      userEvent: "delete.cut",
    });
  let data2 = brokenClipboardAPI ? null : event.clipboardData;
  if (data2) {
    data2.clearData();
    data2.setData("text/plain", text2);
    return true;
  } else {
    captureCopy(view2, text2);
    return false;
  }
};
handlers.beforeinput = (view2, event) => {
  var _a2, _b;
  if (event.inputType == "insertText" || event.inputType == "insertCompositionText") {
    view2.inputState.insertingText = event.data;
    view2.inputState.insertingTextAt = Date.now();
  }
  if (event.inputType == "insertReplacementText" && view2.observer.editContext) {
    let text2 =
        (_a2 = event.dataTransfer) === null || _a2 === void 0 ? void 0 : _a2.getData("text/plain"),
      ranges = event.getTargetRanges();
    if (text2 && ranges.length) {
      let r2 = ranges[0];
      let from2 = view2.posAtDOM(r2.startContainer, r2.startOffset),
        to = view2.posAtDOM(r2.endContainer, r2.endOffset);
      applyDOMChangeInner(
        view2,
        {
          from: from2,
          to,
          insert: view2.state.toText(text2),
        },
        null,
      );
      return true;
    }
  }
  let pending2;
  if (
    browser.chrome &&
    browser.android &&
    (pending2 = PendingKeys.find((key2) => key2.inputType == event.inputType))
  ) {
    view2.observer.delayAndroidKey(pending2.key, pending2.keyCode);
    if (pending2.key == "Backspace" || pending2.key == "Delete") {
      let startViewHeight =
        ((_b = window.visualViewport) === null || _b === void 0 ? void 0 : _b.height) || 0;
      setTimeout(() => {
        var _a3;
        if (
          (((_a3 = window.visualViewport) === null || _a3 === void 0 ? void 0 : _a3.height) || 0) >
            startViewHeight + 10 &&
          view2.hasFocus
        ) {
          view2.contentDOM.blur();
          view2.focus();
        }
      }, 100);
    }
  }
  if (browser.ios && event.inputType == "deleteContentForward") {
    view2.observer.flushSoon();
  }
  if (browser.safari && event.inputType == "insertText" && view2.inputState.composing >= 0) {
    setTimeout(() => observers.compositionend(view2, event), 20);
  }
  return false;
};
