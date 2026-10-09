// scenarios.jsx
import { Plus } from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { RetryIcon } from "./use-prompt-icon.jsx";
import { FeedbackIcon } from "./home-service.jsx";

const handlePreviewAction = () => void 0;

export const SCENARIOS = [
  {
    value: "empty",
    label: "Empty",
    state: {
      type: "empty",
      actions: [],
    },
  },
  {
    value: "project-empty",
    label: "Project Empty",
    state: {
      type: "empty",
      reason: "project",
      title: "No projects yet",
      description: "Create a project to get started.",
      actions: [
        {
          key: "create",
          icon: (
            <Icon icon={Plus} size="sm" strokeWidth={2} aria-hidden={true} />
          ),
          label: "Create Project",
          variant: "default",
          onClick: handlePreviewAction,
        },
      ],
    },
  },
  {
    value: "error",
    label: "Error",
    state: {
      type: "error",
      actions: [
        {
          key: "retry",
          icon: <RetryIcon size={14} aria-hidden={true} />,
          label: "Retry",
          variant: "default",
          onClick: handlePreviewAction,
        },
      ],
    },
  },
  {
    value: "network",
    label: "Network",
    state: {
      type: "error",
      reason: "network",
      actions: [
        {
          key: "retry",
          icon: <RetryIcon size={14} aria-hidden={true} />,
          label: "Retry",
          variant: "default",
          onClick: handlePreviewAction,
        },
        {
          key: "feedback",
          icon: <FeedbackIcon size={14} aria-hidden={true} />,
          label: "Feedback",
          variant: "outline",
          onClick: handlePreviewAction,
        },
      ],
    },
  },
  {
    value: "structured",
    label: "Structured",
    state: {
      type: "empty",
      title: "No projects yet",
      description: "Create a project to get started.",
      actions: [
        {
          key: "create",
          icon: (
            <Icon icon={Plus} size="sm" strokeWidth={2} aria-hidden={true} />
          ),
          label: "Create Project",
          variant: "default",
          onClick: handlePreviewAction,
        },
      ],
    },
  },
  {
    value: "action-states",
    label: "Action States",
    state: {
      type: "error",
      title: "Unable to load projects",
      description: "Button states are controlled by the business layer.",
      actions: [
        {
          key: "retry",
          label: "Retrying",
          variant: "default",
          onClick: handlePreviewAction,
          loading: true,
        },
        {
          key: "feedback",
          icon: <FeedbackIcon size={14} aria-hidden={true} />,
          label: "Feedback",
          variant: "outline",
          onClick: handlePreviewAction,
          disabled: true,
        },
      ],
    },
  },
];
