import { EventEmitter } from "node:events";

import { Injectable } from "@nestjs/common";
import type { GatewayEvent } from "@ov/protocol";

export interface BusMessage {
  event: GatewayEvent | (string & {});
  /** 发给客户端的就是它本身（自带 `type` 字段），不再包一层。 */
  payload: unknown;
}

/**
 * 进程内事件总线。服务往这里发，`/ws` 网关把它原样广播给所有客户端。
 *
 * 服务不直接碰 WebSocket：同一个事件（比如画布变了）可能来自 HTTP 请求、
 * MCP 写入、生成完成三条路，都走总线才能保证每个客户端收到的是同一份。
 */
@Injectable()
export class GatewayEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    // 每个 WS 连接一个监听者，默认上限 10 会在开几个窗口后刷警告。
    this.emitter.setMaxListeners(0);
  }

  emit(event: BusMessage["event"], payload: unknown): void {
    this.emitter.emit("message", { event, payload } satisfies BusMessage);
  }

  subscribe(fn: (m: BusMessage) => void): () => void {
    this.emitter.on("message", fn);
    return () => this.emitter.off("message", fn);
  }
}
