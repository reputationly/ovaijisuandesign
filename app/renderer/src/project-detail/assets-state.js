// 资产列表的排序、选择与批量操作状态。
import reactExports from "react";
const DEFAULT_SORT = {
  by: "updated",
  dir: "desc",
};
export function useAssetsListState() {
  const [search, setSearch] = reactExports.useState("");
  const [activeBuckets, setActiveBuckets] = reactExports.useState(void 0);
  const [sort, setSort] = reactExports.useState(DEFAULT_SORT);
  const [selection, setSelection] = reactExports.useState(new Set());
  const [lastAnchor, setLastAnchor] = reactExports.useState(null);
  const toggleBucket = reactExports.useCallback((bucket) => {
    setActiveBuckets((current) => {
      const next = new Set(current ?? []);
      if (next.has(bucket)) next.delete(bucket);
      else next.add(bucket);
      return next.size === 0 ? void 0 : next;
    });
  }, []);
  const clearBuckets = reactExports.useCallback(() => setActiveBuckets(void 0), []);
  const toggleSort = reactExports.useCallback((sortField) => {
    setSort((current) => {
      if (current.by !== sortField) {
        return {
          by: sortField,
          dir: sortField === "name" || sortField === "type" ? "asc" : "desc",
        };
      }
      return {
        by: sortField,
        dir: current.dir === "asc" ? "desc" : "asc",
      };
    });
  }, []);
  const toggle = reactExports.useCallback((key) => {
    setSelection((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setLastAnchor(key);
  }, []);
  const selectOnly = reactExports.useCallback((key) => {
    setSelection(new Set([key]));
    setLastAnchor(key);
  }, []);
  const toggleRange = reactExports.useCallback(
    (allKeys, targetKey) => {
      const anchor = lastAnchor;
      if (!anchor || anchor === targetKey) {
        toggle(targetKey);
        return;
      }
      const anchorIndex = allKeys.indexOf(anchor);
      const targetIndex = allKeys.indexOf(targetKey);
      if (anchorIndex === -1 || targetIndex === -1) {
        toggle(targetKey);
        return;
      }
      const [from, to] = anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
      setSelection((current) => {
        const next = new Set(current);
        for (let i = from; i <= to; i += 1) {
          const key = allKeys[i];
          if (key !== void 0) next.add(key);
        }
        return next;
      });
    },
    [lastAnchor, toggle],
  );
  const toggleAll = reactExports.useCallback((allKeys, options) => {
    setSelection((current) => {
      const allSelected = allKeys.every((key) => current.has(key));
      if (!options?.preserveOtherSelection) {
        return allSelected && current.size === allKeys.length ? new Set() : new Set(allKeys);
      }
      const next = new Set(current);
      if (allSelected) {
        for (const key of allKeys) next.delete(key);
      } else {
        for (const key of allKeys) next.add(key);
      }
      return next;
    });
  }, []);
  const clearSelection = reactExports.useCallback(() => {
    setSelection(new Set());
    setLastAnchor(null);
  }, []);
  return reactExports.useMemo(
    () => ({
      search,
      setSearch,
      activeBuckets,
      toggleBucket,
      clearBuckets,
      sort,
      setSort,
      toggleSort,
      selection,
      hasSelection: selection.size > 0,
      toggle,
      selectOnly,
      toggleRange,
      toggleAll,
      clearSelection,
    }),
    [
      search,
      activeBuckets,
      toggleBucket,
      clearBuckets,
      sort,
      toggleSort,
      selection,
      toggle,
      selectOnly,
      toggleRange,
      toggleAll,
      clearSelection,
    ],
  );
}
export function selectionTargetsForAction(clicked, candidates, selection, keyOf) {
  const clickedKey = keyOf(clicked);
  if (!selection.has(clickedKey)) return [clicked];
  const selected = candidates.filter((item) => selection.has(keyOf(item)));
  return selected.length > 0 ? selected : [clicked];
}
export function fileKeysForSelection(items, keyOf) {
  return items.filter((item) => item.kind === "file").map(keyOf);
}
