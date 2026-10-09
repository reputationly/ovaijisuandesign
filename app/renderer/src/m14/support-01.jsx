// support-01.jsx
import {
  reactExports,
  installScrollbarVisibility,
  reportRendererReady,
  clientExports,
  root,
} from "../vendor.js";
import { homeService } from "../m08/browser-inspiration-urls.jsx";
import { ErrorBoundary } from "../m09/error-fallback-ui.jsx";
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
