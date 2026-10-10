// 「我的工作流」列表里的单个条目：重命名、描述、删除等。
import { useTranslation, jsxRuntimeExports, reactExports, API_PATHS, PanelsTopLeft } from "../vendor.js";
import { Button, Dialog, DialogContent, DialogHeader, DialogFooter, AlertDialog } from "../infra/dialog-content.jsx";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { PencilIcon } from "../workspace/home-service.jsx";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { Trash2 } from "../media-editing/package.jsx";
import { DialogTitle, DialogDescription, Textarea, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "../infra/badge-variants.jsx";
import { Input3 as Input } from "../infra/select-content.jsx";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { notifyComfyWorkflowsChanged } from "./use-comfy-workflows.js";
import { workflowDisplayName, workflowPresentation } from "./workflow-mapping.js";
const MAX_WORKFLOW_NAME_LENGTH = 80;
const MAX_WORKFLOW_DESCRIPTION_LENGTH = 300;
export function UserWorkflowListItem({ workflow, onView, useAction, onUse, onDelete }) {
  const { t } = useTranslation();
  const presentation = workflowPresentation(workflow);
  const [displayName, setDisplayName] = reactExports.useState(workflowDisplayName(workflow));
  const [shortDesc, setShortDesc] = reactExports.useState(presentation.shortDesc ?? "");
  const [draftName, setDraftName] = reactExports.useState(displayName);
  const [draftShortDesc, setDraftShortDesc] = reactExports.useState(shortDesc);
  const [editOpen, setEditOpen] = reactExports.useState(false);
  const [deleteOpen, setDeleteOpen] = reactExports.useState(false);
  const [deleting, setDeleting] = reactExports.useState(false);
  const [saving, setSaving] = reactExports.useState(false);
  const persistedName = workflowDisplayName(workflow);
  const persistedShortDesc = presentation.shortDesc ?? "";
  reactExports.useEffect(() => {
    setDisplayName(persistedName);
    setShortDesc(persistedShortDesc);
  }, [persistedName, persistedShortDesc]);
  const currentWorkflow = {
    ...workflow,
    displayName,
    shortDesc,
  };
  const handleOpenEdit = () => {
    setDraftName(displayName);
    setDraftShortDesc(shortDesc);
    setEditOpen(true);
  };
  const handleSave = async () => {
    const nextName = draftName.trim();
    if (!nextName || saving) return;
    const nextShortDesc = draftShortDesc.trim();
    setSaving(true);
    try {
      const metadata = {
        displayName: nextName,
        shortDesc: nextShortDesc,
      };
      const response = await gatewayFetch(API_PATHS.comfyUiWorkflowMetadata(workflow.id), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setDisplayName(nextName);
      setShortDesc(nextShortDesc);
      setEditOpen(false);
      notifyComfyWorkflowsChanged();
    } catch {
      dedupedToast.error(t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = () => {
    if (deleting) return;
    setDeleting(true);
    void onDelete(currentWorkflow)
      .then(() => setDeleteOpen(false))
      .catch(() => void 0)
      .finally(() => setDeleting(false));
  };
  return (
    <>
      <div
        data-action-ui-id="user-workflow-list-item"
        data-workflow-id={workflow.id}
        data-detail-enabled={onView ? "true" : void 0}
        className={`group flex min-h-[76px] items-center gap-3 rounded-lg border border-transparent bg-card px-4 py-3 ${onView ? "cursor-pointer transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm" : ""}`}
        onClick={onView ? () => onView(currentWorkflow) : void 0}
      >
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 group-focus-within:opacity-100"
              aria-label={t("workflows.edit")}
              onClick={(event) => {
                event.stopPropagation();
                handleOpenEdit();
              }}
              data-action-ui-id={`workflows-edit-${workflow.id}`}
            >
              <PencilIcon size={14} strokeWidth={1.5} />
            </Button>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {shortDesc || t("workflows.description.empty")}
          </p>
        </div>
        <div
          className="flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          data-action-ui-id="user-workflow-actions"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-md text-muted-foreground hover:bg-brand-accent/10 hover:text-brand-accent"
            aria-label={t("workflows.delete")}
            onClick={() => setDeleteOpen(true)}
            data-action-ui-id={`workflows-delete-${workflow.id}`}
          >
            <Icon icon={Trash2} size="sm" aria-hidden={true} />
          </Button>
          {useAction ??
            (onUse ? (
              <Button
                type="button"
                size="sm"
                className="h-7 rounded-md px-2.5 text-xs font-medium"
                onClick={onUse}
                data-action-ui-id={`workflows-use-${workflow.id}`}
              >
                <Icon icon={PanelsTopLeft} size="sm" aria-hidden={true} />
                {t("workflows.use")}
              </Button>
            ) : null)}
        </div>
      </div>
      <Dialog open={editOpen} onOpenChange={(open) => !saving && setEditOpen(open)}>
        <DialogContent size="md" data-action-ui-id="workflows-edit-dialog">
          <DialogHeader>
            <DialogTitle className="text-base">{t("workflows.edit.title")}</DialogTitle>
            <DialogDescription>{t("workflows.edit.description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-1">
            <label
              htmlFor="workflow-edit-name"
              className="grid gap-1.5 text-xs font-medium text-foreground"
            >
              {t("workflows.edit.nameLabel")}
              <Input
                id="workflow-edit-name"
                value={draftName}
                disabled={saving}
                maxLength={MAX_WORKFLOW_NAME_LENGTH}
                onChange={(event) => setDraftName(event.target.value)}
                data-action-ui-id="workflows-edit-name"
              />
            </label>
            <label
              htmlFor="workflow-edit-summary"
              className="grid gap-1.5 text-xs font-medium text-foreground"
            >
              {t("workflows.edit.summaryLabel")}
              <Textarea
                id="workflow-edit-summary"
                value={draftShortDesc}
                disabled={saving}
                maxLength={MAX_WORKFLOW_DESCRIPTION_LENGTH}
                rows={4}
                placeholder={t("workflows.edit.summaryPlaceholder")}
                className="placeholder:text-foreground/30"
                onChange={(event) => setDraftShortDesc(event.target.value)}
                data-action-ui-id="workflows-edit-summary"
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setEditOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={!draftName.trim() || saving}
              loading={saving}
              onClick={handleSave}
              data-action-ui-id="workflows-edit-save"
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent
          size="sm"
          className="min-w-0"
          data-action-ui-id="workflows-delete-dialog"
        >
          <AlertDialogHeader className="min-w-0 max-w-full">
            <AlertDialogTitle>{t("workflows.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription className="min-w-0 max-w-full break-words [overflow-wrap:anywhere]">
              {t("workflows.delete.description", {
                name: displayName,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={deleting}
              onClick={handleDelete}
              data-action-ui-id={`workflows-delete-confirm-${workflow.id}`}
            >
              {t("workflows.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
