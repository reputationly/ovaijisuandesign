// changelog-table.jsx
import {
  useWSConnection,
  WSConnectionContext,
} from "../workspace/asset-lineage-query-key.js";
import reactExports from "react";
import { useGatewayBaseUrl } from "../infra/runtime-config.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DialogBackdrop, DialogClose$1 as DialogClose, DialogDescription$2 as DialogDescription, DialogPopup, DialogPortal$2 as DialogPortal, DialogRoot, DialogTitle$2 as DialogTitle } from "../infra/base-ui.js";
import { XIcon } from "../media-editing/lucide-icon-wraps.js";
import {
  useGatewayFetch,
  useGatewayScopeKey,
} from "../generation/use-model-catalog-scope-key.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  Button,
  mergeTailwindClasses as cn,
  useBrowserOverlayDialogProps,
} from "../infra/dialog-content.jsx";
import { buildWSUrl } from "../infra/gateway-http-error.jsx";
import { WSConnectionProviderCore } from "./ws-connection-provider-core.jsx";
export function WorkspaceWSConnectionProvider({
  children,
  wsUrl,
  syncCanvasAssetMetadata,
}) {
  const workspaceWsUrl = buildWSUrl(wsUrl);
  return (
    <WSConnectionProviderCore
      wsUrl={workspaceWsUrl}
      scope="workspace"
      syncCanvasAssetMetadata={syncCanvasAssetMetadata}
    >
      {children}
    </WSConnectionProviderCore>
  );
}
export function useOptionalWSConnection() {
  return reactExports.useContext(WSConnectionContext);
}
export function useWorkspaceWSConnection() {
  const ctx = useWSConnection();
  if (ctx.scope !== "workspace") {
    throw new Error(
      `useWorkspaceWSConnection must be used within WorkspaceWSConnectionProvider; got ${ctx.scope} gateway (${ctx.wsUrl}).`,
    );
  }
  return ctx;
}
export const BASE = "/api/memory";
export const COMPACTION_BASE = "/api/memory-compaction";
async function readError(res) {
  try {
    const data = await res.json();
    if (typeof data.message === "string") return data.message;
    if (Array.isArray(data.message)) return data.message.join("; ");
    if (data.error) return data.error;
  } catch {}
  return `${res.status} ${res.statusText}`;
}
export async function expectOk(res) {
  if (res.ok) return;
  throw new Error(await readError(res));
}
async function listMemory(fetcher, scope = "all") {
  const res = await fetcher(`${BASE}?scope=${encodeURIComponent(scope)}`);
  await expectOk(res);
  const data = await res.json();
  return data.entries;
}
async function readMemory(fetcher, scope, memoryName) {
  const res = await fetcher(`${BASE}/${scope}/${encodeURIComponent(memoryName)}`);
  await expectOk(res);
  return await res.json();
}
export async function deleteMemory(fetcher, scope, memoryName) {
  const res = await fetcher(`${BASE}/${scope}/${encodeURIComponent(memoryName)}`, {
    method: "DELETE",
  });
  await expectOk(res);
  return await res.json();
}
async function restoreSnapshot(fetcher, snapshotId) {
  const res = await fetcher(
    `${COMPACTION_BASE}/snapshots/${encodeURIComponent(snapshotId)}/restore`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scope: "user",
      }),
    },
  );
  await expectOk(res);
  return await res.json();
}
const ROOT_KEY = ["memory"];
export const memoryQueryKeys = {
  list: (scopeKey, scope) => [...ROOT_KEY, scopeKey, "list", scope],
  search: (scopeKey, query, scope, type) => [
    ...ROOT_KEY,
    scopeKey,
    "search",
    query,
    scope,
    type ?? "",
  ],
  entry: (scopeKey, scope, memoryName) => [
    ...ROOT_KEY,
    scopeKey,
    "entry",
    scope,
    memoryName,
  ],
  recentAuto: (scopeKey, options) => [
    ...ROOT_KEY,
    scopeKey,
    "recent-auto",
    options.lookbackMs ?? null,
    options.limit ?? null,
  ],
  /**
   * (ADR-010 Phase 3a) Compaction subtree -- preview/snapshots/config keys.
   * Folded under the same scopeKey so workspace switches still isolate
   * cache, and `scopeRoot` invalidation cascades through these too.
   *
   * No `scope` segment in the key: compaction is **user-scope only** (the
   * gateway controller rejects any other value at the edge), so all keys
   * implicitly target the user vault.
   */
  compaction: {
    preview: (scopeKey, force) => [
      ...ROOT_KEY,
      scopeKey,
      "compaction",
      "preview",
      force,
    ],
    snapshots: (scopeKey) => [...ROOT_KEY, scopeKey, "compaction", "snapshots"],
    config: (scopeKey) => [...ROOT_KEY, scopeKey, "compaction", "config"],
  },
  /** Invalidation root for the *current* scope -- mutations stay scope-local. */
  scopeRoot: (scopeKey) => [...ROOT_KEY, scopeKey],
};
export function useMemoryList(scope) {
  const baseUrl = useGatewayBaseUrl();
  const fetcher = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  return useQuery({
    queryKey: memoryQueryKeys.list(scopeKey, scope),
    queryFn: () => listMemory(fetcher, scope),
    enabled: Boolean(baseUrl),
    // The app QueryClient pins staleTime to Infinity so most data only loads
    // once. Memory is mutable from outside this UI (other windows, MCP tool
    // calls, the auto-extractor) so we want a fresh round-trip every time
    // the panel is opened. WS invalidation still handles in-session updates.
    refetchOnMount: "always",
  });
}
export function useMemoryEntry(scope, memoryName) {
  const baseUrl = useGatewayBaseUrl();
  const fetcher = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  return useQuery({
    queryKey:
      scope && memoryName
        ? memoryQueryKeys.entry(scopeKey, scope, memoryName)
        : ["memory", scopeKey, "entry", "noop"],
    queryFn: () => readMemory(fetcher, scope, memoryName),
    enabled: Boolean(baseUrl && scope && memoryName),
  });
}
export function useSnapshotRestore() {
  const fetcher = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ snapshotId }) => restoreSnapshot(fetcher, snapshotId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: memoryQueryKeys.scopeRoot(scopeKey),
      });
    },
  });
}
export function Sheet({ ...props }) {
  return (
    <DialogRoot data-slot="sheet" {...useBrowserOverlayDialogProps(props)} />
  );
}
function SheetPortal({ ...props }) {
  return <DialogPortal data-slot="sheet-portal" {...props} />;
}
function SheetOverlay({ className, ...props }) {
  return (
    <DialogBackdrop
      data-slot="sheet-overlay"
      className={cn(
        "modal-mask fixed inset-0 z-50 text-xs/relaxed transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  );
}
export function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}) {
  const { t } = useTranslation();
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPopup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "elevated-sheet-border fixed z-50 flex flex-col bg-popover bg-clip-padding text-xs/relaxed text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogClose
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">{t("common.close")}</span>
          </DialogClose>
        )}
      </DialogPopup>
    </SheetPortal>
  );
}
export function SheetHeader({ className, ...props }) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  );
}
export function SheetTitle({ className, ...props }) {
  return (
    <DialogTitle
      data-slot="sheet-title"
      className={cn(
        "font-heading text-sm font-medium text-foreground",
        className,
      )}
      {...props}
    />
  );
}
export function SheetDescription({ className, ...props }) {
  return (
    <DialogDescription
      data-slot="sheet-description"
      className={cn("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}
export function ChangelogTable({
  rows,
  limit,
  onRowClick,
  onRowHover,
  className,
}) {
  const { t } = useTranslation();
  const visibleRows = typeof limit === "number" ? rows.slice(0, limit) : rows;
  return (
    <div
      className={`flex-1 min-w-0 overflow-x-auto scrollbar-none ${className ?? ""}`}
    >
      <div className="flex items-center border-b border-border pb-3 pr-6 text-xs uppercase text-muted-foreground font-heading">
        <span className="w-[100px] shrink-0">{t("home.date")}</span>
        <span className="flex-1 min-w-0">{t("home.news")}</span>
        <span className="w-[100px] shrink-0 text-right">{t("home.type")}</span>
      </div>
      {visibleRows.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className="home-fade-up w-full group flex items-center border-b border-border py-5 pr-6 hover:bg-foreground/8 transition-colors duration-150 cursor-pointer text-left"
          style={{
            animationDelay: `${index * 30}ms`,
          }}
          onClick={() => onRowClick?.(item)}
          onMouseEnter={() => onRowHover?.(item)}
          onMouseLeave={() => onRowHover?.(null)}
        >
          <span className="w-[100px] shrink-0 text-xs font-heading text-muted-foreground">
            {item.date}
          </span>
          <span className="flex-1 min-w-0 text-lg font-medium truncate text-foreground group-hover:text-brand-accent transition-colors duration-150">
            {item.subtitle}
          </span>
          <div className="w-[100px] shrink-0 flex items-center justify-end">
            <span className="inline-flex rounded-lg border border-brand-accent/40 px-2.5 py-0.5 font-heading text-[11px] font-medium text-brand-accent">
              {item.version}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
