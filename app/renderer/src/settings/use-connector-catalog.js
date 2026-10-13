// use-connector-catalog.js
import {
  emptyConnectorMarketPolicy,
  reactExports,
  registerDynamicHcpManifests,
} from "../vendor.js";
import { AuthContext } from "../assets/credit-query-keys.jsx";
import { homeService } from "../workspace/home-service.jsx";

export function useConnectorCatalog() {
  const auth = reactExports.useContext(AuthContext);
  const identity = auth?.user?.accessToken ?? "";
  const [catalog, setCatalog] = reactExports.useState({
    entries: [],
    displayConnectorIds: [],
    ...emptyConnectorMarketPolicy(),
  });
  const [pendingIds, setPendingIds] = reactExports.useState(new Set());
  const epoch = reactExports.useRef(0);
  const mounted = reactExports.useRef(false);
  const pending = reactExports.useRef(new Set());
  const apply = reactExports.useCallback((snapshot) => {
    registerDynamicHcpManifests(
      snapshot.entries.map((entry) => entry.manifest),
    );
    setCatalog(snapshot);
  }, []);
  const refresh = reactExports.useCallback(async () => {
    if (pending.current.size > 0) return;
    const generation = ++epoch.current;
    try {
      const snapshot = await homeService.connector.getMarketCatalog(false);
      if (mounted.current && epoch.current === generation) apply(snapshot);
    } catch {
      if (mounted.current && epoch.current === generation) {
        setCatalog((previous) => ({
          ...previous,
          ...emptyConnectorMarketPolicy(),
        }));
      }
    }
  }, [apply]);
  const forceRefresh = reactExports.useCallback(async () => {
    if (pending.current.size > 0) return;
    const generation = ++epoch.current;
    try {
      const snapshot = await homeService.connector.getMarketCatalog(true);
      if (mounted.current && epoch.current === generation) apply(snapshot);
    } catch {
      if (mounted.current && epoch.current === generation) {
        setCatalog((previous) => ({
          ...previous,
          ...emptyConnectorMarketPolicy(),
        }));
      }
    }
  }, [apply]);
  const prime = reactExports.useCallback(async () => {
    const generation = epoch.current;
    try {
      const snapshot = await homeService.connector.getMarketCatalog(false);
      if (
        !mounted.current ||
        epoch.current !== generation ||
        snapshot.entries.length === 0
      )
        return;
      apply({
        ...snapshot,
        permission: {
          isOperator: false,
        },
      });
    } catch {}
  }, [apply]);
  reactExports.useEffect(() => {
    mounted.current = true;
    setCatalog((previous) => ({
      ...previous,
      ...emptyConnectorMarketPolicy(),
    }));
    let live = true;
    void prime().then(() => {
      if (live) void forceRefresh();
    });
    const timer = setInterval(() => void refresh(), 6e4);
    const handleFocus = () => void refresh();
    window.addEventListener("focus", handleFocus);
    return () => {
      live = false;
      mounted.current = false;
      epoch.current += 1;
      clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [prime, refresh, forceRefresh, identity]);
  const setVisibility = reactExports.useCallback(
    async (connectorId, visible) => {
      if (pending.current.has(connectorId)) return;
      pending.current.add(connectorId);
      setPendingIds(new Set(pending.current));
      const generation = ++epoch.current;
      try {
        const snapshot = await homeService.connector.setMarketVisibility(
          connectorId,
          visible,
        );
        if (mounted.current && epoch.current === generation) apply(snapshot);
      } catch (error) {
        if (mounted.current)
          setCatalog((previous) => ({
            ...previous,
            permission: {
              isOperator: false,
            },
          }));
        throw error;
      } finally {
        pending.current.delete(connectorId);
        if (mounted.current) {
          setPendingIds(new Set(pending.current));
          void forceRefresh();
        }
      }
    },
    [apply, forceRefresh],
  );
  return {
    ...catalog,
    pendingIds,
    setVisibility,
  };
}
