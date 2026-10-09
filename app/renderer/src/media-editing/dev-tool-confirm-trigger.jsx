// dev-tool-confirm-trigger.jsx
import { MOCK_MEDIA_GEN_MESSAGES } from "../chat/mock-media-gen-messages.js";
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";

function parseMockToolArgs(raw2) {
  if (!raw2) return {};
  try {
    const parsed = JSON.parse(raw2);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

const MOCK_ENUM_HINTS = {
  // capability dispatcher (post MR-1849) — vendor + model_id are top-level enums
  vendor: [
    "banana",
    "gpt-image",
    "seedream",
    "midjourney",
    "kling",
    "seedance",
    "MiniMax",
    "veo3",
  ],
  model_id: [
    "nano_banana_2_flash",
    "nano_banana_2",
    "gpt-image-2",
    "doubao-seedream-5-0-pro-260628",
    "kling-v3-omni",
    "seedance2.0",
    "seedance2.0-fast",
    "seedance2.0-mini",
    "seedance2.5",
    "MiniMax-H3",
    "veo-3.1-fast-generate-001",
  ],
  model_name: [
    "banana_2",
    "banana_pro",
    "seedance2.0",
    "MiniMax-H3",
    "kling-v3-omni",
    "speech-2.8-hd",
  ],
  model: [
    "doubao-seedream-5-0-pro-260628",
    "veo-3.1-fast-generate-001",
    "banana_2",
    "banana_pro",
  ],
  aspect_ratio: ["1:1", "16:9", "9:16", "3:2", "3:4", "4:3", "21:9"],
  aspect_ratios: ["1:1", "16:9", "9:16", "3:2", "3:4", "4:3"],
  ratio: ["adaptive", "1:1", "16:9", "9:16", "3:2", "3:4", "4:3", "21:9"],
  resolution: [
    "480p",
    "720p",
    "768P",
    "1080P",
    "2160P",
    "4k",
    "1K",
    "2K",
    "1k",
    "2k",
  ],
  duration: ["5", "6", "8", "10"],
  durations: ["5", "6", "8", "10"],
  mode: ["std", "pro", "4k"],
  sound: ["on", "off"],
  scale_mode: ["first", "fit", "fill", "custom"],
  replace_existing: ["true", "false"],
  emotion: [
    "happy",
    "calm",
    "sad",
    "angry",
    "fearful",
    "disgusted",
    "surprised",
  ],
  emotions: [
    "happy",
    "calm",
    "sad",
    "angry",
    "fearful",
    "disgusted",
    "surprised",
  ],
};

function uniqueStrings(values3, current2) {
  const next2 = new Set();
  const add2 = (value) => {
    if (value == null || value === "") return;
    next2.add(String(value));
  };
  if (Array.isArray(current2)) {
    for (const item of current2) add2(item);
  } else {
    add2(current2);
  }
  for (const value of values3) next2.add(value);
  return [...next2];
}

function mockParamHintsForArgs(args) {
  const hints = {};
  const visit2 = (entries2) => {
    for (const [key2, value] of Object.entries(entries2)) {
      if (
        key2 === "vendor_params" &&
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        visit2(value);
        continue;
      }
      const enumValues = MOCK_ENUM_HINTS[key2];
      if (enumValues) {
        hints[key2] = {
          type: "enum",
          values: uniqueStrings(enumValues, value),
        };
      } else if (key2 === "count" || key2 === "n" || key2 === "concurrency") {
        hints[key2] = {
          type: "range",
          min: 1,
          max: 5,
        };
      } else if (key2 === "speed" || key2 === "speeds") {
        hints[key2] = {
          type: "range",
          min: 0.5,
          max: 2,
        };
      }
    }
  };
  visit2(args);
  return hints;
}

function mockToolConfirmSources() {
  return MOCK_MEDIA_GEN_MESSAGES.flatMap((message2) => {
    if (message2.type !== "tool" || !message2.toolName) return [];
    const args = parseMockToolArgs(message2.toolArgs);
    return [
      {
        id: message2.id,
        tool: message2.toolName,
        args,
        label: message2.toolName,
        paramHints: mockParamHintsForArgs(args),
        toolMessage: message2,
      },
    ];
  });
}

export function DevToolConfirmTrigger({ sessionStore, focusedSessionId }) {
  const sources = reactExports.useMemo(() => mockToolConfirmSources(), []);
  const [selectedId, setSelectedId] = reactExports.useState(
    () => sources[0]?.id ?? "",
  );
  const selected2 =
    sources.find((source) => source.id === selectedId) ?? sources[0];
  const inject = reactExports.useCallback(() => {
    const sid = focusedSessionId;
    if (!sid || !selected2) return;
    const now2 = Date.now();
    const toolId = `dev-tool-${now2}`;
    const confirmId = `dev-confirm-${now2}`;
    const toolMsg = {
      ...selected2.toolMessage,
      id: toolId,
      role: "agent",
      type: "tool",
      content: selected2.tool,
      toolName: selected2.tool,
      toolStatus: "pending",
      toolArgs: JSON.stringify(selected2.args),
      toolResult: void 0,
    };
    const confirmMsg = {
      id: confirmId,
      role: "agent",
      type: "tool_confirm_ask",
      content: "",
      requestId: confirmId,
      resolved: false,
      toolConfirmData: {
        tool: selected2.tool,
        args: selected2.args,
        paramHints: selected2.paramHints,
      },
    };
    sessionStore.updateMessages(sid, (prev) => [...prev, toolMsg, confirmMsg]);
  }, [focusedSessionId, selected2, sessionStore]);
  return (
    <div className="mx-4 mb-1 flex items-center gap-1">
      <select
        value={selected2?.id ?? ""}
        onChange={(e2) => setSelectedId(e2.target.value)}
        className="h-5 max-w-72 min-w-0 flex-1 rounded-sm border border-dashed border-border bg-background px-1.5 font-mono text-caption-10 text-muted-foreground"
      >
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={inject}
        disabled={!focusedSessionId || !selected2}
        className="shrink-0 cursor-pointer rounded-sm border border-dashed border-border px-1.5 py-0.5 text-caption-10 text-muted-foreground hover:bg-muted disabled:cursor-default disabled:opacity-50"
      >
        Inject confirm
      </button>
      <span className="text-caption-10 text-muted-foreground/60">
        {sources.length}
        {" mocks"}
      </span>
    </div>
  );
}
