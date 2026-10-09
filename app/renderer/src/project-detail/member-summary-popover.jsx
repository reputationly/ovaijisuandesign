// 项目成员概览气泡。
import {
  h as useTranslation,
  r as reactExports,
  gu as Tooltip,
  gv as TooltipTrigger,
  gw as TooltipContent,
  it as Popover,
  gt as TooltipProvider,
  iu as PopoverTrigger,
  iv as PopoverContent,
} from "../main.jsx";
import { P as ProjectMemberSummary } from "../ProjectMemberSummary-tUEX4nJc.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { InviteProjectPanel } from "./invite.jsx";
export function ProjectMemberSummaryPopover({ project, members, canManageMembers }) {
  const { t } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  if (members.length === 0) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger
                render={
                  <ProjectMemberSummary
                    members={members}
                    ariaLabel={t("project.invite.membersTitle", {
                      name: project.name,
                    })}
                  />
                }
              />
            }
          />
          {open ? null : (
            <TooltipContent side="bottom">
              {t(
                canManageMembers ? "project.invite.viewMembers" : "project.invite.viewMembersOnly",
              )}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[320px] gap-3 p-3"
        data-action-ui-id="project-detail.members-popover"
      >
        <InviteProjectPanel
          project={project}
          canManageMembers={canManageMembers}
          refreshKey={open}
          hideAccessBanner={true}
          hideInviteCta={true}
        />
      </PopoverContent>
    </Popover>
  );
}
