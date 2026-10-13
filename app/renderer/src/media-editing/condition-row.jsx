// condition-row.jsx
import { CompositedSvg, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  operatorsForFieldType,
  OPS_REQUIRING_VALUE,
} from "./canvas-sticker-assets.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../generation/select-content.jsx";
const OP_LABELS = {
  equals: {
    key: "canvas.table.filter.equals",
    defaultLabel: "equals",
  },
  notEquals: {
    key: "canvas.table.filter.notEquals",
    defaultLabel: "not equals",
  },
  contains: {
    key: "canvas.table.filter.contains",
    defaultLabel: "contains",
  },
  notContains: {
    key: "canvas.table.filter.notContains",
    defaultLabel: "not contains",
  },
  gt: {
    key: "canvas.table.filter.gt",
    defaultLabel: "greater than",
  },
  gte: {
    key: "canvas.table.filter.gte",
    defaultLabel: "greater or equal",
  },
  lt: {
    key: "canvas.table.filter.lt",
    defaultLabel: "less than",
  },
  lte: {
    key: "canvas.table.filter.lte",
    defaultLabel: "less or equal",
  },
  empty: {
    key: "canvas.table.filter.empty",
    defaultLabel: "is empty",
  },
  notEmpty: {
    key: "canvas.table.filter.notEmpty",
    defaultLabel: "not empty",
  },
};
function CloseSmallIcon() {
  return (
    <CompositedSvg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" strokeLinecap="round" />
    </CompositedSvg>
  );
}
export function ConditionRow({
  condition,
  columns,
  onColumnChange,
  onOpChange,
  onValueChange,
  onRemove,
}) {
  const { t } = useTranslation();
  const column = columns.find((column) => column.id === condition.columnId);
  const availableOps = column ? operatorsForFieldType(column.type) : [];
  const needsValue = OPS_REQUIRING_VALUE.has(condition.op);
  const columnLabels = reactExports.useMemo(() => {
    const map = {};
    for (const column of columns) map[column.id] = column.title;
    return map;
  }, [columns]);
  const opLabels = reactExports.useMemo(
    () =>
      Object.fromEntries(
        availableOps.map((operator) => [
          operator,
          t(OP_LABELS[operator].key, OP_LABELS[operator].defaultLabel),
        ]),
      ),
    [availableOps, t],
  );
  return (
    <div className="flex items-center gap-2">
      <Select
        value={condition.columnId}
        items={columnLabels}
        onValueChange={(selectedColumnId) => {
          if (selectedColumnId != null) onColumnChange(selectedColumnId);
        }}
      >
        <SelectTrigger className="h-8 w-[110px] text-[12px]">
          <SelectValue placeholder={t("canvas.table.filter.field", "Field")} />
        </SelectTrigger>
        <SelectContent>
          {columns.map((column) => (
            <SelectItem key={column.id} value={column.id}>
              {column.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={condition.op}
        items={opLabels}
        onValueChange={(selectedOperator) => {
          if (selectedOperator != null) onOpChange(selectedOperator);
        }}
      >
        <SelectTrigger className="h-8 w-[120px] text-[12px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableOps.map((operator) => (
            <SelectItem key={operator} value={operator}>
              {t(OP_LABELS[operator].key, OP_LABELS[operator].defaultLabel)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {needsValue ? (
        <input
          type={column?.type === "number" ? "number" : "text"}
          value={condition.value === void 0 ? "" : String(condition.value)}
          onChange={(inputEvent) =>
            onValueChange(inputEvent.target.value, column?.type ?? "text")
          }
          placeholder={t(
            "canvas.table.filter.valuePlaceholder",
            "Enter value",
          )}
          className="h-8 flex-1 rounded-md border border-input bg-transparent px-2.5 text-[12px] outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
        />
      ) : (
        <div className="flex-1" />
      )}
      <button
        type="button"
        onClick={onRemove}
        title={t("canvas.table.filter.removeCondition", "Remove condition")}
        aria-label={t(
          "canvas.table.filter.removeCondition",
          "Remove condition",
        )}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--canvas-controls-hover,#0000000d)] hover:text-foreground"
      >
        <CloseSmallIcon />
      </button>
    </div>
  );
}
