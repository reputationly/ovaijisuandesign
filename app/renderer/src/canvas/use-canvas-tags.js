// use-canvas-tags.js
import { API_PATHS } from "../infra/workspace-gateway.js";
import reactExports from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAssetMetadataApi } from "../infra/agent-http-client.js";
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

function createJsonMutationRequest(method, body) {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

export function useCanvasTags() {
  const gatewayFetch = useGatewayFetch();
  const gatewayScopeKey = useGatewayScopeKey();
  const queryClient = useQueryClient();
  const assetMetadataStore = useAssetMetadataApi();
  const queryKey = canvasTagRegistryQueryKey(gatewayScopeKey);
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchTagRegistry(gatewayFetch),
    staleTime: Number.POSITIVE_INFINITY,
  });
  const registry = reactExports.useMemo(
    () => normalizeTagRegistry(data ?? seedTagRegistry()),
    [data],
  );
  const refreshAssets = reactExports.useCallback(
    () =>
      refreshAssetIndex({
        qc: queryClient,
        gatewayScopeKey,
      }),
    [gatewayScopeKey, queryClient],
  );
  const recoverRegistryAfterError = reactExports.useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey,
    });
  }, [queryClient, queryKey]);
  const saveTagsMutation = useMutation({
    mutationFn: async (request) => {
      const res = await gatewayFetch(
        API_PATHS.assetTagMutationsBatch,
        createJsonMutationRequest("PATCH", request),
      );
      return await res.json();
    },
    onSuccess: (body) => {
      for (const asset of body.updatedAssets) {
        assetMetadataStore.getState().mergeAsset(asset.id, {
          tagIds: asset.tagIds,
        });
      }
    },
  });
  const updateAssignments = reactExports.useCallback(
    async (tagId, assets, mode) => {
      if (assets.length === 0) return;
      const uniqueAssets = deduplicateCanvasTagAssets(assets);
      const shouldRemove =
        mode === "toggle" && aggregateTagState(tagId, uniqueAssets) === "all";
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
    async (tagName, assets) => {
      try {
        const res = await gatewayFetch(
          API_PATHS.canvasTags,
          createJsonMutationRequest("POST", {
            name: tagName,
            kind: "keyword",
            revision: registry.revision,
          }),
        );
        const body = await res.json();
        queryClient.setQueryData(queryKey, body.registry);
        if (assets?.length)
          await updateAssignments(body.tag.id, assets, "assign");
        return body.tag;
      } catch (error) {
        await recoverRegistryAfterError();
        throw error;
      }
    },
    [
      gatewayFetch,
      queryClient,
      queryKey,
      recoverRegistryAfterError,
      registry.revision,
      updateAssignments,
    ],
  );
  const updateTag = reactExports.useCallback(
    async (tagId, patch) => {
      try {
        const res = await gatewayFetch(
          API_PATHS.canvasTag(tagId),
          createJsonMutationRequest("PATCH", {
            ...patch,
            revision: registry.revision,
          }),
        );
        const body = await res.json();
        queryClient.setQueryData(queryKey, body.registry);
        return body.tag;
      } catch (error) {
        await recoverRegistryAfterError();
        throw error;
      }
    },
    [
      gatewayFetch,
      queryClient,
      queryKey,
      recoverRegistryAfterError,
      registry.revision,
    ],
  );
  const reorderTags = reactExports.useCallback(
    async (tagIds) => {
      try {
        const res = await gatewayFetch(
          API_PATHS.canvasTagOrder,
          createJsonMutationRequest("PUT", {
            tagIds,
            revision: registry.revision,
          }),
        );
        const body = await res.json();
        queryClient.setQueryData(queryKey, body.registry);
      } catch (error) {
        await recoverRegistryAfterError();
        throw error;
      }
    },
    [
      gatewayFetch,
      queryClient,
      queryKey,
      recoverRegistryAfterError,
      registry.revision,
    ],
  );
  const getTagImpact = reactExports.useCallback(
    async (tagId) => {
      const res = await gatewayFetch(API_PATHS.canvasTagImpact(tagId));
      return await res.json();
    },
    [gatewayFetch],
  );
  const deleteTag = reactExports.useCallback(
    async (tagId) => {
      try {
        const res = await gatewayFetch(
          API_PATHS.canvasTag(tagId),
          createJsonMutationRequest("DELETE", {
            revision: registry.revision,
          }),
        );
        const body = await res.json();
        queryClient.setQueryData(queryKey, body.registry);
        for (const asset of body.updatedAssets) {
          assetMetadataStore.getState().mergeAsset(asset.id, {
            tagIds: asset.tagIds,
          });
        }
        await refreshAssets();
        return body;
      } catch (error) {
        await recoverRegistryAfterError();
        throw error;
      }
    },
    [
      assetMetadataStore,
      gatewayFetch,
      queryClient,
      queryKey,
      recoverRegistryAfterError,
      refreshAssets,
      registry.revision,
    ],
  );
  return {
    registry,
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
