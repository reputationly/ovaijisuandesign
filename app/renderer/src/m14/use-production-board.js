// use-production-board.js
import { reactExports, useGatewayFetch } from "../vendor.js";
import { useWorkspaceWSConnection } from "../m10/compact-rewrite-flow.jsx";
import {
  PRODUCTION_PLAN_REVIEW_TIMEOUT_MS,
  StaleProductionPlanSaveError,
  findLatestPlanRef,
  isPatchStageWorkItemsResponse,
  isStagePlanReviewModel,
  parseJsonObject,
  toolName,
} from "./pending-annotation-list.jsx";
function containsExactId(serialized, id2) {
  return serialized.includes(id2);
}
function recordStageId(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  const record2 = value;
  const id2 = record2.stage_id ?? record2.id;
  return typeof id2 === "string" ? id2 : void 0;
}
function taskResultAuthoredStageId(value) {
  const parsed = parseJsonObject(value);
  if (parsed) {
    if ("stage_change" in parsed || "stages" in parsed) {
      const stageChange = parsed.stage_change;
      if (stageChange && typeof stageChange === "object" && !Array.isArray(stageChange)) {
        const authoredStageId = stageChange.authored_stage_id;
        if (typeof authoredStageId === "string" && authoredStageId.trim()) {
          return authoredStageId.trim();
        }
      }
      const stages = parsed.stages;
      if (!Array.isArray(stages) || stages.length !== 1) return void 0;
      return recordStageId(stages[0]);
    }
  }
  const normalized = value.replaceAll("\\n", "\n");
  const stageChangeBlock = normalized.match(/(?:^|\n)stage_change:\s*\n([\s\S]*?)(?=\n\S|$)/)?.[1];
  if (stageChangeBlock) {
    const authoredMatch = stageChangeBlock.match(
      /(?:^|\n)\s*authored_stage_id:\s*["']?([^"'\\\n]+)["']?(?:\s|$)/,
    );
    const authoredStageId = authoredMatch?.[1]?.trim();
    if (authoredStageId) return authoredStageId;
  }
  const stagesBlock = normalized.match(/(?:^|\n)stages:\s*\n([\s\S]*?)(?=\n\S|$)/)?.[1];
  if (!stagesBlock) return void 0;
  const stageEntries = stagesBlock.match(/(?:^|\n)\s*-\s+/g);
  if (!stageEntries || stageEntries.length !== 1) return void 0;
  const stageIdMatch = stagesBlock.match(
    /(?:^|\n)\s*-?\s*(?:stage_id|id):\s*["']?([^"'\\\n]+)["']?(?:\s|$)/,
  );
  return stageIdMatch?.[1]?.trim();
}
function writerArgsContainStage(toolNameValue, args, stageId) {
  if (toolNameValue === "plan_write") {
    const plan = args.plan;
    if (!plan || typeof plan !== "object" || Array.isArray(plan)) return false;
    const stages = plan.stages;
    return Array.isArray(stages) && stages.some((stage) => recordStageId(stage) === stageId);
  }
  if (toolNameValue === "plan_patch_stage") {
    return recordStageId(args.stage) === stageId || args.stage_id === stageId;
  }
  if (toolNameValue !== "plan_replan") return false;
  const operations = args.operations;
  if (!Array.isArray(operations)) return false;
  return operations.some((operation) => {
    if (!operation || typeof operation !== "object" || Array.isArray(operation)) return false;
    const record2 = operation;
    if (record2.type !== "revise_stage" && record2.type !== "insert_stage") return false;
    return recordStageId(record2.stage) === stageId || record2.stage_id === stageId;
  });
}
function normalizedWriterToolName(message2) {
  const raw2 = toolName(message2).split(":", 1)[0]?.trim() ?? "";
  return raw2.startsWith("hub_") ? raw2.slice(4) : raw2;
}
function taskResultContainsAuthoredStage(message2, stageId) {
  return ["toolResult" in message2 ? message2.toolResult : void 0, message2.content].some(
    (value) => {
      if (!value) return false;
      return taskResultAuthoredStageId(value) === stageId;
    },
  );
}
function messageContainsStageContractWrite(message2, stageId) {
  if (message2.type === "sub_agent") {
    return Boolean(
      message2.subMessages?.some((nested) => messageContainsStageContractWrite(nested, stageId)),
    );
  }
  if (message2.type !== "tool") return false;
  const name2 = normalizedWriterToolName(message2);
  if (name2 === "task") return taskResultContainsAuthoredStage(message2, stageId);
  if (name2 !== "plan_write" && name2 !== "plan_patch_stage" && name2 !== "plan_replan") {
    return false;
  }
  for (const value of [
    "toolArgs" in message2 ? message2.toolArgs : void 0,
    "args" in message2 ? message2.args : void 0,
    "url" in message2 ? message2.url : void 0,
    message2.content,
  ]) {
    const args = parseJsonObject(value);
    if (args && writerArgsContainStage(name2, args, stageId)) return true;
  }
  return false;
}
export function findStageReviewAnchorMessageId(messages2, planId, stageId) {
  for (let index2 = messages2.length - 1; index2 >= 0; index2 -= 1) {
    const message2 = messages2[index2];
    if (!message2) continue;
    if (message2.role === "user") continue;
    const serialized = JSON.stringify(message2);
    if (
      containsExactId(serialized, planId) &&
      messageContainsStageContractWrite(message2, stageId)
    ) {
      return message2.id;
    }
  }
  return void 0;
}
export function takeLatestPromptReviews(reviews) {
  return reviews.slice(-3);
}
export function hasConfirmedPromptReview(stage) {
  return (
    stage.status === "done" ||
    stage.status === "doing" ||
    (stage.status === "waiting_user" && stage.waiting_reason === "result_review")
  );
}
export function useProductionBoard(messages2, scopeId) {
  const gatewayFetch2 = useGatewayFetch();
  const { subscribe: subscribe2 } = useWorkspaceWSConnection();
  const planRef = reactExports.useMemo(() => findLatestPlanRef(messages2), [messages2]);
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
        (requested.planId === pending2.planId && requested.revision > pending2.revision) ||
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
      revision: requested.planId === planId ? Math.max(requested.revision, revision) : revision,
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
      if (previous2.planId === planId && previous2.minimumRevision >= revision) {
        return current2.planId === planId && !current2.loading && !current2.editable
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
          previous2.planId === planId ? Math.max(previous2.minimumRevision, revision) : revision,
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
    () => () => rejectPendingSaveVerification(new StaleProductionPlanSaveError()),
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
      minimumRevision: previous2.planId === planId ? previous2.minimumRevision : 0,
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
      if (!current2.planId || current2.revision === void 0 || !current2.editable) {
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
        throw new Error(detail || `Failed to save stage work items (${response.status})`);
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
        (requested.planId === planId && requested.revision > payload.revision) ||
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
    [gatewayFetch2, rejectPendingSaveVerification, requestRefresh, settlePendingSaveVerification],
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
          throw new Error("Plan review has not reached the latest revision yet.");
        }
        if (loadSequence === loadSequenceRef.current) {
          setState((current2) => {
            if (current2.planId !== planId) return current2;
            if (current2.revision !== void 0 && current2.revision > model.revision) {
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
      if (loadSequence === loadSequenceRef.current) loadSequenceRef.current += 1;
    };
  }, [gatewayFetch2, minimumRevision, planRef?.id, planRefKey, rejectPendingSaveVerification]);
  return {
    ...state2,
    saveStageWorkItems,
    isRevisionCurrent,
    retry,
  };
}
export const PROMPT_PREVIEW_LIMIT = 5;
export const GENERATION_FIELD_ALIASES = {
  model: ["model", "model_name", "model_id", "generation_model"],
  resolution: ["resolution", "size", "dimensions", "image_size", "video_resolution"],
  aspectRatio: ["aspect_ratio", "ratio"],
  duration: ["duration_target_s", "target_duration_s", "duration_s", "duration"],
  quality: ["quality"],
  frameRate: ["fps", "frame_rate"],
};
export function friendlyItemName(name2) {
  return name2
    .replace(/^(?:cg|shot|clip)[_-]?(\d+)\s*/i, "$1 ")
    .replaceAll("_", " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
export function userFacingContentName(name2) {
  return friendlyItemName(name2)
    .replace(/^\d+\s*/, "")
    .trim();
}
export function firstField(fields, aliases) {
  for (const alias of aliases) {
    const value = fields[alias]?.trim();
    if (value) return value;
  }
  return void 0;
}
