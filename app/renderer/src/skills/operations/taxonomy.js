// 运营后台的分类与权重计算：分类整理、拖拽重排、变更项筛选，纯函数。
export function resolveConfiguredCategories(skillCategories, operationCategories) {
  return operationCategories?.length ? operationCategories : skillCategories;
}
export function normalizeCategoryWeights(categories, legacyWeight, weights) {
  return Object.fromEntries(
    categories.map((category) => [
      category,
      Number.isFinite(weights?.[category]) ? Number(weights?.[category]) : legacyWeight,
    ]),
  );
}
export function taxonomyItemKey(item) {
  return `${item.tag_type}:${item.category}`;
}
export function createTaxonomyOrderMap(items) {
  return new Map(items.map((item) => [taxonomyItemKey(item), item.sort_order]));
}
export function taxonomyItemsForConfiguration(items, tagType) {
  return items.filter((item) => item.tag_type === tagType);
}
export function hasDuplicateEnabledTaxonomyOrders(items, orders) {
  const seen = new Set();
  for (const item of items) {
    if (item.enabled === false) continue;
    const orderKey = `${item.tag_type}:${orders.get(taxonomyItemKey(item)) ?? 1e3}`;
    if (seen.has(orderKey)) return true;
    seen.add(orderKey);
  }
  return false;
}
function calculateReorderedWeights(
  items,
  visibleSkillNames,
  activeSkillName,
  overSkillName,
  getSkillName,
  getWeight,
) {
  const oldIndex = visibleSkillNames.indexOf(activeSkillName);
  const newIndex = visibleSkillNames.indexOf(overSkillName);
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return new Map();
  const reorderedNames = [...visibleSkillNames];
  const [movedName] = reorderedNames.splice(oldIndex, 1);
  reorderedNames.splice(newIndex, 0, movedName);
  const itemByName = new Map(items.map((item) => [getSkillName(item), item]));
  const upperName = reorderedNames[newIndex - 1];
  const lowerName = reorderedNames[newIndex + 1];
  const upperItem = upperName ? itemByName.get(upperName) : void 0;
  const lowerItem = lowerName ? itemByName.get(lowerName) : void 0;
  const upperWeight = upperItem ? getWeight(upperItem) : void 0;
  const lowerWeight = lowerItem ? getWeight(lowerItem) : void 0;
  const changedWeights = new Map();
  if (upperWeight === void 0 && lowerWeight === void 0) return changedWeights;
  if (upperWeight === void 0) {
    changedWeights.set(activeSkillName, (lowerWeight ?? 0) + 10);
  } else if (lowerWeight === void 0) {
    changedWeights.set(activeSkillName, upperWeight - 10);
  } else if (upperWeight - lowerWeight > 1) {
    changedWeights.set(activeSkillName, Math.floor((upperWeight + lowerWeight) / 2));
  } else {
    const shift = lowerWeight - upperWeight + 2;
    const upperNames = reorderedNames.slice(0, newIndex);
    const lowerNames = reorderedNames.slice(newIndex + 1);
    if (upperNames.length <= lowerNames.length) {
      for (const skillName of upperNames) {
        const item = itemByName.get(skillName);
        if (item) changedWeights.set(skillName, getWeight(item) + shift);
      }
      changedWeights.set(activeSkillName, lowerWeight + 1);
    } else {
      changedWeights.set(activeSkillName, upperWeight - 1);
      for (const skillName of lowerNames) {
        const item = itemByName.get(skillName);
        if (item) changedWeights.set(skillName, getWeight(item) - shift);
      }
    }
  }
  return changedWeights;
}
export function reorderCategoryWeights(
  items,
  visibleSkillNames,
  activeSkillName,
  overSkillName,
  category,
) {
  const changedWeights = calculateReorderedWeights(
    items,
    visibleSkillNames,
    activeSkillName,
    overSkillName,
    (item) => item.skillName,
    (item) => item.categoryWeights[category] ?? 0,
  );
  return items.map((item) => {
    const nextWeight = changedWeights.get(item.skillName);
    if (nextWeight === void 0 || item.categoryWeights[category] === nextWeight) {
      return item;
    }
    return {
      ...item,
      categoryWeights: {
        ...item.categoryWeights,
        [category]: nextWeight,
      },
      dirty: true,
    };
  });
}
export function reorderGlobalSortWeights(items, visibleSkillNames, activeSkillName, overSkillName) {
  const changedWeights = calculateReorderedWeights(
    items,
    visibleSkillNames,
    activeSkillName,
    overSkillName,
    (item) => item.skillName,
    (item) => item.sortWeight,
  );
  return items.map((item) => {
    const nextWeight = changedWeights.get(item.skillName);
    if (nextWeight === void 0 || item.sortWeight === nextWeight) return item;
    return {
      ...item,
      sortWeight: nextWeight,
      dirty: true,
    };
  });
}
export function sortOperationItemsByCategory(items, category) {
  if (category === "all") return [...items].sort((a, b) => b.sortWeight - a.sortWeight);
  return [...items].sort(
    (a, b) => (b.categoryWeights[category] ?? 0) - (a.categoryWeights[category] ?? 0),
  );
}
export function changedOperationItems(items) {
  return items.filter((item) => item.dirty);
}
