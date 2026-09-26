/**
 * 每个会话最近的工具调用。每会话最多 20 条；最多 200 个会话，新会话进来时先清掉
 * 闲置超过 30 分钟的，再按 LRU 淘汰。opencode 进程常驻，不设上限会一直涨。
 */
export interface CallRecord {
  fp: string;
  tool: string;
  ts: number;
}

export interface CallHistoryOptions {
  maxPerSession?: number;
  maxSessions?: number;
  idleTTLms?: number;
}

export class CallHistory {
  private readonly map = new Map<string, CallRecord[]>();
  private readonly maxPerSession: number;
  private readonly maxSessions: number;
  private readonly idleTTLms: number;

  constructor(opts: CallHistoryOptions = {}) {
    this.maxPerSession = opts.maxPerSession ?? 20;
    this.maxSessions = opts.maxSessions ?? 200;
    this.idleTTLms = opts.idleTTLms ?? 30 * 60 * 1000;
  }

  push(sessionID: string, rec: CallRecord): void {
    let q = this.map.get(sessionID);
    if (!q) {
      this.evictIdle(rec.ts);
      this.evictLRU();
      q = [];
      this.map.set(sessionID, q);
    } else {
      this.map.delete(sessionID);
      this.map.set(sessionID, q);
    }
    q.push(rec);
    if (q.length > this.maxPerSession) q.shift();
  }

  recent(sessionID: string, n: number): CallRecord[] {
    const q = this.map.get(sessionID);
    if (!q || q.length === 0) return [];
    if (n >= q.length) return q.slice();
    return q.slice(q.length - n);
  }

  drop(sessionID: string): void {
    this.map.delete(sessionID);
  }

  /** 当前活跃会话数（测试用）。 */
  size(): number {
    return this.map.size;
  }

  private evictIdle(now: number): void {
    if (this.map.size === 0) return;
    for (const [sid, q] of this.map) {
      const last = q[q.length - 1]?.ts ?? 0;
      if (now - last > this.idleTTLms) this.map.delete(sid);
    }
  }

  private evictLRU(): void {
    while (this.map.size >= this.maxSessions) {
      const oldest = this.map.keys().next();
      if (oldest.done || oldest.value === undefined) break;
      this.map.delete(oldest.value);
    }
  }
}
