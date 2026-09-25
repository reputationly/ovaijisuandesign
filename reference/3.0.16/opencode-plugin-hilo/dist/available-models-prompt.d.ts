import { type SelectedMediaModels } from '@hilo/protocol';
import type { ModelInfo } from '@hilo/protocol/proto';
/**
 * Byte-stable safety rule appended to every root and sub-agent system prompt.
 *
 * Only the primary agent receives the live `<model_display_names>` catalog.
 * Agents without that catalog must stay generic instead of guessing a vendor,
 * legacy name, or regional display name. Keeping this block catalog-independent
 * avoids another gateway request and preserves prompt-cache locality.
 */
export declare function formatUserVisibleModelSafetyBlock(): string;
/**
 * Returns true when `agentName` is the primary agent the block targets.
 *
 * Exposed so the caller in index.ts doesn't have to import the constant.
 */
export declare function shouldInjectAvailableModelsForAgent(agentName: string | undefined): boolean;
/** Inject only when the runtime has resolved a concrete release region. */
export declare function shouldInjectModelDisplayNames(region: string | undefined): boolean;
/**
 * Return true when a Skill result contains guidance about media models.
 *
 * Skills are installed independently from the live regional model catalog, so
 * their recommendations can become stale or be valid in only one region. Keep
 * this deliberately conservative: ordinary Skills should not pay for a catalog
 * fetch or receive unrelated prompt text.
 */
export declare function skillOutputNeedsRuntimeModelCatalog(output: string): boolean;
/**
 * Format the complete live regional media catalog for Agent-authored prose.
 *
 * Hidden rows are omitted so model-selection questions cannot surface options
 * that the renderer model picker itself would hide. Tool arguments continue
 * using ids while all user-visible labels use display_name.
 */
export declare function formatModelDisplayNamesBlock(mediaModels: readonly ModelInfo[]): string | null;
/**
 * Format the `<available_models>` block, or return null when injection
 * should be skipped (Auto across the board / cloud unreachable).
 */
export declare function formatAvailableModelsBlock(selected: SelectedMediaModels | null | undefined, mediaModels: readonly ModelInfo[]): string | null;
//# sourceMappingURL=available-models-prompt.d.ts.map