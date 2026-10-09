// settings-select.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
import {
  buildRendererDiagnosticsSnapshot,
  Select,
} from "../assets/credit-query-keys.jsx";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../infra/select-content.jsx";
const DEFAULT_REPORT_INTERVAL_MS = 1e4;
export function startRendererDiagnosticsReporter(hiloApp2, options = {}) {
  const intervalMs = options.intervalMs ?? DEFAULT_REPORT_INTERVAL_MS;
  const schedule2 = options.schedule ?? setInterval;
  const clear = options.clear ?? clearInterval;
  let stopped = false;
  const report = () => {
    if (stopped) return;
    Promise.resolve(
      hiloApp2.updateRendererDiagnosticsSnapshot(
        buildRendererDiagnosticsSnapshot(),
      ),
    ).catch(() => {});
  };
  const pressureUnsubscribe =
    options.onMemoryPressure?.(() => {
      if (stopped) return;
      report();
    }) ??
    (typeof window !== "undefined"
      ? window.hilo?.diagnostics?.onMemoryPressure?.(() => {
          if (stopped) return;
          report();
        })
      : void 0);
  report();
  const timer2 = schedule2(report, intervalMs);
  return () => {
    stopped = true;
    pressureUnsubscribe?.();
    clear(timer2);
  };
}
const DISABLED_GPU_ATTRIBUTE = "data-hilo-gpu";
const DISABLED_GPU_REASON_ATTRIBUTE = "data-hilo-gpu-reason";
const TRANSPARENT_WINDOW_ATTRIBUTE = "data-window-transparent";
export function applyRenderingModeAttributes(
  config2,
  root2 = document.documentElement,
) {
  if (config2.transparentWindowActive) {
    root2.setAttribute(TRANSPARENT_WINDOW_ATTRIBUTE, "true");
  } else {
    root2.removeAttribute(TRANSPARENT_WINDOW_ATTRIBUTE);
  }
  if (config2.gpuAccelerationDisabled) {
    root2.setAttribute(DISABLED_GPU_ATTRIBUTE, "disabled");
    root2.setAttribute(
      DISABLED_GPU_REASON_ATTRIBUTE,
      config2.gpuAccelerationDisabledReason ?? "unknown",
    );
    return;
  }
  root2.removeAttribute(DISABLED_GPU_ATTRIBUTE);
  root2.removeAttribute(DISABLED_GPU_REASON_ATTRIBUTE);
}
export function SettingGroup({ title, children: children2 }) {
  return (
    <div className="space-y-1.5">
      {title && (
        <div className="pt-3 pb-1 first:pt-0">
          <span className="text-xs font-normal text-muted-foreground">
            {title}
          </span>
        </div>
      )}
      {children2}
    </div>
  );
}
export function SettingRow({
  label,
  description,
  children: children2,
  className,
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-6 py-2.5",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-normal text-foreground">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children2}</div>
    </div>
  );
}
export function SettingsSelect({
  value,
  onValueChange,
  options,
  className,
  "data-action-ui-id": actionUiId,
  "aria-label": ariaLabel,
}) {
  const selectedOption = options.find((option2) => option2.value === value);
  const renderOption = (option2) => {
    if (!option2) return value;
    const OptionIcon = option2.icon;
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        {OptionIcon ? (
          <OptionIcon
            data-slot="settings-select-option-icon"
            size={14}
            strokeWidth={1.5}
            className="shrink-0 text-muted-foreground"
          />
        ) : null}
        <span className="truncate">{option2.label}</span>
      </span>
    );
  };
  return (
    <Select
      value={value}
      onValueChange={(v2) => {
        if (v2 != null) onValueChange(v2);
      }}
    >
      <SelectTrigger
        data-action-ui-id={actionUiId}
        aria-label={ariaLabel}
        className={cn(
          "h-8 min-w-28 rounded-md border-border! bg-muted/30! px-2.5 text-xs font-normal text-foreground/70 hover:bg-foreground/[0.03]! hover:text-foreground",
          className,
        )}
      >
        <SelectValue>{() => renderOption(selectedOption)}</SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-popover! p-1">
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="h-7 rounded-md py-1.5 pr-8 pl-2.5 text-xs font-normal text-foreground/70 focus:bg-popup-item-hover! focus:text-foreground! data-[highlighted]:bg-popup-item-hover! data-[highlighted]:text-foreground!"
          >
            {renderOption(opt)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
const LEGACY_PERSISTENCE_LIFETIME = "legacy";
export const entriesByWorkspace = new Map();
function lifetimeKey(instanceId) {
  return instanceId || LEGACY_PERSISTENCE_LIFETIME;
}
function getOrCreateWorkspaceEntries(workspaceId2) {
  const existing = entriesByWorkspace.get(workspaceId2);
  if (existing) return existing;
  const created = new Map();
  entriesByWorkspace.set(workspaceId2, created);
  return created;
}
class WorkspaceCanvasPersistenceUnavailableError extends Error {
  constructor() {
    super("Canvas persistence controller is unavailable");
    this.name = "WorkspaceCanvasPersistenceUnavailableError";
  }
}
class WorkspaceCanvasPersistenceChangedError extends Error {
  constructor() {
    super("Canvas changed while waiting for the durability barrier");
    this.name = "WorkspaceCanvasPersistenceChangedError";
  }
}
function publishPersistenceStatus(entry) {
  if (!entry.reportStatus) return;
  entry.reportVersion += 1;
  const promise = entry.reportStatus(entry.status);
  void promise.catch(() => {});
  entry.reportPromise = promise;
}
export function registerWorkspaceCanvasPersistence(
  workspaceId2,
  instanceId,
  controller,
  reportStatus,
) {
  const workspaceEntries = getOrCreateWorkspaceEntries(workspaceId2);
  const key2 = lifetimeKey(instanceId);
  const previous2 = workspaceEntries.get(key2);
  const entry = {
    controller,
    instanceId,
    reportPromise: previous2?.reportPromise,
    reportStatus,
    reportVersion: previous2?.reportVersion ?? 0,
    // Never let a remount's initial clean state erase an unresolved failure
    // from the same runtime lifetime. Only a durable flush may clear it.
    status:
      previous2?.status === "clean" || !previous2
        ? controller.getStatus()
        : previous2.status,
  };
  workspaceEntries.set(key2, entry);
  publishPersistenceStatus(entry);
  return () => {
    const current2 = workspaceEntries.get(key2);
    if (current2?.controller !== controller) return;
    current2.controller = void 0;
    current2.reportStatus = void 0;
    if (current2.status === "clean") workspaceEntries.delete(key2);
    if (workspaceEntries.size === 0) entriesByWorkspace.delete(workspaceId2);
  };
}
export function reportWorkspaceCanvasPersistence(
  workspaceId2,
  instanceId,
  status,
) {
  const workspaceEntries = getOrCreateWorkspaceEntries(workspaceId2);
  const key2 = lifetimeKey(instanceId);
  const entry = workspaceEntries.get(key2);
  if (entry) {
    entry.status = status;
    publishPersistenceStatus(entry);
  } else {
    workspaceEntries.set(key2, {
      instanceId,
      reportVersion: 0,
      status,
    });
  }
  if (status === "clean" && !workspaceEntries.get(key2)?.controller) {
    workspaceEntries.delete(key2);
  }
  if (workspaceEntries.size === 0) entriesByWorkspace.delete(workspaceId2);
}
export async function flushWorkspaceCanvasPersistence(workspaceId2) {
  const entries2 = entriesByWorkspace.get(workspaceId2);
  if (!entries2) return [];
  for (const entry of entries2.values()) {
    if (entry.controller) {
      await entry.controller.flushAndWaitLatest();
      const controllerStatus = entry.controller.getStatus();
      if (entry.status !== controllerStatus) {
        entry.status = controllerStatus;
        publishPersistenceStatus(entry);
      }
    } else if (entry.status !== "clean") {
      throw new WorkspaceCanvasPersistenceUnavailableError();
    }
    if (entry.status !== "clean") {
      throw new WorkspaceCanvasPersistenceUnavailableError();
    }
    if (!entry.reportPromise) continue;
    const reportVersion = entry.reportVersion;
    await entry.reportPromise;
    if (entry.status !== "clean" || entry.reportVersion !== reportVersion) {
      throw new WorkspaceCanvasPersistenceChangedError();
    }
  }
  return Array.from(entries2.values(), (entry) => entry.instanceId);
}
