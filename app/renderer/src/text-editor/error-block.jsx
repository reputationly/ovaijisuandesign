// error-block.jsx
import {
  AlertCircle,
  ChevronDown,
  CompositedSvg,
  reactExports,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ExpandableText } from "./expandable-text.jsx";

export function ErrorBlock({
  title,
  statusSuffix,
  detail,
  actions,
  Icon: Icon2 = AlertCircle,
  icon,
  iconSize = 20,
  iconStrokeWidth = 1.5,
  iconContainerClassName = "size-5 text-destructive/50",
  defaultExpanded = false,
  compact = false,
}) {
  const [expanded, setExpanded] = reactExports.useState(defaultExpanded);
  const hasBody = !!detail || !!actions;
  if (compact) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-1.5">
          <span
            className={`flex shrink-0 items-center justify-center ${iconContainerClassName}`}
          >
            <Icon2 size={iconSize} strokeWidth={iconStrokeWidth} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex w-full items-center gap-1 text-left">
              <span
                data-error-title={true}
                className="truncate text-body-14 font-normal text-foreground/60"
              >
                {title}
              </span>
              {statusSuffix && (
                <span
                  data-error-suffix={true}
                  className="truncate text-body-14 text-destructive/50"
                >
                  {statusSuffix}
                </span>
              )}
            </div>
            {detail && (
              <div className="text-body-14 text-muted-foreground">
                {typeof detail === "string" ? (
                  <ExpandableText lineClamp={8}>{detail}</ExpandableText>
                ) : (
                  <div className="break-words whitespace-pre-wrap">
                    {detail}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {actions && (
          <div
            data-error-actions={true}
            className="flex shrink-0 flex-wrap items-center gap-2"
          >
            {actions}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="min-w-0 flex flex-col">
      <button
        type="button"
        className="flex items-center gap-2 w-full text-left cursor-pointer"
        onClick={() => setExpanded((v2) => !v2)}
        aria-expanded={expanded}
        disabled={!hasBody}
      >
        <span
          className={`flex shrink-0 items-center justify-center ${iconContainerClassName}`}
        >
          {icon ?? <Icon2 size={iconSize} strokeWidth={iconStrokeWidth} />}
        </span>
        <div className="min-w-0 text-body-14 flex items-center gap-1">
          <span
            data-error-title={true}
            className="text-foreground/60 font-normal truncate"
          >
            {title}
          </span>
          {statusSuffix && (
            <span
              data-error-suffix={true}
              className="text-destructive/50 truncate"
            >
              {statusSuffix}
            </span>
          )}
          {hasBody && (
            <ChevronDown
              size={16}
              strokeWidth={1.5}
              className={`shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`}
            />
          )}
        </div>
      </button>
      {hasBody && (
        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="overflow-hidden min-h-0">
            <div className="flex items-start gap-1 w-full min-w-0 pt-2">
              <span className="shrink-0 size-6 flex items-center justify-center text-tertiary">
                <CompositedSvg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="text-current"
                >
                  <path
                    d="M10 0V10C10 11.1046 10.8954 12 12 12H22"
                    stroke="currentColor"
                  />
                </CompositedSvg>
              </span>
              <div className="flex-1 min-w-0 flex flex-col gap-2 text-body-14 text-muted-foreground">
                {detail &&
                  (typeof detail === "string" ? (
                    <ExpandableText lineClamp={8}>{detail}</ExpandableText>
                  ) : (
                    <div className="break-words whitespace-pre-wrap">
                      {detail}
                    </div>
                  ))}
                {actions && (
                  <div
                    data-error-actions={true}
                    className="flex flex-wrap items-center gap-2"
                  >
                    {actions}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
