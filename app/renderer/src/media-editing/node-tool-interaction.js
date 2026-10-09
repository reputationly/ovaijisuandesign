// node-tool-interaction.js

const NODE_TOOL_INTERACTION = {
  // ── image tools ─────────────────────────────────────────────
  erase: "opens_mode",
  redraw: "opens_mode",
  crop: "opens_mode",
  outpaint: "opens_mode",
  "move-object": "opens_mode",
  "image-inplace-edit": "opens_mode",
  rotate: "opens_mode",
  "split-grid": "opens_mode",
  // Opens the target-resolution picker; apply happens only after the user
  // clicks Generate, and closing the picker is an abandon.
  "super-resolution": "opens_dialog",
  "remove-bg": "instant",
  "layer-decompose": "opens_dialog",
  "color-adjust": "opens_dialog",
  "promote-to-asset": "opens_dialog",
  "customize-toolbar": "opens_dialog",
  "add-to-chat": "side_effect",
  "panorama-reference": "side_effect",
  watermark: "opens_panel",
  more: "opens_panel",
  "multi-angle": "opens_panel",
  "storyboard-grid": "opens_panel",
  relight: "opens_panel",
  fullscreen: "opens_panel",
  // ── video tools ────────────────────────────────────────────
  "enhance-video": "opens_mode",
  "hailuo03-super-resolution": "opens_mode",
  "erase-subtitle": "opens_mode",
  asr: "opens_mode",
  clip: "opens_mode",
  "extract-frame": "opens_mode",
  "extract-audio": "instant",
  "capture-frame": "instant",
};

const DEFAULT_INTERACTION = "opens_mode";

export function classifyToolInteraction(toolId) {
  return NODE_TOOL_INTERACTION[toolId] ?? DEFAULT_INTERACTION;
}

export function createToolInteractionSession() {
  return {
    active: false,
    hadProgress: false,
  };
}

export function beginToolInteractionSession(session) {
  session.active = true;
  session.hadProgress = false;
}

export function setToolInteractionSessionProgress(session, hadProgress) {
  if (!session.active) return;
  session.hadProgress = hadProgress;
}

export function completeToolInteractionSession(session) {
  if (!session.active) return false;
  session.active = false;
  return true;
}

export function abandonToolInteractionSession(session, hadProgressOverride) {
  if (!session.active) return null;
  session.active = false;
  return hadProgressOverride ?? session.hadProgress;
}

export function rectCellIndices(a2, b3, cols) {
  const ar = Math.floor(a2 / cols);
  const ac = a2 % cols;
  const br = Math.floor(b3 / cols);
  const bc = b3 % cols;
  const r0 = Math.min(ar, br);
  const r1 = Math.max(ar, br);
  const c0 = Math.min(ac, bc);
  const c1 = Math.max(ac, bc);
  const out = [];
  for (let r2 = r0; r2 <= r1; r2++) {
    for (let c3 = c0; c3 <= c1; c3++) out.push(r2 * cols + c3);
  }
  return out;
}
