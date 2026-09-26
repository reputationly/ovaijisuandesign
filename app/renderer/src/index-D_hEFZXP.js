import { h6 as isValidSkillName, f as createLucideIcon, e as createLucideIcon$1, r as reactExports, j as jsxRuntimeExports, h as useTranslation, bh as RetryIcon, bg as Button, Y as X, x as useNavigateToWorkspace, H as homeService, a5 as dedupedToast, K as workspaceRuntimeFromOpenResult, fM as toastWorkspaceOpenResult, h7 as workspaceEvents, c4 as OFFICIAL_CONNECTORS, dX as IntegrationActionGroup, bY as IntegrationActionButton, dY as IntegrationLifecycleToggleButton, dZ as IntegrationMoreMenu, U as Icon, ao as Trash2$1, au as cn, bj as AlertDialog, bk as AlertDialogContent, bl as AlertDialogHeader, bm as AlertDialogTitle, bn as AlertDialogDescription, bo as AlertDialogFooter, bp as AlertDialogCancel, bq as AlertDialogAction, c2 as ConnectorDialogFrame, bd as DialogHeader, bZ as ConnectorRelationshipGraphic, dV as ConnectorDialogScrollableBody, dH as ConnectorIcon, dP as CDN_CONNECTOR_CUSTOM, h8 as Plug, h9 as parseCustomMcpArguments, ha as normalizeCustomMcpServerInput, hb as CustomMcpValidationError, hc as CustomMcpCommandSyntaxError, hd as isReservedCustomMcpName, he as normalizeCustomMcpLaunch, be as DialogTitle, bf as DialogDescription, bK as Tabs, bL as TabsList, bM as TabsTrigger, eO as TabsContent, b$ as Label, hf as CUSTOM_MCP_NAME_MAX_LENGTH, X as Input, dQ as Select, dR as SelectTrigger, dS as SelectValue, dT as SelectContent, dU as SelectItem, eZ as Switch, av as ChevronDown, fn as Textarea, c1 as DialogFooter, hg as FASTMOSS_MCP_ENDPOINT, hh as FASTMOSS_SERVER_NAME, hi as FASTMOSS_API_KEYS_URL, o as usePlatform, dW as LocalFolderIcon, bU as LoaderCircle, dx as CircleAlert, hj as CDN_BLENDER_INSTALLER_WINDOWS_X64, hk as CDN_BLENDER_INSTALLER_MACOS_ARM64, bW as IntegrationStatusPill, d$ as Badge, bV as Download, bH as openExternalUrl, dg as ExternalLink, b2 as Check, bI as CatalogPageHeading, Q as Plus, fV as Box, hl as CDN_TOUCHDESIGNER_COMPONENTS, hm as Globe, hn as LibTvConnectorDialog, eE as Alert, eG as AlertDescription, S as PageStateBoundary, V as Search, ho as connectorReferenceFromServer, hp as FilterMenu, hq as FilterMenuTrigger, hr as FilterMenuContent, hs as FilterMenuGroup, ht as FilterMenuItem, c3 as KEY_MCP_PRESETS, hu as normalizePublicSkillShowcaseUrl, l as gatewayFetch, hv as normalizeSkillDetailMetadata, hw as normalizeSkillContentLocale, m as API_PATHS, hx as useSkillCategories, hy as selectSkillStructuredInfo, aG as Dialog, aH as DialogContent, hz as FileArchive, eF as AlertTitle, hA as RadioGroup, hB as RadioGroupItem, cP as Upload, ds as Info, eH as CircleCheck, hC as ImagePlusOutlineIcon, aZ as Video, gw as toDisplayName, gv as resolveSkillCoverUrl, gx as SkillCoverMedia, hD as Download$1, hE as formatDownloads, hF as getCardContext, hG as getSkillCategory, a_ as ImageOutlineIcon, hH as Music, hI as getTagDisplayName, bz as Tooltip, bA as TooltipTrigger, bC as TooltipContent, hJ as UPDATE_INDICATOR_STYLES, ev as Card, aN as SkillIcon, ew as CardContent, hK as CardFooter, hL as normalizeSkillCategoriesResponse, hM as useSortable, hN as CSS, hO as GripVertical, hP as useSensors, hQ as useSensor, hR as sortableKeyboardCoordinates, hS as KeyboardSensor, hT as PointerSensor, hU as Save, hV as DndContext, hW as closestCenter, hX as SortableContext, hY as verticalListSortingStrategy, eL as ChevronLeft, cZ as ChevronRight, eK as Settings2, cp as Checkbox, aS as FolderOpen, hZ as GatewayHttpError, h_ as CDN_TEMPLATE_PROJECT_WATERMARK_TOOL, h$ as CDN_TEMPLATE_PROJECT_RELIGHT, i0 as CDN_TEMPLATE_PROJECT_PANORAMA_VIEWER, i1 as CDN_TEMPLATE_PROJECT_N_STORYBOARD, i2 as CDN_TEMPLATE_PROJECT_MULTI_SHOT, i3 as CDN_TEMPLATE_PROJECT_3D_DIRECTOR, i4 as pluginEvents, fQ as useProjectArchiveActions, v as useStorage, i5 as SIDEBAR_TAB_STORAGE_KEY, aM as PluginIcon, i6 as pickLocalized, f1 as Eye$1, fP as Workflow, i7 as pluginTrackBase, i8 as trackPluginWorkflowClick, i9 as trackPluginWorkflowOpen, ia as trackPluginWorkflowOpenFailed, ib as mapCloudSkillDetail, ic as isSkillShowcaseUrl, id as CDN_SKILL_SHOWCASE_FALLBACK, fr as Pause, aK as Play$1, ie as ProgressBar, gr as VolumeX, gs as Volume2, ig as ImageOffOutlineIcon, cl as List, b_ as ArrowUpRight, fq as Package, ih as reactDomExports, ed as UserRound, aQ as MessageSquare, ii as detectSkillImportFileExt, ij as trackSkillImportFailed, ik as trackSkillImport, il as chatLog, aY as FileText, im as useWSConnection, io as readPendingAutoUpdate, ip as writePendingAutoUpdate, iq as clearPendingAutoUpdate, ir as trackPluginInstall, is as trackPluginInstallFailed, it as trackPluginUninstall, iu as trackPluginUninstallFailed, iv as trackSkillInstallFailed, iw as trackSkillInstallEvent, ix as showSkillInstallSuccessToast, iy as beginSkillApplyingToast, iz as trackSkillInvoke, iA as skillCategoryCodes, gC as skillVerticals, ax as useSearch, aF as useIsScrolling, iB as useSidebarBadges, iC as trackSkillMarketOpen, cd as useAuth, iD as trackSkillDetailView, iE as trackSkillFilter, gT as useMarketSkills, iF as FEATURED_MARKET_PAGE_SIZE, iG as OTHER_MARKET_PAGE_SIZE, iH as trackSkillTabSwitch, iI as trackSkillToggle, iJ as mapSkillSource, iK as trackSkillSearch, iL as trackSkillUninstall, iM as trackSkillUninstallFailed, iN as trackSkillExport, bG as getRuntimeConfig, iO as getSkillShareUrl, iP as trackSkillCreatorInvoke, iQ as trackSkillTry, bT as Link2, iR as SkillFilterBar, iS as FEATURED_TAG, dh as Popover, di as PopoverTrigger, dj as PopoverContent } from "./main.jsx";
import { P as PageSearchInput, T as TAB_CONTENT_ENTER_CLASS_NAME } from "./index-eXcNLvyz.js";
import { d as ConnectorDialogSummary, g as ConnectorSummaryAction, a as connectorSummaryActionLabelKey, i as ConnectorStatusPill, h as ConnectorPromptList, b as ConnectorPromptAction, c as connectorPromptActionLabelKey, C as ConnectorCardContent, A as ApiKeyConnectorDialog, f as ConnectorSetupSection, e as ConnectorDetailNotice, M as MarketplaceKeyConnectorDialog, j as MessageCircle } from "./MarketplaceKeyConnectorDialog-DJf8veqQ.js";
import { E as Eye } from "./eye-CFw9EXGT.js";
import { B as BadgeCheck } from "./badge-check-BDfEQW3b.js";
const SKILL_REVIEW_LIMITS = {
  zh: {
    displayNameMin: 2,
    displayNameMax: 24,
    summaryMin: 20,
    summaryMax: 60,
    bestForMinCount: 2,
    bestForMaxCount: 3,
    bestForMinLength: 2,
    bestForMaxLength: 6,
    howToUseMin: 20,
    howToUseMax: 40,
    outputsMin: 15,
    outputsMax: 40,
    creatorMin: 2,
    creatorMax: 30
  },
  en: {
    displayNameMin: 2,
    displayNameMax: 48,
    summaryMin: 40,
    summaryMax: 120,
    bestForMinCount: 2,
    bestForMaxCount: 3,
    bestForMinLength: 2,
    bestForMaxLength: 24,
    howToUseMin: 40,
    howToUseMax: 120,
    outputsMin: 30,
    outputsMax: 100,
    creatorMin: 2,
    creatorMax: 40
  }
};
const SKILL_REVIEW_CATEGORY_LIMIT = 3;
const DEFAULT_LOCALE = "zh";
const DEFAULT_SKILL_PACKAGE_VERSION = "0.1.0";
const SKILL_PACKAGE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
function isValidSkillPackageVersion(version) {
  return SKILL_PACKAGE_VERSION_PATTERN.test(version.trim());
}
function compareSkillPackageVersions(a, b) {
  if (!isValidSkillPackageVersion(a) || !isValidSkillPackageVersion(b)) return null;
  const left = a.split(".").map(BigInt);
  const right = b.split(".").map(BigInt);
  for (let index = 0; index < 3; index += 1) {
    const leftPart = left[index] ?? 0n;
    const rightPart = right[index] ?? 0n;
    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }
  return 0;
}
function isNewerSkillPackageVersion(next, current) {
  return (compareSkillPackageVersions(next, current) ?? 0) > 0;
}
function validateReviewMetadata(metadata, existingSkillName) {
  const errors = {};
  const required = "required";
  const locale = metadata.locale ?? DEFAULT_LOCALE;
  const limits = SKILL_REVIEW_LIMITS[locale];
  const skillName = metadata.skillName.trim();
  const nameMatchesContext = existingSkillName === void 0 ? /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skillName) : skillName === existingSkillName;
  if (!isValidSkillName(skillName) || !nameMatchesContext) {
    errors.skillName = "skill_name_invalid";
  }
  const displayNameLength = [...metadata.displayName.trim()].length;
  if (displayNameLength === 0) errors.displayName = required;
  else if (displayNameLength < limits.displayNameMin || displayNameLength > limits.displayNameMax) {
    errors.displayName = "display_name_length";
  }
  const summaryLength = [...metadata.summary.trim()].length;
  if (summaryLength === 0) errors.summary = required;
  else if (summaryLength < limits.summaryMin || summaryLength > limits.summaryMax) {
    errors.summary = "summary_length";
  }
  const normalizedBestFor = metadata.bestFor.map((value) => value.trim());
  if (normalizedBestFor.length < limits.bestForMinCount || normalizedBestFor.length > limits.bestForMaxCount) {
    errors.bestFor = "best_for_count";
  } else if (new Set(normalizedBestFor).size !== normalizedBestFor.length || normalizedBestFor.some((value) => {
    const length = [...value].length;
    return length < limits.bestForMinLength || length > limits.bestForMaxLength || locale === "en" && value.split(/\s+/).filter(Boolean).length > 3;
  })) {
    errors.bestFor = "best_for_length";
  }
  const howToUseLength = [...metadata.howToUse.trim()].length;
  if (howToUseLength < limits.howToUseMin || howToUseLength > limits.howToUseMax) {
    errors.howToUse = "how_to_use_length";
  }
  const outputsLength = [...metadata.outputs.trim()].length;
  if (outputsLength < limits.outputsMin || outputsLength > limits.outputsMax) {
    errors.outputs = "outputs_length";
  }
  if (metadata.categories.length === 0) errors.categories = required;
  else if (metadata.categories.length > SKILL_REVIEW_CATEGORY_LIMIT || new Set(metadata.categories).size !== metadata.categories.length) {
    errors.categories = "categories_invalid";
  }
  if (!metadata.stage.trim()) errors.stage = required;
  const creatorLength = [...metadata.creator.trim()].length;
  if (!metadata.creator.trim()) errors.creator = required;
  else if (creatorLength < limits.creatorMin || creatorLength > limits.creatorMax) {
    errors.creator = "creator_length";
  }
  if (!metadata.packageVersion.trim()) errors.packageVersion = required;
  else if (!isValidSkillPackageVersion(metadata.packageVersion)) {
    errors.packageVersion = "package_version_invalid";
  }
  if (!metadata.hasCover) errors.hasCover = required;
  if (!metadata.hasShowcase) errors.hasShowcase = required;
  if (!metadata.hasPackage) errors.hasPackage = required;
  return errors;
}
const Clapperboard = createLucideIcon("clapperboard", [["path", { "fill": "none", "stroke": "currentColor", "strokeLinecap": "round", "strokeLinejoin": "round", "strokeWidth": "2", "d": "M20.2 6L3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Zm-14-.7l3.1 3.9m3.1-5.8l3.1 4M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" }]], "0 0 24 24", false);
const Film = createLucideIcon("film", [["rect", { "width": "18", "height": "18", "x": "3", "y": "3", "rx": "2" }], ["path", { "d": "M7 3v18M3 7.5h4M3 12h18M3 16.5h4M17 3v18m0-13.5h4m-4 9h4" }]], "0 0 24 24", false);
const Headphones = createLucideIcon("headphones", [["path", { "fill": "none", "stroke": "currentColor", "strokeLinecap": "round", "strokeLinejoin": "round", "strokeWidth": "2", "d": "M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" }]], "0 0 24 24", false);
const Megaphone = createLucideIcon("megaphone", [["path", { "d": "M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" }], ["path", { "d": "M6 14a12 12 0 0 0 2.4 7.2a2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14M8 6v8" }]], "0 0 24 24", false);
const Play = createLucideIcon("play", [["path", { "fill": "none", "stroke": "currentColor", "strokeLinecap": "round", "strokeLinejoin": "round", "strokeWidth": "2", "d": "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" }]], "0 0 24 24", false);
const Share2$1 = createLucideIcon("share-2", [["circle", { "cx": "18", "cy": "5", "r": "3" }], ["circle", { "cx": "6", "cy": "12", "r": "3" }], ["circle", { "cx": "18", "cy": "19", "r": "3" }], ["path", { "d": "m8.59 13.51l6.83 3.98m-.01-10.98l-6.82 3.98" }]], "0 0 24 24", false);
const ShoppingBag = createLucideIcon("shopping-bag", [["path", { "d": "M16 10a4 4 0 0 1-8 0M3.103 6.034h17.794" }], ["path", { "d": "M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z" }]], "0 0 24 24", false);
const Trash2 = createLucideIcon("trash-2", [["path", { "fill": "none", "stroke": "currentColor", "strokeLinecap": "round", "strokeLinejoin": "round", "strokeWidth": "2", "d": "M10 11v6m4-6v6m5-11v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }]], "0 0 24 24", false);
const Wrench = createLucideIcon("wrench", [["path", { "fill": "none", "stroke": "currentColor", "strokeLinecap": "round", "strokeLinejoin": "round", "strokeWidth": "2", "d": "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z" }]], "0 0 24 24", false);
/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ChartNoAxesCombined = createLucideIcon$1("ChartNoAxesCombined", [
  ["path", { d: "M12 16v5", key: "zza2cw" }],
  ["path", { d: "M16 14v7", key: "1g90b9" }],
  ["path", { d: "M20 10v11", key: "1iqoj0" }],
  [
    "path",
    { d: "m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15", key: "1fw8x9" }
  ],
  ["path", { d: "M4 18v3", key: "1yp0dc" }],
  ["path", { d: "M8 14v7", key: "n3cwzv" }]
]);
/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const FilePlus2 = createLucideIcon$1("FilePlus2", [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4", key: "1pf5j1" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M3 15h6", key: "4e2qda" }],
  ["path", { d: "M6 12v6", key: "1u72j0" }]
]);
/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Import = createLucideIcon$1("Import", [
  ["path", { d: "M12 3v12", key: "1x0j5s" }],
  ["path", { d: "m8 11 4 4 4-4", key: "1dohi6" }],
  [
    "path",
    {
      d: "M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4",
      key: "1ywtjm"
    }
  ]
]);
/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ListChecks = createLucideIcon$1("ListChecks", [
  ["path", { d: "m3 17 2 2 4-4", key: "1jhpwq" }],
  ["path", { d: "m3 7 2 2 4-4", key: "1obspn" }],
  ["path", { d: "M13 6h8", key: "15sg57" }],
  ["path", { d: "M13 12h8", key: "h98zly" }],
  ["path", { d: "M13 18h8", key: "oe0vm4" }]
]);
/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Share2 = createLucideIcon$1("Share2", [
  ["circle", { cx: "18", cy: "5", r: "3", key: "gq8acd" }],
  ["circle", { cx: "6", cy: "12", r: "3", key: "w7nqdw" }],
  ["circle", { cx: "18", cy: "19", r: "3", key: "1xt0gg" }],
  ["line", { x1: "8.59", x2: "15.42", y1: "13.51", y2: "17.49", key: "47mynk" }],
  ["line", { x1: "15.41", x2: "8.59", y1: "6.51", y2: "10.49", key: "1n3mei" }]
]);
const EXIT_DURATION_MS = 220;
function AutoUpdateBanner({
  pending,
  restarting,
  onRestart,
  onDismiss
}) {
  const { t } = useTranslation();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-action-ui-id": "skills-auto-update-banner",
      className: "flex w-full items-center gap-3 rounded-lg bg-brand-accent/[0.04] p-2.5",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-accent/10 text-brand-accent", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RetryIcon, { size: 16, className: restarting ? "animate-spin" : "" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 text-sm font-medium text-foreground", children: restarting ? t("skills.autoUpdateBanner.restarting") : t("skills.autoUpdateBanner.completed", { count: pending.updatedCount }) }),
        !restarting && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "ghost",
            size: "icon-xs",
            "data-action-ui-id": "skills-auto-update-dismiss",
            "aria-label": t("common.close"),
            className: "h-6 w-6 text-muted-foreground hover:text-foreground",
            onClick: onDismiss,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 12, strokeWidth: 1.5 })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            "data-action-ui-id": "skills-auto-update-restart",
            variant: "secondary",
            size: "xs",
            className: "h-7 border-0 bg-brand-accent px-3 text-xs font-medium text-brand-accent-foreground hover:bg-brand-accent/90",
            onClick: onRestart,
            disabled: restarting,
            children: t("skills.autoUpdateBanner.restartNow")
          }
        )
      ]
    }
  );
}
function AutoUpdateBannerPresence({
  pending,
  restarting,
  onRestart,
  onDismiss
}) {
  const [renderedPending, setRenderedPending] = reactExports.useState(pending);
  const [expanded, setExpanded] = reactExports.useState(Boolean(pending));
  reactExports.useEffect(() => {
    if (pending) {
      setRenderedPending(pending);
      const frame = window.requestAnimationFrame(() => setExpanded(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setExpanded(false);
    const timeout = window.setTimeout(() => setRenderedPending(null), EXIT_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [pending]);
  if (!renderedPending) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-layout-slot": "skills-auto-update-presence",
      "data-state": expanded ? "open" : "closed",
      className: `grid transition-[grid-template-rows,opacity] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${expanded ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-0 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: `pb-3 transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${expanded ? "translate-y-0" : "-translate-y-1"}`,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            AutoUpdateBanner,
            {
              pending: renderedPending,
              restarting,
              onRestart,
              onDismiss
            }
          )
        }
      ) })
    }
  );
}
function useTryConnector() {
  const { t } = useTranslation();
  const navigateToWorkspace = useNavigateToWorkspace();
  const [trying, setTrying] = reactExports.useState(false);
  const tryConnector = reactExports.useCallback(
    async (connector2, prompt) => {
      if (trying) return;
      setTrying(true);
      try {
        const workspacePrompt = prompt?.trim() || connector2.displayName;
        const result = await homeService.hiloApp.createWorkspaceWithResult(workspacePrompt).catch(() => null);
        if (!result) {
          dedupedToast.error(t("skills.tryItOutFailed"));
          return;
        }
        const runtime = workspaceRuntimeFromOpenResult(result);
        if (!runtime) {
          toastWorkspaceOpenResult(result, t);
          return;
        }
        workspaceEvents.queueAddConnectorToChat(runtime.workspaceId, connector2, prompt ?? "");
        navigateToWorkspace(runtime);
      } finally {
        setTrying(false);
      }
    },
    [trying, t, navigateToWorkspace]
  );
  return { tryConnector, trying };
}
function ConnectorManagementActions({
  connector: connector2,
  actionIdPrefix,
  className,
  onUpdated,
  onRemoved
}) {
  const { t } = useTranslation();
  const [pendingAction, setPendingAction] = reactExports.useState(null);
  const busy = reactExports.useRef(false);
  const [removalOpen, setRemovalOpen] = reactExports.useState(false);
  const [error, setError] = reactExports.useState();
  const isManagedLibTv = OFFICIAL_CONNECTORS.libtv.matches(connector2);
  const canAuthorize = connector2.enabled && isManagedLibTv;
  const handleEnabledChange = async (enabled, action) => {
    if (busy.current) return;
    busy.current = true;
    setPendingAction(action);
    try {
      if (enabled && isManagedLibTv) {
        const result2 = await homeService.customMcp.prepareRemoteConnector({
          connectorId: "libtv",
          action: "authorize"
        });
        const latest = (await homeService.customMcp.list()).find(
          (server) => server.name === connector2.name
        );
        if (latest) onUpdated(latest);
        if (!result2.ok || !result2.mcpConnected)
          dedupedToast.error(
            t(
              result2.code === "runtime_unavailable" ? "connectors.libtv.runtimeRequired" : result2.code === "busy" ? "connectors.libtv.busy" : "connectors.libtv.failed"
            )
          );
        return;
      }
      const result = await homeService.customMcp.setEnabled(connector2.name, enabled);
      if (!result.ok) {
        dedupedToast.error(t(`connectors.customDialog.error.${result.code}`));
        return;
      }
      onUpdated(result.server);
      if (result.runtime.state === "failed" || result.runtime.state === "partial") {
        dedupedToast.error(
          t(enabled ? "connectors.customDialog.created.failed" : "connectors.stopFailed")
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
      const result = await homeService.customMcp.remove(connector2.name);
      if (result.removed || result.code === "server_not_found") {
        setRemovalOpen(false);
        onRemoved(connector2.name);
        return;
      }
      setError(t(`connectors.removeError.${result.code}`));
      const servers = await homeService.customMcp.list();
      const latest = servers.find((server) => server.name === connector2.name);
      if (latest) onUpdated(latest);
    } catch {
      setError(t("connectors.customDialog.error.requestFailed"));
    } finally {
      busy.current = false;
      setPendingAction(null);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      IntegrationActionGroup,
      {
        className: cn("w-auto flex-wrap", className),
        onClick: (event) => event.stopPropagation(),
        "data-layout-slot": "connector-management-actions",
        children: [
          canAuthorize || connector2.runtimeState === "failed" || connector2.runtimeState === "partial" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            IntegrationActionButton,
            {
              variant: "outline",
              disabled: pendingAction !== null,
              loading: pendingAction === "retry",
              className: "bg-transparent",
              onClick: () => void handleEnabledChange(connector2.enabled, "retry"),
              "data-action-ui-id": `${actionIdPrefix}-retry`,
              children: t(canAuthorize ? "connectors.libtv.authorize" : "common.retry")
            }
          ) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            IntegrationLifecycleToggleButton,
            {
              inactive: !connector2.enabled,
              activeLabel: t("connectors.stop"),
              inactiveLabel: t("connectors.start"),
              disabled: pendingAction !== null,
              loading: pendingAction === "toggle",
              onClick: () => void handleEnabledChange(!connector2.enabled, "toggle"),
              className: "w-auto min-w-20 max-w-none px-3",
              "data-action-ui-id": `${actionIdPrefix}-toggle`
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            IntegrationMoreMenu,
            {
              disabled: pendingAction !== null,
              triggerClassName: "bg-transparent",
              triggerLabel: t("common.more"),
              actionLabel: t("connectors.removeConnection"),
              actionIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: Trash2$1, size: "sm", strokeWidth: 1.5, "aria-hidden": true }),
              onAction: () => {
                setError(void 0);
                setRemovalOpen(true);
              },
              actionUiIds: {
                trigger: `${actionIdPrefix}-more`,
                content: `${actionIdPrefix}-more-popover`,
                bridge: `${actionIdPrefix}-more-popover-hover-bridge`,
                action: `${actionIdPrefix}-remove`
              }
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      AlertDialog,
      {
        open: removalOpen,
        onOpenChange: (open) => {
          if (!busy.current) setRemovalOpen(open);
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { onClick: (event) => event.stopPropagation(), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTitle, { children: t("connectors.removeTitle", { name: connector2.name }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogDescription, { children: t("connectors.removeDescription") })
          ] }),
          error ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", className: "text-xs text-destructive", children: error }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { disabled: pendingAction !== null, children: t("common.cancel") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              AlertDialogAction,
              {
                variant: "destructive",
                loading: pendingAction === "remove",
                onClick: () => void handleRemove(),
                "data-action-ui-id": `${actionIdPrefix}-remove-confirm`,
                children: t("connectors.removeConnection")
              }
            )
          ] })
        ] })
      }
    )
  ] });
}
function toConnectorDisplayState(runtimeState) {
  if (runtimeState === "saved") return "connected";
  if (runtimeState === "partial") return "failed";
  return runtimeState;
}
function ConnectorDetailDialog({
  connector: connector2,
  savedServer,
  onClose,
  onConnect,
  onTry,
  onUpdated,
  onRemoved,
  setupContent
}) {
  const { t } = useTranslation();
  const [showingSetup, setShowingSetup] = reactExports.useState(false);
  const [setupBusy, setSetupBusy] = reactExports.useState(false);
  const runtimeState = savedServer?.runtimeState;
  const displayState = runtimeState ? toConnectorDisplayState(runtimeState) : void 0;
  const hasSavedConnection = Boolean(savedServer);
  const isReady = displayState === "connected" || hasSavedConnection;
  const needsAttention = displayState === "failed";
  const suggestionsDisabled = needsAttention || savedServer?.enabled === false;
  const suggestionsMuted = needsAttention || savedServer?.enabled === false;
  const connectorName = t(connector2.titleKey);
  const promptActionMode = needsAttention ? "requiresRecovery" : savedServer?.enabled === false ? "requiresEnable" : isReady ? "ready" : "requiresConnection";
  const handleConnect = () => {
    if (setupContent) {
      setShowingSetup(true);
      return;
    }
    onConnect();
  };
  const handlePromptClick = (text) => {
    if (isReady) {
      onTry(text);
      return;
    }
    handleConnect();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ConnectorDialogFrame,
    {
      open: true,
      onOpenChange: (open) => !open && !setupBusy && onClose(),
      actionUiId: showingSetup ? "connector-setup-dialog" : "connector-detail-dialog",
      closeLabel: t("common.close"),
      size: "md",
      stableHeight: !showingSetup && connector2.detail.examplePrompts.length > 0,
      showCloseButton: !setupBusy,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "flex min-h-0 flex-1 flex-col",
          "data-layout-slot": "connector-dialog-view",
          "data-view": showingSetup ? "setup" : "detail",
          children: showingSetup && setupContent ? setupContent(setSetupBusy) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { className: "shrink-0 items-center px-4 pt-8 text-center sm:px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectorRelationshipGraphic, { targetIconUrl: connector2.detail.iconUrl }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(ConnectorDialogScrollableBody, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col items-center px-4 sm:px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                ConnectorDialogSummary,
                {
                  title: connectorName,
                  description: t(connector2.detail.descriptionKey),
                  status: /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectorStatusPill, { state: displayState ?? "notConnected" }),
                  actions: !hasSavedConnection ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                    ConnectorSummaryAction,
                    {
                      mode: "connect",
                      label: t(connectorSummaryActionLabelKey.connect),
                      onClick: handleConnect,
                      "data-action-ui-id": "connector-detail-connect"
                    }
                  ) : savedServer ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    displayState === "connected" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                      ConnectorSummaryAction,
                      {
                        mode: "try",
                        label: t(connectorSummaryActionLabelKey.try),
                        onClick: () => onTry(),
                        "data-action-ui-id": "connector-detail-use-in-chat"
                      }
                    ) : null,
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      ConnectorManagementActions,
                      {
                        connector: savedServer,
                        actionIdPrefix: "connector-detail",
                        onUpdated,
                        onRemoved
                      }
                    )
                  ] }) : null
                }
              ) }),
              connector2.detail.examplePrompts.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                ConnectorPromptList,
                {
                  title: t(
                    isReady ? "connectors.detail.trySection" : "connectors.detail.previewSection"
                  ),
                  description: t(
                    isReady ? "connectors.detail.tryDescription" : "connectors.detail.previewDescription"
                  ),
                  items: connector2.detail.examplePrompts.map((prompt) => {
                    const text = t(prompt.key);
                    return {
                      key: prompt.key,
                      title: prompt.titleKey ? t(prompt.titleKey) : void 0,
                      description: text,
                      muted: suggestionsMuted,
                      action: /* @__PURE__ */ jsxRuntimeExports.jsx(
                        ConnectorPromptAction,
                        {
                          mode: promptActionMode,
                          label: t(connectorPromptActionLabelKey[promptActionMode]),
                          disabled: suggestionsDisabled,
                          onClick: () => handlePromptClick(text),
                          "data-action-ui-id": "connector-detail-prompt"
                        }
                      )
                    };
                  })
                }
              ) : null
            ] })
          ] })
        },
        showingSetup ? "setup" : "detail"
      )
    }
  );
}
function CustomConnectorCard({
  connector: connector2,
  title,
  description,
  icon = Plug,
  iconUrl = CDN_CONNECTOR_CUSTOM,
  onClick,
  onUpdated,
  onRemoved
}) {
  const displayState = toConnectorDisplayState(connector2.runtimeState);
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: connector card click
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "article",
      {
        className: cn(
          "relative flex min-h-40 flex-col rounded-2xl border border-border bg-card p-5",
          onClick && "cursor-pointer"
        ),
        "data-action-ui-id": "connectors-custom-card",
        "data-connector-name": connector2.name,
        onClick,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ConnectorIcon,
              {
                iconUrl,
                size: "card",
                fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon, size: "lg", "aria-hidden": true, className: "text-foreground/70" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2",
                "data-layout-slot": "connector-card-controls",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ConnectorManagementActions,
                  {
                    connector: connector2,
                    actionIdPrefix: "connectors-custom",
                    className: "shrink-0",
                    onUpdated,
                    onRemoved
                  }
                )
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            ConnectorCardContent,
            {
              title,
              description,
              status: /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectorStatusPill, { state: displayState })
            }
          )
        ]
      }
    )
  );
}
const VALIDATION_FIELDS = {
  name: { field: "name", messageKey: "connectors.customDialog.nameError" },
  command: { field: "command", messageKey: "connectors.customDialog.commandError" },
  args: { field: "arguments", messageKey: "connectors.customDialog.argumentsError" },
  url: { field: "url", messageKey: "connectors.customDialog.urlError" },
  description: { field: "description", messageKey: "connectors.customDialog.descriptionError" },
  env: { field: "key-values", messageKey: "connectors.customDialog.keyValuesError" },
  headers: { field: "key-values", messageKey: "connectors.customDialog.keyValuesError" },
  timeoutMs: { field: "timeout", messageKey: "connectors.customDialog.timeoutError" }
};
const COMMAND_ISSUE_KEYS = {
  unclosed_quote: "connectors.customDialog.unclosedQuoteError",
  shell_syntax: "connectors.customDialog.shellSyntaxError",
  ambiguous_executable: "connectors.customDialog.commandPathError"
};
function editorValidationError(error, name) {
  if (error instanceof CustomMcpCommandSyntaxError) {
    return { field: "arguments", messageKey: "connectors.customDialog.unclosedQuoteError" };
  }
  if (error instanceof CustomMcpValidationError && error.field) {
    if (error.commandIssue) {
      return {
        field: "command",
        messageKey: COMMAND_ISSUE_KEYS[error.commandIssue]
      };
    }
    if (error.field === "name" && isReservedCustomMcpName(name)) {
      return { field: "name", messageKey: "connectors.customDialog.error.reserved_name" };
    }
    return VALIDATION_FIELDS[error.field];
  }
  return { messageKey: "connectors.customDialog.error.invalid_config" };
}
const INITIAL_FORM_STATE = {
  name: "",
  transport: "stdio",
  command: "",
  argumentsText: "",
  url: "",
  description: "",
  enabled: true,
  keyValuesText: "",
  timeoutText: ""
};
const INITIAL_JSON = JSON.stringify(
  {
    "my-server": {
      transport: "stdio",
      command: "npx",
      args: ["-y", "@example/mcp-server"],
      enabled: true
    }
  },
  null,
  2
);
function parseEditorKeyValues(value) {
  if (!value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return void 0;
    if (Object.values(parsed).some((entry) => typeof entry !== "string")) return void 0;
    return parsed;
  } catch {
    return void 0;
  }
}
function editorFormToInput(state) {
  return validateEditorForm(state).input;
}
function normalizeEditorName(value) {
  return value.trim().replace(/\s+/gu, "-");
}
function validateEditorForm(state) {
  const keyValues = parseEditorKeyValues(state.keyValuesText);
  if (keyValues === void 0) return { error: VALIDATION_FIELDS.env };
  const timeoutMs = state.timeoutText ? Number(state.timeoutText) : void 0;
  const common = {
    ...state.description.trim() ? { description: state.description.trim() } : {},
    ...timeoutMs !== void 0 ? { timeoutMs } : {}
  };
  let args;
  try {
    args = state.transport === "stdio" && state.argumentsText.trim() ? parseCustomMcpArguments(state.argumentsText) : void 0;
  } catch (error) {
    return { error: editorValidationError(error, state.name) };
  }
  const candidate = {
    name: normalizeEditorName(state.name),
    enabled: state.enabled,
    config: state.transport === "stdio" ? {
      transport: "stdio",
      command: state.command,
      ...args ? { args } : {},
      ...Object.keys(keyValues).length ? { env: keyValues } : {},
      ...common
    } : {
      transport: state.transport,
      url: state.url,
      ...Object.keys(keyValues).length ? { headers: keyValues } : {},
      ...common
    }
  };
  try {
    return { input: normalizeCustomMcpServerInput(candidate) };
  } catch (error) {
    return { error: editorValidationError(error, candidate.name) };
  }
}
function normalizeEditorLaunchFields(state) {
  if (state.transport !== "stdio") return void 0;
  try {
    const launch = normalizeCustomMcpLaunch(
      state.command,
      state.argumentsText.trim() ? parseCustomMcpArguments(state.argumentsText) : void 0
    );
    if (launch.command === state.command.trim()) return void 0;
    return { command: launch.command, argumentsText: formatEditorArguments(launch.args ?? []) };
  } catch {
    return void 0;
  }
}
function serializeDraftArguments(value) {
  try {
    return parseCustomMcpArguments(value);
  } catch {
    return value;
  }
}
function serializeEditorForm(state) {
  const input = editorFormToInput(state);
  if (input) return serializeEditorInput(input);
  const keyValues = parseEditorKeyValues(state.keyValuesText) ?? {};
  const config = state.transport === "stdio" ? {
    transport: state.transport,
    command: state.command.trim(),
    ...state.argumentsText.trim() ? { args: serializeDraftArguments(state.argumentsText) } : {},
    ...Object.keys(keyValues).length ? { env: keyValues } : {}
  } : {
    transport: state.transport,
    url: state.url.trim(),
    ...Object.keys(keyValues).length ? { headers: keyValues } : {}
  };
  return JSON.stringify(
    {
      [state.name.trim() || "my-server"]: {
        ...config,
        ...state.description.trim() ? { description: state.description.trim() } : {},
        ...state.timeoutText ? { timeoutMs: Number(state.timeoutText) } : {},
        enabled: state.enabled
      }
    },
    null,
    2
  );
}
function parseEditorJson(value) {
  return validateEditorJson(value).input;
}
function validateEditorJson(value) {
  const invalidJson = {
    error: { field: "json", messageKey: "connectors.customDialog.jsonError" }
  };
  let serverName = "";
  try {
    const parsed = JSON.parse(value);
    if (!isRecord$1(parsed)) return invalidJson;
    const source = Object.keys(parsed).length === 1 && isRecord$1(parsed.mcpServers) ? parsed.mcpServers : parsed;
    if (!isRecord$1(source)) return invalidJson;
    const entries = Object.entries(source);
    if (entries.length !== 1) return invalidJson;
    const entry = entries[0];
    if (!entry) return invalidJson;
    const [name, config] = entry;
    serverName = name;
    if (!isRecord$1(config)) return invalidJson;
    return {
      input: normalizeCustomMcpServerInput({
        name,
        enabled: config.enabled ?? true,
        config: Object.fromEntries(Object.entries(config).filter(([key]) => key !== "enabled"))
      })
    };
  } catch (error) {
    return error instanceof CustomMcpValidationError ? { error: { ...editorValidationError(error, serverName), field: "json" } } : invalidJson;
  }
}
function editorInputToForm(input) {
  const { config } = input;
  return {
    name: input.name,
    transport: config.transport,
    command: config.transport === "stdio" ? config.command : "",
    argumentsText: config.transport === "stdio" ? formatEditorArguments(config.args ?? []) : "",
    url: config.transport === "stdio" ? "" : config.url,
    description: config.description ?? "",
    enabled: input.enabled,
    keyValuesText: formatKeyValues(config.transport === "stdio" ? config.env : config.headers),
    timeoutText: config.timeoutMs ? String(config.timeoutMs) : ""
  };
}
function serializeEditorInput(input) {
  return JSON.stringify(
    {
      [input.name]: {
        ...input.config,
        enabled: input.enabled
      }
    },
    null,
    2
  );
}
function formatEditorArguments(args) {
  return args.map(
    (argument) => /^[a-zA-Z0-9_@%+=:,./-]+$/u.test(argument) ? argument : `'${argument.replace(/'/gu, "'\\''")}'`
  ).join(" ");
}
function formatKeyValues(value) {
  return value && Object.keys(value).length ? JSON.stringify(value, null, 2) : "";
}
function isRecord$1(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
const MCP_TRANSPORT_LABELS = {
  stdio: "stdio",
  http: "HTTP",
  "streamable-http": "Streamable HTTP",
  sse: "SSE"
};
const FORM_OUTLINE_CLASS_NAME = "border border-input focus-visible:border-foreground focus-visible:ring-0";
const FORM_CONTROL_CLASS_NAME = `h-10 ${FORM_OUTLINE_CLASS_NAME}`;
const FORM_LABEL_CLASS_NAME = "text-sm font-medium text-foreground";
const HELPER_TEXT_CLASS_NAME = "text-[13px] leading-relaxed text-muted-foreground";
const SELECT_ITEM_CLASS_NAME = "h-8 rounded-sm py-2 pr-8 pl-3 text-sm font-normal text-foreground/70 focus:bg-popup-item-hover focus:text-foreground data-[highlighted]:bg-popup-item-hover data-[highlighted]:text-foreground";
function CustomConnectorDialog({
  open,
  onOpenChange,
  onSubmit,
  onCreated
}) {
  const { t } = useTranslation();
  const [mode, setMode] = reactExports.useState("form");
  const [formState, setFormState] = reactExports.useState(INITIAL_FORM_STATE);
  const [jsonText, setJsonText] = reactExports.useState(INITIAL_JSON);
  const [advancedOpen, setAdvancedOpen] = reactExports.useState(false);
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [submitError, setSubmitError] = reactExports.useState();
  const [validationAttempted, setValidationAttempted] = reactExports.useState(false);
  const [focusTarget, setFocusTarget] = reactExports.useState();
  const [commandWasSplit, setCommandWasSplit] = reactExports.useState(false);
  const contentRef = reactExports.useRef(null);
  const busy = reactExports.useRef(false);
  const requestEpoch = reactExports.useRef(0);
  reactExports.useEffect(() => {
    requestEpoch.current += 1;
    busy.current = false;
    if (open) {
      setMode("form");
      setFormState(INITIAL_FORM_STATE);
      setJsonText(INITIAL_JSON);
      setAdvancedOpen(false);
      setSubmitting(false);
      setSubmitError(void 0);
      setValidationAttempted(false);
      setFocusTarget(void 0);
      setCommandWasSplit(false);
    }
    return () => {
      requestEpoch.current += 1;
    };
  }, [open]);
  const handleOpenChange = (nextOpen) => {
    if (!busy.current) onOpenChange(nextOpen);
  };
  const validation = reactExports.useMemo(
    () => mode === "form" ? validateEditorForm(formState) : validateEditorJson(jsonText),
    [formState, jsonText, mode]
  );
  const { input } = validation;
  const validationError = validationAttempted ? validation.error : void 0;
  const nameLength = Array.from(normalizeEditorName(formState.name)).length;
  reactExports.useEffect(() => {
    if (!focusTarget) return;
    contentRef.current?.querySelector(`#custom-connector-${focusTarget}`)?.focus();
    setFocusTarget(void 0);
  }, [focusTarget]);
  const getFieldValidationProps = (field) => ({
    "aria-invalid": validationError?.field === field || void 0,
    "aria-describedby": validationError?.field === field ? `custom-connector-${field}-error` : field === "name" ? "custom-connector-name-hint custom-connector-name-count" : field === "command" || field === "arguments" ? "custom-connector-command-hint" : void 0
  });
  const renderFieldError = (field) => validationError?.field === field ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { id: `custom-connector-${field}-error`, className: "text-xs text-destructive", role: "alert", children: t(validationError.messageKey) }) : null;
  const handleModeChange = (nextMode) => {
    const editorMode = nextMode;
    if (editorMode === "json" && mode === "form") {
      setJsonText(serializeEditorForm(formState));
    } else if (editorMode === "form" && mode === "json") {
      const parsed = parseEditorJson(jsonText);
      if (parsed) setFormState(editorInputToForm(parsed));
    }
    setSubmitError(void 0);
    setValidationAttempted(false);
    setFocusTarget(void 0);
    setMode(editorMode);
  };
  const handleTransportChange = (value) => {
    if (!value) return;
    setFormState((current) => ({
      ...current,
      transport: value,
      keyValuesText: ""
    }));
  };
  const remote = formState.transport !== "stdio";
  const handleCommandBlur = () => {
    const normalized = normalizeEditorLaunchFields(formState);
    if (!normalized) return;
    setFormState((current) => ({ ...current, ...normalized }));
    setCommandWasSplit(true);
  };
  const handleSubmit = async () => {
    if (busy.current) return;
    setSubmitError(void 0);
    setValidationAttempted(true);
    if (!input) {
      const field = validation.error.field;
      if (field === "key-values" || field === "timeout") setAdvancedOpen(true);
      setFocusTarget(field);
      return;
    }
    busy.current = true;
    const epoch = requestEpoch.current;
    setSubmitting(true);
    setSubmitError(void 0);
    try {
      const result = await onSubmit(input);
      if (epoch !== requestEpoch.current) return;
      if (!result.ok) {
        setSubmitError(t(`connectors.customDialog.error.${result.code}`));
        return;
      }
      onCreated?.(result);
      onOpenChange(false);
    } catch {
      if (epoch === requestEpoch.current) {
        setSubmitError(t("connectors.customDialog.error.requestFailed"));
      }
    } finally {
      if (epoch === requestEpoch.current) {
        busy.current = false;
        setSubmitting(false);
      }
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    ConnectorDialogFrame,
    {
      open,
      onOpenChange: handleOpenChange,
      actionUiId: "custom-connector-dialog",
      closeLabel: t("common.close"),
      size: "lg",
      showCloseButton: !submitting,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("fieldset", { disabled: submitting, className: "contents", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            ref: contentRef,
            className: "flex min-h-0 flex-1 flex-col px-6 pt-5 pb-3",
            "data-layout-slot": "custom-connector-dialog-body",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { className: "mb-4 gap-1 pr-10", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "text-base leading-5 text-foreground", children: t("connectors.customDialog.title") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { className: "text-sm leading-5 text-muted-foreground", children: t("connectors.customDialog.subtitle") })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Tabs,
                {
                  value: mode,
                  onValueChange: handleModeChange,
                  className: "min-h-0 flex-1 overflow-hidden",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      TabsList,
                      {
                        variant: "track",
                        className: "w-60 self-start rounded-xl p-[3px] [--tabs-track-inset:3px]! [--tabs-track-radius:12px]!",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            TabsTrigger,
                            {
                              value: "form",
                              className: "flex-1 font-normal text-muted-foreground transition-colors duration-200 data-[active]:font-medium data-[active]:text-foreground",
                              "data-action-ui-id": "custom-connector-form-tab",
                              children: t("connectors.customDialog.formTab")
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            TabsTrigger,
                            {
                              value: "json",
                              className: "flex-1 font-normal text-muted-foreground transition-colors duration-200 data-[active]:font-medium data-[active]:text-foreground",
                              "data-action-ui-id": "custom-connector-json-tab",
                              children: t("connectors.customDialog.jsonTab")
                            }
                          )
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        className: "scrollbar-none min-h-0 overflow-y-auto pt-4",
                        "data-layout-slot": "custom-connector-dialog-scroll",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "form", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsxs(
                              "div",
                              {
                                className: "flex flex-col gap-4",
                                "data-layout-slot": "custom-connector-primary-fields",
                                children: [
                                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                    "div",
                                    {
                                      className: "flex min-w-0 flex-col gap-2",
                                      "data-layout-slot": "custom-connector-name-field",
                                      children: [
                                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
                                          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "custom-connector-name", className: FORM_LABEL_CLASS_NAME, children: t("connectors.customDialog.name") }),
                                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                                            "span",
                                            {
                                              id: "custom-connector-name-count",
                                              "aria-live": "polite",
                                              className: `shrink-0 text-xs tabular-nums ${nameLength > CUSTOM_MCP_NAME_MAX_LENGTH ? "text-destructive" : "text-muted-foreground"}`,
                                              "data-action-ui-id": "custom-connector-name-count",
                                              children: t("connectors.customDialog.nameCount", {
                                                current: nameLength,
                                                max: CUSTOM_MCP_NAME_MAX_LENGTH
                                              })
                                            }
                                          )
                                        ] }),
                                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                                          Input,
                                          {
                                            id: "custom-connector-name",
                                            ...getFieldValidationProps("name"),
                                            value: formState.name,
                                            onChange: (event) => setFormState((current) => ({ ...current, name: event.target.value })),
                                            placeholder: t("connectors.customDialog.namePlaceholder"),
                                            className: FORM_CONTROL_CLASS_NAME,
                                            "data-action-ui-id": "custom-connector-name"
                                          }
                                        ),
                                        renderFieldError("name"),
                                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                                          "p",
                                          {
                                            id: "custom-connector-name-hint",
                                            className: "text-xs leading-4 text-muted-foreground",
                                            children: t("connectors.customDialog.nameHint")
                                          }
                                        )
                                      ]
                                    }
                                  ),
                                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                    "div",
                                    {
                                      className: "flex min-w-0 flex-col gap-2",
                                      "data-layout-slot": "custom-connector-transport-field",
                                      children: [
                                        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "custom-connector-transport", className: FORM_LABEL_CLASS_NAME, children: t("connectors.customDialog.transport") }),
                                        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: formState.transport, onValueChange: handleTransportChange, children: [
                                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                                            SelectTrigger,
                                            {
                                              id: "custom-connector-transport",
                                              className: `${FORM_CONTROL_CLASS_NAME} w-full bg-transparent! text-sm font-normal hover:bg-transparent! data-[size=default]:h-10`,
                                              "data-action-ui-id": "custom-connector-transport",
                                              children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { children: () => MCP_TRANSPORT_LABELS[formState.transport] })
                                            }
                                          ),
                                          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { align: "start", className: "p-1", children: Object.entries(MCP_TRANSPORT_LABELS).map(([value, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                                            SelectItem,
                                            {
                                              value,
                                              className: SELECT_ITEM_CLASS_NAME,
                                              children: label
                                            },
                                            value
                                          )) })
                                        ] })
                                      ]
                                    }
                                  )
                                ]
                              }
                            ),
                            remote ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-col gap-2", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "custom-connector-url", className: FORM_LABEL_CLASS_NAME, children: t("connectors.customDialog.url") }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                Input,
                                {
                                  id: "custom-connector-url",
                                  ...getFieldValidationProps("url"),
                                  value: formState.url,
                                  onChange: (event) => setFormState((current) => ({ ...current, url: event.target.value })),
                                  placeholder: t("connectors.customDialog.urlPlaceholder"),
                                  className: FORM_CONTROL_CLASS_NAME,
                                  "data-action-ui-id": "custom-connector-url"
                                }
                              ),
                              renderFieldError("url")
                            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-col gap-2", children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "custom-connector-command", className: FORM_LABEL_CLASS_NAME, children: t("connectors.customDialog.command") }),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  Input,
                                  {
                                    id: "custom-connector-command",
                                    ...getFieldValidationProps("command"),
                                    value: formState.command,
                                    onChange: (event) => {
                                      setCommandWasSplit(false);
                                      setFormState((current) => ({
                                        ...current,
                                        command: event.target.value
                                      }));
                                    },
                                    onBlur: handleCommandBlur,
                                    placeholder: t("connectors.customDialog.commandPlaceholder"),
                                    className: FORM_CONTROL_CLASS_NAME,
                                    "data-action-ui-id": "custom-connector-command"
                                  }
                                ),
                                renderFieldError("command")
                              ] }),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-col gap-2", children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  Label,
                                  {
                                    htmlFor: "custom-connector-arguments",
                                    className: FORM_LABEL_CLASS_NAME,
                                    children: t("connectors.customDialog.arguments")
                                  }
                                ),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  Input,
                                  {
                                    id: "custom-connector-arguments",
                                    ...getFieldValidationProps("arguments"),
                                    value: formState.argumentsText,
                                    onChange: (event) => setFormState((current) => ({
                                      ...current,
                                      argumentsText: event.target.value
                                    })),
                                    placeholder: t("connectors.customDialog.argumentsPlaceholder"),
                                    className: FORM_CONTROL_CLASS_NAME,
                                    "data-action-ui-id": "custom-connector-arguments"
                                  }
                                ),
                                renderFieldError("arguments")
                              ] }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "p",
                                {
                                  id: "custom-connector-command-hint",
                                  className: `${HELPER_TEXT_CLASS_NAME} sm:col-span-2`,
                                  "aria-live": "polite",
                                  children: t(
                                    commandWasSplit ? "connectors.customDialog.commandSplitHint" : "connectors.customDialog.commandHint"
                                  )
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: `${HELPER_TEXT_CLASS_NAME} sm:col-span-2`, children: t("connectors.customDialog.stdioRisk") })
                            ] }),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-col gap-2", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "custom-connector-description", className: FORM_LABEL_CLASS_NAME, children: t("connectors.customDialog.description") }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                Input,
                                {
                                  id: "custom-connector-description",
                                  ...getFieldValidationProps("description"),
                                  value: formState.description,
                                  onChange: (event) => setFormState((current) => ({
                                    ...current,
                                    description: event.target.value
                                  })),
                                  placeholder: t("connectors.customDialog.descriptionPlaceholder"),
                                  className: FORM_CONTROL_CLASS_NAME,
                                  "data-action-ui-id": "custom-connector-description"
                                }
                              ),
                              renderFieldError("description")
                            ] }),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs(
                              "div",
                              {
                                className: "flex min-h-16 items-center justify-between gap-4 rounded-lg bg-secondary/60 px-4 py-3",
                                "data-layout-slot": "custom-connector-enabled-surface",
                                children: [
                                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-foreground", children: t("connectors.customDialog.enabled") }),
                                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: `mt-0.5 ${HELPER_TEXT_CLASS_NAME}`, children: t("connectors.customDialog.enabledHint") })
                                  ] }),
                                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                                    Switch,
                                    {
                                      checked: formState.enabled,
                                      onCheckedChange: (enabled) => setFormState((current) => ({ ...current, enabled })),
                                      "aria-label": t("connectors.customDialog.enabled"),
                                      "data-action-ui-id": "custom-connector-enabled"
                                    }
                                  )
                                ]
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs(
                              "button",
                              {
                                type: "button",
                                "aria-expanded": advancedOpen,
                                onClick: () => setAdvancedOpen((current) => !current),
                                className: "flex h-9 w-full items-center justify-between rounded-md text-left text-sm font-medium text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
                                "data-action-ui-id": "custom-connector-advanced",
                                children: [
                                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("connectors.customDialog.advanced") }),
                                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                                    Icon,
                                    {
                                      icon: ChevronDown,
                                      size: "md",
                                      "aria-hidden": true,
                                      className: `text-muted-foreground transition-transform ${advancedOpen ? "rotate-180" : ""}`
                                    }
                                  )
                                ]
                              }
                            ),
                            advancedOpen ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-col gap-2 sm:col-span-2", children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  Label,
                                  {
                                    htmlFor: "custom-connector-key-values",
                                    className: FORM_LABEL_CLASS_NAME,
                                    children: t(
                                      remote ? "connectors.customDialog.headers" : "connectors.customDialog.environment"
                                    )
                                  }
                                ),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  Textarea,
                                  {
                                    id: "custom-connector-key-values",
                                    ...getFieldValidationProps("key-values"),
                                    value: formState.keyValuesText,
                                    onChange: (event) => setFormState((current) => ({
                                      ...current,
                                      keyValuesText: event.target.value
                                    })),
                                    placeholder: t("connectors.customDialog.keyValuesPlaceholder"),
                                    className: `min-h-24 font-mono text-xs ${FORM_OUTLINE_CLASS_NAME}`,
                                    "data-action-ui-id": "custom-connector-key-values"
                                  }
                                ),
                                renderFieldError("key-values")
                              ] }),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-col gap-2", children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "custom-connector-timeout", className: FORM_LABEL_CLASS_NAME, children: t("connectors.customDialog.timeout") }),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  Input,
                                  {
                                    id: "custom-connector-timeout",
                                    ...getFieldValidationProps("timeout"),
                                    type: "number",
                                    min: 1,
                                    value: formState.timeoutText,
                                    onChange: (event) => setFormState((current) => ({
                                      ...current,
                                      timeoutText: event.target.value
                                    })),
                                    placeholder: t("connectors.customDialog.timeoutPlaceholder"),
                                    className: FORM_CONTROL_CLASS_NAME,
                                    "data-action-ui-id": "custom-connector-timeout"
                                  }
                                ),
                                renderFieldError("timeout")
                              ] })
                            ] }) : null
                          ] }) }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "json", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: HELPER_TEXT_CLASS_NAME, children: t("connectors.customDialog.jsonHint") }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Textarea,
                              {
                                id: "custom-connector-json",
                                ...getFieldValidationProps("json"),
                                value: jsonText,
                                onChange: (event) => setJsonText(event.target.value),
                                "aria-label": t("connectors.customDialog.jsonEditorLabel"),
                                spellCheck: false,
                                className: `min-h-80 resize-none font-mono text-xs leading-relaxed ${FORM_OUTLINE_CLASS_NAME}`,
                                "data-action-ui-id": "custom-connector-json-editor"
                              }
                            ),
                            renderFieldError("json")
                          ] }) })
                        ]
                      }
                    )
                  ]
                }
              )
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "shrink-0 flex-row items-center justify-end gap-2 px-6 pb-5", children: [
          submitError || validationError && !validationError.field ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mr-auto text-xs text-destructive", role: "alert", children: submitError ?? (validationError && t(validationError.messageKey)) }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              variant: "secondary",
              className: "h-9 min-w-22 rounded-[10px] px-4",
              disabled: submitting,
              onClick: () => handleOpenChange(false),
              "data-action-ui-id": "custom-connector-cancel",
              children: t("common.cancel")
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              className: "h-9 min-w-26 rounded-[10px] px-4",
              disabled: submitting,
              loading: submitting,
              onClick: handleSubmit,
              "data-action-ui-id": "custom-connector-submit",
              children: t("connectors.customDialog.add")
            }
          )
        ] })
      ]
    }
  );
}
const FASTMOSS_KEY_MAX_LENGTH = 2048;
const FASTMOSS_TIMEOUT_MS = 3e4;
function isValidFastMossKey(value) {
  const key = value.trim();
  return key.length > 0 && key.length <= FASTMOSS_KEY_MAX_LENGTH && !/\s/u.test(key) && !key.includes("://");
}
function buildFastMossConnector(apiKey, description) {
  if (!isValidFastMossKey(apiKey)) throw new Error("Invalid FastMoss API key");
  const url = new URL(FASTMOSS_MCP_ENDPOINT);
  url.searchParams.set("api_key", apiKey.trim());
  return {
    name: FASTMOSS_SERVER_NAME,
    enabled: true,
    config: {
      transport: "streamable-http",
      url: url.href,
      timeoutMs: FASTMOSS_TIMEOUT_MS,
      description
    }
  };
}
const connector = {
  id: "fastmoss",
  iconUrl: OFFICIAL_CONNECTORS.fastmoss.iconUrl,
  keyPageUrl: FASTMOSS_API_KEYS_URL,
  maxKeyLength: FASTMOSS_KEY_MAX_LENGTH,
  isValidKey: isValidFastMossKey,
  buildInput: buildFastMossConnector
};
function FastMossConnectorDialog(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ApiKeyConnectorDialog, { ...props, connector });
}
function ConnectorInstallLocation({
  connectorId,
  disabled,
  embedded = false,
  headerAction,
  onChange
}) {
  const { t } = useTranslation();
  const platform = usePlatform();
  const [locationRequest, setLocationRequest] = reactExports.useState({});
  const [result, setResult] = reactExports.useState();
  const [selected, setSelected] = reactExports.useState("");
  const [detecting, setDetecting] = reactExports.useState(true);
  const [picking, setPicking] = reactExports.useState(false);
  const [pickFailed, setPickFailed] = reactExports.useState(false);
  reactExports.useEffect(() => {
    let cancelled = false;
    setDetecting(true);
    setPickFailed(false);
    onChange(void 0, false);
    void homeService.connector.getInstallTargets(connectorId, locationRequest.directory).then((next) => {
      if (cancelled) return;
      setResult(next);
      if (!next.ok) {
        setSelected("");
        return;
      }
      const value = next.preferredAddonDirectory ?? (next.targets.length === 1 ? next.targets[0].addonDirectory : "");
      setSelected(value);
      onChange(
        { hostDirectory: next.hostDirectory, addonDirectory: value || void 0 },
        Boolean(value)
      );
    }).catch(() => {
      if (!cancelled) {
        setResult({ ok: false, code: "invalid_host_directory" });
        setSelected("");
      }
    }).finally(() => {
      if (!cancelled) setDetecting(false);
    });
    return () => {
      cancelled = true;
    };
  }, [connectorId, locationRequest, onChange]);
  const handleSelect = (value) => {
    if (!value) return;
    setSelected(value);
    if (result?.ok) onChange({ hostDirectory: result.hostDirectory, addonDirectory: value }, true);
  };
  const handleBrowse = async () => {
    setPicking(true);
    setPickFailed(false);
    onChange(void 0, false);
    try {
      const paths = await platform.fs.showOpenDialog?.({
        directory: true,
        title: t(
          connectorId === "blender" ? "connectors.blender.location.choose" : "connectors.location.choose"
        )
      });
      if (paths?.[0]) {
        setLocationRequest({ directory: paths[0] });
      } else if (result?.ok) {
        onChange(
          { hostDirectory: result.hostDirectory, addonDirectory: selected || void 0 },
          Boolean(selected)
        );
      }
    } catch {
      setPickFailed(true);
      if (result?.ok)
        onChange(
          { hostDirectory: result.hostDirectory, addonDirectory: selected || void 0 },
          Boolean(selected)
        );
    } finally {
      setPicking(false);
    }
  };
  const titleKey = connectorId === "blender" ? "connectors.blender.location.title" : "connectors.location.title";
  const detectingKey = connectorId === "blender" ? "connectors.blender.location.detecting" : "connectors.location.detecting";
  const versionKey = connectorId === "blender" ? "connectors.blender.location.version" : "connectors.location.version";
  const chooseKey = connectorId === "blender" ? "connectors.blender.location.choose" : "connectors.location.choose";
  const autoKey = connectorId === "blender" ? "connectors.blender.location.auto" : "connectors.location.auto";
  const hintKey = connectorId === "blender" ? "connectors.blender.location.hint" : connectorId === "houdini" ? "connectors.location.houdiniHint" : "connectors.location.appHint";
  const automaticDetectionMissed = result != null && !result.ok && (detecting || locationRequest.directory == null);
  const content = /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex h-9 w-full items-center gap-0.5 rounded-lg border border-input bg-background p-0.5",
        "data-layout-slot": "connector-setup-actions",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              type: "button",
              size: "lg",
              variant: "ghost",
              className: "h-full min-w-0 flex-1 justify-start rounded-md border-0 font-normal",
              disabled: disabled || detecting || picking || !result || !platform.fs?.showOpenDialog,
              onClick: () => void handleBrowse(),
              "data-action-ui-id": `connector-${connectorId}-location-browse`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(LocalFolderIcon, {}),
                t(chooseKey)
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": true, className: "h-5 w-px shrink-0 bg-border-soft" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              size: "lg",
              variant: "ghost",
              className: "h-full shrink-0 rounded-md border-0 font-normal",
              disabled: disabled || detecting || picking || !result,
              onClick: () => setLocationRequest({ directory: null }),
              "data-action-ui-id": `connector-${connectorId}-location-auto`,
              children: t(autoKey)
            }
          )
        ]
      }
    ),
    !result ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-3 flex items-center gap-1.5 text-[13px] text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3.5 shrink-0 animate-spin", strokeWidth: 1.5, "aria-hidden": true }),
      t(detectingKey)
    ] }) : null,
    result?.ok && result.targets.length > 1 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Select,
      {
        value: selected || null,
        onValueChange: handleSelect,
        disabled: disabled || detecting || picking,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            SelectTrigger,
            {
              className: "mt-3 w-full bg-background",
              "aria-label": t(versionKey),
              "data-action-ui-id": `connector-${connectorId}-location-version`,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { children: selected ? result.targets.find((target) => target.addonDirectory === selected)?.version ?? selected : t(versionKey) })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: result.targets.map((target) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: target.addonDirectory, children: target.version ?? target.addonDirectory }, target.addonDirectory)) })
        ]
      }
    ) : null,
    selected ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "p",
      {
        className: "mt-3 break-all rounded-md bg-secondary px-2.5 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground",
        "data-action-ui-id": `connector-${connectorId}-location-path`,
        children: selected
      }
    ) : null,
    result && !result.ok ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        role: automaticDetectionMissed ? "status" : "alert",
        className: cn(
          "mt-3 flex min-h-7 items-start gap-1.5 rounded-md px-2.5 py-1 text-xs leading-5",
          automaticDetectionMissed ? "bg-secondary text-foreground/70" : "bg-destructive/5 text-destructive"
        ),
        "data-notice-tone": automaticDetectionMissed ? "neutral" : "error",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "mt-0.5 size-3.5 shrink-0", strokeWidth: 1.5, "aria-hidden": true }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: automaticDetectionMissed ? t("connectors.location.notDetected", {
            name: t(`connectors.catalog.${connectorId}.title`)
          }) : t(`connectors.connector.error.${result.code}`, {
            name: t(`connectors.catalog.${connectorId}.title`)
          }) })
        ]
      }
    ) : null,
    result && (!result.ok || Boolean(locationRequest.directory)) ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-[13px] leading-relaxed text-muted-foreground", children: t(hintKey) }) : null,
    pickFailed ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        role: "alert",
        className: "mt-3 flex min-h-7 items-start gap-1.5 rounded-md bg-destructive/5 px-2.5 py-1 text-xs leading-5 text-destructive",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "mt-0.5 size-3.5 shrink-0", strokeWidth: 1.5, "aria-hidden": true }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: t("connectors.customDialog.error.requestFailed") })
        ]
      }
    ) : null
  ] });
  if (embedded) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "min-w-0",
        "data-action-ui-id": `connector-${connectorId}-location`,
        "data-layout-slot": "connector-install-location",
        children: content
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ConnectorSetupSection,
    {
      title: t(titleKey),
      headerAction,
      actionUiId: `connector-${connectorId}-location`,
      children: content
    }
  );
}
const PROBE_INTERVAL_MS = 3e3;
const connectorStepLineClassName = "absolute left-1/2 w-[1px] -translate-x-1/2 bg-[repeating-linear-gradient(to_bottom,var(--muted-foreground)_0,var(--muted-foreground)_1px,transparent_1px,transparent_3px)]";
function LocalConnectorPreparationStatus({
  state,
  connectorName,
  hasLocation,
  onRetry
}) {
  const { t } = useTranslation();
  if (state === "skipped") return null;
  const labelKey = state === "missing" ? hasLocation ? "connectors.connector.prepare.missingWithLocation" : "connectors.connector.prepare.missing" : `connectors.connector.prepare.${state}`;
  const icon = state === "checking" ? LoaderCircle : state === "available" ? Check : CircleAlert;
  const isUnsupported = state === "unsupported";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      role: isUnsupported ? "alert" : "status",
      className: cn(
        "mt-2 flex min-h-7 items-start justify-between gap-2 rounded-md bg-secondary px-2.5 py-1 text-xs leading-5 text-foreground/70",
        isUnsupported && "text-destructive"
      ),
      "data-action-ui-id": "connector-local-preparation-status",
      "data-preparation-state": state,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-start gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Icon,
            {
              icon,
              size: "sm",
              strokeWidth: 1.5,
              className: cn("mt-0.5 shrink-0", state === "checking" && "animate-spin"),
              "aria-hidden": true
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t(labelKey, { name: connectorName }) })
        ] }),
        state === "error" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            variant: "ghost",
            size: "xs",
            className: "-my-1 shrink-0 font-normal",
            onClick: onRetry,
            "data-action-ui-id": "connector-local-preparation-retry",
            children: t("connectors.connector.prepare.retry")
          }
        ) : null
      ]
    }
  );
}
function LocalConnectorStep({
  ordinal,
  title,
  first = false,
  last = false,
  completed = false,
  action,
  children
}) {
  const { t } = useTranslation();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: "grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2",
      "data-layout-slot": "connector-local-step",
      "data-step": ordinal,
      "data-step-state": completed ? "complete" : "active",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex justify-center pt-4", children: [
          !first ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              "aria-hidden": true,
              className: cn(connectorStepLineClassName, "top-0 h-4"),
              "data-layout-slot": "connector-local-step-line"
            }
          ) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              "aria-hidden": true,
              className: "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-xs font-medium leading-none text-foreground",
              "data-layout-slot": "connector-local-step-node",
              children: t(`connectors.stepOrdinal.${ordinal}`)
            }
          ),
          !last ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              "aria-hidden": true,
              className: cn(connectorStepLineClassName, "top-10 bottom-0"),
              "data-layout-slot": "connector-local-step-line"
            }
          ) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("min-w-0 py-4", completed && !children && "py-3.5"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center justify-between gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "min-w-0 text-sm font-medium text-foreground", children: title }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [
              completed ? /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: Check, size: "sm", className: "text-muted-foreground", "aria-hidden": true }) : null,
              action
            ] })
          ] }),
          children ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 min-w-0", "data-layout-slot": "connector-local-step-content", children }) : null
        ] })
      ]
    }
  );
}
function LocalConnectorSetupContent({
  connectorId,
  serverName,
  iconUrl,
  onClose,
  onInstalled,
  setupUrl
}) {
  const { t } = useTranslation();
  const targetName = serverName ?? connectorId;
  const platform = usePlatform();
  const hasLocation = ["blender", "after-effects", "photoshop", "houdini"].includes(connectorId);
  const [status, setStatus] = reactExports.useState();
  const [installing, setInstalling] = reactExports.useState(false);
  const [preparationState, setPreparationState] = reactExports.useState("checking");
  const [installError, setInstallError] = reactExports.useState();
  const [openingSetup, setOpeningSetup] = reactExports.useState(false);
  const [setupError, setSetupError] = reactExports.useState(false);
  const [installOptions, setInstallOptions] = reactExports.useState();
  const [locationReady, setLocationReady] = reactExports.useState(!hasLocation);
  const handleLocationChange = reactExports.useCallback(
    (options, ready) => {
      setInstallOptions(options);
      setLocationReady(ready);
      setInstallError(void 0);
    },
    []
  );
  const closed = reactExports.useRef(false);
  const refresh = reactExports.useCallback(async () => {
    try {
      const next = await homeService.connector.status(targetName);
      if (!closed.current) setStatus(next);
      return next;
    } catch {
      return void 0;
    }
  }, [targetName]);
  const checkPreparation = reactExports.useCallback(async () => {
    setPreparationState("checking");
    try {
      const result = await homeService.connector.preflight(targetName);
      if (closed.current) return;
      setStatus(result.status);
      if (!result.platformSupported) {
        setPreparationState("unsupported");
        return;
      }
      if (result.hostAppState === "not_required") {
        setPreparationState("skipped");
        return;
      }
      setPreparationState(
        result.hostAppState === "available" ? "available" : result.hostAppState === "missing" ? "missing" : "unknown"
      );
    } catch {
      await refresh();
      if (!closed.current) setPreparationState("error");
    }
  }, [refresh, targetName]);
  reactExports.useEffect(() => {
    closed.current = false;
    void checkPreparation();
    const timer = setInterval(() => void refresh(), PROBE_INTERVAL_MS);
    return () => {
      closed.current = true;
      clearInterval(timer);
    };
  }, [checkPreparation, refresh]);
  reactExports.useEffect(() => {
    if (status?.state !== "connected") return;
    onClose();
  }, [onClose, status?.state]);
  const installInProgress = installing || status?.state === "installing";
  const handleInstall = async () => {
    if (installInProgress || preparationState === "unsupported" || hasLocation && !locationReady)
      return;
    setInstalling(true);
    setInstallError(void 0);
    try {
      const result = hasLocation ? await homeService.connector.install(targetName, installOptions) : await homeService.connector.install(targetName);
      if (result.ok) onInstalled();
      if (closed.current) return;
      if (result.ok) {
        setStatus(result.status);
        dedupedToast.success(
          t(
            result.status.state === "connected" ? "connectors.connector.installedConnected" : "connectors.connector.installedWaiting"
          )
        );
      } else {
        const reason = t(`connectors.connector.error.${result.code}`, {
          name: t(`connectors.catalog.${connectorId}.title`)
        });
        setInstallError(result.message ? `${reason}: ${result.message.trim()}` : reason);
      }
    } catch {
      if (!closed.current) setInstallError(t("connectors.customDialog.error.requestFailed"));
    } finally {
      if (!closed.current) setInstalling(false);
    }
  };
  const handleOpenSetup = async () => {
    if (!setupUrl || openingSetup) return;
    setOpeningSetup(true);
    setSetupError(false);
    const opened = await openExternalUrl(platform, setupUrl, {
      source: `connectors.${connectorId}.downloadComponents`
    });
    if (!closed.current) {
      setOpeningSetup(false);
      setSetupError(!opened);
    }
  };
  const state = installInProgress ? "installing" : status?.state ?? "not_installed";
  const connected = state === "connected";
  const waitingForHostApp = state === "waiting_host_app";
  const connectorName = t(`connectors.catalog.${connectorId}.title`);
  const installStepTitle = t(
    hasLocation ? connectorId === "blender" ? "connectors.connector.step.installWithAddonLocation" : "connectors.connector.step.installWithAppLocation" : "connectors.connector.step.install"
  );
  const prepareSecondaryKey = hasLocation ? "connectors.connector.prepare.locationCaveat" : connectorId === "touchdesigner" ? "connectors.connector.prepare.componentPackage" : "connectors.connector.prepare.inAppActivation";
  const blenderInstallerUrl = platform.app?.os === "win32" ? CDN_BLENDER_INSTALLER_WINDOWS_X64 : platform.app?.os === "darwin" && (platform.app.arch === "arm64" || platform.app.runningUnderARM64Translation === true) ? CDN_BLENDER_INSTALLER_MACOS_ARM64 : void 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { className: "shrink-0 items-center px-4 pt-8 text-center sm:px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectorRelationshipGraphic, { targetIconUrl: iconUrl }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectorDialogScrollableBody, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 pb-5 sm:px-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { className: "mt-4 items-center gap-2 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "font-heading text-lg font-medium text-foreground", children: t("connectors.connector.setupTitle", { name: connectorName }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "flex items-center justify-center gap-1.5",
            "data-layout-slot": "connector-local-title-status",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-action-ui-id": `connector-${connectorId}-state`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                IntegrationStatusPill,
                {
                  label: t(`connectors.connector.state.${state}`),
                  tone: connected ? "neutral" : state === "waiting_host_app" ? "warning" : "muted",
                  markerTone: connected ? "success" : state === "waiting_host_app" || state === "installing" ? "warning" : "muted",
                  markerActive: state === "installing",
                  markerLabel: t(`connectors.connector.state.${state}`)
                }
              ) }),
              status?.updateAvailable ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                Badge,
                {
                  variant: "info",
                  "data-action-ui-id": `connector-${connectorId}-update-available`,
                  children: t("connectors.connector.updateAvailable")
                }
              ) : null
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "mt-4 rounded-[10px] bg-secondary/60 px-3 pb-3",
          "data-layout-slot": "connector-local-steps-surface",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              DialogDescription,
              {
                className: "px-3 pt-3 text-xs leading-relaxed font-medium text-muted-foreground",
                "data-layout-slot": "connector-local-steps-eyebrow",
                children: t("connectors.connector.setupDescription")
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full", "data-layout-slot": "connector-local-steps", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                LocalConnectorStep,
                {
                  ordinal: 1,
                  title: t("connectors.connector.step.prepare", { name: connectorName }),
                  first: true,
                  completed: waitingForHostApp || installInProgress,
                  last: false,
                  children: !waitingForHostApp && !installInProgress ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "space-y-1",
                      "data-action-ui-id": `connector-${connectorId}-install-hint`,
                      "data-content-structure": "primary-secondary",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[13px] leading-relaxed text-muted-foreground", children: t("connectors.connector.prepare.primary", { name: connectorName }) }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[13px] leading-relaxed text-muted-foreground", children: t(prepareSecondaryKey, { name: connectorName }) }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          LocalConnectorPreparationStatus,
                          {
                            state: preparationState,
                            connectorName,
                            hasLocation,
                            onRetry: () => void checkPreparation()
                          }
                        ),
                        connectorId === "blender" && blenderInstallerUrl ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          Button,
                          {
                            type: "button",
                            variant: "ghost",
                            size: "xs",
                            className: "mt-2 -ml-2 font-normal text-foreground underline underline-offset-2",
                            onClick: () => {
                              void openExternalUrl(platform, blenderInstallerUrl, {
                                source: "connector-blender-download"
                              });
                            },
                            "data-action-ui-id": "connector-blender-download",
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: Download, size: "xs", "aria-hidden": true }),
                              t("connectors.connector.downloadHostApp.blender")
                            ]
                          }
                        ) : null
                      ]
                    }
                  ) : null
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                LocalConnectorStep,
                {
                  ordinal: 2,
                  title: installStepTitle,
                  completed: waitingForHostApp,
                  last: !waitingForHostApp,
                  action: waitingForHostApp ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                    ConnectorSummaryAction,
                    {
                      mode: "reinstall",
                      label: t(connectorSummaryActionLabelKey.reinstall),
                      disabled: installing || hasLocation && !locationReady,
                      loading: installing,
                      onClick: () => void handleInstall(),
                      "data-action-ui-id": `connector-${connectorId}-reinstall`
                    }
                  ) : void 0,
                  children: [
                    hasLocation ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { hidden: waitingForHostApp && locationReady && !installError, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      ConnectorInstallLocation,
                      {
                        connectorId,
                        disabled: installInProgress || preparationState === "unsupported",
                        embedded: true,
                        onChange: handleLocationChange
                      }
                    ) }) : null,
                    !waitingForHostApp ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("flex justify-center", hasLocation && "mt-4"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      ConnectorSummaryAction,
                      {
                        mode: "install",
                        label: t(connectorSummaryActionLabelKey.install),
                        disabled: installInProgress || preparationState === "unsupported" || !status || hasLocation && !locationReady,
                        loading: installInProgress,
                        onClick: () => void handleInstall(),
                        "data-action-ui-id": `connector-${connectorId}-install`
                      }
                    ) }) : null,
                    installError ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      ConnectorDetailNotice,
                      {
                        description: installError,
                        tone: "error",
                        actionUiId: `connector-${connectorId}-install-error`
                      }
                    ) }) : null
                  ]
                }
              ),
              waitingForHostApp ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                LocalConnectorStep,
                {
                  ordinal: 3,
                  title: t("connectors.connector.step.activate", { name: connectorName }),
                  last: true,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      ConnectorDetailNotice,
                      {
                        description: t("connectors.connector.waitingHint.withSkill", {
                          name: connectorName
                        }),
                        tone: "warning",
                        actionUiId: `connector-${connectorId}-waiting-hint`
                      }
                    ),
                    setupUrl ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      Button,
                      {
                        variant: "outline",
                        size: "sm",
                        disabled: openingSetup,
                        loading: openingSetup,
                        onClick: () => void handleOpenSetup(),
                        className: "mt-3 gap-1.5",
                        "data-action-ui-id": `connector-${connectorId}-download-components`,
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: ExternalLink, size: "sm", "aria-hidden": true }),
                          t("connectors.connector.downloadComponents")
                        ]
                      }
                    ) : null,
                    setupError ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                      ConnectorDetailNotice,
                      {
                        description: t("connectors.connector.downloadComponentsError"),
                        tone: "error"
                      }
                    ) : null
                  ]
                }
              ) : null
            ] })
          ]
        }
      )
    ] }) })
  ] });
}
function LocalConnectorDialog(props) {
  const { t } = useTranslation();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ConnectorDialogFrame,
    {
      open: true,
      onOpenChange: (open) => !open && props.onClose(),
      actionUiId: `connector-${props.connectorId}-setup-dialog`,
      closeActionUiId: `connector-${props.connectorId}-close`,
      closeLabel: t("common.close"),
      size: "md",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(LocalConnectorSetupContent, { ...props })
    }
  );
}
function LocalConnectorIntroContent({
  connectorId,
  serverName,
  iconUrl,
  onConfigure,
  onInstalled,
  onTry,
  savedServer,
  onUpdated,
  onRemoved
}) {
  const { t } = useTranslation();
  const targetName = serverName ?? connectorId;
  const [connectorStatus, setConnectorStatus] = reactExports.useState();
  const [updating, setUpdating] = reactExports.useState(false);
  const [updateError, setUpdateError] = reactExports.useState();
  const statusEpoch = reactExports.useRef(0);
  const updateAvailable = connectorStatus?.updateAvailable === true;
  reactExports.useEffect(() => {
    let cancelled = false;
    const epoch = statusEpoch.current;
    void homeService.connector.status(targetName).then((next) => {
      if (!cancelled && statusEpoch.current === epoch) setConnectorStatus(next);
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [targetName]);
  const handleUpdate = async () => {
    if (updating) return;
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
      if (result.code === "host_app_selection_required" || result.code === "invalid_host_directory") {
        onConfigure();
        return;
      }
      const reason = t(`connectors.connector.error.${result.code}`, {
        name: t(`connectors.catalog.${connectorId}.title`)
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
  const connected = displayState === "connected";
  const needsAttention = displayState === "failed";
  const suggestionsDisabled = needsAttention || savedServer?.enabled === false;
  const connectorName = t(`connectors.catalog.${connectorId}.title`);
  const promptActionMode = needsAttention ? "requiresRecovery" : savedServer?.enabled === false ? "requiresEnable" : connected ? "ready" : "requiresConnection";
  const promptKeys = [0, 1, 2].map((index) => `connectors.detail.${connectorId}.prompt.${index}`);
  const handlePromptClick = (prompt) => {
    if (connected) {
      onTry(prompt);
      return;
    }
    onConfigure();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { className: "shrink-0 items-center px-4 pt-8 text-center sm:px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectorRelationshipGraphic, { targetIconUrl: iconUrl }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(ConnectorDialogScrollableBody, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center px-4 sm:px-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConnectorDialogSummary,
          {
            title: connectorName,
            description: t(`connectors.detail.${connectorId}.description`),
            status: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "span",
              {
                className: "inline-flex items-center gap-1.5",
                "data-action-ui-id": `connector-${connectorId}-detail-state`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectorStatusPill, { state: displayState ?? "notConnected" }),
                  updateAvailable ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Badge,
                    {
                      variant: "info",
                      "data-action-ui-id": `connector-${connectorId}-update-available`,
                      children: t("connectors.connector.updateAvailable")
                    }
                  ) : null
                ]
              }
            ),
            actions: !hasSavedConnection ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              ConnectorSummaryAction,
              {
                mode: "connect",
                label: t(connectorSummaryActionLabelKey.connect),
                onClick: onConfigure,
                "data-action-ui-id": `connector-${connectorId}-detail-configure`
              }
            ) : savedServer ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              connected ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                ConnectorSummaryAction,
                {
                  mode: "try",
                  label: t(connectorSummaryActionLabelKey.try),
                  onClick: () => onTry(),
                  "data-action-ui-id": `connector-${connectorId}-detail-try`
                }
              ) : null,
              updateAvailable ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                ConnectorSummaryAction,
                {
                  mode: "update",
                  label: t(connectorSummaryActionLabelKey.update),
                  loading: updating,
                  disabled: updating,
                  onClick: () => void handleUpdate(),
                  "data-action-ui-id": `connector-${connectorId}-detail-update`
                }
              ) : null,
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                ConnectorManagementActions,
                {
                  connector: savedServer,
                  actionIdPrefix: `connector-${connectorId}-detail`,
                  onUpdated,
                  onRemoved
                }
              )
            ] }) : null
          }
        ),
        updateError ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConnectorDetailNotice,
          {
            description: updateError,
            tone: "error",
            actionUiId: `connector-${connectorId}-update-error`
          }
        ) }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        ConnectorPromptList,
        {
          title: t("connectors.detail.trySection"),
          description: t("connectors.detail.tryDescription"),
          actionUiId: `connector-${connectorId}-detail-prompts-scroll`,
          items: promptKeys.map((key) => {
            const text = t(key);
            return {
              key,
              title: t(key.replace(".prompt.", ".promptTitle.")),
              description: text,
              muted: !connected,
              action: /* @__PURE__ */ jsxRuntimeExports.jsx(
                ConnectorPromptAction,
                {
                  mode: promptActionMode,
                  label: t(connectorPromptActionLabelKey[promptActionMode]),
                  disabled: suggestionsDisabled,
                  onClick: () => handlePromptClick(text),
                  "data-action-ui-id": `connector-${connectorId}-detail-prompt`
                }
              )
            };
          })
        }
      )
    ] })
  ] });
}
function LocalConnectorDetailDialog({
  connectorId,
  serverName,
  iconUrl,
  onClose,
  onInstalled,
  onTry,
  setupUrl,
  savedServer,
  onUpdated,
  onRemoved
}) {
  const { t } = useTranslation();
  const [mode, setMode] = reactExports.useState("detail");
  const showingSetup = mode === "setup";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ConnectorDialogFrame,
    {
      open: true,
      onOpenChange: (open) => !open && onClose(),
      actionUiId: `connector-${connectorId}-${showingSetup ? "setup" : "detail"}-dialog`,
      closeActionUiId: `connector-${connectorId}-${showingSetup ? "" : "detail-"}close`,
      closeLabel: t("common.close"),
      size: "md",
      stableHeight: !showingSetup,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "flex min-h-0 flex-1 flex-col",
          "data-layout-slot": "connector-dialog-view",
          "data-view": mode,
          children: showingSetup ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            LocalConnectorSetupContent,
            {
              connectorId,
              serverName,
              iconUrl,
              setupUrl,
              onClose,
              onInstalled
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
            LocalConnectorIntroContent,
            {
              connectorId,
              serverName,
              iconUrl,
              onConfigure: () => setMode("setup"),
              onInstalled,
              onTry,
              savedServer,
              onUpdated,
              onRemoved
            }
          )
        },
        mode
      )
    }
  );
}
const CONNECTOR_SORT_MODES = ["default", "connected-first"];
function isLocalConnector(connector2) {
  return connector2.entry.type === "local-app";
}
function isWebApiConnector(connector2) {
  return connector2.entry.type === "web-api";
}
const CONNECTOR_CATALOG = [
  {
    id: "blender",
    entry: { type: "local-app", connectorId: "blender" },
    titleKey: "connectors.catalog.blender.title",
    descriptionKey: "connectors.catalog.blender.description",
    icon: Box,
    matches: OFFICIAL_CONNECTORS.blender.matches,
    detail: {
      iconUrl: OFFICIAL_CONNECTORS.blender.iconUrl,
      descriptionKey: "connectors.detail.blender.description",
      examplePrompts: [
        { key: "connectors.detail.blender.prompt.0" },
        { key: "connectors.detail.blender.prompt.1" },
        { key: "connectors.detail.blender.prompt.2" }
      ]
    }
  },
  {
    id: "photoshop",
    entry: { type: "local-app", connectorId: "photoshop" },
    titleKey: "connectors.catalog.photoshop.title",
    descriptionKey: "connectors.catalog.photoshop.description",
    icon: Box,
    matches: OFFICIAL_CONNECTORS.photoshop.matches,
    detail: {
      iconUrl: OFFICIAL_CONNECTORS.photoshop.iconUrl,
      descriptionKey: "connectors.detail.photoshop.description",
      examplePrompts: [
        { key: "connectors.detail.photoshop.prompt.0" },
        { key: "connectors.detail.photoshop.prompt.1" },
        { key: "connectors.detail.photoshop.prompt.2" }
      ]
    }
  },
  {
    id: "after-effects",
    entry: { type: "local-app", connectorId: "after-effects" },
    titleKey: "connectors.catalog.after-effects.title",
    descriptionKey: "connectors.catalog.after-effects.description",
    icon: Box,
    matches: OFFICIAL_CONNECTORS["after-effects"].matches,
    detail: {
      iconUrl: OFFICIAL_CONNECTORS["after-effects"].iconUrl,
      descriptionKey: "connectors.detail.after-effects.description",
      examplePrompts: [
        { key: "connectors.detail.after-effects.prompt.0" },
        { key: "connectors.detail.after-effects.prompt.1" },
        { key: "connectors.detail.after-effects.prompt.2" }
      ]
    }
  },
  {
    id: "houdini",
    entry: { type: "local-app", connectorId: "houdini" },
    titleKey: "connectors.catalog.houdini.title",
    descriptionKey: "connectors.catalog.houdini.description",
    icon: Box,
    matches: OFFICIAL_CONNECTORS.houdini.matches,
    detail: {
      iconUrl: OFFICIAL_CONNECTORS.houdini.iconUrl,
      descriptionKey: "connectors.detail.houdini.description",
      examplePrompts: [
        { key: "connectors.detail.houdini.prompt.0" },
        { key: "connectors.detail.houdini.prompt.1" },
        { key: "connectors.detail.houdini.prompt.2" }
      ]
    }
  },
  {
    id: "touchdesigner",
    entry: { type: "local-app", connectorId: "touchdesigner" },
    titleKey: "connectors.catalog.touchdesigner.title",
    descriptionKey: "connectors.catalog.touchdesigner.description",
    icon: Box,
    matches: OFFICIAL_CONNECTORS.touchdesigner.matches,
    detail: {
      iconUrl: OFFICIAL_CONNECTORS.touchdesigner.iconUrl,
      descriptionKey: "connectors.detail.touchdesigner.description",
      setupUrl: CDN_TOUCHDESIGNER_COMPONENTS,
      examplePrompts: [
        { key: "connectors.detail.touchdesigner.prompt.0" },
        { key: "connectors.detail.touchdesigner.prompt.1" },
        { key: "connectors.detail.touchdesigner.prompt.2" }
      ]
    }
  },
  {
    id: "unity",
    entry: { type: "local-app", connectorId: "unity" },
    titleKey: "connectors.catalog.unity.title",
    descriptionKey: "connectors.catalog.unity.description",
    icon: Box,
    matches: OFFICIAL_CONNECTORS.unity.matches,
    detail: {
      iconUrl: OFFICIAL_CONNECTORS.unity.iconUrl,
      descriptionKey: "connectors.detail.unity.description",
      examplePrompts: [
        { key: "connectors.detail.unity.prompt.0" },
        { key: "connectors.detail.unity.prompt.1" },
        { key: "connectors.detail.unity.prompt.2" }
      ]
    }
  },
  {
    id: "unreal",
    entry: { type: "local-app", connectorId: "unreal" },
    titleKey: "connectors.catalog.unreal.title",
    descriptionKey: "connectors.catalog.unreal.description",
    icon: Box,
    matches: OFFICIAL_CONNECTORS.unreal.matches,
    detail: {
      iconUrl: OFFICIAL_CONNECTORS.unreal.iconUrl,
      descriptionKey: "connectors.detail.unreal.description",
      examplePrompts: [
        { key: "connectors.detail.unreal.prompt.0" },
        { key: "connectors.detail.unreal.prompt.1" },
        { key: "connectors.detail.unreal.prompt.2" }
      ]
    }
  },
  {
    id: "fastmoss",
    entry: { type: "web-api", Dialog: FastMossConnectorDialog },
    titleKey: "connectors.catalog.fastmoss.title",
    descriptionKey: "connectors.catalog.fastmoss.description",
    icon: ChartNoAxesCombined,
    matches: OFFICIAL_CONNECTORS.fastmoss.matches,
    detail: {
      iconUrl: OFFICIAL_CONNECTORS.fastmoss.iconUrl,
      descriptionKey: "connectors.detail.fastmoss.description",
      examplePrompts: [
        {
          key: "connectors.detail.fastmoss.prompt.0",
          titleKey: "connectors.detail.fastmoss.promptTitle.0"
        },
        {
          key: "connectors.detail.fastmoss.prompt.1",
          titleKey: "connectors.detail.fastmoss.promptTitle.1"
        },
        {
          key: "connectors.detail.fastmoss.prompt.2",
          titleKey: "connectors.detail.fastmoss.promptTitle.2"
        }
      ]
    }
  },
  ...Object.entries(KEY_MCP_PRESETS).map(
    ([id]) => ({
      id,
      entry: {
        type: "web-api",
        Dialog: (props) => /* @__PURE__ */ jsxRuntimeExports.jsx(MarketplaceKeyConnectorDialog, { ...props, provider: id })
      },
      titleKey: `connectors.catalog.${id}.title`,
      descriptionKey: `connectors.catalog.${id}.description`,
      icon: Globe,
      matches: OFFICIAL_CONNECTORS[id].matches,
      detail: {
        iconUrl: OFFICIAL_CONNECTORS[id].iconUrl,
        descriptionKey: `connectors.detail.${id}.description`,
        examplePrompts: [
          {
            key: `connectors.detail.${id}.prompt.0`,
            titleKey: `connectors.detail.${id}.promptTitle.0`
          },
          {
            key: `connectors.detail.${id}.prompt.1`,
            titleKey: `connectors.detail.${id}.promptTitle.1`
          },
          {
            key: `connectors.detail.${id}.prompt.2`,
            titleKey: `connectors.detail.${id}.promptTitle.2`
          }
        ]
      }
    })
  ),
  {
    id: "libtv",
    entry: { type: "web-api", Dialog: LibTvConnectorDialog },
    titleKey: "connectors.catalog.libtv.title",
    descriptionKey: "connectors.catalog.libtv.description",
    icon: Globe,
    matches: OFFICIAL_CONNECTORS.libtv.matches,
    detail: {
      iconUrl: OFFICIAL_CONNECTORS.libtv.iconUrl,
      descriptionKey: "connectors.detail.libtv.description",
      examplePrompts: [
        {
          key: "connectors.detail.libtv.prompt.0",
          titleKey: "connectors.detail.libtv.promptTitle.0"
        },
        {
          key: "connectors.detail.libtv.prompt.1",
          titleKey: "connectors.detail.libtv.promptTitle.1"
        },
        {
          key: "connectors.detail.libtv.prompt.2",
          titleKey: "connectors.detail.libtv.promptTitle.2"
        }
      ]
    }
  }
];
function ConnectorSortMenu({
  value,
  onValueChange
}) {
  const { t } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const valueLabel = t(`connectors.sort.${value}`);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(FilterMenu, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      FilterMenuTrigger,
      {
        render: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "aria-label": t("connectors.sort.ariaLabel", { mode: valueLabel }),
            className: "inline-flex h-9 min-w-40 shrink-0 cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-border bg-transparent px-3 text-xs text-foreground transition-colors hover:border-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
            "data-action-ui-id": "connectors-sort"
          }
        ),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: t("connectors.sort.label") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: valueLabel })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { "aria-hidden": "true", size: 14, strokeWidth: 1.5, className: "shrink-0" })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      FilterMenuContent,
      {
        align: "end",
        alignOffset: 0,
        sideOffset: 4,
        className: "min-w-40 gap-0 p-1",
        "data-action-ui-id": "connectors-sort-menu",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(FilterMenuGroup, { className: "gap-0", children: CONNECTOR_SORT_MODES.map((mode) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          FilterMenuItem,
          {
            selected: mode === value,
            onClick: () => {
              onValueChange(mode);
              setOpen(false);
            },
            className: "h-8 rounded-sm px-3 text-xs font-normal hover:bg-popup-item-hover focus-visible:bg-popup-item-hover",
            "data-action-ui-id": `connectors-sort-option-${mode}`,
            children: t(`connectors.sort.${mode}`)
          },
          mode
        )) })
      }
    )
  ] });
}
function ConnectorHeaderContent({
  query,
  onQueryChange,
  sortMode,
  onSortModeChange,
  onCustomConnector,
  customDisabled = false
}) {
  const { t } = useTranslation();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      CatalogPageHeading,
      {
        level: 2,
        variant: "section",
        title: t("connectors.catalogTitle"),
        description: t("connectors.catalogDescription"),
        className: "min-w-44 grow basis-auto shrink-[999] overflow-hidden [&_h2]:truncate [&_[data-slot=catalog-page-subtitle]]:truncate"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "scrollbar-none flex min-w-0 max-w-full shrink items-center gap-3 overflow-x-auto overscroll-x-contain [&>*:first-child]:ml-auto",
        "data-layout-slot": "connectors-toolbar-actions",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-60 min-w-36 max-w-60 shrink", "data-layout-slot": "connectors-search-slot", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            PageSearchInput,
            {
              value: query,
              onValueChange: onQueryChange,
              placeholder: t("connectors.searchPlaceholder"),
              clearLabel: t("common.clear"),
              inputActionId: "connectors-search",
              clearActionId: "connectors-search-clear"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectorSortMenu, { value: sortMode, onValueChange: onSortModeChange }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              type: "button",
              disabled: customDisabled,
              size: "default",
              onClick: onCustomConnector,
              className: "h-9 shrink-0 gap-1.5 whitespace-nowrap rounded-lg pl-3.5 pr-4 text-[13px] font-medium",
              "data-action-ui-id": "connectors-custom",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: Plus, size: "md", "aria-hidden": true }),
                t("connectors.custom")
              ]
            }
          )
        ]
      }
    )
  ] });
}
function ConnectorsTab({
  initialConnectorId,
  query: controlledQuery,
  onQueryChange,
  customConnectorOpen: controlledCustomConnectorOpen,
  onCustomConnectorOpenChange,
  sortMode: controlledSortMode,
  onSortModeChange,
  showHeader = true
} = {}) {
  const { t } = useTranslation();
  const [localQuery, setLocalQuery] = reactExports.useState("");
  const [localCustomConnectorOpen, setLocalCustomConnectorOpen] = reactExports.useState(false);
  const [localSortMode, setLocalSortMode] = reactExports.useState("default");
  const query = controlledQuery ?? localQuery;
  const setQuery = onQueryChange ?? setLocalQuery;
  const customConnectorOpen = controlledCustomConnectorOpen ?? localCustomConnectorOpen;
  const setCustomConnectorOpen = onCustomConnectorOpenChange ?? setLocalCustomConnectorOpen;
  const sortMode = controlledSortMode ?? localSortMode;
  const setSortMode = onSortModeChange ?? setLocalSortMode;
  const [activeConnector, setActiveConnector] = reactExports.useState(null);
  const [detailConnector, setDetailConnector] = reactExports.useState(null);
  const [localDetailConnector, setLocalDetailConnector] = reactExports.useState(null);
  const [localConnector, setLocalConnector] = reactExports.useState(null);
  const [customConnectors, setCustomConnectors] = reactExports.useState([]);
  const openedConnectorDeepLinksRef = reactExports.useRef(/* @__PURE__ */ new Set());
  const { tryConnector } = useTryConnector();
  const [loading, setLoading] = reactExports.useState(true);
  const [loadFailed, setLoadFailed] = reactExports.useState(false);
  const [hasLoaded, setHasLoaded] = reactExports.useState(false);
  const loadEpoch = reactExports.useRef(0);
  const loadConnectors = reactExports.useCallback(async () => {
    const epoch = ++loadEpoch.current;
    setLoading(true);
    try {
      const servers = await homeService.customMcp.list();
      if (epoch !== loadEpoch.current) return;
      setCustomConnectors(servers);
      setLoadFailed(false);
      setHasLoaded(true);
    } catch {
      if (epoch === loadEpoch.current) setLoadFailed(true);
    } finally {
      if (epoch === loadEpoch.current) setLoading(false);
    }
  }, []);
  const invalidateLoad = () => {
    loadEpoch.current += 1;
    setLoading(false);
  };
  reactExports.useEffect(() => {
    void loadConnectors();
    return () => {
      loadEpoch.current += 1;
    };
  }, [loadConnectors]);
  const connectors = reactExports.useMemo(
    () => (
      // A saved connection replaces its catalog entry, including while
      // disabled or failed. Only a successful removal restores the add card.
      CONNECTOR_CATALOG.filter(
        (connector2) => !connector2.hidden && !customConnectors.some(connector2.matches)
      ).map((connector2) => ({
        ...connector2,
        title: t(connector2.titleKey),
        description: t(connector2.descriptionKey)
      }))
    ),
    [t, customConnectors]
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleConnectors = reactExports.useMemo(
    () => normalizedQuery ? connectors.filter(
      (connector2) => `${connector2.title} ${connector2.description}`.toLocaleLowerCase().includes(normalizedQuery)
    ) : connectors,
    [connectors, normalizedQuery]
  );
  const savedConnectorViews = reactExports.useMemo(
    () => customConnectors.map((connector2) => {
      const catalogEntry = CONNECTOR_CATALOG.find((entry) => entry.matches(connector2));
      return {
        connector: connector2,
        catalogEntry,
        title: catalogEntry ? t(catalogEntry.titleKey) : connector2.name,
        description: catalogEntry ? t(catalogEntry.descriptionKey) : connector2.description?.trim() ?? ""
      };
    }),
    [customConnectors, t]
  );
  const visibleCustomConnectors = reactExports.useMemo(
    () => normalizedQuery ? savedConnectorViews.filter(
      ({ connector: connector2, title, description }) => `${title} ${description} ${connector2.name} ${connector2.endpoint ?? ""}`.toLocaleLowerCase().includes(normalizedQuery)
    ) : savedConnectorViews,
    [normalizedQuery, savedConnectorViews]
  );
  const visibleConnectorCards = reactExports.useMemo(() => {
    const visibleCatalogById = new Map(
      visibleConnectors.map((connector2) => [connector2.id, connector2])
    );
    const allSavedCatalogIds = new Set(
      savedConnectorViews.flatMap(({ catalogEntry }) => catalogEntry ? [catalogEntry.id] : [])
    );
    const visibleSavedByCatalogId = /* @__PURE__ */ new Map();
    for (const view of visibleCustomConnectors) {
      if (!view.catalogEntry) continue;
      const current = visibleSavedByCatalogId.get(view.catalogEntry.id) ?? [];
      current.push({ kind: "saved", ...view });
      visibleSavedByCatalogId.set(view.catalogEntry.id, current);
    }
    const orderedCards = [];
    const libTvCards = [];
    for (const catalogEntry of CONNECTOR_CATALOG) {
      const cards = catalogEntry.id === "libtv" ? libTvCards : orderedCards;
      if (allSavedCatalogIds.has(catalogEntry.id)) {
        cards.push(...visibleSavedByCatalogId.get(catalogEntry.id) ?? []);
        continue;
      }
      const connector2 = visibleCatalogById.get(catalogEntry.id);
      if (connector2) cards.push({ kind: "catalog", connector: connector2 });
    }
    orderedCards.push(
      ...visibleCustomConnectors.filter(({ catalogEntry }) => !catalogEntry).map((view) => ({ kind: "saved", ...view }))
    );
    return [...orderedCards, ...libTvCards];
  }, [savedConnectorViews, visibleConnectors, visibleCustomConnectors]);
  const sortedVisibleConnectorCards = reactExports.useMemo(() => {
    if (sortMode === "default") return visibleConnectorCards;
    const connectedCards = [];
    const remainingCards = [];
    for (const card of visibleConnectorCards) {
      const isConnected = card.kind === "saved" && toConnectorDisplayState(card.connector.runtimeState) === "connected";
      (isConnected ? connectedCards : remainingCards).push(card);
    }
    return [...connectedCards, ...remainingCards];
  }, [sortMode, visibleConnectorCards]);
  const resultCount = sortedVisibleConnectorCards.length;
  const handleCreated = (result) => {
    invalidateLoad();
    setCustomConnectors(
      (current) => [...current.filter((server) => server.name !== result.server.name), result.server].sort(
        (left, right) => left.name.localeCompare(right.name)
      )
    );
    const displayState = toConnectorDisplayState(result.runtime.state);
    const key = `connectors.customDialog.created.${displayState}`;
    if (displayState === "connected") dedupedToast.success(t(key));
    else if (displayState === "failed") dedupedToast.error(t(key));
    else dedupedToast.warning(t(key));
  };
  const handleCardClick = (connector2, savedServer) => {
    if (!connector2.detail) return;
    if (isLocalConnector(connector2))
      setLocalDetailConnector({ ...connector2, serverName: savedServer?.name });
    else setDetailConnector(connector2);
  };
  const handleQuickConnect = (connector2) => {
    setDetailConnector(null);
    setLocalDetailConnector(null);
    if (isWebApiConnector(connector2)) {
      setActiveConnector(connector2);
      return;
    }
    setActiveConnector(null);
    setLocalConnector(connector2);
  };
  const findSavedServer = (connector2) => customConnectors.find(connector2.matches);
  reactExports.useEffect(() => {
    if (!initialConnectorId || !hasLoaded || openedConnectorDeepLinksRef.current.has(initialConnectorId)) {
      return;
    }
    const connector2 = CONNECTOR_CATALOG.find((entry) => entry.id === initialConnectorId);
    if (!connector2?.detail) return;
    openedConnectorDeepLinksRef.current.add(initialConnectorId);
    const savedServer = customConnectors.find(connector2.matches);
    if (isLocalConnector(connector2)) {
      setLocalDetailConnector({ ...connector2, serverName: savedServer?.name });
    } else {
      setDetailConnector(connector2);
    }
  }, [customConnectors, hasLoaded, initialConnectorId]);
  const handleConnectorUpdated = (updated) => {
    invalidateLoad();
    setCustomConnectors(
      (current) => current.map((server) => server.name === updated.name ? updated : server)
    );
  };
  const handleConnectorRemoved = (name) => {
    invalidateLoad();
    setCustomConnectors((current) => current.filter((server) => server.name !== name));
  };
  const ActiveConnectorDialog = activeConnector?.entry.Dialog;
  const DetailConnectorSetupDialog = detailConnector && isWebApiConnector(detailConnector) ? detailConnector.entry.Dialog : void 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "flex flex-col gap-6", "data-action-ui-id": "connectors-tab", children: [
    showHeader ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "mb-2 flex min-h-[68px] min-w-0 flex-nowrap items-start gap-3",
        "data-layout-slot": "connectors-section-header",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConnectorHeaderContent,
          {
            query,
            onQueryChange: setQuery,
            sortMode,
            onSortModeChange: setSortMode,
            onCustomConnector: () => setCustomConnectorOpen(true),
            customDisabled: !hasLoaded || loading
          }
        )
      }
    ) : null,
    loadFailed && hasLoaded ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { variant: "destructive", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDescription, { className: "flex items-center justify-between gap-3", children: [
      t("connectors.loadFailed"),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", disabled: loading, onClick: () => void loadConnectors(), children: t("common.retry") })
    ] }) }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PageStateBoundary,
      {
        error: loadFailed && !hasLoaded,
        errorOptions: {
          reason: "generic",
          text: t("connectors.loadFailed"),
          retry: { onClick: () => void loadConnectors(), loading }
        },
        children: resultCount > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3",
            "data-action-ui-id": "connectors-list",
            children: sortedVisibleConnectorCards.map((card) => {
              if (card.kind === "saved") {
                const { connector: connector22, catalogEntry, title, description } = card;
                return /* @__PURE__ */ jsxRuntimeExports.jsx(
                  CustomConnectorCard,
                  {
                    connector: connector22,
                    title,
                    description,
                    icon: catalogEntry?.icon,
                    iconUrl: catalogEntry?.detail?.iconUrl,
                    onClick: catalogEntry?.detail ? () => handleCardClick(catalogEntry, connector22) : void 0,
                    onUpdated: handleConnectorUpdated,
                    onRemoved: handleConnectorRemoved
                  },
                  `saved:${connector22.name}`
                );
              }
              const { connector: connector2 } = card;
              return (
                // biome-ignore lint/a11y/useKeyWithClickEvents: catalog card click
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "article",
                  {
                    className: "relative flex min-h-40 cursor-pointer flex-col rounded-2xl border border-border bg-card p-5",
                    "data-action-ui-id": "connectors-card",
                    "data-connector-id": connector2.id,
                    onClick: () => handleCardClick(connector2),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-4", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          ConnectorIcon,
                          {
                            iconUrl: connector2.detail?.iconUrl,
                            size: "card",
                            fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Icon,
                              {
                                icon: connector2.icon,
                                size: "lg",
                                "aria-hidden": true,
                                className: "text-foreground/70"
                              }
                            )
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Button,
                          {
                            type: "button",
                            variant: "ghost",
                            size: "icon",
                            disabled: !hasLoaded || loading,
                            "aria-label": t("connectors.addAria", { name: connector2.title }),
                            onClick: (event) => {
                              event.stopPropagation();
                              handleQuickConnect(connector2);
                            },
                            className: "size-10 rounded-[10px] bg-secondary text-foreground hover:bg-popup-item-active hover:text-foreground",
                            "data-action-ui-id": `connectors-add-${connector2.id}`,
                            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: Plus, size: "md", "aria-hidden": true })
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        ConnectorCardContent,
                        {
                          title: connector2.title,
                          description: connector2.description
                        }
                      )
                    ]
                  },
                  `catalog:${connector2.id}`
                )
              );
            })
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card text-center",
            "data-action-ui-id": "connectors-empty",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-10 items-center justify-center rounded-lg bg-muted text-foreground opacity-50", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: Search, size: "lg", "aria-hidden": true }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-foreground", children: t("connectors.emptyTitle") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: t("connectors.emptyDescription") })
            ]
          }
        )
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      CustomConnectorDialog,
      {
        open: customConnectorOpen,
        onOpenChange: setCustomConnectorOpen,
        onSubmit: (input) => homeService.customMcp.create(input),
        onCreated: handleCreated
      }
    ),
    localConnector ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      LocalConnectorDialog,
      {
        connectorId: localConnector.id,
        serverName: localConnector.serverName,
        iconUrl: localConnector.detail?.iconUrl ?? "",
        setupUrl: localConnector.detail?.setupUrl,
        onClose: () => setLocalConnector(null),
        onInstalled: () => void loadConnectors()
      },
      `${localConnector.id}:${localConnector.serverName ?? localConnector.id}`
    ) : null,
    localDetailConnector?.detail && !localConnector ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      LocalConnectorDetailDialog,
      {
        connectorId: localDetailConnector.id,
        serverName: localDetailConnector.serverName,
        iconUrl: localDetailConnector.detail.iconUrl,
        setupUrl: localDetailConnector.detail.setupUrl,
        savedServer: findSavedServer(localDetailConnector),
        onClose: () => setLocalDetailConnector(null),
        onInstalled: () => void loadConnectors(),
        onTry: (prompt) => {
          const saved = findSavedServer(localDetailConnector);
          if (!saved) return;
          setLocalDetailConnector(null);
          void tryConnector(
            {
              ...connectorReferenceFromServer(saved),
              displayName: t(localDetailConnector.titleKey),
              iconUrl: localDetailConnector.detail?.iconUrl ?? null
            },
            prompt
          );
        },
        onUpdated: handleConnectorUpdated,
        onRemoved: (name) => {
          handleConnectorRemoved(name);
          setLocalDetailConnector(null);
        }
      },
      `${localDetailConnector.id}:${localDetailConnector.serverName ?? localDetailConnector.id}`
    ) : null,
    activeConnector && ActiveConnectorDialog ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      ActiveConnectorDialog,
      {
        onPrepared: () => void loadConnectors(),
        onClose: () => setActiveConnector(null),
        onSubmit: (input) => homeService.customMcp.create(input),
        onCreated: (result) => {
          handleCreated(result);
          setActiveConnector(null);
          setDetailConnector(null);
        }
      },
      activeConnector.id
    ) : null,
    detailConnector?.detail && !activeConnector ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConnectorDetailDialog,
      {
        connector: detailConnector,
        savedServer: findSavedServer(detailConnector),
        onClose: () => setDetailConnector(null),
        onConnect: () => {
          handleQuickConnect(detailConnector);
        },
        setupContent: DetailConnectorSetupDialog ? (onBusyChange) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          DetailConnectorSetupDialog,
          {
            embedded: true,
            onPrepared: () => void loadConnectors(),
            onBusyChange,
            onClose: () => setDetailConnector(null),
            onSubmit: (input) => homeService.customMcp.create(input),
            onCreated: (result) => {
              handleCreated(result);
              setDetailConnector(null);
            }
          }
        ) : void 0,
        onTry: (prompt) => {
          const saved = findSavedServer(detailConnector);
          if (!saved) return;
          setDetailConnector(null);
          void tryConnector(connectorReferenceFromServer(saved), prompt);
        },
        onUpdated: handleConnectorUpdated,
        onRemoved: (name) => {
          handleConnectorRemoved(name);
          setDetailConnector(null);
        }
      }
    ) : null
  ] });
}
function hasSubmissionShowcase(showcase) {
  return showcase?.length === 1 && Boolean(normalizePublicSkillShowcaseUrl(showcase[0]));
}
function normalizeSubmissionShowcase(showcase) {
  if (showcase === void 0) return void 0;
  if (showcase.length > 1) throw new Error("Showcase supports one video only");
  return showcase.map((value) => {
    const url = normalizePublicSkillShowcaseUrl(value);
    if (!url) throw new Error("Showcase requires a trusted public video URL");
    return url;
  });
}
function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}
function readSubmissionShowcase(value, legacyFallback) {
  if (value === void 0) return legacyFallback;
  if (typeof value === "string") return [value];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error("Showcase must contain video URLs");
  }
  return [...value];
}
async function stageSkillPackage(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await gatewayFetch(API_PATHS.skillSubmissionStage, {
    method: "POST",
    body: formData
  });
  const raw = asRecord(await response.json());
  if (!raw.ok) throw new Error(String(raw.error ?? "Unable to read skill package"));
  const skill = asRecord(raw.skill);
  const metadata = normalizeSkillDetailMetadata({ ...skill });
  return {
    stagingPath: String(raw.stagingPath ?? ""),
    skill: {
      name: String(skill.name ?? ""),
      displayName: String(skill.displayNameZh ?? ""),
      structuredInfo: metadata.structuredInfo ?? {},
      showcase: readSubmissionShowcase(skill.showcase, metadata.showcase),
      contentLocale: skill.contentLocale ? normalizeSkillContentLocale(skill.contentLocale) : void 0,
      completeTagsEn: stringArray(skill.completeTagsEn),
      creator: String(skill.authorCn ?? skill.authorEn ?? skill.creator ?? ""),
      packageVersion: String(skill.version ?? DEFAULT_SKILL_PACKAGE_VERSION),
      packageVersionDeclared: raw.packageVersionDeclared === true
    }
  };
}
async function uploadCreatorPlanAsset(skillName, assetType, file) {
  const uploadResponse = await gatewayFetch(API_PATHS.skillSubmissionAssetUpload, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-Skill-Name": skillName,
      "X-Asset-Type": assetType,
      "X-Upload-Size": String(file.size)
    },
    body: file,
    timeoutMs: 30 * 60 * 1e3
  });
  const upload = asRecord(await uploadResponse.json());
  if (assetType === "showcase") {
    const publicUrl = normalizePublicSkillShowcaseUrl(upload.public_url);
    if (!publicUrl) throw new Error("Showcase upload did not return a valid public URL");
    return publicUrl;
  }
  const objectKey = String(upload.object_key ?? "");
  if (!objectKey) throw new Error(`${assetType} upload did not return an object key`);
  return objectKey;
}
async function saveCreatorPlan(payload, applyForReview) {
  const coverObjectKey = payload.coverEdited && payload.coverFile ? await uploadCreatorPlanAsset(payload.skillName, "cover", payload.coverFile) : payload.coverEdited ? "" : payload.coverObjectKey;
  const showcase = payload.showcaseEdited && payload.showcaseFile ? [await uploadCreatorPlanAsset(payload.skillName, "showcase", payload.showcaseFile)] : payload.showcaseEdited ? [] : normalizeSubmissionShowcase(payload.showcase);
  const draft = {
    source: payload.source,
    stagingPath: payload.stagingPath,
    replaceExisting: payload.replaceExisting,
    skillName: payload.skillName,
    displayName: payload.displayName,
    structuredInfo: payload.structuredInfo,
    contentLocale: payload.contentLocale,
    showcase,
    categories: payload.categories,
    stage: payload.stage,
    creator: payload.creator,
    packageVersion: payload.packageVersion,
    coverObjectKey
  };
  const saveResponse = await gatewayFetch(API_PATHS.skillSubmissionSave, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft)
  });
  const saveResult = asRecord(await saveResponse.json());
  if (!saveResult.ok) throw new Error(String(saveResult.error ?? "Unable to save skill"));
  const savedSkill = asRecord(saveResult.skill);
  const savedPackageVersion = String(savedSkill.version ?? draft.packageVersion);
  const savedMetadata = normalizeSkillDetailMetadata(savedSkill);
  if (!applyForReview) return;
  if (!coverObjectKey) throw new Error("Cover is required for review");
  const savedShowcase = normalizeSubmissionShowcase(
    readSubmissionShowcase(savedSkill.showcase, savedMetadata.showcase) ?? draft.showcase
  );
  if (!hasSubmissionShowcase(savedShowcase))
    throw new Error("One showcase video is required for review");
  await gatewayFetch(API_PATHS.skillSubmissionSubmit, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      skill_name: draft.skillName,
      display_name: draft.displayName,
      structured_info: savedMetadata.structuredInfo ?? draft.structuredInfo,
      content_locale: savedSkill.contentLocale ? normalizeSkillContentLocale(savedSkill.contentLocale) : draft.contentLocale,
      categories: draft.categories,
      stage: draft.stage,
      creator: draft.creator,
      cover_object_key: coverObjectKey,
      showcase: savedShowcase,
      package_version: savedPackageVersion
    })
  });
}
async function listCreatorPlanSubmissions() {
  const response = await gatewayFetch(API_PATHS.skillSubmissionList);
  const raw = asRecord(await response.json());
  const submissions = Array.isArray(raw.submissions) ? raw.submissions : [];
  return submissions.map((value) => {
    const item = asRecord(value);
    const metadata = normalizeSkillDetailMetadata(item);
    return {
      submissionId: String(item.submission_id ?? ""),
      skillName: String(item.skill_name ?? ""),
      displayName: String(item.display_name ?? ""),
      status: String(item.status ?? ""),
      reviewNote: String(item.review_note ?? ""),
      coverObjectKey: String(item.cover_object_key ?? ""),
      coverUrl: String(item.cover_url ?? ""),
      showcase: readSubmissionShowcase(item.showcase, metadata.showcase),
      structuredInfo: metadata.structuredInfo ?? {},
      contentLocale: item.content_locale ? normalizeSkillContentLocale(item.content_locale) : void 0,
      categories: stringArray(item.categories),
      stage: String(item.stage ?? ""),
      creator: String(item.creator ?? ""),
      packageVersion: String(item.package_version ?? ""),
      version: Number(item.version ?? 0),
      updatedAt: Number(item.updated_at ?? 0)
    };
  });
}
async function offlineCreatorPlanSubmission(skillName) {
  await gatewayFetch(API_PATHS.skillSubmissionOffline, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skill_name: skillName })
  });
}
const MAX_PACKAGE_BYTES = 50 * 1024 * 1024;
const MAX_COVER_BYTES = 10 * 1024 * 1024;
const MAX_SHOWCASE_BYTES = 1e3 * 1024 * 1024;
const COVER_ASPECT_RATIO = 16 / 9;
const COVER_ASPECT_TOLERANCE = 0.02;
const COVER_TYPES = /* @__PURE__ */ new Set(["image/png", "image/jpeg", "image/webp"]);
const SHOWCASE_TYPES = /* @__PURE__ */ new Set(["video/mp4", "video/quicktime", "video/webm"]);
function inferTaxonomy(tags, configuredCategories, configuredStages) {
  const categories = configuredCategories.filter(
    (category) => tags.some((tag) => tag === category.en_name || tag.startsWith(`${category.en_name} / `))
  ).map((category) => category.category);
  const stage = configuredStages.find(
    (candidate) => tags.some((tag) => tag.endsWith(` / ${candidate.en_name}`))
  )?.category ?? "";
  return { categories: categories.slice(0, 3), stage };
}
function CreatorPlanDialog({
  open,
  onOpenChange,
  mySkills,
  defaultDisplayName = "",
  defaultSkillName = "",
  defaultSource,
  existingSubmission,
  onCreateSkill,
  onSaved,
  onRefreshSubmissions
}) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");
  const preferredLocale = normalizeSkillContentLocale(i18n.language);
  const isEditing = !!defaultSkillName;
  const {
    categories: configuredCategories,
    stages: configuredStages,
    loading: categoriesLoading
  } = useSkillCategories(open);
  const packageInputRef = reactExports.useRef(null);
  const replacementPackageInputRef = reactExports.useRef(null);
  const coverInputRef = reactExports.useRef(null);
  const showcaseInputRef = reactExports.useRef(null);
  const designDraftInitializedRef = reactExports.useRef(false);
  const initialSource = defaultSource ?? (defaultSkillName ? "design" : "upload");
  const [source, setSource] = reactExports.useState(initialSource);
  const [skillName, setSkillName] = reactExports.useState(defaultSkillName);
  const [stagingPath, setStagingPath] = reactExports.useState();
  const [packageFile, setPackageFile] = reactExports.useState();
  const [displayName, setDisplayName] = reactExports.useState("");
  const [summary, setSummary] = reactExports.useState("");
  const [structuredInfo, setStructuredInfo] = reactExports.useState({});
  const [contentLocale, setContentLocale] = reactExports.useState(preferredLocale);
  const reviewLocale = contentLocale === "zh-CN" ? "zh" : "en";
  const reviewLimits = SKILL_REVIEW_LIMITS[reviewLocale];
  const [bestFor, setBestFor] = reactExports.useState([]);
  const [bestForDraft, setBestForDraft] = reactExports.useState("");
  const [howToUse, setHowToUse] = reactExports.useState("");
  const [outputs, setOutputs] = reactExports.useState("");
  const [categories, setCategories] = reactExports.useState([]);
  const [stage, setStage] = reactExports.useState("");
  const [creator, setCreator] = reactExports.useState(defaultDisplayName);
  const [packageVersion, setPackageVersion] = reactExports.useState(DEFAULT_SKILL_PACKAGE_VERSION);
  const [coverFile, setCoverFile] = reactExports.useState();
  const [showcaseFile, setShowcaseFile] = reactExports.useState();
  const [stagedShowcase, setStagedShowcase] = reactExports.useState();
  const [coverEdited, setCoverEdited] = reactExports.useState(false);
  const [showcaseEdited, setShowcaseEdited] = reactExports.useState(false);
  const [coverPreview, setCoverPreview] = reactExports.useState("");
  const [staging, setStaging] = reactExports.useState(false);
  const [savingMode, setSavingMode] = reactExports.useState(null);
  const [reviewAttempted, setReviewAttempted] = reactExports.useState(false);
  const skillOptions = reactExports.useMemo(
    () => [...mySkills].sort((a, b) => a.name.localeCompare(b.name)).map((skill) => ({
      value: skill.name,
      label: skill.displayNameZh ? `${skill.displayNameZh} · ${skill.name}` : skill.name
    })),
    [mySkills]
  );
  const selectedSkill = reactExports.useMemo(
    () => mySkills.find((skill) => skill.name === skillName),
    [mySkills, skillName]
  );
  const selectedCategory = configuredCategories.find(
    (category) => category.category === categories[0]
  );
  const selectedRelatedCategories = categories.slice(1);
  const selectedStage = configuredStages.find((item) => item.category === stage);
  const fillFromSkill = reactExports.useCallback(
    (skill, submission) => {
      designDraftInitializedRef.current = true;
      const taxonomy = inferTaxonomy(
        skill.completeTagsEn ?? [],
        configuredCategories,
        configuredStages
      );
      setSkillName(skill.name);
      setDisplayName(submission?.displayName || skill.displayNameZh || "");
      const metadata = submission ?? normalizeSkillDetailMetadata({ ...skill });
      const nextStructuredInfo = metadata.structuredInfo ?? {};
      const selected = selectSkillStructuredInfo(
        nextStructuredInfo,
        submission?.contentLocale ?? skill.contentLocale ?? preferredLocale
      );
      setStructuredInfo(nextStructuredInfo);
      setContentLocale(selected.locale);
      setSummary(selected.info.summary);
      setBestFor(selected.info.best_for);
      setHowToUse(selected.info.how_to_use);
      setOutputs(selected.info.outputs);
      setCategories(
        (submission?.categories.length ? submission.categories : taxonomy.categories).slice(0, 3)
      );
      setStage(submission?.stage || taxonomy.stage);
      setCreator(
        submission?.creator || skill.authorCn || skill.authorEn || skill.creator || defaultDisplayName
      );
      setPackageVersion(
        submission?.packageVersion || skill.version || DEFAULT_SKILL_PACKAGE_VERSION
      );
      setCoverFile(void 0);
      setShowcaseFile(void 0);
      setStagedShowcase(void 0);
      setCoverEdited(false);
      setShowcaseEdited(false);
      setCoverPreview("");
    },
    [configuredCategories, configuredStages, defaultDisplayName, preferredLocale]
  );
  reactExports.useEffect(() => {
    if (!open || source !== "design") {
      designDraftInitializedRef.current = false;
      return;
    }
    if (categoriesLoading || designDraftInitializedRef.current) return;
    const selected = mySkills.find((skill) => skill.name === skillName) ?? mySkills[0];
    if (selected) {
      fillFromSkill(
        selected,
        existingSubmission?.skillName === selected.name ? existingSubmission : void 0
      );
    }
  }, [categoriesLoading, existingSubmission, fillFromSkill, mySkills, open, skillName, source]);
  reactExports.useEffect(() => {
    return () => {
      if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);
  const handleSourceChange = (nextSource) => {
    setSource(nextSource);
    setStagingPath(void 0);
    setPackageFile(void 0);
    setStagedShowcase(void 0);
    setBestForDraft("");
    if (nextSource === "upload") {
      setSkillName("");
      setDisplayName("");
      setSummary("");
      setStructuredInfo({});
      setContentLocale(preferredLocale);
      setBestFor([]);
      setHowToUse("");
      setOutputs("");
      setCategories([]);
      setStage("");
      setCreator(defaultDisplayName);
      setPackageVersion(DEFAULT_SKILL_PACKAGE_VERSION);
    }
  };
  const handlePackage = async (file, replacement) => {
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".zip") && !lowerName.endsWith(".tar.gz")) {
      dedupedToast.error(
        t("skills.submission.packageTypeError", "Only ZIP / .tar.gz packages are supported")
      );
      return;
    }
    if (file.size > MAX_PACKAGE_BYTES) {
      dedupedToast.error(t("skills.submission.packageSizeError", "Skill package cannot exceed 50 MB"));
      return;
    }
    setStaging(true);
    try {
      const result = await stageSkillPackage(file);
      if (replacement && result.skill.name !== defaultSkillName) {
        dedupedToast.error(
          t(
            "skills.submission.packageNameMismatch",
            "The new package name must match the immutable Skill name."
          )
        );
        return;
      }
      if (replacement) {
        if (!result.skill.packageVersionDeclared) {
          dedupedToast.error(
            t(
              "skills.submission.packageVersionMissing",
              "The updated package must declare version in meta.yaml"
            )
          );
          return;
        }
        const currentVersion = existingSubmission?.packageVersion || packageVersion;
        if (!isNewerSkillPackageVersion(result.skill.packageVersion, currentVersion)) {
          dedupedToast.error(
            t("skills.submission.packageVersionNotNewer", {
              current: currentVersion,
              defaultValue: "The updated package version must be greater than {{current}}"
            })
          );
          return;
        }
        setPackageFile(file);
        setStagingPath(result.stagingPath);
        setPackageVersion(result.skill.packageVersion || packageVersion);
        setStructuredInfo((current) => ({ ...current, ...result.skill.structuredInfo }));
        setStagedShowcase(result.skill.showcase);
        return;
      }
      setPackageFile(file);
      setStagingPath(result.stagingPath);
      setStagedShowcase(result.skill.showcase);
      setSkillName(result.skill.name);
      setPackageVersion(result.skill.packageVersion || DEFAULT_SKILL_PACKAGE_VERSION);
      setDisplayName("");
      setSummary("");
      setStructuredInfo(result.skill.structuredInfo);
      setContentLocale(preferredLocale);
      setBestFor([]);
      setHowToUse("");
      setOutputs("");
      setCategories([]);
      setStage("");
      setCreator(defaultDisplayName);
    } catch (error) {
      dedupedToast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setStaging(false);
    }
  };
  const handleCover = async (file) => {
    if (!COVER_TYPES.has(file.type)) {
      dedupedToast.error(t("skills.submission.coverTypeError", "Cover supports PNG / JPG / WebP only"));
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      dedupedToast.error(t("skills.submission.coverSizeError", "Cover cannot exceed 10 MB"));
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const aspectRatio = bitmap.width / bitmap.height;
      bitmap.close();
      if (Math.abs(aspectRatio - COVER_ASPECT_RATIO) > COVER_ASPECT_TOLERANCE) {
        dedupedToast.error(
          t("skills.submission.coverAspectRatioError", "Cover image must use a 16:9 aspect ratio")
        );
        return;
      }
    } catch {
      dedupedToast.error(t("skills.submission.coverReadError", "Unable to read the cover image"));
      return;
    }
    if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverEdited(true);
    setCoverPreview(URL.createObjectURL(file));
  };
  const handleShowcase = (file) => {
    if (!SHOWCASE_TYPES.has(file.type)) {
      dedupedToast.error(
        t("skills.submission.showcaseTypeError", "Showcase supports MP4 / MOV / WebM only")
      );
      return;
    }
    if (file.size > MAX_SHOWCASE_BYTES) {
      dedupedToast.error(t("skills.submission.showcaseSizeError", "Showcase cannot exceed 1000 MB"));
      return;
    }
    setShowcaseFile(file);
    setShowcaseEdited(true);
  };
  const handleAddBestFor = () => {
    const label = bestForDraft.trim();
    if (!label) return;
    const labelLength = [...label].length;
    const wordCount = label.split(/\s+/).filter(Boolean).length;
    if (labelLength < reviewLimits.bestForMinLength || labelLength > reviewLimits.bestForMaxLength || reviewLocale === "en" && wordCount > 3) {
      dedupedToast.error(
        t("skills.submission.bestForLengthError", {
          defaultValue: reviewLocale === "en" ? "Each label must be 2–24 characters and no more than 3 words" : "Each label must be 2–6 characters"
        })
      );
      return;
    }
    if (bestFor.includes(label)) {
      setBestForDraft("");
      return;
    }
    if (bestFor.length >= reviewLimits.bestForMaxCount) {
      dedupedToast.error(t("skills.submission.bestForCountError", "Add 2–3 Best For labels"));
      return;
    }
    setBestFor((current) => [...current, label]);
    setBestForDraft("");
  };
  const handleBestForKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== "," && event.key !== "，") return;
    event.preventDefault();
    handleAddBestFor();
  };
  const privateSaveReady = !!skillName && !!packageVersion.trim() && (isEditing || source === "design" || !!stagingPath);
  const existingCoverObjectKey = existingSubmission?.coverObjectKey || selectedSkill?.coverObjectKey || "";
  const existingShowcase = stagedShowcase ?? existingSubmission?.showcase ?? selectedSkill?.showcase;
  const hasLegacyShowcase = existingShowcase === void 0 && Boolean(selectedSkill?.showcaseObjectKey);
  const hasCover = coverEdited ? !!coverFile : !!existingCoverObjectKey;
  const hasShowcase = showcaseEdited ? !!showcaseFile : hasSubmissionShowcase(existingShowcase) || hasLegacyShowcase;
  const validationErrors = validateReviewMetadata(
    {
      skillName,
      displayName,
      summary,
      bestFor,
      howToUse,
      outputs,
      categories,
      stage,
      creator,
      packageVersion,
      hasCover,
      hasShowcase,
      hasPackage: isEditing || source === "design" || !!stagingPath,
      locale: reviewLocale
    },
    defaultSkillName || (existingSubmission?.skillName === skillName ? existingSubmission.skillName : void 0) || (source === "design" ? selectedSkill?.name : void 0)
  );
  const requiresVersionBump = isEditing && !!stagingPath && !!existingSubmission;
  const updateVersionIsValid = !requiresVersionBump || isNewerSkillPackageVersion(packageVersion, existingSubmission.packageVersion);
  const reviewComplete = !!skillName && Object.keys(validationErrors).length === 0 && updateVersionIsValid;
  const requiredError = t("skills.submission.requiredError", "This field is required");
  const errorMessage = (code) => {
    if (!reviewAttempted || !code) return void 0;
    if (code === "required") return requiredError;
    if (code === "display_name_length")
      return t("skills.submission.displayNameHint", {
        defaultValue: `Use ${reviewLimits.displayNameMin}–${reviewLimits.displayNameMax} characters`
      });
    if (code === "summary_length")
      return t("skills.submission.summaryHint", {
        defaultValue: `Describe the core capability in ${reviewLimits.summaryMin}–${reviewLimits.summaryMax} characters`
      });
    if (code === "best_for_count")
      return t("skills.submission.bestForCountError", "Add 2–3 Best For labels");
    if (code === "best_for_length")
      return t("skills.submission.bestForLengthError", {
        defaultValue: reviewLocale === "en" ? "Each label must be 2–24 characters and no more than 3 words" : "Each label must be 2–6 characters"
      });
    if (code === "how_to_use_length")
      return t("skills.submission.howToUseHint", {
        defaultValue: `Describe the required input in ${reviewLimits.howToUseMin}–${reviewLimits.howToUseMax} characters`
      });
    if (code === "outputs_length")
      return t("skills.submission.outputsHint", {
        defaultValue: `Describe the deliverables in ${reviewLimits.outputsMin}–${reviewLimits.outputsMax} characters`
      });
    if (code === "creator_length")
      return t("skills.submission.creatorHint", {
        defaultValue: `Use ${reviewLimits.creatorMin}–${reviewLimits.creatorMax} characters`
      });
    if (code === "package_version_invalid")
      return t("skills.submission.packageVersionInvalid", "Version must use x.y.z format");
    return t("skills.submission.incomplete", "Complete all Skill information first");
  };
  const reviewErrors = {
    displayName: errorMessage(validationErrors.displayName),
    summary: errorMessage(validationErrors.summary),
    bestFor: errorMessage(validationErrors.bestFor),
    howToUse: errorMessage(validationErrors.howToUse),
    outputs: errorMessage(validationErrors.outputs),
    categories: errorMessage(validationErrors.categories),
    stage: errorMessage(validationErrors.stage),
    creator: errorMessage(validationErrors.creator),
    cover: errorMessage(validationErrors.hasCover),
    showcase: reviewAttempted ? validationErrors.hasShowcase ? t(
      "skills.submission.showcaseRequired",
      "A Showcase video is required when applying for review"
    ) : void 0 : void 0,
    packageVersion: reviewAttempted && !updateVersionIsValid ? t("skills.submission.packageVersionNotNewer", {
      current: existingSubmission?.packageVersion,
      defaultValue: "The updated package version must be greater than {{current}}"
    }) : errorMessage(validationErrors.packageVersion)
  };
  const handleSave = async (applyForReview) => {
    if (applyForReview) setReviewAttempted(true);
    if (applyForReview && !reviewComplete || !applyForReview && !privateSaveReady) {
      dedupedToast.error(t("skills.submission.incomplete", "Complete all Skill information first"));
      return;
    }
    if (applyForReview && !hasCover) {
      dedupedToast.error(
        t("skills.submission.coverRequired", "A cover is required when applying for review")
      );
      return;
    }
    setSavingMode(applyForReview ? "review" : "private");
    const payload = {
      source,
      stagingPath,
      replaceExisting: isEditing && !!stagingPath,
      skillName,
      displayName: displayName.trim(),
      structuredInfo: {
        ...structuredInfo,
        [contentLocale]: {
          summary: summary.trim(),
          best_for: bestFor,
          how_to_use: howToUse.trim(),
          outputs: outputs.trim()
        }
      },
      contentLocale,
      showcase: showcaseEdited ? [] : existingShowcase,
      categories,
      stage,
      creator: creator.trim(),
      packageVersion: packageVersion.trim(),
      coverFile,
      showcaseFile,
      coverEdited,
      showcaseEdited,
      coverObjectKey: existingCoverObjectKey
    };
    try {
      await saveCreatorPlan(payload, applyForReview);
      dedupedToast.success(
        isEditing ? applyForReview ? t("skills.submission.editReviewSuccess", "Changes submitted for review") : t("skills.submission.editPrivateSuccess", "Skill information updated") : applyForReview ? t("skills.submission.reviewSuccess", "Submitted for review") : t("skills.submission.privateSuccess", "Saved as Private")
      );
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      dedupedToast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingMode(null);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    DialogContent,
    {
      size: "xl",
      "data-action-ui-id": "creator-plan-dialog",
      className: "flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { className: "border-b border-border px-6 py-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "text-base", children: isEditing ? t("skills.submission.editTitle", "Edit Skill information") : t("skills.submission.title", "Submit Skill") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: isEditing ? t(
            "skills.submission.editSubtitle",
            "Update listing information or upload a new package for this Skill."
          ) : t(
            "skills.submission.subtitle",
            "Save a private Skill, or complete its assets and apply for community listing."
          ) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "scrollbar-fade flex-1 overflow-y-auto px-6 py-5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-6", children: [
          isEditing ? /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "flex flex-col gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileArchive, {}),
              /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTitle, { children: t("skills.submission.currentPackage", "Current Skill package") }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDescription, { children: [
                skillName,
                " · v",
                packageVersion
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-medium text-foreground", children: t("skills.submission.updatePackage", "Update Skill package (optional)") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: t(
                "skills.submission.updatePackageDesc",
                "Upload a new ZIP / .tar.gz only when the Skill implementation changed. Its name must remain unchanged."
              ) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              PackagePicker,
              {
                inputRef: replacementPackageInputRef,
                fileName: packageFile?.name,
                loading: staging,
                title: t("skills.submission.chooseNewPackage", "Choose a new package"),
                hint: t(
                  "skills.submission.packageHint",
                  "Max 50 MB; the package must contain SKILL.md"
                ),
                actionId: "skill-submission-replacement-package",
                onFile: (file) => void handlePackage(file, true),
                error: reviewErrors.packageVersion
              }
            )
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "flex flex-col gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: t("skills.submission.source", "Submission source") }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              RadioGroup,
              {
                value: source,
                onValueChange: (value) => handleSourceChange(value),
                className: "grid-cols-2",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Label,
                    {
                      className: "flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 hover:bg-foreground/[0.03]",
                      "data-action-ui-id": "skill-submission-source-upload",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroupItem, { value: "upload" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 gap-3", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: Upload, size: "md" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-xs font-medium text-foreground", children: t("skills.submission.uploadPackage", "Upload Skill package") }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-1 block text-[11px] font-normal text-muted-foreground", children: t(
                              "skills.submission.uploadPackageDesc",
                              "Upload ZIP / .tar.gz, then enter listing information manually."
                            ) })
                          ] })
                        ] })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Label,
                    {
                      className: "flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 hover:bg-foreground/[0.03]",
                      "data-action-ui-id": "skill-submission-source-design",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroupItem, { value: "design" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 gap-3", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: FileArchive, size: "md" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-xs font-medium text-foreground", children: t("skills.submission.chooseDesign", "Choose from Design") }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-1 block text-[11px] font-normal text-muted-foreground", children: t(
                              "skills.submission.chooseDesignDesc",
                              "Read information from a Skill created in MiniMax Design."
                            ) })
                          ] })
                        ] })
                      ]
                    }
                  )
                ]
              }
            ),
            source === "upload" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                PackagePicker,
                {
                  inputRef: packageInputRef,
                  fileName: packageFile?.name,
                  loading: staging,
                  title: t("skills.submission.choosePackage", "Choose ZIP / .tar.gz"),
                  hint: t(
                    "skills.submission.packageHint",
                    "Max 50 MB; the package must contain SKILL.md"
                  ),
                  actionId: "skill-submission-package",
                  onFile: (file) => void handlePackage(file, false)
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Info, {}),
                /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTitle, { children: t("skills.submission.uploadManualTitle", "Enter information manually") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, { children: t(
                  "skills.submission.uploadManualDesc",
                  "The original package is kept unchanged. Uploaded Skills are Private by default."
                ) })
              ] })
            ] }) : mySkills.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Select,
                {
                  value: skillName,
                  onValueChange: (value) => {
                    const skill = mySkills.find((item) => item.name === value);
                    if (skill)
                      fillFromSkill(
                        skill,
                        existingSubmission?.skillName === value ? existingSubmission : void 0
                      );
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { "data-action-ui-id": "skill-submission-design-select", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      SelectValue,
                      {
                        placeholder: t(
                          "skills.submission.chooseDesignPlaceholder",
                          "Select a Skill you've created"
                        )
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: skillOptions.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: option.value, children: option.label }, option.value)) })
                  ]
                }
              ),
              skillName && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Alert,
                {
                  className: "border-success/30 bg-success/10 text-success",
                  "data-action-ui-id": "skill-submission-design-read-success",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, {}),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTitle, { children: t("skills.submission.designReadSuccess", "Skill information read") }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, { className: "text-success/80", children: t(
                      "skills.submission.designReadSuccessDesc",
                      "The fields below were filled from the selected Skill. Review them before saving."
                    ) })
                  ]
                }
              )
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Info, {}),
              /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTitle, { children: t("skills.submission.noDesignSkills", "No Skills created in Design yet.") }),
              onCreateSkill && /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "button",
                  variant: "link",
                  className: "h-auto p-0",
                  onClick: onCreateSkill,
                  "data-action-ui-id": "skill-submission-create-design",
                  children: t("skills.submission.createNow", "Create one now")
                }
              ) })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            FormSection,
            {
              title: t("skills.submission.basicInfoSection", "Basic information"),
              description: t(
                "skills.submission.basicInfoSectionDesc",
                "Skill name, display name, and creator information"
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Field$1, { label: t("skills.submission.skillName", "Skill name"), required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Input,
                    {
                      value: skillName,
                      disabled: true,
                      placeholder: t(
                        "skills.submission.skillNamePlaceholder",
                        "short-drama-series-writer"
                      )
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Field$1,
                    {
                      label: t("skills.submission.displayName", "Display name"),
                      required: true,
                      error: reviewErrors.displayName,
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Input,
                        {
                          value: displayName,
                          onChange: (event) => setDisplayName(event.target.value),
                          maxLength: reviewLimits.displayNameMax,
                          placeholder: t(
                            "skills.submission.displayNamePlaceholder",
                            "e.g. 3D Animation Short Generator"
                          ),
                          "data-action-ui-id": "skill-submission-display-name",
                          "aria-invalid": !!reviewErrors.displayName
                        }
                      )
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Field$1,
                    {
                      label: t("skills.submission.creator", "Creator"),
                      required: true,
                      error: reviewErrors.creator,
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Input,
                        {
                          value: creator,
                          onChange: (event) => setCreator(event.target.value),
                          maxLength: reviewLimits.creatorMax,
                          "data-action-ui-id": "skill-submission-creator",
                          "aria-invalid": !!reviewErrors.creator
                        }
                      )
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Field$1,
                  {
                    label: t("skills.submission.packageVersion", "Skill package version"),
                    required: true,
                    error: reviewErrors.packageVersion,
                    hint: t("skills.submission.packageVersionHint", "Semantic version in x.y.z format"),
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Input,
                      {
                        value: packageVersion,
                        disabled: true,
                        placeholder: t("skills.submission.packageVersionPlaceholder", "1.0.0"),
                        "data-action-ui-id": "skill-submission-package-version",
                        "aria-invalid": !!reviewErrors.packageVersion
                      }
                    )
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            FormSection,
            {
              title: t("skills.submission.listingInfoSection", "Listing information"),
              description: t(
                "skills.submission.listingInfoSectionDesc",
                "Summary, best-fit scenarios, usage, and deliverables"
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Field$1,
                  {
                    label: t("skills.submission.summary", "One-line summary"),
                    required: true,
                    hint: `${summary.length}/${reviewLimits.summaryMax} · ${t(
                      "skills.submission.summaryHint",
                      `Describe the core capability in ${reviewLimits.summaryMin}–${reviewLimits.summaryMax} characters`
                    )}`,
                    error: reviewErrors.summary,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Textarea,
                      {
                        value: summary,
                        onChange: (event) => setSummary(event.target.value),
                        rows: 2,
                        maxLength: reviewLimits.summaryMax,
                        placeholder: t(
                          "skills.submission.summaryPlaceholder",
                          "Summarize the core capability and main value of this Skill in one sentence"
                        ),
                        "data-action-ui-id": "skill-submission-summary",
                        "aria-invalid": !!reviewErrors.summary
                      }
                    )
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Field$1,
                  {
                    label: t("skills.submission.bestFor", "Best For"),
                    required: true,
                    hint: t(
                      "skills.submission.bestForHint",
                      `Enter 2–3 short labels; ${reviewLimits.bestForMinLength}–${reviewLimits.bestForMaxLength} characters per label${reviewLocale === "en" ? ", up to 3 words each" : ""}`
                    ),
                    error: reviewErrors.bestFor,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        "aria-invalid": !!reviewErrors.bestFor,
                        className: `flex min-h-10 flex-wrap items-center gap-2 rounded-lg border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring/50 ${reviewErrors.bestFor ? "border-destructive ring-1 ring-destructive/20" : "border-input"}`,
                        children: [
                          bestFor.map((label) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "secondary", className: "gap-1", children: [
                            label,
                            /* @__PURE__ */ jsxRuntimeExports.jsxs(
                              Button,
                              {
                                type: "button",
                                variant: "ghost",
                                size: "icon-xs",
                                className: "size-4",
                                onClick: () => setBestFor((current) => current.filter((item) => item !== label)),
                                "data-action-ui-id": `skill-submission-best-for-remove-${label}`,
                                children: [
                                  /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3", strokeWidth: 1.75 }),
                                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: t("skills.submission.removeLabel", "Remove label") })
                                ]
                              }
                            )
                          ] }, label)),
                          bestFor.length < reviewLimits.bestForMaxCount && /* @__PURE__ */ jsxRuntimeExports.jsx(
                            Input,
                            {
                              value: bestForDraft,
                              onChange: (event) => setBestForDraft(event.target.value),
                              onKeyDown: handleBestForKeyDown,
                              onBlur: handleAddBestFor,
                              maxLength: reviewLimits.bestForMaxLength,
                              className: "h-6 min-w-32 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0",
                              placeholder: t("skills.submission.bestForPlaceholder", "+ Add a label"),
                              "data-action-ui-id": "skill-submission-best-for-input"
                            }
                          )
                        ]
                      }
                    )
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Field$1,
                    {
                      label: t("skills.submission.howToUse", "How to Use"),
                      required: true,
                      hint: `${howToUse.length}/${reviewLimits.howToUseMax} · ${t(
                        "skills.submission.howToUseHint",
                        `Describe the required input in ${reviewLimits.howToUseMin}–${reviewLimits.howToUseMax} characters`
                      )}`,
                      error: reviewErrors.howToUse,
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Textarea,
                        {
                          value: howToUse,
                          onChange: (event) => setHowToUse(event.target.value),
                          rows: 4,
                          maxLength: reviewLimits.howToUseMax,
                          placeholder: t(
                            "skills.submission.howToUsePlaceholder",
                            "Describe what users need to provide and how to get started"
                          ),
                          "data-action-ui-id": "skill-submission-how-to-use",
                          "aria-invalid": !!reviewErrors.howToUse
                        }
                      )
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Field$1,
                    {
                      label: t("skills.submission.outputs", "Outputs"),
                      required: true,
                      hint: `${outputs.length}/${reviewLimits.outputsMax} · ${t(
                        "skills.submission.outputsHint",
                        `Describe the deliverables in ${reviewLimits.outputsMin}–${reviewLimits.outputsMax} characters`
                      )}`,
                      error: reviewErrors.outputs,
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Textarea,
                        {
                          value: outputs,
                          onChange: (event) => setOutputs(event.target.value),
                          rows: 4,
                          maxLength: reviewLimits.outputsMax,
                          placeholder: t(
                            "skills.submission.outputsPlaceholder",
                            "Describe the main deliverables users will receive"
                          ),
                          "data-action-ui-id": "skill-submission-outputs",
                          "aria-invalid": !!reviewErrors.outputs
                        }
                      )
                    }
                  )
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            FormSection,
            {
              title: t("skills.submission.taxonomySection", "Category and creation stage"),
              description: t(
                "skills.submission.taxonomySectionDesc",
                "Choose one primary category, up to two related categories, and one creation stage"
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Field$1,
                    {
                      label: t("skills.submission.primaryCategory", "Primary category"),
                      required: true,
                      hint: t(
                        "skills.submission.categoriesHint",
                        "Choose the category that best matches this Skill. Add up to two related categories."
                      ),
                      error: reviewErrors.categories,
                      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        Select,
                        {
                          value: categories[0] ?? "",
                          onValueChange: (value) => setCategories(value ? [value, ...categories.slice(1)] : categories.slice(1)),
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              SelectTrigger,
                              {
                                "data-action-ui-id": "skill-submission-category",
                                "aria-invalid": !!reviewErrors.categories,
                                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  SelectValue,
                                  {
                                    placeholder: t(
                                      "skills.submission.categoryPlaceholder",
                                      "Select a primary category"
                                    ),
                                    children: selectedCategory ? isZh ? selectedCategory.cn_name : selectedCategory.en_name : void 0
                                  }
                                )
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: configuredCategories.map((category) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: category.category, children: isZh ? category.cn_name : category.en_name }, category.category)) })
                          ]
                        }
                      )
                    }
                  ),
                  [0, 1].map((relatedIndex) => {
                    const categoryCode = selectedRelatedCategories[relatedIndex] ?? "";
                    const selectedRelated = configuredCategories.find(
                      (category) => category.category === categoryCode
                    );
                    return /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Field$1,
                      {
                        label: `${t("skills.submission.relatedCategory", "Related category")} ${relatedIndex + 1}`,
                        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          Select,
                          {
                            value: categoryCode || "__none__",
                            onValueChange: (value) => {
                              setCategories((current) => {
                                const next = current.slice(0, 3);
                                if (value && value !== "__none__") next[relatedIndex + 1] = value;
                                else next.splice(relatedIndex + 1, 1);
                                return next.filter(Boolean);
                              });
                            },
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                SelectTrigger,
                                {
                                  "data-action-ui-id": `skill-submission-related-category-${relatedIndex + 1}`,
                                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                                    SelectValue,
                                    {
                                      placeholder: t(
                                        "skills.submission.relatedCategoryPlaceholder",
                                        "Optional related category"
                                      ),
                                      children: selectedRelated ? isZh ? selectedRelated.cn_name : selectedRelated.en_name : void 0
                                    }
                                  )
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "__none__", children: t("skills.submission.relatedCategoryNone", "No related category") }),
                                configuredCategories.filter(
                                  (category) => category.category === categoryCode || !categories.includes(category.category)
                                ).map((category) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: category.category, children: isZh ? category.cn_name : category.en_name }, category.category))
                              ] })
                            ]
                          }
                        )
                      },
                      `related-category-${relatedIndex}`
                    );
                  })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Field$1,
                  {
                    label: t("skills.submission.stage", "Creation stage"),
                    required: true,
                    error: reviewErrors.stage,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: stage, onValueChange: (value) => value && setStage(value), children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        SelectTrigger,
                        {
                          "data-action-ui-id": "skill-submission-stage",
                          "aria-invalid": !!reviewErrors.stage,
                          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                            SelectValue,
                            {
                              placeholder: t(
                                "skills.submission.stagePlaceholder",
                                "Select one creation stage"
                              ),
                              children: selectedStage ? isZh ? selectedStage.cn_name : selectedStage.en_name : void 0
                            }
                          )
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: configuredStages.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: item.category, children: isZh ? item.cn_name : item.en_name }, item.category)) })
                    ] })
                  }
                ) })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            FormSection,
            {
              title: t("skills.submission.assetsSection", "Cover image and showcase video"),
              description: t(
                "skills.submission.assetsSectionDesc",
                "Upload the cover and video used for marketplace review"
              ),
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  AssetPicker,
                  {
                    title: t("skills.submission.cover", "Cover"),
                    hint: t(
                      "skills.submission.coverHint",
                      "PNG / JPG / WebP, 16:9, max 10 MB; required for review"
                    ),
                    icon: ImagePlusOutlineIcon,
                    fileName: coverFile?.name || (existingSubmission?.coverObjectKey || selectedSkill?.coverObjectKey ? t("skills.submission.assetUploaded", "Uploaded") : ""),
                    preview: coverPreview || existingSubmission?.coverUrl || selectedSkill?.coverUrl,
                    inputRef: coverInputRef,
                    accept: "image/png,image/jpeg,image/webp",
                    onFile: handleCover,
                    onClear: () => {
                      setCoverFile(void 0);
                      setCoverEdited(true);
                      setCoverPreview("");
                    },
                    actionId: "skill-submission-cover",
                    clearLabel: t("skills.submission.clearAsset", "Clear asset"),
                    clearable: !!coverFile,
                    error: reviewErrors.cover,
                    onPreviewError: () => {
                      void onRefreshSubmissions?.();
                    }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  AssetPicker,
                  {
                    title: t("skills.submission.showcase", "Showcase"),
                    required: true,
                    hint: t("skills.submission.showcaseHint", "Choose 1 file, up to 1000 MB"),
                    icon: Video,
                    fileName: showcaseFile?.name || (!showcaseEdited && hasShowcase ? t("skills.submission.assetUploaded", "Uploaded") : ""),
                    inputRef: showcaseInputRef,
                    accept: "video/mp4,video/quicktime,video/webm",
                    onFile: handleShowcase,
                    onClear: () => {
                      setShowcaseFile(void 0);
                      setShowcaseEdited(true);
                    },
                    actionId: "skill-submission-showcase",
                    clearLabel: t("skills.submission.clearAsset", "Clear asset"),
                    clearable: !!showcaseFile,
                    error: reviewErrors.showcase
                  }
                )
              ] })
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "items-center justify-between border-t border-border px-6 py-4 sm:justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-w-md text-[11px] text-muted-foreground", children: t(
            "skills.submission.reviewNote",
            "When a published Skill update is under review, the current live version remains available."
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                type: "button",
                variant: "ghost",
                disabled: !!savingMode,
                onClick: () => onOpenChange(false),
                "data-action-ui-id": "skill-submission-cancel",
                children: t("common.cancel")
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                type: "button",
                variant: "outline",
                disabled: !privateSaveReady || !!savingMode,
                loading: savingMode === "private",
                onClick: () => void handleSave(false),
                "data-action-ui-id": "skill-submission-save-private",
                children: t("skills.submission.savePrivate", "Save as Private")
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                type: "button",
                disabled: !privateSaveReady || !!savingMode,
                loading: savingMode === "review",
                onClick: () => void handleSave(true),
                "data-action-ui-id": "skill-submission-apply-review",
                children: t("skills.submission.applyReview", "Apply for Review")
              }
            )
          ] })
        ] })
      ]
    }
  ) });
}
function RequiredMark() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 text-destructive", children: "*" });
}
function FormSection({
  title,
  description,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "flex flex-col gap-4 border-t border-border pt-5 first:border-t-0 first:pt-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-heading text-xs font-medium text-foreground", children: title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: description })
    ] }),
    children
  ] });
}
function Field$1({
  label,
  required,
  hint,
  error,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Label, { children: [
      label,
      required && /* @__PURE__ */ jsxRuntimeExports.jsx(RequiredMark, {})
    ] }),
    children,
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-destructive", children: error }),
    hint && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: hint })
  ] });
}
function PackagePicker({
  inputRef,
  fileName,
  loading,
  title,
  hint,
  actionId,
  onFile,
  error
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        ref: inputRef,
        type: "file",
        className: "sr-only",
        accept: ".zip,.tar.gz,application/zip,application/gzip",
        onChange: (event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Button,
      {
        type: "button",
        variant: "outline",
        className: "h-24 w-full border-dashed",
        loading,
        "data-action-ui-id": actionId,
        onClick: () => inputRef.current?.click(),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: FileArchive, size: "lg" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex flex-col items-start gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: fileName || title }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-normal text-muted-foreground", children: hint })
          ] })
        ]
      }
    ),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-[11px] text-destructive", children: error })
  ] });
}
function AssetPicker({
  title,
  hint,
  icon,
  fileName,
  preview,
  inputRef,
  accept,
  onFile,
  onClear,
  actionId,
  clearLabel,
  clearable,
  required,
  error,
  onPreviewError
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Label, { children: [
      title,
      required && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 text-destructive", children: "*" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        ref: inputRef,
        type: "file",
        className: "sr-only",
        accept,
        onChange: (event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Button,
      {
        type: "button",
        variant: "outline",
        className: "relative h-28 w-full overflow-hidden border-dashed",
        onClick: () => inputRef.current?.click(),
        "data-action-ui-id": actionId,
        "aria-invalid": !!error,
        children: [
          preview ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "img",
            {
              src: preview,
              alt: "",
              className: "absolute inset-0 h-full w-full object-cover",
              onError: onPreviewError
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon, size: "lg" }),
          !preview && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex flex-col items-start gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: fileName || title }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-normal text-muted-foreground", children: hint })
          ] })
        ]
      }
    ),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-destructive", children: error }),
    fileName && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2 text-[11px] text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: fileName }),
      clearable && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { type: "button", variant: "ghost", size: "icon-xs", onClick: onClear, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: X, size: "xs" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: clearLabel })
      ] })
    ] })
  ] });
}
function CreatorPlanInviteCard({ onOpen }) {
  const { t } = useTranslation();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-action-ui-id": "market-creator-plan-invite",
      className: "group h-full overflow-hidden rounded-lg border border-dashed border-brand-accent/50 bg-card transition-colors hover:border-brand-accent",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          "data-action-ui-id": "market-creator-plan-invite-cta",
          onClick: onOpen,
          className: "flex h-full min-h-[260px] w-full flex-col items-center justify-center gap-2 px-6 py-8 text-center cursor-pointer",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 28, strokeWidth: 1.5, className: "text-brand-accent" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-base font-semibold text-foreground", children: t("skills.market.creatorPlanInviteTitle", "加入创作者社区") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "line-clamp-2 max-w-[18rem] text-xs text-muted-foreground", children: t(
              "skills.market.creatorPlanInviteDesc",
              "投稿 Skill，被选中可获 2000 积分或加入共创计划"
            ) })
          ]
        }
      )
    }
  );
}
function FeaturedSkillCard({
  skill,
  installing,
  onInstall,
  onTryItOut,
  onDetail
}) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");
  const market = skill;
  const displayName = isZh ? skill.displayNameZh || toDisplayName(skill.name) : toDisplayName(skill.name);
  const summary = isZh ? skill.summaryZh || skill.summary : skill.summary;
  const author = isZh ? market.authorCn || market.authorEn || "" : market.authorEn || market.authorCn || "";
  const downloads = market.downloads;
  const cover = resolveSkillCoverUrl(skill);
  const isInstalled = skill.enabled === true || market.installed === true;
  const showVerified = market.source === "official" || market.source === "official-featured";
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: cover/card opens detail
    // biome-ignore lint/a11y/noStaticElementInteractions: card click handler
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-action-ui-id": "featured-skill-card",
        "data-skill-name": skill.name,
        className: "group flex flex-col overflow-hidden rounded-lg bg-card transition-shadow duration-200 ease-out hover:ring-[0.5px] hover:ring-inset hover:ring-border-strong cursor-pointer",
        onClick: () => onDetail?.(skill),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative aspect-video w-full overflow-hidden bg-muted", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SkillCoverMedia, { url: cover }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "pointer-events-none absolute inset-x-0 bottom-0 flex gap-3 p-3 opacity-0 translate-y-2 transition-[opacity,transform] duration-200 ease-out group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0",
                onClick: (e) => e.stopPropagation(),
                children: [
                  onDetail && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      "data-action-ui-id": "featured-skill-detail",
                      className: "flex flex-1 items-center justify-center gap-1.5 h-9 rounded-full text-[13px] font-normal whitespace-nowrap bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-colors cursor-pointer",
                      onClick: () => onDetail(skill),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { size: 14, strokeWidth: 1.75 }),
                        t("skills.viewDetail")
                      ]
                    }
                  ),
                  isInstalled ? onTryItOut && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      "data-action-ui-id": "featured-skill-try",
                      className: "flex flex-1 items-center justify-center gap-1.5 h-9 rounded-full text-[13px] font-normal whitespace-nowrap bg-brand-accent text-white hover:opacity-90 transition-opacity cursor-pointer",
                      onClick: () => onTryItOut(skill),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { size: 14, strokeWidth: 1.75 }),
                        t("skills.market.tryInChat", "去对话中试试")
                      ]
                    }
                  ) : onInstall && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      "data-action-ui-id": "featured-skill-install",
                      disabled: installing,
                      className: "flex flex-1 items-center justify-center gap-1.5 h-9 rounded-full text-[13px] font-normal whitespace-nowrap bg-brand-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
                      onClick: () => onInstall(skill.name),
                      children: installing ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 14, strokeWidth: 1.75, className: "animate-spin" }),
                        t("skills.market.installing")
                      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Download$1, { size: 14, strokeWidth: 1.75 }),
                        t("skills.market.downloadSkill", "下载 Skill")
                      ] })
                    }
                  )
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-1 flex-col gap-2 p-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-base font-medium text-foreground", children: displayName }),
            summary && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "line-clamp-2 text-sm text-muted-foreground", children: summary }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex min-w-0 items-center gap-1", children: [
                author && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex min-w-0 items-center gap-0.5 text-sm text-foreground/85", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": "true", children: "@" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: author })
                ] }),
                author && showVerified && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  BadgeCheck,
                  {
                    size: 14,
                    fill: "none",
                    strokeWidth: 2,
                    className: "shrink-0 text-brand-accent",
                    "aria-label": t("skills.market.verifiedOfficial", "Verified by MiniMax Design")
                  }
                )
              ] }),
              downloads != null && downloads > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex shrink-0 items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Download$1, { size: 12 }),
                formatDownloads(downloads)
              ] })
            ] })
          ] })
        ]
      }
    )
  );
}
function FeaturedSkillSection({
  title,
  titleAccessory,
  headerAccessory,
  emptyText,
  skills,
  installingSet,
  onInstall,
  onTryItOut,
  onDetail,
  dataActionUiId,
  footerCard
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "data-action-ui-id": dataActionUiId, className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-base font-heading font-medium text-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: title }),
        titleAccessory
      ] }),
      headerAccessory && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: headerAccessory })
    ] }),
    skills.length === 0 && !footerCard ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      PageStateBoundary,
      {
        empty: true,
        density: "panel",
        className: "min-h-40",
        emptyOptions: { text: emptyText }
      }
    ) : (
      // 列数断点与页面其他 grid（InstalledPluginsView / SkillGroupedList /
      // PluginMarketTabContent）保持一致：sm=2 / lg=3 / xl=4，
      // 避免「精选」rail 与下方网格在 3 列窗宽下不对齐。
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", children: [
        skills.map((skill) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          FeaturedSkillCard,
          {
            skill,
            installing: installingSet?.has(skill.name),
            onInstall,
            onTryItOut,
            onDetail
          },
          skill.name
        )),
        footerCard
      ] })
    )
  ] });
}
function SkillEmptyState({
  activeTag,
  onGoToCommunity,
  kind = "skill",
  onCreate,
  className
}) {
  const { t } = useTranslation();
  const isCreate = kind === "create";
  const titleKey = kind === "plugin" ? "skills.empty.plugin.title" : kind === "create" ? "skills.market.creatorPlanEmptyTitle" : "skills.empty.title";
  const descriptionKey = kind === "plugin" ? "skills.empty.plugin.description" : kind === "create" ? "skills.market.creatorPlanEmptyDesc" : "skills.empty.description";
  const ctaKey = kind === "plugin" ? "skills.empty.plugin.goToMarket" : kind === "create" ? "skills.header.createSkill" : "skills.empty.goToCommunity";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    PageStateBoundary,
    {
      empty: true,
      className,
      emptyOptions: {
        title: t(titleKey),
        description: t(descriptionKey),
        actions: [
          {
            key: isCreate ? "create" : "go-to-community",
            icon: isCreate ? /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { strokeWidth: 2 }) : void 0,
            label: t(ctaKey),
            variant: "default",
            onClick: () => isCreate ? onCreate?.() : onGoToCommunity(activeTag)
          }
        ]
      }
    }
  );
}
const CATEGORY_ICONS = {
  megaphone: Megaphone,
  "shopping-bag": ShoppingBag,
  clapperboard: Clapperboard,
  music: Music,
  film: Film,
  headphones: Headphones,
  image: ImageOutlineIcon,
  wrench: Wrench
};
function SkillCard({
  skill,
  activeTab,
  onDetail,
  onToggle,
  onExport,
  onShare,
  onTryItOut,
  updateInfo,
  onUpdate,
  updating,
  onInstall,
  installing
}) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");
  const displayName = isZh ? skill.displayNameZh || toDisplayName(skill.name) : toDisplayName(skill.name);
  const displaySummary = isZh ? skill.summaryZh || skill.summary : skill.summary;
  const isInstalled = "enabled" in skill;
  const ctx = activeTab ? getCardContext(activeTab, skill) : isInstalled ? "community-installed" : "community-uninstalled";
  const showToggle = ctx !== "community-uninstalled";
  const showAmberUpdate = (ctx === "mine-community" || ctx === "mine-local") && updateInfo && onUpdate;
  const category = getSkillCategory(skill);
  const IconComp = CATEGORY_ICONS[category] ?? Wrench;
  const downloads = skill.downloads;
  const market = skill;
  const author = isZh ? market.authorCn || market.authorEn || "" : market.authorEn || market.authorCn || "";
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: card click opens detail
    // biome-ignore lint/a11y/noStaticElementInteractions: card click opens detail
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-action-ui-id": "skill-card",
        "data-skill-name": skill.name,
        className: "group flex flex-col border border-border bg-card p-4 rounded-lg transition-colors hover:bg-muted/50 hover:border-foreground/15 cursor-pointer h-[200px]",
        onClick: () => onDetail?.(skill),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-8 w-8 shrink-0 items-center justify-center bg-muted text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconComp, { size: 16, strokeWidth: 1.67 }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-sm font-medium text-foreground", children: displayName }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[11px] text-muted-foreground", children: skill.name })
              ] })
            ] }),
            showToggle && onToggle && // biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation only
            // biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation only
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex shrink-0", onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Switch,
              {
                checked: skill.enabled,
                onCheckedChange: () => onToggle(skill.name, !skill.enabled)
              }
            ) })
          ] }),
          (skill.tagEn || skill.tags && skill.tags.length > 0) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 flex items-center gap-1.5 flex-wrap", children: skill.tagEn ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground", children: isZh ? skill.tagCn || skill.tagEn : skill.tagEn }) : skill.tags?.map((tag, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground",
              children: getTagDisplayName(tag, i, skill.tagsCn, t, i18n.language)
            },
            tag
          )) }),
          displaySummary && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2", children: displaySummary }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-auto flex items-center justify-between gap-2 pt-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground", children: [
              author && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex min-w-0 items-center gap-0.5 text-sm", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": "true", children: "@" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: author })
              ] }),
              downloads != null && downloads > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex shrink-0 items-center gap-0.5", children: [
                author && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground/40", children: "·" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Download$1, { size: 12 }),
                formatDownloads(downloads)
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-1", onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              CardActions,
              {
                ctx,
                skill,
                showAmberUpdate: !!showAmberUpdate,
                updateInfo,
                onUpdate,
                updating,
                onTryItOut,
                onExport,
                onShare,
                onInstall,
                installing
              }
            ) })
          ] })
        ]
      }
    )
  );
}
function CardActions({
  ctx,
  skill,
  showAmberUpdate,
  updateInfo,
  onUpdate,
  updating,
  onTryItOut,
  onExport,
  onShare,
  onInstall,
  installing
}) {
  const { t } = useTranslation();
  if (ctx === "community-uninstalled") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          "data-action-ui-id": "market-skill-install",
          disabled: installing,
          className: "inline-flex items-center gap-1.5 h-7 px-2.5 text-[13px] font-medium rounded-sm border border-border bg-transparent text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          onClick: () => onInstall?.(skill.name),
          children: installing ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 14, className: "animate-spin" }),
            t("skills.market.installing")
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download$1, { size: 14 }),
            t("skills.market.install")
          ] })
        }
      ),
      onShare && /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "data-action-ui-id": "skill-card-share",
            className: "inline-flex items-center justify-center h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            onClick: () => onShare(skill.name),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Share2$1, { size: 14 })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { children: t("skills.share") })
      ] })
    ] });
  }
  const showShare = ctx === "community-installed" || ctx === "mine-community";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    showAmberUpdate && updateInfo && onUpdate && /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          "data-action-ui-id": "skill-card-amber-update",
          disabled: updating,
          className: `inline-flex items-center justify-center h-7 w-7 ${UPDATE_INDICATOR_STYLES.base} ${UPDATE_INDICATOR_STYLES.hover} transition-colors disabled:opacity-50`,
          onClick: () => onUpdate(skill.name),
          children: updating ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(RetryIcon, { size: 14 })
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TooltipContent, { children: [
        t("skills.market.updateAvailable", "Update available"),
        " (",
        updateInfo.latestVersion,
        ")"
      ] })
    ] }),
    onTryItOut && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        "data-action-ui-id": "skill-card-try",
        className: "inline-flex items-center gap-1.5 h-7 px-2.5 text-[13px] font-medium rounded-sm border border-border bg-transparent text-foreground hover:bg-muted transition-colors",
        onClick: () => onTryItOut(skill),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { size: 14 }),
          t("skills.tryItOut")
        ]
      }
    ),
    showShare && onShare && /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          "data-action-ui-id": "skill-card-share",
          className: "inline-flex items-center justify-center h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
          onClick: () => onShare(skill.name),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Share2$1, { size: 14 })
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { children: t("skills.share") })
    ] }),
    onExport && /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          "data-action-ui-id": "skill-card-download",
          className: "inline-flex items-center justify-center h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
          onClick: () => onExport(skill.name),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download$1, { size: 14 })
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { children: t("skills.download", "Download") })
    ] })
  ] });
}
function SkillListItem({
  skill,
  activeTab,
  onToggle,
  onDetail,
  onUninstall,
  onExport,
  onShare,
  onTryItOut,
  onInstall,
  installing,
  updateInfo,
  onUpdate,
  updating
}) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");
  const displayName = isZh ? skill.displayNameZh || toDisplayName(skill.name) : toDisplayName(skill.name);
  const displaySummary = isZh ? skill.summaryZh || skill.summary : skill.summary;
  const isInstalled = "enabled" in skill;
  const ctx = activeTab ? getCardContext(activeTab, skill) : isInstalled ? "community-installed" : "community-uninstalled";
  const showToggle = ctx !== "community-uninstalled";
  const showAmberUpdate = (ctx === "mine-community" || ctx === "mine-local") && updateInfo && onUpdate;
  const showShare = ctx === "community-installed" || ctx === "mine-community";
  const isMine = ctx === "mine-community" || ctx === "mine-local";
  const downloads = skill.downloads;
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: list row click opens detail
    // biome-ignore lint/a11y/noStaticElementInteractions: list row click opens detail
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-action-ui-id": "skill-list-item",
        "data-skill-name": skill.name,
        className: "group flex min-h-20 cursor-pointer items-center gap-3 rounded-lg bg-card px-4 py-3 transition-shadow duration-200 ease-out hover:ring-[0.5px] hover:ring-inset hover:ring-border-strong focus-within:ring-[0.5px] focus-within:ring-inset focus-within:ring-border-strong",
        onClick: () => onDetail?.(skill),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-1 flex-col gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[15px] font-medium leading-5 text-foreground", children: displayName }),
            displaySummary && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-sm leading-5 text-muted-foreground", children: displaySummary }),
            downloads != null && downloads > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex items-center gap-1 text-[11px] leading-4 text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download$1, { size: 12 }),
              formatDownloads(downloads)
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "relative flex shrink-0 items-center gap-2",
              onClick: (e) => e.stopPropagation(),
              children: [
                ctx === "community-uninstalled" && onInstall && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    "data-action-ui-id": "market-skill-install",
                    disabled: installing,
                    className: "inline-flex h-7 items-center gap-1.5 rounded-md border border-foreground/15 bg-transparent px-3 text-xs font-medium text-foreground transition-colors hover:border-foreground hover:bg-transparent disabled:cursor-not-allowed disabled:opacity-50",
                    onClick: () => onInstall(skill.name),
                    children: installing ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 12, className: "animate-spin" }),
                      t("skills.market.installing")
                    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Download$1, { size: 12, strokeWidth: 1.75 }),
                      t("skills.market.install")
                    ] })
                  }
                ),
                ctx !== "community-uninstalled" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute right-full z-10 mr-2 flex items-center gap-0.5 rounded-md bg-card opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100", children: isMine ? onTryItOut && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    "data-action-ui-id": "skill-list-item-try",
                    className: "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:border-foreground hover:bg-card",
                    onClick: () => onTryItOut(skill),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { size: 14, strokeWidth: 1.5 }),
                      t("skills.market.tryInChat", "去对话中试试")
                    ]
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  onTryItOut && /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        "data-action-ui-id": "skill-list-item-try",
                        className: "inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                        onClick: () => onTryItOut(skill),
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { size: 14, strokeWidth: 1.5 })
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { children: t("skills.market.tryInChat", "去对话中试试") })
                  ] }),
                  showShare && onShare && /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        "data-action-ui-id": "skill-list-item-share",
                        className: "inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                        onClick: () => onShare(skill.name),
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Share2$1, { size: 14 })
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { children: t("skills.share") })
                  ] }),
                  onExport && /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        "data-action-ui-id": "skill-list-item-download",
                        className: "inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                        onClick: () => onExport(skill.name),
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download$1, { size: 14 })
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { children: t("skills.download", "Download") })
                  ] }),
                  onUninstall && /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        "data-action-ui-id": "skill-list-item-uninstall",
                        className: "inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-destructive transition-colors",
                        onClick: () => onUninstall(skill.name),
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 14 })
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { children: t("skills.market.uninstall") })
                  ] })
                ] }) }),
                showAmberUpdate && updateInfo && onUpdate && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    "data-action-ui-id": "skill-list-item-amber-update",
                    disabled: updating,
                    className: `inline-flex items-center gap-1 h-7 rounded-md px-2.5 text-xs font-medium ${UPDATE_INDICATOR_STYLES.base} ${UPDATE_INDICATOR_STYLES.hover} transition-colors disabled:opacity-50`,
                    onClick: () => onUpdate(skill.name),
                    children: [
                      updating ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 12, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(RetryIcon, { size: 12 }),
                      t("skills.market.update")
                    ]
                  }
                ),
                showToggle && onToggle && "enabled" in skill && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Switch,
                  {
                    checked: skill.enabled,
                    onCheckedChange: () => onToggle(skill.name, !skill.enabled)
                  }
                )
              ]
            }
          )
        ]
      }
    )
  );
}
function SkillGroupedList({
  skills,
  layout,
  onToggle,
  onDetail,
  onExport,
  onShare,
  onTryItOut,
  onUninstall,
  skillUpdates,
  onUpdate,
  updatingSet,
  activeTag,
  onGoToCommunity
}) {
  const fromCommunity = skills.filter((s) => s.source === "installed");
  const localCreated = skills.filter((s) => s.source === "user");
  if (fromCommunity.length === 0 && localCreated.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SkillEmptyState, { activeTag, onGoToCommunity });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-6", children: [
    fromCommunity.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
      SkillGroup,
      {
        skills: fromCommunity,
        layout,
        onToggle,
        onDetail,
        onExport,
        onShare,
        onTryItOut,
        onUninstall,
        skillUpdates,
        onUpdate,
        updatingSet
      }
    ),
    localCreated.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
      SkillGroup,
      {
        skills: localCreated,
        layout,
        onToggle,
        onDetail,
        onExport,
        onShare,
        onTryItOut,
        onUninstall,
        skillUpdates,
        onUpdate,
        updatingSet
      }
    )
  ] });
}
function SkillGroup({
  skills,
  layout,
  onToggle,
  onDetail,
  onExport,
  onShare,
  onTryItOut,
  onUninstall,
  skillUpdates,
  onUpdate,
  updatingSet
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: layout === "grid" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", children: skills.map((skill) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    SkillCard,
    {
      skill,
      activeTab: "mine",
      onToggle,
      onDetail,
      onExport,
      onShare,
      onTryItOut,
      updateInfo: skillUpdates.get(skill.name),
      onUpdate,
      updating: updatingSet.has(skill.name)
    },
    skill.name
  )) }) : (
    // Two-column grid mirrors the "其他 Skill" rail layout so mine tab
    // feels at home next to the community surface. Each SkillListItem
    // owns its own card chrome (stable geometry + hairline outline), so the
    // wrapper just sets the grid + gap.
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-3 lg:grid-cols-2", children: skills.map((skill) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      SkillListItem,
      {
        skill,
        activeTab: "mine",
        onToggle,
        onDetail,
        onExport,
        onShare,
        onTryItOut,
        onUninstall,
        updateInfo: skillUpdates.get(skill.name),
        onUpdate,
        updating: updatingSet.has(skill.name)
      },
      skill.name
    )) })
  ) });
}
function MySkillsView({
  defaultTab = "created",
  createdSkills,
  downloadedSkills,
  submissions,
  autoUpdate,
  onAutoUpdateChange,
  onUpload,
  onEdit,
  onOffline,
  onToggle,
  onDetail,
  onExport,
  onShare,
  onTryItOut,
  onUninstall,
  skillUpdates,
  onUpdate,
  updatingSet,
  onGoToCommunity,
  onRefreshSubmissions
}) {
  const { t } = useTranslation();
  const [offlineTarget, setOfflineTarget] = reactExports.useState("");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-w-xl text-xs text-muted-foreground", children: t(
        "skills.mine.description",
        "Manage Skills you created and Skills downloaded from the community."
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex items-center gap-2 text-xs text-foreground/70", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.autoUpdate", "Auto Update") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Switch,
            {
              checked: autoUpdate,
              onCheckedChange: onAutoUpdateChange,
              "data-action-ui-id": "skills-mine-auto-update"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { type: "button", onClick: onUpload, "data-action-ui-id": "skills-upload-skill", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: Upload, size: "md" }),
          t("skills.mine.uploadSkill", "Upload Skill")
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { defaultValue: defaultTab, className: "gap-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "w-fit", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "created", "data-action-ui-id": "skills-mine-created-tab", children: [
          t("skills.mine.createdByMe", "Created by me"),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 text-[11px] text-muted-foreground", children: createdSkills.length })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "downloaded", "data-action-ui-id": "skills-mine-downloaded-tab", children: [
          t("skills.mine.downloaded", "Downloaded"),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 text-[11px] text-muted-foreground", children: downloadedSkills.length })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "created", children: createdSkills.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        PageStateBoundary,
        {
          empty: true,
          emptyOptions: {
            title: t("skills.mine.noCreatedSkills", "You haven't created any Skills yet"),
            actions: [
              {
                key: "upload",
                variant: "default",
                label: t("skills.mine.uploadFirstSkill", "Upload your first Skill"),
                icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: Upload, size: "md" }),
                onClick: onUpload
              }
            ]
          }
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3", children: createdSkills.map((skill) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        CreatedSkillCard,
        {
          skill,
          submission: submissions.get(skill.name),
          onEdit,
          onOffline: setOfflineTarget,
          onRefreshSubmissions
        },
        skill.name
      )) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "downloaded", children: downloadedSkills.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(SkillEmptyState, { activeTag: null, onGoToCommunity: () => onGoToCommunity() }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        SkillGroupedList,
        {
          skills: downloadedSkills,
          layout: "list",
          onToggle,
          onDetail,
          onExport,
          onShare,
          onTryItOut,
          onUninstall,
          skillUpdates,
          onUpdate,
          updatingSet,
          activeTag: null,
          onGoToCommunity: () => onGoToCommunity()
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialog, { open: !!offlineTarget, onOpenChange: (open) => !open && setOfflineTarget(""), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { size: "sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTitle, { children: t("skills.mine.offlineTitle", "Offline this Skill?") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogDescription, { children: t(
          "skills.mine.offlineDesc",
          "Once offline, this Skill can no longer be discovered, installed, or used. You can edit it and apply again later."
        ) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { children: t("common.cancel") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          AlertDialogAction,
          {
            variant: "destructive",
            "data-action-ui-id": "skills-created-offline-confirm",
            onClick: () => {
              const target = offlineTarget;
              setOfflineTarget("");
              void onOffline(target);
            },
            children: t("skills.mine.offline", "Offline")
          }
        )
      ] })
    ] }) })
  ] });
}
function CreatedSkillCard({
  skill,
  submission,
  onEdit,
  onOffline,
  onRefreshSubmissions
}) {
  const { t, i18n } = useTranslation();
  const [failedCoverUrl, setFailedCoverUrl] = reactExports.useState("");
  const status = submission?.status || "private";
  const displayStatus = status === "pending" ? t("skills.mine.status.pending", "Review pending") : status === "approved" ? t("skills.mine.status.readyToPublish", "Ready to publish") : status === "published" ? t("skills.mine.status.published", "Published") : status === "offline" ? t("skills.mine.status.offline", "Offline") : status === "rejected" ? t("skills.mine.status.rejected", "Rejected") : t("skills.mine.status.private", "Private");
  const displayName = submission?.displayName || skill.displayNameZh || toDisplayName(skill.name);
  const structuredInfo = submission?.structuredInfo ?? normalizeSkillDetailMetadata({ ...skill }).structuredInfo;
  const summary = structuredInfo ? selectSkillStructuredInfo(structuredInfo, i18n.language).info.summary : i18n.language.startsWith("zh") ? skill.summaryZh || skill.summary : skill.summary || skill.summaryZh;
  const coverUrl = submission?.coverUrl || skill.coverUrl;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "gap-0 py-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative aspect-video w-full overflow-hidden bg-muted", children: coverUrl && coverUrl !== failedCoverUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      SkillCoverMedia,
      {
        url: coverUrl,
        className: "h-full w-full object-cover",
        onError: () => {
          setFailedCoverUrl(coverUrl);
          void onRefreshSubmissions();
        }
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-full w-full items-center justify-center text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SkillIcon, { size: 32, strokeWidth: 1.5 }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "flex min-h-36 flex-col gap-3 py-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-start justify-between gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "truncate text-sm font-heading font-medium text-foreground", children: displayName }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 truncate text-[11px] text-muted-foreground", children: [
            skill.name,
            " · v",
            submission?.packageVersion || skill.version || "1.0.0"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: status === "rejected" ? "destructive" : "secondary", children: displayStatus })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "line-clamp-2 text-xs/relaxed text-muted-foreground", children: summary || t("skills.mine.noSummary", "No summary provided.") }),
      submission?.reviewNote && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "line-clamp-2 text-[11px] text-destructive", children: submission.reviewNote })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardFooter, { className: "mt-auto flex flex-wrap justify-end gap-2 border-border bg-muted/40", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          type: "button",
          variant: "ghost",
          size: "sm",
          onClick: () => onEdit(skill.name),
          "data-action-ui-id": `skills-created-edit-${skill.name}`,
          children: t("skills.mine.editInformation", "Edit information")
        }
      ),
      status === "pending" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          type: "button",
          variant: "outline",
          size: "sm",
          onClick: () => onEdit(skill.name),
          "data-action-ui-id": `skills-created-view-application-${skill.name}`,
          children: t("skills.mine.viewApplication", "View application")
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          type: "button",
          size: "sm",
          onClick: () => onEdit(skill.name),
          "data-action-ui-id": `skills-created-apply-review-${skill.name}`,
          children: t("skills.mine.applyReview", "Apply for review")
        }
      ),
      status === "published" && /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          type: "button",
          variant: "destructive",
          size: "sm",
          onClick: () => onOffline(skill.name),
          "data-action-ui-id": `skills-created-offline-${skill.name}`,
          children: t("skills.mine.offline", "Offline")
        }
      )
    ] })
  ] });
}
async function readJson(response) {
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `HTTP ${response.status}`);
  }
  return await response.json();
}
function useOperatorWorkflow() {
  const [submissions, setSubmissions] = reactExports.useState([]);
  const [publishedSubmissions, setPublishedSubmissions] = reactExports.useState([]);
  const [categories, setCategories] = reactExports.useState([]);
  const [reviewers, setReviewers] = reactExports.useState([]);
  const categoriesRef = reactExports.useRef([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [total, setTotal] = reactExports.useState(0);
  const [pendingTotal, setPendingTotal] = reactExports.useState(0);
  const [approvedTotal, setApprovedTotal] = reactExports.useState(0);
  const submissionsRequestRef = reactExports.useRef(0);
  const fetchSubmissions = reactExports.useCallback(async (filters = {}) => {
    const request = ++submissionsRequestRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.submissionType) params.set("submission_type", filters.submissionType);
      if (filters.submitterUid) params.set("submitter_uid", filters.submitterUid);
      if (filters.submitterName) params.set("submitter_name", filters.submitterName);
      if (filters.reviewerUid) params.set("reviewer_uid", filters.reviewerUid);
      if (filters.reviewStatus) params.set("review_status", filters.reviewStatus);
      if (filters.page) params.set("page", String(filters.page));
      if (filters.pageSize) params.set("page_size", String(filters.pageSize));
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const data = await readJson(
        await gatewayFetch(`${API_PATHS.marketOperatorSubmissions}${suffix}`)
      );
      if (request !== submissionsRequestRef.current) return;
      setSubmissions(data.submissions ?? []);
      setTotal(data.total ?? 0);
      setPendingTotal(data.pending_total ?? 0);
      setApprovedTotal(data.approved_total ?? 0);
      setReviewers(data.reviewers ?? []);
    } finally {
      if (request === submissionsRequestRef.current) setLoading(false);
    }
  }, []);
  const fetchPublishedSubmissions = reactExports.useCallback(async () => {
    const data = await readJson(
      await gatewayFetch(`${API_PATHS.marketOperatorSubmissions}?status=published&page_size=100`)
    );
    setPublishedSubmissions(data.submissions ?? []);
  }, []);
  const updateSubmission = reactExports.useCallback(async (submissionId, body) => {
    const data = await readJson(
      await gatewayFetch(API_PATHS.marketOperatorSubmission(submissionId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
    );
    return data.ok;
  }, []);
  const batchApprove = reactExports.useCallback(async (submissionIds) => {
    return readJson(
      await gatewayFetch(API_PATHS.marketOperatorBatchApprove, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_ids: submissionIds })
      })
    );
  }, []);
  const stagePackage = reactExports.useCallback(async (submissionId) => {
    return readJson(
      await gatewayFetch(API_PATHS.marketOperatorSubmissionPackage(submissionId), {
        method: "POST"
      })
    );
  }, []);
  const uploadPackage = reactExports.useCallback(async (submissionId, skillName, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const query = new URLSearchParams({ skill_name: skillName });
    const data = await readJson(
      await gatewayFetch(
        `${API_PATHS.marketOperatorSubmissionPackageUpload(submissionId)}?${query}`,
        { method: "POST", body: formData, timeoutMs: 10 * 60 * 1e3 }
      )
    );
    return data.object_key;
  }, []);
  const fetchCategories = reactExports.useCallback(async () => {
    const response = await gatewayFetch(`${API_PATHS.marketOperatorCategories}?tag_type=all`);
    if (!response.ok) {
      throw new Error(await response.text().catch(() => "") || `HTTP ${response.status}`);
    }
    const nextCategories = normalizeSkillCategoriesResponse(await response.json());
    categoriesRef.current = nextCategories;
    setCategories(nextCategories);
  }, []);
  const saveCategories = reactExports.useCallback(
    async (transform = (items) => items) => {
      const items = transform(categoriesRef.current);
      const data = await readJson(
        await gatewayFetch(API_PATHS.marketOperatorCategories, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categories: items })
        })
      );
      return data.ok;
    },
    []
  );
  const updateCategory = reactExports.useCallback(
    (tagType, code, patch) => {
      const nextCategories = categoriesRef.current.map(
        (category) => category.tag_type === tagType && category.category === code ? { ...category, ...patch } : category
      );
      categoriesRef.current = nextCategories;
      setCategories(nextCategories);
    },
    []
  );
  const addCategory = reactExports.useCallback((item) => {
    const nextCategories = [...categoriesRef.current, item];
    categoriesRef.current = nextCategories;
    setCategories(nextCategories);
  }, []);
  const publish = reactExports.useCallback(async (publications) => {
    const data = await readJson(
      await gatewayFetch(API_PATHS.marketOperatorPublish, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publications })
      })
    );
    return data;
  }, []);
  return {
    submissions,
    publishedSubmissions,
    categories,
    reviewers,
    loading,
    total,
    pendingTotal,
    approvedTotal,
    fetchSubmissions,
    fetchPublishedSubmissions,
    updateSubmission,
    batchApprove,
    stagePackage,
    uploadPackage,
    fetchCategories,
    saveCategories,
    updateCategory,
    addCategory,
    publish
  };
}
const publicationSections = {
  "official-featured": "skills.market.officialFeatured",
  community: "skills.market.communityFeatured",
  official: "skills.market.otherSkills"
};
class BatchPublicationValidationError extends Error {
  constructor(submissionIds, reason) {
    super(`Invalid publication categories: ${submissionIds.join(", ")}`);
    this.submissionIds = submissionIds;
    this.reason = reason;
    this.name = "BatchPublicationValidationError";
  }
}
function publicationValidationMessage(details) {
  if (!details || typeof details !== "object" || !("reason" in details)) return void 0;
  switch (details.reason) {
    case "at least one category is required":
      return "skills.operation.publishCategoryRequired";
    case "categories contains an invalid value":
      return "skills.operation.publishCategoryInvalid";
    case "category_weights must match categories":
      return "skills.operation.publishCategoryWeightsInvalid";
    default:
      return void 0;
  }
}
function buildBatchPublications(selected, drafts, section, enabledCategories) {
  const missing = selected.filter((id) => drafts[id]?.categories.length === 0);
  if (missing.length > 0) throw new BatchPublicationValidationError(missing, "missing-category");
  if (enabledCategories) {
    const invalid = selected.filter(
      (id) => drafts[id]?.categories.some((category) => !enabledCategories.includes(category))
    );
    if (invalid.length > 0) throw new BatchPublicationValidationError(invalid, "invalid-category");
  }
  return selected.map((submissionId) => {
    const draft = drafts[submissionId];
    if (!draft) throw new Error(`Missing publication draft: ${submissionId}`);
    return { ...draft, submission_id: submissionId, display_section: section };
  });
}
function resolveConfiguredCategories(skillCategories, operationCategories) {
  return operationCategories?.length ? operationCategories : skillCategories;
}
function normalizeCategoryWeights(categories, legacyWeight, weights) {
  return Object.fromEntries(
    categories.map((category) => [
      category,
      Number.isFinite(weights?.[category]) ? Number(weights?.[category]) : legacyWeight
    ])
  );
}
function taxonomyItemKey(item) {
  return `${item.tag_type}:${item.category}`;
}
function createTaxonomyOrderMap(items) {
  return new Map(items.map((item) => [taxonomyItemKey(item), item.sort_order]));
}
function taxonomyItemsForConfiguration(items, tagType) {
  return items.filter((item) => item.tag_type === tagType);
}
function hasDuplicateEnabledTaxonomyOrders(items, orders) {
  const seen = /* @__PURE__ */ new Set();
  for (const item of items) {
    if (item.enabled === false) continue;
    const orderKey = `${item.tag_type}:${orders.get(taxonomyItemKey(item)) ?? 1e3}`;
    if (seen.has(orderKey)) return true;
    seen.add(orderKey);
  }
  return false;
}
function BatchPublishDialog({ count, onClose, onPublish }) {
  const { t } = useTranslation();
  const [section, setSection] = reactExports.useState(null);
  const [publishing, setPublishing] = reactExports.useState(false);
  const inFlight = reactExports.useRef(false);
  const handlePublish = async () => {
    if (!section || count === 0 || inFlight.current) return;
    inFlight.current = true;
    setPublishing(true);
    try {
      if (await onPublish(section)) onClose();
    } finally {
      inFlight.current = false;
      setPublishing(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: true, onOpenChange: (open) => !open && !inFlight.current && onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    DialogContent,
    {
      size: "lg",
      className: "rounded-xl",
      "data-action-ui-id": "operations-batch-publish-dialog",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: t("skills.operation.batchPublishTitle") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: t("skills.operation.batchPublishDescription", { count }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 py-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "batch-publish-section", children: t("skills.operation.publishSection") }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              value: section,
              disabled: publishing,
              onValueChange: (value) => {
                if (value && Object.hasOwn(publicationSections, value)) {
                  setSection(value);
                }
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  SelectTrigger,
                  {
                    id: "batch-publish-section",
                    className: "w-full",
                    "data-action-ui-id": "operations-batch-publish-section",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: t("skills.operation.publishSectionPlaceholder"), children: section ? t(publicationSections[section]) : t("skills.operation.publishSectionPlaceholder") })
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: Object.entries(publicationSections).map(([value, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value, children: t(label) }, value)) })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: t("skills.operation.publishOrderHint") })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", disabled: publishing, onClick: onClose, children: t("common.cancel") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              disabled: !section || count === 0 || publishing,
              onClick: () => void handlePublish(),
              "data-action-ui-id": "operations-batch-publish-confirm",
              children: t("skills.operation.confirmPublish")
            }
          )
        ] })
      ]
    }
  ) });
}
function useOperations() {
  const [operations, setOperations] = reactExports.useState([]);
  const [loadingOps, setLoadingOps] = reactExports.useState(false);
  const fetchOperations = reactExports.useCallback(async () => {
    setLoadingOps(true);
    try {
      const res = await gatewayFetch(API_PATHS.marketOperations);
      const data = await res.json();
      setOperations(data.operations ?? []);
    } catch {
      setOperations([]);
    } finally {
      setLoadingOps(false);
    }
  }, []);
  const batchSave = reactExports.useCallback(
    async (req) => {
      try {
        const res = await gatewayFetch(API_PATHS.marketBatchSaveOperations, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req)
        });
        const data = await res.json();
        if (data.success) {
          await fetchOperations();
        }
        return { success: data.success, conflicts: data.conflicts ?? [] };
      } catch {
        return { success: false, conflicts: [] };
      }
    },
    [fetchOperations]
  );
  const deleteOperation = reactExports.useCallback(
    async (skillName) => {
      try {
        await gatewayFetch(API_PATHS.marketDeleteOperation(skillName), {
          method: "DELETE"
        });
        await fetchOperations();
        return true;
      } catch {
        return false;
      }
    },
    [fetchOperations]
  );
  return {
    operations,
    loadingOps,
    fetchOperations,
    batchSave,
    deleteOperation
  };
}
function calculateReorderedWeights(items, visibleSkillNames, activeSkillName, overSkillName, getSkillName, getWeight) {
  const oldIndex = visibleSkillNames.indexOf(activeSkillName);
  const newIndex = visibleSkillNames.indexOf(overSkillName);
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return /* @__PURE__ */ new Map();
  const reorderedNames = [...visibleSkillNames];
  const [movedName] = reorderedNames.splice(oldIndex, 1);
  reorderedNames.splice(newIndex, 0, movedName);
  const itemByName = new Map(items.map((item) => [getSkillName(item), item]));
  const upperName = reorderedNames[newIndex - 1];
  const lowerName = reorderedNames[newIndex + 1];
  const upperItem = upperName ? itemByName.get(upperName) : void 0;
  const lowerItem = lowerName ? itemByName.get(lowerName) : void 0;
  const upperWeight = upperItem ? getWeight(upperItem) : void 0;
  const lowerWeight = lowerItem ? getWeight(lowerItem) : void 0;
  const changedWeights = /* @__PURE__ */ new Map();
  if (upperWeight === void 0 && lowerWeight === void 0) return changedWeights;
  if (upperWeight === void 0) {
    changedWeights.set(activeSkillName, (lowerWeight ?? 0) + 10);
  } else if (lowerWeight === void 0) {
    changedWeights.set(activeSkillName, upperWeight - 10);
  } else if (upperWeight - lowerWeight > 1) {
    changedWeights.set(activeSkillName, Math.floor((upperWeight + lowerWeight) / 2));
  } else {
    const shift = lowerWeight - upperWeight + 2;
    const upperNames = reorderedNames.slice(0, newIndex);
    const lowerNames = reorderedNames.slice(newIndex + 1);
    if (upperNames.length <= lowerNames.length) {
      for (const skillName of upperNames) {
        const item = itemByName.get(skillName);
        if (item) changedWeights.set(skillName, getWeight(item) + shift);
      }
      changedWeights.set(activeSkillName, lowerWeight + 1);
    } else {
      changedWeights.set(activeSkillName, upperWeight - 1);
      for (const skillName of lowerNames) {
        const item = itemByName.get(skillName);
        if (item) changedWeights.set(skillName, getWeight(item) - shift);
      }
    }
  }
  return changedWeights;
}
function reorderCategoryWeights(items, visibleSkillNames, activeSkillName, overSkillName, category) {
  const changedWeights = calculateReorderedWeights(
    items,
    visibleSkillNames,
    activeSkillName,
    overSkillName,
    (item) => item.skillName,
    (item) => item.categoryWeights[category] ?? 0
  );
  return items.map((item) => {
    const nextWeight = changedWeights.get(item.skillName);
    if (nextWeight === void 0 || item.categoryWeights[category] === nextWeight) {
      return item;
    }
    return {
      ...item,
      categoryWeights: {
        ...item.categoryWeights,
        [category]: nextWeight
      },
      dirty: true
    };
  });
}
function reorderGlobalSortWeights(items, visibleSkillNames, activeSkillName, overSkillName) {
  const changedWeights = calculateReorderedWeights(
    items,
    visibleSkillNames,
    activeSkillName,
    overSkillName,
    (item) => item.skillName,
    (item) => item.sortWeight
  );
  return items.map((item) => {
    const nextWeight = changedWeights.get(item.skillName);
    if (nextWeight === void 0 || item.sortWeight === nextWeight) return item;
    return { ...item, sortWeight: nextWeight, dirty: true };
  });
}
function sortOperationItemsByCategory(items, category) {
  if (category === "all") return [...items].sort((a, b) => b.sortWeight - a.sortWeight);
  return [...items].sort(
    (a, b) => (b.categoryWeights[category] ?? 0) - (a.categoryWeights[category] ?? 0)
  );
}
function changedOperationItems(items) {
  return items.filter((item) => item.dirty);
}
function CategoryWeightEditor({
  categories,
  value,
  isZh,
  onChange,
  maxItems = 3,
  inheritWeights = false
}) {
  const { t } = useTranslation();
  const entries = Object.entries(value);
  const selectedCodes = new Set(entries.map(([code]) => code));
  const available = categories.filter((category) => !selectedCodes.has(category.category));
  const categoryLabels = new Map(
    categories.map((category) => [category.category, isZh ? category.cn_name : category.en_name])
  );
  const handleCategoryChange = (previousCode, nextCode) => {
    if (!nextCode || nextCode === previousCode || selectedCodes.has(nextCode)) return;
    const next = { ...value };
    const weight = next[previousCode] ?? 0;
    delete next[previousCode];
    next[nextCode] = weight;
    onChange(next);
  };
  const handleAdd = () => {
    const nextCategory = available[0];
    if (!nextCategory || entries.length >= maxItems) return;
    onChange({ ...value, [nextCategory.category]: 0 });
  };
  const handleRemove = (code) => {
    const next = { ...value };
    delete next[code];
    onChange(next);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-col items-start gap-1.5", children: [
    entries.map(([code, weight]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "grid max-w-full grid-cols-[minmax(120px,160px)_88px_auto] items-center gap-1.5",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              value: code,
              onValueChange: (nextCode) => nextCode && handleCategoryChange(code, nextCode),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-7 min-w-0 text-[10px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { children: categoryLabels.get(code) ?? code }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: categories.map((category) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  SelectItem,
                  {
                    value: category.category,
                    disabled: category.category !== code && selectedCodes.has(category.category),
                    children: isZh ? category.cn_name : category.en_name
                  },
                  category.category
                )) })
              ]
            }
          ),
          inheritWeights ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: t("skills.operation.inheritWeight") }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              type: "number",
              className: "h-7 text-[10px]",
              value: weight,
              onChange: (event) => onChange({ ...value, [code]: Number(event.target.value) || 0 }),
              "aria-label": t("skills.operation.sortWeight")
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              variant: "ghost",
              size: "icon-xs",
              onClick: () => handleRemove(code),
              title: t("skills.operation.delete"),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2$1, { size: 12, strokeWidth: 1.5 })
            }
          )
        ]
      },
      code
    )),
    entries.length < maxItems && available.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Button,
      {
        type: "button",
        variant: "outline",
        size: "xs",
        className: "w-[254px] max-w-full border-dashed",
        onClick: handleAdd,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 12, strokeWidth: 1.5 }),
          t("skills.operation.add")
        ]
      }
    )
  ] });
}
function OperationsListItem({
  item,
  index,
  dragEnabled,
  isZh,
  categories,
  onToggleBadge,
  onToggleHidden,
  onConfigChange
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.skillName,
    disabled: !dragEnabled
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  const displayName = isZh ? item.displayNameZh || item.displayName : item.displayName;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      ref: setNodeRef,
      style,
      className: `grid grid-cols-[auto_auto_minmax(180px,0.8fr)_minmax(220px,0.85fr)_100px_120px_100px_minmax(320px,1.35fr)_100px] items-center gap-x-4 gap-y-2 px-3 py-2 border border-border bg-card ${item.dirty ? "ring-1 ring-primary/30" : ""}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "data-action-ui-id": `operations-published-drag-${item.skillName}`,
            className: `text-muted-foreground touch-none ${dragEnabled ? "cursor-grab active:cursor-grabbing hover:text-foreground" : "cursor-default opacity-30"}`,
            ...attributes,
            ...listeners,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(GripVertical, { size: 14, strokeWidth: 1.5 })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground w-6 text-right tabular-nums shrink-0", children: index + 1 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "select-text cursor-text text-xs font-medium text-foreground truncate min-w-0 flex-1",
            "data-text-selectable": "true",
            title: displayName,
            children: displayName
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "select-text cursor-text text-xs text-muted-foreground truncate min-w-0",
            "data-text-selectable": "true",
            title: item.skillName,
            children: item.skillName
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Select,
          {
            value: item.source,
            onValueChange: (value) => value && onConfigChange(item.skillName, { source: value }),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-7 text-[10px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "official", children: t("skills.operation.official") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "user", children: t("skills.operation.user") })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            className: "h-7 text-[10px]",
            value: item.displayUploader,
            onChange: (event) => onConfigChange(item.skillName, { displayUploader: event.target.value }),
            placeholder: t("skills.operation.displayUploader")
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            type: "number",
            className: "h-7 text-[10px] tabular-nums",
            value: item.sortWeight,
            "aria-label": t("skills.operation.globalSortWeight"),
            "data-action-ui-id": `operations-published-global-sort-weight-${item.skillName}`,
            onChange: (event) => onConfigChange(item.skillName, { sortWeight: Number(event.target.value) || 0 })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          CategoryWeightEditor,
          {
            categories,
            value: item.categoryWeights,
            isZh,
            onChange: (categoryWeights) => onConfigChange(item.skillName, {
              categories: Object.keys(categoryWeights),
              categoryWeights
            })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Select,
          {
            value: item.visibility,
            onValueChange: (value) => onConfigChange(item.skillName, {
              visibility: value
            }),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-7 text-[10px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "online", children: t("skills.operation.visibility.online") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "hidden", children: t("skills.operation.visibility.hidden") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "offline", children: t("skills.operation.visibility.offline") })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "hidden items-center gap-1.5 shrink-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: t("skills.badge.silent-install") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Switch,
            {
              checked: item.badges.includes("silent-install"),
              onCheckedChange: () => onToggleBadge(item.skillName, "silent-install")
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "hidden items-center gap-1.5 shrink-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: t("skills.operation.hidden") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: item.hidden, onCheckedChange: () => onToggleHidden(item.skillName) })
        ] })
      ]
    }
  );
}
const PUBLISHED_PAGE_SIZE = 20;
function OperationsPublishedPanel({ onExit }) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");
  const ops = useOperations();
  const { categories: configuredCategories } = useSkillCategories();
  const categoryLabels = reactExports.useMemo(
    () => new Map(
      configuredCategories.map((category) => [
        category.category,
        isZh ? category.cn_name : category.en_name
      ])
    ),
    [configuredCategories, isZh]
  );
  const [localItems, setLocalItems] = reactExports.useState([]);
  const [saving, setSaving] = reactExports.useState(false);
  const [confirmOpen, setConfirmOpen] = reactExports.useState(false);
  const [conflictOpen, setConflictOpen] = reactExports.useState(false);
  const [conflicts, setConflicts] = reactExports.useState([]);
  const [exitConfirmOpen, setExitConfirmOpen] = reactExports.useState(false);
  const [sourceFilter, setSourceFilter] = reactExports.useState("all");
  const [categoryFilter, setCategoryFilter] = reactExports.useState("all");
  const [visibilityFilter, setVisibilityFilter] = reactExports.useState("all");
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const [submitterFilter, setSubmitterFilter] = reactExports.useState("");
  const [serverSearchQuery, setServerSearchQuery] = reactExports.useState("");
  const [serverSubmitterFilter, setServerSubmitterFilter] = reactExports.useState("");
  const [page, setPage] = reactExports.useState(1);
  const [total, setTotal] = reactExports.useState(0);
  const [loading, setLoading] = reactExports.useState(false);
  const requestSequenceRef = reactExports.useRef(0);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const fetchPage = reactExports.useCallback(async () => {
    const sequence = ++requestSequenceRef.current;
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(PUBLISHED_PAGE_SIZE)
    });
    if (serverSearchQuery) params.set("query", serverSearchQuery);
    if (serverSubmitterFilter) params.set("submitter", serverSubmitterFilter);
    if (sourceFilter !== "all") params.set("source", sourceFilter);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (visibilityFilter !== "all") params.set("visibility", visibilityFilter);
    try {
      const response = await gatewayFetch(
        `${API_PATHS.marketOperatorPublished}?${params.toString()}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (sequence !== requestSequenceRef.current) return;
      const items = [];
      for (const row of data.skills ?? []) {
        const skill = row.skill;
        const op = row.operation;
        const categories = resolveConfiguredCategories(skill.categoryCodes ?? [], op?.categories);
        const item = {
          skillName: skill.name,
          displayName: toDisplayName(skill.name),
          displayNameZh: skill.displayNameZh || void 0,
          badges: op?.badges ?? [],
          hidden: op?.hidden ?? false,
          source: op?.source || (skill.source === "community" ? "user" : "official"),
          categories,
          categoryWeights: normalizeCategoryWeights(
            categories,
            op?.sort_weight ?? 0,
            op?.category_weights
          ),
          displayUploader: op?.display_uploader || skill.creator || "",
          visibility: op?.visibility ?? (op?.hidden ? "hidden" : "online"),
          cornerTag: op?.corner_tag ?? "",
          sortWeight: op?.sort_weight ?? 0,
          originalUpdatedAt: op?.updated_at ?? 0,
          dirty: false
        };
        items.push(item);
      }
      setLocalItems(items);
      setTotal(data.total ?? 0);
    } catch {
      if (sequence === requestSequenceRef.current) dedupedToast.error(t("skills.operation.loadError"));
    } finally {
      if (sequence === requestSequenceRef.current) setLoading(false);
    }
  }, [
    categoryFilter,
    page,
    serverSearchQuery,
    serverSubmitterFilter,
    sourceFilter,
    t,
    visibilityFilter
  ]);
  reactExports.useEffect(() => {
    const query = searchQuery.trim();
    const submitter = submitterFilter.trim();
    if (query === serverSearchQuery && submitter === serverSubmitterFilter) return;
    const timer = window.setTimeout(() => {
      setPage(1);
      setServerSearchQuery(query);
      setServerSubmitterFilter(submitter);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery, submitterFilter, serverSearchQuery, serverSubmitterFilter]);
  reactExports.useEffect(() => {
    void fetchPage();
  }, [fetchPage]);
  const dirtyCount = reactExports.useMemo(() => localItems.filter((i) => i.dirty).length, [localItems]);
  const visibleItems = reactExports.useMemo(
    () => sortOperationItemsByCategory(localItems, categoryFilter),
    [categoryFilter, localItems]
  );
  const handleDragEnd = reactExports.useCallback(
    (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setLocalItems((prev) => {
        const visibleSkillNames = visibleItems.map((item) => item.skillName);
        return categoryFilter === "all" ? reorderGlobalSortWeights(prev, visibleSkillNames, String(active.id), String(over.id)) : reorderCategoryWeights(
          prev,
          visibleSkillNames,
          String(active.id),
          String(over.id),
          categoryFilter
        );
      });
    },
    [categoryFilter, visibleItems]
  );
  const handleToggleBadge = reactExports.useCallback((skillName, badge) => {
    setLocalItems(
      (prev) => prev.map((item) => {
        if (item.skillName !== skillName) return item;
        const badges = item.badges.includes(badge) ? item.badges.filter((b) => b !== badge) : [...item.badges, badge];
        return { ...item, badges, dirty: true };
      })
    );
  }, []);
  const handleToggleHidden = reactExports.useCallback((skillName) => {
    setLocalItems(
      (prev) => prev.map(
        (item) => item.skillName === skillName ? { ...item, hidden: !item.hidden, dirty: true } : item
      )
    );
  }, []);
  const handleConfigChange = reactExports.useCallback((skillName, patch) => {
    setLocalItems(
      (prev) => prev.map(
        (item) => item.skillName === skillName ? {
          ...item,
          ...patch,
          hidden: patch.visibility !== void 0 ? patch.visibility !== "online" : patch.hidden ?? item.hidden,
          dirty: true
        } : item
      )
    );
  }, []);
  const handleSaveConfirm = reactExports.useCallback(async () => {
    setConfirmOpen(false);
    setSaving(true);
    const req = {
      operations: changedOperationItems(localItems).map((item) => ({
        skill_name: item.skillName,
        badges: item.badges,
        sort_weight: item.sortWeight,
        source: item.source,
        categories: item.categories,
        category_weights: item.categoryWeights,
        display_uploader: item.displayUploader,
        visibility: item.visibility,
        corner_tag: item.cornerTag,
        hidden: item.hidden,
        expected_updated_at: item.originalUpdatedAt
      }))
    };
    const result = await ops.batchSave(req);
    setSaving(false);
    if (result.success) {
      dedupedToast.success(t("skills.operation.batchSaveSuccess"));
      await fetchPage();
    } else if (result.conflicts.length > 0) {
      setConflicts(result.conflicts);
      setConflictOpen(true);
    } else {
      dedupedToast.error(t("skills.operation.saveError"));
    }
  }, [fetchPage, localItems, ops.batchSave, t]);
  const handleConflictReload = reactExports.useCallback(() => {
    setConflictOpen(false);
    void fetchPage();
  }, [fetchPage]);
  const handleExitRequest = reactExports.useCallback(() => {
    if (!onExit) return;
    if (dirtyCount > 0) {
      setExitConfirmOpen(true);
    } else {
      onExit();
    }
  }, [dirtyCount, onExit]);
  if (loading && localItems.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-12", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 16, strokeWidth: 1.5, className: "animate-spin text-muted-foreground" }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-foreground", children: t("skills.operation.panelTitle") }),
        dirtyCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-primary font-medium", children: t("skills.operation.changesCount", { count: dirtyCount }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "sm",
            loading: saving,
            disabled: dirtyCount === 0,
            onClick: () => setConfirmOpen(true),
            children: [
              !saving && /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { size: 12, strokeWidth: 1.5 }),
              t("skills.operation.saveChanges")
            ]
          }
        ),
        onExit && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", size: "sm", onClick: handleExitRequest, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 12, strokeWidth: 1.5 }),
          t("skills.operation.exitButton")
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[minmax(220px,1fr)_minmax(160px,0.7fr)_160px_180px_180px] items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "label",
        {
          htmlFor: "operations-published-search",
          className: "flex min-w-0 flex-col gap-1 text-[11px] text-muted-foreground",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.skillIdOrDisplayName") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                id: "operations-published-search",
                value: searchQuery,
                onChange: (event) => setSearchQuery(event.target.value),
                placeholder: t("skills.operation.publishedSearchPlaceholder")
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "label",
        {
          htmlFor: "operations-published-submitter",
          className: "flex min-w-0 flex-col gap-1 text-[11px] text-muted-foreground",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.submitter") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                id: "operations-published-submitter",
                value: submitterFilter,
                onChange: (event) => setSubmitterFilter(event.target.value),
                placeholder: t("skills.operation.submitter")
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-col gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: t("skills.operation.marketSection") }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Select,
          {
            value: sourceFilter,
            onValueChange: (value) => {
              if (value) {
                setPage(1);
                setSourceFilter(value);
              }
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { "aria-label": t("skills.operation.marketSection"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: t("skills.operation.allMarketSections") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "official-featured", children: t("skills.market.officialFeatured") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "community", children: t("skills.market.communityFeatured") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "official", children: t("skills.market.otherSkills") })
              ] })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-col gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: t("skills.operation.categories") }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Select,
          {
            value: categoryFilter,
            onValueChange: (value) => {
              if (value) {
                setPage(1);
                setCategoryFilter(value);
              }
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { "aria-label": t("skills.operation.categories"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { children: () => categoryFilter === "all" ? t("skills.operation.allCategories") : categoryLabels.get(categoryFilter) || categoryFilter }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: t("skills.operation.allCategories") }),
                configuredCategories.map((category) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: category.category, children: isZh ? category.cn_name : category.en_name }, category.category))
              ] })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-col gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: t("skills.operation.publicationStatus") }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Select,
          {
            value: visibilityFilter,
            onValueChange: (value) => {
              if (value) {
                setPage(1);
                setVisibilityFilter(value);
              }
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { "aria-label": t("skills.operation.publicationStatus"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: t("skills.operation.allPublicationStatuses") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "online", children: t("skills.operation.visibility.online") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "hidden", children: t("skills.operation.visibility.hidden") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "offline", children: t("skills.operation.visibility.offline") })
              ] })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[auto_auto_minmax(180px,0.8fr)_minmax(220px,0.85fr)_100px_120px_100px_minmax(320px,1.35fr)_100px] items-center gap-x-4 gap-y-2 px-3 text-[11px] text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "#" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.publishedDisplayName") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.skillId") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.source") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.displayUploader") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.globalSortWeight") }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        t("skills.operation.categories"),
        " → ",
        t("skills.operation.categorySortWeight")
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.visibility") })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DndContext, { sensors, collisionDetection: closestCenter, onDragEnd: handleDragEnd, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      SortableContext,
      {
        items: visibleItems.map((i) => i.skillName),
        strategy: verticalListSortingStrategy,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-1", children: visibleItems.map((item, index) => {
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            OperationsListItem,
            {
              item,
              categories: configuredCategories,
              index,
              dragEnabled: true,
              isZh,
              onToggleBadge: handleToggleBadge,
              onToggleHidden: handleToggleHidden,
              onConfigChange: handleConfigChange
            },
            item.skillName
          );
        }) })
      }
    ) }),
    total > PUBLISHED_PAGE_SIZE && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-end gap-2 text-xs text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "outline",
          size: "icon-xs",
          disabled: page <= 1 || loading,
          onClick: () => setPage((value) => Math.max(1, value - 1)),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { size: 14, strokeWidth: 1.5 })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        page,
        " / ",
        Math.ceil(total / PUBLISHED_PAGE_SIZE)
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "outline",
          size: "icon-xs",
          disabled: page * PUBLISHED_PAGE_SIZE >= total || loading,
          onClick: () => setPage((value) => value + 1),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 14, strokeWidth: 1.5 })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialog, { open: confirmOpen, onOpenChange: setConfirmOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { size: "sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTitle, { children: t("skills.operation.confirmSaveTitle") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogDescription, { children: t("skills.operation.confirmSaveDesc", { count: dirtyCount }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { children: t("common.cancel") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogAction, { onClick: handleSaveConfirm, children: t("skills.operation.save") })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialog, { open: conflictOpen, onOpenChange: setConflictOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { size: "sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTitle, { children: t("skills.operation.conflictTitle") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogDescription, { children: t("skills.operation.conflictDesc", { skills: conflicts.join(", ") }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogFooter, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogAction, { onClick: handleConflictReload, children: t("skills.operation.reload") }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialog, { open: exitConfirmOpen, onOpenChange: setExitConfirmOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { size: "sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTitle, { children: t("skills.operation.exitConfirmTitle") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogDescription, { children: t("skills.operation.exitConfirmDesc") })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { children: t("common.cancel") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogAction, { variant: "destructive", onClick: onExit, children: t("skills.operation.discardExit") })
      ] })
    ] }) })
  ] });
}
function PublishedSubmissionList({
  items,
  categories,
  onDetails
}) {
  const { t, i18n } = useTranslation();
  const published = items.filter((item) => item.submission?.status === "published");
  if (published.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: t("skills.operation.noPublishedSubmissions") });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto rounded-lg border border-border bg-card", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full min-w-[1320px] table-fixed text-left text-xs", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("colgroup", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[180px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[180px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[200px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[140px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[150px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[150px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[150px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[140px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[100px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[140px]" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "border-b border-border text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: [
      "skillId",
      "skillDisplayName",
      "categories",
      "submitter",
      "uid",
      "submittedAt",
      "reviewer",
      "reviewType",
      "publicationStatus",
      "actions"
    ].map((column) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "whitespace-nowrap px-3 py-2 font-medium", children: t(`skills.operation.${column}`) }, column)) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: published.map((item) => {
      const submission = item.submission;
      if (!submission) return null;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border last:border-b-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "truncate px-3 py-2 font-medium", title: submission.skill_name, children: submission.skill_name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "truncate px-3 py-2", title: submission.display_name, children: submission.display_name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 overflow-hidden", children: [
          submission.categories.map((code) => {
            const category = categories.find(
              (entry) => entry.tag_type === "category" && entry.category === code
            );
            return category ? i18n.language.startsWith("zh") ? category.cn_name : category.en_name : code;
          }).slice(0, 3).map((name) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            Badge,
            {
              variant: "outline",
              className: "h-5 shrink-0 px-1.5 text-[10px]",
              children: name
            },
            `${submission.submission_id}-${name}`
          )),
          submission.categories.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "—" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "td",
          {
            className: "truncate px-3 py-2",
            title: item.submitter_name || item.submitter_uid,
            children: item.submitter_name || item.submitter_uid || "—"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "truncate px-3 py-2 text-muted-foreground", children: item.submitter_uid }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "whitespace-nowrap px-3 py-2 text-muted-foreground", children: submission.created_at > 0 ? new Intl.DateTimeFormat(i18n.language, {
          dateStyle: "short",
          timeStyle: "short"
        }).format(new Date(submission.created_at)) : "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "truncate px-3 py-2", title: item.reviewer_name || item.reviewer_uid, children: item.reviewer_name || item.reviewer_uid || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Badge,
          {
            variant: "default",
            className: "h-5 w-fit whitespace-nowrap px-1.5 text-[10px]",
            children: item.submission_type === "update" ? t("skills.operation.reviewTypeUpdate") : t("skills.operation.reviewTypeNew")
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Badge,
          {
            variant: "secondary",
            className: "h-5 w-fit whitespace-nowrap px-1.5 text-[10px]",
            children: t("skills.operation.publishedStatus")
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            size: "xs",
            variant: "outline",
            className: "h-6 px-2 text-[11px]",
            onClick: () => onDetails(item),
            children: t("skills.operation.viewDetails")
          }
        ) })
      ] }, submission.submission_id);
    }) })
  ] }) });
}
function SubmitterFilter({ name, uid, onSearch }) {
  const { t } = useTranslation();
  const [nameDraft, setNameDraft] = reactExports.useState(name);
  const [uidDraft, setUidDraft] = reactExports.useState(uid);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "form",
    {
      className: "flex flex-wrap items-center gap-2",
      onSubmit: (event) => {
        event.preventDefault();
        onSearch(nameDraft.trim(), uidDraft.trim());
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            className: "w-56",
            value: nameDraft,
            onChange: (event) => setNameDraft(event.target.value),
            placeholder: t("skills.operation.submitterNameFilter"),
            "aria-label": t("skills.operation.submitterNameFilter"),
            "data-action-ui-id": "operations-submitter-name-filter"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            className: "w-52",
            value: uidDraft,
            onChange: (event) => setUidDraft(event.target.value),
            placeholder: t("skills.operation.submitterUid"),
            "aria-label": t("skills.operation.submitterUid"),
            "data-action-ui-id": "operations-review-uid-filter"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "submit", variant: "outline", size: "sm", children: t("common.search") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            variant: "ghost",
            size: "sm",
            onClick: () => {
              setNameDraft("");
              setUidDraft("");
              onSearch("", "");
            },
            children: t("skills.operation.resetSubmitter")
          }
        )
      ]
    }
  );
}
const emptyTaxonomyDraft = () => ({ code: "", cnName: "", enName: "" });
const emptyDraft = {
  structuredInfo: {},
  contentLocale: "zh-CN",
  skillName: "",
  displayName: "",
  summary: "",
  bestFor: "",
  howToUse: "",
  outputs: "",
  categories: [],
  stage: "",
  creator: "",
  packageVersion: ""
};
const formatOperationTime = (timestamp, language) => timestamp > 0 ? new Intl.DateTimeFormat(language, {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit"
}).format(new Date(timestamp)) : "-";
function OperationsView({ role, onExit }) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");
  const workflow = useOperatorWorkflow();
  const navigateToWorkspace = useNavigateToWorkspace();
  const platform = usePlatform();
  const [tab, setTab] = reactExports.useState("review");
  const [reviewFilter, setReviewFilter] = reactExports.useState("all");
  const [reviewStatus, setReviewStatus] = reactExports.useState("pending");
  const [submitterFilter, setSubmitterFilter] = reactExports.useState({ name: "", uid: "" });
  const [reviewerUid, setReviewerUid] = reactExports.useState("all");
  const [selected, setSelected] = reactExports.useState([]);
  const [publishDialogOpen, setPublishDialogOpen] = reactExports.useState(false);
  const [activeSubmission, setActiveSubmission] = reactExports.useState(null);
  const [draft, setDraft] = reactExports.useState(emptyDraft);
  const [rejecting, setRejecting] = reactExports.useState(null);
  const [rejectNote, setRejectNote] = reactExports.useState("");
  const [busyId, setBusyId] = reactExports.useState("");
  const [categoryOrders, setCategoryOrders] = reactExports.useState(/* @__PURE__ */ new Map());
  const [publicationDrafts, setPublicationDrafts] = reactExports.useState({});
  const [reviewPage, setReviewPage] = reactExports.useState(1);
  const [readyPage, setReadyPage] = reactExports.useState(1);
  const [publicationStatus, setPublicationStatus] = reactExports.useState("approved");
  const [detailErrors, setDetailErrors] = reactExports.useState({});
  const [newTaxonomyDrafts, setNewTaxonomyDrafts] = reactExports.useState({
    category: emptyTaxonomyDraft(),
    stage: emptyTaxonomyDraft()
  });
  const [addingTaxonomyType, setAddingTaxonomyType] = reactExports.useState(null);
  const reviewPageSize = 20;
  const loadReview = reactExports.useCallback(async () => {
    if (tab === "configuration" || tab === "published") return;
    await workflow.fetchSubmissions({
      status: tab === "ready" ? publicationStatus : "all",
      submissionType: tab === "review" && reviewFilter !== "all" ? reviewFilter : void 0,
      submitterUid: submitterFilter.uid || void 0,
      submitterName: submitterFilter.name || void 0,
      reviewerUid: tab === "review" && reviewerUid !== "all" ? reviewerUid : void 0,
      reviewStatus: tab === "review" ? reviewStatus : void 0,
      page: tab === "ready" ? readyPage : reviewPage,
      pageSize: reviewPageSize
    });
  }, [
    readyPage,
    publicationStatus,
    reviewFilter,
    reviewerUid,
    reviewPage,
    reviewStatus,
    tab,
    submitterFilter,
    workflow.fetchSubmissions
  ]);
  reactExports.useEffect(() => {
    void loadReview().catch(() => dedupedToast.error(t("skills.operation.loadError")));
  }, [loadReview, t]);
  const handleSubmitterSearch = (name, uid) => {
    setSelected([]);
    setReviewPage(1);
    setReadyPage(1);
    setSubmitterFilter({ name, uid });
  };
  reactExports.useEffect(() => {
    void workflow.fetchCategories().catch(() => dedupedToast.error(t("skills.operation.loadError")));
  }, [t, workflow.fetchCategories]);
  reactExports.useEffect(() => {
    if (role === "advanced") {
      void workflow.fetchPublishedSubmissions().catch(() => dedupedToast.error(t("skills.operation.loadError")));
    }
  }, [role, t, workflow.fetchPublishedSubmissions]);
  reactExports.useEffect(() => {
    setCategoryOrders(createTaxonomyOrderMap(workflow.categories));
  }, [workflow.categories]);
  const visibleSubmissions = reactExports.useMemo(
    () => workflow.submissions.filter(
      (item) => item.submission && (tab !== "ready" || item.submission.status === publicationStatus)
    ),
    [workflow.submissions, tab, publicationStatus]
  );
  reactExports.useEffect(() => {
    setPublicationDrafts((current) => {
      const next = { ...current };
      for (const item of visibleSubmissions) {
        const submission = item.submission;
        if (!submission || next[submission.submission_id]) continue;
        next[submission.submission_id] = {
          source: "user",
          display_section: "",
          display_uploader: submission.creator,
          categories: submission.categories,
          category_weights: normalizeCategoryWeights(submission.categories, 0),
          sort_weight: 0,
          visibility: "online",
          corner_tag: ""
        };
      }
      return next;
    });
  }, [visibleSubmissions]);
  const handleOpenDetails = (item) => {
    const submission = item.submission;
    if (!submission) return;
    setActiveSubmission(item);
    setDetailErrors({});
    const metadata = normalizeSkillDetailMetadata({ ...submission });
    const selected2 = selectSkillStructuredInfo(
      metadata.structuredInfo,
      submission.content_locale || i18n.language
    );
    setDraft({
      structuredInfo: metadata.structuredInfo ?? {},
      contentLocale: selected2.locale,
      skillName: submission.skill_name,
      displayName: submission.display_name,
      summary: selected2.info.summary,
      bestFor: selected2.info.best_for.join("\n"),
      howToUse: selected2.info.how_to_use,
      outputs: selected2.info.outputs,
      categories: submission.categories,
      stage: submission.stage,
      creator: submission.creator,
      packageVersion: submission.package_version,
      coverFile: void 0,
      showcaseFile: void 0,
      packageFile: void 0
    });
  };
  const handleAction = async (item, action) => {
    const id = item.submission?.submission_id;
    if (!id) return;
    if (action === "approve" && item.submission) {
      const submission = item.submission;
      const selected2 = selectSkillStructuredInfo(
        normalizeSkillDetailMetadata({ ...submission }).structuredInfo,
        submission.content_locale || i18n.language
      );
      const errors = validateReviewMetadata(
        {
          skillName: submission.skill_name,
          displayName: submission.display_name,
          summary: selected2.info.summary,
          bestFor: selected2.info.best_for,
          howToUse: selected2.info.how_to_use,
          outputs: selected2.info.outputs,
          locale: selected2.locale === "zh-CN" ? "zh" : "en",
          categories: submission.categories,
          stage: submission.stage,
          creator: submission.creator,
          packageVersion: submission.package_version,
          hasCover: Boolean(submission.cover_object_key),
          hasShowcase: hasSubmissionShowcase(submission.showcase),
          hasPackage: Boolean(item.source_file)
        },
        submission.skill_name
      );
      if (Object.keys(errors).length > 0) {
        handleOpenDetails(item);
        setDetailErrors(errors);
        dedupedToast.error(t("skills.operation.validationError"));
        return;
      }
    }
    setBusyId(id);
    try {
      await workflow.updateSubmission(id, { action });
      dedupedToast.success(t(`skills.operation.${action}Success`));
      await loadReview();
    } catch {
      dedupedToast.error(t("skills.operation.actionError"));
    } finally {
      setBusyId("");
    }
  };
  const handleAssignReviewer = async (item, nextReviewerUid) => {
    const submissionId = item.submission?.submission_id;
    if (!submissionId) return;
    setBusyId(submissionId);
    try {
      await workflow.updateSubmission(submissionId, {
        action: "assign_reviewer",
        reviewer_uid: nextReviewerUid
      });
      dedupedToast.success(t("skills.operation.saveSuccess"));
      await loadReview();
    } catch (error) {
      dedupedToast.error(error instanceof Error ? error.message : t("skills.operation.saveError"));
    } finally {
      setBusyId("");
    }
  };
  const handleTestInDesign = async (item) => {
    const submission = item.submission;
    if (!submission) return;
    setBusyId(submission.submission_id);
    try {
      await workflow.updateSubmission(submission.submission_id, { action: "start_design_test" });
      const staged = await workflow.stagePackage(submission.submission_id);
      if (!staged.ok || !staged.stagingPath) throw new Error(staged.error || "stage failed");
      const result = await homeService.hiloApp.createWorkspaceWithResult(
        `review-${submission.skill_name}`
      );
      const runtime = workspaceRuntimeFromOpenResult(result);
      if (!runtime) {
        toastWorkspaceOpenResult(result, t);
        return;
      }
      const prompt = t("skills.operation.designPrompt", {
        skillName: submission.skill_name,
        stagingPath: staged.stagingPath
      });
      navigateToWorkspace(runtime, { initialMessage: prompt });
    } catch {
      dedupedToast.error(t("skills.operation.designError"));
    } finally {
      setBusyId("");
    }
  };
  const handleRevealPackage = async (item) => {
    const id = item.submission?.submission_id;
    if (!id) return;
    setBusyId(id);
    try {
      const staged = await workflow.stagePackage(id);
      const target = staged.sourceFilePath || staged.stagingPath;
      if (!target) throw new Error(staged.error || "download failed");
      await platform.shell.showItemInFolder?.(target);
    } catch {
      dedupedToast.error(t("skills.operation.sourceFileError"));
    } finally {
      setBusyId("");
    }
  };
  const handleSaveDetails = async () => {
    const submission = activeSubmission?.submission;
    const id = submission?.submission_id;
    if (!id || !submission) return;
    const errors = validateReviewMetadata(
      {
        skillName: draft.skillName,
        displayName: draft.displayName,
        summary: draft.summary,
        bestFor: draft.bestFor.split("\n").map((value) => value.trim()).filter(Boolean),
        howToUse: draft.howToUse,
        outputs: draft.outputs,
        locale: draft.contentLocale === "zh-CN" ? "zh" : "en",
        categories: draft.categories,
        stage: draft.stage,
        creator: draft.creator,
        packageVersion: draft.packageVersion,
        hasCover: Boolean(draft.coverFile || submission.cover_object_key),
        hasShowcase: Boolean(draft.showcaseFile) || hasSubmissionShowcase(submission.showcase),
        hasPackage: Boolean(draft.packageFile || activeSubmission.source_file)
      },
      submission.skill_name
    );
    if (Object.keys(errors).length > 0) {
      setDetailErrors(errors);
      dedupedToast.error(t("skills.operation.validationError"));
      return;
    }
    setBusyId(id);
    try {
      const coverObjectKey = draft.coverFile ? await uploadCreatorPlanAsset(submission.skill_name, "cover", draft.coverFile) : void 0;
      const showcase = draft.showcaseFile ? [await uploadCreatorPlanAsset(submission.skill_name, "showcase", draft.showcaseFile)] : normalizeSubmissionShowcase(submission.showcase);
      const zipObjectKey = draft.packageFile ? await workflow.uploadPackage(id, submission.skill_name, draft.packageFile) : void 0;
      await workflow.updateSubmission(id, {
        action: submission.status === "published" ? "save_published" : "save",
        display_name: draft.displayName,
        structured_info: {
          ...draft.structuredInfo,
          [draft.contentLocale]: {
            summary: draft.summary.trim(),
            best_for: draft.bestFor.split("\n").map((value) => value.trim()).filter(Boolean),
            how_to_use: draft.howToUse.trim(),
            outputs: draft.outputs.trim()
          }
        },
        content_locale: draft.contentLocale,
        categories: draft.categories,
        stage: draft.stage,
        creator: draft.creator,
        package_version: draft.packageVersion,
        cover_object_key: coverObjectKey,
        showcase,
        zip_object_key: zipObjectKey
      });
      setActiveSubmission(null);
      dedupedToast.success(t("skills.operation.detailsSaved"));
      await loadReview();
      if (submission.status === "published") await workflow.fetchPublishedSubmissions();
    } catch {
      dedupedToast.error(t("skills.operation.actionError"));
    } finally {
      setBusyId("");
    }
  };
  const handleAddTaxonomy = (tagType) => {
    const taxonomyDraft = newTaxonomyDrafts[tagType];
    const code = taxonomyDraft.code.trim();
    const duplicate = workflow.categories.some(
      (item) => item.tag_type === tagType && item.category === code
    );
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(code) || !taxonomyDraft.cnName.trim() || !taxonomyDraft.enName.trim() || duplicate) {
      dedupedToast.error(
        t(duplicate ? "skills.operation.duplicateCode" : "skills.operation.invalidTaxonomy")
      );
      return;
    }
    workflow.addCategory({
      category: code,
      tag_type: tagType,
      cn_name: taxonomyDraft.cnName.trim(),
      en_name: taxonomyDraft.enName.trim(),
      cn_description: "",
      en_description: "",
      sort_order: (workflow.categories.filter((item) => item.tag_type === tagType).length + 1) * 10,
      enabled: true
    });
    setNewTaxonomyDrafts((current) => ({
      ...current,
      [tagType]: emptyTaxonomyDraft()
    }));
    setAddingTaxonomyType(null);
  };
  const handleReject = async () => {
    const id = rejecting?.submission?.submission_id;
    if (!id || !rejectNote.trim()) return;
    setBusyId(id);
    try {
      await workflow.updateSubmission(id, { action: "reject", review_note: rejectNote.trim() });
      setRejecting(null);
      setRejectNote("");
      dedupedToast.success(t("skills.operation.rejectSuccess"));
      await loadReview();
    } catch {
      dedupedToast.error(t("skills.operation.actionError"));
    } finally {
      setBusyId("");
    }
  };
  const handleBatchApprove = async () => {
    if (selected.length === 0) return;
    const invalidNames = visibleSubmissions.flatMap((item) => {
      const submission = item.submission;
      if (!submission || !selected.includes(submission.submission_id)) return [];
      const content = selectSkillStructuredInfo(
        normalizeSkillDetailMetadata({ ...submission }).structuredInfo,
        submission.content_locale || i18n.language
      );
      const errors = validateReviewMetadata(
        {
          skillName: submission.skill_name,
          displayName: submission.display_name,
          summary: content.info.summary,
          bestFor: content.info.best_for,
          howToUse: content.info.how_to_use,
          outputs: content.info.outputs,
          locale: content.locale === "zh-CN" ? "zh" : "en",
          categories: submission.categories,
          stage: submission.stage,
          creator: submission.creator,
          packageVersion: submission.package_version,
          hasCover: Boolean(submission.cover_object_key),
          hasShowcase: hasSubmissionShowcase(submission.showcase),
          hasPackage: Boolean(item.source_file)
        },
        submission.skill_name
      );
      return Object.keys(errors).length > 0 ? [submission.skill_name] : [];
    });
    if (invalidNames.length > 0) {
      dedupedToast.error(t("skills.operation.batchInvalid", { skills: invalidNames.join(", ") }));
      return;
    }
    try {
      const result = await workflow.batchApprove(selected);
      if (!result.ok) {
        const invalidSkillNames = result.invalid_skill_names ?? [];
        const invalidItems = invalidSkillNames.length > 0 ? invalidSkillNames : result.invalid_submission_ids;
        dedupedToast.error(t("skills.operation.batchInvalid", { skills: invalidItems.join(", ") }));
        return;
      }
      setSelected([]);
      dedupedToast.success(t("skills.operation.batchApproveSuccess"));
      await loadReview();
    } catch {
      dedupedToast.error(t("skills.operation.actionError"));
    }
  };
  const handleSaveCategories = async () => {
    if (hasDuplicateEnabledTaxonomyOrders(workflow.categories, categoryOrders)) {
      dedupedToast.error(t("skills.operation.duplicateSortOrder"));
      return;
    }
    try {
      await workflow.saveCategories(
        (categories) => categories.map((category) => ({
          ...category,
          sort_order: categoryOrders.get(taxonomyItemKey(category)) ?? 1e3
        }))
      );
      dedupedToast.success(t("skills.operation.categorySaved"));
    } catch {
      dedupedToast.error(t("skills.operation.actionError"));
    }
  };
  const publishSelected = async (submissionIds, section) => {
    if (tab !== "ready" || publicationStatus !== "approved" || workflow.loading || submissionIds.length === 0 || submissionIds.some(
      (id) => !visibleSubmissions.some(
        (item) => item.submission?.submission_id === id && item.submission.status === "approved"
      )
    ))
      return false;
    try {
      const publications = buildBatchPublications(
        submissionIds,
        publicationDrafts,
        section,
        workflow.categories.filter((category) => category.enabled !== false && category.tag_type === "category").map((category) => category.category)
      );
      const result = await workflow.publish(publications);
      if (!result.ok) {
        const invalid = result.invalid_skill_names?.length > 0 ? result.invalid_skill_names : result.invalid_submission_ids;
        dedupedToast.error(t("skills.operation.publishInvalid", { skills: invalid.join(", ") }));
        return false;
      }
      setSelected([]);
      dedupedToast.success(t("skills.operation.publishSuccess"));
      await loadReview().catch(() => dedupedToast.error(t("skills.operation.loadError")));
      return true;
    } catch (error) {
      if (error instanceof BatchPublicationValidationError) {
        const skills = error.submissionIds.map((id) => {
          const submission = visibleSubmissions.find(
            (item) => item.submission?.submission_id === id
          )?.submission;
          return submission?.skill_name || id;
        });
        dedupedToast.error(
          t(
            error.reason === "missing-category" ? "skills.operation.publishMissingCategories" : "skills.operation.publishInvalidCategories",
            { skills: skills.join(", ") }
          )
        );
        setPublishDialogOpen(false);
      } else {
        const key = error instanceof GatewayHttpError ? publicationValidationMessage(error.details) : void 0;
        dedupedToast.error(t(key ?? "skills.operation.actionError"));
      }
      return false;
    }
  };
  const handlePublish = async (section) => publishSelected(selected, section);
  const handlePublishOne = async (item) => {
    const submissionId = item.submission?.submission_id;
    if (!submissionId) return;
    const section = publicationDrafts[submissionId]?.display_section;
    if (!section || !Object.hasOwn(publicationSections, section)) {
      dedupedToast.error(t("skills.operation.publishSectionPlaceholder"));
      return;
    }
    await publishSelected([submissionId], section);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4", "data-action-ui-id": "skills-operations-workspace", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold text-foreground", children: t("skills.operation.title") }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", size: "sm", onClick: onExit, "data-action-ui-id": "operations-exit", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 14, strokeWidth: 1.5 }),
        t("skills.operation.exitButton")
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium", children: role === "advanced" ? t("skills.operation.advancedPermissionTitle") : t("skills.operation.reviewerPermissionTitle") }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", children: role === "advanced" ? t("skills.operation.fullOperations") : t("skills.operation.reviewOnly") })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Tabs,
      {
        value: tab,
        onValueChange: (value) => {
          setSelected([]);
          setTab(value);
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "review", "data-action-ui-id": "operations-review-tab", children: [
              t("skills.operation.reviewTab"),
              workflow.pendingTotal > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", className: "ml-2", children: workflow.pendingTotal })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              TabsTrigger,
              {
                value: "ready",
                disabled: role !== "advanced",
                "data-action-ui-id": "operations-ready-tab",
                children: [
                  t("skills.operation.readyTab"),
                  workflow.approvedTotal > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", className: "ml-2", children: workflow.approvedTotal })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              TabsTrigger,
              {
                value: "configuration",
                disabled: role !== "advanced",
                "data-action-ui-id": "operations-configuration-tab",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Settings2, { size: 14, strokeWidth: 1.5 }),
                  t("skills.operation.configurationTab")
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TabsTrigger,
              {
                value: "published",
                disabled: role !== "advanced",
                "data-action-ui-id": "operations-published-tab",
                children: t("skills.operation.publishedConfig")
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "review", className: "pt-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium", children: t("skills.operation.pendingReviewList") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", children: workflow.pendingTotal })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "shrink-0 text-xs text-muted-foreground", children: t("skills.operation.reviewStatus") }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Select,
                  {
                    value: reviewStatus,
                    onValueChange: (value) => {
                      setReviewPage(1);
                      setSelected([]);
                      setReviewStatus(value);
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-40", "data-action-ui-id": "operations-review-status-filter", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "pending", children: t("skills.operation.reviewStatusPending") }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "approved", children: t("skills.operation.reviewStatusApproved") }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "rejected", children: t("skills.operation.reviewStatusRejected") })
                      ] })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "shrink-0 text-xs text-muted-foreground", children: t("skills.operation.reviewer") }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Select,
                  {
                    value: reviewerUid,
                    onValueChange: (value) => {
                      if (value === null) return;
                      setReviewPage(1);
                      setSelected([]);
                      setReviewerUid(value);
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-40", "data-action-ui-id": "operations-reviewer-filter", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: t("skills.operation.reviewerAll") }),
                        workflow.reviewers.map((reviewer) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: reviewer.uid, children: reviewer.name }, reviewer.uid))
                      ] })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "shrink-0 text-xs text-muted-foreground", children: t("skills.operation.reviewType") }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Select,
                  {
                    value: reviewFilter,
                    onValueChange: (value) => {
                      setReviewPage(1);
                      setSelected([]);
                      setReviewFilter(value);
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-44", "data-action-ui-id": "operations-review-type-filter", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { children: reviewFilter === "update" ? t("skills.operation.reviewTypeUpdate") : reviewFilter === "new" ? t("skills.operation.reviewTypeNew") : t("skills.operation.reviewTypeAll") }) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: t("skills.operation.reviewTypeAll") }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "update", children: t("skills.operation.reviewTypeUpdate") }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "new", children: t("skills.operation.reviewTypeNew") })
                      ] })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                SubmitterFilter,
                {
                  ...submitterFilter,
                  onSearch: handleSubmitterSearch
                },
                `review-${submitterFilter.name}-${submitterFilter.uid}`
              ),
              reviewStatus === "pending" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Checkbox,
                  {
                    checked: selected.length > 0 && selected.length === visibleSubmissions.length,
                    onCheckedChange: (checked) => setSelected(
                      checked ? visibleSubmissions.flatMap(
                        (item) => item.submission ? [item.submission.submission_id] : []
                      ) : []
                    )
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: t("skills.operation.selectCurrentPage") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", children: t("skills.operation.selectedCount", { count: selected.length }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Button,
                  {
                    size: "sm",
                    disabled: selected.length === 0,
                    onClick: () => void handleBatchApprove(),
                    "data-action-ui-id": "operations-review-batch-approve",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 14, strokeWidth: 1.5 }),
                      t("skills.operation.approveSelected", { count: selected.length })
                    ]
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ReviewList,
              {
                items: visibleSubmissions,
                selected,
                busyId,
                loading: workflow.loading,
                onSelect: setSelected,
                onDetails: handleOpenDetails,
                onRevealPackage: (item) => void handleRevealPackage(item),
                onTest: handleTestInDesign,
                onPass: (item) => void handleAction(item, "pass_design"),
                onReject: setRejecting,
                onApprove: (item) => void handleAction(item, "approve"),
                categories: workflow.categories,
                reviewers: workflow.reviewers,
                role,
                onAssignReviewer: (item, nextReviewerUid) => void handleAssignReviewer(item, nextReviewerUid),
                isZh
              }
            ),
            workflow.total > reviewPageSize && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "outline",
                  size: "icon-xs",
                  disabled: reviewPage <= 1,
                  onClick: () => {
                    setSelected([]);
                    setReviewPage((page) => page - 1);
                  },
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { size: 14 })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                reviewPage,
                " / ",
                Math.ceil(workflow.total / reviewPageSize)
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "outline",
                  size: "icon-xs",
                  disabled: reviewPage * reviewPageSize >= workflow.total,
                  onClick: () => {
                    setSelected([]);
                    setReviewPage((page) => page + 1);
                  },
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 14 })
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "ready", className: "pt-4", children: role === "advanced" && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border bg-card p-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium", children: t(
                  publicationStatus === "approved" ? "skills.operation.readyToPublish" : "skills.operation.publishedStatus"
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", children: workflow.total })
              ] }),
              publicationStatus === "approved" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Checkbox,
                  {
                    disabled: workflow.loading,
                    checked: selected.length > 0 && selected.length === visibleSubmissions.length,
                    onCheckedChange: (checked) => setSelected(
                      checked ? visibleSubmissions.flatMap(
                        (item) => item.submission ? [item.submission.submission_id] : []
                      ) : []
                    )
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: t("skills.operation.selectCurrentPage") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", children: t("skills.operation.selectedCount", { count: selected.length }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    disabled: selected.length === 0 || workflow.loading,
                    onClick: () => setPublishDialogOpen(true),
                    "data-action-ui-id": "operations-publish-selected",
                    children: t("skills.operation.publishSelected", { count: selected.length })
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex flex-wrap items-center gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "ready-publication-status", children: t("skills.operation.publicationStatus") }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Select,
                  {
                    value: publicationStatus,
                    onValueChange: (value) => {
                      if (value !== "approved" && value !== "published") return;
                      setSelected([]);
                      setReadyPage(1);
                      setPublishDialogOpen(false);
                      setActiveSubmission(null);
                      setPublicationStatus(value);
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        SelectTrigger,
                        {
                          id: "ready-publication-status",
                          className: "w-36",
                          "data-action-ui-id": "operations-publication-status-filter",
                          children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { children: t(
                            publicationStatus === "approved" ? "skills.operation.readyStatus" : "skills.operation.publishedStatus"
                          ) })
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "approved", children: t("skills.operation.readyStatus") }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "published", children: t("skills.operation.publishedStatus") })
                      ] })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                SubmitterFilter,
                {
                  ...submitterFilter,
                  onSearch: handleSubmitterSearch
                },
                `ready-${submitterFilter.name}-${submitterFilter.uid}`
              )
            ] }),
            workflow.loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center py-10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "animate-spin", size: 18 }) }) : publicationStatus === "published" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              PublishedSubmissionList,
              {
                items: visibleSubmissions,
                categories: workflow.categories,
                onDetails: handleOpenDetails
              }
            ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
              ReadyList,
              {
                items: visibleSubmissions,
                selected,
                drafts: publicationDrafts,
                categories: workflow.categories.filter(
                  (category) => category.tag_type === "category" && category.enabled !== false
                ),
                onSelect: setSelected,
                onDraftChange: (submissionId, publication) => setPublicationDrafts((current) => ({
                  ...current,
                  [submissionId]: publication
                })),
                onDetails: handleOpenDetails,
                onPublish: handlePublishOne
              }
            ),
            workflow.total > reviewPageSize && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "outline",
                  size: "icon-xs",
                  disabled: workflow.loading || readyPage <= 1,
                  onClick: () => {
                    setSelected([]);
                    setReadyPage((page) => page - 1);
                  },
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { size: 14, strokeWidth: 1.5 })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                readyPage,
                " / ",
                Math.ceil(workflow.total / reviewPageSize)
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "outline",
                  size: "icon-xs",
                  disabled: workflow.loading || readyPage * reviewPageSize >= workflow.total,
                  onClick: () => {
                    setSelected([]);
                    setReadyPage((page) => page + 1);
                  },
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 14, strokeWidth: 1.5 })
                }
              )
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "configuration", className: "pt-4", children: role === "advanced" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border bg-card p-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium", children: t("skills.operation.categoryConfig") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: t("skills.operation.categoryOrderHint") })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  size: "sm",
                  onClick: () => void handleSaveCategories(),
                  "data-action-ui-id": "operations-category-save",
                  children: t("common.save")
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-6", children: ["category", "stage"].map((tagType) => {
              return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs font-medium", children: t(`skills.operation.tagType.${tagType}`) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      type: "button",
                      variant: "outline",
                      size: "sm",
                      onClick: () => {
                        setNewTaxonomyDrafts((current) => ({
                          ...current,
                          [tagType]: emptyTaxonomyDraft()
                        }));
                        setAddingTaxonomyType(tagType);
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 14, strokeWidth: 1.5 }),
                        t("skills.operation.addTaxonomy")
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[minmax(140px,0.7fr)_1fr_1fr_80px_64px_48px] gap-2 px-2 text-[11px] text-muted-foreground", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.code") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.titleZh") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.titleEn") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-center", children: t("skills.operation.sortOrder") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-center", children: t("skills.operation.enabled") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-center", children: t("skills.operation.actions") })
                ] }),
                taxonomyItemsForConfiguration(workflow.categories, tagType).map(
                  (category) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "grid grid-cols-[minmax(140px,0.7fr)_1fr_1fr_80px_64px_48px] items-center gap-2 rounded-lg border border-border p-2",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Input,
                          {
                            className: "h-7 min-w-0 text-xs",
                            value: category.category,
                            disabled: true
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Input,
                          {
                            className: "h-7 min-w-0 text-xs",
                            value: category.cn_name,
                            onChange: (event) => workflow.updateCategory(category.tag_type, category.category, {
                              cn_name: event.target.value
                            })
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Input,
                          {
                            className: "h-7 min-w-0 text-xs",
                            value: category.en_name,
                            onChange: (event) => workflow.updateCategory(category.tag_type, category.category, {
                              en_name: event.target.value
                            })
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Input,
                          {
                            type: "number",
                            className: "h-7 w-20",
                            value: categoryOrders.get(taxonomyItemKey(category)) ?? "",
                            onChange: (event) => setCategoryOrders((current) => {
                              const next = new Map(current);
                              next.set(taxonomyItemKey(category), Number(event.target.value));
                              return next;
                            })
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Switch,
                          {
                            className: "justify-self-center",
                            checked: category.enabled !== false,
                            onCheckedChange: (enabled) => workflow.updateCategory(category.tag_type, category.category, {
                              enabled
                            })
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Button,
                          {
                            type: "button",
                            variant: "ghost",
                            size: "icon-xs",
                            className: "justify-self-center",
                            title: t("common.delete"),
                            onClick: () => workflow.updateCategory(category.tag_type, category.category, {
                              enabled: false
                            }),
                            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2$1, { size: 14 })
                          }
                        )
                      ]
                    },
                    taxonomyItemKey(category)
                  )
                )
              ] }, tagType);
            }) })
          ] }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "published", className: "pt-4", children: role === "advanced" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-6", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(OperationsPublishedPanel, {}),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border bg-card p-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mb-3 text-sm font-medium", children: t("skills.operation.publishedDetails") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-2", children: workflow.publishedSubmissions.map((item) => {
                const submission = item.submission;
                if (!submission) return null;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: "flex items-center gap-3 rounded-lg border border-border p-3",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-sm font-medium", children: submission.display_name }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "truncate text-xs text-muted-foreground", children: [
                          submission.skill_name,
                          " · ",
                          submission.package_version
                        ] })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "xs", variant: "outline", onClick: () => handleOpenDetails(item), children: t("skills.operation.editDetails") })
                    ]
                  },
                  submission.submission_id
                );
              }) })
            ] })
          ] }) })
        ]
      }
    ),
    publishDialogOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      BatchPublishDialog,
      {
        count: selected.length,
        onClose: () => setPublishDialogOpen(false),
        onPublish: handlePublish
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Dialog,
      {
        open: Boolean(addingTaxonomyType),
        onOpenChange: (open) => !open && setAddingTaxonomyType(null),
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "rounded-xl", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: t("skills.operation.addTaxonomyTitle", {
            type: addingTaxonomyType ? t(`skills.operation.tagType.${addingTaxonomyType}`) : ""
          }) }) }),
          addingTaxonomyType && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t("skills.operation.taxonomyCode"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                value: newTaxonomyDrafts[addingTaxonomyType].code,
                onChange: (event) => setNewTaxonomyDrafts((current) => ({
                  ...current,
                  [addingTaxonomyType]: {
                    ...current[addingTaxonomyType],
                    code: event.target.value
                  }
                }))
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t("skills.operation.titleZh"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                value: newTaxonomyDrafts[addingTaxonomyType].cnName,
                onChange: (event) => setNewTaxonomyDrafts((current) => ({
                  ...current,
                  [addingTaxonomyType]: {
                    ...current[addingTaxonomyType],
                    cnName: event.target.value
                  }
                }))
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t("skills.operation.titleEn"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                value: newTaxonomyDrafts[addingTaxonomyType].enName,
                onChange: (event) => setNewTaxonomyDrafts((current) => ({
                  ...current,
                  [addingTaxonomyType]: {
                    ...current[addingTaxonomyType],
                    enName: event.target.value
                  }
                }))
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setAddingTaxonomyType(null), children: t("common.cancel") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                onClick: () => {
                  if (addingTaxonomyType) handleAddTaxonomy(addingTaxonomyType);
                },
                "data-action-ui-id": "operations-taxonomy-add-confirm",
                children: t("skills.operation.addTaxonomy")
              }
            )
          ] })
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      SubmissionDetailsDialog,
      {
        readOnly: tab === "ready" && publicationStatus === "published",
        item: activeSubmission,
        draft,
        busy: Boolean(
          activeSubmission?.submission && busyId === activeSubmission.submission.submission_id
        ),
        isZh,
        categories: workflow.categories.filter((category) => category.enabled !== false),
        onDraftChange: setDraft,
        onOpenChange: (open) => !open && setActiveSubmission(null),
        onSave: () => void handleSaveDetails(),
        errors: detailErrors
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: Boolean(rejecting), onOpenChange: (open) => !open && setRejecting(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "rounded-xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: t("skills.operation.rejectTitle") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: t("skills.operation.rejectDescription") })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, { value: rejectNote, onChange: (event) => setRejectNote(event.target.value) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setRejecting(null), children: t("common.cancel") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "destructive",
            disabled: !rejectNote.trim(),
            onClick: () => void handleReject(),
            "data-action-ui-id": "operations-reject-confirm",
            children: t("skills.operation.reject")
          }
        )
      ] })
    ] }) })
  ] });
}
function ReviewList({
  items,
  selected,
  busyId,
  loading,
  onSelect,
  onDetails,
  onRevealPackage,
  onTest,
  onPass,
  onReject,
  onApprove,
  categories,
  reviewers,
  role,
  onAssignReviewer,
  isZh
}) {
  const { t, i18n } = useTranslation();
  if (loading)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center py-10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "animate-spin", size: 18 }) });
  if (items.length === 0)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-10 text-center text-sm text-muted-foreground", children: t("skills.operation.noSubmissions") });
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto rounded-xl border border-border bg-card", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-[1850px] text-xs", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[28px_minmax(150px,1.25fr)_minmax(130px,1fr)_minmax(190px,.8fr)_minmax(100px,.8fr)_minmax(145px,1.1fr)_minmax(128px,1fr)_minmax(100px,.8fr)_minmax(120px,1fr)_minmax(85px,.7fr)_minmax(460px,2fr)] items-center gap-2 border-b border-border px-3 py-2 font-medium text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": "true" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.skillId") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.skillDisplayName") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.categories") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.submitter") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.uid") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.submittedAt") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.reviewType") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.reviewer") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.reviewStatus") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("skills.operation.actions") })
    ] }),
    items.map((item) => {
      const submission = item.submission;
      if (!submission) return null;
      const id = submission.submission_id;
      const busy = busyId === id;
      const categoryNames = submission.categories.map((code) => {
        const category = categories.find(
          (candidate) => candidate.tag_type === "category" && candidate.category === code
        );
        return category ? isZh ? category.cn_name : category.en_name : code;
      });
      const reviewerName = reviewers.find((reviewer) => reviewer.uid === item.reviewer_uid)?.name || item.reviewer_name || "";
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "article",
        {
          className: "grid grid-cols-[28px_minmax(150px,1.25fr)_minmax(130px,1fr)_minmax(190px,.8fr)_minmax(100px,.8fr)_minmax(145px,1.1fr)_minmax(128px,1fr)_minmax(100px,.8fr)_minmax(120px,1fr)_minmax(85px,.7fr)_minmax(460px,2fr)] items-center gap-2 border-b border-border px-3 py-2 last:border-b-0",
          children: [
            submission.status === "pending" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              Checkbox,
              {
                className: "size-4",
                checked: selected.includes(id),
                onCheckedChange: (checked) => onSelect(checked ? [...selected, id] : selected.filter((value) => value !== id))
              }
            ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 truncate font-medium", title: submission.skill_name, children: submission.skill_name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate", title: submission.display_name, children: submission.display_name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-w-0 items-center gap-1 overflow-hidden", children: categoryNames.length > 0 ? categoryNames.slice(0, 3).map((name, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              Badge,
              {
                variant: "outline",
                className: "h-5 shrink-0 px-1.5 text-[10px]",
                children: name
              },
              `${submission.submission_id}-${submission.categories[index]}`
            )) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "—" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate", title: item.submitter_name || item.submitter_uid, children: item.submitter_name || item.submitter_uid || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate text-muted-foreground", title: item.submitter_uid, children: item.submitter_uid || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "whitespace-nowrap text-muted-foreground", children: formatOperationTime(submission.created_at, i18n.language) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "default", className: "h-5 w-fit whitespace-nowrap px-1.5 text-[10px]", children: item.submission_type === "update" ? t("skills.operation.reviewTypeUpdate") : t("skills.operation.reviewTypeNew") }),
            role === "advanced" && submission.status === "pending" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Select,
              {
                value: item.reviewer_uid || void 0,
                disabled: busy,
                onValueChange: (value) => {
                  if (value !== null) onAssignReviewer(item, value);
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    SelectTrigger,
                    {
                      className: "h-7 min-w-0 w-full px-2 text-xs",
                      "data-action-ui-id": `operations-reviewer-${id}`,
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: t("skills.operation.reviewerUnassigned"), children: reviewerName || void 0 })
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: reviewers.map((reviewer) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: reviewer.uid, children: reviewer.name }, reviewer.uid)) })
                ]
              }
            ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate", title: item.reviewer_name, children: item.reviewer_name || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Badge,
              {
                variant: submission.status === "pending" ? "outline" : submission.status === "rejected" ? "destructive" : "secondary",
                className: "h-5 w-fit whitespace-nowrap px-1.5 text-[10px]",
                children: submission.status === "pending" ? t("skills.operation.reviewStatusPending") : submission.status === "rejected" ? t("skills.operation.reviewStatusRejected") : t("skills.operation.reviewStatusApproved")
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-max items-center gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  size: "xs",
                  variant: "outline",
                  className: "h-6 shrink-0 px-2 text-[11px]",
                  onClick: () => onDetails(item),
                  "data-action-ui-id": `operations-review-details-${id}`,
                  children: t("skills.operation.viewDetails")
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  type: "button",
                  size: "xs",
                  variant: "link",
                  className: "h-6 shrink-0 px-1 text-[11px]",
                  disabled: busy,
                  onClick: () => onRevealPackage(item),
                  title: item.source_file,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { size: 12, strokeWidth: 1.5 }),
                    t("skills.operation.sourceFile")
                  ]
                }
              ),
              submission.status === "pending" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  size: "xs",
                  variant: "outline",
                  className: "h-6 shrink-0 px-2 text-[11px]",
                  disabled: busy,
                  onClick: () => onTest(item),
                  "data-action-ui-id": `operations-review-test-${id}`,
                  children: t("skills.operation.testDesign")
                }
              ),
              submission.status === "pending" && item.design_status === "testing" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  size: "xs",
                  variant: "outline",
                  className: "h-6 shrink-0 px-2 text-[11px]",
                  disabled: busy,
                  onClick: () => onPass(item),
                  "data-action-ui-id": `operations-review-pass-${id}`,
                  children: t("skills.operation.markPassed")
                }
              ),
              submission.status === "pending" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  size: "xs",
                  variant: "destructive",
                  className: "h-6 shrink-0 px-2 text-[11px]",
                  disabled: busy,
                  onClick: () => onReject(item),
                  "data-action-ui-id": `operations-review-reject-${id}`,
                  children: t("skills.operation.reject")
                }
              ),
              submission.status === "pending" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  size: "xs",
                  className: "h-6 shrink-0 px-2 text-[11px]",
                  disabled: busy,
                  onClick: () => onApprove(item),
                  "data-action-ui-id": `operations-review-approve-${id}`,
                  children: t("skills.operation.approveToConfig")
                }
              )
            ] })
          ]
        },
        id
      );
    })
  ] }) });
}
function ReadyList({
  items,
  selected,
  drafts,
  categories,
  onSelect,
  onDraftChange,
  onDetails,
  onPublish
}) {
  const { t, i18n } = useTranslation();
  const [publishingId, setPublishingId] = reactExports.useState("");
  if (items.length === 0)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: t("skills.operation.noReady") });
  const handlePublish = async (item) => {
    const id = item.submission?.submission_id;
    if (!id || publishingId) return;
    setPublishingId(id);
    try {
      await onPublish(item);
    } finally {
      setPublishingId("");
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto rounded-lg border border-border bg-card", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full min-w-[1520px] table-fixed text-left text-xs", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("colgroup", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-9" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[180px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[180px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[180px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[140px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[150px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[150px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[140px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[150px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[100px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[300px]" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "border-b border-border text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 font-medium", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: t("project.selectRow.pick") }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 font-medium", children: t("skills.operation.skillId") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 font-medium", children: t("skills.operation.skillDisplayName") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 font-medium", children: t("skills.operation.categories") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 font-medium", children: t("skills.operation.submitter") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 font-medium", children: t("skills.operation.uid") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 font-medium", children: t("skills.operation.submittedAt") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 font-medium", children: t("skills.operation.reviewer") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 font-medium", children: t("skills.operation.reviewType") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 font-medium", children: t("skills.operation.publicationStatus") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 font-medium", children: t("skills.operation.actions") })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: items.map((item) => {
      const submission = item.submission;
      if (!submission) return null;
      const id = submission.submission_id;
      const draft = drafts[id];
      if (!draft) return null;
      const categoryNames = draft.categories.map((code) => {
        const category = categories.find((candidate) => candidate.category === code);
        return category ? i18n.language.startsWith("zh") ? category.cn_name : category.en_name : code;
      });
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border last:border-b-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 align-middle", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Checkbox,
          {
            className: "size-4",
            checked: selected.includes(id),
            onCheckedChange: (checked) => onSelect(
              checked ? [...selected, id] : selected.filter((value) => value !== id)
            )
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "truncate px-3 py-2 font-medium", title: submission.skill_name, children: submission.skill_name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "truncate px-3 py-2", title: submission.display_name, children: submission.display_name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-1 overflow-hidden", children: categoryNames.length > 0 ? categoryNames.slice(0, 3).map((name, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          Badge,
          {
            variant: "outline",
            className: "h-5 shrink-0 px-1.5 text-[10px]",
            children: name
          },
          `${id}-${draft.categories[index]}`
        )) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "—" }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "td",
          {
            className: "truncate px-3 py-2",
            title: item.submitter_name || item.submitter_uid,
            children: item.submitter_name || item.submitter_uid || "—"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "truncate px-3 py-2 text-muted-foreground", title: item.submitter_uid, children: item.submitter_uid || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "whitespace-nowrap px-3 py-2 text-muted-foreground", children: formatOperationTime(submission.created_at, i18n.language) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "truncate px-3 py-2", title: item.reviewer_name || item.reviewer_uid, children: item.reviewer_name || item.reviewer_uid || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Badge,
          {
            variant: "default",
            className: "h-5 w-fit whitespace-nowrap px-1.5 text-[10px]",
            children: item.submission_type === "update" ? t("skills.operation.reviewTypeUpdate") : t("skills.operation.reviewTypeNew")
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Badge,
          {
            variant: "secondary",
            className: "h-5 w-fit whitespace-nowrap px-1.5 text-[10px]",
            children: t("skills.operation.readyStatus")
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              size: "xs",
              variant: "outline",
              className: "h-6 shrink-0 px-2 text-[11px]",
              onClick: () => onDetails(item),
              children: t("skills.operation.viewDetails")
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              value: draft.display_section || void 0,
              onValueChange: (value) => value && onDraftChange(id, {
                ...draft,
                display_section: value
              }),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-6 w-[126px] shrink-0 px-2 text-[11px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  SelectValue,
                  {
                    placeholder: t("skills.operation.publishSectionPlaceholder")
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: Object.entries(publicationSections).map(([value, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value, children: t(label) }, value)) })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              size: "xs",
              className: "h-6 shrink-0 px-2 text-[11px]",
              disabled: publishingId !== "" || !draft.display_section,
              onClick: () => void handlePublish(item),
              "data-action-ui-id": `operations-publish-${id}`,
              children: t("skills.operation.publishAction")
            }
          )
        ] }) })
      ] }, id);
    }) })
  ] }) });
}
function SubmissionDetailsDialog({
  readOnly = false,
  item,
  draft,
  busy,
  isZh,
  categories,
  onDraftChange,
  onOpenChange,
  onSave,
  errors
}) {
  const { t } = useTranslation();
  const submission = item?.submission;
  const showcase = normalizeSkillDetailMetadata({ ...submission }).showcase;
  const editable = !readOnly && (submission?.status === "pending" || submission?.status === "published");
  const selectedStage = categories.find(
    (category) => category.tag_type === "stage" && category.category === draft.stage
  );
  const update = (key, value) => onDraftChange({ ...draft, [key]: value });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: Boolean(submission), onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { size: "xl", className: "max-h-[90vh] overflow-y-auto rounded-xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: t("skills.operation.skillDetails") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: t("skills.operation.detailsHint") })
    ] }),
    (item?.reviewer_name || item?.reviewed_at || submission?.review_note) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground", children: [
      item?.reviewer_name && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        t("skills.operation.reviewer"),
        ": ",
        item.reviewer_name
      ] }),
      Boolean(item?.reviewed_at) && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        t("skills.operation.reviewedAt"),
        ":",
        " ",
        new Date(Number(item?.reviewed_at)).toLocaleString()
      ] }),
      submission?.review_note && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        t("skills.operation.rejectionReason"),
        ": ",
        submission.review_note
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { disabled: !editable, className: "grid grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t("skills.operation.skillName"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: submission?.skill_name ?? "", disabled: true }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t("skills.operation.packageVersion"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Input,
        {
          "aria-invalid": Boolean(errors.packageVersion),
          value: draft.packageVersion,
          onChange: (event) => update("packageVersion", event.target.value)
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t("skills.operation.sourceFile"), className: "col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: item?.source_file ?? "", disabled: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            type: "file",
            accept: ".zip,application/zip",
            onChange: (event) => update("packageFile", event.target.files?.[0])
          }
        ),
        draft.packageFile && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: draft.packageFile.name })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t("skills.operation.displayName"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Input,
        {
          "aria-invalid": Boolean(errors.displayName),
          value: draft.displayName,
          onChange: (event) => update("displayName", event.target.value)
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t("skills.operation.creator"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Input,
        {
          "aria-invalid": Boolean(errors.creator),
          value: draft.creator,
          onChange: (event) => update("creator", event.target.value)
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t("skills.operation.summary"), className: "col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Textarea,
        {
          "aria-invalid": Boolean(errors.summary),
          value: draft.summary,
          onChange: (event) => update("summary", event.target.value)
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t("skills.operation.bestFor"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Textarea,
        {
          "aria-invalid": Boolean(errors.bestFor),
          value: draft.bestFor,
          onChange: (event) => update("bestFor", event.target.value)
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t("skills.operation.howToUse"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Textarea,
        {
          "aria-invalid": Boolean(errors.howToUse),
          value: draft.howToUse,
          onChange: (event) => update("howToUse", event.target.value)
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t("skills.operation.outputs"), className: "col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Textarea,
        {
          "aria-invalid": Boolean(errors.outputs),
          value: draft.outputs,
          onChange: (event) => update("outputs", event.target.value)
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t("skills.operation.cover"), error: errors.hasCover, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        submission?.cover_url && !draft.coverFile && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: submission.cover_url,
            alt: "",
            className: "aspect-video w-full rounded-lg border border-border object-cover"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            type: "file",
            accept: "image/png,image/jpeg,image/webp",
            onChange: (event) => update("coverFile", event.target.files?.[0])
          }
        ),
        draft.coverFile && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: draft.coverFile.name })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t("skills.operation.showcase"), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        showcase?.[0] && !draft.showcaseFile && // biome-ignore lint/a11y/useMediaCaption: creator-provided previews do not include a caption track.
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "video",
          {
            src: showcase[0],
            className: "aspect-video w-full rounded-lg border border-border object-cover",
            controls: true,
            preload: "metadata"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            type: "file",
            accept: "video/mp4,video/quicktime,video/webm",
            onChange: (event) => update("showcaseFile", event.target.files?.[0])
          }
        ),
        draft.showcaseFile && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: draft.showcaseFile.name })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Field,
        {
          label: t("skills.operation.categories"),
          className: "col-span-2",
          error: errors.categories,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2", children: categories.filter((item2) => item2.tag_type === "category").map((category) => {
            const active = draft.categories.includes(category.category);
            return /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                type: "button",
                size: "xs",
                variant: active ? "default" : "outline",
                onClick: () => update(
                  "categories",
                  active ? draft.categories.filter((value) => value !== category.category) : draft.categories.length < 3 ? [...draft.categories, category.category] : draft.categories
                ),
                children: isZh ? category.cn_name : category.en_name
              },
              category.category
            );
          }) })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t("skills.operation.stage"), className: "col-span-2", error: errors.stage, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: draft.stage, onValueChange: (value) => value && update("stage", value), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { children: selectedStage ? isZh ? selectedStage.cn_name : selectedStage.en_name : void 0 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: categories.filter((item2) => item2.tag_type === "stage").map((stage) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: stage.category, children: isZh ? stage.cn_name : stage.en_name }, stage.category)) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: t("common.cancel") }),
      editable && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { loading: busy, onClick: onSave, "data-action-ui-id": "operations-details-save", children: t("common.save") })
    ] })
  ] }) });
}
function Field({
  label,
  className,
  children,
  error
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "mb-1.5 block text-xs", children: label }),
    children,
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-destructive", children: error })
  ] });
}
function OtherSkillItem({
  skill,
  installing,
  onInstall,
  onToggle,
  onDetail,
  onTryItOut
}) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");
  const displayName = isZh ? skill.displayNameZh || toDisplayName(skill.name) : toDisplayName(skill.name);
  const summary = isZh ? skill.summaryZh || skill.summary : skill.summary;
  const market = skill;
  const downloads = market.downloads;
  const isInstalled = skill.enabled === true || market.installed === true;
  const enabled = skill.enabled;
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: row click opens detail
    // biome-ignore lint/a11y/noStaticElementInteractions: row click handler
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-action-ui-id": "other-skill-item",
        "data-skill-name": skill.name,
        className: "group flex min-h-20 cursor-pointer items-center gap-3 rounded-lg bg-card px-4 py-3 transition-shadow duration-200 ease-out hover:ring-[0.5px] hover:ring-inset hover:ring-border-strong focus-within:ring-[0.5px] focus-within:ring-inset focus-within:ring-border-strong",
        onClick: () => onDetail?.(skill),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-1 flex-col gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[15px] font-medium leading-5 text-foreground", children: displayName }),
            summary && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-sm leading-5 text-muted-foreground", children: summary }),
            downloads != null && downloads > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex items-center gap-1 text-[11px] leading-4 text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download$1, { size: 12 }),
              formatDownloads(downloads)
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "relative flex shrink-0 items-center gap-2",
              onClick: (e) => e.stopPropagation(),
              children: isInstalled ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                onTryItOut && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    "data-action-ui-id": "other-skill-try",
                    className: "pointer-events-none absolute right-full z-10 mr-2 inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground opacity-0 transition-[opacity,colors] hover:border-foreground hover:bg-card group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100",
                    onClick: () => onTryItOut(skill),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { size: 14, strokeWidth: 1.5 }),
                      t("skills.market.tryInChat", "去对话中试试")
                    ]
                  }
                ),
                onToggle && /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: enabled, onCheckedChange: () => onToggle(skill.name, !enabled) })
              ] }) : onInstall && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  "data-action-ui-id": "other-skill-install",
                  disabled: installing,
                  className: "inline-flex h-7 items-center gap-1.5 rounded-md border border-foreground/15 bg-transparent px-3 text-xs font-medium text-foreground transition-colors hover:border-foreground hover:bg-transparent disabled:cursor-not-allowed disabled:opacity-50",
                  onClick: () => onInstall(skill.name),
                  children: installing ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 12, className: "animate-spin" }),
                    t("skills.market.installing")
                  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Download$1, { size: 12, strokeWidth: 1.75 }),
                    t("skills.market.install")
                  ] })
                }
              )
            }
          )
        ]
      }
    )
  );
}
function normalizePluginLocale(short) {
  if (!short) return "en-US";
  if (short.startsWith("zh")) return "zh-CN";
  if (short.startsWith("en")) return "en-US";
  return short;
}
const PLUGIN_TEMPLATE_PROJECTS = {
  "3d-director-stage": {
    templateProjectUrl: CDN_TEMPLATE_PROJECT_3D_DIRECTOR,
    // Version the template's canvas.json was authored against (the embedded
    // plugin node records pluginVersion 0.1.21).
    requiredPlugin: { id: "3d-director-stage", minVersion: "0.1.21" }
  },
  // minVersion below = the pluginVersion embedded in each template zip's
  // .hilo/canvas.json plugin file-node (verified against both regional zips).
  "multi-shot": {
    templateProjectUrl: CDN_TEMPLATE_PROJECT_MULTI_SHOT,
    requiredPlugin: { id: "multi-shot", minVersion: "0.3.3" }
  },
  "n-storyboard": {
    templateProjectUrl: CDN_TEMPLATE_PROJECT_N_STORYBOARD,
    requiredPlugin: { id: "n-storyboard", minVersion: "0.1.33" }
  },
  "panorama-viewer": {
    templateProjectUrl: CDN_TEMPLATE_PROJECT_PANORAMA_VIEWER,
    requiredPlugin: { id: "panorama-viewer", minVersion: "0.1.0" }
  },
  relight: {
    templateProjectUrl: CDN_TEMPLATE_PROJECT_RELIGHT,
    requiredPlugin: { id: "relight", minVersion: "0.1.15" }
  },
  "watermark-tool": {
    templateProjectUrl: CDN_TEMPLATE_PROJECT_WATERMARK_TOOL,
    requiredPlugin: { id: "watermark-tool", minVersion: "0.0.14" }
  }
};
function getPluginTemplateProject(pluginId) {
  return PLUGIN_TEMPLATE_PROJECTS[pluginId];
}
class TemplatePluginPrepareError extends Error {
  constructor(openMode, cause) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
    this.openMode = openMode;
    this.name = "TemplatePluginPrepareError";
  }
}
function compareVersions(a, b) {
  const pa = a.split(".").map((s) => Number.parseInt(s, 10) || 0);
  const pb = b.split(".").map((s) => Number.parseInt(s, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
async function ensureTemplatePlugin(required) {
  let existing;
  try {
    const listResp = await gatewayFetch(API_PATHS.plugins);
    if (!listResp.ok) throw new Error(`list plugins: HTTP ${listResp.status}`);
    const payload = await listResp.json();
    existing = (payload.plugins ?? []).find((p) => p.id === required.id);
  } catch (error) {
    throw new TemplatePluginPrepareError("unknown", error);
  }
  if (existing?.source === "user") return "direct";
  if (existing && compareVersions(existing.version, required.minVersion) >= 0) return "direct";
  const openMode = existing ? "upgrade_then_open" : "install_then_open";
  try {
    const resp = await gatewayFetch(API_PATHS.marketInstall, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: required.id, skillType: "plugin" })
    });
    if (!resp.ok) throw new Error(`install: HTTP ${resp.status}`);
    const result = await resp.json();
    if (!result.ok) throw new Error(result.error ?? "install failed");
  } catch (error) {
    throw new TemplatePluginPrepareError(openMode, error);
  }
  pluginEvents.firePluginsChanged(required.id, "installed");
  return openMode;
}
function useTemplateProjectImport() {
  const { t } = useTranslation();
  const { runImportFromUrl } = useProjectArchiveActions();
  const [, setConfig] = useStorage("global.config");
  return reactExports.useCallback(
    async (template) => {
      localStorage.setItem(SIDEBAR_TAB_STORAGE_KEY, "plugins");
      setConfig((prev) => ({ ...prev, canvasSidebarOpen: true }));
      const pluginReady = template.requiredPlugin ? ensureTemplatePlugin(template.requiredPlugin).then(
        (openMode) => ({ openMode, result: "success" }),
        (error) => ({
          openMode: error instanceof TemplatePluginPrepareError ? error.openMode : "unknown",
          result: "failed"
        })
      ) : Promise.resolve({ openMode: "direct", result: "not_needed" });
      const [importOutcome, pluginOutcome] = await Promise.all([
        runImportFromUrl(template.templateProjectUrl),
        pluginReady
      ]);
      if (pluginOutcome.result === "failed") {
        dedupedToast.warning(t("coachMark.pluginInstallFailed", "插件安装失败，可稍后在插件市场手动安装"));
      }
      return {
        success: importOutcome.success,
        openMode: pluginOutcome.openMode,
        pluginPrepareResult: pluginOutcome.result,
        ...importOutcome.failureStage ? { failureStage: importOutcome.failureStage } : {}
      };
    },
    [runImportFromUrl, setConfig, t]
  );
}
function extractLogoBackgroundColor(img) {
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, w, h);
    const buckets = /* @__PURE__ */ new Map();
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] ?? 0;
      if (alpha < 200) continue;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
      const cur = buckets.get(key);
      if (cur) {
        cur.r += r;
        cur.g += g;
        cur.b += b;
        cur.count += 1;
      } else {
        buckets.set(key, { r, g, b, count: 1 });
      }
    }
    if (buckets.size === 0) return null;
    let winner = null;
    for (const bucket of buckets.values()) {
      if (!winner || bucket.count > winner.count) winner = bucket;
    }
    if (!winner) return null;
    const avgR = Math.round(winner.r / winner.count);
    const avgG = Math.round(winner.g / winner.count);
    const avgB = Math.round(winner.b / winner.count);
    return `rgb(${avgR}, ${avgG}, ${avgB})`;
  } catch {
    return null;
  }
}
function PluginLogoBanner({ iconUrl, className, ...rest }) {
  const imgRef = reactExports.useRef(null);
  const [bgColor, setBgColor] = reactExports.useState(null);
  reactExports.useEffect(() => {
    setBgColor(null);
  }, [iconUrl]);
  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setBgColor(extractLogoBackgroundColor(img));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: `relative aspect-video w-full overflow-hidden bg-muted ${className ?? ""}`,
      style: bgColor ? { backgroundColor: bgColor } : void 0,
      "data-action-ui-id": rest["data-action-ui-id"],
      children: iconUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        "img",
        {
          ref: imgRef,
          src: iconUrl,
          alt: "",
          crossOrigin: "anonymous",
          className: "absolute inset-0 h-full w-full object-contain",
          draggable: false,
          onLoad: handleImgLoad
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PluginIcon, { size: 40, strokeWidth: 1.5 }) })
    }
  );
}
function resolvePluginIcon$2(icon, locale) {
  if (!icon) return void 0;
  if (typeof icon === "string") return icon || void 0;
  return pickLocalized(icon, locale) || void 0;
}
function PluginMarketCard({
  plugin,
  installedSkill,
  entrySource,
  position,
  onDetail
}) {
  const { t, i18n } = useTranslation();
  const locale = normalizePluginLocale(i18n.language);
  const displayName = pickLocalized(plugin.name, locale) || plugin.id;
  const summary = pickLocalized(plugin.description, locale);
  const iconUrl = resolvePluginIcon$2(plugin.icon, locale);
  const workflowTemplate = getPluginTemplateProject(plugin.id);
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: cover/card opens detail
    // biome-ignore lint/a11y/noStaticElementInteractions: card click handler
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-action-ui-id": "plugin-market-card",
        "data-plugin-id": plugin.id,
        className: "group flex flex-col overflow-hidden rounded-lg border border-transparent bg-card transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg cursor-pointer",
        onClick: () => onDetail?.(plugin),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(PluginLogoBanner, { iconUrl }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "pointer-events-none absolute inset-x-0 bottom-0 flex gap-3 p-3 opacity-0 translate-y-2 transition-[opacity,transform] duration-200 ease-out group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0",
                onClick: (e) => e.stopPropagation(),
                children: [
                  onDetail && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      "data-action-ui-id": "plugin-market-detail",
                      className: "flex flex-1 items-center justify-center gap-1.5 h-9 rounded-[4px] text-[13px] font-normal whitespace-nowrap bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-colors cursor-pointer",
                      onClick: () => onDetail(plugin),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Eye$1, { size: 14, strokeWidth: 1.5 }),
                        t("skills.viewDetail")
                      ]
                    }
                  ),
                  workflowTemplate && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    PluginWorkflowButton,
                    {
                      plugin,
                      template: workflowTemplate,
                      entrySource,
                      isInstalled: !!installedSkill || plugin.installed === true,
                      position
                    }
                  )
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-1 flex-col gap-2 p-5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-base font-semibold text-foreground", children: displayName }),
            summary && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "line-clamp-2 text-sm text-muted-foreground", children: summary }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex min-w-0 items-center gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-foreground/85", children: t("skills.plugin.publisher", "MiniMax Design") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                BadgeCheck,
                {
                  size: 14,
                  fill: "none",
                  strokeWidth: 2,
                  className: "shrink-0 text-brand-accent",
                  "aria-label": t("skills.market.verifiedOfficial", "Verified by MiniMax Design")
                }
              )
            ] }) })
          ] })
        ]
      }
    )
  );
}
function PluginWorkflowButton({
  plugin,
  template,
  entrySource,
  isInstalled,
  position
}) {
  const { t } = useTranslation();
  const importTemplateProject = useTemplateProjectImport();
  const [importing, setImporting] = reactExports.useState(false);
  const handleViewWorkflow = () => {
    if (importing) return;
    const startedAt = Date.now();
    const trackBase = {
      ...pluginTrackBase(plugin, "plugin_market_list", entrySource),
      trigger: "workflow_button",
      ...position !== void 0 ? { position } : {}
    };
    trackPluginWorkflowClick({ ...trackBase, is_installed: isInstalled });
    setImporting(true);
    void importTemplateProject(template).then((outcome) => {
      const terminal = {
        ...trackBase,
        open_mode: outcome.openMode,
        plugin_prepare_result: outcome.pluginPrepareResult,
        duration_ms: Date.now() - startedAt
      };
      if (outcome.success) {
        trackPluginWorkflowOpen(terminal);
      } else {
        trackPluginWorkflowOpenFailed({
          ...terminal,
          stage: outcome.failureStage ?? "template_import"
        });
      }
    }).finally(() => setImporting(false));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      "data-action-ui-id": "plugin-market-workflow",
      className: "flex flex-1 items-center justify-center gap-1.5 h-9 rounded-[4px] text-[13px] font-normal whitespace-nowrap bg-brand-accent text-white hover:opacity-90 transition-opacity cursor-pointer disabled:cursor-wait disabled:opacity-70",
      onClick: handleViewWorkflow,
      disabled: importing,
      "aria-busy": importing,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Workflow, { size: 14, strokeWidth: 1.5 }),
        importing ? t("coachMark.downloading", "Downloading…") : t("skills.plugin.viewWorkflow", "View workflow")
      ]
    }
  );
}
const defaultOptions$1 = {
  active: true,
  breakpoints: {},
  delay: 4e3,
  jump: false,
  playOnInit: true,
  stopOnFocusIn: true,
  stopOnInteraction: true,
  stopOnMouseEnter: false,
  stopOnLastSnap: false,
  rootNode: null
};
function normalizeDelay(emblaApi, delay) {
  const scrollSnaps = emblaApi.scrollSnapList();
  if (typeof delay === "number") {
    return scrollSnaps.map(() => delay);
  }
  return delay(scrollSnaps, emblaApi);
}
function getAutoplayRootNode(emblaApi, rootNode) {
  const emblaRootNode = emblaApi.rootNode();
  return rootNode && rootNode(emblaRootNode) || emblaRootNode;
}
function Autoplay(userOptions = {}) {
  let options;
  let emblaApi;
  let destroyed;
  let delay;
  let timerStartTime = null;
  let timerId = 0;
  let autoplayActive = false;
  let mouseIsOver = false;
  let playOnDocumentVisible = false;
  let jump = false;
  function init(emblaApiInstance, optionsHandler) {
    emblaApi = emblaApiInstance;
    const {
      mergeOptions,
      optionsAtMedia
    } = optionsHandler;
    const optionsBase = mergeOptions(defaultOptions$1, Autoplay.globalOptions);
    const allOptions = mergeOptions(optionsBase, userOptions);
    options = optionsAtMedia(allOptions);
    if (emblaApi.scrollSnapList().length <= 1) return;
    jump = options.jump;
    destroyed = false;
    delay = normalizeDelay(emblaApi, options.delay);
    const {
      eventStore,
      ownerDocument
    } = emblaApi.internalEngine();
    const isDraggable = !!emblaApi.internalEngine().options.watchDrag;
    const root = getAutoplayRootNode(emblaApi, options.rootNode);
    eventStore.add(ownerDocument, "visibilitychange", visibilityChange);
    if (isDraggable) {
      emblaApi.on("pointerDown", pointerDown);
    }
    if (isDraggable && !options.stopOnInteraction) {
      emblaApi.on("pointerUp", pointerUp);
    }
    if (options.stopOnMouseEnter) {
      eventStore.add(root, "mouseenter", mouseEnter);
    }
    if (options.stopOnMouseEnter && !options.stopOnInteraction) {
      eventStore.add(root, "mouseleave", mouseLeave);
    }
    if (options.stopOnFocusIn) {
      emblaApi.on("slideFocusStart", stopAutoplay);
    }
    if (options.stopOnFocusIn && !options.stopOnInteraction) {
      eventStore.add(emblaApi.containerNode(), "focusout", startAutoplay);
    }
    if (options.playOnInit) startAutoplay();
  }
  function destroy() {
    emblaApi.off("pointerDown", pointerDown).off("pointerUp", pointerUp).off("slideFocusStart", stopAutoplay);
    stopAutoplay();
    destroyed = true;
    autoplayActive = false;
  }
  function setTimer() {
    const {
      ownerWindow
    } = emblaApi.internalEngine();
    ownerWindow.clearTimeout(timerId);
    timerId = ownerWindow.setTimeout(next, delay[emblaApi.selectedScrollSnap()]);
    timerStartTime = (/* @__PURE__ */ new Date()).getTime();
    emblaApi.emit("autoplay:timerset");
  }
  function clearTimer() {
    const {
      ownerWindow
    } = emblaApi.internalEngine();
    ownerWindow.clearTimeout(timerId);
    timerId = 0;
    timerStartTime = null;
    emblaApi.emit("autoplay:timerstopped");
  }
  function startAutoplay() {
    if (destroyed) return;
    if (documentIsHidden()) {
      playOnDocumentVisible = true;
      return;
    }
    if (!autoplayActive) emblaApi.emit("autoplay:play");
    setTimer();
    autoplayActive = true;
  }
  function stopAutoplay() {
    if (destroyed) return;
    if (autoplayActive) emblaApi.emit("autoplay:stop");
    clearTimer();
    autoplayActive = false;
  }
  function visibilityChange() {
    if (documentIsHidden()) {
      playOnDocumentVisible = autoplayActive;
      return stopAutoplay();
    }
    if (playOnDocumentVisible) startAutoplay();
  }
  function documentIsHidden() {
    const {
      ownerDocument
    } = emblaApi.internalEngine();
    return ownerDocument.visibilityState === "hidden";
  }
  function pointerDown() {
    if (!mouseIsOver) stopAutoplay();
  }
  function pointerUp() {
    if (!mouseIsOver) startAutoplay();
  }
  function mouseEnter() {
    mouseIsOver = true;
    stopAutoplay();
  }
  function mouseLeave() {
    mouseIsOver = false;
    startAutoplay();
  }
  function play(jumpOverride) {
    if (typeof jumpOverride !== "undefined") jump = jumpOverride;
    startAutoplay();
  }
  function stop() {
    if (autoplayActive) stopAutoplay();
  }
  function reset() {
    if (autoplayActive) startAutoplay();
  }
  function isPlaying() {
    return autoplayActive;
  }
  function next() {
    const {
      index
    } = emblaApi.internalEngine();
    const nextIndex = index.clone().add(1).get();
    const lastIndex = emblaApi.scrollSnapList().length - 1;
    const kill = options.stopOnLastSnap && nextIndex === lastIndex;
    if (emblaApi.canScrollNext()) {
      emblaApi.scrollNext(jump);
    } else {
      emblaApi.scrollTo(0, jump);
    }
    emblaApi.emit("autoplay:select");
    if (kill) return stopAutoplay();
    startAutoplay();
  }
  function timeUntilNext() {
    if (!timerStartTime) return null;
    const currentDelay = delay[emblaApi.selectedScrollSnap()];
    const timePastSinceStart = (/* @__PURE__ */ new Date()).getTime() - timerStartTime;
    return currentDelay - timePastSinceStart;
  }
  const self = {
    name: "autoplay",
    options: userOptions,
    init,
    destroy,
    play,
    stop,
    reset,
    isPlaying,
    timeUntilNext
  };
  return self;
}
Autoplay.globalOptions = void 0;
function isObject$1(subject) {
  return Object.prototype.toString.call(subject) === "[object Object]";
}
function isRecord(subject) {
  return isObject$1(subject) || Array.isArray(subject);
}
function canUseDOM() {
  return !!(typeof window !== "undefined" && window.document && window.document.createElement);
}
function areOptionsEqual(optionsA, optionsB) {
  const optionsAKeys = Object.keys(optionsA);
  const optionsBKeys = Object.keys(optionsB);
  if (optionsAKeys.length !== optionsBKeys.length) return false;
  const breakpointsA = JSON.stringify(Object.keys(optionsA.breakpoints || {}));
  const breakpointsB = JSON.stringify(Object.keys(optionsB.breakpoints || {}));
  if (breakpointsA !== breakpointsB) return false;
  return optionsAKeys.every((key) => {
    const valueA = optionsA[key];
    const valueB = optionsB[key];
    if (typeof valueA === "function") return `${valueA}` === `${valueB}`;
    if (!isRecord(valueA) || !isRecord(valueB)) return valueA === valueB;
    return areOptionsEqual(valueA, valueB);
  });
}
function sortAndMapPluginToOptions(plugins) {
  return plugins.concat().sort((a, b) => a.name > b.name ? 1 : -1).map((plugin) => plugin.options);
}
function arePluginsEqual(pluginsA, pluginsB) {
  if (pluginsA.length !== pluginsB.length) return false;
  const optionsA = sortAndMapPluginToOptions(pluginsA);
  const optionsB = sortAndMapPluginToOptions(pluginsB);
  return optionsA.every((optionA, index) => {
    const optionB = optionsB[index];
    return areOptionsEqual(optionA, optionB);
  });
}
function isNumber(subject) {
  return typeof subject === "number";
}
function isString(subject) {
  return typeof subject === "string";
}
function isBoolean(subject) {
  return typeof subject === "boolean";
}
function isObject(subject) {
  return Object.prototype.toString.call(subject) === "[object Object]";
}
function mathAbs(n) {
  return Math.abs(n);
}
function mathSign(n) {
  return Math.sign(n);
}
function deltaAbs(valueB, valueA) {
  return mathAbs(valueB - valueA);
}
function factorAbs(valueB, valueA) {
  if (valueB === 0 || valueA === 0) return 0;
  if (mathAbs(valueB) <= mathAbs(valueA)) return 0;
  const diff = deltaAbs(mathAbs(valueB), mathAbs(valueA));
  return mathAbs(diff / valueB);
}
function roundToTwoDecimals(num) {
  return Math.round(num * 100) / 100;
}
function arrayKeys(array) {
  return objectKeys(array).map(Number);
}
function arrayLast(array) {
  return array[arrayLastIndex(array)];
}
function arrayLastIndex(array) {
  return Math.max(0, array.length - 1);
}
function arrayIsLastIndex(array, index) {
  return index === arrayLastIndex(array);
}
function arrayFromNumber(n, startAt = 0) {
  return Array.from(Array(n), (_, i) => startAt + i);
}
function objectKeys(object) {
  return Object.keys(object);
}
function objectsMergeDeep(objectA, objectB) {
  return [objectA, objectB].reduce((mergedObjects, currentObject) => {
    objectKeys(currentObject).forEach((key) => {
      const valueA = mergedObjects[key];
      const valueB = currentObject[key];
      const areObjects = isObject(valueA) && isObject(valueB);
      mergedObjects[key] = areObjects ? objectsMergeDeep(valueA, valueB) : valueB;
    });
    return mergedObjects;
  }, {});
}
function isMouseEvent(evt, ownerWindow) {
  return typeof ownerWindow.MouseEvent !== "undefined" && evt instanceof ownerWindow.MouseEvent;
}
function Alignment(align, viewSize) {
  const predefined = {
    start,
    center,
    end
  };
  function start() {
    return 0;
  }
  function center(n) {
    return end(n) / 2;
  }
  function end(n) {
    return viewSize - n;
  }
  function measure(n, index) {
    if (isString(align)) return predefined[align](n);
    return align(viewSize, n, index);
  }
  const self = {
    measure
  };
  return self;
}
function EventStore() {
  let listeners = [];
  function add(node, type, handler, options = {
    passive: true
  }) {
    let removeListener;
    if ("addEventListener" in node) {
      node.addEventListener(type, handler, options);
      removeListener = () => node.removeEventListener(type, handler, options);
    } else {
      const legacyMediaQueryList = node;
      legacyMediaQueryList.addListener(handler);
      removeListener = () => legacyMediaQueryList.removeListener(handler);
    }
    listeners.push(removeListener);
    return self;
  }
  function clear() {
    listeners = listeners.filter((remove) => remove());
  }
  const self = {
    add,
    clear
  };
  return self;
}
function Animations(ownerDocument, ownerWindow, update, render) {
  const documentVisibleHandler = EventStore();
  const fixedTimeStep = 1e3 / 60;
  let lastTimeStamp = null;
  let accumulatedTime = 0;
  let animationId = 0;
  function init() {
    documentVisibleHandler.add(ownerDocument, "visibilitychange", () => {
      if (ownerDocument.hidden) reset();
    });
  }
  function destroy() {
    stop();
    documentVisibleHandler.clear();
  }
  function animate(timeStamp) {
    if (!animationId) return;
    if (!lastTimeStamp) {
      lastTimeStamp = timeStamp;
      update();
      update();
    }
    const timeElapsed = timeStamp - lastTimeStamp;
    lastTimeStamp = timeStamp;
    accumulatedTime += timeElapsed;
    while (accumulatedTime >= fixedTimeStep) {
      update();
      accumulatedTime -= fixedTimeStep;
    }
    const alpha = accumulatedTime / fixedTimeStep;
    render(alpha);
    if (animationId) {
      animationId = ownerWindow.requestAnimationFrame(animate);
    }
  }
  function start() {
    if (animationId) return;
    animationId = ownerWindow.requestAnimationFrame(animate);
  }
  function stop() {
    ownerWindow.cancelAnimationFrame(animationId);
    lastTimeStamp = null;
    accumulatedTime = 0;
    animationId = 0;
  }
  function reset() {
    lastTimeStamp = null;
    accumulatedTime = 0;
  }
  const self = {
    init,
    destroy,
    start,
    stop,
    update,
    render
  };
  return self;
}
function Axis(axis, contentDirection) {
  const isRightToLeft = contentDirection === "rtl";
  const isVertical = axis === "y";
  const scroll = isVertical ? "y" : "x";
  const cross = isVertical ? "x" : "y";
  const sign = !isVertical && isRightToLeft ? -1 : 1;
  const startEdge = getStartEdge();
  const endEdge = getEndEdge();
  function measureSize(nodeRect) {
    const {
      height,
      width
    } = nodeRect;
    return isVertical ? height : width;
  }
  function getStartEdge() {
    if (isVertical) return "top";
    return isRightToLeft ? "right" : "left";
  }
  function getEndEdge() {
    if (isVertical) return "bottom";
    return isRightToLeft ? "left" : "right";
  }
  function direction(n) {
    return n * sign;
  }
  const self = {
    scroll,
    cross,
    startEdge,
    endEdge,
    measureSize,
    direction
  };
  return self;
}
function Limit(min = 0, max = 0) {
  const length = mathAbs(min - max);
  function reachedMin(n) {
    return n < min;
  }
  function reachedMax(n) {
    return n > max;
  }
  function reachedAny(n) {
    return reachedMin(n) || reachedMax(n);
  }
  function constrain(n) {
    if (!reachedAny(n)) return n;
    return reachedMin(n) ? min : max;
  }
  function removeOffset(n) {
    if (!length) return n;
    return n - length * Math.ceil((n - max) / length);
  }
  const self = {
    length,
    max,
    min,
    constrain,
    reachedAny,
    reachedMax,
    reachedMin,
    removeOffset
  };
  return self;
}
function Counter(max, start, loop) {
  const {
    constrain
  } = Limit(0, max);
  const loopEnd = max + 1;
  let counter = withinLimit(start);
  function withinLimit(n) {
    return !loop ? constrain(n) : mathAbs((loopEnd + n) % loopEnd);
  }
  function get() {
    return counter;
  }
  function set(n) {
    counter = withinLimit(n);
    return self;
  }
  function add(n) {
    return clone().set(get() + n);
  }
  function clone() {
    return Counter(max, get(), loop);
  }
  const self = {
    get,
    set,
    add,
    clone
  };
  return self;
}
function DragHandler(axis, rootNode, ownerDocument, ownerWindow, target, dragTracker, location, animation, scrollTo, scrollBody, scrollTarget, index, eventHandler, percentOfView, dragFree, dragThreshold, skipSnaps, baseFriction, watchDrag) {
  const {
    cross: crossAxis,
    direction
  } = axis;
  const focusNodes = ["INPUT", "SELECT", "TEXTAREA"];
  const nonPassiveEvent = {
    passive: false
  };
  const initEvents = EventStore();
  const dragEvents = EventStore();
  const goToNextThreshold = Limit(50, 225).constrain(percentOfView.measure(20));
  const snapForceBoost = {
    mouse: 300,
    touch: 400
  };
  const freeForceBoost = {
    mouse: 500,
    touch: 600
  };
  const baseSpeed = dragFree ? 43 : 25;
  let isMoving = false;
  let startScroll = 0;
  let startCross = 0;
  let pointerIsDown = false;
  let preventScroll = false;
  let preventClick = false;
  let isMouse = false;
  function init(emblaApi) {
    if (!watchDrag) return;
    function downIfAllowed(evt) {
      if (isBoolean(watchDrag) || watchDrag(emblaApi, evt)) down(evt);
    }
    const node = rootNode;
    initEvents.add(node, "dragstart", (evt) => evt.preventDefault(), nonPassiveEvent).add(node, "touchmove", () => void 0, nonPassiveEvent).add(node, "touchend", () => void 0).add(node, "touchstart", downIfAllowed).add(node, "mousedown", downIfAllowed).add(node, "touchcancel", up).add(node, "contextmenu", up).add(node, "click", click, true);
  }
  function destroy() {
    initEvents.clear();
    dragEvents.clear();
  }
  function addDragEvents() {
    const node = isMouse ? ownerDocument : rootNode;
    dragEvents.add(node, "touchmove", move, nonPassiveEvent).add(node, "touchend", up).add(node, "mousemove", move, nonPassiveEvent).add(node, "mouseup", up);
  }
  function isFocusNode(node) {
    const nodeName = node.nodeName || "";
    return focusNodes.includes(nodeName);
  }
  function forceBoost() {
    const boost = dragFree ? freeForceBoost : snapForceBoost;
    const type = isMouse ? "mouse" : "touch";
    return boost[type];
  }
  function allowedForce(force, targetChanged) {
    const next = index.add(mathSign(force) * -1);
    const baseForce = scrollTarget.byDistance(force, !dragFree).distance;
    if (dragFree || mathAbs(force) < goToNextThreshold) return baseForce;
    if (skipSnaps && targetChanged) return baseForce * 0.5;
    return scrollTarget.byIndex(next.get(), 0).distance;
  }
  function down(evt) {
    const isMouseEvt = isMouseEvent(evt, ownerWindow);
    isMouse = isMouseEvt;
    preventClick = dragFree && isMouseEvt && !evt.buttons && isMoving;
    isMoving = deltaAbs(target.get(), location.get()) >= 2;
    if (isMouseEvt && evt.button !== 0) return;
    if (isFocusNode(evt.target)) return;
    pointerIsDown = true;
    dragTracker.pointerDown(evt);
    scrollBody.useFriction(0).useDuration(0);
    target.set(location);
    addDragEvents();
    startScroll = dragTracker.readPoint(evt);
    startCross = dragTracker.readPoint(evt, crossAxis);
    eventHandler.emit("pointerDown");
  }
  function move(evt) {
    const isTouchEvt = !isMouseEvent(evt, ownerWindow);
    if (isTouchEvt && evt.touches.length >= 2) return up(evt);
    const lastScroll = dragTracker.readPoint(evt);
    const lastCross = dragTracker.readPoint(evt, crossAxis);
    const diffScroll = deltaAbs(lastScroll, startScroll);
    const diffCross = deltaAbs(lastCross, startCross);
    if (!preventScroll && !isMouse) {
      if (!evt.cancelable) return up(evt);
      preventScroll = diffScroll > diffCross;
      if (!preventScroll) return up(evt);
    }
    const diff = dragTracker.pointerMove(evt);
    if (diffScroll > dragThreshold) preventClick = true;
    scrollBody.useFriction(0.3).useDuration(0.75);
    animation.start();
    target.add(direction(diff));
    evt.preventDefault();
  }
  function up(evt) {
    const currentLocation = scrollTarget.byDistance(0, false);
    const targetChanged = currentLocation.index !== index.get();
    const rawForce = dragTracker.pointerUp(evt) * forceBoost();
    const force = allowedForce(direction(rawForce), targetChanged);
    const forceFactor = factorAbs(rawForce, force);
    const speed = baseSpeed - 10 * forceFactor;
    const friction = baseFriction + forceFactor / 50;
    preventScroll = false;
    pointerIsDown = false;
    dragEvents.clear();
    scrollBody.useDuration(speed).useFriction(friction);
    scrollTo.distance(force, !dragFree);
    isMouse = false;
    eventHandler.emit("pointerUp");
  }
  function click(evt) {
    if (preventClick) {
      evt.stopPropagation();
      evt.preventDefault();
      preventClick = false;
    }
  }
  function pointerDown() {
    return pointerIsDown;
  }
  const self = {
    init,
    destroy,
    pointerDown
  };
  return self;
}
function DragTracker(axis, ownerWindow) {
  const logInterval = 170;
  let startEvent;
  let lastEvent;
  function readTime(evt) {
    return evt.timeStamp;
  }
  function readPoint(evt, evtAxis) {
    const property = evtAxis || axis.scroll;
    const coord = `client${property === "x" ? "X" : "Y"}`;
    return (isMouseEvent(evt, ownerWindow) ? evt : evt.touches[0])[coord];
  }
  function pointerDown(evt) {
    startEvent = evt;
    lastEvent = evt;
    return readPoint(evt);
  }
  function pointerMove(evt) {
    const diff = readPoint(evt) - readPoint(lastEvent);
    const expired = readTime(evt) - readTime(startEvent) > logInterval;
    lastEvent = evt;
    if (expired) startEvent = evt;
    return diff;
  }
  function pointerUp(evt) {
    if (!startEvent || !lastEvent) return 0;
    const diffDrag = readPoint(lastEvent) - readPoint(startEvent);
    const diffTime = readTime(evt) - readTime(startEvent);
    const expired = readTime(evt) - readTime(lastEvent) > logInterval;
    const force = diffDrag / diffTime;
    const isFlick = diffTime && !expired && mathAbs(force) > 0.1;
    return isFlick ? force : 0;
  }
  const self = {
    pointerDown,
    pointerMove,
    pointerUp,
    readPoint
  };
  return self;
}
function NodeRects() {
  function measure(node) {
    const {
      offsetTop,
      offsetLeft,
      offsetWidth,
      offsetHeight
    } = node;
    const offset = {
      top: offsetTop,
      right: offsetLeft + offsetWidth,
      bottom: offsetTop + offsetHeight,
      left: offsetLeft,
      width: offsetWidth,
      height: offsetHeight
    };
    return offset;
  }
  const self = {
    measure
  };
  return self;
}
function PercentOfView(viewSize) {
  function measure(n) {
    return viewSize * (n / 100);
  }
  const self = {
    measure
  };
  return self;
}
function ResizeHandler(container, eventHandler, ownerWindow, slides, axis, watchResize, nodeRects) {
  const observeNodes = [container].concat(slides);
  let resizeObserver;
  let containerSize;
  let slideSizes = [];
  let destroyed = false;
  function readSize(node) {
    return axis.measureSize(nodeRects.measure(node));
  }
  function init(emblaApi) {
    if (!watchResize) return;
    containerSize = readSize(container);
    slideSizes = slides.map(readSize);
    function defaultCallback(entries) {
      for (const entry of entries) {
        if (destroyed) return;
        const isContainer = entry.target === container;
        const slideIndex = slides.indexOf(entry.target);
        const lastSize = isContainer ? containerSize : slideSizes[slideIndex];
        const newSize = readSize(isContainer ? container : slides[slideIndex]);
        const diffSize = mathAbs(newSize - lastSize);
        if (diffSize >= 0.5) {
          emblaApi.reInit();
          eventHandler.emit("resize");
          break;
        }
      }
    }
    resizeObserver = new ResizeObserver((entries) => {
      if (isBoolean(watchResize) || watchResize(emblaApi, entries)) {
        defaultCallback(entries);
      }
    });
    ownerWindow.requestAnimationFrame(() => {
      observeNodes.forEach((node) => resizeObserver.observe(node));
    });
  }
  function destroy() {
    destroyed = true;
    if (resizeObserver) resizeObserver.disconnect();
  }
  const self = {
    init,
    destroy
  };
  return self;
}
function ScrollBody(location, offsetLocation, previousLocation, target, baseDuration, baseFriction) {
  let scrollVelocity = 0;
  let scrollDirection = 0;
  let scrollDuration = baseDuration;
  let scrollFriction = baseFriction;
  let rawLocation = location.get();
  let rawLocationPrevious = 0;
  function seek() {
    const displacement = target.get() - location.get();
    const isInstant = !scrollDuration;
    let scrollDistance = 0;
    if (isInstant) {
      scrollVelocity = 0;
      previousLocation.set(target);
      location.set(target);
      scrollDistance = displacement;
    } else {
      previousLocation.set(location);
      scrollVelocity += displacement / scrollDuration;
      scrollVelocity *= scrollFriction;
      rawLocation += scrollVelocity;
      location.add(scrollVelocity);
      scrollDistance = rawLocation - rawLocationPrevious;
    }
    scrollDirection = mathSign(scrollDistance);
    rawLocationPrevious = rawLocation;
    return self;
  }
  function settled() {
    const diff = target.get() - offsetLocation.get();
    return mathAbs(diff) < 1e-3;
  }
  function duration() {
    return scrollDuration;
  }
  function direction() {
    return scrollDirection;
  }
  function velocity() {
    return scrollVelocity;
  }
  function useBaseDuration() {
    return useDuration(baseDuration);
  }
  function useBaseFriction() {
    return useFriction(baseFriction);
  }
  function useDuration(n) {
    scrollDuration = n;
    return self;
  }
  function useFriction(n) {
    scrollFriction = n;
    return self;
  }
  const self = {
    direction,
    duration,
    velocity,
    seek,
    settled,
    useBaseFriction,
    useBaseDuration,
    useFriction,
    useDuration
  };
  return self;
}
function ScrollBounds(limit, location, target, scrollBody, percentOfView) {
  const pullBackThreshold = percentOfView.measure(10);
  const edgeOffsetTolerance = percentOfView.measure(50);
  const frictionLimit = Limit(0.1, 0.99);
  let disabled = false;
  function shouldConstrain() {
    if (disabled) return false;
    if (!limit.reachedAny(target.get())) return false;
    if (!limit.reachedAny(location.get())) return false;
    return true;
  }
  function constrain(pointerDown) {
    if (!shouldConstrain()) return;
    const edge = limit.reachedMin(location.get()) ? "min" : "max";
    const diffToEdge = mathAbs(limit[edge] - location.get());
    const diffToTarget = target.get() - location.get();
    const friction = frictionLimit.constrain(diffToEdge / edgeOffsetTolerance);
    target.subtract(diffToTarget * friction);
    if (!pointerDown && mathAbs(diffToTarget) < pullBackThreshold) {
      target.set(limit.constrain(target.get()));
      scrollBody.useDuration(25).useBaseFriction();
    }
  }
  function toggleActive(active) {
    disabled = !active;
  }
  const self = {
    shouldConstrain,
    constrain,
    toggleActive
  };
  return self;
}
function ScrollContain(viewSize, contentSize, snapsAligned, containScroll, pixelTolerance) {
  const scrollBounds = Limit(-contentSize + viewSize, 0);
  const snapsBounded = measureBounded();
  const scrollContainLimit = findScrollContainLimit();
  const snapsContained = measureContained();
  function usePixelTolerance(bound, snap) {
    return deltaAbs(bound, snap) <= 1;
  }
  function findScrollContainLimit() {
    const startSnap = snapsBounded[0];
    const endSnap = arrayLast(snapsBounded);
    const min = snapsBounded.lastIndexOf(startSnap);
    const max = snapsBounded.indexOf(endSnap) + 1;
    return Limit(min, max);
  }
  function measureBounded() {
    return snapsAligned.map((snapAligned, index) => {
      const {
        min,
        max
      } = scrollBounds;
      const snap = scrollBounds.constrain(snapAligned);
      const isFirst = !index;
      const isLast = arrayIsLastIndex(snapsAligned, index);
      if (isFirst) return max;
      if (isLast) return min;
      if (usePixelTolerance(min, snap)) return min;
      if (usePixelTolerance(max, snap)) return max;
      return snap;
    }).map((scrollBound) => parseFloat(scrollBound.toFixed(3)));
  }
  function measureContained() {
    if (contentSize <= viewSize + pixelTolerance) return [scrollBounds.max];
    if (containScroll === "keepSnaps") return snapsBounded;
    const {
      min,
      max
    } = scrollContainLimit;
    return snapsBounded.slice(min, max);
  }
  const self = {
    snapsContained,
    scrollContainLimit
  };
  return self;
}
function ScrollLimit(contentSize, scrollSnaps, loop) {
  const max = scrollSnaps[0];
  const min = loop ? max - contentSize : arrayLast(scrollSnaps);
  const limit = Limit(min, max);
  const self = {
    limit
  };
  return self;
}
function ScrollLooper(contentSize, limit, location, vectors) {
  const jointSafety = 0.1;
  const min = limit.min + jointSafety;
  const max = limit.max + jointSafety;
  const {
    reachedMin,
    reachedMax
  } = Limit(min, max);
  function shouldLoop(direction) {
    if (direction === 1) return reachedMax(location.get());
    if (direction === -1) return reachedMin(location.get());
    return false;
  }
  function loop(direction) {
    if (!shouldLoop(direction)) return;
    const loopDistance = contentSize * (direction * -1);
    vectors.forEach((v) => v.add(loopDistance));
  }
  const self = {
    loop
  };
  return self;
}
function ScrollProgress(limit) {
  const {
    max,
    length
  } = limit;
  function get(n) {
    const currentLocation = n - max;
    return length ? currentLocation / -length : 0;
  }
  const self = {
    get
  };
  return self;
}
function ScrollSnaps(axis, alignment, containerRect, slideRects, slidesToScroll) {
  const {
    startEdge,
    endEdge
  } = axis;
  const {
    groupSlides
  } = slidesToScroll;
  const alignments = measureSizes().map(alignment.measure);
  const snaps = measureUnaligned();
  const snapsAligned = measureAligned();
  function measureSizes() {
    return groupSlides(slideRects).map((rects) => arrayLast(rects)[endEdge] - rects[0][startEdge]).map(mathAbs);
  }
  function measureUnaligned() {
    return slideRects.map((rect) => containerRect[startEdge] - rect[startEdge]).map((snap) => -mathAbs(snap));
  }
  function measureAligned() {
    return groupSlides(snaps).map((g) => g[0]).map((snap, index) => snap + alignments[index]);
  }
  const self = {
    snaps,
    snapsAligned
  };
  return self;
}
function SlideRegistry(containSnaps, containScroll, scrollSnaps, scrollContainLimit, slidesToScroll, slideIndexes) {
  const {
    groupSlides
  } = slidesToScroll;
  const {
    min,
    max
  } = scrollContainLimit;
  const slideRegistry = createSlideRegistry();
  function createSlideRegistry() {
    const groupedSlideIndexes = groupSlides(slideIndexes);
    const doNotContain = !containSnaps || containScroll === "keepSnaps";
    if (scrollSnaps.length === 1) return [slideIndexes];
    if (doNotContain) return groupedSlideIndexes;
    return groupedSlideIndexes.slice(min, max).map((group, index, groups) => {
      const isFirst = !index;
      const isLast = arrayIsLastIndex(groups, index);
      if (isFirst) {
        const range = arrayLast(groups[0]) + 1;
        return arrayFromNumber(range);
      }
      if (isLast) {
        const range = arrayLastIndex(slideIndexes) - arrayLast(groups)[0] + 1;
        return arrayFromNumber(range, arrayLast(groups)[0]);
      }
      return group;
    });
  }
  const self = {
    slideRegistry
  };
  return self;
}
function ScrollTarget(loop, scrollSnaps, contentSize, limit, targetVector) {
  const {
    reachedAny,
    removeOffset,
    constrain
  } = limit;
  function minDistance(distances) {
    return distances.concat().sort((a, b) => mathAbs(a) - mathAbs(b))[0];
  }
  function findTargetSnap(target) {
    const distance = loop ? removeOffset(target) : constrain(target);
    const ascDiffsToSnaps = scrollSnaps.map((snap, index2) => ({
      diff: shortcut(snap - distance, 0),
      index: index2
    })).sort((d1, d2) => mathAbs(d1.diff) - mathAbs(d2.diff));
    const {
      index
    } = ascDiffsToSnaps[0];
    return {
      index,
      distance
    };
  }
  function shortcut(target, direction) {
    const targets = [target, target + contentSize, target - contentSize];
    if (!loop) return target;
    if (!direction) return minDistance(targets);
    const matchingTargets = targets.filter((t) => mathSign(t) === direction);
    if (matchingTargets.length) return minDistance(matchingTargets);
    return arrayLast(targets) - contentSize;
  }
  function byIndex(index, direction) {
    const diffToSnap = scrollSnaps[index] - targetVector.get();
    const distance = shortcut(diffToSnap, direction);
    return {
      index,
      distance
    };
  }
  function byDistance(distance, snap) {
    const target = targetVector.get() + distance;
    const {
      index,
      distance: targetSnapDistance
    } = findTargetSnap(target);
    const reachedBound = !loop && reachedAny(target);
    if (!snap || reachedBound) return {
      index,
      distance
    };
    const diffToSnap = scrollSnaps[index] - targetSnapDistance;
    const snapDistance = distance + shortcut(diffToSnap, 0);
    return {
      index,
      distance: snapDistance
    };
  }
  const self = {
    byDistance,
    byIndex,
    shortcut
  };
  return self;
}
function ScrollTo(animation, indexCurrent, indexPrevious, scrollBody, scrollTarget, targetVector, eventHandler) {
  function scrollTo(target) {
    const distanceDiff = target.distance;
    const indexDiff = target.index !== indexCurrent.get();
    targetVector.add(distanceDiff);
    if (distanceDiff) {
      if (scrollBody.duration()) {
        animation.start();
      } else {
        animation.update();
        animation.render(1);
        animation.update();
      }
    }
    if (indexDiff) {
      indexPrevious.set(indexCurrent.get());
      indexCurrent.set(target.index);
      eventHandler.emit("select");
    }
  }
  function distance(n, snap) {
    const target = scrollTarget.byDistance(n, snap);
    scrollTo(target);
  }
  function index(n, direction) {
    const targetIndex = indexCurrent.clone().set(n);
    const target = scrollTarget.byIndex(targetIndex.get(), direction);
    scrollTo(target);
  }
  const self = {
    distance,
    index
  };
  return self;
}
function SlideFocus(root, slides, slideRegistry, scrollTo, scrollBody, eventStore, eventHandler, watchFocus) {
  const focusListenerOptions = {
    passive: true,
    capture: true
  };
  let lastTabPressTime = 0;
  function init(emblaApi) {
    if (!watchFocus) return;
    function defaultCallback(index) {
      const nowTime = (/* @__PURE__ */ new Date()).getTime();
      const diffTime = nowTime - lastTabPressTime;
      if (diffTime > 10) return;
      eventHandler.emit("slideFocusStart");
      root.scrollLeft = 0;
      const group = slideRegistry.findIndex((group2) => group2.includes(index));
      if (!isNumber(group)) return;
      scrollBody.useDuration(0);
      scrollTo.index(group, 0);
      eventHandler.emit("slideFocus");
    }
    eventStore.add(document, "keydown", registerTabPress, false);
    slides.forEach((slide, slideIndex) => {
      eventStore.add(slide, "focus", (evt) => {
        if (isBoolean(watchFocus) || watchFocus(emblaApi, evt)) {
          defaultCallback(slideIndex);
        }
      }, focusListenerOptions);
    });
  }
  function registerTabPress(event) {
    if (event.code === "Tab") lastTabPressTime = (/* @__PURE__ */ new Date()).getTime();
  }
  const self = {
    init
  };
  return self;
}
function Vector1D(initialValue) {
  let value = initialValue;
  function get() {
    return value;
  }
  function set(n) {
    value = normalizeInput(n);
  }
  function add(n) {
    value += normalizeInput(n);
  }
  function subtract(n) {
    value -= normalizeInput(n);
  }
  function normalizeInput(n) {
    return isNumber(n) ? n : n.get();
  }
  const self = {
    get,
    set,
    add,
    subtract
  };
  return self;
}
function Translate(axis, container) {
  const translate = axis.scroll === "x" ? x : y;
  const containerStyle = container.style;
  let previousTarget = null;
  let disabled = false;
  function x(n) {
    return `translate3d(${n}px,0px,0px)`;
  }
  function y(n) {
    return `translate3d(0px,${n}px,0px)`;
  }
  function to(target) {
    if (disabled) return;
    const newTarget = roundToTwoDecimals(axis.direction(target));
    if (newTarget === previousTarget) return;
    containerStyle.transform = translate(newTarget);
    previousTarget = newTarget;
  }
  function toggleActive(active) {
    disabled = !active;
  }
  function clear() {
    if (disabled) return;
    containerStyle.transform = "";
    if (!container.getAttribute("style")) container.removeAttribute("style");
  }
  const self = {
    clear,
    to,
    toggleActive
  };
  return self;
}
function SlideLooper(axis, viewSize, contentSize, slideSizes, slideSizesWithGaps, snaps, scrollSnaps, location, slides) {
  const roundingSafety = 0.5;
  const ascItems = arrayKeys(slideSizesWithGaps);
  const descItems = arrayKeys(slideSizesWithGaps).reverse();
  const loopPoints = startPoints().concat(endPoints());
  function removeSlideSizes(indexes, from) {
    return indexes.reduce((a, i) => {
      return a - slideSizesWithGaps[i];
    }, from);
  }
  function slidesInGap(indexes, gap) {
    return indexes.reduce((a, i) => {
      const remainingGap = removeSlideSizes(a, gap);
      return remainingGap > 0 ? a.concat([i]) : a;
    }, []);
  }
  function findSlideBounds(offset) {
    return snaps.map((snap, index) => ({
      start: snap - slideSizes[index] + roundingSafety + offset,
      end: snap + viewSize - roundingSafety + offset
    }));
  }
  function findLoopPoints(indexes, offset, isEndEdge) {
    const slideBounds = findSlideBounds(offset);
    return indexes.map((index) => {
      const initial = isEndEdge ? 0 : -contentSize;
      const altered = isEndEdge ? contentSize : 0;
      const boundEdge = isEndEdge ? "end" : "start";
      const loopPoint = slideBounds[index][boundEdge];
      return {
        index,
        loopPoint,
        slideLocation: Vector1D(-1),
        translate: Translate(axis, slides[index]),
        target: () => location.get() > loopPoint ? initial : altered
      };
    });
  }
  function startPoints() {
    const gap = scrollSnaps[0];
    const indexes = slidesInGap(descItems, gap);
    return findLoopPoints(indexes, contentSize, false);
  }
  function endPoints() {
    const gap = viewSize - scrollSnaps[0] - 1;
    const indexes = slidesInGap(ascItems, gap);
    return findLoopPoints(indexes, -contentSize, true);
  }
  function canLoop() {
    return loopPoints.every(({
      index
    }) => {
      const otherIndexes = ascItems.filter((i) => i !== index);
      return removeSlideSizes(otherIndexes, viewSize) <= 0.1;
    });
  }
  function loop() {
    loopPoints.forEach((loopPoint) => {
      const {
        target,
        translate,
        slideLocation
      } = loopPoint;
      const shiftLocation = target();
      if (shiftLocation === slideLocation.get()) return;
      translate.to(shiftLocation);
      slideLocation.set(shiftLocation);
    });
  }
  function clear() {
    loopPoints.forEach((loopPoint) => loopPoint.translate.clear());
  }
  const self = {
    canLoop,
    clear,
    loop,
    loopPoints
  };
  return self;
}
function SlidesHandler(container, eventHandler, watchSlides) {
  let mutationObserver;
  let destroyed = false;
  function init(emblaApi) {
    if (!watchSlides) return;
    function defaultCallback(mutations) {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          emblaApi.reInit();
          eventHandler.emit("slidesChanged");
          break;
        }
      }
    }
    mutationObserver = new MutationObserver((mutations) => {
      if (destroyed) return;
      if (isBoolean(watchSlides) || watchSlides(emblaApi, mutations)) {
        defaultCallback(mutations);
      }
    });
    mutationObserver.observe(container, {
      childList: true
    });
  }
  function destroy() {
    if (mutationObserver) mutationObserver.disconnect();
    destroyed = true;
  }
  const self = {
    init,
    destroy
  };
  return self;
}
function SlidesInView(container, slides, eventHandler, threshold) {
  const intersectionEntryMap = {};
  let inViewCache = null;
  let notInViewCache = null;
  let intersectionObserver;
  let destroyed = false;
  function init() {
    intersectionObserver = new IntersectionObserver((entries) => {
      if (destroyed) return;
      entries.forEach((entry) => {
        const index = slides.indexOf(entry.target);
        intersectionEntryMap[index] = entry;
      });
      inViewCache = null;
      notInViewCache = null;
      eventHandler.emit("slidesInView");
    }, {
      root: container.parentElement,
      threshold
    });
    slides.forEach((slide) => intersectionObserver.observe(slide));
  }
  function destroy() {
    if (intersectionObserver) intersectionObserver.disconnect();
    destroyed = true;
  }
  function createInViewList(inView) {
    return objectKeys(intersectionEntryMap).reduce((list, slideIndex) => {
      const index = parseInt(slideIndex);
      const {
        isIntersecting
      } = intersectionEntryMap[index];
      const inViewMatch = inView && isIntersecting;
      const notInViewMatch = !inView && !isIntersecting;
      if (inViewMatch || notInViewMatch) list.push(index);
      return list;
    }, []);
  }
  function get(inView = true) {
    if (inView && inViewCache) return inViewCache;
    if (!inView && notInViewCache) return notInViewCache;
    const slideIndexes = createInViewList(inView);
    if (inView) inViewCache = slideIndexes;
    if (!inView) notInViewCache = slideIndexes;
    return slideIndexes;
  }
  const self = {
    init,
    destroy,
    get
  };
  return self;
}
function SlideSizes(axis, containerRect, slideRects, slides, readEdgeGap, ownerWindow) {
  const {
    measureSize,
    startEdge,
    endEdge
  } = axis;
  const withEdgeGap = slideRects[0] && readEdgeGap;
  const startGap = measureStartGap();
  const endGap = measureEndGap();
  const slideSizes = slideRects.map(measureSize);
  const slideSizesWithGaps = measureWithGaps();
  function measureStartGap() {
    if (!withEdgeGap) return 0;
    const slideRect = slideRects[0];
    return mathAbs(containerRect[startEdge] - slideRect[startEdge]);
  }
  function measureEndGap() {
    if (!withEdgeGap) return 0;
    const style = ownerWindow.getComputedStyle(arrayLast(slides));
    return parseFloat(style.getPropertyValue(`margin-${endEdge}`));
  }
  function measureWithGaps() {
    return slideRects.map((rect, index, rects) => {
      const isFirst = !index;
      const isLast = arrayIsLastIndex(rects, index);
      if (isFirst) return slideSizes[index] + startGap;
      if (isLast) return slideSizes[index] + endGap;
      return rects[index + 1][startEdge] - rect[startEdge];
    }).map(mathAbs);
  }
  const self = {
    slideSizes,
    slideSizesWithGaps,
    startGap,
    endGap
  };
  return self;
}
function SlidesToScroll(axis, viewSize, slidesToScroll, loop, containerRect, slideRects, startGap, endGap, pixelTolerance) {
  const {
    startEdge,
    endEdge,
    direction
  } = axis;
  const groupByNumber = isNumber(slidesToScroll);
  function byNumber(array, groupSize) {
    return arrayKeys(array).filter((i) => i % groupSize === 0).map((i) => array.slice(i, i + groupSize));
  }
  function bySize(array) {
    if (!array.length) return [];
    return arrayKeys(array).reduce((groups, rectB, index) => {
      const rectA = arrayLast(groups) || 0;
      const isFirst = rectA === 0;
      const isLast = rectB === arrayLastIndex(array);
      const edgeA = containerRect[startEdge] - slideRects[rectA][startEdge];
      const edgeB = containerRect[startEdge] - slideRects[rectB][endEdge];
      const gapA = !loop && isFirst ? direction(startGap) : 0;
      const gapB = !loop && isLast ? direction(endGap) : 0;
      const chunkSize = mathAbs(edgeB - gapB - (edgeA + gapA));
      if (index && chunkSize > viewSize + pixelTolerance) groups.push(rectB);
      if (isLast) groups.push(array.length);
      return groups;
    }, []).map((currentSize, index, groups) => {
      const previousSize = Math.max(groups[index - 1] || 0);
      return array.slice(previousSize, currentSize);
    });
  }
  function groupSlides(array) {
    return groupByNumber ? byNumber(array, slidesToScroll) : bySize(array);
  }
  const self = {
    groupSlides
  };
  return self;
}
function Engine(root, container, slides, ownerDocument, ownerWindow, options, eventHandler) {
  const {
    align,
    axis: scrollAxis,
    direction,
    startIndex,
    loop,
    duration,
    dragFree,
    dragThreshold,
    inViewThreshold,
    slidesToScroll: groupSlides,
    skipSnaps,
    containScroll,
    watchResize,
    watchSlides,
    watchDrag,
    watchFocus
  } = options;
  const pixelTolerance = 2;
  const nodeRects = NodeRects();
  const containerRect = nodeRects.measure(container);
  const slideRects = slides.map(nodeRects.measure);
  const axis = Axis(scrollAxis, direction);
  const viewSize = axis.measureSize(containerRect);
  const percentOfView = PercentOfView(viewSize);
  const alignment = Alignment(align, viewSize);
  const containSnaps = !loop && !!containScroll;
  const readEdgeGap = loop || !!containScroll;
  const {
    slideSizes,
    slideSizesWithGaps,
    startGap,
    endGap
  } = SlideSizes(axis, containerRect, slideRects, slides, readEdgeGap, ownerWindow);
  const slidesToScroll = SlidesToScroll(axis, viewSize, groupSlides, loop, containerRect, slideRects, startGap, endGap, pixelTolerance);
  const {
    snaps,
    snapsAligned
  } = ScrollSnaps(axis, alignment, containerRect, slideRects, slidesToScroll);
  const contentSize = -arrayLast(snaps) + arrayLast(slideSizesWithGaps);
  const {
    snapsContained,
    scrollContainLimit
  } = ScrollContain(viewSize, contentSize, snapsAligned, containScroll, pixelTolerance);
  const scrollSnaps = containSnaps ? snapsContained : snapsAligned;
  const {
    limit
  } = ScrollLimit(contentSize, scrollSnaps, loop);
  const index = Counter(arrayLastIndex(scrollSnaps), startIndex, loop);
  const indexPrevious = index.clone();
  const slideIndexes = arrayKeys(slides);
  const update = ({
    dragHandler,
    scrollBody: scrollBody2,
    scrollBounds,
    options: {
      loop: loop2
    }
  }) => {
    if (!loop2) scrollBounds.constrain(dragHandler.pointerDown());
    scrollBody2.seek();
  };
  const render = ({
    scrollBody: scrollBody2,
    translate,
    location: location2,
    offsetLocation: offsetLocation2,
    previousLocation: previousLocation2,
    scrollLooper,
    slideLooper,
    dragHandler,
    animation: animation2,
    eventHandler: eventHandler2,
    scrollBounds,
    options: {
      loop: loop2
    }
  }, alpha) => {
    const shouldSettle = scrollBody2.settled();
    const withinBounds = !scrollBounds.shouldConstrain();
    const hasSettled = loop2 ? shouldSettle : shouldSettle && withinBounds;
    const hasSettledAndIdle = hasSettled && !dragHandler.pointerDown();
    if (hasSettledAndIdle) animation2.stop();
    const interpolatedLocation = location2.get() * alpha + previousLocation2.get() * (1 - alpha);
    offsetLocation2.set(interpolatedLocation);
    if (loop2) {
      scrollLooper.loop(scrollBody2.direction());
      slideLooper.loop();
    }
    translate.to(offsetLocation2.get());
    if (hasSettledAndIdle) eventHandler2.emit("settle");
    if (!hasSettled) eventHandler2.emit("scroll");
  };
  const animation = Animations(ownerDocument, ownerWindow, () => update(engine), (alpha) => render(engine, alpha));
  const friction = 0.68;
  const startLocation = scrollSnaps[index.get()];
  const location = Vector1D(startLocation);
  const previousLocation = Vector1D(startLocation);
  const offsetLocation = Vector1D(startLocation);
  const target = Vector1D(startLocation);
  const scrollBody = ScrollBody(location, offsetLocation, previousLocation, target, duration, friction);
  const scrollTarget = ScrollTarget(loop, scrollSnaps, contentSize, limit, target);
  const scrollTo = ScrollTo(animation, index, indexPrevious, scrollBody, scrollTarget, target, eventHandler);
  const scrollProgress = ScrollProgress(limit);
  const eventStore = EventStore();
  const slidesInView = SlidesInView(container, slides, eventHandler, inViewThreshold);
  const {
    slideRegistry
  } = SlideRegistry(containSnaps, containScroll, scrollSnaps, scrollContainLimit, slidesToScroll, slideIndexes);
  const slideFocus = SlideFocus(root, slides, slideRegistry, scrollTo, scrollBody, eventStore, eventHandler, watchFocus);
  const engine = {
    ownerDocument,
    ownerWindow,
    eventHandler,
    containerRect,
    slideRects,
    animation,
    axis,
    dragHandler: DragHandler(axis, root, ownerDocument, ownerWindow, target, DragTracker(axis, ownerWindow), location, animation, scrollTo, scrollBody, scrollTarget, index, eventHandler, percentOfView, dragFree, dragThreshold, skipSnaps, friction, watchDrag),
    eventStore,
    percentOfView,
    index,
    indexPrevious,
    limit,
    location,
    offsetLocation,
    previousLocation,
    options,
    resizeHandler: ResizeHandler(container, eventHandler, ownerWindow, slides, axis, watchResize, nodeRects),
    scrollBody,
    scrollBounds: ScrollBounds(limit, offsetLocation, target, scrollBody, percentOfView),
    scrollLooper: ScrollLooper(contentSize, limit, offsetLocation, [location, offsetLocation, previousLocation, target]),
    scrollProgress,
    scrollSnapList: scrollSnaps.map(scrollProgress.get),
    scrollSnaps,
    scrollTarget,
    scrollTo,
    slideLooper: SlideLooper(axis, viewSize, contentSize, slideSizes, slideSizesWithGaps, snaps, scrollSnaps, offsetLocation, slides),
    slideFocus,
    slidesHandler: SlidesHandler(container, eventHandler, watchSlides),
    slidesInView,
    slideIndexes,
    slideRegistry,
    slidesToScroll,
    target,
    translate: Translate(axis, container)
  };
  return engine;
}
function EventHandler() {
  let listeners = {};
  let api;
  function init(emblaApi) {
    api = emblaApi;
  }
  function getListeners(evt) {
    return listeners[evt] || [];
  }
  function emit(evt) {
    getListeners(evt).forEach((e) => e(api, evt));
    return self;
  }
  function on(evt, cb) {
    listeners[evt] = getListeners(evt).concat([cb]);
    return self;
  }
  function off(evt, cb) {
    listeners[evt] = getListeners(evt).filter((e) => e !== cb);
    return self;
  }
  function clear() {
    listeners = {};
  }
  const self = {
    init,
    emit,
    off,
    on,
    clear
  };
  return self;
}
const defaultOptions = {
  align: "center",
  axis: "x",
  container: null,
  slides: null,
  containScroll: "trimSnaps",
  direction: "ltr",
  slidesToScroll: 1,
  inViewThreshold: 0,
  breakpoints: {},
  dragFree: false,
  dragThreshold: 10,
  loop: false,
  skipSnaps: false,
  duration: 25,
  startIndex: 0,
  active: true,
  watchDrag: true,
  watchResize: true,
  watchSlides: true,
  watchFocus: true
};
function OptionsHandler(ownerWindow) {
  function mergeOptions(optionsA, optionsB) {
    return objectsMergeDeep(optionsA, optionsB || {});
  }
  function optionsAtMedia(options) {
    const optionsAtMedia2 = options.breakpoints || {};
    const matchedMediaOptions = objectKeys(optionsAtMedia2).filter((media) => ownerWindow.matchMedia(media).matches).map((media) => optionsAtMedia2[media]).reduce((a, mediaOption) => mergeOptions(a, mediaOption), {});
    return mergeOptions(options, matchedMediaOptions);
  }
  function optionsMediaQueries(optionsList) {
    return optionsList.map((options) => objectKeys(options.breakpoints || {})).reduce((acc, mediaQueries) => acc.concat(mediaQueries), []).map(ownerWindow.matchMedia);
  }
  const self = {
    mergeOptions,
    optionsAtMedia,
    optionsMediaQueries
  };
  return self;
}
function PluginsHandler(optionsHandler) {
  let activePlugins = [];
  function init(emblaApi, plugins) {
    activePlugins = plugins.filter(({
      options
    }) => optionsHandler.optionsAtMedia(options).active !== false);
    activePlugins.forEach((plugin) => plugin.init(emblaApi, optionsHandler));
    return plugins.reduce((map, plugin) => Object.assign(map, {
      [plugin.name]: plugin
    }), {});
  }
  function destroy() {
    activePlugins = activePlugins.filter((plugin) => plugin.destroy());
  }
  const self = {
    init,
    destroy
  };
  return self;
}
function EmblaCarousel(root, userOptions, userPlugins) {
  const ownerDocument = root.ownerDocument;
  const ownerWindow = ownerDocument.defaultView;
  const optionsHandler = OptionsHandler(ownerWindow);
  const pluginsHandler = PluginsHandler(optionsHandler);
  const mediaHandlers = EventStore();
  const eventHandler = EventHandler();
  const {
    mergeOptions,
    optionsAtMedia,
    optionsMediaQueries
  } = optionsHandler;
  const {
    on,
    off,
    emit
  } = eventHandler;
  const reInit = reActivate;
  let destroyed = false;
  let engine;
  let optionsBase = mergeOptions(defaultOptions, EmblaCarousel.globalOptions);
  let options = mergeOptions(optionsBase);
  let pluginList = [];
  let pluginApis;
  let container;
  let slides;
  function storeElements() {
    const {
      container: userContainer,
      slides: userSlides
    } = options;
    const customContainer = isString(userContainer) ? root.querySelector(userContainer) : userContainer;
    container = customContainer || root.children[0];
    const customSlides = isString(userSlides) ? container.querySelectorAll(userSlides) : userSlides;
    slides = [].slice.call(customSlides || container.children);
  }
  function createEngine(options2) {
    const engine2 = Engine(root, container, slides, ownerDocument, ownerWindow, options2, eventHandler);
    if (options2.loop && !engine2.slideLooper.canLoop()) {
      const optionsWithoutLoop = Object.assign({}, options2, {
        loop: false
      });
      return createEngine(optionsWithoutLoop);
    }
    return engine2;
  }
  function activate(withOptions, withPlugins) {
    if (destroyed) return;
    optionsBase = mergeOptions(optionsBase, withOptions);
    options = optionsAtMedia(optionsBase);
    pluginList = withPlugins || pluginList;
    storeElements();
    engine = createEngine(options);
    optionsMediaQueries([optionsBase, ...pluginList.map(({
      options: options2
    }) => options2)]).forEach((query) => mediaHandlers.add(query, "change", reActivate));
    if (!options.active) return;
    engine.translate.to(engine.location.get());
    engine.animation.init();
    engine.slidesInView.init();
    engine.slideFocus.init(self);
    engine.eventHandler.init(self);
    engine.resizeHandler.init(self);
    engine.slidesHandler.init(self);
    if (engine.options.loop) engine.slideLooper.loop();
    if (container.offsetParent && slides.length) engine.dragHandler.init(self);
    pluginApis = pluginsHandler.init(self, pluginList);
  }
  function reActivate(withOptions, withPlugins) {
    const startIndex = selectedScrollSnap();
    deActivate();
    activate(mergeOptions({
      startIndex
    }, withOptions), withPlugins);
    eventHandler.emit("reInit");
  }
  function deActivate() {
    engine.dragHandler.destroy();
    engine.eventStore.clear();
    engine.translate.clear();
    engine.slideLooper.clear();
    engine.resizeHandler.destroy();
    engine.slidesHandler.destroy();
    engine.slidesInView.destroy();
    engine.animation.destroy();
    pluginsHandler.destroy();
    mediaHandlers.clear();
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    mediaHandlers.clear();
    deActivate();
    eventHandler.emit("destroy");
    eventHandler.clear();
  }
  function scrollTo(index, jump, direction) {
    if (!options.active || destroyed) return;
    engine.scrollBody.useBaseFriction().useDuration(jump === true ? 0 : options.duration);
    engine.scrollTo.index(index, direction || 0);
  }
  function scrollNext(jump) {
    const next = engine.index.add(1).get();
    scrollTo(next, jump, -1);
  }
  function scrollPrev(jump) {
    const prev = engine.index.add(-1).get();
    scrollTo(prev, jump, 1);
  }
  function canScrollNext() {
    const next = engine.index.add(1).get();
    return next !== selectedScrollSnap();
  }
  function canScrollPrev() {
    const prev = engine.index.add(-1).get();
    return prev !== selectedScrollSnap();
  }
  function scrollSnapList() {
    return engine.scrollSnapList;
  }
  function scrollProgress() {
    return engine.scrollProgress.get(engine.offsetLocation.get());
  }
  function selectedScrollSnap() {
    return engine.index.get();
  }
  function previousScrollSnap() {
    return engine.indexPrevious.get();
  }
  function slidesInView() {
    return engine.slidesInView.get();
  }
  function slidesNotInView() {
    return engine.slidesInView.get(false);
  }
  function plugins() {
    return pluginApis;
  }
  function internalEngine() {
    return engine;
  }
  function rootNode() {
    return root;
  }
  function containerNode() {
    return container;
  }
  function slideNodes() {
    return slides;
  }
  const self = {
    canScrollNext,
    canScrollPrev,
    containerNode,
    internalEngine,
    destroy,
    off,
    on,
    emit,
    plugins,
    previousScrollSnap,
    reInit,
    rootNode,
    scrollNext,
    scrollPrev,
    scrollProgress,
    scrollSnapList,
    scrollTo,
    selectedScrollSnap,
    slideNodes,
    slidesInView,
    slidesNotInView
  };
  activate(userOptions, userPlugins);
  setTimeout(() => eventHandler.emit("init"), 0);
  return self;
}
EmblaCarousel.globalOptions = void 0;
function useEmblaCarousel(options = {}, plugins = []) {
  const storedOptions = reactExports.useRef(options);
  const storedPlugins = reactExports.useRef(plugins);
  const [emblaApi, setEmblaApi] = reactExports.useState();
  const [viewport, setViewport] = reactExports.useState();
  const reInit = reactExports.useCallback(() => {
    if (emblaApi) emblaApi.reInit(storedOptions.current, storedPlugins.current);
  }, [emblaApi]);
  reactExports.useEffect(() => {
    if (areOptionsEqual(storedOptions.current, options)) return;
    storedOptions.current = options;
    reInit();
  }, [options, reInit]);
  reactExports.useEffect(() => {
    if (arePluginsEqual(storedPlugins.current, plugins)) return;
    storedPlugins.current = plugins;
    reInit();
  }, [plugins, reInit]);
  reactExports.useEffect(() => {
    if (canUseDOM() && viewport) {
      EmblaCarousel.globalOptions = useEmblaCarousel.globalOptions;
      const newEmblaApi = EmblaCarousel(viewport, storedOptions.current, storedPlugins.current);
      setEmblaApi(newEmblaApi);
      return () => newEmblaApi.destroy();
    } else {
      setEmblaApi(void 0);
    }
  }, [viewport, setEmblaApi]);
  return [setViewport, emblaApi];
}
useEmblaCarousel.globalOptions = void 0;
const CarouselContext = reactExports.createContext(null);
function useCarousel() {
  const context = reactExports.useContext(CarouselContext);
  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }
  return context;
}
function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}) {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y"
    },
    plugins
  );
  const [canScrollPrev, setCanScrollPrev] = reactExports.useState(false);
  const [canScrollNext, setCanScrollNext] = reactExports.useState(false);
  const onSelect = reactExports.useCallback((api2) => {
    if (!api2) return;
    setCanScrollPrev(api2.canScrollPrev());
    setCanScrollNext(api2.canScrollNext());
  }, []);
  const scrollPrev = reactExports.useCallback(() => {
    api?.scrollPrev();
  }, [api]);
  const scrollNext = reactExports.useCallback(() => {
    api?.scrollNext();
  }, [api]);
  const handleKeyDown = reactExports.useCallback(
    (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollNext();
      }
    },
    [scrollPrev, scrollNext]
  );
  reactExports.useEffect(() => {
    if (!api || !setApi) return;
    setApi(api);
  }, [api, setApi]);
  reactExports.useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);
    return () => {
      api?.off("select", onSelect);
    };
  }, [api, onSelect]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    CarouselContext.Provider,
    {
      value: {
        carouselRef,
        api,
        opts,
        orientation: orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "section",
        {
          onKeyDownCapture: handleKeyDown,
          className: cn("relative", className),
          "data-slot": "carousel",
          ...props,
          children
        }
      )
    }
  );
}
function CarouselContent({ className, ...props }) {
  const { carouselRef, orientation } = useCarousel();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: carouselRef, className: "overflow-hidden", "data-slot": "carousel-content", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: cn("flex", orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col", className),
      ...props
    }
  ) });
}
function CarouselItem({ className, ...props }) {
  const { orientation } = useCarousel();
  return (
    // <fieldset> would be the lint-preferred swap for role="group", but
    // a fieldset semantically scopes form controls — wrong for a slide.
    // Keep the ARIA-only annotation.
    // biome-ignore lint/a11y/useSemanticElements: slide is not a form group
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        role: "group",
        "aria-roledescription": "slide",
        "data-slot": "carousel-item",
        className: cn(
          "min-w-0 shrink-0 grow-0 basis-full",
          orientation === "horizontal" ? "pl-4" : "pt-4",
          className
        ),
        ...props
      }
    )
  );
}
function resolvePluginIcon$1(icon, locale) {
  if (!icon) return void 0;
  if (typeof icon === "string") return icon || void 0;
  return pickLocalized(icon, locale) || void 0;
}
const VIDEO_EXT_RE = /\.(mp4|webm|mov)(?:$|\?)/i;
const ANIMATABLE_ICON_RE = /\.(gif|webp|apng)(\?|#|$)/i;
function isVideoUrl(url) {
  return VIDEO_EXT_RE.test(url);
}
function StaticFirstFrameIcon({ src }) {
  const canvasRef = reactExports.useRef(null);
  const [snapshotReady, setSnapshotReady] = reactExports.useState(false);
  const [imageFailed, setImageFailed] = reactExports.useState(false);
  const animatable = ANIMATABLE_ICON_RE.test(src);
  reactExports.useEffect(() => {
    setImageFailed(false);
    if (!animatable) {
      setSnapshotReady(false);
      return;
    }
    setSnapshotReady(false);
    let cancelled = false;
    const img = new Image();
    const draw = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas || img.naturalWidth === 0 || img.naturalHeight === 0) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      setSnapshotReady(true);
    };
    img.onload = draw;
    img.onerror = () => {
      if (!cancelled) {
        setSnapshotReady(false);
        setImageFailed(true);
      }
    };
    img.src = src;
    if (img.complete) draw();
    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [animatable, src]);
  if (imageFailed) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex size-full items-center justify-center overflow-hidden rounded-md", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PluginIcon, { size: 20, strokeWidth: 1.5 }) });
  }
  if (!animatable) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "img",
      {
        src,
        alt: "",
        className: "size-full object-cover",
        draggable: false,
        referrerPolicy: "no-referrer",
        onError: () => setImageFailed(true)
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex size-full items-center justify-center overflow-hidden rounded-md", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "canvas",
      {
        ref: canvasRef,
        className: `size-full object-cover ${snapshotReady ? "" : "hidden"}`
      }
    ),
    !snapshotReady && /* @__PURE__ */ jsxRuntimeExports.jsx(PluginIcon, { size: 20, strokeWidth: 1.5 })
  ] });
}
function PluginMarketDetailDialog({
  plugin,
  installedSkill,
  installing,
  onClose,
  onInstall,
  onUninstall
}) {
  const { t, i18n } = useTranslation();
  const locale = normalizePluginLocale(i18n.language);
  const [api, setApi] = reactExports.useState(null);
  reactExports.useEffect(() => {
    api?.scrollTo(0, true);
  }, [plugin?.id]);
  const displayName = plugin ? pickLocalized(plugin.name, locale) || plugin.id : "";
  const summary = plugin ? pickLocalized(plugin.description, locale) : "";
  const description = plugin ? pickLocalized(plugin.details, locale) : "";
  const tags = plugin ? pickLocalized(plugin.tags, locale, []) : [];
  const iconUrl = plugin ? resolvePluginIcon$1(plugin.icon, locale) : void 0;
  const previews = plugin ? pickLocalized(plugin.previews, locale, []) : [];
  const version = plugin?.version;
  const isInstalled = !!installedSkill;
  const carouselPlugins = reactExports.useMemo(
    () => previews.length > 1 ? [Autoplay({ delay: 1500, stopOnInteraction: false, stopOnMouseEnter: true })] : [],
    [previews.length]
  );
  const handleInstallClick = reactExports.useCallback(() => {
    if (plugin) onInstall(plugin.id);
  }, [plugin, onInstall]);
  const handleUninstall = reactExports.useCallback(() => {
    if (plugin) onUninstall(plugin.id);
  }, [plugin, onUninstall]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!plugin, onOpenChange: (open) => !open && onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { className: "sm:max-w-[560px] p-0 gap-0 overflow-hidden", children: plugin && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col max-h-[80vh]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "shrink-0 px-5 pt-5 pb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground", children: iconUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(StaticFirstFrameIcon, { src: iconUrl }) : /* @__PURE__ */ jsxRuntimeExports.jsx(PluginIcon, { size: 20, strokeWidth: 1.5 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-base font-medium text-foreground leading-tight", children: displayName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 text-[11px] text-muted-foreground font-mono", children: plugin.id })
        ] })
      ] }),
      (tags.length > 0 || version) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1 mt-3", children: [
        tags.map((tag) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          Badge,
          {
            variant: "secondary",
            className: "bg-muted text-muted-foreground font-normal",
            children: tag
          },
          tag
        )),
        version && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Badge,
          {
            variant: "secondary",
            className: "bg-muted text-muted-foreground font-normal",
            children: [
              "v",
              version
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto px-5 pb-4", children: [
      previews.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Carousel,
        {
          setApi,
          opts: {
            loop: previews.length > 1,
            align: "start"
          },
          plugins: carouselPlugins,
          "data-action-ui-id": "plugin-market-detail-carousel",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(CarouselContent, { className: "ml-0", children: previews.map((url, idx) => {
            const isVideo = isVideoUrl(url);
            return /* @__PURE__ */ jsxRuntimeExports.jsx(CarouselItem, { className: "pl-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative w-full aspect-video bg-muted overflow-hidden border border-border", children: isVideo ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              PluginPreviewVideo,
              {
                src: url,
                label: `${displayName} preview ${idx + 1}`
              }
            ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
              "img",
              {
                src: url,
                alt: `${displayName} preview ${idx + 1}`,
                className: "size-full object-contain",
                draggable: false
              }
            ) }) }, url);
          }) })
        }
      ) }),
      summary && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-medium text-foreground", children: t("skills.plugin.detail.summary") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground leading-relaxed mt-1", children: summary })
      ] }),
      (summary || previews.length > 0) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border my-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-medium text-foreground", children: t("skills.plugin.detail.description") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground leading-relaxed mt-1 whitespace-pre-wrap", children: description || t("skills.plugin.detail.noDescription") })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0 px-5 py-3 border-t border-border bg-background flex items-center justify-end", children: isInstalled ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Button,
      {
        "data-action-ui-id": "plugin-market-detail-uninstall",
        variant: "outline",
        size: "sm",
        className: "text-xs hover:text-destructive hover:border-destructive/40",
        onClick: handleUninstall,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2$1, { size: 14, strokeWidth: 1.5 }),
          t("skills.plugin.uninstall")
        ]
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Button,
      {
        "data-action-ui-id": "plugin-market-detail-install",
        variant: "outline",
        size: "sm",
        loading: installing,
        className: "text-xs",
        onClick: handleInstallClick,
        children: [
          !installing && /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 14, strokeWidth: 1.5 }),
          installing ? t("skills.plugin.installing") : t("skills.plugin.install")
        ]
      }
    ) })
  ] }) }) });
}
function PluginPreviewVideo({ src, label }) {
  const videoRef = reactExports.useRef(null);
  const handleLoadedMetadata = reactExports.useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    try {
      el.currentTime = 1e-3;
    } catch {
    }
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative size-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    "video",
    {
      ref: videoRef,
      src,
      className: "size-full object-contain",
      playsInline: true,
      preload: "metadata",
      "aria-label": label,
      onLoadedMetadata: handleLoadedMetadata,
      onLoadedData: handleLoadedMetadata
    }
  ) });
}
function resolvePluginIcon(icon, locale) {
  if (!icon) return void 0;
  if (typeof icon === "string") return icon || void 0;
  return pickLocalized(icon, locale) || void 0;
}
function PluginMarketListItem({
  plugin,
  installedSkill,
  onDetail,
  onInstall,
  installing,
  onUninstall
}) {
  const { t, i18n } = useTranslation();
  const locale = normalizePluginLocale(i18n.language);
  const displayName = pickLocalized(plugin.name, locale) || plugin.id;
  const summary = pickLocalized(plugin.description, locale);
  const iconUrl = resolvePluginIcon(plugin.icon, locale);
  const downloads = plugin.downloads;
  const isInstalled = !!installedSkill;
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: list row click opens detail
    // biome-ignore lint/a11y/noStaticElementInteractions: list row click opens detail
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-action-ui-id": "plugin-market-list-item",
        "data-plugin-id": plugin.id,
        className: "group flex items-center gap-3 rounded-lg border border-transparent bg-card px-4 py-3 transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm cursor-pointer",
        onClick: () => onDetail?.(plugin),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground overflow-hidden", children: iconUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: iconUrl, alt: "", className: "size-full object-contain", draggable: false }) : /* @__PURE__ */ jsxRuntimeExports.jsx(PluginIcon, { size: 14, strokeWidth: 1.5 }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-sm font-semibold text-foreground", children: displayName }),
              downloads != null && downloads > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 12, strokeWidth: 1.5 }),
                formatDownloads(downloads)
              ] })
            ] }),
            summary && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 truncate text-xs text-muted-foreground", children: summary })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex shrink-0 items-center gap-2", onClick: (e) => e.stopPropagation(), children: isInstalled ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              "data-action-ui-id": "plugin-market-uninstall",
              className: "inline-flex items-center gap-1.5 h-7 rounded-md px-2.5 text-xs font-medium border border-foreground/15 bg-transparent text-foreground hover:bg-muted hover:text-destructive hover:border-destructive/40 transition-colors",
              onClick: () => onUninstall?.(plugin.id),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2$1, { size: 14, strokeWidth: 1.5 }),
                t("skills.plugin.uninstall")
              ]
            }
          ) : onInstall && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "data-action-ui-id": "plugin-market-install",
              disabled: installing,
              className: "inline-flex items-center gap-1.5 h-7 rounded-md px-3 text-xs font-medium border border-foreground/15 bg-transparent text-foreground hover:bg-muted hover:border-foreground/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              onClick: () => onInstall(plugin.id),
              children: installing ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 14, strokeWidth: 1.5, className: "animate-spin" }),
                t("skills.plugin.installing")
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 14, strokeWidth: 1.5 }),
                t("skills.plugin.install")
              ] })
            }
          ) })
        ]
      }
    )
  );
}
function useSkillDetail(name, accountId, language) {
  const key = JSON.stringify([name, accountId, language]);
  const [snapshot, setSnapshot] = reactExports.useState();
  reactExports.useEffect(() => {
    const abort = new AbortController();
    void gatewayFetch(`/api/skills/market/detail?${new URLSearchParams({ name })}`, {
      signal: abort.signal
    }).then(async (response) => {
      if (!response.ok) throw new Error("Skill detail unavailable");
      return mapCloudSkillDetail(await response.json());
    }).then((detail) => {
      if (!abort.signal.aborted) setSnapshot({ key, detail });
    }).catch(() => {
      if (!abort.signal.aborted) setSnapshot({ key, detail: { canSubmitToCommunity: false } });
    });
    return () => abort.abort();
  }, [name, key]);
  return snapshot?.key === key ? snapshot.detail : void 0;
}
function skillDetailMedia(skill, failed = /* @__PURE__ */ new Set()) {
  const showcase = [...new Set(skill.showcase?.filter(isSkillShowcaseUrl) ?? [])].filter(
    (url) => !failed.has(url)
  );
  if (showcase.length) return showcase;
  return [CDN_SKILL_SHOWCASE_FALLBACK];
}
function isSkillDetailVideo(url) {
  return /\.(?:mp4|webm|mov|m4v)(?:[?#]|$)/i.test(url);
}
function mergeSkillDetail(skill, market) {
  if (!market || market.name !== skill.name) return skill;
  if ("enabled" in skill) {
    return {
      ...market,
      ...skill,
      showcase: market.showcase ?? skill.showcase,
      structuredInfo: market.structuredInfo ?? skill.structuredInfo,
      coverUrl: market.coverUrl || skill.coverUrl,
      authorCn: market.authorCn || skill.authorCn,
      authorEn: market.authorEn || skill.authorEn,
      marketSource: market.source || skill.marketSource
    };
  }
  return { ...skill, ...market };
}
function canSubmitSkillDetail(entry, skill, uploadedByCurrentUser) {
  return entry === "mine" && "enabled" in skill && uploadedByCurrentUser;
}
function ShowcaseVideoPlayer({ src, label, active, onError }) {
  const { t } = useTranslation();
  const videoRef = reactExports.useRef(null);
  const [playing, setPlaying] = reactExports.useState(false);
  const [muted, setMuted] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const sync = () => setPlaying(!el.paused && !el.ended);
    el.addEventListener("play", sync);
    el.addEventListener("pause", sync);
    el.addEventListener("ended", sync);
    sync();
    return () => {
      el.removeEventListener("play", sync);
      el.removeEventListener("pause", sync);
      el.removeEventListener("ended", sync);
    };
  }, []);
  reactExports.useEffect(() => {
    if (active) return;
    videoRef.current?.pause();
  }, [active]);
  const togglePlay = reactExports.useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => void 0);
    else el.pause();
  }, []);
  const toggleMute = reactExports.useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "showcase-video-player group relative size-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "video",
      {
        ref: videoRef,
        src,
        playsInline: true,
        preload: "metadata",
        controlsList: "nodownload noplaybackrate noremoteplayback",
        disablePictureInPicture: true,
        disableRemotePlayback: true,
        width: 1920,
        height: 1080,
        onError,
        "aria-label": label,
        className: "size-full object-contain"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        "aria-hidden": "true",
        tabIndex: -1,
        onClick: togglePlay,
        className: "absolute inset-0 cursor-pointer"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: cn(
          "showcase-video-player-scrim pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 px-3 pb-2 pt-8 transition-opacity duration-150",
          "text-modal-mask-foreground",
          playing ? "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100" : "opacity-100"
        ),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: togglePlay,
                "data-action-ui-id": "skill-detail-showcase-video-toggle-play",
                "aria-label": playing ? t("common.pause") : t("common.play"),
                className: "showcase-video-player-button pointer-events-auto flex size-7 shrink-0 items-center justify-center rounded-md",
                children: playing ? /* @__PURE__ */ jsxRuntimeExports.jsx(Pause, { size: 16, strokeWidth: 1.5 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Play$1, { size: 16, strokeWidth: 1.5 })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ProgressBar, { videoRef, isPlaying: playing, display: "time" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: toggleMute,
                "data-action-ui-id": "skill-detail-showcase-video-toggle-mute",
                "aria-label": muted ? t("assetPreview.unmute") : t("assetPreview.mute"),
                className: "showcase-video-player-button pointer-events-auto ml-auto flex size-7 shrink-0 items-center justify-center rounded-md",
                children: muted ? /* @__PURE__ */ jsxRuntimeExports.jsx(VolumeX, { size: 16, strokeWidth: 1.5 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Volume2, { size: 16, strokeWidth: 1.5 })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ProgressBar, { videoRef, isPlaying: playing, display: "bar" })
        ]
      }
    )
  ] });
}
function SkillShowcase({ skill }) {
  const { t } = useTranslation();
  const [failed, setFailed] = reactExports.useState(() => /* @__PURE__ */ new Set());
  const [api, setApi] = reactExports.useState();
  const [index, setIndex] = reactExports.useState(0);
  const media = skillDetailMedia(skill, failed);
  const mediaKey = JSON.stringify(media);
  reactExports.useEffect(() => {
    if (!api) return;
    const handleSelect = () => setIndex(api.selectedScrollSnap());
    api.on("select", handleSelect);
    api.on("reInit", handleSelect);
    handleSelect();
    return () => {
      api.off("select", handleSelect);
      api.off("reInit", handleSelect);
    };
  }, [api]);
  reactExports.useEffect(() => {
    if (!mediaKey) return;
    setIndex(0);
    api?.scrollTo(0, true);
  }, [api, mediaKey]);
  const handleError = (url) => setFailed((current) => /* @__PURE__ */ new Set([...current, url]));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Carousel,
    {
      setApi,
      opts: { loop: media.length > 1, watchDrag: false },
      className: "mx-auto w-full max-w-4xl overflow-hidden rounded-lg bg-muted",
      "data-action-ui-id": "skill-detail-showcase",
      onKeyDownCapture: (event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          api?.scrollPrev();
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          api?.scrollNext();
        }
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CarouselContent, { className: "ml-0", children: media.map((url, itemIndex) => /* @__PURE__ */ jsxRuntimeExports.jsx(CarouselItem, { className: "pl-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative aspect-video w-full overflow-hidden rounded-lg bg-muted", children: failed.has(url) ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "absolute inset-0 flex items-center justify-center text-muted-foreground",
            role: "img",
            "aria-label": t("skills.detail.mediaUnavailable"),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ImageOffOutlineIcon, { size: 32, strokeWidth: 1.5 })
          }
        ) : isSkillDetailVideo(url) ? (
          // Mounted for every slide, not just the active one, so scrolling
          // back keeps the decoded frame and playhead. `active` is what
          // pauses the slide we just left.
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            ShowcaseVideoPlayer,
            {
              src: url,
              active: itemIndex === index,
              label: t("skills.detail.showcaseVideo"),
              onError: () => handleError(url)
            },
            url
          )
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: url,
            alt: url === CDN_SKILL_SHOWCASE_FALLBACK ? t("skills.detail.defaultShowcase") : t("skills.detail.showcaseImage", { index: itemIndex + 1 }),
            onError: () => handleError(url),
            decoding: "async",
            className: "h-full w-full object-cover"
          }
        ) }) }, url)) }),
        media.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "elevated-surface-border absolute right-4 top-4 flex items-center gap-1 rounded-full bg-popover/60 p-1 text-xs text-popover-foreground shadow-lg backdrop-blur-xl supports-[backdrop-filter]:bg-popover/45", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "ghost",
              size: "icon-sm",
              "aria-label": t("skills.detail.previousMedia"),
              "data-action-ui-id": "skill-detail-showcase-prev",
              onClick: () => api?.scrollPrev(),
              className: "rounded-full text-popover-foreground/70 hover:bg-foreground/10 hover:text-popover-foreground",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { size: 16, strokeWidth: 1.5 })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "span",
            {
              "aria-live": "polite",
              className: "min-w-8 text-center text-popover-foreground/90 tabular-nums",
              children: [
                index + 1,
                "/",
                media.length
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "ghost",
              size: "icon-sm",
              "aria-label": t("skills.detail.nextMedia"),
              "data-action-ui-id": "skill-detail-showcase-next",
              onClick: () => api?.scrollNext(),
              className: "rounded-full text-popover-foreground/70 hover:bg-foreground/10 hover:text-popover-foreground",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 16, strokeWidth: 1.5 })
            }
          )
        ] })
      ]
    }
  );
}
function SkillStructuredOverview({ info }) {
  const { t, i18n } = useTranslation();
  const { info: data } = selectSkillStructuredInfo(info, i18n.language);
  const sections = [
    { key: "overview", title: t("skills.detail.overview"), icon: List, text: data?.summary },
    { key: "bestFor", title: t("skills.detail.bestFor"), icon: ListChecks, tags: data?.best_for },
    {
      key: "howToUse",
      title: t("skills.detail.howToUse"),
      icon: ArrowUpRight,
      text: data?.how_to_use
    },
    { key: "outputs", title: t("skills.detail.outputs"), icon: Package, text: data?.outputs }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4",
      "data-action-ui-id": "skill-detail-structured-info",
      children: sections.map(({ key, title, icon: Icon2, text, tags }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "section",
        {
          className: "group min-w-0 rounded-lg border border-border bg-card p-4 transition-colors duration-150 hover:border-foreground/20 hover:bg-muted/40",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "mb-2 flex items-center gap-2 text-xs font-medium uppercase", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Icon2,
                {
                  size: 16,
                  strokeWidth: 1.5,
                  className: "shrink-0 text-muted-foreground transition-colors duration-150 group-hover:text-foreground"
                }
              ),
              title
            ] }),
            tags?.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "flex flex-wrap gap-1.5", children: [...new Set(tags)].map((tag) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "li",
              {
                className: "rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground break-words",
                children: tag
              },
              tag
            )) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground", children: text || t("skills.detail.noStructuredInfo") })
          ]
        },
        key
      ))
    }
  );
}
function SkillDetailDialog({
  skill,
  installedSkill,
  accountId = "",
  activeTab,
  onClose,
  onToggle,
  onTryItOut,
  onInstall,
  installing,
  onShare,
  updateInfo,
  onUpdate,
  updating,
  onOpenCreatorPlan
}) {
  const { t, i18n } = useTranslation();
  const dialogRef = reactExports.useRef(null);
  const onCloseRef = reactExports.useRef(onClose);
  reactExports.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const detail = useSkillDetail(skill.name, accountId, i18n.language);
  const resolved = mergeSkillDetail(
    installedSkill ?? skill,
    detail?.skill ?? ("installed" in skill ? skill : void 0)
  );
  const local = installedSkill ?? ("enabled" in resolved ? resolved : void 0);
  const isInstalled = !!local || "installed" in resolved && resolved.installed === true;
  const isZh = i18n.language.startsWith("zh");
  const displayName = isZh ? resolved.displayNameZh || toDisplayName(resolved.name) : toDisplayName(resolved.name);
  const author = (isZh ? resolved.authorCn || resolved.authorEn : resolved.authorEn || resolved.authorCn) || resolved.creator || t("skills.detail.unknownCreator");
  const downloads = detail?.skill?.downloads ?? ("downloads" in skill ? skill.downloads : void 0);
  const version = (isInstalled ? local?.version || ("installedVersion" in resolved ? resolved.installedVersion : void 0) : void 0) || resolved.version || detail?.skill?.version;
  const marketSource = "marketSource" in resolved ? resolved.marketSource : resolved.source;
  const verified = marketSource === "official" || marketSource === "official-featured";
  const showSubmit = canSubmitSkillDetail(
    activeTab,
    resolved,
    !!accountId && detail?.canSubmitToCommunity === true
  ) && !!onOpenCreatorPlan;
  const mediaKey = JSON.stringify([
    skill.name,
    i18n.language,
    resolved.showcase,
    resolved.coverUrl,
    "coverUrlEn" in resolved ? resolved.coverUrlEn : void 0
  ]);
  reactExports.useEffect(() => {
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.focus();
    const handleKeyDown = (event) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const controls = Array.from(
        dialogRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), video[controls], [tabindex="0"]'
        )
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    dialog?.addEventListener("keydown", handleKeyDown);
    return () => {
      dialog?.removeEventListener("keydown", handleKeyDown);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: dialog backdrop
    // biome-ignore lint/a11y/noStaticElementInteractions: dialog backdrop
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "modal-mask fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-150",
        onClick: onClose,
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            ref: dialogRef,
            tabIndex: -1,
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "skill-detail-title",
            className: "elevated-surface-border flex max-h-[calc(100dvh-2rem)] w-full max-w-[960px] flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground outline-none",
            onClick: (event) => event.stopPropagation(),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-start justify-between gap-4 px-6 pb-3 pt-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: "skill-detail-title", className: "break-words text-2xl font-medium", children: displayName }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-6 shrink-0 items-center justify-center rounded-sm bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx(UserRound, { size: 16, strokeWidth: 1.5 }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "break-words", children: author }),
                    verified && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      BadgeCheck,
                      {
                        size: 16,
                        fill: "none",
                        strokeWidth: 2,
                        className: "shrink-0 text-brand-accent",
                        "aria-label": t("skills.detail.verifiedCreator")
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-3 flex items-center gap-1.5", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 14, strokeWidth: 1.5, "aria-hidden": "true" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sr-only", children: [
                        t("skills.detail.downloadCount"),
                        ": "
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: typeof downloads === "number" && Number.isFinite(downloads) ? formatDownloads(Math.max(0, downloads)) : "—" })
                    ] }),
                    version && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-3 flex items-center gap-1.5", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sr-only", children: [
                        t("skills.detail.version"),
                        ": "
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                        "v",
                        version
                      ] })
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    variant: "ghost",
                    size: "icon-sm",
                    className: "rounded-lg",
                    onClick: onClose,
                    "aria-label": t("common.close"),
                    "data-action-ui-id": "skills.detail-close",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 20, strokeWidth: 1.5 })
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SkillShowcase, { skill: resolved }, mediaKey),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SkillStructuredOverview, { info: resolved.structuredInfo })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2 text-xs text-muted-foreground", children: local && onToggle && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Switch,
                    {
                      checked: local.enabled,
                      onCheckedChange: (enabled) => onToggle(skill.name, enabled),
                      "data-action-ui-id": "skills.detail-toggle",
                      "aria-label": t("skills.enabled")
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: local.enabled ? t("skills.enabled") : t("skills.disabled") }),
                  local.enabled && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 text-muted-foreground/70", children: t("skills.detail.readyToUse") })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                  isInstalled && updateInfo && onUpdate && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      variant: "outline",
                      disabled: updating,
                      onClick: () => onUpdate(skill.name),
                      "data-action-ui-id": "skill-detail-update",
                      className: cn(
                        "gap-1.5 rounded-lg",
                        UPDATE_INDICATOR_STYLES.base,
                        UPDATE_INDICATOR_STYLES.hover
                      ),
                      children: [
                        updating ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 14, strokeWidth: 1.5, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(RetryIcon, { size: 14 }),
                        t("skills.market.updateAvailable")
                      ]
                    }
                  ),
                  showSubmit ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      TooltipTrigger,
                      {
                        render: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          Button,
                          {
                            variant: "outline",
                            onClick: () => onOpenCreatorPlan?.(skill.name),
                            "data-action-ui-id": "skill-detail-submit-to-community",
                            className: "gap-1.5 rounded-lg",
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(Share2, { size: 14, strokeWidth: 1.5 }),
                              t("skills.detail.submitToCommunity")
                            ]
                          }
                        )
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { children: t("skills.detail.submitToCommunityTooltip") })
                  ] }) : onShare && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      variant: "outline",
                      onClick: () => onShare(skill.name),
                      "data-action-ui-id": "skill-detail-share",
                      className: "gap-1.5 rounded-lg",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Share2, { size: 14, strokeWidth: 1.5 }),
                        t("skills.share")
                      ]
                    }
                  ),
                  isInstalled ? onTryItOut && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      onClick: () => onTryItOut(resolved),
                      "data-action-ui-id": "skill-detail-try",
                      className: "gap-1.5 rounded-lg",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquare, { size: 14, strokeWidth: 1.5 }),
                        t("skills.market.tryInChat")
                      ]
                    }
                  ) : onInstall && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      disabled: installing,
                      onClick: () => onInstall(skill.name),
                      "data-action-ui-id": "skill-detail-install",
                      className: "gap-1.5 rounded-lg",
                      children: [
                        installing ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 16, strokeWidth: 1.5, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 16, strokeWidth: 1.5 }),
                        installing ? t("skills.market.installing") : t("skills.market.install")
                      ]
                    }
                  )
                ] })
              ] })
            ]
          }
        )
      }
    ),
    document.body
  );
}
const ACCEPTED_EXTENSIONS = /* @__PURE__ */ new Set([".zip", ".md"]);
function getFileExtension(name) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function resolveImportErrorMessage(t, data) {
  const detail = data.error ?? "";
  const fallback = detail || t("skills.import.importFailed", "Import failed");
  switch (data.errorType) {
    case "unsupported_type":
      return t("skills.import.error.unsupported_type", "Only .zip and .md files are supported");
    case "no_skill_md":
      return t("skills.import.error.no_skill_md", "SKILL.md not found in zip file");
    case "extract_failed":
      return t("skills.import.error.extract_failed", { detail });
    case "invalid_format": {
      const quoted = detail.match(/"([^"]+)"/);
      if (quoted) {
        return t("skills.import.error.invalid_format.invalidName", { name: quoted[1] });
      }
      return t(
        "skills.import.error.invalid_format.noName",
        "Cannot determine skill name. Please add a name field to the file."
      );
    }
    case "download_failed": {
      const statusMatch = detail.match(/\((\d+)\)/);
      return t("skills.import.error.downloadFailed", { status: statusMatch?.[1] ?? "?" });
    }
    case "invalid_staging_path":
      return t("skills.import.error.invalidStagingPath", "Invalid staging path");
    case "staging_not_found":
      return t(
        "skills.import.error.stagingNotFound",
        "Staging directory expired. Please re-upload the file."
      );
    default:
      return fallback;
  }
}
function resolveNetworkErrorMessage(t, err) {
  const detail = err instanceof Error ? err.message : String(err);
  if (/failed:\s*413\b/.test(detail)) {
    return t("skills.import.error.fileTooLarge", "File too large. Max 50 MB per upload.");
  }
  return t("skills.import.error.network", "Network error. Please check your connection and retry.");
}
function IconBadge({
  children,
  variant = "muted"
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: cn(
        "flex h-12 w-12 items-center justify-center rounded-lg",
        variant === "success" ? "bg-success/10" : "bg-muted"
      ),
      children
    }
  );
}
function SkillImportDialog({ open, onOpenChange, onImported }) {
  const { t } = useTranslation();
  const navigateToWorkspace = useNavigateToWorkspace();
  const fileInputRef = reactExports.useRef(null);
  const [state, setState] = reactExports.useState("idle");
  const [file, setFile] = reactExports.useState(null);
  const [errorInfo, setErrorInfo] = reactExports.useState(null);
  const [importedSkill, setImportedSkill] = reactExports.useState(null);
  const [autoFixed, setAutoFixed] = reactExports.useState(false);
  const [warning, setWarning] = reactExports.useState(null);
  const [_missingRefs, setMissingRefs] = reactExports.useState([]);
  const [stagingPath, setStagingPath] = reactExports.useState(null);
  const [dragOver, setDragOver] = reactExports.useState(false);
  const [dragInvalid, setDragInvalid] = reactExports.useState(false);
  const [conflict, setConflict] = reactExports.useState(null);
  const [newName, setNewName] = reactExports.useState("");
  const [nameError, setNameError] = reactExports.useState(null);
  const [needsAdaptationAfterRename, setNeedsAdaptationAfterRename] = reactExports.useState(false);
  const reset = reactExports.useCallback(() => {
    setState("idle");
    setFile(null);
    setErrorInfo(null);
    setImportedSkill(null);
    setAutoFixed(false);
    setWarning(null);
    setMissingRefs([]);
    setStagingPath(null);
    setDragOver(false);
    setDragInvalid(false);
    setConflict(null);
    setNewName("");
    setNameError(null);
    setNeedsAdaptationAfterRename(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);
  const handleFileSelect = reactExports.useCallback(
    (selected) => {
      const ext = getFileExtension(selected.name);
      if (!ACCEPTED_EXTENSIONS.has(ext)) {
        dedupedToast.error(t("skills.import.unsupportedType", "请选择 .zip 文件或 SKILL.md 文件"));
        return;
      }
      setFile(selected);
      setState("fileSelected");
      setErrorInfo(null);
      setAutoFixed(false);
      setWarning(null);
    },
    [t]
  );
  const handleInputChange = reactExports.useCallback(
    (e) => {
      const selected = e.target.files?.[0];
      if (selected) handleFileSelect(selected);
    },
    [handleFileSelect]
  );
  const handleDragOver = reactExports.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const items = e.dataTransfer.items;
    if (items.length > 0) {
      const mimeType = items[0].type || "";
      if (mimeType.includes("zip") || mimeType.includes("markdown") || mimeType === "") {
        setDragOver(true);
        setDragInvalid(false);
      } else {
        setDragOver(true);
        setDragInvalid(true);
      }
    }
  }, []);
  const handleDragLeave = reactExports.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    setDragInvalid(false);
  }, []);
  const handleDrop = reactExports.useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      setDragInvalid(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFileSelect(dropped);
    },
    [handleFileSelect]
  );
  const handleInstall = reactExports.useCallback(async () => {
    if (!file) return;
    setState("installing");
    setErrorInfo(null);
    const fileExt = detectSkillImportFileExt(file.name);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await gatewayFetch(API_PATHS.skillImport, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!data.ok) {
        setState("error");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setErrorInfo({
          message: resolveImportErrorMessage(t, data),
          type: data.errorType,
          missingFields: data.missingFields
        });
        trackSkillImportFailed({
          fileExt,
          name: data.skill?.name,
          error: new Error(data.error || "Import failed"),
          errorType: data.errorType ?? "business"
        });
        return;
      }
      if (data.conflict) {
        setConflict(data.conflict);
        setNewName(data.suggestedName ?? "");
        setNameError(null);
        setStagingPath(data.stagingPath ?? null);
        if (data.skill) setImportedSkill(data.skill);
        setNeedsAdaptationAfterRename(!!data.needsAdaptation);
        setState("nameConflict");
        trackSkillImport({
          skill_name: data.skill?.name,
          file_ext: fileExt,
          result: "name_conflict",
          auto_fixed: data.autoFixed ?? false
        });
        return;
      }
      if (data.needsAdaptation) {
        setStagingPath(data.stagingPath ?? null);
        if (data.skill) setImportedSkill(data.skill);
        setState("needsAdaptation");
        trackSkillImport({
          skill_name: data.skill?.name,
          file_ext: fileExt,
          result: "needs_adaptation",
          auto_fixed: data.autoFixed ?? false
        });
        return;
      }
      if (data.skill) {
        setImportedSkill(data.skill);
        await homeService.hiloApp.toggleSkill(data.skill.name, true).catch(() => {
        });
        try {
          await window.hilo.opencode.restart();
        } catch {
        }
      }
      setAutoFixed(data.autoFixed ?? false);
      setWarning(data.warning ?? null);
      setMissingRefs(data.missingReferences ?? []);
      setState("success");
      trackSkillImport({
        skill_name: data.skill?.name,
        file_ext: fileExt,
        result: "success",
        auto_fixed: data.autoFixed ?? false
      });
      onImported?.();
    } catch (err) {
      setState("error");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setErrorInfo({
        message: resolveNetworkErrorMessage(t, err),
        type: "network"
      });
      trackSkillImportFailed({ fileExt, error: err, errorType: "network" });
    }
  }, [file, onImported, t]);
  const handleTryInHub = reactExports.useCallback(async () => {
    if (!importedSkill) return;
    const guide = importedSkill.guidePrompt || importedSkill.guidePromptEn;
    const prompt = guide ? `/${importedSkill.name} ${guide}` : `/${importedSkill.name}`;
    const initialPayloadId = crypto.randomUUID();
    try {
      const entries = await homeService.hiloApp.listWorkspaceEntries().catch(() => []);
      const latestEntry = entries[entries.length - 1];
      const result = latestEntry?.folderPath ? await homeService.hiloApp.openWorkspaceWithResult(latestEntry.folderPath).catch(() => null) : await homeService.hiloApp.createWorkspaceWithResult(`try-${importedSkill.name}`).catch(() => null);
      if (!result) {
        chatLog.error("initial-payload handoff-failed", {
          client_message_id: initialPayloadId,
          source: "skill-import.try-in-hub",
          skill_name: importedSkill.name,
          stage: "workspace_open",
          reused_workspace: Boolean(latestEntry?.folderPath)
        });
        return;
      }
      const runtime = workspaceRuntimeFromOpenResult(result);
      if (!runtime) {
        chatLog.error("initial-payload handoff-failed", {
          client_message_id: initialPayloadId,
          source: "skill-import.try-in-hub",
          skill_name: importedSkill.name,
          stage: "workspace_not_ready",
          result_kind: result.kind
        });
        toastWorkspaceOpenResult(result, t);
        return;
      }
      chatLog.info("initial-payload handoff", {
        client_message_id: initialPayloadId,
        source: "skill-import.try-in-hub",
        skill_name: importedSkill.name,
        workspace_id: runtime.workspaceId,
        result_kind: result.kind
      });
      navigateToWorkspace(runtime, { initialPayloadId, initialMessage: prompt });
      onOpenChange(false);
    } catch (error) {
      chatLog.error("initial-payload handoff-failed", {
        client_message_id: initialPayloadId,
        source: "skill-import.try-in-hub",
        skill_name: importedSkill.name,
        stage: "exception",
        error: error instanceof Error ? error.message : String(error)
      });
      onOpenChange(false);
    }
  }, [importedSkill, navigateToWorkspace, onOpenChange, t]);
  const handleAdaptToHub = reactExports.useCallback(async () => {
    if (!stagingPath || !importedSkill) return;
    trackSkillImport({
      skill_name: importedSkill.name,
      file_ext: file ? detectSkillImportFileExt(file.name) : "other",
      result: "adapt"
    });
    const prompt = t(
      "skills.import.adaptPrompt",
      "/skill-creator Please adapt the third-party skill at {{stagingPath}}/SKILL.md to the current MiniMax Design environment. Read the file content, analyze its dependencies and tools, rewrite it in MiniMax Design-compatible format, and save to the user skills directory."
    ).replace("{{stagingPath}}", stagingPath);
    const initialPayloadId = crypto.randomUUID();
    try {
      const result = await homeService.hiloApp.createWorkspaceWithResult(
        `adapt-${importedSkill.name}`
      );
      const runtime = workspaceRuntimeFromOpenResult(result);
      if (!runtime) {
        chatLog.error("initial-payload handoff-failed", {
          client_message_id: initialPayloadId,
          source: "skill-import.adapt",
          skill_name: importedSkill.name,
          stage: "workspace_not_ready",
          result_kind: result.kind
        });
        toastWorkspaceOpenResult(result, t);
        return;
      }
      chatLog.info("initial-payload handoff", {
        client_message_id: initialPayloadId,
        source: "skill-import.adapt",
        skill_name: importedSkill.name,
        workspace_id: runtime.workspaceId,
        result_kind: result.kind
      });
      navigateToWorkspace(runtime, { initialPayloadId, initialMessage: prompt });
      onOpenChange(false);
    } catch (error) {
      chatLog.error("initial-payload handoff-failed", {
        client_message_id: initialPayloadId,
        source: "skill-import.adapt",
        skill_name: importedSkill.name,
        stage: "exception",
        error: error instanceof Error ? error.message : String(error)
      });
      dedupedToast.error(t("skills.import.adaptFailed", "创建适配项目失败"));
    }
  }, [stagingPath, importedSkill, navigateToWorkspace, onOpenChange, t, file]);
  const handleDirectInstall = reactExports.useCallback(async () => {
    if (!stagingPath || !importedSkill) return;
    setState("installing");
    const fileExt = file ? detectSkillImportFileExt(file.name) : "other";
    try {
      const res = await gatewayFetch("/api/skills/import/confirm-staging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stagingPath, name: importedSkill.name })
      });
      const data = await res.json();
      if (!data.ok) {
        setState("error");
        setErrorInfo({ message: resolveImportErrorMessage(t, data), type: data.errorType });
        trackSkillImportFailed({
          fileExt,
          name: importedSkill.name,
          error: new Error(data.error || "Install failed"),
          errorType: "business"
        });
        return;
      }
      setImportedSkill(data.skill ?? importedSkill);
      await homeService.hiloApp.toggleSkill(importedSkill.name, true).catch(() => {
      });
      try {
        await window.hilo.opencode.restart();
      } catch {
      }
      setState("success");
      trackSkillImport({
        skill_name: importedSkill.name,
        file_ext: fileExt,
        result: "direct_install"
      });
      onImported?.();
    } catch (err) {
      setState("error");
      setErrorInfo({
        message: resolveNetworkErrorMessage(t, err),
        type: "network"
      });
      trackSkillImportFailed({
        fileExt,
        name: importedSkill.name,
        error: err,
        errorType: "network"
      });
    }
  }, [stagingPath, importedSkill, onImported, t, file]);
  const handleConfirmRename = reactExports.useCallback(async () => {
    if (!stagingPath || !newName) return;
    if (needsAdaptationAfterRename) {
      setState("installing");
      const fileExt2 = file ? detectSkillImportFileExt(file.name) : "other";
      try {
        const res = await gatewayFetch("/api/skills/import/confirm-staging", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stagingPath, name: newName })
        });
        const data = await res.json();
        if (!data.ok) {
          setState("error");
          setConflict(null);
          setErrorInfo({
            message: resolveImportErrorMessage(t, data),
            type: data.errorType
          });
          trackSkillImportFailed({
            fileExt: fileExt2,
            name: newName,
            error: new Error(data.error || "Install failed"),
            errorType: "business"
          });
          return;
        }
        setConflict(null);
        setImportedSkill(data.skill ?? importedSkill);
        setState("needsAdaptation");
        trackSkillImport({
          skill_name: newName,
          file_ext: fileExt2,
          result: "renamed_adapt"
        });
      } catch (err) {
        setState("error");
        setConflict(null);
        setErrorInfo({
          message: resolveNetworkErrorMessage(t, err),
          type: "network"
        });
        trackSkillImportFailed({ fileExt: fileExt2, name: newName, error: err, errorType: "network" });
      }
      return;
    }
    setState("installing");
    const fileExt = file ? detectSkillImportFileExt(file.name) : "other";
    try {
      const res = await gatewayFetch("/api/skills/import/confirm-staging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stagingPath, name: newName })
      });
      const data = await res.json();
      if (!data.ok) {
        setState("error");
        setConflict(null);
        setErrorInfo({ message: resolveImportErrorMessage(t, data), type: data.errorType });
        trackSkillImportFailed({
          fileExt,
          name: newName,
          error: new Error(data.error || "Install failed"),
          errorType: "business"
        });
        return;
      }
      setImportedSkill(data.skill ?? importedSkill);
      setConflict(null);
      await homeService.hiloApp.toggleSkill(newName, true).catch(() => {
      });
      try {
        await window.hilo.opencode.restart();
      } catch {
      }
      setState("success");
      trackSkillImport({
        skill_name: newName,
        file_ext: fileExt,
        result: "renamed_install"
      });
      onImported?.();
    } catch (err) {
      setState("error");
      setConflict(null);
      setErrorInfo({
        message: resolveNetworkErrorMessage(t, err),
        type: "network"
      });
      trackSkillImportFailed({ fileExt, name: newName, error: err, errorType: "network" });
    }
  }, [stagingPath, newName, needsAdaptationAfterRename, importedSkill, onImported, t, file]);
  const handleContinueAdd = reactExports.useCallback(() => {
    reset();
  }, [reset]);
  const handleOpenChange = reactExports.useCallback(
    (v) => {
      if (!v) reset();
      onOpenChange(v);
    },
    [onOpenChange, reset]
  );
  const isSuccess = state === "success";
  const isError = state === "error";
  const isAdaptation = state === "needsAdaptation";
  const isConflict = state === "nameConflict";
  const showDropZone = !isSuccess && !isAdaptation && !isConflict;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: handleOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    DialogContent,
    {
      size: "md",
      className: "gap-0 p-0 [&_[data-slot=dialog-close]]:size-8! [&_[data-slot=dialog-close]_svg]:size-[18px]!",
      "data-layout-slot": "skill-import-dialog",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { className: "px-6 pt-5 pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "text-sm leading-5 font-medium", children: t("skills.import.title", "导入 Skill") }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 px-6 pb-6", children: [
          isError && errorInfo && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-destructive", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { size: 15, className: "mt-0.5 shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium", children: errorInfo.message }),
              errorInfo.missingFields && errorInfo.missingFields.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-1.5 mt-1", children: errorInfo.missingFields.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-1 py-0.5 bg-destructive/10 font-mono text-[11px]", children: f }, f)) })
            ] })
          ] }),
          isSuccess && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-success-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 15 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium", children: t("skills.import.success", "Skill 导入成功") })
          ] }),
          isSuccess && autoFixed && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-warning-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { size: 15 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs", children: t("skills.import.autoFixHint", "已自动优化格式") })
          ] }),
          isSuccess && warning && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-warning-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { size: 15 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs", children: warning })
          ] }),
          showDropZone && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                "data-action-ui-id": "skills-import-dropzone",
                className: cn(
                  "relative flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 transition-colors",
                  dragOver && !dragInvalid && "border-foreground bg-muted/50",
                  dragOver && dragInvalid && "border-destructive bg-destructive/5",
                  !dragOver && file && "border-foreground/20",
                  !dragOver && !file && "border-muted-foreground/30 hover:border-muted-foreground/50"
                ),
                onClick: () => fileInputRef.current?.click(),
                onDragOver: handleDragOver,
                onDragLeave: handleDragLeave,
                onDrop: handleDrop,
                children: file ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(IconBadge, { variant: "success", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 22, className: "text-success-foreground" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-foreground", children: file.name }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: formatFileSize(file.size) })
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(IconBadge, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(FilePlus2, { size: 22, className: "text-foreground opacity-30" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground text-center leading-relaxed", children: t("skills.import.dropzone", "拖放 .zip 或 SKILL.md 文件，或点击选择") })
                ] })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                ref: fileInputRef,
                type: "file",
                accept: ".zip,.md",
                className: "hidden",
                onChange: handleInputChange
              }
            )
          ] }),
          isSuccess && file && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center gap-2 rounded-lg border border-success/30 border-dashed bg-success/5 px-4 py-8", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(IconBadge, { variant: "success", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 22, className: "text-success-foreground" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-foreground", children: file.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: formatFileSize(file.size) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  "data-action-ui-id": "skills-import-continue",
                  variant: "outline",
                  className: "h-10 flex-1 rounded-lg text-sm",
                  onClick: handleContinueAdd,
                  children: t("skills.import.continueAdd", "继续导入")
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  "data-action-ui-id": "skills-import-try",
                  className: "h-10 flex-1 rounded-lg text-sm",
                  onClick: handleTryInHub,
                  children: [
                    t("skills.import.tryInHub", "在 MiniMax Design 中试用"),
                    " →"
                  ]
                }
              )
            ] })
          ] }),
          isConflict && conflict && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-warning-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { size: 15, className: "mt-0.5 shrink-0" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs", children: conflict.type === "official" ? t("skills.import.nameConflict.official", {
                name: conflict.existingName
              }) : t("skills.import.nameConflict.user", {
                name: conflict.existingName
              }) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "skill-rename-input", className: "text-xs font-medium", children: t("skills.import.nameConflict.inputLabel", "新 Skill 名称") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  id: "skill-rename-input",
                  "data-action-ui-id": "skills-import-rename-input",
                  className: "h-10 text-sm",
                  value: newName,
                  onChange: (e) => {
                    const val = e.target.value;
                    setNewName(val);
                    setNameError(
                      val && !isValidSkillName(val) ? t("skills.import.nameConflict.invalid") : null
                    );
                  }
                }
              ),
              nameError && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-destructive", children: nameError })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "outline",
                  className: "h-10 flex-1 rounded-lg text-sm",
                  onClick: () => {
                    reset();
                  },
                  children: t("common.cancel", "取消")
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  "data-action-ui-id": "skills-import-rename-confirm",
                  className: "h-10 flex-1 rounded-lg text-sm",
                  disabled: !newName || !!nameError,
                  onClick: handleConfirmRename,
                  children: t("skills.import.nameConflict.confirm", "使用新名字导入")
                }
              )
            ] })
          ] }),
          isAdaptation && file && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-warning-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { size: 15, className: "mt-0.5 shrink-0" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs", children: t(
                "skills.import.thirdPartyHint",
                "检测到第三方 Skill，建议适配到 MiniMax Design 环境以获得最佳体验"
              ) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center gap-2 rounded-lg border border-warning/30 border-dashed bg-warning/5 px-4 py-8", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(IconBadge, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 22, className: "text-warning-foreground" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-foreground", children: file.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: formatFileSize(file.size) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  "data-action-ui-id": "skills-import-direct-install",
                  variant: "outline",
                  className: "h-10 flex-1 rounded-lg text-sm",
                  onClick: handleDirectInstall,
                  children: t("skills.import.directInstall", "直接导入")
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  "data-action-ui-id": "skills-import-adapt",
                  className: "h-10 flex-1 rounded-lg text-sm",
                  onClick: handleAdaptToHub,
                  children: [
                    t("skills.import.adaptToHub", "适配到 MiniMax Design"),
                    " →"
                  ]
                }
              )
            ] })
          ] }),
          showDropZone && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-muted-foreground space-y-0.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium text-xs", children: t("skills.import.requirements", "文件要求") }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "list-disc pl-4 space-y-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: t("skills.import.reqZip", "包含 SKILL.md 文件的 .zip 压缩包") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: t("skills.import.reqMd", "或直接拖入 SKILL.md 文件") })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                "data-action-ui-id": "skills-import-install",
                className: "h-10 w-full rounded-lg text-sm",
                disabled: state !== "fileSelected" && state !== "error",
                onClick: handleInstall,
                children: [
                  state === "installing" && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 14, strokeWidth: 1.5, className: "animate-spin mr-1.5" }),
                  state === "installing" ? t("skills.import.installing", "导入中...") : t("skills.import.install", "导入")
                ]
              }
            )
          ] })
        ] })
      ]
    }
  ) });
}
function useAutoUpdateBanner() {
  const { subscribe } = useWSConnection();
  const [pending, setPending] = reactExports.useState(readPendingAutoUpdate);
  const [restarting, setRestarting] = reactExports.useState(false);
  const subscribeRef = reactExports.useRef(subscribe);
  subscribeRef.current = subscribe;
  reactExports.useEffect(() => {
    return subscribeRef.current((msg) => {
      if (msg.type !== "skills_reload") return;
      const payload = msg;
      if (!payload.autoUpdate) return;
      const names = payload.unloadedSkills ?? [];
      if (names.length === 0) return;
      const update = {
        updatedCount: names.length,
        updatedSkills: names,
        timestamp: Date.now()
      };
      writePendingAutoUpdate(update);
      setPending(update);
    });
  }, []);
  const restartNow = reactExports.useCallback(() => {
    setRestarting(true);
    clearPendingAutoUpdate();
    window.hilo.opencode.restart().then(() => {
      setPending(null);
      setRestarting(false);
    }).catch((e) => {
      console.error("OpenCode restart failed:", e);
      setRestarting(false);
    });
  }, []);
  const dismiss = reactExports.useCallback(() => {
    clearPendingAutoUpdate();
    setPending(null);
  }, []);
  return { pending, restarting, restartNow, dismiss };
}
function useOperator() {
  const [isOperator, setIsOperator] = reactExports.useState(false);
  const [role, setRole] = reactExports.useState("none");
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const checkedRef = reactExports.useRef(false);
  const check = reactExports.useCallback(async () => {
    try {
      const res = await gatewayFetch(API_PATHS.marketCheckOperator);
      const data = await res.json();
      setIsOperator(data.is_operator);
      setRole(data.role === "advanced" || data.role === "reviewer" ? data.role : "none");
    } catch {
      setIsOperator(false);
      setRole("none");
    } finally {
      setIsLoading(false);
    }
  }, []);
  reactExports.useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    check();
  }, [check]);
  return { isOperator, role, isLoading };
}
const DEFAULT_PAGE_SIZE = 20;
const SKILL_TYPE = "plugin";
function usePluginMarket(entrySource) {
  const [plugins, setPlugins] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [hasMore, setHasMore] = reactExports.useState(false);
  const [installingSet, setInstallingSet] = reactExports.useState(/* @__PURE__ */ new Set());
  const [uninstallingSet, setUninstallingSet] = reactExports.useState(/* @__PURE__ */ new Set());
  const pageRef = reactExports.useRef(1);
  const queryRef = reactExports.useRef("");
  const fetchingRef = reactExports.useRef(false);
  const pluginsRef = reactExports.useRef([]);
  reactExports.useEffect(() => {
    pluginsRef.current = plugins;
  }, [plugins]);
  const fetchPage = reactExports.useCallback(async (query, page, reset) => {
    if (!reset && fetchingRef.current) return;
    fetchingRef.current = true;
    if (reset) setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(DEFAULT_PAGE_SIZE),
        skill_type: SKILL_TYPE
      });
      let path;
      if (query) {
        params.set("query", query);
        path = `${API_PATHS.marketSearch}?${params}`;
      } else {
        path = `${API_PATHS.marketSkills}?${params}`;
      }
      const res = await gatewayFetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      const newPlugins = raw.plugins ?? [];
      pageRef.current = page;
      queryRef.current = query;
      setPlugins((prev) => {
        const next = reset ? newPlugins : [...prev, ...newPlugins];
        setHasMore(next.length < raw.total);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);
  const fetchList = reactExports.useCallback(async () => {
    queryRef.current = "";
    await fetchPage("", 1, true);
  }, [fetchPage]);
  const search = reactExports.useCallback(
    async (query) => {
      await fetchPage(query, 1, true);
    },
    [fetchPage]
  );
  const loadMore = reactExports.useCallback(async () => {
    if (!hasMore) return;
    const nextPage = pageRef.current + 1;
    await fetchPage(queryRef.current, nextPage, false);
  }, [hasMore, fetchPage]);
  const install = reactExports.useCallback(
    async (id, trigger = "market_card") => {
      setInstallingSet((prev) => new Set(prev).add(id));
      const startedAt = Date.now();
      const target = pluginsRef.current.find((p) => p.id === id);
      const trackBase = {
        plugin_id: id,
        plugin_version: target?.version ?? "unknown",
        plugin_source: "market",
        surface: trigger === "market_detail" ? "plugin_market_detail" : "plugin_market_list",
        entry_source: entrySource
      };
      const isUpdate = target?.installed === true;
      const previousVersion = isUpdate ? target?.installedVersion : void 0;
      try {
        const res = await gatewayFetch(API_PATHS.marketInstall, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: id, skillType: SKILL_TYPE })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Install failed");
        setPlugins(
          (prev) => prev.map(
            (p) => p.id === id ? { ...p, installed: true, installedVersion: p.version } : p
          )
        );
        trackPluginInstall({
          ...trackBase,
          trigger,
          is_update: isUpdate,
          ...previousVersion ? { previous_version: previousVersion } : {},
          duration_ms: Date.now() - startedAt
        });
        pluginEvents.firePluginsChanged(id, "installed");
        return true;
      } catch (err) {
        trackPluginInstallFailed(
          {
            ...trackBase,
            trigger,
            is_update: isUpdate,
            ...previousVersion ? { previous_version: previousVersion } : {},
            duration_ms: Date.now() - startedAt
          },
          err
        );
        return false;
      } finally {
        setInstallingSet((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [entrySource]
  );
  const uninstall = reactExports.useCallback(
    async (id, trigger = "market_card") => {
      setUninstallingSet((prev) => new Set(prev).add(id));
      const startedAt = Date.now();
      const target = pluginsRef.current.find((p) => p.id === id);
      const trackBase = {
        plugin_id: id,
        plugin_version: target?.version ?? "unknown",
        plugin_source: "market",
        surface: trigger === "market_detail" ? "plugin_market_detail" : "plugin_market_list",
        entry_source: entrySource
      };
      try {
        const res = await gatewayFetch(API_PATHS.marketUninstall, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: id, skillType: SKILL_TYPE })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Uninstall failed");
        setPlugins((prev) => prev.map((p) => p.id === id ? { ...p, installed: false } : p));
        trackPluginUninstall({
          ...trackBase,
          trigger,
          duration_ms: Date.now() - startedAt
        });
        pluginEvents.firePluginsChanged(id, "uninstalled");
        return true;
      } catch (err) {
        trackPluginUninstallFailed(
          {
            ...trackBase,
            trigger,
            duration_ms: Date.now() - startedAt
          },
          err
        );
        return false;
      } finally {
        setUninstallingSet((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [entrySource]
  );
  return {
    plugins,
    loading,
    error,
    hasMore,
    fetchList,
    search,
    loadMore,
    install,
    uninstall,
    installingSet,
    uninstallingSet
  };
}
const LAYOUT_STORAGE_KEY = "skills.layout";
const INITIAL_PER_TAB = {
  community: { activeTag: null, hideInstalled: false },
  plugins: { activeTag: null, hideInstalled: false }
};
function useSkillFilters(tab = "community") {
  const [perTab, setPerTab] = reactExports.useState(INITIAL_PER_TAB);
  const [viewMode, setViewMode] = reactExports.useState(
    () => localStorage.getItem(LAYOUT_STORAGE_KEY) || "grid"
  );
  const [sortBy, setSortBy] = reactExports.useState("recent");
  const effectiveTab = tab === "mine" ? "community" : tab;
  const current = perTab[effectiveTab];
  const handleViewModeChange = reactExports.useCallback((mode) => {
    setViewMode(mode);
    localStorage.setItem(LAYOUT_STORAGE_KEY, mode);
  }, []);
  const handleTagChange = reactExports.useCallback(
    (next) => {
      setPerTab((prev) => {
        const cur = prev[effectiveTab];
        const value = cur.activeTag === next ? null : next;
        if (value === cur.activeTag) return prev;
        return { ...prev, [effectiveTab]: { ...cur, activeTag: value } };
      });
    },
    [effectiveTab]
  );
  const forceSetActiveTag = reactExports.useCallback(
    (next) => {
      setPerTab((prev) => {
        const cur = prev[effectiveTab];
        if (cur.activeTag === next) return prev;
        return { ...prev, [effectiveTab]: { ...cur, activeTag: next } };
      });
    },
    [effectiveTab]
  );
  const setHideInstalled = reactExports.useCallback(
    (next) => {
      setPerTab((prev) => {
        const cur = prev[effectiveTab];
        if (cur.hideInstalled === next) return prev;
        return { ...prev, [effectiveTab]: { ...cur, hideInstalled: next } };
      });
    },
    [effectiveTab]
  );
  return reactExports.useMemo(
    () => ({
      activeTag: current.activeTag,
      setActiveTag: handleTagChange,
      forceSetActiveTag,
      viewMode,
      setViewMode: handleViewModeChange,
      sortBy,
      setSortBy,
      hideInstalled: current.hideInstalled,
      setHideInstalled
    }),
    [
      current.activeTag,
      current.hideInstalled,
      handleTagChange,
      forceSetActiveTag,
      viewMode,
      handleViewModeChange,
      sortBy,
      setHideInstalled
    ]
  );
}
function useSkillUpdates(enabled) {
  const [updates, setUpdates] = reactExports.useState(/* @__PURE__ */ new Map());
  const fetchSeqRef = reactExports.useRef(0);
  const refresh = reactExports.useCallback(() => {
    const seq = ++fetchSeqRef.current;
    gatewayFetch("/api/skills/market?page=1&page_size=999").then((res) => res.ok ? res.json() : null).then((data) => {
      if (!data || seq !== fetchSeqRef.current) return;
      const map = /* @__PURE__ */ new Map();
      for (const skill of data.skills) {
        if (skill.installed && skill.updateAvailable) {
          map.set(skill.name, {
            latestVersion: skill.version,
            currentVersion: skill.installedVersion
          });
        }
      }
      setUpdates(map);
    }).catch(() => {
    });
  }, []);
  reactExports.useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);
  const clearUpdate = reactExports.useCallback((name) => {
    setUpdates((prev) => {
      if (!prev.has(name)) return prev;
      const next = new Map(prev);
      next.delete(name);
      return next;
    });
  }, []);
  return { updates, refresh, clearUpdate };
}
const POLL_INTERVAL = 1e4;
const COMPLETE_DISPLAY_MS = 5e3;
function useSyncStatus(active) {
  const [status, setStatus] = reactExports.useState(null);
  const [showComplete, setShowComplete] = reactExports.useState(false);
  const prevSyncingRef = reactExports.useRef(false);
  const completeTimerRef = reactExports.useRef(void 0);
  const fetchStatus = reactExports.useCallback(async () => {
    try {
      const res = await gatewayFetch(API_PATHS.marketSyncStatus);
      if (!res.ok) {
        if (res.status === 404) return;
        return;
      }
      const data = await res.json();
      setStatus(data);
      if (prevSyncingRef.current && !data.syncing && data.lastSyncResult) {
        setShowComplete(true);
        clearTimeout(completeTimerRef.current);
        completeTimerRef.current = setTimeout(() => setShowComplete(false), COMPLETE_DISPLAY_MS);
      }
      prevSyncingRef.current = data.syncing;
    } catch {
    }
  }, []);
  reactExports.useEffect(() => {
    if (!active) return;
    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL);
    return () => {
      clearInterval(interval);
      clearTimeout(completeTimerRef.current);
    };
  }, [active, fetchStatus]);
  return { status, showComplete };
}
function toLaunchSkillInfo(skill) {
  if ("enabled" in skill) return skill;
  return {
    ...skill,
    enabled: true,
    // Market source is official/community, while the installed-skill contract
    // uses installed/user. Try flow has already installed/enabled it locally.
    source: "installed"
  };
}
function useTrySkill() {
  const { t } = useTranslation();
  const navigateToWorkspace = useNavigateToWorkspace();
  const [trying, setTrying] = reactExports.useState(false);
  const trySkill = reactExports.useCallback(
    async (skill, opts) => {
      if (trying) return;
      setTrying(true);
      try {
        const isInstalled = "enabled" in skill || skill.installed === true;
        if (!isInstalled) {
          const toastId = dedupedToast.loading(t("skills.market.installing"));
          const startedAt = Date.now();
          try {
            const res = await gatewayFetch(API_PATHS.marketInstall, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                skill.skillType ? { name: skill.name, skillType: skill.skillType } : { name: skill.name }
              )
            });
            const data = await res.json();
            if (!data.ok) {
              trackSkillInstallFailed({
                name: skill.name,
                source: "market",
                via: "market_card",
                error: data.error || "install rejected",
                durationMs: Date.now() - startedAt
              });
              dedupedToast.error(t("skills.market.installError", { name: skill.name }), { id: toastId });
              return;
            }
            trackSkillInstallEvent({
              name: skill.name,
              source: "market",
              version: skill.version,
              via: "market_card"
            });
            await homeService.hiloApp.toggleSkill(skill.name, true);
            try {
              await window.hilo.opencode.restart();
            } catch {
            }
            showSkillInstallSuccessToast(skill.name, { id: toastId });
          } catch (err) {
            trackSkillInstallFailed({
              name: skill.name,
              source: "market",
              via: "market_card",
              error: err,
              durationMs: Date.now() - startedAt
            });
            dedupedToast.error(t("skills.market.installError", { name: skill.name }), { id: toastId });
            return;
          }
        } else if (!skill.enabled) {
          const applyingToast = beginSkillApplyingToast(t("skills.applying"));
          try {
            await homeService.hiloApp.toggleSkill(skill.name, true);
            try {
              await window.hilo.opencode.restart();
            } catch {
            }
            applyingToast.success(t("skills.restartSuccess"));
          } catch {
            applyingToast.error(t("skills.toggleError"));
            return;
          }
        }
        const loadingToastId = dedupedToast.loading(t("skills.loadingToTask", "正在加载 Skill 至任务"));
        const result = await homeService.hiloApp.createWorkspaceWithResult(skill.name).catch(() => null);
        dedupedToast.dismiss(loadingToastId);
        if (!result) {
          dedupedToast.error(t("skills.tryItOutFailed"));
          return;
        }
        const runtime = workspaceRuntimeFromOpenResult(result);
        if (!runtime) {
          toastWorkspaceOpenResult(result, t);
          return;
        }
        if (skill.skillType === "plugin") {
          navigateToWorkspace(runtime, { pluginId: skill.name });
        } else {
          workspaceEvents.queueAddSkillToChat(runtime.workspaceId, toLaunchSkillInfo(skill));
          navigateToWorkspace(runtime);
        }
        trackSkillInvoke({
          name: skill.name,
          source: opts?.invokeSource ?? "project_sidebar_post_install"
        });
      } finally {
        setTrying(false);
      }
    },
    [trying, t, navigateToWorkspace]
  );
  return { trySkill, trying };
}
function filterMySkills(skills, filters, submissions, taxonomy = []) {
  const query = filters.query.trim().toLocaleLowerCase();
  return skills.filter((skill) => {
    if (skill.skillType === "plugin") return false;
    if (filters.source === "local" && skill.source !== "user") return false;
    if (filters.source === "community" && skill.source !== "installed") return false;
    const submission = skill.source === "user" ? submissions.get(skill.name) : void 0;
    const structuredInfo = submission?.structuredInfo ?? normalizeSkillDetailMetadata({ ...skill }).structuredInfo;
    const categories = submission?.categories ?? skillCategoryCodes(skill);
    if (filters.category && !categories.includes(filters.category)) {
      const category = taxonomy.find((item) => item.category === filters.category);
      if (submission || categories.length > 0 || !category || !skillVerticals(skill).includes(category.en_name))
        return false;
    }
    return !query || [
      skill.name,
      skill.displayNameZh,
      submission?.displayName,
      ...structuredInfo ? Object.values(structuredInfo).map((info) => info.summary) : [skill.summary, skill.summaryZh]
    ].some((text) => text?.toLocaleLowerCase().includes(query));
  });
}
const SEARCH_DEBOUNCE_MS = 300;
function SkillsPage() {
  const { t } = useTranslation();
  const {
    capability: requestedCapability,
    tab: initialTab,
    pluginId: initialPluginId,
    skillName: initialSkillName,
    connectorId: initialConnectorId
  } = useSearch({ strict: false });
  const scrollRef = reactExports.useRef(null);
  const isScrolling = useIsScrolling({ scrollRef });
  const [capabilityTab, setCapabilityTab] = reactExports.useState(
    requestedCapability === "connectors" ? "connectors" : "skills"
  );
  const { markSidebarBadgeVisited } = useSidebarBadges();
  const [connectorSearchQuery, setConnectorSearchQuery] = reactExports.useState("");
  const [connectorSortMode, setConnectorSortMode] = reactExports.useState("default");
  const [customConnectorOpen, setCustomConnectorOpen] = reactExports.useState(false);
  const translationRef = reactExports.useRef(t);
  reactExports.useEffect(() => {
    translationRef.current = t;
  }, [t]);
  const { shell } = usePlatform();
  const [config, setConfig] = useStorage("global.config");
  const skillAutoUpdate = config.skillAutoUpdate ?? true;
  reactExports.useEffect(() => {
    if (requestedCapability === "skills" || requestedCapability === "connectors") {
      setCapabilityTab(requestedCapability);
    }
  }, [requestedCapability]);
  reactExports.useEffect(() => {
    if (capabilityTab === "connectors") markSidebarBadgeVisited("connectors");
  }, [capabilityTab, markSidebarBadgeVisited]);
  const marketOpenReportedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (marketOpenReportedRef.current) return;
    marketOpenReportedRef.current = true;
    trackSkillMarketOpen("global_sidebar");
  }, []);
  const [previewMode, setPreviewMode] = reactExports.useState(false);
  const deepLinkProcessedRef = reactExports.useRef(false);
  const openedPluginDeepLinksRef = reactExports.useRef(/* @__PURE__ */ new Set());
  const requestedSkillDeepLinksRef = reactExports.useRef(/* @__PURE__ */ new Set());
  const openedSkillDeepLinksRef = reactExports.useRef(/* @__PURE__ */ new Set());
  const [marketUnlocked] = reactExports.useState(true);
  const [skills, setSkills] = reactExports.useState([]);
  const [installedSearchQuery, setInstalledSearchQuery] = reactExports.useState("");
  const [mineCategoryFilter, setMineCategoryFilter] = reactExports.useState(null);
  const [mineSourceFilter, setMineSourceFilter] = reactExports.useState("all");
  const { user } = useAuth();
  const [creatorPlanOpen, setCreatorPlanOpen] = reactExports.useState(false);
  const [creatorPlanDefaultSource, setCreatorPlanDefaultSource] = reactExports.useState("upload");
  const [creatorPlanSubmissions, setCreatorPlanSubmissions] = reactExports.useState([]);
  const [creatorPlanDefaultSkill, setCreatorPlanDefaultSkill] = reactExports.useState("");
  const openCreatorPlan = reactExports.useCallback((skillName, source) => {
    setCreatorPlanDefaultSkill(skillName ?? "");
    setCreatorPlanDefaultSource(source ?? (skillName ? "design" : "upload"));
    setCreatorPlanOpen(true);
  }, []);
  const localCreatedSkills = reactExports.useMemo(() => skills.filter((s) => s.source === "user"), [skills]);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [detailSkill, setDetailSkill] = reactExports.useState(null);
  const [activeTab, setActiveTab] = reactExports.useState(
    initialTab === "mine" ? "mine" : "community"
  );
  const [needsRefresh, setNeedsRefresh] = reactExports.useState(false);
  const [importOpen, setImportOpen] = reactExports.useState(false);
  const [shareUrl, setShareUrl] = reactExports.useState(null);
  const {
    activeTag,
    setActiveTag,
    forceSetActiveTag,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    hideInstalled,
    setHideInstalled
  } = useSkillFilters(activeTab);
  const skillsRef = reactExports.useRef([]);
  reactExports.useEffect(() => {
    skillsRef.current = skills;
  }, [skills]);
  const openDetail = reactExports.useCallback(
    (skill, trigger) => {
      const isInstalledLocally = "enabled" in skill || "installed" in skill && skill.installed === true;
      trackSkillDetailView({
        skill_name: skill.name,
        tab: activeTab,
        is_installed: isInstalledLocally,
        trigger
      });
      setDetailSkill(skill);
    },
    [activeTab]
  );
  const openDetailFromCard = reactExports.useCallback(
    (skill) => openDetail(skill, "card"),
    [openDetail]
  );
  const openDetailFromList = reactExports.useCallback(
    (skill) => openDetail(skill, "list"),
    [openDetail]
  );
  const handleAutoUpdateToggle = reactExports.useCallback(
    (checked) => {
      setConfig({ skillAutoUpdate: checked });
      gatewayFetch("/api/skills/market/preference", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoUpdate: checked })
      }).catch((err) => {
        console.error("[SkillsPage] Failed to push autoUpdate preference:", err);
      });
    },
    [setConfig]
  );
  const handleTagChange = reactExports.useCallback(
    (tag) => {
      const next = activeTag === tag ? null : tag;
      if (next !== activeTag) {
        trackSkillFilter({ tab: activeTab, tag: next });
      }
      setActiveTag(tag);
    },
    [activeTag, setActiveTag, activeTab]
  );
  const market = useMarketSkills();
  const marketCategoryTag = activeTag && activeTag !== FEATURED_TAG ? activeTag : void 0;
  const marketOfficialFeatured = useMarketSkills(
    void 0,
    "official-featured",
    FEATURED_MARKET_PAGE_SIZE,
    marketCategoryTag
  );
  const marketCommunity = useMarketSkills(
    void 0,
    "community",
    FEATURED_MARKET_PAGE_SIZE,
    marketCategoryTag
  );
  const marketOther = useMarketSkills(
    void 0,
    "official",
    OTHER_MARKET_PAGE_SIZE,
    marketCategoryTag
  );
  const previousMarketCategoryTagRef = reactExports.useRef(marketCategoryTag);
  const pluginEntrySource = "nav_bar";
  const pluginMarket = usePluginMarket(pluginEntrySource);
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const debounceTimerRef = reactExports.useRef(void 0);
  const [uninstallTarget, setUninstallTarget] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!initialSkillName || openedSkillDeepLinksRef.current.has(initialSkillName)) return;
    const target = market.skills.find((skill) => skill.name === initialSkillName);
    if (target) {
      openedSkillDeepLinksRef.current.add(initialSkillName);
      setActiveTab("community");
      openDetail(target);
      return;
    }
    if (requestedSkillDeepLinksRef.current.has(initialSkillName)) return;
    requestedSkillDeepLinksRef.current.add(initialSkillName);
    setActiveTab("community");
    void market.search(initialSkillName);
  }, [initialSkillName, market.search, market.skills, openDetail]);
  const communityInitRef = reactExports.useRef(false);
  const pluginsInitRef = reactExports.useRef(false);
  const {
    pending: autoUpdatePending,
    restarting: autoUpdateRestarting,
    restartNow,
    dismiss: dismissAutoUpdate
  } = useAutoUpdateBanner();
  const visibleAutoUpdatePending = autoUpdatePending ?? (autoUpdateRestarting ? { updatedCount: 0, updatedSkills: [], timestamp: 0 } : null);
  const { status: syncStatus, showComplete: showSyncComplete } = useSyncStatus(marketUnlocked);
  const { isOperator, role: operatorRole } = useOperator();
  const [operationsMode, setOperationsMode] = reactExports.useState(false);
  const {
    updates: skillUpdates,
    refresh: refreshUpdates,
    clearUpdate
  } = useSkillUpdates(marketUnlocked);
  const [updatingSet, setUpdatingSet] = reactExports.useState(/* @__PURE__ */ new Set());
  const fetchSeqRef = reactExports.useRef(0);
  const hasLoadedSkillsRef = reactExports.useRef(false);
  const fetchSkillsRef = reactExports.useRef(async () => null);
  const reportRefreshError = reactExports.useCallback((err) => {
    console.warn("[SkillsPage] Installed tools refresh failed:", err);
    dedupedToast.error(translationRef.current("skills.refreshError"), {
      action: {
        label: translationRef.current("common.retry"),
        onClick: () => {
          void fetchSkillsRef.current();
        }
      }
    });
  }, []);
  const fetchSkills = reactExports.useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    if (!hasLoadedSkillsRef.current) setLoading(true);
    setError(null);
    try {
      let pluginsFetchFailed = false;
      let pluginsFetchError;
      const [skillsRes, pluginsRes] = await Promise.all([
        gatewayFetch("/api/skills"),
        gatewayFetch("/api/plugins").catch((err) => {
          pluginsFetchFailed = true;
          pluginsFetchError = err;
          return null;
        })
      ]);
      const skillsData = await skillsRes.json();
      if (seq !== fetchSeqRef.current) return null;
      let merged = skillsData;
      let installedPluginsList = null;
      if (pluginsRes?.ok) {
        try {
          const pluginsData = await pluginsRes.json();
          installedPluginsList = pluginsData.plugins ?? [];
          const pluginSkills = installedPluginsList.map((p) => ({
            name: p.id,
            displayNameZh: pickLocalized(p.name, "zh-CN"),
            summary: pickLocalized(p.description, "en-US"),
            summaryZh: pickLocalized(p.description, "zh-CN"),
            description: pickLocalized(p.description, "en-US"),
            enabled: true,
            // SkillInfo has no 'bundled' tier — app-shipped plugins surface
            // as 'installed' here (they behave like pre-installed market
            // plugins on this management page).
            source: p.source === "user" ? "user" : "installed",
            tools: [],
            tags: pickLocalized(p.tags, "en-US", []),
            tagsCn: pickLocalized(p.tags, "zh-CN", []),
            creator: "",
            triggerWords: [],
            guidePrompt: "",
            guidePromptEn: "",
            skillType: "plugin",
            version: p.version
          }));
          merged = [...skillsData, ...pluginSkills];
        } catch (err) {
          pluginsFetchFailed = true;
          pluginsFetchError = err;
        }
      } else if (pluginsRes) {
        pluginsFetchFailed = true;
        pluginsFetchError = new Error(`Plugins request failed with status ${pluginsRes.status}`);
      }
      if (pluginsFetchFailed) {
        const refreshedNames = new Set(skillsData.map((skill) => skill.name));
        const preservedPlugins = skillsRef.current.filter(
          (skill) => skill.skillType === "plugin" && !refreshedNames.has(skill.name)
        );
        merged = [...skillsData, ...preservedPlugins];
      }
      if (seq !== fetchSeqRef.current) return null;
      setSkills(merged);
      hasLoadedSkillsRef.current = true;
      if (pluginsFetchFailed) reportRefreshError(pluginsFetchError);
      return merged;
    } catch (err) {
      if (seq !== fetchSeqRef.current) return null;
      if (hasLoadedSkillsRef.current) {
        reportRefreshError(err);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
      return null;
    } finally {
      if (seq === fetchSeqRef.current) setLoading(false);
    }
  }, [reportRefreshError]);
  reactExports.useEffect(() => {
    fetchSkillsRef.current = fetchSkills;
  }, [fetchSkills]);
  reactExports.useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);
  const fetchCreatorPlanSubmissions = reactExports.useCallback(async () => {
    if (!user) {
      setCreatorPlanSubmissions([]);
      return;
    }
    try {
      setCreatorPlanSubmissions(await listCreatorPlanSubmissions());
    } catch {
    }
  }, [user]);
  reactExports.useEffect(() => {
    void fetchCreatorPlanSubmissions();
  }, [fetchCreatorPlanSubmissions]);
  reactExports.useEffect(() => {
    const d = pluginEvents.onPluginsChanged(() => {
      fetchSkills();
    });
    return () => d.dispose();
  }, [fetchSkills]);
  reactExports.useEffect(() => {
    if (!window.hilo?.skills) return;
    return window.hilo.skills.onPermissionsChanged(() => {
      fetchSkills();
    });
  }, [fetchSkills]);
  reactExports.useEffect(() => {
    if (loading || deepLinkProcessedRef.current) return;
    const deepLinkSkill = sessionStorage.getItem("deepLinkSkill");
    if (!deepLinkSkill) return;
    const target = skills.find((s) => s.name === deepLinkSkill);
    if (target) {
      deepLinkProcessedRef.current = true;
      sessionStorage.removeItem("deepLinkSkill");
      setDetailSkill(target);
      setPreviewMode(true);
    }
  }, [skills, loading]);
  const fetchCommunitySections = reactExports.useCallback(() => {
    marketOfficialFeatured.fetchList();
    marketCommunity.fetchList();
    marketOther.fetchList();
  }, [marketOfficialFeatured.fetchList, marketCommunity.fetchList, marketOther.fetchList]);
  const handleTabSwitch = reactExports.useCallback(
    (tab) => {
      if (tab !== activeTab) {
        trackSkillTabSwitch({ from: activeTab, to: tab });
      }
      setActiveTab(tab);
      if (tab === "mine" && needsRefresh) {
        setNeedsRefresh(false);
        fetchSkills();
      }
      if (tab === "mine") {
        void fetchCreatorPlanSubmissions();
      }
      if (tab === "community") {
        fetchCommunitySections();
      }
      if (tab === "plugins") {
        pluginMarket.fetchList();
      }
    },
    [
      activeTab,
      needsRefresh,
      fetchSkills,
      fetchCreatorPlanSubmissions,
      fetchCommunitySections,
      pluginMarket.fetchList
    ]
  );
  reactExports.useEffect(() => {
    if (activeTab === "community" && !communityInitRef.current) {
      communityInitRef.current = true;
      fetchCommunitySections();
    }
    if (activeTab === "plugins" && !pluginsInitRef.current) {
      pluginsInitRef.current = true;
      if (initialPluginId) {
        pluginMarket.search(initialPluginId);
      } else {
        pluginMarket.fetchList();
      }
    }
  }, [
    activeTab,
    fetchCommunitySections,
    initialPluginId,
    pluginMarket.fetchList,
    pluginMarket.search
  ]);
  reactExports.useEffect(() => {
    if (previousMarketCategoryTagRef.current === marketCategoryTag) return;
    previousMarketCategoryTagRef.current = marketCategoryTag;
    if (activeTab === "community") {
      fetchCommunitySections();
    }
  }, [activeTab, fetchCommunitySections, marketCategoryTag]);
  const { categories: skillCategories } = useSkillCategories(
    capabilityTab === "skills" && activeTab !== "plugins"
  );
  const creatorPlanSubmissionMap = reactExports.useMemo(
    () => new Map(creatorPlanSubmissions.map((submission) => [submission.skillName, submission])),
    [creatorPlanSubmissions]
  );
  const filteredMineSkills = reactExports.useMemo(
    // Match stable codes while keeping older installed package tags usable.
    () => filterMySkills(
      skills,
      {
        query: installedSearchQuery,
        category: mineCategoryFilter,
        source: mineSourceFilter
      },
      creatorPlanSubmissionMap,
      skillCategories
    ),
    [
      skills,
      installedSearchQuery,
      mineCategoryFilter,
      mineSourceFilter,
      creatorPlanSubmissionMap,
      skillCategories
    ]
  );
  const createdSkills = reactExports.useMemo(
    () => filteredMineSkills.filter((skill) => skill.skillType !== "plugin" && skill.source === "user").sort((a, b) => a.name.localeCompare(b.name)),
    [filteredMineSkills]
  );
  const downloadedSkills = reactExports.useMemo(
    () => filteredMineSkills.filter((skill) => skill.skillType !== "plugin" && skill.source === "installed").sort((a, b) => a.name.localeCompare(b.name)),
    [filteredMineSkills]
  );
  const handleToggle = reactExports.useCallback(
    async (name, enabled) => {
      const applyingToast = beginSkillApplyingToast(t("skills.applying"));
      try {
        await homeService.hiloApp.toggleSkill(name, enabled);
        try {
          await window.hilo.opencode.restart();
        } catch {
        }
        setSkills((prev) => prev.map((s) => s.name === name ? { ...s, enabled } : s));
        setDetailSkill(
          (prev) => prev && prev.name === name && "enabled" in prev ? { ...prev, enabled } : prev
        );
        trackSkillToggle(
          name,
          enabled,
          mapSkillSource(skillsRef.current.find((s) => s.name === name)?.source)
        );
        applyingToast.success(t("skills.restartSuccess"));
      } catch {
        applyingToast.error(t("skills.toggleError"));
      }
    },
    [t]
  );
  const handleOfflineCreatedSkill = reactExports.useCallback(
    async (name) => {
      try {
        await offlineCreatorPlanSubmission(name);
        const skill = skillsRef.current.find((item) => item.name === name);
        if (skill?.enabled) await handleToggle(name, false);
        await fetchCreatorPlanSubmissions();
        dedupedToast.success(t("skills.mine.offlineSuccess", "Skill 已下线"));
      } catch (error2) {
        dedupedToast.error(
          `${t("skills.mine.offlineError", "下线失败")}: ${error2 instanceof Error ? error2.message : String(error2)}`
        );
      }
    },
    [fetchCreatorPlanSubmissions, handleToggle, t]
  );
  const handleUpdate = reactExports.useCallback(
    async (name) => {
      setUpdatingSet((prev) => new Set(prev).add(name));
      const ok = await market.install(name, "market_card");
      setUpdatingSet((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
      if (ok) {
        showSkillInstallSuccessToast(name, { isUpdate: true });
        clearUpdate(name);
        fetchSkills();
        refreshUpdates();
        try {
          await window.hilo.opencode.restart();
        } catch {
        }
      } else {
        dedupedToast.error(t("skills.market.updateError", { name }));
      }
    },
    [market.install, t, fetchSkills, refreshUpdates, clearUpdate]
  );
  const handleSearchChange = reactExports.useCallback(
    (value) => {
      setSearchQuery(value);
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        const trimmed = value.trim();
        if (trimmed) {
          trackSkillSearch({ tab: activeTab, query_length: trimmed.length });
          if (activeTab === "plugins") {
            pluginMarket.search(trimmed);
          } else {
            market.search(trimmed);
          }
        } else if (activeTab === "plugins") {
          pluginMarket.fetchList();
        } else {
          fetchCommunitySections();
        }
      }, SEARCH_DEBOUNCE_MS);
    },
    [activeTab, market.search, pluginMarket.search, pluginMarket.fetchList, fetchCommunitySections]
  );
  reactExports.useEffect(() => {
    return () => clearTimeout(debounceTimerRef.current);
  }, []);
  const findCommunityHostHook = reactExports.useCallback(
    (name) => {
      for (const h of [market, marketOfficialFeatured, marketCommunity, marketOther]) {
        if (h.skills.some((s) => s.name === name)) return h;
      }
      return null;
    },
    [market, marketOfficialFeatured, marketCommunity, marketOther]
  );
  const handleInstall = reactExports.useCallback(
    async (name, via) => {
      let isUpdate;
      let ok;
      if (activeTab === "plugins") {
        isUpdate = pluginMarket.plugins.some((p) => p.id === name && p.installed);
        ok = await pluginMarket.install(name, via);
      } else {
        const host = findCommunityHostHook(name);
        if (host) {
          isUpdate = host.skills.some((s) => s.name === name && s.installed);
          ok = await host.install(name, via);
        } else {
          isUpdate = false;
          ok = await market.install(name, via);
        }
      }
      if (ok) {
        showSkillInstallSuccessToast(name, { isUpdate });
        const latest = await fetchSkills();
        if (latest) {
          const fresh = latest.find((s) => s.name === name);
          if (fresh) {
            setDetailSkill((prev) => prev && prev.name === name ? fresh : prev);
          }
        }
        try {
          await window.hilo.opencode.restart();
        } catch {
        }
        market.markInstalled(name);
        marketOfficialFeatured.markInstalled(name);
        marketCommunity.markInstalled(name);
        marketOther.markInstalled(name);
      } else {
        dedupedToast.error(
          t(isUpdate ? "skills.market.updateError" : "skills.market.installError", { name })
        );
      }
    },
    [
      activeTab,
      market.install,
      market.markInstalled,
      marketOfficialFeatured.markInstalled,
      marketCommunity.markInstalled,
      marketOther.markInstalled,
      pluginMarket.install,
      pluginMarket.plugins,
      findCommunityHostHook,
      t,
      fetchSkills
    ]
  );
  const handleUninstallRequest = reactExports.useCallback(
    (name) => {
      const targetSkill = skills.find((s) => s.name === name);
      setUninstallTarget({
        name,
        source: targetSkill?.source ?? "installed",
        skillType: targetSkill?.skillType
      });
    },
    [skills]
  );
  const handleUninstallConfirm = reactExports.useCallback(async () => {
    if (!uninstallTarget) return;
    const { name, source, skillType } = uninstallTarget;
    setUninstallTarget(null);
    const trackSource = mapSkillSource(source);
    let ok;
    if (source === "user") {
      try {
        const res = await gatewayFetch(API_PATHS.skillUserTrash, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, skillType })
        });
        const data = await res.json();
        if (data.ok && data.path && shell.trashItem) {
          await shell.trashItem(data.path);
        }
        ok = data.ok;
        if (ok) {
          trackSkillUninstall(name, trackSource);
        } else {
          trackSkillUninstallFailed({
            name,
            source: trackSource,
            error: new Error(data.error || "Trash failed")
          });
        }
      } catch (err) {
        ok = false;
        trackSkillUninstallFailed({ name, source: trackSource, error: err });
      }
    } else {
      const m = skillType === "plugin" ? pluginMarket : findCommunityHostHook(name) ?? market;
      ok = await m.uninstall(name);
    }
    const isPlugin = skillType === "plugin";
    if (ok) {
      dedupedToast.success(
        t(isPlugin ? "skills.market.uninstallPluginSuccess" : "skills.market.uninstallSuccess", {
          name
        })
      );
      setDetailSkill(null);
      setPluginDetail(null);
      setSkills((prev) => prev.filter((s) => s.name !== name));
      setNeedsRefresh(true);
      fetchSkills();
      try {
        await window.hilo.opencode.restart();
      } catch {
      }
    } else {
      dedupedToast.error(
        t(isPlugin ? "skills.market.uninstallPluginError" : "skills.market.uninstallError", {
          name
        })
      );
    }
  }, [uninstallTarget, market, pluginMarket, findCommunityHostHook, t, fetchSkills, shell]);
  const handleExport = reactExports.useCallback(
    async (name) => {
      const toastId = dedupedToast.loading(t("skills.exporting"));
      try {
        const result = await homeService.skillExport.exportSkill(name);
        if (result.cancelled) {
          trackSkillExport({ skill_name: name, result: "cancelled" });
          dedupedToast.dismiss(toastId);
          return;
        }
        trackSkillExport({ skill_name: name, result: "success" });
        dedupedToast.success(t("skills.exportSuccess", { name }), { id: toastId });
      } catch {
        trackSkillExport({ skill_name: name, result: "failed" });
        dedupedToast.error(t("skills.exportFailed", { name }), { id: toastId });
      }
    },
    [t]
  );
  const handleShare = reactExports.useCallback((name) => {
    const { region, channel } = getRuntimeConfig();
    setShareUrl(getSkillShareUrl(name, region, channel));
  }, []);
  const handleCopyShareUrl = reactExports.useCallback(() => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(
      () => {
        dedupedToast.success(t("skills.share.copied"));
        setShareUrl(null);
      },
      () => {
        dedupedToast.error(t("skills.share.failed"));
      }
    );
  }, [shareUrl, t]);
  const { trySkill } = useTrySkill();
  const handleCreateSkillFromDialog = reactExports.useCallback(() => {
    trackSkillCreatorInvoke("creator_plan_empty");
    setCreatorPlanOpen(false);
    const installed = skillsRef.current.find((s) => s.name === "skill-creator");
    trySkill(installed ?? { name: "skill-creator" });
  }, [trySkill]);
  const handleTryItOut = reactExports.useCallback(
    (skill) => {
      const installedSkill = skillsRef.current.find((item) => item.name === skill.name);
      const resolvedSkill = installedSkill ?? skill;
      const isInstalled = "enabled" in resolvedSkill;
      const needsInstall = !isInstalled;
      const needsEnable = isInstalled && !resolvedSkill.enabled;
      const trackSource = isInstalled ? mapSkillSource(resolvedSkill.source) : "market";
      trackSkillTry({
        skill_name: skill.name,
        source: trackSource,
        needs_install: needsInstall,
        needs_enable: needsEnable
      });
      trySkill(resolvedSkill, {
        invokeSource: previewMode ? "share_link" : void 0
      });
    },
    [trySkill, previewMode]
  );
  const [pluginDetail, setPluginDetail] = reactExports.useState(null);
  const openPluginDetail = reactExports.useCallback(
    (plugin, trigger) => {
      const installed = skills.find((s) => s.name === plugin.id && s.skillType === "plugin");
      trackSkillDetailView({
        skill_name: plugin.id,
        tab: activeTab,
        is_installed: !!installed,
        trigger
      });
      setPluginDetail(plugin);
    },
    [skills, activeTab]
  );
  const openPluginDetailFromCard = reactExports.useCallback(
    (plugin) => openPluginDetail(plugin, "card"),
    [openPluginDetail]
  );
  const openPluginDetailFromList = reactExports.useCallback(
    (plugin) => openPluginDetail(plugin, "list"),
    [openPluginDetail]
  );
  reactExports.useEffect(() => {
    if (!initialPluginId || openedPluginDeepLinksRef.current.has(initialPluginId)) return;
    const target = pluginMarket.plugins.find((plugin) => plugin.id === initialPluginId);
    if (!target) return;
    openedPluginDeepLinksRef.current.add(initialPluginId);
    openPluginDetail(target);
    void pluginMarket.fetchList();
  }, [initialPluginId, pluginMarket.plugins, pluginMarket.fetchList, openPluginDetail]);
  const pluginDetailInstalledSkill = reactExports.useMemo(
    () => pluginDetail ? skills.find((s) => s.name === pluginDetail.id && s.skillType === "plugin") : void 0,
    [pluginDetail, skills]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      ref: scrollRef,
      "data-scrolling": isScrolling ? "true" : void 0,
      "data-action-ui-id": "skills-scroll-container",
      className: "scrollbar-fade relative z-2 flex h-full flex-1 flex-col overflow-y-auto bg-[var(--home-content-surface)]",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-8 md:px-12", "data-layout-slot": "skills-top-banner-stack", children: capabilityTab === "skills" && marketUnlocked && /* @__PURE__ */ jsxRuntimeExports.jsx(SyncBanner, { syncStatus, showComplete: showSyncComplete }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sticky top-0 z-10 bg-[var(--home-content-surface)]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "shrink-0 px-8 pb-4 pt-7 md:px-12", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative z-10 flex flex-wrap items-center gap-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Tabs,
            {
              value: capabilityTab,
              onValueChange: (value) => {
                if (value === "skills" || value === "connectors") setCapabilityTab(value);
              },
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                TabsList,
                {
                  variant: "track",
                  "aria-label": t("skills.capabilityTabsAria"),
                  className: "skills-capability-track h-[38px] rounded-xl p-[3px]",
                  "data-action-ui-id": "skills-capability-tabs",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      TabsTrigger,
                      {
                        value: "skills",
                        className: "h-8 min-w-32 gap-1.5 rounded-[9px] px-3 py-0 text-sm data-[active]:shadow-none",
                        "data-action-ui-id": "skills-capability-tab-skills",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(SkillIcon, { size: 16, strokeWidth: 1.75 }),
                          t("skills.capabilityTab.skills")
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      TabsTrigger,
                      {
                        value: "connectors",
                        className: "h-8 min-w-32 gap-1.5 rounded-[9px] px-3 py-0 text-sm data-[active]:shadow-none",
                        "data-action-ui-id": "skills-capability-tab-connectors",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Link2, { size: 18, strokeWidth: 2, "aria-hidden": "true" }),
                          t("skills.capabilityTab.connectors"),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { className: "h-4 rounded-full bg-brand-accent px-1.5 py-0 text-[10px] leading-none text-brand-accent-foreground", children: t("skills.badge.new") })
                        ]
                      }
                    )
                  ]
                }
              )
            }
          ) }) }),
          capabilityTab === "skills" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-8 md:px-12", "data-layout-slot": "skills-auto-update-notice", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            AutoUpdateBannerPresence,
            {
              pending: visibleAutoUpdatePending,
              restarting: autoUpdateRestarting,
              onRestart: restartNow,
              onDismiss: dismissAutoUpdate
            }
          ) }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: `flex min-w-0 flex-nowrap items-start gap-3 px-8 pt-4 ${TAB_CONTENT_ENTER_CLASS_NAME} md:px-12 ${capabilityTab === "skills" ? "min-h-16" : "mb-2 min-h-[68px]"}`,
              "data-layout-slot": capabilityTab === "skills" ? "skills-section-header" : "connectors-section-header",
              "data-capability": capabilityTab,
              children: capabilityTab === "skills" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-6", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Tabs, { value: activeTab, onValueChange: handleTabSwitch, className: "min-w-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TabsList,
                    {
                      variant: "underline",
                      "aria-label": t("skills.primaryTabsAria"),
                      className: "ml-0",
                      "data-action-ui-id": "skills-primary-tabs",
                      children: ["community", "mine"].map((tab) => {
                        const infoKey = tab === "community" ? "skills.tabs.communityInfo" : "";
                        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center gap-0.5", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            TabsTrigger,
                            {
                              value: tab,
                              variant: "underline",
                              "data-action-ui-id": `skills-tab-${tab}`,
                              children: t(`skills.tabs.${tab}`)
                            }
                          ),
                          infoKey && /* @__PURE__ */ jsxRuntimeExports.jsx(TabInfoPopover, { bodyKey: infoKey, tabKey: tab })
                        ] }, tab);
                      })
                    }
                  ) }),
                  activeTab === "community" && isOperator && /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      TooltipTrigger,
                      {
                        "data-action-ui-id": "skills-operation-edit",
                        render: /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Button,
                          {
                            variant: operationsMode ? "default" : "outline",
                            className: "h-9 gap-1.5 rounded-lg px-4 text-[13px] font-medium"
                          }
                        ),
                        onClick: () => setOperationsMode(!operationsMode),
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Settings2, { size: 16, strokeWidth: 1.5 }),
                          t("skills.operation.editButton")
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { children: t("skills.operation.editTooltip") })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: "scrollbar-none flex min-w-0 flex-1 flex-nowrap items-center gap-3 overflow-x-auto overscroll-x-contain [&>*:first-child]:ml-auto",
                    "data-layout-slot": "skills-toolbar-actions",
                    children: [
                      !(activeTab === "community" && operationsMode) && (() => {
                        const isMine = activeTab === "mine";
                        const value = isMine ? installedSearchQuery : searchQuery;
                        const setValue = isMine ? setInstalledSearchQuery : handleSearchChange;
                        return /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "div",
                          {
                            className: "w-60 min-w-36 max-w-60 flex-1 shrink",
                            "data-layout-slot": "skills-search-slot",
                            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                              PageSearchInput,
                              {
                                value,
                                onValueChange: setValue,
                                placeholder: t("skills.market.searchPlaceholder"),
                                clearLabel: t("common.clear"),
                                inputActionId: "skills-header-search"
                              }
                            )
                          }
                        );
                      })(),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        Button,
                        {
                          variant: "outline",
                          size: "default",
                          "data-action-ui-id": "skills-import-button",
                          className: "h-9 shrink-0 gap-1.5 whitespace-nowrap rounded-lg px-4 text-[13px] font-medium",
                          onClick: () => setImportOpen(true),
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(Import, { size: 16, strokeWidth: 1.5 }),
                            t("skills.header.install", "Import Skill")
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        Button,
                        {
                          size: "default",
                          "data-action-ui-id": "skills-create-via-hub",
                          className: "h-9 shrink-0 gap-1.5 whitespace-nowrap rounded-lg px-4 text-[13px] font-medium",
                          onClick: () => {
                            trackSkillCreatorInvoke("market_button");
                            const installed = skills.find((s) => s.name === "skill-creator");
                            trySkill(installed ?? { name: "skill-creator" });
                          },
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 16, strokeWidth: 1.5 }),
                            t("skills.header.createSkill", "Create Skill")
                          ]
                        }
                      )
                    ]
                  }
                )
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                ConnectorHeaderContent,
                {
                  query: connectorSearchQuery,
                  onQueryChange: setConnectorSearchQuery,
                  sortMode: connectorSortMode,
                  onSortModeChange: setConnectorSortMode,
                  onCustomConnector: () => setCustomConnectorOpen(true)
                }
              )
            },
            `section-header-${capabilityTab}`
          ),
          capabilityTab === "skills" && !(activeTab === "community" && operationsMode) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: TAB_CONTENT_ENTER_CLASS_NAME, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            SkillFilterBar,
            {
              categories: skillCategories,
              activeTab,
              activeTag,
              onTagChange: handleTagChange,
              viewMode,
              onViewModeChange: setViewMode,
              sortBy,
              onSortChange: setSortBy,
              mineCategoryFilter,
              onMineCategoryFilterChange: setMineCategoryFilter,
              mineSourceFilter,
              onMineSourceFilterChange: setMineSourceFilter
            }
          ) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: `flex flex-1 flex-col px-8 pb-12 ${TAB_CONTENT_ENTER_CLASS_NAME} md:px-12 ${capabilityTab === "connectors" ? "pt-4" : "pt-2"}`,
            "data-layout-slot": "skills-capability-content",
            children: [
              capabilityTab === "skills" && activeTab === "community" && operationsMode && /* @__PURE__ */ jsxRuntimeExports.jsx(OperationsView, { role: operatorRole, onExit: () => setOperationsMode(false) }),
              capabilityTab === "skills" && activeTab === "community" && !operationsMode && /* @__PURE__ */ jsxRuntimeExports.jsx(
                CommunityTabContent,
                {
                  searchMarket: market,
                  marketOfficialFeatured,
                  marketCommunity,
                  marketOther,
                  searchQuery,
                  onInstall: handleInstall,
                  onDetail: openDetailFromCard,
                  onDetailList: openDetailFromList,
                  installedSkills: skills,
                  onToggle: handleToggle,
                  onTryItOut: handleTryItOut,
                  onExport: handleExport,
                  onShare: handleShare,
                  skillUpdates,
                  onUpdate: handleUpdate,
                  updatingSet,
                  viewMode,
                  activeTag,
                  hideInstalled,
                  onHideInstalledChange: setHideInstalled,
                  sortBy,
                  onSortChange: setSortBy,
                  onUninstall: handleUninstallRequest,
                  onRetry: fetchCommunitySections,
                  onOpenCreatorPlan: openCreatorPlan
                }
              ),
              capabilityTab === "skills" && activeTab === "plugins" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                PluginMarketTabContent,
                {
                  pluginMarket,
                  searchQuery,
                  installedSkills: skills,
                  entrySource: pluginEntrySource,
                  onInstall: handleInstall,
                  onUninstall: handleUninstallRequest,
                  onDetail: openPluginDetailFromCard,
                  onDetailList: openPluginDetailFromList,
                  viewMode
                }
              ),
              capabilityTab === "skills" && activeTab === "mine" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-12", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: t("common.loading") }) }),
                error && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  PageStateBoundary,
                  {
                    error: true,
                    errorOptions: {
                      title: t("skills.loadError"),
                      description: error,
                      retry: fetchSkills
                    }
                  }
                ),
                !loading && !error && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  MySkillsView,
                  {
                    defaultTab: mineSourceFilter === "community" ? "downloaded" : "created",
                    createdSkills,
                    downloadedSkills,
                    submissions: creatorPlanSubmissionMap,
                    autoUpdate: skillAutoUpdate,
                    onAutoUpdateChange: handleAutoUpdateToggle,
                    onUpload: () => openCreatorPlan(void 0, "upload"),
                    onEdit: (name) => openCreatorPlan(name, "design"),
                    onOffline: handleOfflineCreatedSkill,
                    onToggle: handleToggle,
                    onDetail: openDetailFromList,
                    onExport: handleExport,
                    onShare: handleShare,
                    onTryItOut: handleTryItOut,
                    onUninstall: handleUninstallRequest,
                    skillUpdates,
                    onUpdate: handleUpdate,
                    updatingSet,
                    onGoToCommunity: () => {
                      handleTabSwitch("community");
                      forceSetActiveTag(null);
                    },
                    onRefreshSubmissions: fetchCreatorPlanSubmissions
                  },
                  mineSourceFilter
                )
              ] }),
              capabilityTab === "connectors" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                ConnectorsTab,
                {
                  initialConnectorId,
                  query: connectorSearchQuery,
                  onQueryChange: setConnectorSearchQuery,
                  sortMode: connectorSortMode,
                  onSortModeChange: setConnectorSortMode,
                  customConnectorOpen,
                  onCustomConnectorOpenChange: setCustomConnectorOpen,
                  showHeader: false
                }
              ) : null
            ]
          },
          `capability-content-${capabilityTab}`
        ),
        detailSkill && /* @__PURE__ */ jsxRuntimeExports.jsx(
          SkillDetailDialog,
          {
            skill: detailSkill,
            installedSkill: skills.find((skill) => skill.name === detailSkill.name),
            accountId: user?.userID ?? "",
            activeTab,
            onClose: () => {
              setDetailSkill(null);
              setPreviewMode(false);
            },
            onToggle: handleToggle,
            onTryItOut: handleTryItOut,
            onInstall: handleInstall,
            installing: market.installingSet.has(detailSkill.name) || marketOfficialFeatured.installingSet.has(detailSkill.name) || marketCommunity.installingSet.has(detailSkill.name) || marketOther.installingSet.has(detailSkill.name) || pluginMarket.installingSet.has(detailSkill.name),
            onShare: handleShare,
            onOpenCreatorPlan: openCreatorPlan,
            updateInfo: skillUpdates.get(detailSkill.name),
            onUpdate: handleUpdate,
            updating: updatingSet.has(detailSkill.name)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          PluginMarketDetailDialog,
          {
            plugin: pluginDetail,
            installedSkill: pluginDetailInstalledSkill,
            installing: pluginDetail ? pluginMarket.installingSet.has(pluginDetail.id) : false,
            onClose: () => setPluginDetail(null),
            onInstall: handleInstall,
            onUninstall: handleUninstallRequest
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          AlertDialog,
          {
            open: !!uninstallTarget,
            onOpenChange: (open) => !open && setUninstallTarget(null),
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { size: "sm", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTitle, { children: uninstallTarget?.source === "user" ? t("skills.delete.userTitle") : uninstallTarget?.skillType === "plugin" ? t("skills.delete.pluginTitle") : t("skills.delete.installedTitle") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogDescription, { children: uninstallTarget?.source === "user" ? t("skills.delete.userDesc") : uninstallTarget?.skillType === "plugin" ? t("skills.delete.pluginDesc") : t("skills.delete.installedDesc") })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { children: t("common.cancel") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  AlertDialogAction,
                  {
                    "data-action-ui-id": "market-skill-uninstall-confirm",
                    variant: "destructive",
                    onClick: handleUninstallConfirm,
                    children: uninstallTarget?.source === "user" ? t("skills.delete.confirm") : uninstallTarget?.skillType === "plugin" ? t("skills.plugin.uninstall") : t("skills.market.uninstall")
                  }
                )
              ] })
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          CreatorPlanDialog,
          {
            open: creatorPlanOpen,
            onOpenChange: setCreatorPlanOpen,
            mySkills: creatorPlanDefaultSkill ? skills.filter(
              (skill) => skill.source === "user" || skill.name === creatorPlanDefaultSkill
            ) : localCreatedSkills,
            defaultDisplayName: user?.username ?? "",
            defaultSkillName: creatorPlanDefaultSkill,
            defaultSource: creatorPlanDefaultSource,
            existingSubmission: creatorPlanSubmissionMap.get(creatorPlanDefaultSkill),
            onCreateSkill: handleCreateSkillFromDialog,
            onSaved: () => {
              void fetchSkills();
              void fetchCreatorPlanSubmissions();
            },
            onRefreshSubmissions: fetchCreatorPlanSubmissions
          },
          `${creatorPlanDefaultSource}:${creatorPlanDefaultSkill || "new"}`
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!shareUrl, onOpenChange: (open) => !open && setShareUrl(null), children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { className: "sm:max-w-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-col items-center gap-4 pt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-12 w-12 items-center justify-center border border-border bg-background", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { size: 24, strokeWidth: 1.5, className: "text-foreground" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-1 text-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "text-base font-medium", children: t("skills.share.dialogTitle", "分享链接已生成") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: t("skills.share.dialogDesc", "将此链接分享给他人即可安装该 Skill。") })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-muted px-3 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-foreground truncate select-all", children: shareUrl }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: t("skills.share.validForever", "永久有效") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              "data-action-ui-id": "skill-share-copy",
              className: "w-full",
              onClick: handleCopyShareUrl,
              children: t("skills.share.copyLink", "复制链接")
            }
          )
        ] }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SkillImportDialog, { open: importOpen, onOpenChange: setImportOpen, onImported: fetchSkills })
      ]
    }
  );
}
function CommunityTabContent({
  searchMarket,
  marketOfficialFeatured,
  marketCommunity,
  marketOther,
  searchQuery,
  // tabName / onDetailList / onExport / onShare / onUninstall / onUpdate /
  // updatingSet / skillUpdates / viewMode are accepted to keep the prop
  // surface stable for callers; the 3-rail layout doesn't surface them yet
  // but detail dialog / future per-section overrides depend on them.
  tabName: _tabName = "community",
  onInstall,
  onDetail,
  onDetailList: _onDetailList,
  installedSkills,
  onToggle,
  onTryItOut,
  onExport: _onExport,
  onShare: _onShare,
  onUninstall: _onUninstall,
  skillUpdates: _skillUpdates,
  onUpdate: _onUpdate,
  updatingSet: _updatingSet,
  viewMode: _viewMode,
  activeTag,
  hideInstalled,
  onHideInstalledChange,
  sortBy,
  onSortChange,
  onRetry,
  onOpenCreatorPlan
}) {
  const { t } = useTranslation();
  const applyFilters = reactExports.useCallback(
    (skills) => {
      if (!activeTag || activeTag === FEATURED_TAG) return skills;
      return skills.filter((skill) => skillCategoryCodes(skill).includes(activeTag));
    },
    [activeTag]
  );
  const isSearching = searchQuery.trim().length > 0;
  const officialFeatured = reactExports.useMemo(
    () => applyFilters(marketOfficialFeatured.skills),
    [marketOfficialFeatured.skills, applyFilters]
  );
  const community = reactExports.useMemo(
    () => applyFilters(marketCommunity.skills),
    [marketCommunity.skills, applyFilters]
  );
  const other = reactExports.useMemo(() => {
    let list = applyFilters(marketOther.skills);
    if (hideInstalled) list = list.filter((s) => !s.installed);
    if (sortBy === "hot") {
      list = [...list].sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
    }
    return list;
  }, [marketOther.skills, applyFilters, hideInstalled, sortBy]);
  const searchResults = reactExports.useMemo(
    () => applyFilters(searchMarket.skills),
    [searchMarket.skills, applyFilters]
  );
  const aggregateLoading = isSearching ? searchMarket.loading && searchMarket.skills.length === 0 : marketOfficialFeatured.loading && marketOfficialFeatured.skills.length === 0 || marketCommunity.loading && marketCommunity.skills.length === 0 || marketOther.loading && marketOther.skills.length === 0;
  const aggregateError = isSearching ? searchMarket.error : marketOfficialFeatured.error ?? marketCommunity.error ?? marketOther.error ?? null;
  const isAllEmpty = isSearching && searchResults.length === 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-1 flex-col gap-12", children: [
    aggregateLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-12", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: t("skills.market.loading") }) }),
    aggregateError && /* @__PURE__ */ jsxRuntimeExports.jsx(
      PageStateBoundary,
      {
        error: true,
        errorOptions: {
          title: t("skills.market.error"),
          description: aggregateError,
          retry: onRetry
        }
      }
    ),
    !aggregateLoading && !aggregateError && isAllEmpty && /* @__PURE__ */ jsxRuntimeExports.jsx(PageStateBoundary, { empty: true, emptyOptions: { title: t("skills.market.noMatch") } }),
    isSearching && !aggregateLoading && !aggregateError && searchResults.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-3 lg:grid-cols-2", children: searchResults.map((marketSkill) => {
        const installedSkill = marketSkill.installed ? installedSkills.find((s) => s.name === marketSkill.name) : void 0;
        const skill = installedSkill ? (
          // Carry MarketSkillInfo.installed=true forward — SkillInfo
          // alone has no `installed` field, so the spread would drop
          // the marker and downstream cards mis-render as "uninstalled".
          { ...installedSkill, downloads: marketSkill.downloads, installed: true }
        ) : marketSkill;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          OtherSkillItem,
          {
            skill,
            installing: searchMarket.installingSet.has(marketSkill.name),
            onInstall,
            onToggle,
            onDetail,
            onTryItOut
          },
          skill.name
        );
      }) }),
      searchMarket.hasMore && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center pt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          "data-action-ui-id": "market-skill-load-more",
          disabled: searchMarket.loading,
          className: "inline-flex items-center gap-2 h-8 rounded-md px-4 text-xs font-medium text-foreground border border-foreground/15 bg-transparent hover:bg-muted hover:border-foreground/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
          onClick: searchMarket.loadMore,
          children: searchMarket.loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 12, className: "animate-spin" }),
            t("common.loading")
          ] }) : t("skills.market.loadMore")
        }
      ) })
    ] }),
    !isSearching && !aggregateLoading && !aggregateError && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-4", "data-layout-slot": "skills-official-featured-offset", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        FeaturedSkillSection,
        {
          dataActionUiId: "market-official-featured",
          title: t("skills.market.officialFeatured", "官方精选"),
          emptyText: t("skills.market.officialFeaturedEmpty", "暂无此类型的 Skill"),
          skills: officialFeatured,
          installingSet: marketOfficialFeatured.installingSet,
          onInstall,
          onTryItOut,
          onDetail
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        FeaturedSkillSection,
        {
          dataActionUiId: "market-community-featured",
          title: t("skills.market.communityFeatured", "用户精选"),
          emptyText: t("skills.market.communityFeaturedEmpty", "暂无此类型的 Skill"),
          skills: community,
          installingSet: marketCommunity.installingSet,
          onInstall,
          onTryItOut,
          onDetail,
          footerCard: activeTag ? void 0 : /* @__PURE__ */ jsxRuntimeExports.jsx(CreatorPlanInviteCard, { onOpen: () => onOpenCreatorPlan?.() }),
          titleAccessory: (
            // ⓘ next to the title is the single entry into the creator-plan
            // popover (which itself contains the "Request to Review" CTA).
            // No separate top-right button — design mock keeps the rail
            // header lean. Hover-triggered popover lives in its own small
            // component (CreatorPlanHoverPopover) so we get controlled
            // open/close + grace period without polluting CommunityTabContent.
            /* @__PURE__ */ jsxRuntimeExports.jsx(CreatorPlanHoverPopover, { onOpenCreatorPlan })
          )
        }
      )
    ] }),
    !isSearching && activeTag !== FEATURED_TAG && !aggregateLoading && !aggregateError && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-2 text-base font-heading font-medium text-foreground", children: [
          t("skills.market.otherSkills", "其他 Skill"),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs font-normal text-muted-foreground", children: [
            "· ",
            other.length
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "label",
            {
              "data-action-ui-id": "market-other-hide-installed",
              className: "inline-flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Checkbox,
                  {
                    checked: hideInstalled,
                    onCheckedChange: (checked) => onHideInstalledChange?.(!!checked),
                    className: "h-3.5 w-3.5"
                  }
                ),
                t("skills.filter.hideInstalled", "仅显示未安装")
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              value: sortBy ?? "recent",
              onValueChange: (v) => onSortChange?.(v),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  SelectTrigger,
                  {
                    size: "sm",
                    className: "h-8 min-w-24 border-border bg-transparent text-xs",
                    "data-action-ui-id": "market-other-sort",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { children: () => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
                      t("skills.sort.label", "排序"),
                      ":",
                      " ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground", children: sortBy === "hot" ? t("skills.sort.hot", "热门") : t("skills.sort.recent", "最近") })
                    ] }) })
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "hot", children: t("skills.sort.hot", "热门") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "recent", children: t("skills.sort.recent", "最近") })
                ] })
              ]
            }
          )
        ] })
      ] }),
      other.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-3 lg:grid-cols-2", children: other.map((marketSkill) => {
        const installedSkill = marketSkill.installed ? installedSkills.find((s) => s.name === marketSkill.name) : void 0;
        const skill = installedSkill ? (
          // Carry MarketSkillInfo.installed=true forward — SkillInfo
          // alone has no `installed` field, so the spread would drop
          // the marker and downstream cards mis-render as "uninstalled".
          { ...installedSkill, downloads: marketSkill.downloads, installed: true }
        ) : marketSkill;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          OtherSkillItem,
          {
            skill,
            installing: marketOther.installingSet.has(marketSkill.name),
            onInstall,
            onToggle,
            onDetail,
            onTryItOut
          },
          skill.name
        );
      }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        PageStateBoundary,
        {
          empty: true,
          density: "panel",
          className: "min-h-40",
          emptyOptions: {
            text: t("skills.market.otherEmpty", "暂无符合筛选条件的 Skill")
          }
        }
      ),
      marketOther.hasMore && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center pt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          "data-action-ui-id": "market-skill-load-more",
          disabled: marketOther.loading,
          className: "inline-flex items-center gap-2 h-8 rounded-md px-4 text-xs font-medium text-foreground border border-foreground/15 bg-transparent hover:bg-muted hover:border-foreground/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
          onClick: marketOther.loadMore,
          children: marketOther.loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 12, className: "animate-spin" }),
            t("common.loading")
          ] }) : t("skills.market.loadMore")
        }
      ) })
    ] })
  ] });
}
function PluginMarketTabContent({
  pluginMarket,
  searchQuery,
  installedSkills,
  entrySource,
  onInstall,
  onUninstall,
  onDetail,
  onDetailList,
  viewMode
}) {
  const { t } = useTranslation();
  const filteredPlugins = pluginMarket.plugins;
  const installedById = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const s of installedSkills) {
      if (s.skillType === "plugin") {
        map.set(s.name, s);
      }
    }
    return map;
  }, [installedSkills]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-1 flex-col gap-12", children: [
    pluginMarket.loading && pluginMarket.plugins.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-12", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: t("skills.market.loading") }) }),
    pluginMarket.error && /* @__PURE__ */ jsxRuntimeExports.jsx(
      PageStateBoundary,
      {
        error: true,
        errorOptions: {
          title: t("skills.market.error"),
          description: pluginMarket.error,
          retry: pluginMarket.fetchList
        }
      }
    ),
    !pluginMarket.loading && !pluginMarket.error && filteredPlugins.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
      PageStateBoundary,
      {
        empty: true,
        emptyOptions: {
          title: searchQuery ? t("skills.market.noMatch") : t("skills.market.empty")
        }
      }
    ),
    filteredPlugins.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      viewMode === "grid" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", children: filteredPlugins.map((plugin, position) => {
        const installedSkill = installedById.get(plugin.id);
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          PluginMarketCard,
          {
            plugin,
            installedSkill,
            entrySource,
            position,
            installing: pluginMarket.installingSet.has(plugin.id),
            onInstall,
            onUninstall,
            onDetail
          },
          plugin.id
        );
      }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border border-border rounded-lg bg-card divide-y divide-border", children: filteredPlugins.map((plugin) => {
        const installedSkill = installedById.get(plugin.id);
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          PluginMarketListItem,
          {
            plugin,
            installedSkill,
            installing: pluginMarket.installingSet.has(plugin.id),
            onInstall,
            onDetail: onDetailList,
            onUninstall
          },
          plugin.id
        );
      }) }),
      pluginMarket.hasMore && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center pt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          "data-action-ui-id": "plugin-market-load-more",
          disabled: pluginMarket.loading,
          className: "inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-foreground/70 border border-border rounded-lg hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          onClick: pluginMarket.loadMore,
          children: pluginMarket.loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 14, strokeWidth: 1.5, className: "animate-spin" }),
            t("common.loading")
          ] }) : t("skills.market.loadMore")
        }
      ) })
    ] })
  ] });
}
function SyncBanner({ syncStatus, showComplete }) {
  const { t } = useTranslation();
  if (!syncStatus) return null;
  if (syncStatus.syncing) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-action-ui-id": "skills-sync-banner",
        className: "flex items-center gap-2 border-b border-primary/20 bg-primary/10 py-2",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 14, strokeWidth: 1.5, className: "animate-spin text-primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-primary font-medium", children: t("skills.market.syncProgress", {
            done: syncStatus.progress?.completed ?? 0,
            total: syncStatus.progress?.total ?? 0
          }) })
        ]
      }
    );
  }
  if (showComplete && syncStatus.lastSyncResult) {
    const { installed, updated, failed } = syncStatus.lastSyncResult;
    const hasFailed = failed > 0;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        "data-action-ui-id": "skills-sync-banner",
        className: `flex items-center gap-2 border-b py-2 animate-in fade-in duration-300 ${hasFailed ? "bg-destructive/5 border-destructive/10" : "bg-primary/5 border-primary/10"}`,
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `text-xs ${hasFailed ? "text-destructive/80" : "text-primary/80"}`, children: [
          t("skills.market.syncComplete", { installed, updated }),
          hasFailed && ` (${t("skills.market.syncFailed", { failed })})`
        ] })
      }
    );
  }
  return null;
}
function TabInfoPopover({
  bodyKey,
  tabKey
}) {
  const { t } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const closeTimer = reactExports.useRef(null);
  const handleOpen = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  };
  const handleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PopoverTrigger,
      {
        "data-action-ui-id": `skills-tab-info-${tabKey}`,
        className: "inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground cursor-help outline-none focus-visible:outline-none",
        onMouseEnter: handleOpen,
        onMouseLeave: handleClose,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { size: 14, strokeWidth: 2.25 })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PopoverContent,
      {
        align: "start",
        sideOffset: 8,
        className: "max-w-72 rounded-md p-3 text-xs leading-relaxed",
        onMouseEnter: handleOpen,
        onMouseLeave: handleClose,
        children: t(bodyKey)
      }
    )
  ] });
}
function CreatorPlanHoverPopover({
  onOpenCreatorPlan
}) {
  const { t } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const closeTimer = reactExports.useRef(null);
  const handleOpen = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  };
  const handleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PopoverTrigger,
      {
        "data-action-ui-id": "market-community-info",
        className: "inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer",
        onMouseEnter: handleOpen,
        onMouseLeave: handleClose,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { size: 14 })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PopoverContent,
      {
        align: "start",
        sideOffset: 8,
        className: "max-w-80 rounded-[4px] p-3 text-xs",
        onMouseEnter: handleOpen,
        onMouseLeave: handleClose,
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs leading-relaxed text-muted-foreground", children: [
          t(
            "skills.market.creatorPlanTipBody",
            "做了好用的 skill？申请官方 review，被选中可获积分奖励或加入共创社区。"
          ),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "data-action-ui-id": "market-community-info-cta",
              onClick: () => onOpenCreatorPlan?.(),
              className: "text-foreground underline underline-offset-2 hover:opacity-80 cursor-pointer outline-none focus-visible:outline-none",
              children: t("skills.market.creatorPlanApply", "申请审核")
            }
          )
        ] })
      }
    )
  ] });
}
function validateSkillsSearch(search) {
  const out = {};
  const capability = search.capability;
  if (capability === "skills" || capability === "connectors") {
    out.capability = capability;
  }
  const tab = search.tab;
  if (tab === "community" || tab === "plugins" || tab === "mine") {
    out.tab = tab;
  }
  const subTab = search.subTab;
  if (subTab === "skills" || subTab === "plugins") {
    out.subTab = subTab;
  }
  const pluginId = typeof search.pluginId === "string" ? search.pluginId.trim() : "";
  if (pluginId) out.pluginId = pluginId;
  const skillName = typeof search.skillName === "string" ? search.skillName.trim() : "";
  if (skillName) out.skillName = skillName;
  const connectorId = typeof search.connectorId === "string" ? search.connectorId.trim() : "";
  if (connectorId) out.connectorId = connectorId;
  return out;
}
const SplitComponent = SkillsPage;
export {
  SplitComponent as component,
  validateSkillsSearch
};
