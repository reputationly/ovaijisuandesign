// promote-to-asset-form.jsx
import { ENTITY_TYPES } from "./audio-play-button.jsx";
import {
  AtSign,
  ChevronDown,
  ChevronRight$1 as ChevronRight,
  dedupedToast,
  jsxRuntimeExports,
  Loader2,
  reactExports,
  ShieldAlert,
  useTranslation,
} from "../vendor.js";
import {
  DropdownMenu,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useEntities } from "./wrap-as-asset-center-error.js";
import { FileText } from "../media-editing/package.jsx";
import {
  Button,
  cn$2 as cn,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import { Badge } from "../infra/badge-variants.jsx";
import { classifyAssetError, trackAssetCreate } from "../infra/use-online.jsx";
import {
  useCreateEntityFromPaths,
  useMaterializeEntity,
} from "./use-materialize-entity.js";
import {
  trackAssetPromoteValidationFailed,
  useAppendAttachmentFromWorkspace,
} from "./use-materialized-entities.jsx";
import { AssetMentionList } from "./asset-mention-list.jsx";
import { CollapsibleTags } from "./preset-tags.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../workspace/shortcut-hint.jsx";
function emptyPerFileMeta() {
  return {
    user_desc: "",
    expanded: false,
  };
}
const TYPE_OPTIONS = ENTITY_TYPES;
export function PromoteToAssetForm({
  files,
  workspaceRoot,
  onCancel,
  onSuccess,
  onSubmittingChange,
  variant = "dialog",
}) {
  const { t: t2 } = useTranslation();
  const appendMutation = useAppendAttachmentFromWorkspace();
  const createMutation = useCreateEntityFromPaths();
  const materializeMutation = useMaterializeEntity();
  const [mode2, setMode] = reactExports.useState("new");
  const existingEntitiesQuery = useEntities();
  const hasExistingEntities = (existingEntitiesQuery.data ?? []).length > 0;
  reactExports.useEffect(() => {
    if (!hasExistingEntities && mode2 !== "new") {
      setMode("new");
    }
  }, [hasExistingEntities, mode2]);
  const [pickedEntity, setPickedEntity] = reactExports.useState(null);
  const [newType, setNewType] = reactExports.useState("character");
  const [newName, setNewName] = reactExports.useState("");
  const [newDescription, setNewDescription] = reactExports.useState("");
  const [tags2, setTags] = reactExports.useState([]);
  const [submitAttempted, setSubmitAttempted] = reactExports.useState(false);
  const nameInputRef = reactExports.useRef(null);
  const [perFileMeta, setPerFileMeta] = reactExports.useState({});
  const [error, setError] = reactExports.useState(null);
  const isSubmitting = appendMutation.isPending || createMutation.isPending;
  const filesLen = files.length;
  reactExports.useEffect(() => {
    onSubmittingChange?.(isSubmitting);
  }, [isSubmitting, onSubmittingChange]);
  const isPopover = variant === "popover";
  const pickerMaxHeight = isPopover ? 180 : 220;
  const trimmedNewName = newName.trim();
  const nameMissing = mode2 === "new" && trimmedNewName.length === 0;
  const appendTargetMissing = mode2 === "append" && !pickedEntity;
  const showNameError = submitAttempted && nameMissing;
  const showAppendTargetError = submitAttempted && appendTargetMissing;
  const submitDisabled = isSubmitting || filesLen === 0;
  const getMeta = reactExports.useCallback(
    (absPath) => perFileMeta[absPath] ?? emptyPerFileMeta(),
    [perFileMeta],
  );
  const updateMeta = reactExports.useCallback((absPath, patch2) => {
    setPerFileMeta((prev) => {
      const existing = prev[absPath] ?? emptyPerFileMeta();
      return {
        ...prev,
        [absPath]: {
          ...existing,
          ...patch2,
        },
      };
    });
  }, []);
  const toggleExpand = reactExports.useCallback(
    (absPath) => {
      const current2 = getMeta(absPath);
      updateMeta(absPath, {
        expanded: !current2.expanded,
      });
    },
    [getMeta, updateMeta],
  );
  const handleSelectEntity = reactExports.useCallback((target) => {
    setPickedEntity(target);
    setSubmitAttempted(false);
    setError(null);
  }, []);
  const handleModeChange = reactExports.useCallback((value) => {
    setMode(value);
    setSubmitAttempted(false);
    setError(null);
  }, []);
  const handleSubmit = reactExports.useCallback(async () => {
    setSubmitAttempted(true);
    if (submitDisabled) {
      if (filesLen === 0) {
        trackAssetPromoteValidationFailed({
          promote_mode: mode2,
          entity_type: mode2 === "new" ? newType : pickedEntity?.entityType,
          attachment_count: 0,
          reason: "no_files",
        });
      }
      return;
    }
    setError(null);
    if (mode2 === "new" && newName.trim().length === 0) {
      trackAssetPromoteValidationFailed({
        promote_mode: "new",
        entity_type: newType,
        attachment_count: filesLen,
        reason: "missing_name",
      });
      nameInputRef.current?.focus();
      return;
    }
    if (mode2 === "append" && !pickedEntity) {
      trackAssetPromoteValidationFailed({
        promote_mode: "append",
        attachment_count: filesLen,
        reason: "missing_entity",
      });
      return;
    }
    if (mode2 === "append" && pickedEntity) {
      let successCount = 0;
      try {
        for (const f2 of files) {
          const meta2 = getMeta(f2.absolutePath);
          const trimmedDesc = meta2.user_desc.trim();
          await appendMutation.mutateAsync({
            entityId: pickedEntity.entityId,
            input: {
              // absolutePath: source of truth for fs.statSync on the gateway
              // — required because asset-center home gateway baseDir isn't
              // the workspace root, so workspaceRelPath alone can't be
              // resolved correctly there.
              absolutePath: f2.absolutePath,
              // workspaceRelPath: optional, used by gateway purely for
              // vault metadata.prompt lookup (vault is indexed by
              // workspace-relative paths). Passing both is the standard
              // pattern in workspace-context callers.
              workspaceRelPath: f2.workspaceRelPath,
              ...(trimmedDesc
                ? {
                    user_desc: trimmedDesc,
                  }
                : {}),
            },
          });
          successCount += 1;
        }
        dedupedToast.success(
          t2("assetCenter.promote.toastAppended", {
            entity: pickedEntity.entityName,
            count: successCount,
          }),
        );
        trackAssetCreate({
          source: "workspace_panel",
          method: "promote",
          success: true,
          has_description: false,
          promote_mode: "append",
          attachment_count: successCount,
        });
        onSuccess();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (successCount > 0) {
          dedupedToast.error(
            t2("assetCenter.promote.partialAppendError", {
              done: successCount,
              total: files.length,
              message: msg,
            }),
          );
          trackAssetCreate({
            source: "workspace_panel",
            method: "promote",
            success: false,
            has_description: false,
            promote_mode: "append",
            error_type: classifyAssetError(err),
          });
        } else {
          setError(msg);
          trackAssetCreate({
            source: "workspace_panel",
            method: "promote",
            success: false,
            has_description: false,
            promote_mode: "append",
            error_type: classifyAssetError(err),
          });
        }
      }
      return;
    }
    if (mode2 === "new") {
      try {
        const trimmedName = newName.trim();
        const trimmedDesc = newDescription.trim();
        const filesForServer = files.map((f2) => {
          const meta2 = getMeta(f2.absolutePath);
          const trimmedFileDesc = meta2.user_desc.trim();
          return {
            absolutePath: f2.absolutePath,
            ...(trimmedFileDesc
              ? {
                  user_desc: trimmedFileDesc,
                }
              : {}),
          };
        });
        const entity = await createMutation.mutateAsync({
          input: {
            type: newType,
            name: trimmedName,
            ...(trimmedDesc
              ? {
                  description: trimmedDesc,
                }
              : {}),
            ...(tags2.length > 0
              ? {
                  metadata: {
                    tags: tags2,
                  },
                }
              : {}),
            files: filesForServer,
            ...(workspaceRoot
              ? {
                  workspaceRootForVault: workspaceRoot,
                }
              : {}),
          },
        });
        if (workspaceRoot && entity.id) {
          try {
            await materializeMutation.mutateAsync({
              entityId: entity.id,
              input: {
                workspacePath: workspaceRoot,
              },
              _track: {
                entity_type: newType,
                trigger: "post_create",
              },
            });
          } catch {}
        }
        dedupedToast.success(
          t2("assetCenter.promote.toastCreated", {
            entity: entity.name,
            count: files.length,
          }),
        );
        trackAssetCreate({
          source: "workspace_panel",
          method: "promote",
          entity_type: newType,
          success: true,
          attachment_count: files.length,
          has_description: !!trimmedDesc,
          promote_mode: "new",
          auto_materialized: !!(workspaceRoot && entity.id),
        });
        onSuccess({
          entityName: entity.name,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        trackAssetCreate({
          source: "workspace_panel",
          method: "promote",
          entity_type: newType,
          success: false,
          has_description: !!newDescription.trim(),
          promote_mode: "new",
          error_type: classifyAssetError(err),
        });
      }
    }
  }, [
    files,
    filesLen,
    submitDisabled,
    mode2,
    pickedEntity,
    getMeta,
    appendMutation,
    createMutation,
    materializeMutation,
    newType,
    newName,
    newDescription,
    tags2,
    workspaceRoot,
    onSuccess,
    t2,
  ]);
  return (
    <>
      <Tabs value={mode2} onValueChange={handleModeChange}>
        {hasExistingEntities && (
          <TabsList className="w-full bg-muted/40 p-0.5 gap-0 rounded-md h-auto">
            <TabsTrigger
              value="new"
              className="flex-1 px-3 py-1.5 text-[13px] rounded-[5px] bg-transparent data-[active]:bg-muted-foreground/15 data-[active]:shadow-none text-muted-foreground hover:text-foreground data-[active]:text-foreground transition-all"
              data-action-ui-id="asset-panel.promote-tab-new"
            >
              {t2("assetCenter.promote.tabNew")}
            </TabsTrigger>
            <TabsTrigger
              value="append"
              className="flex-1 px-3 py-1.5 text-[13px] rounded-[5px] bg-transparent data-[active]:bg-muted-foreground/15 data-[active]:shadow-none text-muted-foreground hover:text-foreground data-[active]:text-foreground transition-all"
              data-action-ui-id="asset-panel.promote-tab-append"
            >
              {t2("assetCenter.promote.tabAppend")}
            </TabsTrigger>
          </TabsList>
        )}
        <TabsContent value="append" className="space-y-3 mt-3">
          <div className="space-y-1.5">
            <span
              className={cn(
                "text-sm font-medium block",
                showAppendTargetError
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {t2("assetCenter.promote.targetEntityLabel")}
            </span>
            <div
              className={cn(
                "rounded-md",
                showAppendTargetError && "ring-1 ring-destructive/30",
              )}
              data-action-ui-id="asset-panel.promote-entity-picker"
            >
              <AssetMentionList
                onSelect={handleSelectEntity}
                materializedOnly={false}
                maxHeight={pickerMaxHeight}
                selectedEntityId={pickedEntity?.entityId ?? null}
                bordered={true}
              />
            </div>
            {showAppendTargetError && (
              <p
                className="text-xs text-destructive"
                data-action-ui-id="asset-panel.promote-target-error"
              >
                {t2(
                  "assetCenter.promote.targetRequired",
                  "请选择一个要加入的目标资产",
                )}
              </p>
            )}
            {pickedEntity && (
              <span
                className="text-xs text-muted-foreground/70 block"
                data-action-ui-id="asset-panel.promote-picked-name"
              >
                {t2("assetCenter.promote.pickedLabel", {
                  name: pickedEntity.entityName,
                })}
              </span>
            )}
          </div>
        </TabsContent>
        <TabsContent
          value="new"
          className={hasExistingEntities ? "space-y-3 mt-3" : "space-y-3"}
        >
          <div className="space-y-1.5">
            <div
              className={cn(
                "flex items-center gap-2 -mx-2 rounded-md border border-transparent px-2 py-1.5 transition-colors",
                showNameError && "border-destructive/50 bg-destructive/10",
              )}
            >
              <AtSign
                size={12}
                className={cn(
                  "shrink-0",
                  showNameError ? "text-destructive" : "text-muted-foreground",
                )}
              />
              <input
                ref={nameInputRef}
                id="promote-new-name"
                value={newName}
                onChange={(e2) => {
                  setNewName(e2.target.value);
                  if (submitAttempted && e2.target.value.trim().length > 0) {
                    setSubmitAttempted(false);
                  }
                }}
                placeholder={`${t2("assetCenter.create.namePlaceholder")}（${t2("common.required", "必填")}）`}
                aria-invalid={showNameError}
                aria-describedby={
                  showNameError ? "promote-new-name-error" : void 0
                }
                className={cn(
                  "flex-1 min-w-0 bg-transparent font-heading text-sm font-medium outline-none",
                  showNameError
                    ? "text-destructive placeholder:text-destructive/65"
                    : "placeholder:text-muted-foreground/40",
                )}
                data-action-ui-id="asset-panel.promote-new-name"
              />
            </div>
            {showNameError && (
              <p
                id="promote-new-name-error"
                className="text-xs text-destructive"
                data-action-ui-id="asset-panel.promote-new-name-error"
              >
                {t2(
                  "assetCenter.promote.nameRequired",
                  "请输入资产名称后再创建",
                )}
              </p>
            )}
          </div>
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="shrink-0 cursor-pointer transition-colors hover:opacity-80 mr-2"
                data-action-ui-id="asset-panel.promote-new-type"
              >
                <Badge
                  variant="secondary"
                  className="text-[13px] h-[21px] px-1.5 font-medium gap-0.5 rounded-sm bg-muted-foreground/15 text-secondary-foreground"
                >
                  {t2(`assetCenter.types.${newType}`)}
                  <ChevronDown size={12} className="text-muted-foreground" />
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {TYPE_OPTIONS.map((opt) => (
                  <DropdownMenuItem key={opt} onClick={() => setNewType(opt)}>
                    {t2(`assetCenter.types.${opt}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="w-0.5 h-2.5 shrink-0 bg-muted-foreground/20 mr-3" />
            <textarea
              id="promote-new-description"
              value={newDescription}
              onChange={(e2) => setNewDescription(e2.target.value)}
              placeholder={t2("assetCenter.create.descriptionPlaceholder")}
              rows={1}
              className="flex-1 min-w-0 bg-transparent text-[13px] text-muted-foreground outline-none placeholder:text-muted-foreground/40 resize-none field-sizing-content break-words"
              data-action-ui-id="asset-panel.promote-new-description"
            />
          </div>
        </TabsContent>
      </Tabs>
      <div>
        <TooltipProvider delay={300}>
          <ul
            className={cn(
              "overflow-y-auto border border-border rounded-md divide-y divide-border",
              isPopover ? "max-h-40" : "max-h-56",
            )}
            data-action-ui-id="asset-panel.promote-files-list"
          >
            {files.map((f2) => {
              const meta2 = getMeta(f2.absolutePath);
              const rowButton = (
                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpand(f2.absolutePath)}
                  data-action-ui-id="asset-panel.promote-file-toggle"
                >
                  <FileText
                    size={14}
                    className="shrink-0 text-foreground opacity-35"
                  />
                  <span className="flex-1 truncate text-left">
                    {f2.displayName}
                  </span>
                  {meta2.expanded ? (
                    <ChevronDown
                      size={12}
                      className="shrink-0 text-muted-foreground opacity-50"
                    />
                  ) : (
                    <ChevronRight
                      size={12}
                      className="shrink-0 text-muted-foreground opacity-50"
                    />
                  )}
                </button>
              );
              return (
                <li key={f2.absolutePath}>
                  {f2.vaultPrompt ? (
                    <Tooltip>
                      <TooltipTrigger render={rowButton} />
                      <TooltipContent
                        side="left"
                        className="max-w-md text-sm whitespace-pre-wrap"
                      >
                        {f2.vaultPrompt}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    rowButton
                  )}
                  {meta2.expanded && (
                    <div className="px-2.5 pb-2 pt-0.5 flex items-start">
                      <div className="w-0.5 shrink-0 self-stretch bg-muted-foreground/15 rounded-full mr-2.5 ml-[3px]" />
                      <textarea
                        value={meta2.user_desc}
                        onChange={(e2) =>
                          updateMeta(f2.absolutePath, {
                            user_desc: e2.target.value,
                          })
                        }
                        placeholder={t2(
                          "assetCenter.create.attachmentCaptionPlaceholder",
                        )}
                        rows={1}
                        className="flex-1 min-w-0 bg-muted/30 rounded px-2 py-1.5 text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/40 resize-none field-sizing-content break-words"
                        data-action-ui-id="asset-panel.promote-file-user-desc"
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </TooltipProvider>
      </div>
      {mode2 === "new" && <CollapsibleTags tags={tags2} onChange={setTags} />}
      {error && (
        <div
          className="flex items-start gap-2 border border-destructive/50 bg-destructive/10 px-3 py-2 rounded-md"
          data-action-ui-id="asset-panel.promote-error"
        >
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      <div className="mt-1 flex items-center justify-end gap-2">
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-md"
            onClick={onCancel}
            disabled={isSubmitting}
            data-action-ui-id="asset-panel.promote-close"
          >
            {t2("common.cancel")}
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 rounded-md"
            onClick={() => void handleSubmit()}
            disabled={submitDisabled}
            data-action-ui-id="asset-panel.promote-submit"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {mode2 === "append"
              ? t2("assetCenter.promote.submitAppend")
              : t2("assetCenter.promote.submitNew")}
          </Button>
        </div>
      </div>
    </>
  );
}
