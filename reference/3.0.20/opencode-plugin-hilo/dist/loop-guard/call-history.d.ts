/**
 * Per-session 调用历史 ring buffer。
 *
 * 设计点：
 * - **不依赖 session close 事件**：plugin SDK 没有该 hook。用 `idleTTLms` 懒清理。
 * - **LRU 上限**：超 `maxSessions` 时 evict 最老一个 session（Map 按插入顺序）。
 * - **per-session ring buffer**：超 `maxPerSession` 时 shift 掉最老一条记录。
 *
 * 内存上限估算（默认值）：
 *   200 sessions × 20 records × ~80 bytes ≈ 320 KB
 */
export type CallRecord = {
    /** 语义指纹（fingerprint() 输出） */
    fp: string;
    /** 原始 tool 名（不去前缀），用于错误信息 */
    tool: string;
    /** 写入时间戳 */
    ts: number;
};
export interface CallHistoryOptions {
    /** 每 session 最多保留多少条最近记录。默认 20。 */
    maxPerSession?: number;
    /** 全局最多保留多少个 session。默认 200。超出按 LRU evict。 */
    maxSessions?: number;
    /** 多久无活动后清理一个 session。默认 30 分钟。 */
    idleTTLms?: number;
}
export declare class CallHistory {
    private readonly map;
    private readonly maxPerSession;
    private readonly maxSessions;
    private readonly idleTTLms;
    constructor(opts?: CallHistoryOptions);
    push(sessionID: string, rec: CallRecord): void;
    recent(sessionID: string, n: number): CallRecord[];
    drop(sessionID: string): void;
    /** 当前活跃 session 数（测试用）。 */
    size(): number;
    private evictIdle;
    private evictLRU;
}
//# sourceMappingURL=call-history.d.ts.map