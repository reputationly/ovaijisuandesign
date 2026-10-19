import { default as reactExports } from "react";
export const TidySortContext = reactExports.createContext({
  sortBy: "name",
  setSortBy: () => {},
});

export const useTidySort = () => reactExports.useContext(TidySortContext);

export const INCLUDE_DEPS_STORAGE_KEY = "hilo:canvas:tidy:includeDeps";

export let autoAlignSnapshot;

export const autoAlignListeners = new Set();

export function readAutoAlignPreference() {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(INCLUDE_DEPS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function getAutoAlignSnapshot() {
  if (autoAlignSnapshot === void 0) autoAlignSnapshot = readAutoAlignPreference();
  return autoAlignSnapshot;
}

export function emitAutoAlignChange() {
  for (const listener of autoAlignListeners) listener();
}

export function handleStorageChange(event) {
  if (event.key !== INCLUDE_DEPS_STORAGE_KEY) return;
  const next2 = event.newValue === "1";
  if (next2 === getAutoAlignSnapshot()) return;
  autoAlignSnapshot = next2;
  emitAutoAlignChange();
}

export function subscribeAutoAlign(listener) {
  autoAlignListeners.add(listener);
  if (autoAlignListeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageChange);
  }
  return () => {
    autoAlignListeners.delete(listener);
    if (autoAlignListeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorageChange);
    }
  };
}

export function setAutoAlignPreference(next2) {
  if (next2 === getAutoAlignSnapshot()) return;
  autoAlignSnapshot = next2;
  try {
    localStorage.setItem(INCLUDE_DEPS_STORAGE_KEY, next2 ? "1" : "0");
  } catch {}
  emitAutoAlignChange();
}
