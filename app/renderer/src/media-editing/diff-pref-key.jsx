export const DIFF_PREF_KEY = "hilo:canvas:text-version:diff-enabled";

export function readDiffPreference() {
  try {
    return window.localStorage.getItem(DIFF_PREF_KEY) !== "0";
  } catch {
    return true;
  }
}

export function writeDiffPreference(enabled) {
  try {
    window.localStorage.setItem(DIFF_PREF_KEY, enabled ? "1" : "0");
  } catch {}
}
