// editor-view2.js
import { browser, editable, dispatchKey, applyDOMChange, getRoot, ViewState, scrollIntoView, viewPlugin, PluginInstance, DocView, Transaction2, isFocusChange, focusChangeTransaction, ViewUpdate, ScrollTarget, EditorSelection, CachedOrder, styleModule, logException, isScrolledToBottom, attrsFromFacet, editorAttributes, contentAttributes, StyleModule, skipAtoms, moveByChar, byGroup, moveToLineBoundary, moveVertically, posAtCoords, BidiSpan, Direction, isolatesEq, getIsolatedRanges, focusPreventScroll, ViewPlugin, Prec, Tile, inputHandler, clipboardInputFilter, clipboardOutputFilter, scrollHandler, focusChangeEffect, exceptionSink, dragMovesSelection$1, clickAddsSelectionRange, decorations$1, blockWrappers, outerDecorations, atomicRanges, bidiIsolatedRanges, Facet, scrollMargins, StateEffect } from "../../vendor.js";
import { updateAttrs } from "../../text-editor/annotation-highlight.js";
import { buildTheme, baseThemeID, lightDarkIDs, theme, updateListener, BadMeasure, darkTheme, baseDarkID, baseLightID, perLineTextDirection, MaxBidiLine, trivialOrder, mouseSelectionStyle } from "./line2.js";
import { InputState2, computeOrder } from "./input-state2.js";
import { EditorState2 } from "./editor-state2.js";
import { DOMObserver2, baseTheme$1$1 } from "./dom-observer2.js";
export class EditorView2 {
  /**
  The current editor state.
  */
  get state() {
    return this.viewState.state;
  }
  /**
  To be able to display large documents without consuming too much
  memory or overloading the browser, CodeMirror only draws the
  code that is visible (plus a margin around it) to the DOM. This
  property tells you the extent of the current drawn viewport, in
  document positions.
  */
  get viewport() {
    return this.viewState.viewport;
  }
  /**
  When there are, for example, large collapsed ranges in the
  viewport, its size can be a lot bigger than the actual visible
  content. Thus, if you are doing something like styling the
  content in the viewport, it is preferable to only do so for
  these ranges, which are the subset of the viewport that is
  actually drawn.
  */
  get visibleRanges() {
    return this.viewState.visibleRanges;
  }
  /**
  Returns false when the editor is entirely scrolled out of view
  or otherwise hidden.
  */
  get inView() {
    return this.viewState.inView;
  }
  /**
  Indicates whether the user is currently composing text via
  [IME](https://en.wikipedia.org/wiki/Input_method), and at least
  one change has been made in the current composition.
  */
  get composing() {
    return !!this.inputState && this.inputState.composing > 0;
  }
  /**
  Indicates whether the user is currently in composing state. Note
  that on some platforms, like Android, this will be the case a
  lot, since just putting the cursor on a word starts a
  composition there.
  */
  get compositionStarted() {
    return !!this.inputState && this.inputState.composing >= 0;
  }
  /**
  The document or shadow root that the view lives in.
  */
  get root() {
    return this._root;
  }
  /**
  @internal
  */
  get win() {
    return this.dom.ownerDocument.defaultView || window;
  }
  /**
  Construct a new view. You'll want to either provide a `parent`
  option, or put `view.dom` into your document after creating a
  view, so that the user can see the editor.
  */
  constructor(config2 = {}) {
    var _a2;
    this.plugins = [];
    this.pluginMap = new Map();
    this.editorAttrs = {};
    this.contentAttrs = {};
    this.bidiCache = [];
    this.destroyed = false;
    this.updateState = 2;
    this.measureScheduled = -1;
    this.measureRequests = [];
    this.contentDOM = document.createElement("div");
    this.scrollDOM = document.createElement("div");
    this.scrollDOM.tabIndex = -1;
    this.scrollDOM.className = "cm-scroller";
    this.scrollDOM.appendChild(this.contentDOM);
    this.announceDOM = document.createElement("div");
    this.announceDOM.className = "cm-announced";
    this.announceDOM.setAttribute("aria-live", "polite");
    this.dom = document.createElement("div");
    this.dom.appendChild(this.announceDOM);
    this.dom.appendChild(this.scrollDOM);
    if (config2.parent) config2.parent.appendChild(this.dom);
    let { dispatch: dispatch2 } = config2;
    this.dispatchTransactions =
      config2.dispatchTransactions ||
      (dispatch2 && ((trs) => trs.forEach((tr2) => dispatch2(tr2, this)))) ||
      ((trs) => this.update(trs));
    this.dispatch = this.dispatch.bind(this);
    this._root = config2.root || getRoot(config2.parent) || document;
    this.viewState = new ViewState(this, config2.state || EditorState2.create(config2));
    if (config2.scrollTo && config2.scrollTo.is(scrollIntoView))
      this.viewState.scrollTarget = config2.scrollTo.value.clip(this.viewState.state);
    this.plugins = this.state.facet(viewPlugin).map((spec) => new PluginInstance(spec));
    for (let plugin of this.plugins) plugin.update(this);
    this.observer = new DOMObserver2(this);
    this.inputState = new InputState2(this);
    this.inputState.ensureHandlers(this.plugins);
    this.docView = new DocView(this);
    this.mountStyles();
    this.updateAttrs();
    this.updateState = 0;
    this.requestMeasure();
    if ((_a2 = document.fonts) === null || _a2 === void 0 ? void 0 : _a2.ready)
      document.fonts.ready.then(() => {
        this.viewState.mustMeasureContent = "refresh";
        this.requestMeasure();
      });
  }
  dispatch(...input) {
    let trs =
      input.length == 1 && input[0] instanceof Transaction2
        ? input
        : input.length == 1 && Array.isArray(input[0])
          ? input[0]
          : [this.state.update(...input)];
    this.dispatchTransactions(trs, this);
  }
  /**
  Update the view for the given array of transactions. This will
  update the visible document and selection to match the state
  produced by the transactions, and notify view plugins of the
  change. You should usually call
  [`dispatch`](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch) instead, which uses this
  as a primitive.
  */
  update(transactions) {
    if (this.updateState != 0)
      throw new Error("Calls to EditorView.update are not allowed while an update is in progress");
    let redrawn = false,
      attrsChanged = false,
      update2;
    let state2 = this.state;
    for (let tr2 of transactions) {
      if (tr2.startState != state2)
        throw new RangeError(
          "Trying to update state with a transaction that doesn't start from the previous state.",
        );
      state2 = tr2.state;
    }
    if (this.destroyed) {
      this.viewState.state = state2;
      return;
    }
    let focus2 = this.hasFocus,
      focusFlag = 0,
      dispatchFocus = null;
    if (transactions.some((tr2) => tr2.annotation(isFocusChange))) {
      this.inputState.notifiedFocused = focus2;
      focusFlag = 1;
    } else if (focus2 != this.inputState.notifiedFocused) {
      this.inputState.notifiedFocused = focus2;
      dispatchFocus = focusChangeTransaction(state2, focus2);
      if (!dispatchFocus) focusFlag = 1;
    }
    let pendingKey = this.observer.delayedAndroidKey,
      domChange = null;
    if (pendingKey) {
      this.observer.clearDelayedAndroidKey();
      domChange = this.observer.readChange();
      if (
        (domChange && !this.state.doc.eq(state2.doc)) ||
        !this.state.selection.eq(state2.selection)
      )
        domChange = null;
    } else {
      this.observer.clear();
    }
    if (state2.facet(EditorState2.phrases) != this.state.facet(EditorState2.phrases))
      return this.setState(state2);
    update2 = ViewUpdate.create(this, state2, transactions);
    update2.flags |= focusFlag;
    let scrollTarget = this.viewState.scrollTarget;
    try {
      this.updateState = 2;
      for (let tr2 of transactions) {
        if (scrollTarget) scrollTarget = scrollTarget.map(tr2.changes);
        if (tr2.scrollIntoView) {
          let { main: main2 } = tr2.state.selection;
          let { x: x2, y: y4 } = this.state.facet(EditorView2.cursorScrollMargin);
          scrollTarget = new ScrollTarget(
            main2.empty
              ? main2
              : EditorSelection.cursor(main2.head, main2.head > main2.anchor ? -1 : 1),
            "nearest",
            "nearest",
            y4,
            x2,
          );
        }
        for (let e2 of tr2.effects)
          if (e2.is(scrollIntoView)) scrollTarget = e2.value.clip(this.state);
      }
      this.viewState.update(update2, scrollTarget);
      this.bidiCache = CachedOrder.update(this.bidiCache, update2.changes);
      if (!update2.empty) {
        this.updatePlugins(update2);
        this.inputState.update(update2);
      }
      redrawn = this.docView.update(update2);
      if (this.state.facet(styleModule) != this.styleModules) this.mountStyles();
      attrsChanged = this.updateAttrs();
      this.showAnnouncements(transactions);
      this.docView.updateSelection(
        redrawn,
        transactions.some((tr2) => tr2.isUserEvent("select.pointer")),
      );
    } finally {
      this.updateState = 0;
    }
    if (update2.startState.facet(theme) != update2.state.facet(theme))
      this.viewState.mustMeasureContent = true;
    if (
      redrawn ||
      attrsChanged ||
      scrollTarget ||
      this.viewState.mustEnforceCursorAssoc ||
      this.viewState.mustMeasureContent
    )
      this.requestMeasure();
    if (redrawn) this.docViewUpdate();
    if (!update2.empty)
      for (let listener of this.state.facet(updateListener)) {
        try {
          listener(update2);
        } catch (e2) {
          logException(this.state, e2, "update listener");
        }
      }
    if (dispatchFocus || domChange)
      Promise.resolve().then(() => {
        if (dispatchFocus && this.state == dispatchFocus.startState) this.dispatch(dispatchFocus);
        if (domChange) {
          if (!applyDOMChange(this, domChange) && pendingKey.force)
            dispatchKey(this.contentDOM, pendingKey.key, pendingKey.keyCode);
        }
      });
  }
  /**
  Reset the view to the given state. (This will cause the entire
  document to be redrawn and all view plugins to be reinitialized,
  so you should probably only use it when the new state isn't
  derived from the old state. Otherwise, use
  [`dispatch`](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch) instead.)
  */
  setState(newState) {
    if (this.updateState != 0)
      throw new Error(
        "Calls to EditorView.setState are not allowed while an update is in progress",
      );
    if (this.destroyed) {
      this.viewState.state = newState;
      return;
    }
    this.updateState = 2;
    let hadFocus = this.hasFocus;
    try {
      for (let plugin of this.plugins) plugin.destroy(this);
      this.viewState = new ViewState(this, newState);
      this.plugins = newState.facet(viewPlugin).map((spec) => new PluginInstance(spec));
      this.pluginMap.clear();
      for (let plugin of this.plugins) plugin.update(this);
      this.docView.destroy();
      this.docView = new DocView(this);
      this.inputState.ensureHandlers(this.plugins);
      this.mountStyles();
      this.updateAttrs();
      this.bidiCache = [];
    } finally {
      this.updateState = 0;
    }
    if (hadFocus) this.focus();
    this.requestMeasure();
  }
  updatePlugins(update2) {
    let prevSpecs = update2.startState.facet(viewPlugin),
      specs = update2.state.facet(viewPlugin);
    if (prevSpecs != specs) {
      let newPlugins = [];
      for (let spec of specs) {
        let found2 = prevSpecs.indexOf(spec);
        if (found2 < 0) {
          newPlugins.push(new PluginInstance(spec));
        } else {
          let plugin = this.plugins[found2];
          plugin.mustUpdate = update2;
          newPlugins.push(plugin);
        }
      }
      for (let plugin of this.plugins) if (plugin.mustUpdate != update2) plugin.destroy(this);
      this.plugins = newPlugins;
      this.pluginMap.clear();
    } else {
      for (let p3 of this.plugins) p3.mustUpdate = update2;
    }
    for (let i2 = 0; i2 < this.plugins.length; i2++) this.plugins[i2].update(this);
    if (prevSpecs != specs) this.inputState.ensureHandlers(this.plugins);
  }
  docViewUpdate() {
    for (let plugin of this.plugins) {
      let val = plugin.value;
      if (val && val.docViewUpdate) {
        try {
          val.docViewUpdate(this);
        } catch (e2) {
          logException(this.state, e2, "doc view update listener");
        }
      }
    }
  }
  /**
  @internal
  */
  measure(flush2 = true) {
    if (this.destroyed) return;
    if (this.measureScheduled > -1) this.win.cancelAnimationFrame(this.measureScheduled);
    if (this.observer.delayedAndroidKey) {
      this.measureScheduled = -1;
      this.requestMeasure();
      return;
    }
    this.measureScheduled = 0;
    if (flush2) this.observer.forceFlush();
    let updated = null;
    let scroll = this.viewState.scrollParent,
      scrollOffset = this.viewState.getScrollOffset();
    let { scrollAnchorPos, scrollAnchorHeight } = this.viewState;
    if (Math.abs(scrollOffset - this.viewState.scrollOffset) > 1) scrollAnchorHeight = -1;
    this.viewState.scrollAnchorHeight = -1;
    try {
      for (let i2 = 0; ; i2++) {
        if (scrollAnchorHeight < 0) {
          if (isScrolledToBottom(scroll || this.win)) {
            scrollAnchorPos = -1;
            scrollAnchorHeight = this.viewState.heightMap.height;
          } else {
            let block = this.viewState.scrollAnchorAt(scrollOffset);
            scrollAnchorPos = block.from;
            scrollAnchorHeight = block.top;
          }
        }
        this.updateState = 1;
        let changed = this.viewState.measure();
        if (!changed && !this.measureRequests.length && this.viewState.scrollTarget == null) break;
        if (i2 > 5) {
          console.warn(
            this.measureRequests.length
              ? "Measure loop restarted more than 5 times"
              : "Viewport failed to stabilize",
          );
          break;
        }
        let measuring = [];
        if (!(changed & 4)) [this.measureRequests, measuring] = [measuring, this.measureRequests];
        let measured = measuring.map((m3) => {
          try {
            return m3.read(this);
          } catch (e2) {
            logException(this.state, e2);
            return BadMeasure;
          }
        });
        let update2 = ViewUpdate.create(this, this.state, []),
          redrawn = false;
        update2.flags |= changed;
        if (!updated) updated = update2;
        else updated.flags |= changed;
        this.updateState = 2;
        if (!update2.empty) {
          this.updatePlugins(update2);
          this.inputState.update(update2);
          this.updateAttrs();
          redrawn = this.docView.update(update2);
          if (redrawn) this.docViewUpdate();
        }
        for (let i3 = 0; i3 < measuring.length; i3++)
          if (measured[i3] != BadMeasure) {
            try {
              let m3 = measuring[i3];
              if (m3.write) m3.write(measured[i3], this);
            } catch (e2) {
              logException(this.state, e2);
            }
          }
        if (redrawn) this.docView.updateSelection(true);
        if (!update2.viewportChanged && this.measureRequests.length == 0) {
          if (this.viewState.editorHeight) {
            if (this.viewState.scrollTarget) {
              this.docView.scrollIntoView(this.viewState.scrollTarget);
              this.viewState.scrollTarget = null;
              scrollAnchorHeight = -1;
              continue;
            } else {
              let newAnchorHeight =
                scrollAnchorPos < 0
                  ? this.viewState.heightMap.height
                  : this.viewState.lineBlockAt(scrollAnchorPos).top;
              let diff = (newAnchorHeight - scrollAnchorHeight) / this.scaleY;
              if (
                (diff > 1 || diff < -1) &&
                !(browser.ios && this.inputState.lastIOSMomentumScroll > Date.now() - 100) &&
                (scroll == this.scrollDOM ||
                  this.hasFocus ||
                  Math.max(this.inputState.lastWheelEvent, this.inputState.lastTouchTime) >
                    Date.now() - 100)
              ) {
                scrollOffset = scrollOffset + diff;
                if (scroll) scroll.scrollTop += diff;
                else this.win.scrollBy(0, diff);
                scrollAnchorHeight = -1;
                continue;
              }
            }
          }
          break;
        }
      }
    } finally {
      this.updateState = 0;
      this.measureScheduled = -1;
    }
    if (updated && !updated.empty)
      for (let listener of this.state.facet(updateListener)) listener(updated);
  }
  /**
  Get the CSS classes for the currently active editor themes.
  */
  get themeClasses() {
    return (
      baseThemeID +
      " " +
      (this.state.facet(darkTheme) ? baseDarkID : baseLightID) +
      " " +
      this.state.facet(theme)
    );
  }
  updateAttrs() {
    let editorAttrs = attrsFromFacet(this, editorAttributes, {
      class: "cm-editor" + (this.hasFocus ? " cm-focused " : " ") + this.themeClasses,
    });
    let contentAttrs = {
      spellcheck: "false",
      autocorrect: "off",
      autocapitalize: "off",
      writingsuggestions: "false",
      translate: "no",
      contenteditable: !this.state.facet(editable) ? "false" : "true",
      class: "cm-content",
      style: `${browser.tabSize}: ${this.state.tabSize}`,
      role: "textbox",
      "aria-multiline": "true",
    };
    if (this.state.readOnly) contentAttrs["aria-readonly"] = "true";
    attrsFromFacet(this, contentAttributes, contentAttrs);
    let changed = this.observer.ignore(() => {
      let changedContent = updateAttrs(this.contentDOM, this.contentAttrs, contentAttrs);
      let changedEditor = updateAttrs(this.dom, this.editorAttrs, editorAttrs);
      return changedContent || changedEditor;
    });
    this.editorAttrs = editorAttrs;
    this.contentAttrs = contentAttrs;
    return changed;
  }
  showAnnouncements(trs) {
    let first2 = true;
    for (let tr2 of trs)
      for (let effect2 of tr2.effects)
        if (effect2.is(EditorView2.announce)) {
          if (first2) this.announceDOM.textContent = "";
          first2 = false;
          let div = this.announceDOM.appendChild(document.createElement("div"));
          div.textContent = effect2.value;
        }
  }
  mountStyles() {
    this.styleModules = this.state.facet(styleModule);
    let nonce = this.state.facet(EditorView2.cspNonce);
    StyleModule.mount(
      this.root,
      this.styleModules.concat(baseTheme$1$1).reverse(),
      nonce
        ? {
            nonce,
          }
        : void 0,
    );
  }
  readMeasured() {
    if (this.updateState == 2)
      throw new Error("Reading the editor layout isn't allowed during an update");
    if (this.updateState == 0 && this.measureScheduled > -1) this.measure(false);
  }
  /**
  Schedule a layout measurement, optionally providing callbacks to
  do custom DOM measuring followed by a DOM write phase. Using
  this is preferable reading DOM layout directly from, for
  example, an event handler, because it'll make sure measuring and
  drawing done by other components is synchronized, avoiding
  unnecessary DOM layout computations.
  */
  requestMeasure(request) {
    if (this.measureScheduled < 0)
      this.measureScheduled = this.win.requestAnimationFrame(() => this.measure());
    if (request) {
      if (this.measureRequests.indexOf(request) > -1) return;
      if (request.key != null)
        for (let i2 = 0; i2 < this.measureRequests.length; i2++) {
          if (this.measureRequests[i2].key === request.key) {
            this.measureRequests[i2] = request;
            return;
          }
        }
      this.measureRequests.push(request);
    }
  }
  /**
  Get the value of a specific plugin, if present. Note that
  plugins that crash can be dropped from a view, so even when you
  know you registered a given plugin, it is recommended to check
  the return value of this method.
  */
  plugin(plugin) {
    let known = this.pluginMap.get(plugin);
    if (known === void 0 || (known && known.plugin != plugin))
      this.pluginMap.set(plugin, (known = this.plugins.find((p3) => p3.plugin == plugin) || null));
    return known && known.update(this).value;
  }
  /**
  The top position of the document, in screen coordinates. This
  may be negative when the editor is scrolled down. Points
  directly to the top of the first line, not above the padding.
  */
  get documentTop() {
    return this.contentDOM.getBoundingClientRect().top + this.viewState.paddingTop;
  }
  /**
  Reports the padding above and below the document.
  */
  get documentPadding() {
    return {
      top: this.viewState.paddingTop,
      bottom: this.viewState.paddingBottom,
    };
  }
  /**
  If the editor is transformed with CSS, this provides the scale
  along the X axis. Otherwise, it will just be 1. Note that
  transforms other than translation and scaling are not supported.
  */
  get scaleX() {
    return this.viewState.scaleX;
  }
  /**
  Provide the CSS transformed scale along the Y axis.
  */
  get scaleY() {
    return this.viewState.scaleY;
  }
  /**
  Find the text line or block widget at the given vertical
  position (which is interpreted as relative to the [top of the
  document](https://codemirror.net/6/docs/ref/#view.EditorView.documentTop)).
  */
  elementAtHeight(height) {
    this.readMeasured();
    return this.viewState.elementAtHeight(height);
  }
  /**
  Find the line block (see
  [`lineBlockAt`](https://codemirror.net/6/docs/ref/#view.EditorView.lineBlockAt)) at the given
  height, again interpreted relative to the [top of the
  document](https://codemirror.net/6/docs/ref/#view.EditorView.documentTop).
  */
  lineBlockAtHeight(height) {
    this.readMeasured();
    return this.viewState.lineBlockAtHeight(height);
  }
  /**
  Get the extent and vertical position of all [line
  blocks](https://codemirror.net/6/docs/ref/#view.EditorView.lineBlockAt) in the viewport. Positions
  are relative to the [top of the
  document](https://codemirror.net/6/docs/ref/#view.EditorView.documentTop);
  */
  get viewportLineBlocks() {
    return this.viewState.viewportLines;
  }
  /**
  Find the line block around the given document position. A line
  block is a range delimited on both sides by either a
  non-[hidden](https://codemirror.net/6/docs/ref/#view.Decoration^replace) line break, or the
  start/end of the document. It will usually just hold a line of
  text, but may be broken into multiple textblocks by block
  widgets.
  */
  lineBlockAt(pos) {
    return this.viewState.lineBlockAt(pos);
  }
  /**
  The editor's total content height.
  */
  get contentHeight() {
    return this.viewState.contentHeight;
  }
  /**
  Move a cursor position by [grapheme
  cluster](https://codemirror.net/6/docs/ref/#state.findClusterBreak). `forward` determines whether
  the motion is away from the line start, or towards it. In
  bidirectional text, the line is traversed in visual order, using
  the editor's [text direction](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection).
  When the start position was the last one on the line, the
  returned position will be across the line break. If there is no
  further line, the original position is returned.
  
  By default, this method moves over a single cluster. The
  optional `by` argument can be used to move across more. It will
  be called with the first cluster as argument, and should return
  a predicate that determines, for each subsequent cluster,
  whether it should also be moved over.
  */
  moveByChar(start2, forward, by) {
    return skipAtoms(this, start2, moveByChar(this, start2, forward, by));
  }
  /**
  Move a cursor position across the next group of either
  [letters](https://codemirror.net/6/docs/ref/#state.EditorState.charCategorizer) or non-letter
  non-whitespace characters.
  */
  moveByGroup(start2, forward) {
    return skipAtoms(
      this,
      start2,
      moveByChar(this, start2, forward, (initial) => byGroup(this, start2.head, initial)),
    );
  }
  /**
  Get the cursor position visually at the start or end of a line.
  Note that this may differ from the _logical_ position at its
  start or end (which is simply at `line.from`/`line.to`) if text
  at the start or end goes against the line's base text direction.
  */
  visualLineSide(line, end2) {
    let order2 = this.bidiSpans(line),
      dir = this.textDirectionAt(line.from);
    let span = order2[end2 ? order2.length - 1 : 0];
    return EditorSelection.cursor(
      span.side(end2, dir) + line.from,
      span.forward(!end2, dir) ? 1 : -1,
    );
  }
  /**
  Move to the next line boundary in the given direction. If
  `includeWrap` is true, line wrapping is on, and there is a
  further wrap point on the current line, the wrap point will be
  returned. Otherwise this function will return the start or end
  of the line.
  */
  moveToLineBoundary(start2, forward, includeWrap = true) {
    return moveToLineBoundary(this, start2, forward, includeWrap);
  }
  /**
  Move a cursor position vertically. When `distance` isn't given,
  it defaults to moving to the next line (including wrapped
  lines). Otherwise, `distance` should provide a positive distance
  in pixels.
  
  When `start` has a
  [`goalColumn`](https://codemirror.net/6/docs/ref/#state.SelectionRange.goalColumn), the vertical
  motion will use that as a target horizontal position. Otherwise,
  the cursor's own horizontal position is used. The returned
  cursor will have its goal column set to whichever column was
  used.
  */
  moveVertically(start2, forward, distance2) {
    return skipAtoms(this, start2, moveVertically(this, start2, forward, distance2));
  }
  /**
  Find the DOM parent node and offset (child offset if `node` is
  an element, character offset when it is a text node) at the
  given document position.
  
  Note that for positions that aren't currently in
  `visibleRanges`, the resulting DOM position isn't necessarily
  meaningful (it may just point before or after a placeholder
  element).
  */
  domAtPos(pos, side = 1) {
    return this.docView.domAtPos(pos, side);
  }
  /**
  Find the document position at the given DOM node. Can be useful
  for associating positions with DOM events. Will raise an error
  when `node` isn't part of the editor content.
  */
  posAtDOM(node2, offset2 = 0) {
    return this.docView.posFromDOM(node2, offset2);
  }
  posAtCoords(coords, precise = true) {
    this.readMeasured();
    let found2 = posAtCoords(this, coords, precise);
    return found2 && found2.pos;
  }
  posAndSideAtCoords(coords, precise = true) {
    this.readMeasured();
    return posAtCoords(this, coords, precise);
  }
  /**
  Get the screen coordinates at the given document position.
  `side` determines whether the coordinates are based on the
  element before (-1) or after (1) the position (if no element is
  available on the given side, the method will transparently use
  another strategy to get reasonable coordinates).
  */
  coordsAtPos(pos, side = 1) {
    this.readMeasured();
    let line = this.state.doc.lineAt(pos),
      order2 = this.bidiSpans(line);
    let span = order2[BidiSpan.find(order2, pos - line.from, -1, side)];
    return this.docView.coordsAt(pos, side, span.dir == Direction.RTL);
  }
  /**
  Return the rectangle around a given character. If `pos` does not
  point in front of a character that is in the viewport and
  rendered (i.e. not replaced, not a line break), this will return
  null. For space characters that are a line wrap point, this will
  return the position before the line break.
  */
  coordsForChar(pos) {
    this.readMeasured();
    return this.docView.coordsForChar(pos);
  }
  /**
  The default width of a character in the editor. May not
  accurately reflect the width of all characters (given variable
  width fonts or styling of invididual ranges).
  */
  get defaultCharacterWidth() {
    return this.viewState.heightOracle.charWidth;
  }
  /**
  The default height of a line in the editor. May not be accurate
  for all lines.
  */
  get defaultLineHeight() {
    return this.viewState.heightOracle.lineHeight;
  }
  /**
  The text direction
  ([`direction`](https://developer.mozilla.org/en-US/docs/Web/CSS/direction)
  CSS property) of the editor's content element.
  */
  get textDirection() {
    return this.viewState.defaultTextDirection;
  }
  /**
  Find the text direction of the block at the given position, as
  assigned by CSS. If
  [`perLineTextDirection`](https://codemirror.net/6/docs/ref/#view.EditorView^perLineTextDirection)
  isn't enabled, or the given position is outside of the viewport,
  this will always return the same as
  [`textDirection`](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection). Note that
  this may trigger a DOM layout.
  */
  textDirectionAt(pos) {
    let perLine = this.state.facet(perLineTextDirection);
    if (!perLine || pos < this.viewport.from || pos > this.viewport.to) return this.textDirection;
    this.readMeasured();
    return this.docView.textDirectionAt(pos);
  }
  /**
  Whether this editor [wraps lines](https://codemirror.net/6/docs/ref/#view.EditorView.lineWrapping)
  (as determined by the
  [`white-space`](https://developer.mozilla.org/en-US/docs/Web/CSS/white-space)
  CSS property of its content element).
  */
  get lineWrapping() {
    return this.viewState.heightOracle.lineWrapping;
  }
  /**
  Returns the bidirectional text structure of the given line
  (which should be in the current document) as an array of span
  objects. The order of these spans matches the [text
  direction](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection)—if that is
  left-to-right, the leftmost spans come first, otherwise the
  rightmost spans come first.
  */
  bidiSpans(line) {
    if (line.length > MaxBidiLine) return trivialOrder(line.length);
    let dir = this.textDirectionAt(line.from),
      isolates;
    for (let entry of this.bidiCache) {
      if (
        entry.from == line.from &&
        entry.dir == dir &&
        (entry.fresh || isolatesEq(entry.isolates, (isolates = getIsolatedRanges(this, line))))
      )
        return entry.order;
    }
    if (!isolates) isolates = getIsolatedRanges(this, line);
    let order2 = computeOrder(line.text, dir, isolates);
    this.bidiCache.push(new CachedOrder(line.from, line.to, dir, isolates, true, order2));
    return order2;
  }
  /**
  Check whether the editor has focus.
  */
  get hasFocus() {
    var _a2;
    return (
      (this.dom.ownerDocument.hasFocus() ||
        (browser.safari &&
          ((_a2 = this.inputState) === null || _a2 === void 0 ? void 0 : _a2.lastContextMenu) >
            Date.now() - 3e4)) &&
      this.root.activeElement == this.contentDOM
    );
  }
  /**
  Put focus on the editor.
  */
  focus() {
    this.observer.ignore(() => {
      focusPreventScroll(this.contentDOM);
      this.docView.updateSelection();
    });
  }
  /**
  Update the [root](https://codemirror.net/6/docs/ref/##view.EditorViewConfig.root) in which the editor lives. This is only
  necessary when moving the editor's existing DOM to a new window or shadow root.
  */
  setRoot(root2) {
    if (this._root != root2) {
      this._root = root2;
      this.observer.setWindow(
        (root2.nodeType == 9 ? root2 : root2.ownerDocument).defaultView || window,
      );
      this.mountStyles();
    }
  }
  /**
  Clean up this editor view, removing its element from the
  document, unregistering event handlers, and notifying
  plugins. The view instance can no longer be used after
  calling this.
  */
  destroy() {
    if (this.root.activeElement == this.contentDOM) this.contentDOM.blur();
    for (let plugin of this.plugins) plugin.destroy(this);
    this.plugins = [];
    this.inputState.destroy();
    this.docView.destroy();
    this.dom.remove();
    this.observer.destroy();
    if (this.measureScheduled > -1) this.win.cancelAnimationFrame(this.measureScheduled);
    this.destroyed = true;
  }
  /**
  Returns an effect that can be
  [added](https://codemirror.net/6/docs/ref/#state.TransactionSpec.effects) to a transaction to
  cause it to scroll the given position or range into view.
  */
  static scrollIntoView(pos, options = {}) {
    var _a2, _b, _c, _d;
    return scrollIntoView.of(
      new ScrollTarget(
        typeof pos == "number" ? EditorSelection.cursor(pos) : pos,
        (_a2 = options.y) !== null && _a2 !== void 0 ? _a2 : "nearest",
        (_b = options.x) !== null && _b !== void 0 ? _b : "nearest",
        (_c = options.yMargin) !== null && _c !== void 0 ? _c : 5,
        (_d = options.xMargin) !== null && _d !== void 0 ? _d : 5,
      ),
    );
  }
  /**
  Return an effect that resets the editor to its current (at the
  time this method was called) scroll position. Note that this
  only affects the editor's own scrollable element, not parents.
  See also
  [`EditorViewConfig.scrollTo`](https://codemirror.net/6/docs/ref/#view.EditorViewConfig.scrollTo).
  
  The effect should be used with a document identical to the one
  it was created for. Failing to do so is not an error, but may
  not scroll to the expected position. You can
  [map](https://codemirror.net/6/docs/ref/#state.StateEffect.map) the effect to account for changes.
  */
  scrollSnapshot() {
    let { scrollTop, scrollLeft } = this.scrollDOM;
    let ref = this.viewState.scrollAnchorAt(scrollTop);
    return scrollIntoView.of(
      new ScrollTarget(
        EditorSelection.cursor(ref.from),
        "start",
        "start",
        ref.top - scrollTop,
        scrollLeft,
        true,
      ),
    );
  }
  /**
  Enable or disable tab-focus mode, which disables key bindings
  for Tab and Shift-Tab, letting the browser's default
  focus-changing behavior go through instead. This is useful to
  prevent trapping keyboard users in your editor.
  
  Without argument, this toggles the mode. With a boolean, it
  enables (true) or disables it (false). Given a number, it
  temporarily enables the mode until that number of milliseconds
  have passed or another non-Tab key is pressed.
  */
  setTabFocusMode(to) {
    if (to == null) this.inputState.tabFocusMode = this.inputState.tabFocusMode < 0 ? 0 : -1;
    else if (typeof to == "boolean") this.inputState.tabFocusMode = to ? 0 : -1;
    else if (this.inputState.tabFocusMode != 0) this.inputState.tabFocusMode = Date.now() + to;
  }
  /**
  Returns an extension that can be used to add DOM event handlers.
  The value should be an object mapping event names to handler
  functions. For any given event, such functions are ordered by
  extension precedence, and the first handler to return true will
  be assumed to have handled that event, and no other handlers or
  built-in behavior will be activated for it. These are registered
  on the [content element](https://codemirror.net/6/docs/ref/#view.EditorView.contentDOM), except
  for `scroll` handlers, which will be called any time the
  editor's [scroll element](https://codemirror.net/6/docs/ref/#view.EditorView.scrollDOM) or one of
  its parent nodes is scrolled.
  */
  static domEventHandlers(handlers2) {
    return ViewPlugin.define(() => ({}), {
      eventHandlers: handlers2,
    });
  }
  /**
  Create an extension that registers DOM event observers. Contrary
  to event [handlers](https://codemirror.net/6/docs/ref/#view.EditorView^domEventHandlers),
  observers can't be prevented from running by a higher-precedence
  handler returning true. They also don't prevent other handlers
  and observers from running when they return true, and should not
  call `preventDefault`.
  */
  static domEventObservers(observers2) {
    return ViewPlugin.define(() => ({}), {
      eventObservers: observers2,
    });
  }
  /**
  Create a theme extension. The first argument can be a
  [`style-mod`](https://code.haverbeke.berlin/marijn/style-mod#documentation)
  style spec providing the styles for the theme. These will be
  prefixed with a generated class for the style.
  
  Because the selectors will be prefixed with a scope class, rule
  that directly match the editor's [wrapper
  element](https://codemirror.net/6/docs/ref/#view.EditorView.dom)—to which the scope class will be
  added—need to be explicitly differentiated by adding an `&` to
  the selector for that element—for example
  `&.cm-focused`.
  
  When `dark` is set to true, the theme will be marked as dark,
  which will cause the `&dark` rules from [base
  themes](https://codemirror.net/6/docs/ref/#view.EditorView^baseTheme) to be used (as opposed to
  `&light` when a light theme is active).
  */
  static theme(spec, options) {
    let prefix = StyleModule.newName();
    let result = [theme.of(prefix), styleModule.of(buildTheme(`.${prefix}`, spec))];
    if (options && options.dark) result.push(darkTheme.of(true));
    return result;
  }
  /**
  Create an extension that adds styles to the base theme. Like
  with [`theme`](https://codemirror.net/6/docs/ref/#view.EditorView^theme), use `&` to indicate the
  place of the editor wrapper element when directly targeting
  that. You can also use `&dark` or `&light` instead to only
  target editors with a dark or light theme.
  */
  static baseTheme(spec) {
    return Prec.lowest(styleModule.of(buildTheme("." + baseThemeID, spec, lightDarkIDs)));
  }
  /**
  Retrieve an editor view instance from the view's DOM
  representation.
  */
  static findFromDOM(dom) {
    var _a2;
    let content2 = dom.querySelector(".cm-content");
    let tile = (content2 && Tile.get(content2)) || Tile.get(dom);
    return (
      ((_a2 = tile === null || tile === void 0 ? void 0 : tile.root) === null || _a2 === void 0
        ? void 0
        : _a2.view) || null
    );
  }
}
EditorView2.styleModule = styleModule;
EditorView2.inputHandler = inputHandler;
EditorView2.clipboardInputFilter = clipboardInputFilter;
EditorView2.clipboardOutputFilter = clipboardOutputFilter;
EditorView2.scrollHandler = scrollHandler;
EditorView2.focusChangeEffect = focusChangeEffect;
EditorView2.perLineTextDirection = perLineTextDirection;
EditorView2.exceptionSink = exceptionSink;
EditorView2.updateListener = updateListener;
EditorView2.editable = editable;
EditorView2.mouseSelectionStyle = mouseSelectionStyle;
EditorView2.dragMovesSelection = dragMovesSelection$1;
EditorView2.clickAddsSelectionRange = clickAddsSelectionRange;
EditorView2.decorations = decorations$1;
EditorView2.blockWrappers = blockWrappers;
EditorView2.outerDecorations = outerDecorations;
EditorView2.atomicRanges = atomicRanges;
EditorView2.bidiIsolatedRanges = bidiIsolatedRanges;
EditorView2.cursorScrollMargin = Facet.define({
  combine: (inputs) => {
    let x2 = 5,
      y4 = 5;
    for (let i2 of inputs) {
      if (typeof i2 == "number") x2 = y4 = i2;
      else ({ x: x2, y: y4 } = i2);
    }
    return {
      x: x2,
      y: y4,
    };
  },
});
EditorView2.scrollMargins = scrollMargins;
EditorView2.darkTheme = darkTheme;
EditorView2.cspNonce = Facet.define({
  combine: (values3) => (values3.length ? values3[0] : ""),
});
EditorView2.contentAttributes = contentAttributes;
EditorView2.editorAttributes = editorAttributes;
EditorView2.lineWrapping = EditorView2.contentAttributes.of({
  class: "cm-lineWrapping",
});
EditorView2.announce = StateEffect.define();
