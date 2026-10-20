/**
 * 渲染层这侧的「原生工作台」宿主。
 *
 * 真正的 v3 界面跑在主进程嵌进来的 `WebContentsView` 里（见 `main/v3/*`），
 * 这里负责：**告诉主进程该给哪块地方、什么时候可见**，并把这块位置让出来。
 * 页面本身不渲染 v3 界面 —— 所以这里没有 v3 的界面代码，只有挂载与摆放。
 */
// ==== 逐文件收敛 ====

// ==== 逐文件收敛 ====

// ==== 逐文件收敛 ====
import { instantiationService, usePlatform, useRequiredGatewayScope } from "../canvas-v3/main-exports.js";
import { useGatewayFetch } from "../assets/listeners-a.jsx";
import { openUrlInBuiltinBrowser } from "./resolve-retry-message-payload.jsx";
import { registerBrowserHoverPreview } from "../infra/dialog-content.jsx";
import reactExports from "react";
import jsxRuntimeExports from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { AuthContext, useOptionalTeamAccount } from "../assets/credit-query-keys.jsx";
import {
  deriveGenerationSubject,
  isPageStorageIdentity,
  workbenchIdentity,
} from "../canvas-v3/workbench-identity-ids.js";
import { useGatewayScope } from "../infra/runtime-config.js";
import { accountScopeKey } from "../assets/credit-query-keys.jsx";
import { PageStateViewInner as PageStateView$1 } from "../canvas-v3/page-state-view-inner.jsx";
import { useWorkbenchEditorEvents, useWorkbenchTaskEvents } from "./workbench-events.js";

// ---- 第 202 轮：从产物取回（参考 bundle 514253）----
import { useMediaActions } from "../settings/use-media-actions.js";
import { useChatSessionAdapter } from "./chat-session-adapter.js";
import { getNativeWorkbenchOwner, INativeWorkbenchService } from "./unavailable-workbench.js";


function useNativeWorkbenchFileActions() {
  const { saveManyAs } = useMediaActions();
  const platform = usePlatform();
  const latest = reactExports.useRef({ saveManyAs, platform });
  latest.current = { saveManyAs, platform };
  const [actions] = reactExports.useState(() => ({
    saveFiles: (files, options) => latest.current.saveManyAs(files, options),
    writeImageData: async (png) => {
      const { clipboard } = latest.current.platform;
      if (!clipboard.writeImageData) throw new Error("NATIVE_CLIPBOARD_UNAVAILABLE");
      await clipboard.writeImageData.call(clipboard, png);
    },
  }));
  return actions;
}


// ==== 产物里与本文件紧邻的四个零依赖小件（第 109 轮）====
const PREFIX$1 = "hilo:workspace-resource-view:";
const emptySubscribe = () => () => {};
const unavailable = () => "failed";
class NativeWorkbenchDiscardRequiredError extends Error {
  constructor() {
    super("The previous document has unfinished changes");
  }
}

// 产物里 `taskRecoveryAccountKeyFor` 依赖 `taskRecoveryAccountKey`。
// **不能**从 `canvas-v3/ui-components.js` 导入 —— 那会把整个 v3 UI 拖进主包并造成循环依赖。
function taskRecoveryAccountKeyFor(account) {
  if (!account?.integrationEnabled) return "legacy-personal";
  const scope = account.activeScope;
  if (!scope) return "legacy-personal";
  return JSON.stringify([scope.teamId ?? null, scope.accountId ?? null]);
}


function usesWorkspaceResourceView(workspaceId) {
  if (!workspaceId) return false;
  try {
    return localStorage.getItem(`${PREFIX$1}${workspaceId}`) === "true";
  } catch {
    return false;
  }
}

function useWorkbenchIdentity(workspaceId) {
  const auth = reactExports.useContext(AuthContext);
  const userId = auth?.user?.userID;
  const account = useOptionalTeamAccount();
  const { gatewayBinding } = useGatewayScope();
  const billingScope = accountScopeKey(account?.activeScope ?? null);
  const ready2 = Boolean(userId) && (!account?.integrationEnabled || account.accountDataVisible && billingScope !== null);
  const subject = ready2 ? JSON.stringify([userId, billingScope]) : void 0;
  const recoveryAccountKey = taskRecoveryAccountKeyFor(account);
  const groupId2 = account?.activeScope?.groupId;
  return reactExports.useMemo(() => {
    if (!subject || !workspaceId) return void 0;
    const subjectId = workbenchIdentity(subject);
    const documentId = workbenchIdentity(
      JSON.stringify([subjectId, workspaceId, gatewayBinding?.instanceId])
    );
    const storage2 = { workspaceId, userId: userId ?? "", accountKey: recoveryAccountKey ?? "" };
    const generation = deriveGenerationSubject({ userId, groupId: groupId2, billingScope });
    return {
      documentId,
      subjectId,
      ...isPageStorageIdentity(storage2) ? { storage: storage2 } : {},
      ...generation ? { generation } : {}
    };
  }, [
    subject,
    workspaceId,
    gatewayBinding?.instanceId,
    userId,
    recoveryAccountKey,
    groupId2,
    billingScope
  ]);
}

function NativeWorkbenchHost({
  identityScope,
  visible: visible2 = true,
  initialRoute
}) {
  const { t: t2 } = useTranslation();
  const { gatewayBinding: binding, workspaceId } = useRequiredGatewayScope();
  const request = useGatewayFetch();
  const platform2 = usePlatform();
  const openLink = reactExports.useCallback(
    async (url2) => {
      const opened = await openUrlInBuiltinBrowser(platform2, url2, { source: "v3-chat" });
      if (!opened) throw new Error("CHAT_LINK_OPEN_FAILED");
    },
    [platform2]
  );
  const acquisitionBinding = reactExports.useRef(binding);
  acquisitionBinding.current = binding;
  const lifetime = identityScope.documentId;
  const events2 = useWorkbenchTaskEvents(lifetime);
  const editorEvents = useWorkbenchEditorEvents(lifetime);
  const fileActions = useNativeWorkbenchFileActions();
  const [attempt, setAttempt] = reactExports.useState({
    version: 0,
    replace: false,
    discard: false,
    identity: ""
  });
  const [acquisition, setAcquisition] = reactExports.useState();
  const owner = acquisition?.identity === lifetime ? acquisition.owner : void 0;
  const chatSession = useChatSessionAdapter(lifetime, {
    request,
    events: events2,
    scopeKey: lifetime,
    openLink,
    textEdit: owner?.textEdit
  });
  const acquireFailed = acquisition?.identity === lifetime && acquisition.error;
  const requiresDiscard = acquireFailed instanceof NativeWorkbenchDiscardRequiredError;
  reactExports.useEffect(() => {
    let active2 = true;
    const binding2 = acquisitionBinding.current;
    if (!workspaceId || !binding2) return;
    setAcquisition(void 0);
    void getNativeWorkbenchOwner(workspaceId, binding2, identityScope, {
      replace: attempt.identity === lifetime && attempt.replace,
      discard: attempt.identity === lifetime && attempt.discard,
      current: () => active2
    }).then(
      (owner2) => {
        if (active2) setAcquisition({ identity: lifetime, owner: owner2 });
      },
      (error) => {
        if (active2) setAcquisition({ identity: lifetime, error });
      }
    );
    return () => {
      active2 = false;
    };
  }, [workspaceId, lifetime, identityScope, attempt]);
  const ownerPhase = reactExports.useSyncExternalStore(
    owner?.subscribe ?? emptySubscribe,
    owner?.getSnapshot ?? unavailable,
    unavailable
  );
  const phase2 = owner ? ownerPhase : acquireFailed ? "failed" : "loading";
  const element2 = reactExports.useRef(null);
  const [presented, setPresented] = reactExports.useState(false);
  const layout2 = reactExports.useRef(() => {
  });
  const latest2 = reactExports.useRef({ visible: visible2, phase: phase2 });
  reactExports.useLayoutEffect(() => {
    latest2.current = { visible: visible2, phase: phase2 };
    layout2.current();
  }, [visible2, phase2]);
  reactExports.useLayoutEffect(() => {
    if (!owner) return;
    const detach = owner.attach({
      request,
      binding,
      events: events2,
      editorEvents,
      chatSession,
      fileActions,
      ...initialRoute ? { page: { initialRoute } } : {}
    });
    layout2.current();
    return detach;
  }, [owner, events2, editorEvents, request, binding, chatSession, fileActions, initialRoute]);
  reactExports.useEffect(() => {
    if (!owner) return;
    let active2 = true, scheduled = false, previous2 = "";
    const measure = () => {
      scheduled = false;
      const node2 = element2.current;
      if (!active2 || !node2) return;
      const r2 = node2.getBoundingClientRect();
      const shown = latest2.current.visible && latest2.current.phase === "ready" && r2.width > 0 && r2.height > 0 && getComputedStyle(node2).visibility !== "hidden" && !node2.closest("[inert],[hidden]");
      const bounds = { x: r2.x, y: r2.y, width: r2.width, height: r2.height };
      const key2 = JSON.stringify([bounds, shown]);
      if (key2 === previous2) return;
      previous2 = key2;
      setPresented(shown);
      owner.layout(bounds, shown);
    };
    const schedule2 = () => {
      if (scheduled || !active2) return;
      scheduled = true;
      queueMicrotask(measure);
    };
    layout2.current = () => {
      previous2 = "";
      schedule2();
    };
    const resize2 = new ResizeObserver(schedule2);
    if (element2.current) resize2.observe(element2.current);
    const attributes2 = new MutationObserver(schedule2);
    let ancestor = element2.current;
    while (ancestor) {
      attributes2.observe(ancestor, {
        attributes: true,
        attributeFilter: ["class", "style", "inert", "hidden"]
      });
      ancestor = ancestor.parentElement;
    }
    window.addEventListener("resize", schedule2);
    window.addEventListener("scroll", schedule2, true);
    schedule2();
    return () => {
      active2 = false;
      resize2.disconnect();
      attributes2.disconnect();
      window.removeEventListener("resize", schedule2);
      window.removeEventListener("scroll", schedule2, true);
    };
  }, [owner]);
  reactExports.useEffect(() => {
    if (!presented) return;
    return registerBrowserHoverPreview(async (signal) => {
      const token2 = crypto.randomUUID();
      const api = instantiationService.invokeFunction((a2) => a2.get(INativeWorkbenchService));
      const release = () => {
        void api.setOccluded(token2, false).catch(() => {
        });
      };
      signal.addEventListener("abort", release, { once: true });
      await api.setOccluded(token2, true);
      if (signal.aborted) release();
    });
  }, [presented]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      ref: element2,
      className: "relative h-full min-h-0 w-full bg-background",
      "data-action-ui-id": "project-v3-native-workbench",
      children: [
        phase2 === "loading" && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "p-4 text-sm text-muted-foreground", children: t2("projectV3.loadingWorkbench") }),
        phase2 === "failed" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          PageStateView$1,
          {
            density: "panel",
            // 第 240 轮：参照不传 labels（它永远走不到 failed 分支）。
            // 我们把 getNativeWorkbenchOwner 改成显式不可用后，failed 分支是可达的，
            // 所以必须补 labels，否则 PageStateView$1 读 labels.errorText 会崩。
            // 属**有意差异**：我们的失败路径是真实的，失败 UI 必须能渲染。
            labels: {
              emptyText: t2("pageState.emptyText"),
              errorText: t2("pageState.errorText", "Something went wrong. Please try again."),
              networkErrorText: t2("pageState.networkErrorText", "Network problem. Please check your connection."),
            },
            state: {
              type: "error",
              reason: "generic",
              title: t2("projectV3.loadFailed"),
              description: t2(
                requiresDiscard ? "projectV3.discardWorkbenchHint" : "projectV3.reopenHint"
              ),
              actions: [
                {
                  key: "retry",
                  label: t2(requiresDiscard ? "projectV3.discardAndReopen" : "projectV3.reopen"),
                  variant: "default",
                  onClick: () => {
                    setAttempt((value) => ({
                      version: value.version + 1,
                      identity: lifetime,
                      replace: true,
                      discard: requiresDiscard
                    }));
                  }
                }
              ]
            }
          }
        )
      ]
    }
  );
}

export { NativeWorkbenchHost, useWorkbenchIdentity, usesWorkspaceResourceView };
