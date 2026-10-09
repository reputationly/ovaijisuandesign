// use-adopt-initial-attachments.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  reactExports,
  ChevronDown,
  useGatewayFetch,
  TRACK_EVENTS,
  API_PATHS,
  useHasBlockingModal,
  getPlatform,
  TooltipProvider$1,
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  HILO_WORKSPACE_IDENTITY_QUERY,
  HILO_WORKSPACE_INSTANCE_QUERY,
  HILO_WORKSPACE_GENERATION_QUERY,
  detectFileType,
} from "../vendor.js";
import {
  cn$2,
  useBrowserHoverPreview,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioItem,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import {
  resolveShortcutDisplay,
  ShortcutHint,
  WORKSPACE_DISPLAY_MODE_SHORTCUT,
} from "../m08/shortcut-categories.jsx";
import { useWorkspacePaneReorder } from "../m13/session-tab-strip.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { Tooltip$1 } from "../m01/create-tracker.jsx";
import { CoachMark } from "../m10/asset-mention-list.jsx";
import { isGatewayReady, isReadyState } from "../m11/remote-tool-host.jsx";
import { FILE_ADOPTION_IDEMPOTENCY_HEADER } from "../m01/text-models.js";
import { __jsx } from "../shared/jsx-runtime.js";
export const WORKSPACE_VIEW_MODE_CONTROL_WIDTH = 104;
export const WORKSPACE_VIEW_MODE_CONTROL_SPLIT_WIDTH = 120;
export const WORKSPACE_VIEW_MODE_CONTROL_GAP = 6;
export const WORKSPACE_VIEW_MODE_CONTROL_COMPACT_WIDTH = 32;
function isWorkspaceMode$1(value) {
  return value === "chatOnly" || value === "split" || value === "canvasOnly";
}
function isWorkspacePaneOrder(value) {
  return value === "chat-canvas" || value === "canvas-chat";
}
function WorkspaceViewModeIcon({ mode: mode2, paneOrder, className }) {
  const chatOnLeft = paneOrder === "chat-canvas";
  const leftActive = mode2 === "split" || (mode2 === "chatOnly" ? chatOnLeft : !chatOnLeft);
  const rightActive = mode2 === "split" || (mode2 === "chatOnly" ? !chatOnLeft : chatOnLeft);
  return (
    <svg
      viewBox="0 0 18 18"
      aria-hidden="true"
      className={cn$2("size-4 shrink-0", className)}
      data-workspace-view-mode-icon="true"
      data-left-active={leftActive ? "true" : "false"}
      data-right-active={rightActive ? "true" : "false"}
    >
      <rect
        x="1.25"
        y="2.25"
        width="15.5"
        height="13.5"
        rx="3"
        fill="none"
        className="stroke-current opacity-65"
        strokeWidth="1.25"
      />
      <rect
        x="2.75"
        y="3.75"
        width="5.25"
        height="10.5"
        rx="1.5"
        className={leftActive ? "fill-current opacity-60" : "fill-current opacity-[0.12]"}
      />
      <rect
        x="10"
        y="3.75"
        width="5.25"
        height="10.5"
        rx="1.5"
        className={rightActive ? "fill-current opacity-60" : "fill-current opacity-[0.12]"}
      />
    </svg>
  );
}
export function WorkspaceViewModeMenu({
  mode: mode2,
  paneOrder,
  onModeChange,
  onPaneOrderChange,
  variant = "chat-header",
  source = "chat",
  align = "end",
  compact = false,
  coachMarkEnabled = false,
  triggerRef: externalTriggerRef,
  onControlWidthChange,
}) {
  const { t: t2 } = useTranslation();
  const paneReorder = useWorkspacePaneReorder();
  const internalTriggerRef = reactExports.useRef(null);
  const triggerRef = externalTriggerRef ?? internalTriggerRef;
  const hasBlockingModal = useHasBlockingModal();
  const [menuOpen, setMenuOpen] = reactExports.useState(false);
  useBrowserHoverPreview(menuOpen);
  const platformOs = getPlatform().app.os;
  const shortcutText = resolveShortcutDisplay(
    platformOs === "darwin"
      ? WORKSPACE_DISPLAY_MODE_SHORTCUT.mac
      : WORKSPACE_DISPLAY_MODE_SHORTCUT.other,
    platformOs,
  ).text;
  const label = t2("workspace.layout.label", "Workspace layout");
  const currentModeLabel =
    mode2 === "split"
      ? t2("workspace.layout.chatAndCanvas", "Chat + Canvas")
      : mode2 === "chatOnly"
        ? t2("workspace.layout.chatOnly", "Chat only")
        : t2("workspace.layout.canvasOnly", "Canvas only");
  const requestPaneOrderChange = (targetOrder) => {
    if (paneReorder?.enabled && paneReorder.requestPaneOrderChange) {
      paneReorder.requestPaneOrderChange(targetOrder);
      return;
    }
    onPaneOrderChange(targetOrder);
  };
  const reportControlWidth = reactExports.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || !onControlWidthChange) return;
    const nextWidth = Math.ceil(trigger.getBoundingClientRect().width || trigger.offsetWidth);
    if (nextWidth > 0) onControlWidthChange(nextWidth);
  }, [onControlWidthChange, triggerRef]);
  reactExports.useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger || !onControlWidthChange) return;
    reportControlWidth();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", reportControlWidth);
      return () => window.removeEventListener("resize", reportControlWidth);
    }
    const observer2 = new ResizeObserver(reportControlWidth);
    observer2.observe(trigger);
    return () => observer2.disconnect();
  }, [onControlWidthChange, reportControlWidth, triggerRef]);
  return (
    <>
      <TooltipProvider$1 delay={150} closeDelay={0}>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <Tooltip$1 content={label} closeOnClick={true}>
            <DropdownMenuTrigger
              ref={triggerRef}
              type="button"
              aria-label={`${label}: ${currentModeLabel}`}
              title={compact ? currentModeLabel : void 0}
              data-action-ui-id={`workspace.view-mode-menu.${source}`}
              data-window-drag-region="no-drag"
              data-workspace-layout-label={mode2}
              style={{
                width: compact ? WORKSPACE_VIEW_MODE_CONTROL_COMPACT_WIDTH : void 0,
              }}
              className={cn$2(
                "flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
                compact
                  ? // Keep the compact Chat-header variant icon-only; the shortcut
                    // hint lives inside the opened display-mode menu.
                    "-mt-0.5 h-7 rounded-md px-2 text-foreground/65 hover:bg-foreground/[0.06] hover:text-foreground data-[popup-open]:bg-foreground/[0.06] data-[popup-open]:text-foreground"
                  : cn$2(
                      "px-2",
                      variant === "chat-header"
                        ? "h-7 rounded-md text-foreground/65 hover:bg-foreground/[0.06] hover:text-foreground data-[popup-open]:bg-foreground/[0.06] data-[popup-open]:text-foreground"
                        : "h-8 rounded-lg text-foreground/70 hover:bg-foreground/[0.06] hover:text-foreground data-[popup-open]:bg-foreground/[0.08] data-[popup-open]:text-foreground",
                    ),
              )}
            >
              <WorkspaceViewModeIcon mode={mode2} paneOrder={paneOrder} />
              {compact ? null : <span className="truncate">{currentModeLabel}</span>}
              {compact ? null : (
                <ChevronDown className="size-3.5 shrink-0 opacity-50" strokeWidth={1.5} />
              )}
            </DropdownMenuTrigger>
          </Tooltip$1>
          <DropdownMenuContent
            align={align}
            side="bottom"
            sideOffset={variant === "stage-chrome" ? 8 : 6}
            className="min-w-44"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center justify-between gap-4">
                <span>{t2("workspace.layout.mode", "Layout mode")}</span>
                <ShortcutHint
                  accelerator={WORKSPACE_DISPLAY_MODE_SHORTCUT.mac}
                  otherAccelerator={WORKSPACE_DISPLAY_MODE_SHORTCUT.other}
                  os={platformOs}
                  data-workspace-layout-shortcut="true"
                  className="h-4 min-w-4 shrink-0 rounded-[4px] px-0.5 text-[10px] opacity-80"
                />
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={mode2}
                aria-label={t2("workspace.layout.mode", "Layout mode")}
                onValueChange={(value) => {
                  if (isWorkspaceMode$1(value)) onModeChange(value);
                }}
              >
                <DropdownMenuRadioItem value="split" data-action-ui-id="workspace.view-mode.split">
                  <WorkspaceViewModeIcon mode="split" paneOrder={paneOrder} className="size-4" />
                  <span>{t2("workspace.layout.chatAndCanvas", "Chat + Canvas")}</span>
                </DropdownMenuRadioItem>
                {mode2 === "split" ? (
                  <div
                    className="ml-5 border-l border-border/60 pl-1"
                    data-workspace-layout-secondary="chat-position"
                  >
                    <DropdownMenuRadioGroup
                      value={paneOrder}
                      aria-label={t2("workspace.layout.chatPosition", "Chat position")}
                      onValueChange={(value) => {
                        if (isWorkspacePaneOrder(value)) requestPaneOrderChange(value);
                      }}
                    >
                      <DropdownMenuRadioItem
                        value="chat-canvas"
                        data-action-ui-id="workspace.pane-order.chat-left"
                      >
                        <span>{t2("workspace.layout.chatLeft", "Chat on left")}</span>
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem
                        value="canvas-chat"
                        data-action-ui-id="workspace.pane-order.chat-right"
                      >
                        <span>{t2("workspace.layout.chatRight", "Chat on right")}</span>
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </div>
                ) : null}
                <DropdownMenuRadioItem
                  value="chatOnly"
                  data-action-ui-id="workspace.view-mode.chat-only"
                >
                  <WorkspaceViewModeIcon mode="chatOnly" paneOrder={paneOrder} className="size-4" />
                  <span>{t2("workspace.layout.chatOnly", "Chat only")}</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="canvasOnly"
                  data-action-ui-id="workspace.view-mode.canvas-only"
                >
                  <WorkspaceViewModeIcon
                    mode="canvasOnly"
                    paneOrder={paneOrder}
                    className="size-4"
                  />
                  <span>{t2("workspace.layout.canvasOnly", "Canvas only")}</span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider$1>
      {coachMarkEnabled && !hasBlockingModal ? (
        <CoachMark
          markId="workspace-display-mode-shortcut-intro"
          enabled={true}
          anchorRef={triggerRef}
          side="bottom"
          align="end"
          showClose={true}
          title={t2("coachMark.workspace.displayMode.title", "Quickly switch display modes")}
          description={t2("coachMark.workspace.displayMode.desc", {
            defaultValue:
              "Press {{shortcut}} to open the full-screen display mode switcher. Use arrow keys to preselect and Enter to apply.",
            shortcut: shortcutText,
          })}
          ctaLabel={t2("coachMark.gotIt", "Got it")}
        />
      ) : null}
    </>
  );
}
export function createWorkspaceResumeFailureStatus(workspaceId2, folderPath, message2) {
  return {
    workspaceId: workspaceId2,
    folderPath: folderPath ?? workspaceId2,
    state: "failed",
    revision: 0,
    error: message2,
    synthetic: true,
  };
}
export function deriveWorkspaceRuntimeView(input) {
  const {
    workspaceId: workspaceId2,
    isActive: isActive2,
    runtime,
    status,
    lastRenderableStatus,
    activationFailureStatus,
    resumeFailureMessage,
  } = input;
  const activeRuntime = runtime?.workspaceId === workspaceId2 ? runtime : void 0;
  const activeStatus = status?.workspaceId === workspaceId2 ? status : void 0;
  const liveGatewayStatus =
    activeStatus && isGatewayReady(activeStatus.state) ? activeStatus : void 0;
  const liveRenderableStatus =
    activeStatus && isReadyState(activeStatus.state) ? activeStatus : void 0;
  const canShowActivationFailure =
    activationFailureStatus !== void 0 &&
    (!activeStatus || activeStatus.state === "stopping" || activeStatus.state === "stopped");
  const failureStatus =
    activeStatus?.state === "failed"
      ? activeStatus
      : canShowActivationFailure
        ? activationFailureStatus
        : void 0;
  const retainedRenderableStatus =
    liveRenderableStatus ??
    (lastRenderableStatus?.workspaceId === workspaceId2 ? lastRenderableStatus : void 0);
  const canRenderRetainedContent = activeRuntime !== void 0 && retainedRenderableStatus !== void 0;
  const syntheticStartingStatus =
    activeRuntime && !activeStatus && !retainedRenderableStatus && !failureStatus
      ? {
          workspaceId: workspaceId2,
          folderPath: activeRuntime.folderPath,
          state: "creating",
          revision: 0,
          synthetic: true,
        }
      : void 0;
  const renderableStatus =
    liveGatewayStatus ??
    retainedRenderableStatus ??
    activeStatus ??
    failureStatus ??
    syntheticStartingStatus;
  const statusUnavailableStatus =
    !activeStatus && canRenderRetainedContent
      ? createWorkspaceResumeFailureStatus(
          workspaceId2,
          activeRuntime?.folderPath,
          resumeFailureMessage,
        )
      : void 0;
  const runtimeIssueStatus =
    failureStatus ??
    (canRenderRetainedContent && activeStatus && !isReadyState(activeStatus.state)
      ? activeStatus
      : activeRuntime &&
          activeStatus &&
          (activeStatus.state === "stopping" || activeStatus.state === "stopped")
        ? activeStatus
        : statusUnavailableStatus);
  const derived = (view2) => ({
    view: view2,
    activeRuntime,
    activeStatus,
    liveRenderableStatus,
    canRenderRetainedContent,
    runtimeIssueStatus,
  });
  if (!activeRuntime) {
    if (failureStatus) {
      return derived(
        isActive2
          ? {
              kind: "error",
              status: failureStatus,
            }
          : {
              kind: "none",
            },
      );
    }
    return derived(
      isActive2
        ? {
            kind: "loading",
            status: activeStatus ?? {
              workspaceId: workspaceId2,
              folderPath: "",
              state: "creating",
              revision: 0,
              synthetic: true,
            },
          }
        : {
            kind: "none",
          },
    );
  }
  if (!renderableStatus)
    return derived({
      kind: "none",
    });
  return derived({
    kind: "content",
    runtime: activeRuntime,
    renderableStatus,
    runtimeIssueStatus,
  });
}
function toWorkspaceWsUrl(binding) {
  const protocol = binding.baseUrl.startsWith("https") ? "wss" : "ws";
  const host = binding.baseUrl.replace(/^https?:\/\//, "");
  const url2 = new URL(`${protocol}://${host}/ws`);
  url2.searchParams.set(HILO_WORKSPACE_IDENTITY_QUERY, binding.claim);
  url2.searchParams.set(HILO_WORKSPACE_INSTANCE_QUERY, binding.instanceId);
  url2.searchParams.set(HILO_WORKSPACE_GENERATION_QUERY, String(binding.generation));
  return url2.toString();
}
export function resolveEffectiveWorkspaceRuntime({ runtime, renderableStatus, activeStatus }) {
  const statusGatewayUrl =
    activeStatus && isGatewayReady(activeStatus.state)
      ? activeStatus.gatewayUrl
      : renderableStatus.gatewayUrl;
  if (!runtime.gatewayBinding) return runtime;
  if (statusGatewayUrl && statusGatewayUrl !== runtime.gatewayBinding.baseUrl) return runtime;
  return runtime;
}
export function resyncRuntimeGatewayBinding(prev, workspaceId2, nextBinding, options) {
  if (!prev || prev.workspaceId !== workspaceId2) return prev;
  if (!nextBinding) return options?.dropWhenUnavailable ? void 0 : prev;
  if (prev.gatewayBinding && sameBinding(prev.gatewayBinding, nextBinding)) {
    return prev;
  }
  return {
    ...prev,
    gatewayBinding: nextBinding,
    gatewayUrl: nextBinding.baseUrl,
    workspaceClaim: nextBinding.claim,
    wsUrl: toWorkspaceWsUrl(nextBinding),
  };
}
function sameBinding(left, right) {
  return (
    left.baseUrl === right.baseUrl &&
    left.claim === right.claim &&
    left.instanceId === right.instanceId &&
    left.generation === right.generation
  );
}
class AdoptionFailure extends Error {
  constructor(reason, message2, httpStatusClass) {
    super(message2);
    this.reason = reason;
    this.httpStatusClass = httpStatusClass;
  }
}
function classifyHttpStatus(status) {
  if (status >= 400 && status < 500) return "4xx";
  if (status >= 500 && status < 600) return "5xx";
  return "other";
}
function reportAdoptionFailure(failure) {
  const properties2 = {
    operation: "initial_attachment_adoption",
    error_type: failure.reason === "network" ? "network" : "business",
    error_code: failure.reason,
    error_message: failure.reason,
    ...(failure.httpStatusClass
      ? {
          http_status_class: failure.httpStatusClass,
        }
      : {}),
  };
  trackEvent(TRACK_EVENTS.GATEWAY_API_FAILED, properties2);
  const breadcrumb = window.hilo?.diagnostics?.addBreadcrumb?.(
    "network",
    "initial-attachment-adoption: failed",
    properties2,
  );
  void breadcrumb?.catch(() => {});
}
function normalizeAdoptResponse(value, requestedSources) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      adopted: [],
      errors: [],
    };
  }
  const record2 = value;
  const adopted = Array.isArray(record2.adopted)
    ? record2.adopted.flatMap((mapping) => {
        if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) return [];
        const item = mapping;
        return typeof item.source === "string" && typeof item.destination === "string"
          ? [
              {
                source: item.source,
                destination: item.destination,
                ...(typeof item.attachment_id === "string" && item.attachment_id.trim()
                  ? {
                      attachment_id: item.attachment_id,
                    }
                  : {}),
              },
            ]
          : [];
      })
    : [];
  const errors = Array.isArray(record2.errors)
    ? record2.errors.flatMap((error) => {
        if (!error || typeof error !== "object" || Array.isArray(error)) return [];
        const item = error;
        return typeof item.source === "string"
          ? [
              {
                source: item.source,
                message:
                  typeof item.message === "string" ? item.message : "Failed to adopt attachment",
              },
            ]
          : [];
      })
    : [];
  if (adopted.length === 0 && Array.isArray(record2.paths)) {
    const paths = record2.paths.filter((path2) => typeof path2 === "string");
    if (paths.length === requestedSources.length) {
      return {
        adopted: requestedSources.map((source, index2) => ({
          source,
          destination: paths[index2],
        })),
        errors,
      };
    }
  }
  return {
    adopted,
    errors,
  };
}
function isCanvasMediaPath(path2) {
  const fileType = detectFileType(path2);
  return fileType === "image" || fileType === "video" || fileType === "audio";
}
export function isInitialAttachmentAdoptionReady(status, runtimeUnavailable) {
  return !runtimeUnavailable && isGatewayReady(status.state);
}
export function useAdoptInitialAttachments(attachments, folderPath, ready, operationId) {
  const scopedGatewayFetch = useGatewayFetch();
  const [progress, setProgress] = reactExports.useState(null);
  const [retryVersion, setRetryVersion] = reactExports.useState(0);
  const inFlightKeyRef = reactExports.useRef(null);
  const adoptionKey = reactExports.useMemo(
    () =>
      attachments && attachments.length > 0 && folderPath
        ? JSON.stringify([operationId ?? null, folderPath, attachments])
        : null,
    [attachments, folderPath, operationId],
  );
  const activeAdoptionKeyRef = reactExports.useRef(adoptionKey);
  activeAdoptionKeyRef.current = adoptionKey;
  const retry = reactExports.useCallback(() => {
    if (!adoptionKey || inFlightKeyRef.current === adoptionKey) return;
    setRetryVersion((version2) => version2 + 1);
  }, [adoptionKey]);
  reactExports.useEffect(() => {
    if (!ready || !adoptionKey || !attachments) return;
    if (
      progress?.key === adoptionKey &&
      progress.error &&
      progress.attemptVersion === retryVersion
    ) {
      return;
    }
    if (progress?.key === adoptionKey && !progress.error) {
      const allMapped = attachments.every(
        (source) => progress.destinationsBySource[source] !== void 0,
      );
      const projected = new Set(progress.projectedPaths);
      const allProjected = attachments.every((source) => {
        const destination = progress.destinationsBySource[source];
        return !destination || !isCanvasMediaPath(destination) || projected.has(destination);
      });
      if (allMapped && allProjected) return;
    }
    if (inFlightKeyRef.current === adoptionKey) return;
    inFlightKeyRef.current = adoptionKey;
    void (async () => {
      const existing = progress?.key === adoptionKey ? progress : null;
      const destinationsBySource = {
        ...(existing?.destinationsBySource ?? {}),
      };
      const attachmentIdsBySource = {
        ...(existing?.attachmentIdsBySource ?? {}),
      };
      const projectedPaths2 = new Set(existing?.projectedPaths ?? []);
      try {
        const missingSources = attachments.filter(
          (source) => destinationsBySource[source] === void 0,
        );
        if (missingSources.length > 0) {
          const response = await scopedGatewayFetch(API_PATHS.adoptFiles, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(operationId
                ? {
                    [FILE_ADOPTION_IDEMPOTENCY_HEADER]: operationId,
                  }
                : {}),
            },
            body: JSON.stringify({
              paths: missingSources,
              targetDir: folderPath,
            }),
          });
          if (!response.ok) {
            throw new AdoptionFailure(
              "http_response",
              `adoptFiles failed with HTTP ${response.status}`,
              classifyHttpStatus(response.status),
            );
          }
          let payload;
          try {
            payload = await response.json();
          } catch {
            throw new AdoptionFailure("invalid_response", "Gateway returned an invalid response");
          }
          const result = normalizeAdoptResponse(payload, missingSources);
          const failedSources = new Set(result.errors.map((error) => error.source));
          for (const mapping of result.adopted) {
            if (missingSources.includes(mapping.source) && !failedSources.has(mapping.source)) {
              destinationsBySource[mapping.source] = mapping.destination;
              if (mapping.attachment_id) {
                attachmentIdsBySource[mapping.source] = mapping.attachment_id;
              }
            }
          }
          const stillMissing = missingSources.filter(
            (source) => destinationsBySource[source] === void 0,
          );
          if (stillMissing.length > 0) {
            const messages2 = result.errors
              .filter((error) => stillMissing.includes(error.source))
              .map((error) => `${error.source}: ${error.message}`);
            throw new AdoptionFailure(
              "incomplete_response",
              messages2.length > 0
                ? messages2.join("; ")
                : `Gateway did not adopt: ${stillMissing.join(", ")}`,
            );
          }
        }
        const mediaPaths = attachments
          .map((source) => destinationsBySource[source])
          .filter((path2) => Boolean(path2) && isCanvasMediaPath(path2));
        const pendingProjectionPaths = mediaPaths.filter((path2) => !projectedPaths2.has(path2));
        const projectionResults = await Promise.allSettled(
          pendingProjectionPaths.map(async (assetPath) => {
            const canvasResponse = await scopedGatewayFetch(API_PATHS.canvasMediaNode, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                assetPath,
              }),
            });
            if (!canvasResponse.ok) {
              throw new AdoptionFailure(
                "http_response",
                `create canvas media node failed with HTTP ${canvasResponse.status}`,
                classifyHttpStatus(canvasResponse.status),
              );
            }
            projectedPaths2.add(assetPath);
          }),
        );
        const projectionFailure = projectionResults.find((result) => result.status === "rejected");
        if (projectionFailure) throw projectionFailure.reason;
        if (activeAdoptionKeyRef.current === adoptionKey) {
          setProgress({
            key: adoptionKey,
            attemptVersion: retryVersion,
            destinationsBySource,
            attachmentIdsBySource,
            projectedPaths: [...projectedPaths2],
          });
        }
      } catch (error) {
        const failure =
          error instanceof AdoptionFailure
            ? error
            : new AdoptionFailure(
                "network",
                error instanceof Error ? error.message : String(error),
              );
        reportAdoptionFailure(failure);
        console.warn("[useAdoptInitialAttachments] initial attachment preparation failed:", error);
        if (activeAdoptionKeyRef.current === adoptionKey) {
          setProgress({
            key: adoptionKey,
            attemptVersion: retryVersion,
            destinationsBySource,
            attachmentIdsBySource,
            projectedPaths: [...projectedPaths2],
            error: failure.message,
          });
        }
      } finally {
        if (inFlightKeyRef.current === adoptionKey) inFlightKeyRef.current = null;
      }
    })();
  }, [
    ready,
    adoptionKey,
    attachments,
    folderPath,
    operationId,
    progress,
    retryVersion,
    scopedGatewayFetch,
  ]);
  if (!attachments || attachments.length === 0) {
    return {
      ready: true,
      attachments: void 0,
      retry,
    };
  }
  if (!folderPath) {
    return {
      ready: false,
      attachments: void 0,
      error: "Workspace path is unavailable",
      retry,
    };
  }
  if (!ready || !adoptionKey || progress?.key !== adoptionKey) {
    return {
      ready: false,
      attachments: void 0,
      retry,
    };
  }
  const destinations = attachments.map((source) => progress.destinationsBySource[source]);
  const projectedPaths = new Set(progress.projectedPaths);
  const allReady = destinations.every(
    (destination) =>
      destination !== void 0 &&
      (!isCanvasMediaPath(destination) || projectedPaths.has(destination)),
  );
  if (!allReady || progress.error) {
    return {
      ready: false,
      attachments: void 0,
      ...(progress.error
        ? {
            error: progress.error,
          }
        : {}),
      retry,
    };
  }
  const attachmentRefs = attachments.flatMap((source, index2) => {
    const attachmentId = progress.attachmentIdsBySource[source];
    const destination = destinations[index2];
    return attachmentId && destination
      ? [
          {
            path: destination,
            attachment_source: "asset_vault",
            attachment_id: attachmentId,
          },
        ]
      : [];
  });
  return {
    ready: true,
    attachments: destinations,
    ...(attachmentRefs.length > 0
      ? {
          attachmentRefs,
        }
      : {}),
    retry,
  };
}
