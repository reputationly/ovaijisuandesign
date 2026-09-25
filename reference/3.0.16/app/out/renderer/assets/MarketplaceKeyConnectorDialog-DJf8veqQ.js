import { e as createLucideIcon, j as jsxRuntimeExports, au as cn, r as reactExports, be as DialogTitle, bf as DialogDescription, bg as Button, U as Icon, bh as RetryIcon, aK as Play, bT as Link2, bU as LoaderCircle, bV as Download, h as useTranslation, bW as IntegrationStatusPill, bX as PlaybackPauseIcon, bY as IntegrationActionButton, o as usePlatform, aF as useIsScrolling, bZ as ConnectorRelationshipGraphic, bd as DialogHeader, b_ as ArrowUpRight, b$ as Label, X as Input, c0 as ShieldCheck, c1 as DialogFooter, c2 as ConnectorDialogFrame, bH as openExternalUrl, c3 as KEY_MCP_PRESETS, c4 as OFFICIAL_CONNECTORS } from "./index-C4qF1HE0.js";
/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const MessageCircle = createLucideIcon("MessageCircle", [
  ["path", { d: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z", key: "vv11sd" }]
]);
function ConnectorCardContent({
  title,
  description,
  status
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "mt-4 flex flex-wrap items-center gap-2",
        "data-layout-slot": "connector-card-title",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "break-words font-heading text-title-16 font-medium text-foreground", children: title }),
          status
        ]
      }
    ),
    description && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "p",
      {
        className: "mt-2 break-words text-sm leading-relaxed text-muted-foreground",
        "data-layout-slot": "connector-card-description",
        children: description
      }
    )
  ] });
}
function ConnectorDetailNotice({
  description,
  tone = "neutral",
  actionUiId
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      role: tone === "error" ? "alert" : void 0,
      className: cn(
        "rounded-md bg-secondary px-2.5 py-1.5",
        tone === "warning" && "bg-warning/10",
        tone === "error" ? "text-left" : "text-center"
      ),
      "data-action-ui-id": actionUiId,
      "data-layout-slot": "connector-detail-notice",
      "data-notice-tone": tone,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "p",
        {
          className: cn(
            "min-w-0 text-[13px] leading-relaxed text-foreground/70",
            tone === "warning" && "text-warning-foreground",
            tone === "error" && "text-destructive"
          ),
          children: description
        }
      )
    }
  );
}
function ConnectorSetupSection({
  title,
  headerAction,
  children,
  actionUiId,
  className
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: cn("w-full text-left", className),
      "data-action-ui-id": actionUiId,
      "data-layout-slot": "connector-detail-setup-section",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "min-w-0 font-heading text-sm font-medium text-foreground", children: title }),
          headerAction
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 min-w-0", children })
      ]
    }
  );
}
function ConnectorDialogSummary({
  title,
  description,
  status,
  actions,
  children
}) {
  const supportingContent = reactExports.Children.toArray(children);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "mt-4 flex w-[calc(100%+1rem)] flex-col rounded-[10px] bg-secondary/60 px-4 py-4 sm:w-[calc(100%+1.5rem)]",
      "data-layout-slot": "connector-detail-summary",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "flex w-full min-w-0 shrink-0 flex-col items-center justify-center gap-2",
            "data-layout-slot": "connector-detail-title-row",
            "data-status-placement": "stacked",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "min-w-0 max-w-full break-words text-center font-heading text-lg font-medium text-foreground", children: title }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "flex min-w-0 max-w-full justify-center overflow-hidden [&>*]:max-w-full",
                  "data-layout-slot": "connector-detail-title-status",
                  children: status
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { className: "mt-3 w-full shrink-0 px-4 text-center text-sm leading-relaxed", children: description }),
        supportingContent.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "mt-4 flex w-full min-w-0 flex-col gap-3 text-left",
            "data-layout-slot": "connector-detail-supporting-content",
            children: supportingContent
          }
        ) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "mt-5 flex w-full shrink-0 items-center justify-center",
            "data-layout-slot": "connector-detail-management",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-w-0 flex-wrap items-center justify-center gap-2", children: actions })
          }
        )
      ]
    }
  );
}
const connectorPromptActionLabelKey = {
  requiresInstall: "connectors.detail.downloadToConnect",
  installing: "connectors.detail.useAfterInstallation",
  requiresConnection: "connectors.detail.connectToUse",
  ready: "connectors.detail.tryInChat",
  requiresEnable: "connectors.detail.enableToUse",
  requiresRecovery: "connectors.detail.reconnectToUse"
};
const connectorPromptActionIcon = {
  requiresInstall: Download,
  installing: LoaderCircle,
  requiresConnection: Link2,
  ready: MessageCircle,
  requiresEnable: Play,
  requiresRecovery: RetryIcon
};
function ConnectorPromptAction({
  mode,
  label,
  className,
  ...props
}) {
  const actionIcon = connectorPromptActionIcon[mode];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Button,
    {
      type: "button",
      size: "sm",
      variant: "default",
      className: cn(
        "h-[30px] shrink-0 self-center gap-1 rounded-[10px] pl-2.5 pr-3 font-normal",
        className
      ),
      "data-connector-prompt-action-mode": mode,
      ...props,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            "aria-hidden": "true",
            className: "flex size-3.5 shrink-0 items-center justify-center",
            "data-layout-slot": "connector-prompt-action-icon",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Icon,
              {
                icon: actionIcon,
                size: "sm",
                strokeWidth: 1.5,
                className: mode === "installing" ? "animate-spin" : void 0,
                "aria-hidden": true
              }
            )
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: label })
      ]
    }
  );
}
function ConnectorPromptDescription({
  id,
  description,
  expanded,
  hasTitle
}) {
  const contentRef = reactExports.useRef(null);
  const [expandedHeight, setExpandedHeight] = reactExports.useState(0);
  reactExports.useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const updateHeight = () => {
      setExpandedHeight(
        (current) => current === content.scrollHeight ? current : content.scrollHeight
      );
    };
    updateHeight();
    if (typeof ResizeObserver === "undefined") return;
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(content);
    return () => resizeObserver.disconnect();
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      id,
      className: cn(
        "overflow-hidden text-xs leading-relaxed text-muted-foreground transition-[max-height,opacity] duration-200 ease-out motion-reduce:transition-none",
        hasTitle && "mt-2",
        expanded ? "opacity-100" : "max-h-[calc(3*1.625em)] opacity-90"
      ),
      style: expanded && expandedHeight > 0 ? { maxHeight: `${expandedHeight}px` } : void 0,
      "data-layout-slot": "connector-prompt-description",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { ref: contentRef, children: description })
    }
  );
}
function ConnectorPromptList({
  title,
  description,
  items,
  actionUiId = "connector-detail-prompts-scroll"
}) {
  const listId = reactExports.useId();
  const [expandedKeys, setExpandedKeys] = reactExports.useState(() => /* @__PURE__ */ new Set());
  const toggleItem = (key) => {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "mb-5",
      "data-action-ui-id": actionUiId,
      "data-layout-slot": "connector-prompt-content",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "relative pt-5 pl-2 pr-1 sm:pl-3 sm:pr-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            "aria-hidden": "true",
            className: "absolute inset-x-4 top-0 border-t border-border-soft",
            "data-layout-slot": "connector-prompt-section-divider"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 px-4", "data-layout-slot": "connector-prompt-heading", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-sm font-medium text-foreground", children: title }),
          description ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs leading-relaxed text-muted-foreground", children: description }) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full", "data-layout-slot": "connector-prompt-list", children: items.map((item, index) => {
          const expanded = expandedKeys.has(item.key);
          const descriptionId = `${listId}-prompt-${index}`;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: cn(
                "relative flex min-h-[84px] items-center gap-4 px-4 py-4",
                item.muted && "opacity-50"
              ),
              "data-expanded": expanded || void 0,
              "data-layout-slot": "connector-prompt-item",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    "aria-label": item.title ?? item.description,
                    "aria-expanded": expanded,
                    "aria-controls": descriptionId,
                    className: "absolute inset-0 z-0 cursor-pointer rounded-lg bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring/50",
                    "data-action-ui-id": `${actionUiId}-item-${index}`,
                    onClick: () => toggleItem(item.key)
                  }
                ),
                index > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    "aria-hidden": "true",
                    className: "absolute inset-x-4 top-0 border-t border-border-soft",
                    "data-layout-slot": "connector-prompt-divider"
                  }
                ) : null,
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: "pointer-events-none relative z-[1] min-w-0 flex-1 border-l-2 border-border pl-3",
                    "data-layout-slot": "connector-prompt-copy",
                    children: [
                      item.title ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block break-words text-sm font-normal text-foreground", children: item.title }) : null,
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        ConnectorPromptDescription,
                        {
                          id: descriptionId,
                          description: item.description,
                          expanded,
                          hasTitle: Boolean(item.title)
                        }
                      )
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: "relative z-[2] flex shrink-0 items-center justify-end self-stretch",
                    "data-layout-slot": "connector-prompt-action",
                    children: item.action
                  }
                )
              ]
            },
            item.key
          );
        }) })
      ] })
    }
  );
}
const CONNECTOR_STATUS_VISUAL = {
  connected: { tone: "neutral", markerTone: "success" },
  disabled: { tone: "warning", markerTone: "warning" },
  failed: { tone: "destructive", markerTone: "destructive" },
  notConnected: { tone: "muted", markerTone: "muted" },
  removing: { tone: "muted", markerTone: "warning" }
};
function ConnectorStatusPill({ state }) {
  const { t } = useTranslation();
  const visual = CONNECTOR_STATUS_VISUAL[state];
  const label = t(
    state === "removing" ? "connectors.detail.disconnecting" : `connectors.runtimeState.${state}`
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    IntegrationStatusPill,
    {
      label,
      tone: visual.tone,
      markerTone: visual.markerTone,
      markerActive: state === "removing",
      markerIcon: state === "disabled" ? /* @__PURE__ */ jsxRuntimeExports.jsx(PlaybackPauseIcon, { size: 10, className: "shrink-0 text-warning/80" }) : void 0,
      markerLabel: label
    }
  );
}
const connectorSummaryActionLabelKey = {
  connect: "connectors.detail.connect",
  install: "connectors.connector.install",
  reinstall: "connectors.connector.reinstall",
  try: "connectors.detail.try",
  update: "connectors.connector.update"
};
const connectorSummaryActionVisual = {
  connect: { icon: Link2, variant: "default" },
  install: { icon: Download, variant: "default" },
  reinstall: { icon: RetryIcon, variant: "outline" },
  try: { icon: MessageCircle, variant: "default" },
  update: { icon: Download, variant: "outline" }
};
function ConnectorSummaryAction({
  mode,
  label,
  loading = false,
  disabled,
  ...props
}) {
  const visual = connectorSummaryActionVisual[mode];
  const actionIcon = loading ? LoaderCircle : visual.icon;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    IntegrationActionButton,
    {
      variant: visual.variant,
      disabled: disabled || loading,
      "aria-busy": loading || void 0,
      leadingIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "span",
        {
          "aria-hidden": "true",
          className: "flex size-3.5 shrink-0 items-center justify-center",
          "data-layout-slot": "connector-summary-action-icon",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Icon,
            {
              icon: actionIcon,
              size: "sm",
              strokeWidth: 1.5,
              className: loading ? "animate-spin" : void 0,
              "aria-hidden": true
            }
          )
        }
      ),
      "data-connector-summary-action-mode": mode,
      ...props,
      children: label
    }
  );
}
const connectorStepLineClassName = "absolute left-1/2 w-[1px] -translate-x-1/2 bg-[repeating-linear-gradient(to_bottom,var(--muted-foreground)_0,var(--muted-foreground)_1px,transparent_1px,transparent_3px)]";
function ApiKeyConnectorDialog({
  connector,
  onClose,
  onSubmit,
  onCreated,
  embedded = false,
  onBusyChange
}) {
  const { t } = useTranslation();
  const platform = usePlatform();
  const [apiKey, setApiKey] = reactExports.useState("");
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [openingLogin, setOpeningLogin] = reactExports.useState(false);
  const [error, setError] = reactExports.useState();
  const [loginError, setLoginError] = reactExports.useState(false);
  const busy = reactExports.useRef(false);
  const mounted = reactExports.useRef(true);
  const bodyScrollRef = reactExports.useRef(null);
  const isBodyScrolling = useIsScrolling({ scrollRef: bodyScrollRef });
  const keyValid = connector.isValidKey(apiKey);
  const prefix = `connectors.${connector.id}`;
  const keyInputId = `${connector.id}-api-key`;
  const keyHintId = `${connector.id}-key-hint`;
  reactExports.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const handleClose = () => {
    if (busy.current) return;
    mounted.current = false;
    setApiKey("");
    onClose();
  };
  const handleOpenPage = async (url, source) => {
    setOpeningLogin(true);
    setLoginError(false);
    const opened = await openExternalUrl(platform, url, { source });
    if (mounted.current) {
      setLoginError(!opened);
      setOpeningLogin(false);
    }
  };
  const handleSubmit = async () => {
    if (!keyValid || busy.current) return;
    busy.current = true;
    setSubmitting(true);
    onBusyChange?.(true);
    setError(void 0);
    try {
      const result = await onSubmit(
        connector.buildInput(apiKey, t(`connectors.catalog.${connector.id}.description`))
      );
      if (!mounted.current) return;
      if (!result.ok) {
        setError(t(`connectors.customDialog.error.${result.code}`));
        return;
      }
      setApiKey("");
      onCreated(result);
      onClose();
    } catch {
      if (mounted.current) setError(t("connectors.customDialog.error.requestFailed"));
    } finally {
      busy.current = false;
      if (mounted.current) {
        setSubmitting(false);
        onBusyChange?.(false);
      }
    }
  };
  const content = /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "form",
    {
      className: "flex min-h-0 flex-1 flex-col overflow-hidden",
      onSubmit: (event) => {
        event.preventDefault();
        void handleSubmit();
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            ref: bodyScrollRef,
            "data-scrolling": isBodyScrolling || void 0,
            className: "scrollbar-fade scrollbar-fade-compact min-h-0 overflow-y-auto px-6 pt-7 pb-3",
            "data-layout-slot": "connector-credential-dialog-body",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                ConnectorRelationshipGraphic,
                {
                  targetIconUrl: connector.iconUrl,
                  className: "mb-4 justify-center"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { className: "mb-4 items-center gap-1 text-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "text-base leading-5 font-medium text-foreground", children: t(`${prefix}.title`) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { className: "text-sm leading-5 text-muted-foreground", children: t(`${prefix}.description`) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  className: "-mx-3 rounded-[10px] bg-secondary/60 px-3 pb-3",
                  "data-layout-slot": "connector-credential-surface",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full", "data-layout-slot": "connector-credential-steps", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "section",
                        {
                          className: "grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2",
                          "data-layout-slot": "connector-credential-step",
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex justify-center pt-4", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "span",
                                {
                                  "aria-hidden": true,
                                  className: "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-xs font-medium leading-none text-foreground",
                                  "data-layout-slot": "connector-credential-step-node",
                                  children: t("connectors.stepOrdinal.1")
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "span",
                                {
                                  "aria-hidden": true,
                                  className: cn(connectorStepLineClassName, "top-10 bottom-0"),
                                  "data-layout-slot": "connector-credential-step-line"
                                }
                              )
                            ] }),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 py-4", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-foreground", children: t(`${prefix}.loginTitle`) }),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-layout-slot": "connector-credential-step-content", children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[13px] leading-relaxed text-muted-foreground", children: t(`${prefix}.loginDescription`) }),
                                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                  "div",
                                  {
                                    className: "mt-3 flex flex-wrap items-center gap-2",
                                    "data-layout-slot": "connector-credential-actions",
                                    children: [
                                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                        Button,
                                        {
                                          type: "button",
                                          variant: "outline",
                                          className: "h-8 gap-1 rounded-lg bg-card px-3 hover:bg-card/80",
                                          disabled: submitting || openingLogin,
                                          loading: openingLogin,
                                          onClick: () => void handleOpenPage(connector.keyPageUrl, `${prefix}.login`),
                                          "data-action-ui-id": `connectors-${connector.id}-login`,
                                          children: [
                                            t(`${prefix}.login`),
                                            /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: ArrowUpRight, size: "sm", "aria-hidden": true })
                                          ]
                                        }
                                      ),
                                      connector.docsUrl ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                        Button,
                                        {
                                          type: "button",
                                          variant: "ghost",
                                          className: "h-8 gap-1 rounded-lg px-3 text-muted-foreground hover:text-foreground",
                                          disabled: submitting || openingLogin,
                                          onClick: () => connector.docsUrl && void handleOpenPage(connector.docsUrl, `${prefix}.docs`),
                                          "data-action-ui-id": `connectors-${connector.id}-docs`,
                                          children: [
                                            t("connectors.setupGuide"),
                                            /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: ArrowUpRight, size: "sm", "aria-hidden": true })
                                          ]
                                        }
                                      ) : null
                                    ]
                                  }
                                ),
                                loginError ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", className: "mt-2 text-xs text-destructive", children: t(`${prefix}.loginError`) }) : null
                              ] })
                            ] })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "section",
                        {
                          className: "grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2",
                          "data-layout-slot": "connector-credential-step",
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex justify-center pt-4", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "span",
                                {
                                  "aria-hidden": true,
                                  className: cn(connectorStepLineClassName, "top-0 h-4"),
                                  "data-layout-slot": "connector-credential-step-line"
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "span",
                                {
                                  "aria-hidden": true,
                                  className: "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-xs font-medium leading-none text-foreground",
                                  "data-layout-slot": "connector-credential-step-node",
                                  children: t("connectors.stepOrdinal.2")
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "span",
                                {
                                  "aria-hidden": true,
                                  className: cn(connectorStepLineClassName, "top-10 bottom-0"),
                                  "data-layout-slot": "connector-credential-step-line"
                                }
                              )
                            ] }),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 py-4", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: keyInputId, className: "text-sm font-medium text-foreground", children: t(`${prefix}.keyLabel`) }),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-layout-slot": "connector-credential-step-content", children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  Input,
                                  {
                                    id: keyInputId,
                                    type: "password",
                                    value: apiKey,
                                    onChange: (event) => {
                                      setApiKey(event.target.value);
                                      setError(void 0);
                                    },
                                    disabled: submitting,
                                    autoComplete: "off",
                                    autoCapitalize: "none",
                                    spellCheck: false,
                                    maxLength: connector.maxKeyLength,
                                    "aria-invalid": Boolean(apiKey.trim()) && !keyValid,
                                    "aria-describedby": keyHintId,
                                    "aria-required": "true",
                                    placeholder: t(`${prefix}.keyPlaceholder`),
                                    className: "mt-3 h-10 rounded-lg bg-card",
                                    "data-action-ui-id": `connectors-${connector.id}-key`
                                  }
                                ),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "p",
                                  {
                                    id: keyHintId,
                                    className: "mt-2 text-[13px] leading-relaxed text-muted-foreground",
                                    children: t(`${prefix}.keyHint`)
                                  }
                                ),
                                apiKey.trim() && !keyValid ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", className: "mt-2 text-xs text-destructive", children: t(`${prefix}.invalidKey`) }) : null
                              ] })
                            ] })
                          ]
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex gap-2.5 rounded-lg bg-secondary px-3 py-2.5", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Icon,
                        {
                          icon: ShieldCheck,
                          size: "sm",
                          "aria-hidden": true,
                          className: "mt-0.5 shrink-0 text-muted-foreground"
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[13px] leading-relaxed text-muted-foreground", children: t(`${prefix}.consent`) })
                    ] }),
                    error ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", className: "mt-3 text-xs text-destructive", children: error }) : null
                  ]
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "shrink-0 flex-row items-center justify-end gap-2 px-6 pb-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              variant: "secondary",
              className: "h-9 min-w-22 rounded-lg px-4",
              disabled: submitting,
              onClick: handleClose,
              "data-action-ui-id": `connectors-${connector.id}-cancel`,
              children: t("common.cancel")
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "submit",
              className: "h-9 min-w-26 rounded-lg px-4",
              disabled: !keyValid || submitting,
              loading: submitting,
              "data-action-ui-id": `connectors-${connector.id}-connect`,
              children: t(submitting ? "connectors.detail.connecting" : `${prefix}.connect`)
            }
          )
        ] })
      ]
    }
  );
  if (embedded) return content;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ConnectorDialogFrame,
    {
      open: true,
      onOpenChange: (open) => {
        if (!open) handleClose();
      },
      actionUiId: `connectors-${connector.id}-dialog`,
      closeLabel: t("common.close"),
      size: "md",
      className: "sm:max-w-[600px]",
      showCloseButton: !submitting,
      children: content
    }
  );
}
const MARKETPLACE_KEY_MAX_LENGTH = 2048;
function isValidMarketplaceKey(value) {
  const key = value.trim();
  return key.length > 0 && key.length <= MARKETPLACE_KEY_MAX_LENGTH && /^[\x21-\x7e]+$/u.test(key) && !key.includes("://") && !/^(?:Authorization|secret-key):/iu.test(key);
}
function buildMarketplaceConnector(id, key, description) {
  if (!Object.hasOwn(KEY_MCP_PRESETS, id) || !isValidMarketplaceKey(key))
    throw new Error("Invalid connector configuration");
  const preset = KEY_MCP_PRESETS[id];
  const value = key.trim();
  return {
    name: preset.name,
    enabled: true,
    config: {
      transport: "streamable-http",
      url: new URL(preset.endpoint).href,
      headers: { Authorization: `Bearer ${value}` },
      timeoutMs: 3e4,
      description
    }
  };
}
function MarketplaceKeyConnectorDialog({
  provider,
  ...props
}) {
  const preset = KEY_MCP_PRESETS[provider];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ApiKeyConnectorDialog,
    {
      ...props,
      connector: {
        id: provider,
        iconUrl: OFFICIAL_CONNECTORS[provider].iconUrl,
        keyPageUrl: preset.keyPage,
        docsUrl: preset.docs,
        maxKeyLength: MARKETPLACE_KEY_MAX_LENGTH,
        isValidKey: isValidMarketplaceKey,
        buildInput: (key, description) => buildMarketplaceConnector(provider, key, description)
      }
    }
  );
}
export {
  ApiKeyConnectorDialog as A,
  ConnectorCardContent as C,
  MarketplaceKeyConnectorDialog as M,
  connectorSummaryActionLabelKey as a,
  ConnectorPromptAction as b,
  connectorPromptActionLabelKey as c,
  ConnectorDialogSummary as d,
  ConnectorDetailNotice as e,
  ConnectorSetupSection as f,
  ConnectorSummaryAction as g,
  ConnectorPromptList as h,
  ConnectorStatusPill as i,
  MessageCircle as j
};
