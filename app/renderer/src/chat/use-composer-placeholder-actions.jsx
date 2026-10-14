// use-composer-placeholder-actions.jsx
import {
  CompositedSvg,
  Music,
  PluginKey,
  reactExports,
  Video,
} from "../vendor.js";
import { mentionRefLeafText } from "../text-editor/get-wire-content-text.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  FileIcon as File,
  FileText,
  FileVideo,
  ImageOutlineIcon,
} from "../media-editing/package.jsx";
function languageDetectionLeafText(leafNode) {
  if (leafNode.type.name === "hardBreak") return "\n";
  if (leafNode.type.name === "mentionRef") return " ";
  return "";
}
export function getDocLanguageDetectionText(doc) {
  return doc.textBetween(
    0,
    doc.content.size,
    "\n",
    languageDetectionLeafText,
  );
}
export function pmPosToTextOffset(doc, pmPos) {
  if (pmPos <= 0) return 0;
  return doc.textBetween(0, pmPos, "\n", mentionRefLeafText).length;
}
export function scheduleEditorFocus(editor, position) {
  requestAnimationFrame(() => {
    if (editor && !editor.isDestroyed) editor.commands.focus(position);
  });
}
export const highlightPluginKey = new PluginKey("chatHighlight");
function AudioWaveIcon({ className }) {
  return (
    <CompositedSvg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 2v12" />
      <path d="M4 5v6" />
      <path d="M12 5v6" />
      <path d="M2 7v2" />
      <path d="M6 4v8" />
      <path d="M10 4v8" />
      <path d="M14 7v2" />
    </CompositedSvg>
  );
}
export function FileKindIcon({ kind, className }) {
  const iconClassName = className ?? "w-3.5 h-3.5 text-muted-foreground";
  if (kind === "image") return <ImageOutlineIcon className={iconClassName} />;
  if (kind === "video") return <FileVideo className={iconClassName} />;
  if (kind === "audio") return <AudioWaveIcon className={iconClassName} />;
  if (kind === "text") return <FileText className={iconClassName} />;
  return <File className={iconClassName} />;
}
export function ModelTypeIcon({ mediaType, className }) {
  const iconClassName = className ?? "w-3.5 h-3.5 text-muted-foreground";
  if (mediaType === "video") return <Video className={iconClassName} />;
  if (mediaType === "audio") return <Music className={iconClassName} />;
  return <ImageOutlineIcon className={iconClassName} />;
}
export function folderBaseName(absPath) {
  const normalized = absPath.replace(/[/\\]+$/, "");
  const segment = normalized.split(/[/\\]/).pop();
  return segment && segment.length > 0 ? segment : normalized;
}
export function useComposerPlaceholderActions({
  sendInFlightRef,
  interactionLocked,
  enableSlashCommands,
  slashOpen,
  mentionOpen,
  editor,
  openSlash,
  closeSlash,
  closeMention,
  openMention,
}) {
  const slashOpenRef = reactExports.useRef(slashOpen);
  slashOpenRef.current = slashOpen;
  const mentionOpenRef = reactExports.useRef(mentionOpen);
  mentionOpenRef.current = mentionOpen;
  const triggerSlash = reactExports.useCallback(() => {
    if (!enableSlashCommands || sendInFlightRef.current || interactionLocked)
      return;
    if (mentionOpenRef.current) closeMention();
    if (slashOpenRef.current) {
      closeSlash();
      editor?.commands.focus();
      return;
    }
    openSlash();
    editor?.commands.focus();
  }, [
    closeMention,
    closeSlash,
    editor,
    enableSlashCommands,
    interactionLocked,
    openSlash,
    sendInFlightRef,
  ]);
  const triggerMention = reactExports.useCallback(() => {
    if (sendInFlightRef.current || interactionLocked) return;
    if (mentionOpenRef.current) {
      closeMention();
      editor?.commands.focus();
      return;
    }
    if (slashOpenRef.current) closeSlash();
    editor?.commands.focus();
    openMention();
  }, [
    closeMention,
    closeSlash,
    editor,
    interactionLocked,
    openMention,
    sendInFlightRef,
  ]);
  return {
    triggerMention,
    triggerSlash,
  };
}
