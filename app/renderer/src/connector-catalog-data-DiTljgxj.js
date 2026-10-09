import { h as useTranslation, g6 as getRuntimeConfig, j as jsxRuntimeExports, g7 as Badge, au as cn, r as reactExports, g8 as DialogTitle, g9 as DialogDescription, ga as satisfiesMinHubVersion, gb as matchesRemoteConnectorServer, gc as matchesLocalConnectorServer, gd as resolveConnectorSetupAsset, ge as resolveConnectorIcon, cX as HardDrive, cO as Globe, c1 as Cloud, by as ChartNoAxesCombined, bn as Box, gf as supportsConnectorDialog, gg as ConnectorDialog } from "./main.jsx";
function ConnectorOriginBadge({
  origin,
  className
}) {
  const { t } = useTranslation();
  if (getRuntimeConfig().env !== "development") return null;
  const source = origin?.source ?? "hub";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Badge,
    {
      variant: "outline",
      className: cn("font-normal text-muted-foreground", className),
      "data-action-ui-id": "connector-origin",
      "data-origin": source,
      children: t(`connectors.origin.${source}`, source)
    }
  );
}
function ConnectorCardContent({
  title,
  description,
  status,
  origin
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "mt-4 flex flex-wrap items-center gap-2",
        "data-layout-slot": "connector-card-title",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "break-words font-heading text-title-16 font-medium text-foreground", children: title }),
          status,
          /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectorOriginBadge, { origin })
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
function ConnectorDialogSummary({
  title,
  description,
  status,
  actions,
  origin,
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
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  className: "flex min-w-0 max-w-full flex-wrap items-center justify-center gap-1.5 overflow-hidden",
                  "data-layout-slot": "connector-detail-title-status",
                  children: [
                    status,
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectorOriginBadge, { origin })
                  ]
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
function isLocalConnector(connector) {
  return connector.entry.type === "local-app";
}
function isWebApiConnector(connector) {
  return connector.entry.type === "web-api";
}
function resolveConnectorDialog(manifest) {
  if (!supportsConnectorDialog(manifest)) return void 0;
  return (props) => /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectorDialog, { manifest, ...props });
}
const GRID_ICONS = {
  box: Box,
  "chart-no-axes-combined": ChartNoAxesCombined,
  cloud: Cloud,
  globe: Globe,
  "hard-drive": HardDrive
};
function toDefinition(manifest) {
  const id = manifest.connectorId;
  const mcp = manifest.capabilities.mcp;
  const matches = mcp === void 0 ? () => false : mcp.kind === "remote" ? (server) => matchesRemoteConnectorServer(server, {
    serverName: mcp.serverName,
    endpoint: mcp.endpoint
  }) : (server) => matchesLocalConnectorServer(server, id);
  const setupUrl = manifest.ui.setupAssetKey ? resolveConnectorSetupAsset(manifest.ui.setupAssetKey) : void 0;
  const detail = {
    iconUrl: resolveConnectorIcon(manifest.icon),
    descriptionKey: `connectors.detail.${id}.description`,
    descriptionText: manifest.description,
    examplePrompts: (manifest.ui.examplePrompts ?? []).map((prompt, index) => ({
      key: `connectors.detail.${id}.prompt.${index}`,
      ...prompt.title ? { titleKey: `connectors.detail.${id}.promptTitle.${index}` } : {},
      ...prompt.title ? { titleText: prompt.title } : {},
      text: prompt.text
    })),
    ...mcp ? { app: { name: mcp.serverName, iconUrl: resolveConnectorIcon(manifest.icon) } } : {},
    skills: (manifest.capabilities.skills ?? []).map((skill, index) => ({
      key: skill.connectorPath ?? skill.market ?? skill.path ?? `skill-${index}`,
      name: skill.name ?? skill.market ?? skill.connectorPath?.split("/").pop() ?? "",
      ...skill.description ? { description: skill.description } : {},
      ...skill.displayName ? { displayName: skill.displayName } : {}
    })),
    ...setupUrl ? { setupUrl } : {}
  };
  const base = {
    id,
    titleKey: `connectors.catalog.${id}.title`,
    descriptionKey: `connectors.catalog.${id}.description`,
    titleText: manifest.displayName,
    descriptionText: manifest.description,
    category: manifest.category,
    ...manifest.origin ? { origin: manifest.origin } : {},
    icon: GRID_ICONS[manifest.ui.gridIcon ?? "box"] ?? Box,
    matches,
    detail,
    ...manifest.gating?.regions ? { regions: manifest.gating.regions } : {}
  };
  if (manifest.ui.dialog === "local-app") {
    return { ...base, entry: { type: "local-app", connectorId: id } };
  }
  const Dialog = resolveConnectorDialog(manifest);
  if (!Dialog) return void 0;
  return { ...base, entry: { type: "web-api", Dialog } };
}
function safeAppVersion() {
  try {
    return getRuntimeConfig().appVersion;
  } catch {
    return void 0;
  }
}
function buildConnectorCatalog(entries, includeUnsupported = false) {
  const appVersion = safeAppVersion();
  return entries.filter(
    (entry) => includeUnsupported || satisfiesMinHubVersion(entry.manifest.gating?.minHubVersion, appVersion)
  ).flatMap((entry) => {
    const definition = toDefinition(entry.manifest);
    return definition ? [definition] : [];
  });
}
export {
  ConnectorCardContent as C,
  ConnectorDialogSummary as a,
  buildConnectorCatalog as b,
  ConnectorPromptList as c,
  isLocalConnector as d,
  isWebApiConnector as i
};
