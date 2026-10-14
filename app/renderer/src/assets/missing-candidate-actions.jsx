// missing-candidate-actions.jsx
import { useTranslation } from "react-i18next";
import { Check, X$7 as CloseIcon } from "../media-editing/lucide-icon-wraps.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button, mergeTailwindClasses as cn } from "../infra/dialog-content.jsx";
import { LocalFolderIcon } from "../workspace/home-service.jsx";
export function MissingCandidateActions({
  candidate,
  onMerge,
  onRemove,
  onLocate,
  variant,
  busy,
}) {
  const { t: translate } = useTranslation();
  const stop = (cb) => (clickEvent) => {
    clickEvent.stopPropagation();
    clickEvent.preventDefault();
    cb();
  };
  if (variant === "grid") {
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: action strip swallows clicks for parent select
      // biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation is event-isolating, not interactive; buttons inside handle their own keyboard events
      <div
        className="flex flex-col gap-1 w-full px-1"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        {candidate && (
          <p
            className="text-[9px] text-foreground/30 truncate text-center"
            title={candidate.path}
          >
            {translate("missing.candidateFound", {
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
              title={translate("missing.merge")}
              aria-label={translate("missing.merge")}
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
              title={translate("missing.locate")}
              aria-label={translate("missing.locate")}
            >
              <LocalFolderIcon className="size-3.5" />
            </Button>
          )}
          <Button
            size="icon-xs"
            variant="destructive"
            data-action-ui-id="missing-remove"
            disabled={busy}
            onClick={stop(onRemove)}
            title={translate("missing.remove")}
            aria-label={translate("missing.remove")}
          >
            <CloseIcon />
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
      onClick={(clickEvent) => clickEvent.stopPropagation()}
    >
      {candidate ? (
        <Button
          size="icon-xs"
          variant="ghost"
          data-action-ui-id="missing-merge"
          disabled={busy}
          onClick={stop(onMerge)}
          title={translate("missing.mergeWithPath", {
            path: candidate.path,
          })}
          aria-label={translate("missing.merge")}
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
          title={translate("missing.locate")}
          aria-label={translate("missing.locate")}
        >
          <LocalFolderIcon className="size-3.5" />
        </Button>
      )}
      <Button
        size="icon-xs"
        variant="ghost"
        data-action-ui-id="missing-remove"
        disabled={busy}
        onClick={stop(onRemove)}
        title={translate("missing.remove")}
        aria-label={translate("missing.remove")}
      >
        <CloseIcon />
      </Button>
    </div>
  );
}
