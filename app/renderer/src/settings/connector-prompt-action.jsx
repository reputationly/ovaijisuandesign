// connector-prompt-action.jsx
import {
  CONNECTOR_STATUS_VISUAL,
  Link2,
  Loader2,
  MessageCircle,
  PlaybackPlayIcon$1 as PlaybackPlayIcon,
  useTranslation,
} from "../vendor.js";
import {
  Icon,
  PlaybackPauseIcon,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { IntegrationStatusPill } from "./integration-status-pill.jsx";
import { Download } from "../media-editing/package.jsx";
import { RetryIcon } from "../workspace/use-prompt-icon.jsx";
import { Button, cn$2 as cn } from "../infra/dialog-content.jsx";
const connectorPromptActionIcon = {
  requiresInstall: Download,
  installing: Loader2,
  requiresConnection: Link2,
  ready: MessageCircle,
  requiresEnable: PlaybackPlayIcon,
  requiresRecovery: RetryIcon,
};
export function ConnectorPromptAction({
  mode: mode2,
  label,
  checking = false,
  className,
  ...props
}) {
  const actionIcon = connectorPromptActionIcon[mode2];
  return (
    <Button
      type="button"
      size="sm"
      variant="default"
      className={cn(
        "h-[30px] shrink-0 self-center gap-1 rounded-[10px] pl-2.5 pr-3 font-normal",
        className,
      )}
      data-connector-prompt-action-mode={mode2}
      {...props}
    >
      <span
        aria-hidden="true"
        className="flex size-3.5 shrink-0 items-center justify-center"
        data-layout-slot="connector-prompt-action-icon"
      >
        <Icon
          icon={actionIcon}
          size="sm"
          strokeWidth={1.5}
          className={
            mode2 === "installing"
              ? "animate-spin"
              : checking
                ? "motion-safe:animate-spin"
                : void 0
          }
          aria-hidden={true}
        />
      </span>
      <span>{label}</span>
    </Button>
  );
}
export function ConnectorStatusPill({ state: state2 }) {
  const { t: t2 } = useTranslation();
  const visual = CONNECTOR_STATUS_VISUAL[state2];
  const label = t2(
    state2 === "removing"
      ? "connectors.detail.disconnecting"
      : `connectors.runtimeState.${state2}`,
  );
  return (
    <IntegrationStatusPill
      label={label}
      tone={visual.tone}
      markerTone={visual.markerTone}
      markerActive={
        state2 === "removing" ||
        state2 === "checking" ||
        state2 === "installing"
      }
      markerIcon={
        state2 === "disabled" ? (
          <PlaybackPauseIcon size={10} className="shrink-0 text-warning/80" />
        ) : (
          void 0
        )
      }
      markerLabel={label}
    />
  );
}
