// use-mention.js
import {
  currentCanvasWorkflowNodeKey,
  findMentionTrigger,
} from "./find-trailing-trigger.js";
import { formatConnectorMention } from "../canvas/diagnostic-history-tools.js";
import { API_PATHS } from "../infra/workspace-gateway.js";
import reactExports from "react";
import { useGatewayFetch } from "../generation/use-model-catalog-scope-key.js";

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

async function defaultFetcher(gatewayFetch, path, signal) {
  const resp = await gatewayFetch(path, {
    signal,
  });
  const data = await resp.json();
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    truncated: Boolean(data?.truncated),
  };
}

function modelScore(target, query) {
  if (!query) return 1;
  const normalizedTarget = target.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  let targetIndex = 0;
  let queryIndex = 0;
  let score = 0;
  while (targetIndex < normalizedTarget.length && queryIndex < normalizedQuery.length) {
    if (normalizedTarget[targetIndex] === normalizedQuery[queryIndex]) {
      score += 10;
      queryIndex++;
    }
    targetIndex++;
  }
  return queryIndex === normalizedQuery.length ? score : 0;
}

function matchModels(models, query) {
  const scored = [];
  for (const mediaModel of models) {
    if (mediaModel.visibility === "hidden") continue;
    const mentionName = mediaModel.mention_name ?? mediaModel.model_name;
    const nameScore = modelScore(mediaModel.display_name, query);
    const mentionNameScore = modelScore(mentionName, query);
    const modelNameScore = modelScore(mediaModel.model_name, query);
    const idScore = modelScore(mediaModel.id, query);
    const best = Math.max(nameScore, mentionNameScore, modelNameScore, idScore);
    if (best > 0) {
      scored.push({
        item: {
          category: "model",
          model: {
            id: mediaModel.id,
            displayName: mediaModel.display_name,
            modelName: mediaModel.model_name,
            mentionName,
            mediaType: mediaModel.type,
            iconUrl: mediaModel.icon_url,
            description: mediaModel.description,
            seriesId: mediaModel.series_id,
          },
        },
        score: best,
      });
    }
  }
  scored.sort((leftCandidate, rightCandidate) => rightCandidate.score - leftCandidate.score);
  return scored.map((scoredResult) => scoredResult.item);
}

function matchWorkflows(
  workflows,
  currentCanvasWorkflows,
  query,
  currentCanvasWorkflowNodeIds,
) {
  const normalized = query.trim().toLocaleLowerCase();
  const matchesQuery = (workflow) =>
    !normalized ||
    [
      workflow.title,
      workflow.name,
      workflow.short_desc,
      ...(workflow.tags ?? []),
    ]
      .filter((value) => typeof value === "string")
      .some((value) => value.toLocaleLowerCase().includes(normalized));
  return [
    ...currentCanvasWorkflows.filter(matchesQuery).map((workflow) => ({
      category: "workflow",
      workflow,
      context: "current-canvas",
      ...(currentCanvasWorkflowNodeIds.get(
        currentCanvasWorkflowNodeKey(workflow),
      )
        ? {
            canvasNodeId: currentCanvasWorkflowNodeIds.get(
              currentCanvasWorkflowNodeKey(workflow),
            ),
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

function setCacheEntry(cache, key, entry, maxEntries) {
  const cap = Math.max(1, Math.floor(maxEntries));
  cache.delete(key);
  cache.set(key, entry);
  while (cache.size > cap) {
    const oldest = cache.keys().next().value;
    if (oldest === void 0) return;
    cache.delete(oldest);
  }
}

function touchCacheEntry(cache, key) {
  const entry = cache.get(key);
  if (!entry) return void 0;
  cache.delete(key);
  cache.set(key, entry);
  return entry;
}

export function useMention(
  input,
  setInput,
  workspace,
  _anchorRef,
  options = {},
) {
  const gatewayFetch = useGatewayFetch();
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
    () =>
      options.fetcher ??
      ((path, signal) => defaultFetcher(gatewayFetch, path, signal)),
    [gatewayFetch, options.fetcher],
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
  const closeMentionPopover = reactExports.useCallback(() => {
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
    (query) => {
      cancelInFlight();
      const workspacePath = workspace;
      if (!workspacePath) {
        setFileItems([]);
        setProjectAssetItems([]);
        setTruncated(false);
        setLoading(false);
        return;
      }
      const cacheKey = `${workspacePath}::${query}`;
      const cached = touchCacheEntry(cacheRef.current, cacheKey);
      const cachedFiles =
        cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS ? cached : null;
      setLoading(true);
      const controller = new AbortController();
      abortRef.current = controller;
      const seq = ++fetchSeqRef.current;
      const run = () => {
        const params = new URLSearchParams({
          workspace: workspacePath,
          q: query,
          limit: String(SEARCH_LIMIT),
        });
        const projectAssetParams = new URLSearchParams({
          q: query,
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
          if (seq !== fetchSeqRef.current) return;
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
          setTruncated(
            fileResponse.truncated || projectAssetResponse.truncated,
          );
          setLoading(false);
          setActiveIndex(0);
        });
      };
      if (debounceMs <= 0) {
        run();
      } else {
        debounceRef.current = setTimeout(run, debounceMs);
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
    (text, caret) => {
      const before = text.slice(0, caret);
      const match = findMentionTrigger(before);
      if (!match) {
        if (open && (!openedByButton || text !== browseInputRef.current))
          closeMentionPopover();
        return;
      }
      triggerStartRef.current = match.start;
      setOpenedByButton(false);
      setQuery(match.query);
      setOpen(true);
      scheduleFetch(match.query);
    },
    [open, openedByButton, closeMentionPopover, scheduleFetch],
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
    const referencePathSet = new Set(referenceFiles.map((referenceFile) => referenceFile.path));
    const referenceItems = isBrowsing
      ? referenceFiles.map((referenceFile) => ({
          category: "reference",
          file: referenceFile,
        }))
      : [];
    const fileItemsMapped = fileItems
      .filter((referenceFile) => {
        if (!isBrowsing) return true;
        if (referencePathSet.has(referenceFile.path)) return false;
        return fileKindFilter === "all" || referenceFile.kind === fileKindFilter;
      })
      .map((referenceFile) => ({
        category: "file",
        file: referenceFile,
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
    if (
      open &&
      query.length > 0 &&
      !loading &&
      !connectorsLoading &&
      items.length === 0
    ) {
      closeMentionPopover();
    }
  }, [open, query, loading, connectorsLoading, items.length, closeMentionPopover]);
  const onSelect = reactExports.useCallback(
    (item) => {
      const triggerStart = triggerStartRef.current;
      if (triggerStart === null) {
        closeMentionPopover();
        return;
      }
      let inserted = true;
      if (onInsertItem) {
        inserted = onInsertItem(item);
      } else {
        const caret = getCaret ? getCaret() : inputRef.current.length;
        const text = inputRef.current;
        const insertion = formatMentionInsert(item);
        const next =
          text.slice(0, triggerStart) + insertion + text.slice(caret);
        setInput(next);
      }
      if (!inserted) {
        closeMentionPopover();
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
      closeMentionPopover();
    },
    [
      setInput,
      getCaret,
      closeMentionPopover,
      onSelectMedia,
      onSelectModel,
      onSelectWorkflow,
      onAfterSelect,
      onInsertItem,
    ],
  );
  const onKeyDown = reactExports.useCallback(
    (keyboardEvent) => {
      if (!open) return false;
      switch (keyboardEvent.key) {
        case "ArrowDown": {
          if (items.length === 0) return false;
          keyboardEvent.preventDefault();
          setActiveIndex((prev) => (prev >= items.length - 1 ? 0 : prev + 1));
          return true;
        }
        case "ArrowUp": {
          if (items.length === 0) return false;
          keyboardEvent.preventDefault();
          setActiveIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
          return true;
        }
        case "Enter":
        case "Tab": {
          if (items.length === 0) return false;
          const selected = items[activeIndex];
          if (!selected) return false;
          keyboardEvent.preventDefault();
          onSelect(selected);
          return true;
        }
        case "Escape": {
          keyboardEvent.preventDefault();
          closeMentionPopover();
          return true;
        }
        default:
          return false;
      }
    },
    [open, items, activeIndex, onSelect, closeMentionPopover],
  );
  const state = reactExports.useMemo(
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
    state,
    setActiveIndex,
    setFileKindFilter,
    onChange,
    onKeyDown,
    onSelect,
    openPopover,
    close: closeMentionPopover,
  };
}
