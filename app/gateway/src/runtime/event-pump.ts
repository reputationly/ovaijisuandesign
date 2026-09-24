import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";

import { GatewayEventBus } from "../common/gateway-event-bus.js";
import { RuntimeConnection } from "./runtime-connection.js";

export interface OcEvent {
  type: string;
  properties: Record<string, any>;
}

/**
 * 订阅 opencode 的 `GET /global/event`（SSE），把事件分发给订阅者。
 *
 * 只开一条流，所有会话共用 —— 每个会话一条的话，开几个会话就占几个连接，
 * opencode 重启时还得逐条重连。断线按 1s → 30s 退避重连；opencode 地址变了
 * （重启换了端口）立刻重连到新地址。
 */
@Injectable()
export class EventPump implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger("EventPump");
  private readonly subs = new Set<(e: OcEvent) => void>();
  private controller?: AbortController;
  private stopped = false;
  private backoff = 1000;
  private offBus?: () => void;

  constructor(
    private readonly conn: RuntimeConnection,
    private readonly bus: GatewayEventBus,
  ) {}

  onModuleInit(): void {
    this.offBus = this.bus.subscribe((m) => {
      if (m.event === "internal:opencode-url") this.restart();
    });
    if (this.conn.endpoint) this.restart();
  }

  onModuleDestroy(): void {
    this.stopped = true;
    this.offBus?.();
    this.controller?.abort();
  }

  subscribe(fn: (e: OcEvent) => void): () => void {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }

  /** 测试和内部用：直接注入一条事件。 */
  dispatch(e: OcEvent): void {
    for (const fn of this.subs) {
      try {
        fn(e);
      } catch (err) {
        this.log.warn(`事件处理失败 ${e.type}: ${err}`);
      }
    }
  }

  private restart(): void {
    this.controller?.abort();
    this.backoff = 1000;
    void this.loop();
  }

  private async loop(): Promise<void> {
    const controller = new AbortController();
    this.controller = controller;
    while (!this.stopped && !controller.signal.aborted) {
      const ep = this.conn.endpoint;
      if (!ep) return;
      try {
        const res = await fetch(`${ep.url}/global/event`, { headers: this.conn.headers(), signal: controller.signal });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        this.backoff = 1000;
        await this.consume(res.body, controller.signal);
      } catch (err) {
        if (controller.signal.aborted) return;
        this.log.warn(`事件流断开：${(err as Error).message}，${this.backoff}ms 后重连`);
      }
      if (controller.signal.aborted) return;
      await new Promise((r) => setTimeout(r, this.backoff));
      this.backoff = Math.min(this.backoff * 2, 30_000);
    }
  }

  private async consume(body: ReadableStream<Uint8Array>, signal: AbortSignal): Promise<void> {
    const reader = body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) return;
      buf += dec.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const data = chunk
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trimStart())
          .join("\n");
        if (!data) continue;
        try {
          const msg = JSON.parse(data) as { payload?: OcEvent } & Partial<OcEvent>;
          const ev = msg.payload ?? (msg.type ? (msg as OcEvent) : undefined);
          if (ev?.type) this.dispatch(ev);
        } catch {
          // 不完整或不是 JSON 的帧：跳过，别让一条坏帧断掉整条流。
        }
      }
    }
  }
}
