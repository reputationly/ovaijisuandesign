// support-01.jsx
import { reactExports, clientExports } from "../vendor.js";
import { installScrollbarVisibility, reportRendererReady } from "../assets/apply-asset-change.jsx";
import { root } from "./split-pinned-inventory.js";
import { homeService } from "../workspace/browser-inspiration-urls.jsx";
import { ErrorBoundary } from "./error-fallback-ui.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { AppRoot } from "./app-root.jsx";
function AppRootWithRendererReady() {
  reactExports.useEffect(() => installScrollbarVisibility(), []);
  reactExports.useEffect(() => {
    void reportRendererReady(homeService.hiloApp).catch(() => {});
  }, []);
  return <AppRoot />;
}
clientExports.createRoot(root).render(
  <reactExports.StrictMode>
    <ErrorBoundary>
      <AppRootWithRendererReady />
    </ErrorBoundary>
  </reactExports.StrictMode>,
);
