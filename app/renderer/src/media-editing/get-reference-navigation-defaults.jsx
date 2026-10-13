// get-reference-navigation-defaults.jsx
import { reactExports } from "../vendor.js";
import { syncStableZoomSignals } from "../canvas/separator.jsx";
import { useCanvasBridge } from "./package.jsx";
import { resolveDefaultReferencePaths } from "../generation/param-label-fallbacks.js";
import { __jsx } from "../shared/jsx-runtime.js";

export function usePopoverOpenTrack(info) {
  const { onPopoverOpen } = useCanvasBridge();
  const emittedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (emittedRef.current || !onPopoverOpen) return;
    emittedRef.current = true;
    onPopoverOpen(info);
  }, [info, onPopoverOpen]);
}

export function syncStableZoomAfter(result, getZoom) {
  const sync = () => syncStableZoomSignals(getZoom());
  if (result) {
    void result.then(sync, sync);
    return;
  }
  requestAnimationFrame(sync);
}

export const ReferenceNavigationContext = reactExports.createContext(null);

export function useReferenceNavigationSnapshot(nodeId, mode) {
  const navigationContext = reactExports.useContext(ReferenceNavigationContext);
  const [snapshot] = reactExports.useState(() => {
    const record = navigationContext?.record;
    return record &&
      record.nodeId === nodeId &&
      record.snapshot.mode === mode
      ? record.snapshot
      : null;
  });
  return {
    navigation: navigationContext,
    snapshot,
  };
}

export function getReferenceNavigationDefaults(snapshot, live) {
  if (!snapshot) return {};
  const draft = snapshot.draft;
  const restorePaths = (current, saved, original) => {
    const upstream = current ?? [];
    const staged =
      saved?.filter((path) => path && !(original ?? saved).includes(path)) ??
      [];
    return resolveDefaultReferencePaths(
      [...upstream, ...staged.filter((path) => !upstream.includes(path))],
      saved,
      {
        preserveDraftSlots: true,
      },
    );
  };
  const imagePaths = restorePaths(
    live.defaultImagePaths,
    draft.imagePaths,
    snapshot.defaults?.imagePaths,
  );
  return {
    defaultPrompt: draft.prompt,
    defaultPromptJson: draft.promptJson,
    defaultModelId: draft.modelId,
    defaultParams: draft.params,
    defaultImagePaths: imagePaths,
    defaultImageDraftPaths: imagePaths,
    defaultVideoPaths: restorePaths(
      live.defaultVideoPaths,
      draft.videoPaths,
      snapshot.defaults?.videoPaths,
    ),
    defaultAudioPaths: restorePaths(
      live.defaultAudioPaths,
      draft.audioPaths,
      snapshot.defaults?.audioPaths,
    ),
    defaultTextPaths: restorePaths(
      live.defaultTextPaths,
      draft.textPaths,
      snapshot.defaults?.textPaths,
    ),
  };
}

export function withReferenceNavigationSnapshot(Component, mode) {
  return reactExports.memo(function ReferenceNavigationPopover(props) {
    const { snapshot } = useReferenceNavigationSnapshot(
      props.nodeId ?? props.replaceNodeId,
      typeof mode === "function" ? mode(props) : mode,
    );
    return (
      <Component
        {...props}
        {...getReferenceNavigationDefaults(snapshot, props)}
        navigationSnapshot={snapshot}
      />
    );
  });
}

export const PROMPT_LENGTH_HINT_EXTRA_HEIGHT = 22;

export const AUDIO_REFERENCE_BAR_FIRST_ROW_EXTRA_HEIGHT = 56;

export const SEEDAUDIO_CREDITS_PER_SECOND = 3;

export const MUSIC_LENGTH_PRESETS = [
  {
    value: "auto",
    label: "Auto",
  },
  {
    value: "30s",
    label: "30s",
  },
  {
    value: "1m",
    label: "1m",
  },
  {
    value: "2m",
    label: "2m",
  },
  {
    value: "4m",
    label: "4m",
  },
  {
    value: "6m",
    label: "6m",
  },
];

export function musicLengthPresetLabel(translate, preset) {
  return preset.value === "auto"
    ? translate("canvas.param.option.auto", {
        defaultValue: preset.label,
      })
    : preset.label;
}

export function isCustomMusicLength(value) {
  if (!value || value === "auto") return false;
  return !MUSIC_LENGTH_PRESETS.some((preset) => preset.value === value);
}

export function parseCustomMusicLengthSeconds(value) {
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  const mmss = /^(\d{1,2}):(\d{1,2})$/.exec(trimmed);
  if (!mmss) return void 0;
  const mins = Number(mmss[1]);
  const secs = Number(mmss[2]);
  if (secs >= 60) return void 0;
  return mins * 60 + secs;
}
