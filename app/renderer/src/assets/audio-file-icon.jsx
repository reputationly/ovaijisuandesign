import { CompositedSvg } from "../media-editing/icon-compositing.js";
import { default as reactExports } from "react";
import { __jsx } from "../shared/jsx-runtime.js";
export const AudioFileIcon = reactExports.forwardRef(function AudioFileIcon2(
  { size: size2 = 16, strokeWidth = 1.5, "aria-hidden": ariaHidden = true, ...props },
  ref,
) {
  return (
    <CompositedSvg
      ref={ref}
      width={size2}
      height={size2}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={ariaHidden}
      {...props}
      viewBox="0 0 16 16"
      data-audio-file-icon="true"
    >
      <path d="M8 2v12" />
      <path d="M4 5v6" />
      <path d="M12 5v6" />
      <path d="M2 7v2" />
      <path d="M6 4v8" />
      <path d="M10 4v8" />
      <path d="M14 7v2" />
    </CompositedSvg>
  );
});
