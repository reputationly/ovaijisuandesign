// 全局搜索弹窗：输入框、筛选标签、分组结果列表与键盘操作。
import {
  r as reactExports,
  h as useTranslation,
  ar as useIsScrolling,
  t as trackEvent,
  T as TRACK_EVENTS,
  as as Dialog,
  at as DialogContent,
  e as Icon,
  S as Search,
  au as cn,
  U as PageStateBoundary,
  av as KbdGroup,
  aw as Kbd,
} from "../main.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CATEGORY_TYPE_LABEL_FALLBACKS,
  CATEGORY_TYPE_LABEL_KEYS,
  MODAL_HANDOFF_CLOSE_DELAY_MS,
  PRIMARY_FILTERS,
  SEARCH_TRACK_IDLE_MS,
} from "./constants.js";
import {
  buildHubProjectResults,
  buildRecentSearchResults,
  buildRecommendedSearchResults,
} from "./result-builders.js";
import {
  actionType,
  groupResults,
  isMediaFilter,
  resultMatchesPrimaryFilter,
} from "./result-filters.js";
import { ResultIcon, ResultLeadingVisual, formatRelativeTime } from "./result-visuals.jsx";
import { useGlobalSearch } from "./use-global-search.js";
function GlobalSearchDialog({
  open,
  onOpenChange,
  workspaces,
  recentWorkspaces = [],
  projects = [],
  currentWorkspaceId = null,
  onNavigateFile,
  onNavigateCanvasNode,
  onNavigateSession,
  onExecuteAction,
}) {
  const { t } = useTranslation();
  const [query, setQuery] = reactExports.useState("");
  const [selectedIndex, setSelectedIndex] = reactExports.useState(0);
  const [primaryFilter, setPrimaryFilter] = reactExports.useState("all");
  const inputRef = reactExports.useRef(null);
  const listRef = reactExports.useRef(null);
  const tabListRef = reactExports.useRef(null);
  const tabRefs = reactExports.useRef({});
  const lastTrackedSearchSummaryRef = reactExports.useRef("");
  const searchTrackTimerRef = reactExports.useRef(null);
  const modalHandoffCloseTimerRef = reactExports.useRef(null);
  const [tabIndicator, setTabIndicator] = reactExports.useState({
    left: 0,
    width: 0,
  });
  const isListScrolling = useIsScrolling({
    scrollRef: listRef,
  });
  const { results, loading, search, clear } = useGlobalSearch(workspaces, {
    currentWorkspaceId,
    recentWorkspaces,
    projects,
  });
  const translate = reactExports.useCallback(
    (key, fallback) => {
      if (!key) return fallback ?? "";
      return t(key, fallback ?? "");
    },
    [t],
  );
  const normalizedQuery = query.trim();
  const searchGroups = reactExports.useMemo(() => groupResults(results), [results]);
  const recommendedResults = reactExports.useMemo(
    () => buildRecommendedSearchResults(currentWorkspaceId),
    [currentWorkspaceId],
  );
  const defaultGroups = reactExports.useMemo(() => {
    const recent = buildRecentSearchResults(workspaces, recentWorkspaces);
    const hubProjects = buildHubProjectResults("", projects);
    return [
      ...(recent.length > 0
        ? [
            {
              id: "recent",
              labelKey: "globalSearch.default.recent",
              label: "Recent",
              items: recent,
            },
          ]
        : []),
      ...(hubProjects.length > 0
        ? [
            {
              id: "hubProject",
              labelKey: "globalSearch.hubProjects",
              label: "Projects",
              items: hubProjects,
            },
          ]
        : []),
      {
        id: "recommended",
        labelKey: "globalSearch.default.recommended",
        label: "Recommended actions",
        items: recommendedResults.slice(0, 6),
      },
    ];
  }, [projects, recentWorkspaces, recommendedResults, workspaces]);
  const sourceGroups = normalizedQuery ? searchGroups : defaultGroups;
  const activeFilter = PRIMARY_FILTERS.find((filter) => filter.id === primaryFilter);
  const activeFilterLabel = activeFilter ? t(activeFilter.labelKey, activeFilter.label) : "";
  const displayGroups = reactExports.useMemo(() => {
    const filteredGroups = sourceGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((result) => {
          return resultMatchesPrimaryFilter(result, primaryFilter);
        }),
      }))
      .filter((group) => group.items.length > 0);
    if (primaryFilter !== "quickAction") {
      return filteredGroups;
    }
    const items = filteredGroups.flatMap((group) => group.items);
    return items.length > 0
      ? [
          {
            id: "quickAction",
            labelKey: "globalSearch.filter.quickActions",
            label: "Quick actions",
            items,
          },
        ]
      : [];
  }, [primaryFilter, sourceGroups]);
  const flatResults = reactExports.useMemo(
    () => displayGroups.flatMap((group) => group.items),
    [displayGroups],
  );
  const showEmpty = !loading && flatResults.length === 0;
  reactExports.useEffect(() => {
    if (!open) return;
    let rafId = null;
    let attempts = 0;
    let resizeObserver = null;
    const updateIndicator = () => {
      const tabList = tabListRef.current;
      const activeTab = tabRefs.current[primaryFilter];
      if (!tabList || !activeTab) return false;
      const activeLabel = activeTab.querySelector('[data-tab-label="true"]');
      const tabListRect = tabList.getBoundingClientRect();
      const labelRect = activeLabel?.getBoundingClientRect();
      setTabIndicator({
        left: labelRect
          ? labelRect.left - tabListRect.left + tabList.scrollLeft
          : activeTab.offsetLeft,
        width: labelRect?.width ?? activeTab.offsetWidth,
      });
      if (!resizeObserver && typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(updateIndicator);
        resizeObserver.observe(tabList);
        resizeObserver.observe(activeTab);
        if (activeLabel) resizeObserver.observe(activeLabel);
      }
      return true;
    };
    window.addEventListener("resize", updateIndicator);
    const measureWhenReady = () => {
      if (updateIndicator()) return;
      attempts += 1;
      if (attempts > 8) return;
      rafId = requestAnimationFrame(measureWhenReady);
    };
    measureWhenReady();
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [open, primaryFilter]);
  const closeWithReason = reactExports.useCallback(
    (method) => {
      trackEvent(TRACK_EVENTS.GLOBAL_SEARCH_CLOSE, {
        method,
        query_length: normalizedQuery.length,
        result_count: results.length,
      });
      onOpenChange(false);
    },
    [normalizedQuery, onOpenChange, results.length],
  );
  reactExports.useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setPrimaryFilter("all");
      lastTrackedSearchSummaryRef.current = "";
      clear();
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, clear]);
  reactExports.useEffect(() => {
    return () => {
      if (modalHandoffCloseTimerRef.current != null) {
        clearTimeout(modalHandoffCloseTimerRef.current);
        modalHandoffCloseTimerRef.current = null;
      }
      if (searchTrackTimerRef.current != null) {
        clearTimeout(searchTrackTimerRef.current);
        searchTrackTimerRef.current = null;
      }
    };
  }, []);
  reactExports.useEffect(() => {
    if (!open) return;
    search(query);
  }, [open, query, search]);
  reactExports.useEffect(() => {
    setSelectedIndex((index) => {
      if (flatResults.length === 0) return 0;
      return Math.min(index, flatResults.length - 1);
    });
  }, [flatResults.length]);
  reactExports.useEffect(() => {
    if (!open || !normalizedQuery || loading) return;
    if (searchTrackTimerRef.current != null) clearTimeout(searchTrackTimerRef.current);
    searchTrackTimerRef.current = setTimeout(() => {
      searchTrackTimerRef.current = null;
      const trackKey = [
        normalizedQuery.length,
        results.length,
        searchGroups.length,
        primaryFilter,
        currentWorkspaceId ?? "",
      ].join(":");
      if (lastTrackedSearchSummaryRef.current === trackKey) return;
      lastTrackedSearchSummaryRef.current = trackKey;
      trackEvent(TRACK_EVENTS.GLOBAL_SEARCH_QUERY, {
        query_length: normalizedQuery.length,
        result_count: results.length,
        category_count: searchGroups.length,
        has_results: results.length > 0,
        current_workspace_id: currentWorkspaceId ?? void 0,
      });
      if (results.length === 0) {
        trackEvent(TRACK_EVENTS.GLOBAL_SEARCH_NO_RESULT, {
          query_length: normalizedQuery.length,
          current_workspace_id: currentWorkspaceId ?? void 0,
        });
      }
    }, SEARCH_TRACK_IDLE_MS);
    return () => {
      if (searchTrackTimerRef.current != null) {
        clearTimeout(searchTrackTimerRef.current);
        searchTrackTimerRef.current = null;
      }
    };
  }, [
    currentWorkspaceId,
    loading,
    normalizedQuery,
    open,
    primaryFilter,
    results.length,
    searchGroups.length,
  ]);
  const focusInput = reactExports.useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);
  const handleSelect = reactExports.useCallback(
    async (result, index) => {
      trackEvent(TRACK_EVENTS.GLOBAL_SEARCH_RESULT_CLICK, {
        query_length: normalizedQuery.length,
        result_type: result.category,
        action_type: actionType(result),
        rank: index + 1,
      });
      if (result.action?.type === "query") {
        setQuery(result.action.query);
        setSelectedIndex(0);
        focusInput();
        return;
      }
      if (result.action) {
        trackEvent(TRACK_EVENTS.GLOBAL_SEARCH_COMMAND_EXECUTE, {
          query_length: normalizedQuery.length,
          command_type: result.action.type,
          result_type: result.category,
        });
        const shouldClose = await onExecuteAction?.(result);
        if (shouldClose === false) return;
        if (result.action.type === "settings") {
          modalHandoffCloseTimerRef.current = setTimeout(() => {
            modalHandoffCloseTimerRef.current = null;
            closeWithReason("select");
          }, MODAL_HANDOFF_CLOSE_DELAY_MS);
        } else {
          closeWithReason("select");
        }
        return;
      }
      closeWithReason("select");
      switch (result.category) {
        case "file":
          onNavigateFile?.(result);
          break;
        case "canvas":
          onNavigateCanvasNode?.(result);
          break;
        case "session":
          onNavigateSession?.(result);
          break;
      }
    },
    [
      closeWithReason,
      focusInput,
      normalizedQuery,
      onExecuteAction,
      onNavigateCanvasNode,
      onNavigateFile,
      onNavigateSession,
    ],
  );
  const handleKeyDown = reactExports.useCallback(
    (event) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((index) =>
            flatResults.length === 0 ? 0 : Math.min(index + 1, flatResults.length - 1),
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((index) => Math.max(index - 1, 0));
          break;
        case "Enter":
          event.preventDefault();
          if (flatResults[selectedIndex]) {
            void handleSelect(flatResults[selectedIndex], selectedIndex);
          }
          break;
        case "Escape":
          event.preventDefault();
          closeWithReason("keyboard");
          break;
      }
    },
    [closeWithReason, flatResults, handleSelect, selectedIndex],
  );
  reactExports.useEffect(() => {
    const el = listRef.current?.querySelector('[data-selected="true"]');
    el?.scrollIntoView({
      block: "nearest",
    });
  }, [selectedIndex]);
  const handleDialogOpenChange = reactExports.useCallback(
    (nextOpen) => {
      if (!nextOpen && open) {
        closeWithReason("dialog");
        return;
      }
      onOpenChange(nextOpen);
    },
    [closeWithReason, onOpenChange, open],
  );
  const handlePrimaryFilterClick = reactExports.useCallback(
    (nextFilter) => {
      setPrimaryFilter(nextFilter);
      setSelectedIndex(0);
      focusInput();
    },
    [focusInput],
  );
  let flatIndex = 0;
  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        size="lg"
        className="global-search-dialog !translate-y-0 flex min-h-[var(--global-search-dialog-min-height)] max-h-[min(640px,72vh)] flex-col gap-0 overflow-hidden rounded-xl bg-popover p-0 text-popover-foreground shadow-lg ring-0 duration-150 data-open:slide-in-from-top-2 data-closed:slide-out-to-top-2"
        showCloseButton={false}
        data-action-ui-id="global-search.dialog"
      >
        <div className="flex min-h-16 shrink-0 items-center gap-2.5 border-b border-border/70 px-4 py-2">
          <Icon
            icon={Search}
            size="md"
            strokeWidth={1.5}
            className="ml-4 shrink-0 text-foreground/60"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t(
              "globalSearch.placeholder",
              "Search creation pages, sessions, media, files, or quick actions...",
            )}
            aria-label={t("globalSearch.inputLabel", "Global search")}
            className="h-10 min-w-0 flex-1 bg-transparent pl-6 text-[15px] text-foreground outline-none placeholder:truncate placeholder:text-muted-foreground"
            data-action-ui-id="global-search.input"
          />
          {loading && (
            <span
              aria-hidden={true}
              className="size-4 shrink-0 rounded-full border-2 border-muted-foreground/25 border-t-foreground animate-spin"
            />
          )}
        </div>
        <div className="shrink-0 px-4">
          <div
            ref={tabListRef}
            className="relative flex items-end gap-4 overflow-x-auto border-b border-border/70 scrollbar-none"
          >
            {PRIMARY_FILTERS.map((filter) => {
              const active = primaryFilter === filter.id;
              const compact = isMediaFilter(filter.id);
              return (
                <button
                  key={filter.id}
                  ref={(node) => {
                    tabRefs.current[filter.id] = node;
                  }}
                  type="button"
                  aria-pressed={active}
                  data-action-ui-id={`global-search.filter.${filter.id}`}
                  onClick={() => handlePrimaryFilterClick(filter.id)}
                  className={cn(
                    "inline-flex h-10 shrink-0 cursor-pointer items-center text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
                    compact ? "px-1.5" : "px-2",
                    active
                      ? "text-foreground"
                      : "text-foreground/70 hover:bg-popup-item-hover hover:text-foreground",
                  )}
                >
                  <span data-tab-label="true">{t(filter.labelKey, filter.label)}</span>
                </button>
              );
            })}
            <span
              aria-hidden={true}
              className="pointer-events-none absolute bottom-0 h-[2px] rounded-full bg-foreground transition-[left,width] duration-200 ease-out"
              style={{
                left: tabIndicator.left,
                width: tabIndicator.width,
              }}
            />
          </div>
        </div>
        <div
          ref={listRef}
          role="listbox"
          aria-label={t("globalSearch.resultsLabel", "Search results")}
          data-scrolling={isListScrolling ? "true" : void 0}
          className="scrollbar-fade min-h-0 flex-1 max-h-[calc(min(640px,72vh)-9rem)] overflow-y-auto py-2 pr-1.5 mr-0.5 [scrollbar-gutter:stable]"
        >
          {displayGroups.map((group) => (
            <section key={group.id} className="mb-3 last:mb-0">
              <div className="px-5 pb-1 text-xs font-medium text-muted-foreground">
                {translate(group.labelKey, group.label)}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((result) => {
                  const isSelected = flatIndex === selectedIndex;
                  const currentIndex = flatIndex;
                  flatIndex += 1;
                  const title = translate(result.titleKey, result.title);
                  const subtitle = translate(result.subtitleKey, result.subtitle);
                  const meta = translate(result.metaKey, result.meta);
                  const badge = translate(result.badgeKey, result.badge);
                  const typeLabel = translate(
                    CATEGORY_TYPE_LABEL_KEYS[result.category],
                    CATEGORY_TYPE_LABEL_FALLBACKS[result.category],
                  );
                  const sideMeta = [
                    result.time ? formatRelativeTime(result.time, t) : "",
                    typeLabel,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <button
                      key={result.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      data-selected={isSelected}
                      data-action-ui-id={`global-search.result.${result.category}.${currentIndex}`}
                      className={cn(
                        "group/result mx-2 flex w-[calc(100%-1rem)] cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors duration-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
                        isSelected
                          ? "bg-popup-item-active text-foreground"
                          : "text-foreground/70 hover:bg-popup-item-hover hover:text-foreground",
                      )}
                      onClick={() => void handleSelect(result, currentIndex)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                    >
                      <ResultLeadingVisual result={result} />
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-[15px] font-normal">{title}</span>
                          {badge && (
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {badge}
                            </span>
                          )}
                        </span>
                        {(subtitle || meta) && (
                          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                            {subtitle}
                            {subtitle && meta ? " · " : ""}
                            {meta}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground tabular-nums">
                        {sideMeta}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {loading && results.length === 0 && (
            <section className="px-5 py-2">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                {t("globalSearch.loading", "Searching")}
              </div>
              <div className="flex flex-col gap-2">
                {Array.from({
                  length: 4,
                }).map((_, index) => (
                  <div key={index} className="mx-0 flex items-center gap-3 rounded-md px-3 py-2.5">
                    <div className="size-8 rounded-md bg-muted" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3 w-1/3 rounded-full bg-muted" />
                      <div className="h-2.5 w-2/3 rounded-full bg-muted/70" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {showEmpty && (
            <PageStateBoundary
              empty={true}
              className="min-h-[280px] px-5 py-8"
              emptyOptions={{
                title: normalizedQuery
                  ? t("globalSearch.empty.title", {
                      defaultValue: 'No results for "{{query}}"',
                      query: normalizedQuery,
                    })
                  : t("globalSearch.empty.filterTitle", {
                      defaultValue: "No results in {{filter}}",
                      filter: activeFilterLabel,
                    }),
                description: normalizedQuery
                  ? t(
                      "globalSearch.empty.subtitle",
                      "Try a broader scope, open a capability page, or create a new working item.",
                    )
                  : t(
                      "globalSearch.empty.filterSubtitle",
                      "Try another category, or enter a keyword to search.",
                    ),
                actions: normalizedQuery
                  ? recommendedResults.slice(0, 4).map((result, index) => ({
                      key: `recommended-${result.id}`,
                      icon: <ResultIcon result={result} />,
                      label: translate(result.titleKey, result.title),
                      variant: "secondary",
                      onClick: () => handleSelect(result, index),
                    }))
                  : [],
              }}
            />
          )}
        </div>
        <div className="flex h-9 shrink-0 items-center justify-end border-t border-border/70 px-4 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <KbdGroup className="gap-1">
              <Kbd className="h-4 min-w-7 px-1 text-[10px] font-normal">↑↓</Kbd>
              <span>{t("globalSearch.navigate")}</span>
            </KbdGroup>
            <span aria-hidden={true} className="text-muted-foreground/50">
              /
            </span>
            <KbdGroup className="gap-1">
              <Kbd className="h-4 min-w-8 px-1 text-[10px] font-normal">Enter</Kbd>
              <span>{t("globalSearch.open")}</span>
            </KbdGroup>
            <span aria-hidden={true} className="text-muted-foreground/50">
              /
            </span>
            <KbdGroup className="gap-1">
              <Kbd className="h-4 min-w-6 px-1 text-[10px] font-normal">Esc</Kbd>
              <span>{t("globalSearch.close")}</span>
            </KbdGroup>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export { GlobalSearchDialog };
