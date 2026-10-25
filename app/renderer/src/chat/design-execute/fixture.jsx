import { DesignExecuteCard } from "./execute-card.jsx";
import { DesignTaskPush } from "./task-push.js";
import { DesignTaskTurnProvider } from "./turn-registry.jsx";
const entry = {
  id: "design-execute-fixture", type: "tool", toolName: "design_execute", toolStatus: "ok", callID: "fixture-call",
  toolArgs: JSON.stringify({ capabilityId: "generate_image:qwen-image", prompt: "测试任务卡片", output: { resources: [{ key: "primary", mode: "create", name: "测试图" }] } }),
  toolResult: JSON.stringify({ task: { id: "tsk_fixture", revision: 3, status: "completed", operation: "generate_image", outputs: [], origin: { source: "agent", toolUseId: "fixture-call" } } }),
};
export default function DesignExecuteFixture() {
  return <DesignTaskTurnProvider><DesignTaskPush /><div data-testid="design-execute-fixture" className="p-3"><DesignExecuteCard entry={entry} /></div></DesignTaskTurnProvider>;
}
