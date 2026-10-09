// 首页的项目选择器、提示词预填、随机灵感的桥接组件。
import { h as useTranslation, r as reactExports, j as jsxRuntimeExports, Q as Plus, X, gx as useProjects, lw as useCreateProjectAndSelect, ae as DropdownMenu, gt as TooltipProvider, gu as Tooltip, gv as TooltipTrigger, af as DropdownMenuTrigger, f5 as Users, cI as FolderMinus, bE as ChevronDown, gw as TooltipContent, ah as DropdownMenuContent, ai as DropdownMenuItem, aF as Folder, lx as DropdownMenuSeparator, gN as CreateProjectDialog, ly as subscribePromptPrefill, lz as getPromptPrefillRequest, lA as useMentionModels, lB as completePromptPrefill, lC as claimPromptPrefill, lD as resolveModelPricingName, lL as subscribeRandomInspiration, lM as getRandomInspirationRequest, lN as getRandomInspirationQueryIds, lO as completeRandomInspiration } from "../main.jsx";
import { __jsx } from "./jsx-runtime.js";
export function HomeProjectPicker({
  selectedProjectId,
  onChange
}) {
  const {
    t
  } = useTranslation();
  const projects = useProjects({
    sortMode: "updated"
  });
  const selected = projects.find(project => project.id === selectedProjectId);
  const [createDialogOpen, setCreateDialogOpen] = reactExports.useState(false);
  const triggerClass = "flex h-[var(--btn-height-sm)] cursor-pointer items-center gap-[var(--home-input-control-content-gap)] rounded-full px-[var(--home-input-toolbar-padding-x)] py-0 text-[length:var(--home-input-toolbar-font-size)] font-normal leading-5 tracking-[var(--home-input-toolbar-letter-spacing)] text-foreground/60 transition-colors duration-75 hover:bg-[var(--message-input-control-hover)] hover:text-foreground";
  const handleCreateProject = useCreateProjectAndSelect(projectId => {
    onChange(projectId);
    setCreateDialogOpen(false);
  });
  return <div className="flex min-w-0 items-center"><DropdownMenu><TooltipProvider><Tooltip><TooltipTrigger render={<DropdownMenuTrigger data-action-ui-id="home-project-btn" className={`${triggerClass} max-w-[180px]`}>{selected?.kind === "team" ? <Users size={16} strokeWidth={1.5} className="shrink-0" /> : <FolderMinus size={16} strokeWidth={1.5} className="shrink-0" />}<span className="truncate">{selected?.name ?? t("project.selectRow.pickLabel")}</span><ChevronDown size={13} strokeWidth={1.5} className="shrink-0 opacity-60" /></DropdownMenuTrigger>} /><TooltipContent side="top" sideOffset={12} className="max-w-64">{t("project.selectRow.hint")}</TooltipContent></Tooltip></TooltipProvider><DropdownMenuContent align="start" alignOffset={-2} side="top" sideOffset={6} className="min-w-44 max-w-72 text-[13px] font-normal text-foreground/70">{projects.length === 0 ? <p className="px-2.5 py-1.5 whitespace-nowrap text-foreground/70">{t("project.noProjects")}</p> : <div className="max-h-56 overflow-y-auto">{projects.map(project => <DropdownMenuItem key={project.id} onClick={() => onChange(project.id)} className="text-[13px] font-normal text-foreground/70">{project.kind === "team" ? <Users size={14} strokeWidth={1.5} /> : <Folder size={14} strokeWidth={1.5} />}<span className="min-w-0 flex-1 truncate">{project.name}</span></DropdownMenuItem>)}</div>}<DropdownMenuSeparator /><DropdownMenuItem data-action-ui-id="home-project-create" onClick={() => setCreateDialogOpen(true)} className="text-[13px] font-normal text-foreground/70"><Plus size={16} strokeWidth={1.5} /><span>{t("project.create.trigger")}</span></DropdownMenuItem></DropdownMenuContent></DropdownMenu>{selected ? <button type="button" data-action-ui-id="home-project-clear-btn" onClick={() => onChange(void 0)} aria-label={t("common.clear")} className="flex size-[var(--btn-height-sm)] cursor-pointer items-center justify-center rounded-full text-foreground/50 transition-colors duration-75 hover:bg-[var(--message-input-control-hover)] hover:text-foreground"><X size={14} strokeWidth={1.5} /></button> : null}<CreateProjectDialog open={createDialogOpen} kind="local" onConfirm={handleCreateProject} onOpenChange={setCreateDialogOpen} /></div>;
}
function resolvePromptPrefillModel(models, id) {
  const exact = models.filter(model => model.id === id);
  const aliases = exact.length ? exact : models.filter(model => model.mention_name === id || model.model_name === id);
  const pricingName = resolveModelPricingName(id);
  const matches = aliases.length ? aliases : models.filter(model => resolveModelPricingName(model.id) === pricingName);
  return matches.length === 1 && matches[0].visibility !== "hidden" ? matches[0] : void 0;
}
function promptPrefillMention(model) {
  return {
    path: model.id,
    name: model.display_name,
    modelName: model.model_name,
    mentionName: model.mention_name ?? model.model_name,
    kind: "model",
    mediaType: model.type,
    thumbUrl: model.icon_url || null,
    previewUrl: null,
    mediaUrl: null
  };
}
export function HomePromptPrefillBridge({
  onPrefill
}) {
  const request = reactExports.useSyncExternalStore(subscribePromptPrefill, getPromptPrefillRequest);
  const {
    data: models,
    isPending,
    isError
  } = useMentionModels();
  const handler = reactExports.useRef(onPrefill);
  handler.current = onPrefill;
  const mounted = reactExports.useRef(false);
  const currentRequest = reactExports.useRef(request);
  currentRequest.current = request;
  reactExports.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const pending = currentRequest.current;
      queueMicrotask(() => {
        if (!mounted.current && pending) completePromptPrefill(pending.id, false);
      });
    };
  }, []);
  reactExports.useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    let disposed = false;
    let claimed = false;
    const abort = () => {
      controller.abort();
      completePromptPrefill(request.id, false);
    };
    request.signal?.addEventListener("abort", abort, {
      once: true
    });
    queueMicrotask(async () => {
      if (disposed) return;
      if (request.signal?.aborted) {
        abort();
        return;
      }
      if (isPending && !isError) return;
      if (!claimPromptPrefill(request.id)) return;
      claimed = true;
      const model = !isError && models && resolvePromptPrefillModel(models, request.modelId);
      if (!model) {
        completePromptPrefill(request.id, false);
        return;
      }
      try {
        const success = await handler.current(request.prompt, {
          mention: promptPrefillMention(model),
          signal: controller.signal
        });
        completePromptPrefill(request.id, success === true && !controller.signal.aborted);
      } catch {
        completePromptPrefill(request.id, false);
      }
    });
    return () => {
      disposed = true;
      request.signal?.removeEventListener("abort", abort);
      controller.abort();
      if (claimed) completePromptPrefill(request.id, false);
    };
  }, [request, models, isPending, isError]);
  return null;
}
const DEFAULT_INSPIRATION_QUERY_IDS = ["hand-drawn-laundromat-encounter", "gan-charger-ad"];
function pickRandomInspiration(collections, random = Math.random, queryIds) {
  const allowedIds = new Set(queryIds?.length ? queryIds : DEFAULT_INSPIRATION_QUERY_IDS);
  const seen = new Set();
  const candidates = collections.flatMap(collection => collection.items.flatMap(item => {
    if (!item.canUseAction || item.action.kind !== "query") return [];
    if (!allowedIds.has(item.action.query.id)) return [];
    const key = `${item.action.sceneId}:${item.action.query.id}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      collectionId: collection.id,
      item
    }];
  }));
  return candidates.length ? candidates[Math.floor(random() * candidates.length)] : void 0;
}
export function HomeRandomInspirationBridge({
  collections,
  loading,
  enabled,
  onSelect
}) {
  const request = reactExports.useSyncExternalStore(subscribeRandomInspiration, getRandomInspirationRequest);
  reactExports.useEffect(() => {
    if (request === null || loading) return;
    const selected = enabled ? pickRandomInspiration(collections, Math.random, getRandomInspirationQueryIds(request)) : void 0;
    if (!completeRandomInspiration(request, Boolean(selected)) || !selected) return;
    onSelect(selected.item, selected.collectionId);
  }, [collections, enabled, loading, onSelect, request]);
  return null;
}
