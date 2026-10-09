// agent-ws-client.js
import {
  HILO_WORKSPACE_GENERATION_QUERY,
  HILO_WORKSPACE_IDENTITY_QUERY,
  HILO_WORKSPACE_INSTANCE_QUERY,
} from "../vendor.js";
import { ChatDiagnostics } from "../canvas/chat-diagnostic-error.js";

const WORKSPACE_IDENTITY_WS_CLOSE_CODE = 1008;

const NOOP_WS_LOGGER = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

const WS_LOG_TAG = "[AgentWSClient]";

export class AgentWSClient {
  ws = null;
  active = false;
  reconnectTimer = null;
  stableOpenTimer = null;
  reconnectAttempts = 0;
  nextReconnectDelay;
  _connected = false;
  url;
  workspaceClaim;
  workspaceBinding;
  onMessage;
  onConnectionChange;
  reconnectDelay;
  maxReconnectDelay;
  reconnectStableResetMs;
  maxReconnectAttempts;
  logger;
  onWorkspaceIdentityMismatch;
  onPersistentDisconnect;
  persistentDisconnectAttempts;
  diagnostics = new ChatDiagnostics((line) => this.logger.info(line));
  constructor(options) {
    this.url = options.url;
    this.workspaceBinding = options.workspaceBinding;
    this.workspaceClaim =
      options.workspaceBinding?.claim ?? options.workspaceClaim;
    this.onMessage = options.onMessage;
    this.onConnectionChange = options.onConnectionChange ?? (() => {});
    this.reconnectDelay = options.reconnectDelay ?? 2e3;
    this.nextReconnectDelay = this.reconnectDelay;
    this.maxReconnectDelay = options.maxReconnectDelay ?? 3e4;
    this.reconnectStableResetMs = options.reconnectStableResetMs ?? 1e4;
    this.maxReconnectAttempts =
      options.maxReconnectAttempts ?? Number.POSITIVE_INFINITY;
    this.logger = options.logger ?? NOOP_WS_LOGGER;
    this.onWorkspaceIdentityMismatch = options.onWorkspaceIdentityMismatch;
    this.onPersistentDisconnect = options.onPersistentDisconnect;
    this.persistentDisconnectAttempts =
      options.persistentDisconnectAttempts ?? 3;
  }
  get connected() {
    return this._connected;
  }
  /** Start the WebSocket connection */
  connect() {
    this.active = true;
    this.reconnectAttempts = 0;
    this.nextReconnectDelay = this.reconnectDelay;
    this.doConnect();
  }
  /** Gracefully close and stop reconnecting */
  disconnect() {
    this.active = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearStableOpenTimer();
    this.ws?.close();
    this.ws = null;
  }
  /**
   * Kick an immediate reconnect attempt, bypassing the current backoff timer.
   *
   * Intended for event-driven wakeups: the workspace shell mounts before the
   * per-workspace gateway is listening, so the first connect fails and would
   * otherwise sit out the full backoff window even after the gateway becomes
   * healthy. Callers invoke this when the gateway reports ready.
   *
   * No-op when disconnected intentionally, already connected, or a connection
   * attempt is already in flight (`this.ws` stays set from doConnect until
   * onclose). Does not reset the backoff schedule — if this attempt fails,
   * onclose continues the existing exponential backoff.
   */
  reconnectNow() {
    if (!this.active || this.ws) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.doConnect();
  }
  /** Send a client message */
  send(msg) {
    const trace = (outcome) => this.diagnostics.operation(msg, "sent", outcome);
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(msg));
        trace("submitted");
        return true;
      } catch (error) {
        trace("send-threw");
        throw error;
      }
    }
    trace("socket-not-open");
    return false;
  }
  /** Send raw data */
  sendRaw(data2) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data2);
      return true;
    }
    return false;
  }
  /**
   * Update the per-session media model whitelist.
   *
   * Takes effect on the NEXT outgoing message — current in-flight agent
   * execution is unaffected. Use empty arrays / omit a category to mean
   * Auto for that category.
   */
  updateSelectedMediaModels(sessionId, selectedMediaModels) {
    return this.send({
      type: "update_selected_media_models",
      session_id: sessionId,
      selected_media_models: selectedMediaModels,
    });
  }
  doConnect() {
    if (!this.active) return;
    const url2 = new URL(this.url);
    if (this.workspaceClaim) {
      url2.searchParams.set(HILO_WORKSPACE_IDENTITY_QUERY, this.workspaceClaim);
    }
    if (this.workspaceBinding) {
      url2.searchParams.set(
        HILO_WORKSPACE_INSTANCE_QUERY,
        this.workspaceBinding.instanceId,
      );
      url2.searchParams.set(
        HILO_WORKSPACE_GENERATION_QUERY,
        String(this.workspaceBinding.generation),
      );
    }
    const ws2 = new WebSocket(url2.toString());
    this.ws = ws2;
    ws2.onopen = () => {
      if (!this.active) {
        ws2.close();
        return;
      }
      this._connected = true;
      if (AgentWSClient.isLogPoint(this.reconnectAttempts)) {
        this.logger.info(
          `${WS_LOG_TAG} connected to ${this.url} (after ${this.reconnectAttempts} retries)`,
        );
      }
      this.onConnectionChange(true);
      this.scheduleStableOpenReset();
    };
    ws2.onclose = (event) => {
      const ev = event;
      this._connected = false;
      this.ws = null;
      this.clearStableOpenTimer();
      this.onConnectionChange(false);
      if (ev?.code === WORKSPACE_IDENTITY_WS_CLOSE_CODE) {
        this.onWorkspaceIdentityMismatch?.();
      }
      if (this.active && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        if (
          this.onPersistentDisconnect &&
          this.persistentDisconnectAttempts > 0 &&
          this.reconnectAttempts % this.persistentDisconnectAttempts === 0
        ) {
          this.onPersistentDisconnect(this.reconnectAttempts);
        }
        let delay;
        if (ev?.code === WORKSPACE_IDENTITY_WS_CLOSE_CODE) {
          delay = this.maxReconnectDelay;
          this.nextReconnectDelay = this.maxReconnectDelay;
        } else {
          delay = this.nextReconnectDelay;
          this.nextReconnectDelay = Math.min(
            Math.max(this.reconnectDelay, this.nextReconnectDelay * 2),
            this.maxReconnectDelay,
          );
        }
        if (AgentWSClient.isLogPoint(this.reconnectAttempts)) {
          this.logger.warn(
            `${WS_LOG_TAG} closed (code=${ev?.code ?? "?"} reason=${ev?.reason || "none"} clean=${ev?.wasClean ?? "?"}); reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`,
          );
        }
        this.reconnectTimer = setTimeout(() => this.doConnect(), delay);
      } else if (this.active) {
        this.logger.error(
          `${WS_LOG_TAG} closed (code=${ev?.code ?? "?"} reason=${ev?.reason || "none"}); max reconnect attempts (${this.maxReconnectAttempts}) reached, giving up`,
        );
      }
    };
    ws2.onerror = () => {
      ws2.close();
    };
    ws2.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        const preview =
          typeof event.data === "string"
            ? event.data.slice(0, 200)
            : `<non-string: ${typeof event.data}>`;
        this.logger.warn(
          `${WS_LOG_TAG} dropped malformed JSON frame: ${preview}`,
        );
        return;
      }
      try {
        this.onMessage(msg);
      } catch (err) {
        this.logger.error(
          `${WS_LOG_TAG} onMessage handler error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    };
  }
  scheduleStableOpenReset() {
    this.clearStableOpenTimer();
    this.stableOpenTimer = setTimeout(() => {
      this.reconnectAttempts = 0;
      this.nextReconnectDelay = this.reconnectDelay;
      this.stableOpenTimer = null;
    }, this.reconnectStableResetMs);
  }
  clearStableOpenTimer() {
    if (!this.stableOpenTimer) return;
    clearTimeout(this.stableOpenTimer);
    this.stableOpenTimer = null;
  }
  /**
   * Power-of-2 throttle (0, 1, 2, 4, 8, ...) for reconnect-storm logging.
   * A gateway outage can re-open/close the socket ~1800×/hour; gating logs
   * on this keeps a sustained storm to ~11 lines while preserving the attempt
   * count in the message. Mirrors the renderer ws-connection failedAttempts
   * throttle.
   */
  static isLogPoint(n2) {
    return (n2 & (n2 - 1)) === 0;
  }
}
