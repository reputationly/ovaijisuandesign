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
import { formatAssetCenterError } from "./key-entries.js";
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
  const { t: t2 } = useTranslation();
  const canvasQuery = useEntityCanvas(entityId ?? void 0);
  const updateMutation = useUpdateEntity();
  const uploadMutation = useUploadBlob();
  const exportUrl = useExportEntityUrl();
  const [name2, setName] = reactExports.useState("");
  const [type2, setType] = reactExports.useState("character");
  const [description, setDescription] = reactExports.useState("");
  const [tags2, setTags] = reactExports.useState([]);
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
    setName(ent.name);
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
  const trimmedName = name2.trim();
  const trimmedDescription = description.trim();
  const descriptionRequired = !!canvasQuery.data && type2 === "style_pack";
  const descriptionMissing =
    descriptionRequired && trimmedDescription.length === 0;
  const isSubmitting = updateMutation.isPending;
  const hasUploadInFlight = staged.some((s2) => s2.status === "uploading");
  const stagedHasError = staged.some((s2) => s2.status === "error");
  const metadata = reactExports.useMemo(() => {
    const m3 = {
      ...canvasQuery.data?.metadata,
    };
    if (tags2.length > 0) m3.tags = tags2;
    else delete m3.tags;
    if (coverBlobPath) m3.coverBlobPath = coverBlobPath;
    else delete m3.coverBlobPath;
    return m3;
  }, [canvasQuery.data?.metadata, coverBlobPath, tags2]);
  const isDirty = reactExports.useMemo(() => {
    if (!canvasQuery.data) return false;
    const ent = canvasQuery.data;
    if (trimmedName !== ent.name) return true;
    if (type2 !== ent.type) return true;
    if (trimmedDescription !== (ent.description ?? "")) return true;
    const origTags = ent.metadata?.tags ?? [];
    if (
      tags2.length !== origTags.length ||
      tags2.some((t22, i2) => t22 !== origTags[i2])
    )
      return true;
    if (coverBlobPath !== (ent.metadata.coverBlobPath ?? null)) return true;
    const origAttIds = new Set(ent.attachments.map((a2) => a2.id));
    const stagedExistingIds = new Set(
      staged
        .filter((s2) => s2.status === "existing")
        .map((s2) => s2.attachmentId),
    );
    if (origAttIds.size !== stagedExistingIds.size) return true;
    for (const id2 of origAttIds) {
      if (!stagedExistingIds.has(id2)) return true;
    }
    if (staged.some((s2) => s2.status === "uploaded")) return true;
    for (const s2 of staged) {
      if (s2.status !== "existing") continue;
      const orig = ent.attachments.find((a2) => a2.id === s2.attachmentId);
      if (!orig) continue;
      if ((s2.caption ?? "") !== (orig.meta?.user_desc ?? "")) return true;
    }
    return false;
  }, [
    canvasQuery.data,
    coverBlobPath,
    trimmedName,
    type2,
    trimmedDescription,
    tags2,
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
    const url2 = exportUrl(canvasQuery.data.id);
    if (!url2) return;
    const a2 = document.createElement("a");
    a2.href = url2;
    a2.rel = "noopener";
    document.body.appendChild(a2);
    a2.click();
    a2.remove();
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
          entity_type: type2,
          had_edits: isDirty,
          attachment_count: staged.length,
          tag_count: tags2.length,
          value: reason,
        });
      }
      onClose();
    },
    [
      isSubmitting,
      hasUploadInFlight,
      canvasQuery.data,
      type2,
      isDirty,
      staged.length,
      tags2.length,
      onClose,
    ],
  );
  const handleSave = reactExports.useCallback(async () => {
    if (!entityId || !canSave) return;
    setError(null);
    const attachments = staged
      .filter((s2) => s2.status === "existing" || s2.status === "uploaded")
      .map((s2) => {
        const userDesc = s2.caption?.trim();
        const meta2 = {};
        if (userDesc) meta2.user_desc = userDesc;
        const metaSlice =
          Object.keys(meta2).length > 0
            ? {
                meta: meta2,
              }
            : {};
        if (s2.status === "existing") {
          return {
            blobPath: s2.blobPath,
            kind: s2.kind,
            originalFilename: s2.originalFilename,
            byteSize: s2.byteSize,
            ...metaSlice,
          };
        }
        return {
          blobPath: s2.uploaded.blobPath,
          kind: s2.uploaded.kind,
          originalFilename: s2.uploaded.originalFilename,
          byteSize: s2.uploaded.byteSize,
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
          type: type2,
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
      setError(formatAssetCenterError(err, t2));
    }
  }, [
    entityId,
    canSave,
    staged,
    updateMutation,
    type2,
    trimmedName,
    trimmedDescription,
    metadata,
    canvasQuery.data?.metadata.coverBlobPath,
    isDirty,
    onClose,
    t2,
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
            {canvasQuery.data?.name ?? t2("assetCenter.detail.loading")}
          </DialogTitle>
          <DialogDescription>
            {t2("assetCenter.edit.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {loadError ? (
            <p
              className="text-xs text-destructive py-6 text-center"
              data-action-ui-id="asset-center-entity-edit-load-error"
            >
              {t2("assetCenter.edit.loadError", {
                message: loadError.message,
              })}
            </p>
          ) : !canvasQuery.data ? (
            <p
              className="text-xs text-muted-foreground py-6 text-center"
              data-action-ui-id="asset-center-entity-edit-loading"
            >
              {t2("assetCenter.detail.loading")}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <AtSign size={12} className="shrink-0 text-muted-foreground" />
                <input
                  value={name2}
                  onChange={(e2) => setName(e2.target.value)}
                  placeholder={t2("assetCenter.edit.namePlaceholder")}
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
                      {t2(`assetCenter.types.${type2}`)}
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
                        {t2(`assetCenter.types.${opt}`)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="w-0.5 h-3 shrink-0 bg-muted-foreground/20 mr-3" />
                <textarea
                  value={description}
                  onChange={(e2) => setDescription(e2.target.value)}
                  placeholder={t2("assetCenter.edit.descriptionPlaceholder")}
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
                trackingEntityType={type2}
              />
              <div className="border-t border-border -mx-4" />
              <CollapsibleTags
                tags={tags2}
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
                  {t2("common.delete")}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={handleExport}
                disabled={!canExport}
                data-action-ui-id="asset-center-entity-edit-export"
                title={t2("assetCenter.card.exportTooltip")}
              >
                <Download size={14} />
                {t2("assetCenter.detail.export")}
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
                  title={t2("assetCenter.materialize.actionTooltip")}
                >
                  <FolderInput size={14} />
                  {t2("assetCenter.materialize.action")}
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
            {t2("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
