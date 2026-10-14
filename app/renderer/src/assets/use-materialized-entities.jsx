// use-materialized-entities.jsx
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { API_PATHS } from "../infra/workspace-gateway.js";
import { useCurrentWorkspace } from "../infra/shared-runtime.js";
import { usePlatform } from "../infra/platform-context.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { CoachMarkPopup } from "../workspace/coach-mark-popup.jsx";
import { useCoachMark } from "../workspace/use-coach-mark.js";
import {
  BASE,
  readEnvelope,
  readObject,
  ROOT_KEY,
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
  return readEnvelope(res, "attachment", "appended attachment");
}
export function useMaterializedEntities() {
  const platform = usePlatform();
  const workspacePath = useCurrentWorkspace();
  return useQuery({
    queryKey: ["materialized-entities", workspacePath],
    queryFn: async () => {
      if (!workspacePath) return [];
      try {
        const res = await gatewayFetch(
          API_PATHS.assetCenterWorkspaceRefs(workspacePath),
        );
        const data = await res.json();
        return data.refs.map((workspaceRef) => ({
          entityId: workspaceRef.entityId,
          materializedAt: workspaceRef.materializedAt,
        }));
      } catch {}
      try {
        const matDir = `${workspacePath}/.hilo/materialized-entities`;
        const entries = await platform.fs.readDir(matDir);
        return entries
          .filter((entry) => entry.isDirectory || entry.isSymbolicLink)
          .map((entry) => ({
            entityId: entry.name,
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
  const queryClient = useQueryClient();
  const fetcher = useAssetCenterFetcher();
  return useMutation({
    mutationFn: ({ entityId, input }) =>
      dropEntityToCanvas(fetcher, entityId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ROOT_KEY,
      });
    },
  });
}
export function useAppendAttachmentFromWorkspace() {
  const queryClient = useQueryClient();
  const fetcher = useAssetCenterFetcher();
  return useMutation({
    mutationFn: ({ entityId, input }) =>
      appendAttachmentFromWorkspace(fetcher, entityId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ROOT_KEY,
      });
      queryClient.invalidateQueries({
        queryKey: ["materialized-entities"],
      });
    },
  });
}
