// offline-banner.jsx
import { reactExports, usePlatform, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { DEBUG_FLAGS, useDebugFlag } from "./use-deep-link-router.js";
import { useOnline } from "../infra/use-online.jsx";
import { ImBridgeDialogCtx } from "../assets/wrap-as-asset-center-error.js";

export function useImBridgeDialog() {
  const ctx = reactExports.useContext(ImBridgeDialogCtx);
  if (!ctx)
    throw new Error(
      "useImBridgeDialog must be used within ImBridgeDialogProvider",
    );
  return ctx;
}

export function OfflineBanner() {
  const { t: t2 } = useTranslation();
  const online = useOnline();
  const forceOfflineBanner = useDebugFlag(DEBUG_FLAGS.forceOfflineBanner);
  if (online && !forceOfflineBanner) return null;
  return (
    <div
      className="pointer-events-none fixed bottom-4 left-1/2 z-[100] -translate-x-1/2"
      data-action-ui-id="offline-banner"
    >
      <div
        role="status"
        className="pointer-events-none flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/15 px-4 py-1.5 text-xs text-destructive shadow-sm backdrop-blur"
      >
        {t2(
          "common.offline",
          "No internet connection. Some features may be unavailable until you reconnect.",
        )}
      </div>
    </div>
  );
}

const WINDOWS_TITLEBAR_HEIGHT = 32;

function deriveWindowChrome(os2) {
  const isMac2 = os2 === "darwin";
  const isWin = os2 === "win32";
  const chromeMode = isMac2
    ? "mac-integrated"
    : isWin
      ? "windows-wco"
      : "native-frame";
  const titlebarHeight = isWin ? WINDOWS_TITLEBAR_HEIGHT : 0;
  return {
    chromeMode,
    isMacIntegratedChrome: isMac2,
    isWindowsTitlebarOverlay: isWin,
    isNativeFrame: !isMac2 && !isWin,
    hasReservedTitlebar: isWin,
    titlebarHeight,
    titlebarHeightCss: `${titlebarHeight}px`,
    isCustomChrome: isMac2 || isWin,
    needsDragRegion: isMac2 || isWin,
    needsTrafficLightSpacer: isMac2,
    needsWindowControls: false,
  };
}

export function useWindowChrome() {
  const { app } = usePlatform();
  return reactExports.useMemo(() => deriveWindowChrome(app.os), [app.os]);
}
