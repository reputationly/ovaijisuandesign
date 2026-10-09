// build-asset-tree.js
import { API_PATHS, reactExports, useQuery } from "../vendor.js";
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

function sortTree(entries2) {
  entries2.sort((a2, b3) => {
    if (a2.isDirectory !== b3.isDirectory) return a2.isDirectory ? -1 : 1;
    return a2.name.localeCompare(b3.name);
  });
  for (const entry of entries2) {
    if (entry.children) sortTree(entry.children);
  }
}

function buildAssetTree(assets, dirs) {
  const root2 = [];
  const dirMap = new Map();
  const seenPaths = new Set();
  if (dirs && dirs.length > 0) {
    const sortedDirs = [...dirs].sort(
      (a2, b3) => a2.split("/").length - b3.split("/").length,
    );
    for (const dirPath of sortedDirs) {
      if (!dirPath) continue;
      const segments = dirPath.split("/");
      let currentChildren = root2;
      let currentPath = "";
      for (const segment of segments) {
        if (!segment) continue;
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        const node2 = ensureDirNode(
          currentPath,
          currentChildren,
          dirMap,
          segment,
        );
        currentChildren = node2.children ?? [];
      }
    }
  }
  for (const asset of assets) {
    if (seenPaths.has(asset.path)) continue;
    seenPaths.add(asset.path);
    const segments = asset.path.split("/");
    let currentChildren = root2;
    let currentPath = "";
    for (let i2 = 0; i2 < segments.length - 1; i2++) {
      const segment = segments[i2];
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const node2 = ensureDirNode(
        currentPath,
        currentChildren,
        dirMap,
        segment,
      );
      currentChildren = node2.children ?? [];
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
  sortTree(root2);
  return root2;
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
  gatewayFetch: gatewayFetch2,
  queryClient: queryClient2,
}) {
  const { subscribe: subscribeToWS } = useWorkspaceWSConnection();
  const { data: dirsData } = useQuery({
    queryKey: ["workspace-dirs", rootPath],
    queryFn: async () => {
      const res = await gatewayFetch2(API_PATHS.listDirs);
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
    queryClient2.invalidateQueries({
      queryKey: ["workspace-dirs", rootPath],
    });
  }, [queryClient2, rootPath]);
  reactExports.useEffect(() => {
    if (!rootPath) return;
    return subscribeToWS((msg) => {
      if (msg.type !== "dirs_changed") return;
      queryClient2.invalidateQueries({
        queryKey: ["workspace-dirs", rootPath],
      });
    });
  }, [subscribeToWS, queryClient2, rootPath]);
  return {
    assetTree,
    invalidateDirs,
  };
}
