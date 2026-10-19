import { PlaybackPlayIcon as PlaybackPlayIcon$1 } from "./audio-file-icon.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
export function VideoPlayIndicator({ size: size2 = 14 }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <PlaybackPlayIcon$1
        size={size2}
        style={{
          color: "var(--canvas-media-play-icon)",
          filter: "drop-shadow(0 1px 2px rgb(0 0 0 / 0.65))",
        }}
      />
    </span>
  );
}
