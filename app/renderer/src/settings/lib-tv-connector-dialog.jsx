// lib-tv-connector-dialog.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ConnectorDialogFrame } from "./connector-dialog-frame.jsx";
import { ConnectorRelationshipGraphic } from "./connector-relationship-graphic.jsx";
import { OFFICIAL_CONNECTORS } from "./request-prompt-prefill.jsx";
import {
  Button$1,
  DialogFooter,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";
import { homeService } from "../workspace/home-service.jsx";

function preparationErrorKey(code2) {
  return code2 === "runtime_unavailable"
    ? "connectors.libtv.runtimeRequired"
    : code2 === "busy"
      ? "connectors.libtv.busy"
      : code2 === "server_exists"
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
  const { t: t2 } = useTranslation();
  const [localPending, setPending] = reactExports.useState(false);
  const [retryStarted, setRetryStarted] = reactExports.useState(false);
  const pending2 = localPending || preparation?.state === "installing";
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
    if (busy.current || pending2 || dismissed.current) return;
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
      else setError(t2(preparationErrorKey(result.code)));
    } catch {
      if (mounted.current && !dismissed.current)
        setError(t2("connectors.libtv.failed"));
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
      ? t2(preparationErrorKey(preparation.code))
      : void 0);
  const content2 = (
    <div
      className="flex min-h-0 flex-1 flex-col p-6"
      data-action-ui-id="connectors-libtv-setup"
    >
      <ConnectorRelationshipGraphic
        targetIconUrl={OFFICIAL_CONNECTORS.libtv.iconUrl}
        className="mb-4 justify-center"
      />
      <DialogHeader className="items-center text-center">
        <DialogTitle>{t2("connectors.libtv.title")}</DialogTitle>
        <DialogDescription>
          {t2("connectors.libtv.description")}
        </DialogDescription>
      </DialogHeader>
      <p className="my-5 text-sm text-muted-foreground" role="status">
        {t2(pending2 ? "connectors.libtv.waiting" : "connectors.libtv.hint")}
      </p>
      {visibleError ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {visibleError}
        </p>
      ) : null}
      <DialogFooter>
        <Button$1
          variant="outline"
          className="h-9 min-w-22 rounded-lg px-4"
          onClick={handleClose}
          data-action-ui-id="connectors-libtv-dismiss"
        >
          {t2("connectors.libtv.dismiss")}
        </Button$1>
        <Button$1
          className="h-9 min-w-26 rounded-lg px-4"
          onClick={() => void handleAuthorize()}
          disabled={pending2}
          loading={pending2}
          data-action-ui-id="connectors-libtv-authorize"
        >
          {t2("connectors.libtv.authorize")}
        </Button$1>
      </DialogFooter>
    </div>
  );
  return embedded ? (
    content2
  ) : (
    <ConnectorDialogFrame
      open={true}
      onOpenChange={(open) => !open && handleClose()}
      actionUiId="connectors-libtv-dialog"
      closeLabel={t2("common.close")}
      closeActionUiId="connectors-libtv-close"
    >
      {content2}
    </ConnectorDialogFrame>
  );
}
