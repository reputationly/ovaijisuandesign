// 运营后台「已发布」面板：分页列表与投稿人筛选。
import {
  h as useTranslation,
  r as reactExports,
  a3 as dedupedToast,
  jS as AlertDialog,
  jV as AlertDialogContent,
  jW as AlertDialogHeader,
  jX as AlertDialogTitle,
  jY as AlertDialogDescription,
  jZ as AlertDialogFooter,
  j_ as AlertDialogCancel,
  j$ as AlertDialogAction,
  g7 as Badge,
  fM as Button,
  X,
  l as gatewayFetch,
  m as API_PATHS,
  lT as toDisplayName,
  mT as useSkillCategories,
  iY as Select,
  iZ as SelectTrigger,
  i_ as SelectValue,
  i$ as SelectContent,
  j0 as SelectItem,
  f as Input,
  dl as Loader2,
  m$ as useSensors,
  n0 as useSensor,
  n1 as sortableKeyboardCoordinates,
  n2 as KeyboardSensor,
  n3 as PointerSensor,
  eo as Save,
  n4 as DndContext,
  n5 as closestCenter,
  n6 as SortableContext,
  n7 as verticalListSortingStrategy,
  bG as ChevronLeft,
  bI as ChevronRight,
} from "../../main.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
import { OperationsListItem } from "./category-weight-editor.jsx";
import {
  changedOperationItems,
  normalizeCategoryWeights,
  reorderCategoryWeights,
  reorderGlobalSortWeights,
  resolveConfiguredCategories,
  sortOperationItemsByCategory,
} from "./taxonomy.js";
import { useOperations } from "./use-operations.js";
const PUBLISHED_PAGE_SIZE = 20;
export function OperationsPublishedPanel({ onExit }) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");
  const ops = useOperations();
  const { categories: configuredCategories } = useSkillCategories();
  const categoryLabels = reactExports.useMemo(
    () =>
      new Map(
        configuredCategories.map((category) => [
          category.category,
          isZh ? category.cn_name : category.en_name,
        ]),
      ),
    [configuredCategories, isZh],
  );
  const [localItems, setLocalItems] = reactExports.useState([]);
  const [saving, setSaving] = reactExports.useState(false);
  const [confirmOpen, setConfirmOpen] = reactExports.useState(false);
  const [conflictOpen, setConflictOpen] = reactExports.useState(false);
  const [conflicts, setConflicts] = reactExports.useState([]);
  const [exitConfirmOpen, setExitConfirmOpen] = reactExports.useState(false);
  const [sourceFilter, setSourceFilter] = reactExports.useState("all");
  const [categoryFilter, setCategoryFilter] = reactExports.useState("all");
  const [visibilityFilter, setVisibilityFilter] = reactExports.useState("all");
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const [submitterFilter, setSubmitterFilter] = reactExports.useState("");
  const [serverSearchQuery, setServerSearchQuery] = reactExports.useState("");
  const [serverSubmitterFilter, setServerSubmitterFilter] = reactExports.useState("");
  const [page, setPage] = reactExports.useState(1);
  const [total, setTotal] = reactExports.useState(0);
  const [loading, setLoading] = reactExports.useState(false);
  const requestSequenceRef = reactExports.useRef(0);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const fetchPage = reactExports.useCallback(async () => {
    const sequence = ++requestSequenceRef.current;
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(PUBLISHED_PAGE_SIZE),
    });
    if (serverSearchQuery) params.set("query", serverSearchQuery);
    if (serverSubmitterFilter) params.set("submitter", serverSubmitterFilter);
    if (sourceFilter !== "all") params.set("source", sourceFilter);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (visibilityFilter !== "all") params.set("visibility", visibilityFilter);
    try {
      const response = await gatewayFetch(
        `${API_PATHS.marketOperatorPublished}?${params.toString()}`,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (sequence !== requestSequenceRef.current) return;
      const items = [];
      for (const row of data.skills ?? []) {
        const skill = row.skill;
        const op = row.operation;
        const categories = resolveConfiguredCategories(skill.categoryCodes ?? [], op?.categories);
        const item = {
          skillName: skill.name,
          displayName: toDisplayName(skill.name),
          displayNameZh: skill.displayNameZh || void 0,
          badges: op?.badges ?? [],
          hidden: op?.hidden ?? false,
          source: op?.source || (skill.source === "community" ? "user" : "official"),
          categories,
          categoryWeights: normalizeCategoryWeights(
            categories,
            op?.sort_weight ?? 0,
            op?.category_weights,
          ),
          displayUploader: op?.display_uploader || skill.creator || "",
          visibility: op?.visibility ?? (op?.hidden ? "hidden" : "online"),
          cornerTag: op?.corner_tag ?? "",
          sortWeight: op?.sort_weight ?? 0,
          originalUpdatedAt: op?.updated_at ?? 0,
          dirty: false,
        };
        items.push(item);
      }
      setLocalItems(items);
      setTotal(data.total ?? 0);
    } catch {
      if (sequence === requestSequenceRef.current)
        dedupedToast.error(t("skills.operation.loadError"));
    } finally {
      if (sequence === requestSequenceRef.current) setLoading(false);
    }
  }, [
    categoryFilter,
    page,
    serverSearchQuery,
    serverSubmitterFilter,
    sourceFilter,
    t,
    visibilityFilter,
  ]);
  reactExports.useEffect(() => {
    const query = searchQuery.trim();
    const submitter = submitterFilter.trim();
    if (query === serverSearchQuery && submitter === serverSubmitterFilter) return;
    const timer = window.setTimeout(() => {
      setPage(1);
      setServerSearchQuery(query);
      setServerSubmitterFilter(submitter);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery, submitterFilter, serverSearchQuery, serverSubmitterFilter]);
  reactExports.useEffect(() => {
    void fetchPage();
  }, [fetchPage]);
  const dirtyCount = reactExports.useMemo(
    () => localItems.filter((i) => i.dirty).length,
    [localItems],
  );
  const visibleItems = reactExports.useMemo(
    () => sortOperationItemsByCategory(localItems, categoryFilter),
    [categoryFilter, localItems],
  );
  const handleDragEnd = reactExports.useCallback(
    (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setLocalItems((prev) => {
        const visibleSkillNames = visibleItems.map((item) => item.skillName);
        return categoryFilter === "all"
          ? reorderGlobalSortWeights(prev, visibleSkillNames, String(active.id), String(over.id))
          : reorderCategoryWeights(
              prev,
              visibleSkillNames,
              String(active.id),
              String(over.id),
              categoryFilter,
            );
      });
    },
    [categoryFilter, visibleItems],
  );
  const handleToggleBadge = reactExports.useCallback((skillName, badge) => {
    setLocalItems((prev) =>
      prev.map((item) => {
        if (item.skillName !== skillName) return item;
        const badges = item.badges.includes(badge)
          ? item.badges.filter((b) => b !== badge)
          : [...item.badges, badge];
        return {
          ...item,
          badges,
          dirty: true,
        };
      }),
    );
  }, []);
  const handleToggleHidden = reactExports.useCallback((skillName) => {
    setLocalItems((prev) =>
      prev.map((item) =>
        item.skillName === skillName
          ? {
              ...item,
              hidden: !item.hidden,
              dirty: true,
            }
          : item,
      ),
    );
  }, []);
  const handleConfigChange = reactExports.useCallback((skillName, patch) => {
    setLocalItems((prev) =>
      prev.map((item) =>
        item.skillName === skillName
          ? {
              ...item,
              ...patch,
              hidden:
                patch.visibility !== void 0
                  ? patch.visibility !== "online"
                  : (patch.hidden ?? item.hidden),
              dirty: true,
            }
          : item,
      ),
    );
  }, []);
  const handleSaveConfirm = reactExports.useCallback(async () => {
    setConfirmOpen(false);
    setSaving(true);
    const req = {
      operations: changedOperationItems(localItems).map((item) => ({
        skill_name: item.skillName,
        badges: item.badges,
        sort_weight: item.sortWeight,
        source: item.source,
        categories: item.categories,
        category_weights: item.categoryWeights,
        display_uploader: item.displayUploader,
        visibility: item.visibility,
        corner_tag: item.cornerTag,
        hidden: item.hidden,
        expected_updated_at: item.originalUpdatedAt,
      })),
    };
    const result = await ops.batchSave(req);
    setSaving(false);
    if (result.success) {
      dedupedToast.success(t("skills.operation.batchSaveSuccess"));
      await fetchPage();
    } else if (result.conflicts.length > 0) {
      setConflicts(result.conflicts);
      setConflictOpen(true);
    } else {
      dedupedToast.error(t("skills.operation.saveError"));
    }
  }, [fetchPage, localItems, ops.batchSave, t]);
  const handleConflictReload = reactExports.useCallback(() => {
    setConflictOpen(false);
    void fetchPage();
  }, [fetchPage]);
  const handleExitRequest = reactExports.useCallback(() => {
    if (!onExit) return;
    if (dirtyCount > 0) {
      setExitConfirmOpen(true);
    } else {
      onExit();
    }
  }, [dirtyCount, onExit]);
  if (loading && localItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={16} strokeWidth={1.5} className="animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-foreground">
            {t("skills.operation.panelTitle")}
          </h3>
          {dirtyCount > 0 && (
            <span className="text-xs text-primary font-medium">
              {t("skills.operation.changesCount", {
                count: dirtyCount,
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            loading={saving}
            disabled={dirtyCount === 0}
            onClick={() => setConfirmOpen(true)}
          >
            {!saving && <Save size={12} strokeWidth={1.5} />}
            {t("skills.operation.saveChanges")}
          </Button>
          {onExit && (
            <Button variant="ghost" size="sm" onClick={handleExitRequest}>
              <X size={12} strokeWidth={1.5} />
              {t("skills.operation.exitButton")}
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-[minmax(220px,1fr)_minmax(160px,0.7fr)_160px_180px_180px] items-center gap-2">
        <label
          htmlFor="operations-published-search"
          className="flex min-w-0 flex-col gap-1 text-[11px] text-muted-foreground"
        >
          <span>{t("skills.operation.skillIdOrDisplayName")}</span>
          <Input
            id="operations-published-search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("skills.operation.publishedSearchPlaceholder")}
          />
        </label>
        <label
          htmlFor="operations-published-submitter"
          className="flex min-w-0 flex-col gap-1 text-[11px] text-muted-foreground"
        >
          <span>{t("skills.operation.submitter")}</span>
          <Input
            id="operations-published-submitter"
            value={submitterFilter}
            onChange={(event) => setSubmitterFilter(event.target.value)}
            placeholder={t("skills.operation.submitter")}
          />
        </label>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">
            {t("skills.operation.marketSection")}
          </span>
          <Select
            value={sourceFilter}
            onValueChange={(value) => {
              if (value) {
                setPage(1);
                setSourceFilter(value);
              }
            }}
          >
            <SelectTrigger aria-label={t("skills.operation.marketSection")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("skills.operation.allMarketSections")}</SelectItem>
              <SelectItem value="official-featured">
                {t("skills.market.officialFeatured")}
              </SelectItem>
              <SelectItem value="community">{t("skills.market.communityFeatured")}</SelectItem>
              <SelectItem value="official">{t("skills.market.otherSkills")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">
            {t("skills.operation.categories")}
          </span>
          <Select
            value={categoryFilter}
            onValueChange={(value) => {
              if (value) {
                setPage(1);
                setCategoryFilter(value);
              }
            }}
          >
            <SelectTrigger aria-label={t("skills.operation.categories")}>
              <SelectValue>
                {() =>
                  categoryFilter === "all"
                    ? t("skills.operation.allCategories")
                    : categoryLabels.get(categoryFilter) || categoryFilter
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("skills.operation.allCategories")}</SelectItem>
              {configuredCategories.map((category) => (
                <SelectItem key={category.category} value={category.category}>
                  {isZh ? category.cn_name : category.en_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">
            {t("skills.operation.publicationStatus")}
          </span>
          <Select
            value={visibilityFilter}
            onValueChange={(value) => {
              if (value) {
                setPage(1);
                setVisibilityFilter(value);
              }
            }}
          >
            <SelectTrigger aria-label={t("skills.operation.publicationStatus")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("skills.operation.allPublicationStatuses")}</SelectItem>
              <SelectItem value="online">{t("skills.operation.visibility.online")}</SelectItem>
              <SelectItem value="hidden">{t("skills.operation.visibility.hidden")}</SelectItem>
              <SelectItem value="offline">{t("skills.operation.visibility.offline")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-[auto_auto_minmax(180px,0.8fr)_minmax(220px,0.85fr)_100px_120px_100px_minmax(320px,1.35fr)_100px] items-center gap-x-4 gap-y-2 px-3 text-[11px] text-muted-foreground">
        <span />
        <span>#</span>
        <span>{t("skills.operation.publishedDisplayName")}</span>
        <span>{t("skills.operation.skillId")}</span>
        <span>{t("skills.operation.source")}</span>
        <span>{t("skills.operation.displayUploader")}</span>
        <span>{t("skills.operation.globalSortWeight")}</span>
        <span>
          {t("skills.operation.categories")}
          {" → "}
          {t("skills.operation.categorySortWeight")}
        </span>
        <span>{t("skills.operation.visibility")}</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={visibleItems.map((i) => i.skillName)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-1">
            {visibleItems.map((item, index) => {
              return (
                <OperationsListItem
                  key={item.skillName}
                  item={item}
                  categories={configuredCategories}
                  index={index}
                  dragEnabled={true}
                  isZh={isZh}
                  onToggleBadge={handleToggleBadge}
                  onToggleHidden={handleToggleHidden}
                  onConfigChange={handleConfigChange}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      {total > PUBLISHED_PAGE_SIZE && (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <Button
            variant="outline"
            size="icon-xs"
            disabled={page <= 1 || loading}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            <ChevronLeft size={14} strokeWidth={1.5} />
          </Button>
          <span>
            {page}
            {" / "}
            {Math.ceil(total / PUBLISHED_PAGE_SIZE)}
          </span>
          <Button
            variant="outline"
            size="icon-xs"
            disabled={page * PUBLISHED_PAGE_SIZE >= total || loading}
            onClick={() => setPage((value) => value + 1)}
          >
            <ChevronRight size={14} strokeWidth={1.5} />
          </Button>
        </div>
      )}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("skills.operation.confirmSaveTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("skills.operation.confirmSaveDesc", {
                count: dirtyCount,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveConfirm}>
              {t("skills.operation.save")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("skills.operation.conflictTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("skills.operation.conflictDesc", {
                skills: conflicts.join(", "),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleConflictReload}>
              {t("skills.operation.reload")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("skills.operation.exitConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("skills.operation.exitConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onExit}>
              {t("skills.operation.discardExit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
export function PublishedSubmissionList({ items, categories, onDetails }) {
  const { t, i18n } = useTranslation();
  const published = items.filter((item) => item.submission?.status === "published");
  if (published.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {t("skills.operation.noPublishedSubmissions")}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[1320px] table-fixed text-left text-xs">
        <colgroup>
          <col className="w-[180px]" />
          <col className="w-[180px]" />
          <col className="w-[200px]" />
          <col className="w-[140px]" />
          <col className="w-[150px]" />
          <col className="w-[150px]" />
          <col className="w-[150px]" />
          <col className="w-[140px]" />
          <col className="w-[100px]" />
          <col className="w-[140px]" />
        </colgroup>
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            {[
              "skillId",
              "skillDisplayName",
              "categories",
              "submitter",
              "uid",
              "updatedAt",
              "reviewer",
              "reviewType",
              "publicationStatus",
              "actions",
            ].map((column) => (
              <th key={column} className="whitespace-nowrap px-3 py-2 font-medium">
                {t(`skills.operation.${column}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {published.map((item) => {
            const submission = item.submission;
            if (!submission) return null;
            return (
              <tr key={submission.submission_id} className="border-b border-border last:border-b-0">
                <td className="truncate px-3 py-2 font-medium" title={submission.skill_name}>
                  {submission.skill_name}
                </td>
                <td className="truncate px-3 py-2" title={submission.display_name}>
                  {submission.display_name}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1 overflow-hidden">
                    {submission.categories
                      .map((code) => {
                        const category = categories.find(
                          (entry) => entry.tag_type === "category" && entry.category === code,
                        );
                        return category
                          ? i18n.language.startsWith("zh")
                            ? category.cn_name
                            : category.en_name
                          : code;
                      })
                      .slice(0, 3)
                      .map((name) => (
                        <Badge
                          key={`${submission.submission_id}-${name}`}
                          variant="outline"
                          className="h-5 shrink-0 px-1.5 text-[10px]"
                        >
                          {name}
                        </Badge>
                      ))}
                    {submission.categories.length === 0 && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
                <td
                  className="truncate px-3 py-2"
                  title={item.submitter_name || item.submitter_uid}
                >
                  {item.submitter_name || item.submitter_uid || "—"}
                </td>
                <td className="truncate px-3 py-2 text-muted-foreground">{item.submitter_uid}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                  {(submission.updated_at || submission.created_at) > 0
                    ? new Intl.DateTimeFormat(i18n.language, {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(submission.updated_at || submission.created_at))
                    : "—"}
                </td>
                <td className="truncate px-3 py-2" title={item.reviewer_name || item.reviewer_uid}>
                  {item.reviewer_name || item.reviewer_uid || "—"}
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant="default"
                    className="h-5 w-fit whitespace-nowrap px-1.5 text-[10px]"
                  >
                    {item.submission_type === "update"
                      ? t("skills.operation.reviewTypeUpdate")
                      : t("skills.operation.reviewTypeNew")}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant="secondary"
                    className="h-5 w-fit whitespace-nowrap px-1.5 text-[10px]"
                  >
                    {t("skills.operation.publishedStatus")}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Button
                    size="xs"
                    variant="outline"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => onDetails(item)}
                  >
                    {t("skills.operation.viewDetails")}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
export function SubmitterFilter({ name, uid, onSearch }) {
  const { t } = useTranslation();
  const [nameDraft, setNameDraft] = reactExports.useState(name);
  const [uidDraft, setUidDraft] = reactExports.useState(uid);
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(nameDraft.trim(), uidDraft.trim());
      }}
    >
      <Input
        className="w-56"
        value={nameDraft}
        onChange={(event) => setNameDraft(event.target.value)}
        placeholder={t("skills.operation.submitterNameFilter")}
        aria-label={t("skills.operation.submitterNameFilter")}
        data-action-ui-id="operations-submitter-name-filter"
      />
      <Input
        className="w-52"
        value={uidDraft}
        onChange={(event) => setUidDraft(event.target.value)}
        placeholder={t("skills.operation.submitterUid")}
        aria-label={t("skills.operation.submitterUid")}
        data-action-ui-id="operations-review-uid-filter"
      />
      <Button type="submit" variant="outline" size="sm">
        {t("common.search")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setNameDraft("");
          setUidDraft("");
          onSearch("", "");
        }}
      >
        {t("skills.operation.resetSubmitter")}
      </Button>
    </form>
  );
}
