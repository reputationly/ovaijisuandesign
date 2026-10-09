// save-to-project-assets-dialog.jsx
import {
  cloudAssetExtension,
  cloudAssetMimeType,
  getProjectAssetWritePolicy,
  PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS,
} from "../assets/wrap-as-asset-center-error.js";
import {
  API_PATHS,
  dedupedToast,
  FolderPlus,
  Loader2,
  reactExports,
  useCurrentWorkspace,
  useTranslation,
} from "../vendor.js";
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
import { Input3 } from "../infra/select-content.jsx";
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
export function SaveToProjectAssetsDialog({ state: state2, onOpenChange }) {
  const { t: t2 } = useTranslation();
  const workspacePath = useCurrentWorkspace();
  const project2 = useWorkspaceProject(workspacePath || void 0);
  const service2 = useProjectAssetsService();
  const { ensureProjectFolderName } = useProjectActions();
  const files = state2?.files ?? [];
  const single = files.length === 1 ? files[0] : void 0;
  const [name2, setName] = reactExports.useState("");
  const [options, setOptions] = reactExports.useState([]);
  const [selectedKey, setSelectedKey] = reactExports.useState(ROOT_KEY);
  const [creatingFolder, setCreatingFolder] = reactExports.useState(false);
  const [newFolderName, setNewFolderName] = reactExports.useState("");
  const [pending2, setPending] = reactExports.useState(false);
  const [loadingFolders, setLoadingFolders] = reactExports.useState(false);
  const trackedUploads = reactExports.useRef(new Map());
  reactExports.useEffect(() => {
    const subscription = service2.onDidChangeTransfer((item) => {
      const trackedName = trackedUploads.current.get(item.id);
      if (trackedName === void 0) return;
      if (item.status === "failed") {
        trackedUploads.current.delete(item.id);
        dedupedToast.error(
          item.userMessage ??
            (item.errorKind === "review_blocked"
              ? t2("localAssets.saveUploadBlocked", {
                  name: trackedName,
                })
              : t2("localAssets.saveUploadFailed", {
                  name: trackedName,
                })),
        );
      } else if (item.status === "done" || item.status === "canceled") {
        trackedUploads.current.delete(item.id);
      }
    });
    return () => subscription.dispose();
  }, [service2, t2]);
  reactExports.useEffect(() => {
    setName(single?.displayName ?? "");
    setSelectedKey(ROOT_KEY);
    setCreatingFolder(false);
    setNewFolderName("");
    setPending(false);
  }, [single]);
  const loadFolders = reactExports.useCallback(async () => {
    if (!project2) return;
    setLoadingFolders(true);
    try {
      if (project2.kind === "team" && project2.remoteId) {
        const cloud = await listAllCloudFolders(project2.remoteId);
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
        const folderName = await ensureProjectFolderName(project2.id);
        if (!folderName) return;
        const locals = await service2.listLocalFolders(folderName);
        setOptions([
          {
            key: ROOT_KEY,
            segments: [],
          },
          ...locals.sort().map((rel) => ({
            key: rel,
            segments: rel.split("/"),
          })),
        ]);
      }
    } catch (err) {
      const isCloudProject =
        project2.kind === "team" && Boolean(project2.remoteId);
      dedupedToast.error(
        (isCloudProject ? cloudErrorDisplayMessage(err) : void 0) ??
          (isCloudProject
            ? t2("cloudAssets.failServer")
            : err instanceof Error
              ? err.message
              : String(err)),
      );
    } finally {
      setLoadingFolders(false);
    }
  }, [ensureProjectFolderName, project2, service2, t2]);
  reactExports.useEffect(() => {
    if (state2) void loadFolders();
  }, [state2, loadFolders]);
  const selected2 = reactExports.useMemo(
    () => options.find((option2) => option2.key === selectedKey),
    [options, selectedKey],
  );
  const selectedWritePolicy = selected2
    ? getProjectAssetWritePolicy(selected2.segments.length)
    : {
        canCreateFolder: false,
        canCreateFile: false,
      };
  const folderDepthMessage = !selectedWritePolicy.canCreateFolder
    ? selectedWritePolicy.canCreateFile
      ? t2("projectAssets.folderDepthReached", {
          count: PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS,
        })
      : t2("projectAssets.depthExceeded")
    : void 0;
  const fileDepthMessage = !selectedWritePolicy.canCreateFile
    ? t2("projectAssets.depthExceeded")
    : void 0;
  reactExports.useEffect(() => {
    if (selectedWritePolicy.canCreateFolder) return;
    setCreatingFolder(false);
    setNewFolderName("");
  }, [selectedWritePolicy.canCreateFolder]);
  const handleCreateFolder = reactExports.useCallback(async () => {
    const trimmed = newFolderName.trim();
    if (
      !project2 ||
      !selected2 ||
      !selectedWritePolicy.canCreateFolder ||
      !trimmed
    )
      return;
    try {
      const safety = await checkTextSafety(trimmed);
      if (!safety.pass) {
        dedupedToast.error(t2("rename.safetyBlocked"));
        return;
      }
      if (project2.kind === "team" && project2.remoteId) {
        const node2 = await createCloudFolder(
          project2.remoteId,
          selected2.key !== ROOT_KEY ? selected2.key : "",
          trimmed,
        );
        const segments = [...selected2.segments, node2.name];
        setOptions((previous2) => [
          ...previous2,
          {
            key: node2.id,
            segments,
          },
        ]);
        setSelectedKey(node2.id);
      } else {
        const folderName = await ensureProjectFolderName(project2.id);
        if (!folderName) return;
        const segments = [...selected2.segments, trimmed];
        await service2.createLocalFolder(folderName, segments);
        const rel = segments.join("/");
        setOptions((previous2) =>
          previous2.some((option2) => option2.key === rel)
            ? previous2
            : [
                ...previous2,
                {
                  key: rel,
                  segments,
                },
              ],
        );
        setSelectedKey(rel);
      }
      setCreatingFolder(false);
      setNewFolderName("");
    } catch (err) {
      const message2 = err instanceof Error ? err.message : String(err);
      dedupedToast.error(
        project2.kind === "team" && project2.remoteId
          ? (cloudErrorDisplayMessage(err) ?? t2("cloudAssets.failServer"))
          : message2.includes("depth_exceeded")
            ? t2("localAssets.folderDepthLimit", {
                count: PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS,
              })
            : message2,
      );
    }
  }, [
    ensureProjectFolderName,
    newFolderName,
    project2,
    selected2,
    selectedWritePolicy.canCreateFolder,
    service2,
    t2,
  ]);
  const handleSave = reactExports.useCallback(async () => {
    if (
      !project2 ||
      !state2 ||
      !selected2 ||
      !selectedWritePolicy.canCreateFile ||
      pending2
    )
      return;
    setPending(true);
    try {
      const folderName = await ensureProjectFolderName(project2.id);
      if (!folderName) throw new Error("project folder unresolved");
      if (project2.kind === "team" && project2.remoteId) {
        const customName = single
          ? preserveExtension(name2, single.displayName)
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
              t2("cloudAssets.rejectUnsupported", {
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
            dedupedToast.error(t2("rename.safetyBlocked"));
            continue;
          }
          approvedCandidates.push(candidate);
        }
        let started = 0;
        for (const { file, uploadName } of approvedCandidates) {
          try {
            const transfer = await service2.startUpload({
              projectFolderName: folderName,
              cloudProjectId: project2.remoteId,
              parentId: selected2.key === ROOT_KEY ? "" : selected2.key,
              filePath: file.absolutePath,
              name: uploadName,
              // Cloud review routes by MIME prefix (image/audio → sync review);
              // without it the gateway falls back to octet-stream and the
              // cloud rejects the file as “unsupported type”.
              mime: cloudAssetMimeType(uploadName),
              mirrorFolderSegments: selected2.segments,
            });
            trackedUploads.current.set(transfer.id, uploadName);
            started += 1;
          } catch (err) {
            dedupedToast.error(
              t2("cloudAssets.uploadStartFailed", {
                name: uploadName,
                message: err instanceof Error ? err.message : String(err),
              }),
            );
          }
        }
        if (started === 0) return;
        dedupedToast.success(t2("localAssets.saveUploadStarted"));
        onOpenChange(false);
        return;
      }
      const results = await service2.importLocalAssets({
        projectFolderName: folderName,
        sourcePaths: files.map((file) => file.absolutePath),
        folderSegments: selected2.segments,
      });
      const imported = [];
      for (const result of results) {
        if (result.record) imported.push(result.record);
        else {
          const fileName =
            result.sourcePath.split(/[/\\]/).pop() ?? result.sourcePath;
          dedupedToast.error(
            t2("localAssets.importFailed", {
              name: fileName,
            }),
          );
        }
      }
      if (imported.length === 0) return;
      if (single && imported.length === 1) {
        const trimmed = preserveExtension(name2, single.displayName);
        if (trimmed && trimmed !== imported[0].name) {
          try {
            const renamed = await service2.renameLocalAsset(
              folderName,
              imported[0].id,
              trimmed,
            );
            if (renamed) imported[0] = renamed;
          } catch {}
        }
      }
      dedupedToast.success(t2("localAssets.saveSuccess"));
      onOpenChange(false);
    } catch (err) {
      dedupedToast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }, [
    ensureProjectFolderName,
    files,
    name2,
    onOpenChange,
    pending2,
    project2,
    selected2,
    selectedWritePolicy.canCreateFile,
    service2,
    single,
    state2,
    t2,
  ]);
  const previewSrc = single
    ? withThumbnailWidth(
        gatewayUrl(API_PATHS.serveLocal(single.absolutePath)),
        480,
      )
    : void 0;
  const isImage2 = single
    ? /\.(png|jpe?g|gif|webp)$/i.test(single.displayName)
    : false;
  return (
    <Dialog open={state2 !== null} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        data-action-ui-id="canvas.save-to-project-assets-dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-body-14 leading-5 font-medium">
            {t2("localAssets.saveDialogTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t2("localAssets.saveDialogTitle")}
          </DialogDescription>
        </DialogHeader>
        {!project2 ? (
          <p className="py-4 text-center text-[13px] text-muted-foreground">
            {t2("localAssets.noProject")}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {single && isImage2 && previewSrc ? (
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
                  : t2("localAssets.saveFileCount", {
                      count: files.length,
                    })}
              </p>
            )}
            {single ? (
              <div className="flex flex-col gap-1">
                <span className="text-[12px] text-muted-foreground">
                  {t2("localAssets.saveName")}
                </span>
                <Input3
                  value={name2}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="off"
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-1">
              <span className="text-[12px] text-muted-foreground">
                {t2("localAssets.saveLocation")}
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
                  aria-label={t2("localAssets.newFolder")}
                  title={folderDepthMessage ?? t2("localAssets.newFolder")}
                  disabled={!selectedWritePolicy.canCreateFolder}
                  onClick={() => setCreatingFolder((previous2) => !previous2)}
                  data-action-ui-id="canvas.save-to-project-assets-new-folder"
                >
                  <FolderPlus size={14} strokeWidth={1.5} />
                </Button>
              </div>
              {creatingFolder && selectedWritePolicy.canCreateFolder ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <Input3
                    autoFocus={true}
                    value={newFolderName}
                    placeholder={t2("localAssets.newFolderPlaceholder")}
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
                    {t2("common.confirm")}
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
            {t2("common.cancel")}
          </Button>
          <Button
            size="sm"
            disabled={
              !project2 ||
              !selected2 ||
              !selectedWritePolicy.canCreateFile ||
              pending2 ||
              (Boolean(single) && !name2.trim())
            }
            title={fileDepthMessage}
            onClick={() => void handleSave()}
            data-action-ui-id="canvas.save-to-project-assets-save"
          >
            {pending2 ? (
              <Loader2
                size={14}
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : null}
            {t2("localAssets.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
