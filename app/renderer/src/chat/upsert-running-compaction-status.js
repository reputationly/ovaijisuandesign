// upsert-running-compaction-status.js
import { nextMessageId } from "./create-history-sub-agent-message.js";

export function upsertRunningCompactionStatus(messages) {
  const hasRunningStatus = messages.some(
    (message) =>
      message.type === "compaction_status" && message.content !== "compacted",
  );
  if (hasRunningStatus) return messages;
  return [
    ...messages,
    {
      id: nextMessageId(),
      role: "agent",
      type: "compaction_status",
      content: "compacting",
    },
  ];
}
