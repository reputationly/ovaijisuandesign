// use-materialize-entity.js
import { classifyAssetError, jsonInit } from "../infra/use-online.jsx";
import {
  assetCenterKeys,
  BASE,
  readEnvelope$1,
  readObject,
  ROOT_KEY$1,
  useAssetCenterFetcher,
} from "./wrap-as-asset-center-error.js";
import { useMutation, useQuery, useQueryClient } from "../vendor.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";

async function getEntityCanvas(fetcher, entityId) {
  const res = await fetcher(
    `${BASE}/entities/${encodeURIComponent(entityId)}?fields=canvas`,
  );
  return readEnvelope$1(res, "entity", "entity canvas");
}

async function updateEntity(fetcher, entityId, input) {
  const res = await fetcher(
    `${BASE}/entities/${encodeURIComponent(entityId)}`,
    jsonInit("PATCH", input),
  );
  return readEnvelope$1(res, "entity", "updated entity");
}

async function deleteEntityGlobal(fetcher, entityId) {
  const res = await fetcher(
    `${BASE}/entities/${encodeURIComponent(entityId)}`,
    {
      method: "DELETE",
    },
  );
  return readObject(res, "delete entity result");
}

async function materializeEntity(fetcher, entityId, input) {
  const res = await fetcher(
    `${BASE}/entities/${encodeURIComponent(entityId)}/materialize`,
    jsonInit("POST", input),
  );
  return readObject(res, "materialize result");
}

async function createEntityFromPaths(fetcher, input) {
  const res = await fetcher(`${BASE}/entities-from-paths`, {
    ...jsonInit("POST", input),
    // Larger files (videos / audio) can take seconds to copy disk-to-disk
    // server-side; 5 minutes is generous and matches the migrate cap.
    timeoutMs: 3e5,
  });
  return readEnvelope$1(res, "entity", "created entity from paths");
}

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
    mutationFn: ({ entityId, input }) =>
      materializeEntity(fetcher, entityId, input),
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
