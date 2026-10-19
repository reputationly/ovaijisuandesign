/**
 * v3 页存储协议（IndexedDB 实现）—— 从产物取回（第 113 轮）。
 *
 * 这是一块**相对独立**的子系统：常量 + 错误类型 + 一组校验器 + `createPageStorage`。
 * 它约束了 namespace / key 长度 / 单值 1MB / 单 scope 4MB 等限额，并实现
 * 写者代际（writerEpoch）、租约（leases）、隔离区（quarantine）、水位（watermark）等机制。
 *
 * 只搬实现，未改语义。
 */
// ==== P3 严格归并 ====
import { ERROR_CODES, PAGE_STORAGE_KEY_LIMIT, PAGE_STORAGE_MAX_KEYS, PAGE_STORAGE_NAMESPACES, PAGE_STORAGE_SCOPE_LIMIT, PAGE_STORAGE_VALUE_LIMIT, isCount, isId, isPageStorageErrorCode, isPageStorageKey, isPageStorageNamespace, isPageStorageWrite } from "./frame-services.js";
// ==== P3 严格归并 ====
import { PAGE_STORAGE_PROTOCOL_VERSION, PageStorageError, isPageStorageFrameRequest, pageStorageErrorCode } from "./frame-services.js";

// 产物在 `createPageStorage` 上方又定义了一个同义的 count（与 isCount 等价）
const count = (value) => Number.isSafeInteger(value) && value >= 0;
import { isPageStorageIdentity } from "./workbench-identity-ids.js";

const DATABASE = "hilo-v3-page-storage";

const DATABASE_VERSION = 3;

const FORMAT = 1;

const LEASES = "leases";

const QUARANTINE = "quarantine";

const SCOPES = "scopes";

const WATERMARK = "#watermark";





























function isPageStorageEntries(namespace2, value) {
  if (!Array.isArray(value) || value.length > PAGE_STORAGE_MAX_KEYS) return false;
  const seen = /* @__PURE__ */ new Set();
  let total = 0;
  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length !== 2 || !isPageStorageKey(namespace2, entry[0]) || typeof entry[1] !== "string" || entry[1].length > PAGE_STORAGE_VALUE_LIMIT || seen.has(entry[0]))
      return false;
    seen.add(entry[0]);
    total += entry[0].length + entry[1].length;
    if (total > PAGE_STORAGE_SCOPE_LIMIT) return false;
  }
  return true;
}





function createPageStorage(identity2, isCurrent = () => true) {
  if (!isPageStorageIdentity(identity2)) throw new Error("Page storage identity is missing");
  const scope = [identity2.workspaceId, identity2.userId, identity2.accountKey];
  const rowKey = (namespace2) => JSON.stringify([...scope, namespace2]);
  let connection;
  let closed = false;
  let queue = Promise.resolve();
  function open() {
    if (closed) return Promise.reject(new PageStorageError("PAGE_STORAGE_SCOPE_RETIRED"));
    if (connection) return connection;
    connection = new Promise((resolve, reject2) => {
      if (!globalThis.indexedDB) {
        reject2(new PageStorageError("PAGE_STORAGE_UNAVAILABLE"));
        return;
      }
      const request = indexedDB.open(DATABASE, DATABASE_VERSION);
      request.onerror = () => reject2(new PageStorageError("PAGE_STORAGE_UNAVAILABLE"));
      request.onblocked = () => reject2(new PageStorageError("PAGE_STORAGE_UNAVAILABLE"));
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const name2 of [SCOPES, QUARANTINE, LEASES])
          if (!db.objectStoreNames.contains(name2)) db.createObjectStore(name2, { keyPath: "key" });
        if (request.transaction) seedWatermark(request.transaction);
      };
      request.onsuccess = () => {
        const db = request.result;
        if (closed) {
          db.close();
          reject2(new PageStorageError("PAGE_STORAGE_SCOPE_RETIRED"));
          return;
        }
        db.onversionchange = () => {
          db.close();
          connection = void 0;
        };
        resolve(db);
      };
    }).catch((error) => {
      connection = void 0;
      throw error;
    });
    return connection;
  }
  function parse2(namespace2, value) {
    const row = value;
    if (!row || typeof row !== "object" || row.key !== rowKey(namespace2) || row.format !== FORMAT || !count(row.writerEpoch) || !count(row.revision) || row.lastWriteId !== void 0 && typeof row.lastWriteId !== "string" || !isPageStorageEntries(namespace2, row.entries))
      throw quarantined();
    return row;
  }
  function leaseEpoch(namespace2, value) {
    const lease = value;
    if (!lease || typeof lease !== "object" || lease.key !== rowKey(namespace2) || !count(lease.epoch) || lease.epoch < 1)
      throw quarantined();
    return lease.epoch;
  }
  function watermarkEpoch(value) {
    const mark2 = value;
    if (!mark2 || typeof mark2 !== "object" || mark2.key !== WATERMARK || !count(mark2.epoch))
      throw quarantined();
    return mark2.epoch;
  }
  function inspect(namespace2, raw2) {
    const row = raw2.row === void 0 ? void 0 : parse2(namespace2, raw2.row);
    if (raw2.lease === void 0) return { row, granted: row?.writerEpoch ?? 0, ledger: false };
    const granted = leaseEpoch(namespace2, raw2.lease);
    if (row && row.writerEpoch !== granted) throw quarantined();
    return { row, granted, ledger: true };
  }
  const state2 = (row) => ({
    writerEpoch: row?.writerEpoch ?? 0,
    revision: row?.revision ?? 0,
    entries: (row?.entries ?? []).map(([key2, value]) => [key2, value])
  });
  function grant(stores2, namespace2, raw2, previous2, data2) {
    const epoch = Math.max(previous2, watermarkEpoch(raw2.watermark)) + 1;
    if (!Number.isSafeInteger(epoch)) throw new PageStorageError("PAGE_STORAGE_LIMIT");
    const key2 = rowKey(namespace2);
    const next2 = {
      key: key2,
      format: FORMAT,
      writerEpoch: epoch,
      revision: data2.revision,
      ...data2.lastWriteId === void 0 ? {} : { lastWriteId: data2.lastWriteId },
      entries: data2.entries
    };
    stores2.scopes.put(next2);
    stores2.leases.put({ key: key2, epoch });
    stores2.leases.put({ key: WATERMARK, epoch });
    return state2(next2);
  }
  function run2(namespace2, mode2, operation2) {
    if (!isPageStorageNamespace(namespace2))
      return Promise.reject(new PageStorageError("PAGE_STORAGE_INVALID"));
    const next2 = queue.then(async () => {
      if (closed || !isCurrent()) throw new PageStorageError("PAGE_STORAGE_SCOPE_RETIRED");
      const db = await open();
      return new Promise((resolve, reject2) => {
        const tx = db.transaction(
          [SCOPES, QUARANTINE, LEASES],
          mode2,
          mode2 === "readwrite" ? { durability: "strict" } : void 0
        );
        let result;
        let failure2;
        tx.oncomplete = () => result ? resolve(result.value) : reject2(new PageStorageError("PAGE_STORAGE_UNAVAILABLE"));
        tx.onabort = () => reject2(failure2 ?? new PageStorageError("PAGE_STORAGE_UNAVAILABLE"));
        tx.onerror = () => {
          failure2 ??= new PageStorageError("PAGE_STORAGE_UNAVAILABLE");
        };
        const stores2 = {
          scopes: tx.objectStore(SCOPES),
          quarantine: tx.objectStore(QUARANTINE),
          leases: tx.objectStore(LEASES)
        };
        const rowRequest = stores2.scopes.get(rowKey(namespace2));
        rowRequest.onsuccess = () => {
          const leaseRequest = stores2.leases.get(rowKey(namespace2));
          leaseRequest.onsuccess = () => {
            const markRequest = stores2.leases.get(WATERMARK);
            markRequest.onsuccess = () => {
              const raw2 = {
                row: rowRequest.result,
                lease: leaseRequest.result,
                watermark: markRequest.result
              };
              try {
                operation2(stores2, raw2, (value) => {
                  result = { value };
                });
              } catch (error) {
                failure2 = error;
                tx.abort();
              }
            };
          };
        };
      });
    });
    queue = next2.catch(() => void 0);
    return next2;
  }
  return {
    version: PAGE_STORAGE_PROTOCOL_VERSION,
    acquire: (namespace2) => run2(namespace2, "readwrite", (stores2, raw2, done) => {
      const { row, granted } = inspect(namespace2, raw2);
      done(grant(stores2, namespace2, raw2, granted, row ?? { revision: 0, entries: [] }));
    }),
    read: (namespace2) => run2(namespace2, "readonly", (_stores, raw2, done) => {
      done(state2(inspect(namespace2, raw2).row));
    }),
    write: (namespace2, input) => run2(namespace2, "readwrite", ({ scopes: scopes2 }, raw2, done) => {
      if (!isPageStorageWrite(namespace2, input))
        throw new PageStorageError("PAGE_STORAGE_INVALID");
      const { row, granted, ledger } = inspect(namespace2, raw2);
      if (!row || !ledger || granted !== input.writerEpoch || row.writerEpoch !== granted)
        throw new PageStorageError("PAGE_STORAGE_STALE_WRITER");
      if (row.lastWriteId === input.writeId && row.revision === input.baseRevision + 1) {
        done({ revision: row.revision });
        return;
      }
      if (row.revision !== input.baseRevision)
        throw new PageStorageError("PAGE_STORAGE_STALE_REVISION");
      const entries2 = new Map(row.entries);
      for (const [key2, value] of input.set) {
        if (value === null) entries2.delete(key2);
        else entries2.set(key2, value);
      }
      const next2 = {
        ...row,
        revision: row.revision + 1,
        lastWriteId: input.writeId,
        entries: [...entries2]
      };
      if (next2.entries.length > PAGE_STORAGE_MAX_KEYS || !isPageStorageEntries(namespace2, next2.entries))
        throw new PageStorageError("PAGE_STORAGE_LIMIT");
      scopes2.put(next2);
      done({ revision: next2.revision });
    }),
    exportQuarantine: (namespace2) => run2(namespace2, "readonly", (_stores, raw2, done) => {
      try {
        inspect(namespace2, raw2);
      } catch {
        let rowValid = true;
        try {
          if (raw2.row !== void 0) parse2(namespace2, raw2.row);
        } catch {
          rowValid = false;
        }
        const value = rowValid ? { scope: raw2.row ?? null, lease: raw2.lease ?? null } : raw2.row;
        const exported = JSON.stringify(value) ?? "null";
        if (exported.length > PAGE_STORAGE_SCOPE_LIMIT * 2)
          throw new PageStorageError("PAGE_STORAGE_LIMIT");
        done(exported);
        return;
      }
      throw new PageStorageError("PAGE_STORAGE_NOT_QUARANTINED");
    }),
    recoverQuarantine: (namespace2) => run2(namespace2, "readwrite", (stores2, raw2, done) => {
      try {
        inspect(namespace2, raw2);
      } catch {
        const previous2 = raw2.lease === void 0 ? 0 : leaseEpoch(namespace2, raw2.lease);
        watermarkEpoch(raw2.watermark);
        stores2.quarantine.put({
          key: JSON.stringify([rowKey(namespace2), Date.now(), crypto.randomUUID()]),
          scope: rowKey(namespace2),
          raw: raw2.row ?? null,
          ...raw2.lease === void 0 ? {} : { lease: raw2.lease }
        });
        done(grant(stores2, namespace2, raw2, previous2, { revision: 0, entries: [] }));
        return;
      }
      throw new PageStorageError("PAGE_STORAGE_NOT_QUARANTINED");
    }),
    dispose() {
      closed = true;
      void connection?.then(
        (db) => db.close(),
        () => {
        }
      );
    }
  };
}

const quarantined = () => new PageStorageError("PAGE_STORAGE_QUARANTINED");

function seedWatermark(tx) {
  const leases = tx.objectStore(LEASES);
  const existing2 = leases.get(WATERMARK);
  existing2.onsuccess = () => {
    if (existing2.result !== void 0) return;
    const rows = tx.objectStore(SCOPES).getAll();
    rows.onsuccess = () => {
      const all2 = leases.getAll();
      all2.onsuccess = () => {
        const epoch = Math.max(0, ...[...rows.result, ...all2.result].map(epochOf));
        leases.put({ key: WATERMARK, epoch });
      };
    };
  };
}

function epochOf(value) {
  if (!value || typeof value !== "object") return 0;
  const record2 = value;
  const epoch = "epoch" in record2 ? record2.epoch : record2.writerEpoch;
  return count(epoch) ? epoch : 0;
}

export {
  DATABASE,
  DATABASE_VERSION,
  FORMAT,
  LEASES,
  QUARANTINE,
  SCOPES,
  WATERMARK,
  PAGE_STORAGE_PROTOCOL_VERSION,
  PAGE_STORAGE_NAMESPACES,
  PAGE_STORAGE_KEY_LIMIT,
  PAGE_STORAGE_MAX_KEYS,
  PAGE_STORAGE_VALUE_LIMIT,
  PAGE_STORAGE_SCOPE_LIMIT,
  ERROR_CODES,
  PageStorageError,
  isPageStorageErrorCode,
  pageStorageErrorCode,
  isPageStorageNamespace,
  isPageStorageKey,
  isCount,
  isId,
  isPageStorageEntries,
  isPageStorageWrite,
  isPageStorageFrameRequest,
  createPageStorage,
  quarantined,
  seedWatermark,
  epochOf,
};
