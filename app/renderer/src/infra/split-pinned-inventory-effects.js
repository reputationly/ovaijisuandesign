// split-pinned-inventory-effects.js
import { applyReactScan } from "../assets/credit-query-keys.jsx";
import {
  canUseDebugTooling,
  DEBUG_FLAGS,
} from "../workspace/use-deep-link-router.js";

if (canUseDebugTooling()) {
  try {
    const enabled = localStorage.getItem(DEBUG_FLAGS.reactScan) === "1";
    void applyReactScan(enabled);
  } catch {}
}
