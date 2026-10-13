// build-doc-content-from-input.js
import { basename, mentionKindFromPath } from "./file-drop-feedback.jsx";
import { connectorReferenceFromServerName } from "../generation/use-mention-models.jsx";
import { parseConnectorMentionAt } from "./build-asr-gateway-request.js";
import { findAllMentions } from "./table-document-to-llm-content.js";
import {
  buildMentionMediaUrl,
  buildMentionPlayableUrl,
  MENTION_PREVIEW_PX,
  MENTION_THUMB_PX,
} from "../chat/create-expanded-composer-actions-measurer.jsx";
export function buildDocContentFromInput(text, ctx) {
  const modelCandidates = ctx.mentionModels
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
    .sort((a, b) => b.token.length - a.token.length);
  const workflowCandidates = (ctx.workflows ?? []).map((workflow) => ({
    token: `workflow:${workflow.id}`,
    workflow,
  }));
  const fileMentions = findAllMentions(text);
  const fileMentionByStart = new Map();
  for (const fileMention of fileMentions) fileMentionByStart.set(fileMention.start, fileMention);
  const inline = [];
  let lastIdx = 0;
  while (lastIdx < text.length) {
    const idx = text.indexOf("@", lastIdx);
    if (idx < 0) break;
    if (idx > lastIdx) {
      inline.push({
        type: "text",
        text: text.slice(lastIdx, idx),
      });
    }
    const workflowMatch = workflowCandidates.find(({ token }) => {
      if (!text.startsWith(token, idx + 1)) return false;
      const next = text[idx + 1 + token.length];
      return next === void 0 || /\s/.test(next);
    });
    const modelMatch = modelCandidates.find(({ token }) => {
      if (!text.startsWith(token, idx + 1)) return false;
      const next = text[idx + 1 + token.length];
      return next === void 0 || /\s/.test(next);
    });
    let token;
    let attrs;
    let end;
    const connectorMatch = parseConnectorMentionAt(text, idx);
    if (connectorMatch) {
      end = connectorMatch.end;
      const serverName = connectorMatch.serverName;
      const connector =
        ctx.connectors?.find(
          (candidate) =>
            candidate.serverName.toLocaleLowerCase() ===
            serverName.toLocaleLowerCase(),
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
      token = workflowMatch.token;
      end = idx + 1 + token.length;
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
      token = modelMatch.token;
      end = idx + 1 + token.length;
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
      const isBracket = !!fileMention && text[idx + 1] === "[";
      if (fileMention) {
        token = fileMention.path;
        end = fileMention.end;
      } else {
        const tokenStart = idx + 1;
        const rest = text.slice(tokenStart);
        const spaceMatch = rest.search(/\s/);
        end = spaceMatch < 0 ? text.length : tokenStart + spaceMatch;
        token = text.slice(tokenStart, end);
      }
      if (!token) {
        inline.push({
          type: "text",
          text: "@",
        });
        lastIdx = idx + 1;
        continue;
      }
      const cachedFile = ctx.cachedFiles.get(token);
      if (!isBracket && !cachedFile) {
        inline.push({
          type: "text",
          text: "@",
        });
        lastIdx = idx + 1;
        continue;
      }
      const kind = cachedFile?.kind ?? mentionKindFromPath(token);
      attrs = {
        path: token,
        name: cachedFile?.name ?? basename(token),
        modelName: null,
        kind,
        mediaType: null,
        thumbUrl:
          buildMentionMediaUrl(
            ctx.scopedGatewayUrl,
            kind,
            token,
            MENTION_THUMB_PX,
          ) ?? null,
        previewUrl:
          buildMentionMediaUrl(
            ctx.scopedGatewayUrl,
            kind,
            token,
            MENTION_PREVIEW_PX,
          ) ?? null,
        mediaUrl:
          buildMentionPlayableUrl(ctx.scopedGatewayUrl, kind, token) ?? null,
      };
    }
    inline.push({
      type: "mentionRef",
      attrs,
    });
    lastIdx = end;
  }
  if (lastIdx < text.length) {
    inline.push({
      type: "text",
      text: text.slice(lastIdx),
    });
  }
  return {
    type: "doc",
    content: [
      inline.length === 0
        ? {
            type: "paragraph",
          }
        : {
            type: "paragraph",
            content: inline,
          },
    ],
  };
}
