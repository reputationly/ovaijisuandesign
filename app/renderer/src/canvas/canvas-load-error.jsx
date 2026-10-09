// canvas-load-error.jsx
import { MonochromeIcon, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { CloudOff } from "../media-editing/package.jsx";
import { Button } from "./node-shell-inner.jsx";
import { RetryIcon } from "./fullscreen-icon.jsx";
const INITIAL_DESCRIPTION_KEYS = {
  unavailable: "canvas.loadError.unavailableDescription",
  access: "canvas.loadError.accessDescription",
  "invalid-response": "canvas.loadError.invalidResponseDescription",
  unknown: "canvas.loadError.unknownDescription",
};
export function CanvasLoadError({ failure, retrying, onRetry }) {
  const { t: t2 } = useTranslation();
  const retryButton = (
    <Button
      type="button"
      size="sm"
      variant={failure.phase === "initial" ? "default" : "outline"}
      loading={retrying}
      disabled={retrying}
      onClick={onRetry}
      data-action-ui-id="canvas.load-error-retry"
      className="rounded-md"
    >
      {!retrying && <RetryIcon size={16} />}
      {retrying
        ? t2("canvas.loadError.retrying")
        : t2("canvas.loadError.retry")}
    </Button>
  );
  if (failure.phase === "refresh") {
    return (
      <div className="pointer-events-none absolute inset-x-3 top-3 z-40 flex justify-center">
        <div
          data-action-ui-id="canvas.load-error-banner"
          role="status"
          aria-live="polite"
          aria-busy={retrying}
          className="pointer-events-auto flex max-w-xl items-center gap-3 rounded-lg border border-border bg-popover/95 px-3 py-2 text-popover-foreground shadow-sm backdrop-blur-sm"
        >
          <MonochromeIcon tone="muted">
            <CloudOff className="size-4 shrink-0" aria-hidden="true" />
          </MonochromeIcon>
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {retrying
                ? t2("canvas.loadError.refreshRetryingTitle")
                : t2("canvas.loadError.refreshTitle")}
            </span>{" "}
            {t2("canvas.loadError.refreshDescription")}
          </p>
          {retryButton}
        </div>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/95 p-6 backdrop-blur-sm">
      <section
        data-action-ui-id="canvas.load-error-card"
        role="alert"
        aria-busy={retrying}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <MonochromeIcon tone="muted">
              <CloudOff className="size-4" aria-hidden="true" />
            </MonochromeIcon>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-medium text-foreground">
              {retrying
                ? t2("canvas.loadError.initialRetryingTitle")
                : t2("canvas.loadError.initialTitle")}
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {retrying
                ? t2("canvas.loadError.retryingDescription")
                : t2(INITIAL_DESCRIPTION_KEYS[failure.kind])}
            </p>
            <div className="mt-4">{retryButton}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
