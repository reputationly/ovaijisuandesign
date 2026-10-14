// resolve-workspace-failure-diagnosis.js
import reactExports from "react";
import { Emitter } from "../vendor-inline/vscode-base/vs-buffer.js";
import { WORKSPACE_FAILURE_DIAGNOSIS_REGISTRY } from "../workspace/workspace-failure-diagnosis-registry.js";
import { SessionTabsPersister } from "./session-tabs-persister.js";

function translate(copy, translator, language) {
  return translator(copy.key, {
    defaultValue: language.startsWith("zh") ? copy.zh : copy.en,
  });
}

export function resolveWorkspaceFailureDiagnosis(code, translator, language) {
  if (!code) return void 0;
  const meta = WORKSPACE_FAILURE_DIAGNOSIS_REGISTRY[code];
  return {
    code,
    category: meta.category,
    severity: meta.severity,
    title: translate(meta.title, translator, language),
    message: translate(meta.message, translator, language),
    primaryAction: translate(meta.primaryAction, translator, language),
    suggestions: meta.suggestions.map((suggestion) =>
      translate(suggestion, translator, language),
    ),
    runbook: meta.runbook,
  };
}

class PluginEvents {
  _onPluginsChanged = new Emitter();
  onPluginsChanged = this._onPluginsChanged.event;
  firePluginsChanged(id, kind) {
    this._onPluginsChanged.fire({
      id,
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
