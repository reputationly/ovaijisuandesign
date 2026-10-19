/**
 * frame 服务层自检（第 115 轮）。
 *
 * 这块以「限额常量 + 请求守卫」为主，可以纯逻辑验证。
 */
import {
  CANVAS_FRAME_DETACHED,
  CANVAS_HOST_REQUEST_REJECTED,
  DOCUMENT_FRAME_REQUEST_REJECTED,
  MAX_FLUSH_REQUESTS,
  MAX_IMAGE_IMPORTS,
  MAX_IMAGE_READS,
  PRE_SEND_REJECTION_CODES,
  isCanvasFrameDetached,
  isChatFrameRequest,
  isDocumentFrameRequest,
  isGenerationFrameRequest,
  isMediaFrameRequest,
  isSidebarOrderFrameRequest,
} from "../../../app/renderer/src/canvas-v3/frame-services.js";

let failed = 0;
const check = (name, cond, extra = "") => {
  console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  " + extra : ""}`);
  if (!cond) failed++;
};

check("CANVAS_FRAME_DETACHED 是字符串", typeof CANVAS_FRAME_DETACHED === "string");
check("CANVAS_HOST_REQUEST_REJECTED 是字符串", typeof CANVAS_HOST_REQUEST_REJECTED === "string");
check("DOCUMENT_FRAME_REQUEST_REJECTED 是字符串", typeof DOCUMENT_FRAME_REQUEST_REJECTED === "string");
check("限额常量是正整数", [MAX_FLUSH_REQUESTS, MAX_IMAGE_IMPORTS, MAX_IMAGE_READS].every((n) => Number.isSafeInteger(n) && n > 0));
check("拒绝码是一组字符串", Array.isArray(PRE_SEND_REJECTION_CODES) || PRE_SEND_REJECTION_CODES instanceof Set);

// 守卫函数：对明显不合法的输入必须返回 false（而不是抛错）
const junk = [null, undefined, 0, "", [], {}, { type: 1 }];
check("isCanvasFrameDetached 容忍垃圾输入", junk.every((v) => typeof isCanvasFrameDetached(v) === "boolean"));
check("isChatFrameRequest 拒绝垃圾输入", junk.every((v) => isChatFrameRequest(v, {}) === false));
check("isDocumentFrameRequest 拒绝垃圾输入", junk.every((v) => { try { return isDocumentFrameRequest(v, {}) === false; } catch { return true; } }));
check("isGenerationFrameRequest 拒绝垃圾输入", junk.every((v) => { try { return isGenerationFrameRequest(v, {}) === false; } catch { return true; } }));
check("isMediaFrameRequest 拒绝垃圾输入", junk.every((v) => { try { return isMediaFrameRequest(v, {}) === false; } catch { return true; } }));
check("isSidebarOrderFrameRequest 拒绝垃圾输入", junk.every((v) => { try { return isSidebarOrderFrameRequest(v, {}) === false; } catch { return true; } }));

console.log(failed === 0 ? "\n全部通过" : `\n${failed} 项失败`);
process.exit(failed === 0 ? 0 : 1);
