/**
 * v3 画布用到的 hooks —— 从产物主包逐条取回（第 73 轮）。
 *
 * 大部分只依赖 React 和树里已有的东西；少数还引用别的未还原名字（见文件末尾清单）。
 */
import reactExports from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { dedupedToast } from "../infra/agent-http-client.js";
import { MAX_VISIBLE_CANVAS_TAG_COLORS } from "../infra/parse-connector-selection.js";
import { AuthContext, accountScopeKey, useOptionalTeamAccount } from "../assets/credit-query-keys.jsx";
import { WorkspaceChatStoreContext } from "../assets/use-canvas-model-registry-hydration.js";
import { EMPTY_GUIDES, createAlignmentGuidesStore, getAlignmentReferenceIds } from "../canvas/get-alignment-reference-ids.js";
import { resolveNodeAlignmentSnap } from "../canvas/resolve-node-alignment-snap.js";
import { PROJECT_RESOURCE_READ_BATCH_LIMIT, ProjectResourceKind } from "../chat/composition-lifecycle.jsx";
import { PROMPT_FONT_SIZE_DEFAULT } from "../generation/prompt-font-size.js";
import { useGatewayScope } from "../infra/runtime-config.js";
import { usePlatform } from "../infra/platform-context.js";
import { useStoreApi } from "../vendor-fork/xyflow/react/index.js";
import { SubtitleEditorStore } from "./subtitle-editor-store.js";
import {
  CanvasImageWorkContext,
  CanvasV3HostServicesContext,
  CanvasV3WorkbenchBridgeContext,
  ExpansionContext,
  WorkbenchContext,
  WorkspaceResultNavigationContext,
  WorkspaceStructureContext,
} from "./contexts.js";
import { getMediaMuted, subscribeMute, toggle, isCompactEditorBlank } from "./media-mute.js";
import { pickerMediaKey, videoPosterUrl, probeMedia } from "./media-helpers.js";
import { PROJECT_RESOURCE_TAG_HTTP_ROUTES, parseProjectResourceTagSnapshot } from "./project-resource-tags.js";
import { intersectsViewport } from "./geometry.js";
import { resourceQueryKeys } from "./query-keys.js";
import { useResourceCommand } from "./project-command.js";
import { fetchGatewayPoster, fetchResourceMediaBlob } from "./routes-and-media-fetch.js";
import { createImageWorkScheduler } from "./image-work-scheduler.js";
import { createResourceCurrentVersionCommand } from "./resource-commands.js";
import { createProjectResourceClient } from "./project-resource-client.js";
import { createDesktopCanvasV3HostServices } from "./desktop-host-services.js";
import { homeService } from "../workspace/home-service.jsx";
import {
  registerWorkspaceCanvasPersistence,
  reportWorkspaceCanvasPersistence,
} from "./workspace-canvas-persistence.js";
import { promptFontSizePreference } from "./prompt-font-size-preference.js";

// ==== 仍缺、需要后续还原后补进来的名字 ====
// CanvasImageWorkContext, CanvasV3HostServicesContext, CanvasV3WorkbenchBridgeContext,
// ExpansionContext, WorkbenchContext, WorkspaceResultNavigationContext, WorkspaceStructureContext,
// PROJECT_RESOURCE_TAG_HTTP_ROUTES, billingScope, cacheOwner, createDesktopCanvasV3HostServices,
// createImageWorkScheduler, createProjectResourceClient, createResourceCurrentVersionCommand,
// fetchGatewayPoster, fetchResourceMediaBlob, getMediaMuted, isCompactEditorBlank,
// parseProjectResourceTagSnapshot, pickerMediaKey, probeMedia, useGate, useLocalPromptFontSize,
// usePreference, useProps, useQuery, useResourceCommand, useSaveFiles, videoPosterUrl

function useCanvasImageWorkScheduler() {
  const scheduler = reactExports.useContext(CanvasImageWorkContext);
  if (scheduler) return scheduler;
  if (!standaloneScheduler) standaloneScheduler = createImageWorkScheduler();
  return standaloneScheduler;
}

function useCanvasImageWorkScope(active2, continueDuringInteraction = false) {
  const scheduler = reactExports.useMemo(
    () => createImageWorkScheduler(void 0, { continueDuringInteraction }),
    [continueDuringInteraction]
  );
  const motion2 = reactExports.useRef({ pan: false, drag: false });
  const setMotion2 = reactExports.useCallback(
    (kind2, moving) => {
      motion2.current[kind2] = moving;
      scheduler.setInteracting(motion2.current.pan || motion2.current.drag);
    },
    [scheduler]
  );
  reactExports.useEffect(() => {
    scheduler.setActive(active2);
    if (!active2) {
      motion2.current = { pan: false, drag: false };
      scheduler.setInteracting(false);
    }
  }, [active2, scheduler]);
  reactExports.useEffect(
    () => () => {
      scheduler.setActive(false);
      scheduler.clear();
      motion2.current = { pan: false, drag: false };
      scheduler.setInteracting(false);
    },
    [scheduler]
  );
  return reactExports.useMemo(() => ({ scheduler, setMotion: setMotion2 }), [scheduler, setMotion2]);
}

function useCanvasV3DialogProps(props) {
  const useProps = useCanvasV3HostServices().useDialogProps ?? passDialogProps;
  return useProps(props);
}

function useCanvasV3HostServices() {
  return reactExports.useContext(CanvasV3HostServicesContext);
}

function useCanvasV3ModalGate(requested) {
  const useGate = useCanvasV3HostServices().useModalGate ?? passModalGate;
  return useGate(requested);
}

function useCanvasV3PickerMedia(fetch2, scope, references) {
  const client = reactExports.useMemo(() => fetch2 ? createProjectResourceClient(fetch2) : void 0, [fetch2]);
  const keys2 = reactExports.useMemo(
    () => JSON.stringify(
      [
        ...new Set(
          references.filter((ref) => ref.resourceId && ref.versionId).map(pickerMediaKey)
        )
      ].sort()
    ),
    [references]
  );
  const cacheOwner = reactExports.useMemo(
    () => ({ client, scope, values: /* @__PURE__ */ new Map() }),
    [client, scope]
  );
  const cache2 = cacheOwner.values;
  const owner = reactExports.useMemo(
    () => ({ client, fetch: fetch2, scope, keys: keys2, cache: cache2 }),
    [client, fetch2, scope, keys2, cache2]
  );
  const [snapshot2, setSnapshot] = reactExports.useState();
  reactExports.useEffect(() => {
    const client2 = owner.client;
    const request = owner.fetch;
    if (!client2 || !request) return;
    const abort = new AbortController();
    const selectors2 = JSON.parse(owner.keys).filter((key2) => !owner.cache.has(key2)).map((key2) => {
      const [resourceId2, versionId] = JSON.parse(key2);
      return { resourceId: resourceId2, versionId };
    });
    const values2 = owner.cache;
    void (async () => {
      for (let start2 = 0; start2 < selectors2.length && !abort.signal.aborted; start2 += PROJECT_RESOURCE_READ_BATCH_LIMIT) {
        const batch2 = selectors2.slice(start2, start2 + PROJECT_RESOURCE_READ_BATCH_LIMIT);
        try {
          const reads = await client2.getResources(batch2, { signal: abort.signal });
          if (abort.signal.aborted) return;
          const requested = new Set(batch2.map(pickerMediaKey));
          const unmeasured = [];
          for (const read of reads ?? []) {
            if (!read?.ok || !read.detail.version) continue;
            const ref = {
              resourceId: read.detail.resource.resourceId,
              versionId: read.detail.version.versionId
            };
            const key2 = pickerMediaKey(ref);
            if (!requested.has(key2)) continue;
            const media2 = read.detail.metadata?.media;
            if (media2) values2.set(key2, media2);
            if ((read.detail.resource.kind === ProjectResourceKind.VIDEO || read.detail.resource.kind === ProjectResourceKind.AUDIO) && !(typeof media2?.durationSeconds === "number" && media2.durationSeconds > 0))
              unmeasured.push(ref);
          }
          setSnapshot({ owner, values: new Map(values2) });
          for (const ref of unmeasured) {
            if (abort.signal.aborted) return;
            try {
              const measured = await probeMedia(request, ref, abort.signal);
              if (abort.signal.aborted) return;
              if (measured) {
                values2.set(pickerMediaKey(ref), measured);
                setSnapshot({ owner, values: new Map(values2) });
              }
            } catch {
            }
          }
        } catch {
        }
      }
    })();
    return () => abort.abort();
  }, [owner]);
  return snapshot2?.owner === owner ? snapshot2.values : cache2;
}

function useCanvasV3PickerTags(fetch2, enabled) {
  const [snapshot2, setSnapshot] = reactExports.useState();
  reactExports.useEffect(() => {
    setSnapshot(void 0);
    if (!enabled) return;
    const controller = new AbortController();
    void Promise.resolve().then(
      () => fetch2(PROJECT_RESOURCE_TAG_HTTP_ROUTES.get, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        signal: controller.signal
      })
    ).then(async (response) => {
      if (!response.ok) throw new Error("CANVAS_V3_PICKER_TAGS_UNAVAILABLE");
      const next2 = parseProjectResourceTagSnapshot(await response.json());
      if (!controller.signal.aborted) setSnapshot(next2);
    }).catch(() => {
    });
    return () => controller.abort();
  }, [fetch2, enabled]);
  return snapshot2;
}

function useCanvasV3PromptFontSize() {
  const usePreference = useCanvasV3HostServices().usePromptFontSize ?? useLocalPromptFontSize;
  return usePreference();
}
async function canvasV3GuardGeneration(guard) {
  if (!guard) return false;
  try {
    return await guard() === true;
  } catch {
    return false;
  }
}

function useCanvasV3SaveFiles() {
  const useSaveFiles = useCanvasV3HostServices().useSaveFiles ?? noSaveFiles;
  return useSaveFiles();
}

function useCanvasV3Text(storage2, source) {
  const [attempt, setAttempt] = reactExports.useState(0);
  const key2 = source ? `${source.resourceId}:${source.versionId}:${source.contentRevision ?? 1}:${attempt}` : "";
  const [state2, setState] = reactExports.useState();
  const resourceId2 = source?.resourceId;
  const versionId = source?.versionId;
  const contentRevision = source?.contentRevision;
  reactExports.useEffect(() => {
    if (!resourceId2 || !versionId || !storage2) return;
    const abort = new AbortController();
    void storage2.load(
      { resourceId: resourceId2, versionId, ...contentRevision === void 0 ? {} : { contentRevision } },
      abort.signal
    ).then(
      (markdown2) => {
        if (!abort.signal.aborted) setState({ key: key2, storage: storage2, markdown: markdown2, error: null });
      },
      (error) => {
        if (!abort.signal.aborted) setState({ key: key2, storage: storage2, markdown: "", error });
      }
    );
    return () => abort.abort();
  }, [storage2, key2, resourceId2, versionId, contentRevision]);
  const current2 = state2?.key === key2 && state2.storage === storage2 ? state2 : void 0;
  return {
    markdown: source ? current2?.markdown ?? "" : "",
    loaded: !source || Boolean(current2 && !current2.error),
    error: current2?.error,
    retry: () => setAttempt((value) => value + 1)
  };
}

function useCanvasV3WorkbenchBridge() {
  return reactExports.useContext(CanvasV3WorkbenchBridgeContext);
}

function useCompactNodeDrag(anchor2, expanded, selected2) {
  const [previewSuppressed, setPreviewSuppressed] = reactExports.useState(false);
  const selectedRef = reactExports.useRef(selected2);
  const gestureActiveRef = reactExports.useRef(false);
  selectedRef.current = selected2;
  reactExports.useLayoutEffect(() => {
    if (!selected2 && !gestureActiveRef.current) setPreviewSuppressed(false);
  }, [selected2]);
  reactExports.useLayoutEffect(() => {
    const element2 = anchor2.current;
    if (!element2 || expanded) return;
    const surface = element2.closest(".react-flow__node") ?? element2;
    let disposeGesture;
    const handlePress = (event) => {
      if (event.button !== 0 || !isCompactEditorBlank(event)) return;
      disposeGesture?.();
      gestureActiveRef.current = true;
      setPreviewSuppressed((suppressed) => suppressed || !selectedRef.current);
      disposeGesture = allowCompactNodeDrag(element2, {
        startEvent: { clientX: event.clientX, clientY: event.clientY },
        surface,
        onRelease: (moved) => {
          gestureActiveRef.current = false;
          if (!moved) setPreviewSuppressed(false);
        },
        onCancel: () => {
          gestureActiveRef.current = false;
        }
      });
    };
    surface.addEventListener("pointerdown", handlePress, true);
    return () => {
      surface.removeEventListener("pointerdown", handlePress, true);
      disposeGesture?.();
    };
  }, [anchor2, expanded]);
  return { previewSuppressed, showPreview: () => setPreviewSuppressed(false) };
}

function useComposerExpansion() {
  const local = reactExports.useState(false);
  return reactExports.useContext(ExpansionContext) ?? local;
}

function useDesignResourceScope() {
  const scope = useGatewayScope();
  const auth = reactExports.useContext(AuthContext);
  const account = useOptionalTeamAccount();
  const billingScope = accountScopeKey(account?.activeScope ?? null);
  const scopeKey = JSON.stringify([
    scope.scopeKey,
    scope.gatewayBinding?.instanceId,
    scope.gatewayBinding?.generation,
    auth?.user?.userID,
    billingScope
  ]);
  const ready2 = scope.gatewayReady && scope.scopeKey !== "app" && !!auth?.user?.userID && (!account?.integrationEnabled || account.accountDataVisible && billingScope !== null);
  return { scopeKey, ready: ready2 };
}

function useDesktopCanvasV3HostServices() {
  const platform2 = usePlatform();
  const { scopeKey: workspaceId, gatewayBinding } = useGatewayScope();
  return reactExports.useMemo(
    () => createDesktopCanvasV3HostServices(platform2, workspaceId, gatewayBinding),
    [platform2, workspaceId, gatewayBinding]
  );
}

function useGroupingIntroCandidate(scope) {
  return reactExports.useSyncExternalStore(
    subscribe,
    () => candidates.get(scope) ?? null,
    () => null
  );
}

function useMediaMuted() {
  return {
    muted: reactExports.useSyncExternalStore(subscribeMute, getMediaMuted, () => false),
    toggle
  };
}

function useNodeAlignmentSnap(enabled) {
  const flowStore = useStoreApi();
  const guidesStore = reactExports.useMemo(createAlignmentGuidesStore, []);
  const session = reactExports.useRef(null);
  const clear = reactExports.useCallback(() => {
    session.current = null;
    if (guidesStore.getState().guides.length > 0) {
      guidesStore.setState({ guides: EMPTY_GUIDES });
    }
  }, [guidesStore]);
  const resolve = reactExports.useCallback(
    (input) => {
      if (!enabled) {
        clear();
        return void 0;
      }
      const state2 = flowStore.getState();
      if (session.current?.source !== input.referenceBounds) {
        session.current = {
          source: input.referenceBounds,
          referenceIds: getAlignmentReferenceIds(
            Array.from(state2.nodeLookup.values(), (node2) => ({
              id: node2.id,
              parentId: node2.parentId,
              type: node2.type,
              data: node2.data,
              hidden: node2.hidden,
              collapsed: node2.className?.includes("canvas-group-collapsed"),
              ...node2.internals.positionAbsolute,
              width: node2.measured.width ?? 0,
              height: node2.measured.height ?? 0
            })),
            input.draggedIds
          ),
          locks: {}
        };
      }
      const [x2, y4, zoom2] = state2.transform;
      const viewport = {
        x: -x2 / zoom2,
        y: -y4 / zoom2,
        width: state2.width / zoom2,
        height: state2.height / zoom2
      };
      const references = [];
      const bounds = { x: 0, y: 0, width: 0, height: 0 };
      for (const id2 of session.current.referenceIds) {
        const node2 = state2.nodeLookup.get(id2);
        if (!node2 || node2.hidden || node2.className?.includes("canvas-group-collapsed")) continue;
        bounds.x = node2.internals.positionAbsolute.x;
        bounds.y = node2.internals.positionAbsolute.y;
        bounds.width = node2.measured.width ?? 0;
        bounds.height = node2.measured.height ?? 0;
        if (intersectsViewport(bounds, viewport)) references.push({ id: id2, ...bounds });
      }
      const result = resolveNodeAlignmentSnap(
        {
          movingBounds: input.movingBounds,
          references,
          viewport,
          zoom: zoom2,
          bypass: input.bypass
        },
        session.current.locks
      );
      session.current.locks = result.locks;
      if (result.guides.length > 0 || guidesStore.getState().guides.length > 0) {
        guidesStore.setState({ guides: result.guides, transform: state2.transform });
      }
      return { delta: result.delta };
    },
    [clear, enabled, flowStore, guidesStore]
  );
  reactExports.useEffect(() => {
    if (!enabled) clear();
    window.addEventListener("blur", clear);
    const unsubscribe = flowStore.subscribe((state2, previous2) => {
      if (state2.transform !== previous2.transform && guidesStore.getState().guides.length > 0) {
        guidesStore.setState({ guides: EMPTY_GUIDES });
      }
    });
    return () => {
      window.removeEventListener("blur", clear);
      unsubscribe();
      clear();
    };
  }, [clear, enabled, flowStore, guidesStore]);
  return { resolve, clear, guidesStore };
}

function useOptionalWorkspaceStructure() {
  return reactExports.useContext(WorkspaceStructureContext);
}

function usePromptFontSizePreference() {
  const fontSize = reactExports.useSyncExternalStore(
    promptFontSizePreference.subscribe,
    promptFontSizePreference.getSnapshot,
    () => PROMPT_FONT_SIZE_DEFAULT
  );
  return [fontSize, promptFontSizePreference.setFontSize];
}

function useResourcePreviewQuery(input) {
  const { queries, scopeKey } = useWorkbench();
  return useQuery({
    networkMode: "always",
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Number.POSITIVE_INFINITY,
    enabled: queries.available && input !== null,
    // Lives under the resources domain so bindWorkbenchCache's
    // resources-invalidated fanout also drops stale previews.
    queryKey: [...resourceQueryKeys.all(scopeKey), "preview", input],
    queryFn: ({ signal }) => {
      if (!input) throw new Error("resource preview requires a committed version");
      return queries.query("resource_preview", input, { signal });
    }
  });
}

function useSetCurrentVersion({
  resourceId: resourceId2,
  expectedCurrentVersionId,
  onCommitted
}) {
  const runtime = useWorkbench();
  const command2 = useResourceCommand();
  const lastCommitted = reactExports.useRef(void 0);
  const submitted = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (command2.outcome?.status === "committed" && lastCommitted.current !== command2.outcome) {
      lastCommitted.current = command2.outcome;
      runtime.invalidateResources();
      const selection2 = submitted.current;
      if (selection2?.commandId === command2.outcome.receipt.commandId && selection2.resourceId === resourceId2)
        onCommitted?.(selection2.versionId);
    }
  }, [command2.outcome, runtime, onCommitted, resourceId2]);
  const setCurrentVersion = reactExports.useCallback(
    (versionId) => {
      const commandId = crypto.randomUUID();
      const accepted2 = command2.submit(
        createResourceCurrentVersionCommand({
          commandId,
          resourceId: resourceId2,
          versionId,
          expectedCurrentVersionId: expectedCurrentVersionId ?? ""
        })
      );
      if (accepted2) submitted.current = { commandId, resourceId: resourceId2, versionId };
    },
    [command2, resourceId2, expectedCurrentVersionId]
  );
  return {
    setCurrentVersion,
    isPending: command2.isPending || command2.awaitingReplay || Boolean(command2.blockedByRecovery),
    failed: Boolean(command2.outcome && command2.outcome.status !== "committed"),
    awaitingReplay: command2.awaitingReplay,
    replay: command2.replay
  };
}

function useVersionMediaSource(resourceId2, versionId, kind2, isEnabled = true) {
  const { host, scopeKey } = useWorkbench();
  const [entry, setEntry] = reactExports.useState(void 0);
  const enabled = isEnabled && kind2 !== "other" && Boolean(kind2 === "image" ? host.media?.readImage : host.canvas?.request);
  const query = useQuery({
    queryKey: [scopeKey, "media-source", resourceId2, versionId],
    queryFn: async ({ signal }) => {
      return fetchResourceMediaBlob(
        host,
        resourceId2,
        versionId,
        kind2,
        signal
      );
    },
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    networkMode: "always",
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
  reactExports.useEffect(() => {
    const blob = query.data;
    if (!blob) {
      setEntry(void 0);
      return;
    }
    const url2 = URL.createObjectURL(blob);
    setEntry({ blob, url: url2 });
    return () => {
      URL.revokeObjectURL(url2);
      setEntry((current2) => current2?.url === url2 ? void 0 : current2);
    };
  }, [query.data]);
  if (kind2 === "other") {
    return { src: void 0, isLoading: false, isError: false };
  }
  const src = entry && entry.blob === query.data ? entry.url : void 0;
  return {
    src,
    // Bytes that arrived but have no URL yet are still loading, not unavailable.
    isLoading: query.isLoading || query.data !== void 0 && src === void 0,
    isError: query.isError
  };
}

function useVideoPoster(src) {
  const reader = useCanvasV3HostServices().readVideoPoster;
  const [attempt, setAttempt] = reactExports.useState(0);
  const [poster, setPoster] = reactExports.useState();
  const [duration, setDuration] = reactExports.useState(0);
  const [status, setStatus] = reactExports.useState("loading");
  const onError = reactExports.useCallback(() => {
    setPoster(void 0);
    if (attempt === 0) setAttempt(1);
    else setStatus("error");
  }, [attempt]);
  reactExports.useEffect(() => {
    const controller = new AbortController();
    const hosted = reader?.(src, { force: attempt > 0, signal: controller.signal });
    const url2 = reader ? void 0 : videoPosterUrl(src, attempt > 0);
    if (!reader && !url2) {
      setStatus("error");
      return;
    }
    let objectUrl;
    setStatus("loading");
    setPoster(void 0);
    if (reader && !hosted) return () => controller.abort();
    void (async () => {
      try {
        const read = hosted ? await hosted : await fetchGatewayPoster(url2 ?? "", controller.signal);
        if (controller.signal.aborted) return;
        if (!read) {
          setDuration(0);
          setStatus("ready");
          return;
        }
        objectUrl = URL.createObjectURL(read.blob);
        setDuration(read.durationSeconds ?? 0);
        setPoster(objectUrl);
      } catch {
        if (!controller.signal.aborted) onError();
      }
    })();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, attempt, onError, reader]);
  return {
    poster,
    duration,
    status,
    onLoad: () => setStatus("ready"),
    onError,
    retry: () => {
      setStatus("loading");
      setAttempt((value) => value + 1);
    }
  };
}

function useWorkbench() {
  const workbench = reactExports.useContext(WorkbenchContext);
  if (!workbench) throw new Error("WorkbenchProvider is required");
  return workbench;
}

function useWorkspaceChatStoreOptional() {
  return reactExports.useContext(WorkspaceChatStoreContext);
}

const useWorkspaceResultNavigation = () => reactExports.useContext(WorkspaceResultNavigationContext);

// ==== hook 依赖的模块级小工具（产物里就写在这些 hook 旁边）====
const passModalGate = (requested) => requested;
const noSaveFiles = () => void 0;
const passDialogProps = (props) => props;
function allowCompactNodeDrag(anchor2, options2) {
  const wasNoDrag = anchor2.classList.contains("nodrag");
  anchor2.classList.remove("nodrag");
  const previousOrigin = options2.surface.getAttribute("data-node-drag-origin");
  const previousSelection = options2.surface.getAttribute("data-node-drag-selection");
  options2.surface.setAttribute("data-node-drag-origin", "pointerdown");
  options2.surface.setAttribute("data-node-drag-selection", "preserve");
  const ownerWindow = anchor2.ownerDocument.defaultView;
  let moved = false;
  let released = false;
  let clickTimer;
  const handleMove = (event) => {
    moved ||= Math.hypot(
      event.clientX - options2.startEvent.clientX,
      event.clientY - options2.startEvent.clientY
    ) > 1;
  };
  const clearClick = () => {
    ownerWindow?.removeEventListener("click", suppressClick, true);
    if (clickTimer !== void 0) ownerWindow?.clearTimeout(clickTimer);
  };
  const suppressClick = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    clearClick();
  };
  const release = () => {
    if (released) return;
    released = true;
    if (wasNoDrag) anchor2.classList.add("nodrag");
    if (previousOrigin === null) options2.surface.removeAttribute("data-node-drag-origin");
    else options2.surface.setAttribute("data-node-drag-origin", previousOrigin);
    if (previousSelection === null) options2.surface.removeAttribute("data-node-drag-selection");
    else options2.surface.setAttribute("data-node-drag-selection", previousSelection);
    ownerWindow?.removeEventListener("mousemove", handleMove, true);
    ownerWindow?.removeEventListener("mouseup", handleRelease, true);
    ownerWindow?.removeEventListener("pointercancel", dispose, true);
    ownerWindow?.removeEventListener("blur", dispose);
  };
  const dispose = () => {
    const cancelled = !released;
    release();
    clearClick();
    if (cancelled) options2.onCancel?.();
  };
  const handleRelease = (event) => {
    handleMove(event);
    release();
    if (moved) {
      ownerWindow?.addEventListener("click", suppressClick, true);
      clickTimer = ownerWindow?.setTimeout(clearClick, 0);
    }
    options2.onRelease(moved);
  };
  ownerWindow?.addEventListener("mousemove", handleMove, true);
  ownerWindow?.addEventListener("mouseup", handleRelease, true);
  ownerWindow?.addEventListener("pointercancel", dispose, true);
  ownerWindow?.addEventListener("blur", dispose);
  return dispose;
}
let standaloneScheduler;

// 宿主没提供字号偏好时的本地兜底
function useLocalPromptFontSize() {
  return reactExports.useState(PROMPT_FONT_SIZE_DEFAULT);
}

// ==== 分组引导（useGroupingIntroCandidate 的模块级状态）====
const candidates = /* @__PURE__ */ new Map();
const listeners = /* @__PURE__ */ new Set();
const subscribe = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
function publishGroupingIntro(scope, outputs) {
  candidates.set(scope, outputs);
  for (const listener of listeners) listener();
  return () => {
    if (candidates.get(scope) !== outputs) return;
    candidates.delete(scope);
    for (const listener of listeners) listener();
  };
}

// 字幕编辑会话按 [workspaceId, instanceId, scope] 复用
const entries = new Map();

function useSubtitleEditors(workspaceId, instanceId, scope) {
  const { t } = useTranslation();
  const key = JSON.stringify([workspaceId, instanceId, scope]);
  const entry = reactExports.useMemo(() => {
    let value = entries.get(key);
    if (!value) {
      value = {
        store: new SubtitleEditorStore(),
        owners: 0,
        sourceId: `subtitles:${crypto.randomUUID()}`,
        reports: Promise.resolve()
      };
      entries.set(key, value);
    }
    return value;
  }, [key]);
  reactExports.useEffect(() => {
    if (!workspaceId) return;
    entries.set(key, entry);
    entry.owners++;
    const sourceId = entry.sourceId;
    const toastId = `subtitles:${key}`;
    const retire = () => {
      if (entry.owners || entry.store.getStatus() !== "clean") return;
      void entry.reports.then(() => {
        if (entry.owners || entry.store.getStatus() !== "clean") return;
        entry.stop?.();
        entry.stop = void 0;
        if (entries.get(key) === entry) entries.delete(key);
        dedupedToast.dismiss(toastId);
      }).catch(() => {
      });
    };
    if (!entry.stop) {
      const unregister = registerWorkspaceCanvasPersistence(
        workspaceId,
        instanceId,
        {
          getStatus: entry.store.getStatus,
          async flushAndWaitLatest() {
            await entry.store.flush();
            reportWorkspaceCanvasPersistence(
              workspaceId,
              instanceId,
              entry.store.getStatus(),
              sourceId
            );
          },
          discardPending: entry.store.discard
        },
        (state) => {
          entry.reports = entry.reports.catch(() => void 0).then(
            () => homeService.hiloApp.reportWorkspacePersistence({
              workspaceId,
              instanceId,
              sourceId,
              state
            })
          );
          return entry.reports;
        },
        sourceId
      );
      let previousStatus = entry.store.getStatus();
      const unsubscribe = entry.store.subscribe(() => {
        const state = entry.store.getStatus();
        if (state === previousStatus) return;
        previousStatus = state;
        reportWorkspaceCanvasPersistence(workspaceId, instanceId, state, sourceId);
        if (state === "failed")
          dedupedToast.error(t("canvas.persistence.failed"), {
            id: toastId,
            duration: Number.POSITIVE_INFINITY,
            description: t("canvas.persistence.failedDetail"),
            action: {
              label: t("common.retry"),
              onClick: () => {
                void entry.store.flush().catch(() => {
                });
              }
            }
          });
        if (state === "clean") {
          dedupedToast.dismiss(toastId);
          retire();
        }
      });
      entry.stop = () => {
        unsubscribe();
        unregister();
      };
    }
    return () => {
      entry.owners--;
      void entry.store.flush().catch(() => {
      }).finally(retire);
    };
  }, [entry, key, workspaceId, instanceId, t]);
  return entry.store;
}

export {
  useCanvasImageWorkScheduler,
  useCanvasImageWorkScope,
  useCanvasV3DialogProps,
  useCanvasV3HostServices,
  useCanvasV3ModalGate,
  useCanvasV3PickerMedia,
  useCanvasV3PickerTags,
  useCanvasV3PromptFontSize,
  useCanvasV3SaveFiles,
  useCanvasV3Text,
  useCanvasV3WorkbenchBridge,
  useCompactNodeDrag,
  useComposerExpansion,
  useDesignResourceScope,
  useDesktopCanvasV3HostServices,
  useGroupingIntroCandidate,
  useMediaMuted,
  useNodeAlignmentSnap,
  useOptionalWorkspaceStructure,
  usePromptFontSizePreference,
  useResourcePreviewQuery,
  useSetCurrentVersion,
  useVersionMediaSource,
  useVideoPoster,
  useWorkbench,
  useWorkspaceChatStoreOptional,
  useWorkspaceResultNavigation,
  useSubtitleEditors,
  useLocalPromptFontSize,
};
