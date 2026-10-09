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
import {
  reactExports,
  storageKeys,
  useNewProjectFolder,
  useQueryClient,
  useStorage,
} from "../vendor.js";
import { projectLog } from "../vendor-inline/vscode-base/graph.jsx";
import {
  instantiationService,
  IProjectMainService,
} from "../workspace/home-service.jsx";
async function createCloudProject(name2) {
  const data2 = await requestJson("/api/v1/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name2,
    }),
  });
  const project2 = mapCloudProject(data2.project);
  if (!project2) {
    throw new CloudProjectRequestError(200, void 0);
  }
  return project2;
}
async function renameCloudProject(projectId, name2) {
  await requestJson(`/api/v1/projects/${encodeURIComponent(projectId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name2,
    }),
  });
}
async function deleteCloudProject(projectId) {
  await requestJson(`/api/v1/projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
  });
}
async function acceptProjectInvite(token2) {
  const data2 = await requestJson("/api/v1/project-invites/accept", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: token2,
    }),
  });
  const project2 = mapCloudProject(data2.project);
  if (!project2) {
    throw new CloudProjectRequestError(200, void 0);
  }
  return project2;
}
function hideProjectId(hiddenProjectIds, projectId) {
  return normalizeHiddenProjectIds([...hiddenProjectIds, projectId]);
}
function restoreProjectId(hiddenProjectIds, projectId) {
  return normalizeHiddenProjectIds(hiddenProjectIds).filter(
    (id2) => id2 !== projectId,
  );
}
function dedupeProjectName(projects, name2) {
  const base2 = normalizeProjectName(name2);
  if (!base2) return base2;
  const taken = new Set(
    projects.map((project2) => project2.name.toLowerCase()),
  );
  if (!taken.has(base2.toLowerCase())) return base2;
  let suffix = 2;
  while (taken.has(`${base2}-${suffix}`.toLowerCase())) suffix++;
  return `${base2}-${suffix}`;
}
function hasProjectNameConflict(projects, projectId, name2) {
  const normalized = normalizeProjectName(name2);
  if (!normalized) return false;
  const candidate = normalized.toLowerCase();
  return normalizeProjectEntries(projects).some(
    (project2) =>
      project2.id !== projectId && project2.name.toLowerCase() === candidate,
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
  const queryClient2 = useQueryClient();
  const service2 = reactExports.useMemo(
    () =>
      instantiationService.invokeFunction((accessor) =>
        accessor.get(IProjectMainService),
      ),
    [],
  );
  const refreshProjects = reactExports.useCallback(
    async () =>
      queryClient2.invalidateQueries({
        queryKey: storageKeys.global("projects"),
      }),
    [queryClient2],
  );
  const createProject = reactExports.useCallback(
    async (name2, kind) => {
      const operationId = createProjectOperationId("create-project");
      const startedAt = logProjectOperationAttempt(
        "create-project",
        operationId,
        {
          kind,
        },
      );
      const uniqueName = dedupeProjectName(projects, name2);
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
        const entry = await service2.createProject({
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
    [parentFolderPath, projects, refreshProjects, service2],
  );
  const renameProject = reactExports.useCallback(
    async (project2, name2) => {
      const operationId = createProjectOperationId("rename-project");
      const startedAt = logProjectOperationAttempt(
        "rename-project",
        operationId,
        {
          projectId: project2.id,
          kind: project2.kind,
        },
      );
      const normalizedName = normalizeProjectName(name2);
      if (!normalizedName) {
        logProjectOperationBlocked(
          "rename-project",
          operationId,
          startedAt,
          "validation",
          "empty-name",
          {
            projectId: project2.id,
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
            projectId: project2.id,
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
            projectId: project2.id,
            kind: project2.kind,
            decision: safety.decision,
          },
        );
        return {
          safetyBlocked: true,
          errorMessageKey: "rename.safetyBlocked",
        };
      }
      if (hasProjectNameConflict(projects, project2.id, normalizedName)) {
        logProjectOperationBlocked(
          "rename-project",
          operationId,
          startedAt,
          "validation",
          "project-name-conflict",
          {
            projectId: project2.id,
          },
        );
        return {
          errorCode: "project-name-conflict",
        };
      }
      if (project2.kind === "team" && project2.remoteId) {
        try {
          await renameCloudProject(project2.remoteId, normalizedName);
        } catch (err) {
          logProjectOperationFailure(
            "rename-project",
            operationId,
            startedAt,
            "cloud-rename",
            err,
            {
              projectId: project2.id,
              remoteId: project2.remoteId,
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
        await service2.renameProject(project2.id, normalizedName);
        stage = "renderer-refresh";
        await refreshProjects();
        logProjectOperationSuccess("rename-project", operationId, startedAt, {
          projectId: project2.id,
          kind: project2.kind,
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
            projectId: project2.id,
          },
        );
        throw error;
      }
    },
    [projects, refreshProjects, service2],
  );
  const deleteProject = reactExports.useCallback(
    async (project2) => {
      const operationId = createProjectOperationId("dissolve-project");
      const startedAt = logProjectOperationAttempt(
        "dissolve-project",
        operationId,
        {
          projectId: project2.id,
          kind: project2.kind,
        },
      );
      let hasActiveTransfers;
      try {
        hasActiveTransfers = await service2.hasActiveProjectTransfers(
          project2.id,
        );
      } catch (error) {
        logProjectOperationFailure(
          "dissolve-project",
          operationId,
          startedAt,
          "active-transfer-check",
          error,
          {
            projectId: project2.id,
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
            projectId: project2.id,
          },
        );
        return {
          errorCode: "project-transfer-active",
        };
      }
      if (project2.kind === "team" && project2.remoteId) {
        try {
          await deleteCloudProject(project2.remoteId);
        } catch (err) {
          if (err instanceof CloudProjectRequestError && err.status === 404) {
            projectLog.info("dissolve-project cloud already absent", {
              operationId,
              projectId: project2.id,
              remoteId: project2.remoteId,
            });
          } else {
            logProjectOperationFailure(
              "dissolve-project",
              operationId,
              startedAt,
              "cloud-delete",
              err,
              {
                projectId: project2.id,
                remoteId: project2.remoteId,
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
      const hidden = await setHiddenProjectIdsAsync((current2) =>
        hideProjectId(current2, project2.id),
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
            projectId: project2.id,
          },
        );
        return {
          errorCode: "project-hide-failed",
        };
      }
      logProjectOperationSuccess("dissolve-project", operationId, startedAt, {
        projectId: project2.id,
        kind: project2.kind,
        remoteId: project2.remoteId,
        workspaceCount: project2.workspacePaths.length,
      });
      void setGlobalConfigAsync((previous2) => {
        const pinned = previous2.pinnedProjectIds ?? [];
        if (!pinned.includes(project2.id)) return previous2;
        return {
          ...previous2,
          pinnedProjectIds: pinned.filter((id2) => id2 !== project2.id),
        };
      });
      return {};
    },
    [service2, setGlobalConfigAsync, setHiddenProjectIdsAsync],
  );
  const restoreProjectVisibility = reactExports.useCallback(
    async (projectId) => {
      if (!hiddenProjectIds.includes(projectId)) return true;
      return setHiddenProjectIdsAsync((current2) =>
        restoreProjectId(current2, projectId),
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
        await service2.assignWorkspace(
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
    [caseInsensitive, refreshProjects, service2],
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
        await service2.detachWorkspace(workspacePath, caseInsensitive);
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
    [caseInsensitive, refreshProjects, service2],
  );
  const reorderProject = reactExports.useCallback(
    async (sourceId, targetId, position2) => {
      await service2.reorderProject(sourceId, targetId, position2);
      await refreshProjects().catch(() => {
        projectLog.warn(
          "Project reorder committed; storage cache refresh incomplete",
        );
      });
    },
    [service2, refreshProjects],
  );
  const moveWorkspace = reactExports.useCallback(
    async (input) => {
      await service2.moveWorkspace(input);
      const refreshes = await Promise.allSettled(
        ["projects", "recentWorkspaces", "config"].map((field) =>
          queryClient2.invalidateQueries({
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
    [service2, queryClient2],
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
      await service2.mergeCloudProjects(cloudProjects);
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
  }, [refreshProjects, service2]);
  const acceptProjectInviteToken = reactExports.useCallback(
    async (token2) => {
      const operationId = createProjectOperationId("accept-project-invite");
      const startedAt = logProjectOperationAttempt(
        "accept-project-invite",
        operationId,
      );
      let cloud;
      try {
        cloud = await acceptProjectInvite(token2);
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
        const projectId = await service2.upsertCloudProject(cloud);
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
    [refreshProjects, service2],
  );
  const ensureProjectFolderName = reactExports.useCallback(
    async (projectId) => {
      const resolved = await service2.getProjectFolderName(projectId);
      return resolved;
    },
    [service2],
  );
  const provisionSampleProject = reactExports.useCallback(
    async (input) => {
      const project2 = await service2.provisionSampleProject({
        ...input,
        kind: "local",
        caseInsensitive,
      });
      await refreshProjects();
      return project2;
    },
    [caseInsensitive, refreshProjects, service2],
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
