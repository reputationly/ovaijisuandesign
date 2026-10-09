// file-drop-feedback.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { Upload } from "../media-editing/package.jsx";

export const POPOVER_ID = "message-input-slash-listbox";

export const MENTION_POPOVER_ID = "message-input-mention-listbox";

export const MESSAGE_ACTION_BUTTON_CLASS =
  "flex size-[var(--btn-height-sm)] cursor-pointer items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/90";

export const MESSAGE_ACTION_LABEL_BUTTON_CLASS =
  "flex h-[var(--btn-height-sm)] w-auto cursor-pointer items-center justify-center whitespace-nowrap rounded-full bg-foreground px-[var(--btn-padding-x-md)] text-xs font-medium text-background transition-colors hover:bg-foreground/90 group-data-[actions-compact=true]/composer:size-[var(--btn-height-sm)] group-data-[actions-compact=true]/composer:px-0";

export function workflowAttachmentName(workflow) {
  const base2 =
    workflow.name.trim() || workflow.title.trim() || "comfyui-workflow";
  const safe = base2.replaceAll("/", "_").replaceAll("\\", "_");
  return safe.toLocaleLowerCase().endsWith(".json") ? safe : `${safe}.json`;
}

export function mentionKindFromPath$1(path2) {
  const ext =
    path2.split("?")[0]?.split("#")[0]?.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"].includes(ext))
    return "image";
  if (["mp4", "webm", "mov", "m4v", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a", "ogg", "flac", "aac"].includes(ext)) return "audio";
  if (["txt", "md", "json"].includes(ext)) return "text";
  return "other";
}

export function basename$7(path2) {
  return path2.split("/").pop() || path2;
}

export function mentionKindFromFileType(fileType, path2) {
  if (
    fileType === "image" ||
    fileType === "video" ||
    fileType === "audio" ||
    fileType === "text"
  ) {
    return fileType;
  }
  return mentionKindFromPath$1(path2);
}

export function FileDropFeedback({ label }) {
  return (
    <div
      data-file-drop-feedback="true"
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-[inherit] border border-dashed border-[color:var(--file-drop-border)] bg-[var(--file-drop-fill)]"
    >
      <div className="flex items-center gap-2 rounded-full border border-[color:var(--file-drop-prompt-border)] bg-[var(--file-drop-prompt-surface)] px-3 py-1.5 text-[color:var(--brand-accent)] backdrop-blur-sm">
        <Upload size={18} strokeWidth={1.5} />
        <span className="text-xs font-medium">{label}</span>
      </div>
    </div>
  );
}
