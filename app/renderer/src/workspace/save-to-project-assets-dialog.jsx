// save-to-project-assets-dialog.jsx
import {
  cloudAssetExtension,
  cloudAssetMimeType,
  getProjectAssetWritePolicy,
  PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS,
} from "../assets/wrap-as-asset-center-error.js";
import { API_PATHS } from "../infra/workspace-gateway.js";
import { useCurrentWorkspace } from "../infra/shared-runtime.js";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { FolderPlus, Loader2 } from "../media-editing/lucide-icon-wraps.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { gatewayUrl } from "../infra/gateway-http-error.jsx";
import { checkCloudAssetUpload } from "../assets/check-cloud-asset-upload.js";
import { withThumbnailWidth } from "./tool-label-definitions.js";
import {
  checkTextSafety,
  cloudErrorDisplayMessage,
} from "./asset-lineage-query-key.js";
import {
  listAllCloudFolders,
  ROOT_KEY,
} from "../assets/list-all-cloud-folders.js";
import { useWorkspaceProject } from "./normalize-project-entries.js";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";
import { Input3 as Input } from "../infra/select-content.jsx";
import { useProjectAssetsService } from "../infra/new-folder-dialog.jsx";
import { useProjectActions } from "../settings/use-project-actions.js";
import { createCloudFolder } from "../assets/read-entity-drag-data.js";
import { FolderDrillDownPicker } from "../assets/folder-drill-down-picker.jsx";
function preserveExtension(customName, sourceName) {
  const trimmed = customName.trim();
  if (!trimmed) return trimmed;
  const sourceExt = cloudAssetExtension(sourceName);
  if (!sourceExt || cloudAssetExtension(trimmed) === sourceExt) return trimmed;
  return `${trimmed}.${sourceExt}`;
}
export function SaveToProjectAssetsDialog({ state, onOpenChange }) {
  const { t: translate } = useTranslation();
  const workspacePath = useCurrentWorkspace();
  const project = useWorkspaceProject(workspacePath || void 0);
  const service = useProjectAssetsService();
  const { ensureProjectFolderName } = useProjectActions();
  const files = state?.files ?? [];
  const single = files.length === 1 ? files[0] : void 0;
  const [assetFileName, setAssetFileName] = reactExports.useState("");
  const [options, setOptions] = reactExports.useState([]);
  const [selectedKey, setSelectedKey] = reactExports.useState(ROOT_KEY);
  const [creatingFolder, setCreatingFolder] = reactExports.useState(false);
  const [newFolderName, setNewFolderName] = reactExports.useState("");
  const [pending, setPending] = reactExports.useState(false);
  const [loadingFolders, setLoadingFolders] = reactExports.useState(false);
  const trackedUploads = reactExports.useRef(new Map());
  reactExports.useEffect(() => {
    const subscription = service.onDidChangeTransfer((item) => {
      const trackedName = trackedUploads.current.get(item.id);
      if (trackedName === void 0) return;
      if (item.status === "failed") {
        trackedUploads.current.delete(item.id);
        dedupedToast.error(
          item.userMessage ??
            (item.errorKind === "review_blocked"
              ? translate("localAssets.saveUploadBlocked", {
                  name: trackedName,
                })
              : translate("localAssets.saveUploadFailed", {
                  name: trackedName,
                })),
        );
      } else if (item.status === "done" || item.status === "canceled") {
        trackedUploads.current.delete(item.id);
      }
    });
    return () => subscription.dispose();
  }, [service, translate]);
  reactExports.useEffect(() => {
    setAssetFileName(single?.displayName ?? "");
    setSelectedKey(ROOT_KEY);
    setCreatingFolder(false);
    setNewFolderName("");
    setPending(false);
  }, [single]);
  const loadFolders = reactExports.useCallback(async () => {
    if (!project) return;
    setLoadingFolders(true);
    try {
      if (project.kind === "team" && project.remoteId) {
        const cloud = await listAllCloudFolders(project.remoteId);
        setOptions([
          {
            key: ROOT_KEY,
            segments: [],
          },
          ...cloud.map((folder) => ({
            key: folder.id,
            segments: folder.segments,
          })),
        ]);
      } else {
        const folderName = await ensureProjectFolderName(project.id);
        if (!folderName) return;
        const locals = await service.listLocalFolders(folderName);
        setOptions([
          {
            key: ROOT_KEY,
            segments: [],
          },
          ...locals.sort().map((relativePath) => ({
            key: relativePath,
            segments: relativePath.split("/"),
          })),
        ]);
      }
    } catch (err) {
      const isCloudProject =
        project.kind === "team" && Boolean(project.remoteId);
      dedupedToast.error(
        (isCloudProject ? cloudErrorDisplayMessage(err) : void 0) ??
          (isCloudProject
            ? translate("cloudAssets.failServer")
            : err instanceof Error
              ? err.message
              : String(err)),
      );
    } finally {
      setLoadingFolders(false);
    }
  }, [ensureProjectFolderName, project, service, translate]);
  reactExports.useEffect(() => {
    if (state) void loadFolders();
  }, [state, loadFolders]);
  const selected = reactExports.useMemo(
    () => options.find((option) => option.key === selectedKey),
    [options, selectedKey],
  );
  const selectedWritePolicy = selected
    ? getProjectAssetWritePolicy(selected.segments.length)
    : {
        canCreateFolder: false,
        canCreateFile: false,
      };
  const folderDepthMessage = !selectedWritePolicy.canCreateFolder
    ? selectedWritePolicy.canCreateFile
      ? translate("projectAssets.folderDepthReached", {
          count: PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS,
        })
      : translate("projectAssets.depthExceeded")
    : void 0;
  const fileDepthMessage = !selectedWritePolicy.canCreateFile
    ? translate("projectAssets.depthExceeded")
    : void 0;
  reactExports.useEffect(() => {
    if (selectedWritePolicy.canCreateFolder) return;
    setCreatingFolder(false);
    setNewFolderName("");
  }, [selectedWritePolicy.canCreateFolder]);
  const handleCreateFolder = reactExports.useCallback(async () => {
    const trimmed = newFolderName.trim();
    if (
      !project ||
      !selected ||
      !selectedWritePolicy.canCreateFolder ||
      !trimmed
    )
      return;
    try {
      const safety = await checkTextSafety(trimmed);
      if (!safety.pass) {
        dedupedToast.error(translate("rename.safetyBlocked"));
        return;
      }
      if (project.kind === "team" && project.remoteId) {
        const node = await createCloudFolder(
          project.remoteId,
          selected.key !== ROOT_KEY ? selected.key : "",
          trimmed,
        );
        const segments = [...selected.segments, node.name];
        setOptions((previous) => [
          ...previous,
          {
            key: node.id,
            segments,
          },
        ]);
        setSelectedKey(node.id);
      } else {
        const folderName = await ensureProjectFolderName(project.id);
        if (!folderName) return;
        const segments = [...selected.segments, trimmed];
        await service.createLocalFolder(folderName, segments);
        const relativePath = segments.join("/");
        setOptions((previous) =>
          previous.some((option) => option.key === relativePath)
            ? previous
            : [
                ...previous,
                {
                  key: relativePath,
                  segments,
                },
              ],
        );
        setSelectedKey(relativePath);
      }
      setCreatingFolder(false);
      setNewFolderName("");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      dedupedToast.error(
        project.kind === "team" && project.remoteId
          ? (cloudErrorDisplayMessage(err) ?? translate("cloudAssets.failServer"))
          : message.includes("depth_exceeded")
            ? translate("localAssets.folderDepthLimit", {
                count: PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS,
              })
            : message,
      );
    }
  }, [
    ensureProjectFolderName,
    newFolderName,
    project,
    selected,
    selectedWritePolicy.canCreateFolder,
    service,
    translate,
  ]);
  const handleSave = reactExports.useCallback(async () => {
    if (
      !project ||
      !state ||
      !selected ||
      !selectedWritePolicy.canCreateFile ||
      pending
    )
      return;
    setPending(true);
    try {
      const folderName = await ensureProjectFolderName(project.id);
      if (!folderName) throw new Error("project folder unresolved");
      if (project.kind === "team" && project.remoteId) {
        const customName = single
          ? preserveExtension(assetFileName, single.displayName)
          : "";
        const uploadCandidates = [];
        for (const file of files) {
          const uploadName = customName || file.displayName;
          const verdict = checkCloudAssetUpload({
            fileName: uploadName,
            sizeBytes: 0,
          });
          if (!verdict.ok) {
            dedupedToast.error(
              translate("cloudAssets.rejectUnsupported", {
                name: uploadName,
              }),
            );
            continue;
          }
          uploadCandidates.push({
            file,
            uploadName,
          });
        }
        const approvedCandidates = [];
        for (const candidate of uploadCandidates) {
          const safety = await checkTextSafety(candidate.uploadName);
          if (!safety.pass) {
            dedupedToast.error(translate("rename.safetyBlocked"));
            continue;
          }
          approvedCandidates.push(candidate);
        }
        let started = 0;
        for (const { file, uploadName } of approvedCandidates) {
          try {
            const transfer = await service.startUpload({
              projectFolderName: folderName,
              cloudProjectId: project.remoteId,
              parentId: selected.key === ROOT_KEY ? "" : selected.key,
              filePath: file.absolutePath,
              name: uploadName,
              // Cloud review routes by MIME prefix (image/audio → sync review);
              // without it the gateway falls back to octet-stream and the
              // cloud rejects the file as “unsupported type”.
              mime: cloudAssetMimeType(uploadName),
              mirrorFolderSegments: selected.segments,
            });
            trackedUploads.current.set(transfer.id, uploadName);
            started += 1;
          } catch (err) {
            dedupedToast.error(
              translate("cloudAssets.uploadStartFailed", {
                name: uploadName,
                message: err instanceof Error ? err.message : String(err),
              }),
            );
          }
        }
        if (started === 0) return;
        dedupedToast.success(translate("localAssets.saveUploadStarted"));
        onOpenChange(false);
        return;
      }
      const results = await service.importLocalAssets({
        projectFolderName: folderName,
        sourcePaths: files.map((file) => file.absolutePath),
        folderSegments: selected.segments,
      });
      const imported = [];
      for (const result of results) {
        if (result.record) imported.push(result.record);
        else {
          const fileName =
            result.sourcePath.split(/[/\\]/).pop() ?? result.sourcePath;
          dedupedToast.error(
            translate("localAssets.importFailed", {
              name: fileName,
            }),
          );
        }
      }
      if (imported.length === 0) return;
      if (single && imported.length === 1) {
        const trimmed = preserveExtension(assetFileName, single.displayName);
        if (trimmed && trimmed !== imported[0].name) {
          try {
            const renamed = await service.renameLocalAsset(
              folderName,
              imported[0].id,
              trimmed,
            );
            if (renamed) imported[0] = renamed;
          } catch {}
        }
      }
      dedupedToast.success(translate("localAssets.saveSuccess"));
      onOpenChange(false);
    } catch (err) {
      dedupedToast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }, [
    ensureProjectFolderName,
    files,
    assetFileName,
    onOpenChange,
    pending,
    project,
    selected,
    selectedWritePolicy.canCreateFile,
    service,
    single,
    state,
    translate,
  ]);
  const previewSrc = single
    ? withThumbnailWidth(
        gatewayUrl(API_PATHS.serveLocal(single.absolutePath)),
        480,
      )
    : void 0;
  const isImage = single
    ? /\.(png|jpe?g|gif|webp)$/i.test(single.displayName)
    : false;
  return (
    <Dialog open={state !== null} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        data-action-ui-id="canvas.save-to-project-assets-dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-body-14 leading-5 font-medium">
            {translate("localAssets.saveDialogTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {translate("localAssets.saveDialogTitle")}
          </DialogDescription>
        </DialogHeader>
        {!project ? (
          <p className="py-4 text-center text-[13px] text-muted-foreground">
            {translate("localAssets.noProject")}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {single && isImage && previewSrc ? (
              <div className="flex max-h-40 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                <img
                  src={previewSrc}
                  alt={single.displayName}
                  className="max-h-40 object-contain"
                />
              </div>
            ) : (
              <p className="truncate text-[13px] text-muted-foreground">
                {single
                  ? single.displayName
                  : translate("localAssets.saveFileCount", {
                      count: files.length,
                    })}
              </p>
            )}
            {single ? (
              <div className="flex flex-col gap-1">
                <span className="text-[12px] text-muted-foreground">
                  {translate("localAssets.saveName")}
                </span>
                <Input
                  value={assetFileName}
                  onChange={(event) => setAssetFileName(event.target.value)}
                  autoComplete="off"
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-1">
              <span className="text-[12px] text-muted-foreground">
                {translate("localAssets.saveLocation")}
              </span>
              <div className="flex items-center gap-1.5">
                <FolderDrillDownPicker
                  className="min-w-0 flex-1"
                  options={options}
                  value={selectedKey}
                  onChange={setSelectedKey}
                  loading={loadingFolders}
                  actionUiId="canvas.save-to-project-assets-location"
                />
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={translate("localAssets.newFolder")}
                  title={folderDepthMessage ?? translate("localAssets.newFolder")}
                  disabled={!selectedWritePolicy.canCreateFolder}
                  onClick={() => setCreatingFolder((previous) => !previous)}
                  data-action-ui-id="canvas.save-to-project-assets-new-folder"
                >
                  <FolderPlus size={14} strokeWidth={1.5} />
                </Button>
              </div>
              {creatingFolder && selectedWritePolicy.canCreateFolder ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <Input
                    autoFocus={true}
                    value={newFolderName}
                    placeholder={translate("localAssets.newFolderPlaceholder")}
                    onChange={(event) => setNewFolderName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      void handleCreateFolder();
                    }}
                  />
                  <Button
                    size="sm"
                    disabled={!newFolderName.trim()}
                    onClick={() => void handleCreateFolder()}
                  >
                    {translate("common.confirm")}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {translate("common.cancel")}
          </Button>
          <Button
            size="sm"
            disabled={
              !project ||
              !selected ||
              !selectedWritePolicy.canCreateFile ||
              pending ||
              (Boolean(single) && !assetFileName.trim())
            }
            title={fileDepthMessage}
            onClick={() => void handleSave()}
            data-action-ui-id="canvas.save-to-project-assets-save"
          >
            {pending ? (
              <Loader2
                size={14}
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : null}
            {translate("localAssets.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
