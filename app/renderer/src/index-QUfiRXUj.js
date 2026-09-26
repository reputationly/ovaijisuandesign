import { e as createLucideIcon, h as useTranslation, fk as useComfyUiDownloadProgress, fl as isActiveComfyUiDownloadTask, j as jsxRuntimeExports, bV as Download, eJ as Progress, bg as Button, Y as X, dx as CircleAlert, c0 as ShieldCheck, u as useGatewayReady, g as useRuntimeConfig, r as reactExports, k as useQuery, l as gatewayFetch, m as API_PATHS, al as PencilIcon, U as Icon, ao as Trash2, fm as PanelsTopLeft, aG as Dialog, aH as DialogContent, bd as DialogHeader, be as DialogTitle, bf as DialogDescription, X as Input, fn as Textarea, c1 as DialogFooter, bj as AlertDialog, bk as AlertDialogContent, bl as AlertDialogHeader, bm as AlertDialogTitle, bn as AlertDialogDescription, bo as AlertDialogFooter, bp as AlertDialogCancel, bq as AlertDialogAction, a5 as dedupedToast, fo as countUnavailableComfyUiModels, dh as Popover, dj as PopoverContent, dE as PopoverTitle, dg as ExternalLink, o as usePlatform, bH as openExternalUrl, aF as useIsScrolling, fp as Layers, fq as Package, dq as ArrowLeft, aK as Play, fr as Pause, fs as isComfyUiModelUnavailable, v as useStorage, eH as CircleCheck, eI as CircleX, ft as CircleHelp, H as homeService, cp as Checkbox, fu as FileJson2, fv as HardDrive, dW as LocalFolderIcon, aL as BookOpen, fw as Accordion, fx as AccordionItem, fy as AccordionTrigger, fz as AccordionContent, fA as WORKFLOW_TUTORIAL_SOURCE_URL, dm as useTopbarState, a3 as useProjectStore, fB as isCaseInsensitiveOs, fC as workspaceInventoryPathKey, fD as resolveRecentProjectsSortMode, ag as DropdownMenu, ah as DropdownMenuTrigger, aj as DropdownMenuContent, ak as DropdownMenuItem, Q as Plus, fE as DropdownMenuSub, fF as DropdownMenuSubTrigger, fG as DropdownMenuSubContent, bO as DropdownMenuGroup, bP as DropdownMenuLabel, a1 as workspaceDisplayName, dn as mergeWorkspaceInventory, fH as splitPinnedInventory, fI as groupRecentWorkspacesByProject, fJ as UNGROUPED_RECENT_GROUP_KEY, w as useNavigate, ax as useSearch, fK as useGatewayFetch, J as buildWorkspaceSearch, fL as trackComfyUiWorkflowCatalogAction, K as workspaceRuntimeFromOpenResult, fM as toastWorkspaceOpenResult, G as stageWorkspacePreview, fN as trackComfyUiWorkflowInstall, fO as trackComfyUiWorkflowInstallFailed, bI as CatalogPageHeading, bU as LoaderCircle, cP as Upload, cZ as ChevronRight, fP as Workflow, bK as Tabs, bL as TabsList, bM as TabsTrigger, bh as RetryIcon, S as PageStateBoundary } from "./main.jsx";
import { u as useHubEntries, H as HUB_ENTRY_IDS } from "./use-hub-entries-BVopDERb.js";
import { u as useWorkspaceAvailability } from "./use-workspace-availability-BsRVqdz3.js";
import { P as PageSearchInput, T as TAB_CONTENT_ENTER_CLASS_NAME } from "./index-eXcNLvyz.js";
import { E as Eye } from "./eye-CFw9EXGT.js";
/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const CircleMinus = createLucideIcon("CircleMinus", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M8 12h8", key: "1wcyev" }]
]);
/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const CircleStop = createLucideIcon("CircleStop", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["rect", { x: "9", y: "9", width: "6", height: "6", rx: "1", key: "1ssd4o" }]
]);
/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const FolderClock = createLucideIcon("FolderClock", [
  ["circle", { cx: "16", cy: "16", r: "6", key: "qoo3c4" }],
  [
    "path",
    {
      d: "M7 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2",
      key: "1urifu"
    }
  ],
  ["path", { d: "M16 14v2l1 1", key: "xth2jh" }]
]);
/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Gauge = createLucideIcon("Gauge", [
  ["path", { d: "m12 14 4-4", key: "9kzdfg" }],
  ["path", { d: "M3.34 19a10 10 0 1 1 17.32 0", key: "19p75a" }]
]);
function ComfyUiModelDownloadSection() {
  const { t } = useTranslation();
  const { tasks, cancelTask, dismissTask } = useComfyUiDownloadProgress();
  const visibleTasks = tasks.filter(
    (task) => isActiveComfyUiDownloadTask(task) || task.status === "failed" || task.untrustedSourceModels.length > 0
  );
  const activeTaskCount = visibleTasks.filter(isActiveComfyUiDownloadTask).length;
  if (visibleTasks.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: "mb-4 overflow-hidden rounded-lg border border-border bg-card",
      "aria-label": t("workflows.downloads.title"),
      "data-action-ui-id": "workflows-model-downloads",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-11 items-center justify-between gap-3 border-b border-border px-4 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 16, strokeWidth: 1.5, className: "shrink-0 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-medium text-foreground", children: t("workflows.downloads.title") }),
          activeTaskCount > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: t("chat.workflow.downloadActiveCount", { count: activeTaskCount }) }) : null
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divide-y divide-border", children: [...visibleTasks].reverse().map((task) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          DownloadTaskRow,
          {
            task,
            onCancel: () => cancelTask(task.id),
            onDismiss: () => dismissTask(task.id)
          },
          task.id
        )) })
      ]
    }
  );
}
function DownloadTaskRow({
  task,
  onCancel,
  onDismiss
}) {
  const { t } = useTranslation();
  const active = isActiveComfyUiDownloadTask(task);
  const Icon2 = getTaskIcon(task);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 py-3", "data-action-ui-id": "workflows-model-download-task", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { size: 16, strokeWidth: 1.5, className: "mt-0.5 shrink-0 text-muted-foreground" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-sm font-medium text-foreground", children: task.workflowTitle }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-xs text-muted-foreground", children: t(`chat.workflow.downloadStatus.${task.status}`) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 truncate text-xs text-muted-foreground", children: getTaskDetail(task, t) }),
      task.status === "downloading" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Progress, { value: task.percent ?? null, className: "h-1.5 flex-1" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-[11px] text-muted-foreground", children: formatProgress(task) })
      ] }) : null,
      task.status === "failed" && task.error ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 line-clamp-2 text-xs text-destructive", children: task.error }) : null
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-1", children: [
      active ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          type: "button",
          size: "xs",
          variant: "destructive",
          onClick: onCancel,
          "data-action-ui-id": "workflows-model-download-cancel",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleStop, {}),
            t("chat.workflow.downloadCancel")
          ]
        }
      ) : null,
      !active ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          type: "button",
          size: "icon-xs",
          variant: "ghost",
          "aria-label": t("common.close"),
          onClick: onDismiss,
          "data-action-ui-id": "workflows-model-download-dismiss",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, {})
        }
      ) : null
    ] })
  ] }) });
}
function getTaskIcon(task) {
  if (task.status === "failed") return CircleAlert;
  if (task.untrustedSourceModels.length) return CircleAlert;
  if (task.status === "verifying") return ShieldCheck;
  return Download;
}
function getTaskDetail(task, t) {
  if (task.status === "verifying") {
    return task.currentModel ? t("chat.workflow.verifyingModel", { name: task.currentModel }) : t("chat.workflow.downloadStatus.verifying");
  }
  if (task.currentModel) return task.currentModel;
  if (task.untrustedSourceModels.length) {
    return t("chat.workflow.unsupportedSources", {
      count: task.untrustedSourceModels.length
    });
  }
  if (task.missingSourceModels.length) {
    return t("chat.workflow.missingSources", { count: task.missingSourceModels.length });
  }
  return t(`chat.workflow.downloadStatus.${task.status}`);
}
function formatProgress(task) {
  return task.percent !== void 0 ? `${task.percent}% · ${formatBytes(task.downloadedBytes)}${task.totalBytes ? ` / ${formatBytes(task.totalBytes)}` : ""}` : formatBytes(task.downloadedBytes);
}
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
function isInstalledFeaturedWorkflow(workflow) {
  return workflow.source === "user" && "featuredWorkflow" in workflow;
}
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}
function asString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function asStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}
function asNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function asHttpsUrl(value) {
  const text = asString(value);
  if (!text) return void 0;
  try {
    return new URL(text).protocol === "https:" ? text : void 0;
  } catch {
    return void 0;
  }
}
const ATTRIBUTION_ROLES = /* @__PURE__ */ new Set([
  "workflow_curation",
  "workflow_reference",
  "base_model",
  "component_model",
  "model_packaging",
  "community_extension",
  "official_service"
]);
const ATTRIBUTION_SOURCE_KINDS = /* @__PURE__ */ new Set([
  "minimax_official",
  "hub_curated",
  "third_party"
]);
function mapAttributionLicense(value) {
  const record = asRecord(value);
  const id = asString(record?.id);
  const name = asString(record?.name);
  const revision = asString(record?.revision);
  const url = asHttpsUrl(record?.url);
  const notice = record?.notice === void 0 ? void 0 : asString(record.notice);
  const acceptanceRequired = record?.acceptanceRequired;
  const acceptanceText = record?.acceptanceText === void 0 ? void 0 : asString(record.acceptanceText);
  if (!id || !name || !revision || !url || typeof acceptanceRequired !== "boolean" || record?.notice !== void 0 && !notice || record?.acceptanceText !== void 0 && !acceptanceText || acceptanceRequired && !acceptanceText || !acceptanceRequired && acceptanceText) {
    return null;
  }
  return {
    id,
    name,
    revision,
    url,
    ...notice ? { notice } : {},
    acceptanceRequired,
    ...acceptanceText ? { acceptanceText } : {}
  };
}
function mapAttributions(value) {
  if (value === void 0) return [];
  if (!Array.isArray(value)) return null;
  const attributions = [];
  const ids = /* @__PURE__ */ new Set();
  for (const valueItem of value) {
    const item = asRecord(valueItem);
    const id = asString(item?.id);
    const role = item?.role;
    const sourceKind = item?.sourceKind;
    const name = asString(item?.name);
    const url = item?.url === void 0 ? void 0 : asHttpsUrl(item.url);
    const modified = item?.modified;
    const licenses = item?.licenses === void 0 ? [] : Array.isArray(item.licenses) ? item.licenses.map(mapAttributionLicense) : null;
    if (!id || ids.has(id) || !ATTRIBUTION_ROLES.has(role) || !ATTRIBUTION_SOURCE_KINDS.has(sourceKind) || !name || item?.url !== void 0 && !url || typeof modified !== "boolean" || !licenses || licenses.some((license) => license === null)) {
      return null;
    }
    ids.add(id);
    attributions.push({
      id,
      role,
      sourceKind,
      name,
      ...url ? { url } : {},
      modified,
      ...licenses.length ? { licenses } : {}
    });
  }
  return attributions;
}
function asPositiveSafeInteger(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : void 0;
}
function mapRecommendation(value) {
  const record = asRecord(value);
  const systemMemoryBytes = asPositiveSafeInteger(record?.systemMemoryBytes);
  const freeStorageBytes = asPositiveSafeInteger(record?.freeStorageBytes);
  if (systemMemoryBytes === void 0 || freeStorageBytes === void 0 || !Array.isArray(record?.platforms) || record.platforms.length === 0) {
    return null;
  }
  const operatingSystems = /* @__PURE__ */ new Set();
  const platforms = record.platforms.flatMap((item) => {
    const platform = asRecord(item);
    if (!platform) return [];
    const os = platform.os;
    if (os !== "darwin" && os !== "win32" && os !== "linux" || operatingSystems.has(os)) {
      return [];
    }
    if (!Array.isArray(platform.architectures) || platform.architectures.length === 0) return [];
    const architectures = platform.architectures.filter(
      (architecture) => architecture === "arm64" || architecture === "x64"
    );
    if (architectures.length !== platform.architectures.length || new Set(architectures).size !== architectures.length) {
      return [];
    }
    const gpu = asRecord(platform.gpu);
    if (!gpu) return [];
    const mode = gpu.mode;
    if (mode !== "any" && mode !== "dedicated" && mode !== "unified" && mode !== "not_required") {
      return [];
    }
    const minimumMemoryBytes = asPositiveSafeInteger(gpu.minimumMemoryBytes);
    const vendor = gpu.vendor;
    const validVendor = vendor === void 0 || vendor === "nvidia" || vendor === "amd" || vendor === "intel" || vendor === "apple";
    if (!validVendor || (mode === "dedicated" || mode === "unified") && minimumMemoryBytes === void 0 || (mode === "any" || mode === "not_required") && (gpu.minimumMemoryBytes !== void 0 || vendor !== void 0)) {
      return [];
    }
    const minVersion = asString(platform.minVersion);
    if (platform.minVersion !== void 0 && !minVersion) return [];
    if (minVersion && !/^\d+(?:\.\d+){0,3}$/.test(minVersion)) return [];
    operatingSystems.add(os);
    return [
      {
        os,
        architectures,
        ...minVersion ? { minVersion } : {},
        gpu: {
          mode,
          ...minimumMemoryBytes !== void 0 ? { minimumMemoryBytes } : {},
          ...vendor ? { vendor } : {}
        }
      }
    ];
  });
  return platforms.length === record.platforms.length ? { systemMemoryBytes, freeStorageBytes, platforms } : null;
}
function mapModelDependencies(value) {
  if (value === void 0) return [];
  if (!Array.isArray(value)) return null;
  const dependencies = [];
  for (const item of value) {
    const record = asRecord(item);
    const name = asString(record?.name);
    const directory = asString(record?.directory);
    if (!name || !directory) return null;
    dependencies.push({
      name,
      directory,
      ...asString(record?.url) ? { url: asString(record?.url) } : {},
      ...asString(record?.hash) ? { hash: asString(record?.hash) } : {},
      ...asString(record?.hash_type) ? { hash_type: asString(record?.hash_type) } : {}
    });
  }
  return dependencies;
}
function mapWorkflowItem(value, source) {
  const record = asRecord(value);
  if (!record) return null;
  const id = asString(record.id) ?? asString(record.name);
  const name = asString(record.name) ?? (source === "official" ? id : void 0);
  if (!id || !name) return null;
  const base = {
    id,
    name,
    ...asString(record.displayName) || asString(record.title) ? { displayName: asString(record.displayName) ?? asString(record.title) } : {},
    ...typeof record.shortDesc === "string" || typeof record.short_desc === "string" ? {
      shortDesc: typeof record.shortDesc === "string" ? record.shortDesc.trim() : record.short_desc.trim()
    } : {},
    tags: asStringArray(record.tags),
    ...asStringArray(record.tagIds).length || asStringArray(record.tag_ids).length ? {
      tagIds: asStringArray(record.tagIds).length ? asStringArray(record.tagIds) : asStringArray(record.tag_ids)
    } : {},
    ...asString(record.coverUrl) ? { coverUrl: asString(record.coverUrl) } : {},
    ...asString(record.author) ? { author: asString(record.author) } : {},
    ...(asNumber(record.nodeCount) ?? asNumber(record.node_count)) !== void 0 ? { nodeCount: asNumber(record.nodeCount) ?? asNumber(record.node_count) } : {},
    ...(asNumber(record.linkCount) ?? asNumber(record.link_count)) !== void 0 ? { linkCount: asNumber(record.linkCount) ?? asNumber(record.link_count) } : {},
    ...asStringArray(record.nodeTypes).length || asStringArray(record.node_types).length ? {
      nodeTypes: asStringArray(record.nodeTypes).length ? asStringArray(record.nodeTypes) : asStringArray(record.node_types)
    } : {},
    ...asStringArray(record.groups).length ? { groups: asStringArray(record.groups) } : {},
    ...asStringArray(record.models).length ? { models: asStringArray(record.models) } : {},
    ...(asNumber(record.fileSize) ?? asNumber(record.size_bytes)) !== void 0 ? { fileSize: asNumber(record.fileSize) ?? asNumber(record.size_bytes) } : {},
    ...(asNumber(record.updatedAt) ?? asNumber(record.modified_at)) !== void 0 ? { updatedAt: asNumber(record.updatedAt) ?? asNumber(record.modified_at) } : {}
  };
  if (source === "official") {
    const shortDesc = asString(record.shortDesc);
    const longDesc = asString(record.longDesc);
    const attributions = mapAttributions(record.attributions);
    if (!shortDesc || !longDesc) return null;
    const detailMediaUrl = asString(record.detailMediaUrl);
    if (record.detailMediaUrl !== void 0 && !detailMediaUrl) return null;
    const modelDependencies = mapModelDependencies(
      record.modelDependencies ?? record.model_dependencies
    );
    const recommendation = mapRecommendation(record.recommendation);
    if (modelDependencies === null || !recommendation || !attributions) return null;
    return {
      ...base,
      shortDesc,
      longDesc,
      ...attributions.length ? { attributions } : {},
      ...detailMediaUrl ? { detailMediaUrl } : {},
      source: "official",
      ...modelDependencies.length ? { modelDependencies } : {},
      recommendation,
      ...asString(record.downloadUrl) ? { downloadUrl: asString(record.downloadUrl) } : {},
      ...asString(record.hash) ? { hash: asString(record.hash) } : {},
      ...typeof record.installed === "boolean" ? { installed: record.installed } : {}
    };
  }
  const path = asString(record.path) ?? `${name}.json`;
  const featuredWorkflow = mapWorkflowItem(
    record.featuredWorkflow ?? record.featured_workflow,
    "official"
  );
  return path ? {
    ...base,
    source: "user",
    path,
    ...typeof record.agent_enabled === "boolean" ? { agentEnabled: record.agent_enabled } : {},
    ...featuredWorkflow?.source === "official" ? { featuredWorkflow } : {}
  } : null;
}
function mapComfyWorkflowListResponse(payload, source) {
  const record = asRecord(payload);
  const rawItems = record?.workflows;
  const workflows = Array.isArray(rawItems) ? rawItems.map((item) => mapWorkflowItem(item, source)).filter((item) => item !== null) : [];
  const total = typeof record?.total === "number" && Number.isFinite(record.total) ? record.total : workflows.length;
  return { workflows, total };
}
function workflowPresentation(workflow) {
  if (!isInstalledFeaturedWorkflow(workflow)) return workflow;
  return {
    ...workflow.featuredWorkflow,
    // Local display edits take precedence without changing the Featured snapshot.
    displayName: workflow.displayName ?? workflow.featuredWorkflow.displayName,
    shortDesc: workflow.shortDesc ?? workflow.featuredWorkflow.shortDesc
  };
}
function workflowDisplayName(workflow) {
  const presentation = workflowPresentation(workflow);
  return presentation.displayName?.trim() || presentation.name;
}
function workflowMatchesSearch(workflow, search) {
  const query = search.trim().toLocaleLowerCase();
  if (!query) return true;
  const presentation = workflowPresentation(workflow);
  return [
    workflow.name,
    presentation.displayName,
    presentation.shortDesc,
    presentation.longDesc,
    ...presentation.tags
  ].filter(Boolean).join(" ").toLocaleLowerCase().includes(query);
}
const comfyWorkflowsChanged = new EventTarget();
const COMFY_WORKFLOWS_CHANGED_EVENT = "changed";
const FEATURED_WORKFLOWS_STALE_TIME_MS = 6e4;
const WORKFLOW_STATUS_FETCH_OPTIONS = { cache: "no-store" };
function sortUserWorkflowsByUpdatedAt(workflows) {
  return workflows.map((workflow, index) => ({ workflow, index })).sort((left, right) => {
    const leftUpdatedAt = left.workflow.updatedAt ?? Number.NEGATIVE_INFINITY;
    const rightUpdatedAt = right.workflow.updatedAt ?? Number.NEGATIVE_INFINITY;
    return rightUpdatedAt - leftUpdatedAt || left.index - right.index;
  }).map(({ workflow }) => workflow);
}
function notifyComfyWorkflowsChanged() {
  comfyWorkflowsChanged.dispatchEvent(new Event(COMFY_WORKFLOWS_CHANGED_EVENT));
}
function reconcileFeaturedWorkflowInstallation(featuredWorkflows, userWorkflows) {
  const installedTemplateIds = new Set(
    userWorkflows.flatMap(
      (workflow) => isInstalledFeaturedWorkflow(workflow) ? [workflow.featuredWorkflow.id] : []
    )
  );
  return featuredWorkflows.map(
    (workflow) => workflow.source === "official" ? { ...workflow, installed: installedTemplateIds.has(workflow.id) } : workflow
  );
}
function useComfyWorkflows(source) {
  const gatewayReady = useGatewayReady();
  const { region, channel } = useRuntimeConfig();
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("zh") ? "zh" : "en";
  const [userWorkflows, setUserWorkflows] = reactExports.useState([]);
  const [userLoading, setUserLoading] = reactExports.useState(source === "mine");
  const [userError, setUserError] = reactExports.useState(null);
  const requestSequence = reactExports.useRef(0);
  const previousSource = reactExports.useRef(source);
  const featured = useQuery({
    queryKey: ["comfyui-featured-workflows", region, channel, locale],
    queryFn: async () => {
      const [featuredResponse, userResponse] = await Promise.all([
        gatewayFetch(API_PATHS.comfyUiFeaturedWorkflows(locale), WORKFLOW_STATUS_FETCH_OPTIONS),
        gatewayFetch(API_PATHS.comfyUiWorkflows, WORKFLOW_STATUS_FETCH_OPTIONS)
      ]);
      if (!featuredResponse.ok) throw new Error(`HTTP ${featuredResponse.status}`);
      if (!userResponse.ok) throw new Error(`HTTP ${userResponse.status}`);
      const featuredWorkflows = mapComfyWorkflowListResponse(
        await featuredResponse.json(),
        "official"
      );
      const localWorkflows = mapComfyWorkflowListResponse(await userResponse.json(), "mine");
      return {
        ...featuredWorkflows,
        workflows: reconcileFeaturedWorkflowInstallation(
          featuredWorkflows.workflows,
          localWorkflows.workflows
        )
      };
    },
    enabled: gatewayReady && source === "official",
    staleTime: FEATURED_WORKFLOWS_STALE_TIME_MS,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    retry: false
  });
  const loadUserWorkflows = reactExports.useCallback(async () => {
    const sequence = ++requestSequence.current;
    setUserLoading(true);
    setUserError(null);
    try {
      const response = await gatewayFetch(
        API_PATHS.comfyUiWorkflows,
        WORKFLOW_STATUS_FETCH_OPTIONS
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = mapComfyWorkflowListResponse(await response.json(), "mine");
      if (sequence === requestSequence.current) {
        setUserWorkflows(sortUserWorkflowsByUpdatedAt(result.workflows));
      }
    } catch (cause) {
      if (sequence !== requestSequence.current) return;
      setUserWorkflows([]);
      setUserError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (sequence === requestSequence.current) setUserLoading(false);
    }
  }, []);
  reactExports.useEffect(() => {
    if (source !== "mine") {
      requestSequence.current += 1;
      setUserLoading(false);
      setUserError(null);
      return;
    }
    void loadUserWorkflows();
  }, [loadUserWorkflows, source]);
  reactExports.useEffect(() => {
    const sourceChanged = previousSource.current !== source;
    previousSource.current = source;
    if (sourceChanged && source === "official" && gatewayReady) {
      void featured.refetch();
    }
  }, [featured.refetch, gatewayReady, source]);
  reactExports.useEffect(() => {
    const handleWorkflowsChanged = () => {
      if (source === "official") void featured.refetch();
      else void loadUserWorkflows();
    };
    comfyWorkflowsChanged.addEventListener(COMFY_WORKFLOWS_CHANGED_EVENT, handleWorkflowsChanged);
    return () => {
      comfyWorkflowsChanged.removeEventListener(
        COMFY_WORKFLOWS_CHANGED_EVENT,
        handleWorkflowsChanged
      );
    };
  }, [featured.refetch, loadUserWorkflows, source]);
  const retry = reactExports.useCallback(() => {
    if (source === "official") void featured.refetch();
    else void loadUserWorkflows();
  }, [featured.refetch, loadUserWorkflows, source]);
  if (source === "official") {
    return {
      workflows: featured.data?.workflows ?? [],
      loading: !gatewayReady || featured.isPending,
      error: featured.error instanceof Error ? featured.error.message : null,
      retry
    };
  }
  return {
    workflows: userWorkflows,
    loading: userLoading,
    error: userError,
    retry
  };
}
const MAX_WORKFLOW_NAME_LENGTH = 80;
const MAX_WORKFLOW_DESCRIPTION_LENGTH = 300;
function UserWorkflowListItem({
  workflow,
  onView,
  useAction,
  onUse,
  onDelete
}) {
  const { t } = useTranslation();
  const presentation = workflowPresentation(workflow);
  const [displayName, setDisplayName] = reactExports.useState(workflowDisplayName(workflow));
  const [shortDesc, setShortDesc] = reactExports.useState(presentation.shortDesc ?? "");
  const [draftName, setDraftName] = reactExports.useState(displayName);
  const [draftShortDesc, setDraftShortDesc] = reactExports.useState(shortDesc);
  const [editOpen, setEditOpen] = reactExports.useState(false);
  const [deleteOpen, setDeleteOpen] = reactExports.useState(false);
  const [deleting, setDeleting] = reactExports.useState(false);
  const [saving, setSaving] = reactExports.useState(false);
  const persistedName = workflowDisplayName(workflow);
  const persistedShortDesc = presentation.shortDesc ?? "";
  reactExports.useEffect(() => {
    setDisplayName(persistedName);
    setShortDesc(persistedShortDesc);
  }, [persistedName, persistedShortDesc]);
  const currentWorkflow = {
    ...workflow,
    displayName,
    shortDesc
  };
  const handleOpenEdit = () => {
    setDraftName(displayName);
    setDraftShortDesc(shortDesc);
    setEditOpen(true);
  };
  const handleSave = async () => {
    const nextName = draftName.trim();
    if (!nextName || saving) return;
    const nextShortDesc = draftShortDesc.trim();
    setSaving(true);
    try {
      const metadata = {
        displayName: nextName,
        shortDesc: nextShortDesc
      };
      const response = await gatewayFetch(API_PATHS.comfyUiWorkflowMetadata(workflow.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setDisplayName(nextName);
      setShortDesc(nextShortDesc);
      setEditOpen(false);
      notifyComfyWorkflowsChanged();
    } catch {
      dedupedToast.error(t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = () => {
    if (deleting) return;
    setDeleting(true);
    void onDelete(currentWorkflow).then(() => setDeleteOpen(false)).catch(() => void 0).finally(() => setDeleting(false));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-action-ui-id": "user-workflow-list-item",
        "data-workflow-id": workflow.id,
        "data-detail-enabled": onView ? "true" : void 0,
        className: `group flex min-h-[76px] items-center gap-3 rounded-lg border border-transparent bg-card px-4 py-3 ${onView ? "cursor-pointer transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm" : ""}`,
        onClick: onView ? () => onView(currentWorkflow) : void 0,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-sm font-medium text-foreground", children: displayName }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "button",
                  variant: "ghost",
                  size: "icon-sm",
                  className: "shrink-0 rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 group-focus-within:opacity-100",
                  "aria-label": t("workflows.edit"),
                  onClick: (event) => {
                    event.stopPropagation();
                    handleOpenEdit();
                  },
                  "data-action-ui-id": `workflows-edit-${workflow.id}`,
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(PencilIcon, { size: 14, strokeWidth: 1.5 })
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 truncate text-xs text-muted-foreground", children: shortDesc || t("workflows.description.empty") })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
              "data-action-ui-id": "user-workflow-actions",
              onClick: (event) => event.stopPropagation(),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "icon-sm",
                    className: "rounded-md text-muted-foreground hover:bg-brand-accent/10 hover:text-brand-accent",
                    "aria-label": t("workflows.delete"),
                    onClick: () => setDeleteOpen(true),
                    "data-action-ui-id": `workflows-delete-${workflow.id}`,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: Trash2, size: "sm", "aria-hidden": true })
                  }
                ),
                useAction ?? (onUse ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Button,
                  {
                    type: "button",
                    size: "sm",
                    className: "h-7 rounded-md px-2.5 text-xs font-medium",
                    onClick: onUse,
                    "data-action-ui-id": `workflows-use-${workflow.id}`,
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: PanelsTopLeft, size: "sm", "aria-hidden": true }),
                      t("workflows.use")
                    ]
                  }
                ) : null)
              ]
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: editOpen, onOpenChange: (open) => !saving && setEditOpen(open), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { size: "md", "data-action-ui-id": "workflows-edit-dialog", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "text-base", children: t("workflows.edit.title") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: t("workflows.edit.description") })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 py-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "label",
          {
            htmlFor: "workflow-edit-name",
            className: "grid gap-1.5 text-xs font-medium text-foreground",
            children: [
              t("workflows.edit.nameLabel"),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  id: "workflow-edit-name",
                  value: draftName,
                  disabled: saving,
                  maxLength: MAX_WORKFLOW_NAME_LENGTH,
                  onChange: (event) => setDraftName(event.target.value),
                  "data-action-ui-id": "workflows-edit-name"
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "label",
          {
            htmlFor: "workflow-edit-summary",
            className: "grid gap-1.5 text-xs font-medium text-foreground",
            children: [
              t("workflows.edit.summaryLabel"),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Textarea,
                {
                  id: "workflow-edit-summary",
                  value: draftShortDesc,
                  disabled: saving,
                  maxLength: MAX_WORKFLOW_DESCRIPTION_LENGTH,
                  rows: 4,
                  placeholder: t("workflows.edit.summaryPlaceholder"),
                  className: "placeholder:text-foreground/30",
                  onChange: (event) => setDraftShortDesc(event.target.value),
                  "data-action-ui-id": "workflows-edit-summary"
                }
              )
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            variant: "outline",
            disabled: saving,
            onClick: () => setEditOpen(false),
            children: t("common.cancel")
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            disabled: !draftName.trim() || saving,
            loading: saving,
            onClick: handleSave,
            "data-action-ui-id": "workflows-edit-save",
            children: t("common.save")
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialog, { open: deleteOpen, onOpenChange: setDeleteOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      AlertDialogContent,
      {
        size: "sm",
        className: "min-w-0",
        "data-action-ui-id": "workflows-delete-dialog",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { className: "min-w-0 max-w-full", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTitle, { children: t("workflows.delete.title") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogDescription, { className: "min-w-0 max-w-full break-words [overflow-wrap:anywhere]", children: t("workflows.delete.description", { name: displayName }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { className: "min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { disabled: deleting, children: t("common.cancel") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              AlertDialogAction,
              {
                variant: "destructive",
                loading: deleting,
                onClick: handleDelete,
                "data-action-ui-id": `workflows-delete-confirm-${workflow.id}`,
                children: t("workflows.delete.confirm")
              }
            )
          ] })
        ]
      }
    ) })
  ] });
}
function formatFileSize$1(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function workflowCardMetadata(workflow, labels, locale) {
  const items = [];
  if (workflow.nodeCount !== void 0) {
    items.push({ key: "nodes", text: `${workflow.nodeCount} ${labels.nodes}` });
  }
  if (workflow.linkCount !== void 0) {
    items.push({ key: "links", text: `${workflow.linkCount} ${labels.links}` });
  }
  if (workflow.nodeTypes?.length) {
    items.push({
      key: "node-types",
      text: `${workflow.nodeTypes.length} ${labels.nodeTypes}`,
      title: workflow.nodeTypes.join(", ")
    });
  }
  if (workflow.groups?.length) {
    items.push({
      key: "groups",
      text: `${workflow.groups.length} ${labels.groups}`,
      title: workflow.groups.join(", ")
    });
  }
  if (workflow.models?.length) {
    items.push({
      key: "models",
      text: `${workflow.models.length} ${labels.models}`,
      title: workflow.models.join(", ")
    });
  }
  if (workflow.fileSize !== void 0) {
    items.push({ key: "size", text: `${labels.size} ${formatFileSize$1(workflow.fileSize)}` });
  }
  if (workflow.updatedAt !== void 0) {
    items.push({
      key: "updated",
      text: `${labels.updated} ${new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
        workflow.updatedAt
      )}`
    });
  }
  return items;
}
function findLatestVisibleWorkflowDownloadTask(tasks, workflowId) {
  return [...tasks].reverse().find(
    (task) => task.workflowId === workflowId && task.status !== "cancelled" && task.status !== "failed"
  );
}
function isWorkflowModelPreparationComplete(task) {
  return task.status === "completed" && countUnavailableComfyUiModels(task) === 0;
}
function isWorkflowPendingModelPreparation(workflow, tasks) {
  if (!isInstalledFeaturedWorkflow(workflow)) return false;
  const task = [...tasks].reverse().find(
    (candidate) => !candidate.hidden && (candidate.workflowId === workflow.id || candidate.workflowId === workflow.featuredWorkflow.id)
  );
  return task !== void 0 && !isWorkflowModelPreparationComplete(task);
}
function isActiveWorkflowDownloadTask(task) {
  return task.status === "queued" || task.status === "verifying" || task.status === "downloading";
}
function comfyUiLicenseKey(license) {
  return JSON.stringify([license.id, license.revision, license.url]);
}
const LICENSE_POPOVER_CLOSE_DELAY_MS = 120;
function AttributionLicenseControl({
  attributionId,
  licenses,
  onInteractionEnter,
  onInteractionLeave,
  onOpenExternal
}) {
  const { t } = useTranslation();
  const hasLicenses = licenses.length > 0;
  const licenseTriggerRef = reactExports.useRef(null);
  const licenseCloseTimerRef = reactExports.useRef(null);
  const [licenseDetailsOpen, setLicenseDetailsOpen] = reactExports.useState(false);
  const clearLicenseCloseTimer = () => {
    if (licenseCloseTimerRef.current) {
      clearTimeout(licenseCloseTimerRef.current);
      licenseCloseTimerRef.current = null;
    }
  };
  const handleLicenseDetailsEnter = () => {
    clearLicenseCloseTimer();
    setLicenseDetailsOpen(true);
    onInteractionEnter?.();
  };
  const handleLicenseDetailsLeave = () => {
    clearLicenseCloseTimer();
    licenseCloseTimerRef.current = setTimeout(() => {
      setLicenseDetailsOpen(false);
      licenseCloseTimerRef.current = null;
    }, LICENSE_POPOVER_CLOSE_DELAY_MS);
    onInteractionLeave?.();
  };
  reactExports.useEffect(
    () => () => {
      if (licenseCloseTimerRef.current) clearTimeout(licenseCloseTimerRef.current);
    },
    []
  );
  if (!hasLicenses) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      className: "flex shrink-0 items-center gap-1",
      "data-action-ui-id": `workflows-attribution-license-entry-${attributionId}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": "true", className: "text-[11px] font-normal text-muted-foreground", children: "·" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { open: licenseDetailsOpen, onOpenChange: setLicenseDetailsOpen, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              ref: licenseTriggerRef,
              type: "button",
              variant: "ghost",
              className: "-my-1 h-auto shrink-0 rounded-md border-0 px-1.5 py-1 text-[11px] font-normal text-muted-foreground hover:bg-foreground/5 hover:text-muted-foreground hover:underline disabled:cursor-default disabled:opacity-100",
              "aria-label": t("workflows.attribution.licenseAgreement"),
              "aria-expanded": licenseDetailsOpen,
              "aria-haspopup": "dialog",
              onMouseEnter: handleLicenseDetailsEnter,
              onMouseLeave: handleLicenseDetailsLeave,
              onFocus: handleLicenseDetailsEnter,
              onBlur: handleLicenseDetailsLeave,
              onClick: handleLicenseDetailsEnter,
              "data-action-ui-id": `workflows-attribution-license-trigger-${attributionId}`,
              children: t("workflows.attribution.licenseAgreement")
            }
          ),
          licenseDetailsOpen ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
            PopoverContent,
            {
              anchor: licenseTriggerRef,
              side: "top",
              align: "start",
              sideOffset: 6,
              initialFocus: false,
              finalFocus: false,
              className: "relative w-80 max-w-[calc(100vw-2rem)] gap-0 p-1",
              "data-action-ui-id": "workflows-attribution-license-details",
              onMouseEnter: handleLicenseDetailsEnter,
              onMouseLeave: handleLicenseDetailsLeave,
              onFocusCapture: handleLicenseDetailsEnter,
              onBlurCapture: handleLicenseDetailsLeave,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    "aria-hidden": "true",
                    className: "absolute inset-x-0 top-full h-1.5",
                    "data-action-ui-id": "workflows-attribution-license-hover-bridge"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTitle, { className: "px-2 py-1.5", children: t("workflows.attribution.licenses") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-72 space-y-0.5 overflow-y-auto", children: licenses.map((license) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Button,
                  {
                    type: "button",
                    variant: "ghost",
                    className: "h-auto w-full items-start justify-start gap-2 rounded-sm border-0 px-2 py-2.5 text-left whitespace-normal hover:bg-popup-item-hover",
                    "aria-label": t("workflows.attribution.viewNamedLicense", {
                      name: license.name
                    }),
                    onClick: () => {
                      onOpenExternal(license.url, `workflows.license.${license.id}`);
                      setLicenseDetailsOpen(false);
                    },
                    "data-action-ui-id": `workflows-attribution-license-${license.id}`,
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium text-foreground", children: license.name }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 line-clamp-3 break-words text-[11px] leading-4 text-muted-foreground", children: license.notice ?? t("workflows.attribution.noLicenseNotice") })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Icon,
                        {
                          icon: ExternalLink,
                          size: "sm",
                          strokeWidth: 1.5,
                          className: "mt-0.5 shrink-0 text-muted-foreground",
                          "aria-hidden": true
                        }
                      )
                    ]
                  },
                  comfyUiLicenseKey(license)
                )) })
              ]
            }
          ) : null
        ] })
      ]
    }
  );
}
const ATTRIBUTION_POPOVER_CLOSE_DELAY_MS = 160;
function WorkflowCardAttributionPopover({
  attributions,
  workflowId
}) {
  const { t } = useTranslation();
  const platform = usePlatform();
  const triggerRef = reactExports.useRef(null);
  const closeTimerRef = reactExports.useRef(null);
  const [open, setOpen] = reactExports.useState(false);
  const clearCloseTimer = () => {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };
  const handleEnter = () => {
    clearCloseTimer();
    setOpen(true);
  };
  const handleLeave = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, ATTRIBUTION_POPOVER_CLOSE_DELAY_MS);
  };
  reactExports.useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    []
  );
  const disclaimer = t("workflows.attribution.communityAdapted");
  const handleOpenLicense = (url, source) => {
    void openExternalUrl(platform, url, { source });
    setOpen(false);
  };
  if (attributions.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-auto min-w-0 pt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "p",
      {
        className: "w-fit max-w-full truncate text-xs leading-4 text-muted-foreground",
        "data-action-ui-id": `workflows-card-attribution-disclaimer-${workflowId}`,
        children: disclaimer
      }
    ) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative z-20 mt-auto min-w-0 pt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        ref: triggerRef,
        type: "button",
        variant: "ghost",
        className: "-ml-1.5 h-auto max-w-full min-w-0 justify-start rounded-md border-0 bg-transparent px-1.5 py-1 text-xs leading-4 font-normal text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
        "aria-label": disclaimer,
        "aria-expanded": open,
        "aria-haspopup": "dialog",
        onMouseEnter: handleEnter,
        onMouseLeave: handleLeave,
        onFocus: handleEnter,
        onBlur: handleLeave,
        onClick: handleEnter,
        "data-action-ui-id": `workflows-card-attribution-disclaimer-${workflowId}`,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: disclaimer })
      }
    ),
    open ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      PopoverContent,
      {
        anchor: triggerRef,
        side: "bottom",
        align: "start",
        sideOffset: 6,
        initialFocus: false,
        finalFocus: false,
        className: "relative w-80 max-w-[calc(100vw-2rem)] gap-2 p-2.5",
        onMouseEnter: handleEnter,
        onMouseLeave: handleLeave,
        onFocusCapture: handleEnter,
        onBlurCapture: handleLeave,
        "data-action-ui-id": `workflows-card-attributions-${workflowId}`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": "true", className: "absolute inset-x-0 bottom-full h-1.5" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTitle, { className: "px-1 py-0.5 text-xs", children: t("workflows.attribution.title") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-44 min-w-0 overflow-y-auto rounded-lg bg-muted", children: attributions.map((attribution) => {
            const metadata = [
              t(`workflows.attribution.sourceKind.${attribution.sourceKind}`),
              t(`workflows.attribution.role.${attribution.role}`),
              ...attribution.modified ? [t("workflows.attribution.modified")] : []
            ].join(" · ");
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "min-w-0 px-3 py-3", children: [
              attribution.url ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "button",
                  variant: "ghost",
                  className: "-ml-1 h-auto max-w-full min-w-0 shrink justify-start rounded-sm border-0 px-1 py-0 text-xs font-medium text-foreground hover:bg-foreground/5 hover:underline",
                  "aria-label": t("workflows.attribution.viewNamedSource", {
                    name: attribution.name
                  }),
                  onClick: () => {
                    if (!attribution.url) return;
                    void openExternalUrl(platform, attribution.url, {
                      source: `workflows.card.attribution.${attribution.id}`
                    });
                    setOpen(false);
                  },
                  "data-action-ui-id": `workflows-card-attribution-source-${attribution.id}`,
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: attribution.name })
                }
              ) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-xs font-medium text-foreground", children: attribution.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex min-w-0 items-center gap-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "min-w-0 truncate text-[11px] text-muted-foreground", children: metadata }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  AttributionLicenseControl,
                  {
                    attributionId: attribution.id,
                    licenses: attribution.licenses ?? [],
                    onInteractionEnter: handleEnter,
                    onInteractionLeave: handleLeave,
                    onOpenExternal: handleOpenLicense
                  }
                )
              ] })
            ] }, attribution.id);
          }) })
        ]
      }
    ) : null
  ] }) });
}
const WORKFLOW_VIDEO_URL_PATTERN = /\.(?:mp4|webm|mov|m4v)(?:[?#]|$)/i;
function isWorkflowVideoUrl(url) {
  return WORKFLOW_VIDEO_URL_PATTERN.test(url);
}
function WorkflowCoverMedia({ url }) {
  if (isWorkflowVideoUrl(url)) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "video",
      {
        src: url,
        autoPlay: true,
        muted: true,
        loop: true,
        playsInline: true,
        preload: "metadata",
        draggable: false,
        className: "size-full object-cover",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("track", { kind: "captions" })
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "img",
    {
      src: url,
      alt: "",
      loading: "lazy",
      decoding: "async",
      draggable: false,
      className: "size-full object-cover"
    }
  );
}
function WorkflowCard({
  workflow,
  metadataLabels,
  locale,
  downloadLabel,
  onDownload,
  viewLabel,
  onView,
  viewDisabled = false,
  downloadDisabled = false,
  fixedLayout = false,
  prepareLabel,
  onPrepare,
  prepareDisabled = false,
  addLabel,
  onAdd,
  addDisabled = false,
  layout = "grid",
  selected = false,
  completedAction
}) {
  const { t } = useTranslation();
  const { tasks: downloadTasks } = useComfyUiDownloadProgress();
  const metadata = workflow.source === "user" ? workflowCardMetadata(workflow, metadataLabels, locale) : [];
  const presentation = workflowPresentation(workflow);
  const displayName = workflowDisplayName(workflow);
  const shortDesc = presentation.shortDesc;
  const attributions = presentation.source === "official" ? presentation.attributions ?? [] : [];
  const railLayout = layout === "rail";
  const downloadTask = findLatestVisibleWorkflowDownloadTask(downloadTasks, presentation.id);
  const downloadInProgress = Boolean(downloadTask && isActiveWorkflowDownloadTask(downloadTask));
  const workflowReadyToUse = workflow.source === "user" || workflow.installed === true && !downloadInProgress;
  const workflowDownloaded = workflow.source === "official" && workflow.installed === true && !downloadInProgress;
  const showCompletedAction = Boolean(completedAction && workflowReadyToUse);
  const showCardActions = Boolean(!railLayout && (onView || onDownload || showCompletedAction));
  const showDownloadProgress = Boolean(downloadInProgress && onDownload);
  const cardChrome = railLayout ? `border border-transparent transition-[border-color,background-color,box-shadow] duration-200 ease-out hover:z-10 hover:border-foreground/15 focus-within:z-10 focus-within:border-ring ${selected ? "!border-[var(--workflow-selected-border)] bg-muted/30 shadow-[var(--workflow-selected-shadow)]" : ""}` : "transition-shadow duration-200 ease-out hover:z-10 hover:ring-[0.5px] hover:ring-inset hover:ring-border-strong focus-within:z-10 focus-within:ring-[0.5px] focus-within:ring-inset focus-within:ring-border-strong";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "article",
    {
      "aria-current": selected ? "true" : void 0,
      className: `group relative flex cursor-pointer flex-col overflow-hidden rounded-lg bg-card ${cardChrome} ${fixedLayout ? "h-full" : ""}`,
      children: [
        onView ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "absolute inset-0 z-10 rounded-lg focus-visible:outline-none",
            "aria-label": viewLabel ? `${viewLabel}: ${displayName}` : displayName,
            "aria-pressed": selected,
            onClick: onView,
            disabled: viewDisabled,
            "data-action-ui-id": `workflows-view-${workflow.id}`
          }
        ) : null,
        !railLayout ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative aspect-video w-full shrink-0 items-center justify-center bg-muted", children: [
          presentation.coverUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(WorkflowCoverMedia, { url: presentation.coverUrl }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-full items-center justify-center text-xs text-muted-foreground", children: "ComfyUI" }),
          showCardActions ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: `pointer-events-none absolute inset-x-0 bottom-0 z-20 flex gap-3 p-3 transition-[opacity,transform] duration-200 ease-out motion-reduce:translate-y-0 ${showDownloadProgress ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100"}`,
              children: showDownloadProgress && downloadTask ? /* @__PURE__ */ jsxRuntimeExports.jsx(WorkflowCardDownloadProgress, { workflowId: workflow.id, task: downloadTask }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                onView ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Button,
                  {
                    type: "button",
                    size: "lg",
                    variant: "ghost",
                    className: "h-9 min-w-0 flex-1 rounded-full border-0 bg-black/50 px-3 text-[13px] font-normal whitespace-nowrap text-white shadow-none backdrop-blur-md transition-colors hover:bg-black/70 hover:text-white",
                    onClick: onView,
                    disabled: viewDisabled,
                    "data-action-ui-id": `workflows-card-detail-${workflow.id}`,
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { size: 14, strokeWidth: 1.75 }),
                      viewLabel ?? t("workflows.view")
                    ]
                  }
                ) : null,
                showCompletedAction ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: "min-w-0 flex-1 [&_[data-slot=dropdown-menu-trigger]]:!h-9 [&_[data-slot=dropdown-menu-trigger]]:!w-full [&_[data-slot=dropdown-menu-trigger]]:!rounded-full [&_[data-slot=dropdown-menu-trigger]]:!text-[13px] [&_[data-slot=dropdown-menu-trigger]]:!font-normal [&_[data-slot=dropdown-menu-trigger]_svg]:[stroke-width:1.75]",
                    "data-action-ui-id": "workflows-card-completed-action",
                    children: completedAction
                  }
                ) : downloadLabel && onDownload ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Button,
                  {
                    type: "button",
                    size: "lg",
                    variant: "ghost",
                    className: "h-9 min-w-0 flex-1 rounded-full border-0 bg-brand-accent px-3 text-[13px] font-normal whitespace-nowrap text-brand-accent-foreground shadow-none transition-opacity hover:bg-brand-accent hover:text-brand-accent-foreground hover:opacity-90",
                    onClick: onDownload,
                    disabled: downloadDisabled,
                    "data-action-ui-id": `workflows-download-${workflow.id}`,
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 14, strokeWidth: 1.75 }),
                      downloadLabel
                    ]
                  }
                ) : null
              ] })
            }
          ) : null
        ] }) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: `relative flex min-h-0 min-w-0 flex-1 flex-col gap-2 ${railLayout ? "p-5" : "p-4"}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "min-w-0 truncate text-base font-medium text-card-foreground", children: displayName }),
                workflowDownloaded ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: "inline-flex h-5 shrink-0 items-center rounded-sm bg-muted px-1.5 text-[10px] font-medium text-foreground",
                    "data-action-ui-id": `workflows-downloaded-${workflow.id}`,
                    children: t("workflows.downloaded")
                  }
                ) : null
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "line-clamp-2 text-sm text-muted-foreground", children: shortDesc || "—" }),
              presentation.source === "official" && !railLayout ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                WorkflowCardAttributionPopover,
                {
                  attributions,
                  workflowId: presentation.id
                }
              ) : null,
              workflow.source === "user" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-2", children: metadata.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  title: item.title,
                  className: "max-w-full truncate text-xs text-muted-foreground",
                  children: item.text
                },
                item.key
              )) }) : null,
              onPrepare || onAdd ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  className: `relative z-20 mt-auto grid h-8 shrink-0 gap-2 ${onPrepare && onAdd ? "grid-cols-2" : "grid-cols-1"}`,
                  children: [
                    onPrepare && prepareLabel ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      Button,
                      {
                        type: "button",
                        size: "sm",
                        variant: "ghost",
                        className: "border-0 hover:bg-brand-accent hover:text-brand-accent-foreground",
                        onClick: onPrepare,
                        disabled: prepareDisabled,
                        "data-action-ui-id": `workflows-prepare-${workflow.id}`,
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 14, strokeWidth: 1.5 }),
                          prepareLabel
                        ]
                      }
                    ) : null,
                    onAdd && addLabel ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      Button,
                      {
                        type: "button",
                        size: "sm",
                        variant: "ghost",
                        className: "border-0 hover:bg-brand-accent hover:text-brand-accent-foreground",
                        onClick: onAdd,
                        disabled: addDisabled,
                        "data-action-ui-id": `workflows-add-${workflow.id}`,
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(PanelsTopLeft, { size: 14, strokeWidth: 1.5 }),
                          addLabel
                        ]
                      }
                    ) : null
                  ]
                }
              ) : null
            ]
          }
        )
      ]
    }
  );
}
function WorkflowCardDownloadProgress({
  workflowId,
  task
}) {
  const { t } = useTranslation();
  const progress = task.status === "completed" ? 100 : task.percent ?? null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "w-full rounded-sm border border-border bg-background/90 px-3 py-2 shadow-sm backdrop-blur-sm",
      role: "status",
      "aria-live": "polite",
      "data-action-ui-id": `workflows-download-progress-${workflowId}`,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Progress,
        {
          value: progress,
          className: "gap-1.5 [&_[data-slot=progress-indicator]]:bg-foreground",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex w-full items-center justify-between gap-3 text-[11px] font-medium text-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: t(`chat.workflow.downloadStatus.${task.status}`) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 tabular-nums", children: progress === null ? "—" : `${Math.round(progress)}%` })
          ] })
        }
      )
    }
  );
}
function WorkflowDetailRail({ ariaLabel, children }) {
  const scrollRef = reactExports.useRef(null);
  const isScrolling = useIsScrolling({ scrollRef });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "aside",
    {
      ref: scrollRef,
      "data-scrolling": isScrolling ? "true" : void 0,
      className: "scrollbar-fade scrollbar-fade-compact mr-0.5 min-h-0 overflow-y-auto pr-4 pl-2 [scrollbar-gutter:stable]",
      "aria-label": ariaLabel,
      "data-action-ui-id": "workflows-detail-rail",
      children
    }
  );
}
const WORKFLOW_TAG_TRANSLATION_KEYS = {
  api: "workflows.tags.api",
  image: "workflows.tags.image",
  "image to video": "workflows.tags.imageToVideo",
  "first / last frame": "workflows.tags.firstLastFrame",
  local: "workflows.tags.local",
  portrait: "workflows.tags.portrait",
  product: "workflows.tags.product",
  "reference to video": "workflows.tags.referenceToVideo",
  "text to image": "workflows.tags.textToImage",
  "text to video": "workflows.tags.textToVideo",
  video: "workflows.tags.video"
};
function workflowTagLabel(tag, t) {
  const translationKey = WORKFLOW_TAG_TRANSLATION_KEYS[tag.trim().toLocaleLowerCase()];
  return translationKey ? t(translationKey) : tag;
}
function WorkflowAttributionSection({ attributions }) {
  const { t } = useTranslation();
  const platform = usePlatform();
  const handleOpenExternal = (url, source) => {
    void openExternalUrl(platform, url, { source });
  };
  if (attributions.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "min-w-0", "data-action-ui-id": "workflows-detail-attributions", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "mb-3 flex min-h-9 items-center",
        "data-action-ui-id": "workflows-detail-attribution-heading",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xs font-medium text-foreground", children: t("workflows.attribution.title") })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "min-w-0 overflow-hidden rounded-lg bg-muted",
        "data-action-ui-id": "workflows-detail-attribution-list",
        children: attributions.map((attribution) => {
          const metadata = [
            t(`workflows.attribution.sourceKind.${attribution.sourceKind}`),
            t(`workflows.attribution.role.${attribution.role}`),
            ...attribution.modified ? [t("workflows.attribution.modified")] : []
          ].join(" · ");
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "min-w-0 px-3 py-3", children: [
            attribution.url ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                type: "button",
                variant: "ghost",
                className: "-ml-1 h-auto max-w-full min-w-0 shrink justify-start rounded-sm border-0 px-1 py-0 text-xs font-medium text-foreground hover:bg-foreground/5 hover:underline",
                "aria-label": t("workflows.attribution.viewNamedSource", {
                  name: attribution.name
                }),
                onClick: () => {
                  if (attribution.url) {
                    handleOpenExternal(
                      attribution.url,
                      `workflows.attribution.${attribution.id}`
                    );
                  }
                },
                "data-action-ui-id": `workflows-attribution-source-${attribution.id}`,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: attribution.name })
              }
            ) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-xs font-medium text-foreground", children: attribution.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex min-w-0 items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "min-w-0 truncate text-[11px] text-muted-foreground", children: metadata }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                AttributionLicenseControl,
                {
                  attributionId: attribution.id,
                  licenses: attribution.licenses ?? [],
                  onOpenExternal: handleOpenExternal
                }
              )
            ] })
          ] }, attribution.id);
        })
      }
    )
  ] });
}
function WorkflowDetailMedia({ mediaUrl }) {
  const sourceKey = mediaUrl;
  const [failedSourceKey, setFailedSourceKey] = reactExports.useState();
  if (failedSourceKey !== sourceKey) {
    if (isWorkflowVideoUrl(mediaUrl)) {
      return (
        // Configured demos do not currently carry a separate WebVTT resource.
        // biome-ignore lint/a11y/useMediaCaption: media captions are not part of the catalog contract
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "video",
          {
            src: mediaUrl,
            className: "size-full object-contain",
            controls: true,
            playsInline: true,
            preload: "metadata",
            onError: () => setFailedSourceKey(sourceKey),
            "data-action-ui-id": "workflows-detail-media-video"
          }
        )
      );
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "img",
      {
        src: mediaUrl,
        alt: "",
        className: "size-full object-cover",
        loading: "lazy",
        onError: () => setFailedSourceKey(sourceKey),
        "data-action-ui-id": "workflows-detail-media-image"
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-3 text-muted-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "size-8", strokeWidth: 1.25 }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm", children: "ComfyUI" })
  ] });
}
const BYTE_UNIT = 1024;
const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"];
const DOWNLOAD_PROGRESS_INTERVAL_MS = 120;
const DOWNLOAD_PROGRESS_STEP = 2;
function calculateFileProgress(overallProgress, fileIndex, fileCount) {
  if (fileCount <= 1) return overallProgress;
  const workflowFileShare = 5;
  if (fileIndex === 0) return Math.min(100, overallProgress * (100 / workflowFileShare));
  const dependencyShare = (100 - workflowFileShare) / (fileCount - 1);
  const dependencyStart = workflowFileShare + (fileIndex - 1) * dependencyShare;
  return Math.min(100, Math.max(0, (overallProgress - dependencyStart) / dependencyShare * 100));
}
function liveDownloadPhase(task) {
  return task.status === "completed" ? "complete" : "downloading";
}
function calculateLiveFileProgress(task, fileName, fileIndex) {
  if (fileIndex === 0) return 100;
  if (task.downloadedModels.includes(fileName) || task.skippedModels.includes(fileName)) return 100;
  if (isComfyUiModelUnavailable(task, fileName)) return 0;
  if (task.status === "completed") return 100;
  if (task.currentModel === fileName && task.status === "downloading") {
    return task.percent ?? null;
  }
  return 0;
}
function formatFileSize(bytes, locale) {
  if (bytes === void 0 || bytes <= 0) return "—";
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(BYTE_UNIT)),
    FILE_SIZE_UNITS.length - 1
  );
  const value = bytes / BYTE_UNIT ** unitIndex;
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: value >= 10 ? 0 : 1
  }).format(value)} ${FILE_SIZE_UNITS[unitIndex]}`;
}
function WorkflowDetailView({
  workflow,
  onBack,
  hideHeader = false,
  downloadAvailable = false,
  onDownload,
  embedded = false,
  completedAction
}) {
  const { t, i18n } = useTranslation();
  const { tasks: downloadTasks, cancelTask } = useComfyUiDownloadProgress();
  const canDownload = downloadAvailable || Boolean(onDownload);
  const [downloadPhase, setDownloadPhase] = reactExports.useState(
    canDownload ? "idle" : "complete"
  );
  const [downloadProgress, setDownloadProgress] = reactExports.useState(canDownload ? 0 : 100);
  const detailScrollRef = reactExports.useRef(null);
  const detailIsScrolling = useIsScrolling({ scrollRef: detailScrollRef });
  const presentationWorkflow = workflowPresentation(workflow);
  const featuredWorkflow = presentationWorkflow.source === "official" ? presentationWorkflow : void 0;
  const dependencies = featuredWorkflow?.modelDependencies ?? [];
  const attributions = featuredWorkflow?.attributions ?? [];
  const detailMediaUrl = presentationWorkflow.detailMediaUrl;
  const detailHeroLayout = detailMediaUrl ? embedded ? "grid items-stretch gap-6 @min-[48rem]/workflow-detail:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.2fr)]" : "grid items-stretch gap-8 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]" : "";
  const detailHeroMinHeight = detailMediaUrl ? embedded ? "min-h-0 @min-[48rem]/workflow-detail:min-h-80" : "min-h-80" : "";
  const liveDownloadTask = findLatestVisibleWorkflowDownloadTask(
    downloadTasks,
    presentationWorkflow.id
  );
  const effectiveDownloadPhase = liveDownloadTask ? liveDownloadPhase(liveDownloadTask) : downloadPhase;
  const effectiveDownloadProgress = liveDownloadTask ? liveDownloadTask.status === "completed" ? 100 : liveDownloadTask.percent ?? null : downloadProgress;
  const workflowReadyToUse = workflow.source === "user" || workflow.installed === true || liveDownloadTask?.status === "completed" || canDownload && effectiveDownloadPhase === "complete";
  const formattedPackageSize = formatFileSize(presentationWorkflow.fileSize, i18n.language);
  const packageSize = workflow.source === "official" && formattedPackageSize !== "—" ? t("workflows.detail.approximateSize", { size: formattedPackageSize }) : formattedPackageSize;
  const resourceFiles = [
    {
      key: `${workflow.name}.json`,
      name: `${workflow.name}.json`,
      directory: t("workflows.detail.workflowFile"),
      icon: Layers
    },
    ...dependencies.map((dependency) => ({
      key: `${dependency.directory}/${dependency.name}`,
      name: dependency.name,
      directory: dependency.directory,
      icon: Package
    }))
  ];
  reactExports.useEffect(() => {
    setDownloadPhase(canDownload ? "idle" : "complete");
    setDownloadProgress(canDownload ? 0 : 100);
  }, [canDownload]);
  reactExports.useEffect(() => {
    if (liveDownloadTask || downloadPhase !== "downloading") return;
    const intervalId = window.setInterval(() => {
      setDownloadProgress(
        (currentProgress) => Math.min(100, currentProgress + DOWNLOAD_PROGRESS_STEP)
      );
    }, DOWNLOAD_PROGRESS_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [downloadPhase, liveDownloadTask]);
  reactExports.useEffect(() => {
    if (!liveDownloadTask && downloadProgress >= 100 && downloadPhase === "downloading") {
      setDownloadPhase("complete");
    }
  }, [downloadPhase, downloadProgress, liveDownloadTask]);
  const handleStartDownload = () => {
    if (!downloadAvailable && onDownload) {
      onDownload();
      return;
    }
    setDownloadProgress(0);
    setDownloadPhase("downloading");
  };
  const handleToggleDownload = () => {
    setDownloadPhase((currentPhase) => currentPhase === "paused" ? "downloading" : "paused");
  };
  const handleCancelDownload = () => {
    if (liveDownloadTask && isActiveWorkflowDownloadTask(liveDownloadTask)) {
      cancelTask(liveDownloadTask.id);
      return;
    }
    setDownloadProgress(0);
    setDownloadPhase("idle");
  };
  const RootElement = embedded ? "section" : "main";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    RootElement,
    {
      className: "@container/workflow-detail relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background",
      "data-action-ui-id": "workflows-detail",
      children: [
        !embedded && !hideHeader ? /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "shrink-0 border-b border-border px-8 py-4 lg:px-16", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            type: "button",
            variant: "ghost",
            size: "sm",
            className: "-ml-2 border-0 hover:bg-brand-accent/10 hover:text-brand-accent",
            onClick: onBack,
            "data-action-ui-id": "workflows-detail-back",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { size: 14, strokeWidth: 1.5 }),
              t("workflows.detail.back")
            ]
          }
        ) }) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            ref: detailScrollRef,
            "data-scrolling": detailIsScrolling ? "true" : void 0,
            "data-action-ui-id": "workflows-detail-scroll",
            className: `scrollbar-fade scrollbar-fade-compact min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable] ${embedded ? "p-5" : "px-8 py-8 lg:px-16"}`,
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: embedded ? "min-w-0 space-y-6" : "mx-auto max-w-6xl space-y-8", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: `min-w-0 ${detailHeroLayout}`, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex min-w-0 flex-col py-2 ${detailHeroMinHeight}`, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "h1",
                      {
                        className: `break-words font-heading font-medium tracking-[0.02em] text-foreground ${embedded ? "pr-9 text-lg leading-6 @min-[48rem]/workflow-detail:pr-0 @min-[48rem]/workflow-detail:text-xl @min-[48rem]/workflow-detail:leading-7" : "text-3xl"}`,
                        children: workflowDisplayName(presentationWorkflow)
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 flex flex-wrap gap-2", children: presentationWorkflow.tags.map((tag) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        className: "rounded-sm bg-foreground/[0.06] px-2 py-1 text-[11px] text-muted-foreground",
                        children: workflowTagLabel(tag, t)
                      },
                      tag
                    )) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-6 max-w-xl whitespace-pre-line text-sm leading-6 text-muted-foreground", children: presentationWorkflow.longDesc || presentationWorkflow.shortDesc || "—" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-auto space-y-2 pt-8", children: canDownload && effectiveDownloadPhase === "idle" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      type: "button",
                      size: "lg",
                      className: `${embedded ? "h-auto min-h-11 min-w-0 whitespace-normal py-2" : "h-11"} w-full border-0 bg-brand-accent text-sm text-brand-accent-foreground shadow-none transition-opacity hover:text-brand-accent-foreground hover:opacity-90`,
                      "aria-label": `${t("workflows.detail.startDownload")}${packageSize !== "—" ? ` ${packageSize}` : ""}`,
                      onClick: handleStartDownload,
                      "data-action-ui-id": "workflows-detail-download",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 16, strokeWidth: 2 }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("workflows.detail.startDownload") }),
                        packageSize !== "—" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-brand-accent-foreground/70", children: [
                          "· ",
                          packageSize
                        ] }) : null
                      ]
                    }
                  ) : effectiveDownloadPhase === "downloading" || effectiveDownloadPhase === "paused" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      className: "flex h-11 w-full flex-col justify-center rounded-lg bg-foreground px-4 text-background",
                      role: "status",
                      "aria-live": "polite",
                      "data-action-ui-id": "workflows-detail-download-progress",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Progress,
                        {
                          value: effectiveDownloadProgress,
                          className: "gap-1.5 [&_[data-slot=progress-indicator]]:bg-background [&_[data-slot=progress-track]]:bg-background/20",
                          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex w-full items-center justify-between gap-3 text-xs font-medium", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: effectiveDownloadPhase === "paused" ? t("workflows.detail.downloadPaused") : liveDownloadTask ? t(`chat.workflow.downloadStatus.${liveDownloadTask.status}`) : t("workflows.detail.downloading") }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tabular-nums", children: effectiveDownloadProgress === null ? "—" : `${Math.round(effectiveDownloadProgress)}%` })
                          ] })
                        }
                      )
                    }
                  ) : completedAction && workflowReadyToUse ? completedAction : null })
                ] }),
                detailMediaUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 self-start overflow-hidden rounded-lg bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex aspect-video w-full items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(WorkflowDetailMedia, { mediaUrl: detailMediaUrl }) }) }) : null
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("section", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "article",
                {
                  className: "rounded-lg bg-card p-5",
                  "data-action-ui-id": "workflows-detail-installation",
                  children: [
                    effectiveDownloadPhase === "downloading" || effectiveDownloadPhase === "paused" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex shrink-0 items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
                      !liveDownloadTask ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        Button,
                        {
                          type: "button",
                          variant: "ghost",
                          size: "sm",
                          className: "border-0 hover:bg-brand-accent/10 hover:text-brand-accent",
                          onClick: handleToggleDownload,
                          "data-action-ui-id": "workflows-detail-download-toggle",
                          children: [
                            effectiveDownloadPhase === "paused" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { size: 14, strokeWidth: 1.5 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Pause, { size: 14, strokeWidth: 1.5 }),
                            effectiveDownloadPhase === "paused" ? t("workflows.detail.resumeDownload") : t("workflows.detail.pauseDownload")
                          ]
                        }
                      ) : null,
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        Button,
                        {
                          type: "button",
                          variant: "ghost",
                          size: "sm",
                          className: "text-destructive hover:bg-destructive/10 hover:text-destructive",
                          onClick: handleCancelDownload,
                          "data-action-ui-id": "workflows-detail-download-cancel",
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleStop, { size: 14, strokeWidth: 1.5 }),
                            t("workflows.detail.cancelDownload")
                          ]
                        }
                      )
                    ] }) }) }) : null,
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        className: `grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 ${attributions.length ? "@min-[46rem]/workflow-detail:grid-cols-[minmax(0,1.25fr)_minmax(16rem,0.9fr)]" : ""} ${effectiveDownloadPhase === "downloading" || effectiveDownloadPhase === "paused" ? "mt-5 border-t border-border pt-5" : ""}`,
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between gap-3", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-medium text-foreground", children: t("workflows.detail.resources") }),
                                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: t("workflows.detail.resourcesHint") })
                              ] }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: t("workflows.detail.resourceCount", { count: resourceFiles.length }) })
                            ] }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "div",
                              {
                                className: "min-w-0 overflow-hidden rounded-lg bg-muted",
                                "data-action-ui-id": "workflows-detail-resource-list",
                                children: resourceFiles.map(({ key, name, directory, icon: FileIcon }, fileIndex) => {
                                  const fileProgress = liveDownloadTask ? calculateLiveFileProgress(liveDownloadTask, name, fileIndex) : calculateFileProgress(downloadProgress, fileIndex, resourceFiles.length);
                                  const fileCompleted = effectiveDownloadPhase === "complete" || fileProgress !== null && fileProgress >= 100;
                                  const showFileProgress = !fileCompleted && (effectiveDownloadPhase === "downloading" || effectiveDownloadPhase === "paused");
                                  const fileStatus = liveDownloadTask?.currentModel === name && liveDownloadTask.status !== "completed" ? fileProgress === null ? t(`chat.workflow.downloadStatus.${liveDownloadTask.status}`) : `${Math.round(fileProgress)}%` : null;
                                  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 px-3 py-3", children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-3", children: [
                                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                                        FileIcon,
                                        {
                                          className: "size-4 shrink-0 text-muted-foreground",
                                          strokeWidth: 1.5
                                        }
                                      ),
                                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                                        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-xs font-medium text-foreground", children: name }),
                                        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-[11px] text-muted-foreground", children: directory })
                                      ] }),
                                      fileCompleted ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                                        "span",
                                        {
                                          className: "size-2 shrink-0 rounded-full bg-success",
                                          role: "img",
                                          "aria-label": t("workflows.detail.downloaded"),
                                          "data-resource-download-status": "completed"
                                        }
                                      ) : fileStatus ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-[11px] tabular-nums text-muted-foreground", children: fileStatus }) : null
                                    ] }),
                                    showFileProgress ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                                      Progress,
                                      {
                                        value: fileProgress,
                                        className: "mt-2 gap-0",
                                        "aria-label": t("workflows.detail.fileDownloadProgress", {
                                          name,
                                          progress: Math.round(fileProgress ?? 0)
                                        })
                                      }
                                    ) : null
                                  ] }, key);
                                })
                              }
                            )
                          ] }),
                          attributions.length ? /* @__PURE__ */ jsxRuntimeExports.jsx(WorkflowAttributionSection, { attributions }) : null
                        ]
                      }
                    )
                  ]
                }
              ) })
            ] })
          }
        )
      ]
    }
  );
}
const ANONYMOUS_ACCOUNT_KEY = "anonymous";
function uniqueRequiredLicenses(attributions) {
  const licenses = /* @__PURE__ */ new Map();
  for (const attribution of attributions) {
    for (const license of attribution.licenses ?? []) {
      if (license.acceptanceRequired) licenses.set(comfyUiLicenseKey(license), license);
    }
  }
  return [...licenses.values()];
}
function useComfyUiLicenseAcceptance(attributions) {
  const [config, , setConfigAsync, configHydrated] = useStorage("global.config");
  const [user, , , userHydrated] = useStorage("global.user");
  const isHydrated = configHydrated && userHydrated;
  const accountKey = user.userID?.trim() || ANONYMOUS_ACCOUNT_KEY;
  const requiredLicenses = reactExports.useMemo(() => uniqueRequiredLicenses(attributions), [attributions]);
  const acceptedLicenseKeys = reactExports.useMemo(() => {
    if (!isHydrated) return /* @__PURE__ */ new Set();
    const accepted = config.comfyUiLicenseAcceptances?.[accountKey] ?? {};
    return new Set(
      requiredLicenses.filter((license) => accepted[comfyUiLicenseKey(license)] !== void 0).map(comfyUiLicenseKey)
    );
  }, [accountKey, config.comfyUiLicenseAcceptances, isHydrated, requiredLicenses]);
  const pendingLicenses = reactExports.useMemo(
    () => isHydrated ? requiredLicenses.filter((license) => !acceptedLicenseKeys.has(comfyUiLicenseKey(license))) : [],
    [acceptedLicenseKeys, isHydrated, requiredLicenses]
  );
  const acceptLicenses = reactExports.useCallback(
    async (licenses) => {
      if (!isHydrated) return false;
      if (licenses.length === 0) return true;
      const acceptedAt = Date.now();
      return setConfigAsync((current) => {
        const allAcceptances = current.comfyUiLicenseAcceptances ?? {};
        const accountAcceptances = { ...allAcceptances[accountKey] ?? {} };
        for (const license of licenses) {
          accountAcceptances[comfyUiLicenseKey(license)] = { acceptedAt };
        }
        return {
          ...current,
          comfyUiLicenseAcceptances: {
            ...allAcceptances,
            [accountKey]: accountAcceptances
          }
        };
      });
    },
    [accountKey, isHydrated, setConfigAsync]
  );
  return {
    acceptanceScope: isHydrated ? accountKey : null,
    isHydrated,
    requiredLicenses,
    acceptedLicenseKeys,
    pendingLicenses,
    acceptLicenses
  };
}
const ITEM_KEYS$1 = ["os", "memory", "gpu", "storage"];
const SYSTEM_MEMORY_REPORTING_TOLERANCE_MAX_BYTES = 512 * 1024 ** 2;
const SYSTEM_MEMORY_REPORTING_TOLERANCE_RATIO = 0.01;
const GPU_MEMORY_REPORTING_TOLERANCE_BYTES = 512 * 1024 ** 2;
function evaluateWorkflowCompatibility(recommendation, snapshot) {
  if (!recommendation || !snapshot) return unknownEvaluation();
  const platformRequirement = recommendation.platforms.find(
    (candidate) => candidate.os === snapshot.os.platform
  );
  const osStatus = evaluateOperatingSystem(platformRequirement, snapshot);
  const statuses = {
    os: osStatus,
    memory: compareSystemMemoryMinimum(
      snapshot.systemMemoryBytes,
      recommendation.systemMemoryBytes
    ),
    gpu: osStatus === "unsupported" ? "notApplicable" : evaluateGpu(platformRequirement?.gpu, snapshot),
    storage: compareMinimum(snapshot.storage.freeBytes, recommendation.freeStorageBytes)
  };
  return {
    statuses,
    result: ITEM_KEYS$1.some(
      (key) => statuses[key] === "insufficient" || statuses[key] === "unsupported"
    ) ? "insufficient" : ITEM_KEYS$1.some((key) => statuses[key] === "unknown") ? "review" : "likely"
  };
}
function unknownEvaluation() {
  return {
    statuses: { os: "unknown", memory: "unknown", gpu: "unknown", storage: "unknown" },
    result: "review"
  };
}
function evaluateOperatingSystem(requirement, snapshot) {
  if (!requirement) return "unsupported";
  if (!requirement.architectures.includes(snapshot.os.arch)) {
    return "unsupported";
  }
  if (!requirement.minVersion) return "meets";
  if (!snapshot.os.version) return "unknown";
  const comparison = compareVersions(snapshot.os.version, requirement.minVersion);
  return comparison === null ? "unknown" : comparison >= 0 ? "meets" : "insufficient";
}
function evaluateGpu(requirement, snapshot) {
  if (!requirement) return "unknown";
  if (requirement.mode === "not_required") return "notApplicable";
  if (requirement.mode === "any") return snapshot.gpus.length > 0 ? "meets" : "unknown";
  const modeCandidates = snapshot.gpus.filter((gpu) => gpu.memoryKind === requirement.mode);
  const candidates = requirement.vendor ? modeCandidates.filter((gpu) => detectedGpuVendor(gpu) === requirement.vendor) : modeCandidates;
  const threshold = requirement.minimumMemoryBytes;
  if (threshold === void 0) return "unknown";
  if (candidates.length === 0) {
    return requirement.vendor && modeCandidates.some((gpu) => detectedGpuVendor(gpu) !== void 0) ? "insufficient" : "unknown";
  }
  if (candidates.some(
    (gpu) => gpu.memoryBytes !== void 0 && gpu.memoryBytes + GPU_MEMORY_REPORTING_TOLERANCE_BYTES >= threshold
  )) {
    return "meets";
  }
  return candidates.every((gpu) => gpu.memoryBytes !== void 0) ? "insufficient" : "unknown";
}
function detectedGpuVendor(gpu) {
  if (gpu.source === "nvidia_smi") return "nvidia";
  const identity = `${gpu.vendor ?? ""} ${gpu.name}`.toLowerCase();
  if (/nvidia|geforce|quadro|tesla/.test(identity)) return "nvidia";
  if (/amd|radeon/.test(identity)) return "amd";
  if (/intel|\barc\b/.test(identity)) return "intel";
  if (/apple/.test(identity)) return "apple";
  return void 0;
}
function compareMinimum(actual, minimum) {
  if (actual === void 0) return "unknown";
  return actual >= minimum ? "meets" : "insufficient";
}
function compareSystemMemoryMinimum(actual, minimum) {
  if (actual === void 0) return "unknown";
  const tolerance = Math.min(
    SYSTEM_MEMORY_REPORTING_TOLERANCE_MAX_BYTES,
    Math.floor(minimum * SYSTEM_MEMORY_REPORTING_TOLERANCE_RATIO)
  );
  return actual + tolerance >= minimum ? "meets" : "insufficient";
}
function compareVersions(actual, minimum) {
  const actualParts = versionParts(actual);
  const minimumParts = versionParts(minimum);
  if (!actualParts || !minimumParts) return null;
  const length = Math.max(actualParts.length, minimumParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (actualParts[index] ?? 0) - (minimumParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}
function versionParts(value) {
  const match = value.trim().match(/^\d+(?:\.\d+)*/);
  if (!match) return null;
  return match[0].split(".").map(Number);
}
const ITEM_KEYS = ["os", "memory", "gpu", "storage"];
function buildCompatibilityRequirements(recommendation, t) {
  const unavailable = t("workflows.detail.compatibility.notConfigured");
  const values = recommendation ? {
    os: recommendation.platforms.map((platform) => {
      const os = operatingSystemName(platform.os, t);
      const architectures = platform.architectures.join(" / ");
      return platform.minVersion ? t("workflows.detail.compatibility.minimumOsVersion", {
        os,
        version: platform.minVersion,
        architectures
      }) : t("workflows.detail.compatibility.minimumOs", { os, architectures });
    }).join(" / "),
    memory: t("workflows.detail.compatibility.memoryValue", {
      size: formatGibibytes(recommendation.systemMemoryBytes)
    }),
    gpu: recommendation.platforms.map(
      (platform) => t("workflows.detail.compatibility.platformGpu", {
        os: operatingSystemName(platform.os, t),
        requirement: gpuRequirementValue(platform.gpu, t)
      })
    ).join(" / "),
    storage: t("workflows.detail.compatibility.storageRequirement", {
      size: formatGibibytes(recommendation.freeStorageBytes)
    })
  } : { os: unavailable, memory: unavailable, gpu: unavailable, storage: unavailable };
  return ITEM_KEYS.map((key) => ({
    key,
    label: t(`workflows.downloadDialog.${key}`),
    value: values[key]
  }));
}
function buildMachineValues(snapshot, loading, t) {
  if (loading) {
    const detecting = t("workflows.detail.compatibility.detecting");
    return { os: detecting, memory: detecting, gpu: detecting, storage: detecting };
  }
  if (!snapshot) {
    const notDetected = t("workflows.detail.compatibility.notDetected");
    return { os: notDetected, memory: notDetected, gpu: notDetected, storage: notDetected };
  }
  const osName = operatingSystemName(snapshot.os.platform, t);
  const cores = snapshot.cpuCores ?? "—";
  return {
    os: snapshot.os.version ? t("workflows.detail.compatibility.localOsVersion", {
      os: osName,
      version: snapshot.os.version,
      arch: snapshot.os.arch,
      cores
    }) : t("workflows.detail.compatibility.localOs", {
      os: osName,
      arch: snapshot.os.arch,
      cores
    }),
    memory: snapshot.systemMemoryBytes === void 0 ? t("workflows.detail.compatibility.notDetected") : t("workflows.detail.compatibility.memoryValue", {
      size: formatGibibytes(snapshot.systemMemoryBytes)
    }),
    gpu: snapshot.gpus.length === 0 ? t("workflows.detail.compatibility.notDetected") : snapshot.gpus.map((gpu) => gpuSnapshotValue(gpu, t)).join(" / "),
    storage: snapshot.storage.freeBytes === void 0 ? t("workflows.detail.compatibility.notDetected") : t("workflows.detail.compatibility.storageValue", {
      size: formatGibibytes(snapshot.storage.freeBytes)
    })
  };
}
function gpuRequirementValue(gpu, t) {
  if (gpu.mode === "not_required") return t("workflows.detail.compatibility.gpu.notRequired");
  if (gpu.mode === "any") return t("workflows.detail.compatibility.gpu.anyRequirement");
  const requirement = t(`workflows.detail.compatibility.gpu.${gpu.mode}Requirement`, {
    size: formatGibibytes(gpu.minimumMemoryBytes ?? 0)
  });
  return gpu.vendor ? t("workflows.detail.compatibility.gpu.vendorRequirement", {
    vendor: t(`workflows.detail.compatibility.gpu.vendor.${gpu.vendor}`),
    requirement
  }) : requirement;
}
function gpuSnapshotValue(gpu, t) {
  if (gpu.memoryBytes === void 0) {
    return t("workflows.detail.compatibility.gpu.detectedValue", { gpu: gpu.name });
  }
  return t(`workflows.detail.compatibility.gpu.${gpu.memoryKind}Value`, {
    gpu: gpu.name,
    size: formatGibibytes(gpu.memoryBytes),
    defaultValue: t("workflows.detail.compatibility.gpu.detectedValue", { gpu: gpu.name })
  });
}
function operatingSystemName(platform, t) {
  return t(`workflows.detail.compatibility.osName.${platform}`, { defaultValue: platform });
}
function formatGibibytes(bytes) {
  const gibibytes = bytes / 1024 ** 3;
  return Number.isInteger(gibibytes) ? String(gibibytes) : gibibytes.toFixed(1);
}
function WorkflowCompatibilityComparison({
  recommendation,
  snapshot,
  loading
}) {
  const { t } = useTranslation();
  const requirements = buildCompatibilityRequirements(recommendation, t);
  const machineValues = buildMachineValues(snapshot, loading, t);
  const evaluatedSnapshot = loading ? null : snapshot;
  const { result, statuses } = evaluateWorkflowCompatibility(recommendation, evaluatedSnapshot);
  const ResultIcon = result === "likely" ? CircleCheck : result === "insufficient" ? CircleX : Gauge;
  const resultTone = result === "insufficient" ? "border-destructive/30 bg-destructive/10 text-destructive" : result === "likely" ? "border-success/30 bg-success/10 text-success" : "border-border bg-muted text-foreground";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-4", "data-action-ui-id": "workflows-compatibility-comparison", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-compatibility-result": result,
        className: `flex items-start gap-3 rounded-lg border p-4 ${resultTone}`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: ResultIcon, size: "lg", className: "mt-0.5 shrink-0", "aria-hidden": true }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium", children: t(`workflows.detail.compatibility.result.${result}.title`) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs leading-5 text-current/70", children: t(`workflows.detail.compatibility.result.${result}.description`) })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "overflow-hidden rounded-lg border border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)] border-b border-border bg-muted/50 text-[11px] font-medium text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 py-3", children: t("workflows.detail.compatibility.item") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-l border-border px-4 py-3", children: t("workflows.detail.compatibility.local") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-l border-border px-4 py-3", children: t("workflows.detail.compatibility.recommended") })
      ] }),
      requirements.map((requirement) => {
        const status = statuses[requirement.key];
        const StatusIcon = status === "meets" ? CircleCheck : status === "insufficient" || status === "unsupported" ? CircleX : status === "notApplicable" ? CircleMinus : CircleHelp;
        const statusClass = status === "insufficient" || status === "unsupported" ? "text-destructive" : status === "meets" ? "text-success" : "text-muted-foreground";
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "grid grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)] border-b border-border last:border-b-0",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 py-3 text-xs font-medium text-foreground", children: requirement.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-l border-border px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  "data-compatibility-status": status,
                  className: `flex items-start gap-2 ${statusClass}`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: StatusIcon, size: "sm", className: "mt-0.5 shrink-0", "aria-hidden": true }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "break-words text-xs leading-4 text-foreground", children: machineValues[requirement.key] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] text-current", children: t(`workflows.detail.compatibility.status.${status}`) })
                    ] })
                  ]
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-l border-border px-4 py-3 text-xs leading-4 text-foreground", children: requirement.value })
            ]
          },
          requirement.key
        );
      })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] leading-5 text-muted-foreground", children: t("workflows.detail.compatibility.detectionNote") })
  ] });
}
const EMPTY_ATTRIBUTIONS = [];
const EMPTY_MODEL_DEPENDENCIES = [];
function WorkflowDownloadConfirmDialog({
  workflow,
  onOpenChange,
  onConfirm
}) {
  const { t } = useTranslation();
  const platform = usePlatform();
  const [snapshot, setSnapshot] = reactExports.useState(null);
  const [availabilitySnapshot, setAvailabilitySnapshot] = reactExports.useState(null);
  const [isDetecting, setIsDetecting] = reactExports.useState(false);
  const [selectedLicenseKeys, setSelectedLicenseKeys] = reactExports.useState(() => /* @__PURE__ */ new Set());
  const [modelsDirectory, setModelsDirectory] = reactExports.useState("");
  const [isPickingDirectory, setIsPickingDirectory] = reactExports.useState(false);
  const [directoryError, setDirectoryError] = reactExports.useState(false);
  const [isSavingAcceptance, setIsSavingAcceptance] = reactExports.useState(false);
  const [acceptanceSaveFailed, setAcceptanceSaveFailed] = reactExports.useState(false);
  const [licenseValidationVisible, setLicenseValidationVisible] = reactExports.useState(false);
  const [licenseCardShaking, setLicenseCardShaking] = reactExports.useState(false);
  const licenseSectionRef = reactExports.useRef(null);
  const workflowId = workflow?.id;
  const dependencies = workflow?.source === "official" ? workflow.modelDependencies ?? EMPTY_MODEL_DEPENDENCIES : EMPTY_MODEL_DEPENDENCIES;
  const attributions = workflow?.source === "official" ? workflow.attributions ?? EMPTY_ATTRIBUTIONS : EMPTY_ATTRIBUTIONS;
  const {
    acceptanceScope,
    isHydrated: licenseStateHydrated,
    requiredLicenses,
    acceptedLicenseKeys,
    pendingLicenses,
    acceptLicenses
  } = useComfyUiLicenseAcceptance(attributions);
  const fileCount = dependencies.length + 1;
  const acceptedLicenseKeysSnapshot = JSON.stringify([...acceptedLicenseKeys].sort());
  const allRequiredLicensesAccepted = licenseStateHydrated && requiredLicenses.every((license) => selectedLicenseKeys.has(comfyUiLicenseKey(license)));
  const modelAvailability = availabilitySnapshot?.models ?? [];
  const availabilityByKey = new Map(
    modelAvailability.map((model) => [`${model.directory}/${model.name}`, model])
  );
  const availableModelKeys = new Set(
    modelAvailability.filter((model) => model.available).map((model) => `${model.directory}/${model.name}`)
  );
  const missingModelCount = dependencies.filter(
    (dependency) => !availableModelKeys.has(`${dependency.directory}/${dependency.name}`)
  ).length;
  const allModelsAvailable = availabilitySnapshot !== null && missingModelCount === 0;
  const canUseLocalResources = dependencies.length > 0 && allModelsAvailable;
  const discoveredModelDirectories = [
    ...new Set(
      modelAvailability.filter((model) => model.available && !model.registered && model.modelsDirectory).map((model) => model.modelsDirectory)
    )
  ];
  reactExports.useLayoutEffect(() => {
    setSelectedLicenseKeys(
      workflowId && acceptanceScope ? new Set(JSON.parse(acceptedLicenseKeysSnapshot)) : /* @__PURE__ */ new Set()
    );
  }, [acceptanceScope, acceptedLicenseKeysSnapshot, workflowId]);
  reactExports.useEffect(() => {
    if (!workflowId || !acceptanceScope) return;
    setIsSavingAcceptance(false);
    setAcceptanceSaveFailed(false);
    setLicenseValidationVisible(false);
    setLicenseCardShaking(false);
    setDirectoryError(false);
  }, [acceptanceScope, workflowId]);
  reactExports.useEffect(() => {
    if (!workflowId || !acceptanceScope) {
      setSnapshot(null);
      setAvailabilitySnapshot(null);
      setModelsDirectory("");
      setIsDetecting(false);
      return;
    }
    let disposed = false;
    setSnapshot(null);
    setAvailabilitySnapshot(null);
    setModelsDirectory("");
    setIsDetecting(true);
    void homeService.comfyUiModelDownload.getModelDirectoryState().then(async (state) => {
      const availability = await homeService.comfyUiModelDownload.getModelAvailability(
        dependencies,
        { scanUserDisk: true }
      );
      const matchedDirectories = [
        ...new Set(
          availability.models.filter((model) => model.available && model.modelsDirectory).map((model) => model.modelsDirectory)
        )
      ];
      const directory = dependencies.length > 0 && availability.models.every((model) => model.available) && matchedDirectories.length === 1 ? matchedDirectories[0] : state.activeDirectory;
      return {
        directory,
        snapshot: await homeService.comfyUiModelDownload.getSystemCompatibilitySnapshot(directory),
        availability
      };
    }).then((value) => {
      if (!disposed) {
        setModelsDirectory(value.directory);
        setSnapshot(value.snapshot);
        setAvailabilitySnapshot(value.availability);
      }
    }).catch(() => {
      if (!disposed) {
        setSnapshot(null);
        setDirectoryError(true);
      }
    }).finally(() => {
      if (!disposed) setIsDetecting(false);
    });
    return () => {
      disposed = true;
    };
  }, [workflowId, acceptanceScope, dependencies]);
  reactExports.useEffect(() => {
    if (!workflowId || !acceptanceScope) return;
    const expectedKeys = dependencies.map((model) => `${model.directory}/${model.name}`).sort().join("\0");
    const subscription = homeService.comfyUiModelDownload.onDidScanModelAvailability(
      (nextAvailability) => {
        const receivedKeys = nextAvailability.models.map((model) => `${model.directory}/${model.name}`).sort().join("\0");
        if (receivedKeys !== expectedKeys) return;
        setAvailabilitySnapshot(nextAvailability);
        const matchedDirectories = [
          ...new Set(
            nextAvailability.models.filter((model) => model.available && model.modelsDirectory).map((model) => model.modelsDirectory)
          )
        ];
        if (dependencies.length > 0 && nextAvailability.models.every((model) => model.available) && matchedDirectories.length === 1) {
          const directory = matchedDirectories[0];
          setModelsDirectory(directory);
          void homeService.comfyUiModelDownload.getSystemCompatibilitySnapshot(directory).then(setSnapshot).catch(() => {
          });
        }
      }
    );
    return () => subscription.dispose();
  }, [workflowId, acceptanceScope, dependencies]);
  const handleToggleLicense = (licenseKey, checked) => {
    setSelectedLicenseKeys((current) => {
      const next = new Set(current);
      if (checked) next.add(licenseKey);
      else next.delete(licenseKey);
      return next;
    });
    setAcceptanceSaveFailed(false);
    setLicenseValidationVisible(false);
    setLicenseCardShaking(false);
  };
  const handlePickDirectory = async () => {
    if (isPickingDirectory || isDetecting) return;
    const previousSnapshot = snapshot;
    let directoryRegistered = false;
    setIsPickingDirectory(true);
    setDirectoryError(false);
    try {
      const selected = await platform.fs.showOpenDialog?.({
        directory: true,
        multiple: false,
        title: t("workflows.downloadDialog.directoryPickerTitle")
      });
      const directory = selected?.[0];
      if (!directory) return;
      setSnapshot(null);
      setAvailabilitySnapshot(null);
      setIsDetecting(true);
      const state = await homeService.comfyUiModelDownload.registerModelDirectory(directory);
      directoryRegistered = true;
      setModelsDirectory(state.activeDirectory);
      const [nextSnapshot, nextAvailability] = await Promise.all([
        homeService.comfyUiModelDownload.getSystemCompatibilitySnapshot(state.activeDirectory),
        homeService.comfyUiModelDownload.getModelAvailability(dependencies)
      ]);
      setSnapshot(nextSnapshot);
      setAvailabilitySnapshot(nextAvailability);
    } catch {
      setSnapshot(directoryRegistered ? null : previousSnapshot);
      setAvailabilitySnapshot(null);
      setDirectoryError(true);
    } finally {
      setIsDetecting(false);
      setIsPickingDirectory(false);
    }
  };
  const handleConfirm = async () => {
    if (!licenseStateHydrated || isSavingAcceptance || !modelsDirectory) return;
    if (!allRequiredLicensesAccepted) {
      setLicenseValidationVisible(true);
      setLicenseCardShaking(true);
      licenseSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      licenseSectionRef.current?.focus({ preventScroll: true });
      return;
    }
    setIsSavingAcceptance(true);
    setAcceptanceSaveFailed(false);
    const saved = await acceptLicenses(pendingLicenses);
    if (saved) onConfirm(modelsDirectory, discoveredModelDirectories, canUseLocalResources);
    else setAcceptanceSaveFailed(true);
    setIsSavingAcceptance(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: workflow !== null, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    DialogContent,
    {
      size: "xl",
      className: "flex w-[92dvw] max-w-[960px] max-h-[min(860px,88dvh)] flex-col gap-0 overflow-hidden p-0",
      "data-action-ui-id": "workflows-download-dialog",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { className: "shrink-0 border-b border-border bg-popover px-6 py-5 pr-16", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "text-base", children: t("workflows.downloadDialog.title", {
            name: workflow ? workflowDisplayName(workflow) : ""
          }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: t("workflows.downloadDialog.description") })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "scrollbar-fade min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-5 pr-5 [scrollbar-gutter:stable]",
            "data-slot": "workflows-download-dialog-body",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                WorkflowCompatibilityComparison,
                {
                  recommendation: workflow?.source === "official" ? workflow.recommendation : void 0,
                  snapshot,
                  loading: isDetecting
                }
              ),
              licenseStateHydrated && requiredLicenses.length ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "section",
                {
                  ref: licenseSectionRef,
                  className: "outline-none",
                  tabIndex: -1,
                  "aria-labelledby": "workflows-download-license-title",
                  "data-action-ui-id": "workflows-download-license-confirmation",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-start gap-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        ShieldCheck,
                        {
                          className: "mt-0.5 size-4 shrink-0 text-muted-foreground",
                          strokeWidth: 1.5
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "h3",
                          {
                            id: "workflows-download-license-title",
                            className: "text-sm font-medium text-foreground",
                            children: t("workflows.downloadDialog.licenseTitle")
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] leading-4 text-muted-foreground", children: t("workflows.downloadDialog.licenseHint") })
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "fieldset",
                      {
                        "aria-labelledby": "workflows-download-license-title",
                        "aria-invalid": licenseValidationVisible,
                        "aria-describedby": licenseValidationVisible ? "workflows-download-license-required" : void 0,
                        onAnimationEnd: () => setLicenseCardShaking(false),
                        className: `space-y-2 rounded-lg border px-3 py-3 ${licenseValidationVisible ? "border-destructive bg-destructive/10 ring-1 ring-destructive/20" : "border-border bg-muted/50"} ${licenseCardShaking ? "animate-shake" : ""}`,
                        children: requiredLicenses.map((license, index) => {
                          const licenseKey = comfyUiLicenseKey(license);
                          const checkboxId = `workflow-license-${index}`;
                          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Checkbox,
                              {
                                id: checkboxId,
                                checked: selectedLicenseKeys.has(licenseKey),
                                "aria-invalid": licenseValidationVisible && !selectedLicenseKeys.has(licenseKey),
                                onCheckedChange: (checked) => handleToggleLicense(licenseKey, checked === true),
                                disabled: isSavingAcceptance,
                                "data-action-ui-id": `workflows-license-accept-${license.id}`
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "label",
                                {
                                  htmlFor: checkboxId,
                                  className: "block cursor-pointer text-xs leading-5 text-foreground",
                                  children: license.acceptanceText
                                }
                              ),
                              license.notice ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] leading-4 text-muted-foreground", children: license.notice }) : null,
                              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                Button,
                                {
                                  type: "button",
                                  variant: "ghost",
                                  size: "xs",
                                  className: "mt-1 -ml-2 border-0 text-muted-foreground hover:text-foreground",
                                  onClick: () => void openExternalUrl(platform, license.url, {
                                    source: `workflows.download.license.${license.id}`
                                  }),
                                  "data-action-ui-id": `workflows-download-license-${license.id}`,
                                  children: [
                                    license.name,
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { size: 12, strokeWidth: 1.5 })
                                  ]
                                }
                              )
                            ] })
                          ] }, licenseKey);
                        })
                      }
                    ),
                    licenseValidationVisible ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "p",
                      {
                        id: "workflows-download-license-required",
                        className: "mt-2 text-[11px] text-destructive",
                        role: "alert",
                        children: t("workflows.downloadDialog.licenseRequired")
                      }
                    ) : null,
                    acceptanceSaveFailed ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-[11px] text-destructive", role: "alert", children: t("workflows.downloadDialog.licenseSaveFailed") }) : null
                  ]
                }
              ) : null,
              /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between gap-4", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-foreground", children: t("workflows.downloadDialog.fileList") }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", role: "status", children: availabilitySnapshot === null ? t("workflows.downloadDialog.scanningLocalResources") : allModelsAvailable ? t("workflows.downloadDialog.allResourcesFound") : availabilitySnapshot.scanComplete ? t("workflows.downloadDialog.missingResources", {
                      count: missingModelCount
                    }) : t("workflows.downloadDialog.partialScan", {
                      count: missingModelCount
                    }) })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: t("workflows.downloadDialog.fileCount", { count: fileCount }) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "overflow-hidden rounded-lg border border-border", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(FileJson2, { className: "size-4 text-muted-foreground", strokeWidth: 1.5 }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "truncate text-xs font-medium text-foreground", children: [
                        workflow?.name ?? "workflow",
                        ".json"
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: t("workflows.downloadDialog.workflowFile") })
                    ] })
                  ] }),
                  dependencies.map((dependency) => {
                    const key = `${dependency.directory}/${dependency.name}`;
                    const availability = availabilityByKey.get(key);
                    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        className: "flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { className: "size-4 text-muted-foreground", strokeWidth: 1.5 }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-xs font-medium text-foreground", children: dependency.name }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: t("workflows.downloadDialog.modelFile", {
                              directory: dependency.directory
                            }) }),
                            availability?.modelsDirectory ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 truncate font-mono text-[11px] text-muted-foreground", children: [
                              availability.modelsDirectory,
                              !availability.registered ? ` · ${t("workflows.downloadDialog.registerOnUse")}` : ""
                            ] }) : null
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "span",
                            {
                              className: `shrink-0 text-[11px] ${availableModelKeys.has(key) ? "text-foreground" : "text-muted-foreground"}`,
                              "data-model-availability": availabilitySnapshot === null ? "scanning" : availableModelKeys.has(key) ? "available" : "missing",
                              children: availabilitySnapshot === null ? t("workflows.downloadDialog.scanning") : availableModelKeys.has(key) ? t("workflows.downloadDialog.localResourceFound") : t("workflows.downloadDialog.downloadRequired")
                            }
                          )
                        ]
                      },
                      key
                    );
                  })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-[11px] leading-5 text-muted-foreground", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(HardDrive, { className: "mt-0.5 size-4 shrink-0", strokeWidth: 1.5 }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: t("workflows.downloadDialog.hint") })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "shrink-0 flex-row items-end justify-between gap-4 border-t border-border bg-popover px-6 py-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1 space-y-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "label",
                {
                  className: "shrink-0 text-[11px] font-medium text-muted-foreground",
                  htmlFor: "workflow-model-download-directory",
                  children: t("workflows.downloadDialog.directoryLabel")
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  id: "workflow-model-download-directory",
                  value: modelsDirectory,
                  readOnly: true,
                  className: "min-w-0 flex-1 font-mono",
                  "aria-label": t("workflows.downloadDialog.directoryLabel")
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  type: "button",
                  variant: "secondary",
                  onClick: () => void handlePickDirectory(),
                  disabled: isPickingDirectory || isDetecting,
                  "data-action-ui-id": "workflows-download-directory-picker",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(LocalFolderIcon, { className: "size-4" }),
                    isPickingDirectory ? t("workflows.downloadDialog.directoryPicking") : t("workflows.downloadDialog.directoryChange")
                  ]
                }
              )
            ] }),
            directoryError ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-destructive", role: "alert", children: t("workflows.downloadDialog.directoryChangeFailed") }) : null
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              className: "shrink-0",
              onClick: () => void handleConfirm(),
              disabled: !licenseStateHydrated || isSavingAcceptance || isDetecting || availabilitySnapshot === null || isPickingDirectory || !modelsDirectory,
              loading: isDetecting,
              "data-action-ui-id": "workflows-download-confirm",
              children: isDetecting ? t("workflows.downloadDialog.scanningDisk") : licenseStateHydrated ? canUseLocalResources ? t("workflows.downloadDialog.useLocalResources") : t("workflows.downloadDialog.confirm") : t("workflows.downloadDialog.checkingLicenses")
            }
          )
        ] })
      ]
    }
  ) });
}
const WORKFLOW_TUTORIAL_FAQ_ITEMS = [
  { id: "openSourceModel", links: [] },
  { id: "openSourceWorkflow", links: [] },
  {
    id: "deployment",
    answerLayout: "steps",
    links: [
      { id: "comfyRepository", href: "https://huggingface.co/Comfy-Org/MiniMax-H3" },
      { id: "comfyTutorial", href: "https://docs.comfy.org/tutorials/video/minimax/minimax-h3" },
      { id: "diffusers", href: "https://huggingface.co/MiniMaxAI/MiniMax-H3" },
      { id: "github", href: "https://github.com/MiniMax-AI/MiniMax-H3" }
    ]
  },
  { id: "hardware", links: [] },
  { id: "capabilities", links: [] },
  {
    id: "pricing",
    links: [
      { id: "pricing", href: "https://www.minimaxi.com/price" },
      { id: "hailuo", href: "https://hailuoai.com/" }
    ]
  },
  {
    id: "openSourceVsOnline",
    links: [
      {
        id: "contextIr",
        href: "https://platform.minimaxi.com/docs/api-reference/video-generation-v2-h3-context-ir"
      },
      {
        id: "regenerate2k",
        href: "https://platform.minimaxi.com/docs/api-reference/video-generation-v2-regeneration"
      }
    ]
  },
  {
    id: "prompting",
    links: [
      {
        id: "baseGuide",
        href: "https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/docs/VIDEO_PROMPT_WRITING_GUIDE_base_en.md"
      },
      {
        id: "referenceGuide",
        href: "https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/docs/VIDEO_PROMPT_WRITING_GUIDE_ref_en.md"
      },
      { id: "github", href: "https://github.com/MiniMax-AI/MiniMax-H3" }
    ]
  },
  { id: "commercialUse", links: [] },
  {
    id: "regionalAvailability",
    links: [{ id: "authorization", href: "https://platform.minimaxi.com/h3-license" }]
  },
  {
    id: "api",
    answerLayout: "steps",
    links: [
      { id: "platform", href: "https://platform.minimaxi.com/" },
      {
        id: "contextIr",
        href: "https://platform.minimaxi.com/docs/api-reference/video-generation-v2-h3-context-ir"
      },
      {
        id: "regenerate2k",
        href: "https://platform.minimaxi.com/docs/api-reference/video-generation-v2-regeneration"
      },
      {
        id: "videoEndpoint",
        href: "https://platform.minimaxi.com/docs/api-reference/video-generation-v2-create"
      },
      { id: "pricing", href: "https://www.minimaxi.com/price" }
    ]
  },
  { id: "fineTuning", links: [] },
  {
    id: "productionServing",
    links: [{ id: "vllmRecipe", href: "https://recipes.vllm.ai/MiniMaxAI/MiniMax-H3" }]
  },
  { id: "acceptableUse", links: [] },
  {
    id: "support",
    links: [
      { id: "discord", href: "https://discord.com/invite/dbMxutw7tP" },
      { id: "github", href: "https://github.com/MiniMax-AI/MiniMax-H3" },
      { id: "huggingFace", href: "https://huggingface.co/MiniMaxAI/MiniMax-H3" },
      { id: "modelScope", href: "https://modelscope.cn/organization/minimax" },
      { id: "minimaxX", href: "https://x.com/MiniMax_AI" },
      { id: "hailuoX", href: "https://x.com/Hailuo_AI" },
      { id: "platform", href: "https://platform.minimaxi.com/" }
    ]
  }
];
function WorkflowTutorialDialog({ open, onOpenChange }) {
  const { t } = useTranslation();
  const platform = usePlatform();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    DialogContent,
    {
      size: "lg",
      className: "flex max-h-[min(760px,86dvh)] flex-col gap-0 overflow-hidden p-0",
      "data-action-ui-id": "workflows-tutorial-dialog",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { className: "shrink-0 border-b border-border-soft px-6 py-5 pr-16", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-accent/10 text-brand-accent", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: BookOpen, size: "md", "aria-hidden": true }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "text-lg", children: t("workflows.tutorialFaq.title") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { className: "mt-1 text-[15px] leading-6", children: t("workflows.tutorialFaq.description") })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-color:var(--scrollbar-thumb)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-[var(--scrollbar-thumb)] [&::-webkit-scrollbar-thumb:hover]:bg-[var(--scrollbar-thumb-hover)] [&::-webkit-scrollbar-track]:bg-transparent",
            "data-action-ui-id": "workflows-tutorial-scroll",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Accordion, { defaultValue: [WORKFLOW_TUTORIAL_FAQ_ITEMS[0].id], className: "px-6 py-2", children: WORKFLOW_TUTORIAL_FAQ_ITEMS.map((item, index) => {
              const answerParts = t(`workflows.tutorialFaq.items.${item.id}.answer`).split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionItem, { value: item.id, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  AccordionTrigger,
                  {
                    className: "gap-3 py-4 text-[15px] leading-6 hover:no-underline",
                    "data-action-ui-id": `workflows-tutorial-faq-${item.id}`,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 items-start gap-3 pr-3", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-normal text-muted-foreground transition-colors duration-150 group-aria-expanded/accordion-trigger:bg-brand-accent/10 group-aria-expanded/accordion-trigger:text-brand-accent", children: String(index + 1).padStart(2, "0") }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t(`workflows.tutorialFaq.items.${item.id}.question`) })
                    ] })
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionContent, { className: "pr-9 pb-4 pl-9 text-sm leading-7 text-muted-foreground", children: [
                  "answerLayout" in item && item.answerLayout === "steps" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "ol",
                    {
                      className: "space-y-2.5",
                      "data-action-ui-id": `workflows-tutorial-answer-${item.id}`,
                      children: answerParts.map((part, stepIndex) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "li",
                        {
                          className: "grid grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-2.5",
                          "data-action-ui-id": `workflows-tutorial-answer-step-${item.id}`,
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 flex size-6 items-center justify-center rounded-md bg-muted text-xs font-medium text-foreground", children: stepIndex + 1 }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: part })
                          ]
                        },
                        `${item.id}-${part}`
                      ))
                    }
                  ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      className: "space-y-2.5",
                      "data-action-ui-id": `workflows-tutorial-answer-${item.id}`,
                      children: answerParts.map((part) => /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: part }, `${item.id}-${part}`))
                    }
                  ),
                  item.links.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: item.links.map((link) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      type: "button",
                      variant: "outline",
                      size: "sm",
                      className: "h-8 gap-1.5 rounded-md pl-2.5 pr-3 text-xs font-normal",
                      onClick: () => {
                        void openExternalUrl(platform, link.href, {
                          source: `workflows.tutorial-faq.${item.id}.${link.id}`
                        });
                      },
                      "data-action-ui-id": `workflows-tutorial-link-${item.id}-${link.id}`,
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: ExternalLink, size: "sm", strokeWidth: 1.5, "aria-hidden": true }),
                        t(`workflows.tutorialFaq.links.${link.id}`)
                      ]
                    },
                    `${item.id}-${link.id}`
                  )) }) : null
                ] })
              ] }, item.id);
            }) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex shrink-0 items-center border-t border-border-soft px-6 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            type: "button",
            variant: "ghost",
            size: "sm",
            className: "h-8 gap-1.5 rounded-md pl-2.5 pr-3 text-[13px] font-normal text-muted-foreground",
            onClick: () => {
              void openExternalUrl(platform, WORKFLOW_TUTORIAL_SOURCE_URL, {
                source: "workflows.tutorial-faq.source"
              });
            },
            "data-action-ui-id": "workflows-tutorial-source",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: ExternalLink, size: "sm", strokeWidth: 1.5, "aria-hidden": true }),
              t("workflows.tutorialFaq.source")
            ]
          }
        ) })
      ]
    }
  ) });
}
function isWorkspaceUnavailable(item, unavailablePaths) {
  return unavailablePaths.has(item.workspace.path) || item.recentPath !== void 0 && unavailablePaths.has(item.recentPath);
}
function resolveRecentProjectsGroupMode(value) {
  return value === "none" ? "none" : "project";
}
function buildWorkflowUseMenuSections({
  recentWorkspaces,
  entries,
  projects,
  pinnedWorkspacePaths,
  sortMode,
  groupMode,
  caseInsensitiveWorkspacePaths,
  caseInsensitiveProjectPaths,
  workspaceStatusById,
  syntheticOpenedAtForEntry,
  unavailablePaths = /* @__PURE__ */ new Set()
}) {
  const baseInventory = mergeWorkspaceInventory(recentWorkspaces, entries, {
    caseInsensitive: caseInsensitiveWorkspacePaths,
    sortMode,
    syntheticOpenedAtForEntry
  }).filter((item) => !isWorkspaceUnavailable(item, unavailablePaths));
  const inventory = sortMode === "priority" ? baseInventory.map((item, index) => {
    const status = item.authoritativeEntry ? workspaceStatusById.get(item.authoritativeEntry.workspaceId) : void 0;
    const rank = status?.needsUserAction ? 0 : status?.running ? 1 : status?.unread ? 2 : 3;
    return { item, index, rank };
  }).sort((a, b) => a.rank - b.rank || a.index - b.index).map(({ item }) => item) : baseInventory;
  const { pinned, unpinned } = splitPinnedInventory(
    inventory,
    pinnedWorkspacePaths,
    caseInsensitiveWorkspacePaths
  );
  const sections = [];
  if (pinned.length > 0) sections.push({ key: "pinned", kind: "pinned", items: pinned });
  if (groupMode === "none") {
    if (unpinned.length > 0) sections.push({ key: "recent", kind: "recent", items: unpinned });
    return sections;
  }
  for (const group of groupRecentWorkspacesByProject(
    unpinned,
    projects,
    caseInsensitiveProjectPaths
  )) {
    if (group.items.length === 0) continue;
    sections.push({
      key: group.key,
      kind: group.key === UNGROUPED_RECENT_GROUP_KEY ? "ungrouped" : "project",
      label: group.project?.name,
      items: group.items
    });
  }
  return sections;
}
function WorkflowUseMenu({
  workflowId,
  recentWorkspaces,
  unavailablePaths,
  onCreate,
  onSelect,
  compact = false
}) {
  const { t } = useTranslation();
  const platform = usePlatform();
  const { entries, workspaceStatusById } = useTopbarState();
  const { projects, caseInsensitive: caseInsensitiveProjectPaths } = useProjectStore();
  const [globalConfig] = useStorage("global.config");
  const caseInsensitiveWorkspacePaths = isCaseInsensitiveOs(platform.app.os);
  const syntheticOpenedAtByPathRef = reactExports.useRef(/* @__PURE__ */ new Map());
  for (const workspace of recentWorkspaces) {
    const key = workspaceInventoryPathKey(workspace.path, caseInsensitiveWorkspacePaths);
    const previousOpenedAt = syntheticOpenedAtByPathRef.current.get(key);
    if (previousOpenedAt === void 0 || workspace.openedAt > previousOpenedAt) {
      syntheticOpenedAtByPathRef.current.set(key, workspace.openedAt);
    }
  }
  const syntheticOpenedAtForEntry = reactExports.useCallback(
    (entry) => {
      const key = workspaceInventoryPathKey(entry.folderPath, caseInsensitiveWorkspacePaths);
      const existing = syntheticOpenedAtByPathRef.current.get(key);
      if (existing !== void 0) return existing;
      const firstSeenAt = Date.now();
      syntheticOpenedAtByPathRef.current.set(key, firstSeenAt);
      return firstSeenAt;
    },
    [caseInsensitiveWorkspacePaths]
  );
  const sections = reactExports.useMemo(
    () => buildWorkflowUseMenuSections({
      recentWorkspaces,
      entries,
      projects,
      pinnedWorkspacePaths: globalConfig.pinnedWorkspacePaths ?? [],
      sortMode: resolveRecentProjectsSortMode(globalConfig.recentProjectsSortMode),
      groupMode: resolveRecentProjectsGroupMode(globalConfig.recentProjectsGroupMode),
      caseInsensitiveWorkspacePaths,
      caseInsensitiveProjectPaths,
      workspaceStatusById,
      syntheticOpenedAtForEntry,
      unavailablePaths
    }),
    [
      caseInsensitiveProjectPaths,
      entries,
      globalConfig.pinnedWorkspacePaths,
      globalConfig.recentProjectsGroupMode,
      globalConfig.recentProjectsSortMode,
      projects,
      recentWorkspaces,
      caseInsensitiveWorkspacePaths,
      syntheticOpenedAtForEntry,
      unavailablePaths,
      workspaceStatusById
    ]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DropdownMenuTrigger,
      {
        render: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            type: "button",
            size: compact ? "sm" : "lg",
            className: compact ? "h-9 rounded-md border-0 bg-brand-accent px-2.5 text-xs font-medium text-brand-accent-foreground shadow-none transition-opacity hover:opacity-90" : "h-11 w-full rounded-md border-0 bg-brand-accent text-sm font-medium text-brand-accent-foreground shadow-none transition-opacity hover:opacity-90",
            "data-action-ui-id": `workflows-use-${workflowId}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(PanelsTopLeft, { size: compact ? 14 : 16, strokeWidth: compact ? 1.5 : 2 }),
              t("workflows.use")
            ]
          }
        )
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      DropdownMenuContent,
      {
        align: "center",
        side: "bottom",
        sideOffset: 4,
        className: "w-72 p-1",
        "data-action-ui-id": `workflows-use-menu-${workflowId}`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuItem,
            {
              onClick: onCreate,
              className: "group mb-1 min-h-16 cursor-pointer items-center gap-2.5 rounded-md p-2.5 whitespace-normal",
              "data-action-ui-id": `workflows-use-new-${workflowId}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground/70 transition-colors duration-150 group-hover:bg-background group-hover:text-foreground group-focus:bg-background group-focus:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 16, strokeWidth: 1.5 }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-heading text-sm font-medium text-foreground", children: t("workflows.useMenu.newCanvas") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-1 block text-xs leading-4 font-normal text-muted-foreground", children: t("workflows.useMenu.newCanvasHint") })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSub, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              DropdownMenuSubTrigger,
              {
                className: "group/sub min-h-16 cursor-pointer items-center gap-2.5 rounded-md p-2.5 whitespace-normal",
                "data-action-ui-id": `workflows-use-existing-${workflowId}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground/70 transition-colors duration-150 group-hover/sub:bg-background group-hover/sub:text-foreground group-focus/sub:bg-background group-focus/sub:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FolderClock, { size: 16, strokeWidth: 1.5 }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block font-heading text-sm font-medium text-foreground", children: t("workflows.useMenu.existingCanvas") }) })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              DropdownMenuSubContent,
              {
                className: "flex max-h-80 w-96 flex-col overflow-y-auto p-1.5",
                "data-action-ui-id": `workflows-use-existing-menu-${workflowId}`,
                children: sections.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-3 py-3 text-xs text-muted-foreground", children: t("workflows.useMenu.noRecentCanvas") }) : sections.map((section) => /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuGroup, { "data-workflow-use-section": section.kind, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: section.kind === "pinned" ? t("homeSidebar.pinned") : section.kind === "ungrouped" ? t("project.ungrouped") : section.kind === "recent" ? t("homeSidebar.recentProjects") : section.label }),
                  section.items.map((item) => {
                    const workspace = item.workspace;
                    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      DropdownMenuItem,
                      {
                        title: workspace.path,
                        onClick: (event) => {
                          event.stopPropagation();
                          onSelect(workspace.path);
                        },
                        className: "min-h-10 min-w-0 cursor-pointer gap-2.5 px-3 py-2 text-sm font-normal",
                        "data-action-ui-id": `workflows-use-existing-item-${workspace.path}`,
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(PanelsTopLeft, { size: 16, strokeWidth: 1.5 }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate", children: workspaceDisplayName(workspace) })
                        ]
                      },
                      workspace.path
                    );
                  })
                ] }, section.key))
              }
            )
          ] })
        ]
      }
    )
  ] });
}
const DETAIL_COLLAPSE_DURATION_MS = 180;
const DETAIL_COLLAPSE_FALLBACK_MS = DETAIL_COLLAPSE_DURATION_MS + 60;
const COMFY_UI_PLUGIN_ID = "comfyui";
function WorkflowsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { tab: initialTab } = useSearch({ from: "/_home/workflows/" });
  const [activeTab, setActiveTab] = reactExports.useState(initialTab ?? "official");
  const [search, setSearch] = reactExports.useState("");
  const [tutorialOpen, setTutorialOpen] = reactExports.useState(false);
  const [importing, setImporting] = reactExports.useState(false);
  const [downloadWorkflow, setDownloadWorkflow] = reactExports.useState(null);
  const [detailWorkflow, setDetailWorkflow] = reactExports.useState(null);
  const importInputRef = reactExports.useRef(null);
  const inlineBrowserRef = reactExports.useRef(null);
  const gatewayFetch2 = useGatewayFetch();
  const query = useComfyWorkflows(activeTab);
  const { tasks: downloadTasks } = useComfyUiDownloadProgress();
  const hasActiveDownloads = downloadTasks.some(isActiveWorkflowDownloadTask);
  const [recentWorkspaces] = useStorage("global.recentWorkspaces");
  const unavailableWorkspacePaths = useWorkspaceAvailability(recentWorkspaces);
  const platform = usePlatform();
  const hubEntries = useHubEntries();
  const tutorialEntry = hubEntries[HUB_ENTRY_IDS.workflowTutorial];
  const handleCloseDetail = reactExports.useCallback(() => {
    const browser = inlineBrowserRef.current;
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!browser?.animate || prefersReducedMotion) {
      setDetailWorkflow(null);
      return;
    }
    const animation = browser.animate(
      [
        { opacity: 1, transform: "translateX(0)" },
        { opacity: 0, transform: "translateX(8px)" }
      ],
      {
        duration: DETAIL_COLLAPSE_DURATION_MS,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "forwards"
      }
    );
    let fallbackTimer;
    let completed = false;
    const completeCollapse = () => {
      if (completed) return;
      completed = true;
      if (fallbackTimer !== void 0) window.clearTimeout(fallbackTimer);
      setDetailWorkflow(null);
    };
    fallbackTimer = window.setTimeout(completeCollapse, DETAIL_COLLAPSE_FALLBACK_MS);
    void animation.finished.then(completeCollapse, completeCollapse);
  }, []);
  reactExports.useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  const filteredWorkflows = reactExports.useMemo(() => {
    return query.workflows.filter(
      (workflow) => (activeTab !== "mine" || !isWorkflowPendingModelPreparation(workflow, downloadTasks)) && workflowMatchesSearch(workflow, search)
    );
  }, [activeTab, downloadTasks, query.workflows, search]);
  reactExports.useEffect(() => {
    setDetailWorkflow((current) => {
      if (!current) return current;
      const refreshed = query.workflows.find((workflow) => workflow.id === current.id);
      return refreshed && refreshed !== current ? refreshed : current;
    });
  }, [query.workflows]);
  const navigateWithWorkflow = reactExports.useCallback(
    (workspaceId, workflowId) => navigate({
      to: "/workspace",
      search: buildWorkspaceSearch(workspaceId, {
        initialComfyUiWorkflowId: workflowId,
        initialComfyUiWorkflowTarget: "new"
      })
    }),
    [navigate]
  );
  const handleImportWorkflow = reactExports.useCallback(
    (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || importing) return;
      setImporting(true);
      const formData = new FormData();
      formData.append("file", file);
      void gatewayFetch2(API_PATHS.comfyUiWorkflowImport, {
        method: "POST",
        body: formData
      }).then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await response.json();
        setActiveTab("mine");
        notifyComfyWorkflowsChanged();
        trackComfyUiWorkflowCatalogAction("workflows_page", "import_success");
        dedupedToast.success(t("workflows.importSuccess"));
      }).catch((error) => {
        trackComfyUiWorkflowCatalogAction("workflows_page", "import_failed");
        dedupedToast.error(
          t("workflows.importFailed", {
            message: error instanceof Error ? error.message : String(error)
          })
        );
      }).finally(() => setImporting(false));
    },
    [gatewayFetch2, importing, t]
  );
  const handleCreateBlankWorkflow = reactExports.useCallback(async () => {
    try {
      const result = await homeService.hiloApp.createWorkspaceWithResult({
        name: t("workflows.createCanvas"),
        loadUserMemory: true
      });
      const runtime = workspaceRuntimeFromOpenResult(result);
      if (!runtime) {
        toastWorkspaceOpenResult(result, t);
        return;
      }
      await navigate({
        to: "/workspace",
        search: buildWorkspaceSearch(runtime.workspaceId, {
          pluginId: COMFY_UI_PLUGIN_ID
        })
      });
      trackComfyUiWorkflowCatalogAction("workflows_page", "create_blank");
    } catch (error) {
      dedupedToast.error(
        t("workflows.addFailed", {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }, [navigate, t]);
  const ensureWorkflowModelsReady = reactExports.useCallback(
    async (workflow) => {
      if (workflow.source !== "official") return true;
      const models = workflow.modelDependencies ?? [];
      if (models.length === 0) return true;
      const availability = await homeService.comfyUiModelDownload.getModelAvailability(models, {
        scanUserDisk: true
      });
      const discoveredModelDirectories = [
        ...new Set(
          availability.models.filter((model) => model.available && !model.registered && model.modelsDirectory).map((model) => model.modelsDirectory)
        )
      ];
      const state = await homeService.comfyUiModelDownload.getModelDirectoryState();
      const queued = await homeService.comfyUiModelDownload.prepareWorkflow({
        workflowId: workflow.id,
        workflowTitle: workflowDisplayName(workflow),
        models,
        modelsDirectory: state.activeDirectory,
        discoveredModelDirectories,
        preferSilentLocalReuse: availability.models.every((model) => model.available)
      });
      const completed = await homeService.comfyUiModelDownload.waitForTask(queued.id);
      if (completed.status === "cancelled") return false;
      if (completed.status === "failed") throw new Error(completed.error || "模型准备失败");
      if (!isWorkflowModelPreparationComplete(completed)) {
        throw new Error("工作流仍有不可用模型");
      }
      return true;
    },
    []
  );
  const handleUseInNewWorkspace = reactExports.useCallback(
    async (workflowId, workflowName, workflow) => {
      try {
        if (workflow && !await ensureWorkflowModelsReady(workflow)) return;
        const result = await homeService.hiloApp.createWorkspaceWithResult({
          name: t("workflows.useMenu.workspaceName", { name: workflowName }),
          loadUserMemory: true
        });
        const runtime = workspaceRuntimeFromOpenResult(result);
        if (!runtime) {
          toastWorkspaceOpenResult(result, t);
          return;
        }
        await navigateWithWorkflow(runtime.workspaceId, workflowId);
        trackComfyUiWorkflowCatalogAction("workflows_page", "use_new_workspace", workflowId);
      } catch (error) {
        dedupedToast.error(
          t("workflows.addFailed", {
            message: error instanceof Error ? error.message : String(error)
          })
        );
      }
    },
    [ensureWorkflowModelsReady, navigateWithWorkflow, t]
  );
  const handleUseExistingWorkspace = reactExports.useCallback(
    (workflowId, path, workflow) => {
      void (async () => {
        if (workflow && !await ensureWorkflowModelsReady(workflow)) return;
        return stageWorkspacePreview({
          hiloApp: homeService.hiloApp,
          folderPath: path,
          t,
          onStaged: (entry) => {
            trackComfyUiWorkflowCatalogAction(
              "workflows_page",
              "use_existing_workspace",
              workflowId
            );
            return navigateWithWorkflow(entry.workspaceId, workflowId);
          }
        });
      })().catch((error) => {
        dedupedToast.error(
          t("workflows.addFailed", {
            message: error instanceof Error ? error.message : String(error)
          })
        );
      });
    },
    [ensureWorkflowModelsReady, navigateWithWorkflow, t]
  );
  const handleConfirmDownload = reactExports.useCallback(
    (modelsDirectory, discoveredModelDirectories, preferSilentLocalReuse) => {
      const workflow = downloadWorkflow;
      if (!workflow || workflow.source !== "official") {
        return;
      }
      const workflowId = workflow.id;
      const modelDependencies = workflow.modelDependencies ?? [];
      setDownloadWorkflow(null);
      void (async () => {
        let stage = "model_prepare";
        const startedAt = Date.now();
        try {
          const queued = await homeService.comfyUiModelDownload.prepareWorkflow({
            workflowId,
            workflowTitle: workflowDisplayName(workflow),
            models: modelDependencies,
            modelsDirectory,
            discoveredModelDirectories,
            preferSilentLocalReuse
          });
          const completed = await homeService.comfyUiModelDownload.waitForTask(queued.id);
          if (completed.status === "cancelled") return;
          if (!isWorkflowModelPreparationComplete(completed)) {
            throw new Error(completed.error || "工作流仍有不可用模型");
          }
          stage = "workflow_install";
          const response = await gatewayFetch2(API_PATHS.comfyUiWorkflowInstall(workflowId), {
            method: "POST"
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          trackComfyUiWorkflowInstall("workflows_page", startedAt);
          notifyComfyWorkflowsChanged();
        } catch (error) {
          trackComfyUiWorkflowInstallFailed("workflows_page", startedAt, stage);
          dedupedToast.error(
            t("chat.workflow.prepareFailed", {
              message: error instanceof Error ? error.message : String(error)
            })
          );
        }
      })();
    },
    [downloadWorkflow, gatewayFetch2, t]
  );
  const handleDeleteWorkflow = reactExports.useCallback(
    async (workflow) => {
      try {
        const response = await gatewayFetch2(API_PATHS.comfyUiWorkflowDelete(workflow.id), {
          method: "DELETE"
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (detailWorkflow?.id === workflow.id) setDetailWorkflow(null);
        notifyComfyWorkflowsChanged();
        trackComfyUiWorkflowCatalogAction("workflows_page", "delete_success", workflow.id);
        dedupedToast.success(t("workflows.delete.success"));
      } catch (error) {
        trackComfyUiWorkflowCatalogAction("workflows_page", "delete_failed", workflow.id);
        dedupedToast.error(
          t("workflows.delete.failed", {
            message: error instanceof Error ? error.message : String(error)
          })
        );
        throw error;
      }
    },
    [detailWorkflow?.id, gatewayFetch2, t]
  );
  const handleOpenModelsFolder = reactExports.useCallback(() => {
    void homeService.comfyUiModelDownload.openModelsFolder().catch(() => {
      dedupedToast.error(t("workflows.openModelsFolderFailed"));
    });
  }, [t]);
  const handleOpenWorkflowsFolder = reactExports.useCallback(() => {
    void homeService.comfyUiModelDownload.openWorkflowsFolder().catch(() => {
      dedupedToast.error(t("workflows.openWorkflowsFolderFailed"));
    });
  }, [t]);
  const detailWorkflowId = detailWorkflow?.id;
  const renderDetailView = (embedded = false) => {
    if (!detailWorkflow) return null;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      WorkflowDetailView,
      {
        workflow: detailWorkflow,
        nodeLabel: t("workflows.nodes"),
        onBack: handleCloseDetail,
        embedded,
        ...detailWorkflowId ? {
          completedAction: /* @__PURE__ */ jsxRuntimeExports.jsx(
            WorkflowUseMenu,
            {
              workflowId: detailWorkflowId,
              recentWorkspaces,
              unavailablePaths: unavailableWorkspacePaths,
              onCreate: () => {
                void handleUseInNewWorkspace(
                  detailWorkflowId,
                  detailWorkflow.displayName || detailWorkflow.name,
                  detailWorkflow
                );
              },
              onSelect: (path) => handleUseExistingWorkspace(detailWorkflowId, path, detailWorkflow)
            }
          )
        } : {},
        ...detailWorkflow.source === "official" && detailWorkflow.installed !== true ? { onDownload: () => setDownloadWorkflow(detailWorkflow) } : {}
      },
      detailWorkflow.id
    );
  };
  const renderWorkflowCard = (workflow, layout = "grid") => {
    if (activeTab === "mine" && workflow.source === "user") {
      const canViewDetails = isInstalledFeaturedWorkflow(workflow);
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        UserWorkflowListItem,
        {
          workflow,
          ...canViewDetails ? {
            onView: () => {
              setDetailWorkflow(workflow);
              trackComfyUiWorkflowCatalogAction("workflows_page", "view", workflow.id);
            }
          } : {},
          onDelete: handleDeleteWorkflow,
          useAction: /* @__PURE__ */ jsxRuntimeExports.jsx(
            WorkflowUseMenu,
            {
              workflowId: workflow.id,
              recentWorkspaces,
              unavailablePaths: unavailableWorkspacePaths,
              compact: true,
              onCreate: () => {
                void handleUseInNewWorkspace(workflow.id, workflowDisplayName(workflow));
              },
              onSelect: (path) => handleUseExistingWorkspace(workflow.id, path)
            }
          )
        },
        workflow.id
      );
    }
    const officialWorkflowId = workflow.source === "official" ? workflow.id : void 0;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      WorkflowCard,
      {
        workflow,
        locale: i18n.resolvedLanguage ?? i18n.language,
        metadataLabels: {
          nodes: t("workflows.nodes"),
          links: t("workflows.links"),
          nodeTypes: t("workflows.nodeTypes"),
          groups: t("workflows.groups"),
          models: t("workflows.models"),
          size: t("workflows.size"),
          updated: t("workflows.updated")
        },
        ...layout === "grid" && workflow.source === "official" ? {
          downloadLabel: t("workflows.download"),
          onDownload: () => setDownloadWorkflow(workflow)
        } : {},
        viewLabel: t("workflows.view"),
        onView: () => {
          setDetailWorkflow(workflow);
          trackComfyUiWorkflowCatalogAction("workflows_page", "view", workflow.id);
        },
        layout,
        selected: detailWorkflow?.id === workflow.id,
        ...officialWorkflowId ? {
          completedAction: /* @__PURE__ */ jsxRuntimeExports.jsx(
            WorkflowUseMenu,
            {
              workflowId: officialWorkflowId,
              recentWorkspaces,
              unavailablePaths: unavailableWorkspacePaths,
              compact: true,
              onCreate: () => {
                void handleUseInNewWorkspace(
                  officialWorkflowId,
                  workflowDisplayName(workflow),
                  workflow
                );
              },
              onSelect: (path) => handleUseExistingWorkspace(officialWorkflowId, path, workflow)
            }
          )
        } : {}
      },
      workflow.id
    );
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    detailWorkflow?.source === "user" ? renderDetailView() : /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "flex h-full flex-col overflow-y-auto bg-[var(--home-content-surface)] [scrollbar-gutter:stable]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0 px-8 pt-7 md:px-12", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "section",
        {
          className: "relative isolate overflow-hidden border-b border-border-soft pb-6",
          "data-action-ui-id": "workflows-hero",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative z-10 w-full", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              CatalogPageHeading,
              {
                className: "mt-3",
                title: t("workflows.title"),
                description: t("workflows.subtitle")
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 flex flex-wrap items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  ref: importInputRef,
                  type: "file",
                  accept: "application/json,.json",
                  className: "hidden",
                  onChange: handleImportWorkflow,
                  "data-action-ui-id": "workflows-import-input"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  DropdownMenuTrigger,
                  {
                    render: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      Button,
                      {
                        type: "button",
                        size: "lg",
                        disabled: importing,
                        className: "h-9 gap-1.5 rounded-lg pl-3.5 pr-4 text-[13px] font-medium",
                        "data-action-ui-id": "workflows-create",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: Plus, size: "md", "aria-hidden": true }),
                          t("workflows.create")
                        ]
                      }
                    )
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  DropdownMenuContent,
                  {
                    align: "start",
                    side: "bottom",
                    sideOffset: 4,
                    className: "w-64 p-1",
                    "data-action-ui-id": "workflows-create-menu",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        DropdownMenuItem,
                        {
                          disabled: importing,
                          onClick: () => importInputRef.current?.click(),
                          className: "group h-11 cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 whitespace-normal",
                          "data-action-ui-id": "workflows-create-import",
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground/70 transition-colors duration-150 group-hover:bg-background group-hover:text-foreground group-focus:bg-background group-focus:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Icon,
                              {
                                icon: importing ? LoaderCircle : Upload,
                                size: "md",
                                className: importing ? "animate-spin" : void 0,
                                "aria-hidden": true
                              }
                            ) }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 font-heading text-sm font-medium text-foreground", children: t("workflows.createMenu.import") }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Icon,
                              {
                                icon: ChevronRight,
                                size: "sm",
                                strokeWidth: 1.5,
                                className: "shrink-0 text-muted-foreground",
                                "aria-hidden": true
                              }
                            )
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        DropdownMenuItem,
                        {
                          onClick: () => void handleCreateBlankWorkflow(),
                          className: "group h-11 cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 whitespace-normal",
                          "data-action-ui-id": "workflows-create-canvas",
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground/70 transition-colors duration-150 group-hover:bg-background group-hover:text-foreground group-focus:bg-background group-focus:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: Workflow, size: "md", "aria-hidden": true }) }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 font-heading text-sm font-medium text-foreground", children: t("workflows.createMenu.canvas") })
                          ]
                        }
                      )
                    ]
                  }
                )
              ] }),
              tutorialEntry?.visible !== false ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  type: "button",
                  variant: "outline",
                  size: "lg",
                  className: "h-9 gap-1.5 rounded-lg pl-3.5 pr-4 text-[13px] font-medium",
                  onClick: () => {
                    if (tutorialEntry?.url) {
                      void openExternalUrl(platform, tutorialEntry.url, {
                        source: "workflows.tutorial"
                      });
                    } else {
                      setTutorialOpen(true);
                    }
                  },
                  "data-action-ui-id": "workflows-tutorial",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: BookOpen, size: "md", "aria-hidden": true }),
                    t("workflows.tutorial")
                  ]
                }
              ) : null
            ] })
          ] })
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-0 flex-1 flex-col px-8 pt-4 pb-10 md:px-12", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "flex min-w-0 flex-nowrap items-center gap-3 py-2",
            "data-layout-slot": "workflows-toolbar",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Tabs,
                {
                  value: activeTab,
                  className: "shrink-0",
                  onValueChange: (value) => {
                    if (value !== "official" && value !== "mine") return;
                    setActiveTab(value);
                    trackComfyUiWorkflowCatalogAction("workflows_page", "tab_switch");
                  },
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TabsList,
                    {
                      variant: "underline",
                      "aria-label": t("workflows.title"),
                      "data-action-ui-id": "workflows-tabs",
                      children: ["official", "mine"].map((tab) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                        TabsTrigger,
                        {
                          value: tab,
                          variant: "underline",
                          "data-action-ui-id": `workflows-tab-${tab}`,
                          children: t(`workflows.tabs.${tab}`)
                        },
                        tab
                      ))
                    }
                  )
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  className: "scrollbar-none flex min-w-0 flex-1 flex-nowrap items-center gap-3 overflow-x-auto overscroll-x-contain [&>*:first-child]:ml-auto",
                  "data-layout-slot": "workflows-toolbar-actions",
                  children: [
                    activeTab === "mine" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        Button,
                        {
                          type: "button",
                          variant: "outline",
                          size: "sm",
                          className: "h-8 shrink-0 gap-1.5 whitespace-nowrap px-2.5 text-[13px]",
                          onClick: () => importInputRef.current?.click(),
                          disabled: importing,
                          "data-action-ui-id": "workflows-import-button",
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Icon,
                              {
                                icon: importing ? LoaderCircle : Upload,
                                size: "sm",
                                className: importing ? "animate-spin" : void 0,
                                "aria-hidden": true
                              }
                            ),
                            t("workflows.importShort")
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          DropdownMenuTrigger,
                          {
                            render: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                              Button,
                              {
                                type: "button",
                                variant: "outline",
                                size: "sm",
                                className: "h-8 shrink-0 gap-1.5 whitespace-nowrap px-2.5 text-[13px]",
                                "data-action-ui-id": "workflows-open-folder",
                                children: [
                                  /* @__PURE__ */ jsxRuntimeExports.jsx(LocalFolderIcon, { className: "size-4", "aria-hidden": "true" }),
                                  t("workflows.openFolder")
                                ]
                              }
                            )
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          DropdownMenuContent,
                          {
                            align: "end",
                            side: "bottom",
                            sideOffset: 4,
                            className: "w-44 p-1",
                            "data-action-ui-id": "workflows-open-folder-menu",
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                DropdownMenuItem,
                                {
                                  onClick: handleOpenModelsFolder,
                                  className: "cursor-pointer gap-2",
                                  "data-action-ui-id": "workflows-open-models-folder",
                                  children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(LocalFolderIcon, { className: "size-4", "aria-hidden": "true" }),
                                    t("workflows.modelsFolder")
                                  ]
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                DropdownMenuItem,
                                {
                                  onClick: handleOpenWorkflowsFolder,
                                  className: "cursor-pointer gap-2",
                                  "data-action-ui-id": "workflows-open-workflows-folder",
                                  children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(LocalFolderIcon, { className: "size-4", "aria-hidden": "true" }),
                                    t("workflows.workflowsFolder")
                                  ]
                                }
                              )
                            ]
                          }
                        )
                      ] })
                    ] }) : null,
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "div",
                      {
                        className: "w-60 min-w-36 max-w-60 flex-1 shrink",
                        "data-layout-slot": "workflows-search-slot",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                          PageSearchInput,
                          {
                            value: search,
                            onValueChange: setSearch,
                            placeholder: t("workflows.search"),
                            clearLabel: t("common.clear"),
                            inputActionId: "workflows-search"
                          }
                        )
                      }
                    ),
                    activeTab === "official" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "div",
                      {
                        className: `grid shrink-0 place-items-center overflow-hidden transition-[width,opacity,transform] duration-200 ease-out ${detailWorkflow?.source === "official" ? "w-9 translate-x-0 scale-100 opacity-100" : "w-0 translate-x-1 scale-90 opacity-0"}`,
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Button,
                          {
                            type: "button",
                            variant: "default",
                            size: "icon-lg",
                            className: "rounded-lg transition-colors duration-150",
                            "aria-label": t("workflows.detail.collapse"),
                            "aria-hidden": detailWorkflow?.source !== "official",
                            tabIndex: detailWorkflow?.source === "official" ? 0 : -1,
                            title: t("workflows.detail.collapse"),
                            onClick: handleCloseDetail,
                            "data-action-ui-id": "workflows-detail-collapse",
                            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: X, size: "lg", strokeWidth: 2, "aria-hidden": true })
                          }
                        )
                      }
                    ) : null,
                    query.error ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      Button,
                      {
                        variant: "ghost",
                        size: "sm",
                        className: "shrink-0 whitespace-nowrap",
                        onClick: query.retry,
                        "data-action-ui-id": "workflows-retry",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(RetryIcon, { size: 14 }),
                          t("common.retry")
                        ]
                      }
                    ) : null
                  ]
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: `mt-2 flex min-h-0 flex-1 flex-col ${TAB_CONTENT_ENTER_CLASS_NAME}`,
            "data-layout-slot": "workflows-tab-content",
            children: [
              activeTab === "mine" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ComfyUiModelDownloadSection, {}) : null,
              query.loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center py-20 text-muted-foreground", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 18, className: "animate-spin" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-xs", children: t("workflows.loading") })
              ] }) : query.error && activeTab === "official" ? /* @__PURE__ */ jsxRuntimeExports.jsx(PageStateBoundary, { error: true, className: "min-h-80" }) : filteredWorkflows.length === 0 && activeTab === "mine" && hasActiveDownloads ? null : filteredWorkflows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                PageStateBoundary,
                {
                  empty: true,
                  className: "min-h-80",
                  emptyOptions: {
                    title: search.trim() ? t("workflows.noMatch") : t(`workflows.empty.${activeTab}`),
                    description: t(
                      search.trim() ? "workflows.searchEmptyDescription" : activeTab === "mine" ? "workflows.empty.mineDescription" : "workflows.empty.officialDescription"
                    ),
                    actions: activeTab === "mine" ? [
                      {
                        key: "empty-import",
                        label: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-action-ui-id": "workflows-empty-import", children: t("workflows.import") }),
                        variant: "default",
                        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { size: 14, strokeWidth: 1.5 }),
                        onClick: () => importInputRef.current?.click(),
                        disabled: importing
                      }
                    ] : []
                  }
                }
              ) : activeTab === "official" && detailWorkflow?.source === "official" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  ref: inlineBrowserRef,
                  className: "grid h-[calc(100vh-19rem)] min-h-[35rem] translate-x-0 grid-cols-[minmax(0,1fr)_clamp(10rem,22vw,18rem)] gap-4 opacity-100",
                  "data-action-ui-id": "workflows-inline-browser",
                  children: [
                    renderDetailView(true),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(WorkflowDetailRail, { ariaLabel: t("workflows.tabs.official"), children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: filteredWorkflows.map((workflow) => renderWorkflowCard(workflow, "rail")) }) })
                  ]
                },
                "workflow-detail-browser"
              ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: activeTab === "mine" ? "grid grid-cols-1 gap-3 lg:grid-cols-2" : "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
                  children: filteredWorkflows.map((workflow) => renderWorkflowCard(workflow))
                },
                "workflow-card-grid"
              )
            ]
          },
          `workflows-tab-content-${activeTab}`
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      WorkflowDownloadConfirmDialog,
      {
        workflow: downloadWorkflow,
        onOpenChange: (open) => {
          if (!open) setDownloadWorkflow(null);
        },
        onConfirm: handleConfirmDownload
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(WorkflowTutorialDialog, { open: tutorialOpen, onOpenChange: setTutorialOpen })
  ] });
}
const SplitComponent = WorkflowsPage;
export {
  SplitComponent as component
};
