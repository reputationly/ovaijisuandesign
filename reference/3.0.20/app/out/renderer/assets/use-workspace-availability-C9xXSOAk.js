import { o as usePlatform, k as useQuery } from "./index-CANVzzmD.js";
const AVAILABILITY_QUERY_KEY = ["workspace-availability"];
function useWorkspaceAvailability(workspaces) {
  const platform = usePlatform();
  const paths = workspaces.map((w) => w.path);
  const { data } = useQuery({
    queryKey: [...AVAILABILITY_QUERY_KEY, paths],
    queryFn: async () => {
      const results = await Promise.all(
        paths.map(async (p) => {
          try {
            const ok = await platform.fs.exists(p);
            return ok ? null : p;
          } catch {
            return p;
          }
        })
      );
      return new Set(results.filter((p) => p !== null));
    },
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: "always"
  });
  return data ?? /* @__PURE__ */ new Set();
}
export {
  useWorkspaceAvailability as u
};
