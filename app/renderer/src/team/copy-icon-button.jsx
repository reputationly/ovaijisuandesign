// copy-icon-button.jsx
import { services } from "../vendor-inline/vscode-base/graph.jsx";
import {
  IDesktopSettingsMainService,
  INetworkDiagnosticsMainService,
} from "../workspace/home-service.jsx";
import { isElectron } from "../infra/use-canvas-node-assets-store.js";
import {
  AlertTriangle,
  Check,
  Copy,
  dedupedToast,
  reactExports,
  useQuery,
  useTranslation,
} from "../vendor.js";
import { ACTIVE_CUSTOM_MODEL_QUERY_KEY } from "../generation/use-model-catalog-scope-key.js";
import { __jsx } from "../shared/jsx-runtime.js";

export function SummaryRow({ label, value }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-4 rounded-md px-2.5 py-1">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-sm text-foreground">
        {value}
      </span>
    </div>
  );
}

export function BlockGroup({ title, items }) {
  return (
    <div
      role="alert"
      className="space-y-1.5 rounded-lg border border-border bg-muted p-3 text-xs text-foreground"
    >
      <div className="font-medium">{title}</div>
      {items.map((item) => (
        <p key={item} className="flex gap-2">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0"
            strokeWidth={1.5}
            aria-hidden={true}
          />
          <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
            {item}
          </span>
        </p>
      ))}
    </div>
  );
}

export function roleLabelKey(role) {
  switch (role) {
    case "OWNER":
      return "team.role.owner";
    case "ADMIN":
      return "team.role.admin";
    default:
      return "team.role.member";
  }
}

export function CopyIconButton({ value, label, actionId }) {
  const { t: t2 } = useTranslation();
  const [copied, setCopied] = reactExports.useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      data-action-ui-id={actionId}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          dedupedToast.error(t2("common.copyFailed"));
        }
      }}
      className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
    >
      {copied ? (
        <Check size={13} strokeWidth={2} className="text-primary" />
      ) : (
        <Copy size={13} strokeWidth={1.5} />
      )}
    </button>
  );
}

export function countChars(value) {
  return Array.from(value).length;
}

let service = null;

export function getNetworkDiagnosticsMainService() {
  if (!service) {
    service = services.get(INetworkDiagnosticsMainService);
  }
  return service;
}

let _service$4 = null;

export function getDesktopSettingsMainService() {
  if (!_service$4) {
    _service$4 = services.get(IDesktopSettingsMainService);
  }
  return _service$4;
}

const desktopSettingsMainService = Object.freeze(
  Object.defineProperty(
    {
      __proto__: null,
      getDesktopSettingsMainService,
    },
    Symbol.toStringTag,
    {
      value: "Module",
    },
  ),
);

export async function readActiveCustomModel() {
  if (!isElectron()) return null;
  let timer2;
  try {
    return await Promise.race([
      (async () => {
        const {
          getDesktopSettingsMainService: getDesktopSettingsMainService2,
        } = await Promise.resolve().then(() => desktopSettingsMainService);
        return {
          getDesktopSettingsMainService: getDesktopSettingsMainService2,
        };
      })().then(
        ({ getDesktopSettingsMainService: getDesktopSettingsMainService2 }) =>
          getDesktopSettingsMainService2().getActiveCustomModel(),
      ),
      new Promise((_2, reject) => {
        timer2 = setTimeout(
          () => reject(new Error("Custom model configuration is unavailable")),
          5e3,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer2);
  }
}

export function useActiveCustomModel() {
  return useQuery({
    queryKey: ACTIVE_CUSTOM_MODEL_QUERY_KEY,
    queryFn: readActiveCustomModel,
    retry: 2,
    retryDelay: 300,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchInterval: (query) =>
      query.state.data?.applyStatus === "pending" ? 1e3 : false,
  });
}
