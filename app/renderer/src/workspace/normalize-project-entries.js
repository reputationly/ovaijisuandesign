// normalize-project-entries.js
import { sortRecentWorkspacesByStableOrder } from "./asset-lineage-query-key.js";
import { reactExports, usePlatform, useStorage } from "../vendor.js";
import { isCaseInsensitiveOs } from "../settings/use-active-runtime.js";
export function resolveRecentProjectsSortMode(value) {
  return value === "recent" || value === "priority" ? value : "manual";
}
export function sortRecentWorkspaces(workspaces, sortMode = "recent") {
  if (sortMode === "manual")
    return sortRecentWorkspacesByStableOrder(workspaces);
  return workspaces
    .map((workspace, sourceIndex) => ({
      workspace,
      sourceIndex,
    }))
    .sort((leftWorkspaceEntry, rightWorkspaceEntry) => {
      return (
        rightWorkspaceEntry.workspace.openedAt - leftWorkspaceEntry.workspace.openedAt ||
        leftWorkspaceEntry.sourceIndex - rightWorkspaceEntry.sourceIndex
      );
    })
    .map(({ workspace }) => workspace);
}
export function isWorkspacePathCaseInsensitivePlatform(os) {
  return os === "win32";
}
export function workspaceInventoryPathKey(path, caseInsensitive) {
  const windowsAbsolute =
    /^[a-zA-Z]:[\\/]/.test(path) ||
    /^\\\\/.test(path) ||
    (caseInsensitive && path.startsWith("//"));
  const unified = windowsAbsolute ? path.replace(/\\/g, "/") : path;
  const driveMatch = /^([a-zA-Z]:)(?:\/|$)/.exec(unified);
  const drive = driveMatch?.[1] ?? "";
  const doubleSlashRoot = !drive && unified.startsWith("//");
  const remainder = drive
    ? unified.slice(drive.length)
    : doubleSlashRoot
      ? unified.slice(2)
      : unified;
  const absolute = remainder.startsWith("/");
  const segments = [];
  for (const segment of remainder.split("/")) {
    if (!segment || segment === ".") continue;
    segments.push(segment);
  }
  const prefix = drive
    ? `${drive}${absolute ? "/" : ""}`
    : doubleSlashRoot
      ? "//"
      : absolute
        ? "/"
        : "";
  const normalized =
    `${prefix}${segments.join("/")}` ||
    (doubleSlashRoot ? "//" : absolute ? "/" : ".");
  return caseInsensitive ? normalized.toLocaleLowerCase("en-US") : normalized;
}
export function projectWorkspaceKey(path, caseInsensitive) {
  return workspaceInventoryPathKey(path, caseInsensitive);
}
export function normalizeProjectName(projectName) {
  return projectName.trim().replace(/\s+/g, " ");
}
function isProjectRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function finiteNumberOr(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function stringArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string")
    : [];
}
function normalizeProjectKind(project) {
  if (project.kind === "team" || project.kind === "local")
    return project.kind;
  return typeof project.remoteId === "string" && project.remoteId.trim()
    ? "team"
    : "local";
}
export function normalizeProjectEntries(projects) {
  if (!Array.isArray(projects)) return [];
  const normalized = [];
  for (const candidate of projects) {
    if (!isProjectRecord(candidate)) continue;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const projectName =
      typeof candidate.name === "string"
        ? normalizeProjectName(candidate.name)
        : "";
    if (!id || !projectName) continue;
    const createdAt = finiteNumberOr(candidate.createdAt, 0);
    const updatedAt = finiteNumberOr(candidate.updatedAt, createdAt);
    const entry = {
      id,
      name: projectName,
      kind: normalizeProjectKind(candidate),
      createdAt,
      updatedAt,
      workspacePaths: stringArray(candidate.workspacePaths),
      revision: Math.max(0, Math.trunc(finiteNumberOr(candidate.revision, 0))),
      transactionId:
        typeof candidate.transactionId === "string"
          ? candidate.transactionId
          : "",
    };
    if (typeof candidate.coverImage === "string")
      entry.coverImage = candidate.coverImage;
    if (typeof candidate.remoteId === "string" && candidate.remoteId.trim()) {
      entry.remoteId = candidate.remoteId;
    }
    if (
      typeof candidate.folderName === "string" &&
      candidate.folderName.trim()
    ) {
      entry.folderName = candidate.folderName;
    }
    if (
      typeof candidate.folderPath === "string" &&
      candidate.folderPath.trim()
    ) {
      entry.folderPath = candidate.folderPath;
    }
    normalized.push(entry);
  }
  return normalized;
}
export function normalizeHiddenProjectIds(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((projectId) => typeof projectId === "string")
        .map((projectId) => projectId.trim())
        .filter(Boolean),
    ),
  );
}
function filterVisibleProjects(projects, hiddenProjectIds) {
  const hidden = new Set(normalizeHiddenProjectIds(hiddenProjectIds));
  return normalizeProjectEntries(projects).filter(
    (project) => !hidden.has(project.id),
  );
}
export function buildWorkspaceProjectIndex(projects, caseInsensitive) {
  const index = new Map();
  for (const project of normalizeProjectEntries(projects)) {
    for (const path of project.workspacePaths) {
      const key = projectWorkspaceKey(path, caseInsensitive);
      if (!index.has(key)) index.set(key, project);
    }
  }
  return index;
}
function findProjectForWorkspace(projects, workspacePath, caseInsensitive) {
  return buildWorkspaceProjectIndex(projects, caseInsensitive).get(
    projectWorkspaceKey(workspacePath, caseInsensitive),
  );
}
export function sortProjects(projects, mode) {
  const sorted = normalizeProjectEntries(projects);
  switch (mode) {
    case "created":
      sorted.sort((leftProject, rightProject) => rightProject.createdAt - leftProject.createdAt);
      break;
    case "name":
      sorted.sort((leftProject, rightProject) =>
        leftProject.name.localeCompare(rightProject.name, void 0, {
          numeric: true,
        }),
      );
      break;
    default:
      sorted.sort((leftProject, rightProject) => rightProject.updatedAt - leftProject.updatedAt);
      break;
  }
  return sorted;
}
export function filterProjectsByKeyword(projects, keyword) {
  const needle = keyword.trim().toLocaleLowerCase();
  const safeProjects = normalizeProjectEntries(projects);
  if (!needle) return safeProjects;
  return safeProjects.filter((project) =>
    project.name.toLocaleLowerCase().includes(needle),
  );
}
function filterProjectsByKind(projects, kind) {
  return normalizeProjectEntries(projects).filter(
    (project) => project.kind === kind,
  );
}
export function useProjectStore(options = {}) {
  const platform = usePlatform();
  const caseInsensitive = isCaseInsensitiveOs(platform.app?.os ?? "");
  const [projects, , setProjectsAsync] = useStorage("global.projects", options);
  const [hiddenProjectIds, , setHiddenProjectIdsAsync] = useStorage(
    "global.hiddenProjectIds",
    options,
  );
  const allProjects = reactExports.useMemo(
    () => normalizeProjectEntries(projects),
    [projects],
  );
  const normalizedHiddenProjectIds = reactExports.useMemo(
    () => normalizeHiddenProjectIds(hiddenProjectIds),
    [hiddenProjectIds],
  );
  const visibleProjects = reactExports.useMemo(
    () => filterVisibleProjects(allProjects, normalizedHiddenProjectIds),
    [allProjects, normalizedHiddenProjectIds],
  );
  return {
    projects: visibleProjects,
    allProjects,
    hiddenProjectIds: normalizedHiddenProjectIds,
    setHiddenProjectIdsAsync,
    setProjectsAsync,
    caseInsensitive,
  };
}
export function useProjects(options) {
  const { projects } = useProjectStore();
  const sortMode = options?.sortMode ?? "updated";
  const keyword = options?.keyword ?? "";
  const kind = options?.kind;
  return reactExports.useMemo(
    () =>
      sortProjects(
        filterProjectsByKeyword(
          kind ? filterProjectsByKind(projects, kind) : projects,
          keyword,
        ),
        sortMode,
      ),
    [keyword, kind, projects, sortMode],
  );
}
export function useProject(projectId) {
  const { projects } = useProjectStore();
  return reactExports.useMemo(
    () =>
      projectId
        ? projects.find((project) => project.id === projectId)
        : void 0,
    [projectId, projects],
  );
}
export function useWorkspaceProject(workspacePath) {
  const { projects, caseInsensitive } = useProjectStore();
  return reactExports.useMemo(
    () =>
      workspacePath
        ? findProjectForWorkspace(projects, workspacePath, caseInsensitive)
        : void 0,
    [caseInsensitive, projects, workspacePath],
  );
}
