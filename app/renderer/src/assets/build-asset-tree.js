// build-asset-tree.js
import { API_PATHS } from "../infra/workspace-gateway.js";
import reactExports from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceWSConnection } from "../settings/changelog-table.jsx";

function ensureDirNode(currentPath, currentChildren, dirMap, segment) {
  const existing = dirMap.get(currentPath);
  if (existing) return existing;
  const dirEntry = {
    name: segment,
    path: currentPath,
    isDirectory: true,
    children: [],
    loaded: true,
  };
  dirMap.set(currentPath, dirEntry);
  currentChildren.push(dirEntry);
  return dirEntry;
}

function sortTree(entries) {
  entries.sort((leftEntry, rightEntry) => {
    if (leftEntry.isDirectory !== rightEntry.isDirectory) return leftEntry.isDirectory ? -1 : 1;
    return leftEntry.name.localeCompare(rightEntry.name);
  });
  for (const entry of entries) {
    if (entry.children) sortTree(entry.children);
  }
}

function buildAssetTree(assets, dirs) {
  const root = [];
  const dirMap = new Map();
  const seenPaths = new Set();
  if (dirs && dirs.length > 0) {
    const sortedDirs = [...dirs].sort(
      (leftPath, rightPath) => leftPath.split("/").length - rightPath.split("/").length,
    );
    for (const dirPath of sortedDirs) {
      if (!dirPath) continue;
      const segments = dirPath.split("/");
      let currentChildren = root;
      let currentPath = "";
      for (const segment of segments) {
        if (!segment) continue;
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        const node = ensureDirNode(
          currentPath,
          currentChildren,
          dirMap,
          segment,
        );
        currentChildren = node.children ?? [];
      }
    }
  }
  for (const asset of assets) {
    if (seenPaths.has(asset.path)) continue;
    seenPaths.add(asset.path);
    const segments = asset.path.split("/");
    let currentChildren = root;
    let currentPath = "";
    for (let segmentIndex = 0; segmentIndex < segments.length - 1; segmentIndex++) {
      const segment = segments[segmentIndex];
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const node = ensureDirNode(
        currentPath,
        currentChildren,
        dirMap,
        segment,
      );
      currentChildren = node.children ?? [];
    }
    const fileName = asset.name || segments[segments.length - 1];
    currentChildren.push({
      name: fileName,
      path: asset.path,
      isDirectory: false,
      status: asset.status,
      assetId: asset.id,
      candidate: asset.candidate,
    });
  }
  sortTree(root);
  return root;
}

function useAssetTree(assets, dirs) {
  return reactExports.useMemo(
    () => buildAssetTree(assets, dirs),
    [assets, dirs],
  );
}

export function useFileExplorerWorkspaceDirs({
  rootPath,
  assets,
  gatewayFetch,
  queryClient,
}) {
  const { subscribe: subscribeToWS } = useWorkspaceWSConnection();
  const { data: dirsData } = useQuery({
    queryKey: ["workspace-dirs", rootPath],
    queryFn: async () => {
      const res = await gatewayFetch(API_PATHS.listDirs);
      if (!res.ok) {
        throw new Error(`listDirs failed: ${res.status} ${res.statusText}`);
      }
      return await res.json();
    },
    enabled: !!rootPath,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const dirs = reactExports.useMemo(() => dirsData?.dirs ?? [], [dirsData]);
  const assetTree = useAssetTree(assets, dirs);
  const invalidateDirs = reactExports.useCallback(() => {
    if (!rootPath) return;
    queryClient.invalidateQueries({
      queryKey: ["workspace-dirs", rootPath],
    });
  }, [queryClient, rootPath]);
  reactExports.useEffect(() => {
    if (!rootPath) return;
    return subscribeToWS((msg) => {
      if (msg.type !== "dirs_changed") return;
      queryClient.invalidateQueries({
        queryKey: ["workspace-dirs", rootPath],
      });
    });
  }, [subscribeToWS, queryClient, rootPath]);
  return {
    assetTree,
    invalidateDirs,
  };
}
