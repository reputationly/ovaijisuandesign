// missing-candidate-actions.jsx
import { Check, useTranslation, X$7 as X } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button, cn$2 as cn } from "../infra/dialog-content.jsx";
import { LocalFolderIcon } from "../workspace/home-service.jsx";
export function MissingCandidateActions({
  candidate,
  onMerge,
  onRemove: onRemove2,
  onLocate,
  variant,
  busy,
}) {
  const { t: t2 } = useTranslation();
  const stop = (cb) => (e2) => {
    e2.stopPropagation();
    e2.preventDefault();
    cb();
  };
  if (variant === "grid") {
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: action strip swallows clicks for parent select
      // biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation is event-isolating, not interactive; buttons inside handle their own keyboard events
      <div
        className="flex flex-col gap-1 w-full px-1"
        onClick={(e2) => e2.stopPropagation()}
      >
        {candidate && (
          <p
            className="text-[9px] text-foreground/30 truncate text-center"
            title={candidate.path}
          >
            {t2("missing.candidateFound", {
              path: candidate.path,
            })}
          </p>
        )}
        <div className="flex gap-1 items-center justify-center">
          {candidate ? (
            <Button
              size="icon-xs"
              variant="outline"
              data-action-ui-id="missing-merge"
              disabled={busy}
              onClick={stop(onMerge)}
              title={t2("missing.merge")}
              aria-label={t2("missing.merge")}
            >
              <Check />
            </Button>
          ) : (
            <Button
              size="icon-xs"
              variant="outline"
              data-action-ui-id="missing-locate"
              disabled={busy}
              onClick={stop(onLocate)}
              title={t2("missing.locate")}
              aria-label={t2("missing.locate")}
            >
              <LocalFolderIcon className="size-3.5" />
            </Button>
          )}
          <Button
            size="icon-xs"
            variant="destructive"
            data-action-ui-id="missing-remove"
            disabled={busy}
            onClick={stop(onRemove2)}
            title={t2("missing.remove")}
            aria-label={t2("missing.remove")}
          >
            <X />
          </Button>
        </div>
      </div>
    );
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: action strip swallows clicks for parent select
    // biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation is event-isolating, not interactive; buttons inside handle their own keyboard events
    <div
      className={cn("flex gap-0.5 items-center shrink-0 ml-auto")}
      onClick={(e2) => e2.stopPropagation()}
    >
      {candidate ? (
        <Button
          size="icon-xs"
          variant="ghost"
          data-action-ui-id="missing-merge"
          disabled={busy}
          onClick={stop(onMerge)}
          title={t2("missing.mergeWithPath", {
            path: candidate.path,
          })}
          aria-label={t2("missing.merge")}
        >
          <Check />
        </Button>
      ) : (
        <Button
          size="icon-xs"
          variant="ghost"
          data-action-ui-id="missing-locate"
          disabled={busy}
          onClick={stop(onLocate)}
          title={t2("missing.locate")}
          aria-label={t2("missing.locate")}
        >
          <LocalFolderIcon className="size-3.5" />
        </Button>
      )}
      <Button
        size="icon-xs"
        variant="ghost"
        data-action-ui-id="missing-remove"
        disabled={busy}
        onClick={stop(onRemove2)}
        title={t2("missing.remove")}
        aria-label={t2("missing.remove")}
      >
        <X />
      </Button>
    </div>
  );
}
