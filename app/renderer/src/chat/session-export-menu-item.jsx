import { ContextMenuItem as ContextMenuItem$1 } from "./context-menu-item.jsx";
import { Spinner } from "./spinner.jsx";
import { Download as Download$3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { __jsx } from "../shared/jsx-runtime.js";
export function SessionExportMenuItem({ actionUiId, isExporting = false, onExport }) {
  const { t: t2 } = useTranslation();
  return (
    <ContextMenuItem$1 disabled={isExporting} onClick={onExport} data-action-ui-id={actionUiId}>
      {isExporting ? <Spinner className="size-3.5" /> : <Download$3 />}
      {isExporting ? t2("session.export.exporting", "Exporting...") : t2("session.export.menuItem", "Export Chat")}
    </ContextMenuItem$1>
  );
}
