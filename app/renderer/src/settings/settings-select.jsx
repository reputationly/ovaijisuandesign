// settings-select.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { mergeTailwindClasses as cn } from "../infra/dialog-content.jsx";
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
export function startRendererDiagnosticsReporter(hiloApp, options = {}) {
  const intervalMs = options.intervalMs ?? DEFAULT_REPORT_INTERVAL_MS;
  const schedule = options.schedule ?? setInterval;
  const clear = options.clear ?? clearInterval;
  let stopped = false;
  const report = () => {
    if (stopped) return;
    Promise.resolve(
      hiloApp.updateRendererDiagnosticsSnapshot(
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
  const timer = schedule(report, intervalMs);
  return () => {
    stopped = true;
    pressureUnsubscribe?.();
    clear(timer);
  };
}
const DISABLED_GPU_ATTRIBUTE = "data-hilo-gpu";
const DISABLED_GPU_REASON_ATTRIBUTE = "data-hilo-gpu-reason";
const TRANSPARENT_WINDOW_ATTRIBUTE = "data-window-transparent";
export function applyRenderingModeAttributes(
  config,
  root = document.documentElement,
) {
  if (config.transparentWindowActive) {
    root.setAttribute(TRANSPARENT_WINDOW_ATTRIBUTE, "true");
  } else {
    root.removeAttribute(TRANSPARENT_WINDOW_ATTRIBUTE);
  }
  if (config.gpuAccelerationDisabled) {
    root.setAttribute(DISABLED_GPU_ATTRIBUTE, "disabled");
    root.setAttribute(
      DISABLED_GPU_REASON_ATTRIBUTE,
      config.gpuAccelerationDisabledReason ?? "unknown",
    );
    return;
  }
  root.removeAttribute(DISABLED_GPU_ATTRIBUTE);
  root.removeAttribute(DISABLED_GPU_REASON_ATTRIBUTE);
}
export function SettingGroup({ title, children }) {
  return (
    <div className="space-y-1.5">
      {title && (
        <div className="pt-3 pb-1 first:pt-0">
          <span className="text-xs font-normal text-muted-foreground">
            {title}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
export function SettingRow({
  label,
  description,
  children,
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
      <div className="shrink-0">{children}</div>
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
  const selectedOption = options.find((option) => option.value === value);
  const renderOption = (option) => {
    if (!option) return value;
    const OptionIcon = option.icon;
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
        <span className="truncate">{option.label}</span>
      </span>
    );
  };
  return (
    <Select
      value={value}
      onValueChange={(value) => {
        if (value != null) onValueChange(value);
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
function getOrCreateWorkspaceEntries(workspaceId) {
  const existing = entriesByWorkspace.get(workspaceId);
  if (existing) return existing;
  const created = new Map();
  entriesByWorkspace.set(workspaceId, created);
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
  workspaceId,
  instanceId,
  controller,
  reportStatus,
) {
  const workspaceEntries = getOrCreateWorkspaceEntries(workspaceId);
  const key = lifetimeKey(instanceId);
  const previous = workspaceEntries.get(key);
  const entry = {
    controller,
    instanceId,
    reportPromise: previous?.reportPromise,
    reportStatus,
    reportVersion: previous?.reportVersion ?? 0,
    // Never let a remount's initial clean state erase an unresolved failure
    // from the same runtime lifetime. Only a durable flush may clear it.
    status:
      previous?.status === "clean" || !previous
        ? controller.getStatus()
        : previous.status,
  };
  workspaceEntries.set(key, entry);
  publishPersistenceStatus(entry);
  return () => {
    const current = workspaceEntries.get(key);
    if (current?.controller !== controller) return;
    current.controller = void 0;
    current.reportStatus = void 0;
    if (current.status === "clean") workspaceEntries.delete(key);
    if (workspaceEntries.size === 0) entriesByWorkspace.delete(workspaceId);
  };
}
export function reportWorkspaceCanvasPersistence(
  workspaceId,
  instanceId,
  status,
) {
  const workspaceEntries = getOrCreateWorkspaceEntries(workspaceId);
  const key = lifetimeKey(instanceId);
  const entry = workspaceEntries.get(key);
  if (entry) {
    entry.status = status;
    publishPersistenceStatus(entry);
  } else {
    workspaceEntries.set(key, {
      instanceId,
      reportVersion: 0,
      status,
    });
  }
  if (status === "clean" && !workspaceEntries.get(key)?.controller) {
    workspaceEntries.delete(key);
  }
  if (workspaceEntries.size === 0) entriesByWorkspace.delete(workspaceId);
}
export async function flushWorkspaceCanvasPersistence(workspaceId) {
  const entries = entriesByWorkspace.get(workspaceId);
  if (!entries) return [];
  for (const entry of entries.values()) {
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
  return Array.from(entries.values(), (entry) => entry.instanceId);
}
