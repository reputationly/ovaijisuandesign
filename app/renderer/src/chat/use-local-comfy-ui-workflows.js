// use-local-comfy-ui-workflows.js
import { API_PATHS, reactExports } from "../vendor.js";
import { currentCanvasWorkflowNodeKey } from "./find-trailing-trigger.js";
import { useGatewayFetch } from "../generation/use-model-catalog-scope-key.js";
import { mapLocalComfyUiWorkflows } from "../text-editor/canvas-host-toolbar-button.jsx";

function isWorkflowIdentity(value) {
  return /^(?:user|template):/i.test(value);
}

function assignFallbackCopyOrdinals(bindings) {
  const usedOrdinalsByWorkflow = new Map();
  for (const { workflow } of bindings) {
    if (!workflow.copyOrdinal) continue;
    const workflowKey = `${workflow.id}\0${workflow.title}`;
    const usedOrdinals = usedOrdinalsByWorkflow.get(workflowKey) ?? new Set();
    usedOrdinals.add(workflow.copyOrdinal);
    usedOrdinalsByWorkflow.set(workflowKey, usedOrdinals);
  }
  const nextOrdinalByWorkflow = new Map();
  return bindings.map((binding) => {
    if (binding.workflow.copyOrdinal) return binding;
    const workflowKey = `${binding.workflow.id}\0${binding.workflow.title}`;
    const usedOrdinals = usedOrdinalsByWorkflow.get(workflowKey) ?? new Set();
    let nextOrdinal = nextOrdinalByWorkflow.get(workflowKey) ?? 1;
    while (usedOrdinals.has(nextOrdinal)) nextOrdinal += 1;
    usedOrdinals.add(nextOrdinal);
    usedOrdinalsByWorkflow.set(workflowKey, usedOrdinals);
    nextOrdinalByWorkflow.set(workflowKey, nextOrdinal + 1);
    return {
      ...binding,
      workflow: {
        ...binding.workflow,
        copyOrdinal: nextOrdinal,
      },
    };
  });
}

function asRecord$1(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function requiredString(record2, key2) {
  const value = record2[key2];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function positiveInteger(record2, key2) {
  const value = record2[key2];
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : void 0;
}

function mapCurrentCanvasComfyUiWorkflowBindings(value) {
  const nodes = asRecord$1(value)?.nodes;
  if (!Array.isArray(nodes)) return [];
  const bindings = nodes.flatMap((candidate) => {
    const record2 = asRecord$1(candidate);
    if (!record2 || record2.pluginId !== "comfyui") return [];
    const nodeId = requiredString(record2, "id");
    const id2 = requiredString(record2, "currentWorkflowId");
    const title = requiredString(record2, "currentWorkflowName");
    if (!nodeId || !id2 || !title || isWorkflowIdentity(title)) return [];
    const copyOrdinal = positiveInteger(record2, "comfyuiTemplateCopyOrdinal");
    return [
      {
        nodeId,
        workflow: {
          id: id2,
          name: title,
          title,
          source: id2.startsWith("template:") ? "template" : "user",
          canvasNodeId: nodeId,
          ...(copyOrdinal
            ? {
                copyOrdinal,
              }
            : {}),
        },
      },
    ];
  });
  return assignFallbackCopyOrdinals(bindings);
}

function mapComfyUiWorkflowGraph(value) {
  const graph = asRecord$1(asRecord$1(value)?.graph);
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.links)) {
    throw new Error("Invalid ComfyUI workflow graph");
  }
  return graph;
}

export function useLocalComfyUiWorkflows() {
  const gatewayFetch2 = useGatewayFetch();
  const [workflows, setWorkflows] = reactExports.useState([]);
  const [currentCanvasWorkflows, setCurrentCanvasWorkflows] =
    reactExports.useState([]);
  const [currentCanvasWorkflowNodeIds, setCurrentCanvasWorkflowNodeIds] =
    reactExports.useState(() => new Map());
  const [loading, setLoading] = reactExports.useState(true);
  const refreshAbortRef = reactExports.useRef(null);
  const refresh = reactExports.useCallback(async () => {
    refreshAbortRef.current?.abort();
    const controller = new AbortController();
    refreshAbortRef.current = controller;
    setLoading(true);
    const loadJson = async (path2) => {
      const response = await gatewayFetch2(path2, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    };
    await Promise.allSettled([
      loadJson(API_PATHS.comfyUiWorkflows),
      loadJson(`${API_PATHS.canvas}/nodes?type=file&limit=100`),
    ]).then(([workflowResult, canvasResult]) => {
      if (controller.signal.aborted) return;
      const localWorkflows =
        workflowResult.status === "fulfilled"
          ? mapLocalComfyUiWorkflows(workflowResult.value)
          : [];
      const currentCanvasWorkflowBindings =
        canvasResult.status === "fulfilled"
          ? mapCurrentCanvasComfyUiWorkflowBindings(canvasResult.value)
          : [];
      const currentCanvasWorkflows2 = currentCanvasWorkflowBindings.map(
        ({ workflow }) => workflow,
      );
      setWorkflows(localWorkflows);
      setCurrentCanvasWorkflows(currentCanvasWorkflows2);
      setCurrentCanvasWorkflowNodeIds(
        new Map(
          currentCanvasWorkflowBindings.map(({ workflow, nodeId }) => [
            currentCanvasWorkflowNodeKey(workflow),
            nodeId,
          ]),
        ),
      );
    });
    if (!controller.signal.aborted) setLoading(false);
  }, [gatewayFetch2]);
  reactExports.useEffect(() => {
    void refresh();
    return () => refreshAbortRef.current?.abort();
  }, [refresh]);
  const loadGraph = reactExports.useCallback(
    async (workflowId) => {
      const response = await gatewayFetch2(
        API_PATHS.comfyUiWorkflow(workflowId, true),
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return mapComfyUiWorkflowGraph(await response.json());
    },
    [gatewayFetch2],
  );
  return {
    workflows,
    currentCanvasWorkflows,
    currentCanvasWorkflowNodeIds,
    loading,
    refresh,
    loadGraph,
  };
}
