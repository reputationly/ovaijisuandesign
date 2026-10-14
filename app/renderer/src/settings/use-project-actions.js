// use-project-actions.js
import {
  normalizeHiddenProjectIds,
  normalizeProjectEntries,
  normalizeProjectName,
  useProjectStore,
} from "../workspace/normalize-project-entries.js";
import {
  checkTextSafety,
  cloudErrorDisplayMessage,
  CloudProjectRequestError,
  createProjectOperationId,
  listCloudProjects,
  logProjectOperationAttempt,
  logProjectOperationBlocked,
  logProjectOperationFailure,
  logProjectOperationSuccess,
  mapCloudProject,
  requestJson,
} from "../workspace/asset-lineage-query-key.js";
import reactExports from "react";
import { storageKeys } from "../infra/storage-cache.js";
import { useQueryClient } from "@tanstack/react-query";
import { useNewProjectFolder } from "../workspace/use-new-project-folder.js";
import { useStorage } from "../infra/use-storage.js";
import { projectLog } from "../vendor-inline/vscode-base/graph.jsx";
import {
  instantiationService,
  IProjectMainService,
} from "../workspace/home-service.jsx";
async function createCloudProject(projectName) {
  const data = await requestJson("/api/v1/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: projectName,
    }),
  });
  const project = mapCloudProject(data.project);
  if (!project) {
    throw new CloudProjectRequestError(200, void 0);
  }
  return project;
}
async function renameCloudProject(projectId, projectName) {
  await requestJson(`/api/v1/projects/${encodeURIComponent(projectId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: projectName,
    }),
  });
}
async function deleteCloudProject(projectId) {
  await requestJson(`/api/v1/projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
  });
}
async function acceptProjectInvite(token) {
  const data = await requestJson("/api/v1/project-invites/accept", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token,
    }),
  });
  const project = mapCloudProject(data.project);
  if (!project) {
    throw new CloudProjectRequestError(200, void 0);
  }
  return project;
}
function hideProjectId(hiddenProjectIds, projectId) {
  return normalizeHiddenProjectIds([...hiddenProjectIds, projectId]);
}
function restoreProjectId(hiddenProjectIds, projectId) {
  return normalizeHiddenProjectIds(hiddenProjectIds).filter(
    (id) => id !== projectId,
  );
}
function dedupeProjectName(projects, projectName) {
  const base = normalizeProjectName(projectName);
  if (!base) return base;
  const taken = new Set(
    projects.map((project) => project.name.toLowerCase()),
  );
  if (!taken.has(base.toLowerCase())) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`.toLowerCase())) suffix++;
  return `${base}-${suffix}`;
}
function hasProjectNameConflict(projects, projectId, projectName) {
  const normalized = normalizeProjectName(projectName);
  if (!normalized) return false;
  const candidate = normalized.toLowerCase();
  return normalizeProjectEntries(projects).some(
    (project) =>
      project.id !== projectId && project.name.toLowerCase() === candidate,
  );
}
function cloudStatus(err) {
  return err instanceof CloudProjectRequestError ? err.status : void 0;
}
export function useProjectActions(options = {}) {
  const [parentFolderPath] = useNewProjectFolder();
  const {
    allProjects: projects,
    caseInsensitive,
    hiddenProjectIds,
    setHiddenProjectIdsAsync,
  } = useProjectStore(options);
  const [, , setGlobalConfigAsync] = useStorage("global.config", options);
  const queryClient = useQueryClient();
  const service = reactExports.useMemo(
    () =>
      instantiationService.invokeFunction((accessor) =>
        accessor.get(IProjectMainService),
      ),
    [],
  );
  const refreshProjects = reactExports.useCallback(
    async () =>
      queryClient.invalidateQueries({
        queryKey: storageKeys.global("projects"),
      }),
    [queryClient],
  );
  const createProject = reactExports.useCallback(
    async (projectName, kind) => {
      const operationId = createProjectOperationId("create-project");
      const startedAt = logProjectOperationAttempt(
        "create-project",
        operationId,
        {
          kind,
        },
      );
      const uniqueName = dedupeProjectName(projects, projectName);
      let safety;
      try {
        safety = await checkTextSafety(uniqueName);
      } catch (error) {
        logProjectOperationFailure(
          "create-project",
          operationId,
          startedAt,
          "text-safety",
          error,
          {
            kind,
          },
        );
        throw error;
      }
      if (!safety.pass) {
        logProjectOperationBlocked(
          "create-project",
          operationId,
          startedAt,
          "text-safety",
          "safety-blocked",
          {
            kind,
            decision: safety.decision,
          },
        );
        return {
          safetyBlocked: true,
          errorMessageKey: "rename.safetyBlocked",
        };
      }
      let remoteId;
      if (kind === "team") {
        try {
          const cloud = await createCloudProject(uniqueName);
          remoteId = cloud.id;
        } catch (err) {
          logProjectOperationFailure(
            "create-project",
            operationId,
            startedAt,
            "cloud-create",
            err,
            {
              kind,
              status: cloudStatus(err),
            },
          );
          return {
            errorMessage: cloudErrorDisplayMessage(err),
          };
        }
      }
      let stage = "local-persist";
      try {
        const entry = await service.createProject({
          name: uniqueName,
          kind,
          remoteId,
          ...(kind === "local" && parentFolderPath
            ? {
                parentFolderPath,
              }
            : {}),
        });
        stage = "renderer-refresh";
        await refreshProjects();
        logProjectOperationSuccess("create-project", operationId, startedAt, {
          projectId: entry.id,
          kind,
          remoteId,
        });
        return {
          project: entry,
        };
      } catch (error) {
        logProjectOperationFailure(
          "create-project",
          operationId,
          startedAt,
          stage,
          error,
          {
            kind,
          },
        );
        throw error;
      }
    },
    [parentFolderPath, projects, refreshProjects, service],
  );
  const renameProject = reactExports.useCallback(
    async (project, projectName) => {
      const operationId = createProjectOperationId("rename-project");
      const startedAt = logProjectOperationAttempt(
        "rename-project",
        operationId,
        {
          projectId: project.id,
          kind: project.kind,
        },
      );
      const normalizedName = normalizeProjectName(projectName);
      if (!normalizedName) {
        logProjectOperationBlocked(
          "rename-project",
          operationId,
          startedAt,
          "validation",
          "empty-name",
          {
            projectId: project.id,
          },
        );
        return {};
      }
      let safety;
      try {
        safety = await checkTextSafety(normalizedName);
      } catch (error) {
        logProjectOperationFailure(
          "rename-project",
          operationId,
          startedAt,
          "text-safety",
          error,
          {
            projectId: project.id,
          },
        );
        throw error;
      }
      if (!safety.pass) {
        logProjectOperationBlocked(
          "rename-project",
          operationId,
          startedAt,
          "text-safety",
          "safety-blocked",
          {
            projectId: project.id,
            kind: project.kind,
            decision: safety.decision,
          },
        );
        return {
          safetyBlocked: true,
          errorMessageKey: "rename.safetyBlocked",
        };
      }
      if (hasProjectNameConflict(projects, project.id, normalizedName)) {
        logProjectOperationBlocked(
          "rename-project",
          operationId,
          startedAt,
          "validation",
          "project-name-conflict",
          {
            projectId: project.id,
          },
        );
        return {
          errorCode: "project-name-conflict",
        };
      }
      if (project.kind === "team" && project.remoteId) {
        try {
          await renameCloudProject(project.remoteId, normalizedName);
        } catch (err) {
          logProjectOperationFailure(
            "rename-project",
            operationId,
            startedAt,
            "cloud-rename",
            err,
            {
              projectId: project.id,
              remoteId: project.remoteId,
              status: cloudStatus(err),
            },
          );
          return {
            errorMessage: cloudErrorDisplayMessage(err),
            errorCode: "cloud-request-failed",
          };
        }
      }
      let stage = "local-persist";
      try {
        await service.renameProject(project.id, normalizedName);
        stage = "renderer-refresh";
        await refreshProjects();
        logProjectOperationSuccess("rename-project", operationId, startedAt, {
          projectId: project.id,
          kind: project.kind,
        });
        return {};
      } catch (error) {
        logProjectOperationFailure(
          "rename-project",
          operationId,
          startedAt,
          stage,
          error,
          {
            projectId: project.id,
          },
        );
        throw error;
      }
    },
    [projects, refreshProjects, service],
  );
  const deleteProject = reactExports.useCallback(
    async (project) => {
      const operationId = createProjectOperationId("dissolve-project");
      const startedAt = logProjectOperationAttempt(
        "dissolve-project",
        operationId,
        {
          projectId: project.id,
          kind: project.kind,
        },
      );
      let hasActiveTransfers;
      try {
        hasActiveTransfers = await service.hasActiveProjectTransfers(
          project.id,
        );
      } catch (error) {
        logProjectOperationFailure(
          "dissolve-project",
          operationId,
          startedAt,
          "active-transfer-check",
          error,
          {
            projectId: project.id,
          },
        );
        throw error;
      }
      if (hasActiveTransfers) {
        logProjectOperationBlocked(
          "dissolve-project",
          operationId,
          startedAt,
          "active-transfer-check",
          "project-transfer-active",
          {
            projectId: project.id,
          },
        );
        return {
          errorCode: "project-transfer-active",
        };
      }
      if (project.kind === "team" && project.remoteId) {
        try {
          await deleteCloudProject(project.remoteId);
        } catch (err) {
          if (err instanceof CloudProjectRequestError && err.status === 404) {
            projectLog.info("dissolve-project cloud already absent", {
              operationId,
              projectId: project.id,
              remoteId: project.remoteId,
            });
          } else {
            logProjectOperationFailure(
              "dissolve-project",
              operationId,
              startedAt,
              "cloud-delete",
              err,
              {
                projectId: project.id,
                remoteId: project.remoteId,
                status: cloudStatus(err),
              },
            );
            return {
              errorMessage: cloudErrorDisplayMessage(err),
              errorCode: "cloud-request-failed",
            };
          }
        }
      }
      const hidden = await setHiddenProjectIdsAsync((current) =>
        hideProjectId(current, project.id),
      );
      if (!hidden) {
        logProjectOperationFailure(
          "dissolve-project",
          operationId,
          startedAt,
          "local-hide",
          {
            code: "project-hide-failed",
          },
          {
            projectId: project.id,
          },
        );
        return {
          errorCode: "project-hide-failed",
        };
      }
      logProjectOperationSuccess("dissolve-project", operationId, startedAt, {
        projectId: project.id,
        kind: project.kind,
        remoteId: project.remoteId,
        workspaceCount: project.workspacePaths.length,
      });
      void setGlobalConfigAsync((previous) => {
        const pinned = previous.pinnedProjectIds ?? [];
        if (!pinned.includes(project.id)) return previous;
        return {
          ...previous,
          pinnedProjectIds: pinned.filter((id) => id !== project.id),
        };
      });
      return {};
    },
    [service, setGlobalConfigAsync, setHiddenProjectIdsAsync],
  );
  const restoreProjectVisibility = reactExports.useCallback(
    async (projectId) => {
      if (!hiddenProjectIds.includes(projectId)) return true;
      return setHiddenProjectIdsAsync((current) =>
        restoreProjectId(current, projectId),
      );
    },
    [hiddenProjectIds, setHiddenProjectIdsAsync],
  );
  const addWorkspaceToProject = reactExports.useCallback(
    async (workspacePath, projectId, source) => {
      const operationId = createProjectOperationId("add-workspace-to-project");
      const startedAt = logProjectOperationAttempt(
        "add-workspace-to-project",
        operationId,
        {
          path: workspacePath,
          projectId,
          source: source ?? "unknown",
        },
      );
      let stage = "local-persist";
      try {
        await service.assignWorkspace(
          workspacePath,
          projectId,
          caseInsensitive,
        );
        stage = "renderer-refresh";
        await refreshProjects();
        logProjectOperationSuccess(
          "add-workspace-to-project",
          operationId,
          startedAt,
          {
            projectId,
            source: source ?? "unknown",
          },
        );
      } catch (error) {
        logProjectOperationFailure(
          "add-workspace-to-project",
          operationId,
          startedAt,
          stage,
          error,
          {
            projectId,
            source: source ?? "unknown",
          },
        );
        throw error;
      }
    },
    [caseInsensitive, refreshProjects, service],
  );
  const removeWorkspaceFromProject = reactExports.useCallback(
    async (workspacePath, source) => {
      const operationId = createProjectOperationId(
        "remove-workspace-from-project",
      );
      const startedAt = logProjectOperationAttempt(
        "remove-workspace-from-project",
        operationId,
        {
          path: workspacePath,
          source: source ?? "unknown",
        },
      );
      let stage = "local-persist";
      try {
        await service.detachWorkspace(workspacePath, caseInsensitive);
        stage = "renderer-refresh";
        await refreshProjects();
        logProjectOperationSuccess(
          "remove-workspace-from-project",
          operationId,
          startedAt,
          {
            source: source ?? "unknown",
          },
        );
      } catch (error) {
        logProjectOperationFailure(
          "remove-workspace-from-project",
          operationId,
          startedAt,
          stage,
          error,
          {
            source: source ?? "unknown",
          },
        );
        throw error;
      }
    },
    [caseInsensitive, refreshProjects, service],
  );
  const reorderProject = reactExports.useCallback(
    async (sourceId, targetId, position) => {
      await service.reorderProject(sourceId, targetId, position);
      await refreshProjects().catch(() => {
        projectLog.warn(
          "Project reorder committed; storage cache refresh incomplete",
        );
      });
    },
    [service, refreshProjects],
  );
  const moveWorkspace = reactExports.useCallback(
    async (input) => {
      await service.moveWorkspace(input);
      const refreshes = await Promise.allSettled(
        ["projects", "recentWorkspaces", "config"].map((field) =>
          queryClient.invalidateQueries({
            queryKey: storageKeys.global(field),
          }),
        ),
      );
      if (refreshes.some((result) => result.status === "rejected")) {
        projectLog.warn(
          "Workspace move committed; storage cache refresh incomplete",
        );
      }
    },
    [service, queryClient],
  );
  const syncCloudProjects = reactExports.useCallback(async () => {
    const operationId = createProjectOperationId("sync-cloud-projects");
    const startedAt = logProjectOperationAttempt(
      "sync-cloud-projects",
      operationId,
    );
    let cloudProjects;
    try {
      cloudProjects = await listCloudProjects();
    } catch (err) {
      logProjectOperationFailure(
        "sync-cloud-projects",
        operationId,
        startedAt,
        "cloud-list",
        err,
        {
          status: cloudStatus(err),
        },
      );
      return null;
    }
    let stage = "local-merge";
    try {
      await service.mergeCloudProjects(cloudProjects);
      stage = "renderer-refresh";
      await refreshProjects();
      logProjectOperationSuccess(
        "sync-cloud-projects",
        operationId,
        startedAt,
        {
          cloudCount: cloudProjects.length,
        },
      );
      return cloudProjects;
    } catch (error) {
      logProjectOperationFailure(
        "sync-cloud-projects",
        operationId,
        startedAt,
        stage,
        error,
        {
          cloudCount: cloudProjects.length,
        },
      );
      throw error;
    }
  }, [refreshProjects, service]);
  const acceptProjectInviteToken = reactExports.useCallback(
    async (token) => {
      const operationId = createProjectOperationId("accept-project-invite");
      const startedAt = logProjectOperationAttempt(
        "accept-project-invite",
        operationId,
      );
      let cloud;
      try {
        cloud = await acceptProjectInvite(token);
      } catch (err) {
        logProjectOperationFailure(
          "accept-project-invite",
          operationId,
          startedAt,
          "cloud-accept",
          err,
          {
            status: cloudStatus(err),
          },
        );
        return {
          errorMessage: cloudErrorDisplayMessage(err),
        };
      }
      let stage = "local-upsert";
      try {
        const projectId = await service.upsertCloudProject(cloud);
        stage = "renderer-refresh";
        await refreshProjects();
        logProjectOperationSuccess(
          "accept-project-invite",
          operationId,
          startedAt,
          {
            remoteId: cloud.id,
            projectId,
          },
        );
        return {
          projectId,
        };
      } catch (error) {
        logProjectOperationFailure(
          "accept-project-invite",
          operationId,
          startedAt,
          stage,
          error,
          {
            remoteId: cloud.id,
          },
        );
        throw error;
      }
    },
    [refreshProjects, service],
  );
  const ensureProjectFolderName = reactExports.useCallback(
    async (projectId) => {
      const resolved = await service.getProjectFolderName(projectId);
      return resolved;
    },
    [service],
  );
  const provisionSampleProject = reactExports.useCallback(
    async (input) => {
      const project = await service.provisionSampleProject({
        ...input,
        kind: "local",
        caseInsensitive,
      });
      await refreshProjects();
      return project;
    },
    [caseInsensitive, refreshProjects, service],
  );
  return {
    createProject,
    renameProject,
    deleteProject,
    restoreProjectVisibility,
    addWorkspaceToProject,
    removeWorkspaceFromProject,
    reorderProject,
    moveWorkspace,
    syncCloudProjects,
    acceptProjectInviteToken,
    ensureProjectFolderName,
    provisionSampleProject,
  };
}
