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
    candidate.changed_item_ids.every((id2) => typeof id2 === "string")
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
  const match2 = value?.match(/["']plan_id["']\s*:\s*["']([^"'\\/]+)["']/);
  return match2?.[1]?.trim() || void 0;
}

function findPlanRefInSubMessages(messages2, parentVersion) {
  if (!messages2) return void 0;
  for (let i2 = messages2.length - 1; i2 >= 0; i2 -= 1) {
    const message2 = messages2[i2];
    if (!message2) continue;
    const nested = findPlanRefInSubMessages(
      message2.subMessages,
      parentVersion,
    );
    if (nested) return nested;
    if (message2.type !== "tool") continue;
    const name2 = message2.content.split(":", 1)[0] ?? "";
    if (!PLAN_TOOL_NAMES.has(name2)) continue;
    const id2 =
      planIdFromText(message2.content) ?? planIdFromText(message2.args);
    if (id2)
      return {
        id: id2,
        version: `${parentVersion}:${message2.id}:${message2.toolStatus ?? ""}`,
      };
  }
  return void 0;
}

function findLatestPlanRef(messages2) {
  for (let i2 = messages2.length - 1; i2 >= 0; i2 -= 1) {
    const message2 = messages2[i2];
    if (!message2) continue;
    if (message2.type === "sub_agent") {
      const nested = findPlanRefInSubMessages(
        message2.subMessages,
        message2.id,
      );
      if (nested) return nested;
      continue;
    }
    if (message2.type !== "tool") continue;
    const version2 = `${message2.id}:${message2.toolStatus ?? ""}:${message2.toolResult ?? ""}`;
    const resultId = planIdFromText(message2.toolResult);
    if (resultId)
      return {
        id: resultId,
        version: version2,
      };
    if (!PLAN_TOOL_NAMES.has(toolName(message2))) continue;
    const args = parseJsonObject(message2.toolArgs ?? message2.url);
    const argId = args?.plan_id;
    if (typeof argId === "string" && argId.trim())
      return {
        id: argId,
        version: version2,
      };
  }
  return void 0;
}

export function useProductionBoard(messages2, scopeId) {
  const gatewayFetch2 = useGatewayFetch();
  const { subscribe: subscribe2 } = useWorkspaceWSConnection();
  const planRef = reactExports.useMemo(
    () => findLatestPlanRef(messages2),
    [messages2],
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
  const [state2, setState] = reactExports.useState({
    loading: false,
    editable: false,
  });
  const stateRef = reactExports.useRef(state2);
  stateRef.current = state2;
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
    const pending2 = pendingSaveVerificationRef.current;
    if (!pending2) return;
    pendingSaveVerificationRef.current = void 0;
    pending2.reject(error);
  }, []);
  const settlePendingSaveVerification = reactExports.useCallback(
    (current2 = stateRef.current) => {
      const pending2 = pendingSaveVerificationRef.current;
      if (!pending2) return;
      const requested = requestedRevisionRef.current;
      if (
        pending2.saveSequence !== saveSequenceRef.current ||
        pending2.scopeGeneration !== scopeGenerationRef.current.generation ||
        trackedPlanIdRef.current !== pending2.planId ||
        current2.planId !== pending2.planId ||
        (requested.planId === pending2.planId &&
          requested.revision > pending2.revision) ||
        (current2.revision !== void 0 && current2.revision > pending2.revision)
      ) {
        rejectPendingSaveVerification(new StaleProductionPlanSaveError());
        return;
      }
      if (current2.revision === pending2.revision && current2.editable) {
        pendingSaveVerificationRef.current = void 0;
        pending2.resolve();
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
    const current2 = stateRef.current;
    const alreadyLoaded =
      current2.planId === planId &&
      current2.revision !== void 0 &&
      current2.revision >= revision &&
      current2.editable;
    if (alreadyLoaded) return;
    setState((previous2) =>
      previous2.planId === planId
        ? {
            ...previous2,
            loading: true,
            editable: false,
            error: void 0,
          }
        : previous2,
    );
    setRefreshRequest((previous2) => {
      if (
        previous2.planId === planId &&
        previous2.minimumRevision >= revision
      ) {
        return current2.planId === planId &&
          !current2.loading &&
          !current2.editable
          ? {
              ...previous2,
              sequence: previous2.sequence + 1,
            }
          : previous2;
      }
      return {
        planId,
        sequence: previous2.sequence + 1,
        minimumRevision:
          previous2.planId === planId
            ? Math.max(previous2.minimumRevision, revision)
            : revision,
      };
    });
  }, []);
  reactExports.useEffect(() => {
    settlePendingSaveVerification(state2);
  }, [settlePendingSaveVerification, state2]);
  reactExports.useEffect(() => {
    const pending2 = pendingSaveVerificationRef.current;
    if (pending2 && pending2.scopeGeneration !== scopeGeneration) {
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
    setState((previous2) =>
      previous2.planId === planId
        ? {
            ...previous2,
            loading: true,
            editable: false,
            error: void 0,
          }
        : previous2,
    );
    setRefreshRequest((previous2) => ({
      planId,
      sequence: previous2.sequence + 1,
      minimumRevision:
        previous2.planId === planId ? previous2.minimumRevision : 0,
    }));
  }, [planRef?.id]);
  const isRevisionCurrent = reactExports.useCallback((planId, revision) => {
    const current2 = stateRef.current;
    const requested = requestedRevisionRef.current;
    return (
      trackedPlanIdRef.current === planId &&
      current2.planId === planId &&
      current2.revision === revision &&
      current2.editable &&
      (requested.planId !== planId || requested.revision <= revision)
    );
  }, []);
  const saveStageWorkItems = reactExports.useCallback(
    async (stageId, patches, referenceItems) => {
      const current2 = stateRef.current;
      if (
        !current2.planId ||
        current2.revision === void 0 ||
        !current2.editable
      ) {
        throw new Error("Stage plan is not ready for editing.");
      }
      const planId = current2.planId;
      const expectedRevision = current2.revision;
      const saveSequence = ++saveSequenceRef.current;
      const saveScopeGeneration = scopeGenerationRef.current.generation;
      const response = await gatewayFetch2("/api/plan/stage-work-items", {
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
      const latest2 = stateRef.current;
      const requested = requestedRevisionRef.current;
      if (
        saveSequence !== saveSequenceRef.current ||
        saveScopeGeneration !== scopeGenerationRef.current.generation ||
        trackedPlanIdRef.current !== planId ||
        latest2.planId !== planId ||
        (requested.planId === planId &&
          requested.revision > payload.revision) ||
        (latest2.revision !== void 0 && latest2.revision > payload.revision)
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
      gatewayFetch2,
      rejectPendingSaveVerification,
      requestRefresh,
      settlePendingSaveVerification,
    ],
  );
  const trackedPlanId = planRef?.id;
  reactExports.useEffect(() => {
    if (!trackedPlanId) return;
    return subscribe2((msg) => {
      if (msg.type !== "plan_changed") return;
      if (msg.plan_id !== trackedPlanId) return;
      if (!Number.isInteger(msg.revision) || msg.revision < 0) return;
      requestRefresh(trackedPlanId, msg.revision);
    });
  }, [requestRefresh, subscribe2, trackedPlanId]);
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
        const response = await gatewayFetch2(
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
          setState((current2) => {
            if (current2.planId !== planId) return current2;
            if (
              current2.revision !== void 0 &&
              current2.revision > model.revision
            ) {
              return {
                ...current2,
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
          const pending2 = pendingSaveVerificationRef.current;
          if (pending2?.planId === planId) {
            rejectPendingSaveVerification(
              error instanceof Error ? error : new Error(String(error)),
            );
          }
          setState((current2) => ({
            ...current2,
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
    gatewayFetch2,
    minimumRevision,
    planRef?.id,
    planRefKey,
    rejectPendingSaveVerification,
  ]);
  return {
    ...state2,
    saveStageWorkItems,
    isRevisionCurrent,
    retry,
  };
}
