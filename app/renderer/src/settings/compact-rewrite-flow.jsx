// compact-rewrite-flow.jsx
import { ChevronLeft, jsxRuntimeExports, LoaderCircle, reactExports, useMutation, useQueryClient, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  Button,
  DialogFooter,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import {
  Badge,
  DialogDescription,
  DialogTitle,
} from "../infra/badge-variants.jsx";
import { Checkbox } from "../infra/checkbox.jsx";
import {
  COMPACTION_BASE,
  expectOk,
  memoryQueryKeys,
  useMemoryList,
  useSnapshotRestore,
} from "./changelog-table.jsx";
import {
  useGatewayFetch,
  useGatewayScopeKey,
} from "../generation/use-model-catalog-scope-key.js";
async function previewRewrite(fetcher, selectedNames) {
  const body = {
    scope: "user",
    selectedNames,
  };
  const res = await fetcher(`${COMPACTION_BASE}/rewrite/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  await expectOk(res);
  return await res.json();
}
async function executeRewrite(fetcher, proposalId) {
  const body = {
    scope: "user",
    proposalId,
  };
  const res = await fetcher(`${COMPACTION_BASE}/rewrite/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  await expectOk(res);
  return await res.json();
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ proposalId }) => executeRewrite(fetcher, proposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: memoryQueryKeys.scopeRoot(scopeKey),
      });
    },
  });
}
function getMergeOp(plan) {
  if (!plan || plan.operations.length === 0) return null;
  const merge = plan.operations.find((op) => op.type === "merge");
  return merge ?? null;
}
function PreviewPhase({ originalEntries, upserts }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <section className="flex flex-col gap-2">
        <header className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">
            {t("memory.compaction.rewrite.originalLabel", "Original")}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {originalEntries.length}
          </span>
        </header>
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
          {originalEntries.map((entry) => (
            <li key={entry.name} className="flex flex-col gap-0.5 px-2 py-1.5">
              <div className="flex items-center gap-2">
                <span className="truncate font-mono text-xs text-foreground">
                  {entry.name}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {entry.type}
                </Badge>
              </div>
              <span className="truncate text-[11px] text-muted-foreground">
                {entry.description}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <header className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">
            {t("memory.compaction.rewrite.newLabel", "New version")}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {upserts?.length ?? 0}
          </span>
        </header>
        <ul className="flex flex-col gap-2">
          {(upserts ?? []).map((upsert) => (
            <li
              key={upsert.name}
              className="flex flex-col gap-1 border-l-2 border-primary bg-primary/5 px-2 py-1.5"
              data-action-ui-id={`settings.memory.compaction.upsert.${upsert.name}`}
            >
              <div className="flex items-center gap-2">
                <span className="truncate font-mono text-xs text-foreground">
                  {upsert.name}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {upsert.type}
                </Badge>
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {t("memory.compaction.rewrite.replacesN", {
                    n: upsert.compactedFrom.length,
                    defaultValue: "← replaces {{n}}",
                  })}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {upsert.description}
              </p>
              {upsert.body && (
                <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-[11px] text-foreground">
                  {upsert.body}
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
function SelectPhase({
  entries,
  assetPinCount,
  loading,
  error,
  selectedNames,
  onToggle,
  onSelectAll,
  onSelectNone,
}) {
  const { t } = useTranslation();
  if (loading) {
    return <PhaseSpinner label={t("common.loading", "Loading…")} />;
  }
  if (error) {
    return (
      <p className="px-3 py-2 text-xs text-destructive">
        {error.message ||
          t(
            "memory.compaction.rewrite.previewFailed",
            "Failed to generate rewrite proposal",
          )}
      </p>
    );
  }
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <p className="text-sm font-medium text-foreground">
          {t(
            "memory.compaction.rewrite.emptyEligible",
            "No user memories available to rewrite.",
          )}
        </p>
        {assetPinCount > 0 && (
          <p className="max-w-sm text-xs text-muted-foreground">
            {t("memory.compaction.rewrite.assetPinExcluded", {
              n: assetPinCount,
              defaultValue:
                "{{n}} asset-pin anchors are excluded automatically.",
            })}
          </p>
        )}
      </div>
    );
  }
  const allSelected =
    entries.length > 0 && entries.every((entry) => selectedNames.has(entry.name));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Button
          variant="link"
          size="sm"
          className="h-auto px-0 text-xs"
          onClick={() => (allSelected ? onSelectNone() : onSelectAll())}
          data-action-ui-id="settings.memory.compaction.selectToggle"
        >
          {allSelected
            ? t("memory.compaction.rewrite.selectNone", "Clear selection")
            : t("memory.compaction.rewrite.selectAll", "Select all")}
        </Button>
        {assetPinCount > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {t("memory.compaction.rewrite.assetPinExcluded", {
              n: assetPinCount,
              defaultValue:
                "{{n}} asset-pin anchors are excluded automatically.",
            })}
          </span>
        )}
      </div>
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
        {entries.map((entry) => {
          const entryName = entry.name;
          const checked = selectedNames.has(entryName);
          return (
            <li
              key={entryName}
              className="flex items-center gap-2 px-2 py-1.5"
              data-action-ui-id={`settings.memory.compaction.row.${entryName}`}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => onToggle(entryName)}
                aria-label={entryName}
                data-action-ui-id={`settings.memory.compaction.select.${entryName}`}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-xs text-foreground">
                    {entryName}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {entry.type}
                  </Badge>
                </div>
                <span className="truncate text-[11px] text-muted-foreground">
                  {entry.description}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
function SelectFooter({ selectedCount, cancelDisabled, onCancel, onGenerate }) {
  const { t } = useTranslation();
  return (
    <>
      <Button
        variant="outline"
        onClick={onCancel}
        disabled={cancelDisabled}
        data-action-ui-id="settings.memory.compaction.cancel"
      >
        {t("memory.compaction.cancel", "Cancel")}
      </Button>
      <Button
        onClick={onGenerate}
        disabled={selectedCount === 0}
        data-action-ui-id="settings.memory.compaction.generate"
      >
        {selectedCount > 0
          ? t("memory.compaction.rewrite.generateButtonWithCount", {
              n: selectedCount,
              defaultValue: "Generate rewrite ({{n}})",
            })
          : t("memory.compaction.rewrite.generateButton", "Generate rewrite")}
      </Button>
    </>
  );
}
function PreviewFooter({ executing, onBack, onApply }) {
  const { t } = useTranslation();
  return (
    <>
      <Button
        variant="outline"
        onClick={onBack}
        disabled={executing}
        data-action-ui-id="settings.memory.compaction.back"
      >
        <ChevronLeft size={14} strokeWidth={1} />
        {t("memory.compaction.rewrite.backButton", "Back")}
      </Button>
      <Button
        onClick={onApply}
        disabled={executing}
        data-action-ui-id="settings.memory.compaction.execute"
      >
        {executing
          ? t("memory.compaction.rewrite.executing", "Applying rewrite…")
          : t("memory.compaction.rewrite.applyButton", "Apply rewrite")}
      </Button>
    </>
  );
}
export function CompactRewriteFlow({ open, surface, onClose, onBusyChange }) {
  const { t } = useTranslation();
  const memoryList = useMemoryList("user");
  const [phase, setPhase] = reactExports.useState("select");
  const [selectedNames, setSelectedNames] = reactExports.useState(
    () => new Set(),
  );
  const [proposal, setProposal] = reactExports.useState(null);
  const previewMutation = useRewritePreview();
  const executeMutation = useRewriteExecute();
  const restoreMutation = useSnapshotRestore();
  const eligibleEntries = reactExports.useMemo(() => {
    const entries = memoryList.data ?? [];
    return entries.filter((entry) => entry.type !== "asset-pin");
  }, [memoryList.data]);
  const assetPinCount = reactExports.useMemo(() => {
    const entries = memoryList.data ?? [];
    return entries.filter((entry) => entry.type === "asset-pin").length;
  }, [memoryList.data]);
  const seededRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (!open) {
      seededRef.current = false;
      return;
    }
    if (seededRef.current) return;
    if (eligibleEntries.length === 0) return;
    setSelectedNames(new Set(eligibleEntries.map((entry) => entry.name)));
    seededRef.current = true;
  }, [open, eligibleEntries]);
  reactExports.useEffect(() => {
    if (open) {
      setPhase("select");
      setProposal(null);
    }
  }, [open]);
  function toggleSelect(entryName) {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(entryName)) next.delete(entryName);
      else next.add(entryName);
      return next;
    });
  }
  function selectAll() {
    setSelectedNames(new Set(eligibleEntries.map((entry) => entry.name)));
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
        t(
          "memory.compaction.rewrite.previewFailed",
          "Failed to generate rewrite proposal",
        ) + (err instanceof Error ? `: ${err.message}` : ""),
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
      const description = t("memory.compaction.rewrite.doneToast", {
        deleted: summary.deleted,
        merged: summary.merged,
        defaultValue: "Rewrote {{deleted}} entries into {{merged}}",
      });
      const snapshotId = summary.snapshotId;
      if (snapshotId) {
        dedupedToast.success(description, {
          action: {
            label: t("memory.compaction.undo", "Undo"),
            onClick: () => {
              void (async () => {
                try {
                  await restoreMutation.mutateAsync({
                    snapshotId,
                  });
                  dedupedToast.success(
                    t(
                      "memory.compaction.undoDone",
                      "Restored to pre-compaction state",
                    ),
                  );
                } catch (err) {
                  dedupedToast.error(
                    t("memory.compaction.undoFailed", "Undo failed") +
                      (err instanceof Error ? `: ${err.message}` : ""),
                  );
                }
              })();
            },
          },
        });
      } else {
        dedupedToast.success(description);
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      const isExpired = /\b410\b|gone|expired|proposal/i.test(message);
      if (isExpired) {
        setPhase("select");
        setProposal(null);
        dedupedToast.error(
          t(
            "memory.compaction.rewrite.proposalExpired",
            "The rewrite proposal has expired. Please regenerate.",
          ),
        );
      } else {
        setPhase("preview");
        dedupedToast.error(
          t(
            "memory.compaction.rewrite.executeFailed",
            "Failed to apply rewrite",
          ) + (message ? `: ${message}` : ""),
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
        {t("memory.compaction.rewrite.previewTitle", "Review rewrite")}
        {proposal && (
          <span className="text-xs font-normal text-muted-foreground">
            {t("memory.compaction.rewrite.previewSummary", {
              from: deletes.length,
              to: upserts.length,
              defaultValue: "{{from}} → {{to}}",
            })}
          </span>
        )}
      </>
    ) : (
      t("memory.compaction.rewrite.title", "Rewrite memories with AI")
    );
  const description =
    phase === "preview" || phase === "executing"
      ? proposal &&
        t("memory.compaction.rewrite.modelLabel", {
          model: proposal.llmModel,
          defaultValue: "Model: {{model}}",
        })
      : t(
          "memory.compaction.rewrite.subtitle",
          "Pick entries to consolidate; the AI rewrites them into fewer, denser notes for review before any change is applied.",
        );
  const body = (
    <>
      {phase === "select" && (
        <SelectPhase
          entries={eligibleEntries}
          assetPinCount={assetPinCount}
          loading={memoryList.isLoading}
          error={memoryList.isError ? memoryList.error : null}
          selectedNames={selectedNames}
          onToggle={toggleSelect}
          onSelectAll={selectAll}
          onSelectNone={selectNone}
        />
      )}
      {phase === "previewing" && (
        <PhaseSpinner
          label={t("memory.compaction.rewrite.previewing", {
            n: selectedNames.size,
            defaultValue: "AI is rewriting {{n}} selected memories…",
          })}
        />
      )}
      {isInPreviewLike && proposal && (
        <PreviewPhase
          originalEntries={eligibleEntries.filter((entry) =>
            deletes.includes(entry.name),
          )}
          upserts={upserts}
        />
      )}
      {phase === "executing" && (
        <div className="flex-shrink-0">
          <PhaseSpinner
            label={t(
              "memory.compaction.rewrite.executing",
              "Applying rewrite…",
            )}
          />
        </div>
      )}
    </>
  );
  const footer = (
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
          {t("memory.compaction.rewrite.previewing", {
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
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{body}</div>
        <div className="flex shrink-0 justify-end gap-2 border-border border-t pt-3">
          {footer}
        </div>
      </div>
    );
  }
  return (
    <>
      <DialogHeader className="flex-shrink-0">
        <DialogTitle className="flex items-center gap-2">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {body}
      </div>
      <DialogFooter className="flex-shrink-0">{footer}</DialogFooter>
    </>
  );
}
