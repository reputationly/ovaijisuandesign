// build-doc-content-from-input.jsx
import { connectorReferenceFromServerName, Upload } from "../vendor.js";
import { parseConnectorMentionAt } from "../m01/myers-line-hunks.js";
import { findAllMentions } from "../m01/table-document-to-llm-content.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  MENTION_PREVIEW_PX,
  MENTION_THUMB_PX$1,
  buildMentionMediaUrl,
  buildMentionPlayableUrl,
} from "./mention-popover.jsx";
export const POPOVER_ID = "message-input-slash-listbox";
export const MENTION_POPOVER_ID = "message-input-mention-listbox";
export const MESSAGE_ACTION_BUTTON_CLASS =
  "flex size-[var(--btn-height-sm)] cursor-pointer items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/90";
export const MESSAGE_ACTION_LABEL_BUTTON_CLASS =
  "flex h-[var(--btn-height-sm)] w-auto cursor-pointer items-center justify-center whitespace-nowrap rounded-full bg-foreground px-[var(--btn-padding-x-md)] text-xs font-medium text-background transition-colors hover:bg-foreground/90 group-data-[actions-compact=true]/composer:size-[var(--btn-height-sm)] group-data-[actions-compact=true]/composer:px-0";
export function workflowAttachmentName(workflow) {
  const base2 = workflow.name.trim() || workflow.title.trim() || "comfyui-workflow";
  const safe = base2.replaceAll("/", "_").replaceAll("\\", "_");
  return safe.toLocaleLowerCase().endsWith(".json") ? safe : `${safe}.json`;
}
export function mentionKindFromPath$1(path2) {
  const ext = path2.split("?")[0]?.split("#")[0]?.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"].includes(ext)) return "image";
  if (["mp4", "webm", "mov", "m4v", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a", "ogg", "flac", "aac"].includes(ext)) return "audio";
  if (["txt", "md", "json"].includes(ext)) return "text";
  return "other";
}
export function basename$7(path2) {
  return path2.split("/").pop() || path2;
}
export function mentionKindFromFileType(fileType, path2) {
  if (fileType === "image" || fileType === "video" || fileType === "audio" || fileType === "text") {
    return fileType;
  }
  return mentionKindFromPath$1(path2);
}
export function buildDocContentFromInput(text2, ctx) {
  const modelCandidates2 = ctx.mentionModels
    .flatMap((model) => [
      {
        token: `model:${model.mention_name ?? model.model_name}`,
        model,
      },
      {
        token: `model:${model.model_name}`,
        model,
      },
      {
        token: `model:${model.id}`,
        model,
      },
      {
        token: model.mention_name ?? model.model_name,
        model,
      },
      {
        token: model.model_name,
        model,
      },
      // display_name is what the chat message DOM renders — needed so
      // copy-paste from a rendered user message resolves back to a model chip.
      {
        token: model.display_name,
        model,
      },
      // Backward compatibility for drafts/history saved before model mentions
      // serialized to stable ids.
      {
        token: model.id,
        model,
      },
    ])
    .filter((entry) => entry.token.length > 0)
    .sort((a2, b3) => b3.token.length - a2.token.length);
  const workflowCandidates = (ctx.workflows ?? []).map((workflow) => ({
    token: `workflow:${workflow.id}`,
    workflow,
  }));
  const fileMentions = findAllMentions(text2);
  const fileMentionByStart = new Map();
  for (const m3 of fileMentions) fileMentionByStart.set(m3.start, m3);
  const inline2 = [];
  let lastIdx = 0;
  while (lastIdx < text2.length) {
    const idx = text2.indexOf("@", lastIdx);
    if (idx < 0) break;
    if (idx > lastIdx) {
      inline2.push({
        type: "text",
        text: text2.slice(lastIdx, idx),
      });
    }
    const workflowMatch = workflowCandidates.find(({ token: token22 }) => {
      if (!text2.startsWith(token22, idx + 1)) return false;
      const next2 = text2[idx + 1 + token22.length];
      return next2 === void 0 || /\s/.test(next2);
    });
    const modelMatch = modelCandidates2.find(({ token: token22 }) => {
      if (!text2.startsWith(token22, idx + 1)) return false;
      const next2 = text2[idx + 1 + token22.length];
      return next2 === void 0 || /\s/.test(next2);
    });
    let token2;
    let attrs;
    let end2;
    const connectorMatch = parseConnectorMentionAt(text2, idx);
    if (connectorMatch) {
      end2 = connectorMatch.end;
      const serverName = connectorMatch.serverName;
      const connector =
        ctx.connectors?.find(
          (candidate) =>
            candidate.serverName.toLocaleLowerCase() === serverName.toLocaleLowerCase(),
        ) ?? connectorReferenceFromServerName(serverName);
      attrs = {
        path: connector.serverName,
        name: connectorMatch.displayName ?? connector.displayName,
        modelName: null,
        mentionName: null,
        kind: "connector",
        mediaType: null,
        thumbUrl: connector.iconUrl,
        previewUrl: null,
        mediaUrl: null,
      };
    } else if (workflowMatch) {
      token2 = workflowMatch.token;
      end2 = idx + 1 + token2.length;
      attrs = {
        path: workflowMatch.workflow.id,
        name: workflowMatch.workflow.title,
        modelName: null,
        mentionName: null,
        kind: "workflow",
        mediaType: null,
        thumbUrl: null,
        previewUrl: null,
        mediaUrl: null,
      };
    } else if (modelMatch) {
      const model = modelMatch.model;
      token2 = modelMatch.token;
      end2 = idx + 1 + token2.length;
      attrs = {
        path: model.id,
        name: model.display_name,
        modelName: model.model_name,
        mentionName: model.mention_name ?? model.model_name,
        kind: "model",
        mediaType: model.type,
        thumbUrl: model.icon_url || null,
        previewUrl: null,
        mediaUrl: null,
      };
    } else {
      const fileMention = fileMentionByStart.get(idx);
      const isBracket = !!fileMention && text2[idx + 1] === "[";
      if (fileMention) {
        token2 = fileMention.path;
        end2 = fileMention.end;
      } else {
        const tokenStart = idx + 1;
        const rest = text2.slice(tokenStart);
        const spaceMatch = rest.search(/\s/);
        end2 = spaceMatch < 0 ? text2.length : tokenStart + spaceMatch;
        token2 = text2.slice(tokenStart, end2);
      }
      if (!token2) {
        inline2.push({
          type: "text",
          text: "@",
        });
        lastIdx = idx + 1;
        continue;
      }
      const cachedFile = ctx.cachedFiles.get(token2);
      if (!isBracket && !cachedFile) {
        inline2.push({
          type: "text",
          text: "@",
        });
        lastIdx = idx + 1;
        continue;
      }
      const kind = cachedFile?.kind ?? mentionKindFromPath$1(token2);
      attrs = {
        path: token2,
        name: cachedFile?.name ?? basename$7(token2),
        modelName: null,
        kind,
        mediaType: null,
        thumbUrl:
          buildMentionMediaUrl(ctx.scopedGatewayUrl, kind, token2, MENTION_THUMB_PX$1) ?? null,
        previewUrl:
          buildMentionMediaUrl(ctx.scopedGatewayUrl, kind, token2, MENTION_PREVIEW_PX) ?? null,
        mediaUrl: buildMentionPlayableUrl(ctx.scopedGatewayUrl, kind, token2) ?? null,
      };
    }
    inline2.push({
      type: "mentionRef",
      attrs,
    });
    lastIdx = end2;
  }
  if (lastIdx < text2.length) {
    inline2.push({
      type: "text",
      text: text2.slice(lastIdx),
    });
  }
  return {
    type: "doc",
    content: [
      inline2.length === 0
        ? {
            type: "paragraph",
          }
        : {
            type: "paragraph",
            content: inline2,
          },
    ],
  };
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
