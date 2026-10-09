// shared/use-materialize-entity.js
import { useQueryClient, useMutation, useQuery } from "../../vendor.js";
import { ROOT_KEY$1, useAssetCenterFetcher, assetCenterKeys } from "../../m15/check-cloud-asset-upload.js";
import { TRACK_EVENTS } from "../../m15/track-events.js";
import { trackEvent } from "./init-track.js";
import {
  classifyAssetError,
  createEntity,
  deleteEntityGlobal,
  getEntityCanvas,
  materializeEntity,
  updateEntity,
} from "./misc-02.jsx";
import { createEntityFromPaths } from "./page-state-boundary.jsx";
function trackAssetMaterialize(props) {
  trackEvent(TRACK_EVENTS.ASSET_MATERIALIZE, props);
}
export function useEntityCanvas(entityId) {
  const fetcher = useAssetCenterFetcher();
  return useQuery({
    queryKey: entityId
      ? assetCenterKeys.entityCanvas(entityId)
      : [...ROOT_KEY$1, "entity", "canvas", "noop"],
    queryFn: () => getEntityCanvas(fetcher, entityId),
    enabled: Boolean(entityId),
  });
}
export function useCreateEntity() {
  const queryClient2 = useQueryClient();
  const fetcher = useAssetCenterFetcher();
  return useMutation({
    mutationFn: ({ input }) => createEntity(fetcher, input),
    onSuccess: () => {
      queryClient2.invalidateQueries({
        queryKey: ROOT_KEY$1,
      });
    },
  });
}
export function useCreateEntityFromPaths() {
  const queryClient2 = useQueryClient();
  const fetcher = useAssetCenterFetcher();
  return useMutation({
    mutationFn: ({ input }) => createEntityFromPaths(fetcher, input),
    onSuccess: () => {
      queryClient2.invalidateQueries({
        queryKey: ROOT_KEY$1,
      });
    },
  });
}
export function useUpdateEntity() {
  const queryClient2 = useQueryClient();
  const fetcher = useAssetCenterFetcher();
  return useMutation({
    mutationFn: ({ entityId, input }) => updateEntity(fetcher, entityId, input),
    onSuccess: () => {
      queryClient2.invalidateQueries({
        queryKey: ROOT_KEY$1,
      });
      queryClient2.invalidateQueries({
        queryKey: ["materialized-entities"],
      });
    },
  });
}
export function useDeleteEntity() {
  const queryClient2 = useQueryClient();
  const fetcher = useAssetCenterFetcher();
  return useMutation({
    mutationFn: ({ entityId }) => deleteEntityGlobal(fetcher, entityId),
    onSuccess: () => {
      queryClient2.invalidateQueries({
        queryKey: ROOT_KEY$1,
      });
      queryClient2.invalidateQueries({
        queryKey: ["materialized-entities"],
      });
    },
  });
}
export function useMaterializeEntity() {
  const queryClient2 = useQueryClient();
  const fetcher = useAssetCenterFetcher();
  return useMutation({
    mutationFn: ({ entityId, input }) => materializeEntity(fetcher, entityId, input),
    onSuccess: (_data, variables) => {
      queryClient2.invalidateQueries({
        queryKey: ["materialized-entities", variables.input.workspacePath],
      });
      queryClient2.invalidateQueries({
        queryKey: ["materialized-entities"],
      });
      queryClient2.invalidateQueries({
        queryKey: ROOT_KEY$1,
      });
      if (variables._track) {
        trackAssetMaterialize({
          entity_id: variables.entityId,
          entity_type: variables._track.entity_type,
          trigger: variables._track.trigger,
          success: true,
        });
      }
    },
    onError: (err, variables) => {
      if (variables._track) {
        trackAssetMaterialize({
          entity_id: variables.entityId,
          entity_type: variables._track.entity_type,
          trigger: variables._track.trigger,
          success: false,
          error_type: classifyAssetError(err),
        });
      }
    },
  });
}
