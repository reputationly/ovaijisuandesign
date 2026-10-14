// page-state-boundary.jsx
import { useTranslation } from "react-i18next";
import { __jsx } from "../shared/jsx-runtime.js";
import { PageStateView } from "./page-state-view.jsx";
import { useOnline } from "../infra/use-online.jsx";

const DEFAULT_RETRY_ACTION_KEY = "retry";

const DEFAULT_RETRY_ACTION_VARIANT = "default";

function resolveRetryAction(retry, defaultLabel) {
  if (!retry) return void 0;
  if (typeof retry === "function") {
    return {
      key: DEFAULT_RETRY_ACTION_KEY,
      label: defaultLabel,
      variant: DEFAULT_RETRY_ACTION_VARIANT,
      onClick: retry,
    };
  }
  return {
    key: retry.key ?? DEFAULT_RETRY_ACTION_KEY,
    icon: retry.icon,
    label: retry.label ?? defaultLabel,
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
  empty = false,
  errorOptions,
  emptyOptions,
  children,
  className,
  density = "page",
}) {
  const { t: translate } = useTranslation();
  const online = useOnline();
  let input = {
    type: "normal",
  };
  if (error) {
    input = {
      type: "error",
      ...errorOptions,
    };
  } else if (empty) {
    input = {
      type: "empty",
      ...emptyOptions,
    };
  }
  const state = resolvePageState(input, translate("common.retry"), online);
  return (
    <PageStateView state={state} className={className} density={density}>
      {children}
    </PageStateView>
  );
}
