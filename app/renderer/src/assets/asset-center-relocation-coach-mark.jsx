// asset-center-relocation-coach-mark.jsx
const ASSET_CENTER_NAV_SELECTOR = '[data-action-ui-id="home-sidebar-nav-asset-center-coachmark-anchor"]';
import reactExports from "react";
import { resolveNewProjectPreferences } from "../infra/shared-runtime.js";
import { storageKeys } from "../infra/storage-cache.js";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useStorage } from "../infra/use-storage.js";
import { getAssetCenterMainService } from "./split-shortcut-keys.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  ASSET_CENTER_RELOCATION_REVISION,
  HOME_INPUT_COACH_MARK_ID,
  useAssetCenterRelocation,
} from "./wrap-as-asset-center-error.js";
import { buildWorkspaceSearch } from "../workspace/use-deep-link-router.js";
import {
  STARTUP_MODAL_IDS,
  useHasBlockingModal,
  useModalSlot,
} from "../infra/schedule.js";
import {
  useTopbarActions,
  useTopbarState,
} from "../workspace/topbar-state-context.jsx";
import {
  projectWorkspaceKey,
  sortRecentWorkspaces,
  useProjectStore,
} from "../workspace/normalize-project-entries.js";
import { homeService } from "../workspace/home-service.jsx";
import { ASSET_CENTER_RELOCATION_SPOTLIGHT } from "./use-materialized-entities.jsx";
import { useCoachMarkSequence } from "./use-coach-mark-sequence.js";
import { stageWorkspacePreview } from "../workspace/context-menu-content.jsx";
import { CoachMarkPopup } from "../workspace/coach-mark-popup.jsx";

function usePersistAssetCenterRelocation(relocation) {
  const queryClient = useQueryClient();
  const persistStartedRef = reactExports.useRef(false);
  const { ready, libraryInitialized, hasAssetData, assetCenterHidden } = relocation;
  reactExports.useEffect(() => {
    if (!ready || !libraryInitialized || hasAssetData || assetCenterHidden || persistStartedRef.current) {
      return;
    }
    persistStartedRef.current = true;
    void Promise.resolve()
      .then(() => getAssetCenterMainService().markLegacyEntryHidden())
      .then(() =>
        queryClient.invalidateQueries({
          queryKey: storageKeys.global("config"),
        }),
      )
      .catch(() => {
        persistStartedRef.current = false;
      });
  }, [assetCenterHidden, hasAssetData, libraryInitialized, queryClient, ready]);
}

export function AssetCenterRelocationCoachMark() {
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const [config, , , configHydrated] = useStorage("global.config");
  const [recentWorkspaces] = useStorage("global.recentWorkspaces");
  const [lastActiveWorkspacePath] = useStorage(
    "global.lastActiveWorkspacePath",
  );
  const relocation = useAssetCenterRelocation();
  usePersistAssetCenterRelocation(relocation);
  const { currentWorkspaceId, previewEntries } = useTopbarState();
  const { createWorkspace } = useTopbarActions();
  const { projects, caseInsensitive } = useProjectStore();
  const hasBlockingModal = useHasBlockingModal();
  const { loadUserMemory } = resolveNewProjectPreferences(config);
  const anchorRef = reactExports.useRef(null);
  const [anchorEl, setAnchorEl] = reactExports.useState(null);
  const [closedForSession, setClosedForSession] = reactExports.useState(false);
  const [handoffStarted, setHandoffStarted] = reactExports.useState(false);
  const [ctaLoading, setCtaLoading] = reactExports.useState(false);
  const configReady = configHydrated;
  const candidate =
    configReady &&
    relocation.relocationPending &&
    !closedForSession &&
    !handoffStarted;
  const granted = useModalSlot(STARTUP_MODAL_IDS.homeCoachMarks, {
    candidate,
  });
  reactExports.useEffect(() => {
    if (!candidate) {
      anchorRef.current = null;
      setAnchorEl(null);
      return;
    }
    const resolveAnchor = () => {
      const next = document.querySelector(ASSET_CENTER_NAV_SELECTOR);
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
  }, [candidate]);
  const sequence = useCoachMarkSequence(
    HOME_INPUT_COACH_MARK_ID,
    [
      {
        revision: ASSET_CENTER_RELOCATION_REVISION,
      },
    ],
    granted && !hasBlockingModal,
    void 0,
    {
      persistOnEscape: false,
      onIncompleteEscape: () => setClosedForSession(true),
    },
  );
  const teamWorkspaceKeys = reactExports.useMemo(
    () =>
      new Set(
        projects
          .filter((project) => project.kind === "team")
          .flatMap((project) => project.workspacePaths)
          .map((path) => projectWorkspaceKey(path, caseInsensitive)),
      ),
    [caseInsensitive, projects],
  );
  const isPersonalWorkspace = (path) =>
    !teamWorkspaceKeys.has(projectWorkspaceKey(path, caseInsensitive));
  const handleDismiss = (method) => {
    if (method !== "button") {
      if (ctaLoading) return;
      sequence.closeWithoutPersisting(method);
      setClosedForSession(true);
      return;
    }
    if (ctaLoading || handoffStarted) return;
    setHandoffStarted(true);
    setCtaLoading(true);
    const currentEntry = currentWorkspaceId
      ? previewEntries.find(
          (entry) =>
            entry.workspaceId === currentWorkspaceId &&
            isPersonalWorkspace(entry.folderPath),
        )
      : void 0;
    const lastActiveEntry = lastActiveWorkspacePath
      ? previewEntries.find(
          (entry) =>
            (entry.workspaceId === lastActiveWorkspacePath ||
              entry.folderPath === lastActiveWorkspacePath) &&
            isPersonalWorkspace(entry.folderPath),
        )
      : void 0;
    const openEntry =
      currentEntry ??
      lastActiveEntry ??
      previewEntries.find((entry) => isPersonalWorkspace(entry.folderPath));
    const run = async () => {
      if (openEntry) {
        await navigate({
          to: "/workspace",
          search: buildWorkspaceSearch(openEntry.workspaceId, {
            assetCenterRelocation: true,
          }),
        });
        return true;
      }
      const recentEntry = sortRecentWorkspaces(recentWorkspaces, "recent").find(
        (entry) => isPersonalWorkspace(entry.path),
      );
      if (recentEntry) {
        return Boolean(
          await stageWorkspacePreview({
            hiloApp: homeService.hiloApp,
            folderPath: recentEntry.path,
            t: translate,
            onStaged: (entry) =>
              navigate({
                to: "/workspace",
                search: buildWorkspaceSearch(entry.workspaceId, {
                  assetCenterRelocation: true,
                }),
              }),
          }),
        );
      }
      return createWorkspace(
        translate(
          "coachMark.home.assetCenterRelocation.defaultWorkspaceName",
          "New project",
        ),
        {
          loadUserMemory,
        },
        {
          assetCenterRelocation: true,
        },
      );
    };
    void run()
      .then((opened) => {
        if (!opened) setHandoffStarted(false);
      })
      .catch(() => setHandoffStarted(false))
      .finally(() => setCtaLoading(false));
  };
  return (
    <CoachMarkPopup
      open={sequence.isOpen && Boolean(anchorEl) && !handoffStarted}
      onDismiss={handleDismiss}
      anchorRef={anchorRef}
      anchorEl={anchorEl}
      side="right"
      align="center"
      title={translate("coachMark.home.assetCenterRelocation.title", "资产中心搬家啦")}
      description={translate(
        "coachMark.home.assetCenterRelocation.desc",
        "资产中心已改名为「主体库」，搬到了创作页（画布）里，让你在创作时更方便地取用素材。",
      )}
      ctaLabel={translate("coachMark.next", "下一步")}
      ctaLoading={ctaLoading}
      stepCurrent={1}
      stepTotal={2}
      showClose={true}
      showSpotlight={ASSET_CENTER_RELOCATION_SPOTLIGHT}
      actionUiId="coach-mark-asset-center-relocation-entry"
    />
  );
}
