// restart-banner.jsx
import { AlertCircle, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button$1 } from "../infra/dialog-content.jsx";
import { getDesktopSettingsMainService } from "../team/copy-icon-button.jsx";

export function RestartBanner({ message: message2 }) {
  const { t: t2 } = useTranslation();
  const handleRelaunch = reactExports.useCallback(() => {
    void getDesktopSettingsMainService().relaunch();
  }, []);
  return (
    <div className="mt-2 flex items-center gap-2 rounded-sm border border-border bg-muted/50 px-3 py-2">
      <AlertCircle
        size={14}
        strokeWidth={1.5}
        className="shrink-0 text-muted-foreground"
      />
      <p className="flex-1 text-xs text-muted-foreground">
        {message2 ?? t2("settings.requiresRestart")}
      </p>
      <Button$1
        variant="outline"
        size="sm"
        className="h-6 text-xs font-normal"
        onClick={handleRelaunch}
      >
        {t2("settings.restartNow")}
      </Button$1>
    </div>
  );
}

const WINDOWS_DRIVE_ABSOLUTE_PATH_RE = /^[a-z]:[\\/]/i;

export function isAbsoluteLocalFilePath(value) {
  return (
    value.startsWith("/") ||
    value.startsWith("\\\\") ||
    WINDOWS_DRIVE_ABSOLUTE_PATH_RE.test(value)
  );
}
