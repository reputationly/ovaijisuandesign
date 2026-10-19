/**
 * v3 文档协议的功能自检 —— 证明 `canvas-v3/canvas-v3-model.js` 不只是「能解析」，
 * 而是**行为正确**。
 *
 * 用法：
 *   node scripts/v3preload/checks/build-and-run.mjs
 */
import {
  createEmptyCanvasV3Document,
  parseCanvasV3Document,
  canvasV3Equal,
} from "../../../app/renderer/src/canvas-v3/canvas-v3-model.js";

let failed = 0;
const check = (name, cond, extra = "") => {
  console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  " + extra : ""}`);
  if (!cond) failed++;
};

const empty = createEmptyCanvasV3Document();
check("空文档结构正确", empty.schemaVersion === 1 && empty.revision === 0 && Object.keys(empty.nodes).length === 0);

const parsed = parseCanvasV3Document(empty);
check("空文档可往返解析", parsed.schemaVersion === 1 && parsed.revision === 0);

check("自反相等", canvasV3Equal(empty, empty) === true);
check("与空对象不相等", canvasV3Equal(empty, {}) === false);

let threw = null;
try {
  parseCanvasV3Document({ schemaVersion: 99 });
} catch (e) {
  threw = e;
}
check("坏 schemaVersion 会抛错", threw !== null, threw ? `→ ${String(threw.message).slice(0, 50)}` : "");

threw = null;
try {
  parseCanvasV3Document(null);
} catch (e) {
  threw = e;
}
check("null 会抛错", threw !== null);

console.log(failed === 0 ? "\n全部通过" : `\n${failed} 项失败`);
process.exit(failed === 0 ? 0 : 1);
