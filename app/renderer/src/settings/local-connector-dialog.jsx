// local-connector-dialog.jsx
import { useTranslation } from "react-i18next";
import { __jsx } from "../shared/jsx-runtime.js";
import { ConnectorDialogFrame } from "./connector-dialog-frame.jsx";
import { LocalConnectorSetupContent } from "./local-connector-setup-content.jsx";

export function LocalConnectorDialog(props) {
  const { t } = useTranslation();
  return (
    <ConnectorDialogFrame
      open={true}
      onOpenChange={(open) => !open && props.onClose()}
      actionUiId={`connector-${props.connectorId}-setup-dialog`}
      closeActionUiId={`connector-${props.connectorId}-close`}
      closeLabel={t("common.close")}
      size="md"
    >
      <LocalConnectorSetupContent {...props} />
    </ConnectorDialogFrame>
  );
}
