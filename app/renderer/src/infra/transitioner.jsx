// transitioner.jsx
import {
  jsxRuntimeExports,
  reactExports,
  useRouter,
  invariant,
  useStore,
  CatchBoundary,
  CatchNotFound,
  matchContext,
  ErrorComponent,
  isNotFound,
  ClientOnly,
  rootRouteId,
  isServer$1,
  ScrollRestoration,
  getLocationChangeInfo,
  createControlledPromise,
  isRedirect,
  trimPathRight,
  batch,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Router } from "../vendor-inline/vscode-base/linked-list.js";
export function classifyVideoGenerationMode(input) {
  const kinds = [input.imageRefCount > 0, input.videoRefCount > 0, input.audioRefCount > 0].filter(
    Boolean,
  ).length;
  if (kinds > 1) return "multimodal";
  if (input.videoRefCount > 0) return "v2v";
  if (input.imageRefCount > 0) return "i2v";
  if (input.audioRefCount > 0) return "a2v";
  return "t2v";
}
const MAX_PROP_STRING_LENGTH = 1024;
const MAX_STACK_PROP_STRING_LENGTH = 2048;
const MAX_PROP_COUNT = 64;
function isStackField(key2) {
  return key2.toLowerCase().includes("stack");
}
function isSafelySerializable(value) {
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}
export function sanitizeTrackProps(properties2) {
  const out = {};
  let truncated = 0;
  let dropped = 0;
  let kept = 0;
  for (const [key2, value] of Object.entries(properties2)) {
    if (kept >= MAX_PROP_COUNT) {
      dropped++;
      continue;
    }
    if (typeof value === "function" || typeof value === "symbol") {
      dropped++;
      continue;
    }
    if (typeof value === "string") {
      const limit = isStackField(key2) ? MAX_STACK_PROP_STRING_LENGTH : MAX_PROP_STRING_LENGTH;
      if (value.length > limit) {
        out[key2] = value.slice(0, limit);
        truncated++;
      } else {
        out[key2] = value;
      }
      kept++;
      continue;
    }
    if (value !== null && typeof value === "object" && !isSafelySerializable(value)) {
      dropped++;
      continue;
    }
    if (typeof value === "bigint") {
      dropped++;
      continue;
    }
    out[key2] = value;
    kept++;
  }
  if (dropped > 0) {
    console.warn(
      `[track] sanitize dropped ${dropped} propert(y/ies) (max ${MAX_PROP_COUNT} props; functions/symbols/circular values rejected)`,
    );
  }
  return {
    props: out,
    truncatedStrings: truncated,
    droppedProps: dropped,
  };
}
const GUARD_SUMMARY_INTERVAL_MS = 6e4;
function zeroCounters() {
  return {
    truncated_strings: 0,
    dropped_props: 0,
    dropped_events: 0,
  };
}
function createGuardReporter(scope, intervalMs = GUARD_SUMMARY_INTERVAL_MS) {
  const totals = zeroCounters();
  let window2 = zeroCounters();
  let timer2 = null;
  function flushNow() {
    if (timer2) {
      clearTimeout(timer2);
      timer2 = null;
    }
    if (
      window2.truncated_strings === 0 &&
      window2.dropped_props === 0 &&
      window2.dropped_events === 0
    ) {
      return;
    }
    console.warn(
      `[${scope}] guard summary: dropped_events=${window2.dropped_events} dropped_props=${window2.dropped_props} truncated_strings=${window2.truncated_strings} (totals: ${totals.dropped_events}/${totals.dropped_props}/${totals.truncated_strings})`,
    );
    window2 = zeroCounters();
  }
  function note(delta) {
    for (const key2 of Object.keys(totals)) {
      const d2 = delta[key2] ?? 0;
      totals[key2] += d2;
      window2[key2] += d2;
    }
    if (!timer2) {
      timer2 = setTimeout(flushNow, intervalMs);
      timer2.unref?.();
    }
  }
  return {
    note,
    totals: () => ({
      ...totals,
    }),
    flushNow,
  };
}
export const MAX_PENDING_EVENTS = 100;
export const _guard = createGuardReporter("track:browser");
const _debugListeners = new Set();
export function _notifyDebugListeners(eventName, properties2) {
  if (_debugListeners.size === 0) return;
  const event = {
    eventName,
    properties: properties2,
    timestamp: Date.now(),
  };
  for (const listener of _debugListeners) {
    try {
      listener(event);
    } catch {}
  }
}
var useLayoutEffect =
  typeof window !== "undefined" ? reactExports.useLayoutEffect : reactExports.useEffect;
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
    const hashScrollIntoViewOptions = location2.state.__hashScrollIntoViewOptions ?? true;
    if (hashScrollIntoViewOptions && location2.hash !== "") {
      const el = document.getElementById(location2.hash);
      if (el) el.scrollIntoView(hashScrollIntoViewOptions);
    }
  }
}
function DefaultGlobalNotFound() {
  return <p>Not Found</p>;
}
export function SafeFragment(props) {
  return <>{props.children}</>;
}
function renderRouteNotFound(router2, route, data2) {
  if (!route.options.notFoundComponent) {
    if (router2.options.defaultNotFoundComponent)
      return <router2.options.defaultNotFoundComponent {...data2} />;
    return <DefaultGlobalNotFound />;
  }
  return <route.options.notFoundComponent {...data2} />;
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
      }, [match2._displayPending, match2.routeId, match2.ssr, router2.routesById])}
    />
  );
});
function MatchView({ router: router2, matchId, resetKey, matchState }) {
  const route = router2.routesById[matchState.routeId];
  const PendingComponent =
    route.options.pendingComponent ?? router2.options.defaultPendingComponent;
  const pendingElement = PendingComponent ? <PendingComponent /> : null;
  const routeErrorComponent = route.options.errorComponent ?? router2.options.defaultErrorComponent;
  const routeOnCatch = route.options.onCatch ?? router2.options.defaultOnCatch;
  const routeNotFoundComponent = route.isRoot
    ? (route.options.notFoundComponent ?? router2.options.notFoundRoute?.options.component)
    : route.options.notFoundComponent;
  const resolvedNoSsr = matchState.ssr === false || matchState.ssr === "data-only";
  const ResolvedSuspenseBoundary =
    (!route.isRoot || route.options.wrapInSuspense || resolvedNoSsr) &&
    (route.options.wrapInSuspense ??
      PendingComponent ??
      (route.options.errorComponent?.preload || resolvedNoSsr))
      ? reactExports.Suspense
      : SafeFragment;
  const ResolvedCatchBoundary = routeErrorComponent ? CatchBoundary : SafeFragment;
  const ResolvedNotFoundBoundary = routeNotFoundComponent ? CatchNotFound : SafeFragment;
  return jsxRuntimeExports.jsxs(
    route.isRoot ? (route.options.shellComponent ?? SafeFragment) : SafeFragment,
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
                  return reactExports.createElement(routeNotFoundComponent, error);
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
            {router2.options.scrollRestoration && isServer$1 ? <ScrollRestoration /> : null}
          </>
        ) : null,
      ],
    },
  );
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
      router2.routesById[routeId].options.remountDeps ?? router2.options.defaultRemountDeps
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
  if (match2._displayPending) throw router2.getMatch(match2.id)?._nonReactive.displayPendingPromise;
  if (match2._forcePending) throw router2.getMatch(match2.id)?._nonReactive.minPendingPromise;
  if (match2.status === "pending") {
    const pendingMinMs = route.options.pendingMinMs ?? router2.options.defaultPendingMinMs;
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
    const parentMatchStore = matchId ? router2.stores.activeMatchStoresById.get(matchId) : void 0;
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
    return <reactExports.Suspense fallback={pendingElement}>{nextMatch}</reactExports.Suspense>;
  return nextMatch;
});
export function Transitioner() {
  const router2 = useRouter();
  const mountLoadForRouter = reactExports.useRef({
    router: router2,
    mounted: false,
  });
  const [isTransitioning, setIsTransitioning] = reactExports.useState(false);
  const isLoading = useStore(router2.stores.isLoading, (value) => value);
  const hasPendingMatches = useStore(router2.stores.hasPendingMatches, (value) => value);
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
    if (trimPathRight(router2.latestLocation.publicHref) !== trimPathRight(nextLocation.publicHref))
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
      (mountLoadForRouter.current.router === router2 && mountLoadForRouter.current.mounted)
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
        router2.stores.resolvedLocation.setState(() => router2.stores.location.state);
      });
      if (changeInfo.hrefChanged) handleHashScroll(router2);
    }
  }, [isAnyPending, previousIsAnyPending, router2]);
  return null;
}
export var createRouter = (options) => {
  return new Router(options);
};
