// use-chat-toolbar.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ChatToolbar } from "./chat-toolbar.jsx";

export function useChatToolbar({
  busy,
  running: running2,
  selectedModelId,
  selectedMediaModels,
  onModelSelectionChange,
  skillLabel,
  hideMediaModelSelector,
}) {
  return reactExports.useCallback(
    (context) => (
      <ChatToolbar
        {...context}
        busy={busy}
        running={running2}
        selectedModelId={selectedModelId}
        selectedMediaModels={selectedMediaModels}
        onModelSelectionChange={onModelSelectionChange}
        skillLabel={skillLabel}
        hideMediaModelSelector={hideMediaModelSelector}
      />
    ),
    [
      busy,
      running2,
      selectedModelId,
      selectedMediaModels,
      onModelSelectionChange,
      skillLabel,
      hideMediaModelSelector,
    ],
  );
}
