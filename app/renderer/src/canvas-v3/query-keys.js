/**
 * v3 工作台的 React Query 键 —— 从产物主包逐字取回（第 78 轮）。
 *
 * 键的形状是 `["project-v3", scopeKey, domain, …]`；`workbenchQueryKeys` 是根，
 * 各 domain 在此之上叠加自己的段。
 */
export const workbenchQueryKeys = {
  all: (scopeKey) => ["project-v3", scopeKey],
  matches: (key, scopeKey) => key[0] === "project-v3" && key[1] === scopeKey,
};

export function isDomain(key, domain) {
  return key[0] === "project-v3" && key[2] === domain;
}

export const resourceQueryKeys = {
  all: (scopeKey) => [...workbenchQueryKeys.all(scopeKey), "resources"],
  search: (scopeKey, query) => [...resourceQueryKeys.all(scopeKey), "search", query],
  details: (scopeKey, selectors) => [...resourceQueryKeys.all(scopeKey), "details", selectors],
  versions: (scopeKey, query) => [...resourceQueryKeys.all(scopeKey), "versions", query],
  matches: (key) => isDomain(key, "resources"),
};
