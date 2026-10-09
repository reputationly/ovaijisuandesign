// audio-preview.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { getExtFromMime } from "../canvas/separator.jsx";
import { reactExports } from "../vendor.js";
import { MediaClipPanel } from "./media-clip-panel.js";

const getAudioExt = (mime) => getExtFromMime(mime, "mp3");

function AudioPreview$2({ loading, state: state2 }) {
  return (
    <div className="flex items-center justify-center h-[400px]">
      {loading ? (
        <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
      ) : (
        <div className="flex items-center justify-center px-4 pt-3 pb-1">
          <div
            className="relative flex items-center justify-center rounded-xl overflow-hidden"
            style={{
              width: 200,
              height: 200,
              background:
                "linear-gradient(160deg, #8fb8a8 0%, #6a9b8a 40%, #5a8a7a 100%)",
            }}
          >
            {state2.isPlaying ? (
              <div
                className="flex items-end gap-[3px]"
                style={{
                  height: 40,
                }}
              >
                {[
                  {
                    anim: "eq-bar-1",
                    dur: "1.1s",
                  },
                  {
                    anim: "eq-bar-3",
                    dur: "0.9s",
                  },
                  {
                    anim: "eq-bar-5",
                    dur: "1.3s",
                  },
                  {
                    anim: "eq-bar-2",
                    dur: "1.0s",
                  },
                  {
                    anim: "eq-bar-4",
                    dur: "1.2s",
                  },
                  {
                    anim: "eq-bar-1",
                    dur: "0.8s",
                  },
                  {
                    anim: "eq-bar-3",
                    dur: "1.1s",
                  },
                ].map((cfg) => (
                  <div
                    key={`${cfg.anim}-${cfg.dur}`}
                    className="w-[4px] rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.8)",
                      height: "40%",
                      animation: `${cfg.anim} ${cfg.dur} ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
            ) : (
              // biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon
              <svg
                className="h-[56px] w-[48px]"
                viewBox="0 0 68 79"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M62.0257 0.0119325C64.3823 -0.162813 66.4369 1.60226 66.6169 3.95864L67.1484 10.9355C67.3281 13.2872 65.5734 15.3436 63.2227 15.5351L38.856 17.5189L39.8605 58.8066L39.8354 58.7815C39.6803 69.651 30.8283 78.4146 19.9219 78.4146C8.91911 78.4144 0.000544489 69.4953 0 58.4927C0 47.4895 8.91877 38.5668 19.9219 38.5666C23.3436 38.5666 26.5632 39.4327 29.3764 40.9522L28.5519 6.58699C28.4969 4.30478 30.239 2.37941 32.5153 2.2092L62.0257 0.0119325Z"
                  fill="url(#paint0_linear_audio_clip_icon)"
                />
                <defs>
                  <linearGradient
                    id="paint0_linear_audio_clip_icon"
                    x1="34.1841"
                    y1="6.93425"
                    x2="34.1841"
                    y2="79.2633"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="white" stopOpacity="0.4" />
                    <stop offset="1" stopColor="#F5F7FF" />
                  </linearGradient>
                </defs>
              </svg>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AudioClipPanelInner({ audioUrl, audioName, onClose, onExport }) {
  const renderPreview2 = reactExports.useCallback(
    (ctx) => <AudioPreview$2 {...ctx} />,
    [],
  );
  return (
    <MediaClipPanel
      mediaUrl={audioUrl}
      mediaName={audioName}
      defaultMime="audio/mpeg"
      onClose={onClose}
      onExport={onExport}
      renderPreview={renderPreview2}
      getExtFromMime={getAudioExt}
    />
  );
}

export const AudioClipPanel = reactExports.memo(AudioClipPanelInner);
