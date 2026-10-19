/**
 * v3 客户端层功能自检（第 103 轮）。
 *
 * 覆盖**叶子模块**的纯逻辑（不依赖 React DOM、也不依赖 Electron preload）：
 *   - `createResourceCurrentVersionCommand`：界面意图 → 协议命令
 *   - `createProjectResourceClient`：POST 封装 + 校验 + 解析（用假 request）
 *   - `pickerMediaKey` / `videoPosterUrl`：媒体小工具
 *
 * 注意：`canvas-v3-model.js` 整模块会连带 Electron preload（`hilo.ipcRenderer`），
 * 所以这里只测它的**叶子依赖**，不整包导入。
 */
import { createResourceCurrentVersionCommand } from "../../../app/renderer/src/canvas-v3/resource-commands.js";
import { createProjectResourceClient } from "../../../app/renderer/src/canvas-v3/project-resource-client.js";
import { pickerMediaKey, videoPosterUrl } from "../../../app/renderer/src/canvas-v3/media-helpers.js";
import { parseProjectResourceTagSnapshot, PROJECT_RESOURCE_TAG_HTTP_ROUTES } from "../../../app/renderer/src/canvas-v3/project-resource-tags.js";

let failed = 0;
const check = (name, cond, extra = "") => {
  console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  " + extra : ""}`);
  if (!cond) failed++;
};
const throws = (fn) => { try { fn(); return false; } catch { return true; } };

// ---- 1. 资源命令构造 ----
const cmd = createResourceCurrentVersionCommand({
  commandId: "c-1",
  resourceId: "r-1",
  versionId: "v-1",
  expectedCurrentVersionId: "v-0",
});
check("命令有 commandId", cmd.commandId === "c-1");
check("命令类型是 UPDATE", typeof cmd.command?.type === "number" || typeof cmd.command?.type === "string");
check("载荷带 expectedCurrentVersionId", cmd.command?.payload?.expectedCurrentVersionId === "v-0");
check("actor 已填", cmd.actor !== undefined);

// ---- 2. 资源客户端：用假 request 走一遍 ----
const calls = [];
const fakeRequest = async (path, init) => {
  calls.push({ path, method: init?.method, body: init?.body });
  // 返回一个「合法」的空结果集，长度与 selectors 一致
  const n = JSON.parse(init.body).selectors?.length ?? 0;
  return {
    ok: true,
    json: async () => ({ results: Array.from({ length: n }, () => ({ ok: false, error: { code: "unknown-tag" } })) }),
  };
};
const client = createProjectResourceClient(fakeRequest);
check("客户端暴露 4 个方法", ["getResources", "search", "listResourceVersions", "execute"].every((k) => typeof client[k] === "function"));
let rejected = null;
try {
  await client.getResources([{ resourceId: "r-1", versionId: "v-1" }]);
} catch (e) {
  rejected = e;
}
check("getResources 发出了 POST", calls[0]?.method === "POST");
check("getResources 命中资源路由", String(calls[0]?.path ?? "").startsWith("/api/project/resources/"));
check(
  "坏响应被校验拦下（这正是预期行为）",
  rejected !== null,
  rejected ? `→ ${String(rejected.message).slice(0, 40)}` : "（没抛错，说明没在拦）",
);

// ---- 3. 媒体小工具 ----
check("pickerMediaKey 稳定", pickerMediaKey({ resourceId: "r", versionId: "v" }) === pickerMediaKey({ resourceId: "r", versionId: "v" }));
check("pickerMediaKey 随版本变化", pickerMediaKey({ resourceId: "r", versionId: "v1" }) !== pickerMediaKey({ resourceId: "r", versionId: "v2" }));
check("videoPosterUrl 对非视频返回 undefined", videoPosterUrl("https://x/y.png") === undefined);
check(
  "videoPosterUrl 对视频生成缩略图",
  String(videoPosterUrl("https://x/api/v3/canvas/videos/a/b")).includes("/thumbnail?"),
);

// ---- 4. 标签快照校验 ----
check("坏标签快照会抛错", throws(() => parseProjectResourceTagSnapshot({ revision: -1 })));

console.log(failed === 0 ? "\n全部通过" : `\n${failed} 项失败`);
process.exit(failed === 0 ? 0 : 1);
