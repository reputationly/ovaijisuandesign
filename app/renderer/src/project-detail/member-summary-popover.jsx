// 项目成员概览气泡。
import { useTranslation, reactExports } from "../vendor.js";
import { Tooltip, TooltipTrigger, TooltipProvider } from "../vendor-inline/vscode-base/graph.jsx";
import { TooltipContent } from "../infra/dialog-content.jsx";
import { Popover } from "../assets/credit-query-keys.jsx";
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
import { ProjectMemberSummary } from "../projects/project-member-summary.jsx";
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
