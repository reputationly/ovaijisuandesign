// logged-out-sidebar-action-presentation.jsx
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { CircleUserRound } from "../media-editing/package.jsx";
import { Button } from "../infra/dialog-content.jsx";
import { useTranslation } from "../vendor.js";
import { UserAvatarMenu } from "../workspace/user-avatar-menu.jsx";
import { useAuth } from "../assets/credit-query-keys.jsx";
function LoggedOutSidebarActionPresentation({
  showUsername = false,
  label,
  onLogin,
  companionAction,
}) {
  if (showUsername) {
    return (
      <div
        className="flex h-8 items-center gap-1.5 px-2"
        data-action-ui-id="sidebar.logged-out-actions"
      >
        <Button
          type="button"
          variant="default"
          title={label}
          aria-label={label}
          onClick={onLogin}
          data-action-ui-id="sidebar.login"
          className="h-8 min-w-0 flex-1 justify-center rounded-md border-0 px-3 text-[13px] font-normal leading-[13px]"
        >
          <span className="min-w-0 truncate">{label}</span>
        </Button>
        {companionAction ? (
          <span
            className="flex size-8 shrink-0 items-center justify-center"
            data-action-ui-id="sidebar.logged-out-companion"
          >
            {companionAction}
          </span>
        ) : null}
      </div>
    );
  }
  return (
    <div
      className="flex flex-col items-center gap-1.5"
      data-action-ui-id="sidebar.logged-out-actions"
    >
      {companionAction ? (
        <span
          className="flex size-8 items-center justify-center"
          data-action-ui-id="sidebar.logged-out-companion"
        >
          {companionAction}
        </span>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        title={label}
        onClick={onLogin}
        data-action-ui-id="sidebar.login"
        className="size-8 rounded-md text-muted-foreground hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground"
      >
        <Icon
          icon={CircleUserRound}
          size="lg"
          className="size-[18px]"
          aria-hidden={true}
        />
      </Button>
    </div>
  );
}
export function SidebarUserMenu({
  popupPosition = "right",
  showUsername = false,
  onChangelog,
  onOverlayOpenChange,
  trailingAction,
} = {}) {
  const { t: t2 } = useTranslation();
  const { user, isLoggedIn, isLoading, login, logout } = useAuth();
  if (isLoading) {
    return (
      <div className={showUsername ? "flex h-10 w-full items-center" : "pb-2"}>
        <span
          className={
            showUsername ? "flex h-9 w-full items-center rounded-md px-2" : ""
          }
        >
          <div className="flex size-7 shrink-0 items-center justify-center">
            <div className="size-5 animate-spin rounded-full border-2 border-border border-t-muted-foreground" />
          </div>
        </span>
      </div>
    );
  }
  if (!isLoggedIn) {
    return (
      <LoggedOutSidebarActionPresentation
        showUsername={showUsername}
        label={t2("sidebar.loginOrRegister")}
        onLogin={login}
        companionAction={trailingAction}
      />
    );
  }
  return (
    <div>
      <UserAvatarMenu
        user={user ?? {}}
        onLogout={logout}
        popupPosition={popupPosition}
        showUsername={showUsername}
        onChangelog={onChangelog}
        onOverlayOpenChange={onOverlayOpenChange}
        trailingAction={trailingAction}
      />
    </div>
  );
}
