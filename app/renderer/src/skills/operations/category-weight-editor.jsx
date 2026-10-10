// 运营后台的分类权重编辑器与列表条目。
import { useTranslation, Plus, useSortable, CSS$1 as CSS, GripVertical } from "../../vendor.js";
import { Switch } from "../../generation/select-content.jsx";
import { Trash2 } from "../../media-editing/package.jsx";
import { Button } from "../../infra/dialog-content.jsx";
import { Select } from "../../assets/credit-query-keys.jsx";
import { SelectTrigger, SelectValue, SelectContent, SelectItem, Input3 as Input } from "../../infra/select-content.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
function CategoryWeightEditor({
  categories,
  value,
  isZh,
  onChange,
  maxItems = 3,
  inheritWeights = false,
}) {
  const { t } = useTranslation();
  const entries = Object.entries(value);
  const selectedCodes = new Set(entries.map(([code]) => code));
  const available = categories.filter((category) => !selectedCodes.has(category.category));
  const categoryLabels = new Map(
    categories.map((category) => [category.category, isZh ? category.cn_name : category.en_name]),
  );
  const handleCategoryChange = (previousCode, nextCode) => {
    if (!nextCode || nextCode === previousCode || selectedCodes.has(nextCode)) return;
    const next = {
      ...value,
    };
    const weight = next[previousCode] ?? 0;
    delete next[previousCode];
    next[nextCode] = weight;
    onChange(next);
  };
  const handleAdd = () => {
    const nextCategory = available[0];
    if (!nextCategory || entries.length >= maxItems) return;
    onChange({
      ...value,
      [nextCategory.category]: 0,
    });
  };
  const handleRemove = (code) => {
    const next = {
      ...value,
    };
    delete next[code];
    onChange(next);
  };
  return (
    <div className="flex min-w-0 flex-col items-start gap-1.5">
      {entries.map(([code, weight]) => (
        <div
          key={code}
          className="grid max-w-full grid-cols-[minmax(120px,160px)_88px_auto] items-center gap-1.5"
        >
          <Select
            value={code}
            onValueChange={(nextCode) => nextCode && handleCategoryChange(code, nextCode)}
          >
            <SelectTrigger className="h-7 min-w-0 text-[10px]">
              <SelectValue>{categoryLabels.get(code) ?? code}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem
                  key={category.category}
                  value={category.category}
                  disabled={category.category !== code && selectedCodes.has(category.category)}
                >
                  {isZh ? category.cn_name : category.en_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {inheritWeights ? (
            <span className="text-xs text-muted-foreground">
              {t("skills.operation.inheritWeight")}
            </span>
          ) : (
            <Input
              type="number"
              className="h-7 text-[10px]"
              value={weight}
              onChange={(event) =>
                onChange({
                  ...value,
                  [code]: Number(event.target.value) || 0,
                })
              }
              aria-label={t("skills.operation.sortWeight")}
            />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => handleRemove(code)}
            title={t("skills.operation.delete")}
          >
            <Trash2 size={12} strokeWidth={1.5} />
          </Button>
        </div>
      ))}
      {entries.length < maxItems && available.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="w-[254px] max-w-full border-dashed"
          onClick={handleAdd}
        >
          <Plus size={12} strokeWidth={1.5} />
          {t("skills.operation.add")}
        </Button>
      )}
    </div>
  );
}
export function OperationsListItem({
  item,
  index,
  dragEnabled,
  isZh,
  categories,
  onToggleBadge,
  onToggleHidden,
  onConfigChange,
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.skillName,
    disabled: !dragEnabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const displayName = isZh ? item.displayNameZh || item.displayName : item.displayName;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid grid-cols-[auto_auto_minmax(180px,0.8fr)_minmax(220px,0.85fr)_100px_120px_100px_minmax(320px,1.35fr)_100px] items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card px-3 py-2 ${item.dirty ? "ring-1 ring-primary/30" : ""}`}
    >
      <button
        type="button"
        data-action-ui-id={`operations-published-drag-${item.skillName}`}
        className={`text-muted-foreground touch-none ${dragEnabled ? "cursor-grab active:cursor-grabbing hover:text-foreground" : "cursor-default opacity-30"}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} strokeWidth={1.5} />
      </button>
      <span className="text-xs text-muted-foreground w-6 text-right tabular-nums shrink-0">
        {index + 1}
      </span>
      <span
        className="select-text cursor-text text-xs font-medium text-foreground truncate min-w-0 flex-1"
        data-text-selectable="true"
        title={displayName}
      >
        {displayName}
      </span>
      <span
        className="select-text cursor-text text-xs text-muted-foreground truncate min-w-0"
        data-text-selectable="true"
        title={item.skillName}
      >
        {item.skillName}
      </span>
      <Select
        value={item.source}
        onValueChange={(value) =>
          value &&
          onConfigChange(item.skillName, {
            source: value,
          })
        }
      >
        <SelectTrigger className="h-7 text-[10px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="official">{t("skills.operation.official")}</SelectItem>
          <SelectItem value="user">{t("skills.operation.user")}</SelectItem>
        </SelectContent>
      </Select>
      <Input
        className="h-7 text-[10px]"
        value={item.displayUploader}
        onChange={(event) =>
          onConfigChange(item.skillName, {
            displayUploader: event.target.value,
          })
        }
        placeholder={t("skills.operation.displayUploader")}
      />
      <Input
        type="number"
        className="h-7 text-[10px] tabular-nums"
        value={item.sortWeight}
        aria-label={t("skills.operation.globalSortWeight")}
        data-action-ui-id={`operations-published-global-sort-weight-${item.skillName}`}
        onChange={(event) =>
          onConfigChange(item.skillName, {
            sortWeight: Number(event.target.value) || 0,
          })
        }
      />
      <CategoryWeightEditor
        categories={categories}
        value={item.categoryWeights}
        isZh={isZh}
        onChange={(categoryWeights) =>
          onConfigChange(item.skillName, {
            categories: Object.keys(categoryWeights),
            categoryWeights,
          })
        }
      />
      <Select
        value={item.visibility}
        onValueChange={(value) =>
          onConfigChange(item.skillName, {
            visibility: value,
          })
        }
      >
        <SelectTrigger className="h-7 text-[10px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="online">{t("skills.operation.visibility.online")}</SelectItem>
          <SelectItem value="hidden">{t("skills.operation.visibility.hidden")}</SelectItem>
          <SelectItem value="offline">{t("skills.operation.visibility.offline")}</SelectItem>
        </SelectContent>
      </Select>
      <div className="hidden items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-muted-foreground">
          {t("skills.badge.silent-install")}
        </span>
        <Switch
          checked={item.badges.includes("silent-install")}
          onCheckedChange={() => onToggleBadge(item.skillName, "silent-install")}
        />
      </div>
      <div className="hidden items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-muted-foreground">{t("skills.operation.hidden")}</span>
        <Switch checked={item.hidden} onCheckedChange={() => onToggleHidden(item.skillName)} />
      </div>
    </div>
  );
}
