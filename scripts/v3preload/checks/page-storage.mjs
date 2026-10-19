/**
 * v3 页存储协议功能自检（第 113 轮）。
 *
 * 这块是纯数据结构 + 校验器，不依赖 DOM/IndexedDB，可以直接在 node 里跑。
 */
import {
  PAGE_STORAGE_PROTOCOL_VERSION,
  PAGE_STORAGE_NAMESPACES,
  PAGE_STORAGE_KEY_LIMIT,
  PAGE_STORAGE_MAX_KEYS,
  PAGE_STORAGE_VALUE_LIMIT,
  PAGE_STORAGE_SCOPE_LIMIT,
  PageStorageError,
  isPageStorageErrorCode,
  isPageStorageNamespace,
  isPageStorageKey,
  isPageStorageEntries,
  isPageStorageWrite,
} from "../../../app/renderer/src/canvas-v3/page-storage.js";

let failed = 0;
const check = (name, cond, extra = "") => {
  console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  " + extra : ""}`);
  if (!cond) failed++;
};

// ---- 常量 ----
check("协议版本为 1", PAGE_STORAGE_PROTOCOL_VERSION === 1);
check("有 canvas-v3 命名空间", PAGE_STORAGE_NAMESPACES["canvas-v3"] === "hilo:canvas-v3:");
check("key 上限 256", PAGE_STORAGE_KEY_LIMIT === 256);
check("单 scope 最多 64 个 key", PAGE_STORAGE_MAX_KEYS === 64);
check("单值上限 1MB", PAGE_STORAGE_VALUE_LIMIT === 1024 * 1024);
check("单 scope 上限 4MB", PAGE_STORAGE_SCOPE_LIMIT === 4 * 1024 * 1024);

// ---- 错误类型 ----
const err = new PageStorageError("PAGE_STORAGE_LIMIT");
check("错误保留 code", err.code === "PAGE_STORAGE_LIMIT");
check("错误 name 正确", err.name === "PageStorageError");
check("是 Error 实例", err instanceof Error);
check("合法错误码被接受", isPageStorageErrorCode("PAGE_STORAGE_QUARANTINED") === true);
check("非法错误码被拒绝", isPageStorageErrorCode("NOPE") === false);

// ---- 命名空间 / key ----
check("canvas-v3 是合法 namespace", isPageStorageNamespace("canvas-v3") === true);
check("未注册 namespace 被拒绝", isPageStorageNamespace("other") === false);
const PREFIX = PAGE_STORAGE_NAMESPACES["canvas-v3"];
check("带前缀的 key 合法", isPageStorageKey("canvas-v3", `${PREFIX}doc`) === true);
check("没前缀的 key 被拒绝", isPageStorageKey("canvas-v3", "doc") === false);
check("只有前缀的 key 被拒绝", isPageStorageKey("canvas-v3", PREFIX) === false);
check("超长 key 被拒绝", isPageStorageKey("canvas-v3", PREFIX + "x".repeat(PAGE_STORAGE_KEY_LIMIT)) === false);

// ---- entries 校验 ----
check("空 entries 合法", isPageStorageEntries("canvas-v3", []) === true);
check("一条合法 entry", isPageStorageEntries("canvas-v3", [[`${PREFIX}a`, "v"]]) === true);
check("非数组被拒绝", isPageStorageEntries("canvas-v3", "nope") === false);
check(
  "超过 key 数量上限被拒绝",
  isPageStorageEntries("canvas-v3", Array.from({ length: PAGE_STORAGE_MAX_KEYS + 1 }, (_, i) => [`${PREFIX}k${i}`, "v"])) === false,
);
check("重复 key 被拒绝", isPageStorageEntries("canvas-v3", [[`${PREFIX}a`, "1"], [`${PREFIX}a`, "2"]]) === false);

// ---- write 校验 ----
const goodWrite = { writeId: "w-1", writerEpoch: 1, baseRevision: 0, set: [[`${PREFIX}a`, "v"]] };
check("合法 write 被接受", isPageStorageWrite("canvas-v3", goodWrite) === true);
check("缺 writeId 被拒绝", isPageStorageWrite("canvas-v3", { ...goodWrite, writeId: "" }) === false);
check("writerEpoch 为 0 被拒绝", isPageStorageWrite("canvas-v3", { ...goodWrite, writerEpoch: 0 }) === false);
check("多出未知字段被拒绝", isPageStorageWrite("canvas-v3", { ...goodWrite, extra: 1 }) === false);


// ---- P3 要求：跨模块 instanceof 必须成立 ----
// P3 的跨模块 instanceof 断言移到了运行期检查（见 docs/4.0.0-restore-plan.md 第 127 轮）

console.log(failed === 0 ? "\n全部通过" : `\n${failed} 项失败`);
process.exit(failed === 0 ? 0 : 1);
