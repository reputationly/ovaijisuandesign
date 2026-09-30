export interface SessionAllowListOptions {
    /** Maximum remembered chats. The least recently used entry is evicted first. */
    maxSessions?: number;
    /** Maximum semantic actions remembered inside one chat. */
    maxFingerprintsPerSession?: number;
}
/**
 * Bounded process-local implementation of "allow for this chat".
 *
 * The OpenCode plugin API does not expose a reliable session-close hook, so
 * entries use a strict LRU bound. Time alone never expires a grant because the
 * UI promises "allow for this chat"; a plugin restart clears all grants and no
 * permission decision is persisted to disk.
 */
export declare class SessionAllowList {
    private readonly entries;
    private readonly maxSessions;
    private readonly maxFingerprintsPerSession;
    constructor(options?: SessionAllowListOptions);
    has(sessionId: string, fingerprint: string): boolean;
    add(sessionId: string, fingerprint: string): void;
    size(): number;
    private touchSession;
    private evictSessionsForInsert;
}
//# sourceMappingURL=session-allow-list.d.ts.map