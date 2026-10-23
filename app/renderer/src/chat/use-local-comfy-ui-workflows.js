// use-local-comfy-ui-workflows.js
import { API_PATHS } from "../infra/workspace-gateway.js";
import { useOptionalWorkspaceStructure } from "../canvas-v3/canvas-v3-hooks.js";
import reactExports from "react";
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
function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}
function requiredString(record, key) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function positiveInteger(record, key) {
  const value = record[key];
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : void 0;
}
function mapCurrentCanvasComfyUiWorkflowBindings(value) {
  const nodes = asRecord(value)?.nodes;
  if (!Array.isArray(nodes)) return [];
  const bindings = nodes.flatMap((candidate) => {
    const record = asRecord(candidate);
    if (!record || record.pluginId !== "comfyui") return [];
    const nodeId = requiredString(record, "id");
    const currentWorkflowId = requiredString(record, "currentWorkflowId");
    const title = requiredString(record, "currentWorkflowName");
    if (!nodeId || !currentWorkflowId || !title || isWorkflowIdentity(title)) return [];
    const copyOrdinal = positiveInteger(record, "comfyuiTemplateCopyOrdinal");
    return [
      {
        nodeId,
        workflow: {
          id: currentWorkflowId,
          name: title,
          title,
          source: currentWorkflowId.startsWith("template:") ? "template" : "user",
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
  const graph = asRecord(asRecord(value)?.graph);
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.links)) {
    throw new Error("Invalid ComfyUI workflow graph");
  }
  return graph;
}
export function useLocalComfyUiWorkflows() {
  const gatewayFetch = useGatewayFetch();
  const structure = useOptionalWorkspaceStructure();
  const legacyCanvas = structure?.architecture === "legacy";
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
    const loadJson = async (path) => {
      const response = await gatewayFetch(path, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    };
    await Promise.allSettled([
      loadJson(API_PATHS.comfyUiWorkflows),
      legacyCanvas ? loadJson(`${API_PATHS.canvas}/nodes?type=file&limit=100`) : Promise.resolve({ nodes: [] }),
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
      const currentCanvasWorkflows = currentCanvasWorkflowBindings.map(
        ({ workflow }) => workflow,
      );
      setWorkflows(localWorkflows);
      setCurrentCanvasWorkflows(currentCanvasWorkflows);
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
  }, [gatewayFetch, legacyCanvas]);
  reactExports.useEffect(() => {
    void refresh();
    return () => refreshAbortRef.current?.abort();
  }, [refresh]);
  const loadGraph = reactExports.useCallback(
    async (workflowId) => {
      const response = await gatewayFetch(
        API_PATHS.comfyUiWorkflow(workflowId, true),
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return mapComfyUiWorkflowGraph(await response.json());
    },
    [gatewayFetch],
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
