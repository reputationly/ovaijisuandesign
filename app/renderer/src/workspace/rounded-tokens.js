// rounded-tokens.js
import { DEFAULT_PAGE_STATE_PREVIEW_SCHEMA } from "../media-editing/unwrap-mcp-json-record.js";
import { parsePageStatePreviewSchema } from "../infra/parse-page-state-preview-schema.js";

export const INITIAL_CUSTOM_STATE = parsePageStatePreviewSchema(
  DEFAULT_PAGE_STATE_PREVIEW_SCHEMA,
).state ?? {
  type: "empty",
  actions: [],
};

export const SPACING_SCALE = [
  {
    name: "gap-1",
    px: 4,
  },
  {
    name: "gap-1.5",
    px: 6,
  },
  {
    name: "gap-2",
    px: 8,
  },
  {
    name: "gap-3",
    px: 12,
  },
  {
    name: "gap-4",
    px: 16,
  },
  {
    name: "gap-6",
    px: 24,
  },
  {
    name: "gap-10",
    px: 40,
  },
];

export const ROUNDED_TOKENS = [
  {
    name: "scrollbar",
    px: 3,
  },
  {
    name: "inline-code",
    px: 4,
  },
  {
    name: "code-block",
    px: 6,
  },
  {
    name: "rounded-sm",
    px: 7.2,
  },
  {
    name: "rounded-md",
    px: 9.6,
  },
  {
    name: "rounded-lg / default",
    px: 12,
  },
  {
    name: "rounded-xl",
    px: 16.8,
  },
  {
    name: "rounded-full",
    px: 999,
  },
];
