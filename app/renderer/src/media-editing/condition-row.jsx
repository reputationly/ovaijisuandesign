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
  onRemove: onRemove2,
}) {
  const { t: t2 } = useTranslation();
  const column = columns.find((c3) => c3.id === condition.columnId);
  const availableOps = column ? operatorsForFieldType(column.type) : [];
  const needsValue = OPS_REQUIRING_VALUE.has(condition.op);
  const columnLabels = reactExports.useMemo(() => {
    const map3 = {};
    for (const c3 of columns) map3[c3.id] = c3.title;
    return map3;
  }, [columns]);
  const opLabels = reactExports.useMemo(
    () =>
      Object.fromEntries(
        availableOps.map((op) => [
          op,
          t2(OP_LABELS[op].key, OP_LABELS[op].defaultLabel),
        ]),
      ),
    [availableOps, t2],
  );
  return (
    <div className="flex items-center gap-2">
      <Select
        value={condition.columnId}
        items={columnLabels}
        onValueChange={(v2) => {
          if (v2 != null) onColumnChange(v2);
        }}
      >
        <SelectTrigger className="h-8 w-[110px] text-[12px]">
          <SelectValue placeholder={t2("canvas.table.filter.field", "Field")} />
        </SelectTrigger>
        <SelectContent>
          {columns.map((c3) => (
            <SelectItem key={c3.id} value={c3.id}>
              {c3.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={condition.op}
        items={opLabels}
        onValueChange={(v2) => {
          if (v2 != null) onOpChange(v2);
        }}
      >
        <SelectTrigger className="h-8 w-[120px] text-[12px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableOps.map((op) => (
            <SelectItem key={op} value={op}>
              {t2(OP_LABELS[op].key, OP_LABELS[op].defaultLabel)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {needsValue ? (
        <input
          type={column?.type === "number" ? "number" : "text"}
          value={condition.value === void 0 ? "" : String(condition.value)}
          onChange={(e2) =>
            onValueChange(e2.target.value, column?.type ?? "text")
          }
          placeholder={t2(
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
        onClick={onRemove2}
        title={t2("canvas.table.filter.removeCondition", "Remove condition")}
        aria-label={t2(
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
