// audio-preview.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { getExtFromMime } from "../canvas/separator.jsx";
import reactExports from "react";
import { MediaClipPanel } from "./media-clip-panel.js";
import { CompositedSvg } from "./icon-compositing.js";
const getAudioExt = (mime) => getExtFromMime(mime, "mp3");
function AudioPreview({ loading, state }) {
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
            {state.isPlaying ? (
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
                ].map((animationConfig) => (
                  <div
                    key={`${animationConfig.anim}-${animationConfig.dur}`}
                    className="w-[4px] rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.8)",
                      height: "40%",
                      animation: `${animationConfig.anim} ${animationConfig.dur} ease-in-out infinite`,
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
function AudioClipPanelInner({
  active: active2,
  audioUrl,
  audioName,
  onClose,
  onExport,
  editor: editor2,
  cropConfig,
  initialCropRange,
}) {
  const embedded = !!editor2;
  const renderPreview = reactExports.useCallback(
    (ctx) =>
      embedded ? (
        <div
          data-slot="audio-clip-preview"
          className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2 text-muted-foreground"
          aria-hidden="true"
        >
          <CompositedSvg
            viewBox="0 0 221 194"
            fill="currentColor"
            className="h-24 w-28 max-h-full max-w-full opacity-60"
            aria-hidden="true"
            data-slot="audio-clip-headphone-artwork"
          >
            <path d="M42.746 105.292C54.1012 105.292 63.3065 114.497 63.3065 125.852V173.398C63.3065 184.753 54.1012 193.959 42.746 193.959C31.3907 193.959 22.1854 184.753 22.1854 173.398V125.852C22.1854 114.497 31.3907 105.292 42.746 105.292ZM178.009 105.292C189.364 105.292 198.569 114.497 198.569 125.852V173.398C198.569 184.753 189.364 193.959 178.009 193.959C166.653 193.959 157.448 184.753 157.448 173.398V125.852C157.448 114.497 166.653 105.292 178.009 105.292Z" />
            <rect x="0" y="120" width="16" height="54" rx="8" />
            <rect x="205" y="120" width="16" height="54" rx="8" />
            <path d="M104.618 0.151001C108.506 -0.0492084 112.404 -0.0504471 116.292 0.148071C144.802 1.62929 171.542 14.4142 190.598 35.6715C205.671 52.3208 215.129 73.2861 217.641 95.6041C218.211 100.601 221.059 114.888 211.83 114.268C204.971 113.807 206.144 103.345 205.696 98.2262C205.09 91.8651 203.818 85.5845 201.906 79.4879C198.247 67.9271 192.459 57.1518 184.841 47.7174C167.33 26.2736 144.368 14.9786 117.07 12.2633C107.572 11.9178 100.063 12.2076 90.702 14.1569C52.8641 22.1267 23.481 51.9854 16.12 89.9459C15.0314 95.4573 14.6439 100.331 14.5077 105.926C14.3352 109.975 13.573 113.635 8.82994 114.095C-0.117215 114.964 2.36039 101.294 2.90904 96.069C5.33694 73.9379 14.5627 53.1024 29.3172 36.4293C48.9463 14.2384 75.1822 1.96772 104.618 0.151001Z" />
          </CompositedSvg>
        </div>
      ) : (
        <AudioPreview {...ctx} />
      ),
    [embedded],
  );
  return (
    <MediaClipPanel
      active={active2}
      mediaUrl={audioUrl}
      editor={editor2}
      cropConfig={cropConfig}
      initialCropRange={initialCropRange}
      mediaName={audioName}
      defaultMime="audio/mpeg"
      onClose={onClose}
      onExport={onExport}
      renderPreview={renderPreview}
      getExtFromMime={getAudioExt}
    />
  );
}
export const AudioClipPanel = reactExports.memo(AudioClipPanelInner);
