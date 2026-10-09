// 连接器详情与管理：授权信息整理、管理操作、可见性开关、自定义连接器卡片。
import {
  h as useTranslation,
  r as reactExports,
  a3 as dedupedToast,
  H as homeService,
  j as jsxRuntimeExports,
  j3 as ConnectorDialogFrame,
  gj as DialogHeader,
  j4 as ConnectorRelationshipGraphic,
  j5 as ConnectorDialogScrollableBody,
  j9 as ConnectorSummaryAction,
  j2 as ConnectorPromptAction,
  iT as ConnectorIcon,
  kq as Switch,
  e as Icon,
  my as getMergedHcpCatalog,
  lu as OFFICIAL_CONNECTORS,
  mz as CustomConnectorDialog,
  ja as IntegrationActionGroup,
  jb as IntegrationActionButton,
  jc as IntegrationLifecycleToggleButton,
  jd as IntegrationMoreMenu,
  mA as StrokeIcon,
  am as Trash2,
  aj as PencilIcon,
  au as cn,
  jS as AlertDialog,
  jV as AlertDialogContent,
  jW as AlertDialogHeader,
  jX as AlertDialogTitle,
  jY as AlertDialogDescription,
  jZ as AlertDialogFooter,
  j_ as AlertDialogCancel,
  j$ as AlertDialogAction,
  gc as matchesLocalConnectorServer,
  mB as connectorTitle,
  j6 as ConnectorDetailNotice,
  j1 as connectorSummaryActionLabelKey,
  jf as ConnectorStatusPill,
  mC as localizedI18nText,
  iV as CDN_CONNECTOR_CUSTOM,
  eb as Plug,
} from "../../main.jsx";
import {
  a as ConnectorDialogSummary,
  c as ConnectorPromptList,
  C as ConnectorCardContent,
} from "../../connector-catalog-data-DiTljgxj.js";
import { __jsx } from "../../shared/jsx-runtime.js";
import { ConnectorCapabilityList, localizedCapabilityText } from "./browser-connector.jsx";
function profileFromManifest(manifest) {
  if (manifest.auth.kind !== "hubOAuthProfile") return void 0;
  const { profile } = manifest.auth;
  const mcp = manifest.capabilities.mcp;
  const flow = profile.flow ?? {};
  const generic = profile.credentialFileFormat === "generic-oauth-json";
  const credentialFields = Object.fromEntries(
    (profile.requiredInputs ?? [])
      .filter((input) => input.credentialField)
      .map((input) => [input.key, input.credentialField]),
  );
  return {
    id: manifest.connectorId,
    serverName: mcp?.serverName ?? manifest.connectorId,
    authorizationEndpoint: profile.authorizationEndpoint,
    tokenEndpoint: profile.tokenEndpoint,
    scope: profile.scope,
    ...(profile.authorizationParams
      ? {
          authorizationParams: profile.authorizationParams,
        }
      : {}),
    ...(flow.scopeSeparator
      ? {
          scopeSeparator: flow.scopeSeparator,
        }
      : {}),
    ...(flow.pkce !== void 0
      ? {
          pkce: flow.pkce,
        }
      : {}),
    ...(flow.tokenExchange
      ? {
          tokenExchange: flow.tokenExchange,
        }
      : {}),
    ...(flow.loopback
      ? {
          loopback: flow.loopback,
        }
      : {}),
    ...(flow.allowManualToken !== void 0
      ? {
          allowManualToken: flow.allowManualToken,
        }
      : {}),
    ...(flow.docsUrl
      ? {
          docsUrl: flow.docsUrl,
        }
      : {}),
    // generic-oauth-json always writes one file; google keeps the two-file
    // default (credentialFileName unset).
    ...(generic
      ? {
          credentialFileName: profile.credentialFileName ?? "credentials.json",
        }
      : {}),
    ...(Object.keys(credentialFields).length > 0
      ? {
          credentialFields,
        }
      : {}),
    clientIdEnv: profile.clientIdEnv,
    // Relay exchange keeps the client secret server-side; a client that never
    // swaps the code must not carry (or resolve) one, even if the manifest
    // names an env var.
    ...(flow.tokenExchange === "relay"
      ? {}
      : {
          clientSecretEnv: profile.clientSecretEnv,
        }),
    ...(profile.requiredInputs?.length
      ? {
          requiredInputs: profile.requiredInputs.map((input) => input.key),
          ...(profile.requiredInputs.some((input) => input.pattern)
            ? {
                requiredInputPatterns: Object.fromEntries(
                  profile.requiredInputs
                    .filter((input) => input.pattern)
                    .map((input) => [input.key, input.pattern]),
                ),
              }
            : {}),
        }
      : {}),
  };
}
function findCustomMcpOAuthProfileByName(name) {
  const normalized = name.trim().toLowerCase();
  for (const manifest of getMergedHcpCatalog()) {
    const profile = profileFromManifest(manifest);
    if (profile && profile.serverName.toLowerCase() === normalized) return profile;
  }
  return void 0;
}
export function ConnectorManagementActions({
  connector,
  actionIdPrefix,
  className,
  retryAvailable = false,
  onUpdated,
  onRemoved,
  editable = false,
}) {
  const { t } = useTranslation();
  const [pendingAction, setPendingAction] = reactExports.useState(null);
  const busy = reactExports.useRef(false);
  const [removalOpen, setRemovalOpen] = reactExports.useState(false);
  const [error, setError] = reactExports.useState();
  const [editSnapshot, setEditSnapshot] = reactExports.useState();
  const editRequest = reactExports.useRef(0);
  reactExports.useEffect(
    () => () => {
      editRequest.current += 1;
    },
    [],
  );
  const handleEdit = async () => {
    if (busy.current) return;
    busy.current = true;
    setPendingAction("edit");
    const request = ++editRequest.current;
    try {
      const snapshot = await homeService.customMcp.getForEdit(connector.name);
      if (request !== editRequest.current) return;
      if (snapshot) setEditSnapshot(snapshot);
      else dedupedToast.error(t("connectors.customDialog.error.server_not_found"));
    } catch {
      if (request === editRequest.current)
        dedupedToast.error(t("connectors.customDialog.error.loadFailed"));
    } finally {
      if (request === editRequest.current) {
        busy.current = false;
        setPendingAction(null);
      }
    }
  };
  const isManagedLibTv = OFFICIAL_CONNECTORS.libtv.matches(connector);
  const canAuthorize = connector.enabled && isManagedLibTv;
  const handleEnabledChange = async (enabled, action) => {
    if (busy.current) return;
    busy.current = true;
    setPendingAction(action);
    try {
      if (enabled && action === "retry" && isManagedLibTv) {
        const result2 = await homeService.customMcp.authorizeServer(connector.name);
        if (!result2.ok) {
          if (result2.code !== "authorization_cancelled")
            dedupedToast.error(t(`connectors.customDialog.error.${result2.code}`));
          return;
        }
        onUpdated(result2.server);
        return;
      }
      const reauthorize =
        enabled && action === "retry" && Boolean(findCustomMcpOAuthProfileByName(connector.name));
      const result = reauthorize
        ? await homeService.customMcp.authorize(connector.name)
        : await homeService.customMcp.setEnabled(connector.name, enabled);
      if (!result.ok) {
        if (result.code === "authorization_cancelled") return;
        dedupedToast.error(t(`connectors.customDialog.error.${result.code}`));
        return;
      }
      onUpdated(result.server);
      if (result.runtime.state === "failed" || result.runtime.state === "partial") {
        dedupedToast.error(
          t(enabled ? "connectors.customDialog.created.failed" : "connectors.stopFailed"),
        );
      }
    } catch {
      dedupedToast.error(t("connectors.customDialog.error.requestFailed"));
    } finally {
      busy.current = false;
      setPendingAction(null);
    }
  };
  const handleRemove = async () => {
    if (busy.current) return;
    busy.current = true;
    setPendingAction("remove");
    setError(void 0);
    try {
      const cliAuthManifest = getMergedHcpCatalog().find(
        (manifest) =>
          manifest.auth.kind === "cliAuth" &&
          matchesLocalConnectorServer(connector, manifest.connectorId),
      );
      if (cliAuthManifest) {
        await homeService.hcpCli.revoke(cliAuthManifest.connectorId).catch(() => void 0);
      }
      const result = await homeService.customMcp.remove(connector.name);
      if (result.removed || result.code === "server_not_found") {
        setRemovalOpen(false);
        onRemoved(connector.name);
        return;
      }
      setError(t(`connectors.removeError.${result.code}`));
      const servers = await homeService.customMcp.list();
      const latest = servers.find((server) => server.name === connector.name);
      if (latest) onUpdated(latest);
    } catch {
      setError(t("connectors.customDialog.error.requestFailed"));
    } finally {
      busy.current = false;
      setPendingAction(null);
    }
  };
  return (
    <>
      {editSnapshot ? (
        <CustomConnectorDialog
          open={true}
          initialInput={editSnapshot.input}
          onOpenChange={(open) => {
            if (!open) setEditSnapshot(void 0);
          }}
          onSubmit={(input) =>
            homeService.customMcp.update(editSnapshot.input.name, input, editSnapshot.revision)
          }
          onCreated={(result) => {
            onUpdated(result.server);
            if (result.runtime.state === "failed" || result.runtime.state === "partial")
              dedupedToast.warning(t("connectors.customDialog.updated.failed"));
            else dedupedToast.success(t("connectors.customDialog.updated.saved"));
          }}
        />
      ) : null}
      <IntegrationActionGroup
        className={cn("w-auto flex-wrap", className)}
        onClick={(event) => event.stopPropagation()}
        data-layout-slot="connector-management-actions"
      >
        {retryAvailable ||
        canAuthorize ||
        connector.runtimeState === "failed" ||
        connector.runtimeState === "partial" ? (
          <IntegrationActionButton
            variant="outline"
            disabled={pendingAction !== null}
            loading={pendingAction === "retry"}
            className="bg-transparent"
            onClick={() => void handleEnabledChange(connector.enabled, "retry")}
            data-action-ui-id={`${actionIdPrefix}-retry`}
          >
            {t(canAuthorize ? "connectors.libtv.authorize" : "common.retry")}
          </IntegrationActionButton>
        ) : null}
        <IntegrationLifecycleToggleButton
          inactive={!connector.enabled}
          activeLabel={t("connectors.stop")}
          inactiveLabel={t("connectors.start")}
          disabled={pendingAction !== null}
          loading={pendingAction === "toggle"}
          onClick={() => void handleEnabledChange(!connector.enabled, "toggle")}
          className="w-auto min-w-20 max-w-none px-3"
          data-action-ui-id={`${actionIdPrefix}-toggle`}
        />
        <IntegrationMoreMenu
          disabled={pendingAction !== null}
          triggerClassName="bg-transparent"
          triggerLabel={t("common.more")}
          additionalActions={
            editable
              ? [
                  {
                    label: t("connectors.editConfiguration"),
                    icon: <StrokeIcon icon={PencilIcon} size={16} />,
                    actionUiId: `${actionIdPrefix}-edit`,
                    onAction: handleEdit,
                  },
                ]
              : void 0
          }
          actionLabel={t("connectors.removeConnection")}
          actionIcon={<StrokeIcon icon={Trash2} size={14} />}
          onAction={() => {
            setError(void 0);
            setRemovalOpen(true);
          }}
          actionUiIds={{
            trigger: `${actionIdPrefix}-more`,
            content: `${actionIdPrefix}-more-popover`,
            bridge: `${actionIdPrefix}-more-popover-hover-bridge`,
            action: `${actionIdPrefix}-remove`,
          }}
        />
      </IntegrationActionGroup>
      <AlertDialog
        open={removalOpen}
        onOpenChange={(open) => {
          if (!busy.current) setRemovalOpen(open);
        }}
      >
        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("connectors.removeTitle", {
                name: connector.name,
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("connectors.removeDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingAction !== null}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={pendingAction === "remove"}
              onClick={() => void handleRemove()}
              data-action-ui-id={`${actionIdPrefix}-remove-confirm`}
            >
              {t("connectors.removeConnection")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
export function toConnectorDisplayState(runtimeState) {
  if (runtimeState === "partial" || runtimeState === "failed") return "saved";
  return runtimeState;
}
export function isConnectorUsable(state) {
  return state === "connected" || state === "saved";
}
export function ConnectorDetailDialog({
  connector,
  savedServer,
  onClose,
  onConnect,
  onTry,
  onUpdated,
  onRemoved,
  setupContent,
}) {
  const { t, i18n } = useTranslation();
  const [showingSetup, setShowingSetup] = reactExports.useState(false);
  const [setupBusy, setSetupBusy] = reactExports.useState(false);
  const [authorizing, setAuthorizing] = reactExports.useState(false);
  const [authorizeError, setAuthorizeError] = reactExports.useState();
  const runtimeState = savedServer?.runtimeState;
  const displayState = runtimeState ? toConnectorDisplayState(runtimeState) : void 0;
  const hasSavedConnection = Boolean(savedServer);
  const needsAuthorization = displayState === "needs_auth";
  const isReady = (displayState === "connected" || hasSavedConnection) && !needsAuthorization;
  const language = i18n?.language ?? "en";
  const connectorName = connectorTitle(t, language, connector.id, connector.titleText);
  const handleConnect = () => {
    if (setupContent) {
      setShowingSetup(true);
      return;
    }
    onConnect();
  };
  const handleAuthorize = async (name) => {
    if (authorizing) return;
    setAuthorizing(true);
    setAuthorizeError(void 0);
    try {
      const result = await homeService.customMcp.authorizeServer(name);
      if (!result.ok) {
        setAuthorizeError(t(`connectors.customDialog.error.${result.code}`));
        return;
      }
      onUpdated(result.server);
    } catch {
      setAuthorizeError(t("connectors.customDialog.error.requestFailed"));
    } finally {
      setAuthorizing(false);
    }
  };
  const handlePromptClick = (text) => {
    onTry(text);
  };
  return (
    <ConnectorDialogFrame
      open={true}
      onOpenChange={(open) => !open && !setupBusy && onClose()}
      actionUiId={showingSetup ? "connector-setup-dialog" : "connector-detail-dialog"}
      closeLabel={t("common.close")}
      size="md"
      stableHeight={!showingSetup && connector.detail.examplePrompts.length > 0}
      showCloseButton={!setupBusy}
    >
      <div
        key={showingSetup ? "setup" : "detail"}
        className="flex min-h-0 flex-1 flex-col"
        data-layout-slot="connector-dialog-view"
        data-view={showingSetup ? "setup" : "detail"}
      >
        {showingSetup && setupContent ? (
          setupContent(setSetupBusy)
        ) : (
          <>
            <DialogHeader className="shrink-0 items-center px-4 pt-8 text-center sm:px-6">
              <ConnectorRelationshipGraphic targetIconUrl={connector.detail.iconUrl} />
            </DialogHeader>
            <ConnectorDialogScrollableBody>
              <div className="flex flex-col items-center px-4 sm:px-6">
                <ConnectorDialogSummary
                  title={connectorName}
                  description={t(
                    connector.detail.descriptionKey,
                    localizedI18nText(connector.detail.descriptionText, language),
                  )}
                  origin={connector.origin}
                  status={<ConnectorStatusPill state={displayState ?? "notConnected"} />}
                  actions={
                    !hasSavedConnection ? (
                      <ConnectorSummaryAction
                        mode="connect"
                        label={t(connectorSummaryActionLabelKey.connect)}
                        onClick={handleConnect}
                        data-action-ui-id="connector-detail-connect"
                      />
                    ) : savedServer ? (
                      <>
                        {needsAuthorization ? (
                          <ConnectorSummaryAction
                            mode="authorize"
                            label={t(connectorSummaryActionLabelKey.authorize)}
                            loading={authorizing}
                            disabled={authorizing}
                            onClick={() => void handleAuthorize(savedServer.name)}
                            data-action-ui-id="connector-detail-authorize"
                          />
                        ) : null}
                        {isConnectorUsable(displayState) ? (
                          <ConnectorSummaryAction
                            mode="try"
                            label={t(connectorSummaryActionLabelKey.try)}
                            onClick={() => onTry()}
                            data-action-ui-id="connector-detail-use-in-chat"
                          />
                        ) : null}
                        <ConnectorManagementActions
                          connector={savedServer}
                          actionIdPrefix="connector-detail"
                          onUpdated={onUpdated}
                          onRemoved={onRemoved}
                        />
                      </>
                    ) : null
                  }
                >
                  {needsAuthorization ? (
                    <ConnectorDetailNotice
                      description={authorizeError ?? t("connectors.detail.needsAuthNotice")}
                      tone={authorizeError ? "error" : "warning"}
                      actionUiId="connector-detail-authorize-notice"
                    />
                  ) : null}
                </ConnectorDialogSummary>
              </div>
              <ConnectorCapabilityList
                {...(connector.detail.app
                  ? {
                      app: {
                        key: "app",
                        title: connector.detail.app.name,
                        iconUrl: connector.detail.app.iconUrl,
                      },
                    }
                  : {})}
                skills={(connector.detail.skills ?? []).map((skill) => ({
                  key: skill.key,
                  title: skill.displayName
                    ? localizedCapabilityText(skill.displayName, i18n.language)
                    : skill.name,
                  ...(skill.description
                    ? {
                        description: skill.description,
                      }
                    : {}),
                }))}
              />
              {connector.detail.examplePrompts.length > 0 ? (
                <ConnectorPromptList
                  title={t(
                    isReady ? "connectors.detail.trySection" : "connectors.detail.previewSection",
                  )}
                  description={t(
                    isReady
                      ? "connectors.detail.tryDescription"
                      : "connectors.detail.previewDescription",
                  )}
                  items={connector.detail.examplePrompts.map((prompt) => {
                    const text = t(
                      prompt.key,
                      prompt.text ? localizedI18nText(prompt.text, i18n.language) : "",
                    );
                    return {
                      key: prompt.key,
                      title: prompt.titleKey
                        ? t(
                            prompt.titleKey,
                            prompt.titleText
                              ? localizedI18nText(prompt.titleText, i18n.language)
                              : "",
                          )
                        : void 0,
                      description: text,
                      action: (
                        <ConnectorPromptAction
                          mode="ready"
                          label={t("connectors.detail.tryInChat")}
                          onClick={() => handlePromptClick(text)}
                          data-action-ui-id="connector-detail-prompt"
                        />
                      ),
                    };
                  })}
                />
              ) : null}
            </ConnectorDialogScrollableBody>
          </>
        )}
      </div>
    </ConnectorDialogFrame>
  );
}
export function ConnectorVisibilityControl({ connectorId, name, visible, pending, onChange }) {
  const { t } = useTranslation();
  const handleChange = (value) => {
    void onChange(connectorId, value).catch(() => {
      dedupedToast.error(
        t("connectors.market.saveFailed", "Could not update visibility. Please try again."),
      );
    });
  };
  return (
    <fieldset
      className="mt-4 flex items-center justify-between gap-3"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      aria-label={t("connectors.market.visibilityGroup", {
        name,
        defaultValue: "Market visibility for {{name}}",
      })}
    >
      <span className="text-xs text-muted-foreground">
        {t("connectors.market.publicVisible", "Visible to users")}
      </span>
      <Switch
        checked={visible}
        disabled={pending}
        onCheckedChange={handleChange}
        aria-label={t("connectors.market.visibilityGroup", {
          name,
          defaultValue: "Market visibility for {{name}}",
        })}
        data-action-ui-id={`connector-market-visibility-${connectorId}`}
      />
    </fieldset>
  );
}
export function CustomConnectorCard({
  connector,
  title,
  description,
  icon = Plug,
  iconUrl = CDN_CONNECTOR_CUSTOM,
  origin,
  marketControls,
  onClick,
  onUpdated,
  onRemoved,
  editable = false,
}) {
  const displayState = toConnectorDisplayState(connector.runtimeState);
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: connector card click
    <article
      className={cn(
        "relative flex min-h-40 flex-col rounded-2xl border border-border bg-card p-5",
        onClick && "cursor-pointer",
      )}
      data-action-ui-id="connectors-custom-card"
      data-connector-name={connector.name}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <ConnectorIcon
          iconUrl={iconUrl}
          size="card"
          fallback={
            <Icon icon={icon} size="lg" aria-hidden={true} className="text-foreground/70" />
          }
        />
        <div
          className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2"
          data-layout-slot="connector-card-controls"
        >
          <ConnectorManagementActions
            connector={connector}
            actionIdPrefix="connectors-custom"
            className="shrink-0"
            onUpdated={onUpdated}
            onRemoved={onRemoved}
            editable={editable}
          />
        </div>
      </div>
      <ConnectorCardContent
        title={title}
        description={description}
        status={<ConnectorStatusPill state={displayState} />}
        origin={origin}
      />
      {marketControls}
    </article>
  );
}
