// split-shortcut-keys.js
import { services } from "../vendor-inline/vscode-base/graph.jsx";
import { IAssetCenterMainService } from "../workspace/home-service.jsx";

let _service$2 = null;

export function getAssetCenterMainService() {
  if (!_service$2) {
    _service$2 = services.get(IAssetCenterMainService);
  }
  return _service$2;
}

const COMPACT_SHORTCUT_MODIFIERS = new Set(["⌘", "⌃", "⌥", "⇧"]);

export function splitShortcutKeys(keys2) {
  if (keys2.includes("+")) {
    return keys2
      .split("+")
      .map((key2) => key2.trim())
      .filter(Boolean);
  }
  const parts = [];
  let textKey = "";
  for (const char of Array.from(keys2)) {
    if (COMPACT_SHORTCUT_MODIFIERS.has(char)) {
      if (textKey) {
        parts.push(textKey);
        textKey = "";
      }
      parts.push(char);
      continue;
    }
    textKey += char;
  }
  if (textKey) parts.push(textKey);
  return parts.length > 0 ? parts : [keys2];
}
