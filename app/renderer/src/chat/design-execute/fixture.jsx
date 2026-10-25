import reactExports from "react";

import { DesignExecuteCard } from "./execute-card.jsx";
import { DesignTaskPush } from "./task-push.js";
import { DesignTaskTurnProvider } from "./turn-registry.jsx";

function stateFromHash() {
  const value = typeof window === "undefined" ? "" : window.location.hash;
  if (value.endsWith(":running")) return "running";
  if (value.endsWith(":queued")) return "queued";
  if (value.endsWith(":failed")) return "failed";
  return "completed";
}
function taskFor(state) {
  const base = {
    id: "tsk_fixture",
    revision: 3,
    capabilityId: "generate_image:qwen-image",
    operation: "generate_image",
    outputs: [],
    origin: { source: "agent", toolUseId: "fixture-call" },
  };
  if (state === "running") return { ...base, status: "running", progress: { phase: "running", subtasks: [{ phase: "running" }] } };
  if (state === "queued") return { ...base, status: "accepted", progress: { phase: "queued", subtasks: [{ phase: "queued" }] } };
  if (state === "failed") return { ...base, status: "failed", actions: ["retry", "stop"], problem: { message: "provider exploded" } };
  return { ...base, status: "completed" };
}
export default function DesignExecuteFixture() {
  const [state, setState] = reactExports.useState(stateFromHash);
  reactExports.useEffect(() => {
    const onHash = () => setState(stateFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const entry = {
    id: "design-execute-fixture",
    type: "tool",
    toolName: "design_execute",
    toolStatus: state === "failed" ? "error" : "ok",
    callID: "fixture-call",
    toolArgs: JSON.stringify({ capabilityId: "generate_image:qwen-image", prompt: "测试任务卡片", output: { resources: [{ key: "primary", mode: "create", name: "测试图" }] } }),
    toolResult: JSON.stringify({ task: taskFor(state) }),
  };
  return (
    <DesignTaskTurnProvider>
      <DesignTaskPush />
      <div data-testid="design-execute-fixture" data-fixture-state={state} className="p-3">
        <DesignExecuteCard entry={entry} />
      </div>
    </DesignTaskTurnProvider>
  );
}
