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
      const kind = cachedFile?.kind ?? mentionKindFromPath(token2);
      attrs = {
        path: token2,
        name: cachedFile?.name ?? basename(token2),
        modelName: null,
        kind,
        mediaType: null,
        thumbUrl:
          buildMentionMediaUrl(
            ctx.scopedGatewayUrl,
            kind,
            token2,
            MENTION_THUMB_PX,
          ) ?? null,
        previewUrl:
          buildMentionMediaUrl(
            ctx.scopedGatewayUrl,
            kind,
            token2,
            MENTION_PREVIEW_PX,
          ) ?? null,
        mediaUrl:
          buildMentionPlayableUrl(ctx.scopedGatewayUrl, kind, token2) ?? null,
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
