// use-loop-guard-settlement.js
import { reactExports } from "../vendor.js";
import { recordAction } from "../infra/gateway-http-error.jsx";

const LOOP_GUARD_SETTLEMENT_ACK_TIMEOUT_MS = 5e3;

const RECORDED_SETTLEMENT_LIMIT = 256;

export function useLoopGuardSettlement({
  messages: messages2,
  isPresented,
  focusedSessionId,
  onRejectedSettlement,
  onConflictingSettlement,
  onAckTimeout,
}) {
  const submissionsRef = reactExports.useRef(new Map());
  const recordedSettlementIdsRef = reactExports.useRef(new Set());
  const isPresentedRef = reactExports.useRef(isPresented);
  const focusedSessionIdRef = reactExports.useRef(focusedSessionId);
  const rejectedSettlementRef = reactExports.useRef(onRejectedSettlement);
  const conflictingSettlementRef = reactExports.useRef(onConflictingSettlement);
  const ackTimeoutRef = reactExports.useRef(onAckTimeout);
  const [submittingIds, setSubmittingIds] = reactExports.useState(
    () => new Set(),
  );
  isPresentedRef.current = isPresented;
  focusedSessionIdRef.current = focusedSessionId;
  rejectedSettlementRef.current = onRejectedSettlement;
  conflictingSettlementRef.current = onConflictingSettlement;
  ackTimeoutRef.current = onAckTimeout;
  const removeSubmission = reactExports.useCallback((requestId) => {
    const submission = submissionsRef.current.get(requestId);
    if (!submission) return void 0;
    clearTimeout(submission.timer);
    submissionsRef.current.delete(requestId);
    setSubmittingIds((current2) => {
      if (!current2.has(requestId)) return current2;
      const next2 = new Set(current2);
      next2.delete(requestId);
      return next2;
    });
    return submission;
  }, []);
  const beginSubmission = reactExports.useCallback(
    (requestId, decision, sessionId) => {
      if (submissionsRef.current.has(requestId)) return false;
      const timer2 = setTimeout(() => {
        if (!removeSubmission(requestId)) return;
        if (
          isPresentedRef.current &&
          focusedSessionIdRef.current === sessionId
        ) {
          ackTimeoutRef.current();
        }
      }, LOOP_GUARD_SETTLEMENT_ACK_TIMEOUT_MS);
      submissionsRef.current.set(requestId, {
        decision,
        sessionId,
        timer: timer2,
      });
      setSubmittingIds((current2) => new Set(current2).add(requestId));
      return true;
    },
    [removeSubmission],
  );
  reactExports.useEffect(() => {
    for (const message2 of messages2.slice(-RECORDED_SETTLEMENT_LIMIT)) {
      if (
        message2.type !== "loop_guard_ask" ||
        !message2.resolved ||
        !message2.requestId
      )
        continue;
      if (
        message2.loopGuardSettlementCause &&
        !recordedSettlementIdsRef.current.has(message2.requestId)
      ) {
        recordedSettlementIdsRef.current.add(message2.requestId);
        while (
          recordedSettlementIdsRef.current.size > RECORDED_SETTLEMENT_LIMIT
        ) {
          const oldest = recordedSettlementIdsRef.current.values().next().value;
          if (typeof oldest !== "string") break;
          recordedSettlementIdsRef.current.delete(oldest);
        }
        recordAction("chat:loop-guard-settled", {
          session_id: message2.loopGuardSessionId,
          cause: message2.loopGuardSettlementCause,
          decision: message2.loopGuardDecision ?? "unknown",
        });
      }
      const submission = removeSubmission(message2.requestId);
      if (!submission || !message2.loopGuardSettlementCause) {
        continue;
      }
      if (message2.loopGuardSettlementCause === "reply") {
        if (
          message2.loopGuardDecision &&
          message2.loopGuardDecision !== submission.decision
        ) {
          conflictingSettlementRef.current(
            message2.loopGuardDecision,
            submission.decision,
          );
        }
        continue;
      }
      rejectedSettlementRef.current(
        message2.loopGuardSettlementCause,
        submission.decision,
      );
    }
  }, [messages2, removeSubmission]);
  reactExports.useEffect(
    () => () => {
      for (const submission of submissionsRef.current.values()) {
        clearTimeout(submission.timer);
      }
      submissionsRef.current.clear();
    },
    [],
  );
  const isSubmitting = reactExports.useCallback(
    (requestId) => requestId !== void 0 && submittingIds.has(requestId),
    [submittingIds],
  );
  return {
    beginSubmission,
    isSubmitting,
  };
}
