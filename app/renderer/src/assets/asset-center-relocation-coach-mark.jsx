// asset-center-relocation-coach-mark.jsx
import {
  getRuntimeConfig,
  reactExports,
  resolveNewProjectPreferences,
  storageKeys,
  useNavigate,
  useQueryClient,
  useStorage,
  useTranslation,
} from "../vendor.js";
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
  const queryClient2 = useQueryClient();
  const persistStartedRef = reactExports.useRef(false);
  const { ready, libraryInitialized, hasAssetData, assetCenterHidden } =
    relocation;
  reactExports.useEffect(() => {
    if (
      !ready ||
      !libraryInitialized ||
      hasAssetData ||
      assetCenterHidden ||
      persistStartedRef.current
    ) {
      return;
    }
    persistStartedRef.current = true;
    void Promise.resolve()
      .then(() => getAssetCenterMainService().markLegacyEntryHidden())
      .then(() =>
        queryClient2.invalidateQueries({
          queryKey: storageKeys.global("config"),
        }),
      )
      .catch(() => {
        persistStartedRef.current = false;
      });
  }, [
    assetCenterHidden,
    hasAssetData,
    libraryInitialized,
    queryClient2,
    ready,
  ]);
}

const ASSET_CENTER_NAV_SELECTOR =
  '[data-action-ui-id="home-sidebar-nav-asset-center-coachmark-anchor"]';

export function AssetCenterRelocationCoachMark() {
  const { t: t2 } = useTranslation();
  const navigate = useNavigate();
  const [config2, , , configHydrated] = useStorage("global.config");
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
  const { loadUserMemory } = resolveNewProjectPreferences(config2);
  const anchorRef = reactExports.useRef(null);
  const [anchorEl, setAnchorEl] = reactExports.useState(null);
  const [closedForSession, setClosedForSession] = reactExports.useState(false);
  const [handoffStarted, setHandoffStarted] = reactExports.useState(false);
  const [ctaLoading, setCtaLoading] = reactExports.useState(false);
  const configReady =
    configHydrated &&
    (getRuntimeConfig().region !== "domestic" ||
      config2.watermarkOnboardingShown === true);
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
      const next2 = document.querySelector(ASSET_CENTER_NAV_SELECTOR);
      anchorRef.current = next2;
      setAnchorEl((current2) => (current2 === next2 ? current2 : next2));
    };
    resolveAnchor();
    const observer2 = new MutationObserver(resolveAnchor);
    observer2.observe(document.body, {
      childList: true,
      subtree: true,
    });
    return () => observer2.disconnect();
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
          .filter((project2) => project2.kind === "team")
          .flatMap((project2) => project2.workspacePaths)
          .map((path2) => projectWorkspaceKey(path2, caseInsensitive)),
      ),
    [caseInsensitive, projects],
  );
  const isPersonalWorkspace = (path2) =>
    !teamWorkspaceKeys.has(projectWorkspaceKey(path2, caseInsensitive));
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
    const run2 = async () => {
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
            t: t2,
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
        t2(
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
    void run2()
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
      title={t2("coachMark.home.assetCenterRelocation.title", "资产中心搬家啦")}
      description={t2(
        "coachMark.home.assetCenterRelocation.desc",
        "资产中心已改名为「主体库」，搬到了创作页（画布）里，让你在创作时更方便地取用素材。",
      )}
      ctaLabel={t2("coachMark.next", "下一步")}
      ctaLoading={ctaLoading}
      stepCurrent={1}
      stepTotal={2}
      showClose={true}
      showSpotlight={ASSET_CENTER_RELOCATION_SPOTLIGHT}
      actionUiId="coach-mark-asset-center-relocation-entry"
    />
  );
}
