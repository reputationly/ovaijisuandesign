import { useGatewayFetch, useGatewayScope } from "../assets/listeners-a.jsx";
import { loadWorkspaceProjectArchitecture } from "../assets/load-workspace-project-architecture.jsx";
import { useQuery } from "@tanstack/react-query";
export function useWorkspaceProjectArchitecture() {
  const fetch2 = useGatewayFetch();
  const { scopeKey, gatewayBinding, gatewayReady } = useGatewayScope();
  return useQuery({
    queryKey: ["workspace-project-architecture", scopeKey, gatewayBinding?.instanceId, gatewayBinding?.generation],
    queryFn: ({ signal }) => loadWorkspaceProjectArchitecture(fetch2, signal),
    enabled: gatewayReady && Boolean(gatewayBinding),
    staleTime: Infinity,
    retry: false,
  });
}
