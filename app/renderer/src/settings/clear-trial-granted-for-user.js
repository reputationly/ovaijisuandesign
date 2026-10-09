// clear-trial-granted-for-user.js
import {
  buildShownKey,
  clearPendingTrialGranted,
} from "./use-auto-announcement.js";

export function clearTrialGrantedForUser(userID) {
  if (!userID) return;
  try {
    window.localStorage.removeItem(buildShownKey(userID));
  } catch {}
  clearPendingTrialGranted();
}
