// user-menu-account-summary.jsx
import { __jsx } from "../shared/jsx-runtime.js";

export function UserMenuAccountSummary({ children: children2 }) {
  return (
    <div
      data-action-ui-id="user-menu.account-summary"
      className="mx-3 mb-2 flex flex-col gap-0.5 rounded-md bg-secondary/70 p-1"
    >
      {children2}
    </div>
  );
}

export function UserMenuRootView({ children: children2 }) {
  return <div data-action-ui-id="user-menu.root-view">{children2}</div>;
}
