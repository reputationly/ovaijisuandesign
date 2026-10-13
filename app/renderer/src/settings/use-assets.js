// use-assets.js
import { API_PATHS, reactExports, useMutation, useQuery, useQueryClient, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
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

async function fetchAssets(gatewayFetch) {
  const res = await gatewayFetch(API_PATHS.allAssets);
  const data = await res.json();
  return [...data.assets];
}

async function renameAsset(gatewayFetch, params) {
  await gatewayFetch(API_PATHS.rename, {
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

async function removeAssets(gatewayFetch, params) {
  await gatewayFetch(API_PATHS.deleteFiles, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paths: params.paths,
    }),
  });
}

async function moveAssets(gatewayFetch, params) {
  await gatewayFetch(API_PATHS.move, {
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

async function readContent(gatewayFetch, params) {
  const res = await gatewayFetch(API_PATHS.readContent(params.path));
  const data = await res.json();
  return data.content;
}

async function writeContent(gatewayFetch, params) {
  const res = await gatewayFetch(API_PATHS.writeContent, {
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

async function mergeCandidateAsset(gatewayFetch, params) {
  await gatewayFetch(API_PATHS.mergeMissingCandidate(params.id), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      candidateId: params.candidateId,
    }),
  });
}

async function removeMissingAsset(gatewayFetch, params) {
  await gatewayFetch(API_PATHS.removeMissing(params.id), {
    method: "POST",
  });
}

async function manualLocateAsset(gatewayFetch, params) {
  await gatewayFetch(API_PATHS.locateMissing(params.id), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      newPath: params.newPath,
    }),
  });
}

async function duplicateFiles(gatewayFetch, params) {
  const res = await gatewayFetch(API_PATHS.duplicateFiles, {
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
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const gatewayFetch = useGatewayFetch();
  const gatewayScopeKey = useGatewayScopeKey();
  const contentPath = options?.contentPath;
  const enabled = options?.enabled ?? true;
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: [...ASSETS_QUERY_KEY, gatewayScopeKey],
    queryFn: () => fetchAssets(gatewayFetch),
    staleTime: Number.POSITIVE_INFINITY,
    enabled,
  });
  const assets = reactExports.useMemo(() => data ?? [], [data]);
  const refresh = reactExports.useCallback(async () => {
    await refreshAssetIndex({
      qc: queryClient,
      gatewayScopeKey,
    });
  }, [gatewayScopeKey, queryClient]);
  const renameMutation = useMutation({
    mutationFn: (params) => renameAsset(gatewayFetch, params),
  });
  const removeMutation = useMutation({
    mutationFn: (params) => removeAssets(gatewayFetch, params),
    // Optimistic UI: hide the rows immediately. The chokidar watcher in
    // @hilo/assets has a RENAME_GRACE_MS window before it fires `unlink`
    // (so it can promote unlink+add pairs into renames without losing
    // asset_id). That guarantees correctness for moves but adds 2-3s of
    // perceived latency on plain deletes. We close that gap client-side
    // and let the eventual `asset_changed` WS event reconcile.
    onMutate: async (params) => {
      const snapshot = await optimisticallyRemoveAssets({
        qc: queryClient,
        gatewayScopeKey,
        paths: params.paths,
      });
      return {
        snapshot,
      };
    },
    onError: (_err, _params, context) => {
      rollbackAssetListSnapshot({
        qc: queryClient,
        snapshot: context?.snapshot,
      });
    },
  });
  const moveMutation = useMutation({
    mutationFn: (params) => moveAssets(gatewayFetch, params),
  });
  const writeContentMutation = useMutation({
    mutationFn: (params) => writeContent(gatewayFetch, params),
    onSuccess: (data, variables) => {
      void refreshFileContent({
        qc: queryClient,
        gatewayScopeKey,
        path: variables.path,
      });
      if (data.enrollError) {
        dedupedToast.warning(
          t("assets.uploadEnrollFailed", {
            error: data.enrollError,
          }),
        );
      }
    },
  });
  const mergeCandidateMutation = useMutation({
    mutationFn: (params) => mergeCandidateAsset(gatewayFetch, params),
  });
  const removeMissingMutation = useMutation({
    mutationFn: (params) => removeMissingAsset(gatewayFetch, params),
  });
  const manualLocateMutation = useMutation({
    mutationFn: (params) => manualLocateAsset(gatewayFetch, params),
  });
  const duplicateMutation = useMutation({
    mutationFn: (params) => duplicateFiles(gatewayFetch, params),
    onSuccess: () =>
      void refreshAssetIndex({
        qc: queryClient,
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
      readContent(gatewayFetch, {
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
    readContent: (params) => readContent(gatewayFetch, params),
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
