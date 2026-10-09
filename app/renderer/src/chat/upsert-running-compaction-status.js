// upsert-running-compaction-status.js
import { nextMessageId } from "./create-history-sub-agent-message.js";

export function upsertRunningCompactionStatus(messages2) {
  const hasRunningStatus = messages2.some(
    (message2) =>
      message2.type === "compaction_status" && message2.content !== "compacted",
  );
  if (hasRunningStatus) return messages2;
  return [
    ...messages2,
    {
      id: nextMessageId(),
      role: "agent",
      type: "compaction_status",
      content: "compacting",
    },
  ];
}
