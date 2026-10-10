// 本地连接器的介绍内容与详情弹窗。
import { useTranslation, reactExports, jsxRuntimeExports, connectorSummaryActionLabelKey, localizedI18nText } from "../../vendor.js";
import { dedupedToast } from "../../infra/agent-http-client.js";
import { homeService } from "../../workspace/home-service.jsx";
import { ConnectorDialogFrame } from "../../settings/connector-dialog-frame.jsx";
import { DialogHeader } from "../../infra/dialog-content.jsx";
import { ConnectorRelationshipGraphic } from "../../settings/connector-relationship-graphic.jsx";
import { ConnectorDialogScrollableBody } from "../../settings/request-prompt-prefill.jsx";
import { ConnectorSummaryAction, ConnectorDetailNotice } from "../../settings/connector-summary-action.jsx";
import { ConnectorPromptAction, ConnectorStatusPill } from "../../settings/connector-prompt-action.jsx";
import { connectorTitle } from "../../settings/make-async-image-task.jsx";
import { LocalConnectorSetupContent } from "../../settings/local-connector-setup-content.jsx";
import { Badge } from "../../infra/badge-variants.jsx";
import { ConnectorDialogSummary, ConnectorPromptList } from "./connector-catalog-data.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
import { ConnectorCapabilityList, localizedCapabilityText } from "./browser-connector.jsx";
import {
  ConnectorManagementActions,
  isConnectorUsable,
  toConnectorDisplayState,
} from "./connector-detail.jsx";
function LocalConnectorIntroContent({
  connectorId,
  displayName,
  description,
  origin,
  app,
  skills: connectorSkills,
  examplePrompts,
  serverName,
  iconUrl,
  onConfigure,
  onInstalled,
  onTry,
  savedServer,
  onUpdated,
  onRemoved,
}) {
  const { t, i18n } = useTranslation();
  const language = i18n?.language ?? "en";
  const targetName = serverName ?? connectorId;
  const [connectorStatus, setConnectorStatus] = reactExports.useState();
  const [updating, setUpdating] = reactExports.useState(false);
  const [updateError, setUpdateError] = reactExports.useState();
  const statusEpoch = reactExports.useRef(0);
  const updateAvailable = connectorStatus?.updateAvailable === true;
  reactExports.useEffect(() => {
    let cancelled = false;
    const epoch = statusEpoch.current;
    void homeService.connector
      .status(targetName)
      .then((next) => {
        if (!cancelled && statusEpoch.current === epoch) setConnectorStatus(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [targetName]);
  const handleUpdate = async () => {
    if (updating || connectorStatus?.state === "installing") return;
    setUpdating(true);
    setUpdateError(void 0);
    try {
      const result = await homeService.connector.install(targetName);
      if (result.ok) {
        statusEpoch.current += 1;
        setConnectorStatus(result.status);
        onInstalled();
        if (result.status.updateAvailable) {
          dedupedToast.warning(t("connectors.connector.updateDeferred"));
        } else {
          dedupedToast.success(t("connectors.connector.updateSuccess"));
        }
        return;
      }
      const reason = t(`connectors.connector.error.${result.code}`, {
        name: connectorTitle(t, language, connectorId, displayName),
      });
      setUpdateError(result.message ? `${reason}: ${result.message.trim()}` : reason);
    } catch {
      setUpdateError(t("connectors.connector.updateRequestFailed"));
    } finally {
      setUpdating(false);
    }
  };
  const displayState = savedServer ? toConnectorDisplayState(savedServer.runtimeState) : void 0;
  const hasSavedConnection = Boolean(savedServer);
  const connected = isConnectorUsable(displayState);
  const connectorName = connectorTitle(t, language, connectorId, displayName);
  const handlePromptClick = (prompt) => {
    onTry(prompt);
  };
  return (
    <>
      <DialogHeader className="shrink-0 items-center px-4 pt-8 text-center sm:px-6">
        <ConnectorRelationshipGraphic targetIconUrl={iconUrl} />
      </DialogHeader>
      <ConnectorDialogScrollableBody>
        <div className="flex flex-col items-center px-4 sm:px-6">
          <ConnectorDialogSummary
            title={connectorName}
            description={t(
              `connectors.detail.${connectorId}.description`,
              localizedI18nText(description, language),
            )}
            origin={origin}
            status={
              <span
                className="inline-flex items-center gap-1.5"
                data-action-ui-id={`connector-${connectorId}-detail-state`}
              >
                <ConnectorStatusPill state={displayState ?? "notConnected"} />
                {updateAvailable ? (
                  <Badge
                    variant="info"
                    data-action-ui-id={`connector-${connectorId}-update-available`}
                  >
                    {t("connectors.connector.updateAvailable")}
                  </Badge>
                ) : null}
              </span>
            }
            actions={
              !hasSavedConnection ? (
                <ConnectorSummaryAction
                  mode="connect"
                  label={t(connectorSummaryActionLabelKey.connect)}
                  onClick={onConfigure}
                  data-action-ui-id={`connector-${connectorId}-detail-configure`}
                />
              ) : savedServer ? (
                <>
                  {connected ? (
                    <ConnectorSummaryAction
                      mode="try"
                      label={t(connectorSummaryActionLabelKey.try)}
                      onClick={() => onTry()}
                      data-action-ui-id={`connector-${connectorId}-detail-try`}
                    />
                  ) : null}
                  {updateAvailable ? (
                    <ConnectorSummaryAction
                      mode="update"
                      label={t(connectorSummaryActionLabelKey.update)}
                      loading={updating}
                      disabled={updating || connectorStatus?.state === "installing"}
                      onClick={() => void handleUpdate()}
                      data-action-ui-id={`connector-${connectorId}-detail-update`}
                    />
                  ) : null}
                  <ConnectorManagementActions
                    connector={savedServer}
                    actionIdPrefix={`connector-${connectorId}-detail`}
                    onUpdated={onUpdated}
                    onRemoved={onRemoved}
                  />
                </>
              ) : null
            }
          />
          {updateError ? (
            <div className="mt-3 w-full">
              <ConnectorDetailNotice
                description={updateError}
                tone="error"
                actionUiId={`connector-${connectorId}-update-error`}
              />
            </div>
          ) : null}
        </div>
        <ConnectorCapabilityList
          {...(app
            ? {
                app: {
                  key: "app",
                  title: app.name,
                  iconUrl: app.iconUrl,
                },
              }
            : {})}
          skills={(connectorSkills ?? []).map((skill) => ({
            key: skill.key,
            title: skill.displayName
              ? localizedCapabilityText(skill.displayName, language)
              : skill.name,
            ...(skill.description
              ? {
                  description: skill.description,
                }
              : {}),
          }))}
        />
        {examplePrompts.length > 0 ? (
          <ConnectorPromptList
            title={t("connectors.detail.trySection")}
            description={t("connectors.detail.tryDescription")}
            actionUiId={`connector-${connectorId}-detail-prompts-scroll`}
            items={examplePrompts.map((prompt) => {
              const text = t(
                prompt.key,
                prompt.text ? localizedI18nText(prompt.text, language) : "",
              );
              return {
                key: prompt.key,
                title: prompt.titleKey
                  ? t(
                      prompt.titleKey,
                      prompt.titleText ? localizedI18nText(prompt.titleText, language) : "",
                    )
                  : void 0,
                description: text,
                action: (
                  <ConnectorPromptAction
                    mode="ready"
                    label={t("connectors.detail.tryInChat")}
                    onClick={() => handlePromptClick(text)}
                    data-action-ui-id={`connector-${connectorId}-detail-prompt`}
                  />
                ),
              };
            })}
          />
        ) : null}
      </ConnectorDialogScrollableBody>
    </>
  );
}
export function LocalConnectorDetailDialog({
  connectorId,
  displayName,
  description,
  origin,
  app,
  skills,
  examplePrompts,
  serverName,
  iconUrl,
  onClose,
  onInstalled,
  onTry,
  setupUrl,
  savedServer,
  onUpdated,
  onRemoved,
}) {
  const { t } = useTranslation();
  const [mode, setMode] = reactExports.useState("detail");
  const showingSetup = mode === "setup";
  return (
    <ConnectorDialogFrame
      open={true}
      onOpenChange={(open) => !open && onClose()}
      actionUiId={`connector-${connectorId}-${showingSetup ? "setup" : "detail"}-dialog`}
      closeActionUiId={`connector-${connectorId}-${showingSetup ? "" : "detail-"}close`}
      closeLabel={t("common.close")}
      size="md"
      stableHeight={!showingSetup}
    >
      <div
        key={mode}
        className="flex min-h-0 flex-1 flex-col"
        data-layout-slot="connector-dialog-view"
        data-view={mode}
      >
        {showingSetup ? (
          <LocalConnectorSetupContent
            connectorId={connectorId}
            displayName={displayName}
            serverName={serverName}
            iconUrl={iconUrl}
            setupUrl={setupUrl}
            onClose={onClose}
            onInstalled={onInstalled}
          />
        ) : (
          <LocalConnectorIntroContent
            connectorId={connectorId}
            displayName={displayName}
            description={description}
            origin={origin}
            app={app}
            skills={skills}
            examplePrompts={examplePrompts}
            serverName={serverName}
            iconUrl={iconUrl}
            onConfigure={() => setMode("setup")}
            onInstalled={onInstalled}
            onTry={onTry}
            savedServer={savedServer}
            onUpdated={onUpdated}
            onRemoved={onRemoved}
          />
        )}
      </div>
    </ConnectorDialogFrame>
  );
}
