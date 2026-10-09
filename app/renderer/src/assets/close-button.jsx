// close-button.jsx
import { reactExports, useTranslation, X$7 as X } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
export const CloseButton = reactExports.memo(function CloseButton2({
  onClose,
}) {
  const handleClick2 = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      onClose();
    },
    [onClose],
  );
  const { t: t2 } = useTranslation();
  return (
    <button
      type="button"
      aria-label={t2("common.close")}
      data-action-ui-id="media-lightbox.close"
      className="absolute right-8 top-8 z-10 flex size-9 cursor-pointer items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--media-overlay-foreground)_10%,transparent)] text-[color-mix(in_srgb,var(--media-overlay-foreground)_80%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--media-overlay-foreground)_20%,transparent)] hover:text-(--media-overlay-foreground) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={handleClick2}
    >
      <X size={16} strokeWidth={1.5} />
    </button>
  );
});
