// compact-rewrite-flow.jsx
import {
  ChevronLeft,
  dedupedToast,
  jsxRuntimeExports,
  LoaderCircle,
  reactExports,
  useMutation,
  useQueryClient,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  Button$1,
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

function PreviewPhase({ originalEntries, upserts }) {
  const { t: t2 } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <section className="flex flex-col gap-2">
        <header className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">
            {t2("memory.compaction.rewrite.originalLabel", "Original")}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {originalEntries.length}
          </span>
        </header>
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
          {originalEntries.map((e2) => (
            <li key={e2.name} className="flex flex-col gap-0.5 px-2 py-1.5">
              <div className="flex items-center gap-2">
                <span className="truncate font-mono text-xs text-foreground">
                  {e2.name}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {e2.type}
                </Badge>
              </div>
              <span className="truncate text-[11px] text-muted-foreground">
                {e2.description}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <header className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">
            {t2("memory.compaction.rewrite.newLabel", "New version")}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {upserts?.length ?? 0}
          </span>
        </header>
        <ul className="flex flex-col gap-2">
          {(upserts ?? []).map((u4) => (
            <li
              key={u4.name}
              className="flex flex-col gap-1 border-l-2 border-primary bg-primary/5 px-2 py-1.5"
              data-action-ui-id={`settings.memory.compaction.upsert.${u4.name}`}
            >
              <div className="flex items-center gap-2">
                <span className="truncate font-mono text-xs text-foreground">
                  {u4.name}
                </span>
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
              <p className="text-[11px] text-muted-foreground">
                {u4.description}
              </p>
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
          t2(
            "memory.compaction.rewrite.previewFailed",
            "Failed to generate rewrite proposal",
          )}
      </p>
    );
  }
  if (entries2.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <p className="text-sm font-medium text-foreground">
          {t2(
            "memory.compaction.rewrite.emptyEligible",
            "No user memories available to rewrite.",
          )}
        </p>
        {assetPinCount > 0 && (
          <p className="max-w-sm text-xs text-muted-foreground">
            {t2("memory.compaction.rewrite.assetPinExcluded", {
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
    entries2.length > 0 && entries2.every((e2) => selectedNames.has(e2.name));
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
              defaultValue:
                "{{n}} asset-pin anchors are excluded automatically.",
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
                  <span className="truncate font-mono text-xs text-foreground">
                    {name2}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {e2.type}
                  </Badge>
                </div>
                <span className="truncate text-[11px] text-muted-foreground">
                  {e2.description}
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

export function CompactRewriteFlow({ open, surface, onClose, onBusyChange }) {
  const { t: t2 } = useTranslation();
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
        t2(
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
                    t2(
                      "memory.compaction.undoDone",
                      "Restored to pre-compaction state",
                    ),
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
          t2(
            "memory.compaction.rewrite.executeFailed",
            "Failed to apply rewrite",
          ) + (message2 ? `: ${message2}` : ""),
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
          originalEntries={eligibleEntries.filter((e2) =>
            deletes.includes(e2.name),
          )}
          upserts={upserts}
        />
      )}
      {phase === "executing" && (
        <div className="flex-shrink-0">
          <PhaseSpinner
            label={t2(
              "memory.compaction.rewrite.executing",
              "Applying rewrite…",
            )}
          />
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
        <div className="flex shrink-0 justify-end gap-2 border-border border-t pt-3">
          {footer2}
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
        {body2}
      </div>
      <DialogFooter className="flex-shrink-0">{footer2}</DialogFooter>
    </>
  );
}
