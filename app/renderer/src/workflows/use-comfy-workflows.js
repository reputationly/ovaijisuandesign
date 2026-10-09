// 工作流列表的数据 hook：用户工作流与精选工作流、安装状态对齐、变更通知。
import {
  h as useTranslation,
  u as useGatewayReady,
  g as useRuntimeConfig,
  r as reactExports,
  k as useQuery,
  l as gatewayFetch,
  m as API_PATHS,
} from "../main.jsx";
import { isInstalledFeaturedWorkflow, mapComfyWorkflowListResponse } from "./workflow-mapping.js";
const comfyWorkflowsChanged = new EventTarget();
const COMFY_WORKFLOWS_CHANGED_EVENT = "changed";
const FEATURED_WORKFLOWS_STALE_TIME_MS = 6e4;
const WORKFLOW_STATUS_FETCH_OPTIONS = {
  cache: "no-store",
};
function sortUserWorkflowsByUpdatedAt(workflows) {
  return workflows
    .map((workflow, index) => ({
      workflow,
      index,
    }))
    .sort((left, right) => {
      const leftUpdatedAt = left.workflow.updatedAt ?? Number.NEGATIVE_INFINITY;
      const rightUpdatedAt = right.workflow.updatedAt ?? Number.NEGATIVE_INFINITY;
      return rightUpdatedAt - leftUpdatedAt || left.index - right.index;
    })
    .map(({ workflow }) => workflow);
}
export function notifyComfyWorkflowsChanged() {
  comfyWorkflowsChanged.dispatchEvent(new Event(COMFY_WORKFLOWS_CHANGED_EVENT));
}
function reconcileFeaturedWorkflowInstallation(featuredWorkflows, userWorkflows) {
  const installedTemplateIds = new Set(
    userWorkflows.flatMap((workflow) =>
      isInstalledFeaturedWorkflow(workflow) ? [workflow.featuredWorkflow.id] : [],
    ),
  );
  return featuredWorkflows.map((workflow) =>
    workflow.source === "official"
      ? {
          ...workflow,
          installed: installedTemplateIds.has(workflow.id),
        }
      : workflow,
  );
}
export function useComfyWorkflows(source) {
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
        gatewayFetch(API_PATHS.comfyUiWorkflows, WORKFLOW_STATUS_FETCH_OPTIONS),
      ]);
      if (!featuredResponse.ok) throw new Error(`HTTP ${featuredResponse.status}`);
      if (!userResponse.ok) throw new Error(`HTTP ${userResponse.status}`);
      const featuredWorkflows = mapComfyWorkflowListResponse(
        await featuredResponse.json(),
        "official",
      );
      const localWorkflows = mapComfyWorkflowListResponse(await userResponse.json(), "mine");
      return {
        ...featuredWorkflows,
        workflows: reconcileFeaturedWorkflowInstallation(
          featuredWorkflows.workflows,
          localWorkflows.workflows,
        ),
      };
    },
    enabled: gatewayReady && source === "official",
    staleTime: FEATURED_WORKFLOWS_STALE_TIME_MS,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    retry: false,
  });
  const loadUserWorkflows = reactExports.useCallback(async () => {
    const sequence = ++requestSequence.current;
    setUserLoading(true);
    setUserError(null);
    try {
      const response = await gatewayFetch(
        API_PATHS.comfyUiWorkflows,
        WORKFLOW_STATUS_FETCH_OPTIONS,
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
        handleWorkflowsChanged,
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
      retry,
    };
  }
  return {
    workflows: userWorkflows,
    loading: userLoading,
    error: userError,
    retry,
  };
}
