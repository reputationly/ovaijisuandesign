// use-workspace-availability.js
import { usePlatform } from "../infra/platform-context.js";
import { useQuery } from "@tanstack/react-query";
const AVAILABILITY_QUERY_KEY = ["workspace-availability"];
function useWorkspaceAvailability(workspaces) {
  const platform = usePlatform();
  const paths = workspaces.map((workspace) => workspace.path);
  const { data } = useQuery({
    queryKey: [...AVAILABILITY_QUERY_KEY, paths],
    queryFn: async () => {
      const results = await Promise.all(
        paths.map(async (workspacePath) => {
          try {
            const ok = await platform.fs.exists(workspacePath);
            return ok ? null : workspacePath;
          } catch {
            return workspacePath;
          }
        }),
      );
      return new Set(results.filter((workspacePath) => workspacePath !== null));
    },
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: "always",
  });
  return data ?? /* @__PURE__ */ new Set();
}
export { useWorkspaceAvailability };
