import reactExports from "react";
import { useQuery } from "@tanstack/react-query";

import { createProjectResourceClient } from "../../canvas-v3/project-resource-client.js";
import { useGatewayFetch } from "../../assets/listeners-a.jsx";

export function useDesignResourcePath(output, scopeKey, ready) {
  const fetch = useGatewayFetch();
  const client = reactExports.useMemo(() => createProjectResourceClient(fetch), [fetch]);
  const readable = !output?.availability || output.availability === "available";
  return useQuery({
    queryKey: ["design-execute-resource", scopeKey, output?.resourceId, output?.versionId],
    enabled: Boolean(ready && readable && output),
    queryFn: async ({ signal }) => {
      if (!output) return null;
      const [result] = await client.getResources([{ resourceId: output.resourceId, versionId: output.versionId }], { signal });
      if (!result?.ok || result.detail.resource.resourceId !== output.resourceId || result.detail.version?.versionId !== output.versionId || result.detail.version.status !== "ready") throw new Error("Resource unavailable");
      const path = result.detail.version.relativePath;
      if (!path || path.startsWith("/") || path.includes("\\") || path.split("/").some((part) => part === ".." || part === ".") || /^[a-z]+:/i.test(path)) throw new Error("Invalid resource path");
      return path;
    },
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
