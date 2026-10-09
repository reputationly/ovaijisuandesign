// use-canvas-tag-name-input-limit.js
import { dedupedToast, reactExports, useTranslation } from "../vendor.js";
import {
  CANVAS_TAG_NAME_MAX_LENGTH,
  countCanvasTagNameUnits,
  truncateCanvasTagName,
} from "../infra/parse-connector-selection.js";

const TAG_NAME_LIMIT_TOAST_ID = "canvas-tag-name-limit";

export function useCanvasTagNameInputLimit() {
  const { t: t2 } = useTranslation();
  const composingRef = reactExports.useRef(false);
  const announcedRef = reactExports.useRef(false);
  const enforceLimit = reactExports.useCallback(
    (value) => {
      const limited = truncateCanvasTagName(value);
      if (limited !== value && !announcedRef.current) {
        dedupedToast.info(t2("canvasTags.nameLimitReached"), {
          id: TAG_NAME_LIMIT_TOAST_ID,
          duration: 2e3,
        });
        announcedRef.current = true;
      }
      if (countCanvasTagNameUnits(limited) < CANVAS_TAG_NAME_MAX_LENGTH) {
        announcedRef.current = false;
      }
      return limited;
    },
    [t2],
  );
  return {
    acceptChange(value) {
      return composingRef.current ? value : enforceLimit(value);
    },
    startComposition() {
      composingRef.current = true;
    },
    finishComposition(value) {
      composingRef.current = false;
      return enforceLimit(value);
    },
  };
}
