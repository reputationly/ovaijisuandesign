// 项目列表里的单张项目卡片：封面、名称、成员与时间、重命名与删除菜单。
import { useTranslation, reactExports } from "../vendor.js";
import { formatTimestampDot } from "../generation/use-model-catalog-scope-key.js";
import { ClickableArea, InlineRenameInput } from "../infra/inline-rename-input.jsx";
import { TooltipProvider, Tooltip, TooltipTrigger, DropdownMenu, MoreVerticalIcon } from "../vendor-inline/vscode-base/graph.jsx";
import { Users, Trash2 } from "../media-editing/package.jsx";
import { TooltipContent, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../infra/dialog-content.jsx";
import { PencilIcon } from "../workspace/home-service.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { ProjectCover } from "./project-cover.jsx";
export function ProjectCard({ project, onOpen, onRename, onRequestDelete }) {
  const { t, i18n } = useTranslation();
  const [menuOpen, setMenuOpen] = reactExports.useState(false);
  const [renaming, setRenaming] = reactExports.useState(false);
  const renameAfterMenuCloseRef = reactExports.useRef(false);
  const handleMenuOpenChange = reactExports.useCallback((open) => {
    setMenuOpen(open);
    if (open || !renameAfterMenuCloseRef.current) return;
    renameAfterMenuCloseRef.current = false;
    window.setTimeout(() => setRenaming(true), 0);
  }, []);
  const updatedLabel = i18n.language.startsWith("zh")
    ? formatTimestampDot(project.updatedAt)
    : new Date(project.updatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
  return (
    <div className="group relative w-full aspect-[4/3] min-w-0 overflow-visible text-left">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1 bottom-0 z-0 rounded-[24px] border border-[color:color-mix(in_srgb,var(--sidebar-foreground)_4%,transparent)] bg-[color:color-mix(in_srgb,var(--sidebar-accent)_98%,var(--sidebar-foreground))] shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[background-color,border-color,box-shadow] duration-200 group-hover:border-[color:color-mix(in_srgb,var(--sidebar-foreground)_10%,transparent)] group-hover:bg-[color:color-mix(in_srgb,var(--sidebar-accent)_92%,var(--brand-accent))] group-hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
      />
      <ClickableArea
        onClick={() => onOpen(project)}
        className="relative z-10 flex h-full w-full cursor-pointer flex-col items-stretch text-left"
        data-action-ui-id="project-card"
      >
        <div className="pointer-events-none absolute inset-x-5 top-4 h-[64%]">
          <div className="absolute inset-x-3 top-0 h-[88%] -rotate-3 rounded-[18px] bg-muted shadow-[0_3px_8px_rgba(0,0,0,0.10)]" />
          <div className="absolute -inset-x-0.5 top-3 h-[88%] rotate-2 overflow-hidden rounded-[18px] border border-border bg-card p-1 shadow-[0_4px_10px_rgba(0,0,0,0.14)]">
            <ProjectCover
              project={project}
              workspacePaths={project.workspacePaths}
              className="rounded-[12px] bg-card"
            />
          </div>
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-[40%] left-0 h-5 w-24 translate-y-px rounded-t-[32px] border border-b-0 border-[color:color-mix(in_srgb,var(--sidebar-foreground)_4%,transparent)] bg-[color:color-mix(in_srgb,color-mix(in_srgb,var(--sidebar-accent)_98%,var(--sidebar-foreground))_88%,transparent)] backdrop-blur-[6px] transition-colors duration-200 group-hover:border-[color:color-mix(in_srgb,var(--sidebar-foreground)_10%,transparent)] group-hover:bg-[color:color-mix(in_srgb,color-mix(in_srgb,var(--sidebar-accent)_92%,var(--brand-accent))_88%,transparent)]"
        />
        <div className="absolute inset-x-0 bottom-0 top-[calc(40%+20px)] flex min-h-0 flex-col justify-end overflow-hidden rounded-tr-[30px] rounded-b-[24px] border border-t-0 border-[color:color-mix(in_srgb,var(--sidebar-foreground)_4%,transparent)] bg-[color:color-mix(in_srgb,color-mix(in_srgb,var(--sidebar-accent)_98%,var(--sidebar-foreground))_88%,transparent)] pr-12 pl-5 pt-8 pb-3 backdrop-blur-[6px] transition-colors duration-200 group-hover:border-[color:color-mix(in_srgb,var(--sidebar-foreground)_10%,transparent)] group-hover:bg-[color:color-mix(in_srgb,color-mix(in_srgb,var(--sidebar-accent)_92%,var(--brand-accent))_88%,transparent)]">
          {project.kind === "team" ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className="absolute left-5 top-3 flex size-5 items-center justify-center rounded-full bg-sidebar/70 text-sidebar-foreground/60 transition-colors group-hover:bg-sidebar/20 group-hover:text-sidebar-foreground"
                      data-action-ui-id="project-card.team-badge"
                    >
                      <Users size={12} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                  }
                />
                <TooltipContent side="top">{t("project.kind.team")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
          {renaming ? (
            <InlineRenameInput
              initialName={project.name}
              placeholder={t("project.create.namePlaceholder")}
              onConfirm={(name) => {
                onRename(project, name);
                setRenaming(false);
              }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-medium text-[color:color-mix(in_srgb,var(--sidebar-foreground)_68%,transparent)] transition-colors group-hover:text-[color:color-mix(in_srgb,var(--sidebar-accent-foreground)_76%,transparent)] dark:text-[color:color-mix(in_srgb,var(--sidebar-foreground)_92%,transparent)] dark:group-hover:text-[color:color-mix(in_srgb,var(--sidebar-accent-foreground)_98%,transparent)]">
              {project.name}
            </p>
          )}
          <p className="text-[11px] text-sidebar-foreground/60 transition-colors group-hover:text-sidebar-accent-foreground/70 dark:text-sidebar-foreground/80 dark:group-hover:text-sidebar-accent-foreground/90">
            {updatedLabel}
          </p>
        </div>
      </ClickableArea>
      <DropdownMenu open={menuOpen} onOpenChange={handleMenuOpenChange}>
        <DropdownMenuTrigger
          aria-label={t("project.cardActions")}
          data-action-ui-id="project-card-more"
          className={`absolute right-3 bottom-3 z-20 flex size-7 items-center justify-center rounded-full border border-sidebar-border bg-sidebar/70 text-sidebar-foreground/70 transition-all duration-[80ms] hover:bg-sidebar hover:text-sidebar-foreground ${renaming ? "hidden" : menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        >
          <MoreVerticalIcon size={14} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" sideOffset={2}>
          <DropdownMenuItem
            onClick={() => {
              renameAfterMenuCloseRef.current = true;
              handleMenuOpenChange(false);
            }}
          >
            <PencilIcon size={14} strokeWidth={1.5} />
            {t("common.rename")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              setMenuOpen(false);
              onRequestDelete(project);
            }}
          >
            <Trash2 size={14} strokeWidth={1.5} />
            {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
