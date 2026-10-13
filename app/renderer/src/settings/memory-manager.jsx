// memory-manager.jsx
import { API_PATHS, getRuntimeConfig, jsxRuntimeExports, LoaderCircle, normalizeGatewayBaseUrl, Plus, reactExports, RotateCcw, Search, Undo2, useCurrentWorkspace, useGatewayBaseUrl, useMutation, useQuery, useQueryClient, useStorage, useTranslation, WandSparkles } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  BASE,
  COMPACTION_BASE,
  deleteMemory,
  expectOk,
  memoryQueryKeys,
  useMemoryEntry,
  useMemoryList,
  useSnapshotRestore,
} from "./changelog-table.jsx";
import {
  AlertDialog,
  Button,
  cn$2 as cn,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
} from "../infra/badge-variants.jsx";
import {
  useGatewayFetch,
  useGatewayScopeKey,
} from "../generation/use-model-catalog-scope-key.js";
import {
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import {
  History,
  ImageOutlineIcon,
  Sparkles,
  Trash2,
} from "../media-editing/package.jsx";
import { gatewayUrl } from "../infra/gateway-http-error.jsx";
import { PencilIcon } from "../workspace/home-service.jsx";
import { CompactRewriteFlow } from "./compact-rewrite-flow.jsx";
import { useWSConnection } from "../workspace/asset-lineage-query-key.js";
import { MemoryEditDialog } from "./memory-edit-dialog.jsx";
import { Select } from "../assets/credit-query-keys.jsx";
import {
  Input3,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../infra/select-content.jsx";
import { RetryIcon } from "../workspace/use-prompt-icon.jsx";
import { Switch } from "../generation/select-content.jsx";
import { MEMORY_TYPES } from "../generation/to-workspace-browser-url.js";
import { Alert, AlertDescription } from "../team/alert-variants.jsx";
import { useSettings } from "./use-settings.js";
async function searchMemory(fetcher, query, scope = "all", type2) {
  const params = new URLSearchParams({
    q: query,
    scope,
  });
  const res = await fetcher(`${BASE}/search?${params.toString()}`);
  await expectOk(res);
  const data2 = await res.json();
  return data2.entries;
}
async function listRecentAutoFeedback(fetcher, options = {}) {
  const params = new URLSearchParams();
  if (options.lookbackMs !== void 0)
    params.set("lookback_ms", String(options.lookbackMs));
  if (options.limit !== void 0) params.set("limit", String(options.limit));
  const suffix = params.toString();
  const res = await fetcher(
    suffix ? `${BASE}/recent-auto?${suffix}` : `${BASE}/recent-auto`,
  );
  await expectOk(res);
  const data2 = await res.json();
  return data2.entries ?? [];
}
async function listSnapshots(fetcher) {
  const params = new URLSearchParams({
    scope: "user",
  });
  const res = await fetcher(
    `${COMPACTION_BASE}/snapshots?${params.toString()}`,
  );
  await expectOk(res);
  const data2 = await res.json();
  return data2.snapshots ?? [];
}
function useMemoryWSInvalidation() {
  const { subscribe: subscribe2 } = useWSConnection();
  const queryClient2 = useQueryClient();
  const scopeKey = useGatewayScopeKey();
  reactExports.useEffect(() => {
    return subscribe2((msg) => {
      if (msg.type !== "memory_changed") return;
      const evt = msg;
      queryClient2.invalidateQueries({
        queryKey: memoryQueryKeys.scopeRoot(scopeKey),
      });
      queryClient2.removeQueries({
        queryKey: memoryQueryKeys.entry(scopeKey, evt.scope, evt.name),
      });
    });
  }, [subscribe2, queryClient2, scopeKey]);
}
function useMemorySearch(query, scope, type2) {
  const baseUrl = useGatewayBaseUrl();
  const fetcher = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  const trimmed = query.trim();
  return useQuery({
    queryKey: memoryQueryKeys.search(scopeKey, trimmed, scope, type2),
    queryFn: () => searchMemory(fetcher, trimmed, scope),
    enabled: Boolean(baseUrl) && trimmed.length > 0,
  });
}
function useMemoryDelete() {
  const fetcher = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  const queryClient2 = useQueryClient();
  return useMutation({
    mutationFn: ({ scope, name: name2 }) => deleteMemory(fetcher, scope, name2),
    onSuccess: () => {
      queryClient2.invalidateQueries({
        queryKey: memoryQueryKeys.scopeRoot(scopeKey),
      });
    },
  });
}
function useRecentAutoFeedback(options = {}) {
  const baseUrl = useGatewayBaseUrl();
  const fetcher = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  return useQuery({
    queryKey: memoryQueryKeys.recentAuto(scopeKey, options),
    queryFn: () => listRecentAutoFeedback(fetcher, options),
    // See `useMemoryList` -- the global staleTime: Infinity default would
    // otherwise serve cached entries forever after the first open, hiding
    // anything the auto-extractor wrote while the panel was closed.
    refetchOnMount: "always",
    enabled: Boolean(baseUrl),
  });
}
function useSnapshotsList() {
  const fetcher = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  return useQuery({
    queryKey: memoryQueryKeys.compaction.snapshots(scopeKey),
    queryFn: () => listSnapshots(fetcher),
    refetchOnMount: "always",
  });
}
function CompactRewritePage({ onClose, onBusyChange }) {
  return (
    <CompactRewriteFlow
      open={true}
      surface="page"
      onClose={onClose}
      onBusyChange={onBusyChange}
    />
  );
}
function MemoryDeleteConfirm({
  open,
  onOpenChange,
  scope,
  name: name2,
  loading,
  onConfirm,
}) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-action-ui-id="settings.memory.delete-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("memory.deleteTitle", "Delete memory?")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              "memory.deleteDesc",
              "This permanently removes the markdown file. The agent will lose this memory immediately.",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-1 border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-xs">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">
              {t("memory.fieldScope", "Scope")}:
            </span>{" "}
            {scope}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">
              {t("memory.fieldName", "Name")}:
            </span>{" "}
            <span className="font-mono">{name2}</span>
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={loading}
            data-action-ui-id="settings.memory.delete-cancel"
          >
            {t("common.cancel", "Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(clickEvent) => {
              clickEvent.preventDefault();
              void onConfirm();
            }}
            data-action-ui-id="settings.memory.delete-confirm-button"
          >
            {loading
              ? t("common.deleting", "Deleting…")
              : t("common.delete", "Delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
const ASSET_URI_RE = /^hilo:\/\/asset\/([a-zA-Z0-9_-]+)$/;
function parseAssetUri(uri) {
  if (!uri) return void 0;
  const match2 = uri.match(ASSET_URI_RE);
  return match2 ? match2[1] : void 0;
}
function AssetPinPreview({ scope, name: name2 }) {
  const { t } = useTranslation();
  const entry = useMemoryEntry(scope, name2);
  if (entry.isLoading) {
    return (
      <div className="flex h-16 w-16 items-center justify-center bg-muted text-muted-foreground">
        <ImageOutlineIcon size={16} strokeWidth={1.5} />
      </div>
    );
  }
  const fm = entry.data?.frontmatter;
  const assetId = parseAssetUri(fm?.asset_uri);
  const modality = fm?.asset_modality;
  if (!assetId) {
    return (
      <div className="flex h-16 items-center px-2 text-[11px] text-muted-foreground">
        {t("memory.assetMissing", "asset_uri missing or malformed")}
      </div>
    );
  }
  const src = gatewayUrl(API_PATHS.serveFileById(assetId));
  if (!src) {
    return (
      <div className="flex h-16 items-center px-2 text-[11px] text-muted-foreground">
        {t("memory.gatewayUnavailable", "Gateway unavailable")}
      </div>
    );
  }
  if (modality === "video") {
    return (
      <video
        src={src}
        className="h-16 w-16 bg-muted object-cover"
        muted={true}
        playsInline={true}
        preload="metadata"
      >
        <track kind="captions" />
      </video>
    );
  }
  if (modality === "audio") {
    return (
      <audio
        controls={true}
        src={src}
        className="h-8 w-full max-w-xs"
        preload="metadata"
      >
        <track kind="captions" />
      </audio>
    );
  }
  return (
    <img
      src={src}
      alt={fm?.description ?? name2}
      className="h-16 w-16 bg-muted object-cover"
      onError={(errorEvent) => {
        const target = errorEvent.currentTarget;
        target.style.display = "none";
      }}
    />
  );
}
const TYPE_VARIANT = {
  user: "secondary",
  feedback: "secondary",
  project: "secondary",
  reference: "outline",
  "media-style": "secondary",
  "asset-pin": "secondary",
};
function MemoryList({ scopeLabel, entries: entries2, onEdit, onDelete }) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {scopeLabel}
        </span>
        <span className="text-xs text-muted-foreground">{entries2.length}</span>
      </header>
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border overflow-hidden">
        {entries2.map((entry) => {
          const matchedIn =
            "match_in" in entry && Array.isArray(entry.match_in)
              ? entry.match_in
              : void 0;
          return (
            <li
              key={`${entry.scope}/${entry.name}`}
              className="flex flex-col gap-1.5 px-3 py-2"
              data-action-ui-id={`settings.memory.row.${entry.scope}.${entry.name}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-mono text-xs text-foreground">
                      {entry.name}
                    </span>
                    <Badge variant={TYPE_VARIANT[entry.type]}>
                      {t(`memory.type.${entry.type}`, entry.type)}
                    </Badge>
                    {matchedIn && matchedIn.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Badge variant="outline" className="text-[10px]">
                              {matchedIn.includes("body") &&
                              matchedIn.includes("description")
                                ? t("memory.matchBoth", "desc+body")
                                : matchedIn.includes("body")
                                  ? t("memory.matchBody", "body")
                                  : t("memory.matchDescription", "desc")}
                            </Badge>
                          }
                        />
                        <TooltipContent>
                          {t("memory.matchTooltip", "Search matched in: ") +
                            matchedIn.join(", ")}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <p
                    className={cn(
                      "line-clamp-2 text-xs text-muted-foreground",
                      !entry.description && "italic",
                    )}
                  >
                    {entry.description ||
                      t("memory.noDescription", "(no description)")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onEdit(entry)}
                    aria-label={t("common.edit", "Edit")}
                    data-action-ui-id={`settings.memory.edit.${entry.scope}.${entry.name}`}
                  >
                    <PencilIcon size={12} strokeWidth={1.5} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onDelete(entry)}
                    aria-label={t("common.delete", "Delete")}
                    data-action-ui-id={`settings.memory.delete.${entry.scope}.${entry.name}`}
                  >
                    <Trash2 size={12} strokeWidth={1.5} />
                  </Button>
                </div>
              </div>
              {entry.type === "asset-pin" && (
                <AssetPinPreview scope={entry.scope} name={entry.name} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
function formatRelativeAge(iso, nowMs = Date.now()) {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return iso;
  const diffSec = Math.max(0, Math.round((nowMs - timestamp) / 1e3));
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d`;
}
function RecentAutoFeedbackList({ lookbackMs }) {
  const { t } = useTranslation();
  const query = useRecentAutoFeedback({
    lookbackMs,
  });
  const deleteMutation = useMemoryDelete();
  const entries2 = query.data ?? [];
  if (!query.isLoading && entries2.length === 0) {
    return null;
  }
  async function handleUndo(entry) {
    try {
      const res = await deleteMutation.mutateAsync({
        scope: entry.scope,
        name: entry.name,
      });
      if (res.deleted) {
        dedupedToast.success(
          t("memory.autoPanel.undoSuccess", "Undone — entry removed"),
        );
      } else {
        dedupedToast.info(
          t("memory.autoPanel.undoNotFound", "Entry was already removed"),
        );
      }
    } catch (err) {
      dedupedToast.error(
        t("memory.autoPanel.undoFailed", "Undo failed") +
          (err instanceof Error ? `: ${err.message}` : ""),
      );
    }
  }
  return (
    <section
      className="flex flex-col gap-2"
      data-action-ui-id="settings.memory.recent-auto.panel"
    >
      <header className="flex items-center gap-2">
        <Sparkles
          size={12}
          strokeWidth={1.5}
          className="text-muted-foreground"
        />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("memory.autoPanel.title", "Recently learnt")}
        </span>
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">{entries2.length}</span>
      </header>
      {query.isError ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          {t(
            "memory.autoPanel.loadFailed",
            "Could not load recent auto-extractions",
          )}
        </p>
      ) : query.isLoading && entries2.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          {t("common.loading", "Loading…")}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
          {entries2.map((entry) => (
            <li
              key={`${entry.scope}/${entry.name}`}
              className="flex items-start gap-3 px-3 py-2"
              data-action-ui-id={`settings.memory.recent-auto.row.${entry.scope}.${entry.name}`}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate font-mono text-xs text-foreground">
                    {entry.name}
                  </span>
                  <Badge variant="secondary">
                    {t(`memory.type.${entry.type}`, entry.type)}
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Badge variant="outline" className="text-[10px]">
                          {formatRelativeAge(entry.extracted_at)}
                        </Badge>
                      }
                    />
                    <TooltipContent>{entry.extracted_at}</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">
                  {entry.description ||
                    t("memory.noDescription", "(no description)")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => void handleUndo(entry)}
                disabled={deleteMutation.isPending}
                data-action-ui-id={`settings.memory.recent-auto.undo.${entry.scope}.${entry.name}`}
              >
                <Undo2 size={12} strokeWidth={1.5} />
                {t("memory.autoPanel.undo", "Undo")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
function formatBytes(bytes2) {
  if (!Number.isFinite(bytes2) || bytes2 <= 0) return "0 B";
  if (bytes2 < 1024) return `${bytes2} B`;
  if (bytes2 < 1024 * 1024) return `${(bytes2 / 1024).toFixed(1)} KB`;
  return `${(bytes2 / (1024 * 1024)).toFixed(2)} MB`;
}
function relativeFromNow(iso, nowMs = Date.now()) {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  const diffSec = Math.max(0, Math.round((nowMs - ts) / 1e3));
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d`;
}
function SnapshotList({ onRequestRestore }) {
  const { t } = useTranslation();
  const query = useSnapshotsList();
  const snapshots2 = query.data ?? [];
  if (query.isLoading && snapshots2.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-xs text-muted-foreground">
        <LoaderCircle size={16} strokeWidth={1.5} className="animate-spin" />
        <span>{t("common.loading", "Loading…")}</span>
      </div>
    );
  }
  if (query.isError) {
    return (
      <p className="px-3 py-2 text-xs text-destructive">
        {query.error instanceof Error
          ? query.error.message
          : t("memory.snapshots.loadFailed", "无法加载快照列表")}
      </p>
    );
  }
  if (snapshots2.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-10 text-center">
        <p className="text-sm font-medium text-foreground">
          {t("memory.snapshots.empty", "暂无快照")}
        </p>
        <p className="max-w-sm text-xs text-muted-foreground">
          {t(
            "memory.snapshots.emptyDesc",
            "当 agent 第一次整理记忆，或你手动触发整理后，会在这里看到快照。",
          )}
        </p>
      </div>
    );
  }
  return (
    <ul
      className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border"
      data-action-ui-id="settings.memory.snapshots.list.user"
    >
      {snapshots2.map((snap) => (
        <li
          key={snap.id}
          className="flex flex-col gap-1 px-3 py-2"
          data-action-ui-id={`settings.memory.snapshots.row.user.${snap.id}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant={snap.reason === "manual" ? "outline" : "secondary"}
                >
                  {snap.reason === "manual"
                    ? t("memory.snapshots.reasonManual", "手动")
                    : t("memory.snapshots.reasonCompaction", "整理")}
                </Badge>
                <span
                  className="text-xs text-muted-foreground"
                  title={snap.createdAt}
                >
                  {relativeFromNow(snap.createdAt)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t("memory.snapshots.entryCount", {
                  count: snap.entryCount,
                  bytes: formatBytes(snap.bytes),
                  defaultValue: "{{count}} 条 · {{bytes}}",
                })}
              </p>
              {snap.summary && (
                <p className="text-[10px] text-muted-foreground">
                  {t("memory.snapshots.summary", {
                    deleted: snap.summary.deleted,
                    merged: snap.summary.merged,
                    freed: formatBytes(snap.summary.freedBytes),
                    defaultValue:
                      "触发整理: 删除 {{deleted}} · 合并 {{merged}} · 释放 {{freed}}",
                  })}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onRequestRestore(snap)}
              data-action-ui-id={`settings.memory.snapshots.restore.${snap.id}`}
            >
              <RotateCcw size={12} strokeWidth={1.5} />
              {t("memory.snapshots.restore", "恢复")}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
function RestoreConfirm({ snapshot: snapshot2, onClose, onRestored }) {
  const { t } = useTranslation();
  const restore = useSnapshotRestore();
  async function handleConfirm() {
    try {
      const res = await restore.mutateAsync({
        snapshotId: snapshot2.id,
      });
      dedupedToast.success(
        t("memory.snapshots.restoreDoneToast", {
          count: res.restored,
          defaultValue: "已从快照恢复 {{count}} 条记忆",
        }),
      );
      onRestored();
    } catch (err) {
      dedupedToast.error(
        t("memory.snapshots.restoreFailedToast", "恢复快照失败") +
          (err instanceof Error ? `: ${err.message}` : ""),
      );
    }
  }
  return (
    <AlertDialog open={true} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent data-action-ui-id="settings.memory.snapshots.restore-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("memory.snapshots.restoreConfirmTitle", "恢复到此快照?")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              "memory.snapshots.restoreConfirmDesc",
              "这将覆盖当前范围的全部记忆。系统会先把当前状态快照备份一份作为回退点。",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-1 border-l-2 border-primary bg-primary/5 px-3 py-2 text-xs">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">
              {t("memory.snapshots.snapshotIdLabel", "快照")}:
            </span>{" "}
            <span className="font-mono">{snapshot2.id}</span>
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">
              {t("memory.snapshots.entryCountLabel", "条目")}:
            </span>{" "}
            {snapshot2.entryCount}
            {" ("}
            {formatBytes(snapshot2.bytes)})
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={restore.isPending}
            data-action-ui-id="settings.memory.snapshots.restore-cancel"
          >
            {t("memory.compaction.cancel", "取消")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={restore.isPending}
            onClick={(clickEvent) => {
              clickEvent.preventDefault();
              void handleConfirm();
            }}
            data-action-ui-id="settings.memory.snapshots.restore-confirm-button"
          >
            {restore.isPending
              ? t("memory.snapshots.restoring", "恢复中…")
              : t("memory.snapshots.restore", "恢复")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
function SnapshotsContent({ onRestored }) {
  const [pendingRestore, setPendingRestore] = reactExports.useState(null);
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <SnapshotList onRequestRestore={(snap) => setPendingRestore(snap)} />
      </div>
      {pendingRestore && (
        <RestoreConfirm
          snapshot={pendingRestore}
          onClose={() => setPendingRestore(null)}
          onRestored={() => {
            setPendingRestore(null);
            onRestored?.();
          }}
        />
      )}
    </>
  );
}
function SnapshotsPage({ onRestored }) {
  const { t } = useTranslation();
  return (
    <div
      className="flex min-h-[460px] flex-col gap-4"
      data-action-ui-id="settings.memory.snapshots.page"
    >
      <p className="max-w-2xl text-sm text-muted-foreground">
        {t(
          "memory.snapshots.subtitle",
          "查看自动 / 手动快照，可一键恢复整个范围的记忆。恢复前会再做一份当前状态快照。",
        )}
      </p>
      <SnapshotsContent onRestored={onRestored} />
    </div>
  );
}
const TYPE_FILTER_ALL = "__all__";
const FILTER_SELECT_TRIGGER_CLASS =
  "h-8 rounded-md border-border! bg-muted/30! px-2.5 text-xs font-normal text-foreground/70 hover:bg-foreground/[0.03]! hover:text-foreground";
const FILTER_SELECT_CONTENT_CLASS = "bg-popover! p-1";
const FILTER_SELECT_ITEM_CLASS =
  "h-7 rounded-md py-1.5 pr-8 pl-2.5 text-xs font-normal text-foreground/70 focus:bg-popup-item-hover! focus:text-foreground! data-[highlighted]:bg-popup-item-hover! data-[highlighted]:text-foreground!";
function scopeFilterLabel(scopeFilter, t) {
  if (scopeFilter === "all") return t("memory.scopeAll", "All scopes");
  if (scopeFilter === "project") return t("memory.scopeProject", "Project");
  return t("memory.scopeUser", "User");
}
function typeFilterLabel(typeFilter, t) {
  if (typeFilter === TYPE_FILTER_ALL) return t("memory.typeAll", "All types");
  return t(`memory.type.${typeFilter}`, typeFilter);
}
function EmptyState({ searching }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
      <p className="text-sm font-medium text-foreground">
        {searching
          ? t("memory.emptySearch", "No matching memory")
          : t("memory.empty", "No memory yet")}
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">
        {searching
          ? t(
              "memory.emptySearchDesc",
              "Try a different keyword or clear the filters.",
            )
          : t(
              "memory.emptyDesc",
              'Memory captures lasting user / project preferences. Click "New" to create one, or let the agent persist them automatically.',
            )}
      </p>
    </div>
  );
}
export function MemoryManager({ onHeaderChange } = {}) {
  const { t } = useTranslation();
  const scopeBaseUrl = useGatewayBaseUrl();
  const gatewayResolving = !scopeBaseUrl;
  const appBaseUrl = reactExports.useMemo(
    () => normalizeGatewayBaseUrl(getRuntimeConfig().gatewayUrl),
    [],
  );
  const hasWorkspace = Boolean(scopeBaseUrl) && scopeBaseUrl !== appBaseUrl;
  const workspaceDir = useCurrentWorkspace();
  useMemoryWSInvalidation();
  const queryClient2 = useQueryClient();
  const scopeKey = useGatewayScopeKey();
  reactExports.useEffect(() => {
    queryClient2.invalidateQueries({
      queryKey: memoryQueryKeys.scopeRoot(scopeKey),
    });
  }, [queryClient2, scopeKey]);
  const { config: settingsConfig, set: setSetting } = useSettings();
  const autoFeedbackEnabled = settingsConfig.autoFeedbackEnabled ?? false;
  const compactionEnabled = settingsConfig.compactionEnabled ?? true;
  const [workspacePreferences, setWorkspacePreferences] = useStorage(
    "workspace.preferences",
  );
  const loadUserMemory = workspacePreferences.loadUserMemory ?? true;
  const [scopeFilter, setScopeFilter] = reactExports.useState("all");
  const [typeFilter, setTypeFilter] = reactExports.useState(TYPE_FILTER_ALL);
  const [query, setQuery] = reactExports.useState("");
  const [debouncedQuery, setDebouncedQuery] = reactExports.useState("");
  const [editorState, setEditorState] = reactExports.useState(null);
  const [pendingDelete, setPendingDelete] = reactExports.useState(null);
  const [secondaryPage, setSecondaryPage] = reactExports.useState(null);
  const [secondaryBackDisabled, setSecondaryBackDisabled] =
    reactExports.useState(false);
  const [refreshFlipped, setRefreshFlipped] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!hasWorkspace && scopeFilter === "project") {
      setScopeFilter("all");
    }
  }, [hasWorkspace, scopeFilter]);
  reactExports.useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(id);
  }, [query]);
  reactExports.useEffect(() => {
    if (!onHeaderChange) return;
    if (!secondaryPage) {
      onHeaderChange(null);
      return;
    }
    onHeaderChange({
      title:
        secondaryPage === "compaction"
          ? t("memory.compaction.rewrite.title", "Rewrite memories with AI")
          : t("memory.snapshots.title", "Snapshots"),
      onBack: () => setSecondaryPage(null),
      backLabel: t("common.back", "Back"),
      backDisabled: secondaryBackDisabled,
    });
    return () => onHeaderChange(null);
  }, [onHeaderChange, secondaryBackDisabled, secondaryPage, t]);
  const listQuery = useMemoryList(scopeFilter);
  const searchQuery = useMemorySearch(debouncedQuery, scopeFilter);
  const deleteMutation = useMemoryDelete();
  const isSearching = debouncedQuery.length > 0;
  const baseEntries = isSearching
    ? (searchQuery.data ?? [])
    : (listQuery.data ?? []);
  const visibleEntries = reactExports.useMemo(() => {
    return baseEntries.filter((entry) => {
      if (typeFilter !== TYPE_FILTER_ALL && entry.type !== typeFilter)
        return false;
      return true;
    });
  }, [baseEntries, typeFilter]);
  const { project: project2, user } = reactExports.useMemo(() => {
    const project22 = visibleEntries.filter((entry) => entry.scope === "project");
    const user2 = visibleEntries.filter((entry) => entry.scope === "user");
    return {
      project: project22,
      user: user2,
    };
  }, [visibleEntries]);
  const loading = isSearching ? searchQuery.isLoading : listQuery.isLoading;
  const errorObj = isSearching ? searchQuery.error : listQuery.error;
  const errorMsg =
    !gatewayResolving && errorObj instanceof Error ? errorObj.message : void 0;
  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      const res = await deleteMutation.mutateAsync(pendingDelete);
      if (res.deleted) {
        dedupedToast.success(t("memory.deletedSuccess", "Memory deleted"));
      } else {
        dedupedToast.info(
          t("memory.deletedNotFound", "Memory was already removed"),
        );
      }
    } catch (err) {
      dedupedToast.error(
        t("memory.deletedFailed", "Failed to delete memory") +
          (err instanceof Error ? `: ${err.message}` : ""),
      );
    } finally {
      setPendingDelete(null);
    }
  }
  if (gatewayResolving) {
    return (
      <div
        className="flex flex-col gap-3"
        data-action-ui-id="settings.memory.panel"
      >
        <p className="py-6 text-center text-xs text-muted-foreground">
          {t("common.loading", "Loading…")}
        </p>
      </div>
    );
  }
  if (secondaryPage) {
    return (
      <div
        className="flex min-h-full flex-col"
        data-action-ui-id={`settings.memory.${secondaryPage}.secondary-page`}
      >
        {!onHeaderChange && (
          <div className="mb-3 flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-md"
              onClick={() => setSecondaryPage(null)}
              disabled={secondaryBackDisabled}
              data-action-ui-id="settings.memory.secondary.back"
            >
              {t("common.back", "Back")}
            </Button>
            <h3 className="font-heading text-lg font-medium text-foreground">
              {secondaryPage === "compaction"
                ? t(
                    "memory.compaction.rewrite.title",
                    "Rewrite memories with AI",
                  )
                : t("memory.snapshots.title", "Snapshots")}
            </h3>
          </div>
        )}
        {secondaryPage === "compaction" ? (
          <CompactRewritePage
            onClose={() => setSecondaryPage(null)}
            onBusyChange={setSecondaryBackDisabled}
          />
        ) : (
          <SnapshotsPage onRestored={() => setSecondaryPage(null)} />
        )}
      </div>
    );
  }
  return (
    <div
      className="flex flex-col gap-3"
      data-action-ui-id="settings.memory.panel"
    >
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[minmax(180px,1fr)_auto_auto] items-center gap-2">
          <div className="relative min-w-[180px]">
            <Search
              size={14}
              className="absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground"
            />
            <Input3
              value={query}
              onChange={(changeEvent) => setQuery(changeEvent.target.value)}
              placeholder={t(
                "memory.searchPlaceholder",
                "Search description or body…",
              )}
              data-action-ui-id="settings.memory.search"
              className="rounded-md border-border! bg-muted/30! pl-7 text-xs"
            />
          </div>
          <Select
            value={scopeFilter}
            onValueChange={(nextScopeFilter) => setScopeFilter(nextScopeFilter)}
          >
            <SelectTrigger className={`${FILTER_SELECT_TRIGGER_CLASS} w-32`}>
              <SelectValue>{(scopeFilter) => scopeFilterLabel(scopeFilter, t)}</SelectValue>
            </SelectTrigger>
            <SelectContent className={FILTER_SELECT_CONTENT_CLASS}>
              <SelectItem className={FILTER_SELECT_ITEM_CLASS} value="all">
                {t("memory.scopeAll", "All scopes")}
              </SelectItem>
              {hasWorkspace && (
                <SelectItem
                  className={FILTER_SELECT_ITEM_CLASS}
                  value="project"
                >
                  {t("memory.scopeProject", "Project")}
                </SelectItem>
              )}
              <SelectItem className={FILTER_SELECT_ITEM_CLASS} value="user">
                {t("memory.scopeUser", "User")}
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(nextTypeFilter) => setTypeFilter(nextTypeFilter)}>
            <SelectTrigger className={`${FILTER_SELECT_TRIGGER_CLASS} w-36`}>
              <SelectValue>{(typeFilter) => typeFilterLabel(typeFilter, t)}</SelectValue>
            </SelectTrigger>
            <SelectContent className={FILTER_SELECT_CONTENT_CLASS}>
              <SelectItem
                className={FILTER_SELECT_ITEM_CLASS}
                value={TYPE_FILTER_ALL}
              >
                {t("memory.typeAll", "All types")}
              </SelectItem>
              {MEMORY_TYPES.map((type2) => (
                <SelectItem
                  key={type2}
                  className={FILTER_SELECT_ITEM_CLASS}
                  value={type2}
                >
                  {t(`memory.type.${type2}`, type2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button
            size="sm"
            className="h-8 rounded-md px-3"
            onClick={() =>
              setEditorState({
                mode: "create",
              })
            }
            data-action-ui-id="settings.memory.new"
          >
            <Plus size={14} strokeWidth={1.5} />
            {t("memory.new", "New")}
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-md"
              onClick={() => {
                setRefreshFlipped((prev) => !prev);
                void listQuery.refetch();
                if (isSearching) void searchQuery.refetch();
              }}
              aria-label={t("common.refresh", "Refresh")}
              data-action-ui-id="settings.memory.refresh"
            >
              <RetryIcon
                size={14}
                strokeWidth={1.5}
                className={`transition-transform duration-300 ${refreshFlipped ? "rotate-180" : "rotate-0"}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-md"
              onClick={() => {
                setSecondaryBackDisabled(false);
                setSecondaryPage("compaction");
              }}
              data-action-ui-id="settings.memory.compaction.open"
            >
              <WandSparkles size={14} strokeWidth={1.5} />
              {t("memory.compaction.openButton", "整理")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-md"
              onClick={() => {
                setSecondaryBackDisabled(false);
                setSecondaryPage("snapshots");
              }}
              aria-label={t("memory.snapshots.openButton", "快照")}
              data-action-ui-id="settings.memory.snapshots.open"
            >
              <History size={14} strokeWidth={1.5} />
              {t("memory.snapshots.openButton", "快照")}
            </Button>
          </div>
        </div>
      </div>
      {errorMsg && (
        <Alert variant="destructive" data-action-ui-id="settings.memory.error">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}
      <div className="overflow-hidden rounded-lg border border-border">
        {hasWorkspace && workspaceDir && (
          <div
            className="flex items-center justify-between px-3 py-2"
            data-action-ui-id="settings.memory.load-user-memory-row"
          >
            <div className="flex flex-1 min-w-0 flex-col gap-0.5 pr-4">
              <span className="text-xs font-medium">
                {t("memory.loadUserMemory.label", "Load user memory")}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {t(
                  "memory.loadUserMemory.description",
                  "Include cross-project user memory in this workspace. Project memory still loads.",
                )}
              </span>
            </div>
            <Switch
              checked={loadUserMemory}
              onCheckedChange={(checked) => {
                setWorkspacePreferences((prev) => ({
                  ...prev,
                  loadUserMemory: checked,
                }));
              }}
              data-action-ui-id="settings.memory.load-user-memory-toggle"
            />
          </div>
        )}
        <div
          className="flex items-center justify-between border-border border-t px-3 py-2 first:border-t-0"
          data-action-ui-id="settings.memory.auto-feedback-row"
        >
          <div className="flex flex-1 min-w-0 flex-col gap-0.5 pr-4">
            <span className="text-xs font-medium">
              {t("memory.autoFeedback.label", "Auto-summarize conversations")}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {t(
                "memory.autoFeedback.description",
                "Off only stops auto-extraction; agents can still write memory explicitly.",
              )}
            </span>
          </div>
          <Switch
            checked={autoFeedbackEnabled}
            onCheckedChange={(checked) => {
              void setSetting("autoFeedbackEnabled", checked);
            }}
            data-action-ui-id="settings.memory.auto-feedback-toggle"
          />
        </div>
        <div
          className="flex items-center justify-between border-border border-t px-3 py-2 first:border-t-0"
          data-action-ui-id="settings.memory.auto-compaction-row"
        >
          <div className="flex flex-1 min-w-0 flex-col gap-0.5 pr-4">
            <span className="text-xs font-medium">
              {t("memory.compaction.autoLabel", "Periodic auto-compaction")}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {t(
                "memory.compaction.autoDescription",
                "When entries or vault size exceed the threshold, run compaction in the background. Off keeps it manual.",
              )}
            </span>
          </div>
          <Switch
            checked={compactionEnabled}
            onCheckedChange={(checked) => {
              void setSetting("compactionEnabled", checked);
            }}
            data-action-ui-id="settings.memory.auto-compaction-toggle"
          />
        </div>
      </div>
      {!isSearching && <RecentAutoFeedbackList />}
      {loading && !baseEntries.length ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          {t("common.loading", "Loading…")}
        </p>
      ) : visibleEntries.length === 0 ? (
        <EmptyState searching={isSearching} />
      ) : (
        <div className="flex flex-col gap-4">
          {project2.length > 0 && (
            <MemoryList
              scopeLabel={t(
                "memory.groupProject",
                "Project scope (current workspace)",
              )}
              entries={project2}
              onEdit={(entry) =>
                setEditorState({
                  mode: "edit",
                  scope: entry.scope,
                  name: entry.name,
                })
              }
              onDelete={(entry) =>
                setPendingDelete({
                  scope: entry.scope,
                  name: entry.name,
                })
              }
            />
          )}
          {user.length > 0 && (
            <MemoryList
              scopeLabel={t("memory.groupUser", "User scope (cross-project)")}
              entries={user}
              onEdit={(entry) =>
                setEditorState({
                  mode: "edit",
                  scope: entry.scope,
                  name: entry.name,
                })
              }
              onDelete={(entry) =>
                setPendingDelete({
                  scope: entry.scope,
                  name: entry.name,
                })
              }
            />
          )}
        </div>
      )}
      {editorState && (
        <MemoryEditDialog
          open={true}
          mode={editorState}
          onOpenChange={(open) => {
            if (!open) setEditorState(null);
          }}
        />
      )}
      {pendingDelete && (
        <MemoryDeleteConfirm
          open={true}
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null);
          }}
          name={pendingDelete.name}
          scope={pendingDelete.scope}
          loading={deleteMutation.isPending}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
