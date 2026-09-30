declare function normalizeTool(t: string): string;
/**
 * Prompt 归一化：lowercase、删非字母数字汉字空白的字符、collapse 空白、取前 32 字符。
 *
 * "Camera slowly panning RIGHT." 和 "camera slowly pans right" 归一化后相同——
 * 这是 hilo agent 死循环最常见的微调形态，必须命中。
 */
declare function normPrompt(p: unknown): string;
/**
 * Duration 归桶：每 3 秒一个桶。
 * 5/6/7 → 6, 8/9/10 → 9, 11/12/13 → 12, ...
 * 覆盖 ±1s 微调 100%，±2s 微调 ~80%（落在桶边界例外）。
 */
declare function bucketDuration(d: unknown): string;
/** 数组按字典序排序后哈希——顺序无关（视频/音频生成里 ref 列表的顺序不影响结果）。 */
declare function setHash(arr: unknown): string;
export declare function fingerprint(tool: string, args: unknown): string;
export declare const __testing__: {
    normPrompt: typeof normPrompt;
    bucketDuration: typeof bucketDuration;
    setHash: typeof setHash;
    normalizeTool: typeof normalizeTool;
};
export {};
//# sourceMappingURL=fingerprint.d.ts.map