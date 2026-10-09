// part-store.jsx
import { useTranslation, reactExports, reactDomExports, X$7, API_PATHS, measurePerf } from "../vendor.js";
import { actionTrailLog } from "../vendor-inline/vscode-base/graph.jsx";
import { ErrorCodes } from "../generation/push-inline.js";
import { TOOL_ABORTED_BY_USER_TEXT, ChatDiagnostics, diagnosticHistoryTools, chatToolIdentity, normalizeToolStatus$1 } from "../canvas/relayout-group-children.js";
import {
  cn$2,
  Button$1,
  registerBrowserHoverPreview,
} from "../infra/use-browser-overlay-dialog-props.jsx";
import { PERF_DERIVE_MESSAGES } from "../generation/text-models.js";
import {
  isCancelMarkerText,
  stripContextPrefix,
  cancelMarkerHasCanvasContinuation,
  parseCanvasGenerationHandoffTargetsFromMetadata,
  parseCanvasGenerationHandoffTargets,
  diagnosticToolPart,
  isRecoveredMessage,
  diagnosticChatTools,
} from "../text-editor/myers-line-hunks.js";
import { deriveBusy } from "../canvas/generating-media-area.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  KbdGroup,
  SHORTCUT_CATEGORIES,
  ShortcutKeycap,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  isMacPlatform,
} from "../workspace/shortcut-categories.jsx";
const ITEMS_PER_COLUMN = 5;
function chunkIntoColumns(items, perColumn) {
  const columns = [];
  for (let i2 = 0; i2 < items.length; i2 += perColumn) {
    columns.push(items.slice(i2, i2 + perColumn));
  }
  return columns;
}
function ShortcutRow$1({ item, isMac: isMac2 }) {
  const { t: t2 } = useTranslation();
  const keys2 = isMac2 ? item.mac : item.win;
  return (
    <div className="group flex cursor-default items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
      <span className="truncate text-xs">{t2(item.labelKey)}</span>
      <KbdGroup>
        {keys2.map((key2) => (
          // 同一条快捷键内键位互不重复，label+key 组合即唯一
          <ShortcutKeycap key={`${item.labelKey}-${key2}`} token={key2} />
        ))}
      </KbdGroup>
    </div>
  );
}
export function ShortcutsPanel({ open, onOpenChange }) {
  const { t: t2 } = useTranslation();
  const isMac2 = isMacPlatform();
  const [activeTab, setActiveTab] = reactExports.useState(SHORTCUT_CATEGORIES[0]?.id ?? "global");
  const [mounted, setMounted] = reactExports.useState(false);
  reactExports.useEffect(() => setMounted(true), []);
  reactExports.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e2) => {
      if (e2.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);
  if (!mounted) return null;
  return reactDomExports.createPortal(
    // 外层常驻挂载以保留滑动动画；关闭时 pointer-events-none + 下移隐藏，
    // 完全不拦截底层画布的鼠标 / 键盘事件（非模态）。面板固定在画布底部
    // 工具栏上方，宽度和高度都受视口约束，不再覆盖整条底边。
    <div
      className={cn$2(
        "elevated-surface-border fixed bottom-16 left-1/2 z-30 flex h-[min(320px,calc(100vh-96px))] w-[min(680px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-lg transition-transform duration-200 ease-out",
        open ? "translate-y-0" : "pointer-events-none translate-y-[calc(100%+80px)]",
      )}
      data-action-ui-id="shortcuts.panel"
      data-open={open ? "" : void 0}
      aria-hidden={!open}
    >
      <Tabs value={activeTab} onValueChange={(v2) => setActiveTab(v2)} className="h-full gap-0">
        <div className="relative flex h-8 shrink-0 justify-center border-b border-border [border-bottom-width:var(--divider-width)]">
          <TabsList className="h-full gap-6! rounded-lg! bg-transparent! p-0!">
            {SHORTCUT_CATEGORIES.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="h-full rounded-none! border-b border-transparent bg-transparent! px-1 py-0 text-xs text-muted-foreground shadow-none! transition-colors hover:text-foreground data-active:border-foreground data-active:font-medium data-active:text-foreground [border-bottom-width:var(--divider-width)]"
                data-action-ui-id={`shortcuts.panel.tab.${cat.id}`}
              >
                {t2(cat.labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button$1
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label={t2("common.close")}
            data-action-ui-id="shortcuts.panel.close"
            className="absolute inset-y-0 right-3 my-auto"
          >
            <X$7 />
          </Button$1>
        </div>
        {SHORTCUT_CATEGORIES.map((cat) => (
          <TabsContent
            key={cat.id}
            value={cat.id}
            className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 py-3"
          >
            <div className="flex h-full justify-center divide-x-[var(--divider-width)] divide-border">
              {chunkIntoColumns(cat.items, ITEMS_PER_COLUMN).map((column) => (
                <div key={column.map((i2) => i2.labelKey).join("|")} className="w-52 shrink-0 px-3">
                  {column.map((item) => (
                    <ShortcutRow$1 key={item.labelKey} item={item} isMac={isMac2} />
                  ))}
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>,
    document.body,
  );
}
const CAPTURE_TIMEOUT_MS = 800;
function settle(operation, signal) {
  return new Promise((resolve) => {
    const finish = (value) => {
      clearTimeout(timer2);
      signal.removeEventListener("abort", abort);
      resolve(value);
    };
    const abort = () => finish();
    const timer2 = setTimeout(abort, CAPTURE_TIMEOUT_MS);
    signal.addEventListener("abort", abort, {
      once: true,
    });
    operation.then(finish, abort);
    if (signal.aborted) abort();
  });
}
function afterPaint(signal) {
  return new Promise((resolve) => {
    let frame2;
    const finish = () => {
      cancelAnimationFrame(frame2);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    signal.addEventListener("abort", finish, {
      once: true,
    });
    frame2 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(finish);
    });
    if (signal.aborted) finish();
  });
}
async function prepareBrowserHoverSnapshot({
  browser: browser2,
  bridge,
  viewport,
  tabId,
  signal,
  requireSnapshot = false,
}) {
  const setOccluded = bridge.setNativeViewOcclusion?.bind(bridge);
  if (signal.aborted || !setOccluded) return;
  const token2 = `sidebar-hover:${crypto.randomUUID()}`;
  const doc2 = viewport?.ownerDocument ?? document;
  const initialFocus = doc2.activeElement;
  let focusChanged = false;
  const onFocus = (event) => {
    if (event.target !== initialFocus) focusChanged = true;
  };
  const onPointerDown2 = (event) => {
    if (
      event.target instanceof Element &&
      event.target.closest("input, textarea, select, button, a, [contenteditable], [tabindex]")
    )
      focusChanged = true;
  };
  doc2.addEventListener("focusin", onFocus);
  doc2.addEventListener("pointerdown", onPointerDown2, true);
  let image2;
  let acquisitionStarted = false;
  let release;
  const restoreNativeView = async () => {
    if (!acquisitionStarted) return;
    if (tabId && viewport?.isConnected && browser2.setBounds) {
      await afterPaint(AbortSignal.timeout(100));
      if (viewport.isConnected) {
        const rect = viewport.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          try {
            await browser2.setBounds(tabId, {
              x: Math.round(rect.left),
              y: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            });
          } catch (error) {
            console.error("[browser-hover-snapshot] Failed to restore native bounds", error);
          }
        }
      }
    }
    if (focusChanged)
      await setOccluded(token2, false, {
        restoreFocus: false,
      });
    else await setOccluded(token2, false);
    if (image2) await afterPaint(AbortSignal.timeout(100));
  };
  const cleanup = () => {
    signal.removeEventListener("abort", onAbort);
    release ??= restoreNativeView()
      .catch((error) => {
        console.error("[browser-hover-snapshot] Failed to release native view", error);
      })
      .finally(() => {
        doc2.removeEventListener("focusin", onFocus);
        doc2.removeEventListener("pointerdown", onPointerDown2, true);
        image2?.remove();
      });
    return release;
  };
  const onAbort = () => void cleanup();
  signal.addEventListener("abort", onAbort, {
    once: true,
  });
  const capture = async () => {
    if (!tabId || !viewport?.isConnected || signal.aborted) return;
    const result = await settle(browser2.captureFrame(tabId), signal);
    if (signal.aborted || !result?.success || !result.dataUrl?.startsWith("data:image/png;base64,"))
      return;
    const next2 = doc2.createElement("img");
    next2.alt = "";
    next2.draggable = false;
    const rect = viewport.getBoundingClientRect();
    next2.className = "pointer-events-none absolute max-w-none select-none";
    next2.style.width = `${result.width ?? Math.round(rect.width)}px`;
    next2.style.height = `${result.height ?? Math.round(rect.height)}px`;
    next2.style.left = `${Math.round(rect.left) - rect.left}px`;
    next2.style.top = `${Math.round(rect.top) - rect.top}px`;
    next2.dataset.actionUiId = "browser-hover-snapshot";
    next2.src = result.dataUrl;
    const decoded = await settle(
      next2.decode().then(() => true),
      signal,
    );
    if (signal.aborted || !decoded || !viewport.isConnected) return;
    image2 = next2;
    viewport.append(image2);
    await afterPaint(signal);
  };
  try {
    await capture();
    if (signal.aborted) return;
    if (requireSnapshot && tabId && !image2?.isConnected) {
      throw new Error("Browser snapshot was not painted; keeping the native page visible");
    }
    acquisitionStarted = true;
    await setOccluded(token2, true);
  } catch (error) {
    await cleanup();
    throw error;
  } finally {
    if (signal.aborted || !acquisitionStarted) await cleanup();
  }
}
export function useBrowserHoverSnapshot({
  browser: browser2,
  bridge,
  viewportRef,
  tabId,
  viewportKey,
}) {
  const currentTabId = reactExports.useRef(tabId);
  reactExports.useLayoutEffect(() => {
    currentTabId.current = tabId;
  }, [tabId]);
  reactExports.useEffect(() => {
    if (!browser2 || !bridge.setNativeViewOcclusion || !viewportKey) return;
    return registerBrowserHoverPreview((signal, options) =>
      prepareBrowserHoverSnapshot({
        browser: browser2,
        bridge,
        viewport: viewportRef.current,
        // A lease belongs to the mounted surface, not its active tab. Closing
        // or switching a tab while a popup is open must not release/reacquire
        // occlusion and collapse the popup during the next capture. A new
        // request captures the latest committed tab; an open request stays frozen.
        tabId: currentTabId.current,
        signal,
        requireSnapshot: options?.requireSnapshot,
      }),
    );
  }, [browser2, bridge, viewportRef, viewportKey]);
}
let active = null;
export function setActiveChatSnapshot(snapshot2) {
  active = snapshot2;
}
export function clearActiveChatSnapshot(controller) {
  if (active?.controller === controller) {
    active = null;
  }
}
export function getActiveChatSnapshot() {
  return active;
}
export function recordError(message2, data2) {
  actionTrailLog.error(message2, data2);
}
export function subMessageSemanticKey(message2) {
  return JSON.stringify({
    type: message2.type,
    content: message2.content,
    args: message2.args,
    toolStatus: message2.toolStatus,
    url: message2.url,
    agent: message2.agent,
    resolved: message2.resolved,
    subMessages: message2.subMessages?.map(subMessageSemanticKey),
  });
}
function isRecord$d(value) {
  return !!value && typeof value === "object";
}
export function extractTaskDisplayPrompt(input) {
  let parsed = input;
  if (typeof input === "string") {
    try {
      parsed = JSON.parse(input);
    } catch {
      return void 0;
    }
  }
  if (!isRecord$d(parsed)) return void 0;
  for (const key2 of ["prompt", "description"]) {
    const value = parsed[key2];
    if (typeof value === "string" && value.trim()) return value;
  }
  return void 0;
}
function extractErrorString(err) {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const e2 = err;
    if (typeof e2.message === "string") return e2.message;
    if (typeof e2.data === "object" && e2.data && typeof e2.data.message === "string") {
      return e2.data.message;
    }
  }
  return String(err ?? "Unknown error");
}
function normalizeFileUrl(rawUrl, filename) {
  if (rawUrl.startsWith("/files/") || rawUrl.startsWith("http")) return rawUrl;
  const name2 = filename ?? rawUrl.split("/").pop() ?? rawUrl;
  return API_PATHS.serveFile(name2);
}
function serializeToolInput(input) {
  return typeof input === "string" ? input : JSON.stringify(input);
}
function deriveToolResult(state2) {
  if (state2.status === "completed") return String(state2.output ?? "");
  if (state2.status === "error") return extractErrorString(state2.error);
  return void 0;
}
const BILLING_GENERATION_ERROR_CODE = "billing_insufficient_balance";
function toBillingCredits(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : void 0;
}
function deriveBillingMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  const record2 = value;
  const estimated = toBillingCredits(record2.estimated_credits);
  const current2 = toBillingCredits(record2.current_credits);
  const shortfall = toBillingCredits(record2.shortfall_credits);
  if (estimated === void 0 && current2 === void 0 && shortfall === void 0) return void 0;
  return {
    ...(estimated !== void 0
      ? {
          estimated_credits: estimated,
        }
      : {}),
    ...(current2 !== void 0
      ? {
          current_credits: current2,
        }
      : {}),
    ...(shortfall !== void 0
      ? {
          shortfall_credits: shortfall,
        }
      : {}),
  };
}
function deriveActionRequiredMessage(toolResult, partId, nextId2) {
  if (!toolResult) return void 0;
  if (!toolResult.includes(BILLING_GENERATION_ERROR_CODE)) return void 0;
  let payload;
  try {
    payload = JSON.parse(toolResult);
  } catch {
    return void 0;
  }
  if (!payload || typeof payload !== "object") return void 0;
  const record2 = payload;
  if (record2.error_code !== BILLING_GENERATION_ERROR_CODE) return void 0;
  const billing = deriveBillingMetadata(record2.billing);
  return {
    id: nextId2(),
    partId: `${partId}__action_required`,
    role: "agent",
    type: "error",
    content: "",
    error: {
      error_code: ErrorCodes.BILLING_INSUFFICIENT_BALANCE,
      user_message: "",
      retryable: false,
      ...(billing
        ? {
            billing,
          }
        : {}),
    },
  };
}
function mapToolStatus$1(status) {
  if (status === "completed") return "ok";
  if (status === "error") return "error";
  if (status === "running") return "running";
  return "pending";
}
function isToolOutputCancelledError(output) {
  if (output == null) return false;
  return /^Error:/i.test(String(output));
}
function applyCancelledOverride(status, output) {
  if (status === "pending" || status === "running") return "error";
  if (status === "ok" && isToolOutputCancelledError(output)) return "error";
  return status;
}
function cancelledToolInterruption(statusChanged, runtimeAborted, handedOffToCanvas) {
  if (handedOffToCanvas && (statusChanged || runtimeAborted)) return "canvas_continuation";
  return statusChanged ? "aborted" : void 0;
}
function isRuntimeAbortedResult(toolResult) {
  return !!toolResult && toolResult.includes(TOOL_ABORTED_BY_USER_TEXT);
}
function isCancelMarkerPart(part) {
  if (part.type !== "text") return false;
  return isCancelMarkerText(stripContextPrefix(part.text).trim());
}
function isCanvasContinuationMarkerPart(part) {
  if (part.type !== "text") return false;
  if (markerCanvasGenerationHandoffTargets(part).length > 0) return true;
  return cancelMarkerHasCanvasContinuation(stripContextPrefix(part.text).trim());
}
function markerCanvasGenerationHandoffTargets(part) {
  if (part.type !== "text") return [];
  const fromMetadata = parseCanvasGenerationHandoffTargetsFromMetadata(part.metadata);
  if (fromMetadata.length > 0) return fromMetadata;
  return parseCanvasGenerationHandoffTargets(stripContextPrefix(part.text).trim());
}
function targetsForTool(targets, callId, childSessionId) {
  const exact = targets.filter((target) => target.tool_use_id === callId);
  if (exact.length > 0) return exact;
  const childFallback = targets.filter(
    (target) => !target.tool_use_id && target.child_session_id === childSessionId,
  );
  if (childFallback.length > 0) return childFallback;
  return targets.filter((target) => !target.tool_use_id && !target.child_session_id);
}
function mimeToMediaType(mime) {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file_added";
}
export class PartStore {
  constructor(isMessageWithdrawn = () => false) {
    this.isMessageWithdrawn = isMessageWithdrawn;
  }
  parts = new Map();
  // 历史补回的明确中断证据，与下面的历史种子归属分开；实时回放不会自动撤销证据。
  historyToolInterruptions = new Map();
  // Includes completed seeds; live updates take ownership and remove this marker.
  historySeedPartIds = new Set();
  sessionParts = new Map();
  cancelledToolPartIds = new Set();
  handedOffToolPartIds = new Set();
  handoffTargetsByToolPartId = new Map();
  pendingCancelledToolPartIdsBySession = new Map();
  partSequences = new Map();
  childPartOwners = new Map();
  activeTaskPartByChildSession = new Map();
  pendingChildPartIds = new Map();
  nextPartSequence = 0;
  partRevisions = new Map();
  sessionRevisions = new Map();
  derivedMessageCache = new Map();
  subMessageCache = new Map();
  /**
   * History-seeded sub messages per child session. On recover/resume the child
   * session's pre-crash transcript exists only in OpenCode history (never
   * streamed as live parts to this store). Without it, deriveSubMessages would
   * yield only the post-recovery continuation, dropping the original steps. The
   * controller seeds the history block's subMessages here so the part-derived
   * block reads "original history + resumed continuation" — complete and still
   * live-updatable. Seeds are prepended; live child parts append after.
   */
  // Legacy key: childSeedKey(childSessionId, optional agentName); no invocation identity.
  childSubMessageSeeds = new Map();
  // Invocation key: parent task Part.id, not childSessionId or tool callID.
  taskSubMessageSeeds = new Map();
  resolvedQuestionResults = new Map();
  /**
   * Seed a child session's pre-crash sub messages (from OpenCode history).
   * Replaces a stale seed when a later history rebuild contains more rounds,
   * while remaining idempotent across identical session_switched events.
   */
  seedChildSubMessages(childSessionId, messages2, agentName, taskPartId) {
    if (messages2.length === 0) return;
    const seeds = taskPartId ? this.taskSubMessageSeeds : this.childSubMessageSeeds;
    const seedKey = taskPartId ?? childSeedKey(childSessionId, agentName);
    const existing = seeds.get(seedKey);
    if (existing && subMessagesReplayEqual(existing, messages2)) return;
    seeds.set(seedKey, cloneSubMessages(messages2));
    this.invalidateSubMessageCache(childSessionId);
    this.bumpSessionRevision(childSessionId);
  }
  clearChildSubMessageSeed(childSessionId, agentName) {
    this.childSubMessageSeeds.delete(childSeedKey(childSessionId, agentName));
    this.invalidateSubMessageCache(childSessionId);
    this.bumpSessionRevision(childSessionId);
  }
  hasChildSubMessageSeed(childSessionId, agentName) {
    return this.childSubMessageSeeds.has(childSeedKey(childSessionId, agentName));
  }
  handlePartUpdated(part) {
    if (this.isMessageWithdrawn(part.messageID)) return;
    this.updatePart(part, false);
  }
  updatePart(part, fromHistory2) {
    const existing = this.parts.get(part.id);
    if (!fromHistory2) this.historySeedPartIds.delete(part.id);
    let next2 = reconcileToolPart(existing, part, fromHistory2);
    if (next2.type === "tool" && next2.tool === "question") {
      const resolvedQuestionResult = this.resolvedQuestionResults.get(next2.callID);
      if (resolvedQuestionResult) {
        next2 = completeResolvedQuestionPart(next2, resolvedQuestionResult);
      }
    }
    if (next2.type === "tool" && !canCarryToolInterruption(next2)) {
      this.historyToolInterruptions.delete(next2.id);
      this.cancelledToolPartIds.delete(next2.id);
      this.handedOffToolPartIds.delete(next2.id);
      this.handoffTargetsByToolPartId.delete(next2.id);
    }
    this.parts.set(next2.id, next2);
    if (!existing) this.partSequences.set(next2.id, ++this.nextPartSequence);
    this.bumpPartRevision(next2.id);
    this.bumpSessionRevision(next2.sessionID);
    if (!existing) {
      const sesParts = this.sessionParts.get(next2.sessionID) ?? [];
      sesParts.push(next2.id);
      this.sessionParts.set(next2.sessionID, sesParts);
    }
    if (!fromHistory2) this.trackChildPartOwnership(existing, next2);
    return next2;
  }
  restoreHistoryTaskOwnership(taskPartIds) {
    const snapshotTaskIds = new Set(taskPartIds);
    const latestByChild = new Map();
    for (const taskPartId of snapshotTaskIds) {
      const part = this.parts.get(taskPartId);
      if (part?.type !== "tool" || part.tool !== "task") continue;
      const childId = extractChildSessionId(part);
      if (childId) latestByChild.set(childId, taskPartId);
    }
    for (const [childId, taskPartId] of latestByChild) {
      const liveOwner = this.activeTaskPartByChildSession.get(childId);
      if (liveOwner && !this.historySeedPartIds.has(liveOwner) && !snapshotTaskIds.has(liveOwner))
        continue;
      this.assignChildOwner(childId, taskPartId);
    }
  }
  /** 历史按状态前进规则补齐源记录；已有实时 Part 不会因此变成可裁剪的历史种子。 */
  seedHistoryToolPart(part, interruption, targets = []) {
    if (this.isMessageWithdrawn(part.messageID)) return;
    const existing = this.parts.get(part.id);
    if (existing && !isSameToolCall(existing, part)) return;
    const restored = this.updatePart(part, true);
    if (!existing) this.historySeedPartIds.add(part.id);
    if (restored.type !== "tool" || !canCarryToolInterruption(restored)) return;
    if (interruption && this.historyToolInterruptions.get(part.id) !== "canvas_continuation") {
      this.historyToolInterruptions.set(part.id, interruption);
    }
    if (interruption) this.cancelledToolPartIds.add(part.id);
    if (interruption === "canvas_continuation") {
      this.handedOffToolPartIds.add(part.id);
      const matchingTargets = targetsForTool(targets, part.callID || part.id, part.sessionID);
      if (matchingTargets.length > 0) this.handoffTargetsByToolPartId.set(part.id, matchingTargets);
    }
  }
  handlePartDelta(partId, delta) {
    const part = this.parts.get(partId);
    if (!part || this.isMessageWithdrawn(part.messageID)) return;
    if (part.type === "text") {
      this.parts.set(partId, {
        ...part,
        text: part.text + delta,
      });
    } else if (part.type === "reasoning") {
      this.parts.set(partId, {
        ...part,
        text: part.text + delta,
      });
    }
    this.bumpPartRevision(partId);
    this.bumpSessionRevision(part.sessionID);
  }
  /** Only a successful authoritative snapshot may remove obsolete history seeds. */
  pruneHistoryToolSeeds(sessionId, retainedPartIds) {
    const ids2 = this.sessionParts.get(sessionId);
    if (!ids2) return;
    const retained = ids2.filter((id2) => {
      if (!this.historySeedPartIds.has(id2) || retainedPartIds.has(id2)) return true;
      this.removePart(id2);
      return false;
    });
    if (retained.length === ids2.length) return;
    this.sessionParts.set(sessionId, retained);
    this.bumpSessionRevision(sessionId);
  }
  getPart(partId) {
    return this.parts.get(partId);
  }
  /**
   * Treat the gateway/OpenCode question acknowledgement as authoritative.
   * A stale error part can race behind the accepted reply; remembering the
   * callID prevents that late frame from rendering a false "Question failed".
   */
  markQuestionResolved(callID, output, title = "Question answered") {
    const result = {
      output,
      title,
    };
    this.resolvedQuestionResults.set(callID, result);
    for (const part of this.parts.values()) {
      if (part.type !== "tool" || part.tool !== "question" || part.callID !== callID) continue;
      this.handlePartUpdated(completeResolvedQuestionPart(part, result));
      return true;
    }
    return false;
  }
  getSessionParts(sessionID) {
    const ids2 = this.sessionParts.get(sessionID);
    if (!ids2) return [];
    return ids2.map((id2) => this.parts.get(id2)).filter((p3) => p3 !== void 0);
  }
  getSessionPartCount(sessionID) {
    return this.sessionParts.get(sessionID)?.length ?? 0;
  }
  getToolDiagnosticManifest(rootSessionId) {
    return [...this.parts.values()].flatMap((part) => {
      const tool2 = diagnosticToolPart(part);
      return tool2
        ? [
            {
              ...tool2,
              scope: part.sessionID === rootSessionId ? "root" : "child",
            },
          ]
        : [];
    });
  }
  getDiagnostics() {
    return {
      partCount: this.parts.size,
      sessionCount: this.sessionParts.size,
      derivedCacheEntries: this.derivedMessageCache.size,
      subMessageCacheEntries: this.subMessageCache.size,
    };
  }
  getRecoveryDiagnostics(rootSessionId) {
    const counts = {
      taskParts: 0,
      linkedTaskParts: 0,
      childParts: 0,
      ownedChildParts: 0,
      waitingChildParts: 0,
    };
    for (const part of this.parts.values()) {
      if (part.sessionID === rootSessionId) {
        if (part.type === "tool" && part.tool === "task") {
          counts.taskParts++;
          if (extractChildSessionId(part)) counts.linkedTaskParts++;
        }
        continue;
      }
      counts.childParts++;
      const ownerId = this.childPartOwners.get(part.id);
      const owner = ownerId ? this.parts.get(ownerId) : void 0;
      if (owner?.sessionID === rootSessionId) counts.ownedChildParts++;
      else counts.waitingChildParts++;
    }
    return counts;
  }
  markSessionCancelled(sessionId) {
    const newlyCancelledPartIds = new Set();
    for (const part of this.getSessionParts(sessionId)) {
      if (part.type !== "tool") continue;
      if (this.cancelledToolPartIds.has(part.id)) continue;
      const status = mapToolStatus$1(part.state.status);
      if (status !== "pending" && status !== "running") continue;
      this.cancelledToolPartIds.add(part.id);
      newlyCancelledPartIds.add(part.id);
    }
    const pending2 = this.pendingCancelledToolPartIdsBySession.get(sessionId);
    if (pending2) for (const partId of pending2) newlyCancelledPartIds.add(partId);
    this.pendingCancelledToolPartIdsBySession.set(sessionId, newlyCancelledPartIds);
    this.clearDerivedCaches();
  }
  /**
   * Gateway-confirmed Stop handoff: upgrade the cancelled parts of this root
   * session to Canvas continuation. Only root parts are marked here — the
   * generation tools run inside child sessions (image/video subagents), and
   * their derive path resolves handoff state through the owning `task` part id
   * (see {@link deriveSubMessages}), so child parts need no per-part marking.
   */
  markSessionGenerationHandedOff(sessionId, targets = []) {
    const pendingPartIds = this.pendingCancelledToolPartIdsBySession.get(sessionId);
    this.pendingCancelledToolPartIdsBySession.delete(sessionId);
    if (!pendingPartIds) return;
    for (const partId of pendingPartIds) {
      if (!this.cancelledToolPartIds.has(partId)) continue;
      this.handedOffToolPartIds.add(partId);
      if (targets.length > 0) this.handoffTargetsByToolPartId.set(partId, [...targets]);
    }
    this.clearDerivedCaches();
  }
  /**
   * Close a cancellation acknowledgement that did not hand generation to the
   * Canvas. The cancelled structural state remains on the affected tool parts;
   * only the temporary handoff-candidate set is discarded so a later turn
   * cannot upgrade old aborted tools with new continuation targets.
   */
  settleSessionCancellation(sessionId) {
    this.pendingCancelledToolPartIdsBySession.delete(sessionId);
  }
  clear() {
    this.parts.clear();
    this.historyToolInterruptions.clear();
    this.historySeedPartIds.clear();
    this.sessionParts.clear();
    this.cancelledToolPartIds.clear();
    this.handedOffToolPartIds.clear();
    this.handoffTargetsByToolPartId.clear();
    this.pendingCancelledToolPartIdsBySession.clear();
    this.partSequences.clear();
    this.childPartOwners.clear();
    this.activeTaskPartByChildSession.clear();
    this.pendingChildPartIds.clear();
    this.nextPartSequence = 0;
    this.partRevisions.clear();
    this.sessionRevisions.clear();
    this.childSubMessageSeeds.clear();
    this.taskSubMessageSeeds.clear();
    this.resolvedQuestionResults.clear();
    this.clearDerivedCaches();
  }
  /**
   * Release all parts belonging to a session (cold transition).
   * After calling this, deriveMessages() for this session returns [].
   */
  releaseSession(sessionId) {
    const ids2 = this.sessionParts.get(sessionId);
    if (!ids2) return;
    for (const id2 of ids2) {
      this.removePart(id2);
    }
    this.sessionParts.delete(sessionId);
    this.activeTaskPartByChildSession.delete(sessionId);
    this.pendingChildPartIds.delete(sessionId);
    this.pendingCancelledToolPartIdsBySession.delete(sessionId);
    this.sessionRevisions.delete(sessionId);
    this.childSubMessageSeeds.delete(sessionId);
    this.invalidateSubMessageCache(sessionId);
  }
  /**
   * Trim a session to only its most recent `keepCount` parts (warm transition).
   * Older parts are removed from the flat index; the session entry is shortened.
   * @returns The Part objects that were removed (caller can inspect for task tools).
   */
  trimToRecent(sessionId, keepCount) {
    const ids2 = this.sessionParts.get(sessionId);
    if (!ids2 || ids2.length <= keepCount) return [];
    const toRemoveIds = ids2.slice(0, ids2.length - keepCount);
    const removed = [];
    for (const id2 of toRemoveIds) {
      const part = this.parts.get(id2);
      if (part) removed.push(part);
      this.removePart(id2);
    }
    this.sessionParts.set(sessionId, ids2.slice(ids2.length - keepCount));
    this.bumpSessionRevision(sessionId);
    return removed;
  }
  /** Follow recorded task-part ownership, including nested children and reused sessions. */
  getRootMessageId(messageId) {
    let part = [...this.parts.values()].find((candidate) => candidate.messageID === messageId);
    const seen2 = new Set();
    while (part && !seen2.has(part.id)) {
      seen2.add(part.id);
      const ownerId = this.childPartOwners.get(part.id);
      const owner = ownerId ? this.parts.get(ownerId) : void 0;
      if (!owner) break;
      part = owner;
    }
    return part?.messageID ?? messageId;
  }
  removePart(id2) {
    this.taskSubMessageSeeds.delete(id2);
    const part = this.parts.get(id2);
    this.forgetPartOwnership(id2, part);
    if (part?.type === "tool" && part.tool === "question") {
      this.resolvedQuestionResults.delete(part.callID);
    }
    if (part) {
      const pending2 = this.pendingCancelledToolPartIdsBySession.get(part.sessionID);
      if (pending2?.has(id2)) {
        const retained = new Set(pending2);
        retained.delete(id2);
        if (retained.size > 0)
          this.pendingCancelledToolPartIdsBySession.set(part.sessionID, retained);
        else this.pendingCancelledToolPartIdsBySession.delete(part.sessionID);
      }
    }
    this.parts.delete(id2);
    this.historyToolInterruptions.delete(id2);
    this.historySeedPartIds.delete(id2);
    this.cancelledToolPartIds.delete(id2);
    this.handedOffToolPartIds.delete(id2);
    this.handoffTargetsByToolPartId.delete(id2);
    this.partSequences.delete(id2);
    this.partRevisions.delete(id2);
    this.derivedMessageCache.delete(id2);
  }
  getPartSessionId(partId) {
    return this.parts.get(partId)?.sessionID;
  }
  isSessionPart(sessionId, partId) {
    return this.parts.get(partId)?.sessionID === sessionId;
  }
  isLastSessionPart(sessionId, partId) {
    const ids2 = this.sessionParts.get(sessionId);
    return ids2?.[ids2.length - 1] === partId;
  }
  findTaskPartIdByChildSessionId(rootSessionId, childSessionId) {
    const ids2 = this.sessionParts.get(rootSessionId);
    if (!ids2) return void 0;
    for (let index2 = ids2.length - 1; index2 >= 0; index2 -= 1) {
      const part = this.parts.get(ids2[index2]);
      if (part?.type !== "tool" || part.tool !== "task") continue;
      if (extractChildSessionId(part) === childSessionId) return part.id;
    }
    return void 0;
  }
  derivePartMessages(partId, childSessions, options = {}) {
    const t0 = performance.now();
    const messages2 = this.derivePartMessagesCached(
      partId,
      childSessions,
      options.sessionCancelled === true,
      false,
      [],
    );
    measurePerf(
      PERF_DERIVE_MESSAGES,
      t0,
      {
        parts: 1,
        messages: messages2.length,
        mode: "part-cache",
      },
      {
        metadata: options.perfMetadata,
      },
    );
    return messages2;
  }
  deriveMessages(rootSessionId, childSessions, perfMetadata) {
    const t0 = performance.now();
    const messages2 = [];
    const partIds = this.sessionParts.get(rootSessionId);
    if (!partIds) return messages2;
    const cancelMarkers = partIds.reduce((markers, pid, index2) => {
      const part = this.parts.get(pid);
      if (part && isCancelMarkerPart(part)) {
        markers.push({
          index: index2,
          canvasContinuation: isCanvasContinuationMarkerPart(part),
          targets: markerCanvasGenerationHandoffTargets(part),
        });
      }
      return markers;
    }, []);
    let cancelMarkerCursor = 0;
    let msgCounter = 0;
    const nextId2 = () => `derived-${++msgCounter}`;
    for (const [index2, partId] of partIds.entries()) {
      const part = this.parts.get(partId);
      if (!part) continue;
      if (part.type === "text" && part.synthetic) continue;
      if (part.type === "text" && part.ignored) continue;
      while (
        cancelMarkers[cancelMarkerCursor] !== void 0 &&
        index2 > cancelMarkers[cancelMarkerCursor].index
      ) {
        cancelMarkerCursor += 1;
      }
      const governingMarker =
        cancelMarkers[cancelMarkerCursor] !== void 0 &&
        index2 < cancelMarkers[cancelMarkerCursor].index
          ? cancelMarkers[cancelMarkerCursor]
          : void 0;
      const partCancelled = governingMarker !== void 0 || this.cancelledToolPartIds.has(part.id);
      messages2.push(
        ...this.derivePartMessagesCached(
          part.id,
          childSessions,
          partCancelled,
          governingMarker?.canvasContinuation === true,
          governingMarker?.targets ?? [],
          nextId2,
        ),
      );
    }
    measurePerf(
      PERF_DERIVE_MESSAGES,
      t0,
      {
        parts: partIds.length,
        messages: messages2.length,
        mode: "full-cache",
      },
      {
        metadata: perfMetadata,
      },
    );
    return messages2;
  }
  derivePartMessagesCached(
    partId,
    childSessions,
    sessionCancelled,
    markerHandedOff,
    markerHandoffTargets,
    nextId2 = void 0,
  ) {
    const part = this.parts.get(partId);
    if (!part || this.isMessageWithdrawn(part.messageID)) return [];
    sessionCancelled = sessionCancelled || this.cancelledToolPartIds.has(partId);
    const cacheKey = this.derivedCacheKey(
      part,
      sessionCancelled,
      markerHandedOff,
      markerHandoffTargets,
      childSessions,
    );
    const cached = this.derivedMessageCache.get(partId);
    if (cached?.key === cacheKey) {
      if (nextId2) {
        for (let index2 = 0; index2 < cached.messages.length; index2 += 1) {
          nextId2();
        }
      }
      return cloneChatMessages(cached.messages);
    }
    let counter2 = 0;
    const stableNextId = () => `derived:${part.id}:${++counter2}`;
    const result = this.partToChatMessage(
      part,
      nextId2 ?? stableNextId,
      childSessions,
      sessionCancelled,
      markerHandedOff,
      markerHandoffTargets,
    );
    const messages2 = normalizeChatMessageResult(result).map((message2) => ({
      ...message2,
      runtimeMessageId: part.messageID,
    }));
    this.derivedMessageCache.set(partId, {
      key: cacheKey,
      messages: cloneChatMessages(messages2),
    });
    return messages2;
  }
  derivedCacheKey(part, sessionCancelled, markerHandedOff, markerHandoffTargets, childSessions) {
    const partRevision = this.partRevisions.get(part.id) ?? 0;
    const handoffTargetKey = markerHandoffTargets
      .map((target) => `${target.tool_use_id ?? ""}:${target.node_id}`)
      .join(",");
    if (part.type !== "tool" || part.tool !== "task") {
      return `${partRevision}:${sessionCancelled ? 1 : 0}:${markerHandedOff ? 1 : 0}:${handoffTargetKey}:${this.cancelledToolPartIds.has(part.id) ? 1 : 0}:${this.handedOffToolPartIds.has(part.id) ? 1 : 0}`;
    }
    const childSessionId = extractChildSessionId(part);
    const childRevision = childSessionId ? (this.sessionRevisions.get(childSessionId) ?? 0) : 0;
    const childCancelled = this.cancelledToolPartIds.has(part.id) ? 1 : 0;
    const childAgent = childSessionId
      ? (extractAgentNameFromPart(part) ?? childSessions.get(childSessionId) ?? "")
      : "";
    const liveHandoffTargetKey = (this.handoffTargetsByToolPartId.get(part.id) ?? [])
      .map((target) => `${target.tool_use_id ?? ""}:${target.node_id}`)
      .join(",");
    return `${partRevision}:${sessionCancelled ? 1 : 0}:${markerHandedOff ? 1 : 0}:${handoffTargetKey}:${liveHandoffTargetKey}:${this.cancelledToolPartIds.has(part.id) ? 1 : 0}:${this.handedOffToolPartIds.has(part.id) ? 1 : 0}:${childSessionId ?? ""}:${childAgent}:${childRevision}:${childCancelled}`;
  }
  partToChatMessage(
    part,
    nextId2,
    childSessions,
    sessionCancelled = false,
    markerHandedOff = false,
    markerHandoffTargets = [],
  ) {
    switch (part.type) {
      case "text": {
        const text2 = stripContextPrefix(part.text);
        if (!text2) return null;
        if (isCancelMarkerText(text2.trim())) {
          return {
            id: nextId2(),
            partId: part.id,
            role: "agent",
            type: "cancelled",
            content: "",
            ...(isCanvasContinuationMarkerPart(part)
              ? {
                  generationContinuesOnCanvas: true,
                  generationHandoffTargets: markerCanvasGenerationHandoffTargets(part),
                }
              : {}),
          };
        }
        if (part.role === "user") {
          return {
            id: nextId2(),
            partId: part.id,
            role: "user",
            type: "text",
            content: text2,
            runtimeMessageId: part.messageID,
          };
        }
        const role = isRecoveredMessage(text2) ? "user" : "agent";
        return {
          id: nextId2(),
          partId: part.id,
          role,
          type: "text",
          content: text2,
        };
      }
      case "reasoning": {
        if (!part.text.trim()) return null;
        return {
          id: nextId2(),
          partId: part.id,
          role: "agent",
          type: "thinking",
          content: part.text,
        };
      }
      case "tool": {
        if (part.state.status === "pending" && part.tool !== "task") return null;
        const isTask = part.tool === "task";
        const childSessionId = isTask ? extractChildSessionId(part) : void 0;
        let toolStatus = mapToolStatus$1(part.state.status);
        const toolResult = deriveToolResult(part.state);
        let interruption = this.historyToolInterruptions.get(part.id);
        if (sessionCancelled) {
          const output = "output" in part.state ? part.state.output : void 0;
          const cancelledStatus = applyCancelledOverride(toolStatus, output);
          const handedOff = this.handedOffToolPartIds.has(part.id) || markerHandedOff;
          interruption =
            cancelledToolInterruption(
              cancelledStatus !== toolStatus,
              isRuntimeAbortedResult(toolResult),
              handedOff,
            ) ?? interruption;
          toolStatus = cancelledStatus;
        }
        const liveHandoffTargets = this.handoffTargetsByToolPartId.get(part.id) ?? [];
        const generationHandoffTargets =
          interruption === "canvas_continuation"
            ? targetsForTool(
                markerHandoffTargets.length > 0 ? markerHandoffTargets : liveHandoffTargets,
                part.callID || part.id,
                part.sessionID,
              )
            : [];
        const toolMsg = {
          id: nextId2(),
          partId: part.id,
          role: "agent",
          type: "tool",
          content: part.tool,
          toolStatus,
          toolArgs: serializeToolInput(part.state.input),
          toolResult,
          ...(interruption
            ? {
                interruption,
              }
            : {}),
          ...(generationHandoffTargets.length > 0
            ? {
                generationHandoffTargets,
              }
            : {}),
          callID: part.callID || part.id,
          childSessionId,
        };
        const actionRequiredMessage = deriveActionRequiredMessage(
          toolMsg.type === "tool" ? toolMsg.toolResult : void 0,
          part.id,
          nextId2,
        );
        if (isTask && childSessionId) {
          const agentName =
            extractAgentNameFromPart(part) ?? childSessions.get(childSessionId) ?? "subagent";
          const subMessages = this.deriveSubMessagesCached(
            childSessionId,
            part.id,
            sessionCancelled,
            markerHandedOff,
            markerHandoffTargets,
          );
          const resolved = toolStatus === "ok" || toolStatus === "error";
          const childCancelled = sessionCancelled || this.cancelledToolPartIds.has(part.id);
          return [
            toolMsg,
            {
              id: nextId2(),
              partId: `${part.id}__sub_agent`,
              role: "agent",
              type: "sub_agent",
              content: "",
              agent: agentName,
              childSessionId,
              resolved,
              subMessages,
              ...(childCancelled
                ? {
                    cancelled: true,
                  }
                : {}),
            },
          ];
        }
        return actionRequiredMessage ? [toolMsg, actionRequiredMessage] : toolMsg;
      }
      case "file": {
        const fileUrl = normalizeFileUrl(part.url, part.filename);
        return {
          id: nextId2(),
          partId: part.id,
          role: "agent",
          type: mimeToMediaType(part.mime),
          content: part.filename ?? "",
          url: fileUrl,
        };
      }
      case "step.start":
      case "step.finish":
        return null;
    }
  }
  trackChildPartOwnership(existing, part) {
    if (part.type === "tool" && part.tool === "task") {
      const childSessionId = extractChildSessionId(part);
      if (!childSessionId) return;
      const previousChildSessionId =
        existing?.type === "tool" && existing.tool === "task"
          ? extractChildSessionId(existing)
          : void 0;
      const discoveredChildLink = previousChildSessionId !== childSessionId;
      if (discoveredChildLink) {
        this.assignChildOwner(childSessionId, part.id);
        return;
      }
      const isTerminal2 = part.state.status === "completed" || part.state.status === "error";
      if (isTerminal2 && this.activeTaskPartByChildSession.get(childSessionId) === part.id) {
        this.activeTaskPartByChildSession.delete(childSessionId);
      }
      return;
    }
    if (existing) return;
    const activeTaskPartId = this.activeTaskPartByChildSession.get(part.sessionID);
    if (activeTaskPartId) {
      this.childPartOwners.set(part.id, activeTaskPartId);
      this.historySeedPartIds.delete(activeTaskPartId);
      return;
    }
    const pendingPartIds = this.pendingChildPartIds.get(part.sessionID) ?? [];
    pendingPartIds.push(part.id);
    this.pendingChildPartIds.set(part.sessionID, pendingPartIds);
  }
  assignChildOwner(childSessionId, taskPartId) {
    const pendingPartIds = this.pendingChildPartIds.get(childSessionId) ?? [];
    for (const partId of pendingPartIds) {
      if (this.parts.has(partId) && !this.childPartOwners.has(partId)) {
        this.childPartOwners.set(partId, taskPartId);
        this.historySeedPartIds.delete(taskPartId);
      }
    }
    this.pendingChildPartIds.delete(childSessionId);
    this.activeTaskPartByChildSession.set(childSessionId, taskPartId);
    this.bumpSessionRevision(childSessionId);
  }
  forgetPartOwnership(partId, part) {
    this.childPartOwners.delete(partId);
    for (const [sessionId, pendingPartIds] of this.pendingChildPartIds) {
      const remaining = pendingPartIds.filter((id2) => id2 !== partId);
      if (remaining.length === 0) this.pendingChildPartIds.delete(sessionId);
      else if (remaining.length !== pendingPartIds.length) {
        this.pendingChildPartIds.set(sessionId, remaining);
      }
    }
    if (part?.type !== "tool" || part.tool !== "task") return;
    const childSessionId = extractChildSessionId(part);
    if (childSessionId && this.activeTaskPartByChildSession.get(childSessionId) === partId) {
      this.activeTaskPartByChildSession.delete(childSessionId);
    }
    for (const [childPartId, ownerTaskPartId] of this.childPartOwners) {
      if (ownerTaskPartId === partId) this.childPartOwners.delete(childPartId);
    }
  }
  deriveSubMessages(
    childSessionId,
    taskPartId,
    sessionCancelled = false,
    markerHandedOff = false,
    markerHandoffTargets = [],
  ) {
    const childSessionCancelled = sessionCancelled || this.cancelledToolPartIds.has(taskPartId);
    const taskHandedOff = this.handedOffToolPartIds.has(taskPartId) || markerHandedOff;
    const taskHandoffTargets =
      markerHandoffTargets.length > 0
        ? markerHandoffTargets
        : (this.handoffTargetsByToolPartId.get(taskPartId) ?? []);
    const taskSequence = this.partSequences.get(taskPartId) ?? Number.NEGATIVE_INFINITY;
    let hasEarlierTask = false;
    for (const part of this.parts.values()) {
      if (part.type !== "tool" || part.tool !== "task") continue;
      if (extractChildSessionId(part) !== childSessionId || part.id === taskPartId) continue;
      const sequence = this.partSequences.get(part.id);
      if (sequence == null) continue;
      if (sequence < taskSequence) hasEarlierTask = true;
    }
    const parts = this.getSessionParts(childSessionId).filter(
      (part) => this.childPartOwners.get(part.id) === taskPartId,
    );
    const taskPart = this.parts.get(taskPartId);
    const taskAgent =
      taskPart?.type === "tool" && taskPart.tool === "task"
        ? extractAgentNameFromPart(taskPart)
        : void 0;
    const seeded =
      this.taskSubMessageSeeds.get(taskPartId) ??
      (hasEarlierTask ? void 0 : this.getChildSubMessageSeed(childSessionId, taskAgent));
    const result = [];
    let counter2 = 0;
    const nextId2 = () => `sub-${++counter2}`;
    for (const part of parts) {
      if (part.type === "text" && (part.synthetic || part.ignored)) continue;
      switch (part.type) {
        case "text": {
          const last2 = result[result.length - 1];
          if (
            last2?.type === "text" &&
            !isRecoveredMessage(part.text) &&
            !isRecoveredMessage(last2.content)
          ) {
            result[result.length - 1] = {
              ...last2,
              content: last2.content + part.text,
            };
          } else {
            result.push({
              id: nextId2(),
              type: "text",
              content: part.text,
            });
          }
          break;
        }
        case "reasoning":
          if (!part.text.trim()) break;
          result.push({
            id: nextId2(),
            type: "thinking",
            content: part.text,
          });
          break;
        case "tool": {
          let toolStatus = mapToolStatus$1(part.state.status);
          const toolResult = deriveToolResult(part.state);
          let interruption;
          if (childSessionCancelled || this.cancelledToolPartIds.has(part.id)) {
            const output = "output" in part.state ? part.state.output : void 0;
            const cancelledStatus = applyCancelledOverride(toolStatus, output);
            const handedOff = taskHandedOff || this.handedOffToolPartIds.has(part.id);
            interruption = cancelledToolInterruption(
              cancelledStatus !== toolStatus,
              isRuntimeAbortedResult(toolResult),
              handedOff,
            );
            toolStatus = cancelledStatus;
          }
          const generationHandoffTargets =
            interruption === "canvas_continuation"
              ? targetsForTool(taskHandoffTargets, part.callID || part.id, childSessionId)
              : [];
          result.push({
            id: nextId2(),
            type: "tool",
            content: toolResult ? `${part.tool}: ${toolResult}` : part.tool,
            args: serializeToolInput(part.state.input),
            toolStatus,
            hasToolResult: part.state.status === "completed" || part.state.status === "error",
            ...(interruption
              ? {
                  interruption,
                }
              : {}),
            ...(generationHandoffTargets.length > 0
              ? {
                  generationHandoffTargets,
                }
              : {}),
            callID: part.callID || part.id,
          });
          break;
        }
        case "file":
          result.push({
            id: nextId2(),
            type: mimeToMediaType(part.mime),
            content: part.filename ?? "",
            url: normalizeFileUrl(part.url, part.filename),
          });
          break;
      }
    }
    const combined = seeded ? reconcileSeededSubMessages(seeded, result) : result;
    const taskPrompt =
      taskPart?.type === "tool" && taskPart.tool === "task"
        ? extractTaskDisplayPrompt(taskPart.state.input)
        : void 0;
    const alreadyIncludesTaskPrompt = combined.some(
      (message2) => message2.type === "text" && message2.content === taskPrompt,
    );
    if (!taskPrompt || result.length > 0 || alreadyIncludesTaskPrompt) return combined;
    return [
      ...combined,
      {
        id: nextId2(),
        type: "text",
        content: taskPrompt,
      },
    ];
  }
  deriveSubMessagesCached(
    childSessionId,
    taskPartId,
    sessionCancelled = false,
    markerHandedOff = false,
    markerHandoffTargets = [],
  ) {
    const revision = this.sessionRevisions.get(childSessionId) ?? 0;
    const taskRevision = this.partRevisions.get(taskPartId) ?? 0;
    const childSessionCancelled = sessionCancelled || this.cancelledToolPartIds.has(taskPartId);
    const taskHandedOff = markerHandedOff || this.handedOffToolPartIds.has(taskPartId);
    const handoffTargetKey = (
      markerHandoffTargets.length > 0
        ? markerHandoffTargets
        : (this.handoffTargetsByToolPartId.get(taskPartId) ?? [])
    )
      .map((target) => `${target.tool_use_id ?? ""}:${target.node_id}`)
      .join(",");
    const key2 = `${revision}:${taskRevision}:${childSessionCancelled ? 1 : 0}:${taskHandedOff ? 1 : 0}:${handoffTargetKey}`;
    const cacheId = `${childSessionId}\0${taskPartId}`;
    const cached = this.subMessageCache.get(cacheId);
    if (cached?.key === key2) {
      return cloneSubMessages(cached.messages);
    }
    const messages2 = this.deriveSubMessages(
      childSessionId,
      taskPartId,
      sessionCancelled,
      markerHandedOff,
      markerHandoffTargets,
    );
    this.subMessageCache.set(cacheId, {
      key: key2,
      messages: cloneSubMessages(messages2),
    });
    return messages2;
  }
  bumpPartRevision(partId) {
    this.partRevisions.set(partId, (this.partRevisions.get(partId) ?? 0) + 1);
    this.derivedMessageCache.delete(partId);
  }
  bumpSessionRevision(sessionId) {
    this.sessionRevisions.set(sessionId, (this.sessionRevisions.get(sessionId) ?? 0) + 1);
    this.invalidateSubMessageCache(sessionId);
    for (const [partId, part] of this.parts.entries()) {
      if (
        part.type === "tool" &&
        part.tool === "task" &&
        extractChildSessionId(part) === sessionId
      ) {
        this.derivedMessageCache.delete(partId);
      }
    }
  }
  clearDerivedCaches() {
    this.derivedMessageCache.clear();
    this.subMessageCache.clear();
  }
  invalidateSubMessageCache(childSessionId) {
    const prefix = `${childSessionId}\0`;
    for (const key2 of this.subMessageCache.keys()) {
      if (key2.startsWith(prefix)) this.subMessageCache.delete(key2);
    }
  }
  getChildSubMessageSeed(childSessionId, agentName) {
    if (agentName) {
      const exact = this.childSubMessageSeeds.get(childSeedKey(childSessionId, agentName));
      if (exact) return exact;
    }
    return this.childSubMessageSeeds.get(childSeedKey(childSessionId));
  }
}
function normalizeChatMessageResult(result) {
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}
function cloneChatMessages(messages2) {
  return messages2.map((message2) => ({
    ...message2,
    ...(message2.type === "sub_agent" && message2.subMessages
      ? {
          subMessages: cloneSubMessages(message2.subMessages),
        }
      : {}),
  }));
}
function cloneSubMessages(messages2) {
  return messages2.map((message2) => ({
    ...message2,
    ...(message2.subMessages
      ? {
          subMessages: cloneSubMessages(message2.subMessages),
        }
      : {}),
  }));
}
function subMessagesReplayEqual(left, right) {
  return (
    left.length === right.length &&
    left.every(
      (message2, index2) =>
        message2.callID === right[index2].callID &&
        subMessageSemanticKey(message2) === subMessageSemanticKey(right[index2]) &&
        // Result evidence affects seed freshness, not transcript identity/deduplication.
        message2.hasToolResult === right[index2].hasToolResult &&
        subMessagesReplayEqual(message2.subMessages ?? [], right[index2].subMessages ?? []),
    )
  );
}
function childSeedKey(childSessionId, agentName) {
  return agentName ? `${childSessionId}\0${agentName}` : childSessionId;
}
function subMessageReplayKey(message2) {
  return {
    callID: message2.type === "tool" ? message2.callID : void 0,
    semantic: subMessageSemanticKey(message2),
  };
}
function rangesMatch(left, right, offset2) {
  if (offset2 + left.length > right.length) return false;
  return left.every((key2, index2) => {
    const other = right[offset2 + index2];
    return key2.callID && other.callID
      ? key2.callID === other.callID
      : key2.semantic === other.semantic;
  });
}
function hasSubMessageToolResult(message2) {
  return (
    message2.hasToolResult ??
    (message2.toolStatus === "error" ||
      (message2.toolStatus === "ok" && message2.content.includes(": ")))
  );
}
function reconcileSeededTool(seed, live) {
  if (
    hasSubMessageToolResult(seed) &&
    (live.toolStatus === "pending" || live.toolStatus === "running")
  )
    return seed;
  return {
    ...live,
    id: seed.id,
  };
}
function reconcileSeededSubMessages(seeded, live) {
  if (seeded.length === 0 || live.length === 0) {
    return [...cloneSubMessages(seeded), ...cloneSubMessages(live)];
  }
  const liveTools = new Map(
    live.flatMap((message2) =>
      message2.type === "tool" && message2.callID ? [[message2.callID, message2]] : [],
    ),
  );
  const matchedCalls = new Set();
  const restored = seeded.map((message2) => {
    if (message2.type !== "tool" || !message2.callID) return message2;
    const tool2 = liveTools.get(message2.callID);
    if (!tool2) return message2;
    matchedCalls.add(message2.callID);
    return reconcileSeededTool(message2, tool2);
  });
  const seedKeys = seeded.map(subMessageReplayKey);
  const liveKeys = live.map(subMessageReplayKey);
  let liveOffset = 0;
  while (rangesMatch(seedKeys, liveKeys, liveOffset)) {
    liveOffset += seedKeys.length;
  }
  const maxOverlap = Math.min(seedKeys.length, liveKeys.length - liveOffset);
  for (let overlap = maxOverlap; overlap > 0; overlap--) {
    const seedSuffix = seedKeys.slice(seedKeys.length - overlap);
    if (!rangesMatch(seedSuffix, liveKeys, liveOffset)) continue;
    liveOffset += overlap;
    break;
  }
  const remaining = live
    .slice(liveOffset)
    .filter(
      (message2) =>
        !(message2.type === "tool" && message2.callID && matchedCalls.has(message2.callID)),
    );
  const combined = [...cloneSubMessages(restored), ...cloneSubMessages(remaining)];
  const boundary = seeded.length;
  const previous2 = combined[boundary - 1];
  const next2 = combined[boundary];
  if (
    previous2?.type === "text" &&
    next2?.type === "text" &&
    !isRecoveredMessage(previous2.content) &&
    !isRecoveredMessage(next2.content)
  ) {
    combined.splice(boundary - 1, 2, {
      ...previous2,
      content: previous2.content + next2.content,
    });
  }
  return combined;
}
function completeResolvedQuestionPart(part, result) {
  const now2 = Date.now();
  const start2 = part.state.status === "pending" ? now2 : part.state.time.start;
  const title = part.state.status === "completed" ? part.state.title : result.title;
  return {
    ...part,
    state: {
      status: "completed",
      input: part.state.input,
      output: result.output,
      title,
      time: {
        start: start2,
        end: now2,
      },
      ...(part.state.metadata
        ? {
            metadata: part.state.metadata,
          }
        : {}),
    },
  };
}
function isSameToolCall(existing, incoming) {
  return (
    existing.type === "tool" &&
    incoming.type === "tool" &&
    existing.id === incoming.id &&
    existing.sessionID === incoming.sessionID &&
    existing.tool === incoming.tool &&
    existing.callID === incoming.callID
  );
}
function reconcileToolPart(existing, incoming, fromHistory2) {
  if (!existing || incoming.type !== "tool" || !isSameToolCall(existing, incoming)) return incoming;
  const previous2 = existing.state;
  const next2 = incoming.state;
  const regresses =
    ((previous2.status === "completed" || previous2.status === "error") &&
      (next2.status === "pending" || next2.status === "running")) ||
    (fromHistory2 && previous2.status === "completed" && next2.status === "error") ||
    (previous2.status === "running" && next2.status === "pending");
  const keepTerminal =
    fromHistory2 &&
    previous2.status === next2.status &&
    ((previous2.status === "completed" && previous2.output !== "") ||
      (previous2.status === "error" && previous2.error !== ""));
  const state2 = regresses || keepTerminal ? previous2 : next2;
  let metadata =
    !fromHistory2 && next2.metadata
      ? {
          ...previous2.metadata,
          ...next2.metadata,
        }
      : (previous2.metadata ?? state2.metadata);
  if (fromHistory2 && incoming.tool === "task" && !extractChildSessionId(existing)) {
    const childSessionId = extractChildSessionId(incoming);
    if (childSessionId)
      metadata = {
        ...metadata,
        sessionId: childSessionId,
      };
  }
  const alternate = state2 === previous2 ? next2 : previous2;
  const input =
    incoming.tool === "question" &&
    !hasQuestionInput(state2.input) &&
    hasQuestionInput(alternate.input)
      ? alternate.input
      : state2.input;
  const merged = {
    ...state2,
    input,
    ...(metadata
      ? {
          metadata,
        }
      : {}),
  };
  if (fromHistory2) {
    if (merged.status !== "pending" && previous2.status !== "pending") {
      merged.time = {
        ...merged.time,
        start: previous2.time.start,
      };
    }
  }
  return {
    ...(fromHistory2 ? existing : incoming),
    state: merged,
  };
}
function hasQuestionInput(input) {
  try {
    const parsed = typeof input === "string" ? JSON.parse(input) : input;
    if (!parsed || typeof parsed !== "object" || !("questions" in parsed)) return false;
    return (
      Array.isArray(parsed.questions) &&
      parsed.questions.some(
        (question2) =>
          !!question2 &&
          typeof question2 === "object" &&
          "question" in question2 &&
          typeof question2.question === "string" &&
          "header" in question2 &&
          typeof question2.header === "string" &&
          "options" in question2 &&
          Array.isArray(question2.options),
      )
    );
  } catch {
    return false;
  }
}
function canCarryToolInterruption(part) {
  if (part.state.status === "completed") return isToolOutputCancelledError(part.state.output);
  if (part.state.status === "error")
    return !part.state.error || isRuntimeAbortedResult(deriveToolResult(part.state));
  return true;
}
export function extractChildSessionId(part) {
  const sessionId = part.state.metadata?.sessionId;
  return typeof sessionId === "string" ? sessionId : void 0;
}
function extractAgentNameFromPart(part) {
  try {
    const input =
      typeof part.state.input === "string" ? JSON.parse(part.state.input) : part.state.input;
    const name2 = input?.subagent_type;
    return typeof name2 === "string" && name2 ? name2 : void 0;
  } catch {
    return void 0;
  }
}
function emptyDeltaCounts() {
  return {
    received: 0,
    patched: 0,
    rederiveAttempted: 0,
    waitingParent: 0,
    missingPart: 0,
    ignored: 0,
  };
}
export class ChatStateDiagnostics {
  constructor(write) {
    this.write = write;
  }
  contexts = new Map();
  deltaWindows = new Map();
  /** Fixed counters only: no payload retention, serialization, scans or logger calls. */
  delta(sessionId, outcome) {
    const counts = this.deltaWindow(sessionId).counts;
    counts.received++;
    counts[outcome]++;
  }
  pendingChildren(sessionId, pendingCount) {
    if (pendingCount === 0 && !this.deltaWindows.has(sessionId)) return;
    const window2 = this.deltaWindow(sessionId);
    if (pendingCount > 0 && !window2.waitingLogged) {
      window2.waitingLogged = true;
    } else if (pendingCount === 0 && window2.waitingLogged && !window2.recoveredLogged) {
      window2.recoveredLogged = true;
    } else return;
    const context = {
      ...this.contexts.get(sessionId),
      sessionId,
      outcome: pendingCount > 0 ? "waiting-parent" : "parent-links-ready",
      pendingChildSessions: pendingCount,
    };
    new ChatDiagnostics(this.write).record("child-recovery", context);
  }
  deltaWindow(sessionId) {
    let window2 = this.deltaWindows.get(sessionId);
    if (!window2) {
      window2 = {
        counts: emptyDeltaCounts(),
        waitingLogged: false,
        recoveredLogged: false,
      };
      this.deltaWindows.set(sessionId, window2);
    }
    return window2;
  }
  takeDeltas(sessionId) {
    const window2 = this.deltaWindows.get(sessionId);
    if (!window2 || window2.counts.received === 0) return void 0;
    const counts = window2.counts;
    window2.counts = emptyDeltaCounts();
    return counts;
  }
  finish(sessionId, trigger) {
    const delta = this.takeDeltas(sessionId);
    if (delta) {
      const context = {
        ...this.contexts.get(sessionId),
        sessionId,
        trigger,
        delta,
      };
      new ChatDiagnostics(this.write).record("delta-summary", context);
    }
    this.deltaWindows.delete(sessionId);
  }
  forget(sessionId) {
    this.finish(sessionId, "session-released");
    this.contexts.delete(sessionId);
  }
  snapshotDecision(sessionId, replace2, failed, previousCount, incomingCount) {
    const outcome = failed
      ? "previous-history-retained"
      : replace2
        ? "replaced"
        : previousCount > 0
          ? "existing-history-retained"
          : incomingCount > 0
            ? "initial-history-installed"
            : "no-history-to-install";
    this.contexts.set(sessionId, {
      ...this.contexts.get(sessionId),
      outcome,
    });
  }
  restored(message2, replace2, before, after, parts, runtimeId, relationshipsBefore) {
    try {
      const context = {
        sessionId: message2.session_id,
        runtimeSessionId: runtimeId,
        historySyncId: message2.history_sync_id,
      };
      const outcome = this.contexts.get(message2.session_id)?.outcome ?? "snapshot-not-applied";
      this.contexts.set(message2.session_id, context);
      const lines = [];
      const diagnostic = new ChatDiagnostics((line) => lines.push(line));
      const previous2 = diagnosticChatTools(before);
      const current2 = diagnosticChatTools(after);
      const incoming = diagnosticHistoryTools(message2.messages ?? []);
      const identity2 = {
        missingRootPartId: 0,
        missingToolIdentity: 0,
      };
      for (const tool2 of incoming) {
        if (tool2.scope !== "child" && !tool2.partId) identity2.missingRootPartId++;
        if (!tool2.partId && !tool2.callID) identity2.missingToolIdentity++;
      }
      diagnostic.record(
        "history-controller-input",
        {
          ...context,
          runtimeSessionId: message2.runtime_session_id,
          outcome: message2.history_load_failed
            ? "history-load-failed"
            : replace2
              ? "replace-requested"
              : "install-if-empty-requested",
        },
        incoming,
      );
      const appliedContext = {
        ...context,
        outcome,
        beforeCount: previous2.length,
        afterCount: current2.length,
        sourcePartCount: parts?.getDiagnostics().partCount ?? 0,
        relationshipsBefore,
        relationshipsAfter: parts?.getRecoveryDiagnostics(runtimeId ?? message2.session_id),
        identity: identity2,
        delta: this.takeDeltas(message2.session_id),
      };
      diagnostic.record("history-store-applied", appliedContext, current2);
      if (appliedContext.relationshipsAfter?.waitingChildParts === 0) {
        this.pendingChildren(message2.session_id, 0);
      }
      diagnostic.record(
        "history-partstore",
        context,
        parts?.getToolDiagnosticManifest(runtimeId ?? message2.session_id) ?? [],
      );
      const missing = current2.filter(
        (tool2) =>
          tool2.scope !== "child" &&
          tool2.tool !== "task" &&
          tool2.partId &&
          !parts?.getPart(tool2.partId),
      );
      if (missing.length)
        diagnostic.record(
          "history-source-missing",
          {
            ...context,
            outcome: "missing-source-part",
          },
          missing,
          true,
        );
      const byIdentity = new Map(current2.map((tool2) => [chatToolIdentity(tool2), tool2]));
      const changed = previous2.flatMap((tool2) => {
        const fresh = byIdentity.get(chatToolIdentity(tool2));
        if (!fresh)
          return [
            {
              ...tool2,
              reason: outcome === "replaced" ? "snapshot-replace" : "history-apply-removal",
            },
          ];
        if (normalizeToolStatus$1(tool2.status) !== normalizeToolStatus$1(fresh.status))
          return [
            {
              ...fresh,
              reason: "snapshot-state-overwrite",
            },
          ];
        return [];
      });
      if (changed.length)
        diagnostic.record(
          "history-store-changed",
          {
            ...context,
            outcome,
          },
          changed,
          true,
        );
      if (
        (outcome === "replaced" || outcome === "initial-history-installed") &&
        !deriveBusy(message2.agent_running, message2.pending_reasons ?? [])
      ) {
        const terminalized = incoming
          .filter(
            (tool2) =>
              tool2.scope !== "child" &&
              tool2.tool !== "task" &&
              tool2.status === "running" &&
              byIdentity.get(chatToolIdentity(tool2))?.status === "error",
          )
          .map((tool2) => ({
            ...tool2,
            status: "error",
            reason: "idle-history-terminalized",
          }));
        if (terminalized.length)
          diagnostic.record("history-store-normalized", context, terminalized, true);
      }
      this.write(lines.join("\n"));
    } catch {}
  }
  rederived(sessionId, trigger, before, after, removed, parts) {
    if (!removed.length && trigger !== "session-cancelled") return;
    try {
      const tools = diagnosticChatTools(removed).map((tool2) => ({
        ...tool2,
        reason:
          tool2.partId && parts.getPart(tool2.partId)
            ? "no-derived-message"
            : "missing-source-part",
      }));
      new ChatDiagnostics(this.write).record(
        "store-rederived",
        {
          ...this.contexts.get(sessionId),
          sessionId,
          trigger,
          beforeCount: diagnosticChatTools(before).length,
          afterCount: diagnosticChatTools(after).length,
          sourcePartCount: parts.getDiagnostics().partCount,
          outcome: tools.length ? "tools-removed" : "tools-retained",
        },
        tools,
        tools.length > 0,
      );
    } catch {}
  }
  reset(sessionId, messages2, parts) {
    const context = {
      ...this.contexts.get(sessionId),
      sessionId,
      trigger: "resetBuffers",
      sourcePartCount: parts.getDiagnostics().partCount,
      delta: this.takeDeltas(sessionId),
    };
    new ChatDiagnostics(this.write).record(
      "partstore-reset",
      context,
      diagnosticChatTools(messages2),
    );
  }
  clear() {
    this.contexts.clear();
    this.deltaWindows.clear();
  }
}
export function logChat(message2, level = "info") {
  try {
    const logger = globalThis.hilo?.logger;
    const fn2 = level === "error" ? logger?.error : level === "warn" ? logger?.warn : logger?.info;
    fn2?.(message2, "chat");
  } catch {}
}
export function logRuntimeBinding(message2, level = "info") {
  logChat(`[runtime-bind] ${message2}`, level);
}
function diagnosticToken(value) {
  if (value === void 0 || value === "") return "none";
  return encodeURIComponent(String(value));
}
export function logPartUpdated(phase, sid, fields) {
  const details = fields.map(([key2, value]) => `${key2}=${diagnosticToken(value)}`).join(" ");
  logChat(`[part_updated] phase=${phase} sid=${diagnosticToken(sid)} ${details}`);
}
export function logPartUpdatedReceived(sid, part, runtimeId) {
  const fields = [
    ["part", part.id],
    ["partSession", part.sessionID],
    ["message", part.messageID],
    ["type", part.type],
  ];
  if (part.type === "tool") {
    fields.push(["tool", part.tool], ["status", part.state.status]);
    if (part.tool === "task") fields.push(["child", extractChildSessionId(part)]);
  }
  fields.push(["runtime", runtimeId], ["binding", runtimeId ? "bound" : "unbound"]);
  logPartUpdated("received", sid, fields);
}
export function attachHandoffTargetsToSubMessages(messages2, targets) {
  if (targets.length === 0) return [...messages2];
  return messages2.map((message2) => {
    if (message2.type === "tool" && message2.callID) {
      const matches2 = targets.filter((target) => target.tool_use_id === message2.callID);
      if (matches2.length > 0) {
        return {
          ...message2,
          interruption: "canvas_continuation",
          generationHandoffTargets: matches2,
        };
      }
    }
    return message2.subMessages
      ? {
          ...message2,
          subMessages: attachHandoffTargetsToSubMessages(message2.subMessages, targets),
        }
      : message2;
  });
}
