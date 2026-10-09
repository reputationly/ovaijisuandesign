// shared/page-state-boundary.jsx
import { jsxRuntimeExports, useTranslation } from "../vendor.js";
import { BASE, readEnvelope$1, ILLUSTRATION_URLS } from "./check-cloud-asset-upload.js";
import { useTheme } from "../generation/use-resizable-width.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { jsonInit, useOnline } from "../infra/use-online.jsx";
import { Button$1, cn$2 } from "../infra/use-browser-overlay-dialog-props.jsx";
export async function createEntityFromPaths(fetcher, input) {
  const res = await fetcher(`${BASE}/entities-from-paths`, {
    ...jsonInit("POST", input),
    // Larger files (videos / audio) can take seconds to copy disk-to-disk
    // server-side; 5 minutes is generous and matches the migrate cap.
    timeoutMs: 3e5,
  });
  return readEnvelope$1(res, "entity", "created entity from paths");
}
const KEY_PREFIX$1 = "assetCenter.errors.";
const ASSET_CENTER_ERROR_UNKNOWN_KEY = `${KEY_PREFIX$1}unknown`;
const KEY_ENTRIES = {
  // resource not found (404)
  entity_not_found: `${KEY_PREFIX$1}entityNotFound`,
  attachment_not_found: `${KEY_PREFIX$1}attachmentNotFound`,
  suggestion_not_found: `${KEY_PREFIX$1}suggestionNotFound`,
  // attachment / upload validation (400)
  attachment_format_unsupported: `${KEY_PREFIX$1}attachmentFormatUnsupported`,
  attachment_count_exceeded: `${KEY_PREFIX$1}attachmentCountExceeded`,
  attachment_kind_uninferred: `${KEY_PREFIX$1}attachmentKindUninferred`,
  attachment_file_missing: `${KEY_PREFIX$1}attachmentFileMissing`,
  attachment_filename_invalid: `${KEY_PREFIX$1}attachmentFilenameInvalid`,
  blob_path_invalid: `${KEY_PREFIX$1}blobPathInvalid`,
  file_too_large: `${KEY_PREFIX$1}fileTooLarge`,
  // import / export (400 / 409)
  import_invalid_zip: `${KEY_PREFIX$1}importInvalidZip`,
  import_manifest_invalid: `${KEY_PREFIX$1}importManifestInvalid`,
  import_version_unsupported: `${KEY_PREFIX$1}importVersionUnsupported`,
  import_entity_conflict: `${KEY_PREFIX$1}importEntityConflict`,
  export_no_attachments: `${KEY_PREFIX$1}exportNoAttachments`,
  // suggestions (400)
  suggestion_not_pending: `${KEY_PREFIX$1}suggestionNotPending`,
  // generic request validation (400)
  invalid_request: `${KEY_PREFIX$1}invalidRequest`,
  // infra (500 / 503)
  asset_center_unavailable: `${KEY_PREFIX$1}assetCenterUnavailable`,
  internal_error: `${KEY_PREFIX$1}internalError`,
};
const ASSET_CENTER_ERROR_KEYS = KEY_ENTRIES;
export function resolveAssetCenterErrorKey(code2) {
  if (!code2) return ASSET_CENTER_ERROR_UNKNOWN_KEY;
  return ASSET_CENTER_ERROR_KEYS[code2] ?? ASSET_CENTER_ERROR_UNKNOWN_KEY;
}
function translateAssetCenterError(code2, t2) {
  return t2(resolveAssetCenterErrorKey(code2));
}
function classifyInfraError(err) {
  if (err.name === "GatewayNotReadyError") return "assetCenter.errors.gatewayNotReady";
  if (err.name === "AbortError" || /timeout|aborted/i.test(err.message)) {
    return "assetCenter.errors.timeout";
  }
  if (err.name === "TypeError" && /failed to fetch|network/i.test(err.message)) {
    return "assetCenter.errors.network";
  }
  return void 0;
}
export function formatAssetCenterError(err, t2) {
  if (err instanceof Error && err.name === "AssetCenterApiError" && "code" in err) {
    return translateAssetCenterError(err.code, t2);
  }
  if (err instanceof Error) {
    const infraKey = classifyInfraError(err);
    if (infraKey) return t2(infraKey);
  }
  return t2(ASSET_CENTER_ERROR_UNKNOWN_KEY);
}
function PageStateIllustration({ type: type2, emptyReason, errorReason, className }) {
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
      className={cn$2("size-40 max-w-full object-contain", className)}
      aria-hidden="true"
      draggable={false}
      data-page-state-illustration={illustration}
      data-theme={resolved}
    />
  );
}
export function PageStateView({ state: state2, children: children2, className, density = "page" }) {
  const { t: t2 } = useTranslation();
  if (state2.type === "normal") return <>{children2}</>;
  const isError = state2.type === "error";
  const errorReason = isError ? (state2.reason ?? "generic") : void 0;
  const emptyReason = state2.type === "empty" ? (state2.reason ?? "generic") : void 0;
  const defaultText = isError
    ? errorReason === "network"
      ? t2(
          "pageState.networkErrorText",
          "No network connection. Check your connection and try again.",
        )
      : t2("pageState.errorText", "Something went wrong. Please try again.")
    : t2("pageState.emptyText", "No content yet");
  const hasStructuredContent = state2.title != null || state2.description != null;
  const inlineActions = state2.actions.filter((action) => action.placement !== "separate");
  const separateActions = state2.actions.filter((action) => action.placement === "separate");
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
      <Button$1
        key={action.key}
        variant={isSeparate ? "link" : action.variant}
        disabled={action.disabled}
        loading={action.loading}
        onClick={action.onClick}
        className={cn$2(
          isSeparate
            ? "min-w-0 max-w-full h-auto min-h-0 rounded-none px-0 py-0 whitespace-normal text-muted-foreground"
            : "min-w-24 max-w-60 rounded-md px-3 h-auto min-h-8 whitespace-normal break-words text-center leading-4",
          !isSeparate && action.icon != null ? "gap-1.5" : void 0,
          useEqualWidthActions && !isSeparate ? "flex-[1_1_0%] py-1" : void 0,
          isSeparate ? "underline underline-offset-4 hover:text-foreground" : void 0,
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
      </Button$1>
    );
  };
  return (
    <div
      className={cn$2(
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
        className={cn$2(
          "mt-2 flex w-full flex-col items-center gap-1",
          isSmall ? "max-w-xs" : "max-w-md",
        )}
        data-slot="page-state-copy"
      >
        {hasStructuredContent ? (
          <>
            {state2.title != null ? (
              <div
                className={cn$2(
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
              <div className={cn$2("text-muted-foreground", isSmall ? "text-xs" : "text-sm")}>
                {state2.description}
              </div>
            ) : null}
          </>
        ) : (
          <div
            className={cn$2("text-muted-foreground", isCompact ? "text-xs font-normal" : "text-sm")}
          >
            {state2.text ?? defaultText}
          </div>
        )}
      </div>
      {inlineActions.length > 0 ? (
        <div
          className={cn$2(
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
          className={cn$2(
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
const DEFAULT_RETRY_ACTION_KEY = "retry";
const DEFAULT_RETRY_ACTION_VARIANT = "default";
function resolveRetryAction(retry, defaultLabel2) {
  if (!retry) return void 0;
  if (typeof retry === "function") {
    return {
      key: DEFAULT_RETRY_ACTION_KEY,
      label: defaultLabel2,
      variant: DEFAULT_RETRY_ACTION_VARIANT,
      onClick: retry,
    };
  }
  return {
    key: retry.key ?? DEFAULT_RETRY_ACTION_KEY,
    icon: retry.icon,
    label: retry.label ?? defaultLabel2,
    variant: retry.variant ?? DEFAULT_RETRY_ACTION_VARIANT,
    onClick: retry.onClick,
    placement: retry.placement,
    disabled: retry.disabled,
    loading: retry.loading,
  };
}
function resolvePageState(input, defaultRetryLabel, online = true) {
  if (input.type === "normal")
    return {
      type: "normal",
    };
  const retryAction = resolveRetryAction(input.retry, defaultRetryLabel);
  const actions = retryAction
    ? [retryAction, ...(input.actions ?? []).filter((action) => action.key !== retryAction.key)]
    : [...(input.actions ?? [])];
  const presentation = {
    icon: input.icon,
    title: input.title,
    description: input.description,
    text: input.text,
    actions,
  };
  if (input.type === "error") {
    return {
      type: "error",
      reason: input.reason ?? (online ? "generic" : "network"),
      ...presentation,
    };
  }
  return {
    type: "empty",
    reason: input.reason ?? "generic",
    ...presentation,
  };
}
export function PageStateBoundary({
  error = false,
  empty: empty2 = false,
  errorOptions,
  emptyOptions: emptyOptions2,
  children: children2,
  className,
  density = "page",
}) {
  const { t: t2 } = useTranslation();
  const online = useOnline();
  let input = {
    type: "normal",
  };
  if (error) {
    input = {
      type: "error",
      ...errorOptions,
    };
  } else if (empty2) {
    input = {
      type: "empty",
      ...emptyOptions2,
    };
  }
  const state2 = resolvePageState(input, t2("common.retry"), online);
  return (
    <PageStateView state={state2} className={className} density={density}>
      {children2}
    </PageStateView>
  );
}
