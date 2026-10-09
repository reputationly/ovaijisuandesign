// materialize-workspace-dialog.jsx
import {
  CheckCircle2,
  dedupedToast,
  Loader2,
  reactExports,
  ShieldAlert,
  usePlatform,
  useStorage,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { getFileManagerLabelKey } from "../settings/request-prompt-prefill.jsx";
import { FolderOpen } from "../media-editing/package.jsx";
import { sortRecentWorkspaces } from "../workspace/normalize-project-entries.js";
import { formatAssetCenterError } from "./key-entries.js";
import {
  Button$1,
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
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
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
    const first2 = workspaces[0]?.path;
    return first2 ? new Set([first2]) : new Set();
  }, [selectedPaths, workspaces]);
  const canSubmit =
    !!entity && effectiveSelected.size > 0 && !materializeMutation.isPending;
  const togglePath = reactExports.useCallback((path2) => {
    setSelectedPaths((prev) => {
      const next2 = new Set(prev);
      if (next2.has(path2)) {
        next2.delete(path2);
      } else {
        next2.add(path2);
      }
      return next2;
    });
  }, []);
  const handleClose = () => {
    setSelectedPaths(new Set());
    setSuccess(null);
    setError(null);
    onClose();
  };
  const revealLabel = t2(getFileManagerLabelKey(platform2.app.os));
  const revealTarget = reactExports.useCallback(
    async (target) => {
      try {
        if (platform2.shell.showItemInFolder) {
          await platform2.shell.showItemInFolder(target.revealPath);
          return;
        }
        if (platform2.shell.openPath) {
          await platform2.shell.openPath(target.revealPath);
          return;
        }
        dedupedToast.error(t2("fileExplorer.platformNotSupported"));
      } catch {
        dedupedToast.error(t2("fileExplorer.openFailed"));
      }
    },
    [platform2.shell, t2],
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
        const picked = workspaces.find((w3) => w3.path === targetPath);
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
        t2("assetCenter.materialize.success", {
          workspace:
            succeeded.length === 1
              ? succeeded[0].label
              : t2("assetCenter.materialize.workspaceCount", {
                  count: succeeded.length,
                }),
        }),
        {
          description: t2("assetCenter.materialize.successPathHint"),
          action:
            succeeded.length === 1
              ? {
                  label: t2(getFileManagerLabelKey(platform2.app.os)),
                  onClick: () => void revealTarget(succeeded[0]),
                }
              : void 0,
        },
      );
      handleClose();
    } catch (err) {
      const msg = formatAssetCenterError(err, t2);
      if (succeeded.length > 0) {
        setSuccess({
          targets: succeeded,
        });
        setError(
          t2("assetCenter.materialize.partialError", {
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
      onOpenChange={(o2) => {
        if (!o2) handleClose();
      }}
    >
      <DialogContent
        className="min-w-0 sm:max-w-lg"
        data-action-ui-id="asset-center-materialize-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t2("assetCenter.materialize.title")}</DialogTitle>
          <DialogDescription className="text-xs">
            {entity
              ? t2("assetCenter.materialize.description", {
                  name: entity.name,
                })
              : t2("assetCenter.materialize.descriptionFallback")}
          </DialogDescription>
        </DialogHeader>
        <div className="min-w-0 space-y-3">
          {workspaces.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              {t2("assetCenter.materialize.noWorkspaces")}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {t2("assetCenter.materialize.workspaceLabel")}
                </span>
                <span className="text-[10px] text-muted-foreground/70">
                  {t2("assetCenter.materialize.selectedCount", {
                    count: effectiveSelected.size,
                  })}
                </span>
              </div>
              <ul
                className="w-full min-w-0 max-h-64 overflow-x-hidden overflow-y-auto rounded-lg border border-border"
                data-action-ui-id="asset-center-materialize-workspace-list"
              >
                {workspaces.map((w3) => {
                  const display =
                    w3.displayName?.trim() ||
                    w3.path.split("/").pop() ||
                    w3.path;
                  const checked = effectiveSelected.has(w3.path);
                  const inputId = `materialize-ws-${w3.path}`;
                  return (
                    <li
                      key={w3.path}
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
                          onCheckedChange={() => togglePath(w3.path)}
                          data-action-ui-id="asset-center-materialize-workspace-checkbox"
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate font-medium">
                            {display}
                          </span>
                          <span
                            className="text-[10px] text-muted-foreground truncate"
                            title={w3.path}
                          >
                            {w3.path}
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
              <CheckCircle2
                size={14}
                className="mt-0.5 shrink-0 text-foreground"
              />
              <div className="text-xs space-y-1.5 min-w-0 flex-1">
                <p className="font-medium">
                  {t2("assetCenter.materialize.success", {
                    workspace:
                      success.targets.length === 1
                        ? success.targets[0].label
                        : t2("assetCenter.materialize.workspaceCount", {
                            count: success.targets.length,
                          }),
                  })}
                </p>
                <p className="text-[10px] text-muted-foreground/80">
                  {t2("assetCenter.materialize.successPathHint")}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {success.targets.map((target) => (
                    <Button$1
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
                    </Button$1>
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
          <Button$1
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={handleClose}
            disabled={materializeMutation.isPending}
            data-action-ui-id="asset-center-materialize-close"
          >
            {success ? t2("common.close") : t2("common.cancel")}
          </Button$1>
          <Button$1
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
              ? t2("assetCenter.materialize.submitAgain")
              : t2("assetCenter.materialize.submit")}
          </Button$1>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
