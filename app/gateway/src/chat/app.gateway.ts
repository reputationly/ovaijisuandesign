import type { IncomingMessage } from "node:http";

import type { OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { WebSocketGateway } from "@nestjs/websockets";
import type { WebSocket } from "ws";

import { GatewayEventBus } from "../common/gateway-event-bus.js";
import { readPresented, verifyIdentity } from "../common/workspace-identity.js";
import { GatewayConfig } from "../config/gateway-config.js";
import { type ChatFrame, ChatService } from "./chat.service.js";

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

  constructor(
    private readonly bus: GatewayEventBus,
    private readonly chat: ChatService,
    private readonly config: GatewayConfig,
  ) {}

  handleConnection(client: WebSocket, req?: IncomingMessage): void {
    // 握手是 GET，没带身份照样连得上；带了却对不上的是连错了工作区的旧标签页，不给它事件流。
    const rejected = req && verifyIdentity(this.config.workspaceIdentity, readPresented(req.headers, req.url), "GET");
    if (rejected) {
      client.close(1008, "Workspace identity mismatch");
      return;
    }
    const off = this.bus.subscribe((m) => {
      // internal:* 是进程内的信号（比如 opencode 换了地址），不给客户端。
      if (String(m.event).startsWith("internal:")) return;
      if (client.readyState === client.OPEN) client.send(JSON.stringify(m.payload));
    });
    this.subs.set(client, off);
    client.on("message", (raw) => {
      let msg: { type?: string; [k: string]: unknown };
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
      if (msg.type === "ping") {
        client.send(JSON.stringify({ type: "pong" }));
        return;
      }
      const reply = (f: ChatFrame) => {
        if (client.readyState === client.OPEN) client.send(JSON.stringify(f));
      };
      void this.chat.handle(msg as ChatFrame, reply).catch((err: unknown) =>
        reply({ type: "error", content: String(err), error: { error_code: "GATEWAY_ERROR", user_message: String(err), retryable: true } }),
      );
    });
  }

  handleDisconnect(client: WebSocket): void {
    this.subs.get(client)?.();
    this.subs.delete(client);
  }
}
