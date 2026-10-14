import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["scripts/desource/rename/test/**/*.test.mjs"],
  },
});
