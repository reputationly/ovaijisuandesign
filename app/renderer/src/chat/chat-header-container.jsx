// chat-header-container.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { SessionTabStrip } from "./session-tab-strip.jsx";
import {
  shallowEqualObject,
  useWorkspaceChatSelector,
} from "../assets/use-canvas-model-registry-hydration.js";

const ChatHeader = reactExports.memo(function ChatHeader2({
  sessions,
  openedTabOrder,
  openedTabIds,
  focusedSessionId,
  pendingNewTab,
  sessionsLoading = false,
  isPresented = true,
  sessionStore,
  onSend,
  onRename,
  onNewTab,
  onCloseTab,
  hasEvicted,
  onEvictedSeen,
  rightActions,
  variant,
  nodeEditAgentName,
  textEditNav,
}) {
  return (
    <SessionTabStrip
      sessions={sessions}
      openedTabOrder={openedTabOrder}
      openedTabIds={openedTabIds}
      focusedSessionId={focusedSessionId}
      pendingNewTab={pendingNewTab}
      sessionsLoading={sessionsLoading}
      isPresented={isPresented}
      sessionStore={sessionStore}
      onSend={onSend}
      onRename={onRename}
      onNewTab={onNewTab}
      onCloseTab={onCloseTab}
      hasEvicted={hasEvicted}
      onEvictedSeen={onEvictedSeen}
      rightActions={rightActions}
      variant={variant}
      nodeEditAgentName={nodeEditAgentName}
      textEditNav={textEditNav}
    />
  );
});

const selectChatHeaderState = (chat) => ({
  focusedSessionId: chat.focusedSessionId,
  sessions: chat.sessions,
  sessionsLoading: chat.sessionsLoading,
  openedTabOrder: chat.openedTabOrder,
  openedTabIds: chat.openedTabIds,
  pendingNewTab: chat.pendingNewTab,
  evictedTabIds: chat.evictedTabIds,
  clearEvictedTabIds: chat.clearEvictedTabIds,
  sendWsMessage: chat.sendWsMessage,
  renameSession: chat.renameSession,
  openNewTab: chat.openNewTab,
  closeTab: chat.closeTab,
  sessionStore: chat.sessionStore,
  textEditSessionIds: chat.textEditSessionIds,
  textEditNodeSessionIds: chat.textEditNodeSessionIds,
  textEditAgentState: chat.textEditAgentState,
  newTextEditSession: chat.newTextEditSession,
  switchTextEditSession: chat.switchTextEditSession,
});

export function ChatHeaderContainer({
  rightActions,
  variant = "default",
  nodeEditAgentName,
  isPresented = true,
} = {}) {
  const {
    sessions,
    openedTabOrder,
    openedTabIds,
    focusedSessionId,
    pendingNewTab,
    sessionsLoading,
    sessionStore,
    sendWsMessage,
    renameSession,
    openNewTab,
    closeTab,
    evictedTabIds,
    clearEvictedTabIds,
    textEditSessionIds,
    textEditNodeSessionIds,
    textEditAgentState,
    newTextEditSession,
    switchTextEditSession,
  } = useWorkspaceChatSelector(selectChatHeaderState, shallowEqualObject);
  const { ordinarySessions, ordinaryTabOrder, ordinaryTabIds } =
    reactExports.useMemo(() => {
      if (textEditSessionIds.size === 0) {
        return {
          ordinarySessions: sessions,
          ordinaryTabOrder: openedTabOrder,
          ordinaryTabIds: openedTabIds,
        };
      }
      const hiddenSessionIds = new Set(textEditSessionIds);
      for (const session of sessions) {
        if (
          session.runtime_session_id &&
          textEditSessionIds.has(session.runtime_session_id)
        ) {
          hiddenSessionIds.add(session.id);
        }
      }
      const visibleTabOrder = openedTabOrder.filter(
        (id2) => !hiddenSessionIds.has(id2),
      );
      return {
        ordinarySessions: sessions.filter(
          (session) => !hiddenSessionIds.has(session.id),
        ),
        ordinaryTabOrder: visibleTabOrder,
        ordinaryTabIds: new Set(visibleTabOrder),
      };
    }, [sessions, openedTabOrder, openedTabIds, textEditSessionIds]);
  const nodeEdit = variant === "text-edit" || variant === "plugin-edit";
  const textEditNav = reactExports.useMemo(
    () =>
      nodeEdit
        ? {
            sessions: sessions.filter(
              (session) =>
                textEditNodeSessionIds.has(session.id) ||
                (session.runtime_session_id
                  ? textEditNodeSessionIds.has(session.runtime_session_id)
                  : false),
            ),
            activeSessionId: textEditAgentState?.sessionId ?? null,
            onNewSession: newTextEditSession,
            onSwitchSession: switchTextEditSession,
          }
        : void 0,
    [
      nodeEdit,
      sessions,
      textEditNodeSessionIds,
      textEditAgentState?.sessionId,
      newTextEditSession,
      switchTextEditSession,
    ],
  );
  return (
    <ChatHeader
      sessions={ordinarySessions}
      openedTabOrder={ordinaryTabOrder}
      openedTabIds={ordinaryTabIds}
      focusedSessionId={focusedSessionId}
      pendingNewTab={pendingNewTab}
      sessionsLoading={sessionsLoading}
      isPresented={isPresented}
      sessionStore={sessionStore}
      onSend={sendWsMessage}
      onRename={renameSession}
      onNewTab={openNewTab}
      onCloseTab={closeTab}
      hasEvicted={evictedTabIds.length > 0}
      onEvictedSeen={clearEvictedTabIds}
      rightActions={rightActions}
      variant={variant}
      nodeEditAgentName={nodeEditAgentName}
      textEditNav={textEditNav}
    />
  );
}
