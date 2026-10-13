// use-production-board.js
import {
  parseJsonObject,
  StaleProductionPlanSaveError,
  toolName,
} from "../text-editor/skill-reload-dock.jsx";
import { reactExports } from "../vendor.js";
import { useGatewayFetch } from "../generation/use-model-catalog-scope-key.js";
import { useWorkspaceWSConnection } from "../settings/changelog-table.jsx";

const PLAN_TOOL_NAMES = new Set([
  "hub_plan_write",
  "hub_plan_patch_stage",
  "hub_plan_update_stage_state",
  "hub_plan_get_stage_status",
  "hub_plan_get_stage_detail",
  "hub_plan_replan",
  "plan_write",
  "plan_patch_stage",
  "plan_update_stage_state",
  "plan_get_stage_status",
  "plan_get_stage_detail",
  "plan_replan",
]);

const PRODUCTION_PLAN_REVIEW_TIMEOUT_MS = 15e3;

function isPatchStageWorkItemsResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value;
  return (
    candidate.ok === true &&
    Number.isInteger(candidate.revision) &&
    Array.isArray(candidate.changed_item_ids) &&
    candidate.changed_item_ids.every((changedItemId) => typeof changedItemId === "string")
  );
}

function isStagePlanReviewModel(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value;
  return (
    Number.isInteger(candidate.revision) &&
    Array.isArray(candidate.sources) &&
    Array.isArray(candidate.stages) &&
    Array.isArray(candidate.pending_stages) &&
    typeof candidate.waiting_user === "boolean"
  );
}

function planIdFromText(value) {
  const parsed = parseJsonObject(value);
  const parsedId = parsed?.plan_id;
  if (typeof parsedId === "string" && parsedId.trim()) return parsedId;
  const match = value?.match(/["']plan_id["']\s*:\s*["']([^"'\\/]+)["']/);
  return match?.[1]?.trim() || void 0;
}

function findPlanRefInSubMessages(messages, parentVersion) {
  if (!messages) return void 0;
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex];
    if (!message) continue;
    const nested = findPlanRefInSubMessages(
      message.subMessages,
      parentVersion,
    );
    if (nested) return nested;
    if (message.type !== "tool") continue;
    const planToolName = message.content.split(":", 1)[0] ?? "";
    if (!PLAN_TOOL_NAMES.has(planToolName)) continue;
    const planId =
      planIdFromText(message.content) ?? planIdFromText(message.args);
    if (planId)
      return {
        id: planId,
        version: `${parentVersion}:${message.id}:${message.toolStatus ?? ""}`,
      };
  }
  return void 0;
}

function findLatestPlanRef(messages) {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex];
    if (!message) continue;
    if (message.type === "sub_agent") {
      const nested = findPlanRefInSubMessages(
        message.subMessages,
        message.id,
      );
      if (nested) return nested;
      continue;
    }
    if (message.type !== "tool") continue;
    const version = `${message.id}:${message.toolStatus ?? ""}:${message.toolResult ?? ""}`;
    const resultId = planIdFromText(message.toolResult);
    if (resultId)
      return {
        id: resultId,
        version,
      };
    if (!PLAN_TOOL_NAMES.has(toolName(message))) continue;
    const args = parseJsonObject(message.toolArgs ?? message.url);
    const argId = args?.plan_id;
    if (typeof argId === "string" && argId.trim())
      return {
        id: argId,
        version,
      };
  }
  return void 0;
}

export function useProductionBoard(messages, scopeId) {
  const gatewayFetch = useGatewayFetch();
  const { subscribe } = useWorkspaceWSConnection();
  const planRef = reactExports.useMemo(
    () => findLatestPlanRef(messages),
    [messages],
  );
  const scopeIdentityKey = `${scopeId ?? ""}\0${planRef?.id ?? ""}\0${planRef?.version ?? ""}`;
  const scopeGenerationRef = reactExports.useRef({
    key: scopeIdentityKey,
    generation: 0,
  });
  if (scopeGenerationRef.current.key !== scopeIdentityKey) {
    scopeGenerationRef.current = {
      key: scopeIdentityKey,
      generation: scopeGenerationRef.current.generation + 1,
    };
  }
  const scopeGeneration = scopeGenerationRef.current.generation;
  const [refreshRequest, setRefreshRequest] = reactExports.useState({
    planId: void 0,
    sequence: 0,
    minimumRevision: 0,
  });
  const minimumRevision =
    refreshRequest.planId === planRef?.id ? refreshRequest.minimumRevision : 0;
  const planRefKey = planRef
    ? `${planRef.id}\0${planRef.version}\0${refreshRequest.sequence}\0${minimumRevision}`
    : void 0;
  const [state, setState] = reactExports.useState({
    loading: false,
    editable: false,
  });
  const stateRef = reactExports.useRef(state);
  stateRef.current = state;
  const trackedPlanIdRef = reactExports.useRef(planRef?.id);
  trackedPlanIdRef.current = planRef?.id;
  const loadSequenceRef = reactExports.useRef(0);
  const saveSequenceRef = reactExports.useRef(0);
  const requestedRevisionRef = reactExports.useRef({
    planId: planRef?.id,
    revision: 0,
  });
  if (requestedRevisionRef.current.planId !== planRef?.id) {
    requestedRevisionRef.current = {
      planId: planRef?.id,
      revision: 0,
    };
  }
  const pendingSaveVerificationRef = reactExports.useRef(void 0);
  const rejectPendingSaveVerification = reactExports.useCallback((error) => {
    const pending = pendingSaveVerificationRef.current;
    if (!pending) return;
    pendingSaveVerificationRef.current = void 0;
    pending.reject(error);
  }, []);
  const settlePendingSaveVerification = reactExports.useCallback(
    (current = stateRef.current) => {
      const pending = pendingSaveVerificationRef.current;
      if (!pending) return;
      const requested = requestedRevisionRef.current;
      if (
        pending.saveSequence !== saveSequenceRef.current ||
        pending.scopeGeneration !== scopeGenerationRef.current.generation ||
        trackedPlanIdRef.current !== pending.planId ||
        current.planId !== pending.planId ||
        (requested.planId === pending.planId &&
          requested.revision > pending.revision) ||
        (current.revision !== void 0 && current.revision > pending.revision)
      ) {
        rejectPendingSaveVerification(new StaleProductionPlanSaveError());
        return;
      }
      if (current.revision === pending.revision && current.editable) {
        pendingSaveVerificationRef.current = void 0;
        pending.resolve();
      }
    },
    [rejectPendingSaveVerification],
  );
  const requestRefresh = reactExports.useCallback((planId, revision) => {
    const requested = requestedRevisionRef.current;
    requestedRevisionRef.current = {
      planId,
      revision:
        requested.planId === planId
          ? Math.max(requested.revision, revision)
          : revision,
    };
    const current = stateRef.current;
    const alreadyLoaded =
      current.planId === planId &&
      current.revision !== void 0 &&
      current.revision >= revision &&
      current.editable;
    if (alreadyLoaded) return;
    setState((previous) =>
      previous.planId === planId
        ? {
            ...previous,
            loading: true,
            editable: false,
            error: void 0,
          }
        : previous,
    );
    setRefreshRequest((previous) => {
      if (
        previous.planId === planId &&
        previous.minimumRevision >= revision
      ) {
        return current.planId === planId &&
          !current.loading &&
          !current.editable
          ? {
              ...previous,
              sequence: previous.sequence + 1,
            }
          : previous;
      }
      return {
        planId,
        sequence: previous.sequence + 1,
        minimumRevision:
          previous.planId === planId
            ? Math.max(previous.minimumRevision, revision)
            : revision,
      };
    });
  }, []);
  reactExports.useEffect(() => {
    settlePendingSaveVerification(state);
  }, [settlePendingSaveVerification, state]);
  reactExports.useEffect(() => {
    const pending = pendingSaveVerificationRef.current;
    if (pending && pending.scopeGeneration !== scopeGeneration) {
      rejectPendingSaveVerification(new StaleProductionPlanSaveError());
    }
  }, [rejectPendingSaveVerification, scopeGeneration]);
  reactExports.useEffect(
    () => () =>
      rejectPendingSaveVerification(new StaleProductionPlanSaveError()),
    [rejectPendingSaveVerification],
  );
  const retry = reactExports.useCallback(() => {
    const planId = planRef?.id;
    if (!planId) return;
    setState((previous) =>
      previous.planId === planId
        ? {
            ...previous,
            loading: true,
            editable: false,
            error: void 0,
          }
        : previous,
    );
    setRefreshRequest((previous) => ({
      planId,
      sequence: previous.sequence + 1,
      minimumRevision:
        previous.planId === planId ? previous.minimumRevision : 0,
    }));
  }, [planRef?.id]);
  const isRevisionCurrent = reactExports.useCallback((planId, revision) => {
    const current = stateRef.current;
    const requested = requestedRevisionRef.current;
    return (
      trackedPlanIdRef.current === planId &&
      current.planId === planId &&
      current.revision === revision &&
      current.editable &&
      (requested.planId !== planId || requested.revision <= revision)
    );
  }, []);
  const saveStageWorkItems = reactExports.useCallback(
    async (stageId, patches, referenceItems) => {
      const current = stateRef.current;
      if (
        !current.planId ||
        current.revision === void 0 ||
        !current.editable
      ) {
        throw new Error("Stage plan is not ready for editing.");
      }
      const planId = current.planId;
      const expectedRevision = current.revision;
      const saveSequence = ++saveSequenceRef.current;
      const saveScopeGeneration = scopeGenerationRef.current.generation;
      const response = await gatewayFetch("/api/plan/stage-work-items", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          plan_id: planId,
          stage_id: stageId,
          expected_revision: expectedRevision,
          patches,
          ...(referenceItems?.length
            ? {
                reference_items: referenceItems,
              }
            : {}),
        }),
      });
      if (!response.ok) {
        const detail = await response.text();
        if (response.status === 409) throw new StaleProductionPlanSaveError();
        throw new Error(
          detail || `Failed to save stage work items (${response.status})`,
        );
      }
      const payload = await response.json();
      if (!isPatchStageWorkItemsResponse(payload)) {
        throw new Error("Stage work item update returned an invalid response.");
      }
      const latest = stateRef.current;
      const requested = requestedRevisionRef.current;
      if (
        saveSequence !== saveSequenceRef.current ||
        saveScopeGeneration !== scopeGenerationRef.current.generation ||
        trackedPlanIdRef.current !== planId ||
        latest.planId !== planId ||
        (requested.planId === planId &&
          requested.revision > payload.revision) ||
        (latest.revision !== void 0 && latest.revision > payload.revision)
      ) {
        throw new StaleProductionPlanSaveError();
      }
      rejectPendingSaveVerification(new StaleProductionPlanSaveError());
      const verification = new Promise((resolve, reject) => {
        pendingSaveVerificationRef.current = {
          planId,
          revision: payload.revision,
          saveSequence,
          scopeGeneration: saveScopeGeneration,
          resolve,
          reject,
        };
      });
      requestRefresh(planId, payload.revision);
      settlePendingSaveVerification();
      await verification;
      return {
        changedItemIds: payload.changed_item_ids,
        revision: payload.revision,
      };
    },
    [
      gatewayFetch,
      rejectPendingSaveVerification,
      requestRefresh,
      settlePendingSaveVerification,
    ],
  );
  const trackedPlanId = planRef?.id;
  reactExports.useEffect(() => {
    if (!trackedPlanId) return;
    return subscribe((msg) => {
      if (msg.type !== "plan_changed") return;
      if (msg.plan_id !== trackedPlanId) return;
      if (!Number.isInteger(msg.revision) || msg.revision < 0) return;
      requestRefresh(trackedPlanId, msg.revision);
    });
  }, [requestRefresh, subscribe, trackedPlanId]);
  reactExports.useEffect(() => {
    const planId = planRef?.id;
    if (!planId || !planRefKey) {
      loadSequenceRef.current += 1;
      saveSequenceRef.current += 1;
      setState({
        loading: false,
        editable: false,
      });
      return;
    }
    const loadSequence = ++loadSequenceRef.current;
    setState((prev) =>
      prev.planId === planId
        ? {
            ...prev,
            loading: true,
            editable: false,
            error: void 0,
          }
        : {
            planId,
            revision: void 0,
            model: void 0,
            loading: true,
            editable: false,
            error: void 0,
          },
    );
    async function loadPlan() {
      try {
        const response = await gatewayFetch(
          `/api/plan/review?id=${encodeURIComponent(planId ?? "")}`,
          {
            method: "GET",
            timeoutMs: PRODUCTION_PLAN_REVIEW_TIMEOUT_MS,
          },
        );
        if (!response.ok) {
          throw new Error(`Failed to load plan review (${response.status})`);
        }
        const payload = await response.json();
        if (!isStagePlanReviewModel(payload)) {
          throw new Error("Plan review response failed schema validation");
        }
        const model = payload;
        if (model.revision < minimumRevision) {
          throw new Error(
            "Plan review has not reached the latest revision yet.",
          );
        }
        if (loadSequence === loadSequenceRef.current) {
          setState((current) => {
            if (current.planId !== planId) return current;
            if (
              current.revision !== void 0 &&
              current.revision > model.revision
            ) {
              return {
                ...current,
                loading: false,
                editable: true,
                error: void 0,
              };
            }
            return {
              planId,
              revision: model.revision,
              model,
              loading: false,
              editable: true,
            };
          });
        }
      } catch (error) {
        if (loadSequence === loadSequenceRef.current) {
          const pending = pendingSaveVerificationRef.current;
          if (pending?.planId === planId) {
            rejectPendingSaveVerification(
              error instanceof Error ? error : new Error(String(error)),
            );
          }
          setState((current) => ({
            ...current,
            planId,
            loading: false,
            editable: false,
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      }
    }
    void loadPlan();
    return () => {
      if (loadSequence === loadSequenceRef.current)
        loadSequenceRef.current += 1;
    };
  }, [
    gatewayFetch,
    minimumRevision,
    planRef?.id,
    planRefKey,
    rejectPendingSaveVerification,
  ]);
  return {
    ...state,
    saveStageWorkItems,
    isRevisionCurrent,
    retry,
  };
}
