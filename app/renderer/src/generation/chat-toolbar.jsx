// chat-toolbar.jsx
import { Box, Plus, reactExports, useTranslation } from "../vendor.js";
import {
  Icon,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { MediaModelSelector } from "./media-model-selector.jsx";
import { Paperclip } from "../media-editing/package.jsx";
import {
  countVisibleSelectedMediaModels,
  isAllVisibleMediaModelsSelected,
} from "../media-editing/wt.js";
import { useMediaModels } from "./normalize-model-info.js";
import { useComposerActionsCompact } from "../chat/create-expanded-composer-actions-measurer.jsx";
import { TooltipContent } from "../infra/dialog-content.jsx";
import { SkillIcon } from "../workspace/use-prompt-icon.jsx";
import { useAttachmentFaceNoticeGate } from "../chat/use-attachment-face-notice-gate.jsx";

export const ChatToolbar = reactExports.memo(function ChatToolbar2({
  addFromLocal,
  attachmentAccept,
  uploading,
  interactionLocked = false,
  busy,
  running: running2,
  triggerSlash,
  skillTriggerRef,
  selectedModelId,
  selectedMediaModels,
  onModelSelectionChange,
  requestAssetSource,
  skillLabel,
  hideMediaModelSelector = false,
  showModelSelector = false,
  showSkillSelector = true,
}) {
  const { t: t2 } = useTranslation();
  const actionsCompact = useComposerActionsCompact();
  const fileInputRef = reactExports.useRef(null);
  const attachmentButtonRef = reactExports.useRef(null);
  const modelButtonRef = reactExports.useRef(null);
  const [modelPickerOpen, setModelPickerOpen] = reactExports.useState(false);
  const { data: mediaModels } = useMediaModels();
  const controlsLocked = busy || running2 || interactionLocked;
  const modelSelectorVisible = showModelSelector && !hideMediaModelSelector;
  const attachmentOnly = !modelSelectorVisible && !showSkillSelector;
  reactExports.useEffect(() => {
    if (actionsCompact || controlsLocked) setModelPickerOpen(false);
  }, [actionsCompact, controlsLocked]);
  const handleFileChange = reactExports.useCallback(
    (e2) => {
      const selected2 = e2.target.files;
      if (selected2 && selected2.length > 0) {
        addFromLocal(selected2);
      }
      e2.target.value = "";
    },
    [addFromLocal],
  );
  const handleOpenFilePicker = reactExports.useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const { requestAttachmentPicker, attachmentFaceNoticeDialog } =
    useAttachmentFaceNoticeGate(handleOpenFilePicker);
  const handleAttachmentClick = reactExports.useCallback(() => {
    const anchor = attachmentButtonRef.current;
    if (requestAssetSource && anchor) {
      requestAssetSource(anchor, requestAttachmentPicker);
      return;
    }
    requestAttachmentPicker();
  }, [requestAssetSource, requestAttachmentPicker]);
  const handleModelToggle = reactExports.useCallback(() => {
    if (controlsLocked) return;
    setModelPickerOpen((v2) => !v2);
  }, [controlsLocked]);
  const handleModelCommit = reactExports.useCallback(
    (next2, rememberForNewChats) => {
      if (controlsLocked) return;
      onModelSelectionChange(next2, rememberForNewChats);
    },
    [controlsLocked, onModelSelectionChange],
  );
  const handleModelClose = reactExports.useCallback(() => {
    setModelPickerOpen(false);
  }, []);
  const allVisibleModelsSelected =
    !selectedMediaModels ||
    !mediaModels ||
    isAllVisibleMediaModelsSelected(selectedMediaModels, mediaModels);
  const selectedModelCount =
    selectedMediaModels && mediaModels
      ? countVisibleSelectedMediaModels(selectedMediaModels, mediaModels)
      : 0;
  const buttonLabel =
    allVisibleModelsSelected || selectedModelCount === 0
      ? t2("chat.mediaModels.label")
      : `${t2("chat.mediaModels.label")} · ${selectedModelCount}`;
  const modelButton = (
    <button
      ref={modelButtonRef}
      type="button"
      data-action-ui-id="chat-model-btn"
      data-selected-media-model-auto={
        allVisibleModelsSelected ? "true" : "false"
      }
      data-selected-media-model-count={selectedModelCount}
      data-selected-media-models={JSON.stringify(selectedMediaModels ?? {})}
      onClick={handleModelToggle}
      aria-disabled={controlsLocked}
      aria-label={buttonLabel}
      title={buttonLabel}
      disabled={controlsLocked}
      className={`flex h-[var(--btn-height-sm)] shrink-0 min-w-0 max-w-full items-center gap-[var(--home-input-control-content-gap)] rounded-full px-[var(--home-input-toolbar-padding-x)] text-[length:var(--home-input-toolbar-font-size)] font-normal leading-5 tracking-[var(--home-input-toolbar-letter-spacing)] transition-colors duration-75 group-data-[actions-compact=true]/composer:size-[var(--btn-height-sm)] group-data-[actions-compact=true]/composer:justify-center group-data-[actions-compact=true]/composer:gap-0 group-data-[actions-compact=true]/composer:p-0 ${controlsLocked ? "text-muted-foreground cursor-not-allowed" : "text-foreground/70 hover:text-foreground hover:bg-[var(--message-input-control-hover)] cursor-pointer"}`}
    >
      <Icon icon={Box} size="md" strokeWidth={1.5} className="shrink-0" />
      <span className="min-w-0 truncate whitespace-nowrap group-data-[actions-compact=true]/composer:hidden">
        {buttonLabel}
      </span>
    </button>
  );
  return (
    <div
      data-attachment-only={attachmentOnly ? "true" : void 0}
      className={
        attachmentOnly
          ? "flex items-center"
          : "flex min-w-0 flex-1 items-center overflow-hidden"
      }
    >
      <button
        ref={attachmentButtonRef}
        type="button"
        data-action-ui-id="chat-attach-btn"
        onClick={handleAttachmentClick}
        disabled={busy || uploading}
        aria-label={t2("chat.addFile")}
        title={t2("chat.addFile")}
        className={
          attachmentOnly
            ? "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md bg-transparent text-muted-foreground transition-colors duration-75 hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            : "mr-1 flex size-[var(--btn-height-sm)] shrink-0 items-center justify-center rounded-full bg-[var(--message-input-attachment-bg)] text-foreground/70 transition-colors duration-75 hover:bg-[var(--message-input-attachment-bg-hover)] hover:text-foreground cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        }
      >
        {attachmentOnly ? (
          <Icon icon={Paperclip} size="sm" strokeWidth={1.5} />
        ) : (
          <Plus size={16} strokeWidth={1.5} />
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={attachmentAccept}
        multiple={true}
        className="hidden"
        onChange={handleFileChange}
      />
      {attachmentFaceNoticeDialog}
      {modelSelectorVisible && (
        <div data-composer-optional={true} className="contents">
          <div
            data-model-control-slot="true"
            className="flex min-w-0 items-center"
          >
            {controlsLocked ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={modelButton} />
                  <TooltipContent side="top">
                    {t2("chat.mediaModels.busyTooltip")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              modelButton
            )}
          </div>
        </div>
      )}
      {modelSelectorVisible && showSkillSelector && (
        <span
          aria-hidden={true}
          className="mx-1 h-3 w-[var(--home-input-toolbar-divider-width)] shrink-0 bg-foreground/15"
        />
      )}
      {showSkillSelector && (
        <button
          ref={skillTriggerRef}
          type="button"
          data-action-ui-id="chat-skill-btn"
          onClick={triggerSlash}
          disabled={interactionLocked}
          aria-label={skillLabel ?? t2("skills.popover.buttonLabel")}
          title={skillLabel ?? t2("skills.popover.buttonLabel")}
          className="flex h-[var(--btn-height-sm)] shrink-0 items-center gap-[var(--home-input-control-content-gap)] whitespace-nowrap rounded-full px-[var(--home-input-toolbar-padding-x)] text-[length:var(--home-input-toolbar-font-size)] font-normal leading-5 tracking-[var(--home-input-toolbar-letter-spacing)] text-foreground/70 transition-colors duration-75 hover:bg-[var(--message-input-control-hover)] hover:text-foreground cursor-pointer group-data-[actions-compact=true]/composer:size-[var(--btn-height-sm)] group-data-[actions-compact=true]/composer:justify-center group-data-[actions-compact=true]/composer:gap-0 group-data-[actions-compact=true]/composer:p-0"
        >
          <SkillIcon size={16} strokeWidth={1.5} className="shrink-0" />
          <span className="group-data-[actions-compact=true]/composer:hidden">
            {skillLabel ?? t2("skills.popover.buttonLabel")}
          </span>
        </button>
      )}
      {modelSelectorVisible && (
        <MediaModelSelector
          open={modelPickerOpen && !controlsLocked}
          anchorRef={modelButtonRef}
          currentModelId={selectedModelId}
          current={selectedMediaModels}
          onCommit={handleModelCommit}
          onClose={handleModelClose}
        />
      )}
    </div>
  );
});

ChatToolbar.displayName = "ChatToolbar";
