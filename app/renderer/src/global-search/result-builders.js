// 全局搜索结果的组装与打分：项目、会话、固定入口、推荐与最近记录、本地结果。
import { ap as withThumbnail, aq as gatewayUrlFromBase, m as API_PATHS } from "../main.jsx";
import { CATEGORY_WEIGHT, HUB_PROJECT_RESULT_LIMIT } from "./constants.js";
import { STATIC_RESULTS } from "./static-results.js";
function normalize(value) {
  return value.trim().toLowerCase();
}
function folderNameFromPath(path) {
  const clean = path.replace(/[/\\]+$/, "");
  return clean.split(/[/\\]/).pop() || path;
}
export function readTime(value) {
  if (!value || typeof value !== "object") return void 0;
  const row = value;
  const candidate = row.mtimeMs ?? row.mtime_ms ?? row.mtime ?? row.updatedAt ?? row.updated_at;
  return typeof candidate === "string" || typeof candidate === "number" ? candidate : void 0;
}
function assetIdFromCanvasNodeId(nodeId) {
  return nodeId.split("~")[0] ?? nodeId;
}
export function buildFileThumbnailUrl(workspace, item) {
  if (item.kind === "image") {
    return withThumbnail(
      gatewayUrlFromBase(
        workspace.gatewayUrl,
        API_PATHS.serveFile(item.path),
        workspace.gatewayBinding ?? workspace.workspaceClaim,
      ),
      40,
    );
  }
  if (item.kind === "video") {
    return withThumbnail(
      gatewayUrlFromBase(
        workspace.gatewayUrl,
        API_PATHS.thumbnail(item.path),
        workspace.gatewayBinding ?? workspace.workspaceClaim,
      ),
      40,
    );
  }
  return void 0;
}
export function buildCanvasThumbnailUrl(workspace, match) {
  if (match.type !== "image") return void 0;
  const assetId = assetIdFromCanvasNodeId(match.id);
  if (!assetId) return void 0;
  return withThumbnail(
    gatewayUrlFromBase(
      workspace.gatewayUrl,
      API_PATHS.serveFileById(assetId),
      workspace.gatewayBinding ?? workspace.workspaceClaim,
    ),
    40,
  );
}
function scoreText(fields, query) {
  const q = normalize(query);
  if (!q) return null;
  let best = 0;
  for (const field of fields) {
    const text = normalize(field);
    if (!text) continue;
    if (text === q) best = Math.max(best, 100);
    else if (text.startsWith(q)) best = Math.max(best, 82);
    else if (text.includes(q)) best = Math.max(best, 58);
  }
  return best > 0 ? best : null;
}
export function withScore(result, score) {
  return {
    ...result,
    score: score + CATEGORY_WEIGHT[result.category] + (result.workspaceId ? 2 : 0),
  };
}
export function sortResults(results) {
  return [...results].sort((a, b) => {
    const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    const timeA = a.time ? new Date(a.time).getTime() || Number(a.time) || 0 : 0;
    const timeB = b.time ? new Date(b.time).getTime() || Number(b.time) || 0 : 0;
    return timeB - timeA;
  });
}
function buildProjectResults(query, workspaces, recentWorkspaces, currentWorkspaceId) {
  const openedByPath = new Map(workspaces.map((w) => [w.folderPath, w.workspaceId]));
  const merged = new Map();
  for (const recent of recentWorkspaces) {
    merged.set(recent.folderPath, {
      ...recent,
      workspaceId: recent.workspaceId ?? openedByPath.get(recent.folderPath),
    });
  }
  for (const workspace of workspaces) {
    if (merged.has(workspace.folderPath)) continue;
    merged.set(workspace.folderPath, {
      workspaceId: workspace.workspaceId,
      workspaceName: workspace.workspaceName,
      folderPath: workspace.folderPath,
      openedAt: Date.now(),
    });
  }
  const projectResults = Array.from(merged.values())
    .map((workspace) => {
      const score = scoreText(
        [workspace.workspaceName, workspace.folderPath, folderNameFromPath(workspace.folderPath)],
        query,
      );
      if (score === null) return null;
      const currentBoost =
        workspace.workspaceId && workspace.workspaceId === currentWorkspaceId ? 28 : 0;
      return withScore(
        {
          id: `project:${workspace.folderPath}`,
          category: "project",
          workspaceId: workspace.workspaceId,
          workspaceName: workspace.workspaceName,
          workspacePath: workspace.folderPath,
          title: workspace.workspaceName,
          subtitle: workspace.folderPath,
          badgeKey: workspace.workspaceId
            ? "globalSearch.badge.opened"
            : "globalSearch.badge.recent",
          badge: workspace.workspaceId ? "Opened" : "Recent",
          time: workspace.openedAt,
          action: {
            type: "project",
            workspaceId: workspace.workspaceId,
            folderPath: workspace.folderPath,
          },
          data: workspace,
        },
        score + currentBoost,
      );
    })
    .filter((result) => result !== null);
  return sortResults(projectResults).slice(0, 12);
}
export function buildHubProjectResults(query, projects) {
  const normalizedQuery = query.trim();
  const results = [];
  for (const project of projects) {
    const score = normalizedQuery ? scoreText([project.name], normalizedQuery) : 1;
    if (score === null) continue;
    results.push(
      withScore(
        {
          id: `hub-project:${project.id}`,
          category: "hubProject",
          title: project.name,
          time: project.updatedAt,
          action: {
            type: "open-project",
            projectId: project.id,
          },
          data: project,
        },
        score,
      ),
    );
    if (results.length === HUB_PROJECT_RESULT_LIMIT) break;
  }
  return results;
}
function buildSessionResults(query, workspaces, currentWorkspaceId) {
  return workspaces
    .flatMap((workspace) =>
      workspace.sessions.map((session) => {
        const score = scoreText(
          [session.name, session.folder ?? "", workspace.workspaceName],
          query,
        );
        if (score === null) return null;
        const currentBoost = workspace.workspaceId === currentWorkspaceId ? 32 : 0;
        return withScore(
          {
            id: `session:${workspace.workspaceId}:${session.id}`,
            category: "session",
            workspaceId: workspace.workspaceId,
            workspaceName: workspace.workspaceName,
            workspacePath: workspace.folderPath,
            title: session.name,
            subtitle: session.folder,
            meta: `${workspace.workspaceName} · ${session.messageCount} messages`,
            time: session.createdAt,
            data: session,
          },
          score + currentBoost,
        );
      }),
    )
    .filter((result) => result !== null)
    .slice(0, 20);
}
function buildStaticResults(query, currentWorkspaceId) {
  return STATIC_RESULTS.map((item) => {
    if (item.requiresWorkspace && !currentWorkspaceId) return null;
    const score = scoreText([item.title, item.subtitle, ...item.keywords], query);
    if (score === null) return null;
    return withScore(
      {
        id: item.id,
        category: item.category,
        title: item.title,
        titleKey: item.titleKey,
        subtitle: item.subtitle,
        subtitleKey: item.subtitleKey,
        keywords: item.keywords,
        action: item.action,
      },
      score + (item.preferred ? 16 : 0),
    );
  }).filter((result) => result !== null);
}
export function buildRecommendedSearchResults(currentWorkspaceId) {
  return STATIC_RESULTS.filter((item) => item.preferred)
    .filter((item) => !item.requiresWorkspace || currentWorkspaceId)
    .map((item, index) => ({
      id: item.id,
      category: item.category,
      title: item.title,
      titleKey: item.titleKey,
      subtitle: item.subtitle,
      subtitleKey: item.subtitleKey,
      keywords: item.keywords,
      action: item.action,
      score: 100 - index,
    }));
}
export function buildRecentSearchResults(workspaces, recentWorkspaces) {
  const openedByPath = new Map(workspaces.map((w) => [w.folderPath, w]));
  const recentProjects = recentWorkspaces
    .slice()
    .sort((a, b) => b.openedAt - a.openedAt)
    .slice(0, 3)
    .map((workspace) => {
      const opened = openedByPath.get(workspace.folderPath);
      return {
        id: `recent-project:${workspace.folderPath}`,
        category: "project",
        workspaceId: opened?.workspaceId ?? workspace.workspaceId,
        workspaceName: opened?.workspaceName ?? workspace.workspaceName,
        workspacePath: workspace.folderPath,
        title: opened?.workspaceName ?? workspace.workspaceName,
        subtitle: workspace.folderPath,
        badgeKey: opened ? "globalSearch.badge.opened" : "globalSearch.badge.recent",
        badge: opened ? "Opened" : "Recent",
        time: workspace.openedAt,
        action: {
          type: "project",
          workspaceId: opened?.workspaceId ?? workspace.workspaceId,
          folderPath: workspace.folderPath,
        },
        data: workspace,
      };
    });
  const recentSessions = workspaces
    .flatMap((workspace) =>
      workspace.sessions.map((session) => ({
        id: `recent-session:${workspace.workspaceId}:${session.id}`,
        category: "session",
        workspaceId: workspace.workspaceId,
        workspaceName: workspace.workspaceName,
        workspacePath: workspace.folderPath,
        title: session.name,
        subtitle: workspace.workspaceName,
        meta: `${session.messageCount} messages`,
        time: session.createdAt,
        data: session,
      })),
    )
    .sort((a, b) => {
      const timeA = a.time ? new Date(a.time).getTime() || 0 : 0;
      const timeB = b.time ? new Date(b.time).getTime() || 0 : 0;
      return timeB - timeA;
    })
    .slice(0, Math.max(0, 4 - recentProjects.length));
  return [...recentProjects, ...recentSessions];
}
export function buildLocalResults(
  query,
  workspaces,
  recentWorkspaces,
  projects,
  currentWorkspaceId,
) {
  return sortResults([
    ...buildHubProjectResults(query, projects),
    ...buildProjectResults(query, workspaces, recentWorkspaces, currentWorkspaceId),
    ...buildSessionResults(query, workspaces, currentWorkspaceId),
    ...buildStaticResults(query, currentWorkspaceId),
  ]);
}
export function readArrayField(value, key) {
  if (!value || typeof value !== "object") return [];
  const row = value;
  return Array.isArray(row[key]) ? row[key] : [];
}
