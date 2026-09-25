import { e as createLucideIcon, r as reactExports, aC as gatewayFetchFromBase, aD as withThumbnail, aE as gatewayUrlFromBase, m as API_PATHS, h as useTranslation, aF as useIsScrolling, t as trackEvent, T as TRACK_EVENTS, j as jsxRuntimeExports, aG as Dialog, aH as DialogContent, U as Icon, V as Search, au as cn, S as PageStateBoundary, aI as KbdGroup, aJ as Kbd, aK as Play, aL as BookOpen, aM as PluginIcon, aN as SkillIcon, aO as LayoutGrid, aP as File, aQ as MessageSquare, aR as Folder, aS as FolderOpen, Z as useWorkspaceThumbnails, aT as Brain, aU as Settings, aV as FolderPlus, aW as MessageSquarePlus, aX as Music, aY as FileText, aZ as Video, a_ as ImageOutlineIcon } from "./index-C4qF1HE0.js";
/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Command = createLucideIcon("Command", [
  [
    "path",
    { d: "M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3", key: "11bfej" }
  ]
]);
/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const PackageSearch = createLucideIcon("PackageSearch", [
  [
    "path",
    {
      d: "M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14",
      key: "e7tb2h"
    }
  ],
  ["path", { d: "m7.5 4.27 9 5.15", key: "1c824w" }],
  ["polyline", { points: "3.29 7 12 12 20.71 7", key: "ousv84" }],
  ["line", { x1: "12", x2: "12", y1: "22", y2: "12", key: "a4e8g8" }],
  ["circle", { cx: "18.5", cy: "15.5", r: "2.5", key: "b5zd12" }],
  ["path", { d: "M20.27 17.27 22 19", key: "1l4muz" }]
]);
const DEBOUNCE_MS = 200;
const HUB_PROJECT_RESULT_LIMIT = 20;
const CATEGORY_WEIGHT = {
  project: 80,
  hubProject: 84,
  session: 76,
  file: 72,
  canvas: 68,
  skill: 60,
  plugin: 58,
  command: 54,
  help: 44
};
const STATIC_RESULTS = [
  {
    id: "command:new-session",
    category: "command",
    titleKey: "globalSearch.actions.newSession.title",
    title: "New Session",
    subtitleKey: "globalSearch.actions.newSession.subtitle",
    subtitle: "Create a chat session in the current creation page.",
    keywords: ["new", "create", "chat", "session", "conversation", "新建", "创建", "对话", "会话"],
    action: { type: "new-session" },
    requiresWorkspace: true,
    preferred: true
  },
  {
    id: "command:new-project",
    category: "command",
    titleKey: "globalSearch.actions.newProject.title",
    title: "Start Creating",
    subtitleKey: "globalSearch.actions.newProject.subtitle",
    subtitle: "Start creating.",
    keywords: ["new", "create", "project", "workspace", "新建", "创建", "项目", "工作区"],
    action: { type: "new-project" },
    preferred: true
  },
  {
    id: "command:open-project",
    category: "command",
    titleKey: "globalSearch.actions.openProject.title",
    title: "Open Creation Page Folder",
    subtitleKey: "globalSearch.actions.openProject.subtitle",
    subtitle: "Choose a local folder and open it as a creation page.",
    keywords: ["open", "folder", "project", "import", "file", "打开", "文件夹", "导入", "项目"],
    action: { type: "open-workspace-dialog" }
  },
  {
    id: "command:settings",
    category: "command",
    titleKey: "globalSearch.actions.settings.title",
    title: "Open Settings",
    subtitleKey: "globalSearch.actions.settings.subtitle",
    subtitle: "Manage language, theme, memory, storage, and app options.",
    keywords: [
      "setting",
      "settings",
      "preference",
      "theme",
      "language",
      "设置",
      "偏好",
      "主题",
      "语言"
    ],
    action: { type: "settings", section: "general" },
    preferred: true
  },
  {
    id: "command:memory",
    category: "command",
    titleKey: "globalSearch.actions.memory.title",
    title: "Memory Management",
    subtitleKey: "globalSearch.actions.memory.subtitle",
    subtitle: "Review, create, or clean up agent memory.",
    keywords: ["memory", "remember", "agent memory", "记忆", "记忆管理"],
    action: { type: "settings", section: "memory" }
  },
  {
    id: "command:asset-center",
    category: "command",
    titleKey: "globalSearch.actions.assetCenter.title",
    title: "Open Asset Center",
    subtitleKey: "globalSearch.actions.assetCenter.subtitle",
    subtitle: "Browse reusable assets across creation pages.",
    keywords: ["asset", "assets", "resource", "material", "素材", "资产", "资源"],
    action: { type: "route", target: "asset-center" }
  },
  {
    id: "skill:open",
    category: "skill",
    titleKey: "globalSearch.skills.open.title",
    title: "Open Skills",
    subtitleKey: "globalSearch.skills.open.subtitle",
    subtitle: "Browse, enable, and manage reusable Skills.",
    keywords: ["skill", "skills", "ability", "tool", "template", "模板", "模版", "技能", "能力"],
    action: { type: "route", target: "skills-community" },
    preferred: true
  },
  {
    id: "skill:mine",
    category: "skill",
    titleKey: "globalSearch.skills.mine.title",
    title: "Manage My Skills",
    subtitleKey: "globalSearch.skills.mine.subtitle",
    subtitle: "View installed and enabled Skills.",
    keywords: [
      "my skill",
      "installed skill",
      "enabled skill",
      "我的技能",
      "已启用技能",
      "已安装技能"
    ],
    action: { type: "route", target: "skills-mine-skills" }
  },
  {
    id: "plugin:market",
    category: "plugin",
    titleKey: "globalSearch.plugins.market.title",
    title: "Open Plugin Market",
    subtitleKey: "globalSearch.plugins.market.subtitle",
    subtitle: "Find installable Plugins and reusable tools.",
    keywords: ["plugin", "plugins", "extension", "template", "模板", "模版", "插件", "扩展"],
    action: { type: "route", target: "skills-plugins" },
    preferred: true
  },
  {
    id: "plugin:mine",
    category: "plugin",
    titleKey: "globalSearch.plugins.mine.title",
    title: "Manage Installed Plugins",
    subtitleKey: "globalSearch.plugins.mine.subtitle",
    subtitle: "Review local and installed Plugins.",
    keywords: [
      "my plugin",
      "installed plugin",
      "plugin manager",
      "我的插件",
      "已安装插件",
      "插件管理"
    ],
    action: { type: "route", target: "skills-mine-plugins" }
  },
  {
    id: "help:shortcuts",
    category: "help",
    titleKey: "globalSearch.help.shortcuts.title",
    title: "Keyboard Shortcuts",
    subtitleKey: "globalSearch.help.shortcuts.subtitle",
    subtitle: "Find common shortcuts such as global search and new chat.",
    keywords: ["shortcut", "hotkey", "keyboard", "help", "快捷键", "热键", "帮助"],
    action: { type: "settings", section: "general" },
    preferred: true
  },
  {
    id: "help:create-skill",
    category: "help",
    titleKey: "globalSearch.help.createSkill.title",
    title: "How to create a Skill",
    subtitleKey: "globalSearch.help.createSkill.subtitle",
    subtitle: "Skills are the reusable capability layer behind templates.",
    keywords: [
      "how",
      "help",
      "create skill",
      "template",
      "skill",
      "怎么用",
      "帮助",
      "创建技能",
      "模板"
    ],
    action: { type: "route", target: "skills-community" }
  },
  {
    id: "help:install-plugin",
    category: "help",
    titleKey: "globalSearch.help.installPlugin.title",
    title: "How to install a Plugin",
    subtitleKey: "globalSearch.help.installPlugin.subtitle",
    subtitle: "Plugins live under the Skill & Plugin page.",
    keywords: ["how", "help", "install plugin", "plugin", "怎么用", "帮助", "安装插件", "插件"],
    action: { type: "route", target: "skills-plugins" }
  },
  {
    id: "help:session-history",
    category: "help",
    titleKey: "globalSearch.help.sessionHistory.title",
    title: "Find Session history",
    subtitleKey: "globalSearch.help.sessionHistory.subtitle",
    subtitle: "Use creation page history to restore hidden or previous Sessions.",
    keywords: [
      "history",
      "session",
      "chat",
      "recover",
      "find back",
      "历史",
      "找回",
      "会话",
      "对话"
    ],
    action: { type: "query", query: "session history" }
  },
  {
    id: "help:templates",
    category: "help",
    titleKey: "globalSearch.help.templates.title",
    title: "Templates map to Skills and Plugins",
    subtitleKey: "globalSearch.help.templates.subtitle",
    subtitle: "Search Skill, Plugin, and example workflows instead of a separate template center.",
    keywords: [
      "template",
      "templates",
      "skill",
      "plugin",
      "workflow",
      "模板",
      "模版",
      "技能",
      "插件"
    ],
    action: { type: "route", target: "skills-community" }
  },
  {
    id: "help:model",
    category: "help",
    titleKey: "globalSearch.help.model.title",
    title: "Model selection help",
    subtitleKey: "globalSearch.help.model.subtitle",
    subtitle: "Model choices are available from the chat input model selector.",
    keywords: [
      "model",
      "image model",
      "video model",
      "audio model",
      "模型",
      "图片模型",
      "视频模型",
      "音频模型"
    ],
    action: { type: "query", query: "model" }
  },
  {
    id: "help:agent-mode",
    category: "help",
    titleKey: "globalSearch.help.agentMode.title",
    title: "Agent mode help",
    subtitleKey: "globalSearch.help.agentMode.subtitle",
    subtitle: "Agent modes are controlled from the chat input run-mode selector.",
    keywords: ["agent", "mode", "auto", "approval", "模式", "自动", "审批"],
    action: { type: "query", query: "agent mode" }
  },
  {
    id: "help:export",
    category: "help",
    titleKey: "globalSearch.help.export.title",
    title: "Export and download help",
    subtitleKey: "globalSearch.help.export.subtitle",
    subtitle: "Download-related searches map to export actions when supported in context.",
    keywords: ["download", "export", "pdf", "markdown", "导出", "下载"],
    action: { type: "query", query: "export" }
  },
  {
    id: "help:share",
    category: "help",
    titleKey: "globalSearch.help.share.title",
    title: "Sharing and collaboration help",
    subtitleKey: "globalSearch.help.share.subtitle",
    subtitle: "Sharing commands only appear as direct actions when the current context supports them.",
    keywords: ["share", "invite", "collaboration", "permission", "分享", "邀请", "协作", "权限"],
    action: { type: "query", query: "settings" }
  },
  {
    id: "help:changelog",
    category: "help",
    titleKey: "globalSearch.help.changelog.title",
    title: "Open Changelog",
    subtitleKey: "globalSearch.help.changelog.subtitle",
    subtitle: "Review the latest product updates.",
    keywords: ["changelog", "release note", "update", "更新日志", "版本", "更新"],
    action: { type: "route", target: "changelog" }
  }
];
function normalize(value) {
  return value.trim().toLowerCase();
}
function folderNameFromPath(path) {
  const clean = path.replace(/[/\\]+$/, "");
  return clean.split(/[/\\]/).pop() || path;
}
function readTime(value) {
  if (!value || typeof value !== "object") return void 0;
  const row = value;
  const candidate = row.mtimeMs ?? row.mtime_ms ?? row.mtime ?? row.updatedAt ?? row.updated_at;
  return typeof candidate === "string" || typeof candidate === "number" ? candidate : void 0;
}
function assetIdFromCanvasNodeId(nodeId) {
  return nodeId.split("~")[0] ?? nodeId;
}
function buildFileThumbnailUrl(workspace, item) {
  if (item.kind === "image") {
    return withThumbnail(
      gatewayUrlFromBase(
        workspace.gatewayUrl,
        API_PATHS.serveFile(item.path),
        workspace.gatewayBinding ?? workspace.workspaceClaim
      ),
      40
    );
  }
  if (item.kind === "video") {
    return withThumbnail(
      gatewayUrlFromBase(
        workspace.gatewayUrl,
        API_PATHS.thumbnail(item.path),
        workspace.gatewayBinding ?? workspace.workspaceClaim
      ),
      40
    );
  }
  return void 0;
}
function buildCanvasThumbnailUrl(workspace, match) {
  if (match.type !== "image") return void 0;
  const assetId = assetIdFromCanvasNodeId(match.id);
  if (!assetId) return void 0;
  return withThumbnail(
    gatewayUrlFromBase(
      workspace.gatewayUrl,
      API_PATHS.serveFileById(assetId),
      workspace.gatewayBinding ?? workspace.workspaceClaim
    ),
    40
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
function withScore(result, score) {
  return {
    ...result,
    score: score + CATEGORY_WEIGHT[result.category] + (result.workspaceId ? 2 : 0)
  };
}
function sortResults(results) {
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
  const merged = /* @__PURE__ */ new Map();
  for (const recent of recentWorkspaces) {
    merged.set(recent.folderPath, {
      ...recent,
      workspaceId: recent.workspaceId ?? openedByPath.get(recent.folderPath)
    });
  }
  for (const workspace of workspaces) {
    if (merged.has(workspace.folderPath)) continue;
    merged.set(workspace.folderPath, {
      workspaceId: workspace.workspaceId,
      workspaceName: workspace.workspaceName,
      folderPath: workspace.folderPath,
      openedAt: Date.now()
    });
  }
  const projectResults = Array.from(merged.values()).map((workspace) => {
    const score = scoreText(
      [workspace.workspaceName, workspace.folderPath, folderNameFromPath(workspace.folderPath)],
      query
    );
    if (score === null) return null;
    const currentBoost = workspace.workspaceId && workspace.workspaceId === currentWorkspaceId ? 28 : 0;
    return withScore(
      {
        id: `project:${workspace.folderPath}`,
        category: "project",
        workspaceId: workspace.workspaceId,
        workspaceName: workspace.workspaceName,
        workspacePath: workspace.folderPath,
        title: workspace.workspaceName,
        subtitle: workspace.folderPath,
        badgeKey: workspace.workspaceId ? "globalSearch.badge.opened" : "globalSearch.badge.recent",
        badge: workspace.workspaceId ? "Opened" : "Recent",
        time: workspace.openedAt,
        action: {
          type: "project",
          workspaceId: workspace.workspaceId,
          folderPath: workspace.folderPath
        },
        data: workspace
      },
      score + currentBoost
    );
  }).filter((result) => result !== null);
  return sortResults(projectResults).slice(0, 12);
}
function buildHubProjectResults(query, projects) {
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
          action: { type: "open-project", projectId: project.id },
          data: project
        },
        score
      )
    );
    if (results.length === HUB_PROJECT_RESULT_LIMIT) break;
  }
  return results;
}
function buildSessionResults(query, workspaces, currentWorkspaceId) {
  return workspaces.flatMap(
    (workspace) => workspace.sessions.map((session) => {
      const score = scoreText(
        [session.name, session.folder ?? "", workspace.workspaceName],
        query
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
          data: session
        },
        score + currentBoost
      );
    })
  ).filter((result) => result !== null).slice(0, 20);
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
        action: item.action
      },
      score + (item.preferred ? 16 : 0)
    );
  }).filter((result) => result !== null);
}
function buildRecommendedSearchResults(currentWorkspaceId) {
  return STATIC_RESULTS.filter((item) => item.preferred).filter((item) => !item.requiresWorkspace || currentWorkspaceId).map((item, index) => ({
    id: item.id,
    category: item.category,
    title: item.title,
    titleKey: item.titleKey,
    subtitle: item.subtitle,
    subtitleKey: item.subtitleKey,
    keywords: item.keywords,
    action: item.action,
    score: 100 - index
  }));
}
function buildRecentSearchResults(workspaces, recentWorkspaces) {
  const openedByPath = new Map(workspaces.map((w) => [w.folderPath, w]));
  const recentProjects = recentWorkspaces.slice().sort((a, b) => b.openedAt - a.openedAt).slice(0, 3).map((workspace) => {
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
        folderPath: workspace.folderPath
      },
      data: workspace
    };
  });
  const recentSessions = workspaces.flatMap(
    (workspace) => workspace.sessions.map((session) => ({
      id: `recent-session:${workspace.workspaceId}:${session.id}`,
      category: "session",
      workspaceId: workspace.workspaceId,
      workspaceName: workspace.workspaceName,
      workspacePath: workspace.folderPath,
      title: session.name,
      subtitle: workspace.workspaceName,
      meta: `${session.messageCount} messages`,
      time: session.createdAt,
      data: session
    }))
  ).sort((a, b) => {
    const timeA = a.time ? new Date(a.time).getTime() || 0 : 0;
    const timeB = b.time ? new Date(b.time).getTime() || 0 : 0;
    return timeB - timeA;
  }).slice(0, Math.max(0, 4 - recentProjects.length));
  return [...recentProjects, ...recentSessions];
}
function buildLocalResults(query, workspaces, recentWorkspaces, projects, currentWorkspaceId) {
  return sortResults([
    ...buildHubProjectResults(query, projects),
    ...buildProjectResults(query, workspaces, recentWorkspaces, currentWorkspaceId),
    ...buildSessionResults(query, workspaces, currentWorkspaceId),
    ...buildStaticResults(query, currentWorkspaceId)
  ]);
}
function readArrayField(value, key) {
  if (!value || typeof value !== "object") return [];
  const row = value;
  return Array.isArray(row[key]) ? row[key] : [];
}
function useGlobalSearch(workspaces, options = {}) {
  const { currentWorkspaceId = null, recentWorkspaces = [], projects = [] } = options;
  const [results, setResults] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const abortRef = reactExports.useRef(null);
  const timerRef = reactExports.useRef(null);
  const clear = reactExports.useCallback(() => {
    abortRef.current?.abort();
    if (timerRef.current) clearTimeout(timerRef.current);
    setResults([]);
    setLoading(false);
  }, []);
  const search = reactExports.useCallback(
    (query) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const q = query.trim();
      if (!q) {
        clear();
        return;
      }
      const localResults = buildLocalResults(
        q,
        workspaces,
        recentWorkspaces,
        projects,
        currentWorkspaceId
      );
      setResults(localResults);
      const searchableWorkspaces = workspaces.filter((workspace) => workspace.gatewayBinding);
      if (searchableWorkspaces.length === 0) {
        setLoading(false);
        return;
      }
      setLoading(true);
      timerRef.current = setTimeout(() => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const fileSearches = searchableWorkspaces.map(
          (workspace) => gatewayFetchFromBase(
            workspace.gatewayUrl,
            `/api/files/mention-search?${new URLSearchParams({ workspace: workspace.folderPath, q, limit: "20" })}`,
            {
              signal: controller.signal,
              workspaceBinding: workspace.gatewayBinding
            }
          ).then((r) => r.json()).then(
            (data) => readArrayField(data, "items").map(
              (item) => withScore(
                {
                  id: `file:${workspace.workspaceId}:${item.path}`,
                  category: "file",
                  workspaceId: workspace.workspaceId,
                  workspaceName: workspace.workspaceName,
                  workspacePath: workspace.folderPath,
                  title: item.name,
                  subtitle: item.path,
                  meta: workspace.workspaceName,
                  time: readTime(item),
                  thumbnailUrl: buildFileThumbnailUrl(workspace, item),
                  data: item
                },
                72 + (workspace.workspaceId === currentWorkspaceId ? 24 : 0)
              )
            )
          ).catch(() => [])
        );
        const canvasSearches = searchableWorkspaces.map(
          (workspace) => gatewayFetchFromBase(
            workspace.gatewayUrl,
            `/api/canvas/search?${new URLSearchParams({ query: q, limit: "20" })}`,
            {
              signal: controller.signal,
              workspaceBinding: workspace.gatewayBinding
            }
          ).then((r) => r.json()).then(
            (data) => readArrayField(data, "matches").map(
              (match) => withScore(
                {
                  id: `canvas:${workspace.workspaceId}:${match.id}`,
                  category: "canvas",
                  workspaceId: workspace.workspaceId,
                  workspaceName: workspace.workspaceName,
                  workspacePath: workspace.folderPath,
                  title: match.name ?? match.id,
                  subtitle: match.promptSnippet,
                  meta: workspace.workspaceName,
                  time: readTime(match),
                  thumbnailUrl: buildCanvasThumbnailUrl(workspace, match),
                  data: match
                },
                66 + (workspace.workspaceId === currentWorkspaceId ? 24 : 0)
              )
            )
          ).catch(() => [])
        );
        Promise.all([...fileSearches, ...canvasSearches]).then((groups) => {
          if (controller.signal.aborted) return;
          setResults(sortResults([...localResults, ...groups.flat()]));
          setLoading(false);
        });
      }, DEBOUNCE_MS);
    },
    [workspaces, recentWorkspaces, projects, currentWorkspaceId, clear]
  );
  reactExports.useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
  return { results, loading, search, clear };
}
const CATEGORY_ORDER = [
  "project",
  "hubProject",
  "session",
  "file",
  "canvas",
  "skill",
  "plugin",
  "command",
  "help"
];
const CATEGORY_LABEL_KEYS = {
  project: "globalSearch.projects",
  hubProject: "globalSearch.hubProjects",
  session: "globalSearch.sessions",
  file: "globalSearch.files",
  canvas: "globalSearch.canvasNodes",
  skill: "globalSearch.skills",
  plugin: "globalSearch.plugins",
  command: "globalSearch.commands",
  help: "globalSearch.help"
};
const CATEGORY_LABEL_FALLBACKS = {
  project: "Creation pages",
  hubProject: "Projects",
  session: "Sessions",
  file: "Files",
  canvas: "Canvas Nodes",
  skill: "Skills",
  plugin: "Plugins",
  command: "Commands",
  help: "Help"
};
const CATEGORY_TYPE_LABEL_KEYS = {
  project: "globalSearch.type.project",
  hubProject: "globalSearch.type.hubProject",
  session: "globalSearch.type.session",
  file: "globalSearch.type.file",
  canvas: "globalSearch.type.canvas",
  skill: "globalSearch.type.skill",
  plugin: "globalSearch.type.plugin",
  command: "globalSearch.type.command",
  help: "globalSearch.type.help"
};
const CATEGORY_TYPE_LABEL_FALLBACKS = {
  project: "Creation page",
  hubProject: "Project",
  session: "Session",
  file: "File",
  canvas: "Node",
  skill: "Skill",
  plugin: "Plugin",
  command: "Action",
  help: "Help"
};
const PRIMARY_FILTERS = [
  { id: "all", labelKey: "globalSearch.filter.all", label: "All" },
  { id: "project", labelKey: "globalSearch.filter.projects", label: "Creation pages" },
  { id: "session", labelKey: "globalSearch.filter.sessions", label: "Sessions" },
  { id: "image", labelKey: "globalSearch.filter.images", label: "Images" },
  { id: "video", labelKey: "globalSearch.filter.videos", label: "Videos" },
  { id: "text", labelKey: "globalSearch.filter.text", label: "Text" },
  { id: "audio", labelKey: "globalSearch.filter.audio", label: "Audio" },
  { id: "file", labelKey: "globalSearch.filter.files", label: "File assets" },
  { id: "quickAction", labelKey: "globalSearch.filter.quickActions", label: "Quick actions" },
  { id: "hubProject", labelKey: "globalSearch.filter.hubProjects", label: "Projects" }
];
const SEARCH_TRACK_IDLE_MS = 600;
const MODAL_HANDOFF_CLOSE_DELAY_MS = 120;
const IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "bmp",
  "webp",
  "svg",
  "ico",
  "tiff"
]);
const VIDEO_EXTENSIONS = /* @__PURE__ */ new Set(["mp4", "mov", "webm", "mkv", "avi", "m4v"]);
const AUDIO_EXTENSIONS = /* @__PURE__ */ new Set(["mp3", "wav", "m4a", "aac", "flac", "ogg"]);
const TEXT_EXTENSIONS = /* @__PURE__ */ new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "csv",
  "tsv",
  "html",
  "css",
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "go",
  "rs",
  "java",
  "c",
  "cpp",
  "h",
  "hpp",
  "xml",
  "yaml",
  "yml"
]);
function formatRelativeTime(time, t) {
  const ms = typeof time === "string" ? new Date(time).getTime() : time;
  if (Number.isNaN(ms)) return "";
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 6e4);
  if (minutes < 1) return t("globalSearch.time.now", "now");
  if (minutes < 60) {
    return t("globalSearch.time.minutes", {
      count: minutes,
      defaultValue: "{{count}}m"
    });
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return t("globalSearch.time.hours", {
      count: hours,
      defaultValue: "{{count}}h"
    });
  }
  const days = Math.floor(hours / 24);
  return t("globalSearch.time.days", {
    count: days,
    defaultValue: "{{count}}d"
  });
}
function commandIcon(result) {
  switch (result.action?.type) {
    case "new-session":
      return MessageSquarePlus;
    case "new-project":
      return FolderPlus;
    case "open-workspace-dialog":
    case "project":
      return FolderOpen;
    case "open-project":
      return Folder;
    case "settings":
      return result.action.section === "memory" ? Brain : Settings;
    case "route":
      return result.action.target === "asset-center" ? PackageSearch : Command;
    case "query":
      return Search;
    default:
      return Command;
  }
}
function mediaIcon(result) {
  switch (inferResultMediaFilter(result)) {
    case "image":
      return ImageOutlineIcon;
    case "video":
      return Video;
    case "text":
      return FileText;
    case "audio":
      return Music;
    default:
      return null;
  }
}
function ResultIcon({ result }) {
  switch (result.category) {
    case "project":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: FolderOpen, size: "lg" });
    case "hubProject":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: Folder, size: "lg" });
    case "session":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: MessageSquare, size: "lg" });
    case "file":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: mediaIcon(result) ?? File, size: "lg" });
    case "canvas":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: mediaIcon(result) ?? LayoutGrid, size: "lg" });
    case "skill":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(SkillIcon, { size: 20, strokeWidth: 1.75 });
    case "plugin":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(PluginIcon, { size: 20, strokeWidth: 1.75 });
    case "command":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: commandIcon(result), size: "lg" });
    case "help":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: BookOpen, size: "lg" });
  }
}
const THUMBNAIL_VISIBLE_ROOT_MARGIN = "96px 0px";
const THUMBNAIL_STABLE_DELAY_MS = 240;
function WorkspaceResultVisual({ workspacePath }) {
  const hostRef = reactExports.useRef(null);
  const [loadEnabled, setLoadEnabled] = reactExports.useState(() => typeof IntersectionObserver === "undefined");
  const { data: thumbnails } = useWorkspaceThumbnails(workspacePath, loadEnabled);
  const [failed, setFailed] = reactExports.useState(false);
  const thumbnail = thumbnails?.[0];
  reactExports.useEffect(() => {
    if (loadEnabled || typeof IntersectionObserver === "undefined") return;
    const host = hostRef.current;
    if (!host) return;
    let visibilityTimer = null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          if (visibilityTimer !== null) {
            clearTimeout(visibilityTimer);
            visibilityTimer = null;
          }
          return;
        }
        if (visibilityTimer !== null) return;
        visibilityTimer = setTimeout(() => {
          visibilityTimer = null;
          setLoadEnabled(true);
          observer.disconnect();
        }, THUMBNAIL_STABLE_DELAY_MS);
      },
      { rootMargin: THUMBNAIL_VISIBLE_ROOT_MARGIN }
    );
    observer.observe(host);
    return () => {
      observer.disconnect();
      if (visibilityTimer !== null) clearTimeout(visibilityTimer);
    };
  }, [loadEnabled]);
  if (!thumbnail || failed) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        ref: hostRef,
        className: "flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-transparent text-foreground/55 transition-colors duration-100 group-hover/result:border-border group-hover/result:text-foreground/70",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: FolderOpen, size: "lg" })
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      ref: hostRef,
      className: "relative flex size-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/40",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: thumbnail.src,
            alt: "",
            loading: "lazy",
            className: "h-full w-full object-cover",
            onError: () => setFailed(true)
          }
        ),
        thumbnail.mediaType === "video" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inset-0 flex items-center justify-center bg-foreground/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Play,
          {
            "aria-hidden": true,
            size: 14,
            strokeWidth: 1.5,
            className: "fill-background text-background drop-shadow-sm"
          }
        ) })
      ]
    }
  );
}
function ResultLeadingVisual({ result }) {
  const [thumbnailFailed, setThumbnailFailed] = reactExports.useState(false);
  const mediaType = inferResultMediaFilter(result);
  const canPreviewMedia = mediaType === "image" || mediaType === "video";
  const thumbnailUrl = canPreviewMedia && !thumbnailFailed ? result.thumbnailUrl : void 0;
  if (result.category === "project" && result.workspacePath) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceResultVisual, { workspacePath: result.workspacePath });
  }
  if (thumbnailUrl) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "relative flex size-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/40", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "img",
        {
          src: thumbnailUrl,
          alt: "",
          loading: "lazy",
          className: "h-full w-full object-cover",
          onError: () => setThumbnailFailed(true)
        }
      ),
      mediaType === "video" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inset-0 flex items-center justify-center bg-foreground/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Play,
        {
          "aria-hidden": true,
          size: 14,
          strokeWidth: 1.5,
          className: "fill-background text-background drop-shadow-sm"
        }
      ) })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-transparent text-foreground/55 transition-colors duration-100 group-hover/result:border-border group-hover/result:text-foreground/70", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResultIcon, { result }) });
}
function groupResults(results) {
  const map = /* @__PURE__ */ new Map();
  for (const result of results) {
    const list = map.get(result.category) ?? [];
    list.push(result);
    map.set(result.category, list);
  }
  return CATEGORY_ORDER.filter((category) => map.has(category)).map((category) => ({
    id: category,
    labelKey: CATEGORY_LABEL_KEYS[category],
    label: CATEGORY_LABEL_FALLBACKS[category],
    items: map.get(category) ?? []
  }));
}
function actionType(result) {
  return result.action?.type ?? result.category;
}
function isMediaFilter(filter) {
  return filter === "image" || filter === "video" || filter === "text" || filter === "audio";
}
function resultMatchesPrimaryFilter(result, filter) {
  switch (filter) {
    case "all":
      return true;
    case "project":
    case "hubProject":
    case "session":
    case "file":
      return result.category === filter;
    case "quickAction":
      return result.category === "command" || result.category === "skill" || result.category === "plugin" || result.category === "help";
    case "image":
    case "video":
    case "text":
    case "audio":
      return (result.category === "canvas" || result.category === "file") && inferResultMediaFilter(result) === filter;
  }
}
function readStringField(value, key) {
  if (!value || typeof value !== "object") return "";
  const row = value;
  return typeof row[key] === "string" ? row[key] : "";
}
function extensionFromPath(path) {
  const clean = path.split("?")[0] ?? path;
  const dot = clean.lastIndexOf(".");
  return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : "";
}
function inferResultMediaFilter(result) {
  const data = result.data;
  const rawType = [
    readStringField(data, "type"),
    readStringField(data, "nodeType"),
    readStringField(data, "kind"),
    readStringField(data, "fileType"),
    readStringField(data, "mime")
  ].join(" ").toLowerCase();
  if (rawType.includes("image") || rawType.includes("img")) return "image";
  if (rawType.includes("video")) return "video";
  if (rawType.includes("audio") || rawType.includes("music")) return "audio";
  if (rawType.includes("text") || rawType.includes("markdown") || rawType.includes("document")) {
    return "text";
  }
  const path = readStringField(data, "path") || result.subtitle || result.title;
  const extension = extensionFromPath(path);
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  if (AUDIO_EXTENSIONS.has(extension)) return "audio";
  if (TEXT_EXTENSIONS.has(extension)) return "text";
  return null;
}
function GlobalSearchDialog({
  open,
  onOpenChange,
  workspaces,
  recentWorkspaces = [],
  projects = [],
  currentWorkspaceId = null,
  onNavigateFile,
  onNavigateCanvasNode,
  onNavigateSession,
  onExecuteAction
}) {
  const { t } = useTranslation();
  const [query, setQuery] = reactExports.useState("");
  const [selectedIndex, setSelectedIndex] = reactExports.useState(0);
  const [primaryFilter, setPrimaryFilter] = reactExports.useState("all");
  const inputRef = reactExports.useRef(null);
  const listRef = reactExports.useRef(null);
  const tabListRef = reactExports.useRef(null);
  const tabRefs = reactExports.useRef({});
  const lastTrackedSearchSummaryRef = reactExports.useRef("");
  const searchTrackTimerRef = reactExports.useRef(null);
  const modalHandoffCloseTimerRef = reactExports.useRef(null);
  const [tabIndicator, setTabIndicator] = reactExports.useState({ left: 0, width: 0 });
  const isListScrolling = useIsScrolling({ scrollRef: listRef });
  const { results, loading, search, clear } = useGlobalSearch(workspaces, {
    currentWorkspaceId,
    recentWorkspaces,
    projects
  });
  const translate = reactExports.useCallback(
    (key, fallback) => {
      if (!key) return fallback ?? "";
      return t(key, fallback ?? "");
    },
    [t]
  );
  const normalizedQuery = query.trim();
  const searchGroups = reactExports.useMemo(() => groupResults(results), [results]);
  const recommendedResults = reactExports.useMemo(
    () => buildRecommendedSearchResults(currentWorkspaceId),
    [currentWorkspaceId]
  );
  const defaultGroups = reactExports.useMemo(() => {
    const recent = buildRecentSearchResults(workspaces, recentWorkspaces);
    const hubProjects = buildHubProjectResults("", projects);
    return [
      ...recent.length > 0 ? [
        {
          id: "recent",
          labelKey: "globalSearch.default.recent",
          label: "Recent",
          items: recent
        }
      ] : [],
      ...hubProjects.length > 0 ? [
        {
          id: "hubProject",
          labelKey: "globalSearch.hubProjects",
          label: "Projects",
          items: hubProjects
        }
      ] : [],
      {
        id: "recommended",
        labelKey: "globalSearch.default.recommended",
        label: "Recommended actions",
        items: recommendedResults.slice(0, 6)
      }
    ];
  }, [projects, recentWorkspaces, recommendedResults, workspaces]);
  const sourceGroups = normalizedQuery ? searchGroups : defaultGroups;
  const activeFilter = PRIMARY_FILTERS.find((filter) => filter.id === primaryFilter);
  const activeFilterLabel = activeFilter ? t(activeFilter.labelKey, activeFilter.label) : "";
  const displayGroups = reactExports.useMemo(() => {
    const filteredGroups = sourceGroups.map((group) => ({
      ...group,
      items: group.items.filter((result) => {
        return resultMatchesPrimaryFilter(result, primaryFilter);
      })
    })).filter((group) => group.items.length > 0);
    if (primaryFilter !== "quickAction") {
      return filteredGroups;
    }
    const items = filteredGroups.flatMap((group) => group.items);
    return items.length > 0 ? [
      {
        id: "quickAction",
        labelKey: "globalSearch.filter.quickActions",
        label: "Quick actions",
        items
      }
    ] : [];
  }, [primaryFilter, sourceGroups]);
  const flatResults = reactExports.useMemo(() => displayGroups.flatMap((group) => group.items), [displayGroups]);
  const showEmpty = !loading && flatResults.length === 0;
  reactExports.useEffect(() => {
    if (!open) return;
    let rafId = null;
    let attempts = 0;
    let resizeObserver = null;
    const updateIndicator = () => {
      const tabList = tabListRef.current;
      const activeTab = tabRefs.current[primaryFilter];
      if (!tabList || !activeTab) return false;
      const activeLabel = activeTab.querySelector('[data-tab-label="true"]');
      const tabListRect = tabList.getBoundingClientRect();
      const labelRect = activeLabel?.getBoundingClientRect();
      setTabIndicator({
        left: labelRect ? labelRect.left - tabListRect.left + tabList.scrollLeft : activeTab.offsetLeft,
        width: labelRect?.width ?? activeTab.offsetWidth
      });
      if (!resizeObserver && typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(updateIndicator);
        resizeObserver.observe(tabList);
        resizeObserver.observe(activeTab);
        if (activeLabel) resizeObserver.observe(activeLabel);
      }
      return true;
    };
    window.addEventListener("resize", updateIndicator);
    const measureWhenReady = () => {
      if (updateIndicator()) return;
      attempts += 1;
      if (attempts > 8) return;
      rafId = requestAnimationFrame(measureWhenReady);
    };
    measureWhenReady();
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [open, primaryFilter]);
  const closeWithReason = reactExports.useCallback(
    (method) => {
      trackEvent(TRACK_EVENTS.GLOBAL_SEARCH_CLOSE, {
        method,
        query_length: normalizedQuery.length,
        result_count: results.length
      });
      onOpenChange(false);
    },
    [normalizedQuery, onOpenChange, results.length]
  );
  reactExports.useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setPrimaryFilter("all");
      lastTrackedSearchSummaryRef.current = "";
      clear();
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, clear]);
  reactExports.useEffect(() => {
    return () => {
      if (modalHandoffCloseTimerRef.current != null) {
        clearTimeout(modalHandoffCloseTimerRef.current);
        modalHandoffCloseTimerRef.current = null;
      }
      if (searchTrackTimerRef.current != null) {
        clearTimeout(searchTrackTimerRef.current);
        searchTrackTimerRef.current = null;
      }
    };
  }, []);
  reactExports.useEffect(() => {
    if (!open) return;
    search(query);
  }, [open, query, search]);
  reactExports.useEffect(() => {
    setSelectedIndex((index) => {
      if (flatResults.length === 0) return 0;
      return Math.min(index, flatResults.length - 1);
    });
  }, [flatResults.length]);
  reactExports.useEffect(() => {
    if (!open || !normalizedQuery || loading) return;
    if (searchTrackTimerRef.current != null) clearTimeout(searchTrackTimerRef.current);
    searchTrackTimerRef.current = setTimeout(() => {
      searchTrackTimerRef.current = null;
      const trackKey = [
        normalizedQuery.length,
        results.length,
        searchGroups.length,
        primaryFilter,
        currentWorkspaceId ?? ""
      ].join(":");
      if (lastTrackedSearchSummaryRef.current === trackKey) return;
      lastTrackedSearchSummaryRef.current = trackKey;
      trackEvent(TRACK_EVENTS.GLOBAL_SEARCH_QUERY, {
        query_length: normalizedQuery.length,
        result_count: results.length,
        category_count: searchGroups.length,
        has_results: results.length > 0,
        current_workspace_id: currentWorkspaceId ?? void 0
      });
      if (results.length === 0) {
        trackEvent(TRACK_EVENTS.GLOBAL_SEARCH_NO_RESULT, {
          query_length: normalizedQuery.length,
          current_workspace_id: currentWorkspaceId ?? void 0
        });
      }
    }, SEARCH_TRACK_IDLE_MS);
    return () => {
      if (searchTrackTimerRef.current != null) {
        clearTimeout(searchTrackTimerRef.current);
        searchTrackTimerRef.current = null;
      }
    };
  }, [
    currentWorkspaceId,
    loading,
    normalizedQuery,
    open,
    primaryFilter,
    results.length,
    searchGroups.length
  ]);
  const focusInput = reactExports.useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);
  const handleSelect = reactExports.useCallback(
    async (result, index) => {
      trackEvent(TRACK_EVENTS.GLOBAL_SEARCH_RESULT_CLICK, {
        query_length: normalizedQuery.length,
        result_type: result.category,
        action_type: actionType(result),
        rank: index + 1
      });
      if (result.action?.type === "query") {
        setQuery(result.action.query);
        setSelectedIndex(0);
        focusInput();
        return;
      }
      if (result.action) {
        trackEvent(TRACK_EVENTS.GLOBAL_SEARCH_COMMAND_EXECUTE, {
          query_length: normalizedQuery.length,
          command_type: result.action.type,
          result_type: result.category
        });
        const shouldClose = await onExecuteAction?.(result);
        if (shouldClose === false) return;
        if (result.action.type === "settings") {
          modalHandoffCloseTimerRef.current = setTimeout(() => {
            modalHandoffCloseTimerRef.current = null;
            closeWithReason("select");
          }, MODAL_HANDOFF_CLOSE_DELAY_MS);
        } else {
          closeWithReason("select");
        }
        return;
      }
      closeWithReason("select");
      switch (result.category) {
        case "file":
          onNavigateFile?.(result);
          break;
        case "canvas":
          onNavigateCanvasNode?.(result);
          break;
        case "session":
          onNavigateSession?.(result);
          break;
      }
    },
    [
      closeWithReason,
      focusInput,
      normalizedQuery,
      onExecuteAction,
      onNavigateCanvasNode,
      onNavigateFile,
      onNavigateSession
    ]
  );
  const handleKeyDown = reactExports.useCallback(
    (event) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex(
            (index) => flatResults.length === 0 ? 0 : Math.min(index + 1, flatResults.length - 1)
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((index) => Math.max(index - 1, 0));
          break;
        case "Enter":
          event.preventDefault();
          if (flatResults[selectedIndex]) {
            void handleSelect(flatResults[selectedIndex], selectedIndex);
          }
          break;
        case "Escape":
          event.preventDefault();
          closeWithReason("keyboard");
          break;
      }
    },
    [closeWithReason, flatResults, handleSelect, selectedIndex]
  );
  reactExports.useEffect(() => {
    const el = listRef.current?.querySelector('[data-selected="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);
  const handleDialogOpenChange = reactExports.useCallback(
    (nextOpen) => {
      if (!nextOpen && open) {
        closeWithReason("dialog");
        return;
      }
      onOpenChange(nextOpen);
    },
    [closeWithReason, onOpenChange, open]
  );
  const handlePrimaryFilterClick = reactExports.useCallback(
    (nextFilter) => {
      setPrimaryFilter(nextFilter);
      setSelectedIndex(0);
      focusInput();
    },
    [focusInput]
  );
  let flatIndex = 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: handleDialogOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    DialogContent,
    {
      size: "lg",
      className: "global-search-dialog !translate-y-0 flex min-h-[var(--global-search-dialog-min-height)] max-h-[min(640px,72vh)] flex-col gap-0 overflow-hidden rounded-xl bg-popover p-0 text-popover-foreground shadow-lg ring-0 duration-150 data-open:slide-in-from-top-2 data-closed:slide-out-to-top-2",
      showCloseButton: false,
      "data-action-ui-id": "global-search.dialog",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-16 shrink-0 items-center gap-2.5 border-b border-border/70 px-4 py-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Icon,
            {
              icon: Search,
              size: "md",
              strokeWidth: 1.5,
              className: "ml-4 shrink-0 text-foreground/60"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              ref: inputRef,
              type: "text",
              value: query,
              onChange: (event) => setQuery(event.target.value),
              onKeyDown: handleKeyDown,
              placeholder: t(
                "globalSearch.placeholder",
                "Search creation pages, sessions, media, files, or quick actions..."
              ),
              "aria-label": t("globalSearch.inputLabel", "Global search"),
              className: "h-10 min-w-0 flex-1 bg-transparent pl-6 text-[15px] text-foreground outline-none placeholder:truncate placeholder:text-muted-foreground",
              "data-action-ui-id": "global-search.input"
            }
          ),
          loading && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              "aria-hidden": true,
              className: "size-4 shrink-0 rounded-full border-2 border-muted-foreground/25 border-t-foreground animate-spin"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0 px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            ref: tabListRef,
            className: "relative flex items-end gap-4 overflow-x-auto border-b border-border/70 scrollbar-none",
            children: [
              PRIMARY_FILTERS.map((filter) => {
                const active = primaryFilter === filter.id;
                const compact = isMediaFilter(filter.id);
                return /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    ref: (node) => {
                      tabRefs.current[filter.id] = node;
                    },
                    type: "button",
                    "aria-pressed": active,
                    "data-action-ui-id": `global-search.filter.${filter.id}`,
                    onClick: () => handlePrimaryFilterClick(filter.id),
                    className: cn(
                      "inline-flex h-10 shrink-0 cursor-pointer items-center text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
                      compact ? "px-1.5" : "px-2",
                      active ? "text-foreground" : "text-foreground/70 hover:bg-popup-item-hover hover:text-foreground"
                    ),
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-tab-label": "true", children: t(filter.labelKey, filter.label) })
                  },
                  filter.id
                );
              }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  "aria-hidden": true,
                  className: "pointer-events-none absolute bottom-0 h-[2px] rounded-full bg-foreground transition-[left,width] duration-200 ease-out",
                  style: { left: tabIndicator.left, width: tabIndicator.width }
                }
              )
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            ref: listRef,
            role: "listbox",
            "aria-label": t("globalSearch.resultsLabel", "Search results"),
            "data-scrolling": isListScrolling ? "true" : void 0,
            className: "scrollbar-fade min-h-0 flex-1 max-h-[calc(min(640px,72vh)-9rem)] overflow-y-auto py-2 pr-1.5 mr-0.5 [scrollbar-gutter:stable]",
            children: [
              displayGroups.map((group) => /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mb-3 last:mb-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-5 pb-1 text-xs font-medium text-muted-foreground", children: translate(group.labelKey, group.label) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-0.5", children: group.items.map((result) => {
                  const isSelected = flatIndex === selectedIndex;
                  const currentIndex = flatIndex;
                  flatIndex += 1;
                  const title = translate(result.titleKey, result.title);
                  const subtitle = translate(result.subtitleKey, result.subtitle);
                  const meta = translate(result.metaKey, result.meta);
                  const badge = translate(result.badgeKey, result.badge);
                  const typeLabel = translate(
                    CATEGORY_TYPE_LABEL_KEYS[result.category],
                    CATEGORY_TYPE_LABEL_FALLBACKS[result.category]
                  );
                  const sideMeta = [
                    result.time ? formatRelativeTime(result.time, t) : "",
                    typeLabel
                  ].filter(Boolean).join(" · ");
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      role: "option",
                      "aria-selected": isSelected,
                      "data-selected": isSelected,
                      "data-action-ui-id": `global-search.result.${result.category}.${currentIndex}`,
                      className: cn(
                        "group/result mx-2 flex w-[calc(100%-1rem)] cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors duration-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
                        isSelected ? "bg-popup-item-active text-foreground" : "text-foreground/70 hover:bg-popup-item-hover hover:text-foreground"
                      ),
                      onClick: () => void handleSelect(result, currentIndex),
                      onMouseEnter: () => setSelectedIndex(currentIndex),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(ResultLeadingVisual, { result }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 items-center gap-2", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[15px] font-normal", children: title }),
                            badge && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground", children: badge })
                          ] }),
                          (subtitle || meta) && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-0.5 block truncate text-[12px] text-muted-foreground", children: [
                            subtitle,
                            subtitle && meta ? " · " : "",
                            meta
                          ] })
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 whitespace-nowrap text-[11px] text-muted-foreground tabular-nums", children: sideMeta })
                      ]
                    },
                    result.id
                  );
                }) })
              ] }, group.id)),
              loading && results.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "px-5 py-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2 text-xs font-medium text-muted-foreground", children: t("globalSearch.loading", "Searching") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-2", children: Array.from({ length: 4 }).map((_, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: "mx-0 flex items-center gap-3 rounded-md px-3 py-2.5",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-8 rounded-md bg-muted" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1 space-y-2", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-3 w-1/3 rounded-full bg-muted" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-2.5 w-2/3 rounded-full bg-muted/70" })
                      ] })
                    ]
                  },
                  index
                )) })
              ] }),
              showEmpty && /* @__PURE__ */ jsxRuntimeExports.jsx(
                PageStateBoundary,
                {
                  empty: true,
                  className: "min-h-[280px] px-5 py-8",
                  emptyOptions: {
                    title: normalizedQuery ? t("globalSearch.empty.title", {
                      defaultValue: 'No results for "{{query}}"',
                      query: normalizedQuery
                    }) : t("globalSearch.empty.filterTitle", {
                      defaultValue: "No results in {{filter}}",
                      filter: activeFilterLabel
                    }),
                    description: normalizedQuery ? t(
                      "globalSearch.empty.subtitle",
                      "Try a broader scope, open a capability page, or create a new working item."
                    ) : t(
                      "globalSearch.empty.filterSubtitle",
                      "Try another category, or enter a keyword to search."
                    ),
                    actions: normalizedQuery ? recommendedResults.slice(0, 4).map((result, index) => ({
                      key: `recommended-${result.id}`,
                      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ResultIcon, { result }),
                      label: translate(result.titleKey, result.title),
                      variant: "secondary",
                      onClick: () => handleSelect(result, index)
                    })) : []
                  }
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-9 shrink-0 items-center justify-end border-t border-border/70 px-4 text-[10px] text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(KbdGroup, { className: "gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Kbd, { className: "h-4 min-w-7 px-1 text-[10px] font-normal", children: "↑↓" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("globalSearch.navigate") })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": true, className: "text-muted-foreground/50", children: "/" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(KbdGroup, { className: "gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Kbd, { className: "h-4 min-w-8 px-1 text-[10px] font-normal", children: "Enter" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("globalSearch.open") })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": true, className: "text-muted-foreground/50", children: "/" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(KbdGroup, { className: "gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Kbd, { className: "h-4 min-w-6 px-1 text-[10px] font-normal", children: "Esc" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("globalSearch.close") })
          ] })
        ] }) })
      ]
    }
  ) });
}
export {
  GlobalSearchDialog
};
