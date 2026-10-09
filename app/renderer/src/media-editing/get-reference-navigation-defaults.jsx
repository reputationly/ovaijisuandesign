// get-reference-navigation-defaults.jsx
import { reactExports } from "../vendor.js";
import { syncStableZoomSignals } from "../canvas/separator.jsx";
import { useCanvasBridge } from "./package.jsx";
import { resolveDefaultReferencePaths } from "../generation/param-label-fallbacks.js";
import { __jsx } from "../shared/jsx-runtime.js";

export function usePopoverOpenTrack(info2) {
  const { onPopoverOpen } = useCanvasBridge();
  const emittedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (emittedRef.current || !onPopoverOpen) return;
    emittedRef.current = true;
    onPopoverOpen(info2);
  }, [info2, onPopoverOpen]);
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

export function useReferenceNavigationSnapshot(nodeId, mode2) {
  const navigation2 = reactExports.useContext(ReferenceNavigationContext);
  const [snapshot2] = reactExports.useState(() => {
    const record2 = navigation2?.record;
    return record2 &&
      record2.nodeId === nodeId &&
      record2.snapshot.mode === mode2
      ? record2.snapshot
      : null;
  });
  return {
    navigation: navigation2,
    snapshot: snapshot2,
  };
}

export function getReferenceNavigationDefaults(snapshot2, live) {
  if (!snapshot2) return {};
  const draft = snapshot2.draft;
  const restorePaths = (current2, saved, original) => {
    const upstream = current2 ?? [];
    const staged =
      saved?.filter((path2) => path2 && !(original ?? saved).includes(path2)) ??
      [];
    return resolveDefaultReferencePaths(
      [...upstream, ...staged.filter((path2) => !upstream.includes(path2))],
      saved,
      {
        preserveDraftSlots: true,
      },
    );
  };
  const imagePaths = restorePaths(
    live.defaultImagePaths,
    draft.imagePaths,
    snapshot2.defaults?.imagePaths,
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
      snapshot2.defaults?.videoPaths,
    ),
    defaultAudioPaths: restorePaths(
      live.defaultAudioPaths,
      draft.audioPaths,
      snapshot2.defaults?.audioPaths,
    ),
    defaultTextPaths: restorePaths(
      live.defaultTextPaths,
      draft.textPaths,
      snapshot2.defaults?.textPaths,
    ),
  };
}

export function withReferenceNavigationSnapshot(Component, mode2) {
  return reactExports.memo(function ReferenceNavigationPopover(props) {
    const { snapshot: snapshot2 } = useReferenceNavigationSnapshot(
      props.nodeId ?? props.replaceNodeId,
      typeof mode2 === "function" ? mode2(props) : mode2,
    );
    return (
      <Component
        {...props}
        {...getReferenceNavigationDefaults(snapshot2, props)}
        navigationSnapshot={snapshot2}
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

export function musicLengthPresetLabel(t2, preset2) {
  return preset2.value === "auto"
    ? t2("canvas.param.option.auto", {
        defaultValue: preset2.label,
      })
    : preset2.label;
}

export function isCustomMusicLength(value) {
  if (!value || value === "auto") return false;
  return !MUSIC_LENGTH_PRESETS.some((p3) => p3.value === value);
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
