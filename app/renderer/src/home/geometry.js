// 首页输入框与展示区的阶段进度、几何计算。基本是纯函数。
const LOGO_STAGE_END = 0.2;
const COMPOSER_STAGE_END = 0.8;
const TOOLBAR_FADE_END = 0.72;
const PROMPT_PREVIEW_START = 0.62;
const COMPACT_ACTION_INLINE_INSET_PX = 8;
const STAGE_LINEAR_BLEND = 0.2;
function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}
function clamp01(value) {
  return Math.min(1, Math.max(0, finiteOr(value, 0)));
}
function smoothStep(value) {
  const progress = clamp01(value);
  return progress * progress * (3 - 2 * progress);
}
function stageEase(value) {
  const progress = clamp01(value);
  return smoothStep(progress) * (1 - STAGE_LINEAR_BLEND) + progress * STAGE_LINEAR_BLEND;
}
function segmentProgress(value, start, end) {
  const safeStart = finiteOr(start, 0);
  const safeEnd = finiteOr(end, safeStart);
  if (safeEnd <= safeStart) return 0;
  return clamp01((finiteOr(value, 0) - safeStart) / (safeEnd - safeStart));
}
function resolveHomeComposerStageProgress(progress) {
  const normalizedProgress = clamp01(progress);
  const logoProgress = segmentProgress(normalizedProgress, 0, LOGO_STAGE_END);
  const composerProgress = segmentProgress(normalizedProgress, LOGO_STAGE_END, COMPOSER_STAGE_END);
  const gapProgress = segmentProgress(normalizedProgress, COMPOSER_STAGE_END, 1);
  let stage = "idle";
  if (normalizedProgress >= 1) stage = "compact";else if (normalizedProgress > COMPOSER_STAGE_END) stage = "gap";else if (normalizedProgress > LOGO_STAGE_END) stage = "composer";else if (normalizedProgress > 0) stage = "logo";
  return {
    progress: normalizedProgress,
    stage,
    logoProgress,
    composerProgress,
    gapProgress
  };
}
export function interpolate(from, to, progress) {
  const safeFrom = finiteOr(from, 0);
  const safeTo = finiteOr(to, safeFrom);
  return safeFrom + (safeTo - safeFrom) * clamp01(progress);
}
export function resolveHomeCompactStackGeometry({
  mainTop,
  topInset,
  logoRowHeight,
  logoScale,
  logoToComposerGap
}) {
  const logoTop = finiteOr(mainTop, 0) + Math.max(0, finiteOr(topInset, 0));
  const scaledLogoHeight = Math.max(0, finiteOr(logoRowHeight, 0)) * clamp01(finiteOr(logoScale, 1));
  const logoBottom = logoTop + scaledLogoHeight;
  return {
    logoTop,
    logoBottom,
    composerTop: logoBottom + Math.max(0, finiteOr(logoToComposerGap, 0))
  };
}
export function resolveHomeShowcaseViewportGeometry({
  mainBottom,
  compactComposerTop,
  compactComposerHeight,
  composerToShowcaseGap,
  showcaseOriginTop,
  minimumHandoffScroll,
  showcaseTracksComposer = false
}) {
  const safeMainBottom = finiteOr(mainBottom, 0);
  const compactComposerBottom = finiteOr(compactComposerTop, 0) + Math.max(0, finiteOr(compactComposerHeight, 0));
  const viewportTop = Math.min(safeMainBottom, compactComposerBottom + Math.max(0, finiteOr(composerToShowcaseGap, 0)));
  const minimumHandoff = Math.max(0, finiteOr(minimumHandoffScroll, 0));
  const handoffScroll = showcaseTracksComposer ? minimumHandoff : Math.max(minimumHandoff, finiteOr(showcaseOriginTop, viewportTop) - viewportTop);
  return {
    viewportTop,
    viewportHeight: Math.max(0, safeMainBottom - viewportTop),
    handoffScroll
  };
}
export function resolveHomeShowcaseMotionOffset({
  scrollTop,
  showcaseOriginTop,
  composerTop,
  composerHeight,
  showcaseGap
}) {
  const desiredShowcaseTop = finiteOr(composerTop, 0) + Math.max(0, finiteOr(composerHeight, 0)) + Math.max(0, finiteOr(showcaseGap, 0));
  const naturalShowcaseTop = finiteOr(showcaseOriginTop, desiredShowcaseTop) - Math.max(0, finiteOr(scrollTop, 0));
  return finiteOr(desiredShowcaseTop - naturalShowcaseTop, 0);
}
export function resolveHomeComposerProgress(scrollTop, collapseStartScroll, collapseEndScroll) {
  const safeStart = finiteOr(collapseStartScroll, 0);
  const safeEnd = finiteOr(collapseEndScroll, safeStart + 1);
  const distance = Math.max(1, safeEnd - safeStart);
  return clamp01((finiteOr(scrollTop, 0) - safeStart) / distance);
}
export function resolveHomeComposerPresentationProgress(progress, reducedMotion) {
  const normalizedProgress = clamp01(progress);
  if (!reducedMotion) return normalizedProgress;
  return normalizedProgress >= 0.5 ? 1 : 0;
}
export function resolveHomeComposerGeometry({
  progress,
  expandedWidth,
  compactWidth,
  expandedHeight,
  compactHeight,
  expandedRadius,
  compactRadius
}) {
  const safeExpandedWidth = Math.max(0, finiteOr(expandedWidth, 0));
  const safeExpandedHeight = Math.max(0, finiteOr(expandedHeight, 0));
  const safeCompactWidth = Math.min(safeExpandedWidth, Math.max(0, finiteOr(compactWidth, safeExpandedWidth)));
  const safeCompactHeight = Math.min(safeExpandedHeight, Math.max(0, finiteOr(compactHeight, safeExpandedHeight)));
  const safeExpandedRadius = Math.max(0, finiteOr(expandedRadius, 0));
  const safeCompactRadius = Math.max(safeExpandedRadius, finiteOr(compactRadius, safeExpandedRadius));
  const stageProgress = resolveHomeComposerStageProgress(progress);
  const logoProgress = stageEase(stageProgress.logoProgress);
  const composerProgress = stageEase(stageProgress.composerProgress);
  const showcaseGapProgress = stageEase(stageProgress.gapProgress);
  const verticalCompact = stageProgress.composerProgress >= 1;
  const toolbarOpacity = 1 - smoothStep(stageProgress.composerProgress / TOOLBAR_FADE_END);
  const promptPreviewOpacity = smoothStep(segmentProgress(stageProgress.composerProgress, PROMPT_PREVIEW_START, 1));
  return {
    progress: stageProgress.progress,
    stage: stageProgress.stage,
    visualProgress: composerProgress,
    logoProgress,
    composerProgress,
    showcaseGapProgress,
    width: interpolate(safeExpandedWidth, safeCompactWidth, composerProgress),
    height: verticalCompact ? safeCompactHeight : safeExpandedHeight,
    radius: interpolate(safeExpandedRadius, safeCompactRadius, composerProgress),
    toolbarOpacity,
    liveEditorOpacity: 1 - promptPreviewOpacity,
    promptPreviewOpacity,
    actionInlineInset: interpolate(0, COMPACT_ACTION_INLINE_INSET_PX, composerProgress),
    editorInset: interpolate(0, 44, composerProgress),
    editorTop: verticalCompact ? 8 : 0,
    editorMinHeight: verticalCompact ? 20 : 90,
    editorMaxHeight: verticalCompact ? 20 : 200,
    logoScale: interpolate(1, 0.7, logoProgress),
    auxiliaryOpacity: 1 - logoProgress
  };
}
export const COMPACT_HEIGHT_PX = 64;
export const COMPACT_MAX_WIDTH_PX = 648;
export const COMPACT_VIEWPORT_INSET_PX = 24;
export const LOGO_SAFE_TOP_INSET_PX = 88;
export const COMPACT_LOGO_SCALE = 0.7;
export const LOGO_TO_COMPOSER_GAP_PX = 16;
export const COLLAPSE_SCROLL_DISTANCE_PX = 220;
export const COMPACT_SHOWCASE_GAP_RATIO = 0.5;
export const EXPANDED_RADIUS_PX = 20;
export const COMPACT_RADIUS_PX = 32;
export const MOTION_EPSILON = 1e-3;
export const SCROLL_HANDOFF_TOLERANCE_PX = 1;
export const WHEEL_LINE_HEIGHT_PX = 16;
export const WHEEL_HANDOFF_DETENT_MS = 110;
export const WHEEL_GESTURE_IDLE_MS = 140;
