// audio-full-body-popover-gap-offset.js
import { withReferenceNavigationSnapshot } from "./get-reference-navigation-defaults.jsx";
import { TxtPopoverInner } from "../generation/txt-popover-inner.jsx";

export const TxtPopover = withReferenceNavigationSnapshot(
  TxtPopoverInner,
  (props) => props.mode,
);

export const AUDIO_FULL_BODY_POPOVER_GAP_OFFSET = 0;
