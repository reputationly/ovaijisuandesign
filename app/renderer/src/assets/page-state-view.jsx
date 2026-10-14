// page-state-view.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { useTheme } from "../generation/use-model-catalog-scope-key.js";
import { Button, mergeTailwindClasses as cn } from "../infra/dialog-content.jsx";
import { jsxRuntimeExports, useTranslation } from "../vendor.js";
const emptyDarkUrl =
  "" + new URL("../empty-dark.svg", import.meta.url).href;
const emptyLightUrl =
  "" + new URL("../empty-light.svg", import.meta.url).href;
const emptyProjectDarkUrl =
  "" + new URL("../empty-project-dark.svg", import.meta.url).href;
const emptyProjectLightUrl =
  "" + new URL("../empty-project-light.svg", import.meta.url).href;
const errorDarkUrl =
  "" + new URL("../error-dark.svg", import.meta.url).href;
const errorLightUrl =
  "" + new URL("../error-light.svg", import.meta.url).href;
const networkErrorDarkUrl =
  "" + new URL("../network-error-dark.svg", import.meta.url).href;
const networkErrorLightUrl =
  "" + new URL("../network-error-light.svg", import.meta.url).href;
const ILLUSTRATION_URLS = {
  empty: {
    light: emptyLightUrl,
    dark: emptyDarkUrl,
  },
  empty_project_icon: {
    light: emptyProjectLightUrl,
    dark: emptyProjectDarkUrl,
  },
  error: {
    light: errorLightUrl,
    dark: errorDarkUrl,
  },
  network: {
    light: networkErrorLightUrl,
    dark: networkErrorDarkUrl,
  },
};
function PageStateIllustration({
  type,
  emptyReason,
  errorReason,
  className,
}) {
  const { resolved } = useTheme();
  const illustration =
    type === "empty" && emptyReason === "project"
      ? "empty_project_icon"
      : type === "error" && errorReason === "network"
        ? "network"
        : type;
  return (
    <img
      src={ILLUSTRATION_URLS[illustration][resolved]}
      alt=""
      className={cn("size-40 max-w-full object-contain", className)}
      aria-hidden="true"
      draggable={false}
      data-page-state-illustration={illustration}
      data-theme={resolved}
    />
  );
}
export function PageStateView({
  state,
  children,
  className,
  density = "page",
}) {
  const { t: translate } = useTranslation();
  if (state.type === "normal") return <>{children}</>;
  const isError = state.type === "error";
  const errorReason = isError ? (state.reason ?? "generic") : void 0;
  const emptyReason =
    state.type === "empty" ? (state.reason ?? "generic") : void 0;
  const defaultText = isError
    ? errorReason === "network"
      ? translate(
          "pageState.networkErrorText",
          "No network connection. Check your connection and try again.",
        )
      : translate("pageState.errorText", "Something went wrong. Please try again.")
    : translate("pageState.emptyText", "No content yet");
  const hasStructuredContent =
    state.title != null || state.description != null;
  const inlineActions = state.actions.filter(
    (action) => action.placement !== "separate",
  );
  const separateActions = state.actions.filter(
    (action) => action.placement === "separate",
  );
  const useEqualWidthActions = inlineActions.length === 2;
  const isCompact = density === "compact";
  const isPanel = density === "panel";
  const isSmall = isPanel || isCompact;
  const illustrationClassName = isCompact
    ? "size-16"
    : state.type === "empty"
      ? isPanel
        ? "size-[88px]"
        : "size-[148px]"
      : void 0;
  const renderAction = (action) => {
    const isSeparate = action.placement === "separate";
    return (
      <Button
        key={action.key}
        variant={isSeparate ? "link" : action.variant}
        disabled={action.disabled}
        loading={action.loading}
        onClick={action.onClick}
        className={cn(
          isSeparate
            ? "min-w-0 max-w-full h-auto min-h-0 rounded-none px-0 py-0 whitespace-normal text-muted-foreground"
            : "min-w-24 max-w-60 rounded-md px-3 h-auto min-h-8 whitespace-normal break-words text-center leading-4",
          !isSeparate && action.icon != null ? "gap-1.5" : void 0,
          useEqualWidthActions && !isSeparate ? "flex-[1_1_0%] py-1" : void 0,
          isSeparate
            ? "underline underline-offset-4 hover:text-foreground"
            : void 0,
        )}
        data-action-ui-id={`page-state-${state.type}-${action.key}`}
      >
        {!isSeparate && action.icon != null && !action.loading ? (
          <span
            className="flex shrink-0 items-center justify-center [&_svg]:size-3.5"
            data-icon="inline-start"
            data-slot="page-state-action-icon"
            aria-hidden="true"
          >
            {action.icon}
          </span>
        ) : null}
        <span data-slot="page-state-action-label">{action.label}</span>
      </Button>
    );
  };
  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col items-center justify-center text-center",
        isCompact ? "px-3 py-3" : isPanel ? "px-3 py-4" : "px-4 py-8",
        className,
      )}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      data-state={state.type}
      data-density={density}
      data-empty-reason={emptyReason}
      data-error-reason={errorReason}
    >
      <div
        className="flex shrink-0 items-center justify-center"
        aria-hidden="true"
        data-slot="page-state-visual"
      >
        {state.icon ?? (
          <PageStateIllustration
            type={state.type}
            emptyReason={emptyReason}
            errorReason={errorReason}
            className={illustrationClassName}
          />
        )}
      </div>
      <div
        className={cn(
          "mt-2 flex w-full flex-col items-center gap-1",
          isSmall ? "max-w-xs" : "max-w-md",
        )}
        data-slot="page-state-copy"
      >
        {hasStructuredContent ? (
          <>
            {state.title != null ? (
              <div
                className={cn(
                  isCompact
                    ? "text-xs font-normal text-muted-foreground"
                    : "font-heading font-medium text-card-foreground",
                  !isCompact && (isPanel ? "text-sm" : "text-base"),
                )}
              >
                {state.title}
              </div>
            ) : null}
            {state.description != null ? (
              <div
                className={cn(
                  "text-muted-foreground",
                  isSmall ? "text-xs" : "text-sm",
                )}
              >
                {state.description}
              </div>
            ) : null}
          </>
        ) : (
          <div
            className={cn(
              "text-muted-foreground",
              isCompact ? "text-xs font-normal" : "text-sm",
            )}
          >
            {state.text ?? defaultText}
          </div>
        )}
      </div>
      {inlineActions.length > 0 ? (
        <div
          className={cn(
            "flex flex-row flex-wrap items-center justify-center gap-2",
            isSmall ? "mt-3" : "mt-4",
            useEqualWidthActions ? "w-fit max-w-full" : void 0,
          )}
          data-slot="page-state-actions"
        >
          {inlineActions.map(renderAction)}
        </div>
      ) : null}
      {separateActions.length > 0 ? (
        <div
          className={cn(
            "flex flex-row flex-wrap items-center justify-center gap-2",
            isSmall ? "mt-3" : "mt-4",
          )}
          data-slot="page-state-separate-actions"
        >
          {separateActions.map(renderAction)}
        </div>
      ) : null}
      {state.type === "empty" && !isCompact ? (
        <div
          className="h-6 w-full shrink-0"
          aria-hidden="true"
          data-slot="page-state-bottom-offset"
        />
      ) : null}
    </div>
  );
}
