// use-workspace-focus-navigation.js
import { workspaceEvents } from "./topbar-state-context.jsx";
import { reactExports, useNavigate } from "../vendor.js";
import { buildWorkspaceSearch } from "./use-deep-link-router.js";

const READY_TIMEOUT_MS = 2e3;

function scrollActiveChatToBottom() {
  window.requestAnimationFrame(() => {
    const messageList = document.querySelector(
      '[data-action-ui-id="chat-message-list"]',
    );
    if (!messageList) return;
    messageList.scrollTop = messageList.scrollHeight;
  });
}

function waitForSubscribersReady(workspaceId2) {
  if (workspaceEvents.isSubscribersReady(workspaceId2)) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timer2 = window.setTimeout(() => {
      sub.dispose();
      resolve();
    }, READY_TIMEOUT_MS);
    const sub = workspaceEvents.onSubscribersReady((event) => {
      if (event.workspaceId !== workspaceId2) return;
      clearTimeout(timer2);
      sub.dispose();
      resolve();
    });
  });
}

export function useWorkspaceFocusNavigation(
  currentWorkspaceId,
  activateWorkspace,
) {
  const navigate = useNavigate();
  const focusAfterNavigation = reactExports.useCallback(
    (workspaceId2, focusFn) => {
      if (workspaceId2 === currentWorkspaceId) {
        focusFn();
        return;
      }
      activateWorkspace(workspaceId2);
      void navigate({
        to: "/workspace",
        search: buildWorkspaceSearch(workspaceId2),
      }).then(async () => {
        await waitForSubscribersReady(workspaceId2);
        focusFn();
      });
    },
    [activateWorkspace, currentWorkspaceId, navigate],
  );
  const navigateAndFocus = reactExports.useCallback(
    (target) => {
      focusAfterNavigation(target.workspaceId, () => {
        if (target.source === "canvas") {
          const nodeId = target.sessionId.startsWith("canvas:")
            ? target.sessionId.slice("canvas:".length)
            : target.sessionId;
          if (!nodeId) return;
          workspaceEvents.fireCanvasFocus(target.workspaceId, [nodeId]);
        } else {
          workspaceEvents.fireSwitchSession(
            target.workspaceId,
            target.sessionId,
          );
          scrollActiveChatToBottom();
        }
      });
    },
    [focusAfterNavigation],
  );
  const navigateAndFocusCanvas = reactExports.useCallback(
    (workspaceId2, nodeId) => {
      focusAfterNavigation(workspaceId2, () =>
        workspaceEvents.fireCanvasFocus(workspaceId2, [nodeId]),
      );
    },
    [focusAfterNavigation],
  );
  const navigateAndFocusSession = reactExports.useCallback(
    (workspaceId2, sessionId) => {
      focusAfterNavigation(workspaceId2, () => {
        workspaceEvents.fireSwitchSession(workspaceId2, sessionId);
        scrollActiveChatToBottom();
      });
    },
    [focusAfterNavigation],
  );
  return {
    navigateAndFocus,
    navigateAndFocusCanvas,
    navigateAndFocusSession,
  };
}
