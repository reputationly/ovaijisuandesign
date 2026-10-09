// audio-play-button.jsx
import {
  classifyFileType,
  jsxRuntimeExports,
  PlaybackCirclePauseIcon$1,
  PlaybackCirclePlayIcon$1,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import {
  cn$2,
  splitMentionFilename,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";

export const ENTITY_TYPES = [
  "character",
  "scene",
  "style_pack",
  "prop",
  "custom",
];

export function FileNameLabel({
  name: name2,
  className,
  tooltip = true,
  actionUiId,
  tooltipPositionerClassName,
}) {
  const { stem, ext } = splitMentionFilename(name2);
  const label = (
    // biome-ignore lint/a11y/useSemanticElements: Inline filename parts form a labelled group, not a form fieldset.
    <span
      className={cn$2(
        "inline-flex w-fit max-w-full min-w-0 items-baseline overflow-hidden",
        className,
      )}
      role="group"
      aria-label={name2}
      data-action-ui-id={actionUiId}
      data-slot="file-name-label"
      tabIndex={tooltip ? 0 : void 0}
    >
      <span className="min-w-0 truncate" data-file-name-stem={true}>
        {stem}
      </span>
      {ext && (
        <span
          className="max-w-full shrink-0 truncate"
          data-file-name-extension={true}
        >
          {ext}
        </span>
      )}
    </span>
  );
  if (!tooltip) return label;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={label} />
        <TooltipContent
          className="max-w-80 whitespace-normal [overflow-wrap:anywhere]"
          positionerClassName={tooltipPositionerClassName}
        >
          {name2}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AudioPlayButton({ src, filename }) {
  const { t: t2 } = useTranslation();
  const audioRef = reactExports.useRef(null);
  const [playing, setPlaying] = reactExports.useState(false);
  const toggle = reactExports.useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      void el.play();
    }
  }, [playing]);
  reactExports.useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, []);
  return (
    <>
      <audio ref={audioRef} src={src} preload="metadata">
        <track kind="captions" />
      </audio>
      <FileTypeIcon
        {...classifyFileType({
          filename,
        })}
        size={48}
        decorative={true}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      />
      <button
        type="button"
        onClick={toggle}
        className={cn$2(
          "relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-transparent p-0 hover:opacity-90 transition-opacity",
          playing ? "opacity-100" : "opacity-0 group-hover/audio:opacity-100",
        )}
        aria-label={playing ? t2("common.pause") : t2("common.play")}
        data-action-ui-id="asset-center-attachment-audio-play"
      >
        {playing ? (
          <PlaybackCirclePauseIcon$1 size={32} />
        ) : (
          <PlaybackCirclePlayIcon$1 size={32} />
        )}
      </button>
    </>
  );
}
