import { CompositedSvg } from "../media-editing/icon-compositing.js";
import { default as reactExports } from "react";
import { __jsx } from "../shared/jsx-runtime.js";
export const AudioFileIcon = reactExports.forwardRef(function AudioFileIcon2({
  size: size2 = 16,
  strokeWidth = 1.5,
  "aria-hidden": ariaHidden = true,
  ...props
}, ref) {
  return <CompositedSvg ref={ref} width={size2} height={size2} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden={ariaHidden} {...props} viewBox="0 0 16 16" data-audio-file-icon="true">
      <path d="M8 2v12" />
      <path d="M4 5v6" />
      <path d="M12 5v6" />
      <path d="M2 7v2" />
      <path d="M6 4v8" />
      <path d="M10 4v8" />
      <path d="M14 7v2" />
    </CompositedSvg>;
});
export function createMediaIcon(name2, geometry2) {
  const Icon2 = reactExports.forwardRef(function MediaIcon({
    size: size2 = 24,
    absoluteStrokeWidth: _absoluteStrokeWidth,
    children: children2,
    className,
    ...props
  }, ref) {
    return <CompositedSvg width={size2} height={size2} aria-hidden="true" {...props} ref={ref} className={`lucide lucide-${name2.toLowerCase()}${className ? ` ${className}` : ""}`} viewBox="0 0 12 12" fill="currentColor" stroke="none" data-media-icon={name2}>
        <g fill="currentColor" stroke="none">
          {geometry2}
        </g>
        {children2}
      </CompositedSvg>;
  });
  Icon2.displayName = `Playback${name2}Icon`;
  return Icon2;
}
export const PlaybackPlayIcon = createMediaIcon("Play", <path d="M3.1 2.35c0-.58.63-.94 1.13-.65l5.42 3.13c.5.29.5 1.01 0 1.3L4.23 9.3c-.5.29-1.13-.07-1.13-.65v-6.3Z" />);