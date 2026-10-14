// lib-tv-connector-dialog.jsx
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { __jsx } from "../shared/jsx-runtime.js";
import { ConnectorDialogFrame } from "./connector-dialog-frame.jsx";
import { ConnectorRelationshipGraphic } from "./connector-relationship-graphic.jsx";
import { OFFICIAL_CONNECTORS } from "./request-prompt-prefill.jsx";
import {
  Button,
  DialogFooter,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";
import { homeService } from "../workspace/home-service.jsx";
function preparationErrorKey(code) {
  return code === "runtime_unavailable"
    ? "connectors.libtv.runtimeRequired"
    : code === "busy"
      ? "connectors.libtv.busy"
      : code === "server_exists"
        ? "connectors.libtv.conflict"
        : "connectors.libtv.failed";
}
export function LibTvConnectorDialog({
  onClose,
  onPrepared,
  embedded = false,
  onBusyChange,
  preparation,
}) {
  const { t } = useTranslation();
  const [localPending, setPending] = reactExports.useState(false);
  const [retryStarted, setRetryStarted] = reactExports.useState(false);
  const pending = localPending || preparation?.state === "installing";
  const [error, setError] = reactExports.useState();
  const busy = reactExports.useRef(false);
  const mounted = reactExports.useRef(true);
  const dismissed = reactExports.useRef(false);
  reactExports.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const handleClose = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    onBusyChange?.(false);
    onClose();
  };
  const handleAuthorize = async () => {
    if (busy.current || pending || dismissed.current) return;
    setRetryStarted(true);
    busy.current = true;
    setPending(true);
    setError(void 0);
    try {
      const result = await homeService.customMcp.prepareRemoteConnector({
        connectorId: "libtv",
        action: "authorize",
      });
      if (!mounted.current || dismissed.current) return;
      onPrepared?.();
      if (result.ok && result.mcpConnected) handleClose();
      else setError(t(preparationErrorKey(result.code)));
    } catch {
      if (mounted.current && !dismissed.current)
        setError(t("connectors.libtv.failed"));
    } finally {
      busy.current = false;
      if (mounted.current && !dismissed.current) {
        setPending(false);
        onBusyChange?.(false);
      }
    }
  };
  const visibleError =
    error ??
    (!retryStarted &&
    preparation &&
    preparation.state !== "installing" &&
    !preparation.ok
      ? t(preparationErrorKey(preparation.code))
      : void 0);
  const content = (
    <div
      className="flex min-h-0 flex-1 flex-col p-6"
      data-action-ui-id="connectors-libtv-setup"
    >
      <ConnectorRelationshipGraphic
        targetIconUrl={OFFICIAL_CONNECTORS.libtv.iconUrl}
        className="mb-4 justify-center"
      />
      <DialogHeader className="items-center text-center">
        <DialogTitle>{t("connectors.libtv.title")}</DialogTitle>
        <DialogDescription>
          {t("connectors.libtv.description")}
        </DialogDescription>
      </DialogHeader>
      <p className="my-5 text-sm text-muted-foreground" role="status">
        {t(pending ? "connectors.libtv.waiting" : "connectors.libtv.hint")}
      </p>
      {visibleError ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {visibleError}
        </p>
      ) : null}
      <DialogFooter>
        <Button
          variant="outline"
          className="h-9 min-w-22 rounded-lg px-4"
          onClick={handleClose}
          data-action-ui-id="connectors-libtv-dismiss"
        >
          {t("connectors.libtv.dismiss")}
        </Button>
        <Button
          className="h-9 min-w-26 rounded-lg px-4"
          onClick={() => void handleAuthorize()}
          disabled={pending}
          loading={pending}
          data-action-ui-id="connectors-libtv-authorize"
        >
          {t("connectors.libtv.authorize")}
        </Button>
      </DialogFooter>
    </div>
  );
  return embedded ? (
    content
  ) : (
    <ConnectorDialogFrame
      open={true}
      onOpenChange={(open) => !open && handleClose()}
      actionUiId="connectors-libtv-dialog"
      closeLabel={t("common.close")}
      closeActionUiId="connectors-libtv-close"
    >
      {content}
    </ConnectorDialogFrame>
  );
}
