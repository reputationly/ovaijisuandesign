// 首页输入框的新手引导（coach mark）。
import { useTranslation, useStorage, reactExports, jsxRuntimeExports } from "../vendor.js";
import { useAssetCenterRelocation, resolveSeenRevision, HOME_INPUT_COACH_MARK_ID } from "../assets/wrap-as-asset-center-error.js";
import { useHasBlockingModal, useModalSlot, STARTUP_MODAL_IDS } from "../infra/schedule.js";
import { CDN_COACHMARK_HOME_AT, CDN_COACHMARK_HOME_SLASH } from "../workspace/topbar-state-context.jsx";
import { useCoachMarkSequence } from "../assets/use-coach-mark-sequence.js";
import { CoachMarkPopup } from "../workspace/coach-mark-popup.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useSampleProject } from "./sample-project.js";
const MARK_ID = HOME_INPUT_COACH_MARK_ID;
const PROJECT_LIBRARY_REVISION = 2;
const PROJECTS_NAV_SELECTOR = '[data-action-ui-id="home-sidebar-nav-projects-coachmark-anchor"]';
export function HomeInputCoachMarks({
  modelButtonRef,
  skillButtonRef,
  workspaceButtonRef
}) {
  const {
    t
  } = useTranslation();
  const [config,,, configHydrated] = useStorage("global.config");
  const [dismissedMarks,,, dismissedHydrated] = useStorage("global.dismissedCoachMarks");
  const relocation = useAssetCenterRelocation();
  const {
    openSampleProject
  } = useSampleProject();
  const hasBlockingModal = useHasBlockingModal();
  const projectsNavRef = reactExports.useRef(null);
  const [ctaLoading, setCtaLoading] = reactExports.useState(false);
  const steps = [{
    kind: "onboarding",
    revision: 1,
    anchorRef: skillButtonRef,
    titleKey: "coachMark.home.atKey.title",
    titleFallback: "使用「@」键",
    descKey: "coachMark.home.atKey.desc",
    descFallback: "想引用具体某张图或某个文件？输入 @ 直接挑——文件、素材都能选",
    ctaKey: "coachMark.next",
    ctaFallback: "下一步",
    mediaUrl: CDN_COACHMARK_HOME_AT
  }, {
    kind: "onboarding",
    revision: 1,
    anchorRef: skillButtonRef,
    titleKey: "coachMark.home.slashKey.title",
    titleFallback: "使用「/」键",
    descKey: "coachMark.home.slashKey.desc",
    descFallback: "需要专属 Skill 帮忙",
    ctaKey: "coachMark.next",
    ctaFallback: "下一步",
    mediaUrl: CDN_COACHMARK_HOME_SLASH
  }];
  const maxRevision = Math.max(...steps.map(step => step.revision ?? 1));
  const tourPending = relocation.ready && !relocation.hasAssetData && dismissedHydrated && resolveSeenRevision(dismissedMarks, MARK_ID) < maxRevision;
  const configReady = configHydrated;
  const granted = useModalSlot(STARTUP_MODAL_IDS.homeCoachMarks, {
    candidate: configReady && tourPending
  });
  const sequence = useCoachMarkSequence(MARK_ID, steps, granted && !hasBlockingModal);
  const step = sequence.isOpen ? sequence.visibleSteps[sequence.index] : void 0;
  const [anchorEl, setAnchorEl] = reactExports.useState(null);
  reactExports.useLayoutEffect(() => {
    projectsNavRef.current = document.querySelector(PROJECTS_NAV_SELECTOR);
    setAnchorEl(step?.anchorRef.current ?? null);
  });
  if (!step) return null;
  const handleDismiss = method => {
    if (method !== "button") {
      if (!ctaLoading) sequence.dismiss(method);
      return;
    }
    if (step.kind !== "project-library") {
      sequence.next();
      return;
    }
    if (ctaLoading) return;
    setCtaLoading(true);
    void sequence.persistSeen(step.revision ?? PROJECT_LIBRARY_REVISION).then(() => openSampleProject()).finally(() => {
      setCtaLoading(false);
      sequence.next();
    });
  };
  return <CoachMarkPopup open={sequence.isOpen} onDismiss={handleDismiss} anchorRef={step.anchorRef} anchorEl={anchorEl} side={step.side ?? "bottom"} align={step.align ?? "start"} title={t(step.titleKey, step.titleFallback)} description={t(step.descKey, step.descFallback)} ctaLabel={t(step.ctaKey, step.ctaFallback)} ctaLoading={ctaLoading} media={step.mediaUrl ? {
    url: step.mediaUrl,
    type: "image"
  } : void 0} preloadUrls={sequence.visibleSteps.map(visibleStep => visibleStep.mediaUrl).filter(url => Boolean(url))} stepCurrent={sequence.stepCurrent} stepTotal={sequence.stepTotal} showClose={true} actionUiId={`coach-mark-${MARK_ID}`} />;
}
