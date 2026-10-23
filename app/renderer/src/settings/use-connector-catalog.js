// use-connector-catalog.js
import reactExports from "react";
import { emptyConnectorMarketPolicy } from "../skills/connectors/connector-market.js";
import { registerDynamicHcpManifests } from "../skills/connectors/hcp-catalog.js";
import { AuthContext } from "../assets/credit-query-keys.jsx";
import { homeService } from "../workspace/home-service.jsx";

/**
 * 第 2032 轮：给目录请求加超时。
 *
 * 为什么需要：getMarketCatalog 走云端接口，本地不可达时它的 Promise
 * **既不 resolve 也不 reject**（实测 connectors-tab 永远停在 connectors-loading）。
 * 参照在同样情况下是"快速失败并显示错误+重试"，我们必须一致：
 * 超时后按失败处理，让 UI 进入错误态而不是无限 loading。
 */
const CATALOG_TIMEOUT_MS = 8_000;
function withTimeout(promise, ms = CATALOG_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("connector catalog timeout")), ms)),
  ]);
}

export function useConnectorCatalog() {
  const auth = reactExports.useContext(AuthContext);
  const identity = auth?.user?.accessToken ?? "";
  const [catalog, setCatalog] = reactExports.useState({
    entries: [],
    displayConnectorIds: [],
    ...emptyConnectorMarketPolicy(),
  });
  const [pendingIds, setPendingIds] = reactExports.useState(new Set());
  // 第 2032 轮：区分「还没加载完」与「加载完了但结果为空」。
  // 之前 connectors-tab 用 `entries.length === 0` 推断"加载中"，
  // 于是目录为空时会永远停在 loading、走不到空态 —— 这是真实 bug。
  const [loaded, setLoaded] = reactExports.useState(false);
  const epoch = reactExports.useRef(0);
  const mounted = reactExports.useRef(false);
  const pending = reactExports.useRef(new Set());
  const apply = reactExports.useCallback((snapshot) => {
    registerDynamicHcpManifests(
      snapshot.entries.map((entry) => entry.manifest),
    );
    setCatalog(snapshot);
    setLoaded(true);
  }, []);
  const refresh = reactExports.useCallback(async () => {
    if (pending.current.size > 0) return;
    const generation = ++epoch.current;
    try {
      const snapshot = await withTimeout(homeService.connector.getMarketCatalog(false));
      if (mounted.current && epoch.current === generation) apply(snapshot);
    } catch {
      if (mounted.current && epoch.current === generation) {
        setCatalog((previous) => ({
          ...previous,
          ...emptyConnectorMarketPolicy(),
        }));
        setLoaded(true);
      }
    }
  }, [apply]);
  const forceRefresh = reactExports.useCallback(async () => {
    if (pending.current.size > 0) return;
    const generation = ++epoch.current;
    try {
      const snapshot = await withTimeout(homeService.connector.getMarketCatalog(true));
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
      const snapshot = await withTimeout(homeService.connector.getMarketCatalog(false));
      if (!mounted.current || epoch.current !== generation) return;
      if (snapshot.entries.length === 0) {
        // 第 2032 轮：拿到了空结果也算"加载结束"，否则 UI 会永远停在 loading。
        setLoaded(true);
        return;
      }
      apply({
        ...snapshot,
        permission: {
          isOperator: false,
        },
      });
    } catch {
      if (mounted.current) setLoaded(true);
    }
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
    loaded,
  };
}
