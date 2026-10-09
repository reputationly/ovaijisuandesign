// 首页「有什么新变化」入口与 logo 动效。
import { r as reactExports, t as trackEvent, T as TRACK_EVENTS, j as jsxRuntimeExports, bI as ChevronRight, hv as useAuth, lE as usePopup, lF as useOptionalUpdaterContext, lG as normalizeAnnouncements, lH as useBlockingModalPresence, lI as BLOCKING_MODAL_IDS, lJ as FeaturePopup, lK as HubLogo } from "../main.jsx";
import { __jsx } from "./jsx-runtime.js";
const HOME_WHATS_NEW_ITEM_DURATION_MS = 3e3;
function HomeWhatsNewGiftIcon() {
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.125 2.20833C3.125 1.54099 3.66599 1 4.33333 1C5.0215 1 5.63015 1.34046 6 1.86214C6.36985 1.34046 6.9785 1 7.66665 1C8.334 1 8.875 1.54099 8.875 2.20833C8.875 2.69838 8.70235 3.14811 8.41455 3.5H9.625C10.1082 3.5 10.5 3.89175 10.5 4.375V4.75C10.5 5.23325 10.1082 5.625 9.625 5.625H6.375V3.5H6.83335C7.5467 3.5 8.125 2.9217 8.125 2.20833C8.125 1.9552 7.9198 1.75 7.66665 1.75C6.9533 1.75 6.375 2.3283 6.375 3.04167V3.5H5.625V3.04167C5.625 2.3283 5.0467 1.75 4.33333 1.75C4.0802 1.75 3.875 1.9552 3.875 2.20833C3.875 2.9217 4.4533 3.5 5.16665 3.5H5.625V5.625H2.375C1.89175 5.625 1.5 5.23325 1.5 4.75V4.375C1.5 3.89175 1.89175 3.5 2.375 3.5H3.58545C3.29765 3.14811 3.125 2.69838 3.125 2.20833Z" fill="currentColor" /><path d="M6.375 6.375H10V9.625C10 10.1082 9.60825 10.5 9.125 10.5H6.375V6.375Z" fill="currentColor" /><path d="M5.625 6.375H2V9.625C2 10.1082 2.39175 10.5 2.875 10.5H5.625V6.375Z" fill="currentColor" /></svg>;
}
function HomeWhatsNewHandoff({
  items,
  onOpen,
  getAriaLabel = item => item.tickerText,
  paused: externallyPaused = false
}) {
  const [currentIndex, setCurrentIndex] = reactExports.useState(0);
  const [hovered, setHovered] = reactExports.useState(false);
  const [focused, setFocused] = reactExports.useState(false);
  const paused = externallyPaused || hovered || focused;
  const currentItem = items[currentIndex] ?? items[0];
  const itemIds = items.map(item => item.id).join("\0");
  const previousItemIdsRef = reactExports.useRef(itemIds);
  reactExports.useEffect(() => {
    if (previousItemIdsRef.current === itemIds) return;
    previousItemIdsRef.current = itemIds;
    setCurrentIndex(0);
  }, [itemIds]);
  reactExports.useEffect(() => {
    if (items.length < 2 || paused) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setCurrentIndex(index => (index + 1) % items.length);
    }, HOME_WHATS_NEW_ITEM_DURATION_MS);
    return () => window.clearInterval(timer);
  }, [items.length, paused]);
  if (!currentItem) return null;
  const handleOpen = () => {
    onOpen(currentItem);
  };
  return <button type="button" className="home-whats-new flex min-h-[35px] max-w-[calc(100%-40px)] cursor-pointer items-center gap-1 rounded-lg border border-border bg-card/85 px-1.5 py-1 text-foreground backdrop-blur-md transition-colors duration-150 hover:border-brand-accent/30 focus-visible:border-brand-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background" aria-haspopup={currentItem.kind === "feature-popup" ? "dialog" : void 0} aria-label={getAriaLabel(currentItem)} onClick={handleOpen} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} data-action-ui-id="home-whats-new"><span className="grid size-6 shrink-0 place-items-center text-brand-accent" aria-hidden="true"><HomeWhatsNewGiftIcon /></span><span className="home-whats-new__ticker h-6 min-w-0 max-w-[min(310px,calc(100vw-105px))] overflow-hidden text-left" aria-hidden="true"><span key={currentItem.id} className="home-whats-new__track flex w-max flex-col"><span className="home-whats-new__item flex h-6 shrink-0 items-center overflow-hidden whitespace-nowrap text-sm font-normal">{currentItem.tickerText}</span></span></span><span className="grid h-6 w-5 shrink-0 place-items-center text-muted-foreground" aria-hidden="true"><ChevronRight size={16} strokeWidth={1.5} /></span></button>;
}
export function HomeWhatsNew({
  getAriaLabel
}) {
  const {
    user
  } = useAuth();
  const {
    data: rawPopup
  } = usePopup();
  const updater = useOptionalUpdaterContext();
  const forcedUpdate = updater?.state.forced ?? false;
  const popups = forcedUpdate ? [] : normalizeAnnouncements(rawPopup).filter(popup => popup.banner_text?.trim());
  const items = reactExports.useMemo(() => popups.map(popup => ({
    kind: "feature-popup",
    id: `feature-popup:${popup.id}`,
    tickerText: popup.banner_text.trim(),
    popupId: popup.id
  })), [popups]);
  const [openFor, setOpenFor] = reactExports.useState(null);
  const userID = user?.userID;
  const featurePopup = openFor?.userID === userID ? popups.find(popup => popup.id === openFor?.popupId) : void 0;
  const featurePopupOpen = !!userID && !!featurePopup;
  reactExports.useEffect(() => {
    setOpenFor(current => {
      if (!current) return current;
      if (!userID || current.userID !== userID || !popups.some(popup => popup.id === current.popupId)) {
        return null;
      }
      return current;
    });
  }, [popups, userID]);
  useBlockingModalPresence(BLOCKING_MODAL_IDS.serverDrivenPopup, featurePopupOpen);
  const handleOpen = reactExports.useCallback(item => {
    if (item.kind !== "feature-popup" || !userID) return;
    const popup = popups.find(candidate => candidate.id === item.popupId);
    if (!popup) return;
    trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_VIEW, {
      popup_type: "feature",
      url: popup.action?.url ?? "",
      has_cover: Boolean(popup.cover_url),
      can_close: popup.can_close ?? false
    });
    setOpenFor({
      userID,
      popupId: popup.id
    });
  }, [popups, userID]);
  if (!userID) return null;
  return <><HomeWhatsNewHandoff items={items} onOpen={handleOpen} getAriaLabel={getAriaLabel} paused={featurePopupOpen} />{featurePopupOpen && featurePopup ? <FeaturePopup popup={featurePopup} onClose={() => setOpenFor(null)} /> : null}</>;
}
const HOME_WINK_LOGO_CLASS_NAME = "no-drag text-[var(--home-brand-foreground)]";
export function HomeWinkLogo() {
  return <HubLogo size={46} winkOnHover={true} className={HOME_WINK_LOGO_CLASS_NAME} data-action-ui-id="home.wink-logo" />;
}
