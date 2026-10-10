// 首页输入框随滚动与滚轮变化的动效 hook。
import { reactExports } from "../vendor.js";
import { COLLAPSE_SCROLL_DISTANCE_PX, COMPACT_HEIGHT_PX, COMPACT_LOGO_SCALE, COMPACT_MAX_WIDTH_PX, COMPACT_RADIUS_PX, COMPACT_SHOWCASE_GAP_RATIO, COMPACT_VIEWPORT_INSET_PX, EXPANDED_RADIUS_PX, LOGO_SAFE_TOP_INSET_PX, LOGO_TO_COMPOSER_GAP_PX, MOTION_EPSILON, SCROLL_HANDOFF_TOLERANCE_PX, WHEEL_GESTURE_IDLE_MS, WHEEL_HANDOFF_DETENT_MS, WHEEL_LINE_HEIGHT_PX, interpolate, resolveHomeCompactStackGeometry, resolveHomeComposerGeometry, resolveHomeComposerPresentationProgress, resolveHomeComposerProgress, resolveHomeShowcaseMotionOffset, resolveHomeShowcaseViewportGeometry } from "./geometry.js";
import { REDUCED_MOTION_QUERY, setDatasetValue, toPixels } from "./motion-utils.js";
const INITIAL_METRICS = {
  originTop: 0,
  collapseStartScroll: 0,
  collapseEndScroll: 1,
  expandedWidth: 0,
  compactWidth: 0,
  expandedHeight: 150,
  expandedBrandGap: 0,
  logoPinTop: 0,
  logoRowHeight: 0,
  showcaseOriginTop: 0,
  expandedShowcaseGap: 0,
  compactShowcaseGap: 0,
  showcaseHandoffScroll: 0
};
export function useHomeComposerMotion() {
  const scrollContainerRef = reactExports.useRef(null);
  const composerAnchorRef = reactExports.useRef(null);
  const composerLayerRef = reactExports.useRef(null);
  reactExports.useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const composerAnchor = composerAnchorRef.current;
    const composerLayer = composerLayerRef.current;
    const inputRoot = composerLayer?.querySelector('[data-message-input-root="true"]');
    if (!scrollContainer || !composerAnchor || !composerLayer || !inputRoot) return;
    const editorSurface = inputRoot.querySelector(".message-input-editor");
    const livePromptEditor = editorSurface?.querySelector(".ProseMirror");
    const actionRow = inputRoot.querySelector('[data-composer-action-row="true"]');
    const rightActions = actionRow?.querySelector('[data-composer-actions-right="true"]');
    const showcaseViewport = scrollContainer.querySelector(".home-below-anchor");
    if (!showcaseViewport) return;
    const heroEntrance = composerAnchor.closest(".home-fade-up");
    const brandPlaceholder = heroEntrance?.querySelector(".home-hero-title-row-placeholder");
    const brandLayer = composerLayer.querySelector(".home-hero-brand-motion-layer");
    const titleRow = brandLayer?.querySelector(".home-hero-title-row");
    if (!brandPlaceholder || !brandLayer || !titleRow) return;
    const heroAnnouncement = heroEntrance?.querySelector(".home-hero-announcement");
    const heroSubtitle = heroEntrance?.querySelector(".home-hero-subtitle");
    const stickyBackdrop = scrollContainer.querySelector(".home-composer-sticky-backdrop");
    const promotion = composerLayer.querySelector(".home-composer-promotion");
    let metrics = INITIAL_METRICS;
    let attachmentPreviewHeight = 0;
    let animationFrame = null;
    let measurementPending = false;
    let intrinsicMeasurementPending = false;
    let showcaseMotionOffset = 0;
    let promptFirstLineAnchored = false;
    let composerReactivating = false;
    let wheelHandoffHeldDirection = null;
    let wheelHandoffIdleTimer = null;
    let wheelGestureOwner = null;
    let wheelGestureIdleTimer = null;
    const reducedMotionQuery = typeof window.matchMedia === "function" ? window.matchMedia(REDUCED_MOTION_QUERY) : null;
    let reducedMotion = reducedMotionQuery?.matches ?? false;
    const readAttachmentPreviewHeight = () => {
      const preview = inputRoot.querySelector('[data-message-input-attachment-preview="true"]');
      return preview?.getBoundingClientRect().height ?? 0;
    };
    const measureExpandedHeightAtRest = () => {
      const measurementRoot = inputRoot.cloneNode(true);
      measurementRoot.removeAttribute("data-message-input-root");
      measurementRoot.setAttribute("aria-hidden", "true");
      measurementRoot.setAttribute("inert", "");
      measurementRoot.dataset.actionsCompact = "false";
      measurementRoot.style.position = "fixed";
      measurementRoot.style.inset = "auto auto 0 -100000px";
      measurementRoot.style.width = toPixels(metrics.expandedWidth);
      measurementRoot.style.height = "auto";
      measurementRoot.style.visibility = "hidden";
      measurementRoot.style.pointerEvents = "none";
      measurementRoot.style.removeProperty("--home-composer-min-height");
      measurementRoot.style.removeProperty("--home-composer-radius");
      measurementRoot.style.removeProperty("--home-composer-toolbar-opacity");
      measurementRoot.style.removeProperty("--home-composer-editor-inset");
      measurementRoot.style.removeProperty("--home-composer-actions-right-width");
      measurementRoot.style.removeProperty("--home-composer-editor-top");
      measurementRoot.style.removeProperty("--home-composer-editor-bottom");
      measurementRoot.style.removeProperty("--home-composer-action-bottom");
      measurementRoot.style.removeProperty("--home-composer-attachment-offset");
      measurementRoot.style.removeProperty("--home-composer-editor-min-height");
      measurementRoot.style.removeProperty("--home-composer-editor-max-height");
      measurementRoot.style.removeProperty("--home-composer-live-editor-opacity");
      measurementRoot.style.removeProperty("--home-composer-prompt-preview-opacity");
      measurementRoot.style.removeProperty("--home-composer-progress");
      for (const element of measurementRoot.querySelectorAll("[id]")) {
        element.removeAttribute("id");
      }
      scrollContainer.appendChild(measurementRoot);
      const expandedHeight = measurementRoot.getBoundingClientRect().height;
      measurementRoot.remove();
      return Math.max(COMPACT_HEIGHT_PX, expandedHeight);
    };
    const readMetrics = measureNaturalHeight => {
      const preserveShowcaseHandoff = scrollContainer.dataset.homeShowcaseScrollActive === "true";
      const mainRect = scrollContainer.getBoundingClientRect();
      let anchorRect = composerAnchor.getBoundingClientRect();
      const expandedWidth = Math.max(0, anchorRect.width);
      composerLayer.style.width = toPixels(expandedWidth);
      composerLayer.style.left = toPixels(anchorRect.left + expandedWidth / 2);
      let expandedHeight = metrics.expandedHeight;
      if (measureNaturalHeight) {
        inputRoot.style.removeProperty("height");
        inputRoot.style.removeProperty("--home-composer-min-height");
        expandedHeight = Math.max(COMPACT_HEIGHT_PX, inputRoot.getBoundingClientRect().height);
        attachmentPreviewHeight = readAttachmentPreviewHeight();
        composerAnchor.style.height = toPixels(expandedHeight);
        anchorRect = composerAnchor.getBoundingClientRect();
      }
      const brandRowHeight = Math.max(0, titleRow.offsetHeight);
      const compactStack = resolveHomeCompactStackGeometry({
        mainTop: mainRect.top,
        topInset: LOGO_SAFE_TOP_INSET_PX,
        logoRowHeight: brandRowHeight,
        logoScale: COMPACT_LOGO_SCALE,
        logoToComposerGap: LOGO_TO_COMPOSER_GAP_PX
      });
      const expandedBrandGap = Math.max(LOGO_TO_COMPOSER_GAP_PX, anchorRect.top - brandPlaceholder.getBoundingClientRect().bottom);
      const stickyTop = compactStack.composerTop;
      const originTop = anchorRect.top + scrollContainer.scrollTop;
      const logoPinTop = compactStack.logoTop;
      const logoOriginTop = brandPlaceholder.getBoundingClientRect().top + scrollContainer.scrollTop;
      const collapseStartScroll = Math.max(0, logoOriginTop - logoPinTop);
      const collapseEndScroll = collapseStartScroll + COLLAPSE_SCROLL_DISTANCE_PX;
      const availableCompactWidth = Math.max(0, mainRect.width - COMPACT_VIEWPORT_INSET_PX * 2);
      const showcaseOriginTop = showcaseViewport.getBoundingClientRect().top + scrollContainer.scrollTop - showcaseMotionOffset;
      const expandedShowcaseGap = Math.max(0, showcaseOriginTop - (originTop + expandedHeight));
      const compactShowcaseGap = expandedShowcaseGap * COMPACT_SHOWCASE_GAP_RATIO;
      const showcaseLayout = resolveHomeShowcaseViewportGeometry({
        mainBottom: mainRect.bottom,
        compactComposerTop: stickyTop,
        compactComposerHeight: COMPACT_HEIGHT_PX,
        composerToShowcaseGap: compactShowcaseGap,
        showcaseOriginTop,
        minimumHandoffScroll: collapseEndScroll,
        showcaseTracksComposer: true
      });
      showcaseViewport.style.height = toPixels(showcaseLayout.viewportHeight);
      scrollContainer.style.setProperty("--home-composer-sticky-backdrop-height", toPixels(showcaseLayout.viewportTop - mainRect.top));
      scrollContainer.style.setProperty("--home-showcase-grid-background-offset-y", toPixels(mainRect.top - showcaseLayout.viewportTop));
      scrollContainer.style.setProperty("--home-composer-scroll-runway", toPixels(showcaseLayout.handoffScroll));
      metrics = {
        originTop,
        collapseStartScroll,
        collapseEndScroll,
        expandedWidth: anchorRect.width,
        compactWidth: Math.min(anchorRect.width, COMPACT_MAX_WIDTH_PX, availableCompactWidth),
        expandedHeight,
        expandedBrandGap,
        logoPinTop,
        logoRowHeight: brandRowHeight,
        showcaseOriginTop,
        expandedShowcaseGap,
        compactShowcaseGap,
        showcaseHandoffScroll: showcaseLayout.handoffScroll
      };
      if (preserveShowcaseHandoff) {
        scrollContainer.scrollTop = showcaseLayout.handoffScroll;
      }
    };
    const resolveProgress = scrollTop => resolveHomeComposerProgress(scrollTop, metrics.collapseStartScroll, metrics.collapseEndScroll);
    const measureIntrinsicExpandedHeight = () => {
      attachmentPreviewHeight = readAttachmentPreviewHeight();
      const nextExpandedHeight = measureExpandedHeightAtRest();
      if (Math.abs(nextExpandedHeight - metrics.expandedHeight) <= 0.5) return;
      metrics = {
        ...metrics,
        expandedHeight: nextExpandedHeight
      };
      composerAnchor.style.height = toPixels(nextExpandedHeight);
      readMetrics(false);
    };
    const applyMotion = () => {
      const scrollTop = scrollContainer.scrollTop;
      const presentationProgress = resolveHomeComposerPresentationProgress(resolveProgress(scrollTop), reducedMotion);
      const geometry = resolveHomeComposerGeometry({
        progress: presentationProgress,
        expandedWidth: metrics.expandedWidth,
        compactWidth: metrics.compactWidth,
        expandedHeight: metrics.expandedHeight,
        compactHeight: COMPACT_HEIGHT_PX,
        expandedRadius: EXPANDED_RADIUS_PX,
        compactRadius: COMPACT_RADIUS_PX
      });
      const naturalTop = metrics.originTop - scrollTop;
      const brandGap = interpolate(metrics.expandedBrandGap, LOGO_TO_COMPOSER_GAP_PX, geometry.composerProgress);
      const pinnedTop = metrics.logoPinTop + metrics.logoRowHeight * geometry.logoScale + brandGap;
      const top = scrollTop <= metrics.collapseStartScroll ? naturalTop : pinnedTop;
      const showcaseGap = interpolate(metrics.expandedShowcaseGap, metrics.compactShowcaseGap, geometry.showcaseGapProgress);
      const motionActive = geometry.progress > MOTION_EPSILON;
      const compact = geometry.progress >= 1 - MOTION_EPSILON;
      const controlsHidden = geometry.toolbarOpacity <= 0.01;
      const liveEditorHidden = geometry.liveEditorOpacity <= 0.01;
      const attachmentOffset = attachmentPreviewHeight * geometry.toolbarOpacity;
      showcaseMotionOffset = resolveHomeShowcaseMotionOffset({
        scrollTop,
        showcaseOriginTop: metrics.showcaseOriginTop,
        composerTop: top,
        composerHeight: geometry.height,
        showcaseGap
      });
      const showcaseScrollActive = scrollTop >= metrics.showcaseHandoffScroll - SCROLL_HANDOFF_TOLERANCE_PX;
      if (!showcaseScrollActive && scrollTop <= SCROLL_HANDOFF_TOLERANCE_PX && showcaseViewport.scrollTop !== 0) {
        showcaseViewport.scrollTop = 0;
      }
      if (!composerReactivating && liveEditorHidden && livePromptEditor) {
        promptFirstLineAnchored = true;
        livePromptEditor.scrollTop = 0;
      } else if (composerReactivating && !liveEditorHidden) {
        composerReactivating = false;
      }
      if (promptFirstLineAnchored && motionActive && livePromptEditor) {
        livePromptEditor.scrollTop = 0;
      }
      composerLayer.style.translate = `-50% ${toPixels(top)}`;
      composerLayer.style.width = toPixels(geometry.width);
      showcaseViewport.style.translate = `-50% ${toPixels(showcaseMotionOffset)}`;
      brandLayer.style.translate = `-50% ${toPixels(-brandGap)}`;
      brandLayer.style.scale = String(geometry.logoScale);
      if (heroAnnouncement) heroAnnouncement.style.opacity = String(geometry.auxiliaryOpacity);
      if (heroSubtitle) heroSubtitle.style.opacity = String(geometry.auxiliaryOpacity);
      if (stickyBackdrop) stickyBackdrop.style.opacity = String(1 - geometry.auxiliaryOpacity);
      if (promotion) promotion.style.opacity = String(geometry.auxiliaryOpacity);
      if (actionRow) actionRow.style.insetInline = toPixels(geometry.actionInlineInset);
      setDatasetValue(composerLayer, "homeComposerReady", "true");
      setDatasetValue(composerLayer, "motion", motionActive ? "true" : "false");
      setDatasetValue(composerLayer, "homeComposerStage", geometry.stage);
      setDatasetValue(composerLayer, "homeComposerCompact", compact ? "true" : "false");
      setDatasetValue(composerLayer, "homeComposerControlsHidden", controlsHidden ? "true" : "false");
      setDatasetValue(scrollContainer, "homeComposerMotion", motionActive ? "true" : "false");
      setDatasetValue(scrollContainer, "homeComposerCompact", compact ? "true" : "false");
      setDatasetValue(scrollContainer, "homeShowcaseScrollActive", showcaseScrollActive ? "true" : "false");
      inputRoot.style.setProperty("--home-composer-radius", toPixels(geometry.radius));
      inputRoot.style.setProperty("--home-composer-toolbar-opacity", String(geometry.toolbarOpacity));
      inputRoot.style.setProperty("--home-composer-editor-inset", toPixels(geometry.editorInset));
      inputRoot.style.setProperty("--home-composer-editor-top", toPixels(geometry.editorTop));
      inputRoot.style.setProperty("--home-composer-editor-bottom", toPixels(32 - 24 * geometry.visualProgress));
      inputRoot.style.setProperty("--home-composer-action-bottom", toPixels(8 * geometry.visualProgress));
      inputRoot.style.setProperty("--home-composer-attachment-offset", toPixels(attachmentOffset));
      inputRoot.style.setProperty("--home-composer-editor-min-height", toPixels(geometry.editorMinHeight));
      inputRoot.style.setProperty("--home-composer-editor-max-height", toPixels(geometry.editorMaxHeight));
      inputRoot.style.setProperty("--home-composer-live-editor-opacity", String(geometry.liveEditorOpacity));
      inputRoot.style.setProperty("--home-composer-prompt-preview-opacity", String(geometry.promptPreviewOpacity));
      inputRoot.style.setProperty("--home-composer-progress", String(geometry.visualProgress));
      if (motionActive) {
        inputRoot.style.height = toPixels(geometry.height);
        inputRoot.style.setProperty("--home-composer-min-height", "0px");
      } else {
        inputRoot.style.removeProperty("height");
        inputRoot.style.removeProperty("--home-composer-min-height");
        promptFirstLineAnchored = false;
        composerReactivating = false;
      }
    };
    const scheduleFrame = () => {
      if (animationFrame !== null) return;
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        const scrollTop = scrollContainer.scrollTop;
        if (measurementPending) {
          readMetrics(resolveProgress(scrollTop) <= MOTION_EPSILON);
          measurementPending = false;
        }
        if (intrinsicMeasurementPending) {
          if (resolveProgress(scrollContainer.scrollTop) > MOTION_EPSILON) {
            measureIntrinsicExpandedHeight();
          }
          intrinsicMeasurementPending = false;
        }
        applyMotion();
      });
    };
    const commitOuterWheelScroll = scrollTop => {
      scrollContainer.scrollTop = scrollTop;
      applyMotion();
      scheduleFrame();
    };
    const handleScroll = () => {
      if (scrollContainer.scrollTop > metrics.showcaseHandoffScroll) {
        scrollContainer.scrollTop = metrics.showcaseHandoffScroll;
      }
      scheduleFrame();
    };
    const canElementScroll = (element, deltaY) => {
      const maxScroll = element.scrollHeight - element.clientHeight;
      return deltaY > 0 && element.scrollTop < maxScroll || deltaY < 0 && element.scrollTop > 0;
    };
    const resolveNestedWheelDisposition = (target, deltaY) => {
      if (target instanceof Node && livePromptEditor?.contains(target)) {
        if (composerLayer.dataset.motion === "true") return "home";
        return canElementScroll(livePromptEditor, deltaY) ? "native" : "contain";
      }
      const targetElement = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
      const localScroller = targetElement?.closest('[data-home-wheel-scrollable="true"]');
      if (!localScroller || localScroller === showcaseViewport) return "home";
      const overflowY = window.getComputedStyle(localScroller).overflowY;
      const hasScrollableOverflow = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
      return hasScrollableOverflow && canElementScroll(localScroller, deltaY) ? "native" : "home";
    };
    const clearWheelHandoffHold = () => {
      wheelHandoffHeldDirection = null;
      if (wheelHandoffIdleTimer === null) return;
      window.clearTimeout(wheelHandoffIdleTimer);
      wheelHandoffIdleTimer = null;
    };
    const beginWheelHandoffDetent = direction => {
      if (wheelHandoffHeldDirection === direction && wheelHandoffIdleTimer !== null) return;
      clearWheelHandoffHold();
      wheelHandoffHeldDirection = direction;
      wheelHandoffIdleTimer = window.setTimeout(() => {
        wheelHandoffHeldDirection = null;
        wheelHandoffIdleTimer = null;
      }, WHEEL_HANDOFF_DETENT_MS);
    };
    const clearWheelGestureOwner = () => {
      wheelGestureOwner = null;
      delete scrollContainer.dataset.homeWheelActive;
      if (wheelGestureIdleTimer === null) return;
      window.clearTimeout(wheelGestureIdleTimer);
      wheelGestureIdleTimer = null;
    };
    const holdWheelGestureOwnerUntilIdle = owner => {
      wheelGestureOwner = owner;
      setDatasetValue(scrollContainer, "homeWheelActive", "true");
      if (wheelGestureIdleTimer !== null) window.clearTimeout(wheelGestureIdleTimer);
      wheelGestureIdleTimer = window.setTimeout(() => {
        wheelGestureOwner = null;
        wheelGestureIdleTimer = null;
        delete scrollContainer.dataset.homeWheelActive;
      }, WHEEL_GESTURE_IDLE_MS);
    };
    const handleWheel = event => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const deltaScale = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? WHEEL_LINE_HEIGHT_PX : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? scrollContainer.clientHeight : 1;
      const deltaY = event.deltaY * deltaScale;
      if (deltaY === 0) return;
      const targetElement = event.target instanceof Element ? event.target : event.target instanceof Node ? event.target.parentElement : null;
      const explicitLocalScroller = targetElement?.closest('[data-home-wheel-scrollable="true"]');
      const detectedWheelDisposition = resolveNestedWheelDisposition(event.target, deltaY);
      if (explicitLocalScroller && detectedWheelDisposition === "native") return;
      const detectedOwner = detectedWheelDisposition === "home" ? "home" : "nested";
      const activeOwner = wheelGestureOwner ?? detectedOwner;
      holdWheelGestureOwnerUntilIdle(activeOwner);
      const nestedWheelDisposition = activeOwner === "home" ? "home" : detectedWheelDisposition === "home" ? "contain" : detectedWheelDisposition;
      if (nestedWheelDisposition === "native") return;
      if (nestedWheelDisposition === "contain") {
        event.preventDefault();
        clearWheelHandoffHold();
        return;
      }
      const wheelDirection = deltaY > 0 ? 1 : -1;
      if (wheelHandoffHeldDirection !== null) {
        if (wheelHandoffHeldDirection === wheelDirection) {
          event.preventDefault();
          return;
        }
        clearWheelHandoffHold();
      }
      if (deltaY > 0) {
        const canMoveOuter = scrollContainer.scrollTop < metrics.showcaseHandoffScroll - SCROLL_HANDOFF_TOLERANCE_PX;
        if (canMoveOuter) {
          event.preventDefault();
          const nextOuterScroll = Math.min(metrics.showcaseHandoffScroll, scrollContainer.scrollTop + deltaY);
          const reachedHandoff = nextOuterScroll >= metrics.showcaseHandoffScroll - SCROLL_HANDOFF_TOLERANCE_PX;
          commitOuterWheelScroll(reachedHandoff ? metrics.showcaseHandoffScroll : nextOuterScroll);
          if (reachedHandoff) beginWheelHandoffDetent(1);
          return;
        }
        const innerMaxScroll = Math.max(0, showcaseViewport.scrollHeight - showcaseViewport.clientHeight);
        if (showcaseViewport.scrollTop >= innerMaxScroll) return;
        event.preventDefault();
        if (scrollContainer.scrollTop !== metrics.showcaseHandoffScroll) {
          commitOuterWheelScroll(metrics.showcaseHandoffScroll);
        }
        showcaseViewport.scrollTop = Math.min(innerMaxScroll, showcaseViewport.scrollTop + deltaY);
        return;
      }
      if (showcaseViewport.scrollTop <= 0 && scrollContainer.scrollTop <= 0) return;
      event.preventDefault();
      if (showcaseViewport.scrollTop > 0) {
        const nextInnerScroll = Math.max(0, showcaseViewport.scrollTop + deltaY);
        const reachedHandoff = nextInnerScroll <= SCROLL_HANDOFF_TOLERANCE_PX;
        showcaseViewport.scrollTop = reachedHandoff ? 0 : nextInnerScroll;
        if (reachedHandoff) beginWheelHandoffDetent(-1);
        scheduleFrame();
        return;
      }
      commitOuterWheelScroll(Math.max(0, scrollContainer.scrollTop + deltaY));
    };
    const handleReducedMotionChange = event => {
      reducedMotion = event.matches;
      scheduleFrame();
    };
    const handleIntrinsicContentChange = () => {
      if (resolveProgress(scrollContainer.scrollTop) <= MOTION_EPSILON) return;
      intrinsicMeasurementPending = true;
      scheduleFrame();
    };
    const handleHeroEntranceEnd = event => {
      if (event.animationName !== "home-fade-up") return;
      measurementPending = true;
      scheduleFrame();
    };
    const handleWindowResize = () => {
      measurementPending = true;
      scheduleFrame();
    };
    const handleComposerReactivate = () => {
      clearWheelHandoffHold();
      clearWheelGestureOwner();
      promptFirstLineAnchored = false;
      composerReactivating = true;
      if (resolveProgress(scrollContainer.scrollTop) <= MOTION_EPSILON) {
        composerReactivating = false;
        return;
      }
      showcaseViewport.scrollTop = 0;
      scrollContainer.scrollTo({
        top: 0,
        behavior: reducedMotion ? "auto" : "smooth"
      });
      scheduleFrame();
    };
    const updateRightActionsWidth = () => {
      inputRoot.style.setProperty("--home-composer-actions-right-width", toPixels(rightActions?.getBoundingClientRect().width ?? 0));
    };
    updateRightActionsWidth();
    readMetrics(true);
    applyMotion();
    scrollContainer.addEventListener("scroll", handleScroll, {
      passive: true
    });
    scrollContainer.addEventListener("wheel", handleWheel, {
      passive: false
    });
    inputRoot.addEventListener("input", handleIntrinsicContentChange);
    editorSurface?.addEventListener("focusin", handleComposerReactivate);
    editorSurface?.addEventListener("pointerdown", handleComposerReactivate);
    editorSurface?.addEventListener("beforeinput", handleComposerReactivate);
    editorSurface?.addEventListener("compositionstart", handleComposerReactivate);
    heroEntrance?.addEventListener("animationend", handleHeroEntranceEnd);
    window.addEventListener("resize", handleWindowResize);
    reducedMotionQuery?.addEventListener("change", handleReducedMotionChange);
    const layoutObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      measurementPending = true;
      scheduleFrame();
    });
    layoutObserver?.observe(scrollContainer);
    layoutObserver?.observe(composerAnchor);
    if (heroEntrance) layoutObserver?.observe(heroEntrance);
    const inputObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      if (resolveProgress(scrollContainer.scrollTop) > MOTION_EPSILON) return;
      measurementPending = true;
      scheduleFrame();
    });
    inputObserver?.observe(inputRoot);
    const rightActionsObserver = rightActions && typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateRightActionsWidth) : null;
    if (rightActions) rightActionsObserver?.observe(rightActions);
    const contentObserver = new MutationObserver(handleIntrinsicContentChange);
    contentObserver.observe(inputRoot, {
      childList: true,
      subtree: true
    });
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      scrollContainer.removeEventListener("wheel", handleWheel);
      inputRoot.removeEventListener("input", handleIntrinsicContentChange);
      editorSurface?.removeEventListener("focusin", handleComposerReactivate);
      editorSurface?.removeEventListener("pointerdown", handleComposerReactivate);
      editorSurface?.removeEventListener("beforeinput", handleComposerReactivate);
      editorSurface?.removeEventListener("compositionstart", handleComposerReactivate);
      heroEntrance?.removeEventListener("animationend", handleHeroEntranceEnd);
      window.removeEventListener("resize", handleWindowResize);
      reducedMotionQuery?.removeEventListener("change", handleReducedMotionChange);
      layoutObserver?.disconnect();
      inputObserver?.disconnect();
      rightActionsObserver?.disconnect();
      contentObserver.disconnect();
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      clearWheelHandoffHold();
      clearWheelGestureOwner();
      composerAnchor.style.removeProperty("height");
      composerLayer.style.removeProperty("top");
      composerLayer.style.removeProperty("left");
      composerLayer.style.removeProperty("width");
      composerLayer.style.removeProperty("translate");
      composerLayer.style.removeProperty("--home-hero-brand-scale");
      composerLayer.style.removeProperty("--home-hero-brand-gap");
      brandLayer.style.removeProperty("translate");
      brandLayer.style.removeProperty("scale");
      heroAnnouncement?.style.removeProperty("opacity");
      heroSubtitle?.style.removeProperty("opacity");
      stickyBackdrop?.style.removeProperty("opacity");
      promotion?.style.removeProperty("opacity");
      actionRow?.style.removeProperty("inset-inline");
      delete composerLayer.dataset.homeComposerReady;
      delete composerLayer.dataset.motion;
      delete composerLayer.dataset.homeComposerStage;
      delete composerLayer.dataset.homeComposerCompact;
      delete composerLayer.dataset.homeComposerControlsHidden;
      delete scrollContainer.dataset.homeComposerMotion;
      delete scrollContainer.dataset.homeComposerCompact;
      delete scrollContainer.dataset.homeShowcaseScrollActive;
      inputRoot.style.removeProperty("height");
      inputRoot.style.removeProperty("--home-composer-min-height");
      inputRoot.style.removeProperty("--home-composer-radius");
      inputRoot.style.removeProperty("--home-composer-toolbar-opacity");
      inputRoot.style.removeProperty("--home-composer-editor-inset");
      inputRoot.style.removeProperty("--home-composer-actions-right-width");
      inputRoot.style.removeProperty("--home-composer-editor-top");
      inputRoot.style.removeProperty("--home-composer-editor-bottom");
      inputRoot.style.removeProperty("--home-composer-action-bottom");
      inputRoot.style.removeProperty("--home-composer-attachment-offset");
      inputRoot.style.removeProperty("--home-composer-editor-min-height");
      inputRoot.style.removeProperty("--home-composer-editor-max-height");
      inputRoot.style.removeProperty("--home-composer-live-editor-opacity");
      inputRoot.style.removeProperty("--home-composer-prompt-preview-opacity");
      inputRoot.style.removeProperty("--home-composer-progress");
      scrollContainer.style.removeProperty("--home-composer-scroll-progress");
      scrollContainer.style.removeProperty("--home-composer-scroll-runway");
      scrollContainer.style.removeProperty("--home-composer-sticky-backdrop-height");
      scrollContainer.style.removeProperty("--home-hero-auxiliary-opacity");
      showcaseViewport.style.removeProperty("height");
      showcaseViewport.style.removeProperty("--home-showcase-motion-offset");
      showcaseViewport.style.removeProperty("translate");
    };
  }, []);
  return {
    scrollContainerRef,
    composerAnchorRef,
    composerLayerRef
  };
}
