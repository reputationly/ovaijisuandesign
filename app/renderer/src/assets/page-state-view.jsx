// page-state-view.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { useTheme } from "../generation/use-model-catalog-scope-key.js";
import { Button, cn$2 as cn } from "../infra/dialog-content.jsx";
import { jsxRuntimeExports, useTranslation } from "../vendor.js";
const emptyDarkUrl =
  "" + new URL("../empty-dark-BE6TzTYo.svg", import.meta.url).href;
const emptyLightUrl =
  "" + new URL("../empty-light-BIA_9y_3.svg", import.meta.url).href;
const emptyProjectDarkUrl =
  "" + new URL("../empty-project-dark-DfthmI8z.svg", import.meta.url).href;
const emptyProjectLightUrl =
  "" + new URL("../empty-project-light-VIJs1g6w.svg", import.meta.url).href;
const errorDarkUrl =
  "" + new URL("../error-dark-DDp36kGq.svg", import.meta.url).href;
const errorLightUrl =
  "" + new URL("../error-light-WSZvGPdq.svg", import.meta.url).href;
const networkErrorDarkUrl =
  "" + new URL("../network-error-dark-DyHxJMnZ.svg", import.meta.url).href;
const networkErrorLightUrl =
  "" + new URL("../network-error-light-brwv6dty.svg", import.meta.url).href;
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
  type: type2,
  emptyReason,
  errorReason,
  className,
}) {
  const { resolved } = useTheme();
  const illustration =
    type2 === "empty" && emptyReason === "project"
      ? "empty_project_icon"
      : type2 === "error" && errorReason === "network"
        ? "network"
        : type2;
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
  state: state2,
  children: children2,
  className,
  density = "page",
}) {
  const { t: t2 } = useTranslation();
  if (state2.type === "normal") return <>{children2}</>;
  const isError = state2.type === "error";
  const errorReason = isError ? (state2.reason ?? "generic") : void 0;
  const emptyReason =
    state2.type === "empty" ? (state2.reason ?? "generic") : void 0;
  const defaultText = isError
    ? errorReason === "network"
      ? t2(
          "pageState.networkErrorText",
          "No network connection. Check your connection and try again.",
        )
      : t2("pageState.errorText", "Something went wrong. Please try again.")
    : t2("pageState.emptyText", "No content yet");
  const hasStructuredContent =
    state2.title != null || state2.description != null;
  const inlineActions = state2.actions.filter(
    (action) => action.placement !== "separate",
  );
  const separateActions = state2.actions.filter(
    (action) => action.placement === "separate",
  );
  const useEqualWidthActions = inlineActions.length === 2;
  const isCompact = density === "compact";
  const isPanel = density === "panel";
  const isSmall = isPanel || isCompact;
  const illustrationClassName = isCompact
    ? "size-16"
    : state2.type === "empty"
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
        data-action-ui-id={`page-state-${state2.type}-${action.key}`}
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
      data-state={state2.type}
      data-density={density}
      data-empty-reason={emptyReason}
      data-error-reason={errorReason}
    >
      <div
        className="flex shrink-0 items-center justify-center"
        aria-hidden="true"
        data-slot="page-state-visual"
      >
        {state2.icon ?? (
          <PageStateIllustration
            type={state2.type}
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
            {state2.title != null ? (
              <div
                className={cn(
                  isCompact
                    ? "text-xs font-normal text-muted-foreground"
                    : "font-heading font-medium text-card-foreground",
                  !isCompact && (isPanel ? "text-sm" : "text-base"),
                )}
              >
                {state2.title}
              </div>
            ) : null}
            {state2.description != null ? (
              <div
                className={cn(
                  "text-muted-foreground",
                  isSmall ? "text-xs" : "text-sm",
                )}
              >
                {state2.description}
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
            {state2.text ?? defaultText}
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
      {state2.type === "empty" && !isCompact ? (
        <div
          className="h-6 w-full shrink-0"
          aria-hidden="true"
          data-slot="page-state-bottom-offset"
        />
      ) : null}
    </div>
  );
}
