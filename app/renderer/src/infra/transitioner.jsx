// transitioner.jsx
import {
  batch,
  CatchBoundary,
  ErrorComponent,
  getLocationChangeInfo,
  jsxRuntimeExports,
  matchContext,
  reactExports,
  rootRouteId,
  routerContext,
  trimPathRight,
  useRouter,
  useStore,
} from "../vendor.js";
import { SafeFragment, useLayoutEffect } from "./create-guard-reporter.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Match } from "./match-view.jsx";

function usePrevious(value) {
  const ref = reactExports.useRef({
    value,
    prev: null,
  });
  const current2 = ref.current.value;
  if (value !== current2)
    ref.current = {
      value,
      prev: current2,
    };
  return ref.current.prev;
}

function handleHashScroll(router2) {
  if (typeof document !== "undefined" && document.querySelector) {
    const location2 = router2.stores.location.state;
    const hashScrollIntoViewOptions =
      location2.state.__hashScrollIntoViewOptions ?? true;
    if (hashScrollIntoViewOptions && location2.hash !== "") {
      const el = document.getElementById(location2.hash);
      if (el) el.scrollIntoView(hashScrollIntoViewOptions);
    }
  }
}

function Transitioner() {
  const router2 = useRouter();
  const mountLoadForRouter = reactExports.useRef({
    router: router2,
    mounted: false,
  });
  const [isTransitioning, setIsTransitioning] = reactExports.useState(false);
  const isLoading = useStore(router2.stores.isLoading, (value) => value);
  const hasPendingMatches = useStore(
    router2.stores.hasPendingMatches,
    (value) => value,
  );
  const previousIsLoading = usePrevious(isLoading);
  const isAnyPending = isLoading || isTransitioning || hasPendingMatches;
  const previousIsAnyPending = usePrevious(isAnyPending);
  const isPagePending = isLoading || hasPendingMatches;
  const previousIsPagePending = usePrevious(isPagePending);
  router2.startTransition = (fn2) => {
    setIsTransitioning(true);
    reactExports.startTransition(() => {
      fn2();
      setIsTransitioning(false);
    });
  };
  reactExports.useEffect(() => {
    const unsub = router2.history.subscribe(router2.load);
    const nextLocation = router2.buildLocation({
      to: router2.latestLocation.pathname,
      search: true,
      params: true,
      hash: true,
      state: true,
      _includeValidateSearch: true,
    });
    if (
      trimPathRight(router2.latestLocation.publicHref) !==
      trimPathRight(nextLocation.publicHref)
    )
      router2.commitLocation({
        ...nextLocation,
        replace: true,
      });
    return () => {
      unsub();
    };
  }, [router2, router2.history]);
  useLayoutEffect(() => {
    if (
      (typeof window !== "undefined" && router2.ssr) ||
      (mountLoadForRouter.current.router === router2 &&
        mountLoadForRouter.current.mounted)
    )
      return;
    mountLoadForRouter.current = {
      router: router2,
      mounted: true,
    };
    const tryLoad = async () => {
      try {
        await router2.load();
      } catch (err) {
        console.error(err);
      }
    };
    tryLoad();
  }, [router2]);
  useLayoutEffect(() => {
    if (previousIsLoading && !isLoading)
      router2.emit({
        type: "onLoad",
        ...getLocationChangeInfo(
          router2.stores.location.state,
          router2.stores.resolvedLocation.state,
        ),
      });
  }, [previousIsLoading, router2, isLoading]);
  useLayoutEffect(() => {
    if (previousIsPagePending && !isPagePending)
      router2.emit({
        type: "onBeforeRouteMount",
        ...getLocationChangeInfo(
          router2.stores.location.state,
          router2.stores.resolvedLocation.state,
        ),
      });
  }, [isPagePending, previousIsPagePending, router2]);
  useLayoutEffect(() => {
    if (previousIsAnyPending && !isAnyPending) {
      const changeInfo = getLocationChangeInfo(
        router2.stores.location.state,
        router2.stores.resolvedLocation.state,
      );
      router2.emit({
        type: "onResolved",
        ...changeInfo,
      });
      batch(() => {
        router2.stores.status.setState(() => "idle");
        router2.stores.resolvedLocation.setState(
          () => router2.stores.location.state,
        );
      });
      if (changeInfo.hrefChanged) handleHashScroll(router2);
    }
  }, [isAnyPending, previousIsAnyPending, router2]);
  return null;
}

function MatchesInner() {
  const router2 = useRouter();
  const matchId = useStore(router2.stores.firstMatchId, (id2) => id2);
  const resetKey = useStore(router2.stores.loadedAt, (loadedAt) => loadedAt);
  const matchComponent = matchId ? <Match matchId={matchId} /> : null;
  return (
    <matchContext.Provider value={matchId}>
      {router2.options.disableGlobalCatchBoundary ? (
        matchComponent
      ) : (
        <CatchBoundary
          getResetKey={() => resetKey}
          errorComponent={ErrorComponent}
          onCatch={void 0}
        >
          {matchComponent}
        </CatchBoundary>
      )}
    </matchContext.Provider>
  );
}

function Matches() {
  const router2 = useRouter();
  const PendingComponent =
    router2.routesById[rootRouteId].options.pendingComponent ??
    router2.options.defaultPendingComponent;
  const pendingElement = PendingComponent ? <PendingComponent /> : null;
  const inner = jsxRuntimeExports.jsxs(
    typeof document !== "undefined" && router2.ssr
      ? SafeFragment
      : reactExports.Suspense,
    {
      fallback: pendingElement,
      children: [<Transitioner />, <MatchesInner />],
    },
  );
  return router2.options.InnerWrap ? (
    <router2.options.InnerWrap>{inner}</router2.options.InnerWrap>
  ) : (
    inner
  );
}

function RouterContextProvider({
  router: router2,
  children: children2,
  ...rest
}) {
  if (Object.keys(rest).length > 0)
    router2.update({
      ...router2.options,
      ...rest,
      context: {
        ...router2.options.context,
        ...rest.context,
      },
    });
  const provider = (
    <routerContext.Provider value={router2}>{children2}</routerContext.Provider>
  );
  if (router2.options.Wrap)
    return <router2.options.Wrap>{provider}</router2.options.Wrap>;
  return provider;
}

export function RouterProvider({ router: router2, ...rest }) {
  return (
    <RouterContextProvider router={router2} {...rest}>
      <Matches />
    </RouterContextProvider>
  );
}
