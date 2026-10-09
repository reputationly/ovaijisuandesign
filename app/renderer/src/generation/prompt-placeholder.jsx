// prompt-placeholder.jsx
import { ArrowUpRight, jsxRuntimeExports, reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";

const textClass =
  "text-[length:calc(var(--canvas-prompt-font-size,16)*1px)] leading-[1.5] font-normal tracking-normal";

const defaultTextClass = "text-muted-foreground/50";

const triggerClass =
  "pointer-events-auto inline-flex size-[1.5em] shrink-0 cursor-pointer items-center justify-center rounded-sm border-[0.5px] border-border bg-muted/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

const guideLinkClass =
  "pointer-events-auto inline-flex cursor-pointer items-center gap-0.5 whitespace-nowrap text-muted-foreground/70 underline decoration-current/60 underline-offset-2 transition-colors hover:text-foreground";

export function PromptPlaceholder({
  description,
  atPrefix,
  atSuffix,
  onAtClick,
  guide,
}) {
  return (
    <div
      className={`min-w-0 max-w-full whitespace-normal break-words ${textClass}`}
    >
      <span className={defaultTextClass}>{description}</span>
      <span className={defaultTextClass}>{atPrefix}</span>
      <button
        type="button"
        className={triggerClass}
        data-action-ui-id="canvas-prompt-mention-trigger"
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onAtClick();
        }}
      >
        @
      </button>
      <span className={defaultTextClass}>{atSuffix}</span>
      {guide ? (
        <>
          <span className={defaultTextClass}>{guide.prefix}</span>
          <button
            type="button"
            className={guideLinkClass}
            data-action-ui-id="canvas-prompt-h3-guide"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              guide.onClick();
            }}
          >
            {guide.label}
            <ArrowUpRight size={11} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </>
      ) : null}
    </div>
  );
}

export function useAttachmentReplacement(attachmentState, editorRef) {
  const replaceAttachment = reactExports.useCallback(
    async (item) => {
      const replacement = await attachmentState.replacePath(item);
      if (!replacement) return;
      if (replacement.kind === "file") return;
      editorRef.current?.commands.replaceCanvasFileRefsByPath(item.path, {
        path: replacement.path,
        filename: replacement.name,
        kind: replacement.kind,
      });
    },
    [attachmentState, editorRef],
  );
  return {
    replaceAttachment,
  };
}

export function useMediaFileRefSwitch(attachmentState) {
  return reactExports.useCallback(
    (meta2, assetId, sourceNodeId) => {
      const kind = meta2.type;
      if (kind !== "image" && kind !== "video" && kind !== "audio") return;
      attachmentState.addPaths(
        [
          {
            path: meta2.path,
            sourceNodeId: sourceNodeId ?? assetId,
          },
        ],
        kind,
      );
    },
    [attachmentState],
  );
}
