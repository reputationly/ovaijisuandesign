// materialize-workspace-dialog.jsx
import { CheckCircle2 as CheckCircle, Loader2, reactExports, ShieldAlert, usePlatform, useStorage, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { getFileManagerLabelKey } from "../settings/request-prompt-prefill.jsx";
import { FolderOpen } from "../media-editing/package.jsx";
import { sortRecentWorkspaces } from "../workspace/normalize-project-entries.js";
import { formatAssetCenterError } from "./asset-center-error.js";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import { Checkbox } from "../infra/checkbox.jsx";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";
import { useMaterializeEntity } from "./use-materialize-entity.js";
const MATERIALIZED_SUBPATH = ".hilo/materialized-entities";
function joinMaterializedDir(workspacePath) {
  const usesBackslash =
    workspacePath.includes("\\") && !workspacePath.includes("/");
  const trimmed = workspacePath.replace(/[/\\]+$/, "");
  const subpath = usesBackslash
    ? MATERIALIZED_SUBPATH.replace(/\//g, "\\")
    : MATERIALIZED_SUBPATH;
  return `${trimmed}${usesBackslash ? "\\" : "/"}${subpath}`;
}
export function MaterializeWorkspaceDialog({ entity, onClose }) {
  const { t: translate } = useTranslation();
  const platform = usePlatform();
  const [recent] = useStorage("global.recentWorkspaces");
  const materializeMutation = useMaterializeEntity();
  const workspaces = reactExports.useMemo(
    () => sortRecentWorkspaces(recent),
    [recent],
  );
  const [selectedPaths, setSelectedPaths] = reactExports.useState(new Set());
  const [success, setSuccess] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const effectiveSelected = reactExports.useMemo(() => {
    if (selectedPaths.size > 0) return selectedPaths;
    const first = workspaces[0]?.path;
    return first ? new Set([first]) : new Set();
  }, [selectedPaths, workspaces]);
  const canSubmit =
    !!entity && effectiveSelected.size > 0 && !materializeMutation.isPending;
  const togglePath = reactExports.useCallback((path) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);
  const handleClose = () => {
    setSelectedPaths(new Set());
    setSuccess(null);
    setError(null);
    onClose();
  };
  const revealLabel = translate(getFileManagerLabelKey(platform.app.os));
  const revealTarget = reactExports.useCallback(
    async (target) => {
      try {
        if (platform.shell.showItemInFolder) {
          await platform.shell.showItemInFolder(target.revealPath);
          return;
        }
        if (platform.shell.openPath) {
          await platform.shell.openPath(target.revealPath);
          return;
        }
        dedupedToast.error(translate("fileExplorer.platformNotSupported"));
      } catch {
        dedupedToast.error(translate("fileExplorer.openFailed"));
      }
    },
    [platform.shell, translate],
  );
  const handleSubmit = async () => {
    if (!entity || effectiveSelected.size === 0) return;
    setError(null);
    setSuccess(null);
    const succeeded = [];
    const targets = Array.from(effectiveSelected);
    try {
      for (const targetPath of targets) {
        await materializeMutation.mutateAsync({
          entityId: entity.id,
          input: {
            workspacePath: targetPath,
          },
          _track: {
            trigger: "context_menu",
          },
        });
        const picked = workspaces.find((workspace) => workspace.path === targetPath);
        const label =
          picked?.displayName?.trim() ||
          picked?.path.split("/").pop() ||
          targetPath;
        succeeded.push({
          label,
          revealPath: joinMaterializedDir(targetPath),
        });
      }
      dedupedToast.success(
        translate("assetCenter.materialize.success", {
          workspace:
            succeeded.length === 1
              ? succeeded[0].label
              : translate("assetCenter.materialize.workspaceCount", {
                  count: succeeded.length,
                }),
        }),
        {
          description: translate("assetCenter.materialize.successPathHint"),
          action:
            succeeded.length === 1
              ? {
                  label: translate(getFileManagerLabelKey(platform.app.os)),
                  onClick: () => void revealTarget(succeeded[0]),
                }
              : void 0,
        },
      );
      handleClose();
    } catch (err) {
      const msg = formatAssetCenterError(err, translate);
      if (succeeded.length > 0) {
        setSuccess({
          targets: succeeded,
        });
        setError(
          translate("assetCenter.materialize.partialError", {
            count: succeeded.length,
            message: msg,
          }),
        );
      } else {
        setError(msg);
      }
    }
  };
  return (
    <Dialog
      open={entity !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent
        className="min-w-0 sm:max-w-lg"
        data-action-ui-id="asset-center-materialize-dialog"
      >
        <DialogHeader>
          <DialogTitle>{translate("assetCenter.materialize.title")}</DialogTitle>
          <DialogDescription className="text-xs">
            {entity
              ? translate("assetCenter.materialize.description", {
                  name: entity.name,
                })
              : translate("assetCenter.materialize.descriptionFallback")}
          </DialogDescription>
        </DialogHeader>
        <div className="min-w-0 space-y-3">
          {workspaces.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              {translate("assetCenter.materialize.noWorkspaces")}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {translate("assetCenter.materialize.workspaceLabel")}
                </span>
                <span className="text-[10px] text-muted-foreground/70">
                  {translate("assetCenter.materialize.selectedCount", {
                    count: effectiveSelected.size,
                  })}
                </span>
              </div>
              <ul
                className="w-full min-w-0 max-h-64 overflow-x-hidden overflow-y-auto rounded-lg border border-border"
                data-action-ui-id="asset-center-materialize-workspace-list"
              >
                {workspaces.map((workspace) => {
                  const display =
                    workspace.displayName?.trim() ||
                    workspace.path.split("/").pop() ||
                    workspace.path;
                  const checked = effectiveSelected.has(workspace.path);
                  const inputId = `materialize-ws-${workspace.path}`;
                  return (
                    <li
                      key={workspace.path}
                      className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                    >
                      <label
                        htmlFor={inputId}
                        className="hilo-checkbox-label flex min-w-0 items-center px-3 py-2 cursor-pointer text-xs"
                        data-action-ui-id="asset-center-materialize-workspace-row"
                      >
                        <Checkbox
                          id={inputId}
                          checked={checked}
                          onCheckedChange={() => togglePath(workspace.path)}
                          data-action-ui-id="asset-center-materialize-workspace-checkbox"
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate font-medium">
                            {display}
                          </span>
                          <span
                            className="text-[10px] text-muted-foreground truncate"
                            title={workspace.path}
                          >
                            {workspace.path}
                          </span>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {success && (
            <div
              className="flex items-start gap-2 rounded-lg border border-foreground/20 bg-muted/20 px-3 py-2"
              data-action-ui-id="asset-center-materialize-success"
            >
              <CheckCircle
                size={14}
                className="mt-0.5 shrink-0 text-foreground"
              />
              <div className="text-xs space-y-1.5 min-w-0 flex-1">
                <p className="font-medium">
                  {translate("assetCenter.materialize.success", {
                    workspace:
                      success.targets.length === 1
                        ? success.targets[0].label
                        : translate("assetCenter.materialize.workspaceCount", {
                            count: success.targets.length,
                          }),
                  })}
                </p>
                <p className="text-[10px] text-muted-foreground/80">
                  {translate("assetCenter.materialize.successPathHint")}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {success.targets.map((target) => (
                    <Button
                      key={target.revealPath}
                      variant="outline"
                      size="sm"
                      className="h-6 gap-1 px-2 text-[10px]"
                      onClick={() => void revealTarget(target)}
                      data-action-ui-id="asset-center-materialize-reveal"
                    >
                      <FolderOpen size={11} />
                      {success.targets.length === 1
                        ? revealLabel
                        : target.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {error && (
            <div
              className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2"
              data-action-ui-id="asset-center-materialize-error"
            >
              <ShieldAlert
                size={14}
                className="mt-0.5 shrink-0 text-destructive"
              />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={handleClose}
            disabled={materializeMutation.isPending}
            data-action-ui-id="asset-center-materialize-close"
          >
            {success ? translate("common.close") : translate("common.cancel")}
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || workspaces.length === 0}
            data-action-ui-id="asset-center-materialize-submit"
          >
            {materializeMutation.isPending && (
              <Loader2 size={14} className="animate-spin" />
            )}
            {success
              ? translate("assetCenter.materialize.submitAgain")
              : translate("assetCenter.materialize.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
