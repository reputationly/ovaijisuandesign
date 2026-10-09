// compact-rewrite-flow.jsx
import { jsxRuntimeExports, useTranslation, reactExports, useMutation, dedupedToast, useQuery, useQueryClient, useStorage, AlertCircle, API_PATHS, X$7, RotateCcw, Plus, getRuntimeConfig, Bot, LoaderCircle, useGatewayBaseUrl, ChevronLeft, Undo2, DialogRoot, DialogPortal$2, DialogBackdrop, DialogPopup, DialogClose$1, XIcon, DialogTitle$2, DialogDescription$2, normalizeGatewayBaseUrl, useCurrentWorkspace, Search, WandSparkles, CurrentWorkspaceContext, CircleArrowUp, Globe, Brain$2, Smartphone, Library } from "../vendor.js";
import { buildWSUrl, gatewayUrl, DialogClose } from "../m15/agent-ws-client.jsx";
import { Select$1, GatewayScopeProvider } from "../m15/apply-asset-change.jsx";
import { Tooltip, TooltipTrigger } from "../m15/graph.jsx";
import { useRouterState } from "../m15/linked-list.js";
import { HardDrive, Trash2, Sparkles, ImageOutlineIcon, History, FileText, Settings2, CircleUserRound, Blocks, SlidersHorizontal } from "../m15/parse-item.jsx";
import { WSConnectionContext, useWSConnection } from "../m15/record-recent-workspace-opened.jsx";
import { useSettingsPanelHeader, normalizeWorkspaceId, useTopbarActiveWorkspaceSnapshot, useActiveRuntime, useOptionalUpdaterContext } from "../m15/run-manual-update-check.js";
import { useGatewayFetch, useGatewayScopeKey, useRuntimeConfig } from "../m15/use-resizable-width.js";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  Checkbox,
  Button$1,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Badge,
  Textarea,
  cn$2,
  TooltipContent,
  useBrowserOverlayDialogProps,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { Label } from "../m09/infinite-scroll-container.jsx";
import {
  Input3,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../asset-center/shared/select-content.jsx";
import { instantiationService, RetryIcon, PencilIcon } from "../m08/browser-inspiration-urls.jsx";
import { IHiloApp } from "../m08/instantiation-service.js";
import { Switch } from "../m01/calc-video-cost-breakdown.jsx";
import {
  MAX_MEMORY_DESCRIPTION_LENGTH,
  MAX_MEMORY_BODY_BYTES,
  MEMORY_TYPES,
  ASSET_MODALITIES,
} from "../m01/text-models.js";
import { Alert, AlertDescription } from "../m09/team-member-settings-page.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { WSConnectionProviderCore } from "./im-bridge-manager.jsx";
import { formatManualRecoveryMessage, formatUpdaterErrorMessage } from "./updater-provider.jsx";
import { useSettings } from "./use-data-directory.js";
import { useUpdateActions, useUpdateChangelogItem } from "./use-update-actions.jsx";
export function AppWSConnectionProvider({ children: children2 }) {
  return (
    <WSConnectionProviderCore
      wsUrl={getRuntimeConfig().wsUrl}
      scope="app"
      syncCanvasAssetMetadata={false}
    >
      {children2}
    </WSConnectionProviderCore>
  );
}
export function WorkspaceWSConnectionProvider({
  children: children2,
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
      {children2}
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
const BASE$1 = "/api/memory";
const COMPACTION_BASE = "/api/memory-compaction";
async function readError(res) {
  try {
    const data2 = await res.json();
    if (typeof data2.message === "string") return data2.message;
    if (Array.isArray(data2.message)) return data2.message.join("; ");
    if (data2.error) return data2.error;
  } catch {}
  return `${res.status} ${res.statusText}`;
}
async function expectOk(res) {
  if (res.ok) return;
  throw new Error(await readError(res));
}
async function listMemory(fetcher, scope = "all") {
  const res = await fetcher(`${BASE$1}?scope=${encodeURIComponent(scope)}`);
  await expectOk(res);
  const data2 = await res.json();
  return data2.entries;
}
async function searchMemory(fetcher, q2, scope = "all", type2) {
  const params = new URLSearchParams({
    q: q2,
    scope,
  });
  const res = await fetcher(`${BASE$1}/search?${params.toString()}`);
  await expectOk(res);
  const data2 = await res.json();
  return data2.entries;
}
async function readMemory(fetcher, scope, name2) {
  const res = await fetcher(`${BASE$1}/${scope}/${encodeURIComponent(name2)}`);
  await expectOk(res);
  return await res.json();
}
async function writeMemory(fetcher, payload) {
  const res = await fetcher(BASE$1, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  await expectOk(res);
  return await res.json();
}
export async function deleteMemory(fetcher, scope, name2) {
  const res = await fetcher(`${BASE$1}/${scope}/${encodeURIComponent(name2)}`, {
    method: "DELETE",
  });
  await expectOk(res);
  return await res.json();
}
async function listRecentAutoFeedback(fetcher, q2 = {}) {
  const params = new URLSearchParams();
  if (q2.lookbackMs !== void 0) params.set("lookback_ms", String(q2.lookbackMs));
  if (q2.limit !== void 0) params.set("limit", String(q2.limit));
  const suffix = params.toString();
  const res = await fetcher(suffix ? `${BASE$1}/recent-auto?${suffix}` : `${BASE$1}/recent-auto`);
  await expectOk(res);
  const data2 = await res.json();
  return data2.entries ?? [];
}
async function listSnapshots(fetcher) {
  const params = new URLSearchParams({
    scope: "user",
  });
  const res = await fetcher(`${COMPACTION_BASE}/snapshots?${params.toString()}`);
  await expectOk(res);
  const data2 = await res.json();
  return data2.snapshots ?? [];
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
async function previewRewrite(fetcher, selectedNames) {
  const body2 = {
    scope: "user",
    selectedNames,
  };
  const res = await fetcher(`${COMPACTION_BASE}/rewrite/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body2),
  });
  await expectOk(res);
  return await res.json();
}
async function executeRewrite(fetcher, proposalId) {
  const body2 = {
    scope: "user",
    proposalId,
  };
  const res = await fetcher(`${COMPACTION_BASE}/rewrite/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body2),
  });
  await expectOk(res);
  return await res.json();
}
const ROOT_KEY$2 = ["memory"];
const memoryQueryKeys = {
  list: (scopeKey, scope) => [...ROOT_KEY$2, scopeKey, "list", scope],
  search: (scopeKey, q2, scope, type2) => [
    ...ROOT_KEY$2,
    scopeKey,
    "search",
    q2,
    scope,
    type2 ?? "",
  ],
  entry: (scopeKey, scope, name2) => [...ROOT_KEY$2, scopeKey, "entry", scope, name2],
  recentAuto: (scopeKey, q2) => [
    ...ROOT_KEY$2,
    scopeKey,
    "recent-auto",
    q2.lookbackMs ?? null,
    q2.limit ?? null,
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
    preview: (scopeKey, force) => [...ROOT_KEY$2, scopeKey, "compaction", "preview", force],
    snapshots: (scopeKey) => [...ROOT_KEY$2, scopeKey, "compaction", "snapshots"],
    config: (scopeKey) => [...ROOT_KEY$2, scopeKey, "compaction", "config"],
  },
  /** Invalidation root for the *current* scope -- mutations stay scope-local. */
  scopeRoot: (scopeKey) => [...ROOT_KEY$2, scopeKey],
};
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
function useMemoryList(scope) {
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
function useMemorySearch(q2, scope, type2) {
  const baseUrl = useGatewayBaseUrl();
  const fetcher = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  const trimmed = q2.trim();
  return useQuery({
    queryKey: memoryQueryKeys.search(scopeKey, trimmed, scope, type2),
    queryFn: () => searchMemory(fetcher, trimmed, scope),
    enabled: Boolean(baseUrl) && trimmed.length > 0,
  });
}
function useMemoryEntry(scope, name2) {
  const baseUrl = useGatewayBaseUrl();
  const fetcher = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  return useQuery({
    queryKey:
      scope && name2
        ? memoryQueryKeys.entry(scopeKey, scope, name2)
        : ["memory", scopeKey, "entry", "noop"],
    queryFn: () => readMemory(fetcher, scope, name2),
    enabled: Boolean(baseUrl && scope && name2),
  });
}
function useMemoryWrite() {
  const fetcher = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  const queryClient2 = useQueryClient();
  return useMutation({
    mutationFn: (payload) => writeMemory(fetcher, payload),
    onSuccess: () => {
      queryClient2.invalidateQueries({
        queryKey: memoryQueryKeys.scopeRoot(scopeKey),
      });
    },
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
function useRecentAutoFeedback(q2 = {}) {
  const baseUrl = useGatewayBaseUrl();
  const fetcher = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  return useQuery({
    queryKey: memoryQueryKeys.recentAuto(scopeKey, q2),
    queryFn: () => listRecentAutoFeedback(fetcher, q2),
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
function useSnapshotRestore() {
  const fetcher = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  const queryClient2 = useQueryClient();
  return useMutation({
    mutationFn: ({ snapshotId }) => restoreSnapshot(fetcher, snapshotId),
    onSuccess: () => {
      queryClient2.invalidateQueries({
        queryKey: memoryQueryKeys.scopeRoot(scopeKey),
      });
    },
  });
}
function useRewritePreview() {
  const fetcher = useGatewayFetch();
  return useMutation({
    mutationFn: ({ selectedNames }) => previewRewrite(fetcher, selectedNames),
  });
}
function useRewriteExecute() {
  const fetcher = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  const queryClient2 = useQueryClient();
  return useMutation({
    mutationFn: ({ proposalId }) => executeRewrite(fetcher, proposalId),
    onSuccess: () => {
      queryClient2.invalidateQueries({
        queryKey: memoryQueryKeys.scopeRoot(scopeKey),
      });
    },
  });
}
function getMergeOp(plan) {
  if (!plan || plan.operations.length === 0) return null;
  const merge2 = plan.operations.find((op) => op.type === "merge");
  return merge2 ?? null;
}
function CompactRewritePage({ onClose, onBusyChange }) {
  return (
    <CompactRewriteFlow open={true} surface="page" onClose={onClose} onBusyChange={onBusyChange} />
  );
}
function CompactRewriteFlow({ open, surface, onClose, onBusyChange }) {
  const { t: t2 } = useTranslation();
  const memoryList = useMemoryList("user");
  const [phase, setPhase] = reactExports.useState("select");
  const [selectedNames, setSelectedNames] = reactExports.useState(() => new Set());
  const [proposal, setProposal] = reactExports.useState(null);
  const previewMutation = useRewritePreview();
  const executeMutation = useRewriteExecute();
  const restoreMutation = useSnapshotRestore();
  const eligibleEntries = reactExports.useMemo(() => {
    const entries2 = memoryList.data ?? [];
    return entries2.filter((e2) => e2.type !== "asset-pin");
  }, [memoryList.data]);
  const assetPinCount = reactExports.useMemo(() => {
    const entries2 = memoryList.data ?? [];
    return entries2.filter((e2) => e2.type === "asset-pin").length;
  }, [memoryList.data]);
  const seededRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (!open) {
      seededRef.current = false;
      return;
    }
    if (seededRef.current) return;
    if (eligibleEntries.length === 0) return;
    setSelectedNames(new Set(eligibleEntries.map((e2) => e2.name)));
    seededRef.current = true;
  }, [open, eligibleEntries]);
  reactExports.useEffect(() => {
    if (open) {
      setPhase("select");
      setProposal(null);
    }
  }, [open]);
  function toggleSelect(name2) {
    setSelectedNames((prev) => {
      const next2 = new Set(prev);
      if (next2.has(name2)) next2.delete(name2);
      else next2.add(name2);
      return next2;
    });
  }
  function selectAll2() {
    setSelectedNames(new Set(eligibleEntries.map((e2) => e2.name)));
  }
  function selectNone() {
    setSelectedNames(new Set());
  }
  async function handleGenerate() {
    if (selectedNames.size === 0) return;
    setPhase("previewing");
    try {
      const response = await previewMutation.mutateAsync({
        selectedNames: Array.from(selectedNames),
      });
      setProposal(response);
      setPhase("preview");
    } catch (err) {
      setPhase("select");
      dedupedToast.error(
        t2("memory.compaction.rewrite.previewFailed", "Failed to generate rewrite proposal") +
          (err instanceof Error ? `: ${err.message}` : ""),
      );
    }
  }
  async function handleApply() {
    if (!proposal) return;
    setPhase("executing");
    try {
      const summary = await executeMutation.mutateAsync({
        proposalId: proposal.proposalId,
      });
      const description2 = t2("memory.compaction.rewrite.doneToast", {
        deleted: summary.deleted,
        merged: summary.merged,
        defaultValue: "Rewrote {{deleted}} entries into {{merged}}",
      });
      const snapshotId = summary.snapshotId;
      if (snapshotId) {
        dedupedToast.success(description2, {
          action: {
            label: t2("memory.compaction.undo", "Undo"),
            onClick: () => {
              void (async () => {
                try {
                  await restoreMutation.mutateAsync({
                    snapshotId,
                  });
                  dedupedToast.success(
                    t2("memory.compaction.undoDone", "Restored to pre-compaction state"),
                  );
                } catch (err) {
                  dedupedToast.error(
                    t2("memory.compaction.undoFailed", "Undo failed") +
                      (err instanceof Error ? `: ${err.message}` : ""),
                  );
                }
              })();
            },
          },
        });
      } else {
        dedupedToast.success(description2);
      }
      onClose();
    } catch (err) {
      const message2 = err instanceof Error ? err.message : "";
      const isExpired = /\b410\b|gone|expired|proposal/i.test(message2);
      if (isExpired) {
        setPhase("select");
        setProposal(null);
        dedupedToast.error(
          t2(
            "memory.compaction.rewrite.proposalExpired",
            "The rewrite proposal has expired. Please regenerate.",
          ),
        );
      } else {
        setPhase("preview");
        dedupedToast.error(
          t2("memory.compaction.rewrite.executeFailed", "Failed to apply rewrite") +
            (message2 ? `: ${message2}` : ""),
        );
      }
    }
  }
  function handleBack() {
    setPhase("select");
    setProposal(null);
  }
  const isInPreviewLike = phase === "preview" || phase === "executing";
  const mergeOp = getMergeOp(proposal?.plan);
  const upserts = mergeOp?.upserts ?? [];
  const deletes = mergeOp?.deletes ?? [];
  const cancelDisabled = phase === "previewing" || phase === "executing";
  reactExports.useEffect(() => {
    onBusyChange?.(cancelDisabled);
  }, [cancelDisabled, onBusyChange]);
  const title =
    phase === "preview" || phase === "executing" ? (
      <>
        {t2("memory.compaction.rewrite.previewTitle", "Review rewrite")}
        {proposal && (
          <span className="text-xs font-normal text-muted-foreground">
            {t2("memory.compaction.rewrite.previewSummary", {
              from: deletes.length,
              to: upserts.length,
              defaultValue: "{{from}} → {{to}}",
            })}
          </span>
        )}
      </>
    ) : (
      t2("memory.compaction.rewrite.title", "Rewrite memories with AI")
    );
  const description =
    phase === "preview" || phase === "executing"
      ? proposal &&
        t2("memory.compaction.rewrite.modelLabel", {
          model: proposal.llmModel,
          defaultValue: "Model: {{model}}",
        })
      : t2(
          "memory.compaction.rewrite.subtitle",
          "Pick entries to consolidate; the AI rewrites them into fewer, denser notes for review before any change is applied.",
        );
  const body2 = (
    <>
      {phase === "select" && (
        <SelectPhase
          entries={eligibleEntries}
          assetPinCount={assetPinCount}
          loading={memoryList.isLoading}
          error={memoryList.isError ? memoryList.error : null}
          selectedNames={selectedNames}
          onToggle={toggleSelect}
          onSelectAll={selectAll2}
          onSelectNone={selectNone}
        />
      )}
      {phase === "previewing" && (
        <PhaseSpinner
          label={t2("memory.compaction.rewrite.previewing", {
            n: selectedNames.size,
            defaultValue: "AI is rewriting {{n}} selected memories…",
          })}
        />
      )}
      {isInPreviewLike && proposal && (
        <PreviewPhase
          originalEntries={eligibleEntries.filter((e2) => deletes.includes(e2.name))}
          upserts={upserts}
        />
      )}
      {phase === "executing" && (
        <div className="flex-shrink-0">
          <PhaseSpinner label={t2("memory.compaction.rewrite.executing", "Applying rewrite…")} />
        </div>
      )}
    </>
  );
  const footer2 = (
    <>
      {phase === "select" && (
        <SelectFooter
          selectedCount={selectedNames.size}
          cancelDisabled={cancelDisabled}
          onCancel={onClose}
          onGenerate={() => void handleGenerate()}
        />
      )}
      {phase === "previewing" && (
        <span className="ml-auto text-xs text-muted-foreground">
          {t2("memory.compaction.rewrite.previewing", {
            n: selectedNames.size,
            defaultValue: "AI is rewriting {{n}} selected memories…",
          })}
        </span>
      )}
      {isInPreviewLike && (
        <PreviewFooter
          executing={phase === "executing"}
          onBack={handleBack}
          onApply={() => void handleApply()}
        />
      )}
    </>
  );
  if (surface === "page") {
    return (
      <div
        className="flex min-h-[460px] flex-col gap-4"
        data-action-ui-id="settings.memory.compaction.page"
      >
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{body2}</div>
        <div className="flex shrink-0 justify-end gap-2 border-border border-t pt-3">{footer2}</div>
      </div>
    );
  }
  return (
    <>
      <DialogHeader className="flex-shrink-0">
        <DialogTitle className="flex items-center gap-2">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">{body2}</div>
      <DialogFooter className="flex-shrink-0">{footer2}</DialogFooter>
    </>
  );
}
function SelectPhase({
  entries: entries2,
  assetPinCount,
  loading,
  error,
  selectedNames,
  onToggle,
  onSelectAll,
  onSelectNone,
}) {
  const { t: t2 } = useTranslation();
  if (loading) {
    return <PhaseSpinner label={t2("common.loading", "Loading…")} />;
  }
  if (error) {
    return (
      <p className="px-3 py-2 text-xs text-destructive">
        {error.message ||
          t2("memory.compaction.rewrite.previewFailed", "Failed to generate rewrite proposal")}
      </p>
    );
  }
  if (entries2.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <p className="text-sm font-medium text-foreground">
          {t2("memory.compaction.rewrite.emptyEligible", "No user memories available to rewrite.")}
        </p>
        {assetPinCount > 0 && (
          <p className="max-w-sm text-xs text-muted-foreground">
            {t2("memory.compaction.rewrite.assetPinExcluded", {
              n: assetPinCount,
              defaultValue: "{{n}} asset-pin anchors are excluded automatically.",
            })}
          </p>
        )}
      </div>
    );
  }
  const allSelected = entries2.length > 0 && entries2.every((e2) => selectedNames.has(e2.name));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Button$1
          variant="link"
          size="sm"
          className="h-auto px-0 text-xs"
          onClick={() => (allSelected ? onSelectNone() : onSelectAll())}
          data-action-ui-id="settings.memory.compaction.selectToggle"
        >
          {allSelected
            ? t2("memory.compaction.rewrite.selectNone", "Clear selection")
            : t2("memory.compaction.rewrite.selectAll", "Select all")}
        </Button$1>
        {assetPinCount > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {t2("memory.compaction.rewrite.assetPinExcluded", {
              n: assetPinCount,
              defaultValue: "{{n}} asset-pin anchors are excluded automatically.",
            })}
          </span>
        )}
      </div>
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
        {entries2.map((e2) => {
          const name2 = e2.name;
          const checked = selectedNames.has(name2);
          return (
            <li
              key={name2}
              className="flex items-center gap-2 px-2 py-1.5"
              data-action-ui-id={`settings.memory.compaction.row.${name2}`}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => onToggle(name2)}
                aria-label={name2}
                data-action-ui-id={`settings.memory.compaction.select.${name2}`}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-xs text-foreground">{name2}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {e2.type}
                  </Badge>
                </div>
                <span className="truncate text-[11px] text-muted-foreground">{e2.description}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
function PreviewPhase({ originalEntries, upserts }) {
  const { t: t2 } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <section className="flex flex-col gap-2">
        <header className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">
            {t2("memory.compaction.rewrite.originalLabel", "Original")}
          </span>
          <span className="text-[11px] text-muted-foreground">{originalEntries.length}</span>
        </header>
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
          {originalEntries.map((e2) => (
            <li key={e2.name} className="flex flex-col gap-0.5 px-2 py-1.5">
              <div className="flex items-center gap-2">
                <span className="truncate font-mono text-xs text-foreground">{e2.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {e2.type}
                </Badge>
              </div>
              <span className="truncate text-[11px] text-muted-foreground">{e2.description}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <header className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">
            {t2("memory.compaction.rewrite.newLabel", "New version")}
          </span>
          <span className="text-[11px] text-muted-foreground">{upserts?.length ?? 0}</span>
        </header>
        <ul className="flex flex-col gap-2">
          {(upserts ?? []).map((u4) => (
            <li
              key={u4.name}
              className="flex flex-col gap-1 border-l-2 border-primary bg-primary/5 px-2 py-1.5"
              data-action-ui-id={`settings.memory.compaction.upsert.${u4.name}`}
            >
              <div className="flex items-center gap-2">
                <span className="truncate font-mono text-xs text-foreground">{u4.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {u4.type}
                </Badge>
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {t2("memory.compaction.rewrite.replacesN", {
                    n: u4.compactedFrom.length,
                    defaultValue: "← replaces {{n}}",
                  })}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">{u4.description}</p>
              {u4.body && (
                <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-[11px] text-foreground">
                  {u4.body}
                </pre>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
function PhaseSpinner({ label }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-xs text-muted-foreground">
      <LoaderCircle size={16} strokeWidth={1.5} className="animate-spin" />
      <span>{label}</span>
    </div>
  );
}
function SelectFooter({ selectedCount, cancelDisabled, onCancel, onGenerate }) {
  const { t: t2 } = useTranslation();
  return (
    <>
      <Button$1
        variant="outline"
        onClick={onCancel}
        disabled={cancelDisabled}
        data-action-ui-id="settings.memory.compaction.cancel"
      >
        {t2("memory.compaction.cancel", "Cancel")}
      </Button$1>
      <Button$1
        onClick={onGenerate}
        disabled={selectedCount === 0}
        data-action-ui-id="settings.memory.compaction.generate"
      >
        {selectedCount > 0
          ? t2("memory.compaction.rewrite.generateButtonWithCount", {
              n: selectedCount,
              defaultValue: "Generate rewrite ({{n}})",
            })
          : t2("memory.compaction.rewrite.generateButton", "Generate rewrite")}
      </Button$1>
    </>
  );
}
function PreviewFooter({ executing, onBack, onApply }) {
  const { t: t2 } = useTranslation();
  return (
    <>
      <Button$1
        variant="outline"
        onClick={onBack}
        disabled={executing}
        data-action-ui-id="settings.memory.compaction.back"
      >
        <ChevronLeft size={14} strokeWidth={1} />
        {t2("memory.compaction.rewrite.backButton", "Back")}
      </Button$1>
      <Button$1
        onClick={onApply}
        disabled={executing}
        data-action-ui-id="settings.memory.compaction.execute"
      >
        {executing
          ? t2("memory.compaction.rewrite.executing", "Applying rewrite…")
          : t2("memory.compaction.rewrite.applyButton", "Apply rewrite")}
      </Button$1>
    </>
  );
}
function MemoryDeleteConfirm({ open, onOpenChange, scope, name: name2, loading, onConfirm }) {
  const { t: t2 } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-action-ui-id="settings.memory.delete-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t2("memory.deleteTitle", "Delete memory?")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t2(
              "memory.deleteDesc",
              "This permanently removes the markdown file. The agent will lose this memory immediately.",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-1 border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-xs">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{t2("memory.fieldScope", "Scope")}:</span>{" "}
            {scope}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{t2("memory.fieldName", "Name")}:</span>{" "}
            <span className="font-mono">{name2}</span>
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} data-action-ui-id="settings.memory.delete-cancel">
            {t2("common.cancel", "Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e2) => {
              e2.preventDefault();
              void onConfirm();
            }}
            data-action-ui-id="settings.memory.delete-confirm-button"
          >
            {loading ? t2("common.deleting", "Deleting…") : t2("common.delete", "Delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
const NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ASSET_URI_RE$1 = /^hilo:\/\/asset\/[a-zA-Z0-9_-]+$/;
const DEFAULT_STATE = {
  scope: "project",
  name: "",
  type: "media-style",
  description: "",
  body: "",
  asset_uri: "",
  asset_modality: "image",
};
function MemoryEditDialog({ open, mode: mode2, onOpenChange }) {
  const { t: t2 } = useTranslation();
  const isEdit = mode2.mode === "edit";
  const writer = useMemoryWrite();
  const entry = useMemoryEntry(isEdit ? mode2.scope : void 0, isEdit ? mode2.name : void 0);
  const [state2, setState] = reactExports.useState(DEFAULT_STATE);
  const [submitted, setSubmitted] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!open) {
      setSubmitted(false);
      return;
    }
    if (isEdit && entry.data) {
      const fm = entry.data.frontmatter;
      setState({
        scope: mode2.scope,
        name: mode2.name,
        type: fm.type,
        description: fm.description,
        body: entry.data.body,
        asset_uri: fm.asset_uri ?? "",
        asset_modality: fm.asset_modality ?? "image",
      });
    } else if (!isEdit) {
      setState(DEFAULT_STATE);
    }
  }, [open, isEdit, entry.data, mode2]);
  const isAssetPin = state2.type === "asset-pin";
  const errors = reactExports.useMemo(() => {
    const out = {};
    if (!isEdit) {
      if (!state2.name) out.name = t2("memory.errNameRequired", "name is required");
      else if (!NAME_RE.test(state2.name))
        out.name = t2("memory.errNameFormat", "name must be kebab-case (1-64 chars)");
      if (isAssetPin && state2.scope === "user")
        out.scope = t2("memory.errAssetPinScope", "asset-pin requires project scope");
    }
    if (!state2.description)
      out.description = t2("memory.errDescRequired", "description is required");
    else if (state2.description.length > MAX_MEMORY_DESCRIPTION_LENGTH)
      out.description = t2(
        "memory.errDescTooLong",
        `description must be ≤ ${MAX_MEMORY_DESCRIPTION_LENGTH} chars`,
      );
    if (state2.description.includes("\n"))
      out.description = t2("memory.errDescSingleLine", "description must be a single line");
    if (new Blob([state2.body]).size > MAX_MEMORY_BODY_BYTES)
      out.body = t2("memory.errBodyTooLong", `body exceeds ${MAX_MEMORY_BODY_BYTES} bytes`);
    if (isAssetPin) {
      if (!state2.asset_uri)
        out.asset_uri = t2("memory.errAssetUriRequired", "asset_uri is required");
      else if (!ASSET_URI_RE$1.test(state2.asset_uri))
        out.asset_uri = t2(
          "memory.errAssetUriFormat",
          "asset_uri must look like hilo://asset/<id>",
        );
    }
    return out;
  }, [isEdit, isAssetPin, state2, t2]);
  const hasErrors = Object.keys(errors).length > 0;
  async function submit() {
    setSubmitted(true);
    if (hasErrors) return;
    try {
      await writer.mutateAsync({
        scope: state2.scope,
        name: state2.name,
        type: state2.type,
        description: state2.description,
        body: state2.body,
        asset_uri: isAssetPin ? state2.asset_uri : void 0,
        asset_modality: isAssetPin ? state2.asset_modality : void 0,
      });
      dedupedToast.success(
        isEdit
          ? t2("memory.savedSuccess", "Memory updated")
          : t2("memory.createdSuccess", "Memory created"),
      );
      onOpenChange(false);
    } catch (err) {
      dedupedToast.error(
        (isEdit
          ? t2("memory.savedFailed", "Failed to save memory")
          : t2("memory.createdFailed", "Failed to create memory")) +
          (err instanceof Error ? `: ${err.message}` : ""),
      );
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-action-ui-id="settings.memory.editor">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t2("memory.editTitle", "Edit memory")
              : t2("memory.createTitle", "New memory")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t2("memory.editDesc", "Scope, name and type are locked once created.")
              : t2("memory.createDesc", "Stored as a markdown file under the chosen scope.")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Field
              label={t2("memory.fieldScope", "Scope")}
              error={submitted ? errors.scope : void 0}
            >
              <Select$1
                value={state2.scope}
                onValueChange={(v2) =>
                  setState((s2) => ({
                    ...s2,
                    scope: v2,
                  }))
                }
                disabled={isEdit}
              >
                <SelectTrigger
                  className="h-8 text-xs"
                  data-action-ui-id="settings.memory.editor.scope"
                >
                  <SelectValue>
                    {(v2) =>
                      v2 === "project"
                        ? t2("memory.scopeProject", "Project")
                        : t2("memory.scopeUser", "User")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">{t2("memory.scopeProject", "Project")}</SelectItem>
                  <SelectItem value="user">{t2("memory.scopeUser", "User")}</SelectItem>
                </SelectContent>
              </Select$1>
            </Field>
            <Field label={t2("memory.fieldType", "Type")}>
              <Select$1
                value={state2.type}
                onValueChange={(v2) =>
                  setState((s2) => ({
                    ...s2,
                    type: v2,
                  }))
                }
                disabled={isEdit}
              >
                <SelectTrigger
                  className="h-8 text-xs"
                  data-action-ui-id="settings.memory.editor.type"
                >
                  <SelectValue>{(v2) => t2(`memory.type.${v2}`, v2)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MEMORY_TYPES.map((type2) => (
                    <SelectItem key={type2} value={type2}>
                      {t2(`memory.type.${type2}`, type2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select$1>
            </Field>
          </div>
          <Field
            label={t2("memory.fieldName", "Name")}
            error={submitted ? errors.name : void 0}
            hint={t2("memory.fieldNameHint", "kebab-case, 1-64 chars (locked after create)")}
          >
            <Input3
              value={state2.name}
              onChange={(e2) =>
                setState((s2) => ({
                  ...s2,
                  name: e2.target.value,
                }))
              }
              placeholder={t2("memory.namePlaceholder", "cyberpunk-hero")}
              disabled={isEdit}
              data-action-ui-id="settings.memory.editor.name"
            />
          </Field>
          <Field
            label={t2("memory.fieldDescription", "Description")}
            error={submitted ? errors.description : void 0}
            hint={`${state2.description.length} / ${MAX_MEMORY_DESCRIPTION_LENGTH}`}
          >
            <Input3
              value={state2.description}
              onChange={(e2) =>
                setState((s2) => ({
                  ...s2,
                  description: e2.target.value,
                }))
              }
              placeholder={t2("memory.descPlaceholder", "Single line shown in the index")}
              data-action-ui-id="settings.memory.editor.description"
            />
          </Field>
          {isAssetPin && (
            <>
              <Field
                label={t2("memory.fieldAssetUri", "Asset URI")}
                error={submitted ? errors.asset_uri : void 0}
                hint="hilo://asset/<id>"
              >
                <Input3
                  value={state2.asset_uri}
                  onChange={(e2) =>
                    setState((s2) => ({
                      ...s2,
                      asset_uri: e2.target.value,
                    }))
                  }
                  placeholder={t2("memory.assetUriPlaceholder", "hilo://asset/01H...")}
                  disabled={isEdit}
                  data-action-ui-id="settings.memory.editor.asset_uri"
                />
              </Field>
              <Field label={t2("memory.fieldAssetModality", "Modality")}>
                <Select$1
                  value={state2.asset_modality}
                  onValueChange={(v2) =>
                    setState((s2) => ({
                      ...s2,
                      asset_modality: v2,
                    }))
                  }
                  disabled={isEdit}
                >
                  <SelectTrigger
                    className="h-8 text-xs"
                    data-action-ui-id="settings.memory.editor.asset_modality"
                  >
                    <SelectValue>{() => state2.asset_modality}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_MODALITIES.map((m3) => (
                      <SelectItem key={m3} value={m3}>
                        {m3}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select$1>
              </Field>
            </>
          )}
          <Field
            label={t2("memory.fieldBody", "Body (Markdown)")}
            error={submitted ? errors.body : void 0}
            hint={`${new Blob([state2.body]).size} / ${MAX_MEMORY_BODY_BYTES} bytes`}
          >
            <Textarea
              value={state2.body}
              onChange={(e2) =>
                setState((s2) => ({
                  ...s2,
                  body: e2.target.value,
                }))
              }
              placeholder={t2(
                "memory.bodyPlaceholder",
                "Markdown body — keywords, defaults, avoid notes…",
              )}
              rows={6}
              data-action-ui-id="settings.memory.editor.body"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button$1
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={writer.isPending}
            data-action-ui-id="settings.memory.editor.cancel"
          >
            {t2("common.cancel", "Cancel")}
          </Button$1>
          <Button$1
            onClick={submit}
            disabled={writer.isPending || (submitted && hasErrors)}
            data-action-ui-id="settings.memory.editor.save"
          >
            {writer.isPending
              ? t2("common.saving", "Saving…")
              : isEdit
                ? t2("common.save", "Save")
                : t2("common.create", "Create")}
          </Button$1>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function Field({ label, hint, error, children: children2 }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-foreground">{label}</Label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children2}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
const ASSET_URI_RE = /^hilo:\/\/asset\/([a-zA-Z0-9_-]+)$/;
function parseAssetUri(uri) {
  if (!uri) return void 0;
  const match2 = uri.match(ASSET_URI_RE);
  return match2 ? match2[1] : void 0;
}
function AssetPinPreview({ scope, name: name2 }) {
  const { t: t2 } = useTranslation();
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
        {t2("memory.assetMissing", "asset_uri missing or malformed")}
      </div>
    );
  }
  const src = gatewayUrl(API_PATHS.serveFileById(assetId));
  if (!src) {
    return (
      <div className="flex h-16 items-center px-2 text-[11px] text-muted-foreground">
        {t2("memory.gatewayUnavailable", "Gateway unavailable")}
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
      <audio controls={true} src={src} className="h-8 w-full max-w-xs" preload="metadata">
        <track kind="captions" />
      </audio>
    );
  }
  return (
    <img
      src={src}
      alt={fm?.description ?? name2}
      className="h-16 w-16 bg-muted object-cover"
      onError={(e2) => {
        const target = e2.currentTarget;
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
  const { t: t2 } = useTranslation();
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
            "match_in" in entry && Array.isArray(entry.match_in) ? entry.match_in : void 0;
          return (
            <li
              key={`${entry.scope}/${entry.name}`}
              className="flex flex-col gap-1.5 px-3 py-2"
              data-action-ui-id={`settings.memory.row.${entry.scope}.${entry.name}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-mono text-xs text-foreground">{entry.name}</span>
                    <Badge variant={TYPE_VARIANT[entry.type]}>
                      {t2(`memory.type.${entry.type}`, entry.type)}
                    </Badge>
                    {matchedIn && matchedIn.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Badge variant="outline" className="text-[10px]">
                              {matchedIn.includes("body") && matchedIn.includes("description")
                                ? t2("memory.matchBoth", "desc+body")
                                : matchedIn.includes("body")
                                  ? t2("memory.matchBody", "body")
                                  : t2("memory.matchDescription", "desc")}
                            </Badge>
                          }
                        />
                        <TooltipContent>
                          {t2("memory.matchTooltip", "Search matched in: ") + matchedIn.join(", ")}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <p
                    className={cn$2(
                      "line-clamp-2 text-xs text-muted-foreground",
                      !entry.description && "italic",
                    )}
                  >
                    {entry.description || t2("memory.noDescription", "(no description)")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button$1
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onEdit(entry)}
                    aria-label={t2("common.edit", "Edit")}
                    data-action-ui-id={`settings.memory.edit.${entry.scope}.${entry.name}`}
                  >
                    <PencilIcon size={12} strokeWidth={1.5} />
                  </Button$1>
                  <Button$1
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onDelete(entry)}
                    aria-label={t2("common.delete", "Delete")}
                    data-action-ui-id={`settings.memory.delete.${entry.scope}.${entry.name}`}
                  >
                    <Trash2 size={12} strokeWidth={1.5} />
                  </Button$1>
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
function relativeFromNow$1(iso, nowMs = Date.now()) {
  const t2 = Date.parse(iso);
  if (Number.isNaN(t2)) return iso;
  const diffSec = Math.max(0, Math.round((nowMs - t2) / 1e3));
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d`;
}
function RecentAutoFeedbackList({ lookbackMs }) {
  const { t: t2 } = useTranslation();
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
        dedupedToast.success(t2("memory.autoPanel.undoSuccess", "Undone — entry removed"));
      } else {
        dedupedToast.info(t2("memory.autoPanel.undoNotFound", "Entry was already removed"));
      }
    } catch (err) {
      dedupedToast.error(
        t2("memory.autoPanel.undoFailed", "Undo failed") +
          (err instanceof Error ? `: ${err.message}` : ""),
      );
    }
  }
  return (
    <section className="flex flex-col gap-2" data-action-ui-id="settings.memory.recent-auto.panel">
      <header className="flex items-center gap-2">
        <Sparkles size={12} strokeWidth={1.5} className="text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t2("memory.autoPanel.title", "Recently learnt")}
        </span>
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">{entries2.length}</span>
      </header>
      {query.isError ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          {t2("memory.autoPanel.loadFailed", "Could not load recent auto-extractions")}
        </p>
      ) : query.isLoading && entries2.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          {t2("common.loading", "Loading…")}
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
                  <span className="truncate font-mono text-xs text-foreground">{entry.name}</span>
                  <Badge variant="secondary">{t2(`memory.type.${entry.type}`, entry.type)}</Badge>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Badge variant="outline" className="text-[10px]">
                          {relativeFromNow$1(entry.extracted_at)}
                        </Badge>
                      }
                    />
                    <TooltipContent>{entry.extracted_at}</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">
                  {entry.description || t2("memory.noDescription", "(no description)")}
                </p>
              </div>
              <Button$1
                variant="ghost"
                size="xs"
                onClick={() => void handleUndo(entry)}
                disabled={deleteMutation.isPending}
                data-action-ui-id={`settings.memory.recent-auto.undo.${entry.scope}.${entry.name}`}
              >
                <Undo2 size={12} strokeWidth={1.5} />
                {t2("memory.autoPanel.undo", "Undo")}
              </Button$1>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
export function Sheet({ ...props }) {
  return <DialogRoot data-slot="sheet" {...useBrowserOverlayDialogProps(props)} />;
}
function SheetPortal({ ...props }) {
  return <DialogPortal$2 data-slot="sheet-portal" {...props} />;
}
function SheetOverlay({ className, ...props }) {
  return (
    <DialogBackdrop
      data-slot="sheet-overlay"
      className={cn$2(
        "modal-mask fixed inset-0 z-50 text-xs/relaxed transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  );
}
export function SheetContent({
  className,
  children: children2,
  side = "right",
  showCloseButton = true,
  ...props
}) {
  const { t: t2 } = useTranslation();
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPopup
        data-slot="sheet-content"
        data-side={side}
        className={cn$2(
          "elevated-sheet-border fixed z-50 flex flex-col bg-popover bg-clip-padding text-xs/relaxed text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
          className,
        )}
        {...props}
      >
        {children2}
        {showCloseButton && (
          <DialogClose$1
            data-slot="sheet-close"
            render={<Button$1 variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
          >
            <XIcon />
            <span className="sr-only">{t2("common.close")}</span>
          </DialogClose$1>
        )}
      </DialogPopup>
    </SheetPortal>
  );
}
export function SheetHeader({ className, ...props }) {
  return (
    <div
      data-slot="sheet-header"
      className={cn$2("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  );
}
export function SheetTitle({ className, ...props }) {
  return (
    <DialogTitle$2
      data-slot="sheet-title"
      className={cn$2("font-heading text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}
export function SheetDescription({ className, ...props }) {
  return (
    <DialogDescription$2
      data-slot="sheet-description"
      className={cn$2("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}
function formatBytes$3(bytes2) {
  if (!Number.isFinite(bytes2) || bytes2 <= 0) return "0 B";
  if (bytes2 < 1024) return `${bytes2} B`;
  if (bytes2 < 1024 * 1024) return `${(bytes2 / 1024).toFixed(1)} KB`;
  return `${(bytes2 / (1024 * 1024)).toFixed(2)} MB`;
}
function relativeFromNow(iso, nowMs = Date.now()) {
  const ts2 = Date.parse(iso);
  if (Number.isNaN(ts2)) return iso;
  const diffSec = Math.max(0, Math.round((nowMs - ts2) / 1e3));
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d`;
}
function SnapshotsPage({ onRestored }) {
  const { t: t2 } = useTranslation();
  return (
    <div
      className="flex min-h-[460px] flex-col gap-4"
      data-action-ui-id="settings.memory.snapshots.page"
    >
      <p className="max-w-2xl text-sm text-muted-foreground">
        {t2(
          "memory.snapshots.subtitle",
          "查看自动 / 手动快照，可一键恢复整个范围的记忆。恢复前会再做一份当前状态快照。",
        )}
      </p>
      <SnapshotsContent onRestored={onRestored} />
    </div>
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
function SnapshotList({ onRequestRestore }) {
  const { t: t2 } = useTranslation();
  const query = useSnapshotsList();
  const snapshots2 = query.data ?? [];
  if (query.isLoading && snapshots2.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-xs text-muted-foreground">
        <LoaderCircle size={16} strokeWidth={1.5} className="animate-spin" />
        <span>{t2("common.loading", "Loading…")}</span>
      </div>
    );
  }
  if (query.isError) {
    return (
      <p className="px-3 py-2 text-xs text-destructive">
        {query.error instanceof Error
          ? query.error.message
          : t2("memory.snapshots.loadFailed", "无法加载快照列表")}
      </p>
    );
  }
  if (snapshots2.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-10 text-center">
        <p className="text-sm font-medium text-foreground">
          {t2("memory.snapshots.empty", "暂无快照")}
        </p>
        <p className="max-w-sm text-xs text-muted-foreground">
          {t2(
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
                <Badge variant={snap.reason === "manual" ? "outline" : "secondary"}>
                  {snap.reason === "manual"
                    ? t2("memory.snapshots.reasonManual", "手动")
                    : t2("memory.snapshots.reasonCompaction", "整理")}
                </Badge>
                <span className="text-xs text-muted-foreground" title={snap.createdAt}>
                  {relativeFromNow(snap.createdAt)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t2("memory.snapshots.entryCount", {
                  count: snap.entryCount,
                  bytes: formatBytes$3(snap.bytes),
                  defaultValue: "{{count}} 条 · {{bytes}}",
                })}
              </p>
              {snap.summary && (
                <p className="text-[10px] text-muted-foreground">
                  {t2("memory.snapshots.summary", {
                    deleted: snap.summary.deleted,
                    merged: snap.summary.merged,
                    freed: formatBytes$3(snap.summary.freedBytes),
                    defaultValue: "触发整理: 删除 {{deleted}} · 合并 {{merged}} · 释放 {{freed}}",
                  })}
                </p>
              )}
            </div>
            <Button$1
              variant="ghost"
              size="xs"
              onClick={() => onRequestRestore(snap)}
              data-action-ui-id={`settings.memory.snapshots.restore.${snap.id}`}
            >
              <RotateCcw size={12} strokeWidth={1.5} />
              {t2("memory.snapshots.restore", "恢复")}
            </Button$1>
          </div>
        </li>
      ))}
    </ul>
  );
}
function RestoreConfirm({ snapshot: snapshot2, onClose, onRestored }) {
  const { t: t2 } = useTranslation();
  const restore = useSnapshotRestore();
  async function handleConfirm() {
    try {
      const res = await restore.mutateAsync({
        snapshotId: snapshot2.id,
      });
      dedupedToast.success(
        t2("memory.snapshots.restoreDoneToast", {
          count: res.restored,
          defaultValue: "已从快照恢复 {{count}} 条记忆",
        }),
      );
      onRestored();
    } catch (err) {
      dedupedToast.error(
        t2("memory.snapshots.restoreFailedToast", "恢复快照失败") +
          (err instanceof Error ? `: ${err.message}` : ""),
      );
    }
  }
  return (
    <AlertDialog open={true} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent data-action-ui-id="settings.memory.snapshots.restore-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t2("memory.snapshots.restoreConfirmTitle", "恢复到此快照?")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t2(
              "memory.snapshots.restoreConfirmDesc",
              "这将覆盖当前范围的全部记忆。系统会先把当前状态快照备份一份作为回退点。",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-1 border-l-2 border-primary bg-primary/5 px-3 py-2 text-xs">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">
              {t2("memory.snapshots.snapshotIdLabel", "快照")}:
            </span>{" "}
            <span className="font-mono">{snapshot2.id}</span>
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">
              {t2("memory.snapshots.entryCountLabel", "条目")}:
            </span>{" "}
            {snapshot2.entryCount}
            {" ("}
            {formatBytes$3(snapshot2.bytes)})
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={restore.isPending}
            data-action-ui-id="settings.memory.snapshots.restore-cancel"
          >
            {t2("memory.compaction.cancel", "取消")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={restore.isPending}
            onClick={(e2) => {
              e2.preventDefault();
              void handleConfirm();
            }}
            data-action-ui-id="settings.memory.snapshots.restore-confirm-button"
          >
            {restore.isPending
              ? t2("memory.snapshots.restoring", "恢复中…")
              : t2("memory.snapshots.restore", "恢复")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
const TYPE_FILTER_ALL$1 = "__all__";
const FILTER_SELECT_TRIGGER_CLASS =
  "h-8 rounded-md border-border! bg-muted/30! px-2.5 text-xs font-normal text-foreground/70 hover:bg-foreground/[0.03]! hover:text-foreground";
const FILTER_SELECT_CONTENT_CLASS = "bg-popover! p-1";
const FILTER_SELECT_ITEM_CLASS =
  "h-7 rounded-md py-1.5 pr-8 pl-2.5 text-xs font-normal text-foreground/70 focus:bg-popup-item-hover! focus:text-foreground! data-[highlighted]:bg-popup-item-hover! data-[highlighted]:text-foreground!";
function scopeFilterLabel(v2, t2) {
  if (v2 === "all") return t2("memory.scopeAll", "All scopes");
  if (v2 === "project") return t2("memory.scopeProject", "Project");
  return t2("memory.scopeUser", "User");
}
function typeFilterLabel(v2, t2) {
  if (v2 === TYPE_FILTER_ALL$1) return t2("memory.typeAll", "All types");
  return t2(`memory.type.${v2}`, v2);
}
function MemoryManager({ onHeaderChange } = {}) {
  const { t: t2 } = useTranslation();
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
  const [workspacePreferences, setWorkspacePreferences] = useStorage("workspace.preferences");
  const loadUserMemory = workspacePreferences.loadUserMemory ?? true;
  const [scopeFilter, setScopeFilter] = reactExports.useState("all");
  const [typeFilter, setTypeFilter] = reactExports.useState(TYPE_FILTER_ALL$1);
  const [query, setQuery] = reactExports.useState("");
  const [debouncedQuery, setDebouncedQuery] = reactExports.useState("");
  const [editorState, setEditorState] = reactExports.useState(null);
  const [pendingDelete, setPendingDelete] = reactExports.useState(null);
  const [secondaryPage, setSecondaryPage] = reactExports.useState(null);
  const [secondaryBackDisabled, setSecondaryBackDisabled] = reactExports.useState(false);
  const [refreshFlipped, setRefreshFlipped] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!hasWorkspace && scopeFilter === "project") {
      setScopeFilter("all");
    }
  }, [hasWorkspace, scopeFilter]);
  reactExports.useEffect(() => {
    const id2 = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(id2);
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
          ? t2("memory.compaction.rewrite.title", "Rewrite memories with AI")
          : t2("memory.snapshots.title", "Snapshots"),
      onBack: () => setSecondaryPage(null),
      backLabel: t2("common.back", "Back"),
      backDisabled: secondaryBackDisabled,
    });
    return () => onHeaderChange(null);
  }, [onHeaderChange, secondaryBackDisabled, secondaryPage, t2]);
  const listQuery = useMemoryList(scopeFilter);
  const searchQuery = useMemorySearch(debouncedQuery, scopeFilter);
  const deleteMutation = useMemoryDelete();
  const isSearching = debouncedQuery.length > 0;
  const baseEntries = isSearching ? (searchQuery.data ?? []) : (listQuery.data ?? []);
  const visibleEntries = reactExports.useMemo(() => {
    return baseEntries.filter((entry) => {
      if (typeFilter !== TYPE_FILTER_ALL$1 && entry.type !== typeFilter) return false;
      return true;
    });
  }, [baseEntries, typeFilter]);
  const { project: project2, user } = reactExports.useMemo(() => {
    const project22 = visibleEntries.filter((e2) => e2.scope === "project");
    const user2 = visibleEntries.filter((e2) => e2.scope === "user");
    return {
      project: project22,
      user: user2,
    };
  }, [visibleEntries]);
  const loading = isSearching ? searchQuery.isLoading : listQuery.isLoading;
  const errorObj = isSearching ? searchQuery.error : listQuery.error;
  const errorMsg = !gatewayResolving && errorObj instanceof Error ? errorObj.message : void 0;
  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      const res = await deleteMutation.mutateAsync(pendingDelete);
      if (res.deleted) {
        dedupedToast.success(t2("memory.deletedSuccess", "Memory deleted"));
      } else {
        dedupedToast.info(t2("memory.deletedNotFound", "Memory was already removed"));
      }
    } catch (err) {
      dedupedToast.error(
        t2("memory.deletedFailed", "Failed to delete memory") +
          (err instanceof Error ? `: ${err.message}` : ""),
      );
    } finally {
      setPendingDelete(null);
    }
  }
  if (gatewayResolving) {
    return (
      <div className="flex flex-col gap-3" data-action-ui-id="settings.memory.panel">
        <p className="py-6 text-center text-xs text-muted-foreground">
          {t2("common.loading", "Loading…")}
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
            <Button$1
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-md"
              onClick={() => setSecondaryPage(null)}
              disabled={secondaryBackDisabled}
              data-action-ui-id="settings.memory.secondary.back"
            >
              {t2("common.back", "Back")}
            </Button$1>
            <h3 className="font-heading text-lg font-medium text-foreground">
              {secondaryPage === "compaction"
                ? t2("memory.compaction.rewrite.title", "Rewrite memories with AI")
                : t2("memory.snapshots.title", "Snapshots")}
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
    <div className="flex flex-col gap-3" data-action-ui-id="settings.memory.panel">
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[minmax(180px,1fr)_auto_auto] items-center gap-2">
          <div className="relative min-w-[180px]">
            <Search
              size={14}
              className="absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground"
            />
            <Input3
              value={query}
              onChange={(e2) => setQuery(e2.target.value)}
              placeholder={t2("memory.searchPlaceholder", "Search description or body…")}
              data-action-ui-id="settings.memory.search"
              className="rounded-md border-border! bg-muted/30! pl-7 text-xs"
            />
          </div>
          <Select$1 value={scopeFilter} onValueChange={(v2) => setScopeFilter(v2)}>
            <SelectTrigger className={`${FILTER_SELECT_TRIGGER_CLASS} w-32`}>
              <SelectValue>{(v2) => scopeFilterLabel(v2, t2)}</SelectValue>
            </SelectTrigger>
            <SelectContent className={FILTER_SELECT_CONTENT_CLASS}>
              <SelectItem className={FILTER_SELECT_ITEM_CLASS} value="all">
                {t2("memory.scopeAll", "All scopes")}
              </SelectItem>
              {hasWorkspace && (
                <SelectItem className={FILTER_SELECT_ITEM_CLASS} value="project">
                  {t2("memory.scopeProject", "Project")}
                </SelectItem>
              )}
              <SelectItem className={FILTER_SELECT_ITEM_CLASS} value="user">
                {t2("memory.scopeUser", "User")}
              </SelectItem>
            </SelectContent>
          </Select$1>
          <Select$1 value={typeFilter} onValueChange={(v2) => setTypeFilter(v2)}>
            <SelectTrigger className={`${FILTER_SELECT_TRIGGER_CLASS} w-36`}>
              <SelectValue>{(v2) => typeFilterLabel(v2, t2)}</SelectValue>
            </SelectTrigger>
            <SelectContent className={FILTER_SELECT_CONTENT_CLASS}>
              <SelectItem className={FILTER_SELECT_ITEM_CLASS} value={TYPE_FILTER_ALL$1}>
                {t2("memory.typeAll", "All types")}
              </SelectItem>
              {MEMORY_TYPES.map((type2) => (
                <SelectItem key={type2} className={FILTER_SELECT_ITEM_CLASS} value={type2}>
                  {t2(`memory.type.${type2}`, type2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select$1>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button$1
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
            {t2("memory.new", "New")}
          </Button$1>
          <div className="flex items-center gap-1">
            <Button$1
              variant="ghost"
              size="icon-sm"
              className="rounded-md"
              onClick={() => {
                setRefreshFlipped((prev) => !prev);
                void listQuery.refetch();
                if (isSearching) void searchQuery.refetch();
              }}
              aria-label={t2("common.refresh", "Refresh")}
              data-action-ui-id="settings.memory.refresh"
            >
              <RetryIcon
                size={14}
                strokeWidth={1.5}
                className={`transition-transform duration-300 ${refreshFlipped ? "rotate-180" : "rotate-0"}`}
              />
            </Button$1>
            <Button$1
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
              {t2("memory.compaction.openButton", "整理")}
            </Button$1>
            <Button$1
              variant="ghost"
              size="sm"
              className="rounded-md"
              onClick={() => {
                setSecondaryBackDisabled(false);
                setSecondaryPage("snapshots");
              }}
              aria-label={t2("memory.snapshots.openButton", "快照")}
              data-action-ui-id="settings.memory.snapshots.open"
            >
              <History size={14} strokeWidth={1.5} />
              {t2("memory.snapshots.openButton", "快照")}
            </Button$1>
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
                {t2("memory.loadUserMemory.label", "Load user memory")}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {t2(
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
              {t2("memory.autoFeedback.label", "Auto-summarize conversations")}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {t2(
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
              {t2("memory.compaction.autoLabel", "Periodic auto-compaction")}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {t2(
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
          {t2("common.loading", "Loading…")}
        </p>
      ) : visibleEntries.length === 0 ? (
        <EmptyState$2 searching={isSearching} />
      ) : (
        <div className="flex flex-col gap-4">
          {project2.length > 0 && (
            <MemoryList
              scopeLabel={t2("memory.groupProject", "Project scope (current workspace)")}
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
              scopeLabel={t2("memory.groupUser", "User scope (cross-project)")}
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
function EmptyState$2({ searching }) {
  const { t: t2 } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
      <p className="text-sm font-medium text-foreground">
        {searching
          ? t2("memory.emptySearch", "No matching memory")
          : t2("memory.empty", "No memory yet")}
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">
        {searching
          ? t2("memory.emptySearchDesc", "Try a different keyword or clear the filters.")
          : t2(
              "memory.emptyDesc",
              'Memory captures lasting user / project preferences. Click "New" to create one, or let the agent persist them automatically.',
            )}
      </p>
    </div>
  );
}
export function MemorySection() {
  const routerSearch = useRouterState({
    select: (s2) => s2.location.search,
  });
  const { setHeaderOverride } = useSettingsPanelHeader();
  const routeWorkspaceId = normalizeWorkspaceId(routerSearch?.workspaceId) ?? null;
  const activeWorkspaceSnapshot = useTopbarActiveWorkspaceSnapshot();
  const currentWorkspaceId = routeWorkspaceId ?? activeWorkspaceSnapshot.currentWorkspaceId;
  const hiloApp2 = reactExports.useMemo(
    () => instantiationService.invokeFunction((accessor) => accessor.get(IHiloApp)),
    [],
  );
  const runtimeFromLookup = useActiveRuntime(currentWorkspaceId, hiloApp2);
  const runtimeFromTopbar =
    activeWorkspaceSnapshot.activeRuntime?.workspaceId === currentWorkspaceId
      ? activeWorkspaceSnapshot.activeRuntime
      : null;
  const activeRuntime = runtimeFromLookup ?? runtimeFromTopbar;
  const [recovered, setRecovered] = reactExports.useState(null);
  const effectiveRuntime =
    recovered?.sourceRuntime === activeRuntime &&
    recovered.runtime.workspaceId === currentWorkspaceId
      ? recovered.runtime
      : activeRuntime;
  const recoverWorkspaceBinding = reactExports.useCallback(async () => {
    if (!currentWorkspaceId) return void 0;
    const next2 = await hiloApp2.getWorkspaceRuntime(currentWorkspaceId);
    if (!next2?.gatewayBinding) return void 0;
    setRecovered({
      sourceRuntime: activeRuntime,
      runtime: next2,
    });
    return next2.gatewayBinding;
  }, [activeRuntime, currentWorkspaceId, hiloApp2]);
  return (
    <GatewayScopeProvider
      gatewayUrl={effectiveRuntime?.gatewayUrl}
      gatewayBinding={effectiveRuntime?.gatewayBinding}
      scopeKey={currentWorkspaceId ?? void 0}
      workspaceClaim={effectiveRuntime?.workspaceClaim}
      recoverWorkspace={currentWorkspaceId ? recoverWorkspaceBinding : void 0}
    >
      <CurrentWorkspaceContext.Provider value={effectiveRuntime?.folderPath ?? ""}>
        <MemoryManager onHeaderChange={setHeaderOverride} />
      </CurrentWorkspaceContext.Provider>
    </GatewayScopeProvider>
  );
}
export function ChangelogDetailDialog({ item, onClose, onUpdate, imageUrl, onImageError }) {
  const { t: t2 } = useTranslation();
  const [imageVisible, setImageVisible] = reactExports.useState(Boolean(imageUrl));
  reactExports.useEffect(() => {
    setImageVisible(Boolean(imageUrl));
  }, [imageUrl]);
  const closeButton = (
    <DialogClose
      render={
        <Button$1
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute top-2 right-2 z-10 rounded-full bg-black/45 text-white hover:bg-black/60 hover:text-white active:!translate-y-0 focus-visible:ring-white/80"
          data-action-ui-id="update.details.close"
        />
      }
    >
      <X$7 className="size-3" strokeWidth={1.8} />
      <span className="sr-only">{t2("common.close")}</span>
    </DialogClose>
  );
  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[min(80vh,720px)] overflow-y-auto sm:max-w-md"
        showCloseButton={false}
      >
        {item && imageVisible && imageUrl ? (
          <div
            className="relative -mx-1 -mt-1 w-[calc(100%+0.5rem)] overflow-hidden rounded-lg bg-muted"
            data-action-ui-id="update.details.media"
          >
            <img
              src={imageUrl}
              alt=""
              aria-hidden="true"
              className="block h-auto w-full"
              loading="lazy"
              onError={onImageError ?? (() => setImageVisible(false))}
            />
            {closeButton}
          </div>
        ) : (
          closeButton
        )}
        <DialogHeader>
          <DialogTitle>{item ? item.version : ""}</DialogTitle>
          <DialogDescription>{item ? item.subtitle : ""}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2 text-sm text-foreground">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t2("home.changelog")}
            </span>
            <ul className="flex flex-col gap-1 text-xs text-foreground/80">
              {item?.changelog.map((text2) => (
                <li key={text2}>
                  {"- "}
                  {text2}
                </li>
              ))}
            </ul>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{item?.date}</span>
            <span className="inline-flex rounded-sm bg-muted px-2 py-0.5 font-medium">
              {item ? item.badge : ""}
            </span>
          </div>
          {onUpdate && (
            <Button$1
              type="button"
              size="lg"
              className="w-full rounded-md"
              onClick={() => {
                onClose();
                onUpdate();
              }}
              data-action-ui-id="update.btn.installNow"
            >
              <CircleArrowUp data-icon="inline-start" className="size-4" strokeWidth={1.7} />
              {t2("update.btn.installNow")}
            </Button$1>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function ChangelogTable({ rows, limit, onRowClick, onRowHover, className }) {
  const { t: t2 } = useTranslation();
  const visibleRows = typeof limit === "number" ? rows.slice(0, limit) : rows;
  return (
    <div className={`flex-1 min-w-0 overflow-x-auto scrollbar-none ${className ?? ""}`}>
      <div className="flex items-center border-b border-border pb-3 pr-6 text-xs uppercase text-muted-foreground font-heading">
        <span className="w-[100px] shrink-0">{t2("home.date")}</span>
        <span className="flex-1 min-w-0">{t2("home.news")}</span>
        <span className="w-[100px] shrink-0 text-right">{t2("home.type")}</span>
      </div>
      {visibleRows.map((item, index2) => (
        <button
          key={item.id}
          type="button"
          className="home-fade-up w-full group flex items-center border-b border-border py-5 pr-6 hover:bg-foreground/8 transition-colors duration-150 cursor-pointer text-left"
          style={{
            animationDelay: `${index2 * 30}ms`,
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
function SoftwareUpdateStatusIcon({ className }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 200 200"
      className={className}
      data-action-ui-id="settings.software-update.status-icon"
    >
      <path
        d="M119.857 131H80.1429C77.3814 131 75.1429 128.761 75.1429 126V94.9774H53.9299C49.4955 94.9774 47.2556 89.6332 50.3649 86.4715L96.4351 39.625C98.3942 37.6329 101.606 37.6328 103.565 39.625L149.635 86.4715C152.744 89.6332 150.505 94.9774 146.07 94.9774H124.857V126C124.857 128.761 122.619 131 119.857 131Z"
        fill="currentColor"
      />
      <rect opacity="0.8" x="74" y="144" width="51" height="10" rx="3" fill="currentColor" />
      <rect opacity="0.5" x="82" y="165" width="35" height="10" rx="3" fill="currentColor" />
    </svg>
  );
}
export function SoftwareUpdateSection() {
  const updater = useOptionalUpdaterContext();
  if (!updater) return <SoftwareUpdateUnavailableSection />;
  return <SoftwareUpdateSectionContent />;
}
function SoftwareUpdateUnavailableSection() {
  const { t: t2 } = useTranslation();
  const runtimeConfig = useRuntimeConfig();
  return (
    <div className="space-y-4">
      <div
        className="rounded-lg bg-secondary/60 p-2"
        data-action-ui-id="settings.software-update.status-card"
      >
        <div className="flex items-center gap-2 rounded-md px-2 py-2">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground"
            data-action-ui-id="settings.software-update.status-icon-bg"
          >
            <AlertCircle size={18} strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-normal text-foreground">
              {t2("settings.softwareUpdate.unavailableTitle")}
            </p>
            <p className="mt-1 truncate text-xs leading-relaxed text-muted-foreground">
              {t2("settings.softwareUpdate.unavailableDesc")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-center">
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">
              {t2("settings.softwareUpdate.currentVersion", {
                version: `v${runtimeConfig.appVersion}`,
              })}
            </span>
            <Button$1
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1.5 font-normal"
              disabled={true}
              data-action-ui-id="settings.software-update.unavailable"
            >
              <RetryIcon size={14} />
              {t2("update.version.checkCta")}
            </Button$1>
          </div>
        </div>
      </div>
    </div>
  );
}
function SoftwareUpdateSectionContent() {
  const { t: t2 } = useTranslation();
  const { config: config2, set: set2 } = useSettings();
  const update2 = useUpdateActions({
    manualDownloadSource: "settings.software-update.manual-download",
  });
  const changelogItem = useUpdateChangelogItem(update2.state, {
    fallbackToLatest: true,
  });
  const [showDetail, setShowDetail] = reactExports.useState(false);
  const autoInstallId = reactExports.useId();
  const autoInstallDescriptionId = `${autoInstallId}-description`;
  const manualOnly = update2.state.manualOnly;
  const autoInstallOnQuit = config2.autoInstallOnQuit === true;
  const autoInstallDisabled = manualOnly && !autoInstallOnQuit;
  const handleAutoInstallChange = (checked) => {
    void set2("autoInstallOnQuit", checked);
  };
  const status = reactExports.useMemo(() => {
    switch (update2.state.phase) {
      case "checking":
        return {
          icon: SoftwareUpdateStatusIcon,
          iconClassName: "text-brand-accent",
          title: t2("settings.softwareUpdate.statusChecking"),
          description: t2("settings.softwareUpdate.statusCheckingDesc"),
        };
      case "available":
        return {
          icon: SoftwareUpdateStatusIcon,
          iconClassName: "text-brand-accent",
          title: update2.targetVersionLabel
            ? t2("settings.softwareUpdate.statusAvailableWithVersion", {
                version: update2.targetVersionLabel,
              })
            : t2("update.title.available"),
          description:
            update2.state.subtitle ??
            changelogItem?.subtitle ??
            t2("settings.softwareUpdate.statusAvailableDesc"),
        };
      case "downloading":
        return {
          icon: SoftwareUpdateStatusIcon,
          iconClassName: "text-brand-accent",
          title: t2("update.title.downloading"),
          description: update2.progressText || t2("settings.softwareUpdate.statusDownloadingDesc"),
        };
      case "downloaded":
        return {
          icon: SoftwareUpdateStatusIcon,
          iconClassName: "text-brand-accent",
          title: update2.targetVersionLabel
            ? t2("settings.softwareUpdate.statusReadyWithVersion", {
                version: update2.targetVersionLabel,
              })
            : t2("update.title.downloaded"),
          description: t2("settings.softwareUpdate.statusReadyDesc"),
        };
      case "error": {
        const isManualRecovery = update2.state.manualOnly;
        return {
          icon: AlertCircle,
          iconClassName: "text-destructive",
          title: t2("update.title.error"),
          description: isManualRecovery
            ? formatManualRecoveryMessage(update2.state.manualRecoveryCode, t2)
            : formatUpdaterErrorMessage(update2.state.error?.message, t2, t2("update.error")),
        };
      }
      default:
        return {
          icon: SoftwareUpdateStatusIcon,
          iconClassName: "text-brand-accent",
          title: t2("settings.softwareUpdate.statusLatest"),
          description: t2("settings.softwareUpdate.statusLatestDesc"),
        };
    }
  }, [update2, changelogItem, t2]);
  const StatusIcon = status.icon;
  const showFilledAction =
    update2.available ||
    update2.downloaded ||
    (update2.state.phase === "error" && update2.canManualDownload);
  const showPrimaryAction = update2.state.phase !== "downloading";
  const showUpdatePrompt = (update2.available || update2.downloaded) && !!status.description;
  return (
    <div className="space-y-4">
      <div
        className="rounded-lg bg-secondary/60 p-2"
        data-action-ui-id="settings.software-update.status-card"
      >
        <div
          className="flex items-center gap-2 rounded-md px-2 py-2"
          data-action-ui-id="settings.software-update.status-summary"
        >
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground"
            data-action-ui-id="settings.software-update.status-icon-bg"
          >
            <StatusIcon className={cn$2("size-7", status.iconClassName)} strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-normal text-foreground">{status.title}</p>
              {update2.targetVersionLabel && (
                <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-foreground/[0.08] px-2 text-[11px] font-medium leading-none text-muted-foreground">
                  {update2.targetVersionLabel}
                </span>
              )}
            </div>
            {update2.versionDelta && (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {update2.versionDelta.display}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 self-center">
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">
              {t2("settings.softwareUpdate.currentVersion", {
                version: update2.currentVersionLabel,
              })}
            </span>
            {showPrimaryAction && (
              <Button$1
                type="button"
                variant={showFilledAction ? "default" : "outline"}
                size="sm"
                className={cn$2(
                  "h-8 shrink-0 gap-1.5",
                  !showFilledAction && "font-normal",
                  showFilledAction &&
                    "bg-brand-accent text-brand-accent-foreground hover:opacity-90",
                )}
                disabled={update2.primaryActionDisabled}
                onClick={update2.handlePrimaryAction}
                data-action-ui-id="settings.software-update.primary"
              >
                {update2.showCheckIcon && (
                  <RetryIcon
                    size={14}
                    strokeWidth={1.5}
                    className={cn$2(update2.checking && "animate-spin")}
                  />
                )}
                {update2.primaryActionLabel}
              </Button$1>
            )}
          </div>
        </div>
        {showUpdatePrompt && (
          <div
            className="border-t border-border/70 px-2 pt-3 pb-2 pl-14"
            data-action-ui-id="settings.software-update.update-prompt"
          >
            <p
              className="text-sm font-normal text-foreground"
              data-action-ui-id="settings.software-update.update-prompt-title"
            >
              {t2("settings.softwareUpdate.updatePrompt")}
            </p>
            <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
              {status.description}
            </p>
          </div>
        )}
        {update2.state.phase === "error" && (
          <div className="border-t border-border/70 px-2 pt-3 pb-2 pl-14">
            <p className="text-xs text-muted-foreground">{status.description}</p>
            {update2.canManualDownload && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t2("update.manualRecovery.hint.policy")}
              </p>
            )}
          </div>
        )}
        {update2.downloading && (
          <div className="px-2 pb-2 pl-12">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-card">
              <div
                className="h-full rounded-full bg-brand-accent transition-all duration-300"
                style={{
                  width: `${update2.progressValue}%`,
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{update2.progressText}</span>
              <button
                type="button"
                className="cursor-pointer rounded-md px-1.5 py-1 transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
                onClick={update2.cancelDownload}
                data-action-ui-id="settings.software-update.cancel"
              >
                {t2("update.btn.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-left transition-colors hover:bg-foreground/[0.03] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          disabled={!changelogItem}
          onClick={() => setShowDetail(true)}
          data-action-ui-id="settings.software-update.release-notes"
        >
          <FileText size={18} strokeWidth={1.5} className="shrink-0 text-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-normal text-foreground">
              {t2("settings.softwareUpdate.releaseNotes")}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {changelogItem?.subtitle ?? t2("settings.softwareUpdate.releaseNotesEmpty")}
            </p>
          </div>
        </button>
        <div
          className={cn$2(
            "flex items-center gap-3 rounded-sm px-3 py-2",
            autoInstallDisabled && "opacity-60",
          )}
        >
          <RetryIcon size={18} className="shrink-0 text-foreground" />
          <div className="min-w-0 flex-1">
            <Label
              htmlFor={autoInstallId}
              className={cn$2(
                "block text-sm leading-5 font-normal text-foreground",
                autoInstallDisabled ? "cursor-not-allowed" : "cursor-pointer",
              )}
            >
              {t2("settings.softwareUpdate.autoInstall")}
            </Label>
            <p id={autoInstallDescriptionId} className="mt-0.5 text-xs text-muted-foreground">
              {manualOnly
                ? t2("settings.softwareUpdate.autoInstallUnavailable")
                : t2("settings.softwareUpdate.autoInstallDesc")}
            </p>
          </div>
          <Switch
            id={autoInstallId}
            checked={autoInstallOnQuit}
            disabled={autoInstallDisabled}
            onCheckedChange={handleAutoInstallChange}
            aria-label={t2("settings.softwareUpdate.autoInstall")}
            aria-describedby={autoInstallDescriptionId}
            data-action-ui-id="settings.software-update.auto-install"
          />
        </div>
      </div>
      <ChangelogDetailDialog
        item={showDetail ? changelogItem : null}
        onClose={() => setShowDetail(false)}
        onUpdate={
          update2.available
            ? update2.canManualDownload
              ? update2.handleManualDownload
              : update2.download
            : void 0
        }
      />
    </div>
  );
}
export const SECTIONS = [
  {
    id: "general",
    icon: Settings2,
    labelKey: "settings.general",
  },
  {
    id: "account",
    icon: CircleUserRound,
    labelKey: "settings.account.title",
  },
  {
    id: "storage",
    icon: HardDrive,
    labelKey: "settings.storageSection",
  },
  {
    id: "network",
    icon: Globe,
    labelKey: "settings.networkSection",
  },
  {
    id: "models",
    icon: Bot,
    labelKey: "settings.models.title",
  },
  {
    id: "memory",
    icon: Brain$2,
    labelKey: "settings.memory",
  },
  {
    id: "imBridge",
    icon: Smartphone,
    labelKey: (region) => `imBridge.title.${region}`,
  },
  {
    id: "assetCenter",
    icon: Library,
    labelKey: "settings.assetCenter.title",
  },
  {
    id: "comfyui",
    icon: Blocks,
    labelKey: "settings.comfyui.title",
  },
  {
    id: "advanced",
    icon: SlidersHorizontal,
    labelKey: "settings.advanced",
  },
  {
    id: "softwareUpdate",
    icon: CircleArrowUp,
    labelKey: "settings.softwareUpdate.title",
  },
];
