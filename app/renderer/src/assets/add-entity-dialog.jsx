// add-entity-dialog.jsx
import {
  classifyAssetError,
  jsonInit,
  trackAssetCenterAction,
  trackAssetCreate,
} from "../infra/use-online.jsx";
import {
  BASE,
  readEnvelope,
  ROOT_KEY,
  useAssetCenterFetcher,
} from "./wrap-as-asset-center-error.js";
import {
  AtSign,
  ChevronDown,
  Loader2,
  reactExports,
  useMutation,
  useQueryClient,
  useTranslation,
} from "../vendor.js";
import { ENTITY_TYPES } from "./audio-play-button.jsx";
import { DropdownMenu } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { AttachmentUploadZone } from "./attachment-upload-zone.jsx";
import { CollapsibleTags } from "./preset-tags.jsx";
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
import {
  useCreateEntityFromPaths,
  useMaterializeEntity,
} from "./use-materialize-entity.js";
async function createEntity(fetcher, input) {
  const res = await fetcher(`${BASE}/entities`, jsonInit("POST", input));
  return readEnvelope(res, "entity", "created entity");
}
function useCreateEntity() {
  const queryClient = useQueryClient();
  const fetcher = useAssetCenterFetcher();
  return useMutation({
    mutationFn: ({ input }) => createEntity(fetcher, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ROOT_KEY,
      });
    },
  });
}
const TYPE_OPTIONS = ENTITY_TYPES;
const TYPE_RULES = {
  character: {
    descriptionRequired: false,
    maxAttachments: Number.POSITIVE_INFINITY,
  },
  scene: {
    descriptionRequired: false,
    maxAttachments: Number.POSITIVE_INFINITY,
  },
  style_pack: {
    descriptionRequired: true,
    maxAttachments: Number.POSITIVE_INFINITY,
  },
  prop: {
    descriptionRequired: false,
    maxAttachments: Number.POSITIVE_INFINITY,
  },
  custom: {
    descriptionRequired: false,
    maxAttachments: Number.POSITIVE_INFINITY,
  },
};
export function AddEntityDialog({ open, onClose, workspacePath, initialType }) {
  const { t: translate } = useTranslation();
  const [type, setType] = reactExports.useState(initialType ?? "character");
  const [entityName, setEntityName] = reactExports.useState("");
  const [description, setDescription] = reactExports.useState("");
  const [tags, setTags] = reactExports.useState([]);
  const [staged, setStaged] = reactExports.useState([]);
  const [submitError, setSubmitError] = reactExports.useState(null);
  const createFromPathsMutation = useCreateEntityFromPaths();
  const createEmptyMutation = useCreateEntity();
  const materializeMutation = useMaterializeEntity();
  const trimmedName = entityName.trim();
  const trimmedDescription = description.trim();
  const rules = TYPE_RULES[type];
  const isSubmitting =
    createFromPathsMutation.isPending || createEmptyMutation.isPending;
  const descriptionMissing =
    rules.descriptionRequired && trimmedDescription.length === 0;
  const canSubmit =
    trimmedName.length > 0 &&
    !descriptionMissing &&
    !isSubmitting &&
    true &&
    staged.every((stagedAttachment) => stagedAttachment.status !== "error");
  const reset = reactExports.useCallback(() => {
    setType(initialType ?? "character");
    setEntityName("");
    setDescription("");
    setTags([]);
    setStaged([]);
    setSubmitError(null);
  }, [initialType]);
  reactExports.useEffect(() => {
    if (open && initialType) {
      setType(initialType);
    }
  }, [open, initialType]);
  const handleClose = reactExports.useCallback(() => {
    if (isSubmitting) return;
    trackAssetCenterAction({
      action: "create_dialog_close",
      surface: "create_dialog",
      entity_type: type,
      had_edits:
        entityName.trim().length > 0 ||
        description.trim().length > 0 ||
        tags.length > 0 ||
        staged.length > 0,
      attachment_count: staged.length,
      tag_count: tags.length,
    });
    reset();
    onClose();
  }, [isSubmitting, type, entityName, description, tags, staged, reset, onClose]);
  const handleStagedChange = reactExports.useCallback(
    (next) => {
      if (next.length > staged.length) {
        trackAssetCenterAction({
          action: "attachment_add",
          surface: "create_dialog",
          entity_type: type,
          attachment_count: next.length,
        });
      }
      setStaged(next);
    },
    [staged.length, type],
  );
  const metadata = reactExports.useMemo(() => {
    const entityMetadata = {};
    if (tags.length > 0) entityMetadata.tags = tags;
    return entityMetadata;
  }, [tags]);
  const handleSubmit = reactExports.useCallback(async () => {
    if (!canSubmit) return;
    setSubmitError(null);
    const filesForServer = [];
    for (const stagedAttachment of staged) {
      if (stagedAttachment.status !== "staged") continue;
      const absolutePath =
        window.hilo?.webUtils?.getPathForFile?.(stagedAttachment.file) ?? "";
      if (!absolutePath) {
        setSubmitError(
          translate("assetCenter.create.errorNoFilePath", {
            filename: stagedAttachment.file.name,
          }),
        );
        return;
      }
      const entry = {
        absolutePath,
      };
      const userDesc = stagedAttachment.caption?.trim();
      if (userDesc) entry.user_desc = userDesc;
      filesForServer.push(entry);
    }
    try {
      let createdEntityId;
      if (filesForServer.length > 0) {
        const entity = await createFromPathsMutation.mutateAsync({
          input: {
            type,
            name: trimmedName,
            ...(trimmedDescription
              ? {
                  description: trimmedDescription,
                }
              : {}),
            ...(Object.keys(metadata).length > 0
              ? {
                  metadata,
                }
              : {}),
            files: filesForServer,
          },
        });
        createdEntityId = entity.id;
      } else {
        const entity = await createEmptyMutation.mutateAsync({
          input: {
            type,
            name: trimmedName,
            description: trimmedDescription || void 0,
            ...(Object.keys(metadata).length > 0
              ? {
                  metadata,
                }
              : {}),
          },
        });
        createdEntityId = entity.id;
      }
      let autoMaterialized = false;
      if (workspacePath && createdEntityId) {
        try {
          await materializeMutation.mutateAsync({
            entityId: createdEntityId,
            input: {
              workspacePath,
            },
            _track: {
              entity_type: type,
              trigger: "post_create",
            },
          });
          autoMaterialized = true;
        } catch {}
      }
      trackAssetCreate({
        source: workspacePath ? "canvas_sidebar" : "asset_center_page",
        method: "manual",
        entity_type: type,
        success: true,
        attachment_count: filesForServer.length,
        has_description: !!trimmedDescription,
        auto_materialized: autoMaterialized || void 0,
      });
      reset();
      onClose();
    } catch (err) {
      setSubmitError(formatAssetCenterError(err, translate));
      trackAssetCreate({
        source: workspacePath ? "canvas_sidebar" : "asset_center_page",
        method: "manual",
        entity_type: type,
        success: false,
        attachment_count: filesForServer.length,
        has_description: !!trimmedDescription,
        error_type: classifyAssetError(err),
      });
    }
  }, [
    canSubmit,
    staged,
    createFromPathsMutation,
    createEmptyMutation,
    materializeMutation,
    workspacePath,
    type,
    trimmedName,
    trimmedDescription,
    metadata,
    reset,
    onClose,
    translate,
  ]);
  const maxAttachments = rules.maxAttachments;
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen, details) => {
        if (
          !isOpen &&
          (details?.reason === "outside-press" ||
            details?.reason === "focus-out")
        ) {
          return;
        }
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent
        className="sm:max-w-lg max-h-[85vh] overflow-y-auto"
        data-action-ui-id="asset-center-add-entity-dialog"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{translate("assetCenter.create.title")}</DialogTitle>
          <DialogDescription>
            {translate("assetCenter.create.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AtSign size={12} className="shrink-0 text-muted-foreground" />
            <input
              value={entityName}
              onChange={(changeEvent) => setEntityName(changeEvent.target.value)}
              onBlur={() => {
                if (trimmedName) {
                  trackAssetCenterAction({
                    action: "field_complete",
                    surface: "create_dialog",
                    entity_type: type,
                    value: "name",
                    char_count: trimmedName.length,
                  });
                }
              }}
              placeholder={translate("assetCenter.create.namePlaceholder")}
              className="flex-1 min-w-0 bg-transparent font-heading text-sm font-medium outline-none placeholder:text-muted-foreground/50"
              data-action-ui-id="asset-center-add-entity-name"
            />
          </div>
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="shrink-0 cursor-pointer transition-colors hover:opacity-80 mr-2"
                data-action-ui-id="asset-center-add-entity-type"
              >
                <Badge
                  variant="secondary"
                  className="text-xs h-6 px-1.5 font-medium gap-0.5 rounded-[4px] text-secondary-foreground"
                >
                  {translate(`assetCenter.types.${type}`)}
                  <ChevronDown size={12} className="text-muted-foreground" />
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {TYPE_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt}
                    onClick={() => {
                      if (opt !== type) {
                        trackAssetCenterAction({
                          action: "entity_type_change",
                          surface: "create_dialog",
                          entity_type: opt,
                        });
                        setType(opt);
                      }
                    }}
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
              onBlur={() => {
                if (trimmedDescription) {
                  trackAssetCenterAction({
                    action: "field_complete",
                    surface: "create_dialog",
                    entity_type: type,
                    value: "description",
                    char_count: trimmedDescription.length,
                  });
                }
              }}
              placeholder={translate("assetCenter.create.descriptionPlaceholder")}
              rows={1}
              className="flex-1 min-w-0 bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/40 resize-none field-sizing-content break-words"
              data-action-ui-id="asset-center-add-entity-description"
            />
          </div>
          <div className="border-t border-border -mx-4" />
          <AttachmentUploadZone
            staged={staged}
            onStagedChange={handleStagedChange}
            max={maxAttachments}
            mode="stage"
            compactDropZone={true}
            trackingSurface="create_dialog"
            trackingEntityType={type}
          />
          {staged.length > 0 && (
            <span className="text-[10px] text-muted-foreground mb-1 block text-right">
              {translate("assetCenter.create.attachmentCount", {
                count: staged.length,
              })}
            </span>
          )}
          <div className="border-t border-border -mx-4" />
          <CollapsibleTags tags={tags} onChange={setTags} />
          {submitError && (
            <p
              className="text-xs text-destructive"
              data-action-ui-id="asset-center-add-entity-error"
            >
              {submitError}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            size="sm"
            className="h-8 gap-1.5 rounded-[4px]"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            data-action-ui-id="asset-center-add-entity-submit"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {translate("assetCenter.create.submitAsset", "创建资产")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
