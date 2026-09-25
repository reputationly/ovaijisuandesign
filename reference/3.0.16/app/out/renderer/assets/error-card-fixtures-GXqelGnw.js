const ERROR_CARD_PREVIEW_MESSAGES = [
  {
    id: "case-error-network-timeout",
    role: "agent",
    type: "error",
    content: "request timeout after 30000ms",
    error: {
      error_code: "NETWORK_TIMEOUT",
      user_message: "request timeout after 30000ms",
      retryable: true
    }
  },
  {
    id: "case-error-network-unreachable",
    role: "agent",
    type: "error",
    content: "connect ECONNRESET 127.0.0.1:8001",
    error: {
      error_code: "NETWORK_UNREACHABLE",
      user_message: "connect ECONNRESET 127.0.0.1:8001",
      retryable: true
    }
  },
  {
    id: "case-error-runtime-connection-lost",
    role: "agent",
    type: "error",
    content: "runtime websocket closed unexpectedly",
    error: {
      error_code: "RUNTIME_CONNECTION_LOST",
      user_message: "runtime websocket closed unexpectedly",
      retryable: true
    }
  },
  {
    id: "case-error-runtime-not-ready",
    role: "agent",
    type: "error",
    content: "runtime session is not ready",
    error: {
      error_code: "RUNTIME_NOT_READY",
      user_message: "runtime session is not ready",
      retryable: true
    }
  },
  {
    id: "case-error-runtime-session",
    role: "agent",
    type: "error",
    content: "runtime session state is invalid",
    error: {
      error_code: "RUNTIME_SESSION_ERROR",
      user_message: "runtime session state is invalid",
      retryable: true
    }
  },
  {
    id: "case-error-runtime-stream",
    role: "agent",
    type: "error",
    content: "OpenCode responded with 500",
    error: {
      error_code: "RUNTIME_STREAM_ERROR",
      user_message: "OpenCode responded with 500",
      retryable: true
    }
  },
  {
    id: "case-error-runtime-fallback",
    role: "agent",
    type: "error",
    content: "runtime detail not safe to expose",
    error: {
      error_code: "RUNTIME_DRAINING",
      user_message: "runtime detail not safe to expose",
      retryable: true
    }
  },
  {
    id: "case-error-server-fallback",
    role: "agent",
    type: "error",
    content: "server internal detail not safe to expose",
    error: {
      error_code: "GATEWAY_INTERNAL",
      user_message: "server internal detail not safe to expose",
      retryable: true
    }
  }
];
export {
  ERROR_CARD_PREVIEW_MESSAGES as E
};
