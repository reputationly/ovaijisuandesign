// use-online.jsx
import {
  cva,
  reactExports,
  Toggle$1 as Toggle,
  ToggleGroup$1,
  useMutation,
  useQueryClient,
} from "../vendor.js";
import {
  BASE,
  isRecord,
  readObject,
  ROOT_KEY,
  wrapAsAssetCenterError,
} from "../assets/wrap-as-asset-center-error.js";
import { useGatewayUrl } from "../generation/use-model-catalog-scope-key.js";
import { TRACK_EVENTS } from "./track-events.js";
import { trackEvent } from "./sanitize-track-props.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 as cn } from "./dialog-content.jsx";
import { ImportEntityConflictError } from "../assets/import-entity-conflict-error.js";
function extractConflictPayload(body2) {
  if (!isRecord(body2)) return null;
  if (isRecord(body2.existingEntity) && isRecord(body2.importedManifest)) {
    return body2;
  }
  const nested = body2.message;
  if (
    isRecord(nested) &&
    isRecord(nested.existingEntity) &&
    isRecord(nested.importedManifest)
  ) {
    return nested;
  }
  return null;
}
async function importEntity(buildUrl, file, mode2 = "create-new") {
  const form = new FormData();
  form.append("file", file);
  const params = new URLSearchParams();
  if (mode2 !== "create-new") params.set("mode", mode2);
  const qs = params.toString();
  const path2 = `${BASE}/import${qs ? `?${qs}` : ""}`;
  const url2 = buildUrl(path2);
  if (!url2) {
    throw new Error("Gateway not ready");
  }
  const controller = new AbortController();
  const timer2 = setTimeout(() => controller.abort(), 18e4);
  let res;
  try {
    res = await fetch(url2, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer2);
  }
  if (res.status === 409) {
    let body2;
    try {
      body2 = await res.json();
    } catch {
      throw new Error(`Import failed: 409 ${res.statusText}`);
    }
    const payload = extractConflictPayload(body2);
    if (payload) {
      throw new ImportEntityConflictError(payload);
    }
    throw new Error(`Import failed: 409 ${res.statusText}`);
  }
  if (!res.ok) {
    throw await wrapAsAssetCenterError(res);
  }
  return readObject(res, "import entity result");
}
export function useOnline() {
  const [online, setOnline] = reactExports.useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  reactExports.useEffect(() => {
    let mounted = true;
    let browserEventVersion = 0;
    const networkBridge = window.hilo?.network;
    const hasBridgeStatus = typeof networkBridge?.getStatus === "function";
    const readNavigatorOnline = () =>
      typeof navigator === "undefined" ? true : navigator.onLine;
    if (hasBridgeStatus && networkBridge) {
      const bridgeStatusRequestVersion = browserEventVersion;
      void networkBridge
        .getStatus()
        .then((status) => {
          if (mounted && browserEventVersion === bridgeStatusRequestVersion) {
            setOnline(status.online);
          }
        })
        .catch(() => {
          if (mounted && browserEventVersion === bridgeStatusRequestVersion) {
            setOnline(readNavigatorOnline());
          }
        });
    }
    const handleOnline = () => {
      browserEventVersion += 1;
      if (mounted) setOnline(true);
    };
    const handleOffline = () => {
      browserEventVersion += 1;
      if (mounted) setOnline(false);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const unsubscribeBridge = networkBridge?.onStatusChanged?.((nextOnline) => {
      if (mounted) setOnline(nextOnline);
    });
    if (!hasBridgeStatus) setOnline(readNavigatorOnline());
    return () => {
      mounted = false;
      unsubscribeBridge?.();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  return online;
}
export function jsonInit(method, body2) {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body2),
  };
}
function exportEntityUrl(buildUrl, entityId) {
  return buildUrl(`${BASE}/entities/${encodeURIComponent(entityId)}/export`);
}
export function classifyAssetError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  const lower2 = msg.toLowerCase();
  if (
    lower2.includes("network") ||
    lower2.includes("fetch") ||
    lower2.includes("econnrefused")
  )
    return "network";
  if (lower2.includes("timeout") || lower2.includes("timed out"))
    return "timeout";
  if (lower2.includes("conflict") || lower2.includes("409")) return "conflict";
  if (
    lower2.includes("valid") ||
    lower2.includes("required") ||
    lower2.includes("400")
  )
    return "validation";
  return "unknown";
}
export function trackAssetCreate(props) {
  trackEvent(TRACK_EVENTS.ASSET_CREATE, props);
}
export function trackAssetCenterAction(props) {
  const eventName = (() => {
    if (props.action === "search") return TRACK_EVENTS.ASSET_CENTER_SEARCH;
    if (props.action === "type_filter") return TRACK_EVENTS.ASSET_CENTER_FILTER;
    if (props.action === "sort") return TRACK_EVENTS.ASSET_CENTER_SORT_CHANGE;
    if (props.action === "view_mode")
      return TRACK_EVENTS.ASSET_CENTER_VIEW_CHANGE;
    if (
      props.action === "create_dialog_open" ||
      props.action === "create_dialog_close" ||
      props.action === "entity_type_change" ||
      props.action === "attachment_add" ||
      props.action === "attachment_picker_open" ||
      props.action === "attachment_remove" ||
      props.action === "edit_dialog_close" ||
      props.action === "tags_toggle" ||
      props.action === "tag_toggle" ||
      props.action === "custom_tag_add" ||
      props.action === "field_complete"
    ) {
      return props.surface === "edit_dialog"
        ? TRACK_EVENTS.ASSET_EDIT_FORM_ACTION
        : TRACK_EVENTS.ASSET_CREATE_FORM_ACTION;
    }
    if (props.action === "entity_export") return TRACK_EVENTS.ASSET_EXPORT;
    if (props.action === "entity_detail_view")
      return TRACK_EVENTS.ASSET_DETAIL_VIEW;
    if (
      props.action === "entity_delete" ||
      props.action === "delete_dialog_open"
    ) {
      return TRACK_EVENTS.ASSET_DELETE;
    }
    if (
      props.action === "materialize_dialog_open" ||
      props.action === "materialize_dialog_close"
    ) {
      return TRACK_EVENTS.ASSET_MATERIALIZE_DIALOG;
    }
    return TRACK_EVENTS.ASSET_CENTER_ACTION;
  })();
  trackEvent(eventName, props);
}
export function useImportEntity() {
  const queryClient2 = useQueryClient();
  const buildUrl = useGatewayUrl();
  return useMutation({
    mutationFn: ({ file, mode: mode2 }) => importEntity(buildUrl, file, mode2),
    onSuccess: () => {
      queryClient2.invalidateQueries({
        queryKey: ROOT_KEY,
      });
    },
  });
}
export function useExportEntityUrl() {
  const buildUrl = useGatewayUrl();
  return (entityId) => exportEntityUrl(buildUrl, entityId);
}
export const ENTITY_DRAG_MIME = "application/x-hilo-asset-entity";
export function writeEntityDragData(e2, payload) {
  e2.dataTransfer?.setData(ENTITY_DRAG_MIME, JSON.stringify(payload));
  if (e2.dataTransfer) e2.dataTransfer.effectAllowed = "copy";
}
export const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1 rounded-sm text-xs font-medium whitespace-nowrap transition-all outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-pressed:bg-muted data-[state=on]:bg-muted dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent hover:bg-muted",
      },
      size: {
        default:
          "h-8 min-w-8 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        sm: "h-7 min-w-7 rounded-sm px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
        lg: "h-9 min-w-9 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
const ToggleGroupContext = reactExports.createContext({
  size: "default",
  variant: "default",
  spacing: 0,
  orientation: "horizontal",
});
export function ToggleGroup({
  className,
  variant,
  size: size2,
  spacing = 0,
  orientation = "horizontal",
  children: children2,
  ...props
}) {
  return (
    <ToggleGroup$1
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size2}
      data-spacing={spacing}
      data-orientation={orientation}
      style={{
        "--gap": spacing,
      }}
      className={cn(
        "group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] rounded-sm data-[size=sm]:rounded-sm data-vertical:flex-col data-vertical:items-stretch",
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider
        value={{
          variant,
          size: size2,
          spacing,
          orientation,
        }}
      >
        {children2}
      </ToggleGroupContext.Provider>
    </ToggleGroup$1>
  );
}
export function ToggleGroupItem({
  className,
  children: children2,
  variant = "default",
  size: size2 = "default",
  ...props
}) {
  const context = reactExports.useContext(ToggleGroupContext);
  return (
    <Toggle
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size2}
      data-spacing={context.spacing}
      className={cn(
        "shrink-0 group-data-[spacing=0]/toggle-group:rounded-sm group-data-[spacing=0]/toggle-group:px-2 focus:z-10 focus-visible:z-10 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-end]:pr-1.5 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-start]:pl-1.5 group-data-horizontal/toggle-group:data-[spacing=0]:first:rounded-sm group-data-vertical/toggle-group:data-[spacing=0]:first:rounded-sm group-data-horizontal/toggle-group:data-[spacing=0]:last:rounded-sm group-data-vertical/toggle-group:data-[spacing=0]:last:rounded-sm group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:first:[border-left-width:var(--control-border-width)] group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:first:[border-top-width:var(--control-border-width)]",
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size2,
        }),
        className,
      )}
      {...props}
    >
      {children2}
    </Toggle>
  );
}
