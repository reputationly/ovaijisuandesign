// use-mention.js
import {
  reactExports,
  dedupedToast,
  API_PATHS,
  useGatewayFetch,
  formatConnectorMention,
} from "../vendor.js";
import { useImportExternalFiles } from "../m11/use-canvas-image-annotation-host.jsx";
import { useAnchorProjectAssets } from "../m11/team-assets-sidebar-panel.jsx";
import { RESOURCE_DRAG_MIME, parseResourceDrag } from "../m01/myers-line-hunks.js";
import { mapLocalComfyUiWorkflows } from "./use-txt2-text.jsx";
function hasDroppedDirectories(dataTransfer) {
  const items = dataTransfer?.items;
  if (!items) return false;
  return Array.from(items).some((item) => {
    if (item.kind !== "file") return false;
    const entry = item.webkitGetAsEntry?.();
    return entry?.isDirectory === true;
  });
}
function hasNativeFileDrag(dataTransfer) {
  if (!dataTransfer) return false;
  return Array.from(dataTransfer.types ?? []).includes("Files");
}
export function hasFileDropPayload(dataTransfer) {
  if (!dataTransfer) return false;
  const types2 = Array.from(dataTransfer.types ?? []);
  return types2.includes("Files") || types2.includes(RESOURCE_DRAG_MIME);
}
export function useDropHandler({
  guard,
  getTransactionGeneration,
  addFromLocal,
  addFromAssetPath,
  folderWarningText,
}) {
  const [isDragging, setIsDragging] = reactExports.useState(false);
  const dragCounterRef = reactExports.useRef(0);
  const anchorProjectAssets = useAnchorProjectAssets();
  const importExternalToWorkspace = useImportExternalFiles();
  const warnUnsupportedFolder = reactExports.useCallback(() => {
    dedupedToast.warning(folderWarningText);
  }, [folderWarningText]);
  const handleDragOver = reactExports.useCallback((e2) => {
    if (!hasFileDropPayload(e2.dataTransfer)) return;
    e2.preventDefault();
    e2.dataTransfer.dropEffect = "copy";
  }, []);
  const handleDragEnter = reactExports.useCallback((e2) => {
    if (!hasFileDropPayload(e2.dataTransfer)) return;
    e2.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) setIsDragging(true);
  }, []);
  const handleDragLeave = reactExports.useCallback((e2) => {
    if (dragCounterRef.current === 0) return;
    e2.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);
  const handleDrop2 = reactExports.useCallback(
    (e2) => {
      e2.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const resources = parseResourceDrag(e2);
      if (resources) {
        if (guard && !guard()) return;
        const transactionGeneration = getTransactionGeneration?.();
        let added = 0;
        const externalPaths = [];
        const projectAssets = [];
        for (const item of resources) {
          if (item.isDirectory) continue;
          if (item.external) {
            if (item.absolutePath) {
              if (item.projectAsset) {
                projectAssets.push({
                  absolutePath: item.absolutePath,
                  name: item.name,
                  identity: item.projectAsset,
                });
              } else {
                externalPaths.push(item.absolutePath);
              }
              added++;
            }
            continue;
          }
          addFromAssetPath(item.path, item.name, void 0, item.assetId);
          added++;
        }
        if (externalPaths.length > 0) {
          void importExternalToWorkspace(externalPaths)
            .then((rows) => {
              if (
                transactionGeneration !== void 0 &&
                getTransactionGeneration?.() !== transactionGeneration
              ) {
                return;
              }
              if (guard && !guard()) return;
              for (const row of rows) {
                addFromAssetPath(row.path, row.path.split("/").pop() ?? row.path, void 0, row.id);
              }
            })
            .catch((err) => {
              console.error("[chat] External resource drop import failed:", err);
            });
        }
        for (const item of projectAssets) {
          void anchorProjectAssets([
            {
              path: item.absolutePath,
              assetId: item.identity.assetId,
              projectFolderName: item.identity.projectFolderName,
            },
          ])
            .then(([anchored]) => {
              if (!anchored) throw new Error("anchor returned no rows");
              if (
                transactionGeneration !== void 0 &&
                getTransactionGeneration?.() !== transactionGeneration
              ) {
                return;
              }
              if (guard && !guard()) return;
              addFromAssetPath(anchored.path, item.name);
            })
            .catch((err) => {
              console.error("[chat] Project asset drop anchor failed:", err);
            });
        }
        if (added === 0) warnUnsupportedFolder();
        return;
      }
      const hasDirectories = hasDroppedDirectories(e2.dataTransfer);
      if (e2.dataTransfer.files.length > 0) {
        if (guard && !guard()) return;
        addFromLocal(e2.dataTransfer.files);
        if (hasDirectories) warnUnsupportedFolder();
      } else if (hasDirectories || hasNativeFileDrag(e2.dataTransfer)) {
        warnUnsupportedFolder();
      }
    },
    [
      guard,
      getTransactionGeneration,
      addFromLocal,
      addFromAssetPath,
      anchorProjectAssets,
      importExternalToWorkspace,
      warnUnsupportedFolder,
    ],
  );
  return {
    isDragging,
    dragHandlers: {
      onDragOver: handleDragOver,
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop2,
    },
  };
}
function currentCanvasWorkflowNodeKey(workflow) {
  return `${workflow.id}\0${workflow.title}\0${workflow.copyOrdinal ?? ""}\0${workflow.canvasNodeId ?? ""}`;
}
function isWorkflowIdentity(value) {
  return /^(?:user|template):/i.test(value);
}
function mapCurrentCanvasComfyUiWorkflowBindings(value) {
  const nodes = asRecord$1(value)?.nodes;
  if (!Array.isArray(nodes)) return [];
  const bindings = nodes.flatMap((candidate) => {
    const record2 = asRecord$1(candidate);
    if (!record2 || record2.pluginId !== "comfyui") return [];
    const nodeId = requiredString(record2, "id");
    const id2 = requiredString(record2, "currentWorkflowId");
    const title = requiredString(record2, "currentWorkflowName");
    if (!nodeId || !id2 || !title || isWorkflowIdentity(title)) return [];
    const copyOrdinal = positiveInteger(record2, "comfyuiTemplateCopyOrdinal");
    return [
      {
        nodeId,
        workflow: {
          id: id2,
          name: title,
          title,
          source: id2.startsWith("template:") ? "template" : "user",
          canvasNodeId: nodeId,
          ...(copyOrdinal
            ? {
                copyOrdinal,
              }
            : {}),
        },
      },
    ];
  });
  return assignFallbackCopyOrdinals(bindings);
}
function assignFallbackCopyOrdinals(bindings) {
  const usedOrdinalsByWorkflow = new Map();
  for (const { workflow } of bindings) {
    if (!workflow.copyOrdinal) continue;
    const workflowKey = `${workflow.id}\0${workflow.title}`;
    const usedOrdinals = usedOrdinalsByWorkflow.get(workflowKey) ?? new Set();
    usedOrdinals.add(workflow.copyOrdinal);
    usedOrdinalsByWorkflow.set(workflowKey, usedOrdinals);
  }
  const nextOrdinalByWorkflow = new Map();
  return bindings.map((binding) => {
    if (binding.workflow.copyOrdinal) return binding;
    const workflowKey = `${binding.workflow.id}\0${binding.workflow.title}`;
    const usedOrdinals = usedOrdinalsByWorkflow.get(workflowKey) ?? new Set();
    let nextOrdinal = nextOrdinalByWorkflow.get(workflowKey) ?? 1;
    while (usedOrdinals.has(nextOrdinal)) nextOrdinal += 1;
    usedOrdinals.add(nextOrdinal);
    usedOrdinalsByWorkflow.set(workflowKey, usedOrdinals);
    nextOrdinalByWorkflow.set(workflowKey, nextOrdinal + 1);
    return {
      ...binding,
      workflow: {
        ...binding.workflow,
        copyOrdinal: nextOrdinal,
      },
    };
  });
}
function asRecord$1(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function requiredString(record2, key2) {
  const value = record2[key2];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function positiveInteger(record2, key2) {
  const value = record2[key2];
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : void 0;
}
function mapComfyUiWorkflowGraph(value) {
  const graph = asRecord$1(asRecord$1(value)?.graph);
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.links)) {
    throw new Error("Invalid ComfyUI workflow graph");
  }
  return graph;
}
export function useLocalComfyUiWorkflows() {
  const gatewayFetch2 = useGatewayFetch();
  const [workflows, setWorkflows] = reactExports.useState([]);
  const [currentCanvasWorkflows, setCurrentCanvasWorkflows] = reactExports.useState([]);
  const [currentCanvasWorkflowNodeIds, setCurrentCanvasWorkflowNodeIds] = reactExports.useState(
    () => new Map(),
  );
  const [loading, setLoading] = reactExports.useState(true);
  const refreshAbortRef = reactExports.useRef(null);
  const refresh = reactExports.useCallback(async () => {
    refreshAbortRef.current?.abort();
    const controller = new AbortController();
    refreshAbortRef.current = controller;
    setLoading(true);
    const loadJson = async (path2) => {
      const response = await gatewayFetch2(path2, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    };
    await Promise.allSettled([
      loadJson(API_PATHS.comfyUiWorkflows),
      loadJson(`${API_PATHS.canvas}/nodes?type=file&limit=100`),
    ]).then(([workflowResult, canvasResult]) => {
      if (controller.signal.aborted) return;
      const localWorkflows =
        workflowResult.status === "fulfilled" ? mapLocalComfyUiWorkflows(workflowResult.value) : [];
      const currentCanvasWorkflowBindings =
        canvasResult.status === "fulfilled"
          ? mapCurrentCanvasComfyUiWorkflowBindings(canvasResult.value)
          : [];
      const currentCanvasWorkflows2 = currentCanvasWorkflowBindings.map(({ workflow }) => workflow);
      setWorkflows(localWorkflows);
      setCurrentCanvasWorkflows(currentCanvasWorkflows2);
      setCurrentCanvasWorkflowNodeIds(
        new Map(
          currentCanvasWorkflowBindings.map(({ workflow, nodeId }) => [
            currentCanvasWorkflowNodeKey(workflow),
            nodeId,
          ]),
        ),
      );
    });
    if (!controller.signal.aborted) setLoading(false);
  }, [gatewayFetch2]);
  reactExports.useEffect(() => {
    void refresh();
    return () => refreshAbortRef.current?.abort();
  }, [refresh]);
  const loadGraph = reactExports.useCallback(
    async (workflowId) => {
      const response = await gatewayFetch2(API_PATHS.comfyUiWorkflow(workflowId, true));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return mapComfyUiWorkflowGraph(await response.json());
    },
    [gatewayFetch2],
  );
  return {
    workflows,
    currentCanvasWorkflows,
    currentCanvasWorkflowNodeIds,
    loading,
    refresh,
    loadGraph,
  };
}
function findTrailingTrigger(textBeforeCaret, trigger, invalidChars) {
  const escaped = trigger === "/" ? "\\/" : trigger;
  const re2 = new RegExp(`${escaped}([^${invalidChars}]*)$`);
  const match2 = textBeforeCaret.match(re2);
  if (!match2) return null;
  const start2 = match2.index ?? 0;
  return {
    start: start2,
    query: match2[1] ?? "",
  };
}
export function findMentionTrigger(textBeforeCaret) {
  return findTrailingTrigger(textBeforeCaret, "@", "\\s@");
}
export function findSlashTrigger(textBeforeCaret) {
  return findTrailingTrigger(textBeforeCaret, "/", "\\s/");
}
const DEBOUNCE_MS = 150;
const CACHE_TTL_MS = 3e4;
const MENTION_CACHE_MAX_ENTRIES = 64;
const SEARCH_LIMIT = 50;
const EMPTY_WORKFLOW_NODE_IDS = new Map();
function formatFileMentionInsert(item) {
  return `@${item.path} `;
}
function formatModelMentionInsert(model) {
  return `@model:${model.mentionName ?? model.modelName} `;
}
function formatMentionInsert(item) {
  if (item.category === "model") return formatModelMentionInsert(item.model);
  if (item.category === "workflow") return `@workflow:${item.workflow.id} `;
  if (item.category === "connector")
    return `${formatConnectorMention(item.connector.connectorId ?? item.connector.serverName, item.connector.displayName)} `;
  return formatFileMentionInsert(item.file);
}
async function defaultFetcher(gatewayFetch2, path2, signal) {
  const resp = await gatewayFetch2(path2, {
    signal,
  });
  const data2 = await resp.json();
  return {
    items: Array.isArray(data2?.items) ? data2.items : [],
    truncated: Boolean(data2?.truncated),
  };
}
function modelScore(target, query) {
  if (!query) return 1;
  const t2 = target.toLowerCase();
  const q2 = query.toLowerCase();
  let ti = 0;
  let qi = 0;
  let score = 0;
  while (ti < t2.length && qi < q2.length) {
    if (t2[ti] === q2[qi]) {
      score += 10;
      qi++;
    }
    ti++;
  }
  return qi === q2.length ? score : 0;
}
function matchModels(models, query) {
  const scored = [];
  for (const m3 of models) {
    if (m3.visibility === "hidden") continue;
    const mentionName = m3.mention_name ?? m3.model_name;
    const nameScore = modelScore(m3.display_name, query);
    const mentionNameScore = modelScore(mentionName, query);
    const modelNameScore = modelScore(m3.model_name, query);
    const idScore = modelScore(m3.id, query);
    const best = Math.max(nameScore, mentionNameScore, modelNameScore, idScore);
    if (best > 0) {
      scored.push({
        item: {
          category: "model",
          model: {
            id: m3.id,
            displayName: m3.display_name,
            modelName: m3.model_name,
            mentionName,
            mediaType: m3.type,
            iconUrl: m3.icon_url,
            description: m3.description,
            seriesId: m3.series_id,
          },
        },
        score: best,
      });
    }
  }
  scored.sort((a2, b3) => b3.score - a2.score);
  return scored.map((s2) => s2.item);
}
function matchWorkflows(workflows, currentCanvasWorkflows, query, currentCanvasWorkflowNodeIds) {
  const normalized = query.trim().toLocaleLowerCase();
  const matchesQuery = (workflow) =>
    !normalized ||
    [workflow.title, workflow.name, workflow.short_desc, ...(workflow.tags ?? [])]
      .filter((value) => typeof value === "string")
      .some((value) => value.toLocaleLowerCase().includes(normalized));
  return [
    ...currentCanvasWorkflows.filter(matchesQuery).map((workflow) => ({
      category: "workflow",
      workflow,
      context: "current-canvas",
      ...(currentCanvasWorkflowNodeIds.get(currentCanvasWorkflowNodeKey(workflow))
        ? {
            canvasNodeId: currentCanvasWorkflowNodeIds.get(currentCanvasWorkflowNodeKey(workflow)),
          }
        : {}),
    })),
    ...workflows
      .filter((workflow) => workflow.source === "user")
      .filter(matchesQuery)
      .map((workflow) => ({
        category: "workflow",
        workflow,
      })),
  ];
}
function setCacheEntry(cache2, key2, entry, maxEntries) {
  const cap2 = Math.max(1, Math.floor(maxEntries));
  cache2.delete(key2);
  cache2.set(key2, entry);
  while (cache2.size > cap2) {
    const oldest = cache2.keys().next().value;
    if (oldest === void 0) return;
    cache2.delete(oldest);
  }
}
function touchCacheEntry(cache2, key2) {
  const entry = cache2.get(key2);
  if (!entry) return void 0;
  cache2.delete(key2);
  cache2.set(key2, entry);
  return entry;
}
export function useMention(input, setInput, workspace, _anchorRef, options = {}) {
  const gatewayFetch2 = useGatewayFetch();
  const {
    getCaret,
    debounceMs = DEBOUNCE_MS,
    cacheMaxEntries = MENTION_CACHE_MAX_ENTRIES,
    onSelectMedia,
    models,
    workflows = [],
    connectors = [],
    connectorsLoading = false,
    currentCanvasWorkflows = [],
    currentCanvasWorkflowNodeIds = EMPTY_WORKFLOW_NODE_IDS,
    onSelectModel,
    onSelectWorkflow,
    referenceFiles = [],
    onAfterSelect,
    onInsertItem,
    includeProjectAssets = true,
  } = options;
  const fetcher = reactExports.useMemo(
    () => options.fetcher ?? ((path2, signal) => defaultFetcher(gatewayFetch2, path2, signal)),
    [gatewayFetch2, options.fetcher],
  );
  const projectAssetFetcher = reactExports.useMemo(
    () => options.projectAssetFetcher ?? fetcher,
    [fetcher, options.projectAssetFetcher],
  );
  const [open, setOpen] = reactExports.useState(false);
  const [openedByButton, setOpenedByButton] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(false);
  const [fileItems, setFileItems] = reactExports.useState([]);
  const [projectAssetItems, setProjectAssetItems] = reactExports.useState([]);
  const [truncated, setTruncated] = reactExports.useState(false);
  const [activeIndex, setActiveIndex] = reactExports.useState(0);
  const [query, setQuery] = reactExports.useState("");
  const [fileKindFilter, setFileKindFilter] = reactExports.useState("all");
  const triggerStartRef = reactExports.useRef(null);
  const browseInputRef = reactExports.useRef(null);
  const inputRef = reactExports.useRef(input);
  inputRef.current = input;
  const cacheRef = reactExports.useRef(new Map());
  const cacheWorkspaceRef = reactExports.useRef(workspace);
  const debounceRef = reactExports.useRef(null);
  const abortRef = reactExports.useRef(null);
  const fetchSeqRef = reactExports.useRef(0);
  reactExports.useEffect(() => {
    if (cacheWorkspaceRef.current !== workspace) {
      cacheRef.current.clear();
      cacheWorkspaceRef.current = workspace;
    }
  }, [workspace]);
  const cancelInFlight = reactExports.useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);
  const close2 = reactExports.useCallback(() => {
    cancelInFlight();
    browseInputRef.current = null;
    setOpen(false);
    setOpenedByButton(false);
    setLoading(false);
    setFileItems([]);
    setProjectAssetItems([]);
    setTruncated(false);
    setActiveIndex(0);
    setQuery("");
    setFileKindFilter("all");
    triggerStartRef.current = null;
  }, [cancelInFlight]);
  reactExports.useEffect(() => {
    return () => {
      cancelInFlight();
    };
  }, [cancelInFlight]);
  const scheduleFetch = reactExports.useCallback(
    (q2) => {
      cancelInFlight();
      const ws2 = workspace;
      if (!ws2) {
        setFileItems([]);
        setProjectAssetItems([]);
        setTruncated(false);
        setLoading(false);
        return;
      }
      const cacheKey = `${ws2}::${q2}`;
      const cached = touchCacheEntry(cacheRef.current, cacheKey);
      const cachedFiles = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS ? cached : null;
      setLoading(true);
      const controller = new AbortController();
      abortRef.current = controller;
      const seq2 = ++fetchSeqRef.current;
      const run2 = () => {
        const params = new URLSearchParams({
          workspace: ws2,
          q: q2,
          limit: String(SEARCH_LIMIT),
        });
        const projectAssetParams = new URLSearchParams({
          q: q2,
          limit: String(SEARCH_LIMIT),
        });
        const fileUrl = `${API_PATHS.filesMentionSearch}?${params.toString()}`;
        const projectAssetUrl = `${API_PATHS.projectAssetMentionSearch}?${projectAssetParams.toString()}`;
        const fileRequest = cachedFiles
          ? Promise.resolve({
              items: cachedFiles.items,
              truncated: cachedFiles.truncated,
            })
          : fetcher(fileUrl, controller.signal);
        Promise.allSettled([
          fileRequest,
          includeProjectAssets
            ? projectAssetFetcher(projectAssetUrl, controller.signal)
            : Promise.resolve({
                items: [],
                truncated: false,
              }),
        ]).then(([fileResult, projectAssetResult]) => {
          if (controller.signal.aborted) return;
          if (seq2 !== fetchSeqRef.current) return;
          const fileResponse =
            fileResult.status === "fulfilled"
              ? fileResult.value
              : {
                  items: [],
                  truncated: false,
                };
          const projectAssetResponse =
            projectAssetResult.status === "fulfilled"
              ? projectAssetResult.value
              : {
                  items: [],
                  truncated: false,
                };
          if (!cachedFiles && fileResult.status === "fulfilled") {
            setCacheEntry(
              cacheRef.current,
              cacheKey,
              {
                items: fileResponse.items,
                truncated: fileResponse.truncated,
                fetchedAt: Date.now(),
              },
              cacheMaxEntries,
            );
          }
          setFileItems(fileResponse.items);
          setProjectAssetItems(projectAssetResponse.items);
          setTruncated(fileResponse.truncated || projectAssetResponse.truncated);
          setLoading(false);
          setActiveIndex(0);
        });
      };
      if (debounceMs <= 0) {
        run2();
      } else {
        debounceRef.current = setTimeout(run2, debounceMs);
      }
    },
    [
      workspace,
      fetcher,
      projectAssetFetcher,
      cancelInFlight,
      debounceMs,
      cacheMaxEntries,
      includeProjectAssets,
    ],
  );
  const onChange = reactExports.useCallback(
    (text2, caret) => {
      const before = text2.slice(0, caret);
      const match2 = findMentionTrigger(before);
      if (!match2) {
        if (open && (!openedByButton || text2 !== browseInputRef.current)) close2();
        return;
      }
      triggerStartRef.current = match2.start;
      setOpenedByButton(false);
      setQuery(match2.query);
      setOpen(true);
      scheduleFetch(match2.query);
    },
    [open, openedByButton, close2, scheduleFetch],
  );
  const openPopover = reactExports.useCallback(() => {
    const caret = getCaret ? getCaret() : inputRef.current.length;
    triggerStartRef.current = caret;
    browseInputRef.current = inputRef.current;
    setOpenedByButton(true);
    setQuery("");
    setFileKindFilter("all");
    setOpen(true);
    scheduleFetch("");
  }, [getCaret, scheduleFetch]);
  const items = reactExports.useMemo(() => {
    const isBrowsing = query.length === 0;
    const modelItems = models ? matchModels(models, query) : [];
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const connectorItems = connectors
      .filter(
        (connector) =>
          !normalizedQuery ||
          connector.displayName.toLocaleLowerCase().includes(normalizedQuery) ||
          connector.serverName.toLocaleLowerCase().includes(normalizedQuery),
      )
      .map((connector) => ({
        category: "connector",
        connector,
      }));
    const referencePathSet = new Set(referenceFiles.map((f2) => f2.path));
    const referenceItems = isBrowsing
      ? referenceFiles.map((f2) => ({
          category: "reference",
          file: f2,
        }))
      : [];
    const fileItemsMapped = fileItems
      .filter((f2) => {
        if (!isBrowsing) return true;
        if (referencePathSet.has(f2.path)) return false;
        return fileKindFilter === "all" || f2.kind === fileKindFilter;
      })
      .map((f2) => ({
        category: "file",
        file: f2,
      }));
    const projectItemsMapped = projectAssetItems.map((file) => ({
      category: "project-asset",
      file,
    }));
    const workflowItems = matchWorkflows(
      workflows,
      currentCanvasWorkflows,
      query,
      currentCanvasWorkflowNodeIds,
    );
    return [
      ...referenceItems,
      ...fileItemsMapped,
      ...projectItemsMapped,
      ...connectorItems,
      ...workflowItems,
      ...modelItems,
    ];
  }, [
    models,
    connectors,
    workflows,
    currentCanvasWorkflows,
    currentCanvasWorkflowNodeIds,
    query,
    fileItems,
    projectAssetItems,
    referenceFiles,
    fileKindFilter,
  ]);
  reactExports.useEffect(() => {
    if (activeIndex >= items.length) {
      setActiveIndex(Math.max(0, items.length - 1));
    }
  }, [activeIndex, items.length]);
  reactExports.useEffect(() => {
    if (open && query.length > 0 && !loading && !connectorsLoading && items.length === 0) {
      close2();
    }
  }, [open, query, loading, connectorsLoading, items.length, close2]);
  const onSelect = reactExports.useCallback(
    (item) => {
      const triggerStart = triggerStartRef.current;
      if (triggerStart === null) {
        close2();
        return;
      }
      let inserted = true;
      if (onInsertItem) {
        inserted = onInsertItem(item);
      } else {
        const caret = getCaret ? getCaret() : inputRef.current.length;
        const text2 = inputRef.current;
        const insertion = formatMentionInsert(item);
        const next2 = text2.slice(0, triggerStart) + insertion + text2.slice(caret);
        setInput(next2);
      }
      if (!inserted) {
        close2();
        return;
      }
      if (item.category === "file" || item.category === "project-asset") {
        onSelectMedia?.(item.file);
      } else if (item.category === "model") {
        onSelectModel?.(item.model);
      } else if (item.category === "workflow") {
        onSelectWorkflow?.(item);
      }
      if (onAfterSelect) {
        requestAnimationFrame(() => onAfterSelect());
      }
      close2();
    },
    [
      setInput,
      getCaret,
      close2,
      onSelectMedia,
      onSelectModel,
      onSelectWorkflow,
      onAfterSelect,
      onInsertItem,
    ],
  );
  const onKeyDown = reactExports.useCallback(
    (e2) => {
      if (!open) return false;
      switch (e2.key) {
        case "ArrowDown": {
          if (items.length === 0) return false;
          e2.preventDefault();
          setActiveIndex((prev) => (prev >= items.length - 1 ? 0 : prev + 1));
          return true;
        }
        case "ArrowUp": {
          if (items.length === 0) return false;
          e2.preventDefault();
          setActiveIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
          return true;
        }
        case "Enter":
        case "Tab": {
          if (items.length === 0) return false;
          const selected2 = items[activeIndex];
          if (!selected2) return false;
          e2.preventDefault();
          onSelect(selected2);
          return true;
        }
        case "Escape": {
          e2.preventDefault();
          close2();
          return true;
        }
        default:
          return false;
      }
    },
    [open, items, activeIndex, onSelect, close2],
  );
  const state2 = reactExports.useMemo(
    () => ({
      open,
      openedByButton,
      loading: loading || connectorsLoading,
      items,
      truncated,
      activeIndex,
      query,
      fileKindFilter,
    }),
    [
      open,
      openedByButton,
      loading,
      connectorsLoading,
      items,
      truncated,
      activeIndex,
      query,
      fileKindFilter,
    ],
  );
  return {
    state: state2,
    setActiveIndex,
    setFileKindFilter,
    onChange,
    onKeyDown,
    onSelect,
    openPopover,
    close: close2,
  };
}
