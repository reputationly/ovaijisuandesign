import { createHash, randomUUID } from "node:crypto";

import { Injectable } from "@nestjs/common";
import type { AssetInfo } from "@ov/protocol";

import { GatewayEventBus } from "./gateway-event-bus.js";

export type AssetChangeKind = "created" | "updated" | "removed" | "renamed" | "status-changed";

export interface AssetChange {
  id: string;
  change: AssetChangeKind;
  asset?: AssetInfo;
  path?: string;
  old_path?: string;
  status?: "active" | "missing";
}

export interface StampedAssetChange extends AssetChange {
  type: "asset_changed";
  workspace_id: string;
  event_epoch: string;
  seq: number;
}

/** 每个工作区保留多少条。客户端落后超过这么多就判 has_gap，让它全量重拉。 */
const RING_SIZE = 500;

/** 工作区目录 → 稳定的 id：`ws_` + sha256 前 16 hex。 */
export function workspaceIdOf(dirOrId: string): string {
  if (dirOrId.startsWith("ws_")) return dirOrId;
  return "ws_" + createHash("sha256").update(dirOrId).digest("hex").slice(0, 16);
}

/**
 * 资产变更的盖戳 + 环形日志。
 *
 * 每条事件带 `event_epoch`（进程启动时随机生成）和按工作区自增的 `seq`。
 * WS 断线重连的客户端拿自己最后见到的 seq 来补拉（`/api/assets/changes`）；
 * epoch 变了说明 gateway 重启过、seq 从头算，只能全量重拉。
 */
@Injectable()
export class AssetChangeLog {
  readonly epoch = randomUUID();
  private readonly seqs = new Map<string, number>();
  private readonly rings = new Map<string, StampedAssetChange[]>();

  constructor(private readonly bus: GatewayEventBus) {}

  currentSeq(wsId: string): number {
    return this.seqs.get(wsId) ?? 0;
  }

  private stamp(wsId: string, ev: AssetChange): StampedAssetChange {
    const seq = this.currentSeq(wsId) + 1;
    this.seqs.set(wsId, seq);
    const stamped: StampedAssetChange = { ...ev, workspace_id: wsId, type: "asset_changed", event_epoch: this.epoch, seq };
    const ring = this.rings.get(wsId) ?? [];
    ring.push(stamped);
    if (ring.length > RING_SIZE) ring.splice(0, ring.length - RING_SIZE);
    this.rings.set(wsId, ring);
    return stamped;
  }

  emit(workspaceDir: string, ev: AssetChange): StampedAssetChange {
    const stamped = this.stamp(workspaceIdOf(workspaceDir), ev);
    this.bus.emit("assets:changed", stamped);
    return stamped;
  }

  emitBatch(workspaceDir: string, evs: AssetChange[]): void {
    if (evs.length === 0) return;
    const wsId = workspaceIdOf(workspaceDir);
    const events = evs.map((e) => this.stamp(wsId, e));
    this.bus.emit("assets:changed_batch", {
      type: "assets_changed_batch",
      workspace_id: wsId,
      event_epoch: this.epoch,
      seq_start: events[0]!.seq,
      seq_end: events[events.length - 1]!.seq,
      events,
    });
  }

  since(
    wsIdOrDir: string,
    q: { eventEpoch?: string; afterSeq?: number; toSeq?: number; limit?: number },
  ) {
    const wsId = workspaceIdOf(wsIdOrDir);
    const seqEnd = this.currentSeq(wsId);
    const afterSeq = q.afterSeq ?? 0;
    const toSeq = Math.min(q.toSeq ?? seqEnd, seqEnd);
    const limit = Math.min(Math.max(q.limit ?? 100, 1), 500);
    const ring = this.rings.get(wsId) ?? [];
    const oldest = ring[0]?.seq ?? seqEnd + 1;
    const hasGap = (q.eventEpoch !== undefined && q.eventEpoch !== this.epoch) || (afterSeq > 0 && afterSeq + 1 < oldest);
    const window = hasGap ? [] : ring.filter((e) => e.seq > afterSeq && e.seq <= toSeq);
    const events = window.slice(0, limit);
    return {
      workspace_id: wsId,
      event_epoch: this.epoch,
      after_seq: afterSeq,
      to_seq: toSeq,
      seq_end: seqEnd,
      limit,
      has_gap: hasGap,
      has_more: window.length > limit,
      events,
    };
  }
}
