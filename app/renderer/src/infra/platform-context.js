// 平台、系统和语言判断给桌面壳用。
import reactExports from "react";

export const PlatformContext = reactExports.createContext(null);
export function usePlatform() {
  const ctx = reactExports.useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used within AppProviders");
  return ctx;
}
export function toCloudLang(locale) {
  if (!locale) return "";
  return locale === "zh" ? "zh-Hans" : locale;
}
export function getOsName() {
  const platform = navigator.platform || "";
  const ua = navigator.userAgent || "";
  if (/mac/i.test(platform) || /Mac OS X/i.test(ua)) return "macOS";
  if (/win/i.test(platform) || /Windows/i.test(ua)) return "Windows";
  if (/linux/i.test(platform) || /Linux/i.test(ua)) return "Linux";
  return platform || "unknown";
}
export function getBrowserName() {
  const ua = navigator.userAgent || "";
  if (/Electron/i.test(ua)) return "Electron";
  if (/Chrome|Chromium/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua)) return "Safari";
  return "unknown";
}
export function getDeviceMemory(totalMemoryMb) {
  const navMemory = navigator.deviceMemory;
  if (typeof navMemory === "number" && navMemory > 0) return navMemory;
  if (typeof totalMemoryMb === "number" && totalMemoryMb > 0) {
    return Math.round(totalMemoryMb / 1024);
  }
  return void 0;
}
