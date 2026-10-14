// input.jsx
import {
  CANVAS_MAX_ZOOM,
  statesByWorkspace,
  WorkspaceContentBudgetScopeContext,
  workspaceScope,
} from "../infra/use-plugin-metadata-store.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn, Input as BaseInput } from "../infra/dialog-content.jsx";
import reactExports from "react";
import { useTranslation } from "react-i18next";
export function exitFullscreenForRemovedNode(store, nodeId) {
  if (store.getState().nodeId === nodeId) {
    store.getState().exit(nodeId);
  }
}
const inputBaseClass =
  "h-8 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 md:text-xs dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";
export function Input({
  className,
  type,
  startIcon,
  endIcon,
  ...props
}) {
  if (!startIcon && !endIcon) {
    return (
      <BaseInput
        type={type}
        data-slot="input"
        className={cn(inputBaseClass, className)}
        {...props}
      />
    );
  }
  return (
    <div className={cn("relative flex items-center", className)}>
      {startIcon && (
        <span className="pointer-events-none absolute left-2 flex items-center text-muted-foreground [&_svg:not([class*='size-'])]:size-4">
          {startIcon}
        </span>
      )}
      <BaseInput
        type={type}
        data-slot="input"
        className={cn(
          inputBaseClass,
          "w-full",
          startIcon && "pl-8",
          endIcon && "pr-8",
        )}
        {...props}
      />
      {endIcon && (
        <span className="pointer-events-none absolute right-2 flex items-center text-muted-foreground [&_svg:not([class*='size-'])]:size-4">
          {endIcon}
        </span>
      )}
    </div>
  );
}
export function Label({ className, ...props }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: generic shadcn Label primitive — callers attach htmlFor or wrap a control
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-xs leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
export const PLUGIN_STORAGE_KEY = "pluginStorage";
export function isBlobRef(value) {
  return !!value && typeof value === "object" && value.__hubBlobRef === true;
}
export const CANVAS_ZOOM_PRESETS = [0.5, 1, 2, 3, CANVAS_MAX_ZOOM];
export const CANVAS_INITIAL_FIT_MIN_ZOOM = 0.2;
export const CANVAS_INITIAL_FIT_MAX_ZOOM = 1;
export const byNode = new Map();
export function upsert(nodeId, patch) {
  const current = byNode.get(nodeId) ?? {
    registered: false,
    editorState: null,
    editSessionId: null,
    updatedAt: 0,
  };
  byNode.set(nodeId, {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  });
}
export function isPluginAgentRegistered(nodeId) {
  return byNode.get(nodeId)?.registered === true;
}
export function getPluginAgentEditorState(nodeId) {
  return byNode.get(nodeId)?.editorState ?? null;
}
export function getPluginAgentEditSession(nodeId) {
  return byNode.get(nodeId)?.editSessionId ?? null;
}
export const configChangeListeners = new Map();
export function installedPluginId(actions, nodeId) {
  const pluginId = actions.getNodeById(nodeId)?.data?.pluginId;
  return typeof pluginId === "string" && pluginId ? pluginId : void 0;
}
export function ViewerStateShell({ children }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted px-6 text-center">
      {children}
    </div>
  );
}
export function ViewerLoading({ label }) {
  const { t } = useTranslation();
  return (
    <ViewerStateShell>
      <div
        className="size-5 animate-[canvas-spin_0.8s_linear_infinite] rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground"
        aria-hidden={true}
      />
      <div className="text-xs text-muted-foreground">
        {label ?? t("canvas.file.viewer.loading", "加载中...")}
      </div>
    </ViewerStateShell>
  );
}
function resetWorkspaceContentBudget(workspaceId) {
  statesByWorkspace.delete(workspaceScope(workspaceId));
}
export function WorkspaceContentBudgetScopeProvider({
  workspaceId,
  children,
}) {
  const scopedWorkspaceId = workspaceScope(workspaceId);
  reactExports.useEffect(() => {
    return () => resetWorkspaceContentBudget(scopedWorkspaceId);
  }, [scopedWorkspaceId]);
  return reactExports.createElement(
    WorkspaceContentBudgetScopeContext.Provider,
    {
      value: scopedWorkspaceId,
    },
    children,
  );
}
