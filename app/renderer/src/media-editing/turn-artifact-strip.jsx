// turn-artifact-strip.jsx
import {
  API_PATHS,
  AudioLines,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  Cog,
  reactExports,
  Search,
  SquareMousePointer,
  useTranslation,
  Video,
  Zap,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useResolveMediaUrl } from "../workspace/tool-label-definitions.js";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
import { ArtifactAssetCard } from "../generation/artifact-asset-card.jsx";
import { normalizeJsonToolResult } from "../chat/has-structured-success-payload.js";
import { parseToolConfirmRejectReason } from "../canvas/fullscreen-icon.jsx";
import { Brain, Clock, FileText, ImageOutlineIcon, Plug } from "./package.jsx";
import { SkillIcon } from "../workspace/use-prompt-icon.jsx";
function resolveArtifactUrl(raw2, resolve) {
  if (/^https?:\/\//i.test(raw2)) return resolve(raw2);
  if (raw2.startsWith("/")) return resolve(raw2);
  return resolve(API_PATHS.serveFile(raw2));
}
export function TurnArtifactStrip({ artifacts }) {
  const resolveUrl = useResolveMediaUrl();
  const { t: t2 } = useTranslation();
  const [expanded, setExpanded] = reactExports.useState(false);
  if (artifacts.length === 0) return null;
  return (
    <div
      data-action-ui-id="chat-turn-artifacts"
      className="@container/turn-artifacts flex min-w-0 flex-col gap-1.5"
    >
      <button
        type="button"
        data-action-ui-id="chat-turn-artifacts-toggle"
        className="flex w-full items-center gap-1.5 text-left text-body-13 text-muted-foreground transition-colors hover:text-foreground"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform",
            expanded ? "rotate-0" : "-rotate-90",
          )}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <span>
          {t2("chat.turnArtifacts", {
            count: artifacts.length,
          })}
        </span>
      </button>
      {expanded && (
        <div
          data-action-ui-id="chat-turn-artifact-list"
          className="grid grid-cols-1 gap-1.5 @min-[350px]/turn-artifacts:grid-cols-2"
        >
          {artifacts.map((a2) => {
            const src = resolveArtifactUrl(a2.url, resolveUrl);
            if (!src) return null;
            return (
              <ArtifactAssetCard
                key={a2.path}
                artifact={a2}
                src={src}
                size="chip"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
export const CATEGORY_I18N = {
  thinking: "chat.activity.thinking",
  read: "chat.activity.read",
  analyseMedia: "chat.activity.analyseMedia",
  search: "chat.activity.search",
  execute: "chat.activity.execute",
  imageGen: "chat.activity.imageGen",
  videoGen: "chat.activity.videoGen",
  videoEdit: "chat.activity.videoEdit",
  audioGen: "chat.activity.audioGen",
  musicGen: "chat.activity.musicGen",
  mediaGenFailed: "chat.activity.mediaGenFailed",
  mediaGenPending: "chat.activity.mediaGenPending",
  mediaGenAborted: "chat.activity.mediaGenAborted",
  mediaGenCancelled: "chat.activity.mediaGenCancelled",
  mediaGenInterrupted: "chat.activity.mediaGenInterrupted",
  canvas: "chat.activity.canvas",
  plan: "chat.activity.plan",
  skillOp: "chat.activity.skillLoadedFallback",
  process: "chat.activity.process",
  connector: "chat.activity.connector",
  other: "chat.activity.other",
};
export const CATEGORY_RUNNING_I18N = {
  analyseMedia: "chat.activity.analyseMedia.running",
  imageGen: "chat.activity.imageGen.running",
  videoGen: "chat.activity.videoGen.running",
  videoEdit: "chat.activity.videoEdit.running",
  audioGen: "chat.activity.audioGen.running",
  musicGen: "chat.activity.musicGen.running",
};
export function getStreamingAction(items) {
  const msg = items[items.length - 1];
  if (msg?.type !== "tool") return void 0;
  const status = msg.toolStatus;
  if (status === "running" || status === "pending") return msg;
  return void 0;
}
export const CATEGORY_ICON = {
  thinking: Brain,
  read: FileText,
  analyseMedia: FileText,
  search: Search,
  execute: Zap,
  imageGen: ImageOutlineIcon,
  videoGen: Video,
  videoEdit: Video,
  audioGen: AudioLines,
  musicGen: AudioLines,
  mediaGenFailed: CircleAlert,
  mediaGenPending: Clock,
  mediaGenAborted: Clock,
  mediaGenCancelled: CircleAlert,
  mediaGenInterrupted: Clock,
  canvas: SquareMousePointer,
  plan: ClipboardList,
  skillOp: SkillIcon,
  process: Cog,
  connector: Plug,
  other: Cog,
};
function stripUserOverrideNotice(text2) {
  return text2
    .split(/\r?\n/)
    .filter((line) => !/^\s*\[User Override\]/i.test(line))
    .filter((line) => !/^\s*User manually modified:/i.test(line))
    .join("\n")
    .trim();
}
export function sanitizeDisplayText(text2) {
  if (!text2) return void 0;
  const sanitized = stripUserOverrideNotice(text2);
  return sanitized.length > 0 ? sanitized : void 0;
}
export function normalizeStructuredToolResult(text2) {
  const sanitized = sanitizeDisplayText(text2);
  if (!sanitized) return void 0;
  return normalizeJsonToolResult(sanitized);
}
function toolConfirmSettlementRejectReason(cause) {
  switch (cause) {
    case void 0:
      return void 0;
    case "timeout":
      return "confirmation_expired";
    case "reply":
    case "session_cancelled":
      return "user_rejected";
    case "mode_changed":
    case "runtime_restarted":
    case "session_deleted":
    case "unavailable":
      return "confirmation_unavailable";
  }
}
export function resolveToolConfirmRejectReason(entry) {
  const settlementReason = toolConfirmSettlementRejectReason(
    entry.rejectedConfirm?.toolConfirmSettlementCause,
  );
  return (
    settlementReason ??
    parseToolConfirmRejectReason(entry.toolResult) ??
    (entry.rejectedConfirm ? "user_rejected" : void 0)
  );
}
export function toolConfirmRejectLabel(reason, t2) {
  switch (reason) {
    case "user_rejected":
      return t2("chat.activity.generationCancelled");
    case "confirmation_expired":
      return t2("chat.activity.confirmationExpired");
    case "confirmation_unavailable":
      return t2("chat.activity.confirmationUnavailable");
  }
}
