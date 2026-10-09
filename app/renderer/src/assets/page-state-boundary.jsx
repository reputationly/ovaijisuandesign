// page-state-boundary.jsx
import { useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { PageStateView } from "./page-state-view.jsx";
import { useOnline } from "../infra/use-online.jsx";

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
    ? [
        retryAction,
        ...(input.actions ?? []).filter(
          (action) => action.key !== retryAction.key,
        ),
      ]
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
