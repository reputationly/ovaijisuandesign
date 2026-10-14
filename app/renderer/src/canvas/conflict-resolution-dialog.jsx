// conflict-resolution-dialog.jsx
import { API_PATHS } from "../infra/workspace-gateway.js";
import reactExports from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { normalizeTagRegistry } from "../infra/normalize-v2-registry.js";
import { canvasTagRegistryQueryKey } from "../workspace/asset-lineage-query-key.js";
import {
  useGatewayFetch,
  useGatewayScopeKey,
} from "../generation/use-model-catalog-scope-key.js";
import { seedTagRegistry } from "../infra/parse-connector-selection.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { AlertDialog, Button } from "../infra/dialog-content.jsx";
import {
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../infra/badge-variants.jsx";
import { Checkbox } from "../infra/checkbox.jsx";
export async function fetchTagRegistry(gatewayFetch) {
  const res = await gatewayFetch(API_PATHS.tagRegistry);
  const data = await res.json();
  return normalizeTagRegistry(data.registry);
}
export function useTagRegistry() {
  const gatewayFetch = useGatewayFetch();
  const gatewayScopeKey = useGatewayScopeKey();
  const { data } = useQuery({
    queryKey: canvasTagRegistryQueryKey(gatewayScopeKey),
    queryFn: () => fetchTagRegistry(gatewayFetch),
    staleTime: Number.POSITIVE_INFINITY,
  });
  return reactExports.useMemo(
    () => normalizeTagRegistry(data ?? seedTagRegistry()),
    [data],
  );
}
export function aggregateTagState(tagId, assets) {
  if (assets.length === 0) return "none";
  let have = 0;
  for (const asset of assets) {
    if ((asset.tagIds ?? []).includes(tagId)) have += 1;
  }
  if (have === 0) return "none";
  if (have === assets.length) return "all";
  return "mixed";
}
export function ConflictResolutionDialog({
  open,
  conflict,
  remainingCount,
  onDecision,
  onDismiss,
}) {
  const { t: translate } = useTranslation();
  const [applyToAll, setApplyToAll] = reactExports.useState(false);
  const isFolder = conflict?.existingKind === "folder";
  const showApplyToAll = remainingCount > 0;
  const decide = (decision) => {
    const snapshotApplyToAll = applyToAll;
    setApplyToAll(false);
    onDecision(decision, snapshotApplyToAll);
  };
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onDismiss();
      }}
    >
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isFolder
              ? translate("fileExplorer.folderAlreadyExists")
              : translate("fileExplorer.fileAlreadyExists")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {translate("fileExplorer.conflictDescription", {
              name: conflict?.name ?? "",
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {showApplyToAll && (
          <div className="hilo-checkbox-label flex items-center text-xs text-muted-foreground">
            <Checkbox
              id="apply-to-remaining-conflicts"
              checked={applyToAll}
              onCheckedChange={(value) => setApplyToAll(value === true)}
            />
            <label
              htmlFor="apply-to-remaining-conflicts"
              className="cursor-pointer"
            >
              {translate("fileExplorer.applyToRemaining", {
                count: remainingCount,
              })}
            </label>
          </div>
        )}
        <AlertDialogFooter className="!flex !flex-row !justify-end !gap-2">
          <Button
            variant="ghost"
            onClick={() => decide("skip")}
            data-action-ui-id="asset-panel.conflict-skip"
          >
            {translate("common.cancel")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => decide("rename")}
            data-action-ui-id="asset-panel.conflict-rename"
          >
            {translate("fileExplorer.conflictRename")}
          </Button>
          <AlertDialogAction
            variant="destructive"
            disabled={isFolder}
            onClick={() => decide("overwrite")}
            data-action-ui-id="asset-panel.conflict-overwrite"
          >
            {translate("fileExplorer.conflictOverwrite")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
