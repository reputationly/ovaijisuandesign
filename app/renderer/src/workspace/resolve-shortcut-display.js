// other-modifiers.js

const MAC_MODIFIERS = {
  commandorcontrol: {
    kind: "command",
    label: "⌘",
    spokenLabel: "Command",
  },
  cmdorctrl: {
    kind: "command",
    label: "⌘",
    spokenLabel: "Command",
  },
  command: {
    kind: "command",
    label: "⌘",
    spokenLabel: "Command",
  },
  cmd: {
    kind: "command",
    label: "⌘",
    spokenLabel: "Command",
  },
  meta: {
    kind: "command",
    label: "⌘",
    spokenLabel: "Command",
  },
  control: {
    kind: "control",
    label: "⌃",
    spokenLabel: "Control",
  },
  ctrl: {
    kind: "control",
    label: "⌃",
    spokenLabel: "Control",
  },
  shift: {
    kind: "shift",
    label: "⇧",
    spokenLabel: "Shift",
  },
  alt: {
    kind: "option",
    label: "⌥",
    spokenLabel: "Option",
  },
  option: {
    kind: "option",
    label: "⌥",
    spokenLabel: "Option",
  },
};

const OTHER_MODIFIERS = {
  commandorcontrol: {
    kind: "control",
    label: "Ctrl",
    spokenLabel: "Control",
  },
  cmdorctrl: {
    kind: "control",
    label: "Ctrl",
    spokenLabel: "Control",
  },
  command: {
    kind: "command",
    label: "Win",
    spokenLabel: "Windows",
  },
  cmd: {
    kind: "command",
    label: "Win",
    spokenLabel: "Windows",
  },
  meta: {
    kind: "command",
    label: "Win",
    spokenLabel: "Windows",
  },
  control: {
    kind: "control",
    label: "Ctrl",
    spokenLabel: "Control",
  },
  ctrl: {
    kind: "control",
    label: "Ctrl",
    spokenLabel: "Control",
  },
  shift: {
    kind: "shift",
    label: "Shift",
    spokenLabel: "Shift",
  },
  alt: {
    kind: "option",
    label: "Alt",
    spokenLabel: "Alt",
  },
  option: {
    kind: "option",
    label: "Alt",
    spokenLabel: "Alt",
  },
};

export function resolveShortcutDisplay(accelerator, os) {
  const isMac = os === "darwin";
  const modifiers = isMac ? MAC_MODIFIERS : OTHER_MODIFIERS;
  const tokens = accelerator
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((raw) => {
      const modifier = modifiers[raw.toLowerCase()];
      if (modifier) return modifier;
      return {
        kind: "key",
        label: raw,
        spokenLabel: raw,
      };
    });
  return {
    ariaLabel: tokens.map((token) => token.spokenLabel).join(" "),
    isMac,
    text: tokens.map((token) => token.label).join(isMac ? "" : "+"),
    tokens,
  };
}
