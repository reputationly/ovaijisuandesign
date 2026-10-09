// create-project-dialog.jsx
import {
  BadgeInfo,
  jsxRuntimeExports,
  reactExports,
  useNewProjectFolder,
  usePlatform,
  useTranslation,
  workspaceLog,
  X$7,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useFolderPermissionGate } from "./use-folder-permission-gate.jsx";
import { LocalFolderIcon } from "./home-service.jsx";
import {
  DATA_DIRECTORY_STATUS_CHANGED_EVENT,
  getDataDirectoryMainService,
} from "../settings/get-data-directory-main-service.js";
import { Folder } from "../media-editing/package.jsx";
import {
  PROJECT_NAME_MAX_CHARS,
  truncateProjectName,
} from "../generation/normalize-skill-detail-metadata.js";
import {
  Button$1,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";
import { Label } from "../team/use-wallet-query.jsx";
import { Input3 } from "../infra/select-content.jsx";

function ProjectOutputLocation({ disabled: disabled2 }) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const [folderPath, setFolderPath] = useNewProjectFolder();
  const [projectsRoot, setProjectsRoot] = reactExports.useState();
  const [picking, setPicking] = reactExports.useState(false);
  const { ensureGranted, dialog } = useFolderPermissionGate();
  reactExports.useEffect(() => {
    let generation = 0;
    const refresh = () => {
      const request = ++generation;
      void getDataDirectoryMainService()
        .getProjectsRoot()
        .then((root2) => {
          if (request === generation) setProjectsRoot(root2);
        })
        .catch((error) => {
          workspaceLog.info("project-output-location: root-unavailable", {
            error,
          });
        });
    };
    refresh();
    window.addEventListener(DATA_DIRECTORY_STATUS_CHANGED_EVENT, refresh);
    return () => {
      generation++;
      window.removeEventListener(DATA_DIRECTORY_STATUS_CHANGED_EVENT, refresh);
    };
  }, []);
  const handlePick = async () => {
    if (disabled2 || picking || !platform2.fs.showOpenDialog) return;
    setPicking(true);
    try {
      const paths = await platform2.fs.showOpenDialog({
        directory: true,
        multiple: false,
        title: t2("workspace.newProject.selectFolderTitle"),
        defaultPath: folderPath ?? projectsRoot,
      });
      const picked = paths?.[0];
      if (picked && (await ensureGranted(picked))) setFolderPath(picked);
    } catch (error) {
      workspaceLog.info("project-output-location: pick-failed", {
        error,
      });
    } finally {
      setPicking(false);
    }
  };
  const displayedPath =
    folderPath ?? projectsRoot ?? t2("workspace.newProject.locationLoading");
  return (
    <>
      <div
        className="new-workspace-path-picker rounded-b-lg relative z-1 flex min-h-10 w-full min-w-0 max-w-full items-center gap-3 overflow-hidden border-0 px-3 py-2 text-left"
        data-action-ui-id="create-project-folder-row"
      >
        <div
          className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden"
          data-layout-slot="create-project-folder-content"
        >
          <LocalFolderIcon className="size-4 shrink-0" />
          <span className="flex min-w-0 flex-1 items-baseline gap-2 overflow-hidden">
            <span className="max-w-[82px] shrink truncate text-body-14 text-muted-foreground">
              {t2("workspace.newProject.locationLabel")}
            </span>
            <span
              className="min-w-0 flex-1 truncate whitespace-nowrap text-body-14 text-muted-foreground"
              title={displayedPath}
            >
              {displayedPath}
            </span>
          </span>
        </div>
        <div
          className="flex shrink-0 items-center gap-1"
          data-layout-slot="create-project-folder-actions"
        >
          <button
            type="button"
            disabled={disabled2 || picking || !platform2.fs.showOpenDialog}
            onClick={() => void handlePick()}
            className="shrink-0 rounded-sm px-1.5 py-1 text-body-14 font-medium whitespace-nowrap text-brand-accent transition-colors disabled:opacity-50 disabled:pointer-events-none hover:bg-brand-accent/10"
            data-action-ui-id="create-project-folder-pick"
          >
            {t2("workspace.newProject.changeFolder")}
          </button>
          {folderPath ? (
            <button
              type="button"
              disabled={disabled2 || picking}
              onClick={() => setFolderPath(void 0)}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none hover:bg-foreground/5 hover:text-foreground"
              data-action-ui-id="create-project-folder-clear"
              aria-label={t2("common.clear", "清除")}
            >
              <X$7 size={14} strokeWidth={1.5} />
            </button>
          ) : null}
        </div>
      </div>
      {dialog}
    </>
  );
}

export function CreateProjectDialog({ open, kind, onConfirm, onOpenChange }) {
  const { t: t2 } = useTranslation();
  const [name2, setName] = reactExports.useState("");
  const [pending2, setPending] = reactExports.useState(false);
  const composingRef = reactExports.useRef(false);
  const trimmed = truncateProjectName(name2);
  reactExports.useEffect(() => {
    if (open) return;
    setName("");
    setPending(false);
  }, [open]);
  const handleConfirm = reactExports.useCallback(async () => {
    if (!trimmed || pending2) return;
    setPending(true);
    try {
      await onConfirm(trimmed, kind);
    } finally {
      setPending(false);
    }
  }, [kind, onConfirm, pending2, trimmed]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="md"
        overlayClassName="creation-dialog-overlay"
        className="creation-dialog flex max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:!max-w-[508px]"
        data-action-ui-id="create-project-dialog"
      >
        <div
          className="min-h-0 min-w-0 overflow-y-auto px-4 pt-4 pb-3 sm:px-5 sm:pt-5"
          data-action-ui-id="create-project-dialog-body"
        >
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2 text-body-14 leading-5 font-medium tracking-normal">
              <Folder
                className="size-4 shrink-0"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              {kind === "team"
                ? t2("project.create.teamTitle")
                : t2("project.create.localTitle")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {kind === "team"
                ? t2("project.create.teamDescription")
                : t2("project.create.localDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="create-project-name" className="sr-only">
              {t2("project.create.nameLabel")}
            </Label>
            <div className="relative min-w-0 overflow-visible">
              <Input3
                id="create-project-name"
                className="creation-dialog-name-input relative z-2 h-12 rounded-lg px-3 text-body-15 font-normal tracking-normal"
                autoFocus={true}
                value={name2}
                onChange={(event) => setName(event.target.value)}
                onCompositionStart={() => {
                  composingRef.current = true;
                }}
                onCompositionEnd={() => {
                  composingRef.current = false;
                }}
                onKeyDown={(event) => {
                  if (composingRef.current || event.nativeEvent.isComposing)
                    return;
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  void handleConfirm();
                }}
                aria-label={t2("project.create.nameLabel")}
                placeholder={t2("project.create.namePlaceholder")}
                autoComplete="off"
                maxLength={PROJECT_NAME_MAX_CHARS}
                data-action-ui-id="create-project-name-input"
              />
              {open && kind === "local" ? (
                <ProjectOutputLocation disabled={pending2} />
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
            <BadgeInfo
              className="mt-0.5 size-4 shrink-0"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p>
              {kind === "team"
                ? t2("project.create.teamDescription")
                : t2("project.create.localDescription")}
            </p>
          </div>
        </div>
        <DialogFooter className="shrink-0 flex-row justify-end gap-2 px-4 pb-4 sm:px-5 sm:pb-5">
          <Button$1
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={pending2}
            className="creation-dialog-action-button min-w-20 font-medium"
          >
            {t2("common.cancel")}
          </Button$1>
          <Button$1
            onClick={() => void handleConfirm()}
            disabled={!trimmed || pending2}
            className="creation-dialog-action-button min-w-22 font-medium"
            data-action-ui-id="create-project-submit"
          >
            {t2("project.create.submit")}
          </Button$1>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
