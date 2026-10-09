// 连接器标签页：分类筛选、排序菜单、头部与整页列表。
import {
  h as useTranslation,
  r as reactExports,
  a3 as dedupedToast,
  H as homeService,
  j as jsxRuntimeExports,
  iT as ConnectorIcon,
  e as Icon,
  mz as CustomConnectorDialog,
  au as cn,
  mB as connectorTitle,
  gC as CatalogPageHeading,
  fM as Button,
  Q as Plus,
  mE as useConnectorInventory,
  mF as useConnectorCatalog,
  mG as connectorDescription,
  k4 as Alert,
  k7 as AlertDescription,
  U as PageStateBoundary,
  mH as findOfficialConnectorForServer,
  S as Search,
  mI as LocalConnectorDialog,
  mJ as connectorReferenceFromServer,
  mK as FilterMenu,
  mL as FilterMenuTrigger,
  bE as ChevronDown,
  mM as FilterMenuContent,
  mN as FilterMenuGroup,
  mO as FilterMenuItem,
  g6 as getRuntimeConfig,
} from "../../main.jsx";
import { P as PageSearchInput } from "../../index-CCILjxtP.js";
import {
  C as ConnectorCardContent,
  b as buildConnectorCatalog,
  i as isWebApiConnector,
  d as isLocalConnector,
} from "../../connector-catalog-data-DiTljgxj.js";
import { __jsx } from "../../shared/jsx-runtime.js";
import {
  BrowserConnectorCard,
  useBrowserConnector,
  useTryConnector,
} from "./browser-connector.jsx";
import {
  ConnectorDetailDialog,
  ConnectorVisibilityControl,
  CustomConnectorCard,
  isConnectorUsable,
  toConnectorDisplayState,
} from "./connector-detail.jsx";
import { LocalConnectorDetailDialog } from "./local-connector.jsx";
import { HCP_CATEGORIES } from "../review-rules.js";
const CONNECTOR_SORT_MODES = ["default", "connected-first"];
function ConnectorCategoryChips({ categories, value, onValueChange }) {
  const { t } = useTranslation();
  const chipClassName = (active) =>
    cn(
      "inline-flex h-8 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-md border border-transparent px-2.5 text-[13px] leading-5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
      active
        ? "bg-secondary font-medium text-foreground"
        : "bg-transparent text-foreground/50 hover:text-foreground",
    );
  return (
    <div
      className="scrollbar-none flex min-w-0 items-center gap-1 overflow-x-auto"
      data-layout-slot="connectors-category-chips"
    >
      <button
        type="button"
        className={chipClassName(value === null)}
        onClick={() => onValueChange(null)}
        data-action-ui-id="connectors-category-all"
      >
        {t("connectors.category.all")}
      </button>
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          className={chipClassName(value === category)}
          onClick={() => onValueChange(category)}
          data-action-ui-id={`connectors-category-${category}`}
        >
          {t(`connectors.category.${category}`)}
        </button>
      ))}
    </div>
  );
}
function cardCategory(card) {
  if (card.kind === "browser") return "data-research";
  const declared = card.kind === "catalog" ? card.connector.category : card.catalogEntry?.category;
  return declared && HCP_CATEGORIES.includes(declared) ? declared : "other";
}
function runtimeRegion() {
  try {
    const config = getRuntimeConfig();
    if (config.env === "development") return "all";
    const region = config.region;
    return region === "domestic" || region === "overseas" ? region : void 0;
  } catch {
    return void 0;
  }
}
function ConnectorSortMenu({ value, onValueChange }) {
  const { t } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const valueLabel = t(`connectors.sort.${value}`);
  return (
    <FilterMenu open={open} onOpenChange={setOpen}>
      <FilterMenuTrigger
        render={
          <button
            type="button"
            aria-label={t("connectors.sort.ariaLabel", {
              mode: valueLabel,
            })}
            className="inline-flex h-9 min-w-40 shrink-0 cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-border bg-transparent px-3 text-xs text-foreground transition-colors hover:border-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
            data-action-ui-id="connectors-sort"
          />
        }
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="text-muted-foreground">{t("connectors.sort.label")}</span>
          <span className="truncate">{valueLabel}</span>
        </span>
        <ChevronDown aria-hidden="true" size={14} strokeWidth={1.5} className="shrink-0" />
      </FilterMenuTrigger>
      <FilterMenuContent
        align="end"
        alignOffset={0}
        sideOffset={4}
        className="min-w-40 gap-0 p-1"
        data-action-ui-id="connectors-sort-menu"
      >
        <FilterMenuGroup className="gap-0">
          {CONNECTOR_SORT_MODES.map((mode) => (
            <FilterMenuItem
              key={mode}
              selected={mode === value}
              onClick={() => {
                onValueChange(mode);
                setOpen(false);
              }}
              className="h-8 rounded-sm px-3 text-xs font-normal hover:bg-popup-item-hover focus-visible:bg-popup-item-hover"
              data-action-ui-id={`connectors-sort-option-${mode}`}
            >
              {t(`connectors.sort.${mode}`)}
            </FilterMenuItem>
          ))}
        </FilterMenuGroup>
      </FilterMenuContent>
    </FilterMenu>
  );
}
export function ConnectorHeaderContent({
  query,
  onQueryChange,
  sortMode,
  onSortModeChange,
  onCustomConnector,
  customDisabled = false,
}) {
  const { t } = useTranslation();
  return (
    <>
      <CatalogPageHeading
        level={2}
        variant="section"
        title={t("connectors.catalogTitle")}
        description={t("connectors.catalogDescription")}
        className="min-w-44 grow basis-auto shrink-[999] overflow-hidden [&_h2]:truncate [&_[data-slot=catalog-page-subtitle]]:truncate"
      />
      <div
        className="scrollbar-none flex min-w-0 max-w-full shrink items-center gap-3 overflow-x-auto overscroll-x-contain [&>*:first-child]:ml-auto"
        data-layout-slot="connectors-toolbar-actions"
      >
        <div className="w-60 min-w-36 max-w-60 shrink" data-layout-slot="connectors-search-slot">
          <PageSearchInput
            value={query}
            onValueChange={onQueryChange}
            placeholder={t("connectors.searchPlaceholder")}
            clearLabel={t("common.clear")}
            inputActionId="connectors-search"
            clearActionId="connectors-search-clear"
          />
        </div>
        <ConnectorSortMenu value={sortMode} onValueChange={onSortModeChange} />
        <Button
          type="button"
          disabled={customDisabled}
          size="default"
          onClick={onCustomConnector}
          className="h-9 shrink-0 gap-1.5 whitespace-nowrap rounded-lg pl-3.5 pr-4 text-[13px] font-medium"
          data-action-ui-id="connectors-custom"
        >
          <Icon icon={Plus} size="md" aria-hidden={true} />
          {t("connectors.custom")}
        </Button>
      </div>
    </>
  );
}
export function ConnectorsTab({
  query: controlledQuery,
  onQueryChange,
  customConnectorOpen: controlledCustomConnectorOpen,
  onCustomConnectorOpenChange,
  sortMode: controlledSortMode,
  onSortModeChange,
  showHeader = true,
} = {}) {
  const { t, i18n } = useTranslation();
  const browserConnector = useBrowserConnector();
  const browserTitle = t("connectors.catalog.browser.title", "浏览器");
  const browserDescription = t(
    "connectors.catalog.browser.description",
    "允许 Agent 在内置浏览器中浏览网页、查找信息和操作网站。关闭后仍可手动浏览。",
  );
  const language = i18n?.language ?? "en";
  const [localQuery, setLocalQuery] = reactExports.useState("");
  const [localCustomConnectorOpen, setLocalCustomConnectorOpen] = reactExports.useState(false);
  const [localSortMode, setLocalSortMode] = reactExports.useState("default");
  const query = controlledQuery ?? localQuery;
  const setQuery = onQueryChange ?? setLocalQuery;
  const customConnectorOpen = controlledCustomConnectorOpen ?? localCustomConnectorOpen;
  const setCustomConnectorOpen = onCustomConnectorOpenChange ?? setLocalCustomConnectorOpen;
  const sortMode = controlledSortMode ?? localSortMode;
  const setSortMode = onSortModeChange ?? setLocalSortMode;
  const [activeCategory, setActiveCategory] = reactExports.useState(null);
  const [activeConnector, setActiveConnector] = reactExports.useState(null);
  const [detailConnector, setDetailConnector] = reactExports.useState(null);
  const [localDetailConnector, setLocalDetailConnector] = reactExports.useState(null);
  const [localConnector, setLocalConnector] = reactExports.useState(null);
  const inventory = useConnectorInventory();
  const customConnectors = inventory.servers;
  const setCustomConnectors = inventory.update;
  const { tryConnector } = useTryConnector();
  const [loading, setLoading] = reactExports.useState(true);
  const [loadFailed, setLoadFailed] = reactExports.useState(false);
  const [hasLoaded, setHasLoaded] = reactExports.useState(false);
  const loadEpoch = reactExports.useRef(0);
  const loadConnectors = reactExports.useCallback(async () => {
    const epoch = ++loadEpoch.current;
    setLoading(true);
    try {
      const servers = await inventory.refresh();
      if (epoch !== loadEpoch.current) return;
      setCustomConnectors(() => servers);
      setLoadFailed(false);
      setHasLoaded(true);
    } catch {
      if (epoch === loadEpoch.current) setLoadFailed(true);
    } finally {
      if (epoch === loadEpoch.current) setLoading(false);
    }
  }, [inventory.refresh, setCustomConnectors]);
  const invalidateLoad = () => {
    loadEpoch.current += 1;
    setLoading(false);
  };
  reactExports.useEffect(() => {
    void loadConnectors();
    return () => {
      loadEpoch.current += 1;
    };
  }, [loadConnectors]);
  const region = reactExports.useMemo(runtimeRegion, []);
  const market = useConnectorCatalog();
  const catalogEntries = market.entries;
  const catalogLoading = catalogEntries.length === 0 && !loadFailed;
  const isOperator = market.permission.isOperator;
  const visibleIds = reactExports.useMemo(
    () => new Set(market.visibility.visibleConnectorIds),
    [market.visibility.visibleConnectorIds],
  );
  const eligibleIds = reactExports.useMemo(
    () => new Set(market.displayConnectorIds),
    [market.displayConnectorIds],
  );
  const officialIds = reactExports.useMemo(
    () =>
      new Set(
        catalogEntries
          .filter((entry) => entry.source === "dynamic")
          .map((entry) => entry.manifest.connectorId),
      ),
    [catalogEntries],
  );
  const visibilityControl = (id, name) =>
    isOperator && officialIds.has(id) ? (
      <ConnectorVisibilityControl
        connectorId={id}
        name={name}
        visible={visibleIds.has(id)}
        pending={market.pendingIds.has(id)}
        onChange={market.setVisibility}
      />
    ) : (
      void 0
    );
  const connectorCatalog = reactExports.useMemo(
    () => buildConnectorCatalog(catalogEntries, isOperator),
    [catalogEntries, isOperator],
  );
  const connectors = reactExports.useMemo(
    () =>
      // A saved connection replaces its catalog entry, including while
      // disabled or failed. Only a successful removal restores the add card.
      connectorCatalog
        .filter(
          (connector) =>
            (isOperator ||
              ((!officialIds.has(connector.id) || visibleIds.has(connector.id)) &&
                eligibleIds.has(connector.id) &&
                !connector.hidden &&
                (!connector.regions ||
                  region === "all" ||
                  (region !== void 0 && connector.regions.includes(region))))) &&
            !customConnectors.some(connector.matches),
        )
        .map((connector) => ({
          ...connector,
          title: connectorTitle(t, language, connector.id, connector.titleText),
          description: connectorDescription(t, language, connector.id, connector.descriptionText),
        })),
    [
      t,
      language,
      customConnectors,
      region,
      connectorCatalog,
      isOperator,
      officialIds,
      visibleIds,
      eligibleIds,
    ],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const browserVisible =
    !normalizedQuery ||
    `${browserTitle} ${browserDescription}`.toLocaleLowerCase().includes(normalizedQuery);
  const visibleConnectors = reactExports.useMemo(
    () =>
      normalizedQuery
        ? connectors.filter((connector) =>
            `${connector.title} ${connector.description}`
              .toLocaleLowerCase()
              .includes(normalizedQuery),
          )
        : connectors,
    [connectors, normalizedQuery],
  );
  const savedConnectorViews = reactExports.useMemo(
    () =>
      customConnectors.map((connector) => {
        const catalogEntry = connectorCatalog.find((entry) => entry.matches(connector));
        return {
          connector,
          catalogEntry,
          title: catalogEntry
            ? connectorTitle(t, language, catalogEntry.id, catalogEntry.titleText)
            : connector.name,
          description: catalogEntry
            ? connectorDescription(t, language, catalogEntry.id, catalogEntry.descriptionText)
            : (connector.description?.trim() ?? ""),
        };
      }),
    [customConnectors, t, language, connectorCatalog],
  );
  const visibleCustomConnectors = reactExports.useMemo(
    () =>
      normalizedQuery
        ? savedConnectorViews.filter(({ connector, title, description }) =>
            `${title} ${description} ${connector.name} ${connector.endpoint ?? ""}`
              .toLocaleLowerCase()
              .includes(normalizedQuery),
          )
        : savedConnectorViews,
    [normalizedQuery, savedConnectorViews],
  );
  const visibleConnectorCards = reactExports.useMemo(() => {
    const visibleCatalogById = new Map(
      visibleConnectors.map((connector) => [connector.id, connector]),
    );
    const allSavedCatalogIds = new Set(
      savedConnectorViews.flatMap(({ catalogEntry }) => (catalogEntry ? [catalogEntry.id] : [])),
    );
    const visibleSavedByCatalogId = new Map();
    for (const view of visibleCustomConnectors) {
      if (!view.catalogEntry) continue;
      const current = visibleSavedByCatalogId.get(view.catalogEntry.id) ?? [];
      current.push({
        kind: "saved",
        ...view,
      });
      visibleSavedByCatalogId.set(view.catalogEntry.id, current);
    }
    const orderedCards = browserVisible
      ? [
          {
            kind: "browser",
          },
        ]
      : [];
    for (const catalogEntry of connectorCatalog) {
      if (allSavedCatalogIds.has(catalogEntry.id)) {
        orderedCards.push(...(visibleSavedByCatalogId.get(catalogEntry.id) ?? []));
        continue;
      }
      const connector = visibleCatalogById.get(catalogEntry.id);
      if (connector)
        orderedCards.push({
          kind: "catalog",
          connector,
        });
    }
    orderedCards.push(
      ...visibleCustomConnectors
        .filter(({ catalogEntry }) => !catalogEntry)
        .map((view) => ({
          kind: "saved",
          ...view,
        })),
    );
    return orderedCards;
  }, [
    browserVisible,
    savedConnectorViews,
    visibleConnectors,
    visibleCustomConnectors,
    connectorCatalog,
  ]);
  const sortedVisibleConnectorCards = reactExports.useMemo(() => {
    if (sortMode === "default") return visibleConnectorCards;
    const connectedCards = [];
    const remainingCards = [];
    for (const card of visibleConnectorCards) {
      const isConnected =
        card.kind === "browser"
          ? browserConnector.enabled
          : card.kind === "saved" &&
            isConnectorUsable(toConnectorDisplayState(card.connector.runtimeState));
      (isConnected ? connectedCards : remainingCards).push(card);
    }
    return [...connectedCards, ...remainingCards];
  }, [browserConnector.enabled, sortMode, visibleConnectorCards]);
  const availableCategories = reactExports.useMemo(() => {
    const present = new Set(visibleConnectorCards.map(cardCategory));
    return HCP_CATEGORIES.filter((category) => present.has(category));
  }, [visibleConnectorCards]);
  const categoryCards = reactExports.useMemo(
    () =>
      activeCategory === null
        ? sortedVisibleConnectorCards
        : sortedVisibleConnectorCards.filter((card) => cardCategory(card) === activeCategory),
    [activeCategory, sortedVisibleConnectorCards],
  );
  const grouped = activeCategory === null && sortMode === "default";
  const categorySections = reactExports.useMemo(() => {
    if (!grouped)
      return [
        {
          category: activeCategory ?? "all",
          cards: categoryCards,
        },
      ];
    return HCP_CATEGORIES.map((category) => ({
      category,
      cards: categoryCards.filter((card) => cardCategory(card) === category),
    })).filter((section) => section.cards.length > 0);
  }, [grouped, activeCategory, categoryCards]);
  const resultCount = categoryCards.length;
  const handleCreated = (result) => {
    invalidateLoad();
    setCustomConnectors((current) =>
      [...current.filter((server) => server.name !== result.server.name), result.server].sort(
        (left, right) => left.name.localeCompare(right.name),
      ),
    );
    const displayState = toConnectorDisplayState(result.runtime.state);
    const key = `connectors.customDialog.created.${displayState}`;
    if (displayState === "connected") dedupedToast.success(t(key));
    else dedupedToast.warning(t(key));
  };
  const handleCardClick = (connector, savedServer) => {
    if (!connector.detail) return;
    if (isLocalConnector(connector))
      setLocalDetailConnector({
        ...connector,
        serverName: savedServer?.name,
      });
    else setDetailConnector(connector);
  };
  const handleQuickConnect = (connector) => {
    setDetailConnector(null);
    setLocalDetailConnector(null);
    if (isWebApiConnector(connector)) {
      setActiveConnector(connector);
      return;
    }
    setActiveConnector(null);
    setLocalConnector(connector);
  };
  const findSavedServer = (connector) => customConnectors.find(connector.matches);
  const handleConnectorUpdated = (updated) => {
    invalidateLoad();
    setCustomConnectors((current) =>
      current.map((server) => (server.name === updated.name ? updated : server)),
    );
  };
  const handleConnectorRemoved = (name) => {
    invalidateLoad();
    setCustomConnectors((current) => current.filter((server) => server.name !== name));
  };
  const ActiveConnectorDialog = activeConnector?.entry.Dialog;
  const DetailConnectorSetupDialog =
    detailConnector && isWebApiConnector(detailConnector) ? detailConnector.entry.Dialog : void 0;
  const browserCard = (
    <BrowserConnectorCard
      key={"builtin:browser"}
      title={browserTitle}
      description={browserDescription}
      enabled={browserConnector.enabled}
      pending={browserConnector.pending}
      onEnabledChange={browserConnector.handleEnabledChange}
    />
  );
  return (
    <section className="flex flex-col gap-6" data-action-ui-id="connectors-tab">
      {showHeader ? (
        <div
          className="mb-2 flex min-h-[68px] min-w-0 flex-nowrap items-start gap-3"
          data-layout-slot="connectors-section-header"
        >
          <ConnectorHeaderContent
            query={query}
            onQueryChange={setQuery}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            onCustomConnector={() => setCustomConnectorOpen(true)}
            customDisabled={!hasLoaded || loading || catalogLoading}
          />
        </div>
      ) : null}
      {loadFailed && hasLoaded ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            {t("connectors.loadFailed")}
            <Button variant="outline" disabled={loading} onClick={() => void loadConnectors()}>
              {t("common.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {availableCategories.length > 1 ? (
        <ConnectorCategoryChips
          categories={availableCategories}
          value={activeCategory}
          onValueChange={setActiveCategory}
        />
      ) : null}
      {((loadFailed && !hasLoaded) || catalogLoading) &&
      browserVisible &&
      (activeCategory === null || activeCategory === "data-research") ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{browserCard}</div>
      ) : null}
      <PageStateBoundary
        error={loadFailed && !hasLoaded}
        errorOptions={{
          reason: "generic",
          text: t("connectors.loadFailed"),
          retry: {
            onClick: () => void loadConnectors(),
            loading,
          },
        }}
      >
        {catalogLoading ? (
          <div
            className="flex min-h-48 items-center justify-center"
            data-action-ui-id="connectors-loading"
          >
            <span className="text-sm text-muted-foreground">{t("common.loading", "Loading…")}</span>
          </div>
        ) : resultCount > 0 ? (
          <div className="flex flex-col gap-8" data-action-ui-id="connectors-list">
            {categorySections.map((section) => (
              <section key={section.category} data-connector-category={section.category}>
                {grouped ? (
                  <h3 className="mb-3 text-[13px] font-medium text-muted-foreground">
                    {t(`connectors.category.${section.category}`)}
                  </h3>
                ) : null}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {section.cards.map((card) => {
                    if (card.kind === "browser") return browserCard;
                    if (card.kind === "saved") {
                      const { connector: connector2, catalogEntry, title, description } = card;
                      return (
                        <CustomConnectorCard
                          key={`saved:${connector2.name}`}
                          connector={connector2}
                          editable={!findOfficialConnectorForServer(connector2)}
                          title={title}
                          description={description}
                          icon={catalogEntry?.icon}
                          iconUrl={catalogEntry?.detail?.iconUrl}
                          origin={catalogEntry?.origin}
                          marketControls={
                            catalogEntry ? visibilityControl(catalogEntry.id, title) : void 0
                          }
                          onClick={
                            catalogEntry?.detail
                              ? () => handleCardClick(catalogEntry, connector2)
                              : void 0
                          }
                          onUpdated={handleConnectorUpdated}
                          onRemoved={handleConnectorRemoved}
                        />
                      );
                    }
                    const { connector } = card;
                    return (
                      // biome-ignore lint/a11y/useKeyWithClickEvents: catalog card click
                      <article
                        key={`catalog:${connector.id}`}
                        className="relative flex min-h-40 cursor-pointer flex-col rounded-2xl border border-border bg-card p-5"
                        data-action-ui-id="connectors-card"
                        data-connector-id={connector.id}
                        onClick={() => handleCardClick(connector)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <ConnectorIcon
                            iconUrl={connector.detail?.iconUrl}
                            size="card"
                            fallback={
                              <Icon
                                icon={connector.icon}
                                size="lg"
                                aria-hidden={true}
                                className="text-foreground/70"
                              />
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={!hasLoaded || loading}
                            aria-label={t("connectors.addAria", {
                              name: connector.title,
                            })}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleQuickConnect(connector);
                            }}
                            className="size-10 rounded-[10px] bg-secondary text-foreground hover:bg-popup-item-active hover:text-foreground"
                            data-action-ui-id={`connectors-add-${connector.id}`}
                          >
                            <Icon icon={Plus} size="md" aria-hidden={true} />
                          </Button>
                        </div>
                        <ConnectorCardContent
                          title={connector.title}
                          description={connector.description}
                          origin={connector.origin}
                        />
                        {visibilityControl(connector.id, connector.title)}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div
            className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card text-center"
            data-action-ui-id="connectors-empty"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground opacity-50">
              <Icon icon={Search} size="lg" aria-hidden={true} />
            </span>
            <p className="text-sm font-medium text-foreground">{t("connectors.emptyTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("connectors.emptyDescription")}</p>
          </div>
        )}
      </PageStateBoundary>
      <CustomConnectorDialog
        open={customConnectorOpen}
        onOpenChange={setCustomConnectorOpen}
        onSubmit={(input) => homeService.customMcp.create(input)}
        onCreated={handleCreated}
      />
      {localConnector ? (
        <LocalConnectorDialog
          key={`${localConnector.id}:${localConnector.serverName ?? localConnector.id}`}
          connectorId={localConnector.id}
          displayName={localConnector.titleText}
          serverName={localConnector.serverName}
          iconUrl={localConnector.detail?.iconUrl ?? ""}
          setupUrl={localConnector.detail?.setupUrl}
          onClose={() => setLocalConnector(null)}
          onInstalled={() => void loadConnectors()}
        />
      ) : null}
      {localDetailConnector?.detail && !localConnector ? (
        <LocalConnectorDetailDialog
          key={`${localDetailConnector.id}:${localDetailConnector.serverName ?? localDetailConnector.id}`}
          connectorId={localDetailConnector.id}
          displayName={localDetailConnector.titleText}
          description={localDetailConnector.descriptionText}
          origin={localDetailConnector.origin}
          app={localDetailConnector.detail.app}
          skills={localDetailConnector.detail.skills}
          examplePrompts={localDetailConnector.detail.examplePrompts}
          serverName={localDetailConnector.serverName}
          iconUrl={localDetailConnector.detail.iconUrl}
          setupUrl={localDetailConnector.detail.setupUrl}
          savedServer={findSavedServer(localDetailConnector)}
          onClose={() => setLocalDetailConnector(null)}
          onInstalled={() => void loadConnectors()}
          onTry={(prompt) => {
            const saved = findSavedServer(localDetailConnector);
            if (!saved) return;
            setLocalDetailConnector(null);
            void tryConnector(
              {
                ...connectorReferenceFromServer(saved),
                displayName: connectorTitle(
                  t,
                  language,
                  localDetailConnector.id,
                  localDetailConnector.titleText,
                ),
                iconUrl: localDetailConnector.detail?.iconUrl ?? null,
              },
              prompt,
            );
          }}
          onUpdated={handleConnectorUpdated}
          onRemoved={(name) => {
            handleConnectorRemoved(name);
            setLocalDetailConnector(null);
          }}
        />
      ) : null}
      {activeConnector && ActiveConnectorDialog ? (
        <ActiveConnectorDialog
          key={activeConnector.id}
          onClose={() => setActiveConnector(null)}
          onSubmit={(input) => homeService.customMcp.create(input)}
          onCreated={(result) => {
            handleCreated(result);
            setActiveConnector(null);
            setDetailConnector(null);
          }}
        />
      ) : null}
      {detailConnector?.detail && !activeConnector ? (
        <ConnectorDetailDialog
          connector={detailConnector}
          savedServer={findSavedServer(detailConnector)}
          onClose={() => setDetailConnector(null)}
          onConnect={() => {
            handleQuickConnect(detailConnector);
          }}
          setupContent={
            DetailConnectorSetupDialog
              ? (onBusyChange) => (
                  <DetailConnectorSetupDialog
                    embedded={true}
                    onBusyChange={onBusyChange}
                    onClose={() => setDetailConnector(null)}
                    onSubmit={(input) => homeService.customMcp.create(input)}
                    onCreated={(result) => {
                      handleCreated(result);
                      setDetailConnector(null);
                    }}
                  />
                )
              : void 0
          }
          onTry={(prompt) => {
            const saved = findSavedServer(detailConnector);
            if (!saved) return;
            setDetailConnector(null);
            void tryConnector(connectorReferenceFromServer(saved), prompt);
          }}
          onUpdated={handleConnectorUpdated}
          onRemoved={(name) => {
            handleConnectorRemoved(name);
            setDetailConnector(null);
          }}
        />
      ) : null}
    </section>
  );
}
