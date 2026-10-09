// sent-annotation-cards.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
const MAX_VISIBLE_CARDS = 3;
export function SentAnnotationCards({ annotations }) {
  const { t: t2 } = useTranslation();
  const [expanded, setExpanded] = reactExports.useState(false);
  if (annotations.length === 0) return null;
  const visible = expanded
    ? annotations
    : annotations.slice(0, MAX_VISIBLE_CARDS);
  const hiddenCount = annotations.length - visible.length;
  return (
    <div
      className="mt-2 w-full min-w-0 rounded-lg border border-border/60 bg-background/50 p-2 text-left"
      data-action-ui-id="chat.sent-annotations"
    >
      <div className="mb-1.5 flex items-center gap-1.5 px-1 text-caption-11 font-medium text-muted-foreground">
        <span>{t2("chat.sentAnnotations.title", "已提交批注")}</span>
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-caption-10 text-primary">
          {annotations.length}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {visible.map((annotation) => (
          <div
            key={annotation.id}
            className="rounded-md bg-muted-foreground/5 px-2 py-1.5"
            data-annotation-card-sent={annotation.id}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-caption-10 font-medium text-primary">
                {annotation.seq}
              </span>
              <div className="min-w-0 flex-1">
                {annotation.quote && (
                  <div className="truncate text-caption-11 text-muted-foreground">
                    {annotation.quote}
                  </div>
                )}
                <div className="mt-0.5 line-clamp-2 text-body-13 text-foreground">
                  {annotation.comment}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {(hiddenCount > 0 || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1.5 px-1 text-caption-11 text-muted-foreground transition-colors hover:text-foreground"
          data-action-ui-id="chat.sent-annotations-toggle"
        >
          {expanded
            ? t2("chat.collapse", "收起")
            : t2("chat.sentAnnotations.showMore", "还有 {{count}} 条", {
                count: hiddenCount,
              })}
        </button>
      )}
    </div>
  );
}
