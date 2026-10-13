// account-switcher-row-surface.jsx
import {
  Check,
  jsxRuntimeExports,
  reactExports,
  UserRound,
  useTranslation,
} from "../vendor.js";
import {
  Icon,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Spinner } from "./use-team-transactions-feed-query.jsx";
import { Users } from "../media-editing/package.jsx";
import {
  Button,
  cn$2 as cn,
  TooltipContent,
} from "../infra/dialog-content.jsx";
export function AccountSwitcherRowSurface({
  accountType,
  active = false,
  dataActionUiId,
  dataGroupId,
  dataTeamRole,
  disabled = false,
  disabledReason,
  displayName,
  groupId,
  loading = false,
  meta,
  tag,
  onClick,
}) {
  const reasonId = reactExports.useId();
  const { t } = useTranslation();
  const unavailable = disabled && !active && Boolean(disabledReason);
  const nativeDisabled = active || (disabled && !disabledReason);
  const content = (
    <>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-foreground/[0.05]">
        <Icon
          icon={accountType === "PERSONAL" ? UserRound : Users}
          size="sm"
          className="text-foreground opacity-50"
          aria-hidden={true}
        />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate font-normal text-body-12 text-current">
            {displayName}
          </span>
          {meta ? (
            <span className="shrink-0 truncate text-caption-11 font-normal text-muted-foreground">
              {meta}
            </span>
          ) : null}
        </span>
        {groupId ? (
          <span className="block truncate text-caption-11 font-normal text-muted-foreground">
            {t("team.management.groupId", {
              defaultValue: "Group ID",
            })}
            {": "}
            {groupId}
          </span>
        ) : null}
      </span>
      {tag ? (
        <span className="shrink-0 text-caption-11 font-normal text-muted-foreground">
          {tag}
        </span>
      ) : null}
      {loading ? (
        <span role="status" className="inline-flex shrink-0" aria-live="polite">
          <Spinner className="shrink-0" />
          <span className="sr-only">Loading</span>
        </span>
      ) : null}
      {active && !loading ? (
        <Icon
          icon={Check}
          size="sm"
          className="shrink-0 text-foreground"
          aria-hidden={true}
        />
      ) : null}
    </>
  );
  const buttonClassName = cn(
    "h-auto min-h-10 w-full min-w-0 justify-start gap-2 rounded-md px-2 py-1.5 leading-tight whitespace-normal text-foreground/70 hover:bg-foreground/[0.03] hover:text-foreground",
    active &&
      "bg-foreground/[0.05] text-foreground hover:bg-foreground/[0.05] disabled:opacity-100",
    unavailable && "cursor-not-allowed opacity-50",
  );
  if (unavailable && disabledReason) {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  className={buttonClassName}
                  aria-disabled="true"
                  aria-label={displayName}
                  aria-describedby={reasonId}
                  data-action-ui-id={dataActionUiId}
                  data-account-type={accountType.toLowerCase()}
                  data-group-id={dataGroupId}
                  data-team-role={dataTeamRole}
                />
              }
            >
              {content}
            </TooltipTrigger>
            <TooltipContent>{disabledReason}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span id={reasonId} className="sr-only">
          {disabledReason}
        </span>
      </>
    );
  }
  return (
    <Button
      type="button"
      variant="ghost"
      className={buttonClassName}
      disabled={nativeDisabled}
      aria-label={displayName}
      aria-current={active ? "true" : void 0}
      aria-busy={loading || void 0}
      onClick={onClick}
      data-action-ui-id={dataActionUiId}
      data-account-type={accountType.toLowerCase()}
      data-group-id={dataGroupId}
      data-team-role={dataTeamRole}
    >
      {content}
    </Button>
  );
}
