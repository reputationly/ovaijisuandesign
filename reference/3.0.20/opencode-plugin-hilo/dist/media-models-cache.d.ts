import type { ModelInfo } from '@hilo/protocol/proto';
export interface MediaModelsSnapshot {
    models: ModelInfo[];
}
/**
 * Fetch the unified model catalog from hub gateway and flatten its media rows
 * for OpenCode's question model-catalog validation.
 *
 * The local gateway already keeps a short, account-scoped catalog cache. Do
 * not add a plugin-level cache here: a long-lived OpenCode process must see
 * account switches and server-side visibility changes promptly.
 *
 * Empty `models` means catalog-dependent question validation fails open
 * without using stale local model metadata.
 */
export declare function fetchMediaModels(gatewayUrl: string): Promise<MediaModelsSnapshot>;
//# sourceMappingURL=media-models-cache.d.ts.map