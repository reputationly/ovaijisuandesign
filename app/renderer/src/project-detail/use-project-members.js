// 项目成员列表的查询 hook 与缓存键。
import {
  k as useQuery,
  hq as createProjectOperationId,
  hr as logProjectOperationAttempt,
  hs as listProjectMembers,
  ht as logProjectOperationSuccess,
  hu as logProjectOperationFailure,
} from "../main.jsx";
const PROJECT_MEMBERS_STALE_TIME_MS = 3e4;
export function projectMembersQueryKey(projectId) {
  return ["project", projectId, "members"];
}
export function useProjectMembers(projectId) {
  return useQuery({
    queryKey: projectMembersQueryKey(projectId ?? "NO_PROJECT"),
    queryFn: async () => {
      if (!projectId) return [];
      const operationId = createProjectOperationId("list-project-members");
      const startedAt = logProjectOperationAttempt("list-project-members", operationId, {
        remoteId: projectId,
      });
      try {
        const members = await listProjectMembers(projectId);
        logProjectOperationSuccess("list-project-members", operationId, startedAt, {
          remoteId: projectId,
          memberCount: members.length,
        });
        return members;
      } catch (error) {
        logProjectOperationFailure(
          "list-project-members",
          operationId,
          startedAt,
          "cloud-list-members",
          error,
          {
            remoteId: projectId,
          },
        );
        throw error;
      }
    },
    enabled: Boolean(projectId),
    retry: false,
    staleTime: PROJECT_MEMBERS_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });
}
