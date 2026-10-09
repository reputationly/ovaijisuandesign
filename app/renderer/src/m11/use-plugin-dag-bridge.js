// use-plugin-dag-bridge.js
import {
  reactExports,
  dedupedToast,
  API_PATHS,
  canvasLog,
  guardAccountSubmission,
} from "../vendor.js";
import { useDirectFeedback } from "../m09/feedback-dialog.jsx";
const POLL_INTERVAL_MS$2 = 15e3;
const WATCH_TIMEOUT_MS = 30 * 60 * 1e3;
const ESTIMATED_SECONDS = 60;
const MAX_CONSECUTIVE_FAILURES = 5;
const MAX_CONCURRENCY = 5;
const MAX_ACTIVE_DAG_RUNS_TOTAL = 50;
const MAX_ACTIVE_DAG_RUNS_PER_NODE = 10;
function withCode(err, code2) {
  err.code = code2;
  return err;
}
function assertPluginDagSubmissionAllowed() {
  const decision = guardAccountSubmission("plugin_dag");
  if (decision.allowed) return;
  throw withCode(
    new Error(`dag.submit: account submission blocked (${decision.reasonCode})`),
    "not_available",
  );
}
function toAgentStatus(status) {
  if (status === "finished") return "succeeded";
  if (status === "timeout") return "timeout";
  return "failed";
}
function isTerminal(status) {
  return status === "finished" || status === "failed";
}
export function usePluginDagBridge(gatewayFetch2) {
  const gatewayFetchRef = reactExports.useRef(gatewayFetch2);
  gatewayFetchRef.current = gatewayFetch2;
  const runsRef = reactExports.useRef(new Map());
  const groupsRef = reactExports.useRef(new Map());
  const nodeGroupsRef = reactExports.useRef(new Map());
  const subscribersRef = reactExports.useRef(new Map());
  const stopRun = reactExports.useCallback((runId) => {
    const entry = runsRef.current.get(runId);
    if (!entry) return;
    clearInterval(entry.timer);
    runsRef.current.delete(runId);
  }, []);
  const dropGroupFromNodeIndex = reactExports.useCallback((nodeId, groupId2) => {
    const set2 = nodeGroupsRef.current.get(nodeId);
    if (!set2) return;
    set2.delete(groupId2);
    if (set2.size === 0) nodeGroupsRef.current.delete(nodeId);
  }, []);
  const emitGroupEnvelope = reactExports.useCallback((group) => {
    const orderedRuns = group.runIds.map(
      (id2) =>
        group.results.get(id2) ?? {
          run_id: id2,
          status: "failed",
          error_message: "Missing run result (internal bookkeeping error)",
        },
    );
    const listeners2 = subscribersRef.current.get(group.callerNodeId);
    if (!listeners2 || listeners2.size === 0) return;
    if (group.runIds.length === 1) {
      const only = orderedRuns[0];
      const envelope2 = {
        run_id: group.groupId,
        status: only.status,
        outputs: only.outputs,
        asset_outputs: only.asset_outputs,
        usage: only.usage,
        error_message: only.error_message,
      };
      for (const cb of listeners2) {
        try {
          cb(envelope2);
        } catch (err) {
          console.error("[plugin-dag-bridge] subscriber threw", err);
        }
      }
      return;
    }
    const envelope = {
      run_id: group.groupId,
      status: "succeeded",
      runs: orderedRuns,
      requested: group.requested,
      submitted: group.runIds.length,
    };
    for (const cb of listeners2) {
      try {
        cb(envelope);
      } catch (err) {
        console.error("[plugin-dag-bridge] subscriber threw", err);
      }
    }
  }, []);
  const countActiveRunsForNode = reactExports.useCallback((callerNodeId) => {
    const groupIds = nodeGroupsRef.current.get(callerNodeId);
    if (!groupIds) return 0;
    let count2 = 0;
    for (const groupId2 of groupIds) {
      count2 += groupsRef.current.get(groupId2)?.pending.size ?? 0;
    }
    return count2;
  }, []);
  const recordRunFinished = reactExports.useCallback(
    (runId, outcome) => {
      const entry = runsRef.current.get(runId);
      if (!entry) return;
      const group = groupsRef.current.get(entry.groupId);
      stopRun(runId);
      if (!group) return;
      group.results.set(runId, outcome);
      group.pending.delete(runId);
      if (group.pending.size > 0) return;
      groupsRef.current.delete(group.groupId);
      dropGroupFromNodeIndex(group.callerNodeId, group.groupId);
      emitGroupEnvelope(group);
    },
    [stopRun, dropGroupFromNodeIndex, emitGroupEnvelope],
  );
  const tick = reactExports.useCallback(
    async (runId) => {
      const entry = runsRef.current.get(runId);
      if (!entry) return;
      const elapsed = Date.now() - (groupsRef.current.get(entry.groupId)?.startedAt ?? Date.now());
      if (elapsed > WATCH_TIMEOUT_MS) {
        recordRunFinished(runId, {
          run_id: runId,
          status: "timeout",
          error_message: `Watch exceeded ${WATCH_TIMEOUT_MS}ms`,
        });
        return;
      }
      let body2;
      try {
        const resp = await gatewayFetchRef.current(`/api/dag/run/${encodeURIComponent(runId)}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        body2 = await resp.json();
        entry.consecutiveFailures = 0;
      } catch (err) {
        entry.consecutiveFailures += 1;
        if (entry.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          const msg = err instanceof Error ? err.message : String(err);
          recordRunFinished(runId, {
            run_id: runId,
            status: "failed",
            error_message: `Upstream query failed ${entry.consecutiveFailures} times: ${msg}`,
          });
        }
        return;
      }
      if (!isTerminal(body2.status)) return;
      recordRunFinished(runId, {
        run_id: runId,
        status: toAgentStatus(body2.status),
        outputs: body2.outputs,
        asset_outputs: body2.asset_outputs,
        usage: body2.usage,
        error_message: body2.error_message,
      });
    },
    [recordRunFinished],
  );
  const startWatch = reactExports.useCallback(
    (runId, groupId2, callerNodeId) => {
      if (runsRef.current.has(runId)) return;
      const timer2 = setInterval(() => {
        void tick(runId);
      }, POLL_INTERVAL_MS$2);
      runsRef.current.set(runId, {
        runId,
        groupId: groupId2,
        callerNodeId,
        timer: timer2,
        consecutiveFailures: 0,
      });
    },
    [tick],
  );
  const submitDag = reactExports.useCallback(
    async (args, ctx) => {
      const requested = args.concurrency ?? 1;
      if (!Number.isInteger(requested) || requested < 1 || requested > MAX_CONCURRENCY) {
        throw withCode(
          new Error(`dag.submit: concurrency must be an integer in [1, ${MAX_CONCURRENCY}]`),
          "invalid_args",
        );
      }
      assertPluginDagSubmissionAllowed();
      const activeForNode = countActiveRunsForNode(ctx.callerNodeId);
      const activeTotal = runsRef.current.size;
      if (activeForNode + requested > MAX_ACTIVE_DAG_RUNS_PER_NODE) {
        throw withCode(
          new Error(
            `dag.submit: active run limit exceeded for node (${activeForNode}/${MAX_ACTIVE_DAG_RUNS_PER_NODE})`,
          ),
          "not_available",
        );
      }
      if (activeTotal + requested > MAX_ACTIVE_DAG_RUNS_TOTAL) {
        throw withCode(
          new Error(
            `dag.submit: active run limit exceeded for workspace (${activeTotal}/${MAX_ACTIVE_DAG_RUNS_TOTAL})`,
          ),
          "not_available",
        );
      }
      const submitOne = async () => {
        assertPluginDagSubmissionAllowed();
        const resp = await gatewayFetchRef.current("/api/dag/run", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            dag_id: args.dag_id,
            inputs: args.inputs,
            asset_keys: args.asset_keys,
            // Place the result beside (or in-place over) the iframe's host
            // node instead of a random free slot. `callerNodeId` is the HTML
            // node hosting the plugin — the natural derivation source. A plugin
            // may override with an explicit `sourceNodeId` (e.g. to derive from
            // a different on-canvas node) and opt into in-place replacement by
            // pre-creating a loading card via `hub.canvas.addPlaceholder` and
            // passing its `placeholderId`.
            source_node_id: args.sourceNodeId ?? ctx.callerNodeId,
            ...(args.placeholderId
              ? {
                  placeholder_id: args.placeholderId,
                }
              : {}),
            // Intentionally NO session_id — plugin DAGs must not enter
            // the agent-wakeup pipeline. See file header.
          }),
        });
        if (!resp.ok) {
          let detail = `HTTP ${resp.status}`;
          try {
            const text2 = await resp.text();
            if (text2) detail = `${detail}: ${text2}`;
          } catch {}
          throw new Error(detail);
        }
        const body2 = await resp.json();
        if (!body2.run_id) throw new Error("gateway returned no run_id");
        return body2.run_id;
      };
      assertPluginDagSubmissionAllowed();
      const settled = await Promise.allSettled(
        Array.from(
          {
            length: requested,
          },
          () => submitOne(),
        ),
      );
      const accepted = [];
      const failures = [];
      for (const r2 of settled) {
        if (r2.status === "fulfilled") accepted.push(r2.value);
        else failures.push(r2.reason);
      }
      if (accepted.length === 0) {
        const first2 = failures[0];
        throw withCode(
          new Error(
            `dag.submit: all ${requested} submissions failed: ${first2 instanceof Error ? first2.message : String(first2)}`,
          ),
          "gateway_error",
        );
      }
      const groupId2 = accepted[0];
      const startedAt = Date.now();
      const group = {
        groupId: groupId2,
        runIds: [...accepted],
        pending: new Set(accepted),
        results: new Map(),
        callerNodeId: ctx.callerNodeId,
        requested,
        startedAt,
      };
      groupsRef.current.set(groupId2, group);
      let nodeGroups = nodeGroupsRef.current.get(ctx.callerNodeId);
      if (!nodeGroups) {
        nodeGroups = new Set();
        nodeGroupsRef.current.set(ctx.callerNodeId, nodeGroups);
      }
      nodeGroups.add(groupId2);
      for (const runId of accepted) startWatch(runId, groupId2, ctx.callerNodeId);
      return {
        run_id: accepted[0],
        run_ids: accepted,
        requested,
        submitted: accepted.length,
        estimated_seconds: ESTIMATED_SECONDS,
      };
    },
    [countActiveRunsForNode, startWatch],
  );
  const queryDagRun = reactExports.useCallback(async (runId) => {
    const resp = await gatewayFetchRef.current(`/api/dag/run/${encodeURIComponent(runId)}`);
    if (!resp.ok) {
      let detail = `HTTP ${resp.status}`;
      try {
        const text2 = await resp.text();
        if (text2) detail = `${detail}: ${text2}`;
      } catch {}
      throw withCode(new Error(`dag.query: ${detail}`), "gateway_error");
    }
    const body2 = await resp.json();
    return {
      status: body2.status,
      outputs: body2.outputs ?? {},
      asset_outputs: body2.asset_outputs ?? [],
      usage: body2.usage ?? {},
      error_message: body2.error_message,
    };
  }, []);
  const subscribeDagDone = reactExports.useCallback((callerNodeId, cb) => {
    let set2 = subscribersRef.current.get(callerNodeId);
    if (!set2) {
      set2 = new Set();
      subscribersRef.current.set(callerNodeId, set2);
    }
    set2.add(cb);
    return () => {
      const current2 = subscribersRef.current.get(callerNodeId);
      if (!current2) return;
      current2.delete(cb);
      if (current2.size === 0) subscribersRef.current.delete(callerNodeId);
    };
  }, []);
  const releaseDagRuns = reactExports.useCallback(
    (callerNodeId) => {
      const groupIds = nodeGroupsRef.current.get(callerNodeId);
      if (!groupIds || groupIds.size === 0) return;
      const list2 = [...groupIds];
      for (const groupId2 of list2) {
        const group = groupsRef.current.get(groupId2);
        if (group) {
          for (const runId of group.runIds) stopRun(runId);
          groupsRef.current.delete(groupId2);
        }
      }
      nodeGroupsRef.current.delete(callerNodeId);
    },
    [stopRun],
  );
  reactExports.useEffect(() => {
    const runs = runsRef.current;
    const groups = groupsRef.current;
    const nodes = nodeGroupsRef.current;
    const subs = subscribersRef.current;
    return () => {
      for (const entry of runs.values()) clearInterval(entry.timer);
      runs.clear();
      groups.clear();
      nodes.clear();
      subs.clear();
    };
  }, []);
  return reactExports.useMemo(
    () => ({
      submitDag,
      queryDagRun,
      subscribeDagDone,
      releaseDagRuns,
    }),
    [submitDag, queryDagRun, subscribeDagDone, releaseDagRuns],
  );
}
export function useCanvasNodeErrorFeedback() {
  const { submitDirect, getSubmissionStatus } = useDirectFeedback();
  const onReportNodeError = reactExports.useCallback(
    (info2) => {
      void submitDirect(
        {
          source: "context",
          contextType: "canvas_node_error",
          traceId: info2.traceId,
          context: {
            node_id: info2.nodeId,
            node_type: info2.nodeType,
            model_id: info2.model,
            prompt: info2.prompt,
            error_code: info2.errorMessage,
            trace_id: info2.traceId,
          },
          logUploadReason: `canvas_node_error:${info2.nodeType}`,
          defaultDescription: info2.errorMessage ?? "",
        },
        info2.nodeId,
      );
    },
    [submitDirect],
  );
  return {
    onReportNodeError,
    getNodeErrorReportStatus: getSubmissionStatus,
  };
}
function mapGenerationCancelResponse(raw2) {
  if (!raw2 || typeof raw2 !== "object") {
    throw new Error("generation cancel returned a non-object response");
  }
  const record2 = raw2;
  if (record2.ok !== true || typeof record2.cancelled !== "boolean") {
    throw new Error("generation cancel returned an invalid response");
  }
  if (record2.dismissed !== void 0 && typeof record2.dismissed !== "boolean") {
    throw new Error("generation cancel returned an invalid dismissed state");
  }
  return {
    cancelled: record2.cancelled,
    ...(typeof record2.dismissed === "boolean"
      ? {
          dismissed: record2.dismissed,
        }
      : {}),
  };
}
export function useGenerationLifecycleActions({ gatewayFetch: gatewayFetch2, t: t2 }) {
  const handleCancelGeneration = reactExports.useCallback(
    async (nodeId) => {
      try {
        const response = await gatewayFetch2(API_PATHS.generationCancel, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            node_id: nodeId,
          }),
        });
        if (!response.ok) throw new Error(`generation cancel failed (${response.status})`);
        if (!mapGenerationCancelResponse(await response.json()).cancelled) {
          dedupedToast.error(t2("canvas.cancelGenerationFailed"));
          return false;
        }
        dedupedToast.success(t2("canvas.generationCancelled"));
        return true;
      } catch (err) {
        canvasLog.error("cancel generation failed", {
          nodeId,
          error: err instanceof Error ? err.message : String(err),
        });
        dedupedToast.error(t2("canvas.cancelGenerationFailed"));
        return false;
      }
    },
    [gatewayFetch2, t2],
  );
  const handleDismissUnknownGeneration = reactExports.useCallback(
    async (nodeId) => {
      try {
        const response = await gatewayFetch2(API_PATHS.generationCancel, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            node_id: nodeId,
            preserve_original: true,
          }),
        });
        if (!response.ok) throw new Error(`generation dismiss failed (${response.status})`);
        if (mapGenerationCancelResponse(await response.json()).dismissed !== true) {
          dedupedToast.error(t2("canvas.dismissGenerationStatusFailed"));
          return false;
        }
        return true;
      } catch (err) {
        canvasLog.error("dismiss unknown generation failed", {
          nodeId,
          error: err instanceof Error ? err.message : String(err),
        });
        dedupedToast.error(t2("canvas.dismissGenerationStatusFailed"));
        return false;
      }
    },
    [gatewayFetch2, t2],
  );
  return {
    handleCancelGeneration,
    handleDismissUnknownGeneration,
  };
}
