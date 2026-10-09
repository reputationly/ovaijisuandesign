// creation-guide-placeholder.jsx
import {
  ArrowUpRight,
  jsxRuntimeExports,
  usePlatform,
  useTranslation,
} from "../vendor.js";
import { getCreationGuideUrlsByLocale } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { openUrlInBuiltinBrowser } from "../workspace/resolve-retry-message-payload.jsx";

export function CreationGuidePlaceholder({
  guides,
  source,
  triggerMention,
  triggerSlash,
}) {
  const { t: t2, i18n } = useTranslation();
  const platform2 = usePlatform();
  const guideUrls = getCreationGuideUrlsByLocale(i18n.language);
  const handleGuideClick = (event, guide) => {
    event.preventDefault();
    event.stopPropagation();
    void openUrlInBuiltinBrowser(platform2, guideUrls[guide], {
      source: `${source}.${guide}-guide`,
    });
  };
  const handleGuideMouseDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const handleActionMouseDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const triggerClass2 =
    "pointer-events-auto inline-flex size-[1.5em] shrink-0 cursor-pointer items-center justify-center rounded-sm border-[0.5px] border-border bg-muted/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
  const guideLinkClass2 =
    "pointer-events-auto inline-flex cursor-pointer items-center whitespace-nowrap text-muted-foreground/70 underline decoration-current/60 underline-offset-2 transition-colors hover:text-foreground";
  return (
    <div className="min-w-0 max-w-full whitespace-normal break-words text-[length:var(--message-input-editor-font-size)] leading-[var(--text-body-14--line-height)]">
      <span>{t2("creationGuide.placeholderLead")}</span>
      {triggerMention ? (
        <>
          <button
            type="button"
            className={triggerClass2}
            onMouseDown={handleActionMouseDown}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              triggerMention();
            }}
            data-action-ui-id={`${source.replace(".", "-")}-composer-mention`}
          >
            @
          </button>{" "}
          <span>{t2("creationGuide.placeholderAtHint")}</span>
        </>
      ) : null}
      {triggerSlash ? (
        <>
          <span aria-hidden="true">{" · "}</span>
          <button
            type="button"
            className={triggerClass2}
            onMouseDown={handleActionMouseDown}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              triggerSlash();
            }}
            data-action-ui-id={`${source.replace(".", "-")}-composer-slash`}
          >
            /
          </button>{" "}
          <span>{t2("creationGuide.placeholderSlashHint")}</span>
        </>
      ) : null}
      {guides.length > 0 && (triggerMention || triggerSlash) ? (
        <span aria-hidden="true">{" · "}</span>
      ) : null}
      <span className="pointer-events-auto inline-flex items-center gap-1.5 align-baseline">
        {guides.map((guide, index2) => (
          <span key={guide} className="inline-flex items-center gap-1.5">
            {index2 > 0 ? <span aria-hidden="true">·</span> : null}
            <button
              type="button"
              className={`${guideLinkClass2} shrink-0 gap-0.5`}
              onMouseDown={handleGuideMouseDown}
              onClick={(event) => handleGuideClick(event, guide)}
              data-action-ui-id={`${source.replace(".", "-")}-composer-guide-${guide}`}
            >
              <span className="inline-flex items-center gap-0.5">
                {guide === "design"
                  ? t2("creationGuide.designGuide")
                  : t2("creationGuide.h3Guide")}
                <ArrowUpRight size={11} strokeWidth={1.8} aria-hidden="true" />
              </span>
            </button>
          </span>
        ))}
      </span>
    </div>
  );
}
