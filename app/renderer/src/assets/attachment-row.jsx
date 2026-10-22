// attachment-row.jsx
import { API_PATHS } from "../infra/workspace-gateway.js";
import reactExports from "react";
import { MediaReveal } from "../media-editing/media-reveal-generation.js";
import { useTranslation } from "react-i18next";
import { classifyFileType } from "../infra/file-type.js";
import { Loader2, Plus } from "../media-editing/lucide-icon-wraps.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import { useGatewayUrl } from "../generation/use-model-catalog-scope-key.js";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { Expand } from "../media-editing/package.jsx";
import { TooltipContent } from "../infra/dialog-content.jsx";
import { AddToChatIcon } from "../canvas/fullscreen-icon.jsx";
import { Badge } from "../infra/badge-variants.jsx";
import { useEntityCanvas } from "./use-materialize-entity.js";
import { AttachmentKindIcon as AttachmentKindIcon$1 } from "./attachment-kind-icon.jsx";
function formatRelativeTime(timestamp, locale) {
  const diff = Date.now() - timestamp;
  if (Number.isNaN(diff) || diff < 0) {
    return new Date(timestamp).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });
  }
  const rtf = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
  });
  const minutes = Math.floor(diff / 6e4);
  if (minutes < 1) return rtf.format(0, "minute");
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 7) return rtf.format(-days, "day");
  return new Date(timestamp).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}
function isPreviewableKind(kind) {
  return (
    kind === "image" || kind === "video" || kind === "audio" || kind === "text"
  );
}
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function AttachmentPreviewThumb({ attachment }) {
  const gatewayUrl = useGatewayUrl();
  const [errored, setErrored] = reactExports.useState(false);
  const blobSrc = gatewayUrl(
    API_PATHS.assetCenterAttachmentBlob(attachment.id, attachment.kind === "video" ? 512 : void 0),
  );
  if ((attachment.kind === "image" || attachment.kind === "video") && blobSrc && !errored) {
    return (
      <span className="flex-shrink-0 w-10 h-10 bg-muted overflow-hidden rounded-[4px] flex items-center justify-center">
        {/* 4.0.3：换成 MediaReveal；只有图片出 LQIP 占位（视频不出，避免多打缩略图） */}
        <MediaReveal
          src={blobSrc}
          alt=""
          lqip={attachment.kind === "image" ? "auto" : false}
          loading="lazy"
          className="h-full w-full"
          onFailure={() => setErrored(true)}
        />
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 w-10 h-10 bg-muted overflow-hidden rounded-[4px] flex items-center justify-center text-muted-foreground">
      <AttachmentKindIcon$1 kind={attachment.kind} />
    </span>
  );
}
function AttachmentRow({ attachment, onPreview, onAddToCanvas, onAddToChat }) {
  const { t: translate } = useTranslation();
  if (!onPreview) {
    return (
      <li className="flex items-center gap-2 py-1 px-1">
        <AttachmentPreviewThumb attachment={attachment} />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[11px] text-foreground truncate">
            {attachment.originalFilename}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatBytes(attachment.byteSize)}
          </span>
        </div>
      </li>
    );
  }
  const clickable = isPreviewableKind(attachment.kind);
  return (
    <li
      role={clickable ? "button" : void 0}
      tabIndex={clickable ? 0 : void 0}
      className={`group/att flex items-center gap-2 py-1 pl-0 pr-1 transition-colors ${clickable ? "cursor-pointer hover:bg-muted/50" : "hover:bg-muted/50"}`}
      onClick={clickable ? () => onPreview(attachment) : void 0}
      onKeyDown={
        clickable
          ? (keyboardEvent) => {
              if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                keyboardEvent.preventDefault();
                onPreview(attachment);
              }
            }
          : void 0
      }
    >
      <span className="relative flex-shrink-0">
        <AttachmentPreviewThumb attachment={attachment} />
        {clickable && (
          <span className="absolute inset-0 flex items-center justify-center rounded-[4px] bg-black/40 opacity-0 group-hover/att:opacity-100 transition-opacity">
            <Expand size={12} className="text-white" />
          </span>
        )}
      </span>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[11px] text-foreground truncate">
          {attachment.originalFilename}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {formatBytes(attachment.byteSize)}
        </span>
      </div>
      {(onAddToCanvas || onAddToChat) && (
        <TooltipProvider delay={300}>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {onAddToCanvas && (
              <Tooltip>
                <TooltipTrigger
                  className="size-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    onAddToCanvas(attachment);
                  }}
                >
                  <Plus size={12} />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {translate("assetSidebarPanel.addToCanvas")}
                </TooltipContent>
              </Tooltip>
            )}
            {onAddToChat && (
              <Tooltip>
                <TooltipTrigger
                  className="size-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    onAddToChat(attachment);
                  }}
                >
                  <AddToChatIcon size={12} />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {translate("assetSidebarPanel.addToChat")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      )}
    </li>
  );
}
export function EntityHoverCardBody({
  entityId,
  onPreview,
  onAddToCanvas,
  onAddToChat,
}) {
  const { t: translate, i18n } = useTranslation();
  const entityQuery = useEntityCanvas(entityId);
  const entity = entityQuery.data;
  if (entityQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (entityQuery.error || !entity) {
    return (
      <div className="px-3 py-4 text-xs text-destructive">
        {entityQuery.error?.message ?? translate("common.error")}
      </div>
    );
  }
  const attachments = entity.attachments ?? [];
  return (
    <div className="flex flex-col gap-1.5 p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-foreground line-clamp-2">
          {entity.name}
        </span>
        <Badge variant="secondary" className="shrink-0">
          {translate(`assetCenter.types.${entity.type}`)}
        </Badge>
      </div>
      {entity.description && (
        <p className="text-[11px] text-muted-foreground line-clamp-3">
          {entity.description}
        </p>
      )}
      {attachments.length > 0 && (
        <ul className="flex flex-col gap-1 max-h-[12rem] overflow-y-auto">
          {attachments.map((att) => (
            <AttachmentRow
              key={att.id}
              attachment={att}
              onPreview={onPreview}
              onAddToCanvas={onAddToCanvas}
              onAddToChat={onAddToChat}
            />
          ))}
        </ul>
      )}
      {attachments.length === 0 && (
        <span className="text-[11px] text-muted-foreground">
          {translate("assetSidebarPanel.noAttachments")}
        </span>
      )}
      <p className="flex items-center text-[10px] text-muted-foreground -mb-1">
        {translate("assetCenter.entityList.updatedAt", {
          when: formatRelativeTime(entity.updatedAt, i18n.language),
        })}
        {" · "}
        {translate("assetCenter.useCount", {
          count: entity.useCount,
        })}
      </p>
    </div>
  );
}
