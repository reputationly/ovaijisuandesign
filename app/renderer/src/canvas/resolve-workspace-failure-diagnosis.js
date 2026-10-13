// resolve-workspace-failure-diagnosis.js
import { reactExports } from "../vendor.js";
import { Emitter } from "../vendor-inline/vscode-base/vs-buffer.js";
import { WORKSPACE_FAILURE_DIAGNOSIS_REGISTRY } from "../workspace/workspace-failure-diagnosis-registry.js";
import { SessionTabsPersister } from "./session-tabs-persister.js";

function translate(copy2, translator, language2) {
  return translator(copy2.key, {
    defaultValue: language2.startsWith("zh") ? copy2.zh : copy2.en,
  });
}

export function resolveWorkspaceFailureDiagnosis(code2, translator, language2) {
  if (!code2) return void 0;
  const meta2 = WORKSPACE_FAILURE_DIAGNOSIS_REGISTRY[code2];
  return {
    code: code2,
    category: meta2.category,
    severity: meta2.severity,
    title: translate(meta2.title, translator, language2),
    message: translate(meta2.message, translator, language2),
    primaryAction: translate(meta2.primaryAction, translator, language2),
    suggestions: meta2.suggestions.map((suggestion) =>
      translate(suggestion, translator, language2),
    ),
    runbook: meta2.runbook,
  };
}

class PluginEvents {
  _onPluginsChanged = new Emitter();
  onPluginsChanged = this._onPluginsChanged.event;
  firePluginsChanged(pluginId, kind) {
    this._onPluginsChanged.fire({
      id: pluginId,
      kind,
    });
  }
}

export const pluginEvents = new PluginEvents();

export const OPEN_BROWSER_EVENT = "hilo:open-browser";

export async function removeWorkspaceSessionTabs(workspaceKey, getStorage) {
  const persister = new SessionTabsPersister(getStorage);
  return persister.remove(workspaceKey);
}

export const WorkspaceRemoteToolContext = reactExports.createContext(null);

export function useWorkspaceRemoteToolOptional() {
  return reactExports.useContext(WorkspaceRemoteToolContext);
}
