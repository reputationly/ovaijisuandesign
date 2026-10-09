// add-to-project-sub-menu.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { Folder, Users } from "../media-editing/package.jsx";
import { StrokeIcon } from "./use-prompt-icon.jsx";
import { Check, reactExports, Search, useTranslation } from "../vendor.js";
import { DropdownMenuSub } from "../vendor-inline/vscode-base/graph.jsx";
import {
  filterProjectsByKeyword,
  sortProjects,
} from "./normalize-project-entries.js";
import { DropdownMenuItem } from "../infra/dialog-content.jsx";
import {
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "./shortcut-hint.jsx";

const PROJECT_PICKER_SEARCH_THRESHOLD = 6;

function ProjectFolderIcon({ useStrokeSpec }) {
  return useStrokeSpec ? (
    <StrokeIcon icon={Folder} size={14} />
  ) : (
    <Folder size={14} strokeWidth={1.5} />
  );
}

export function AddToProjectSubMenu({
  projects,
  currentProjectId,
  onSelect,
  useStrokeSpec = false,
}) {
  const { t: t2 } = useTranslation();
  const [keyword2, setKeyword] = reactExports.useState("");
  const candidates2 = reactExports.useMemo(
    () => sortProjects(filterProjectsByKeyword(projects, keyword2), "updated"),
    [keyword2, projects],
  );
  const showSearch = projects.length >= PROJECT_PICKER_SEARCH_THRESHOLD;
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger data-action-ui-id="workspace.add-to-project">
        <ProjectFolderIcon useStrokeSpec={useStrokeSpec} />
        {t2("project.addToProject")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="flex max-h-56 min-w-44 max-w-72 flex-col overflow-hidden">
        {showSearch ? (
          <div className="flex shrink-0 items-center gap-1.5 px-2 pb-1.5">
            {useStrokeSpec ? (
              <StrokeIcon
                icon={Search}
                size={12}
                className="text-muted-foreground"
              />
            ) : (
              <Search
                size={12}
                strokeWidth={1.5}
                className="shrink-0 text-muted-foreground"
              />
            )}
            <input
              value={keyword2}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder={t2("project.searchPlaceholder")}
              className="h-6 w-full bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
              data-action-ui-id="workspace.add-to-project-search"
            />
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {candidates2.length === 0 ? (
            <p className="px-2.5 py-1.5 text-[11px] whitespace-nowrap text-muted-foreground">
              {t2("project.noProjects")}
            </p>
          ) : (
            candidates2.map((project2) => {
              const isCurrent = project2.id === currentProjectId;
              return (
                <DropdownMenuItem
                  key={project2.id}
                  disabled={isCurrent}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isCurrent) return;
                    onSelect(project2.id);
                  }}
                >
                  {project2.kind === "team" ? (
                    useStrokeSpec ? (
                      <StrokeIcon icon={Users} size={14} />
                    ) : (
                      <Users size={14} strokeWidth={1.5} />
                    )
                  ) : (
                    <ProjectFolderIcon useStrokeSpec={useStrokeSpec} />
                  )}
                  <span className="min-w-0 flex-1 truncate">
                    {project2.name}
                  </span>
                  {isCurrent ? (
                    useStrokeSpec ? (
                      <StrokeIcon icon={Check} size={12} />
                    ) : (
                      <Check className="size-3" strokeWidth={1.75} />
                    )
                  ) : null}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
