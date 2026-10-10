// 首页工具栏。
import { useTranslation, reactExports, jsxRuntimeExports, Plus, Box, X$7 as X, RotateCcw } from "../vendor.js";
import { useMediaModels } from "../generation/normalize-model-info.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { useAttachmentFaceNoticeGate } from "../chat/use-attachment-face-notice-gate.jsx";
import { isAllVisibleMediaModelsSelected, countVisibleSelectedMediaModels } from "../media-editing/wt.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { MediaModelSelector } from "../generation/media-model-selector.jsx";
import { SkillIcon } from "../workspace/use-prompt-icon.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { HomeInputCoachMarks } from "./coach-marks.jsx";
function ToolbarDivider() {
  return <div className="mx-1 h-3 w-[var(--home-input-toolbar-divider-width)] shrink-0 bg-foreground/15" />;
}
export function HomeToolbar({
  addFromLocal,
  uploading,
  triggerSlash,
  skillTriggerRef,
  selectedModelId,
  selectedMediaModels,
  onModelSelectionChange,
  workspaceFolder,
  onPickWorkspaceFolder,
  onClearWorkspaceFolder,
  activeSceneLabel,
  onClearActiveScene,
  showResetInput,
  onResetInput
}) {
  const {
    t
  } = useTranslation();
  const {
    data: mediaModels
  } = useMediaModels();
  const fileInputRef = reactExports.useRef(null);
  const modelButtonRef = reactExports.useRef(null);
  const workspaceButtonRef = reactExports.useRef(null);
  const [modelPickerOpen, setModelPickerOpen] = reactExports.useState(false);
  const handleFileChange = reactExports.useCallback(e => {
    const selected = e.target.files;
    if (selected && selected.length > 0) {
      trackEvent(TRACK_EVENTS.HOME_ATTACHMENT_ADD, {
        count: selected.length,
        source: "file_picker"
      });
      addFromLocal(selected);
    }
    e.target.value = "";
  }, [addFromLocal]);
  const handleSkillsPopover = reactExports.useCallback(() => {
    trackEvent(TRACK_EVENTS.HOME_SKILLS_POPOVER_OPEN, {});
    triggerSlash();
  }, [triggerSlash]);
  const handleModelToggle = reactExports.useCallback(() => {
    setModelPickerOpen(v => !v);
  }, []);
  const handleModelClose = reactExports.useCallback(() => {
    setModelPickerOpen(false);
  }, []);
  const handleOpenFilePicker = reactExports.useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const {
    requestAttachmentPicker,
    attachmentFaceNoticeDialog
  } = useAttachmentFaceNoticeGate(handleOpenFilePicker);
  const buttonLabel = (() => {
    if (!selectedMediaModels || !mediaModels) return t("chat.mediaModels.label");
    if (isAllVisibleMediaModelsSelected(selectedMediaModels, mediaModels)) {
      return t("chat.mediaModels.label");
    }
    const count = countVisibleSelectedMediaModels(selectedMediaModels, mediaModels);
    if (count === 0) return t("chat.mediaModels.label");
    return `${t("chat.mediaModels.label")} · ${count}`;
  })();
  return <div className="flex min-w-0 flex-1 items-center"><button type="button" data-action-ui-id="home-attachment-add" aria-label={t("chat.addFile")} title={t("chat.addFile")} disabled={uploading} onClick={requestAttachmentPicker} className="mr-1 flex size-[var(--btn-height-sm)] cursor-pointer items-center justify-center rounded-full bg-[var(--message-input-attachment-bg)] text-foreground/70 transition-colors duration-75 hover:bg-[var(--message-input-attachment-bg-hover)] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"><Plus size={16} strokeWidth={1.5} /></button><input ref={fileInputRef} type="file" multiple={true} className="hidden" onChange={handleFileChange} data-action-ui-id="home-attachment-local" />{attachmentFaceNoticeDialog}<button ref={modelButtonRef} type="button" data-action-ui-id="home-model-btn" onClick={handleModelToggle} className="flex items-center gap-[var(--home-input-control-content-gap)] px-[var(--home-input-toolbar-padding-x)] h-[var(--btn-height-sm)] rounded-full text-[length:var(--home-input-toolbar-font-size)] font-normal leading-5 tracking-[var(--home-input-toolbar-letter-spacing)] text-foreground/70 hover:text-foreground hover:bg-[var(--message-input-control-hover)] transition-colors duration-75 cursor-pointer"><Icon icon={Box} size="md" strokeWidth={1.5} />{buttonLabel}</button><MediaModelSelector open={modelPickerOpen} placement="below" anchorRef={modelButtonRef} currentModelId={selectedModelId} current={selectedMediaModels} onCommit={onModelSelectionChange} onClose={handleModelClose} /><ToolbarDivider /><button type="button" ref={skillTriggerRef} data-action-ui-id="home-skill-btn" onClick={handleSkillsPopover} className="flex items-center gap-[var(--home-input-control-content-gap)] px-[var(--home-input-toolbar-padding-x)] h-[var(--btn-height-sm)] rounded-full text-[length:var(--home-input-toolbar-font-size)] font-normal leading-5 tracking-[var(--home-input-toolbar-letter-spacing)] text-foreground/70 hover:text-foreground hover:bg-[var(--message-input-control-hover)] transition-colors duration-75 cursor-pointer"><SkillIcon size={16} strokeWidth={1.5} />{t("skills.popover.buttonLabel")}</button>{null}{activeSceneLabel && <button type="button" data-action-ui-id="home-active-scene-tag" aria-label={t("home.scene.clearActive", {
      defaultValue: "清除场景 {{scene}}",
      scene: activeSceneLabel
    })} onClick={onClearActiveScene} className="home-active-scene-tag ml-2 inline-flex h-7 max-w-36 shrink-0 cursor-pointer items-center gap-1 rounded-full px-[var(--home-input-toolbar-padding-x)] text-xs font-normal transition-colors focus-visible:outline-none focus-visible:ring-[0.5px] focus-visible:ring-ring"><span className="truncate">{activeSceneLabel}</span><X size={14} strokeWidth={1.5} className="shrink-0" /></button>}{showResetInput ? <div className="ml-auto mr-2 flex shrink-0 items-center gap-0.5"><button type="button" data-action-ui-id="home-reset-btn" aria-label={t("home.input.reset", "重置输入")} title={t("home.input.reset", "重置输入")} onClick={onResetInput} className="flex size-[var(--btn-height-sm)] cursor-pointer items-center justify-center rounded-full text-foreground/50 transition-colors duration-75 hover:bg-[var(--message-input-control-hover)] hover:text-foreground"><Icon icon={RotateCcw} size="md" strokeWidth={1.5} /></button></div> : null}<HomeInputCoachMarks modelButtonRef={modelButtonRef} skillButtonRef={skillTriggerRef} workspaceButtonRef={workspaceButtonRef} /></div>;
}
