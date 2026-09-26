/**
 * 用户选了"本会话都允许"的指纹。按会话 LRU（最多 200 个会话），每个会话最多记 64 个指纹，
 * 超了淘汰最久没命中的。
 */
const DEFAULT_MAX_SESSIONS = 200;
const DEFAULT_MAX_FINGERPRINTS_PER_SESSION = 64;

export interface SessionAllowListOptions {
  maxSessions?: number;
  maxFingerprintsPerSession?: number;
}

interface Entry {
  fingerprints: Set<string>;
}

export class SessionAllowList {
  private readonly entries = new Map<string, Entry>();
  private readonly maxSessions: number;
  private readonly maxFingerprintsPerSession: number;

  constructor(options: SessionAllowListOptions = {}) {
    this.maxSessions = positiveInteger(options.maxSessions, DEFAULT_MAX_SESSIONS);
    this.maxFingerprintsPerSession = positiveInteger(options.maxFingerprintsPerSession, DEFAULT_MAX_FINGERPRINTS_PER_SESSION);
  }

  has(sessionId: string, fingerprint: string): boolean {
    const entry = this.entries.get(sessionId);
    if (!entry) return false;
    this.touchSession(sessionId, entry);
    if (!entry.fingerprints.has(fingerprint)) return false;
    entry.fingerprints.delete(fingerprint);
    entry.fingerprints.add(fingerprint);
    return true;
  }

  add(sessionId: string, fingerprint: string): void {
    let entry = this.entries.get(sessionId);
    if (!entry) {
      this.evictSessionsForInsert();
      entry = { fingerprints: new Set() };
    }
    this.touchSession(sessionId, entry);
    if (entry.fingerprints.has(fingerprint)) {
      entry.fingerprints.delete(fingerprint);
      entry.fingerprints.add(fingerprint);
      return;
    }
    while (entry.fingerprints.size >= this.maxFingerprintsPerSession) {
      const oldest = entry.fingerprints.values().next().value;
      if (typeof oldest !== "string") break;
      entry.fingerprints.delete(oldest);
    }
    entry.fingerprints.add(fingerprint);
  }

  size(): number {
    return this.entries.size;
  }

  private touchSession(sessionId: string, entry: Entry): void {
    this.entries.delete(sessionId);
    this.entries.set(sessionId, entry);
  }

  private evictSessionsForInsert(): void {
    while (this.entries.size >= this.maxSessions) {
      const oldest = this.entries.keys().next().value;
      if (typeof oldest !== "string") break;
      this.entries.delete(oldest);
    }
  }
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.max(1, Math.floor(value)) : fallback;
}
