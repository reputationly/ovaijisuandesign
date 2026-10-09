// use-wallet-query.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
import { creditLog } from "../workspace/shortcut-hint.jsx";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { getLastGatewayTraceId } from "../infra/gateway-http-error.jsx";
import { CLOUD_SERVER_TIME_HEADER } from "../text-editor/table-document-to-llm-content.js";
import { reactExports, useQuery } from "../vendor.js";
import {
  creditQueryKeys,
  useAuth,
  useCreditAccountState,
} from "../assets/credit-query-keys.jsx";
export function Label({ className, ...props }) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-xs leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
export function Skeleton({ className, ...props }) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-full bg-muted", className)}
      {...props}
    />
  );
}
function sanitizeWalletInfo(raw2) {
  const toNum = (v2) => {
    if (typeof v2 === "number") return v2;
    if (typeof v2 === "string" && v2 !== "") {
      const n2 = Number(v2);
      return Number.isFinite(n2) ? n2 : 0;
    }
    return 0;
  };
  const toCreditNum = (v2, source) => {
    if (typeof v2 === "string" && v2 !== "" && !Number.isFinite(Number(v2))) {
      creditLog.warn("wallet.total_credit_coerced_zero", {
        source,
        raw: v2,
      });
    }
    return toNum(v2);
  };
  return {
    ...raw2,
    migrate_end_time: toNum(raw2.migrate_end_time),
    wallets: (raw2.wallets ?? []).map((w3) => ({
      ...w3,
      total_credit: toCreditNum(w3.total_credit, w3.source),
      debit_credit: toNum(w3.debit_credit),
      sub_credits: (w3.sub_credits ?? []).map((sc) => ({
        ...sc,
        credit: toNum(sc.credit),
        end_time: toNum(sc.end_time),
        records: (sc.records ?? []).map((record2) => ({
          ...record2,
          credit: toNum(record2.credit),
          end_time: toNum(record2.end_time),
        })),
      })),
    })),
  };
}
export async function fetchWalletInfo(signal) {
  try {
    const res = await gatewayFetch("/api/v1/credit/wallet", {
      signal,
    });
    if (!res.ok) {
      throw new Error(`fetchWalletInfo failed: HTTP ${res.status}`);
    }
    const raw2 = await res.json();
    signal?.throwIfAborted();
    const serverTime = res.headers.get(CLOUD_SERVER_TIME_HEADER);
    const serverTimeMs = serverTime ? Number(serverTime) : Number.NaN;
    return {
      ...sanitizeWalletInfo(raw2),
      serverTimeMs:
        Number.isSafeInteger(serverTimeMs) && serverTimeMs > 0
          ? serverTimeMs
          : void 0,
    };
  } catch (err) {
    creditLog.error("wallet.fetch_failed", {
      traceId: getLastGatewayTraceId(),
      error: err,
    });
    throw err;
  }
}
export const CREDIT_CACHE_GC_MS = 5 * 6e4;
export function useWalletQuery(options = {}) {
  const { isLoggedIn, isLoading } = useAuth();
  const { queryScope, canReadPersonalCredit } = useCreditAccountState();
  const enabled =
    !isLoading && isLoggedIn && queryScope !== null && canReadPersonalCredit;
  const query = useQuery({
    queryKey: queryScope
      ? creditQueryKeys.wallet(queryScope)
      : creditQueryKeys.unavailable("wallet"),
    queryFn: ({ signal }) => {
      if (!canReadPersonalCredit || !queryScope) {
        throw new Error(
          "Personal wallet queried without a readable account scope",
        );
      }
      return fetchWalletInfo(signal);
    },
    enabled,
    staleTime: 2e3,
    gcTime: CREDIT_CACHE_GC_MS,
    retry: false,
    refetchInterval: options.refetchInterval,
  });
  const loggedFailureRef = reactExports.useRef(false);
  const { isError, isRefetchError } = query;
  reactExports.useEffect(() => {
    if (isError || isRefetchError) {
      if (!loggedFailureRef.current) {
        loggedFailureRef.current = true;
        creditLog.warn("wallet.query_failed", {
          isError,
          isRefetchError,
          traceId: getLastGatewayTraceId(),
        });
      }
    } else {
      loggedFailureRef.current = false;
    }
  }, [isError, isRefetchError]);
  return enabled
    ? query
    : {
        ...query,
        data: void 0,
      };
}
