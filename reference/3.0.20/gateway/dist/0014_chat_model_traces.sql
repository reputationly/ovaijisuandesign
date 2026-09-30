-- Retain this migration when rolling back model-trace business logic.
-- Workspaces already record 14/chat_model_traces in schema_version; removing
-- this file makes the rollback runtime reject them as a newer schema.
-- Keep the table, index and journal entry. See feedback-system-spec.md §4.4.1.
CREATE TABLE IF NOT EXISTS chat_model_traces (
  call_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  agent TEXT NOT NULL,
  model_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  status_code INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_model_traces_turn
  ON chat_model_traces(session_id, request_id, started_at DESC, call_id);
