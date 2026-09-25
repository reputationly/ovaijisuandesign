import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: { getVersion: () => "9.9.9", getLoginItemSettings: () => ({ openAtLogin: false }), isPackaged: false, relaunch: vi.fn(), quit: vi.fn() },
  BrowserWindow: { getFocusedWindow: () => null },
  clipboard: { availableFormats: () => ["text/plain"] },
  nativeTheme: { themeSource: "system" },
  powerSaveBlocker: { start: vi.fn(() => 7), stop: vi.fn(), isStarted: vi.fn(() => true) },
  shell: { trashItem: vi.fn(), openExternal: vi.fn() },
}));

const { fromService } = await import("./ipc/proxy.js");
const { GlobalStore } = await import("./storage/global-store.js");
const { stubChannels } = await import("./stub-channels.js");

let dir: string;
let logs: string[];
let channels: Record<string, object>;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "stubs-"));
  logs = [];
  const store = new GlobalStore(path.join(dir, "g.json"));
  channels = stubChannels({ store, projectsRoot: path.join(dir, "Projects"), dataRoot: dir, outputDir: dir, log: (l, m) => logs.push(`${l} ${m}`) });
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** 按渲染层的方式调：经过频道，未知方法 / 事件会抛。 */
function channel(name: string) {
  const ch = fromService(channels[name]!);
  return {
    call: (method: string, ...args: unknown[]) => ch.call("renderer", method, args),
    listen: (event: string) => ch.listen("renderer", event),
  };
}

describe("占位频道的返回形状", () => {
  it("团队账号：就绪的个人空间，sequence 能当 BigInt 解析（否则渲染层会拦下所有提交）", async () => {
    const snap = (await channel("team-account").call("getSnapshot")) as { status: string; sequence: string; activeContext: { accountType: string; groupId: string } };
    expect(snap.status).toBe("ready");
    expect(snap.activeContext).toMatchObject({ accountType: "PERSONAL", groupId: "local" });
    expect(() => BigInt(snap.sequence)).not.toThrow();
    expect(await channel("team-account").call("revalidateContext", {})).toMatchObject({ status: "completed" });
    expect(await channel("team-account").call("switchContext", {})).toEqual({ status: "rejected", code: "temporarily_unavailable" });
  });

  it("更新：空闲态带全字段；手动检查走一遍 checking → idle 事件（界面靠阶段变化结束\"检查中\"）", async () => {
    const r = (await channel("updater").call("getState")) as { state: Record<string, unknown>; trigger: string };
    expect(r.state).toMatchObject({ phase: "idle", currentVersion: "9.9.9", dismissed: false, targetVersion: null });
    const phases: unknown[] = [];
    channel("updater").listen("onStateChanged")((e) => phases.push([(e as { state: { phase: string } }).state.phase, (e as { trigger: string }).trigger]));
    expect(await channel("updater").call("check", { userTriggered: true })).toEqual({ accepted: true });
    await new Promise((r) => setTimeout(r, 350));
    expect(phases).toEqual([["checking", "user"], ["idle", "user"]]);
    expect(await channel("updater").call("install")).toBe(false);
  });

  it("IM 接入：渲染层订阅的三个事件都在，扫码登录直接失败", async () => {
    for (const e of ["onStatusChange", "onWechatQrState", "onFeishuQrState"]) expect(() => channel("imBridge").listen(e)).not.toThrow();
    await expect(channel("imBridge").call("startWechatQrLogin", "x")).rejects.toThrow();
    expect(await channel("imBridge").call("listStatuses")).toEqual([]);
  });

  it("数据目录：始终是默认位置，迁移返回结构化失败而不是 reject", async () => {
    const s = (await channel("dataDirectory").call("getStatus")) as Record<string, unknown>;
    expect(s).toMatchObject({ dataDirectory: "", activeDirectory: dir, configuredDirectory: dir, defaultDirectory: dir, deferredCleanupPaths: [] });
    expect(await channel("dataDirectory").call("apply", "/x")).toMatchObject({ success: false, failure: { code: "migration_failed", sourcePreserved: true } });
  });

  it("连接器：预检给出不支持，安装目标 / 安装按失败返回", async () => {
    expect(await channel("generic-connector").call("preflight", "blender")).toMatchObject({ connectorId: "blender", platformSupported: false, status: { state: "not_installed" } });
    expect(await channel("generic-connector").call("getInstallTargets", "blender")).toEqual({ ok: false, code: "unsupported_platform" });
    expect(await channel("custom-mcp").call("prepareRemoteConnector", { connectorId: "libtv" })).toMatchObject({ connectorId: "libtv", ok: false });
  });

  it("ComfyUI：工作流页订阅的扫描事件存在，模型可用性给全不可用", async () => {
    expect(() => channel("comfyUiModelDownload").listen("onDidScanModelAvailability")).not.toThrow();
    expect(await channel("comfyUiModelDownload").call("getModelAvailability", [{ name: "m", directory: "checkpoints" }])).toEqual({
      models: [{ name: "m", directory: "checkpoints", available: false }],
      scanComplete: true,
    });
  });

  it("网络代理模式：合法值记下来并返回成功", async () => {
    expect(await channel("networkDiagnostics").call("setProxyMode", "direct")).toEqual({ success: true, mode: "direct", restartHint: true });
    expect(await channel("networkDiagnostics").call("getProxyMode")).toBe("direct");
    expect(await channel("networkDiagnostics").call("setProxyMode", "bogus")).toMatchObject({ success: false, mode: "direct" });
  });

  it("剪贴板：没有聚焦窗口时粘贴报 no-window", async () => {
    expect(await channel("clipboard").call("triggerPasteOnFocusedWindow")).toEqual({ ok: false, reason: "no-window" });
    expect(await channel("clipboard").call("hasFiles")).toBe(false);
  });

  it("日志：低于当前级别的丢掉，附加参数拼在后面；漏列的方法记一条警告", async () => {
    await channel("log").call("debug", "hidden");
    await channel("log").call("info", "shown", { a: 1 });
    expect(logs).toEqual(["info shown { a: 1 }"]);
    await channel("assetCenter").call("somethingNew");
    expect(logs.at(-1)).toContain("[stub] assetCenter.somethingNew");
  });
});
