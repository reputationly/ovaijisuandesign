// Re-export wrapper used by OpenCode's plugin loader.
//
// OpenCode v1.2.27 deduplicates plugins by file basename (`getPluginName`
// returns "index" for any `dist/index.js`), so injecting two plugins both
// shipping a `dist/index.js` collides and the earlier one gets silently
// dropped. Pointing the inject path at this file produces a unique dedup
// key ("trace") while keeping the npm-standard `dist/index.js` main entry
// intact for normal package consumers. Removable once the runtime upgrades
// past the affected version.
export { default } from './index.js';
//# sourceMappingURL=trace.js.map