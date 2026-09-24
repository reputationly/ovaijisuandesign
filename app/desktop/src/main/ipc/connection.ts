/**
 * 多连接的服务端和单连接的客户端。
 *
 * 客户端连上后发的**第一条**消息是它的身份（一个裸值，没有 header），服务端据此
 * 为这条连接建一对 server/client。之后注册的频道会推给所有已有连接 —— 每个工作区
 * 的频道就是这样动态出现的。
 */
import { ChannelClient, ChannelServer, type IChannel, type IMessagePassingProtocol, type IServerChannel } from "./channel.js";
import { DisposableStore, type Event, type IDisposable } from "./events.js";
import { decodeValue, encodeValues } from "./wire.js";

export interface ClientConnectionEvent {
  protocol: IMessagePassingProtocol;
  onDidClientDisconnect: Event<void>;
}

interface Connection<TContext> {
  ctx: TContext;
  server: ChannelServer<TContext>;
  client: ChannelClient;
}

export class IPCServer<TContext = string> implements IDisposable {
  private readonly channels = new Map<string, IServerChannel<TContext>>();
  private readonly connections = new Set<Connection<TContext>>();
  private readonly store = new DisposableStore();

  constructor(onDidClientConnect: Event<ClientConnectionEvent>) {
    this.store.add(onDidClientConnect((e) => this.accept(e)));
  }

  private accept({ protocol, onDidClientDisconnect }: ClientConnectionEvent): void {
    const perConnection = new DisposableStore();
    let conn: Connection<TContext> | undefined;
    const firstSub = protocol.onMessage((raw) => {
      firstSub.dispose();
      let ctx: TContext;
      try {
        ctx = decodeValue(raw) as TContext;
      } catch {
        return;
      }
      const server = new ChannelServer<TContext>(protocol, ctx);
      const client = new ChannelClient(protocol);
      for (const [name, channel] of this.channels) server.registerChannel(name, channel);
      conn = { ctx, server, client };
      this.connections.add(conn);
    });
    perConnection.add(firstSub);
    perConnection.add(
      onDidClientDisconnect(() => {
        perConnection.dispose();
        if (!conn) return;
        conn.server.dispose();
        conn.client.dispose();
        this.connections.delete(conn);
      }),
    );
  }

  get connectionCount(): number {
    return this.connections.size;
  }

  get channelNames(): string[] {
    return [...this.channels.keys()];
  }

  registerChannel(name: string, channel: IServerChannel<TContext>): void {
    this.channels.set(name, channel);
    for (const c of this.connections) c.server.registerChannel(name, channel);
  }

  unregisterChannel(name: string): void {
    if (!this.channels.delete(name)) return;
    for (const c of this.connections) c.server.unregisterChannel(name);
  }

  dispose(): void {
    this.store.dispose();
    for (const c of this.connections) {
      c.server.dispose();
      c.client.dispose();
    }
    this.connections.clear();
    this.channels.clear();
  }
}

export class IPCClient<TContext = string> implements IDisposable {
  private readonly client: ChannelClient;
  private readonly server: ChannelServer<TContext>;

  constructor(protocol: IMessagePassingProtocol, ctx: TContext) {
    // 身份必须是第一条：对端据此才建立这条连接的 server
    protocol.send(encodeValues(ctx));
    this.client = new ChannelClient(protocol);
    this.server = new ChannelServer<TContext>(protocol, ctx);
  }

  getChannel(name: string): IChannel {
    return this.client.getChannel(name);
  }

  registerChannel(name: string, channel: IServerChannel<TContext>): void {
    this.server.registerChannel(name, channel);
  }

  dispose(): void {
    this.client.dispose();
    this.server.dispose();
  }
}
