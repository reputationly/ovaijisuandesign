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
    .sort((a2, b3) => {
      return (
        b3.workspace.openedAt - a2.workspace.openedAt ||
        a2.sourceIndex - b3.sourceIndex
      );
    })
    .map(({ workspace }) => workspace);
}

export function isWorkspacePathCaseInsensitivePlatform(os2) {
  return os2 === "win32";
}

export function workspaceInventoryPathKey(path2, caseInsensitive) {
  const windowsAbsolute =
    /^[a-zA-Z]:[\\/]/.test(path2) ||
    /^\\\\/.test(path2) ||
    (caseInsensitive && path2.startsWith("//"));
  const unified2 = windowsAbsolute ? path2.replace(/\\/g, "/") : path2;
  const driveMatch = /^([a-zA-Z]:)(?:\/|$)/.exec(unified2);
  const drive = driveMatch?.[1] ?? "";
  const doubleSlashRoot = !drive && unified2.startsWith("//");
  const remainder = drive
    ? unified2.slice(drive.length)
    : doubleSlashRoot
      ? unified2.slice(2)
      : unified2;
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

export function projectWorkspaceKey(path2, caseInsensitive) {
  return workspaceInventoryPathKey(path2, caseInsensitive);
}

export function normalizeProjectName(name2) {
  return name2.trim().replace(/\s+/g, " ");
}

function isProjectRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function finiteNumberOr(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArray$1(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string")
    : [];
}

function normalizeProjectKind(project2) {
  if (project2.kind === "team" || project2.kind === "local")
    return project2.kind;
  return typeof project2.remoteId === "string" && project2.remoteId.trim()
    ? "team"
    : "local";
}

export function normalizeProjectEntries(projects) {
  if (!Array.isArray(projects)) return [];
  const normalized = [];
  for (const candidate of projects) {
    if (!isProjectRecord(candidate)) continue;
    const id2 = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const name2 =
      typeof candidate.name === "string"
        ? normalizeProjectName(candidate.name)
        : "";
    if (!id2 || !name2) continue;
    const createdAt = finiteNumberOr(candidate.createdAt, 0);
    const updatedAt = finiteNumberOr(candidate.updatedAt, createdAt);
    const entry = {
      id: id2,
      name: name2,
      kind: normalizeProjectKind(candidate),
      createdAt,
      updatedAt,
      workspacePaths: stringArray$1(candidate.workspacePaths),
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
    (project2) => !hidden.has(project2.id),
  );
}

export function buildWorkspaceProjectIndex(projects, caseInsensitive) {
  const index2 = new Map();
  for (const project2 of normalizeProjectEntries(projects)) {
    for (const path2 of project2.workspacePaths) {
      const key2 = projectWorkspaceKey(path2, caseInsensitive);
      if (!index2.has(key2)) index2.set(key2, project2);
    }
  }
  return index2;
}

function findProjectForWorkspace(projects, workspacePath, caseInsensitive) {
  return buildWorkspaceProjectIndex(projects, caseInsensitive).get(
    projectWorkspaceKey(workspacePath, caseInsensitive),
  );
}

export function sortProjects(projects, mode2) {
  const sorted = normalizeProjectEntries(projects);
  switch (mode2) {
    case "created":
      sorted.sort((a2, b3) => b3.createdAt - a2.createdAt);
      break;
    case "name":
      sorted.sort((a2, b3) =>
        a2.name.localeCompare(b3.name, void 0, {
          numeric: true,
        }),
      );
      break;
    default:
      sorted.sort((a2, b3) => b3.updatedAt - a2.updatedAt);
      break;
  }
  return sorted;
}

export function filterProjectsByKeyword(projects, keyword2) {
  const needle = keyword2.trim().toLocaleLowerCase();
  const safeProjects = normalizeProjectEntries(projects);
  if (!needle) return safeProjects;
  return safeProjects.filter((project2) =>
    project2.name.toLocaleLowerCase().includes(needle),
  );
}

function filterProjectsByKind(projects, kind) {
  return normalizeProjectEntries(projects).filter(
    (project2) => project2.kind === kind,
  );
}

export function useProjectStore(options = {}) {
  const platform2 = usePlatform();
  const caseInsensitive = isCaseInsensitiveOs(platform2.app?.os ?? "");
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
  const keyword2 = options?.keyword ?? "";
  const kind = options?.kind;
  return reactExports.useMemo(
    () =>
      sortProjects(
        filterProjectsByKeyword(
          kind ? filterProjectsByKind(projects, kind) : projects,
          keyword2,
        ),
        sortMode,
      ),
    [keyword2, kind, projects, sortMode],
  );
}

export function useProject(projectId) {
  const { projects } = useProjectStore();
  return reactExports.useMemo(
    () =>
      projectId
        ? projects.find((project2) => project2.id === projectId)
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
