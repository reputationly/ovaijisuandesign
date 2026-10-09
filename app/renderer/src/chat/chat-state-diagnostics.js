// chat-state-diagnostics.js
import { ChatDiagnostics } from "../canvas/chat-diagnostic-error.js";
import {
  chatToolIdentity,
  diagnosticHistoryTools,
  normalizeToolStatus$1,
} from "../canvas/diagnostic-history-tools.js";
import { diagnosticChatTools } from "../text-editor/build-asr-gateway-request.js";
import { deriveBusy } from "../canvas/fullscreen-icon.jsx";

function emptyDeltaCounts() {
  return {
    received: 0,
    patched: 0,
    rederiveAttempted: 0,
    waitingParent: 0,
    missingPart: 0,
    ignored: 0,
  };
}

export class ChatStateDiagnostics {
  constructor(write) {
    this.write = write;
  }
  contexts = new Map();
  deltaWindows = new Map();
  /** Fixed counters only: no payload retention, serialization, scans or logger calls. */
  delta(sessionId, outcome) {
    const counts = this.deltaWindow(sessionId).counts;
    counts.received++;
    counts[outcome]++;
  }
  pendingChildren(sessionId, pendingCount) {
    if (pendingCount === 0 && !this.deltaWindows.has(sessionId)) return;
    const window2 = this.deltaWindow(sessionId);
    if (pendingCount > 0 && !window2.waitingLogged) {
      window2.waitingLogged = true;
    } else if (
      pendingCount === 0 &&
      window2.waitingLogged &&
      !window2.recoveredLogged
    ) {
      window2.recoveredLogged = true;
    } else return;
    const context = {
      ...this.contexts.get(sessionId),
      sessionId,
      outcome: pendingCount > 0 ? "waiting-parent" : "parent-links-ready",
      pendingChildSessions: pendingCount,
    };
    new ChatDiagnostics(this.write).record("child-recovery", context);
  }
  deltaWindow(sessionId) {
    let window2 = this.deltaWindows.get(sessionId);
    if (!window2) {
      window2 = {
        counts: emptyDeltaCounts(),
        waitingLogged: false,
        recoveredLogged: false,
      };
      this.deltaWindows.set(sessionId, window2);
    }
    return window2;
  }
  takeDeltas(sessionId) {
    const window2 = this.deltaWindows.get(sessionId);
    if (!window2 || window2.counts.received === 0) return void 0;
    const counts = window2.counts;
    window2.counts = emptyDeltaCounts();
    return counts;
  }
  finish(sessionId, trigger) {
    const delta = this.takeDeltas(sessionId);
    if (delta) {
      const context = {
        ...this.contexts.get(sessionId),
        sessionId,
        trigger,
        delta,
      };
      new ChatDiagnostics(this.write).record("delta-summary", context);
    }
    this.deltaWindows.delete(sessionId);
  }
  forget(sessionId) {
    this.finish(sessionId, "session-released");
    this.contexts.delete(sessionId);
  }
  snapshotDecision(sessionId, replace2, failed, previousCount, incomingCount) {
    const outcome = failed
      ? "previous-history-retained"
      : replace2
        ? "replaced"
        : previousCount > 0
          ? "existing-history-retained"
          : incomingCount > 0
            ? "initial-history-installed"
            : "no-history-to-install";
    this.contexts.set(sessionId, {
      ...this.contexts.get(sessionId),
      outcome,
    });
  }
  restored(
    message2,
    replace2,
    before,
    after,
    parts,
    runtimeId,
    relationshipsBefore,
  ) {
    try {
      const context = {
        sessionId: message2.session_id,
        runtimeSessionId: runtimeId,
        historySyncId: message2.history_sync_id,
      };
      const outcome =
        this.contexts.get(message2.session_id)?.outcome ??
        "snapshot-not-applied";
      this.contexts.set(message2.session_id, context);
      const lines = [];
      const diagnostic = new ChatDiagnostics((line) => lines.push(line));
      const previous2 = diagnosticChatTools(before);
      const current2 = diagnosticChatTools(after);
      const incoming = diagnosticHistoryTools(message2.messages ?? []);
      const identity2 = {
        missingRootPartId: 0,
        missingToolIdentity: 0,
      };
      for (const tool2 of incoming) {
        if (tool2.scope !== "child" && !tool2.partId)
          identity2.missingRootPartId++;
        if (!tool2.partId && !tool2.callID) identity2.missingToolIdentity++;
      }
      diagnostic.record(
        "history-controller-input",
        {
          ...context,
          runtimeSessionId: message2.runtime_session_id,
          outcome: message2.history_load_failed
            ? "history-load-failed"
            : replace2
              ? "replace-requested"
              : "install-if-empty-requested",
        },
        incoming,
      );
      const appliedContext = {
        ...context,
        outcome,
        beforeCount: previous2.length,
        afterCount: current2.length,
        sourcePartCount: parts?.getDiagnostics().partCount ?? 0,
        relationshipsBefore,
        relationshipsAfter: parts?.getRecoveryDiagnostics(
          runtimeId ?? message2.session_id,
        ),
        identity: identity2,
        delta: this.takeDeltas(message2.session_id),
      };
      diagnostic.record("history-store-applied", appliedContext, current2);
      if (appliedContext.relationshipsAfter?.waitingChildParts === 0) {
        this.pendingChildren(message2.session_id, 0);
      }
      diagnostic.record(
        "history-partstore",
        context,
        parts?.getToolDiagnosticManifest(runtimeId ?? message2.session_id) ??
          [],
      );
      const missing = current2.filter(
        (tool2) =>
          tool2.scope !== "child" &&
          tool2.tool !== "task" &&
          tool2.partId &&
          !parts?.getPart(tool2.partId),
      );
      if (missing.length)
        diagnostic.record(
          "history-source-missing",
          {
            ...context,
            outcome: "missing-source-part",
          },
          missing,
          true,
        );
      const byIdentity = new Map(
        current2.map((tool2) => [chatToolIdentity(tool2), tool2]),
      );
      const changed = previous2.flatMap((tool2) => {
        const fresh = byIdentity.get(chatToolIdentity(tool2));
        if (!fresh)
          return [
            {
              ...tool2,
              reason:
                outcome === "replaced"
                  ? "snapshot-replace"
                  : "history-apply-removal",
            },
          ];
        if (
          normalizeToolStatus$1(tool2.status) !==
          normalizeToolStatus$1(fresh.status)
        )
          return [
            {
              ...fresh,
              reason: "snapshot-state-overwrite",
            },
          ];
        return [];
      });
      if (changed.length)
        diagnostic.record(
          "history-store-changed",
          {
            ...context,
            outcome,
          },
          changed,
          true,
        );
      if (
        (outcome === "replaced" || outcome === "initial-history-installed") &&
        !deriveBusy(message2.agent_running, message2.pending_reasons ?? [])
      ) {
        const terminalized = incoming
          .filter(
            (tool2) =>
              tool2.scope !== "child" &&
              tool2.tool !== "task" &&
              tool2.status === "running" &&
              byIdentity.get(chatToolIdentity(tool2))?.status === "error",
          )
          .map((tool2) => ({
            ...tool2,
            status: "error",
            reason: "idle-history-terminalized",
          }));
        if (terminalized.length)
          diagnostic.record(
            "history-store-normalized",
            context,
            terminalized,
            true,
          );
      }
      this.write(lines.join("\n"));
    } catch {}
  }
  rederived(sessionId, trigger, before, after, removed, parts) {
    if (!removed.length && trigger !== "session-cancelled") return;
    try {
      const tools = diagnosticChatTools(removed).map((tool2) => ({
        ...tool2,
        reason:
          tool2.partId && parts.getPart(tool2.partId)
            ? "no-derived-message"
            : "missing-source-part",
      }));
      new ChatDiagnostics(this.write).record(
        "store-rederived",
        {
          ...this.contexts.get(sessionId),
          sessionId,
          trigger,
          beforeCount: diagnosticChatTools(before).length,
          afterCount: diagnosticChatTools(after).length,
          sourcePartCount: parts.getDiagnostics().partCount,
          outcome: tools.length ? "tools-removed" : "tools-retained",
        },
        tools,
        tools.length > 0,
      );
    } catch {}
  }
  reset(sessionId, messages2, parts) {
    const context = {
      ...this.contexts.get(sessionId),
      sessionId,
      trigger: "resetBuffers",
      sourcePartCount: parts.getDiagnostics().partCount,
      delta: this.takeDeltas(sessionId),
    };
    new ChatDiagnostics(this.write).record(
      "partstore-reset",
      context,
      diagnosticChatTools(messages2),
    );
  }
  clear() {
    this.contexts.clear();
    this.deltaWindows.clear();
  }
}
