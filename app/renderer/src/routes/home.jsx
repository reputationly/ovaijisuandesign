// home.jsx
import { jsxRuntimeExports } from "../vendor.js";
import { Outlet } from "../infra/match-view.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
function HomeRouteGroup() {
  return <Outlet />;
}
export { HomeRouteGroup as component };
