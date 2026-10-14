// parse-page-state-preview-schema.js
import reactExports from "react";
import { X$7 as X } from "../media-editing/lucide-icon-wraps.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { RetryIcon } from "../workspace/use-prompt-icon.jsx";
import { FeedbackIcon } from "../workspace/home-service.jsx";
const ACTION_VARIANTS = [
  "default",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "link",
];
const ACTION_PLACEMENTS = ["inline", "separate"];
const ACTION_ICONS = {
  x: X,
};
const ACTION_ICON_KEYS = ["feedback", "message-square-text", "refresh-cw", "x"];
function isRecord(value) {
  return typeof value === "object" && value != null && !Array.isArray(value);
}
function isActionVariant(value) {
  return ACTION_VARIANTS.some((variant) => variant === value);
}
function isActionIcon(value) {
  return typeof value === "string" && ACTION_ICON_KEYS.includes(value);
}
function invalid(error) {
  return {
    state: null,
    error,
  };
}
export function parsePageStatePreviewSchema(source) {
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    return invalid("Invalid JSON. The last valid preview is still shown.");
  }
  if (!isRecord(parsed)) return invalid("Schema must be a JSON object.");
  if (
    parsed.type !== "normal" &&
    parsed.type !== "empty" &&
    parsed.type !== "error"
  ) {
    return invalid('"type" must be "normal", "empty", or "error".');
  }
  if (parsed.type === "normal")
    return {
      state: {
        type: "normal",
      },
      error: null,
    };
  for (const field of ["title", "description", "text"]) {
    if (parsed[field] != null && typeof parsed[field] !== "string") {
      return invalid(`"${field}" must be a string.`);
    }
  }
  const rawActions = parsed.actions ?? [];
  if (!Array.isArray(rawActions)) return invalid('"actions" must be an array.');
  const actionKeys = new Set();
  const actions = [];
  for (const [index, rawAction] of rawActions.entries()) {
    if (!isRecord(rawAction))
      return invalid(`actions[${index}] must be an object.`);
    const key = rawAction.key;
    const label = rawAction.label;
    const variant = rawAction.variant ?? "default";
    const placement = rawAction.placement ?? "inline";
    if (typeof key !== "string" || key.trim() === "") {
      return invalid(`actions[${index}].key must be a non-empty string.`);
    }
    if (actionKeys.has(key))
      return invalid(`Action key "${key}" must be unique.`);
    if (typeof label !== "string" || label.trim() === "") {
      return invalid(`actions[${index}].label must be a non-empty string.`);
    }
    if (!isActionVariant(variant)) {
      return invalid(
        `actions[${index}].variant must be one of: ${ACTION_VARIANTS.join(", ")}.`,
      );
    }
    if (
      typeof placement !== "string" ||
      !ACTION_PLACEMENTS.includes(placement)
    ) {
      return invalid(
        `actions[${index}].placement must be one of: ${ACTION_PLACEMENTS.join(", ")}.`,
      );
    }
    if (rawAction.icon != null && !isActionIcon(rawAction.icon)) {
      return invalid(
        `actions[${index}].icon must be one of: ${ACTION_ICON_KEYS.join(", ")}.`,
      );
    }
    if (rawAction.disabled != null && typeof rawAction.disabled !== "boolean") {
      return invalid(`actions[${index}].disabled must be a boolean.`);
    }
    if (rawAction.loading != null && typeof rawAction.loading !== "boolean") {
      return invalid(`actions[${index}].loading must be a boolean.`);
    }
    const actionIcon =
      rawAction.icon == null
        ? void 0
        : rawAction.icon === "refresh-cw"
          ? reactExports.createElement(RetryIcon, {
              size: 14,
              "aria-hidden": true,
            })
          : rawAction.icon === "feedback" ||
              rawAction.icon === "message-square-text"
            ? reactExports.createElement(FeedbackIcon, {
                size: 14,
                "aria-hidden": true,
              })
            : reactExports.createElement(Icon, {
                icon: ACTION_ICONS[rawAction.icon],
                size: "sm",
                "aria-hidden": true,
              });
    actionKeys.add(key);
    actions.push({
      key,
      icon: actionIcon,
      label,
      variant,
      placement,
      disabled: rawAction.disabled === true,
      loading: rawAction.loading === true,
      onClick: () => void 0,
    });
  }
  const presentation = {
    title: typeof parsed.title === "string" ? parsed.title : void 0,
    description:
      typeof parsed.description === "string" ? parsed.description : void 0,
    text: typeof parsed.text === "string" ? parsed.text : void 0,
    actions,
  };
  if (parsed.type === "empty") {
    if (
      parsed.reason != null &&
      parsed.reason !== "generic" &&
      parsed.reason !== "project"
    ) {
      return invalid(
        'For an empty state, "reason" must be "generic" or "project".',
      );
    }
    return {
      state: {
        type: "empty",
        reason: parsed.reason === "project" ? "project" : "generic",
        ...presentation,
      },
      error: null,
    };
  }
  if (
    parsed.reason != null &&
    parsed.reason !== "generic" &&
    parsed.reason !== "network"
  ) {
    return invalid(
      'For an error state, "reason" must be "generic" or "network".',
    );
  }
  return {
    state: {
      type: "error",
      reason: parsed.reason === "network" ? "network" : "generic",
      ...presentation,
    },
    error: null,
  };
}
