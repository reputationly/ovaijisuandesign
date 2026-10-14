// restart-banner.jsx
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "../media-editing/lucide-icon-wraps.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button } from "../infra/dialog-content.jsx";
import { getDesktopSettingsMainService } from "../team/copy-icon-button.jsx";
export function RestartBanner({ message }) {
  const { t } = useTranslation();
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
        {message ?? t("settings.requiresRestart")}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="h-6 text-xs font-normal"
        onClick={handleRelaunch}
      >
        {t("settings.restartNow")}
      </Button>
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
