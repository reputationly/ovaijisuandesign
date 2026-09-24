import path from "node:path";

import type { RecentWorkspace } from "./global-store.js";

/**
 * 打开工作区时更新"最近项目"。首页默认按手动顺序排（manualOrder），所以已在列表里的
 * 只刷新打开时间、**不挪位置**（否则用户拖好的顺序每打开一次就乱一次）；新的放最前。
 * 同一路径的重复项合并，保留先出现那条上的显示名和封面。
 */
export function recordRecentOpen(list: RecentWorkspace[], folderPath: string, openedAt: number): RecentWorkspace[] {
  const target = path.resolve(folderPath);
  const ordered = [...list]
    .filter((r) => r && typeof r.path === "string" && r.path)
    .sort((a, b) => (a.manualOrder ?? Number.MAX_SAFE_INTEGER) - (b.manualOrder ?? Number.MAX_SAFE_INTEGER));
  const out: RecentWorkspace[] = [];
  const seen = new Map<string, number>();
  for (const r of ordered) {
    const key = path.resolve(r.path);
    const at = seen.get(key);
    if (at !== undefined) {
      const kept = out[at]!;
      out[at] = { ...kept, displayName: kept.displayName ?? r.displayName, coverImage: kept.coverImage ?? r.coverImage };
      if (out[at]!.displayName === undefined) delete out[at]!.displayName;
      if (out[at]!.coverImage === undefined) delete out[at]!.coverImage;
      continue;
    }
    seen.set(key, out.length);
    out.push({ ...r });
  }
  const idx = seen.get(target);
  if (idx === undefined) out.unshift({ path: target, openedAt });
  else out[idx] = { ...out[idx]!, openedAt };
  return out.map((r, manualOrder) => ({ ...r, manualOrder }));
}
