// use-canvas-tags.js
import {
  API_PATHS,
  reactExports,
  useAssetMetadataApi,
  useMutation,
  useQuery,
  useQueryClient,
} from "../vendor.js";
import {
  aggregateTagState,
  fetchTagRegistry,
} from "./conflict-resolution-dialog.jsx";
import { refreshAssetIndex } from "../assets/gateway-scope-provider.jsx";
import { canvasTagRegistryQueryKey } from "../workspace/asset-lineage-query-key.js";
import {
  useGatewayFetch,
  useGatewayScopeKey,
} from "../generation/use-model-catalog-scope-key.js";
import { normalizeTagRegistry } from "../infra/normalize-v2-registry.js";
import { seedTagRegistry } from "../infra/parse-connector-selection.js";

function deduplicateCanvasTagAssets(assets) {
  const uniqueAssets = [];
  const seenAssetIds = new Set();
  for (const asset of assets) {
    if (seenAssetIds.has(asset.id)) continue;
    seenAssetIds.add(asset.id);
    uniqueAssets.push(asset);
  }
  return uniqueAssets;
}

function createJsonMutationRequest(method, body2) {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body2),
  };
}

export function useCanvasTags() {
  const gatewayFetch2 = useGatewayFetch();
  const gatewayScopeKey = useGatewayScopeKey();
  const queryClient2 = useQueryClient();
  const assetMetadataStore = useAssetMetadataApi();
  const queryKey = canvasTagRegistryQueryKey(gatewayScopeKey);
  const { data: data2, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchTagRegistry(gatewayFetch2),
    staleTime: Number.POSITIVE_INFINITY,
  });
  const registry2 = reactExports.useMemo(
    () => normalizeTagRegistry(data2 ?? seedTagRegistry()),
    [data2],
  );
  const refreshAssets = reactExports.useCallback(
    () =>
      refreshAssetIndex({
        qc: queryClient2,
        gatewayScopeKey,
      }),
    [gatewayScopeKey, queryClient2],
  );
  const recoverRegistryAfterError = reactExports.useCallback(async () => {
    await queryClient2.invalidateQueries({
      queryKey,
    });
  }, [queryClient2, queryKey]);
  const saveTagsMutation = useMutation({
    mutationFn: async (request) => {
      const res = await gatewayFetch2(
        API_PATHS.assetTagMutationsBatch,
        createJsonMutationRequest("PATCH", request),
      );
      return await res.json();
    },
    onSuccess: (body2) => {
      for (const asset of body2.updatedAssets) {
        assetMetadataStore.getState().mergeAsset(asset.id, {
          tagIds: asset.tagIds,
        });
      }
    },
  });
  const updateAssignments = reactExports.useCallback(
    async (tagId, assets, mode2) => {
      if (assets.length === 0) return;
      const uniqueAssets = deduplicateCanvasTagAssets(assets);
      const shouldRemove =
        mode2 === "toggle" && aggregateTagState(tagId, uniqueAssets) === "all";
      await saveTagsMutation.mutateAsync({
        assetIds: uniqueAssets.map((asset) => asset.id),
        tagId,
        operation: shouldRemove ? "remove" : "assign",
      });
      await refreshAssets();
    },
    [refreshAssets, saveTagsMutation],
  );
  const toggleTagForAssets = reactExports.useCallback(
    (tagId, assets) => updateAssignments(tagId, assets, "toggle"),
    [updateAssignments],
  );
  const assignTagToAssets = reactExports.useCallback(
    (tagId, assets) => updateAssignments(tagId, assets, "assign"),
    [updateAssignments],
  );
  const createTag = reactExports.useCallback(
    async (name2, assets) => {
      try {
        const res = await gatewayFetch2(
          API_PATHS.canvasTags,
          createJsonMutationRequest("POST", {
            name: name2,
            kind: "keyword",
            revision: registry2.revision,
          }),
        );
        const body2 = await res.json();
        queryClient2.setQueryData(queryKey, body2.registry);
        if (assets?.length)
          await updateAssignments(body2.tag.id, assets, "assign");
        return body2.tag;
      } catch (error) {
        await recoverRegistryAfterError();
        throw error;
      }
    },
    [
      gatewayFetch2,
      queryClient2,
      queryKey,
      recoverRegistryAfterError,
      registry2.revision,
      updateAssignments,
    ],
  );
  const updateTag = reactExports.useCallback(
    async (tagId, patch2) => {
      try {
        const res = await gatewayFetch2(
          API_PATHS.canvasTag(tagId),
          createJsonMutationRequest("PATCH", {
            ...patch2,
            revision: registry2.revision,
          }),
        );
        const body2 = await res.json();
        queryClient2.setQueryData(queryKey, body2.registry);
        return body2.tag;
      } catch (error) {
        await recoverRegistryAfterError();
        throw error;
      }
    },
    [
      gatewayFetch2,
      queryClient2,
      queryKey,
      recoverRegistryAfterError,
      registry2.revision,
    ],
  );
  const reorderTags = reactExports.useCallback(
    async (tagIds) => {
      try {
        const res = await gatewayFetch2(
          API_PATHS.canvasTagOrder,
          createJsonMutationRequest("PUT", {
            tagIds,
            revision: registry2.revision,
          }),
        );
        const body2 = await res.json();
        queryClient2.setQueryData(queryKey, body2.registry);
      } catch (error) {
        await recoverRegistryAfterError();
        throw error;
      }
    },
    [
      gatewayFetch2,
      queryClient2,
      queryKey,
      recoverRegistryAfterError,
      registry2.revision,
    ],
  );
  const getTagImpact = reactExports.useCallback(
    async (tagId) => {
      const res = await gatewayFetch2(API_PATHS.canvasTagImpact(tagId));
      return await res.json();
    },
    [gatewayFetch2],
  );
  const deleteTag = reactExports.useCallback(
    async (tagId) => {
      try {
        const res = await gatewayFetch2(
          API_PATHS.canvasTag(tagId),
          createJsonMutationRequest("DELETE", {
            revision: registry2.revision,
          }),
        );
        const body2 = await res.json();
        queryClient2.setQueryData(queryKey, body2.registry);
        for (const asset of body2.updatedAssets) {
          assetMetadataStore.getState().mergeAsset(asset.id, {
            tagIds: asset.tagIds,
          });
        }
        await refreshAssets();
        return body2;
      } catch (error) {
        await recoverRegistryAfterError();
        throw error;
      }
    },
    [
      assetMetadataStore,
      gatewayFetch2,
      queryClient2,
      queryKey,
      recoverRegistryAfterError,
      refreshAssets,
      registry2.revision,
    ],
  );
  return {
    registry: registry2,
    isLoading,
    toggleTagForAssets,
    assignTagToAssets,
    createTag,
    updateTag,
    reorderTags,
    getTagImpact,
    deleteTag,
  };
}
