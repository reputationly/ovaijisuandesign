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
import {
  classifyFileType,
  jsxRuntimeExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import {
  FileKindIcon,
  ModelTypeIcon,
} from "./use-composer-placeholder-actions.jsx";
import { withThumbnailWidth } from "../workspace/tool-label-definitions.js";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import { useGatewayUrl } from "../generation/use-model-catalog-scope-key.js";
import { redactForCurrentRegion } from "../generation/replace-configured-model-names-for-current-region.js";
import { useChatPresentation } from "./use-copy.jsx";

const MENTION_THUMB_PX = 18;

const TOKEN_CLASS =
  "relative inline-flex min-h-5 items-center align-baseline rounded-sm bg-muted py-px pr-1.5 pl-[26px] leading-4 text-foreground";

const FILE_TOKEN_CLASS = `${TOKEN_CLASS} max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap [overflow-wrap:normal] [word-break:normal]`;

const TOKEN_ICON_CLASS =
  "absolute left-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center border border-border bg-background bg-center bg-cover text-muted-foreground";

function mentionKindFromPath(path2) {
  const ext =
    path2.split("?")[0]?.split("#")[0]?.split(".").pop()?.toLowerCase() ?? "";
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
    ].includes(ext)
  )
    return "image";
  if (["mp4", "webm", "mov", "m4v", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a", "ogg", "flac", "aac"].includes(ext)) return "audio";
  if (["txt", "md", "json"].includes(ext)) return "text";
  return "other";
}

function basename(path2) {
  return path2.split("/").pop() || path2;
}

function buildMediaThumbUrl(gatewayUrl2, kind, workspaceRelativePath) {
  if (kind !== "image" && kind !== "video") return null;
  const encoded = workspaceRelativePath
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  const prefix = kind === "image" ? "/files/" : "/api/thumbnail/";
  const base2 = gatewayUrl2(`${prefix}${encoded}`);
  return withThumbnailWidth(base2, MENTION_THUMB_PX) ?? null;
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
    .sort((a2, b3) => b3.token.length - a2.token.length);
}

function findModelAt(text2, atIndex, models) {
  for (const { token: token2, model } of modelCandidates(models)) {
    if (!text2.startsWith(token2, atIndex + 1)) continue;
    const next2 = text2[atIndex + 1 + token2.length];
    if (next2 !== void 0 && !/\s/.test(next2)) continue;
    return {
      end: atIndex + 1 + token2.length,
      segment: {
        type: "model",
        key: `model-${atIndex}-${token2}`,
        name: model.display_name,
        mediaType: model.type,
        thumbUrl: model.icon_url || null,
      },
    };
  }
  const fallback = findAllMentions(text2).find(
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

function findConnectorAt(text2, atIndex) {
  const match2 = parseConnectorMentionAt(text2, atIndex);
  if (!match2) return null;
  const connector = connectorReferenceFromServerName(match2.serverName);
  return {
    end: match2.end,
    segment: {
      type: "connector",
      key: `connector-${atIndex}-${connector.serverName}`,
      name: match2.displayName ?? connector.displayName,
      iconUrl: connector.iconUrl,
    },
  };
}

function findSkillAt(text2, slashIndex) {
  const previous2 = text2[slashIndex - 1];
  if (previous2 !== void 0 && !/\s/.test(previous2)) return null;
  const match2 = /^\/([A-Za-z0-9][A-Za-z0-9_-]*)/.exec(text2.slice(slashIndex));
  if (!match2) return null;
  const command2 = match2[0];
  const next2 = text2[slashIndex + command2.length];
  if (next2 !== void 0 && next2 !== " " && next2 !== "/") return null;
  const name2 = command2.slice(1);
  return {
    end: slashIndex + command2.length,
    segment: {
      type: "skill",
      key: `skill-${slashIndex}-${name2}`,
      name: name2,
    },
  };
}

function pushText(segments, content2, start2, end2) {
  if (end2 <= start2) return;
  const text2 = content2.slice(start2, end2);
  const tokens2 = findInlineVisualTokens(text2);
  if (tokens2.length === 0) {
    segments.push({
      type: "text",
      key: `text-${start2}-${end2}`,
      text: text2,
    });
    return;
  }
  let cursor = 0;
  for (const token2 of tokens2) {
    if (token2.start > cursor) {
      segments.push({
        type: "text",
        key: `text-${start2 + cursor}-${start2 + token2.start}`,
        text: text2.slice(cursor, token2.start),
      });
    }
    segments.push({
      type: "color",
      key: `color-${start2 + token2.start}-${token2.value}`,
      value: token2.value,
      text: token2.raw,
    });
    cursor = token2.end;
  }
  if (cursor < text2.length) {
    segments.push({
      type: "text",
      key: `text-${start2 + cursor}-${end2}`,
      text: text2.slice(cursor),
    });
  }
}

function parseRichUserPrompt(content2, models) {
  const fileMentions = findAllMentions(content2);
  const fileMentionByStart = new Map();
  for (const mention of fileMentions)
    fileMentionByStart.set(mention.start, mention);
  const segments = [];
  let cursor = 0;
  while (cursor < content2.length) {
    const atIndex = content2.indexOf("@", cursor);
    const slashIndex = content2.indexOf("/", cursor);
    const tokenIndex = [atIndex, slashIndex]
      .filter((idx) => idx >= 0)
      .sort((a2, b3) => a2 - b3)[0];
    if (tokenIndex === void 0) break;
    pushText(segments, content2, cursor, tokenIndex);
    if (tokenIndex === slashIndex) {
      const skill = findSkillAt(content2, tokenIndex);
      if (skill) {
        segments.push(skill.segment);
        cursor = skill.end;
      } else {
        pushText(segments, content2, tokenIndex, tokenIndex + 1);
        cursor = tokenIndex + 1;
      }
      continue;
    }
    const connector = findConnectorAt(content2, tokenIndex);
    if (connector) {
      segments.push(connector.segment);
      cursor = connector.end;
      continue;
    }
    const model = findModelAt(content2, tokenIndex, models);
    if (model) {
      segments.push(model.segment);
      cursor = model.end;
      continue;
    }
    const fileMention = fileMentionByStart.get(tokenIndex);
    if (fileMention?.path) {
      segments.push({
        type: "file",
        key: `file-${tokenIndex}-${fileMention.path}`,
        path: fileMention.path,
        name: basename(fileMention.path),
        kind: mentionKindFromPath(fileMention.path),
      });
      cursor = fileMention.end;
      continue;
    }
    pushText(segments, content2, tokenIndex, tokenIndex + 1);
    cursor = tokenIndex + 1;
  }
  pushText(segments, content2, cursor, content2.length);
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

function TokenIcon({ thumbUrl, children: children2 }) {
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
        children2
      )}
    </span>
  );
}

function FileSegment({ segment }) {
  const gatewayUrl2 = useGatewayUrl();
  const thumbUrl = buildMediaThumbUrl(gatewayUrl2, segment.kind, segment.path);
  return (
    <span
      className={`hl-mention-file ${FILE_TOKEN_CLASS}`}
      data-mention-kind={segment.kind}
      data-mention-name={segment.name}
    >
      <TokenIcon thumbUrl={thumbUrl}>
        {segment.kind === "image" ||
        segment.kind === "video" ||
        segment.kind === "audio" ? (
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
      @{segment.name}
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
    if (segment.type === "text")
      return <span key={segment.key}>{segment.text}</span>;
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
            color:
              "color-mix(in srgb, var(--foreground) 80%, var(--brand-accent) 20%)",
          }}
        >
          /{segment.name}
        </span>
      );
    }
    if (segment.type === "model")
      return <ModelSegment key={segment.key} segment={segment} />;
    if (segment.type === "connector") {
      return <ConnectorSegment key={segment.key} segment={segment} />;
    }
    return <FileSegment key={segment.key} segment={segment} />;
  });
}

export const RichUserPromptContent = reactExports.memo(
  function RichUserPromptContent2({
    content: content2,
    collapsible = false,
    className,
  }) {
    const { t: t2 } = useTranslation();
    const isPresented = useChatPresentation();
    const { data: mentionModels = [] } = useMentionModels();
    const segments = reactExports.useMemo(
      () => redactRichSegments(parseRichUserPrompt(content2, mentionModels)),
      [content2, mentionModels],
    );
    const [expanded, setExpanded] = reactExports.useState(false);
    const contentRef = reactExports.useRef(null);
    const [overflows, setOverflows] = reactExports.useState(false);
    reactExports.useLayoutEffect(() => {
      if (!collapsible || expanded || !isPresented) return;
      const el = contentRef.current;
      if (!el) return;
      const check = () => {
        if (el.scrollHeight <= 0 || el.clientHeight <= 0) return;
        setOverflows(el.scrollHeight > el.clientHeight + 1);
      };
      check();
      const ro = new ResizeObserver(check);
      ro.observe(el);
      const mo = new MutationObserver(check);
      mo.observe(el, {
        childList: true,
        characterData: true,
        subtree: true,
      });
      return () => {
        ro.disconnect();
        mo.disconnect();
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
            onClick={() => setExpanded((v2) => !v2)}
          >
            {expanded ? t2("chat.collapse") : t2("chat.expand")}
          </button>
        )}
      </>
    );
  },
);

RichUserPromptContent.displayName = "RichUserPromptContent";
