// workspace-asset-center-relocation-coach-mark.jsx
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  ASSET_CENTER_RELOCATION_REVISION,
  HOME_INPUT_COACH_MARK_ID,
} from "../assets/wrap-as-asset-center-error.js";
import { useCoachMarkSequence } from "../assets/use-coach-mark-sequence.js";
import { ASSET_CENTER_RELOCATION_SPOTLIGHT } from "../assets/use-materialized-entities.jsx";
import { CoachMarkPopup } from "./coach-mark-popup.jsx";

export const CONTENT_PANEL_MIN_WIDTH = 240;

export const CONTENT_PANEL_MAX_WIDTH = 480;

export const SKILL_DRAG_MIME = "application/x-hilo-skill";

export const PLUGIN_DRAG_MIME = "application/x-hilo-plugin";

export const CANVAS_SIDEBAR_NAVIGATION_EVENT = "canvas-sidebar:navigate";

export const canvasSidebarNavigation = new EventTarget();

export function useCanvasSidebar() {
  const openTab = reactExports.useCallback((tab) => {
    canvasSidebarNavigation.dispatchEvent(
      new CustomEvent(CANVAS_SIDEBAR_NAVIGATION_EVENT, {
        detail: {
          tab,
        },
      }),
    );
  }, []);
  return {
    openTab,
  };
}

export function resolveCanvasSidebarRightEdgeInset(presentation, width) {
  const safeWidth = Math.max(0, width);
  if (presentation === "drawer") return safeWidth;
  if (presentation === "drawer-overlay") return safeWidth + 8;
  return 0;
}

const LIBRARY_ANCHOR_SELECTOR = [
  '[data-action-ui-id="canvas-sidebar-assets.library-entry"]',
  '[data-action-ui-id="canvas-sidebar-assets.library-heading"]',
].join(",");

export function WorkspaceAssetCenterRelocationCoachMark({
  enabled,
  workspaceId,
}) {
  const { t: translate } = useTranslation();
  const { openTab } = useCanvasSidebar();
  const anchorRef = reactExports.useRef(null);
  const [anchorEl, setAnchorEl] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!enabled) {
      anchorRef.current = null;
      setAnchorEl(null);
      return;
    }
    const resolveAnchor = () => {
      const workspaceRoot = Array.from(
        document.querySelectorAll("[data-workspace-runtime-id]"),
      ).find(
        (element) => element.dataset.workspaceRuntimeId === workspaceId,
      );
      const next =
        workspaceRoot?.querySelector(LIBRARY_ANCHOR_SELECTOR) ?? null;
      anchorRef.current = next;
      setAnchorEl((current) => (current === next ? current : next));
    };
    resolveAnchor();
    const observer = new MutationObserver(resolveAnchor);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [enabled, workspaceId]);
  const sequence = useCoachMarkSequence(
    HOME_INPUT_COACH_MARK_ID,
    [
      {
        revision: ASSET_CENTER_RELOCATION_REVISION,
        onEnter: () => openTab("assets"),
      },
    ],
    enabled,
    void 0,
    {
      persistOnEscape: false,
    },
  );
  if (!anchorEl) return null;
  const handleDismiss = (method) => {
    if (method === "button") {
      sequence.dismiss(method);
      return;
    }
    sequence.closeWithoutPersisting(method);
  };
  return (
    <CoachMarkPopup
      open={sequence.isOpen}
      onDismiss={handleDismiss}
      anchorRef={anchorRef}
      anchorEl={anchorEl}
      side="right"
      align="start"
      title={translate(
        "coachMark.workspace.assetCenterRelocation.title",
        "这里就是新家",
      )}
      description={translate(
        "coachMark.workspace.assetCenterRelocation.desc",
        "以后可以在这里找到并使用原资产中心里的素材。",
      )}
      ctaLabel={translate("coachMark.gotIt", "我知道了")}
      stepCurrent={2}
      stepTotal={2}
      showClose={true}
      showSpotlight={ASSET_CENTER_RELOCATION_SPOTLIGHT}
      actionUiId="coach-mark-asset-center-relocation-workspace"
    />
  );
}
