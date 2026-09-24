import { describe, expect, it } from "vitest";

import { AssetChangeLog, workspaceIdOf } from "./asset-change-log.js";
import { GatewayEventBus } from "./gateway-event-bus.js";

describe("AssetChangeLog", () => {
  const WS = "/tmp/ws-a";

  it("每条事件盖上 workspace_id / epoch / 自增 seq，并广播", () => {
    const bus = new GatewayEventBus();
    const seen: unknown[] = [];
    bus.subscribe((m) => seen.push(m.payload));
    const log = new AssetChangeLog(bus);
    log.emit(WS, { id: "a", change: "created", path: "a.png" });
    log.emit(WS, { id: "b", change: "updated" });
    expect(seen).toMatchObject([
      { type: "asset_changed", id: "a", seq: 1, workspace_id: workspaceIdOf(WS), event_epoch: log.epoch },
      { type: "asset_changed", id: "b", seq: 2 },
    ]);
  });

  it("按 seq 补拉；epoch 不对或落后太多判 has_gap", () => {
    const log = new AssetChangeLog(new GatewayEventBus());
    for (let i = 0; i < 510; i++) log.emit(WS, { id: String(i), change: "created" });
    const recent = log.since(WS, { afterSeq: 505 });
    expect(recent.events.map((e) => e.seq)).toEqual([506, 507, 508, 509, 510]);
    expect(recent.has_gap).toBe(false);
    // 环形日志只留 500 条：从 seq 5 之后补拉已经缺了一段。
    expect(log.since(WS, { afterSeq: 5 })).toMatchObject({ has_gap: true, events: [] });
    // gateway 重启过（epoch 变了），seq 从头算，只能全量重拉。
    expect(log.since(WS, { afterSeq: 505, eventEpoch: "old" })).toMatchObject({ has_gap: true });
  });

  it("limit 截断时 has_more 为真", () => {
    const log = new AssetChangeLog(new GatewayEventBus());
    for (let i = 0; i < 5; i++) log.emit(WS, { id: String(i), change: "created" });
    expect(log.since(WS, { limit: 2 })).toMatchObject({ has_more: true, events: [{ seq: 1 }, { seq: 2 }] });
  });

  it("batch 连号且空数组不发", () => {
    const bus = new GatewayEventBus();
    const seen: any[] = [];
    bus.subscribe((m) => seen.push(m.payload));
    const log = new AssetChangeLog(bus);
    log.emitBatch(WS, []);
    log.emitBatch(WS, [
      { id: "a", change: "created" },
      { id: "b", change: "removed" },
    ]);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ type: "assets_changed_batch", seq_start: 1, seq_end: 2 });
  });
});
