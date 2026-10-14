// entity-edit-dialog.jsx
import {
  BASE,
  readObject,
  useAssetCenterFetcher,
} from "./wrap-as-asset-center-error.js";
import {
  AtSign,
  ChevronDown,
  FolderInput,
  jsxRuntimeExports,
  Loader2,
  reactExports,
  useMutation,
  useTranslation,
} from "../vendor.js";
import { ENTITY_TYPES } from "./audio-play-button.jsx";
import {
  assetCenterLog,
  DropdownMenu,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Download, Trash2 } from "../media-editing/package.jsx";
import { AttachmentUploadZone } from "./attachment-upload-zone.jsx";
import { CollapsibleTags } from "./preset-tags.jsx";
import {
  trackAssetCenterAction,
  useExportEntityUrl,
} from "../infra/use-online.jsx";
import { formatAssetCenterError } from "./asset-center-error.js";
import {
  Badge,
  DialogDescription,
  DialogTitle,
} from "../infra/badge-variants.jsx";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../infra/dialog-content.jsx";
import { useEntityCanvas, useUpdateEntity } from "./use-materialize-entity.js";
async function uploadBlob(fetcher, file, kindOverride) {
  const form = new FormData();
  form.append("file", file);
  const query = kindOverride ? `?kind=${encodeURIComponent(kindOverride)}` : "";
  const res = await fetcher(`${BASE}/blobs${query}`, {
    method: "POST",
    body: form,
    // Per-upload timeout: 100 MB upload * slow disk ~= 30s in pathological
    // cases. 120s is generous; matches gateway's multer fileSize ceiling.
    timeoutMs: 12e4,
  });
  return readObject(res, "blob upload result");
}
function useUploadBlob() {
  const fetcher = useAssetCenterFetcher();
  return useMutation({
    mutationFn: ({ file, kind }) => uploadBlob(fetcher, file, kind),
  });
}
const TYPE_OPTIONS = ENTITY_TYPES;
export function EntityEditDialog({
  entityId,
  viewMode,
  onClose,
  onDelete,
  onMaterialize,
}) {
  const { t: translate } = useTranslation();
  const canvasQuery = useEntityCanvas(entityId ?? void 0);
  const updateMutation = useUpdateEntity();
  const uploadMutation = useUploadBlob();
  const exportUrl = useExportEntityUrl();
  const [entityName, setEntityName] = reactExports.useState("");
  const [type, setType] = reactExports.useState("character");
  const [description, setDescription] = reactExports.useState("");
  const [tags, setTags] = reactExports.useState([]);
  const [staged, setStaged] = reactExports.useState([]);
  const [coverBlobPath, setCoverBlobPath] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const hydratedFor = reactExports.useRef(null);
  const detailViewTrackedEntityRef = reactExports.useRef(null);
  const closeTrackedEntityRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (entityId === null) {
      hydratedFor.current = null;
      detailViewTrackedEntityRef.current = null;
      closeTrackedEntityRef.current = null;
      return;
    }
    if (!canvasQuery.data || hydratedFor.current === entityId) return;
    const ent = canvasQuery.data;
    if (detailViewTrackedEntityRef.current !== ent.id) {
      detailViewTrackedEntityRef.current = ent.id;
      trackAssetCenterAction({
        action: "entity_detail_view",
        surface: "edit_dialog",
        entity_id: ent.id,
        entity_type: ent.type,
        source:
          viewMode === void 0
            ? "direct"
            : viewMode === "grid"
              ? "card"
              : "list",
        ...(viewMode !== void 0
          ? {
              view_mode: viewMode,
            }
          : {}),
      });
    }
    setEntityName(ent.name);
    setType(ent.type);
    setDescription(ent.description ?? "");
    setTags(ent.metadata?.tags ?? []);
    assetCenterLog.info("cover.edit_hydrate", {
      entityId,
      coverBlobPath: ent.metadata.coverBlobPath ?? null,
      coverUrl: ent.coverUrl ?? null,
      attachmentCount: ent.attachments.length,
    });
    setCoverBlobPath(ent.metadata.coverBlobPath ?? null);
    const initialStaged = ent.attachments.map((att) => ({
      id: `existing-${att.id}`,
      status: "existing",
      attachmentId: att.id,
      blobPath: att.blobPath,
      kind: att.kind,
      originalFilename: att.originalFilename,
      byteSize: att.byteSize,
      ...(att.meta?.user_desc !== void 0
        ? {
            caption: att.meta.user_desc,
          }
        : {}),
    }));
    setStaged(initialStaged);
    setError(null);
    hydratedFor.current = entityId;
  }, [entityId, canvasQuery.data, viewMode]);
  const loadError =
    entityId !== null && canvasQuery.isError ? canvasQuery.error : null;
  const trimmedName = entityName.trim();
  const trimmedDescription = description.trim();
  const descriptionRequired = !!canvasQuery.data && type === "style_pack";
  const descriptionMissing =
    descriptionRequired && trimmedDescription.length === 0;
  const isSubmitting = updateMutation.isPending;
  const hasUploadInFlight = staged.some((stagedAttachment) => stagedAttachment.status === "uploading");
  const stagedHasError = staged.some((stagedAttachment) => stagedAttachment.status === "error");
  const metadata = reactExports.useMemo(() => {
    const nextMetadata = {
      ...canvasQuery.data?.metadata,
    };
    if (tags.length > 0) nextMetadata.tags = tags;
    else delete nextMetadata.tags;
    if (coverBlobPath) nextMetadata.coverBlobPath = coverBlobPath;
    else delete nextMetadata.coverBlobPath;
    return nextMetadata;
  }, [canvasQuery.data?.metadata, coverBlobPath, tags]);
  const isDirty = reactExports.useMemo(() => {
    if (!canvasQuery.data) return false;
    const ent = canvasQuery.data;
    if (trimmedName !== ent.name) return true;
    if (type !== ent.type) return true;
    if (trimmedDescription !== (ent.description ?? "")) return true;
    const origTags = ent.metadata?.tags ?? [];
    if (
      tags.length !== origTags.length ||
      tags.some((tag, tagIndex) => tag !== origTags[tagIndex])
    )
      return true;
    if (coverBlobPath !== (ent.metadata.coverBlobPath ?? null)) return true;
    const origAttIds = new Set(ent.attachments.map((attachment) => attachment.id));
    const stagedExistingIds = new Set(
      staged
        .filter((stagedAttachment) => stagedAttachment.status === "existing")
        .map((stagedAttachment) => stagedAttachment.attachmentId),
    );
    if (origAttIds.size !== stagedExistingIds.size) return true;
    for (const attachmentId of origAttIds) {
      if (!stagedExistingIds.has(attachmentId)) return true;
    }
    if (staged.some((stagedAttachment) => stagedAttachment.status === "uploaded")) return true;
    for (const stagedAttachment of staged) {
      if (stagedAttachment.status !== "existing") continue;
      const orig = ent.attachments.find((attachment) => attachment.id === stagedAttachment.attachmentId);
      if (!orig) continue;
      if ((stagedAttachment.caption ?? "") !== (orig.meta?.user_desc ?? "")) return true;
    }
    return false;
  }, [
    canvasQuery.data,
    coverBlobPath,
    trimmedName,
    type,
    trimmedDescription,
    tags,
    staged,
  ]);
  const canSave =
    !!canvasQuery.data &&
    trimmedName.length > 0 &&
    !descriptionMissing &&
    isDirty &&
    !isSubmitting &&
    !hasUploadInFlight &&
    !stagedHasError;
  const canExport =
    !!canvasQuery.data && canvasQuery.data.attachments.length > 0;
  const handleExport = reactExports.useCallback(() => {
    if (!canvasQuery.data) return;
    const url = exportUrl(canvasQuery.data.id);
    if (!url) return;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    trackAssetCenterAction({
      action: "entity_export",
      surface: "edit_dialog",
      entity_id: canvasQuery.data.id,
      entity_type: canvasQuery.data.type,
      success: true,
    });
  }, [canvasQuery.data, exportUrl]);
  const handleClose = reactExports.useCallback(
    (reason = "unknown") => {
      if (isSubmitting || hasUploadInFlight) return;
      if (
        canvasQuery.data &&
        closeTrackedEntityRef.current !== canvasQuery.data.id
      ) {
        closeTrackedEntityRef.current = canvasQuery.data.id;
        trackAssetCenterAction({
          action: "edit_dialog_close",
          surface: "edit_dialog",
          entity_id: canvasQuery.data.id,
          entity_type: type,
          had_edits: isDirty,
          attachment_count: staged.length,
          tag_count: tags.length,
          value: reason,
        });
      }
      onClose();
    },
    [
      isSubmitting,
      hasUploadInFlight,
      canvasQuery.data,
      type,
      isDirty,
      staged.length,
      tags.length,
      onClose,
    ],
  );
  const handleSave = reactExports.useCallback(async () => {
    if (!entityId || !canSave) return;
    setError(null);
    const attachments = staged
      .filter((stagedAttachment) => stagedAttachment.status === "existing" || stagedAttachment.status === "uploaded")
      .map((stagedAttachment) => {
        const userDesc = stagedAttachment.caption?.trim();
        const meta = {};
        if (userDesc) meta.user_desc = userDesc;
        const metaSlice =
          Object.keys(meta).length > 0
            ? {
                meta,
              }
            : {};
        if (stagedAttachment.status === "existing") {
          return {
            blobPath: stagedAttachment.blobPath,
            kind: stagedAttachment.kind,
            originalFilename: stagedAttachment.originalFilename,
            byteSize: stagedAttachment.byteSize,
            ...metaSlice,
          };
        }
        return {
          blobPath: stagedAttachment.uploaded.blobPath,
          kind: stagedAttachment.uploaded.kind,
          originalFilename: stagedAttachment.uploaded.originalFilename,
          byteSize: stagedAttachment.uploaded.byteSize,
          ...metaSlice,
        };
      });
    try {
      assetCenterLog.info("cover.entity_save_start", {
        entityId,
        coverBlobPath: metadata.coverBlobPath ?? null,
        previousCoverBlobPath: canvasQuery.data?.metadata.coverBlobPath ?? null,
        attachmentCount: attachments.length,
        dirty: isDirty,
      });
      await updateMutation.mutateAsync({
        entityId,
        input: {
          type,
          name: trimmedName,
          description: trimmedDescription,
          metadata,
          // ALWAYS pass attachments[] — gateway needs the full list to
          // know whether to version-bump. Even an unchanged list will
          // version-bump if dirty=true (but we gate on isDirty above).
          attachments,
        },
      });
      assetCenterLog.info("cover.entity_save_success", {
        entityId,
        coverBlobPath: metadata.coverBlobPath ?? null,
      });
      onClose();
    } catch (err) {
      assetCenterLog.error("cover.entity_save_failed", {
        entityId,
        coverBlobPath: metadata.coverBlobPath ?? null,
        error: err instanceof Error ? err.message : String(err),
      });
      setError(formatAssetCenterError(err, translate));
    }
  }, [
    entityId,
    canSave,
    staged,
    updateMutation,
    type,
    trimmedName,
    trimmedDescription,
    metadata,
    canvasQuery.data?.metadata.coverBlobPath,
    isDirty,
    onClose,
    translate,
  ]);
  return (
    <Dialog
      open={entityId !== null}
      onOpenChange={(open, details) => {
        if (!open) handleClose(details?.reason ?? "unknown");
      }}
    >
      <DialogContent
        className="sm:max-w-lg max-h-[85vh] overflow-y-auto"
        data-action-ui-id="asset-center-entity-edit-dialog"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {canvasQuery.data?.name ?? translate("assetCenter.detail.loading")}
          </DialogTitle>
          <DialogDescription>
            {translate("assetCenter.edit.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {loadError ? (
            <p
              className="text-xs text-destructive py-6 text-center"
              data-action-ui-id="asset-center-entity-edit-load-error"
            >
              {translate("assetCenter.edit.loadError", {
                message: loadError.message,
              })}
            </p>
          ) : !canvasQuery.data ? (
            <p
              className="text-xs text-muted-foreground py-6 text-center"
              data-action-ui-id="asset-center-entity-edit-loading"
            >
              {translate("assetCenter.detail.loading")}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <AtSign size={12} className="shrink-0 text-muted-foreground" />
                <input
                  value={entityName}
                  onChange={(changeEvent) => setEntityName(changeEvent.target.value)}
                  placeholder={translate("assetCenter.edit.namePlaceholder")}
                  className="flex-1 min-w-0 bg-transparent font-heading text-sm font-medium outline-none placeholder:text-muted-foreground/50"
                  data-action-ui-id="asset-center-entity-edit-name"
                />
              </div>
              <div className="flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="shrink-0 cursor-pointer transition-colors hover:opacity-80 mr-2"
                    data-action-ui-id="asset-center-entity-edit-type"
                  >
                    <Badge
                      variant="secondary"
                      className="text-xs h-6 px-1.5 font-medium gap-0.5 rounded-[4px] text-secondary-foreground"
                    >
                      {translate(`assetCenter.types.${type}`)}
                      <ChevronDown
                        size={12}
                        className="text-muted-foreground"
                      />
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {TYPE_OPTIONS.map((opt) => (
                      <DropdownMenuItem
                        key={opt}
                        onClick={() => setType(opt)}
                        data-action-ui-id={`asset-center-entity-edit-type-${opt}`}
                      >
                        {translate(`assetCenter.types.${opt}`)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="w-0.5 h-3 shrink-0 bg-muted-foreground/20 mr-3" />
                <textarea
                  value={description}
                  onChange={(changeEvent) => setDescription(changeEvent.target.value)}
                  placeholder={translate("assetCenter.edit.descriptionPlaceholder")}
                  rows={1}
                  className="flex-1 min-w-0 bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/40 resize-none field-sizing-content break-words"
                  data-action-ui-id="asset-center-entity-edit-description"
                />
              </div>
              <div className="border-t border-border -mx-4" />
              <AttachmentUploadZone
                staged={staged}
                onStagedChange={setStaged}
                max={Number.POSITIVE_INFINITY}
                uploadMutation={uploadMutation}
                onCoverChange={(cover) => {
                  assetCenterLog.info("cover.local_state_set", {
                    entityId,
                    coverBlobPath: cover.blobPath,
                    byteSize: cover.byteSize,
                  });
                  setCoverBlobPath(cover.blobPath);
                }}
                compactDropZone={true}
                trackingSurface="edit_dialog"
                trackingEntityId={entityId ?? void 0}
                trackingEntityType={type}
              />
              <div className="border-t border-border -mx-4" />
              <CollapsibleTags
                tags={tags}
                onChange={setTags}
                trackingSurface="edit_dialog"
              />
              {error && (
                <p
                  className="text-xs text-destructive"
                  data-action-ui-id="asset-center-entity-edit-error"
                >
                  {error}
                </p>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          {canvasQuery.data && (
            <>
              {onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 gap-1.5 mr-auto"
                  onClick={() => {
                    const ent = canvasQuery.data;
                    if (!ent) return;
                    onDelete({
                      id: ent.id,
                      name: ent.name,
                      type: ent.type,
                      description: ent.description,
                      updatedAt: ent.updatedAt,
                      useCount: ent.useCount,
                    });
                  }}
                  data-action-ui-id="asset-center-entity-delete"
                >
                  <Trash2 size={14} />
                  {translate("common.delete")}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={handleExport}
                disabled={!canExport}
                data-action-ui-id="asset-center-entity-edit-export"
                title={translate("assetCenter.card.exportTooltip")}
              >
                <Download size={14} />
                {translate("assetCenter.detail.export")}
              </Button>
              {onMaterialize && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => {
                    const ent = canvasQuery.data;
                    if (!ent) return;
                    onMaterialize({
                      id: ent.id,
                      name: ent.name,
                    });
                  }}
                  data-action-ui-id="asset-center-entity-materialize"
                  title={translate("assetCenter.materialize.actionTooltip")}
                >
                  <FolderInput size={14} />
                  {translate("assetCenter.materialize.action")}
                </Button>
              )}
            </>
          )}
          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => void handleSave()}
            disabled={!canSave}
            data-action-ui-id="asset-center-entity-edit-save"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {translate("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
