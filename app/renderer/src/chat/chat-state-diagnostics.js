// chat-state-diagnostics.js
import { ChatDiagnostics } from "../canvas/chat-diagnostic-error.js";
import {
  chatToolIdentity,
  diagnosticHistoryTools,
  normalizeToolStatus,
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
    const deltaWindow = this.deltaWindow(sessionId);
    if (pendingCount > 0 && !deltaWindow.waitingLogged) {
      deltaWindow.waitingLogged = true;
    } else if (
      pendingCount === 0 &&
      deltaWindow.waitingLogged &&
      !deltaWindow.recoveredLogged
    ) {
      deltaWindow.recoveredLogged = true;
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
    let deltaWindow = this.deltaWindows.get(sessionId);
    if (!deltaWindow) {
      deltaWindow = {
        counts: emptyDeltaCounts(),
        waitingLogged: false,
        recoveredLogged: false,
      };
      this.deltaWindows.set(sessionId, deltaWindow);
    }
    return deltaWindow;
  }
  takeDeltas(sessionId) {
    const deltaWindow = this.deltaWindows.get(sessionId);
    if (!deltaWindow || deltaWindow.counts.received === 0) return void 0;
    const counts = deltaWindow.counts;
    deltaWindow.counts = emptyDeltaCounts();
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
  snapshotDecision(sessionId, replace, failed, previousCount, incomingCount) {
    const outcome = failed
      ? "previous-history-retained"
      : replace
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
    message,
    replace,
    before,
    after,
    parts,
    runtimeId,
    relationshipsBefore,
  ) {
    try {
      const context = {
        sessionId: message.session_id,
        runtimeSessionId: runtimeId,
        historySyncId: message.history_sync_id,
      };
      const outcome =
        this.contexts.get(message.session_id)?.outcome ??
        "snapshot-not-applied";
      this.contexts.set(message.session_id, context);
      const lines = [];
      const diagnostic = new ChatDiagnostics((line) => lines.push(line));
      const previous = diagnosticChatTools(before);
      const current = diagnosticChatTools(after);
      const incoming = diagnosticHistoryTools(message.messages ?? []);
      const identity = {
        missingRootPartId: 0,
        missingToolIdentity: 0,
      };
      for (const tool of incoming) {
        if (tool.scope !== "child" && !tool.partId)
          identity.missingRootPartId++;
        if (!tool.partId && !tool.callID) identity.missingToolIdentity++;
      }
      diagnostic.record(
        "history-controller-input",
        {
          ...context,
          runtimeSessionId: message.runtime_session_id,
          outcome: message.history_load_failed
            ? "history-load-failed"
            : replace
              ? "replace-requested"
              : "install-if-empty-requested",
        },
        incoming,
      );
      const appliedContext = {
        ...context,
        outcome,
        beforeCount: previous.length,
        afterCount: current.length,
        sourcePartCount: parts?.getDiagnostics().partCount ?? 0,
        relationshipsBefore,
        relationshipsAfter: parts?.getRecoveryDiagnostics(
          runtimeId ?? message.session_id,
        ),
        identity,
        delta: this.takeDeltas(message.session_id),
      };
      diagnostic.record("history-store-applied", appliedContext, current);
      if (appliedContext.relationshipsAfter?.waitingChildParts === 0) {
        this.pendingChildren(message.session_id, 0);
      }
      diagnostic.record(
        "history-partstore",
        context,
        parts?.getToolDiagnosticManifest(runtimeId ?? message.session_id) ??
          [],
      );
      const missing = current.filter(
        (tool) =>
          tool.scope !== "child" &&
          tool.tool !== "task" &&
          tool.partId &&
          !parts?.getPart(tool.partId),
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
        current.map((tool) => [chatToolIdentity(tool), tool]),
      );
      const changed = previous.flatMap((tool) => {
        const fresh = byIdentity.get(chatToolIdentity(tool));
        if (!fresh)
          return [
            {
              ...tool,
              reason:
                outcome === "replaced"
                  ? "snapshot-replace"
                  : "history-apply-removal",
            },
          ];
        if (
          normalizeToolStatus(tool.status) !==
          normalizeToolStatus(fresh.status)
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
        !deriveBusy(message.agent_running, message.pending_reasons ?? [])
      ) {
        const terminalized = incoming
          .filter(
            (tool) =>
              tool.scope !== "child" &&
              tool.tool !== "task" &&
              tool.status === "running" &&
              byIdentity.get(chatToolIdentity(tool))?.status === "error",
          )
          .map((tool) => ({
            ...tool,
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
      const tools = diagnosticChatTools(removed).map((tool) => ({
        ...tool,
        reason:
          tool.partId && parts.getPart(tool.partId)
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
  reset(sessionId, messages, parts) {
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
      diagnosticChatTools(messages),
    );
  }
  clear() {
    this.contexts.clear();
    this.deltaWindows.clear();
  }
}
