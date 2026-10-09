// use-assets.js
import {
  API_PATHS,
  dedupedToast,
  reactExports,
  useMutation,
  useQuery,
  useQueryClient,
  useTranslation,
} from "../vendor.js";
import {
  ASSETS_QUERY_KEY,
  FILE_CONTENT_QUERY_KEY,
  refreshFileContent,
} from "../assets/credit-query-keys.jsx";
import { refreshAssetIndex } from "../assets/gateway-scope-provider.jsx";
import {
  useGatewayFetch,
  useGatewayScopeKey,
} from "../generation/use-model-catalog-scope-key.js";
import {
  optimisticallyRemoveAssets,
  rollbackAssetListSnapshot,
} from "../infra/error-boundary.jsx";

async function fetchAssets(gatewayFetch2) {
  const res = await gatewayFetch2(API_PATHS.allAssets);
  const data2 = await res.json();
  return [...data2.assets];
}

async function renameAsset(gatewayFetch2, params) {
  await gatewayFetch2(API_PATHS.rename, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: params.path,
      new_name: params.newName,
    }),
  });
}

async function removeAssets(gatewayFetch2, params) {
  await gatewayFetch2(API_PATHS.deleteFiles, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paths: params.paths,
    }),
  });
}

async function moveAssets(gatewayFetch2, params) {
  await gatewayFetch2(API_PATHS.move, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paths: params.paths,
      target: params.target,
    }),
  });
}

async function readContent(gatewayFetch2, params) {
  const res = await gatewayFetch2(API_PATHS.readContent(params.path));
  const data2 = await res.json();
  return data2.content;
}

async function writeContent(gatewayFetch2, params) {
  const res = await gatewayFetch2(API_PATHS.writeContent, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: params.path,
      content: params.content,
    }),
  });
  return await res.json();
}

async function mergeCandidateAsset(gatewayFetch2, params) {
  await gatewayFetch2(API_PATHS.mergeMissingCandidate(params.id), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      candidateId: params.candidateId,
    }),
  });
}

async function removeMissingAsset(gatewayFetch2, params) {
  await gatewayFetch2(API_PATHS.removeMissing(params.id), {
    method: "POST",
  });
}

async function manualLocateAsset(gatewayFetch2, params) {
  await gatewayFetch2(API_PATHS.locateMissing(params.id), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      newPath: params.newPath,
    }),
  });
}

async function duplicateFiles(gatewayFetch2, params) {
  const res = await gatewayFetch2(API_PATHS.duplicateFiles, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paths: params.paths,
    }),
  });
  return await res.json();
}

export function useAssets(options) {
  const queryClient2 = useQueryClient();
  const { t: t2 } = useTranslation();
  const gatewayFetch2 = useGatewayFetch();
  const gatewayScopeKey = useGatewayScopeKey();
  const contentPath = options?.contentPath;
  const enabled = options?.enabled ?? true;
  const {
    data: data2,
    isLoading,
    error,
  } = useQuery({
    queryKey: [...ASSETS_QUERY_KEY, gatewayScopeKey],
    queryFn: () => fetchAssets(gatewayFetch2),
    staleTime: Number.POSITIVE_INFINITY,
    enabled,
  });
  const assets = reactExports.useMemo(() => data2 ?? [], [data2]);
  const refresh = reactExports.useCallback(async () => {
    await refreshAssetIndex({
      qc: queryClient2,
      gatewayScopeKey,
    });
  }, [gatewayScopeKey, queryClient2]);
  const renameMutation = useMutation({
    mutationFn: (params) => renameAsset(gatewayFetch2, params),
  });
  const removeMutation = useMutation({
    mutationFn: (params) => removeAssets(gatewayFetch2, params),
    // Optimistic UI: hide the rows immediately. The chokidar watcher in
    // @hilo/assets has a RENAME_GRACE_MS window before it fires `unlink`
    // (so it can promote unlink+add pairs into renames without losing
    // asset_id). That guarantees correctness for moves but adds 2-3s of
    // perceived latency on plain deletes. We close that gap client-side
    // and let the eventual `asset_changed` WS event reconcile.
    onMutate: async (params) => {
      const snapshot2 = await optimisticallyRemoveAssets({
        qc: queryClient2,
        gatewayScopeKey,
        paths: params.paths,
      });
      return {
        snapshot: snapshot2,
      };
    },
    onError: (_err, _params, context) => {
      rollbackAssetListSnapshot({
        qc: queryClient2,
        snapshot: context?.snapshot,
      });
    },
  });
  const moveMutation = useMutation({
    mutationFn: (params) => moveAssets(gatewayFetch2, params),
  });
  const writeContentMutation = useMutation({
    mutationFn: (params) => writeContent(gatewayFetch2, params),
    onSuccess: (data22, variables) => {
      void refreshFileContent({
        qc: queryClient2,
        gatewayScopeKey,
        path: variables.path,
      });
      if (data22.enrollError) {
        dedupedToast.warning(
          t2("assets.uploadEnrollFailed", {
            error: data22.enrollError,
          }),
        );
      }
    },
  });
  const mergeCandidateMutation = useMutation({
    mutationFn: (params) => mergeCandidateAsset(gatewayFetch2, params),
  });
  const removeMissingMutation = useMutation({
    mutationFn: (params) => removeMissingAsset(gatewayFetch2, params),
  });
  const manualLocateMutation = useMutation({
    mutationFn: (params) => manualLocateAsset(gatewayFetch2, params),
  });
  const duplicateMutation = useMutation({
    mutationFn: (params) => duplicateFiles(gatewayFetch2, params),
    onSuccess: () =>
      void refreshAssetIndex({
        qc: queryClient2,
        gatewayScopeKey,
      }),
  });
  const contentEnabled = contentPath != null && contentPath.length > 0;
  const {
    data: fileContent,
    isLoading: contentLoading,
    error: contentError,
  } = useQuery({
    queryKey: [...FILE_CONTENT_QUERY_KEY, gatewayScopeKey, contentPath],
    queryFn: () =>
      readContent(gatewayFetch2, {
        path: contentPath,
      }),
    enabled: contentEnabled,
    staleTime: Number.POSITIVE_INFINITY,
  });
  return {
    assets,
    loading: isLoading,
    error: error ?? null,
    refresh,
    rename: renameMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    move: moveMutation.mutateAsync,
    readContent: (params) => readContent(gatewayFetch2, params),
    writeContent: writeContentMutation.mutateAsync,
    mergeCandidate: mergeCandidateMutation.mutateAsync,
    removeMissing: removeMissingMutation.mutateAsync,
    manualLocate: manualLocateMutation.mutateAsync,
    duplicate: duplicateMutation.mutateAsync,
    fileContent,
    contentLoading: contentEnabled ? contentLoading : false,
    contentError: contentError ?? null,
  };
}
