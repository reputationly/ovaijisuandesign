// image-rotate-preview-inner.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { reactExports } from "../vendor.js";

function ImageRotatePreviewInner({
  src,
  srcSet,
  sizes,
  alt,
  width,
  height,
  transform: transform2,
}) {
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      className="pointer-events-none absolute left-1/2 top-1/2 object-cover"
      style={{
        width,
        height,
        // Override Tailwind preflight's `max-width: 100%`. While rotating, the
        // source rect (e.g. 350×233 landscape) is wider than the parent's
        // AABB (e.g. 233×350 portrait) — without this, the source rect would
        // be squeezed to the parent width and the rotated image wouldn't fill
        // the body.
        maxWidth: "none",
        maxHeight: "none",
        transform: transform2
          ? `translate(-50%, -50%) ${transform2}`
          : "translate(-50%, -50%)",
        transformOrigin: "center center",
      }}
      draggable={false}
      loading="lazy"
      decoding="async"
    />
  );
}

export const ImageRotatePreview = reactExports.memo(ImageRotatePreviewInner);

export const SPLIT_MAGNIFICATIONS = [
  {
    id: "2x",
    labelKey: "canvas.splitGrid.hd2x",
    defaultLabel: "2倍高清",
    multiplier: 2,
  },
  {
    id: "4x",
    labelKey: "canvas.splitGrid.hd4x",
    defaultLabel: "4倍高清",
    multiplier: 4,
  },
];
