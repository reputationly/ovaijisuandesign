/**
 * 一条双向连接上的请求/响应与事件订阅。
 *
 * 每条消息 = 编码后的 header 数组 + 一个 body 值：
 *   请求  100 调用 [100,id,channel,method]   101 取消 [101,id]
 *         102 订阅 [102,id,channel,event]    103 退订 [103,id]
 *   响应  200 就绪 [200]   201 成功   202 Error   203 非 Error 的拒绝值   204 事件
 *
 * 两端各有一个 server（回应对方的请求）和一个 client（发请求）。client 在看到对端
 * 的 200 之前把请求攒着；server 收到还没注册的频道的请求时先搁置一会儿 —— 渲染层
 * 常常比主进程注册每个工作区的频道早一步订阅。
 */
import { DisposableStore, Emitter, type Event, type IDisposable } from "./events.js";
import { ByteSource, encodeValues, readValue } from "./wire.js";

export interface IMessagePassingProtocol {
  send(message: Uint8Array): void;
  readonly onMessage: Event<Uint8Array>;
}

export interface CancellationToken {
  readonly isCancellationRequested: boolean;
  readonly onCancellationRequested: Event<void>;
}

export class CancellationSource {
  private cancelled = false;
  private readonly emitter = new Emitter<void>();
  readonly token: CancellationToken;

  constructor() {
    const self = this;
    this.token = {
      get isCancellationRequested() {
        return self.cancelled;
      },
      onCancellationRequested: this.emitter.event,
    };
  }

  cancel(): void {
    if (this.cancelled) return;
    this.cancelled = true;
    this.emitter.fire();
    this.emitter.dispose();
  }
}

export class CancellationError extends Error {
  constructor() {
    super("Canceled");
    this.name = "Canceled";
  }
}

/** 服务端频道：按名字分发调用和订阅。ctx 是连接建立时对端报上来的身份。 */
export interface IServerChannel<TContext = string> {
  call(ctx: TContext, command: string, arg?: unknown, token?: CancellationToken): Promise<unknown>;
  listen(ctx: TContext, event: string, arg?: unknown): Event<unknown>;
}

/** 客户端看到的频道。 */
export interface IChannel {
  call<T = unknown>(command: string, arg?: unknown, token?: CancellationToken): Promise<T>;
  listen<T = unknown>(event: string, arg?: unknown): Event<T>;
}

export const RequestType = { Call: 100, Cancel: 101, Listen: 102, Unlisten: 103 } as const;
export const ResponseType = { Ready: 200, Ok: 201, Error: 202, ErrorValue: 203, Fire: 204 } as const;

interface SerializedError {
  message: string;
  name: string;
  stack?: string[];
}

function serializeError(err: Error): SerializedError {
  return { message: err.message, name: err.name, stack: err.stack ? err.stack.split("\n") : undefined };
}

function reviveError(raw: unknown): Error {
  const data = (raw ?? {}) as Partial<SerializedError>;
  const err = new Error(typeof data.message === "string" ? data.message : "Unknown error");
  if (typeof data.name === "string") err.name = data.name;
  if (Array.isArray(data.stack)) err.stack = data.stack.join("\n");
  return err;
}

function parse(message: Uint8Array): { header: unknown[]; body: unknown } | undefined {
  try {
    const src = new ByteSource(message);
    const header = readValue(src);
    if (!Array.isArray(header) || typeof header[0] !== "number") return undefined;
    const body = src.done ? undefined : readValue(src);
    return { header, body };
  } catch {
    return undefined;
  }
}

interface ParkedRequest {
  id: number;
  kind: "call" | "listen";
  member: string;
  arg: unknown;
  timer?: ReturnType<typeof setTimeout>;
}

export class ChannelServer<TContext = string> implements IDisposable {
  private readonly channels = new Map<string, IServerChannel<TContext>>();
  /** 进行中的调用（可取消）和订阅，按请求 id。 */
  private readonly active = new Map<number, { channel: string; stop: () => void }>();
  private readonly parked = new Map<string, ParkedRequest[]>();
  private readonly store = new DisposableStore();

  constructor(
    private readonly protocol: IMessagePassingProtocol,
    private readonly ctx: TContext,
    private readonly parkTimeoutMs = 1000,
  ) {
    this.store.add(protocol.onMessage((m) => this.onMessage(m)));
    this.reply([ResponseType.Ready]);
  }

  registerChannel(name: string, channel: IServerChannel<TContext>): void {
    this.channels.set(name, channel);
    // 下一拍再补处理，让注册方先把同一拍里的其他准备做完
    setTimeout(() => this.flushParked(name), 0);
  }

  unregisterChannel(name: string): void {
    this.channels.delete(name);
    const waiting = this.parked.get(name) ?? [];
    this.parked.delete(name);
    for (const p of waiting) {
      if (p.timer) clearTimeout(p.timer);
      if (p.kind === "call") this.reply([ResponseType.Error, p.id], { name: "Unknown channel", message: `Channel '${name}' was unregistered` });
    }
    for (const [id, a] of [...this.active]) {
      if (a.channel !== name) continue;
      this.active.delete(id);
      a.stop();
    }
  }

  private reply(header: unknown[], body?: unknown): void {
    try {
      this.protocol.send(encodeValues(header, body));
    } catch {
      // 对端已经没了
    }
  }

  private onMessage(message: Uint8Array): void {
    const msg = parse(message);
    if (!msg) return;
    const [type, id, channel, member] = msg.header;
    switch (type) {
      case RequestType.Call:
        this.handleCall(Number(id), String(channel), String(member), msg.body);
        return;
      case RequestType.Listen:
        this.handleListen(Number(id), String(channel), String(member), msg.body);
        return;
      case RequestType.Cancel:
      case RequestType.Unlisten:
        this.stopRequest(Number(id));
        return;
      default:
        // 2xx 是对端 server 的响应，归 client 处理
        return;
    }
  }

  private stopRequest(id: number): void {
    const a = this.active.get(id);
    if (a) {
      this.active.delete(id);
      a.stop();
      return;
    }
    for (const [name, list] of this.parked) {
      const idx = list.findIndex((p) => p.id === id);
      if (idx < 0) continue;
      const [p] = list.splice(idx, 1);
      if (p?.timer) clearTimeout(p.timer);
      if (list.length === 0) this.parked.delete(name);
      return;
    }
  }

  private park(channel: string, req: ParkedRequest): void {
    const list = this.parked.get(channel) ?? [];
    list.push(req);
    this.parked.set(channel, list);
    req.timer = setTimeout(() => {
      const current = this.parked.get(channel);
      if (!current) return;
      const idx = current.indexOf(req);
      if (idx < 0) return;
      current.splice(idx, 1);
      if (current.length === 0) this.parked.delete(channel);
      if (req.kind === "call") {
        this.reply([ResponseType.Error, req.id], {
          name: "Unknown channel",
          message: `Channel name '${channel}' timed out after ${this.parkTimeoutMs}ms`,
        });
      }
    }, this.parkTimeoutMs);
  }

  private flushParked(channel: string): void {
    const list = this.parked.get(channel);
    if (!list || !this.channels.has(channel)) return;
    this.parked.delete(channel);
    for (const p of list) {
      if (p.timer) clearTimeout(p.timer);
      if (p.kind === "call") this.handleCall(p.id, channel, p.member, p.arg);
      else this.handleListen(p.id, channel, p.member, p.arg);
    }
  }

  private handleCall(id: number, name: string, command: string, arg: unknown): void {
    const channel = this.channels.get(name);
    if (!channel) {
      this.park(name, { id, kind: "call", member: command, arg });
      return;
    }
    const cts = new CancellationSource();
    this.active.set(id, { channel: name, stop: () => cts.cancel() });
    let pending: Promise<unknown>;
    try {
      pending = channel.call(this.ctx, command, arg, cts.token);
    } catch (err) {
      pending = Promise.reject(err);
    }
    pending.then(
      (value) => this.reply([ResponseType.Ok, id], value),
      (err: unknown) => {
        if (err instanceof Error) this.reply([ResponseType.Error, id], serializeError(err));
        else this.reply([ResponseType.ErrorValue, id], err);
      },
    ).finally(() => {
      if (this.active.get(id)?.channel === name) this.active.delete(id);
    });
  }

  private handleListen(id: number, name: string, event: string, arg: unknown): void {
    const channel = this.channels.get(name);
    if (!channel) {
      this.park(name, { id, kind: "listen", member: event, arg });
      return;
    }
    let source: Event<unknown>;
    try {
      source = channel.listen(this.ctx, event, arg);
    } catch {
      // 没有这个事件：订阅永远不触发，与未知频道一致
      return;
    }
    const sub = source((e) => this.reply([ResponseType.Fire, id], e));
    this.active.set(id, { channel: name, stop: () => sub.dispose() });
  }

  dispose(): void {
    this.store.dispose();
    for (const a of this.active.values()) a.stop();
    this.active.clear();
    for (const list of this.parked.values()) for (const p of list) if (p.timer) clearTimeout(p.timer);
    this.parked.clear();
  }
}

type ResponseHandler = (type: number, body: unknown) => void;

export class ChannelClient implements IDisposable {
  private ready = false;
  private disposed = false;
  private readonly outbox: Array<() => void> = [];
  private nextId = 0;
  private readonly handlers = new Map<number, ResponseHandler>();
  private readonly rejectors = new Map<number, (err: Error) => void>();
  private readonly store = new DisposableStore();

  constructor(private readonly protocol: IMessagePassingProtocol) {
    this.store.add(protocol.onMessage((m) => this.onMessage(m)));
  }

  getChannel(name: string): IChannel {
    return {
      call: <T>(command: string, arg?: unknown, token?: CancellationToken) => this.request<T>(name, command, arg, token),
      listen: <T>(event: string, arg?: unknown) => this.subscribe<T>(name, event, arg),
    };
  }

  private post(header: unknown[], body?: unknown): void {
    try {
      this.protocol.send(encodeValues(header, body));
    } catch {
      // 连接已断
    }
  }

  /** 对端就绪之前先排队。返回一个撤销函数（还没发出去时从队列里拿掉）。 */
  private whenReady(send: () => void): () => boolean {
    if (this.ready) {
      send();
      return () => false;
    }
    this.outbox.push(send);
    return () => {
      const idx = this.outbox.indexOf(send);
      if (idx < 0) return false;
      this.outbox.splice(idx, 1);
      return true;
    };
  }

  private request<T>(channel: string, command: string, arg: unknown, token?: CancellationToken): Promise<T> {
    if (this.disposed) return Promise.reject(new CancellationError());
    if (token?.isCancellationRequested) return Promise.reject(new CancellationError());
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      let cancelSub: IDisposable | undefined;
      const finish = () => {
        this.handlers.delete(id);
        this.rejectors.delete(id);
        cancelSub?.dispose();
      };
      this.handlers.set(id, (type, body) => {
        finish();
        if (type === ResponseType.Ok) resolve(body as T);
        else if (type === ResponseType.Error) reject(reviveError(body));
        else reject(body);
      });
      this.rejectors.set(id, (err) => {
        finish();
        reject(err);
      });
      const unqueue = this.whenReady(() => this.post([RequestType.Call, id, channel, command], arg));
      if (token) {
        cancelSub = token.onCancellationRequested(() => {
          if (!this.handlers.has(id)) return;
          // 已经发出去的要告诉对端；还在队列里的直接撤掉
          if (!unqueue()) this.post([RequestType.Cancel, id]);
          this.rejectors.get(id)?.(new CancellationError());
        });
      }
    });
  }

  private subscribe<T>(channel: string, event: string, arg: unknown): Event<T> {
    let id = -1;
    let unqueue: (() => boolean) | undefined;
    const emitter: Emitter<T> = new Emitter<T>({
      onFirstListener: () => {
        if (this.disposed) return;
        id = this.nextId++;
        this.handlers.set(id, (type, body) => {
          if (type === ResponseType.Fire) emitter.fire(body as T);
        });
        const myId = id;
        unqueue = this.whenReady(() => this.post([RequestType.Listen, myId, channel, event], arg));
      },
      onLastListener: () => {
        if (id < 0) return;
        this.handlers.delete(id);
        if (!unqueue?.()) this.post([RequestType.Unlisten, id]);
        id = -1;
      },
    });
    return emitter.event;
  }

  private onMessage(message: Uint8Array): void {
    const msg = parse(message);
    if (!msg) return;
    const type = msg.header[0] as number;
    if (type === ResponseType.Ready) {
      if (this.ready) return;
      this.ready = true;
      const queued = this.outbox.splice(0);
      for (const send of queued) send();
      return;
    }
    if (type < 200 || type >= 300) return;
    const handler = this.handlers.get(Number(msg.header[1]));
    handler?.(type, msg.body);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.store.dispose();
    this.outbox.length = 0;
    for (const reject of [...this.rejectors.values()]) reject(new CancellationError());
    this.handlers.clear();
  }
}

