// match-view.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CatchBoundary,
  CatchNotFound,
  ClientOnly,
  createControlledPromise,
  ErrorComponent,
  getLocationChangeInfo,
  invariant,
  isNotFound,
  isRedirect,
  isServer$1,
  jsxRuntimeExports,
  matchContext,
  reactExports,
  rootRouteId,
  ScrollRestoration,
  useRouter,
  useStore,
} from "../vendor.js";
import { SafeFragment, useLayoutEffect } from "./create-guard-reporter.jsx";

function DefaultGlobalNotFound() {
  return <p>Not Found</p>;
}

function renderRouteNotFound(router2, route, data2) {
  if (!route.options.notFoundComponent) {
    if (router2.options.defaultNotFoundComponent)
      return <router2.options.defaultNotFoundComponent {...data2} />;
    return <DefaultGlobalNotFound />;
  }
  return <route.options.notFoundComponent {...data2} />;
}

function OnRendered({ resetKey }) {
  const router2 = useRouter();
  const prevHrefRef = reactExports.useRef(void 0);
  useLayoutEffect(() => {
    const currentHref = router2.latestLocation.href;
    if (prevHrefRef.current === void 0 || prevHrefRef.current !== currentHref) {
      router2.emit({
        type: "onRendered",
        ...getLocationChangeInfo(
          router2.stores.location.state,
          router2.stores.resolvedLocation.state,
        ),
      });
      prevHrefRef.current = currentHref;
    }
  }, [router2.latestLocation.state.__TSR_key, resetKey, router2]);
  return null;
}

export var Match = reactExports.memo(function MatchImpl({ matchId }) {
  const router2 = useRouter();
  const matchStore = router2.stores.activeMatchStoresById.get(matchId);
  if (!matchStore) {
    invariant();
  }
  const resetKey = useStore(router2.stores.loadedAt, (loadedAt) => loadedAt);
  const match2 = useStore(matchStore, (value) => value);
  return (
    <MatchView
      router={router2}
      matchId={matchId}
      resetKey={resetKey}
      matchState={reactExports.useMemo(() => {
        const routeId = match2.routeId;
        const parentRouteId = router2.routesById[routeId].parentRoute?.id;
        return {
          routeId,
          ssr: match2.ssr,
          _displayPending: match2._displayPending,
          parentRouteId,
        };
      }, [
        match2._displayPending,
        match2.routeId,
        match2.ssr,
        router2.routesById,
      ])}
    />
  );
});

function MatchView({ router: router2, matchId, resetKey, matchState }) {
  const route = router2.routesById[matchState.routeId];
  const PendingComponent =
    route.options.pendingComponent ?? router2.options.defaultPendingComponent;
  const pendingElement = PendingComponent ? <PendingComponent /> : null;
  const routeErrorComponent =
    route.options.errorComponent ?? router2.options.defaultErrorComponent;
  const routeOnCatch = route.options.onCatch ?? router2.options.defaultOnCatch;
  const routeNotFoundComponent = route.isRoot
    ? (route.options.notFoundComponent ??
      router2.options.notFoundRoute?.options.component)
    : route.options.notFoundComponent;
  const resolvedNoSsr =
    matchState.ssr === false || matchState.ssr === "data-only";
  const ResolvedSuspenseBoundary =
    (!route.isRoot || route.options.wrapInSuspense || resolvedNoSsr) &&
    (route.options.wrapInSuspense ??
      PendingComponent ??
      (route.options.errorComponent?.preload || resolvedNoSsr))
      ? reactExports.Suspense
      : SafeFragment;
  const ResolvedCatchBoundary = routeErrorComponent
    ? CatchBoundary
    : SafeFragment;
  const ResolvedNotFoundBoundary = routeNotFoundComponent
    ? CatchNotFound
    : SafeFragment;
  return jsxRuntimeExports.jsxs(
    route.isRoot
      ? (route.options.shellComponent ?? SafeFragment)
      : SafeFragment,
    {
      children: [
        <matchContext.Provider value={matchId}>
          <ResolvedSuspenseBoundary fallback={pendingElement}>
            <ResolvedCatchBoundary
              getResetKey={() => resetKey}
              errorComponent={routeErrorComponent || ErrorComponent}
              onCatch={(error, errorInfo) => {
                if (isNotFound(error)) {
                  error.routeId ??= matchState.routeId;
                  throw error;
                }
                routeOnCatch?.(error, errorInfo);
              }}
            >
              <ResolvedNotFoundBoundary
                fallback={(error) => {
                  error.routeId ??= matchState.routeId;
                  if (
                    !routeNotFoundComponent ||
                    (error.routeId && error.routeId !== matchState.routeId) ||
                    (!error.routeId && !route.isRoot)
                  )
                    throw error;
                  return reactExports.createElement(
                    routeNotFoundComponent,
                    error,
                  );
                }}
              >
                {resolvedNoSsr || matchState._displayPending ? (
                  <ClientOnly fallback={pendingElement}>
                    <MatchInner matchId={matchId} />
                  </ClientOnly>
                ) : (
                  <MatchInner matchId={matchId} />
                )}
              </ResolvedNotFoundBoundary>
            </ResolvedCatchBoundary>
          </ResolvedSuspenseBoundary>
        </matchContext.Provider>,
        matchState.parentRouteId === rootRouteId ? (
          <>
            <OnRendered resetKey={resetKey} />
            {router2.options.scrollRestoration && isServer$1 ? (
              <ScrollRestoration />
            ) : null}
          </>
        ) : null,
      ],
    },
  );
}

var MatchInner = reactExports.memo(function MatchInnerImpl({ matchId }) {
  const router2 = useRouter();
  const matchStore = router2.stores.activeMatchStoresById.get(matchId);
  if (!matchStore) {
    invariant();
  }
  const match2 = useStore(matchStore, (value) => value);
  const routeId = match2.routeId;
  const route = router2.routesById[routeId];
  const key2 = reactExports.useMemo(() => {
    const remountDeps = (
      router2.routesById[routeId].options.remountDeps ??
      router2.options.defaultRemountDeps
    )?.({
      routeId,
      loaderDeps: match2.loaderDeps,
      params: match2._strictParams,
      search: match2._strictSearch,
    });
    return remountDeps ? JSON.stringify(remountDeps) : void 0;
  }, [
    routeId,
    match2.loaderDeps,
    match2._strictParams,
    match2._strictSearch,
    router2.options.defaultRemountDeps,
    router2.routesById,
  ]);
  const out = reactExports.useMemo(() => {
    const Comp = route.options.component ?? router2.options.defaultComponent;
    if (Comp) return <Comp key={key2} />;
    return <Outlet />;
  }, [key2, route.options.component, router2.options.defaultComponent]);
  if (match2._displayPending)
    throw router2.getMatch(match2.id)?._nonReactive.displayPendingPromise;
  if (match2._forcePending)
    throw router2.getMatch(match2.id)?._nonReactive.minPendingPromise;
  if (match2.status === "pending") {
    const pendingMinMs =
      route.options.pendingMinMs ?? router2.options.defaultPendingMinMs;
    if (pendingMinMs) {
      const routerMatch = router2.getMatch(match2.id);
      if (routerMatch && !routerMatch._nonReactive.minPendingPromise) {
        {
          const minPendingPromise = createControlledPromise();
          routerMatch._nonReactive.minPendingPromise = minPendingPromise;
          setTimeout(() => {
            minPendingPromise.resolve();
            routerMatch._nonReactive.minPendingPromise = void 0;
          }, pendingMinMs);
        }
      }
    }
    throw router2.getMatch(match2.id)?._nonReactive.loadPromise;
  }
  if (match2.status === "notFound") {
    if (!isNotFound(match2.error)) {
      invariant();
    }
    return renderRouteNotFound(router2, route, match2.error);
  }
  if (match2.status === "redirected") {
    if (!isRedirect(match2.error)) {
      invariant();
    }
    throw router2.getMatch(match2.id)?._nonReactive.loadPromise;
  }
  if (match2.status === "error") {
    throw match2.error;
  }
  return out;
});

export var Outlet = reactExports.memo(function OutletImpl() {
  const router2 = useRouter();
  const matchId = reactExports.useContext(matchContext);
  let routeId;
  let parentGlobalNotFound = false;
  let childMatchId;
  {
    const parentMatchStore = matchId
      ? router2.stores.activeMatchStoresById.get(matchId)
      : void 0;
    [routeId, parentGlobalNotFound] = useStore(parentMatchStore, (match2) => [
      match2?.routeId,
      match2?.globalNotFound ?? false,
    ]);
    childMatchId = useStore(router2.stores.matchesId, (ids2) => {
      return ids2[ids2.findIndex((id2) => id2 === matchId) + 1];
    });
  }
  const route = routeId ? router2.routesById[routeId] : void 0;
  const pendingElement = router2.options.defaultPendingComponent ? (
    <router2.options.defaultPendingComponent />
  ) : null;
  if (parentGlobalNotFound) {
    if (!route) {
      invariant();
    }
    return renderRouteNotFound(router2, route, void 0);
  }
  if (!childMatchId) return null;
  const nextMatch = <Match matchId={childMatchId} />;
  if (routeId === rootRouteId)
    return (
      <reactExports.Suspense fallback={pendingElement}>
        {nextMatch}
      </reactExports.Suspense>
    );
  return nextMatch;
});
