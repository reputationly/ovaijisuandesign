// rich-user-prompt-content.jsx
import { findInlineVisualTokens } from "../text-editor/get-wire-content-text.jsx";
import {
  connectorReferenceFromServerName,
  InlineColorValue,
  useMentionModels,
} from "../generation/use-mention-models.jsx";
import { parseConnectorMentionAt } from "../text-editor/build-asr-gateway-request.js";
import { findAllMentions } from "../text-editor/table-document-to-llm-content.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ConnectorIcon } from "../settings/connector-relationship-graphic.jsx";
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { classifyFileType } from "../infra/file-type.js";
import {
  FileKindIcon,
  ModelTypeIcon,
} from "./use-composer-placeholder-actions.jsx";
import { withThumbnailWidth } from "../workspace/tool-label-definitions.js";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import { useGatewayUrl } from "../generation/use-model-catalog-scope-key.js";
import { redactForCurrentRegion } from "../generation/replace-configured-model-names-for-current-region.js";
import { useChatPresentation } from "./use-copy.jsx";

import { splitMentionFilename } from "../infra/dialog-content.jsx";
import { Layers } from "../media-editing/lucide-icon-wraps.js";
import { AssetSegment } from "./asset-segment.jsx";
const MENTION_THUMB_PX = 18;

const TOKEN_CLASS =
  "relative inline-flex min-h-5 items-center align-baseline rounded-sm bg-muted py-px pr-1.5 pl-[26px] leading-4 text-foreground";

const FILE_TOKEN_CLASS = `${TOKEN_CLASS} min-w-0 max-w-[min(220px,100%)] overflow-hidden whitespace-nowrap [overflow-wrap:normal] [word-break:normal]`;

const TOKEN_ICON_CLASS =
  "absolute left-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center border border-border bg-background bg-center bg-cover text-muted-foreground";

function mentionKindFromPath(path) {
  const extension =
    path.split("?")[0]?.split("#")[0]?.split(".").pop()?.toLowerCase() ?? "";
  if (
    [
      "png",
      "jpg",
      "jpeg",
      "gif",
      "webp",
      "svg",
      "bmp",
      "avif",
      "heic",
      "heif",
    ].includes(extension)
  )
    return "image";
  if (["mp4", "webm", "mov", "m4v", "avi", "mkv"].includes(extension)) return "video";
  if (["mp3", "wav", "m4a", "ogg", "flac", "aac"].includes(extension)) return "audio";
  if (["txt", "md", "json"].includes(extension)) return "text";
  return "other";
}

function basename(path) {
  return path.split("/").pop() || path;
}

function buildMediaThumbUrl(gatewayUrl, kind, workspaceRelativePath) {
  if (kind !== "image" && kind !== "video") return null;
  const encoded = workspaceRelativePath
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  const prefix = kind === "image" ? "/files/" : "/api/thumbnail/";
  const base = gatewayUrl(`${prefix}${encoded}`);
  return withThumbnailWidth(base, MENTION_THUMB_PX) ?? null;
}

function modelCandidates(models) {
  return models
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
      {
        token: model.display_name,
        model,
      },
      {
        token: model.id,
        model,
      },
    ])
    .filter((entry) => entry.token.length > 0)
    .sort((leftCandidate, rightCandidate) => rightCandidate.token.length - leftCandidate.token.length);
}

function findModelAt(text, atIndex, models) {
  for (const { token, model } of modelCandidates(models)) {
    if (!text.startsWith(token, atIndex + 1)) continue;
    const next = text[atIndex + 1 + token.length];
    if (next !== void 0 && !/\s/.test(next)) continue;
    return {
      end: atIndex + 1 + token.length,
      segment: {
        type: "model",
        key: `model-${atIndex}-${token}`,
        name: model.display_name,
        mediaType: model.type,
        thumbUrl: model.icon_url || null,
      },
    };
  }
  const fallback = findAllMentions(text).find(
    (mention) => mention.start === atIndex,
  );
  if (!fallback?.path.startsWith("model:")) return null;
  const mentionName = fallback.path.slice("model:".length);
  if (!mentionName) return null;
  return {
    end: fallback.end,
    segment: {
      type: "model",
      key: `model-${atIndex}-${fallback.path}`,
      name: mentionName,
      mediaType: null,
      thumbUrl: null,
    },
  };
}

function findConnectorAt(text, atIndex) {
  const match = parseConnectorMentionAt(text, atIndex);
  if (!match) return null;
  const connector = connectorReferenceFromServerName(match.serverName);
  return {
    end: match.end,
    segment: {
      type: "connector",
      key: `connector-${atIndex}-${connector.serverName}`,
      name: match.displayName ?? connector.displayName,
      iconUrl: connector.iconUrl,
    },
  };
}

function findSkillAt(text, slashIndex) {
  const previous = text[slashIndex - 1];
  if (previous !== void 0 && !/\s/.test(previous)) return null;
  const match = /^\/([A-Za-z0-9][A-Za-z0-9_-]*)/.exec(text.slice(slashIndex));
  if (!match) return null;
  const command = match[0];
  const next = text[slashIndex + command.length];
  if (next !== void 0 && next !== " " && next !== "/") return null;
  const skillName = command.slice(1);
  return {
    end: slashIndex + command.length,
    segment: {
      type: "skill",
      key: `skill-${slashIndex}-${skillName}`,
      name: skillName,
    },
  };
}

function pushText(segments, content, start, end) {
  if (end <= start) return;
  const text = content.slice(start, end);
  const tokens = findInlineVisualTokens(text);
  if (tokens.length === 0) {
    segments.push({
      type: "text",
      key: `text-${start}-${end}`,
      text,
    });
    return;
  }
  let cursor = 0;
  for (const token of tokens) {
    if (token.start > cursor) {
      segments.push({
        type: "text",
        key: `text-${start + cursor}-${start + token.start}`,
        text: text.slice(cursor, token.start),
      });
    }
    segments.push({
      type: "color",
      key: `color-${start + token.start}-${token.value}`,
      value: token.value,
      text: token.raw,
    });
    cursor = token.end;
  }
  if (cursor < text.length) {
    segments.push({
      type: "text",
      key: `text-${start + cursor}-${end}`,
      text: text.slice(cursor),
    });
  }
}

function parseRichUserPrompt(content, models, displayNames = []) {
  const occurrences = new Map();
  const fileMentions = findAllMentions(content);
  const fileMentionByStart = new Map();
  for (const mention of fileMentions) fileMentionByStart.set(mention.start, mention);
  const segments = [];
  let cursor = 0;
  while (cursor < content.length) {
    const atIndex = content.indexOf("@", cursor);
    const slashIndex = content.indexOf("/", cursor);
    const assetIndex = content.indexOf("[asset_context", cursor);
    const tokenIndex = [atIndex, slashIndex, assetIndex].filter((idx) => idx >= 0).sort((a2, b3) => a2 - b3)[0];
    if (tokenIndex === void 0) break;
    pushText(segments, content, cursor, tokenIndex);
    if (tokenIndex === assetIndex) {
      const asset = findAssetContextAt(content, tokenIndex);
      if (asset) {
        segments.push(asset.segment);
        cursor = asset.end;
      } else {
        pushText(segments, content, tokenIndex, tokenIndex + 1);
        cursor = tokenIndex + 1;
      }
      continue;
    }
    if (tokenIndex === slashIndex) {
      const skill = findSkillAt(content, tokenIndex);
      if (skill) {
        segments.push(skill.segment);
        cursor = skill.end;
      } else {
        pushText(segments, content, tokenIndex, tokenIndex + 1);
        cursor = tokenIndex + 1;
      }
      continue;
    }
    const composition2 = parseCompositionMentionAt(content, tokenIndex);
    if (composition2) {
      segments.push({
        type: "composition",
        key: `composition-${tokenIndex}`,
        id: composition2.compositionId,
        name: composition2.name,
      });
      cursor = composition2.end;
      continue;
    }
    const connector = findConnectorAt(content, tokenIndex);
    if (connector) {
      segments.push(connector.segment);
      cursor = connector.end;
      continue;
    }
    const model = findModelAt(content, tokenIndex, models);
    if (model) {
      segments.push(model.segment);
      cursor = model.end;
      continue;
    }
    const fileMention = fileMentionByStart.get(tokenIndex);
    if (fileMention?.path) {
      const occurrence = occurrences.get(fileMention.path) ?? 0;
      occurrences.set(fileMention.path, occurrence + 1);
      const displayName2 = displayNames.find(
        (item) => item.path === fileMention.path && item.occurrence === occurrence,
      )?.displayName;
      segments.push({
        type: "file",
        key: `file-${tokenIndex}-${fileMention.path}`,
        path: fileMention.path,
        name: basename(fileMention.path),
        displayName: displayName2,
        kind: mentionKindFromPath(fileMention.path),
      });
      cursor = fileMention.end;
      continue;
    }
    pushText(segments, content, tokenIndex, tokenIndex + 1);
    cursor = tokenIndex + 1;
  }
  pushText(segments, content, cursor, content.length);
  return segments;
}

function redactRichSegments(segments) {
  return segments.map((segment) => {
    if (segment.type === "text") {
      return {
        ...segment,
        text: redactForCurrentRegion(segment.text),
      };
    }
    if (segment.type === "model") {
      return {
        ...segment,
        name: redactForCurrentRegion(segment.name),
      };
    }
    if (segment.type === "skill") {
      return {
        ...segment,
        name: redactForCurrentRegion(segment.name),
      };
    }
    return segment;
  });
}

function TokenIcon({ thumbUrl, children }) {
  const [failedUrl, setFailedUrl] = reactExports.useState(null);
  return (
    <span className={TOKEN_ICON_CLASS} aria-hidden="true">
      {thumbUrl && failedUrl !== thumbUrl ? (
        <img
          src={thumbUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailedUrl(thumbUrl)}
        />
      ) : (
        children
      )}
    </span>
  );
}

function FileSegment({ segment }) {
  const gatewayUrl = useGatewayUrl();
  const thumbUrl = buildMediaThumbUrl(gatewayUrl, segment.kind, segment.path);
  const { stem, ext } = splitMentionFilename(segment.displayName ?? segment.name);
  return (
    <span
      className={`hl-mention-file ${FILE_TOKEN_CLASS}`}
      data-mention-kind={segment.kind}
      data-mention-name={segment.name}
      data-mention-display-name={segment.displayName}
    >
      <TokenIcon thumbUrl={thumbUrl}>
        {segment.kind === "image" || segment.kind === "video" || segment.kind === "audio" ? (
          <FileKindIcon kind={segment.kind} />
        ) : (
          <FileTypeIcon
            {...classifyFileType({
              filename: segment.name,
            })}
            size={14}
            decorative={true}
          />
        )}
      </TokenIcon>
      <span className="hl-mention-name min-w-0 truncate">{stem}</span>
      {ext && <span className="hl-mention-file-ext shrink-0 text-muted-foreground">{ext}</span>}
    </span>
  );
}

function ModelSegment({ segment }) {
  return (
    <span
      className={`hl-mention-model ${TOKEN_CLASS}`}
      data-mention-kind="model"
      data-mention-name={segment.name}
    >
      <TokenIcon thumbUrl={segment.thumbUrl}>
        <ModelTypeIcon mediaType={segment.mediaType} className="h-3 w-3" />
      </TokenIcon>
      @{segment.name}
    </span>
  );
}

function ConnectorSegment({ segment }) {
  return (
    <span
      className="hl-mention-connector inline-flex min-h-5 max-w-full items-center gap-1 rounded-sm bg-muted py-0 pr-1.5 pl-1 align-middle leading-5 text-foreground"
      data-mention-kind="connector"
      data-mention-name={segment.name}
    >
      <ConnectorIcon iconUrl={segment.iconUrl} size="inline" />
      <span className="min-w-0 [overflow-wrap:anywhere]">{segment.name}</span>
    </span>
  );
}

function renderSegments(segments) {
  return segments.map((segment) => {
    if (segment.type === "text") return <span key={segment.key}>{segment.text}</span>;
    if (segment.type === "color") {
      return (
        <InlineColorValue key={segment.key} value={segment.value}>
          {segment.text}
        </InlineColorValue>
      );
    }
    if (segment.type === "skill") {
      return (
        <span
          key={segment.key}
          className="hl-skill inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-sm bg-brand-accent/12"
          style={{
            // 深紫近黑文字: foreground 80% + brand-accent 20%。
            // light 下混出深紫近黑;dark 下混出浅紫近白,自动跟主题切换。
            color: "color-mix(in srgb, var(--foreground) 80%, var(--brand-accent) 20%)",
          }}
        >
          /{segment.name}
        </span>
      );
    }
    if (segment.type === "composition")
      return <CompositionMentionTag key={segment.key} compositionId={segment.id} name={segment.name} />;
    if (segment.type === "model") return <ModelSegment key={segment.key} segment={segment} />;
    if (segment.type === "asset") return <AssetSegment key={segment.key} segment={segment} />;
    if (segment.type === "connector") {
      return <ConnectorSegment key={segment.key} segment={segment} />;
    }
    return <FileSegment key={segment.key} segment={segment} />;
  });
}

export const RichUserPromptContent = reactExports.memo(
  function RichUserPromptContent({
    content,
    collapsible = false,
    className,
  }) {
    const { t: translate } = useTranslation();
    const isPresented = useChatPresentation();
    const { data: mentionModels = [] } = useMentionModels();
    const segments = reactExports.useMemo(
      () => redactRichSegments(parseRichUserPrompt(content, mentionModels)),
      [content, mentionModels],
    );
    const [expanded, setExpanded] = reactExports.useState(false);
    const contentRef = reactExports.useRef(null);
    const [overflows, setOverflows] = reactExports.useState(false);
    reactExports.useLayoutEffect(() => {
      if (!collapsible || expanded || !isPresented) return;
      const contentElement = contentRef.current;
      if (!contentElement) return;
      const check = () => {
        if (contentElement.scrollHeight <= 0 || contentElement.clientHeight <= 0) return;
        setOverflows(contentElement.scrollHeight > contentElement.clientHeight + 1);
      };
      check();
      const resizeObserver = new ResizeObserver(check);
      resizeObserver.observe(contentElement);
      const mutationObserver = new MutationObserver(check);
      mutationObserver.observe(contentElement, {
        childList: true,
        characterData: true,
        subtree: true,
      });
      return () => {
        resizeObserver.disconnect();
        mutationObserver.disconnect();
      };
    }, [collapsible, expanded, isPresented]);
    const baseClass =
      `rich-user-prompt whitespace-pre-wrap break-words ${className ?? ""}`.trim();
    const clampClass = collapsible
      ? expanded
        ? `${baseClass} max-h-60 overflow-y-auto`
        : `${baseClass} line-clamp-2`
      : baseClass;
    return (
      <>
        <div
          ref={contentRef}
          data-text-selectable="true"
          className={clampClass}
          style={
            collapsible && !expanded && overflows
              ? {
                  WebkitMaskImage:
                    "linear-gradient(to bottom, black 50%, transparent)",
                  maskImage:
                    "linear-gradient(to bottom, black 50%, transparent)",
                }
              : void 0
          }
        >
          {renderSegments(segments)}
        </div>
        {collapsible && (overflows || expanded) && (
          <button
            type="button"
            className="mt-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((isExpanded) => !isExpanded)}
          >
            {expanded ? translate("chat.collapse") : translate("chat.expand")}
          </button>
        )}
      </>
    );
  },
);

RichUserPromptContent.displayName = "RichUserPromptContent";

function findAssetContextAt(text2, atIndex) {
  if (atIndex > 0 && text2[atIndex - 1] !== "\n") return null;
  const marker = /^\[asset_context\s+([^\]\r\n]+)\]/.exec(text2.slice(atIndex));
  if (!marker) return null;
  const fields2 = marker[1];
  const resourceId2 = /(?:^|\s)resourceId=([^\s\]]+)/.exec(fields2)?.[1];
  const versionId = /(?:^|\s)versionId=([^\s\]]+)/.exec(fields2)?.[1];
  if (!resourceId2 || !versionId) return null;
  return {
    end: atIndex + marker[0].length,
    segment: {
      type: "asset",
      key: `asset-${atIndex}-${resourceId2}-${versionId}`,
      resourceId: resourceId2,
      versionId,
    },
  };
}
