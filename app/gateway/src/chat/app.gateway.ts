import type { OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { WebSocketGateway } from "@nestjs/websockets";
import type { WebSocket } from "ws";

import { GatewayEventBus } from "../common/gateway-event-bus.js";

/**
 * `/ws`：服务端事件广播 + （M6 起）聊天帧。广播直接发事件 payload（自带 `type`），
 * 不包 `{event, data}` —— 客户端按 `type` 分发。
 *
 * 每个连接订阅一次总线，断开时退订 —— 不退订的话关掉的窗口还挂在总线上，
 * 每次广播都往一个死 socket 写。
 */
@WebSocketGateway({ path: "/ws" })
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly subs = new WeakMap<WebSocket, () => void>();

  constructor(private readonly bus: GatewayEventBus) {}

  handleConnection(client: WebSocket): void {
    const off = this.bus.subscribe((m) => {
      if (client.readyState === client.OPEN) client.send(JSON.stringify(m.payload));
    });
    this.subs.set(client, off);
    client.on("message", (raw) => {
      let msg: { type?: string };
      try {
        msg = JSON.parse(String(raw));
      } catch {
        client.send(
          JSON.stringify({
            type: "error",
            content: "Invalid JSON",
            error: { error_code: "GATEWAY_BAD_REQUEST", user_message: "Invalid JSON", retryable: false },
          }),
        );
        return;
      }
      if (msg.type === "ping") client.send(JSON.stringify({ type: "pong" }));
    });
  }

  handleDisconnect(client: WebSocket): void {
    this.subs.get(client)?.();
    this.subs.delete(client);
  }
}
