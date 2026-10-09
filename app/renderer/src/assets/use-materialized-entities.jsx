// use-materialized-entities.jsx
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import {
  API_PATHS,
  useCurrentWorkspace,
  useMutation,
  usePlatform,
  useQuery,
  useQueryClient,
} from "../vendor.js";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { CoachMarkPopup } from "../workspace/coach-mark-popup.jsx";
import { useCoachMark } from "../workspace/use-coach-mark.js";
import {
  BASE,
  readEnvelope$1,
  readObject,
  ROOT_KEY$1,
  useAssetCenterFetcher,
} from "./wrap-as-asset-center-error.js";
import { jsonInit } from "../infra/use-online.jsx";

export function CoachMark({
  markId,
  enabled = true,
  persistOnOpen = false,
  ...uiProps
}) {
  const { isOpen, dismiss, onPointerEnter, onPointerLeave } = useCoachMark(
    markId,
    enabled,
    {
      persistOnOpen,
    },
  );
  return (
    <CoachMarkPopup
      {...uiProps}
      open={isOpen}
      onDismiss={dismiss}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      actionUiId={`coach-mark-${markId}`}
    />
  );
}

export const ASSET_CENTER_RELOCATION_SPOTLIGHT = false;

async function dropEntityToCanvas(fetcher, entityId, input) {
  const res = await fetcher(
    `${BASE}/entities/${encodeURIComponent(entityId)}/drop-to-canvas`,
    jsonInit("POST", input),
  );
  return readObject(res, "drop-to-canvas result");
}

async function appendAttachmentFromWorkspace(fetcher, entityId, input) {
  const res = await fetcher(
    `${BASE}/entities/${encodeURIComponent(entityId)}/attachments-from-workspace`,
    jsonInit("POST", input),
  );
  return readEnvelope$1(res, "attachment", "appended attachment");
}

export function useMaterializedEntities() {
  const platform2 = usePlatform();
  const workspacePath = useCurrentWorkspace();
  return useQuery({
    queryKey: ["materialized-entities", workspacePath],
    queryFn: async () => {
      if (!workspacePath) return [];
      try {
        const res = await gatewayFetch(
          API_PATHS.assetCenterWorkspaceRefs(workspacePath),
        );
        const data2 = await res.json();
        return data2.refs.map((r2) => ({
          entityId: r2.entityId,
          materializedAt: r2.materializedAt,
        }));
      } catch {}
      try {
        const matDir = `${workspacePath}/.hilo/materialized-entities`;
        const entries2 = await platform2.fs.readDir(matDir);
        return entries2
          .filter((e2) => e2.isDirectory || e2.isSymbolicLink)
          .map((e2) => ({
            entityId: e2.name,
          }));
      } catch {
        return [];
      }
    },
    enabled: Boolean(workspacePath),
    staleTime: 3e4,
  });
}

export function trackAssetPromoteValidationFailed(props) {
  trackEvent(TRACK_EVENTS.ASSET_PROMOTE_VALIDATION_FAILED, props);
}

export function trackAssetUse(props) {
  trackEvent(TRACK_EVENTS.ASSET_USE, props);
}

export function useDropEntityToCanvas() {
  const queryClient2 = useQueryClient();
  const fetcher = useAssetCenterFetcher();
  return useMutation({
    mutationFn: ({ entityId, input }) =>
      dropEntityToCanvas(fetcher, entityId, input),
    onSuccess: () => {
      queryClient2.invalidateQueries({
        queryKey: ROOT_KEY$1,
      });
    },
  });
}

export function useAppendAttachmentFromWorkspace() {
  const queryClient2 = useQueryClient();
  const fetcher = useAssetCenterFetcher();
  return useMutation({
    mutationFn: ({ entityId, input }) =>
      appendAttachmentFromWorkspace(fetcher, entityId, input),
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
