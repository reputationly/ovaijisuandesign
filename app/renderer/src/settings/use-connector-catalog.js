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
  const identity2 = auth?.user?.accessToken ?? "";
  const [catalog, setCatalog] = reactExports.useState({
    entries: [],
    displayConnectorIds: [],
    ...emptyConnectorMarketPolicy(),
  });
  const [pendingIds, setPendingIds] = reactExports.useState(new Set());
  const epoch = reactExports.useRef(0);
  const mounted = reactExports.useRef(false);
  const pending2 = reactExports.useRef(new Set());
  const apply2 = reactExports.useCallback((snapshot2) => {
    registerDynamicHcpManifests(
      snapshot2.entries.map((entry) => entry.manifest),
    );
    setCatalog(snapshot2);
  }, []);
  const refresh = reactExports.useCallback(async () => {
    if (pending2.current.size > 0) return;
    const generation = ++epoch.current;
    try {
      const snapshot2 = await homeService.connector.getMarketCatalog(false);
      if (mounted.current && epoch.current === generation) apply2(snapshot2);
    } catch {
      if (mounted.current && epoch.current === generation) {
        setCatalog((previous2) => ({
          ...previous2,
          ...emptyConnectorMarketPolicy(),
        }));
      }
    }
  }, [apply2]);
  const forceRefresh = reactExports.useCallback(async () => {
    if (pending2.current.size > 0) return;
    const generation = ++epoch.current;
    try {
      const snapshot2 = await homeService.connector.getMarketCatalog(true);
      if (mounted.current && epoch.current === generation) apply2(snapshot2);
    } catch {
      if (mounted.current && epoch.current === generation) {
        setCatalog((previous2) => ({
          ...previous2,
          ...emptyConnectorMarketPolicy(),
        }));
      }
    }
  }, [apply2]);
  const prime = reactExports.useCallback(async () => {
    const generation = epoch.current;
    try {
      const snapshot2 = await homeService.connector.getMarketCatalog(false);
      if (
        !mounted.current ||
        epoch.current !== generation ||
        snapshot2.entries.length === 0
      )
        return;
      apply2({
        ...snapshot2,
        permission: {
          isOperator: false,
        },
      });
    } catch {}
  }, [apply2]);
  reactExports.useEffect(() => {
    mounted.current = true;
    setCatalog((previous2) => ({
      ...previous2,
      ...emptyConnectorMarketPolicy(),
    }));
    let live = true;
    void prime().then(() => {
      if (live) void forceRefresh();
    });
    const timer2 = setInterval(() => void refresh(), 6e4);
    const handleFocus = () => void refresh();
    window.addEventListener("focus", handleFocus);
    return () => {
      live = false;
      mounted.current = false;
      epoch.current += 1;
      clearInterval(timer2);
      window.removeEventListener("focus", handleFocus);
    };
  }, [prime, refresh, forceRefresh, identity2]);
  const setVisibility = reactExports.useCallback(
    async (connectorId, visible) => {
      if (pending2.current.has(connectorId)) return;
      pending2.current.add(connectorId);
      setPendingIds(new Set(pending2.current));
      const generation = ++epoch.current;
      try {
        const snapshot2 = await homeService.connector.setMarketVisibility(
          connectorId,
          visible,
        );
        if (mounted.current && epoch.current === generation) apply2(snapshot2);
      } catch (error) {
        if (mounted.current)
          setCatalog((previous2) => ({
            ...previous2,
            permission: {
              isOperator: false,
            },
          }));
        throw error;
      } finally {
        pending2.current.delete(connectorId);
        if (mounted.current) {
          setPendingIds(new Set(pending2.current));
          void forceRefresh();
        }
      }
    },
    [apply2, forceRefresh],
  );
  return {
    ...catalog,
    pendingIds,
    setVisibility,
  };
}
