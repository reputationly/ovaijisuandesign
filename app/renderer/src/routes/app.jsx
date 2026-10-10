// app.jsx
import { jsxRuntimeExports } from "../vendor.js";
import { Outlet } from "../infra/match-view.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
function AppRouteGroup() {
  return <Outlet />;
}
export { AppRouteGroup as component };
