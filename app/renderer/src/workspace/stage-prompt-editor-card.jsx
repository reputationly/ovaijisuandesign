// stage-prompt-editor-card.jsx
import { useTranslation, reactExports, Check, Loader2, RotateCcw } from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import {
  Button$1,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
  Textarea,
  DialogFooter,
} from "../infra/use-browser-overlay-dialog-props.jsx";
import { resolveModelNameForCurrentRegion } from "../generation/resolve-chat-file-reference.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { StaleProductionPlanSaveError, itemDisplayName } from "../text-editor/pending-annotation-list.jsx";
import {
  GENERATION_FIELD_ALIASES,
  PROMPT_PREVIEW_LIMIT,
  firstField,
  friendlyItemName,
  userFacingContentName,
} from "./use-production-board.js";
function itemGenerationFields(stage, item) {
  const itemId = item.id || item.item_id;
  const runtimeItem = stage.runtime_refs.find(
    (candidate) => (candidate.id || candidate.item_id) === itemId,
  );
  return Object.assign({}, stage.stage_fields, ...(stage.execution_locks ?? []), item, runtimeItem);
}
function generationKind(fields, prompt) {
  const raw2 = (fields.modality || fields.output_type || fields.media_type || "").toLowerCase();
  if (/image|photo|poster|图片|图像/.test(raw2)) return "image";
  if (/video|clip|视频/.test(raw2)) return "video";
  if (/music|音乐|配乐/.test(raw2)) return "music";
  if (/audio|speech|voice|音频|声音/.test(raw2)) return "audio";
  if (/document|文档/.test(raw2)) return "document";
  if (/text|copy|script|文本|文案/.test(raw2)) return "text";
  if (/视频|动态|片段/.test(prompt)) return "video";
  if (/图片|图像|海报/.test(prompt)) return "image";
  if (/音频|声音|旁白|配音/.test(prompt)) return "audio";
  return "unknown";
}
function generationParameters(fields, prompt, kind) {
  const parameters = [];
  for (const key2 of Object.keys(GENERATION_FIELD_ALIASES)) {
    let value = firstField(fields, GENERATION_FIELD_ALIASES[key2]);
    if (!value && key2 === "aspectRatio") value = prompt.match(/\b\d{1,2}:\d{1,2}\b/)?.[0];
    if (!value && key2 === "resolution") {
      value = prompt.match(/\b(?:\d{3,4}p|\d{3,4}\s*[x×]\s*\d{3,4})\b/i)?.[0];
    }
    if (!value) continue;
    if (key2 === "model") {
      const preferredType =
        kind === "unknown" || kind === "document" ? void 0 : kind === "music" ? "audio" : kind;
      value = resolveModelNameForCurrentRegion(
        value,
        preferredType === "text" ? "text" : preferredType,
      );
    }
    parameters.push({
      key: key2,
      value,
    });
  }
  return parameters;
}
function itemSequence(item, index2) {
  const fromName = friendlyItemName(item.name).match(/^(\d+)\b/)?.[1];
  if (fromName) return fromName.padStart(2, "0");
  const fromId = item.id.match(/(?:^|[_-])(\d+)(?:$|[_-])/i)?.[1];
  return (fromId ?? String(index2 + 1)).padStart(2, "0");
}
function parseRefs(item) {
  const value = item.refs || item.ref_ids || "";
  if (value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((ref) => typeof ref === "string")
          .map((ref) => ref.trim())
          .filter(Boolean);
      }
    } catch {}
  }
  const inner = value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
  return inner
    .split(",")
    .map((ref) => ref.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}
function sourceLabels(stage, item) {
  const labels = parseRefs(item).map((ref) => stage.reference_labels[ref] || ref);
  const sourceStageId = item.source_stage_id?.trim();
  if (sourceStageId) labels.push(stage.stage_names[sourceStageId] ?? sourceStageId);
  for (const refId of [
    item.source_brief_id,
    item.document_node_id,
    item.source_document_node_id,
    item.upstream_document_node_id,
  ]) {
    const label = refId ? stage.reference_labels[refId] : void 0;
    if (label) labels.push(label);
  }
  return [...new Set(labels.map((label) => label.trim()).filter(Boolean))];
}
function displayedReferenceValues(stage, refs) {
  const labels = refs.map((ref) => stage.reference_labels[ref]?.trim() || ref);
  const labelCounts = new Map();
  for (const label of labels) labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
  return refs.map((ref, index2) => {
    const label = labels[index2];
    if (label === ref || labelCounts.get(label) === 1) return label;
    return `${label} [${ref}]`;
  });
}
function parseDisplayedReferences(stage, currentRefs, value) {
  const currentDisplayToId = new Map(
    displayedReferenceValues(stage, currentRefs).map((label, index2) => [
      label,
      currentRefs[index2],
    ]),
  );
  const labelToIds = new Map();
  for (const [id2, rawLabel] of Object.entries(stage.reference_labels)) {
    const label = rawLabel.trim();
    if (!label) continue;
    labelToIds.set(label, [...(labelToIds.get(label) ?? []), id2]);
  }
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const currentId = currentDisplayToId.get(entry);
      if (currentId) return currentId;
      const ids2 = labelToIds.get(entry);
      return ids2?.length === 1 ? ids2[0] : entry;
    });
}
function editableItems(stage) {
  return stage.work_items.flatMap((item) => {
    const id2 = item.id?.trim();
    const prompt = item.prompt?.trim() ?? "";
    if (!id2 || !prompt) return [];
    const fields = itemGenerationFields(stage, item);
    const kind = generationKind(fields, prompt);
    return [
      {
        id: id2,
        name: itemDisplayName(item) || id2,
        prompt,
        kind,
        parameters: generationParameters(fields, prompt, kind),
        refs: parseRefs(item),
        sourceLabels: sourceLabels(stage, item),
      },
    ];
  });
}
export const StagePromptEditorCard = reactExports.forwardRef(function StagePromptEditorCard2(
  { stage, readOnly: readOnly2 = false, disabled: disabled2 = false, saveStageWorkItems },
  ref,
) {
  const { t: t2 } = useTranslation();
  const items = reactExports.useMemo(() => editableItems(stage), [stage]);
  const [expanded, setExpanded] = reactExports.useState(false);
  const [selectedId, setSelectedId] = reactExports.useState(items[0]?.id ?? "");
  const [drafts, setDrafts] = reactExports.useState({});
  const [refDrafts, setRefDrafts] = reactExports.useState({});
  const [saving, setSaving] = reactExports.useState(false);
  const [error, setError] = reactExports.useState();
  const [showAllPreviews, setShowAllPreviews] = reactExports.useState(false);
  const [conflicts, setConflicts] = reactExports.useState({});
  const [removedItems, setRemovedItems] = reactExports.useState({});
  const conflictsRef = reactExports.useRef(conflicts);
  conflictsRef.current = conflicts;
  const contractSnapshot = reactExports.useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, item])),
    [items],
  );
  const contractFingerprint = JSON.stringify(
    items.map((item) => ({
      id: item.id,
      prompt: item.prompt,
      refs: item.refs,
    })),
  );
  const previousContractRef = reactExports.useRef({
    stageId: stage.id,
    fingerprint: contractFingerprint,
    snapshot: contractSnapshot,
  });
  reactExports.useLayoutEffect(() => {
    const previous2 = previousContractRef.current;
    previousContractRef.current = {
      stageId: stage.id,
      fingerprint: contractFingerprint,
      snapshot: contractSnapshot,
    };
    if (previous2.stageId !== stage.id) {
      setExpanded(false);
      setSelectedId("");
      setDrafts({});
      setError(void 0);
      setShowAllPreviews(false);
      setRefDrafts({});
      setConflicts({});
      setRemovedItems({});
      return;
    }
    if (previous2.fingerprint === contractFingerprint) return;
    const transitions = {};
    const detectedRemovedItems = {};
    for (const [itemId, oldItem] of Object.entries(previous2.snapshot)) {
      const item = contractSnapshot[itemId];
      const promptDraft = drafts[itemId];
      const refsDraft = refDrafts[itemId];
      const promptDirty = promptDraft !== void 0 && promptDraft !== oldItem.prompt;
      const refsDirty =
        refsDraft !== void 0 && JSON.stringify(refsDraft) !== JSON.stringify(oldItem.refs);
      if (!item) {
        if (promptDirty || refsDirty) {
          transitions[itemId] = {
            promptChanged: true,
            refsChanged: true,
            promptConflict: promptDirty,
            refsConflict: refsDirty,
            removed: true,
            reappeared: false,
          };
          detectedRemovedItems[itemId] = oldItem;
        }
        continue;
      }
      const promptChanged = oldItem.prompt !== item.prompt;
      const refsChanged = JSON.stringify(oldItem.refs) !== JSON.stringify(item.refs);
      const promptConflict = promptChanged && promptDirty && promptDraft !== item.prompt;
      const refsConflict =
        refsChanged && refsDirty && JSON.stringify(refsDraft) !== JSON.stringify(item.refs);
      if (promptChanged || refsChanged) {
        transitions[itemId] = {
          promptChanged,
          refsChanged,
          promptConflict,
          refsConflict,
          removed: false,
          reappeared: false,
        };
      }
    }
    for (const item of items) {
      const existing = conflictsRef.current[item.id];
      if (!existing?.removed || previous2.snapshot[item.id] !== void 0) continue;
      const promptDraft = drafts[item.id];
      const refsDraft = refDrafts[item.id];
      transitions[item.id] = {
        promptChanged: true,
        refsChanged: true,
        promptConflict: existing.prompt && promptDraft !== void 0 && promptDraft !== item.prompt,
        refsConflict:
          existing.refs &&
          refsDraft !== void 0 &&
          JSON.stringify(refsDraft) !== JSON.stringify(item.refs),
        removed: false,
        reappeared: true,
      };
    }
    setConflicts((current2) => {
      const next2 = {
        ...current2,
      };
      for (const [itemId, transition2] of Object.entries(transitions)) {
        if (transition2.removed) {
          next2[itemId] = {
            prompt: transition2.promptConflict,
            refs: transition2.refsConflict,
            removed: true,
          };
          continue;
        }
        const existing = next2[itemId];
        const prompt = transition2.promptChanged
          ? transition2.promptConflict
          : (existing?.prompt ?? false);
        const refs = transition2.refsChanged ? transition2.refsConflict : (existing?.refs ?? false);
        if (prompt || refs)
          next2[itemId] = {
            prompt,
            refs,
            removed: false,
          };
        else delete next2[itemId];
      }
      return next2;
    });
    setRemovedItems((current2) => {
      const next2 = {
        ...current2,
        ...detectedRemovedItems,
      };
      for (const [itemId, transition2] of Object.entries(transitions)) {
        if (transition2.reappeared) delete next2[itemId];
      }
      return next2;
    });
    const firstConflictId = Object.entries(transitions).find(
      ([, transition2]) =>
        transition2.removed || transition2.promptConflict || transition2.refsConflict,
    )?.[0];
    if (firstConflictId) {
      setError(void 0);
      setExpanded(true);
      setSelectedId(firstConflictId);
    }
  }, [contractFingerprint, contractSnapshot, drafts, items, refDrafts, stage.id]);
  const conflictIds = Object.keys(conflicts);
  const displayItems = [
    ...items,
    ...Object.values(removedItems).filter(
      (item) => conflicts[item.id]?.removed && contractSnapshot[item.id] === void 0,
    ),
  ];
  const resolveConflict = (itemId) => {
    const nextConflictId = conflictIds.find((candidate) => candidate !== itemId);
    setConflicts((current2) => {
      const next2 = {
        ...current2,
      };
      delete next2[itemId];
      return next2;
    });
    if (nextConflictId) setSelectedId(nextConflictId);
  };
  const changedIds = items.filter(
    (item) =>
      (drafts[item.id] ?? item.prompt) !== item.prompt ||
      JSON.stringify(refDrafts[item.id] ?? item.refs) !== JSON.stringify(item.refs),
  );
  const title = t2("productionPlan.prompt.generatedTitle", "将生成 {{count}} 项内容", {
    count: items.length,
  });
  const kindLabel = (kind) => {
    if (kind === "image") return t2("productionPlan.prompt.kind.image", "图片");
    if (kind === "video") return t2("productionPlan.prompt.kind.video", "视频");
    if (kind === "audio") return t2("productionPlan.prompt.kind.audio", "音频");
    if (kind === "music") return t2("productionPlan.prompt.kind.music", "音乐");
    if (kind === "text") return t2("productionPlan.prompt.kind.text", "文本");
    if (kind === "document") return t2("productionPlan.prompt.kind.document", "文档");
    return t2("productionPlan.prompt.kind.content", "内容");
  };
  const parameterValue = (parameter) => {
    if (parameter.key !== "duration" || /(?:s|秒|分|min)$/i.test(parameter.value)) {
      return parameter.value;
    }
    return t2("productionPlan.prompt.parameter.seconds", "{{value}} 秒", {
      value: parameter.value,
    });
  };
  const contentItemTitle = (item) => {
    const index2 = Math.max(
      displayItems.findIndex((candidate) => candidate.id === item.id),
      0,
    );
    const number2 = itemSequence(item, index2);
    const contentName = userFacingContentName(item.name);
    return contentName
      ? `${number2} ${contentName}`
      : t2("productionPlan.prompt.content.item", "{{number}} 内容", {
          number: number2,
        });
  };
  const hasMorePreviews = items.length > PROMPT_PREVIEW_LIMIT;
  const previewItems = showAllPreviews ? items : items.slice(0, PROMPT_PREVIEW_LIMIT);
  const previewGroups = previewItems.reduce((groups, item) => {
    const existing = groups.find((group) => group.kind === item.kind);
    if (existing) existing.items.push(item);
    else
      groups.push({
        kind: item.kind,
        items: [item],
      });
    return groups;
  }, []);
  const handleSave = async (closeAfterSave = true) => {
    if (disabled2 || saving) return false;
    if (conflictIds.length > 0) {
      setError(
        t2("productionPlan.prompt.conflictError", "制作计划已更新，请选择使用新版或保留当前草稿"),
      );
      setExpanded(true);
      return false;
    }
    const patches = changedIds.map((item) => {
      const patch2 = {
        item_id: item.id,
      };
      const prompt = drafts[item.id];
      const refs = refDrafts[item.id];
      if (prompt !== void 0 && prompt !== item.prompt) patch2.prompt = prompt.trim();
      if (refs !== void 0 && JSON.stringify(refs) !== JSON.stringify(item.refs)) {
        patch2.refs = refs;
      }
      return patch2;
    });
    if (patches.length === 0) return void 0;
    if (patches.some((patch2) => patch2.prompt !== void 0 && !patch2.prompt)) {
      setError(t2("productionPlan.prompt.emptyError", "提示词不能为空"));
      if (!closeAfterSave) setExpanded(true);
      return false;
    }
    setSaving(true);
    setError(void 0);
    try {
      const result = await saveStageWorkItems(stage.id, patches);
      setDrafts({});
      setRefDrafts({});
      if (closeAfterSave) setExpanded(false);
      return result.revision;
    } catch (saveError) {
      if (saveError instanceof StaleProductionPlanSaveError) {
        setError(t2("productionPlan.prompt.staleSaveError", "制作计划已更新，请重新检查后再继续"));
      } else {
        console.error("[production-plan] failed to save prompt changes", saveError);
        setError(t2("productionPlan.prompt.saveError", "保存失败，请重试"));
      }
      if (!closeAfterSave) setExpanded(true);
      return false;
    } finally {
      setSaving(false);
    }
  };
  reactExports.useImperativeHandle(ref, () => ({
    flush: () => handleSave(false),
  }));
  const isActivePromptReview =
    stage.status === "waiting_user" && stage.waiting_reason === "plan_review";
  if ((!readOnly2 && !isActivePromptReview) || displayItems.length === 0) {
    return null;
  }
  const selected2 = displayItems.find((item) => item.id === selectedId) ?? displayItems[0];
  if (!selected2) return null;
  const selectedPrompt = drafts[selected2.id] ?? selected2.prompt;
  const selectedRefs = refDrafts[selected2.id] ?? selected2.refs;
  const selectedConflict = conflicts[selected2.id];
  const selectedSummary = [
    kindLabel(selected2.kind),
    ...selected2.parameters.map(parameterValue),
  ].join(" · ");
  return (
    <Dialog open={expanded} onOpenChange={setExpanded}>
      {readOnly2 ? (
        <section
          className="overflow-hidden rounded-lg border border-border bg-card"
          aria-label={stage.name}
          data-action-ui-id={`production-plan.prompt-history-${stage.id}`}
        >
          <button
            type="button"
            className="flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
            onClick={() => setExpanded(true)}
            aria-label={t2("productionPlan.prompt.view", "查看提示词")}
            data-action-ui-id={`production-plan.prompt-history-open-${stage.id}`}
          >
            <Icon icon={Check} size="sm" strokeWidth={1.5} className="text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-body-13 font-medium text-foreground">{stage.name}</h3>
              <p className="truncate text-body-12 text-muted-foreground">
                {t2("productionPlan.prompt.confirmedSummary", "{{count}} 条提示词已确认", {
                  count: items.length,
                })}
              </p>
            </div>
            <span className="shrink-0 text-body-12 text-muted-foreground">
              {t2("productionPlan.prompt.view", "查看提示词")}
            </span>
          </button>
        </section>
      ) : (
        <section
          className="overflow-hidden rounded-lg border border-border bg-card"
          aria-label={title}
          data-action-ui-id="production-plan.prompt-card"
        >
          <div className="flex w-full items-center gap-3 px-3 py-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-body-14 font-medium text-foreground">{title}</h3>
              <p className="mt-1 text-body-13 text-muted-foreground">
                {t2(
                  "productionPlan.prompt.generatedDescription",
                  "请检查对应提示词，确认后继续生成。",
                )}
              </p>
            </div>
          </div>
          <div className="border-t border-border/70">
            {previewGroups.map((group) => (
              <div key={group.kind} className="border-b border-border/70 last:border-b-0">
                <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 bg-muted/40 px-3 py-2 text-body-12 font-medium text-muted-foreground">
                  <span>{kindLabel(group.kind)}</span>
                  <span>{t2("productionPlan.prompt.table.prompt", "提示词")}</span>
                </div>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="grid w-full grid-cols-[120px_minmax(0,1fr)] gap-3 border-t border-border/70 px-3 py-2.5 text-left hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
                    onClick={() => {
                      setSelectedId(item.id);
                      setExpanded(true);
                    }}
                    data-action-ui-id={`production-plan.prompt-preview-${item.id}`}
                  >
                    <span className="line-clamp-2 text-body-13 font-medium text-foreground">
                      {contentItemTitle(item)}
                    </span>
                    <span className="line-clamp-2 min-w-0 whitespace-pre-wrap text-body-13 text-foreground/70">
                      {item.prompt}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div
            className={`flex items-center border-t border-border/70 px-3 py-2.5 ${hasMorePreviews ? "justify-between" : "justify-end"}`}
          >
            {hasMorePreviews && (
              <Button$1
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAllPreviews((value) => !value)}
                aria-expanded={showAllPreviews}
                data-action-ui-id="production-plan.prompt-expand-previews"
              >
                {showAllPreviews
                  ? t2("productionPlan.prompt.collapsePreviews", "收起")
                  : t2("productionPlan.prompt.expandPreviews", "展开其余 {{count}} 条", {
                      count: items.length - PROMPT_PREVIEW_LIMIT,
                    })}
              </Button$1>
            )}
            <Button$1
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setExpanded(true)}
              data-action-ui-id="production-plan.prompt-toggle"
            >
              {t2("productionPlan.prompt.viewEditAll", "检查修改提示词")}
            </Button$1>
          </div>
        </section>
      )}
      <DialogContent size="lg" className="max-h-[calc(100vh-3rem)] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4 pr-14">
          <DialogTitle>
            {readOnly2
              ? t2("productionPlan.prompt.viewTitle", "已确认的提示词")
              : t2("productionPlan.prompt.dialogTitle", "查看和修改提示词")}
          </DialogTitle>
          <DialogDescription>
            {readOnly2
              ? t2("productionPlan.prompt.viewDescription", "已确认内容仅供回溯查看")
              : t2(
                  "productionPlan.prompt.dialogDescription",
                  "每条提示词对应一项待生成内容，修改后会同步到制作计划",
                )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex h-[min(480px,calc(100vh-10rem))] min-h-0">
          <aside className="w-48 shrink-0 overflow-y-auto border-r border-border p-2">
            {displayItems.map((item) => {
              const changed =
                (drafts[item.id] ?? item.prompt) !== item.prompt ||
                JSON.stringify(refDrafts[item.id] ?? item.refs) !== JSON.stringify(item.refs);
              const conflicted = conflicts[item.id] !== void 0;
              const itemTitle = contentItemTitle(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`mb-1 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] ${item.id === selected2.id ? "bg-muted font-medium text-foreground" : "text-foreground/70 hover:bg-muted/60"}`}
                  onClick={() => setSelectedId(item.id)}
                  aria-label={
                    conflicted
                      ? t2("productionPlan.prompt.conflictedItem", "{{item}}，有冲突", {
                          item: itemTitle,
                        })
                      : itemTitle
                  }
                  data-action-ui-id={`production-plan.prompt-item-${item.id}`}
                >
                  <span className="min-w-0 flex-1 truncate">{itemTitle}</span>
                  {(changed || conflicted) && (
                    <span
                      className={`size-1.5 rounded-full ${conflicted ? "bg-destructive" : "bg-primary"}`}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </aside>
          <div className="flex min-w-0 flex-1 flex-col p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-body-13 font-medium text-foreground">
                {contentItemTitle(selected2)}
              </p>
              {changedIds.some((item) => item.id === selected2.id) && (
                <Badge variant="secondary">{t2("productionPlan.prompt.modified", "已修改")}</Badge>
              )}
            </div>
            <p className="mt-2 text-body-12 text-muted-foreground">{selectedSummary}</p>
            {conflictIds.length > 0 && (
              <p className="mt-1.5 text-body-12 text-muted-foreground" role="status">
                {t2("productionPlan.prompt.conflictCount", "还有 {{count}} 项冲突需要处理", {
                  count: conflictIds.length,
                })}
              </p>
            )}
            {selected2.sourceLabels.length > 0 && (
              <p className="mt-1.5 text-body-12 text-muted-foreground">
                {t2("productionPlan.prompt.source", "来源")}：{selected2.sourceLabels.join(" · ")}
              </p>
            )}
            {selectedConflict && (
              <div
                className="mt-3 rounded-md bg-muted p-3"
                role="alert"
                data-action-ui-id="production-plan.prompt-conflict"
              >
                <p className="text-body-12 text-foreground/70">
                  {selectedConflict.removed
                    ? t2(
                        "productionPlan.prompt.removedConflict",
                        "此内容已从新版计划中删除，接受删除将放弃本地草稿",
                      )
                    : t2(
                        "productionPlan.prompt.conflictError",
                        "制作计划已更新，请选择使用新版或保留当前草稿",
                      )}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Button$1
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (selectedConflict.prompt || selectedConflict.removed) {
                        setDrafts((current2) => {
                          const next2 = {
                            ...current2,
                          };
                          delete next2[selected2.id];
                          return next2;
                        });
                      }
                      if (selectedConflict.refs || selectedConflict.removed) {
                        setRefDrafts((current2) => {
                          const next2 = {
                            ...current2,
                          };
                          delete next2[selected2.id];
                          return next2;
                        });
                      }
                      resolveConflict(selected2.id);
                      if (selectedConflict.removed) {
                        setRemovedItems((current2) => {
                          const next2 = {
                            ...current2,
                          };
                          delete next2[selected2.id];
                          return next2;
                        });
                      }
                      setError(void 0);
                    }}
                    data-action-ui-id="production-plan.prompt-use-latest"
                  >
                    {selectedConflict.removed
                      ? t2("productionPlan.prompt.acceptRemoval", "接受删除")
                      : t2("productionPlan.prompt.useLatest", "使用新版")}
                  </Button$1>
                  {!selectedConflict.removed && (
                    <Button$1
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        resolveConflict(selected2.id);
                        setError(void 0);
                      }}
                      data-action-ui-id="production-plan.prompt.keepDraft"
                    >
                      {t2("productionPlan.prompt.keepDraft", "保留草稿")}
                    </Button$1>
                  )}
                </div>
              </div>
            )}
            <Textarea
              value={selectedPrompt}
              onChange={(event) => {
                setDrafts((current2) => ({
                  ...current2,
                  [selected2.id]: event.target.value,
                }));
                setError(void 0);
              }}
              className="mt-3 min-h-0 flex-1 resize-none text-[13px] leading-[20px]"
              disabled={readOnly2 || disabled2 || saving}
              aria-label={t2("productionPlan.prompt.editorLabel", "提示词")}
              data-action-ui-id="production-plan.prompt-editor"
            />
            <label
              htmlFor="production-plan-prompt-refs-editor"
              className="mt-3 text-body-12 text-muted-foreground"
            >
              {t2("productionPlan.prompt.references", "参考素材")}
              <Textarea
                id="production-plan-prompt-refs-editor"
                value={displayedReferenceValues(stage, selectedRefs).join("\n")}
                onChange={(event) => {
                  setRefDrafts((current2) => ({
                    ...current2,
                    [selected2.id]: parseDisplayedReferences(
                      stage,
                      selectedRefs,
                      event.target.value,
                    ),
                  }));
                  setError(void 0);
                }}
                className="mt-1 min-h-16 resize-none text-[13px] leading-[20px]"
                disabled={readOnly2 || disabled2 || saving}
                aria-label={t2("productionPlan.prompt.references", "参考素材")}
                data-action-ui-id="production-plan.prompt-refs-editor"
              />
            </label>
            {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
          </div>
        </div>
        {!readOnly2 && (
          <DialogFooter className="border-t border-border px-4 py-3">
            <Button$1
              type="button"
              variant="ghost"
              size="sm"
              disabled={!changedIds.some((item) => item.id === selected2.id) || saving}
              onClick={() => {
                setDrafts((current2) => {
                  const next2 = {
                    ...current2,
                  };
                  delete next2[selected2.id];
                  return next2;
                });
                setRefDrafts((current2) => {
                  const next2 = {
                    ...current2,
                  };
                  delete next2[selected2.id];
                  return next2;
                });
                if (conflicts[selected2.id]) resolveConflict(selected2.id);
                setError(void 0);
              }}
              data-action-ui-id="production-plan.prompt-restore"
            >
              <Icon icon={RotateCcw} size="sm" strokeWidth={1} />
              {t2("productionPlan.prompt.restore", "恢复原文")}
            </Button$1>
            <Button$1
              type="button"
              size="sm"
              disabled={disabled2 || saving || conflictIds.length > 0 || changedIds.length === 0}
              onClick={() => void handleSave(true)}
              data-action-ui-id="production-plan.prompt-save"
            >
              <Icon
                icon={saving ? Loader2 : Check}
                size="sm"
                strokeWidth={1.5}
                className={saving ? "animate-spin" : void 0}
              />
              {t2("productionPlan.prompt.save", "保存修改")}
            </Button$1>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
});
